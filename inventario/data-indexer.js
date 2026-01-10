/**
 * Data Indexer Component
 * Sistema de indexação otimizada para grandes volumes de dados
 * Feature: inventario-database-integration
 */

class DataIndexer {
    constructor() {
        this.indexes = new Map();
        this.stats = {
            totalRecords: 0,
            indexedRecords: 0,
            memoryUsage: 0,
            lastUpdated: null,
            indexCreationTime: 0
        };
    }

    /**
     * Criar índice por Centro de Distribuição
     * @param {Array} data - Dados da BASE_END
     * @returns {Map} Índice CD -> Set<CODDV>
     */
    createCDIndex(data) {
        const startTime = Date.now();
        const cdIndex = new Map();
        
        if (!Array.isArray(data)) {
            console.warn('DataIndexer: Dados inválidos para criação de índice por CD');
            return cdIndex;
        }

        data.forEach(item => {
            if (item && item.CD && item.CODDV) {
                if (!cdIndex.has(item.CD)) {
                    cdIndex.set(item.CD, new Set());
                }
                cdIndex.get(item.CD).add(item.CODDV);
            }
        });

        this.indexes.set('byCD', cdIndex);
        this.stats.indexCreationTime += Date.now() - startTime;
        
        console.log(`📊 Índice por CD criado: ${cdIndex.size} CDs indexados em ${Date.now() - startTime}ms`);
        return cdIndex;
    }

    /**
     * Criar índice por código de produto
     * @param {Array} data - Dados da BASE_BARRAS
     * @returns {Map} Índice CODDV -> ProductDetails
     */
    createProductIndex(data) {
        const startTime = Date.now();
        const productIndex = new Map();
        
        if (!Array.isArray(data)) {
            console.warn('DataIndexer: Dados inválidos para criação de índice por produto');
            return productIndex;
        }

        // IMPORTANTE: Armazenar os dados originais para busca de múltiplos códigos de barras
        this.productData = data;
        console.log(`📊 [DataIndexer] Dados da base BARRAS armazenados: ${data.length} registros`);

        data.forEach(item => {
            if (item && item.CODDV) {
                // Manter apenas o primeiro registro encontrado no índice (para compatibilidade)
                // mas os dados completos ficam em this.productData
                if (!productIndex.has(item.CODDV)) {
                    productIndex.set(item.CODDV, {
                        coddv: item.CODDV,
                        barras: item.BARRAS || null,
                        desc: item.DESC || 'Descrição não disponível',
                        indexed: true,
                        lastAccessed: Date.now()
                    });
                }
            }
        });

        this.indexes.set('byProduct', productIndex);
        this.stats.indexCreationTime += Date.now() - startTime;
        
        console.log(`📊 Índice por produto criado: ${productIndex.size} produtos únicos indexados em ${Date.now() - startTime}ms`);
        console.log(`📊 Total de registros na base BARRAS: ${data.length} (incluindo múltiplos códigos por CODDV)`);
        return productIndex;
    }

    /**
     * Criar índice de endereços por produto e CD
     * @param {Array} data - Dados da BASE_END
     * @returns {Map} Índice CODDV -> Map<CD, Address[]>
     */
    createAddressIndex(data) {
        const startTime = Date.now();
        const addressIndex = new Map();
        
        if (!Array.isArray(data)) {
            console.warn('DataIndexer: Dados inválidos para criação de índice de endereços');
            return addressIndex;
        }

        data.forEach(item => {
            if (item && item.CODDV && item.CD && item.ENDERECO) {
                if (!addressIndex.has(item.CODDV)) {
                    addressIndex.set(item.CODDV, new Map());
                }
                
                const productAddresses = addressIndex.get(item.CODDV);
                if (!productAddresses.has(item.CD)) {
                    productAddresses.set(item.CD, []);
                }
                
                productAddresses.get(item.CD).push({
                    endereco: item.ENDERECO,
                    tipo: item.TIPO || 'INDEFINIDO',
                    cd: item.CD,
                    coddv: item.CODDV,
                    desc: item.DESC || null
                });
            }
        });

        this.indexes.set('byAddress', addressIndex);
        this.stats.indexCreationTime += Date.now() - startTime;
        
        console.log(`📊 Índice de endereços criado: ${addressIndex.size} produtos com endereços em ${Date.now() - startTime}ms`);
        return addressIndex;
    }

