/* ========================================
   Supply Chain — page renderer
   ======================================== */

const STATE = {
  data: null,
  lang: localStorage.getItem('iran-lang') || 'zh'
};

let CURRENT_HUB_ID = null;

const STATUS_LABEL = {
  open: '未触发', triggered: '已触发', falsified: '已证伪', watching: '观察中'
};

const I18N = {
  zh: {
    'stance.label': '核心判断',
    'block.chains': '五条供应链',
    'hint.chains': '点击任一链查看详情',
    'block.hormuz': '霍尔木兹海峡的 4 种控制状态',
    'hint.hormuz': '伊朗政权状态决定通行方式 · 通行方式决定全球油价区间',
    'block.causal': '因果关系图',
    'hint.causal': '两个 hub · 点击节点查看深度分析',
    'block.worstcase': '最坏情景五阶段时间线',
    'hint.worstcase': '24 个月内发生概率 3-5%，但破坏量级是 1929+1973+2008+2020 综合',
    'block.countries': '国家政治脆弱性矩阵',
    'hint.countries': '11 国 · 按风险时间窗口排序 · 点击查看详情',
    'block.crosschain': '跨链反馈环',
    'hint.crosschain': '六条反馈环互相强化',
    'block.history': '1973 vs 2026 历史对照',
    'block.glossary': '术语表',
    'footer.text': '数据基线 2026-05-19 · 主要文献：CRS R45281 · EIA 海上 chokepoints · CSIS Cancian《Last Rounds》 · RAND Cohen 2026-04 · Hatzadony《Small Wars Journal》2026-05 · WEF DFC · Atlantic Council《Tehran\'s Toll Booth》 · CFR Setser · Chatham House Quilliam 2026-05 · INSS Guzansky 2026-02',
    'nav.hub': '← 沙盘母页',
    'nav.source': '原文报告',
    'drawer.tag.chain': '供应链',
    'drawer.tag.hormuz': '海峡控制状态',
    'drawer.tag.worstcase': '最坏情景阶段',
    'drawer.tag.country': '国家脆弱性',
    'drawer.tag.crosschain': '跨链反馈环',
    'drawer.tag.history': '历史对照',
    'drawer.thesis': '核心命题',
    'drawer.baseline': '当前基线',
    'drawer.scenarios_impact': '各情景下的影响',
    'drawer.key_data': '关键数据',
    'drawer.sources': '文献',
    'drawer.iran_scenario': '伊朗对应情景',
    'drawer.oil_passage': '油气通过率',
    'drawer.insurance': '保险市场',
    'drawer.events': '事件',
    'drawer.phase': '阶段',
    'drawer.thesis_label': '判断',
    'drawer.economic': '经济暴露',
    'drawer.political': '政治脆弱性',
    'drawer.upheaval': '可能动荡形式',
    'drawer.external': '外溢风险',
    'drawer.feedback_desc': '反馈描述',
    'drawer.applicability': '适用性',
    'drawer.narrative': '叙述',
    'history.current_judgment': '当前判断',
    'risk_window': '风险窗口'
  },
  en: {
    'stance.label': 'Core judgment',
    'block.chains': 'Five supply chains',
    'hint.chains': 'Click any chain for details',
    'block.hormuz': 'Four control states of the Strait of Hormuz',
    'hint.hormuz': 'Iran\'s regime state determines which control state · control state sets the global oil price range',
    'block.causal': 'Causal map',
    'hint.causal': 'Two analytical hubs · click any node for deep analysis',
    'block.worstcase': 'Worst-case five-stage timeline',
    'hint.worstcase': '3-5% probability over 24 months; damage scale = 1929 + 1973 + 2008 + 2020 combined',
    'block.countries': 'Country political fragility matrix',
    'hint.countries': '11 countries · sorted by risk window · click for details',
    'block.crosschain': 'Cross-chain feedback loops',
    'hint.crosschain': 'Six loops reinforce each other',
    'block.history': '1973 vs 2026 historical comparison',
    'block.glossary': 'Glossary',
    'footer.text': 'Baseline 2026-05-19 · Sources: CRS R45281 · EIA chokepoints · CSIS Cancian Last Rounds · RAND Cohen 2026-04 · Hatzadony Small Wars Journal 2026-05 · WEF DFC · Atlantic Council Tehran\'s Toll Booth · CFR Setser · Chatham House Quilliam 2026-05 · INSS Guzansky 2026-02',
    'nav.hub': '← Sandbox hub',
    'nav.source': 'Source report',
    'drawer.tag.chain': 'Chain',
    'drawer.tag.hormuz': 'Strait control state',
    'drawer.tag.worstcase': 'Worst-case stage',
    'drawer.tag.country': 'Country fragility',
    'drawer.tag.crosschain': 'Feedback loop',
    'drawer.tag.history': 'Historical precedent',
    'drawer.thesis': 'Core thesis',
    'drawer.baseline': 'Current baseline',
    'drawer.scenarios_impact': 'Impact by scenario',
    'drawer.key_data': 'Key data',
    'drawer.sources': 'Sources',
    'drawer.iran_scenario': 'Iran scenario',
    'drawer.oil_passage': 'Oil throughput',
    'drawer.insurance': 'Insurance market',
    'drawer.events': 'Events',
    'drawer.phase': 'Phase',
    'drawer.thesis_label': 'Thesis',
    'drawer.economic': 'Economic exposure',
    'drawer.political': 'Political fragility',
    'drawer.upheaval': 'Possible upheaval',
    'drawer.external': 'External spillover',
    'drawer.feedback_desc': 'Feedback description',
    'drawer.applicability': 'Applicability',
    'drawer.narrative': 'Narrative',
    'history.current_judgment': 'Current judgment',
    'risk_window': 'Risk window'
  }
};

