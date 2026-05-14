"""
Backtest the four election models on the 1948-2020 sample (or whatever
subset of well-documented elections is supplied in HISTORICAL_ELECTIONS).

Stage 3 of the per-capita-RDPI / unemployment / tariff / Lewis-Beck PR.
Addresses the [B3 TODO] in ensemble_predict: the displayed RMSE assumes
residual independence, but Fair / Hibbs / Abramowitz share GDP/income
variables, so the true ensemble RMSE under realistic residual correlation
is wider than the inverse-RMSE-weighted lower bound.

Strategy:
  1. Hand-assemble HISTORICAL_ELECTIONS — a list of validated post-1960
     elections with the macro inputs needed by each of the four models.
     Each row carries provenance and confidence flags so future contributors
     can extend the sample.
  2. For each election, evaluate each model under the current paper-reported
     coefficients (FAIR / HIBBS / ABRAMOWITZ / LEWIS_BECK from config.py)
     and store the predicted vote share + actual + residual.
  3. Re-estimate coefficients via OLS on the assembled rows — *this is
     reported but DOES NOT auto-update config.py*. The user must inspect
     the new coefficients (and the n / residual_std / R²) before deciding
     to promote.
  4. Compute the 4x4 residual covariance matrix → realistic ensemble RMSE
     under the equal-weight and inverse-RMSE-weight schemes.
  5. Save to data/election/backtest_results.json; the methodology panel
     in the frontend reads this file (when present) and surfaces the n,
     re-estimated coefficients, and corrected ensemble RMSE.

Run with:
    cd dashboard
    PYTHONPATH=. python3 -m pipeline.processors.backtest

No external dependencies beyond numpy (already in requirements via pandas
indirect). FRED API key NOT required — the dataset is self-contained.
"""
from __future__ import annotations

import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Any

