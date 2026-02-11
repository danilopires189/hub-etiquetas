/**
 * Validação Simples do Status do Sistema
 * Verifica se todos os arquivos e componentes estão presentes
 */

const fs = require('fs');
const path = require('path');

class SystemStatusValidator {
    constructor() {
        this.results = [];
        this.errors = [];
        
        console.log('🔍 Validando Status do Sistema Supabase Integration');
    }

    /**
     * Verifica se um arquivo existe
     */
    checkFileExists(filePath, description) {
        try {
            if (fs.existsSync(filePath)) {
                console.log(`✅ ${description}: ${filePath}`);
                this.results.push({ file: filePath, status: 'OK', description });
                return true;
            } else {
                console.log(`❌ ${description}: ${filePath} - NÃO ENCONTRADO`);
                this.results.push({ file: filePath, status: 'MISSING', description });
                this.errors.push(`${description}: ${filePath}`);
                return false;
            }
        } catch (error) {
            console.log(`❌ ${description}: ${filePath} - ERRO: ${error.message}`);
            this.results.push({ file: filePath, status: 'ERROR', description, error: error.message });
            this.errors.push(`${description}: ${error.message}`);
            return false;
        }
    }

    /**
     * Verifica conteúdo de um arquivo
     */
    checkFileContent(filePath, description, requiredContent = []) {
        try {
            if (!fs.existsSync(filePath)) {
                console.log(`❌ ${description}: ${filePath} - ARQUIVO NÃO ENCONTRADO`);
                return false;
            }

            const content = fs.readFileSync(filePath, 'utf8');
            
            if (requiredContent.length > 0) {
                const missingContent = requiredContent.filter(req => !content.includes(req));
                if (missingContent.length > 0) {
                    console.log(`⚠️  ${description}: ${filePath} - CONTEÚDO INCOMPLETO`);
                    console.log(`   Faltando: ${missingContent.join(', ')}`);
                    return false;
                }
            }

            console.log(`✅ ${description}: ${filePath} - CONTEÚDO OK`);
            return true;
        } catch (error) {
            console.log(`❌ ${description}: ${filePath} - ERRO: ${error.message}`);
            return false;
        }
    }

    /**
     * Executa validação completa
     */
    validateSystem() {
        console.log('\n📋 Verificando Arquivos do Sistema...\n');

        // 1. Configuração Supabase
        console.log('🔧 1. Configuração Supabase:');
        this.checkFileExists('supabase/config.js', 'Configuração Supabase');
        this.checkFileContent('supabase/config.js', 'Config - Credenciais', [
            'SUPABASE_CONFIG',
            'esaomlrwutuwqmztxsat.supabase.co',
            'anonKey'
        ]);

        // 2. Schema do Banco
        console.log('\n🗄️  2. Schema do Banco de Dados:');
        this.checkFileExists('supabase/schema.sql', 'Schema SQL');
        this.checkFileContent('supabase/schema.sql', 'Schema - Tabelas', [
            'CREATE TABLE labels',
            'CREATE TABLE global_counter',
            'CREATE TABLE user_sessions',
            'CREATE TABLE application_stats'
        ]);

        // 3. Cliente Supabase
        console.log('\n🔌 3. Cliente Supabase:');
        this.checkFileExists('supabase/client.js', 'Cliente Supabase');
        this.checkFileExists('supabase/auth.js', 'Sistema de Autenticação');
        this.checkFileExists('supabase/init.js', 'Inicialização');

        // 4. Sistema Offline
        console.log('\n📱 4. Sistema Offline:');
        this.checkFileExists('supabase/migration-manager.js', 'Gerenciador de Migração');
        this.checkFileExists('supabase/migration-integration.js', 'Integração de Migração');

        // 5. Painel Admin
        console.log('\n👨‍💼 5. Painel Administrativo:');
        this.checkFileExists('admin/dashboard.html', 'Dashboard Admin');
        this.checkFileExists('admin/login.html', 'Login Admin');

        // 6. Resolução de Conflitos
        console.log('\n🔄 6. Resolução de Conflitos:');
        this.checkFileExists('supabase/conflict-resolver.js', 'Resolvedor de Conflitos');
        this.checkFileExists('supabase/conflict-resolution-functions.sql', 'Funções SQL de Conflitos');

        // 7. Testes
        console.log('\n🧪 7. Arquivos de Teste:');
        this.checkFileExists('supabase/test-conflict-resolver.js', 'Teste de Conflitos');
        this.checkFileExists('supabase/final-validation.js', 'Validação Final');

        // 8. Integração com Módulos
        console.log('\n🔗 8. Integração com Módulos:');
        this.checkFileExists('js/contador-global-centralizado.js', 'Contador Global');
        this.checkFileContent('js/contador-global-centralizado.js', 'Contador - Integração Supabase', [
            'supabase'
        ]);

        // 9. Documentação
        console.log('\n📚 9. Documentação:');
        this.checkFileExists('supabase/README.md', 'README Principal');
        this.checkFileExists('supabase/final-configuration-summary.md', 'Resumo de Configuração');

        // Gerar relatório final
        return this.generateReport();
    }

