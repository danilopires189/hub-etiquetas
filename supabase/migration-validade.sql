-- Adicionar coluna validade
ALTER TABLE alocacoes_fraldas ADD COLUMN IF NOT EXISTS validade VARCHAR(4);
ALTER TABLE historico_enderecamento_fraldas ADD COLUMN IF NOT EXISTS validade VARCHAR(4);

-- Remover funções antigas para evitar conflitos de assinatura/tipo de retorno
DROP FUNCTION IF EXISTS alocar_produto_fralda(VARCHAR, VARCHAR, TEXT, VARCHAR, VARCHAR, INTEGER);
DROP FUNCTION IF EXISTS transferir_produto_fralda(VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, INTEGER);

-- Atualizar função alocar_produto_fralda
CREATE OR REPLACE FUNCTION alocar_produto_fralda(
    p_endereco VARCHAR,
    p_coddv VARCHAR,
    p_descricao_produto TEXT,
    p_validade VARCHAR, -- Nova coluna
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
    INSERT INTO alocacoes_fraldas (endereco_id, endereco, coddv, descricao_produto, validade, usuario, matricula, cd)
    VALUES (v_endereco_id, p_endereco, p_coddv, p_descricao_produto, p_validade, p_usuario, p_matricula, p_cd)
    RETURNING id INTO v_alocacao_id;
    
    -- Registrar no histórico
    INSERT INTO historico_enderecamento_fraldas (tipo, endereco, coddv, descricao_produto, validade, usuario, matricula, cd)
    VALUES ('ALOCACAO', p_endereco, p_coddv, p_descricao_produto, p_validade, p_usuario, p_matricula, p_cd);
    
    RETURN v_alocacao_id;
END;
$$ LANGUAGE plpgsql;

-- Atualizar função transferir_produto_fralda para copiar validade
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
    v_validade VARCHAR; -- Nova variável
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
    SELECT id, descricao_produto, validade INTO v_alocacao_id, v_descricao, v_validade
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
    INSERT INTO alocacoes_fraldas (endereco_id, endereco, coddv, descricao_produto, validade, usuario, matricula, cd)
    VALUES (v_endereco_destino_id, p_endereco_destino, p_coddv, v_descricao, v_validade, p_usuario, p_matricula, p_cd)
    RETURNING id INTO v_nova_alocacao_id;
    
    -- Registrar no histórico
    INSERT INTO historico_enderecamento_fraldas (tipo, endereco, endereco_destino, coddv, descricao_produto, validade, usuario, matricula, observacao)
    VALUES ('TRANSFERENCIA', p_endereco_origem, p_endereco_destino, p_coddv, v_descricao, v_validade, p_usuario, p_matricula, 
            'De: ' || p_endereco_origem || ' Para: ' || p_endereco_destino);
    
    RETURN v_nova_alocacao_id;
END;
$$ LANGUAGE plpgsql;
