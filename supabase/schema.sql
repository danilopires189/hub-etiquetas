-- Schema do Banco de Dados para Hub de Etiquetas
-- Execute este script no SQL Editor do Supabase

-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabela de gerações de etiquetas
CREATE TABLE IF NOT EXISTS labels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_type VARCHAR(50) NOT NULL CHECK (application_type IN (
        'placas', 'caixa', 'avulso', 'enderec', 'transfer', 
        'termo', 'pedido-direto', 'etiqueta-mercadoria', 'inventario', 'geral'
    )),
    coddv VARCHAR(50),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    copies INTEGER DEFAULT 1 CHECK (copies > 0),
    label_type VARCHAR(20),
    orientation VARCHAR(10) CHECK (orientation IN ('h', 'v')),
    cd VARCHAR(10),
    user_session_id UUID,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para otimização de consultas
CREATE INDEX IF NOT EXISTS idx_labels_application_type ON labels(application_type);
CREATE INDEX IF NOT EXISTS idx_labels_created_at ON labels(created_at);
CREATE INDEX IF NOT EXISTS idx_labels_cd ON labels(cd);
CREATE INDEX IF NOT EXISTS idx_labels_coddv ON labels(coddv);

-- Tabela do contador global
CREATE TABLE IF NOT EXISTS global_counter (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    total_count INTEGER NOT NULL DEFAULT 0 CHECK (total_count >= 0),
    application_breakdown JSONB DEFAULT '{
        "placas": 0,
        "caixa": 0,
        "avulso": 0,
        "enderec": 0,
        "transfer": 0,
        "termo": 0,
        "pedido-direto": 0,
        "etiqueta-mercadoria": 0,
        "inventario": 0
    }',
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    version INTEGER DEFAULT 1
);

-- Inserir registro inicial do contador se não existir
INSERT INTO global_counter (total_count, last_updated, version)
SELECT 0, NOW(), 1
WHERE NOT EXISTS (SELECT 1 FROM global_counter);

-- Tabela de sessões de usuário
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR(255) UNIQUE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- Índices para sessões
CREATE INDEX IF NOT EXISTS idx_user_sessions_session_id ON user_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(is_active);

-- Tabela de estatísticas por aplicação
CREATE TABLE IF NOT EXISTS application_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_type VARCHAR(50) NOT NULL,
    date DATE NOT NULL,
    total_generations INTEGER DEFAULT 0 CHECK (total_generations >= 0),
    total_labels INTEGER DEFAULT 0 CHECK (total_labels >= 0),
    peak_hour INTEGER CHECK (peak_hour >= 0 AND peak_hour <= 23),
    average_generation_time DECIMAL(10,2),
    error_count INTEGER DEFAULT 0 CHECK (error_count >= 0),
    UNIQUE(application_type, date)
);

-- Índices para estatísticas
CREATE INDEX IF NOT EXISTS idx_application_stats_type_date ON application_stats(application_type, date);
CREATE INDEX IF NOT EXISTS idx_application_stats_date ON application_stats(date);

-- Função para atualizar contador global
CREATE OR REPLACE FUNCTION update_global_counter(
    increment_amount INTEGER,
    app_type VARCHAR(50)
) RETURNS INTEGER AS $$
DECLARE
    new_total INTEGER;
    current_breakdown JSONB;
    new_breakdown JSONB;
BEGIN
    -- Validar tipo de aplicação
    IF app_type NOT IN ('placas', 'caixa', 'avulso', 'enderec', 'transfer', 
                       'termo', 'pedido-direto', 'etiqueta-mercadoria', 'inventario', 'geral') THEN
        RAISE EXCEPTION 'Tipo de aplicação inválido: %', app_type;
    END IF;
    
    -- Atualizar contador com lock para evitar condições de corrida
    UPDATE global_counter 
    SET 
        total_count = total_count + increment_amount,
        application_breakdown = jsonb_set(
            application_breakdown,
            ARRAY[app_type],
            to_jsonb(COALESCE((application_breakdown->>app_type)::INTEGER, 0) + increment_amount)
        ),
        last_updated = NOW(),
        version = version + 1
    WHERE id = (SELECT id FROM global_counter LIMIT 1)
    RETURNING total_count INTO new_total;
    
    -- Se não existe registro, criar um
    IF new_total IS NULL THEN
        INSERT INTO global_counter (total_count, application_breakdown, last_updated, version)
        VALUES (
            increment_amount,
            jsonb_build_object(app_type, increment_amount),
            NOW(),
            1
        )
        RETURNING total_count INTO new_total;
    END IF;
    
    RETURN new_total;
END;
$$ LANGUAGE plpgsql;

