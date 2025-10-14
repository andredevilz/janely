// pdf.js — módulo isolado para gerar o PDF do orçamento
// expõe window.PDF.setup(...) e window.PDF.generate()

(function (global) {
  "use strict";

  // dependências injetadas a partir de app.js
  let DEPS = {
    RUNTIME: null,
    fmt: (n)=>String(n),
    toNumber: (v)=> +v || 0,
    VAT_RATE: 0.23,
    ensureItem: null,   // função: adiciona o item atual se ainda não há itens
    sizeValid: null     // função: valida medidas atuais
  };

  // ===== API pública =====
  function setup(deps) {
    DEPS = { ...DEPS, ...(deps || {}) };
  }

  async function generate() {
    const { RUNTIME, fmt, toNumber, VAT_RATE, ensureItem, sizeValid } = DEPS;

    const jsPDFCtor = global.jspdf?.jsPDF || global.jsPDF;
    if (!jsPDFCtor) { alert("Biblioteca jsPDF não carregou."); return; }

    // Se não há itens, tenta adicionar o item atual (opcional)
    if (!RUNTIME.items?.length) {
      if (typeof sizeValid === "function" && !sizeValid()) {
        alert("As dimensões estão fora do intervalo."); return;
      }
      if (typeof ensureItem === "function") ensureItem();
    }
    if (!RUNTIME.items?.length) { alert("Sem itens para exportar."); return; }

    // Pré-carregar imagens (miniaturas e maiores)
    const thumbs = await preloadItemThumbnails(RUNTIME.items);
    const bigImgs = await preloadItemImages(RUNTIME.items, 260, 190);

    const doc = new jsPDFCtor({ unit:"pt", format:"a4" });
    const margin = 36;
    const pageW = doc.internal.pageSize.getWidth();
    const rightX = pageW - margin;
    let y = margin;

    // Cabeçalho (logo + dados da empresa)
    let logoDrawnH = 0;
    if (RUNTIME.company.logoDataUrl) {
      try {
        const MAX_W = 120, MAX_H = 60;
        const dim = await measureImage(RUNTIME.company.logoDataUrl);
        const sc = Math.min(MAX_W/dim.w, MAX_H/dim.h, 1);
        const w = Math.round(dim.w*sc), h = Math.round(dim.h*sc);
        doc.addImage(RUNTIME.company.logoDataUrl, inferImgFormat(), margin, y, w, h);
        logoDrawnH = h;
      } catch(_) {}
    }
    const lines = [];
    if (RUNTIME.company.name)    lines.push({txt:RUNTIME.company.name, bold:true, size:14});
    if (RUNTIME.company.address) lines.push({txt:RUNTIME.company.address});
    if (RUNTIME.company.nif)     lines.push({txt:`NIF: ${RUNTIME.company.nif}`});
    if (RUNTIME.company.email)   lines.push({txt:`Email: ${RUNTIME.company.email}`});
    if (RUNTIME.company.phone)   lines.push({txt:`Tel: ${RUNTIME.company.phone}`});
    if (RUNTIME.company.iban)    lines.push({txt:`IBAN: ${RUNTIME.company.iban}`});
    let lineY = y + 14;
    lines.forEach(ln => {
      if (ln.bold){ doc.setFont('helvetica','bold'); doc.setFontSize(ln.size||12); }
      else { doc.setFont('helvetica','normal'); doc.setFontSize(10); }
      doc.text(ln.txt, rightX, lineY, {align:'right'}); lineY += ln.bold ? 18 : 12;
    });
    const headerHeight = Math.max(logoDrawnH, (lines.length ? (lineY - y) : 0));
    y += headerHeight + 24;

    // Título + meta
    doc.setFont('helvetica','bold'); doc.setFontSize(22); doc.text("ORÇAMENTO", margin, y);
    doc.setFont('helvetica','normal'); doc.setFontSize(10);
    const meta = [
      ["N.º orçamento", RUNTIME.proposal.quoteNo || "—"],
      ["Data", RUNTIME.proposal.quoteDate || formatDateInputToday()],
      ["Validade", RUNTIME.proposal.quoteValidUntil || "—"],
      ["Início previsto", RUNTIME.proposal.startDate || "—"]
    ];
    meta.forEach((row,i)=> doc.text(`${row[0]}: ${row[1]}`, rightX, y-12 + i*14, {align:'right'}));
    y += 28;

    // Cliente / Obra
    doc.setFont('helvetica','bold'); doc.setFontSize(12); doc.text("Dados do cliente/obra", margin, y);
    y += 10; doc.setFont('helvetica','normal'); doc.setFontSize(10);
    [
      `Cliente: ${RUNTIME.proposal.clientName || "—"}`,
      `Local da obra: ${RUNTIME.proposal.siteLocation || "—"}`
    ].forEach((line,i)=> doc.text(line, margin, y + i*14));
    y += 28 + 12;

    // Tabela de itens
    const autoTable = (doc.autoTable || global.jspdf?.autoTable);
    doc.setFont('helvetica','bold'); doc.setFontSize(12); doc.text("Itens do orçamento", margin, y); y += 8;

    const head = [["Foto","Descrição","Qnt.","Preço/un.","Total"]];
    const body = RUNTIME.items.map(it => {
      const baseLeft = it.isStores
        ? `${it.modelTitle} — ${it.tabLabel}\n${it.w}×${it.h} mm`
        : `${it.modelTitle} — ${it.tabLabel}\nPerfil: ${it.systemLabel}${it.systemAddEUR?` (+${fmt(it.systemAddEUR)})`:""} • ${it.w}×${it.h} mm • ${it.colorLabel} • ${it.energyLabel}`;

      const extrasLine = it.isStores
        ? `Componentes: Base (área) ${fmt(it.parts.baseAreaPrice)} · Extras ${fmt(it.parts.extras||0)}`
        : `Componentes: Base (área) ${fmt(it.parts.baseAreaPrice)} · Perfil ${fmt(it.parts.sysAdd)} · Acabamento ${fmt(it.parts.colorAdd)} · Eficiência ${fmt(it.parts.extras||0)}`;

      const tech = it.isStores ? renderStoreTechText(it, RUNTIME) : renderTechText(it.tech);

      const d = Math.max(0, Math.min(100, it.discountPct||0));
      const perUnitAfter = (it.perUnit||0) * (1 - d/100);

      const priceCell = d
        ? `${fmt(perUnitAfter)}\n(${d}% desc.; antes: ${fmt(it.perUnit||0)})`
        : fmt(it.perUnit||0);
      const totalCell = d
        ? `${fmt(perUnitAfter * it.qty)}\n(antes: ${fmt((it.perUnit||0)*it.qty)})`
        : fmt((it.perUnit||0)*it.qty);

      const full = [baseLeft, tech, extrasLine, (it.extraDesc||"")].filter(Boolean).join("\n");
      return ["", full, String(it.qty), priceCell, totalCell];
    });

    autoTable?.call(doc, {
      startY: y+6,
      margin: { left: margin, right: margin },
      styles: { fontSize: 9, cellPadding: 6, lineColor: [215,221,229], lineWidth: 0.6, valign:'middle' },
      headStyles: { fillColor: [243,246,249], textColor:[55,65,81] },
      columnStyles: { 0:{cellWidth: 58, halign:'center'}, 2:{halign:'right', cellWidth:30}, 3:{halign:'right', cellWidth:80}, 4:{halign:'right', cellWidth:90} },
      head, body,
      didDrawCell: (data) => {
        if (data.section === 'body' && data.column.index === 0) {
          const idx = data.row.index;
          const id  = RUNTIME.items[idx]?.id;
          const th  = thumbs[id];
          if (th && th.dataURL){
            const cx = data.cell.x + (data.cell.width - th.w) / 2;
            const cy = data.cell.y + (data.cell.height - th.h) / 2;
            doc.addImage(th.dataURL, inferImgFormat(), cx, cy, th.w, th.h);
          }
        }
      }
    });
    y = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 16 : y + 120;

    // Totais (com descontos e montagem)
    const subtotalItems = RUNTIME.items.reduce((sum,it)=>{
      const d = Math.max(0, Math.min(100, it.discountPct||0));
      const perUnitAfter = (it.perUnit||0) * (1 - d/100);
      return sum + perUnitAfter * (it.qty||1);
    }, 0);
const installTotal  = toNumber(RUNTIME.proposal.installTotal || 0);
const vatItemsPct   = toNumber(RUNTIME.proposal.vatItemsPct ?? 23);
const vatInstallPct = toNumber(RUNTIME.proposal.vatInstallPct ?? 23);

const ivaItems   = subtotalItems * (vatItemsPct / 100);
const ivaInstall = installTotal  * (vatInstallPct / 100);

const subtotal   = subtotalItems + installTotal;
const totalCIVA  = subtotal + ivaItems + ivaInstall;

    doc.setFont('helvetica','bold'); doc.setFontSize(12); doc.text("Totais", margin, y);
    autoTable?.call(doc, {
      startY: y+8,
      margin: { left: margin, right: margin },
      styles: { fontSize: 10, cellPadding: 6 },
      bodyStyles: { halign: 'right' },
      columnStyles: { 0:{halign:'left'} },
      body: [
  ["Subtotal (itens)", fmt(subtotalItems)],
  ["Montagem",         fmt(installTotal)],
  ["IVA janelas (" + Math.round(vatItemsPct) + "%)",   fmt(ivaItems)],
  ["IVA montagem (" + Math.round(vatInstallPct) + "%)", fmt(ivaInstall)],
  ["TOTAL",            fmt(totalCIVA)]
]
    });
    y = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 10 : y + 60;

    // Desenhos (imagens grandes)
    doc.setFont('helvetica','bold'); doc.setFontSize(12);
    if (y + 40 > doc.internal.pageSize.getHeight()) { doc.addPage(); y = margin; }
    doc.text("Desenhos dos vãos", margin, y); y += 12;

    const boxW = 280, boxH = 210, gap = 12;
    let col = 0;
    for (const it of RUNTIME.items){
      const im = bigImgs[it.id];
      const pageH = doc.internal.pageSize.getHeight();
      if (y + boxH + 40 > pageH){ doc.addPage(); y = margin; doc.text("Desenhos dos vãos", margin, y); y += 22; col = 0; }
      const x = margin + (col * (boxW + gap));
      doc.setDrawColor(215,221,229); doc.setLineWidth(0.8); doc.rect(x, y, boxW, boxH);
      if (im && im.dataURL){
        const imgX = x + (boxW - im.w)/2;
        const imgY = y + 12 + (boxH - 50 - im.h)/2;
        doc.addImage(im.dataURL, inferImgFormat(), imgX, imgY, im.w, im.h);
      } else {
        doc.setFont('helvetica','italic'); doc.setFontSize(10);
        doc.text("Sem imagem para este modelo", x + boxW/2, y + boxH/2, {align:'center'});
      }
      doc.setFont('helvetica','normal'); doc.setFontSize(10);
      const caption = it.isStores
        ? [it.modelTitle, `${it.w}×${it.h} mm`]
        : [it.modelTitle, `Perfil: ${it.systemLabel} • ${it.w}×${it.h} mm`, [it.colorLabel, it.energyLabel].filter(Boolean).join(" • ")];
      let cy = y + boxH - 28;
      caption.forEach(line=>{ doc.text(line, x + boxW/2, cy, {align:'center'}); cy += 12; });
      col++; if (col>1){ col=0; y += boxH + gap; }
    }
    if (col===1) y += boxH + gap; y += 6;

    // Condições
    sectionText(doc, "Condições de pagamento", RUNTIME.proposal.payTerms || "—", margin, y);
    y = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 6 : y+30;
    sectionText(doc, "Condições para realizar a obra", RUNTIME.proposal.workTerms || "—", margin, y);
    y = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 6 : y+30;
    sectionText(doc, "Notas e observações", RUNTIME.proposal.notes || "—", margin, y);

    // Rodapé
    const pageH = doc.internal.pageSize.getHeight();
    const bits = [];
    if (RUNTIME.company.name)  bits.push(RUNTIME.company.name);
    if (RUNTIME.company.email) bits.push(RUNTIME.company.email);
    if (RUNTIME.company.phone) bits.push(RUNTIME.company.phone);
    if (RUNTIME.company.iban)  bits.push(`IBAN ${RUNTIME.company.iban}`);
    const footer = bits.join(" • ");
    doc.setDrawColor(215,221,229); doc.line(margin, pageH-50, pageW-margin, pageH-50);
    doc.setFontSize(9); footer && doc.text(footer, margin, pageH-34);

    const filename = `Orcamento_${(RUNTIME.proposal.quoteNo || 'sem-numero').replace(/[^a-zA-Z0-9_-]+/g,'_')}.pdf`;
    doc.save(filename);
  }

  // ===== Helpers privados deste módulo =====
  const IMG_PROXY = "/img-proxy.php?u=";

  function inferImgFormat(){ return 'PNG'; }

  function formatDateInputToday(){
    const d = new Date(); const mm = String(d.getMonth()+1).padStart(2,'0'); const dd = String(d.getDate()).padStart(2,'0');
    return `${d.getFullYear()}-${mm}-${dd}`;
  }

  function sectionText(doc, title, text, x, startY){
    const autoTable = (doc.autoTable || global.jspdf?.autoTable);
    doc.setFont('helvetica','bold'); doc.setFontSize(12); doc.text(title, x, startY);
    doc.setFont('helvetica','normal'); doc.setFontSize(10);
    autoTable?.call(doc, {
      startY:startY+6, margin:{left:x, right:36}, tableWidth:520,
      styles:{fontSize:10, cellPadding:6}, theme:'plain', body:[[text]]
    });
  }

  function renderTechText(tech){
    if (!tech) return "";
    const lines = [];
    if (tech.profile) lines.push(`Sistema/Perfil: ${tech.profile}`);
    const ferr = [tech.hwBrand, tech.hwColor].filter(Boolean).join(" / ");
    if (ferr) lines.push(`Ferragens: ${ferr}`);
    const comp = [tech.gl1, (tech.spacer?`${tech.spacer} mm`:null), tech.spacerCol, tech.gl2].filter(Boolean).join(" + ");
    const glassLine = comp ? `Vidro: ${comp}${tech.gas?` (${tech.gas})`:''}${tech.ug?` • Ug ${Number(tech.ug).toFixed(2)}`:''}` : "";
    if (glassLine) lines.push(glassLine);
    const perf = []; if (tech.uw) perf.push(`Uw ${Number(tech.uw).toFixed(2)} W/m²K`); if (tech.rw) perf.push(`Rw ${Math.round(tech.rw)} dB`); if (tech.ce) perf.push("CE EN 14351-1");
    if (perf.length) lines.push(`Desempenho: ${perf.join(" • ")}`);
    if (tech.refs) lines.push(`Referências: ${tech.refs}`);
    return lines.join("\n");
  }

  function renderStoreTechText(it, RUNTIME){
    const st = (RUNTIME.config || {}).stores || {};
    const s = it.storeSel || {};
    const arr=[];
    if (s.motorKey)   arr.push(`Motorização: ${st.motor?.[s.motorKey]?.label||s.motorKey}`);
    if (s.lamellaKey) arr.push(`Lâmina: ${st.lamella?.[s.lamellaKey]?.label||s.lamellaKey}`);
    if (s.boxKey)     arr.push(`Caixa: ${st.box?.[s.boxKey]?.label||s.boxKey}`);
    if (s.controlKey) arr.push(`Comando: ${st.control?.[s.controlKey]?.label||s.controlKey}`);
    if (s.guidesKey)  arr.push(`Guias: ${st.guides?.[s.guidesKey]?.label||s.guidesKey}`);
    if (s.installKey) arr.push(`Montagem: ${st.install?.[s.installKey]?.label||s.installKey}`);
    if (s.accKey)     arr.push(`Acessório: ${st.accessory?.[s.accKey]?.label||s.accKey}`);
    return arr.join("\n");
  }

  async function measureImage(src){
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = src;
    await new Promise((res, rej)=>{ img.onload=res; img.onerror=rej; });
    return { w: img.naturalWidth || img.width, h: img.naturalHeight || img.height };
  }

  async function preloadItemThumbnails(items){
    const out = {}, MAX_W=54, MAX_H=40;
    for (const it of items){
      if (!it.modelImg) continue;
      const dataURL = await fetchImageAsPngDataURL(it.modelImg);
      if (!dataURL) continue;
      try {
        const dim = await measureImage(dataURL);
        const sc = Math.min(MAX_W/dim.w, MAX_H/dim.h, 1);
        out[it.id] = { dataURL, w:Math.round(dim.w*sc), h:Math.round(dim.h*sc) };
      } catch {}
    }
    return out;
  }

  async function preloadItemImages(items, maxW=260, maxH=190){
    const out = {};
    for (const it of items){
      if (!it.modelImg) continue;
      const dataURL = await fetchImageAsPngDataURL(it.modelImg);
      if (!dataURL) continue;
      try {
        const dim = await measureImage(dataURL);
        const sc = Math.min(maxW/dim.w, maxH/dim.h, 1);
        out[it.id] = { dataURL, w:Math.round(dim.w*sc), h:Math.round(dim.h*sc) };
      } catch {}
    }
    return out;
  }

  function absoluteUrl(u){
    if (!u) return "";
    if (u.startsWith("http://") || u.startsWith("https://") || u.startsWith("data:")) return u;
    if (u.startsWith("/")) return `${location.origin}${u}`;
    const a = document.createElement('a'); a.href = u;
    return a.href.startsWith('http') ? a.href : `${location.origin}/${u.replace(/^\.?\//,'')}`;
  }

  function proxyUrl(u){ return `${IMG_PROXY}${encodeURIComponent(u)}`; }

  async function fetchImageAsPngDataURL(url){
    if (!url) return null;
    if (url.startsWith("data:")) return url;
    const abs = absoluteUrl(url);
    const isHttp = abs.startsWith("http://") || abs.startsWith("https://");
    const sameOrigin = isHttp && abs.startsWith(location.origin);
    try{
      const fetchUrl = (isHttp && !sameOrigin) ? proxyUrl(abs) : abs;
      const res = await fetch(fetchUrl, {cache:'force-cache'});
      if(!res.ok) throw new Error("HTTP "+res.status);
      const blob = await res.blob();
      return await blobToPngDataURL(blob);
    }catch(e){ console.warn("Falha imagem:", url, e); return null; }
  }

  function blobToPngDataURL(blob){
    return new Promise((resolve)=>{
      const img = new Image();
      const url = URL.createObjectURL(blob);
      img.onload = ()=>{
        try{
          const canvas = document.createElement("canvas");
          const w = img.naturalWidth||img.width, h=img.naturalHeight||img.height;
          canvas.width = Math.max(1, w); canvas.height = Math.max(1, h);
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img,0,0);
          const png = canvas.toDataURL("image/png");
          URL.revokeObjectURL(url);
          resolve(png);
        }catch(_){ URL.revokeObjectURL(url); resolve(null); }
      };
      img.onerror = ()=>{ URL.revokeObjectURL(url); resolve(null); };
      img.src = url;
    });
  }

  // expor API
  global.PDF = { setup, generate };

})(window);
