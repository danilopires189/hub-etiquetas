/* ===== Helpers & Base ===== */
const $ = (sel) => document.querySelector(sel);
const pad = (n, len) => (Array(len + 1).join('0') + String(n)).slice(-len);
const onlyDigits = (s) => String(s || '').replace(/\D+/g, '');

/* ===== Validação de Matrícula ===== */
function validarMatricula(matricula) {
  // Tratar valores null, undefined e converter para string
  const mat = matricula != null ? String(matricula).trim() : '';

  // Verificar se está vazio ou contém apenas espaços
  if (!mat || mat.length === 0) {
    return {
      valida: false,
      erro: 'Matrícula é obrigatória. Por favor, informe sua matrícula.'
    };
  }

  // Se chegou até aqui, a matrícula é válida
  return {
    valida: true
  };
}

function exibirErroMatricula(mensagem) {
  alert('Erro: ' + mensagem);
  const campoMatricula = $('#matricula');
  if (campoMatricula) {
    campoMatricula.focus();
    campoMatricula.select(); // Selecionar texto para facilitar correção
  }
}

/* ===== Estado Global do Histórico Termolábeis ===== */
let termoGenerationHistory = JSON.parse(localStorage.getItem('termo-etiquetas-history') || '[]');

// Limpar duplicatas do histórico existente na inicialização
function cleanDuplicateTermoHistory() {
  const uniqueHistory = [];
  const seen = new Set();

  // Ordenar por timestamp (mais recente primeiro)
  const sortedHistory = [...termoGenerationHistory].sort((a, b) =>
    new Date(b.timestamp || 0) - new Date(a.timestamp || 0)
  );

  for (const item of sortedHistory) {
    // Criar chave única mais específica
    const key = `${item.etiquetaId}-${item.pedido}-${item.loja}-${item.rota}`;

    if (!seen.has(key)) {
      seen.add(key);
      // Garantir que o item tem ID único
      if (!item.id) {
        item.id = Date.now() + Math.random();
      }
      uniqueHistory.push(item);
    }
  }

  // Se houve mudanças, atualizar
  if (uniqueHistory.length !== termoGenerationHistory.length) {
    termoGenerationHistory = uniqueHistory.slice(0, 500); // Manter apenas os 500 mais recentes
    try {
      localStorage.setItem('termo-etiquetas-history', JSON.stringify(termoGenerationHistory));
      console.log(`Histórico termo limpo: ${sortedHistory.length - uniqueHistory.length} duplicatas removidas`);
    } catch (e) {
      console.warn('Erro ao salvar histórico termo limpo:', e.message);
    }
  }
}

// Limpeza automática por idade (90 dias)
function cleanOldTermoRecords() {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 90);

  const cleaned = termoGenerationHistory.filter(item => {
    const itemDate = new Date(item.timestamp);
    return itemDate >= cutoffDate;
  });

  if (cleaned.length !== termoGenerationHistory.length) {
    console.log(`Removidos ${termoGenerationHistory.length - cleaned.length} registros antigos do histórico termo`);
    termoGenerationHistory = cleaned;
    try {
      localStorage.setItem('termo-etiquetas-history', JSON.stringify(termoGenerationHistory));
    } catch (e) {
      console.warn('Erro ao salvar histórico termo após limpeza:', e.message);
    }
  }
}

// Exibição como inteiro (sem zeros à esquerda), com fallback
const toIntStr = (v, fallback = 0) => {
  const d = onlyDigits(v);
  return d ? String(Number(d)) : String(Number(fallback));
};

// Fallback embutido (injetado no index.html)
let BASE = window.BASE_EMBED || { cds: [], lojas: {}, rotas: {} };

async function loadBase() {
  try {
    // Tentar usar dados do arquivo .js carregado
    if (window.DB_LOJAS && window.DB_LOJAS.BASE_LOJAS) {
      BASE = window.DB_LOJAS.BASE_LOJAS;
      console.log('✓ Dados carregados de BASE_LOJAS.js');
    } else {
      console.warn('BASE_LOJAS.js não carregado, usando fallback embutido.');
    }
  } catch (e) {
    console.warn('Erro ao carregar base, usando embutida:', e.message);
  }
  fillCDList();
}

