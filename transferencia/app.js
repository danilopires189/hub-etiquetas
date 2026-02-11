/* ====== Importação dos dados dos depósitos ======
   Os dados agora são carregados do arquivo centralizado data_base/BASE_CDS.js */
let DEPOSITOS = [];

// Carregar dados dos CDs
async function loadDepositos() {
  try {
    const response = await fetch('../data_base/BASE_CDS.js');
    const text = await response.text();
    // Extrair o array do module.exports
    const match = text.match(/module\.exports\s*=\s*(\[[\s\S]*\]);/);
    if (match) {
      DEPOSITOS = eval(match[1]);
      console.log('✓ Dados de CDs carregados:', DEPOSITOS.length, 'depósitos');
      mountSelects();
    } else {
      console.error('Erro ao extrair dados de BASE_CDS.js');
      useFallbackData();
    }
  } catch (error) {
    console.error('Erro ao carregar BASE_CDS.js:', error);
    useFallbackData();
  }
}

// Fallback para dados hardcoded caso o carregamento falhe
function useFallbackData() {
  console.warn('⚠ Usando dados hardcoded como fallback');
  DEPOSITOS = [
    {
      id: 1, nome: "CD01 - Fortaleza/CE", cid: "FORTALEZA-CE", razao: "Empreendimentos Pague Menos S/A", uf: "CE",
      endereco: "RUA FRANCISCO CORDEIRO, 300, JACARECANGA - FORTALEZA-CE",
      cep: "60310-400", cnpj: "006.626.253/0124-00"
    },
    {
      id: 2, nome: "CD02 - Hidrolândia/GO", cid: "HIDROLANDIA-GO", razao: "Empreendimentos Pague Menos S/A", uf: "GO",
      endereco: "ROD BR-153, SN, ZONA RURAL - HIDROLANDIA-GO",
      cep: "75340-000", cnpj: "006.626.253/0579-35"
    },
    {
      id: 3, nome: "CD03 - Jaboatão/PE", cid: "JABOATAO-PE", razao: "Empreendimentos Pague Menos S/A", uf: "PE",
      endereco: "RUA RIACHÃO, 807, MURIBECA - JABOATAO-PE",
      cep: "54355-057", cnpj: "006.626.253/0633-15"
    },
    {
      id: 4, nome: "CD04 - Simões Filho/BA", cid: "SIMOES FILHO-BA", razao: "Empreendimentos Pague Menos S/A", uf: "BA",
      endereco: "VIA DE ACESSO II BR-324, 178, CIA SUL - SIMÕES FILHO-BA",
      cep: "43700-000", cnpj: "006.626.253/0875-08"
    },
    {
      id: 5, nome: "CD05 - Contagem/MG", cid: "CONTAGEM-MG", razao: "Empreendimentos Pague Menos S/A", uf: "MG",
      endereco: "RUA SIMÃO ANTÔNIO, 149, CINCÃO - CONTAGEM-MG",
      cep: "32371-610", cnpj: "006.626.253/1198-98"
    },
    {
      id: 6, nome: "CD06 - Benevides/PA", cid: "BENEVIDES-PA", razao: "IMIFARMA PROD FARMA E COSMÉTICOS S.A.", uf: "PA",
      endereco: "ROD BR-316, KM 23/24, S/N, ITAPEPUCU - BENEVIDES-PA",
      cep: "68795-000", cnpj: "004.899.316/0342-84"
    },
    {
      id: 7, nome: "CD07 - São Luís/MA", cid: "SAO LUIZ-MA", razao: "IMIFARMA PROD FARMA E COSMÉTICOS S.A.", uf: "MA",
      endereco: "ROD ENG. EMILIANO MACIEIRA, 1, RIBEIRA - SÃO LUÍS-MA",
      cep: "65095-602", cnpj: "004.899.316/0351-75"
    },
    {
      id: 8, nome: "CD08 - Guarulhos/SP", cid: "GUARULHOS-SP", razao: "IMIFARMA PROD FARMA E COSMÉTICOS S.A.", uf: "SP",
      endereco: "AV. JÚLIA GAIOLLI, 740, ÁGUA CHATA - GUARULHOS-SP",
      cep: "07251-500", cnpj: "004.899.316/0536-61"
    },
    {
      id: 9, nome: "CD09 - Aquiraz/CE", cid: "AQUIRAZ-CE", razao: "IMIFARMA PROD FARMA E COSMÉTICOS S.A.", uf: "CE",
      endereco: "BR-116, KM 23, S/N, CÂMARA - AQUIRAZ-CE",
      cep: "61700-000", cnpj: "004.899.316/0252-93"
    },
    {
      id: 101, nome: "CD101 - Parnamirim/RN", cid: "PARNAMIRIM-RN", razao: "Empreendimentos Pague Menos S/A", uf: "RN",
      endereco: "AV. BR-304, 304, PARQUE DE EXPOSIÇÕES - PARNAMIRIM-RN",
      cep: "59146-750", cnpj: "006.626.253/1320-66"
    }
  ];
  mountSelects();
}

