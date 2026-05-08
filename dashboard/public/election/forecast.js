// Election forecast dashboard — fetches JSON outputs from pipeline and renders.

// --- i18n ---
const I18N = {
  zh: {
    'header.title': '霍尔木兹冲击 → 美国大选追踪盘',
    'header.sub': '2026 中期 + 2028 总统 · 传导链 · 5 种情形的推演 · 美国地图 · 历史对照',
    'header.back_map': '← 主图',
    'header.back_reports': '📊 分析报告',
    'tab.chain': '① 传导链',
    'tab.scenarios': '② 5 种情形的推演',
    'tab.senate': '③ 美国地图',
    'tab.overlay': '④ 历史对照',
    'tab.methodology': '⑤ 方法论',
    // Tab 1
    'chain.title': '传导链：从油价到选票的九个观测点',
    'chain.intro1': '霍尔木兹封锁通过九个步骤传导至选举结果。每一格显示当前值、基线（中性水平）、告警（5pp 选票损失对应水平）。每条 bar 分三段彩色区间——指针落在哪一段，直接读出风险级别：',
    'chain.intro2': '<span class="tag-inline" style="background:#2a9d8f; color:#fff;">上游</span>（绿，0–33）该指标处于安全区间，风险尚未传导到下一环节；<span class="tag-inline" style="background:#f4a261; color:#fff;">中游</span>（橙，33–66）指标正在恶化，下游将开始受影响；<span class="tag-inline" style="background:#e63946; color:#fff;">下游</span>（红，66–100）指标接近或突破告警，对选票已构成直接威胁。',
    'chain.intro3': '<b>告警的统一定义</b>：每个指标的告警阈值都对应"该指标单独达到此水平时，历史上执政党在下次选举损失 ≥5pp 两党票"。',
    'chain.zone_upstream': '上游', 'chain.zone_mid': '中游', 'chain.zone_down': '下游',
    'chain.epu_label': 'EPU 经济政策不确定性',
    'chain.updated_label': '最近更新',
    // Tab 2
    'scen.title': '5 种情形的推演：霍尔木兹未来走向对 2026 中期 + 2028 大选的影响',
    'scen.intro1': '每种霍尔木兹未来走向通过传导链产生不同的宏观结果（油价、通胀、收入、信心、支持率），再带入 4 个学术模型输出选举结果。下方每张卡片展示一个情形的<b>选举含义</b>：共和党在 2026 中期会失多少席位、控不控得住众议院；2028 大选会输多少（或赢多少）。带宽为 ±2·均方根误差（RMSE，95% 置信区间）。',
    'scen.intro2': '<b>预测模型说明</b>：2026 中期参议院使用 PVI + 国家环境的 logistic 州层模型 + 蒙特卡洛多数概率；2026 中期众议院使用 Bafumi-Erikson-Wlezien 模型；2028 总统大选取三个独立模型（Fair Vote Equation、Hibbs 面包与和平、Abramowitz Time-for-Change）的反向 RMSE 加权集合预测。各模型公式与选择理由见⑤方法论页。',
    'scen.senate_caveat': '<b>⚠️ 关于参议院预测的诚实说明</b>：2026 参议院 Class II 改选结构对民主党极不友好——22 个共和党席位防守 vs 11 个民主党席位。即便霍尔木兹冲击大幅恶化政治环境，民主党最多净增 2-4 席。<br><br><b>各情景的差异主要体现在两个维度</b>：(1) 油价/通胀传导对选民信心的影响（A 缓解 → E 全面战争 共和党两党票从 49.7% 下降到 44.7%）；(2) 美军直接介入（情景 D）触发"军事胜利 rally + 长期伤亡拖累"双重效应——短期参议院多数概率从 60% 降至 53%（rally 拉高支持率有利共和党守 ME/NC 等关键席位），但 2028 总统大选 rally 完全衰减后 (Mueller 1973 半衰期 ~6 个月)，伤亡累积反而把支持率拖到 -16，反不如其他情景。这是 1991 老布什"沙漠风暴 89% 支持率 → 18 个月后 34%"的镜像。',
    'scen.table_h': '各情景下的政治结果对比表',
    'scen.table_desc': '下表按情景列出宏观传导结果（油价/增长/通胀/信心/支持率）与最终选举预测（2028 共和党两党票集合预测、2026 共和党众院净增减席位）。最后一行是按各情景先验概率的加权汇总。',
    'scen.scenario_label': '情景',
    'scen.prior_prob': '先验概率',
    'scen.macro_summary': '油价均值 ${brent}/桶 · 通胀峰 ${cpi}% · 信心 ${ics}',
    'scen.senate_h': '2026 中期参议院',
    'scen.senate_d_gain': '民主党净增 {n} 席',
    'scen.senate_d_loss': '民主党净失 {n} 席',
    'scen.senate_no_change': '民主党席位变化不显著',
    'scen.senate_d_flip': '民主党翻转参议院',
    'scen.senate_r_hold': '共和党守住参议院',
    'scen.d_majority_prob': '民主党多数概率',
    'scen.midterm_h': '2026 中期众议院',
    'scen.party_loses_seats': '共和党失 {n} 席',
    'scen.party_gains_seats': '共和党增 {n} 席',
    'scen.house_flip': '众议院翻转给民主党',
    'scen.house_hold': '共和党守住众议院',
    'scen.flip_prob': '翻转概率',
    'scen.presidential_h': '2028 总统大选',
    'scen.party_wins': '共和党赢 {n}pp',
    'scen.party_loses': '共和党输 {n}pp',
    'scen.two_party_pred': '两党票预测',
    'scen.win_rate': '胜率',
    'scen.col_brent': '布伦特原油 (Brent)',
    'scen.col_growth': '增长率 (G %)',
    'scen.col_inflation': '任期通胀 (P %)',
    'scen.col_z': '好消息季度 (Z)',
    'scen.col_ics': '消费者信心 (ICS)',
    'scen.col_approval': '净支持率',
    'scen.col_seat_change': '2026 共和党席位变化',
    'scen.col_ensemble': '集合 2028',
    'scen.weighted': '加权',
    'scen.weighted_desc': '按 5 种情形的先验概率加权',
    // Tab 3
    'map.title': '2026 美国地图：参议院 + 众议院预测',
    'map.intro': '各州预测结果以颜色编码呈现。点击州可查看详情面板。2028 大选与众议院因数据不足（候选人未定 + 2030 重新划区）暂不做严肃预测；2028 参议院 Class III 33 席位仅作地图示意。',
    'map.ctrl_label': '看哪个：',
    'map.layer_senate2026': '2026 参议院（33 席）',
    'map.layer_house2026': '2026 众议院（435 席州层估算）',
    'map.layer_senate2028': '2028 参议院（示意，缺数据）',
    'map.layer_house2028': '2028 众议院（不做）',
    'map.click_state': '点地图上的州看详情',
    'map.d_majority_prob': 'D 拿到参议院多数概率',
    'map.expected_seats': 'D / R 总席位预期',
    'map.nat_env': '国家环境 vs 2024（D 方向）',
    'map.house_d_r': 'D / R 众议院席位预测',
    'map.net_d_change': 'D 净增席位',
    'map.majority_party': '多数党（>218 席）',
    'map.house_d_controls': 'D 控众议院',
    'map.house_r_controls': 'R 控众议院',
    'map.no_data': '缺数据',
    'map.candidates_undefined': '2028 候选人未定，无可信预测',
    'map.class3_seats': 'Class III 席位（地图灰色标注）',
    'map.earliest_serious': '最早可做严肃预测的时间',
    'map.detail_2026senate': '2026 参议院',
    'map.detail_2026house': '2026 众议院（州层估算）',
    'map.detail_2024_dr': '2024 D / R',
    'map.detail_2026_proj': '2026 D / R 预测',
    'map.detail_dchange': 'D 净增席位',
    'map.detail_inc_party': '现任党',
    'map.detail_pvi': 'PVI',
    'map.detail_d_margin': 'D margin 预测',
    'map.detail_d_winrate': 'D 胜率',
    'map.detail_flip_prob': '翻盘概率',
    'map.no_class2': '2026 参议院：本州本届无 Class II 改选',
    'map.note_2028': '<b>2028 大选注意：</b> 候选人 / 提名 / 经济条件均未确定。Class III 改选预测需要 2028 春季的 Cook PVI 更新和初选数据，目前 dashboard 只能给地图示意，不做严肃预测。',
    // Tab 4
    'ovl.title': '历史对照：2026 与四次历史石油-政治危机的全面比较',
    'ovl.intro1': '过去 50 年里，美国执政党遭遇过四次显著的能源/政治冲击：1980 伊朗革命+两伊战争、1990 海湾战争、2008 油价峰值、2022 俄乌战争。这四次事件均提供了"地缘政治冲击 → 油价 → 通胀 → 选民感知 → 选举结果"的完整案例。本节将四次事件按 <b>t=0</b>（事件起点）对齐，与当前 2026 危机进行直接同期比较。',
    'ovl.intro2': '阅读建议：先看顶部"同期对比卡"了解 2026 的相对位置；再看"指标对比图"观察各危机的演化轨迹；最后看"事件详情"了解每次危机的完整背景与最终政治后果。',
    'ovl.sec1': '第一部分：t=2（事件起点后 2 个月）的同期对比',
    'ovl.sec1_desc': '2026 危机起点为 2026-02-28（美以空袭伊朗），当前 t=2 对应 2026-04。下方卡片显示同样 t=2 时各次历史危机的指标读数与最终政治结果，便于直接判断 2026 的相对严重程度。',
    'ovl.sec2': '第二部分：指标对比图（按月对齐 t=0 至 t=33）',
    'ovl.sec2_desc': '五条颜色线分别代表 1980/1990/2008/2022 四次历史危机轨迹 + 2026 当前危机轨迹（黑色加粗线，已观测 t=0 至 t=3 共 4 个数据点）。X 轴是事件起点后的月数，Y 轴是所选指标。红色虚线标记 2026 中期选举（t=8）和 2028 大选（t=33）的位置——可以直接读出"在那个时间点，历史上各次危机的指标处于什么位置，2026 的轨迹延伸到哪里会和哪条历史线接近"。',
    'ovl.sec3': '第三部分：核心结论 — 2026 在四次危机中的相对位置',
    'ovl.sec4': '第四部分：四次历史危机详情',
    'ovl.sec4_desc': '每张卡片包含一次危机的完整背景、关键宏观数据（油价/汽油/CPI/ICS/支持率）、最终政治结果，以及对当前 2026 危机的具体启示。这些案例是模型传导弹性参数的校准来源。',
    'ovl.sec5': '第五部分：四次危机的逐月详细数据表（点击展开）',
    'ovl.sec5_desc': '每次危机的全部月度指标。点击事件名称展开。',
    'ovl.metric_label': '选择指标：',
    'ovl.metric_ics': '密歇根大学消费者信心 (ICS)',
    'ovl.metric_cpi': '消费者价格指数 (CPI) 同比',
    'ovl.metric_brent': '布伦特原油',
    'ovl.metric_approval': '总统净支持率',
    'ovl.metric_gas': '汽油价格',
    'ovl.crisis_outcomes_label': '本次危机后的选举结果',
    'ovl.lessons_label': '对当下霍尔木兹危机的启示',
    'ovl.event_period': '事件期',
    // Tab 5
    'meth.title': '方法论说明',
    'meth.intro': '本 dashboard 的核心任务是将地缘政治冲击（霍尔木兹海峡封锁）通过宏观与政治传导链转换为美国选举结果预测。下文逐项说明所用模型、选择理由、历史预测准确度、传导链结构与数据来源。',
    // Tab 3 collapsibles
    'map.senate_full_table': '参议院全部 33 席原始表格（按竞争度排序）',
    'map.house_full_table': '众议院各州预测表（按 D 净增席位排序）',
    // Senate / House table headers
    'senate.col_state': '州', 'senate.col_inc': '现任', 'senate.col_pvi': '党派投票指数 (PVI)', 'senate.col_dmargin': '民主党优势 (pp)', 'senate.col_winbar': '胜率条', 'senate.col_dwin': '民主党胜率', 'senate.col_flip': '翻盘概率', 'senate.col_notes': '备注',
    'house.col_state': '州', 'house.col_pvi': '党派投票指数 (PVI)', 'house.col_total': '总席', 'house.col_2024': '2024 D/R', 'house.col_2026': '2026 D/R 预测', 'house.col_dchange': 'D 净增',
    // Tab 4 chart axis label
    'ovl.chart_xlabel': '月数（自危机起点）',
    'ovl.chart_midterm_marker': '2026 中期',
    'ovl.chart_pres_marker': '2028 大选',
    'ovl.chart_now_label': '2026 当下',
    // 2026 today outcome pending
    'ovl.outcome_pending': '进行中：距 2026 中期 8 个月，距 2028 大选 33 个月',
    'ovl.event_2026_today_label': '2026 当下（进行中）',
  },
  en: {
    'header.title': 'Hormuz Shock → US Election Tracker',
    'header.sub': '2026 Midterms + 2028 Presidential · Transmission chain · 5 scenario walk-throughs · US map · Historical comparison',
    'header.back_map': '← Map',
    'header.back_reports': '📊 Reports',
    'tab.chain': '① Transmission Chain',
    'tab.scenarios': '② 5 Scenario Walk-throughs',
    'tab.senate': '③ US Map',
    'tab.overlay': '④ Historical Comparison',
    'tab.methodology': '⑤ Methodology',
    // Tab 1
    'chain.title': 'Transmission Chain: From Oil Prices to Votes via Nine Observation Points',
    'chain.intro1': 'A Hormuz blockade reaches election outcomes through nine steps. Each cell shows the current value, baseline (neutral level), and alarm (level associated with a 5pp two-party vote loss). Each bar is divided into three colored zones — where the pointer falls tells you the risk level:',
    'chain.intro2': '<span class="tag-inline" style="background:#2a9d8f; color:#fff;">Upstream</span> (green, 0–33) safe zone, risk has not propagated to the next link; <span class="tag-inline" style="background:#f4a261; color:#fff;">Midstream</span> (orange, 33–66) deteriorating, downstream beginning to react; <span class="tag-inline" style="background:#e63946; color:#fff;">Downstream</span> (red, 66–100) approaching or breaching alarm — direct threat to the in-party vote.',
    'chain.intro3': '<b>Unified alarm definition</b>: each indicator\'s alarm corresponds to "the level at which this indicator alone has historically been associated with the in-party losing ≥5pp two-party vote in the next election."',
    'chain.zone_upstream': 'Upstream', 'chain.zone_mid': 'Midstream', 'chain.zone_down': 'Downstream',
    'chain.epu_label': 'EPU (Economic Policy Uncertainty)',
    'chain.updated_label': 'Last update',
    // Tab 2
    'scen.title': '5 Scenario Walk-throughs: How Hormuz Trajectories Affect 2026 Midterms + 2028 Presidential',
    'scen.intro1': 'Each Hormuz future propagates through the transmission chain producing different macro outcomes (oil prices, inflation, income, sentiment, approval), then runs through 4 academic models for electoral output. Each card below shows a scenario\'s <b>electoral implications</b>: how many seats the Republicans lose in the 2026 midterms, whether they hold the House; and the 2028 presidential margin (win or loss). Bands are ±2·root mean squared error (RMSE, 95% CI).',
    'scen.intro2': '<b>Forecasting models</b>: the 2026 Senate uses a PVI + national-environment logistic state-level model with Monte Carlo majority probability; the 2026 House uses the Bafumi-Erikson-Wlezien model; the 2028 presidential takes the inverse-RMSE weighted ensemble of three independent models (Fair Vote Equation, Hibbs Bread-and-Peace, Abramowitz Time-for-Change). Formulas and selection rationale are in the ⑤ Methodology tab.',
    'scen.senate_caveat': '<b>⚠️ An honest note on Senate forecasts</b>: The 2026 Senate Class II map is structurally hostile to Democrats — 22 Republican seats defending vs only 11 Democratic seats. Even a major Hormuz shock can yield Democrats at most 2-4 net seat gains.<br><br><b>Scenario differences operate on two dimensions</b>: (1) Oil/inflation transmission to voter sentiment (Republican 2028 two-party share ranges 49.7% under A_easing down to 44.7% under E_total_war); (2) Direct US military intervention (scenario D) triggers a dual "military victory rally + long-term casualty drag" effect — short-term D Senate majority probability drops from 60% to 53% (rally lifts approval, helping R hold ME/NC), but by 2028 the rally has fully decayed (Mueller 1973 half-life ~6 months) and accumulated casualties pull approval to -16, leaving R worse off than under the baseline scenarios. This mirrors the 1991 Bush 41 case ("Desert Storm 89% approval → 34% after 18 months").',
    'scen.table_h': 'Comparison table of political outcomes by scenario',
    'scen.table_desc': 'Below: macro transmission outputs (oil/growth/inflation/sentiment/approval) and final electoral predictions (2028 Republican two-party share via ensemble; 2026 Republican net House seat change) for each scenario. Last row is the prior-probability-weighted aggregate.',
    'scen.scenario_label': 'Scenario',
    'scen.prior_prob': 'Prior probability',
    'scen.macro_summary': 'Avg oil ${brent}/bbl · Inflation peak ${cpi}% · Sentiment ${ics}',
    'scen.senate_h': '2026 Senate Midterms',
    'scen.senate_d_gain': 'Democrats net gain {n} seats',
    'scen.senate_d_loss': 'Democrats net lose {n} seats',
    'scen.senate_no_change': 'Democratic seat change negligible',
    'scen.senate_d_flip': 'Democrats flip Senate',
    'scen.senate_r_hold': 'Republicans hold Senate',
    'scen.d_majority_prob': 'D majority probability',
    'scen.midterm_h': '2026 House Midterms',
    'scen.party_loses_seats': 'Republicans lose {n} seats',
    'scen.party_gains_seats': 'Republicans gain {n} seats',
    'scen.house_flip': 'House flips to Democrats',
    'scen.house_hold': 'Republicans hold House',
    'scen.flip_prob': 'flip probability',
    'scen.presidential_h': '2028 Presidential',
    'scen.party_wins': 'Republicans win by {n}pp',
    'scen.party_loses': 'Republicans lose by {n}pp',
    'scen.two_party_pred': 'Two-party vote prediction',
    'scen.win_rate': 'win rate',
    'scen.col_brent': 'Brent crude',
    'scen.col_growth': 'Growth (G %)',
    'scen.col_inflation': 'Term inflation (P %)',
    'scen.col_z': 'Good news quarters (Z)',
    'scen.col_ics': 'Sentiment (ICS)',
    'scen.col_approval': 'Net approval',
    'scen.col_seat_change': '2026 R House seat change',
    'scen.col_ensemble': 'Ensemble 2028',
    'scen.weighted': 'Weighted',
    'scen.weighted_desc': 'Weighted by prior probability across all 5 scenarios',
    // Tab 3
    'map.title': '2026 US Map: Senate + House Predictions',
    'map.intro': 'State-level predictions shown via color coding. Click a state to see the detail panel. 2028 presidential and House are not seriously forecast (candidates undecided + 2030 redistricting); 2028 Senate Class III 33 seats are shown for context only.',
    'map.ctrl_label': 'View:',
    'map.layer_senate2026': '2026 Senate (33 seats)',
    'map.layer_house2026': '2026 House (435 seats, state-level estimate)',
    'map.layer_senate2028': '2028 Senate (illustrative, no data)',
    'map.layer_house2028': '2028 House (not modeled)',
    'map.click_state': 'Click a state on the map to see details',
    'map.d_majority_prob': 'D Senate majority probability',
    'map.expected_seats': 'D / R total seats expected',
    'map.nat_env': 'National environment vs 2024 (D direction)',
    'map.house_d_r': 'D / R House seats predicted',
    'map.net_d_change': 'D net seat change',
    'map.majority_party': 'Majority party (>218 seats)',
    'map.house_d_controls': 'D controls House',
    'map.house_r_controls': 'R controls House',
    'map.no_data': 'No data',
    'map.candidates_undefined': '2028 candidates undefined; no credible prediction',
    'map.class3_seats': 'Class III seats (shown as grey on map)',
    'map.earliest_serious': 'Earliest date for credible forecast',
    'map.detail_2026senate': '2026 Senate',
    'map.detail_2026house': '2026 House (state-level estimate)',
    'map.detail_2024_dr': '2024 D / R',
    'map.detail_2026_proj': '2026 D / R projected',
    'map.detail_dchange': 'D net seat change',
    'map.detail_inc_party': 'Incumbent party',
    'map.detail_pvi': 'PVI',
    'map.detail_d_margin': 'Projected D margin',
    'map.detail_d_winrate': 'D win rate',
    'map.detail_flip_prob': 'Flip probability',
    'map.no_class2': '2026 Senate: no Class II race in this state this cycle',
    'map.note_2028': '<b>2028 Note:</b> Candidates, primaries, and economic conditions all undecided. Class III forecast requires Spring 2028 Cook PVI updates and primary data; the dashboard only shows map shading for context.',
    // Tab 4
    'ovl.title': 'Historical Comparison: 2026 vs Four Historical Oil-Political Crises',
    'ovl.intro1': 'Over the past 50 years, the US incumbent party has faced four major energy/political shocks: 1980 Iranian Revolution + Iran-Iraq war, 1990 Gulf War, 2008 oil peak, and 2022 Russia-Ukraine war. Each provides a complete case of "geopolitical shock → oil prices → inflation → voter sentiment → electoral outcome." This section aligns the four episodes by <b>t=0</b> (event start) and compares them directly with the current 2026 crisis.',
    'ovl.intro2': 'Suggested reading order: first, the "synchronous comparison cards" at the top to gauge 2026\'s relative position; then the "indicator comparison chart" to see how each crisis evolved; finally the "event details" for the full background and political fallout of each crisis.',
    'ovl.sec1': 'Section 1: Synchronous comparison at t=2 (2 months past event start)',
    'ovl.sec1_desc': 'The 2026 crisis anchor is 2026-02-28 (US-Israel airstrikes on Iran). Current t=2 corresponds to April 2026. The cards below show indicator readings and final political outcomes at the same t=2 in each historical crisis, allowing direct judgment of 2026\'s relative severity.',
    'ovl.sec2': 'Section 2: Indicator comparison chart (aligned monthly, t=0 to t=33)',
    'ovl.sec2_desc': 'Five colored lines represent the 1980/1990/2008/2022 historical crisis trajectories + 2026 current crisis trajectory (thick black line, 4 observed data points from t=0 to t=3). X-axis: months past event start. Y-axis: selected indicator. Red dashed lines mark 2026 midterms (t=8) and 2028 presidential (t=33) — read off "where does the 2026 trajectory extend to and which historical line does it most resemble?"',
    'ovl.sec3': 'Section 3: Key conclusion — 2026\'s position among the four historical crises',
    'ovl.sec4': 'Section 4: Detailed account of the four historical crises',
    'ovl.sec4_desc': 'Each card shows the full crisis background, key macro data (oil/gas/CPI/ICS/approval), final political outcome, and specific implications for the 2026 crisis. These cases are the calibration source for the model\'s transmission elasticity parameters.',
    'ovl.sec5': 'Section 5: Detailed monthly data tables for each crisis (click to expand)',
    'ovl.sec5_desc': 'Full monthly indicators for each crisis. Click event name to expand.',
    'ovl.metric_label': 'Choose indicator:',
    'ovl.metric_ics': 'Michigan Consumer Sentiment (ICS)',
    'ovl.metric_cpi': 'CPI (year-over-year)',
    'ovl.metric_brent': 'Brent crude',
    'ovl.metric_approval': 'Presidential net approval',
    'ovl.metric_gas': 'Gasoline price',
    'ovl.crisis_outcomes_label': 'Subsequent electoral outcomes',
    'ovl.lessons_label': 'Implications for the current Hormuz crisis',
    'ovl.event_period': 'Event period',
    // Tab 5
    'meth.title': 'Methodology',
    'meth.intro': 'The dashboard\'s core task is to convert geopolitical shocks (a Hormuz Strait blockade) through macro and political transmission chains into US electoral predictions. Below we describe each model used, the rationale for choosing it, historical predictive accuracy, transmission chain structure, and data sources.',
    // Tab 3 collapsibles
    'map.senate_full_table': 'All 33 Senate races (raw table, sorted by competitiveness)',
    'map.house_full_table': 'All states House projection table (sorted by D net seat change)',
    // Senate / House table headers
    'senate.col_state': 'State', 'senate.col_inc': 'Incumbent', 'senate.col_pvi': 'PVI', 'senate.col_dmargin': 'D margin (pp)', 'senate.col_winbar': 'Win bar', 'senate.col_dwin': 'D win rate', 'senate.col_flip': 'Flip prob', 'senate.col_notes': 'Notes',
    'house.col_state': 'State', 'house.col_pvi': 'PVI', 'house.col_total': 'Total seats', 'house.col_2024': '2024 D/R', 'house.col_2026': '2026 D/R proj.', 'house.col_dchange': 'D net change',
    // Tab 4 chart axis label
    'ovl.chart_xlabel': 'Months (since event start)',
    'ovl.chart_midterm_marker': '2026 Midterms',
    'ovl.chart_pres_marker': '2028 Presidential',
    'ovl.chart_now_label': '2026 today',
    'ovl.outcome_pending': 'Ongoing: 8 months to 2026 midterms, 33 months to 2028 presidential',
    'ovl.event_2026_today_label': '2026 today (ongoing)',
  },
};

