/* ========================================
   MAGA Split — page renderer
   ======================================== */

const STATE = {
  data: null,
  lang: localStorage.getItem('iran-lang') || 'zh'
};

const I18N = {
  zh: {
    'stance.label': '核心判断',
    'block.factions': '四派系结构',
    'hint.factions': '点击任一卡片查看派系详情',
    'block.timeline': '关键时间线',
    'hint.timeline': '2025-06 → 2026-05 · 点击事件查看详情',
    'block.observations': '六个可验证观察节点',
    'hint.observations': '事件触发 → 更新数据 → 重新部署',
    'block.causal': '因果关系图',
    'hint.causal': '两个时间层 · 战争（已发生）→ 2028 提名战（未发生）· 点击节点查看深度分析',
    'block.history': '两种历史先例：1968 vs 2003',
    'block.glossary': '术语表',
    'footer.text': '数据基线 2026-05-19 · 主要文献：班农 / 塔克·卡尔森长访谈 · NPR / CNN / Newsweek MAGA 撕裂报道 · 马西 H.Con.Res.38 · 参议院沙欣致鲁比奥信 · FDD Gerecht + CFR Takeyh WSJ 联名 · 罗伯特·卡根《大西洋月刊》 · 斯蒂芬·沃尔特《外交政策》 · Jacobin AIPAC 系列',
    'tracker.col.node': '观察节点',
    'tracker.col.status': '状态',
    'tracker.col.threshold': '触发门槛',
    'tracker.col.lastcheck': '最近核查',
    'status.open': '未触发',
    'status.triggered': '已触发',
    'status.falsified': '已证伪',
    'nav.hub': '← 沙盘母页',
    'nav.source': '原文报告',
    'nav.baseline': '基线',
    'drawer.tag.faction': '派系',
    'drawer.tag.event': '事件',
    'drawer.tag.observation': '观察节点',
    'drawer.tag.history': '历史对照',
    'drawer.leaders': '代表人物',
    'drawer.lineage': '智识源头',
    'drawer.positions': '关键立场',
    'drawer.status': '当前状态',
    'drawer.significance': '意义',
    'drawer.threshold': '触发门槛',
    'drawer.analysis': '分析',
    'drawer.sources': '文献',
    'drawer.lastcheck': '最近核查',
    'drawer.narrative': '叙述',
    'drawer.applicability': '适用性',
    'history.current_judgment': '当前判断'
  },
  en: {
    'stance.label': 'Core judgment',
    'block.factions': 'Four factions',
    'hint.factions': 'Click any card to see faction details',
    'block.timeline': 'Key timeline',
    'hint.timeline': 'Jun 2025 → May 2026 · click event for details',
    'block.observations': 'Six observation nodes',
    'hint.observations': 'Event triggers → update data → redeploy',
    'block.causal': 'Causal diagram',
    'hint.causal': 'Two time layers · the war (past) → 2028 primary (future) · click any node for deep analysis',
    'block.history': 'Two precedents: 1968 vs 2003',
    'block.glossary': 'Glossary',
    'footer.text': 'Baseline 2026-05-19 · Sources: Bannon / Tucker Carlson long interviews · NPR / CNN / Newsweek MAGA split coverage · Massie H.Con.Res.38 · Senate Shaheen letter to Rubio · FDD Gerecht + CFR Takeyh joint WSJ op-ed · Robert Kagan Atlantic · Stephen Walt Foreign Policy · Jacobin AIPAC series',
    'tracker.col.node': 'Observation node',
    'tracker.col.status': 'Status',
    'tracker.col.threshold': 'Trigger threshold',
    'tracker.col.lastcheck': 'Last checked',
    'status.open': 'Not triggered',
    'status.triggered': 'Triggered',
    'status.falsified': 'Falsified',
    'nav.hub': '← Sandbox hub',
    'nav.source': 'Source report',
    'nav.baseline': 'Baseline',
    'drawer.tag.faction': 'Faction',
    'drawer.tag.event': 'Event',
    'drawer.tag.observation': 'Observation',
    'drawer.tag.history': 'Historical precedent',
    'drawer.leaders': 'Key figures',
    'drawer.lineage': 'Intellectual lineage',
    'drawer.positions': 'Key positions',
    'drawer.status': 'Current status',
    'drawer.significance': 'Significance',
    'drawer.threshold': 'Trigger threshold',
    'drawer.analysis': 'Analysis',
    'drawer.sources': 'Sources',
    'drawer.lastcheck': 'Last checked',
    'drawer.narrative': 'Narrative',
    'drawer.applicability': 'Applicability',
    'history.current_judgment': 'Current judgment'
  }
};

