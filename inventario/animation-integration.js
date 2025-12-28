/**
 * Animation Integration System - Task 12.1
 * Conectar todas as animações com eventos existentes do módulo inventário
 * 
 * Requirements: 5.5 - Integração completa com funcionalidades do inventário
 */

class AnimationIntegration {
  constructor() {
    this.animationManager = null;
    this.loadingManager = null;
    this.performanceMonitor = null;
    this.eventListeners = new Map();
    this.integrationStatus = {
      animationManager: false,
      loadingManager: false,
      performanceMonitor: false,
      domEvents: false,
      formEvents: false,
      listEvents: false,
      buttonEvents: false
    };

    console.log('🔗 AnimationIntegration inicializado');
  }

  /**
   * Inicializar integração completa
   */
  async initialize() {
    console.log('🔄 Iniciando integração de animações...');

    try {
      // Aguardar managers estarem disponíveis
      await this.waitForManagers();

      // Integrar com eventos DOM
      this.integrateDOMEvents();

      // Integrar com eventos de formulário
      this.integrateFormEvents();

      // Integrar com eventos de lista
      this.integrateListEvents();

      // Integrar com eventos de botões
      this.integrateButtonEvents();

      // Integrar com eventos de carregamento
      this.integrateLoadingEvents();

      // Integrar com eventos de feedback
      this.integrateFeedbackEvents();

      // Integrar com eventos de estado
      this.integrateStateEvents();

      // Configurar observadores de mutação
      this.setupMutationObservers();

      // Aplicar animações iniciais
      this.applyInitialAnimations();

      console.log('✅ Integração de animações concluída:', this.integrationStatus);

    } catch (error) {
      console.error('❌ Erro na integração de animações:', error);
      throw error;
    }
  }

