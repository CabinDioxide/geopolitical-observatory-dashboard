"""
Election forecasting models — Fair vote equation + Bafumi-Erikson-Wlezien
midterm model + transmission chain + Hormuz scenario engine.

Reads:
  - data/election/fred_indicators.json (oil, CPI, income, sentiment)
  - data/election/political_inputs.json (approval, generic ballot, structure)
  - data/election/historical_analogues.json (calibration anchors)

Writes:
  - data/election/transmission_state.json    (current state of the chain)
  - data/election/scenarios.json             (4-scenario × Fair output table)
  - data/election/senate_2026.json           (33-state Senate prediction)
  - data/election/forecast_summary.json      (top-line numbers for UI)

Design principle: every output number is accompanied by a confidence band.
Never emit a point estimate without ±RMSE. The dashboard shows median + dark
band per the user's UI preference.
"""
from __future__ import annotations

import json
import logging
import math
from datetime import datetime
from pathlib import Path

from pipeline.config import (
    ABRAMOWITZ_COEFFS,
    BEW_COEFFS,
    ELECTION_DIR,
    FAIR_COEFFS,
    HIBBS_COEFFS,
    HORMUZ_SCENARIOS,
    TRANSMISSION_ELASTICITIES,
)

logger = logging.getLogger(__name__)


# -----------------------------------------------------------------------------
# Helpers: read inputs
# -----------------------------------------------------------------------------

def _load_json(name: str) -> dict:
    path = ELECTION_DIR / name
    if not path.exists():
        logger.warning(f"{name} not found; returning empty")
        return {}
    with open(path) as f:
        return json.load(f)


def _latest_value(fred_data: dict, series_id: str) -> float | None:
    s = fred_data.get("series", {}).get(series_id, {})
    latest = s.get("latest")
    if latest is None:
        return None
    return latest.get("value")


def _yoy_change(fred_data: dict, series_id: str) -> float | None:
    """Year-over-year % change of a series, or None if no ~12-month-prior obs.

    Strategy: find the observation whose date is closest to (latest - 12 months)
    AND within ±60 days of that target. If the closest observation falls outside
    that window, return None (avoid spurious "YoY" using 6-month gaps).
    """
    s = fred_data.get("series", {}).get(series_id, {})
    obs = s.get("observations", [])
    if len(obs) < 2:
        return None
    latest = obs[-1]["value"]
    latest_date = datetime.strptime(obs[-1]["date"], "%Y-%m-%d")
    try:
        target_date = latest_date.replace(year=latest_date.year - 1)
    except ValueError:
        # Feb 29 → Feb 28 fallback
        target_date = latest_date.replace(year=latest_date.year - 1, day=28)
    closest = min(obs, key=lambda o: abs(
        (datetime.strptime(o["date"], "%Y-%m-%d") - target_date).days
    ))
    delta_days = abs((datetime.strptime(closest["date"], "%Y-%m-%d") - target_date).days)
    if delta_days > 60:
        return None
    if closest["value"] == 0:
        return None
    return 100.0 * (latest - closest["value"]) / closest["value"]


