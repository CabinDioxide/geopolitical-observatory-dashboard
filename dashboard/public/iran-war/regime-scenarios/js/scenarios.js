/* ========================================
   Iran Regime Scenarios — structured report cards
   ======================================== */

const STATE = {
  data: null,
  currentScenarioId: 'continuity',
  obsFilter: 'all',
  lang: localStorage.getItem('iran-lang') || 'zh'
};

const I18N = {
  zh: {
    'stance.label': '核心判断',
    'block.methodology': '概率怎么算的',
    'block.methodology.btn': '概率怎么算的 →',
    'methodology.formula': '公式',
    'methodology.prior': '历史先验',
    'methodology.op': '×',
    'methodology.factor': '削弱/加强因子',
    'methodology.result': '当前估计',
    'methodology.priorKey': '历史先验：',
    'methodology.factorKey': '削弱因子：',
    'block.probability': '四种走向，各占多少概率',
    'hint.probability': '点击任一行切换情景',
    'block.scenarios': '情景详情',
    'block.observations': '所有观察节点',
    'hint.observations': '事件触发 → 更新数据 → 重新部署',
    'block.history': '1991 苏联对照',
    'block.glossary': '术语表',
    'tracker.col.node': '观察节点',
    'tracker.col.scenario': '情景',
    'tracker.col.status': '状态',
    'tracker.col.threshold': '触发门槛',
    'tracker.col.lastcheck': '最近核查',
    'filter.all': '全部',
    'filter.open': '未触发',
    'filter.triggered': '已触发',
    'filter.falsified': '已证伪',
    'status.open': '未触发',
    'status.triggered': '已触发',
    'status.falsified': '已证伪',
    'nav.iranwar': '伊朗战争分析',
    'nav.source': '原文报告',
    'nav.baseline': '基线',
    'card.causal': '因果关系图',
    'card.causal.hint': '情景 → 条件 / 机制 / 后果 / 观察节点',
    'card.prob': '概率计算',
    'card.preconditions': '前提条件',
    'card.mechanisms': '运作机制',
    'card.consequences': '可能后果',
    'card.consequences.hint': '按行为主体分组',
    'card.observations': '关键观察节点',
    'conn.precondition': '触发条件',
    'conn.precondition.and': '项 AND',
    'conn.mechanism': '运作机制',
    'conn.mechanism.unit': '条',
    'conn.consequence': '可能后果',
    'conn.consequence.unit': '项',
    'conn.observation': '观察节点',
    'conn.observation.unit': '个',
    'conn.scenario': '情景',
    'conn.mech.label': '运作机制',
    'conn.obs.title': '监测以下事件 → 更新条件状态',
    'calc.prior': '历史先验',
    'calc.factor': '削弱因子',
    'calc.factor.boost': '加强因子',
    'calc.result': '当前估计',
    'calc.op.down': '下调',
    'calc.op.up': '上调',
    'pre.num.prefix': '条件 ',
    'pre.evidence': '当前证据：',
    'history.col.soviet': '苏联节点',
    'history.col.iran': '对应伊朗节点',
    'history.keydiff': '关键差异',
    'drawer.tag.precondition': '触发条件',
    'drawer.tag.consequence': '可能后果',
    'drawer.tag.observation': '观察节点',
    'drawer.tag.scenario': '情景概览',
    'drawer.analysis': '分析',
    'drawer.explanation': '解释',
    'drawer.evidence': '当前证据',
    'drawer.description': '详细描述',
    'drawer.threshold': '触发门槛',
    'drawer.significance': '信号意义',
    'drawer.sources': '文献',
    'drawer.lastcheck': '最近核查',
    'drawer.probcalc': '概率计算',
    'drawer.mech.label': '运作机制',
    'drawer.close.label': '关闭',
    'drawer.empty.line1': '点击图中任一节点',
    'drawer.empty.line2': '查看完整论证与文献',
    'drawer.empty.hint': '蓝色虚框：节点尚有下游可展开',
    'drawer.children.expand': '点击节点：展开下游',
    'drawer.children.collapse': '再次点击：收起下游',
    'footer.baseline': '数据基线',
    'footer.sources': '主要文献',
    'block.time_anchors': '3 个关键时间锚',
    'hint.time_anchors': '下面 18 个月决定整体走向的 3 个时间窗口',
    'block.variables': '7 个相互制约的变量',
    'hint.variables': '分 3 组：结构性背景 / 当下状态 / 短期动作 · 点击任一变量查看完整因果链',
    'block.evolution': '演化路径（2026-05 至 2028+）',
    'hint.evolution': '4 个阶段的最可能演化',
    'block.worst_case': '最坏情景：瓦解 + 海上无政府',
    'hint.worst_case': '24 月内概率 3-5%，破坏量级是 1929 + 1973 + 2008 + 2020 叠加'
  },
  en: {
    'stance.label': 'Core judgment',
    'block.methodology': 'How probabilities are computed',
    'block.methodology.btn': 'How probabilities are computed →',
    'methodology.formula': 'Formula',
    'methodology.prior': 'Historical prior',
    'methodology.op': '×',
    'methodology.factor': 'Weakening / boosting factor',
    'methodology.result': 'Current estimate',
    'methodology.priorKey': 'Historical prior: ',
    'methodology.factorKey': 'Weakening factor: ',
    'block.probability': 'Four paths and their probabilities',
    'hint.probability': 'Click any row to switch scenario',
    'block.scenarios': 'Scenario detail',
    'block.observations': 'All observation nodes',
    'hint.observations': 'Event triggers → update data → redeploy',
    'block.history': '1991 Soviet comparison',
    'block.glossary': 'Glossary',
    'tracker.col.node': 'Observation node',
    'tracker.col.scenario': 'Scenario',
    'tracker.col.status': 'Status',
    'tracker.col.threshold': 'Trigger threshold',
    'tracker.col.lastcheck': 'Last checked',
    'filter.all': 'All',
    'filter.open': 'Not triggered',
    'filter.triggered': 'Triggered',
    'filter.falsified': 'Falsified',
    'status.open': 'Not triggered',
    'status.triggered': 'Triggered',
    'status.falsified': 'Falsified',
    'nav.iranwar': 'Iran War analysis',
    'nav.source': 'Source report',
    'nav.baseline': 'Baseline',
    'card.causal': 'Causal map',
    'card.causal.hint': 'Scenario → conditions / mechanism / consequences / observations',
    'card.prob': 'Probability calculation',
    'card.preconditions': 'Preconditions',
    'card.mechanisms': 'Mechanism',
    'card.consequences': 'Likely consequences',
    'card.consequences.hint': 'Grouped by actor',
    'card.observations': 'Key observation nodes',
    'conn.precondition': 'Preconditions',
    'conn.precondition.and': ' (AND)',
    'conn.mechanism': 'Mechanism',
    'conn.mechanism.unit': '',
    'conn.consequence': 'Consequences',
    'conn.consequence.unit': '',
    'conn.observation': 'Observations',
    'conn.observation.unit': '',
    'conn.scenario': 'Scenario',
    'conn.mech.label': 'Mechanism',
    'conn.obs.title': 'Monitor these events → update precondition status',
    'calc.prior': 'Historical prior',
    'calc.factor': 'Weakening factor',
    'calc.factor.boost': 'Boosting factor',
    'calc.result': 'Current estimate',
    'calc.op.down': 'Down',
    'calc.op.up': 'Up',
    'pre.num.prefix': 'Condition ',
    'pre.evidence': 'Current evidence: ',
    'history.col.soviet': 'Soviet node',
    'history.col.iran': 'Iran counterpart',
    'history.keydiff': 'Key difference',
    'drawer.tag.precondition': 'Precondition',
    'drawer.tag.consequence': 'Consequence',
    'drawer.tag.observation': 'Observation',
    'drawer.tag.scenario': 'Scenario overview',
    'drawer.analysis': 'Analysis',
    'drawer.explanation': 'Explanation',
    'drawer.evidence': 'Current evidence',
    'drawer.description': 'Description',
    'drawer.threshold': 'Trigger threshold',
    'drawer.significance': 'Signal significance',
    'drawer.sources': 'Sources',
    'drawer.lastcheck': 'Last checked',
    'drawer.probcalc': 'Probability calculation',
    'drawer.mech.label': 'Mechanism',
    'drawer.close.label': 'Close',
    'drawer.empty.line1': 'Click any node in the map',
    'drawer.empty.line2': 'to view full reasoning and sources',
    'drawer.empty.hint': 'Blue dashed border: this node has more downstream',
    'drawer.children.expand': 'Click node: expand downstream',
    'drawer.children.collapse': 'Click again: collapse downstream',
    'footer.baseline': 'Data baseline',
    'footer.sources': 'Primary sources',
    'block.time_anchors': '3 key time anchors',
    'hint.time_anchors': 'The three 18-month windows that determine the overall trajectory',
    'block.variables': '7 interlocking variables',
    'hint.variables': '3 groups: structural / current / short-term · click any variable for the full causal chain',
    'block.evolution': 'Evolution path (May 2026 → 2028+)',
    'hint.evolution': 'The 4 most likely phases',
    'block.worst_case': 'Worst case: collapse + maritime anarchy',
    'hint.worst_case': '24-month probability 3-5%; damage scale = 1929 + 1973 + 2008 + 2020 stacked'
  }
};

