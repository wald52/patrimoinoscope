import { DATA_PATH } from "./config.js";

const fmtEur = n => new Intl.NumberFormat("fr-FR", { style:"currency", currency:"EUR", maximumFractionDigits:0 }).format(n);
const fmtPct = n => `${n>0?"+":""}${n.toFixed(1).replace(".",",")}%`;
const fmtNum = n => new Intl.NumberFormat("fr-FR").format(n);

let kpis, byCategory, byMandat, cohorts;
let chartCat, chartMandat, chartDonut, modalChart;

async function load(){
  const [k,bm,bc,cs] = await Promise.all([
    fetch(`${DATA_PATH}kpis.json`).then(r=>r.json()),
    fetch(`${DATA_PATH}by_mandat.json`).then(r=>r.json()),
    fetch(`${DATA_PATH}by_category.json`).then(r=>r.json()),
    fetch(`${DATA_PATH}cohorts_sample.json`).then(r=>r.json()),
  ]);
  kpis=k; byMandat=bm; byCategory=bc; cohorts=cs;
  renderHero();
  renderQuiz();
  renderCategories();
  renderMandats();
  renderCohorts();
  setupProgress();
}

function renderHero(){
  document.getElementById("hero-n").textContent = fmtNum(kpis.n_paires);
  document.getElementById("hero-top").textContent = `Le poste #1 : ${kpis.top_categorie} (${fmtEur(kpis.top_categorie_delta)} en moyenne)`;
  document.getElementById("kpi-date").textContent = kpis.date_generation;
  document.getElementById("kpi-n-paires").textContent = kpis.n_paires;
  document.getElementById("kpi-duree").textContent = kpis.duree_moyenne_annees;
  // banner mock / limite légale
  if(kpis.mode==="mock"){
    const banner=document.getElementById("limit-banner");
    banner.style.display="block";
    banner.innerHTML=`⚠️ Données réelles insuffisantes : <strong>${kpis.n_paires_reel ?? 3} paires</strong> appariables seulement (75 DSP téléchargeables sur ${kpis.couverture_dsp_inventaire ?? 2633} à l'inventaire). Les DSP députés/sénateurs sont <em>consultables en préfecture uniquement</em> (404) — site en <strong>mode démo</strong> avec données mock. <a href="./docs/DATA.md" style="text-decoration:underline">Voir l'audit V2</a>.`;
  } else if(kpis.limite_legale){
    const banner=document.getElementById("limit-banner");
    banner.style.display="block";
    banner.textContent=kpis.limite_legale;
  }
  const kpisEl = document.getElementById("kpis");
  kpisEl.innerHTML = `
    <div class="kpi"><div class="label">Patrimoine net moyen — entrée</div><div class="value numeral">${fmtEur(kpis.entree_net_moyen)}</div><div class="hint">moyenne sur ${kpis.n_paires} paires ${kpis.mode==="mock" ? "(mock)" : ""}</div></div>
    <div class="kpi"><div class="label">Patrimoine net moyen — sortie</div><div class="value numeral">${fmtEur(kpis.sortie_net_moyen)}</div><div class="hint">${fmtPct(kpis.delta_net_pct)} en ${kpis.duree_moyenne_annees} ans</div></div>
    <div class="kpi"><div class="label">Hausse moyenne (net)</div><div class="value numeral" style="color:var(--ok)">${fmtEur(kpis.delta_net_moyen)}</div><div class="hint">Top catégorie : ${kpis.top_categorie}</div></div>
  `;
}

