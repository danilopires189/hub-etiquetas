// Inventário Dinâmico - Sistema de Lista de Produtos com Folhas Individuais

// Utilidades básicas
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function toast(msg, type = 'info', duration = 5000) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  // Criar estrutura do toast com ícone
  const icon = getToastIcon(type);
  toast.innerHTML = `
    <div class="toast-content">
      <div class="toast-icon">${icon}</div>
      <div class="toast-message">${msg}</div>
    </div>
    ${type === 'loading' ? '<div class="toast-bar-wrap"><div class="toast-progress-bar"></div></div>' : ''}
  `;

  container.appendChild(toast);

  // Trigger slideInRight animation
  setTimeout(() => {
    toast.classList.add('show');
  }, 10);

  // Auto-remove toast after duration (except for loading)
  if (type !== 'loading') {
    setTimeout(() => {
      toast.classList.remove('show');
      toast.classList.add('hiding');
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, duration);
  }

  return toast; // Return reference for manual control
}

function getToastIcon(type) {
  const icons = {
    info: 'ℹ️',
    success: '✅',
    warning: '⚠️',
    error: '❌',
    loading: '⏳'
  };
  return icons[type] || icons.info;
}

function getToastColor(type) {
  const colors = {
    info: '#1f2937',
    success: '#059669',
    warning: '#f59e0b',
    error: '#dc2626',
    loading: '#2563eb'
  };
  return colors[type] || colors.info;
}

// Sistema de Toast de Progresso Adaptado do Módulo Etiqueta-Mercadoria
function showProgressToast(message, options = {}) {
  const {
    onCancel = null,
    showProgress = true,
    duration = null, // null = manual dismiss, number = auto dismiss
    type = 'loading' // loading, success, error, warning
  } = options;

  const toast = document.createElement('div');
  toast.id = 'progress-toast';
  toast.className = `toast-progress-box ${type}`; // Updated class

  // Adaptar estrutura do popup-sucesso do etiqueta-mercadoria
  toast.innerHTML = `
    <div class="toast-progress-content">
      <div class="toast-progress-icon">${getProgressToastIcon(type)}</div>
      <div class="toast-progress-text">
        <div class="toast-progress-title">${message}</div>
        <div class="toast-progress-subtitle" style="display: none;"></div>
      </div>
      ${onCancel ? '<button class="toast-progress-cancel">Cancelar</button>' : ''}
    </div>
    ${showProgress ? '<div class="toast-bar-container"><div class="toast-progress-bar"></div><div class="toast-progress-percent">0%</div></div>' : ''}
  `;

  // Aplicar estilos base adaptados do etiqueta-mercadoria
  Object.assign(toast.style, {
    position: 'relative', // Now relative to container
    zIndex: '25000',
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
    border: '1px solid #e2e8f0',
    padding: '0',
    opacity: '0',
    transform: 'translateX(100%)',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    maxWidth: '380px',
    minWidth: '300px',
    overflow: 'hidden',
    fontFamily: "'Inter', system-ui, sans-serif"
  });

  // Configurar conteúdo
  const content = toast.querySelector('.toast-progress-content');
  Object.assign(content.style, {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px 20px'
  });

  // Configurar ícone
  const icon = toast.querySelector('.toast-progress-icon');
  Object.assign(icon.style, {
    fontSize: '24px',
    flexShrink: '0'
  });

  // Configurar texto
  const textContainer = toast.querySelector('.toast-progress-text');
  Object.assign(textContainer.style, {
    flex: '1'
  });

  const title = toast.querySelector('.toast-progress-title');
  Object.assign(title.style, {
    fontWeight: '600',
    color: '#1f2937',
    fontSize: '14px',
    marginBottom: '2px'
  });

  const subtitle = toast.querySelector('.toast-progress-subtitle');
  Object.assign(subtitle.style, {
    fontSize: '12px',
    color: '#6b7280',
    fontWeight: '500'
  });

  // Configurar botão de cancelar se presente
  const cancelBtn = toast.querySelector('.toast-progress-cancel');
  if (cancelBtn && onCancel) {
    Object.assign(cancelBtn.style, {
      background: 'rgba(239, 68, 68, 0.1)',
      border: '1px solid rgba(239, 68, 68, 0.2)',
      color: '#dc2626',
      padding: '6px 12px',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '12px',
      fontWeight: '500',
      transition: 'all 0.2s ease'
    });

    cancelBtn.addEventListener('click', () => {
      onCancel();
      hideProgressToast(toast);
    });

    cancelBtn.addEventListener('mouseenter', () => {
      cancelBtn.style.background = 'rgba(239, 68, 68, 0.15)';
    });

    cancelBtn.addEventListener('mouseleave', () => {
      cancelBtn.style.background = 'rgba(239, 68, 68, 0.1)';
    });
  }

  // Configurar barra de progresso (adaptada do etiqueta-mercadoria)
  if (showProgress) {
    const progressContainer = toast.querySelector('.toast-bar-container');
    Object.assign(progressContainer.style, {
      position: 'absolute',
      bottom: '0',
      left: '0',
      height: '3px',
      width: '100%',
      background: 'rgba(148, 163, 184, 0.2)',
      overflow: 'hidden'
    });

    const progressBar = toast.querySelector('.toast-progress-bar');
    Object.assign(progressBar.style, {
      height: '100%',
      background: getProgressToastColor(type),
      width: '0%',
      transition: 'width 0.3s ease',
      borderRadius: '0 0 12px 12px'
    });

    // Animação de progresso automática se não for manual
    if (duration && duration > 0) {
      progressBar.style.animation = `progress-fill ${duration}ms linear forwards`;
    }
  }

  // Remover toast de progresso anterior se houver para evitar duplicidade de barra de carregamento
  const existingToast = document.getElementById('progress-toast');
  if (existingToast) {
    existingToast.remove();
  }

  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  container.appendChild(toast);

  // Animar entrada (slideInRight do etiqueta-mercadoria)
  setTimeout(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(0)';
  }, 100);

  // Auto-dismiss se duration especificado
  if (duration && duration > 0) {
    setTimeout(() => {
      hideProgressToast(toast);
    }, duration);
  }

  return {
    element: toast,
    updateProgress: (percent) => {
      const progressBar = toast.querySelector('.toast-progress-bar');
      if (progressBar && showProgress) {
        progressBar.style.width = `${Math.min(100, Math.max(0, percent))}%`;
      }
    },
    updateMessage: (newMessage, subtitle = null) => {
      const titleEl = toast.querySelector('.toast-progress-title');
      const subtitleEl = toast.querySelector('.toast-progress-subtitle');

      if (titleEl) {
        titleEl.textContent = newMessage;
      }

      if (subtitle && subtitleEl) {
        subtitleEl.textContent = subtitle;
        subtitleEl.style.display = 'block';
      }
    },
    updateType: (newType) => {
      const iconEl = toast.querySelector('.toast-progress-icon');
      const progressBar = toast.querySelector('.toast-progress-bar');

      if (iconEl) {
        iconEl.textContent = getProgressToastIcon(newType);
      }

      if (progressBar) {
        progressBar.style.background = getProgressToastColor(newType);
      }

      toast.className = `toast-progress ${newType}`;
    },
    hide: () => hideProgressToast(toast)
  };
}

// Função auxiliar para ícones do toast de progresso
function getProgressToastIcon(type) {
  const icons = {
    loading: '⏳',
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  };
  return icons[type] || icons.loading;
}

// Função auxiliar para cores do toast de progresso
function getProgressToastColor(type) {
  const colors = {
    loading: 'linear-gradient(90deg, #2563eb, #1d4ed8)',
    success: 'linear-gradient(90deg, #10b981, #059669)',
    error: 'linear-gradient(90deg, #ef4444, #dc2626)',
    warning: 'linear-gradient(90deg, #f59e0b, #d97706)',
    info: 'linear-gradient(90deg, #6b7280, #4b5563)'
  };
  return colors[type] || colors.loading;
}

function hideProgressToast(toast) {
  if (toast && toast.parentNode) {
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }
}

// Seletores
const $ = (sel) => document.querySelector(sel);

// Estado da aplicação
let APP_STATE = {
  selectedCD: null,
  selectedCDName: null,
  productList: new Map(), // CODDV -> Product Object
  isLoading: false,
  databaseReady: false
};

// Sistema de Loading
let loadingManager = null;

// Sistema de Animações
let animationManager = null;
let performanceMonitor = null;
let animationIntegration = null;
let performanceOptimizer = null;
let systemStartup = null;

// Inicializar LoadingManager quando disponível
if (typeof LoadingManager !== 'undefined') {
  loadingManager = new LoadingManager();
  console.log('✅ LoadingManager inicializado');
} else {
  console.warn('⚠️ LoadingManager não disponível');
}

// Inicializar AnimationManager quando disponível
if (typeof AnimationManager !== 'undefined') {
  animationManager = new AnimationManager();
  animationManager.initialize();
  console.log('✅ AnimationManager inicializado');
} else {
  console.warn('⚠️ AnimationManager não disponível');
}

