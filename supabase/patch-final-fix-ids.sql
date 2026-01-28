-- CORREÇÃO FINAL: REMOVENDO CASTS DE UUID E AJUSTANDO FORMATOS DE DATA
-- Este script resolve o erro "invalid input syntax for type uuid" 
-- e mantém a compatibilidade com IDs de 6 caracteres (VARCHAR).

BEGIN;

-- 1. Recriar função alocar_produto_fralda
CREATE OR REPLACE FUNCTION alocar_produto_fralda(
    p_endereco VARCHAR,
    p_coddv VARCHAR,
    p_descricao_produto TEXT,
    p_validade VARCHAR DEFAULT NULL,
    p_usuario VARCHAR DEFAULT NULL,
    p_matricula VARCHAR DEFAULT NULL,
    p_cd INTEGER DEFAULT 2
) RETURNS VARCHAR AS $$
DECLARE
    v_endereco_id VARCHAR;
    v_alocacao_id VARCHAR;
    v_count INTEGER;
    v_data_hora TEXT;
BEGIN
    -- Capturar data/hora no formato BR (Consistência com o Patch de IDs)
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
    
    -- Inserir alocação (REMOVIDO ::UUID para suportar IDs alfanuméricos)
    INSERT INTO alocacoes_fraldas (
        endereco_id, endereco, coddv, descricao_produto, 
        validade, usuario, matricula, cd, data_alocacao, created_at, updated_at
    )
    VALUES (
        v_endereco_id, p_endereco, p_coddv, p_descricao_produto, 
        p_validade, p_usuario, p_matricula, p_cd, v_data_hora, v_data_hora, v_data_hora
    )
    RETURNING id INTO v_alocacao_id;
    
    -- Registrar no histórico
    INSERT INTO historico_enderecamento_fraldas (
        tipo, endereco, coddv, descricao_produto, 
        validade, usuario, matricula, cd, data_hora, created_at
    )
    VALUES (
        'ALOCACAO', p_endereco, p_coddv, p_descricao_produto, 
        p_validade, p_usuario, p_matricula, p_cd, v_data_hora, v_data_hora
    );
    
    RETURN v_alocacao_id;
EXCEPTION
    WHEN OTHERS THEN
       RAISE EXCEPTION 'Erro na alocação: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- 2. Recriar função transferir_produto_fralda
CREATE OR REPLACE FUNCTION transferir_produto_fralda(
    p_endereco_origem VARCHAR,
    p_endereco_destino VARCHAR,
    p_coddv VARCHAR,
    p_usuario VARCHAR DEFAULT NULL,
    p_matricula VARCHAR DEFAULT NULL,
    p_cd INTEGER DEFAULT 2
) RETURNS VARCHAR AS $$
DECLARE
    v_endereco_destino_id VARCHAR;
    v_alocacao_id VARCHAR;
    v_descricao TEXT;
    v_validade VARCHAR;
    v_nova_alocacao_id VARCHAR;
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
    SELECT id, descricao_produto, validade INTO v_alocacao_id, v_descricao, v_validade
    FROM alocacoes_fraldas
    WHERE endereco = p_endereco_origem AND coddv = p_coddv AND ativo = TRUE;
    
    IF v_alocacao_id IS NULL THEN
        RAISE EXCEPTION 'Produto % não está alocado no endereço origem %', p_coddv, p_endereco_origem;
    END IF;
    
    -- Desativar alocação antiga
    UPDATE alocacoes_fraldas
    SET ativo = FALSE, updated_at = v_data_hora
    WHERE id = v_alocacao_id;
    
    -- Criar nova alocação no destino (REMOVIDO ::UUID)
    INSERT INTO alocacoes_fraldas (
        endereco_id, endereco, coddv, descricao_produto, 
        validade, usuario, matricula, cd, data_alocacao, created_at, updated_at
    )
    VALUES (
        v_endereco_destino_id, p_endereco_destino, p_coddv, v_descricao, 
        v_validade, p_usuario, p_matricula, p_cd, v_data_hora, v_data_hora, v_data_hora
    )
    RETURNING id INTO v_nova_alocacao_id;
    
    -- Registrar no histórico
    INSERT INTO historico_enderecamento_fraldas (
        tipo, endereco, endereco_destino, coddv, descricao_produto, 
        validade, usuario, matricula, observacao, data_hora, created_at
    )
    VALUES (
        'TRANSFERENCIA', p_endereco_origem, p_endereco_destino, p_coddv, v_descricao, 
        v_validade, p_usuario, p_matricula, 'De: ' || p_endereco_origem || ' Para: ' || p_endereco_destino, 
        v_data_hora, v_data_hora
    );
    
    RETURN v_nova_alocacao_id;
EXCEPTION
    WHEN OTHERS THEN
       RAISE EXCEPTION 'Erro na transferência: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

COMMIT;
