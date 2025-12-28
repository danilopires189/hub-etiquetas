/**
 * AnimationManager - Sistema de controle de animações JavaScript
 * Adaptado do módulo etiqueta-mercadoria para o módulo inventário
 * 
 * Requirements: 3.1, 4.3, 6.2
 */

class AnimationManager {
  constructor() {
    this.activeAnimations = new Map();
    this.animationQueue = [];
    this.isProcessingQueue = false;
    this.config = {
      durations: {
        fast: 200,
        normal: 300,
        slow: 600,
        entry: 600,
        hover: 300,
        feedback: 400,
        state: 300
      },
      easings: {
        smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
        bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        linear: 'linear',
        easeOut: 'ease-out',
        easeInOut: 'ease-in-out'
      },
      delays: {
        stagger: 50,
        short: 100,
        medium: 200,
        long: 300
      }
    };
    
    console.log('🎬 AnimationManager inicializado');
  }

  /**
   * Aplicar animação de entrada a um elemento
   * @param {HTMLElement|string} element - Elemento ou seletor
   * @param {string} animationType - Tipo de animação: 'fadeSlideUp', 'slideUpField', 'slideInDown', 'slideInUp', 'slideInRight'
   * @param {Object} options - Opções da animação
   */
  applyEntryAnimation(element, animationType = 'fadeSlideUp', options = {}) {
    const el = typeof element === 'string' ? document.querySelector(element) : element;
    if (!el) {
      console.warn('AnimationManager: Elemento não encontrado para animação de entrada');
      return;
    }

    const {
      duration = this.config.durations.entry,
      delay = 0,
      easing = this.config.easings.smooth,
      callback = null
    } = options;

    // Remover animações anteriores
    this.removeAnimation(el);

    // Aplicar classe de animação
    const animationClass = `animate-${this.camelToKebab(animationType)}`;
    el.classList.add(animationClass);

    // Configurar propriedades CSS customizadas se necessário
    if (duration !== this.config.durations.entry) {
      el.style.setProperty('--animation-duration-entry', `${duration}ms`);
    }

    if (delay > 0) {
      el.style.animationDelay = `${delay}ms`;
    }

    // Armazenar animação ativa
    const animationId = this.generateAnimationId();
    this.activeAnimations.set(animationId, {
      element: el,
      type: 'entry',
      animationType,
      startTime: Date.now() + delay,
      duration,
      callback
    });

    // Remover classe após animação completar
    const totalDuration = duration + delay;
    setTimeout(() => {
      el.classList.remove(animationClass);
      el.style.removeProperty('--animation-duration-entry');
      el.style.removeProperty('animation-delay');
      
      this.activeAnimations.delete(animationId);
      
      if (callback) callback(el);
    }, totalDuration);

    console.log(`🎬 Animação de entrada aplicada: ${animationType} em`, el);
    return animationId;
  }

  /**
   * Aplicar animação de feedback visual
   * @param {HTMLElement|string} element - Elemento ou seletor
   * @param {string} feedbackType - Tipo de feedback: 'success', 'error', 'warning', 'highlight', 'remove'
   * @param {Object} options - Opções da animação
   */
  applyFeedbackAnimation(element, feedbackType = 'success', options = {}) {
    const el = typeof element === 'string' ? document.querySelector(element) : element;
    if (!el) {
      console.warn('AnimationManager: Elemento não encontrado para animação de feedback');
      return;
    }

    const {
      duration = this.config.durations.feedback,
      callback = null,
      autoRemove = true
    } = options;

    // Remover animações anteriores
    this.removeAnimation(el);

    let animationClass;
    let animationDuration = duration;

    switch (feedbackType) {
      case 'success':
        animationClass = 'feedback-success';
        break;
      case 'error':
        animationClass = 'feedback-error';
        break;
      case 'warning':
        animationClass = 'feedback-warning';
        break;
      case 'highlight':
        // Para produtos adicionados - Requirement 4.3
        animationClass = 'product-item-added';
        animationDuration = 1000;
        break;
      case 'remove':
        // Para produtos removidos - Requirement 4.4
        animationClass = 'product-item-removing';
        animationDuration = 300;
        break;
      default:
        animationClass = 'feedback-success';
    }

    // Aplicar classe de animação
    el.classList.add(animationClass);

    // Armazenar animação ativa
    const animationId = this.generateAnimationId();
    this.activeAnimations.set(animationId, {
      element: el,
      type: 'feedback',
      feedbackType,
      startTime: Date.now(),
      duration: animationDuration,
      callback
    });

    // Remover classe após animação completar
    setTimeout(() => {
      if (autoRemove) {
        el.classList.remove(animationClass);
      }
      
      this.activeAnimations.delete(animationId);
      
      if (callback) callback(el);
    }, animationDuration);

    console.log(`🎬 Animação de feedback aplicada: ${feedbackType} em`, el);
    return animationId;
  }

