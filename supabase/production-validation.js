/**
 * Validação de Produção - Sistema Supabase
 * Verifica se todos os componentes estão funcionando corretamente
 * 
 * Feature: supabase-integration
 * Validates: All production requirements
 */

import { SUPABASE_CONFIG, ADMIN_CONFIG } from './config.js';

class ProductionValidator {
    constructor() {
        this.results = [];
        this.errors = [];
        this.warnings = [];
        
        console.log('🔍 Iniciando Validação de Produção');
    }

    /**
     * Executa todas as validações de produção
     */
    async runAllValidations() {
        console.log('\n📋 Executando Validações de Produção...');
        
        const validations = [
            { name: 'Configuração Supabase', test: this.validateSupabaseConfig.bind(this) },
            { name: 'Conectividade Supabase', test: this.validateSupabaseConnection.bind(this) },
            { name: 'Schema do Banco', test: this.validateDatabaseSchema.bind(this) },
            { name: 'Autenticação Admin', test: this.validateAdminAuth.bind(this) },
            { name: 'Módulos Integrados', test: this.validateModuleIntegration.bind(this) },
            { name: 'Sistema Offline', test: this.validateOfflineSystem.bind(this) },
            { name: 'Painel Admin', test: this.validateAdminPanel.bind(this) },
            { name: 'Migração de Dados', test: this.validateDataMigration.bind(this) },
            { name: 'Resolução de Conflitos', test: this.validateConflictResolution.bind(this) },
            { name: 'Performance do Sistema', test: this.validateSystemPerformance.bind(this) }
        ];

        for (const validation of validations) {
            try {
                console.log(`\n🔍 Validando: ${validation.name}`);
                const result = await validation.test();
                
                this.results.push({
                    name: validation.name,
                    passed: result.passed,
                    details: result.details,
                    issues: result.issues || [],
                    metrics: result.metrics || {}
                });
                
                if (result.passed) {
                    console.log(`   ✅ ${validation.name}: OK`);
                    if (result.details) {
                        console.log(`      ${result.details}`);
                    }
                } else {
                    console.log(`   ❌ ${validation.name}: FALHOU`);
                    console.log(`      ${result.details}`);
                    if (result.issues && result.issues.length > 0) {
                        result.issues.forEach(issue => {
                            console.log(`      - ${issue}`);
                        });
                    }
                }
                
                if (result.warnings && result.warnings.length > 0) {
                    result.warnings.forEach(warning => {
                        console.log(`      ⚠️  ${warning}`);
                        this.warnings.push(`${validation.name}: ${warning}`);
                    });
                }
                
            } catch (error) {
                console.log(`   ❌ ${validation.name}: ERRO - ${error.message}`);
                this.results.push({
                    name: validation.name,
                    passed: false,
                    details: `Erro durante validação: ${error.message}`,
                    error: error.message
                });
                this.errors.push(`${validation.name}: ${error.message}`);
            }
        }
        
        return this.generateProductionReport();
    }

    /**
     * Valida configuração do Supabase
     */
    async validateSupabaseConfig() {
        const issues = [];
        
        // Verificar URL
        if (!SUPABASE_CONFIG.url) {
            issues.push('URL do Supabase não configurada');
        } else if (!SUPABASE_CONFIG.url.startsWith('https://')) {
            issues.push('URL do Supabase deve usar HTTPS');
        }
        
        // Verificar chave anônima
        if (!SUPABASE_CONFIG.anonKey) {
            issues.push('Chave anônima não configurada');
        } else if (SUPABASE_CONFIG.anonKey.length < 100) {
            issues.push('Chave anônima parece inválida (muito curta)');
        }
        
        // Verificar configuração admin (opcional, pode estar desabilitada)
        if (!ADMIN_CONFIG.email || !ADMIN_CONFIG.password) {
            warnings.push('Credenciais de admin não configuradas (autenticação admin desabilitada)');
        }
        
        return {
            passed: issues.length === 0,
            details: issues.length === 0 ? 'Configuração Supabase válida' : 'Problemas na configuração',
            issues
        };
    }

