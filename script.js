/* =========================================================
   FINANCES PUBLIQUES · FRANCE — script.js
   SPA navigation + Chart.js monochrome + data fetch
   ========================================================= */

'use strict';

// ── Chart.js global defaults ─────────────────────────────
Chart.defaults.font.family = "'DM Mono', monospace";
Chart.defaults.font.size = 11;
Chart.defaults.color = '#6a6a6a';
Chart.defaults.borderColor = '#ebebeb';
Chart.defaults.plugins.legend.display = false;
Chart.defaults.plugins.tooltip.backgroundColor = '#0a0a0a';
Chart.defaults.plugins.tooltip.titleColor = '#fafafa';
Chart.defaults.plugins.tooltip.bodyColor = '#b4b4b4';
Chart.defaults.plugins.tooltip.borderWidth = 0;
Chart.defaults.plugins.tooltip.padding = 10;
Chart.defaults.plugins.tooltip.cornerRadius = 2;

// ── Palette monochrome ────────────────────────────────────
const PALETTE = {
  solid:      '#0a0a0a',
  solidLight: '#444444',
  line:       '#0a0a0a',
  fill:       'rgba(10,10,10,0.06)',
  gridBars:   ['#0a0a0a','#1c1c1c','#2e2e2e','#444444','#6a6a6a','#8c8c8c','#b4b4b4','#d4d4d4'],
};

// ── State ─────────────────────────────────────────────────
const state = {
  section: 'home',
  activeKpi: null,
  data: {},
  charts: {},
};

// ── Data files to load ────────────────────────────────────
const DATA_FILES = {
  budget:  'data/budget.json',
  dette:   'data/dette.json',
  recettes:'data/recettes.json',
  deficit: 'data/deficit.json',
  macro:   'data/macro.json',
};

