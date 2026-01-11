/**
 * Carregador de Integração de Histórico
 * Este arquivo carrega todos os componentes necessários na ordem correta
 */

// Configuração de carregamento
const INTEGRATION_CONFIG = {
    // Ordem de carregamento dos scripts
    loadOrder: [
        'history-manager.js',
        'modules-history-integration.js',
        'termo-history-fix.js'
    ],
    
    // Configurações de timeout
    timeouts: {
        scriptLoad: 5000,
        initialization: 10000,
        supabaseWait: 15000
    },
    
    // Debug mode
    debug: true
};

class HistoryIntegrationLoader {
    constructor() {
        this.loadedScripts = new Set();
        this.initialized = false;
        this.debug = INTEGRATION_CONFIG.debug;
    }
    
    log(message, type = 'info') {
        if (!this.debug) return;
        
        const timestamp = new Date().toLocaleTimeString();
        const prefix = `[${timestamp}] [HISTORY-LOADER]`;
        
        switch (type) {
            case 'error':
                console.error(`${prefix} ❌`, message);
                break;
            case 'warn':
                console.warn(`${prefix} ⚠️`, message);
                break;
            case 'success':
                console.log(`${prefix} ✅`, message);
                break;
            default:
                console.log(`${prefix} ℹ️`, message);
        }
    }
    
    /**
     * Carregar script dinamicamente
     */
    async loadScript(src) {
        return new Promise((resolve, reject) => {
            // Verificar se já foi carregado
            if (this.loadedScripts.has(src)) {
                this.log(`Script já carregado: ${src}`);
                resolve();
                return;
            }
            
            this.log(`Carregando script: ${src}`);
            
            const script = document.createElement('script');
            script.src = src.startsWith('http') ? src : `./supabase/${src}`;
            script.type = 'text/javascript';
            
            script.onload = () => {
                this.loadedScripts.add(src);
                this.log(`Script carregado com sucesso: ${src}`, 'success');
                resolve();
            };
            
            script.onerror = (error) => {
                this.log(`Erro ao carregar script: ${src}`, 'error');
                reject(new Error(`Falha ao carregar ${src}: ${error.message}`));
            };
            
            // Timeout
            setTimeout(() => {
                if (!this.loadedScripts.has(src)) {
                    this.log(`Timeout ao carregar script: ${src}`, 'warn');
                    reject(new Error(`Timeout ao carregar ${src}`));
                }
            }, INTEGRATION_CONFIG.timeouts.scriptLoad);
            
            document.head.appendChild(script);
        });
    }
    
    /**
     * Aguardar condição ser atendida
     */
    async waitForCondition(conditionFn, description, timeout = 5000) {
        return new Promise((resolve, reject) => {
            this.log(`Aguardando: ${description}`);
            
            const checkInterval = setInterval(() => {
                if (conditionFn()) {
                    clearInterval(checkInterval);
                    this.log(`Condição atendida: ${description}`, 'success');
                    resolve();
                }
            }, 100);
            
            setTimeout(() => {
                clearInterval(checkInterval);
                this.log(`Timeout aguardando: ${description}`, 'warn');
                reject(new Error(`Timeout: ${description}`));
            }, timeout);
        });
    }
    
    /**
     * Verificar se Supabase está disponível
     */
    async waitForSupabase() {
        try {
            await this.waitForCondition(
                () => window.supabaseManager && window.supabaseManager.isConnected(),
                'Supabase estar conectado',
                INTEGRATION_CONFIG.timeouts.supabaseWait
            );
            return true;
        } catch (error) {
            this.log('Supabase não disponível, continuando sem ele', 'warn');
            return false;
        }
    }
    
    /**
     * Carregar todos os scripts necessários
     */
    async loadAllScripts() {
        this.log('Iniciando carregamento de scripts...');
        
        for (const script of INTEGRATION_CONFIG.loadOrder) {
            try {
                await this.loadScript(script);
            } catch (error) {
                this.log(`Erro ao carregar ${script}: ${error.message}`, 'error');
                // Continuar com outros scripts mesmo se um falhar
            }
        }
        
        this.log('Carregamento de scripts concluído', 'success');
    }
    
    /**
     * Inicializar sistema de histórico
     */
    async initializeHistorySystem() {
        this.log('Inicializando sistema de histórico...');
        
        try {
            // 1. Aguardar HistoryManager estar disponível
            await this.waitForCondition(
                () => window.HistoryManager,
                'HistoryManager estar disponível'
            );
            
            // 2. Aguardar Supabase (opcional)
            const supabaseAvailable = await this.waitForSupabase();
            
            // 3. Inicializar ModulesHistoryManager
            if (window.initializeModulesHistory) {
                const success = await window.initializeModulesHistory(
                    supabaseAvailable ? window.supabaseManager : null
                );
                
                if (success) {
                    this.log('ModulesHistoryManager inicializado', 'success');
                } else {
                    this.log('Falha ao inicializar ModulesHistoryManager', 'warn');
                }
            }
            
            // 4. Aplicar correção do termo
            if (window.applyTermoHistoryFix) {
                const fixResult = await window.applyTermoHistoryFix();
                if (fixResult.success) {
                    this.log('Correção do termo aplicada', 'success');
                } else {
                    this.log('Falha na correção do termo', 'warn');
                }
            }
            
            this.initialized = true;
            this.log('Sistema de histórico inicializado com sucesso!', 'success');
            
            return true;
            
        } catch (error) {
            this.log(`Erro na inicialização: ${error.message}`, 'error');
            return false;
        }
    }
    
