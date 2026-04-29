'use strict';
/* =========================================================
   FINANCES PUBLIQUES · FRANCE v2 — script.js
   ========================================================= */

// ── Chart.js defaults ────────────────────────────────────
Chart.defaults.font.family = "'DM Mono', monospace";
Chart.defaults.font.size   = 11;
Chart.defaults.color       = '#6a6a6a';
Chart.defaults.borderColor = '#ebebeb';
Chart.defaults.plugins.legend.display = false;
Chart.defaults.plugins.tooltip.backgroundColor = '#0a0a0a';
Chart.defaults.plugins.tooltip.titleColor  = '#fafafa';
Chart.defaults.plugins.tooltip.bodyColor   = '#b4b4b4';
Chart.defaults.plugins.tooltip.padding     = 10;
Chart.defaults.plugins.tooltip.cornerRadius= 2;

// ── Palette ───────────────────────────────────────────────
const GRAY = ['#0a0a0a','#2e2e2e','#444','#6a6a6a','#8c8c8c','#b4b4b4','#d4d4d4','#ebebeb'];
const COMP_COLORS = ['#0a0a0a','#6a6a6a','#b4b4b4','#2e2e2e'];

// ── State ─────────────────────────────────────────────────
const S = {
  section: 'home',
  activeKpi: null,
  data: {},
  charts: {},
  compSeries: [],
  compMode: 'overlay',
  regionMetric: 'pib_par_hab',
};

// ── Data files ────────────────────────────────────────────
const FILES = {
  budget:        'data/budget.json',
  dette:         'data/dette.json',
  recettes:      'data/recettes.json',
  deficit:       'data/deficit.json',
  macro:         'data/macro.json',
  regions:       'data/regions.json',
  series_longues:'data/series_longues.json',
};

// ── All available series for the comparateur ─────────────
const ALL_SERIES = [
  { id:'dette_pib',      label:'Dette / PIB (%)',                    src:(d)=>({years:d.sl.annees, vals:d.sl.dette_pib}) },
  { id:'deficit_pib',    label:'Déficit / PIB (%)',                   src:(d)=>({years:d.sl.annees, vals:d.sl.deficit_pib}) },
  { id:'depenses_pib',   label:'Dépenses publiques / PIB (%)',        src:(d)=>({years:d.sl.annees, vals:d.sl.depenses_pib}) },
  { id:'po_pib',         label:'Prélèvements obligatoires / PIB (%)', src:(d)=>({years:d.sl.annees, vals:d.sl.prelevements_obligatoires}) },
  { id:'croissance',     label:'Croissance PIB réel (%)',             src:(d)=>({years:d.sl.annees, vals:d.sl.croissance}) },
  { id:'inflation',      label:'Inflation IPC (%)',                   src:(d)=>({years:d.sl.annees, vals:d.sl.inflation}) },
  { id:'chomage',        label:'Taux de chômage (%)',                 src:(d)=>({years:d.sl.annees, vals:d.sl.taux_chomage}) },
  { id:'taux_10ans',     label:'Taux OAT 10 ans (%)',                 src:(d)=>({years:d.sl.annees, vals:d.sl.taux_10ans}) },
  { id:'charge_int',     label:'Charge intérêts (Mds €)',             src:(d)=>({years:d.sl.annees, vals:d.sl.charge_interets}) },
  { id:'dette_abs',      label:'Dette absolue (Mds €)',               src:(d)=>({years:d.sl.annees, vals:d.sl.dette_absolue}) },
  { id:'recettes_etat',  label:'Recettes État (Mds €)',               src:(d)=>({years:d.sl.annees, vals:d.sl.recettes_etat}) },
  { id:'depenses_etat',  label:'Dépenses État (Mds €)',               src:(d)=>({years:d.sl.annees, vals:d.sl.depenses_etat}) },
  { id:'masse_sal',      label:'Masse salariale État (Mds €)',        src:(d)=>({years:d.sl.annees, vals:d.sl.masse_salariale_etat}) },
  { id:'invest_pub',     label:'Investissement public / PIB (%)',     src:(d)=>({years:d.sl.annees, vals:d.sl.investissement_public_pib}) },
  { id:'solde_prim',     label:'Solde primaire / PIB (%)',            src:(d)=>({years:d.sl.annees, vals:d.sl.solde_primaire_pib}) },
];