// Inicializar AnimationPerformanceMonitor quando disponível
if (typeof AnimationPerformanceMonitor !== 'undefined') {
  performanceMonitor = new AnimationPerformanceMonitor();
  performanceMonitor.configureAutoAdjustments({
    enableAutoDisable: true,
    enableAutoRecover: true,
    aggressiveOptimizations: false
  });
  console.log('✅ AnimationPerformanceMonitor inicializado');
} else {
  console.warn('⚠️ AnimationPerformanceMonitor não disponível');
}

// Inicializar AnimationIntegration quando disponível
if (typeof AnimationIntegration !== 'undefined') {
  animationIntegration = new AnimationIntegration();
  console.log('✅ AnimationIntegration inicializado');
} else {
  console.warn('⚠️ AnimationIntegration não disponível');
}

// Inicializar AnimationPerformanceOptimizer quando disponível
if (typeof AnimationPerformanceOptimizer !== 'undefined') {
  performanceOptimizer = new AnimationPerformanceOptimizer();
  performanceOptimizer.initialize();
  console.log('✅ AnimationPerformanceOptimizer inicializado');
} else {
  console.warn('⚠️ AnimationPerformanceOptimizer não disponível');
}

// Inicializar SystemStartupAnimation quando disponível
if (typeof SystemStartupAnimation !== 'undefined') {
  systemStartup = new SystemStartupAnimation();
  console.log('✅ SystemStartupAnimation inicializado');
  
  // 🚀 Iniciar animação IMEDIATAMENTE ao carregar o script
  // Não esperar pelo DOMContentLoaded para melhor experiência do usuário
  systemStartup.show();
  console.log('🎬 Animação de startup iniciada imediatamente');
} else {
  console.warn('⚠️ SystemStartupAnimation não disponível');
}

// Dados integrados das bases
// Dados integrados das bases (Global Scope)
window.DATA_ENDERECOS = window.DATA_ENDERECOS || [];
window.DATA_CADASTRO = window.DATA_CADASTRO || [];
window.DATA_LOG_ENDERECOS = window.DATA_LOG_ENDERECOS || [];

// Local references for backward compatibility (pointing to window)
var DATA_ENDERECOS = window.DATA_ENDERECOS;
var DATA_CADASTRO = window.DATA_CADASTRO;
var DATA_LOG_ENDERECOS = window.DATA_LOG_ENDERECOS;

// Sistema assíncrono de carregamento
let asyncLoader = null;
let dataIndexer = null;

// Status de carregamento das bases
let DATABASE_STATUS = {
  BASE_END: false,
  BASE_BARRAS: false,
  BASE_LOG_END: false,
  isLoading: false,
  hasIndexes: false
};

// Sistema de status
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

// Carregamento assíncrono das bases de dados
async function loadDatabasesAsync() {
  console.log('🔄 Iniciando carregamento assíncrono das bases de dados...');

  if (!asyncLoader) {
    asyncLoader = new AsyncDatabaseLoader();
    dataIndexer = asyncLoader.dataIndexer;
  }

  DATABASE_STATUS.isLoading = true;

  // Usar loading manager se disponível
  if (loadingManager) {
    loadingManager.showLoadingOverlay('Carregando bases de dados...');
  } else {
    setStatus('Carregando bases de dados...', 'info');
  }

  asyncLoader.onProgress((progress) => {
    updateLoadingProgress(progress);
  });

  try {
    const loadOptions = {
      useWebWorkers: false,
      lazyLoading: true,
      maxMemoryMB: 100,
      timeout: 30000
    };

    const result = await asyncLoader.loadDatabasesAsync(loadOptions);

    if (result.success) {
      updateGlobalDataFromLoader(result.loadedDatabases);

      DATABASE_STATUS.BASE_END = result.loadedDatabases.some(db => db.name === 'BASE_END' && db.loaded);
      DATABASE_STATUS.BASE_BARRAS = result.loadedDatabases.some(db => db.name === 'BASE_BARRAS' && db.loaded);
      DATABASE_STATUS.BASE_LOG_END = result.loadedDatabases.some(db => db.name === 'BASE_LOG_END' && db.loaded);
      DATABASE_STATUS.hasIndexes = result.indexes && Object.keys(result.indexes).length > 0;

      const totalRecords = result.stats.totalRecords;

      // Ocultar loading overlay
      if (loadingManager) {
        loadingManager.hideLoadingOverlay();
      }

      setStatus(
        `Bases carregadas: ${totalRecords} registros • ${result.totalTime}ms`,
        'success'
      );

      APP_STATE.databaseReady = true;

      // Enable CD selector now that database is ready
      const cdSelect = $('#cdSelect');
      if (cdSelect) {
        cdSelect.disabled = false;
        console.log('✅ Seletor de CD habilitado - base de dados carregada');
      }

      // Update search info now that database is ready
      updateSearchInfo();

      setTimeout(() => {
        const status = $('#status');
        if (status) status.style.display = 'none';
      }, 4000);

      console.log('✅ Carregamento assíncrono concluído:', result.stats);

    } else {
      // Ocultar loading overlay em caso de erro
      if (loadingManager) {
        loadingManager.hideLoadingOverlay();
      }

      setStatus(`Erro no carregamento: ${result.error}`, 'error');

      const btnReload = $('#btnReload');
      if (btnReload) btnReload.style.display = '';

      console.error('❌ Falha no carregamento assíncrono:', result.error);
    }

  } catch (error) {
    console.error('❌ Erro crítico no carregamento assíncrono:', error);

    // Ocultar loading overlay em caso de erro
    if (loadingManager) {
      loadingManager.hideLoadingOverlay();
    }

    setStatus('Erro crítico no carregamento', 'error');

    const btnReload = $('#btnReload');
    if (btnReload) btnReload.style.display = '';
  } finally {
    DATABASE_STATUS.isLoading = false;
  }

  return DATABASE_STATUS;
}

// Atualizar dados globais com dados do loader
function updateGlobalDataFromLoader(loadedDatabases) {
  loadedDatabases.forEach(db => {
    if (db.loaded && db.data) {
      switch (db.name) {
        case 'BASE_END':
          window.DATA_ENDERECOS = db.data;
          DATA_ENDERECOS = window.DATA_ENDERECOS;
          console.log(`📊 BASE_END atualizada: ${db.data.length} registros`);
          break;
        case 'BASE_BARRAS':
          window.DATA_CADASTRO = db.data;
          DATA_CADASTRO = window.DATA_CADASTRO;
          console.log(`📊 BASE_BARRAS atualizada: ${db.data.length} registros`);
          break;
        case 'BASE_LOG_END':
          window.DATA_LOG_ENDERECOS = db.data;
          DATA_LOG_ENDERECOS = window.DATA_LOG_ENDERECOS;
          console.log(`📊 BASE_LOG_END atualizada: ${db.data.length} registros`);
          break;
      }
    }
  });

  // Criar índices após carregamento dos dados
  createDataIndexes();
}

// Criar índices para otimizar buscas
function createDataIndexes() {
  if (!dataIndexer) {
    if (typeof DataIndexer !== 'undefined') {
      dataIndexer = new DataIndexer();
    } else {
      console.error('❌ DataIndexer não está disponível');
      return;
    }
  }

  console.log('🔄 Criando índices de dados...');

  try {
    // Criar índices básicos
    if (DATA_ENDERECOS.length > 0) {
      dataIndexer.createCDIndex(DATA_ENDERECOS);
      dataIndexer.createAddressIndex(DATA_ENDERECOS);
    }

    if (DATA_CADASTRO.length > 0) {
      dataIndexer.createProductIndex(DATA_CADASTRO);
    }

    // Criar índice de endereços excluídos
    if (DATA_LOG_ENDERECOS.length > 0) {
      console.log('📊 Criando índice de endereços excluídos com', DATA_LOG_ENDERECOS.length, 'registros');

      // Verificar se a função existe
      if (typeof dataIndexer.createExcludedAddressIndex === 'function') {
        dataIndexer.createExcludedAddressIndex(DATA_LOG_ENDERECOS);
      } else {
        console.error('❌ Função createExcludedAddressIndex não encontrada no DataIndexer');
      }
    } else {
      console.warn('⚠️ DATA_LOG_ENDERECOS está vazio, não criando índice de exclusões');
    }

    DATABASE_STATUS.hasIndexes = true;
    console.log('✅ Índices criados com sucesso');

  } catch (error) {
    console.error('❌ Erro ao criar índices:', error);
    DATABASE_STATUS.hasIndexes = false;
  }
}

