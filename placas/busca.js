/* ====== Sistema de Etiquetas - Carregamento Otimizado ====== */

// Utilidades básicas
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function words(q) { return q.toLowerCase().trim().split(/\s+/).filter(Boolean); }

function highlight(text, q) {
  if (!q) return escapeHtml(text);
  const ds = normalizeDigits(q);
  const tokens = (ds && /\d/.test(q)) ? [ds] : words(q);
  let html = escapeHtml(text);
  for (const t of tokens) {
    if (!t) continue;
    const re = new RegExp('(' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig');
    html = html.replace(re, '<mark>$1</mark>');
  }
  return html;
}

function copyToClipboard(txt) {
  try { navigator.clipboard.writeText(txt); toast('Copiado!'); } catch (e) { alert('Copie manualmente:\n' + txt); }
}

function toast(msg) {
  let t = document.createElement('div');
  t.className = 'toast'; t.textContent = msg;
  Object.assign(t.style, { position: 'fixed', right: '12px', bottom: '12px', background: '#111827', color: '#fff', padding: '8px 10px', borderRadius: '8px', fontSize: '12px', opacity: '0.95', zIndex: 9999 });
  document.body.appendChild(t); setTimeout(() => t.remove(), 1500);
}

// Função removida - o popup é gerenciado pelo HTML

function tipoBarras(len) { return len === 13 ? 'EAN‑13' : (len === 14 ? 'ITF‑14' : (len === 8 ? 'EAN‑8' : '—')); }

// Config
let SPACE_SCALE = 1.35;
const QUIET_ZONE = 14;

// Seletores CORRIGIDOS
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

function nowStr() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function normalizeDigits(s) { return (s || '').replace(/\D+/g, ''); }
function containsAllWords(text, query) {
  const q = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const t = (text || '').toLowerCase();
  return q.every(w => t.includes(w));
}
function debounce(fn, ms) {
  let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

// Dados
let DATA = [];
let CURRENT_IDX = null;

// Sistema de carregamento SIMPLIFICADO
function setStatus(text, type = 'info') {
  const status = $('#status');
  if (!status) return;

  const colors = {
    info: { bg: '#e0f2fe', color: '#0369a1' },
    success: { bg: '#dcfce7', color: '#166534' },
    warning: { bg: '#fef3c7', color: '#92400e' },
    error: { bg: '#fecaca', color: '#991b1b' }
  };

  status.textContent = text;
  status.style.display = '';
  status.style.background = colors[type].bg;
  status.style.color = colors[type].color;
}

// Carregamento ULTRA-RÁPIDO
async function loadJSON(path) {
  console.log('🔄 Carregando:', path);

  // Método 1: Fetch direto
  try {
    const res = await fetch(path);
    if (res.ok) {
      const data = await res.json();
      console.log('✅ Carregado:', Object.keys(data).length, 'itens');
      return data;
    }
  } catch (e) {
    console.warn('Fetch falhou:', e.message);
  }

  // Método 2: XHR (fallback)
  try {
    return await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', path, true);
      xhr.timeout = 3000;
      xhr.onload = () => {
        if (xhr.status === 200 || xhr.status === 0) {
          try {
            resolve(JSON.parse(xhr.responseText));
          } catch (e) {
            reject(new Error('JSON inválido'));
          }
        } else {
          reject(new Error('HTTP ' + xhr.status));
        }
      };
      xhr.onerror = () => reject(new Error('Erro de rede'));
      xhr.ontimeout = () => reject(new Error('Timeout'));
      xhr.send();
    });
  } catch (e) {
    console.warn('XHR falhou:', e.message);
  }

  return null;
}

