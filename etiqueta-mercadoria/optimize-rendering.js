/**
 * Otimizações de Renderização - Etiqueta Mercadoria
 * Melhora a performance da geração de etiquetas e prévia
 */

// Pool de elementos reutilizáveis para melhor performance
const elementPool = {
    labels: [],
    barcodes: [],
    maxSize: 5
};

// Função para obter elemento reutilizável do pool
function getPooledElement(type, creator) {
    const pool = elementPool[type];
    if (pool && pool.length > 0) {
        return pool.pop();
    }
    return creator();
}

// Função para retornar elemento ao pool
function returnToPool(type, element) {
    const pool = elementPool[type];
    if (pool && pool.length < elementPool.maxSize) {
        // Limpar elemento antes de retornar ao pool
        element.innerHTML = '';
        element.className = '';
        element.style.cssText = '';
        pool.push(element);
    }
}

// Otimização da geração de código de barras
let barcodeCache = new Map();

function generateOptimizedBarcode(barcode, width = 2, height = 50) {
    // Verificar cache primeiro
    const cacheKey = `${barcode}-${width}-${height}`;
    if (barcodeCache.has(cacheKey)) {
        const cached = barcodeCache.get(cacheKey);
        return cached.cloneNode(true);
    }

    try {
        // Criar SVG otimizado
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('class', 'barcode-svg');
        svg.style.height = '100%';
        svg.style.width = 'auto';
        svg.style.maxWidth = '100%';
        svg.style.display = 'block';

        // Usar JsBarcode de forma otimizada
        JsBarcode(svg, barcode, {
            format: "CODE128",
            width: width,
            height: height,
            displayValue: false,
            margin: 0,
            background: "transparent",
            lineColor: "#000"
        });

        // Armazenar no cache
        if (barcodeCache.size > 50) {
            const firstKey = barcodeCache.keys().next().value;
            barcodeCache.delete(firstKey);
        }
        barcodeCache.set(cacheKey, svg.cloneNode(true));

        return svg;
    } catch (error) {
        console.warn('Erro ao gerar código de barras otimizado:', error);
        // Fallback para método original
        const fallbackSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        fallbackSvg.innerHTML = '<text x="10" y="20" font-size="12">Erro no código</text>';
        return fallbackSvg;
    }
}

// Otimização da formatação de descrição com cache melhorado
const descriptionCache = new Map();

function formatDescriptionOptimized(description, containerWidth = 210) {
    const cacheKey = `${description}-${containerWidth}`;
    
    if (descriptionCache.has(cacheKey)) {
        return descriptionCache.get(cacheKey);
    }

    try {
        // Usar a função original mas com cache
        const formatted = formatDescriptionForLabel(description, containerWidth);
        
        // Limitar tamanho do cache
        if (descriptionCache.size > 100) {
            const firstKey = descriptionCache.keys().next().value;
            descriptionCache.delete(firstKey);
        }
        
        descriptionCache.set(cacheKey, formatted);
        return formatted;
    } catch (error) {
        console.warn('Erro na formatação otimizada:', error);
        return `<div class="label-desc">${description || 'Produto'}</div>`;
    }
}

// Função otimizada para criar elementos DOM
function createOptimizedElement(tag, className, content) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (content) element.innerHTML = content;
    return element;
}

// Interceptar e otimizar a função generateLabel original
function optimizeGenerateLabel() {
    if (typeof window.generateLabel === 'undefined') {
        setTimeout(optimizeGenerateLabel, 100);
        return;
    }

    const originalGenerateLabel = window.generateLabel;
    
    window.generateLabel = function(product, targetAddress, barcode, copies, validityDate, includeZona, selectedDeposito) {
        console.log('⚡ Gerando etiqueta com otimizações...');
        const startTime = performance.now();

        try {
            // Usar pool de elementos quando possível
            const container = createOptimizedElement('div');
            
            // Aplicar otimizações específicas
            container.style.willChange = 'transform';
            container.style.contain = 'layout style paint';
            
            // Gerar usando função original mas com elementos otimizados
            const result = originalGenerateLabel.call(this, product, targetAddress, barcode, copies, validityDate, includeZona, selectedDeposito);
            
            // Otimizar código de barras se presente
            const barcodeElements = result.querySelectorAll('.barcode-svg');
            barcodeElements.forEach(barcodeEl => {
                try {
                    const optimizedBarcode = generateOptimizedBarcode(barcode, 2, 50);
                    barcodeEl.parentNode.replaceChild(optimizedBarcode, barcodeEl);
                } catch (error) {
                    console.warn('Erro ao otimizar código de barras:', error);
                }
            });

            const endTime = performance.now();
            console.log(`⚡ Etiqueta gerada em ${(endTime - startTime).toFixed(1)}ms`);
            
            return result;
        } catch (error) {
            console.error('Erro na geração otimizada, usando fallback:', error);
            return originalGenerateLabel.call(this, product, targetAddress, barcode, copies, validityDate, includeZona, selectedDeposito);
        }
    };
    
    console.log('✅ Função generateLabel otimizada');
}

