/* ===== Helpers & Base ===== */
const $ = (sel) => document.querySelector(sel);
const pad = (n, len) => (Array(len + 1).join('0') + String(n)).slice(-len);
const onlyDigits = (s) => String(s || '').replace(/\D+/g, '');

// Exibição como inteiro (sem zeros à esquerda), com fallback
const toIntStr = (v, fallback = 0) => {
  const d = onlyDigits(v);
  return d ? String(Number(d)) : String(Number(fallback));
};

/**
 * Aguardar supabaseManager estar disponível (carregado como ES module)
 * @param {number} timeoutMs - Tempo máximo de espera (default: 5000ms)
 * @returns {Promise<object|null>}
 */
async function waitForSupabaseManager(timeoutMs = 5000) {
  const startTime = Date.now();

  while (!window.supabaseManager && Date.now() - startTime < timeoutMs) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  if (window.supabaseManager) {
    console.log('✅ supabaseManager detectado e disponível (pedido-direto)');
    return window.supabaseManager;
  } else {
    console.warn('⚠️ supabaseManager não carregou a tempo (pedido-direto)');
    return null;
  }
}

// Fallback embutido (injetado no index.html)
let BASE = window.BASE_EMBED || { cds: [], lojas: {}, rotas: {} };

/* ===== Estado Global do Histórico ===== */
let pedidoDiretoHistory = JSON.parse(localStorage.getItem('pedido-direto-history') || '[]');

// Limpar duplicatas do histórico existente na inicialização
function cleanDuplicatePedidoDiretoHistory() {
  const uniqueHistory = [];
  const seen = new Set();

  // Ordenar por timestamp (mais recente primeiro)
  const sortedHistory = [...pedidoDiretoHistory].sort((a, b) =>
    new Date(b.timestamp || 0) - new Date(a.timestamp || 0)
  );

  for (const item of sortedHistory) {
    // Criar chave única mais específica
    const key = `${item.pedido}-${item.loja}-${item.cd}-${item.rota}`;

    if (!seen.has(key)) {
      seen.add(key);
      if (!item.id) item.id = Date.now() + Math.random();
      uniqueHistory.push(item);
    }
  }

  if (uniqueHistory.length !== pedidoDiretoHistory.length) {
    pedidoDiretoHistory = uniqueHistory.slice(0, 50);
    try {
      localStorage.setItem('pedido-direto-history', JSON.stringify(pedidoDiretoHistory));
      console.log(`Histórico limpo: ${sortedHistory.length - uniqueHistory.length} duplicatas removidas`);
    } catch (e) {
      console.warn('Erro ao salvar histórico limpo:', e);
    }
  }
}

// Limpeza automática por idade (90 dias)
function cleanOldPedidoDiretoRecords() {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 90);

  const cleaned = pedidoDiretoHistory.filter(item => {
    const itemDate = new Date(item.timestamp);
    return itemDate >= cutoffDate;
  });

  if (cleaned.length !== pedidoDiretoHistory.length) {
    console.log(`Removidos ${pedidoDiretoHistory.length - cleaned.length} registros antigos`);
    pedidoDiretoHistory = cleaned;
    try {
      localStorage.setItem('pedido-direto-history', JSON.stringify(pedidoDiretoHistory));
    } catch (e) {
      console.warn('Erro ao salvar histórico após limpeza:', e);
    }
  }
}

