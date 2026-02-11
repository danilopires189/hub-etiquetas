/* ===== Sistema com autenticação ===== */

/* ===== Utilitários de localStorage Seguro ===== */
/**
 * Salvar no localStorage com tratamento de erro de quota
 * Retorna true se salvou com sucesso, false caso contrário
 */
/**
 * Verificar espaço usado no localStorage
 */
function verificarEspacoLocalStorage() {
  let total = 0;
  for (let chave in localStorage) {
    if (localStorage.hasOwnProperty(chave)) {
      total += localStorage[chave].length * 2; // UTF-16 = 2 bytes por char
    }
  }
  return {
    bytes: total,
    kb: (total / 1024).toFixed(2),
    mb: (total / 1024 / 1024).toFixed(2)
  };
}

/**
 * Limpar dados antigos do localStorage para liberar espaço
 */
function limparDadosAntigosLocalStorage() {
  console.log('🧹 Limpando dados antigos do localStorage...');
  const espacoAntes = verificarEspacoLocalStorage();
  console.log(`📊 Espaço antes: ${espacoAntes.mb} MB`);
  
  // Lista de chaves que podem ser removidas (não essenciais)
  const chavesParaLimpar = [
    'historico_enderecos',
    'historico_operacoes',
    'enderecos_cadastrados_backup',
    'cache_enderecos_antigo',
    'dados_enderecamento_old'
  ];
  
  chavesParaLimpar.forEach(chave => {
    if (localStorage.getItem(chave)) {
      localStorage.removeItem(chave);
      console.log(`🗑️ Removido: ${chave}`);
    }
  });
  
  // Limpar históricos mantendo apenas os 10 mais recentes
  ['historico_enderecos', 'historico_operacoes'].forEach(chave => {
    try {
      const dados = JSON.parse(localStorage.getItem(chave) || '[]');
      if (Array.isArray(dados) && dados.length > 10) {
        const dadosRecentes = dados.slice(-10);
        localStorage.setItem(chave, JSON.stringify(dadosRecentes));
        console.log(`📉 ${chave} reduzido de ${dados.length} para ${dadosRecentes.length} itens`);
      }
    } catch (e) {
      // Ignora erro
    }
  });
  
  const espacoDepois = verificarEspacoLocalStorage();
  console.log(`📊 Espaço depois: ${espacoDepois.mb} MB`);
  console.log(`✅ Liberado: ${(espacoAntes.mb - espacoDepois.mb).toFixed(2)} MB`);
}

function salvarLocalStorageSeguro(chave, valor) {
  try {
    localStorage.setItem(chave, valor);
    return true;
  } catch (e) {
    if (e.name === 'QuotaExceededError' || 
        e.message.includes('exceeded the quota') ||
        e.message.includes('exceeded the storage')) {
      console.warn(`⚠️ Quota excedida ao salvar '${chave}'.`);
      
      // Tentar limpar dados antigos
      limparDadosAntigosLocalStorage();
      
      // Tentar novamente
      try {
        localStorage.setItem(chave, valor);
        console.log(`✅ '${chave}' salvo após limpar espaço.`);
        return true;
      } catch (e2) {
        console.error(`❌ Falha ao salvar '${chave}':`, e2);
        // Mostrar aviso ao usuário mas não bloquear a operação
        if (typeof showToast === 'function') {
          showToast('Aviso: Dados locais não foram salvos devido a limitação de espaço, mas a operação foi realizada.', 'warning');
        }
        return false;
      }
    }
    throw e;
  }
}

/* ===== Mobile Scanner Prevention ===== */
// Prevent scanner functionality on mobile devices
(function () {
  const isMobile = window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  if (isMobile) {
    console.log('🚫 Scanner functionality disabled on mobile devices');

    // Override global scanner functions to prevent execution
    window.mobileScanner = {
      isMobileDevice: () => true,
      isSupported: () => false,
      openScanner: () => console.log('Scanner disabled on mobile'),
      closeScanner: () => { },
      destroy: () => { },
      init: () => { },
      start: () => { },
      stop: () => { }
    };

    // Prevent adding scanner buttons
    window.addScannerButtons = function () {
      console.log('Scanner buttons disabled on mobile');
      return;
    };

    window.addScannerButton = function () {
      console.log('Scanner button disabled on mobile');
      return;
    };

    // Override any scanner initialization functions
    window.initScanner = function () {
      console.log('Scanner initialization disabled on mobile');
      return;
    };

    window.startScanner = function () {
      console.log('Scanner start disabled on mobile');
      return;
    };

    // Remove scanner CSS link if it exists
    document.addEventListener('DOMContentLoaded', function () {
      const scannerCssLinks = document.querySelectorAll('link[href*="scanner.css"]');
      scannerCssLinks.forEach(link => {
        link.remove();
        console.log('🚫 Removed scanner.css from mobile');
      });

      // Remove any scanner-related elements that might have been added
      // NOTA: Não remover .scanner-icon pois é apenas um ícone visual de código de barras
      const scannerElements = document.querySelectorAll('[class*="scanner"]:not(.scanner-icon), [id*="scanner"], .scanner-btn, .input-with-scanner .scanner-btn');
      scannerElements.forEach(element => {
        element.remove();
        console.log('🚫 Removed scanner element from mobile');
      });

      // Ensure input fields work properly without scanner
      const inputsWithScanner = document.querySelectorAll('.input-with-scanner input');
      inputsWithScanner.forEach(input => {
        input.style.paddingRight = '12px';
        const parent = input.parentElement;
        if (parent && parent.classList.contains('input-with-scanner')) {
          parent.classList.remove('input-with-scanner');
        }
      });
    });
  }
})();

/* ===== Mobile Navigation Toggle ("Mostrar mais") ===== */
function toggleMobileNav() {
  const navContainer = document.querySelector('.nav-container');
  const toggleBtnText = document.getElementById('mobileNavToggleText');
  const toggleIcon = document.querySelector('.mobile-nav-toggle .toggle-icon');

  if (!navContainer) {
    console.warn('📱 Nav container not found');
    return;
  }

  const isExpanded = navContainer.classList.contains('expanded');

  if (isExpanded) {
    // Collapse
    navContainer.classList.remove('expanded');
    if (toggleBtnText) toggleBtnText.textContent = 'Mostrar mais';
  } else {
    // Expand
    navContainer.classList.add('expanded');
    if (toggleBtnText) toggleBtnText.textContent = 'Mostrar menos';
  }
}

// Close mobile nav when clicking outside
document.addEventListener('click', function (event) {
  const navContainer = document.querySelector('.nav-container');
  const navToggle = document.getElementById('mobileNavToggle');

  if (!navContainer || !navContainer.classList.contains('expanded')) return;

  // Check if click is outside the nav container and not on the toggle button
  if (!navContainer.contains(event.target) && (!navToggle || !navToggle.contains(event.target))) {
    navContainer.classList.remove('expanded');
    const toggleBtnText = document.getElementById('mobileNavToggleText');
    if (toggleBtnText) toggleBtnText.textContent = 'Mostrar mais';
  }
});

/* ===== Verificação de Autenticação ===== */
function verificarAutenticacao() {
  try {
    const sessionData = localStorage.getItem('enderecamento_fraldas_session');

    // Check if session exists
    if (!sessionData) {
      console.warn('🔒 Sessão não encontrada no localStorage');
      redirecionarParaLogin('Sessão não encontrada');
      return false;
    }

    let session;
    try {
      session = JSON.parse(sessionData);
    } catch (e) {
      console.error('❌ Erro ao decodificar JSON da sessão:', e);
      localStorage.removeItem('enderecamento_fraldas_session');
      redirecionarParaLogin('Erro nos dados da sessão');
      return false;
    }

    // Check expiration
    const now = new Date();
    const expiresAt = new Date(session.expiresAt);

    // Safety check: if expiresAt is invalid date, assume valid and renew to avoid loop
    if (isNaN(expiresAt.getTime())) {
      console.warn('⚠️ Data de expiração inválida. Renovando sessão...');
      session.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      salvarLocalStorageSeguro('enderecamento_fraldas_session', JSON.stringify(session));
    } else if (now >= expiresAt) {
      console.warn('🔒 Sessão expirada:', { now, expiresAt });
      localStorage.removeItem('enderecamento_fraldas_session');
      redirecionarParaLogin('Sessão expirada');
      return false;
    }

    // Update user info
    atualizarInfoUsuario(session);

    // Initialize mobile interface
    initializeMobileInterface();

    return true;
  } catch (error) {
    console.error('❌ Erro crítico ao verificar autenticação:', error);
    // Don't auto-logout on unexpected errors to prevent loops
    // Just try to proceed
    return true;
  }
}

function redirecionarParaLogin(motivo) {
  console.log('🔒 Redirecionando para login:', motivo);
  showToast(`${motivo}. Redirecionando para a tela de autenticação.`, 'warning');
  setTimeout(() => {
    window.location.href = './login.html';
  }, 1500);
}

