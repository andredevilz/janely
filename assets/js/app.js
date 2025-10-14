// app.js
document.addEventListener("DOMContentLoaded", () => {
/* ===== helpers ===== */
const on = (id, ev, fn) => { const el = document.getElementById(id); if (el) el.addEventListener(ev, fn); return el; };
const $  = (q,ctx=document)=>ctx.querySelector(q);
const $$ = (q,ctx=document)=>Array.from(ctx.querySelectorAll(q));

// disponibilizar helpers globalmente (para pricing.js, PDF, etc.)
window.on = on;
window.$  = $;
window.$$ = $$;

/* ===== CONSTANTES / ESTADO ===== */
const STORAGE_KEY  = "window_calc_pricing_v10_additive";
const COMPANY_KEY  = "window_calc_company_v1";
const PROPOSAL_KEY = "window_calc_proposal_v1";
const ITEMS_KEY    = "window_calc_items_v1";
const VAT_RATE     = 0.23;

const fmt = (n)=> Number(n||0).toLocaleString(getCfg().locale,{style:"currency",currency:getCfg().currency});
const toNumber = (v)=> { if (typeof v === "number") return v; return parseFloat(String(v).replace(',', '.')) || 0; };

let RUNTIME = {
  config: deepClone(CONFIG.DEFAULT_CONFIG),
  tabIndex: 0,
  modelIndex: 1,
  systemKey: "65",
  company:  { logoDataUrl:"", name:"", address:"", email:"", nif:"", phone:"", iban:"" },
  proposal: { clientName:"", siteLocation:"", quoteNo:"", quoteDate:"", quoteValidUntil:"", startDate:"", payTerms:"", workTerms:"", notes:"", vatItemsPct: 23, vatInstallPct: 23 },
  items: []
};

/* === LIGAR PRICING (antes de qualquer uso de calc/updateSummary/state) === */
if (window.PRICING && typeof PRICING.setup === "function") {
  PRICING.setup({
    RUNTIME,
    getCfg: () => RUNTIME.config,
    fmt,
    toNumber
  });
  // expor globais usadas no resto do app
  window.state         = PRICING.state;
  window.updateSummary = PRICING.updateSummary;
  window.calc          = PRICING.calc;
} else {
  console.error("PRICING não está carregado — confirma a ordem dos <script> no index.");
}

/* ===== helpers config ===== */
function getCfg(){ return RUNTIME.config; }
function deepClone(obj){ return JSON.parse(JSON.stringify(obj)); }
function mergeConfig(base, overrides){
  const out = deepClone(base);
  if (!overrides) return out;
  if (overrides.currency) out.currency = overrides.currency;
  if (overrides.locale) out.locale = overrides.locale;
  if (typeof overrides.minAreaFactor === "number") out.minAreaFactor = overrides.minAreaFactor;
  if (overrides.systems) out.systems = {...out.systems, ...overrides.systems};
  if (overrides.colors)  out.colors  = {...out.colors,  ...overrides.colors};
  if (overrides.energy)  out.energy  = {...out.energy,  ...overrides.energy};
  if (overrides.stores)  out.stores  = mergeDeep(out.stores, overrides.stores);
  if (overrides.tech)    out.tech    = {...out.tech,    ...overrides.tech};
  if (overrides.tabs) {
    out.tabs = out.tabs.map((tab,i)=>{
      const ov = overrides.tabs[i]; if (!ov) return tab;
      const t = {...tab};
      if (ov.label)  t.label = ov.label;
      if (ov.limits) t.limits = {...t.limits, ...ov.limits};
      if (ov.models) t.models = t.models.map((m,mi)=> ov.models[mi] ? {...m, ...ov.models[mi]} : m);
      return t;
    });
  }
  return out;
}
function mergeDeep(a,b){
  const out = deepClone(a||{});
  for (const k in b){
    if (b[k] && typeof b[k]==="object" && !Array.isArray(b[k])){
      out[k] = mergeDeep(out[k], b[k]);
    } else {
      out[k] = b[k];
    }
  }
  return out;
}

/* ===== UI: tabs, modelos, perfis ===== */
function buildTabs(){
  const c=$("#tabs"); if (!c) return; c.innerHTML="";
  getCfg().tabs.forEach((t,i)=>{
    const b=document.createElement("button");
    b.className="tabbtn"+(i===RUNTIME.tabIndex?" active":"");
    b.textContent=t.label;
    b.addEventListener("click",()=>{
       RUNTIME.tabIndex=i; RUNTIME.modelIndex=0;
       renderModels(); updateLimits(); clampSizeToLimits();
       toggleSectionsForStores(); renderStoreOptionsUI(); renderProfiles(); renderFinishingSelectors();
       updateSummary(); refreshTabs(); calc();
     });
    c.appendChild(b);
  });
}
function refreshTabs(){
  $$(".tabbtn").forEach((b,i)=>b.classList.toggle("active",i===RUNTIME.tabIndex));
  const tab = getCfg().tabs[RUNTIME.tabIndex];
  $("#catTitle") && ($("#catTitle").textContent = tab.label);
  $("#sumTab")   && ($("#sumTab").textContent   = tab.label);
}
function renderModels(){
  const grid=$("#modelsGrid"); if (!grid) return;
  grid.innerHTML="";
  getCfg().tabs[RUNTIME.tabIndex].models.forEach((m,i)=>{
    const lab=document.createElement("label");
    lab.className="radio-img"+(i===RUNTIME.modelIndex?" selected":"");
    lab.innerHTML=`
      <input type="radio" name="model" ${i===RUNTIME.modelIndex?"checked":""}>
      <div class="imgwrap"><img src="${m.img}" alt=""></div>
      <div class="meta"><span class="ttl">${m.title}</span><span class="lblprice">${fmt(m.price)}</span></div>`;
    lab.addEventListener("click",()=>{
       RUNTIME.modelIndex=i; grid.querySelectorAll(".radio-img").forEach(x=>x.classList.remove("selected"));
       lab.classList.add("selected"); updateSummary(); calc();
     });
    grid.appendChild(lab);
  });
}
function renderProfiles(){
  const grid=$("#systemsGrid"); if (!grid) return;
  if (isStoresTab()){ grid.innerHTML=""; grid.closest("div")?.classList.add("hidden"); grid.style.display="none"; return; }
  grid.closest("div")?.classList.remove("hidden"); grid.style.display="";
  grid.innerHTML="";
  Object.entries(getCfg().systems).forEach(([key,obj])=>{
    const lab=document.createElement("label");
    lab.className="radio-img"+(key===RUNTIME.systemKey?" selected":"");
    lab.innerHTML=`
      <input type="radio" name="system" ${key===RUNTIME.systemKey?"checked":""}>
      <div class="imgwrap"><img src="${obj.img || ''}" alt="${obj.label || key}"></div>
      <div class="meta"><span class="ttl">${obj.label || key}</span>
        <span class="badge">+${fmt(obj.addEUR||0)}</span>
      </div>`;
    lab.addEventListener("click",()=>{
       RUNTIME.systemKey=key; grid.querySelectorAll(".radio-img").forEach(x=>x.classList.remove("selected"));
       lab.classList.add("selected"); updateSummary(); calc();
     });
    grid.appendChild(lab);
  });
}
function isStoresTab(){ return (getCfg().tabs[RUNTIME.tabIndex]?.label||"") === "Estores"; }

/* ===== textos/visibilidade por aba ===== */
function toggleSectionsForStores(){
  const colorWrap  = $("#color")?.closest(".field");
  const energyWrap = $("#energy")?.closest(".field");
  const techSec    = $("#techSection");
  const sysBlock   = $("#systemsGrid")?.closest("div");
  const limits     = $("#limitsHint");
  const qtyField   = $("#qty")?.closest(".field");
  const sumQtyRow  = $("#sumQty")?.closest("tr");

  const widthLabel  = $('#width')?.closest('.field')?.querySelector('label');
  const heightLabel = $('#height')?.closest('.field')?.querySelector('label');

  const modelsGrid = $("#modelsGrid");
  const typeNote   = modelsGrid?.previousElementSibling;
  const typeH3     = typeNote?.previousElementSibling;
  const sysGrid    = $("#systemsGrid");
  const sysNote    = sysGrid?.previousElementSibling;
  const sysH3      = sysNote?.previousElementSibling;

  if (isStoresTab()){
    colorWrap && (colorWrap.style.display="none");
    energyWrap && (energyWrap.style.display="none");
    techSec && (techSec.style.display="none");
    sysBlock && (sysBlock.style.display="none");
    limits && (limits.style.display="block");
    qtyField && (qtyField.style.display="none");
    sumQtyRow && (sumQtyRow.style.display="none");

    typeH3 && (typeH3.textContent = "Selecione o tipo de Estores");
    typeNote && (typeNote.textContent = "Escolha o tipo de estores que pretende");
    sysH3 && (sysH3.textContent = "Escolha as opções");
    sysNote && (sysNote.textContent = "Configure motorização, lâmina, caixa, comando, etc.");

    widthLabel && (widthLabel.textContent  = "Largura dos Estores (mm)");
    heightLabel && (heightLabel.textContent = "Altura dos Estores (mm)");
  } else {
    colorWrap && (colorWrap.style.display="");
    energyWrap && (energyWrap.style.display="");
    techSec && (techSec.style.display="");
    sysBlock && (sysBlock.style.display="");
    qtyField && (qtyField.style.display="");
    sumQtyRow && (sumQtyRow.style.display="");

    typeH3 && (typeH3.textContent = "Selecione o tipo de janela");
    typeNote && (typeNote.textContent = "Escolha o tipo de janela que pretende");
    sysH3 && (sysH3.textContent = "Selecionar sistema");
    sysNote && (sysNote.textContent = "Escolha o perfil para a sua janela");

    widthLabel && (widthLabel.textContent  = "Largura da janela (mm)");
    heightLabel && (heightLabel.textContent = "Altura da janela (mm)");
  }
}

function updateLimits(){
  const lim=getCfg().tabs[RUNTIME.tabIndex].limits; // em cm no config
  const w=$("#width"), h=$("#height"); if(!w||!h) return;
  // UI em mm:
  w.min=lim.wMin*10; w.max=lim.wMax*10; h.min=lim.hMin*10; h.max=lim.hMax*10;
  const hint=$("#limitsHint");
  hint && (hint.innerHTML = `Mín.: <b>${lim.wMin*10}</b> – Máx.: <b>${lim.wMax*10}</b> mm (largura) · Mín.: <b>${lim.hMin*10}</b> – Máx.: <b>${lim.hMax*10}</b> mm (altura)`);
}
function clampSizeToLimits(){
  const lim=getCfg().tabs[RUNTIME.tabIndex].limits; // cm
  const w=$("#width"), h=$("#height"); if(!w||!h) return;
  // inputs em mm
  const nw = Math.min(Math.max(parseInt(w.value||0,10), lim.wMin*10), lim.wMax*10);
  const nh = Math.min(Math.max(parseInt(h.value||0,10), lim.hMin*10), lim.hMax*10);
  if (+w.value!==nw) w.value = nw;
  if (+h.value!==nh) h.value = nh;
}
function sizeValid(){
  const lim=getCfg().tabs[RUNTIME.tabIndex].limits; // cm
  const wmm=+($("#width")?.value||0), hmm=+($("#height")?.value||0);
  const ok=(wmm>=lim.wMin*10 && wmm<=lim.wMax*10 && hmm>=lim.hMin*10 && hmm<=lim.hMax*10);
  const err=$("#sizeError"); err && (err.style.display = ok ? "none" : "block");
  return ok;
}

/* ===== selects (janelas/portas) ===== */
function renderFinishingSelectors(){
  const colorSel = $("#color"); const energySel = $("#energy");
  if (!colorSel || !energySel) return;

  colorSel.innerHTML="";
  if (!isStoresTab()){
    Object.entries(getCfg().colors).forEach(([key,obj])=>{
      const op=document.createElement("option");
      op.value = key; op.textContent = `${obj.label} (+${fmt(obj.addEUR||0)})`;
      colorSel.appendChild(op);
    });
    colorSel.value = Object.keys(getCfg().colors)[0] || "";
  }

  energySel.innerHTML="";
  if (!isStoresTab()){
    Object.entries(getCfg().energy).forEach(([key,obj])=>{
      const op=document.createElement("option");
      op.value = key; op.textContent = `${obj.label} (+${fmt(obj.addEUR||0)})`;
      energySel.appendChild(op);
    });
    energySel.value = Object.keys(getCfg().energy)[0] || "";
    const lab = document.querySelector('label[for="energy"]');
    lab && (lab.textContent = "Eficiência energética");
  }
}

/* ===== UI ESTORES ===== */
function renderStoreOptionsUI(){
  $("#storeOptsWrap")?.remove();
  if (!isStoresTab()) return;

  const anchor = $("#descExtra"); if (!anchor) return;
  const wrap = document.createElement("div");
  wrap.id = "storeOptsWrap";
  wrap.className = "cols cols-3";
  wrap.style.marginTop = "12px";

  const cfg = getCfg().stores;
  const selHtml = (id, obj)=> {
    const ops = Object.entries(obj).map(([k,o])=>`<option value="${k}">${UTILS.escapeHtml(o.label)} (+${fmt(o.addEUR||0)})</option>`).join("");
    return `<select id="${id}">${ops}</select>`;
  };

  wrap.innerHTML = `
    <div class="field"><label for="st_motor">Motorização</label>${selHtml("st_motor", cfg.motor)}<small class="muted">Sem motor ou motor tubular.</small></div>
    <div class="field"><label for="st_lamella">Lâmina</label>${selHtml("st_lamella", cfg.lamella)}<small class="muted">Tipo/largura da lâmina.</small></div>
    <div class="field"><label for="st_box">Caixa</label>${selHtml("st_box", cfg.box)}<small class="muted">Altura de caixa.</small></div>
    <div class="field"><label for="st_control">Comando</label>${selHtml("st_control", cfg.control)}<small class="muted">Fita, interruptor, RF…</small></div>
    <div class="field"><label for="st_guides">Guias</label>${selHtml("st_guides", cfg.guides)}<small class="muted">Perfil de guia.</small></div>
    <div class="field"><label for="st_install">Montagem</label>${selHtml("st_install", cfg.install)}<small class="muted">Exterior, monobloco, interior.</small></div>
    <div class="field"><label for="st_accessory">Acessórios</label>${selHtml("st_accessory", cfg.accessory)}<small class="muted">Trava, fecho, fins de curso…</small></div>
  `;
  anchor.parentElement?.insertBefore(wrap, anchor);

  ["st_motor","st_lamella","st_box","st_control","st_guides","st_install","st_accessory","width","height"].forEach(id=>{
    document.getElementById(id)?.addEventListener("input", ()=>{ updateSummary(); calc(); }, {capture:true});
  });
}

// --- Ativar/Desativar ESPECIFICAÇÕES TÉCNICAS ---
(function(){
  const chk = document.getElementById("specsEnabled");
  const blk = document.getElementById("specsBlock");
  if (!chk || !blk) return;

  // hidratar do estado (se já existia guardado)
  chk.checked = !!RUNTIME?.proposal?.specsEnabled;
  blk.classList.toggle("is-off", !chk.checked);

  // responder a alterações
  chk.addEventListener("change", () => {
    const on = chk.checked;
    // guardar no estado
    if (!RUNTIME.proposal) RUNTIME.proposal = {};
    RUNTIME.proposal.specsEnabled = on;
    // mostrar/esconder
    blk.classList.toggle("is-off", !on);
    // guardar como os outros campos
    if (typeof persistProposal === "function") persistProposal();
  });
})();


/* ===== campo “Valor total de montagem” ===== */
(function injectInstallTotalField(){
  const anchor = document.getElementById("descExtra") 
  || document.querySelector('#energy')?.closest('.field') 
  || document.querySelector('.leftcol .fields')
  || document.body;

  if (!anchor) return;
  if (document.getElementById("installTotalField")) return;

  const wrap = document.createElement("div");
  wrap.className = "field";
  wrap.id = "installTotalField";
  wrap.innerHTML = `
    <label for="installTotal" style="font-weight:700">Valor total de montagem</label>
    <input type="number" id="installTotal" min="0" step="1" placeholder="0">
    <small class="muted">Valor global (em ${getCfg().currency}) a acrescentar ao orçamento.</small>
  `;
  anchor.closest('.field')?.parentElement?.insertBefore(wrap, anchor.closest('.field'));

  if (typeof RUNTIME.proposal.installTotal === "number") {
    document.getElementById("installTotal").value = String(Math.round(RUNTIME.proposal.installTotal));
  } else {
    RUNTIME.proposal.installTotal = 0;
  }
  document.getElementById("installTotal").addEventListener("input", e=>{
    RUNTIME.proposal.installTotal = toNumber(e.target.value||0);
    persistProposal();
    renderCart();
  });
})();

/* ===== tech inputs ===== */
function hydrateTechInputsFromConfig(){
  const tech = (getCfg() || {}).tech || {};
  const fillSel = (id, options)=>{
     const el=$("#"+id); if(!el) return;
     el.innerHTML="";
     const none = document.createElement("option"); none.value=""; none.textContent="NENHUM"; el.appendChild(none);
     (options||[]).forEach(o=>{ const op=document.createElement("option"); op.value=o; op.textContent=o; el.appendChild(op); });
     el.value = "";
  };
  const dl = $("#dl_systemProfiles"); if(dl){ dl.innerHTML=""; (tech.systemProfiles||[]).forEach(o=>{ const op=document.createElement("option"); op.value=o; dl.appendChild(op); }); }
  fillSel("tech_hw_brand", tech.hardwareBrands||[]);
  fillSel("tech_hw_color", tech.hardwareColors||[]);
  fillSel("tech_gl1", tech.glassOptions||[]);
  fillSel("tech_gl2", tech.glassOptions||[]);
  fillSel("tech_spacer", (tech.warmEdgeSpacer||[]).map(w=>`${w}`));
  fillSel("tech_sp_color", tech.warmEdgeColors||[]);
  fillSel("tech_gas", tech.gasTypes||[]);
  $("#tech_ug") && ($("#tech_ug").value = "1.1");
  $("#tech_uw") && ($("#tech_uw").value = "1.3");
  $("#tech_rw") && ($("#tech_rw").value = "34");
  $("#tech_ce") && ($("#tech_ce").checked = true);
}

/* ===== eventos gerais ===== */
["width","height","qty","color","energy","descExtra",
 "tech_profile","tech_hw_brand","tech_hw_color","tech_refs","tech_gl1","tech_spacer","tech_sp_color","tech_gl2","tech_gas","tech_ug","tech_uw","tech_rw","tech_ce",
 "st_motor","st_lamella","st_box","st_control","st_guides","st_install","st_accessory"
].forEach(id=>{
  document.addEventListener("input",e=>{ if(e.target.id===id){ updateSummary(); calc(); } },{capture:true});
});
on("resetBtn","click",()=>{
  RUNTIME.tabIndex=0; RUNTIME.modelIndex=1; RUNTIME.systemKey="65";
  $("#width") && ($("#width").value=100); $("#height") && ($("#height").value=100); $("#qty") && ($("#qty").value=1);
  $("#descExtra") && ($("#descExtra").value="");
  $("#storeOptsWrap")?.remove();
  hydrateTechInputsFromConfig();
  renderModels(); renderProfiles(); updateLimits(); clampSizeToLimits(); renderStoreOptionsUI();
  toggleSectionsForStores(); renderFinishingSelectors(); updateSummary(); refreshTabs(); calc();
});
on("calcBtn","click",calc);

/* ===== itens ===== */
on("addItemBtnRight","click", addCurrentAsItem);

function addCurrentAsItem(){
  if (!sizeValid()) { alert("As dimensões estão fora do intervalo permitido."); return; }
  const s = state(); 
  const r = calc();
  const id = crypto?.randomUUID?.() || String(Date.now()) + Math.random().toString(36).slice(2,8);

  // 1) NOVO: ver se o checkbox "Ativar especificações técnicas" está ligado
  const specsOn = !!(RUNTIME && RUNTIME.proposal && RUNTIME.proposal.specsEnabled);

  let storeLine = "";
  if (s.isStores){
    const st = getCfg().stores, sel = s.storeSel;
    storeLine = [
      st.motor[sel.motorKey]?.label, 
      st.lamella[sel.lamellaKey]?.label, 
      st.box[sel.boxKey]?.label,
      st.control[sel.controlKey]?.label, 
      st.guides[sel.guidesKey]?.label, 
      st.install[sel.installKey]?.label, 
      st.accessory[sel.accKey]?.label
    ].filter(Boolean).join(" • ");
  }

  const item = {
    id, 
    tabLabel: s.tabLabel, 
    modelTitle: s.model.title, 
    modelImg: s.model.img || "",
    systemLabel: s.isStores ? "—" : (s.system.label || RUNTIME.systemKey),
    systemAddEUR: s.isStores ? 0  : (s.system.addEUR || 0),
    w: s.w, h: s.h,
    colorLabel: s.isStores ? "—" : s.colorLabel,
    energyLabel: s.isStores ? "—" : s.energyLabel,
    qty: s.qty, 
    perUnit: r.perUnit,
    parts: { baseAreaPrice: r.baseAreaPrice, sysAdd: r.sysAdd, colorAdd: r.colorAdd, extras: r.extras },
    total: r.total,
    extraDesc: [s.extraDesc || "", (s.isStores?storeLine:"")].filter(Boolean).join("\n"),
    discountPct: 0,
    perUnitGross: r.perUnitGross || r.perUnit,

    // 2) NOVO: só passa specs quando o check está ON; se OFF, fica null
    tech: specsOn ? s.tech : null, 

    isStores: s.isStores, 
    storeSel: s.storeSel
  };

  RUNTIME.items.push(item);
  persistItems(); 
  renderCart();
  showToast("Item adicionado ao orçamento", "success");
  scrollToBudget();
}


function persistCompany(){
  // (ainda podes manter localStorage como backup opcional)
  try { localStorage.setItem(COMPANY_KEY, JSON.stringify(RUNTIME.company)); } catch(e){}
  saveAllServerDebounced();
}
function persistProposal(){
  try { localStorage.setItem(PROPOSAL_KEY, JSON.stringify(RUNTIME.proposal)); } catch(e){}
  saveAllServerDebounced();
}
function persistItems(){
  try { localStorage.setItem(ITEMS_KEY, JSON.stringify(RUNTIME.items)); } catch(e){}
  saveAllServerDebounced();
}


// guardador debounce para não spammar
const saveAllServerDebounced = UTILS.debounce(async ()=>{
  const payload = {
    config:  RUNTIME.config,
    company: RUNTIME.company,
    proposal:RUNTIME.proposal,
    items:   RUNTIME.items
  };
  const out = await UTILS.saveServerState(payload);
  if (!out.ok) console.warn("Falha a guardar no servidor:", out.error);
}, 600);


function renderCart(){
  const body = $("#cartBody"); if(!body) return;

  if (!RUNTIME.items.length){
    body.innerHTML = `<tr><td colspan="5" class="muted-small">Ainda não adicionou itens. Configure à esquerda e clique “Adicionar ao orçamento”.</td></tr>`;
  } else {
    body.innerHTML = "";
    RUNTIME.items.forEach((it)=>{
      const techLine = renderTechInline(it.tech, it);
      const discountPct = Math.max(0, Math.min(100, it.discountPct || 0));
      const perUnitAfter = (it.perUnit || 0) * (1 - discountPct/100);

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>
          <strong>${it.modelTitle}</strong> — <span class="muted-small">${it.tabLabel}</span><br>
          <span class="muted-small">${it.isStores ? "" : `<b>Perfil</b>: ${it.systemLabel}${it.systemAddEUR?` (+${fmt(it.systemAddEUR)})`:""} • `}${it.w}×${it.h} mm ${it.isStores ? "" : `• ${it.colorLabel} • ${it.energyLabel}`}</span>
          ${techLine ? `<div class="muted-small" style="margin-top:4px">${techLine}</div>` : ""}

          <div class="muted-small" style="margin-top:8px;display:flex;align-items:center;gap:8px">
            <label for="disc_${it.id}" style="font-weight:600">Desconto</label>
            <input id="disc_${it.id}" type="number" min="0" max="100" step="1" class="disc-input" data-id="${it.id}" value="${discountPct}" style="width:72px"> <span>%</span>
            ${discountPct? `<span>(${discountPct}% aplicado)</span>` : ""}
          </div>

          <div style="margin-top:8px"><textarea class="desc-edit" placeholder="Notas/descrição deste item…" data-id="${it.id}">${it.extraDesc || ""}</textarea></div>
        </td>
        <td><input type="number" class="qty-input" min="1" max="100" value="${it.qty}" data-id="${it.id}" ${it.isStores?'disabled':''}></td>
        <td>
          ${discountPct ? `<div class="muted-small"><s>${fmt(it.perUnit||0)}</s></div>` : ""}
          <div>${fmt(perUnitAfter)}</div>
        </td>
        <td>
          ${discountPct ? `<div class="muted-small"><s>${fmt((it.perUnit||0) * it.qty)}</s></div>` : ""}
          <div>${fmt(perUnitAfter * it.qty)}</div>
        </td>
        <td class="cart-actions"><button class="btn danger" data-del="${it.id}">Remover</button></td>
      `;
      body.appendChild(tr);
    });

    // qty
    body.querySelectorAll("input.qty-input").forEach(inp=>{
      inp.addEventListener("input", (e)=>{
        const id = e.target.getAttribute("data-id");
        const it = RUNTIME.items.find(x=>x.id===id);
        let q = Math.max(1, Math.min(100, +e.target.value || 1));
        if (it){ it.qty = it.isStores ? 1 : q; it.total = it.perUnit * it.qty; persistItems(); renderCart(); }
      });
    });

    // desconto
    body.querySelectorAll("input.disc-input").forEach(inp=>{
      inp.addEventListener("input",(e)=>{
        const id = e.target.getAttribute("data-id");
        const it = RUNTIME.items.find(x=>x.id===id);
        let d = Math.max(0, Math.min(100, +e.target.value || 0));
        if (it){
          it.discountPct = d;
          persistItems();
          renderCart();
        }
      });
    });

    // remover
    body.querySelectorAll("button[data-del]").forEach(btn=>{
      btn.addEventListener("click", (e)=>{
        const id = e.target.getAttribute("data-del");
        RUNTIME.items = RUNTIME.items.filter(x=>x.id!==id);
        persistItems(); renderCart();
      });
    });

    // notas
    body.querySelectorAll("textarea.desc-edit").forEach(ta=>{
      ta.addEventListener("input",(e)=>{
        const id = e.target.getAttribute("data-id");
        const it = RUNTIME.items.find(x=>x.id===id);
        if (it){ it.extraDesc = e.target.value; persistItems(); }
      });
    });
  }

  // Totais (com montagem)
  const subtotalItems = RUNTIME.items.reduce((sum,it)=>{
    const d = Math.max(0, Math.min(100, it.discountPct||0));
    const perUnitAfter = (it.perUnit||0) * (1 - d/100);
    return sum + perUnitAfter * (it.qty||1);
  }, 0);
  const installTotal  = toNumber(RUNTIME.proposal.installTotal || 0);

// ler percentagens (fallback 23)
const vatItemsPct   = toNumber(RUNTIME.proposal.vatItemsPct ?? 23);
const vatInstallPct = toNumber(RUNTIME.proposal.vatInstallPct ?? 23);

// IVA por componente
const ivaItems   = subtotalItems * (vatItemsPct / 100);
const ivaInstall = installTotal  * (vatInstallPct / 100);

const subtotal   = subtotalItems + installTotal;
const totalCIVA  = subtotal + ivaItems + ivaInstall;

// atualizar UI
$("#cartSubtotal")          && ($("#cartSubtotal").textContent          = fmt(subtotal));
$("#cartVatItemsPct")       && ($("#cartVatItemsPct").textContent       = `(${Math.round(vatItemsPct)}%)`);
$("#cartVatItemsVal")       && ($("#cartVatItemsVal").textContent       = fmt(ivaItems));
$("#cartVatInstallPct")     && ($("#cartVatInstallPct").textContent     = `(${Math.round(vatInstallPct)}%)`);
$("#cartVatInstallVal")     && ($("#cartVatInstallVal").textContent     = fmt(ivaInstall));
$("#cartTotal")             && ($("#cartTotal").textContent             = fmt(totalCIVA));


  const cartInstallEl = document.getElementById("cartInstall");
  if (cartInstallEl) cartInstallEl.textContent = fmt(installTotal);
}

function renderTechInline(tech, item){
  if (item?.isStores){
    const st = getCfg().stores, s=item.storeSel||{};
    const bits=[];
    if (s.motorKey)  bits.push(`<b>Motorização</b>: ${UTILS.escapeHtml(st.motor[s.motorKey]?.label||s.motorKey)}`);
    if (s.lamellaKey)bits.push(`<b>Lâmina</b>: ${UTILS.escapeHtml(st.lamella[s.lamellaKey]?.label||s.lamellaKey)}`);
    if (s.boxKey)    bits.push(`<b>Caixa</b>: ${UTILS.escapeHtml(st.box[s.boxKey]?.label||s.boxKey)}`);
    if (s.controlKey)bits.push(`<b>Comando</b>: ${UTILS.escapeHtml(st.control[s.controlKey]?.label||s.controlKey)}`);
    if (s.guidesKey) bits.push(`<b>Guias</b>: ${UTILS.escapeHtml(st.guides[s.guidesKey]?.label||s.guidesKey)}`);
    if (s.installKey)bits.push(`<b>Montagem</b>: ${UTILS.escapeHtml(st.install[s.installKey]?.label||s.installKey)}`);
    if (s.accKey)    bits.push(`<b>Acessório</b>: ${UTILS.escapeHtml(st.accessory[s.accKey]?.label||s.accKey)}`);
    return bits.join(" · ");
  }
  if (!tech) return "";
  const bits = [];
  if (tech.profile) bits.push(`<b>Sistema</b>: ${UTILS.escapeHtml(tech.profile)}`);
  if (tech.hwBrand || tech.hwColor) bits.push(`<b>Ferragens</b>: ${UTILS.escapeHtml([tech.hwBrand, tech.hwColor].filter(Boolean).join(" / "))}`);
  const g=[]; if (tech.gl1) g.push(tech.gl1); if (tech.spacer) g.push(`${tech.spacer} mm`); if (tech.spacerCol) g.push(tech.spacerCol); if (tech.gl2) g.push(tech.gl2);
  if (g.length) bits.push(`<b>Vidro</b>: ${UTILS.escapeHtml(g.join(" + "))}${tech.gas?` (${UTILS.escapeHtml(tech.gas)})`:''}${tech.ug?` • Ug ${Number(tech.ug).toFixed(2)}`:''}`);
  const perf=[]; if(tech.uw) perf.push(`Uw ${Number(tech.uw).toFixed(2)} W/m²K`); if(tech.rw) perf.push(`Rw ${Math.round(tech.rw)} dB`); if(tech.ce) perf.push("CE EN 14351-1");
  if (perf.length) bits.push(`<b>Desempenho</b>: ${UTILS.escapeHtml(perf.join(" • "))}`);
  if (tech.refs) bits.push(`<b>Refs</b>: ${UTILS.escapeHtml(tech.refs)}`);
  return bits.join(" · ");
}

/* ===== company/proposal ===== */
const companyInputs = ["coName","coAddress","coEmail","coNIF","coPhone","coIBAN"];
const proposalInputs = ["clientName","siteLocation","quoteNo","quoteDate","quoteValidUntil","startDate","payTerms","workTerms", "specsEnabled", "notes","vatItemsPct","vatInstallPct"];
["vatItemsPct","vatInstallPct"].forEach(id=>{
  on(id, "input", () => { renderCart(); });
});


const coLogo = $("#coLogo"), coLogoPreview=$("#coLogoPreview");
function showToast(message, type = "success", ms = 2500) {
  const host = document.getElementById("toast");
  if (!host) return;
  const el = document.createElement("div");
  el.className = `toast-msg ${type}`;
  el.textContent = message;
  host.appendChild(el);

  // auto-hide
  setTimeout(() => {
    el.classList.add("hide");
    setTimeout(() => el.remove(), 220);
  }, ms);
}

function scrollToBudget() {
  const targets = [
    "#orcamento",         // <section id="orcamento">  (o que adicionámos)
    "#cartSection",
    "#budget",
    "#totais",
    ".cart-card"
  ];
  let node = null;
  for (const sel of targets) {
    node = document.querySelector(sel);
    if (node) break;
  }
  if (node && node.scrollIntoView) {
    node.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function hydrateForms(){
  const map = {coName:"name",coAddress:"address",coEmail:"email",coNIF:"nif",coPhone:"phone",coIBAN:"iban"};
  companyInputs.forEach(id=>{ const el=$("#"+id); if (!el) return; el.value = RUNTIME.company[map[id]] || ""; });
  if (coLogoPreview && RUNTIME.company.logoDataUrl) { coLogoPreview.src = RUNTIME.company.logoDataUrl; }
proposalInputs.forEach(id=>{
  const el = document.getElementById(id);
  if (!el) return;
  const val = RUNTIME.proposal[id];
  if (el.type === "checkbox") {
    el.checked = !!val;
  } else {
    el.value = val ?? "";
  }
});
}

coLogo?.addEventListener("change", async (e)=>{
  const file = e.target.files?.[0]; if (!file) return;
  const up = await UTILS.uploadToServer(file);
  if (!up.ok){ alert(up.error || "Falha no upload do logotipo."); return; }
  RUNTIME.company.logoDataUrl = up.url;
  if (coLogoPreview) coLogoPreview.src = up.url;
  persistCompany();
});

companyInputs.forEach(id=>{
  on(id,"input", (e)=>{
    const map = {coName:"name",coAddress:"address",coEmail:"email",coNIF:"nif",coPhone:"phone","coIBAN":"iban"};
    RUNTIME.company[map[id]] = e.target.value || ""; persistCompany();
  });
});
proposalInputs.forEach(id=>{
  on(id,"input",(e)=>{
    const el = e.target;
    let val;
    if (el.type === "checkbox") {
      val = el.checked;                    // <-- BOLEANO certo
    } else if (el.type === "number") {
      val = toNumber(el.value);
    } else {
      val = el.value || "";
    }
    RUNTIME.proposal[id] = val;
    persistProposal();

    // aplicar efeitos imediatos
    if (id === "specsEnabled") {
      const blk = document.getElementById("specsBlock");
      blk && blk.classList.toggle("is-off", !el.checked);
    }
    if (id === "vatItemsPct" || id === "vatInstallPct") renderCart();
  });
});

/* ===== PDF (setup & botões) ===== */
function ensurePdfSetup() {
  if (!window.__pdfSetupDone && window.PDF?.setup) {
    window.PDF.setup({
      RUNTIME,
      fmt,
      toNumber,
      VAT_RATE,
      ensureItem: addCurrentAsItem,
      sizeValid
    });
    window.__pdfSetupDone = true;
  }
}
on("exportPdfBtn","click", () => {
  ensurePdfSetup();
  if (!window.PDF?.generate) { alert("Módulo de PDF não carregado."); return; }
  window.PDF.generate();
});
on("pdfBtn","click", () => {
  ensurePdfSetup();
  if (!window.PDF?.generate) { alert("Módulo de PDF não carregado."); return; }
  window.PDF.generate();
});

/* ===== BOOT: carrega do localStorage o que já foi guardado ===== */
// ===== BOOT: carregar estado do SERVIDOR (fallback: localStorage) =====
(async function boot(){
  // 1) tentar servidor
  const srv = await UTILS.fetchServerState();

  if (srv.ok && srv.state) {
    // Merge de config: usa DEFAULT_CONFIG + server.config (se existir)
    try{
      const cfgSrv = srv.state.config;
      if (cfgSrv) {
        RUNTIME.config = mergeConfig(CONFIG.DEFAULT_CONFIG, cfgSrv);
      }
    }catch(e){ console.warn("Falha merge config do servidor:", e); }

    try{
      if (srv.state.company) RUNTIME.company = { ...RUNTIME.company, ...srv.state.company };
      if (srv.state.proposal) RUNTIME.proposal = { ...RUNTIME.proposal, ...srv.state.proposal };
      if (Array.isArray(srv.state.items)) RUNTIME.items = srv.state.items;
    }catch(e){ console.warn("Falha a aplicar estado servidor:", e); }
  } else {
    // 2) fallback antigo (localStorage) só para não perder nada se não houver login
    try{
      const cfgRaw = localStorage.getItem(STORAGE_KEY);
      if (cfgRaw) RUNTIME.config = mergeConfig(CONFIG.DEFAULT_CONFIG, JSON.parse(cfgRaw));
    }catch(e){}
    try{
      const coRaw = localStorage.getItem(COMPANY_KEY);
      if (coRaw) RUNTIME.company = { ...RUNTIME.company, ...JSON.parse(coRaw) };
    }catch(e){}
    try{
      const prRaw = localStorage.getItem(PROPOSAL_KEY);
      if (prRaw) RUNTIME.proposal = { ...RUNTIME.proposal, ...JSON.parse(prRaw) };
    }catch(e){}
    try{
      const itRaw = localStorage.getItem(ITEMS_KEY);
      if (itRaw) RUNTIME.items = JSON.parse(itRaw) || [];
    }catch(e){}
  }

  // render depois de ter RUNTIME
  buildTabs(); renderModels(); renderProfiles(); updateLimits(); clampSizeToLimits(); renderFinishingSelectors(); hydrateTechInputsFromConfig(); renderStoreOptionsUI();
  toggleSectionsForStores(); updateSummary(); calc(); hydrateForms(); renderCart();
})();



/* ===== ligar o editor de preços ===== */
/* ===== ligar o editor de preços ===== */
if (window.PriceEditor && typeof window.PriceEditor.setup === "function") {
  window.PriceEditor.setup({
    getCfg: ()=> RUNTIME.config,
    setCfg: (cfg)=>{ 
      RUNTIME.config = cfg;
      renderModels(); renderProfiles(); renderFinishingSelectors(); renderStoreOptionsUI();
      toggleSectionsForStores(); updateSummary(); calc(); renderCart();

      // ⬇️ MUITO IMPORTANTE: gravar no servidor sempre que há mudanças de preços/imagens
      saveAllServerDebounced();
    },
    DEFAULT_CONFIG: CONFIG.DEFAULT_CONFIG,
    STORAGE_KEY,
    toNumber,
    showToast: UTILS.showToast,
    safeSetItem: (...args)=>UTILS.safeSetItem(...args),
    safeSaveConfig: UTILS.safeSaveConfig,
    escapeHtml: UTILS.escapeHtml
  });
}


/* ===== init ===== */
if (window.PDF && typeof window.PDF.setup === "function") {
  window.PDF.setup({
    RUNTIME,
    fmt,
    toNumber,
    VAT_RATE,
    ensureItem: addCurrentAsItem,
    sizeValid
  });
}


}); // DOMContentLoaded
