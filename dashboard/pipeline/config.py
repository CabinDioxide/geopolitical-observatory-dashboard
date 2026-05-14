"""
Pipeline configuration — API keys, endpoints, constants.
"""
import os
from pathlib import Path

# --- Paths ---
BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
CONFLICTS_DIR = DATA_DIR / "conflicts"
MARITIME_DIR = DATA_DIR / "maritime"
BASES_DIR = DATA_DIR / "bases"
TRADE_DIR = DATA_DIR / "trade"
ELECTION_DIR = DATA_DIR / "election"
META_DIR = DATA_DIR / "_meta"
LOG_DIR = BASE_DIR / "logs"

# --- FRED API (St. Louis Fed) ---
# Register for free key at https://fred.stlouisfed.org/docs/api/api_key.html
# Set env var: FRED_API_KEY
# Rate limit: 120 req/min — well above our needs.
# We use FRED as the master source for macro indicators because it federates
# BLS (CPI), BEA (income/GDP), EIA (oil), Michigan (sentiment) under one auth.
FRED_API_KEY = os.environ.get("FRED_API_KEY", "")
FRED_BASE = "https://api.stlouisfed.org/fred"

# Series we pull. Keep this list focused — every series adds an API call.
FRED_SERIES = {
    # --- Energy (the shock origin) ---
    "DCOILBRENTEU": {"name": "Brent crude (USD/bbl)", "freq": "daily", "tier": 1},
    "DCOILWTICO":   {"name": "WTI crude (USD/bbl)",   "freq": "daily", "tier": 1},
    "GASREGW":      {"name": "US retail gasoline (USD/gal)", "freq": "weekly", "tier": 2},
    # NOTE: SPR weekly stocks (WCESTUS1/WCRSTUS1) is NOT on FRED — it's
    # EIA-only. Phase 2 will add a direct EIA pull. For now SPR shows as
    # no-data on the transmission chain.
    # --- Inflation transmission ---
    "CPIAUCSL":     {"name": "CPI all items (SA)",    "freq": "monthly", "tier": 2},
    "CPILFESL":     {"name": "Core CPI (SA)",         "freq": "monthly", "tier": 2},
    "CPIENGSL":     {"name": "CPI energy (SA)",       "freq": "monthly", "tier": 2},
    # --- Income / growth ---
    "DSPIC96":      {"name": "Real disposable personal income (SAAR)", "freq": "monthly", "tier": 3},
    "A229RX0":      {"name": "Real DPI per capita",   "freq": "monthly", "tier": 3},
    "GDPC1":        {"name": "Real GDP (SAAR)",       "freq": "quarterly", "tier": 3},
    # --- Labor (the second sociotropic basement variable; missing from V3) ---
    # 1982 / 2010 midterms had low inflation but high unemployment — the chain
    # was blind to those scenarios until this was added.
    "UNRATE":       {"name": "Unemployment rate (U-3, %)", "freq": "monthly", "tier": 3},
    "PAYEMS":       {"name": "Total nonfarm payrolls (thousands)", "freq": "monthly", "tier": 3},
    # --- Perception ---
    "UMCSENT":      {"name": "Michigan consumer sentiment", "freq": "monthly", "tier": 3},
    "MICH":         {"name": "Michigan 1y inflation expectation", "freq": "monthly", "tier": 3},
    # --- Uncertainty / news sentiment ---
    "USEPUINDXD":   {"name": "Economic Policy Uncertainty (daily)", "freq": "daily", "tier": 4},
}

# --- SF Fed Daily News Sentiment Index ---
# Direct Excel download, no auth.
SF_FED_DNSI_URL = "https://www.frbsf.org/economic-research/files/news_sentiment_data.xlsx"

# --- Polling aggregator (Silver Bulletin / 538 historical) ---
# Silver Bulletin doesn't publish a raw CSV; we use 538's historical archive for
# pre-2024 calibration and parse RealClearPolitics for current trends.
RCP_APPROVAL_URL = "https://www.realclearpolling.com/polls/approval/donald-trump/approval"
RCP_GENERIC_BALLOT_URL = "https://www.realclearpolling.com/polls/generic-congressional-vote"

# --- Election model parameters ---
# Fair vote equation coefficients (approximate, from fairmodel.econ.yale.edu
# 2024 update). Re-estimated each cycle; check website for refresh.
FAIR_COEFFS = {
    "alpha":   47.42,   # intercept
    "beta_g":   0.667,  # G: real per-capita GDP growth in election-year Q1-Q3 (annualized)
    "beta_p":  -0.690,  # P: |GDP deflator growth over admin's first 15 quarters| (annualized)
    "beta_z":   0.984,  # Z: # of "good news quarters" (real per-capita growth >3.2% annualized)
    "beta_dper": 3.41,  # DPER: incumbent personally running (+1 D, -1 R, 0 open)
    "beta_dur": -3.46,  # DUR: term penalty (0 first, 1.0 second, 1.25 third...)
    "beta_i":  -0.105,  # I: party dummy (small)
    "beta_war": 5.20,   # WAR: WWII/Korea era only (0 for our period)
    "rmse":     2.50,   # out-of-sample RMSE on two-party share (national)
}

