"""
OFAC Specially Designated Nationals (SDN) list — vessel entries.

Fetches the SDN XML from US Treasury (no auth, ~28 MB), extracts vessel
entries with IMO and/or MMSI, and saves a lookup table that downstream
sources (especially AIS) can join against to flag sanctioned vessels in
real time.

Source: https://www.treasury.gov/ofac/downloads/sdn.xml
  (redirects to sanctionslistservice.ofac.treas.gov; updated daily)

Schema notes (verified 2026-05-07):
- Namespace: https://sanctionslistservice.ofac.treas.gov/api/PublicationPreview/exports/XML
- Vessels are sdnEntry elements with sdnType == "Vessel"
- IMO is encoded inside <id> with idType "Vessel Registration Identification"
  and idNumber prefixed "IMO " (e.g. "IMO 9187629")
- MMSI is encoded inside <id> with idType "MMSI" and a 9-digit idNumber
- Of ~1,481 vessels, ~50% have explicit MMSI; ~all have IMO via Registration

The output lookup file (sanctioned_vessels.json) has two indices:
- by_mmsi: { "<mmsi>": { vessel record } }
- by_imo:  { "<imo>":  { vessel record } }
plus a metadata block (count, fetch time, programs distribution).

The AIS pipeline only sees MMSI from PositionReports, so the by_mmsi index
is what it joins against. The by_imo index is kept for future use when
ShipStaticData messages are subscribed (which include IMO).
"""
from __future__ import annotations

import json
import logging
import re
from datetime import datetime
from pathlib import Path
from xml.etree import ElementTree as ET

import requests

from pipeline.config import MARITIME_DIR

logger = logging.getLogger(__name__)

SDN_XML_URL = "https://www.treasury.gov/ofac/downloads/sdn.xml"
TIMEOUT = 90  # seconds; SDN XML is ~28 MB
IMO_PATTERN = re.compile(r"\bIMO\s*(\d{6,7})\b", re.IGNORECASE)


def fetch_sdn_xml() -> bytes:
    """Download SDN XML from Treasury (follows redirect)."""
    logger.info(f"OFAC: fetching {SDN_XML_URL}")
    r = requests.get(SDN_XML_URL, timeout=TIMEOUT, allow_redirects=True)
    r.raise_for_status()
    return r.content


def parse_vessels(xml_bytes: bytes) -> list[dict]:
    """Extract vessel entries from SDN XML.

    Returns a list of dicts; each has at minimum a `name`, `programs`, and
    one or both of `imo`, `mmsi`.
    """
    root = ET.fromstring(xml_bytes)
    # Detect namespace dynamically (the URL has changed historically; don't
    # hardcode it).
    ns = root.tag.split("}")[0].lstrip("{") if "}" in root.tag else ""
    nsp = "{" + ns + "}" if ns else ""

    vessels: list[dict] = []
    for entry in root.iter(f"{nsp}sdnEntry"):
        if (entry.findtext(f"{nsp}sdnType") or "").strip() != "Vessel":
            continue

        v = {
            "uid": (entry.findtext(f"{nsp}uid") or "").strip(),
            "name": (entry.findtext(f"{nsp}lastName") or "").strip(),
            "remarks": (entry.findtext(f"{nsp}remarks") or "").strip() or None,
            "programs": [],
            "imo": None,
            "mmsi": None,
            "call_sign": None,
            "vessel_type": None,
            "flag": None,
        }

        # Programs (e.g. IRAN, IFSR, RUSSIA-EO14024, NPWMD, SDGT)
        prog_list = entry.find(f"{nsp}programList")
        if prog_list is not None:
            for p in prog_list.findall(f"{nsp}program"):
                if p.text:
                    v["programs"].append(p.text.strip())

        # Vessel info block
        vinfo = entry.find(f"{nsp}vesselInfo")
        if vinfo is not None:
            v["call_sign"] = (vinfo.findtext(f"{nsp}callSign") or "").strip() or None
            v["vessel_type"] = (vinfo.findtext(f"{nsp}vesselType") or "").strip() or None
            v["flag"] = (vinfo.findtext(f"{nsp}vesselFlag") or "").strip() or None

        # ID list — extract IMO and MMSI
        id_list = entry.find(f"{nsp}idList")
        if id_list is not None:
            for id_el in id_list.findall(f"{nsp}id"):
                id_type = (id_el.findtext(f"{nsp}idType") or "").strip()
                id_num = (id_el.findtext(f"{nsp}idNumber") or "").strip()
                if not id_num:
                    continue

                # MMSI is direct
                if id_type == "MMSI":
                    digits = re.sub(r"\D", "", id_num)
                    if digits:
                        v["mmsi"] = digits

                # IMO is encoded as "IMO 1234567" inside Vessel Registration
                # Identification (and historically also in plain "IMO Number")
                elif "IMO" in id_type or id_type == "Vessel Registration Identification":
                    m = IMO_PATTERN.search(id_num)
                    if m:
                        v["imo"] = m.group(1)
                    elif id_num.isdigit():
                        v["imo"] = id_num

        # Only emit if matchable against AIS / vessel registries
        if v["imo"] or v["mmsi"]:
            vessels.append(v)

    return vessels