// ── KPI definitions for home page ────────────────────────
const KPI_DEFS = [
  {
    id: 'dette-pib',
    label: 'Dette / PIB',
    eyebrow: 'Endettement souverain',
    getValue: (d) => d.dette?.dette_pib?.serie?.at(-1)?.valeur,
    unit: '%',
    desc: "Ratio d'endettement public sur le PIB",
    source: 'INSEE · Eurostat · 2024',
    chartData: (d) => ({
      labels: d.dette.dette_pib.serie.map(x=>x.annee),
      values: d.dette.dette_pib.serie.map(x=>x.valeur),
    }),
    chartType: 'line',
    related: [
      { label: 'Déficit / PIB', target: 'deficit', section: 'deficit' },
      { label: 'Charge d\'intérêts', target: 'charge-interets', section: 'dette' },
      { label: 'Croissance du PIB', target: 'croissance', section: 'home' },
    ],
  },
  {
    id: 'deficit-pib',
    label: 'Déficit public',
    eyebrow: 'Solde des finances publiques',
    getValue: (d) => d.deficit?.deficit_pib?.serie?.at(-1)?.valeur,
    unit: '% PIB',
    desc: 'Écart entre les recettes et les dépenses publiques',
    source: 'INSEE · Cour des Comptes · 2024',
    chartData: (d) => ({
      labels: d.deficit.deficit_pib.serie.map(x=>x.annee),
      values: d.deficit.deficit_pib.serie.map(x=>x.valeur),
    }),
    chartType: 'bar',
    related: [
      { label: 'Dette / PIB', target: 'dette-pib', section: 'home' },
      { label: 'Dépenses totales', target: 'depenses', section: 'budget' },
      { label: 'Recettes totales', target: 'recettes', section: 'recettes' },
    ],
  },
  {
    id: 'depenses',
    label: 'Dépenses État',
    eyebrow: 'Dépenses totales',
    getValue: (d) => d.budget?.depenses_totales?.serie?.at(-1)?.valeur,
    unit: 'Mds €',
    desc: 'Total des dépenses du budget de l\'État (hors remboursements)',
    source: 'Direction du Budget · PLF 2024',
    chartData: (d) => ({
      labels: d.budget.depenses_totales.serie.map(x=>x.annee),
      values: d.budget.depenses_totales.serie.map(x=>x.valeur),
    }),
    chartType: 'bar',
    related: [
      { label: 'Recettes fiscales', target: 'recettes-total', section: 'recettes' },
      { label: 'Déficit budgétaire', target: 'deficit-pib', section: 'home' },
      { label: 'Charge d\'intérêts', target: 'charge-interets', section: 'dette' },
    ],
  },
  {
    id: 'recettes-total',
    label: 'Recettes fiscales',
    eyebrow: 'Recettes de l\'État',
    getValue: (d) => d.recettes?.recettes_totales?.serie?.at(-1)?.valeur,
    unit: 'Mds €',
    desc: 'Total des recettes budgétaires nettes de l\'État',
    source: 'DGFiP · PLF 2024',
    chartData: (d) => ({
      labels: d.recettes.recettes_totales.serie.map(x=>x.annee),
      values: d.recettes.recettes_totales.serie.map(x=>x.valeur),
    }),
    chartType: 'line',
    related: [
      { label: 'TVA', target: 'tva', section: 'recettes' },
      { label: 'Impôt sur le revenu', target: 'ir', section: 'recettes' },
      { label: 'Dépenses État', target: 'depenses', section: 'home' },
    ],
  },
  {
    id: 'charge-interets',
    label: 'Charge d\'intérêts',
    eyebrow: 'Coût de la dette',
    getValue: (d) => d.dette?.charge_interets?.serie?.at(-1)?.valeur,
    unit: 'Mds €',
    desc: 'Intérêts annuels versés sur la dette publique',
    source: 'Direction du Budget · Agence France Trésor · 2024',
    chartData: (d) => ({
      labels: d.dette.charge_interets.serie.map(x=>x.annee),
      values: d.dette.charge_interets.serie.map(x=>x.valeur),
    }),
    chartType: 'bar',
    related: [
      { label: 'Dette / PIB', target: 'dette-pib', section: 'home' },
      { label: 'Déficit / PIB', target: 'deficit-pib', section: 'home' },
      { label: 'Dépenses totales', target: 'depenses', section: 'home' },
    ],
  },
  {
    id: 'croissance',
    label: 'Croissance PIB',
    eyebrow: 'Dynamique économique',
    getValue: (d) => d.macro?.croissance?.serie?.at(-1)?.valeur,
    unit: '%',
    desc: 'Taux de croissance du PIB réel en volume',
    source: 'INSEE · Banque de France · 2024',
    chartData: (d) => ({
      labels: d.macro.croissance.serie.map(x=>x.annee),
      values: d.macro.croissance.serie.map(x=>x.valeur),
    }),
    chartType: 'bar',
    related: [
      { label: 'Prélèvements / PIB', target: 'po-pib', section: 'recettes' },
      { label: 'Dette / PIB', target: 'dette-pib', section: 'home' },
      { label: 'Recettes fiscales', target: 'recettes-total', section: 'home' },
    ],
  },
];

// ── Helpers ────────────────────────────────────────────────
const fmt = (v, unit='') => {
  if (v === undefined || v === null) return '—';
  const abs = Math.abs(v);
  const str = abs >= 1000
    ? (abs/1000).toFixed(1) + ' 000'
    : abs % 1 === 0 ? abs.toString() : abs.toFixed(1);
  return (v < 0 ? '−' : '') + str + (unit ? '\u202f' + unit : '');
};

const fmtSimple = (v) => v !== undefined ? (v < 0 ? '−' + Math.abs(v) : v) : '—';

function destroyChart(id) {
  if (state.charts[id]) {
    state.charts[id].destroy();
    delete state.charts[id];
  }
}

// ── Chart factory ──────────────────────────────────────────
function makeLineChart(canvasId, labels, values, opts = {}) {
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;
  state.charts[canvasId] = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data: values,
        borderColor: PALETTE.line,
        borderWidth: 1.5,
        backgroundColor: PALETTE.fill,
        fill: true,
        tension: 0.35,
        pointRadius: 4,
        pointBackgroundColor: PALETTE.solid,
        pointBorderColor: '#fafafa',
        pointBorderWidth: 1.5,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, border: { display: false } },
        y: {
          grid: { color: '#ebebeb', drawBorder: false },
          border: { display: false },
          ...opts.yScale,
        },
      },
      ...opts.extra,
    },
  });
}

function makeBarChart(canvasId, labels, values, opts = {}) {
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;
  state.charts[canvasId] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: values.map(v => v < 0 ? '#2e2e2e' : '#0a0a0a'),
        borderWidth: 0,
        borderRadius: 1,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, border: { display: false } },
        y: {
          grid: { color: '#ebebeb', drawBorder: false },
          border: { display: false },
          ...opts.yScale,
        },
      },
      ...opts.extra,
    },
  });
}

