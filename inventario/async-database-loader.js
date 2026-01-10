/**
 * Async Database Loader Component
 * Responsável por carregar e indexar as três bases de dados de forma assíncrona
 * Feature: inventario-database-integration
 */

class AsyncDatabaseLoader {
    constructor() {
        this.loadedDatabases = new Map();
        this.dataIndexer = null; // Will be initialized when needed
        this.loadProgress = {
            total: 3,
            loaded: 0,
            currentFile: '',
            percentage: 0,
            status: 'idle', // idle, loading, indexing, complete, error
            errors: []
        };
        this.progressCallbacks = [];
        this.useWebWorkers = false;
        this.webWorker = null;
        this.loadStartTime = null;
    }

    /**
     * Inicializar DataIndexer se necessário
     */
    async initializeDataIndexer() {
        if (!this.dataIndexer) {
            console.log('🔄 Inicializando DataIndexer...');
            
            // Aguardar um pouco para garantir que o script foi carregado
            let attempts = 0;
            const maxAttempts = 10;
            
            while (typeof DataIndexer === 'undefined' && attempts < maxAttempts) {
                console.log(`⏳ Aguardando DataIndexer... tentativa ${attempts + 1}/${maxAttempts}`);
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
            }
            
            if (typeof DataIndexer !== 'undefined') {
                try {
                    this.dataIndexer = new DataIndexer();
                    console.log('✅ DataIndexer inicializado com sucesso');
                    
                    // Verificar se os métodos essenciais existem
                    const requiredMethods = [
                        'createCDIndex',
                        'createProductIndex', 
                        'createAddressIndex',
                        'createExcludedAddressIndex',
                        'getExcludedAddresses'
                    ];
                    
                    const missingMethods = requiredMethods.filter(method => 
                        typeof this.dataIndexer[method] !== 'function'
                    );
                    
                    if (missingMethods.length > 0) {
                        console.error('❌ Métodos faltando no DataIndexer:', missingMethods);
                        throw new Error(`Missing methods: ${missingMethods.join(', ')}`);
                    }
                    
                    console.log('✅ Todos os métodos necessários estão disponíveis');
                    
                } catch (error) {
                    console.error('❌ Erro ao criar instância do DataIndexer:', error);
                    throw error;
                }
            } else {
                console.error('❌ Classe DataIndexer não está disponível após aguardar');
                console.log('📋 Variáveis globais disponíveis:', Object.keys(window).filter(key => key.includes('Data')));
                throw new Error('DataIndexer class not available after waiting');
            }
        }
        return this.dataIndexer;
    }

    /**
     * Carregar as três bases de dados de forma assíncrona
     * @param {Object} options - Opções de carregamento
     * @returns {Promise<Object>} Resultado do carregamento
     */
    async loadDatabasesAsync(options = {}) {
        const {
            useWebWorkers = false,
            lazyLoading = false,
            maxMemoryMB = 100,
            timeout = 30000
        } = options;

        this.loadStartTime = Date.now();
        this.useWebWorkers = useWebWorkers;
        this.loadProgress.status = 'loading';
        this.loadProgress.errors = [];
        
        console.log('🚀 Iniciando carregamento assíncrono das bases de dados...');
        this.notifyProgress();

        try {
            // Inicializar DataIndexer
            await this.initializeDataIndexer();
            
            // Detectar se deve usar Web Workers baseado no volume de dados
            if (await this.shouldUseWebWorkers()) {
                console.log('🔧 Volume de dados detectado: ativando Web Workers');
                this.useWebWorkers = true;
            }

            // Definir bases de dados para carregar
            const databases = [
                {
                    name: 'BASE_END',
                    path: '../data_base/BASE_END.js',
                    globalVar: 'DB_END.BASE_END',
                    type: 'addresses',
                    priority: 1
                },
                {
                    name: 'BASE_BARRAS',
                    path: '../data_base/BASE_BARRAS.js',
                    globalVar: 'DB_CADASTRO.BASE_CADASTRO',
                    type: 'products',
                    priority: 2
                },
                {
                    name: 'BASE_LOG_END',
                    path: '../data_base/BASE_LOG_END.js',
                    globalVar: 'BASE_LOG_END',
                    type: 'exclusions',
                    priority: 3
                }
            ];

            // Carregar bases de dados
            const loadResults = await this.loadDatabaseFiles(databases, timeout);
            
            // Criar índices otimizados
            this.loadProgress.status = 'indexing';
            this.loadProgress.currentFile = 'Criando índices otimizados...';
            this.notifyProgress();
            
            const indexResults = await this.createOptimizedIndexes(loadResults, lazyLoading);
            
            // Validar dados carregados
            const validationResults = this.validateLoadedData(loadResults);
            
            // Otimizar memória se necessário
            if (maxMemoryMB > 0) {
                this.dataIndexer.optimizeMemory(maxMemoryMB);
            }

            // Finalizar carregamento
            this.loadProgress.status = 'complete';
            this.loadProgress.percentage = 100;
            this.loadProgress.currentFile = 'Carregamento concluído';
            
            const totalTime = Date.now() - this.loadStartTime;
            console.log(`✅ Carregamento concluído em ${totalTime}ms`);
            
            this.notifyProgress();

            return {
                success: true,
                loadedDatabases: loadResults,
                indexes: indexResults,
                validation: validationResults,
                stats: this.getLoadingStats(),
                totalTime
            };

        } catch (error) {
            this.loadProgress.status = 'error';
            this.loadProgress.errors.push(error.message);
            
            console.error('❌ Erro durante carregamento:', error);
            this.notifyProgress();
            
            return {
                success: false,
                error: error.message,
                loadedDatabases: Array.from(this.loadedDatabases.values()),
                stats: this.getLoadingStats()
            };
        }
    }