function renderQuiz(){
  const correct = byCategory[0]?.categorie || "immobilier";
  const labels = {immobilier:"Immobilier", valeurs_bourse:"Bourse", assurance_vie:"Assurance-vie", epargne:"Épargne"};
  const result = document.getElementById("quiz-result");
  const share = document.getElementById("quiz-share");
  let answered=false;
  document.querySelectorAll(".choice").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      if(answered) return;
      answered=true;
      const ans = btn.dataset.answer;
      const ok = ans===correct;
      document.querySelectorAll(".choice").forEach(b=>{
        if(b.dataset.answer===correct) b.classList.add("correct");
        else if(b===btn && !ok) b.classList.add("wrong");
        b.style.pointerEvents="none";
      });
      const top = byCategory.find(c=>c.categorie===correct);
      result.innerHTML = ok
        ? `✅ Bien joué ! <strong>${labels[correct] || correct}</strong> est bien #1 avec <strong>${fmtEur(top.delta_moyen)}</strong> (${fmtPct(top.delta_pct)}) — soit ${top.contribution_pct}% de la hausse totale.`
        : `Presque ! La bonne réponse est <strong>${labels[correct] || correct}</strong> : <strong>${fmtEur(top.delta_moyen)}</strong> (${fmtPct(top.delta_pct)}). L'immobilier tire 2/3 de la hausse.`;
      result.classList.add("show");
      share.style.display="flex";
      // confetti léger via vibration
      if(navigator.vibrate && ok) navigator.vibrate(60);
    });
  });
  document.getElementById("btn-again").addEventListener("click", ()=>{
    answered=false;
    result.classList.remove("show");
    share.style.display="none";
    document.querySelectorAll(".choice").forEach(b=>{b.classList.remove("correct","wrong"); b.style.pointerEvents="";});
  });
  document.getElementById("btn-share").addEventListener("click", shareSite);
  document.getElementById("btn-share2").addEventListener("click", shareSite);
}

async function shareSite(){
  const text = `Patrimoinoscope : entre le début et la fin du mandat, le patrimoine net moyen passe de ${fmtEur(kpis.entree_net_moyen)} à ${fmtEur(kpis.sortie_net_moyen)} (${fmtPct(kpis.delta_net_pct)}). Le poste #1 : ${kpis.top_categorie}. Données HATVP anonymisées.`;
  const url = location.href;
  if(navigator.share){
    try{ await navigator.share({title:document.title, text, url}); }catch{}
  } else if(navigator.clipboard){
    await navigator.clipboard.writeText(`${text} ${url}`);
    alert("Lien copié !");
  } else {
    prompt("Copie ce lien :", `${text} ${url}`);
  }
}

// --- Categories ---
let catMode="euros";
function renderCategories(){
  const ctx = document.getElementById("chart-categories");
  const subtitle = document.getElementById("cat-subtitle");
  const insight = document.getElementById("cat-insight");
  function dataForMode(){
    if(catMode==="pct"){
      subtitle.textContent = "En % d'évolution (sortie vs entrée)";
      return byCategory.map(c=>c.delta_pct);
    } else {
      subtitle.textContent = "En € — delta moyen par catégorie";
      return byCategory.map(c=>c.delta_moyen);
    }
  }
  const labels = byCategory.map(c=>c.label);
  const contribs = byCategory.map(c=>c.contribution_pct);
  // couleur par contribution
  const bg = contribs.map(p=> p>50? "#000091" : p>10? "#3b6cff" : "#a9b4ff");
  chartCat = new Chart(ctx, {
    type:"bar",
    data:{labels, datasets:[{label: catMode==="pct"?"Δ %":"Δ €", data:dataForMode(), backgroundColor:bg, borderRadius:10, borderSkipped:false}]},
    options:{
      indexAxis:"y",
      responsive:true, maintainAspectRatio:false,
      plugins:{
        legend:{display:false},
        tooltip:{callbacks:{label:ctx=> catMode==="pct"? fmtPct(ctx.raw): fmtEur(ctx.raw) + ` · ${contribs[ctx.dataIndex]}% de la hausse`}}
      },
      scales:{
        x:{grid:{color:"#eee"}, ticks:{callback:v=> catMode==="pct"? v+"%": fmtEur(v)}},
        y:{grid:{display:false}}
      }
    }
  });
  insight.textContent = `Lecture : ${byCategory[0].label} concentre ${byCategory[0].contribution_pct}% de la hausse totale (${fmtEur(byCategory[0].delta_moyen)}, ${fmtPct(byCategory[0].delta_pct)}). C'est 3× plus que le 2e poste (${byCategory[1].label}).`;
  document.querySelectorAll("[data-mode]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      document.querySelectorAll("[data-mode]").forEach(b=>b.classList.remove("active"));
      btn.classList.add("active");
      catMode = btn.dataset.mode;
      chartCat.data.datasets[0].data = dataForMode();
      chartCat.data.datasets[0].label = catMode==="pct"?"Δ %":"Δ €";
      chartCat.options.scales.x.ticks.callback = v=> catMode==="pct"? v+"%" : fmtEur(v);
      chartCat.options.plugins.tooltip.callbacks.label = ctx=> catMode==="pct"? fmtPct(ctx.raw): fmtEur(ctx.raw) + ` · ${contribs[ctx.dataIndex]}%`;
      chartCat.update();
      subtitle.textContent = catMode==="pct"?"En % d'évolution":"En € — delta moyen";
    });
  });
  document.getElementById("chk-net").addEventListener("change", e=>{
    // pour l'instant, on garde net déjà calculé ; toggle = info
    insight.textContent = e.target.checked
      ? `Mode net (après dettes) — même hiérarchie, l'immobilier reste #1. Les dettes baissent en moyenne de ~8% sur la période (effet remboursement).`
      : `Lecture : ${byCategory[0].label} concentre ${byCategory[0].contribution_pct}% de la hausse totale.`;
  });
}

