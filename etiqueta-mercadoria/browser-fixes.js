/**
 * Correções Específicas do Navegador - Etiqueta Mercadoria
 * Resolve problemas relacionados ao cache do navegador e impressão
 */

// Detectar tipo de navegador
const browserInfo = {
    isChrome: /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor),
    isFirefox: /Firefox/.test(navigator.userAgent),
    isEdge: /Edg/.test(navigator.userAgent),
    isSafari: /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent)
};

console.log('🌐 Navegador detectado:', browserInfo);

// Função para limpar cache específico do navegador
function clearBrowserCache() {
    console.log('🧹 Limpando cache do navegador...');
    
    try {
        // Limpar localStorage relacionado ao módulo
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.includes('mercadoria') || key.includes('etiqueta') || key.includes('barcode'))) {
                keysToRemove.push(key);
            }
        }
        
        keysToRemove.forEach(key => {
            localStorage.removeItem(key);
            console.log(`🗑️ Removido do localStorage: ${key}`);
        });
        
        // Limpar sessionStorage
        sessionStorage.removeItem('mercadoria-temp');
        sessionStorage.removeItem('etiqueta-temp');
        
        // Forçar limpeza de cache de imagens
        const images = document.querySelectorAll('img');
        images.forEach(img => {
            if (img.src) {
                img.src = img.src + '?t=' + Date.now();
            }
        });
        
        console.log('✅ Cache do navegador limpo');
        return true;
    } catch (error) {
        console.error('❌ Erro ao limpar cache:', error);
        return false;
    }
}

// Função para forçar atualização de recursos
function forceResourceRefresh() {
    console.log('🔄 Forçando atualização de recursos...');
    
    try {
        // Recarregar CSS
        const stylesheets = document.querySelectorAll('link[rel="stylesheet"]');
        stylesheets.forEach(link => {
            const href = link.href;
            if (href && !href.includes('?')) {
                link.href = href + '?v=' + Date.now();
            }
        });
        
        // Limpar cache de fontes
        if ('fonts' in document) {
            document.fonts.clear();
        }
        
        console.log('✅ Recursos atualizados');
    } catch (error) {
        console.error('❌ Erro ao atualizar recursos:', error);
    }
}

// Correções específicas para Chrome
function applyChromefixes() {
    if (!browserInfo.isChrome) return;
    
    console.log('🔧 Aplicando correções para Chrome...');
    
    // Corrigir problema de impressão no Chrome
    const originalPrint = window.print;
    window.print = function() {
        // Garantir que o documento está pronto
        if (document.readyState !== 'complete') {
            setTimeout(() => window.print(), 100);
            return;
        }
        
        // Aplicar correções específicas do Chrome
        document.body.style.webkitPrintColorAdjust = 'exact';
        
        // Executar impressão
        originalPrint.call(this);
        
        // Limpar após impressão
        setTimeout(() => {
            document.body.style.webkitPrintColorAdjust = '';
        }, 1000);
    };
    
    console.log('✅ Correções do Chrome aplicadas');
}

// Correções específicas para Firefox
function applyFirefoxFixes() {
    if (!browserInfo.isFirefox) return;
    
    console.log('🔧 Aplicando correções para Firefox...');
    
    // Corrigir problema de renderização no Firefox
    const style = document.createElement('style');
    style.textContent = `
        @-moz-document url-prefix() {
            .label-badge {
                -moz-osx-font-smoothing: grayscale;
            }
            
            .barcode-svg {
                image-rendering: -moz-crisp-edges;
            }
        }
    `;
    document.head.appendChild(style);
    
    console.log('✅ Correções do Firefox aplicadas');
}

// Correções específicas para Edge
function applyEdgeFixes() {
    if (!browserInfo.isEdge) return;
    
    console.log('🔧 Aplicando correções para Edge...');
    
    // Corrigir problema de impressão no Edge
    const originalPrint = window.print;
    window.print = function() {
        // Edge precisa de um delay maior
        setTimeout(() => {
            originalPrint.call(this);
        }, 150);
    };
    
    console.log('✅ Correções do Edge aplicadas');
}