/* ====== Util ====== */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const fmt2 = n => String(n).padStart(2, '0');
const nowStr = () => {
  const d = new Date();
  return `${fmt2(d.getDate())}/${fmt2(d.getMonth() + 1)}/${String(d.getFullYear()).slice(-2)}  ${fmt2(d.getHours())}:${fmt2(d.getMinutes())}`;
}
const byId = id => DEPOSITOS.find(d => d.id === Number(id));

/* ====== UI ====== */
function mountSelects() {
  // AJUSTE: exibir somente "CDxx - Nome" (sem o ID à esquerda).
  const opts = [`<option value="" disabled selected>Selecione...</option>`]
    .concat(DEPOSITOS.map(d => `<option value="${d.id}">${d.nome}</option>`))
    .join("");
  $("#origem").innerHTML = opts;
  $("#destino").innerHTML = opts;
}

function validateForm() {
  const origem = $("#origem").value;
  const destino = $("#destino").value;
  const nf = $("#nf").value.trim();
  const serie = $("#serie").value.trim();
  const qtd = Number($("#qtd").value);

  let err = [];
  if (!origem) err.push("Selecione o Depósito origem.");
  if (!destino) err.push("Selecione o Depósito destino.");
  if (origem && destino && origem === destino) err.push("Origem e destino devem ser diferentes.");
  if (!nf) err.push("Informe a Nota Fiscal.");
  if (!serie) err.push("Informe a Série.");
  if (!(qtd >= 1)) err.push("Quantidade de volumes deve ser ≥ 1.");

  // Validate matricula using shared validation system
  const matriculaInput = $("#matricula");
  if (!matriculaInput.value.trim()) {
    err.push("Informe a Matrícula.");
  } else {
    const validation = window.UserValidation.validateMatricula(matriculaInput.value);
    if (!validation.valid) {
      err.push(validation.msg);
    }
  }

  return { ok: err.length === 0, errors: err, origem, destino, nf, serie, qtd };
}