  /**
   * Aplicar transição de estado a um elemento
   * @param {HTMLElement|string} element - Elemento ou seletor
   * @param {string} stateType - Tipo de estado: 'enable', 'disable', 'show', 'hide'
   * @param {Object} options - Opções da transição
   */
  applyStateTransition(element, stateType, options = {}) {
    const el = typeof element === 'string' ? document.querySelector(element) : element;
    if (!el) {
      console.warn('AnimationManager: Elemento não encontrado para transição de estado');
      return;
    }

    const {
      duration = this.config.durations.state,
      callback = null
    } = options;

    // Remover transições anteriores
    this.removeAnimation(el);

    // Aplicar classe de transição base
    el.classList.add('state-transition');

    // Configurar duração customizada se necessário
    if (duration !== this.config.durations.state) {
      el.style.setProperty('--animation-duration-state', `${duration}ms`);
    }

    let targetClass;
    let shouldDisable = false;

    switch (stateType) {
      case 'enable':
        targetClass = 'state-enabled';
        el.classList.remove('state-disabled');
        break;
      case 'disable':
        targetClass = 'state-disabled';
        el.classList.remove('state-enabled');
        shouldDisable = true;
        break;
      case 'show':
        targetClass = 'section-visible';
        el.classList.remove('section-hidden');
        el.style.display = 'block';
        break;
      case 'hide':
        targetClass = 'section-hidden';
        el.classList.remove('section-visible');
        break;
      default:
        console.warn(`AnimationManager: Tipo de estado desconhecido: ${stateType}`);
        return;
    }

    // Aplicar classe de estado
    el.classList.add(targetClass);

    // Desabilitar elemento se necessário
    if (shouldDisable && (el.tagName === 'BUTTON' || el.tagName === 'INPUT' || el.tagName === 'SELECT')) {
      el.disabled = true;
    } else if (!shouldDisable && (el.tagName === 'BUTTON' || el.tagName === 'INPUT' || el.tagName === 'SELECT')) {
      el.disabled = false;
    }

    // Armazenar transição ativa
    const animationId = this.generateAnimationId();
    this.activeAnimations.set(animationId, {
      element: el,
      type: 'state',
      stateType,
      startTime: Date.now(),
      duration,
      callback
    });

    // Limpar após transição completar
    setTimeout(() => {
      el.classList.remove('state-transition');
      el.style.removeProperty('--animation-duration-state');
      
      // Ocultar elemento se necessário
      if (stateType === 'hide') {
        el.style.display = 'none';
      }
      
      this.activeAnimations.delete(animationId);
      
      if (callback) callback(el);
    }, duration);

    console.log(`🎬 Transição de estado aplicada: ${stateType} em`, el);
    return animationId;
  }

  /**
   * Aplicar animação escalonada a uma lista de elementos
   * @param {NodeList|Array} elements - Lista de elementos
   * @param {string} animationType - Tipo de animação
   * @param {Object} options - Opções da animação
   */
  applyStaggeredAnimation(elements, animationType = 'slideUpField', options = {}) {
    const elementArray = Array.from(elements);
    if (elementArray.length === 0) {
      console.warn('AnimationManager: Nenhum elemento encontrado para animação escalonada');
      return;
    }

    const {
      staggerDelay = this.config.delays.stagger,
      maxStagger = 8,
      callback = null
    } = options;

    const animationIds = [];

    elementArray.forEach((el, index) => {
      const delay = Math.min(index + 1, maxStagger) * staggerDelay;
      
      // Aplicar classe de stagger
      el.classList.add(`stagger-${Math.min(index + 1, maxStagger)}`);
      
      // Aplicar animação com delay
      const animationId = this.applyEntryAnimation(el, animationType, {
        ...options,
        delay,
        callback: index === elementArray.length - 1 ? callback : null // Callback apenas no último elemento
      });
      
      if (animationId) {
        animationIds.push(animationId);
      }
    });

    console.log(`🎬 Animação escalonada aplicada a ${elementArray.length} elementos`);
    return animationIds;
  }

  /**
   * Remover animação de um elemento
   * @param {HTMLElement|string} element - Elemento ou seletor
   */
  removeAnimation(element) {
    const el = typeof element === 'string' ? document.querySelector(element) : element;
    if (!el) return;

    // Encontrar e remover animações ativas para este elemento
    for (const [animationId, animation] of this.activeAnimations.entries()) {
      if (animation.element === el) {
        this.activeAnimations.delete(animationId);
      }
    }

    // Remover todas as classes de animação
    const animationClasses = [
      'animate-fade-slide-up', 'animate-slide-up-field', 'animate-slide-in-down',
      'animate-slide-in-up', 'animate-slide-in-right', 'feedback-success',
      'feedback-error', 'feedback-warning', 'product-item-added',
      'product-item-removing', 'state-transition', 'state-enabled',
      'state-disabled', 'section-visible', 'section-hidden'
    ];

    animationClasses.forEach(className => {
      el.classList.remove(className);
    });

    // Remover classes de stagger
    for (let i = 1; i <= 8; i++) {
      el.classList.remove(`stagger-${i}`);
    }

    // Limpar propriedades CSS customizadas
    el.style.removeProperty('--animation-duration-entry');
    el.style.removeProperty('--animation-duration-state');
    el.style.removeProperty('animation-delay');

    console.log('🎬 Animações removidas de', el);
  }

