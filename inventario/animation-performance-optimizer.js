/**
 * Animation Performance Optimizer - Task 12.2
 * Sistema de otimização de performance das animações
 * 
 * Requirements: 8.5 - Otimizar performance das animações
 */

class AnimationPerformanceOptimizer {
  constructor() {
    this.performanceMetrics = {
      fps: 60,
      frameDrops: 0,
      animationCount: 0,
      gpuMemoryUsage: 0,
      cpuUsage: 0,
      lastFrameTime: performance.now()
    };
    
    this.optimizationSettings = {
      maxConcurrentAnimations: 10,
      enableGPUAcceleration: true,
      enableWillChange: true,
      enableTransform3D: true,
      enableBackfaceVisibility: true,
      enableCompositing: true,
      reduceMotionThreshold: 30, // FPS threshold
      emergencyModeThreshold: 20  // FPS threshold for emergency mode
    };
    
    this.activeOptimizations = new Set();
    this.performanceObserver = null;
    this.frameRateMonitor = null;
    this.isEmergencyMode = false;
    this.isMonitoring = false;
    
    console.log('⚡ AnimationPerformanceOptimizer inicializado');
  }

  /**
   * Inicializar otimizador de performance
   */
  initialize() {
    console.log('🔄 Inicializando otimizador de performance...');

    // Configurar monitoramento de performance
    this.setupPerformanceMonitoring();
    
    // Aplicar otimizações CSS
    this.applyCSSOptimizations();
    
    // Configurar otimizações de GPU
    this.setupGPUOptimizations();
    
    // Configurar otimizações de seletores
    this.optimizeSelectors();
    
    // Configurar detecção de dispositivos
    this.detectDeviceCapabilities();
    
    // Iniciar monitoramento
    this.startMonitoring();
    
    console.log('✅ Otimizador de performance inicializado');
  }

