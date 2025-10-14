// assets/js/vat-controls.js — controla IVA distinto para janelas e montagem
(function(){
  const fmt = new Intl.NumberFormat('pt-PT',{style:'currency',currency:'EUR'});
  const $ = (sel)=>document.querySelector(sel);

  const elSub  = $('#cartSubtotal');
  const elInst = $('#cartInstall');
  const elVW   = $('#vatWindowsInput');
  const elVA   = $('#vatAssemblyInput');
  const elIVW  = $('#cartVatValWindows');
  const elIVA  = $('#cartVatValAssembly');
  const elIVT  = $('#cartVatVal');
  const elTOT  = $('#cartTotal');

  if (!elSub || !elInst || !elVW || !elVA) return;

  function parseMoney(el){
    const t = (el.textContent||'').replace(/[^0-9,.-]/g,'').replace(/\./g,'').replace(',','.');
    const n = parseFloat(t);
    return isFinite(n) ? n : 0;
  }
  function round2(n){ return Math.round(n*100)/100; }

  function recalc(){
    const subtotal = parseMoney(elSub);   // janelas
    const install  = parseMoney(elInst);  // montagem
    const vw = Math.min(100, Math.max(0, parseFloat(elVW.value||'23'))) / 100;
    const va = Math.min(100, Math.max(0, parseFloat(elVA.value||'23'))) / 100;

    const ivaW = round2(subtotal * vw);
    const ivaA = round2(install  * va);
    const ivaT = round2(ivaW + ivaA);
    const total= round2(subtotal + install + ivaT);

    elIVW.textContent = fmt.format(ivaW);
    elIVA.textContent = fmt.format(ivaA);
    elIVT.textContent = fmt.format(ivaT);
    elTOT.textContent = fmt.format(total);

    // Guardar no RUNTIME e tentar persistir (se a app tiver saveState parcial)
    window.RUNTIME = window.RUNTIME || {};
    window.RUNTIME.tax = { vatWindows: vw*100, vatAssembly: va*100 };
    if (typeof window.saveState === 'function') {
      try { window.saveState({ tax: window.RUNTIME.tax }, { partial: true }); } catch(e){}
    }
  }

  elVW.addEventListener('input', recalc);
  elVA.addEventListener('input', recalc);

  // Inicializar com valores do estado (se existirem)
  function initFromState(){
    const t = (window.RUNTIME && window.RUNTIME.tax) || null;
    if (t) {
      if (t.vatWindows != null)  elVW.value = String(t.vatWindows).replace(',', '.');
      if (t.vatAssembly != null) elVA.value = String(t.vatAssembly).replace(',', '.');
    }
    recalc();
  }

  if (document.readyState === 'complete') initFromState();
  else window.addEventListener('load', initFromState);
})();
