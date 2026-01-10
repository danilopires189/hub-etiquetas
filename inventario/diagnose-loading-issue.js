/**
 * Diagnóstico Específico para Problema de Carregamento de Produtos
 * Este script identifica e corrige problemas comuns no carregamento
 */

(function() {
    'use strict';
    
    console.log('🔍 DIAGNÓSTICO ESPECÍFICO - PROBLEMA DE CARREGAMENTO DE PRODUTOS');
    console.log('================================================================');
    
    // Função para verificar se as bases estão carregadas
    function checkDatabasesLoaded() {
        const results = {
            timestamp: new Date().toISOString(),
            databases: {},
            globalArrays: {},
            issues: [],
            recommendations: []
        };
        
        // Verificar DB_CADASTRO (BASE_BARRAS)
        try {
            if (window.DB_CADASTRO && window.DB_CADASTRO.BASE_CADASTRO) {
                const data = window.DB_CADASTRO.BASE_CADASTRO;
                results.databases.DB_CADASTRO = {
                    loaded: true,
                    count: Array.isArray(data) ? data.length : 0,
                    isArray: Array.isArray(data),
                    firstItem: Array.isArray(data) && data.length > 0 ? data[0] : null
                };
                
                if (Array.isArray(data) && data.length > 0) {
                    console.log(`✅ DB_CADASTRO.BASE_CADASTRO: ${data.length} registros carregados`);
                    console.log(`📋 Primeiro produto:`, data[0]);
                } else {
                    results.issues.push('DB_CADASTRO.BASE_CADASTRO está vazio ou não é um array');
                }
            } else {
                results.databases.DB_CADASTRO = { loaded: false };
                results.issues.push('DB_CADASTRO.BASE_CADASTRO não encontrado');
                console.log('❌ DB_CADASTRO.BASE_CADASTRO não encontrado');
            }
        } catch (error) {
            results.issues.push(`Erro ao verificar DB_CADASTRO: ${error.message}`);
        }
        
        // Verificar DB_END (BASE_END)
        try {
            if (window.DB_END && window.DB_END.BASE_END) {
                const data = window.DB_END.BASE_END;
                results.databases.DB_END = {
                    loaded: true,
                    count: Array.isArray(data) ? data.length : 0,
                    isArray: Array.isArray(data),
                    firstItem: Array.isArray(data) && data.length > 0 ? data[0] : null
                };
                
                if (Array.isArray(data) && data.length > 0) {
                    console.log(`✅ DB_END.BASE_END: ${data.length} registros carregados`);
                } else {
                    results.issues.push('DB_END.BASE_END está vazio ou não é um array');
                }
            } else {
                results.databases.DB_END = { loaded: false };
                results.issues.push('DB_END.BASE_END não encontrado');
                console.log('❌ DB_END.BASE_END não encontrado');
            }
        } catch (error) {
            results.issues.push(`Erro ao verificar DB_END: ${error.message}`);
        }
        
        // Verificar BASE_LOG_END
        try {
            if (window.BASE_LOG_END) {
                const data = window.BASE_LOG_END;
                results.databases.BASE_LOG_END = {
                    loaded: true,
                    count: Array.isArray(data) ? data.length : 0,
                    isArray: Array.isArray(data),
                    firstItem: Array.isArray(data) && data.length > 0 ? data[0] : null
                };
                
                if (Array.isArray(data) && data.length > 0) {
                    console.log(`✅ BASE_LOG_END: ${data.length} registros carregados`);
                } else {
                    results.issues.push('BASE_LOG_END está vazio ou não é um array');
                }
            } else {
                results.databases.BASE_LOG_END = { loaded: false };
                results.issues.push('BASE_LOG_END não encontrado');
                console.log('❌ BASE_LOG_END não encontrado');
            }
        } catch (error) {
            results.issues.push(`Erro ao verificar BASE_LOG_END: ${error.message}`);
        }
        
        // Verificar arrays globais (DATA_*)
        const globalArrays = ['DATA_ENDERECOS', 'DATA_CADASTRO', 'DATA_LOG_ENDERECOS'];
        globalArrays.forEach(arrayName => {
            try {
                if (window[arrayName]) {
                    const data = window[arrayName];
                    results.globalArrays[arrayName] = {
                        exists: true,
                        count: Array.isArray(data) ? data.length : 0,
                        isArray: Array.isArray(data)
                    };
                    
                    if (Array.isArray(data) && data.length > 0) {
                        console.log(`✅ ${arrayName}: ${data.length} registros`);
                    } else {
                        results.issues.push(`${arrayName} está vazio ou não é um array`);
                    }
                } else {
                    results.globalArrays[arrayName] = { exists: false };
                    results.issues.push(`${arrayName} não encontrado`);
                }
            } catch (error) {
                results.issues.push(`Erro ao verificar ${arrayName}: ${error.message}`);
            }
        });
        
        return results;
    }
    
    // Função para testar busca de produto específico
    function testProductSearch(coddv = '100005') {
        console.log(`\n🔍 TESTANDO BUSCA DE PRODUTO: ${coddv}`);
        console.log('==========================================');
        
        const results = {
            coddv: coddv,
            methods: {},
            directSearch: {},
            recommendations: []
        };
        
        // Teste 1: Função getProductDetails
        try {
            if (typeof window.getProductDetails === 'function') {
                const result = window.getProductDetails(coddv);
                results.methods.getProductDetails = {
                    available: true,
                    result: result,
                    success: !!result
                };
                console.log(`📋 getProductDetails(${coddv}):`, result);
            } else {
                results.methods.getProductDetails = { available: false };
                console.log('❌ Função getProductDetails não disponível');
                results.recommendations.push('Função getProductDetails não está disponível - verificar se script.js foi carregado');
            }
        } catch (error) {
            results.methods.getProductDetails = { available: true, error: error.message };
            console.log(`❌ Erro em getProductDetails: ${error.message}`);
        }
        
        // Teste 2: Busca direta em DATA_CADASTRO
        try {
            if (window.DATA_CADASTRO && Array.isArray(window.DATA_CADASTRO)) {
                const result = window.DATA_CADASTRO.find(item => item && item.CODDV === coddv);
                results.directSearch.DATA_CADASTRO = {
                    available: true,
                    result: result,
                    success: !!result,
                    totalRecords: window.DATA_CADASTRO.length
                };
                console.log(`📋 Busca direta em DATA_CADASTRO (${window.DATA_CADASTRO.length} registros):`, result);
            } else {
                results.directSearch.DATA_CADASTRO = { available: false };
                console.log('❌ DATA_CADASTRO não disponível ou não é array');
                results.recommendations.push('DATA_CADASTRO não está disponível - verificar carregamento assíncrono');
            }
        } catch (error) {
            results.directSearch.DATA_CADASTRO = { available: true, error: error.message };
            console.log(`❌ Erro na busca direta em DATA_CADASTRO: ${error.message}`);
        }
        
        // Teste 3: Busca em DB_CADASTRO.BASE_CADASTRO
        try {
            if (window.DB_CADASTRO && window.DB_CADASTRO.BASE_CADASTRO && Array.isArray(window.DB_CADASTRO.BASE_CADASTRO)) {
                const result = window.DB_CADASTRO.BASE_CADASTRO.find(item => item && item.CODDV === coddv);
                results.directSearch.DB_CADASTRO = {
                    available: true,
                    result: result,
                    success: !!result,
                    totalRecords: window.DB_CADASTRO.BASE_CADASTRO.length
                };
                console.log(`📋 Busca em DB_CADASTRO.BASE_CADASTRO (${window.DB_CADASTRO.BASE_CADASTRO.length} registros):`, result);
            } else {
                results.directSearch.DB_CADASTRO = { available: false };
                console.log('❌ DB_CADASTRO.BASE_CADASTRO não disponível ou não é array');
                results.recommendations.push('DB_CADASTRO.BASE_CADASTRO não está disponível - verificar se BASE_BARRAS.js foi carregado');
            }
        } catch (error) {
            results.directSearch.DB_CADASTRO = { available: true, error: error.message };
            console.log(`❌ Erro na busca em DB_CADASTRO.BASE_CADASTRO: ${error.message}`);
        }
        
        // Teste 4: DataIndexer
        try {
            if (window.dataIndexer && typeof window.dataIndexer.getProductDetails === 'function') {
                const result = window.dataIndexer.getProductDetails(coddv);
                results.methods.dataIndexer = {
                    available: true,
                    result: result,
                    success: !!result
                };
                console.log(`📋 dataIndexer.getProductDetails(${coddv}):`, result);
            } else {
                results.methods.dataIndexer = { available: false };
                console.log('❌ dataIndexer não disponível ou método getProductDetails não encontrado');
                results.recommendations.push('DataIndexer não está inicializado - verificar carregamento assíncrono');
            }
        } catch (error) {
            results.methods.dataIndexer = { available: true, error: error.message };
            console.log(`❌ Erro no dataIndexer: ${error.message}`);
        }
        
        return results;
    }
    
    // Função para verificar estado da aplicação
    function checkAppState() {
        console.log(`\n🔍 VERIFICANDO ESTADO DA APLICAÇÃO`);
        console.log('==================================');
        
        const state = {
            APP_STATE: null,
            DATABASE_STATUS: null,
            asyncLoader: null,
            loadingManager: null,
            issues: []
        };
        
        // Verificar APP_STATE
        if (window.APP_STATE) {
            state.APP_STATE = {
                databaseReady: window.APP_STATE.databaseReady,
                selectedCD: window.APP_STATE.selectedCD,
                productListSize: window.APP_STATE.productList ? window.APP_STATE.productList.size : 'N/A',
                isLoading: window.APP_STATE.isLoading
            };
            console.log('📊 APP_STATE:', state.APP_STATE);
            
            if (!window.APP_STATE.databaseReady) {
                state.issues.push('APP_STATE.databaseReady é false - bases não foram carregadas completamente');
            }
        } else {
            state.issues.push('APP_STATE não encontrado');
            console.log('❌ APP_STATE não encontrado');
        }
        
        // Verificar DATABASE_STATUS
        if (window.DATABASE_STATUS) {
            state.DATABASE_STATUS = { ...window.DATABASE_STATUS };
            console.log('📊 DATABASE_STATUS:', state.DATABASE_STATUS);
            
            if (!window.DATABASE_STATUS.BASE_END || !window.DATABASE_STATUS.BASE_BARRAS) {
                state.issues.push('DATABASE_STATUS indica que algumas bases não foram carregadas');
            }
        } else {
            state.issues.push('DATABASE_STATUS não encontrado');
            console.log('❌ DATABASE_STATUS não encontrado');
        }
        
        // Verificar AsyncLoader
        if (window.asyncLoader) {
            state.asyncLoader = {
                available: true,
                loadedDatabases: window.asyncLoader.loadedDatabases ? window.asyncLoader.loadedDatabases.size : 0
            };
            console.log('📊 AsyncLoader disponível com', state.asyncLoader.loadedDatabases, 'bases carregadas');
        } else {
            state.issues.push('AsyncLoader não encontrado');
            console.log('❌ AsyncLoader não encontrado');
        }
        
        // Verificar LoadingManager
        if (window.loadingManager) {
            state.loadingManager = { available: true };
            console.log('✅ LoadingManager disponível');
        } else {
            state.issues.push('LoadingManager não encontrado');
            console.log('❌ LoadingManager não encontrado');
        }
        
        return state;
    }
    
    // Função principal de diagnóstico
    function runFullDiagnosis() {
        console.log('🚀 INICIANDO DIAGNÓSTICO COMPLETO...');
        
        const diagnosis = {
            timestamp: new Date().toISOString(),
            databases: null,
            productSearch: null,
            appState: null,
            summary: {
                criticalIssues: [],
                warnings: [],
                recommendations: []
            }
        };
        
        // 1. Verificar bases de dados
        diagnosis.databases = checkDatabasesLoaded();
        
        // 2. Testar busca de produto
        diagnosis.productSearch = testProductSearch('100005');
        
        // 3. Verificar estado da aplicação
        diagnosis.appState = checkAppState();
        
        // 4. Compilar resumo
        const allIssues = [
            ...diagnosis.databases.issues,
            ...diagnosis.productSearch.recommendations,
            ...diagnosis.appState.issues
        ];
        
        // Classificar problemas
        allIssues.forEach(issue => {
            if (issue.includes('DB_CADASTRO') || issue.includes('DATA_CADASTRO') || issue.includes('getProductDetails')) {
                diagnosis.summary.criticalIssues.push(issue);
            } else {
                diagnosis.summary.warnings.push(issue);
            }
        });
        
        // Gerar recomendações
        if (diagnosis.summary.criticalIssues.length > 0) {
            diagnosis.summary.recommendations.push('CRÍTICO: Bases de dados de produtos não carregadas - verificar carregamento de BASE_BARRAS.js');
        }
        
        if (!diagnosis.databases.databases.DB_CADASTRO?.loaded) {
            diagnosis.summary.recommendations.push('Recarregar a página e aguardar carregamento completo das bases');
        }
        
        if (!diagnosis.productSearch.methods.getProductDetails?.available) {
            diagnosis.summary.recommendations.push('Verificar se script.js foi carregado corretamente');
        }
        
        // Mostrar resumo final
        console.log('\n📊 RESUMO DO DIAGNÓSTICO');
        console.log('========================');
        
        if (diagnosis.summary.criticalIssues.length > 0) {
            console.log('🚨 PROBLEMAS CRÍTICOS:');
            diagnosis.summary.criticalIssues.forEach(issue => console.log(`   • ${issue}`));
        }
        
        if (diagnosis.summary.warnings.length > 0) {
            console.log('⚠️ AVISOS:');
            diagnosis.summary.warnings.forEach(warning => console.log(`   • ${warning}`));
        }
        
        if (diagnosis.summary.recommendations.length > 0) {
            console.log('💡 RECOMENDAÇÕES:');
            diagnosis.summary.recommendations.forEach(rec => console.log(`   • ${rec}`));
        }
        
        if (diagnosis.summary.criticalIssues.length === 0 && diagnosis.summary.warnings.length === 0) {
            console.log('✅ Nenhum problema crítico encontrado!');
        }
        
        return diagnosis;
    }
    
    // Executar diagnóstico após um delay para permitir carregamento
    setTimeout(() => {
        const diagnosis = runFullDiagnosis();
        
        // Armazenar resultado para acesso posterior
        window.lastDiagnosis = diagnosis;
        
        console.log('\n🔧 DIAGNÓSTICO CONCLUÍDO');
        console.log('Use window.lastDiagnosis para ver o resultado completo');
        console.log('Use window.runDiagnosis() para executar novamente');
        
    }, 3000);
    
    // Exportar funções para uso manual
    window.runDiagnosis = runFullDiagnosis;
    window.checkDatabases = checkDatabasesLoaded;
    window.testProduct = testProductSearch;
    window.checkApp = checkAppState;
    
    console.log('✅ Diagnóstico configurado. Executando em 3 segundos...');
    
})();