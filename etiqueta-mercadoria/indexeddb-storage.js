/**
 * IndexedDB Storage - Versão Simplificada
 * Armazena histórico de etiquetas sem limite de espaço
 */

class IndexedDBStorage {
    constructor() {
        this.dbName = 'HubEtiquetasDB';
        this.version = 1;
        this.db = null;
        this.isReady = false;
    }

    async initialize() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => {
                console.error('❌ Erro ao abrir IndexedDB:', request.error);
                this.isReady = false;
                resolve(null); // Não rejeita, apenas marca como não pronto
            };

            request.onsuccess = () => {
                this.db = request.result;
                this.isReady = true;
                console.log('✅ IndexedDB conectado');
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                if (!db.objectStoreNames.contains('labelHistory')) {
                    const store = db.createObjectStore('labelHistory', { 
                        keyPath: 'id', 
                        autoIncrement: true 
                    });
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                }
            };
        });
    }

    async addLabelToHistory(data) {
        if (!this.isReady || !this.db) return;
        
        return new Promise((resolve, reject) => {
            try {
                const transaction = this.db.transaction(['labelHistory'], 'readwrite');
                const store = transaction.objectStore('labelHistory');
                
                const record = {
                    ...data,
                    timestamp: data.timestamp || new Date().toISOString()
                };
                
                const request = store.add(record);
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            } catch (error) {
                reject(error);
            }
        });
    }

    async getLabelHistory(options = {}) {
        if (!this.isReady || !this.db) return [];
        
        const limit = options.limit || 100;
        
        return new Promise((resolve, reject) => {
            try {
                const transaction = this.db.transaction(['labelHistory'], 'readonly');
                const store = transaction.objectStore('labelHistory');
                const index = store.index('timestamp');
                
                const results = [];
                const request = index.openCursor(null, 'prev');
                
                request.onsuccess = (event) => {
                    const cursor = event.target.result;
                    if (cursor && results.length < limit) {
                        results.push(cursor.value);
                        cursor.continue();
                    } else {
                        resolve(results);
                    }
                };
                
                request.onerror = () => reject(request.error);
            } catch (error) {
                reject(error);
            }
        });
    }

    async getStats() {
        if (!this.isReady || !this.db) return { labelHistory: 0 };
        
        return new Promise((resolve) => {
            try {
                const transaction = this.db.transaction(['labelHistory'], 'readonly');
                const store = transaction.objectStore('labelHistory');
                const request = store.count();
                
                request.onsuccess = () => resolve({ labelHistory: request.result });
                request.onerror = () => resolve({ labelHistory: 0 });
            } catch (error) {
                resolve({ labelHistory: 0 });
            }
        });
    }

    /**
     * Remove registros antigos (mais de X dias)
     * @param {number} daysToKeep - Dias para manter (padrão: 365 = 1 ano)
     * @returns {number} Quantidade de registros removidos
     */
    async cleanupHistory(daysToKeep = 365) {
        if (!this.isReady || !this.db) return 0;
        
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
        
        return new Promise((resolve) => {
            try {
                const transaction = this.db.transaction(['labelHistory'], 'readwrite');
                const store = transaction.objectStore('labelHistory');
                const index = store.index('timestamp');
                
                let deletedCount = 0;
                const range = IDBKeyRange.upperBound(cutoffDate.toISOString());
                const request = index.openCursor(range);
                
                request.onsuccess = (event) => {
                    const cursor = event.target.result;
                    if (cursor) {
                        store.delete(cursor.primaryKey);
                        deletedCount++;
                        cursor.continue();
                    } else {
                        if (deletedCount > 0) {
                            console.log(`🗑️ ${deletedCount} registros antigos removidos (> ${daysToKeep} dias)`);
                        }
                        resolve(deletedCount);
                    }
                };
                
                request.onerror = () => {
                    console.error('❌ Erro ao limpar histórico:', request.error);
                    resolve(0);
                };
            } catch (error) {
                console.error('❌ Erro:', error);
                resolve(0);
            }
        });
    }

    /**
     * Obtém estatísticas de uso (tamanho aproximado)
     */
    async getDetailedStats() {
        const stats = await this.getStats();
        
        // Estimativa: cada registro ~500 bytes em média
        const estimatedSizeMB = (stats.labelHistory * 500) / (1024 * 1024);
        
        return {
            totalRecords: stats.labelHistory,
            estimatedSizeMB: estimatedSizeMB.toFixed(2),
            limitMB: 250,
            usagePercent: ((estimatedSizeMB / 250) * 100).toFixed(1)
        };
    }
}

// Configurações de retenção FIXAS (usuário não pode alterar)
const RETENTION_CONFIG = {
    DAYS: 730,                // 2 anos fixo
    CLEANUP_ON_STARTUP: true,  // Limpar na inicialização
    CLEANUP_SILENT: true       // Silencioso, sem alertas
};

// Inicializar
document.addEventListener('DOMContentLoaded', async () => {
    window.storageManager = new IndexedDBStorage();
    await window.storageManager.initialize();
    
    // Limpar registros antigos automaticamente (silencioso)
    if (RETENTION_CONFIG.CLEANUP_ON_STARTUP && window.storageManager.isReady) {
        setTimeout(async () => {
            const removidos = await window.storageManager.cleanupHistory(RETENTION_CONFIG.DAYS);
            if (removidos > 0) {
                console.log(`🗑️ ${removidos} registros antigos (> 2 anos) removidos`);
            }
        }, 5000);
    }
});
