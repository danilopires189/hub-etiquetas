-- Recalcula o contador global com base no total real da tabela labels.
-- Execute no SQL Editor do Supabase.

BEGIN;

WITH base AS (
    SELECT COALESCE(SUM(quantity * copies), 0)::INTEGER AS total_count
    FROM labels
),
by_app AS (
    SELECT application_type, COALESCE(SUM(quantity * copies), 0)::INTEGER AS total
    FROM labels
    GROUP BY application_type
),
breakdown AS (
    SELECT COALESCE(jsonb_object_agg(application_type, total), '{}'::jsonb) AS raw
    FROM by_app
),
defaults AS (
    SELECT jsonb_build_object(
        'placas', 0,
        'caixa', 0,
        'avulso', 0,
        'enderec', 0,
        'transfer', 0,
        'termo', 0,
        'pedido-direto', 0,
        'etiqueta-mercadoria', 0,
        'inventario', 0,
        'geral', 0
    ) AS def
),
recalc AS (
    SELECT
        b.total_count,
        (d.def || br.raw) AS application_breakdown
    FROM base b, breakdown br, defaults d
)
INSERT INTO global_counter (total_count, application_breakdown, last_updated, version)
SELECT total_count, application_breakdown, NOW(), 1
FROM recalc
WHERE NOT EXISTS (SELECT 1 FROM global_counter);

WITH recalc AS (
    WITH base AS (
        SELECT COALESCE(SUM(quantity * copies), 0)::INTEGER AS total_count
        FROM labels
    ),
    by_app AS (
        SELECT application_type, COALESCE(SUM(quantity * copies), 0)::INTEGER AS total
        FROM labels
        GROUP BY application_type
    ),
    breakdown AS (
        SELECT COALESCE(jsonb_object_agg(application_type, total), '{}'::jsonb) AS raw
        FROM by_app
    ),
    defaults AS (
        SELECT jsonb_build_object(
            'placas', 0,
            'caixa', 0,
            'avulso', 0,
            'enderec', 0,
            'transfer', 0,
            'termo', 0,
            'pedido-direto', 0,
            'etiqueta-mercadoria', 0,
            'inventario', 0,
            'geral', 0
        ) AS def
    )
    SELECT
        b.total_count,
        (d.def || br.raw) AS application_breakdown
    FROM base b, breakdown br, defaults d
)
UPDATE global_counter
SET
    total_count = recalc.total_count,
    application_breakdown = recalc.application_breakdown,
    last_updated = NOW(),
    version = COALESCE(global_counter.version, 1) + 1
FROM recalc
WHERE global_counter.id = (
    SELECT id
    FROM global_counter
    ORDER BY last_updated DESC
    LIMIT 1
);

COMMIT;

SELECT total_count, application_breakdown, last_updated, version
FROM global_counter
ORDER BY last_updated DESC
LIMIT 1;
