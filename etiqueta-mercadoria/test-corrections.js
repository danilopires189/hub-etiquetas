/**
 * Script de Teste - Correções Etiqueta Mercadoria
 * Verifica se todas as correções estão funcionando corretamente
 */

// Função para executar todos os testes
async function runAllTests() {
    console.log('🧪 Iniciando testes das correções...\n');
    
    const results = {
        passed: 0,
        failed: 0,
        total: 0,
        details: []
    };
    
    // Teste 1: Verificar se as correções estão carregadas
    results.total++;
    console.log('📋 Teste 1: Verificando carregamento das correções...');
    
    const corrections = [
        { name: 'performanceOptimizations', obj: window.performanceOptimizations },
        { name: 'renderingOptimizations', obj: window.renderingOptimizations },
        { name: 'browserFixes', obj: window.browserFixes }
    ];
    
    let allLoaded = true;
    corrections.forEach(correction => {
        if (correction.obj) {
            console.log(`  ✅ ${correction.name} carregado`);
        } else {
            console.log(`  ❌ ${correction.name} NÃO carregado`);
            allLoaded = false;
        }
    });
    
    if (allLoaded) {
        results.passed++;
        results.details.push('✅ Todas as correções carregadas');
    } else {
        results.failed++;
        results.details.push('❌ Algumas correções não carregadas');
    }
    
    // Teste 2: Verificar performance de renderização
    results.total++;
    console.log('\n📋 Teste 2: Testando performance de renderização...');
    
    try {
        const startTime = performance.now();
        
        // Simular geração de etiqueta
        if (window.renderingOptimizations && window.renderingOptimizations.generateOptimizedBarcode) {
            const testBarcode = window.renderingOptimizations.generateOptimizedBarcode('7891234567890');
            const endTime = performance.now();
            const renderTime = endTime - startTime;
            
            console.log(`  ⏱️ Tempo de renderização: ${renderTime.toFixed(1)}ms`);
            
            if (renderTime < 100) {
                console.log('  ✅ Performance excelente (< 100ms)');
                results.passed++;
                results.details.push(`✅ Renderização rápida: ${renderTime.toFixed(1)}ms`);
            } else if (renderTime < 500) {
                console.log('  ⚠️ Performance aceitável (< 500ms)');
                results.passed++;
                results.details.push(`⚠️ Renderização aceitável: ${renderTime.toFixed(1)}ms`);
            } else {
                console.log('  ❌ Performance ruim (> 500ms)');
                results.failed++;
                results.details.push(`❌ Renderização lenta: ${renderTime.toFixed(1)}ms`);
            }
        } else {
            console.log('  ❌ Função de renderização otimizada não encontrada');
            results.failed++;
            results.details.push('❌ Renderização otimizada indisponível');
        }
    } catch (error) {
        console.log('  ❌ Erro no teste de renderização:', error.message);
        results.failed++;
        results.details.push('❌ Erro no teste de renderização');
    }
    
    // Teste 3: Verificar cache
    results.total++;
    console.log('\n📋 Teste 3: Testando sistema de cache...');
    
    try {
        if (window.renderingOptimizations && window.renderingOptimizations.clearAllCaches) {
            window.renderingOptimizations.clearAllCaches();
            console.log('  ✅ Cache limpo com sucesso');
            results.passed++;
            results.details.push('✅ Sistema de cache funcionando');
        } else {
            console.log('  ❌ Função de limpeza de cache não encontrada');
            results.failed++;
            results.details.push('❌ Sistema de cache indisponível');
        }
    } catch (error) {
        console.log('  ❌ Erro no teste de cache:', error.message);
        results.failed++;
        results.details.push('❌ Erro no sistema de cache');
    }
    
    // Teste 4: Verificar correções do navegador
    results.total++;
    console.log('\n📋 Teste 4: Verificando correções do navegador...');
    
    try {
        if (window.browserFixes && window.browserFixes.browserInfo) {
            const browserInfo = window.browserFixes.browserInfo;
            console.log('  🌐 Navegador detectado:', browserInfo);
            
            let browserDetected = false;
            Object.keys(browserInfo).forEach(key => {
                if (browserInfo[key] === true) {
                    console.log(`  ✅ ${key} detectado e otimizado`);
                    browserDetected = true;
                }
            });
            
            if (browserDetected) {
                results.passed++;
                results.details.push('✅ Navegador detectado e otimizado');
            } else {
                results.failed++;
                results.details.push('❌ Navegador não detectado');
            }
        } else {
            console.log('  ❌ Informações do navegador não disponíveis');
            results.failed++;
            results.details.push('❌ Detecção de navegador indisponível');
        }
    } catch (error) {
        console.log('  ❌ Erro no teste do navegador:', error.message);
        results.failed++;
        results.details.push('❌ Erro na detecção do navegador');
    }
    
    // Teste 5: Verificar função de impressão otimizada
    results.total++;
    console.log('\n📋 Teste 5: Verificando função de impressão...');
    
    try {
        if (window.performanceOptimizations && window.performanceOptimizations.guaranteedPrint) {
            console.log('  ✅ Função de impressão garantida disponível');
            results.passed++;
            results.details.push('✅ Impressão garantida disponível');
        } else {
            console.log('  ❌ Função de impressão garantida não encontrada');
            results.failed++;
            results.details.push('❌ Impressão garantida indisponível');
        }
        
        // Verificar se executePrint foi otimizada
        if (typeof window.executePrint === 'function') {
            console.log('  ✅ Função executePrint disponível');
        } else {
            console.log('  ⚠️ Função executePrint não encontrada (pode ser normal)');
        }
    } catch (error) {
        console.log('  ❌ Erro no teste de impressão:', error.message);
        results.failed++;
        results.details.push('❌ Erro no teste de impressão');
    }
    
    // Teste 6: Verificar elementos DOM necessários
    results.total++;
    console.log('\n📋 Teste 6: Verificando elementos DOM...');
    
    const requiredElements = [
        '#screen-preview',
        '#print-area',
        '#form-search',
        '#input-barcode'
    ];
    
    let allElementsFound = true;
    requiredElements.forEach(selector => {
        const element = document.querySelector(selector);
        if (element) {
            console.log(`  ✅ ${selector} encontrado`);
        } else {
            console.log(`  ❌ ${selector} NÃO encontrado`);
            allElementsFound = false;
        }
    });
    
    if (allElementsFound) {
        results.passed++;
        results.details.push('✅ Todos os elementos DOM encontrados');
    } else {
        results.failed++;
        results.details.push('❌ Alguns elementos DOM não encontrados');
    }
    
    // Exibir resultados finais
    console.log('\n' + '='.repeat(50));
    console.log('📊 RESULTADOS DOS TESTES');
    console.log('='.repeat(50));
    console.log(`✅ Testes aprovados: ${results.passed}/${results.total}`);
    console.log(`❌ Testes falharam: ${results.failed}/${results.total}`);
    console.log(`📈 Taxa de sucesso: ${((results.passed / results.total) * 100).toFixed(1)}%`);
    
    console.log('\n📋 Detalhes:');
    results.details.forEach(detail => console.log(`  ${detail}`));
    
    if (results.passed === results.total) {
        console.log('\n🎉 TODOS OS TESTES PASSARAM!');
        console.log('✅ As correções estão funcionando corretamente.');
    } else if (results.passed >= results.total * 0.8) {
        console.log('\n⚠️ MAIORIA DOS TESTES PASSOU');
        console.log('⚠️ Algumas funcionalidades podem ter problemas menores.');
    } else {
        console.log('\n❌ MUITOS TESTES FALHARAM');
        console.log('❌ Verifique se todas as correções foram aplicadas corretamente.');
    }
    
    console.log('\n💡 Para executar testes novamente: runAllTests()');
    console.log('💡 Para limpar caches: clearAllCaches()');
    
    return results;
}