    /**
     * Executar diagnóstico completo
     */
    runDiagnostics() {
        this.log('Executando diagnóstico...');
        
        const diagnostics = {
            timestamp: new Date().toISOString(),
            loader: {
                initialized: this.initialized,
                loadedScripts: Array.from(this.loadedScripts)
            },
            dependencies: {
                historyManager: !!window.HistoryManager,
                modulesHistoryManager: !!window.ModulesHistoryManager,
                supabaseManager: !!window.supabaseManager,
                supabaseConnected: window.supabaseManager ? window.supabaseManager.isConnected() : false
            },
            functions: {
                initializeModulesHistory: typeof window.initializeModulesHistory,
                applyTermoHistoryFix: typeof window.applyTermoHistoryFix,
                diagnoseTermoHistory: typeof window.diagnoseTermoHistory,
                testTermoHistory: typeof window.testTermoHistory
            }
        };
        
        // Diagnóstico específico dos módulos
        if (window.modulesHistoryManager) {
            diagnostics.modules = window.modulesHistoryManager.diagnoseAllModules();
        }
        
        this.log('Diagnóstico completo:', 'info');
        console.table(diagnostics.dependencies);
        console.table(diagnostics.functions);
        
        return diagnostics;
    }
    
    /**
     * Executar testes
     */
    async runTests() {
        this.log('Executando testes...');
        
        const results = {
            timestamp: new Date().toISOString(),
            tests: {}
        };
        
        // Teste do termo
        if (window.testTermoHistory) {
            try {
                results.tests.termo = await window.testTermoHistory();
                this.log('Teste do termo concluído', 'success');
            } catch (error) {
                results.tests.termo = { error: error.message };
                this.log(`Erro no teste do termo: ${error.message}`, 'error');
            }
        }
        
        // Teste geral dos módulos
        if (window.modulesHistoryManager) {
            try {
                results.tests.modules = window.modulesHistoryManager.getAllStats();
                this.log('Estatísticas dos módulos obtidas', 'success');
            } catch (error) {
                results.tests.modules = { error: error.message };
                this.log(`Erro ao obter estatísticas: ${error.message}`, 'error');
            }
        }
        
        this.log('Testes concluídos:', 'success');
        console.log('📊 Resultados dos testes:', results);
        
        return results;
    }
    
    /**
     * Inicialização completa
     */
    async initialize() {
        this.log('🚀 Iniciando integração de histórico...');
        
        try {
            // 1. Carregar scripts
            await this.loadAllScripts();
            
            // 2. Aguardar DOM estar pronto
            if (document.readyState === 'loading') {
                await this.waitForCondition(
                    () => document.readyState === 'complete',
                    'DOM estar pronto'
                );
            }
            
            // 3. Inicializar sistema
            const success = await this.initializeHistorySystem();
            
            // 4. Executar diagnóstico
            const diagnostics = this.runDiagnostics();
            
            if (success) {
                this.log('🎉 Integração de histórico concluída com sucesso!', 'success');
                
                // Mostrar resumo
                console.log('📋 RESUMO DA INTEGRAÇÃO:');
                console.log('✅ HistoryManager:', !!window.HistoryManager);
                console.log('✅ ModulesHistoryManager:', !!window.ModulesHistoryManager);
                console.log('✅ Supabase:', !!window.supabaseManager);
                console.log('✅ Correção Termo:', !!window.applyTermoHistoryFix);
                console.log('📊 Execute runHistoryTests() para testar');
                
            } else {
                this.log('⚠️ Integração concluída com avisos', 'warn');
            }
            
            return { success, diagnostics };
            
        } catch (error) {
            this.log(`❌ Erro na integração: ${error.message}`, 'error');
            return { success: false, error: error.message };
        }
    }
}

// Criar instância global
const historyIntegrationLoader = new HistoryIntegrationLoader();

// Expor globalmente
window.HistoryIntegrationLoader = HistoryIntegrationLoader;
window.historyIntegrationLoader = historyIntegrationLoader;

// Funções de conveniência
window.initializeHistoryIntegration = () => historyIntegrationLoader.initialize();
window.runHistoryDiagnostics = () => historyIntegrationLoader.runDiagnostics();
window.runHistoryTests = () => historyIntegrationLoader.runTests();

// Auto-inicializar
if (typeof window !== 'undefined') {
    const autoInit = () => {
        // Aguardar um pouco para outros scripts carregarem
        setTimeout(() => {
            historyIntegrationLoader.initialize().catch(error => {
                console.error('❌ Erro na auto-inicialização:', error);
            });
        }, 1000);
    };
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', autoInit);
    } else {
        autoInit();
    }
}

console.log('🔧 History Integration Loader carregado');
console.log('🚀 Execute initializeHistoryIntegration() para inicializar manualmente');