-- CORREÇÃO DA ASSINATURA DA FUNÇÃO ALOCAR_PRODUTO_FRALDA
-- Esta correção torna o parâmetro p_validade opcional (DEFAULT NULL)
-- para evitar erros de "Function not found" quando o parâmetro não é enviado.

CREATE OR REPLACE FUNCTION alocar_produto_fralda(
    p_endereco VARCHAR,
    p_coddv VARCHAR,
    p_descricao_produto TEXT,
    p_validade VARCHAR DEFAULT NULL, -- Tornado opcional com default NULL
    p_usuario VARCHAR DEFAULT NULL,
    p_matricula VARCHAR DEFAULT NULL,
    p_cd INTEGER DEFAULT 2
) RETURNS VARCHAR AS $$
DECLARE
    v_endereco_id VARCHAR;
    v_alocacao_id VARCHAR;
    v_count INTEGER;
BEGIN
    -- Buscar ID do endereço
    SELECT id::VARCHAR INTO v_endereco_id
    FROM enderecos_fraldas
    WHERE endereco = p_endereco AND cd = p_cd AND ativo = TRUE;
    
    IF v_endereco_id IS NULL THEN
        RAISE EXCEPTION 'Endereço não encontrado ou inativo: %', p_endereco;
    END IF;
    
    -- Verificar se produto já está neste endereço
    SELECT COUNT(*) INTO v_count
    FROM alocacoes_fraldas
    WHERE endereco_id::VARCHAR = v_endereco_id AND coddv = p_coddv AND ativo = TRUE;
    
    IF v_count > 0 THEN
        RAISE EXCEPTION 'Produto % já está alocado neste endereço', p_coddv;
    END IF;
    
    -- Inserir alocação
    INSERT INTO alocacoes_fraldas (endereco_id, endereco, coddv, descricao_produto, validade, usuario, matricula, cd)
    VALUES (v_endereco_id::UUID, p_endereco, p_coddv, p_descricao_produto, p_validade, p_usuario, p_matricula, p_cd)
    RETURNING id::VARCHAR INTO v_alocacao_id;
    
    -- Registrar no histórico
    INSERT INTO historico_enderecamento_fraldas (tipo, endereco, coddv, descricao_produto, validade, usuario, matricula, cd)
    VALUES ('ALOCACAO', p_endereco, p_coddv, p_descricao_produto, p_validade, p_usuario, p_matricula, p_cd);
    
    RETURN v_alocacao_id;
EXCEPTION
    WHEN OTHERS THEN
       RAISE EXCEPTION 'Erro na alocação: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;
