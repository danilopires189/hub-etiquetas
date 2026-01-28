-- Schema do Banco de Dados para Endereçamento de Fraldas
-- Execute este script no SQL Editor do Supabase

-- =========================================================
-- TABELA: enderecos_fraldas
-- Armazena todos os endereços possíveis para fraldas
-- =========================================================
CREATE TABLE IF NOT EXISTS enderecos_fraldas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cd INTEGER NOT NULL DEFAULT 2,
    endereco VARCHAR(100) NOT NULL UNIQUE,
    zona VARCHAR(4) NOT NULL,          -- PF01 a PF15
    bloco VARCHAR(3) NOT NULL DEFAULT '001',
    coluna VARCHAR(3) NOT NULL,        -- 001 a 019
    nivel VARCHAR(3) NOT NULL,         -- A0T, A01, A02, A03, A04, A05, A06
    descricao TEXT DEFAULT 'Endereço de fralda',
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraint para validar formato
    CONSTRAINT check_zona CHECK (zona ~ '^PF(0[1-9]|1[0-5])$'),
    CONSTRAINT check_bloco CHECK (bloco = '001'),
    CONSTRAINT check_coluna CHECK (coluna ~ '^(0(0[1-9]|1[0-9])|019)$'),
    CONSTRAINT check_nivel CHECK (nivel IN ('A0T', 'A01', 'A02', 'A03', 'A04', 'A05', 'A06'))
);

-- Índices para otimização
CREATE INDEX IF NOT EXISTS idx_enderecos_fraldas_cd ON enderecos_fraldas(cd);
CREATE INDEX IF NOT EXISTS idx_enderecos_fraldas_zona ON enderecos_fraldas(zona);
CREATE INDEX IF NOT EXISTS idx_enderecos_fraldas_nivel ON enderecos_fraldas(nivel);
CREATE INDEX IF NOT EXISTS idx_enderecos_fraldas_ativo ON enderecos_fraldas(ativo);
CREATE INDEX IF NOT EXISTS idx_enderecos_fraldas_endereco ON enderecos_fraldas(endereco);

-- =========================================================
-- TABELA: alocacoes_fraldas
-- Armazena as alocações de produtos nos endereços
-- =========================================================
CREATE TABLE IF NOT EXISTS alocacoes_fraldas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    endereco_id UUID NOT NULL REFERENCES enderecos_fraldas(id) ON DELETE CASCADE,
    endereco VARCHAR(100) NOT NULL,
    coddv VARCHAR(100) NOT NULL,
    descricao_produto TEXT,
    cd INTEGER NOT NULL DEFAULT 2,
    data_alocacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    usuario VARCHAR(100),
    matricula VARCHAR(100),
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Máximo de 2 produtos por endereço (verificado via trigger)
    CONSTRAINT unique_produto_endereco UNIQUE (endereco_id, coddv)
);

-- Índices para alocações
CREATE INDEX IF NOT EXISTS idx_alocacoes_fraldas_endereco ON alocacoes_fraldas(endereco);
CREATE INDEX IF NOT EXISTS idx_alocacoes_fraldas_coddv ON alocacoes_fraldas(coddv);
CREATE INDEX IF NOT EXISTS idx_alocacoes_fraldas_endereco_id ON alocacoes_fraldas(endereco_id);
CREATE INDEX IF NOT EXISTS idx_alocacoes_fraldas_ativo ON alocacoes_fraldas(ativo);
CREATE INDEX IF NOT EXISTS idx_alocacoes_fraldas_cd ON alocacoes_fraldas(cd);

-- =========================================================
-- TABELA: historico_enderecamento_fraldas
-- Armazena o histórico de operações
-- =========================================================
CREATE TABLE IF NOT EXISTS historico_enderecamento_fraldas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('CADASTRO', 'ALOCACAO', 'DESALOCACAO', 'TRANSFERENCIA')),
    endereco VARCHAR(100) NOT NULL,
    endereco_destino VARCHAR(100),
    coddv VARCHAR(100),
    descricao_produto TEXT,
    observacao TEXT,
    usuario VARCHAR(100),
    matricula VARCHAR(100),
    cd INTEGER DEFAULT 2,
    data_hora TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para histórico