async function loadBase() {
  try {
    const resp = await fetch('../data_base/BASE_LOJAS.json', { cache: 'no-store' });
    if (resp.ok) {
      BASE = await resp.json();
    }
  } catch (e) {
    console.warn('Base via fetch indisponível, usando embutida.');
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
  const wmmInput = document.querySelector('#wmm');
  const hmmInput = document.querySelector('#hmm');

  document.documentElement.style.setProperty('--label-w-mm', (wmmInput ? wmmInput.value : null) || 156);
  document.documentElement.style.setProperty('--label-h-mm', (hmmInput ? hmmInput.value : null) || 68);
}

function leap(y) {
  return (y % 4 === 0 && y % 100 !== 0) || (y % 400 === 0);
}

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
function montarEtiqueta({ cd, loja, pedido, seq, rota, matricula, volAtual, volTotal }) {
  const wrap = document.createElement('div');
  wrap.className = 'labelwrap';

  const rotSel = document.querySelector('#rotacao').value;
  wrap.classList.add(rotSel === '90' ? 'rot90' : (rotSel === '180' ? 'rot180' : (rotSel === '270' ? 'rot270' : 'rot0')));

  const el = document.createElement('div');
  el.className = 'label';

  // HEADER
  const header = document.createElement('div');
  header.className = 'header';
  const leftTitle = document.createElement('div');
  leftTitle.className = 'title';
  leftTitle.textContent = `PEDIDO DIRETO CD ${Number(cd || 0)}`;
  const logos = document.createElement('div');
  logos.className = 'logos';
  const img1 = document.createElement('img');
  img1.src = '../assets/pm.png';
  img1.alt = 'Pague Menos';
  img1.className = 'brand-logo pm';
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
  addRow('SEQ:', String(Number(onlyDigits(seq))));
  addRow('DT PEDIDO:', dtPedidoStr);
  addRow('ROTA:', getRotaDesc(cd, rota));

  left.appendChild(info);

  // RIGHT (VOLUME)
  const right = document.createElement('div');
  right.className = 'right';

  const vbox = document.createElement('div');
  vbox.className = 'volume-box';

  const vt = document.createElement('div');
  vt.className = 't';
  vt.textContent = 'VOLUME';

  const vb = document.createElement('div');
  vb.className = 'big';
  vb.textContent = `${volAtual}/${volTotal}`;

  vbox.append(vt, vb);

  // Exibir texto adicional apenas quando houver fracionamento (mais de 1 volume)
  if (Number(volTotal) > 1) {
    const vf = document.createElement('div');
    vf.className = 'mini';
    vf.textContent = 'VOLUME FRACIONADO';
    vbox.appendChild(vf);
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

  wrap.appendChild(el);
  return wrap;
}

function setManualEnabled(enabled) {
  ['loja', 'pedido', 'seq', 'rota'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.disabled = !enabled;
  });
}

function onCdChange() {
  const cdVal = document.querySelector('#cd').value.trim();
  const ok = /^[1-9]$/.test(cdVal);
  setManualEnabled(ok);

  const c = String(Number(cdVal || 0));
  const lojas = (BASE.lojas && BASE.lojas[c]) || {};
  const rotas = (BASE.rotas && BASE.rotas[c]) || {};

  const dlLoja = document.getElementById('listLoja');
  dlLoja.innerHTML = Object.keys(lojas).sort().map(k => `<option value="${parseInt(k, 10)} - ${lojas[k]}">${parseInt(k, 10)} - ${lojas[k]}</option>`).join('');

  const dlRota = document.getElementById('listRota');
  dlRota.innerHTML = Object.keys(rotas).sort().map(k => `<option value="${parseInt(k, 10)} - ${rotas[k]}">${parseInt(k, 10)} - ${rotas[k]}</option>`).join('');
}

function gerar() {
  try {
    setVars();
    const preview = document.querySelector('#preview');
    preview.innerHTML = '';

    const cd = document.querySelector('#cd').value;
    if (!/^[1-9]$/.test(cd)) {
      throw new Error('Informe o CD (1 a 9) para liberar os demais campos.');
    }

    const loja = document.querySelector('#loja').value;
    const pedido = document.querySelector('#pedido').value;
    const seq = document.querySelector('#seq').value;
    const rota = document.querySelector('#rota').value;
    const totalVol = Math.max(1, parseInt(document.querySelector('#qtdVolumes').value || '1', 10));

    if (!loja || !loja.trim()) throw new Error('Informe a filial.');
    if (!pedido || !pedido.trim()) throw new Error('Informe o número do pedido.');
    if (!seq || !seq.trim()) throw new Error('Informe o sequencial.');
    if (!rota || !rota.trim()) throw new Error('Informe a rota.');

    // Validate matricula using shared validation system
    const matriculaInput = document.querySelector('#matricula');
    const validation = window.UserValidation.validateBeforeGeneration(matriculaInput, (msg, type) => {
      throw new Error(msg);
    });

    if (!validation) {
      return false;
    }

    const matricula = validation.cleaned;

    if (!pedidoToDateStr(pedido.trim())) {
      throw new Error('PEDIDO (AAAADDD) inválido. Ex.: 2024269');
    }

    // Extrair apenas o número da loja e rota (remover descrição se presente)
    const lojaNum = loja.includes(' - ') ? loja.split(' - ')[0] : onlyDigits(loja);
    const rotaNum = rota.includes(' - ') ? rota.split(' - ')[0] : onlyDigits(rota);

    const etiquetas = [];

    // Gerar múltiplas etiquetas baseado na quantidade de volumes
    for (let v = 1; v <= totalVol; v++) {
      const etq = montarEtiqueta({
        cd: cd.trim(),
        loja: lojaNum,
        pedido: pedido.trim(),
        seq: onlyDigits(seq),
        rota: rotaNum,
        matricula: matricula,
        volAtual: v,
        volTotal: totalVol
      });
      etiquetas.push(etq);
    }

    etiquetas.forEach(e => preview.appendChild(e));

    // Salvar no histórico
    console.log('🔄 Salvando no histórico...');
    const now = new Date();
    const mm = pad(String(now.getMonth() + 1), 2);
    const dd = pad(String(now.getDate()), 2);
    const yy = String(now.getFullYear()).slice(-2);
    const hh = pad(String(now.getHours()), 2);
    const mi = pad(String(now.getMinutes()), 2);

    const historyData = {
      cd: cd.trim(),
      loja: lojaNum,
      lojaFull: loja,
      pedido: pedido.trim(),
      seq: onlyDigits(seq),
      rota: rotaNum,
      rotaFull: rota,
      matricula: matricula,
      qtdVolumes: totalVol,
      dataCriacao: `${dd}/${mm}/20${yy}`,
      horaCriacao: `${hh}:${mi}`,
      timestamp: new Date().toISOString()
    };

    saveToPedidoDiretoHistory(historyData);

    // Mostrar painel de configurações após gerar
    const painelConfig = document.querySelector('#painelConfiguracoes');
    if (painelConfig) {
      painelConfig.style.display = 'block';
      console.log('✅ Painel de configurações exibido');
    }
  } catch (e) {
    alert('Erro: ' + e.message);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  console.log('🎯 Pedido Direto - Iniciando carregamento...');

  // Initialize user validation system
  await initializeUserValidation();

  await loadBase();

  document.querySelector('#cd').addEventListener('input', onCdChange);
  setManualEnabled(false);

  document.querySelector('#gerar').addEventListener('click', async () => {
    const success = gerar();

    // Registrar geração no Supabase após gerar etiquetas com sucesso
    if (success !== false) {
      console.log('📡 Aguardando SupabaseManager (pedido-direto)...');
      const manager = await waitForSupabaseManager(3000);

      if (manager) {
        try {
          const cd = document.querySelector('#cd').value;
          const loja = document.querySelector('#loja').value;
          const pedido = document.querySelector('#pedido').value;
          const seq = document.querySelector('#seq').value;
          const rota = document.querySelector('#rota').value;
          const totalVol = Math.max(1, parseInt(document.querySelector('#qtdVolumes').value || '1', 10));

          const labelData = {
            applicationType: 'pedido-direto',
            quantity: totalVol,
            copies: 1,
            metadata: {
              source: 'pedido_direto_module',
              cd: cd,
              loja: loja,
              pedido: pedido,
              seq: seq,
              rota: rota,
              timestamp: new Date().toISOString(),
              userAgent: navigator.userAgent
            }
          };

          console.log('📝 Salvando labelData (pedido-direto):', labelData);
          await manager.saveLabelGeneration(labelData);
          console.log('✅ Geração de pedido-direto registrada no Supabase');
        } catch (error) {
          console.error('⚠️ Falha ao registrar geração no Supabase (pedido-direto):', error);
        }
      } else {
        console.warn('⚠️ supabaseManager não disponível (pedido-direto) - dados NÃO foram salvos');
      }
    }
  });
  document.querySelector('#imprimir').addEventListener('click', () => window.print());

  // Add real-time matricula validation
  // Use getElementById for consistency and safety
  const matriculaInput = document.getElementById("matricula");
  if (matriculaInput) {
    let validationTimeout = null;

    matriculaInput.addEventListener('input', (e) => {
      console.log('📝 Matrícula input (Pedido Direto):', e.target.value);
      // Clear previous timeout
      if (validationTimeout) {
        clearTimeout(validationTimeout);
      }

      // Clear any existing error states
      if (window.UserValidation && window.UserValidation.clearFieldError) {
        window.UserValidation.clearFieldError(matriculaInput);
      }

      const matricula = e.target.value.trim();

      // If empty, clear current user and greeting
      if (!matricula) {
        if (window.UserValidation) window.UserValidation.clearCurrentUser();
        return;
      }

      // Debounce validation to avoid excessive calls
      validationTimeout = setTimeout(() => {
        if (!window.UserValidation) return;

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
      if (matricula && window.UserValidation) {
        const validation = window.UserValidation.validateMatricula(matricula);
        if (!validation.valid) {
          window.UserValidation.highlightFieldError(matriculaInput, validation.msg, 3000);
        }
      }
    });

    console.log('✅ Validação em tempo real configurada para campo matrícula (Pedido Direto)');
  }

  // Configurar event listeners para os controles de configuração
  ['wmm', 'hmm', 'rotacao'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', () => {
        console.log(`🔧 Alterando ${id}:`, el.value);
        setVars();
      });
    }
  });

  // Botão "Aplicar Alterações"
  const aplicarBtn = document.querySelector('#aplicarConfig');
  if (aplicarBtn) {
    aplicarBtn.addEventListener('click', () => {
      console.log('🔧 Aplicando configurações...');
      setVars();

      // Mostrar feedback visual
      aplicarBtn.textContent = '✅ Aplicado!';
      aplicarBtn.style.background = 'linear-gradient(135deg, #10b981, #059669)';

      setTimeout(() => {
        aplicarBtn.textContent = 'Aplicar Alterações';
        aplicarBtn.style.background = '';
      }, 1500);
    });
  }

  // Event listeners do Histórico
  const histBtn = document.getElementById('pedido-direto-historico-btn');
  if (histBtn) {
    histBtn.addEventListener('click', showPedidoDiretoHistorico);
  }

  const closeBtn = document.getElementById('pedido-direto-historico-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', hidePedidoDiretoHistorico);
  }

  const toggleSearchBtn = document.getElementById('pedido-direto-toggle-search');
  if (toggleSearchBtn) {
    toggleSearchBtn.addEventListener('click', () => {
      const searchSection = document.getElementById('pedido-direto-search-section');
      if (searchSection) {
        const isHidden = searchSection.style.display === 'none';
        searchSection.style.display = isHidden ? 'block' : 'none';
        toggleSearchBtn.classList.toggle('active', isHidden);
        if (isHidden) {
          const input = document.getElementById('pedido-direto-search-input');
          if (input) input.focus();
        }
      }
    });
  }

  // Shortcuts
  document.addEventListener('keydown', (ev) => {
    if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'h') {
      ev.preventDefault();
      showPedidoDiretoHistorico();
    }
    if (ev.key === 'Escape') {
      hidePedidoDiretoHistorico();
    }
  });

  setVars();

  // Inicialização do histórico
  try {
    cleanDuplicatePedidoDiretoHistory();
    cleanOldPedidoDiretoRecords();
    console.log('📊 Histórico inicializado:', pedidoDiretoHistory.length, 'registros');
  } catch (error) {
    console.warn('⚠️ Erro na inicialização do histórico:', error);
    pedidoDiretoHistory = [];
  }

  console.log('✅ Pedido Direto - Carregamento concluído');
});

