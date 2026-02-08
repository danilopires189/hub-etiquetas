/**
 * Configurações de Performance para Hub de Etiquetas
 * Centraliza todas as configurações de otimização
 */

export const PERFORMANCE_CONFIG = {
    // Cache Settings
    cache: {
        maxAge: 24 * 60 * 60 * 1000, // 24 horas
        compressionEnabled: true,
        maxCacheSize: 50 * 1024 * 1024, // 50MB
        cleanupInterval: 60 * 60 * 1000, // 1 hora
        criticalDataTTL: 5 * 60 * 1000 // 5 minutos para dados críticos
    },

    // Database Optimization
    database: {
        preloadCriticalBases: true,
        indexingEnabled: true,
        partialLoadingEnabled: true,
        defaultPageSize: 100,
        memoryCleanupInterval: 10 * 60 * 1000, // 10 minutos
        maxMemoryUsage: 100 * 1024 * 1024 // 100MB
    },

    // Sync Optimization
    sync: {
        minInterval: 5 * 60 * 1000, // 5 minutos mínimo
        maxInterval: 30 * 60 * 1000, // 30 minutos máximo
        batchSize: 10,
        maxRetries: 3,
        adaptiveSync: true,
        highPriorityTypes: [
            'global_counter',
            'critical_error',
            'user_authentication'
        ]
    },

    // Lazy Loading
    lazyLoading: {
        enabled: true,
        intersectionMargin: '50px',
        preloadCritical: true,
        criticalModules: [
            'cache-manager',
            'database-optimizer',
            'sync-optimizer'
        ]
    },

    // Network Optimization
    network: {
        timeout: 30000, // 30 segundos
        retryDelay: 1000, // 1 segundo
        maxConcurrentRequests: 5,
        compressionEnabled: true,
        cacheHeaders: true
    },

    // Memory Management
    memory: {
        garbageCollectionInterval: 15 * 60 * 1000, // 15 minutos
        maxUnusedDataAge: 10 * 60 * 1000, // 10 minutos
        memoryWarningThreshold: 80, // 80% da memória disponível
        autoCleanup: true
    },

    // Monitoring
    monitoring: {
        enabled: true,
        logLevel: 'info', // 'debug', 'info', 'warn', 'error'
        performanceMetrics: true,
        errorTracking: true,
        usageAnalytics: false // Desabilitado por privacidade
    }
};

/**
 * Aplicar configurações de performance
 */
export function applyPerformanceConfig() {
    // Configurar cache
    if (window.cacheManager) {
        window.cacheManager.maxAge = PERFORMANCE_CONFIG.cache.maxAge;
        window.cacheManager.compressionEnabled = PERFORMANCE_CONFIG.cache.compressionEnabled;
    }

    // Configurar database optimizer
    if (window.databaseOptimizer) {
        window.databaseOptimizer.defaultPageSize = PERFORMANCE_CONFIG.database.defaultPageSize;
        window.databaseOptimizer.indexingEnabled = PERFORMANCE_CONFIG.database.indexingEnabled;
    }

    // Configurar sync optimizer
    if (window.syncOptimizer) {
        window.syncOptimizer.minSyncInterval = PERFORMANCE_CONFIG.sync.minInterval;
        window.syncOptimizer.maxInterval = PERFORMANCE_CONFIG.sync.maxInterval;
        window.syncOptimizer.batchSize = PERFORMANCE_CONFIG.sync.batchSize;
    }

    console.log('⚙️ Configurações de performance aplicadas');
}

/**
 * Monitorar performance
 */
export function startPerformanceMonitoring() {
    if (!PERFORMANCE_CONFIG.monitoring.enabled) {
        return;
    }

    // Monitorar uso de memória
    setInterval(() => {
        if (performance.memory) {
            const memoryUsage = {
                used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
                total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
                limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
            };

            const usagePercent = (memoryUsage.used / memoryUsage.limit) * 100;

            if (usagePercent > PERFORMANCE_CONFIG.memory.memoryWarningThreshold) {
                console.warn(`⚠️ Alto uso de memória: ${usagePercent.toFixed(1)}% (${memoryUsage.used}MB/${memoryUsage.limit}MB)`);
                
                if (PERFORMANCE_CONFIG.memory.autoCleanup) {
                    triggerMemoryCleanup();
                }
            }
        }
    }, 60000); // Verificar a cada minuto

    console.log('📊 Monitoramento de performance iniciado');
}

/**
 * Executar limpeza de memória
 */
function triggerMemoryCleanup() {
    console.log('🧹 Executando limpeza de memória...');

    // Limpar cache expirado
    if (window.cacheManager) {
        window.cacheManager.clearExpiredCache();
    }

    // Limpar dados não utilizados do database optimizer
    if (window.databaseOptimizer) {
        window.databaseOptimizer.clearUnusedData();
    }

    // Forçar garbage collection se disponível
    if (window.gc) {
        window.gc();
    }

    console.log('✅ Limpeza de memória concluída');
}

/**
 * Obter métricas de performance
 */
export function getPerformanceMetrics() {
    const metrics = {
        timestamp: new Date().toISOString(),
        memory: null,
        cache: null,
        database: null,
        sync: null,
        network: null
    };

    // Métricas de memória
    if (performance.memory) {
        metrics.memory = {
            used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
            total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
            limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
        };
    }

    // Métricas de cache
    if (window.cacheManager) {
        metrics.cache = window.cacheManager.getStats();
    }

    // Métricas de database
    if (window.databaseOptimizer) {
        metrics.database = window.databaseOptimizer.getStats();
    }

    // Métricas de sync
    if (window.syncOptimizer) {
        metrics.sync = window.syncOptimizer.getStats();
    }

    // Métricas de rede
    if (navigator.connection) {
        metrics.network = {
            effectiveType: navigator.connection.effectiveType,
            downlink: navigator.connection.downlink,
            rtt: navigator.connection.rtt,
            saveData: navigator.connection.saveData
        };
    }

    return metrics;
}

// Auto-aplicar configurações quando o módulo for carregado
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        applyPerformanceConfig();
        startPerformanceMonitoring();
    });
} else {
    applyPerformanceConfig();
    startPerformanceMonitoring();
}