function t(key) {
  return (I18N[STATE.lang] && I18N[STATE.lang][key]) || (I18N.zh[key] || key);
}

function applyI18n() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    el.textContent = t(key);
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

const STATUS_LABEL_PROXY = new Proxy({}, {
  get: (_, status) => t('status.' + status)
});

async function init() {
  try {
    const res = await fetch(`./data/iran_scenarios.${STATE.lang}.json`);
    if (!res.ok) throw new Error('Data load failed HTTP ' + res.status);
    STATE.data = await res.json();
    applyI18n();
    renderHeader();
    renderStance();
    // v3 new renders:
    renderTimeAnchors();
    renderVariableGroups();
    renderEvolutionPhases();
    renderWorstCase();
    // existing (still working):
    renderObservationTracker();
    renderHistoryCompare();
    renderGlossary();
    setupObsFilter();
    setupDrawerControls();
    setupLangToggle();
    handleHashJump();
  } catch (e) {
    console.error('Init failed:', e);
    document.querySelector('.container').innerHTML =
      '<div style="color:#ff3b30;padding:40px;text-align:center;">' + (STATE.lang === 'en' ? 'Init failed: ' : '初始化失败：') + e.message + '</div>';
  }
}

// ============ v3 renderers ============

function renderTimeAnchors() {
  const c = document.getElementById('time-anchors-strip');
  if (!c || !STATE.data.time_anchors) return;
  c.innerHTML = STATE.data.time_anchors.map(a => `
    <div class="time-anchor-card">
      <div class="time-anchor-date">${escapeHtml(a.date)}</div>
      <div class="time-anchor-label">${escapeHtml(a.label)}</div>
      <div class="time-anchor-desc">${escapeHtml(a.short_desc)}</div>
      <div class="time-anchor-full">${escapeHtml(a.description)}</div>
    </div>
  `).join('');
}

