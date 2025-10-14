<?php
// ==== Proteção por sessão (redirige para /pvc_demo/login.php se não estiver autenticado)
require __DIR__.'/api/_session.php';
require_login_page(); // _session.php já faz session_start com os parâmetros certos
?>
<!doctype html>
<html lang="pt-PT">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Calculadora de janelas</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/assets/css/styles.css?v=<?= date('H.i.s') ?>">
  


  <style>
    .cart-table{width:100%;border-collapse:collapse}
    .cart-table th,.cart-table td{padding:10px;border-bottom:1px solid var(--border);font-size:14px;vertical-align:top}
    .cart-actions{display:flex;gap:8px;align-items:center}
    .qty-input{width:80px;padding:8px;border:1px solid var(--border-2);border-radius:8px}
    .muted-small{color:var(--muted);font-size:12px}
    .btn.danger{background:#ef4444;color:#fff;border-color:#dc2626}
    .desc-edit{width:100%;min-height:64px;padding:8px;border:1px solid var(--border-2);border-radius:8px;font-size:13px}
    .submitbar .btn.primary.big{font-size:16px;font-weight:800;padding:16px 18px}
    .sum-title{display:flex;justify-content:space-between;align-items:center;gap:12px}
    .sum-sub{color:var(--muted);font-weight:600}
    @media (min-width:981px){ .app > .card:last-child{ position:sticky; top:12px; height:fit-content; } }
    .logo-preview img{max-width:180px;max-height:90px;object-fit:contain;border:1px solid var(--border-2);border-radius:8px;background:#fff;padding:6px}
    .upload-cell{display:flex; gap:8px; align-items:center}
    .thumb{width:46px;height:34px;object-fit:contain;border:1px solid var(--border-2);border-radius:6px;background:#fff}
    .filebtn{white-space:nowrap}
  </style>
</head>
<body>
  <!-- Barra topo: quem está logado + logout -->
  <div style="position:fixed;right:14px;top:12px;display:flex;gap:10px;align-items:center;z-index:10">
    <span style="font:600 13px Inter,system-ui,Arial;color:#475569">
      <?php echo htmlspecialchars($_SESSION['email'] ?? 'Sessão iniciada'); ?>
    </span>
    <form action="/pvc_demo/api/logout.php" method="post" style="margin:0">
      <button class="btn" style="padding:6px 10px;font-size:12px">Terminar sessão</button>
    </form>
  </div>

  <div class="titlebar"><h1>Calculadora de janelas de alumínio com rutura térmica</h1></div>

  <div class="wrap">
    <!-- TABS -->
    <div class="tabsbar"><div class="tabs" id="tabs"></div></div>

    <div class="app">
      <!-- ESQUERDA -->
      <div class="card">
        <div class="hd">
          <h2 id="catTitle">Janelas 1 folha</h2>
          <div class="hd-actions">
            <button class="btn" id="editPricesBtn">Editar preços</button>
          </div>
        </div>

        <div class="section">
          <!-- Tipo -->
          <h3>Selecione o tipo de janela <span style="color:#b42318">*</span></h3>
          <p class="note">Escolha o tipo de janela que pretende</p>
          <div id="modelsGrid" class="grid"></div>

          <!-- Sistema -->
          <div style="margin-top:18px">
            <h3>Selecionar sistema <span style="color:#b42318">*</span></h3>
            <p class="note">Escolha o perfil para a sua janela</p>
            <div id="systemsGrid" class="grid"></div>
          </div>

          <!-- Limites -->
          <div id="limitsHint" class="hint" style="margin-top:14px">Os limites de medida serão mostrados aqui…</div>

          <!-- Medidas & Qnt -->
          <div class="cols" style="margin-top:12px">
            <div>
              <div class="field">
                <label>Largura da janela (cm) <span style="color:#b42318">*</span></label>
                <input type="number" id="width" value="100">
              </div>
              <div class="field">
                <label>Altura da janela (cm) <span style="color:#b42318">*</span></label>
                <input type="number" id="height" value="100">
              </div>
              <div id="sizeError" class="error">As dimensões estão fora do intervalo para esta categoria.</div>
            </div>
            <div>
              <div class="field">
                <label>Número de janelas</label>
                <input type="number" id="qty" value="1" min="1" max="100">
              </div>
              <div class="field">
                <label>Cor da janela</label>
                <select id="color"></select>
              </div>
              <div class="field">
                <label>Eficiência energética</label>
                <select id="energy"></select>
              </div>
            </div>
          </div>

          <!-- ESPECIFICAÇÕES TÉCNICAS -->
       <div class="msec" id="specsBlock" style="margin-top:14px">
  <label style="display:flex;align-items:center;gap:8px;margin:8px 0;">
    <input type="checkbox" id="specsEnabled">
    <span>Ativar especificações técnicas</span>
  </label>
  <div id="specsInner">

            <h3>Especificações técnicas</h3>
            <div class="cols">
              <div>
                <div class="field">
                  <label>Sistema/Perfil (marca e série)</label>
                  <input list="dl_systemProfiles" id="tech_profile" placeholder="Ex.: SCHÜCO AWS 65">
                  <datalist id="dl_systemProfiles"></datalist>
                </div>
                <div class="field">
                  <label>Ferragens — marca</label>
                  <select id="tech_hw_brand"></select>
                </div>
                <div class="field">
                  <label>Ferragens — cor</label>
                  <select id="tech_hw_color"></select>
                </div>
                <div class="field">
                  <label>Referências (perfis/componentes)</label>
                  <textarea id="tech_refs" rows="3" placeholder="Ex.: Aro Fixo HO9020; Travessa HO9320; Bite GP1280"></textarea>
                </div>
              </div>
              <div>
                <div class="field">
                  <label>Vidro — 1.º vidro</label>
                  <select id="tech_gl1"></select>
                </div>
                <div class="field">
                  <label>Vidro — Espaçador Warm Edge</label>
                  <div style="display:flex; gap:8px">
                    <select id="tech_spacer"></select>
                    <select id="tech_sp_color"></select>
                  </div>
                </div>
                <div class="field">
                  <label>Vidro — 2.º vidro</label>
                  <select id="tech_gl2"></select>
                </div>
                <div class="field">
                  <label>Gás no vão</label>
                  <select id="tech_gas"></select>
                </div>
                <div class="cols" style="gap:12px">
                  <div class="field"><label>Ug (W/m²K)</label><input type="number" id="tech_ug" step="0.01" min="0.1" value="1.1"></div>
                  <div class="field"><label>Uw (W/m²K)</label><input type="number" id="tech_uw" step="0.01" min="0.6" value="1.3"></div>
                  <div class="field"><label>Rw (dB)</label><input type="number" id="tech_rw" step="1" min="25" value="34"></div>
                </div>
                <div class="field">
                  <label><input type="checkbox" id="tech_ce" checked> Conformidade CE (EN 14351-1)</label>
                </div>
              </div>
            </div>
            <p class="note">Estas escolhas são informativas (não alteram o preço) e acompanham cada item (incluídas no PDF).</p>
          </div>
 </div>
          <!-- Notas -->
          <div class="field" style="margin-top:10px">
            <label>Descrição extra (opcional)</label>
            <textarea id="descExtra" rows="3" placeholder="Ex.: RAL 7016 texturada; ferragens de segurança; colocação incluída."></textarea>
          </div>

          <p class="note" style="margin-top:6px">
            O preço base é por 1&nbsp;m² (100×100&nbsp;cm). O valor escala com a área. Aplica-se um mínimo de 0,80× para janelas muito pequenas.
          </p>
        </div>

        <div class="footer">
          <button class="btn" id="resetBtn">Limpar</button>
          <button class="btn" id="calcBtn">Atualizar totais</button>
        </div>
      </div>

      <!-- DIREITA -->
      <div class="card">
        <div class="sum-hd">
          <div class="sum-title">
            <h3>Configuração atual</h3>
            <div class="sum-sub" id="sumTab">Janelas 1 folha</div>
          </div>
        </div>
        <div class="sumbody">
          <table class="table">
            <thead><tr><th style="width:65%">Nome</th><th>Total</th></tr></thead>
            <tbody>
              <tr><td><strong>Tipo de janela</strong><div id="sumType" class="muted">—</div></td><td id="sumTypePrice">0&nbsp;€</td></tr>
              <tr><td><strong>Sistema selecionado</strong></td><td id="sumSystemName">—</td></tr>
              <tr><td><strong>Largura (cm)</strong></td><td id="sumW">100&nbsp;cm</td></tr>
              <tr><td><strong>Altura (cm)</strong></td><td id="sumH">100&nbsp;cm</td></tr>
              <tr><td><strong>Cor</strong></td><td id="sumColor">—</td></tr>
              <tr><td><strong>Eficiência energética</strong></td><td id="sumEnergy">—</td></tr>
              <tr><td><strong>N.º de janelas</strong></td><td id="sumQty">1&nbsp;un.</td></tr>
              <tr><td><strong>Especificações técnicas</strong><div id="sumTech" class="muted"></div></td><td></td></tr>
            </tbody>
          </table>
        </div>
        <div class="tfooter">
          <div class="rowline"><span>Total sistema</span><span id="totSystem">0&nbsp;€</span></div>
          <div class="rowline"><span>Total cor</span><span id="totColor">0&nbsp;€</span></div>
          <div class="rowline"><span>Total vidro/técnica</span><span id="totGlass">0&nbsp;€</span></div>
          <div class="rowline total"><span>TOTAL (linha)</span><span id="totGrand">0&nbsp;€</span></div>
          <small class="muted" id="perUnitNote">— por unidade</small>
        </div>
        <div class="submitbar"><button id="addItemBtnRight" class="btn primary big">Adicionar ao orçamento</button></div>
      </div>
    </div>

    <!-- Itens do orçamento -->
    <div class="card" style="margin-top:18px" id="orcamento">

      <div class="hd"><h2>Itens do orçamento</h2></div>
      <div class="section">
        <table class="cart-table" id="cartTable">
          <thead>
            <tr>
              <th style="width:44%">Descrição</th>
              <th>Qnt.</th>
              <th>Preço/un.</th>
              <th>Total</th>
              <th></th>
            </tr>
          </thead>
          <tbody id="cartBody"><tr><td colspan="5" class="muted-small">Ainda não adicionou itens. Configure à esquerda e clique “Adicionar ao orçamento”.</td></tr></tbody>
        </table>
      </div>
      <div class="tfooter">
        <div class="rowline"><span>Subtotal</span><span id="cartSubtotal">0&nbsp;€</span></div>
        <div class="rowline"><span>Montagem</span><span id="cartInstall">0&nbsp;€</span></div>
    <div class="rowline">
  <span>IVA janelas <span id="cartVatItemsPct">(23%)</span></span>
  <span id="cartVatItemsVal">0&nbsp;€</span>
</div>
<div class="rowline">
  <span>IVA montagem <span id="cartVatInstallPct">(23%)</span></span>
  <span id="cartVatInstallVal">0&nbsp;€</span>
</div>

        <div class="rowline total"><span>TOTAL ORÇAMENTO</span><span id="cartTotal">0&nbsp;€</span></div>
      </div>
      <div class="footer">
        <button class="btn primary" id="pdfBtn">Gerar Orçamento</button>
      </div>
    </div>

    <!-- Dados para orçamento -->
    <div class="card" style="margin-top:18px">
      <div class="hd"><h2>Dados para orçamento</h2></div>
      <div class="section">
        <div class="cols cols-3">
          <div>
            <h3>Empresa</h3>
            <div class="field">
              <label>Logotipo (PNG/JPG)</label>
              <input type="file" id="coLogo" accept="image/*">
              <div class="logo-preview"><img id="coLogoPreview" alt="Pré-visualização do logotipo"></div>
            </div>
            <div class="field"><label>Nome da empresa</label><input type="text" id="coName" placeholder="Ex.: ELIKA Lda."></div>
            <div class="field"><label>Morada</label><input type="text" id="coAddress" placeholder="Rua, nº, CP, Localidade"></div>
            <div class="field"><label>Email</label><input type="email" id="coEmail" placeholder="geral@empresa.pt"></div>
            <div class="field"><label>NIF</label><input type="text" id="coNIF" placeholder="PT123456789"></div>
            <div class="field"><label>Telefone</label><input type="text" id="coPhone" placeholder="+351 ..."></div>
            <div class="field"><label>IBAN</label><input type="text" id="coIBAN" placeholder="PT50 0002 0123 1234 5678 9015 4"></div>
          </div>

          <div>
            <h3>Proposta</h3>
            <div class="field"><label>Nome do cliente</label><input type="text" id="clientName"></div>
            <div class="field"><label>Local da obra</label><input type="text" id="siteLocation"></div>
            <div class="field"><label>N.º do orçamento</label><input type="text" id="quoteNo" placeholder="2025-001"></div>
            <div class="field"><label>Data do orçamento</label><input type="date" id="quoteDate"></div>
            <div class="field"><label>Validade do orçamento</label><input type="date" id="quoteValidUntil"></div>
            <div class="field"><label>Início previsto</label><input type="date" id="startDate"></div>
            <div class="field">
  <label>% IVA nas janelas</label>
  <input type="number" id="vatItemsPct" min="0" max="100" step="0.1" value="23">
</div>

<div class="field">
  <label>% IVA na montagem</label>
  <input type="number" id="vatInstallPct" min="0" max="100" step="0.1" value="23">
</div>


          </div>

          <div>
            <h3>Condições</h3>
            <div class="field"><label>Condições de pagamento</label><textarea id="payTerms" rows="4"></textarea></div>
            <div class="field"><label>Condições para realizar a obra</label><textarea id="workTerms" rows="4"></textarea></div>
            <div class="field"><label>Notas e observações</label><textarea id="notes" rows="4"></textarea></div>
          </div>
        </div>
        <p class="note">As imagens carregadas ficam guardadas no servidor (por utilizador) e entram no PDF.</p>
      </div>
      <div class="footer">
        <button class="btn" id="exportPdfBtn">Exportar PDF</button>
      </div>
    </div>
  </div>

  <!-- Modal (editor de preços) -->
  <div class="modal-backdrop" id="priceModalBackdrop" aria-hidden="true">
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="priceEditorTitle">
      <div class="mhd">
        <h3 id="priceEditorTitle">Editor de preços</h3>
        <button class="btn" id="closeModalBtn" aria-label="Fechar">Fechar</button>
      </div>
      <div class="mbody" id="modalBody"></div>
      <div class="mft">
        <div class="left"><button class="btn danger" id="resetPricingBtn" title="Repor valores de fábrica">Repor</button></div>
        <div class="right">
          <button class="btn" id="cancelModalBtn">Cancelar</button>
          <button class="btn primary" id="savePricingBtn">Guardar</button>
        </div>
      </div>
    </div>
  </div>

  <!-- libs PDF -->
  <script src="https://unpkg.com/jspdf@2.5.1/dist/jspdf.umd.min.js"></script>
  <script src="https://unpkg.com/jspdf-autotable@3.8.4/dist/jspdf.plugin.autotable.min.js"></script>

  <!-- PDF module -->
  <script src="/assets/js/pdf.js?v=1"></script>

  <!-- app -->
  <script src="/assets/js/storage-utils.js?v=<?= date('H.i.s') ?>"></script>
  <script src="/assets/js/config.js?v=<?= date('H.i.s') ?>"></script>
  <script src="/assets/js/pricing.js?v=<?= date('H.i.s') ?>"></script>
  <script src="/assets/js/app.js?v=<?= date('H.i.s') ?>"></script>
  <script src="/assets/js/price-editor.js?v=<?= date('H.i.s') ?>"></script>
          <div id="toast" aria-live="polite" aria-atomic="true"></div>

</body>
</html>