  /**
   * Aguardar managers estarem disponíveis
   */
  async waitForManagers() {
    const maxAttempts = 50;
    let attempts = 0;

    while (attempts < maxAttempts) {
      // Verificar AnimationManager
      if (typeof AnimationManager !== 'undefined' && window.animationManager) {
        this.animationManager = window.animationManager;
        this.integrationStatus.animationManager = true;
      }

      // Verificar LoadingManager
      if (typeof LoadingManager !== 'undefined' && window.loadingManager) {
        this.loadingManager = window.loadingManager;
        this.integrationStatus.loadingManager = true;
      }

      // Verificar PerformanceMonitor
      if (typeof AnimationPerformanceMonitor !== 'undefined' && window.performanceMonitor) {
        this.performanceMonitor = window.performanceMonitor;
        this.integrationStatus.performanceMonitor = true;
      }

      // Se todos estão disponíveis, continuar
      if (this.integrationStatus.animationManager &&
        this.integrationStatus.loadingManager &&
        this.integrationStatus.performanceMonitor) {
        break;
      }

      attempts++;
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('🎬 Managers disponíveis:', this.integrationStatus);
  }

  /**
   * Integrar com eventos DOM básicos
   */
  integrateDOMEvents() {
    // Event listener para DOMContentLoaded
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.applyInitialAnimations();
      });
    }

    // Event listener para resize da janela
    const resizeHandler = this.debounce(() => {
      if (this.performanceMonitor) {
        this.performanceMonitor.handleResize();
      }
    }, 250);

    window.addEventListener('resize', resizeHandler);
    this.eventListeners.set('window-resize', resizeHandler);

    // Event listener para scroll (para otimizações de performance)
    const scrollHandler = this.throttle(() => {
      if (this.performanceMonitor) {
        this.performanceMonitor.checkScrollPerformance();
      }
    }, 100);

    window.addEventListener('scroll', scrollHandler, { passive: true });
    this.eventListeners.set('window-scroll', scrollHandler);

    this.integrationStatus.domEvents = true;
    console.log('✅ Eventos DOM integrados');
  }

  /**
   * Integrar com eventos de formulário
   */
  integrateFormEvents() {
    // CD Selection Events
    const cdSelect = document.getElementById('cdSelect');
    if (cdSelect) {
      const cdChangeHandler = (event) => {
        const selectedValue = event.target.value;

        // Aplicar transição de estado no seletor
        if (this.animationManager) {
          this.animationManager.applyStateTransition(cdSelect,
            selectedValue ? 'enable' : 'disable');
        }

        // Animar campos dependentes
        const coddvInput = document.getElementById('coddvInput');
        const btnBuscar = document.getElementById('btnBuscar');

        if (selectedValue) {
          // Habilitar campos com animação
          if (coddvInput && this.animationManager) {
            this.animationManager.applyStateTransition(coddvInput, 'enable');
          }
          if (btnBuscar && this.animationManager) {
            this.animationManager.applyStateTransition(btnBuscar, 'enable');
          }

          // Animar status de CD
          const cdStatus = document.getElementById('cdStatus');
          if (cdStatus && this.animationManager) {
            this.animationManager.applyFeedbackAnimation(cdStatus, 'success');
          }
        } else {
          // Desabilitar campos com animação
          if (coddvInput && this.animationManager) {
            this.animationManager.applyStateTransition(coddvInput, 'disable');
          }
          if (btnBuscar && this.animationManager) {
            this.animationManager.applyStateTransition(btnBuscar, 'disable');
          }
        }
      };

      cdSelect.addEventListener('change', cdChangeHandler);
      this.eventListeners.set('cd-select-change', cdChangeHandler);
    }

    // Search Input Events
    const coddvInput = document.getElementById('coddvInput');
    if (coddvInput) {
      // Focus event
      const focusHandler = (event) => {
        if (this.animationManager) {
          this.animationManager.applyEntryAnimation(event.target, 'slideInDown', {
            duration: 200
          });
        }
      };

      // Input event para sugestões
      const inputHandler = this.debounce((event) => {
        const value = event.target.value.trim();
        if (value.length > 0) {
          // Animar ícone de busca
          const searchIcon = document.querySelector('.search-icon');
          if (searchIcon && this.animationManager) {
            this.animationManager.applyFeedbackAnimation(searchIcon, 'highlight');
          }
        }
      }, 300);

      coddvInput.addEventListener('focus', focusHandler);
      coddvInput.addEventListener('input', inputHandler);

      this.eventListeners.set('coddv-input-focus', focusHandler);
      this.eventListeners.set('coddv-input-input', inputHandler);
    }

    this.integrationStatus.formEvents = true;
    console.log('✅ Eventos de formulário integrados');
  }

  /**
   * Integrar com eventos de lista de produtos
   */
  integrateListEvents() {
    // Observar mudanças na lista de produtos
    const productList = document.getElementById('productList');
    if (productList) {
      // Observer para novos produtos adicionados
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'childList') {
            // Produtos adicionados
            mutation.addedNodes.forEach((node) => {
              if (node.nodeType === Node.ELEMENT_NODE &&
                node.classList.contains('product-item')) {

                // Aplicar animação de entrada
                if (this.animationManager) {
                  this.animationManager.applyEntryAnimation(node, 'slideInUp', {
                    duration: 400,
                    callback: () => {
                      // Aplicar animação de destaque após entrada
                      setTimeout(() => {
                        this.animationManager.applyFeedbackAnimation(node, 'highlight');
                      }, 100);
                    }
                  });
                }

                // Integrar botão de remoção
                const removeBtn = node.querySelector('.btn-remove');
                if (removeBtn) {
                  this.integrateRemoveButton(removeBtn, node);
                }
              }
            });

            // Produtos removidos - animação já aplicada pelo AnimationManager
            mutation.removedNodes.forEach((node) => {
              if (node.nodeType === Node.ELEMENT_NODE &&
                node.classList.contains('product-item')) {
                console.log('🗑️ Produto removido da lista:', node);
              }
            });
          }
        });
      });

      observer.observe(productList, {
        childList: true,
        subtree: true
      });

      this.eventListeners.set('product-list-observer', observer);
    }

    // Integrar com seção da lista
    const productListSection = document.getElementById('productListSection');
    if (productListSection) {
      // Observer para mostrar/ocultar seção
      const sectionObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
            const isVisible = productListSection.style.display !== 'none';
            const wasVisible = mutation.oldValue && !mutation.oldValue.includes('display: none');

            if (isVisible && !wasVisible) {
              // Seção sendo mostrada
              if (this.animationManager) {
                this.animationManager.applyStateTransition(productListSection, 'show');
              }
            } else if (!isVisible && wasVisible) {
              // Seção sendo ocultada
              if (this.animationManager) {
                this.animationManager.applyStateTransition(productListSection, 'hide');
              }
            }
          }
        });
      });

      sectionObserver.observe(productListSection, {
        attributes: true,
        attributeOldValue: true,
        attributeFilter: ['style']
      });

      this.eventListeners.set('product-section-observer', sectionObserver);
    }

    this.integrationStatus.listEvents = true;
    console.log('✅ Eventos de lista integrados');
  }

  /**
   * Integrar botão de remoção individual
   */
  integrateRemoveButton(removeBtn, productItem) {
    const clickHandler = (event) => {
      event.preventDefault();
      event.stopPropagation();

      // Aplicar animação de remoção
      if (this.animationManager) {
        this.animationManager.applyFeedbackAnimation(productItem, 'remove', {
          callback: () => {
            // Executar remoção real após animação
            const coddv = productItem.getAttribute('data-coddv');
            if (coddv && window.removeProductFromList) {
              // Remover do estado sem re-renderizar (já foi animado)
              if (window.APP_STATE && window.APP_STATE.productList) {
                window.APP_STATE.productList.delete(coddv);
              }

              // Atualizar UI
              if (window.updateUI) {
                window.updateUI();
              }
            }
          }
        });
      }
    };

    removeBtn.addEventListener('click', clickHandler);

    // Armazenar referência para cleanup
    if (!this.eventListeners.has('remove-buttons')) {
      this.eventListeners.set('remove-buttons', new Set());
    }
    this.eventListeners.get('remove-buttons').add({ button: removeBtn, handler: clickHandler });
  }

  /**
   * Integrar com eventos de botões
   */
  integrateButtonEvents() {
    // Botão de busca
    const btnBuscar = document.getElementById('btnBuscar');
    if (btnBuscar) {
      const searchHandler = (event) => {
        // Mostrar loading no botão
        if (this.loadingManager) {
          this.loadingManager.showButtonLoading(btnBuscar, 'Buscando...', 'normal');
        }

        // Aplicar animação de clique
        if (this.animationManager) {
          this.animationManager.applyFeedbackAnimation(btnBuscar, 'success', {
            duration: 200
          });
        }
      };

      btnBuscar.addEventListener('click', searchHandler);
      this.eventListeners.set('btn-buscar-click', searchHandler);
    }

    // Botão de limpar lista
    const btnLimparLista = document.getElementById('btnLimparLista');
    if (btnLimparLista) {
      const clearHandler = (event) => {
        // Mostrar loading no botão
        if (this.loadingManager) {
          this.loadingManager.showButtonLoading(btnLimparLista, 'Limpando...', 'small');
        }

        // Aplicar animação de warning
        if (this.animationManager) {
          this.animationManager.applyFeedbackAnimation(btnLimparLista, 'warning', {
            duration: 300
          });
        }
      };

      btnLimparLista.addEventListener('click', clearHandler);
      this.eventListeners.set('btn-limpar-click', clearHandler);
    }

    // Botão de gerar relatório
    const btnGerarOtimizado = document.getElementById('btnGerarOtimizado');
    if (btnGerarOtimizado) {
      const generateHandler = (event) => {
        // Mostrar loading no botão
        if (this.loadingManager) {
          this.loadingManager.showButtonLoading(btnGerarOtimizado, 'Gerando...', 'normal');
        }

        // Aplicar animação de sucesso
        if (this.animationManager) {
          this.animationManager.applyFeedbackAnimation(btnGerarOtimizado, 'success', {
            duration: 400
          });
        }
      };

      btnGerarOtimizado.addEventListener('click', generateHandler);
      this.eventListeners.set('btn-gerar-click', generateHandler);
    }

    this.integrationStatus.buttonEvents = true;
    console.log('✅ Eventos de botões integrados');
  }

  /**
   * Integrar com eventos de carregamento
   */
  integrateLoadingEvents() {
    // Interceptar início de carregamento de dados
    if (window.loadDatabasesAsync) {
      const originalLoadDatabases = window.loadDatabasesAsync;
      window.loadDatabasesAsync = async (...args) => {
        // Mostrar overlay de loading
        if (this.loadingManager) {
          this.loadingManager.showLoadingOverlay('Carregando bases de dados...');
        }

        try {
          const result = await originalLoadDatabases.apply(this, args);

          // Ocultar overlay após sucesso
          if (this.loadingManager) {
            this.loadingManager.hideLoadingOverlay();
          }

          return result;
        } catch (error) {
          // Ocultar overlay em caso de erro
          if (this.loadingManager) {
            this.loadingManager.hideLoadingOverlay();
          }
          throw error;
        }
      };
    }

    // Interceptar busca de produtos
    if (window.handleProductSearch) {
      const originalHandleProductSearch = window.handleProductSearch;
      window.handleProductSearch = (...args) => {
        // Animar campo de busca
        const coddvInput = document.getElementById('coddvInput');
        if (coddvInput && this.animationManager) {
          this.animationManager.applyFeedbackAnimation(coddvInput, 'highlight', {
            duration: 300
          });
        }

        return originalHandleProductSearch.apply(this, args);
      };
    }

    console.log('✅ Eventos de carregamento integrados');
  }

  /**
   * Integrar com eventos de feedback
   */
    // Fornecer feedback de log
    console.log('✅ Eventos de feedback simplificados (usando animações nativas)');
}