function processData(obj, save = true) {
  const arr = Array.isArray(obj) ? obj : Object.values(obj || {});
  DATA = arr.filter(Boolean).map(r => ({
    COD: String(r.COD || '').trim(),
    DV: String(r.DV || '').trim(),
    DESC: String(r.DESC || r.DESCRICAO || '').trim(),
    BARRAS: String(r.BARRAS || '').trim(),
  }));

  if (save) {
    try {
      localStorage.setItem('DP_BASE_JSON', JSON.stringify(obj));
      console.log('💾 Salvo no cache');
    } catch (e) {
      console.warn('⚠️ Falha ao salvar cache');
    }
  }

  setStatus(`Base: ${DATA.length.toLocaleString('pt-BR')} itens`, 'success');

  // Esconde controles manuais
  const fileBtn = document.querySelector('.file-btn');
  if (fileBtn) fileBtn.style.display = 'none';
  const btnReload = $('#btnReload');
  if (btnReload) btnReload.style.display = 'none';
  const loadHelp = $('#loadHelp');
  if (loadHelp) loadHelp.style.display = 'none';

  // Auto-esconde status
  setTimeout(() => {
    const status = $('#status');
    if (status) status.style.display = 'none';
  }, 3000);
}

async function loadData() {
  // 1. Cache primeiro - INSTANTÂNEO
  try {
    const cached = localStorage.getItem('DP_BASE_JSON');
    if (cached) {
      const data = JSON.parse(cached);
      if (data && Object.keys(data).length > 0) {
        console.log('📦 Cache:', Object.keys(data).length, 'itens');
        processData(data, false);
        return;
      }
    }
  } catch (e) {
    localStorage.removeItem('DP_BASE_JSON');
  }

  // 2. Carregamento automático com timeout
  setStatus('Carregando base…', 'info');

  try {
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), 2000)
    );

    const data = await Promise.race([
      loadJSON(window.BARRAS_JSON_PATH || 'base_barras_index.json'),
      timeoutPromise
    ]);

    if (data && Object.keys(data).length > 0) {
      processData(data, true);
    } else {
      showManualLoad();
    }
  } catch (e) {
    console.warn('Carregamento falhou:', e.message);
    showManualLoad();
  }
}

function showManualLoad() {
  setStatus('Use "Carregar base" para importar dados', 'warning');
  const fileBtn = document.querySelector('.file-btn');
  if (fileBtn) fileBtn.style.display = '';
  const btnReload = $('#btnReload');
  if (btnReload) btnReload.style.display = '';
  const loadHelp = $('#loadHelp');
  if (loadHelp) loadHelp.style.display = 'block';
}

/* ====== Busca e Hints ====== */
let activeIndex = -1;

function renderHints(list) {
  const box = $('#hints');
  const info = $('#matchInfo');
  if (!box) return;

  box.innerHTML = '';
  if (!list.length) {
    box.hidden = true;
    if (info) { info.hidden = true; info.textContent = ""; }
    return;
  }

  const q = $('#q').value;
  list.forEach((r, i) => {
    const div = document.createElement('div');
    div.className = 'hint-item' + (i === activeIndex ? ' active' : '');
    div.dataset.idx = r.__idx;
    div.innerHTML = `<span class="hint-cod">${highlight(r.COD || '', q)}</span>
      <span class="hint-barras">${highlight(r.BARRAS || '', q)}</span>
      <span class="hint-desc">${highlight(r.DESC || '', q)}</span>`;
    div.addEventListener('click', () => selectByIdx(r.__idx));
    box.appendChild(div);
  });

  box.hidden = false;
  if (info) {
    info.hidden = false;
    info.textContent = `${list.length} resultado${list.length > 1 ? 's' : ''}…`;
  }
}