// ── KPI home defs ─────────────────────────────────────────
const KPI_DEFS = [
  {
    id:'dette-pib', eyebrow:'Endettement souverain', label:'Dette / PIB',
    getValue:(d)=> d.dette.dette_pib.serie.at(-1).valeur, unit:'%',
    desc:"Ratio d'endettement public sur le PIB nominal",
    source:'INSEE · Eurostat · 2024',
    chartData:(d)=>({ labels:d.dette.dette_pib.serie.map(x=>x.annee), values:d.dette.dette_pib.serie.map(x=>x.valeur) }),
    chartType:'line',
    related:[
      {label:"Déficit / PIB", target:'deficit-pib', section:'home'},
      {label:"Charge d'intérêts", target:'charge-interets', section:'home'},
      {label:"Série longue 2010–2024", target:null, section:'tendances'},
    ],
  },
  {
    id:'deficit-pib', eyebrow:'Solde des finances publiques', label:'Déficit public',
    getValue:(d)=> d.deficit.deficit_pib.serie.at(-1).valeur, unit:'% PIB',
    desc:"Écart entre les recettes et les dépenses des administrations publiques",
    source:'INSEE · Cour des Comptes · 2024',
    chartData:(d)=>({ labels:d.deficit.deficit_pib.serie.map(x=>x.annee), values:d.deficit.deficit_pib.serie.map(x=>x.valeur) }),
    chartType:'bar',
    related:[
      {label:'Dette / PIB', target:'dette-pib', section:'home'},
      {label:'Dépenses totales', target:'depenses', section:'home'},
      {label:'Recettes fiscales', target:'recettes-total', section:'home'},
    ],
  },
  {
    id:'depenses', eyebrow:'Dépenses totales', label:"Dépenses État",
    getValue:(d)=> d.budget.depenses_totales.serie.at(-1).valeur, unit:'Mds €',
    desc:"Total des dépenses du budget général de l'État (hors remboursements)",
    source:'Direction du Budget · PLF 2024',
    chartData:(d)=>({ labels:d.budget.depenses_totales.serie.map(x=>x.annee), values:d.budget.depenses_totales.serie.map(x=>x.valeur) }),
    chartType:'bar',
    related:[
      {label:'Recettes fiscales', target:'recettes-total', section:'home'},
      {label:'Solde budgétaire', target:'deficit-pib', section:'home'},
      {label:"Charge d'intérêts", target:'charge-interets', section:'home'},
    ],
  },
  {
    id:'recettes-total', eyebrow:"Recettes de l'État", label:'Recettes fiscales',
    getValue:(d)=> d.recettes.recettes_totales.serie.at(-1).valeur, unit:'Mds €',
    desc:"Total des recettes budgétaires nettes de l'État",
    source:'DGFiP · PLF 2024',
    chartData:(d)=>({ labels:d.recettes.recettes_totales.serie.map(x=>x.annee), values:d.recettes.recettes_totales.serie.map(x=>x.valeur) }),
    chartType:'line',
    related:[
      {label:'TVA', target:null, section:'recettes'},
      {label:"Impôt sur le revenu", target:null, section:'recettes'},
      {label:"Dépenses État", target:'depenses', section:'home'},
    ],
  },
  {
    id:'charge-interets', eyebrow:'Coût de la dette', label:"Charge d'intérêts",
    getValue:(d)=> d.dette.charge_interets.serie.at(-1).valeur, unit:'Mds €',
    desc:"Intérêts annuels versés sur la dette publique — 1er poste de dépenses en 2024",
    source:"Direction du Budget · Agence France Trésor · 2024",
    chartData:(d)=>({ labels:d.dette.charge_interets.serie.map(x=>x.annee), values:d.dette.charge_interets.serie.map(x=>x.valeur) }),
    chartType:'bar',
    related:[
      {label:'Dette / PIB', target:'dette-pib', section:'home'},
      {label:'Taux OAT 10 ans', target:null, section:'dette'},
      {label:'Déficit / PIB', target:'deficit-pib', section:'home'},
    ],
  },
  {
    id:'croissance', eyebrow:'Dynamique économique', label:'Croissance PIB',
    getValue:(d)=> d.macro.croissance.serie.at(-1).valeur, unit:'%',
    desc:"Taux de croissance du PIB réel en volume — 2024 (estimation)",
    source:'INSEE · Banque de France · 2024',
    chartData:(d)=>({ labels:d.macro.croissance.serie.map(x=>x.annee), values:d.macro.croissance.serie.map(x=>x.valeur) }),
    chartType:'bar',
    related:[
      {label:"Prélèvements / PIB", target:null, section:'recettes'},
      {label:'Dette / PIB', target:'dette-pib', section:'home'},
      {label:'Inflation', target:null, section:'tendances'},
    ],
  },
];

// ── Helpers ───────────────────────────────────────────────
function fmtSimple(v){ if(v===undefined||v===null) return '—'; return v<0 ? '−'+Math.abs(v) : ''+v; }
function fmtNum(v,dec=1){ if(v===undefined||v===null) return '—'; return (Math.abs(v)>=1000?(Math.abs(v)/1000).toFixed(1)+' 000':Math.abs(v)%1===0?''+Math.abs(v):Math.abs(v).toFixed(dec)); }
function sign(v){ return v>0?'+':''; }

function destroyChart(id){
  if(S.charts[id]){ S.charts[id].destroy(); delete S.charts[id]; }
}

// ── Chart factories ───────────────────────────────────────
function lineChart(id, labels, values, opts={}){
  destroyChart(id);
  const ctx=document.getElementById(id); if(!ctx) return;
  S.charts[id]=new Chart(ctx,{
    type:'line',
    data:{ labels, datasets:[{
      data:values, borderColor:'#0a0a0a', borderWidth:1.5,
      backgroundColor:'rgba(10,10,10,0.06)', fill:true, tension:.35,
      pointRadius:4, pointBackgroundColor:'#0a0a0a', pointBorderColor:'#fafafa', pointBorderWidth:1.5,
    }]},
    options:{ responsive:true, maintainAspectRatio:true,
      plugins:{ legend:{display:false} },
      scales:{ x:{grid:{display:false},border:{display:false}}, y:{grid:{color:'#ebebeb'},border:{display:false},...(opts.yScale||{})} },
      ...(opts.extra||{})
    },
  });
}

function barChart(id, labels, values, opts={}){
  destroyChart(id);
  const ctx=document.getElementById(id); if(!ctx) return;
  S.charts[id]=new Chart(ctx,{
    type:'bar',
    data:{ labels, datasets:[{
      data:values,
      backgroundColor:values.map(v=>v<0?'#2e2e2e':'#0a0a0a'),
      borderWidth:0, borderRadius:1,
    }]},
    options:{ responsive:true, maintainAspectRatio:true,
      plugins:{ legend:{display:false} },
      scales:{ x:{grid:{display:false},border:{display:false}}, y:{grid:{color:'#ebebeb'},border:{display:false},...(opts.yScale||{})} },
      ...(opts.extra||{})
    },
  });
}