function fillCDList() {
  const dc = document.getElementById('listCD');
  if (!dc) return;
  const cds = (BASE.cds || []).slice().sort((a, b) => Number(a) - Number(b));
  dc.innerHTML = cds.map(cd => `<option value="${cd}"></option>`).join('');
}

function setVars() {
  document.documentElement.style.setProperty('--label-w-mm', $('#wmm').value || 92.5);
  document.documentElement.style.setProperty('--label-h-mm', $('#hmm').value || 50);
}

function leap(y) { return (y % 4 === 0 && y % 100 !== 0) || (y % 400 === 0); }

function pedidoToDateStr(pedido7) {
  const s = onlyDigits(pedido7);
  if (s.length !== 7) return null;
  const ano = Number(s.slice(0, 4));
  const ddd = Number(s.slice(4, 7));
  const maxDDD = leap(ano) ? 366 : 365;
  if (ano < 2024 || ano > (new Date()).getFullYear()) return null;
  if (ddd < 1 || ddd > maxDDD) return null;
  const d = new Date(ano, 0, 1);
  d.setDate(ddd);
  const dd = pad(d.getDate(), 2);
  const mm = pad(d.getMonth() + 1, 2);
  return `${dd}/${mm}/${ano}`;
}

function parseId(id) {
  const s = onlyDigits(id);
  if (s.length !== 23) throw new Error('ID deve ter 23 dígitos.');
  const ano = Number(s.slice(1, 5));
  if (ano < 2024 || ano > (new Date()).getFullYear()) throw new Error('Ano do pedido inválido no ID.');
  return {
    cd: s.slice(0, 1),
    pedido: s.slice(1, 8),
    seq: s.slice(8, 11),
    loja: s.slice(11, 15),
    rota: s.slice(15, 18),
    vol: s.slice(18, 23)
  };
}

function buildId({ cd, pedido, seq, loja, rota, vol }) {
  const parts = {
    cd: pad(onlyDigits(cd), 1).slice(-1), // último dígito
    pedido: pad(onlyDigits(pedido), 7),
    seq: pad(onlyDigits(seq), 3),
    loja: pad(onlyDigits(loja), 4),
    rota: pad(onlyDigits(rota), 3),
    vol: pad(onlyDigits(vol), 5),
  };
  const s = parts.cd + parts.pedido + parts.seq + parts.loja + parts.rota + parts.vol;
  if (s.length !== 23) throw new Error('ID gerado não possui 23 dígitos.');
  if (!pedidoToDateStr(parts.pedido)) throw new Error('PEDIDO (AAAADDD) inválido.');
  return s;
}

function getRotaDesc(cd, n) {
  const c = String(Number(cd || 0));
  const k = pad(onlyDigits(n), 3);
  const map = (BASE.rotas && BASE.rotas[c]) || {};
  return map[k] ? `ROTA ${k} - ${map[k]}` : `ROTA ${k}`;
}
function getLojaDesc(cd, n) {
  const c = String(Number(cd || 0));
  const k = pad(onlyDigits(n), 4);
  const map = (BASE.lojas && BASE.lojas[c]) || {};
  return map[k] ? `${Number(n)} - ${map[k]}` : String(Number(n || 0));
}

