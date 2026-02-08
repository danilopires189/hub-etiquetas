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