-- Patch v3 para corrigir limites, permissões e retornar o novo total do contador
-- Execute este script no SQL Editor do Supabase

-- 1. Aumentar o limite de caracteres da coluna coddv na tabela labels
ALTER TABLE labels ALTER COLUMN coddv TYPE VARCHAR(50);

-- 2. Atualizar a restrição de check para inclusão de 'geral'
ALTER TABLE labels DROP CONSTRAINT IF EXISTS labels_application_type_check;
ALTER TABLE labels ADD CONSTRAINT labels_application_type_check 
    CHECK (application_type IN (
        'placas', 'caixa', 'avulso', 'enderec', 'transfer', 
        'termo', 'pedido-direto', 'etiqueta-mercadoria', 'inventario', 'geral'
    ));

-- 3. Atualizar a função update_global_counter para retornar o total
CREATE OR REPLACE FUNCTION update_global_counter(
    increment_amount INTEGER,
    app_type VARCHAR(50)
) RETURNS INTEGER 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    new_total INTEGER;
    record_id UUID;
BEGIN
    IF app_type NOT IN ('placas', 'caixa', 'avulso', 'enderec', 'transfer', 
                       'termo', 'pedido-direto', 'etiqueta-mercadoria', 'inventario', 'geral') THEN
        RAISE EXCEPTION 'Tipo de aplicação inválido: %', app_type;
    END IF;
    
    SELECT id INTO record_id FROM global_counter LIMIT 1;
    
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

-- 4. Tipo customizado para retorno da geração
DROP TYPE IF EXISTS label_generation_result CASCADE;
CREATE TYPE label_generation_result AS (
    label_id UUID,
    new_total INTEGER
);

-- 5. Atualizar a função register_label_generation para retornar o tipo customizado
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
) RETURNS label_generation_result 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_label_id UUID;
    v_new_total INTEGER;
    total_labels INTEGER;
    result label_generation_result;
BEGIN
    total_labels := p_quantity * p_copies;
    
    INSERT INTO labels (
        application_type, coddv, quantity, copies, label_type,
        orientation, cd, user_session_id, metadata
    ) VALUES (
        p_application_type, p_coddv, p_quantity, p_copies, p_label_type,
        p_orientation, p_cd, p_user_session_id, p_metadata
    ) RETURNING id INTO v_label_id;
    
    v_new_total := update_global_counter(total_labels, p_application_type);
    
    IF p_application_type <> 'geral' THEN
        INSERT INTO application_stats (application_type, date, total_generations, total_labels)
        VALUES (p_application_type, CURRENT_DATE, 1, total_labels)
        ON CONFLICT (application_type, date)
        DO UPDATE SET
            total_generations = application_stats.total_generations + 1,
            total_labels = application_stats.total_labels + total_labels;
    END IF;
    
    result.label_id := v_label_id;
    result.new_total := v_new_total;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 6. Garantir permissões
GRANT EXECUTE ON FUNCTION update_global_counter(INTEGER, VARCHAR) TO anon;
GRANT EXECUTE ON FUNCTION update_global_counter(INTEGER, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION register_label_generation TO anon;
GRANT EXECUTE ON FUNCTION register_label_generation TO authenticated;
