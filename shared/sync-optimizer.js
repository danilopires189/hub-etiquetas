/**
 * Otimizador de Sincronização
 * Reduz drasticamente as consultas ao banco de dados
 */

import cacheManager from './cache-manager.js';

class SyncOptimizer {
    constructor() {
        this.lastSync = new Map();
        this.syncQueue = [];
        this.batchSize = 10;
        this.minSyncInterval = 5 * 60 * 1000; // 5 minutos mínimo
        this.adaptiveInterval = 5 * 60 * 1000; // Começa com 5 minutos
        this.maxInterval = 30 * 60 * 1000; // Máximo 30 minutos
        this.activityLevel = 0;
        
        console.log('⚡ Sync Optimizer inicializado');
        this.startAdaptiveSync();
    }

    /**
     * Verificar se sincronização é necessária
     */
    needsSync(type, data = null) {
        const lastSyncTime = this.lastSync.get(type) || 0;
        const now = Date.now();
        const timeSinceLastSync = now - lastSyncTime;

        // Critérios para sincronização
        const conditions = [
            timeSinceLastSync > this.adaptiveInterval, // Intervalo adaptativo
            this.syncQueue.length >= this.batchSize, // Queue cheia
            this.isHighPriorityData(type, data), // Dados críticos
            !navigator.onLine && this.syncQueue.length > 0 // Reconexão após offline
        ];

        return conditions.some(condition => condition);
    }

    /**
     * Verificar se dados são de alta prioridade
     */
    isHighPriorityData(type, data) {
        const highPriorityTypes = [
            'global_counter',
            'critical_error',
            'user_authentication'
        ];

        return highPriorityTypes.includes(type) || 
               (data && data.priority === 'high');
    }

    /**
     * Adicionar à queue de sincronização
     */
    addToQueue(type, operation, data, priority = 'normal') {
        const queueItem = {
            type,
            operation,
            data,
            priority,
            timestamp: Date.now(),
            retries: 0
        };

        // Inserir baseado na prioridade
        if (priority === 'high') {
            this.syncQueue.unshift(queueItem);
        } else {
            this.syncQueue.push(queueItem);
        }

        console.log(`📝 Adicionado à queue: ${type} (${priority})`);

        // Sincronizar imediatamente se for alta prioridade
        if (priority === 'high') {
            this.processSyncQueue();
        }
    }

    /**
     * Processar queue de sincronização em lotes
     */
    async processSyncQueue() {
        if (this.syncQueue.length === 0 || !navigator.onLine) {
            return;
        }

        console.log(`🔄 Processando queue: ${this.syncQueue.length} itens`);

        // Processar em lotes para reduzir overhead
        const batch = this.syncQueue.splice(0, this.batchSize);
        const promises = batch.map(item => this.processSyncItem(item));

        try {
            const results = await Promise.allSettled(promises);
            
            // Reprocessar itens que falharam
            results.forEach((result, index) => {
                if (result.status === 'rejected') {
                    const failedItem = batch[index];
                    failedItem.retries++;
                    
                    if (failedItem.retries < 3) {
                        // Recolocar na queue com prioridade reduzida
                        this.syncQueue.push(failedItem);
                        console.warn(`⚠️ Reprocessando item: ${failedItem.type} (tentativa ${failedItem.retries})`);
                    } else {
                        console.error(`❌ Item descartado após 3 tentativas: ${failedItem.type}`);
                    }
                }
            });

            // Atualizar nível de atividade
            this.updateActivityLevel(batch.length);
            
        } catch (error) {
            console.error('❌ Erro no processamento da queue:', error);
        }
    }

    /**
     * Processar item individual da queue
     */
    async processSyncItem(item) {
        try {
            // Verificar se ainda é necessário sincronizar
            const cached = cacheManager.get(`sync_${item.type}`, item.data);
            if (cached && (Date.now() - cached.timestamp) < 60000) {
                console.log(`⏭️ Sync desnecessário (cache recente): ${item.type}`);
                return;
            }

            // Executar operação
            let result;
            switch (item.operation) {
                case 'update_counter':
                    result = await this.syncCounter(item.data);
                    break;
                case 'save_label':
                    result = await this.syncLabel(item.data);
                    break;
                case 'get_stats':
                    result = await this.syncStats(item.data);
                    break;
                default:
                    console.warn(`⚠️ Operação desconhecida: ${item.operation}`);
                    return;
            }

            // Cache resultado para evitar sincronizações desnecessárias
            cacheManager.set(`sync_${item.type}`, result, item.data);
            this.lastSync.set(item.type, Date.now());

            console.log(`✅ Sync concluído: ${item.type}`);
            return result;

        } catch (error) {
            console.error(`❌ Erro no sync de ${item.type}:`, error);
            throw error;
        }
    }

