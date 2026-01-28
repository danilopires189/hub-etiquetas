/**
 * Otimizador de Base de Dados
 * Carrega dados sob demanda e implementa cache inteligente
 */

import cacheManager from './cache-manager.js';

class DatabaseOptimizer {
    constructor() {
        this.loadedBases = new Map();
        this.loadingPromises = new Map();
        this.indexedData = new Map();
        
        console.log('🔧 Database Optimizer inicializado');
    }

    /**
     * Carregar base de dados com cache e compressão
     */
    async loadBase(baseName, forceReload = false) {
        // Verificar cache primeiro
        if (!forceReload) {
            const cached = cacheManager.get(`database_${baseName}`);
            if (cached) {
                this.loadedBases.set(baseName, cached);
                this.createIndex(baseName, cached);
                return cached;
            }
        }

        // Evitar carregamentos duplicados
        if (this.loadingPromises.has(baseName)) {
            return await this.loadingPromises.get(baseName);
        }

        const loadPromise = this.loadBaseFromFile(baseName);
        this.loadingPromises.set(baseName, loadPromise);

        try {
            const data = await loadPromise;
            this.loadedBases.set(baseName, data);
            this.createIndex(baseName, data);
            
            // Salvar no cache com compressão
            cacheManager.set(`database_${baseName}`, data);
            
            // Implementar cache compartilhado entre módulos
            this.shareDataBetweenModules(baseName, data);
            
            return data;
        } finally {
            this.loadingPromises.delete(baseName);
        }
    }

    /**
     * Compartilhar dados entre módulos para evitar recarregamentos
     */
    shareDataBetweenModules(baseName, data) {
        // Criar namespace global para dados compartilhados
        if (!window.SHARED_DATABASE_CACHE) {
            window.SHARED_DATABASE_CACHE = new Map();
        }

        window.SHARED_DATABASE_CACHE.set(baseName, {
            data: data,
            timestamp: Date.now(),
            size: JSON.stringify(data).length
        });

        console.log(`🔗 Base ${baseName} compartilhada entre módulos`);
    }

    /**
     * Carregar base do arquivo
     */
    async loadBaseFromFile(baseName) {
        try {
            console.log(`📥 Carregando base: ${baseName}`);
            
            const response = await fetch(`/data_base/BASE_${baseName.toUpperCase()}.js?v=${Date.now()}`);
            if (!response.ok) {
                throw new Error(`Falha ao carregar ${baseName}: ${response.status}`);
            }

            const scriptText = await response.text();
            
            // Executar script em contexto isolado
            const scriptElement = document.createElement('script');
            scriptElement.textContent = scriptText;
            document.head.appendChild(scriptElement);
            document.head.removeChild(scriptElement);

            // Extrair dados baseado no nome da base
            let data = null;
            switch (baseName.toLowerCase()) {
                case 'barras':
                    data = window.DB_CADASTRO?.BASE_CADASTRO || [];
                    break;
                case 'lojas':
                    data = window.DB_LOJAS || {};
                    break;
                case 'cds':
                    data = window.DB_CDS || [];
                    break;
                default:
                    data = window[`DB_${baseName.toUpperCase()}`] || [];
            }

            console.log(`✅ Base ${baseName} carregada: ${Array.isArray(data) ? data.length : Object.keys(data).length} registros`);
            return data;
            
        } catch (error) {
            console.error(`❌ Erro ao carregar base ${baseName}:`, error);
            throw error;
        }
    }

    /**
     * Criar índice para busca rápida
     */
    createIndex(baseName, data) {
        const index = new Map();
        
        if (Array.isArray(data)) {
            data.forEach((item, idx) => {
                // Indexar por diferentes campos
                if (item.CODDV) index.set(item.CODDV, idx);
                if (item.BARRAS) index.set(item.BARRAS, idx);
                if (item.id) index.set(item.id, idx);
            });
        } else if (typeof data === 'object') {
            // Para objetos como DB_LOJAS
            Object.keys(data).forEach(key => {
                index.set(key, data[key]);
            });
        }

        this.indexedData.set(baseName, index);
        console.log(`📇 Índice criado para ${baseName}: ${index.size} entradas`);
    }