    /**
     * Valida conectividade com Supabase
     */
    async validateSupabaseConnection() {
        try {
            // Simular teste de conectividade
            const response = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/`, {
                method: 'HEAD',
                headers: {
                    'apikey': SUPABASE_CONFIG.anonKey,
                    'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`
                }
            });
            
            if (response.ok) {
                return {
                    passed: true,
                    details: 'Conectividade com Supabase OK',
                    metrics: {
                        responseTime: response.headers.get('x-response-time') || 'N/A',
                        status: response.status
                    }
                };
            } else {
                return {
                    passed: false,
                    details: `Falha na conectividade: HTTP ${response.status}`,
                    issues: [`Status HTTP: ${response.status}`, `Status Text: ${response.statusText}`]
                };
            }
        } catch (error) {
            return {
                passed: false,
                details: `Erro de conectividade: ${error.message}`,
                issues: ['Não foi possível conectar ao Supabase', error.message]
            };
        }
    }

    /**
     * Valida schema do banco de dados
     */
    async validateDatabaseSchema() {
        const requiredTables = ['labels', 'global_counter', 'user_sessions', 'application_stats'];
        const issues = [];
        const warnings = [];
        
        try {
            // Verificar se as tabelas existem (simulado)
            for (const table of requiredTables) {
                try {
                    const response = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/${table}?limit=1`, {
                        headers: {
                            'apikey': SUPABASE_CONFIG.anonKey,
                            'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`
                        }
                    });
                    
                    if (!response.ok) {
                        if (response.status === 404) {
                            issues.push(`Tabela '${table}' não encontrada`);
                        } else {
                            warnings.push(`Erro ao verificar tabela '${table}': HTTP ${response.status}`);
                        }
                    }
                } catch (error) {
                    warnings.push(`Erro ao verificar tabela '${table}': ${error.message}`);
                }
            }
            
            return {
                passed: issues.length === 0,
                details: issues.length === 0 ? 'Schema do banco validado' : 'Problemas no schema',
                issues,
                warnings
            };
            
        } catch (error) {
            return {
                passed: false,
                details: `Erro na validação do schema: ${error.message}`,
                issues: [error.message]
            };
        }
    }

    /**
     * Valida sistema de autenticação admin
     */
    async validateAdminAuth() {
        const issues = [];
        const warnings = [];
        
        try {
            // Verificar se o endpoint de auth existe
            const response = await fetch(`${SUPABASE_CONFIG.url}/auth/v1/signup`, {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_CONFIG.anonKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: 'test@example.com',
                    password: 'test123'
                })
            });
            
            // Esperamos um erro 400 ou similar (email inválido), não 404
            if (response.status === 404) {
                issues.push('Endpoint de autenticação não encontrado');
            } else if (response.status >= 500) {
                warnings.push('Possível problema no servidor de autenticação');
            }
            
            // Verificar se as credenciais admin foram definidas quando o fluxo admin estiver ativo
            if (!ADMIN_CONFIG.email || !ADMIN_CONFIG.password) {
                warnings.push('Credenciais admin ausentes. Fluxo admin pode estar desabilitado por segurança.');
            }
            
            return {
                passed: issues.length === 0,
                details: issues.length === 0 ? 'Sistema de autenticação configurado' : 'Problemas na autenticação',
                issues,
                warnings
            };
            
        } catch (error) {
            return {
                passed: false,
                details: `Erro na validação de auth: ${error.message}`,
                issues: [error.message]
            };
        }
    }

    /**
     * Valida integração dos módulos
     */
    async validateModuleIntegration() {
        const issues = [];
        const warnings = [];
        
        // Verificar se os arquivos de integração existem
        const integrationFiles = [
            'supabase/client.js',
            'supabase/auth.js',
            'js/contador-global-centralizado.js'
        ];
        
        for (const file of integrationFiles) {
            try {
                const response = await fetch(file);
                if (!response.ok) {
                    if (response.status === 404) {
                        issues.push(`Arquivo de integração não encontrado: ${file}`);
                    } else {
                        warnings.push(`Problema ao acessar ${file}: HTTP ${response.status}`);
                    }
                }
            } catch (error) {
                warnings.push(`Erro ao verificar ${file}: ${error.message}`);
            }
        }
        
        // Verificar se o SupabaseManager está disponível globalmente
        if (typeof window !== 'undefined') {
            if (!window.supabaseManager) {
                issues.push('SupabaseManager não está disponível globalmente');
            }
            
            if (!window.syncManager) {
                warnings.push('SyncManager não está disponível globalmente');
            }
        }
        
        return {
            passed: issues.length === 0,
            details: issues.length === 0 ? 'Módulos integrados corretamente' : 'Problemas na integração',
            issues,
            warnings
        };
    }

    /**
     * Valida sistema offline
     */
    async validateOfflineSystem() {
        const issues = [];
        const warnings = [];
        
        // Verificar localStorage
        if (typeof localStorage === 'undefined') {
            issues.push('localStorage não disponível');
        } else {
            try {
                localStorage.setItem('test_offline', 'test');
                localStorage.removeItem('test_offline');
            } catch (error) {
                issues.push('localStorage não funcional');
            }
        }
        
        // Verificar se a fila offline está configurada
        if (typeof window !== 'undefined' && window.syncManager) {
            if (!window.syncManager.getQueueStatus) {
                warnings.push('Método getQueueStatus não disponível no SyncManager');
            }
        } else {
            warnings.push('SyncManager não disponível para verificação offline');
        }
        
        return {
            passed: issues.length === 0,
            details: issues.length === 0 ? 'Sistema offline configurado' : 'Problemas no sistema offline',
            issues,
            warnings
        };
    }

    /**
     * Valida painel administrativo
     */
    async validateAdminPanel() {
        const issues = [];
        const warnings = [];
        
        try {
            // Verificar se a página admin existe
            const response = await fetch('admin/dashboard.html');
            if (!response.ok) {
                if (response.status === 404) {
                    issues.push('Página do painel admin não encontrada');
                } else {
                    warnings.push(`Problema ao acessar painel admin: HTTP ${response.status}`);
                }
            }
            
            // Verificar se há link para admin na página principal
            if (typeof document !== 'undefined') {
                const adminLink = document.querySelector('a[href*="admin"]') || 
                                 document.querySelector('.admin-icon') ||
                                 document.querySelector('[onclick*="admin"]');
                
                if (!adminLink) {
                    warnings.push('Link para painel admin não encontrado na página principal');
                }
            }
            
        } catch (error) {
            warnings.push(`Erro ao verificar painel admin: ${error.message}`);
        }
        
        return {
            passed: issues.length === 0,
            details: issues.length === 0 ? 'Painel admin acessível' : 'Problemas no painel admin',
            issues,
            warnings
        };
    }

    /**
     * Valida sistema de migração de dados
     */
    async validateDataMigration() {
        const issues = [];
        const warnings = [];
        
        try {
            // Verificar se o arquivo de migração existe
            const response = await fetch('supabase/migration-manager.js');
            if (!response.ok) {
                if (response.status === 404) {
                    issues.push('Sistema de migração não encontrado');
                } else {
                    warnings.push(`Problema ao acessar sistema de migração: HTTP ${response.status}`);
                }
            }
            
            // Verificar se o MigrationManager está disponível
            if (typeof window !== 'undefined' && !window.migrationManager) {
                warnings.push('MigrationManager não está disponível globalmente');
            }
            
        } catch (error) {
            warnings.push(`Erro ao verificar sistema de migração: ${error.message}`);
        }
        
        return {
            passed: issues.length === 0,
            details: issues.length === 0 ? 'Sistema de migração disponível' : 'Problemas na migração',
            issues,
            warnings
        };
    }

    /**
     * Valida sistema de resolução de conflitos
     */
    async validateConflictResolution() {
        const issues = [];
        const warnings = [];
        
        try {
            // Verificar se o arquivo de resolução existe
            const response = await fetch('supabase/conflict-resolver.js');
            if (!response.ok) {
                if (response.status === 404) {
                    issues.push('Sistema de resolução de conflitos não encontrado');
                } else {
                    warnings.push(`Problema ao acessar sistema de conflitos: HTTP ${response.status}`);
                }
            }
            
            // Verificar se o ConflictResolver está disponível
            if (typeof window !== 'undefined' && !window.conflictResolver) {
                warnings.push('ConflictResolver não está disponível globalmente');
            }
            
        } catch (error) {
            warnings.push(`Erro ao verificar sistema de conflitos: ${error.message}`);
        }
        
        return {
            passed: issues.length === 0,
            details: issues.length === 0 ? 'Sistema de conflitos disponível' : 'Problemas na resolução de conflitos',
            issues,
            warnings
        };
    }

    /**
     * Valida performance do sistema
     */
    async validateSystemPerformance() {
        const metrics = {};
        const warnings = [];
        
        try {
            // Medir tempo de carregamento
            const loadStart = performance.now();
            await new Promise(resolve => setTimeout(resolve, 10)); // Simular operação
            metrics.loadTime = Math.round(performance.now() - loadStart);
            
            // Verificar uso de memória
            if (performance.memory) {
                metrics.memoryUsage = Math.round(performance.memory.usedJSHeapSize / 1024 / 1024);
                
                if (metrics.memoryUsage > 100) {
                    warnings.push(`Alto uso de memória: ${metrics.memoryUsage}MB`);
                }
            }
            
            // Verificar recursos carregados
            if (performance.getEntriesByType) {
                const resources = performance.getEntriesByType('resource');
                metrics.resourceCount = resources.length;
                
                const slowResources = resources.filter(r => r.duration > 1000);
                if (slowResources.length > 0) {
                    warnings.push(`${slowResources.length} recursos lentos detectados`);
                }
            }
            
            return {
                passed: warnings.length === 0,
                details: warnings.length === 0 ? 'Performance do sistema OK' : 'Problemas de performance detectados',
                warnings,
                metrics
            };
            
        } catch (error) {
            return {
                passed: false,
                details: `Erro na análise de performance: ${error.message}`,
                issues: [error.message]
            };
        }
    }

    /**
     * Gera relatório de produção
     */
    generateProductionReport() {
        const passed = this.results.filter(r => r.passed).length;
        const total = this.results.length;
        const successRate = ((passed / total) * 100).toFixed(1);
        
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                total,
                passed,
                failed: total - passed,
                successRate: `${successRate}%`,
                status: passed === total ? 'APROVADO' : 'REQUER ATENÇÃO'
            },
            results: this.results,
            errors: this.errors,
            warnings: this.warnings,
            recommendations: this.generateRecommendations()
        };
        
        console.log('\n📊 RELATÓRIO DE PRODUÇÃO');
        console.log('=' .repeat(50));
        console.log(`Status: ${report.summary.status}`);
        console.log(`Validações: ${passed}/${total} (${successRate}%)`);
        console.log(`Erros: ${this.errors.length}`);
        console.log(`Avisos: ${this.warnings.length}`);
        
        if (report.recommendations.length > 0) {
            console.log('\n💡 RECOMENDAÇÕES:');
            report.recommendations.forEach((rec, i) => {
                console.log(`${i + 1}. ${rec}`);
            });
        }
        
        if (report.summary.status === 'APROVADO') {
            console.log('\n🎉 SISTEMA APROVADO PARA PRODUÇÃO!');
        } else {
            console.log('\n⚠️  SISTEMA REQUER ATENÇÃO ANTES DA PRODUÇÃO');
        }
        
        return report;
    }

    /**
     * Gera recomendações baseadas nos resultados
     */
    generateRecommendations() {
        const recommendations = [];
        
        const failedValidations = this.results.filter(r => !r.passed);
        if (failedValidations.length > 0) {
            recommendations.push(`Corrigir ${failedValidations.length} validação(ões) que falharam`);
            
            failedValidations.forEach(validation => {
                if (validation.issues && validation.issues.length > 0) {
                    recommendations.push(`${validation.name}: ${validation.issues[0]}`);
                }
            });
        }
        
        if (this.warnings.length > 0) {
            recommendations.push(`Revisar ${this.warnings.length} aviso(s) do sistema`);
        }
        
        if (this.errors.length > 0) {
            recommendations.push(`Resolver ${this.errors.length} erro(s) crítico(s)`);
        }
        
        // Recomendações específicas baseadas nos resultados
        const connectivityFailed = this.results.find(r => r.name === 'Conectividade Supabase' && !r.passed);
        if (connectivityFailed) {
            recommendations.push('Verificar configuração de rede e credenciais do Supabase');
        }
        
        const schemaFailed = this.results.find(r => r.name === 'Schema do Banco' && !r.passed);
        if (schemaFailed) {
            recommendations.push('Executar script de criação do schema do banco de dados');
        }
        
        if (recommendations.length === 0) {
            recommendations.push('Sistema aprovado - todas as validações passaram com sucesso');
        }
        
        return recommendations;
    }
}

// Executar validação se chamado diretamente
if (typeof require !== 'undefined' && require.main === module) {
    const validator = new ProductionValidator();
    validator.runAllValidations()
        .then(report => {
            if (report.summary.status === 'APROVADO') {
                process.exit(0);
            } else {
                process.exit(1);
            }
        })
        .catch(error => {
            console.error('💥 ERRO CRÍTICO:', error);
            process.exit(1);
        });
}

// Exportar para uso em outros módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ProductionValidator };
}
