-- PATCH: Permitir realocacao do mesmo produto no mesmo endereco apos desalocacao
-- Problema: constraint unique_produto_endereco (endereco_id, coddv) bloqueia reuso
-- Solucao: usar indice unico parcial apenas para registros ativos (ativo = TRUE)

BEGIN;

-- 1) Sanear possiveis duplicidades ativas antes de criar o indice parcial
WITH ranked AS (
    SELECT
        id,
        ROW_NUMBER() OVER (
            PARTITION BY endereco_id, coddv
            ORDER BY created_at DESC NULLS LAST, id DESC
        ) AS rn
    FROM alocacoes_fraldas
    WHERE ativo = TRUE
)
UPDATE alocacoes_fraldas a
SET ativo = FALSE
FROM ranked r
WHERE a.id = r.id
  AND r.rn > 1;

-- 2) Remover constraint/index antigos (se existirem)
ALTER TABLE alocacoes_fraldas DROP CONSTRAINT IF EXISTS unique_produto_endereco;
DROP INDEX IF EXISTS unique_produto_endereco;
DROP INDEX IF EXISTS unique_produto_endereco_ativo;

-- 3) Criar indice unico parcial: unicidade so para alocacoes ativas
CREATE UNIQUE INDEX unique_produto_endereco_ativo
ON alocacoes_fraldas (endereco_id, coddv)
WHERE ativo = TRUE;

COMMIT;

-- 4) Verificacoes rapidas
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'alocacoes_fraldas'
  AND indexname = 'unique_produto_endereco_ativo';

SELECT endereco_id, coddv, COUNT(*) AS total_ativos
FROM alocacoes_fraldas
WHERE ativo = TRUE
GROUP BY endereco_id, coddv
HAVING COUNT(*) > 1;
