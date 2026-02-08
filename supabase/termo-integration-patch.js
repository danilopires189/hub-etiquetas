/**
 * Patch de Integração para Módulo Termo
 * Este arquivo integra o HistoryManager no módulo termo existente
 */

(function() {
    'use strict';
    
    console.log('🔧 Aplicando patch de integração para módulo termo...');
    
    // Aguardar dependências estarem disponíveis
    function waitForDependencies() {
        return new Promise((resolve) => {
            const checkInterval = setInterval(() => {
                if (window.HistoryManager && window.modulesHistoryManager && window.termoGenerationHistory) {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 100);
            
            // Timeout após 10 segundos
            setTimeout(() => {
                clearInterval(checkInterval);
                console.warn('⚠️ Timeout aguardando dependências para termo');
                resolve();
            }, 10000);
        });
    }
    
    // Aplicar integração
    async function applyTermoIntegration() {
        try {
            await waitForDependencies();
            
            if (!window.HistoryManager) {
                console.warn('⚠️ HistoryManager não disponível para termo');
                return false;
            }
            
            // Obter manager do termo
            const termoManager = window.modulesHistoryManager?.getManager('termo');
            if (!termoManager) {
                console.warn('⚠️ Manager do termo não disponível');
                return false;
            }
            
            // Fazer backup da função original se existir
            if (window.saveToTermoHistory && !window.saveToTermoHistoryOriginalBackup) {
                window.saveToTermoHistoryOriginalBackup = window.saveToTermoHistory;
                console.log('💾 Backup da função saveToTermoHistory original criado');
            }
            
            // Substituir pela versão integrada
            window.saveToTermoHistory = async function(config) {
                console.log('📝 [TERMO-PATCH] Salvando histórico com integração:', config);
                
                try {
                    // Usar o HistoryManager para armazenamento dual
                    const result = await termoManager.saveToBothStorages(config);
                    console.log('✅ [TERMO-PATCH] Histórico salvo com sucesso');
                    return result;
                    
                } catch (error) {
                    console.warn('⚠️ [TERMO-PATCH] Erro na versão integrada, usando fallback:', error);
                    
                    // Fallback para função original
                    if (window.saveToTermoHistoryOriginalBackup) {
                        return window.saveToTermoHistoryOriginalBackup(config);
                    } else {
                        // Fallback manual se não há backup
                        return saveToTermoHistoryFallback(config);
                    }
                }
            };
            
            // Integrar outras funções se necessário
            if (window.showTermoHistorico && !window.showTermoHistoricoOriginalBackup) {
                window.showTermoHistoricoOriginalBackup = window.showTermoHistorico;
                
                // Manter função original (não precisa modificar)
                // A visualização continua usando localStorage para performance
            }
            
            console.log('✅ [TERMO-PATCH] Integração aplicada com sucesso');
            
            // Sincronizar histórico existente em background
            setTimeout(() => {
                syncExistingTermoHistory(termoManager);
            }, 2000);
            
            return true;
            
        } catch (error) {
            console.error('❌ [TERMO-PATCH] Erro ao aplicar integração:', error);
            return false;
        }
    }
    
    // Fallback manual para saveToTermoHistory
    function saveToTermoHistoryFallback(config) {
        console.log('🔄 [TERMO-PATCH] Usando fallback manual');
        
        try {
            // Garantir que termoGenerationHistory existe
            if (!window.termoGenerationHistory) {
                window.termoGenerationHistory = [];
            }
            
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
                console.log('🔄 [TERMO-PATCH] Removida entrada duplicada do histórico');
            }
            
            // Tentar encontrar o nome do usuário
            let nomeUsuario = '';
            if (window.DB_USUARIO && window.DB_USUARIO.BASE_USUARIO) {
                const usuario = window.DB_USUARIO.BASE_USUARIO.find(u => u.Matricula == config.matricula);
                if (usuario) {
                    nomeUsuario = usuario.Nome;
                }
            }
            
            // Adicionar a nova entrada no início
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
            
            // Salvar no localStorage
            localStorage.setItem('termo-etiquetas-history', JSON.stringify(window.termoGenerationHistory));
            console.log('✅ [TERMO-PATCH] Histórico salvo com fallback:', config.etiquetaId, '- Total:', window.termoGenerationHistory.length, 'entradas');
            
            return true;
            
        } catch (error) {
            console.error('❌ [TERMO-PATCH] Erro no fallback:', error);
            return false;
        }
    }
    
    // Sincronizar histórico existente
    async function syncExistingTermoHistory(manager) {
        try {
            console.log('🔄 [TERMO-PATCH] Sincronizando histórico existente...');
            
            const existingHistory = manager.getLocalHistory();
            if (existingHistory.length === 0) {
                console.log('ℹ️ [TERMO-PATCH] Nenhum histórico existente para sincronizar');
                return;
            }
            
            console.log(`📊 [TERMO-PATCH] Sincronizando ${existingHistory.length} entradas existentes...`);
            
            let syncedCount = 0;
            let errorCount = 0;
            
            for (const entry of existingHistory) {
                try {
                    await manager.saveToSupabase(entry);
                    syncedCount++;
                } catch (error) {
                    console.warn(`⚠️ [TERMO-PATCH] Falha ao sincronizar entrada:`, error);
                    errorCount++;
                    // Continuar com as outras entradas
                }
            }
            
            console.log(`✅ [TERMO-PATCH] Sincronização concluída: ${syncedCount} sucessos, ${errorCount} erros`);
            
        } catch (error) {
            console.warn('⚠️ [TERMO-PATCH] Erro na sincronização do histórico existente:', error);
        }
    }
    
    // Função de diagnóstico específica para termo
    function diagnoseTermoIntegration() {
        console.log('🔍 [TERMO-PATCH] Diagnosticando integração do termo...');
        
        const diagnostics = {
            timestamp: new Date().toISOString(),
            functions: {
                saveToTermoHistory: typeof window.saveToTermoHistory,
                saveToTermoHistoryOriginalBackup: typeof window.saveToTermoHistoryOriginalBackup,
                showTermoHistorico: typeof window.showTermoHistorico,
                cleanDuplicateTermoHistory: typeof window.cleanDuplicateTermoHistory
            },
            historyManager: {
                available: !!window.HistoryManager,
                modulesManager: !!window.modulesHistoryManager,
                termoManager: !!window.modulesHistoryManager?.getManager('termo')
            },
            globalHistory: {
                exists: !!window.termoGenerationHistory,
                length: window.termoGenerationHistory ? window.termoGenerationHistory.length : 0,
                type: typeof window.termoGenerationHistory
            },
            localStorage: {
                key: 'termo-etiquetas-history',
                exists: !!localStorage.getItem('termo-etiquetas-history'),
                entries: 0
            }
        };
        
        // Verificar localStorage
        try {
            const localData = localStorage.getItem('termo-etiquetas-history');
            if (localData) {
                const parsed = JSON.parse(localData);
                diagnostics.localStorage.entries = parsed.length;
            }
        } catch (error) {
            diagnostics.localStorage.error = error.message;
        }
        
        console.log('📊 [TERMO-PATCH] Diagnóstico:', diagnostics);
        return diagnostics;
    }
    
    // Função de teste específica para termo
    async function testTermoIntegration() {
        console.log('🧪 [TERMO-PATCH] Testando integração do termo...');
        
        const testData = {
            etiquetaId: `TEST-${Date.now()}`,
            pedido: '2024001',
            dataPedido: '01/01/2024',
            loja: 'LOJA TESTE PATCH',
            rota: 'ROTA TESTE PATCH',
            qtdVolumes: 1,
            matricula: '12345',
            dataSeparacao: '10/01/2025',
            horaSeparacao: '14:30',
            timestamp: new Date().toISOString()
        };
        
        try {
            // Testar função integrada
            if (window.saveToTermoHistory) {
                const result = await window.saveToTermoHistory(testData);
                console.log(`✅ [TERMO-PATCH] Teste de integração: ${result ? 'SUCESSO' : 'FALHA'}`);
                
                // Verificar se foi salvo localmente
                const localHistory = window.termoGenerationHistory || [];
                const testEntry = localHistory.find(item => item.etiquetaId === testData.etiquetaId);
                
                if (testEntry) {
                    console.log('✅ [TERMO-PATCH] Entrada encontrada no histórico global');
                    
                    // Limpar entrada de teste
                    const cleanedHistory = localHistory.filter(item => item.etiquetaId !== testData.etiquetaId);
                    window.termoGenerationHistory = cleanedHistory;
                    localStorage.setItem('termo-etiquetas-history', JSON.stringify(cleanedHistory));
                    console.log('🧹 [TERMO-PATCH] Entrada de teste removida');
                } else {
                    console.warn('⚠️ [TERMO-PATCH] Entrada de teste não encontrada no histórico global');
                }
                
                return { success: result, testEntry: !!testEntry };
                
            } else {
                console.error('❌ [TERMO-PATCH] Função saveToTermoHistory não disponível');
                return { success: false, error: 'Função não disponível' };
            }
            
        } catch (error) {
            console.error('❌ [TERMO-PATCH] Erro no teste:', error);
            return { success: false, error: error.message };
        }
    }
    
    // Função para corrigir problemas conhecidos do termo
    function fixTermoHistoryIssues() {
        console.log('🔧 [TERMO-PATCH] Corrigindo problemas conhecidos do termo...');
        
        const fixes = [];
        
        // 1. Garantir que termoGenerationHistory existe
        if (!window.termoGenerationHistory) {
            window.termoGenerationHistory = [];
            fixes.push('Criado termoGenerationHistory global');
        }
        
        // 2. Verificar se localStorage está sincronizado
        try {
            const localData = localStorage.getItem('termo-etiquetas-history');
            if (localData) {
                const parsed = JSON.parse(localData);
                if (window.termoGenerationHistory.length !== parsed.length) {
                    window.termoGenerationHistory = parsed;
                    fixes.push('Sincronizado termoGenerationHistory com localStorage');
                }
            }
        } catch (error) {
            fixes.push(`Erro ao sincronizar localStorage: ${error.message}`);
        }
        
        // 3. Limpar duplicatas se necessário
        if (typeof window.cleanDuplicateTermoHistory === 'function') {
            try {
                window.cleanDuplicateTermoHistory();
                fixes.push('Executada limpeza de duplicatas');
            } catch (error) {
                fixes.push(`Erro na limpeza de duplicatas: ${error.message}`);
            }
        }
        
        console.log('🔧 [TERMO-PATCH] Correções aplicadas:', fixes);
        return fixes;
    }
    
    // Expor funções globalmente
    window.applyTermoIntegration = applyTermoIntegration;
    window.diagnoseTermoIntegration = diagnoseTermoIntegration;
    window.testTermoIntegration = testTermoIntegration;
    window.fixTermoHistoryIssues = fixTermoHistoryIssues;
    
    // Auto-aplicar quando possível
    if (typeof window !== 'undefined') {
        const autoApply = () => {
            setTimeout(() => {
                // Primeiro corrigir problemas conhecidos
                fixTermoHistoryIssues();
                
                // Depois aplicar integração
                applyTermoIntegration().then(success => {
                    if (success) {
                        console.log('🎉 [TERMO-PATCH] Auto-aplicação bem-sucedida');
                    } else {
                        console.warn('⚠️ [TERMO-PATCH] Auto-aplicação falhou');
                    }
                });
            }, 3000); // Aguardar outros sistemas carregarem
        };
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', autoApply);
        } else {
            autoApply();
        }
    }
    
    console.log('🔧 [TERMO-PATCH] Patch de integração carregado');
    
})();