function renderVariableGroups() {
  const c = document.getElementById('variable-groups');
  if (!c || !STATE.data.variable_groups) return;
  c.innerHTML = STATE.data.variable_groups.map(group => `
    <div class="variable-group">
      <div class="variable-group-header">
        <div class="variable-group-label">${escapeHtml(group.label)}</div>
        <div class="variable-group-sublabel">${escapeHtml(group.sublabel)}</div>
        <div class="variable-group-intro">${escapeHtml(group.intro)}</div>
      </div>
      <div class="variable-group-vars">
        ${group.variables.map((v, idx) => `
          <button class="variable-card color-${v.color || 'neutral'}" data-var-id="${v.id}" id="${v.id}">
            <div class="variable-card-header">
              <div class="variable-card-label">${escapeHtml(v.label)}</div>
              ${v.cross_page_link && v.cross_page_link.label ? `
                <a class="variable-card-link" href="${getCrossPageHref(v.cross_page_link)}" onclick="event.stopPropagation()">${escapeHtml(v.cross_page_link.label)}</a>
              ` : ''}
            </div>
            <div class="variable-card-short">${escapeHtml(v.short_desc)}</div>
            <div class="variable-card-current">
              <span class="variable-card-current-label">${STATE.lang === 'en' ? 'Current state' : '当前状态'}</span>
              <span class="variable-card-current-text">${escapeHtml(v.current_state)}</span>
            </div>
            <div class="variable-card-expand-hint">${STATE.lang === 'en' ? '→ Click to expand causal chain' : '→ 点击展开因果链详细'}</div>
          </button>
        `).join('')}
      </div>
    </div>
  `).join('');
  // attach click handlers
  c.querySelectorAll('[data-var-id]').forEach(el => {
    el.addEventListener('click', () => openVariableDrawer(el.dataset.varId));
  });
}

function getCrossPageHref(link) {
  if (!link.page) return '#';
  const pageMap = {
    'maga': '/iran-war/maga-split/',
    'supply': '/iran-war/supply-chain/',
    'regime': '/iran-war/regime-scenarios/'
  };
  const base = pageMap[link.page] || '#';
  return base + (link.section_id ? '#' + link.section_id : '');
}

function findVariable(varId) {
  for (const g of (STATE.data.variable_groups || [])) {
    for (const v of (g.variables || [])) {
      if (v.id === varId) return v;
    }
  }
  return null;
}

function openVariableDrawer(varId) {
  const v = findVariable(varId);
  if (!v) return;
  const mechLabel = v.mechanism ? v.mechanism.label : '';
  const mechAnalysis = v.mechanism ? v.mechanism.analysis : '';
  const html = `
    <div class="d-status-row">
      <span class="d-actor-badge">${escapeHtml(v.current_state || '')}</span>
    </div>
    <h2 class="d-title">${escapeHtml(v.label)}</h2>
    <p class="d-summary">${escapeHtml(v.short_desc)}</p>

    <div class="conn-view color-${v.color || 'neutral'}">
      <div class="conn-flow">
        <div class="conn-col conn-col-pre">
          <div class="conn-col-label conn-label-blue">${STATE.lang === 'en' ? 'Preconditions' : '前提条件'} · ${v.preconditions.length}</div>
          ${v.preconditions.map((p, i) => `
            <button class="conn-card conn-card-blue" data-pre-idx="${i}" data-var-id="${v.id}">
              <div class="conn-card-label">${escapeHtml(p.label)}</div>
            </button>
          `).join('')}
        </div>
        <div class="conn-col conn-col-hub">
          <div class="conn-source-card">
            <div class="conn-source-tag">${STATE.lang === 'en' ? 'Variable' : '变量'}</div>
            <div class="conn-source-name">${escapeHtml(v.label)}</div>
            ${mechLabel ? `<div class="conn-source-mech"><div class="conn-source-mech-label">${STATE.lang === 'en' ? 'Mechanism' : '运作机制'}</div><div class="conn-source-mech-text">${escapeHtml(mechLabel)}</div></div>` : ''}
          </div>
        </div>
        <div class="conn-col conn-col-con">
          <div class="conn-col-label conn-label-orange">${STATE.lang === 'en' ? 'Consequences' : '可能后果'} · ${v.consequences.length}</div>
          ${v.consequences.map((cs, i) => `
            <button class="conn-card conn-card-orange" data-con-idx="${i}" data-var-id="${v.id}">
              <div class="conn-card-label">${escapeHtml(cs.label)}</div>
              ${typeof cs.weight === 'number' ? `<div class="conn-card-badge">${Math.round(cs.weight * 100)}%</div>` : ''}
            </button>
          `).join('')}
        </div>
        <svg class="conn-pipes" preserveAspectRatio="none"></svg>
      </div>
      ${v.observations && v.observations.length > 0 ? `
      <div class="conn-obs-row">
        <div class="conn-obs-header">
          <span class="conn-obs-marker"></span>
          <span class="conn-obs-title">${STATE.lang === 'en' ? 'Observation nodes' : '监测节点'}</span>
        </div>
        <div class="conn-obs-cards">
          ${v.observations.map((o, i) => `
            <button class="conn-card conn-card-yellow conn-obs-card" data-obs-idx="${i}" data-var-id="${v.id}">
              <div class="conn-card-label">${escapeHtml(o.label)}</div>
            </button>
          `).join('')}
        </div>
      </div>` : ''}
    </div>

    ${mechAnalysis ? `
      <div class="d-section">
        <div class="d-section-label">${STATE.lang === 'en' ? 'Mechanism detail' : '机制详解'}</div>
        <div class="d-prose">${formatRichText(mechAnalysis, 'd-para')}</div>
      </div>
    ` : ''}
  `;
  setDrawer(STATE.lang === 'en' ? 'Variable' : '变量', html);
  setTimeout(() => {
    drawVariablePipes();
    attachVariableSubCardHandlers();
  }, 60);
}