// Atualizar progresso de carregamento
function updateLoadingProgress(progress) {
  const status = $('#status');
  if (status && progress) {
    let message = `${progress.currentFile} (${progress.percentage.toFixed(0)}%)`;

    if (progress.status === 'complete') {
      message = `Carregamento concluído (${progress.loaded}/${progress.total} bases)`;
    } else if (progress.status === 'error') {
      message = `Erro: ${progress.errors.join(', ')}`;
    }

    // Atualizar loading overlay se disponível
    if (loadingManager && loadingManager.loadingOverlay) {
      loadingManager.updateLoadingMessage(message);
    } else {
      setStatus(message, progress.status === 'error' ? 'error' : 'info');
    }

    // Atualizar animação de startup se ativa
    if (systemStartup && systemStartup.isRunning()) {
      // Usar mensagens mais específicas baseadas no progresso
      let startupMessage = 'Carregando bases de dados...';

      if (progress.percentage >= 90) {
        startupMessage = 'Finalizando carregamento...';
      } else if (progress.percentage >= 60) {
        startupMessage = 'Processando dados...';
      } else if (progress.percentage >= 30) {
        startupMessage = 'Carregando arquivos...';
      }

      systemStartup.updateMessage(startupMessage);
    }
  }
}


// Serviços de integração de dados
function getProductDetails(coddv) {
  if (!coddv) return null;

  // Tentar usar indexador primeiro
  if (dataIndexer && DATABASE_STATUS.hasIndexes) {
    const details = dataIndexer.getProductDetails(coddv);
    if (details) {
      return {
        CODDV: details.coddv,
        BARRAS: details.barras,
        DESC: details.desc
      };
    }
  }

  // Fallback: buscar diretamente na base de dados global
  const cadastro = window.DB_CADASTRO?.BASE_CADASTRO || window.DATA_CADASTRO || DATA_CADASTRO || [];
  if (!cadastro.length) {
    console.warn('⚠️ BASE_CADASTRO não disponível para busca');
    return null;
  }

  const found = cadastro.find(item => item.CODDV === coddv);
  if (found) {
    console.log(`✅ Produto encontrado via fallback: ${coddv}`);
  }
  return found || null;
}

function getProductAddresses(coddv, cd) {
  if (!coddv || !cd) return [];

  // Tentar usar indexador primeiro
  if (dataIndexer && DATABASE_STATUS.hasIndexes) {
    return dataIndexer.getProductAddresses(coddv, cd);
  }

  // Fallback: buscar diretamente na base de dados global
  const enderecos = window.DB_END?.BASE_END || window.DATA_ENDERECOS || DATA_ENDERECOS || [];
  if (!enderecos.length) {
    console.warn('⚠️ BASE_END não disponível para busca');
    return [];
  }

  // Normalizar CD para comparação (pode ser string ou number)
  const cdNormalized = String(cd);
  const found = enderecos.filter(item =>
    item.CODDV === coddv && String(item.CD) === cdNormalized
  );

  if (found.length > 0) {
    console.log(`✅ ${found.length} endereço(s) encontrado(s) via fallback para ${coddv} no CD ${cd}`);
  }
  return found;
}

function validateProduct(coddv, cd) {
  if (!coddv || !cd) return { valid: false, message: 'CODDV e CD são obrigatórios' };

  const product = getProductDetails(coddv);
  if (!product) {
    return { valid: false, message: 'Produto não encontrado no cadastro' };
  }

  const addresses = getProductAddresses(coddv, cd);
  if (!addresses.length) {
    return { valid: false, message: `Produto não possui endereços no CD ${cd}` };
  }

  return {
    valid: true,
    product: product,
    addresses: addresses,
    message: `Produto encontrado com ${addresses.length} endereço(s)`
  };
}

// Enhanced search functionality
function updateSearchInfo() {
  const cdStatus = $('#cdStatus');

  if (!cdStatus) return;

  // Só mostrar status se a base de dados estiver carregada
  if (!APP_STATE.databaseReady) {
    cdStatus.textContent = 'Carregando...';
    cdStatus.style.background = 'rgba(251, 191, 36, 0.1)';
    cdStatus.style.color = '#d97706';
    return;
  }

  if (APP_STATE.selectedCD && APP_STATE.selectedCDName) {
    cdStatus.textContent = `${APP_STATE.selectedCDName} selecionado`;
    cdStatus.style.background = 'rgba(16, 185, 129, 0.1)';
    cdStatus.style.color = '#059669';
    cdStatus.style.opacity = '1';
    cdStatus.style.transition = 'opacity 0.3s ease';

    // Limpar timeout anterior se existir
    if (cdStatus.hideTimeout) {
      clearTimeout(cdStatus.hideTimeout);
    }

    // Esconder após 3 segundos
    cdStatus.hideTimeout = setTimeout(() => {
      cdStatus.style.opacity = '0';
      setTimeout(() => {
        if (APP_STATE.selectedCD) { // Só esconder se ainda tiver CD selecionado
          cdStatus.textContent = '';
        }
      }, 300);
    }, 3000);

  } else {
    cdStatus.textContent = 'Selecione um depósito';
    cdStatus.style.background = 'rgba(148, 163, 184, 0.1)';
    cdStatus.style.color = '#64748b';
    cdStatus.style.opacity = '1';

    // Limpar timeout se existir
    if (cdStatus.hideTimeout) {
      clearTimeout(cdStatus.hideTimeout);
    }
  }
}

// Save search to history (simplified)
function saveSearchToHistory(coddv) {
  try {
    const now = new Date().toISOString();
    localStorage.setItem('lastSearchTime', now);
  } catch (error) {
    console.error('Erro ao salvar histórico de busca:', error);
  }
}

// Gerenciamento de CD
function handleCDSelection(cd) {
  const cdDisplayName = window.CDMapper ? window.CDMapper.getCDDisplayName(cd) : cd;
  console.log(`📦 CD selecionado: ${cd} (${cdDisplayName})`);

  APP_STATE.selectedCD = cd;
  APP_STATE.selectedCDName = cdDisplayName;

  // Habilitar/desabilitar campo de busca
  const coddvInput = $('#coddvInput');
  const btnBuscar = $('#btnBuscar');

  if (cd) {
    coddvInput.disabled = false;
    coddvInput.placeholder = `Digite o CODDV (ou múltiplos separados por vírgula)...`;
    btnBuscar.disabled = false;
    coddvInput.focus();
  } else {
    coddvInput.disabled = true;
    coddvInput.placeholder = 'Selecione um CD primeiro';
    coddvInput.value = '';
    btnBuscar.disabled = true;
  }

  // Limpar lista se CD mudou e há produtos
  if (APP_STATE.productList.size > 0) {
    const confirmClear = confirm(
      'Alterar o CD irá limpar a lista atual de produtos. Deseja continuar?'
    );

    if (confirmClear) {
      clearProductList();
    } else {
      // Reverter seleção de CD
      const cdSelect = $('#cdSelect');
      cdSelect.value = APP_STATE.selectedCD || '';
      return;
    }
  }

  // Update enhanced search info
  updateSearchInfo();
  updateUI();
}

// Busca de produtos (suporte a múltiplos CODDVs - processamento um por vez)
function handleProductSearch() {
  const coddvInput = $('#coddvInput');
  const btnBuscar = $('#btnBuscar');
  const input = coddvInput.value.trim();

  if (!input) {
    showSearchStatus('Digite um ou mais CODDVs para buscar', 'warning');
    return;
  }

  if (!APP_STATE.selectedCD) {
    showSearchStatus('Selecione um CD primeiro', 'error');
    return;
  }

  if (!APP_STATE.databaseReady) {
    showSearchStatus('Aguarde o carregamento das bases de dados', 'warning');
    return;
  }

  // Processar múltiplos CODDVs (separados por vírgula, espaço ou quebra de linha)
  const coddvs = input
    .split(/[,\s\n]+/)
    .map(coddv => coddv.trim())
    .filter(coddv => coddv.length > 0);

  if (coddvs.length === 0) {
    showSearchStatus('Digite pelo menos um CODDV válido', 'warning');
    return;
  }

  console.log(`🔍 Processando ${coddvs.length} produto(s) um por vez:`, coddvs);

  // Mostrar loading no botão de busca
  if (loadingManager) {
    loadingManager.showButtonLoading(btnBuscar, `Processando ${coddvs.length} produto(s)...`, 'small');
  } else {
    btnBuscar.classList.add('btn-loading');
    btnBuscar.disabled = true;
  }

  // Limpar campo de busca imediatamente
  coddvInput.value = '';

  // Processar produtos um por vez com delay
  processProductsOneByOne(coddvs, btnBuscar, coddvInput);
}