function atualizarInfoUsuario(session) {
  const nomeCompleto = String(session.usuario || 'Sistema').trim();
  const nomeCD = session.nomeCD || `CD ${session.cd || 2}`;

  // Desktop no index: ícone final no menu com dropdown de usuário/cd/sair
  const navContent = document.getElementById('mobileNavContent');
  if (navContent && !isMobileDevice()) {
    const btnExistente = document.getElementById('btnContaMenu');
    const menuExistente = document.getElementById('userNavMenu');
    if (btnExistente) btnExistente.remove();
    if (menuExistente) menuExistente.remove();

    const btnConta = document.createElement('button');
    btnConta.id = 'btnContaMenu';
    btnConta.className = 'btn btn-ghost';
    btnConta.type = 'button';
    btnConta.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
        <circle cx="12" cy="7" r="4"></circle>
      </svg>
      Conta
    `;

    const menuConta = document.createElement('div');
    menuConta.id = 'userNavMenu';
    menuConta.className = 'user-nav-menu hide';
    menuConta.innerHTML = `
      <div class="user-nav-row"><strong>${nomeCompleto}</strong></div>
      <div class="user-nav-row">${nomeCD}</div>
      <button type="button" class="btn btn-ghost btn-sm user-nav-logout" id="btnContaLogout">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
          <polyline points="16,17 21,12 16,7"></polyline>
          <line x1="21" y1="12" x2="9" y2="12"></line>
        </svg>
        Sair
      </button>
    `;

    navContent.appendChild(btnConta); // último ícone
    const navContainer = navContent.closest('.nav-container');
    if (navContainer) navContainer.appendChild(menuConta);

    btnConta.addEventListener('click', (e) => {
      e.stopPropagation();
      menuConta.classList.toggle('hide');
    });

    const btnLogout = menuConta.querySelector('#btnContaLogout');
    if (btnLogout) {
      btnLogout.addEventListener('click', () => logout());
    }

    document.addEventListener('click', (e) => {
      if (!menuConta.classList.contains('hide') && !menuConta.contains(e.target) && e.target !== btnConta) {
        menuConta.classList.add('hide');
      }
    });
    return;
  }

  // Mobile no index: mantém card de usuário expansível existente
  document.querySelectorAll('.user-info').forEach(el => el.remove());
  const userInfo = document.createElement('div');
  userInfo.className = 'user-info mobile-user-menu';
  userInfo.innerHTML = `
      <div class="user-details">
          <span class="user-name">${nomeCompleto}</span>
          <span class="user-cd">${nomeCD}</span>
      </div>
      <button class="btn btn-ghost btn-sm" onclick="logout()" title="Sair">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16,17 21,12 16,7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
      </button>
  `;

  const headerTop = document.querySelector('.header-top-row');
  if (headerTop) {
    headerTop.appendChild(userInfo);
  } else {
    console.warn('Container para user-info não encontrado');
  }
}

/* ===== Toast Notification System ===== */
function showToast(message, type = 'info') {
  // Garantir que o container existe
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  // Criar o elemento toast
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  // Ícone baseado no tipo
  let icon = 'ℹ️';
  if (type === 'success') icon = '✅';
  if (type === 'error') icon = '❌';
  if (type === 'warning') icon = '⚠️';

  toast.innerHTML = `
        <span class="toast-icon">${icon}</span>
        <span class="toast-message">${message.replace(/\n/g, '<br>')}</span>
    `;

  // Adicionar ao container
  container.appendChild(toast);

  // Trigger animation
  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  // Remover após 3 segundos
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      toast.remove();
      if (container.children.length === 0) {
        container.remove();
      }
    }, 300);
  }, 4000);
}

/* ===== Custom Confirmation Modal ===== */
function customConfirm(message, title = 'Confirmação') {
  return new Promise((resolve) => {
    const modal = $('#modalConfirmacao');
    const titleEl = $('#modalConfirmTitle');
    const messageEl = $('#modalConfirmMessage');
    const btnOk = $('#btnModalConfirmOk');
    const btnCancel = $('#btnModalConfirmCancel');
    const btnClose = $('#btnModalConfirmClose');

    // Configurar textos
    titleEl.textContent = title;
    messageEl.innerHTML = message.replace(/\n/g, '<br>');

    // Mostrar modal
    modal.classList.add('active');

    // Funções de fechamento
    const fechar = (resultado) => {
      modal.classList.remove('active');
      // Remover os listeners para evitar execuções duplicadas no futuro
      btnOk.onclick = null;
      btnCancel.onclick = null;
      btnClose.onclick = null;
      modal.onclick = null;
      resolve(resultado);
    };

    // Eventos
    btnOk.onclick = () => fechar(true);
    btnCancel.onclick = () => fechar(false);
    btnClose.onclick = () => fechar(false);

    // Fechar ao clicar fora
    modal.onclick = (e) => {
      if (e.target === modal) fechar(false);
    };
  });
}

function logout() {
  customConfirm('Confirma o encerramento da sessão?', 'Sair').then(confirmado => {
    if (confirmado) {
      localStorage.removeItem('enderecamento_fraldas_session');
      window.location.href = './login.html';
    }
  });
}

/* ===== Mobile Toggle Functions ===== */

// Toggle user info visibility on mobile
function toggleUserInfo() {
  if (!isMobileDevice()) {
    console.log('📱 Não é dispositivo móvel - ignorando toggle de usuário');
    return;
  }

  const userInfo = document.querySelector('.user-info');
  const toggleBtn = $('#userToggle');

  if (!userInfo || !toggleBtn) {
    console.warn('📱 Elementos de usuário não encontrados');
    return;
  }

  console.log('📱 Alternando visibilidade das informações do usuário');

  const isExpanded = mobileState.getState('userInfoExpanded');

  if (isExpanded) {
    // Hide user info
    userInfo.classList.remove('expanded');
    toggleBtn.classList.remove('active');
    mobileState.updateState('userInfoExpanded', false);
    console.log('📱 Informações do usuário ocultadas');
  } else {
    // Show user info
    userInfo.classList.add('expanded');
    toggleBtn.classList.add('active');
    mobileState.updateState('userInfoExpanded', true);
    console.log('📱 Informações do usuário exibidas');
  }
}

// Initialize mobile interface
function initializeMobileInterface() {
  if (!isMobileDevice()) {
    console.log('📱 Não é dispositivo móvel - pulando inicialização mobile');
    // MAS ainda assim configurar o scanner para desktop
    enhanceMobileProductSearch();
    return;
  }

  console.log('📱 Inicializando interface mobile');

  // Reset mobile state
  mobileState.resetState();

  // Show mobile toggle buttons
  const userToggle = $('#userToggle');

  if (userToggle) {
    userToggle.style.display = 'flex';
    console.log('📱 Botão de toggle do usuário exibido');
  }

  // Hide user info by default on mobile
  const userInfo = document.querySelector('.user-info');
  if (userInfo) {
    userInfo.classList.remove('expanded');
    mobileState.updateState('userInfoExpanded', false);
    console.log('📱 Informações do usuário ocultadas por padrão');
  }

  // Initialize device info
  const deviceInfo = getMobileDeviceInfo();
  console.log('📱 Device info:', deviceInfo);

  // Enhance mobile product search (também funciona em desktop)
  enhanceMobileProductSearch();

  console.log('📱 Interface mobile inicializada com sucesso');
}

/* ===== Mobile Utilities ===== */

// Mobile detection utility
function isMobileDevice() {
  return window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Enhanced mobile detection with device capabilities
function getMobileDeviceInfo() {
  const userAgent = navigator.userAgent;
  const isMobile = isMobileDevice();

  return {
    isMobile,
    isTablet: /iPad|Android(?!.*Mobile)/i.test(userAgent),
    isPhone: /iPhone|Android.*Mobile/i.test(userAgent),
    hasTouch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
    screenWidth: window.innerWidth,
    screenHeight: window.innerHeight,
    orientation: window.innerWidth > window.innerHeight ? 'landscape' : 'portrait',
    pixelRatio: window.devicePixelRatio || 1
  };
}

// Mobile state management
const mobileState = {
  userInfoExpanded: false,
  currentProduct: null,
  availableActions: [],
  activeModal: null,
  touchStartX: 0,
  touchStartY: 0,
  touchEndX: 0,
  touchEndY: 0,
  isScrolling: false,
  lastTouchTime: 0,

  // Update state
  updateState(key, value) {
    this[key] = value;
    console.log(`📱 Mobile state updated: ${key} = ${value}`);
  },

  // Get current state
  getState(key) {
    return this[key];
  },

  // Reset state
  resetState() {
    this.userInfoExpanded = false;
    this.currentProduct = null;
    this.availableActions = [];
    this.activeModal = null;
    this.isScrolling = false;
    console.log('📱 Mobile state reset');
  }
};

// Touch-friendly event handlers (Neutralizado para restaurar clique nativo)
const mobileEventHandlers = {
  // Initialize
  init() {
    if (!isMobileDevice()) return;
    console.log('📱 Mobile touch handlers neutralized to restore native click behavior');

    // Apenas ajustar resize/orientação que são úteis
    window.addEventListener('resize', this.handleResize.bind(this));

    // Adicionar classes visuais apenas, sem bloquear eventos
    this.setupVisualFeedback();
  },

  setupVisualFeedback() {
    // Adicionar feedback visual simples sem preventDefault
    document.addEventListener('touchstart', (e) => {
      const btn = e.target.closest('.btn, button, .mobile-btn');
      if (btn) btn.classList.add('touch-active');
    }, { passive: true });

    document.addEventListener('touchend', (e) => {
      const btn = e.target.closest('.btn, button, .mobile-btn');
      if (btn) btn.classList.remove('touch-active');
    }, { passive: true });
  },

  // Handle resize - Manter pois é útil para modals
  handleResize() {
    if (!isMobileDevice()) return;
    // Update device info
    const deviceInfo = getMobileDeviceInfo();
    mobileState.updateState('screenWidth', deviceInfo.screenWidth);
    mobileState.updateState('screenHeight', deviceInfo.screenHeight);

    // Adjust modals if any are open
    if (mobileState.activeModal) {
      if (this.adjustModalForScreenSize) {
        this.adjustModalForScreenSize(mobileState.activeModal);
      }
    }
  },

  // Adjust modal for screen size - Manter
  adjustModalForScreenSize(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    const deviceInfo = getMobileDeviceInfo();
    if (deviceInfo.screenHeight < 600) {
      modal.classList.add('small-screen');
    } else {
      modal.classList.remove('small-screen');
    }
  },

  // Adjust UI for orientation - Restaurado para evitar erro na inicialização
  adjustUIForOrientation(orientation) {
    const body = document.body;
    if (orientation === 'landscape') {
      body.classList.add('mobile-landscape');
      body.classList.remove('mobile-portrait');
    } else {
      body.classList.add('mobile-portrait');
      body.classList.remove('mobile-landscape');
    }
  },

  // Placeholders para manter compatibilidade caso algo chame
  closeMobileModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('hide');
  }
};

// Mobile-optimized modal management system
const mobileModalManager = {
  // Stack to track open modals
  modalStack: [],

  // Open modal
  openModal(modalId, options = {}) {
    if (!isMobileDevice()) {
      console.log('📱 Not mobile device - using desktop modal');
      return false;
    }

    console.log('📱 Opening mobile modal:', modalId);

    const modal = document.getElementById(modalId);
    if (!modal) {
      console.warn('📱 Modal not found:', modalId);
      return false;
    }

    // Close previous modal if specified
    if (options.closePrevious && this.modalStack.length > 0) {
      const previousModal = this.modalStack[this.modalStack.length - 1];
      this.closeModal(previousModal.id, false);
    }

    // Add to stack
    this.modalStack.push({
      id: modalId,
      options,
      timestamp: Date.now()
    });

    // Update state
    mobileState.updateState('activeModal', modalId);

    // Show modal
    modal.classList.remove('hide');
    modal.classList.add('mobile-modal-active');

    // Add backdrop if specified
    if (options.backdrop !== false) {
      this.addBackdrop(modalId);
    }

    // Focus management
    if (options.autoFocus !== false) {
      this.focusFirstInput(modal);
    }

    // Adjust for screen size
    mobileEventHandlers.adjustModalForScreenSize(modalId);

    // Prevent body scroll
    document.body.classList.add('modal-open');

    console.log('📱 Mobile modal opened successfully:', modalId);
    return true;
  },

  // Close modal
  closeModal(modalId, updateStack = true) {
    console.log('📱 Closing mobile modal:', modalId);

    const modal = document.getElementById(modalId);
    if (!modal) {
      console.warn('📱 Modal not found for closing:', modalId);
      return false;
    }

    // Hide modal
    modal.classList.add('hide');
    modal.classList.remove('mobile-modal-active');

    // Remove backdrop
    this.removeBackdrop(modalId);

    // Update stack
    if (updateStack) {
      this.modalStack = this.modalStack.filter(m => m.id !== modalId);
    }

    // Update state
    const activeModal = this.modalStack.length > 0 ? this.modalStack[this.modalStack.length - 1].id : null;
    mobileState.updateState('activeModal', activeModal);

    // Re-enable body scroll if no modals are open
    if (this.modalStack.length === 0) {
      document.body.classList.remove('modal-open');
    }

    console.log('📱 Mobile modal closed successfully:', modalId);
    return true;
  },

  // Close all modals
  closeAllModals() {
    console.log('📱 Closing all mobile modals');

    while (this.modalStack.length > 0) {
      const modal = this.modalStack.pop();
      this.closeModal(modal.id, false);
    }

    mobileState.updateState('activeModal', null);
    document.body.classList.remove('modal-open');
  },

  // Add backdrop
  addBackdrop(modalId) {
    let backdrop = document.getElementById(`${modalId}-backdrop`);

    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.id = `${modalId}-backdrop`;
      backdrop.className = 'mobile-modal-backdrop';
      backdrop.onclick = () => this.closeModal(modalId);
      document.body.appendChild(backdrop);
    }

    backdrop.classList.add('show');
  },

  // Remove backdrop
  removeBackdrop(modalId) {
    const backdrop = document.getElementById(`${modalId}-backdrop`);
    if (backdrop) {
      backdrop.classList.remove('show');
      setTimeout(() => {
        backdrop.remove();
      }, 300);
    }
  },

  // Focus first input in modal
  focusFirstInput(modal) {
    const firstInput = modal.querySelector('input, select, textarea, button');
    if (firstInput && !firstInput.disabled) {
      setTimeout(() => {
        firstInput.focus();
      }, 300);
    }
  },

  // Check if modal is open
  isModalOpen(modalId) {
    return this.modalStack.some(m => m.id === modalId);
  },

  // Get current modal
  getCurrentModal() {
    return this.modalStack.length > 0 ? this.modalStack[this.modalStack.length - 1] : null;
  }
};

// Initialize mobile utilities when DOM is ready
document.addEventListener('DOMContentLoaded', function () {
  if (isMobileDevice()) {
    console.log('📱 Initializing mobile utilities');

    // Initialize touch event handlers
    mobileEventHandlers.init();

    // Set initial orientation class
    const deviceInfo = getMobileDeviceInfo();
    // Orientação inicial ajustada via CSS ou evento de resize futuro

    // Initialize virtual keyboard detection
    initVirtualKeyboardDetection();

    console.log('📱 Mobile utilities initialized successfully');
    console.log('📱 Device info:', deviceInfo);
  }
});

// Virtual keyboard detection for mobile devices
function initVirtualKeyboardDetection() {
  if (!isMobileDevice()) return;

  console.log('📱 Initializing virtual keyboard detection');

  const codigoProdutoInput = document.getElementById('codigoProduto');
  if (!codigoProdutoInput) {
    console.warn('📱 Input codigoProduto not found');
    return;
  }

  // Store original viewport height
  let originalViewportHeight = window.visualViewport?.height || window.innerHeight;
  let isKeyboardOpen = false;

  // Handle input focus - scroll into view and open keyboard
  codigoProdutoInput.addEventListener('focus', function (e) {
    console.log('📱 Product input focused');

    // Add keyboard-open class after a delay (wait for keyboard animation)
    setTimeout(() => {
      document.body.classList.add('keyboard-open');
      isKeyboardOpen = true;

      // Scroll input into view smoothly
      scrollInputIntoView(codigoProdutoInput);
    }, 100);
  });

  // Handle input blur - close keyboard
  codigoProdutoInput.addEventListener('blur', function (e) {
    console.log('📱 Product input blurred');

    // Remove keyboard-open class after a delay
    setTimeout(() => {
      document.body.classList.remove('keyboard-open');
      isKeyboardOpen = false;
    }, 100);
  });

  // Use Visual Viewport API if available (better keyboard detection)
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', function () {
      const currentHeight = window.visualViewport.height;
      const heightDiff = originalViewportHeight - currentHeight;

      // If height decreased significantly, keyboard is open
      if (heightDiff > 150) {
        if (!isKeyboardOpen) {
          console.log('📱 Virtual keyboard detected as OPEN');
          document.body.classList.add('keyboard-open');
          isKeyboardOpen = true;
        }

        // Keep input visible above keyboard
        if (document.activeElement === codigoProdutoInput) {
          scrollInputIntoView(codigoProdutoInput);
        }
      } else {
        if (isKeyboardOpen) {
          console.log('📱 Virtual keyboard detected as CLOSED');
          document.body.classList.remove('keyboard-open');
          isKeyboardOpen = false;
        }
      }
    });
  }

  // Fallback for older browsers - use window resize
  window.addEventListener('resize', function () {
    if (!window.visualViewport) {
      const currentHeight = window.innerHeight;
      const heightDiff = originalViewportHeight - currentHeight;

      if (heightDiff > 150 && !isKeyboardOpen) {
        document.body.classList.add('keyboard-open');
        isKeyboardOpen = true;
      } else if (heightDiff < 100 && isKeyboardOpen) {
        document.body.classList.remove('keyboard-open');
        isKeyboardOpen = false;
      }
    }
  });

  // Ensure input receives touch events correctly
  codigoProdutoInput.addEventListener('touchstart', function (e) {
    // Focus the input on touch to trigger keyboard
    if (document.activeElement !== codigoProdutoInput) {
      e.preventDefault();
      codigoProdutoInput.focus();
    }
  }, { passive: false });

  // Handle orientation change
  window.addEventListener('orientationchange', function () {
    setTimeout(() => {
      originalViewportHeight = window.visualViewport?.height || window.innerHeight;
    }, 300);
  });

  console.log('📱 Virtual keyboard detection initialized');
}

// Scroll input into view with offset for mobile
function scrollInputIntoView(inputElement) {
  if (!inputElement) return;

  // Wait for keyboard animation to complete
  setTimeout(() => {
    const rect = inputElement.getBoundingClientRect();
    const viewportHeight = window.visualViewport?.height || window.innerHeight;

    // Calculate scroll offset
    const inputTop = rect.top;
    const inputBottom = rect.bottom;
    const targetPosition = viewportHeight * 0.3; // Put input at 30% from top

    if (inputTop > targetPosition || inputBottom > viewportHeight * 0.6) {
      // Scroll smoothly to position the input
      inputElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }, 150);
}

// Show/hide mobile action buttons based on product status
function updateMobileActionButtons(produto, statusForcado = null) {
  if (!isMobileDevice()) {
    console.log('📱 Não é dispositivo móvel - pulando atualização dos botões mobile');
    return;
  }

  const mobileActions = $('#mobileActions');
  const btnAlocarMobile = $('#btnAlocarMobile');
  const btnDesalocarMobile = $('#btnDesalocarMobile');
  const btnAdicionarMaisMobile = $('#btnAdicionarMaisMobile');

  if (!mobileActions || !btnAlocarMobile || !btnDesalocarMobile) {
    console.warn('📱 Elementos dos botões mobile não encontrados no DOM');
    return;
  }

  if (!produto) {
    console.log('📱 Nenhum produto - ocultando botões mobile');
    mobileActions.classList.add('hide');
    mobileActions.classList.remove('show');
    mobileState.updateState('currentProduct', null);
    mobileState.updateState('availableActions', []);
    return;
  }

  console.log('📱 Atualizando botões mobile para produto:', produto.CODDV);
  // Usar status forçado (do banco) ou calcular do cache
  const status = statusForcado || obterStatusProduto(produto.CODDV);
  console.log('📱 Status do produto:', status, statusForcado ? '(do banco)' : '(do cache)');

  // Update mobile state
  mobileState.updateState('currentProduct', produto);

  // Show mobile actions container
  mobileActions.classList.remove('hide');
  mobileActions.classList.add('show');

  // Update button states based on product status
  if (status.alocado) {
    // Product is allocated - show both buttons + add button
    btnAlocarMobile.disabled = false;
    btnDesalocarMobile.disabled = false;

    // Show 'Add More' button
    if (btnAdicionarMaisMobile) {
      btnAdicionarMaisMobile.classList.remove('hide');
    }

    // Update available actions
    mobileState.updateState('availableActions', ['transfer', 'deallocate', 'add']);

    // Update button text for allocated product
    btnAlocarMobile.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M7 17L17 7" />
        <path d="M17 17H7V7" />
      </svg>
      Transferir
    `;

    console.log('📱 Produto alocado - botões configurados para transferir/desalocar');
  } else {
    // Product is available - enable allocate, disable deallocate
    btnAlocarMobile.disabled = false;
    btnDesalocarMobile.disabled = true;

    // Hide 'Add More' button
    if (btnAdicionarMaisMobile) {
      btnAdicionarMaisMobile.classList.add('hide');
    }

    // Update available actions
    mobileState.updateState('availableActions', ['allocate']);

    // Reset button text for available product
    btnAlocarMobile.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 5v14" />
        <path d="M5 12h14" />
      </svg>
      Alocar
    `;

    console.log('📱 Produto disponível - botão alocar habilitado, desalocar desabilitado');
  }

  // Update mobile product display
  updateMobileProductDisplay(produto, status);
}

// Função para buscar ID do produto na BASE_ID pelo CODDV
function buscarIdPorCoddv(coddv) {
  if (!window.DB_BASE_ID || !window.DB_BASE_ID.BASE_BASE_ID) {
    console.warn('⚠️ BASE_ID não carregada');
    return null;
  }
  
  // Obter CD da sessão atual
  const sessionData = JSON.parse(localStorage.getItem('enderecamento_fraldas_session') || '{}');
  const cdAtual = parseInt(sessionData.cd) || 2;
  
  // Buscar na base o ID correspondente ao CODDV e CD
  const registro = window.DB_BASE_ID.BASE_BASE_ID.find(
    item => item.CODDV === coddv && parseInt(item.CD) === cdAtual
  );
  
  if (registro) {
    console.log('✅ ID encontrado para CODDV', coddv, ':', registro.ID);
    return registro.ID;
  }
  
  console.log('⚠️ ID não encontrado para CODDV:', coddv);
  return null;
}

// Update mobile product display with optimized layout and typography
function updateMobileProductDisplay(produto, status) {
  if (!isMobileDevice()) {
    console.log('📱 Não é dispositivo móvel - pulando atualização do display mobile');
    return;
  }

  console.log('📱 Atualizando display mobile do produto:', produto.CODDV);

  const produtoCoddv = document.querySelector('.produto-coddv');
  const produtoDesc = document.querySelector('.produto-desc');
  const produtoBarras = document.querySelector('.produto-barras');
  const produtoStatus = document.querySelector('.produto-status');
  const produtoEndereco = document.querySelector('.produto-endereco');

  if (!produtoCoddv || !produtoDesc || !produtoBarras || !produtoStatus || !produtoEndereco) {
    console.warn('📱 Elementos do produto não encontrados no DOM');
    return;
  }

  // Buscar ID correspondente ao CODDV
  const idEtiqueta = buscarIdPorCoddv(produto.CODDV);
  
  // Update product code with mobile-optimized display (código + etiqueta + ID)
  const idHtml = idEtiqueta ? `<span class="etiqueta-id">${idEtiqueta}</span>` : '';
  produtoCoddv.innerHTML = `<span class="codigo-principal">${produto.CODDV}</span><span class="etiqueta-separador" title="ID da etiqueta">📋${idHtml}</span>`;
  produtoCoddv.setAttribute('aria-label', `Código do produto: ${produto.CODDV}`);

  // Update product description with mobile-friendly formatting
  const descricaoFormatada = formatarDescricaoMobile(produto.DESC);
  produtoDesc.innerHTML = descricaoFormatada;
  produtoDesc.setAttribute('aria-label', `Descrição: ${produto.DESC}`);

  // Update barcode with mobile formatting
  if (produto.BARRAS && produto.BARRAS !== 'N/A') {
    produtoBarras.textContent = `Código de Barras: ${produto.BARRAS}`;
    produtoBarras.style.display = 'block';
    produtoBarras.setAttribute('aria-label', `Código de barras: ${produto.BARRAS}`);
  } else {
    produtoBarras.style.display = 'none';
  }

  // Update status with mobile-optimized styling
  updateMobileProductStatus(produtoStatus, status);

  // Update address display with mobile-responsive layout
  updateMobileAddressDisplay(produtoEndereco, status);

  console.log('📱 Display mobile do produto atualizado com sucesso');
}

// Format product description for mobile readability
function formatarDescricaoMobile(descricao) {
  if (!descricao) return '';

  // Break long descriptions into readable chunks
  const maxLength = 60;
  if (descricao.length <= maxLength) {
    return descricao;
  }

  // Find natural break points (spaces, commas, etc.)
  const words = descricao.split(' ');
  let formattedDesc = '';
  let currentLine = '';

  words.forEach(word => {
    if ((currentLine + word).length > maxLength && currentLine.length > 0) {
      formattedDesc += currentLine.trim() + '<br>';
      currentLine = word + ' ';
    } else {
      currentLine += word + ' ';
    }
  });

  formattedDesc += currentLine.trim();
  return formattedDesc;
}

// Update mobile product status indicator
function updateMobileProductStatus(statusElement, status) {
  if (!statusElement) return;

  // Clear existing classes
  statusElement.className = 'produto-status';

  if (status.alocado) {
    statusElement.classList.add('status-alocado');
    if (status.multiplos) {
      statusElement.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: inline; margin-right: 4px;">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
          <polyline points="3.27,6.96 12,12.01 20.73,6.96"/>
          <line x1="12" y1="22.08" x2="12" y2="12"/>
        </svg>
        Alocado (${status.enderecos.length} endereços)
      `;
      statusElement.setAttribute('aria-label', `Produto alocado em ${status.enderecos.length} endereços`);
    } else {
      statusElement.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: inline; margin-right: 4px;">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
          <polyline points="3.27,6.96 12,12.01 20.73,6.96"/>
          <line x1="12" y1="22.08" x2="12" y2="12"/>
        </svg>
        Alocado
      `;
      statusElement.setAttribute('aria-label', 'Produto alocado');
    }
  } else {
    statusElement.classList.add('status-disponivel');
    statusElement.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: inline; margin-right: 4px;">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 6v6l4 2"/>
      </svg>
      Não Alocado
    `;
    statusElement.setAttribute('aria-label', 'Produto não alocado');
  }
}

