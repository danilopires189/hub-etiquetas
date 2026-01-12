/**
 * Correção Específica para Problema de Carregamento de Produtos
 * Este script força o carregamento correto das bases de dados e corrige problemas comuns
 */

(function() {
    'use strict';
    
    console.log('🔧 APLICANDO CORREÇÃO PARA CARREGAMENTO DE PRODUTOS...');
    
    // Configuração de correção
    const FIX_CONFIG = {
        forceReload: true,
        maxRetries: 5,
        retryDelay: 2000,
        timeoutPerFile: 30000,
        enableDebugMode: true
    };
    
    // Função para forçar carregamento de um arquivo específico
    function forceLoadScript(src, timeout = 30000) {
        return new Promise((resolve, reject) => {
            console.log(`🔄 Forçando carregamento de: ${src}`);
            
            // Remover script existente se houver
            const existingScript = document.querySelector(`script[src="${src}"]`);
            if (existingScript) {
                console.log(`🗑️ Removendo script existente: ${src}`);
                existingScript.remove();
            }
            
            const script = document.createElement('script');
            script.src = src;
            script.async = false; // Carregamento síncrono para garantir ordem
            
            const timeoutId = setTimeout(() => {
                script.remove();
                reject(new Error(`Timeout ao carregar ${src}`));
            }, timeout);
            
            script.onload = () => {
                clearTimeout(timeoutId);
                console.log(`✅ Script carregado com sucesso: ${src}`);
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
            return false;
        }
    }
    
    // Função para aguardar dados ficarem disponíveis
    function waitForData(globalVar, maxWaitTime = 10000, checkInterval = 500) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            
            const checkData = () => {
                if (checkDataAvailable(globalVar)) {
                    const parts = globalVar.split('.');
                    let current = window;
                    for (const part of parts) {
                        current = current[part];
                    }
                    console.log(`✅ Dados disponíveis para ${globalVar}: ${current.length} registros`);
                    resolve(current);
                } else if (Date.now() - startTime > maxWaitTime) {
                    reject(new Error(`Timeout aguardando dados de ${globalVar}`));
                } else {
                    setTimeout(checkData, checkInterval);
                }
            };
            
            checkData();
        });
    }
    
    // Função principal de correção
    async function fixProductLoading() {
        console.log('🚀 Iniciando correção de carregamento de produtos...');
        
        try {
            // 1. Forçar carregamento da BASE_BARRAS (mais importante)
            console.log('📦 Etapa 1: Carregando BASE_BARRAS...');
            
            if (!checkDataAvailable('DB_CADASTRO.BASE_CADASTRO', 100)) {
                await forceLoadScript('../data_base/BASE_BARRAS.js', FIX_CONFIG.timeoutPerFile);
                await waitForData('DB_CADASTRO.BASE_CADASTRO', 15000);
            } else {
                console.log('✅ BASE_BARRAS já carregada');
            }
            
            // 2. Atualizar DATA_CADASTRO global
            if (window.DB_CADASTRO && window.DB_CADASTRO.BASE_CADASTRO) {
                window.DATA_CADASTRO = window.DB_CADASTRO.BASE_CADASTRO;
                console.log(`✅ DATA_CADASTRO atualizada: ${window.DATA_CADASTRO.length} registros`);
            }
            
            // 3. Forçar carregamento da BASE_END se necessário
            console.log('📦 Etapa 2: Verificando BASE_END...');
            
            if (!checkDataAvailable('DB_END.BASE_END', 100)) {
                console.log('⚠️ BASE_END não carregada, tentando carregar...');
                try {
                    await forceLoadScript('../data_base/BASE_END.js', 60000); // Timeout maior para arquivo grande
                    await waitForData('DB_END.BASE_END', 30000);
                } catch (error) {
                    console.warn('⚠️ Falha ao carregar BASE_END, continuando sem ela:', error.message);
                }
            } else {
                console.log('✅ BASE_END já carregada');
            }
            
            // 4. Atualizar DATA_ENDERECOS global
            if (window.DB_END && window.DB_END.BASE_END) {
                window.DATA_ENDERECOS = window.DB_END.BASE_END;
                console.log(`✅ DATA_ENDERECOS atualizada: ${window.DATA_ENDERECOS.length} registros`);
            }
            
            // 5. Forçar carregamento da BASE_LOG_END se necessário
            console.log('📦 Etapa 3: Verificando BASE_LOG_END...');
            
            if (!checkDataAvailable('BASE_LOG_END', 1)) {
                try {
                    await forceLoadScript('../data_base/BASE_LOG_END.js', FIX_CONFIG.timeoutPerFile);
                    await waitForData('BASE_LOG_END', 10000);
                } catch (error) {
                    console.warn('⚠️ Falha ao carregar BASE_LOG_END, continuando sem ela:', error.message);
                }
            } else {
                console.log('✅ BASE_LOG_END já carregada');
            }
            
            // 6. Atualizar DATA_LOG_ENDERECOS global
            if (window.BASE_LOG_END) {
                window.DATA_LOG_ENDERECOS = window.BASE_LOG_END;
                console.log(`✅ DATA_LOG_ENDERECOS atualizada: ${window.DATA_LOG_ENDERECOS.length} registros`);
            }
            
            // 7. Atualizar DATABASE_STATUS
            if (window.DATABASE_STATUS) {
                window.DATABASE_STATUS.BASE_BARRAS = checkDataAvailable('DB_CADASTRO.BASE_CADASTRO');
                window.DATABASE_STATUS.BASE_END = checkDataAvailable('DB_END.BASE_END');
                window.DATABASE_STATUS.BASE_LOG_END = checkDataAvailable('BASE_LOG_END');
                window.DATABASE_STATUS.isLoading = false;
                
                console.log('✅ DATABASE_STATUS atualizado:', window.DATABASE_STATUS);
            }
            
            // 8. Atualizar APP_STATE
            if (window.APP_STATE) {
                window.APP_STATE.databaseReady = checkDataAvailable('DB_CADASTRO.BASE_CADASTRO');
                console.log('✅ APP_STATE.databaseReady atualizado:', window.APP_STATE.databaseReady);
            }
            
            // 9. Recriar índices se DataIndexer estiver disponível
            if (window.dataIndexer && window.DATA_CADASTRO) {
                console.log('🔄 Recriando índices...');
                try {
                    window.dataIndexer.createProductIndex(window.DATA_CADASTRO);
                    
                    if (window.DATA_ENDERECOS) {
                        window.dataIndexer.createCDIndex(window.DATA_ENDERECOS);
                        window.dataIndexer.createAddressIndex(window.DATA_ENDERECOS);
                    }
                    
                    if (window.DATA_LOG_ENDERECOS) {
                        window.dataIndexer.createExcludedAddressIndex(window.DATA_LOG_ENDERECOS);
                    }
                    
                    console.log('✅ Índices recriados com sucesso');
                } catch (error) {
                    console.warn('⚠️ Erro ao recriar índices:', error.message);
                }
            }
            
            // 10. Habilitar interface se necessário
            const cdSelect = document.getElementById('cdSelect');
            if (cdSelect && cdSelect.disabled && window.APP_STATE?.databaseReady) {
                cdSelect.disabled = false;
                console.log('✅ Seletor de CD habilitado');
            }
            
            // 11. Atualizar status na interface
            const statusElement = document.getElementById('status');
            if (statusElement && window.APP_STATE?.databaseReady) {
                statusElement.textContent = 'Bases carregadas com sucesso';
                statusElement.style.background = '#dcfce7';
                statusElement.style.color = '#166534';
                
                // Ocultar após alguns segundos
                setTimeout(() => {
                    statusElement.style.display = 'none';
                }, 3000);
            }
            
            // 12. Testar busca de produto
            console.log('🧪 Testando busca de produto...');
            if (window.DATA_CADASTRO && window.DATA_CADASTRO.length > 0) {
                const testProduct = window.DATA_CADASTRO[0];
                console.log(`🔍 Produto de teste: ${testProduct.CODDV} - ${testProduct.DESC}`);
                
                // Testar função getProductDetails se existir
                if (typeof window.getProductDetails === 'function') {
                    const result = window.getProductDetails(testProduct.CODDV);
                    console.log('📋 Resultado do teste:', result);
                    
                    if (result) {
                        console.log('✅ Busca de produtos funcionando corretamente!');
                    } else {
                        console.warn('⚠️ Função getProductDetails não retornou resultado');
                    }
                } else {
                    console.warn('⚠️ Função getProductDetails não disponível');
                }
            }
            
            console.log('🎉 CORREÇÃO CONCLUÍDA COM SUCESSO!');
            
            // Mostrar toast de sucesso se disponível
            if (typeof window.toast === 'function') {
                window.toast('Bases de dados carregadas com sucesso!', 'success', 5000);
            }
            
            return {
                success: true,
                message: 'Correção aplicada com sucesso',
                databases: {
                    BASE_BARRAS: checkDataAvailable('DB_CADASTRO.BASE_CADASTRO'),
                    BASE_END: checkDataAvailable('DB_END.BASE_END'),
                    BASE_LOG_END: checkDataAvailable('BASE_LOG_END')
                }
            };
            
        } catch (error) {
            console.error('❌ Erro durante correção:', error);
            
            // Mostrar toast de erro se disponível
            if (typeof window.toast === 'function') {
                window.toast(`Erro na correção: ${error.message}`, 'error', 8000);
            }
            
            return {
                success: false,
                error: error.message,
                databases: {
                    BASE_BARRAS: checkDataAvailable('DB_CADASTRO.BASE_CADASTRO'),
                    BASE_END: checkDataAvailable('DB_END.BASE_END'),
                    BASE_LOG_END: checkDataAvailable('BASE_LOG_END')
                }
            };
        }
    }
    
    // Função para verificar se correção é necessária
    function needsFix() {
        // Verificar se BASE_BARRAS está carregada (essencial)
        if (!checkDataAvailable('DB_CADASTRO.BASE_CADASTRO', 100)) {
            console.log('🔍 Correção necessária: BASE_BARRAS não carregada');
            return true;
        }
        
        // Verificar se APP_STATE indica que database não está ready
        if (window.APP_STATE && !window.APP_STATE.databaseReady) {
            console.log('🔍 Correção necessária: APP_STATE.databaseReady é false');
            return true;
        }
        
        // Verificar se função getProductDetails funciona
        if (typeof window.getProductDetails === 'function' && window.DATA_CADASTRO && window.DATA_CADASTRO.length > 0) {
            const testResult = window.getProductDetails(window.DATA_CADASTRO[0].CODDV);
            if (!testResult) {
                console.log('🔍 Correção necessária: getProductDetails não funciona');
                return true;
            }
        }
        
        console.log('✅ Correção não necessária - tudo funcionando');
        return false;
    }
    
    // Executar correção automaticamente se necessário
    setTimeout(() => {
        if (needsFix()) {
            console.log('🔧 Aplicando correção automática...');
            fixProductLoading();
        } else {
            console.log('✅ Sistema funcionando corretamente, correção não necessária');
        }
    }, 2000);
    
    // Exportar funções para uso manual
    window.fixProductLoading = fixProductLoading;
    window.forceLoadScript = forceLoadScript;
    window.checkDataAvailable = checkDataAvailable;
    window.needsFix = needsFix;
    
    console.log('✅ Sistema de correção de carregamento configurado');
    console.log('💡 Use window.fixProductLoading() para forçar correção manual');
    
})();