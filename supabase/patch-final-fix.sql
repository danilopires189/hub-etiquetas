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