function hBarChart(id, labels, values, opts={}){
  destroyChart(id);
  const ctx=document.getElementById(id); if(!ctx) return;
  const colors = opts.colorByValue
    ? values.map(v=>{ const mn=Math.min(...values),mx=Math.max(...values),t=(v-mn)/(mx-mn||1); const g=Math.round(10+t*180); return `rgb(${g},${g},${g})`; })
    : GRAY.slice(0,values.length);
  S.charts[id]=new Chart(ctx,{
    type:'bar',
    data:{ labels, datasets:[{ data:values, backgroundColor:colors, borderWidth:0, borderRadius:1 }]},
    options:{ indexAxis:'y', responsive:true, maintainAspectRatio:true,
      plugins:{ legend:{display:false} },
      scales:{ x:{grid:{color:'#ebebeb'},border:{display:false}}, y:{grid:{display:false},border:{display:false},ticks:{font:{size:10}}} },
      ...(opts.extra||{})
    },
  });
}

function doughnutChart(id, labels, values){
  destroyChart(id);
  const ctx=document.getElementById(id); if(!ctx) return;
  S.charts[id]=new Chart(ctx,{
    type:'doughnut',
    data:{ labels, datasets:[{ data:values, backgroundColor:GRAY.slice(0,values.length), borderColor:'#fafafa', borderWidth:2 }]},
    options:{ responsive:true, cutout:'58%',
      plugins:{ legend:{ display:true, position:'bottom', labels:{ boxWidth:8, padding:8, font:{size:9,family:"'DM Mono',monospace"} } } }
    },
  });
}

function multiLineChart(id, labels, datasets, legendShow=true){
  destroyChart(id);
  const ctx=document.getElementById(id); if(!ctx) return;
  S.charts[id]=new Chart(ctx,{
    type:'line',
    data:{ labels, datasets },
    options:{ responsive:true, maintainAspectRatio:true,
      interaction:{ mode:'index', intersect:false },
      plugins:{ legend:{ display:legendShow, position:'bottom', labels:{ boxWidth:8, padding:10, font:{size:10,family:"'DM Mono',monospace"} } } },
      scales:{ x:{grid:{display:false},border:{display:false}}, y:{grid:{color:'#ebebeb'},border:{display:false}} },
    },
  });
}

// ── Load data ─────────────────────────────────────────────
async function loadData(){
  const entries = await Promise.all(
    Object.entries(FILES).map(async ([k,path])=>{
      const r=await fetch(path);
      if(!r.ok) throw new Error('Cannot load '+path);
      return [k, await r.json()];
    })
  );
  entries.forEach(([k,v])=>{ S.data[k]=v; });
  // shorthand
  S.data.sl = S.data.series_longues;
}

// ── Home KPI grid ─────────────────────────────────────────
function buildKpiGrid(){
  const grid=document.getElementById('kpi-grid');
  grid.innerHTML='';
  KPI_DEFS.forEach(kpi=>{
    const val=kpi.getValue(S.data);
    const card=document.createElement('div');
    card.className='kpi-card'; card.dataset.id=kpi.id;
    card.innerHTML=`
      <div class="kpi-eyebrow">${kpi.eyebrow}</div>
      <div class="kpi-value">${fmtSimple(val)}<span class="kpi-unit">${kpi.unit}</span></div>
      <div class="kpi-label">${kpi.label}</div>
      <div class="kpi-cta">Détail <span class="arrow">→</span></div>`;
    card.addEventListener('click',()=>openKpiDetail(kpi.id));
    grid.appendChild(card);
  });
}

function openKpiDetail(id){
  const kpi=KPI_DEFS.find(k=>k.id===id); if(!kpi) return;
  if(S.activeKpi===id){ closeKpiDetail(); return; }
  S.activeKpi=id;
  document.querySelectorAll('.kpi-card').forEach(c=>c.classList.toggle('active',c.dataset.id===id));
  const val=kpi.getValue(S.data);
  document.getElementById('detail-panel-title').textContent=kpi.eyebrow;
  document.getElementById('detail-kpi-big').textContent=fmtSimple(val)+'\u202f'+kpi.unit;
  document.getElementById('detail-kpi-label').textContent=kpi.desc;
  document.getElementById('detail-source').textContent=kpi.source;
  const relEl=document.getElementById('detail-related');
  relEl.innerHTML=`<div class="detail-related-title">Stats liées</div><div class="related-links">${
    kpi.related.map(r=>`<button class="related-link" data-target="${r.target||''}" data-section="${r.section}">${r.label} →</button>`).join('')
  }</div>`;
  relEl.querySelectorAll('.related-link').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const sec=btn.dataset.section, tgt=btn.dataset.target;
      if(sec==='home'&&tgt) openKpiDetail(tgt);
      else navigateTo(sec);
    });
  });
  const panel=document.getElementById('home-detail-panel');
  panel.classList.add('open');
  setTimeout(()=>panel.scrollIntoView({behavior:'smooth',block:'nearest'}),50);
  const {labels,values}=kpi.chartData(S.data);
  if(kpi.chartType==='line') lineChart('detail-chart',labels,values);
  else barChart('detail-chart',labels,values);
}

function closeKpiDetail(){
  S.activeKpi=null;
  document.querySelectorAll('.kpi-card').forEach(c=>c.classList.remove('active'));
  document.getElementById('home-detail-panel').classList.remove('open');
  destroyChart('detail-chart');
}

// ── Sub KPIs helper ───────────────────────────────────────
function buildSubKpis(containerId, kpis){
  const el=document.getElementById(containerId); if(!el) return;
  el.innerHTML=kpis.map(k=>`
    <div class="sub-kpi">
      <div class="sub-kpi-label">${k.label}</div>
      <div class="sub-kpi-val">${k.val}<span class="sub-kpi-unit">${k.unit}</span></div>
      <div class="sub-kpi-year">${k.year||'2024'}</div>
    </div>`).join('');
}