function findMatches(q) {
  q = q.trim();
  if (!q) return [];

  const digits = normalizeDigits(q);
  const isDigits = digits.length >= 3 && /^\d+$/.test(digits);
  const scored = [];

  for (let i = 0; i < DATA.length; i++) {
    const r = DATA[i];
    const cod = r.COD || '';
    const barras = r.BARRAS || '';
    const desc = r.DESC || '';
    let score = -1;

    if (isDigits) {
      if (cod.startsWith(digits)) score = 100 - Math.min(99, cod.length);
      else if (barras.startsWith(digits)) score = 95 - Math.min(99, barras.length);
      else if (cod.includes(digits) || barras.includes(digits)) score = 70;
    } else {
      if (containsAllWords(desc, q)) score = 60 + Math.min(10, q.length);
    }

    if (score >= 0) {
      scored.push({ ...r, __score: score, __idx: i });
    }
  }

  scored.sort((a, b) => b.__score - a.__score);
  return scored.slice(0, 50);
}

const onType = debounce(() => {
  const q = $('#q');
  if (!q) return;

  const matches = findMatches(q.value);
  activeIndex = -1;
  renderHints(matches);

  const showNo = (!matches.length && q.value.trim().length > 0);
  const noEl = $('#noResults');
  if (noEl) noEl.hidden = !showNo;
}, 80);

function onKey(ev) {
  const items = $$('.hint-item');
  if (ev.key === 'ArrowDown') {
    ev.preventDefault();
    activeIndex = Math.min(items.length - 1, activeIndex + 1);
    highlightActive(items);
  } else if (ev.key === 'ArrowUp') {
    ev.preventDefault();
    activeIndex = Math.max(0, activeIndex - 1);
    highlightActive(items);
  } else if (ev.key === 'Enter') {
    ev.preventDefault();
    if (activeIndex >= 0 && items[activeIndex]) {
      selectByIdx(+items[activeIndex].dataset.idx);
    } else {
      const q = $('#q');
      if (q) {
        const list = findMatches(q.value);
        if (list.length) {
          selectByIdx(list[0].__idx);
        } else {
          const noEl = $('#noResults');
          if (noEl) noEl.hidden = false;
        }
      }
    }
  } else if (ev.key === 'Escape') {
    const hints = $('#hints');
    if (hints) hints.hidden = true;
  }
}

function highlightActive(items) {
  items.forEach((el, i) => el.classList.toggle('active', i === activeIndex));
  if (items[activeIndex]) items[activeIndex].scrollIntoView({ block: 'nearest' });
}

/* ====== Selection ====== */
function selectByIdx(i) {
  CURRENT_IDX = i;
  const r = DATA[i];
  if (!r) return;

  const hints = $('#hints');
  if (hints) hints.hidden = true;

  const q = $('#q');
  if (q) q.value = `${r.COD} / ${r.BARRAS} / ${r.DESC}`;

  renderCard(r);
}

function renderCard(r) {
  const card = $('#card');
  if (!card) return;

  card.hidden = false;

  const desc = $('#desc');
  if (desc) desc.textContent = r.DESC || '(sem descrição)';

  const meta = $('#meta');
  if (meta) meta.textContent = `COD: ${r.COD}   DV: ${r.DV}`;

  const legend = $('#legend');
  if (legend) {
    legend.innerHTML = `
      <span><span class="tag">BARRAS:</span> <span class="mono">${r.BARRAS}</span> <small class="muted">(${tipoBarras((r.BARRAS || '').trim().length)})</small></span>`;
  }

  const barras = String(r.BARRAS || '').trim();
  const digits = normalizeDigits(barras);
  const svg = $('#barcodeSvg');

  if (svg) {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    svg.setAttribute('preserveAspectRatio', 'xMinYMid meet');

    try {
      if (digits.length === 13) {
        renderEAN13(svg, digits);
      } else if (digits.length === 14) {
        renderITF(svg, digits);
      } else if (digits.length === 8) {
        renderEAN8(svg, digits);
      } else if (digits.length === 12) {
        renderEAN13(svg, '0' + digits);
      } else {
        renderITF(svg, digits.padStart(digits.length % 2 ? digits.length + 1 : digits.length, '0'));
      }
    } catch (e) {
      const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      t.setAttribute('x', '10');
      t.setAttribute('y', '50');
      t.textContent = 'Falha ao renderizar código: ' + e.message;
      svg.appendChild(t);
    }
  }
}