/**
 * Integrar com eventos de estado
 */
integrateStateEvents() {
  // Interceptar mudanças de estado da aplicação
  if (window.APP_STATE) {
    // Observer para mudanças no estado
    const stateHandler = {
      set: (target, property, value) => {
        const oldValue = target[property];
        target[property] = value;

        // Reagir a mudanças específicas
        switch (property) {
          case 'selectedCD':
            this.handleCDStateChange(value, oldValue);
            break;
          case 'databaseReady':
            this.handleDatabaseReadyChange(value, oldValue);
            break;
          case 'isLoading':
            this.handleLoadingStateChange(value, oldValue);
            break;
        }

        return true;
      }
    };

    // Aplicar proxy ao estado (se suportado)
    if (typeof Proxy !== 'undefined') {
      window.APP_STATE = new Proxy(window.APP_STATE, stateHandler);
    }
  }

  console.log('✅ Eventos de estado integrados');
}

/**
 * Configurar observadores de mutação
 */
setupMutationObservers() {
  // Observer global para novos elementos que precisam de animação
  const globalObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            this.processNewElement(node);
          }
        });
      }
    });
  });

  globalObserver.observe(document.body, {
    childList: true,
    subtree: true
  });

  this.eventListeners.set('global-observer', globalObserver);
  console.log('✅ Observadores de mutação configurados');
}