  /**
   * Configurar monitoramento de performance
   */
  setupPerformanceMonitoring() {
    // Performance Observer para métricas de layout
    if ('PerformanceObserver' in window) {
      this.performanceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.entryType === 'measure') {
            this.analyzePerformanceEntry(entry);
          }
        });
      });

      try {
        this.performanceObserver.observe({ entryTypes: ['measure', 'navigation'] });
      } catch (error) {
        console.warn('⚠️ PerformanceObserver não suportado:', error);
      }
    }

    // Monitor de frame rate
    this.frameRateMonitor = {
      frames: 0,
      lastTime: performance.now(),
      
      tick: () => {
        const now = performance.now();
        this.frameRateMonitor.frames++;
        
        if (now - this.frameRateMonitor.lastTime >= 1000) {
          this.performanceMetrics.fps = this.frameRateMonitor.frames;
          this.frameRateMonitor.frames = 0;
          this.frameRateMonitor.lastTime = now;
          
          // Analisar performance
          this.analyzeFrameRate();
        }
        
        if (this.isMonitoring) {
          requestAnimationFrame(this.frameRateMonitor.tick);
        }
      }
    };
  }

  /**
   * Aplicar otimizações CSS
   */
  applyCSSOptimizations() {
    console.log('🎨 Aplicando otimizações CSS...');

    // Criar stylesheet de otimizações
    const optimizationCSS = document.createElement('style');
    optimizationCSS.id = 'animation-performance-optimizations';
    optimizationCSS.textContent = `
      /* GPU Acceleration Optimizations */
      .animate-fade-slide-up,
      .animate-slide-up-field,
      .animate-slide-in-down,
      .animate-slide-in-up,
      .animate-slide-in-right,
      .hover-card,
      .hover-button,
      .product-item,
      .panel,
      .toast,
      .toast-progress {
        will-change: transform, opacity;
        transform: translateZ(0); /* Force GPU layer */
        backface-visibility: hidden;
        perspective: 1000px;
      }

      /* Optimize for compositing */
      .glassmorphism-panel,
      .glassmorphism-simple,
      .loading-overlay {
        will-change: backdrop-filter, transform;
        transform: translateZ(0);
        isolation: isolate;
      }

      /* Optimize button animations */
      .btn,
      .btn-primary,
      .btn-secondary,
      .btn-ghost {
        will-change: transform, box-shadow;
        transform: translateZ(0);
      }

      /* Optimize loading animations */
      .spinner,
      .loading-spinner::after {
        will-change: transform;
        transform: translateZ(0);
        contain: layout style paint;
      }

      /* Optimize staggered animations */
      .stagger-1, .stagger-2, .stagger-3, .stagger-4,
      .stagger-5, .stagger-6, .stagger-7, .stagger-8 {
        will-change: transform, opacity;
        transform: translateZ(0);
      }

      /* Containment for better performance */
      .product-list {
        contain: layout style paint;
      }

      .product-item {
        contain: layout style;
      }

      .panel {
        contain: layout style;
      }

      /* Optimize scrolling performance */
      .product-list {
        overflow-anchor: none;
        scroll-behavior: auto;
      }

      /* Reduce paint complexity */
      .glassmorphism-panel::before {
        will-change: background-position;
        transform: translateZ(0);
      }

      /* Emergency mode optimizations */
      .performance-emergency-mode * {
        animation-duration: 0.1s !important;
        transition-duration: 0.1s !important;
        will-change: auto !important;
        transform: none !important;
        backdrop-filter: none !important;
        box-shadow: none !important;
      }

      .performance-emergency-mode .glassmorphism-panel,
      .performance-emergency-mode .glassmorphism-simple {
        background: rgba(255, 255, 255, 0.95) !important;
        backdrop-filter: none !important;
        border: 1px solid #e5e7eb !important;
      }

      /* Reduced motion optimizations */
      .performance-reduced-motion * {
        animation-duration: 0.2s !important;
        transition-duration: 0.2s !important;
      }

      .performance-reduced-motion .btn-primary-gradient::before,
      .performance-reduced-motion .glassmorphism-panel::before {
        animation: none !important;
      }

      /* Low-end device optimizations */
      .performance-low-end .glassmorphism-panel,
      .performance-low-end .glassmorphism-simple,
      .performance-low-end .glassmorphism-floating {
        background: rgba(255, 255, 255, 0.95) !important;
        backdrop-filter: none !important;
        -webkit-backdrop-filter: none !important;
      }

      .performance-low-end .btn-primary-gradient::before {
        animation: none !important;
        opacity: 0.2;
      }

      /* High-performance mode */
      .performance-high-end .animate-fade-slide-up,
      .performance-high-end .animate-slide-up-field {
        animation-timing-function: cubic-bezier(0.25, 0.46, 0.45, 0.94);
      }
    `;

    document.head.appendChild(optimizationCSS);
    this.activeOptimizations.add('css-optimizations');
    
    console.log('✅ Otimizações CSS aplicadas');
  }

  /**
   * Configurar otimizações de GPU
   */
  setupGPUOptimizations() {
    console.log('🖥️ Configurando otimizações de GPU...');

    // Detectar suporte a GPU
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    
    if (gl) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        console.log('🎮 GPU detectada:', renderer);
        
        // Configurar otimizações baseadas na GPU
        this.configureGPUSpecificOptimizations(renderer);
      }
    } else {
      console.warn('⚠️ WebGL não suportado, desabilitando otimizações de GPU');
      this.optimizationSettings.enableGPUAcceleration = false;
      document.body.classList.add('no-gpu-acceleration');
    }

    // Aplicar transform3d para forçar aceleração de GPU
    if (this.optimizationSettings.enableGPUAcceleration) {
      const elements = document.querySelectorAll('.panel, .product-item, .btn, .toast');
      elements.forEach(el => {
        el.style.transform = 'translateZ(0)';
        el.style.willChange = 'transform, opacity';
      });
      
      this.activeOptimizations.add('gpu-acceleration');
    }

    console.log('✅ Otimizações de GPU configuradas');
  }

  /**
   * Configurar otimizações específicas da GPU
   */
  configureGPUSpecificOptimizations(renderer) {
    const rendererLower = renderer.toLowerCase();
    
    // Detectar GPUs integradas (performance limitada)
    if (rendererLower.includes('intel') && 
        (rendererLower.includes('hd') || rendererLower.includes('uhd'))) {
      console.log('🔧 GPU integrada detectada, aplicando otimizações conservadoras');
      this.optimizationSettings.maxConcurrentAnimations = 5;
      document.body.classList.add('performance-integrated-gpu');
    }
    
    // Detectar GPUs dedicadas (alta performance)
    else if (rendererLower.includes('nvidia') || 
             rendererLower.includes('amd') || 
             rendererLower.includes('radeon')) {
      console.log('🚀 GPU dedicada detectada, habilitando otimizações avançadas');
      this.optimizationSettings.maxConcurrentAnimations = 20;
      document.body.classList.add('performance-dedicated-gpu');
    }
    
    // GPUs móveis
    else if (rendererLower.includes('adreno') || 
             rendererLower.includes('mali') || 
             rendererLower.includes('powervr')) {
      console.log('📱 GPU móvel detectada, aplicando otimizações móveis');
      this.optimizationSettings.maxConcurrentAnimations = 3;
      document.body.classList.add('performance-mobile-gpu');
    }
  }

  /**
   * Otimizar seletores CSS
   */
  optimizeSelectors() {
    console.log('🎯 Otimizando seletores CSS...');

    // Criar índice de elementos frequentemente acessados
    this.elementCache = {
      panels: document.querySelectorAll('.panel'),
      productItems: document.querySelectorAll('.product-item'),
      buttons: document.querySelectorAll('.btn'),
      formGroups: document.querySelectorAll('.form-group'),
      toasts: document.querySelectorAll('.toast')
    };

    // Otimizar queries frequentes usando cache
    const originalQuerySelector = document.querySelector;
    const originalQuerySelectorAll = document.querySelectorAll;
    
    // Cache para queries frequentes
    const queryCache = new Map();
    
    document.querySelector = function(selector) {
      if (queryCache.has(selector)) {
        const cached = queryCache.get(selector);
        if (cached.element && document.contains(cached.element)) {
          return cached.element;
        }
      }
      
      const element = originalQuerySelector.call(this, selector);
      if (element) {
        queryCache.set(selector, { element, timestamp: Date.now() });
      }
      
      return element;
    };

    // Limpar cache periodicamente
    setInterval(() => {
      const now = Date.now();
      for (const [selector, cached] of queryCache.entries()) {
        if (now - cached.timestamp > 30000) { // 30 segundos
          queryCache.delete(selector);
        }
      }
    }, 30000);

    this.activeOptimizations.add('selector-optimization');
    console.log('✅ Seletores CSS otimizados');
  }

  /**
   * Detectar capacidades do dispositivo
   */
  detectDeviceCapabilities() {
    console.log('📱 Detectando capacidades do dispositivo...');

    const capabilities = {
      isMobile: /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
      isTablet: /iPad|Android(?!.*Mobile)/i.test(navigator.userAgent),
      isLowEnd: false,
      memoryGB: 0,
      cores: navigator.hardwareConcurrency || 2,
      connectionSpeed: 'unknown'
    };

    // Detectar memória disponível
    if ('memory' in performance) {
      capabilities.memoryGB = performance.memory.jsHeapSizeLimit / (1024 * 1024 * 1024);
      capabilities.isLowEnd = capabilities.memoryGB < 2;
    }

    // Detectar velocidade de conexão
    if ('connection' in navigator) {
      const connection = navigator.connection;
      capabilities.connectionSpeed = connection.effectiveType || 'unknown';
      
      if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
        capabilities.isLowEnd = true;
      }
    }

    // Aplicar otimizações baseadas nas capacidades
    if (capabilities.isLowEnd || capabilities.cores < 4) {
      console.log('📉 Dispositivo de baixa performance detectado');
      document.body.classList.add('performance-low-end');
      this.optimizationSettings.maxConcurrentAnimations = 3;
      this.optimizationSettings.enableGPUAcceleration = false;
    } else if (!capabilities.isMobile && capabilities.cores >= 8) {
      console.log('🚀 Dispositivo de alta performance detectado');
      document.body.classList.add('performance-high-end');
      this.optimizationSettings.maxConcurrentAnimations = 25;
    }

    if (capabilities.isMobile) {
      console.log('📱 Dispositivo móvel detectado');
      document.body.classList.add('performance-mobile');
      this.optimizationSettings.maxConcurrentAnimations = Math.min(
        this.optimizationSettings.maxConcurrentAnimations, 8
      );
    }

    this.deviceCapabilities = capabilities;
    this.activeOptimizations.add('device-detection');
    
    console.log('✅ Capacidades do dispositivo detectadas:', capabilities);
  }

  /**
   * Iniciar monitoramento de performance
   */
  startMonitoring() {
    if (this.isMonitoring) return;
    
    console.log('📊 Iniciando monitoramento de performance...');
    
    this.isMonitoring = true;
    this.frameRateMonitor.tick();
    
    // Monitoramento periódico
    this.monitoringInterval = setInterval(() => {
      this.checkPerformanceMetrics();
    }, 5000); // A cada 5 segundos
    
    console.log('✅ Monitoramento de performance iniciado');
  }

  /**
   * Parar monitoramento de performance
   */
  stopMonitoring() {
    if (!this.isMonitoring) return;
    
    console.log('⏹️ Parando monitoramento de performance...');
    
    this.isMonitoring = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    console.log('✅ Monitoramento de performance parado');
  }

  /**
   * Analisar frame rate
   */
  analyzeFrameRate() {
    const fps = this.performanceMetrics.fps;
    
    // Detectar drops de frame
    if (fps < 50) {
      this.performanceMetrics.frameDrops++;
    }
    
    // Modo de emergência
    if (fps < this.optimizationSettings.emergencyModeThreshold && !this.isEmergencyMode) {
      console.warn('🚨 Performance crítica detectada, ativando modo de emergência');
      this.activateEmergencyMode();
    }
    
    // Modo de movimento reduzido
    else if (fps < this.optimizationSettings.reduceMotionThreshold) {
      console.warn('⚠️ Performance baixa detectada, reduzindo animações');
      this.activateReducedMotionMode();
    }
    
    // Recuperação de performance
    else if (fps > 50 && (this.isEmergencyMode || document.body.classList.contains('performance-reduced-motion'))) {
      console.log('✅ Performance recuperada, restaurando animações');
      this.deactivatePerformanceModes();
    }
  }

  /**
   * Ativar modo de emergência
   */
  activateEmergencyMode() {
    this.isEmergencyMode = true;
    document.body.classList.add('performance-emergency-mode');
    
    // Desabilitar animações complexas
    const complexElements = document.querySelectorAll('.glassmorphism-panel, .btn-primary-gradient');
    complexElements.forEach(el => {
      el.style.animation = 'none';
      el.style.transition = 'none';
    });
    
    // Notificar outros sistemas
    if (window.animationManager) {
      window.animationManager.pauseAllAnimations();
    }
    
    this.activeOptimizations.add('emergency-mode');
    console.log('🚨 Modo de emergência ativado');
  }

  /**
   * Ativar modo de movimento reduzido
   */
  activateReducedMotionMode() {
    document.body.classList.add('performance-reduced-motion');
    
    // Reduzir duração das animações
    const style = document.createElement('style');
    style.id = 'reduced-motion-override';
    style.textContent = `
      * {
        animation-duration: 0.2s !important;
        transition-duration: 0.2s !important;
      }
    `;
    document.head.appendChild(style);
    
    this.activeOptimizations.add('reduced-motion');
    console.log('⚠️ Modo de movimento reduzido ativado');
  }

  /**
   * Desativar modos de performance
   */
  deactivatePerformanceModes() {
    this.isEmergencyMode = false;
    document.body.classList.remove('performance-emergency-mode', 'performance-reduced-motion');
    
    // Remover overrides de estilo
    const reducedMotionStyle = document.getElementById('reduced-motion-override');
    if (reducedMotionStyle) {
      reducedMotionStyle.remove();
    }
    
    // Reativar animações
    if (window.animationManager) {
      window.animationManager.resumeAllAnimations();
    }
    
    this.activeOptimizations.delete('emergency-mode');
    this.activeOptimizations.delete('reduced-motion');
    
    console.log('✅ Modos de performance desativados');
  }

  /**
   * Verificar métricas de performance
   */
  checkPerformanceMetrics() {
    // Contar animações ativas
    const activeAnimations = document.querySelectorAll('[style*="animation"], [class*="animate-"]').length;
    this.performanceMetrics.animationCount = activeAnimations;
    
    // Verificar uso de memória
    if ('memory' in performance) {
      const memory = performance.memory;
      this.performanceMetrics.gpuMemoryUsage = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
    }
    
    // Aplicar throttling se necessário
    if (activeAnimations > this.optimizationSettings.maxConcurrentAnimations) {
      this.throttleAnimations();
    }
    
    // Log de métricas (apenas em desenvolvimento)
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      console.log('📊 Métricas de performance:', this.performanceMetrics);
    }
  }

  /**
   * Throttle de animações
   */
  throttleAnimations() {
    console.log('🎛️ Aplicando throttle de animações...');
    
    const animatedElements = document.querySelectorAll('[class*="animate-"]');
    const excess = animatedElements.length - this.optimizationSettings.maxConcurrentAnimations;
    
    // Pausar animações em excesso (começando pelas menos importantes)
    for (let i = animatedElements.length - 1; i >= animatedElements.length - excess; i--) {
      const element = animatedElements[i];
      element.style.animationPlayState = 'paused';
      
      // Retomar após um delay
      setTimeout(() => {
        element.style.animationPlayState = 'running';
      }, 1000);
    }
  }

  /**
   * Analisar entrada de performance
   */
  analyzePerformanceEntry(entry) {
    if (entry.name.includes('animation') || entry.name.includes('transition')) {
      if (entry.duration > 16.67) { // Mais de um frame a 60fps
        console.warn('⚠️ Animação lenta detectada:', entry.name, entry.duration + 'ms');
      }
    }
  }

  /**
   * Otimizar elemento específico
   */
  optimizeElement(element, options = {}) {
    if (!element) return;
    
    const {
      enableGPU = this.optimizationSettings.enableGPUAcceleration,
      enableWillChange = this.optimizationSettings.enableWillChange,
      enableContainment = true
    } = options;
    
    if (enableGPU) {
      element.style.transform = 'translateZ(0)';
      element.style.backfaceVisibility = 'hidden';
    }
    
    if (enableWillChange) {
      element.style.willChange = 'transform, opacity';
    }
    
    if (enableContainment) {
      element.style.contain = 'layout style';
    }
  }

  /**
   * Limpar otimizações
   */
  cleanup() {
    console.log('🧹 Limpando otimizações de performance...');
    
    // Parar monitoramento
    this.stopMonitoring();
    
    // Desconectar observers
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }
    
    // Remover estilos de otimização
    const optimizationStyle = document.getElementById('animation-performance-optimizations');
    if (optimizationStyle) {
      optimizationStyle.remove();
    }
    
    // Remover classes de performance
    document.body.classList.remove(
      'performance-emergency-mode',
      'performance-reduced-motion',
      'performance-low-end',
      'performance-high-end',
      'performance-mobile',
      'performance-integrated-gpu',
      'performance-dedicated-gpu',
      'performance-mobile-gpu'
    );
    
    this.activeOptimizations.clear();
    
    console.log('✅ Otimizações de performance limpas');
  }

  /**
   * Obter status das otimizações
   */
  getOptimizationStatus() {
    return {
      activeOptimizations: Array.from(this.activeOptimizations),
      performanceMetrics: { ...this.performanceMetrics },
      optimizationSettings: { ...this.optimizationSettings },
      deviceCapabilities: { ...this.deviceCapabilities },
      isEmergencyMode: this.isEmergencyMode,
      isMonitoring: this.isMonitoring
    };
  }
}

// Criar instância global
window.AnimationPerformanceOptimizer = AnimationPerformanceOptimizer;

// Exportar para uso em módulos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AnimationPerformanceOptimizer;
}