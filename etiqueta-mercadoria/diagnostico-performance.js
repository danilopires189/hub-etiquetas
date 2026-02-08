/**
 * Diagnóstico de Performance - Etiqueta Mercadoria
 * Este arquivo ajuda a identificar gargalos de performance no sistema
 */

// Métricas de performance
const performanceMetrics = {
    startTime: null,
    printTime: null,
    supabaseTime: null,
    renderTime: null,
    totalTime: null
};

// Função para medir tempo de renderização
function measureRenderTime() {
    const startRender = performance.now();
    
    // Simular renderização pesada
    requestAnimationFrame(() => {
        const endRender = performance.now();
        performanceMetrics.renderTime = endRender - startRender;
        console.log(`🎨 Tempo de renderização: ${performanceMetrics.renderTime.toFixed(2)}ms`);
    });
}

// Função para medir tempo do Supabase
async function measureSupabaseTime() {
    const startSupabase = performance.now();
    
    try {
        const manager = await waitForSupabaseManager(2000);
        const endSupabase = performance.now();
        performanceMetrics.supabaseTime = endSupabase - startSupabase;
        
        if (manager) {
            console.log(`📡 Supabase conectado em: ${performanceMetrics.supabaseTime.toFixed(2)}ms`);
        } else {
            console.log(`⚠️ Supabase timeout após: ${performanceMetrics.supabaseTime.toFixed(2)}ms`);
        }
        
        return manager;
    } catch (error) {
        const endSupabase = performance.now();
        performanceMetrics.supabaseTime = endSupabase - startSupabase;
        console.log(`❌ Erro no Supabase após: ${performanceMetrics.supabaseTime.toFixed(2)}ms`);
        return null;
    }
}

// Função para medir tempo total de impressão
function measurePrintTime() {
    performanceMetrics.printTime = performance.now();
    
    // Interceptar window.print para medir tempo
    const originalPrint = window.print;
    window.print = function() {
        const printStart = performance.now();
        console.log('🖨️ Iniciando impressão...');
        
        originalPrint.call(this);
        
        const printEnd = performance.now();
        const printDuration = printEnd - printStart;
        console.log(`🖨️ Impressão concluída em: ${printDuration.toFixed(2)}ms`);
        
        // Restaurar função original
        window.print = originalPrint;
        
        // Calcular tempo total
        if (performanceMetrics.startTime) {
            performanceMetrics.totalTime = printEnd - performanceMetrics.startTime;
            console.log(`⏱️ Tempo total do processo: ${performanceMetrics.totalTime.toFixed(2)}ms`);
            
            // Gerar relatório
            generatePerformanceReport();
        }
    };
}

// Função para gerar relatório de performance
function generatePerformanceReport() {
    console.log('\n📊 RELATÓRIO DE PERFORMANCE - ETIQUETA MERCADORIA');
    console.log('='.repeat(50));
    
    if (performanceMetrics.renderTime) {
        console.log(`🎨 Renderização: ${performanceMetrics.renderTime.toFixed(2)}ms`);
    }
    
    if (performanceMetrics.supabaseTime) {
        console.log(`📡 Supabase: ${performanceMetrics.supabaseTime.toFixed(2)}ms`);
        
        if (performanceMetrics.supabaseTime > 1000) {
            console.log('⚠️ PROBLEMA: Supabase muito lento (>1s)');
        } else if (performanceMetrics.supabaseTime > 500) {
            console.log('⚠️ ATENÇÃO: Supabase lento (>500ms)');
        } else {
            console.log('✅ Supabase com boa performance');
        }
    }
    
    if (performanceMetrics.totalTime) {
        console.log(`⏱️ Tempo Total: ${performanceMetrics.totalTime.toFixed(2)}ms`);
        
        if (performanceMetrics.totalTime > 3000) {
            console.log('❌ CRÍTICO: Processo muito lento (>3s)');
        } else if (performanceMetrics.totalTime > 1000) {
            console.log('⚠️ ATENÇÃO: Processo lento (>1s)');
        } else {
            console.log('✅ Processo com boa performance');
        }
    }
    
    console.log('='.repeat(50));
    
    // Sugestões de otimização
    if (performanceMetrics.supabaseTime > 500) {
        console.log('💡 SUGESTÃO: Considere mover operações do Supabase para background');
    }
    
    if (performanceMetrics.renderTime > 100) {
        console.log('💡 SUGESTÃO: Otimize a renderização das etiquetas');
    }
    
    console.log('\n');
}

