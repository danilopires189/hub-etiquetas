-- =========================================================
-- PATCH: Ajustar ID para 6 caracteres alfanuméricos e data_hora formato BR
-- Execute este script no SQL Editor do Supabase
-- =========================================================

-- =========================================================
-- 1. Criar função para gerar ID alfanumérico (6 caracteres)
-- =========================================================
CREATE OR REPLACE FUNCTION generate_short_id()
RETURNS TEXT AS $$
DECLARE
    chars TEXT := '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    result TEXT := '';
    i INTEGER := 0;
BEGIN
    FOR i IN 1..6 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- =========================================================
-- 2. Dropar tabelas antigas (se existirem)
-- =========================================================

-- Dropar tabelas antigas (CASCADE remove dependências)
DROP TABLE IF EXISTS alocacoes_fraldas CASCADE;
DROP TABLE IF EXISTS historico_enderecamento_fraldas CASCADE;
DROP TABLE IF EXISTS enderecos_fraldas CASCADE;

-- =========================================================
-- 3. Criar tabela enderecos_fraldas
-- =========================================================
CREATE TABLE enderecos_fraldas (
    id VARCHAR(6) PRIMARY KEY DEFAULT generate_short_id(),
    cd INTEGER NOT NULL DEFAULT 2,
    endereco VARCHAR(20) NOT NULL UNIQUE,
    zona VARCHAR(4) NOT NULL,
    bloco VARCHAR(3) NOT NULL DEFAULT '001',
    coluna VARCHAR(3) NOT NULL,
    nivel VARCHAR(3) NOT NULL,
    descricao TEXT DEFAULT 'Endereço de fralda',
    ativo BOOLEAN DEFAULT TRUE,
    created_at TEXT DEFAULT TO_CHAR(NOW() AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI:SS'),
    updated_at TEXT DEFAULT TO_CHAR(NOW() AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI:SS'),
    
    CONSTRAINT check_zona CHECK (zona ~ '^PF(0[1-9]|1[0-5])$'),
    CONSTRAINT check_bloco CHECK (bloco = '001'),
    CONSTRAINT check_coluna CHECK (coluna ~ '^(0(0[1-9]|1[0-9])|019)$'),
    CONSTRAINT check_nivel CHECK (nivel IN ('A0T', 'A01', 'A02', 'A04', 'A05', 'A06'))
);

-- Índices
CREATE INDEX idx_enderecos_fraldas_cd ON enderecos_fraldas(cd);
CREATE INDEX idx_enderecos_fraldas_zona ON enderecos_fraldas(zona);
CREATE INDEX idx_enderecos_fraldas_nivel ON enderecos_fraldas(nivel);
CREATE INDEX idx_enderecos_fraldas_ativo ON enderecos_fraldas(ativo);
CREATE INDEX idx_enderecos_fraldas_endereco ON enderecos_fraldas(endereco);

-- =========================================================
-- 4. Criar tabela alocacoes_fraldas
-- =========================================================
CREATE TABLE alocacoes_fraldas (
    id VARCHAR(6) PRIMARY KEY DEFAULT generate_short_id(),
    endereco_id VARCHAR(6) NOT NULL REFERENCES enderecos_fraldas(id) ON DELETE CASCADE,
    endereco VARCHAR(20) NOT NULL,
    coddv VARCHAR(20) NOT NULL,
    descricao_produto TEXT,
    cd INTEGER NOT NULL DEFAULT 2,
    data_alocacao TEXT DEFAULT TO_CHAR(NOW() AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI:SS'),
    usuario VARCHAR(100),
    matricula VARCHAR(20),
    ativo BOOLEAN DEFAULT TRUE,
    created_at TEXT DEFAULT TO_CHAR(NOW() AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI:SS'),
    updated_at TEXT DEFAULT TO_CHAR(NOW() AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI:SS'),
    
    CONSTRAINT unique_produto_endereco UNIQUE (endereco_id, coddv)
);

-- Índices
CREATE INDEX idx_alocacoes_fraldas_endereco ON alocacoes_fraldas(endereco);
CREATE INDEX idx_alocacoes_fraldas_coddv ON alocacoes_fraldas(coddv);
CREATE INDEX idx_alocacoes_fraldas_endereco_id ON alocacoes_fraldas(endereco_id);
CREATE INDEX idx_alocacoes_fraldas_ativo ON alocacoes_fraldas(ativo);
CREATE INDEX idx_alocacoes_fraldas_cd ON alocacoes_fraldas(cd);

-- =========================================================
-- 5. Criar tabela historico_enderecamento_fraldas
-- =========================================================
CREATE TABLE historico_enderecamento_fraldas (
    id VARCHAR(6) PRIMARY KEY DEFAULT generate_short_id(),
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('CADASTRO', 'ALOCACAO', 'DESALOCACAO', 'TRANSFERENCIA')),
    endereco VARCHAR(20) NOT NULL,
    endereco_destino VARCHAR(20),
    coddv VARCHAR(20),
    descricao_produto TEXT,
    observacao TEXT,
    usuario VARCHAR(100),
    matricula VARCHAR(20),
    cd INTEGER DEFAULT 2,
    data_hora TEXT DEFAULT TO_CHAR(NOW() AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI:SS'),
    created_at TEXT DEFAULT TO_CHAR(NOW() AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI:SS')
);

-- Índices
CREATE INDEX idx_historico_enderecamento_tipo ON historico_enderecamento_fraldas(tipo);
CREATE INDEX idx_historico_enderecamento_endereco ON historico_enderecamento_fraldas(endereco);
CREATE INDEX idx_historico_enderecamento_coddv ON historico_enderecamento_fraldas(coddv);
CREATE INDEX idx_historico_enderecamento_data ON historico_enderecamento_fraldas(data_hora);

-- =========================================================
-- 5. Trigger para verificar máximo 2 produtos por endereço
-- =========================================================
CREATE OR REPLACE FUNCTION check_max_produtos_por_endereco()
RETURNS TRIGGER AS $$
DECLARE
    count_produtos INTEGER;
BEGIN
    SELECT COUNT(*) INTO count_produtos
    FROM alocacoes_fraldas
    WHERE endereco_id = NEW.endereco_id AND ativo = TRUE;
    
    IF count_produtos >= 2 THEN
        RAISE EXCEPTION 'Endereço já possui o máximo de 2 produtos alocados';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_check_max_produtos ON alocacoes_fraldas;
CREATE TRIGGER trigger_check_max_produtos
BEFORE INSERT ON alocacoes_fraldas
FOR EACH ROW
EXECUTE FUNCTION check_max_produtos_por_endereco();

-- =========================================================
-- 6. Trigger para atualizar updated_at
-- =========================================================
CREATE OR REPLACE FUNCTION update_updated_at_column_br()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TO_CHAR(NOW() AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI:SS');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_enderecos_updated_at ON enderecos_fraldas;
CREATE TRIGGER trigger_enderecos_updated_at
BEFORE UPDATE ON enderecos_fraldas
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column_br();

DROP TRIGGER IF EXISTS trigger_alocacoes_updated_at ON alocacoes_fraldas;
CREATE TRIGGER trigger_alocacoes_updated_at
BEFORE UPDATE ON alocacoes_fraldas
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column_br();

-- =========================================================
-- 7. RLS (Row Level Security)
-- =========================================================
ALTER TABLE enderecos_fraldas ENABLE ROW LEVEL SECURITY;
ALTER TABLE alocacoes_fraldas ENABLE ROW LEVEL SECURITY;
ALTER TABLE historico_enderecamento_fraldas ENABLE ROW LEVEL SECURITY;

-- Políticas para endereços
DROP POLICY IF EXISTS "Permitir leitura pública de endereços" ON enderecos_fraldas;
CREATE POLICY "Permitir leitura pública de endereços" ON enderecos_fraldas FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir inserção pública de endereços" ON enderecos_fraldas;
CREATE POLICY "Permitir inserção pública de endereços" ON enderecos_fraldas FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir atualização pública de endereços" ON enderecos_fraldas;
CREATE POLICY "Permitir atualização pública de endereços" ON enderecos_fraldas FOR UPDATE USING (true);

-- Políticas para alocações
DROP POLICY IF EXISTS "Permitir leitura pública de alocações" ON alocacoes_fraldas;
CREATE POLICY "Permitir leitura pública de alocações" ON alocacoes_fraldas FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir inserção pública de alocações" ON alocacoes_fraldas;
CREATE POLICY "Permitir inserção pública de alocações" ON alocacoes_fraldas FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir atualização pública de alocações" ON alocacoes_fraldas;
CREATE POLICY "Permitir atualização pública de alocações" ON alocacoes_fraldas FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Permitir exclusão pública de alocações" ON alocacoes_fraldas;
CREATE POLICY "Permitir exclusão pública de alocações" ON alocacoes_fraldas FOR DELETE USING (true);

-- Políticas para histórico
DROP POLICY IF EXISTS "Permitir leitura pública de histórico" ON historico_enderecamento_fraldas;
CREATE POLICY "Permitir leitura pública de histórico" ON historico_enderecamento_fraldas FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir inserção pública de histórico" ON historico_enderecamento_fraldas;
CREATE POLICY "Permitir inserção pública de histórico" ON historico_enderecamento_fraldas FOR INSERT WITH CHECK (true);

-- =========================================================
-- 8. Funções atualizadas com formato de data BR
-- =========================================================

-- Dropar funções existentes para recriar com novo tipo
DROP FUNCTION IF EXISTS get_enderecos_com_status(INTEGER);
DROP FUNCTION IF EXISTS get_produtos_no_endereco(VARCHAR);
DROP FUNCTION IF EXISTS alocar_produto_fralda(VARCHAR, VARCHAR, TEXT, VARCHAR, VARCHAR, INTEGER);
DROP FUNCTION IF EXISTS desalocar_produto_fralda(VARCHAR, VARCHAR, VARCHAR, VARCHAR);
DROP FUNCTION IF EXISTS transferir_produto_fralda(VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, INTEGER);

-- Função para buscar endereços com status
CREATE OR REPLACE FUNCTION get_enderecos_com_status(p_cd INTEGER DEFAULT 2)
RETURNS TABLE (
    id VARCHAR,
    endereco VARCHAR,
    zona VARCHAR,
    coluna VARCHAR,
    nivel VARCHAR,
    descricao TEXT,
    ativo BOOLEAN,
    produtos_alocados BIGINT,
    espaco_disponivel INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id,
        e.endereco,
        e.zona,
        e.coluna,
        e.nivel,
        e.descricao,
        e.ativo,
        COUNT(a.id) AS produtos_alocados,
        (2 - COUNT(a.id)::INTEGER) AS espaco_disponivel
    FROM enderecos_fraldas e
    LEFT JOIN alocacoes_fraldas a ON e.id = a.endereco_id AND a.ativo = TRUE
    WHERE e.cd = p_cd AND e.ativo = TRUE
    GROUP BY e.id, e.endereco, e.zona, e.coluna, e.nivel, e.descricao, e.ativo
    ORDER BY e.endereco;
END;
$$ LANGUAGE plpgsql;

-- Função para alocar produto
CREATE OR REPLACE FUNCTION alocar_produto_fralda(
    p_endereco VARCHAR,
    p_coddv VARCHAR,
    p_descricao_produto TEXT,
    p_usuario VARCHAR DEFAULT NULL,
    p_matricula VARCHAR DEFAULT NULL,
    p_cd INTEGER DEFAULT 2
) RETURNS VARCHAR AS $$
DECLARE
    v_endereco_id VARCHAR(6);
    v_alocacao_id VARCHAR(6);
    v_count INTEGER;
    v_data_hora TEXT;
BEGIN
    v_data_hora := TO_CHAR(NOW() AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI:SS');
    
    -- Buscar ID do endereço
    SELECT id INTO v_endereco_id
    FROM enderecos_fraldas
    WHERE endereco = p_endereco AND cd = p_cd AND ativo = TRUE;
    
    IF v_endereco_id IS NULL THEN
        RAISE EXCEPTION 'Endereço não encontrado ou inativo: %', p_endereco;
    END IF;
    
    -- Verificar se produto já está neste endereço
    SELECT COUNT(*) INTO v_count
    FROM alocacoes_fraldas
    WHERE endereco_id = v_endereco_id AND coddv = p_coddv AND ativo = TRUE;
    
    IF v_count > 0 THEN
        RAISE EXCEPTION 'Produto % já está alocado neste endereço', p_coddv;
    END IF;
    
    -- Inserir alocação
    INSERT INTO alocacoes_fraldas (endereco_id, endereco, coddv, descricao_produto, usuario, matricula, cd, data_alocacao)
    VALUES (v_endereco_id, p_endereco, p_coddv, p_descricao_produto, p_usuario, p_matricula, p_cd, v_data_hora)
    RETURNING id INTO v_alocacao_id;
    
    -- Registrar no histórico
    INSERT INTO historico_enderecamento_fraldas (tipo, endereco, coddv, descricao_produto, usuario, matricula, cd, data_hora)
    VALUES ('ALOCACAO', p_endereco, p_coddv, p_descricao_produto, p_usuario, p_matricula, p_cd, v_data_hora);
    
    RETURN v_alocacao_id;
END;
$$ LANGUAGE plpgsql;

-- Função para desalocar produto
CREATE OR REPLACE FUNCTION desalocar_produto_fralda(
    p_endereco VARCHAR,
    p_coddv VARCHAR,
    p_usuario VARCHAR DEFAULT NULL,
    p_matricula VARCHAR DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    v_alocacao_id VARCHAR(6);
    v_descricao TEXT;
    v_data_hora TEXT;
BEGIN
    v_data_hora := TO_CHAR(NOW() AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI:SS');
    
    -- Buscar alocação
    SELECT id, descricao_produto INTO v_alocacao_id, v_descricao
    FROM alocacoes_fraldas
    WHERE endereco = p_endereco AND coddv = p_coddv AND ativo = TRUE;
    
    IF v_alocacao_id IS NULL THEN
        RAISE EXCEPTION 'Produto % não está alocado no endereço %', p_coddv, p_endereco;
    END IF;
    
    -- Marcar como inativo (soft delete)
    UPDATE alocacoes_fraldas
    SET ativo = FALSE
    WHERE id = v_alocacao_id;
    
    -- Registrar no histórico
    INSERT INTO historico_enderecamento_fraldas (tipo, endereco, coddv, descricao_produto, usuario, matricula, data_hora)
    VALUES ('DESALOCACAO', p_endereco, p_coddv, v_descricao, p_usuario, p_matricula, v_data_hora);
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Função para transferir produto
CREATE OR REPLACE FUNCTION transferir_produto_fralda(
    p_endereco_origem VARCHAR,
    p_endereco_destino VARCHAR,
    p_coddv VARCHAR,
    p_usuario VARCHAR DEFAULT NULL,
    p_matricula VARCHAR DEFAULT NULL,
    p_cd INTEGER DEFAULT 2
) RETURNS VARCHAR AS $$
DECLARE
    v_endereco_destino_id VARCHAR(6);
    v_alocacao_id VARCHAR(6);
    v_descricao TEXT;
    v_nova_alocacao_id VARCHAR(6);
    v_data_hora TEXT;
BEGIN
    v_data_hora := TO_CHAR(NOW() AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI:SS');
    
    -- Buscar ID do endereço destino
    SELECT id INTO v_endereco_destino_id
    FROM enderecos_fraldas
    WHERE endereco = p_endereco_destino AND cd = p_cd AND ativo = TRUE;
    
    IF v_endereco_destino_id IS NULL THEN
        RAISE EXCEPTION 'Endereço destino não encontrado: %', p_endereco_destino;
    END IF;
    
    -- Buscar alocação origem
    SELECT id, descricao_produto INTO v_alocacao_id, v_descricao
    FROM alocacoes_fraldas
    WHERE endereco = p_endereco_origem AND coddv = p_coddv AND ativo = TRUE;
    
    IF v_alocacao_id IS NULL THEN
        RAISE EXCEPTION 'Produto % não está alocado no endereço origem %', p_coddv, p_endereco_origem;
    END IF;
    
    -- Desativar alocação antiga
    UPDATE alocacoes_fraldas
    SET ativo = FALSE
    WHERE id = v_alocacao_id;
    
    -- Criar nova alocação no destino
    INSERT INTO alocacoes_fraldas (endereco_id, endereco, coddv, descricao_produto, usuario, matricula, cd, data_alocacao)
    VALUES (v_endereco_destino_id, p_endereco_destino, p_coddv, v_descricao, p_usuario, p_matricula, p_cd, v_data_hora)
    RETURNING id INTO v_nova_alocacao_id;
    
    -- Registrar no histórico
    INSERT INTO historico_enderecamento_fraldas (tipo, endereco, endereco_destino, coddv, descricao_produto, usuario, matricula, observacao, data_hora)
    VALUES ('TRANSFERENCIA', p_endereco_origem, p_endereco_destino, p_coddv, v_descricao, p_usuario, p_matricula, 
            'De: ' || p_endereco_origem || ' Para: ' || p_endereco_destino, v_data_hora);
    
    RETURN v_nova_alocacao_id;
END;
$$ LANGUAGE plpgsql;

-- =========================================================
-- 9. Reinserir todos os endereços
-- =========================================================
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
        WHEN 'A04' THEN '4º Andar'
        WHEN 'A05' THEN '5º Andar'
        WHEN 'A06' THEN '6º Andar'
    END AS descricao,
    TRUE AS ativo
FROM 
    generate_series(1, 15) AS zona,
    generate_series(1, 19) AS coluna,
    unnest(ARRAY['A0T', 'A01', 'A02', 'A04', 'A05', 'A06']) AS nivel
ON CONFLICT (endereco) DO NOTHING;

-- =========================================================
-- 10. Verificações
-- =========================================================
SELECT 'Total de endereços:' AS info, COUNT(*) AS total FROM enderecos_fraldas WHERE cd = 2;

SELECT 
    'Exemplo de registros:' AS info,
    id, endereco, zona, coluna, nivel, created_at 
FROM enderecos_fraldas 
WHERE cd = 2 
LIMIT 5;
