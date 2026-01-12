/**
 * Correção do histórico do módulo termo
 * Este arquivo corrige o problema de histórico não salvando no módulo termo
 * e integra com o HistoryManager para armazenamento dual
 */

// Aguardar que o HistoryManager esteja carregado
function waitForHistoryManager() {
    return new Promise((resolve) => {
        if (window.HistoryManager) {
            resolve();
        } else {
            const checkInterval = setInterval(() => {
                if (window.HistoryManager) {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 100);
        }
    });
}

// Inicializar HistoryManager para termo
let termoHistoryManager = null;

async function initTermoHistoryManager() {
    try {
        await waitForHistoryManager();
        
        // Criar instância do HistoryManager para termo
        termoHistoryManager = new window.HistoryManager('termo', window.supabaseManager);
        
        console.log('✅ HistoryManager inicializado para módulo termo');
        
        // Sincronizar histórico existente se houver
        const existingHistory = termoHistoryManager.getLocalHistory();
        if (existingHistory.length > 0) {
            console.log(`📊 Encontrado histórico existente: ${existingHistory.length} entradas`);
            // Sincronizar com Supabase em background
            setTimeout(() => {
                termoHistoryManager.syncExistingHistory().catch(error => {
                    console.warn('⚠️ Falha na sincronização do histórico existente:', error);
                });
            }, 2000);
        }
        
        return termoHistoryManager;
        
    } catch (error) {
        console.error('❌ Erro ao inicializar HistoryManager para termo:', error);
        return null;
    }
}

// Função corrigida para salvar no histórico
async function saveToTermoHistoryFixed(config) {
    console.log('🔄 [CORRIGIDO] Salvando no histórico termo...', config);
    
    try {
        // 1. Salvar usando o método original (localStorage)
        const originalResult = saveToTermoHistoryOriginal(config);
        
        // 2. Salvar usando o HistoryManager (localStorage + Supabase)
        if (termoHistoryManager) {
            await termoHistoryManager.saveToBothStorages(config);
            console.log('✅ [CORRIGIDO] Histórico salvo com HistoryManager');
        } else {
            console.warn('⚠️ [CORRIGIDO] HistoryManager não disponível, usando apenas método original');
        }
        
        return originalResult;
        
    } catch (error) {
        console.error('❌ [CORRIGIDO] Erro ao salvar histórico termo:', error);
        
        // Fallback: tentar salvar apenas localmente
        try {
            return saveToTermoHistoryOriginal(config);
        } catch (fallbackError) {
            console.error('❌ [CORRIGIDO] Erro no fallback:', fallbackError);
            return false;
        }
    }
}

// Backup da função original
function saveToTermoHistoryOriginal(config) {
    // Criar chave única para identificar duplicatas
    const uniqueKey = `${config.etiquetaId}-${config.pedido}-${config.loja}-${config.rota}`;

    // Verificar se já existe uma entrada com a mesma configuração
    const existingIndex = window.termoGenerationHistory.findIndex(item => {
        const itemKey = `${item.etiquetaId}-${item.pedido}-${item.loja}-${item.rota}`;
        return itemKey === uniqueKey;
    });

    // Se encontrou uma entrada similar, remover a antiga
    if (existingIndex !== -1) {
        window.termoGenerationHistory.splice(existingIndex, 1);
        console.log('Removida entrada duplicada do histórico termo');
    }

    // Adicionar a nova entrada no início
    // Tentar encontrar o nome do usuário
    let nomeUsuario = '';
    if (window.DB_USUARIO && window.DB_USUARIO.BASE_USUARIO) {
        const usuario = window.DB_USUARIO.BASE_USUARIO.find(u => u.Matricula == config.matricula);
        if (usuario) {
            nomeUsuario = usuario.Nome;
        }
    }

    window.termoGenerationHistory.unshift({
        ...config,
        nome: nomeUsuario,
        id: Date.now() + Math.random(), // ID único para evitar conflitos
        uniqueKey
    });

    // Manter apenas os últimos 500 registros únicos
    if (window.termoGenerationHistory.length > 500) {
        window.termoGenerationHistory = window.termoGenerationHistory.slice(0, 500);
    }

    // Limpar registros antigos (90 dias)
    if (typeof window.cleanOldTermoRecords === 'function') {
        window.cleanOldTermoRecords();
    }

    // Salvar no localStorage
    try {
        localStorage.setItem('termo-etiquetas-history', JSON.stringify(window.termoGenerationHistory));
        console.log('✅ [ORIGINAL] Histórico termo salvo:', config.etiquetaId, '- Total:', window.termoGenerationHistory.length, 'entradas');
        return true;
    } catch (e) {
        console.warn('⚠️ [ORIGINAL] Erro ao salvar histórico termo:', e.message);

        // Tentar limpeza emergencial
        if (e.name === 'QuotaExceededError') {
            try {
                // Manter apenas os 50 registros mais recentes
                window.termoGenerationHistory = window.termoGenerationHistory.slice(0, 50);
                localStorage.setItem('termo-etiquetas-history', JSON.stringify(window.termoGenerationHistory));
                console.log('🧹 [ORIGINAL] Limpeza emergencial do histórico termo executada');
                return true;
            } catch (emergencyError) {
                console.error('❌ [ORIGINAL] Falha na limpeza emergencial termo:', emergencyError.message);
                // Limpar completamente se necessário
                localStorage.removeItem('termo-etiquetas-history');
                window.termoGenerationHistory = [];
                return false;
            }
        }
        return false;
    }
}

// Função para diagnosticar problemas no histórico
function diagnoseTermoHistory() {
    console.log('🔍 [DIAGNÓSTICO] Analisando histórico do módulo termo...');
    
    const diagnostics = {
        timestamp: new Date().toISOString(),
        termoGenerationHistory: {
            exists: !!window.termoGenerationHistory,
            length: window.termoGenerationHistory ? window.termoGenerationHistory.length : 0,
            type: typeof window.termoGenerationHistory
        },
        localStorage: {
            key: 'termo-etiquetas-history',
            exists: !!localStorage.getItem('termo-etiquetas-history'),
            content: null
        },
        functions: {
            saveToTermoHistory: typeof window.saveToTermoHistory,
            showTermoHistorico: typeof window.showTermoHistorico,
            cleanDuplicateTermoHistory: typeof window.cleanDuplicateTermoHistory
        },
        historyManager: {
            available: !!window.HistoryManager,
            instance: !!termoHistoryManager,
            stats: termoHistoryManager ? termoHistoryManager.getStats() : null
        }
    };
    
    try {
        const localStorageContent = localStorage.getItem('termo-etiquetas-history');
        if (localStorageContent) {
            const parsed = JSON.parse(localStorageContent);
            diagnostics.localStorage.content = {
                length: parsed.length,
                sample: parsed.slice(0, 2) // Primeiros 2 registros
            };
        }
    } catch (error) {
        diagnostics.localStorage.error = error.message;
    }
    
    console.log('📊 [DIAGNÓSTICO] Resultado:', diagnostics);
    
    // Verificar problemas comuns
    const issues = [];
    
    if (!window.termoGenerationHistory) {
        issues.push('❌ termoGenerationHistory não está definido');
    }
    
    if (typeof window.saveToTermoHistory !== 'function') {
        issues.push('❌ saveToTermoHistory não é uma função');
    }
    
    if (!localStorage.getItem('termo-etiquetas-history')) {
        issues.push('⚠️ Nenhum histórico encontrado no localStorage');
    }
    
    if (!window.HistoryManager) {
        issues.push('⚠️ HistoryManager não está carregado');
    }
    
    if (issues.length > 0) {
        console.log('🚨 [DIAGNÓSTICO] Problemas encontrados:');
        issues.forEach(issue => console.log(`  ${issue}`));
    } else {
        console.log('✅ [DIAGNÓSTICO] Nenhum problema óbvio encontrado');
    }
    
    return diagnostics;
}

// Função para testar o histórico
async function testTermoHistory() {
    console.log('🧪 [TESTE] Testando histórico do módulo termo...');
    
    const testData = {
        etiquetaId: `TEST-${Date.now()}`,
        pedido: '2024001',
        dataPedido: '01/01/2024',
        loja: 'LOJA TESTE',
        rota: 'ROTA TESTE',
        qtdVolumes: 1,
        matricula: '12345',
        dataSeparacao: '10/01/2025',
        horaSeparacao: '14:30',
        timestamp: new Date().toISOString()
    };
    
    try {
        // Testar função original
        console.log('🔄 [TESTE] Testando função original...');
        const originalResult = saveToTermoHistoryOriginal(testData);
        console.log(`✅ [TESTE] Função original: ${originalResult ? 'SUCESSO' : 'FALHA'}`);
        
        // Testar função corrigida
        console.log('🔄 [TESTE] Testando função corrigida...');
        const fixedResult = await saveToTermoHistoryFixed({
            ...testData,
            etiquetaId: `TEST-FIXED-${Date.now()}`
        });
        console.log(`✅ [TESTE] Função corrigida: ${fixedResult ? 'SUCESSO' : 'FALHA'}`);
        
        // Verificar se foi salvo
        const currentHistory = window.termoGenerationHistory || [];
        const testEntries = currentHistory.filter(item => item.etiquetaId.startsWith('TEST-'));
        console.log(`📊 [TESTE] Entradas de teste encontradas: ${testEntries.length}`);
        
        // Limpar entradas de teste
        if (testEntries.length > 0) {
            window.termoGenerationHistory = currentHistory.filter(item => !item.etiquetaId.startsWith('TEST-'));
            localStorage.setItem('termo-etiquetas-history', JSON.stringify(window.termoGenerationHistory));
            console.log('🧹 [TESTE] Entradas de teste removidas');
        }
        
        return {
            originalResult,
            fixedResult,
            testEntriesFound: testEntries.length
        };
        
    } catch (error) {
        console.error('❌ [TESTE] Erro durante teste:', error);
        return { error: error.message };
    }
}

// Aplicar correção
async function applyTermoHistoryFix() {
    console.log('🔧 [CORREÇÃO] Aplicando correção do histórico termo...');
    
    try {
        // 1. Inicializar HistoryManager
        await initTermoHistoryManager();
        
        // 2. Fazer backup da função original
        if (window.saveToTermoHistory && !window.saveToTermoHistoryBackup) {
            window.saveToTermoHistoryBackup = window.saveToTermoHistory;
            console.log('💾 [CORREÇÃO] Backup da função original criado');
        }
        
        // 3. Substituir pela função corrigida
        window.saveToTermoHistory = saveToTermoHistoryFixed;
        console.log('🔄 [CORREÇÃO] Função saveToTermoHistory substituída pela versão corrigida');
        
        // 4. Adicionar funções de diagnóstico
        window.diagnoseTermoHistory = diagnoseTermoHistory;
        window.testTermoHistory = testTermoHistory;
        
        // 5. Executar diagnóstico
        const diagnostics = diagnoseTermoHistory();
        
        console.log('✅ [CORREÇÃO] Correção aplicada com sucesso!');
        console.log('🔧 [CORREÇÃO] Funções disponíveis: diagnoseTermoHistory(), testTermoHistory()');
        
        return {
            success: true,
            diagnostics,
            historyManager: !!termoHistoryManager
        };
        
    } catch (error) {
        console.error('❌ [CORREÇÃO] Erro ao aplicar correção:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Auto-aplicar correção quando carregado
if (typeof window !== 'undefined') {
    // Aguardar DOM estar pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(applyTermoHistoryFix, 1000);
        });
    } else {
        setTimeout(applyTermoHistoryFix, 1000);
    }
    
    // Expor funções globalmente
    window.applyTermoHistoryFix = applyTermoHistoryFix;
    window.saveToTermoHistoryFixed = saveToTermoHistoryFixed;
    window.diagnoseTermoHistory = diagnoseTermoHistory;
    window.testTermoHistory = testTermoHistory;
}

console.log('🔧 Correção do histórico termo carregada. Execute applyTermoHistoryFix() para aplicar.');