  /**
   * Pausar todas as animações ativas
   */
  pauseAllAnimations() {
    for (const [animationId, animation] of this.activeAnimations.entries()) {
      const el = animation.element;
      el.style.animationPlayState = 'paused';
    }
    console.log('⏸️ Todas as animações pausadas');
  }

  /**
   * Retomar todas as animações pausadas
   */
  resumeAllAnimations() {
    for (const [animationId, animation] of this.activeAnimations.entries()) {
      const el = animation.element;
      el.style.animationPlayState = 'running';
    }
    console.log('▶️ Todas as animações retomadas');
  }

  /**
   * Limpar todas as animações ativas
   */
  clearAllAnimations() {
    for (const [animationId, animation] of this.activeAnimations.entries()) {
      this.removeAnimation(animation.element);
    }
    this.activeAnimations.clear();
    this.animationQueue = [];
    console.log('🧹 Todas as animações limpas');
  }

  /**
   * Obter informações sobre animações ativas
   * @returns {Object} Informações sobre animações ativas
   */
  getActiveAnimationsInfo() {
    const info = {
      total: this.activeAnimations.size,
      byType: {},
      byElement: new Map()
    };

    for (const [animationId, animation] of this.activeAnimations.entries()) {
      // Contar por tipo
      if (!info.byType[animation.type]) {
        info.byType[animation.type] = 0;
      }
      info.byType[animation.type]++;

      // Contar por elemento
      const elementInfo = info.byElement.get(animation.element) || [];
      elementInfo.push({
        id: animationId,
        type: animation.type,
        startTime: animation.startTime,
        duration: animation.duration
      });
      info.byElement.set(animation.element, elementInfo);
    }

    return info;
  }

  /**
   * Integrar com eventos do DOM
   * @param {HTMLElement|string} container - Container para observar eventos
   */
  integrateWithDOMEvents(container = document) {
    const containerEl = typeof container === 'string' ? document.querySelector(container) : container;
    if (!containerEl) {
      console.warn('AnimationManager: Container não encontrado para integração DOM');
      return;
    }

    // Event listener para produtos adicionados
    containerEl.addEventListener('productAdded', (event) => {
      const productElement = event.detail.element;
      if (productElement) {
        this.applyFeedbackAnimation(productElement, 'highlight');
      }
    });

    // Event listener para produtos removidos
    containerEl.addEventListener('productRemoved', (event) => {
      const productElement = event.detail.element;
      if (productElement) {
        this.applyFeedbackAnimation(productElement, 'remove', {
          callback: () => {
            // Elemento será removido do DOM após animação
            if (event.detail.onComplete) {
              event.detail.onComplete();
            }
          }
        });
      }
    });

    // Event listener para mudanças de estado
    containerEl.addEventListener('stateChange', (event) => {
      const { element, state } = event.detail;
      if (element && state) {
        this.applyStateTransition(element, state);
      }
    });

    // Event listener para animações de entrada
    containerEl.addEventListener('entryAnimation', (event) => {
      const { element, type, options } = event.detail;
      if (element) {
        this.applyEntryAnimation(element, type, options);
      }
    });

    console.log('🔗 AnimationManager integrado com eventos DOM em', containerEl);
  }

  /**
   * Utilitários privados
   */
  generateAnimationId() {
    return `anim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  camelToKebab(str) {
    return str.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
  }

  /**
   * Configurar preferências de movimento reduzido
   */
  setupReducedMotionSupport() {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    const handleReducedMotion = (e) => {
      if (e.matches) {
        // Usuário prefere movimento reduzido
        document.body.classList.add('reduced-motion');
        this.config.durations = {
          fast: 1,
          normal: 1,
          slow: 1,
          entry: 1,
          hover: 1,
          feedback: 1,
          state: 1
        };
        console.log('♿ Modo de movimento reduzido ativado');
      } else {
        // Usuário permite movimento normal
        document.body.classList.remove('reduced-motion');
        this.config.durations = {
          fast: 200,
          normal: 300,
          slow: 600,
          entry: 600,
          hover: 300,
          feedback: 400,
          state: 300
        };
        console.log('🎬 Modo de movimento normal ativado');
      }
    };

    // Verificar estado inicial
    handleReducedMotion(mediaQuery);

    // Escutar mudanças
    mediaQuery.addListener(handleReducedMotion);
  }

  /**
   * Inicializar AnimationManager
   */
  initialize() {
    this.setupReducedMotionSupport();
    this.integrateWithDOMEvents();
    console.log('✅ AnimationManager inicializado completamente');
  }
}

// Criar instância global
window.AnimationManager = AnimationManager;

// Exportar para uso em módulos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AnimationManager;
}