    /**
     * Carregar arquivos de bases de dados
     * @param {Array} databases - Lista de bases para carregar
     * @param {number} timeout - Timeout em ms
     * @returns {Promise<Array>} Resultados do carregamento
     */
    async loadDatabaseFiles(databases, timeout) {
        const results = [];
        
        for (const db of databases) {
            this.loadProgress.currentFile = `Carregando ${db.name}...`;
            this.notifyProgress();
            
            try {
                const startTime = Date.now();
                const data = await this.loadSingleDatabase(db, timeout);
                const loadTime = Date.now() - startTime;
                
                if (data && Array.isArray(data) && data.length > 0) {
                    this.loadedDatabases.set(db.name, {
                        name: db.name,
                        data: data,
                        type: db.type,
                        loadTime: loadTime,
                        recordCount: data.length,
                        loaded: true
                    });
                    
                    results.push(this.loadedDatabases.get(db.name));
                    
                    this.loadProgress.loaded++;
                    this.loadProgress.percentage = (this.loadProgress.loaded / this.loadProgress.total) * 80; // 80% para carregamento
                    
                    console.log(`✅ ${db.name} carregada: ${data.length} registros em ${loadTime}ms`);
                } else {
                    throw new Error(`Dados inválidos ou vazios para ${db.name}`);
                }
                
            } catch (error) {
                console.error(`❌ Erro ao carregar ${db.name}:`, error);
                this.loadProgress.errors.push(`${db.name}: ${error.message}`);
                
                // Continuar com outras bases mesmo se uma falhar
                results.push({
                    name: db.name,
                    data: [],
                    type: db.type,
                    loadTime: 0,
                    recordCount: 0,
                    loaded: false,
                    error: error.message
                });
            }
            
            this.notifyProgress();
        }
        
        return results;
    }

