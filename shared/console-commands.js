/**
 * Comandos Simples para Console
 * Comandos fáceis para verificar status do projeto
 */

// Função simples para testar conexão com Supabase
window.testarSupabase = async function() {
    console.log('🔄 Testando conexão com Supabase...');
    
    try {
        const response = await fetch('https://jomwkkhhhekbyanftpoc.supabase.co/rest/v1/global_counter?select=total_count&limit=1', {
            headers: {
                'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpvbXdra2hoaGVrYnlhbmZ0cG9jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5OTMxNjMsImV4cCI6MjA4MzU2OTE2M30.hWo1X0j5XcDPtsG1JdBTMY_kTTFi6ff6Xw3uqZdEPvc'
            }
        });

        if (response.ok) {
            const data = await response.json();
            console.log('✅ SUPABASE FUNCIONANDO!');
            console.log('📊 Contador atual:', data[0]?.total_count || 'N/A');
            console.log('⚡ Tempo de resposta: OK');
            return { status: 'ok', working: true };
        } else if (response.status === 429) {
            console.log('⚠️ THROTTLING DETECTADO!');
            console.log('📝 Seu projeto está lento mas funcionando');
            console.log('🔧 Recomendação: Implementar otimizações');
            return { status: 'throttled', working: true };
        } else if (response.status === 402) {
            console.log('🔴 PROJETO PAUSADO!');
            console.log('📝 Excesso de cached egress');
            console.log('⏰ Aguarde reset mensal ou implemente otimizações');
            return { status: 'paused', working: false };
        } else {
            console.log('❓ Status desconhecido:', response.status);
            return { status: 'unknown', working: false };
        }
    } catch (error) {
        console.log('❌ ERRO DE CONEXÃO!');
        console.log('📝 Possível bloqueio total ou problema de rede');
        console.log('🔧 Erro:', error.message);
        return { status: 'error', working: false, error: error.message };
    }
};

// Função para verificar otimizações
window.verificarOtimizacoes = function() {
    console.log('🔍 VERIFICANDO OTIMIZAÇÕES...');
    console.log('='.repeat(40));
    
    const otimizacoes = {
        cacheManager: !!window.cacheManager,
        databaseOptimizer: !!window.databaseOptimizer,
        contadorOtimizado: !!window.contadorGlobal,
        modoEmergencia: !!window.emergencyOptimization,
        debouncer: !!window.supabaseDebouncer,
        batchProcessor: !!window.supabaseBatchProcessor
    };

    Object.entries(otimizacoes).forEach(([nome, ativo]) => {
        const status = ativo ? '✅' : '❌';
        console.log(`${status} ${nome}: ${ativo ? 'ATIVO' : 'INATIVO'}`);
    });

    const ativas = Object.values(otimizacoes).filter(Boolean).length;
    const total = Object.keys(otimizacoes).length;
    
    console.log('='.repeat(40));
    console.log(`📊 RESUMO: ${ativas}/${total} otimizações ativas`);
    
    if (ativas === total) {
        console.log('🎉 TODAS as otimizações estão funcionando!');
    } else {
        console.log('⚠️ Algumas otimizações não carregaram');
        console.log('🔄 Recarregue a página e tente novamente');
    }

    return otimizacoes;
};

// Função para verificar modo emergência
window.statusEmergencia = function() {
    console.log('🚨 VERIFICANDO MODO EMERGÊNCIA...');
    
    if (window.emergencyOptimization) {
        const stats = window.emergencyOptimization.getEmergencyStats();
        console.log('✅ Modo emergência ATIVO');
        console.log('📊 Requisições totais:', stats.requestCount);
        console.log('🚫 Requisições bloqueadas:', stats.blockedRequests);
        console.log('📈 Taxa de bloqueio:', stats.blockRate);
        console.log('💡 Status: Reduzindo cached egress automaticamente');
        return stats;
    } else {
        console.log('❌ Modo emergência NÃO ATIVO');
        console.log('⚠️ Cached egress não está sendo otimizado');
        console.log('🔄 Recarregue a página para ativar');
        return null;
    }
};

// Função para diagnóstico completo
window.diagnosticoCompleto = async function() {
    console.log('🚀 DIAGNÓSTICO COMPLETO DO PROJETO');
    console.log('='.repeat(50));
    
    // 1. Testar Supabase
    console.log('1️⃣ TESTANDO SUPABASE...');
    const supabaseStatus = await window.testarSupabase();
    
    console.log('\n2️⃣ VERIFICANDO OTIMIZAÇÕES...');
    const otimizacoes = window.verificarOtimizacoes();
    
    console.log('\n3️⃣ STATUS EMERGÊNCIA...');
    const emergencia = window.statusEmergencia();
    
    console.log('\n📋 RESUMO FINAL:');
    console.log('='.repeat(30));
    
    if (supabaseStatus.working) {
        if (supabaseStatus.status === 'ok') {
            console.log('🎉 SEU PROJETO ESTÁ FUNCIONANDO PERFEITAMENTE!');
        } else if (supabaseStatus.status === 'throttled') {
            console.log('⚠️ Projeto com throttling - mas funcionando');
        }
    } else {
        console.log('🔴 Projeto com problemas - precisa de otimizações');
    }
    
    const otimizacoesAtivas = Object.values(otimizacoes).filter(Boolean).length;
    console.log(`🔧 Otimizações: ${otimizacoesAtivas}/6 ativas`);
    
    if (emergencia) {
        console.log(`🚨 Modo emergência: ${emergencia.blockRate} bloqueadas`);
    }
    
    return {
        supabase: supabaseStatus,
        otimizacoes: otimizacoes,
        emergencia: emergencia
    };
};

// Função para forçar otimizações
window.forcarOtimizacoes = async function() {
    console.log('🚀 FORÇANDO TODAS AS OTIMIZAÇÕES...');
    
    try {
        // Limpar caches
        if (window.cacheManager) {
            window.cacheManager.clearExpiredCache();
            console.log('✅ Cache limpo');
        }
        
        // Flush do debouncer
        if (window.supabaseDebouncer) {
            await window.supabaseDebouncer.flushAll();
            console.log('✅ Debouncer processado');
        }
        
        // Flush do batch processor
        if (window.supabaseBatchProcessor) {
            await window.supabaseBatchProcessor.flush();
            console.log('✅ Batch processor processado');
        }
        
        // Flush do contador
        if (window.contadorGlobal && window.contadorGlobal.forcarFlush) {
            await window.contadorGlobal.forcarFlush();
            console.log('✅ Contador processado');
        }
        
        // Limpeza de emergência
        if (window.emergencyOptimization) {
            window.emergencyOptimization.clearAllCaches();
            await window.emergencyOptimization.forceFlushAll();
            console.log('✅ Limpeza de emergência executada');
        }
        
        console.log('🎉 TODAS as otimizações foram forçadas!');
        console.log('📊 Cached egress deve reduzir significativamente');
        
    } catch (error) {
        console.log('❌ Erro ao forçar otimizações:', error.message);
    }
};

console.log('🎯 COMANDOS DISPONÍVEIS NO CONSOLE:');
console.log('- testarSupabase()');
console.log('- verificarOtimizacoes()');
console.log('- statusEmergencia()');
console.log('- diagnosticoCompleto()');
console.log('- forcarOtimizacoes()');
console.log('');
console.log('💡 Digite qualquer comando acima no console!');