/* ===== UI ===== */
function montarEtiqueta({ cd, loja, pedido, seq, rota, volAtual, volTotal, matricula, id, numeroVolumeStr }) {
  const wrap = document.createElement('div');
  wrap.className = 'labelwrap';

  const rotSel = $('#rotacao').value;
  wrap.classList.add(rotSel === '90' ? 'rot90' : (rotSel === '180' ? 'rot180' : (rotSel === '270' ? 'rot270' : 'rot0')));

  const el = document.createElement('div');
  el.className = 'label';

  // HEADER
  const header = document.createElement('div');
  header.className = 'header';
  const leftTitle = document.createElement('div');
  leftTitle.className = 'title';
  leftTitle.textContent = `VOLUMES TERMOLÁBEIS CD ${Number(cd || 0)}`;
  const logos = document.createElement('div');
  logos.className = 'logos';
  const img1 = document.createElement('img'); img1.src = '../assets/pm.png'; img1.alt = 'Pague Menos'; img1.className = 'brand-logo pm';
  // Removido o logo .logo (DP) da área de impressão/preview
  logos.append(img1);
  header.append(leftTitle, logos);
  el.appendChild(header);

  // MAIN GRID
  const main = document.createElement('div');
  main.className = 'main';

  // LEFT
  const left = document.createElement('div');
  left.className = 'left';

  // INFO (esquerda)
  const info = document.createElement('div');
  info.className = 'info';

  const dtPedidoStr = pedidoToDateStr(pedido) || '--/--/----';
  function addRow(lbl, val) {
    const l = document.createElement('div'); l.className = 'lbl'; l.textContent = lbl;
    const v = document.createElement('div'); v.className = 'val'; v.textContent = val;
    info.append(l, v);
  }
  addRow('LOJA:', getLojaDesc(cd, loja));
  addRow('N° PEDIDO:', onlyDigits(pedido));
  addRow('DT PEDIDO:', dtPedidoStr);
  addRow('ROTA:', getRotaDesc(cd, rota));

  left.appendChild(info);

  // BARCODE + LEGENDA
  const barArea = document.createElement('div');
  barArea.className = 'bararea';
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.classList.add('barcode');
  barArea.appendChild(svg);
  const barText = document.createElement('div');
  barText.className = 'bartext legend';
  barText.textContent = id;
  barArea.appendChild(barText);

  left.appendChild(barArea);

  // RIGHT (QR + VOLUME)
  const right = document.createElement('div');
  right.className = 'right';

  const qrbox = document.createElement('div');
  qrbox.className = 'qrbox';
  const qsel = window.qrcode ? window.qrcode(0, 'M') : null;
  if (qsel) {
    qsel.addData(String(id));
    qsel.make();
    const img = qsel.createImgTag(3, 8);
    const tmp = document.createElement('div'); tmp.innerHTML = img;
    const qimg = tmp.querySelector('img');
    const c = document.createElement('canvas');
    const size = 260; c.width = size; c.height = size;
    const ctx = c.getContext('2d');
    const timg = new Image();
    timg.onload = () => { ctx.drawImage(timg, 0, 0, size, size); };
    timg.src = qimg.src;
    qrbox.appendChild(c);
  } else {
    const fallback = document.createElement('div'); fallback.textContent = 'QR'; qrbox.appendChild(fallback);
  }
  right.appendChild(qrbox);

  const vbox = document.createElement('div');
  vbox.className = 'volume-box';

  const vt = document.createElement('div');
  vt.className = 't';
  vt.textContent = 'VOLUME';

  const vb = document.createElement('div');
  vb.className = 'big';
  vb.textContent = `${volAtual}/${volTotal}`;

  vbox.append(vt, vb);

  // Exibir "NÚMERO:" apenas quando houver fracionamento (mais de 1 volume)
  if (Number(volTotal) > 1) {
    const vn = document.createElement('div');
    vn.className = 'mini numero-destaque';
    vn.textContent = `NÚMERO: ${toIntStr(numeroVolumeStr, volAtual)}`;
    vbox.appendChild(vn);

    const vf = document.createElement('div');
    vf.className = 'mini';
    vf.textContent = 'VOLUME FRACIONADO';
    vbox.appendChild(vf);
  } else {
    const vs = document.createElement('div');
    vs.className = 'mini';
    // VOL também como inteiro quando não for fracionado
    vs.textContent = `VOL: ${toIntStr(numeroVolumeStr, volAtual)}`;
    vbox.appendChild(vs);
  }
  right.appendChild(vbox);

  main.append(left, right);
  el.appendChild(main);

  // META (rodapé)
  const meta = document.createElement('div');
  meta.className = 'meta';
  const now = new Date();
  const dd = pad(now.getDate(), 2), mm = pad(now.getMonth() + 1, 2), aa = now.getFullYear();
  const hh = pad(now.getHours(), 2), mi = pad(now.getMinutes(), 2);
  meta.innerHTML = `<span>CD: <strong>${Number(cd || 0)}</strong></span>` +
    (matricula ? `<span>MATRÍCULA: <strong>${matricula}</strong></span>` : '') +
    `<span>SEPARADO EM: <strong>${dd}/${mm}/${aa} ${hh}:${mi}</strong></span>`;
  el.appendChild(meta);

  // render barcode
  if (window.JsBarcode) {
    JsBarcode(svg, id, { format: 'CODE128', displayValue: false, margin: 0, width: 1.5, height: 42 });
  } else {
    const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    t.setAttribute('x', '0'); t.setAttribute('y', '20'); t.textContent = id;
    svg.appendChild(t);
  }

  wrap.appendChild(el);
  return wrap;
}

