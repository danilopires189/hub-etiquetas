/**
 * Patch de Integração para Módulo Caixa
 * Integra o HistoryManager com o sistema de histórico existente do caixa
 */

// Aguardar HistoryManager estar disponível
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
            
            // Timeout após 10 segundos
            setTimeout(() => {
                clearInterval(checkInterval);
                console.warn('⚠️ Timeout aguardando HistoryManager para caixa');
                resolve();
            }, 10000);
        }
    });
}

// Aplicar patch de integração
async function applyCaixaIntegrationPatch() {
    console.log('🔧 Aplicando patch de integração para módulo caixa...');
    
    try {
        // Aguardar HistoryManager
        await waitForHistoryManager();
        
        if (!window.HistoryManager) {
            console.warn('⚠️ HistoryManager não disponível, mantendo funcionamento original');
            return { success: false, reason: 'HistoryManager não disponível' };
        }
        
        // Criar instância do HistoryManager para caixa
        const caixaHistoryManager = new window.HistoryManager('caixa', window.supabaseManager);
        
        // Fazer backup da função original
        if (window.saveToHistory && !window.saveToHistoryOriginal) {
            window.saveToHistoryOriginal = window.saveToHistory;
            console.log('✅ Backup da função saveToHistory original criado');
        }
        
        // Substituir pela versão integrada
        window.saveToHistory = async function(config) {
            try {
                console.log('💾 Salvando no histórico caixa (versão integrada):', config);
                
                // Usar o HistoryManager para armazenamento dual
                const success = await caixaHistoryManager.saveToBothStorages(config);
                
                if (success) {
                    console.log('✅ Histórico caixa salvo com sucesso (localStorage + Supabase)');
                } else {
                    console.warn('⚠️ Falha ao salvar histórico caixa');
                }
                
                return success;
                
            } catch (error) {
                console.warn('⚠️ Erro no histórico integrado caixa, usando fallback:', error);
                
                // Fallback para função original
                if (window.saveToHistoryOriginal) {
                    return window.saveToHistoryOriginal(config);
                }
                
                return false;
            }
        };
        
        // Adicionar métodos de conveniência
        window.caixaHistoryManager = caixaHistoryManager;
        
        // Função para sincronizar histórico existente
        window.syncCaixaExistingHistory = async function() {
            try {
                console.log('🔄 Sincronizando histórico existente do caixa...');
                await caixaHistoryManager.syncExistingHistory();
                console.log('✅ Histórico existente do caixa sincronizado');
                return true;
            } catch (error) {
                console.warn('⚠️ Erro ao sincronizar histórico existente do caixa:', error);
                return false;
            }
        };
        
        // Função para restaurar do Supabase
        window.restoreCaixaHistoryFromSupabase = async function() {
            try {
                console.log('🔄 Restaurando histórico do caixa do Supabase...');
                const restored = await caixaHistoryManager.restoreHistoryFromSupabase();
                console.log(`✅ Histórico do caixa restaurado: ${restored.length} itens`);
                
                // Atualizar visualização se modal estiver aberto
                if (window.showHistorico && document.querySelector('#historico-modal.show')) {
                    window.showHistorico();
                }
                
                return restored;
            } catch (error) {
                console.error('❌ Erro ao restaurar histórico do caixa:', error);
                throw error;
            }
        };
        
        // Função para obter estatísticas
        window.getCaixaHistoryStats = function() {
            return caixaHistoryManager.getStats();
        };
        
        console.log('✅ Patch de integração aplicado com sucesso para módulo caixa');
        
        return {
            success: true,
            manager: caixaHistoryManager,
            functions: {
                saveToHistory: 'Integrada com armazenamento dual',
                syncExisting: 'syncCaixaExistingHistory()',
                restore: 'restoreCaixaHistoryFromSupabase()',
                stats: 'getCaixaHistoryStats()'
            }
        };
        
    } catch (error) {
        console.error('❌ Erro ao aplicar patch de integração para caixa:', error);
        return { success: false, error: error.message };
    }
}

// Função de teste
async function testCaixaIntegration() {
    console.log('🧪 Testando integração do caixa...');
    
    const testData = {
        base: '123456',
        qtd: 10,
        copias: 1,
        labelType: 'caixa',
        orient: 'h',
        ultimoNumero: 123456,
        proximoNumero: 123466,
        totalLabels: 10,
        timestamp: new Date().toISOString(),
        id: Date.now()
    };
    
    try {
        // Testar salvamento
        const saved = await window.saveToHistory(testData);
        console.log('✅ Teste de salvamento:', saved);
        
        // Testar estatísticas
        if (window.getCaixaHistoryStats) {
            const stats = window.getCaixaHistoryStats();
            console.log('📊 Estatísticas do caixa:', stats);
        }
        
        return { success: true, testData, saved };
        
    } catch (error) {
        console.error('❌ Erro no teste de integração do caixa:', error);
        return { success: false, error: error.message };
    }
}

// Expor funções globalmente
window.applyCaixaIntegrationPatch = applyCaixaIntegrationPatch;
window.testCaixaIntegration = testCaixaIntegration;

// Auto-aplicar se estiver no módulo caixa
if (typeof window !== 'undefined' && window.location.pathname.includes('caixa')) {
    // Aguardar DOM estar pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(applyCaixaIntegrationPatch, 2000);
        });
    } else {
        setTimeout(applyCaixaIntegrationPatch, 2000);
    }
}

console.log('🔧 Patch de integração do caixa carregado');