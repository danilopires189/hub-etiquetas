/* ===== Util ===== */
const $ = (sel) => document.querySelector(sel);
const padLeft = (numStr, len) => (Array(len + 1).join('0') + numStr).slice(-len);
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

/* ===== Estado Global ===== */
let generationHistory = JSON.parse(localStorage.getItem('etiquetas-history') || '[]');

// Limpar duplicatas do histórico existente na inicialização
function cleanDuplicateHistory() {
  const uniqueHistory = [];
  const seen = new Set();
  
  for (const item of generationHistory) {
    const key = `${item.base}-${item.qtd}-${item.copias}-${item.labelType}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueHistory.push(item);
    }
  }
  
  if (uniqueHistory.length !== generationHistory.length) {
    generationHistory = uniqueHistory.slice(0, 5); // Manter apenas os 5 mais recentes
    localStorage.setItem('etiquetas-history', JSON.stringify(generationHistory));
  }
}

/* ===== Validações ===== */
function validateField(fieldId, value, rules) {
  const field = $(`#${fieldId}`);
  const validation = $(`#${fieldId}-validation`);

  if (!validation) return true;

  let isValid = true;
  let message = '';
  let type = 'success';

  for (const rule of rules) {
    const result = rule(value);
    if (result !== true) {
      isValid = false;
      message = result.message;
      type = result.type || 'error';
      break;
    }
  }

  // Aplicar estilos visuais
  field.classList.remove('error', 'warning', 'success');
  if (value && value.toString().trim()) {
    field.classList.add(type);
  }

  // Mostrar mensagem
  validation.textContent = message;
  validation.className = `field-validation ${type}`;

  return isValid;
}

const validationRules = {
  base: [
    (value) => {
      if (!value || !value.toString().trim()) {
        return { message: 'Campo obrigatório', type: 'error' };
      }
      if (!/^\d+$/.test(value)) {
        return { message: 'Apenas números são permitidos', type: 'error' };
      }
      if (value.length < 4) {
        return { message: 'Mínimo 4 dígitos recomendado', type: 'warning' };
      }
      if (value.length > 12) {
        return { message: 'Máximo 12 dígitos recomendado', type: 'warning' };
      }
      return true;
    }
  ],
  qtd: [
    (value) => {
      const num = parseInt(value);
      if (isNaN(num) || num < 1) {
        return { message: 'Mínimo 1', type: 'error' };
      }
      if (num > 1000) {
        return { message: 'Máximo 1000', type: 'error' };
      }
      if (num > 100) {
        return { message: 'Quantidade alta pode ser lenta', type: 'warning' };
      }
      return true;
    }
  ],
  copias: [
    (value) => {
      const num = parseInt(value);
      if (isNaN(num) || num < 1) {
        return { message: 'Mínimo 1', type: 'error' };
      }
      if (num > 50) {
        return { message: 'Máximo 50', type: 'error' };
      }
      if (num > 10) {
        return { message: 'Muitas cópias podem ser desnecessárias', type: 'warning' };
      }
      return true;
    }
  ]
};

function updateCalculatedInfo() {
  const base = $('#base').value.trim();
  const qtd = parseInt($('#qtd').value) || 0;
  const copias = parseInt($('#copias').value) || 0;
  const labelType = $('#labelType').value;

  // Limpar informação do campo base
  const baseInfo = $('#base-info');
  const qtdInfo = $('#qtd-info');
  
  // Mostrar etiqueta final calculada logo abaixo da inicial
  if (base && /^\d+$/.test(base) && qtd > 0) {
    const baseNum = parseInt(base);
    const finalNum = baseNum + qtd - 1;
    const finalFormatted = padLeft(String(finalNum), base.length);
    baseInfo.textContent = `Etiqueta final: ${finalFormatted}`;
  } else {
    baseInfo.textContent = '';
  }
  
  // Limpar info do campo quantidade
  qtdInfo.textContent = '';

  // Calcular total de etiquetas
  let totalLabels = 0;
  if (labelType === 'external') {
    totalLabels = qtd * copias;
  } else if (labelType === 'internal') {
    totalLabels = qtd * 2; // Sempre 2 cópias para internas
  } else if (labelType === 'both') {
    totalLabels = (qtd * copias) + (qtd * 2);
  }

  $('#total-labels').textContent = `${totalLabels} etiquetas`;
}

function setVars() {
  const logoPct = clamp(parseInt($('#logoop').value || '60', 10), 0, 100);
  const transPct = clamp(parseInt($('#transpop').value || '30', 10), 0, 100);
  $('#logoop').value = logoPct;
  $('#transpop').value = transPct;

  document.documentElement.style.setProperty('--label-w-mm', $('#wmm').value);
  document.documentElement.style.setProperty('--label-h-mm', $('#hmm').value);
  document.documentElement.style.setProperty('--textcol-mm', $('#colmm').value);
  document.documentElement.style.setProperty('--font-pt', $('#tpt').value);
  document.documentElement.style.setProperty('--logo-mm', $('#logomm').value);
  document.documentElement.style.setProperty('--logo-opacity', (logoPct / 100).toFixed(2));
  document.documentElement.style.setProperty('--transp-opacity', (transPct / 100).toFixed(2));
  document.body.classList.toggle('print-no-logo', $('#logoPrintOff').checked);
}

/* DV Mod10 (1-3) — pesos alternados a partir do dígito menos significativo: 1,3,1,3... */
function dvMod10_31(base) {
  let s = 0, n = base.length;
  for (let i = 0; i < n; i++) {
    const d = base.charCodeAt(i) - 48;
    const w = ((n - 1 - i) % 2 === 0) ? 1 : 3; // 1 no dígito mais à direita
    s += d * w;
  }
  return (10 - (s % 10)) % 10;
}

const sumDigits = s => s.split("").reduce((a, b) => a + (+b), 0);

/* ===== ITF (Interleaved 2 of 5) ===== */
/* padrões por dígito: n = estreito(1), w = largo(3) */
const ITF_MAP = {
  '0': 'nnwwn', '1': 'wnnnw', '2': 'nwnnw', '3': 'wwnnn', '4': 'nnwnw',
  '5': 'wnwnn', '6': 'nwwnn', '7': 'nnnww', '8': 'wnnwn', '9': 'nwnwn'
};
const NARROW = 1, WIDE = 3;

/* Renderiza ITF em um <svg>. Requer quantidade PAR de dígitos. */
function renderITF(svg, payload) {
  if (!/^\d+$/.test(payload)) throw new Error('ITF requer apenas dígitos.');
  if ((payload.length % 2) !== 0) throw new Error('ITF requer quantidade PAR de dígitos (pares intercalados).');

  const widths = [];
  let quiet = 10;

  // START: barra/espaço/barra/espaço (estreitos)
  widths.push(NARROW, NARROW, NARROW, NARROW);

  // dígitos em pares
  for (let i = 0; i < payload.length; i += 2) {
    const a = ITF_MAP[payload[i]];
    const b = ITF_MAP[payload[i + 1]];
    for (let j = 0; j < 5; j++) {
      widths.push(a[j] === 'w' ? WIDE : NARROW); // barra
      widths.push(b[j] === 'w' ? WIDE : NARROW); // espaço
    }
  }

  // STOP: barra larga, espaço estreito, barra estreita
  widths.push(WIDE, NARROW, NARROW);

  const vbW = quiet + widths.reduce((acc, w) => acc + w, 0) + 10;
  const vbH = 100;

  while (svg.firstChild) svg.removeChild(svg.firstChild);
  svg.setAttribute('viewBox', `0 0 ${vbW} ${vbH}`);
  svg.setAttribute('class', 'barcode');
  svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

  let x = quiet;
  for (let i = 0; i < widths.length; i++) {
    const w = widths[i];
    if (i % 2 === 0) {
      const r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      r.setAttribute('x', x); r.setAttribute('y', 0);
      r.setAttribute('width', w); r.setAttribute('height', vbH);
      r.setAttribute('fill', '#000');
      svg.appendChild(r);
    }
    x += w;
  }
}

/* ===== UI ===== */
function buildLabel({ numeroBase, dv, orient, showLogo, showSafeIcon, mode = 'normal' }) {
  const isInternal = mode === 'internal';

  const label = document.createElement('div');
  label.className = `label ${isInternal ? 'internal ' : ''}${orient}`;

  let svg;
  if (!isInternal) {
    const left = document.createElement('div');
    left.className = 'bar-left';
    const svgwrap = document.createElement('div');
    svgwrap.className = 'svgwrap';
    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svgwrap.appendChild(svg);
    left.appendChild(svgwrap);
    label.appendChild(left);
  }

  const right = document.createElement('div');
  right.className = 'text-right';

  if (showLogo && !isInternal) {
    const imgPM = document.createElement('img');
    imgPM.src = 'pm.png';
    imgPM.alt = 'Pague Menos';
    imgPM.className = 'logo';
    right.appendChild(imgPM);
  }

  const legend = document.createElement('div');
  legend.className = 'legend';
  legend.textContent = (mode === 'internal') ? `${numeroBase}` : `${numeroBase}-${dv}`;
  right.appendChild(legend);

  if (showSafeIcon) {
    const mark = document.createElement('div');
    mark.className = 'transp-icon';
    right.appendChild(mark);
  }

  label.appendChild(right);

  if (!isInternal) {
    const payload = `${numeroBase}`; // DV somente na legenda
    renderITF(svg, payload);
  }
  return label;
}

async function gerar() {
  try {
    setVars();

    // Validar todos os campos
    const baseValid = validateField('base', $('#base').value.trim(), validationRules.base);
    const qtdValid = validateField('qtd', $('#qtd').value, validationRules.qtd);
    const copiasValid = validateField('copias', $('#copias').value, validationRules.copias);

    if (!baseValid || !qtdValid || !copiasValid) {
      return;
    }

    const base = $('#base').value.trim();
    const qtd = parseInt($('#qtd').value, 10);
    const copias = parseInt($('#copias').value, 10);
    const orient = $('#orient').value;
    const showLogo = $('#logo').checked;
    const showSafeIcon = $('#safeicon').checked;
    const labelType = $('#labelType').value;

    // Mostrar barra de progresso
    const progressContainer = $('#progress-container');
    const progressFill = $('#progress-fill');
    const progressText = $('#progress-text');

    progressContainer.style.display = 'block';
    progressFill.style.width = '0%';

    const out = $('#preview');
    out.innerHTML = '';
    const len = base.length;

    // Calcular total de operações para progresso
    let totalOperations = 0;
    if (labelType === 'external' || labelType === 'both') totalOperations += qtd * copias;
    if (labelType === 'internal' || labelType === 'both') totalOperations += qtd * 2;

    let currentOperation = 0;

    // Função para atualizar progresso
    const updateProgress = () => {
      const percent = Math.round((currentOperation / totalOperations) * 100);
      progressFill.style.width = `${percent}%`;
      progressText.textContent = `Gerando... ${currentOperation}/${totalOperations}`;
    };

    for (let i = 0; i < qtd; i++) {
      const atual = padLeft(String(parseInt(base, 10) + i), len);
      const dv = dvMod10_31(atual);
      const payloadBase = (atual.length % 2 === 0) ? atual : ('0' + atual);

      // Gerar etiquetas externas (com barras)
      if (labelType === 'external' || labelType === 'both') {
        for (let c = 0; c < copias; c++) {
          const el = buildLabel({ numeroBase: payloadBase, dv, orient, showLogo, showSafeIcon });
          out.appendChild(el);
          currentOperation++;
          updateProgress();

          // Permitir que a UI responda a cada 10 etiquetas
          if (currentOperation % 10 === 0) {
            await new Promise(resolve => setTimeout(resolve, 1));
          }
        }
      }

      // Gerar etiquetas internas (sem barras)
      if (labelType === 'internal' || labelType === 'both') {
        const last4 = atual.slice(-4);
        for (let k = 0; k < 2; k++) {
          const elInt = buildLabel({ numeroBase: last4, dv: null, orient: 'h', showLogo: false, showSafeIcon: false, mode: 'internal' });
          out.appendChild(elInt);
          currentOperation++;
          updateProgress();

          if (currentOperation % 10 === 0) {
            await new Promise(resolve => setTimeout(resolve, 1));
          }
        }
      }
    }

    // Ocultar barra de progresso
    progressContainer.style.display = 'none';

    // Calcular próximo número para histórico
    const ultimoNumero = padLeft(String(parseInt(base, 10) + qtd - 1), base.length);
    const proximoNumero = padLeft(String(parseInt(base, 10) + qtd), base.length);

    // Salvar no histórico
    saveToHistory({
      base,
      qtd,
      copias,
      labelType,
      orient,
      ultimoNumero,
      proximoNumero,
      timestamp: new Date().toISOString(),
      totalLabels: currentOperation
    });

  } catch (e) {
    $('#progress-container').style.display = 'none';
    alert('Erro: ' + e.message);
  }
}



function saveToHistory(config) {
  // Verificar se já existe uma entrada similar (mesmo base, qtd, copias, labelType)
  const existingIndex = generationHistory.findIndex(item => 
    item.base === config.base && 
    item.qtd === config.qtd && 
    item.copias === config.copias && 
    item.labelType === config.labelType
  );

  // Se encontrou uma entrada similar, remover a antiga
  if (existingIndex !== -1) {
    generationHistory.splice(existingIndex, 1);
  }

  // Adicionar a nova entrada no início
  generationHistory.unshift({
    ...config,
    id: Date.now()
  });

  // Manter apenas os últimos 5 registros
  if (generationHistory.length > 5) {
    generationHistory = generationHistory.slice(0, 5);
  }

  localStorage.setItem('etiquetas-history', JSON.stringify(generationHistory));
}



/* ===== Histórico ===== */
function showHistorico() {
  const modal = $('#historico-modal');
  const list = $('#historico-list');

  if (generationHistory.length === 0) {
    list.innerHTML = '<p style="text-align: center; color: var(--muted);">Nenhum histórico encontrado</p>';
  } else {
    list.innerHTML = generationHistory.map(item => `
      <div class="historico-item">
        <div class="historico-info">
          <strong>Etiqueta: ${item.base} até ${item.ultimoNumero} | ${item.qtd} números | ${item.copias} cópias</strong>
          <small>
            Tipo: ${item.labelType} | ${item.totalLabels} etiquetas | 
            ${new Date(item.timestamp).toLocaleString('pt-BR')}
          </small>
        </div>
        <div class="historico-actions">
          <button class="btn btn-ghost btn-small" onclick="loadFromHistory(${item.id})">▶️ Continuar</button>
        </div>
      </div>
    `).join('');
  }

  modal.style.display = 'flex';
}

function hideHistorico() {
  $('#historico-modal').style.display = 'none';
}

function loadFromHistory(id) {
  const item = generationHistory.find(h => h.id === id);
  if (!item) return;

  // Inserir com continuação (+1 do último número)
  $('#base').value = item.proximoNumero || item.base;
  $('#qtd').value = item.qtd;
  $('#copias').value = item.copias;
  $('#labelType').value = item.labelType;
  $('#orient').value = item.orient;

  // Atualizar validações e informações
  validateField('base', item.proximoNumero || item.base, validationRules.base);
  validateField('qtd', item.qtd, validationRules.qtd);
  validateField('copias', item.copias, validationRules.copias);
  updateCalculatedInfo();

  hideHistorico();
}

function clearHistory() {
  if (confirm('Tem certeza que deseja limpar todo o histórico?')) {
    generationHistory = [];
    localStorage.removeItem('etiquetas-history');
    showHistorico(); // Atualizar a visualização
  }
}

document.addEventListener('DOMContentLoaded', () => {
  $('#gerar').addEventListener('click', gerar);
  $('#imprimir').addEventListener('click', () => window.print());

  // Histórico
  $('#historico-btn').addEventListener('click', showHistorico);
  $('#historico-close').addEventListener('click', hideHistorico);
  $('#limpar-historico').addEventListener('click', clearHistory);

  // Fechar modal clicando fora
  $('#historico-modal').addEventListener('click', (e) => {
    if (e.target === $('#historico-modal')) hideHistorico();
  });

  // Validação em tempo real
  ['base', 'qtd', 'copias'].forEach(fieldId => {
    const field = $(`#${fieldId}`);
    if (field) {
      field.addEventListener('input', (e) => {
        validateField(fieldId, e.target.value, validationRules[fieldId]);
        updateCalculatedInfo();
      });
      field.addEventListener('blur', (e) => {
        validateField(fieldId, e.target.value, validationRules[fieldId]);
      });
    }
  });

  // Atualizar informações quando outros campos mudarem
  $('#labelType').addEventListener('change', updateCalculatedInfo);

  ['wmm', 'hmm', 'colmm', 'tpt', 'logomm', 'logoop', 'transpop', 'logoPrintOff'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', setVars);
    if (el) el.addEventListener('change', setVars);
  });

  document.addEventListener('keydown', (ev) => {
    if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'g') { ev.preventDefault(); gerar(); }
    if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'h') { ev.preventDefault(); showHistorico(); }
    if (ev.key === 'Escape') { hideHistorico(); }
  });

  // Inicialização
  cleanDuplicateHistory(); // Limpar duplicatas existentes
  setVars();
  updateCalculatedInfo();
});



// Expor funções globalmente para uso inline
window.gerar = gerar;
window.loadFromHistory = loadFromHistory;
