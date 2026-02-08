-- Script de Verificação: Migração A03
-- Execute este script após aplicar o patch para verificar se tudo está correto

-- =========================================================
-- VERIFICAÇÃO 1: Constraint atualizada
-- =========================================================
SELECT 
    'Constraint check_nivel' AS verificacao,
    CASE 
        WHEN conname IS NOT NULL THEN '✅ Constraint existe'
        ELSE '❌ Constraint não encontrada'
    END AS status
FROM pg_constraint 
WHERE conname = 'check_nivel' 
AND conrelid = 'enderecos_fraldas'::regclass;

-- =========================================================
-- VERIFICAÇÃO 2: Contagem de endereços A03
-- =========================================================
SELECT 
    'Endereços A03 inseridos' AS verificacao,
    COUNT(*) AS total,
    CASE 
        WHEN COUNT(*) = 285 THEN '✅ Correto (15 zonas × 19 colunas)'
        ELSE '⚠️ Quantidade incorreta - esperado: 285'
    END AS status
FROM enderecos_fraldas 
WHERE nivel = 'A03' AND cd = 2;

-- =========================================================
-- VERIFICAÇÃO 3: Total geral de endereços
-- =========================================================
SELECT 
    'Total de endereços' AS verificacao,
    COUNT(*) AS total,
    CASE 
        WHEN COUNT(*) = 2394 THEN '✅ Correto (15 × 19 × 7 níveis)'
        ELSE '⚠️ Total incorreto - esperado: 2.394'
    END AS status
FROM enderecos_fraldas 
WHERE cd = 2;

-- =========================================================
-- VERIFICAÇÃO 4: Distribuição por nível
-- =========================================================
SELECT 
    'Distribuição por nível' AS verificacao,
    nivel,
    CASE nivel
        WHEN 'A0T' THEN 'Térreo'
        WHEN 'A01' THEN '1º Andar'
        WHEN 'A02' THEN '2º Andar'
        WHEN 'A03' THEN '3º Andar'
        WHEN 'A04' THEN '4º Andar'
        WHEN 'A05' THEN '5º Andar'
        WHEN 'A06' THEN '6º Andar'
    END AS descricao,
    COUNT(*) AS total,
    CASE 
        WHEN COUNT(*) = 285 THEN '✅ Correto'
        ELSE '⚠️ Incorreto'
    END AS status
FROM enderecos_fraldas 
WHERE cd = 2
GROUP BY nivel
ORDER BY 
    CASE nivel
        WHEN 'A0T' THEN 0
        WHEN 'A01' THEN 1
        WHEN 'A02' THEN 2
        WHEN 'A03' THEN 3
        WHEN 'A04' THEN 4
        WHEN 'A05' THEN 5
        WHEN 'A06' THEN 6
    END;

-- =========================================================
-- VERIFICAÇÃO 5: Zonas com A03 completo
-- =========================================================
SELECT 
    'Zonas com A03 completo' AS verificacao,
    zona,
    COUNT(*) AS enderecos_a03,
    CASE 
        WHEN COUNT(*) = 19 THEN '✅ Completo'
        ELSE '⚠️ Faltando endereços'
    END AS status
FROM enderecos_fraldas 
WHERE cd = 2 AND nivel = 'A03'
GROUP BY zona
ORDER BY zona;

-- =========================================================
-- VERIFICAÇÃO 6: Exemplos de endereços A03 criados
-- =========================================================
SELECT 
    'Exemplos de endereços A03' AS verificacao,
    endereco,
    descricao,
    created_at
FROM enderecos_fraldas 
WHERE cd = 2 AND nivel = 'A03'
ORDER BY endereco
LIMIT 10;

-- =========================================================
-- VERIFICAÇÃO 7: Teste de validação de constraint
-- =========================================================
-- Este teste deve FALHAR se a constraint estiver funcionando
-- (comentado para não causar erro)
/*
INSERT INTO enderecos_fraldas (cd, endereco, zona, bloco, coluna, nivel)
VALUES (2, 'TESTE.001.001.A99', 'TESTE', '001', '001', 'A99');
*/

SELECT 
    'Teste de constraint' AS verificacao,
    'Constraint deve rejeitar níveis inválidos como A99' AS observacao,
    '✅ Teste manual necessário' AS status;

-- =========================================================
-- RESUMO FINAL
-- =========================================================
SELECT 
    '=== RESUMO DA MIGRAÇÃO ===' AS titulo,
    '' AS separador;

SELECT 
    'Status Geral' AS item,
    CASE 
        WHEN (SELECT COUNT(*) FROM enderecos_fraldas WHERE cd = 2) = 2394 
        AND (SELECT COUNT(*) FROM enderecos_fraldas WHERE nivel = 'A03' AND cd = 2) = 285
        THEN '✅ MIGRAÇÃO CONCLUÍDA COM SUCESSO'
        ELSE '⚠️ MIGRAÇÃO INCOMPLETA - VERIFICAR ERROS ACIMA'
    END AS status;

SELECT 
    'Próximos Passos' AS item,
    'Testar criação de endereços A03 no sistema web' AS acao;