// ════════════════════════════════════════════════════════
// BUDGET
// ════════════════════════════════════════════════════════
function buildBudget(){
  const d=S.data;
  buildSubKpis('budget-kpis',[
    {label:'Dépenses 2024',  val:d.budget.depenses_totales.serie.at(-1).valeur, unit:'Mds €'},
    {label:'Solde 2024',     val:d.budget.solde_budgetaire.serie.at(-1).valeur, unit:'Mds €'},
    {label:'Masse salariale',val:d.budget.masse_salariale.serie.at(-1).valeur,  unit:'Mds €'},
    {label:'Invest. public', val:d.budget.investissement_public.serie.at(-1).valeur, unit:'% PIB'},
    {label:'vs 2019 (écart)',val:'+'+(d.budget.depenses_totales.serie.at(-1).valeur - d.budget.depenses_totales.serie[0].valeur).toFixed(1), unit:'Mds €'},
  ]);

  const dep=d.budget.depenses_totales.serie;
  barChart('chart-depenses', dep.map(x=>x.annee), dep.map(x=>x.valeur));

  const sol=d.budget.solde_budgetaire.serie;
  barChart('chart-solde', sol.map(x=>x.annee), sol.map(x=>x.valeur));

  const mis=d.budget.depenses_par_mission.serie;
  hBarChart('chart-missions', mis.map(x=>x.mission), mis.map(x=>x.valeur));

  // Multi-line missions historique
  const mh=d.budget.missions_historique;
  const colors=['#0a0a0a','#2e2e2e','#444','#6a6a6a','#8c8c8c','#b4b4b4'];
  const datasets=mh.missions.map((m,i)=>({
    label:m, data:mh.serie.map(s=>s.valeurs[i]),
    borderColor:colors[i], backgroundColor:'transparent',
    borderWidth:1.5, tension:.3, pointRadius:3,
    pointBackgroundColor:colors[i], pointBorderColor:'#fafafa', pointBorderWidth:1.5,
  }));
  multiLineChart('chart-missions-histo', mh.serie.map(s=>s.annee), datasets, true);

  const ms=d.budget.masse_salariale.serie;
  lineChart('chart-masse-sal', ms.map(x=>x.annee), ms.map(x=>x.valeur));

  const inv=d.budget.investissement_public.serie;
  lineChart('chart-invest', inv.map(x=>x.annee), inv.map(x=>x.valeur), {yScale:{min:3,max:5.5}});

  // Mission table
  const tbody=document.getElementById('missions-table');
  const max=Math.max(...mis.map(x=>x.valeur));
  tbody.innerHTML=`<thead><tr>
    <th>Mission</th><th style="text-align:right">2024 (Mds €)</th>
    <th style="text-align:right">Évolution</th><th style="min-width:120px">Part</th>
  </tr></thead><tbody>`+mis.map(m=>`<tr>
    <td>${m.mission}</td>
    <td class="num">${m.valeur.toFixed(1)}</td>
    <td class="num ${m.evolution>0?'pos':'neg'}">${sign(m.evolution)}${m.evolution.toFixed(1)}%</td>
    <td class="bar-cell"><div class="bar-inner" style="width:${(m.valeur/max*100).toFixed(1)}%"></div></td>
  </tr>`).join('')+'</tbody>';
}

// ════════════════════════════════════════════════════════
// DETTE
// ════════════════════════════════════════════════════════
function buildDette(){
  const d=S.data;
  buildSubKpis('dette-kpis',[
    {label:'Dette 2024',         val:(d.dette.dette_absolue.serie.at(-1).valeur/1000).toFixed(2), unit:'T€'},
    {label:'Dette / PIB',        val:d.dette.dette_pib.serie.at(-1).valeur, unit:'%'},
    {label:'Charge intérêts',    val:d.dette.charge_interets.serie.at(-1).valeur, unit:'Mds €'},
    {label:'Dette / habitant',   val:(d.dette.dette_par_habitant.serie.at(-1).valeur/1000).toFixed(1), unit:'k€'},
    {label:'Taux OAT 10 ans',    val:d.dette.taux_10ans.serie.at(-1).valeur, unit:'%'},
    {label:'Maturité moyenne',   val:d.dette.maturite_moyenne.serie.at(-1).valeur, unit:'ans'},
  ]);

  const pib=d.dette.dette_pib.serie;
  lineChart('chart-dette-pib', pib.map(x=>x.annee), pib.map(x=>x.valeur), {yScale:{min:90,max:120}});

  const abs=d.dette.dette_absolue.serie;
  barChart('chart-dette-abs', abs.map(x=>x.annee), abs.map(x=>x.valeur));

  const int=d.dette.charge_interets.serie;
  barChart('chart-interets', int.map(x=>x.annee), int.map(x=>x.valeur));

  const oat=d.dette.taux_10ans.serie;
  lineChart('chart-taux-10ans', oat.map(x=>x.annee), oat.map(x=>x.valeur));

  const hab=d.dette.dette_par_habitant.serie;
  barChart('chart-dette-hab', hab.map(x=>x.annee), hab.map(x=>x.valeur));

  const ue=d.dette.comparaison_ue.serie;
  hBarChart('chart-dette-ue', ue.map(x=>x.pays), ue.map(x=>x.valeur), {colorByValue:true});

  const str=d.dette.dette_par_sous_secteur.serie;
  doughnutChart('chart-dette-struct', str.map(x=>x.secteur), str.map(x=>x.valeur));

  const mat=d.dette.maturite_moyenne.serie;
  lineChart('chart-maturite', mat.map(x=>x.annee), mat.map(x=>x.valeur), {yScale:{min:7,max:11}});
}