/* ====== Barcode Renders ====== */
function drawBits(svg, bits, moduleW, quiet) {
  let totalUnits = 0;
  for (let i = 0; i < bits.length; i++) {
    totalUnits += (bits[i] === '1') ? 1 : SPACE_SCALE;
  }
  const vbW = quiet * 2 + totalUnits * moduleW;
  const vbH = 100;
  svg.setAttribute('viewBox', `0 0 ${vbW} ${vbH}`);
  svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  let x = quiet;
  let i = 0;
  while (i < bits.length) {
    if (bits[i] === '1') {
      let run = 0;
      while (i < bits.length && bits[i] === '1') { run++; i++; }
      const r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      r.setAttribute('x', x);
      r.setAttribute('y', 0);
      r.setAttribute('width', run * moduleW);
      r.setAttribute('height', vbH);
      r.setAttribute('fill', '#000');
      svg.appendChild(r);
      x += run * moduleW;
    } else {
      let run = 0;
      while (i < bits.length && bits[i] === '0') { run++; i++; }
      x += run * moduleW * SPACE_SCALE;
    }
  }
}

const ITF_MAP = { '0': 'nnwwn', '1': 'wnnnw', '2': 'nwnnw', '3': 'wwnnn', '4': 'nnwnw', '5': 'wnwnn', '6': 'nwwnn', '7': 'nnnww', '8': 'wnnwn', '9': 'nwnwn' };
const NARROW = 1, WIDE = 3;

function renderITF(svg, payload) {
  if (!/^\d+$/.test(payload)) throw new Error('ITF requer apenas dígitos.');
  if (payload.length % 2 !== 0) throw new Error('ITF requer quantidade PAR de dígitos.');

  const widths = [];
  widths.push(NARROW, NARROW, NARROW, NARROW);

  for (let i = 0; i < payload.length; i += 2) {
    const a = ITF_MAP[payload[i]];
    const b = ITF_MAP[payload[i + 1]];
    for (let j = 0; j < 5; j++) {
      widths.push(a[j] === 'w' ? WIDE : NARROW);
      widths.push(b[j] === 'w' ? WIDE : NARROW);
    }
  }

  widths.push(WIDE, NARROW, NARROW);

  let total = 0;
  for (let i = 0; i < widths.length; i++) {
    total += (i % 2 === 0 ? widths[i] : widths[i] * SPACE_SCALE);
  }

  const vbW = QUIET_ZONE + total + QUIET_ZONE;
  const vbH = 100;
  svg.setAttribute('viewBox', `0 0 ${vbW} ${vbH}`);
  svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

  let x = QUIET_ZONE;
  for (let i = 0; i < widths.length; i++) {
    const w = widths[i];
    if (i % 2 === 0) {
      const r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      r.setAttribute('x', x);
      r.setAttribute('y', 0);
      r.setAttribute('width', w);
      r.setAttribute('height', vbH);
      r.setAttribute('fill', '#000');
      svg.appendChild(r);
      x += w;
    } else {
      x += w * SPACE_SCALE;
    }
  }
}

const EAN_SET = {
  A: { 0: '0001101', 1: '0011001', 2: '0010011', 3: '0111101', 4: '0100011', 5: '0110001', 6: '0101111', 7: '0111011', 8: '0110111', 9: '0001011' },
  B: { 0: '0100111', 1: '0110011', 2: '0011011', 3: '0100001', 4: '0011101', 5: '0111001', 6: '0000101', 7: '0010001', 8: '0001001', 9: '0010111' },
  C: { 0: '1110010', 1: '1100110', 2: '1101100', 3: '1000010', 4: '1011100', 5: '1001110', 6: '1010000', 7: '1000100', 8: '1001000', 9: '1110100' },
  PARITY: { 0: 'AAAAAA', 1: 'AABABB', 2: 'AABBAB', 3: 'AABBBA', 4: 'ABAABB', 5: 'ABBAAB', 6: 'ABBBAA', 7: 'ABABAB', 8: 'ABABBA', 9: 'ABBABA' }
};