    /**
     * Sincronizar contador (otimizado)
     */
    async syncCounter(data) {
        if (!window.supabaseManager) {
            throw new Error('SupabaseManager não disponível');
        }

        // Verificar se realmente precisa atualizar
        const currentStats = await window.supabaseManager.getCounterStats();
        const expectedValue = currentStats.total_count + data.increment;

        // Se o valor já está correto, não fazer nada
        if (Math.abs(currentStats.total_count - expectedValue) < data.increment) {
            console.log('📊 Contador já sincronizado, pulando atualização');
            return currentStats;
        }

        return await window.supabaseManager.updateGlobalCounter(data.increment, data.type);
    }

    /**
     * Sincronizar etiqueta
     */
    async syncLabel(data) {
        if (!window.supabaseManager) {
            throw new Error('SupabaseManager não disponível');
        }

        return await window.supabaseManager.saveLabelGeneration(data);
    }

    /**
     * Sincronizar estatísticas
     */
    async syncStats(data) {
        if (!window.supabaseManager) {
            throw new Error('SupabaseManager não disponível');
        }

        return await window.supabaseManager.getStatistics(data);
    }

    /**
     * Atualizar nível de atividade e ajustar intervalo
     */
    updateActivityLevel(processedItems) {
        this.activityLevel = Math.max(0, this.activityLevel + processedItems - 1);

        // Ajustar intervalo baseado na atividade
        if (this.activityLevel > 10) {
            // Alta atividade - sincronizar mais frequentemente
            this.adaptiveInterval = Math.max(this.minSyncInterval, this.adaptiveInterval * 0.8);
        } else if (this.activityLevel < 3) {
            // Baixa atividade - sincronizar menos frequentemente
            this.adaptiveInterval = Math.min(this.maxInterval, this.adaptiveInterval * 1.2);
        }

        console.log(`📈 Atividade: ${this.activityLevel}, Intervalo: ${Math.round(this.adaptiveInterval/1000)}s`);
    }

    /**
     * Iniciar sincronização adaptativa
     */
    startAdaptiveSync() {
        const syncLoop = () => {
            if (this.syncQueue.length > 0) {
                this.processSyncQueue();
            }

            // Reduzir atividade gradualmente
            this.activityLevel = Math.max(0, this.activityLevel - 0.1);

            setTimeout(syncLoop, this.adaptiveInterval);
        };

        setTimeout(syncLoop, this.adaptiveInterval);
        console.log('🔄 Sincronização adaptativa iniciada');
    }

    /**
     * Forçar sincronização imediata
     */
    async forcSync() {
        console.log('🚀 Sincronização forçada iniciada');
        await this.processSyncQueue();
    }

    /**
     * Limpar queue (emergência)
     */
    clearQueue() {
        const cleared = this.syncQueue.length;
        this.syncQueue = [];
        console.log(`🗑️ Queue limpa: ${cleared} itens removidos`);
    }

    /**
     * Obter estatísticas
     */
    getStats() {
        return {
            queueSize: this.syncQueue.length,
            activityLevel: this.activityLevel,
            adaptiveInterval: Math.round(this.adaptiveInterval / 1000) + 's',
            lastSyncTimes: Object.fromEntries(this.lastSync),
            highPriorityItems: this.syncQueue.filter(item => item.priority === 'high').length
        };
    }
}

// Instância global
window.syncOptimizer = new SyncOptimizer();

// Integrar com eventos de conectividade
window.addEventListener('online', () => {
    console.log('🌐 Conectividade restaurada - processando queue');
    window.syncOptimizer.processSyncQueue();
});

window.addEventListener('offline', () => {
    console.log('📱 Modo offline - queue será processada quando reconectar');
});

export default window.syncOptimizer;