function makeHBarChart(canvasId, labels, values) {
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;
  state.charts[canvasId] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: PALETTE.gridBars.slice(0, values.length),
        borderWidth: 0,
        borderRadius: 1,
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: '#ebebeb' }, border: { display: false } },
        y: { grid: { display: false }, border: { display: false } },
      },
    },
  });
}

function makeDoughnutChart(canvasId, labels, values) {
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;
  state.charts[canvasId] = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: PALETTE.gridBars.slice(0, values.length),
        borderColor: '#fafafa',
        borderWidth: 2,
      }]
    },
    options: {
      responsive: true,
      cutout: '60%',
      plugins: {
        legend: {
          display: true,
          position: 'bottom',
          labels: {
            boxWidth: 10,
            padding: 10,
            font: { size: 10, family: "'DM Mono', monospace" },
          }
        }
      },
    },
  });
}

// ── Load all data ──────────────────────────────────────────
async function loadData() {
  const entries = await Promise.all(
    Object.entries(DATA_FILES).map(async ([key, path]) => {
      const res = await fetch(path);
      if (!res.ok) throw new Error(`Failed to load ${path}`);
      const json = await res.json();
      return [key, json];
    })
  );
  entries.forEach(([k, v]) => { state.data[k] = v; });
}

// ── Build home KPI cards ───────────────────────────────────
function buildKpiGrid() {
  const grid = document.getElementById('kpi-grid');
  grid.innerHTML = '';
  KPI_DEFS.forEach(kpi => {
    const val = kpi.getValue(state.data);
    const card = document.createElement('div');
    card.className = 'kpi-card';
    card.dataset.id = kpi.id;
    card.innerHTML = `
      <div class="kpi-eyebrow">${kpi.eyebrow}</div>
      <div class="kpi-value">${fmtSimple(val)}<span class="kpi-unit">${kpi.unit}</span></div>
      <div class="kpi-label">${kpi.label}</div>
      <div class="kpi-trend">2024</div>
      <div class="kpi-cta">Détail <span class="arrow">→</span></div>
    `;
    card.addEventListener('click', () => openKpiDetail(kpi.id));
    grid.appendChild(card);
  });
}