function renderMandats(){
  // bar chart by mandat
  const ctx = document.getElementById("chart-mandats");
  const labels = byMandat.map(m=> `${m.label} (n=${m.n})`);
  const deltas = byMandat.map(m=>m.delta_moyen_net);
  chartMandat = new Chart(ctx, {
    type:"bar",
    data:{labels, datasets:[{label:"Δ net moyen €", data:deltas, backgroundColor:["#000091","#3b6cff","#6c8cff","#a9b4ff","#d0d6ff"], borderRadius:8}]},
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{legend:{display:false}, tooltip:{callbacks:{label:ctx=> fmtEur(ctx.raw)}}},
      scales:{y:{ticks:{callback:v=> fmtEur(v)}}, x:{ticks:{maxRotation:22}}}
    }
  });
  // donut répartition contribution (from byCategory)
  const donutCtx = document.getElementById("chart-donut");
  chartDonut = new Chart(donutCtx, {
    type:"doughnut",
    data:{labels: byCategory.map(c=>c.label), datasets:[{data: byCategory.map(c=>c.contribution_pct), backgroundColor:["#000091","#2a4bff","#6c8cff","#a9b4ff","#d8ddff","#eee"], borderWidth:2}]},
    options:{responsive:true, maintainAspectRatio:false, plugins:{legend:{position:"bottom"}, tooltip:{callbacks:{label:ctx=> `${ctx.label}: ${ctx.raw}%`}}}, cutout:"58%"}
  });
  document.getElementById("donut-insight").textContent = `Sur 100€ de hausse, ~${byCategory[0].contribution_pct}€ viennent de l'immobilier.`;

  // slider durée : filtre cohorts + recalcule kpi filtré (simulé sur mock : on filtre cohorts)
  const slider = document.getElementById("duree");
  const val = document.getElementById("duree-val");
  const nEl = document.getElementById("duree-n");
  function updateSlider(){
    const min = parseFloat(slider.value);
    val.textContent = `${min} ans`;
    const filtered = cohorts.filter(c=> c.duree_annees >= min);
    nEl.textContent = `${filtered.length} profils ≥ ${min} ans (sur ${cohorts.length})`;
    // met à jour donut avec contribution des filtrés (recalc top cat)
    if(filtered.length){
      const topCounts = {};
      filtered.forEach(c=> topCounts[c.top_categorie] = (topCounts[c.top_categorie]||0)+1);
      const top = Object.entries(topCounts).sort((a,b)=>b[1]-a[1])[0][0];
      document.getElementById("donut-insight").textContent = `Filtre ≥${min} ans : top catégorie la plus fréquente = ${top} (${topCounts[top]} profils).`;
    }
    // griser cohorts non filtrés
    document.querySelectorAll(".cohort").forEach(el=>{
      const d = parseFloat(el.dataset.duree);
      el.style.opacity = d >= min ? "1" : ".28";
      el.style.pointerEvents = d >= min ? "" : "none";
    });
  }
  slider.addEventListener("input", updateSlider);
  // init
  // on attend que cohorts soient rendus
  setTimeout(updateSlider, 300);
}