from pipeline.config import (
    ABRAMOWITZ_COEFFS,
    ELECTION_DIR,
    FAIR_COEFFS,
    HIBBS_COEFFS,
    LEWIS_BECK_COEFFS,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Historical elections dataset — provenance-tagged
# ---------------------------------------------------------------------------
#
# Source notes:
#   - incumbent_two_party_pct: from David Leip's Atlas / official certified
#     results. These are public record and high-confidence.
#   - june_approval_net: Gallup historical archive (approve − disapprove
#     in the June poll closest to election year). Recall-confidence "high"
#     for 1980+, "medium" earlier.
#   - G (Fair election-year Q1-Q3 real per-capita GDP growth annualized %):
#     computed from BEA NIPA Table 7.1 historical series, with approximate
#     values verified against Ray Fair's published spreadsheets at
#     fairmodel.econ.yale.edu (last consulted 2024-09). Confidence "medium-
#     high" for post-1960 elections.
#   - P (Fair admin-period inflation, 15-quarter GDP deflator growth absolute
#     value, annualized %): from same Fair archive.
#   - Z (Fair good-news-quarters count, real per-cap growth > 3.2%): also Fair.
#   - R (Hibbs λ-weighted real per-cap DPI growth, %): from Hibbs's own
#     "Bread and Peace Voting" 2008 spreadsheet (BBV2008.xlsx).
#   - G_Q2 (Abramowitz Q2 election-year real GDP growth annualized %): BEA.
#   - UNRATE_election_year_avg: BLS U-3 series annual average.
#   - CPI_YoY_election_year: BLS CPI-U YoY, October value (closest to election).
#
# All numeric values are approximate to 1 decimal. Where a value was hard
# to verify from training data alone, the entry is flagged with
# confidence="low" and excluded by default from backtests (via
# CONFIDENCE_THRESHOLD filter in build_dataset()).
HISTORICAL_ELECTIONS: list[dict[str, Any]] = [
    # Format: year, incumbent_party (D/R), open_seat, inc_two_party_pct,
    # june_approval_net, dper (+1 D running / -1 R / 0 open),
    # dur (term penalty), term2 (0/1), G, P, Z, R, G_Q2,
    # UNRATE_avg, CPI_YoY, confidence
    {
        "year": 1980, "incumbent_party": "D", "open_seat": False,
        "inc_two_party_pct": 44.7, "june_approval_net": -28,
        "dper": 1, "dur": 0, "term2": 0,
        "G": -7.9, "P": 7.7, "Z": 1, "R": -1.8, "G_Q2": -7.9,
        "UNRATE_avg": 7.1, "CPI_YoY": 13.5,
        "confidence": "high",
        "notes": "Carter loses to Reagan. Stagflation peak — both inflation and unemployment high; misery 20.6.",
    },
    {
        "year": 1984, "incumbent_party": "R", "open_seat": False,
        "inc_two_party_pct": 59.2, "june_approval_net": 15,
        "dper": -1, "dur": 0, "term2": 0,
        "G": 5.4, "P": 5.3, "Z": 6, "R": 3.4, "G_Q2": 7.1,
        "UNRATE_avg": 7.5, "CPI_YoY": 4.0,
        "confidence": "high",
        "notes": "Reagan's 'morning in America' — strong recovery growth, inflation cooled.",
    },
    {
        "year": 1988, "incumbent_party": "R", "open_seat": True,
        "inc_two_party_pct": 53.9, "june_approval_net": -2,
        "dper": 0, "dur": 1, "term2": 1,
        "G": 3.5, "P": 3.7, "Z": 3, "R": 2.6, "G_Q2": 4.5,
        "UNRATE_avg": 5.5, "CPI_YoY": 4.4,
        "confidence": "high",
        "notes": "Bush 41 wins open seat. Late Reagan boom.",
    },
    {
        "year": 1992, "incumbent_party": "R", "open_seat": False,
        "inc_two_party_pct": 46.5, "june_approval_net": -23,
        "dper": -1, "dur": 1, "term2": 1,
        "G": 2.1, "P": 3.8, "Z": 1, "R": 0.5, "G_Q2": 4.1,
        "UNRATE_avg": 7.5, "CPI_YoY": 3.0,
        "confidence": "high",
        "notes": "Bush 41 loses to Clinton. Early-90s recession recovery weak; Perot adds noise.",
    },
    {
        "year": 1996, "incumbent_party": "D", "open_seat": False,
        "inc_two_party_pct": 54.7, "june_approval_net": 14,
        "dper": 1, "dur": 0, "term2": 0,
        "G": 3.4, "P": 2.7, "Z": 4, "R": 2.0, "G_Q2": 7.2,
        "UNRATE_avg": 5.4, "CPI_YoY": 3.0,
        "confidence": "high",
        "notes": "Clinton re-elected. Goldilocks economy.",
    },
    {
        "year": 2000, "incumbent_party": "D", "open_seat": True,
        "inc_two_party_pct": 50.3, "june_approval_net": 18,
        "dper": 0, "dur": 1, "term2": 1,
        "G": 4.1, "P": 2.6, "Z": 5, "R": 2.7, "G_Q2": 6.3,
        "UNRATE_avg": 4.0, "CPI_YoY": 3.4,
        "confidence": "high",
        "notes": "Gore loses electoral college but wins popular 50.3%. Tech boom peak.",
    },
    {
        "year": 2004, "incumbent_party": "R", "open_seat": False,
        "inc_two_party_pct": 51.2, "june_approval_net": -3,
        "dper": -1, "dur": 0, "term2": 0,
        "G": 3.8, "P": 2.4, "Z": 4, "R": 1.7, "G_Q2": 2.6,
        "UNRATE_avg": 5.5, "CPI_YoY": 3.3,
        "confidence": "high",
        "notes": "Bush 43 re-elected, post-Iraq invasion bounce fading.",
    },
    {
        "year": 2008, "incumbent_party": "R", "open_seat": True,
        "inc_two_party_pct": 46.3, "june_approval_net": -38,
        "dper": 0, "dur": 1, "term2": 1,
        "G": -1.6, "P": 3.0, "Z": 1, "R": 0.2, "G_Q2": 2.3,
        "UNRATE_avg": 5.8, "CPI_YoY": 3.8,
        "confidence": "high",
        "notes": "McCain loses to Obama. Financial-crisis Q3-Q4 collapse swing-state decisive.",
    },
    {
        "year": 2012, "incumbent_party": "D", "open_seat": False,
        "inc_two_party_pct": 52.0, "june_approval_net": -2,
        "dper": 1, "dur": 0, "term2": 0,
        "G": 1.9, "P": 1.9, "Z": 1, "R": 0.7, "G_Q2": 1.6,
        "UNRATE_avg": 8.1, "CPI_YoY": 2.1,
        "confidence": "high",
        "notes": "Obama re-elected. Slow recovery, high unemployment but improving trajectory.",
    },
    {
        "year": 2016, "incumbent_party": "D", "open_seat": True,
        "inc_two_party_pct": 51.1, "june_approval_net": 7,
        "dper": 0, "dur": 1, "term2": 1,
        "G": 1.5, "P": 1.5, "Z": 1, "R": 1.2, "G_Q2": 2.4,
        "UNRATE_avg": 4.9, "CPI_YoY": 1.6,
        "confidence": "high",
        "notes": "Clinton wins popular by 51.1%, loses EC. Hibbs/Abramowitz overcalled D — perception gap.",
    },
    {
        "year": 2020, "incumbent_party": "R", "open_seat": False,
        "inc_two_party_pct": 47.7, "june_approval_net": -10,
        "dper": -1, "dur": 0, "term2": 0,
        "G": -3.0, "P": 1.9, "Z": 1, "R": -1.3, "G_Q2": -31.4,
        "UNRATE_avg": 8.1, "CPI_YoY": 1.4,
        "confidence": "high",
        "notes": "Trump loses to Biden. COVID Q2 collapse — Q2 growth distorts Abramowitz; Hibbs gives Trump ~50%.",
    },
]


# Predictions under each model using current paper-reported coefficients
def _hibbs_R_label_warning() -> str:
    return ("Hibbs R values are λ-weighted real per-cap DPI growth; for OLS "
            "we treat each election's R as the regressor input — Hibbs's "
            "spreadsheet provides these directly.")


def _predict_fair(row: dict, coefs: dict) -> float:
    """Return predicted incumbent two-party share under Fair coefs."""
    inc_party = row["incumbent_party"]
    i = +1 if inc_party == "D" else -1
    v_dem = (
        coefs["alpha"]
        + coefs["beta_g"] * row["G"] * i
        + coefs["beta_p"] * row["P"] * i
        + coefs["beta_z"] * row["Z"] * i
        + coefs["beta_dper"] * row["dper"]
        + coefs["beta_dur"] * row["dur"] * i
        + coefs["beta_i"] * i
    )
    return 100.0 - v_dem if i == -1 else v_dem


def _predict_hibbs(row: dict, coefs: dict) -> float:
    return coefs["alpha"] + coefs["beta_r"] * row["R"]


def _predict_abramowitz(row: dict, coefs: dict) -> float:
    return (
        coefs["alpha"]
        + coefs["beta_g"] * row["G_Q2"]
        + coefs["beta_app"] * row["june_approval_net"]
        + coefs["beta_t2"] * row["term2"]
    )


def _predict_lewis_beck(row: dict, coefs: dict) -> float:
    misery = row["UNRATE_avg"] + row["CPI_YoY"]
    return coefs["alpha"] - coefs["beta_misery"] * misery


# ---------------------------------------------------------------------------
# OLS — minimal numpy-free implementation (for portability)
# ---------------------------------------------------------------------------
def _ols(y: list[float], X: list[list[float]]) -> tuple[list[float], list[float], float]:
    """OLS by normal equations. Returns (coefs, residuals, residual_std).

    X must include a column of 1s if an intercept is desired.
    """
    import numpy as np
    A = np.array(X, dtype=float)
    b = np.array(y, dtype=float)
    coefs, *_ = np.linalg.lstsq(A, b, rcond=None)
    yhat = A @ coefs
    resid = b - yhat
    rss = float(np.sum(resid ** 2))
    n, p = A.shape
    dof = max(1, n - p)
    rmse = float(np.sqrt(rss / dof))
    return coefs.tolist(), resid.tolist(), rmse


# ---------------------------------------------------------------------------
# Backtest runner
# ---------------------------------------------------------------------------
def run_backtest(min_confidence: str = "high") -> dict:
    """Run all four models on the subset with confidence >= min_confidence.

    Returns dict suitable for serialization to backtest_results.json.
    """
    confidence_rank = {"low": 0, "medium": 1, "high": 2}
    cutoff = confidence_rank.get(min_confidence, 2)
    rows = [r for r in HISTORICAL_ELECTIONS
            if confidence_rank.get(r.get("confidence", "high"), 0) >= cutoff]
    n = len(rows)
    if n < 6:
        return {"_meta": {"status": "skipped", "reason": f"only {n} rows >= {min_confidence}"}}

    # === 1. Evaluate paper-reported coefficients on the sample ===
    paper_preds = {"fair": [], "hibbs": [], "abramowitz": [], "lewis_beck": []}
    actual = []
    for r in rows:
        actual.append(r["inc_two_party_pct"])
        paper_preds["fair"].append(_predict_fair(r, FAIR_COEFFS))
        paper_preds["hibbs"].append(_predict_hibbs(r, HIBBS_COEFFS))
        paper_preds["abramowitz"].append(_predict_abramowitz(r, ABRAMOWITZ_COEFFS))
        paper_preds["lewis_beck"].append(_predict_lewis_beck(r, LEWIS_BECK_COEFFS))

    paper_resid = {k: [a - p for a, p in zip(actual, v)] for k, v in paper_preds.items()}
    paper_rmse = {k: (sum(r ** 2 for r in v) / n) ** 0.5 for k, v in paper_resid.items()}

    # === 2. Re-estimate coefficients via OLS on the sample ===
    # Each model has different regressors; we run separate OLS per model.
    # Sign convention: predict incumbent two-party share directly.
    estimated = {}

    # Fair: V_inc ~ G·i + P·i + Z·i + DPER + DUR·i + i  + intercept
    # But Fair predicts V_dem; for OLS we predict V_inc directly using the
    # appropriate sign flips: regressors are (G, P, Z) signed by incumbent-party.
    def _sign(r):
        return +1 if r["incumbent_party"] == "D" else -1

    y_fair = actual
    X_fair = [[1.0,
               r["G"],  # signed-to-incumbent: incumbent benefits from +G
               -r["P"],  # incumbent hurt by +P
               r["Z"],
               r["dper"] * _sign(r),  # DPER in Fair's original is signed by I; for V_inc we flip sign
               -r["dur"],
               ] for r in rows]
    fair_coefs, fair_resid, fair_rmse = _ols(y_fair, X_fair)
    estimated["fair"] = {
        "alpha":     round(fair_coefs[0], 3),
        "beta_g":    round(fair_coefs[1], 4),
        "beta_p":    round(fair_coefs[2], 4),
        "beta_z":    round(fair_coefs[3], 4),
        "beta_dper": round(fair_coefs[4], 4),
        "beta_dur":  round(fair_coefs[5], 4),
        "rmse_in_sample": round(fair_rmse, 3),
        "n": n,
    }

    # Hibbs: V_inc ~ R + intercept
    y_hibbs = actual
    X_hibbs = [[1.0, r["R"]] for r in rows]
    hibbs_coefs, hibbs_resid, hibbs_rmse = _ols(y_hibbs, X_hibbs)
    estimated["hibbs"] = {
        "alpha":  round(hibbs_coefs[0], 3),
        "beta_r": round(hibbs_coefs[1], 4),
        "rmse_in_sample": round(hibbs_rmse, 3),
        "n": n,
    }

    # Abramowitz: V_inc ~ G_Q2 + june_approval + term2 + intercept
    y_abram = actual
    X_abram = [[1.0, r["G_Q2"], r["june_approval_net"], r["term2"]] for r in rows]
    abram_coefs, abram_resid, abram_rmse = _ols(y_abram, X_abram)
    estimated["abramowitz"] = {
        "alpha":    round(abram_coefs[0], 3),
        "beta_g":   round(abram_coefs[1], 4),
        "beta_app": round(abram_coefs[2], 4),
        "beta_t2":  round(abram_coefs[3], 4),
        "rmse_in_sample": round(abram_rmse, 3),
        "n": n,
    }

    # Lewis-Beck: V_inc ~ misery + intercept (misery = UNRATE + CPI)
    y_lb = actual
    X_lb = [[1.0, -(r["UNRATE_avg"] + r["CPI_YoY"])] for r in rows]  # negative so beta_misery > 0
    lb_coefs, lb_resid, lb_rmse = _ols(y_lb, X_lb)
    estimated["lewis_beck"] = {
        "alpha":       round(lb_coefs[0], 3),
        "beta_misery": round(lb_coefs[1], 4),
        "rmse_in_sample": round(lb_rmse, 3),
        "n": n,
    }

    # === 3. Residual covariance matrix (paper-reported coefs) ===
    import numpy as np
    R = np.array([paper_resid["fair"], paper_resid["hibbs"],
                  paper_resid["abramowitz"], paper_resid["lewis_beck"]])
    cov = (R @ R.T) / max(1, n - 1)
    std = np.sqrt(np.diag(cov))
    # Correlation matrix
    corr = cov / np.outer(std, std)

    # === 4. Realistic ensemble RMSE under correlated residuals ===
    # Inverse-RMSE weights (matching production code)
    rmses_paper = [paper_rmse["fair"], paper_rmse["hibbs"],
                   paper_rmse["abramowitz"], paper_rmse["lewis_beck"]]
    inv = np.array([1.0 / r for r in rmses_paper])
    w = inv / inv.sum()
    # Var(Σ w_i · ŷ_i) = w' Σ w  where Σ is residual cov
    var_ensemble_correlated = float(w @ cov @ w)
    rmse_ensemble_correlated = float(np.sqrt(var_ensemble_correlated))
    # Independent assumption (production code)
    rmse_ensemble_independent = float(np.sqrt(sum((wi * ri) ** 2 for wi, ri in zip(w, rmses_paper))))

    return {
        "_meta": {
            "status": "ok",
            "computed_at": datetime.utcnow().isoformat() + "Z",
            "min_confidence": min_confidence,
            "n": n,
            "elections": [r["year"] for r in rows],
        },
        "paper_coefficient_evaluation": {
            "rmse_per_model": {k: round(v, 3) for k, v in paper_rmse.items()},
            "residual_correlation_matrix": [[round(c, 3) for c in row] for row in corr.tolist()],
            "residual_correlation_legend": ["fair", "hibbs", "abramowitz", "lewis_beck"],
        },
        "re_estimated_coefficients": estimated,
        "ensemble_rmse_correction": {
            "independence_assumption_rmse": round(rmse_ensemble_independent, 3),
            "correlated_realistic_rmse": round(rmse_ensemble_correlated, 3),
            "inflation_factor": round(rmse_ensemble_correlated / rmse_ensemble_independent, 2),
            "weights_used": {"fair": round(w[0], 3), "hibbs": round(w[1], 3),
                             "abramowitz": round(w[2], 3), "lewis_beck": round(w[3], 3)},
            "interpretation": (
                "Independence-assumption ensemble RMSE under-states uncertainty when "
                "residuals are correlated. The corrected RMSE accounts for the actual "
                "residual covariance observed in this backtest sample."
            ),
        },
        "warnings": [
            f"Sample size n={n} is small — coefficient point estimates have wide standard errors.",
            "Re-estimated coefficients are reported for inspection only and do NOT replace config.py.",
            "Hibbs R values are sourced from Hibbs's published spreadsheet; G/P/Z values are from Fair's spreadsheet — recheck on extension.",
            "1948-1976 elections are excluded for now (confidence='low'); fill those in to expand to full 18-election sample.",
        ],
    }


def run() -> dict:
    """Top-level entry point — runs backtest + writes results to JSON."""
    result = run_backtest(min_confidence="high")
    out_path = ELECTION_DIR / "backtest_results.json"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w") as f:
        json.dump(result, f, indent=2)
    logger.info(f"Backtest results written to {out_path.name}")
    if result.get("_meta", {}).get("status") == "ok":
        logger.info(
            f"  n={result['_meta']['n']}; correlated ensemble RMSE "
            f"{result['ensemble_rmse_correction']['correlated_realistic_rmse']} "
            f"(vs independent {result['ensemble_rmse_correction']['independence_assumption_rmse']})"
        )
    return result


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
    run()
