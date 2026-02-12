-- =====================================================
-- Bootstrap Banco Novo - hub-pmenos
-- Projeto: esaomlrwutuwqmztxsat
-- Data de geração: 2026-02-11 09:36:02
-- =====================================================

-- 1) Forçar fuso horário de Brasília para sessão atual
SET TIME ZONE 'America/Sao_Paulo';

-- 2) Tentar fixar timezone em roles do Supabase (idempotente)
DO $$
DECLARE
    role_name text;
BEGIN
    FOREACH role_name IN ARRAY ARRAY['postgres', 'anon', 'authenticated', 'service_role']
    LOOP
        BEGIN
            EXECUTE format('ALTER ROLE %I SET timezone TO ''America/Sao_Paulo''', role_name);
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Não foi possível ajustar timezone da role %: %', role_name, SQLERRM;
        END;
    END LOOP;
END;
$$;

-- 3) Tentar fixar timezone no banco postgres (idempotente)
DO $$
BEGIN
    BEGIN
        EXECUTE 'ALTER DATABASE postgres SET timezone TO ''America/Sao_Paulo''';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Não foi possível ajustar timezone do banco postgres: %', SQLERRM;
    END;
END;
$$;


-- ======================== supabase/schema.sql ========================

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
) RETURNS BOOLEAN AS $$
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
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION migrate_global_counter IS 'Migra dados do contador global do localStorage para Supabase';


-- ======================== supabase/patch-final-fix.sql ========================

-- PATCH DE CORREÇÃO FINAL v4
-- Execute este script no SQL Editor do Supabase para corrigir todos os problemas de permissão e limites.

-- 1. CORREÇÃO DE LIMITES E RESTRIÇÕES
-- Aumentar limite de caracteres para IDs longos
ALTER TABLE labels ALTER COLUMN coddv TYPE VARCHAR(50);

-- Atualizar tipos de aplicação permitidos, garantindo que 'geral' (usado na migração) seja aceito
ALTER TABLE labels DROP CONSTRAINT IF EXISTS labels_application_type_check;
ALTER TABLE labels ADD CONSTRAINT labels_application_type_check 
    CHECK (application_type IN (
        'placas', 'caixa', 'avulso', 'enderec', 'transfer', 
        'termo', 'pedido-direto', 'etiqueta-mercadoria', 'inventario', 'geral'
    ));

-- 2. RECRIAR FUNÇÕES COM PERMISSÕES CORRETAS E RETORNO JSON
-- Usamos RETURNS JSON para evitar conflitos de tipagem com o cliente JS

DROP FUNCTION IF EXISTS register_label_generation;
DROP TYPE IF EXISTS label_generation_result;

CREATE OR REPLACE FUNCTION update_global_counter(
    increment_amount INTEGER,
    app_type VARCHAR(50)
) RETURNS INTEGER 
SECURITY DEFINER -- Importante: Permite que usuários anônimos incrementem o contador
SET search_path = public
AS $$
DECLARE
    new_total INTEGER;
    record_id UUID;
BEGIN
    -- Validar tipo
    IF app_type NOT IN ('placas', 'caixa', 'avulso', 'enderec', 'transfer', 
                       'termo', 'pedido-direto', 'etiqueta-mercadoria', 'inventario', 'geral') THEN
        RAISE EXCEPTION 'Tipo de aplicação inválido: %', app_type;
    END IF;
    
    -- Buscar ID do contador
    SELECT id INTO record_id FROM global_counter LIMIT 1;
    
    -- Criar ou Atualizar
    IF record_id IS NULL THEN
        INSERT INTO global_counter (total_count, application_breakdown, last_updated, version)
        VALUES (
            increment_amount,
            CASE WHEN app_type = 'geral' THEN '{}'::JSONB ELSE jsonb_build_object(app_type, increment_amount) END,
            NOW(),
            1
        )
        RETURNING total_count INTO new_total;
    ELSE
        UPDATE global_counter 
        SET 
            total_count = total_count + increment_amount,
            application_breakdown = CASE 
                WHEN app_type = 'geral' THEN application_breakdown
                ELSE jsonb_set(
                    application_breakdown,
                    ARRAY[app_type],
                    to_jsonb(COALESCE((application_breakdown->>app_type)::INTEGER, 0) + increment_amount)
                )
            END,
            last_updated = NOW(),
            version = version + 1
        WHERE id = record_id
        RETURNING total_count INTO new_total;
    END IF;
    
    RETURN new_total;
END;
$$ LANGUAGE plpgsql;

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
) RETURNS JSON 
SECURITY DEFINER -- Permite execução por qualquer usuário (anon)
SET search_path = public
AS $$
DECLARE
    v_label_id UUID;
    v_new_total INTEGER;
    total_labels INTEGER;
BEGIN
    total_labels := p_quantity * p_copies;
    
    -- 1. Inserir na tabela de auditoria (labels)
    INSERT INTO labels (
        application_type, coddv, quantity, copies, label_type,
        orientation, cd, user_session_id, metadata
    ) VALUES (
        p_application_type, p_coddv, p_quantity, p_copies, p_label_type,
        p_orientation, p_cd, p_user_session_id, p_metadata
    ) RETURNING id INTO v_label_id;
    
    -- 2. Atualizar contador global
    v_new_total := update_global_counter(total_labels, p_application_type);
    
    -- 3. Atualizar estatísticas diárias
    IF p_application_type <> 'geral' THEN
        INSERT INTO application_stats (application_type, date, total_generations, total_labels)
        VALUES (p_application_type, CURRENT_DATE, 1, total_labels)
        ON CONFLICT (application_type, date)
        DO UPDATE SET
            total_generations = application_stats.total_generations + 1,
            total_labels = application_stats.total_labels + total_labels;
    END IF;
    
    -- 4. Retornar JSON com os resultados
    RETURN json_build_object(
        'label_id', v_label_id,
        'new_total', v_new_total
    );
END;
$$ LANGUAGE plpgsql;

