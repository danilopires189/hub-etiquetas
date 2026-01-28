/**
 * Monitor de Performance em Tempo Real
 * Monitora e otimiza automaticamente o uso de recursos
 */

class PerformanceMonitor {
    constructor() {
        this.metrics = {
            databaseQueries: 0,
            cacheHits: 0,
            cacheMisses: 0,
            syncOperations: 0,
            memoryUsage: [],
            networkRequests: 0,
            errors: []
        };

        this.thresholds = {
            maxDatabaseQueries: 100, // por minuto
            maxMemoryUsage: 80, // porcentagem
            maxSyncOperations: 20, // por minuto
            maxErrors: 5 // por minuto
        };

        this.startTime = Date.now();
        this.isMonitoring = false;

        console.log('📊 Performance Monitor inicializado');
    }

    /**
     * Iniciar monitoramento
     */
    start() {
        if (this.isMonitoring) return;

        this.isMonitoring = true;
        this.setupEventListeners();
        this.startPeriodicChecks();

        console.log('🚀 Monitoramento de performance iniciado');
    }

    /**
     * Parar monitoramento
     */
    stop() {
        this.isMonitoring = false;
        console.log('⏹️ Monitoramento de performance parado');
    }

    /**
     * Configurar listeners de eventos
     */
    setupEventListeners() {
        // Monitorar consultas ao banco
        const originalFetch = window.fetch;
        window.fetch = async (...args) => {
            const url = args[0];
            if (typeof url === 'string' && url.includes('supabase')) {
                this.recordDatabaseQuery();
            }
            this.recordNetworkRequest();
            return originalFetch.apply(window, args);
        };

        // Monitorar cache hits/misses
        if (window.cacheManager) {
            const originalGet = window.cacheManager.get;
            window.cacheManager.get = (...args) => {
                const result = originalGet.apply(window.cacheManager, args);
                if (result) {
                    this.recordCacheHit();
                } else {
                    this.recordCacheMiss();
                }
                return result;
            };
        }

        // Monitorar operações de sync
        if (window.syncOptimizer) {
            const originalAddToQueue = window.syncOptimizer.addToQueue;
            window.syncOptimizer.addToQueue = (...args) => {
                this.recordSyncOperation();
                return originalAddToQueue.apply(window.syncOptimizer, args);
            };
        }

        // Monitorar erros
        window.addEventListener('error', (event) => {
            this.recordError(event.error);
        });

        window.addEventListener('unhandledrejection', (event) => {
            this.recordError(event.reason);
        });
    }

    /**
     * Iniciar verificações periódicas
     */
    startPeriodicChecks() {
        // Verificar a cada 30 segundos
        setInterval(() => {
            if (!this.isMonitoring) return;

            this.checkMemoryUsage();
            this.checkThresholds();
            this.optimizeIfNeeded();
        }, 30000);

        // Relatório detalhado a cada 5 minutos
        setInterval(() => {
            if (!this.isMonitoring) return;
            this.generateReport();
        }, 300000);
    }

    /**
     * Registrar consulta ao banco
     */
    recordDatabaseQuery() {
        this.metrics.databaseQueries++;
    }

    /**
     * Registrar cache hit
     */
    recordCacheHit() {
        this.metrics.cacheHits++;
    }

    /**
     * Registrar cache miss
     */
    recordCacheMiss() {
        this.metrics.cacheMisses++;
    }

    /**
     * Registrar operação de sync
     */
    recordSyncOperation() {
        this.metrics.syncOperations++;
    }

    /**
     * Registrar requisição de rede
     */
    recordNetworkRequest() {
        this.metrics.networkRequests++;
    }

    /**
     * Registrar erro
     */
    recordError(error) {
        this.metrics.errors.push({
            message: error.message || error.toString(),
            timestamp: Date.now(),
            stack: error.stack
        });

        // Manter apenas os últimos 50 erros
        if (this.metrics.errors.length > 50) {
            this.metrics.errors = this.metrics.errors.slice(-50);
        }
    }

    /**
     * Verificar uso de memória
     */
    checkMemoryUsage() {
        if (performance.memory) {
            const usage = {
                used: performance.memory.usedJSHeapSize,
                total: performance.memory.totalJSHeapSize,
                limit: performance.memory.jsHeapSizeLimit,
                timestamp: Date.now()
            };

            this.metrics.memoryUsage.push(usage);

            // Manter apenas os últimos 100 registros
            if (this.metrics.memoryUsage.length > 100) {
                this.metrics.memoryUsage = this.metrics.memoryUsage.slice(-100);
            }
        }
    }

