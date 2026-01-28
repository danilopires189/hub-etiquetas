-- Atualizar contador global para o valor correto (Correção de Erro)
-- O valor estava incorreto (164 milhões) e será ajustado para ~134.836 conforme auditoria física

BEGIN;

-- 1. Atualizar o contador global
UPDATE global_counter
SET 
    total_count = 134836,
    last_updated = NOW(),
    version = version + 1
WHERE id IN (SELECT id FROM global_counter LIMIT 1);

-- 2. Se por acaso não existir linha, criar uma
INSERT INTO global_counter (total_count, application_breakdown, last_updated, version)
SELECT 
    134836, 
    '{"manual_fix": 0}'::jsonb, 
    NOW(), 
    1
WHERE NOT EXISTS (SELECT 1 FROM global_counter);

COMMIT;

-- Verificar o resultado
SELECT * FROM global_counter;