// Função para processar produtos um por vez
async function processProductsOneByOne(coddvs, btnBuscar, coddvInput) {
  let addedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  const errors = [];
  let currentIndex = 0;

  try {
    for (const coddv of coddvs) {
      currentIndex++;

      // Atualizar status do botão com progresso
      const progressText = `${currentIndex}/${coddvs.length}: ${coddv}`;
      if (loadingManager) {
        loadingManager.updateButtonLoading(btnBuscar, progressText);
      }

      // Mostrar status atual
      showSearchStatus(`Processando ${coddv} (${currentIndex}/${coddvs.length})...`, 'info');

      // Verificar se produto já está na lista
      if (APP_STATE.productList.has(coddv)) {
        console.log(`⚠️ Produto ${coddv} já está na lista`);
        skippedCount++;

        // Pequena pausa antes do próximo
        await new Promise(resolve => setTimeout(resolve, 300));
        continue;
      }

      // Validar produto
      let validation;
      try {
        validation = validateProduct(coddv, APP_STATE.selectedCD);
      } catch (e) {
        console.error(`Erro ao validar produto ${coddv}:`, e);
        validation = { valid: false, message: `Erro interno ao validar: ${e.message}` };
      }

      if (!validation.valid) {
        console.log(`❌ Produto ${coddv}: ${validation.message}`);
        errors.push(`${coddv}: ${validation.message}`);
        errorCount++;

        // Mostrar erro temporariamente
        showSearchStatus(`Erro: ${coddv} - ${validation.message}`, 'error');

        // Pausa antes do próximo
        await new Promise(resolve => setTimeout(resolve, 800));
        continue;
      }

      // Adicionar produto à lista (um por vez)
      try {
        addProductToList(validation.product, validation.addresses);
        addedCount++;
        console.log(`✅ Produto ${coddv} adicionado com sucesso`);

        // Mostrar sucesso temporariamente
        showSearchStatus(`✅ ${coddv} adicionado (${addedCount}/${coddvs.length})`, 'success');
      } catch (e) {
        console.error(`Erro ao adicionar produto ${coddv}:`, e);
        errors.push(`${coddv}: Erro ao adicionar à lista`);
        errorCount++;
      }

      // Pausa entre adições para visualizar o processo
      await new Promise(resolve => setTimeout(resolve, 600));
    }
  } catch (error) {
    console.error('Erro fatal no processamento em lote:', error);
    showSearchStatus(`Erro no processamento: ${error.message}`, 'error');
  } finally {
    // Finalizar processamento SEMPRE, mesmo com erro
    finalizeBatchProcessing(addedCount, skippedCount, errorCount, errors, btnBuscar, coddvInput);
  }
}

// Finalizar processamento em lote
function finalizeBatchProcessing(addedCount, skippedCount, errorCount, errors, btnBuscar, coddvInput) {
  // Save search to history
  const timestamp = new Date().toISOString();
  saveSearchToHistory(`Lote: ${addedCount + skippedCount + errorCount} produtos`);

  // Remover loading do botão de busca
  if (loadingManager) {
    loadingManager.hideButtonLoading(btnBuscar);
  } else {
    btnBuscar.classList.remove('btn-loading');
    btnBuscar.disabled = false;
  }

  // Focar no campo de busca
  coddvInput.focus();

  // Mostrar resultado final
  let statusMessage = '';
  let statusType = 'info';

  if (addedCount > 0) {
    statusMessage = `✅ Processamento concluído: ${addedCount} produto(s) adicionado(s)`;
    statusType = 'success';

    if (skippedCount > 0) {
      statusMessage += `, ${skippedCount} já na lista`;
    }
    if (errorCount > 0) {
      statusMessage += `, ${errorCount} com erro`;
    }
  } else if (skippedCount > 0 && errorCount === 0) {
    statusMessage = `⚠️ Todos os ${skippedCount} produto(s) já estão na lista`;
    statusType = 'warning';
  } else if (errorCount > 0) {
    statusMessage = `❌ ${errorCount} produto(s) com erro`;
    statusType = 'error';
  }

  showSearchStatus(statusMessage, statusType);

  // Mostrar detalhes dos erros se houver (após um delay)
  if (errors.length > 0 && errors.length <= 3) {
    setTimeout(() => {
      showSearchStatus(`Erros encontrados: ${errors.join('; ')}`, 'error');
    }, 4000);
  }

  console.log(`📊 Processamento finalizado: ${addedCount} adicionados, ${skippedCount} ignorados, ${errorCount} erros`);
}

// Gerenciamento da lista de produtos
function addProductToList(product, addresses) {
  const productData = {
    ...product,
    addresses: addresses,
    addedAt: new Date(),
    cd: APP_STATE.selectedCD
  };

  APP_STATE.productList.set(product.CODDV, productData);

  console.log(`➕ Produto adicionado: ${product.CODDV} - ${product.DESC}`);

  renderProductList();
  updateUI();

  // Apply highlight animation to newly added product (Requirement 4.3)
  setTimeout(() => {
    const productElement = document.querySelector(`[data-coddv="${product.CODDV}"]`);
    if (productElement) {
      // Use AnimationManager if available, otherwise fallback to CSS classes
      if (animationManager) {
        animationManager.applyFeedbackAnimation(productElement, 'highlight');
      } else {
        productElement.classList.add('product-item-added');
        // Remove class after animation completes
        setTimeout(() => {
          productElement.classList.remove('product-item-added');
        }, 1000);
      }
    }
  }, 100);

  toast(`Produto adicionado: ${product.CODDV}`, 'success');
}

function removeProductFromList(coddv) {
  if (APP_STATE.productList.has(coddv)) {
    const product = APP_STATE.productList.get(coddv);

    // Apply fadeOut animation before removing (Requirement 4.4)
    const productElement = document.querySelector(`[data-coddv="${coddv}"]`);
    if (productElement) {
      // Use AnimationManager if available, otherwise fallback to CSS classes
      if (animationManager) {
        animationManager.applyFeedbackAnimation(productElement, 'remove', {
          callback: () => {
            APP_STATE.productList.delete(coddv);
            console.log(`➖ Produto removido: ${coddv} - ${product.DESC}`);

            renderProductList();
            updateUI();

            toast(`Produto removido: ${coddv}`, 'info');
          }
        });
      } else {
        productElement.classList.add('product-item-removing');

        // Wait for animation to complete before removing from data and re-rendering
        setTimeout(() => {
          APP_STATE.productList.delete(coddv);
          console.log(`➖ Produto removido: ${coddv} - ${product.DESC}`);

          renderProductList();
          updateUI();

          toast(`Produto removido: ${coddv}`, 'info');
        }, 300); // Match animation duration
      }
    } else {
      // Fallback if element not found
      APP_STATE.productList.delete(coddv);
      console.log(`➖ Produto removido: ${coddv} - ${product.DESC}`);

      renderProductList();
      updateUI();

      toast(`Produto removido: ${coddv}`, 'info');
    }
  }
}

function clearProductList() {
  APP_STATE.productList.clear();
  renderProductList();
  updateUI();

  toast('Lista limpa', 'info');
}

// Renderização da lista de produtos
function renderProductList() {
  const productList = $('#productList');
  const productCount = $('#productCount');

  if (!productList || !productCount) return;

  const products = Array.from(APP_STATE.productList.values());
  productCount.textContent = products.length;

  if (products.length === 0) {
    productList.innerHTML = `
      <div class="empty-list">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-4"/>
          <path d="M9 7V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v3"/>
        </svg>
        <p>Nenhum produto adicionado ainda</p>
        <small>Use o campo de busca acima para adicionar produtos</small>
      </div>
    `;
    return;
  }

  productList.innerHTML = products.map((product, index) => {
    const addressCount = product.addresses ? product.addresses.length : 0;
    const staggerClass = `animate-slide-up-field stagger-${Math.min(index + 1, 8)}`;
    return `
    <div class="product-item hover-card ${staggerClass}" data-coddv="${product.CODDV}">
      <div class="product-info">
        <div class="product-coddv">${product.CODDV}</div>
        <div class="product-desc">${escapeHtml(product.DESC)}</div>
      </div>
      <div class="product-actions">
        <span class="address-count" title="${addressCount} endereço(s)">${addressCount} end.</span>
        <button class="btn-remove btn-remove-animated" onclick="removeProductFromList('${product.CODDV}')" title="Remover produto">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 6h18"/>
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
          </svg>
        </button>
      </div>
    </div>
  `}).join('');
}

// Geração de folhas individuais
function generateIndividualSheets() {
  if (APP_STATE.productList.size === 0) {
    toast('Adicione produtos à lista primeiro', 'warning');
    return;
  }

  if (!APP_STATE.selectedCD) {
    toast('Selecione um CD primeiro', 'error');
    return;
  }

  const products = Array.from(APP_STATE.productList.values());
  const totalSheets = products.length;

  console.log(`📄 Gerando ${totalSheets} folhas individuais...`);

  // Gerar HTML de todas as folhas
  const allSheetsHTML = generateAllSheetsHTML(products, totalSheets);

  // Abrir em nova janela para impressão
  const printWindow = window.open('', '_blank');
  printWindow.document.write(allSheetsHTML);
  printWindow.document.close();

  // Focar na nova janela
  printWindow.focus();

  // Imprimir automaticamente após um breve delay
  setTimeout(() => {
    printWindow.print();
  }, 500);

  toast(`${totalSheets} folhas geradas com sucesso!`, 'success');
}