function setManualEnabled(enabled) {
  ['loja', 'pedido', 'seq', 'rota', 'numeroVolume'].forEach(id => {
    const el = document.getElementById(id);
    el.disabled = !enabled;
  });
}

function onCdChange() {
  const cdVal = $('#cd').value.trim();
  const ok = /^[1-9]$/.test(cdVal);
  setManualEnabled(ok);

  const c = String(Number(cdVal || 0));
  const lojas = (BASE.lojas && BASE.lojas[c]) || {};
  const rotas = (BASE.rotas && BASE.rotas[c]) || {};

  const dlLoja = document.getElementById('listLoja');
  dlLoja.innerHTML = Object.keys(lojas).sort().map(k => `<option value="${parseInt(k, 10)}">${lojas[k]}</option>`).join('');

  const dlRota = document.getElementById('listRota');
  dlRota.innerHTML = Object.keys(rotas).sort().map(k => `<option value="${parseInt(k, 10)}">${rotas[k]}</option>`).join('');
}

function gerar() {
  try {
    // Validar matrícula antes de processar qualquer etiqueta
    const matriculaInput = $('#matricula').value;
    const validacaoMatricula = validarMatricula(matriculaInput);

    if (!validacaoMatricula.valida) {
      exibirErroMatricula(validacaoMatricula.erro);
      return; // Interromper o processo quando validação falhar
    }

    setVars();
    const preview = $('#preview');
    preview.innerHTML = '';

    const usaId = $('#modoId').checked;
    const totalVol = Math.max(1, parseInt($('#qtdVolumes').value || '1', 10));
    const mat = $('#matricula').value.trim();
    const numVolInput = onlyDigits(document.getElementById('numeroVolume') ? document.getElementById('numeroVolume').value : '');
    const etiquetas = [];

    if (usaId) {
      const idRaw = onlyDigits($('#idEtiqueta').value);
      const parsed = parseId(idRaw); // valida e já quebra campos
      const idFixo = idRaw;          // ID permanece fixo em todas as etiquetas

      // Base para mostrar NÚMERO (somente exibição)
      const base4 = numVolInput ? Number(String(numVolInput).slice(-4)) : Number(String(parsed.vol).slice(-4));

      for (let v = 1; v <= totalVol; v++) {
        const num4 = pad(base4, 4);
        const etq = montarEtiqueta({
          cd: parsed.cd,
          loja: parsed.loja,
          pedido: parsed.pedido,
          seq: parsed.seq,
          rota: parsed.rota,
          volAtual: v,
          volTotal: totalVol,
          matricula: mat,
          id: idFixo,                 // código/ID fixo
          numeroVolumeStr: num4       // apenas para exibição
        });
        etiquetas.push(etq);
      }
    } else {
      const cd = $('#cd').value;
      if (!/^[1-9]$/.test(cd)) throw new Error('Informe o CD (1 a 9) para liberar os demais campos.');

      const loja = $('#loja').value;
      const pedido = $('#pedido').value;
      const seq = $('#seq').value;
      const rota = $('#rota').value;

      if (!pedidoToDateStr(pedido)) throw new Error('PEDIDO (AAAADDD) inválido. Ex.: 2024269');

      const baseNum5 = numVolInput ? pad(Number(numVolInput), 5) : '00001';
      const idFixo = buildId({ cd, pedido, seq, loja, rota, vol: baseNum5 }); // ID fixo

      const base4 = Number(baseNum5.slice(-4)); // para exibição
      for (let v = 1; v <= totalVol; v++) {
        const num4 = pad(base4, 4);
        const etq = montarEtiqueta({
          cd, loja, pedido, seq, rota,
          volAtual: v,
          volTotal: totalVol,
          matricula: mat,
          id: idFixo,                 // ID fixo
          numeroVolumeStr: num4       // exibição
        });
        etiquetas.push(etq);
      }
    }

    etiquetas.forEach(e => preview.appendChild(e));

    // Salvar no histórico após geração bem-sucedida
    console.log('🔄 Salvando no histórico termo...');

    const now = new Date();
    const dd = pad(now.getDate(), 2);
    const mm = pad(now.getMonth() + 1, 2);
    const aa = now.getFullYear();
    const hh = pad(now.getHours(), 2);
    const mi = pad(now.getMinutes(), 2);

    let historyData;

    if (usaId) {
      const idRaw = onlyDigits($('#idEtiqueta').value);
      const parsed = parseId(idRaw);
      const dtPedidoStr = pedidoToDateStr(parsed.pedido) || '--/--/----';

      historyData = {
        etiquetaId: idRaw,
        pedido: onlyDigits(parsed.pedido),
        dataPedido: dtPedidoStr,
        loja: getLojaDesc(parsed.cd, parsed.loja),
        rota: getRotaDesc(parsed.cd, parsed.rota),
        qtdVolumes: totalVol,
        matricula: mat,
        dataSeparacao: `${dd}/${mm}/${aa}`,
        horaSeparacao: `${hh}:${mi}`,
        timestamp: now.toISOString()
      };
    } else {
      const cd = $('#cd').value;
      const loja = $('#loja').value;
      const pedido = $('#pedido').value;
      const rota = $('#rota').value;
      const dtPedidoStr = pedidoToDateStr(pedido) || '--/--/----';
      const baseNum5 = numVolInput ? pad(Number(numVolInput), 5) : '00001';
      const idFixo = buildId({ cd, pedido, seq: $('#seq').value, loja, rota, vol: baseNum5 });

      historyData = {
        etiquetaId: idFixo,
        pedido: onlyDigits(pedido),
        dataPedido: dtPedidoStr,
        loja: getLojaDesc(cd, loja),
        rota: getRotaDesc(cd, rota),
        qtdVolumes: totalVol,
        matricula: mat,
        dataSeparacao: `${dd}/${mm}/${aa}`,
        horaSeparacao: `${hh}:${mi}`,
        timestamp: now.toISOString()
      };
    }

    console.log('📋 Dados para histórico termo:', historyData);
    saveToTermoHistory(historyData);

  } catch (e) {
    alert('Erro: ' + e.message);
  }
}


