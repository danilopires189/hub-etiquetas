-- CORREÇÃO DO ERRO DE UUID NA TRANSFERÊNCIA
-- Este patch corrige o erro "invalid input syntax for type uuid" na função transferir_produto_fralda

BEGIN;

-- Recriar função transferir_produto_fralda com correção de tipos
CREATE OR REPLACE FUNCTION transferir_produto_fralda(
    p_endereco_origem VARCHAR,
    p_endereco_destino VARCHAR,
    p_coddv VARCHAR,
    p_usuario VARCHAR DEFAULT NULL,
    p_matricula VARCHAR DEFAULT NULL,
    p_cd INTEGER DEFAULT 2
) RETURNS VARCHAR AS $$
DECLARE
    v_endereco_id_destino VARCHAR;
    v_alocacao_id VARCHAR;
    v_descricao TEXT;
    v_validade VARCHAR;
    v_nova_alocacao_id VARCHAR;
    v_data_hora TEXT;
BEGIN
    v_data_hora := TO_CHAR(NOW() AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI:SS');

    -- Buscar ID do endereço destino (tratando como VARCHAR)
    SELECT id::TEXT INTO v_endereco_id_destino
    FROM enderecos_fraldas
    WHERE endereco = p_endereco_destino AND cd = p_cd AND ativo = TRUE;
    
    IF v_endereco_id_destino IS NULL THEN
        RAISE EXCEPTION 'Endereço destino não encontrado: %', p_endereco_destino;
    END IF;
    
    -- Buscar alocação origem (tratando como VARCHAR)
    SELECT id::TEXT, descricao_produto, validade INTO v_alocacao_id, v_descricao, v_validade
    FROM alocacoes_fraldas
    WHERE endereco = p_endereco_origem AND coddv = p_coddv AND ativo = TRUE;
    
    IF v_alocacao_id IS NULL THEN
        RAISE EXCEPTION 'Produto % não está alocado no endereço origem %', p_coddv, p_endereco_origem;
    END IF;

    -- Validar validade na transferência (caso o dado original esteja nulo por ser antigo)
    IF v_validade IS NULL OR v_validade = '' THEN
        RAISE EXCEPTION 'Não é possível transferir: este produto não possui validade cadastrada. Desaloque e aloque novamente informando a validade.';
    END IF;
    
    -- Desativar alocação antiga (usando comparação direta)
    UPDATE alocacoes_fraldas
    SET ativo = FALSE, updated_at = v_data_hora
    WHERE endereco = p_endereco_origem AND coddv = p_coddv AND ativo = TRUE;
    
    -- Criar nova alocação no destino (usando endereco_id como TEXT)
    INSERT INTO alocacoes_fraldas (
        endereco_id, endereco, coddv, descricao_produto, 
        validade, usuario, matricula, cd, data_alocacao, created_at, updated_at
    )
    VALUES (
        v_endereco_id_destino::UUID, -- Cast para UUID apenas na inserção
        p_endereco_destino, p_coddv, v_descricao, 
        v_validade, p_usuario, p_matricula, p_cd, v_data_hora, v_data_hora, v_data_hora
    )
    RETURNING id::TEXT INTO v_nova_alocacao_id;
    
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