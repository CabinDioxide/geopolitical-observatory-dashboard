"""
RCP poll averages (Trump approval + generic congressional ballot) via Wayback.

The live realclearpolling.com pages sit behind a bot check, but the Wayback
Machine archives them several times a day. We look up the newest 200 snapshot
with the CDX API, fetch the raw archived HTML (``id_`` URL), and read the RCP
average out of the Next.js payload embedded in the page (``self.__next_f``,
JSON with escaped quotes):

    {"id":"8656","type":"rcp_average",...,"date":"9/26 - 10/14",...,
     "candidate":[{"name":"Approve",...,"value":"38.8",...}, ...]}

The page also carries the daily average history
(``{"date":"$D2026-10-15T...","name":"Approve","value":"38.8"}``); we use it
only to date the average (``as_of``).

Writes into: dashboard/data/election/political_inputs.json
    trump_approval.{approve_pct, disapprove_pct, net, as_of, window, source, snapshot}
    generic_ballot.{dem_pct, rep_pct, dem_lead, as_of, window, source, snapshot}

Each series is handled independently. If a fetch or parse fails, or the newest
snapshot is older than MAX_SNAPSHOT_AGE_DAYS, that series keeps its existing
values and the reason is returned for sources_status. Nothing is ever blanked.
"""
from __future__ import annotations

import gzip
import json
import logging
import re
import time
from datetime import datetime, timedelta, timezone

import requests

from pipeline.config import ELECTION_DIR

logger = logging.getLogger(__name__)

INPUTS_PATH = ELECTION_DIR / "political_inputs.json"
MAX_SNAPSHOT_AGE_DAYS = 7

CDX_URL = "https://web.archive.org/cdx/search/cdx"
SNAPSHOT_URL = "https://web.archive.org/web/{ts}id_/{original}"
HEADERS = {"User-Agent": "geopolitical-observatory-dashboard/1.0 (data pipeline)"}

SERIES = {
    "trump_approval": {
        "page": "realclearpolling.com/polls/approval/donald-trump/approval-rating",
        "poll_id": "8656",
        "names": ("Approve", "Disapprove"),
        "fields": ("approve_pct", "disapprove_pct"),
        "diff_field": "net",          # first - second  → approve - disapprove
        "label": "RCP approval page",
    },
    "generic_ballot": {
        "page": "realclearpolling.com/polls/state-of-the-union/generic-congressional-vote",
        "poll_id": "8670",
        "names": ("Democrats", "Republicans"),
        "fields": ("dem_pct", "rep_pct"),
        "diff_field": "dem_lead",     # dem - rep
        "label": "RCP generic ballot page",
    },
}


# -----------------------------------------------------------------------------
# HTTP (Wayback is intermittently "Temporarily Offline" — retry with backoff)
# -----------------------------------------------------------------------------

def _get(url: str, params: dict | None = None, timeout: int = 60,
         attempts: int = 4) -> requests.Response:
    last_err: Exception | None = None
    for i in range(attempts):
        try:
            r = requests.get(url, params=params, headers=HEADERS, timeout=timeout)
            r.raise_for_status()
            return r
        except Exception as e:  # noqa: BLE001 — network errors are varied
            last_err = e
            if i < attempts - 1:
                time.sleep(5 * (i + 1))
    raise RuntimeError(f"GET failed after {attempts} attempts: {last_err}")


def latest_snapshot(page: str) -> tuple[str, str]:
    """Return (timestamp, original_url) of the newest 200 snapshot of `page`."""
    last_err = None
    for i in range(4):
        r = _get(CDX_URL, params={
            "url": page,
            "filter": "statuscode:200",
            "output": "json",
            "fl": "timestamp,original",
            "limit": "-1",
        })
        try:
            rows = r.json()
            break
        except ValueError as e:
            # The CDX server sometimes answers 200 with an HTML outage page.
            last_err = e
            time.sleep(5 * (i + 1))
    else:
        raise RuntimeError(f"CDX returned non-JSON: {last_err}")
    if len(rows) < 2:
        raise RuntimeError("CDX returned no snapshots")
    ts, original = rows[-1][0], rows[-1][1]
    return ts, original


def fetch_snapshot(ts: str, original: str) -> tuple[str, str]:
    """Return (actual_timestamp, html). Wayback redirects a timestamp it does
    not hold to the nearest capture, so the served timestamp is read back from
    the final URL rather than trusted from the request."""
    r = _get(SNAPSHOT_URL.format(ts=ts, original=original), timeout=90)
    m = re.search(r"/web/(\d{14})id_/", r.url)
    actual_ts = m.group(1) if m else ts
    body = r.content
    if body[:2] == b"\x1f\x8b":  # gzip body without a Content-Encoding header
        body = gzip.decompress(body)
    return actual_ts, body.decode("utf-8", errors="replace")


# -----------------------------------------------------------------------------
# Parsing
# -----------------------------------------------------------------------------

def _window_to_iso(window: str, as_of: str) -> str:
    """'9/26 - 10/14' + as_of '2026-10-15' → '2026-09-26 to 2026-10-14'."""
    m = re.fullmatch(r"\s*(\d{1,2})/(\d{1,2})\s*-\s*(\d{1,2})/(\d{1,2})\s*", window)
    if not m:
        return window
    m1, d1, m2, d2 = map(int, m.groups())
    end_year = int(as_of[:4])
    if m2 > int(as_of[5:7]):          # window ends in December, as_of in January
        end_year -= 1
    start_year = end_year - 1 if m1 > m2 else end_year
    return f"{start_year}-{m1:02d}-{d1:02d} to {end_year}-{m2:02d}-{d2:02d}"