function drawVariablePipes() {
  const view = document.querySelector('#drawer .conn-view');
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

  view.querySelectorAll('[data-pre-idx]').forEach(card => {
    const r = card.getBoundingClientRect();
    const sx = r.right - flowRect.left;
    const sy = r.top + r.height / 2 - flowRect.top;
    const tx = hubLeftX;
    const ty = hubCenterY;
    const midX = sx + (tx - sx) * 0.55;
    paths.push(`<path d="M ${sx} ${sy} C ${midX} ${sy}, ${midX} ${ty}, ${tx} ${ty}" stroke="#0071e3" stroke-width="4" fill="none" opacity="0.38" stroke-linecap="round"/>`);
  });
  view.querySelectorAll('[data-con-idx]').forEach(card => {
    const r = card.getBoundingClientRect();
    const sx = hubRightX;
    const sy = hubCenterY;
    const tx = r.left - flowRect.left;
    const ty = r.top + r.height / 2 - flowRect.top;
    const midX = sx + (tx - sx) * 0.45;
    paths.push(`<path d="M ${sx} ${sy} C ${midX} ${sy}, ${midX} ${ty}, ${tx} ${ty}" stroke="#ff9500" stroke-width="4" fill="none" opacity="0.38" stroke-linecap="round"/>`);
  });
  svg.innerHTML = paths.join('');
}

function attachVariableSubCardHandlers() {
  document.querySelectorAll('#drawer [data-pre-idx]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const v = findVariable(el.dataset.varId);
      const item = v.preconditions[parseInt(el.dataset.preIdx)];
      showSubDetail(STATE.lang === 'en' ? 'Precondition' : '前提条件', item);
    });
  });
  document.querySelectorAll('#drawer [data-con-idx]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const v = findVariable(el.dataset.varId);
      const item = v.consequences[parseInt(el.dataset.conIdx)];
      showSubDetail(STATE.lang === 'en' ? 'Consequence' : '可能后果', item, true);
    });
  });
  document.querySelectorAll('#drawer [data-obs-idx]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const v = findVariable(el.dataset.varId);
      const item = v.observations[parseInt(el.dataset.obsIdx)];
      showSubDetail(STATE.lang === 'en' ? 'Observation node' : '监测节点', item, false, true);
    });
  });
}

function showSubDetail(tag, item, isConsequence = false, isObservation = false) {
  const drawerBody = document.getElementById('drawer-body');
  if (!drawerBody) return;
  // Append sub-detail panel
  let extra = '';
  if (isConsequence && typeof item.weight === 'number') {
    extra = `<div class="d-actor-badge">${Math.round(item.weight * 100)}% ${STATE.lang === 'en' ? 'weight' : '权重'}</div>`;
  }
  if (isObservation) {
    extra = item.threshold ? `<div class="d-callout"><strong>${STATE.lang === 'en' ? 'Trigger threshold' : '触发门槛'}：</strong>${escapeHtml(item.threshold)}</div>` : '';
    if (item.current_state) extra += `<div class="d-callout"><strong>${STATE.lang === 'en' ? 'Current state' : '当前状态'}：</strong>${escapeHtml(item.current_state)}</div>`;
  }
  const subHtml = `
    <div class="d-section variable-sub-detail">
      <div class="d-section-label">${escapeHtml(tag)}：${escapeHtml(item.label)}</div>
      ${extra}
      ${item.analysis ? `<div class="d-prose">${formatRichText(item.analysis, 'd-para')}</div>` : ''}
    </div>
  `;
  // Remove any previous sub-detail and add new
  const existing = drawerBody.querySelector('.variable-sub-detail');
  if (existing) existing.remove();
  drawerBody.insertAdjacentHTML('beforeend', subHtml);
  // Scroll to it
  const newEl = drawerBody.querySelector('.variable-sub-detail');
  if (newEl) newEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderEvolutionPhases() {
  const c = document.getElementById('evolution-phases');
  if (!c || !STATE.data.evolution_phases) return;
  c.innerHTML = STATE.data.evolution_phases.map(p => `
    <div class="evolution-phase">
      <div class="evolution-phase-header">
        <span class="evolution-phase-num">${STATE.lang === 'en' ? 'Phase' : '阶段'} ${p.phase}</span>
        <span class="evolution-phase-period">${escapeHtml(p.period)}</span>
      </div>
      <div class="evolution-phase-label">${escapeHtml(p.label)}</div>
      <div class="evolution-phase-desc">${formatRichText(p.description, 'd-para')}</div>
      ${p.key_events && p.key_events.length > 0 ? `
        <div class="evolution-phase-events">
          <div class="evolution-phase-events-label">${STATE.lang === 'en' ? 'Key events' : '关键事件'}</div>
          <ul class="rich-list">${p.key_events.map(e => `<li>${escapeHtml(e)}</li>`).join('')}</ul>
        </div>
      ` : ''}
    </div>
  `).join('');
}

function renderWorstCase() {
  const c = document.getElementById('worst-case');
  if (!c || !STATE.data.worst_case) return;
  const w = STATE.data.worst_case;
  c.innerHTML = `
    <div class="worst-case-header">
      <span class="worst-case-prob">${escapeHtml(w.probability_24m)} ${STATE.lang === 'en' ? 'probability' : '概率'}</span>
      <span class="worst-case-label">${escapeHtml(w.label)}</span>
    </div>
    <p class="worst-case-desc">${escapeHtml(w.description)}</p>
    <div class="worst-case-grid">
      <div class="worst-case-section">
        <div class="worst-case-section-label">${STATE.lang === 'en' ? 'Triggers' : '触发条件'}</div>
        <ul class="rich-list">${w.triggers.map(t => `<li>${escapeHtml(t)}</li>`).join('')}</ul>
      </div>
      <div class="worst-case-section">
        <div class="worst-case-section-label">${STATE.lang === 'en' ? 'Damage consequences' : '破坏后果'}</div>
        <ul class="rich-list">${w.consequences.map(c => `<li>${escapeHtml(c)}</li>`).join('')}</ul>
      </div>
      <div class="worst-case-section">
        <div class="worst-case-section-label">${STATE.lang === 'en' ? 'Monitoring signals' : '监测信号'}</div>
        <ul class="rich-list">${w.monitoring_signals.map(s => `<li>${escapeHtml(s)}</li>`).join('')}</ul>
      </div>
    </div>
  `;
}

function handleHashJump() {
  if (window.location.hash) {
    const hash = window.location.hash.substring(1);
    setTimeout(() => {
      const el = document.getElementById(hash);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (el.matches('[data-var-id]')) {
          setTimeout(() => openVariableDrawer(el.dataset.varId), 400);
        }
      }
    }, 200);
  }
}
window.addEventListener('hashchange', handleHashJump);

