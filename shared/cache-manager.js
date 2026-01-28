/**
 * Sistema de Cache Inteligente para Hub de Etiquetas
 * Reduz drasticamente o cached egress do banco de dados
 */

class CacheManager {
    constructor() {
        this.cachePrefix = 'hub_etiquetas_cache_';
        this.maxAge = 24 * 60 * 60 * 1000; // 24 horas
        this.compressionEnabled = true;
        
        console.log('🗄️ Cache Manager inicializado');
    }

    /**
     * Gerar chave de cache com hash dos parâmetros
     */
    generateCacheKey(type, params = {}) {
        const paramString = JSON.stringify(params);
        const hash = this.simpleHash(paramString);
        return `${this.cachePrefix}${type}_${hash}`;
    }

    /**
     * Hash simples para chaves de cache
     */
    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash).toString(36);
    }

    /**
     * Verificar se item está no cache e é válido
     */
    isValid(key) {
        try {
            const item = localStorage.getItem(key);
            if (!item) return false;

            const cached = JSON.parse(item);
            const now = Date.now();
            
            return (now - cached.timestamp) < this.maxAge;
        } catch (error) {
            console.warn('⚠️ Erro ao verificar cache:', error);
            return false;
        }
    }

    /**
     * Obter item do cache
     */
    get(type, params = {}) {
        const key = this.generateCacheKey(type, params);
        
        if (!this.isValid(key)) {
            return null;
        }

        try {
            const item = localStorage.getItem(key);
            const cached = JSON.parse(item);
            
            console.log(`📦 Cache hit: ${type}`);
            return this.compressionEnabled ? this.decompress(cached.data) : cached.data;
        } catch (error) {
            console.warn('⚠️ Erro ao ler cache:', error);
            return null;
        }
    }

    /**
     * Salvar item no cache
     */
    set(type, data, params = {}) {
        const key = this.generateCacheKey(type, params);
        
        try {
            const cacheItem = {
                data: this.compressionEnabled ? this.compress(data) : data,
                timestamp: Date.now(),
                type: type,
                params: params
            };

            localStorage.setItem(key, JSON.stringify(cacheItem));
            console.log(`💾 Cache saved: ${type}`);
            
            // Limpar cache antigo periodicamente
            this.cleanupOldCache();
            
        } catch (error) {
            console.warn('⚠️ Erro ao salvar cache:', error);
            
            // Se localStorage estiver cheio, limpar cache antigo e tentar novamente
            if (error.name === 'QuotaExceededError') {
                this.clearExpiredCache();
                try {
                    localStorage.setItem(key, JSON.stringify(cacheItem));
                } catch (retryError) {
                    console.error('❌ Falha ao salvar cache após limpeza:', retryError);
                }
            }
        }
    }

    /**
     * Compressão simples de dados (para economizar espaço)
     */
    compress(data) {
        try {
            const jsonString = JSON.stringify(data);
            // Compressão básica removendo espaços e caracteres repetidos
            return jsonString.replace(/\s+/g, ' ').trim();
        } catch (error) {
            console.warn('⚠️ Erro na compressão:', error);
            return data;
        }
    }

    /**
     * Descompressão de dados
     */
    decompress(compressedData) {
        try {
            return JSON.parse(compressedData);
        } catch (error) {
            console.warn('⚠️ Erro na descompressão:', error);
            return compressedData;
        }
    }

    /**
     * Limpar cache expirado
     */
    clearExpiredCache() {
        const now = Date.now();
        const keysToRemove = [];

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(this.cachePrefix)) {
                try {
                    const item = JSON.parse(localStorage.getItem(key));
                    if ((now - item.timestamp) > this.maxAge) {
                        keysToRemove.push(key);
                    }
                } catch (error) {
                    keysToRemove.push(key); // Remove itens corrompidos
                }
            }
        }

        keysToRemove.forEach(key => {
            localStorage.removeItem(key);
        });

        if (keysToRemove.length > 0) {
            console.log(`🧹 Cache limpo: ${keysToRemove.length} itens removidos`);
        }
    }

    /**
     * Limpeza periódica do cache
     */
    cleanupOldCache() {
        // Executar limpeza apenas ocasionalmente para não impactar performance
        if (Math.random() < 0.1) { // 10% de chance
            setTimeout(() => this.clearExpiredCache(), 1000);
        }
    }

    /**
     * Invalidar cache específico
     */
    invalidate(type, params = {}) {
        const key = this.generateCacheKey(type, params);
        localStorage.removeItem(key);
        console.log(`🗑️ Cache invalidado: ${type}`);
    }

    /**
     * Limpar todo o cache
     */
    clearAll() {
        const keysToRemove = [];
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(this.cachePrefix)) {
                keysToRemove.push(key);
            }
        }

        keysToRemove.forEach(key => {
            localStorage.removeItem(key);
        });

        console.log(`🧹 Todo cache limpo: ${keysToRemove.length} itens removidos`);
    }

    /**
     * Obter estatísticas do cache
     */
    getStats() {
        let totalItems = 0;
        let totalSize = 0;
        let expiredItems = 0;
        const now = Date.now();

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(this.cachePrefix)) {
                totalItems++;
                const item = localStorage.getItem(key);
                totalSize += item.length;

                try {
                    const cached = JSON.parse(item);
                    if ((now - cached.timestamp) > this.maxAge) {
                        expiredItems++;
                    }
                } catch (error) {
                    expiredItems++;
                }
            }
        }

        return {
            totalItems,
            totalSize: Math.round(totalSize / 1024) + ' KB',
            expiredItems,
            hitRate: this.hitRate || 0
        };
    }
}

// Instância global
window.cacheManager = new CacheManager();

export default window.cacheManager;