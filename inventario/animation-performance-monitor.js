/**
 * AnimationPerformanceMonitor - Sistema de monitoramento de performance de animações
 * Adaptado do módulo etiqueta-mercadoria para o módulo inventário
 * 
 * Requirements: 8.1, 8.5
 */

class AnimationPerformanceMonitor {
  constructor() {
    this.isMonitoring = false;
    this.frameCount = 0;
    this.lastTime = performance.now();
    this.fpsHistory = [];
    this.performanceMetrics = {
      averageFPS: 60,
      minFPS: 60,
      maxFPS: 60,
      frameDrops: 0,
      totalFrames: 0,
      monitoringDuration: 0
    };
    
    this.thresholds = {
      lowFPS: 30,        // FPS abaixo disso é considerado baixo
      criticalFPS: 15,   // FPS abaixo disso é crítico
      targetFPS: 60,     // FPS alvo
      historySize: 100   // Número de amostras de FPS para manter
    };
    
    this.deviceCapabilities = {
      isLowEnd: false,
      isMobile: false,
      supportsBackdropFilter: false,
      supportsTransform3D: false,
      memoryLimit: null
    };
    
    this.adaptiveSettings = {
      animationsEnabled: true,
      complexAnimationsEnabled: true,
      glassmorphismEnabled: true,
      staggerAnimationsEnabled: true,
      reducedMotion: false
    };

    this.callbacks = {
      onPerformanceDrop: [],
      onPerformanceRecover: [],
      onCriticalPerformance: []
    };

    this.monitoringInterval = null;
    this.startTime = null;
    
    console.log('📊 AnimationPerformanceMonitor inicializado');
    this.detectDeviceCapabilities();
  }

  /**
   * Detectar capacidades do dispositivo
   */
  detectDeviceCapabilities() {
    // Detectar se é dispositivo móvel
    this.deviceCapabilities.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // Detectar suporte a backdrop-filter
    this.deviceCapabilities.supportsBackdropFilter = CSS.supports('backdrop-filter', 'blur(1px)') || CSS.supports('-webkit-backdrop-filter', 'blur(1px)');
    
    // Detectar suporte a transform3d
    this.deviceCapabilities.supportsTransform3D = CSS.supports('transform', 'translate3d(0,0,0)');
    
    // Estimar se é dispositivo de baixo desempenho
    this.deviceCapabilities.isLowEnd = this.estimateIsLowEndDevice();
    
    // Detectar limite de memória (se disponível)
    if ('memory' in performance) {
      this.deviceCapabilities.memoryLimit = performance.memory.jsHeapSizeLimit;
    }
    
    console.log('🔍 Capacidades do dispositivo detectadas:', this.deviceCapabilities);
    
    // Aplicar configurações iniciais baseadas nas capacidades
    this.applyInitialOptimizations();
  }

  /**
   * Estimar se é um dispositivo de baixo desempenho
   */
  estimateIsLowEndDevice() {
    let lowEndScore = 0;
    
    // Verificar número de cores de CPU (se disponível)
    if ('hardwareConcurrency' in navigator) {
      if (navigator.hardwareConcurrency <= 2) {
        lowEndScore += 2;
      } else if (navigator.hardwareConcurrency <= 4) {
        lowEndScore += 1;
      }
    }
    
    // Verificar memória disponível (se disponível)
    if ('memory' in performance) {
      const memoryMB = performance.memory.jsHeapSizeLimit / (1024 * 1024);
      if (memoryMB < 512) {
        lowEndScore += 3;
      } else if (memoryMB < 1024) {
        lowEndScore += 2;
      } else if (memoryMB < 2048) {
        lowEndScore += 1;
      }
    }
    
    // Verificar se é dispositivo móvel
    if (this.deviceCapabilities.isMobile) {
      lowEndScore += 1;
    }
    
    // Verificar suporte a features avançadas
    if (!this.deviceCapabilities.supportsBackdropFilter) {
      lowEndScore += 1;
    }
    
    if (!this.deviceCapabilities.supportsTransform3D) {
      lowEndScore += 2;
    }
    
    // Considerar baixo desempenho se score >= 4
    return lowEndScore >= 4;
  }