let CURRENT_LANG = (typeof localStorage !== 'undefined' && localStorage.getItem('dashboard_lang')) || 'zh';

function t(key, fallback = '') {
  const dict = I18N[CURRENT_LANG] || I18N.zh;
  return dict[key] || I18N.zh[key] || fallback || key;
}

function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    const val = t(key);
    if (val) el.innerHTML = val;
  });
  document.documentElement.lang = CURRENT_LANG === 'zh' ? 'zh-CN' : 'en';
  document.body.dataset.lang = CURRENT_LANG;
}

function setLanguage(lang) {
  CURRENT_LANG = lang;
  if (typeof localStorage !== 'undefined') localStorage.setItem('dashboard_lang', lang);
  applyTranslations();
  // Re-render dynamic content if loaded
  if (CURRENT_TRANSMISSION) renderChain(CURRENT_TRANSMISSION);
  if (CURRENT_SCENARIOS && CURRENT_SUMMARY) renderScenarios(CURRENT_SCENARIOS, CURRENT_SUMMARY);
  if (SENATE_DATA && HOUSE_DATA) renderHouse(HOUSE_DATA);
  if (SENATE_DATA) renderSenate(SENATE_DATA);
  if (CURRENT_OVERLAY_DATA) renderMultiOverlay(CURRENT_OVERLAY_DATA, CURRENT_TRANSMISSION);
  if (CURRENT_HISTORY) renderHistory(CURRENT_HISTORY);
  if (MAP_INITIALIZED) renderMapSummary();
}