# Bafumi-Erikson-Wlezien midterm House model (simplified).
# Predicted in-party seat change = a + b1*(generic_ballot - 50) + b2*(approval - 50).
BEW_COEFFS = {
    "alpha":   -22.0,   # baseline midterm penalty (in-party loses ~22 seats average)
    "beta_gb":   3.5,   # each pp of generic-ballot lead → ~3.5 seats
    "beta_app":  0.4,   # each pp of approval above 50 → ~0.4 seats
    "rmse":     12.0,   # seat-count RMSE
}

# Hibbs Bread & Peace model (Hibbs 2008 update).
# V_inc = α + β·R + γ·CUMFATALITIES
# where R = exponentially weighted real per-capita disposable income growth over
# the administration's 15 quarters; weight λ controls memory decay.
HIBBS_COEFFS = {
    "alpha":     46.10,  # intercept (incumbent two-party vote when R=0, no war)
    "beta_r":     3.49,  # each pp of weighted real DPI growth → +3.5pp incumbent vote
    "gamma_war":-0.00355,# per US military fatality (cumulative). 0 for our period.
    "lambda":     0.915, # quarterly decay weight for the income variable
    "rmse":       1.85,  # historical RMSE on national two-party vote (1952-2012)
}

# Abramowitz Time for Change model.
# V_inc = α + β1·G + β2·NETAPP + β3·TERM2
# where G = Q2 election-year real GDP growth (annualized %), NETAPP = sitting
# president's net approval in late June, TERM2 = 1 if incumbent party in office
# 2+ consecutive terms, 0 otherwise.
ABRAMOWITZ_COEFFS = {
    "alpha":    51.40,
    "beta_g":    0.108,
    "beta_app":  0.642,
    "beta_t2": -4.000,
    "rmse":      1.90,
}

# Lewis-Beck-Tien sociotropic vote function (simplified misery-index form).
# Adds the labor + price-level dimension that Fair/Hibbs/Abramowitz miss
# when growth and income smooth over the actual unemployment / inflation
# levels voters experience. Captures 1982/2010-type scenarios where
# unemployment dominates and pocketbook models underperform.
#
# V_inc = α - β_misery · (UNRATE + CPI_YoY)
#
# [CALIBRATION_PENDING]: priors below are anchored on two historical
# points — 1980 (UNRATE 7.5 + CPI 13.5 = misery 21, Carter 44.7%) and
# 2010 (UNRATE 9.6 + CPI 1.6 = misery 11.2, Dem ~46% national 2-party).
# Solving the two-equation system yields roughly α=53, β=0.85. Treat as
# preliminary until a full 1948-2020 OLS re-estimation lands (see B3 TODO).
LEWIS_BECK_COEFFS = {
    "alpha":         53.0,
    "beta_misery":   0.85,    # [CALIBRATION_PENDING] re-estimate on 1948-2020
    "rmse":          2.50,    # placeholder pending backtest
}

# Ensemble model weights — inverse-RMSE weighting, PollyVote style.
# Higher RMSE → lower weight in the ensemble (the model is less reliable).
# Computed at runtime from the three RMSEs above.

# Hormuz scenario definitions — calibrated to actual May 2026 state.
# Brent peaks come from JPM/GS analyst ranges + 1990 Gulf War / 2022 RU-UA precedent.
# Probabilities sum to 1.0; assigned by current ceasefire fragility + US military posture.
HORMUZ_SCENARIOS = {
    "A_easing": {
        "label": "停火持稳，霍尔木兹分阶段重开",
        "brent_peak_q3_2026": 85,
        "brent_avg_to_election": 82,
        "duration_months": 1,
        "probability_prior": 0.25,
    },
    "B_drag": {
        "label": "间歇性中断到秋季（基线）",
        "brent_peak_q3_2026": 110,
        "brent_avg_to_election": 100,
        "duration_months": 4,
        "probability_prior": 0.35,
    },
    "C_reescalation": {
        "label": "停火崩溃，第二轮封锁",
        "brent_peak_q3_2026": 145,
        "brent_avg_to_election": 120,
        "duration_months": 5,
        "probability_prior": 0.20,
    },
    "D_us_control": {
        "label": "美军直接控制海峡 / 强力护航",
        "brent_peak_q3_2026": 105,    # 短期推高，但护航后回落
        "brent_avg_to_election": 90,  # 油价相对稳定，但有持续溢价
        "duration_months": 12,         # 军事部署长期化
        "probability_prior": 0.15,
        # Rally 校准：历史区间 5-35pp（Bush 41 Desert Storm +24, Bush 43 9/11 +35,
        # Carter 伊朗人质 +18）。"成功护航"小于全面战争胜利，取中位 +8pp。
        "rally_effect_pp": 8,
        # 伤亡累积：长期军事部署，Hibbs WAR 项激活。Bush 41 海湾战争 ~150 死，
        # 长期阿富汗 ~2400 死。护航行动伤亡通常较低，估 -3pp 长期拖累。
        "casualty_drag_pp": -3,
    },
    "E_total_war": {
        "label": "演变为地区全面战争",
        "brent_peak_q3_2026": 200,
        "brent_avg_to_election": 165,
        "duration_months": 8,
        "probability_prior": 0.05,
    },
}