// ── Open KPI detail panel ──────────────────────────────────
function openKpiDetail(id) {
  const kpi = KPI_DEFS.find(k => k.id === id);
  if (!kpi) return;

  // Toggle: clicking same card closes panel
  if (state.activeKpi === id) {
    closeKpiDetail();
    return;
  }
  state.activeKpi = id;

  // Update card styles
  document.querySelectorAll('.kpi-card').forEach(c => {
    c.classList.toggle('active', c.dataset.id === id);
  });

  // Fill panel
  const val = kpi.getValue(state.data);
  document.getElementById('detail-panel-title').textContent = kpi.eyebrow;
  document.getElementById('detail-kpi-big').textContent = fmtSimple(val) + '\u202f' + kpi.unit;
  document.getElementById('detail-kpi-label').textContent = kpi.desc;
  document.getElementById('detail-source').textContent = kpi.source;

  // Related links
  const relEl = document.getElementById('detail-related');
  relEl.innerHTML = `
    <div class="detail-related-title">Stats liées</div>
    <div class="related-links">
      ${kpi.related.map(r => `
        <button class="related-link" data-target="${r.target}" data-section="${r.section}">${r.label} →</button>
      `).join('')}
    </div>
  `;
  relEl.querySelectorAll('.related-link').forEach(btn => {
    btn.addEventListener('click', () => {
      const sec = btn.dataset.section;
      const tgt = btn.dataset.target;
      if (sec === 'home') {
        openKpiDetail(tgt);
      } else {
        navigateTo(sec);
      }
    });
  });

  // Chart
  const panel = document.getElementById('home-detail-panel');
  panel.classList.add('open');

  // scroll panel into view smoothly
  setTimeout(() => {
    panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, 50);

  // Build chart
  const { labels, values } = kpi.chartData(state.data);
  if (kpi.chartType === 'line') {
    makeLineChart('detail-chart', labels, values);
  } else {
    makeBarChart('detail-chart', labels, values);
  }
}

function closeKpiDetail() {
  state.activeKpi = null;
  document.querySelectorAll('.kpi-card').forEach(c => c.classList.remove('active'));
  document.getElementById('home-detail-panel').classList.remove('open');
  destroyChart('detail-chart');
}

// ── Section charts ─────────────────────────────────────────
function buildBudgetCharts() {
  const d = state.data;

  // Sub KPIs
  const kpis = [
    { label: 'Dépenses 2024', val: d.budget.depenses_totales.serie.at(-1).valeur, unit: 'Mds €' },
    { label: 'Solde 2024', val: d.budget.solde_budgetaire.serie.at(-1).valeur, unit: 'Mds €' },
    { label: 'vs 2019', val: '+' + (d.budget.depenses_totales.serie.at(-1).valeur - d.budget.depenses_totales.serie[0].valeur).toFixed(1), unit: 'Mds €' },
    { label: 'Mois de dépenses financés par déficit', val: ((Math.abs(d.budget.solde_budgetaire.serie.at(-1).valeur) / d.budget.depenses_totales.serie.at(-1).valeur) * 12).toFixed(1), unit: 'mois' },
  ];
  buildSubKpis('budget-kpis', kpis);

  const dep = d.budget.depenses_totales.serie;
  makeBarChart('chart-depenses', dep.map(x=>x.annee), dep.map(x=>x.valeur));

  const solde = d.budget.solde_budgetaire.serie;
  makeBarChart('chart-solde', solde.map(x=>x.annee), solde.map(x=>x.valeur));

  const missions = d.budget.depenses_par_mission.serie;
  makeDoughnutChart('chart-missions', missions.map(x=>x.mission), missions.map(x=>x.valeur));
}

function buildDetteCharts() {
  const d = state.data;

  const kpis = [
    { label: 'Dette 2024', val: (d.dette.dette_absolue.serie.at(-1).valeur / 1000).toFixed(2), unit: 'T€' },
    { label: 'Dette / PIB 2024', val: d.dette.dette_pib.serie.at(-1).valeur, unit: '%' },
    { label: 'Charge intérêts 2024', val: d.dette.charge_interets.serie.at(-1).valeur, unit: 'Mds €' },
    { label: 'vs Allemagne (dette/PIB)', val: 112.0 - 63.6, unit: 'pts %' },
  ];
  buildSubKpis('dette-kpis', kpis);

  const pib = d.dette.dette_pib.serie;
  makeLineChart('chart-dette-pib', pib.map(x=>x.annee), pib.map(x=>x.valeur), {
    yScale: { min: 90, max: 120 }
  });

  const abs = d.dette.dette_absolue.serie;
  makeBarChart('chart-dette-abs', abs.map(x=>x.annee), abs.map(x=>x.valeur));

  const interets = d.dette.charge_interets.serie;
  makeBarChart('chart-interets', interets.map(x=>x.annee), interets.map(x=>x.valeur));

  const ue = d.dette.comparaison_ue.serie;
  makeHBarChart('chart-dette-ue', ue.map(x=>x.pays), ue.map(x=>x.valeur));
}

function buildRecettesCharts() {
  const d = state.data;

  const kpis = [
    { label: 'Recettes 2024', val: d.recettes.recettes_totales.serie.at(-1).valeur, unit: 'Mds €' },
    { label: 'TVA 2024', val: d.recettes.recettes_par_impot.serie[0].valeur, unit: 'Mds €' },
    { label: 'IR 2024', val: d.recettes.recettes_par_impot.serie[1].valeur, unit: 'Mds €' },
    { label: 'IS 2024', val: d.recettes.recettes_par_impot.serie[2].valeur, unit: 'Mds €' },
  ];
  buildSubKpis('recettes-kpis', kpis);

  const tot = d.recettes.recettes_totales.serie;
  makeLineChart('chart-recettes-total', tot.map(x=>x.annee), tot.map(x=>x.valeur));

  const imp = d.recettes.recettes_par_impot.serie;
  makeHBarChart('chart-recettes-repartition', imp.map(x=>x.impot), imp.map(x=>x.valeur));

  const po = d.macro.prelevements_obligatoires.serie;
  makeLineChart('chart-po-pib', po.map(x=>x.annee), po.map(x=>x.valeur), {
    yScale: { min: 42, max: 47 }
  });
}

function buildDeficitCharts() {
  const d = state.data;

  const kpis = [
    { label: 'Déficit / PIB 2024', val: d.deficit.deficit_pib.serie.at(-1).valeur, unit: '%' },
    { label: 'Déficit absolu 2024', val: d.deficit.deficit_absolu.serie.at(-1).valeur, unit: 'Mds €' },
    { label: 'Seuil Maastricht', val: '−3', unit: '% PIB' },
    { label: 'Écart au seuil', val: (d.deficit.deficit_pib.serie.at(-1).valeur - (-3)).toFixed(1), unit: 'pts %' },
  ];
  buildSubKpis('deficit-kpis', kpis);

  // Déficit / PIB + ligne Maastricht
  destroyChart('chart-deficit-pib');
  const ctx = document.getElementById('chart-deficit-pib');
  if (ctx) {
    const dpib = d.deficit.deficit_pib.serie;
    state.charts['chart-deficit-pib'] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: dpib.map(x=>x.annee),
        datasets: [
          {
            type: 'bar',
            data: dpib.map(x=>x.valeur),
            backgroundColor: '#0a0a0a',
            borderWidth: 0,
            borderRadius: 1,
            label: 'Déficit / PIB',
          },
          {
            type: 'line',
            data: dpib.map(() => -3),
            borderColor: '#8c8c8c',
            borderWidth: 1,
            borderDash: [4,3],
            pointRadius: 0,
            fill: false,
            label: 'Seuil Maastricht −3%',
          },
        ]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            display: true,
            position: 'bottom',
            labels: { boxWidth: 10, font: { size: 10, family: "'DM Mono', monospace" } }
          }
        },
        scales: {
          x: { grid: { display: false }, border: { display: false } },
          y: { grid: { color: '#ebebeb' }, border: { display: false } },
        },
      },
    });
  }

  const dabs = d.deficit.deficit_absolu.serie;
  makeBarChart('chart-deficit-abs', dabs.map(x=>x.annee), dabs.map(x=>x.valeur));

  const due = d.deficit.comparaison_ue_deficit.serie;
  makeHBarChart('chart-deficit-ue', due.map(x=>x.pays), due.map(x=>x.valeur));
}