document.addEventListener('DOMContentLoaded', async () => {
  await loadBase();

  const toggle = () => {
    const usaId = $('#modoId').checked;
    $('#blocoId').className = usaId ? 'blocovis' : 'blocohide';
    $('#blocoCampos').className = usaId ? 'blocohide' : 'blocovis';
    if (!usaId) onCdChange();
  };
  $('#modoId').addEventListener('change', toggle);
  $('#modoCampos').addEventListener('change', toggle);
  toggle();

  $('#cd').addEventListener('input', onCdChange);
  setManualEnabled(false);

  $('#gerar').addEventListener('click', gerar);
  $('#imprimir').addEventListener('click', () => window.print());

  ['wmm', 'hmm', 'rotacao'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', setVars);
  });
  setVars();

  // Controles do histórico
  $('#termo-historico-btn').addEventListener('click', showTermoHistorico);
  $('#termo-historico-close').addEventListener('click', hideTermoHistorico);

  // Fechar modal clicando fora
  $('#termo-historico-modal').addEventListener('click', (e) => {
    if (e.target === $('#termo-historico-modal')) {
      hideTermoHistorico();
    }
  });

  // Toggle da busca
  const toggleSearchBtn = $('#termo-toggle-search');
  if (toggleSearchBtn) {
    toggleSearchBtn.addEventListener('click', () => {
      const searchSection = $('#termo-search-section');
      const isHidden = searchSection.style.display === 'none';

      if (isHidden) {
        searchSection.style.display = 'block';
        toggleSearchBtn.classList.add('active');
        const input = $('#termo-search-input');
        if (input) setTimeout(() => input.focus(), 100);
      } else {
        searchSection.style.display = 'none';
        toggleSearchBtn.classList.remove('active');
      }
    });
  }

  document.addEventListener('keydown', (ev) => {
    if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'h') { ev.preventDefault(); showTermoHistorico(); }
    if (ev.key === 'Escape') { hideTermoHistorico(); }
  });

  // Inicialização do histórico
  try {
    cleanDuplicateTermoHistory();
    cleanOldTermoRecords();
    console.log('📊 Histórico termo inicializado:', termoGenerationHistory.length, 'registros');
  } catch (error) {
    console.warn('⚠️ Erro na inicialização do histórico termo:', error.message);
    termoGenerationHistory = [];
  }
});

