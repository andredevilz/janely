(function(){
  const ns = {};
  const $ = (q,ctx=document)=>ctx.querySelector(q);
  const $$= (q,ctx=document)=>Array.from(ctx.querySelectorAll(q));

  // refs do "mundo exterior" (injeção via setup)
  let getCfg, setCfg, DEFAULT_CONFIG, STORAGE_KEY, toNumber, showToast, safeSetItem, safeSaveConfig, escapeHtml;

  // cache do DOM
  let backdrop, modalBody;

  // ===== API pública =====
  ns.setup = function(opts){
    ({
      getCfg, setCfg, DEFAULT_CONFIG, STORAGE_KEY,
      toNumber, showToast, safeSetItem, safeSaveConfig, escapeHtml
    } = opts);

    backdrop  = document.getElementById("priceModalBackdrop");
    modalBody = document.getElementById("modalBody");

    // botões abrir/fechar
    on("editPricesBtn","click", ()=>{ buildPriceEditor(); showModal(true); });
    on("closeModalBtn","click", closeModal);
    on("cancelModalBtn","click", closeModal);
    document.addEventListener("keydown",(e)=>{ if(e.key==="Escape") closeModal(); });

    injectModalCSS();
    wireDelegates();
    ensureClosed();
  };
  
  
  

  // ===== UI =====
  function showModal(v){ if(!backdrop) return; backdrop.classList.toggle("show",!!v); backdrop.style.display=v?"flex":"none"; backdrop.setAttribute("aria-hidden", v?"false":"true"); }
  function closeModal(){ showModal(false); }
  function ensureClosed(){ if(!backdrop) return; backdrop.classList.remove("show"); backdrop.style.display="none"; backdrop.setAttribute("aria-hidden","true"); }

  function injectModalCSS(){
    const style = document.createElement("style");
    style.textContent = `
      .table-like .iconbtn{padding:6px 10px;border:1px solid var(--border-2);border-radius:8px;background:#fff;cursor:pointer;font-weight:700}
      .table-like input[type="text"], .table-like input[type="number"]{width:100%;padding:8px;border:1px solid var(--border-2);border-radius:8px}
      .row-actions{display:flex;gap:8px;align-items:center}
      .muted{color:#667085;font-size:12px}
      .upload-cell{display:flex;gap:8px;align-items:center}
      .thumb{width:46px;height:34px;object-fit:contain;border:1px solid var(--border-2);border-radius:6px;background:#fff}
      .filebtn{white-space:nowrap}
    `;
    document.head.appendChild(style);
  }

  function buildPriceEditor(){
    if (!modalBody) return;
    const c = getCfg();

    const sysRows = Object.entries(c.systems).map(([k,o])=>`
      <tr data-sys-row="${k}">
        <td><input type="text" value="${escapeHtml(o.label||k)}" data-sys-field="label" placeholder="Nome do perfil"></td>
        <td><input type="number" step="1" value="${o.addEUR||0}" data-sys-field="add" placeholder="€ adicional"></td>
        <td>
          <div class="upload-cell">
            <img class="thumb" data-preview="sys_${k}" src="${escapeHtml(o.img||"")}" alt="">
            <input type="text" placeholder="URL" value="${escapeHtml(o.img||"")}" id="sys_${k}" data-sys-field="img">
            <label class="btn filebtn"><input type="file" accept="image/*" hidden data-upload-target="sys_${k}"> Upload</label>
            <button class="iconbtn" data-action="clear-img" data-target="sys_${k}">Limpar</button>
          </div>
        </td>
        <td class="row-actions"><button class="iconbtn" data-action="del-sys" data-key="${k}">Remover</button></td>
      </tr>`).join("");

    const colorRows = Object.entries(c.colors).map(([k,o])=>`
      <tr data-color-row="${k}">
        <td><input type="text" value="${escapeHtml(o.label||k)}" data-color-field="label" placeholder="Nome do acabamento"></td>
        <td><input type="number" step="1" value="${o.addEUR||0}" data-color-field="add" placeholder="€ adicional"></td>
        <td class="row-actions"><button class="iconbtn" data-action="del-color" data-key="${k}">Remover</button></td>
      </tr>`).join("");

    const energyRows = Object.entries(c.energy).map(([k,o])=>`
      <tr data-energy-row="${k}">
        <td><input type="text" value="${escapeHtml(o.label||k)}" data-energy-field="label" placeholder="Texto da opção"></td>
        <td><input type="number" step="1" value="${o.addEUR||0}" data-energy-field="add" placeholder="€ adicional"></td>
        <td class="row-actions"><button class="iconbtn" data-action="del-energy" data-key="${k}">Remover</button></td>
      </tr>`).join("");

    const tabsHtml = c.tabs.map((t,ti)=>`
      <div class="card" style="margin-top:12px" data-tab-block="${ti}">
        <div class="hd">
          <h3>${escapeHtml(t.label)}</h3>
          <div class="hd-actions"><button type="button" class="btn" data-action="add-model" data-tab="${ti}">+ Modelo</button></div>
        </div>
        <div class="section">
          <table class="cart-table">
            <thead><tr><th style="width:26%">Modelo</th><th style="width:14%">Preço base (1 m²)</th><th style="width:54%">Imagem</th><th></th></tr></thead>
            <tbody>
              ${(t.models||[]).map((m,mi)=>`
                <tr data-model-row data-tab="${ti}" data-model="${mi}">
                  <td><input type="text" value="${escapeHtml(m.title||"")}" data-model-field="title" placeholder="Nome do modelo"></td>
                  <td><input type="number" step="1" value="${m.price||0}" data-model-field="price" placeholder="Preço base"></td>
                  <td>
                    <div class="upload-cell">
                      <img class="thumb" data-preview="tab${ti}_m${mi}" src="${escapeHtml(m.img||"")}" alt="">
                      <input type="text" value="${escapeHtml(m.img||"")}" placeholder="https:// ou /assets/..." id="tab${ti}_m${mi}" data-model-field="img">
                      <label class="btn filebtn"><input type="file" accept="image/*" hidden data-upload-target="tab${ti}_m${mi}"> Upload</label>
                      <button class="iconbtn" data-action="clear-img" data-target="tab${ti}_m${mi}">Limpar</button>
                    </div>
                  </td>
                  <td class="row-actions"><button class="iconbtn" data-action="del-model" data-tab="${ti}" data-model="${mi}">Remover</button></td>
                </tr>
              `).join("")}
            </tbody>
          </table>
          <p class="muted">Podes usar Upload (guarda URL público) ou colar um URL. Evita imagens enormes.</p>
        </div>
      </div>
    `).join("");

    modalBody.innerHTML = `
      <div class="card">
        <div class="hd">
          <h3>Perfis (séries)</h3>
          <div class="hd-actions"><button type="button" class="btn" data-action="add-sys">+ Perfil</button></div>
        </div>
        <div class="section">
          <table class="table-like" style="width:100%">
            <thead><tr><th>Perfil (texto)</th><th>Adicional (€)</th><th>Imagem</th><th></th></tr></thead>
            <tbody>${sysRows || `<tr><td colspan="4" class="muted">Sem perfis. Clica “+ Perfil”.</td></tr>`}</tbody>
          </table>
        </div>
      </div>

      <div class="card" style="margin-top:12px">
        <div class="hd">
          <h3>Acabamentos (cores)</h3>
          <div class="hd-actions"><button class="btn" data-action="add-color">+ Acabamento</button></div>
        </div>
        <div class="section">
          <table class="table-like" style="width:100%">
            <thead><tr><th>Acabamento (texto)</th><th>Adicional (€)</th><th></th></tr></thead>
            <tbody>${colorRows || `<tr><td colspan="3" class="muted">Sem acabamentos. Clica “+ Acabamento”.</td></tr>`}</tbody>
          </table>
        </div>
      </div>

      <div class="card" style="margin-top:12px">
        <div class="hd">
          <h3>Eficiência energética</h3>
          <div class="hd-actions"><button class="btn" data-action="add-energy">+ Opção</button></div>
        </div>
        <div class="section">
          <table class="table-like" style="width:100%">
            <thead><tr><th>Opção (texto)</th><th>Adicional (€)</th><th></th></tr></thead>
            <tbody>${energyRows || `<tr><td colspan="3" class="muted">Sem opções. Clica “+ Opção”.</td></tr>`}</tbody>
          </table>
        </div>
      </div>

      ${tabsHtml}

      <div class="mft" style="margin-top:12px; display:flex; justify-content:space-between">
        <button class="btn danger" id="resetPricingBtn">Repor</button>
        <div>
          <button class="btn" id="cancelModalBtn">Cancelar</button>
          <button class="btn primary" id="savePricingBtn">Guardar</button>
        </div>
      </div>
    `;
  }

  // ===== Guardar =====
  async function savePricing(){
    if (!modalBody) return { ok:false, error:"Modal não encontrado" };
    const config = getCfg();

    // Perfis
    modalBody.querySelectorAll("[data-sys-row]").forEach(row=>{
      const key   = row.getAttribute("data-sys-row");
      const label = row.querySelector('[data-sys-field="label"]')?.value ?? "";
      const add   = toNumber(row.querySelector('[data-sys-field="add"]')?.value ?? 0);
      const img   = row.querySelector('[data-sys-field="img"]')?.value ?? "";
      config.systems[key] ||= {};
      Object.assign(config.systems[key], {label, addEUR:add, img});
    });

    // Acabamentos
    modalBody.querySelectorAll("[data-color-row]").forEach(row=>{
      const key   = row.getAttribute("data-color-row");
      const label = row.querySelector('[data-color-field="label"]')?.value ?? "";
      const add   = toNumber(row.querySelector('[data-color-field="add"]')?.value ?? 0);
      config.colors[key] ||= {};
      Object.assign(config.colors[key], {label, addEUR:add});
    });

    // Eficiência
    modalBody.querySelectorAll("[data-energy-row]").forEach(row=>{
      const key   = row.getAttribute("data-energy-row");
      const label = row.querySelector('[data-energy-field="label"]')?.value ?? "";
      const add   = toNumber(row.querySelector('[data-energy-field="add"]')?.value ?? 0);
      config.energy[key] ||= {};
      Object.assign(config.energy[key], {label, addEUR:add});
    });

    // Modelos por aba
    modalBody.querySelectorAll("[data-tab-block]").forEach(block=>{
      const ti = parseInt(block.getAttribute("data-tab-block"),10);
      const rows = block.querySelectorAll("[data-model-row]");
      config.tabs[ti].models = Array.from(rows).map(row=>{
        const title = row.querySelector('[data-model-field="title"]')?.value ?? "";
        const price = toNumber(row.querySelector('[data-model-field="price"]')?.value ?? 0);
        const img   = row.querySelector('[data-model-field="img"]')?.value ?? "";
        return { title, price, img };
      });
    });

    // Persiste
    const res = await safeSaveConfig(STORAGE_KEY, config);
    setCfg(config);
    
    return res;
  }

  // ===== Delegates (CRUD + upload + limpar + guardar/reset) =====
  function wireDelegates(){
    // Upload -> envia ao teu upload.php e mete URL no input + preview
    modalBody?.addEventListener("change", async (e)=>{
      const fi = e.target.closest('input[type="file"][data-upload-target]');
      if (!fi) return;
      const targetId = fi.getAttribute("data-upload-target");
      const urlInput = modalBody.querySelector(`#${CSS.escape(targetId)}`);
      const preview  = modalBody.querySelector(`[data-preview="${CSS.escape(targetId)}"]`);
      const file = fi.files?.[0]; if (!file) return;

      try {
        const fd = new FormData(); fd.append("file", file); // PHP espera "file"
const res = await fetch("/api/upload.php", { method:"POST", body: fd, credentials:"include" });
const json = await res.json().catch(()=> ({}));
        if (!res.ok || !json.ok || !json.url) throw new Error(json.error || `HTTP ${res.status}`);
        if (urlInput){ urlInput.value = json.url; urlInput.dispatchEvent(new Event("input",{bubbles:true})); }
        if (preview){ preview.src = json.url; }
        showToast("Imagem enviada ✔");
      } catch (err) {
        alert("Falha no upload: " + (err?.message || "erro"));
      }
    });

    // Limpar imagem
    modalBody?.addEventListener("click",(e)=>{
      const btn = e.target.closest("[data-action='clear-img']");
      if (!btn) return;
      const target = btn.getAttribute("data-target");
      const input  = modalBody.querySelector('#'+CSS.escape(target));
      const img    = modalBody.querySelector(`[data-preview="${CSS.escape(target)}"]`);
      if (input){ input.value = ""; input.dispatchEvent(new Event("input",{bubbles:true})); }
      if (img){ img.src = ""; }
    });

    // Ações CRUD
    document.addEventListener("click",(e)=>{
      const btn = e.target.closest("[data-action]");
      if (!btn || !btn.closest("#priceModalBackdrop")) return;

      const c = getCfg();
      const act = btn.getAttribute("data-action");

      if (act === "add-sys"){
        const id = Math.random().toString(36).slice(2,9);
        c.systems[id] = { label:"Novo perfil", addEUR:0, img:"" };
        buildPriceEditor(); return;
      }
      if (act === "del-sys"){
        const key = btn.getAttribute("data-key");
        if (key && c.systems[key]) delete c.systems[key];
        buildPriceEditor(); return;
      }
      if (act === "add-color"){
        const id = Math.random().toString(36).slice(2,9);
        c.colors[id] = { label:"Novo acabamento", addEUR:0 };
        buildPriceEditor(); return;
      }
      if (act === "del-color"){
        const key = btn.getAttribute("data-key");
        if (key && c.colors[key]) delete c.colors[key];
        buildPriceEditor(); return;
      }
      if (act === "add-energy"){
        const id = Math.random().toString(36).slice(2,9);
        c.energy[id] = { label:"Nova opção", addEUR:0 };
        buildPriceEditor(); return;
      }
      if (act === "del-energy"){
        const key = btn.getAttribute("data-key");
        if (key && c.energy[key]) delete c.energy[key];
        buildPriceEditor(); return;
      }
      if (act === "add-model"){
        const ti = parseInt(btn.getAttribute("data-tab"),10);
        if (!Number.isNaN(ti) && c.tabs[ti]) c.tabs[ti].models.push({ title:"Novo modelo", price:0, img:"" });
        buildPriceEditor(); return;
      }
      if (act === "del-model"){
        const ti = parseInt(btn.getAttribute("data-tab"),10);
        const mi = parseInt(btn.getAttribute("data-model"),10);
        if (!Number.isNaN(ti) && !Number.isNaN(mi) && c.tabs[ti]?.models[mi]){
          c.tabs[ti].models.splice(mi,1);
        }
        buildPriceEditor(); return;
      }
    }, true);

    // Repor & Guardar
    on("resetPricingBtn","click", ()=>{
      if (!confirm("Repor valores de fábrica? Esta ação substitui todos os preços e opções.")) return;
      const copy = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
      safeSetItem(STORAGE_KEY, JSON.stringify(copy));
      setCfg(copy);
      buildPriceEditor();
      showToast("Valores repostos ✔");
    });

    on("savePricingBtn","click", async ()=>{
      const res = await savePricing();
      if (res?.ok){
        if (res.stripped>0) alert("Algumas imagens eram demasiado grandes e foram removidas.\nUse URLs ou ficheiros mais pequenos.");
        else if (res.recompressed>0) showToast(`Guardado (imagens otimizadas: ${res.recompressed}) ✔`);
        else showToast("Guardado ✔");
        closeModal();
      } else {
        alert("Erro a guardar (quota do navegador). Remova imagens grandes ou use URLs.");
      }
    });
  }

  function on(id, ev, fn){ const el = document.getElementById(id); if (el) el.addEventListener(ev, fn); return el; }

  // expõe
  window.PriceEditor = ns;
})();
