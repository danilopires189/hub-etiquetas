-- PATCH DE CONVERSÃO PARA INTEIRO
-- Execute este script para converter as colunas: filial, seq e num_rota para INTEGER.

-- 1. Alterar o tipo da coluna filial
ALTER TABLE termo ALTER COLUMN filial TYPE INTEGER USING NULLIF(filial, '')::INTEGER;

-- 2. Alterar o tipo da coluna seq
ALTER TABLE termo ALTER COLUMN seq TYPE INTEGER USING NULLIF(seq, '')::INTEGER;

-- 3. Alterar o tipo da coluna num_rota
ALTER TABLE termo ALTER COLUMN num_rota TYPE INTEGER USING NULLIF(num_rota, '')::INTEGER;

-- Opcional: Adicionar comentários para documentação
COMMENT ON COLUMN termo.filial IS 'Número da filial (Inteiro)';
COMMENT ON COLUMN termo.seq IS 'Sequência (Inteiro)';
COMMENT ON COLUMN termo.num_rota IS 'Número da rota (Inteiro)';