/* ===== Funções do Histórico ===== */
function showPedidoDiretoHistorico() {
  const modal = document.getElementById('pedido-direto-historico-modal');
  cleanOldPedidoDiretoRecords();

  // Reset fields
  const searchSection = document.getElementById('pedido-direto-search-section');
  const toggleBtn = document.getElementById('pedido-direto-toggle-search');
  if (searchSection) searchSection.style.display = 'none';
  if (toggleBtn) toggleBtn.classList.remove('active');

  const searchInput = document.getElementById('pedido-direto-search-input');
  if (searchInput) searchInput.value = '';
  clearPedidoDiretoSearch();

  renderPedidoDiretoHistoryList(pedidoDiretoHistory);
  modal.style.display = 'flex';

  setupPedidoDiretoSearchEvents();

  const close = document.getElementById('pedido-direto-historico-close');
  if (close) close.focus();
}

function hidePedidoDiretoHistorico() {
  const modal = document.getElementById('pedido-direto-historico-modal');
  if (modal) modal.style.display = 'none';
}

function setupPedidoDiretoSearchEvents() {
  const searchInput = document.getElementById('pedido-direto-search-input');
  const clearButton = document.getElementById('pedido-direto-clear-search');
  const filterRadios = document.querySelectorAll('input[name="searchType"]');

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      performPedidoDiretoSearch();
      if (clearButton) {
        const hasText = e.target.value.trim().length > 0;
        clearButton.style.opacity = hasText ? '1' : '0';
        clearButton.style.visibility = hasText ? 'visible' : 'hidden';
      }
    });

    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') clearPedidoDiretoSearch();
    });
  }

  if (clearButton) {
    clearButton.addEventListener('click', clearPedidoDiretoSearch);
  }

  filterRadios.forEach(radio => {
    radio.addEventListener('change', performPedidoDiretoSearch);
  });
}