function t(key) { return (I18N[STATE.lang] && I18N[STATE.lang][key]) || I18N.zh[key] || key; }

async function init() {
  try {
    let res = await fetch(`./data/supply.${STATE.lang}.json`);
    if (!res.ok && STATE.lang === 'en') {
      console.warn('English data not available, falling back to Chinese');
      res = await fetch('./data/supply.zh.json');
    }
    if (!res.ok) throw new Error('Data load failed HTTP ' + res.status);
    STATE.data = await res.json();
    applyI18n();
    renderHeader();
    renderStance();
    renderChains();
    renderHormuzModes();
    renderHubs();
    renderWorstCase();
    renderCountries();
    renderCrossChain();
    renderHistoryCompare();
    renderGlossary();
    setupDrawerControls();
    setupLangToggle();
  } catch (e) {
    console.error('Init failed:', e);
    document.querySelector('.container').innerHTML =
      '<div style="color:#ff3b30;padding:40px;text-align:center;">' +
      (STATE.lang === 'en' ? 'Init failed: ' : '初始化失败：') + e.message + '</div>';
  }
}

function applyI18n() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const dict = I18N[STATE.lang] || I18N.zh;
    if (dict && Object.prototype.hasOwnProperty.call(dict, key)) {
      el.textContent = dict[key];
    } else if (I18N.zh && Object.prototype.hasOwnProperty.call(I18N.zh, key)) {
      el.textContent = I18N.zh[key];
    }
  });
  document.documentElement.lang = STATE.lang === 'en' ? 'en' : 'zh-CN';
}

function setupLangToggle() {
  const btn = document.getElementById('lang-toggle');
  if (!btn) return;
  btn.addEventListener('click', () => {
    STATE.lang = STATE.lang === 'zh' ? 'en' : 'zh';
    localStorage.setItem('iran-lang', STATE.lang);
    location.reload();
  });
  btn.textContent = STATE.lang === 'zh' ? 'EN' : '中';
}

function renderHeader() {
  const m = STATE.data.meta;
  document.getElementById('hdr-title').textContent = m.title;
  document.getElementById('hdr-sub').textContent = m.subtitle;
  document.getElementById('last-updated').textContent = (STATE.lang === 'en' ? 'Baseline ' : '基线 ') + m.baseline_date;
}

function renderStance() {
  document.getElementById('stance-text').innerHTML = formatRichText(STATE.data.meta.stance_summary, 'stance-para');
}