let CURRENT_TRANSMISSION = null;
let CURRENT_SCENARIOS = null;
let CURRENT_SUMMARY = null;
let CURRENT_HISTORY = null;

// Try several base paths so the dashboard works whether served:
// - via the Flask dev server (root = dashboard/, /data/election/* exists)
// - via Vercel / static host with public/ as root (/data/election/* under public/)
// - via a sub-path or file:// preview (relative ../data/election/*)
const DATA_BASES = ['/data/election', '../data/election', './data/election'];
let RESOLVED_BASE = null;

const SCEN_COLORS = {
  A_easing: '#2a9d8f',
  B_drag: '#f4a261',
  C_reescalation: '#e76f51',
  D_us_control: '#3b82f6',  // blue: military intervention
  E_total_war: '#9b2226',
};

const SCEN_LABELS_EN = {
  A_easing:        'Ceasefire holds, gradual reopening of Hormuz',
  B_drag:          'Intermittent disruption through fall (baseline)',
  C_reescalation:  'Ceasefire collapses, second blockade',
  D_us_control:    'US Navy directly enforces / convoys the strait',
  E_total_war:     'Escalates to regional total war',
};

// --- Language toggle button ---
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('lang-toggle');
  if (btn) {
    btn.addEventListener('click', () => {
      setLanguage(CURRENT_LANG === 'zh' ? 'en' : 'zh');
    });
  }
  applyTranslations();  // Apply language to static HTML on first load
});

// --- Tab switcher ---
let MAP_INITIALIZED = false;
let PENDING_GEO = null;
let PENDING_SENATE = null;
let PENDING_HOUSE = null;

document.querySelectorAll('.tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
    // Lazy-init the Leaflet map: only when senate tab is first revealed.
    // Initializing in a display:none container leaves the map with wrong
    // dimensions and bad viewport even after invalidateSize.
    if (btn.dataset.tab === 'senate') {
      if (!MAP_INITIALIZED && PENDING_GEO) {
        renderUSMap(PENDING_GEO, PENDING_SENATE, PENDING_HOUSE);
        MAP_INITIALIZED = true;
      } else if (MAP_OBJ) {
        setTimeout(() => MAP_OBJ.invalidateSize(), 50);
      }
    }
  });
});

// --- Boot ---
loadAll();