// Otimização de CSS para melhor performance de renderização
function applyCSSOptimizations() {
    const style = document.createElement('style');
    style.textContent = `
        /* Otimizações de performance para etiquetas */
        .label-badge {
            will-change: transform;
            contain: layout style paint;
            transform: translateZ(0);
            backface-visibility: hidden;
        }
        
        .label-desc {
            contain: layout style;
            will-change: font-size;
        }
        
        .barcode-svg {
            contain: layout style paint;
            transform: translateZ(0);
        }
        
        #preview-section {
            contain: layout;
        }
        
        #print-area {
            contain: strict;
        }
        
        /* Otimizar transições */
        .preview-container {
            transition: opacity 0.2s ease;
        }
        
        /* Reduzir repaints */
        .label-row-top,
        .label-row-middle,
        .label-row-bottom {
            contain: layout style;
        }
    `;
    document.head.appendChild(style);
    console.log('✅ Otimizações CSS aplicadas');
}

// Função para limpar todos os caches
function clearAllCaches() {
    barcodeCache.clear();
    descriptionCache.clear();
    elementPool.labels = [];
    elementPool.barcodes = [];
    console.log('🧹 Todos os caches de renderização limpos');
}

// Monitoramento de performance
function monitorRenderingPerformance() {
    let renderCount = 0;
    let totalRenderTime = 0;
    
    const originalGenerateLabel = window.generateLabel;
    if (originalGenerateLabel) {
        window.generateLabel = function(...args) {
            const startTime = performance.now();
            const result = originalGenerateLabel.apply(this, args);
            const endTime = performance.now();
            
            renderCount++;
            totalRenderTime += (endTime - startTime);
            
            if (renderCount % 10 === 0) {
                const avgTime = totalRenderTime / renderCount;
                console.log(`📊 Performance: ${renderCount} etiquetas, média ${avgTime.toFixed(1)}ms`);
                
                if (avgTime > 100) {
                    console.warn('⚠️ Performance de renderização degradada');
                }
            }
            
            return result;
        };
    }
}

// Aplicar todas as otimizações
function applyAllRenderingOptimizations() {
    console.log('⚡ Aplicando otimizações de renderização...');
    
    applyCSSOptimizations();
    optimizeGenerateLabel();
    monitorRenderingPerformance();
    
    // Limpeza automática de cache
    setInterval(() => {
        if (barcodeCache.size > 30 || descriptionCache.size > 50) {
            console.log('🧹 Limpeza automática de cache de renderização');
            if (barcodeCache.size > 30) {
                const keysToDelete = Array.from(barcodeCache.keys()).slice(0, 10);
                keysToDelete.forEach(key => barcodeCache.delete(key));
            }
            if (descriptionCache.size > 50) {
                const keysToDelete = Array.from(descriptionCache.keys()).slice(0, 20);
                keysToDelete.forEach(key => descriptionCache.delete(key));
            }
        }
    }, 120000); // 2 minutos
    
    console.log('✅ Otimizações de renderização aplicadas');
}

// Aplicar otimizações quando possível
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(applyAllRenderingOptimizations, 300);
    });
} else {
    setTimeout(applyAllRenderingOptimizations, 300);
}

// Exportar funções para uso global
window.renderingOptimizations = {
    generateOptimizedBarcode,
    formatDescriptionOptimized,
    clearAllCaches,
    applyAllRenderingOptimizations
};

console.log('⚡ Otimizações de renderização carregadas');