-- 3. GARANTIR PERMISSÕES PÚBLICAS
GRANT EXECUTE ON FUNCTION update_global_counter(INTEGER, VARCHAR) TO anon;
GRANT EXECUTE ON FUNCTION update_global_counter(INTEGER, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION update_global_counter(INTEGER, VARCHAR) TO service_role;

GRANT EXECUTE ON FUNCTION register_label_generation TO anon;
GRANT EXECUTE ON FUNCTION register_label_generation TO authenticated;
GRANT EXECUTE ON FUNCTION register_label_generation TO service_role;

-- 4. POLÍTICAS DE RLS (SEGURANÇA extra para as tabelas)
ALTER TABLE labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE global_counter ENABLE ROW LEVEL SECURITY;

-- Permitir tudo para o contador global (leitura pública, escrita via função)
DROP POLICY IF EXISTS "Acesso publico contador" ON global_counter;
CREATE POLICY "Acesso publico contador" ON global_counter FOR ALL USING (true) WITH CHECK (true);

-- Permitir inserção de labels para todos
DROP POLICY IF EXISTS "Insercao publica labels" ON labels;
CREATE POLICY "Insercao publica labels" ON labels FOR INSERT WITH CHECK (true);


-- ======================== supabase/conflict-resolution-functions.sql ========================

-- Funções SQL para Suporte à Resolução de Conflitos
-- Sistema de Resolução de Conflitos para Hub de Etiquetas

-- Função para aplicar dados resolvidos do contador global
CREATE OR REPLACE FUNCTION apply_resolved_counter(
    p_total_count INTEGER,
    p_application_breakdown JSONB,
    p_last_updated TIMESTAMP WITH TIME ZONE,
    p_version INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
    v_current_record RECORD;
BEGIN
    -- Verificar se existe registro de contador
    SELECT * INTO v_current_record 
    FROM global_counter 
    ORDER BY last_updated DESC 
    LIMIT 1;
    
    IF v_current_record IS NULL THEN
        -- Inserir novo registro se não existir
        INSERT INTO global_counter (
            total_count, 
            application_breakdown, 
            last_updated, 
            version
        ) VALUES (
            p_total_count,
            p_application_breakdown,
            p_last_updated,
            p_version
        )
        RETURNING jsonb_build_object(
            'id', id,
            'total_count', total_count,
            'application_breakdown', application_breakdown,
            'last_updated', last_updated,
            'version', version,
            'action', 'inserted'
        ) INTO v_result;
    ELSE
        -- Atualizar registro existente
        UPDATE global_counter 
        SET 
            total_count = p_total_count,
            application_breakdown = p_application_breakdown,
            last_updated = p_last_updated,
            version = p_version
        WHERE id = v_current_record.id
        RETURNING jsonb_build_object(
            'id', id,
            'total_count', total_count,
            'application_breakdown', application_breakdown,
            'last_updated', last_updated,
            'version', version,
            'action', 'updated'
        ) INTO v_result;
    END IF;
    
    -- Log da resolução de conflito
    INSERT INTO conflict_resolution_log (
        data_type,
        resolution_strategy,
        resolved_data,
        created_at
    ) VALUES (
        'global_counter',
        'apply_resolved_data',
        v_result,
        NOW()
    );
    
    RETURN v_result;
END;
$$;

-- Função para detectar conflitos de contador baseado em versão
CREATE OR REPLACE FUNCTION detect_counter_version_conflict(
    p_expected_version INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_version INTEGER;
    v_result JSONB;
BEGIN
    -- Obter versão atual
    SELECT version INTO v_current_version
    FROM global_counter
    ORDER BY last_updated DESC
    LIMIT 1;
    
    IF v_current_version IS NULL THEN
        v_current_version := 0;
    END IF;
    
    -- Verificar conflito
    IF v_current_version != p_expected_version THEN
        v_result := jsonb_build_object(
            'has_conflict', true,
            'expected_version', p_expected_version,
            'current_version', v_current_version,
            'conflict_type', 'version_mismatch'
        );
    ELSE
        v_result := jsonb_build_object(
            'has_conflict', false,
            'current_version', v_current_version
        );
    END IF;
    
    RETURN v_result;
END;
$$;

-- Função para merge seguro de breakdown de aplicações
CREATE OR REPLACE FUNCTION merge_application_breakdown(
    p_local_breakdown JSONB,
    p_remote_breakdown JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_merged JSONB := '{}';
    v_key TEXT;
    v_local_value INTEGER;
    v_remote_value INTEGER;
    v_max_value INTEGER;
BEGIN
    -- Obter todas as chaves únicas dos dois breakdowns
    FOR v_key IN 
        SELECT DISTINCT key 
        FROM (
            SELECT jsonb_object_keys(p_local_breakdown) AS key
            UNION
            SELECT jsonb_object_keys(p_remote_breakdown) AS key
        ) AS all_keys
    LOOP
        -- Obter valores (0 se não existir)
        v_local_value := COALESCE((p_local_breakdown ->> v_key)::INTEGER, 0);
        v_remote_value := COALESCE((p_remote_breakdown ->> v_key)::INTEGER, 0);
        
        -- Usar o maior valor
        v_max_value := GREATEST(v_local_value, v_remote_value);
        
        -- Adicionar ao resultado se maior que 0
        IF v_max_value > 0 THEN
            v_merged := v_merged || jsonb_build_object(v_key, v_max_value);
        END IF;
    END LOOP;
    
    RETURN v_merged;
END;
$$;

-- Função para registrar resolução de conflito
CREATE OR REPLACE FUNCTION log_conflict_resolution(
    p_data_type TEXT,
    p_conflict_details JSONB,
    p_resolution_strategy TEXT,
    p_resolved_data JSONB,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO conflict_resolution_log (
        data_type,
        conflict_details,
        resolution_strategy,
        resolved_data,
        metadata,
        created_at
    ) VALUES (
        p_data_type,
        p_conflict_details,
        p_resolution_strategy,
        p_resolved_data,
        p_metadata,
        NOW()
    )
    RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$;

-- Função para buscar registros similares de etiquetas
CREATE OR REPLACE FUNCTION find_similar_label_records(
    p_application_type TEXT,
    p_coddv TEXT,
    p_quantity INTEGER,
    p_time_window_minutes INTEGER DEFAULT 5
)
RETURNS TABLE (
    id UUID,
    application_type TEXT,
    coddv TEXT,
    quantity INTEGER,
    copies INTEGER,
    created_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB,
    similarity_score DECIMAL
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_time_threshold TIMESTAMP WITH TIME ZONE;
BEGIN
    v_time_threshold := NOW() - (p_time_window_minutes || ' minutes')::INTERVAL;
    
    RETURN QUERY
    SELECT 
        l.id,
        l.application_type,
        l.coddv,
        l.quantity,
        l.copies,
        l.created_at,
        l.metadata,
        -- Calcular score de similaridade simples
        CASE 
            WHEN l.application_type = p_application_type 
                AND l.coddv = p_coddv 
                AND l.quantity = p_quantity THEN 1.0
            WHEN l.application_type = p_application_type 
                AND l.coddv = p_coddv THEN 0.8
            WHEN l.application_type = p_application_type 
                AND l.quantity = p_quantity THEN 0.6
            ELSE 0.3
        END AS similarity_score
    FROM labels l
    WHERE l.created_at >= v_time_threshold
        AND (
            l.application_type = p_application_type
            OR l.coddv = p_coddv
            OR l.quantity = p_quantity
        )
    ORDER BY similarity_score DESC, l.created_at DESC
    LIMIT 10;
END;
$$;

-- Função para atualização atômica de contador com detecção de conflito
CREATE OR REPLACE FUNCTION atomic_counter_update(
    p_increment INTEGER,
    p_app_type TEXT,
    p_expected_version INTEGER DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_record RECORD;
    v_new_breakdown JSONB;
    v_result JSONB;
    v_conflict_detected BOOLEAN := FALSE;
BEGIN
    -- Obter registro atual com lock
    SELECT * INTO v_current_record
    FROM global_counter
    ORDER BY last_updated DESC
    LIMIT 1
    FOR UPDATE;
    
    -- Verificar conflito de versão se especificado
    IF p_expected_version IS NOT NULL AND v_current_record.version != p_expected_version THEN
        v_conflict_detected := TRUE;
        
        -- Log do conflito
        INSERT INTO conflict_resolution_log (
            data_type,
            conflict_details,
            resolution_strategy,
            created_at
        ) VALUES (
            'global_counter',
            jsonb_build_object(
                'conflict_type', 'version_mismatch',
                'expected_version', p_expected_version,
                'current_version', v_current_record.version
            ),
            'version_conflict_detected',
            NOW()
        );
    END IF;
    
    -- Preparar novo breakdown
    v_new_breakdown := v_current_record.application_breakdown;
    v_new_breakdown := v_new_breakdown || jsonb_build_object(
        p_app_type, 
        COALESCE((v_new_breakdown ->> p_app_type)::INTEGER, 0) + p_increment
    );
    
    -- Atualizar contador
    UPDATE global_counter
    SET 
        total_count = total_count + p_increment,
        application_breakdown = v_new_breakdown,
        last_updated = NOW(),
        version = version + 1
    WHERE id = v_current_record.id
    RETURNING jsonb_build_object(
        'id', id,
        'total_count', total_count,
        'application_breakdown', application_breakdown,
        'last_updated', last_updated,
        'version', version,
        'conflict_detected', v_conflict_detected,
        'increment_applied', p_increment,
        'app_type', p_app_type
    ) INTO v_result;
    
    RETURN v_result;
END;
$$;

-- Função para obter estatísticas de resolução de conflitos
CREATE OR REPLACE FUNCTION get_conflict_resolution_stats(
    p_days_back INTEGER DEFAULT 7
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_stats JSONB;
    v_time_threshold TIMESTAMP WITH TIME ZONE;
BEGIN
    v_time_threshold := NOW() - (p_days_back || ' days')::INTERVAL;
    
    WITH conflict_stats AS (
        SELECT 
            data_type,
            resolution_strategy,
            COUNT(*) as resolution_count,
            MIN(created_at) as first_resolution,
            MAX(created_at) as last_resolution
        FROM conflict_resolution_log
        WHERE created_at >= v_time_threshold
        GROUP BY data_type, resolution_strategy
    ),
    daily_stats AS (
        SELECT 
            DATE(created_at) as resolution_date,
            COUNT(*) as daily_count
        FROM conflict_resolution_log
        WHERE created_at >= v_time_threshold
        GROUP BY DATE(created_at)
        ORDER BY resolution_date
    )
    SELECT jsonb_build_object(
        'period_days', p_days_back,
        'total_resolutions', (
            SELECT COUNT(*) 
            FROM conflict_resolution_log 
            WHERE created_at >= v_time_threshold
        ),
        'resolutions_by_type', (
            SELECT jsonb_object_agg(data_type, resolution_count)
            FROM (
                SELECT data_type, SUM(resolution_count) as resolution_count
                FROM conflict_stats
                GROUP BY data_type
            ) t
        ),
        'resolutions_by_strategy', (
            SELECT jsonb_object_agg(resolution_strategy, resolution_count)
            FROM (
                SELECT resolution_strategy, SUM(resolution_count) as resolution_count
                FROM conflict_stats
                GROUP BY resolution_strategy
            ) t
        ),
        'daily_distribution', (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'date', resolution_date,
                    'count', daily_count
                )
            )
            FROM daily_stats
        ),
        'most_active_day', (
            SELECT jsonb_build_object(
                'date', resolution_date,
                'count', daily_count
            )
            FROM daily_stats
            ORDER BY daily_count DESC
            LIMIT 1
        )
    ) INTO v_stats;
    
    RETURN v_stats;
END;
$$;

-- Criar tabela de log de resolução de conflitos se não existir
CREATE TABLE IF NOT EXISTS conflict_resolution_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data_type TEXT NOT NULL,
    conflict_details JSONB,
    resolution_strategy TEXT NOT NULL,
    resolved_data JSONB,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_conflict_log_data_type ON conflict_resolution_log(data_type);
CREATE INDEX IF NOT EXISTS idx_conflict_log_created_at ON conflict_resolution_log(created_at);
CREATE INDEX IF NOT EXISTS idx_conflict_log_strategy ON conflict_resolution_log(resolution_strategy);

-- Criar índice para busca de registros similares
CREATE INDEX IF NOT EXISTS idx_labels_similarity_search 
ON labels(application_type, coddv, quantity, created_at);

-- Função para limpeza automática de logs antigos
CREATE OR REPLACE FUNCTION cleanup_old_conflict_logs(
    p_days_to_keep INTEGER DEFAULT 30
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_deleted_count INTEGER;
    v_cutoff_date TIMESTAMP WITH TIME ZONE;
BEGIN
    v_cutoff_date := NOW() - (p_days_to_keep || ' days')::INTERVAL;
    
    DELETE FROM conflict_resolution_log
    WHERE created_at < v_cutoff_date;
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    
    -- Log da limpeza
    INSERT INTO conflict_resolution_log (
        data_type,
        resolution_strategy,
        metadata,
        created_at
    ) VALUES (
        'system',
        'log_cleanup',
        jsonb_build_object(
            'deleted_count', v_deleted_count,
            'cutoff_date', v_cutoff_date,
            'days_kept', p_days_to_keep
        ),
        NOW()
    );
    
    RETURN v_deleted_count;
END;
$$;

-- Comentários para documentação
COMMENT ON FUNCTION apply_resolved_counter IS 'Aplica dados resolvidos do contador global após resolução de conflito';
COMMENT ON FUNCTION detect_counter_version_conflict IS 'Detecta conflitos de versão no contador global';
COMMENT ON FUNCTION merge_application_breakdown IS 'Faz merge seguro de breakdown de aplicações usando valores máximos';
COMMENT ON FUNCTION log_conflict_resolution IS 'Registra resolução de conflito no log do sistema';
COMMENT ON FUNCTION find_similar_label_records IS 'Busca registros similares de etiquetas para detecção de conflitos';
COMMENT ON FUNCTION atomic_counter_update IS 'Atualização atômica do contador com detecção de conflitos';
COMMENT ON FUNCTION get_conflict_resolution_stats IS 'Obtém estatísticas de resolução de conflitos';
COMMENT ON FUNCTION cleanup_old_conflict_logs IS 'Remove logs antigos de resolução de conflitos';

COMMENT ON TABLE conflict_resolution_log IS 'Log de todas as resoluções de conflito do sistema';

-- ======================== supabase/termo-schema.sql ========================

-- Função para gerar ID alfanumérico curto (6 caracteres)
CREATE OR REPLACE FUNCTION generate_short_id()
RETURNS TEXT AS $$
DECLARE
    chars TEXT := '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    result TEXT := '';
    i INTEGER := 0;
BEGIN
    FOR i IN 1..6 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Tabela específica para o módulo Termo
CREATE TABLE IF NOT EXISTS termo (
    id VARCHAR(6) PRIMARY KEY DEFAULT generate_short_id(),
    id_et VARCHAR(50) NOT NULL,
    cd VARCHAR(10),
    pedido VARCHAR(20),
    filial VARCHAR(10),
    seq VARCHAR(10),
    num_rota VARCHAR(10),
    nom_rota TEXT,
    qtd_vol INTEGER,
    mat VARCHAR(20),
    nome TEXT,
    data_hora TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE termo ENABLE ROW LEVEL SECURITY;

-- Política de inserção pública
CREATE POLICY "Permitir inserção pública em termo" ON termo
    FOR INSERT WITH CHECK (true);

-- Política de leitura pública
CREATE POLICY "Permitir leitura pública em termo" ON termo
    FOR SELECT USING (true);

-- Comentário para documentação
COMMENT ON TABLE termo IS 'Registro de etiquetas geradas no módulo de Termolábeis';


-- ======================== supabase/caixa-schema.sql ========================

-- Tabela para o módulo Caixa
CREATE TABLE IF NOT EXISTS caixa (
    id VARCHAR(6) PRIMARY KEY DEFAULT generate_short_id(),
    num_inicial VARCHAR(20),
    num_final VARCHAR(20),
    qtd INTEGER,
    copia INTEGER,
    total_et INTEGER,
    tipo VARCHAR(50),
    data_hora VARCHAR(30) -- Formato DD/MM/AAAA HH:MM:SS
);

-- Habilitar RLS
ALTER TABLE caixa ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
CREATE POLICY "Permitir leitura pública na tabela caixa" 
ON caixa FOR SELECT 
USING (true);

CREATE POLICY "Permitir inserção pública na tabela caixa" 
ON caixa FOR INSERT 
WITH CHECK (true);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_caixa_data_hora ON caixa(data_hora);


-- ======================== supabase/avulso-schema.sql ========================

-- Tabela para o módulo Avulso
CREATE TABLE IF NOT EXISTS avulso (
    id VARCHAR(6) PRIMARY KEY DEFAULT generate_short_id(),
    id_mov VARCHAR(50),
    cd VARCHAR(10),
    tipo_mov VARCHAR(50),
    nun_vol VARCHAR(20),
    qtd_cx INTEGER,
    mat VARCHAR(20),
    nome VARCHAR(100),
    data_hora VARCHAR(30) -- Formato DD/MM/AAAA HH:MM:SS
);

-- Habilitar RLS
ALTER TABLE avulso ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
CREATE POLICY "Permitir leitura pública na tabela avulso" 
ON avulso FOR SELECT 
USING (true);

CREATE POLICY "Permitir inserção pública na tabela avulso" 
ON avulso FOR INSERT 
WITH CHECK (true);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_avulso_data_hora ON avulso(data_hora);
CREATE INDEX IF NOT EXISTS idx_avulso_mat ON avulso(mat);


-- ======================== supabase/etiqueta-entrada-schema.sql ========================

-- SCHEMA PARA ETIQUETA ENTRADA (MERCADORIA)
-- Criação da tabela para armazenar histórico de etiquetas de mercadoria

CREATE TABLE IF NOT EXISTS etiqueta_entrada (
    id VARCHAR(6) PRIMARY KEY DEFAULT generate_short_id(),
    cd VARCHAR(10),
    codv VARCHAR(50),
    ean VARCHAR(50),
    descricao TEXT,
    destino_tipo VARCHAR(20), -- 'automatico', 'pulmao', 'separacao'
    endereco_tipo VARCHAR(20), -- 'PULMÃO', 'SEPARACAO', etc.
    endereco VARCHAR(50),
    quantidade INTEGER,
    validade VARCHAR(10),
    zona BOOLEAN DEFAULT FALSE,
    matricula VARCHAR(20),
    nome_usuario TEXT,
    maquina VARCHAR(50),
    data_hora VARCHAR(30) -- DD/MM/AAAA HH:MM:SS
);

-- RLS
ALTER TABLE etiqueta_entrada ENABLE ROW LEVEL SECURITY;

-- Permitir inserção livre (anon)
CREATE POLICY "Insercao publica etiqueta_entrada" ON etiqueta_entrada FOR INSERT WITH CHECK (true);

-- Permitir leitura livre (anon)
CREATE POLICY "Leitura publica etiqueta_entrada" ON etiqueta_entrada FOR SELECT USING (true);

COMMENT ON TABLE etiqueta_entrada IS 'Histórico de gerações do módulo Etiqueta Mercadoria';


-- ======================== supabase/enderec-schema.sql ========================

-- SCHEMA PARA ENDEREC (ENDEREÇAMENTO)
-- Criação da tabela para armazenar histórico de etiquetas de endereçamento

-- Função para gerar ID alfanumérico curto (6 caracteres) - reutilizada dos outros módulos
CREATE OR REPLACE FUNCTION generate_short_id()
RETURNS TEXT AS $$
DECLARE
    chars TEXT := '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    result TEXT := '';
    i INTEGER := 0;
BEGIN
    FOR i IN 1..6 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Tabela específica para o módulo Enderec
CREATE TABLE IF NOT EXISTS enderec (
    id VARCHAR(6) PRIMARY KEY DEFAULT generate_short_id(),
    tipo VARCHAR(20) NOT NULL, -- 'pulmao', 'estacao', 'outro'
    modelo VARCHAR(20) NOT NULL, -- 'qr' ou 'barras'
    id_etiqueta TEXT NOT NULL, -- descrição exata que aparece nas etiquetas (único)
    num_copia INTEGER NOT NULL DEFAULT 1, -- número de cópias geradas
    data_hora VARCHAR(30) NOT NULL -- DD/MM/AAAA HH:MM:SS da geração
);

-- Habilitar RLS (Row Level Security)
ALTER TABLE enderec ENABLE ROW LEVEL SECURITY;

-- Política de inserção pública (permite inserção anônima)
CREATE POLICY "Permitir inserção pública em enderec" ON enderec
    FOR INSERT WITH CHECK (true);

-- Política de leitura pública (permite leitura anônima)
CREATE POLICY "Permitir leitura pública em enderec" ON enderec
    FOR SELECT USING (true);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_enderec_tipo ON enderec(tipo);
CREATE INDEX IF NOT EXISTS idx_enderec_modelo ON enderec(modelo);
CREATE INDEX IF NOT EXISTS idx_enderec_data_hora ON enderec(data_hora);
CREATE INDEX IF NOT EXISTS idx_enderec_id_etiqueta ON enderec(id_etiqueta);

-- Comentário para documentação
COMMENT ON TABLE enderec IS 'Registro de etiquetas geradas no módulo de Endereçamento';
COMMENT ON COLUMN enderec.id IS 'ID único alfanumérico de 6 caracteres';
COMMENT ON COLUMN enderec.tipo IS 'Tipo de etiqueta: pulmao, estacao ou outro';
COMMENT ON COLUMN enderec.modelo IS 'Tipo de código: qr ou barras';
COMMENT ON COLUMN enderec.id_etiqueta IS 'Código exato que aparece na etiqueta (único por geração)';
COMMENT ON COLUMN enderec.num_copia IS 'Número de cópias geradas para esta etiqueta';
COMMENT ON COLUMN enderec.data_hora IS 'Data e hora da geração no formato DD/MM/AAAA HH:MM:SS';

-- ======================== supabase/enderecamento-fraldas-schema.sql ========================

-- Schema do Banco de Dados para Endereçamento de Fraldas
-- Execute este script no SQL Editor do Supabase

-- =========================================================
-- TABELA: enderecos_fraldas
-- Armazena todos os endereços possíveis para fraldas
-- =========================================================
CREATE TABLE IF NOT EXISTS enderecos_fraldas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cd INTEGER NOT NULL DEFAULT 2,
    endereco VARCHAR(100) NOT NULL UNIQUE,
    zona VARCHAR(4) NOT NULL,          -- PF01 a PF15
    bloco VARCHAR(3) NOT NULL DEFAULT '001',
    coluna VARCHAR(3) NOT NULL,        -- 001 a 019
    nivel VARCHAR(3) NOT NULL,         -- A0T, A01, A02, A03, A04, A05, A06
    descricao TEXT DEFAULT 'Endereço de fralda',
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraint para validar formato
    CONSTRAINT check_zona CHECK (zona ~ '^PF(0[1-9]|1[0-5])$'),
    CONSTRAINT check_bloco CHECK (bloco = '001'),
    CONSTRAINT check_coluna CHECK (coluna ~ '^(0(0[1-9]|1[0-9])|019)$'),
    CONSTRAINT check_nivel CHECK (nivel IN ('A0T', 'A01', 'A02', 'A03', 'A04', 'A05', 'A06'))
);

-- Índices para otimização
CREATE INDEX IF NOT EXISTS idx_enderecos_fraldas_cd ON enderecos_fraldas(cd);
CREATE INDEX IF NOT EXISTS idx_enderecos_fraldas_zona ON enderecos_fraldas(zona);
CREATE INDEX IF NOT EXISTS idx_enderecos_fraldas_nivel ON enderecos_fraldas(nivel);
CREATE INDEX IF NOT EXISTS idx_enderecos_fraldas_ativo ON enderecos_fraldas(ativo);
CREATE INDEX IF NOT EXISTS idx_enderecos_fraldas_endereco ON enderecos_fraldas(endereco);

-- =========================================================
-- TABELA: alocacoes_fraldas
-- Armazena as alocações de produtos nos endereços
-- =========================================================
CREATE TABLE IF NOT EXISTS alocacoes_fraldas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    endereco_id UUID NOT NULL REFERENCES enderecos_fraldas(id) ON DELETE CASCADE,
    endereco VARCHAR(100) NOT NULL,
    coddv VARCHAR(100) NOT NULL,
    descricao_produto TEXT,
    validade VARCHAR(4),
    barras VARCHAR(100),
    lote VARCHAR(50),
    cd INTEGER NOT NULL DEFAULT 2,
    data_alocacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    usuario VARCHAR(100),
    matricula VARCHAR(100),
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para alocações
CREATE INDEX IF NOT EXISTS idx_alocacoes_fraldas_endereco ON alocacoes_fraldas(endereco);
CREATE INDEX IF NOT EXISTS idx_alocacoes_fraldas_coddv ON alocacoes_fraldas(coddv);
CREATE INDEX IF NOT EXISTS idx_alocacoes_fraldas_barras ON alocacoes_fraldas(barras);
CREATE INDEX IF NOT EXISTS idx_alocacoes_fraldas_endereco_id ON alocacoes_fraldas(endereco_id);
CREATE INDEX IF NOT EXISTS idx_alocacoes_fraldas_ativo ON alocacoes_fraldas(ativo);
CREATE INDEX IF NOT EXISTS idx_alocacoes_fraldas_cd ON alocacoes_fraldas(cd);
CREATE INDEX IF NOT EXISTS idx_alocacoes_fraldas_validade ON alocacoes_fraldas(validade);

-- Garante unicidade apenas das alocações ativas, permitindo realocar após desalocação
CREATE UNIQUE INDEX IF NOT EXISTS unique_produto_endereco_ativo
ON alocacoes_fraldas (endereco_id, coddv)
WHERE ativo = TRUE;

-- =========================================================
-- TABELA: historico_enderecamento_fraldas
-- Armazena o histórico de operações
-- =========================================================
CREATE TABLE IF NOT EXISTS historico_enderecamento_fraldas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('CADASTRO', 'ALOCACAO', 'DESALOCACAO', 'TRANSFERENCIA')),
    endereco VARCHAR(100) NOT NULL,
    endereco_origem VARCHAR(100),
    endereco_destino VARCHAR(100),
    coddv VARCHAR(100),
    descricao_produto TEXT,
    validade VARCHAR(4),
    observacao TEXT,
    usuario VARCHAR(100),
    matricula VARCHAR(100),
    cd INTEGER DEFAULT 2,
    data_hora TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para histórico
CREATE INDEX IF NOT EXISTS idx_historico_enderecamento_tipo ON historico_enderecamento_fraldas(tipo);
CREATE INDEX IF NOT EXISTS idx_historico_enderecamento_endereco ON historico_enderecamento_fraldas(endereco);
CREATE INDEX IF NOT EXISTS idx_historico_enderecamento_coddv ON historico_enderecamento_fraldas(coddv);
CREATE INDEX IF NOT EXISTS idx_historico_enderecamento_data ON historico_enderecamento_fraldas(data_hora);

-- =========================================================
-- TRIGGER: Limitar 2 produtos por endereço
-- =========================================================
CREATE OR REPLACE FUNCTION check_max_produtos_por_endereco()
RETURNS TRIGGER AS $$
DECLARE
    count_produtos INTEGER;
BEGIN
    SELECT COUNT(*) INTO count_produtos
    FROM alocacoes_fraldas
    WHERE endereco_id = NEW.endereco_id AND ativo = TRUE;
    
    IF count_produtos >= 2 THEN
        RAISE EXCEPTION 'Endereço já possui o máximo de 2 produtos alocados';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_check_max_produtos ON alocacoes_fraldas;
CREATE TRIGGER trigger_check_max_produtos
BEFORE INSERT ON alocacoes_fraldas
FOR EACH ROW
EXECUTE FUNCTION check_max_produtos_por_endereco();

-- =========================================================
-- TRIGGER: Atualizar updated_at automaticamente
-- =========================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_enderecos_updated_at ON enderecos_fraldas;
CREATE TRIGGER trigger_enderecos_updated_at
BEFORE UPDATE ON enderecos_fraldas
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_alocacoes_updated_at ON alocacoes_fraldas;
CREATE TRIGGER trigger_alocacoes_updated_at
BEFORE UPDATE ON alocacoes_fraldas
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- =========================================================
-- RLS (Row Level Security)
-- =========================================================
ALTER TABLE enderecos_fraldas ENABLE ROW LEVEL SECURITY;
ALTER TABLE alocacoes_fraldas ENABLE ROW LEVEL SECURITY;
ALTER TABLE historico_enderecamento_fraldas ENABLE ROW LEVEL SECURITY;

-- Políticas para endereços
CREATE POLICY "Permitir leitura pública de endereços" ON enderecos_fraldas
    FOR SELECT USING (true);

CREATE POLICY "Permitir inserção pública de endereços" ON enderecos_fraldas
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir atualização pública de endereços" ON enderecos_fraldas
    FOR UPDATE USING (true);

-- Políticas para alocações
CREATE POLICY "Permitir leitura pública de alocações" ON alocacoes_fraldas
    FOR SELECT USING (true);

CREATE POLICY "Permitir inserção pública de alocações" ON alocacoes_fraldas
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir atualização pública de alocações" ON alocacoes_fraldas
    FOR UPDATE USING (true);

CREATE POLICY "Permitir exclusão pública de alocações" ON alocacoes_fraldas
    FOR DELETE USING (true);

-- Políticas para histórico
CREATE POLICY "Permitir leitura pública de histórico" ON historico_enderecamento_fraldas
    FOR SELECT USING (true);

CREATE POLICY "Permitir inserção pública de histórico" ON historico_enderecamento_fraldas
    FOR INSERT WITH CHECK (true);

-- =========================================================
-- FUNÇÃO: Buscar endereços com status de ocupação
-- =========================================================
CREATE OR REPLACE FUNCTION get_enderecos_com_status(p_cd INTEGER DEFAULT 2)
RETURNS TABLE (
    id UUID,
    endereco VARCHAR,
    zona VARCHAR,
    coluna VARCHAR,
    nivel VARCHAR,
    descricao TEXT,
    ativo BOOLEAN,
    produtos_alocados BIGINT,
    espaco_disponivel INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id,
        e.endereco,
        e.zona,
        e.coluna,
        e.nivel,
        e.descricao,
        e.ativo,
        COUNT(a.id) AS produtos_alocados,
        (2 - COUNT(a.id)::INTEGER) AS espaco_disponivel
    FROM enderecos_fraldas e
    LEFT JOIN alocacoes_fraldas a ON e.id = a.endereco_id AND a.ativo = TRUE
    WHERE e.cd = p_cd AND e.ativo = TRUE
    GROUP BY e.id, e.endereco, e.zona, e.coluna, e.nivel, e.descricao, e.ativo
    ORDER BY e.endereco;
END;
$$ LANGUAGE plpgsql;

-- =========================================================
-- FUNÇÃO: Buscar produtos alocados em um endereço
-- =========================================================
CREATE OR REPLACE FUNCTION get_produtos_no_endereco(p_endereco VARCHAR)
RETURNS TABLE (
    id UUID,
    coddv VARCHAR,
    descricao_produto TEXT,
    validade VARCHAR,
    data_alocacao TIMESTAMP WITH TIME ZONE,
    usuario VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.coddv,
        a.descricao_produto,
        a.validade,
        a.data_alocacao,
        a.usuario
    FROM alocacoes_fraldas a
    WHERE a.endereco = p_endereco AND a.ativo = TRUE
    ORDER BY a.data_alocacao;
END;
$$ LANGUAGE plpgsql;

-- =========================================================
-- FUNÇÃO: Alocar produto com validação
-- =========================================================
DROP FUNCTION IF EXISTS alocar_produto_fralda(VARCHAR, VARCHAR, TEXT, VARCHAR, VARCHAR, INTEGER);
DROP FUNCTION IF EXISTS alocar_produto_fralda(VARCHAR, VARCHAR, TEXT, VARCHAR, VARCHAR, VARCHAR, INTEGER);

CREATE OR REPLACE FUNCTION alocar_produto_fralda(
    p_endereco VARCHAR,
    p_coddv VARCHAR,
    p_descricao_produto TEXT,
    p_validade VARCHAR DEFAULT NULL,
    p_usuario VARCHAR DEFAULT NULL,
    p_matricula VARCHAR DEFAULT NULL,
    p_cd INTEGER DEFAULT 2
) RETURNS UUID AS $$
DECLARE
    v_endereco_id UUID;
    v_alocacao_id UUID;
    v_count INTEGER;
BEGIN
    -- Buscar ID do endereço
    SELECT id INTO v_endereco_id
    FROM enderecos_fraldas
    WHERE endereco = p_endereco AND cd = p_cd AND ativo = TRUE;
    
    IF v_endereco_id IS NULL THEN
        RAISE EXCEPTION 'Endereço não encontrado ou inativo: %', p_endereco;
    END IF;
    
    -- Verificar se produto já está neste endereço
    SELECT COUNT(*) INTO v_count
    FROM alocacoes_fraldas
    WHERE endereco_id = v_endereco_id AND coddv = p_coddv AND ativo = TRUE;
    
    IF v_count > 0 THEN
        RAISE EXCEPTION 'Produto % já está alocado neste endereço', p_coddv;
    END IF;
    
    -- Inserir alocação
    INSERT INTO alocacoes_fraldas (endereco_id, endereco, coddv, descricao_produto, validade, usuario, matricula, cd)
    VALUES (v_endereco_id, p_endereco, p_coddv, p_descricao_produto, p_validade, p_usuario, p_matricula, p_cd)
    RETURNING id INTO v_alocacao_id;
    
    -- Registrar no histórico
    INSERT INTO historico_enderecamento_fraldas (tipo, endereco, endereco_origem, coddv, descricao_produto, validade, usuario, matricula, cd)
    VALUES ('ALOCACAO', p_endereco, p_endereco, p_coddv, p_descricao_produto, p_validade, p_usuario, p_matricula, p_cd);
    
    RETURN v_alocacao_id;
END;
$$ LANGUAGE plpgsql;

-- =========================================================
-- FUNÇÃO: Desalocar produto
-- =========================================================
CREATE OR REPLACE FUNCTION desalocar_produto_fralda(
    p_endereco VARCHAR,
    p_coddv VARCHAR,
    p_usuario VARCHAR DEFAULT NULL,
    p_matricula VARCHAR DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    v_alocacao_id UUID;
    v_descricao TEXT;
    v_validade VARCHAR(4);
BEGIN
    -- Buscar alocação
    SELECT id, descricao_produto, validade INTO v_alocacao_id, v_descricao, v_validade
    FROM alocacoes_fraldas
    WHERE endereco = p_endereco AND coddv = p_coddv AND ativo = TRUE;
    
    IF v_alocacao_id IS NULL THEN
        RAISE EXCEPTION 'Produto % não está alocado no endereço %', p_coddv, p_endereco;
    END IF;
    
    -- Marcar como inativo (soft delete)
    UPDATE alocacoes_fraldas
    SET ativo = FALSE, updated_at = NOW()
    WHERE id = v_alocacao_id;
    
    -- Registrar no histórico
    INSERT INTO historico_enderecamento_fraldas (tipo, endereco, endereco_origem, coddv, descricao_produto, validade, usuario, matricula)
    VALUES ('DESALOCACAO', p_endereco, p_endereco, p_coddv, v_descricao, v_validade, p_usuario, p_matricula);
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- =========================================================
-- FUNÇÃO: Transferir produto entre endereços
-- =========================================================
CREATE OR REPLACE FUNCTION transferir_produto_fralda(
    p_endereco_origem VARCHAR,
    p_endereco_destino VARCHAR,
    p_coddv VARCHAR,
    p_usuario VARCHAR DEFAULT NULL,
    p_matricula VARCHAR DEFAULT NULL,
    p_cd INTEGER DEFAULT 2
) RETURNS UUID AS $$
DECLARE
    v_endereco_destino_id UUID;
    v_alocacao_id UUID;
    v_descricao TEXT;
    v_validade VARCHAR(4);
    v_nova_alocacao_id UUID;
BEGIN
    -- Buscar ID do endereço destino
    SELECT id INTO v_endereco_destino_id
    FROM enderecos_fraldas
    WHERE endereco = p_endereco_destino AND cd = p_cd AND ativo = TRUE;
    
    IF v_endereco_destino_id IS NULL THEN
        RAISE EXCEPTION 'Endereço destino não encontrado: %', p_endereco_destino;
    END IF;
    
    -- Buscar alocação origem
    SELECT id, descricao_produto, validade INTO v_alocacao_id, v_descricao, v_validade
    FROM alocacoes_fraldas
    WHERE endereco = p_endereco_origem AND coddv = p_coddv AND ativo = TRUE;
    
    IF v_alocacao_id IS NULL THEN
        RAISE EXCEPTION 'Produto % não está alocado no endereço origem %', p_coddv, p_endereco_origem;
    END IF;
    
    -- Desativar alocação antiga
    UPDATE alocacoes_fraldas
    SET ativo = FALSE, updated_at = NOW()
    WHERE id = v_alocacao_id;
    
    -- Criar nova alocação no destino
    INSERT INTO alocacoes_fraldas (endereco_id, endereco, coddv, descricao_produto, validade, usuario, matricula, cd)
    VALUES (v_endereco_destino_id, p_endereco_destino, p_coddv, v_descricao, v_validade, p_usuario, p_matricula, p_cd)
    RETURNING id INTO v_nova_alocacao_id;
    
    -- Registrar no histórico
    INSERT INTO historico_enderecamento_fraldas (tipo, endereco, endereco_origem, endereco_destino, coddv, descricao_produto, validade, usuario, matricula, observacao)
    VALUES ('TRANSFERENCIA', p_endereco_origem, p_endereco_origem, p_endereco_destino, p_coddv, v_descricao, v_validade, p_usuario, p_matricula, 
            'De: ' || p_endereco_origem || ' Para: ' || p_endereco_destino);
    
    RETURN v_nova_alocacao_id;
END;
$$ LANGUAGE plpgsql;

-- =========================================================
-- COMENTÁRIOS
-- =========================================================
COMMENT ON TABLE enderecos_fraldas IS 'Endereços de armazenamento de fraldas no CD';
COMMENT ON TABLE alocacoes_fraldas IS 'Alocações de produtos nos endereços de fraldas';
COMMENT ON TABLE historico_enderecamento_fraldas IS 'Histórico de operações de endereçamento';
COMMENT ON FUNCTION get_enderecos_com_status IS 'Retorna endereços com contagem de produtos alocados';
COMMENT ON FUNCTION alocar_produto_fralda IS 'Aloca um produto em um endereço com validação';
COMMENT ON FUNCTION desalocar_produto_fralda IS 'Remove alocação de um produto (soft delete)';
COMMENT ON FUNCTION transferir_produto_fralda IS 'Transfere produto entre endereços';


-- ======================== supabase/coleta-fraldas-schema.sql ========================

-- =====================================================
-- Módulo Coleta Fraldas
-- =====================================================

CREATE TABLE IF NOT EXISTS coletas_fraldas (
    id BIGSERIAL PRIMARY KEY,
    cd INTEGER NOT NULL,
    usuario_nome VARCHAR(150) NOT NULL,
    usuario_matricula VARCHAR(50),
    coddv VARCHAR(50) NOT NULL,
    barras VARCHAR(80) NOT NULL,
    validade VARCHAR(4) NOT NULL,
    lote VARCHAR(50),
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('SEPARACAO', 'PULMAO')),
    descricao VARCHAR(255) NOT NULL,
    data_hora_brasilia TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT (timezone('America/Sao_Paulo', now())),
    print VARCHAR(3) NOT NULL DEFAULT 'Nao' CHECK (print IN ('Sim', 'Nao')),
    printed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coletas_fraldas_cd ON coletas_fraldas (cd);
CREATE INDEX IF NOT EXISTS idx_coletas_fraldas_print ON coletas_fraldas (print);
CREATE INDEX IF NOT EXISTS idx_coletas_fraldas_data_brasilia ON coletas_fraldas (data_hora_brasilia DESC);
CREATE INDEX IF NOT EXISTS idx_coletas_fraldas_printed_at ON coletas_fraldas (printed_at DESC);
CREATE INDEX IF NOT EXISTS idx_coletas_fraldas_coddv ON coletas_fraldas (coddv);
CREATE INDEX IF NOT EXISTS idx_coletas_fraldas_barras ON coletas_fraldas (barras);

CREATE OR REPLACE FUNCTION set_updated_at_coletas_fraldas()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_coletas_fraldas_updated_at ON coletas_fraldas;
CREATE TRIGGER trigger_coletas_fraldas_updated_at
BEFORE UPDATE ON coletas_fraldas
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_coletas_fraldas();

ALTER TABLE coletas_fraldas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir leitura pública de coletas fraldas" ON coletas_fraldas;
CREATE POLICY "Permitir leitura pública de coletas fraldas"
ON coletas_fraldas FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Permitir inserção pública de coletas fraldas" ON coletas_fraldas;
CREATE POLICY "Permitir inserção pública de coletas fraldas"
ON coletas_fraldas FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir atualização pública de coletas fraldas" ON coletas_fraldas;
CREATE POLICY "Permitir atualização pública de coletas fraldas"
ON coletas_fraldas FOR UPDATE
USING (true);

COMMENT ON TABLE coletas_fraldas IS 'Registros de coleta mobile para impressão posterior no desktop';


-- ======================== supabase/coletas-etiqueta-mercadoria-schema.sql ========================

-- =====================================================
-- Modulo Coleta Etiqueta Mercadoria
-- =====================================================

CREATE TABLE IF NOT EXISTS coletas_etiqueta_mercadoria (
    id BIGSERIAL PRIMARY KEY,
    cd INTEGER NOT NULL,
    mat VARCHAR(50) NOT NULL,
    nome VARCHAR(150) NOT NULL,
    coddv VARCHAR(50) NOT NULL,
    barras VARCHAR(80) NOT NULL,
    descricao VARCHAR(255) NOT NULL,
    destino VARCHAR(20) NOT NULL CHECK (destino IN ('AUTOMATICO', 'SEPARACAO', 'PULMAO')),
    validade VARCHAR(5),
    qtd INTEGER NOT NULL CHECK (qtd > 0),
    dt_hr_coleta TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT (timezone('America/Sao_Paulo', now())),
    dt_hr_impressao TIMESTAMP WITHOUT TIME ZONE,
    status_impressao VARCHAR(3) NOT NULL DEFAULT 'NAO' CHECK (status_impressao IN ('SIM', 'NAO')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coletas_etiqueta_mercadoria_cd ON coletas_etiqueta_mercadoria (cd);
CREATE INDEX IF NOT EXISTS idx_coletas_etiqueta_mercadoria_status ON coletas_etiqueta_mercadoria (status_impressao);
CREATE INDEX IF NOT EXISTS idx_coletas_etiqueta_mercadoria_dt_coleta ON coletas_etiqueta_mercadoria (dt_hr_coleta DESC);
CREATE INDEX IF NOT EXISTS idx_coletas_etiqueta_mercadoria_dt_impressao ON coletas_etiqueta_mercadoria (dt_hr_impressao DESC);
CREATE INDEX IF NOT EXISTS idx_coletas_etiqueta_mercadoria_coddv ON coletas_etiqueta_mercadoria (coddv);
CREATE INDEX IF NOT EXISTS idx_coletas_etiqueta_mercadoria_barras ON coletas_etiqueta_mercadoria (barras);
CREATE INDEX IF NOT EXISTS idx_coletas_etiqueta_mercadoria_mat ON coletas_etiqueta_mercadoria (mat);

CREATE OR REPLACE FUNCTION set_updated_at_coletas_etiqueta_mercadoria()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_coletas_etiqueta_mercadoria_updated_at ON coletas_etiqueta_mercadoria;
CREATE TRIGGER trigger_coletas_etiqueta_mercadoria_updated_at
BEFORE UPDATE ON coletas_etiqueta_mercadoria
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_coletas_etiqueta_mercadoria();

ALTER TABLE coletas_etiqueta_mercadoria ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir leitura publica coletas etiqueta mercadoria" ON coletas_etiqueta_mercadoria;
CREATE POLICY "Permitir leitura publica coletas etiqueta mercadoria"
ON coletas_etiqueta_mercadoria FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Permitir insercao publica coletas etiqueta mercadoria" ON coletas_etiqueta_mercadoria;
CREATE POLICY "Permitir insercao publica coletas etiqueta mercadoria"
ON coletas_etiqueta_mercadoria FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir atualizacao publica coletas etiqueta mercadoria" ON coletas_etiqueta_mercadoria;
CREATE POLICY "Permitir atualizacao publica coletas etiqueta mercadoria"
ON coletas_etiqueta_mercadoria FOR UPDATE
USING (true);

COMMENT ON TABLE coletas_etiqueta_mercadoria IS 'Registros de coleta mobile do modulo etiqueta mercadoria com impressao no desktop';


-- ======================== supabase/application-history-schema.sql ========================

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

-- Comentários para documentação
COMMENT ON TABLE application_history IS 'Histórico de gerações de etiquetas por aplicação';
COMMENT ON COLUMN application_history.application_type IS 'Tipo da aplicação: caixa, termo, placas, etc.';
COMMENT ON COLUMN application_history.local_id IS 'ID usado no localStorage do navegador';
COMMENT ON COLUMN application_history.unique_key IS 'Chave única para evitar duplicatas';
COMMENT ON COLUMN application_history.metadata IS 'Dados adicionais em formato JSON';

-- 4) Garantir sessão em Brasília para os testes imediatos
SET TIME ZONE 'America/Sao_Paulo';

-- 5) Verificações rápidas
SELECT current_setting('TIMEZONE') AS timezone_ativa;
SELECT NOW() AS agora_servidor, timezone('America/Sao_Paulo', NOW()) AS agora_brasilia;
SELECT total_count, last_updated, version FROM global_counter LIMIT 1;
