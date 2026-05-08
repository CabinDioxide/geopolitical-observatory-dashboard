"""
EIA petroleum data — Strategic Petroleum Reserve and other SPR-adjacent metrics
not available on FRED.

Uses EIA's public weekly Petroleum Status Report CSVs (no API key required).
Table 1 is the headline summary including SPR stocks; updated Wednesdays.

Output: dashboard/data/election/eia_indicators.json
"""
from __future__ import annotations

import csv
import io
import json
import logging
from datetime import datetime

import requests

from pipeline.config import ELECTION_DIR

logger = logging.getLogger(__name__)

EIA_TABLE1_URL = "https://ir.eia.gov/wpsr/table1.csv"

# Rows we extract. Match against the second column in table1.csv.
# Values come back in million barrels (Mbbl). To match FRED-style kbbl convention
# we multiply by 1000 when writing.
INTERESTING_ROWS = {
    "Strategic Petroleum Reserve (SPR)": "spr_mbbl",
    "Commercial (Excluding SPR)": "commercial_crude_mbbl",
    "Total Stocks (Including SPR)": "total_stocks_mbbl",
}


def _parse_table1(raw_text: str) -> dict:
    """Parse EIA Table 1 CSV. Returns latest values + previous week + year-ago.

    Header row format:
      "STUB_1","STUB_2","<thisweek>","<prev_week>","<diff>","<pct>","<year_ago>","<diff>","<pct>"
    Some rows have different column counts; we handle defensively.
    """
    reader = csv.reader(io.StringIO(raw_text))
    rows = list(reader)
    if not rows:
        raise ValueError("EIA Table 1 returned empty CSV")

    header = rows[0]
    # Table 1 format (verified 2026-05): single STUB column, then current week,
    # prev week, diff, % chg, year-ago, diff, % chg.
    #   col 0 = STUB_1 (label)
    #   col 1 = current week date
    #   col 2 = prev week
    #   col 3 = diff (skip)
    #   col 4 = % chg (skip)
    #   col 5 = year-ago date
    try:
        this_week_date = header[1]
        prev_week_date = header[2]
        year_ago_date = header[5] if len(header) > 5 else None
    except IndexError:
        raise ValueError(f"Unexpected header: {header}")

    out = {}
    for row in rows[1:]:
        if len(row) < 3:
            continue
        label = row[0].strip()
        key = INTERESTING_ROWS.get(label)
        if not key:
            continue

        def _f(val: str) -> float | None:
            try:
                return float(val.replace(",", ""))
            except (ValueError, AttributeError):
                return None

        out[key] = {
            "label": label,
            "current": _f(row[1]),
            "previous_week": _f(row[2]),
            "year_ago": _f(row[5]) if len(row) > 5 else None,
            "current_date": this_week_date,
            "prev_week_date": prev_week_date,
            "year_ago_date": year_ago_date,
        }
    return out


def run() -> dict:
    ELECTION_DIR.mkdir(parents=True, exist_ok=True)
    try:
        r = requests.get(EIA_TABLE1_URL, timeout=15)
        r.raise_for_status()
    except Exception as e:
        logger.error(f"EIA Table 1 fetch failed: {e}")
        result = {"_meta": {"status": "error", "error": str(e)}}
        with open(ELECTION_DIR / "eia_indicators.json", "w") as f:
            json.dump(result, f, indent=2)
        return result

    parsed = _parse_table1(r.text)

    out = {
        "fetched_at": datetime.utcnow().isoformat() + "Z",
        "source": EIA_TABLE1_URL,
        "metrics": parsed,
        "_meta": {"status": "ok", "rows": len(parsed)},
    }
    with open(ELECTION_DIR / "eia_indicators.json", "w") as f:
        json.dump(out, f, indent=2)

    if "spr_mbbl" in parsed:
        spr = parsed["spr_mbbl"]
        logger.info(
            f"EIA: SPR {spr['current']:.1f} Mbbl (Δ {spr['current'] - spr['previous_week']:+.1f} WoW, "
            f"vs year-ago {spr['year_ago']:.1f})"
        )
    return out


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
    run()