function formatRichText(text, paraClass) {
  if (!text) return '';
  const renderInline = (s) => escapeHtml(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  return text.split(/\n\n+/).map(block => {
    const lines = block.split('\n');
    let html = '';
    let para = [];
    let listType = null;
    let items = [];
    const flushPara = () => {
      if (para.length) {
        html += `<p class="${paraClass}">${para.map(renderInline).join('<br>')}</p>`;
        para = [];
      }
    };
    const flushList = () => {
      if (items.length) {
        const tag = listType;
        html += `<${tag} class="rich-list">${items.map(i => `<li>${renderInline(i)}</li>`).join('')}</${tag}>`;
        items = [];
        listType = null;
      }
    };
    for (const line of lines) {
      const t = line.trim();
      if (!t) continue;
      const ul = /^[-•]\s+(.*)/.exec(t);
      const ol = /^\d+\.\s+(.*)/.exec(t);
      if (ul) {
        flushPara();
        if (listType !== 'ul') { flushList(); listType = 'ul'; }
        items.push(ul[1]);
      } else if (ol) {
        flushPara();
        if (listType !== 'ol') { flushList(); listType = 'ol'; }
        items.push(ol[1]);
      } else {
        flushList();
        para.push(t);
      }
    }
    flushPara();
    flushList();
    return html;
  }).join('');
}

/* ============ Chains ============ */

function renderChains() {
  const c = document.getElementById('chains-grid');
  c.innerHTML = '';
  STATE.data.chains.forEach((ch, i) => {
    const card = document.createElement('button');
    card.className = `chain-card color-${ch.color}`;
    card.innerHTML = `
      <div class="chain-num">C0${i+1}</div>
      <div class="chain-name">${escapeHtml(ch.name)}</div>
      <div class="chain-name-en">${escapeHtml(ch.name_en || '')}</div>
      <div class="chain-thesis">${escapeHtml(ch.thesis)}</div>
    `;
    card.addEventListener('click', () => openChainDrawer(i));
    c.appendChild(card);
  });
}

function openChainDrawer(i) {
  const ch = STATE.data.chains[i];
  setDrawer(t('drawer.tag.chain'), `
    <h2 class="d-title">${escapeHtml(ch.name)}${ch.name_en ? ` · <span style="color:var(--label-3);font-weight:500">${escapeHtml(ch.name_en)}</span>` : ''}</h2>
    <p class="d-summary">${escapeHtml(ch.thesis)}</p>
    ${ch.analysis ? `<div class="d-section"><div class="d-section-label">${STATE.lang === 'en' ? 'Analysis' : '深度分析'}</div><div class="d-prose">${formatRichText(ch.analysis, 'd-para')}</div></div>` : ''}
    <div class="d-section"><div class="d-section-label">${t('drawer.baseline')}</div><div class="d-prose">${escapeHtml(ch.current_baseline)}</div></div>
    <div class="d-section"><div class="d-section-label">${t('drawer.scenarios_impact')}</div><div class="d-prose">${formatRichText(ch.scenarios_impact, 'd-para')}</div></div>
    <div class="d-section"><div class="d-section-label">${t('drawer.key_data')}</div><ul class="evidence-list">${(ch.key_data || []).map(d => `<li class="evidence-item">${escapeHtml(d)}</li>`).join('')}</ul></div>
    ${renderDrawerSources(ch.sources)}
  `);
}

/* ============ Hormuz modes ============ */

function renderHormuzModes() {
  const c = document.getElementById('hormuz-grid');
  c.innerHTML = '';
  STATE.data.hormuz_modes.forEach((m, i) => {
    const card = document.createElement('button');
    card.className = `hormuz-card color-${m.color}`;
    card.innerHTML = `
      <div class="hormuz-scenario">${escapeHtml(m.iran_scenario)}</div>
      <div class="hormuz-name">${escapeHtml(m.name)}</div>
      ${m.subtitle ? `<div class="hormuz-subtitle">${escapeHtml(m.subtitle)}</div>` : ''}
      <div class="hormuz-metric"><span>${t('drawer.oil_passage')}</span><strong>${escapeHtml(m.global_oil_passage)}</strong></div>
    `;
    card.addEventListener('click', () => openHormuzDrawer(i));
    c.appendChild(card);
  });
}

function openHormuzDrawer(i) {
  const m = STATE.data.hormuz_modes[i];
  setDrawer(t('drawer.tag.hormuz'), `
    <div class="d-status-row">
      <span class="d-actor-badge">${escapeHtml(m.iran_scenario)}</span>
    </div>
    <h2 class="d-title">${escapeHtml(m.name)}</h2>
    ${m.subtitle ? `<p class="d-summary">${escapeHtml(m.subtitle)}</p>` : ''}
    <div class="d-section"><div class="d-section-label">${STATE.lang === 'en' ? 'Thesis' : '核心命题'}</div><div class="d-prose">${escapeHtml(m.thesis)}</div></div>
    ${m.analysis ? `<div class="d-section"><div class="d-section-label">${STATE.lang === 'en' ? 'Deep analysis' : '深度分析'}</div><div class="d-prose">${formatRichText(m.analysis, 'd-para')}</div></div>` : ''}
    <div class="d-section"><div class="d-section-label">${t('drawer.oil_passage')}</div><div class="d-callout">${escapeHtml(m.global_oil_passage)}</div></div>
    <div class="d-section"><div class="d-section-label">${t('drawer.insurance')}</div><div class="d-callout">${escapeHtml(m.insurance)}</div></div>
    ${renderDrawerSources(m.sources)}
  `);
}

/* ============ Worst case timeline ============ */

function renderWorstCase() {
  const c = document.getElementById('worstcase-timeline');
  c.innerHTML = '';
  STATE.data.worst_case_timeline.forEach((s, i) => {
    const row = document.createElement('button');
    row.className = `worstcase-row color-${s.color}`;
    row.innerHTML = `
      <div class="worstcase-stage">
        <div class="worstcase-day">${escapeHtml(s.stage)}</div>
        <div class="worstcase-phase">${escapeHtml(s.phase)}</div>
      </div>
      <div class="worstcase-preview">${escapeHtml(s.events.substring(0, 120))}…</div>
    `;
    row.addEventListener('click', () => openWorstCaseDrawer(i));
    c.appendChild(row);
  });
}

function openWorstCaseDrawer(i) {
  const s = STATE.data.worst_case_timeline[i];
  setDrawer(t('drawer.tag.worstcase'), `
    <div class="d-status-row">
      <span class="d-actor-badge">${escapeHtml(s.stage)}</span>
    </div>
    <h2 class="d-title">${escapeHtml(s.phase)}</h2>
    <div class="d-section"><div class="d-section-label">${t('drawer.events')}</div><div class="d-prose">${formatRichText(s.events, 'd-para')}</div></div>
    ${renderDrawerSources(s.sources)}
  `);
}

/* ============ Countries ============ */

function renderCountries() {
  const c = document.getElementById('countries-grid');
  c.innerHTML = '';
  STATE.data.countries.forEach((co, i) => {
    const card = document.createElement('button');
    card.className = `country-card color-${co.color}`;
    card.innerHTML = `
      <div class="country-window">${escapeHtml(co.risk_window)}</div>
      <div class="country-name">${escapeHtml(co.name)}</div>
      <div class="country-name-en">${escapeHtml(co.name_en || '')}</div>
      <div class="country-thesis">${escapeHtml(co.thesis)}</div>
    `;
    card.addEventListener('click', () => openCountryDrawer(i));
    c.appendChild(card);
  });
}

function openCountryDrawer(i) {
  const co = STATE.data.countries[i];
  setDrawer(t('drawer.tag.country'), `
    <div class="d-status-row">
      <span class="d-actor-badge">${escapeHtml(co.risk_window)}</span>
    </div>
    <h2 class="d-title">${escapeHtml(co.name)}${co.name_en ? ` · <span style="color:var(--label-3);font-weight:500">${escapeHtml(co.name_en)}</span>` : ''}</h2>
    <p class="d-summary">${escapeHtml(co.thesis)}</p>
    ${co.analysis ? `<div class="d-section"><div class="d-section-label">${STATE.lang === 'en' ? 'Deep analysis' : '深度分析'}</div><div class="d-prose">${formatRichText(co.analysis, 'd-para')}</div></div>` : ''}
    <div class="d-section"><div class="d-section-label">${t('drawer.economic')}</div><ul class="evidence-list">${(co.economic_exposure || []).map(d => `<li class="evidence-item">${escapeHtml(d)}</li>`).join('')}</ul></div>
    <div class="d-section"><div class="d-section-label">${t('drawer.political')}</div><ul class="evidence-list">${(co.political_fragility || []).map(d => `<li class="evidence-item">${escapeHtml(d)}</li>`).join('')}</ul></div>
    <div class="d-section"><div class="d-section-label">${t('drawer.upheaval')}</div><div class="d-prose">${formatRichText(co.upheaval_scenarios, 'd-para')}</div></div>
    ${co.external_risk ? `<div class="d-section"><div class="d-section-label">${t('drawer.external')}</div><div class="d-significance">${escapeHtml(co.external_risk)}</div></div>` : ''}
    ${renderDrawerSources(co.sources)}
  `);
}

/* ============ Cross-chain feedback ============ */

function renderCrossChain() {
  const c = document.getElementById('crosschain');
  c.innerHTML = '';
  STATE.data.cross_chain_feedback.forEach((f, i) => {
    const row = document.createElement('button');
    row.className = 'crosschain-row';
    row.innerHTML = `
      <div class="crosschain-num">F0${i+1}</div>
      <div class="crosschain-name">${escapeHtml(f.name)}</div>
      <div class="crosschain-arrow">→</div>
      <div class="crosschain-desc">${escapeHtml(f.description.substring(0, 100))}…</div>
    `;
    row.addEventListener('click', () => openCrossChainDrawer(i));
    c.appendChild(row);
  });
}

function openCrossChainDrawer(i) {
  const f = STATE.data.cross_chain_feedback[i];
  setDrawer(t('drawer.tag.crosschain'), `
    <h2 class="d-title">${escapeHtml(f.name)}</h2>
    <div class="d-section"><div class="d-section-label">${t('drawer.feedback_desc')}</div><div class="d-prose">${formatRichText(f.description, 'd-para')}</div></div>
    ${renderDrawerSources(f.sources)}
  `);
}

/* ============ Hubs (hub-spoke + SVG pipes) ============ */

function renderHubs() {
  const tabsEl = document.getElementById('hub-tabs');
  const viewEl = document.getElementById('conn-view');
  if (!tabsEl || !viewEl || !STATE.data.hubs) return;

  tabsEl.innerHTML = '';
  STATE.data.hubs.forEach((h, i) => {
    const btn = document.createElement('button');
    btn.className = 'scenario-tab';
    btn.dataset.hubId = h.id;
    btn.textContent = h.name;
    btn.addEventListener('click', () => selectHub(h.id));
    tabsEl.appendChild(btn);
    if (i === 0) CURRENT_HUB_ID = h.id;
  });

  selectHub(CURRENT_HUB_ID);
}

function selectHub(id) {
  CURRENT_HUB_ID = id;
  document.querySelectorAll('#hub-tabs .scenario-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.hubId === id);
  });
  const hub = STATE.data.hubs.find(h => h.id === id);
  if (!hub) return;

  document.getElementById('hub-summary').textContent = hub.summary || hub.thesis || '';
  renderConnectionView(hub);
}

