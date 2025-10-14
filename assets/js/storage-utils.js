// storage-utils.js (expondo um namespace global UTILS)
(function (w) {
  // ---------- helpers internos ----------
  const isDataUrl = (u)=> typeof u==='string' && u.startsWith('data:image/');
  const approxBytes = (s)=> 2 * (s?.length || 0);

  function showToast(msg, ms=2200){
    let t = document.getElementById('app_toast');
    if(!t){
      t = document.createElement('div'); t.id='app_toast';
      t.style.cssText = 'position:fixed;left:50%;bottom:22px;transform:translateX(-50%);background:#111827;color:#fff;padding:10px 14px;border-radius:10px;box-shadow:0 8px 30px rgba(0,0,0,.25);font:600 13px/1.2 Inter,system-ui,Arial;z-index:99999;opacity:0;transition:opacity .2s';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    requestAnimationFrame(()=>{ t.style.opacity='1'; });
    clearTimeout(t._tm); t._tm = setTimeout(()=> t.style.opacity='0', ms);
  }

  function loadImage(src){ return new Promise((res,rej)=>{ const i=new Image(); i.onload=()=>res(i); i.onerror=rej; i.src=src; }); }

  async function compressDataUrlToTarget(dataUrl, {
    targetBytes = 220*1024,
    maxW = 900, maxH = 700,
    qualityStart = 0.84,
    minQuality = 0.58,
    step = 0.07
  } = {}){
    try{
      const img = await loadImage(dataUrl);
      let w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;

      let sc = Math.min(maxW / w, maxH / h, 1);
      let cw = Math.max(1, Math.round(w*sc));
      let ch = Math.max(1, Math.round(h*sc));

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      const exportWith = (q)=>{
        canvas.width = cw; canvas.height = ch;
        ctx.clearRect(0,0,cw,ch);
        ctx.drawImage(img, 0, 0, cw, ch);
        return canvas.toDataURL('image/jpeg', q);
      };

      let q = qualityStart;
      let out = exportWith(q);
      let tries = 0;

      while (approxBytes(out) > targetBytes && q > minQuality && tries < 10){
        q = Math.max(minQuality, q - step);
        out = exportWith(q);
        tries++;
      }

      let scalePass = 0;
      while (approxBytes(out) > targetBytes && scalePass < 4){
        cw = Math.max(120, Math.round(cw * 0.85));
        ch = Math.max(90,  Math.round(ch * 0.85));
        q  = Math.max(minQuality, q - step/2);
        out = exportWith(q);
        scalePass++;
      }
      return out;
    }catch{
      return dataUrl;
    }
  }

  function listAllImageRefs(cfg){
    const refs = [];
    Object.entries(cfg.systems||{}).forEach(([k,sys])=>{
      refs.push({ where:`systems.${k}`, get:()=>sys.img, set:(v)=>{ sys.img=v; } });
    });
    (cfg.tabs||[]).forEach((t,ti)=>{
      (t.models||[]).forEach((m,mi)=>{
        refs.push({ where:`tabs[${ti}].models[${mi}]`, get:()=>m.img, set:(v)=>{ m.img=v; } });
      });
    });
    return refs;
  }

  async function safeSaveConfig(storageKey, cfg){
    try{
      localStorage.setItem(storageKey, JSON.stringify(cfg));
      return {ok:true, stripped:0, recompressed:0};
    }catch(_){}

    const refs = listAllImageRefs(cfg).filter(r => isDataUrl(r.get()));
    refs.forEach(r => r.bytes = approxBytes(r.get()));
    refs.sort((a,b)=> b.bytes - a.bytes);

    let recompressed = 0;
    const batches = [3, 3, 10];
    let idx = 0;

    for (const n of batches){
      const slice = refs.slice(idx, idx+n);
      for (const r of slice){
        const before = r.get();
        const after  = await compressDataUrlToTarget(before, {targetBytes: 180*1024, maxW: 820, maxH: 620, qualityStart:0.8});
        if (approxBytes(after) < approxBytes(before)){ r.set(after); recompressed++; }
      }
      idx += n;
      try{
        localStorage.setItem(storageKey, JSON.stringify(cfg));
        return {ok:true, stripped:0, recompressed};
      }catch(_){}
    }

    let stripped = 0;
    for (const r of refs){
      if (approxBytes(r.get()) > 220*1024){ r.set(""); stripped++; }
    }
    try{
      localStorage.setItem(storageKey, JSON.stringify(cfg));
      return {ok:true, stripped, recompressed};
    }catch(err){
      return {ok:false, err, stripped, recompressed};
    }
  }

  // ---------- API servidor ----------
  async function fetchServerState(){
    try{
      const resp = await fetch("/api/state-get.php", { credentials: "include" });
      if (!resp.ok) return { ok:false, error:`HTTP ${resp.status}` };
      const json = await resp.json();
      if (!json.ok) return { ok:false, error: json.error || "state_get_failed" };
      return { ok:true, state: json.state, updated_ts: json.updated_ts || null };
    }catch(e){
      return { ok:false, error: e?.message || "network_error" };
    }
  }

  async function saveServerState(payload){
    try{
      const resp = await fetch("/api/state-save.php", {
        method:"POST",
        credentials:"include",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify(payload)
      });
      if (!resp.ok) return { ok:false, error:`HTTP ${resp.status}` };
      const json = await resp.json();
      if (!json.ok) return { ok:false, error: json.error || "state_save_failed" };
      return { ok:true };
    }catch(e){
      return { ok:false, error: e?.message || "network_error" };
    }
  }

  function debounce(fn, ms=600){
    let t;
    return (...args)=>{ clearTimeout(t); t=setTimeout(()=>fn(...args), ms); };
  }

  // Upload genérico (usado por logo e pelo editor de preços)
  async function uploadToServer(file){
    try{
      const fd = new FormData();
      fd.append("file", file);
      const resp = await fetch("/api/upload.php", { method:"POST", body: fd, credentials:"include" });
      if (!resp.ok) return { ok:false, error:`HTTP ${resp.status}` };
      const json = await resp.json();
      if (!json.ok || !json.url) return { ok:false, error: json.error || "Upload falhou" };
      return { ok:true, url: json.url };
    }catch(e){
      return { ok:false, error: e?.message || "Erro de rede" };
    }
  }

  function safeSetItem(key, value, {onPrune, STORAGE_KEY}={}){
    try { localStorage.setItem(key, value); return true; }
    catch(e){
      console.warn("localStorage quota issue on", key, e);
      if (key===STORAGE_KEY){
        try{
          const cfg = JSON.parse(value);
          let pruned = false;
          for (const k in (cfg.systems||{})){
            if (typeof cfg.systems[k].img === "string" && cfg.systems[k].img.startsWith("data:")){
              cfg.systems[k].img = ""; pruned = true;
            }
          }
          (cfg.tabs||[]).forEach(t=>{
            (t.models||[]).forEach(m=>{
              if (typeof m.img === "string" && m.img.startsWith("data:")){ m.img=""; pruned = true; }
            });
          });
          const s = JSON.stringify(cfg);
          localStorage.setItem(key, s);
          onPrune && onPrune();
          if (pruned) alert("Imagens eram demasiado grandes e foram removidas. Use URLs ou ficheiros menores.");
          return true;
        }catch(e2){
          alert("Sem espaço no navegador para guardar alterações. Use imagens mais pequenas ou URLs.");
          return false;
        }
      } else {
        alert("Sem espaço no navegador para guardar dados. Tente reduzir imagens.");
        return false;
      }
    }
  }

  function escapeHtml(s){ return String(s).replace(/[&<>"]/g, c=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;" }[c])); }

  // ---------- export ----------
  w.UTILS = {
    // básicos
    showToast, isDataUrl, approxBytes, loadImage, escapeHtml,
    // compressão/armazenamento local
    compressDataUrlToTarget, listAllImageRefs, safeSaveConfig, safeSetItem,
    // servidor
    fetchServerState, saveServerState, debounce, uploadToServer
  };
})(window);
// storage-utils.js (expondo um namespace global UTILS)
(function (w) {
  // ---------- helpers internos ----------
  const isDataUrl = (u)=> typeof u==='string' && u.startsWith('data:image/');
  const approxBytes = (s)=> 2 * (s?.length || 0);

  function showToast(msg, ms=2200){
    let t = document.getElementById('app_toast');
    if(!t){
      t = document.createElement('div'); t.id='app_toast';
      t.style.cssText = 'position:fixed;left:50%;bottom:22px;transform:translateX(-50%);background:#111827;color:#fff;padding:10px 14px;border-radius:10px;box-shadow:0 8px 30px rgba(0,0,0,.25);font:600 13px/1.2 Inter,system-ui,Arial;z-index:99999;opacity:0;transition:opacity .2s';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    requestAnimationFrame(()=>{ t.style.opacity='1'; });
    clearTimeout(t._tm); t._tm = setTimeout(()=> t.style.opacity='0', ms);
  }

  function loadImage(src){ return new Promise((res,rej)=>{ const i=new Image(); i.onload=()=>res(i); i.onerror=rej; i.src=src; }); }

  async function compressDataUrlToTarget(dataUrl, {
    targetBytes = 220*1024,
    maxW = 900, maxH = 700,
    qualityStart = 0.84,
    minQuality = 0.58,
    step = 0.07
  } = {}){
    try{
      const img = await loadImage(dataUrl);
      let w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;

      let sc = Math.min(maxW / w, maxH / h, 1);
      let cw = Math.max(1, Math.round(w*sc));
      let ch = Math.max(1, Math.round(h*sc));

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      const exportWith = (q)=>{
        canvas.width = cw; canvas.height = ch;
        ctx.clearRect(0,0,cw,ch);
        ctx.drawImage(img, 0, 0, cw, ch);
        return canvas.toDataURL('image/jpeg', q);
      };

      let q = qualityStart;
      let out = exportWith(q);
      let tries = 0;

      while (approxBytes(out) > targetBytes && q > minQuality && tries < 10){
        q = Math.max(minQuality, q - step);
        out = exportWith(q);
        tries++;
      }

      let scalePass = 0;
      while (approxBytes(out) > targetBytes && scalePass < 4){
        cw = Math.max(120, Math.round(cw * 0.85));
        ch = Math.max(90,  Math.round(ch * 0.85));
        q  = Math.max(minQuality, q - step/2);
        out = exportWith(q);
        scalePass++;
      }
      return out;
    }catch{
      return dataUrl;
    }
  }

  function listAllImageRefs(cfg){
    const refs = [];
    Object.entries(cfg.systems||{}).forEach(([k,sys])=>{
      refs.push({ where:`systems.${k}`, get:()=>sys.img, set:(v)=>{ sys.img=v; } });
    });
    (cfg.tabs||[]).forEach((t,ti)=>{
      (t.models||[]).forEach((m,mi)=>{
        refs.push({ where:`tabs[${ti}].models[${mi}]`, get:()=>m.img, set:(v)=>{ m.img=v; } });
      });
    });
    return refs;
  }

  async function safeSaveConfig(storageKey, cfg){
    try{
      localStorage.setItem(storageKey, JSON.stringify(cfg));
      return {ok:true, stripped:0, recompressed:0};
    }catch(_){}

    const refs = listAllImageRefs(cfg).filter(r => isDataUrl(r.get()));
    refs.forEach(r => r.bytes = approxBytes(r.get()));
    refs.sort((a,b)=> b.bytes - a.bytes);

    let recompressed = 0;
    const batches = [3, 3, 10];
    let idx = 0;

    for (const n of batches){
      const slice = refs.slice(idx, idx+n);
      for (const r of slice){
        const before = r.get();
        const after  = await compressDataUrlToTarget(before, {targetBytes: 180*1024, maxW: 820, maxH: 620, qualityStart:0.8});
        if (approxBytes(after) < approxBytes(before)){ r.set(after); recompressed++; }
      }
      idx += n;
      try{
        localStorage.setItem(storageKey, JSON.stringify(cfg));
        return {ok:true, stripped:0, recompressed};
      }catch(_){}
    }

    let stripped = 0;
    for (const r of refs){
      if (approxBytes(r.get()) > 220*1024){ r.set(""); stripped++; }
    }
    try{
      localStorage.setItem(storageKey, JSON.stringify(cfg));
      return {ok:true, stripped, recompressed};
    }catch(err){
      return {ok:false, err, stripped, recompressed};
    }
  }

  // ---------- API servidor ----------
  async function fetchServerState(){
    try{
      const resp = await fetch("/api/state-get.php", { credentials: "include" });
      if (!resp.ok) return { ok:false, error:`HTTP ${resp.status}` };
      const json = await resp.json();
      if (!json.ok) return { ok:false, error: json.error || "state_get_failed" };
      return { ok:true, state: json.state, updated_ts: json.updated_ts || null };
    }catch(e){
      return { ok:false, error: e?.message || "network_error" };
    }
  }

  async function saveServerState(payload){
    try{
      const resp = await fetch("/api/state-save.php", {
        method:"POST",
        credentials:"include",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify(payload)
      });
      if (!resp.ok) return { ok:false, error:`HTTP ${resp.status}` };
      const json = await resp.json();
      if (!json.ok) return { ok:false, error: json.error || "state_save_failed" };
      return { ok:true };
    }catch(e){
      return { ok:false, error: e?.message || "network_error" };
    }
  }

  function debounce(fn, ms=600){
    let t;
    return (...args)=>{ clearTimeout(t); t=setTimeout(()=>fn(...args), ms); };
  }

  // Upload genérico (usado por logo e pelo editor de preços)
  async function uploadToServer(file){
    try{
      const fd = new FormData();
      fd.append("file", file);
      const resp = await fetch("/api/upload.php", { method:"POST", body: fd, credentials:"include" });
      if (!resp.ok) return { ok:false, error:`HTTP ${resp.status}` };
      const json = await resp.json();
      if (!json.ok || !json.url) return { ok:false, error: json.error || "Upload falhou" };
      return { ok:true, url: json.url };
    }catch(e){
      return { ok:false, error: e?.message || "Erro de rede" };
    }
  }

  function safeSetItem(key, value, {onPrune, STORAGE_KEY}={}){
    try { localStorage.setItem(key, value); return true; }
    catch(e){
      console.warn("localStorage quota issue on", key, e);
      if (key===STORAGE_KEY){
        try{
          const cfg = JSON.parse(value);
          let pruned = false;
          for (const k in (cfg.systems||{})){
            if (typeof cfg.systems[k].img === "string" && cfg.systems[k].img.startsWith("data:")){
              cfg.systems[k].img = ""; pruned = true;
            }
          }
          (cfg.tabs||[]).forEach(t=>{
            (t.models||[]).forEach(m=>{
              if (typeof m.img === "string" && m.img.startsWith("data:")){ m.img=""; pruned = true; }
            });
          });
          const s = JSON.stringify(cfg);
          localStorage.setItem(key, s);
          onPrune && onPrune();
          if (pruned) alert("Imagens eram demasiado grandes e foram removidas. Use URLs ou ficheiros menores.");
          return true;
        }catch(e2){
          alert("Sem espaço no navegador para guardar alterações. Use imagens mais pequenas ou URLs.");
          return false;
        }
      } else {
        alert("Sem espaço no navegador para guardar dados. Tente reduzir imagens.");
        return false;
      }
    }
  }

  function escapeHtml(s){ return String(s).replace(/[&<>"]/g, c=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;" }[c])); }

  // ---------- export ----------
  w.UTILS = {
    // básicos
    showToast, isDataUrl, approxBytes, loadImage, escapeHtml,
    // compressão/armazenamento local
    compressDataUrlToTarget, listAllImageRefs, safeSaveConfig, safeSetItem,
    // servidor
    fetchServerState, saveServerState, debounce, uploadToServer
  };
  
  
// GARANTIR QUE NÃO SE PERDE NADA AO EXPORTAR
if (!w.UTILS) w.UTILS = {};

// anexa/atualiza todas as funções num único objeto
Object.assign(w.UTILS, {
  // básicos
  showToast, isDataUrl, approxBytes, loadImage, escapeHtml,

  // compressão/armazenamento local
  compressDataUrlToTarget, listAllImageRefs, safeSaveConfig, safeSetItem,

  // API servidor
  fetchServerState, saveServerState, debounce, uploadToServer
});


})(window);