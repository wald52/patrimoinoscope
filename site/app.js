import { DATA_PATH } from "./config.js";

const fmtEur = n => new Intl.NumberFormat("fr-FR", { style:"currency", currency:"EUR", maximumFractionDigits:0 }).format(n);
const fmtPct = n => `${n>0?"+":""}${n.toFixed(1).replace(".",",")}%`;
const fmtNum = n => new Intl.NumberFormat("fr-FR").format(n);

let kpis, byCategory, byMandat, cohorts, kpisReel, catReel, interets;
let chartCat, chartMandat, chartDonut, modalChart, chartReel, chartParticip, chartActiv;

async function load(){
  const [k,bm,bc,cs, kr, cr, inter] = await Promise.all([
    fetch(`${DATA_PATH}kpis.json`).then(r=>r.json()),
    fetch(`${DATA_PATH}by_mandat.json`).then(r=>r.json()),
    fetch(`${DATA_PATH}by_category.json`).then(r=>r.json()),
    fetch(`${DATA_PATH}cohorts_sample.json`).then(r=>r.json()),
    fetch(`${DATA_PATH}kpis_reel.json`).then(r=>r.json()).catch(()=>null),
    fetch(`${DATA_PATH}by_category_reel.json`).then(r=>r.json()).catch(()=>null),
    fetch(`${DATA_PATH}interets.json`).then(r=>r.json()).catch(()=>null),
  ]);
  kpis=k; byMandat=bm; byCategory=bc; cohorts=cs; kpisReel=kr; catReel=cr; interets=inter;
  renderHero();
  renderQuiz();
  renderCategories();
  renderReel();
  renderInterets();
  renderMandats();
  renderCohorts();
  renderAuditTeaser();
  setupProgress();
  setupOG();
}