function renderHeader() {
  const m = STATE.data.meta;
  document.getElementById('hdr-title').textContent = m.title;
  document.getElementById('hdr-sub').textContent = m.subtitle;
  document.getElementById('last-updated').textContent = t('nav.baseline') + ' ' + m.baseline_date;
}

function renderStance() {
  const text = STATE.data.meta.stance_summary;
  document.getElementById('stance-text').innerHTML = formatRichText(text, 'stance-para');
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

function setupMethodologyButton() {
  const btn = document.getElementById('prob-title');
  if (!btn) return;
  const target = btn.querySelector('.block-info-btn');
  if (target) {
    target.addEventListener('click', e => {
      e.stopPropagation();
      openMethodologyDrawer();
    });
  }
}

function openMethodologyDrawer() {
  const m = STATE.data.methodology;
  const tag = document.getElementById('drawer-tag');
  const body = document.getElementById('drawer-body');

  tag.textContent = t('block.methodology');
  body.innerHTML = `
    <h2 class="d-title">${escapeHtml(t('block.methodology'))}</h2>
    <div class="d-section">
      <div class="d-section-label">${t('methodology.formula')}</div>
      <div class="d-callout" style="text-align:center;font-family:var(--font-display);font-size:15px;line-height:1.7;">
        ${escapeHtml(m.framework || (t('methodology.prior') + ' × ' + t('methodology.factor') + ' = ' + t('methodology.result')))}
      </div>
    </div>
    <div class="d-section">
      <div class="d-section-label">${t('methodology.prior')}</div>
      <div class="d-prose">${escapeHtml(m.prior_basis)}</div>
    </div>
    <div class="d-section">
      <div class="d-section-label">${t('methodology.factor')}</div>
      <div class="d-prose">${escapeHtml(m.weakening_factors)}</div>
    </div>
  `;

  document.getElementById('drawer').classList.add('open');
  document.getElementById('drawer-backdrop').classList.add('open');
  document.getElementById('drawer').setAttribute('aria-hidden', 'false');
  document.getElementById('drawer-body').scrollTop = 0;
}

/* ============ Probability strip ============ */

function renderProbStrip() {
  const c = document.getElementById('prob-strip');
  c.innerHTML = '';
  STATE.data.scenarios.forEach(s => {
    const [lo, hi] = s.probability;
    const row = document.createElement('div');
    row.className = 'prob-row color-' + s.color;
    row.dataset.scenarioId = s.id;
    row.innerHTML = `
      <div class="name">${escapeHtml(s.name)}</div>
      <div class="bar-wrap">
        <div class="bar-range" style="left:${lo}%; width:${hi - lo}%"></div>
      </div>
      <div class="pct">${lo}–${hi}%</div>
    `;
    row.addEventListener('click', () => selectScenario(s.id));
    c.appendChild(row);
  });
  highlightProbRow();
}

function highlightProbRow() {
  document.querySelectorAll('.prob-row').forEach(r => {
    r.classList.toggle('active', r.dataset.scenarioId === STATE.currentScenarioId);
  });
}

/* ============ Scenario tabs ============ */

function renderScenarioTabs() {
  const c = document.getElementById('scenario-tabs');
  c.innerHTML = '';
  STATE.data.scenarios.forEach(s => {
    const btn = document.createElement('button');
    btn.className = 'scenario-tab';
    btn.dataset.scenarioId = s.id;
    const [lo, hi] = s.probability;
    btn.innerHTML = `${escapeHtml(s.name)}<span class="prob-tag">${lo}–${hi}%</span>`;
    btn.addEventListener('click', () => selectScenario(s.id));
    c.appendChild(btn);
  });
  highlightScenarioTab();
}

function highlightScenarioTab() {
  document.querySelectorAll('.scenario-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.scenarioId === STATE.currentScenarioId);
  });
}