// ════════════════════════════════════════════════════════
// RECETTES
// ════════════════════════════════════════════════════════
function buildRecettes(){
  const d=S.data;
  buildSubKpis('recettes-kpis',[
    {label:'Recettes 2024', val:d.recettes.recettes_totales.serie.at(-1).valeur, unit:'Mds €'},
    {label:'TVA',           val:d.recettes.recettes_par_impot.serie[0].valeur,   unit:'Mds €'},
    {label:'Impôt revenu',  val:d.recettes.recettes_par_impot.serie[1].valeur,   unit:'Mds €'},
    {label:'Impôt sociétés',val:d.recettes.recettes_par_impot.serie[2].valeur,   unit:'Mds €'},
    {label:'PO / PIB',      val:d.recettes.prelevements_obligatoires.serie.at(-1).valeur, unit:'%'},
  ]);

  const tot=d.recettes.recettes_totales.serie;
  lineChart('chart-recettes-total', tot.map(x=>x.annee), tot.map(x=>x.valeur));

  const imp=d.recettes.recettes_par_impot.serie;
  hBarChart('chart-recettes-rep', imp.map(x=>x.impot), imp.map(x=>x.valeur));

  const po=d.recettes.prelevements_obligatoires.serie;
  lineChart('chart-po-pib', po.map(x=>x.annee), po.map(x=>x.valeur), {yScale:{min:42,max:47}});

  const tva=d.recettes.tva.serie;
  barChart('chart-tva', tva.map(x=>x.annee), tva.map(x=>x.valeur));

  const ir=d.recettes.ir.serie;
  barChart('chart-ir', ir.map(x=>x.annee), ir.map(x=>x.valeur));

  const pue=d.recettes.po_comparaison_ue.serie;
  hBarChart('chart-po-ue', pue.map(x=>x.pays), pue.map(x=>x.valeur), {colorByValue:true});
}

// ════════════════════════════════════════════════════════
// DEFICIT
// ════════════════════════════════════════════════════════
function buildDeficit(){
  const d=S.data;
  buildSubKpis('deficit-kpis',[
    {label:'Déficit / PIB 2024',   val:d.deficit.deficit_pib.serie.at(-1).valeur,    unit:'%'},
    {label:'Déficit absolu 2024',  val:d.deficit.deficit_absolu.serie.at(-1).valeur, unit:'Mds €'},
    {label:'Seuil Maastricht',     val:'−3',                                          unit:'% PIB'},
    {label:'Écart au seuil',       val:(d.deficit.deficit_pib.serie.at(-1).valeur-(-3)).toFixed(1), unit:'pts %'},
    {label:'Solde primaire',       val:d.deficit.solde_primaire.serie.at(-1).valeur,  unit:'% PIB'},
  ]);

  // Deficit avec ligne Maastricht
  destroyChart('chart-deficit-pib');
  const ctx=document.getElementById('chart-deficit-pib'); if(!ctx) return;
  const dpib=d.deficit.deficit_pib.serie;
  S.charts['chart-deficit-pib']=new Chart(ctx,{
    type:'bar',
    data:{ labels:dpib.map(x=>x.annee), datasets:[
      { type:'bar', data:dpib.map(x=>x.valeur), backgroundColor:'#0a0a0a', borderWidth:0, borderRadius:1, label:"Déficit / PIB (%)" },
      { type:'line', data:dpib.map(()=>-3), borderColor:'#8c8c8c', borderWidth:1.5, borderDash:[5,4], pointRadius:0, fill:false, label:"Seuil Maastricht −3%" },
    ]},
    options:{ responsive:true,
      interaction:{mode:'index',intersect:false},
      plugins:{ legend:{ display:true, position:'bottom', labels:{boxWidth:8,padding:10,font:{size:10}} } },
      scales:{ x:{grid:{display:false},border:{display:false}}, y:{grid:{color:'#ebebeb'},border:{display:false}} },
    },
  });

  const da=d.deficit.deficit_absolu.serie;
  barChart('chart-deficit-abs', da.map(x=>x.annee), da.map(x=>x.valeur));

  const sp=d.deficit.solde_primaire.serie;
  barChart('chart-solde-primaire', sp.map(x=>x.annee), sp.map(x=>x.valeur));

  const due=d.deficit.comparaison_ue_deficit.serie;
  hBarChart('chart-deficit-ue', due.map(x=>x.pays), due.map(x=>x.valeur), {colorByValue:true});
}

// ════════════════════════════════════════════════════════
// REGIONS
// ════════════════════════════════════════════════════════
const REGION_METRIC_LABELS = {
  pib_par_hab:    { label:'PIB par habitant', unit:'€' },
  taux_chomage:   { label:'Taux de chômage', unit:'%' },
  depenses_par_hab:{ label:'Dépenses collectivités / habitant', unit:'€' },
  dette_region:   { label:'Dette des régions', unit:'Mds €' },
  part_pib_national:{ label:'Part du PIB national', unit:'%' },
};

function buildRegions(){
  renderRegionBar();
  renderRegionTable();

  const d=S.data.regions.regions;
  const sorted=[...d].sort((a,b)=>b.pib_regional-a.pib_regional);
  hBarChart('chart-region-pib', sorted.map(r=>r.nom.length>18?r.nom.slice(0,18)+'…':r.nom), sorted.map(r=>r.pib_regional), {colorByValue:true});

  const sortedC=[...d].sort((a,b)=>b.taux_chomage-a.taux_chomage);
  hBarChart('chart-region-chomage', sortedC.map(r=>r.nom.length>18?r.nom.slice(0,18)+'…':r.nom), sortedC.map(r=>r.taux_chomage), {colorByValue:true});

  // Metric buttons
  document.querySelectorAll('#region-metric-selector .metric-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{
      document.querySelectorAll('#region-metric-selector .metric-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      S.regionMetric=btn.dataset.metric;
      renderRegionBar();
      renderRegionTable();
    });
  });
}

function renderRegionBar(){
  const d=S.data.regions.regions;
  const m=S.regionMetric;
  const sorted=[...d].sort((a,b)=>b[m]-a[m]);
  const ml=REGION_METRIC_LABELS[m];
  hBarChart('chart-region-bar',
    sorted.map(r=>r.nom.length>22?r.nom.slice(0,22)+'…':r.nom),
    sorted.map(r=>r[m]),
    {colorByValue:true}
  );
}