function renderHero(){
  document.getElementById("hero-n").textContent = fmtNum(kpis.n_paires);
  document.getElementById("hero-top").textContent = `Le poste #1 : ${kpis.top_categorie} (${fmtEur(kpis.top_categorie_delta)} en moyenne)`;
  document.getElementById("kpi-date").textContent = kpis.date_generation;
  document.getElementById("kpi-n-paires").textContent = kpis.n_paires;
  document.getElementById("kpi-duree").textContent = kpis.duree_moyenne_annees;
  if(kpis.mode==="mock"){
    const banner=document.getElementById("limit-banner");
    banner.style.display="block";
    banner.innerHTML=`⚠️ Données réelles insuffisantes : <strong>${kpis.n_paires_reel ?? 3} paires</strong> appariables seulement (75 DSP téléchargeables sur ${kpis.couverture_dsp_inventaire ?? 2633} à l'inventaire). Les DSP députés/sénateurs sont <em>consultables en préfecture uniquement</em> (404) — site en <strong>mode démo</strong> avec données mock. <a href="./audit.html" style="text-decoration:underline">Voir l'audit</a>.`;
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
      // perso card bouton
      const persoCanvas=document.getElementById("perso-canvas");
      if(persoCanvas && !document.getElementById("btn-perso")){
        setTimeout(()=>{
          const ctx=persoCanvas.getContext("2d");
          ctx.fillStyle="#FFFBF7"; ctx.fillRect(0,0,800,420);
          ctx.fillStyle="#000091"; ctx.fillRect(0,0,800,8);
          ctx.fillStyle="#1a1a2e"; ctx.font="800 28px Inter, sans-serif"; ctx.fillText("Mon quiz Patrimoinoscope", 30, 50);
          ctx.fillStyle="#5a5a6e"; ctx.font="600 16px Inter, sans-serif"; ctx.fillText(`Mon choix : ${ans} — Réponse : ${correct} (${ok?"✅":"❌"})`, 30, 80);
          ctx.fillStyle="#0a7d48"; ctx.font="800 22px Inter, sans-serif"; ctx.fillText(`Top : ${kpis.top_categorie} ${fmtEur(kpis.top_categorie_delta)}`, 30, 130);
          ctx.fillStyle="#5a5a6e"; ctx.font="500 14px Inter, sans-serif"; ctx.fillText(`patrimoinoscope — ${kpis.n_paires} paires`, 30, 380);
          const b=document.createElement("button");
          b.id="btn-perso"; b.className="btn btn-ghost"; b.textContent="📸 Ma carte perso";
          b.onclick=()=>{
            const a=document.createElement("a");
            a.download="patrimoinoscope-perso.png";
            a.href=persoCanvas.toDataURL("image/png");
            a.click();
            try{ if(window.plausible) plausible('perso-card'); }catch{}
          };
          share.appendChild(b);
        }, 300);
      }
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
  const url = new URL(location.href);
  url.searchParams.set('utm_source','share'); url.searchParams.set('utm_medium','kpi'); url.searchParams.set('utm_campaign', encodeURIComponent(kpis.top_categorie));
  const shareUrl = url.toString();
  // plausible
  try{ if(window.plausible) window.plausible('share', {props:{top:kpis.top_categorie}}); }catch{}
  if(navigator.share){
    try{ await navigator.share({title:document.title, text, url:shareUrl}); }catch{}
  } else if(navigator.clipboard){
    await navigator.clipboard.writeText(`${text} ${shareUrl}`);
    alert("Lien KPI copié !");
  } else {
    prompt("Copie ce lien :", `${text} ${shareUrl}`);
  }
}

let catMode="euros";
function renderCategories(){
  const ctx = document.getElementById("chart-categories");
  const subtitle = document.getElementById("cat-subtitle");
  const insight = document.getElementById("cat-insight");
  function dataForMode(){
    if(catMode==="pct"){
      subtitle.textContent = "En % d'évolution (sortie vs entrée) — démo";
      return byCategory.map(c=>c.delta_pct);
    } else {
      subtitle.textContent = "En € — delta moyen par catégorie (démo)";
      return byCategory.map(c=>c.delta_moyen);
    }
  }
  const labels = byCategory.map(c=>c.label);
  const contribs = byCategory.map(c=>c.contribution_pct);
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
  insight.textContent = `Lecture (démo) : ${byCategory[0].label} concentre ${byCategory[0].contribution_pct}% de la hausse totale (${fmtEur(byCategory[0].delta_moyen)}, ${fmtPct(byCategory[0].delta_pct)}). Réel N=3 : ${kpisReel ? fmtEur(kpisReel.delta_net_moyen) + " " + fmtPct(kpisReel.delta_net_pct) : "—"} (voir onglet Réel).`;
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
    });
  });
  document.getElementById("chk-net").addEventListener("change", e=>{
    insight.textContent = e.target.checked
      ? `Mode net (après dettes) — même hiérarchie, l'immobilier reste #1 en démo. Réel : patrimoine net baisse de ${kpisReel ? fmtPct(kpisReel.delta_net_pct) : "—"} sur N=3.`
      : `Lecture (démo) : ${byCategory[0].label} concentre ${byCategory[0].contribution_pct}% de la hausse totale.`;
  });
}