function consequenceBadge(c) {
  if (c.actor) return escapeHtml(c.actor);
  if (typeof c.weight === 'number') return Math.round(c.weight * 100) + '%';
  return '';
}

function renderConnectionView(s) {
  const mech = s.mechanisms && s.mechanisms[0] ? s.mechanisms[0].label : '';
  const viewEl = document.getElementById('conn-view');

  let html = `
    <div class="conn-view color-${s.color}">
      <div class="conn-flow">
        <div class="conn-col conn-col-pre">
          <div class="conn-col-label conn-label-blue">${STATE.lang === 'en' ? 'Preconditions' : '前提条件'} · ${s.preconditions.length}</div>
          ${s.preconditions.map((p, i) => `
            <button class="conn-card conn-card-blue" data-card-type="precondition" data-card-index="${i}">
              <div class="conn-card-label">${escapeHtml(p.label)}</div>
              ${p.status ? `<div class="pre-status-badge status-${p.status}">${STATUS_LABEL[p.status] || p.status}</div>` : ''}
            </button>`).join('')}
        </div>
        <div class="conn-col conn-col-hub">
          <button class="conn-source-card" data-card-type="hub" data-card-index="0">
            <div class="conn-source-tag">${STATE.lang === 'en' ? 'Hub' : '中心'}</div>
            <div class="conn-source-name">${escapeHtml(s.name)}</div>
            ${mech ? `<div class="conn-source-mech"><div class="conn-source-mech-label">${STATE.lang === 'en' ? 'Mechanism' : '运作机制'}</div><div class="conn-source-mech-text">${escapeHtml(mech)}</div></div>` : ''}
          </button>
        </div>
        <div class="conn-col conn-col-con">
          <div class="conn-col-label conn-label-orange">${STATE.lang === 'en' ? 'Consequences' : '可能后果'} · ${s.consequences.length}</div>
          ${s.consequences.map((c, i) => {
            const badge = consequenceBadge(c);
            return `<button class="conn-card conn-card-orange" data-card-type="consequence" data-card-index="${i}">
              <div class="conn-card-label">${escapeHtml(c.label)}</div>
              ${badge ? `<div class="conn-card-badge">${badge}</div>` : ''}
            </button>`;
          }).join('')}
        </div>
        <svg class="conn-pipes" preserveAspectRatio="none"></svg>
      </div>
      ${s.observations && s.observations.length > 0 ? `
      <div class="conn-obs-row">
        <div class="conn-obs-header">
          <span class="conn-obs-marker"></span>
          <span class="conn-obs-title">${STATE.lang === 'en' ? 'Monitor these events' : '监测以下事件 → 触发条件状态更新'}</span>
        </div>
        <div class="conn-obs-cards">
          ${s.observations.map((o, i) => `
            <button class="conn-card conn-card-yellow conn-obs-card" data-card-type="hub_observation" data-card-index="${i}">
              <div class="conn-card-label">${escapeHtml(o.label)}</div>
              ${o.status ? `<div class="pre-status-badge status-${o.status}">${STATUS_LABEL[o.status] || o.status}</div>` : ''}
            </button>`).join('')}
        </div>
      </div>` : ''}
    </div>`;

  viewEl.innerHTML = html;
  setTimeout(() => {
    drawPipes();
    attachHubCardHandlers();
  }, 40);
}