  /**
   * Aplicar otimizações iniciais baseadas nas capacidades do dispositivo
   */
  applyInitialOptimizations() {
    if (this.deviceCapabilities.isLowEnd) {
      console.log('⚡ Dispositivo de baixo desempenho detectado - aplicando otimizações');
      this.adaptiveSettings.complexAnimationsEnabled = false;
      this.adaptiveSettings.glassmorphismEnabled = false;
      this.adaptiveSettings.staggerAnimationsEnabled = false;
      
      // Aplicar classe CSS para otimizações
      document.body.classList.add('low-end-device');
    }
    
    if (this.deviceCapabilities.isMobile) {
      console.log('📱 Dispositivo móvel detectado - aplicando otimizações móveis');
      document.body.classList.add('mobile-device');
    }
    
    if (!this.deviceCapabilities.supportsBackdropFilter) {
      console.log('🚫 Backdrop-filter não suportado - aplicando fallbacks');
      document.body.classList.add('no-backdrop-filter');
    }
  }

  /**
   * Iniciar monitoramento de performance
   */
  startMonitoring() {
    if (this.isMonitoring) {
      console.warn('📊 Monitoramento já está ativo');
      return;
    }

    this.isMonitoring = true;
    this.startTime = performance.now();
    this.frameCount = 0;
    this.lastTime = this.startTime;
    this.fpsHistory = [];
    
    // Reset métricas
    this.performanceMetrics = {
      averageFPS: 60,
      minFPS: 60,
      maxFPS: 60,
      frameDrops: 0,
      totalFrames: 0,
      monitoringDuration: 0
    };

    // Iniciar loop de monitoramento
    this.monitorFrame();
    
    // Configurar intervalo para análise periódica
    this.monitoringInterval = setInterval(() => {
      this.analyzePerformance();
    }, 1000); // Analisar a cada segundo

    console.log('📊 Monitoramento de performance iniciado');
  }

  /**
   * Parar monitoramento de performance
   */
  stopMonitoring() {
    if (!this.isMonitoring) {
      console.warn('📊 Monitoramento não está ativo');
      return;
    }

    this.isMonitoring = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    // Calcular métricas finais
    const endTime = performance.now();
    this.performanceMetrics.monitoringDuration = endTime - this.startTime;
    
    console.log('📊 Monitoramento de performance parado');
    console.log('📈 Métricas finais:', this.performanceMetrics);
    
    return this.performanceMetrics;
  }

  /**
   * Monitorar frame individual
   */
  monitorFrame() {
    if (!this.isMonitoring) return;

    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastTime;
    
    if (deltaTime > 0) {
      const fps = 1000 / deltaTime;
      
      // Adicionar ao histórico
      this.fpsHistory.push(fps);
      if (this.fpsHistory.length > this.thresholds.historySize) {
        this.fpsHistory.shift();
      }
      
      // Atualizar métricas
      this.performanceMetrics.totalFrames++;
      this.performanceMetrics.minFPS = Math.min(this.performanceMetrics.minFPS, fps);
      this.performanceMetrics.maxFPS = Math.max(this.performanceMetrics.maxFPS, fps);
      
      // Detectar frame drops
      if (fps < this.thresholds.lowFPS) {
        this.performanceMetrics.frameDrops++;
      }
      
      this.frameCount++;
    }
    
    this.lastTime = currentTime;
    
    // Continuar monitoramento
    requestAnimationFrame(() => this.monitorFrame());
  }

  /**
   * Analisar performance e aplicar ajustes automáticos
   */
  analyzePerformance() {
    if (this.fpsHistory.length === 0) return;

    // Calcular FPS médio
    const averageFPS = this.fpsHistory.reduce((sum, fps) => sum + fps, 0) / this.fpsHistory.length;
    this.performanceMetrics.averageFPS = averageFPS;

    // Calcular porcentagem de frames com baixo FPS
    const lowFPSFrames = this.fpsHistory.filter(fps => fps < this.thresholds.lowFPS).length;
    const lowFPSPercentage = (lowFPSFrames / this.fpsHistory.length) * 100;

    console.log(`📊 Performance atual: ${averageFPS.toFixed(1)} FPS médio, ${lowFPSPercentage.toFixed(1)}% frames baixos`);

    // Aplicar ajustes automáticos baseados na performance
    if (averageFPS < this.thresholds.criticalFPS) {
      this.handleCriticalPerformance();
    } else if (averageFPS < this.thresholds.lowFPS) {
      this.handleLowPerformance();
    } else if (averageFPS > this.thresholds.targetFPS * 0.9) {
      this.handleGoodPerformance();
    }
  }