function renderReel(){
  if(!kpisReel || !catReel){
    document.getElementById("reel-insight").textContent="Données réelles non disponibles (N<3).";
    return;
  }
  document.getElementById("reel-delta").textContent=`${fmtEur(kpisReel.delta_net_moyen)} (${fmtPct(kpisReel.delta_net_pct)}) sur ${kpisReel.n_paires} paires, ${kpisReel.duree_moyenne_annees} ans`;
  const ctx=document.getElementById("chart-reel");
  const labels=catReel.map(c=>c.label);
  const deltas=catReel.map(c=>c.delta_moyen);
  const bg=deltas.map(v=> v>0? "#0a7d48" : "#E1000F");
  chartReel=new Chart(ctx,{
    type:"bar",
    data:{labels, datasets:[{label:"Δ € réel", data:deltas, backgroundColor:bg, borderRadius:8}]},
    options:{
      indexAxis:"y", responsive:true, maintainAspectRatio:false,
      plugins:{legend:{display:false}, tooltip:{callbacks:{label:ctx=> fmtEur(ctx.raw)}}},
      scales:{x:{ticks:{callback:v=> fmtEur(v)}}, y:{grid:{display:false}}}
    }
  });
  document.getElementById("reel-insight").textContent=`Sur les 3 paires gouvernementales, le patrimoine net recule de ${fmtEur(Math.abs(kpisReel.delta_net_moyen))} en moyenne, tiré par l'immobilier ${fmtEur(catReel.find(c=>c.categorie==="immobilier").delta_moyen)}. Échantillon trop petit pour généraliser — voir docs/DATA.md.`;
  // cohorts reel
  fetch(`${DATA_PATH}cohorts_reel.json`).then(r=>r.json()).then(cohortsReel=>{
    const wrap=document.getElementById("reel-cohorts");
    wrap.innerHTML=cohortsReel.map(c=>`
      <div class="cohort" style="cursor:default">
        <div class="id">${c.id_anon} <span class="badge-mandat mandat-${c.type_mandat}">${c.type_mandat}</span></div>
        <div class="meta">${c.tranche_age} · ${c.duree_annees} ans</div>
        <div class="delta" style="color:${c.delta_pct>0?'var(--ok)':'var(--red)'}">${fmtPct(c.delta_pct)} (${fmtEur(c.delta_net)})</div>
        <div class="top">Top : ${c.top_categorie_label}</div>
      </div>
    `).join("");
  }).catch(()=>{});
}

function renderInterets(){
  if(!interets) return;
  document.getElementById("interet-median").textContent=fmtEur(interets.remunerations.mediane);
  document.getElementById("interet-p90").textContent=fmtEur(interets.remunerations.p90);
  // participations
  const ctx1=document.getElementById("chart-particip");
  const topP=interets.top_participations.slice(0,10);
  chartParticip=new Chart(ctx1,{
    type:"bar",
    data:{labels:topP.map(p=>p.societe), datasets:[{label:"Déclarants", data:topP.map(p=>p.n), backgroundColor:"#000091", borderRadius:6}]},
    options:{indexAxis:"y", responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{x:{ticks:{precision:0}}, y:{grid:{display:false}}}}
  });
  // activités
  const ctx2=document.getElementById("chart-activ");
  const topA=interets.top_activites.slice(0,10);
  chartActiv=new Chart(ctx2,{
    type:"bar",
    data:{labels:topA.map(a=>a.activite), datasets:[{label:"Déclarants", data:topA.map(a=>a.n), backgroundColor:"#3b6cff", borderRadius:6}]},
    options:{indexAxis:"y", responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{x:{ticks:{precision:0}}, y:{grid:{display:false}}}}
  });
  document.getElementById("interet-insight").textContent=`Sur ${fmtNum(interets.total_di)} DI, la rémunération 5 ans médiane est ${fmtEur(interets.remunerations.mediane)} (moyenne ${fmtEur(interets.remunerations.moyenne)}, p90 ${fmtEur(interets.remunerations.p90)}). Top participation : ${topP[0].societe} (${topP[0].n} déclarants).`;
}

