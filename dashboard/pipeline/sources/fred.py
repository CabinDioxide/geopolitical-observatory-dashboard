"""
FRED (St. Louis Fed) data source — federated macro indicators.

We pull a curated set of series covering the Hormuz transmission chain:
oil → gasoline → CPI → real income → consumer sentiment → uncertainty.

Output: dashboard/data/election/fred_indicators.json
        {
          "fetched_at": ISO timestamp,
          "series": {
             "DCOILBRENTEU": {
                "name": "Brent crude (USD/bbl)",
                "freq": "daily",
                "latest": {"date": "2026-05-08", "value": 100.06},
                "observations": [{"date": "...", "value": ...}, ...]  # last ~5 yr
             },
             ...
          }
        }

Rate-limit-safe: 14 calls per run, well under 120/min.
Skips gracefully if FRED_API_KEY not set.
"""
from __future__ import annotations

import json
import logging
from datetime import datetime, timedelta
from pathlib import Path

import requests

from pipeline.config import (
    ELECTION_DIR,
    FRED_API_KEY,
    FRED_BASE,
    FRED_SERIES,
)

logger = logging.getLogger(__name__)

# Pull last 6 years (covers 2020 baseline through 2026 election + history for charts).
HISTORY_START = (datetime.utcnow() - timedelta(days=365 * 6)).strftime("%Y-%m-%d")


def _fetch_series(series_id: str) -> dict | None:
    """Fetch one FRED series. Returns dict with observations list, or None on failure."""
    url = f"{FRED_BASE}/series/observations"
    params = {
        "series_id": series_id,
        "api_key": FRED_API_KEY,
        "file_type": "json",
        "observation_start": HISTORY_START,
    }
    try:
        r = requests.get(url, params=params, timeout=20)
        r.raise_for_status()
        data = r.json()
        obs = data.get("observations", [])
        # FRED uses "." for missing values; filter and coerce.
        cleaned = []
        for o in obs:
            val_str = o.get("value", ".")
            if val_str == "." or val_str == "":
                continue
            try:
                cleaned.append({"date": o["date"], "value": float(val_str)})
            except (ValueError, KeyError):
                continue
        if not cleaned:
            logger.warning(f"FRED {series_id}: no usable observations")
            return None
        return {"observations": cleaned, "latest": cleaned[-1]}
    except requests.HTTPError as e:
        logger.error(f"FRED {series_id}: HTTP {e.response.status_code}")
        return None
    except Exception as e:
        logger.error(f"FRED {series_id}: {e}")
        return None


def run() -> dict:
    """Fetch all configured FRED series and write to election/fred_indicators.json."""
    if not FRED_API_KEY:
        logger.warning("FRED_API_KEY not set; skipping FRED fetch")
        return {"_meta": {"status": "skipped", "reason": "no api key"}}

    ELECTION_DIR.mkdir(parents=True, exist_ok=True)

    out = {
        "fetched_at": datetime.utcnow().isoformat() + "Z",
        "series": {},
        "_meta": {"total": len(FRED_SERIES), "ok": 0, "failed": []},
    }

    for sid, meta in FRED_SERIES.items():
        result = _fetch_series(sid)
        if result is None:
            out["_meta"]["failed"].append(sid)
            continue
        out["series"][sid] = {
            "name": meta["name"],
            "freq": meta["freq"],
            "tier": meta["tier"],
            "latest": result["latest"],
            "observations": result["observations"],
        }
        out["_meta"]["ok"] += 1

    out_path = ELECTION_DIR / "fred_indicators.json"
    with open(out_path, "w") as f:
        json.dump(out, f, indent=2)
    logger.info(
        f"FRED: {out['_meta']['ok']}/{out['_meta']['total']} series → {out_path.name}"
    )
    return out


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
    run()