// Nova função para gerar relatório de inventário com sistema de progresso
function generateOptimizedDocument() {
  const btnGerarOtimizado = $('#btnGerarOtimizado');

  if (APP_STATE.productList.size === 0) {
    toast('Adicione produtos à lista primeiro', 'warning');
    return;
  }

  if (!APP_STATE.selectedCD) {
    toast('Selecione um CD primeiro', 'error');
    return;
  }

  console.log('📄 Gerando relatório de inventário...');

  // Mostrar loading no botão
  if (loadingManager) {
    loadingManager.showButtonLoading(btnGerarOtimizado, 'Gerando...', 'normal');
  } else {
    btnGerarOtimizado.classList.add('btn-loading');
    btnGerarOtimizado.disabled = true;
  }

  // Mostrar toast de progresso com sistema adaptado do etiqueta-mercadoria
  const progressToast = showProgressToast('Iniciando geração do relatório...', {
    showProgress: true,
    type: 'loading',
    onCancel: () => {
      console.log('🚫 Geração de relatório cancelada pelo usuário');
      // Cleanup em caso de cancelamento
      if (loadingManager) {
        loadingManager.hideButtonLoading(btnGerarOtimizado);
      } else {
        btnGerarOtimizado.classList.remove('btn-loading');
        btnGerarOtimizado.disabled = false;
      }
      toast('Geração de relatório cancelada', 'info');
    }
  });

  // Simular progresso de geração de documento
  let currentProgress = 0;
  const progressSteps = [
    { progress: 10, message: 'Validando dados dos produtos...', delay: 200 },
    { progress: 25, message: 'Inicializando sistema de otimização...', delay: 300 },
    { progress: 40, message: 'Processando endereços...', delay: 400 },
    { progress: 60, message: 'Gerando estrutura do documento...', delay: 500 },
    { progress: 80, message: 'Aplicando formatação...', delay: 300 },
    { progress: 95, message: 'Finalizando documento...', delay: 200 },
    { progress: 100, message: 'Documento gerado com sucesso!', delay: 100 }
  ];

  // Função para atualizar progresso
  const updateProgress = (stepIndex = 0) => {
    if (stepIndex >= progressSteps.length) {
      // Progresso completo - executar geração real
      executeDocumentGeneration(progressToast);
      return;
    }

    const step = progressSteps[stepIndex];

    // Atualizar toast de progresso
    progressToast.updateProgress(step.progress);
    progressToast.updateMessage(step.message);

    console.log(`📊 Progresso: ${step.progress}% - ${step.message}`);

    // Próximo passo
    setTimeout(() => {
      updateProgress(stepIndex + 1);
    }, step.delay);
  };

  // Iniciar simulação de progresso
  setTimeout(() => {
    updateProgress();
  }, 100);

  // Função para executar a geração real do documento
  async function executeDocumentGeneration(progressToast) {
    try {
      // Verificar se o otimizador está disponível
      if (typeof DocumentPrintOptimizer === 'undefined') {
        console.error('DocumentPrintOptimizer não está disponível');
        progressToast.updateType('error');
        progressToast.updateMessage('Sistema de otimização não carregado', 'Verifique se todos os scripts foram carregados');

        setTimeout(() => {
          progressToast.hide();
          toast('Sistema de otimização não carregado. Verifique se todos os scripts foram carregados.', 'error');
        }, 2000);
        return;
      }

      // Validar dados antes de processar
      const products = Array.from(APP_STATE.productList.values());
      const invalidProducts = products.filter(p => !p.CODDV || !p.DESC);

      if (invalidProducts.length > 0) {
        console.warn('Produtos com dados incompletos encontrados:', invalidProducts);
        progressToast.updateMessage('Produtos com dados incompletos encontrados', `${invalidProducts.length} produto(s) serão ignorados`);

        setTimeout(() => {
          toast(`${invalidProducts.length} produto(s) com dados incompletos serão ignorados`, 'warning');
        }, 1000);
      }

      // Criar e inicializar o otimizador com configuração A4 otimizada
      const optimizer = new DocumentPrintOptimizer({
        productsPerPage: 1, // 1 produto por página para A4
        pageMargins: '10mm', // Margens reduzidas
        logoPath: '../assets/pm.png', // Usar o caminho correto do logo
        fontSizes: {
          title: '16px',
          subtitle: '12px',
          body: '10px',
          small: '9px'
        }
      });

      // Inicializar com o dataIndexer existente
      if (dataIndexer) {
        try {
          optimizer.initialize(dataIndexer);
          console.log('✅ Otimizador inicializado com dataIndexer');
        } catch (initError) {
          console.warn('Erro ao inicializar com dataIndexer:', initError);
          throw new Error('Falha na inicialização do sistema de dados');
        }
      } else {
        console.warn('DataIndexer não disponível, usando dados básicos');

        // Criar um mock robusto do dataIndexer
        const mockDataIndexer = {
          getProductDetails: (coddv) => {
            try {
              const product = Array.from(APP_STATE.productList.values()).find(p => p.CODDV === coddv);
              return product || null;
            } catch (error) {
              console.error('Erro ao buscar detalhes do produto:', error);
              return null;
            }
          },
          getProductAddresses: (coddv, cd) => {
            try {
              const product = APP_STATE.productList.get(coddv);
              return product ? product.addresses || [] : [];
            } catch (error) {
              console.error('Erro ao buscar endereços do produto:', error);
              return [];
            }
          },
          getExcludedAddresses: (coddv, cd) => {
            try {
              // Usar dataIndexer se disponível, senão retornar array vazio
              if (dataIndexer && typeof dataIndexer.getExcludedAddresses === 'function') {
                return dataIndexer.getExcludedAddresses(coddv, cd);
              }
              return [];
            } catch (error) {
              console.error('Erro ao buscar endereços excluídos:', error);
              return [];
            }
          }
        };

        optimizer.initialize(mockDataIndexer);
        console.log('✅ Otimizador inicializado com mock dataIndexer');
      }

      // Gerar documento otimizado
      console.log('🔄 Gerando documento...');
      const result = optimizer.generateOptimizedDocument(APP_STATE.productList, APP_STATE.selectedCD);

      if (!result || !result.html) {
        throw new Error('Falha na geração do documento - resultado inválido');
      }

      console.log('✅ Relatório de inventário gerado:', {
        totalPages: result.totalPages,
        totalProducts: result.totalProducts,
        cd: result.cd,
        htmlLength: result.html.length
      });

      // Validar HTML gerado
      if (result.html.length < 1000) {
        console.warn('HTML gerado parece muito pequeno:', result.html.length, 'caracteres');
      }

      // Atualizar toast para sucesso
      progressToast.updateType('success');
      progressToast.updateMessage('Documento gerado com sucesso!', `${result.totalPages} páginas, ${result.totalProducts} produtos`);

      // Incrementar contador global se disponível e mostrar popup fancy
      let contadorAtualizado = null;
      if (window.contadorGlobal) {
        try {
          contadorAtualizado = await window.contadorGlobal.incrementarContador(1, 'inventario');
          console.log(`✅ Contador incrementado: +1 inventario = ${contadorAtualizado}`);
        } catch (e) {
          console.warn('⚠️ Erro ao incrementar contador global:', e);
        }
      }

      // Abrir em nova janela para impressão
      setTimeout(() => {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(result.html);
          printWindow.document.close();
          printWindow.focus();

          // Imprimir automaticamente após um breve delay
          setTimeout(() => {
            printWindow.print();
          }, 500);
        }

        // Ocultar toast de progresso após sucesso
        setTimeout(() => {
          progressToast.hide();

          // Mostrar popup de sucesso fancy se disponível, senão usar toast normal
          if (typeof window.mostrarPopupSucesso === 'function' && contadorAtualizado !== null) {
            window.mostrarPopupSucesso(
              'Documento gerado com sucesso!',
              ''
            );
          } else {
            toast('Relatório de inventário gerado!', 'success');
          }
        }, 2000);
      }, 1000);

    } catch (error) {
      console.error('❌ Erro ao gerar relatório de inventário:', error);

      // Atualizar toast para erro
      progressToast.updateType('error');

      // Tratamento específico de diferentes tipos de erro
      let userMessage = 'Erro desconhecido ao gerar relatório';
      let subtitle = '';

      if (error.message.includes('não carregado')) {
        userMessage = 'Sistema não carregado completamente';
        subtitle = 'Recarregue a página e tente novamente';
      } else if (error.message.includes('dados')) {
        userMessage = 'Erro nos dados dos produtos';
        subtitle = 'Verifique se todos os produtos têm informações válidas';
      } else if (error.message.includes('inicialização')) {
        userMessage = 'Erro na inicialização do sistema';
        subtitle = 'Recarregue a página e tente novamente';
      } else {
        userMessage = 'Erro ao gerar relatório';
        subtitle = error.message;
      }

      progressToast.updateMessage(userMessage, subtitle);

      // Ocultar toast de erro após delay
      setTimeout(() => {
        progressToast.hide();
        toast(userMessage + (subtitle ? ': ' + subtitle : ''), 'error', 5000);
      }, 3000);

      // Log detalhado para debug
      console.error('Detalhes do erro:', {
        message: error.message,
        stack: error.stack,
        productCount: APP_STATE.productList.size,
        selectedCD: APP_STATE.selectedCD,
        dataIndexerAvailable: !!dataIndexer,
        optimizerAvailable: typeof DocumentPrintOptimizer !== 'undefined'
      });
    } finally {
      // Remover loading do botão
      if (loadingManager) {
        loadingManager.hideButtonLoading(btnGerarOtimizado);
      } else {
        btnGerarOtimizado.classList.remove('btn-loading');
        btnGerarOtimizado.disabled = false;
      }
    }
  }
}

