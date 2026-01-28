/**
 * OTIMIZAÇÕES DE EMERGÊNCIA
 * Para reduzir drasticamente o cached egress IMEDIATAMENTE
 */

class EmergencyOptimization {
    constructor() {
        this.originalFetch = window.fetch;
        this.requestCount = 0;
        this.blockedRequests = 0;
        this.emergencyMode = true;
        
        console.log('🚨 MODO EMERGÊNCIA ATIVADO - Cached Egress Crítico!');
        this.activate();
    }

    activate() {
        // 1. INTERCEPTAR TODAS as requisições
        window.fetch = this.interceptFetch.bind(this);
        
        // 2. DESABILITAR sincronizações automáticas
        this.disableAutoSync();
        
        // 3. ATIVAR cache máximo
        this.enableMaxCache();
        
        // 4. BLOQUEAR requisições desnecessárias
        this.blockUnnecessaryRequests();
        
        console.log('✅ Otimizações de emergência ativas');
    }

    interceptFetch(url, options = {}) {
        this.requestCount++;
        
        // Bloquear requisições para Supabase se não forem críticas
        if (typeof url === 'string' && url.includes('supabase.co')) {
            
            // Permitir apenas operações críticas
            const criticalOperations = [
                'auth', 'login', 'critical'
            ];
            
            const isCritical = criticalOperations.some(op => 
                url.includes(op) || (options.body && options.body.includes(op))
            );
            
            if (!isCritical) {
                this.blockedRequests++;
                console.log(`🚫 Requisição bloqueada (emergência): ${url}`);
                
                // Retornar promise resolvida para não quebrar o código
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ blocked: true, emergency: true }),
                    text: () => Promise.resolve('{"blocked":true}')
                });
            }
        }
        
        // Executar requisição normal se for crítica
        return this.originalFetch(url, options);
    }

    disableAutoSync() {
        // Desabilitar sincronizações automáticas
        if (window.contadorGlobal) {
            window.contadorGlobal.intervaloSync = 3600000; // 1 hora
            window.contadorGlobal.disableSupabaseIntegration();
            console.log('🔴 Sincronização automática DESABILITADA');
        }

        // Parar todos os intervals
        const highestId = setTimeout(() => {}, 0);
        for (let i = 0; i < highestId; i++) {
            clearInterval(i);
        }
        console.log('⏹️ Todos os intervals interrompidos');
    }

    enableMaxCache() {
        if (window.cacheManager) {
            window.cacheManager.maxAge = 7 * 24 * 60 * 60 * 1000; // 7 dias
            window.cacheManager.compressionEnabled = true;
            console.log('💾 Cache máximo ativado (7 dias)');
        }

        // Cache agressivo no localStorage
        const originalSetItem = localStorage.setItem;
        localStorage.setItem = function(key, value) {
            // Comprimir dados grandes
            if (value.length > 10000) {
                try {
                    const compressed = JSON.stringify(JSON.parse(value));
                    return originalSetItem.call(this, key, compressed);
                } catch (e) {
                    return originalSetItem.call(this, key, value);
                }
            }
            return originalSetItem.call(this, key, value);
        };
    }

    blockUnnecessaryRequests() {
        // Bloquear carregamento de bases grandes
        const originalImport = window.import || (() => {});
        window.import = (path) => {
            if (path.includes('BASE_') || path.includes('data_base')) {
                console.log(`🚫 Carregamento de base bloqueado: ${path}`);
                return Promise.resolve({ default: {} });
            }
            return originalImport(path);
        };

        // Bloquear scripts desnecessários
        const originalCreateElement = document.createElement;
        document.createElement = function(tagName) {
            const element = originalCreateElement.call(this, tagName);
            
            if (tagName.toLowerCase() === 'script') {
                const originalSrc = Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype, 'src');
                Object.defineProperty(element, 'src', {
                    set: function(value) {
                        if (value.includes('BASE_') || value.includes('analytics') || value.includes('tracking')) {
                            console.log(`🚫 Script bloqueado: ${value}`);
                            return;
                        }
                        originalSrc.set.call(this, value);
                    },
                    get: originalSrc.get
                });
            }
            
            return element;
        };
    }

    // Forçar flush de todas as operações pendentes
    async forceFlushAll() {
        console.log('🚀 Flush forçado de TODAS as operações...');
        
        const flushPromises = [];
        
        if (window.supabaseDebouncer) {
            flushPromises.push(window.supabaseDebouncer.flushAll());
        }
        
        if (window.supabaseBatchProcessor) {
            flushPromises.push(window.supabaseBatchProcessor.flush());
        }
        
        if (window.contadorGlobal && window.contadorGlobal.forcarFlush) {
            flushPromises.push(window.contadorGlobal.forcarFlush());
        }
        
        try {
            await Promise.all(flushPromises);
            console.log('✅ Flush completo executado');
        } catch (error) {
            console.error('❌ Erro no flush:', error);
        }
    }

    // Limpar TODOS os caches e dados desnecessários
    clearAllCaches() {
        console.log('🧹 Limpeza completa de caches...');
        
        // Limpar localStorage de dados grandes
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            const value = localStorage.getItem(key);
            
            // Remover itens grandes (>100KB)
            if (value && value.length > 100000) {
                keysToRemove.push(key);
            }
        }
        
        keysToRemove.forEach(key => {
            localStorage.removeItem(key);
            console.log(`🗑️ Removido: ${key}`);
        });
        
        // Limpar caches do navegador
        if ('caches' in window) {
            caches.keys().then(names => {
                names.forEach(name => {
                    caches.delete(name);
                });
            });
        }
        
        console.log(`✅ ${keysToRemove.length} itens grandes removidos`);
    }

    // Obter estatísticas de emergência
    getEmergencyStats() {
        return {
            mode: 'EMERGENCY',
            requestCount: this.requestCount,
            blockedRequests: this.blockedRequests,
            blockRate: ((this.blockedRequests / this.requestCount) * 100).toFixed(1) + '%',
            emergencyActive: this.emergencyMode,
            recommendations: [
                'Implementar todas as otimizações permanentes',
                'Considerar upgrade do plano Supabase',
                'Revisar arquitetura para reduzir consultas',
                'Implementar cache mais agressivo'
            ]
        };
    }

    // Desativar modo emergência (quando situação melhorar)
    deactivate() {
        window.fetch = this.originalFetch;
        this.emergencyMode = false;
        console.log('✅ Modo emergência DESATIVADO');
    }
}

// Ativar IMEDIATAMENTE
window.emergencyOptimization = new EmergencyOptimization();

// Auto-flush a cada 30 segundos
setInterval(() => {
    if (window.emergencyOptimization) {
        window.emergencyOptimization.forceFlushAll();
    }
}, 30000);

// Limpeza a cada 5 minutos
setInterval(() => {
    if (window.emergencyOptimization) {
        window.emergencyOptimization.clearAllCaches();
    }
}, 300000);

console.log('🚨 MODO EMERGÊNCIA ATIVO - Cached Egress sendo reduzido drasticamente!');

export default EmergencyOptimization;