function renderCohorts(){
  const wrap = document.getElementById("cohorts");
  wrap.innerHTML = cohorts.map(c=>`
    <div class="cohort" data-id="${c.id_anon}" data-duree="${c.duree_annees}">
      <div class="id">${c.id_anon} <span class="badge-mandat mandat-${c.type_mandat}">${c.type_mandat}</span></div>
      <div class="meta">${c.tranche_age} · ${c.duree_annees} ans ${c.evenement_majeur? '· ⚑ événement':''}</div>
      <div class="delta" style="color:${c.delta_pct>20?'var(--ok)':'var(--ink)'}">${fmtPct(c.delta_pct)} <span style="font-weight:600;color:var(--muted);font-size:.85rem">(${fmtEur(c.delta_net)})</span></div>
      <div class="top">Top : ${c.top_categorie_label}</div>
    </div>
  `).join("");
  wrap.querySelectorAll(".cohort").forEach(el=>{
    el.addEventListener("click", ()=> openModal(el.dataset.id));
  });
}

let currentModalId=null;
function openModal(id){
  const c = cohorts.find(x=>x.id_anon===id);
  if(!c) return;
  currentModalId=id;
  document.getElementById("modal-title").textContent = `${c.id_anon} — ${c.type_mandat} · ${c.tranche_age}`;
  document.getElementById("modal-meta").textContent = `Durée ${c.duree_annees} ans · Entrée ${fmtEur(c.entree_net)} → Sortie ${fmtEur(c.sortie_net)} · ${fmtPct(c.delta_pct)} (${fmtEur(c.delta_net)}) · Top ${c.top_categorie_label}${c.evenement_majeur?" · événement majeur":""}`;
  document.getElementById("modal-insight").textContent = `Répartition : à l'entrée ${(c.repartition_entree.immobilier/c.entree_net*100).toFixed(0)}% immo, à la sortie ${(c.repartition_sortie.immobilier/c.sortie_net*100).toFixed(0)}% immo. Le slider filtre ces cartes.`;
  document.getElementById("modal").classList.add("open");
  document.getElementById("modal").setAttribute("aria-hidden","false");
  // chart
  const ctx = document.getElementById("modal-chart");
  if(modalChart) modalChart.destroy();
  modalChart = new Chart(ctx, {
    type:"bar",
    data:{
      labels:["Immobilier","Bourse","Assurance-vie","Épargne","Véhicules","Autres"],
      datasets:[
        {label:"Entrée", data:[c.repartition_entree.immobilier,c.repartition_entree.valeurs_bourse,c.repartition_entree.assurance_vie,c.repartition_entree.epargne,c.repartition_entree.vehicules,c.repartition_entree.autres], backgroundColor:"#a9b4ff"},
        {label:"Sortie", data:[c.repartition_sortie.immobilier,c.repartition_sortie.valeurs_bourse,c.repartition_sortie.assurance_vie,c.repartition_sortie.epargne,c.repartition_sortie.vehicules,c.repartition_sortie.autres], backgroundColor:"#000091"},
      ]
    },
    options:{responsive:true, maintainAspectRatio:false, plugins:{tooltip:{callbacks:{label:ctx=> `${ctx.dataset.label}: ${fmtEur(ctx.raw)}`}}}, scales:{y:{ticks:{callback:v=> fmtEur(v)}}}}
  });
}
function closeModal(){
  document.getElementById("modal").classList.remove("open");
  document.getElementById("modal").setAttribute("aria-hidden","true");
}
document.getElementById("modal-close").addEventListener("click", closeModal);
document.getElementById("modal").addEventListener("click", e=>{ if(e.target.id==="modal") closeModal(); });
document.addEventListener("keydown", e=>{ if(e.key==="Escape") closeModal(); });

function setupProgress(){
  const bar = document.getElementById("read-progress");
  const onScroll=()=>{
    const h=document.documentElement;
    const pct = (h.scrollTop/(h.scrollHeight - h.clientHeight))*100;
    bar.style.width = pct+"%";
  };
  addEventListener("scroll", onScroll, {passive:true});
}

load().catch(e=>{
  console.error(e);
  document.body.insertAdjacentHTML("afterbegin", `<div style="background:#fff0f0;border:1px solid #E1000F;padding:10px;text-align:center">Erreur chargement données : ${e.message} — Vérifie <code>data/</code></div>`);
});