// Update mobile address display with responsive layout
function updateMobileAddressDisplay(enderecoElement, status) {
  if (!enderecoElement) return;

  // Clear existing classes and content
  enderecoElement.className = 'produto-endereco';
  enderecoElement.innerHTML = '';

  if (status.alocado) {
    if (status.multiplos) {
      // Multiple addresses - show each with the same visual as single address
      enderecoElement.classList.add('multiplos');

      const headerHtml = `
        <div style="display: flex; align-items: center; justify-content: center; margin-bottom: 0.75rem; gap: 8px; color: #334155;">
          📦
          <strong>Múltiplos Endereços</strong>
          <span class="endereco-count">${status.enderecos.length}</span>
        </div>
      `;

      const addressListHtml = status.enderecos.map(endereco => {
        // Tentar obter informações de validade do produto neste endereço
        const validadeInfo = obterValidadeProdutoNoEndereco(produtoAtual?.CODDV, endereco);
        const validadeHtml = validadeInfo ? 
          `<div class="endereco-validade-mobile">📆 ${formatarValidadeMobile(validadeInfo)}</div>` : '';
        
        // Tentar obter data/hora da alocação
        const dataAlocacaoInfo = obterDataAlocacaoProdutoNoEndereco(produtoAtual?.CODDV, endereco);
        const dataAlocacaoHtml = dataAlocacaoInfo ? 
          `<div class="endereco-data-alocacao-mobile">${formatarDataAlocacaoMobile(dataAlocacaoInfo)}</div>` : '';
        
        // Visual igual à imagem - fundo branco, badge verde
        return `
          <div class="endereco-item-mobile" aria-label="Endereço: ${endereco}">
            <div style="display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 0.35rem;">
              📦
              <strong>${endereco}</strong>
            </div>
            ${validadeHtml}
            ${dataAlocacaoHtml}
          </div>
        `;
      }).join('');

      enderecoElement.innerHTML = headerHtml + `<div class="endereco-list-mobile">${addressListHtml}</div>`;
      enderecoElement.setAttribute('aria-label', `Produto alocado em ${status.enderecos.length} endereços: ${status.enderecos.join(', ')}`)

    } else {
      // Single address with validade info
      const validadeInfo = obterValidadeProdutoNoEndereco(produtoAtual?.CODDV, status.endereco);
      const validadeHtml = validadeInfo ? 
        `<div class="endereco-validade-mobile">📆 ${formatarValidadeMobile(validadeInfo)}</div>` : '';
      
      // Data/hora da alocação
      const dataAlocacaoInfo = obterDataAlocacaoProdutoNoEndereco(produtoAtual?.CODDV, status.endereco);
      const dataAlocacaoHtml = dataAlocacaoInfo ? 
        `<div class="endereco-data-alocacao-mobile">${formatarDataAlocacaoMobile(dataAlocacaoInfo)}</div>` : '';

      enderecoElement.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 0.35rem;">
          📦
          <strong>${status.endereco}</strong>
        </div>
        ${validadeHtml}
        ${dataAlocacaoHtml}
      `;
      enderecoElement.setAttribute('aria-label', `Produto alocado no endereço: ${status.endereco}`);
    }
  } else {
    // No address - available for allocation
    enderecoElement.classList.add('sem-endereco');
    enderecoElement.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; gap: 8px;">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <strong>Nenhum endereço associado</strong>
      </div>
      <div style="font-size: 0.85rem; margin-top: 0.5rem; opacity: 0.8;">
        Este produto está disponível para alocação
      </div>
    `;
    enderecoElement.setAttribute('aria-label', 'Produto sem endereço associado, disponível para alocação');
  }
}

// Obter validade de um produto em um endereço específico
function obterValidadeProdutoNoEndereco(coddv, endereco) {
  if (!coddv || !endereco || !window.sistemaEnderecamento) return null;
  
  try {
    const produtos = window.sistemaEnderecamento.obterProdutosNoEndereco(endereco);
    const produto = produtos.find(p => p.coddv === coddv);
    return produto ? produto.validade : null;
  } catch (error) {
    console.warn('Erro ao obter validade do produto:', error);
    return null;
  }
}

// Obter data/hora da alocação de um produto em um endereço específico
function obterDataAlocacaoProdutoNoEndereco(coddv, endereco) {
  if (!coddv || !endereco || !window.sistemaEnderecamento) return null;
  
  try {
    const produtos = window.sistemaEnderecamento.obterProdutosNoEndereco(endereco);
    const produto = produtos.find(p => p.coddv === coddv);
    if (!produto) return null;
    // Retorna data_alocacao, dataAlocacao ou created_at
    return produto.data_alocacao || produto.dataAlocacao || produto.created_at || null;
  } catch (error) {
    console.warn('Erro ao obter data de alocação do produto:', error);
    return null;
  }
}

// Formatar validade para exibição mobile
function formatarValidadeMobile(validade) {
  if (!validade || validade === '' || validade === null) {
    return 'Não informada';
  }
  
  // Se já está no formato MM/AAAA, converter para MM/AA
  if (validade.includes('/')) {
    const partes = validade.split('/');
    if (partes.length === 2) {
      const mes = partes[0];
      const ano = partes[1];
      // Pegar apenas os 2 últimos dígitos do ano
      const anoCurto = ano.length === 4 ? ano.substring(2) : ano;
      return `${mes}/${anoCurto}`;
    }
    return validade;
  }
  
  // Se está no formato MMAA, converter para MM/AA
  if (validade.length === 4 && /^\d{4}$/.test(validade)) {
    return `${validade.substring(0, 2)}/${validade.substring(2)}`;
  }
  
  // Retornar como está se não conseguir formatar
  return validade;
}

// Formatar data/hora da alocação para exibição mobile
function formatarDataAlocacaoMobile(dataAlocacao) {
  if (!dataAlocacao || dataAlocacao === '' || dataAlocacao === null) {
    return '';
  }
  
  try {
    // Se já está no formato string brasileiro (DD/MM/YYYY HH:MM:SS)
    if (typeof dataAlocacao === 'string' && dataAlocacao.includes('/')) {
      // Retorna apenas a parte da hora se for data completa
      const parts = dataAlocacao.split(' ');
      if (parts.length === 2) {
        return dataAlocacao; // Retorna data e hora completas
      }
      return dataAlocacao;
    }
    
    // Se é uma data ISO (YYYY-MM-DDTHH:MM:SS)
    if (typeof dataAlocacao === 'string' && dataAlocacao.includes('T')) {
      const date = new Date(dataAlocacao);
      if (!isNaN(date.getTime())) {
        const dia = String(date.getDate()).padStart(2, '0');
        const mes = String(date.getMonth() + 1).padStart(2, '0');
        const ano = date.getFullYear();
        const hora = String(date.getHours()).padStart(2, '0');
        const minuto = String(date.getMinutes()).padStart(2, '0');
        const segundo = String(date.getSeconds()).padStart(2, '0');
        return `${dia}/${mes}/${ano} ${hora}:${minuto}:${segundo}`;
      }
    }
    
    // Se é timestamp numérico ou string de data
    const date = new Date(dataAlocacao);
    if (!isNaN(date.getTime())) {
      const dia = String(date.getDate()).padStart(2, '0');
      const mes = String(date.getMonth() + 1).padStart(2, '0');
      const ano = date.getFullYear();
      const hora = String(date.getHours()).padStart(2, '0');
      const minuto = String(date.getMinutes()).padStart(2, '0');
      const segundo = String(date.getSeconds()).padStart(2, '0');
      return `${dia}/${mes}/${ano} ${hora}:${minuto}:${segundo}`;
    }
  } catch (error) {
    console.warn('Erro ao formatar data de alocação:', error);
  }
  
  // Retornar como está se não conseguir formatar
  return String(dataAlocacao);
}

// Mobile-specific product search enhancement with scanner detection
function enhanceMobileProductSearch() {
  console.log('📱 enhanceMobileProductSearch chamada');
  
  const codigoInput = $('#codigoProduto');
  if (!codigoInput) {
    console.log('❌ enhanceMobileProductSearch: codigoProduto não encontrado');
    return;
  }
  console.log('📱 Configurando detecção de scanner para codigoProduto');

  // Add mobile-specific input enhancements
  codigoInput.setAttribute('autocomplete', 'off');
  codigoInput.setAttribute('autocorrect', 'off');
  codigoInput.setAttribute('autocapitalize', 'off');
  codigoInput.setAttribute('spellcheck', 'false');

  // Detectar tipo de dispositivo/navegador
  const userAgent = navigator.userAgent.toLowerCase();
  const isZebra = /zebra|tc2x|tc5x|tc7x|ec30/i.test(userAgent);
  const isHoneywell = /honeywell|dolphin|eda5x|eda7x/i.test(userAgent);
  const isColetor = isZebra || isHoneywell;
  const isChromeMobile = /chrome.*mobile/i.test(userAgent) || /android.*chrome/i.test(userAgent);
  const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
  
  console.log('🔍 Device - Zebra:', isZebra, '| Honeywell:', isHoneywell, '| ChromeMobile:', isChromeMobile, '| Mobile:', isMobile);

  // Ajustar threshold baseado no dispositivo
  // Coletores industriais: < 30ms
  // Chrome Mobile: pode precisar de threshold maior (~80ms) pois é mais lento
  // Desktop: 50ms
  let SCANNER_THRESHOLD, SCANNER_TIMER;
  if (isColetor) {
    SCANNER_THRESHOLD = 30;
    SCANNER_TIMER = 100;
  } else if (isChromeMobile || isMobile) {
    // Mobile precisa de threshold mais tolerante
    SCANNER_THRESHOLD = 80; // Aumentado para mobile
    SCANNER_TIMER = 200;    // Timer um pouco maior
  } else {
    SCANNER_THRESHOLD = 50;
    SCANNER_TIMER = 150;
  }
  
  console.log('⚙️ Config - Threshold:', SCANNER_THRESHOLD, 'ms | Timer:', SCANNER_TIMER, 'ms');

  // Add mobile-friendly placeholder
  codigoInput.placeholder = isColetor ? 'Bipe o código' : 'Bipe ou digite o código';

  // Scanner detection variables
  let barcodeTimer = null;
  let lastInputTime = 0;
  let isManualEntry = false;
  let firstCharTime = 0;
  let charCount = 0;
  let inputBuffer = [];
  let previousValueLength = 0;

  // Evitar listeners duplicados caso a função rode mais de uma vez
  if (codigoInput._scannerInputHandler) {
    codigoInput.removeEventListener('input', codigoInput._scannerInputHandler);
  }
  if (codigoInput._scannerKeydownHandler) {
    codigoInput.removeEventListener('keydown', codigoInput._scannerKeydownHandler);
  }
  if (codigoInput._scannerFocusHandler) {
    codigoInput.removeEventListener('focus', codigoInput._scannerFocusHandler);
  }

  async function dispararBuscaAutomaticaProduto() {
    const codigoAtual = codigoInput.value.trim();
    if (!codigoAtual) return;
    console.log('⏰ EXECUTANDO BUSCA AUTOMÁTICA!');
    await buscarProdutoHandler();
  }

  // Função para processar scanner
  async function processarScanner() {
    await dispararBuscaAutomaticaProduto();
    barcodeTimer = null;
  }

  // Add input formatting with scanner detection
  codigoInput._scannerInputHandler = function (e) {
    // Ignorar eventos de composition (teclado virtual Android)
    if (e.isComposing) {
      console.log('📝 Ignorando evento de composition');
      return;
    }

    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (value !== e.target.value) {
      e.target.value = value;
    }

    const currentTime = Date.now();
    const timeSinceLastInput = currentTime - lastInputTime;
    const lengthDelta = value.length - previousValueLength;
    const bulkInsertDetected = lengthDelta > 2;
    
    // Guardar no buffer para análise
    inputBuffer.push({ char: value.slice(-1), time: currentTime });
    if (inputBuffer.length > 20) inputBuffer.shift();

    // SEMPRE atualizar lastInputTime
    lastInputTime = currentTime;

    // Clear any existing timer
    if (barcodeTimer) {
      clearTimeout(barcodeTimer);
      barcodeTimer = null;
    }

    // Only process if we have some content
    if (value.length > 0) {
      // If this is the first character
      if (value.length === 1) {
        firstCharTime = currentTime;
        charCount = 1;
        isManualEntry = false;
        inputBuffer = [{ char: value, time: currentTime }];
        codigoInput.placeholder = "Aguardando leitor...";
        previousValueLength = value.length;
        console.log('📱 Iniciando... (threshold:', SCANNER_THRESHOLD, 'ms)');
        return;
      }

      // Incrementar contador
      charCount++;

      // Calcular velocidade média dos últimos caracteres
      let velocidadeMedia = 0;
      if (inputBuffer.length >= 3) {
        const tempos = [];
        for (let i = 1; i < inputBuffer.length; i++) {
          tempos.push(inputBuffer[i].time - inputBuffer[i-1].time);
        }
        velocidadeMedia = tempos.reduce((a, b) => a + b, 0) / tempos.length;
      }

      // Detectar método de entrada
      // Usar tanto o último delay quanto a média móvel
      const isFastInput = bulkInsertDetected ||
                          timeSinceLastInput <= SCANNER_THRESHOLD || 
                          (velocidadeMedia > 0 && velocidadeMedia <= SCANNER_THRESHOLD + 20);

      if (!isFastInput) {
        // Entrada manual
        isManualEntry = true;
        codigoInput.placeholder = "Digite e pressione Enter";
        console.log('🖊️ MANUAL (delay:', timeSinceLastInput, 'ms, média:', velocidadeMedia.toFixed(1), 'ms)');
      } else {
        // Entrada rápida - scanner
        codigoInput.placeholder = "Aguardando leitor...";
        console.log('📱 SCANNER (delay:', timeSinceLastInput, 'ms, média:', velocidadeMedia.toFixed(1), 'ms)');

        // Mostrar velocidade média em coletores
        if (isColetor && charCount >= 3) {
          const tempoTotal = currentTime - firstCharTime;
          const vmedia = tempoTotal / charCount;
          console.log('📊 Velocidade:', vmedia.toFixed(2), 'ms/caractere');
        }

        // SEMPRE executar busca automaticamente para entrada rápida
        barcodeTimer = setTimeout(processarScanner, SCANNER_TIMER);
      }
    } else {
      // Reset
      isManualEntry = false;
      firstCharTime = 0;
      charCount = 0;
      inputBuffer = [];
      codigoInput.placeholder = isColetor ? 'Bipe o código' : 'Bipe ou digite o código';
    }
    previousValueLength = value.length;
  };
  codigoInput.addEventListener('input', codigoInput._scannerInputHandler);

  // Add Enter key handler
  codigoInput._scannerKeydownHandler = async function (e) {
    if (e.key === 'Enter' || e.keyCode === 13 || (e.key === 'Tab' && codigoInput.value.trim().length >= 5)) {
      e.preventDefault();
      console.log('⏎ Enter pressionado');

      if (barcodeTimer) {
        clearTimeout(barcodeTimer);
        barcodeTimer = null;
      }

      await dispararBuscaAutomaticaProduto();
    }
  };
  codigoInput.addEventListener('keydown', codigoInput._scannerKeydownHandler);

  // Fallback: detectar quando o input recebe foco (alguns scanners disparam assim)
  codigoInput._scannerFocusHandler = function () {
    console.log('🎯 Input recebeu foco');
    lastInputTime = Date.now();
    previousValueLength = codigoInput.value.length;
  };
  codigoInput.addEventListener('focus', codigoInput._scannerFocusHandler);

  console.log('📱 Scanner configurado! Threshold:', SCANNER_THRESHOLD, 'ms');
}

// Execute allocation action on mobile
async function executarAlocacaoMobile() {
  console.log('📱 Executando alocação mobile para produto:', produtoAtual?.CODDV);

  if (!produtoAtual) {
    showMobileToast('Nenhum produto selecionado.', 'warning');
    return;
  }

  // Verificar status em tempo real antes de executar
  let status;
  if (window.sistemaEnderecamento && window.sistemaEnderecamento.verificarStatusProdutoRealTime) {
    try {
      console.log('📱 Verificando status em tempo real antes de alocar/transferir...');
      status = await window.sistemaEnderecamento.verificarStatusProdutoRealTime(produtoAtual.CODDV);
      console.log('📱 Status real do banco:', status);
    } catch (error) {
      console.warn('📱 Erro ao verificar status em tempo real, usando cache:', error);
      status = obterStatusProduto(produtoAtual.CODDV);
    }
  } else {
    status = obterStatusProduto(produtoAtual.CODDV);
  }

  if (status.alocado) {
    // Product is allocated - show transfer options
    if (status.multiplos) {
      // Multiple addresses - show transfer popup
      console.log('📱 Produto com múltiplos endereços - abrindo popup de transferência');
      abrirPopupTransferencia(status.enderecos);
    } else {
      // Single address - direct transfer
      console.log('📱 Produto com endereço único - confirmando transferência');
      const transferir = await customConfirm(
        `Este produto está alocado no endereço: ${status.endereco}\n\nDeseja transferi-lo para outro endereço?`,
        'Transferir Produto'
      );
      if (transferir) {
        console.log('📱 Usuário confirmou transferência - abrindo modal de endereço mobile');
        openMobileAddressModal('transfer', status.endereco);
      }
    }
  } else {
    // Product is available - show allocation options
    console.log('📱 Produto disponível - abrindo modal de endereço mobile para alocação');
    openMobileAddressModal('allocate');
  }
}

/* ===== Mobile Address Modal Functions ===== */

let mobileModalState = {
  mode: null, // 'allocate' or 'transfer'
  sourceAddress: null,
  validatedAddress: null,
  validatedValidity: null,
  isValidating: false
};

// Open mobile address input modal
function openMobileAddressModal(mode, sourceAddress = null) {
  if (!isMobileDevice()) {
    console.log('📱 Não é dispositivo móvel - usando popup desktop');
    if (mode === 'allocate') {
      abrirPopupEnderecos();
    } else if (mode === 'add') {
      // Desktop add flow
      abrirPopupEnderecosParaAdicionar();
    } else {
      abrirPopupTransferencia();
    }
    return;
  }

  console.log('📱 Abrindo modal de endereço mobile - modo:', mode);

  mobileModalState.mode = mode;
  mobileModalState.sourceAddress = sourceAddress;
  mobileModalState.validatedAddress = null;

  const modal = $('#mobileAddressModal');
  const title = $('#mobileModalTitle');
  const productDesc = $('#mobileProductDesc');
  const productCoddv = $('#mobileProductCoddv');
  const addressInput = $('#mobileAddressInput');
  const confirmBtn = $('#btnConfirmMobileAllocation');

  // Set modal title based on mode
  if (mode === 'transfer') {
    title.textContent = 'Transferir para Endereço';
    confirmBtn.textContent = 'Confirmar Transferência';
  } else if (mode === 'add') {
    title.textContent = 'Adicionar Endereço';
    confirmBtn.textContent = 'Confirmar Adição';
  } else {
    title.textContent = 'Informar Endereço';
    confirmBtn.textContent = 'Confirmar Alocação';
  }

  // Set product info
  if (produtoAtual) {
    productDesc.textContent = produtoAtual.DESC;
    productCoddv.textContent = produtoAtual.CODDV;
  }

  // Reset form
  addressInput.value = '';
  addressInput.className = 'mobile-input-group input';
  confirmBtn.disabled = true;
  clearMobileAddressFeedback();
  hideMobileAddressSuggestions();

  // Use mobile modal manager
  mobileModalManager.openModal('mobileAddressModal', {
    backdrop: true,
    autoFocus: true,
    closePrevious: true
  });

  // Configurar detecção de scanner para o input de endereço
  configurarScannerMobileAddressInput();
}

// Close mobile address modal
function closeMobileAddressModal() {
  console.log('📱 Fechando modal de endereço mobile');

  // Use mobile modal manager
  mobileModalManager.closeModal('mobileAddressModal');

  // Reset state
  mobileModalState = {
    mode: null,
    sourceAddress: null,
    validatedAddress: null,
    validatedValidity: null,
    isValidating: false
  };

  // Reset form
  const addressInput = $('#mobileAddressInput');
  const validityInput = $('#mobileValidityInput');
  const validitySection = $('#mobileValiditySection');
  const confirmBtn = $('#btnConfirmMobileAllocation');

  if (addressInput) {
    addressInput.value = '';
    addressInput.classList.remove('valid', 'invalid');
  }

  if (validityInput) {
    validityInput.value = '';
    validityInput.classList.remove('valid', 'invalid');
  }

  if (validitySection) {
    validitySection.classList.add('hide');
  }

  if (confirmBtn) {
    confirmBtn.disabled = true;
  }

  hideMobileAddressFeedback();
  hideMobileValidityFeedback();
  hideMobileAddressSuggestions();
}

// Configurar detecção de scanner vs digitação manual no input de endereço mobile
function configurarScannerMobileAddressInput() {
  const addressInput = $('#mobileAddressInput');
  if (!addressInput) {
    console.log('❌ configurarScannerMobileAddressInput: mobileAddressInput não encontrado');
    return;
  }
  console.log('📱 Configurando detecção de scanner para mobileAddressInput');

  // Remover event listeners anteriores se existirem (para evitar duplicação)
  if (addressInput._scannerInputHandler) {
    addressInput.removeEventListener('input', addressInput._scannerInputHandler);
  }
  if (addressInput._scannerKeydownHandler) {
    addressInput.removeEventListener('keydown', addressInput._scannerKeydownHandler);
  }
  if (addressInput._scannerFocusHandler) {
    addressInput.removeEventListener('focus', addressInput._scannerFocusHandler);
  }

  // Adicionar atributos para melhor experiência mobile
  addressInput.setAttribute('autocomplete', 'off');
  addressInput.setAttribute('autocorrect', 'off');
  addressInput.setAttribute('autocapitalize', 'off');
  addressInput.setAttribute('spellcheck', 'false');

  // Detectar se é coletor Zebra ou Honeywell
  const userAgent = navigator.userAgent.toLowerCase();
  const isZebra = /zebra|tc2x|tc5x|tc7x|ec30/i.test(userAgent);
  const isHoneywell = /honeywell|dolphin|eda5x|eda7x/i.test(userAgent);
  const isColetor = isZebra || isHoneywell;
  
  console.log('🔍 Modal Endereço - Zebra:', isZebra, '| Honeywell:', isHoneywell);

  // Ajustar threshold baseado no dispositivo
  const SCANNER_THRESHOLD = isColetor ? 30 : 50;
  const SCANNER_TIMER = isColetor ? 100 : 150;

  // Variáveis para detecção de scanner
  let barcodeTimer = null;
  let lastInputTime = 0;
  let isManualEntry = false;
  let charCount = 0;
  let firstCharTime = 0;
  let previousValueLength = 0;

  // Handler para evento input
  addressInput._scannerInputHandler = function(e) {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9.]/g, '');
    if (value !== e.target.value) {
      e.target.value = value;
    }

    const currentTime = Date.now();
    const timeSinceLastInput = currentTime - lastInputTime;
    const lengthDelta = value.length - previousValueLength;
    const bulkInsertDetected = lengthDelta > 3;

    // SEMPRE atualizar lastInputTime
    lastInputTime = currentTime;

    // Limpar timer existente
    if (barcodeTimer) {
      clearTimeout(barcodeTimer);
      barcodeTimer = null;
    }

    // Só processar se houver conteúdo
    if (value.length > 0) {
      // Se for o primeiro caractere, apenas registra
      if (value.length === 1) {
        isManualEntry = false;
        firstCharTime = currentTime;
        charCount = 1;
        addressInput.placeholder = "Aguardando leitor...";
        previousValueLength = value.length;
        console.log('📱 Modal: Iniciando... (threshold:', SCANNER_THRESHOLD, 'ms)');
        return;
      }

      // Incrementar contador de caracteres
      charCount++;

      // Detectar método de entrada baseado no timing
      // Coletores: < 30ms | Celulares: < 50ms = scanner
      if (!bulkInsertDetected && timeSinceLastInput > SCANNER_THRESHOLD) {
        // Entrada manual - NÃO executa timer
        isManualEntry = true;
        addressInput.placeholder = "Ex: PF01.001.001.A01";
        console.log('🖊️ Modal: MANUAL (delay:', timeSinceLastInput, 'ms)');
      } else {
        // Entrada rápida - scanner detectado
        addressInput.placeholder = "Aguardando leitor...";
        console.log('📱 Modal: SCANNER (delay:', timeSinceLastInput, 'ms)');

        // Calcular velocidade média para confirmar scanner em coletores
        if (isColetor && charCount >= 3) {
          const tempoTotal = currentTime - firstCharTime;
          const velocidadeMedia = tempoTotal / charCount;
          console.log('📊 Velocidade média:', velocidadeMedia.toFixed(2), 'ms/caractere');
        }

        // Executar validação automaticamente após scanner
        barcodeTimer = setTimeout(() => {
          console.log('⏰ Modal: VALIDANDO AUTOMATICAMENTE!');
          // Só validar se tiver formato completo de endereço
          if (value.length >= 14) { // PF01.001.001.A01 = 14 caracteres
            validateMobileAddress();
          }
          barcodeTimer = null;
        }, SCANNER_TIMER);
      }
    } else {
      // Campo vazio - resetar estado
      isManualEntry = false;
      firstCharTime = 0;
      charCount = 0;
      addressInput.placeholder = 'Ex: PF01.001.001.A01';
    }
    previousValueLength = value.length;
  };

  // Handler para evento keydown (Enter)
  addressInput._scannerKeydownHandler = function(e) {
    if (e.key === 'Enter' || e.keyCode === 13 || (e.key === 'Tab' && addressInput.value.trim().length >= 14)) {
      e.preventDefault();
      console.log('⏎ Modal Endereço: Enter pressionado - validando endereço');

      // Limpar timer pendente
      if (barcodeTimer) {
        clearTimeout(barcodeTimer);
        barcodeTimer = null;
      }

      validateMobileAddress();
    }
  };

  // Adicionar event listeners
  addressInput.addEventListener('input', addressInput._scannerInputHandler);
  addressInput.addEventListener('keydown', addressInput._scannerKeydownHandler);
  addressInput._scannerFocusHandler = function () {
    lastInputTime = Date.now();
    previousValueLength = addressInput.value.length;
  };
  addressInput.addEventListener('focus', addressInput._scannerFocusHandler);

  console.log('📱 Detecção de scanner configurada para input de endereço mobile');
}

// Validate mobile address input
async function validateMobileAddress() {
  const addressInput = $('#mobileAddressInput');
  const validateBtn = $('#btnValidateAddress');
  const confirmBtn = $('#btnConfirmMobileAllocation');
  const validitySection = $('#mobileValiditySection');

  const address = addressInput.value.trim().toUpperCase();

  if (!address) {
    showMobileAddressFeedback('Por favor, informe um endereço.', 'error');
    return;
  }

  console.log('📱 Validando endereço mobile:', address);

  // Prevent multiple validations
  if (mobileModalState.isValidating) {
    return;
  }

  mobileModalState.isValidating = true;
  validateBtn.disabled = true;
  confirmBtn.disabled = true;

  try {
    // Validate address format
    if (!isValidAddressFormat(address)) {
      throw new Error('Formato de endereço inválido. Use o formato: PF01.001.001.A01');
    }

    // Check if address exists in system
    if (!window.sistemaEnderecamento || !window.sistemaEnderecamento.enderecosCadastrados[address]) {
      // Show suggestions for similar addresses
      const suggestions = sugerirEnderecosSimilares(address);
      if (suggestions.length > 0) {
        showMobileAddressSuggestions(suggestions);
        throw new Error('Endereço não encontrado no sistema. Veja as sugestões abaixo.');
      } else {
        throw new Error('Endereço não encontrado no sistema.');
      }
    }

    // Check if address is available (not occupied by current product)
    const isOccupied = window.sistemaEnderecamento.enderecosOcupados[address];
    if (isOccupied) {
      const occupiedBy = Array.isArray(isOccupied) ? isOccupied : [isOccupied];
      const currentProductInAddress = occupiedBy.find(p => p.coddv === produtoAtual.CODDV);

      if (currentProductInAddress) {
        throw new Error('Este produto já está alocado neste endereço.');
      }

      // Address is occupied by other products - show warning but allow allocation
      const otherProducts = occupiedBy.map(p => p.coddv).join(', ');
      showMobileAddressFeedback(
        `Endereço ocupado por: ${otherProducts}. O produto será adicionado junto.`,
        'warning'
      );
    } else {
      // Address is available
      showMobileAddressFeedback('Endereço válido e disponível.', 'success');
    }

    // Mark as validated
    addressInput.classList.add('valid');
    addressInput.classList.remove('invalid');
    mobileModalState.validatedAddress = address;
    hideMobileAddressSuggestions();

    // Show validity section
    if (validitySection) {
      validitySection.classList.remove('hide');
      // Focus on validity input
      const validityInput = $('#mobileValidityInput');
      if (validityInput) {
        setTimeout(() => validityInput.focus(), 300);
      }
    }

    console.log('📱 Endereço validado com sucesso:', address);

  } catch (error) {
    console.log('📱 Erro na validação do endereço:', error.message);

    addressInput.classList.add('invalid');
    addressInput.classList.remove('valid');
    showMobileAddressFeedback(error.message, 'error');
    mobileModalState.validatedAddress = null;
    confirmBtn.disabled = true;

    // Hide validity section on error
    if (validitySection) {
      validitySection.classList.add('hide');
    }
  } finally {
    mobileModalState.isValidating = false;
    validateBtn.disabled = false;
  }
}

// Validate mobile validity input
function validateMobileValidity() {
  const validityInput = $('#mobileValidityInput');
  const confirmBtn = $('#btnConfirmMobileAllocation');

  if (!validityInput) return false;

  const validity = validityInput.value.trim();

  // Validate MMAA format (Month 01-12, Year 24-99)
  const regex = /^(0[1-9]|1[0-2])([2-9][0-9])$/;
  const isValid = regex.test(validity);

  if (isValid) {
    validityInput.classList.add('valid');
    validityInput.classList.remove('invalid');
    showMobileValidityFeedback('Validade válida.', 'success');
    mobileModalState.validatedValidity = validity;
    confirmBtn.disabled = false;
  } else {
    validityInput.classList.add('invalid');
    validityInput.classList.remove('valid');
    showMobileValidityFeedback('Formato inválido. Use MMAA (ex: 0526).', 'error');
    mobileModalState.validatedValidity = null;
    confirmBtn.disabled = true;
  }

  return isValid;
}

// Show mobile validity feedback
function showMobileValidityFeedback(message, type) {
  const feedback = $('#mobileValidityFeedback');
  if (!feedback) return;

  feedback.textContent = message;
  feedback.className = `mobile-validity-feedback ${type}`;
  feedback.style.display = 'block';
}