function buildSubKpis(containerId, kpis) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = kpis.map(k => `
    <div class="sub-kpi">
      <div class="sub-kpi-label">${k.label}</div>
      <div class="sub-kpi-val">${k.val}<span class="sub-kpi-unit">${k.unit}</span></div>
      <div class="sub-kpi-year">2024</div>
    </div>
  `).join('');
}

// ── Navigation ─────────────────────────────────────────────
const SECTION_BUILDERS = {
  budget:   buildBudgetCharts,
  dette:    buildDetteCharts,
  recettes: buildRecettesCharts,
  deficit:  buildDeficitCharts,
};

function navigateTo(sectionId) {
  if (state.section === sectionId) return;

  // Hide all sections
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.getElementById(`section-${sectionId}`)?.classList.add('active');

  // Update nav
  document.querySelectorAll('.nav-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.section === sectionId);
  });

  // Close detail panel if leaving home
  if (sectionId !== 'home') {
    closeKpiDetail();
  }

  state.section = sectionId;

  // Build charts for section (lazy)
  if (SECTION_BUILDERS[sectionId]) {
    // Tiny delay so DOM is visible before canvas renders
    setTimeout(() => SECTION_BUILDERS[sectionId](), 30);
  }

  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Close mobile nav
  document.getElementById('mobileNav').classList.remove('open');
}

// ── Mobile menu ────────────────────────────────────────────
document.getElementById('menuToggle').addEventListener('click', () => {
  document.getElementById('mobileNav').classList.toggle('open');
});

// ── Event delegation for nav buttons ──────────────────────
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => navigateTo(btn.dataset.section));
});

document.getElementById('close-detail').addEventListener('click', closeKpiDetail);

// ── Init ───────────────────────────────────────────────────
async function init() {
  try {
    await loadData();
    buildKpiGrid();
  } catch (err) {
    console.error('Data load error:', err);
    document.getElementById('kpi-grid').innerHTML = `
      <div style="grid-column:1/-1;padding:2rem;font-family:var(--font-mono);font-size:0.8rem;color:#8c8c8c;">
        ⚠ Impossible de charger les données. Assurez-vous que les fichiers JSON sont présents dans <code>data/</code>.
        <br><br>
        <small>Erreur : ${err.message}</small>
      </div>
    `;
  }
}

init();