function renderRegionTable(){
  const d=S.data.regions.regions;
  const m=S.regionMetric;
  const ml=REGION_METRIC_LABELS[m];
  const sorted=[...d].sort((a,b)=>b[m]-a[m]);
  const maxVal=Math.max(...d.map(r=>r[m]));
  const el=document.getElementById('region-table');
  el.innerHTML=`<thead><tr>
    <th>Région</th>
    <th style="text-align:right">Population</th>
    <th style="text-align:right">${ml.label}</th>
    <th style="text-align:right">PIB / hab. €</th>
    <th style="text-align:right">Chômage %</th>
  </tr></thead><tbody>`+sorted.map((r,i)=>`<tr>
    <td>${r.nom}</td>
    <td class="num">${(r.population/1000000).toFixed(2)} M</td>
    <td class="num">${typeof r[m]==='number'?r[m].toLocaleString('fr-FR'):r[m]} ${ml.unit}</td>
    <td class="num">${r.pib_par_hab.toLocaleString('fr-FR')}</td>
    <td class="num">${r.taux_chomage}</td>
  </tr>`).join('')+'</tbody>';
}

// ════════════════════════════════════════════════════════
// COMPARATEUR
// ════════════════════════════════════════════════════════
function buildComparateur(){
  // Default 2 series
  if(S.compSeries.length===0){
    S.compSeries=[
      { id:'dette_pib', color:COMP_COLORS[0] },
      { id:'deficit_pib', color:COMP_COLORS[1] },
    ];
  }
  renderCompControls();
  renderCompChart();

  document.getElementById('add-serie').addEventListener('click',()=>{
    if(S.compSeries.length>=4) return;
    const unused=ALL_SERIES.find(s=>!S.compSeries.find(c=>c.id===s.id));
    if(unused) S.compSeries.push({id:unused.id, color:COMP_COLORS[S.compSeries.length]});
    renderCompControls();
    renderCompChart();
  });

  document.getElementById('reset-comp').addEventListener('click',()=>{
    S.compSeries=[
      {id:'dette_pib', color:COMP_COLORS[0]},
      {id:'deficit_pib', color:COMP_COLORS[1]},
    ];
    renderCompControls();
    renderCompChart();
  });

  ['mode-overlay','mode-side','mode-indexed'].forEach(btnId=>{
    document.getElementById(btnId).addEventListener('click',()=>{
      document.querySelectorAll('.comp-mode-row .metric-btn').forEach(b=>b.classList.remove('active'));
      document.getElementById(btnId).classList.add('active');
      S.compMode=document.getElementById(btnId).dataset.mode;
      renderCompChart();
    });
  });
}

function renderCompControls(){
  const wrap=document.getElementById('comp-selectors');
  wrap.innerHTML='';
  S.compSeries.forEach((cs,idx)=>{
    const grp=document.createElement('div');
    grp.className='comp-select-group';
    grp.innerHTML=`
      <div class="comp-swatch" style="background:${cs.color}"></div>
      <label>Série ${idx+1}</label>
      <select class="comp-select" data-idx="${idx}">
        ${ALL_SERIES.map(s=>`<option value="${s.id}" ${s.id===cs.id?'selected':''}>${s.label}</option>`).join('')}
      </select>
      ${S.compSeries.length>1?`<button class="comp-remove" data-idx="${idx}">✕</button>`:''}
    `;
    grp.querySelector('select').addEventListener('change',e=>{
      S.compSeries[idx].id=e.target.value;
      renderCompChart();
      renderCorrMatrix();
    });
    const rmBtn=grp.querySelector('.comp-remove');
    if(rmBtn) rmBtn.addEventListener('click',()=>{ S.compSeries.splice(idx,1); renderCompControls(); renderCompChart(); });
    wrap.appendChild(grp);
  });
}

function renderCompChart(){
  const area=document.getElementById('comp-chart-area');
  const d=S.data;
  area.innerHTML='';

  if(S.compMode==='side'){
    const grid=document.createElement('div');
    grid.className='comp-side-wrap';
    grid.style.gridTemplateColumns=`repeat(${S.compSeries.length},1fr)`;
    S.compSeries.forEach(cs=>{
      const serDef=ALL_SERIES.find(s=>s.id===cs.id); if(!serDef) return;
      const {years,vals}=serDef.src(d);
      const wrap=document.createElement('div');
      wrap.style.cssText='background:#fafafa;padding:1rem';
      wrap.innerHTML=`<div style="font-family:var(--font-m);font-size:.6rem;color:var(--g50);margin-bottom:.75rem;letter-spacing:.06em;text-transform:uppercase">${serDef.label}</div><canvas id="comp-side-${cs.id}"></canvas>`;
      grid.appendChild(wrap);
      setTimeout(()=>lineChart(`comp-side-${cs.id}`,years,vals),20);
    });
    area.appendChild(grid);
  } else {
    const wrap=document.createElement('div');
    wrap.className='comp-overlay-wrap';
    wrap.innerHTML='<canvas id="chart-comp-main" height="320"></canvas><div class="comp-legend" id="comp-legend-inner"></div>';
    area.appendChild(wrap);

    const datasets=S.compSeries.map(cs=>{
      const serDef=ALL_SERIES.find(s=>s.id===cs.id); if(!serDef) return null;
      let {years,vals}=serDef.src(d);
      if(S.compMode==='indexed'){
        const base=vals[0]||1;
        vals=vals.map(v=>parseFloat(((v/base)*100).toFixed(2)));
      }
      return {
        label:serDef.label, data:vals,
        borderColor:cs.color, backgroundColor:'transparent',
        borderWidth:1.5, tension:.3, pointRadius:3,
        pointBackgroundColor:cs.color, pointBorderColor:'#fafafa', pointBorderWidth:1.5, fill:false,
      };
    }).filter(Boolean);

    const years=S.compSeries.length>0 ? ALL_SERIES.find(s=>s.id===S.compSeries[0].id)?.src(d).years : [];
    destroyChart('chart-comp-main');
    const ctx=document.getElementById('chart-comp-main'); if(!ctx) return;
    S.charts['chart-comp-main']=new Chart(ctx,{
      type:'line', data:{labels:years,datasets},
      options:{
        responsive:true, maintainAspectRatio:true,
        interaction:{mode:'index',intersect:false},
        plugins:{ legend:{display:false} },
        scales:{ x:{grid:{display:false},border:{display:false}}, y:{grid:{color:'#ebebeb'},border:{display:false}, title:{display:S.compMode==='indexed',text:'Base 100',font:{size:10}}} },
      },
    });

    // Custom legend
    const leg=document.getElementById('comp-legend-inner');
    if(leg) leg.innerHTML=datasets.map(ds=>`
      <div class="comp-legend-item">
        <div class="comp-legend-dot" style="background:${ds.borderColor}"></div>
        <span>${ds.label}</span>
      </div>`).join('');
  }
  renderCorrMatrix();
}