  /**
   * Lidar com performance crítica
   */
  handleCriticalPerformance() {
    console.warn('🚨 Performance crítica detectada - aplicando otimizações agressivas');
    
    // Desabilitar todas as animações complexas
    this.adaptiveSettings.animationsEnabled = false;
    this.adaptiveSettings.complexAnimationsEnabled = false;
    this.adaptiveSettings.glassmorphismEnabled = false;
    this.adaptiveSettings.staggerAnimationsEnabled = false;
    
    // Aplicar classe CSS para performance crítica
    document.body.classList.add('critical-performance');
    
    // Notificar callbacks
    this.callbacks.onCriticalPerformance.forEach(callback => {
      try {
        callback(this.performanceMetrics);
      } catch (error) {
        console.error('Erro no callback de performance crítica:', error);
      }
    });
  }

  /**
   * Lidar com baixa performance
   */
  handleLowPerformance() {
    console.warn('⚠️ Baixa performance detectada - aplicando otimizações');
    
    // Reduzir complexidade das animações
    this.adaptiveSettings.complexAnimationsEnabled = false;
    this.adaptiveSettings.glassmorphismEnabled = false;
    
    // Aplicar classe CSS para baixa performance
    document.body.classList.add('low-performance');
    document.body.classList.remove('good-performance');
    
    // Notificar callbacks
    this.callbacks.onPerformanceDrop.forEach(callback => {
      try {
        callback(this.performanceMetrics);
      } catch (error) {
        console.error('Erro no callback de queda de performance:', error);
      }
    });
  }

  /**
   * Lidar com boa performance
   */
  handleGoodPerformance() {
    // Verificar se podemos reabilitar features
    if (!this.adaptiveSettings.complexAnimationsEnabled && !this.deviceCapabilities.isLowEnd) {
      console.log('✅ Boa performance detectada - reabilitando features');
      
      this.adaptiveSettings.complexAnimationsEnabled = true;
      
      if (this.deviceCapabilities.supportsBackdropFilter) {
        this.adaptiveSettings.glassmorphismEnabled = true;
      }
      
      // Aplicar classe CSS para boa performance
      document.body.classList.add('good-performance');
      document.body.classList.remove('low-performance', 'critical-performance');
      
      // Notificar callbacks
      this.callbacks.onPerformanceRecover.forEach(callback => {
        try {
          callback(this.performanceMetrics);
        } catch (error) {
          console.error('Erro no callback de recuperação de performance:', error);
        }
      });
    }
  }

  /**
   * Configurar ajustes automáticos de performance
   * @param {Object} options - Opções de configuração
   */
  configureAutoAdjustments(options = {}) {
    const {
      enableAutoDisable = true,
      enableAutoRecover = true,
      aggressiveOptimizations = false
    } = options;

    if (enableAutoDisable) {
      this.onPerformanceDrop((metrics) => {
        console.log('🔧 Auto-ajuste: Reduzindo complexidade das animações');
        
        // Reduzir durações das animações
        document.documentElement.style.setProperty('--animation-duration-entry', '300ms');
        document.documentElement.style.setProperty('--animation-duration-hover', '200ms');
        document.documentElement.style.setProperty('--animation-duration-feedback', '250ms');
        
        if (aggressiveOptimizations) {
          // Desabilitar animações de stagger
          document.body.classList.add('disable-stagger');
          
          // Reduzir blur do glassmorphism
          document.documentElement.style.setProperty('--glassmorphism-blur', 'blur(4px)');
        }
      });
    }

    if (enableAutoRecover) {
      this.onPerformanceRecover((metrics) => {
        console.log('🔧 Auto-ajuste: Restaurando animações normais');
        
        // Restaurar durações normais
        document.documentElement.style.removeProperty('--animation-duration-entry');
        document.documentElement.style.removeProperty('--animation-duration-hover');
        document.documentElement.style.removeProperty('--animation-duration-feedback');
        
        // Reabilitar features
        document.body.classList.remove('disable-stagger');
        document.documentElement.style.removeProperty('--glassmorphism-blur');
      });
    }
  }

