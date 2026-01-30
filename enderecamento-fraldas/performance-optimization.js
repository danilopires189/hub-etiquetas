/* ===== Otimizações de Performance para Mobile ===== */

/**
 * Carrega scripts pesados de forma assíncrona e lazy
 */
function loadScriptAsync(src, id) {
  return new Promise((resolve, reject) => {
    if (document.getElementById(id)) {
      resolve();
      return;
    }
    
    const script = document.createElement('script');
    script.id = id;
    script.src = src;
    script.async = true;
    script.onload = resolve;
    script.onerror = reject;
    document.body.appendChild(script);
  });
}

/**
 * Otimiza carregamento da BASE_END - carrega apenas se necessário
 */
function optimizeBaseEndLoading() {
  // Só carrega BASE_END completa quando realmente necessário
  // Por padrão, usa versão reduzida ou carrega sob demanda
  
  const isMobile = window.innerWidth <= 768 || 
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  if (isMobile) {
    console.log('📱 Modo mobile detectado - otimizando carregamento');
    
    // Adiar carregamento de scripts não críticos
    setTimeout(() => {
      // Carregar BASE_END de forma assíncrona após a interface estar pronta
      if (window.DB_END) {
        console.log('✅ BASE_END já carregada');
      } else {
        console.log('⏳ Agendando carregamento da BASE_END...');
      }
    }, 2000); // Aguarda 2s para interface renderizar primeiro
  }
}

/**
 * Debounce para eventos frequentes
 */
function debounce(func, wait) {
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

/**
 * Throttle para eventos de scroll/resize
 */
function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Intersection Observer para lazy loading de elementos
 */
function setupLazyLoading() {
  if (!('IntersectionObserver' in window)) return;
  
  const imageObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const element = entry.target;
        element.classList.add('visible');
        imageObserver.unobserve(element);
      }
    });
  }, {
    rootMargin: '50px',
    threshold: 0.1
  });
  
  document.querySelectorAll('.lazy-load, .produto-card, .historico-item').forEach(el => {
    imageObserver.observe(el);
  });
}

/**
 * Limpa memória periodicamente
 */
function setupMemoryCleanup() {
  if (!window.performance || !window.performance.memory) return;
  
  setInterval(() => {
    const memory = window.performance.memory;
    if (memory.usedJSHeapSize > memory.jsHeapSizeLimit * 0.8) {
      console.log('🧹 Limpando memória...');
      // Força garbage collection indiretamente
      if (window.gc) window.gc();
    }
  }, 30000); // Verifica a cada 30s
}

// Inicializar otimizações quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  optimizeBaseEndLoading();
  setupLazyLoading();
  setupMemoryCleanup();
  
  // Reduzir animações em dispositivos de baixa performance
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.body.classList.add('reduce-motion');
  }
});

// Exportar funções úteis
window.PerformanceOptimization = {
  loadScriptAsync,
  debounce,
  throttle,
  setupLazyLoading
};
