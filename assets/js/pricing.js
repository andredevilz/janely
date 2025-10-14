// pricing.js
// Depende de: CONFIG (para nada crítico aqui) e UTILS (escapeHtml)
// Exposto como window.PRICING

(function(){
  let RUNTIME, getCfg, fmt, toNumber;

  function setup(deps){
    RUNTIME   = deps.RUNTIME;
    getCfg    = deps.getCfg;
    fmt       = deps.fmt;
    toNumber  = deps.toNumber;
  }

  function isStoresTab(){
    return (getCfg().tabs[RUNTIME.tabIndex]?.label||"") === "Estores";
  }

  function state(){
    const tab=getCfg().tabs[RUNTIME.tabIndex], m=tab.models[RUNTIME.modelIndex];
    const colors = getCfg().colors, energy=getCfg().energy, stores=getCfg().stores;

    const tech = {
      profile:($("#tech_profile")?.value||"").trim(),
      hwBrand:$("#tech_hw_brand")?.value||"", hwColor:$("#tech_hw_color")?.value||"",
      gl1:$("#tech_gl1")?.value||"", spacer:$("#tech_spacer")?.value||"", spacerCol:$("#tech_sp_color")?.value||"",
      gl2:$("#tech_gl2")?.value||"", gas:$("#tech_gas")?.value||"",
      ug:toNumber($("#tech_ug")?.value||0), uw:toNumber($("#tech_uw")?.value||0), rw:toNumber($("#tech_rw")?.value||0),
      ce:!!$("#tech_ce")?.checked, refs:($("#tech_refs")?.value||"").trim()
    };

    const colorKey = $("#color")?.value || Object.keys(colors)[0] || "";
    const energyKey = (isStoresTab()
      ? ($("#st_motor")?.value || Object.keys(stores.motor)[0])
      : ($("#energy")?.value || Object.keys(energy)[0] || "")
    );

    const storeSel = {
      motorKey:   energyKey,
      lamellaKey: $("#st_lamella")?.value || Object.keys(stores.lamella)[0],
      boxKey:     $("#st_box")?.value     || Object.keys(stores.box)[0],
      controlKey: $("#st_control")?.value || Object.keys(stores.control)[0],
      guidesKey:  $("#st_guides")?.value  || Object.keys(stores.guides)[0],
      installKey: $("#st_install")?.value || Object.keys(stores.install)[0],
      accKey:     $("#st_accessory")?.value || Object.keys(stores.accessory)[0]
    };

    const qtyRaw = +($("#qty")?.value||1);
    const qty = isStoresTab() ? 1 : Math.max(1, Math.min(100, qtyRaw||1));

    return {
      isStores: isStoresTab(),
      model:m, tabLabel:tab.label,
      w:+($("#width")?.value||100), h:+($("#height")?.value||100),
      qty,
      colorKey, energyKey, storeSel,
      colorLabel: colors[colorKey]?.label || "—",
      energyLabel: (isStoresTab() ? stores.motor[energyKey]?.label : energy[energyKey]?.label) || "—",
      system:getCfg().systems[RUNTIME.systemKey],
      extraDesc: ($("#descExtra")?.value || "").trim(),
      tech
    };
  }

  function updateSummary(){
    const s=state();
    const map = {
      sumType: s.model.title, sumTypePrice: fmt(s.model.price),
      sumSystemName: s.isStores ? "—" : (s.system.label || RUNTIME.systemKey),
      sumW: `${s.w} mm`, sumH: `${s.h} mm`,
      sumColor: s.isStores ? "—" : s.colorLabel,
      sumEnergy: s.isStores ? "—" : s.energyLabel,
      sumQty: s.isStores ? "—" : `${s.qty} un.`
    };
    Object.entries(map).forEach(([id,txt])=>{ const el=document.getElementById(id); if (el) el.textContent = txt; });

    const parts=[];
    if (s.isStores){
      const st = getCfg().stores, sel = s.storeSel;
      parts.push(`<b>Motorização</b>: ${UTILS.escapeHtml(st.motor[sel.motorKey]?.label||sel.motorKey)}`);
      parts.push(`<b>Lâmina</b>: ${UTILS.escapeHtml(st.lamella[sel.lamellaKey]?.label||sel.lamellaKey)}`);
      parts.push(`<b>Caixa</b>: ${UTILS.escapeHtml(st.box[sel.boxKey]?.label||sel.boxKey)}`);
      parts.push(`<b>Comando</b>: ${UTILS.escapeHtml(st.control[sel.controlKey]?.label||sel.controlKey)}`);
      parts.push(`<b>Guias</b>: ${UTILS.escapeHtml(st.guides[sel.guidesKey]?.label||sel.guidesKey)}`);
      parts.push(`<b>Montagem</b>: ${UTILS.escapeHtml(st.install[sel.installKey]?.label||sel.installKey)}`);
      parts.push(`<b>Acessório</b>: ${UTILS.escapeHtml(st.accessory[sel.accKey]?.label||sel.accKey)}`);
    }else{
      const t=s.tech||{};
      if (t.profile) parts.push(`<b>Perfil</b>: ${UTILS.escapeHtml(t.profile)}`);
      if (t.hwBrand||t.hwColor) parts.push(`<b>Ferragens</b>: ${UTILS.escapeHtml([t.hwBrand,t.hwColor].filter(Boolean).join(" / "))}`);
      const vid=[t.gl1,(t.spacer?`${t.spacer} mm`:null),t.spacerCol,t.gl2].filter(Boolean).join(" + ");
      if (vid) parts.push(`<b>Vidro</b>: ${UTILS.escapeHtml(vid)}${t.gas?` (${UTILS.escapeHtml(t.gas)})`:''}${t.ug?` • Ug ${Number(t.ug).toFixed(2)}`:''}`);
      const perf=[]; if(t.uw) perf.push(`Uw ${Number(t.uw).toFixed(2)} W/m²K`); if(t.rw) perf.push(`Rw ${Math.round(t.rw)} dB`); if(t.ce) perf.push("CE EN 14351-1");
      if (perf.length) parts.push(`<b>Desempenho</b>: ${UTILS.escapeHtml(perf.join(" • "))}`);
      if (t.refs) parts.push(`<b>Refs</b>: ${UTILS.escapeHtml(t.refs)}`);
    }
    $("#sumTech") && ($("#sumTech").innerHTML = parts.join(" · ") || "<span class='muted-small'>—</span>");
  }

  function sizeValid(){
    const lim=getCfg().tabs[RUNTIME.tabIndex].limits;
    const wmm=+($("#width")?.value||0), hmm=+($("#height")?.value||0);
    const ok=(wmm>=lim.wMin*10 && wmm<=lim.wMax*10 && hmm>=lim.hMin*10 && hmm<=lim.hMax*10);
    const err=$("#sizeError"); err && (err.style.display = ok ? "none" : "block");
    return ok;
  }

  function calc(){
    if(!sizeValid()){
      ["totSystem","totColor","totGlass","totGrand"].forEach(id=>{ const el=document.getElementById(id); if(el) el.innerHTML="0&nbsp;€"; });
      const per=$("#perUnitNote"); per && (per.textContent="— por unidade"); return;
    }
    const s=state(); const colors=getCfg().colors, energy=getCfg().energy, st=getCfg().stores;

    const w_m = (s.w||0)/1000;
    const h_m = (s.h||0)/1000;

    const areaFactor = Math.max(getCfg().minAreaFactor, (w_m)*(h_m));
    const baseAreaPrice = s.model.price * areaFactor;

    const sysAdd=(s.isStores ? 0 : (s.system?.addEUR||0));
    const colorAdd=(s.isStores ? 0 : (colors[s.colorKey]?.addEUR||0));
    let extras = 0;
    if (s.isStores){
      extras += (st.motor[s.storeSel.motorKey]?.addEUR || 0);
      extras += (st.lamella[s.storeSel.lamellaKey]?.addEUR || 0);
      extras += (st.box[s.storeSel.boxKey]?.addEUR || 0);
      extras += (st.control[s.storeSel.controlKey]?.addEUR || 0);
      extras += (st.guides[s.storeSel.guidesKey]?.addEUR || 0);
      extras += (st.install[s.storeSel.installKey]?.addEUR || 0);
      extras += (st.accessory[s.storeSel.accKey]?.addEUR || 0);
    }else{
      extras += (energy[s.energyKey]?.addEUR || 0);
    }

    const discountPct = +($("#discountCurrent")?.value||0);
    const perUnitGross = baseAreaPrice + sysAdd + colorAdd + extras;
    const perUnit = perUnitGross * (1 - (Math.max(0, Math.min(100, discountPct)) / 100));
    const total   = perUnit * s.qty;

    const set = (id,val)=>{ const el=document.getElementById(id); if(el) el.textContent = fmt(val); };
    set("totSystem", (baseAreaPrice + sysAdd) * s.qty);
    set("totColor",  colorAdd * s.qty);
    set("totGlass",  extras * s.qty);
    set("totGrand",  total);

    const per = $("#perUnitNote");
    if (per){
      per.textContent = s.isStores
        ? `${fmt(perUnit)} por unidade · área× ${areaFactor.toFixed(3)} · +Extras ${fmt(extras)}${discountPct?` · -${discountPct}%`:''}`
        : `${fmt(perUnit)} por unidade · área× ${areaFactor.toFixed(3)} · +Perfil ${fmt(sysAdd)} · +Acabamento ${fmt(colorAdd)} · +Eficiência ${fmt(extras)}${discountPct?` · -${discountPct}%`:''}`;
    }
    return {areaFactor, baseAreaPrice, sysAdd, colorAdd, extras, perUnit, total, perUnitGross};
  }

  window.PRICING = { setup, state, updateSummary, calc };
})();
