-- Schema para histórico de aplicações
-- Este arquivo define a estrutura da tabela application_history no Supabase

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
    CONSTRAINT application_history_unique_key UNIQUE (application_type, unique_key),
    FOREIGN KEY (user_session_id) REFERENCES user_sessions(id) ON DELETE SET NULL
);

-- Índices para otimização de consultas
CREATE INDEX IF NOT EXISTS idx_application_history_type ON application_history(application_type);
CREATE INDEX IF NOT EXISTS idx_application_history_created_at ON application_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_application_history_local_id ON application_history(local_id);
CREATE INDEX IF NOT EXISTS idx_application_history_unique_key ON application_history(unique_key);
CREATE INDEX IF NOT EXISTS idx_application_history_etiqueta_id ON application_history(etiqueta_id);
CREATE INDEX IF NOT EXISTS idx_application_history_pedido ON application_history(pedido);

-- RLS (Row Level Security) - permitir acesso público para leitura/escrita
-- Em produção, você pode querer restringir isso
ALTER TABLE application_history ENABLE ROW LEVEL SECURITY;

-- Política para permitir inserção e leitura para usuários anônimos
CREATE POLICY IF NOT EXISTS "Allow anonymous access to application_history" 
ON application_history FOR ALL 
TO anon 
USING (true) 
WITH CHECK (true);

-- Política para usuários autenticados
CREATE POLICY IF NOT EXISTS "Allow authenticated access to application_history" 
ON application_history FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- Comentários para documentação
COMMENT ON TABLE application_history IS 'Histórico de gerações de etiquetas por aplicação';
COMMENT ON COLUMN application_history.application_type IS 'Tipo da aplicação: caixa, termo, placas, etc.';
COMMENT ON COLUMN application_history.local_id IS 'ID usado no localStorage do navegador';
COMMENT ON COLUMN application_history.unique_key IS 'Chave única para evitar duplicatas';
COMMENT ON COLUMN application_history.metadata IS 'Dados adicionais em formato JSON';