function generate() {
  const v = validateForm();
  if (!v.ok) {
    alert("Corrija os pontos antes de gerar:\n\n• " + v.errors.join("\n• "));
    return;
  }

  // Set current user when matricula is valid
  const matriculaInput = $("#matricula");
  const validation = window.UserValidation.validateMatricula(matriculaInput.value);
  if (validation.valid && validation.user) {
    window.UserValidation.setCurrentUser(validation.user);
  }
  const matricula = validation.cleaned || matriculaInput.value.trim();

  const o = byId(v.origem), d = byId(v.destino);
  const preview = $("#preview");
  preview.innerHTML = "";

  const tpl = $("#pageTpl");
  const fracionado = v.qtd > 1;
  const fragilPref = $("#fragil").value;

  for (let i = 1; i <= v.qtd; i++) {
    const page = tpl.content.cloneNode(true);
    const root = page.querySelector(".page");

    // Lado esquerdo (destino e remetente)
    $(".js-dest-nome", root).textContent = `${d.nome}`;
    $(".js-dest-end", root).textContent = `${d.endereco}`;
    $(".js-dest-cep", root).textContent = d.cep;
    $(".js-dest-cnpj", root).textContent = d.cnpj;

    $(".js-orig-nome", root).textContent = `${o.nome}`;
    $(".js-orig-end", root).textContent = `${o.endereco}`;
    $(".js-orig-cep", root).textContent = o.cep;
    $(".js-orig-cnpj", root).textContent = o.cnpj;

    $(".js-dt-criacao", root).textContent = nowStr();
    $(".js-matricula", root).textContent = matricula;

    // Lado direito
    $(".js-vol", root).textContent = `${i}/${v.qtd}`;
    $(".js-nf", root).textContent = v.nf;
    $(".js-serie", root).textContent = v.serie;

    const tag = $(".js-tag-fracionado", root);
    const fragilBox = $(".fragil", root);
    const showFragil = (fragilPref === 'on');

    tag.hidden = v.qtd <= 1;
    tag.style.display = v.qtd > 1 ? "inline-block" : "none";
    fragilBox.style.display = showFragil ? "flex" : "none";

    preview.appendChild(page);
  }

  // Save to History
  saveToTransferenciaHistory({
    origem: o.nome,
    destino: d.nome,
    nf: v.nf,
    serie: v.serie,
    qtd: v.qtd,
    matricula: matricula,
    dataCriacao: nowStr()
  });

  // scroll to preview
  window.scrollTo({ top: $("#preview").offsetTop - 10, behavior: 'smooth' });
}