function performPedidoDiretoSearch() {
  const searchInput = document.getElementById('pedido-direto-search-input');
  const term = searchInput ? searchInput.value.trim().toLowerCase() : '';
  const type = document.querySelector('input[name="searchType"]:checked')?.value || 'all';

  let filtered = [...pedidoDiretoHistory];

  if (term) {
    filtered = pedidoDiretoHistory.filter(item => {
      switch (type) {
        case 'pedido': return item.pedido && item.pedido.includes(term);
        case 'rota': return item.rotaFull && item.rotaFull.toLowerCase().includes(term);
        case 'cd': return item.cd && item.cd.includes(term);
        case 'all':
        default:
          return (
            (item.pedido && item.pedido.includes(term)) ||
            (item.rotaFull && item.rotaFull.toLowerCase().includes(term)) ||
            (item.lojaFull && item.lojaFull.toLowerCase().includes(term)) ||
            (item.cd && item.cd.includes(term))
          );
      }
    });
  }

  renderPedidoDiretoHistoryList(filtered);
}

function clearPedidoDiretoSearch() {
  const searchInput = document.getElementById('pedido-direto-search-input');
  const clearBtn = document.getElementById('pedido-direto-clear-search');

  if (searchInput) searchInput.value = '';

  if (clearBtn) {
    clearBtn.style.opacity = '0';
    clearBtn.style.visibility = 'hidden';
  }

  const allFilter = document.querySelector('input[name="searchType"][value="all"]');
  if (allFilter) allFilter.checked = true;

  renderPedidoDiretoHistoryList(pedidoDiretoHistory);
  if (searchInput) searchInput.focus();
}