CREATE INDEX IF NOT EXISTS idx_historico_enderecamento_tipo ON historico_enderecamento_fraldas(tipo);
CREATE INDEX IF NOT EXISTS idx_historico_enderecamento_endereco ON historico_enderecamento_fraldas(endereco);
CREATE INDEX IF NOT EXISTS idx_historico_enderecamento_coddv ON historico_enderecamento_fraldas(coddv);
CREATE INDEX IF NOT EXISTS idx_historico_enderecamento_data ON historico_enderecamento_fraldas(data_hora);

-- =========================================================
-- TRIGGER: Limitar 2 produtos por endereço
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
-- TRIGGER: Atualizar updated_at automaticamente
-- =========================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_enderecos_updated_at ON enderecos_fraldas;
CREATE TRIGGER trigger_enderecos_updated_at
BEFORE UPDATE ON enderecos_fraldas
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_alocacoes_updated_at ON alocacoes_fraldas;
CREATE TRIGGER trigger_alocacoes_updated_at
BEFORE UPDATE ON alocacoes_fraldas
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- =========================================================
-- RLS (Row Level Security)
-- =========================================================
ALTER TABLE enderecos_fraldas ENABLE ROW LEVEL SECURITY;
ALTER TABLE alocacoes_fraldas ENABLE ROW LEVEL SECURITY;
ALTER TABLE historico_enderecamento_fraldas ENABLE ROW LEVEL SECURITY;

-- Políticas para endereços
CREATE POLICY "Permitir leitura pública de endereços" ON enderecos_fraldas
    FOR SELECT USING (true);

CREATE POLICY "Permitir inserção pública de endereços" ON enderecos_fraldas
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir atualização pública de endereços" ON enderecos_fraldas
    FOR UPDATE USING (true);

-- Políticas para alocações
CREATE POLICY "Permitir leitura pública de alocações" ON alocacoes_fraldas
    FOR SELECT USING (true);

CREATE POLICY "Permitir inserção pública de alocações" ON alocacoes_fraldas
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir atualização pública de alocações" ON alocacoes_fraldas
    FOR UPDATE USING (true);

CREATE POLICY "Permitir exclusão pública de alocações" ON alocacoes_fraldas
    FOR DELETE USING (true);

-- Políticas para histórico
CREATE POLICY "Permitir leitura pública de histórico" ON historico_enderecamento_fraldas
    FOR SELECT USING (true);

CREATE POLICY "Permitir inserção pública de histórico" ON historico_enderecamento_fraldas
    FOR INSERT WITH CHECK (true);