    /**
     * Criar índice de endereços excluídos por produto e CD
     * @param {Array} data - Dados da BASE_LOG_END
     * @returns {Map} Índice CODDV+CD -> ExcludedAddress[]
     */
    createExcludedAddressIndex(data) {
        const startTime = Date.now();
        const excludedIndex = new Map();
        
        if (!Array.isArray(data)) {
            console.warn('DataIndexer: Dados inválidos para criação de índice de endereços excluídos');
            return excludedIndex;
        }

        data.forEach(item => {
            if (item && item.CODDV && item.CD && item.ENDERECO && item.EXCLUSAO) {
                // Normalizar CD para string para consistência
                const cd = String(item.CD);
                const key = `${item.CODDV}_${cd}`;
                
                if (!excludedIndex.has(key)) {
                    excludedIndex.set(key, []);
                }
                
                excludedIndex.get(key).push({
                    endereco: item.ENDERECO,
                    exclusao: item.EXCLUSAO,
                    desc: item.DESC || null,
                    cd: cd,
                    coddv: item.CODDV
                });
            }
        });

        this.indexes.set('byExcludedAddress', excludedIndex);
        this.stats.indexCreationTime += Date.now() - startTime;
        
        console.log(`📊 Índice de endereços excluídos criado: ${excludedIndex.size} produtos com exclusões em ${Date.now() - startTime}ms`);
        return excludedIndex;
    }

    /**
     * Atualizar índices incrementalmente
     * @param {Array} newData - Novos dados para indexar
     * @param {string} indexType - Tipo de índice ('cd', 'product', 'address', 'excluded')
     */
    updateIndex(newData, indexType) {
        const startTime = Date.now();
        
        switch (indexType) {
            case 'cd':
                this.createCDIndex(newData);
                break;
            case 'product':
                this.createProductIndex(newData);
                break;
            case 'address':
                this.createAddressIndex(newData);
                break;
            case 'excluded':
                this.createExcludedAddressIndex(newData);
                break;
            default:
                console.warn(`DataIndexer: Tipo de índice desconhecido: ${indexType}`);
        }
        
        this.stats.lastUpdated = new Date();
        console.log(`🔄 Índice ${indexType} atualizado em ${Date.now() - startTime}ms`);
    }

    /**
     * Obter estatísticas dos índices criados
     * @returns {Object} Estatísticas detalhadas
     */
    getIndexStats() {
        const cdIndex = this.indexes.get('byCD');
        const productIndex = this.indexes.get('byProduct');
        const addressIndex = this.indexes.get('byAddress');
        const excludedIndex = this.indexes.get('byExcludedAddress');
        
        return {
            ...this.stats,
            indexes: {
                byCD: cdIndex ? cdIndex.size : 0,
                byProduct: productIndex ? productIndex.size : 0,
                byAddress: addressIndex ? addressIndex.size : 0,
                byExcludedAddress: excludedIndex ? excludedIndex.size : 0
            },
            memoryUsage: this.calculateMemoryUsage(),
            efficiency: this.calculateEfficiency()
        };
    }

    /**
     * Calcular uso aproximado de memória
     * @returns {number} Uso de memória em bytes (aproximado)
     */
    calculateMemoryUsage() {
        let totalSize = 0;
        
        this.indexes.forEach((index, key) => {
            if (index instanceof Map) {
                // Estimativa aproximada: cada entrada do Map = ~100 bytes
                totalSize += index.size * 100;
                
                // Para índices aninhados, calcular recursivamente
                index.forEach(value => {
                    if (value instanceof Set) {
                        totalSize += value.size * 50; // Set entries ~50 bytes
                    } else if (value instanceof Map) {
                        totalSize += value.size * 100;
                    } else if (Array.isArray(value)) {
                        totalSize += value.length * 200; // Array objects ~200 bytes
                    }
                });
            }
        });
        
        this.stats.memoryUsage = totalSize;
        return totalSize;
    }