function renderPedidoDiretoHistoryList(data) {
  const list = document.getElementById('pedido-direto-historico-list');
  if (!list) return;

  if (data.length === 0) {
    const searchInput = document.getElementById('pedido-direto-search-input');
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
    list.innerHTML = data.map((item, index) => {
      return createHistoryItemHTML(item).replace('class="historico-item"', `class="historico-item" style="animation-delay: ${index * 0.05}s"`);
    }).join('');

    const total = pedidoDiretoHistory.length;
    const showing = data.length;
    const isFiltered = total !== showing;

    list.innerHTML += `
      <div style="text-align: center; padding: 1rem; margin-top: 1rem; border-top: 1px solid var(--neutral-200);">
        <small style="color: var(--neutral-500);">
          ${isFiltered ? `Mostrando ${showing} de ${total}` : `${total}`} 
          ${total === 1 ? 'registro' : 'registros'} no histórico
        </small>
      </div>
    `;
  }
}

function createHistoryItemHTML(item) {
  const nomeDisplay = item.nome ? ` - ${item.nome}` : '';

  return `
    <div class="historico-item">
      <div class="historico-info">
        <div class="historico-primary">
          <strong>Pedido: ${item.pedido}</strong>
          <span class="historico-badge">${item.qtdVolumes} ${Number(item.qtdVolumes) === 1 ? 'volume' : 'volumes'}</span>
        </div>
        <div class="historico-secondary">
          <span>CD: ${item.cd}</span>
          <span>Loja: ${item.lojaFull || item.loja}</span>
          <span>Seq: ${item.seq}</span>
          <span>Rota: ${item.rotaFull || item.rota}</span>
          <span>Matrícula: ${item.matricula || '-'}${nomeDisplay}</span>
        </div>
        <div class="historico-meta">
          <span>${item.dataCriacao} às ${item.horaCriacao}</span>
        </div>
      </div>
    </div>
  `;
}