function t(key) {
  return (I18N[STATE.lang] && I18N[STATE.lang][key]) || (I18N.zh[key] || key);
}

async function init() {
  try {
    let res = await fetch(`./data/maga.${STATE.lang}.json`);
    if (!res.ok && STATE.lang === 'en') {
      console.warn('English data not yet available, falling back to Chinese');
      res = await fetch('./data/maga.zh.json');
    }
    if (!res.ok) throw new Error('Data load failed HTTP ' + res.status);
    STATE.data = await res.json();
    applyI18n();
    renderHeader();
    renderStance();
    renderFactions();
    renderTimeline();
    renderObservations();
    // v3 new: Trump 内部消耗战略
    renderTrumpStrategy();
    renderHubs();
    // v3 new: bridging section
    renderBridgingSection();
    renderHistoryCompare();
    renderGlossary();
    setupDrawerControls();
    setupLangToggle();
    handleHashJump();
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
    // Only overwrite if translation exists; preserve static fallback otherwise
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

/* ============ Factions ============ */

function renderFactions() {
  const c = document.getElementById('factions-grid');
  c.innerHTML = '';
  STATE.data.factions.forEach((f, i) => {
    const card = document.createElement('button');
    card.className = `faction-card color-${f.color}`;
    card.dataset.cardType = 'faction';
    card.dataset.cardIndex = i;
    card.innerHTML = `
      <div class="faction-num">F0${i + 1}</div>
      <div class="faction-name">${escapeHtml(f.name)}</div>
      ${f.name_en ? `<div class="faction-name-en">${escapeHtml(f.name_en)}</div>` : ''}
      <div class="faction-thesis">${escapeHtml(f.thesis)}</div>
      <div class="faction-leaders">${f.leaders.map(l => `<span class="leader-pill">${escapeHtml(l)}</span>`).join('')}</div>
    `;
    card.addEventListener('click', () => openFactionDrawer(i));
    c.appendChild(card);
  });
}

function openFactionDrawer(index) {
  const f = STATE.data.factions[index];
  setDrawer(t('drawer.tag.faction'), `
    <div class="d-status-row">
      ${f.leaders.map(l => `<span class="d-actor-badge">${escapeHtml(l)}</span>`).join(' ')}
    </div>
    <h2 class="d-title">${escapeHtml(f.name)}${f.name_en ? ` · <span style="color:var(--label-3);font-weight:500">${escapeHtml(f.name_en)}</span>` : ''}</h2>
    <p class="d-summary">${escapeHtml(f.thesis)}</p>
    ${f.internal_state_2026_05 ? `<div class="d-section">
      <div class="d-section-label" style="color:#0071e3">2026-05 内部状态更新</div>
      <div class="d-prose">${formatRichText(f.internal_state_2026_05, 'd-para')}</div>
    </div>` : ''}
    ${f.analysis ? `<div class="d-section">
      <div class="d-section-label">${STATE.lang === 'en' ? 'Deep analysis' : '深度分析'}</div>
      <div class="d-prose">${formatRichText(f.analysis, 'd-para')}</div>
    </div>` : ''}
    <div class="d-section">
      <div class="d-section-label">${t('drawer.lineage')}</div>
      <div class="d-prose">${formatRichText(f.intellectual_lineage, 'd-para')}</div>
    </div>
    <div class="d-section">
      <div class="d-section-label">${t('drawer.positions')}</div>
      <ul class="evidence-list">
        ${f.key_positions.map(p => `<li class="evidence-item">${escapeHtml(p)}</li>`).join('')}
      </ul>
    </div>
    <div class="d-section">
      <div class="d-section-label">${t('drawer.status')}</div>
      <div class="d-prose">${formatRichText(f.current_status, 'd-para')}</div>
    </div>
    ${renderDrawerSources(f.sources)}
  `);
}

/* ============ Timeline ============ */

function renderTimeline() {
  const c = document.getElementById('timeline');
  c.innerHTML = '';
  STATE.data.timeline.forEach((e, i) => {
    const row = document.createElement('button');
    row.className = 'timeline-row';
    row.dataset.cardType = 'event';
    row.dataset.cardIndex = i;
    const factionTags = (e.factions || []).map(fid => {
      const fa = STATE.data.factions.find(f => f.id === fid);
      if (!fa) return '';
      return `<span class="timeline-faction-tag color-${fa.color}">${escapeHtml(fa.name)}</span>`;
    }).join('');
    row.innerHTML = `
      <div class="timeline-date">${escapeHtml(e.date)}</div>
      <div class="timeline-marker"></div>
      <div class="timeline-content">
        <div class="timeline-event">${escapeHtml(e.event)}</div>
        ${factionTags ? `<div class="timeline-factions">${factionTags}</div>` : ''}
      </div>
    `;
    row.addEventListener('click', () => openEventDrawer(i));
    c.appendChild(row);
  });
}

function openEventDrawer(index) {
  const e = STATE.data.timeline[index];
  const factionPills = (e.factions || []).map(fid => {
    const fa = STATE.data.factions.find(f => f.id === fid);
    return fa ? `<span class="d-actor-badge">${escapeHtml(fa.name)}</span>` : '';
  }).join(' ');
  setDrawer(t('drawer.tag.event'), `
    <div class="d-status-row">
      <span class="d-meta">${escapeHtml(e.date)}</span>
      ${factionPills}
    </div>
    <h2 class="d-title">${escapeHtml(e.event)}</h2>
    ${e.significance ? `<div class="d-section"><div class="d-section-label">${t('drawer.significance')}</div><div class="d-prose">${formatRichText(e.significance, 'd-para')}</div></div>` : ''}
    ${e.analysis ? `<div class="d-section"><div class="d-section-label">${t('drawer.analysis')}</div><div class="d-prose">${formatRichText(e.analysis, 'd-para')}</div></div>` : ''}
    ${renderDrawerSources(e.sources)}
  `);
}

/* ============ Observations ============ */

function renderObservations() {
  const tbody = document.getElementById('obs-tbody');
  tbody.innerHTML = '';
  const STATUS_LABEL = { open: t('status.open'), triggered: t('status.triggered'), falsified: t('status.falsified') };
  STATE.data.observations.forEach((o, i) => {
    const tr = document.createElement('tr');
    tr.style.cursor = 'pointer';
    tr.dataset.cardIndex = i;
    tr.innerHTML = `
      <td class="label-cell">${escapeHtml(o.label)}</td>
      <td><span class="pre-status-badge status-${o.status}">${STATUS_LABEL[o.status]}</span></td>
      <td class="threshold-cell">${escapeHtml(o.threshold)}</td>
      <td class="date-cell">${escapeHtml(o.last_check || '—')}</td>
    `;
    tr.addEventListener('click', () => openObservationDrawer(i));
    tbody.appendChild(tr);
  });
}

function openObservationDrawer(index) {
  const o = STATE.data.observations[index];
  const STATUS_LABEL = { open: t('status.open'), triggered: t('status.triggered'), falsified: t('status.falsified') };
  setDrawer(t('drawer.tag.observation'), `
    <div class="d-status-row">
      <span class="pre-status-badge status-${o.status}">${STATUS_LABEL[o.status]}</span>
      <span class="d-meta">${t('drawer.lastcheck')} · ${escapeHtml(o.last_check || '—')}</span>
    </div>
    <h2 class="d-title">${escapeHtml(o.label)}</h2>
    ${o.summary ? `<p class="d-summary">${escapeHtml(o.summary)}</p>` : ''}
    <div class="d-section">
      <div class="d-section-label">${t('drawer.threshold')}</div>
      <div class="d-callout">${escapeHtml(o.threshold)}</div>
    </div>
    ${o.significance ? `<div class="d-section"><div class="d-section-label">${t('drawer.significance')}</div><div class="d-significance">${escapeHtml(o.significance)}</div></div>` : ''}
    ${o.analysis ? `<div class="d-section"><div class="d-section-label">${t('drawer.analysis')}</div><div class="d-prose">${formatRichText(o.analysis, 'd-para')}</div></div>` : ''}
    ${renderDrawerSources(o.sources)}
  `);
}

/* ============ Hubs (dual-hub stacked flow with temporal bridge) ============ */

const STATUS_LABEL = {
  open: '未触发', triggered: '已触发', falsified: '已证伪', watching: '观察中'
};

function renderHubs() {
  const tabsEl = document.getElementById('hub-tabs');
  const viewEl = document.getElementById('conn-view');
  const sumEl = document.getElementById('hub-summary');
  if (!viewEl || !STATE.data.hubs) return;

  // Tab strip is no longer needed; hide if present
  if (tabsEl) tabsEl.style.display = 'none';
  if (sumEl) sumEl.style.display = 'none';

  // Render BOTH hubs stacked with a temporal bridge between them
  const hubs = STATE.data.hubs;
  const bridge = STATE.lang === 'en'
    ? '<div class="hub-bridge"><div class="hub-bridge-arrow">↓</div><div class="hub-bridge-text"><strong>2026-05 baseline</strong><br>The reshaped MAGA coalition becomes the input condition for the 2028 primary</div><div class="hub-bridge-arrow">↓</div></div>'
    : '<div class="hub-bridge"><div class="hub-bridge-arrow">↓</div><div class="hub-bridge-text"><strong>2026-05 当前基线</strong><br>战争重塑后的 MAGA 联盟成为 2028 提名战的输入条件</div><div class="hub-bridge-arrow">↓</div></div>';

  viewEl.innerHTML = hubs.map((h, i) => {
    const phase = i === 0
      ? (STATE.lang === 'en' ? '① Past · 2025-06 → 2026-05' : '① 过去 · 2025-06 → 2026-05')
      : (STATE.lang === 'en' ? '② Future · 2026-05 → 2028-11' : '② 未来 · 2026-05 → 2028-11');
    return `
      <div class="hub-block" data-hub-id="${h.id}">
        <div class="hub-block-header">
          <span class="hub-block-phase">${phase}</span>
          <span class="hub-block-title">${escapeHtml(h.name)}</span>
        </div>
        <p class="hub-block-summary">${escapeHtml(h.summary || h.thesis || '')}</p>
        ${renderOneHubFlow(h)}
      </div>` + (i === 0 ? bridge : '');
  }).join('');

  setTimeout(() => {
    drawPipes();
    attachHubCardHandlers();
  }, 60);
}

function renderOneHubFlow(s) {
  const mech = s.mechanisms && s.mechanisms[0] ? s.mechanisms[0].label : '';
  return `
    <div class="conn-view color-${s.color}" data-hub-id="${s.id}">
      <div class="conn-flow">
        <div class="conn-col conn-col-pre">
          <div class="conn-col-label conn-label-blue">${STATE.lang === 'en' ? 'Preconditions' : '前提条件'} · ${s.preconditions.length}</div>
          ${s.preconditions.map((p, i) => `
            <button class="conn-card conn-card-blue" data-card-type="precondition" data-hub-id="${s.id}" data-card-index="${i}">
              <div class="conn-card-label">${escapeHtml(p.label)}</div>
              ${p.status ? `<div class="pre-status-badge status-${p.status}">${STATUS_LABEL[p.status] || p.status}</div>` : ''}
            </button>`).join('')}
        </div>
        <div class="conn-col conn-col-hub">
          <button class="conn-source-card" data-card-type="hub" data-hub-id="${s.id}" data-card-index="0">
            <div class="conn-source-tag">${STATE.lang === 'en' ? 'Hub' : '中心'}</div>
            <div class="conn-source-name">${escapeHtml(s.name)}</div>
            ${mech ? `<div class="conn-source-mech"><div class="conn-source-mech-label">${STATE.lang === 'en' ? 'Mechanism' : '运作机制'}</div><div class="conn-source-mech-text">${escapeHtml(mech)}</div></div>` : ''}
          </button>
        </div>
        <div class="conn-col conn-col-con">
          <div class="conn-col-label conn-label-orange">${STATE.lang === 'en' ? 'Consequences' : '可能后果'} · ${s.consequences.length}</div>
          ${s.consequences.map((c, i) => {
            const badge = c.actor || (typeof c.weight === 'number' ? Math.round(c.weight * 100) + '%' : '');
            return `<button class="conn-card conn-card-orange" data-card-type="consequence" data-hub-id="${s.id}" data-card-index="${i}">
              <div class="conn-card-label">${escapeHtml(c.label)}</div>
              ${badge ? `<div class="conn-card-badge">${escapeHtml(badge)}</div>` : ''}
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
            <button class="conn-card conn-card-yellow conn-obs-card" data-card-type="hub_observation" data-hub-id="${s.id}" data-card-index="${i}">
              <div class="conn-card-label">${escapeHtml(o.label)}</div>
              ${o.status ? `<div class="pre-status-badge status-${o.status}">${STATUS_LABEL[o.status] || o.status}</div>` : ''}
            </button>`).join('')}
        </div>
      </div>` : ''}
    </div>`;
}

function drawPipes() {
  document.querySelectorAll('.conn-view').forEach(view => {
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
  });
}

window.addEventListener('resize', () => {
  clearTimeout(window._pipeRedraw);
  window._pipeRedraw = setTimeout(drawPipes, 100);
});

function attachHubCardHandlers() {
  document.querySelectorAll('#conn-view [data-card-type]').forEach(el => {
    el.addEventListener('click', () => {
      const type = el.dataset.cardType;
      const hubId = el.dataset.hubId;
      const idx = parseInt(el.dataset.cardIndex, 10);
      openHubNodeDrawer(type, idx, hubId);
    });
  });
}

function openHubNodeDrawer(type, idx, hubId) {
  const hub = STATE.data.hubs.find(h => h.id === hubId);
  if (!hub) return;

  if (type === 'precondition') {
    const p = hub.preconditions[idx];
    setDrawer(STATE.lang === 'en' ? 'Precondition' : '前提条件', `
      <div class="d-status-row">
        ${p.status ? `<span class="pre-status-badge status-${p.status}">${STATUS_LABEL[p.status]}</span>` : ''}
      </div>
      <h2 class="d-title">${escapeHtml(p.label)}</h2>
      ${p.analysis ? `<div class="d-section"><div class="d-section-label">${STATE.lang === 'en' ? 'Analysis' : '分析'}</div><div class="d-prose">${formatRichText(p.analysis, 'd-para')}</div></div>` : ''}
      ${renderDrawerSources(p.sources)}
    `);
  } else if (type === 'consequence') {
    const c = hub.consequences[idx];
    const badge = c.actor || (typeof c.weight === 'number' ? Math.round(c.weight * 100) + '%' : '');
    setDrawer(STATE.lang === 'en' ? 'Consequence' : '可能后果', `
      <div class="d-status-row">
        ${badge ? `<span class="d-actor-badge">${escapeHtml(badge)}</span>` : ''}
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
        ${o.status ? `<span class="pre-status-badge status-${o.status}">${STATUS_LABEL[o.status]}</span>` : ''}
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
    html += `
      <button class="history-card" data-card-type="history" data-card-index="${i}">
        <div class="history-year">${escapeHtml(s.year)}</div>
        <div class="history-label">${escapeHtml(s.label)}</div>
        <div class="history-preview">${escapeHtml(s.narrative.substring(0, 200))}…</div>
      </button>`;
  });
  html += '</div>';
  html += `
    <div class="history-key-diff">
      <div class="label">${t('history.current_judgment')}</div>
      ${escapeHtml(h.current_judgment)}
    </div>`;
  c.innerHTML = html;
  document.querySelectorAll('[data-card-type="history"]').forEach(el => {
    el.addEventListener('click', () => openHistoryDrawer(parseInt(el.dataset.cardIndex, 10)));
  });
}