function renderMandats(){
  const ctx = document.getElementById("chart-mandats");
  const labels = byMandat.map(m=> `${m.label} (n=${m.n})`);
  const deltas = byMandat.map(m=>m.delta_moyen_net);
  chartMandat = new Chart(ctx, {
    type:"bar",
    data:{labels, datasets:[{label:"Δ net moyen € (démo)", data:deltas, backgroundColor:["#000091","#3b6cff","#6c8cff","#a9b4ff","#d0d6ff"], borderRadius:8}]},
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{legend:{display:false}, tooltip:{callbacks:{label:ctx=> fmtEur(ctx.raw)}}},
      scales:{y:{ticks:{callback:v=> fmtEur(v)}}, x:{ticks:{maxRotation:22}}}
    }
  });
  const donutCtx = document.getElementById("chart-donut");
  chartDonut = new Chart(donutCtx, {
    type:"doughnut",
    data:{labels: byCategory.map(c=>c.label), datasets:[{data: byCategory.map(c=>c.contribution_pct), backgroundColor:["#000091","#2a4bff","#6c8cff","#a9b4ff","#d8ddff","#eee"], borderWidth:2}]},
    options:{responsive:true, maintainAspectRatio:false, plugins:{legend:{position:"bottom"}, tooltip:{callbacks:{label:ctx=> `${ctx.label}: ${ctx.raw}%`}}}, cutout:"58%"}
  });
  document.getElementById("donut-insight").textContent = `Sur 100€ de hausse (démo), ~${byCategory[0].contribution_pct}€ viennent de l'immobilier.`;
  const slider = document.getElementById("duree");
  const val = document.getElementById("duree-val");
  const nEl = document.getElementById("duree-n");
  function updateSlider(){
    const min = parseFloat(slider.value);
    val.textContent = `${min} ans`;
    const filtered = cohorts.filter(c=> c.duree_annees >= min);
    nEl.textContent = `${filtered.length} profils ≥ ${min} ans (sur ${cohorts.length})`;
    if(filtered.length){
      const topCounts = {};
      filtered.forEach(c=> topCounts[c.top_categorie] = (topCounts[c.top_categorie]||0)+1);
      const top = Object.entries(topCounts).sort((a,b)=>b[1]-a[1])[0][0];
      document.getElementById("donut-insight").textContent = `Filtre ≥${min} ans : top catégorie la plus fréquente = ${top} (${topCounts[top]} profils).`;
    }
    document.querySelectorAll(".cohort").forEach(el=>{
      const d = parseFloat(el.dataset.duree);
      el.style.opacity = d >= min ? "1" : ".28";
      el.style.pointerEvents = d >= min ? "" : "none";
    });
  }
  slider.addEventListener("input", updateSlider);
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

function renderAuditTeaser(){
  if(kpis.couverture_dsp_inventaire){
    document.getElementById("audit-total").textContent=fmtNum(kpis.couverture_dsp_inventaire);
    document.getElementById("audit-tele").textContent="75";
  }
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
  // freshness badge
  const fresh=document.getElementById("freshness");
  if(fresh && kpis.date_generation){
    const d=new Date(kpis.date_generation);
    const diff=Math.floor((Date.now()-d)/86400000);
    fresh.textContent= diff<=7 ? "✓ À jour" : `MàJ il y a ${diff}j`;
    fresh.style.background= diff<=7 ? "#eaf6ef" : "#fff0f0";
    fresh.style.borderColor= diff<=7 ? "#b7e0c8" : "#e0b7b7";
  }
  // onboarding 3 étapes
  const onboard=document.getElementById("onboard");
  if(onboard && !localStorage.getItem("onboard_done")){
    const steps=[
      {t:"1/3 — Le patrimoine", d:"Le graphique #1 montre la hausse moyenne par catégorie (démo)."},
      {t:"2/3 — Le quiz", d:"Teste ton intuition : qu'est-ce qui augmente le plus ?"},
      {t:"3/3 — Les intérêts", d:"On a 6533 DI : découvre les participations et rémunérations."},
    ];
    let idx=0;
    function show(i){
      document.getElementById("onboard-title").textContent=steps[i].t;
      document.getElementById("onboard-text").textContent=steps[i].d;
      document.querySelectorAll(".onboard-dots span").forEach((el,j)=> el.classList.toggle("active", j===i));
      document.getElementById("onboard-next").textContent= i===2 ? "C'est parti !" : "Suivant →";
    }
    onboard.classList.add("open"); onboard.setAttribute("aria-hidden","false"); show(0);
    document.getElementById("onboard-next").onclick=()=>{
      if(idx<2){ idx++; show(idx); } else { onboard.classList.remove("open"); localStorage.setItem("onboard_done","1"); try{ if(window.plausible) plausible('onboard-complete'); }catch{} }
    };
    document.getElementById("onboard-skip").onclick=()=>{ onboard.classList.remove("open"); localStorage.setItem("onboard_done","1"); };
    onboard.onclick=(e)=>{ if(e.target===onboard){ onboard.classList.remove("open"); localStorage.setItem("onboard_done","1"); }};
  }
  // embed modal
  const embedBtn=document.getElementById("btn-embed");
  const embedModal=document.getElementById("embed-modal");
  if(embedBtn){
    embedBtn.onclick=()=>{ embedModal.classList.add("open"); embedModal.setAttribute("aria-hidden","false"); };
    document.getElementById("embed-close").onclick=()=> embedModal.classList.remove("open");
    document.getElementById("embed-copy").onclick=async()=>{
      const code=`<iframe src="https://lemodelesocialfrancais.github.io/patrimoinoscope/#quiz" width="100%" height="420" style="border:0;border-radius:12px" loading="lazy"></iframe>`;
      try{ await navigator.clipboard.writeText(code); alert("Code iframe copié !"); if(window.plausible) plausible('embed-copy'); }catch{ prompt("Copiez :", code); }
    };
    embedModal.onclick=(e)=>{ if(e.target===embedModal) embedModal.classList.remove("open"); };
  }
}