    /**
     * Calcular eficiência dos índices
     * @returns {Object} Métricas de eficiência
     */
    calculateEfficiency() {
        const memoryMB = this.stats.memoryUsage / (1024 * 1024);
        const recordsPerMB = this.stats.indexedRecords / Math.max(memoryMB, 0.1);
        
        return {
            memoryMB: Math.round(memoryMB * 100) / 100,
            recordsPerMB: Math.round(recordsPerMB),
            indexesCreated: this.indexes.size,
            avgCreationTime: this.stats.indexCreationTime / Math.max(this.indexes.size, 1)
        };
    }

    /**
     * Otimizar memória liberando dados não utilizados
     * @param {number} maxMemoryMB - Limite máximo de memória em MB
     */
    optimizeMemory(maxMemoryMB = 100) {
        const currentMemoryMB = this.stats.memoryUsage / (1024 * 1024);
        
        if (currentMemoryMB > maxMemoryMB) {
            console.warn(`🧹 Otimizando memória: ${currentMemoryMB.toFixed(2)}MB > ${maxMemoryMB}MB`);
            
            // Estratégias de otimização
            this.cleanupExpiredEntries();
            this.compactIndexes();
            
            const newMemoryMB = this.calculateMemoryUsage() / (1024 * 1024);
            console.log(`✅ Memória otimizada: ${currentMemoryMB.toFixed(2)}MB → ${newMemoryMB.toFixed(2)}MB`);
        }
    }

    /**
     * Limpar entradas expiradas dos índices
     */
    cleanupExpiredEntries() {
        const productIndex = this.indexes.get('byProduct');
        if (productIndex) {
            const now = Date.now();
            const expiredThreshold = 5 * 60 * 1000; // 5 minutos
            
            let removedCount = 0;
            productIndex.forEach((value, key) => {
                if (value.lastAccessed && (now - value.lastAccessed) > expiredThreshold) {
                    productIndex.delete(key);
                    removedCount++;
                }
            });
            
            if (removedCount > 0) {
                console.log(`🗑️ Removidas ${removedCount} entradas expiradas do índice de produtos`);
            }
        }
    }

    /**
     * Compactar índices removendo referências vazias
     */
    compactIndexes() {
        this.indexes.forEach((index, indexName) => {
            if (index instanceof Map) {
                let removedCount = 0;
                
                index.forEach((value, key) => {
                    if (!value || (Array.isArray(value) && value.length === 0) || 
                        (value instanceof Set && value.size === 0) ||
                        (value instanceof Map && value.size === 0)) {
                        index.delete(key);
                        removedCount++;
                    }
                });
                
                if (removedCount > 0) {
                    console.log(`🗜️ Compactado índice ${indexName}: removidas ${removedCount} entradas vazias`);
                }
            }
        });
    }

    /**
     * Buscar produtos por CD usando índice
     * @param {string} cd - Centro de Distribuição
     * @returns {Set} Set de CODDVs do CD
     */
    getProductsByCD(cd) {
        const cdIndex = this.indexes.get('byCD');
        return cdIndex ? cdIndex.get(cd) || new Set() : new Set();
    }

    /**
     * Buscar detalhes de produto usando índice
     * @param {string} coddv - Código do produto
     * @returns {Object|null} Detalhes do produto
     */
    getProductDetails(coddv) {
        const productIndex = this.indexes.get('byProduct');
        const product = productIndex ? productIndex.get(coddv) : null;
        
        if (product) {
            product.lastAccessed = Date.now();
        }
        
        return product;
    }

    /**
     * Buscar endereços de produto por CD usando índice
     * @param {string} coddv - Código do produto
     * @param {string} cd - Centro de Distribuição
     * @returns {Array} Array de endereços
     */
    getProductAddresses(coddv, cd) {
        const addressIndex = this.indexes.get('byAddress');
        if (!addressIndex || !addressIndex.has(coddv)) {
            return [];
        }
        
        const productAddresses = addressIndex.get(coddv);
        return productAddresses.has(cd) ? productAddresses.get(cd) : [];
    }

