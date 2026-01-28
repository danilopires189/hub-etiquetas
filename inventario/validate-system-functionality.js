/**
 * Validação de Funcionalidade do Sistema
 * Script para verificar se todas as funções essenciais estão funcionando
 */

(function() {
    'use strict';
    
    console.log('🧪 INICIANDO VALIDAÇÃO DE FUNCIONALIDADE DO SISTEMA...');
    
    // Função para executar validação completa
    function validateSystemFunctionality() {
        console.log('📋 Executando validação completa do sistema...');
        
        const validation = {
            timestamp: new Date().toISOString(),
            databases: {},
            functions: {},
            classes: {},
            interface: {},
            tests: {},
            overall: {
                status: 'unknown',
                score: 0,
                maxScore: 0,
                issues: [],
                recommendations: []
            }
        };
        
        // 1. Validar bases de dados
        console.log('📊 Validando bases de dados...');
        validation.databases = validateDatabases();
        
        // 2. Validar funções essenciais
        console.log('🔧 Validando funções essenciais...');
        validation.functions = validateFunctions();
        
        // 3. Validar classes
        console.log('📦 Validando classes...');
        validation.classes = validateClasses();
        
        // 4. Validar interface
        console.log('🖥️ Validando interface...');
        validation.interface = validateInterface();
        
        // 5. Executar testes funcionais
        console.log('🧪 Executando testes funcionais...');
        validation.tests = executeTests();
        
        // 6. Calcular score geral
        calculateOverallScore(validation);
        
        // 7. Gerar recomendações
        generateRecommendations(validation);
        
        // 8. Mostrar resultado
        displayValidationResults(validation);
        
        return validation;
    }
    
    // Validar bases de dados
    function validateDatabases() {
        const databases = {
            BASE_BARRAS: {
                globalVar: 'DB_CADASTRO.BASE_CADASTRO',
                required: true,
                minRecords: 100,
                status: 'unknown',
                recordCount: 0,
                score: 0
            },
            BASE_END: {
                globalVar: 'DB_END.BASE_END',
                required: false,
                minRecords: 1,
                status: 'unknown',
                recordCount: 0,
                score: 0
            },
            BASE_LOG_END: {
                globalVar: 'BASE_LOG_END',
                required: false,
                minRecords: 1,
                status: 'unknown',
                recordCount: 0,
                score: 0
            }
        };
        
        // Verificar cada base
        Object.entries(databases).forEach(([name, config]) => {
            try {
                const data = getGlobalData(config.globalVar);
                
                if (data && Array.isArray(data)) {
                    config.recordCount = data.length;
                    
                    if (data.length >= config.minRecords) {
                        config.status = 'ok';
                        config.score = 10;
                        console.log(`✅ ${name}: ${data.length} registros`);
                    } else {
                        config.status = 'insufficient';
                        config.score = 5;
                        console.log(`⚠️ ${name}: ${data.length} registros (mínimo: ${config.minRecords})`);
                    }
                } else {
                    config.status = 'missing';
                    config.score = 0;
                    console.log(`❌ ${name}: Não disponível`);
                }
            } catch (error) {
                config.status = 'error';
                config.score = 0;
                config.error = error.message;
                console.log(`❌ ${name}: Erro - ${error.message}`);
            }
        });
        
        // Verificar sincronização de variáveis globais
        const globalVars = {
            DATA_CADASTRO: {
                expected: databases.BASE_BARRAS.recordCount,
                actual: window.DATA_CADASTRO?.length || 0,
                synced: false
            },
            DATA_ENDERECOS: {
                expected: databases.BASE_END.recordCount,
                actual: window.DATA_ENDERECOS?.length || 0,
                synced: false
            },
            DATA_LOG_ENDERECOS: {
                expected: databases.BASE_LOG_END.recordCount,
                actual: window.DATA_LOG_ENDERECOS?.length || 0,
                synced: false
            }
        };
        
        Object.entries(globalVars).forEach(([name, config]) => {
            config.synced = config.expected === config.actual;
            if (config.synced) {
                console.log(`✅ ${name}: Sincronizada (${config.actual} registros)`);
            } else {
                console.log(`⚠️ ${name}: Dessincronizada (esperado: ${config.expected}, atual: ${config.actual})`);
            }
        });
        
        return { databases, globalVars };
    }
    
    // Validar funções essenciais
    function validateFunctions() {
        const functions = {
            getProductDetails: {
                required: true,
                testable: true,
                status: 'unknown',
                score: 0
            },
            handleProductSearch: {
                required: true,
                testable: false,
                status: 'unknown',
                score: 0
            },
            loadDatabasesAsync: {
                required: true,
                testable: false,
                status: 'unknown',
                score: 0
            },
            validateProduct: {
                required: true,
                testable: true,
                status: 'unknown',
                score: 0
            },
            updateSearchInfo: {
                required: false,
                testable: false,
                status: 'unknown',
                score: 0
            }
        };
        
        Object.entries(functions).forEach(([name, config]) => {
            if (typeof window[name] === 'function') {
                config.status = 'available';
                config.score = 10;
                console.log(`✅ ${name}: Disponível`);
            } else {
                config.status = 'missing';
                config.score = 0;
                console.log(`❌ ${name}: Não disponível`);
            }
        });
        
        return functions;
    }
    
    // Validar classes
    function validateClasses() {
        const classes = {
            AsyncDatabaseLoader: {
                required: true,
                instantiable: true,
                status: 'unknown',
                score: 0
            },
            DataIndexer: {
                required: true,
                instantiable: true,
                status: 'unknown',
                score: 0
            },
            LoadingManager: {
                required: false,
                instantiable: true,
                status: 'unknown',
                score: 0
            }
        };
        
        Object.entries(classes).forEach(([name, config]) => {
            if (typeof window[name] !== 'undefined') {
                config.status = 'available';
                config.score = 10;
                console.log(`✅ ${name}: Disponível`);
                
                // Testar instanciação se necessário
                if (config.instantiable) {
                    try {
                        const instance = new window[name]();
                        config.instantiable = true;
                        console.log(`✅ ${name}: Instanciável`);
                    } catch (error) {
                        config.instantiable = false;
                        config.score = 5;
                        console.log(`⚠️ ${name}: Erro na instanciação - ${error.message}`);
                    }
                }
            } else {
                config.status = 'missing';
                config.score = 0;
                console.log(`❌ ${name}: Não disponível`);
            }
        });
        
        return classes;
    }
    
    // Validar interface
    function validateInterface() {
        const elements = {
            cdSelect: {
                id: 'cdSelect',
                required: true,
                shouldBeEnabled: false, // Depende do carregamento
                status: 'unknown',
                score: 0
            },
            coddvInput: {
                id: 'coddvInput',
                required: true,
                shouldBeEnabled: false, // Depende da seleção de CD
                status: 'unknown',
                score: 0
            },
            btnBuscar: {
                id: 'btnBuscar',
                required: true,
                shouldBeEnabled: false, // Depende da seleção de CD
                status: 'unknown',
                score: 0
            },
            status: {
                id: 'status',
                required: true,
                shouldBeEnabled: true,
                status: 'unknown',
                score: 0
            }
        };
        
        Object.entries(elements).forEach(([name, config]) => {
            const element = document.getElementById(config.id);
            
            if (element) {
                config.status = 'found';
                config.score = 10;
                config.disabled = element.disabled;
                console.log(`✅ ${name}: Encontrado${element.disabled ? ' (desabilitado)' : ''}`);
            } else {
                config.status = 'missing';
                config.score = 0;
                console.log(`❌ ${name}: Não encontrado`);
            }
        });
        
        return elements;
    }
    
    // Executar testes funcionais
    function executeTests() {
        const tests = {
            productSearch: {
                name: 'Busca de Produto',
                status: 'unknown',
                score: 0,
                details: null
            },
            productValidation: {
                name: 'Validação de Produto',
                status: 'unknown',
                score: 0,
                details: null
            },
            indexCreation: {
                name: 'Criação de Índices',
                status: 'unknown',
                score: 0,
                details: null
            }
        };
        
        // Teste 1: Busca de produto
        if (typeof window.getProductDetails === 'function' && 
            window.DATA_CADASTRO && window.DATA_CADASTRO.length > 0) {
            
            try {
                const testProduct = window.DATA_CADASTRO[0];
                const result = window.getProductDetails(testProduct.CODDV);
                
                if (result && result.CODDV === testProduct.CODDV) {
                    tests.productSearch.status = 'passed';
                    tests.productSearch.score = 20;
                    tests.productSearch.details = `Produto encontrado: ${result.CODDV} - ${result.DESC}`;
                    console.log(`✅ Teste de busca: PASSOU - ${result.CODDV}`);
                } else {
                    tests.productSearch.status = 'failed';
                    tests.productSearch.score = 0;
                    tests.productSearch.details = 'Função não retornou resultado válido';
                    console.log(`❌ Teste de busca: FALHOU - Resultado inválido`);
                }
            } catch (error) {
                tests.productSearch.status = 'error';
                tests.productSearch.score = 0;
                tests.productSearch.details = error.message;
                console.log(`❌ Teste de busca: ERRO - ${error.message}`);
            }
        } else {
            tests.productSearch.status = 'skipped';
            tests.productSearch.score = 0;
            tests.productSearch.details = 'Pré-requisitos não atendidos';
            console.log(`⚠️ Teste de busca: PULADO - Pré-requisitos não atendidos`);
        }
        
        // Teste 2: Validação de produto
        if (typeof window.validateProduct === 'function' && 
            window.DATA_CADASTRO && window.DATA_CADASTRO.length > 0) {
            
            try {
                const testProduct = window.DATA_CADASTRO[0];
                const result = window.validateProduct(testProduct.CODDV, '1'); // CD 1
                
                if (result && typeof result.valid === 'boolean') {
                    tests.productValidation.status = 'passed';
                    tests.productValidation.score = 15;
                    tests.productValidation.details = `Validação: ${result.valid ? 'Válido' : 'Inválido'} - ${result.message}`;
                    console.log(`✅ Teste de validação: PASSOU - ${result.message}`);
                } else {
                    tests.productValidation.status = 'failed';
                    tests.productValidation.score = 0;
                    tests.productValidation.details = 'Função não retornou resultado válido';
                    console.log(`❌ Teste de validação: FALHOU - Resultado inválido`);
                }
            } catch (error) {
                tests.productValidation.status = 'error';
                tests.productValidation.score = 0;
                tests.productValidation.details = error.message;
                console.log(`❌ Teste de validação: ERRO - ${error.message}`);
            }
        } else {
            tests.productValidation.status = 'skipped';
            tests.productValidation.score = 0;
            tests.productValidation.details = 'Pré-requisitos não atendidos';
            console.log(`⚠️ Teste de validação: PULADO - Pré-requisitos não atendidos`);
        }
        
        // Teste 3: Criação de índices
        if (window.dataIndexer && typeof window.dataIndexer.createProductIndex === 'function' &&
            window.DATA_CADASTRO && window.DATA_CADASTRO.length > 0) {
            
            try {
                const indexResult = window.dataIndexer.createProductIndex(window.DATA_CADASTRO);
                
                if (indexResult && indexResult.size > 0) {
                    tests.indexCreation.status = 'passed';
                    tests.indexCreation.score = 15;
                    tests.indexCreation.details = `Índice criado com ${indexResult.size} entradas`;
                    console.log(`✅ Teste de índices: PASSOU - ${indexResult.size} entradas`);
                } else {
                    tests.indexCreation.status = 'failed';
                    tests.indexCreation.score = 0;
                    tests.indexCreation.details = 'Índice não foi criado corretamente';
                    console.log(`❌ Teste de índices: FALHOU - Índice vazio`);
                }
            } catch (error) {
                tests.indexCreation.status = 'error';
                tests.indexCreation.score = 0;
                tests.indexCreation.details = error.message;
                console.log(`❌ Teste de índices: ERRO - ${error.message}`);
            }
        } else {
            tests.indexCreation.status = 'skipped';
            tests.indexCreation.score = 0;
            tests.indexCreation.details = 'Pré-requisitos não atendidos';
            console.log(`⚠️ Teste de índices: PULADO - Pré-requisitos não atendidos`);
        }
        
        return tests;
    }
    
    // Calcular score geral
    function calculateOverallScore(validation) {
        let totalScore = 0;
        let maxScore = 0;
        
        // Scores das bases de dados
        Object.values(validation.databases.databases).forEach(db => {
            totalScore += db.score;
            maxScore += 10;
        });
        
        // Scores das funções
        Object.values(validation.functions).forEach(func => {
            totalScore += func.score;
            maxScore += 10;
        });
        
        // Scores das classes
        Object.values(validation.classes).forEach(cls => {
            totalScore += cls.score;
            maxScore += 10;
        });
        
        // Scores da interface
        Object.values(validation.interface).forEach(elem => {
            totalScore += elem.score;
            maxScore += 10;
        });
        
        // Scores dos testes
        Object.values(validation.tests).forEach(test => {
            totalScore += test.score;
            maxScore += test.name === 'Busca de Produto' ? 20 : 15;
        });
        
        validation.overall.score = totalScore;
        validation.overall.maxScore = maxScore;
        
        const percentage = (totalScore / maxScore) * 100;
        
        if (percentage >= 90) {
            validation.overall.status = 'excellent';
        } else if (percentage >= 75) {
            validation.overall.status = 'good';
        } else if (percentage >= 50) {
            validation.overall.status = 'fair';
        } else {
            validation.overall.status = 'poor';
        }
        
        console.log(`📊 Score geral: ${totalScore}/${maxScore} (${percentage.toFixed(1)}%) - ${validation.overall.status}`);
    }
    
    // Gerar recomendações
    function generateRecommendations(validation) {
        const recommendations = [];
        
        // Verificar bases de dados críticas
        if (validation.databases.databases.BASE_BARRAS.status !== 'ok') {
            recommendations.push('🔴 CRÍTICO: Carregar BASE_BARRAS - essencial para funcionamento');
        }
        
        // Verificar funções essenciais
        if (validation.functions.getProductDetails.status !== 'available') {
            recommendations.push('🔴 CRÍTICO: Função getProductDetails não disponível');
        }
        
        // Verificar sincronização
        if (!validation.databases.globalVars.DATA_CADASTRO.synced) {
            recommendations.push('🟡 AVISO: Sincronizar variável DATA_CADASTRO');
        }
        
        // Verificar testes
        if (validation.tests.productSearch.status !== 'passed') {
            recommendations.push('🔴 CRÍTICO: Teste de busca de produto falhando');
        }
        
        // Verificar classes
        if (validation.classes.DataIndexer.status !== 'available') {
            recommendations.push('🟡 AVISO: DataIndexer não disponível - performance reduzida');
        }
        
        validation.overall.recommendations = recommendations;
        
        if (recommendations.length === 0) {
            console.log('🎉 Nenhuma recomendação - sistema funcionando perfeitamente!');
        } else {
            console.log('💡 Recomendações:');
            recommendations.forEach(rec => console.log(`   ${rec}`));
        }
    }
    
    // Mostrar resultados da validação
    function displayValidationResults(validation) {
        console.log('\n📋 RELATÓRIO DE VALIDAÇÃO DO SISTEMA');
        console.log('=====================================');
        
        const statusEmojis = {
            excellent: '🟢',
            good: '🔵',
            fair: '🟡',
            poor: '🔴'
        };
        
        console.log(`${statusEmojis[validation.overall.status]} Status Geral: ${validation.overall.status.toUpperCase()}`);
        console.log(`📊 Score: ${validation.overall.score}/${validation.overall.maxScore} (${((validation.overall.score / validation.overall.maxScore) * 100).toFixed(1)}%)`);
        
        if (validation.overall.issues.length > 0) {
            console.log('\n❌ Problemas Encontrados:');
            validation.overall.issues.forEach(issue => console.log(`   • ${issue}`));
        }
        
        if (validation.overall.recommendations.length > 0) {
            console.log('\n💡 Recomendações:');
            validation.overall.recommendations.forEach(rec => console.log(`   • ${rec}`));
        }
        
        console.log('\n✅ Validação concluída');
    }
    
    // Função auxiliar para obter dados globais
    function getGlobalData(globalVar) {
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
            
            return current;
        } catch (error) {
            return null;
        }
    }
    
    // Executar validação automaticamente após carregamento
    setTimeout(() => {
        console.log('🔄 Executando validação automática...');
        const result = validateSystemFunctionality();
        
        // Armazenar resultado para acesso posterior
        window.lastValidationResult = result;
        
        // Mostrar toast se disponível
        if (typeof window.toast === 'function') {
            const percentage = (result.overall.score / result.overall.maxScore) * 100;
            
            if (percentage >= 90) {
                window.toast('Sistema validado: Funcionando perfeitamente!', 'success', 4000);
            } else if (percentage >= 75) {
                window.toast('Sistema validado: Funcionando bem', 'success', 4000);
            } else if (percentage >= 50) {
                window.toast('Sistema validado: Funcionamento parcial', 'warning', 5000);
            } else {
                window.toast('Sistema validado: Problemas detectados', 'error', 6000);
            }
        }
        
    }, 5000); // Aguardar 5 segundos para tudo carregar
    
    // Exportar função para uso manual
    window.validateSystemFunctionality = validateSystemFunctionality;
    
    console.log('✅ Sistema de validação configurado');
    console.log('💡 Use window.validateSystemFunctionality() para executar validação manual');
    
})();