// assets/js/specs.js — toggle + free-text para especificações técnicas
(function(){
  const $ = (sel)=>document.querySelector(sel);
  const enabled = $('#specsEnabled');
  const fields  = $('#specsFields');
  const ferr    = $('#specFerragens');
  const cor     = $('#specCor');
  const vidro   = $('#specVidro');

  if (!enabled || !fields) return;

  function save(){
    // Limpeza básica (trim e normalização de quebra de linha)
    const val = {
      enabled: !!enabled.checked,
      ferragens: (ferr?.value || '').trim(),
      cor: (cor?.value || '').trim(),
      vidro: (vidro?.value || '').trim()
    };
    // Guardar no runtime
    window.RUNTIME = window.RUNTIME || {};
    window.RUNTIME.specs = val;
    // Persistir no backend (merge parcial) se existir saveState
    if (typeof window.saveState === 'function') {
      try { window.saveState({ specs: val }, { partial: true }); } catch(e){}
    }
  }

  function updateVisibility(){
    fields.style.display = enabled.checked ? 'grid' : 'none';
  }

  // Eventos
  enabled.addEventListener('change', ()=>{ updateVisibility(); save(); });
  [ferr, cor, vidro].forEach(el => el && el.addEventListener('input', save));

  // Bootstrap com estado anterior
  function initFromState(){
    const s = (window.RUNTIME && window.RUNTIME.specs) || null;
    if (s) {
      enabled.checked = !!s.enabled;
      if (ferr && s.ferragens != null) ferr.value = s.ferragens;
      if (cor && s.cor != null)       cor.value   = s.cor;
      if (vidro && s.vidro != null)   vidro.value = s.vidro;
    }
    updateVisibility();
  }

  if (document.readyState === 'complete') initFromState();
  else window.addEventListener('load', initFromState);
})();