function drawPipes() {
  const view = document.querySelector('.conn-view');
  if (!view) return;
  const flow = view.querySelector('.conn-flow');
  const hub = view.querySelector('.conn-source-card');
  const svg = view.querySelector('.conn-pipes');
  if (!flow || !hub || !svg) return;

  const flowRect = flow.getBoundingClientRect();
  const hubRect = hub.getBoundingClientRect();
  const w = flowRect.width;
  const h = flowRect.height;

  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  svg.setAttribute('width', w);
  svg.setAttribute('height', h);

  const hubLeftX = hubRect.left - flowRect.left;
  const hubRightX = hubRect.right - flowRect.left;
  const hubCenterY = hubRect.top + hubRect.height / 2 - flowRect.top;

  const paths = [];
  view.querySelectorAll('[data-card-type="precondition"]').forEach(card => {
    const r = card.getBoundingClientRect();
    const sx = r.right - flowRect.left;
    const sy = r.top + r.height / 2 - flowRect.top;
    const tx = hubLeftX;
    const ty = hubCenterY;
    const midX = sx + (tx - sx) * 0.55;
    const d = `M ${sx} ${sy} C ${midX} ${sy}, ${midX} ${ty}, ${tx} ${ty}`;
    paths.push(`<path d="${d}" stroke="#0071e3" stroke-width="4" fill="none" opacity="0.38" stroke-linecap="round"/>`);
  });
  view.querySelectorAll('[data-card-type="consequence"]').forEach(card => {
    const r = card.getBoundingClientRect();
    const sx = hubRightX;
    const sy = hubCenterY;
    const tx = r.left - flowRect.left;
    const ty = r.top + r.height / 2 - flowRect.top;
    const midX = sx + (tx - sx) * 0.45;
    const d = `M ${sx} ${sy} C ${midX} ${sy}, ${midX} ${ty}, ${tx} ${ty}`;
    paths.push(`<path d="${d}" stroke="#ff9500" stroke-width="4" fill="none" opacity="0.38" stroke-linecap="round"/>`);
  });
  svg.innerHTML = paths.join('');
}