async function loadAll() {
  try {
    // Resolve which base path actually works by probing a small file.
    RESOLVED_BASE = await resolveBase();

    const [transmission, scenarios, senate, history, summary, multi, house, geo] = await Promise.all([
      fetchJSON('transmission_state.json'),
      fetchJSON('scenarios.json'),
      fetchJSON('senate_2026.json'),
      fetchJSON('historical_analogues.json'),
      fetchJSON('forecast_summary.json'),
      fetchJSON('historical_overlay_multi.json'),
      fetchJSON('house_2026.json'),
      fetchJSON('us_states.geojson'),
    ]);
    // Cache for re-render on language switch
    CURRENT_TRANSMISSION = transmission;
    CURRENT_SCENARIOS = scenarios;
    CURRENT_SUMMARY = summary;
    CURRENT_HISTORY = history;
    CURRENT_OVERLAY_DATA = multi;
    SENATE_DATA = senate;
    HOUSE_DATA = house;

    renderChain(transmission);
    renderScenarios(scenarios, summary);
    renderSenate(senate);
    renderHistory(history);
    renderMultiOverlay(multi, transmission);
    renderHouse(house);
    // Stash data for lazy map init when user switches to senate tab.
    PENDING_GEO = geo;
    PENDING_SENATE = senate;
    PENDING_HOUSE = house;
    // Apply current language to all data-i18n nodes
    applyTranslations();
    document.getElementById('last-updated').textContent =
      'Updated ' + formatDate(transmission.as_of);
  } catch (e) {
    console.error('Load failed:', e);
    const hint = `
      <div class="caveat" style="margin:24px;">
        <b>⚠️ Failed to load data.</b><br>
        Error: ${e.message}<br><br>
        Tried these paths: <code>${DATA_BASES.join(', ')}</code><br>
        Resolved base: <code>${RESOLVED_BASE || 'none'}</code><br><br>
        <b>If running locally:</b> <code>cd dashboard && python3 server.py</code> and open <code>http://localhost:5050/election/</code><br>
        <b>If served as static:</b> ensure <code>dashboard/public/data/election/*.json</code> exists.
      </div>`;
    document.querySelector('.container').innerHTML = hint;
  }
}

async function resolveBase() {
  // Probe a small file under each candidate base. First one that returns 200 wins.
  for (const base of DATA_BASES) {
    try {
      const r = await fetch(`${base}/forecast_summary.json`, { method: 'GET' });
      if (r.ok) {
        console.info(`Using data base: ${base}`);
        return base;
      }
    } catch (e) {
      // network error — try next base
    }
  }
  throw new Error('No data path resolved. Tried: ' + DATA_BASES.join(', '));
}

async function fetchJSON(name) {
  const url = `${RESOLVED_BASE}/${name}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url}: ${r.status} ${r.statusText}`);
  return r.json();
}

function formatDate(iso) {
  if (!iso) return '—';
  return iso.slice(0, 10) + ' ' + iso.slice(11, 16) + ' UTC';
}

function fmt(n, digits = 1) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return Number(n).toFixed(digits);
}

// --- Tab 1: Transmission Chain ---
const TAG_COLORS = { '上游': '#94a3b8', '中游': '#f4a261', '下游': '#e63946' };

function renderChain(state) {
  const grid = document.getElementById('chain-grid');
  grid.innerHTML = '';
  state.chain.forEach(link => {
    const card = document.createElement('div');
    card.className = 'chain-card' + (link.current === null ? ' no-data' : '');
    const pct = link.pressure !== null ? link.pressure : 0;
    const valStr = link.current !== null ? Number(link.current).toLocaleString(undefined, {maximumFractionDigits: 2}) : 'no data';
    // Pick language-specific name + interpretation + unit if available
  const name = (CURRENT_LANG === 'en' && link.name_en) ? link.name_en : link.name;
  const interp = (CURRENT_LANG === 'en' && link.interpretation_en) ? link.interpretation_en : link.interpretation;
  const unit = (CURRENT_LANG === 'en' && link.unit_en) ? link.unit_en : link.unit;
  card.innerHTML = `
      <div class="step-num">STEP ${link.step}</div>
      <div class="name">${name}</div>
      <div class="value-row">
        <span class="value">${valStr}</span>
        <span class="unit">${unit}</span>
      </div>
      <div class="interp">${interp}</div>
      <div class="gauge" style="--p: ${pct}%"></div>
      <div class="gauge-zones"><span>${t('chain.zone_upstream')}</span><span>${t('chain.zone_mid')}</span><span>${t('chain.zone_down')}</span></div>
      <div class="baseline-alarm">
        <span>baseline ${formatBaseline(link.baseline, link.unit)}</span>
        <span>${link.pressure !== null ? `pressure ${link.pressure}/100` : ''}</span>
        <span>alarm ${formatBaseline(link.alarm, link.unit)}</span>
      </div>
    `;
    grid.appendChild(card);
  });

  document.getElementById('epu-val').textContent = fmt(state.epu_index, 1);
  document.getElementById('chain-updated').textContent = formatDate(state.as_of);
}

function formatBaseline(v, unit) {
  if (v === null || v === undefined) return '—';
  if (Math.abs(v) >= 1000) return v.toLocaleString();
  return Number(v).toLocaleString(undefined, {maximumFractionDigits: 2});
}

// --- Tab 2: Scenarios — focus on electoral impact per scenario ---
function renderScenarios(data, summary) {
  // 5 scenario cards with electoral impact
  const sum = document.getElementById('scenario-summary');
  sum.innerHTML = '';
  data.scenarios.forEach(sc => {
    const c = document.createElement('div');
    c.className = 'scenario-card';
    c.style.setProperty('--scen-color', SCEN_COLORS[sc.scenario] || '#94a3b8');
    const ens = sc.ensemble_2028;
    const bew = sc.bew_2026_house;
    const sen = sc.senate_2026 || {};
    const seatChange = bew.in_party_seat_change;
    const seatText = seatChange < 0
      ? t('scen.party_loses_seats').replace('{n}', Math.abs(seatChange).toFixed(0))
      : t('scen.party_gains_seats').replace('{n}', seatChange.toFixed(0));
    const houseControl = bew.control_flip_probability > 0.5 ? t('scen.house_flip') : t('scen.house_hold');
    const brent = sc.macro_projection.brent_avg_to_election;
    const macroLine = t('scen.macro_summary')
      .replace('${brent}', brent)
      .replace('${cpi}', fmt(sc.macro_projection.projected_2026_2028_macro.cpi_yoy_2026_2028, 1))
      .replace('${ics}', fmt(sc.macro_projection.projected_2026_2028_macro.michigan_ics, 0));
    const winText = ens.incumbent_two_party_pct >= 50
      ? t('scen.party_wins').replace('{n}', fmt(ens.incumbent_two_party_pct - 50, 1))
      : t('scen.party_loses').replace('{n}', fmt(50 - ens.incumbent_two_party_pct, 1));
    const scLabel = (CURRENT_LANG === 'en' && SCEN_LABELS_EN[sc.scenario]) ? SCEN_LABELS_EN[sc.scenario] : sc.label;
    // Senate text per scenario
    const senDChange = sen.d_net_change || 0;
    const senChangeText = senDChange > 0
      ? t('scen.senate_d_gain').replace('{n}', senDChange.toFixed(1))
      : senDChange < 0
        ? t('scen.senate_d_loss').replace('{n}', Math.abs(senDChange).toFixed(1))
        : t('scen.senate_no_change');
    const senControl = sen.d_majority_prob > 0.5 ? t('scen.senate_d_flip') : t('scen.senate_r_hold');
    const senDmajPct = (sen.d_majority_prob * 100).toFixed(0);

    c.innerHTML = `
      <div class="scen-key">${t('scen.scenario_label')} ${sc.scenario.split('_')[0]} · ${t('scen.prior_prob')} ${(sc.probability_prior * 100).toFixed(0)}%</div>
      <div class="scen-label">${scLabel}</div>
      <div style="margin-top:10px; padding:8px; background:#f8fafc; border-radius:5px; font-size:12px; color:#64748b;">
        ${macroLine}
      </div>
      <div style="margin-top:12px;">
        <div style="font-size:11px; color:#94a3b8; text-transform:uppercase; margin-bottom:4px;">${t('scen.senate_h')}</div>
        <div style="font-size:15px; color:#0f172a; font-weight:600;">${senChangeText}</div>
        <div style="font-size:12px; color:${sen.d_majority_prob > 0.5 ? '#2563eb' : '#dc2626'};">
          ${senControl}（${t('scen.d_majority_prob')} ${senDmajPct}%）
        </div>
      </div>
      <div style="margin-top:12px;">
        <div style="font-size:11px; color:#94a3b8; text-transform:uppercase; margin-bottom:4px;">${t('scen.midterm_h')}</div>
        <div style="font-size:15px; color:#0f172a; font-weight:600;">${seatText}</div>
        <div style="font-size:12px; color:${bew.control_flip_probability > 0.5 ? '#dc2626' : '#2a9d8f'};">
          ${houseControl}（${t('scen.flip_prob')} ${(bew.control_flip_probability * 100).toFixed(0)}%）
        </div>
      </div>
      <div style="margin-top:12px;">
        <div style="font-size:11px; color:#94a3b8; text-transform:uppercase; margin-bottom:4px;">${t('scen.presidential_h')}</div>
        <div style="font-size:15px; color:#0f172a; font-weight:600;">${winText}</div>
        <div style="font-size:12px; color:#64748b;">
          ${t('scen.two_party_pred')} ${fmt(ens.incumbent_two_party_pct, 1)}% · ${t('scen.win_rate')} ${(ens.win_prob * 100).toFixed(0)}%
        </div>
      </div>
    `;
    sum.appendChild(c);
  });

  // Detail table — all three models per scenario
  const table = document.getElementById('scenario-table');
  table.innerHTML = `
    <thead>
      <tr>
        <th>${t('scen.scenario_label')}</th>
        <th class="num">${t('scen.col_brent')}</th>
        <th class="num">${t('scen.col_growth')}</th>
        <th class="num">${t('scen.col_inflation')}</th>
        <th class="num">${t('scen.col_z')}</th>
        <th class="num">${t('scen.col_ics')}</th>
        <th class="num">${t('scen.col_approval')}</th>
        <th class="num" style="background:#dcfce7;">${t('scen.col_seat_change')}</th>
        <th class="num" style="background:#fef3c7;">Fair 2028</th>
        <th class="num" style="background:#fef3c7;">Hibbs 2028</th>
        <th class="num" style="background:#fef3c7;">Abramowitz 2028</th>
        <th class="num" style="background:#dbeafe;">${t('scen.col_ensemble')}</th>
      </tr>
    </thead>
    <tbody>
      ${data.scenarios.map(sc => {
        const m = sc.macro_projection.projected_2026_2028_macro;
        const f = sc.fair_2028;
        const h = sc.hibbs_2028;
        const a = sc.abramowitz_2028;
        const e = sc.ensemble_2028;
        const b = sc.bew_2026_house;
        const lblTab = (CURRENT_LANG === 'en' && SCEN_LABELS_EN[sc.scenario]) ? SCEN_LABELS_EN[sc.scenario] : sc.label;
        return `
        <tr>
          <td><b>${sc.scenario}</b><br><span class="ci">${lblTab}</span></td>
          <td class="num">$${sc.macro_projection.brent_avg_to_election}</td>
          <td class="num">${fmt(m.G_real_growth_pct, 1)}</td>
          <td class="num">${fmt(m.P_admin_inflation_pct, 1)}</td>
          <td class="num">${m.Z_good_news_quarters}</td>
          <td class="num">${fmt(m.michigan_ics, 0)}</td>
          <td class="num">${fmt(m.approval_net, 1)}</td>
          <td class="num" style="background:#dcfce7;"><b>${fmt(b.in_party_seat_change, 0)}</b><span class="ci">±${fmt(b.rmse * 2, 0)}</span></td>
          <td class="num">${fmt(f.incumbent_two_party_pct, 1)}<span class="ci">±${fmt(f.rmse * 2, 1)}</span></td>
          <td class="num">${fmt(h.incumbent_two_party_pct, 1)}<span class="ci">±${fmt(h.rmse * 2, 1)}</span></td>
          <td class="num">${fmt(a.incumbent_two_party_pct, 1)}<span class="ci">±${fmt(a.rmse * 2, 1)}</span></td>
          <td class="num" style="background:#dbeafe;"><b>${fmt(e.incumbent_two_party_pct, 1)}</b><span class="ci">±${fmt(e.ensemble_rmse * 2, 1)}</span></td>
        </tr>
        `;
      }).join('')}
      <tr style="background:#f1f5f9; font-weight:600;">
        <td>${t('scen.weighted')}</td>
        <td colspan="6" style="color:#64748b; font-weight:400;">${t('scen.weighted_desc')}</td>
        <td class="num" style="background:#dcfce7;"><b>${fmt(data.weighted_summary['2026_in_party_seat_change'], 0)}</b></td>
        <td class="num">${fmt(summary.scenarios_2028_range.weighted_R_pct_fair, 1)}</td>
        <td class="num">${fmt(summary.scenarios_2028_range.weighted_R_pct_hibbs, 1)}</td>
        <td class="num">${fmt(summary.scenarios_2028_range.weighted_R_pct_abramowitz, 1)}</td>
        <td class="num" style="background:#dbeafe;"><b>${fmt(summary.scenarios_2028_range.weighted_R_pct_ensemble, 1)}</b></td>
      </tr>
    </tbody>
  `;
}

