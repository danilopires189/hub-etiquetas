/**
 * Script para configurar a tabela application_history no Supabase
 * Execute este script para criar a estrutura necessária para o histórico
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_CONFIG } from './config.js';

// Criar cliente Supabase com service role key para operações administrativas
const supabase = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.serviceRoleKey);

/**
 * SQL para criar a tabela application_history
 */
const CREATE_TABLE_SQL = `
-- Tabela para armazenar histórico de gerações de etiquetas por aplicação
CREATE TABLE IF NOT EXISTS application_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_type VARCHAR(50) NOT NULL,
    
    -- Dados específicos da geração
    base_number VARCHAR(20),
    quantity INTEGER NOT NULL,
    copies INTEGER NOT NULL,
    label_type VARCHAR(20),
    orientation VARCHAR(10),
    ultimo_numero VARCHAR(20),
    proximo_numero VARCHAR(20),
    total_labels INTEGER,
    
    -- Dados específicos do termo (termolábeis)
    etiqueta_id VARCHAR(50),
    pedido VARCHAR(20),
    data_pedido VARCHAR(20),
    loja VARCHAR(100),
    rota VARCHAR(100),
    qtd_volumes INTEGER,
    matricula VARCHAR(20),
    data_separacao VARCHAR(20),
    hora_separacao VARCHAR(20),
    
    -- Metadados
    user_session_id UUID,
    metadata JSONB DEFAULT '{}',
    
    -- Controle de sincronização
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    local_id VARCHAR(255), -- Para mapear com IDs locais do browser
    unique_key VARCHAR(255), -- Chave única para deduplicação
    
    -- Índices para performance
    CONSTRAINT application_history_unique_key UNIQUE (application_type, unique_key)
);
`;

/**
 * SQL para criar índices
 */
const CREATE_INDEXES_SQL = `
-- Índices para otimização de consultas
CREATE INDEX IF NOT EXISTS idx_application_history_type ON application_history(application_type);
CREATE INDEX IF NOT EXISTS idx_application_history_created_at ON application_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_application_history_local_id ON application_history(local_id);
CREATE INDEX IF NOT EXISTS idx_application_history_unique_key ON application_history(unique_key);
CREATE INDEX IF NOT EXISTS idx_application_history_etiqueta_id ON application_history(etiqueta_id);
CREATE INDEX IF NOT EXISTS idx_application_history_pedido ON application_history(pedido);
`;

/**
 * SQL para configurar RLS (Row Level Security)
 */
const SETUP_RLS_SQL = `
-- RLS (Row Level Security) - permitir acesso público para leitura/escrita
ALTER TABLE application_history ENABLE ROW LEVEL SECURITY;

-- Política para permitir inserção e leitura para usuários anônimos
DROP POLICY IF EXISTS "Allow anonymous access to application_history" ON application_history;
CREATE POLICY "Allow anonymous access to application_history" 
ON application_history FOR ALL 
TO anon 
USING (true) 
WITH CHECK (true);

-- Política para usuários autenticados
DROP POLICY IF EXISTS "Allow authenticated access to application_history" ON application_history;
CREATE POLICY "Allow authenticated access to application_history" 
ON application_history FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);
`;

/**
 * Função principal para configurar a tabela
 */
async function setupApplicationHistory() {
    console.log('🔄 Configurando tabela application_history no Supabase...');
    
    try {
        // 1. Criar tabela
        console.log('📋 Criando tabela application_history...');
        const { error: tableError } = await supabase.rpc('exec_sql', { 
            sql: CREATE_TABLE_SQL 
        });
        
        if (tableError) {
            console.error('❌ Erro ao criar tabela:', tableError);
            return false;
        }
        
        console.log('✅ Tabela application_history criada com sucesso');
        
        // 2. Criar índices
        console.log('📊 Criando índices...');
        const { error: indexError } = await supabase.rpc('exec_sql', { 
            sql: CREATE_INDEXES_SQL 
        });
        
        if (indexError) {
            console.warn('⚠️ Aviso ao criar índices:', indexError);
            // Não é crítico, continuar
        } else {
            console.log('✅ Índices criados com sucesso');
        }
        
        // 3. Configurar RLS
        console.log('🔒 Configurando Row Level Security...');
        const { error: rlsError } = await supabase.rpc('exec_sql', { 
            sql: SETUP_RLS_SQL 
        });
        
        if (rlsError) {
            console.warn('⚠️ Aviso ao configurar RLS:', rlsError);
            // Não é crítico, continuar
        } else {
            console.log('✅ RLS configurado com sucesso');
        }
        
        // 4. Testar inserção
        console.log('🧪 Testando inserção na tabela...');
        const testEntry = {
            application_type: 'test',
            quantity: 1,
            copies: 1,
            unique_key: `test-${Date.now()}`,
            metadata: { test: true }
        };
        
        const { data: insertData, error: insertError } = await supabase
            .from('application_history')
            .insert(testEntry)
            .select();
        
        if (insertError) {
            console.error('❌ Erro no teste de inserção:', insertError);
            return false;
        }
        
        console.log('✅ Teste de inserção bem-sucedido:', insertData);
        
        // 5. Limpar teste
        if (insertData && insertData[0]) {
            await supabase
                .from('application_history')
                .delete()
                .eq('id', insertData[0].id);
            console.log('🧹 Dados de teste removidos');
        }
        
        console.log('🎉 Configuração da tabela application_history concluída com sucesso!');
        return true;
        
    } catch (error) {
        console.error('❌ Erro durante a configuração:', error);
        return false;
    }
}

/**
 * Função alternativa usando SQL direto (caso rpc não funcione)
 */
async function setupApplicationHistoryDirect() {
    console.log('🔄 Configurando tabela application_history (método direto)...');
    
    try {
        // Verificar se a tabela já existe
        const { data: tables, error: checkError } = await supabase
            .from('information_schema.tables')
            .select('table_name')
            .eq('table_schema', 'public')
            .eq('table_name', 'application_history');
        
        if (checkError) {
            console.warn('⚠️ Não foi possível verificar tabelas existentes:', checkError);
        }
        
        if (tables && tables.length > 0) {
            console.log('ℹ️ Tabela application_history já existe');
        } else {
            console.log('📋 Tabela application_history não existe, será necessário criar manualmente');
            console.log('📝 Execute o SQL do arquivo application-history-schema.sql no painel do Supabase');
        }
        
        // Testar acesso à tabela
        const { data: testData, error: testError } = await supabase
            .from('application_history')
            .select('count(*)')
            .limit(1);
        
        if (testError) {
            console.error('❌ Erro ao acessar tabela application_history:', testError);
            console.log('📝 Execute o SQL do arquivo application-history-schema.sql no painel do Supabase');
            return false;
        }
        
        console.log('✅ Tabela application_history acessível');
        return true;
        
    } catch (error) {
        console.error('❌ Erro durante verificação:', error);
        return false;
    }
}

// Executar configuração se chamado diretamente
if (typeof window !== 'undefined') {
    // Executar no navegador
    window.setupApplicationHistory = setupApplicationHistory;
    window.setupApplicationHistoryDirect = setupApplicationHistoryDirect;
    console.log('🔧 Funções de configuração disponíveis: setupApplicationHistory(), setupApplicationHistoryDirect()');
} else {
    // Executar no Node.js
    setupApplicationHistory().then(success => {
        if (!success) {
            console.log('🔄 Tentando método alternativo...');
            return setupApplicationHistoryDirect();
        }
        return success;
    }).then(success => {
        process.exit(success ? 0 : 1);
    });
}

export { setupApplicationHistory, setupApplicationHistoryDirect };