window.addEventListener('resize', () => {
  clearTimeout(window._pipeRedraw);
  window._pipeRedraw = setTimeout(drawPipes, 100);
});

function attachHubCardHandlers() {
  document.querySelectorAll('#conn-view [data-card-type]').forEach(el => {
    el.addEventListener('click', () => {
      const type = el.dataset.cardType;
      const idx = parseInt(el.dataset.cardIndex, 10);
      openHubNodeDrawer(type, idx);
    });
  });
}

function openHubNodeDrawer(type, idx) {
  const hub = STATE.data.hubs.find(h => h.id === CURRENT_HUB_ID);
  if (!hub) return;

  if (type === 'precondition') {
    const p = hub.preconditions[idx];
    setDrawer(STATE.lang === 'en' ? 'Precondition' : '前提条件', `
      <div class="d-status-row">
        ${p.status ? `<span class="pre-status-badge status-${p.status}">${STATUS_LABEL[p.status] || p.status}</span>` : ''}
      </div>
      <h2 class="d-title">${escapeHtml(p.label)}</h2>
      ${p.analysis ? `<div class="d-section"><div class="d-section-label">${STATE.lang === 'en' ? 'Analysis' : '分析'}</div><div class="d-prose">${formatRichText(p.analysis, 'd-para')}</div></div>` : ''}
      ${renderDrawerSources(p.sources)}
    `);
  } else if (type === 'consequence') {
    const c = hub.consequences[idx];
    const badge = consequenceBadge(c);
    setDrawer(STATE.lang === 'en' ? 'Consequence' : '可能后果', `
      <div class="d-status-row">
        ${badge ? `<span class="d-actor-badge">${badge}</span>` : ''}
      </div>
      <h2 class="d-title">${escapeHtml(c.label)}</h2>
      ${c.analysis ? `<div class="d-section"><div class="d-section-label">${STATE.lang === 'en' ? 'Analysis' : '分析'}</div><div class="d-prose">${formatRichText(c.analysis, 'd-para')}</div></div>` : ''}
      ${renderDrawerSources(c.sources)}
    `);
  } else if (type === 'hub') {
    setDrawer(STATE.lang === 'en' ? 'Hub overview' : '中心概览', `
      <h2 class="d-title">${escapeHtml(hub.name)}</h2>
      ${hub.thesis ? `<p class="d-summary">${escapeHtml(hub.thesis)}</p>` : ''}
      ${hub.logic ? `<div class="d-section"><div class="d-section-label">${STATE.lang === 'en' ? 'Logic' : '前提关系'}</div><div class="d-prose">${formatRichText(hub.logic, 'd-para')}</div></div>` : ''}
      ${hub.mechanisms && hub.mechanisms.length > 0 ? hub.mechanisms.map(m => `
        <div class="d-section"><div class="d-section-label">${STATE.lang === 'en' ? 'Mechanism' : '运作机制'}</div><div class="d-prose"><strong>${escapeHtml(m.label)}</strong><br><br>${formatRichText(m.analysis || m.description || '', 'd-para')}</div></div>
      `).join('') : ''}
    `);
  } else if (type === 'hub_observation') {
    const o = hub.observations[idx];
    setDrawer(STATE.lang === 'en' ? 'Observation' : '观察节点', `
      <div class="d-status-row">
        ${o.status ? `<span class="pre-status-badge status-${o.status}">${STATUS_LABEL[o.status] || o.status}</span>` : ''}
        ${o.last_check ? `<span class="d-meta">${STATE.lang === 'en' ? 'Last' : '最近核查'} · ${escapeHtml(o.last_check)}</span>` : ''}
      </div>
      <h2 class="d-title">${escapeHtml(o.label)}</h2>
      ${o.summary ? `<p class="d-summary">${escapeHtml(o.summary)}</p>` : ''}
      ${o.threshold ? `<div class="d-section"><div class="d-section-label">${STATE.lang === 'en' ? 'Threshold' : '触发门槛'}</div><div class="d-callout">${escapeHtml(o.threshold)}</div></div>` : ''}
      ${o.analysis ? `<div class="d-section"><div class="d-section-label">${STATE.lang === 'en' ? 'Analysis' : '分析'}</div><div class="d-prose">${formatRichText(o.analysis, 'd-para')}</div></div>` : ''}
      ${renderDrawerSources(o.sources)}
    `);
  }
}

