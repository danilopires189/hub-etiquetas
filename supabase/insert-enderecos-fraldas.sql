-- Script para popular todos os endereços possíveis de Fraldas
-- Zona: PF01 a PF15 (15 zonas)
-- Bloco: 001 (fixo)
-- Coluna: 001 a 019 (19 colunas)
-- Nível: A0T, A01, A02, A03, A04, A05, A06 (7 níveis)
-- Total: 15 × 19 × 7 = 2.394 endereços

-- Limpar tabela antes de inserir (opcional - remova se quiser manter dados existentes)
-- TRUNCATE TABLE enderecos_fraldas CASCADE;

-- Inserir todos os endereços possíveis
INSERT INTO enderecos_fraldas (cd, endereco, zona, bloco, coluna, nivel, descricao, ativo)
SELECT 
    2 AS cd,
    'PF' || LPAD(zona::TEXT, 2, '0') || '.001.' || LPAD(coluna::TEXT, 3, '0') || '.' || nivel AS endereco,
    'PF' || LPAD(zona::TEXT, 2, '0') AS zona,
    '001' AS bloco,
    LPAD(coluna::TEXT, 3, '0') AS coluna,
    nivel,
    'Endereço Fralda - Zona PF' || LPAD(zona::TEXT, 2, '0') || ' - Coluna ' || LPAD(coluna::TEXT, 3, '0') || ' - ' ||
    CASE nivel
        WHEN 'A0T' THEN 'Térreo'
        WHEN 'A01' THEN '1º Andar'
        WHEN 'A02' THEN '2º Andar'
        WHEN 'A03' THEN '3º Andar'
        WHEN 'A04' THEN '4º Andar'
        WHEN 'A05' THEN '5º Andar'
        WHEN 'A06' THEN '6º Andar'
    END AS descricao,
    TRUE AS ativo
FROM 
    generate_series(1, 15) AS zona,
    generate_series(1, 19) AS coluna,
    unnest(ARRAY['A0T', 'A01', 'A02', 'A03', 'A04', 'A05', 'A06']) AS nivel
ON CONFLICT (endereco) DO NOTHING;

-- Verificar quantidade inserida
SELECT 
    'Total de endereços inseridos:' AS info,
    COUNT(*) AS total
FROM enderecos_fraldas
WHERE cd = 2;

-- Verificar distribuição por zona
SELECT 
    zona,
    COUNT(*) AS total_enderecos
FROM enderecos_fraldas
WHERE cd = 2
GROUP BY zona
ORDER BY zona;

-- Verificar distribuição por nível
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
ORDER BY nivel;