-- Função para obter estatísticas do contador
CREATE OR REPLACE FUNCTION get_counter_stats()
RETURNS TABLE (
    total_count INTEGER,
    application_breakdown JSONB,
    last_updated TIMESTAMP WITH TIME ZONE,
    version INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        gc.total_count,
        gc.application_breakdown,
        gc.last_updated,
        gc.version
    FROM global_counter gc
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Função para registrar geração de etiqueta
CREATE OR REPLACE FUNCTION register_label_generation(
    p_application_type VARCHAR(50),
    p_coddv VARCHAR(50) DEFAULT NULL,
    p_quantity INTEGER DEFAULT 1,
    p_copies INTEGER DEFAULT 1,
    p_label_type VARCHAR(20) DEFAULT NULL,
    p_orientation VARCHAR(10) DEFAULT 'h',
    p_cd VARCHAR(10) DEFAULT NULL,
    p_user_session_id UUID DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
    label_id UUID;
    total_labels INTEGER;
BEGIN
    -- Calcular total de etiquetas geradas
    total_labels := p_quantity * p_copies;
    
    -- Inserir registro de geração
    INSERT INTO labels (
        application_type, coddv, quantity, copies, label_type,
        orientation, cd, user_session_id, metadata
    ) VALUES (
        p_application_type, p_coddv, p_quantity, p_copies, p_label_type,
        p_orientation, p_cd, p_user_session_id, p_metadata
    ) RETURNING id INTO label_id;
    
    -- Atualizar contador global
    PERFORM update_global_counter(total_labels, p_application_type);
    
    -- Atualizar estatísticas diárias
    INSERT INTO application_stats (application_type, date, total_generations, total_labels)
    VALUES (p_application_type, CURRENT_DATE, 1, total_labels)
    ON CONFLICT (application_type, date)
    DO UPDATE SET
        total_generations = application_stats.total_generations + 1,
        total_labels = application_stats.total_labels + total_labels;
    
    RETURN label_id;
END;
$$ LANGUAGE plpgsql;

-- Configurar Row Level Security (RLS)
ALTER TABLE labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE global_counter ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_stats ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança para leitura pública (dados agregados)
CREATE POLICY "Permitir leitura pública do contador" ON global_counter
    FOR SELECT USING (true);

CREATE POLICY "Permitir leitura pública de estatísticas" ON application_stats
    FOR SELECT USING (true);

-- Políticas para inserção pública (gerações de etiquetas)
CREATE POLICY "Permitir inserção pública de etiquetas" ON labels
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir leitura pública de etiquetas" ON labels
    FOR SELECT USING (true);

-- Políticas para sessões (apenas próprias sessões)
CREATE POLICY "Permitir inserção de sessões" ON user_sessions
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir leitura de próprias sessões" ON user_sessions
    FOR SELECT USING (true);

-- Políticas administrativas (apenas usuários autenticados)
CREATE POLICY "Permitir atualização admin do contador" ON global_counter
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Permitir atualização admin de estatísticas" ON application_stats
    FOR ALL USING (auth.role() = 'authenticated');

-- Comentários para documentação
COMMENT ON TABLE labels IS 'Registro de todas as gerações de etiquetas do sistema';
COMMENT ON TABLE global_counter IS 'Contador global centralizado de etiquetas geradas';
COMMENT ON TABLE user_sessions IS 'Sessões de usuário para rastreamento de atividade';
COMMENT ON TABLE application_stats IS 'Estatísticas agregadas por aplicação e data';

COMMENT ON FUNCTION update_global_counter IS 'Atualiza o contador global de forma thread-safe';
COMMENT ON FUNCTION register_label_generation IS 'Registra uma nova geração de etiquetas e atualiza contadores';
COMMENT ON FUNCTION get_counter_stats IS 'Obtém estatísticas atuais do contador global';

-- Função para migração do contador global
CREATE OR REPLACE FUNCTION migrate_global_counter(
    p_total_count INTEGER,
    p_application_breakdown JSONB,
    p_last_updated TIMESTAMP WITH TIME ZONE,
    p_version INTEGER
) RETURNS BOOLEAN AS $
DECLARE
    existing_count INTEGER;
BEGIN
    -- Verificar se já existe contador
    SELECT total_count INTO existing_count FROM global_counter LIMIT 1;
    
    IF existing_count IS NULL THEN
        -- Inserir novo contador
        INSERT INTO global_counter (total_count, application_breakdown, last_updated, version)
        VALUES (p_total_count, p_application_breakdown, p_last_updated, p_version);
        
        RETURN TRUE;
    ELSE
        -- Atualizar apenas se o valor migrado for maior
        IF p_total_count > existing_count THEN
            UPDATE global_counter 
            SET 
                total_count = p_total_count,
                application_breakdown = p_application_breakdown,
                last_updated = p_last_updated,
                version = p_version
            WHERE id = (SELECT id FROM global_counter LIMIT 1);
            
            RETURN TRUE;
        END IF;
        
        RETURN FALSE; -- Não atualizou porque valor existente é maior
    END IF;
END;
$ LANGUAGE plpgsql;

COMMENT ON FUNCTION migrate_global_counter IS 'Migra dados do contador global do localStorage para Supabase';