/**
 * Processar novo elemento adicionado ao DOM
 */
processNewElement(element) {
  // Verificar se elemento precisa de animação de entrada
  if (element.classList.contains('animate-fade-slide-up') ||
    element.classList.contains('animate-slide-up-field') ||
    element.classList.contains('animate-slide-in-down')) {
    // Elemento já tem classe de animação, não fazer nada
    return;
  }

  // Aplicar animações baseadas no tipo de elemento
  if (element.classList.contains('panel')) {
    if (this.animationManager) {
      this.animationManager.applyEntryAnimation(element, 'fadeSlideUp');
    }
  } else if (element.classList.contains('product-item')) {
    if (this.animationManager) {
      this.animationManager.applyEntryAnimation(element, 'slideInUp');
    }
  }
  // Removida animação manual para .toast pois é tratada pelo script.js

  // Processar elementos filhos
  const childElements = element.querySelectorAll('.form-group, .field');
  if (childElements.length > 0 && this.animationManager) {
    this.animationManager.applyStaggeredAnimation(childElements, 'slideUpField', {
      staggerDelay: 50
    });
  }
}

/**
 * Aplicar animações iniciais
 */
applyInitialAnimations() {
  console.log('🎬 Aplicando animações iniciais...');

  // Animar painéis principais
  const panels = document.querySelectorAll('.panel');
  if (panels.length > 0 && this.animationManager) {
    panels.forEach((panel, index) => {
      this.animationManager.applyEntryAnimation(panel, 'fadeSlideUp', {
        delay: index * 100
      });
    });
  }

  // Animar campos de formulário com stagger
  const formGroups = document.querySelectorAll('.form-group, .field');
  if (formGroups.length > 0 && this.animationManager) {
    this.animationManager.applyStaggeredAnimation(formGroups, 'slideUpField');
  }

  // Animar produtos existentes na lista
  const productItems = document.querySelectorAll('.product-item');
  if (productItems.length > 0 && this.animationManager) {
    this.animationManager.applyStaggeredAnimation(productItems, 'slideInUp', {
      staggerDelay: 75
    });
  }

  console.log('✅ Animações iniciais aplicadas');
}