function selectScenario(id) {
  STATE.currentScenarioId = id;
  highlightProbRow();
  highlightScenarioTab();
  renderScenarioCard(id);
  document.getElementById('scenario-card').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/* ============ Scenario card (structured) ============ */

function renderScenarioCard(id) {
  const s = STATE.data.scenarios.find(x => x.id === id);
  if (!s) return;
  const c = document.getElementById('scenario-card');

  const [lo, hi] = s.probability;
  const calc = s.probability_calc;
  const factorLabel = calc.factor_label || t('calc.factor');

  let html = `
    <div class="scenario-card-header color-${s.color}">
      <div class="scenario-card-name">${escapeHtml(s.name)}</div>
      <div class="scenario-card-prob">${lo}–${hi}%</div>
    </div>
    <p class="scenario-thesis">${escapeHtml(s.thesis)}</p>

    <!-- Causal connection view -->
    <div class="section">
      <h3 class="section-title">${t('card.causal')} <span class="section-note">${t('card.causal.hint')}</span></h3>
      ${renderConnectionView(s)}
    </div>

    <!-- Probability calculation -->
    <div class="section">
      <h3 class="section-title">${t('card.prob')}</h3>
      <div class="prob-calc">
        <div class="calc-row">
          <div class="calc-label">${t('calc.prior')}</div>
          <div class="calc-value">${calc.prior[0]}–${calc.prior[1]}%</div>
          <div class="calc-basis">${escapeHtml(calc.prior_basis)}</div>
        </div>
        <div class="calc-row">
          <div class="calc-label">${escapeHtml(factorLabel)}</div>
          <div class="calc-value calc-op">${factorLabel === t('calc.factor.boost') ? t('calc.op.up') : t('calc.op.down')}</div>
          <div class="calc-basis">${escapeHtml(calc.factor_basis)}</div>
        </div>
        <div class="calc-row calc-result">
          <div class="calc-label">${t('calc.result')}</div>
          <div class="calc-value">${calc.result[0]}–${calc.result[1]}%</div>
          <div class="calc-basis"></div>
        </div>
      </div>
    </div>

    <!-- Preconditions (AND) -->
    <div class="section">
      <h3 class="section-title">${t('card.preconditions')} <span class="section-note">${escapeHtml(s.logic || '')}</span></h3>
      <ul class="precondition-list">`;

  s.preconditions.forEach((p, i) => {
    html += `
        <li class="precondition-item status-${p.status}">
          <div class="pre-marker">
            <span class="pre-num">${i + 1}</span>
            <span class="pre-status-badge status-${p.status}">${STATUS_LABEL_PROXY[p.status]}</span>
          </div>
          <div class="pre-content">
            <div class="pre-label">${escapeHtml(p.label)}</div>
            ${p.explanation ? `<div class="pre-explain">${escapeHtml(p.explanation)}</div>` : ''}
            ${p.evidence ? `<div class="pre-evidence"><span class="evidence-key">${t('pre.evidence')}</span>${escapeHtml(p.evidence)}</div>` : ''}
            ${renderSources(p.sources)}
          </div>
        </li>`;
  });

  html += `      </ul>
    </div>

    <!-- Mechanisms -->
    <div class="section">
      <h3 class="section-title">${t('card.mechanisms')}</h3>
      <div class="mechanism-list">`;
  s.mechanisms.forEach(m => {
    html += `
        <div class="mechanism-item">
          <div class="mech-label">${escapeHtml(m.label)}</div>
          <div class="mech-desc">${escapeHtml(m.description)}</div>
          ${renderSources(m.sources)}
        </div>`;
  });
  html += `      </div>
    </div>

    <!-- Consequences -->
    <div class="section">
      <h3 class="section-title">${t('card.consequences')} <span class="section-note">${t('card.consequences.hint')}</span></h3>
      <div class="consequence-grid">`;
  s.consequences.forEach(c => {
    html += `
        <div class="consequence-item">
          <div class="con-actor">${escapeHtml(c.actor)}</div>
          <div class="con-label">${escapeHtml(c.label)}</div>
          <div class="con-desc">${escapeHtml(c.description)}</div>
          ${renderSources(c.sources)}
        </div>`;
  });
  html += `      </div>
    </div>

    <!-- Observations -->
    <div class="section">
      <h3 class="section-title">${t('card.observations')}</h3>
      <ul class="observation-list">`;
  s.observations.forEach(o => {
    html += `
        <li class="observation-item status-${o.status}">
          <div class="obs-header">
            <span class="obs-label">${escapeHtml(o.label)}</span>
            <span class="pre-status-badge status-${o.status}">${STATUS_LABEL_PROXY[o.status]}</span>
          </div>
          ${o.summary ? `<div class="obs-summary">${escapeHtml(o.summary)}</div>` : ''}
          <div class="obs-threshold"><span class="evidence-key">${t('drawer.threshold')}：</span>${escapeHtml(o.threshold)}</div>
          ${o.significance ? `<div class="obs-significance">${escapeHtml(o.significance)}</div>` : ''}
          <div class="obs-meta">${t('drawer.lastcheck')}：${escapeHtml(o.last_check || '—')}</div>
          ${renderSources(o.sources)}
        </li>`;
  });
  html += `      </ul>
    </div>`;

  c.innerHTML = html;
}

/* ============ Connection view (hub-spoke with colored pipes) ============ */

function renderConnectionView(s) {
  const [lo, hi] = s.probability;
  const mech = s.mechanisms[0] ? s.mechanisms[0].label : '';

  let html = `
    <div class="conn-view color-${s.color}">

      <!-- Top main flow: preconditions → hub → consequences -->
      <div class="conn-flow">

        <!-- Left: preconditions -->
        <div class="conn-col conn-col-pre">
          <div class="conn-col-label conn-label-blue">${t('conn.precondition')} · ${s.preconditions.length} ${t('conn.precondition.and')}</div>
          ${s.preconditions.map((p, i) => `
            <button class="conn-card conn-card-blue" data-pipe-color="blue" data-pipe-dir="in" data-card-type="precondition" data-card-index="${i}">
              <div class="conn-card-label">${escapeHtml(p.label)}</div>
              <div class="pre-status-badge status-${p.status}">${STATUS_LABEL_PROXY[p.status]}</div>
            </button>`).join('')}
        </div>

        <!-- Center hub -->
        <div class="conn-col conn-col-hub">
          <button class="conn-source-card" data-card-type="scenario" data-card-index="0">
            <div class="conn-source-tag">${t('conn.scenario')}</div>
            <div class="conn-source-name">${escapeHtml(s.name)}</div>
            <div class="conn-source-prob">${lo}–${hi}%</div>
            ${mech ? `<div class="conn-source-mech"><div class="conn-source-mech-label">${t('conn.mech.label')}</div><div class="conn-source-mech-text">${escapeHtml(mech)}</div></div>` : ''}
          </button>
        </div>

        <!-- Right: consequences -->
        <div class="conn-col conn-col-con">
          <div class="conn-col-label conn-label-orange">${t('conn.consequence')} · ${s.consequences.length} ${t('conn.consequence.unit')}</div>
          ${s.consequences.map((c, i) => `
            <button class="conn-card conn-card-orange" data-pipe-color="orange" data-pipe-dir="out" data-card-type="consequence" data-card-index="${i}">
              <div class="conn-card-label">${escapeHtml(c.label)}</div>
              <div class="conn-card-badge">${escapeHtml(c.actor)}</div>
            </button>`).join('')}
        </div>

        <!-- SVG pipes layer (absolute, behind cards) -->
        <svg class="conn-pipes" preserveAspectRatio="none"></svg>
      </div>

      <!-- Bottom: observation row -->
      <div class="conn-obs-row">
        <div class="conn-obs-header">
          <span class="conn-obs-marker"></span>
          <span class="conn-obs-title">${t('conn.obs.title')}</span>
        </div>
        <div class="conn-obs-cards">
          ${s.observations.map((o, i) => `
            <button class="conn-card conn-card-yellow conn-obs-card" data-pipe-color="yellow" data-card-type="observation" data-card-index="${i}">
              <div class="conn-card-label">${escapeHtml(o.label)}</div>
              <div class="pre-status-badge status-${o.status}">${STATUS_LABEL_PROXY[o.status]}</div>
            </button>`).join('')}
        </div>
      </div>

    </div>`;

  setTimeout(() => {
    drawPipes();
    attachCardClickHandlers();
  }, 40);
  return html;
}

/* ============ Detail drawer ============ */

function attachCardClickHandlers() {
  document.querySelectorAll('.conn-card[data-card-type], .conn-source-card[data-card-type]').forEach(el => {
    el.addEventListener('click', () => {
      const type = el.dataset.cardType;
      const index = parseInt(el.dataset.cardIndex, 10);
      openDrawer(type, index);
    });
  });
}

function openDrawer(type, index) {
  const s = STATE.data.scenarios.find(x => x.id === STATE.currentScenarioId);
  if (!s) return;

  const tag = document.getElementById('drawer-tag');
  const body = document.getElementById('drawer-body');

  let tagText = '';
  let html = '';

  if (type === 'precondition') {
    const p = s.preconditions[index];
    tagText = t('drawer.tag.precondition');
    html = renderPreconditionDetail(s, p);
  } else if (type === 'consequence') {
    const c = s.consequences[index];
    tagText = t('drawer.tag.consequence');
    html = renderConsequenceDetail(s, c);
  } else if (type === 'observation') {
    const o = s.observations[index];
    tagText = t('drawer.tag.observation');
    html = renderObservationDetail(s, o);
  } else if (type === 'scenario') {
    tagText = t('drawer.tag.scenario');
    html = renderScenarioOverview(s);
  }

  tag.textContent = tagText + ' · ' + s.name;
  body.innerHTML = html;

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

function formatAnalysis(text) {
  return formatRichText(text, 'd-para');
}

function renderAnalysisSection(item) {
  if (item.analysis) {
    return `
      <div class="d-section">
        <div class="d-section-label">${t('drawer.analysis')}</div>
        <div class="d-prose">${formatAnalysis(item.analysis)}</div>
      </div>`;
  }
  // Fallback to legacy fields
  let html = '';
  if (item.explanation) {
    html += `<div class="d-section"><div class="d-section-label">${t('drawer.explanation')}</div><div class="d-prose">${escapeHtml(item.explanation)}</div></div>`;
  }
  if (item.evidence) {
    html += `<div class="d-section"><div class="d-section-label">${t('drawer.evidence')}</div><div class="d-callout">${escapeHtml(item.evidence)}</div></div>`;
  }
  if (item.description) {
    html += `<div class="d-section"><div class="d-section-label">${t('drawer.description')}</div><div class="d-prose">${escapeHtml(item.description)}</div></div>`;
  }
  return html;
}

function renderPreconditionDetail(s, p) {
  return `
    <div class="d-status-row">
      <span class="pre-status-badge status-${p.status}">${STATUS_LABEL_PROXY[p.status]}</span>
    </div>
    <h2 class="d-title">${escapeHtml(p.label)}</h2>
    ${renderAnalysisSection(p)}
    ${renderDrawerSources(p.sources)}
  `;
}

function renderConsequenceDetail(s, c) {
  return `
    <div class="d-status-row">
      <span class="d-actor-badge">${escapeHtml(c.actor)}</span>
    </div>
    <h2 class="d-title">${escapeHtml(c.label)}</h2>
    ${renderAnalysisSection(c)}
    ${renderDrawerSources(c.sources)}
  `;
}

function renderObservationDetail(s, o) {
  return `
    <div class="d-status-row">
      <span class="pre-status-badge status-${o.status}">${STATUS_LABEL_PROXY[o.status]}</span>
      <span class="d-meta">${t('drawer.lastcheck')} · ${escapeHtml(o.last_check || '—')}</span>
    </div>
    <h2 class="d-title">${escapeHtml(o.label)}</h2>
    ${o.summary ? `<p class="d-summary">${escapeHtml(o.summary)}</p>` : ''}
    <div class="d-section">
      <div class="d-section-label">${t('drawer.threshold')}</div>
      <div class="d-callout">${escapeHtml(o.threshold)}</div>
    </div>
    ${o.significance ? `
      <div class="d-section">
        <div class="d-section-label">${t('drawer.significance')}</div>
        <div class="d-significance">${escapeHtml(o.significance)}</div>
      </div>` : ''}
    ${renderAnalysisSection(o)}
    ${renderDrawerSources(o.sources)}
  `;
}

function renderScenarioOverview(s) {
  const [lo, hi] = s.probability;
  const calc = s.probability_calc;
  return `
    <h2 class="d-title">${escapeHtml(s.name)} · ${lo}–${hi}%</h2>
    <p class="d-summary">${escapeHtml(s.thesis)}</p>
    <div class="d-section">
      <div class="d-section-label">${t('drawer.probcalc')}</div>
      <div class="d-prose">
        ${t('calc.prior')} ${calc.prior[0]}–${calc.prior[1]}%（${escapeHtml(calc.prior_basis)}）<br><br>
        ${escapeHtml(calc.factor_label || t('calc.factor'))}：${escapeHtml(calc.factor_basis)}<br><br>
        <strong>${t('calc.result')}：${calc.result[0]}–${calc.result[1]}%</strong>
      </div>
    </div>
    <div class="d-section">
      <div class="d-section-label">${t('drawer.mech.label')}</div>
      ${s.mechanisms.map(m => `
        <div class="d-mech-block">
          <div class="d-mech-label">${escapeHtml(m.label)}</div>
          <div class="d-prose">${escapeHtml(m.description)}</div>
          ${renderDrawerSources(m.sources)}
        </div>`).join('')}
    </div>
  `;
}

function renderDrawerSources(sources) {
  if (!sources || sources.length === 0) return '';
  let html = `<div class="d-section"><div class="d-section-label">${t('drawer.sources')}</div><div class="d-sources">`;
  sources.forEach(s => {
    html += `<a href="${escapeHtml(s.url)}" target="_blank" rel="noopener" class="d-source-link">
      <span class="d-source-arrow">↗</span>
      <span>${escapeHtml(s.label)}</span>
    </a>`;
  });
  html += `</div></div>`;
  return html;
}

function setupDrawerControls() {
  document.getElementById('drawer-close').addEventListener('click', closeDrawer);
  document.getElementById('drawer-backdrop').addEventListener('click', closeDrawer);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeDrawer();
  });
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

  // Hub edges (relative to flow container)
  const hubLeftX = hubRect.left - flowRect.left;
  const hubRightX = hubRect.right - flowRect.left;
  const hubCenterY = hubRect.top + hubRect.height / 2 - flowRect.top;

  const paths = [];

  // Incoming pipes: preconditions → hub left edge
  view.querySelectorAll('[data-pipe-dir="in"]').forEach(card => {
    const r = card.getBoundingClientRect();
    const sx = r.right - flowRect.left;
    const sy = r.top + r.height / 2 - flowRect.top;
    const tx = hubLeftX;
    const ty = hubCenterY;
    const midX = sx + (tx - sx) * 0.55;
    const d = `M ${sx} ${sy} C ${midX} ${sy}, ${midX} ${ty}, ${tx} ${ty}`;
    paths.push(`<path d="${d}" stroke="#0071e3" stroke-width="4" fill="none" opacity="0.38" stroke-linecap="round"/>`);
  });

  // Outgoing pipes: hub right edge → consequences
  view.querySelectorAll('[data-pipe-dir="out"]').forEach(card => {
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

// Redraw pipes on resize
window.addEventListener('resize', () => {
  clearTimeout(window._pipeRedraw);
  window._pipeRedraw = setTimeout(drawPipes, 100);
});

function renderSources(sources) {
  if (!sources || sources.length === 0) return '';
  let html = '<div class="source-list">';
  sources.forEach(s => {
    html += `<a href="${escapeHtml(s.url)}" target="_blank" rel="noopener" class="source-link">↗ ${escapeHtml(s.label)}</a>`;
  });
  html += '</div>';
  return html;
}

/* ============ Observation tracker ============ */

function renderObservationTracker() {
  const tbody = document.getElementById('obs-tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  const all = [];
  // v3: pull observations from variable_groups[].variables[].observations
  (STATE.data.variable_groups || []).forEach(g => {
    (g.variables || []).forEach(v => {
      (v.observations || []).forEach(o => {
        all.push({
          ...o,
          scenario_name: v.label,
          scenario_id: v.id,
          status: o.status || 'watching'
        });
      });
    });
  });

  const filtered = STATE.obsFilter === 'all'
    ? all
    : all.filter(o => (o.status || 'open') === STATE.obsFilter);

  filtered.forEach(o => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="label-cell">${escapeHtml(o.label)}</td>
      <td class="scenario-cell">${escapeHtml(o.scenario_name)}</td>
      <td><span class="pre-status-badge status-${o.status || 'open'}">${STATUS_LABEL_PROXY[o.status || 'open']}</span></td>
      <td class="threshold-cell">${escapeHtml(o.threshold || '—')}</td>
      <td class="date-cell">${escapeHtml(o.last_check || '—')}</td>
    `;
    tr.addEventListener('click', () => {
      // v3: jump to variable detail
      if (typeof openVariableDrawer === 'function') openVariableDrawer(o.scenario_id);
    });
    tbody.appendChild(tr);
  });

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#a1a1a6;padding:30px;">' + (STATE.lang === 'en' ? 'No matching observation nodes' : '无符合条件的观察节点') + '</td></tr>';
  }

  document.querySelectorAll('.obs-filter-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.filter === STATE.obsFilter);
  });
}

function setupObsFilter() {
  document.querySelectorAll('.obs-filter-btn').forEach(b => {
    b.addEventListener('click', () => {
      STATE.obsFilter = b.dataset.filter;
      renderObservationTracker();
    });
  });
}

/* ============ History compare ============ */

function renderHistoryCompare() {
  const c = document.getElementById('history-compare');
  const h = STATE.data.history_compare;
  let html = '';
  if (h.intro) {
    html += `<p class="history-intro">${escapeHtml(h.intro)}</p>`;
  }
  html += `
    <table>
      <thead><tr><th>${t('history.col.soviet')}</th><th>${t('history.col.iran')}</th></tr></thead>
      <tbody>`;
  h.mapping.forEach(m => {
    html += `<tr><td>${escapeHtml(m.soviet)}</td><td>${escapeHtml(m.iran)}</td></tr>`;
  });
  html += `</tbody></table>
    <div class="history-key-diff">
      <div class="label">${t('history.keydiff')}</div>
      ${escapeHtml(h.key_difference)}
    </div>`;
  c.innerHTML = html;
}

/* ============ Glossary ============ */

function renderGlossary() {
  const c = document.getElementById('glossary');
  if (!STATE.data.glossary) return;
  let html = '<div class="glossary-grid">';
  STATE.data.glossary.forEach(g => {
    html += `
      <div class="glossary-item">
        <div class="g-term"><span class="g-zh">${escapeHtml(g.zh)}</span><span class="g-en">${escapeHtml(g.en)}</span></div>
        <div class="g-note">${escapeHtml(g.note)}</div>
      </div>`;
  });
  html += '</div>';
  c.innerHTML = html;
}

/* ============ Util ============ */

function escapeHtml(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