/* ============ History compare ============ */

function renderHistoryCompare() {
  const c = document.getElementById('history-compare');
  const h = STATE.data.history_compare;
  let html = '';
  if (h.intro) html += `<p class="history-intro">${escapeHtml(h.intro)}</p>`;
  html += '<div class="history-grid">';
  h.scenarios.forEach((s, i) => {
    html += `<button class="history-card" data-card-index="${i}">
      <div class="history-year">${escapeHtml(s.year)}</div>
      <div class="history-label">${escapeHtml(s.label)}</div>
      <div class="history-preview">${escapeHtml(s.narrative.substring(0, 200))}…</div>
    </button>`;
  });
  html += '</div>';
  html += `<div class="history-key-diff">
    <div class="label">${t('history.current_judgment')}</div>
    ${escapeHtml(h.current_judgment)}
  </div>`;
  c.innerHTML = html;
  document.querySelectorAll('#history-compare .history-card').forEach(el => {
    el.addEventListener('click', () => openHistoryDrawer(parseInt(el.dataset.cardIndex, 10)));
  });
}

function openHistoryDrawer(i) {
  const s = STATE.data.history_compare.scenarios[i];
  setDrawer(t('drawer.tag.history') + ' · ' + s.year, `
    <h2 class="d-title">${escapeHtml(s.label)}</h2>
    <div class="d-section"><div class="d-section-label">${t('drawer.narrative')}</div><div class="d-prose">${formatRichText(s.narrative, 'd-para')}</div></div>
    <div class="d-section"><div class="d-section-label">${t('drawer.applicability')}</div><div class="d-prose">${formatRichText(s.applicability, 'd-para')}</div></div>
  `);
}