// Gerar HTML de todas as folhas individuais
function generateAllSheetsHTML(products, totalSheets) {
  const timestamp = new Date().toLocaleString('pt-BR');

  let allSheetsHTML = `
    <!DOCTYPE html>
    <html lang="pt-br">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Inventário - ${totalSheets} Folhas</title>
      <style>
        @page {
          size: A4;
          margin: 15mm;
        }
        
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 0;
          line-height: 1.4;
        }
        
        .sheet {
          page-break-after: always;
          min-height: 250mm;
          padding: 10mm;
          border: 1px solid #ddd;
          margin-bottom: 5mm;
        }
        
        .sheet:last-child {
          page-break-after: avoid;
        }
        
        .sheet-header {
          text-align: center;
          border-bottom: 2px solid #333;
          padding-bottom: 8px;
          margin-bottom: 15px;
        }
        
        .sheet-title {
          font-size: 18px;
          font-weight: bold;
          margin: 0;
        }
        
        .sheet-subtitle {
          font-size: 12px;
          color: #666;
          margin: 2px 0;
        }
        
        .sheet-info {
          display: flex;
          justify-content: space-between;
          margin: 10px 0;
          font-size: 11px;
        }
        
        .product-section {
          margin: 15px 0;
        }
        
        .product-header {
          background: #f5f5f5;
          padding: 8px;
          border: 1px solid #ddd;
          font-weight: bold;
          font-size: 14px;
        }
        
        .product-details {
          padding: 8px;
          border: 1px solid #ddd;
          border-top: none;
          font-size: 12px;
        }
        
        .addresses-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
        }
        
        .addresses-table th,
        .addresses-table td {
          border: 1px solid #ddd;
          padding: 6px;
          text-align: left;
          font-size: 11px;
        }
        
        .addresses-table th {
          background: #f9f9f9;
          font-weight: bold;
        }
        
        .count-section {
          margin-top: 20px;
          padding: 10px;
          border: 2px solid #333;
          background: #f9f9f9;
        }
        
        .count-title {
          font-weight: bold;
          margin-bottom: 10px;
        }
        
        .count-boxes {
          display: flex;
          gap: 15px;
          flex-wrap: wrap;
        }
        
        .count-box {
          border: 1px solid #333;
          padding: 8px;
          min-width: 80px;
          text-align: center;
        }
        
        .count-label {
          font-size: 10px;
          margin-bottom: 5px;
        }
        
        .count-value {
          font-size: 16px;
          font-weight: bold;
          border-bottom: 1px solid #333;
          min-height: 20px;
        }
        
        @media print {
          body { margin: 0; }
          .sheet { margin: 0; border: none; }
        }
      </style>
    </head>
    <body>
  `;

  products.forEach((product, index) => {
    const sheetNumber = index + 1;
    const sheetHTML = generateSingleSheetHTML(product, sheetNumber, totalSheets, timestamp);
    allSheetsHTML += sheetHTML;
  });

  allSheetsHTML += `
    </body>
    </html>
  `;

  return allSheetsHTML;
}

// Função auxiliar CORRIGIDA para obter TODOS os códigos de barras de um produto
// Corrigida para a estrutura real da base BARRAS onde cada código está em um registro separado
function getAllProductBarcodes(product) {
  console.log(`🔍 Iniciando busca de códigos de barras para CODDV: ${product?.CODDV}`);

  const barcodes = [];

  if (!product || !product.CODDV) {
    console.warn('⚠️ Produto ou CODDV não fornecido para busca de códigos de barras');
    return [];
  }

  const coddv = product.CODDV;

  // MÉTODO 1: Usar dataIndexer se disponível
  if (dataIndexer && typeof dataIndexer.getAllProductBarcodes === 'function') {
    console.log(`🔍 Usando dataIndexer.getAllProductBarcodes()`);
    const indexerBarcodes = dataIndexer.getAllProductBarcodes(coddv);
    if (indexerBarcodes && indexerBarcodes.length > 0) {
      barcodes.push(...indexerBarcodes);
      console.log(`✅ DataIndexer encontrou ${indexerBarcodes.length} códigos:`, indexerBarcodes);
    }
  }

  // MÉTODO 2: Buscar diretamente na base DATA_CADASTRO (fallback)
  if (barcodes.length === 0 && typeof DATA_CADASTRO !== 'undefined' && DATA_CADASTRO.length > 0) {
    console.log(`🔍 Buscando diretamente na DATA_CADASTRO...`);

    // Filtrar TODOS os registros com o mesmo CODDV
    const allProductRecords = DATA_CADASTRO.filter(record =>
      record && record.CODDV === coddv
    );

    console.log(`📋 Encontrados ${allProductRecords.length} registros para CODDV ${coddv}`);

    // Extrair códigos de barras de TODOS os registros
    allProductRecords.forEach((record, index) => {
      console.log(`🔍 Analisando registro ${index + 1}:`, record);

      if (record.BARRAS && typeof record.BARRAS === 'string' && record.BARRAS.trim() !== '') {
        barcodes.push(record.BARRAS.trim());
        console.log(`➕ Código adicionado do registro ${index + 1}: ${record.BARRAS.trim()}`);
      }
    });
  }

  // MÉTODO 3: Usar dados do produto atual (método antigo como fallback)
  if (barcodes.length === 0) {
    console.log(`🔍 Usando método fallback com dados do produto atual...`);

    // Lista de campos possíveis para códigos de barras
    const barcodeFields = [
      'BARRAS', 'barras', 'codigoBarras', 'codigo_barras', 'CODIGO_BARRAS',
      'ean', 'EAN', 'gtin', 'GTIN', 'upc', 'UPC', 'codbar', 'CODBAR'
    ];

    // Verificar campos no produto atual
    barcodeFields.forEach(field => {
      if (product[field]) {
        console.log(`🔍 Campo '${field}' encontrado:`, product[field]);

        if (typeof product[field] === 'string' && product[field].trim() !== '') {
          barcodes.push(product[field].trim());
          console.log(`➕ Adicionado código string do campo '${field}': ${product[field].trim()}`);
        } else if (Array.isArray(product[field])) {
          const validCodes = product[field].filter(code =>
            code && typeof code === 'string' && code.trim() !== ''
          ).map(code => code.trim());

          barcodes.push(...validCodes);
          console.log(`➕ Adicionados ${validCodes.length} códigos do array '${field}':`, validCodes);
        } else if (typeof product[field] === 'number') {
          const codeStr = product[field].toString();
          barcodes.push(codeStr);
          console.log(`➕ Adicionado código numérico do campo '${field}': ${codeStr}`);
        }
      }
    });
  }

  // Remover duplicatas e valores vazios com validação extra
  const uniqueBarcodes = [...new Set(barcodes.filter(barcode => {
    if (!barcode) return false;
    if (typeof barcode !== 'string') return false;
    if (barcode.trim() === '') return false;
    if (barcode.length < 3) return false; // Códigos muito curtos provavelmente são inválidos
    return true;
  }))];

  console.log(`📊 RESULTADO FINAL - CODDV ${coddv}:`);
  console.log(`   • Registros encontrados na base: ${typeof DATA_CADASTRO !== 'undefined' ? DATA_CADASTRO.filter(r => r && r.CODDV === coddv).length : 'N/A'}`);
  console.log(`   • Códigos brutos coletados: ${barcodes.length}`);
  console.log(`   • Códigos únicos válidos: ${uniqueBarcodes.length}`);
  console.log(`   • Códigos finais:`, uniqueBarcodes);

  if (uniqueBarcodes.length === 0) {
    console.warn(`⚠️ ATENÇÃO: Nenhum código de barras válido encontrado para CODDV ${coddv}`);
  } else if (uniqueBarcodes.length > 1) {
    console.log(`✅ SUCESSO: ${uniqueBarcodes.length} códigos de barras encontrados para CODDV ${coddv}`);
  }

  return uniqueBarcodes;
}