// --- Tab 3: Senate Map ---
function renderSenate(data) {
  // Legacy summary cards removed — map summary cards render via renderMapSummary().
  // Just render the detail table.

  // Sort by competitiveness — flip prob for R-defending, hold prob for D-defending
  const sorted = [...data.races].sort((a, b) => {
    const aComp = Math.abs(a.d_win_prob - 0.5);
    const bComp = Math.abs(b.d_win_prob - 0.5);
    return aComp - bComp;
  });

  const table = document.getElementById('senate-table');
  table.innerHTML = `
    <thead>
      <tr>
        <th>${t('senate.col_state')}</th>
        <th>${t('senate.col_inc')}</th>
        <th class="num">${t('senate.col_pvi')}</th>
        <th class="num">${t('senate.col_dmargin')}</th>
        <th>${t('senate.col_winbar')}</th>
        <th class="num">${t('senate.col_dwin')}</th>
        <th class="num">${t('senate.col_flip')}</th>
        <th>${t('senate.col_notes')}</th>
      </tr>
    </thead>
    <tbody>
      ${sorted.map(r => {
        const competitive = r.d_win_prob > 0.25 && r.d_win_prob < 0.75;
        const rprob = (1 - r.d_win_prob) * 100;
        return `
        <tr ${competitive ? 'class="competitive-row"' : ''}>
          <td><span class="state-tag party-${r.incumbent_party}">${r.state}</span></td>
          <td>${r.incumbent_party}${r.incumbent_running ? '' : ' (open)'}</td>
          <td class="num">${r.pvi > 0 ? 'R+' + r.pvi : 'D+' + Math.abs(r.pvi)}</td>
          <td class="num">${r.projected_d_margin_pp > 0 ? '+' : ''}${fmt(r.projected_d_margin_pp, 1)}</td>
          <td><div class="prob-bar" style="--rprob: ${rprob}%; --rprob_end: ${rprob}%;"></div></td>
          <td class="num">${(r.d_win_prob * 100).toFixed(0)}%</td>
          <td class="num">${(r.flip_prob * 100).toFixed(0)}%</td>
          <td style="font-size:11px; color:#64748b;">${r.notes}</td>
        </tr>
        `;
      }).join('')}
    </tbody>
  `;
}

// --- Tab 4: 多事件 overlay ---
const EVENT_COLORS_HIST = {
  '1980_iran_iraq':     '#9b2226',  // 深红 — 最严重的历史对比
  '1990_gulf_war':      '#e76f51',  // 橙红
  '2008_oil_peak':      '#f4a261',  // 橙
  '2022_russia_ukraine':'#2a9d8f',  // 青
  '2026_current':       '#0f172a',  // 深黑 — 当前进行中（粗线）
  '2026_now':           '#0f172a',  // 兼容旧 key
};

const METRIC_LABELS = {
  ics:          { label: '密歇根大学消费者信心 (ICS)', label_en: 'Michigan Consumer Sentiment (ICS)',  y_min: 40, y_max: 100, fmt: v => `${v.toFixed(0)}` },
  cpi_yoy:      { label: '消费者价格指数 (CPI) 同比 %', label_en: 'CPI YoY %', y_min: 0,  y_max: 16, fmt: v => `${v.toFixed(1)}%` },
  brent:        { label: '布伦特原油 $/桶', label_en: 'Brent crude $/bbl', y_min: 0,  y_max: 200, fmt: v => `$${v.toFixed(0)}` },
  approval_net: { label: '总统净支持率', label_en: 'Presidential net approval', y_min: -50, y_max: 70, fmt: v => `${v >= 0 ? '+' : ''}${v.toFixed(0)}` },
  gas:          { label: '汽油 $/加仑', label_en: 'Gasoline $/gal', y_min: 0,  y_max: 5,  fmt: v => `$${v.toFixed(2)}` },
};

let CURRENT_OVERLAY_DATA = null;
let CURRENT_METRIC = 'ics';