/* ============ Glossary ============ */

function renderGlossary() {
  const c = document.getElementById('glossary');
  if (!STATE.data.glossary) return;
  let html = '<div class="glossary-grid">';
  STATE.data.glossary.forEach(g => {
    html += `<div class="glossary-item">
      <div class="g-term"><span class="g-zh">${escapeHtml(g.zh)}</span><span class="g-en">${escapeHtml(g.en)}</span></div>
      <div class="g-note">${escapeHtml(g.note)}</div>
    </div>`;
  });
  html += '</div>';
  c.innerHTML = html;
}

/* ============ Drawer ============ */

function setDrawer(tag, html) {
  document.getElementById('drawer-tag').textContent = tag;
  document.getElementById('drawer-body').innerHTML = html;
  document.getElementById('drawer').classList.add('open');
  document.getElementById('drawer-backdrop').classList.add('open');
  document.getElementById('drawer').setAttribute('aria-hidden', 'false');
  document.getElementById('drawer-body').scrollTop = 0;
}

function closeDrawer() {
  document.getElementById('drawer').classList.remove('open');
  document.getElementById('drawer-backdrop').classList.remove('open');
  document.getElementById('drawer').setAttribute('aria-hidden', 'true');
}

function setupDrawerControls() {
  document.getElementById('drawer-close').addEventListener('click', closeDrawer);
  document.getElementById('drawer-backdrop').addEventListener('click', closeDrawer);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDrawer(); });
}

function renderDrawerSources(sources) {
  if (!sources || sources.length === 0) return '';
  let html = `<div class="d-section"><div class="d-section-label">${t('drawer.sources')}</div><div class="d-sources">`;
  sources.forEach(s => {
    html += `<a href="${escapeHtml(s.url)}" target="_blank" rel="noopener" class="d-source-link">
      <span class="d-source-arrow">↗</span><span>${escapeHtml(s.label)}</span></a>`;
  });
  html += '</div></div>';
  return html;
}

function escapeHtml(s) {
  if (s == null) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