# Transmission elasticities (calibrated from 1980 Iran-Iraq, 1990 Gulf War,
# 2008 oil peak, 2022 Russia-Ukraine event studies).
# Format: dY/dX, where X is the upstream variable.
TRANSMISSION_ELASTICITIES = {
    "brent_to_gasoline_usd_per_gal_per_dollar_bbl": 0.025,  # $1/bbl → $0.025/gal
    "gasoline_to_headline_cpi_pp_per_dollar_gal":   0.85,   # $1/gal → 0.85pp CPI YoY
    "oil_shock_to_real_gdp_growth_pp_per_50pct":   -1.4,    # 50% sustained shock → -1.4pp growth
    "cpi_to_michigan_ics_per_pp":                  -3.2,    # 1pp CPI → -3.2 ICS pts
    "ics_to_approval_pp_per_10_ics":               -1.1,    # -10 ICS → -1.1pp approval
}

# --- Tariff channel (the *internally-attributable* inflation shock) ---
# Trump-2 effective avg tariff peaked at ~22% in April 2025 (reciprocal +
# 145% on China), then negotiated down to ~13.5% by May 2026. This is
# fundamentally different from an oil shock: it is endogenous to the
# incumbent's policy, so voter attribution flows directly to the president
# (Trump-1 2018-19 tariffs were already partly priced into 2020 voter
# perception). The 9-step Hormuz chain models oil as exogenous; this
# parallel channel models tariffs.
#
# Pre-Trump-2 baseline: ~2.5% trade-weighted MFN tariff.
# Passthrough elasticity: Cavallo et al (2021) found near-complete (~95%)
# passthrough to retail prices in 2018-19 Trump-1 study; Amiti-Redding-
# Weinstein (2020) similar. But Trump-2 is broader/larger and faces more
# margin absorption + FX adjustment, so we use a conservative passthrough
# to headline CPI level of 0.10pp per pp of tariff rate increase.
TARIFF_AVG_RATE          = 0.135   # May 2026 effective rate [INFERENCE: news consensus]
TARIFF_PRE_2025_RATE     = 0.025   # pre-Trump-2 baseline
TARIFF_TO_CPI_PP_PER_PP  = 0.10    # passthrough to headline CPI (conservative)
# Tariff scenarios for sensitivity analysis (not yet wired into ensemble run).
TARIFF_SCENARIOS = {
    "rollback":   {"rate": 0.050, "label": "贸易和解，关税回到 5%"},
    "current":    {"rate": 0.135, "label": "维持当前 13.5%（基线）"},
    "escalation": {"rate": 0.220, "label": "再次升级到 22%（4 月峰值水平）"},
}

# --- GDELT GEO 2.0 API ---
# No API key required
GDELT_GEO_ENDPOINT = "https://api.gdeltproject.org/api/v2/geo/geo"
GDELT_QUERIES = [
    "conflict OR airstrike OR shelling OR missile",
    "military clash OR battle OR firefight",
    "explosion OR bombing OR attack",
]
GDELT_MAX_RECORDS = 2500  # per query

# --- ACLED API (2026 OAuth) ---
# Register at https://acleddata.com (myACLED account)
# Set env vars: ACLED_USERNAME, ACLED_PASSWORD
# OAuth token endpoint: https://acleddata.com/oauth/token
# API base: https://acleddata.com/api/acled
ACLED_DAYS_BACK = 30  # fetch last N days

# --- Event type color mapping ---
EVENT_COLORS = {
    "Battles": "#e63946",
    "Explosions/Remote violence": "#f4a261",
    "Violence against civilians": "#9b2226",
    "Strategic developments": "#457b9d",
    "Protests": "#2a9d8f",
    "Riots": "#e9c46a",
    # GDELT
    "ASSAULT": "#e63946",
    "FIGHT": "#e63946",
    "KILL": "#9b2226",
    "COERCE": "#f4a261",
    "PROTEST": "#2a9d8f",
    "default": "#6c757d",
}