-- =========================================================
-- FUNÇÃO: Buscar endereços com status de ocupação
-- =========================================================
CREATE OR REPLACE FUNCTION get_enderecos_com_status(p_cd INTEGER DEFAULT 2)
RETURNS TABLE (
    id UUID,
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

-- =========================================================
-- FUNÇÃO: Buscar produtos alocados em um endereço
-- =========================================================
CREATE OR REPLACE FUNCTION get_produtos_no_endereco(p_endereco VARCHAR)
RETURNS TABLE (
    id UUID,
    coddv VARCHAR,
    descricao_produto TEXT,
    data_alocacao TIMESTAMP WITH TIME ZONE,
    usuario VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.coddv,
        a.descricao_produto,
        a.data_alocacao,
        a.usuario
    FROM alocacoes_fraldas a
    WHERE a.endereco = p_endereco AND a.ativo = TRUE
    ORDER BY a.data_alocacao;
END;
$$ LANGUAGE plpgsql;

-- =========================================================
-- FUNÇÃO: Alocar produto com validação
-- =========================================================
CREATE OR REPLACE FUNCTION alocar_produto_fralda(
    p_endereco VARCHAR,
    p_coddv VARCHAR,
    p_descricao_produto TEXT,
    p_usuario VARCHAR DEFAULT NULL,
    p_matricula VARCHAR DEFAULT NULL,
    p_cd INTEGER DEFAULT 2
) RETURNS UUID AS $$
DECLARE
    v_endereco_id UUID;
    v_alocacao_id UUID;
    v_count INTEGER;
BEGIN
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
    INSERT INTO alocacoes_fraldas (endereco_id, endereco, coddv, descricao_produto, usuario, matricula, cd)
    VALUES (v_endereco_id, p_endereco, p_coddv, p_descricao_produto, p_usuario, p_matricula, p_cd)
    RETURNING id INTO v_alocacao_id;
    
    -- Registrar no histórico
    INSERT INTO historico_enderecamento_fraldas (tipo, endereco, coddv, descricao_produto, usuario, matricula, cd)
    VALUES ('ALOCACAO', p_endereco, p_coddv, p_descricao_produto, p_usuario, p_matricula, p_cd);
    
    RETURN v_alocacao_id;
END;
$$ LANGUAGE plpgsql;

-- =========================================================
-- FUNÇÃO: Desalocar produto
-- =========================================================
CREATE OR REPLACE FUNCTION desalocar_produto_fralda(
    p_endereco VARCHAR,
    p_coddv VARCHAR,
    p_usuario VARCHAR DEFAULT NULL,
    p_matricula VARCHAR DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    v_alocacao_id UUID;
    v_descricao TEXT;
BEGIN
    -- Buscar alocação
    SELECT id, descricao_produto INTO v_alocacao_id, v_descricao
    FROM alocacoes_fraldas
    WHERE endereco = p_endereco AND coddv = p_coddv AND ativo = TRUE;
    
    IF v_alocacao_id IS NULL THEN
        RAISE EXCEPTION 'Produto % não está alocado no endereço %', p_coddv, p_endereco;
    END IF;
    
    -- Marcar como inativo (soft delete)
    UPDATE alocacoes_fraldas
    SET ativo = FALSE, updated_at = NOW()
    WHERE id = v_alocacao_id;
    
    -- Registrar no histórico
    INSERT INTO historico_enderecamento_fraldas (tipo, endereco, coddv, descricao_produto, usuario, matricula)
    VALUES ('DESALOCACAO', p_endereco, p_coddv, v_descricao, p_usuario, p_matricula);
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- =========================================================
-- FUNÇÃO: Transferir produto entre endereços
-- =========================================================
CREATE OR REPLACE FUNCTION transferir_produto_fralda(
    p_endereco_origem VARCHAR,
    p_endereco_destino VARCHAR,
    p_coddv VARCHAR,
    p_usuario VARCHAR DEFAULT NULL,
    p_matricula VARCHAR DEFAULT NULL,
    p_cd INTEGER DEFAULT 2
) RETURNS UUID AS $$
DECLARE
    v_endereco_destino_id UUID;
    v_alocacao_id UUID;
    v_descricao TEXT;
    v_nova_alocacao_id UUID;
BEGIN
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
    SET ativo = FALSE, updated_at = NOW()
    WHERE id = v_alocacao_id;
    
    -- Criar nova alocação no destino
    INSERT INTO alocacoes_fraldas (endereco_id, endereco, coddv, descricao_produto, usuario, matricula, cd)
    VALUES (v_endereco_destino_id, p_endereco_destino, p_coddv, v_descricao, p_usuario, p_matricula, p_cd)
    RETURNING id INTO v_nova_alocacao_id;
    
    -- Registrar no histórico
    INSERT INTO historico_enderecamento_fraldas (tipo, endereco, endereco_destino, coddv, descricao_produto, usuario, matricula, observacao)
    VALUES ('TRANSFERENCIA', p_endereco_origem, p_endereco_destino, p_coddv, v_descricao, p_usuario, p_matricula, 
            'De: ' || p_endereco_origem || ' Para: ' || p_endereco_destino);
    
    RETURN v_nova_alocacao_id;
END;
$$ LANGUAGE plpgsql;

-- =========================================================
-- COMENTÁRIOS
-- =========================================================
COMMENT ON TABLE enderecos_fraldas IS 'Endereços de armazenamento de fraldas no CD';
COMMENT ON TABLE alocacoes_fraldas IS 'Alocações de produtos nos endereços de fraldas';
COMMENT ON TABLE historico_enderecamento_fraldas IS 'Histórico de operações de endereçamento';
COMMENT ON FUNCTION get_enderecos_com_status IS 'Retorna endereços com contagem de produtos alocados';
COMMENT ON FUNCTION alocar_produto_fralda IS 'Aloca um produto em um endereço com validação';
COMMENT ON FUNCTION desalocar_produto_fralda IS 'Remove alocação de um produto (soft delete)';
COMMENT ON FUNCTION transferir_produto_fralda IS 'Transfere produto entre endereços';