function renderCorrMatrix(){
  const d=S.data;
  const panel=document.getElementById('corr-panel');
  if(S.compSeries.length<2){ panel.style.display='none'; return; }
  panel.style.display='block';

  const series=S.compSeries.map(cs=>{
    const def=ALL_SERIES.find(s=>s.id===cs.id); if(!def) return null;
    return {label:def.label, vals:def.src(d).vals, color:cs.color};
  }).filter(Boolean);

  function pearson(a,b){
    const n=Math.min(a.length,b.length);
    const ma=a.slice(0,n).reduce((s,v)=>s+v,0)/n;
    const mb=b.slice(0,n).reduce((s,v)=>s+v,0)/n;
    let num=0,da=0,db=0;
    for(let i=0;i<n;i++){
      num+=(a[i]-ma)*(b[i]-mb);
      da+=(a[i]-ma)**2; db+=(b[i]-mb)**2;
    }
    return (Math.sqrt(da*db)===0)?0:num/Math.sqrt(da*db);
  }

  const matrix=document.getElementById('corr-matrix');
  const n=series.length;
  matrix.style.gridTemplateColumns=`120px repeat(${n},80px)`;
  let html='<div class="corr-cell header"></div>';
  series.forEach(s=>{ html+=`<div class="corr-cell header" style="font-size:.58rem">${s.label.slice(0,12)}…</div>`; });
  series.forEach((a,i)=>{
    html+=`<div class="corr-cell header">${a.label.slice(0,12)}…</div>`;
    series.forEach((b,j)=>{
      const r=pearson(a.vals,b.vals);
      const intensity=Math.abs(r);
      const bg=i===j?'var(--g95)':`rgba(10,10,10,${(intensity*.15).toFixed(2)})`;
      html+=`<div class="corr-cell" style="background:${bg}"><div class="corr-val">${i===j?'1.00':r.toFixed(2)}</div></div>`;
    });
  });
  matrix.innerHTML=html;
}

// ════════════════════════════════════════════════════════
// TENDANCES (long series 2010-2024)
// ════════════════════════════════════════════════════════
const RUPTURES=[
  {annee:2010, title:"Plan de rigueur", desc:"Début des plans d'austérité suite à la crise des dettes souveraines européennes.", major:false},
  {annee:2012, title:"Crise de la Zone Euro", desc:"Pression sur les spreads, accélération du déficit. France à −5% de PIB.", major:false},
  {annee:2017, title:"Réformes fiscales", desc:"Suppression de l'ISF, mise en place du PFU à 30%, transformation du CICE.", major:false},
  {annee:2020, title:"Covid-19 — Choc budgétaire", desc:"Déficit record à −8,9% du PIB. Quoi qu'il en coûte : 80 Mds € de soutien d'urgence.", major:true},
  {annee:2021, title:"Plan de relance", desc:"France Relance : 100 Mds € sur 2 ans. Rebond du PIB à +6,4%.", major:false},
  {annee:2022, title:"Choc inflationniste", desc:"Inflation à 5,9%. Bouclier tarifaire : 25 Mds €. Remontée des taux OAT.", major:true},
  {annee:2023, title:"Consolidation partielle", desc:"Réduction du déficit à −5,5% malgré la hausse de la charge d'intérêts (+28%).", major:false},
  {annee:2024, title:"Pression budgétaire", desc:"Charge d'intérêts dépassant 59 Mds €. Dette franchissant 3 200 Mds €.", major:true},
];