// Função para limpar todos os caches
function clearAllCaches() {
    console.log('🧹 Limpando todos os caches...');
    
    try {
        if (window.renderingOptimizations && window.renderingOptimizations.clearAllCaches) {
            window.renderingOptimizations.clearAllCaches();
        }
        
        if (window.browserFixes && window.browserFixes.clearBrowserCache) {
            window.browserFixes.clearBrowserCache();
        }
        
        console.log('✅ Todos os caches limpos');
    } catch (error) {
        console.error('❌ Erro ao limpar caches:', error);
    }
}

// Função para testar performance específica
function testPerformance() {
    console.log('⚡ Testando performance específica...');
    
    const iterations = 10;
    const times = [];
    
    for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        
        // Simular operação pesada
        if (window.renderingOptimizations && window.renderingOptimizations.generateOptimizedBarcode) {
            window.renderingOptimizations.generateOptimizedBarcode('7891234567890');
        }
        
        const endTime = performance.now();
        times.push(endTime - startTime);
    }
    
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    
    console.log(`📊 Performance (${iterations} iterações):`);
    console.log(`  ⏱️ Tempo médio: ${avgTime.toFixed(1)}ms`);
    console.log(`  ⚡ Tempo mínimo: ${minTime.toFixed(1)}ms`);
    console.log(`  🐌 Tempo máximo: ${maxTime.toFixed(1)}ms`);
    
    if (avgTime < 50) {
        console.log('  ✅ Performance excelente!');
    } else if (avgTime < 200) {
        console.log('  ✅ Performance boa');
    } else {
        console.log('  ⚠️ Performance pode ser melhorada');
    }
}

// Executar testes automaticamente quando carregado
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            console.log('🧪 Script de testes carregado. Execute runAllTests() para testar.');
        }, 1000);
    });
} else {
    setTimeout(() => {
        console.log('🧪 Script de testes carregado. Execute runAllTests() para testar.');
    }, 1000);
}

// Exportar funções para uso global
window.testCorrections = {
    runAllTests,
    clearAllCaches,
    testPerformance
};

console.log('🧪 Script de testes das correções carregado');