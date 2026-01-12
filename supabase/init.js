/**
 * Inicialização da integração Supabase
 * Este arquivo deve ser carregado após o contador-global-centralizado.js
 */

import supabaseManager from './client.js';

class SupabaseIntegration {
    constructor() {
        this.initialized = false;
        this.fallbackMode = false;
        
        console.log('🚀 Inicializando integração Supabase...');
    }

    /**
     * Inicializar integração completa
     */
    async initialize() {
        try {
            // Inicializar cliente Supabase
            const connected = await supabaseManager.initialize();
            
            if (connected) {
                console.log('✅ Supabase conectado, integrando com contador global...');
                await this.integrateWithGlobalCounter();
                await this.migrateExistingData();
                this.initialized = true;
                this.fallbackMode = false;
            } else {
                console.warn('⚠️ Supabase não conectado, usando modo fallback');
                this.fallbackMode = true;
            }

            // Configurar eventos de conectividade
            this.setupConnectivityHandlers();
            
            return this.initialized;
        } catch (error) {
            console.error('❌ Erro na inicialização da integração:', error);
            this.fallbackMode = true;
            return false;
        }
    }

    /**
     * Integrar com o contador global existente
     */
    async integrateWithGlobalCounter() {
        if (!window.contadorGlobal) {
            console.warn('⚠️ Contador global não encontrado, aguardando...');
            
            // Aguardar contador estar disponível
            let attempts = 0;
            while (!window.contadorGlobal && attempts < 10) {
                await new Promise(resolve => setTimeout(resolve, 500));
                attempts++;
            }
            
            if (!window.contadorGlobal) {
                throw new Error('Contador global não disponível após 5 segundos');
            }
        }

        // Habilitar integração Supabase no contador global
        window.contadorGlobal.enableSupabaseIntegration();

        // Sincronizar valor inicial do contador
        try {
            const supabaseStats = await supabaseManager.getCounterStats();
            const localValue = window.contadorGlobal.obterValor();
            
            console.log(`📊 Valores: Local=${localValue}, Supabase=${supabaseStats.total_count}`);
            
            // Usar o maior valor entre local e Supabase
            if (supabaseStats.total_count > localValue) {
                console.log(`🔄 Atualizando contador local: ${localValue} → ${supabaseStats.total_count}`);
                window.contadorGlobal.valorAtual = supabaseStats.total_count;
                await window.contadorGlobal.salvarEstadoLocal();
            } else if (localValue > supabaseStats.total_count) {
                console.log(`🔄 Atualizando contador Supabase: ${supabaseStats.total_count} → ${localValue}`);
                const diff = localValue - supabaseStats.total_count;
                await supabaseManager.updateGlobalCounter(diff, 'geral');
            }
        } catch (error) {
            console.error('❌ Erro na sincronização inicial do contador:', error);
        }

        console.log('✅ Integração com contador global concluída');
    }

    /**
     * Migrar dados existentes do localStorage
     */
    async migrateExistingData() {
        try {
            console.log('🔄 Iniciando migração de dados históricos...');
            
            let migratedCount = 0;
            
            // Migrar histórico do módulo caixa
            const caixaHistory = localStorage.getItem('etiquetas-history');
            if (caixaHistory) {
                const history = JSON.parse(caixaHistory);
                console.log(`📦 Migrando ${history.length} registros do histórico de caixa...`);
                
                for (const item of history) {
                    try {
                        await supabaseManager.saveLabelGeneration({
                            applicationType: 'caixa',
                            coddv: item.base,
                            quantity: item.qtd || 1,
                            copies: item.copias || 1,
                            labelType: item.labelType,
                            orientation: item.orient || 'h',
                            metadata: {
                                migrated: true,
                                originalTimestamp: item.timestamp,
                                ultimoNumero: item.ultimoNumero,
                                proximoNumero: item.proximoNumero,
                                totalLabels: item.totalLabels
                            }
                        });
                        migratedCount++;
                    } catch (error) {
                        console.warn('⚠️ Erro ao migrar item do histórico:', error);
                    }
                }
            }

            // Migrar outros dados se existirem
            // TODO: Adicionar migração de outros módulos conforme necessário

            if (migratedCount > 0) {
                console.log(`✅ Migração concluída: ${migratedCount} registros migrados`);
                
                // Marcar migração como concluída
                localStorage.setItem('supabase_migration_completed', new Date().toISOString());
            } else {
                console.log('ℹ️ Nenhum dado histórico encontrado para migração');
            }
        } catch (error) {
            console.error('❌ Erro na migração de dados:', error);
        }
    }

    /**
     * Configurar handlers de conectividade
     */
    setupConnectivityHandlers() {
        window.addEventListener('online', () => {
            console.log('🌐 Conectividade restaurada');
            if (this.fallbackMode) {
                console.log('🔄 Tentando reconectar Supabase...');
                this.attemptReconnection();
            }
        });

        window.addEventListener('offline', () => {
            console.log('📱 Modo offline ativado');
        });
    }

    /**
     * Tentar reconexão com Supabase
     */
    async attemptReconnection() {
        try {
            const connected = await supabaseManager.initialize();
            if (connected) {
                console.log('✅ Reconexão com Supabase bem-sucedida');
                this.fallbackMode = false;
                this.initialized = true;
                
                // Sincronizar dados pendentes
                await supabaseManager.syncOfflineQueue();
            }
        } catch (error) {
            console.warn('⚠️ Falha na reconexão:', error);
        }
    }

    /**
     * Interceptar gerações de etiquetas nos módulos
     */
    interceptLabelGenerations() {
        // Esta função será chamada pelos módulos individuais
        // para registrar gerações no Supabase
        window.registerLabelGeneration = async (data) => {
            if (!this.fallbackMode) {
                try {
                    return await supabaseManager.saveLabelGeneration(data);
                } catch (error) {
                    console.warn('⚠️ Falha ao registrar geração no Supabase:', error);
                    return null;
                }
            }
            return null;
        };
    }

    /**
     * Obter status da integração
     */
    getStatus() {
        return {
            initialized: this.initialized,
            fallbackMode: this.fallbackMode,
            supabaseConnected: supabaseManager.isOnline(),
            queueStatus: supabaseManager.getQueueStatus()
        };
    }
}

// Criar instância global
const supabaseIntegration = new SupabaseIntegration();

// Inicializar quando DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        supabaseIntegration.initialize();
    });
} else {
    supabaseIntegration.initialize();
}

// Exportar para uso global
window.supabaseIntegration = supabaseIntegration;
window.supabaseManager = supabaseManager;

console.log('🔧 Sistema de integração Supabase carregado');

export default supabaseIntegration;