function buildTendances(){
  const d=S.data.sl;

  buildSubKpis('tendances-kpis',[
    {label:'Dette / PIB 2010', val:d.dette_pib[0], unit:'%', year:'2010'},
    {label:'Dette / PIB 2024', val:d.dette_pib.at(-1), unit:'%', year:'2024'},
    {label:'Charge intérêts 2010', val:d.charge_interets[0], unit:'Mds €', year:'2010'},
    {label:'Charge intérêts 2024', val:d.charge_interets.at(-1), unit:'Mds €', year:'2024'},
    {label:'Hausse PO depuis 2010', val:sign(d.prelevements_obligatoires.at(-1)-d.prelevements_obligatoires[0])+(d.prelevements_obligatoires.at(-1)-d.prelevements_obligatoires[0]).toFixed(1), unit:'pts %'},
  ]);

  lineChart('chart-long-dette', d.annees, d.dette_pib, {yScale:{min:80,max:120}});

  barChart('chart-long-deficit', d.annees, d.deficit_pib);

  // Croissance + Inflation multi
  destroyChart('chart-long-macro');
  const ctx2=document.getElementById('chart-long-macro'); if(ctx2){
    S.charts['chart-long-macro']=new Chart(ctx2,{
      type:'line',
      data:{ labels:d.annees, datasets:[
        { label:'Croissance PIB (%)', data:d.croissance, borderColor:'#0a0a0a', backgroundColor:'transparent', borderWidth:1.5, tension:.3, pointRadius:3, fill:false },
        { label:'Inflation (%)', data:d.inflation, borderColor:'#8c8c8c', backgroundColor:'transparent', borderWidth:1.5, borderDash:[4,3], tension:.3, pointRadius:3, fill:false },
      ]},
      options:{ responsive:true, interaction:{mode:'index',intersect:false},
        plugins:{ legend:{ display:true, position:'bottom', labels:{boxWidth:8,padding:10,font:{size:10,family:"'DM Mono',monospace"}} } },
        scales:{ x:{grid:{display:false},border:{display:false}}, y:{grid:{color:'#ebebeb'},border:{display:false}} },
      },
    });
  }

  lineChart('chart-long-interets', d.annees, d.charge_interets);

  // Chômage + PO multi
  destroyChart('chart-long-po');
  const ctx3=document.getElementById('chart-long-po'); if(ctx3){
    S.charts['chart-long-po']=new Chart(ctx3,{
      type:'line',
      data:{ labels:d.annees, datasets:[
        { label:'Chômage (%)', data:d.taux_chomage, borderColor:'#0a0a0a', backgroundColor:'transparent', borderWidth:1.5, tension:.3, pointRadius:3, fill:false },
        { label:'Prélèvements / PIB (%)', data:d.prelevements_obligatoires, borderColor:'#8c8c8c', backgroundColor:'transparent', borderWidth:1.5, borderDash:[4,3], tension:.3, pointRadius:3, fill:false },
      ]},
      options:{ responsive:true, interaction:{mode:'index',intersect:false},
        plugins:{ legend:{ display:true, position:'bottom', labels:{boxWidth:8,padding:10,font:{size:10,family:"'DM Mono',monospace"}} } },
        scales:{ x:{grid:{display:false},border:{display:false}}, y:{grid:{color:'#ebebeb'},border:{display:false}} },
      },
    });
  }

  // Recettes vs Dépenses
  destroyChart('chart-long-recettes-dep');
  const ctx4=document.getElementById('chart-long-recettes-dep'); if(ctx4){
    S.charts['chart-long-recettes-dep']=new Chart(ctx4,{
      type:'line',
      data:{ labels:d.annees, datasets:[
        { label:'Dépenses État (Mds €)', data:d.depenses_etat, borderColor:'#0a0a0a', backgroundColor:'rgba(10,10,10,.06)', borderWidth:1.5, tension:.35, fill:true, pointRadius:3 },
        { label:'Recettes État (Mds €)', data:d.recettes_etat, borderColor:'#8c8c8c', backgroundColor:'rgba(140,140,140,.06)', borderWidth:1.5, tension:.35, fill:true, pointRadius:3 },
      ]},
      options:{ responsive:true, interaction:{mode:'index',intersect:false},
        plugins:{ legend:{ display:true, position:'bottom', labels:{boxWidth:8,padding:10,font:{size:10,family:"'DM Mono',monospace"}} } },
        scales:{ x:{grid:{display:false},border:{display:false}}, y:{grid:{color:'#ebebeb'},border:{display:false}} },
      },
    });
  }

  lineChart('chart-long-taux', d.annees, d.taux_10ans);

  // Timeline
  const tl=document.getElementById('ruptures-timeline');
  tl.innerHTML=RUPTURES.map(ev=>`
    <div class="timeline-event ${ev.major?'major':''}">
      <div class="timeline-year">${ev.annee}</div>
      <div class="timeline-event-title">${ev.title}</div>
      <div class="timeline-event-desc">${ev.desc}</div>
    </div>`).join('');
}

// ════════════════════════════════════════════════════════
// NAVIGATION
// ════════════════════════════════════════════════════════
const BUILDERS = {
  budget:     buildBudget,
  dette:      buildDette,
  recettes:   buildRecettes,
  deficit:    buildDeficit,
  regions:    buildRegions,
  comparateur:buildComparateur,
  tendances:  buildTendances,
};

const built = new Set();

function navigateTo(sec){
  if(S.section===sec) return;
  document.querySelectorAll('.section').forEach(s=>s.classList.remove('active'));
  document.getElementById('section-'+sec)?.classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.section===sec));
  if(sec!=='home') closeKpiDetail();
  S.section=sec;
  if(BUILDERS[sec] && !built.has(sec)){
    built.add(sec);
    setTimeout(()=>BUILDERS[sec](),40);
  }
  window.scrollTo({top:0,behavior:'smooth'});
  document.getElementById('mobileNav').classList.remove('open');
}

// ── Event listeners ───────────────────────────────────────
document.querySelectorAll('.nav-btn').forEach(btn=>{
  btn.addEventListener('click',()=>navigateTo(btn.dataset.section));
});
document.getElementById('menuToggle').addEventListener('click',()=>{
  document.getElementById('mobileNav').classList.toggle('open');
});
document.getElementById('close-detail').addEventListener('click', closeKpiDetail);

// ── Init ──────────────────────────────────────────────────
async function init(){
  try{
    await loadData();
    buildKpiGrid();
  } catch(err){
    document.getElementById('kpi-grid').innerHTML=`
      <div style="grid-column:1/-1;padding:2rem;font-family:var(--font-m);font-size:.8rem;color:#8c8c8c">
        ⚠ Impossible de charger les données. Vérifiez que les fichiers JSON sont dans <code>data/</code>.<br><br>
        <small>${err.message}</small>
      </div>`;
  }
}
init();