    /**
     * Verificar se thresholds foram ultrapassados
     */
    checkThresholds() {
        const now = Date.now();
        const oneMinuteAgo = now - 60000;

        // Verificar consultas ao banco por minuto
        const recentQueries = this.getMetricsSince(oneMinuteAgo, 'databaseQueries');
        if (recentQueries > this.thresholds.maxDatabaseQueries) {
            console.warn(`⚠️ Muitas consultas ao banco: ${recentQueries}/min (limite: ${this.thresholds.maxDatabaseQueries})`);
            this.triggerDatabaseOptimization();
        }

        // Verificar uso de memória
        const latestMemory = this.metrics.memoryUsage[this.metrics.memoryUsage.length - 1];
        if (latestMemory) {
            const memoryPercent = (latestMemory.used / latestMemory.limit) * 100;
            if (memoryPercent > this.thresholds.maxMemoryUsage) {
                console.warn(`⚠️ Alto uso de memória: ${memoryPercent.toFixed(1)}%`);
                this.triggerMemoryOptimization();
            }
        }

        // Verificar operações de sync por minuto
        const recentSyncs = this.getMetricsSince(oneMinuteAgo, 'syncOperations');
        if (recentSyncs > this.thresholds.maxSyncOperations) {
            console.warn(`⚠️ Muitas operações de sync: ${recentSyncs}/min (limite: ${this.thresholds.maxSyncOperations})`);
            this.triggerSyncOptimization();
        }

        // Verificar erros por minuto
        const recentErrors = this.metrics.errors.filter(error => error.timestamp > oneMinuteAgo).length;
        if (recentErrors > this.thresholds.maxErrors) {
            console.warn(`⚠️ Muitos erros: ${recentErrors}/min (limite: ${this.thresholds.maxErrors})`);
        }
    }

    /**
     * Obter métricas desde um timestamp
     */
    getMetricsSince(timestamp, metric) {
        // Para métricas simples, assumir distribuição uniforme
        const totalTime = Date.now() - this.startTime;
        const timeWindow = Date.now() - timestamp;
        const ratio = timeWindow / totalTime;

        return Math.round(this.metrics[metric] * ratio);
    }

    /**
     * Otimizar automaticamente se necessário
     */
    optimizeIfNeeded() {
        const cacheHitRate = this.getCacheHitRate();
        
        if (cacheHitRate < 0.7) { // Menos de 70% de cache hits
            console.log('🔧 Taxa de cache baixa, otimizando...');
            this.optimizeCache();
        }
    }

    /**
     * Calcular taxa de cache hits
     */
    getCacheHitRate() {
        const total = this.metrics.cacheHits + this.metrics.cacheMisses;
        return total > 0 ? this.metrics.cacheHits / total : 0;
    }

    /**
     * Otimizar cache
     */
    optimizeCache() {
        if (window.cacheManager) {
            // Aumentar tempo de cache para dados frequentemente acessados
            window.cacheManager.maxAge *= 1.2;
            console.log('📈 Tempo de cache aumentado para melhorar hit rate');
        }
    }

    /**
     * Otimizar banco de dados
     */
    triggerDatabaseOptimization() {
        if (window.databaseOptimizer) {
            // Aumentar cache de dados críticos
            window.databaseOptimizer.preloadCriticalBases();
            console.log('🗄️ Pré-carregamento de bases críticas ativado');
        }
    }

    /**
     * Otimizar memória
     */
    triggerMemoryOptimization() {
        if (window.cacheManager) {
            window.cacheManager.clearExpiredCache();
        }

        if (window.databaseOptimizer) {
            window.databaseOptimizer.clearUnusedData();
        }

        console.log('🧹 Limpeza de memória executada');
    }

    /**
     * Otimizar sincronização
     */
    triggerSyncOptimization() {
        if (window.syncOptimizer) {
            // Aumentar intervalo de sync para reduzir frequência
            window.syncOptimizer.adaptiveInterval *= 1.5;
            console.log('⏰ Intervalo de sincronização aumentado');
        }
    }

    /**
     * Gerar relatório de performance
     */
    generateReport() {
        const uptime = Date.now() - this.startTime;
        const cacheHitRate = this.getCacheHitRate();
        
        const report = {
            uptime: Math.round(uptime / 1000 / 60) + ' minutos',
            databaseQueries: this.metrics.databaseQueries,
            networkRequests: this.metrics.networkRequests,
            cacheHitRate: (cacheHitRate * 100).toFixed(1) + '%',
            syncOperations: this.metrics.syncOperations,
            errors: this.metrics.errors.length,
            memoryTrend: this.getMemoryTrend()
        };

        console.log('📊 Relatório de Performance:', report);
        return report;
    }

    /**
     * Obter tendência de uso de memória
     */
    getMemoryTrend() {
        if (this.metrics.memoryUsage.length < 2) {
            return 'Dados insuficientes';
        }

        const recent = this.metrics.memoryUsage.slice(-10);
        const first = recent[0];
        const last = recent[recent.length - 1];

        const trend = ((last.used - first.used) / first.used) * 100;

        if (trend > 5) return 'Crescendo';
        if (trend < -5) return 'Diminuindo';
        return 'Estável';
    }

    /**
     * Obter métricas atuais
     */
    getMetrics() {
        return {
            ...this.metrics,
            cacheHitRate: this.getCacheHitRate(),
            uptime: Date.now() - this.startTime,
            memoryTrend: this.getMemoryTrend()
        };
    }

    /**
     * Resetar métricas
     */
    resetMetrics() {
        this.metrics = {
            databaseQueries: 0,
            cacheHits: 0,
            cacheMisses: 0,
            syncOperations: 0,
            memoryUsage: [],
            networkRequests: 0,
            errors: []
        };
        this.startTime = Date.now();
        console.log('🔄 Métricas resetadas');
    }
}

// Instância global
window.performanceMonitor = new PerformanceMonitor();

// Iniciar automaticamente
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.performanceMonitor.start();
    });
} else {
    window.performanceMonitor.start();
}

export default window.performanceMonitor;