  /**
   * Registrar callback para queda de performance
   * @param {Function} callback - Função a ser chamada
   */
  onPerformanceDrop(callback) {
    this.callbacks.onPerformanceDrop.push(callback);
  }

  /**
   * Registrar callback para recuperação de performance
   * @param {Function} callback - Função a ser chamada
   */
  onPerformanceRecover(callback) {
    this.callbacks.onPerformanceRecover.push(callback);
  }

  /**
   * Registrar callback para performance crítica
   * @param {Function} callback - Função a ser chamada
   */
  onCriticalPerformance(callback) {
    this.callbacks.onCriticalPerformance.push(callback);
  }

  /**
   * Obter métricas atuais de performance
   * @returns {Object} Métricas de performance
   */
  getMetrics() {
    return {
      ...this.performanceMetrics,
      currentFPS: this.fpsHistory.length > 0 ? this.fpsHistory[this.fpsHistory.length - 1] : 0,
      isMonitoring: this.isMonitoring,
      deviceCapabilities: this.deviceCapabilities,
      adaptiveSettings: this.adaptiveSettings
    };
  }

  /**
   * Obter recomendações de otimização
   * @returns {Array} Lista de recomendações
   */
  getOptimizationRecommendations() {
    const recommendations = [];
    
    if (this.performanceMetrics.averageFPS < this.thresholds.lowFPS) {
      recommendations.push({
        type: 'critical',
        message: 'FPS baixo detectado - considere desabilitar animações complexas',
        action: 'disable-complex-animations'
      });
    }
    
    if (this.deviceCapabilities.isLowEnd) {
      recommendations.push({
        type: 'warning',
        message: 'Dispositivo de baixo desempenho - use animações simplificadas',
        action: 'use-simple-animations'
      });
    }
    
    if (!this.deviceCapabilities.supportsBackdropFilter) {
      recommendations.push({
        type: 'info',
        message: 'Backdrop-filter não suportado - use fallbacks sólidos',
        action: 'use-solid-backgrounds'
      });
    }
    
    if (this.deviceCapabilities.isMobile) {
      recommendations.push({
        type: 'info',
        message: 'Dispositivo móvel - otimize para touch e performance',
        action: 'optimize-for-mobile'
      });
    }
    
    return recommendations;
  }

  /**
   * Aplicar otimizações baseadas em recomendações
   */
  applyRecommendedOptimizations() {
    const recommendations = this.getOptimizationRecommendations();
    
    recommendations.forEach(rec => {
      switch (rec.action) {
        case 'disable-complex-animations':
          document.body.classList.add('disable-complex-animations');
          break;
        case 'use-simple-animations':
          document.body.classList.add('simple-animations-only');
          break;
        case 'use-solid-backgrounds':
          document.body.classList.add('no-backdrop-filter');
          break;
        case 'optimize-for-mobile':
          document.body.classList.add('mobile-optimized');
          break;
      }
    });
    
    console.log('🔧 Otimizações recomendadas aplicadas:', recommendations.map(r => r.action));
  }

  /**
   * Resetar todas as otimizações
   */
  resetOptimizations() {
    const optimizationClasses = [
      'low-end-device', 'mobile-device', 'no-backdrop-filter',
      'critical-performance', 'low-performance', 'good-performance',
      'disable-stagger', 'disable-complex-animations', 'simple-animations-only',
      'mobile-optimized'
    ];
    
    optimizationClasses.forEach(className => {
      document.body.classList.remove(className);
    });
    
    // Resetar propriedades CSS customizadas
    const customProperties = [
      '--animation-duration-entry', '--animation-duration-hover',
      '--animation-duration-feedback', '--glassmorphism-blur'
    ];
    
    customProperties.forEach(property => {
      document.documentElement.style.removeProperty(property);
    });
    
    console.log('🔄 Todas as otimizações resetadas');
  }
}

// Criar instância global
window.AnimationPerformanceMonitor = AnimationPerformanceMonitor;

// Exportar para uso em módulos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AnimationPerformanceMonitor;
}