function openHistoryDrawer(index) {
  const s = STATE.data.history_compare.scenarios[index];
  setDrawer(t('drawer.tag.history') + ' · ' + s.year, `
    <h2 class="d-title">${escapeHtml(s.label)}</h2>
    <div class="d-section">
      <div class="d-section-label">${t('drawer.narrative')}</div>
      <div class="d-prose">${formatRichText(s.narrative, 'd-para')}</div>
    </div>
    <div class="d-section">
      <div class="d-section-label">${t('drawer.applicability')}</div>
      <div class="d-prose">${formatRichText(s.applicability, 'd-para')}</div>
    </div>
  `);
}

/* ============ Glossary ============ */

function renderGlossary() {
  const c = document.getElementById('glossary');
  if (!STATE.data.glossary) return;
  let html = '<div class="glossary-grid">';
  STATE.data.glossary.forEach(g => {
    html += `
      <div class="glossary-item">
        <div class="g-term">
          <span class="g-zh">${escapeHtml(g.zh)}</span>
          <span class="g-en">${escapeHtml(g.en)}</span>
        </div>
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
      <span class="d-source-arrow">↗</span>
      <span>${escapeHtml(s.label)}</span>
    </a>`;
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

// ============ v3 new renderers ============

function renderTrumpStrategy() {
  const c = document.getElementById('trump-consumption-strategy');
  if (!c || !STATE.data.trump_internal_consumption_strategy) return;
  const s = STATE.data.trump_internal_consumption_strategy;
  c.innerHTML = `
    <div class="trump-strategy-card">
      <div class="trump-strategy-framework">${escapeHtml(s.framework_description)}</div>
      <div class="trump-strategy-arrangements">
        ${(s.three_arrangements || []).map((a, i) => `
          <div class="trump-arrangement">
            <div class="trump-arrangement-num">安排 ${i+1}</div>
            <div class="trump-arrangement-label">${escapeHtml(a.label)}</div>
            <div class="trump-arrangement-logic">${escapeHtml(a.logic)}</div>
          </div>
        `).join('')}
      </div>
      <div class="trump-strategy-implication">
        <div class="trump-implication-label">结果</div>
        <div class="trump-implication-text">${formatRichText(s.implication, 'd-para')}</div>
      </div>
    </div>
  `;
}

function renderBridgingSection() {
  const c = document.getElementById('bridging-content');
  if (!c || !STATE.data.bridging_section) return;
  const b = STATE.data.bridging_section;
  c.innerHTML = `
    <div class="bridging-card">
      <div class="bridging-window">
        <span class="bridging-window-label">时间窗口</span>
        <span class="bridging-window-value">${escapeHtml(b.time_window)}</span>
      </div>
      <div class="bridging-intro">${formatRichText(b.intro, 'd-para')}</div>

      <div class="bridging-section-block">
        <div class="bridging-section-label">${escapeHtml(b.israel_capability_constraints.label)}</div>
        <div class="bridging-capability-grid">
          <div class="bridging-capability-col">
            <div class="bridging-capability-col-label">✓ 单方面能做的</div>
            <ul class="rich-list">${b.israel_capability_constraints.can_do.map(x => `<li>${escapeHtml(x)}</li>`).join('')}</ul>
          </div>
          <div class="bridging-capability-col">
            <div class="bridging-capability-col-label">✗ 单方面不能做的</div>
            <ul class="rich-list">${b.israel_capability_constraints.cannot_do.map(x => `<li>${escapeHtml(x)}</li>`).join('')}</ul>
          </div>
        </div>
        <div class="bridging-capability-implication">${escapeHtml(b.israel_capability_constraints.implication)}</div>
      </div>

      <div class="bridging-section-block">
        <div class="bridging-section-label">以色列升级路径</div>
        <div class="bridging-paths">
          ${(b.israel_escalation_paths || []).map(p => `
            <div class="bridging-path">
              <div class="bridging-path-header">
                <span class="bridging-path-label">${escapeHtml(p.label)}</span>
                <span class="bridging-path-prob">${escapeHtml(p.probability)}</span>
              </div>
              <div class="bridging-path-detail">
                <div><strong>形式</strong>：${escapeHtml(p.form || '')}</div>
                ${p.purpose ? `<div><strong>目的</strong>：${escapeHtml(p.purpose)}</div>` : ''}
                ${p.trigger ? `<div><strong>触发</strong>：${escapeHtml(p.trigger)}</div>` : ''}
                ${p.constraint ? `<div><strong>约束</strong>：${escapeHtml(p.constraint)}</div>` : ''}
                ${p.maga_reaction ? `<div><strong>MAGA 反应</strong>：${escapeHtml(p.maga_reaction)}</div>` : ''}
                ${p.key_risk ? `<div class="bridging-path-risk"><strong>关键风险</strong>：${escapeHtml(p.key_risk)}</div>` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="bridging-section-block">
        <div class="bridging-section-label">${escapeHtml(b.maga_faction_reaction_matrix.label)}</div>
        <div class="bridging-matrix-wrap">
          <table class="bridging-matrix">
            <thead>
              <tr><th>升级类型</th><th>原教旨派</th><th>强袭派</th><th>福音派</th><th>后自由派</th></tr>
            </thead>
            <tbody>
              ${b.maga_faction_reaction_matrix.rows.map(r => `
                <tr>
                  <td class="bridging-matrix-rowlabel">${escapeHtml(r.escalation_type)}</td>
                  <td>${escapeHtml(r.paleo)}</td>
                  <td>${escapeHtml(r.hawk)}</td>
                  <td>${escapeHtml(r.evangelical)}</td>
                  <td>${escapeHtml(r.post_liberal)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <div class="bridging-section-block">
        <div class="bridging-section-label">对 2028 初选的含义</div>
        <div class="bridging-implications">${formatRichText(b.implications_for_2028, 'd-para')}</div>
      </div>
    </div>
  `;
}

function handleHashJump() {
  if (window.location.hash) {
    const hash = window.location.hash.substring(1);
    setTimeout(() => {
      const el = document.getElementById(hash);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 200);
  }
}
window.addEventListener('hashchange', handleHashJump);
