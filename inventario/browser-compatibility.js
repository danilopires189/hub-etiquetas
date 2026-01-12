/**
 * Browser Compatibility Detection
 * Detects support for modern CSS features and adds fallback classes
 * 
 * Requirements: 7.4 - Browser compatibility fallbacks
 */

(function() {
  'use strict';

  /**
   * Detect backdrop-filter support
   * @returns {boolean}
   */
  function supportsBackdropFilter() {
    return CSS.supports('backdrop-filter', 'blur(1px)') || 
           CSS.supports('-webkit-backdrop-filter', 'blur(1px)');
  }

  /**
   * Detect CSS custom properties support
   * @returns {boolean}
   */
  function supportsCSSVariables() {
    return window.CSS && CSS.supports('color', 'var(--fake-var)');
  }

  /**
   * Detect CSS Grid support
   * @returns {boolean}
   */
  function supportsCSSGrid() {
    return CSS.supports('display', 'grid');
  }

  /**
   * Detect CSS transforms support
   * @returns {boolean}
   */
  function supportsTransforms() {
    return CSS.supports('transform', 'translateY(1px)');
  }

  /**
   * Detect if browser is Internet Explorer
   * @returns {boolean}
   */
  function isInternetExplorer() {
    return navigator.userAgent.indexOf('MSIE') !== -1 || 
           navigator.userAgent.indexOf('Trident') !== -1;
  }

  /**
   * Detect if browser is Safari (which has limited backdrop-filter support)
   * @returns {boolean}
   */
  function isSafari() {
    return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  }

  /**
   * Get browser performance level based on user agent and features
   * @returns {string} 'high', 'medium', or 'low'
   */
  function getBrowserPerformanceLevel() {
    const userAgent = navigator.userAgent.toLowerCase();
    
    // Low performance browsers
    if (isInternetExplorer() || 
        userAgent.includes('edge/') && !userAgent.includes('edg/') || // Old Edge
        userAgent.includes('android') && userAgent.includes('chrome/') && 
        parseInt(userAgent.match(/chrome\/(\d+)/)?.[1] || '0') < 70) {
      return 'low';
    }
    
    // Medium performance browsers
    if (isSafari() || 
        userAgent.includes('firefox') && 
        parseInt(userAgent.match(/firefox\/(\d+)/)?.[1] || '0') < 80) {
      return 'medium';
    }
    
    // High performance browsers (modern Chrome, Firefox, Safari, Edge)
    return 'high';
  }

  /**
   * Apply compatibility classes to document body
   */
  function applyCompatibilityClasses() {
    const body = document.body;
    const classes = [];

    // Feature detection classes
    if (!supportsBackdropFilter()) {
      classes.push('no-backdrop-filter');
      console.log('🔧 Backdrop-filter not supported, applying fallbacks');
    }

    if (!supportsCSSVariables()) {
      classes.push('no-css-variables');
      console.log('🔧 CSS variables not supported, applying fallbacks');
    }

    if (!supportsCSSGrid()) {
      classes.push('no-css-grid');
      console.log('🔧 CSS Grid not supported, applying fallbacks');
    }

    if (!supportsTransforms()) {
      classes.push('no-transforms');
      console.log('🔧 CSS transforms not supported, applying fallbacks');
    }

    // Browser-specific classes
    if (isInternetExplorer()) {
      classes.push('ie-browser');
      console.log('🔧 Internet Explorer detected, applying fallbacks');
    }

    if (isSafari()) {
      classes.push('safari-browser');
      console.log('🔧 Safari detected, applying specific optimizations');
    }

    // Performance level classes
    const performanceLevel = getBrowserPerformanceLevel();
    classes.push(`performance-${performanceLevel}`);
    console.log(`🔧 Browser performance level: ${performanceLevel}`);

    // Apply all classes
    body.classList.add(...classes);

    return {
      supportsBackdropFilter: supportsBackdropFilter(),
      supportsCSSVariables: supportsCSSVariables(),
      supportsCSSGrid: supportsCSSGrid(),
      supportsTransforms: supportsTransforms(),
      isInternetExplorer: isInternetExplorer(),
      isSafari: isSafari(),
      performanceLevel: performanceLevel,
      appliedClasses: classes
    };
  }

  /**
   * Optimize animations based on browser performance
   */
  function optimizeAnimations() {
    const performanceLevel = getBrowserPerformanceLevel();
    const root = document.documentElement;

    switch (performanceLevel) {
      case 'low':
        // Disable complex animations for low-performance browsers
        root.style.setProperty('--animation-duration-entry', '0.2s');
        root.style.setProperty('--animation-duration-hover', '0.1s');
        root.style.setProperty('--animation-duration-feedback', '0.2s');
        console.log('🔧 Reduced animation durations for low-performance browser');
        break;
        
      case 'medium':
        // Reduce animation complexity for medium-performance browsers
        root.style.setProperty('--animation-duration-entry', '0.4s');
        root.style.setProperty('--animation-duration-hover', '0.2s');
        root.style.setProperty('--animation-duration-feedback', '0.3s');
        console.log('🔧 Optimized animation durations for medium-performance browser');
        break;
        
      case 'high':
        // Keep full animations for high-performance browsers
        console.log('🔧 Full animations enabled for high-performance browser');
        break;
    }
  }

  /**
   * Test backdrop-filter support with actual element
   * @returns {boolean}
   */
  function testBackdropFilterSupport() {
    const testElement = document.createElement('div');
    testElement.style.backdropFilter = 'blur(1px)';
    testElement.style.webkitBackdropFilter = 'blur(1px)';
    
    return testElement.style.backdropFilter !== '' || 
           testElement.style.webkitBackdropFilter !== '';
  }

  /**
   * Initialize browser compatibility detection
   */
  function init() {
    console.log('🔧 Initializing browser compatibility detection...');
    
    const compatibility = applyCompatibilityClasses();
    optimizeAnimations();
    
    // Additional runtime test for backdrop-filter
    if (compatibility.supportsBackdropFilter && !testBackdropFilterSupport()) {
      document.body.classList.add('no-backdrop-filter');
      console.log('🔧 Runtime test: backdrop-filter not working, applying fallbacks');
    }
    
    // Store compatibility info globally for debugging
    window.BrowserCompatibility = compatibility;
    
    console.log('✅ Browser compatibility detection complete:', compatibility);
    
    return compatibility;
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Export for manual testing
  window.BrowserCompatibilityDetector = {
    init,
    supportsBackdropFilter,
    supportsCSSVariables,
    supportsCSSGrid,
    supportsTransforms,
    isInternetExplorer,
    isSafari,
    getBrowserPerformanceLevel,
    testBackdropFilterSupport
  };

})();