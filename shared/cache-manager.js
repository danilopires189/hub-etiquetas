/**
 * Sistema de Cache Inteligente para Hub de Etiquetas
 * Otimiza o acesso a dados reduzindo requisições ao banco
 * @version 2.0.0
 */

class CacheManager {
    constructor() {
        this.cachePrefix = 'hub_etiquetas_cache_';
        this.maxAge = 24 * 60 * 60 * 1000; // 24 horas
        this.compressionEnabled = true;
    }

    generateCacheKey(type, params = {}) {
        const paramString = JSON.stringify(params);
        const hash = this.simpleHash(paramString);
        return `${this.cachePrefix}${type}_${hash}`;
    }

    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(36);
    }

    isValid(key) {
        try {
            const item = localStorage.getItem(key);
            if (!item) return false;

            const cached = JSON.parse(item);
            const now = Date.now();

            return (now - cached.timestamp) < this.maxAge;
        } catch (error) {
            return false;
        }
    }

    get(type, params = {}) {
        const key = this.generateCacheKey(type, params);

        if (!this.isValid(key)) {
            return null;
        }

        try {
            const item = localStorage.getItem(key);
            const cached = JSON.parse(item);
            return this.compressionEnabled ? this.decompress(cached.data) : cached.data;
        } catch (error) {
            return null;
        }
    }

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
            this.cleanupOldCache();

        } catch (error) {
            if (error.name === 'QuotaExceededError') {
                this.clearExpiredCache();
                try {
                    localStorage.setItem(key, JSON.stringify(cacheItem));
                } catch (retryError) {
                    // Silent fail
                }
            }
        }
    }

    compress(data) {
        try {
            const jsonString = JSON.stringify(data);
            return jsonString.replace(/\s+/g, ' ').trim();
        } catch (error) {
            return data;
        }
    }

    decompress(compressedData) {
        try {
            return JSON.parse(compressedData);
        } catch (error) {
            return compressedData;
        }
    }

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
                    keysToRemove.push(key);
                }
            }
        }

        keysToRemove.forEach(key => {
            localStorage.removeItem(key);
        });
    }

    cleanupOldCache() {
        if (Math.random() < 0.1) {
            setTimeout(() => this.clearExpiredCache(), 1000);
        }
    }

    invalidate(type, params = {}) {
        const key = this.generateCacheKey(type, params);
        localStorage.removeItem(key);
    }

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
    }

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

window.cacheManager = new CacheManager();

export default window.cacheManager;