function setupOG(){
  const btn=document.getElementById("btn-og");
  if(!btn) return;
  btn.addEventListener("click", ()=>{
    try{ if(window.plausible) window.plausible('generate-og'); }catch{}
    const canvas=document.getElementById("og-canvas");
    const ctx=canvas.getContext("2d");
    ctx.fillStyle="#FFFBF7"; ctx.fillRect(0,0,1200,630);
    ctx.fillStyle="#000091"; ctx.fillRect(0,0,1200,12);
    ctx.fillStyle="#1a1a2e"; ctx.font="800 54px Inter, sans-serif"; ctx.fillText("Patrimoinoscope", 60, 100);
    ctx.font="600 22px Inter, sans-serif"; ctx.fillStyle="#5a5a6e"; ctx.fillText("Ce qui augmente vraiment pendant un mandat — HATVP", 60, 140);
    ctx.fillStyle="#000091"; ctx.font="800 44px Inter, sans-serif"; ctx.fillText(`${fmtPct(kpis.delta_net_pct)} en ${kpis.duree_moyenne_annees} ans`, 60, 250);
    ctx.font="600 20px Inter, sans-serif"; ctx.fillStyle="#1a1a2e"; ctx.fillText(`Patrimoine net : ${fmtEur(kpis.entree_net_moyen)} → ${fmtEur(kpis.sortie_net_moyen)}`, 60, 290);
    ctx.fillStyle="#0a7d48"; ctx.font="800 36px Inter, sans-serif"; ctx.fillText(`Top : ${kpis.top_categorie} ${fmtEur(kpis.top_categorie_delta)}`, 60, 350);
    ctx.fillStyle="#5a5a6e"; ctx.font="500 18px Inter, sans-serif"; ctx.fillText(`Source : HATVP open data · ${kpis.n_paires} paires · Licence Ouverte 2.0`, 60, 400);
    ctx.fillStyle="#000091"; ctx.font="700 16px Inter, sans-serif"; ctx.fillText("lemodelesocialfrancais.github.io/patrimoinoscope", 60, 580);
    ctx.fillStyle="#E1000F"; ctx.fillRect(1050, 560, 90, 10);
    const a=document.createElement("a");
    a.download="patrimoinoscope-og.png";
    a.href=canvas.toDataURL("image/png");
    a.click();
  });
}

load().catch(e=>{
  console.error(e);
  document.body.insertAdjacentHTML("afterbegin", `<div style="background:#fff0f0;border:1px solid #E1000F;padding:10px;text-align:center" role="alert">Erreur chargement données : ${e.message} — Vérifie <code>data/</code></div>`);
});