    /**
     * Buscar endereços excluídos de produto por CD usando índice
     * @param {string} coddv - Código do produto
     * @param {string} cd - Centro de Distribuição
     * @returns {Array} Array de endereços excluídos
     */
    getExcludedAddresses(coddv, cd) {
        const excludedIndex = this.indexes.get('byExcludedAddress');
        if (!excludedIndex) {
            return [];
        }
        
        // Normalizar CD para string para consistência
        const normalizedCD = String(cd);
        const key = `${coddv}_${normalizedCD}`;
        return excludedIndex.get(key) || [];
    }

    /**
     * Obter TODOS os códigos de barras de um produto
     * Na base BARRAS, cada código está em um registro separado com o mesmo CODDV
     * @param {string} coddv - Código do produto
     * @returns {Array} Array com todos os códigos de barras do produto
     */
    getAllProductBarcodes(coddv) {
        console.log(`🔍 [DataIndexer] Buscando TODOS os códigos de barras para CODDV: ${coddv}`);
        
        if (!coddv) {
            console.warn('⚠️ [DataIndexer] CODDV não fornecido');
            return [];
        }
        
        const barcodes = [];
        
        // Buscar na base de produtos (DATA_CADASTRO)
        if (this.productData && Array.isArray(this.productData)) {
            console.log(`🔍 [DataIndexer] Buscando em ${this.productData.length} registros da base de produtos...`);
            
            // Filtrar TODOS os registros com o mesmo CODDV
            const allProductRecords = this.productData.filter(record => 
                record && record.CODDV === coddv
            );
            
            console.log(`📋 [DataIndexer] Encontrados ${allProductRecords.length} registros para CODDV ${coddv}`);
            
            // Extrair códigos de barras de TODOS os registros
            allProductRecords.forEach((record, index) => {
                console.log(`🔍 [DataIndexer] Analisando registro ${index + 1}:`, record);
                
                if (record.BARRAS && typeof record.BARRAS === 'string' && record.BARRAS.trim() !== '') {
                    barcodes.push(record.BARRAS.trim());
                    console.log(`➕ [DataIndexer] Código adicionado do registro ${index + 1}: ${record.BARRAS.trim()}`);
                }
            });
        } else {
            console.warn('⚠️ [DataIndexer] Base de produtos não disponível ou não é um array');
        }
        
        // Remover duplicatas e valores vazios
        const uniqueBarcodes = [...new Set(barcodes.filter(barcode => {
            if (!barcode) return false;
            if (typeof barcode !== 'string') return false;
            if (barcode.trim() === '') return false;
            if (barcode.length < 3) return false; // Códigos muito curtos provavelmente são inválidos
            return true;
        }))];
        
        console.log(`📊 [DataIndexer] RESULTADO FINAL - CODDV ${coddv}:`);
        console.log(`   • Registros encontrados: ${this.productData ? this.productData.filter(r => r && r.CODDV === coddv).length : 0}`);
        console.log(`   • Códigos brutos coletados: ${barcodes.length}`);
        console.log(`   • Códigos únicos válidos: ${uniqueBarcodes.length}`);
        console.log(`   • Códigos finais:`, uniqueBarcodes);
        
        if (uniqueBarcodes.length === 0) {
            console.warn(`⚠️ [DataIndexer] ATENÇÃO: Nenhum código de barras válido encontrado para CODDV ${coddv}`);
        } else if (uniqueBarcodes.length > 1) {
            console.log(`✅ [DataIndexer] SUCESSO: ${uniqueBarcodes.length} códigos de barras encontrados para CODDV ${coddv}`);
        }
        
        return uniqueBarcodes;
    }

    /**
     * Limpar todos os índices
     */
    clearAll() {
        this.indexes.clear();
        this.stats = {
            totalRecords: 0,
            indexedRecords: 0,
            memoryUsage: 0,
            lastUpdated: null,
            indexCreationTime: 0
        };
        console.log('🗑️ Todos os índices foram limpos');
    }
}

// Exportar para uso em outros módulos
if (typeof window !== 'undefined') {
    window.DataIndexer = DataIndexer;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = DataIndexer;
}