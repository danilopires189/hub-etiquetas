/**
 * Correção Abrangente para Problemas de Carregamento de Produtos
 * Este script identifica e corrige todos os problemas conhecidos de carregamento
 */

(function() {
    'use strict';
    
    console.log('🔧 INICIANDO CORREÇÃO ABRANGENTE DE CARREGAMENTO...');
    
    // Configuração de correção
    const COMPREHENSIVE_FIX_CONFIG = {
        maxRetries: 3,
        retryDelay: 1000,
        timeoutPerFile: 45000,
        enableDebugMode: true,
        forceReload: true,
        validateData: true
    };
    
    // Status de correção
    let fixStatus = {
        step: 0,
        totalSteps: 10,
        errors: [],
        warnings: [],
        success: false
    };
    
    // Função para log com timestamp
    function logWithTimestamp(message, type = 'info') {
        const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
        const prefix = {
            info: '📋',
            success: '✅',
            warning: '⚠️',
            error: '❌',
            debug: '🔍'
        }[type] || '📋';
        
        console.log(`${prefix} [${timestamp}] ${message}`);
    }
    
    // Função para atualizar progresso
    function updateProgress(step, message) {
        fixStatus.step = step;
        logWithTimestamp(`Etapa ${step}/${fixStatus.totalSteps}: ${message}`, 'info');
        
        // Atualizar status na interface se disponível
        const statusElement = document.getElementById('status');
        if (statusElement) {
            statusElement.textContent = `Correção: ${message}`;
            statusElement.style.background = '#e0f2fe';
            statusElement.style.color = '#0369a1';
        }
    }
    
    // Função para verificar se dados estão disponíveis
    function checkDataAvailable(globalVar, minRecords = 1) {
        try {
            const parts = globalVar.split('.');
            let current = window;
            
            for (const part of parts) {
                if (current && typeof current === 'object' && part in current) {
                    current = current[part];
                } else {
                    return false;
                }
            }
            
            return Array.isArray(current) && current.length >= minRecords;
        } catch (error) {
            logWithTimestamp(`Erro ao verificar ${globalVar}: ${error.message}`, 'error');
            return false;
        }
    }
    
    // Função para aguardar dados ficarem disponíveis
    function waitForData(globalVar, maxWaitTime = 15000, checkInterval = 500) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            
            const checkData = () => {
                if (checkDataAvailable(globalVar)) {
                    const parts = globalVar.split('.');
                    let current = window;
                    for (const part of parts) {
                        current = current[part];
                    }
                    logWithTimestamp(`Dados disponíveis para ${globalVar}: ${current.length} registros`, 'success');
                    resolve(current);
                } else if (Date.now() - startTime > maxWaitTime) {
                    reject(new Error(`Timeout aguardando dados de ${globalVar} após ${maxWaitTime}ms`));
                } else {
                    setTimeout(checkData, checkInterval);
                }
            };
            
            checkData();
        });
    }
    
    // Função para forçar carregamento de script
    function forceLoadScript(src, timeout = 45000) {
        return new Promise((resolve, reject) => {
            logWithTimestamp(`Carregando script: ${src}`, 'debug');
            
            // Remover script existente se houver
            const existingScript = document.querySelector(`script[src="${src}"]`);
            if (existingScript) {
                logWithTimestamp(`Removendo script existente: ${src}`, 'debug');
                existingScript.remove();
            }
            
            const script = document.createElement('script');
            script.src = src;
            script.async = false; // Carregamento síncrono
            
            const timeoutId = setTimeout(() => {
                script.remove();
                reject(new Error(`Timeout ao carregar ${src} após ${timeout}ms`));
            }, timeout);
            
            script.onload = () => {
                clearTimeout(timeoutId);
                logWithTimestamp(`Script carregado: ${src}`, 'success');
                resolve();
            };
            
            script.onerror = (error) => {
                clearTimeout(timeoutId);
                script.remove();
                reject(new Error(`Erro ao carregar ${src}: ${error.message || 'Erro desconhecido'}`));
            };
            
            document.head.appendChild(script);
        });
    }
    
    // Função principal de correção
    async function comprehensiveFix() {
        try {
            logWithTimestamp('Iniciando correção abrangente...', 'info');
            
            // Etapa 1: Verificar estado inicial
            updateProgress(1, 'Verificando estado inicial do sistema');
            const initialState = await checkInitialState();
            
            // Etapa 2: Limpar estado inconsistente
            updateProgress(2, 'Limpando estado inconsistente');
            await cleanInconsistentState();
            
            // Etapa 3: Forçar carregamento da BASE_BARRAS (crítica)
            updateProgress(3, 'Carregando BASE_BARRAS (produtos)');
            await ensureBaseBarrasLoaded();
            
            // Etapa 4: Forçar carregamento da BASE_END
            updateProgress(4, 'Carregando BASE_END (endereços)');
            await ensureBaseEndLoaded();
            
            // Etapa 5: Forçar carregamento da BASE_LOG_END
            updateProgress(5, 'Carregando BASE_LOG_END (exclusões)');
            await ensureBaseLogEndLoaded();
            
            // Etapa 6: Sincronizar variáveis globais
            updateProgress(6, 'Sincronizando variáveis globais');
            await synchronizeGlobalVariables();
            
            // Etapa 7: Inicializar sistemas de indexação
            updateProgress(7, 'Inicializando sistemas de indexação');
            await initializeIndexingSystems();
            
            // Etapa 8: Atualizar estado da aplicação
            updateProgress(8, 'Atualizando estado da aplicação');
            await updateApplicationState();
            
            // Etapa 9: Validar funcionamento
            updateProgress(9, 'Validando funcionamento do sistema');
            const validationResult = await validateSystemFunctionality();
            
            // Etapa 10: Finalizar correção
            updateProgress(10, 'Finalizando correção');
            await finalizeFix(validationResult);
            
            fixStatus.success = true;
            logWithTimestamp('Correção abrangente concluída com sucesso!', 'success');
            
            return {
                success: true,
                message: 'Correção aplicada com sucesso',
                details: fixStatus,
                validation: validationResult
            };
            
        } catch (error) {
            fixStatus.errors.push(error.message);
            logWithTimestamp(`Erro durante correção: ${error.message}`, 'error');
            
            return {
                success: false,
                error: error.message,
                details: fixStatus
            };
        }
    }
    
    // Verificar estado inicial
    async function checkInitialState() {
        logWithTimestamp('Verificando estado inicial...', 'debug');
        
        const state = {
            databases: {
                BASE_BARRAS: checkDataAvailable('DB_CADASTRO.BASE_CADASTRO'),
                BASE_END: checkDataAvailable('DB_END.BASE_END'),
                BASE_LOG_END: checkDataAvailable('BASE_LOG_END')
            },
            globalVariables: {
                DATA_CADASTRO: !!window.DATA_CADASTRO && Array.isArray(window.DATA_CADASTRO),
                DATA_ENDERECOS: !!window.DATA_ENDERECOS && Array.isArray(window.DATA_ENDERECOS),
                DATA_LOG_ENDERECOS: !!window.DATA_LOG_ENDERECOS && Array.isArray(window.DATA_LOG_ENDERECOS)
            },
            appState: {
                exists: !!window.APP_STATE,
                databaseReady: window.APP_STATE?.databaseReady || false
            },
            systems: {
                asyncLoader: !!window.asyncLoader,
                dataIndexer: !!window.dataIndexer,
                loadingManager: !!window.loadingManager
            }
        };
        
        logWithTimestamp('Estado inicial verificado:', 'debug');
        console.log(state);
        
        return state;
    }
    
    // Limpar estado inconsistente
    async function cleanInconsistentState() {
        logWithTimestamp('Limpando estado inconsistente...', 'debug');
        
        // Resetar DATABASE_STATUS se existir
        if (window.DATABASE_STATUS) {
            window.DATABASE_STATUS = {
                BASE_END: false,
                BASE_BARRAS: false,
                BASE_LOG_END: false,
                isLoading: false,
                hasIndexes: false
            };
            logWithTimestamp('DATABASE_STATUS resetado', 'debug');
        }
        
        // Resetar APP_STATE.databaseReady
        if (window.APP_STATE) {
            window.APP_STATE.databaseReady = false;
            window.APP_STATE.isLoading = false;
            logWithTimestamp('APP_STATE resetado', 'debug');
        }
        
        // Limpar índices se dataIndexer existir
        if (window.dataIndexer && typeof window.dataIndexer.clearAll === 'function') {
            window.dataIndexer.clearAll();
            logWithTimestamp('Índices limpos', 'debug');
        }
    }
    
    // Garantir carregamento da BASE_BARRAS
    async function ensureBaseBarrasLoaded() {
        logWithTimestamp('Verificando BASE_BARRAS...', 'debug');
        
        if (!checkDataAvailable('DB_CADASTRO.BASE_CADASTRO', 100)) {
            logWithTimestamp('BASE_BARRAS não carregada, forçando carregamento...', 'warning');
            
            try {
                await forceLoadScript('../data_base/BASE_BARRAS.js', COMPREHENSIVE_FIX_CONFIG.timeoutPerFile);
                await waitForData('DB_CADASTRO.BASE_CADASTRO', 20000);
                logWithTimestamp('BASE_BARRAS carregada com sucesso', 'success');
            } catch (error) {
                throw new Error(`Falha crítica ao carregar BASE_BARRAS: ${error.message}`);
            }
        } else {
            logWithTimestamp('BASE_BARRAS já estava carregada', 'success');
        }
    }
    
    // Garantir carregamento da BASE_END
    async function ensureBaseEndLoaded() {
        logWithTimestamp('Verificando BASE_END...', 'debug');
        
        if (!checkDataAvailable('DB_END.BASE_END', 100)) {
            logWithTimestamp('BASE_END não carregada, forçando carregamento...', 'warning');
            
            try {
                await forceLoadScript('../data_base/BASE_END.js', COMPREHENSIVE_FIX_CONFIG.timeoutPerFile);
                await waitForData('DB_END.BASE_END', 30000);
                logWithTimestamp('BASE_END carregada com sucesso', 'success');
            } catch (error) {
                fixStatus.warnings.push(`BASE_END não pôde ser carregada: ${error.message}`);
                logWithTimestamp(`Aviso: BASE_END não carregada - ${error.message}`, 'warning');
            }
        } else {
            logWithTimestamp('BASE_END já estava carregada', 'success');
        }
    }
    
    // Garantir carregamento da BASE_LOG_END
    async function ensureBaseLogEndLoaded() {
        logWithTimestamp('Verificando BASE_LOG_END...', 'debug');
        
        if (!checkDataAvailable('BASE_LOG_END', 1)) {
            logWithTimestamp('BASE_LOG_END não carregada, forçando carregamento...', 'warning');
            
            try {
                await forceLoadScript('../data_base/BASE_LOG_END.js', COMPREHENSIVE_FIX_CONFIG.timeoutPerFile);
                await waitForData('BASE_LOG_END', 15000);
                logWithTimestamp('BASE_LOG_END carregada com sucesso', 'success');
            } catch (error) {
                fixStatus.warnings.push(`BASE_LOG_END não pôde ser carregada: ${error.message}`);
                logWithTimestamp(`Aviso: BASE_LOG_END não carregada - ${error.message}`, 'warning');
            }
        } else {
            logWithTimestamp('BASE_LOG_END já estava carregada', 'success');
        }
    }
    
    // Sincronizar variáveis globais
    async function synchronizeGlobalVariables() {
        logWithTimestamp('Sincronizando variáveis globais...', 'debug');
        
        // Sincronizar DATA_CADASTRO
        if (window.DB_CADASTRO && window.DB_CADASTRO.BASE_CADASTRO) {
            window.DATA_CADASTRO = window.DB_CADASTRO.BASE_CADASTRO;
            logWithTimestamp(`DATA_CADASTRO sincronizada: ${window.DATA_CADASTRO.length} registros`, 'success');
        } else {
            throw new Error('DB_CADASTRO.BASE_CADASTRO não disponível para sincronização');
        }
        
        // Sincronizar DATA_ENDERECOS
        if (window.DB_END && window.DB_END.BASE_END) {
            window.DATA_ENDERECOS = window.DB_END.BASE_END;
            logWithTimestamp(`DATA_ENDERECOS sincronizada: ${window.DATA_ENDERECOS.length} registros`, 'success');
        } else {
            fixStatus.warnings.push('DB_END.BASE_END não disponível');
            window.DATA_ENDERECOS = [];
            logWithTimestamp('DATA_ENDERECOS definida como array vazio', 'warning');
        }
        
        // Sincronizar DATA_LOG_ENDERECOS
        if (window.BASE_LOG_END) {
            window.DATA_LOG_ENDERECOS = window.BASE_LOG_END;
            logWithTimestamp(`DATA_LOG_ENDERECOS sincronizada: ${window.DATA_LOG_ENDERECOS.length} registros`, 'success');
        } else {
            fixStatus.warnings.push('BASE_LOG_END não disponível');
            window.DATA_LOG_ENDERECOS = [];
            logWithTimestamp('DATA_LOG_ENDERECOS definida como array vazio', 'warning');
        }
    }
    
    // Inicializar sistemas de indexação
    async function initializeIndexingSystems() {
        logWithTimestamp('Inicializando sistemas de indexação...', 'debug');
        
        // Inicializar AsyncDatabaseLoader se não existir
        if (!window.asyncLoader && typeof AsyncDatabaseLoader !== 'undefined') {
            try {
                window.asyncLoader = new AsyncDatabaseLoader();
                logWithTimestamp('AsyncDatabaseLoader inicializado', 'success');
            } catch (error) {
                fixStatus.warnings.push(`Erro ao inicializar AsyncDatabaseLoader: ${error.message}`);
                logWithTimestamp(`Aviso: AsyncDatabaseLoader não inicializado - ${error.message}`, 'warning');
            }
        }
        
        // Inicializar DataIndexer se não existir
        if (!window.dataIndexer && typeof DataIndexer !== 'undefined') {
            try {
                window.dataIndexer = new DataIndexer();
                logWithTimestamp('DataIndexer inicializado', 'success');
            } catch (error) {
                fixStatus.warnings.push(`Erro ao inicializar DataIndexer: ${error.message}`);
                logWithTimestamp(`Aviso: DataIndexer não inicializado - ${error.message}`, 'warning');
            }
        }
        
        // Criar índices se dataIndexer disponível
        if (window.dataIndexer) {
            try {
                if (window.DATA_CADASTRO && window.DATA_CADASTRO.length > 0) {
                    window.dataIndexer.createProductIndex(window.DATA_CADASTRO);
                    logWithTimestamp('Índice de produtos criado', 'success');
                }
                
                if (window.DATA_ENDERECOS && window.DATA_ENDERECOS.length > 0) {
                    window.dataIndexer.createCDIndex(window.DATA_ENDERECOS);
                    window.dataIndexer.createAddressIndex(window.DATA_ENDERECOS);
                    logWithTimestamp('Índices de endereços criados', 'success');
                }
                
                if (window.DATA_LOG_ENDERECOS && window.DATA_LOG_ENDERECOS.length > 0) {
                    window.dataIndexer.createExcludedAddressIndex(window.DATA_LOG_ENDERECOS);
                    logWithTimestamp('Índice de exclusões criado', 'success');
                }
            } catch (error) {
                fixStatus.warnings.push(`Erro ao criar índices: ${error.message}`);
                logWithTimestamp(`Aviso: Erro ao criar índices - ${error.message}`, 'warning');
            }
        }
    }
    
    // Atualizar estado da aplicação
    async function updateApplicationState() {
        logWithTimestamp('Atualizando estado da aplicação...', 'debug');
        
        // Atualizar DATABASE_STATUS
        if (window.DATABASE_STATUS) {
            window.DATABASE_STATUS.BASE_BARRAS = checkDataAvailable('DB_CADASTRO.BASE_CADASTRO');
            window.DATABASE_STATUS.BASE_END = checkDataAvailable('DB_END.BASE_END');
            window.DATABASE_STATUS.BASE_LOG_END = checkDataAvailable('BASE_LOG_END');
            window.DATABASE_STATUS.isLoading = false;
            window.DATABASE_STATUS.hasIndexes = !!(window.dataIndexer && window.dataIndexer.indexes && window.dataIndexer.indexes.size > 0);
            
            logWithTimestamp('DATABASE_STATUS atualizado', 'success');
            console.log('DATABASE_STATUS:', window.DATABASE_STATUS);
        }
        
        // Atualizar APP_STATE
        if (window.APP_STATE) {
            window.APP_STATE.databaseReady = checkDataAvailable('DB_CADASTRO.BASE_CADASTRO');
            window.APP_STATE.isLoading = false;
            
            logWithTimestamp(`APP_STATE.databaseReady: ${window.APP_STATE.databaseReady}`, 'success');
        }
        
        // Habilitar interface
        const cdSelect = document.getElementById('cdSelect');
        if (cdSelect && cdSelect.disabled && window.APP_STATE?.databaseReady) {
            cdSelect.disabled = false;
            logWithTimestamp('Seletor de CD habilitado', 'success');
        }
        
        // Atualizar status na interface
        if (window.updateSearchInfo && typeof window.updateSearchInfo === 'function') {
            window.updateSearchInfo();
            logWithTimestamp('Interface de busca atualizada', 'success');
        }
    }
    
    // Validar funcionamento do sistema
    async function validateSystemFunctionality() {
        logWithTimestamp('Validando funcionamento do sistema...', 'debug');
        
        const validation = {
            databases: {
                BASE_BARRAS: false,
                BASE_END: false,
                BASE_LOG_END: false
            },
            functions: {
                getProductDetails: false,
                handleProductSearch: false
            },
            interface: {
                cdSelectEnabled: false,
                searchEnabled: false
            },
            testResults: {
                productSearch: false,
                productDetails: null
            }
        };
        
        // Validar bases de dados
        validation.databases.BASE_BARRAS = checkDataAvailable('DB_CADASTRO.BASE_CADASTRO', 100);
        validation.databases.BASE_END = checkDataAvailable('DB_END.BASE_END', 1);
        validation.databases.BASE_LOG_END = checkDataAvailable('BASE_LOG_END', 1);
        
        // Validar funções
        validation.functions.getProductDetails = typeof window.getProductDetails === 'function';
        validation.functions.handleProductSearch = typeof window.handleProductSearch === 'function';
        
        // Validar interface
        const cdSelect = document.getElementById('cdSelect');
        validation.interface.cdSelectEnabled = cdSelect && !cdSelect.disabled;
        
        const coddvInput = document.getElementById('coddvInput');
        validation.interface.searchEnabled = coddvInput && !coddvInput.disabled;
        
        // Teste de busca de produto
        if (validation.functions.getProductDetails && window.DATA_CADASTRO && window.DATA_CADASTRO.length > 0) {
            try {
                const testProduct = window.DATA_CADASTRO[0];
                const result = window.getProductDetails(testProduct.CODDV);
                validation.testResults.productSearch = !!result;
                validation.testResults.productDetails = result;
                
                logWithTimestamp(`Teste de busca: ${result ? 'SUCESSO' : 'FALHA'}`, result ? 'success' : 'warning');
                if (result) {
                    logWithTimestamp(`Produto teste: ${result.CODDV} - ${result.DESC}`, 'debug');
                }
            } catch (error) {
                logWithTimestamp(`Erro no teste de busca: ${error.message}`, 'warning');
                validation.testResults.productSearch = false;
            }
        }
        
        logWithTimestamp('Validação concluída', 'debug');
        console.log('Resultado da validação:', validation);
        
        return validation;
    }
    
    // Finalizar correção
    async function finalizeFix(validationResult) {
        logWithTimestamp('Finalizando correção...', 'debug');
        
        // Atualizar status final na interface
        const statusElement = document.getElementById('status');
        if (statusElement) {
            if (validationResult.databases.BASE_BARRAS && validationResult.testResults.productSearch) {
                statusElement.textContent = 'Sistema funcionando corretamente';
                statusElement.style.background = '#dcfce7';
                statusElement.style.color = '#166534';
                
                // Ocultar após alguns segundos
                setTimeout(() => {
                    statusElement.style.display = 'none';
                }, 4000);
            } else {
                statusElement.textContent = 'Sistema parcialmente funcional';
                statusElement.style.background = '#fef3c7';
                statusElement.style.color = '#92400e';
            }
        }
        
        // Mostrar toast de sucesso se disponível
        if (typeof window.toast === 'function') {
            if (validationResult.databases.BASE_BARRAS && validationResult.testResults.productSearch) {
                window.toast('Sistema corrigido e funcionando!', 'success', 5000);
            } else {
                window.toast('Correção aplicada com avisos', 'warning', 5000);
            }
        }
        
        // Log final
        const totalErrors = fixStatus.errors.length;
        const totalWarnings = fixStatus.warnings.length;
        
        logWithTimestamp(`Correção finalizada: ${totalErrors} erros, ${totalWarnings} avisos`, 
                        totalErrors > 0 ? 'warning' : 'success');
        
        if (totalErrors > 0) {
            logWithTimestamp('Erros encontrados:', 'error');
            fixStatus.errors.forEach(error => logWithTimestamp(`  • ${error}`, 'error'));
        }
        
        if (totalWarnings > 0) {
            logWithTimestamp('Avisos:', 'warning');
            fixStatus.warnings.forEach(warning => logWithTimestamp(`  • ${warning}`, 'warning'));
        }
    }
    
    // Executar correção automaticamente se necessário
    setTimeout(async () => {
        // Verificar se correção é necessária
        const needsFix = !checkDataAvailable('DB_CADASTRO.BASE_CADASTRO', 100) || 
                         !window.APP_STATE?.databaseReady ||
                         (typeof window.getProductDetails === 'function' && 
                          window.DATA_CADASTRO && window.DATA_CADASTRO.length > 0 &&
                          !window.getProductDetails(window.DATA_CADASTRO[0].CODDV));
        
        if (needsFix) {
            logWithTimestamp('Correção necessária detectada, executando...', 'info');
            const result = await comprehensiveFix();
            
            if (result.success) {
                logWithTimestamp('Correção automática concluída com sucesso!', 'success');
            } else {
                logWithTimestamp(`Correção automática falhou: ${result.error}`, 'error');
            }
        } else {
            logWithTimestamp('Sistema funcionando corretamente, correção não necessária', 'success');
        }
    }, 3000);
    
    // Exportar funções para uso manual
    window.comprehensiveFix = comprehensiveFix;
    window.checkDataAvailable = checkDataAvailable;
    window.forceLoadScript = forceLoadScript;
    
    logWithTimestamp('Sistema de correção abrangente configurado', 'success');
    logWithTimestamp('Use window.comprehensiveFix() para executar correção manual', 'info');
    
})();