-- Patch para adicionar nível A03 aos endereços de fraldas
-- Este script adiciona o 3º Andar (A03) que estava faltando

-- =========================================================
-- PASSO 1: Atualizar constraint para incluir A03
-- =========================================================

-- Remover constraint antiga
ALTER TABLE enderecos_fraldas DROP CONSTRAINT IF EXISTS check_nivel;

-- Adicionar nova constraint com A03 incluído
ALTER TABLE enderecos_fraldas ADD CONSTRAINT check_nivel 
CHECK (nivel IN ('A0T', 'A01', 'A02', 'A03', 'A04', 'A05', 'A06'));

-- =========================================================
-- PASSO 2: Inserir todos os endereços A03 que estão faltando
-- =========================================================

-- Inserir endereços A03 para todas as zonas e colunas
INSERT INTO enderecos_fraldas (cd, endereco, zona, bloco, coluna, nivel, descricao, ativo)
SELECT 
    2 AS cd,
    'PF' || LPAD(zona::TEXT, 2, '0') || '.001.' || LPAD(coluna::TEXT, 3, '0') || '.A03' AS endereco,
    'PF' || LPAD(zona::TEXT, 2, '0') AS zona,
    '001' AS bloco,
    LPAD(coluna::TEXT, 3, '0') AS coluna,
    'A03' AS nivel,
    'Endereço Fralda - Zona PF' || LPAD(zona::TEXT, 2, '0') || ' - Coluna ' || LPAD(coluna::TEXT, 3, '0') || ' - 3º Andar' AS descricao,
    TRUE AS ativo
FROM 
    generate_series(1, 15) AS zona,    -- PF01 a PF15
    generate_series(1, 19) AS coluna   -- 001 a 019
ON CONFLICT (endereco) DO NOTHING;

-- =========================================================
-- PASSO 3: Atualizar comentários e documentação
-- =========================================================

-- Atualizar comentário da coluna nivel
COMMENT ON COLUMN enderecos_fraldas.nivel IS 'Nível do endereço: A0T (Térreo), A01 (1º), A02 (2º), A03 (3º), A04 (4º), A05 (5º), A06 (6º)';

-- =========================================================
-- PASSO 4: Verificações e relatórios
-- =========================================================

-- Verificar quantos endereços A03 foram inseridos
SELECT 
    'Endereços A03 inseridos:' AS info,
    COUNT(*) AS total
FROM enderecos_fraldas
WHERE cd = 2 AND nivel = 'A03';

-- Verificar distribuição total por nível (incluindo A03)
SELECT 
    nivel,
    CASE nivel
        WHEN 'A0T' THEN 'Térreo'
        WHEN 'A01' THEN '1º Andar'
        WHEN 'A02' THEN '2º Andar'
        WHEN 'A03' THEN '3º Andar'
        WHEN 'A04' THEN '4º Andar'
        WHEN 'A05' THEN '5º Andar'
        WHEN 'A06' THEN '6º Andar'
    END AS descricao_nivel,
    COUNT(*) AS total_enderecos
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

-- Verificar total geral de endereços
SELECT 
    'Total de endereços após inclusão do A03:' AS info,
    COUNT(*) AS total,
    'Esperado: 2.394 endereços (15 zonas × 19 colunas × 7 níveis)' AS observacao
FROM enderecos_fraldas
WHERE cd = 2;

-- Verificar se alguma zona/coluna está faltando A03
SELECT 
    zona,
    COUNT(*) AS enderecos_a03
FROM enderecos_fraldas
WHERE cd = 2 AND nivel = 'A03'
GROUP BY zona
HAVING COUNT(*) < 19
ORDER BY zona;

-- Se a query acima retornar resultados, significa que alguma zona não tem todos os A03