/* ===== Funções do Histórico Termolábeis ===== */
function showTermoHistorico() {
  const modal = $('#termo-historico-modal');

  // Limpar registros antigos antes de exibir
  cleanOldTermoRecords();

  // Resetar estado da busca (fechado por padrão)
  const searchSection = $('#termo-search-section');
  const toggleBtn = $('#termo-toggle-search');
  if (searchSection) searchSection.style.display = 'none';
  if (toggleBtn) toggleBtn.classList.remove('active');

  // Limpar busca anterior
  const searchInput = $('#termo-search-input');
  if (searchInput) {
    searchInput.value = '';
  }
  clearTermoSearch(); // Garante que filtros também resetem

  // Renderizar lista completa
  renderTermoHistoryList(termoGenerationHistory);

  modal.style.display = 'flex';

  // Configurar eventos de busca
  setupTermoSearchEvents();

  // Foco para acessibilidade
  const closeBtn = $('#termo-historico-close');
  if (closeBtn) closeBtn.focus();
}

function hideTermoHistorico() {
  const modal = $('#termo-historico-modal');
  modal.style.display = 'none';
}

function renderTermoHistoryList(historyData) {
  const list = $('#termo-historico-list');

  if (historyData.length === 0) {
    const searchInput = $('#termo-search-input');
    const isSearching = searchInput && searchInput.value.trim() !== '';

    if (isSearching) {
      list.innerHTML = `
        <div style="text-align: center; padding: 3rem;">
          <div style="font-size: 3rem; margin-bottom: 1rem;">🔍</div>
          <p style="color: var(--neutral-500); font-size: var(--text-base); margin-bottom: 0.5rem;">Nenhum resultado encontrado</p>
          <p style="color: var(--neutral-400); font-size: var(--text-sm);">Tente ajustar os termos de busca</p>
        </div>
      `;
    } else {
      list.innerHTML = `
        <div style="text-align: center; padding: 3rem;">
          <div style="font-size: 3rem; margin-bottom: 1rem;">🧊</div>
          <p style="color: var(--neutral-500); font-size: var(--text-base); margin-bottom: 0.5rem;">Nenhum histórico encontrado</p>
          <p style="color: var(--neutral-400); font-size: var(--text-sm);">Gere algumas etiquetas termolábeis para ver o histórico aqui</p>
        </div>
      `;
    }
  } else {
    list.innerHTML = historyData.map((item, index) => {
      const html = createTermoHistoryItemHTML(item);
      return html.replace('class="historico-item"', `class="historico-item" style="animation-delay: ${index * 0.05}s"`);
    }).join('');

    // Adicionar informações de estatísticas
    const totalRecords = termoGenerationHistory.length;
    const showingRecords = historyData.length;
    const isFiltered = totalRecords !== showingRecords;

    const statsHtml = `
      <div style="text-align: center; padding: 1rem; margin-top: 1rem; border-top: 1px solid var(--neutral-200);">
        <small style="color: var(--neutral-500);">
          ${isFiltered ? `Mostrando ${showingRecords} de ${totalRecords}` : `${totalRecords}`} 
          ${totalRecords === 1 ? 'registro' : 'registros'} no histórico
          ${totalRecords > 0 ? ` • Mais antigo: ${new Date(termoGenerationHistory[termoGenerationHistory.length - 1].timestamp).toLocaleDateString('pt-BR')}` : ''}
        </small>
      </div>
    `;
    list.innerHTML += statsHtml;
  }
}