// Mobile transfer modal functions
function openMobileTransferModal(enderecos) {
  console.log('📱 Abrindo modal mobile de transferência com endereços:', enderecos);

  if (!produtoAtual) {
    showMobileToast('Nenhum produto selecionado.', 'error');
    return;
  }

  // Update product info
  const productDesc = $('#mobileTransferProductDesc');
  const productCoddv = $('#mobileTransferProductCoddv');
  
  if (productDesc) productDesc.textContent = produtoAtual.DESC;
  if (productCoddv) productCoddv.textContent = produtoAtual.CODDV;

  // Populate address list
  populateMobileTransferAddressList(enderecos);

  // Show modal
  const modal = $('#mobileTransferModal');
  if (modal) {
    modal.classList.remove('hide');
    mobileModalManager.openModal('mobileTransferModal');
  }
}

function closeMobileTransferModal() {
  console.log('📱 Fechando modal mobile de transferência');
  
  const modal = $('#mobileTransferModal');
  if (modal) {
    modal.classList.add('hide');
    mobileModalManager.closeModal('mobileTransferModal');
  }
}

function populateMobileTransferAddressList(enderecos) {
  const addressList = $('#mobileTransferAddressList');
  if (!addressList) return;

  addressList.innerHTML = '';

  enderecos.forEach(endereco => {
    // Obter validade do produto neste endereço
    const validade = obterValidadeProdutoNoEndereco(produtoAtual?.CODDV, endereco);
    const validadeHtml = validade ? 
      `<div class="mobile-address-validade">📆 Validade: ${formatarValidadeMobile(validade)}</div>` : 
      '<div class="mobile-address-validade" style="color: #999;">📆 Validade: Não informada</div>';
    
    const addressItem = document.createElement('div');
    addressItem.className = 'mobile-address-item';
    addressItem.onclick = () => selectTransferSourceAddress(endereco);
    
    addressItem.innerHTML = `
      <div class="mobile-address-header">
        <div class="mobile-address-code">${endereco}</div>
        <div class="mobile-address-status available">Origem</div>
      </div>
      <div class="mobile-address-info">
        ${validadeHtml}
      </div>
    `;
    
    addressList.appendChild(addressItem);
  });
}

function selectTransferSourceAddress(sourceAddress) {
  console.log('📱 Endereço de origem selecionado:', sourceAddress);
  
  // Close transfer modal
  closeMobileTransferModal();
  
  // Open address modal for destination selection
  setTimeout(() => {
    openMobileAddressModal('transfer', sourceAddress);
  }, 300);
}

// Hide mobile validity feedback
function hideMobileValidityFeedback() {
  const feedback = $('#mobileValidityFeedback');
  if (feedback) {
    feedback.style.display = 'none';
  }
}

// Confirm mobile allocation
async function confirmMobileAllocation() {
  if (!mobileModalState.validatedAddress || !produtoAtual) {
    showMobileToast('Erro: Endereço não validado ou produto não selecionado.', 'error');
    return;
  }

  // Check if validity is required and validated
  const validitySection = $('#mobileValiditySection');
  if (validitySection && !validitySection.classList.contains('hide')) {
    if (!mobileModalState.validatedValidity) {
      showMobileToast('Por favor, informe uma validade válida.', 'error');
      return;
    }
  }

  const address = mobileModalState.validatedAddress;
  const validity = mobileModalState.validatedValidity;
  const mode = mobileModalState.mode;
  const sourceAddress = mobileModalState.sourceAddress;

  console.log('📱 Confirmando alocação mobile:', { mode, address, sourceAddress, validity });
  console.log('📱 Estado da validade:', { 
    validatedValidity: mobileModalState.validatedValidity,
    validityType: typeof mobileModalState.validatedValidity,
    validityLength: mobileModalState.validatedValidity?.length 
  });

  try {
    if (mode === 'transfer') {
      // Transfer product from source to destination
      await executeMobileTransfer(sourceAddress, address);
    } else if (mode === 'add') {
      // Add product to additional address
      await executeMobileAddition(address, validity);
    } else {
      // Allocate product to address
      await executeMobileAllocation(address, validity);
    }

    // Close modal on success
    closeMobileAddressModal();

  } catch (error) {
    console.error('📱 Erro na confirmação da alocação mobile:', error);
    showMobileToast('Erro: ' + error.message, 'error');
  }
}

// Execute mobile allocation
async function executeMobileAllocation(address, validity) {
  console.log('📱 Executando alocação mobile para endereço:', address, 'com validade:', validity);
  console.log('📱 Tipo da validade:', typeof validity, 'Comprimento:', validity?.length);

  try {
    // Use optimized addressing system
    if (window.sistemaEnderecamento) {
      await window.sistemaEnderecamento.alocarProduto(address, produtoAtual.CODDV, produtoAtual.DESC, false, validity);
    }

    // Update legacy system
    enderecosProdutos[produtoAtual.CODDV] = address;
    salvarLocalStorageSeguro('enderecos_produtos', JSON.stringify(enderecosProdutos));

    // Add to history
    await adicionarHistorico('ALOCAÇÃO', produtoAtual, null, address);

    // Show success message
    const info = formatarInfoEndereco(address);
    const validityFormatted = `${validity.substring(0, 2)}/20${validity.substring(2)}`;
    showMobileToast(
      `Alocação realizada com sucesso!\n\nProduto: ${produtoAtual.DESC}\nEndereço: ${address}\n(${info.formatado})\nValidade: ${validityFormatted}`,
      'success'
    );

    // Update product display
    exibirProduto(produtoAtual);

    // Increment global counter
    if (window.contadorGlobal) {
      window.contadorGlobal.incrementar();
    }

    console.log('📱 Alocação mobile concluída com sucesso');

  } catch (error) {
    console.error('📱 Erro na alocação mobile:', error);
    throw error;
  }
}

// Execute mobile transfer
async function executeMobileTransfer(sourceAddress, destinationAddress) {
  console.log('📱 Executando transferência mobile:', { sourceAddress, destinationAddress });

  try {
    // Buscar validade atual do produto
    let validade = null;
    if (window.sistemaEnderecamento && window.sistemaEnderecamento.cacheAlocacoes[sourceAddress]) {
      const aloc = window.sistemaEnderecamento.cacheAlocacoes[sourceAddress].find(p => p.coddv === produtoAtual.CODDV);
      if (aloc) validade = aloc.validade;
    }

    // Se não tiver validade (dados antigos), solicitar
    if (!validade) {
      showMobileToast('Este produto não possui validade cadastrada. Informe para transferir.', 'info');
      validade = await solicitarValidade();
      if (!validade) return;
    }

    // Use optimized addressing system
    if (window.sistemaEnderecamento) {
      await window.sistemaEnderecamento.transferirProduto(sourceAddress, destinationAddress);
    }

    // Update legacy system
    enderecosProdutos[produtoAtual.CODDV] = destinationAddress;
    salvarLocalStorageSeguro('enderecos_produtos', JSON.stringify(enderecosProdutos));

    // Add to history
    await adicionarHistorico('TRANSFERÊNCIA', produtoAtual, sourceAddress, destinationAddress);

    // Show success message
    const sourceInfo = formatarInfoEndereco(sourceAddress);
    const destInfo = formatarInfoEndereco(destinationAddress);
    showMobileToast(
      `Transferência realizada com sucesso!\n\nProduto: ${produtoAtual.DESC}\nDe: ${sourceAddress} (${sourceInfo.formatado})\nPara: ${destinationAddress} (${destInfo.formatado})`,
      'success'
    );

    // Update product display
    exibirProduto(produtoAtual);

    // Increment global counter
    if (window.contadorGlobal) {
      window.contadorGlobal.incrementar();
    }

    console.log('📱 Transferência mobile concluída com sucesso');

  } catch (error) {
    console.error('📱 Erro na transferência mobile:', error);
    throw error;
  }
}

// Show mobile address feedback
function showMobileAddressFeedback(message, type) {
  const feedback = $('#mobileAddressFeedback');
  if (feedback) {
    feedback.textContent = message;
    feedback.className = `mobile-address-feedback ${type}`;
    feedback.style.display = 'block';
  }
}

// Clear mobile address feedback
function clearMobileAddressFeedback() {
  const feedback = $('#mobileAddressFeedback');
  feedback.textContent = '';
  feedback.className = 'mobile-address-feedback';
}

// Hide mobile address feedback
function hideMobileAddressFeedback() {
  const feedback = $('#mobileAddressFeedback');
  if (feedback) {
    feedback.style.display = 'none';
    feedback.textContent = '';
    feedback.className = 'mobile-address-feedback';
  }
}

// Show mobile address suggestions
function showMobileAddressSuggestions(suggestions) {
  const container = $('#mobileAddressSuggestions');

  if (!suggestions || suggestions.length === 0) {
    hideMobileAddressSuggestions();
    return;
  }

  container.innerHTML = '';

  suggestions.forEach(address => {
    const item = document.createElement('div');
    item.className = 'mobile-suggestion-item';
    item.onclick = () => selectMobileSuggestion(address);

    const info = formatarInfoEndereco(address);
    const isOccupied = window.sistemaEnderecamento?.enderecosOcupados[address];

    item.innerHTML = `
      <div class="mobile-suggestion-address">${address}</div>
      <div class="mobile-suggestion-info">
        ${info.formatado} ${isOccupied ? '(Ocupado)' : '(Disponível)'}
      </div>
    `;

    container.appendChild(item);
  });

  container.classList.add('show');
}

// Hide mobile address suggestions
function hideMobileAddressSuggestions() {
  const container = $('#mobileAddressSuggestions');
  container.classList.remove('show');
  container.innerHTML = '';
}

// Select mobile suggestion
function selectMobileSuggestion(address) {
  const addressInput = $('#mobileAddressInput');
  addressInput.value = address;
  hideMobileAddressSuggestions();
  clearMobileAddressFeedback();

  // Auto-validate the selected address
  setTimeout(() => {
    validateMobileAddress();
  }, 100);
}

// Validate address format
function isValidAddressFormat(address) {
  // Format: PF01.001.001.A01
  const pattern = /^PF\d{2}\.\d{3}\.\d{3}\.A0[T1-6]$/;
  return pattern.test(address);
}

// Show mobile toast notification
function showMobileToast(message, type = 'info') {
  const toast = $('#mobileToast');
  const messageEl = $('#mobileToastMessage');

  if (!toast || !messageEl) {
    // Fallback to regular toast if mobile toast elements don't exist
    showToast(message, type);
    return;
  }

  messageEl.textContent = message;
  toast.className = `mobile-toast ${type}`;

  // Show toast
  toast.classList.remove('hide');

  // Auto-hide after 4 seconds
  setTimeout(() => {
    toast.classList.add('hide');
  }, 4000);
}