function setup() {
  // Initialize user validation system first
  initializeUserValidation();

  // Carregar dados dos CDs primeiro
  loadDepositos();

  // Configurar event listeners
  $("#btnGerar").addEventListener("click", async () => {
    generate();
    
    // Registrar geração no Supabase após gerar etiquetas
    if (window.supabaseManager) {
      try {
        const v = validateForm();
        if (v.ok) {
          const o = byId(v.origem);
          const d = byId(v.destino);
          
          const labelData = {
            applicationType: 'transferencia',
            quantity: v.qtd,
            copies: 1,
            metadata: {
              source: 'transferencia_module',
              origem: o.nome,
              destino: d.nome,
              nf: v.nf,
              serie: v.serie,
              timestamp: new Date().toISOString(),
              userAgent: navigator.userAgent
            }
          };
          
          await window.supabaseManager.saveLabelGeneration(labelData);
          console.log('✅ Geração de transferência registrada no Supabase');
        }
      } catch (error) {
        console.warn('⚠️ Falha ao registrar geração no Supabase:', error);
      }
    }
  });
  $("#btnImprimir").addEventListener("click", () => window.print());

  // Shortcut keys
  document.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { generate(); }
    if (e.key === "p" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); window.print(); }
  });

  // Add real-time matricula validation
  // Use getElementById for consistency and safety
  const matriculaInput = document.getElementById("matricula");
  if (matriculaInput) {
    let validationTimeout = null;

    matriculaInput.addEventListener('input', (e) => {
      console.log('📝 Matrícula input (Transferencia):', e.target.value);
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

    console.log('✅ Validação em tempo real configurada para campo matrícula (Transferencia)');
  }
}

document.addEventListener("DOMContentLoaded", setup);
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
    window.testUserValidationTransferencia = () => {
      console.log('🧪 Testando validação de usuário no módulo transferencia...');

      const matriculaInput = $("#matricula");
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

/* ====== HISTÓRICO DE TRANSFERÊNCIA ====== */
let transferenciaHistory = [];

// Carregar histórico salvo
function loadTransferenciaHistory() {
  try {
    const saved = localStorage.getItem('transferencia-history');
    if (saved) {
      transferenciaHistory = JSON.parse(saved);
      // Limpar registros muito antigos (mais de 90 dias)
      cleanOldTransferenciaRecords();
    }
  } catch (e) {
    console.warn('Erro ao carregar histórico:', e);
    transferenciaHistory = [];
  }
}

function cleanOldTransferenciaRecords() {
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const originalLength = transferenciaHistory.length;
  transferenciaHistory = transferenciaHistory.filter(item => {
    try {
      if (!item.dataCriacao) return false;
      const parts = item.dataCriacao.split(' '); // DD/MM/YY HH:mm
      const dateParts = parts[0].split('/');
      const year = 2000 + parseInt(dateParts[2]);
      const month = parseInt(dateParts[1]) - 1;
      const day = parseInt(dateParts[0]);

      const itemDate = new Date(year, month, day);
      return itemDate >= ninetyDaysAgo;
    } catch (e) {
      return true;
    }
  });

  if (originalLength !== transferenciaHistory.length) {
    localStorage.setItem('transferencia-history', JSON.stringify(transferenciaHistory));
  }
}

function saveToTransferenciaHistory(historyData) {
  // Evitar duplicatas exatas recentes
  const isDuplicate = transferenciaHistory.slice(0, 10).some(item =>
    item.nf === historyData.nf &&
    item.serie === historyData.serie &&
    item.qtd === historyData.qtd &&
    item.origem === historyData.origem &&
    item.destino === historyData.destino
  );

  if (isDuplicate) {
    console.log('Duplicate history item ignored');
    return;
  }

  // Tentar resolver nome de usuário
  if (!historyData.nome && historyData.matricula && window.DB_USUARIO && window.DB_USUARIO.BASE_USUARIO) {
    const user = window.DB_USUARIO.BASE_USUARIO.find(u => u.Matricula == historyData.matricula);
    if (user) {
      historyData.nome = user.Nome;
    } else if (window.UserValidation && window.UserValidation.currentUser) {
      historyData.nome = window.UserValidation.currentUser.Nome;
    }
  }

  transferenciaHistory.unshift({
    ...historyData,
    id: Date.now() + Math.random().toString(36).substr(2, 9),
    timestamp: Date.now()
  });

  if (transferenciaHistory.length > 500) {
    transferenciaHistory = transferenciaHistory.slice(0, 500);
  }

  try {
    localStorage.setItem('transferencia-history', JSON.stringify(transferenciaHistory));
    console.log('✅ Histórico salvo (localStorage)');
  } catch (e) {
    console.warn('⚠️ Erro ao salvar histórico:', e.message);
  }
}

/* UI Functions */
function showTransferenciaHistorico() {
  const modal = $('#transferencia-historico-modal');

  // Reset search
  const searchSection = $('#transferencia-search-section');
  const toggleBtn = $('#transferencia-toggle-search');
  const searchInput = $('#transferencia-search-input');

  if (searchSection) searchSection.style.display = 'none';
  if (toggleBtn) toggleBtn.classList.remove('active');
  if (searchInput) searchInput.value = '';

  clearTransferenciaSearch();

  renderTransferenciaHistoryList(transferenciaHistory);
  modal.style.display = 'flex';

  setTimeout(() => $('#transferencia-historico-close').focus(), 100);
}

function hideTransferenciaHistorico() {
  $('#transferencia-historico-modal').style.display = 'none';
}

function renderTransferenciaHistoryList(list) {
  const container = $('#transferencia-historico-list');
  container.innerHTML = '';

  if (list.length === 0) {
    container.innerHTML = `
      <div class="historico-loading">
        Nenhum registro encontrado no histórico.
      </div>
    `;
    return;
  }

  const html = list.map(item => createHistoryItemHTML(item)).join('');
  container.innerHTML = html;
}

function createHistoryItemHTML(item) {
  const nomeDisplay = item.nome ? ` - ${item.nome}` : '';

  return `
    <div class="historico-item">
      <div class="historico-info">
        <div class="historico-primary">
          <span class="historico-badge">${item.qtd} vol${item.qtd > 1 ? 's' : ''}</span>
          <strong>NF: ${item.nf}</strong>
          <span style="color: var(--neutral-400)">|</span>
          <span>Série: ${item.serie}</span>
        </div>
        
        <div class="historico-secondary">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span title="Origem">📤 ${getCleanCDName(item.origem)}</span>
            <span>➜</span>
            <span title="Destino">📥 ${getCleanCDName(item.destino)}</span>
          </div>
        </div>
        
        <div class="historico-meta">
          <span>📅 ${item.dataCriacao}</span>
          ${item.matricula ? `<span style="margin-left: 8px;">👤 ${item.matricula}${nomeDisplay}</span>` : ''}
        </div>
      </div>
    </div>
  `;
}

function getCleanCDName(fullName) {
  if (!fullName) return '';
  return fullName;
}

/* Search Functions */
function setupTransferenciaSearchEvents() {
  const searchInput = $('#transferencia-search-input');
  const clearBtn = $('#transferencia-clear-search');
  const toggleBtn = $('#transferencia-toggle-search');
  const searchSection = $('#transferencia-search-section');

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const isVisible = searchSection.style.display !== 'none';
      searchSection.style.display = isVisible ? 'none' : 'block';
      toggleBtn.classList.toggle('active');
      if (!isVisible) setTimeout(() => searchInput.focus(), 100);
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const term = e.target.value.toLowerCase().trim();
      clearBtn.style.opacity = term ? '1' : '0';
      clearBtn.style.visibility = term ? 'visible' : 'hidden';
      performTransferenciaSearch(term);
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      searchInput.value = '';
      clearBtn.style.opacity = '0';
      clearBtn.style.visibility = 'hidden';
      performTransferenciaSearch('');
      searchInput.focus();
    });
  }

  const radios = document.querySelectorAll('input[name="searchType"]');
  radios.forEach(radio => {
    radio.addEventListener('change', () => {
      performTransferenciaSearch(searchInput ? searchInput.value.toLowerCase().trim() : '');
    });
  });
}