function createTermoHistoryItemHTML(item) {
  return `
    <div class="historico-item">
      <div class="historico-info">
        <div class="historico-primary">
          <strong>ID: ${item.etiquetaId}</strong>
          <span class="historico-badge">${item.qtdVolumes} ${item.qtdVolumes === 1 ? 'volume' : 'volumes'}</span>
        </div>
        <div class="historico-secondary">
          <span>Pedido: ${item.pedido}</span>
          <span>Data Pedido: ${item.dataPedido}</span>
          <span>Loja: ${item.loja}</span>
          <span>Rota: ${item.rota}</span>
        </div>
        <div class="historico-meta">
          ${item.matricula ? `<span>Matrícula: ${item.matricula}</span>` : ''}
          <span>Separado em: ${item.dataSeparacao} às ${item.horaSeparacao}</span>
        </div>
      </div>
    </div>
  `;
}

function setupTermoSearchEvents() {
  const searchInput = $('#termo-search-input');
  const clearButton = $('#termo-clear-search');
  const filterRadios = document.querySelectorAll('input[name="termoSearchType"]');

  // Evento de busca em tempo real
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      performTermoSearch();
      // Mostrar/ocultar botão de limpar
      const clearBtn = $('#termo-clear-search');
      if (clearBtn) {
        if (e.target.value.trim()) {
          clearBtn.style.opacity = '1';
          clearBtn.style.visibility = 'visible';
        } else {
          clearBtn.style.opacity = '0';
          clearBtn.style.visibility = 'hidden';
        }
      }
    });

    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        clearTermoSearch();
      }
    });
  }

  // Botão limpar busca
  if (clearButton) {
    clearButton.addEventListener('click', clearTermoSearch);
  }

  // Filtros de tipo
  filterRadios.forEach(radio => {
    radio.addEventListener('change', performTermoSearch);
  });
}

function performTermoSearch() {
  const searchInput = $('#termo-search-input');
  const searchTerm = searchInput ? searchInput.value.trim().toLowerCase() : '';
  const selectedFilter = document.querySelector('input[name="termoSearchType"]:checked')?.value || 'all';

  let filteredHistory = [...termoGenerationHistory];

  if (searchTerm) {
    filteredHistory = termoGenerationHistory.filter(item => {
      switch (selectedFilter) {
        case 'pedido':
          return item.pedido && item.pedido.toLowerCase().includes(searchTerm);

        case 'loja':
          return item.loja && item.loja.toLowerCase().includes(searchTerm);

        case 'rota':
          return item.rota && item.rota.toLowerCase().includes(searchTerm);

        case 'data':
          return (item.dataPedido && item.dataPedido.includes(searchTerm)) ||
            (item.dataSeparacao && item.dataSeparacao.includes(searchTerm));

        case 'all':
        default:
          return (
            (item.pedido && item.pedido.toLowerCase().includes(searchTerm)) ||
            (item.loja && item.loja.toLowerCase().includes(searchTerm)) ||
            (item.rota && item.rota.toLowerCase().includes(searchTerm)) ||
            (item.dataPedido && item.dataPedido.includes(searchTerm)) ||
            (item.dataSeparacao && item.dataSeparacao.includes(searchTerm)) ||
            (item.etiquetaId && item.etiquetaId.toLowerCase().includes(searchTerm))
          );
      }
    });
  }

  renderTermoHistoryList(filteredHistory);
}

