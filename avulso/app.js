/* ===== Util ===== */
const $ = (sel) => document.querySelector(sel);
const padLeft = (numStr, len) => (Array(len + 1).join('0') + numStr).slice(-len);
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

/* ===== Estado Global do Histórico ===== */
let avulsoGenerationHistory = JSON.parse(localStorage.getItem('avulso-etiquetas-history') || '[]');

// Limpar duplicatas do histórico existente na inicialização
function cleanDuplicateAvulsoHistory() {
  const uniqueHistory = [];
  const seen = new Set();

  // Ordenar por timestamp (mais recente primeiro)
  const sortedHistory = [...avulsoGenerationHistory].sort((a, b) =>
    new Date(b.timestamp || 0) - new Date(a.timestamp || 0)
  );

  for (const item of sortedHistory) {
    // Criar chave única mais específica
    const key = `${item.etiquetaId}-${item.qtdCaixas}-${item.matricula}`;

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
  if (uniqueHistory.length !== avulsoGenerationHistory.length) {
    avulsoGenerationHistory = uniqueHistory.slice(0, 50); // Manter apenas os 50 mais recentes
    try {
      localStorage.setItem('avulso-etiquetas-history', JSON.stringify(avulsoGenerationHistory));
      console.log(`Histórico avulso limpo: ${sortedHistory.length - uniqueHistory.length} duplicatas removidas`);
    } catch (e) {
      console.warn('Erro ao salvar histórico avulso limpo:', e.message);
    }
  }
}

// Limpeza automática por idade (90 dias)
function cleanOldAvulsoRecords() {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 90);

  const cleaned = avulsoGenerationHistory.filter(item => {
    const itemDate = new Date(item.timestamp);
    return itemDate >= cutoffDate;
  });

  if (cleaned.length !== avulsoGenerationHistory.length) {
    console.log(`Removidos ${avulsoGenerationHistory.length - cleaned.length} registros antigos do histórico avulso`);
    avulsoGenerationHistory = cleaned;
    try {
      localStorage.setItem('avulso-etiquetas-history', JSON.stringify(avulsoGenerationHistory));
    } catch (e) {
      console.warn('Erro ao salvar histórico avulso após limpeza:', e.message);
    }
  }
}

/* ===== Funções do Histórico ===== */
function showAvulsoHistorico() {
  const modal = $('#avulso-historico-modal');

  // Limpar registros antigos antes de exibir
  cleanOldAvulsoRecords();

  // Resetar estado da busca (fechado por padrão)
  const searchSection = $('#avulso-search-section');
  const toggleBtn = $('#avulso-toggle-search');
  if (searchSection) searchSection.style.display = 'none';
  if (toggleBtn) toggleBtn.classList.remove('active');

  // Limpar busca anterior
  const searchInput = $('#avulso-search-input');
  if (searchInput) {
    searchInput.value = '';
  }
  clearAvulsoSearch(); // Garante que filtros também resetem

  // Renderizar lista completa
  renderAvulsoHistoryList(avulsoGenerationHistory);

  modal.style.display = 'flex';

  // Configurar eventos de busca
  setupAvulsoSearchEvents();

  // Foco para acessibilidade
  const closeBtn = $('#avulso-historico-close');
  if (closeBtn) closeBtn.focus();
}

