"""
AIS vessel tracking via aisstream.io WebSocket.

Takes a 30-second snapshot of vessel positions in key strategic chokepoints.
Register at https://aisstream.io/ (GitHub login) to get an API key.
Set env: AISSTREAM_API_KEY=your_key

Each pipeline run connects briefly, captures current vessel positions,
and saves as GeoJSON for dashboard display.
"""
from __future__ import annotations

import json
import logging
import os
import time
from pathlib import Path

from pipeline.config import MARITIME_DIR

logger = logging.getLogger(__name__)

AISSTREAM_API_KEY = os.environ.get("AISSTREAM_API_KEY", "")
AISSTREAM_WS_URL = "wss://stream.aisstream.io/v0/stream"

# Strategic chokepoint bounding boxes [[[lat1, lon1], [lat2, lon2]]]
CHOKEPOINT_BOXES = {
    "Strait of Hormuz": [[25.0, 55.0], [27.0, 57.5]],
    "Strait of Malacca": [[-1.0, 100.0], [4.0, 105.0]],
    "Suez Canal": [[29.5, 32.0], [31.5, 33.0]],
    "Bab el-Mandeb": [[12.0, 42.5], [13.5, 44.0]],
    "Taiwan Strait": [[23.0, 117.0], [26.0, 121.0]],
    "South China Sea": [[8.0, 110.0], [16.0, 118.0]],
    "Strait of Gibraltar": [[35.5, -6.5], [36.5, -5.0]],
    "Korea Strait": [[33.5, 128.0], [35.5, 131.0]],
}

# Navigation status codes
NAV_STATUS = {
    0: "Underway (engine)",
    1: "At anchor",
    2: "Not under command",
    3: "Restricted maneuverability",
    5: "Moored",
    7: "Engaged in fishing",
    8: "Underway (sailing)",
}


def _capture_region(region_name: str, bbox: list, duration: int, vessels: dict):
    """Capture vessels from a single region for N seconds."""
    try:
        import websocket
    except ImportError:
        return

    subscription = {
        "APIKey": AISSTREAM_API_KEY,
        "BoundingBoxes": [bbox],
        "FilterMessageTypes": ["PositionReport"],
    }

    def on_message(ws, message):
        try:
            data = json.loads(message)
            if data.get("MessageType") != "PositionReport":
                return
            meta = data.get("MetaData", {})
            report = data.get("Message", {}).get("PositionReport", {})
            mmsi = str(meta.get("MMSI", ""))
            if not mmsi:
                return
            lat = report.get("Latitude", 0)
            lon = report.get("Longitude", 0)
            if lat == 0 and lon == 0:
                return
            vessels[mmsi] = {
                "mmsi": mmsi,
                "name": meta.get("ShipName", "").strip(),
                "lat": lat, "lon": lon,
                "speed": report.get("Sog", 0),
                "course": report.get("Cog", 0),
                "heading": report.get("TrueHeading", 0),
                "nav_status": NAV_STATUS.get(report.get("NavigationalStatus", -1), "Unknown"),
                "timestamp": meta.get("time_utc", ""),
                "region": region_name,
            }
        except Exception:
            pass

    def on_error(ws, error):
        pass

    def on_open(ws):
        ws.send(json.dumps(subscription))

    import threading
    ws = websocket.WebSocketApp(
        AISSTREAM_WS_URL,
        on_open=on_open, on_message=on_message, on_error=on_error,
    )
    # ping_interval/ping_timeout prevent the connection from silently hanging:
    # if no pong within ping_timeout, run_forever raises and the thread exits.
    ws_thread = threading.Thread(
        target=lambda: ws.run_forever(ping_interval=10, ping_timeout=5)
    )
    ws_thread.daemon = True
    ws_thread.start()
    time.sleep(duration)
    try:
        ws.close()
    except Exception:
        pass
    # Give the thread a bounded window to actually exit. If close() didn't
    # terminate it cleanly, leave it as a zombie daemon — it dies with the
    # process. This bounds total run time per region to duration + 5s.
    ws_thread.join(timeout=5)


def capture_snapshot(per_region_seconds: int = 15) -> list[dict]:
    """Capture vessels from each chokepoint region sequentially."""
    if not AISSTREAM_API_KEY:
        logger.warning(
            "AISSTREAM_API_KEY not set. "
            "Register at https://aisstream.io/ and set env var."
        )
        return []

    try:
        import websocket
    except ImportError:
        logger.error("websocket-client not installed. Run: pip install websocket-client")
        return []

    vessels = {}  # MMSI -> latest position
    total_regions = len(CHOKEPOINT_BOXES)
    total_time = per_region_seconds * total_regions

    logger.info(f"AIS: scanning {total_regions} regions, {per_region_seconds}s each (~{total_time}s total)")

    for i, (region, bbox) in enumerate(CHOKEPOINT_BOXES.items()):
        before = len(vessels)
        _capture_region(region, bbox, per_region_seconds, vessels)
        captured = len(vessels) - before
        logger.info(f"  [{i+1}/{total_regions}] {region}: +{captured} vessels (total: {len(vessels)})")

    logger.info(f"AIS snapshot complete: {len(vessels)} unique vessels across {total_regions} regions")
    return list(vessels.values())