// Mobile confirmation dialog
function showMobileConfirmation(message, title = 'Confirmação') {
  if (!isMobileDevice()) {
    return customConfirm(message, title);
  }

  return new Promise((resolve) => {
    // Use mobile modal manager for confirmation
    const confirmationId = 'mobileConfirmation_' + Date.now();

    // Create confirmation modal dynamically
    const modal = document.createElement('div');
    modal.id = confirmationId;
    modal.className = 'mobile-modal mobile-confirmation hide';
    modal.innerHTML = `
      <div class="mobile-modal-content">
        <div class="mobile-modal-header">
          <h3>${title}</h3>
        </div>
        <div class="mobile-modal-body">
          <p>${message.replace(/\n/g, '<br>')}</p>
        </div>
        <div class="mobile-modal-actions">
          <button class="mobile-btn mobile-btn-secondary" onclick="resolveMobileConfirmation('${confirmationId}', false)">
            Cancelar
          </button>
          <button class="mobile-btn mobile-btn-primary" onclick="resolveMobileConfirmation('${confirmationId}', true)">
            Confirmar
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Store resolver function
    window.mobileConfirmationResolvers = window.mobileConfirmationResolvers || {};
    window.mobileConfirmationResolvers[confirmationId] = resolve;

    // Open modal
    mobileModalManager.openModal(confirmationId, {
      backdrop: true,
      autoFocus: true
    });
  });
}

// Resolve mobile confirmation
function resolveMobileConfirmation(confirmationId, result) {
  const resolver = window.mobileConfirmationResolvers?.[confirmationId];
  if (resolver) {
    resolver(result);
    delete window.mobileConfirmationResolvers[confirmationId];
  }

  // Close and remove modal
  mobileModalManager.closeModal(confirmationId);
  setTimeout(() => {
    const modal = document.getElementById(confirmationId);
    if (modal) {
      modal.remove();
    }
  }, 300);
}

// Mobile haptic feedback (if supported)
function provideMobileHapticFeedback(type = 'light') {
  if (!isMobileDevice() || !navigator.vibrate) {
    return;
  }

  const patterns = {
    light: [10],
    medium: [20],
    heavy: [30],
    success: [10, 50, 10],
    error: [50, 100, 50],
    warning: [20, 50, 20]
  };

  const pattern = patterns[type] || patterns.light;
  navigator.vibrate(pattern);
}

// Mobile keyboard utilities
const mobileKeyboard = {
  // Check if virtual keyboard is open
  isVirtualKeyboardOpen() {
    if (!isMobileDevice()) return false;

    const initialHeight = window.innerHeight;
    const currentHeight = window.visualViewport?.height || window.innerHeight;

    return currentHeight < initialHeight * 0.75;
  },

  // Handle virtual keyboard events
  onVirtualKeyboardToggle(callback) {
    if (!isMobileDevice() || !window.visualViewport) return;

    window.visualViewport.addEventListener('resize', () => {
      const isOpen = this.isVirtualKeyboardOpen();
      callback(isOpen);
    });
  },

  // Adjust UI for virtual keyboard
  adjustForVirtualKeyboard() {
    if (!isMobileDevice()) return;

    this.onVirtualKeyboardToggle((isOpen) => {
      document.body.classList.toggle('virtual-keyboard-open', isOpen);

      // Adjust active modal if any
      const currentModal = mobileModalManager.getCurrentModal();
      if (currentModal) {
        const modal = document.getElementById(currentModal.id);
        if (modal) {
          modal.classList.toggle('keyboard-adjusted', isOpen);
        }
      }
    });
  }
};

// Initialize mobile keyboard utilities
if (isMobileDevice()) {
  document.addEventListener('DOMContentLoaded', () => {
    mobileKeyboard.adjustForVirtualKeyboard();
  });
}

/* ===== Mobile Deallocation Modal Functions ===== */

let mobileDeallocationState = {
  addresses: [],
  selectedAddress: null,
  confirmationCallback: null
};

// Open mobile deallocation modal for multiple addresses
function openMobileDeallocationModal(addresses) {
  if (!isMobileDevice()) {
    console.log('📱 Não é dispositivo móvel - usando popup desktop');
    abrirPopupDesalocacao(addresses);
    return;
  }

  console.log('📱 Abrindo modal de desalocação mobile para endereços:', addresses);

  // Edge case: Validate addresses before opening modal
  if (!addresses || addresses.length === 0) {
    showMobileToast('Nenhum endereço disponível para desalocação.', 'warning');
    return;
  }

  mobileDeallocationState.addresses = addresses;
  mobileDeallocationState.selectedAddress = null;

  const modal = $('#mobileDeallocationModal');
  const productDesc = $('#mobileDeallocationProductDesc');
  const productCoddv = $('#mobileDeallocationProductCoddv');
  const addressList = $('#mobileDeallocationAddressList');

  // Set product info
  if (produtoAtual) {
    productDesc.textContent = produtoAtual.DESC;
    productCoddv.textContent = produtoAtual.CODDV;
  }

  // Clear and populate address list
  addressList.innerHTML = '';

  // Show loading state
  addressList.innerHTML = '<div class="mobile-loading">Carregando endereços...</div>';

  // Populate address list with current data
  setTimeout(() => {
    addressList.innerHTML = '';

    addresses.forEach(address => {
      const addressItem = document.createElement('div');
      addressItem.className = 'mobile-address-item';
      addressItem.onclick = () => selectMobileDeallocationAddress(address);

      const info = formatarInfoEndereco(address);
      const isOccupied = window.sistemaEnderecamento?.enderecosOcupados[address];
      const occupiedBy = isOccupied ? (Array.isArray(isOccupied) ? isOccupied : [isOccupied]) : [];
      const otherProducts = occupiedBy.filter(p => p.coddv !== produtoAtual.CODDV);

      // Obter validade do produto neste endereço
      const validade = obterValidadeProdutoNoEndereco(produtoAtual?.CODDV, address);
      const validadeHtml = validade ? 
        `<div class="mobile-address-validade">📆 Validade: ${formatarValidadeMobile(validade)}</div>` : 
        '<div class="mobile-address-validade" style="color: #999;">📆 Validade: Não informada</div>';

      addressItem.innerHTML = `
        <div class="mobile-address-code">${address}</div>
        <div class="mobile-address-info">${validadeHtml}</div>
        ${otherProducts.length > 0 ? `<div class="mobile-address-shared">Compartilhado com: ${otherProducts.map(p => p.coddv).join(', ')}</div>` : ''}
        <div class="mobile-address-select-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="9,18 15,12 9,6"/>
          </svg>
        </div>
      `;

      addressList.appendChild(addressItem);
    });

    // If no addresses were added, show empty state
    if (addressList.children.length === 0) {
      addressList.innerHTML = '<div class="mobile-empty-state">Nenhum endereço disponível para desalocação.</div>';
    }
  }, 100);

  // Use mobile modal manager
  mobileModalManager.openModal('mobileDeallocationModal', {
    backdrop: true,
    autoFocus: false,
    closePrevious: true
  });
}

// Close mobile deallocation modal
function closeMobileDeallocationModal() {
  console.log('📱 Fechando modal de desalocação mobile');

  // Use mobile modal manager
  mobileModalManager.closeModal('mobileDeallocationModal');

  // Reset state
  mobileDeallocationState = {
    addresses: [],
    selectedAddress: null,
    confirmationCallback: null
  };
}

// Select address for deallocation
async function selectMobileDeallocationAddress(address) {
  console.log('📱 Endereço selecionado para desalocação:', address);

  // Edge case: Re-validate that the address still contains this product
  const isOccupied = window.sistemaEnderecamento?.enderecosOcupados[address];
  if (!isOccupied) {
    showMobileToast('Este endereço não está mais ocupado. A lista será atualizada.', 'warning');
    // Refresh the modal with current addresses
    const currentStatus = obterStatusProduto(produtoAtual.CODDV);
    if (currentStatus.alocado && currentStatus.multiplos) {
      openMobileDeallocationModal(currentStatus.enderecos);
    } else {
      closeMobileDeallocationModal();
    }
    return;
  }

  const occupiedBy = Array.isArray(isOccupied) ? isOccupied : [isOccupied];
  const productInAddress = occupiedBy.find(p => p.coddv === produtoAtual.CODDV);

  if (!productInAddress) {
    showMobileToast('Este produto não está mais alocado neste endereço. A lista será atualizada.', 'warning');
    // Refresh the modal with current addresses
    const currentStatus = obterStatusProduto(produtoAtual.CODDV);
    if (currentStatus.alocado && currentStatus.multiplos) {
      openMobileDeallocationModal(currentStatus.enderecos);
    } else {
      closeMobileDeallocationModal();
    }
    return;
  }

  const info = formatarInfoEndereco(address);
  const confirmar = await showMobileConfirmation(
    `Confirma desalocação do endereço:\n\n${address}\n(${info.formatado})\n\nProduto: ${produtoAtual.DESC}`,
    'Desalocar Endereço'
  );

  if (confirmar) {
    try {
      await executeMobileDeallocation(address);
      closeMobileDeallocationModal();
    } catch (error) {
      // Error is already handled in executeMobileDeallocation
      // Just log it here for debugging
      console.error('📱 Erro na desalocação do endereço selecionado:', error);
    }
  }
}

// Confirm deallocation from all addresses
async function confirmDeallocationFromAll() {
  console.log('📱 Confirmando desalocação de todos os endereços');

  // Edge case: Re-check current product status before proceeding
  const currentStatus = obterStatusProduto(produtoAtual.CODDV);
  if (!currentStatus.alocado) {
    showMobileToast('Este produto não está mais alocado em nenhum endereço.', 'warning');
    closeMobileDeallocationModal();
    return;
  }

  // Use current addresses instead of cached ones
  const addresses = currentStatus.multiplos ? currentStatus.enderecos : [currentStatus.endereco];

  const confirmar = await showMobileConfirmation(
    `Confirma desalocação de TODOS os endereços?\n\nProduto: ${produtoAtual.DESC}\nEndereços: ${addresses.length}\n\n${addresses.join('\n')}`,
    'Desalocar de Todos'
  );

  if (confirmar) {
    try {
      let successCount = 0;
      let errorCount = 0;
      const errors = [];

      // Deallocate from all addresses
      for (const address of addresses) {
        try {
          await executeMobileDeallocation(address, false); // Don't show individual success messages
          successCount++;
        } catch (error) {
          errorCount++;
          errors.push(`${address}: ${error.message}`);
          console.error(`📱 Erro ao desalocar do endereço ${address}:`, error);
        }
      }

      // Show summary message
      if (successCount > 0 && errorCount === 0) {
        showMobileToast(
          `Desalocação realizada com sucesso!\nProduto removido de ${successCount} endereços.`,
          'success'
        );
      } else if (successCount > 0 && errorCount > 0) {
        showMobileToast(
          `Desalocação parcial:\n${successCount} endereços removidos com sucesso\n${errorCount} endereços com erro`,
          'warning'
        );
      } else {
        showMobileToast(
          `Falha na desalocação:\nNenhum endereço foi removido\n\nErros:\n${errors.join('\n')}`,
          'error'
        );
      }

      // Update product display
      exibirProduto(produtoAtual);

      closeMobileDeallocationModal();

    } catch (error) {
      console.error('📱 Erro na desalocação de todos os endereços:', error);
      showMobileToast('Erro ao desalocar de todos os endereços: ' + error.message, 'error');
    }
  }
}

// Execute mobile deallocation
async function executeMobileDeallocation(address, showSuccessMessage = true) {
  console.log('📱 Executando desalocação mobile do endereço:', address);

  try {
    // Edge case: Check if product is still allocated to this address
    const currentStatus = obterStatusProduto(produtoAtual.CODDV);
    if (!currentStatus.alocado) {
      throw new Error('Este produto não está mais alocado em nenhum endereço.');
    }

    // Edge case: Check if address still contains this product
    const isOccupied = window.sistemaEnderecamento?.enderecosOcupados[address];
    if (!isOccupied) {
      throw new Error('Este endereço não está mais ocupado.');
    }

    const occupiedBy = Array.isArray(isOccupied) ? isOccupied : [isOccupied];
    const productInAddress = occupiedBy.find(p => p.coddv === produtoAtual.CODDV);

    if (!productInAddress) {
      throw new Error('Este produto não está mais alocado neste endereço.');
    }

    // Use optimized addressing system
    if (window.sistemaEnderecamento) {
      await window.sistemaEnderecamento.desalocarProduto(address, produtoAtual.CODDV);
    }

    // Update legacy system
    delete enderecosProdutos[produtoAtual.CODDV];
    salvarLocalStorageSeguro('enderecos_produtos', JSON.stringify(enderecosProdutos));

    // Add to history
    await adicionarHistorico('DESALOCAÇÃO', produtoAtual, address, null);

    // Show success message if requested
    if (showSuccessMessage) {
      const info = formatarInfoEndereco(address);
      showMobileToast(
        `Desalocação realizada com sucesso!\n\nProduto: ${produtoAtual.DESC}\nEndereço: ${address}\n(${info.formatado})`,
        'success'
      );

      // Update product display
      exibirProduto(produtoAtual);
    }

    // Increment global counter
    if (window.contadorGlobal) {
      window.contadorGlobal.incrementar();
    }

    console.log('📱 Desalocação mobile concluída com sucesso');

  } catch (error) {
    console.error('📱 Erro na desalocação mobile:', error);

    // Handle specific edge cases with user-friendly messages
    if (error.message.includes('não está mais alocado')) {
      showMobileToast('Este produto não está mais alocado. A página será atualizada.', 'warning');
      // Refresh product display
      setTimeout(() => {
        if (produtoAtual) {
          exibirProduto(produtoAtual);
        }
      }, 2000);
    } else if (error.message.includes('endereço não está mais ocupado')) {
      showMobileToast('Este endereço não está mais ocupado. A página será atualizada.', 'warning');
      // Refresh product display
      setTimeout(() => {
        if (produtoAtual) {
          exibirProduto(produtoAtual);
        }
      }, 2000);
    } else {
      showMobileToast('Erro ao desalocar: ' + error.message, 'error');
    }

    throw error;
  }
}

/* ===== Mobile Confirmation Modal Functions ===== */

let mobileConfirmationState = {
  resolve: null,
  message: '',
  title: ''
};

// Show mobile confirmation dialog
function showMobileConfirmation(message, title = 'Confirmação') {
  return new Promise((resolve) => {
    if (!isMobileDevice()) {
      // Fallback to desktop confirmation
      customConfirm(message, title).then(resolve);
      return;
    }

    console.log('📱 Exibindo confirmação mobile:', title);

    mobileConfirmationState.resolve = resolve;
    mobileConfirmationState.message = message;
    mobileConfirmationState.title = title;

    const modal = $('#mobileConfirmationModal');
    const titleEl = $('#mobileConfirmationTitle');
    const messageEl = $('#mobileConfirmationMessage');

    titleEl.textContent = title;
    messageEl.innerHTML = message.replace(/\n/g, '<br>');

    modal.classList.remove('hide');
  });
}

// Close mobile confirmation modal
function closeMobileConfirmationModal() {
  console.log('📱 Fechando modal de confirmação mobile');

  const modal = $('#mobileConfirmationModal');
  modal.classList.add('hide');

  // Resolve with false if no explicit confirmation
  if (mobileConfirmationState.resolve) {
    mobileConfirmationState.resolve(false);
  }

  // Reset state
  mobileConfirmationState = {
    resolve: null,
    message: '',
    title: ''
  };
}

// Execute mobile confirmation
function executeMobileConfirmation() {
  console.log('📱 Confirmação mobile aceita');

  const modal = $('#mobileConfirmationModal');
  modal.classList.add('hide');

  // Resolve with true
  if (mobileConfirmationState.resolve) {
    mobileConfirmationState.resolve(true);
  }

  // Reset state
  mobileConfirmationState = {
    resolve: null,
    message: '',
    title: ''
  };
}

// Add event listeners for mobile address input
document.addEventListener('DOMContentLoaded', function () {
  const addressInput = $('#mobileAddressInput');
  if (addressInput) {
    // Scanner detection variables for address
    let addressTimer = null;
    let lastAddressInputTime = 0;
    let addressInputStartTime = 0;

    // Auto-validate on Enter key
    addressInput.addEventListener('keypress', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        // Clear any pending timer
        if (addressTimer) {
          clearTimeout(addressTimer);
          addressTimer = null;
        }
        validateMobileAddress();
      }
    });

    // Enhanced input handling with scanner detection
    addressInput.addEventListener('input', function () {
      this.classList.remove('valid', 'invalid');
      clearMobileAddressFeedback();
      hideMobileAddressSuggestions();
      mobileModalState.validatedAddress = null;
      $('#btnConfirmMobileAllocation').disabled = true;

      // Hide validity section when address changes
      const validitySection = $('#mobileValiditySection');
      if (validitySection) {
        validitySection.classList.add('hide');
      }

      const currentTime = Date.now();
      const timeSinceLastInput = currentTime - lastAddressInputTime;
      const value = this.value.trim();

      // Clear any existing timer
      if (addressTimer) {
        clearTimeout(addressTimer);
        addressTimer = null;
      }

      // Only process if we have content (format PF01.001.001.A01 = 15 chars)
      if (value.length >= 5) {
        // If this is early input, record start time
        if (value.length <= 5) {
          addressInputStartTime = currentTime;
          lastAddressInputTime = currentTime;
          return;
        }

        // Detect input method based on timing
        // If time between characters > 50ms, it's likely manual entry
        if (timeSinceLastInput <= 50 || value.length >= 15) {
          // Fast input or complete address - likely scanner
          console.log('📱 Entrada rápida de endereço detectada - timer ativo');

          // Set timer for scanner auto-validation
          addressTimer = setTimeout(() => {
            console.log('⏰ Timer de endereço expirado - validando automaticamente');
            if (value.length >= 15) {
              validateMobileAddress();
            }
            addressTimer = null;
          }, 150);
        } else {
          console.log('🖊️ Entrada manual de endereço detectada - aguardando Enter ou ícone');
        }
      }

      lastAddressInputTime = currentTime;
    });
  }

  // Add event listeners for mobile validity input
  const validityInput = $('#mobileValidityInput');
  if (validityInput) {
    // Validate on input change
    validityInput.addEventListener('input', function (e) {
      // Remove non-numeric characters
      e.target.value = e.target.value.replace(/\D/g, '');

      // Clear previous validation state
      this.classList.remove('valid', 'invalid');
      hideMobileValidityFeedback();

      // Validate if has 4 characters
      if (e.target.value.length === 4) {
        validateMobileValidity();
      } else {
        mobileModalState.validatedValidity = null;
        $('#btnConfirmMobileAllocation').disabled = true;
      }
    });

    // Validate on Enter key
    validityInput.addEventListener('keypress', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (validateMobileValidity()) {
          // If validity is valid, focus on confirm button
          const confirmBtn = $('#btnConfirmMobileAllocation');
          if (confirmBtn && !confirmBtn.disabled) {
            confirmBtn.focus();
          }
        }
      }
    });
  }

  // Add event listeners for mobile deallocation modal
  const mobileDeallocationModal = $('#mobileDeallocationModal');
  if (mobileDeallocationModal) {
    // Close modal when clicking outside
    mobileDeallocationModal.addEventListener('click', function (e) {
      if (e.target === this) {
        closeMobileDeallocationModal();
      }
    });
  }

  // Add event listeners for mobile confirmation modal
  const mobileConfirmationModal = $('#mobileConfirmationModal');
  if (mobileConfirmationModal) {
    // Close modal when clicking outside
    mobileConfirmationModal.addEventListener('click', function (e) {
      if (e.target === this) {
        closeMobileConfirmationModal();
      }
    });
  }

  // Add keyboard event listeners for mobile modals
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      // Close mobile deallocation modal on Escape
      if (!$('#mobileDeallocationModal').classList.contains('hide')) {
        closeMobileDeallocationModal();
      }

      // Close mobile confirmation modal on Escape
      if (!$('#mobileConfirmationModal').classList.contains('hide')) {
        closeMobileConfirmationModal();
      }
    }
  });
});

// Execute deallocation action on mobile
async function executarDesalocacaoMobile() {
  console.log('📱 Executando desalocação mobile para produto:', produtoAtual?.CODDV);

  if (!produtoAtual) {
    showMobileToast('Nenhum produto selecionado.', 'warning');
    return;
  }

  // Verificar status em tempo real antes de executar
  let status;
  if (window.sistemaEnderecamento && window.sistemaEnderecamento.verificarStatusProdutoRealTime) {
    try {
      console.log('📱 Verificando status em tempo real antes de desalocar...');
      status = await window.sistemaEnderecamento.verificarStatusProdutoRealTime(produtoAtual.CODDV);
      console.log('📱 Status real do banco:', status);
    } catch (error) {
      console.warn('📱 Erro ao verificar status em tempo real, usando cache:', error);
      status = obterStatusProduto(produtoAtual.CODDV);
    }
  } else {
    status = obterStatusProduto(produtoAtual.CODDV);
  }

  if (!status.alocado) {
    showMobileToast('⚠️ Este produto já foi desalocado por outro usuário ou não está mais alocado.', 'warning');
    // Atualizar a interface para refletir o status real
    exibirProdutoComStatus(produtoAtual, status);
    updateMobileActionButtons(produtoAtual, status);
    return;
  }

  if (status.multiplos) {
    // Multiple addresses - show mobile selection modal
    console.log('📱 Produto com múltiplos endereços - abrindo modal mobile de desalocação');
    openMobileDeallocationModal(status.enderecos);
  } else {
    // Single address - direct deallocation with mobile confirmation
    console.log('📱 Produto com endereço único - confirmando desalocação mobile');
    const info = formatarInfoEndereco(status.endereco);
    const confirmar = await showMobileConfirmation(
      `Deseja desalocar este produto?\n\nProduto: ${produtoAtual.DESC}\nEndereço: ${status.endereco}\n(${info.formatado})`,
      'Confirmar Desalocação'
    );

    if (confirmar) {
      console.log('📱 Usuário confirmou desalocação - executando');
      await executeMobileDeallocation(status.endereco);
    }
  }
}

/* ===== Utilities ===== */
const $ = (sel) => document.querySelector(sel);
const sanitizeUpper = (s) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '');

// Função para formatar data de forma segura
function formatarDataSegura(dataStr) {
  if (!dataStr) return 'Data não disponível';

  try {
    let data;

    // Se já é uma string formatada em português (DD/MM/AAAA HH:MM:SS)
    if (typeof dataStr === 'string' && dataStr.includes('/')) {
      const partes = dataStr.split(' ');
      if (partes.length >= 1) {
        const [dia, mes, ano] = partes[0].split('/');
        const hora = partes[1] || '00:00:00';
        // Criar data no formato ISO para parsing correto
        data = new Date(`${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}T${hora}`);
      }
    } else {
      // Tentar como ISO string ou timestamp
      data = new Date(dataStr);
    }

    if (!isNaN(data.getTime())) {
      return data.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  } catch (e) {
    console.warn('Erro ao converter data:', dataStr, e);
  }

  // Se chegou até aqui, retornar a string original ou uma mensagem padrão
  return typeof dataStr === 'string' ? dataStr : 'Data inválida';
}

// Função para sugerir endereços próximos
function sugerirEnderecosSimilares(enderecoInvalido) {
  if (!window.sistemaEnderecamento) return [];

  const enderecosCadastrados = Object.keys(window.sistemaEnderecamento.enderecosCadastrados);
  const sugestoes = [];

  // Extrair partes do endereço inválido
  const partes = enderecoInvalido.split('.');
  if (partes.length >= 3) {
    const zona = partes[0];
    const coluna = partes[2];

    // Buscar endereços com zona ou coluna similar
    enderecosCadastrados.forEach(endereco => {
      const partesEndereco = endereco.split('.');
      if (partesEndereco.length >= 3) {
        // Mesma zona
        if (partesEndereco[0] === zona) {
          sugestoes.push(endereco);
        }
        // Mesma coluna
        else if (partesEndereco[2] === coluna) {
          sugestoes.push(endereco);
        }
      }
    });
  }

  // Remover duplicatas e limitar a 5 sugestões
  return [...new Set(sugestoes)].slice(0, 5);
}

// Função para atualizar endereço gerado inline
function atualizarEnderecoGeradoInline() {
  const zonaElement = $('#zonaInline');
  const colunaElement = $('#colunaInline');
  const nivelElement = $('#nivelInline');
  const displayElement = $('#enderecoGeradoInline');

  // Verificar se todos os elementos existem
  if (!zonaElement || !colunaElement || !nivelElement || !displayElement) {
    console.warn('Elementos de endereço inline não encontrados no DOM');
    return;
  }

  const zona = zonaElement.value;
  const coluna = colunaElement.value;
  const nivel = nivelElement.value;

  if (zona && coluna && nivel) {
    try {
      const endereco = window.sistemaEnderecamento ?
        window.sistemaEnderecamento.gerarEndereco(zona, coluna, nivel) :
        `PF${zona.padStart(2, '0')}.001.${coluna.padStart(3, '0')}.A0${nivel}`;

      const info = formatarInfoEndereco(endereco);
      displayElement.textContent = endereco;
      displayElement.style.color = '#059669';
      displayElement.title = `${info.formatado}`;

      // Verificar se já existe
      if (window.sistemaEnderecamento && window.sistemaEnderecamento.enderecosCadastrados[endereco]) {
        displayElement.style.color = '#dc2626';
        displayElement.title = `Endereço já cadastrado - ${info.formatado}`;
      } else {
        displayElement.title = `Endereço válido - ${info.formatado}`;
      }
    } catch (error) {
      displayElement.textContent = 'Erro: ' + error.message;
      displayElement.style.color = '#dc2626';
      displayElement.title = error.message;
    }
  } else {
    // Mostrar formato com partes preenchidas
    const zonaDisplay = zona ? `PF${zona.padStart(2, '0')}` : 'PF--';
    const colunaDisplay = coluna ? coluna.padStart(3, '0') : '---';
    const nivelDisplay = nivel ? `A0${nivel}` : 'A0-';

    displayElement.textContent = `${zonaDisplay}.001.${colunaDisplay}.${nivelDisplay}`;
    displayElement.style.color = '#6b7280';

    // Mostrar descrição parcial se houver nível selecionado
    if (nivel) {
      displayElement.title = `Preencha todas as partes - Nível: ${obterDescricaoNivel(nivel)}`;
    } else {
      displayElement.title = 'Preencha todas as partes';
    }
  }
}

// Função para obter endereço completo dos campos inline
function obterEnderecoCompleto() {
  const zonaElement = $('#zonaInline');
  const colunaElement = $('#colunaInline');
  const nivelElement = $('#nivelInline');

  // Verificar se os elementos existem
  if (!zonaElement || !colunaElement || !nivelElement) {
    console.warn('Elementos de endereço inline não encontrados no DOM');
    return null;
  }

  const zona = zonaElement.value;
  const coluna = colunaElement.value;
  const nivel = nivelElement.value;

  if (!zona || !coluna || !nivel) {
    return null;
  }

  try {
    return window.sistemaEnderecamento ?
      window.sistemaEnderecamento.gerarEndereco(zona, coluna, nivel) :
      `PF${zona.padStart(2, '0')}.001.${coluna.padStart(3, '0')}.A0${nivel}`;
  } catch (error) {
    return null;
  }
}

// Função para obter descrição amigável do nível
function obterDescricaoNivel(nivel) {
  const descricoes = {
    'T': 'Térreo',
    '1': '1º Andar',
    '2': '2º Andar',
    '4': '4º Andar',
    '5': '5º Andar',
    '6': '6º Andar'
  };
  return descricoes[nivel] || `Nível ${nivel}`;
}

// Função para extrair e formatar informações do endereço
function formatarInfoEndereco(endereco) {
  const partes = endereco.split('.');
  if (partes.length !== 4) return endereco;

  const zona = partes[0];
  const coluna = partes[2];
  const nivel = partes[3].replace('A0', '');

  return {
    endereco: endereco,
    zona: zona,
    coluna: coluna,
    nivel: nivel,
    descricaoNivel: obterDescricaoNivel(nivel),
    formatado: `${zona} - Col.${coluna} - ${obterDescricaoNivel(nivel)}`
  };
}

/* ===== Controle de Validade (Novo) ===== */
function mostrarModalValidade() {
  const modal = document.getElementById('modalValidade');
  const input = document.getElementById('inputValidade');
  const feedback = document.getElementById('validadeFeedback');

  if (!modal || !input) return;

  input.value = '';
  feedback.style.display = 'none';
  modal.classList.add('active');

  // Máscara MMAA
  input.oninput = (e) => {
    let v = e.target.value.replace(/\D/g, '');
    if (v.length > 4) v = v.substring(0, 4);
    e.target.value = v;
  };

  setTimeout(() => input.focus(), 300);
}

function fecharModalValidade() {
  const modal = document.getElementById('modalValidade');
  if (modal) modal.classList.remove('active');
  if (window._resolveValidade) {
    window._resolveValidade(null);
    window._resolveValidade = null;
  }
}

function solicitarValidade() {
  return new Promise((resolve) => {
    mostrarModalValidade();
    window._resolveValidade = resolve;

    const btn = document.getElementById('btnConfirmarValidade');
    const input = document.getElementById('inputValidade');
    const feedback = document.getElementById('validadeFeedback');

    btn.onclick = () => {
      const val = input.value;
      if (val.length !== 4) {
        feedback.style.display = 'block';
        return;
      }

      // Validar mês (01-12)
      const mes = parseInt(val.substring(0, 2));
      if (mes < 1 || mes > 12) {
        feedback.textContent = 'Mês inválido (01-12)';
        feedback.style.display = 'block';
        return;
      }

      modal.classList.remove('active');
      window._resolveValidade = null;
      resolve(val);
    };

    input.onkeypress = (e) => {
      if (e.key === 'Enter') btn.click();
    };
  });
}

/* ===== Fluxo de Alocação por Endereço ===== */
let enderecoDestino = null;

function verificarParametrosURL() {
  const urlParams = new URLSearchParams(window.location.search);
  const endereco = urlParams.get('endereco');

  if (endereco) {
    enderecoDestino = endereco;
    const info = formatarInfoEndereco(endereco);

    // Show visual indicator reuse styles
    const banner = document.createElement('div');
    banner.className = 'produto-selecionado-banner banner-alocacao';
    banner.innerHTML = `
      <div class="banner-content">
          <div class="banner-info">
              <div class="banner-icon">📍</div>
              <div class="banner-text">
                  <div class="banner-title">Endereço Selecionado para Alocação</div>
                  <div class="banner-produto">
                      <strong>Endereço:</strong> ${endereco}<br>
                      <small>${info.formatado}</small>
                  </div>
                  <div class="banner-hint">
                      <em>Escaneie ou digite o código do produto para alocar neste endereço</em>
                  </div>
              </div>
          </div>
          <div class="banner-actions">
               <button class="btn btn-ghost btn-sm" onclick="cancelarSelecaoEndereco()">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M18 6L6 18M6 6l12 12"/>
                  </svg>
                  Cancelar
              </button>
          </div>
      </div>
    `;

    const header = document.querySelector('.app-header');
    if (header && header.parentNode) {
      header.parentNode.insertBefore(banner, header.nextSibling);
    }
  }
}

function cancelarSelecaoEndereco() {
  window.location.href = 'index.html';
}

async function verificarAlocacaoEnderecoDestino(produto) {
  if (!enderecoDestino) return;

  // Verificar se o produto já está alocado
  const status = obterStatusProduto(produto.CODDV);

  if (status.alocado) {
    // Verificar se já está neste endereço específico
    const todosEnderecos = obterTodosEnderecosProduto(produto.CODDV);
    const jaEstaNesteEndereco = todosEnderecos.includes(enderecoDestino);

    if (jaEstaNesteEndereco) {
      showToast(`O produto já está alocado neste endereço: ${enderecoDestino}`, 'warning');
      return;
    }

    // Dar opção de transferir ou adicionar
    const opcao = await customConfirm(
      `O produto ${produto.DESC} já está alocado em:\n${todosEnderecos.join(', ')}\n\nDeseja:\n• OK = Adicionar neste endereço também (múltiplas alocações)\n• Cancelar = Transferir para este endereço (remover dos outros)`,
      'Produto Já Alocado'
    );

    if (opcao) {
      // Adicionar em mais um endereço
      await adicionarEmMaisEnderecoDestino(produto, enderecoDestino);
    } else {
      // Transferir (remover dos outros)
      await transferirParaEnderecoDestino(produto, todosEnderecos[0], enderecoDestino);
    }
    return;
  }

  // Se estiver disponível, confirmar alocação
  const info = formatarInfoEndereco(enderecoDestino);
  const confirmar = await customConfirm(
    `Deseja alocar o produto neste endereço?\n\nProduto: ${produto.DESC}\nEndereço: ${enderecoDestino}\n(${info.formatado})`,
    'Confirmar Alocação'
  );

  if (confirmar) {
    await alocarNoEnderecoDestino(produto, enderecoDestino);
  }
}

async function alocarNoEnderecoDestino(produto, endereco) {
  try {
    // Solicitar validade antes de prosseguir
    const validade = await solicitarValidade();
    if (!validade) return;

    if (window.sistemaEnderecamento) {
      await window.sistemaEnderecamento.alocarProduto(endereco, produto.CODDV, produto.DESC, false, validade);
    }

    // Atualizar legado
    enderecosProdutos[produto.CODDV] = endereco;
    salvarLocalStorageSeguro('enderecos_produtos', JSON.stringify(enderecosProdutos));

    const info = formatarInfoEndereco(endereco);
    showToast(`Alocação realizada com sucesso!\n${endereco}`, 'success');

    await adicionarHistorico('ALOCAÇÃO', produto, null, endereco);

    // Limpar seleção de endereço e recarregar
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 1500);

  } catch (error) {
    showToast('Erro ao alocar: ' + error.message, 'error');
  }
}

async function adicionarEmMaisEnderecoDestino(produto, endereco) {
  try {
    // Solicitar validade antes de prosseguir
    const validade = await solicitarValidade();
    if (!validade) return;

    if (window.sistemaEnderecamento) {
      await window.sistemaEnderecamento.adicionarProdutoEmMaisEnderecos(endereco, produto.CODDV, produto.DESC, validade);
    }

    // Atualizar legado (manter compatibilidade)
    enderecosProdutos[produto.CODDV] = endereco;
    salvarLocalStorageSeguro('enderecos_produtos', JSON.stringify(enderecosProdutos));

    const info = formatarInfoEndereco(endereco);
    showToast(`Produto adicionado com sucesso!\n\nNovo endereço: ${endereco}\n(${info.formatado})\n\nO produto continua nos endereços anteriores.`, 'success');

    await adicionarHistorico('ALOCAÇÃO ADICIONAL', produto, null, endereco);

    // Limpar seleção de endereço e recarregar
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 1500);

  } catch (error) {
    showToast('Erro ao adicionar: ' + error.message, 'error');
  }
}

async function transferirParaEnderecoDestino(produto, origem, destino) {
  try {
    // Buscar validade atual do produto
    let validade = null;
    if (window.sistemaEnderecamento && window.sistemaEnderecamento.cacheAlocacoes[origem]) {
      const aloc = window.sistemaEnderecamento.cacheAlocacoes[origem].find(p => p.coddv === produto.CODDV);
      if (aloc) validade = aloc.validade;
    }

    // Se não tiver validade (dados antigos), solicitar
    if (!validade) {
      showToast('Este produto não possui validade cadastrada. Informe para transferir.', 'info');
      validade = await solicitarValidade();
      if (!validade) return;
    }

    if (window.sistemaEnderecamento) {
      await window.sistemaEnderecamento.transferirProduto(origem, destino);
    }

    // Atualizar legado
    enderecosProdutos[produto.CODDV] = destino;
    salvarLocalStorageSeguro('enderecos_produtos', JSON.stringify(enderecosProdutos));

    showToast(`Transferência realizada com sucesso!`, 'success');

    await adicionarHistorico('TRANSFERÊNCIA', produto, origem, destino);

    setTimeout(() => {
      window.location.href = 'index.html';
    }, 1500);

  } catch (error) {
    showToast('Erro ao transferir: ' + error.message, 'error');
  }
}

/* ===== Gestão de Produtos ===== */
let produtoAtual = null;
let buscaEmAndamentoToken = 0;

let enderecosProdutos = JSON.parse(localStorage.getItem('enderecos_produtos') || '{}');


function buscarProduto(codigo) {
  if (!window.DB_CADASTRO || !window.DB_CADASTRO.BASE_CADASTRO) {
    console.error('Base de dados não carregada');
    return null;
  }

  const codigoLimpo = codigo.trim();

  // Buscar por CODDV ou BARRAS
  const produto = window.DB_CADASTRO.BASE_CADASTRO.find(item =>
    item.CODDV === codigoLimpo || item.BARRAS === codigoLimpo
  );

  return produto;
}

function obterStatusProduto(coddv) {
  // Primeiro verificar no sistema de endereçamento otimizado
  if (window.sistemaEnderecamento) {
    const todosEnderecos = obterTodosEnderecosProduto(coddv);
    if (todosEnderecos.length > 0) {
      // Ordenar endereços em ordem crescente
      const enderecosOrdenados = [...todosEnderecos].sort();
      return {
        alocado: true,
        endereco: enderecosOrdenados[0], // Primeiro endereço para compatibilidade
        enderecos: enderecosOrdenados,   // Todos os endereços ordenados
        multiplos: enderecosOrdenados.length > 1
      };
    }
  }

  // Fallback para sistema legado
  const endereco = enderecosProdutos[coddv];
  return {
    alocado: !!endereco,
    endereco: endereco || null,
    enderecos: endereco ? [endereco] : [],
    multiplos: false
  };
}

function obterTodosEnderecosProduto(coddv) {
  const enderecos = [];
  if (window.sistemaEnderecamento) {
    for (const [endereco, produtos] of Object.entries(window.sistemaEnderecamento.enderecosOcupados)) {
      if (Array.isArray(produtos)) {
        // Novo formato (array de produtos)
        const produto = produtos.find(p => p.coddv === coddv);
        if (produto) enderecos.push(endereco);
      } else {
        // Formato legado (objeto único)
        if (produtos.coddv === coddv) enderecos.push(endereco);
      }
    }
  }
  return enderecos;
}

function obterDataAlocacao(coddv, endereco) {
  if (window.sistemaEnderecamento) {
    // Verificar no sistema Supabase primeiro
    if (window.sistemaEnderecamento.cacheAlocacoes && window.sistemaEnderecamento.cacheAlocacoes[endereco]) {
      const produtos = window.sistemaEnderecamento.cacheAlocacoes[endereco];
      const produtoArray = Array.isArray(produtos) ? produtos : [produtos];
      const produto = produtoArray.find(p => p.coddv === coddv);

      if (produto && produto.data_alocacao) {
        // Se já está no formato brasileiro, usar direto
        if (produto.data_alocacao.includes('/')) {
          return produto.data_alocacao;
        }
        // Se está em formato ISO, converter
        try {
          const data = new Date(produto.data_alocacao);
          return data.toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
        } catch (e) {
          return produto.data_alocacao;
        }
      }
    }

    // Fallback para sistema legado
    if (window.sistemaEnderecamento.enderecosOcupados && window.sistemaEnderecamento.enderecosOcupados[endereco]) {
      const produtos = window.sistemaEnderecamento.enderecosOcupados[endereco];
      const produtoArray = Array.isArray(produtos) ? produtos : [produtos];
      const produto = produtoArray.find(p => p.coddv === coddv);

      if (produto && (produto.dataAlocacao || produto.data_alocacao)) {
        const dataStr = produto.dataAlocacao || produto.data_alocacao;
        if (dataStr.includes('/')) {
          return dataStr;
        }
        try {
          const data = new Date(dataStr);
          return data.toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
        } catch (e) {
          return dataStr;
        }
      }
    }
  }

  // Se não encontrou data específica, retornar data atual como fallback
  return 'Data não disponível';
}

function atualizarBotoesMobileBusca(produtoCarregado) {
  // Aplicar apenas no mobile
  if (!isMobileDevice()) {
    return;
  }
  
  const btnBuscar = $('#btnBuscar');
  const btnLimpar = $('#btnLimpar');
  
  if (!btnBuscar || !btnLimpar) {
    console.warn('Botões não encontrados');
    return;
  }
  
  console.log('📱 Atualizando botões mobile - produto carregado:', produtoCarregado);
  
  if (produtoCarregado) {
    // Produto buscado - mostrar apenas "Limpar"
    btnBuscar.classList.add('hide');
    btnLimpar.classList.remove('hide');
    btnLimpar.style.width = '100%';
    btnLimpar.style.flex = '1';
  } else {
    // Nenhum produto - mostrar ambos
    btnBuscar.classList.remove('hide');
    btnLimpar.classList.remove('hide');
    btnLimpar.style.width = '';
    btnLimpar.style.flex = '';
  }
}

function exibirProduto(produto) {
  if (!produto) {
    $('#produtoInfo').classList.add('hide');
    updateMobileActionButtons(null); // Hide mobile buttons
    atualizarBotoesMobileBusca(false); // Mostrar botões de busca novamente
    return;
  }

  produtoAtual = produto;
  const status = obterStatusProduto(produto.CODDV);
  exibirProdutoComStatus(produto, status);
}

function exibirProdutoComStatus(produto, status) {
  if (!produto) {
    $('#produtoInfo').classList.add('hide');
    updateMobileActionButtons(null);
    atualizarBotoesMobileBusca(false);
    return;
  }

  produtoAtual = produto;

  // Atualizar botões mobile - esconder "Buscar", mostrar apenas "Limpar"
  atualizarBotoesMobileBusca(true);

  // Atualizar informações do produto
  $('#produtoInfo .produto-coddv').textContent = `CODDV: ${produto.CODDV}`;
  $('#produtoInfo .produto-desc').textContent = produto.DESC;
  $('#produtoInfo .produto-barras').textContent = `Código de Barras: ${produto.BARRAS}`;

  // Status do produto
  const statusElement = $('#produtoInfo .produto-status');
  const enderecoElement = $('#produtoInfo .produto-endereco');
  const acoesElement = $('#produtoAcoes');

  if (status.alocado) {
    statusElement.textContent = 'ALOCADO';
    statusElement.className = 'produto-status status-alocado';

    if (status.multiplos) {
      // Ordenar endereços em ordem crescente
      const enderecosOrdenados = [...status.enderecos].sort();

      enderecoElement.innerHTML = `
        <strong>Endereços atuais (${enderecosOrdenados.length}):</strong><br>
        ${enderecosOrdenados.map(end => {
        const info = formatarInfoEndereco(end);
        const dataAlocacao = obterDataAlocacao(produtoAtual.CODDV, end);
        return `• ${end} <small>(${info.formatado})</small><br>
                   <span class="data-alocacao">📅 ${dataAlocacao}</span>`;
      }).join('<br>')}
      `;
    } else {
      const info = formatarInfoEndereco(status.endereco);
      const dataAlocacao = obterDataAlocacao(produtoAtual.CODDV, status.endereco);
      enderecoElement.innerHTML = `
        <strong>Endereço atual:</strong> ${status.endereco}<br>
        <small>${info.formatado}</small><br>
        <span class="data-alocacao">📅 ${dataAlocacao}</span>
      `;
    }

    enderecoElement.style.display = 'block';

    // Mostrar botões de transferir, adicionar mais e desalocar
    $('#btnTransferir').classList.remove('hide');
    $('#btnAdicionarMais').classList.remove('hide');
    $('#btnDesalocar').classList.remove('hide');
    $('#btnAlocar').classList.add('hide');

  } else {
    statusElement.textContent = 'NÃO ALOCADO';
    statusElement.className = 'produto-status status-disponivel';
    enderecoElement.style.display = 'none';

    // Mostrar apenas botão de alocar
    $('#btnAlocar').classList.remove('hide');
    $('#btnTransferir').classList.add('hide');
    $('#btnAdicionarMais').classList.add('hide');
    $('#btnDesalocar').classList.add('hide');
  }

  $('#produtoInfo').classList.remove('hide');
  acoesElement.classList.remove('hide');

  // Update mobile action buttons - passar o status para garantir consistência
  updateMobileActionButtons(produto, status);
  
  // Atualizar botões de busca no mobile (esconder "Buscar", mostrar apenas "Limpar")
  atualizarBotoesMobileBusca(true);
}

function atualizarInterfaceOperacao() {
  const operacao = document.querySelector('input[name="operacao"]:checked').value;
  const enderecoField = $('#enderecoField');

  // Ocultar campo de endereço inline - agora usamos popup
  enderecoField.style.display = 'none';
}

async function executarOperacao() {
  if (!produtoAtual) {
    showToast('Selecione um produto para continuar.', 'warning');
    return;
  }

  const operacao = document.querySelector('input[name="operacao"]:checked').value;
  const status = obterStatusProduto(produtoAtual.CODDV);

  if (operacao === 'alocacao') {
    // Verificar se produto já está alocado
    if (status.alocado) {
      // Produto já alocado, permitir transferência
      const transferir = await customConfirm(`Este produto já está alocado no endereço: ${status.endereco}\n\nDeseja transferi-lo para outro endereço?`, 'Produto Alocado');
      if (transferir) {
        abrirPopupEnderecos();
      }
    } else {
      // Produto não alocado, abrir popup para seleção
      abrirPopupEnderecos();
    }

  } else if (operacao === 'desalocacao') {
    if (!status.alocado) {
      showToast('Este produto não está alocado em nenhum endereço.', 'warning');
      return;
    }

    try {
      const enderecoAnterior = status.endereco;

      // Usar sistema de endereçamento otimizado
      if (window.sistemaEnderecamento) {
        await window.sistemaEnderecamento.desalocarProduto(enderecoAnterior, produtoAtual.CODDV);
      }

      // Atualizar sistema legado
      delete enderecosProdutos[produtoAtual.CODDV];

      adicionarHistorico('DESALOCAÇÃO', produtoAtual, enderecoAnterior, null);

      const info = formatarInfoEndereco(enderecoAnterior);
      showToast(`Operação concluída com sucesso.\n\nProduto: ${produtoAtual.DESC}\nEndereço: ${enderecoAnterior}\nLocalização: ${info.formatado}`, 'success');

    } catch (error) {
      showToast('Erro durante a operação: ' + error.message, 'error');
      return;
    }
  }

  // Salvar no localStorage
  salvarLocalStorageSeguro('enderecos_produtos', JSON.stringify(enderecosProdutos));

  // Atualizar exibição do produto
  exibirProduto(produtoAtual);

  // Incrementar contador global
  if (window.contadorGlobal) {
    window.contadorGlobal.incrementar();
  }
}

async function adicionarHistorico(tipo, produto, enderecoAnterior, enderecoNovo) {
  const agora = new Date();
  const timestamp = formatarDataHoraBrasiliaBr(agora);
  const dataHoraBrasiliaSql = formatarDataHoraBrasiliaSql(agora);

  // Obter dados da sessão
  const sessionData = JSON.parse(localStorage.getItem('enderecamento_fraldas_session') || '{}');

  const historico = {
    timestamp,
    tipo,
    coddv: produto.CODDV,
    desc: produto.DESC,
    enderecoAnterior,
    enderecoNovo,
    usuario: sessionData.usuario || 'Sistema',
    matricula: sessionData.matricula || null,
    cd: sessionData.nomeCD || 'N/A'
  };

  // Tentar salvar no Supabase primeiro
  if (window.sistemaEnderecamento && window.sistemaEnderecamento.isConnected && !window.sistemaEnderecamento.modoOffline) {
    try {
      showSyncIndicator('Salvando no servidor...', 'info');

      await window.sistemaEnderecamento.client
        .from('historico_enderecamento_fraldas')
        .insert([{
          tipo: tipo,
          endereco: enderecoNovo || enderecoAnterior,
          endereco_origem: enderecoAnterior,
          endereco_destino: enderecoNovo,
          coddv: produto.CODDV,
          descricao_produto: produto.DESC,
          usuario: sessionData.usuario || 'Sistema',
          matricula: sessionData.matricula,
          cd: window.sistemaEnderecamento.cd,
          data_hora: dataHoraBrasiliaSql
        }]);

      showSyncIndicator('✅ Salvo no servidor', 'success');
      console.log('✅ Histórico salvo no Supabase:', tipo, produto.CODDV);
    } catch (error) {
      console.error('❌ Erro ao salvar histórico no Supabase:', error);
      showSyncIndicator('⚠️ Salvo localmente', 'error');
      // Continuar com localStorage como fallback
    }
  }

  // Salvar no localStorage (backup/fallback)
  let historicoOperacoes = JSON.parse(localStorage.getItem('historico_operacoes') || '[]');
  historicoOperacoes.unshift(historico); // Adicionar no início

  // Manter apenas os últimos 50 registros
  if (historicoOperacoes.length > 50) {
    historicoOperacoes = historicoOperacoes.slice(0, 50);
  }

  salvarLocalStorageSeguro('historico_operacoes', JSON.stringify(historicoOperacoes));
}

function obterPartesDataHoraBrasilia(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  return formatter.formatToParts(date).reduce((acc, part) => {
    if (part.type !== 'literal') {
      acc[part.type] = part.value;
    }
    return acc;
  }, {});
}

function formatarDataHoraBrasiliaBr(date = new Date()) {
  const p = obterPartesDataHoraBrasilia(date);
  return `${p.day}/${p.month}/${p.year} ${p.hour}:${p.minute}:${p.second}`;
}

function formatarDataHoraBrasiliaSql(date = new Date()) {
  const p = obterPartesDataHoraBrasilia(date);
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second}`;
}

// Função para mostrar indicador de sincronização
function showSyncIndicator(message, type = 'info') {
  // Remover indicador anterior se existir
  const existing = document.querySelector('.sync-indicator');
  if (existing) {
    existing.remove();
  }

  // Criar novo indicador
  const indicator = document.createElement('div');
  indicator.className = `sync-indicator ${type}`;
  indicator.textContent = message;

  document.body.appendChild(indicator);

  // Mostrar com animação
  setTimeout(() => {
    indicator.classList.add('show');
  }, 100);

  // Remover após 3 segundos
  setTimeout(() => {
    indicator.classList.remove('show');
    setTimeout(() => {
      indicator.remove();
    }, 300);
  }, 3000);
}

/* ===== Event Handlers ===== */
async function buscarProdutoHandler() {
  const tokenBuscaAtual = ++buscaEmAndamentoToken;
  const codigoElement = $('#codigoProduto');

  if (!codigoElement) {
    console.warn('Elemento codigoProduto não encontrado no DOM');
    return;
  }

  const codigo = codigoElement.value.trim();

  if (!codigo) {
    showToast('Informe o código do produto para continuar.', 'warning');
    return;
  }

  const produto = buscarProduto(codigo);

  if (!produto) {
    showToast('Produto não localizado na base de dados.', 'warning');
    exibirProduto(null);
    return;
  }

  // ESTRATÉGIA OTIMIZADA PARA INTERNET LENTA:
  // 1. Mostrar resultado do cache imediatamente (resposta rápida)
  // 2. Em paralelo, verificar no banco e atualizar se necessário
  
  const statusCache = obterStatusProduto(produto.CODDV);
  
  // Exibir imediatamente com dados do cache (rápido)
  exibirProdutoComStatus(produto, statusCache);
  
  // Se houver endereço de destino selecionado, prosseguir com alocação
  if (enderecoDestino) {
    verificarAlocacaoEnderecoDestino(produto);
  }
  
  // Em paralelo, verificar no banco (sem bloquear a interface)
  if (window.sistemaEnderecamento && window.sistemaEnderecamento.verificarStatusProdutoRealTime) {
    verificarStatusEmBackground(produto, statusCache, tokenBuscaAtual);
  }
}

/**
 * Verifica o status do produto em background e atualiza a interface se necessário
 * Não bloqueia a interface - ideal para internet lenta
 */
async function verificarStatusEmBackground(produto, statusCache, tokenBusca) {
  const syncIndicator = $('#syncIndicator');
  
  try {
    // Busca mais recente já mudou; não atualizar interface com resultado antigo
    if (tokenBusca !== buscaEmAndamentoToken) return;

    console.log('🔄 [Background] Verificando status atualizado...');
    
    // Mostrar indicador de sincronização
    if (syncIndicator) syncIndicator.classList.add('show');
    
    // Timeout de 5 segundos para não travar em conexões muito lentas
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout')), 5000)
    );
    
    // Corrida entre a requisição e o timeout
    const statusReal = await Promise.race([
      window.sistemaEnderecamento.verificarStatusProdutoRealTime(produto.CODDV),
      timeoutPromise
    ]);

    // Ignorar resposta atrasada de uma busca antiga
    if (tokenBusca !== buscaEmAndamentoToken) return;
    
    console.log('✅ [Background] Status obtido:', statusReal);
    
    // Verificar se houve mudança no status
    const houveMudanca = 
      statusCache.alocado !== statusReal.alocado ||
      statusCache.enderecos.length !== statusReal.enderecos.length ||
      !statusCache.enderecos.every(e => statusReal.enderecos.includes(e));
    
    if (houveMudanca) {
      console.log('🔄 [Background] Status diferente do cache! Atualizando interface...');
      
      // Atualizar a interface silenciosamente
      exibirProdutoComStatus(produto, statusReal);
      
      // Atualizar botões mobile também
      updateMobileActionButtons(produto, statusReal);
      
      // Mostrar toast sutil informando da atualização
      if (statusReal.alocado && !statusCache.alocado) {
        showToast('⚡ Produto atualizado: agora está alocado', 'info');
      } else if (!statusReal.alocado && statusCache.alocado) {
        showToast('⚡ Produto atualizado: não está mais alocado', 'info');
      } else if (statusReal.enderecos.length !== statusCache.enderecos.length) {
        showToast(`⚡ Endereços atualizados: ${statusReal.enderecos.length} encontrado(s)`, 'info');
      }
    } else {
      console.log('✅ [Background] Status igual ao cache, sem atualização necessária');
    }
    
  } catch (error) {
    // Silenciar erro em background para não incomodar o usuário
    console.log('⚠️ [Background] Não foi possível verificar status atualizado:', error.message);
  } finally {
    // Esconder indicador de sincronização
    if (syncIndicator) syncIndicator.classList.remove('show');
  }
}

function limparCampos() {
  const codigoElement = $('#codigoProduto');
  const btnClearInput = $('#btnClearInput');
  // Invalida verificações assíncronas pendentes de buscas anteriores
  buscaEmAndamentoToken++;

  if (codigoElement) {
    codigoElement.value = '';
  }
  if (btnClearInput) {
    btnClearInput.classList.add('hide');
  }

  produtoAtual = null;
  exibirProduto(null);

  // Hard reset de estado de modais/backdrops mobile para evitar tela "travada"
  if (isMobileDevice()) {
    try {
      if (typeof mobileModalManager?.closeAllModals === 'function') {
        mobileModalManager.closeAllModals();
      }
    } catch (error) {
      console.warn('⚠️ Falha ao fechar modais mobile no limpar:', error);
    }

    ['mobileAddressModal', 'mobileTransferModal', 'mobileDeallocationModal', 'mobileConfirmationModal']
      .forEach((modalId) => {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.add('hide');
      });

    document.querySelectorAll('.mobile-modal-backdrop').forEach((el) => el.remove());
    document.body.classList.remove('modal-open');
  }

  $('#codigoProduto').focus();
}

// Função para alocar produto
async function alocarProduto() {
  if (!produtoAtual) {
    showToast('Selecione um produto para continuar.', 'warning');
    return;
  }

  // Redirecionar para a página de endereços com parâmetro do produto
  const params = new URLSearchParams({
    produto: produtoAtual.CODDV,
    desc: produtoAtual.DESC,
    acao: 'alocar'
  });

  window.location.href = `enderecos.html?${params.toString()}`;
}

// Função para transferir produto
function transferirProduto() {
  if (!produtoAtual) {
    showToast('Selecione um produto para continuar.', 'warning');
    return;
  }

  const status = obterStatusProduto(produtoAtual.CODDV);
  if (!status.alocado) {
    showToast('Este produto não está alocado em nenhum endereço.', 'warning');
    return;
  }

  // Se produto está em múltiplos endereços, mostrar popup de seleção
  if (status.multiplos) {
    abrirPopupTransferencia(status.enderecos);
  } else {
    // Produto em apenas um endereço - ir direto para seleção de destino
    redirecionarParaTransferencia(status.endereco);
  }
}

function abrirPopupTransferencia(enderecos) {
  if (!produtoAtual) return;

  if (isMobileDevice()) {
    // Use mobile modal for transfer selection
    openMobileTransferModal(enderecos);
    return;
  }

  // Desktop version
  // Atualizar informações do produto no popup
  $('#popupTransferenciaProdutoDesc').textContent = produtoAtual.DESC;
  $('#popupTransferenciaProdutoCoddv').textContent = produtoAtual.CODDV;

  // Carregar endereços onde o produto está alocado
  carregarEnderecosTransferencia(enderecos);

  // Mostrar popup
  $('#popupTransferencia').classList.remove('hide');
}

function fecharPopupTransferencia() {
  $('#popupTransferencia').classList.add('hide');

  // Limpar seleção
  document.querySelectorAll('.endereco-transferencia-item').forEach(item => {
    item.classList.remove('selecionado');
  });
}

function carregarEnderecosTransferencia(enderecos) {
  const container = $('#enderecosTransferenciaLista');

  container.innerHTML = enderecos.map(endereco => {
    const info = formatarInfoEndereco(endereco);
    const produtosNoEndereco = window.sistemaEnderecamento ?
      window.sistemaEnderecamento.obterProdutosNoEndereco(endereco) : [];

    const outrosProdutos = produtosNoEndereco.filter(p => p.coddv !== produtoAtual.CODDV);

    return `
      <div class="endereco-transferencia-item" data-endereco="${endereco}" onclick="selecionarEnderecoTransferencia('${endereco}')">
        <div class="endereco-header-transferencia">
          <div class="endereco-codigo-transferencia">${endereco}</div>
          <div class="endereco-info-transferencia">${info.formatado}</div>
        </div>
        ${outrosProdutos.length > 0 ? `
          <div class="outros-produtos">
            <strong>Outros produtos neste endereço:</strong>
            ${outrosProdutos.map(p => `<div class="outro-produto">• ${p.coddv} - ${p.descricaoProduto}</div>`).join('')}
          </div>
        ` : ''}
        <div class="endereco-acao-transferencia">
          <button class="btn btn-sm btn-primary">Transferir deste endereço</button>
        </div>
      </div>
    `;
  }).join('');
}

function selecionarEnderecoTransferencia(endereco) {
  const info = formatarInfoEndereco(endereco);

  customConfirm(`Confirma a transferência do produto?\n\nOrigem: ${endereco}\nLocalização: ${info.formatado}\nProduto: ${produtoAtual.DESC}\n\nPróximo passo: seleção do endereço de destino.`, 'Confirmar Transferência').then(confirmado => {
    if (confirmado) {
      redirecionarParaTransferencia(endereco);
      fecharPopupTransferencia();
    }
  });
}

function redirecionarParaTransferencia(enderecoOrigem) {
  // Redirecionar para a página de endereços com parâmetro do produto
  const params = new URLSearchParams({
    produto: produtoAtual.CODDV,
    desc: produtoAtual.DESC,
    enderecoAtual: enderecoOrigem,
    acao: 'transferir'
  });

  window.location.href = `enderecos.html?${params.toString()}`;
}

// Função para adicionar produto em mais endereços
function adicionarMaisEnderecos() {
  if (!produtoAtual) {
    showToast('Selecione um produto para continuar.', 'warning');
    return;
  }

  const status = obterStatusProduto(produtoAtual.CODDV);
  if (!status.alocado) {
    showToast('Este produto deve estar alocado em pelo menos um endereço.', 'warning');
    return;
  }

  // Redirecionar para a página de endereços com parâmetro do produto
  const params = new URLSearchParams({
    produto: produtoAtual.CODDV,
    desc: produtoAtual.DESC,
    enderecoAtual: status.endereco,
    acao: 'adicionar_mais'
  });

  window.location.href = `enderecos.html?${params.toString()}`;
}

// Função para abrir popup de buscar endereços - redireciona para enderecos.html
function abrirPopupBuscarEnderecos() {
  console.log('🔍 abrirPopupBuscarEnderecos chamada - redirecionando para enderecos.html');

  // Fechar dropdown primeiro
  fecharDropdown();

  // Verificar se há produto selecionado
  if (!produtoAtual) {
    showToast('Selecione um produto para continuar.', 'warning');
    return;
  }

  // Verificar se produto está alocado
  const status = obterStatusProduto(produtoAtual.CODDV);
  if (!status.alocado) {
    showToast('Este produto deve estar alocado em pelo menos um endereço.', 'warning');
    return;
  }

  // Redirecionar para a página de endereços com parâmetro para buscar endereços
  const params = new URLSearchParams({
    produto: produtoAtual.CODDV,
    desc: produtoAtual.DESC,
    enderecoAtual: status.endereco,
    acao: 'buscar_enderecos'
  });

  window.location.href = `enderecos.html?${params.toString()}`;
}


// Função para toggle do dropdown alocar
function toggleDropdownAlocar() {
  const dropdown = document.getElementById('dropdownAlocar');
  if (dropdown) {
    dropdown.classList.toggle('hide');

    // Fechar outros dropdowns
    document.querySelectorAll('.dropdown-menu:not(#dropdownAlocar)').forEach(menu => {
      menu.classList.add('hide');
    });
  }
}

// Função para alocar em lista de endereços
async function alocarEmListaEnderecos() {
  console.log('📋 alocarEmListaEnderecos chamada');

  if (!produtoAtual) {
    showToast('Selecione um produto para continuar.', 'warning');
    return;
  }

  const status = obterStatusProduto(produtoAtual.CODDV);
  if (status.alocado) {
    showToast('Este produto já está alocado. Use "Adicionar Mais" ou "Transferir".', 'warning');
    return;
  }

  // Redirecionar para a página de endereços para alocação
  const params = new URLSearchParams({
    produto: produtoAtual.CODDV,
    desc: produtoAtual.DESC,
    acao: 'alocar',
    filtro: 'disponivel'
  });

  window.location.href = `enderecos.html?${params.toString()}`;
}

// Função para alocar buscando endereços
async function alocarBuscandoEnderecos() {
  console.log('🔍 alocarBuscandoEnderecos chamada');

  if (!produtoAtual) {
    showToast('Selecione um produto para continuar.', 'warning');
    return;
  }

  const status = obterStatusProduto(produtoAtual.CODDV);
  if (status.alocado) {
    showToast('Este produto já está alocado. Use "Adicionar Mais" ou "Transferir".', 'warning');
    return;
  }

  // Redirecionar para a página de endereços para buscar e alocar
  const params = new URLSearchParams({
    produto: produtoAtual.CODDV,
    desc: produtoAtual.DESC,
    acao: 'buscar_alocar'
  });

  window.location.href = `enderecos.html?${params.toString()}`;
}

// Função para toggle do dropdown adicionar mais
function toggleDropdownAdicionarMais() {
  const dropdown = document.getElementById('dropdownAdicionarMais');
  if (dropdown) {
    dropdown.classList.toggle('hide');

    // Fechar outros dropdowns
    document.querySelectorAll('.dropdown-menu:not(#dropdownAdicionarMais)').forEach(menu => {
      menu.classList.add('hide');
    });
  }
}

// Função para fechar dropdown
function fecharDropdown() {
  document.querySelectorAll('.dropdown-menu').forEach(menu => {
    menu.classList.add('hide');
  });
}

// Função para desalocar produto
async function desalocarProduto() {
  if (!produtoAtual) {
    showToast('Nenhum produto selecionado', 'warning');
    return;
  }

  const status = obterStatusProduto(produtoAtual.CODDV);
  if (!status.alocado) {
    showToast('Produto não está alocado', 'warning');
    return;
  }

  // Se produto está em múltiplos endereços, mostrar popup de seleção
  if (status.multiplos) {
    abrirPopupDesalocacao(status.enderecos);
  } else {
    // Produto em apenas um endereço - confirmar desalocação
    const confirmado = await customConfirm(`Deseja realmente desalocar o produto?\n\nProduto: ${produtoAtual.DESC}\nEndereço atual: ${status.endereco}`, 'Confirmar Desalocação');
    if (!confirmado) {
      return;
    }

    await executarDesalocacao(status.endereco);
  }
}

function abrirPopupDesalocacao(enderecos) {
  if (!produtoAtual) return;

  // Atualizar informações do produto no popup
  $('#popupDesalocacaoProdutoDesc').textContent = produtoAtual.DESC;
  $('#popupDesalocacaoProdutoCoddv').textContent = produtoAtual.CODDV;

  // Carregar endereços onde o produto está alocado
  carregarEnderecosDesalocacao(enderecos);

  // Mostrar popup
  $('#popupDesalocacao').classList.remove('hide');
}

function fecharPopupDesalocacao() {
  $('#popupDesalocacao').classList.add('hide');

  // Limpar seleção
  document.querySelectorAll('.endereco-desalocacao-item').forEach(item => {
    item.classList.remove('selecionado');
  });
}

function carregarEnderecosDesalocacao(enderecos) {
  const container = $('#enderecosDesalocacaoLista');

  container.innerHTML = enderecos.map(endereco => {
    const info = formatarInfoEndereco(endereco);
    const produtosNoEndereco = window.sistemaEnderecamento ?
      window.sistemaEnderecamento.obterProdutosNoEndereco(endereco) : [];

    const outrosProdutos = produtosNoEndereco.filter(p => p.coddv !== produtoAtual.CODDV);

    return `
      <div class="endereco-desalocacao-item" data-endereco="${endereco}" onclick="selecionarEnderecoDesalocacao('${endereco}')">
        <div class="endereco-header-desalocacao">
          <div class="endereco-codigo-desalocacao">${endereco}</div>
          <div class="endereco-info-desalocacao">${info.formatado}</div>
        </div>
        ${outrosProdutos.length > 0 ? `
          <div class="outros-produtos">
            <strong>Outros produtos neste endereço:</strong>
            ${outrosProdutos.map(p => `<div class="outro-produto">• ${p.coddv} - ${p.descricaoProduto}</div>`).join('')}
          </div>
        ` : ''}
        <div class="endereco-acao-desalocacao">
          <button class="btn btn-sm btn-danger">Desalocar deste endereço</button>
        </div>
      </div>
    `;
  }).join('');
}

async function selecionarEnderecoDesalocacao(endereco) {
  const info = formatarInfoEndereco(endereco);

  const confirmado = await customConfirm(`Confirma desalocação do endereço:\n\n${endereco}\n(${info.formatado})\n\nProduto: ${produtoAtual.DESC}`, 'Desalocar Endereço');
  if (confirmado) {
    await executarDesalocacao(endereco);
    fecharPopupDesalocacao();
  }
}

async function desalocarDeTodos() {
  const status = obterStatusProduto(produtoAtual.CODDV);

  const confirmado = await customConfirm(`Confirma desalocação de TODOS os endereços?\n\nProduto: ${produtoAtual.DESC}\nEndereços: ${status.enderecos.length}\n\n${status.enderecos.join('\n')}`, 'Desalocar de Todos');

  if (confirmado) {
    for (const endereco of status.enderecos) {
      await executarDesalocacao(endereco, false); // false = não atualizar interface a cada desalocação
    }

    // Atualizar interface apenas uma vez no final
    exibirProduto(produtoAtual);

    showToast(`Desalocação realizada com sucesso!\nProduto removido de ${status.enderecos.length} endereços.`, 'success');

    fecharPopupDesalocacao();
  }
}

async function executarDesalocacao(endereco, atualizarInterface = true) {
  try {
    // Usar sistema de endereçamento otimizado
    if (window.sistemaEnderecamento) {
      await window.sistemaEnderecamento.desalocarProduto(endereco, produtoAtual.CODDV);
    }

    // Atualizar sistema legado apenas se for o último endereço
    const todosEnderecos = obterTodosEnderecosProduto(produtoAtual.CODDV);
    if (todosEnderecos.length <= 1) {
      delete enderecosProdutos[produtoAtual.CODDV];
    }

    adicionarHistorico('DESALOCAÇÃO', produtoAtual, endereco, null);

    if (atualizarInterface) {
      const info = formatarInfoEndereco(endereco);
      showToast(`Desalocação realizada com sucesso!\nProduto: ${produtoAtual.DESC}\nEndereço removido: ${endereco}\nLocalização: ${info.formatado}`, 'success');

      // Atualizar exibição do produto
      exibirProduto(produtoAtual);
    }

    // Salvar no localStorage
    salvarLocalStorageSeguro('enderecos_produtos', JSON.stringify(enderecosProdutos));

    // Incrementar contador global
    if (window.contadorGlobal) {
      window.contadorGlobal.incrementar();
    }

  } catch (error) {
    showToast('Erro na desalocação: ' + error.message, 'error');
  }
}

async function cadastroRapidoEndereco() {
  const endereco = obterEnderecoCompleto();

  if (!endereco) {
    showToast('Por favor, selecione todas as partes do endereço primeiro (Zona, Coluna e Nível)', 'warning');
    return;
  }

  if (!window.sistemaEnderecamento) {
    showToast('Sistema de endereçamento não disponível', 'error');
    return;
  }

  // Validar formato
  if (!window.sistemaEnderecamento.validarFormatoEndereco(endereco)) {
    showToast('Endereço inválido. Verifique as partes selecionadas.', 'warning');
    return;
  }

  // Verificar se já existe
  if (window.sistemaEnderecamento.enderecosCadastrados[endereco]) {
    showToast('Este endereço já está cadastrado no sistema', 'warning');
    return;
  }

  // Solicitar descrição
  const descricao = prompt('Digite uma descrição para o endereço:', 'Endereço de produto');

  if (descricao === null) {
    return; // Usuário cancelou
  }

  try {
    await window.sistemaEnderecamento.cadastrarEndereco(endereco, descricao || 'Endereço cadastrado via cadastro rápido');

    const info = formatarInfoEndereco(endereco);
    showToast(`Endereço cadastrado com sucesso!\n\nEndereço: ${endereco}\nLocalização: ${info.formatado}\n\nAgora você pode alocar produtos neste endereço.`, 'success');
    atualizarEnderecoGeradoInline(); // Atualizar cor do preview
  } catch (error) {
    showToast('Erro ao cadastrar endereço: ' + error.message, 'error');
  }
}

function mostrarSugestoesEndereco(valor) {
  if (!window.sistemaEnderecamento || valor.length < 3) {
    fecharSugestoesEndereco();
    return;
  }

  const enderecosCadastrados = Object.keys(window.sistemaEnderecamento.enderecosCadastrados);
  const sugestoes = enderecosCadastrados
    .filter(endereco => endereco.includes(valor.toUpperCase()))
    .slice(0, 5);

  if (sugestoes.length === 0) {
    fecharSugestoesEndereco();
    return;
  }

  // Criar ou atualizar lista de sugestões
  let listaSugestoes = document.getElementById('sugestoesEndereco');
  if (!listaSugestoes) {
    listaSugestoes = document.createElement('div');
    listaSugestoes.id = 'sugestoesEndereco';
    listaSugestoes.className = 'sugestoes-endereco';
    $('#enderecoField').appendChild(listaSugestoes);
  }

  listaSugestoes.innerHTML = sugestoes.map(endereco => {
    const info = window.sistemaEnderecamento.enderecosCadastrados[endereco];
    const ocupado = window.sistemaEnderecamento.enderecosOcupados[endereco];

    return `
      <div class="sugestao-item ${ocupado ? 'ocupado' : 'disponivel'}" data-endereco="${endereco}">
        <div class="sugestao-endereco">${endereco}</div>
        <div class="sugestao-info">
          <span class="sugestao-descricao">${info.descricao}</span>
          <span class="sugestao-status">${ocupado ? 'OCUPADO' : 'DISPONÍVEL'}</span>
        </div>
      </div>
    `;
  }).join('');

  // Adicionar event listeners para as sugestões
  listaSugestoes.querySelectorAll('.sugestao-item').forEach(item => {
    item.addEventListener('click', () => {
      const endereco = item.dataset.endereco;
      const enderecoElement = $('#endereco');

      if (enderecoElement) {
        enderecoElement.value = endereco;
      }

      fecharSugestoesEndereco();
    });
  });
}

function fecharSugestoesEndereco() {
  const listaSugestoes = document.getElementById('sugestoesEndereco');
  if (listaSugestoes) {
    listaSugestoes.remove();
  }
}

function atualizarSugestaoAtiva(itens, indiceAtivo) {
  itens.forEach((item, index) => {
    if (index === indiceAtivo) {
      item.classList.add('ativo');
      item.scrollIntoView({ block: 'nearest' });
    } else {
      item.classList.remove('ativo');
    }
  });
}

// Função para inicializar os campos de endereço
function inicializarCamposEndereco() {
  // Popular zona (PF01 a PF15) - apenas se o elemento existir
  const zonaSelect = document.getElementById('zonaInline');
  if (zonaSelect) {
    for (let i = 1; i <= 15; i++) {
      const option = document.createElement('option');
      option.value = i.toString().padStart(2, '0');
      option.textContent = `PF${i.toString().padStart(2, '0')}`;
      zonaSelect.appendChild(option);
    }
  }

  // Popular coluna (001 a 019) - apenas se o elemento existir
  const colunaSelect = document.getElementById('colunaInline');
  if (colunaSelect) {
    for (let i = 1; i <= 19; i++) {
      const option = document.createElement('option');
      option.value = i.toString().padStart(3, '0');
      option.textContent = i.toString().padStart(3, '0');
      colunaSelect.appendChild(option);
    }
  }

  // Popular filtro de zona no popup - apenas se o elemento existir
  const filtroZonaPopup = document.getElementById('filtroZonaPopup');
  if (filtroZonaPopup) {
    for (let i = 1; i <= 15; i++) {
      const option = document.createElement('option');
      option.value = i.toString().padStart(2, '0');
      option.textContent = `PF${i.toString().padStart(2, '0')}`;
      filtroZonaPopup.appendChild(option);
    }
  }

  // Inicializar preview apenas se a função existir
  if (typeof atualizarEnderecoGeradoInline === 'function') {
    atualizarEnderecoGeradoInline();
  }
}

// Funções do Popup de Endereços
function abrirPopupEnderecos() {
  if (!produtoAtual) return;

  // Redirecionar para a página de endereços com filtro para mostrar apenas disponíveis
  const params = new URLSearchParams({
    produto: produtoAtual.CODDV,
    desc: produtoAtual.DESC,
    acao: 'alocar',
    filtro: 'disponivel' // Filtrar apenas endereços disponíveis
  });

  window.location.href = `enderecos.html?${params.toString()}`;
}

// Função para abrir popup de endereços para adicionar mais alocações
function abrirPopupEnderecosParaAdicionar() {
  console.log('🔧 abrirPopupEnderecosParaAdicionar chamada');

  if (!produtoAtual) {
    console.log('❌ Produto atual não encontrado no popup');
    return;
  }

  console.log('📝 Atualizando informações do produto no popup...');

  // Atualizar informações do produto no popup
  const descElement = document.getElementById('popupProdutoDesc');
  const coddvElement = document.getElementById('popupProdutoCoddv');

  if (descElement && coddvElement) {
    descElement.textContent = produtoAtual.DESC;
    coddvElement.textContent = produtoAtual.CODDV;
    console.log('✅ Informações do produto atualizadas');
  } else {
    console.log('❌ Elementos do popup não encontrados');
  }

  // Carregar endereços disponíveis (excluindo os já ocupados pelo produto)
  console.log('📋 Carregando endereços disponíveis...');
  carregarEnderecosDisponiveisParaAdicionar();

  // Mostrar popup
  const popup = document.getElementById('popupEnderecos');
  if (popup) {
    popup.classList.remove('hide');
    console.log('✅ Popup exibido');
  } else {
    console.log('❌ Popup não encontrado');
  }
}

function carregarEnderecosDisponiveisParaAdicionar() {
  console.log('📋 carregarEnderecosDisponiveisParaAdicionar chamada');

  if (!window.sistemaEnderecamento) {
    console.log('❌ Sistema de endereçamento não disponível');
    const container = document.getElementById('enderecosDisponiveisLista');
    if (container) {
      container.innerHTML = `
        <div class="empty-enderecos">
          <div class="empty-enderecos-icon">⚠️</div>
          <div>Sistema de endereçamento não disponível</div>
        </div>
      `;
    }
    return;
  }

  console.log('✅ Sistema de endereçamento disponível');

  const enderecosDisponiveis = window.sistemaEnderecamento.listarEnderecosDisponiveis();
  const enderecosOcupadosPeloProduto = obterTodosEnderecosProduto(produtoAtual.CODDV);

  console.log('📊 Endereços disponíveis:', enderecosDisponiveis.length);
  console.log('📊 Endereços ocupados pelo produto:', enderecosOcupadosPeloProduto);

  // Filtrar endereços que não estão ocupados pelo produto atual
  const enderecosParaAdicionar = enderecosDisponiveis.concat(
    Object.keys(window.sistemaEnderecamento.enderecosOcupados || {})
      .filter(endereco => !enderecosOcupadosPeloProduto.includes(endereco))
  );

  console.log('📊 Endereços para adicionar:', enderecosParaAdicionar.length);

  const container = document.getElementById('enderecosDisponiveisLista');

  if (!container) {
    console.log('❌ Container enderecosDisponiveisLista não encontrado');
    return;
  }

  if (enderecosParaAdicionar.length === 0) {
    console.log('⚠️ Nenhum endereço disponível para adicionar');
    container.innerHTML = `
      <div class="empty-enderecos">
        <div class="empty-enderecos-icon">📦</div>
        <div>Nenhum endereço disponível para adicionar</div>
        <small>O produto já está em todos os endereços possíveis</small>
      </div>
    `;
    return;
  }

  // Ordenar endereços
  enderecosParaAdicionar.sort();

  const enderecosHTML = enderecosParaAdicionar.map(endereco => {
    const info = formatarInfoEndereco(endereco);
    const isOcupado = window.sistemaEnderecamento.enderecosOcupados &&
      window.sistemaEnderecamento.enderecosOcupados[endereco];

    return `
      <div class="endereco-disponivel-item ${isOcupado ? 'endereco-ocupado' : ''}" 
           onclick="selecionarEnderecoParaAdicionar('${endereco}')">
        <div class="endereco-codigo">${endereco}</div>
        <div class="endereco-descricao">${info.formatado}</div>
        ${isOcupado ? '<div class="endereco-status">Ocupado por outro produto</div>' : '<div class="endereco-status">Disponível</div>'}
      </div>
    `;
  }).join('');

  container.innerHTML = enderecosHTML;
  console.log('✅ Lista de endereços carregada');
}

async function selecionarEnderecoParaAdicionar(endereco) {
  if (!produtoAtual) return;

  // Verificar se o endereço já está ocupado
  const isOcupado = window.sistemaEnderecamento.enderecosOcupados &&
    window.sistemaEnderecamento.enderecosOcupados[endereco];

  let confirmar = false;

  if (isOcupado) {
    // Endereço ocupado por outro produto - perguntar se quer adicionar junto
    const info = formatarInfoEndereco(endereco);
    confirmar = await customConfirm(
      `O endereço ${endereco} (${info.formatado}) já está ocupado por outro produto.\n\nDeseja adicionar ${produtoAtual.DESC} neste endereço também?`,
      'Endereço Ocupado'
    );
  } else {
    // Endereço disponível - confirmar alocação
    const info = formatarInfoEndereco(endereco);
    confirmar = await customConfirm(
      `Deseja adicionar o produto neste endereço?\n\nProduto: ${produtoAtual.DESC}\nEndereço: ${endereco}\n(${info.formatado})`,
      'Adicionar Produto'
    );
  }

  if (confirmar) {
    try {
      if (window.sistemaEnderecamento) {
        // Solicitar validade antes de prosseguir
        const validade = await solicitarValidade();
        if (!validade) return;

        await window.sistemaEnderecamento.adicionarProdutoEmMaisEnderecos(endereco, produtoAtual.CODDV, produtoAtual.DESC, validade);
      }

      // Atualizar sistema legado
      enderecosProdutos[produtoAtual.CODDV] = endereco;
      salvarLocalStorageSeguro('enderecos_produtos', JSON.stringify(enderecosProdutos));

      const info = formatarInfoEndereco(endereco);
      showToast(`Produto adicionado com sucesso!\n\nNovo endereço: ${endereco}\n(${info.formatado})`, 'success');

      await adicionarHistorico('ALOCAÇÃO ADICIONAL', produtoAtual, null, endereco);

      // Fechar popup e atualizar exibição
      fecharPopupEnderecos();
      exibirProduto(produtoAtual);

      // Incrementar contador global
      if (window.contadorGlobal) {
        window.contadorGlobal.incrementar();
      }

    } catch (error) {
      showToast('Erro ao adicionar produto: ' + error.message, 'error');
    }
  }
}

function fecharPopupEnderecos() {
  $('#popupEnderecos').classList.add('hide');

  // Limpar seleção
  document.querySelectorAll('.endereco-disponivel-item').forEach(item => {
    item.classList.remove('selecionado');
  });
}

function carregarEnderecosDisponiveis() {
  if (!window.sistemaEnderecamento) {
    $('#enderecosDisponiveisLista').innerHTML = `
      <div class="empty-enderecos">
        <div class="empty-enderecos-icon">⚠️</div>
        <div>Sistema de endereçamento não disponível</div>
      </div>
    `;
    return;
  }

  const enderecosDisponiveis = window.sistemaEnderecamento.listarEnderecosDisponiveis();
  const container = $('#enderecosDisponiveisLista');

  if (enderecosDisponiveis.length === 0) {
    container.innerHTML = `
      <div class="empty-enderecos">
        <div class="empty-enderecos-icon">📦</div>
        <div><strong>Nenhum endereço disponível</strong></div>
        <div>Todos os endereços estão com capacidade máxima (2 produtos)</div>
      </div>
    `;
    return;
  }

  container.innerHTML = enderecosDisponiveis.map(endereco => {
    const info = formatarInfoEndereco(endereco.endereco);
    const ocupacaoClass = endereco.produtosAlocados === 0 ? 'ocupacao-disponivel' : 'ocupacao-parcial';
    const ocupacaoTexto = endereco.produtosAlocados === 0 ? 'Vazio' : `${endereco.produtosAlocados}/2`;

    return `
      <div class="endereco-disponivel-item" data-endereco="${endereco.endereco}" onclick="selecionarEndereco('${endereco.endereco}')">
        <div class="endereco-header-popup">
          <div class="endereco-codigo-popup">${endereco.endereco}</div>
          <div class="endereco-ocupacao">
            <span class="ocupacao-badge ${ocupacaoClass}">${ocupacaoTexto}</span>
            <span>${endereco.espacoDisponivel} vaga${endereco.espacoDisponivel !== 1 ? 's' : ''}</span>
          </div>
        </div>
        <div class="endereco-descricao-popup">${endereco.descricao}</div>
        <div class="endereco-info-popup">${info.formatado}</div>
        ${endereco.produtos.length > 0 ? `
          <div class="produtos-alocados">
            <strong>Produtos já alocados:</strong>
            ${endereco.produtos.map(p => `<div class="produto-alocado">• ${p.coddv} - ${p.descricaoProduto}</div>`).join('')}
          </div>
        ` : ''}
      </div>
    `;
  }).join('');

  // Configurar filtros
  configurarFiltrosPopup(enderecosDisponiveis);
}

function configurarFiltrosPopup(enderecosOriginais) {
  const filtroTexto = $('#filtroEnderecoPopup');
  const filtroZona = $('#filtroZonaPopup');
  const filtroNivel = $('#filtroNivelPopup');

  function aplicarFiltros() {
    const textoFiltro = filtroTexto.value.toLowerCase();
    const zonaFiltro = filtroZona.value;
    const nivelFiltro = filtroNivel.value;

    const enderecosFiltrados = enderecosOriginais.filter(endereco => {
      const textoMatch = !textoFiltro ||
        endereco.endereco.toLowerCase().includes(textoFiltro) ||
        endereco.descricao.toLowerCase().includes(textoFiltro);

      const zonaMatch = !zonaFiltro || endereco.endereco.includes(`PF${zonaFiltro}`);
      const nivelMatch = !nivelFiltro || endereco.endereco.includes(`A0${nivelFiltro}`);

      return textoMatch && zonaMatch && nivelMatch;
    });

    const container = $('#enderecosDisponiveisLista');

    if (enderecosFiltrados.length === 0) {
      container.innerHTML = `
        <div class="empty-enderecos">
          <div class="empty-enderecos-icon">🔍</div>
          <div><strong>Nenhum endereço encontrado</strong></div>
          <div>Tente ajustar os filtros</div>
        </div>
      `;
      return;
    }

    container.innerHTML = enderecosFiltrados.map(endereco => {
      const info = formatarInfoEndereco(endereco.endereco);
      const ocupacaoClass = endereco.produtosAlocados === 0 ? 'ocupacao-disponivel' : 'ocupacao-parcial';
      const ocupacaoTexto = endereco.produtosAlocados === 0 ? 'Vazio' : `${endereco.produtosAlocados}/2`;

      return `
        <div class="endereco-disponivel-item" data-endereco="${endereco.endereco}" onclick="selecionarEndereco('${endereco.endereco}')">
          <div class="endereco-header-popup">
            <div class="endereco-codigo-popup">${endereco.endereco}</div>
            <div class="endereco-ocupacao">
              <span class="ocupacao-badge ${ocupacaoClass}">${ocupacaoTexto}</span>
              <span>${endereco.espacoDisponivel} vaga${endereco.espacoDisponivel !== 1 ? 's' : ''}</span>
            </div>
          </div>
          <div class="endereco-descricao-popup">${endereco.descricao}</div>
          <div class="endereco-info-popup">${info.formatado}</div>
          ${endereco.produtos.length > 0 ? `
            <div class="produtos-alocados">
              <strong>Produtos já alocados:</strong>
              ${endereco.produtos.map(p => `<div class="produto-alocado">• ${p.coddv} - ${p.descricaoProduto}</div>`).join('')}
            </div>
          ` : ''}
        </div>
      `;
    }).join('');
  }

  filtroTexto.addEventListener('input', aplicarFiltros);
  filtroZona.addEventListener('change', aplicarFiltros);
  filtroNivel.addEventListener('change', aplicarFiltros);
}

function selecionarEndereco(endereco) {
  // Remover seleção anterior
  document.querySelectorAll('.endereco-disponivel-item').forEach(item => {
    item.classList.remove('selecionado');
  });

  // Selecionar novo endereço
  const item = document.querySelector(`[data-endereco="${endereco}"]`);
  if (item) {
    item.classList.add('selecionado');
  }

  // Executar alocação
  setTimeout(() => {
    alocarProdutoNoEndereco(endereco);
  }, 300);
}

function alocarProdutoNoEndereco(endereco) {
  if (!produtoAtual || !window.sistemaEnderecamento) {
    console.error('❌ Produto ou sistema de endereçamento não disponível');
    return;
  }

  // Executar de forma assíncrona
  (async () => {
    try {
      console.log('📦 Iniciando alocação no Supabase...');
      console.log('📍 Sistema conectado:', window.sistemaEnderecamento.isConnected);
      console.log('📍 Modo offline:', window.sistemaEnderecamento.modoOffline);

      const status = obterStatusProduto(produtoAtual.CODDV);

      if (status.alocado) {
        // Verificar se o produto já está neste endereço específico
        const todosEnderecos = obterTodosEnderecosProduto(produtoAtual.CODDV);
        const jaEstaNesteEndereco = todosEnderecos.includes(endereco);

        if (jaEstaNesteEndereco) {
          showToast(`O produto já está alocado neste endereço: ${endereco}`, 'warning');
          fecharPopupEnderecos();
          return;
        }

        // Perguntar se quer transferir ou adicionar em mais um endereço
        const opcao = await customConfirm(
          `O produto já está alocado em:\n${todosEnderecos.join(', ')}\n\nDeseja:\n• OK = Adicionar neste endereço também (múltiplas alocações)\n• Cancelar = Transferir para este endereço (remover dos outros)`,
          'Produto Já Alocado'
        );

        if (opcao) {
          // Adicionar em mais um endereço (permitir múltiplos)
          console.log('➕ Adicionando produto em mais um endereço...');
          const validade = await solicitarValidade();
          if (!validade) return;
          await window.sistemaEnderecamento.adicionarProdutoEmMaisEnderecos(endereco, produtoAtual.CODDV, produtoAtual.DESC, validade);

          const info = formatarInfoEndereco(endereco);
          showToast(`Produto adicionado com sucesso!\n\nProduto: ${produtoAtual.DESC}\nNovo endereço: ${endereco}\n(${info.formatado})\n\nO produto continua nos endereços anteriores.`, 'success');

          await adicionarHistorico('ALOCAÇÃO ADICIONAL', produtoAtual, null, endereco);
        } else {
          // Transferir (remover de todos os outros endereços)
          console.log('🔄 Realizando transferência...');

          // Para transferência, usar o primeiro endereço como origem
          const enderecoOrigem = todosEnderecos[0];

          // Se há múltiplos endereços, desalocar de todos primeiro
          if (todosEnderecos.length > 1) {
            let validadeExistente = null;
            if (window.sistemaEnderecamento.cacheAlocacoes[enderecoOrigem]) {
              const aloc = window.sistemaEnderecamento.cacheAlocacoes[enderecoOrigem].find(p => p.coddv === produtoAtual.CODDV);
              if (aloc) validadeExistente = aloc.validade;
            }

            for (const enderecoAtual of todosEnderecos) {
              await window.sistemaEnderecamento.desalocarProduto(enderecoAtual, produtoAtual.CODDV);
            }

            if (!validadeExistente) {
              validadeExistente = await solicitarValidade();
              if (!validadeExistente) return;
            }

            // Depois alocar no novo endereço
            await window.sistemaEnderecamento.alocarProduto(endereco, produtoAtual.CODDV, produtoAtual.DESC, false, validadeExistente);
          } else {
            // Transferência simples
            await window.sistemaEnderecamento.transferirProduto(enderecoOrigem, endereco);
          }

          const infoDestino = formatarInfoEndereco(endereco);
          showToast(`Transferência realizada com sucesso!\n\nProduto: ${produtoAtual.DESC}\n\nPara: ${endereco}\n(${infoDestino.formatado})`, 'success');

          await adicionarHistorico('TRANSFERÊNCIA', produtoAtual, enderecoOrigem, endereco);
        }
      } else {
        // Nova alocação
        console.log('➕ Realizando nova alocação...');
        const validade = await solicitarValidade();
        if (!validade) return;
        await window.sistemaEnderecamento.alocarProduto(endereco, produtoAtual.CODDV, produtoAtual.DESC, false, validade);

        const info = formatarInfoEndereco(endereco);
        showToast(`Alocação realizada com sucesso!\n\nProduto: ${produtoAtual.DESC}\nEndereço: ${endereco}\n(${info.formatado})`, 'success');

        await adicionarHistorico('ALOCAÇÃO', produtoAtual, null, endereco);
      }

      // Atualizar sistema legado (manter compatibilidade)
      enderecosProdutos[produtoAtual.CODDV] = endereco;
      salvarLocalStorageSeguro('enderecos_produtos', JSON.stringify(enderecosProdutos));

      // Fechar popup
      fecharPopupEnderecos();

      // Atualizar exibição do produto
      exibirProduto(produtoAtual);

      // Incrementar contador global
      if (window.contadorGlobal) {
        window.contadorGlobal.incrementar();
      }

    } catch (error) {
      console.error('❌ Erro na alocação:', error);
      showToast('Erro na alocação: ' + error.message, 'error');
    }
  })();
}

/* ===== Event Listeners ===== */
function configurarEventos() {
  $('#btnBuscar').addEventListener('click', buscarProdutoHandler);
  $('#btnLimpar').addEventListener('click', limparCampos);

  // Botão de limpar dentro do input
  const btnClearInput = $('#btnClearInput');
  if (btnClearInput) {
    btnClearInput.addEventListener('click', () => {
      limparCampos();
    });
  }

  const codigoInput = $('#codigoProduto');
  if (codigoInput && btnClearInput) {
    const atualizarBotaoLimparInput = () => {
      const temValor = codigoInput.value.trim().length > 0;
      btnClearInput.classList.toggle('hide', !temValor);
    };

    codigoInput.addEventListener('input', atualizarBotaoLimparInput);
    atualizarBotaoLimparInput();
  }

  // Botões de ação do produto
  $('#btnAlocar').addEventListener('click', alocarProduto);
  $('#btnTransferir').addEventListener('click', transferirProduto);
  $('#btnDesalocar').addEventListener('click', desalocarProduto);

  // Fechar dropdowns ao clicar fora
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.btn-acao-container')) {
      document.querySelectorAll('.dropdown-menu').forEach(menu => {
        menu.classList.add('hide');
      });
    }
  });

  // Enter no campo de código para buscar
  $('#codigoProduto').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      buscarProdutoHandler();
    }
  });

  // Event listener para fechar popup ao clicar fora
  $('#popupEnderecos').addEventListener('click', (e) => {
    if (e.target.id === 'popupEnderecos') {
      fecharPopupEnderecos();
    }
  });

  // Inicializar campos de endereço
  inicializarCamposEndereco();
}