// Função para detectar e corrigir problemas de cache
function detectAndFixCacheIssues() {
    console.log('🔍 Detectando problemas de cache...');
    
    const issues = [];
    
    // Verificar se há dados corrompidos no localStorage
    try {
        const testKey = 'cache-test-' + Date.now();
        localStorage.setItem(testKey, 'test');
        localStorage.removeItem(testKey);
    } catch (error) {
        issues.push('localStorage com problemas');
    }
    
    // Verificar se há recursos não carregados
    const scripts = document.querySelectorAll('script[src]');
    scripts.forEach(script => {
        if (!script.src || script.src.includes('undefined')) {
            issues.push('Script com URL inválida');
        }
    });
    
    // Verificar se há elementos DOM corrompidos
    const labels = document.querySelectorAll('.label-badge');
    labels.forEach(label => {
        if (!label.innerHTML || label.innerHTML.trim() === '') {
            issues.push('Etiqueta vazia detectada');
        }
    });
    
    if (issues.length > 0) {
        console.warn('⚠️ Problemas detectados:', issues);
        
        // Aplicar correções automáticas
        if (issues.includes('localStorage com problemas')) {
            clearBrowserCache();
        }
        
        if (issues.includes('Script com URL inválida')) {
            forceResourceRefresh();
        }
        
        if (issues.includes('Etiqueta vazia detectada')) {
            // Limpar área de prévia
            const preview = document.getElementById('screen-preview');
            if (preview) {
                preview.innerHTML = '<p style="color: #6b7280; font-style: italic;">A etiqueta gerada aparecerá aqui...</p>';
            }
        }
        
        return issues;
    }
    
    console.log('✅ Nenhum problema de cache detectado');
    return [];
}

// Função para monitorar performance e detectar degradação
function monitorPerformance() {
    let performanceData = {
        renderTimes: [],
        printTimes: [],
        lastCheck: Date.now()
    };
    
    // Interceptar operações para monitorar
    const originalGenerateLabel = window.generateLabel;
    if (originalGenerateLabel) {
        window.generateLabel = function(...args) {
            const startTime = performance.now();
            const result = originalGenerateLabel.apply(this, args);
            const endTime = performance.now();
            
            const renderTime = endTime - startTime;
            performanceData.renderTimes.push(renderTime);
            
            // Manter apenas os últimos 10 tempos
            if (performanceData.renderTimes.length > 10) {
                performanceData.renderTimes.shift();
            }
            
            // Verificar se a performance está degradando
            if (performanceData.renderTimes.length >= 5) {
                const avgTime = performanceData.renderTimes.reduce((a, b) => a + b, 0) / performanceData.renderTimes.length;
                
                if (avgTime > 500) { // Mais de 500ms é muito lento
                    console.warn('⚠️ Performance degradada detectada. Limpando caches...');
                    clearBrowserCache();
                    
                    // Limpar dados de performance
                    performanceData.renderTimes = [];
                }
            }
            
            return result;
        };
    }
    
    console.log('📊 Monitoramento de performance ativo');
}

// Função para aplicar todas as correções do navegador
function applyAllBrowserFixes() {
    console.log('🔧 Aplicando correções específicas do navegador...');
    
    // Detectar e corrigir problemas existentes
    detectAndFixCacheIssues();
    
    // Aplicar correções específicas por navegador
    applyChromefixes();
    applyFirefoxFixes();
    applyEdgeFixes();
    
    // Iniciar monitoramento
    monitorPerformance();
    
    // Adicionar botão de limpeza de cache (para debug)
    if (window.location.search.includes('debug=true')) {
        const debugButton = document.createElement('button');
        debugButton.textContent = '🧹 Limpar Cache';
        debugButton.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            z-index: 9999;
            padding: 8px 12px;
            background: #ef4444;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
        `;
        debugButton.onclick = () => {
            clearBrowserCache();
            forceResourceRefresh();
            location.reload();
        };
        document.body.appendChild(debugButton);
    }
    
    console.log('✅ Correções do navegador aplicadas');
}

// Aplicar correções quando o DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyAllBrowserFixes);
} else {
    applyAllBrowserFixes();
}

// Exportar funções para uso global
window.browserFixes = {
    clearBrowserCache,
    forceResourceRefresh,
    detectAndFixCacheIssues,
    applyAllBrowserFixes,
    browserInfo
};

console.log('🌐 Correções do navegador carregadas');