function eanChecksum12(digits12) {
  let s = 0;
  for (let i = 0; i < 12; i++) {
    const n = +digits12[i];
    s += (i % 2 === 0) ? n : n * 3;
  }
  return (10 - (s % 10)) % 10;
}

function renderEAN13(svg, digits) {
  if (!/^\d{13}$/.test(digits)) throw new Error('EAN-13 requer 13 dígitos.');

  const expect = eanChecksum12(digits.slice(0, 12));
  if (expect !== +digits[12]) console.warn('DV EAN-13 divergente:', digits, 'esperado', expect);

  const first = +digits[0];
  const left = digits.slice(1, 7);
  const right = digits.slice(7, 13);
  const pieces = ['101'];
  const parity = EAN_SET.PARITY[first].split('');

  for (let i = 0; i < 6; i++) {
    pieces.push(EAN_SET[parity[i]][+left[i]]);
  }
  pieces.push('01010');
  for (let i = 0; i < 6; i++) {
    pieces.push(EAN_SET.C[+right[i]]);
  }
  pieces.push('101');

  const bits = pieces.join('');
  drawBits(svg, bits, 1, QUIET_ZONE);
}

const EAN8_A = { 0: '0001101', 1: '0011001', 2: '0010011', 3: '0111101', 4: '0100011', 5: '0110001', 6: '0101111', 7: '0111011', 8: '0110111', 9: '0001011' };
const EAN8_C = { 0: '1110010', 1: '1100110', 2: '1101100', 3: '1000010', 4: '1011100', 5: '1001110', 6: '1010000', 7: '1000100', 8: '1001000', 9: '1110100' };

function renderEAN8(svg, digits) {
  if (!/^\d{8}$/.test(digits)) throw new Error('EAN-8 requer 8 dígitos.');

  const left = digits.slice(0, 4);
  const right = digits.slice(4, 8);
  const pieces = ['101'];

  for (let i = 0; i < 4; i++) pieces.push(EAN8_A[+left[i]]);
  pieces.push('01010');
  for (let i = 0; i < 4; i++) pieces.push(EAN8_C[+right[i]]);
  pieces.push('101');

  const bits = pieces.join('');
  drawBits(svg, bits, 1, QUIET_ZONE);
}

/* ====== Configurações ====== */
function applyCfg(cfg) {
  if (cfg.wmm) document.documentElement.style.setProperty('--bc-width-mm', cfg.wmm + 'mm');
  if (cfg.hmm) document.documentElement.style.setProperty('--bc-height-mm', cfg.hmm + 'mm');
  if (cfg.lmm != null) document.documentElement.style.setProperty('--bc-left-mm', cfg.lmm + 'mm');
  if (cfg.space) SPACE_SCALE = Number(cfg.space);

  const wmm = $('#wmm');
  const hmm = $('#hmm');
  const lmm = $('#lmm');
  const space = $('#space');

  if (wmm) wmm.value = cfg.wmm || parseInt(getComputedStyle(document.documentElement).getPropertyValue('--bc-width-mm'));
  if (hmm) hmm.value = cfg.hmm || parseInt(getComputedStyle(document.documentElement).getPropertyValue('--bc-height-mm'));
  if (lmm) lmm.value = cfg.lmm ?? parseInt(getComputedStyle(document.documentElement).getPropertyValue('--bc-left-mm'));
  if (space) space.value = cfg.space || SPACE_SCALE;
}