function renderAvulsoHistoryList(historyData) {
  const list = $('#avulso-historico-list');

  if (historyData.length === 0) {
    const searchInput = $('#avulso-search-input');
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
          <div style="font-size: 3rem; margin-bottom: 1rem;">📋</div>
          <p style="color: var(--neutral-500); font-size: var(--text-base); margin-bottom: 0.5rem;">Nenhum histórico encontrado</p>
          <p style="color: var(--neutral-400); font-size: var(--text-sm);">Gere algumas etiquetas para ver o histórico aqui</p>
        </div>
      `;
    }
  } else {
    list.innerHTML = historyData.map((item, index) => {
      const html = createHistoryItemHTML(item);
      return html.replace('class="historico-item"', `class="historico-item" style="animation-delay: ${index * 0.05}s"`);
    }).join('');

    // Adicionar informações de estatísticas
    const totalRecords = avulsoGenerationHistory.length;
    const showingRecords = historyData.length;
    const isFiltered = totalRecords !== showingRecords;

    const statsHtml = `
      <div style="text-align: center; padding: 1rem; margin-top: 1rem; border-top: 1px solid var(--neutral-200);">
        <small style="color: var(--neutral-500);">
          ${isFiltered ? `Mostrando ${showingRecords} de ${totalRecords}` : `${totalRecords}`} 
          ${totalRecords === 1 ? 'registro' : 'registros'} no histórico
          ${totalRecords > 0 ? ` • Mais antigo: ${new Date(avulsoGenerationHistory[avulsoGenerationHistory.length - 1].timestamp).toLocaleDateString('pt-BR')}` : ''}
        </small>
      </div>
    `;
    list.innerHTML += statsHtml;
  }
}

function setupAvulsoSearchEvents() {
  const searchInput = $('#avulso-search-input');
  const clearButton = $('#avulso-clear-search');
  const filterRadios = document.querySelectorAll('input[name="searchType"]');

  // Evento de busca em tempo real
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      performAvulsoSearch();
      // Mostrar/ocultar botão de limpar
      const clearBtn = $('#avulso-clear-search');
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
        clearAvulsoSearch();
      }
    });
  }

  // Botão limpar busca
  if (clearButton) {
    clearButton.addEventListener('click', clearAvulsoSearch);
  }

  // Filtros de tipo
  filterRadios.forEach(radio => {
    radio.addEventListener('change', performAvulsoSearch);
  });
}

function performAvulsoSearch() {
  const searchInput = $('#avulso-search-input');
  const searchTerm = searchInput ? searchInput.value.trim().toLowerCase() : '';
  const selectedFilter = document.querySelector('input[name="searchType"]:checked')?.value || 'all';

  let filteredHistory = [...avulsoGenerationHistory];

  if (searchTerm) {
    filteredHistory = avulsoGenerationHistory.filter(item => {
      switch (selectedFilter) {
        case 'matricula':
          return item.matricula && item.matricula.toLowerCase().includes(searchTerm);

        case 'etiqueta':
          return item.etiquetaId && item.etiquetaId.toLowerCase().includes(searchTerm);

        case 'data':
          return item.dataCriacao && item.dataCriacao.includes(searchTerm);

        case 'all':
        default:
          return (
            (item.matricula && item.matricula.toLowerCase().includes(searchTerm)) ||
            (item.etiquetaId && item.etiquetaId.toLowerCase().includes(searchTerm)) ||
            (item.dataCriacao && item.dataCriacao.includes(searchTerm)) ||
            (item.tipoMovimentacao && item.tipoMovimentacao.toLowerCase().includes(searchTerm))
          );
      }
    });
  }

  renderAvulsoHistoryList(filteredHistory);
}

function clearAvulsoSearch() {
  const searchInput = $('#avulso-search-input');
  const clearBtn = $('#avulso-clear-search');

  if (searchInput) {
    searchInput.value = '';
  }

  // Ocultar botão de limpar
  if (clearBtn) {
    clearBtn.style.opacity = '0';
    clearBtn.style.visibility = 'hidden';
  }

  // Resetar para "Todos"
  const allFilter = document.querySelector('input[name="searchType"][value="all"]');
  if (allFilter) {
    allFilter.checked = true;
  }

  renderAvulsoHistoryList(avulsoGenerationHistory);

  // Foco de volta no input
  if (searchInput) {
    searchInput.focus();
  }
}

function hideAvulsoHistorico() {
  const modal = $('#avulso-historico-modal');
  modal.style.display = 'none';
}

function createHistoryItemHTML(item) {
  return `
    <div class="historico-item">
      <div class="historico-info">
        <div class="historico-primary">
          <strong>Etiqueta: ${item.etiquetaId}</strong>
          <span class="historico-badge">${item.qtdCaixas} ${item.qtdCaixas === 1 ? 'caixa' : 'caixas'}</span>
        </div>
        <div class="historico-secondary">
          <span>Depósito: ${item.deposito}</span>
          <span>Tipo: ${item.tipoMovimentacao}</span>
          <span>Matrícula: ${item.matricula}${item.nome ? ' - ' + item.nome : ''}</span>
        </div>
        <div class="historico-meta">
          <span>${item.dataCriacao} às ${item.horaCriacao}</span>
        </div>
      </div>
    </div>
  `;
}



function showSuccessMessage(message) {
  // Criar elemento de feedback
  const feedback = document.createElement('div');
  feedback.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: var(--success);
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    box-shadow: var(--shadow-lg);
    z-index: 10000;
    font-size: 14px;
    font-weight: 500;
    opacity: 0;
    transform: translateX(100%);
    transition: all 0.3s ease;
  `;
  feedback.textContent = message;

  document.body.appendChild(feedback);

  // Animar entrada
  setTimeout(() => {
    feedback.style.opacity = '1';
    feedback.style.transform = 'translateX(0)';
  }, 100);

  // Remover após 3 segundos
  setTimeout(() => {
    feedback.style.opacity = '0';
    feedback.style.transform = 'translateX(100%)';
    setTimeout(() => {
      if (feedback.parentNode) {
        feedback.parentNode.removeChild(feedback);
      }
    }, 300);
  }, 3000);
}

function saveToAvulsoHistory(config) {
  // Criar chave única para identificar duplicatas
  const uniqueKey = `${config.etiquetaId}-${config.qtdCaixas}-${config.matricula}`;

  // Verificar se já existe uma entrada com a mesma configuração
  const existingIndex = avulsoGenerationHistory.findIndex(item => {
    const itemKey = `${item.etiquetaId}-${item.qtdCaixas}-${item.matricula}`;
    return itemKey === uniqueKey;
  });

  // Se encontrou uma entrada similar, remover a antiga
  if (existingIndex !== -1) {
    avulsoGenerationHistory.splice(existingIndex, 1);
    console.log('Removida entrada duplicada do histórico avulso');
  }

  // Adicionar a nova entrada no início
  // Tentar encontrar o nome do usuário
  let nomeUsuario = '';
  if (window.DB_USUARIO && window.DB_USUARIO.BASE_USUARIO) {
    const usuario = window.DB_USUARIO.BASE_USUARIO.find(u => u.Matricula == config.matricula);
    if (usuario) {
      nomeUsuario = usuario.Nome;
    }
  }

  avulsoGenerationHistory.unshift({
    ...config,
    nome: nomeUsuario,
    id: Date.now() + Math.random(), // ID único para evitar conflitos
    uniqueKey
  });

  // Manter apenas os últimos 50 registros únicos
  if (avulsoGenerationHistory.length > 50) {
    avulsoGenerationHistory = avulsoGenerationHistory.slice(0, 50);
  }

  // Limpar registros antigos (90 dias)
  cleanOldAvulsoRecords();

  // Salvar no localStorage
  try {
    localStorage.setItem('avulso-etiquetas-history', JSON.stringify(avulsoGenerationHistory));
    console.log('✅ Histórico avulso salvo:', config.etiquetaId, '- Total:', avulsoGenerationHistory.length, 'entradas');
  } catch (e) {
    console.warn('⚠️ Erro ao salvar histórico avulso:', e.message);

    // Tentar limpeza emergencial
    if (e.name === 'QuotaExceededError') {
      try {
        // Manter apenas os 10 registros mais recentes
        avulsoGenerationHistory = avulsoGenerationHistory.slice(0, 10);
        localStorage.setItem('avulso-etiquetas-history', JSON.stringify(avulsoGenerationHistory));
        console.log('🧹 Limpeza emergencial do histórico avulso executada');
      } catch (emergencyError) {
        console.error('❌ Falha na limpeza emergencial:', emergencyError.message);
        // Limpar completamente se necessário
        localStorage.removeItem('avulso-etiquetas-history');
        avulsoGenerationHistory = [];
      }
    }
  }
}

const DEPOSITO_MAP = {
  '1': '0124', '2': '0579', '3': '0633', '4': '0875', '5': '1198', '6': '0342', '7': '0351', '8': '0536', '9': '0252'
};

function setVars() {
  const logoPct = clamp(parseInt($('#logoop').value || '100', 10), 0, 100);
  const transPct = clamp(parseInt($('#transpop').value || '0', 10), 0, 100);
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

/* ============ Código de Barras (CODE128 via JsBarcode) ============ */
function renderCode128(svg, text, opts = {}) {
  if (window.JsBarcode) {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    svg.setAttribute('class', 'barcode');
    JsBarcode(svg, text, {
      format: 'CODE128',
      displayValue: false,
      margin: 0,
      width: 2,      // barras um pouco mais largas (melhor leitura)
      height: 80,    // a altura real é controlada pelo CSS do container
      ...opts
    });
  } else {
    // Fallback simples: escreve no SVG um texto
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    t.setAttribute('x', '0'); t.setAttribute('y', '20');
    t.textContent = text;
    svg.appendChild(t);
  }
}

/* ============ QR Code (qrcode-generator) ============ */
function renderQR(div, text) {
  div.innerHTML = '';
  if (window.qrcode) {
    const qr = window.qrcode(4, 'M'); // versão maior e correção média
    qr.addData(text);
    qr.make();
    const svgTag = qr.createSvgTag({ cellSize: 3, margin: 0 });
    div.innerHTML = svgTag;
  } else {
    const img = document.createElement('img');
    img.alt = 'QR';
    const u = encodeURIComponent(text);
    img.src = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${u}`;
    div.appendChild(img);
  }
}

function buildLabel({ codigoDotted, codigoCompact, orient, depNum, partes, idxParte, matricula, tipoMovimentacao }) {
  const label = document.createElement('div');
  label.className = `label ${orient}`;

  // ===== Header =====
  const header = document.createElement('div');
  header.className = 'label-header';
  const title = document.createElement('div');
  title.className = 'title';
  title.textContent = `VOLUME AVULSO CD ${depNum}`;
  const logos = document.createElement('div');
  logos.className = 'header-logos';
  const imgPM = document.createElement('img');
  imgPM.src = '../assets/pm.png'; imgPM.alt = 'Pague Menos';
  imgPM.onerror = () => { imgPM.style.display = 'none'; };
  logos.append(imgPM);
  header.append(title, logos);
  label.appendChild(header);

  // ===== Body =====
  const body = document.createElement('div');
  body.className = 'body';

  // Tipo de Movimentação (acima do código de barras)
  const tipoDiv = document.createElement('div');
  tipoDiv.className = 'tipo-movimentacao';
  tipoDiv.textContent = tipoMovimentacao;
  body.appendChild(tipoDiv);

  // Barras
  const bars = document.createElement('div');
  bars.className = 'bars';
  const svgwrap = document.createElement('div');
  svgwrap.className = 'svgwrap';
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svgwrap.appendChild(svg);
  const hrtext = document.createElement('div');
  hrtext.className = 'hrtext';
  hrtext.textContent = codigoDotted;
  bars.append(svgwrap, hrtext);

  // QR
  const qrwrap = document.createElement('div');
  qrwrap.className = 'qrwrap';
  const qrDiv = document.createElement('div');
  qrDiv.className = 'qr';
  qrwrap.append(qrDiv);

  // Caixa de volume (fracionamento)
  const vbox = document.createElement('div');
  vbox.className = 'volume-box';
  const vt = document.createElement('div'); vt.className = 'vtitle'; vt.textContent = 'VOLUME';
  const vb = document.createElement('div'); vb.className = 'vbig'; vb.textContent = `${idxParte}/${partes}`;
  const vs = document.createElement('div'); vs.className = 'vsmall'; vs.textContent = (partes > 1 ? 'VOLUME FRACIONADO' : '');
  vbox.append(vt, vb, vs);

  body.append(bars, qrwrap, vbox);
  label.appendChild(body);

  // ===== Meta =====
  const meta = document.createElement('div');
  meta.className = 'meta';
  const now = new Date();
  const mm = padLeft(String(now.getMonth() + 1), 2);
  const dd = padLeft(String(now.getDate()), 2);
  const yy = String(now.getFullYear()).slice(-2);
  const hh = padLeft(String(now.getHours()), 2);
  const mi = padLeft(String(now.getMinutes()), 2);
  meta.innerHTML = `<span>CD: <strong>${depNum}</strong></span><span>MATRÍCULA: <strong>${matricula || '-'}</strong></span><span>DATA DA CRIAÇÃO: <strong>${dd}/${mm}/20${yy} ${hh}:${mi}</strong></span><span></span>`;
  label.appendChild(meta);

  // Renderizadores
  renderCode128(svg, codigoDotted);
  renderQR(qrDiv, codigoDotted);

  return label;
}

function gerar() {
  try {
    setVars();

    const depo = $('#deposito').value;
    if (!/^[1-9]$/.test(depo)) {
      alert('Escolha um depósito entre 1 e 9.');
      return false;
    }
    const depCode = DEPOSITO_MAP[depo];
    const depNum = parseInt(depo, 10);

    const tipo = ($('#tipo').value || '').toUpperCase();
    if (!tipo) { alert('Selecione o Tipo de Movimentação.'); return false; }

    // Captura o texto completo da opção selecionada
    const tipoSelect = $('#tipo');
    const tipoMovimentacao = tipoSelect.options[tipoSelect.selectedIndex].text;

    const volRaw = $('#volume').value;
    if (volRaw.trim() === '') { alert('Informe o número do volume.'); $('#volume').focus(); return false; }
    const volNum = parseInt(volRaw, 10);
    if (Number.isNaN(volNum) || volNum < 0 || volNum > 99999) { alert('Número do volume deve estar entre 0 e 99999.'); $('#volume').focus(); return false; }
    const volStr = padLeft(String(volNum), 5);

    const partes = parseInt($('#fracao').value || '1', 10);
    if (partes < 1 || partes > 99) { alert('Fracionamento deve ser entre 1 e 99.'); return false; }

    // Validate matricula using shared validation system
    const matriculaInput = $('#matricula');
    const validation = window.UserValidation.validateBeforeGeneration(matriculaInput, (msg, type) => {
      alert(msg);
    });
    
    if (!validation) {
      return false;
    }
    
    const matricula = validation.cleaned;

    const now = new Date();
    const mm = padLeft(String(now.getMonth() + 1), 2);
    const dd = padLeft(String(now.getDate()), 2);
    const yy = String(now.getFullYear()).slice(-2); // YY
    const hh = padLeft(String(now.getHours()), 2);
    const mi = padLeft(String(now.getMinutes()), 2);
    const calendario = `${mm}${yy}`;

    // Código final (dotted): DEPO4.MMYY.TIPO.VOLUME5
    const codigoDotted = `${depCode}.${calendario}.${tipo}.${volStr}`;
    // Otimização barras: remove os pontos para reduzir caracteres e permitir otimização do CODE128C nos blocos numéricos
    const codigoCompact = `${depCode}${calendario}${tipo}${volStr}`;

    const orient = 'h'; // orientação travada programaticamente

    const out = $('#preview');
    out.innerHTML = '';

    for (let i = 1; i <= partes; i++) {
      const el = buildLabel({
        codigoDotted, codigoCompact,
        orient, depNum, partes, idxParte: i, matricula, tipoMovimentacao
      });
      out.appendChild(el);
    }

    // Salvar no histórico após geração bem-sucedida
    console.log('🔄 Salvando no histórico avulso...');
    const historyData = {
      etiquetaId: codigoDotted,
      qtdCaixas: partes,
      dataCriacao: `${dd}/${mm}/20${yy}`,
      horaCriacao: `${hh}:${mi}`,
      matricula: matricula,
      deposito: depo,
      tipoMovimentacao: tipoMovimentacao,
      tipoMovimentacaoCode: tipo,
      volume: volStr,
      proximoVolume: padLeft(String(volNum + 1), 5),
      timestamp: new Date().toISOString()
    };

    console.log('📋 Dados para histórico:', historyData);
    saveToAvulsoHistory(historyData);

    return true;
  } catch (e) {
    alert('Erro: ' + e.message);
    return false;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // Initialize user validation system
  initializeUserValidation();
  
  $('#gerar').addEventListener('click', async () => {
    const success = gerar();
    
    // Registrar geração no Supabase após gerar etiquetas com sucesso
    if (success && window.supabaseManager && window.contadorGlobal && window.contadorGlobal.isSupabaseIntegrated()) {
      try {
        const depo = $('#deposito').value;
        const partes = parseInt($('#fracao').value || '1', 10);
        const matricula = $('#matricula').value.trim();
        const tipo = $('#tipo').value;
        const tipoSelect = $('#tipo');
        const tipoMovimentacao = tipoSelect.options[tipoSelect.selectedIndex].text;
        
        const labelData = {
          applicationType: 'avulso',
          quantity: partes,
          copies: 1,
          metadata: {
            source: 'avulso_module',
            deposito: depo,
            tipoMovimentacao: tipoMovimentacao,
            tipoMovimentacaoCode: tipo,
            matricula: matricula,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent
          }
        };
        
        await window.supabaseManager.saveLabelGeneration(labelData);
        console.log('✅ Geração de avulso registrada no Supabase');
      } catch (error) {
        console.warn('⚠️ Falha ao registrar geração no Supabase:', error);
      }
    }
  });
  
  $('#imprimir').addEventListener('click', () => window.print());

  // Controles do histórico
  $('#avulso-historico-btn').addEventListener('click', showAvulsoHistorico);
  $('#avulso-historico-close').addEventListener('click', hideAvulsoHistorico);

  // Fechar modal clicando fora
  $('#avulso-historico-modal').addEventListener('click', (e) => {
    if (e.target === $('#avulso-historico-modal')) {
      hideAvulsoHistorico();
    }
  });

  // Toggle da busca
  const toggleSearchBtn = $('#avulso-toggle-search');
  if (toggleSearchBtn) {
    toggleSearchBtn.addEventListener('click', () => {
      const searchSection = $('#avulso-search-section');
      const isHidden = searchSection.style.display === 'none';

      if (isHidden) {
        searchSection.style.display = 'block';
        toggleSearchBtn.classList.add('active');
        const input = $('#avulso-search-input');
        if (input) setTimeout(() => input.focus(), 100);
      } else {
        searchSection.style.display = 'none';
        toggleSearchBtn.classList.remove('active');
      }
    });
  }

  ['wmm', 'hmm', 'colmm', 'tpt', 'logomm', 'logoop', 'transpop', 'logoPrintOff'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', setVars);
    if (el) el.addEventListener('change', setVars);
  });

  // Add real-time matricula validation
  const matriculaInput = $('#matricula');
  if (matriculaInput) {
    let validationTimeout = null;
    
    matriculaInput.addEventListener('input', (e) => {
      // Clear previous timeout
      if (validationTimeout) {
        clearTimeout(validationTimeout);
      }
      
      // Clear any existing error states
      window.UserValidation.clearFieldError(matriculaInput);
      
      const matricula = e.target.value.trim();
      
      // If empty, clear current user and greeting
      if (!matricula) {
        window.UserValidation.clearCurrentUser();
        return;
      }
      
      // Debounce validation to avoid excessive calls
      validationTimeout = setTimeout(() => {
        const validation = window.UserValidation.validateMatricula(matricula);
        
        if (validation.valid && validation.user) {
          // Set current user and update greeting
          window.UserValidation.setCurrentUser(validation.user);
          console.log('✅ Usuário validado em tempo real:', validation.user.Nome);
        } else {
          // Clear current user if validation fails
          window.UserValidation.clearCurrentUser();
        }
      }, 500); // 500ms debounce
    });
    
    // Also validate on blur (when user leaves the field)
    matriculaInput.addEventListener('blur', (e) => {
      const matricula = e.target.value.trim();
      if (matricula) {
        const validation = window.UserValidation.validateMatricula(matricula);
        if (!validation.valid) {
          window.UserValidation.highlightFieldError(matriculaInput, validation.msg, 3000);
        }
      }
    });
    
    console.log('✅ Validação em tempo real configurada para campo matrícula');
  }

  document.addEventListener('keydown', (ev) => {
    if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'g') { ev.preventDefault(); gerar(); }
    if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'h') { ev.preventDefault(); showAvulsoHistorico(); }
    if (ev.key === 'Escape') { hideAvulsoHistorico(); }
  });

  setVars();

  // Inicialização do histórico
  try {
    cleanDuplicateAvulsoHistory();
    cleanOldAvulsoRecords();
    console.log('📊 Histórico avulso inicializado:', avulsoGenerationHistory.length, 'registros');
  } catch (error) {
    console.warn('⚠️ Erro na inicialização do histórico avulso:', error.message);
    avulsoGenerationHistory = [];
  }
});

// Expor funções globalmente para debugging e testes
window.avulsoGenerationHistory = () => avulsoGenerationHistory;
window.showAvulsoHistorico = showAvulsoHistorico;
window.hideAvulsoHistorico = hideAvulsoHistorico;
window.saveToAvulsoHistory = saveToAvulsoHistory;
window.performAvulsoSearch = performAvulsoSearch;
window.clearAvulsoSearch = clearAvulsoSearch;

// User Validation System Initialization
async function initializeUserValidation() {
  try {
    console.log('🔄 Inicializando sistema de validação de usuário...');
    
    // Load user database
    const loaded = await window.UserValidation.loadUserDatabase();
    if (!loaded) {
      console.error('❌ Falha ao carregar base de usuários');
      return;
    }
    
    // Initialize responsive layout system
    window.UserGreeting.initResponsiveLayoutSystem();
    
    console.log('✅ Sistema de validação de usuário inicializado');
    console.log(`📊 Total de usuários carregados: ${window.UserValidation.userCount}`);
    
    // Add test function for debugging
    window.testUserValidationAvulso = () => {
      console.log('🧪 Testando validação de usuário no módulo avulso...');
      
      const matriculaInput = $('#matricula');
      if (!matriculaInput) {
        console.error('❌ Campo matrícula não encontrado');
        return;
      }
      
      // Test with sample matricula
      matriculaInput.value = '81883'; // Sample from BASE_USUARIO.js
      const validation = window.UserValidation.validateMatricula(matriculaInput.value);
      console.log('✅ Resultado da validação:', validation);
      
      if (validation.valid) {
        window.UserValidation.setCurrentUser(validation.user);
        console.log('👋 Saudação atualizada para:', validation.user.Nome);
      }
    };
    
  } catch (error) {
    console.error('❌ Erro na inicialização do sistema de validação:', error);
  }
}