// Gerar HTML de uma folha individual - VERSÃO COMPLETA
function generateSingleSheetHTML(product, sheetNumber, totalSheets, timestamp) {
  const addresses = product.addresses || [];
  const allBarcodes = getAllProductBarcodes(product);

  // Criar exibição COMPLETA dos códigos de barras
  let barcodesDisplay = 'N/A';
  let barcodesInfo = '';

  if (allBarcodes.length > 0) {
    barcodesDisplay = allBarcodes.join(' • ');

    if (allBarcodes.length === 1) {
      barcodesInfo = `(${allBarcodes.length} código)`;
    } else {
      barcodesInfo = `(${allBarcodes.length} códigos)`;
      console.log(`✅ MÚLTIPLOS CÓDIGOS DETECTADOS para CODDV ${product.CODDV}: ${allBarcodes.length} códigos`);
    }
  } else {
    console.warn(`⚠️ NENHUM CÓDIGO DE BARRAS encontrado para CODDV ${product.CODDV}`);
    barcodesInfo = '(0 códigos)';
  }

  let addressesHTML = '';
  if (addresses.length > 0) {
    addressesHTML = `
      <table class="addresses-table">
        <thead>
          <tr>
            <th>Endereço</th>
            <th>Tipo</th>
            <th>Observações</th>
          </tr>
        </thead>
        <tbody>
    `;

    addresses.forEach(addr => {
      addressesHTML += `
        <tr>
          <td><strong>${escapeHtml(addr.endereco || addr.ENDERECO || 'N/A')}</strong></td>
          <td>${escapeHtml(addr.tipo || addr.TIPO || 'N/A')}</td>
          <td style="width: 40%; border-bottom: 1px dotted #ccc; min-height: 20px;"></td>
        </tr>
      `;
    });

    addressesHTML += `
        </tbody>
      </table>
    `;
  } else {
    const cdDisplayName = APP_STATE.selectedCDName || APP_STATE.selectedCD;
    addressesHTML = `
      <div style="padding: 10px; text-align: center; color: #666; font-style: italic;">
        Nenhum endereço encontrado para este produto no ${cdDisplayName}
      </div>
    `;
  }

  // Buscar endereços excluídos para este produto e CD
  let excludedAddressesHTML = '';
  if (dataIndexer) {
    const excludedAddresses = dataIndexer.getExcludedAddresses(product.CODDV, APP_STATE.selectedCD);

    if (excludedAddresses.length > 0) {
      excludedAddressesHTML = `
        <div style="margin-top: 20px; border-top: 2px solid #dc2626; padding-top: 15px;">
          <div style="color: #dc2626; font-weight: bold; margin-bottom: 10px;">
            ⚠️ ATENÇÃO - HISTÓRICO DE ENDEREÇOS EXCLUÍDOS (${excludedAddresses.length}):
          </div>
          <table class="excluded-addresses-table">
            <thead>
              <tr>
                <th>Endereço Excluído</th>
                <th>Data de Exclusão</th>
                <th>Motivo</th>
              </tr>
            </thead>
            <tbody>
      `;

      excludedAddresses.forEach(excluded => {
        excludedAddressesHTML += `
          <tr>
            <td><strong>${escapeHtml(excluded.endereco)}</strong></td>
            <td>${escapeHtml(excluded.exclusao)}</td>
            <td>${escapeHtml(excluded.motivo || '-')}</td>
          </tr>
        `;
      });

      excludedAddressesHTML += `
            </tbody>
          </table>
        </div>
      `;
    } else {
      // Sem endereços excluídos - mostrar aviso positivo
      const cdDisplayName = APP_STATE.selectedCDName || APP_STATE.selectedCD;
      excludedAddressesHTML = `
        <div style="margin-top: 20px; border-top: 2px solid #10b981; padding-top: 15px;">
          <div style="color: #10b981; font-weight: bold; display: flex; align-items: center; gap: 8px;">
            ✅ HISTÓRICO DE EXCLUSÕES: Nenhum endereço excluído para este produto no ${cdDisplayName}.
          </div>
        </div>
      `;
    }
  } else {
    // DataIndexer não disponível
    excludedAddressesHTML = `
      <div style="margin-top: 20px; border-top: 2px solid #f59e0b; padding-top: 15px;">
        <div style="color: #f59e0b; font-weight: bold;">
          ⚠️ HISTÓRICO DE EXCLUSÕES: Índice de exclusões não disponível.
        </div>
      </div>
    `;
  }

  const cdReportName = (window.CDMapper && APP_STATE.selectedCD)
    ? window.CDMapper.getCDReportName(APP_STATE.selectedCD)
    : `Centro de Distribuição ${APP_STATE.selectedCD}`;

  return `
    <div class="sheet">
      <div class="sheet-header">
        <h1 class="sheet-title">INVENTÁRIO - FOLHA INDIVIDUAL</h1>
        <div class="sheet-subtitle">${cdReportName}</div>
        <div class="sheet-subtitle">Folha ${sheetNumber} de ${totalSheets}</div>
      </div>
      
      <div class="sheet-info">
        <div><strong>Data/Hora:</strong> ${timestamp}</div>
        <div><strong>Sistema:</strong> Hub de Etiquetas</div>
      </div>
      
      <div class="product-section">
        <div class="product-header">
          PRODUTO: ${escapeHtml(product.DESC || 'Descrição não disponível')}
        </div>
        <div class="product-details">
          <div><strong>CODDV:</strong> ${escapeHtml(product.CODDV)}</div>
          <div><strong>Códigos de Barras ${barcodesInfo}:</strong> ${escapeHtml(barcodesDisplay)}</div>
          <div><strong>CD:</strong> ${APP_STATE.selectedCDName || APP_STATE.selectedCD}</div>
          <div><strong>Total de Endereços:</strong> ${addresses.length}</div>
        </div>
      </div>
      
      <div style="margin: 15px 0;">
        <strong>ENDEREÇOS PARA INVENTÁRIO:</strong>
        ${addressesHTML}
      </div>
      
      <div class="count-section">
        <div class="count-title">CONTAGEM FÍSICA:</div>
        <div class="count-boxes">
          <div class="count-box">
            <div class="count-label">CONTADO</div>
            <div class="count-value"></div>
          </div>
          <div class="count-box">
            <div class="count-label">CONFERIDO</div>
            <div class="count-value"></div>
          </div>
          <div class="count-box">
            <div class="count-label">OBSERVAÇÕES</div>
            <div class="count-value" style="min-width: 200px;"></div>
          </div>
        </div>
        
        <div style="margin-top: 15px; font-size: 11px;">
          <div><strong>Responsável:</strong> ________________________________</div>
          <div style="margin-top: 8px;"><strong>Assinatura:</strong> ________________________________</div>
        </div>
      </div>
      
      ${excludedAddressesHTML}
    </div>
  `;
}

// Mostrar status de busca
function showSearchStatus(message, type = 'info') {
  const searchStatus = $('#searchStatus');
  if (!searchStatus) return;

  const colors = {
    info: { bg: '#e0f2fe', color: '#0369a1', border: '#0ea5e9' },
    success: { bg: '#dcfce7', color: '#166534', border: '#22c55e' },
    warning: { bg: '#fef3c7', color: '#92400e', border: '#f59e0b' },
    error: { bg: '#fecaca', color: '#991b1b', border: '#ef4444' }
  };

  // Clear any existing timeout
  if (searchStatus.hideTimeout) {
    clearTimeout(searchStatus.hideTimeout);
  }

  // Remove any existing animation classes and reset
  searchStatus.classList.remove('animate-slide-in-down', 'feedback-fade-out');

  // Set content and styles
  searchStatus.textContent = message;
  searchStatus.style.display = 'block';
  searchStatus.style.background = colors[type].bg;
  searchStatus.style.color = colors[type].color;
  searchStatus.style.borderColor = colors[type].border;
  searchStatus.hidden = false;

  // Trigger slideInDown animation
  setTimeout(() => {
    searchStatus.classList.add('animate-slide-in-down');
  }, 10);

  // Auto-hide after 4 seconds for success/info messages with fade out
  if (type === 'success' || type === 'info') {
    searchStatus.hideTimeout = setTimeout(() => {
      // Start fade out animation using CSS class
      searchStatus.classList.remove('animate-slide-in-down');
      searchStatus.classList.add('feedback-fade-out');

      // Hide element after animation completes
      setTimeout(() => {
        searchStatus.hidden = true;
        searchStatus.style.display = 'none';
        searchStatus.classList.remove('feedback-fade-out');
      }, 300); // Wait for fade transition to complete
    }, 4000); // Show for 4 seconds before starting fade
  }
}

