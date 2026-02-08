/**
 * Script de Debug para Diagnóstico de Carregamento de Base de Dados
 * Adicione este script ao final do index.html para diagnosticar problemas
 */

(function() {
    'use strict';
    
    console.log('🔍 INICIANDO DIAGNÓSTICO DE BASE DE DADOS...');
    
    // Função para verificar status das bases
    function checkDatabaseStatus() {
        const status = {
            timestamp: new Date().toISOString(),
            globalVariables: {},
            dataArrays: {},
            databaseStatus: {},
            errors: []
        };
        
        // Verificar variáveis globais
        const expectedGlobals = ['DB_END', 'DB_CADASTRO', 'BASE_LOG_END'];
        expectedGlobals.forEach(varName => {
            try {
                if (window[varName]) {
                    status.globalVariables[varName] = {
                        exists: true,
                        type: typeof window[varName],
                        keys: Object.keys(window[varName] || {})
                    };
                    
                    // Verificar sub-propriedades
                    if (window[varName].BASE_END) {
                        status.globalVariables[varName].BASE_END_count = window[varName].BASE_END.length;
                    }
                    if (window[varName].BASE_CADASTRO) {
                        status.globalVariables[varName].BASE_CADASTRO_count = window[varName].BASE_CADASTRO.length;
                    }
                } else {
                    status.globalVariables[varName] = { exists: false };
                }
            } catch (error) {
                status.errors.push(`Erro ao verificar ${varName}: ${error.message}`);
            }
        });
        
        // Verificar arrays de dados
        const dataArrays = ['DATA_ENDERECOS', 'DATA_CADASTRO', 'DATA_LOG_ENDERECOS'];
        dataArrays.forEach(arrayName => {
            try {
                if (window[arrayName]) {
                    status.dataArrays[arrayName] = {
                        exists: true,
                        length: window[arrayName].length,
                        isArray: Array.isArray(window[arrayName])
                    };
                } else {
                    status.dataArrays[arrayName] = { exists: false };
                }
            } catch (error) {
                status.errors.push(`Erro ao verificar ${arrayName}: ${error.message}`);
            }
        });
        
        // Verificar DATABASE_STATUS
        try {
            if (window.DATABASE_STATUS) {
                status.databaseStatus = { ...window.DATABASE_STATUS };
            } else {
                status.databaseStatus = { exists: false };
            }
        } catch (error) {
            status.errors.push(`Erro ao verificar DATABASE_STATUS: ${error.message}`);
        }
        
        // Verificar APP_STATE
        try {
            if (window.APP_STATE) {
                status.appState = {
                    databaseReady: window.APP_STATE.databaseReady,
                    selectedCD: window.APP_STATE.selectedCD,
                    productListSize: window.APP_STATE.productList ? window.APP_STATE.productList.size : 'N/A'
                };
            } else {
                status.appState = { exists: false };
            }
        } catch (error) {
            status.errors.push(`Erro ao verificar APP_STATE: ${error.message}`);
        }
        
        return status;
    }
    
    // Função para testar busca de produto
    function testProductSearch(coddv = '100005') {
        console.log(`🔍 Testando busca de produto: ${coddv}`);
        
        try {
            // Testar função getProductDetails se existir
            if (window.getProductDetails) {
                const result = window.getProductDetails(coddv);
                console.log(`📋 getProductDetails(${coddv}):`, result);
            } else {
                console.warn('⚠️ Função getProductDetails não encontrada');
            }
            
            // Testar busca direta na base
            if (window.DATA_CADASTRO && window.DATA_CADASTRO.length > 0) {
                const directResult = window.DATA_CADASTRO.find(item => item.CODDV === coddv);
                console.log(`📋 Busca direta em DATA_CADASTRO:`, directResult);
            } else {
                console.warn('⚠️ DATA_CADASTRO não disponível ou vazia');
            }
            
            // Testar busca na variável global
            if (window.DB_CADASTRO && window.DB_CADASTRO.BASE_CADASTRO) {
                const globalResult = window.DB_CADASTRO.BASE_CADASTRO.find(item => item.CODDV === coddv);
                console.log(`📋 Busca em DB_CADASTRO.BASE_CADASTRO:`, globalResult);
            } else {
                console.warn('⚠️ DB_CADASTRO.BASE_CADASTRO não disponível');
            }
            
        } catch (error) {
            console.error(`❌ Erro no teste de busca: ${error.message}`);
        }
    }
    
    // Função para mostrar relatório completo
    function showDiagnosticReport() {
        const status = checkDatabaseStatus();
        
        console.log('📊 RELATÓRIO DE DIAGNÓSTICO:');
        console.log('=====================================');
        console.log(JSON.stringify(status, null, 2));
        console.log('=====================================');
        
        // Resumo visual
        console.log('📋 RESUMO:');
        
        // Variáveis globais
        Object.entries(status.globalVariables).forEach(([name, info]) => {
            if (info.exists) {
                console.log(`✅ ${name}: OK (${info.keys?.join(', ') || 'sem propriedades'})`);
            } else {
                console.log(`❌ ${name}: NÃO ENCONTRADA`);
            }
        });
        
        // Arrays de dados
        Object.entries(status.dataArrays).forEach(([name, info]) => {
            if (info.exists && info.length > 0) {
                console.log(`✅ ${name}: ${info.length} registros`);
            } else if (info.exists) {
                console.log(`⚠️ ${name}: VAZIO`);
            } else {
                console.log(`❌ ${name}: NÃO ENCONTRADO`);
            }
        });
        
        // Status da base
        if (status.databaseStatus.exists !== false) {
            console.log(`📊 DATABASE_STATUS:`, status.databaseStatus);
        } else {
            console.log(`❌ DATABASE_STATUS: NÃO ENCONTRADO`);
        }
        
        // Erros
        if (status.errors.length > 0) {
            console.log('❌ ERROS ENCONTRADOS:');
            status.errors.forEach(error => console.log(`   • ${error}`));
        } else {
            console.log('✅ Nenhum erro encontrado');
        }
        
        return status;
    }
    
    // Executar diagnóstico inicial
    setTimeout(() => {
        console.log('🔍 Executando diagnóstico inicial...');
        showDiagnosticReport();
        
        // Testar busca de produto
        testProductSearch();
        
        // Verificar se há produtos de exemplo para testar
        if (window.DB_CADASTRO && window.DB_CADASTRO.BASE_CADASTRO && window.DB_CADASTRO.BASE_CADASTRO.length > 0) {
            const firstProduct = window.DB_CADASTRO.BASE_CADASTRO[0];
            console.log(`🧪 Testando com primeiro produto da base: ${firstProduct.CODDV}`);
            testProductSearch(firstProduct.CODDV);
        }
        
    }, 2000);
    
    // Executar diagnóstico periódico
    setInterval(() => {
        const status = checkDatabaseStatus();
        const hasData = status.dataArrays.DATA_CADASTRO?.length > 0 || 
                       status.globalVariables.DB_CADASTRO?.BASE_CADASTRO_count > 0;
        
        if (!hasData) {
            console.warn('⚠️ ATENÇÃO: Dados ainda não carregados após', 
                        Math.round((Date.now() - window.performance.timing.navigationStart) / 1000), 'segundos');
        }
    }, 5000);
    
    // Exportar funções para uso manual
    window.debugDatabase = {
        checkStatus: checkDatabaseStatus,
        showReport: showDiagnosticReport,
        testSearch: testProductSearch
    };
    
    console.log('✅ Debug de base de dados configurado. Use window.debugDatabase.showReport() para relatório completo');
    
})();