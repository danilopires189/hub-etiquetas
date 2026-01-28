/**
 * Verificação Completa das Tabelas do Supabase
 * Este script verifica se todas as tabelas necessárias foram criadas
 */

// Lista completa de tabelas necessárias para o sistema
const REQUIRED_TABLES = {
    // Tabelas principais do sistema
    'labels': {
        description: 'Registro de todas as gerações de etiquetas',
        required_columns: ['id', 'application_type', 'quantity', 'copies', 'created_at'],
        source_file: 'schema.sql'
    },
    'global_counter': {
        description: 'Contador global centralizado de etiquetas',
        required_columns: ['id', 'total_count', 'application_breakdown', 'last_updated', 'version'],
        source_file: 'schema.sql'
    },
    'user_sessions': {
        description: 'Sessões de usuário para rastreamento',
        required_columns: ['id', 'session_id', 'created_at', 'is_active'],
        source_file: 'schema.sql'
    },
    'application_stats': {
        description: 'Estatísticas agregadas por aplicação',
        required_columns: ['id', 'application_type', 'date', 'total_generations', 'total_labels'],
        source_file: 'schema.sql'
    },
    
    // Tabela de histórico (nova funcionalidade)
    'application_history': {
        description: 'Histórico de gerações por aplicação (localStorage + Supabase)',
        required_columns: ['id', 'application_type', 'quantity', 'copies', 'unique_key', 'created_at'],
        source_file: 'application-history-schema.sql'
    },
    
    // Tabela de resolução de conflitos
    'conflict_resolution_log': {
        description: 'Log de resoluções de conflito do sistema',
        required_columns: ['id', 'data_type', 'resolution_strategy', 'created_at'],
        source_file: 'conflict-resolution-functions.sql'
    }
};

// Funções necessárias no banco
const REQUIRED_FUNCTIONS = {
    'update_global_counter': {
        description: 'Atualiza contador global de forma thread-safe',
        parameters: ['increment_amount', 'app_type'],
        source_file: 'schema.sql'
    },
    'get_counter_stats': {
        description: 'Obtém estatísticas do contador global',
        parameters: [],
        source_file: 'schema.sql'
    },
    'register_label_generation': {
        description: 'Registra nova geração de etiquetas',
        parameters: ['p_application_type', 'p_quantity', 'p_copies'],
        source_file: 'schema.sql'
    },
    'migrate_global_counter': {
        description: 'Migra dados do localStorage para Supabase',
        parameters: ['p_total_count', 'p_application_breakdown'],
        source_file: 'schema.sql'
    },
    'apply_resolved_counter': {
        description: 'Aplica dados resolvidos após conflito',
        parameters: ['p_total_count', 'p_application_breakdown'],
        source_file: 'conflict-resolution-functions.sql'
    },
    'atomic_counter_update': {
        description: 'Atualização atômica com detecção de conflito',
        parameters: ['p_increment', 'p_app_type'],
        source_file: 'conflict-resolution-functions.sql'
    }
};

class DatabaseVerifier {
    constructor(supabaseClient) {
        this.supabase = supabaseClient;
        this.results = {
            tables: {},
            functions: {},
            summary: {
                total_tables: Object.keys(REQUIRED_TABLES).length,
                existing_tables: 0,
                missing_tables: 0,
                total_functions: Object.keys(REQUIRED_FUNCTIONS).length,
                existing_functions: 0,
                missing_functions: 0
            }
        };
    }
    
    /**
     * Verificar se uma tabela existe
     */
    async checkTableExists(tableName) {
        try {
            const { data, error } = await this.supabase
                .from('information_schema.tables')
                .select('table_name, table_schema')
                .eq('table_schema', 'public')
                .eq('table_name', tableName);
            
            if (error) {
                console.warn(`⚠️ Erro ao verificar tabela ${tableName}:`, error);
                return false;
            }
            
            return data && data.length > 0;
        } catch (error) {
            console.warn(`⚠️ Erro ao verificar tabela ${tableName}:`, error);
            return false;
        }
    }
    
    /**
     * Verificar colunas de uma tabela
     */
    async checkTableColumns(tableName, requiredColumns) {
        try {
            const { data, error } = await this.supabase
                .from('information_schema.columns')
                .select('column_name, data_type, is_nullable')
                .eq('table_schema', 'public')
                .eq('table_name', tableName);
            
            if (error) {
                console.warn(`⚠️ Erro ao verificar colunas de ${tableName}:`, error);
                return { exists: false, columns: [], missing: requiredColumns };
            }
            
            const existingColumns = data.map(col => col.column_name);
            const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));
            