function saveCfg() {
  const wmm = $('#wmm');
  const hmm = $('#hmm');
  const lmm = $('#lmm');
  const space = $('#space');

  const cfg = {
    wmm: wmm ? Number(wmm.value) : 70,
    hmm: hmm ? Number(hmm.value) : 50,
    lmm: lmm ? Number(lmm.value) : 2,
    space: space ? Number(space.value) : SPACE_SCALE
  };

  try {
    localStorage.setItem('DP_PRINT_CFG', JSON.stringify(cfg));
  } catch (e) {
    console.warn('Erro ao salvar configuração');
  }

  applyCfg(cfg);
  if (CURRENT_IDX != null) {
    renderCard(DATA[CURRENT_IDX]);
  }
}

function loadCfg() {
  let cfg = {};
  try {
    cfg = JSON.parse(localStorage.getItem('DP_PRINT_CFG') || '{}');
  } catch (e) {
    console.warn('Erro ao carregar configuração');
  }
  applyCfg(cfg);
}

/* ====== Interface ====== */
function setupInterface() {
  // Event listeners básicos
  const q = $('#q');
  if (q) {
    q.addEventListener('input', onType);
    q.addEventListener('keydown', onKey);
  }

  const btnPrint = $('#btnPrint');
  if (btnPrint) {
    // Apenas adicionar listener básico - o contador é gerenciado pelo HTML
    btnPrint.addEventListener('click', () => window.print());
  }

  const btnB = $('#btnCopyBarras');
  if (btnB) btnB.addEventListener('click', () => {
    const r = DATA[CURRENT_IDX] || {};
    if (r.BARRAS) copyToClipboard(String(r.BARRAS));
  });

  const btnC = $('#btnCopyCod');
  if (btnC) btnC.addEventListener('click', () => {
    const r = DATA[CURRENT_IDX] || {};
    if (r.COD) copyToClipboard(String(r.COD));
  });

  // Atalhos de teclado
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (q) { q.focus(); q.select(); }
    }
    else if (e.key === 'F2') {
      e.preventDefault();
      if (q) { q.focus(); q.select(); }
    }
    else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'l') {
      e.preventDefault();
      clearAll();
    }
  });

  // Controles de impressão
  ['wmm', 'hmm', 'lmm', 'space'].forEach(id => {
    const el = $('#' + id);
    if (el) el.addEventListener('input', saveCfg);
  });

  // Botões de controle
  const btnClear = $('#btnClear');
  if (btnClear) btnClear.addEventListener('click', clearAll);

  const btnReload = $('#btnReload');
  if (btnReload) btnReload.addEventListener('click', async () => {
    btnReload.style.display = 'none';
    localStorage.removeItem('DP_BASE_JSON');
    await loadData();
  });

  const fileLoad = $('#fileLoad');
  if (fileLoad) fileLoad.addEventListener('change', handleFileLoad);
}

function clearAll() {
  const q = $('#q');
  if (q) q.value = '';

  const hints = $('#hints');
  if (hints) { hints.hidden = true; hints.innerHTML = ''; }

  const card = $('#card');
  if (card) card.hidden = true;

  const noEl = $('#noResults');
  if (noEl) noEl.hidden = true;

  CURRENT_IDX = null;
}

async function handleFileLoad(ev) {
  const file = ev.target.files?.[0];
  if (!file) return;

  setStatus('Processando...', 'info');

  try {
    const text = await file.text();
    const data = JSON.parse(text);

    if (!data || Object.keys(data).length === 0) {
      throw new Error('Arquivo vazio');
    }

    console.log('📁 Carregado:', Object.keys(data).length, 'itens');
    processData(data, true);

  } catch (error) {
    setStatus(`Erro: ${error.message}`, 'error');
  } finally {
    ev.target.value = '';
  }
}

/* ====== Inicialização ====== */
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 App iniciado');
  loadCfg();
  setupInterface();

  // Carrega base em background
  loadData().catch(e => console.warn('Carregamento falhou:', e.message));
});