function performTransferenciaSearch(term) {
  if (!term) {
    renderTransferenciaHistoryList(transferenciaHistory);
    return;
  }

  const searchTypeEl = document.querySelector('input[name="searchType"]:checked');
  const searchType = searchTypeEl ? searchTypeEl.value : 'all';

  const filtered = transferenciaHistory.filter(item => {
    const sTerm = term.toLowerCase();

    const fields = {
      nf: (item.nf || '').toLowerCase(),
      cd: ((item.origem || '') + ' ' + (item.destino || '')).toLowerCase(),
      matricula: (item.matricula || '').toLowerCase()
    };

    if (searchType === 'all') {
      return Object.values(fields).some(val => val.includes(sTerm));
    } else {
      return fields[searchType] ? fields[searchType].includes(sTerm) : false;
    }
  });

  renderTransferenciaHistoryList(filtered);
}

function clearTransferenciaSearch() {
  const radios = document.querySelectorAll('input[name="searchType"]');
  if (radios.length) radios[0].checked = true;
  performTransferenciaSearch('');
}

// Inicialização extra
document.addEventListener('DOMContentLoaded', () => {
  // Carregar histórico
  loadTransferenciaHistory();

  // Event Listeners do Histórico
  const btnHistory = $('#transferencia-historico-btn');
  const btnClose = $('#transferencia-historico-close');
  const modal = $('#transferencia-historico-modal');

  if (btnHistory) btnHistory.addEventListener('click', showTransferenciaHistorico);
  if (btnClose) btnClose.addEventListener('click', hideTransferenciaHistorico);

  // Fechar ao clicar fora
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) hideTransferenciaHistorico();
    });
  }

  // Busca
  setupTransferenciaSearchEvents();

  // Atalho de teclado (Ctrl+H)
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'h') {
      e.preventDefault();
      if (modal.style.display === 'flex') {
        hideTransferenciaHistorico();
      } else {
        showTransferenciaHistorico();
      }
    }
    if (e.key === 'Escape' && modal.style.display === 'flex') {
      hideTransferenciaHistorico();
    }
  });
});