// Atualizar interface do usuário
function updateUI() {
  const productListSection = $('#productListSection');
  const btnLimparLista = $('#btnLimparLista');
  const btnGerarOtimizado = $('#btnGerarOtimizado');

  if (!productListSection || !btnLimparLista) return;

  const hasProducts = APP_STATE.productList.size > 0;
  const isCurrentlyVisible = isSectionVisible(productListSection);

  // Mostrar/ocultar seção da lista com animação suave - Requirement 6.3
  if (hasProducts && !isCurrentlyVisible) {
    showSectionWithAnimation(productListSection);
  } else if (!hasProducts && isCurrentlyVisible) {
    hideSectionWithAnimation(productListSection);
  }

  // Habilitar/desabilitar botões
  btnLimparLista.disabled = !hasProducts;
  if (btnGerarOtimizado) {
    btnGerarOtimizado.disabled = !hasProducts;
  }

  // Atualizar classes dos botões
  if (hasProducts) {
    btnLimparLista.classList.remove('disabled');
    if (btnGerarOtimizado) {
      btnGerarOtimizado.classList.remove('disabled');
    }
  } else {
    btnLimparLista.classList.add('disabled');
    if (btnGerarOtimizado) {
      btnGerarOtimizado.classList.add('disabled');
    }
  }
}

// Configurar interface inicial
function setupInterface() {
  console.log('🔧 Configurando interface do inventário...');

  // Event listeners para seleção de CD
  const cdSelect = $('#cdSelect');
  if (cdSelect) {
    cdSelect.addEventListener('change', (e) => {
      handleCDSelection(e.target.value);
    });
  }

  // Event listeners para busca de produto
  const coddvInput = $('#coddvInput');
  const btnBuscar = $('#btnBuscar');

  if (coddvInput) {
    coddvInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleProductSearch();
      }
    });

    // Auto-focus quando habilitado
    coddvInput.addEventListener('focus', () => {
      if (!coddvInput.disabled) {
        coddvInput.select();
      }
    });
  }

  if (btnBuscar) {
    btnBuscar.addEventListener('click', handleProductSearch);
  }

  // Event listeners para botões da lista
  const btnLimparLista = $('#btnLimparLista');
  const btnGerarOtimizado = $('#btnGerarOtimizado');

  if (btnLimparLista) {
    btnLimparLista.addEventListener('click', () => {
      if (APP_STATE.productList.size > 0) {
        const confirmClear = confirm(
          `Tem certeza que deseja limpar a lista com ${APP_STATE.productList.size} produto(s)?`
        );
        if (confirmClear) {
          // Mostrar loading no botão
          if (loadingManager) {
            loadingManager.showButtonLoading(btnLimparLista, 'Limpando...', 'small');
          } else {
            btnLimparLista.classList.add('btn-loading');
            btnLimparLista.disabled = true;
          }

          // Simular delay para mostrar loading
          setTimeout(() => {
            try {
              clearProductList();
            } finally {
              // Remover loading do botão
              if (loadingManager) {
                loadingManager.hideButtonLoading(btnLimparLista);
              } else {
                btnLimparLista.classList.remove('btn-loading');
                btnLimparLista.disabled = false;
              }
            }
          }, 200);
        }
      }
    });
  }

  if (btnGerarOtimizado) {
    btnGerarOtimizado.addEventListener('click', generateOptimizedDocument);
  }

  // Event listener para botão de recarregar
  const btnReload = $('#btnReload');
  if (btnReload) {
    btnReload.addEventListener('click', () => {
      location.reload();
    });
  }

  // Configurar estado inicial
  updateUI();

  console.log('✅ Interface configurada com sucesso');
}

// ========================================
// SECTION ANIMATION UTILITIES - REQUIREMENT 6.3
// Utilitários para animações de mostrar/ocultar seções
// ========================================

/**
 * Mostra uma seção com animação suave de slide down
 * @param {HTMLElement} section - Elemento da seção a ser mostrada
 * @param {Function} callback - Callback opcional executado após a animação
 */
function showSectionWithAnimation(section, callback = null) {
  if (!section) return;

  // Remove classes de animação anteriores
  section.classList.remove('section-hidden', 'hiding');

  // Configura estado inicial para animação
  section.style.display = 'block';
  section.classList.add('product-list-section', 'showing');

  // Força reflow para garantir que as classes sejam aplicadas
  section.offsetHeight;

  // Adiciona classe de visibilidade
  section.classList.add('section-visible');

  // Remove classe de animação após completar
  setTimeout(() => {
    section.classList.remove('showing');
    if (callback) callback();
  }, 300); // Duração da animação (--animation-duration-state)
}

/**
 * Oculta uma seção com animação suave de slide up
 * @param {HTMLElement} section - Elemento da seção a ser ocultada
 * @param {Function} callback - Callback opcional executado após a animação
 */
function hideSectionWithAnimation(section, callback = null) {
  if (!section) return;

  // Remove classes de animação anteriores
  section.classList.remove('section-visible', 'showing');

  // Adiciona classes de animação de saída
  section.classList.add('product-list-section', 'hiding', 'section-hidden');

  // Oculta completamente após a animação
  setTimeout(() => {
    section.style.display = 'none';
    section.classList.remove('hiding');
    if (callback) callback();
  }, 300); // Duração da animação (--animation-duration-state)
}

/**
 * Alterna visibilidade de uma seção com animação
 * @param {HTMLElement} section - Elemento da seção
 * @param {boolean} show - true para mostrar, false para ocultar
 * @param {Function} callback - Callback opcional
 */
function toggleSectionWithAnimation(section, show, callback = null) {
  if (show) {
    showSectionWithAnimation(section, callback);
  } else {
    hideSectionWithAnimation(section, callback);
  }
}

/**
 * Verifica se uma seção está visível
 * @param {HTMLElement} section - Elemento da seção
 * @returns {boolean} true se a seção está visível
 */
function isSectionVisible(section) {
  if (!section) return false;
  return section.style.display !== 'none' && !section.classList.contains('section-hidden');
}

// Exportar funções globais para uso em outros scripts
if (typeof window !== 'undefined') {
  window.handleCDSelection = handleCDSelection;
  window.handleProductSearch = handleProductSearch;
  window.removeProductFromList = removeProductFromList;
  window.clearProductList = clearProductList;
  window.generateIndividualSheets = generateIndividualSheets;
  window.generateOptimizedDocument = generateOptimizedDocument;
  window.updateSearchInfo = updateSearchInfo;

  // Exportar funções de animação de seção
  window.showSectionWithAnimation = showSectionWithAnimation;
  window.hideSectionWithAnimation = hideSectionWithAnimation;
  window.toggleSectionWithAnimation = toggleSectionWithAnimation;
  window.isSectionVisible = isSectionVisible;
}

// Inicialização da aplicação
document.addEventListener('DOMContentLoaded', async () => {
  console.log('📋 Inicializando aplicação de inventário...');

  // Animação já foi iniciada imediatamente no carregamento do script (linha ~392)
  // Não é necessário mostrar novamente aqui

  // Configurar interface
  setupInterface();

  // Atualizar progresso da startup
  if (systemStartup) {
    systemStartup.updateMessage('Interface configurada...');
  }

  // Inicializar integração de animações
  if (animationIntegration) {
    try {
      await animationIntegration.initialize();
      console.log('✅ Integração de animações inicializada');

      // Atualizar progresso da startup
      if (systemStartup) {
        systemStartup.updateMessage('Animações integradas...');
      }
    } catch (error) {
      console.error('❌ Erro na inicialização da integração de animações:', error);
    }
  }

  // Carregar bases de dados assincronamente
  try {
    // Atualizar progresso da startup
    if (systemStartup) {
      systemStartup.updateMessage('Carregando bases de dados...');
    }

    await loadDatabasesAsync();

    console.log('✅ Aplicação de inventário inicializada com sucesso');

    // Finalizar animação de startup quando bases estiverem carregadas
    if (systemStartup) {
      systemStartup.finishWhenReady();
    }

  } catch (error) {
    console.error('❌ Erro na inicialização:', error);
    setStatus('Erro na inicialização da aplicação', 'error');

    // Ocultar startup em caso de erro
    if (systemStartup) {
      systemStartup.hide();
    }
  }
});

// Event listener para quando a animação de startup terminar
document.addEventListener('systemStartupComplete', () => {
  console.log('🎉 Sistema totalmente inicializado e pronto para uso');

  // Remover classe de loading e mostrar conteúdo
  document.body.classList.remove('startup-loading');
  document.body.classList.add('startup-complete');

  // Aplicar animações iniciais aos elementos já carregados
  if (animationManager) {
    // Aguardar um pouco para o conteúdo aparecer
    setTimeout(() => {
      // Animar painéis que já estão na tela
      const panels = document.querySelectorAll('.panel');
      panels.forEach((panel, index) => {
        setTimeout(() => {
          animationManager.applyEntryAnimation(panel, 'fadeSlideUp', {
            duration: 400
          });
        }, index * 100);
      });
    }, 200);
  }

  // Focar no primeiro campo disponível
  const firstInput = document.querySelector('input:not(:disabled)');
  if (firstInput) {
    setTimeout(() => {
      firstInput.focus();
    }, 800);
  }
});