/* ===== Keyboard Shortcuts ===== */
function configurarAtalhos() {
  document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + Enter = Executar operação
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (!$('#btnExecutar').disabled) {
        executarOperacao();
      }
    }

    // Ctrl/Cmd + F = Focar no campo de busca
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
      e.preventDefault();
      $('#codigoProduto').focus();
    }

    // Ctrl/Cmd + L = Limpar campos
    if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
      e.preventDefault();
      limparCampos();
    }

    // Ctrl/Cmd + Q = Logout
    if ((e.ctrlKey || e.metaKey) && e.key === 'q') {
      e.preventDefault();
      logout();
    }

    // ESC = Focar no campo de código
    if (e.key === 'Escape') {
      e.preventDefault();
      $('#codigoProduto').focus();
    }

    // Atalhos para níveis (Alt + tecla)
    if (e.altKey && !e.ctrlKey && !e.metaKey) {
      const nivelSelect = $('#nivelInline');
      switch (e.key.toLowerCase()) {
        case 't':
          e.preventDefault();
          nivelSelect.value = 'T';
          nivelSelect.dispatchEvent(new Event('change'));
          break;
        case '1':
          e.preventDefault();
          nivelSelect.value = '1';
          nivelSelect.dispatchEvent(new Event('change'));
          break;
        case '2':
          e.preventDefault();
          nivelSelect.value = '2';
          nivelSelect.dispatchEvent(new Event('change'));
          break;
        case '4':
          e.preventDefault();
          nivelSelect.value = '4';
          nivelSelect.dispatchEvent(new Event('change'));
          break;
        case '5':
          e.preventDefault();
          nivelSelect.value = '5';
          nivelSelect.dispatchEvent(new Event('change'));
          break;
        case '6':
          e.preventDefault();
          nivelSelect.value = '6';
          nivelSelect.dispatchEvent(new Event('change'));
          break;
      }
    }
  });
}

