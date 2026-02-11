-- Redução de armazenamento e egress da tabela labels
-- Execute no SQL Editor do Supabase

BEGIN;

-- 1) Limpar metadata pesado de registros antigos (mantém apenas objeto vazio)
UPDATE labels
SET metadata = '{}'::jsonb
WHERE created_at < NOW() - INTERVAL '7 days'
  AND metadata IS NOT NULL
  AND metadata <> '{}'::jsonb;

-- 2) Remover registros antigos de labels (ajuste a janela conforme necessidade)
DELETE FROM labels
WHERE created_at < NOW() - INTERVAL '90 days';

COMMIT;

-- 3) (Opcional) Função de manutenção periódica
CREATE OR REPLACE FUNCTION cleanup_labels_retention(
    p_keep_days INTEGER DEFAULT 90,
    p_trim_metadata_days INTEGER DEFAULT 7
) RETURNS JSONB AS $$
DECLARE
    v_trimmed INTEGER := 0;
    v_deleted INTEGER := 0;
BEGIN
    UPDATE labels
    SET metadata = '{}'::jsonb
    WHERE created_at < NOW() - (p_trim_metadata_days || ' days')::INTERVAL
      AND metadata IS NOT NULL
      AND metadata <> '{}'::jsonb;
    GET DIAGNOSTICS v_trimmed = ROW_COUNT;

    DELETE FROM labels
    WHERE created_at < NOW() - (p_keep_days || ' days')::INTERVAL;
    GET DIAGNOSTICS v_deleted = ROW_COUNT;

    RETURN jsonb_build_object(
        'trimmed_metadata', v_trimmed,
        'deleted_rows', v_deleted,
        'keep_days', p_keep_days,
        'trim_metadata_days', p_trim_metadata_days,
        'timestamp', NOW()
    );
END;
$$ LANGUAGE plpgsql;

-- Execução manual da manutenção (opcional)
-- SELECT cleanup_labels_retention(90, 7);
