/**
 * Integração do HistoryManager em todos os módulos
 * Este arquivo padroniza o histórico em todos os módulos do Hub de Etiquetas
 */

// Configuração dos módulos
const MODULE_CONFIGS = {
    'caixa': {
        storageKey: 'etiquetas-history',
        maxEntries: 5,
        hasHistory: true,
        functions: {
            save: 'saveToHistory',
            show: 'showHistorico',
            clear: 'clearHistory',
            load: 'loadFromHistory'
        }
    },
    'termo': {
        storageKey: 'termo-etiquetas-history',
        maxEntries: 500,
        hasHistory: true,
        functions: {
            save: 'saveToTermoHistory',
            show: 'showTermoHistorico',
            clear: 'clearTermoHistory',
            load: 'loadFromTermoHistory'
        }
    },
    'placas': {
        storageKey: 'placas-history',
        maxEntries: 10,
        hasHistory: false, // Precisa implementar
        functions: {
            save: 'saveToPlacasHistory',
            show: 'showPlacasHistorico',
            clear: 'clearPlacasHistory',
            load: 'loadFromPlacasHistory'
        }
    },
    'avulso': {
        storageKey: 'avulso-history',
        maxEntries: 10,
        hasHistory: false, // Precisa implementar
        functions: {
            save: 'saveToAvulsoHistory',
            show: 'showAvulsoHistorico',
            clear: 'clearAvulsoHistory',
            load: 'loadFromAvulsoHistory'
        }
    },
    'enderec': {
        storageKey: 'enderec-history',
        maxEntries: 10,
        hasHistory: false, // Precisa implementar
        functions: {
            save: 'saveToEnderecHistory',
            show: 'showEnderecHistorico',
            clear: 'clearEnderecHistory',
            load: 'loadFromEnderecHistory'
        }
    },
    'transferencia': {
        storageKey: 'transferencia-history',
        maxEntries: 10,
        hasHistory: false, // Precisa implementar
        functions: {
            save: 'saveToTransferenciaHistory',
            show: 'showTransferenciaHistorico',
            clear: 'clearTransferenciaHistory',
            load: 'loadFromTransferenciaHistory'
        }
    },
    'etiqueta-mercadoria': {
        storageKey: 'etiqueta-mercadoria-history',
        maxEntries: 10,
        hasHistory: false, // Precisa implementar
        functions: {
            save: 'saveToEtiquetaMercadoriaHistory',
            show: 'showEtiquetaMercadoriaHistorico',
            clear: 'clearEtiquetaMercadoriaHistory',
            load: 'loadFromEtiquetaMercadoriaHistory'
        }
    },
    'inventario': {
        storageKey: 'inventario-history',
        maxEntries: 10,
        hasHistory: false, // Precisa implementar
        functions: {
            save: 'saveToInventarioHistory',
            show: 'showInventarioHistorico',
            clear: 'clearInventarioHistory',
            load: 'loadFromInventarioHistory'
        }
    },
    'pedido-direto': {
        storageKey: 'pedido-direto-history',
        maxEntries: 10,
        hasHistory: false, // Precisa implementar
        functions: {
            save: 'saveToPedidoDiretoHistory',
            show: 'showPedidoDiretoHistorico',
            clear: 'clearPedidoDiretoHistory',
            load: 'loadFromPedidoDiretoHistory'
        }
    }
};

// Gerenciador global de histórico para todos os módulos
class ModulesHistoryManager {
    constructor() {
        this.managers = new Map();
        this.initialized = false;
        this.supabaseManager = null;
    }
    
    /**
     * Inicializar o sistema de histórico para todos os módulos
     */
    async initialize(supabaseManager = null) {
        if (this.initialized) {
            console.log('ℹ️ ModulesHistoryManager já inicializado');
            return;
        }
        
        console.log('🔄 Inicializando ModulesHistoryManager...');
        
        this.supabaseManager = supabaseManager || window.supabaseManager;
        
        // Aguardar HistoryManager estar disponível
        await this.waitForHistoryManager();
        
        // Inicializar managers para cada módulo
        for (const [moduleName, config] of Object.entries(MODULE_CONFIGS)) {
            try {
                const manager = new window.HistoryManager(moduleName, this.supabaseManager);
                this.managers.set(moduleName, manager);
                console.log(`✅ HistoryManager criado para ${moduleName}`);
            } catch (error) {
                console.warn(`⚠️ Erro ao criar HistoryManager para ${moduleName}:`, error);
            }
        }
        
        this.initialized = true;
        console.log('✅ ModulesHistoryManager inicializado com sucesso');
        
        // Integrar com módulos existentes
        this.integrateWithExistingModules();
    }
    