def parse_average(html: str, spec: dict) -> dict:
    """Extract the RCP average and its date from an archived RCP page."""
    text = html.replace('\\"', '"')
    m = re.search(
        r'\{"id":"' + spec["poll_id"] + r'","type":"rcp_average"[^{}]*?'
        r'"date":"([^"]*)"[^{}]*?"candidate":\[(.*?)\]',
        text,
    )
    if not m:
        raise ValueError(f"rcp_average block for poll {spec['poll_id']} not found")
    window_raw, cand_blob = m.group(1), m.group(2)
    cands = dict(re.findall(
        r'"name":"([^"]+)","affiliation":"[^"]*","value":"([^"]*)"', cand_blob))

    a_name, b_name = spec["names"]
    try:
        a, b = float(cands[a_name]), float(cands[b_name])
    except (KeyError, ValueError) as e:
        raise ValueError(f"candidate values missing/invalid: {cands}") from e
    if not (0 < a < 100 and 0 < b < 100 and a + b <= 100):
        raise ValueError(f"implausible values {a_name}={a} {b_name}={b}")

    # Date the average: newest history point whose value equals the average.
    hist = re.findall(
        r'\{"date":"\$D(\d{4}-\d\d-\d\d)T[^"]*","name":"([^"]+)","value":"([^"]*)"',
        text)
    matching = sorted(d for d, n, v in hist
                      if n == a_name and _same(v, a))
    if not matching:
        raise ValueError("no history point matches the current average")
    as_of = matching[-1]

    f1, f2 = spec["fields"]
    return {
        f1: a,
        f2: b,
        spec["diff_field"]: round(a - b, 1),
        "as_of": as_of,
        "window": _window_to_iso(window_raw, as_of),
    }


def _same(v: str, x: float) -> bool:
    try:
        return abs(float(v) - x) < 1e-9
    except ValueError:
        return False


# -----------------------------------------------------------------------------
# Orchestrator
# -----------------------------------------------------------------------------

def _check_age(ts: str, now: datetime) -> None:
    snap_time = datetime.strptime(ts, "%Y%m%d%H%M%S").replace(tzinfo=timezone.utc)
    age = now - snap_time
    if age > timedelta(days=MAX_SNAPSHOT_AGE_DAYS):
        raise RuntimeError(
            f"newest snapshot {ts} is {age.days} days old (> {MAX_SNAPSHOT_AGE_DAYS})")


def fetch_series(key: str, now: datetime, snapshot_ts: str | None = None) -> dict:
    """Fetch one series. Returns the new block, or raises with a reason."""
    spec = SERIES[key]
    if snapshot_ts:
        ts, original = snapshot_ts, "https://www." + spec["page"]
    else:
        ts, original = latest_snapshot(spec["page"])

    _check_age(ts, now)
    ts, html = fetch_snapshot(ts, original)
    _check_age(ts, now)  # again, in case Wayback redirected to another capture
    block = parse_average(html, spec)
    block["source"] = (
        f"RCP average, read automatically from Wayback snapshot {ts} of the "
        f"{spec['label']} (live page blocked by bot check)")
    block["snapshot"] = ts
    return block


def run(now: datetime | None = None, snapshots: dict | None = None) -> dict:
    """Refresh trump_approval and generic_ballot in political_inputs.json.

    `now` and `snapshots` ({series_key: timestamp}) are for testing against a
    fixed snapshot; in production both are None.
    """
    now = now or datetime.now(timezone.utc)
    snapshots = snapshots or {}

    with open(INPUTS_PATH) as f:
        inputs = json.load(f)

    status: dict = {}
    changed = False
    for key in SERIES:
        try:
            block = fetch_series(key, now, snapshots.get(key))
        except Exception as e:  # noqa: BLE001
            old = inputs.get(key, {})
            logger.warning(f"RCP {key}: keeping existing values (as_of "
                           f"{old.get('as_of')}): {e}")
            status[key] = {"status": "kept_existing", "reason": str(e),
                           "as_of": old.get("as_of")}
            continue

        old = inputs.get(key, {})
        if old.get("as_of") and block["as_of"] < old["as_of"]:
            # Never roll back to an older average than the one on file.
            status[key] = {"status": "kept_existing",
                           "reason": f"snapshot average as_of {block['as_of']} is "
                                     f"older than existing {old['as_of']}",
                           "as_of": old["as_of"]}
            continue

        inputs[key] = {**old, **block}
        changed = True
        diff_field = SERIES[key]["diff_field"]
        status[key] = {"status": "ok", "as_of": block["as_of"],
                       diff_field: block[diff_field], "snapshot": block["snapshot"]}
        logger.info(f"RCP {key}: {diff_field}={block[diff_field]:+.1f} "
                    f"as_of {block['as_of']} (snapshot {block['snapshot']})")

    if changed:
        meta = inputs.setdefault("_meta", {})
        meta["last_updated"] = now.strftime("%Y-%m-%d")
        meta["description"] = (
            "trump_approval and generic_ballot are refreshed daily by "
            "pipeline/sources/rcp_polls.py from the newest Wayback snapshot of "
            "the RCP pages; on failure the previous values are kept. Other "
            "blocks are maintained by hand. The model reads only "
            "trump_approval.net and generic_ballot.dem_lead.")
        meta.pop("next_review", None)
        with open(INPUTS_PATH, "w") as f:
            json.dump(inputs, f, indent=2, ensure_ascii=False)
            f.write("\n")

    return status


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
    print(json.dumps(run(), indent=2))