/**
 * Handlers para mudanças de estado
 */
handleCDStateChange(newValue, oldValue) {
  if (newValue !== oldValue) {
    const cdStatus = document.getElementById('cdStatus');
    if (cdStatus && this.animationManager) {
      if (newValue) {
        this.animationManager.applyFeedbackAnimation(cdStatus, 'success');
      } else {
        this.animationManager.applyFeedbackAnimation(cdStatus, 'warning');
      }
    }
  }
}

handleDatabaseReadyChange(newValue, oldValue) {
  if (newValue && !oldValue) {
    // Base de dados carregada
    const status = document.getElementById('status');
    if (status && this.animationManager) {
      this.animationManager.applyFeedbackAnimation(status, 'success');
    }
  }
}

handleLoadingStateChange(newValue, oldValue) {
  if (newValue !== oldValue) {
    if (newValue) {
      // Iniciando carregamento
      if (this.loadingManager) {
        this.loadingManager.showLoadingOverlay('Carregando...');
      }
    } else {
      // Carregamento concluído
      if (this.loadingManager) {
        this.loadingManager.hideLoadingOverlay();
      }
    }
  }
}

/**
 * Utilitários
 */
debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

throttle(func, limit) {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Limpar integração
 */
cleanup() {
  console.log('🧹 Limpando integração de animações...');

  // Remover event listeners
  this.eventListeners.forEach((listener, key) => {
    if (listener instanceof MutationObserver) {
      listener.disconnect();
    } else if (listener instanceof Set) {
      listener.forEach(({ button, handler }) => {
        button.removeEventListener('click', handler);
      });
    } else if (typeof listener === 'function') {
      // Event listeners específicos serão removidos pelos elementos
    }
  });

  this.eventListeners.clear();

  // Limpar animações ativas
  if (this.animationManager) {
    this.animationManager.clearAllAnimations();
  }

  // Limpar loadings ativos
  if (this.loadingManager) {
    this.loadingManager.clearAllLoadings();
  }

  console.log('✅ Integração de animações limpa');
}

/**
 * Obter status da integração
 */
getIntegrationStatus() {
  return {
    ...this.integrationStatus,
    activeListeners: this.eventListeners.size,
    managersAvailable: {
      animationManager: !!this.animationManager,
      loadingManager: !!this.loadingManager,
      performanceMonitor: !!this.performanceMonitor
    }
  };
}
}

// Criar instância global
window.AnimationIntegration = AnimationIntegration;

// Exportar para uso em módulos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AnimationIntegration;
}