    /**
     * Aguardar HistoryManager estar disponível
     */
    async waitForHistoryManager() {
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
                    console.warn('⚠️ Timeout aguardando HistoryManager');
                    resolve();
                }, 10000);
            }
        });
    }
    
    /**
     * Obter manager para um módulo específico
     */
    getManager(moduleName) {
        return this.managers.get(moduleName);
    }
    
    /**
     * Integrar com módulos existentes
     */
    integrateWithExistingModules() {
        console.log('🔗 Integrando com módulos existentes...');
        
        // Integrar com módulo caixa
        this.integrateCaixaModule();
        
        // Integrar com módulo termo
        this.integrateTermoModule();
        
        // Implementar histórico nos módulos que não têm
        this.implementMissingHistories();
    }
    
    /**
     * Integrar com módulo caixa (já tem histórico)
     */
    integrateCaixaModule() {
        const manager = this.getManager('caixa');
        if (!manager) return;
        
        // Fazer backup da função original
        if (window.saveToHistory && !window.saveToHistoryBackup) {
            window.saveToHistoryBackup = window.saveToHistory;
        }
        
        // Substituir pela versão integrada
        window.saveToHistory = async (config) => {
            try {
                return await manager.saveToBothStorages(config);
            } catch (error) {
                console.warn('⚠️ Erro no histórico integrado caixa, usando fallback:', error);
                return window.saveToHistoryBackup ? window.saveToHistoryBackup(config) : false;
            }
        };
        
        console.log('✅ Módulo caixa integrado com HistoryManager');
    }
    
    /**
     * Integrar com módulo termo (já tem histórico)
     */
    integrateTermoModule() {
        const manager = this.getManager('termo');
        if (!manager) return;
        
        // Fazer backup da função original
        if (window.saveToTermoHistory && !window.saveToTermoHistoryBackup) {
            window.saveToTermoHistoryBackup = window.saveToTermoHistory;
        }
        
        // Substituir pela versão integrada
        window.saveToTermoHistory = async (config) => {
            try {
                return await manager.saveToBothStorages(config);
            } catch (error) {
                console.warn('⚠️ Erro no histórico integrado termo, usando fallback:', error);
                return window.saveToTermoHistoryBackup ? window.saveToTermoHistoryBackup(config) : false;
            }
        };
        
        console.log('✅ Módulo termo integrado com HistoryManager');
    }
    
    /**
     * Implementar histórico nos módulos que não têm
     */
    implementMissingHistories() {
        for (const [moduleName, config] of Object.entries(MODULE_CONFIGS)) {
            if (!config.hasHistory) {
                this.implementModuleHistory(moduleName, config);
            }
        }
    }
    
    /**
     * Implementar histórico para um módulo específico
     */
    implementModuleHistory(moduleName, config) {
        const manager = this.getManager(moduleName);
        if (!manager) return;
        
        console.log(`🔧 Implementando histórico para ${moduleName}...`);
        
        // Implementar função de salvar
        window[config.functions.save] = async (entry) => {
            try {
                return await manager.saveToBothStorages(entry);
            } catch (error) {
                console.warn(`⚠️ Erro ao salvar histórico ${moduleName}:`, error);
                return false;
            }
        };
        
        // Implementar função de mostrar histórico
        window[config.functions.show] = () => {
            this.showGenericHistory(moduleName, manager);
        };
        
        // Implementar função de limpar histórico
        window[config.functions.clear] = () => {
            if (confirm(`Tem certeza que deseja limpar todo o histórico de ${moduleName}?`)) {
                manager.clearLocalHistory();
                console.log(`🗑️ Histórico de ${moduleName} limpo`);
            }
        };
        
        // Implementar função de carregar do histórico
        window[config.functions.load] = (id) => {
            const history = manager.getLocalHistory();
            const item = history.find(h => h.id === id);
            if (item) {
                console.log(`📋 Carregando do histórico ${moduleName}:`, item);
                // Cada módulo deve implementar sua própria lógica de carregamento
                this.loadFromHistoryGeneric(moduleName, item);
            }
        };
        
        console.log(`✅ Histórico implementado para ${moduleName}`);
    }
    
    /**
     * Mostrar histórico genérico (pode ser customizado por módulo)
     */
    showGenericHistory(moduleName, manager) {
        const history = manager.getLocalHistory();
        
        if (history.length === 0) {
            alert(`Nenhum histórico encontrado para ${moduleName}`);
            return;
        }
        
        const historyText = history.map((item, index) => {
            const timestamp = new Date(item.timestamp).toLocaleString('pt-BR');
            return `${index + 1}. ${timestamp} - ${JSON.stringify(item, null, 2)}`;
        }).join('\n\n');
        
        // Criar modal simples ou usar console
        console.log(`📚 Histórico de ${moduleName}:`, history);
        
        // Tentar criar um modal simples
        this.createSimpleHistoryModal(moduleName, history);
    }
    
    /**
     * Criar modal simples para histórico
     */
    createSimpleHistoryModal(moduleName, history) {
        // Remover modal existente se houver
        const existingModal = document.getElementById(`${moduleName}-history-modal`);
        if (existingModal) {
            existingModal.remove();
        }
        
        // Criar modal
        const modal = document.createElement('div');
        modal.id = `${moduleName}-history-modal`;
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
        `;
        
        const content = document.createElement('div');
        content.style.cssText = `
            background: white;
            padding: 20px;
            border-radius: 8px;
            max-width: 80%;
            max-height: 80%;
            overflow-y: auto;
        `;
        
        content.innerHTML = `
            <h3>📚 Histórico de ${moduleName}</h3>
            <div style="margin: 10px 0;">
                <strong>Total de registros:</strong> ${history.length}
            </div>
            <div style="max-height: 400px; overflow-y: auto; border: 1px solid #ccc; padding: 10px;">
                ${history.map((item, index) => `
                    <div style="margin-bottom: 10px; padding: 10px; border-bottom: 1px solid #eee;">
                        <strong>#${index + 1}</strong> - ${new Date(item.timestamp).toLocaleString('pt-BR')}
                        <pre style="font-size: 12px; margin: 5px 0;">${JSON.stringify(item, null, 2)}</pre>
                    </div>
                `).join('')}
            </div>
            <div style="margin-top: 15px; text-align: right;">
                <button onclick="this.closest('#${moduleName}-history-modal').remove()" 
                        style="padding: 8px 16px; background: #007cba; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    Fechar
                </button>
            </div>
        `;
        
        modal.appendChild(content);
        document.body.appendChild(modal);
        
        // Fechar ao clicar fora
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }
    
    /**
     * Carregar do histórico genérico
     */
    loadFromHistoryGeneric(moduleName, item) {
        console.log(`📋 Carregando do histórico ${moduleName}:`, item);
        
        // Cada módulo deve implementar sua própria lógica
        // Por enquanto, apenas mostrar no console
        alert(`Funcionalidade de carregar do histórico para ${moduleName} deve ser implementada pelo módulo específico.\n\nDados: ${JSON.stringify(item, null, 2)}`);
    }
    
    /**
     * Obter estatísticas de todos os módulos
     */
    getAllStats() {
        const stats = {};
        
        for (const [moduleName, manager] of this.managers) {
            stats[moduleName] = manager.getStats();
        }
        
        return {
            timestamp: new Date().toISOString(),
            totalModules: this.managers.size,
            modules: stats,
            supabaseAvailable: !!this.supabaseManager
        };
    }
    
    /**
     * Sincronizar histórico existente de todos os módulos
     */
    async syncAllExistingHistory() {
        console.log('🔄 Sincronizando histórico existente de todos os módulos...');
        
        const results = {};
        
        for (const [moduleName, manager] of this.managers) {
            try {
                console.log(`🔄 Sincronizando ${moduleName}...`);
                await manager.syncExistingHistory();
                results[moduleName] = { success: true };
                console.log(`✅ ${moduleName} sincronizado`);
            } catch (error) {
                console.warn(`⚠️ Erro ao sincronizar ${moduleName}:`, error);
                results[moduleName] = { success: false, error: error.message };
            }
        }
        
        console.log('✅ Sincronização de histórico concluída:', results);
        return results;
    }
    
    /**
     * Diagnosticar problemas em todos os módulos
     */
    diagnoseAllModules() {
        console.log('🔍 Diagnosticando todos os módulos...');
        
        const diagnostics = {
            timestamp: new Date().toISOString(),
            initialized: this.initialized,
            supabaseManager: !!this.supabaseManager,
            historyManagerAvailable: !!window.HistoryManager,
            modules: {}
        };
        
        for (const [moduleName, config] of Object.entries(MODULE_CONFIGS)) {
            const manager = this.getManager(moduleName);
            
            diagnostics.modules[moduleName] = {
                config,
                manager: !!manager,
                stats: manager ? manager.getStats() : null,
                functions: {
                    save: typeof window[config.functions.save],
                    show: typeof window[config.functions.show],
                    clear: typeof window[config.functions.clear],
                    load: typeof window[config.functions.load]
                }
            };
        }
        
        console.log('📊 Diagnóstico completo:', diagnostics);
        return diagnostics;
    }
}

// Criar instância global
const modulesHistoryManager = new ModulesHistoryManager();

// Expor globalmente
window.ModulesHistoryManager = ModulesHistoryManager;
window.modulesHistoryManager = modulesHistoryManager;

// Função de inicialização
window.initializeModulesHistory = async function(supabaseManager = null) {
    try {
        await modulesHistoryManager.initialize(supabaseManager);
        console.log('🎉 Sistema de histórico de módulos inicializado com sucesso!');
        return true;
    } catch (error) {
        console.error('❌ Erro ao inicializar sistema de histórico:', error);
        return false;
    }
};

// Auto-inicializar quando possível
if (typeof window !== 'undefined') {
    // Aguardar DOM e outros sistemas estarem prontos
    const autoInit = () => {
        setTimeout(() => {
            if (window.HistoryManager && !modulesHistoryManager.initialized) {
                window.initializeModulesHistory();
            }
        }, 2000);
    };
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', autoInit);
    } else {
        autoInit();
    }
}

console.log('🔧 Sistema de integração de histórico de módulos carregado');
console.log('📚 Execute initializeModulesHistory() para inicializar');