function saveToPedidoDiretoHistory(config) {
  const uniqueKey = `${config.pedido}-${config.loja}-${config.cd}-${config.rota}`;

  const existingIdx = pedidoDiretoHistory.findIndex(item => {
    const itemKey = `${item.pedido}-${item.loja}-${item.cd}-${item.rota}`;
    return itemKey === uniqueKey;
  });

  if (existingIdx !== -1) {
    pedidoDiretoHistory.splice(existingIdx, 1);
  }

  // Tentar resolver nome de usuário
  if (window.DB_USUARIO && window.DB_USUARIO.BASE_USUARIO) {
    const user = window.DB_USUARIO.BASE_USUARIO.find(u => u.Matricula == config.matricula);
    if (user) config.nome = user.Nome;
  }

  pedidoDiretoHistory.unshift({
    ...config,
    id: Date.now() + Math.random(),
    uniqueKey
  });

  if (pedidoDiretoHistory.length > 50) {
    pedidoDiretoHistory = pedidoDiretoHistory.slice(0, 50);
  }

  cleanOldPedidoDiretoRecords();

  try {
    localStorage.setItem('pedido-direto-history', JSON.stringify(pedidoDiretoHistory));
    console.log('✅ Histórico salvo (localStorage)');
  } catch (e) {
    console.warn('⚠️ Erro ao salvar histórico:', e);
    // Emergency cleanup
    if (e.name === 'QuotaExceededError') {
      pedidoDiretoHistory = pedidoDiretoHistory.slice(0, 10);
      try {
        localStorage.setItem('pedido-direto-history', JSON.stringify(pedidoDiretoHistory));
      } catch (e2) { }
    }
  }
}

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
    window.testUserValidationPedidoDireto = () => {
      console.log('🧪 Testando validação de usuário no módulo pedido-direto...');

      const matriculaInput = document.querySelector('#matricula');
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