def vessels_to_geojson(vessels: list[dict], sanctions_lookup: dict | None = None) -> dict:
    """Convert vessel positions to GeoJSON, optionally enriched with sanctions data.

    If sanctions_lookup is provided (the dict returned by ofac.run()), each
    feature gains `sanctioned`, `sanctions_programs`, and `sdn_name` fields.
    Joining is by MMSI — IMO is not available in PositionReports.
    """
    by_mmsi = (sanctions_lookup or {}).get("by_mmsi", {})

    features = []
    for v in vessels:
        sanctioned = False
        sanctions_programs: list[str] = []
        sdn_name: str | None = None
        sdn_remarks: str | None = None

        if by_mmsi:
            match = by_mmsi.get(v["mmsi"])
            if match:
                sanctioned = True
                sanctions_programs = match.get("programs", [])
                sdn_name = match.get("name")
                sdn_remarks = match.get("remarks")

        feature = {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [v["lon"], v["lat"]],
            },
            "properties": {
                "id": f"ais-{v['mmsi']}",
                "mmsi": v["mmsi"],
                "name": v["name"] or f"MMSI {v['mmsi']}",
                "speed": round(v["speed"], 1),
                "course": round(v["course"], 1),
                "heading": v["heading"],
                "nav_status": v["nav_status"],
                "timestamp": v["timestamp"],
                "region": v.get("region", ""),
                "type": "vessel",
                "sanctioned": sanctioned,
                "sanctions_programs": sanctions_programs,
                "sdn_name": sdn_name,
                "sdn_remarks": sdn_remarks,
            },
        }
        features.append(feature)

    return {"type": "FeatureCollection", "features": features}


def save_ais_snapshot(geojson: dict) -> Path:
    """Save AIS vessel positions to disk."""
    MARITIME_DIR.mkdir(parents=True, exist_ok=True)
    out_path = MARITIME_DIR / "vessels_snapshot.geojson"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(geojson, f, ensure_ascii=False)
    logger.info(f"Saved {len(geojson['features'])} vessel positions to {out_path}")
    return out_path


def filter_sanctioned(geojson: dict) -> dict:
    """Extract only the sanctioned vessels from an enriched vessel GeoJSON."""
    features = [
        f for f in geojson.get("features", [])
        if f.get("properties", {}).get("sanctioned")
    ]
    return {"type": "FeatureCollection", "features": features}


def save_sanctioned_snapshot(geojson: dict) -> Path:
    """Save sanctioned-only vessel snapshot for fast frontend layer."""
    MARITIME_DIR.mkdir(parents=True, exist_ok=True)
    out_path = MARITIME_DIR / "sanctioned_vessels_in_chokepoints.geojson"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(geojson, f, ensure_ascii=False)
    logger.info(
        f"Saved {len(geojson['features'])} sanctioned vessels to {out_path}"
    )
    return out_path


def run(per_region: int = 15, sanctions_lookup: dict | None = None) -> dict:
    """Capture AIS snapshot, optionally cross-referenced with sanctions list.

    Returns the enriched GeoJSON. If sanctions_lookup is provided, also
    writes a separate sanctioned-only file for the frontend to consume.
    """
    vessels = capture_snapshot(per_region_seconds=per_region)
    if not vessels:
        return {"type": "FeatureCollection", "features": []}

    geojson = vessels_to_geojson(vessels, sanctions_lookup=sanctions_lookup)
    save_ais_snapshot(geojson)

    if sanctions_lookup and sanctions_lookup.get("by_mmsi"):
        sanctioned = filter_sanctioned(geojson)
        save_sanctioned_snapshot(sanctioned)
        n = len(sanctioned["features"])
        if n > 0:
            programs = {}
            for f in sanctioned["features"]:
                for p in f["properties"].get("sanctions_programs", []):
                    programs[p] = programs.get(p, 0) + 1
            logger.info(
                f"AIS+OFAC: {n} sanctioned vessels currently in monitored "
                f"chokepoints; programs: {programs}"
            )
        else:
            logger.info("AIS+OFAC: no sanctioned vessels currently visible")

    return geojson