    /**
     * Carregar uma única base de dados
     * @param {Object} db - Configuração da base
     * @param {number} timeout - Timeout em ms
     * @returns {Promise<Array>} Dados carregados
     */
    async loadSingleDatabase(db, timeout) {
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                reject(new Error(`Timeout ao carregar ${db.name}`));
            }, timeout);

            try {
                // Verificar se os dados já estão disponíveis globalmente
                const data = this.getGlobalData(db.globalVar);
                if (data && Array.isArray(data)) {
                    clearTimeout(timeoutId);
                    resolve(data);
                    return;
                }

                // Se não estão disponíveis, tentar carregar o script
                const script = document.createElement('script');
                script.src = db.path;
                script.async = true;
                
                script.onload = () => {
                    clearTimeout(timeoutId);
                    
                    // Aguardar um pouco para o script processar
                    setTimeout(() => {
                        const data = this.getGlobalData(db.globalVar);
                        if (data && Array.isArray(data)) {
                            resolve(data);
                        } else {
                            reject(new Error(`Dados não encontrados após carregar ${db.name}`));
                        }
                    }, 100);
                };
                
                script.onerror = () => {
                    clearTimeout(timeoutId);
                    reject(new Error(`Erro ao carregar script ${db.path}`));
                };
                
                document.head.appendChild(script);
                
            } catch (error) {
                clearTimeout(timeoutId);
                reject(error);
            }
        });
    }

    /**
     * Obter dados de variável global
     * @param {string} globalVar - Caminho da variável global (ex: 'window.DB_END.BASE_END')
     * @returns {Array|null} Dados encontrados
     */
    getGlobalData(globalVar) {
        try {
            const parts = globalVar.split('.');
            let current = window;
            
            for (const part of parts) {
                if (current && typeof current === 'object' && part in current) {
                    current = current[part];
                } else {
                    return null;
                }
            }
            
            return Array.isArray(current) ? current : null;
        } catch (error) {
            console.warn(`Erro ao acessar variável global ${globalVar}:`, error);
            return null;
        }
    }

    /**
     * Criar índices otimizados após carregamento
     * @param {Array} loadResults - Resultados do carregamento
     * @param {boolean} lazyLoading - Se deve usar carregamento lazy
     * @returns {Promise<Object>} Resultados da indexação
     */
    async createOptimizedIndexes(loadResults, lazyLoading = false) {
        const indexStartTime = Date.now();
        
        // Verificar se dataIndexer foi inicializado
        if (!this.dataIndexer) {
            console.error('❌ DataIndexer não foi inicializado');
            throw new Error('DataIndexer not initialized');
        }
        
        // Encontrar dados carregados
        const baseEnd = loadResults.find(r => r.name === 'BASE_END' && r.loaded)?.data || [];
        const baseBarras = loadResults.find(r => r.name === 'BASE_BARRAS' && r.loaded)?.data || [];
        const baseLogEnd = loadResults.find(r => r.name === 'BASE_LOG_END' && r.loaded)?.data || [];
        
        console.log(`📊 Criando índices: ${baseEnd.length} endereços, ${baseBarras.length} produtos, ${baseLogEnd.length} exclusões`);
        
        // Verificar se os métodos existem antes de chamar
        if (typeof this.dataIndexer.createCDIndex !== 'function') {
            console.error('❌ Método createCDIndex não encontrado');
            throw new Error('createCDIndex method not found');
        }
        
        if (typeof this.dataIndexer.createExcludedAddressIndex !== 'function') {
            console.error('❌ Método createExcludedAddressIndex não encontrado');
            console.log('📋 Métodos disponíveis:', Object.getOwnPropertyNames(this.dataIndexer));
            throw new Error('createExcludedAddressIndex method not found');
        }
        
        // Criar índices usando DataIndexer
        const cdIndex = this.dataIndexer.createCDIndex(baseEnd);
        const productIndex = this.dataIndexer.createProductIndex(baseBarras);
        const addressIndex = this.dataIndexer.createAddressIndex(baseEnd);
        const excludedIndex = this.dataIndexer.createExcludedAddressIndex(baseLogEnd);
        
        // Atualizar estatísticas
        this.dataIndexer.stats.totalRecords = baseEnd.length + baseBarras.length + baseLogEnd.length;
        this.dataIndexer.stats.indexedRecords = cdIndex.size + productIndex.size + addressIndex.size + excludedIndex.size;
        this.dataIndexer.stats.lastUpdated = new Date();
        
        const indexTime = Date.now() - indexStartTime;
        console.log(`✅ Índices criados em ${indexTime}ms`);
        
        return {
            cdIndex: cdIndex.size,
            productIndex: productIndex.size,
            addressIndex: addressIndex.size,
            excludedIndex: excludedIndex.size,
            indexTime,
            stats: this.dataIndexer.getIndexStats()
        };
    }

    /**
     * Validar dados carregados
     * @param {Array} loadResults - Resultados do carregamento
     * @returns {Object} Resultados da validação
     */
    validateLoadedData(loadResults) {
        const validation = {
            isValid: true,
            warnings: [],
            errors: [],
            consistency: {}
        };

        try {
            // Validar estrutura básica
            loadResults.forEach(result => {
                if (result.loaded && result.data.length === 0) {
                    validation.warnings.push(`${result.name} carregada mas está vazia`);
                }
                
                if (!result.loaded) {
                    validation.errors.push(`${result.name} não foi carregada`);
                    validation.isValid = false;
                }
            });

            // Validar consistência entre bases
            const baseEnd = loadResults.find(r => r.name === 'BASE_END' && r.loaded)?.data || [];
            const baseBarras = loadResults.find(r => r.name === 'BASE_BARRAS' && r.loaded)?.data || [];
            
            if (baseEnd.length > 0 && baseBarras.length > 0) {
                const produtosEnd = new Set(baseEnd.map(item => item.CODDV).filter(Boolean));
                const produtosBarras = new Set(baseBarras.map(item => item.CODDV).filter(Boolean));
                
                const intersection = new Set([...produtosEnd].filter(x => produtosBarras.has(x)));
                const onlyInEnd = new Set([...produtosEnd].filter(x => !produtosBarras.has(x)));
                const onlyInBarras = new Set([...produtosBarras].filter(x => !produtosEnd.has(x)));
                
                validation.consistency = {
                    totalProductsEnd: produtosEnd.size,
                    totalProductsBarras: produtosBarras.size,
                    commonProducts: intersection.size,
                    onlyInEnd: onlyInEnd.size,
                    onlyInBarras: onlyInBarras.size,
                    consistencyRate: intersection.size / Math.max(produtosEnd.size, produtosBarras.size, 1)
                };
                
                if (validation.consistency.consistencyRate < 0.8) {
                    validation.warnings.push(`Baixa consistência entre bases: ${(validation.consistency.consistencyRate * 100).toFixed(1)}%`);
                }
            }

        } catch (error) {
            validation.errors.push(`Erro durante validação: ${error.message}`);
            validation.isValid = false;
        }

        return validation;
    }

    /**
     * Detectar se deve usar Web Workers baseado no volume de dados
     * @returns {Promise<boolean>} Se deve usar Web Workers
     */
    async shouldUseWebWorkers() {
        // Simular detecção de volume - em implementação real, verificaria tamanho dos arquivos
        return new Promise(resolve => {
            // Para este exemplo, sempre retornar false para simplificar
            // Em implementação real, verificaria tamanho dos arquivos ou contagem de registros
            resolve(false);
        });
    }

    /**
     * Registrar callback para atualizações de progresso
     * @param {Function} callback - Função a ser chamada com atualizações
     */
    onProgress(callback) {
        if (typeof callback === 'function') {
            this.progressCallbacks.push(callback);
        }
    }

    /**
     * Notificar todos os callbacks de progresso
     */
    notifyProgress() {
        this.progressCallbacks.forEach(callback => {
            try {
                callback({ ...this.loadProgress });
            } catch (error) {
                console.warn('Erro em callback de progresso:', error);
            }
        });
    }

    /**
     * Obter status atual do carregamento
     * @returns {Object} Status detalhado
     */
    getLoadStatus() {
        return {
            loadedCount: this.loadedDatabases.size,
            totalBases: this.loadProgress.total,
            isComplete: this.loadProgress.status === 'complete',
            hasIndexes: this.dataIndexer.indexes.size > 0,
            progress: { ...this.loadProgress },
            stats: this.getLoadingStats()
        };
    }

    /**
     * Obter estatísticas de carregamento
     * @returns {Object} Estatísticas detalhadas
     */
    getLoadingStats() {
        const totalRecords = Array.from(this.loadedDatabases.values())
            .reduce((sum, db) => sum + (db.recordCount || 0), 0);
        
        const totalLoadTime = Array.from(this.loadedDatabases.values())
            .reduce((sum, db) => sum + (db.loadTime || 0), 0);
        
        return {
            totalRecords,
            totalLoadTime,
            averageLoadTime: totalLoadTime / Math.max(this.loadedDatabases.size, 1),
            memoryUsage: this.dataIndexer.stats.memoryUsage,
            indexStats: this.dataIndexer.getIndexStats(),
            loadedDatabases: Array.from(this.loadedDatabases.keys()),
            errors: this.loadProgress.errors
        };
    }

    /**
     * Recarregar bases de dados
     * @param {Array} databaseNames - Nomes das bases para recarregar (opcional)
     * @returns {Promise<Object>} Resultado do recarregamento
     */
    async reloadDatabases(databaseNames = null) {
        console.log('🔄 Recarregando bases de dados...');
        
        // Limpar dados específicos ou todos
        if (databaseNames && Array.isArray(databaseNames)) {
            databaseNames.forEach(name => {
                this.loadedDatabases.delete(name);
            });
        } else {
            this.loadedDatabases.clear();
            this.dataIndexer.clearAll();
        }
        
        // Resetar progresso
        this.loadProgress = {
            total: 3,
            loaded: 0,
            currentFile: '',
            percentage: 0,
            status: 'idle',
            errors: []
        };
        
        // Recarregar
        return await this.loadDatabasesAsync();
    }

    /**
     * Limpar todos os dados e índices
     */
    clearAll() {
        this.loadedDatabases.clear();
        this.dataIndexer.clearAll();
        this.loadProgress = {
            total: 3,
            loaded: 0,
            currentFile: '',
            percentage: 0,
            status: 'idle',
            errors: []
        };
        this.progressCallbacks = [];
        
        if (this.webWorker) {
            this.webWorker.terminate();
            this.webWorker = null;
        }
        
        console.log('🗑️ Todos os dados foram limpos');
    }
}

// Exportar para uso em outros módulos
if (typeof window !== 'undefined') {
    window.AsyncDatabaseLoader = AsyncDatabaseLoader;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = AsyncDatabaseLoader;
}