def _quarters_since(date_str: str, ref_str: str = "2025-01-20") -> int:
    """Number of quarters elapsed since reference date (default: Trump 2nd term start)."""
    d = datetime.strptime(date_str, "%Y-%m-%d")
    ref = datetime.strptime(ref_str, "%Y-%m-%d")
    months = (d.year - ref.year) * 12 + (d.month - ref.month)
    return max(0, months // 3)


# -----------------------------------------------------------------------------
# Transmission chain — sustains the dashboard's Layer 1 monitoring page
# -----------------------------------------------------------------------------

def compute_transmission_state(fred: dict, polit: dict) -> dict:
    """Snapshot of every link in the transmission chain.

    Returns dict with each link's current value, 30d/90d change, and a
    'pressure' score (0-100) measuring how far from baseline we are.
    """
    brent = _latest_value(fred, "DCOILBRENTEU")
    wti = _latest_value(fred, "DCOILWTICO")
    gas_retail = _latest_value(fred, "GASREGW")

    # SPR comes from EIA (FRED doesn't carry it). EIA reports in million bbl;
    # convert to kbbl to keep the chain unit consistent.
    eia = _load_json("eia_indicators.json")
    spr_mbbl = eia.get("metrics", {}).get("spr_mbbl", {}).get("current")
    spr = spr_mbbl * 1000 if spr_mbbl is not None else None
    cpi_yoy = _yoy_change(fred, "CPIAUCSL")
    core_cpi_yoy = _yoy_change(fred, "CPILFESL")
    cpi_energy_yoy = _yoy_change(fred, "CPIENGSL")
    rdpi = _latest_value(fred, "DSPIC96")
    rdpi_yoy = _yoy_change(fred, "DSPIC96")
    ics = _latest_value(fred, "UMCSENT")
    inflation_expect = _latest_value(fred, "MICH")
    epu = _latest_value(fred, "USEPUINDXD")

    approval_net = polit.get("trump_approval", {}).get("net")
    generic_ballot_dem_lead = polit.get("generic_ballot", {}).get("dem_lead")

    def pressure(value, baseline, alarm):
        """Score 0-100 measuring distance from baseline toward alarm.

        Direction is inferred from baseline/alarm ordering:
          - For "higher is worse" (e.g., Brent), set baseline < alarm.
          - For "lower is worse" (e.g., ICS), set baseline > alarm.
        The formula handles both symmetrically.
        """
        if value is None or baseline is None or alarm is None or baseline == alarm:
            return None
        raw = (value - baseline) / (alarm - baseline)
        return max(0, min(100, round(100 * raw)))

    # 基线/告警阈值统一定义（V3 校准，2026-05-08）：
    #
    #   baseline = 该指标处于"对执政党选举无明显影响"的水平（中性）
    #   alarm    = 该指标单独达到此水平时，历史上对应执政党在下次选举
    #              损失 ≥5pp 两党票（直接对应"政治危机"）。
    #
    # 9 个指标分为三个 tag：
    #   上游 (upstream)：本身不影响选票，但触发下游链条。Alarm 定义为
    #     "维持此水平会推下游指标至其 alarm" 的水平。
    #   中游 (midstream)：传导途中，与选票有间接关联。Alarm 同上。
    #   下游 (downstream)：直接对应选票。Alarm 按定义 A 标定。
    #
    # 重新校准结果与原版差异：alarm 整体收紧，downstream 指标当前压力
    # 普遍上升（更准确反映传导链已传至选民感知）。
    chain = [
        {
            "step": 1, "name": "布伦特原油", "name_en": "Brent crude", "tag": "上游",
            "current": brent, "unit": "USD/桶", "unit_en": "USD/bbl",
            "baseline": 80, "alarm": 145,
            "pressure": pressure(brent, 80, 145),
            "interpretation": "传导链源头。本身不直接影响选票。Alarm $145 为推汽油至其 alarm $5.00 所需油价（passthrough $0.025/$1·bbl）。",
            "interpretation_en": "Source of the transmission chain. Does not directly affect votes. Alarm of $145 is the level required to push gasoline to its alarm of $5.00 (passthrough $0.025/$1·bbl).",
        },
        {
            "step": 2, "name": "美国零售汽油", "name_en": "US retail gasoline", "tag": "中游",
            "current": gas_retail, "unit": "USD/加仑", "unit_en": "USD/gal",
            "baseline": 3.40, "alarm": 5.00,
            "pressure": pressure(gas_retail, 3.40, 5.00),
            "interpretation": "Alarm $5.00 取自 2022 峰值 $5.03 的实证：拜登净支持率从 -10 跌至 -20。汽油不直接进选票模型，主要通过 CPI 传导。",
            "interpretation_en": "Alarm $5.00 anchored to 2022 peak $5.03: Biden's net approval fell from -10 to -20. Gasoline doesn't enter vote models directly; it transmits via CPI.",
        },
        {
            "step": 3, "name": "战略石油储备 (SPR)", "name_en": "Strategic Petroleum Reserve (SPR)", "tag": "上游",
            "current": spr, "unit": "千桶", "unit_en": "kbbl",
            "baseline": 600_000, "alarm": 350_000,
            "pressure": pressure(spr, 600_000, 350_000),
            "interpretation": "美国应急油储。<3.5 亿桶 = 6 个月释放容量耗尽（释放速度 ~1 mb/day），无法压制下一轮油价冲击 → 触发上游 alarm。",
            "interpretation_en": "US emergency oil reserve. <350 Mbbl = 6-month release capacity exhausted (release rate ~1 mb/day), cannot suppress the next oil shock → triggers upstream alarm.",
        },
        {
            "step": 4, "name": "CPI 通胀（头条）", "name_en": "CPI YoY (headline)", "tag": "中游",
            "current": cpi_yoy, "unit": "%", "unit_en": "%",
            "baseline": 2.5, "alarm": 8.0,
            "pressure": pressure(cpi_yoy, 2.5, 8.0),
            "interpretation": "Alarm 8% 取自 2022 实证：CPI 9.1% 拖 ICS 至 50。CPI 不直接对选票造成 5pp 损失（Fair 系数 -0.69pp/pp 需 14% 通胀），通过 ICS 间接传导。",
            "interpretation_en": "Alarm 8% from 2022 evidence: CPI 9.1% pulled ICS to 50. CPI alone doesn't deliver 5pp vote loss (Fair coefficient -0.69pp/pp would need 14% inflation); transmits indirectly through ICS.",
        },
        {
            "step": 5, "name": "核心 CPI（剔能源食品）", "name_en": "Core CPI (excl. food/energy)", "tag": "中游",
            "current": core_cpi_yoy, "unit": "%", "unit_en": "%",
            "baseline": 2.5, "alarm": 5.0,
            "pressure": pressure(core_cpi_yoy, 2.5, 5.0),
            "interpretation": "Alarm 5% = 工资-物价螺旋临界。Fed 强力加息 → 衰退风险 → 实际收入下游受损。",
            "interpretation_en": "Alarm 5% = wage-price spiral threshold. Fed aggressive hiking → recession risk → real income downstream impact.",
        },
        {
            "step": 6, "name": "实际可支配收入（同比）", "name_en": "Real disposable income (YoY)", "tag": "下游",
            "current": rdpi_yoy, "unit": "%", "unit_en": "%",
            "baseline": 2.0, "alarm": -1.0,
            "pressure": pressure(rdpi_yoy, 2.0, -1.0) if rdpi_yoy is not None else None,
            "interpretation": "Hibbs Bread & Peace 直接输入。持续 YoY -1% → 加权 15 季度 R ≈ 0.5% → Hibbs 系数 3.49 × 1.43pp 下降 = -5pp 选票。",
            "interpretation_en": "Direct input to Hibbs Bread & Peace. Sustained YoY -1% → weighted 15-quarter R ≈ 0.5% → Hibbs coefficient 3.49 × 1.43pp drop = -5pp votes.",
        },
        {
            "step": 7, "name": "密歇根大学消费者信心 (ICS)", "name_en": "Michigan Consumer Sentiment (ICS)", "tag": "下游",
            "current": ics, "unit": "指数", "unit_en": "index",
            "baseline": 85, "alarm": 55,
            "pressure": pressure(ics, 85, 55),
            "interpretation": "Alarm 55 为实证危机底：1980 底 51 (Carter -10pp 普选)、2008 底 55 (McCain -7pp)、2022 底 50 (中期 + 2024 大选 -3pp)。",
            "interpretation_en": "Alarm 55 = empirical crisis trough: 1980 bottom 51 (Carter -10pp popular vote), 2008 bottom 55 (McCain -7pp), 2022 bottom 50 (midterm + 2024 -3pp).",
        },
        {
            "step": 8, "name": "特朗普净支持率", "name_en": "Trump net approval", "tag": "下游",
            "current": approval_net, "unit": "pp", "unit_en": "pp",
            "baseline": -3, "alarm": -10,
            "pressure": pressure(approval_net, -3, -10),
            "interpretation": "Abramowitz 系数反算：每 1pp 净支持率 → 0.642pp 两党票。从 baseline -3 到 alarm -10 = 7pp 跌幅 → 4.5pp 票损失 ≈ 5pp 临界。",
            "interpretation_en": "Abramowitz coefficient reversed: each 1pp net approval → 0.642pp two-party vote. From baseline -3 to alarm -10 = 7pp drop → 4.5pp vote loss ≈ 5pp threshold.",
        },
        {
            "step": 9, "name": "通用国会选票（D 领先）", "name_en": "Generic Ballot (D lead)", "tag": "下游",
            "current": generic_ballot_dem_lead, "unit": "pp", "unit_en": "pp",
            "baseline": 1, "alarm": 6,
            "pressure": pressure(generic_ballot_dem_lead, 1, 6),
            "interpretation": "GB 与 House 普选近 1:1 映射。D+6 = R 普选输约 5pp = 触发 5pp alarm 定义。",
            "interpretation_en": "Generic Ballot maps near 1:1 to House popular vote. D+6 = R loses popular vote by ~5pp = triggers the 5pp alarm definition.",
        },
    ]

    return {
        "as_of": datetime.utcnow().isoformat() + "Z",
        "chain": chain,
        "epu_index": epu,
        "raw_inputs_for_model": {
            "brent": brent, "wti": wti, "gas_retail": gas_retail,
            "cpi_yoy": cpi_yoy, "core_cpi_yoy": core_cpi_yoy,
            "rdpi_yoy": rdpi_yoy, "ics": ics, "inflation_expect": inflation_expect,
            "approval_net": approval_net,
            "generic_ballot_dem_lead": generic_ballot_dem_lead,
        },
    }


# -----------------------------------------------------------------------------
# Fair vote equation — the core 2028 model
# -----------------------------------------------------------------------------

def fair_predict(g: float, p: float, z: int, dper: int, dur: float, i: int = -1) -> dict:
    """Fair's two-party vote share for the incumbent party.

    Args:
      g: real per-capita GDP growth, election-year Q1-Q3, annualized %
      p: |GDP deflator growth| over admin's first 15 quarters, annualized %
      z: number of "good news" quarters (real per-capita growth >3.2%)
      dper: +1 if Dem incumbent running, -1 if Rep incumbent, 0 if open seat
      dur: term penalty (0 / 1 / 1.25 / 1.5)
      i: party dummy (+1 Dem, -1 Rep) — represents Republican party in 2028

    Returns:
      dict with point estimate + ±2*RMSE band + decomposition
    """
    c = FAIR_COEFFS
    # Note: in Fair's specification the G, P, Z effects are signed by I so that
    # "good economy" rewards whichever party is currently in office. For 2028
    # with R incumbent (i=-1), positive G should *reduce* Dem vote share. The
    # output V is Dem two-party share, so we compute and report incumbent-party
    # share directly to avoid sign confusion downstream.
    v_dem = (
        c["alpha"]
        + c["beta_g"] * g * i
        + c["beta_p"] * p * i
        + c["beta_z"] * z * i
        + c["beta_dper"] * dper
        + c["beta_dur"] * dur * i
        + c["beta_i"] * i
    )
    # For R incumbent, incumbent share = 100 - v_dem.
    if i == -1:
        v_inc = 100.0 - v_dem
    else:
        v_inc = v_dem

    return {
        "incumbent_party": "R" if i == -1 else "D",
        "incumbent_two_party_pct": round(v_inc, 2),
        "lower_95ci": round(v_inc - 2 * c["rmse"], 2),
        "upper_95ci": round(v_inc + 2 * c["rmse"], 2),
        "rmse": c["rmse"],
        "win_prob": _normal_cdf((v_inc - 50) / c["rmse"]),
        "decomposition": {
            "intercept_contribution_dem": c["alpha"],
            "g_contribution_dem": round(c["beta_g"] * g * i, 2),
            "p_contribution_dem": round(c["beta_p"] * p * i, 2),
            "z_contribution_dem": round(c["beta_z"] * z * i, 2),
            "dper_contribution_dem": round(c["beta_dper"] * dper, 2),
            "dur_contribution_dem": round(c["beta_dur"] * dur * i, 2),
            "i_contribution_dem": round(c["beta_i"] * i, 2),
        },
        "inputs": {"G": g, "P": p, "Z": z, "DPER": dper, "DUR": dur, "I": i},
    }


def _normal_cdf(z_score: float) -> float:
    """Standard normal CDF. Used for win-probability from vote share."""
    return round(0.5 * (1 + math.erf(z_score / math.sqrt(2))), 3)


# -----------------------------------------------------------------------------
# Hibbs Bread & Peace — sensitive to real income, blind to inflation
# -----------------------------------------------------------------------------

def hibbs_predict(weighted_real_dpi_growth: float, cumulative_fatalities: int = 0,
                  i: int = -1) -> dict:
    """Hibbs's two-party vote share for the incumbent party.

    Args:
      weighted_real_dpi_growth: λ-weighted real per-capita DPI growth across
        the admin's 15 quarters (annualized %). Use compute_hibbs_R().
      cumulative_fatalities: US military deaths in unprovoked wars during term.
        Iran 2026 conflict casualties enter here if the Pentagon publishes counts.
      i: party of incumbent (+1 D, -1 R). For symmetry we report incumbent share.

    Notes:
      Hibbs's model has only TWO degrees of freedom (R and war). It is the most
      parsimonious credible model. R captures both growth and inflation
      simultaneously (real income = nominal income / price level). It does NOT
      capture perception gaps — when ICS diverges from real income (1992, 2024),
      Hibbs underperforms.
    """
    c = HIBBS_COEFFS
    v_inc = c["alpha"] + c["beta_r"] * weighted_real_dpi_growth + c["gamma_war"] * cumulative_fatalities
    return {
        "incumbent_party": "R" if i == -1 else "D",
        "incumbent_two_party_pct": round(v_inc, 2),
        "lower_95ci": round(v_inc - 2 * c["rmse"], 2),
        "upper_95ci": round(v_inc + 2 * c["rmse"], 2),
        "rmse": c["rmse"],
        "win_prob": _normal_cdf((v_inc - 50) / c["rmse"]),
        "inputs": {
            "weighted_real_dpi_growth": weighted_real_dpi_growth,
            "cumulative_fatalities": cumulative_fatalities,
        },
    }


def compute_hibbs_R(quarterly_growth_pct: list[float]) -> float:
    """λ-weighted average of quarterly per-capita real DPI growth (annualized %).

    Most recent quarter has highest weight; weight decays geometrically backward.
    quarterly_growth_pct: list of QoQ annualized growth rates, oldest → newest.
    """
    if not quarterly_growth_pct:
        return 0.0
    lam = HIBBS_COEFFS["lambda"]
    n = len(quarterly_growth_pct)
    # weights[i] = λ^(n-1-i): newest (i=n-1) gets weight 1, oldest gets λ^(n-1).
    weights = [lam ** (n - 1 - i) for i in range(n)]
    wsum = sum(weights)
    return sum(w * g for w, g in zip(weights, quarterly_growth_pct)) / wsum


# -----------------------------------------------------------------------------
# Abramowitz Time for Change — Q2 growth + June approval + term2
# -----------------------------------------------------------------------------

def abramowitz_predict(g_q2: float, june_net_approval: float, term2: int = 0,
                       i: int = -1) -> dict:
    """Abramowitz's two-party vote share for the incumbent party.

    Args:
      g_q2: Q2 election-year real GDP growth, annualized %
      june_net_approval: Sitting president's net approval (approve - disapprove) in June
      term2: 1 if incumbent party in office for 2+ consecutive terms, 0 otherwise
      i: party (cosmetic — reported share is for incumbent regardless)

    Note:
      For 2028 R is in 1st term → term2=0. This removes the -4pp penalty that
      hurt Bush 41 (1992, term2=1) and McCain (2008, term2=1).
    """
    c = ABRAMOWITZ_COEFFS
    v_inc = (
        c["alpha"]
        + c["beta_g"] * g_q2
        + c["beta_app"] * june_net_approval
        + c["beta_t2"] * term2
    )
    return {
        "incumbent_party": "R" if i == -1 else "D",
        "incumbent_two_party_pct": round(v_inc, 2),
        "lower_95ci": round(v_inc - 2 * c["rmse"], 2),
        "upper_95ci": round(v_inc + 2 * c["rmse"], 2),
        "rmse": c["rmse"],
        "win_prob": _normal_cdf((v_inc - 50) / c["rmse"]),
        "inputs": {
            "g_q2": g_q2,
            "june_net_approval": june_net_approval,
            "term2": term2,
        },
    }


# -----------------------------------------------------------------------------
# Ensemble — inverse-RMSE weighting (PollyVote-style)
# -----------------------------------------------------------------------------

def ensemble_predict(fair_pct: float, hibbs_pct: float, abramowitz_pct: float) -> dict:
    """Combine three models. Lower-RMSE models get higher weight.

    PollyVote (Graefe et al) shows ensembles consistently beat any single model
    out-of-sample by ~30-40% RMSE reduction.
    """
    rmses = [FAIR_COEFFS["rmse"], HIBBS_COEFFS["rmse"], ABRAMOWITZ_COEFFS["rmse"]]
    inv = [1 / r for r in rmses]
    total = sum(inv)
    weights = [w / total for w in inv]
    preds = [fair_pct, hibbs_pct, abramowitz_pct]
    weighted = sum(w * p for w, p in zip(weights, preds))
    # Combined RMSE — assume independence (optimistic; correlation reduces the gain).
    # σ²_ensemble = Σ w²·σ² → σ_ensemble = sqrt of that.
    combined_rmse = math.sqrt(sum((w * r) ** 2 for w, r in zip(weights, rmses)))
    return {
        "incumbent_two_party_pct": round(weighted, 2),
        "lower_95ci": round(weighted - 2 * combined_rmse, 2),
        "upper_95ci": round(weighted + 2 * combined_rmse, 2),
        "ensemble_rmse": round(combined_rmse, 2),
        "win_prob": _normal_cdf((weighted - 50) / combined_rmse),
        "weights": {
            "fair": round(weights[0], 3),
            "hibbs": round(weights[1], 3),
            "abramowitz": round(weights[2], 3),
        },
        "components": {
            "fair_pct": fair_pct,
            "hibbs_pct": hibbs_pct,
            "abramowitz_pct": abramowitz_pct,
        },
    }


# -----------------------------------------------------------------------------
# Bafumi-Erikson-Wlezien — 2026 House
# -----------------------------------------------------------------------------

def bew_house_predict(generic_ballot_dem_lead: float, approval_net: float,
                      in_party: str = "R") -> dict:
    """Predict in-party seat change in 2026 House midterm.

    Formula: in_party_seat_change = α + β_gb × (in_party_ballot_lead)
                                  + β_app × (in_party_net_approval)
    Where:
      α = -22 (baseline midterm penalty: in-party loses ~22 seats average)
      in_party_ballot_lead = -dem_lead if in-party is R, else +dem_lead
      in_party_net_approval = approval_net (assumed already given for in-party)
    """
    c = BEW_COEFFS
    in_party_ballot_lead = -generic_ballot_dem_lead if in_party == "R" else generic_ballot_dem_lead
    seat_change = (
        c["alpha"]
        + c["beta_gb"] * in_party_ballot_lead
        + c["beta_app"] * approval_net  # approval_net is for the in-party president
    )
    current_seats = 220 if in_party == "R" else 215
    other_seats = 435 - current_seats
    predicted_in_party = current_seats + seat_change
    # Control flips if in-party drops below 218.
    margin_to_lose_control = predicted_in_party - 218
    flip_prob = _normal_cdf(-margin_to_lose_control / c["rmse"])
    return {
        "in_party": in_party,
        "in_party_seat_change": round(seat_change, 1),
        "lower_95ci": round(seat_change - 2 * c["rmse"], 1),
        "upper_95ci": round(seat_change + 2 * c["rmse"], 1),
        "rmse": c["rmse"],
        "current_in_party_seats": current_seats,
        "predicted_in_party_seats_post_election": round(predicted_in_party, 0),
        "control_flip_probability": flip_prob,
        "inputs": {
            "generic_ballot_dem_lead": generic_ballot_dem_lead,
            "approval_net": approval_net,
            "in_party": in_party,
        },
    }


# -----------------------------------------------------------------------------
# Hormuz scenario engine — Layer 2 transmission to Layer 3 effect
# -----------------------------------------------------------------------------

def project_macro_under_scenario(scenario_key: str, baseline_state: dict) -> dict:
    """Given current macro state + Hormuz scenario, project G, P, Z to 2028.

    Simplified single-shock propagation:
      ΔBrent (vs baseline $75) → ΔGasoline → ΔCPI → ΔReal income / ΔGDP growth
    """
    sc = HORMUZ_SCENARIOS[scenario_key]
    e = TRANSMISSION_ELASTICITIES

    brent_avg = sc["brent_avg_to_election"]
    brent_baseline = 75
    brent_premium = brent_avg - brent_baseline

    # Gasoline: ~$0.025/gal per $1/bbl premium, sustained
    gas_premium = brent_premium * e["brent_to_gasoline_usd_per_gal_per_dollar_bbl"]

    # CPI YoY: $1/gal sustained → ~0.85pp CPI YoY
    cpi_premium_pp = gas_premium * e["gasoline_to_headline_cpi_pp_per_dollar_gal"]
    # Add to baseline current CPI YoY (assumed normalized state ~2.5%).
    current_cpi_yoy = baseline_state.get("cpi_yoy") or 3.0
    projected_cpi_2026_2028 = current_cpi_yoy + cpi_premium_pp

    # Real GDP growth hit (Hamilton 2003): 50% sustained shock = -1.4pp growth
    shock_pct = (brent_avg - brent_baseline) / brent_baseline
    growth_hit = shock_pct * 2 * e["oil_shock_to_real_gdp_growth_pp_per_50pct"]
    # Baseline 2026-2028 trend growth assumed 2%; adjust:
    projected_growth = 2.0 + growth_hit

    # Z (good news quarters): sustained shock kills good quarters.
    # Baseline expectation maybe 4-6 good quarters; subtract roughly 1 per ~$25 sustained premium.
    z_base = 5
    z_loss = max(0, int(round(brent_premium / 25)))
    z_projected = max(0, z_base - z_loss)

    # P: Fair uses 15-quarter inflation. Assume baseline term-avg 3% + premium decays to half over period.
    p_admin_avg = 3.0 + 0.5 * cpi_premium_pp

    # ICS impact (perception channel)
    ics_drop = cpi_premium_pp * e["cpi_to_michigan_ics_per_pp"]
    current_ics = baseline_state.get("ics") or 70
    projected_ics = current_ics + ics_drop

<<<<<<< HEAD
    # Approval impact (via ICS channel) — slow, sustained
=======
    # Approval impact (via ICS channel)
>>>>>>> origin/main
    approval_drop = (ics_drop / 10) * e["ics_to_approval_pp_per_10_ics"]
    current_approval_net = baseline_state.get("approval_net") or -10
    projected_approval = current_approval_net + approval_drop

<<<<<<< HEAD
    # === Rally + casualty effects (military intervention scenarios) ===
    # Rally-around-the-flag: Mueller (1973) shows 5-15pp boost on military
    # intervention, decays exponentially with ~6-month half-life
    # (1990 Bush 41 went 89% → 34% over 18 months).
    # Casualty drag: accumulates over time, no decay (Hibbs WAR variable proxy).
    rally_pp = sc.get("rally_effect_pp", 0)
    casualty_drag_pp = sc.get("casualty_drag_pp", 0)
    # Decay factors for two horizons
    months_to_midterm = 6      # 2026-05 to 2026-11
    months_to_pres = 30        # 2026-05 to 2028-11
    decay_midterm = 0.5 ** (months_to_midterm / 6)   # ~0.5
    decay_pres = 0.5 ** (months_to_pres / 6)         # ~0.03 (essentially gone)
    # Casualty drag scales with deployment duration; midterm sees half, presidential sees full
    rally_2026_effective = rally_pp * decay_midterm + casualty_drag_pp * 0.5
    rally_2028_effective = rally_pp * decay_pres + casualty_drag_pp * 1.0
    # Apply to two separate approval projections
    projected_approval_2026 = projected_approval + rally_2026_effective
    projected_approval_2028 = projected_approval + rally_2028_effective
    # Backwards-compat field uses 2026-relevant value (called by midterm models first)
    projected_approval = projected_approval_2026

=======
>>>>>>> origin/main
    return {
        "scenario_key": scenario_key,
        "scenario_label": sc["label"],
        "brent_avg_to_election": brent_avg,
        "brent_premium_vs_baseline": brent_premium,
<<<<<<< HEAD
        "rally_2026_pp": round(rally_2026_effective, 2),
        "rally_2028_pp": round(rally_2028_effective, 2),
=======
>>>>>>> origin/main
        "projected_2026_2028_macro": {
            "G_real_growth_pct": round(projected_growth, 2),
            "P_admin_inflation_pct": round(p_admin_avg, 2),
            "Z_good_news_quarters": z_projected,
            "cpi_yoy_2026_2028": round(projected_cpi_2026_2028, 2),
            "michigan_ics": round(projected_ics, 1),
            "approval_net": round(projected_approval, 1),
<<<<<<< HEAD
            "approval_net_2026": round(projected_approval_2026, 1),
            "approval_net_2028": round(projected_approval_2028, 1),
=======
>>>>>>> origin/main
        },
    }


def run_all_scenarios(transmission_state: dict, polit: dict) -> dict:
    """Run Fair + Hibbs + Abramowitz + ensemble (2028) and BEW (2026)
    under all 4 Hormuz scenarios."""
    baseline = transmission_state["raw_inputs_for_model"]
    structural_2028 = polit.get("structural_2028_presidential", {})
    dper_2028 = structural_2028.get("dper", 0)
    dur_2028 = structural_2028.get("dur", 0)
    term2_2028 = 0  # R only completed 1 consecutive term by 2028
    i_2028 = -1     # Republican incumbent

    # Current weighted-R input for Hibbs needs a quarterly-growth time series.
    # We approximate using the latest real DPI YoY as a current quarter rate
    # and project forward under each scenario.
    current_rdpi_yoy = baseline.get("rdpi_yoy") or 1.0

    results = []
    for sk in HORMUZ_SCENARIOS:
        macro = project_macro_under_scenario(sk, baseline)
        m = macro["projected_2026_2028_macro"]

        # === Fair ===
        fair = fair_predict(
            g=m["G_real_growth_pct"],
            p=m["P_admin_inflation_pct"],
            z=m["Z_good_news_quarters"],
            dper=dper_2028,
            dur=dur_2028,
            i=i_2028,
        )

        # === Hibbs ===
        # Build a 15-quarter QoQ growth path: assume past quarters used
        # current_rdpi_yoy, future quarters degrade per macro projection.
        # G_real_growth_pct is admin-period real GDP growth proxy → use as
        # average for remaining quarters, blended with current YoY.
        past_quarters = [current_rdpi_yoy] * 5            # 2025 Q1 - 2026 Q1 (5 quarters)
        future_quarters = [m["G_real_growth_pct"]] * 10   # 2026 Q2 - 2028 Q3 (10 quarters)
        hibbs_R = compute_hibbs_R(past_quarters + future_quarters)
        hibbs = hibbs_predict(weighted_real_dpi_growth=hibbs_R, i=i_2028)

        # === Abramowitz ===
<<<<<<< HEAD
        # Q2 2028 growth + June 2028 net approval (rally-decayed by then).
        approval_2028 = m.get("approval_net_2028", m["approval_net"])
        abramowitz = abramowitz_predict(
            g_q2=m["G_real_growth_pct"],
            june_net_approval=approval_2028,
=======
        # Q2 2028 growth ≈ scenario-projected growth (this is the most direct input)
        # June 2028 net approval ≈ projected approval for the period
        abramowitz = abramowitz_predict(
            g_q2=m["G_real_growth_pct"],
            june_net_approval=m["approval_net"],
>>>>>>> origin/main
            term2=term2_2028,
            i=i_2028,
        )

        # === Ensemble ===
        ensemble = ensemble_predict(
            fair["incumbent_two_party_pct"],
            hibbs["incumbent_two_party_pct"],
            abramowitz["incumbent_two_party_pct"],
        )

<<<<<<< HEAD
        # === 2026 House (BEW) — uses 2026-relevant approval (rally still active) ===
        approval_2026 = m.get("approval_net_2026", m["approval_net"])
        approval_shift = approval_2026 - (baseline.get("approval_net") or -10)
=======
        # === 2026 House (BEW) ===
        approval_shift = m["approval_net"] - (baseline.get("approval_net") or -10)
>>>>>>> origin/main
        gb_baseline = polit.get("generic_ballot", {}).get("dem_lead", 3.5)
        gb_projected = gb_baseline + (-approval_shift) * 0.3
        bew = bew_house_predict(
            generic_ballot_dem_lead=gb_projected,
<<<<<<< HEAD
            approval_net=approval_2026,
            in_party="R",
        )

        # === 2026 Senate per scenario ===
        # Same generic-ballot environment as House model. Deeper R-favorable
        # structural map (22 R defending vs 11 D), so even a strong D wave may
        # only flip 2-3 seats. Outputs majority probability and net D seat change.
        senate_scen = _senate_for_environment(gb_projected)
        # Net D seat change vs current 47-D, 53-R Senate
        d_net_change = round(senate_scen["expected_seats_after_2026"]["D"] - 47, 1)

=======
            approval_net=m["approval_net"],
            in_party="R",
        )

>>>>>>> origin/main
        results.append({
            "scenario": sk,
            "label": HORMUZ_SCENARIOS[sk]["label"],
            "probability_prior": HORMUZ_SCENARIOS[sk]["probability_prior"],
            "macro_projection": macro,
            "fair_2028": fair,
            "hibbs_2028": hibbs,
            "abramowitz_2028": abramowitz,
            "ensemble_2028": ensemble,
            "bew_2026_house": bew,
<<<<<<< HEAD
            "senate_2026": {
                "expected_d_seats": senate_scen["expected_seats_after_2026"]["D"],
                "expected_r_seats": senate_scen["expected_seats_after_2026"]["R"],
                "d_net_change": d_net_change,
                "d_majority_prob": senate_scen["majority_probability"]["D_majority_prob"],
                "r_majority_prob": senate_scen["majority_probability"]["R_majority_prob"],
                "national_env_d_shift": senate_scen["national_environment_d_pp_shift_vs_2024"],
            },
=======
>>>>>>> origin/main
        })

    # Probability-weighted average across scenarios.
    p_weights = [r["probability_prior"] for r in results]
    def wmean(getter):
        return sum(getter(r) * w for r, w in zip(results, p_weights))

    return {
        "computed_at": datetime.utcnow().isoformat() + "Z",
        "scenarios": results,
        "weighted_summary": {
            "2028_R_two_party_fair":       round(wmean(lambda r: r["fair_2028"]["incumbent_two_party_pct"]), 2),
            "2028_R_two_party_hibbs":      round(wmean(lambda r: r["hibbs_2028"]["incumbent_two_party_pct"]), 2),
            "2028_R_two_party_abramowitz": round(wmean(lambda r: r["abramowitz_2028"]["incumbent_two_party_pct"]), 2),
            "2028_R_two_party_ensemble":   round(wmean(lambda r: r["ensemble_2028"]["incumbent_two_party_pct"]), 2),
            "2028_incumbent_two_party_pct": round(wmean(lambda r: r["ensemble_2028"]["incumbent_two_party_pct"]), 2),  # legacy alias
            "2028_incumbent_party": "R",
            "2026_in_party_seat_change": round(wmean(lambda r: r["bew_2026_house"]["in_party_seat_change"]), 1),
        },
        "method_notes": [
            "Three-model ensemble: Fair (rmse 2.5) + Hibbs Bread&Peace (rmse 1.85) + Abramowitz Time-for-Change (rmse 1.90).",
            "Inverse-RMSE weights: Hibbs ~0.36, Abramowitz ~0.36, Fair ~0.27.",
            "All 2028 calcs assume R is open-seat, first-term incumbent party (DPER=0, DUR=0, TERM2=0).",
            "Hibbs's R = λ-weighted real per-capita DPI growth across 15 quarters (λ=0.915).",
            "BEW House: 2026 in-party=R defending ~220 seats; flip threshold = 218.",
            "Macro projection elasticities calibrated from 1980 Iran-Iraq, 1990 Gulf War, 2008 oil peak, 2022 RU-UA.",
        ],
    }


# -----------------------------------------------------------------------------
# 2026 Senate state-level — uses fixed PVI + national environment shift
# -----------------------------------------------------------------------------

# Class II senators up in 2026, with Cook PVI and incumbent info.
# PVI = Partisan Voting Index (Cook). +R = Republican-leaning, -R = Dem-leaning.
SENATE_2026_CLASS_II = [
    # (state, incumbent_party, incumbent_running, PVI, notes)
    ("AK", "R", True,   8,  "Sullivan defending"),
    ("AL", "R", True,  15,  "Tuberville defending"),
    ("AR", "R", True,  16,  "Cotton defending"),
    ("CO", "D", True,  -3,  "Hickenlooper defending"),
    ("DE", "D", True,  -5,  "Coons defending"),
    ("GA", "D", True,   3,  "Ossoff defending — top D vulnerability"),
    ("IA", "R", True,   6,  "Ernst defending"),
    ("ID", "R", True,  18,  "Risch defending"),
    ("IL", "D", True,  -8,  "Durbin defending (or open if retires)"),
    ("KS", "R", True,  10,  "Marshall defending"),
    ("KY", "R", False, 15,  "OPEN — McConnell retiring"),
    ("LA", "R", True,  12,  "Cassidy defending — primary risk"),
    ("MA", "D", True, -15,  "Markey defending"),
    ("ME", "R", True,  -2,  "Collins defending — top R vulnerability"),
    ("MI", "D", True,  -1,  "Peters defending"),
    ("MN", "D", True,  -2,  "Smith defending"),
    ("MS", "R", True,  11,  "Hyde-Smith defending"),
    ("MT", "R", True,  11,  "Daines defending"),
    ("NC", "R", True,   3,  "Tillis defending — competitive"),
    ("NE", "R", True,  13,  "Ricketts defending"),
    ("NH", "D", True,  -1,  "Shaheen defending"),
    ("NJ", "D", True,  -6,  "Booker defending"),
    ("NM", "D", True,  -3,  "Lujan defending"),
    ("OK", "R", True,  17,  "Lankford defending"),
    ("OR", "D", True,  -6,  "Merkley defending"),
    ("RI", "D", True,  -8,  "Reed defending"),
    ("SC", "R", True,   8,  "Graham defending"),
    ("SD", "R", True,  16,  "Rounds defending"),
    ("TN", "R", True,  14,  "Hagerty defending"),
    ("TX", "R", True,   5,  "Cornyn defending — primary risk"),
    ("VA", "D", True,  -3,  "Warner defending"),
    ("WV", "R", True,  22,  "Capito defending"),
    ("WY", "R", True,  25,  "Lummis defending"),
]


<<<<<<< HEAD
def _senate_for_environment(generic_ballot_dem_lead: float) -> dict:
    """Compute Senate 2026 race-by-race + majority probability for a given
    generic-ballot environment. Returns dict with races, expected seats,
    and majority probabilities. Used both per-scenario and for the
    weighted-aggregate senate page."""
    # Reference: 2024 House national popular vote was ~R+2.7 (Republicans won
    # the popular vote). So D+3.5 in 2026 = 6.2pp shift toward D vs 2024.
    national_2024_d_lead = -2.7
    national_env_shift_pp_to_dem = generic_ballot_dem_lead - national_2024_d_lead

    incumbent_advantage_pp = 4.0
    national_env_transmission = 0.75
    state_uncertainty_pp = 7.0
    races = []

    for state, inc_party, inc_running, pvi, notes in SENATE_2026_CLASS_II:
        state_lean_d = -pvi
        d_margin = state_lean_d + national_env_shift_pp_to_dem * national_env_transmission
        if inc_running:
            d_margin += incumbent_advantage_pp if inc_party == "D" else -incumbent_advantage_pp
        d_win_prob = 1.0 / (1.0 + math.exp(-d_margin / state_uncertainty_pp))
=======
def predict_state_senate(scenario_results: dict, polit: dict) -> dict:
    """Predict 2026 Senate races for each Class II seat.

    Methodology:
      For each scenario, compute projected national_environment (D-pp shift
      vs 2024 baseline), then per state:
        D_margin = state_lean + national_env + incumbent_advantage
        P(D wins) = sigmoid(D_margin / scale)
      Aggregate to majority probabilities via Monte Carlo.

    National environment input: probability-weighted projected generic ballot
    across the 4 Hormuz scenarios. We compute this here from scenario macro
    outputs (each scenario projects an approval shift → ballot shift).
    """
    # Weighted projected generic ballot D-lead for fall 2026.
    weighted_gb_dem_lead = sum(
        s["bew_2026_house"]["inputs"]["generic_ballot_dem_lead"] * s["probability_prior"]
        for s in scenario_results["scenarios"]
    )
    # Reference: 2024 House national popular vote was ~R+2.7 (Republicans won
    # the popular vote). So D+3.5 in 2026 = 6.2pp shift toward D vs 2024.
    national_2024_d_lead = -2.7
    national_env_shift_pp_to_dem = weighted_gb_dem_lead - national_2024_d_lead

    incumbent_advantage_pp = 4.0  # senate incumbency ~4-6pp (Erikson-Gronke)
    # Dampening factor: in the polarized era, national swings transmit ~70-80%
    # to state outcomes. Without this, a +6pp national env converts every
    # R+5-or-better state into a D win, which is empirically wrong.
    national_env_transmission = 0.75
    state_uncertainty_pp = 7.0  # combined polling + econ + candidate quality SE
    races = []

    for state, inc_party, inc_running, pvi, notes in SENATE_2026_CLASS_II:
        # Margin (D minus R) projected for the state, in pp:
        # Negative PVI = state leans D, so add it to D margin.
        state_lean_d = -pvi
        d_margin = state_lean_d + national_env_shift_pp_to_dem * national_env_transmission
        # Incumbent advantage benefits the defending party.
        if inc_running:
            d_margin += incumbent_advantage_pp if inc_party == "D" else -incumbent_advantage_pp
        # Win probability for D — sigmoid of margin / scale.
        d_win_prob = 1.0 / (1.0 + math.exp(-d_margin / state_uncertainty_pp))

        # Compare to current incumbent party.
>>>>>>> origin/main
        flip_prob = (1 - d_win_prob) if inc_party == "D" else d_win_prob

        races.append({
            "state": state,
            "incumbent_party": inc_party,
            "incumbent_running": inc_running,
            "pvi": pvi,
            "notes": notes,
            "projected_d_margin_pp": round(d_margin, 1),
            "d_win_prob": round(d_win_prob, 3),
            "r_win_prob": round(1 - d_win_prob, 3),
            "incumbent_holds_prob": round(1 - flip_prob, 3),
            "flip_prob": round(flip_prob, 3),
        })

<<<<<<< HEAD
    expected_d_seats = sum(r["d_win_prob"] for r in races)
    expected_r_seats = len(races) - expected_d_seats
    r_safe_holdovers = 53 - 22
    d_safe_holdovers = 47 - 11
    d_total = round(d_safe_holdovers + expected_d_seats, 1)
    r_total = round(r_safe_holdovers + expected_r_seats, 1)
    d_maj_prob = _senate_majority_prob(races, d_safe_holdovers, threshold=51)

    return {
        "national_environment_d_pp_shift_vs_2024": round(national_env_shift_pp_to_dem, 2),
        "races": races,
        "expected_seats_after_2026": {"D": d_total, "R": r_total},
        "majority_probability": {
            "D_majority_prob": d_maj_prob,
            "R_majority_prob": 1 - d_maj_prob,
        },
    }


def predict_state_senate(scenario_results: dict, polit: dict) -> dict:
    """2026 Senate prediction using the probability-weighted generic ballot
    across all Hormuz scenarios. Per-scenario senate predictions are
    computed in run_all_scenarios via _senate_for_environment()."""
    # Weighted projected generic ballot D-lead for fall 2026.
    weighted_gb_dem_lead = sum(
        s["bew_2026_house"]["inputs"]["generic_ballot_dem_lead"] * s["probability_prior"]
        for s in scenario_results["scenarios"]
    )
    senate_pred = _senate_for_environment(weighted_gb_dem_lead)
    return {
        "computed_at": datetime.utcnow().isoformat() + "Z",
        **senate_pred,
        "method_notes": [
            "PVI from Cook 2025 (approximate — verify before quoting).",
            "Incumbent advantage 4pp; 2 incumbents not running treated as toss-up.",
            "National environment derived from probability-weighted generic ballot across all 5 Hormuz scenarios.",
            "Win probabilities use logistic with scale 7pp (typical state-level forecast SE).",
            "Per-scenario Senate predictions are computed separately and stored in scenarios.json.",
=======
    # Aggregate
    expected_d_seats = sum(r["d_win_prob"] for r in races)
    expected_r_seats = len(races) - expected_d_seats
    # Plus the 33 seats not up: ~30 R safe + ~37 D safe (Class I and III not up).
    # Senate composition before 2026: R 53, D 47. Of these, 22 R and 11 D are up (Class II).
    # So R holds 53-22=31, D holds 47-11=36 going in (excluding races up for grabs).
    r_safe_holdovers = 53 - 22
    d_safe_holdovers = 47 - 11

    return {
        "computed_at": datetime.utcnow().isoformat() + "Z",
        "national_environment_d_pp_shift_vs_2024": round(national_env_shift_pp_to_dem, 2),
        "races": races,
        "expected_seats_after_2026": {
            "D": round(d_safe_holdovers + expected_d_seats, 1),
            "R": round(r_safe_holdovers + expected_r_seats, 1),
        },
        "majority_probability": {
            "D_majority_prob": _senate_majority_prob(races, d_safe_holdovers, threshold=51),
            "R_majority_prob": 1 - _senate_majority_prob(races, d_safe_holdovers, threshold=51),
        },
        "method_notes": [
            "PVI from Cook 2025 (approximate — verify before quoting).",
            "Incumbent advantage flat 3pp; 2 incumbents not running treated as toss-up.",
            "National environment derived from BEW seat change → generic ballot conversion.",
            "Win probabilities use logistic with scale 5pp (typical state-level forecast SE).",
>>>>>>> origin/main
        ],
    }


# -----------------------------------------------------------------------------
# 2026 House per-state projection
# -----------------------------------------------------------------------------
# 2024 baseline House delegation per state (119th Congress, post-2024 elections).
# Format: state → (D_seats, R_seats). Approximate; refine if needed.
US_HOUSE_2024 = {
    "AL": (1, 6),  "AK": (0, 1),  "AZ": (3, 6),  "AR": (0, 4),  "CA": (43, 9),
    "CO": (5, 3),  "CT": (5, 0),  "DE": (1, 0),  "FL": (8, 20), "GA": (5, 9),
    "HI": (2, 0),  "ID": (0, 2),  "IL": (14, 3), "IN": (2, 7),  "IA": (0, 4),
    "KS": (1, 3),  "KY": (1, 5),  "LA": (1, 5),  "ME": (2, 0),  "MD": (7, 1),
    "MA": (9, 0),  "MI": (7, 6),  "MN": (4, 4),  "MS": (1, 3),  "MO": (2, 6),
    "MT": (0, 2),  "NE": (0, 3),  "NV": (3, 1),  "NH": (2, 0),  "NJ": (9, 3),
    "NM": (3, 0),  "NY": (19, 7), "NC": (4, 10), "ND": (0, 1),  "OH": (5, 10),
    "OK": (0, 5),  "OR": (5, 1),  "PA": (8, 9),  "RI": (2, 0),  "SC": (1, 6),
    "SD": (0, 1),  "TN": (1, 8),  "TX": (13, 25),"UT": (0, 4),  "VT": (1, 0),
    "VA": (6, 5),  "WA": (8, 2),  "WV": (0, 2),  "WI": (2, 6),  "WY": (0, 1),
}

# Cook PVI per state (averaged across districts; source: Cook 2025).
# Negative = D-leaning, positive = R-leaning.
US_STATE_PVI = {
    "AL": 15, "AK": 8,  "AZ": 2,  "AR": 16, "CA": -13, "CO": -3, "CT": -7, "DE": -5,
    "FL": 3,  "GA": 3,  "HI": -14, "ID": 18, "IL": -7, "IN": 11, "IA": 6,  "KS": 10,
    "KY": 15, "LA": 12, "ME": -2, "MD": -14, "MA": -15, "MI": -1, "MN": -1, "MS": 11,
    "MO": 10, "MT": 11, "NE": 13, "NV": -1, "NH": -1, "NJ": -6, "NM": -3, "NY": -10,
    "NC": 3,  "ND": 20, "OH": 6,  "OK": 17, "OR": -6, "PA": 2,  "RI": -8, "SC": 8,
    "SD": 16, "TN": 14, "TX": 5,  "UT": 13, "VT": -16, "VA": -3, "WA": -8, "WV": 22,
    "WI": 2,  "WY": 25,
}


def predict_state_house(scenario_results: dict, polit: dict) -> dict:
    """2026 House projection per state.

    Method: project national environment shift onto each state, dampened by
    polarization. Each district is approximated as state PVI (we don't have
    district-level data). Compute expected D delegation per state.

    Limitations (declared honestly):
      - District-level forecast requires Cook PVI per district + candidate
        quality + incumbency. We don't have that data.
      - This produces state-level summary suitable for the map; not for
        district-by-district predictions.
    """
    weighted_gb_dem_lead = sum(
        s["bew_2026_house"]["inputs"]["generic_ballot_dem_lead"] * s["probability_prior"]
        for s in scenario_results["scenarios"]
    )
    national_2024_d_lead = -2.7  # 2024 national House popular vote: R+2.7
    national_env_d_shift = weighted_gb_dem_lead - national_2024_d_lead

    # Target total D seat gain = BEW national prediction (in-party loses N → D
    # gains N). We distribute this across states proportional to each state's
    # "competitive capacity" — competitive states absorb most of the swing.
    bew_in_party_seat_change = scenario_results["weighted_summary"]["2026_in_party_seat_change"]
    target_d_total_swing = -bew_in_party_seat_change  # in-party (R) loses → D gains

    # Per-state competitive weight: states with low |PVI| and many seats absorb more.
    # weight = sqrt(seats) / (1 + |PVI|/6)
    weights = {}
    for state, (d_2024, r_2024) in US_HOUSE_2024.items():
        total_seats = d_2024 + r_2024
        pvi = US_STATE_PVI.get(state, 0)
        weights[state] = (total_seats ** 0.5) / (1 + abs(pvi) / 6)
    total_weight = sum(weights.values())

    states = []
    total_2024 = {"D": 0, "R": 0}
    total_proj = {"D": 0.0, "R": 0.0}

    for state, (d_2024, r_2024) in US_HOUSE_2024.items():
        total_seats = d_2024 + r_2024
        pvi = US_STATE_PVI.get(state, 0)
        # State swing scaled so totals sum to target.
        seat_swing = target_d_total_swing * (weights[state] / total_weight)
        # Cap by available R seats to flip (can't gain more than R holds).
        seat_swing = max(-d_2024, min(r_2024, seat_swing))

        d_proj = d_2024 + seat_swing
        r_proj = total_seats - d_proj

        is_competitive = abs(seat_swing) >= 0.3 or (0 < d_2024 < total_seats and abs(pvi) <= 8)

        states.append({
            "state": state,
            "total_seats": total_seats,
            "pvi": pvi,
            "d_2024": d_2024,
            "r_2024": r_2024,
            "d_2026_proj": round(d_proj, 1),
            "r_2026_proj": round(r_proj, 1),
            "expected_d_seat_change": round(seat_swing, 1),
            "is_competitive": is_competitive,
        })
        total_2024["D"] += d_2024
        total_2024["R"] += r_2024
        total_proj["D"] += d_proj
        total_proj["R"] += r_proj

    return {
        "computed_at": datetime.utcnow().isoformat() + "Z",
        "national_env_d_shift_pp": round(national_env_d_shift, 2),
        "states": states,
        "totals_2024": total_2024,
        "totals_2026_projected": {
            "D": round(total_proj["D"], 1),
            "R": round(total_proj["R"], 1),
        },
        "net_d_seat_change": round(total_proj["D"] - total_2024["D"], 1),
        "majority_threshold": 218,
        "method_notes": [
            "STATE-LEVEL ESTIMATE ONLY. District-level forecast requires Cook PVI per district.",
            "Per-state swing = national_env_shift × responsiveness(PVI, seats).",
            "Responsiveness: competitive states (|PVI|≤5) move 0.20·sqrt(seats) per pp; safe states barely move.",
            "2028 House: not modeled (post-2030 census redistricting reshapes the map).",
        ],
    }


def _senate_majority_prob(races: list, d_safe: int, threshold: int = 51,
                          n_simulations: int = 5000) -> float:
    """Monte Carlo estimate of P(D >= threshold seats) given race-level probs."""
    import random
    rng = random.Random(20260508)  # deterministic seed
    successes = 0
    for _ in range(n_simulations):
        d_wins = sum(1 for r in races if rng.random() < r["d_win_prob"])
        total_d = d_safe + d_wins
        if total_d >= threshold:
            successes += 1
    return round(successes / n_simulations, 3)


# -----------------------------------------------------------------------------
# Top-level orchestrator — called by run_all.py
# -----------------------------------------------------------------------------

def run() -> dict:
    """Compute all election outputs and write JSON files."""
    fred = _load_json("fred_indicators.json")
    polit = _load_json("political_inputs.json")

    if not fred.get("series"):
        logger.warning("No FRED data; election models cannot run")
        return {"_meta": {"status": "skipped", "reason": "no fred data"}}

    transmission = compute_transmission_state(fred, polit)
    with open(ELECTION_DIR / "transmission_state.json", "w") as f:
        json.dump(transmission, f, indent=2)

    scenarios = run_all_scenarios(transmission, polit)
    with open(ELECTION_DIR / "scenarios.json", "w") as f:
        json.dump(scenarios, f, indent=2)

    senate = predict_state_senate(scenarios, polit)
    with open(ELECTION_DIR / "senate_2026.json", "w") as f:
        json.dump(senate, f, indent=2)

    house = predict_state_house(scenarios, polit)
    with open(ELECTION_DIR / "house_2026.json", "w") as f:
        json.dump(house, f, indent=2)

    # Top-line summary for UI
    ws = scenarios["weighted_summary"]
    summary = {
        "computed_at": datetime.utcnow().isoformat() + "Z",
        "transmission_max_pressure": max(
            (c["pressure"] or 0) for c in transmission["chain"]
        ),
        "scenarios_2028_range": {
            "min_R_pct_ensemble": min(s["ensemble_2028"]["incumbent_two_party_pct"] for s in scenarios["scenarios"]),
            "max_R_pct_ensemble": max(s["ensemble_2028"]["incumbent_two_party_pct"] for s in scenarios["scenarios"]),
            "weighted_R_pct_fair":       ws["2028_R_two_party_fair"],
            "weighted_R_pct_hibbs":      ws["2028_R_two_party_hibbs"],
            "weighted_R_pct_abramowitz": ws["2028_R_two_party_abramowitz"],
            "weighted_R_pct_ensemble":   ws["2028_R_two_party_ensemble"],
            "weighted_R_pct": ws["2028_incumbent_two_party_pct"],  # legacy alias
        },
        "scenarios_2026_house_range": {
            "min_R_seat_change": min(s["bew_2026_house"]["in_party_seat_change"] for s in scenarios["scenarios"]),
            "max_R_seat_change": max(s["bew_2026_house"]["in_party_seat_change"] for s in scenarios["scenarios"]),
            "weighted_R_seat_change": ws["2026_in_party_seat_change"],
        },
        "senate_2026_majority_probs": senate["majority_probability"],
        "model_disagreement": {
            "fair_minus_hibbs": round(ws["2028_R_two_party_fair"] - ws["2028_R_two_party_hibbs"], 2),
            "fair_minus_abramowitz": round(ws["2028_R_two_party_fair"] - ws["2028_R_two_party_abramowitz"], 2),
            "interpretation": "Large gaps signal that perception/data divergence is driving model uncertainty (1992 Bush 41 mode).",
        },
    }
    with open(ELECTION_DIR / "forecast_summary.json", "w") as f:
        json.dump(summary, f, indent=2)

    logger.info(f"Election models computed. Summary: {json.dumps(summary, indent=2)}")
    return summary


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
    run()