def build_lookup(vessels: list[dict]) -> dict:
    """Build by_mmsi / by_imo indices and a small metadata block."""
    by_mmsi: dict[str, dict] = {}
    by_imo: dict[str, dict] = {}
    program_counts: dict[str, int] = {}

    for v in vessels:
        if v.get("mmsi"):
            by_mmsi[v["mmsi"]] = v
        if v.get("imo"):
            by_imo[v["imo"]] = v
        for p in v.get("programs", []):
            program_counts[p] = program_counts.get(p, 0) + 1

    return {
        "_meta": {
            "source": "OFAC SDN",
            "url": SDN_XML_URL,
            "fetched_at": datetime.utcnow().isoformat() + "Z",
            "total_vessels": len(vessels),
            "with_mmsi": len(by_mmsi),
            "with_imo": len(by_imo),
            "programs": program_counts,
        },
        "by_mmsi": by_mmsi,
        "by_imo": by_imo,
    }


def save_lookup(lookup: dict) -> Path:
    """Save lookup to dashboard/data/maritime/sanctioned_vessels.json."""
    MARITIME_DIR.mkdir(parents=True, exist_ok=True)
    out_path = MARITIME_DIR / "sanctioned_vessels.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(lookup, f, ensure_ascii=False, indent=2)
    return out_path


def run() -> dict:
    """Fetch OFAC SDN, parse vessels, save lookup. Returns the lookup dict.

    On any failure, returns an empty lookup so downstream sources (AIS) can
    still proceed without sanctions enrichment.
    """
    try:
        xml_bytes = fetch_sdn_xml()
        vessels = parse_vessels(xml_bytes)
        lookup = build_lookup(vessels)
        save_lookup(lookup)
        meta = lookup["_meta"]
        logger.info(
            f"OFAC: {meta['total_vessels']} sanctioned vessels "
            f"({meta['with_mmsi']} MMSI, {meta['with_imo']} IMO); "
            f"top programs: {sorted(meta['programs'].items(), key=lambda x: -x[1])[:5]}"
        )
        return lookup
    except Exception as e:
        logger.error(f"OFAC fetch failed: {e}")
        return {
            "_meta": {
                "source": "OFAC SDN",
                "fetched_at": datetime.utcnow().isoformat() + "Z",
                "total_vessels": 0,
                "with_mmsi": 0,
                "with_imo": 0,
                "error": str(e),
            },
            "by_mmsi": {},
            "by_imo": {},
        }


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")
    result = run()
    print(json.dumps(result["_meta"], indent=2))