/* ===== Inicialização ===== */
function inicializar() {
  console.log('🚀 Iniciando Sistema de Gestão de Endereçamento...');

  // Verificar autenticação primeiro
  if (!verificarAutenticacao()) {
    return; // Para a execução se não autenticado
  }

  // Verificar parâmetros da URL (fluxo de alocação vindo da busca de endereço)
  verificarParametrosURL();

  // Verificar se a base de dados foi carregada
  if (!window.DB_CADASTRO) {
    console.error('❌ Base de dados não carregada');
    showToast('Erro: Base de dados não carregada. Recarregue a página.', 'error');
    return;
  }

  console.log(`📊 Base de dados carregada: ${window.DB_CADASTRO.BASE_CADASTRO.length} produtos`);

  // Configurar funcionalidades
  configurarEventos();
  configurarAtalhos();

  // Initialize mobile action buttons
  if (isMobileDevice()) {
    console.log('📱 Dispositivo móvel detectado - inicializando botões de ação mobile');
    updateMobileActionButtons(null); // Initialize with no product
  }

  // Ouvir evento de sistema pronto para recarregar dados essenciais
  window.addEventListener('sistemaEnderecamentoPronto', () => {
    console.log('🔄 Sistema pronto, atualizando dados do produto atual');
    if (produtoAtual) exibirProduto(produtoAtual);
  });

  // Focar no primeiro campo
  $('#codigoProduto').focus();

  console.log('✅ Sistema inicializado com sucesso');
}