            return {
                exists: true,
                columns: existingColumns,
                missing: missingColumns,
                details: data
            };
        } catch (error) {
            console.warn(`⚠️ Erro ao verificar colunas de ${tableName}:`, error);
            return { exists: false, columns: [], missing: requiredColumns };
        }
    }
    
    /**
     * Verificar se uma função existe
     */
    async checkFunctionExists(functionName) {
        try {
            const { data, error } = await this.supabase
                .from('information_schema.routines')
                .select('routine_name, routine_type')
                .eq('routine_schema', 'public')
                .eq('routine_name', functionName);
            
            if (error) {
                console.warn(`⚠️ Erro ao verificar função ${functionName}:`, error);
                return false;
            }
            
            return data && data.length > 0;
        } catch (error) {
            console.warn(`⚠️ Erro ao verificar função ${functionName}:`, error);
            return false;
        }
    }
    
    /**
     * Testar acesso básico a uma tabela
     */
    async testTableAccess(tableName) {
        try {
            const { data, error } = await this.supabase
                .from(tableName)
                .select('*')
                .limit(1);
            
            if (error) {
                return { accessible: false, error: error.message };
            }
            
            return { accessible: true, sample_count: data ? data.length : 0 };
        } catch (error) {
            return { accessible: false, error: error.message };
        }
    }
    
    /**
     * Verificar todas as tabelas
     */
    async verifyAllTables() {
        console.log('🔍 Verificando tabelas do banco de dados...');
        
        for (const [tableName, tableInfo] of Object.entries(REQUIRED_TABLES)) {
            console.log(`\n📋 Verificando tabela: ${tableName}`);
            
            // Verificar se existe
            const exists = await this.checkTableExists(tableName);
            
            if (exists) {
                console.log(`✅ Tabela ${tableName} existe`);
                this.results.summary.existing_tables++;
                
                // Verificar colunas
                const columnCheck = await this.checkTableColumns(tableName, tableInfo.required_columns);
                
                // Testar acesso
                const accessTest = await this.testTableAccess(tableName);
                
                this.results.tables[tableName] = {
                    exists: true,
                    description: tableInfo.description,
                    source_file: tableInfo.source_file,
                    columns: columnCheck,
                    access: accessTest,
                    status: columnCheck.missing.length === 0 && accessTest.accessible ? 'OK' : 'ISSUES'
                };
                
                if (columnCheck.missing.length > 0) {
                    console.log(`⚠️ Colunas ausentes em ${tableName}:`, columnCheck.missing);
                }
                
                if (!accessTest.accessible) {
                    console.log(`❌ Erro de acesso à tabela ${tableName}:`, accessTest.error);
                }
                
            } else {
                console.log(`❌ Tabela ${tableName} NÃO existe`);
                this.results.summary.missing_tables++;
                
                this.results.tables[tableName] = {
                    exists: false,
                    description: tableInfo.description,
                    source_file: tableInfo.source_file,
                    status: 'MISSING'
                };
            }
        }
    }
    
    /**
     * Verificar todas as funções
     */
    async verifyAllFunctions() {
        console.log('\n🔧 Verificando funções do banco de dados...');
        
        for (const [functionName, functionInfo] of Object.entries(REQUIRED_FUNCTIONS)) {
            console.log(`\n⚙️ Verificando função: ${functionName}`);
            
            const exists = await this.checkFunctionExists(functionName);
            
            if (exists) {
                console.log(`✅ Função ${functionName} existe`);
                this.results.summary.existing_functions++;
                
                this.results.functions[functionName] = {
                    exists: true,
                    description: functionInfo.description,
                    parameters: functionInfo.parameters,
                    source_file: functionInfo.source_file,
                    status: 'OK'
                };
            } else {
                console.log(`❌ Função ${functionName} NÃO existe`);
                this.results.summary.missing_functions++;
                
                this.results.functions[functionName] = {
                    exists: false,
                    description: functionInfo.description,
                    parameters: functionInfo.parameters,
                    source_file: functionInfo.source_file,
                    status: 'MISSING'
                };
            }
        }
    }
    
    /**
     * Executar verificação completa
     */
    async runCompleteVerification() {
        console.log('🚀 Iniciando verificação completa do banco de dados Supabase...');
        console.log('=' .repeat(60));
        
        const startTime = Date.now();
        
        try {
            // Verificar tabelas
            await this.verifyAllTables();
            
            // Verificar funções
            await this.verifyAllFunctions();
            
            // Gerar relatório
            this.generateReport();
            
            const endTime = Date.now();
            console.log(`\n⏱️ Verificação concluída em ${endTime - startTime}ms`);
            
            return this.results;
            
        } catch (error) {
            console.error('❌ Erro durante verificação:', error);
            throw error;
        }
    }
    
    /**
     * Gerar relatório final
     */
    generateReport() {
        console.log('\n' + '='.repeat(60));
        console.log('📊 RELATÓRIO FINAL DA VERIFICAÇÃO');
        console.log('='.repeat(60));
        
        const { summary } = this.results;
        
        // Resumo das tabelas
        console.log('\n📋 TABELAS:');
        console.log(`   Total necessárias: ${summary.total_tables}`);
        console.log(`   ✅ Existentes: ${summary.existing_tables}`);
        console.log(`   ❌ Ausentes: ${summary.missing_tables}`);
        
        // Resumo das funções
        console.log('\n⚙️ FUNÇÕES:');
        console.log(`   Total necessárias: ${summary.total_functions}`);
        console.log(`   ✅ Existentes: ${summary.existing_functions}`);
        console.log(`   ❌ Ausentes: ${summary.missing_functions}`);
        
        // Status geral
        const allTablesOK = summary.missing_tables === 0;
        const allFunctionsOK = summary.missing_functions === 0;
        const systemReady = allTablesOK && allFunctionsOK;
        
        console.log('\n🎯 STATUS GERAL:');
        if (systemReady) {
            console.log('   🎉 SISTEMA COMPLETO - Todas as tabelas e funções estão presentes!');
        } else {
            console.log('   ⚠️ SISTEMA INCOMPLETO - Algumas tabelas/funções estão ausentes');
            
            if (!allTablesOK) {
                console.log('\n❌ TABELAS AUSENTES:');
                Object.entries(this.results.tables).forEach(([name, info]) => {
                    if (!info.exists) {
                        console.log(`   - ${name} (arquivo: ${info.source_file})`);
                    }
                });
            }
            
            if (!allFunctionsOK) {
                console.log('\n❌ FUNÇÕES AUSENTES:');
                Object.entries(this.results.functions).forEach(([name, info]) => {
                    if (!info.exists) {
                        console.log(`   - ${name} (arquivo: ${info.source_file})`);
                    }
                });
            }
            
            console.log('\n📝 AÇÕES NECESSÁRIAS:');
            console.log('   1. Execute os arquivos SQL ausentes no painel do Supabase');
            console.log('   2. Verifique as permissões de acesso às tabelas');
            console.log('   3. Execute esta verificação novamente');
        }
        
        console.log('\n📁 ARQUIVOS SQL NECESSÁRIOS:');
        console.log('   - supabase/schema.sql (tabelas principais + funções)');
        console.log('   - supabase/application-history-schema.sql (histórico)');
        console.log('   - supabase/conflict-resolution-functions.sql (resolução de conflitos)');
        
        console.log('\n🔗 LINKS ÚTEIS:');
        console.log('   - Painel Supabase: https://supabase.com/dashboard');
        console.log('   - SQL Editor: https://supabase.com/dashboard/project/[PROJECT_ID]/sql');
        console.log('   - Documentação: https://supabase.com/docs');
    }
    
    /**
     * Gerar relatório em formato JSON
     */
    getJSONReport() {
        return {
            timestamp: new Date().toISOString(),
            system_status: this.results.summary.missing_tables === 0 && this.results.summary.missing_functions === 0 ? 'COMPLETE' : 'INCOMPLETE',
            ...this.results
        };
    }
}

// Função principal para verificação
async function verifySupabaseTables(supabaseClient) {
    if (!supabaseClient) {
        console.error('❌ Cliente Supabase não fornecido');
        return null;
    }
    
    const verifier = new DatabaseVerifier(supabaseClient);
    return await verifier.runCompleteVerification();
}

// Exportar para uso
if (typeof window !== 'undefined') {
    // Navegador
    window.DatabaseVerifier = DatabaseVerifier;
    window.verifySupabaseTables = verifySupabaseTables;
    window.REQUIRED_TABLES = REQUIRED_TABLES;
    window.REQUIRED_FUNCTIONS = REQUIRED_FUNCTIONS;
    
    console.log('🔍 Verificador de banco disponível:');
    console.log('   - verifySupabaseTables(supabaseClient)');
    console.log('   - new DatabaseVerifier(supabaseClient)');
} else {
    // Node.js
    module.exports = {
        DatabaseVerifier,
        verifySupabaseTables,
        REQUIRED_TABLES,
        REQUIRED_FUNCTIONS
    };
}

export { DatabaseVerifier, verifySupabaseTables, REQUIRED_TABLES, REQUIRED_FUNCTIONS };