function clearTermoSearch() {
  const searchInput = $('#termo-search-input');
  const clearBtn = $('#termo-clear-search');

  if (searchInput) {
    searchInput.value = '';
  }

  // Ocultar botão de limpar
  if (clearBtn) {
    clearBtn.style.opacity = '0';
    clearBtn.style.visibility = 'hidden';
  }

  // Resetar para "Todos"
  const allFilter = document.querySelector('input[name="termoSearchType"][value="all"]');
  if (allFilter) {
    allFilter.checked = true;
  }

  renderTermoHistoryList(termoGenerationHistory);

  // Foco de volta no input
  if (searchInput) {
    searchInput.focus();
  }
}

function saveToTermoHistory(config) {
  // Criar chave única para identificar duplicatas
  const uniqueKey = `${config.etiquetaId}-${config.pedido}-${config.loja}-${config.rota}`;

  // Verificar se já existe uma entrada com a mesma configuração
  const existingIndex = termoGenerationHistory.findIndex(item => {
    const itemKey = `${item.etiquetaId}-${item.pedido}-${item.loja}-${item.rota}`;
    return itemKey === uniqueKey;
  });

  // Se encontrou uma entrada similar, remover a antiga
  if (existingIndex !== -1) {
    termoGenerationHistory.splice(existingIndex, 1);
    console.log('Removida entrada duplicada do histórico termo');
  }

  // Adicionar a nova entrada no início
  termoGenerationHistory.unshift({
    ...config,
    id: Date.now() + Math.random(), // ID único para evitar conflitos
    uniqueKey
  });

  // Manter apenas os últimos 500 registros únicos
  if (termoGenerationHistory.length > 500) {
    termoGenerationHistory = termoGenerationHistory.slice(0, 500);
  }

  // Limpar registros antigos (90 dias)
  cleanOldTermoRecords();

  // Salvar no localStorage
  try {
    localStorage.setItem('termo-etiquetas-history', JSON.stringify(termoGenerationHistory));
    console.log('✅ Histórico termo salvo:', config.etiquetaId, '- Total:', termoGenerationHistory.length, 'entradas');
  } catch (e) {
    console.warn('⚠️ Erro ao salvar histórico termo:', e.message);

    // Tentar limpeza emergencial
    if (e.name === 'QuotaExceededError') {
      try {
        // Manter apenas os 50 registros mais recentes
        termoGenerationHistory = termoGenerationHistory.slice(0, 50);
        localStorage.setItem('termo-etiquetas-history', JSON.stringify(termoGenerationHistory));
        console.log('🧹 Limpeza emergencial do histórico termo executada');
      } catch (emergencyError) {
        console.error('❌ Falha na limpeza emergencial termo:', emergencyError.message);
        // Limpar completamente se necessário
        localStorage.removeItem('termo-etiquetas-history');
        termoGenerationHistory = [];
      }
    }
  }
}

// Expor funções globalmente para debugging e testes
window.termoGenerationHistory = () => termoGenerationHistory;
window.showTermoHistorico = showTermoHistorico;
window.hideTermoHistorico = hideTermoHistorico;
window.saveToTermoHistory = saveToTermoHistory;
window.performTermoSearch = performTermoSearch;
window.clearTermoSearch = clearTermoSearch;