/* ===== Exportar Funções para Escopo Global ===== */
window.abrirPopupBuscarEnderecos = abrirPopupBuscarEnderecos;
window.toggleDropdownAdicionarMais = toggleDropdownAdicionarMais;

// Execute addition of extra address on mobile
async function executarAdicaoExtraMobile() {
  console.log('📱 Executando adição extra mobile para produto:', produtoAtual?.CODDV);

  if (!produtoAtual) {
    showMobileToast('Nenhum produto selecionado.', 'warning');
    return;
  }

  // Verificar status em tempo real antes de executar
  let status;
  if (window.sistemaEnderecamento && window.sistemaEnderecamento.verificarStatusProdutoRealTime) {
    try {
      console.log('📱 Verificando status em tempo real antes de adicionar endereço...');
      status = await window.sistemaEnderecamento.verificarStatusProdutoRealTime(produtoAtual.CODDV);
      console.log('📱 Status real do banco:', status);
    } catch (error) {
      console.warn('📱 Erro ao verificar status em tempo real, usando cache:', error);
      status = obterStatusProduto(produtoAtual.CODDV);
    }
  } else {
    status = obterStatusProduto(produtoAtual.CODDV);
  }

  // Se não estiver alocado, não permite adicionar em mais endereços
  if (!status.alocado) {
    showMobileToast('⚠️ Este produto não está mais alocado. Não é possível adicionar em mais endereços.', 'warning');
    // Atualizar a interface para refletir o status real
    exibirProdutoComStatus(produtoAtual, status);
    updateMobileActionButtons(produtoAtual, status);
    return;
  }

  // Open modal in ADD mode (distinct from allocate)
  console.log('📱 Produto alocado - abrindo modal de endereço mobile para adição extra');
  openMobileAddressModal('add');
}
window.executarAdicaoExtraMobile = executarAdicaoExtraMobile;

// Execute mobile addition (add to extra address)
async function executeMobileAddition(address, validity) {
  console.log('📱 Executando adição extra mobile para endereço:', address, 'com validade:', validity);

  try {
    // Use optimized addressing system
    if (window.sistemaEnderecamento) {
      await window.sistemaEnderecamento.adicionarProdutoEmMaisEnderecos(address, produtoAtual.CODDV, produtoAtual.DESC, validity);
    }

    // Update legacy system
    enderecosProdutos[produtoAtual.CODDV] = address;
    salvarLocalStorageSeguro('enderecos_produtos', JSON.stringify(enderecosProdutos));

    // Add to history
    await adicionarHistorico('ALOCAÇÃO ADICIONAL', produtoAtual, null, address);

    // Show success message
    const info = formatarInfoEndereco(address);
    const validityFormatted = `${validity.substring(0, 2)}/20${validity.substring(2)}`;
    showMobileToast(
      `Produto adicionado com sucesso!\n\nNovo endereço: ${address}\n(${info.formatado})\nValidade: ${validityFormatted}`,
      'success'
    );

    // Update product display
    exibirProduto(produtoAtual);

    // Increment global counter
    if (window.contadorGlobal) {
      window.contadorGlobal.incrementar();
    }

    console.log('📱 Adição extra mobile concluída com sucesso');

  } catch (error) {
    console.error('📱 Erro na adição extra mobile:', error);
    throw error;
  }
}
window.toggleDropdownAlocar = toggleDropdownAlocar;
window.alocarEmListaEnderecos = alocarEmListaEnderecos;
window.alocarBuscandoEnderecos = alocarBuscandoEnderecos;
window.fecharDropdown = fecharDropdown;

/* ===== Boot ===== */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', inicializar);
} else {
  inicializar();
}