function renderMultiOverlay(data, transmission) {
  CURRENT_OVERLAY_DATA = data;
  CURRENT_TRANSMISSION = transmission;

  // 1) Comparison cards at t=2
  const cur = readCurrent2026Values(transmission);
  const grid = document.getElementById('overlay-comparison-grid');
  const cmp = data.comparison_at_t2 || {};
  const cardData = [
    { key: '1980_iran_iraq',     ev: cmp['1980_at_t2'],   meta: data.events['1980_iran_iraq'] },
    { key: '1990_gulf_war',      ev: cmp['1990_at_t2'],   meta: data.events['1990_gulf_war'] },
    { key: '2008_oil_peak',      ev: cmp['2008_at_t2'],   meta: data.events['2008_oil_peak'] },
    { key: '2022_russia_ukraine',ev: cmp['2022_at_t2'],   meta: data.events['2022_russia_ukraine'] },
    { key: '2026_current',       ev: cmp['2026_today'],   meta: { label: t('ovl.event_2026_today_label'), outcome: t('ovl.outcome_pending') } },
  ];
  const isEnCards = CURRENT_LANG === 'en';
  const pickC = (zh, en) => (isEnCards && en) ? en : zh;
  const lblIcs = isEnCards ? 'Sentiment (ICS)' : '消费者信心 (ICS)';
  const lblCpi = isEnCards ? 'CPI YoY' : '消费者价格指数 (CPI) 同比';
  const lblApp = isEnCards ? 'Net approval' : '净支持率';
  grid.innerHTML = cardData.map(c => {
    const outcome = pickC(c.meta.outcome, c.meta.outcome_en) || c.ev.outcome_pending || '';
    return `
    <div class="overlay-event-card ${c.key === '2026_current' ? 'now-card' : ''}" style="--ev-color: ${EVENT_COLORS_HIST[c.key]}">
      <div class="ev-label">${pickC(c.meta.label, c.meta.label_en)}</div>
      <div class="ev-month">t=2 → ${c.ev.month}</div>
      <div class="ev-stat"><span>${lblIcs}</span><span class="v">${c.ev.ics}</span></div>
      <div class="ev-stat"><span>${lblCpi}</span><span class="v">${c.ev.cpi_yoy}%</span></div>
      <div class="ev-stat"><span>${lblApp}</span><span class="v">${c.ev.approval > 0 ? '+' : ''}${c.ev.approval}</span></div>
      <div class="ev-outcome">${outcome}</div>
    </div>
    `;
  }).join('');

  // 2) Chart toggles
  document.querySelectorAll('.chart-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.chart-toggle').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      CURRENT_METRIC = btn.dataset.metric;
      renderOverlayChart();
    });
  });
  renderOverlayChart();

  // 3) Key insight banner — language-aware, preserve newlines as paragraph breaks
  const insight = (CURRENT_LANG === 'en' && cmp.key_insight_en) ? cmp.key_insight_en : (cmp.key_insight || '');
  const insightHtml = insight.split('\n\n').map(p =>
    `<p style="margin-bottom:10px;">${p.replace(/\n/g, '<br>')}</p>`
  ).join('');
  document.getElementById('overlay-key-insight').innerHTML = insightHtml;

  // 4) Per-event detail tables (collapsible) — language aware
  const isEn = CURRENT_LANG === 'en';
  const pickEv = (zh, en) => (isEn && en) ? en : zh;
  const tableHeaders = isEn
    ? ['t (months)', 'Month', 'Brent crude', 'CPI YoY', 'Gasoline', 'Sentiment (ICS)', 'Net approval']
    : ['t (月)', '月份', '布伦特原油', '消费者价格指数 (CPI) 同比', '汽油', '消费者信心 (ICS)', '净支持率'];
  const sinceWord = isEn ? 'since' : '起';

  const tablesDiv = document.getElementById('overlay-event-tables');
  tablesDiv.innerHTML = Object.entries(data.events).map(([key, ev]) => {
    const outcomeText = pickEv(ev.outcome, ev.outcome_en);
    return `
    <details>
      <summary style="border-left: 3px solid ${EVENT_COLORS_HIST[key]}; padding-left: 14px;">
        ${pickEv(ev.label, ev.label_en)} — ${ev.anchor_date} ${sinceWord} · ${outcomeText ? outcomeText.slice(0, 100) : ''}
      </summary>
      <table>
        <thead>
          <tr>${tableHeaders.map(h => `<th class="${h.match(/[A-Za-z]/) ? 'num' : ''}">${h}</th>`).join('')}</tr>
        </thead>
        <tbody>
          ${ev.monthly.map(m => `
            <tr>
              <td>${m.t}</td>
              <td>${m.month}</td>
              <td class="num">$${m.brent}</td>
              <td class="num">${m.cpi_yoy}%</td>
              <td class="num">$${m.gas.toFixed(2)}</td>
              <td class="num">${m.ics}</td>
              <td class="num">${m.approval_net >= 0 ? '+' : ''}${m.approval_net}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </details>
    `;
  }).join('');
}

function readCurrent2026Values(transmission) {
  // Match by step number — language-independent.
  const cur = {};
  for (const c of transmission.chain) {
    if (c.step === 1) cur.brent = c.current;
    if (c.step === 2) cur.gas = c.current;
    if (c.step === 4) cur.cpi_yoy = c.current;
    if (c.step === 7) cur.ics = c.current;
    if (c.step === 8) cur.approval_net = c.current;
  }
  return cur;
}

function renderOverlayChart() {
  if (!CURRENT_OVERLAY_DATA) return;
  const data = CURRENT_OVERLAY_DATA;
  const cur = readCurrent2026Values(CURRENT_TRANSMISSION);
  const metric = CURRENT_METRIC;
  const meta = METRIC_LABELS[metric];

  // Determine x-axis range — go up to t=33 (covers 2026 → 2028 presidential)
  const X_MAX = 35;
  const X_MIN = 0;
  const Y_MIN = meta.y_min;
  const Y_MAX = meta.y_max;

  const W = 820, H = 380;
  const PAD_L = 50, PAD_R = 20, PAD_T = 20, PAD_B = 40;
  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;

  const xScale = t => PAD_L + (t - X_MIN) / (X_MAX - X_MIN) * innerW;
  const yScale = v => PAD_T + (1 - (v - Y_MIN) / (Y_MAX - Y_MIN)) * innerH;

  // Build polylines for each historical event (and 2026_current trajectory)
  const events = data.events;
  const isEnLeg = CURRENT_LANG === 'en';
  const lines = Object.entries(events).map(([key, ev]) => {
    const points = ev.monthly
      .filter(m => m[metric] !== undefined && m[metric] !== null)
      .map(m => `${xScale(m.t)},${yScale(m[metric])}`)
      .join(' ');
    const isCurrent = key === '2026_current';
    const label = (isEnLeg && ev.label_en) ? ev.label_en : ev.label;
    return { key, label, points, color: EVENT_COLORS_HIST[key], isCurrent };
  });

  // Latest 2026 endpoint (overlaid on 2026 line endpoint)
  const t_now = data.current_2026_anchor.current_t;
  const current2026Val = cur[metric];
  const current2026Marker = (current2026Val !== undefined && current2026Val !== null)
    ? { cx: xScale(t_now), cy: yScale(current2026Val), value: current2026Val }
    : null;

  // Y-axis ticks
  const numYTicks = 6;
  const yTicks = Array.from({length: numYTicks}, (_, i) => Y_MIN + (Y_MAX - Y_MIN) * i / (numYTicks - 1));

  // X-axis: ticks every 3 months + key markers
  const xTicks = [0, 3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33];

  // Election day markers
  const midtermT = data.current_2026_anchor.midterm_t_offset;
  const presT = data.current_2026_anchor.pres_t_offset;

  const svg = `
    <svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
      <!-- Y grid + axis -->
      ${yTicks.map(v => `
        <line x1="${PAD_L}" y1="${yScale(v)}" x2="${W - PAD_R}" y2="${yScale(v)}" stroke="#f1f5f9" stroke-width="1"/>
        <text x="${PAD_L - 8}" y="${yScale(v) + 4}" text-anchor="end" font-size="10" fill="#94a3b8">${meta.fmt(v)}</text>
      `).join('')}
      <line x1="${PAD_L}" y1="${PAD_T}" x2="${PAD_L}" y2="${H - PAD_B}" stroke="#cbd5e0" stroke-width="1"/>
      <line x1="${PAD_L}" y1="${H - PAD_B}" x2="${W - PAD_R}" y2="${H - PAD_B}" stroke="#cbd5e0" stroke-width="1"/>

      <!-- X ticks -->
      ${xTicks.map(t => `
        <line x1="${xScale(t)}" y1="${H - PAD_B}" x2="${xScale(t)}" y2="${H - PAD_B + 4}" stroke="#cbd5e0"/>
        <text x="${xScale(t)}" y="${H - PAD_B + 16}" text-anchor="middle" font-size="10" fill="#94a3b8">t=${t}</text>
      `).join('')}
      <text x="${PAD_L + innerW / 2}" y="${H - 4}" text-anchor="middle" font-size="11" fill="#64748b">${t('ovl.chart_xlabel')}</text>
      <text transform="rotate(-90)" x="${-(PAD_T + innerH / 2)}" y="14" text-anchor="middle" font-size="11" fill="#64748b">${(CURRENT_LANG === 'en' && meta.label_en) ? meta.label_en : meta.label}</text>

      <!-- Election day vertical lines -->
      <line x1="${xScale(midtermT)}" y1="${PAD_T}" x2="${xScale(midtermT)}" y2="${H - PAD_B}" stroke="#dc2626" stroke-width="1" stroke-dasharray="3,3" opacity="0.6"/>
      <text x="${xScale(midtermT)}" y="${PAD_T + 12}" font-size="10" fill="#dc2626" text-anchor="middle">${t('ovl.chart_midterm_marker')}</text>
      <line x1="${xScale(presT)}" y1="${PAD_T}" x2="${xScale(presT)}" y2="${H - PAD_B}" stroke="#dc2626" stroke-width="1" stroke-dasharray="3,3" opacity="0.6"/>
      <text x="${xScale(presT)}" y="${PAD_T + 12}" font-size="10" fill="#dc2626" text-anchor="middle">${t('ovl.chart_pres_marker')}</text>

      <!-- Lines for each historical event (2026 line drawn LAST + thicker so it overlays) -->
      ${lines.filter(l => !l.isCurrent).map(l => `
        <polyline fill="none" stroke="${l.color}" stroke-width="2" stroke-linejoin="round" points="${l.points}" opacity="0.75"/>
      `).join('')}
      ${lines.filter(l => l.isCurrent).map(l => `
        <polyline fill="none" stroke="${l.color}" stroke-width="3.5" stroke-linejoin="round" points="${l.points}" opacity="1.0"/>
      `).join('')}

      <!-- 2026 endpoint marker -->
      ${current2026Marker ? `
        <circle cx="${current2026Marker.cx}" cy="${current2026Marker.cy}" r="6" fill="${EVENT_COLORS_HIST['2026_current']}" stroke="#fff" stroke-width="2"/>
        <text x="${current2026Marker.cx + 10}" y="${current2026Marker.cy - 8}" font-size="11" fill="#0f172a" font-weight="600">${t('ovl.chart_now_label')}: ${meta.fmt(current2026Val)}</text>
      ` : ''}
    </svg>
    <div class="chart-legend">
      ${lines.map(l => `
        <span><span class="swatch" style="background:${l.color};${l.isCurrent ? 'height:4px;' : ''}"></span>${l.label}</span>
      `).join('')}
    </div>
  `;

  document.getElementById('overlay-chart').innerHTML = svg;
}

// --- 州名 ↔ 两位代码映射 ---
const STATE_NAME_TO_CODE = {
  'Alabama':'AL','Alaska':'AK','Arizona':'AZ','Arkansas':'AR','California':'CA',
  'Colorado':'CO','Connecticut':'CT','Delaware':'DE','District of Columbia':'DC',
  'Florida':'FL','Georgia':'GA','Hawaii':'HI','Idaho':'ID','Illinois':'IL',
  'Indiana':'IN','Iowa':'IA','Kansas':'KS','Kentucky':'KY','Louisiana':'LA',
  'Maine':'ME','Maryland':'MD','Massachusetts':'MA','Michigan':'MI','Minnesota':'MN',
  'Mississippi':'MS','Missouri':'MO','Montana':'MT','Nebraska':'NE','Nevada':'NV',
  'New Hampshire':'NH','New Jersey':'NJ','New Mexico':'NM','New York':'NY',
  'North Carolina':'NC','North Dakota':'ND','Ohio':'OH','Oklahoma':'OK','Oregon':'OR',
  'Pennsylvania':'PA','Rhode Island':'RI','South Carolina':'SC','South Dakota':'SD',
  'Tennessee':'TN','Texas':'TX','Utah':'UT','Vermont':'VT','Virginia':'VA',
  'Washington':'WA','West Virginia':'WV','Wisconsin':'WI','Wyoming':'WY','Puerto Rico':'PR',
};

let MAP_OBJ = null;
let GEO_LAYER = null;
let SENATE_DATA = null;
let HOUSE_DATA = null;
let CURRENT_LAYER = 'senate2026';

function renderUSMap(geo, senate, house) {
  SENATE_DATA = senate;
  HOUSE_DATA = house;

  // Initialize Leaflet — focus on continental US
  MAP_OBJ = L.map('us-map', {
    center: [39, -97],
    zoom: 4,
    minZoom: 3,
    maxZoom: 7,
    zoomControl: true,
    attributionControl: false,
  });
  // Light grey tile to keep colors readable
  L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_nolabels/{z}/{x}/{y}.png', {
    subdomains: 'abcd',
  }).addTo(MAP_OBJ);

  GEO_LAYER = L.geoJSON(geo, {
    style: feat => stateStyle(feat, CURRENT_LAYER),
    onEachFeature: bindStateInteraction,
  }).addTo(MAP_OBJ);

  document.querySelectorAll('.map-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      document.querySelectorAll('.map-toggle').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      CURRENT_LAYER = btn.dataset.layer;
      GEO_LAYER.setStyle(f => stateStyle(f, CURRENT_LAYER));
      renderMapSummary();
    });
  });
  renderMapSummary();
}

function stateStyle(feature, layer) {
  const code = STATE_NAME_TO_CODE[feature.properties.name];
  if (!code) return { fillColor: '#ddd', weight: 0.5, color: '#aaa', fillOpacity: 0.3 };

  // Get state PVI from house data (covers all 50 states with PVI).
  const houseSt = HOUSE_DATA.states.find(s => s.state === code);
  const pvi = houseSt ? houseSt.pvi : 0;

  if (layer === 'senate2026') {
    // Color ALL states by current PVI (light shading); states with 2026 Class II race
    // get strong color = projected D win prob + thick border.
    const race = SENATE_DATA.races.find(r => r.state === code);
    if (race) {
      // 2026 Class II race: strong color by D win prob + thick border.
      return {
        fillColor: probColor(race.d_win_prob),
        weight: 2.0, color: '#0f172a', fillOpacity: 0.9,
      };
    }
    // Non-Class II: light PVI shading + thin border (context only).
    return {
      fillColor: pviToColor(pvi),
      weight: 0.5, color: '#94a3b8', fillOpacity: 0.45,
    };
  }

  if (layer === 'house2026') {
    if (!houseSt) return { fillColor: '#f0f0f0', weight: 0.5, color: '#aaa', fillOpacity: 0.5 };
    // Color by D fraction of delegation.
    const dFrac = houseSt.d_2026_proj / Math.max(houseSt.total_seats, 1);
    return { fillColor: probColor(dFrac), weight: 0.7, color: '#666', fillOpacity: 0.85 };
  }

  if (layer === 'senate2028') {
    // 2028 Class III states — color by current PVI (no model prediction);
    // border highlights which states are up.
    const senate2028States = ['AL','AK','AR','CO','DE','GA','ID','IL','KS','KY','LA','MA','ME','MI','MN','MS','MT','NE','NJ','NM','NC','OK','OR','RI','SC','SD','TN','TX','VA','WV','WY','HI','OH'];
    if (senate2028States.includes(code)) {
      return {
        fillColor: pviToColor(pvi),
        weight: 2.0, color: '#0f172a', fillOpacity: 0.85,
      };
    }
    return { fillColor: pviToColor(pvi), weight: 0.5, color: '#94a3b8', fillOpacity: 0.45 };
  }

  return { fillColor: '#f0f0f0', weight: 0.5, color: '#aaa', fillOpacity: 0.4 };
}

// Map PVI (-25 to +25) to a color: D blue (negative) to R red (positive), white at 0.
function pviToColor(pvi) {
  if (pvi <= -15) return '#1e40af';
  if (pvi <= -8)  return '#3b82f6';
  if (pvi <= -3)  return '#93c5fd';
  if (pvi <  3)   return '#e5e7eb';
  if (pvi <  8)   return '#fca5a5';
  if (pvi <  15)  return '#ef4444';
  return '#991b1b';
}

function probColor(dProb) {
  // dProb 0-1: 0=R red, 0.5=neutral, 1=D blue.
  if (dProb >= 0.85) return '#1e40af';      // safe D
  if (dProb >= 0.65) return '#3b82f6';      // lean D
  if (dProb >= 0.55) return '#93c5fd';      // tilt D
  if (dProb >= 0.45) return '#e5e7eb';      // toss-up
  if (dProb >= 0.35) return '#fca5a5';      // tilt R
  if (dProb >= 0.15) return '#ef4444';      // lean R
  return '#991b1b';                          // safe R
}

function bindStateInteraction(feat, lyr) {
  lyr.on({
    mouseover: e => {
      e.target.setStyle({ weight: 2.5, color: '#0f172a', fillOpacity: 0.95 });
      e.target.bringToFront();
    },
    mouseout: e => GEO_LAYER.resetStyle(e.target),
    click: e => {
      const code = STATE_NAME_TO_CODE[feat.properties.name];
      showStateDetail(code, feat.properties.name);
    },
  });
}

function showStateDetail(code, name) {
  const panel = document.getElementById('state-detail-panel');
  const senateRace = SENATE_DATA.races.find(r => r.state === code);
  const houseSt = HOUSE_DATA.states.find(s => s.state === code);

  let html = `<h4>${name} (${code})</h4>`;

  if (senateRace) {
    const margin = senateRace.projected_d_margin_pp;
    const winner = senateRace.d_win_prob > 0.5 ? 'D' : 'R';
    html += `
      <div style="margin-top:12px; padding:8px; background:#f8fafc; border-radius:5px;">
        <div style="font-size:11px; color:#94a3b8; text-transform:uppercase; margin-bottom:6px;">2026 参议院</div>
        <div class="row"><span>现任党</span><span class="v">${senateRace.incumbent_party}${senateRace.incumbent_running ? '' : ' (开放)'}</span></div>
        <div class="row"><span>PVI</span><span class="v">${senateRace.pvi > 0 ? 'R+' + senateRace.pvi : 'D+' + Math.abs(senateRace.pvi)}</span></div>
        <div class="row"><span>D margin 预测</span><span class="v">${margin > 0 ? '+' : ''}${margin.toFixed(1)}pp</span></div>
        <div class="row"><span>D 胜率</span><span class="v">${(senateRace.d_win_prob * 100).toFixed(0)}%</span></div>
        <div class="row"><span>翻盘概率</span><span class="v">${(senateRace.flip_prob * 100).toFixed(0)}%</span></div>
        <div style="font-size:11px; color:#64748b; margin-top:6px;">${senateRace.notes}</div>
      </div>
    `;
  } else {
    html += `<div style="margin-top:12px; color:#94a3b8; font-size:12px;">2026 参议院：本州本届无 Class II 改选</div>`;
  }

  if (houseSt) {
    const swingClass = houseSt.expected_d_seat_change > 0 ? 'swing-pos' : 'swing-neg';
    html += `
      <div style="margin-top:12px; padding:8px; background:#f8fafc; border-radius:5px;">
        <div style="font-size:11px; color:#94a3b8; text-transform:uppercase; margin-bottom:6px;">2026 众议院（州层估算）</div>
        <div class="row"><span>2024 D / R</span><span class="v">${houseSt.d_2024} / ${houseSt.r_2024}</span></div>
        <div class="row"><span>2026 D / R 预测</span><span class="v">${houseSt.d_2026_proj.toFixed(1)} / ${houseSt.r_2026_proj.toFixed(1)}</span></div>
        <div class="row"><span>D 净增席位</span><span class="v ${swingClass}">${houseSt.expected_d_seat_change > 0 ? '+' : ''}${houseSt.expected_d_seat_change.toFixed(1)}</span></div>
      </div>
    `;
  }

  if (CURRENT_LAYER === 'senate2028') {
    html += `<div style="margin-top:12px; padding:8px; background:#fef3c7; border-radius:5px; font-size:12px; color:#78350f;">
      <b>2028 大选注意：</b> 候选人 / 提名 / 经济条件均未确定。Class III 改选预测需要 2028 春季的 Cook PVI 更新和初选数据，目前 dashboard 只能给地图示意，不做严肃预测。
    </div>`;
  }

  panel.innerHTML = html;
}

function renderMapSummary() {
  const cards = document.getElementById('map-summary-cards');
  if (CURRENT_LAYER === 'senate2026') {
    cards.innerHTML = `
      <div class="card"><div class="num">${(SENATE_DATA.majority_probability.D_majority_prob * 100).toFixed(0)}%</div><div class="lbl">D 拿到参议院多数概率</div></div>
      <div class="card"><div class="num">${SENATE_DATA.expected_seats_after_2026.D.toFixed(1)} / ${SENATE_DATA.expected_seats_after_2026.R.toFixed(1)}</div><div class="lbl">D / R 总席位预期</div></div>
      <div class="card"><div class="num">${SENATE_DATA.national_environment_d_pp_shift_vs_2024 > 0 ? '+' : ''}${SENATE_DATA.national_environment_d_pp_shift_vs_2024.toFixed(1)}pp</div><div class="lbl">国家环境 vs 2024（D 方向）</div></div>
    `;
  } else if (CURRENT_LAYER === 'house2026') {
    cards.innerHTML = `
      <div class="card"><div class="num">${HOUSE_DATA.totals_2026_projected.D.toFixed(0)} / ${HOUSE_DATA.totals_2026_projected.R.toFixed(0)}</div><div class="lbl">D / R 众议院席位预测</div></div>
      <div class="card"><div class="num">${HOUSE_DATA.net_d_seat_change > 0 ? '+' : ''}${HOUSE_DATA.net_d_seat_change.toFixed(0)}</div><div class="lbl">D 净增席位</div></div>
      <div class="card"><div class="num">${HOUSE_DATA.totals_2026_projected.D > 218 ? 'D' : 'R'} 控众议院</div><div class="lbl">多数党（>218 席）</div></div>
    `;
  } else if (CURRENT_LAYER === 'senate2028') {
    cards.innerHTML = `
      <div class="card" style="background:#fef3c7;"><div class="num" style="color:#78350f;">缺数据</div><div class="lbl">2028 候选人未定，无可信预测</div></div>
      <div class="card"><div class="num">~33</div><div class="lbl">Class III 席位（地图灰色标注）</div></div>
      <div class="card"><div class="num">~2027 Q4</div><div class="lbl">最早可做严肃预测的时间</div></div>
    `;
  }
}

function renderHouse(data) {
  const table = document.getElementById('house-table');
  const sorted = [...data.states].sort((a, b) => b.expected_d_seat_change - a.expected_d_seat_change);
  table.innerHTML = `
    <thead>
      <tr>
        <th>${t('house.col_state')}</th><th class="num">${t('house.col_pvi')}</th><th class="num">${t('house.col_total')}</th>
        <th class="num">${t('house.col_2024')}</th><th class="num">${t('house.col_2026')}</th><th class="num">${t('house.col_dchange')}</th>
      </tr>
    </thead>
    <tbody>
      ${sorted.map(s => {
        const swingCls = s.expected_d_seat_change > 0.1 ? 'swing-pos' : (s.expected_d_seat_change < -0.1 ? 'swing-neg' : '');
        const pviStr = s.pvi > 0 ? 'R+' + s.pvi : 'D+' + Math.abs(s.pvi);
        return `
        <tr>
          <td><b>${s.state}</b></td>
          <td class="num">${pviStr}</td>
          <td class="num">${s.total_seats}</td>
          <td class="num">${s.d_2024}/${s.r_2024}</td>
          <td class="num">${s.d_2026_proj.toFixed(1)}/${s.r_2026_proj.toFixed(1)}</td>
          <td class="num ${swingCls}">${s.expected_d_seat_change > 0 ? '+' : ''}${s.expected_d_seat_change.toFixed(1)}</td>
        </tr>`;
      }).join('')}
    </tbody>
  `;
}

// --- Subsequent election outcomes for each historical event (zh + en) ---
const HISTORICAL_ELECTORAL_OUTCOMES = {
  '1980_iran_iraq': {
    presidential: '<b>1980 总统大选</b>：卡特败给里根，普选 41% vs 50.7%（两党票 44.7% vs 55.3%），选举人团惨败 489-49。',
    presidential_en: '<b>1980 Presidential</b>: Carter lost to Reagan — popular vote 41% vs 50.7% (two-party 44.7% vs 55.3%); a catastrophic 489-49 Electoral College defeat.',
    midterm: '<b>1982 中期选举</b>：共和党在众议院净失 26 席（里根第一任经济衰退期；选举人团胜利后两年的反弹）。',
    midterm_en: '<b>1982 Midterms</b>: Republicans net lost 26 House seats (recession during Reagan\'s first term; backlash two years after his EC victory).'
  },
  '1990_gulf_war': {
    presidential: '<b>1992 总统大选</b>：Bush 41 败给克林顿，普选 37.4% vs 43%（两党票 46.5% vs 53.5%）。Bush 在 Desert Storm 后支持率高达 89%，但 18 个月后选民忘记军事胜利、记得经济衰退。Fair 模型这一年最著名失败案例。',
    presidential_en: '<b>1992 Presidential</b>: Bush 41 lost to Clinton — popular vote 37.4% vs 43% (two-party 46.5% vs 53.5%). Bush\'s post-Desert Storm approval reached 89%, but 18 months later voters had forgotten the military victory and remembered the recession. Fair model\'s most famous failure of that cycle.',
    midterm: '<b>1990 中期选举</b>（事件刚发生）：共和党净失 8 席，损失温和（rally 效应未完全消退）。但 1994 中期克林顿首任则净失 53 席（"共和党革命"），与 1990 油价冲击的累积通胀记忆有关。',
    midterm_en: '<b>1990 Midterms</b> (just after event): Republicans net lost 8 seats — modest (rally effect had not fully decayed). But in 1994, Clinton\'s first midterms saw Democrats lose 53 seats ("Republican Revolution"), partly tied to cumulative inflation memory from the 1990 oil shock.'
  },
  '2008_oil_peak': {
    presidential: '<b>2008 总统大选</b>：Obama 战胜 McCain，普选 52.9% vs 45.7%（两党票 53.7% vs 46.3%）。共和党开放席位 + 油价冲击 + 9 月 Lehman 崩盘三重打击。',
    presidential_en: '<b>2008 Presidential</b>: Obama defeated McCain — popular vote 52.9% vs 45.7% (two-party 53.7% vs 46.3%). Triple blow: Republican open seat + oil shock + September Lehman collapse.',
    midterm: '<b>2010 中期选举</b>：民主党净失 63 席（"茶党浪潮"），是 1948 年以来最大单届失席。油价冲击的累积效应跨越执政党更替。',
    midterm_en: '<b>2010 Midterms</b>: Democrats net lost 63 seats ("Tea Party wave") — the largest single-cycle loss since 1948. The oil shock\'s cumulative effect persisted across the change in incumbent party.'
  },
  '2022_russia_ukraine': {
    presidential: '<b>2024 总统大选</b>：Harris 败给 Trump，两党票 48.3% vs 51.7%。拜登退选；Harris 接棒。"累积价格记忆"效应：CPI 已回落到 3% 但选民记得自 2021 年以来累计涨价 20%+，无法翻盘。',
    presidential_en: '<b>2024 Presidential</b>: Harris lost to Trump — two-party 48.3% vs 51.7%. Biden withdrew; Harris took over. "Cumulative price memory" effect: CPI had moderated to 3% but voters remembered cumulative price increases of 20%+ since 2021 — no recovery possible.',
    midterm: '<b>2022 中期选举</b>（事件 9 个月后）：民主党净失 9 席（远低于历史均值 22 席）——Dobbs 判决（堕胎议题）动员民主党选民，部分抵消油价冲击。罕见的"非经济议题救场"案例。',
    midterm_en: '<b>2022 Midterms</b> (9 months after event): Democrats net lost 9 seats (far below the historical average of 22) — the Dobbs ruling (abortion) mobilized Democratic voters and partially offset the oil shock. A rare case of a non-economic issue rescuing the in-party.'
  }
};

// --- Historical analogue cards (rendered into Tab 4 history-grid) ---
function renderHistory(data) {
  const grid = document.getElementById('history-grid');
  if (!grid) return;
  const isEn = CURRENT_LANG === 'en';
  const pick = (zh, en) => (isEn && en) ? en : zh;
  // Localized field labels
  const labels = isEn
    ? { period: 'Period', oil: 'Oil start→peak', pct: 'Increase', gas: 'Gas start→peak', cpi: 'CPI YoY peak', ics: 'ICS drop', dropUnit: 'pts', outcomesH: 'Subsequent electoral outcomes', lessons: 'Implications for the current Hormuz crisis' }
    : { period: '事件期', oil: '油价 起→峰', pct: '涨幅', gas: '汽油 起→峰', cpi: 'CPI 同比峰', ics: 'ICS 跌幅', dropUnit: '点', outcomesH: '本次危机后的选举结果', lessons: '对当下霍尔木兹危机的启示' };
  grid.innerHTML = '';
  data.events.forEach(ev => {
    const card = document.createElement('div');
    card.className = 'history-card';
    const o = ev.oil_price;
    const m = ev.macro_transmission;
    const outcomes = HISTORICAL_ELECTORAL_OUTCOMES[ev.id] || {};
    const midtermText = pick(outcomes.midterm, outcomes.midterm_en);
    const presidentialText = pick(outcomes.presidential, outcomes.presidential_en);
    card.innerHTML = `
      <h3>${pick(ev.label, ev.label_en)}</h3>
      <div class="period">${labels.period}：${pick(ev.shock_period, ev.shock_period_en)}</div>
      <div class="ctx">${pick(ev.context, ev.context_en)}</div>
      <div class="stats">
        <div class="stat"><div class="stat-lbl">${labels.oil}</div><div class="stat-val">$${o.pre_shock_usd_bbl} → $${o.peak_usd_bbl}</div></div>
        <div class="stat"><div class="stat-lbl">${labels.pct}</div><div class="stat-val">+${o.pct_increase_peak}%</div></div>
        <div class="stat"><div class="stat-lbl">${labels.gas}</div><div class="stat-val">$${m.us_retail_gasoline_pre_usd_gal} → $${m.us_retail_gasoline_peak_usd_gal}</div></div>
        <div class="stat"><div class="stat-lbl">${labels.cpi}</div><div class="stat-val">${m.cpi_yoy_peak_pct}%</div></div>
        <div class="stat"><div class="stat-lbl">${labels.ics}</div><div class="stat-val">${m.ics_drop} ${labels.dropUnit}</div></div>
      </div>
      <div style="margin-top:14px; padding:12px; background:#f1f5f9; border-radius:5px; font-size:13px; line-height:1.65;">
        <div style="font-weight:600; color:#0f172a; margin-bottom:8px; font-size:11px; text-transform:uppercase; letter-spacing:0.5px;">${labels.outcomesH}</div>
        ${midtermText ? `<p style="margin-bottom:8px; color:#475569;">${midtermText}</p>` : ''}
        ${presidentialText ? `<p style="color:#475569;">${presidentialText}</p>` : ''}
      </div>
      <div class="lessons">📌 <b>${labels.lessons}</b>：${pick(ev.lessons_for_hormuz, ev.lessons_for_hormuz_en)}</div>
    `;
    grid.appendChild(card);
  });
}