// Função para testar performance da rede
async function testNetworkPerformance() {
    console.log('🌐 Testando performance da rede...');
    
    const startTime = performance.now();
    
    try {
        // Teste simples de conectividade
        const response = await fetch('https://httpbin.org/delay/0', {
            method: 'GET',
            timeout: 2000
        });
        
        const endTime = performance.now();
        const networkTime = endTime - startTime;
        
        console.log(`🌐 Latência de rede: ${networkTime.toFixed(2)}ms`);
        
        if (networkTime > 1000) {
            console.log('⚠️ PROBLEMA: Rede muito lenta');
            return 'slow';
        } else if (networkTime > 500) {
            console.log('⚠️ ATENÇÃO: Rede lenta');
            return 'medium';
        } else {
            console.log('✅ Rede com boa performance');
            return 'fast';
        }
    } catch (error) {
        console.log('❌ Erro ao testar rede:', error.message);
        return 'error';
    }
}

// Função para diagnosticar problemas comuns
function diagnosePrintIssues() {
    console.log('🔍 Diagnosticando problemas de impressão...');
    
    const issues = [];
    
    // Verificar se há muitos elementos DOM
    const domElements = document.querySelectorAll('*').length;
    if (domElements > 1000) {
        issues.push(`Muitos elementos DOM (${domElements})`);
    }
    
    // Verificar se há CSS complexo
    const stylesheets = document.styleSheets.length;
    if (stylesheets > 10) {
        issues.push(`Muitas folhas de estilo (${stylesheets})`);
    }
    
    // Verificar se há JavaScript pesado
    const scripts = document.querySelectorAll('script').length;
    if (scripts > 20) {
        issues.push(`Muitos scripts (${scripts})`);
    }
    
    // Verificar memória (se disponível)
    if (performance.memory) {
        const memoryMB = performance.memory.usedJSHeapSize / 1024 / 1024;
        if (memoryMB > 50) {
            issues.push(`Alto uso de memória (${memoryMB.toFixed(1)}MB)`);
        }
    }
    
    if (issues.length > 0) {
        console.log('⚠️ Problemas encontrados:');
        issues.forEach(issue => console.log(`  - ${issue}`));
    } else {
        console.log('✅ Nenhum problema óbvio encontrado');
    }
    
    return issues;
}

// Função principal de diagnóstico
async function runFullDiagnostic() {
    console.log('🚀 Iniciando diagnóstico completo de performance...\n');
    
    // Testar rede
    const networkStatus = await testNetworkPerformance();
    
    // Diagnosticar problemas
    const issues = diagnosePrintIssues();
    
    // Medir renderização
    measureRenderTime();
    
    // Preparar medição de impressão
    measurePrintTime();
    
    console.log('\n📋 RESUMO DO DIAGNÓSTICO:');
    console.log(`🌐 Rede: ${networkStatus}`);
    console.log(`⚠️ Problemas: ${issues.length}`);
    console.log('🖨️ Medição de impressão: Preparada');
    
    return {
        network: networkStatus,
        issues: issues,
        timestamp: new Date().toISOString()
    };
}

// Função para iniciar medição de performance
function startPerformanceMeasurement() {
    performanceMetrics.startTime = performance.now();
    console.log('⏱️ Iniciando medição de performance...');
}

// Exportar funções para uso global
window.diagnosticoPerformance = {
    runFullDiagnostic,
    startPerformanceMeasurement,
    measureSupabaseTime,
    testNetworkPerformance,
    diagnosePrintIssues,
    generatePerformanceReport
};

console.log('🛠️ Diagnóstico de performance carregado. Use diagnosticoPerformance.runFullDiagnostic() para testar.');