    /**
     * Gera relatório final
     */
    generateReport() {
        const total = this.results.length;
        const ok = this.results.filter(r => r.status === 'OK').length;
        const missing = this.results.filter(r => r.status === 'MISSING').length;
        const errors = this.results.filter(r => r.status === 'ERROR').length;
        
        console.log('\n' + '='.repeat(60));
        console.log('📋 RELATÓRIO FINAL DE VALIDAÇÃO');
        console.log('='.repeat(60));
        
        console.log(`📊 Estatísticas:`);
        console.log(`   Total de verificações: ${total}`);
        console.log(`   ✅ Arquivos OK: ${ok}`);
        console.log(`   ❌ Arquivos faltando: ${missing}`);
        console.log(`   💥 Erros: ${errors}`);
        
        const successRate = ((ok / total) * 100).toFixed(1);
        console.log(`   📈 Taxa de sucesso: ${successRate}%`);
        
        if (this.errors.length > 0) {
            console.log(`\n❌ Problemas encontrados:`);
            this.errors.forEach((error, i) => {
                console.log(`   ${i + 1}. ${error}`);
            });
        }
        
        console.log('\n🎯 Status Geral:');
        if (ok === total) {
            console.log('   ✅ SISTEMA COMPLETO - Todos os arquivos presentes');
            console.log('   🚀 PRONTO PARA PRODUÇÃO');
        } else if (successRate >= 90) {
            console.log('   ⚠️  SISTEMA QUASE COMPLETO - Alguns arquivos faltando');
            console.log('   🔧 REQUER PEQUENOS AJUSTES');
        } else {
            console.log('   ❌ SISTEMA INCOMPLETO - Muitos arquivos faltando');
            console.log('   🚧 REQUER IMPLEMENTAÇÃO ADICIONAL');
        }
        
        console.log('\n📅 Validação executada em:', new Date().toLocaleString('pt-BR'));
        console.log('='.repeat(60));
        
        return {
            total,
            ok,
            missing,
            errors,
            successRate: parseFloat(successRate),
            status: ok === total ? 'COMPLETO' : successRate >= 90 ? 'QUASE_COMPLETO' : 'INCOMPLETO'
        };
    }
}

// Executar validação
if (require.main === module) {
    const validator = new SystemStatusValidator();
    try {
        const report = validator.validateSystem();
        
        // Exit code baseado no resultado
        if (report && report.status === 'COMPLETO') {
            process.exit(0);
        } else if (report && report.status === 'QUASE_COMPLETO') {
            process.exit(1);
        } else {
            process.exit(2);
        }
    } catch (error) {
        console.error('❌ Erro na validação:', error.message);
        process.exit(3);
    }
}

module.exports = { SystemStatusValidator };
