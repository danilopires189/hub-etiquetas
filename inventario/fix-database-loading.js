/**
 * Fix para Carregamento de Base de Dados
 * Solução alternativa para arquivos grandes que podem estar causando timeout
 */

(function() {
    'use strict';
    
    console.log('🔧 APLICANDO FIX PARA CARREGAMENTO DE BASE DE DADOS...');
    
    // Configurações otimizadas para arquivos grandes
    const LARGE_FILE_CONFIG = {
        timeout: 60000, // 60 segundos para arquivos grandes
        retryAttempts: 3,
        retryDelay: 2000,
        chunkSize: 1000000, // 1MB chunks se possível
        useAlternativeMethod: true
    };
    
    // Override da função loadDatabasesAsync se existir
    if (window.AsyncDatabaseLoader) {
        const originalLoadDatabasesAsync = window.AsyncDatabaseLoader.prototype.loadDatabasesAsync;
        
        window.AsyncDatabaseLoader.prototype.loadDatabasesAsync = async function(options = {}) {
            console.log('🔧 Usando versão otimizada do carregamento de bases...');
            
            // Aplicar configurações otimizadas
            const optimizedOptions = {
                ...options,
                timeout: LARGE_FILE_CONFIG.timeout,
                maxMemoryMB: 200, // Aumentar limite de memória
                lazyLoading: false, // Desabilitar lazy loading para garantir carregamento completo
                useWebWorkers: false // Desabilitar web workers que podem causar problemas
            };
            
            try {
                return await originalLoadDatabasesAsync.call(this, optimizedOptions);
            } catch (error) {
                console.error('❌ Erro no carregamento otimizado, tentando método alternativo...', error);
                return await this.loadDatabasesAlternative();
            }
        };
        
        // Método alternativo de carregamento
        window.AsyncDatabaseLoader.prototype.loadDatabasesAlternative = async function() {
            console.log('🔄 Executando método alternativo de carregamento...');
            
            const startTime = Date.now();
            const loadedDatabases = [];
            
            // Tentar carregar cada base individualmente com configurações específicas
            const databases = [
                {
                    name: 'BASE_BARRAS',
                    path: '../data_base/BASE_BARRAS.js',
                    globalVar: 'DB_CADASTRO.BASE_CADASTRO',
                    priority: 1, // Carregar primeiro (menor arquivo)
                    timeout: 15000
                },
                {
                    name: 'BASE_LOG_END',
                    path: '../data_base/BASE_LOG_END.js',
                    globalVar: 'BASE_LOG_END',
                    priority: 2,
                    timeout: 30000
                },
                {
                    name: 'BASE_END',
                    path: '../data_base/BASE_END.js',
                    globalVar: 'DB_END.BASE_END',
                    priority: 3, // Carregar por último (maior arquivo)
                    timeout: 90000 // 90 segundos para o arquivo grande
                }
            ];
            
            // Carregar em ordem de prioridade
            for (const db of databases.sort((a, b) => a.priority - b.priority)) {
                try {
                    console.log(`🔄 Carregando ${db.name} (timeout: ${db.timeout}ms)...`);
                    
                    const data = await this.loadSingleDatabaseWithRetry(db, db.timeout);
                    
                    if (data && Array.isArray(data) && data.length > 0) {
                        loadedDatabases.push({
                            name: db.name,
                            data: data,
                            recordCount: data.length,
                            loaded: true,
                            loadTime: Date.now() - startTime
                        });
                        
                        console.log(`✅ ${db.name} carregada: ${data.length} registros`);
                        
                        // Atualizar progresso
                        if (this.progressCallbacks.length > 0) {
                            this.loadProgress.loaded++;
                            this.loadProgress.percentage = (this.loadProgress.loaded / this.loadProgress.total) * 100;
                            this.loadProgress.currentFile = db.name;
                            this.notifyProgress();
                        }
                        
                    } else {
                        throw new Error(`Dados inválidos ou vazios para ${db.name}`);
                    }
                    
                } catch (error) {
                    console.error(`❌ Falha ao carregar ${db.name}:`, error);
                    
                    loadedDatabases.push({
                        name: db.name,
                        data: [],
                        recordCount: 0,
                        loaded: false,
                        error: error.message
                    });
                    
                    // Para BASE_BARRAS, tentar continuar sem ela é problemático
                    if (db.name === 'BASE_BARRAS') {
                        console.error('❌ BASE_BARRAS é essencial, tentando novamente...');
                        
                        // Tentar uma vez mais com timeout maior
                        try {
                            const retryData = await this.loadSingleDatabaseWithRetry(db, 30000);
                            if (retryData && Array.isArray(retryData) && retryData.length > 0) {
                                loadedDatabases[loadedDatabases.length - 1] = {
                                    name: db.name,
                                    data: retryData,
                                    recordCount: retryData.length,
                                    loaded: true,
                                    loadTime: Date.now() - startTime
                                };
                                console.log(`✅ ${db.name} carregada na segunda tentativa: ${retryData.length} registros`);
                            }
                        } catch (retryError) {
                            console.error(`❌ Falha definitiva ao carregar ${db.name}:`, retryError);
                        }
                    }
                }
                
                // Pequena pausa entre carregamentos para não sobrecarregar
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            
            const totalTime = Date.now() - startTime;
            const successCount = loadedDatabases.filter(db => db.loaded).length;
            
            console.log(`📊 Carregamento alternativo concluído: ${successCount}/${databases.length} bases em ${totalTime}ms`);
            
            return {
                success: successCount > 0,
                loadedDatabases: loadedDatabases,
                totalTime: totalTime,
                stats: {
                    totalRecords: loadedDatabases.reduce((sum, db) => sum + db.recordCount, 0),
                    successCount: successCount,
                    failureCount: databases.length - successCount
                },
                error: successCount === 0 ? 'Nenhuma base de dados foi carregada' : null
            };
        };
        
        // Método de carregamento com retry
        window.AsyncDatabaseLoader.prototype.loadSingleDatabaseWithRetry = async function(db, timeout) {
            let lastError = null;
            
            for (let attempt = 1; attempt <= LARGE_FILE_CONFIG.retryAttempts; attempt++) {
                try {
                    console.log(`🔄 Tentativa ${attempt}/${LARGE_FILE_CONFIG.retryAttempts} para ${db.name}...`);
                    
                    const data = await this.loadSingleDatabaseOptimized(db, timeout);
                    
                    if (data && Array.isArray(data) && data.length > 0) {
                        return data;
                    } else {
                        throw new Error(`Dados inválidos recebidos na tentativa ${attempt}`);
                    }
                    
                } catch (error) {
                    lastError = error;
                    console.warn(`⚠️ Tentativa ${attempt} falhou para ${db.name}: ${error.message}`);
                    
                    if (attempt < LARGE_FILE_CONFIG.retryAttempts) {
                        console.log(`⏳ Aguardando ${LARGE_FILE_CONFIG.retryDelay}ms antes da próxima tentativa...`);
                        await new Promise(resolve => setTimeout(resolve, LARGE_FILE_CONFIG.retryDelay));
                    }
                }
            }
            
            throw lastError || new Error(`Falha após ${LARGE_FILE_CONFIG.retryAttempts} tentativas`);
        };
        
        // Método otimizado para carregamento de arquivo único
        window.AsyncDatabaseLoader.prototype.loadSingleDatabaseOptimized = function(db, timeout) {
            return new Promise((resolve, reject) => {
                // Verificar se os dados já estão disponíveis
                const existingData = this.getGlobalData(db.globalVar);
                if (existingData && Array.isArray(existingData) && existingData.length > 0) {
                    console.log(`✅ ${db.name} já disponível: ${existingData.length} registros`);
                    resolve(existingData);
                    return;
                }
                
                const timeoutId = setTimeout(() => {
                    reject(new Error(`Timeout de ${timeout}ms excedido para ${db.name}`));
                }, timeout);
                
                try {
                    const script = document.createElement('script');
                    script.src = db.path;
                    script.async = true; // Carregamento assíncrono
                    
                    script.onload = () => {
                        clearTimeout(timeoutId);
                        
                        // Aguardar processamento com timeout progressivo
                        let checkAttempts = 0;
                        const maxCheckAttempts = 50; // 5 segundos máximo
                        
                        const checkData = () => {
                            checkAttempts++;
                            const data = this.getGlobalData(db.globalVar);
                            
                            if (data && Array.isArray(data) && data.length > 0) {
                                resolve(data);
                            } else if (checkAttempts < maxCheckAttempts) {
                                setTimeout(checkData, 100);
                            } else {
                                reject(new Error(`Dados não encontrados após ${maxCheckAttempts} verificações para ${db.name}`));
                            }
                        };
                        
                        checkData();
                    };
                    
                    script.onerror = (event) => {
                        clearTimeout(timeoutId);
                        reject(new Error(`Erro de rede ao carregar ${db.path}: ${event.message || 'Erro desconhecido'}`));
                    };
                    
                    // Adicionar script ao head
                    document.head.appendChild(script);
                    
                } catch (error) {
                    clearTimeout(timeoutId);
                    reject(error);
                }
            });
        };
        
        console.log('✅ Fix de carregamento de base de dados aplicado com sucesso');
    } else {
        console.warn('⚠️ AsyncDatabaseLoader não encontrado, fix não aplicado');
    }
    
    // Função de diagnóstico rápido
    window.fixDatabaseLoading = {
        testConnection: async function() {
            console.log('🔍 Testando conexão com bases de dados...');
            
            const tests = [
                { name: 'BASE_BARRAS', path: '../data_base/BASE_BARRAS.js', expected: 'DB_CADASTRO.BASE_CADASTRO' },
                { name: 'BASE_END', path: '../data_base/BASE_END.js', expected: 'DB_END.BASE_END' },
                { name: 'BASE_LOG_END', path: '../data_base/BASE_LOG_END.js', expected: 'BASE_LOG_END' }
            ];
            
            for (const test of tests) {
                try {
                    const response = await fetch(test.path, { method: 'HEAD' });
                    console.log(`${response.ok ? '✅' : '❌'} ${test.name}: ${response.status} ${response.statusText}`);
                } catch (error) {
                    console.log(`❌ ${test.name}: ${error.message}`);
                }
            }
        },
        
        forceReload: function() {
            console.log('🔄 Forçando recarregamento das bases...');
            if (window.loadDatabasesAsync) {
                window.loadDatabasesAsync();
            } else {
                console.error('❌ Função loadDatabasesAsync não encontrada');
            }
        }
    };
    
})();