    /**
     * Buscar item na base com índice
     */
    async findItem(baseName, searchKey, searchValue) {
        // Garantir que a base está carregada
        const data = await this.loadBase(baseName);
        const index = this.indexedData.get(baseName);

        if (index && index.has(searchValue)) {
            const result = index.get(searchValue);
            console.log(`🎯 Busca rápida em ${baseName}: ${searchKey}=${searchValue}`);
            return Array.isArray(data) ? data[result] : result;
        }

        // Fallback para busca linear (mais lenta)
        console.log(`🔍 Busca linear em ${baseName}: ${searchKey}=${searchValue}`);
        if (Array.isArray(data)) {
            return data.find(item => item[searchKey] === searchValue);
        }

        return null;
    }

    /**
     * Buscar múltiplos itens
     */
    async findItems(baseName, searchKey, searchValues) {
        const data = await this.loadBase(baseName);
        const results = [];

        for (const value of searchValues) {
            const item = await this.findItem(baseName, searchKey, value);
            if (item) results.push(item);
        }

        return results;
    }

    /**
     * Carregar apenas dados necessários (paginação)
     */
    async loadPartialData(baseName, offset = 0, limit = 100) {
        const cacheKey = `${baseName}_partial_${offset}_${limit}`;
        
        // Verificar cache
        const cached = cacheManager.get(cacheKey);
        if (cached) {
            return cached;
        }

        // Carregar base completa se necessário
        const fullData = await this.loadBase(baseName);
        
        let partialData;
        if (Array.isArray(fullData)) {
            partialData = {
                data: fullData.slice(offset, offset + limit),
                total: fullData.length,
                offset,
                limit
            };
        } else {
            const keys = Object.keys(fullData).slice(offset, offset + limit);
            const partial = {};
            keys.forEach(key => {
                partial[key] = fullData[key];
            });
            
            partialData = {
                data: partial,
                total: Object.keys(fullData).length,
                offset,
                limit
            };
        }

        // Cache resultado
        cacheManager.set(cacheKey, partialData);
        
        return partialData;
    }

    /**
     * Pré-carregar bases críticas
     */
    async preloadCriticalBases() {
        const criticalBases = ['barras', 'lojas', 'cds'];
        
        console.log('🚀 Pré-carregando bases críticas...');
        
        const promises = criticalBases.map(base => 
            this.loadBase(base).catch(error => {
                console.warn(`⚠️ Falha ao pré-carregar ${base}:`, error);
                return null;
            })
        );

        await Promise.all(promises);
        console.log('✅ Pré-carregamento concluído');
    }

    /**
     * Limpar dados não utilizados
     */
    clearUnusedData() {
        const now = Date.now();
        const maxAge = 10 * 60 * 1000; // 10 minutos

        this.loadedBases.forEach((data, baseName) => {
            const lastAccess = this.lastAccess?.get(baseName) || 0;
            if ((now - lastAccess) > maxAge) {
                this.loadedBases.delete(baseName);
                this.indexedData.delete(baseName);
                console.log(`🗑️ Base ${baseName} removida da memória (não utilizada)`);
            }
        });
    }

    /**
     * Obter estatísticas
     */
    getStats() {
        return {
            loadedBases: this.loadedBases.size,
            indexedBases: this.indexedData.size,
            activeLoading: this.loadingPromises.size,
            memoryUsage: this.estimateMemoryUsage()
        };
    }

    /**
     * Estimar uso de memória
     */
    estimateMemoryUsage() {
        let totalSize = 0;
        
        this.loadedBases.forEach(data => {
            totalSize += JSON.stringify(data).length;
        });

        return Math.round(totalSize / 1024) + ' KB';
    }
}

// Instância global
window.databaseOptimizer = new DatabaseOptimizer();

// Pré-carregar bases críticas quando a página carregar
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.databaseOptimizer.preloadCriticalBases();
    });
} else {
    window.databaseOptimizer.preloadCriticalBases();
}

export default window.databaseOptimizer;