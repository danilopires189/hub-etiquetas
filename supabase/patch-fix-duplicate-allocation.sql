-- CORREÇÃO PARA PROBLEMAS DE ALOCAÇÃO E DADOS DE USUÁRIO
-- Este patch corrige os problemas de constraint única e busca de nome de usuário

BEGIN;

-- =========================================================
-- 1. ADICIONAR CAMPO VALIDADE NA TABELA ALOCACOES_FRALDAS
-- =========================================================

-- Verificar se a coluna validade já existe
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'alocacoes_fraldas' 
        AND column_name = 'validade'
    ) THEN
        ALTER TABLE alocacoes_fraldas ADD COLUMN validade VARCHAR(4);
        RAISE NOTICE 'Coluna validade adicionada à tabela alocacoes_fraldas';
    ELSE
        RAISE NOTICE 'Coluna validade já existe na tabela alocacoes_fraldas';
    END IF;
END $$;

-- Adicionar coluna validade no histórico também
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'historico_enderecamento_fraldas' 
        AND column_name = 'validade'
    ) THEN
        ALTER TABLE historico_enderecamento_fraldas ADD COLUMN validade VARCHAR(4);
        RAISE NOTICE 'Coluna validade adicionada à tabela historico_enderecamento_fraldas';
    ELSE
        RAISE NOTICE 'Coluna validade já existe na tabela historico_enderecamento_fraldas';
    END IF;
END $$;

-- =========================================================
-- 2. CORRIGIR CONSTRAINT ÚNICA PARA PERMITIR REALOCAÇÃO
-- =========================================================

-- Dropar constraint existente
ALTER TABLE alocacoes_fraldas DROP CONSTRAINT IF EXISTS unique_produto_endereco;

-- Criar nova constraint que considera apenas registros ativos
-- Isso permite que um produto seja realocado no mesmo endereço após desalocação
CREATE UNIQUE INDEX IF NOT EXISTS unique_produto_endereco_ativo 
ON alocacoes_fraldas (endereco_id, coddv) 
WHERE ativo = TRUE;

-- =========================================================
-- 3. ATUALIZAR FUNÇÃO DE ALOCAÇÃO COM VALIDADE
-- =========================================================

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
    
    -- Verificar se produto já está ATIVO neste endereço
    SELECT COUNT(*) INTO v_count
    FROM alocacoes_fraldas
    WHERE endereco_id = v_endereco_id AND coddv = p_coddv AND ativo = TRUE;
    
    IF v_count > 0 THEN
        RAISE EXCEPTION 'Produto % já está alocado neste endereço', p_coddv;
    END IF;
    
    -- Inserir alocação com validade
    INSERT INTO alocacoes_fraldas (
        endereco_id, endereco, coddv, descricao_produto, validade,
        usuario, matricula, cd, data_alocacao, created_at, updated_at
    )
    VALUES (
        v_endereco_id, p_endereco, p_coddv, p_descricao_produto, p_validade,
        p_usuario, p_matricula, p_cd, v_data_hora, v_data_hora, v_data_hora
    )
    RETURNING id INTO v_alocacao_id;
    
    -- Registrar no histórico com validade
    INSERT INTO historico_enderecamento_fraldas (
        tipo, endereco, coddv, descricao_produto, validade,
        usuario, matricula, cd, data_hora, created_at
    )
    VALUES (
        'ALOCACAO', p_endereco, p_coddv, p_descricao_produto, p_validade,
        p_usuario, p_matricula, p_cd, v_data_hora, v_data_hora
    );
    
    RETURN v_alocacao_id;
END;
$$ LANGUAGE plpgsql;

-- =========================================================
-- 4. ATUALIZAR FUNÇÃO DE TRANSFERÊNCIA COM VALIDADE
-- =========================================================

CREATE OR REPLACE FUNCTION transferir_produto_fralda(
    p_endereco_origem VARCHAR,
    p_endereco_destino VARCHAR,
    p_coddv VARCHAR,
    p_usuario VARCHAR DEFAULT NULL,
    p_matricula VARCHAR DEFAULT NULL,
    p_cd INTEGER DEFAULT 2
) RETURNS VARCHAR AS $$
DECLARE
    v_endereco_id_destino VARCHAR(6);
    v_alocacao_id VARCHAR(6);
    v_descricao TEXT;
    v_validade VARCHAR(4);
    v_nova_alocacao_id VARCHAR(6);
    v_data_hora TEXT;
BEGIN
    v_data_hora := TO_CHAR(NOW() AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI:SS');

    -- Buscar ID do endereço destino
    SELECT id INTO v_endereco_id_destino
    FROM enderecos_fraldas
    WHERE endereco = p_endereco_destino AND cd = p_cd AND ativo = TRUE;
    
    IF v_endereco_id_destino IS NULL THEN
        RAISE EXCEPTION 'Endereço destino não encontrado: %', p_endereco_destino;
    END IF;
    
    -- Buscar alocação origem com validade
    SELECT id, descricao_produto, validade INTO v_alocacao_id, v_descricao, v_validade
    FROM alocacoes_fraldas
    WHERE endereco = p_endereco_origem AND coddv = p_coddv AND ativo = TRUE;
    
    IF v_alocacao_id IS NULL THEN
        RAISE EXCEPTION 'Produto % não está alocado no endereço origem %', p_coddv, p_endereco_origem;
    END IF;

    -- Validar validade na transferência
    IF v_validade IS NULL OR v_validade = '' THEN
        RAISE EXCEPTION 'Não é possível transferir: este produto não possui validade cadastrada. Desaloque e aloque novamente informando a validade.';
    END IF;
    
    -- Desativar alocação antiga
    UPDATE alocacoes_fraldas
    SET ativo = FALSE, updated_at = v_data_hora
    WHERE endereco = p_endereco_origem AND coddv = p_coddv AND ativo = TRUE;
    
    -- Criar nova alocação no destino com validade
    INSERT INTO alocacoes_fraldas (
        endereco_id, endereco, coddv, descricao_produto, validade,
        usuario, matricula, cd, data_alocacao, created_at, updated_at
    )
    VALUES (
        v_endereco_id_destino, p_endereco_destino, p_coddv, v_descricao, v_validade,
        p_usuario, p_matricula, p_cd, v_data_hora, v_data_hora, v_data_hora
    )
    RETURNING id INTO v_nova_alocacao_id;
    
    -- Registrar no histórico com validade
    INSERT INTO historico_enderecamento_fraldas (
        tipo, endereco, endereco_destino, coddv, descricao_produto, validade,
        usuario, matricula, observacao, data_hora, created_at
    )
    VALUES (
        'TRANSFERENCIA', p_endereco_origem, p_endereco_destino, p_coddv, v_descricao, v_validade,
        p_usuario, p_matricula, 'De: ' || p_endereco_origem || ' Para: ' || p_endereco_destino, 
        v_data_hora, v_data_hora
    );
    
    RETURN v_nova_alocacao_id;
EXCEPTION
    WHEN OTHERS THEN
       RAISE EXCEPTION 'Erro na transferência: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- =========================================================
-- 5. ATUALIZAR FUNÇÃO DE DESALOCAÇÃO
-- =========================================================

CREATE OR REPLACE FUNCTION desalocar_produto_fralda(
    p_endereco VARCHAR,
    p_coddv VARCHAR,
    p_usuario VARCHAR DEFAULT NULL,
    p_matricula VARCHAR DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    v_alocacao_id VARCHAR(6);
    v_descricao TEXT;
    v_validade VARCHAR(4);
    v_data_hora TEXT;
BEGIN
    v_data_hora := TO_CHAR(NOW() AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI:SS');
    
    -- Buscar alocação com validade
    SELECT id, descricao_produto, validade INTO v_alocacao_id, v_descricao, v_validade
    FROM alocacoes_fraldas
    WHERE endereco = p_endereco AND coddv = p_coddv AND ativo = TRUE;
    
    IF v_alocacao_id IS NULL THEN
        RAISE EXCEPTION 'Produto % não está alocado no endereço %', p_coddv, p_endereco;
    END IF;
    
    -- Marcar como inativo (soft delete)
    UPDATE alocacoes_fraldas
    SET ativo = FALSE, updated_at = v_data_hora
    WHERE id = v_alocacao_id;
    
    -- Registrar no histórico com validade
    INSERT INTO historico_enderecamento_fraldas (
        tipo, endereco, coddv, descricao_produto, validade,
        usuario, matricula, data_hora, created_at
    )
    VALUES (
        'DESALOCACAO', p_endereco, p_coddv, v_descricao, v_validade,
        p_usuario, p_matricula, v_data_hora, v_data_hora
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- =========================================================
-- 6. FUNÇÃO PARA BUSCAR PRODUTOS COM VALIDADE
-- =========================================================

CREATE OR REPLACE FUNCTION get_produtos_no_endereco(p_endereco VARCHAR)
RETURNS TABLE (
    id VARCHAR,
    coddv VARCHAR,
    descricao_produto TEXT,
    validade VARCHAR,
    data_alocacao TEXT,
    usuario VARCHAR,
    matricula VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.coddv,
        a.descricao_produto,
        a.validade,
        a.data_alocacao,
        a.usuario,
        a.matricula
    FROM alocacoes_fraldas a
    WHERE a.endereco = p_endereco AND a.ativo = TRUE
    ORDER BY a.data_alocacao;
END;
$$ LANGUAGE plpgsql;

-- =========================================================
-- 7. LIMPEZA DE DADOS INCONSISTENTES
-- =========================================================

-- Remover alocações duplicadas mantendo apenas a mais recente
WITH duplicates AS (
    SELECT 
        endereco_id, 
        coddv,
        COUNT(*) as count,
        array_agg(id ORDER BY created_at DESC) as ids
    FROM alocacoes_fraldas 
    WHERE ativo = TRUE
    GROUP BY endereco_id, coddv
    HAVING COUNT(*) > 1
)
UPDATE alocacoes_fraldas 
SET ativo = FALSE, 
    updated_at = TO_CHAR(NOW() AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI:SS')
WHERE id IN (
    SELECT unnest(ids[2:]) 
    FROM duplicates
);

-- =========================================================
-- 8. VERIFICAÇÕES FINAIS
-- =========================================================

-- Verificar se há duplicatas ativas
SELECT 
    'Verificação de duplicatas:' as info,
    endereco_id, 
    coddv, 
    COUNT(*) as count
FROM alocacoes_fraldas 
WHERE ativo = TRUE
GROUP BY endereco_id, coddv
HAVING COUNT(*) > 1;

-- Mostrar estatísticas
SELECT 
    'Total de alocações ativas:' as info,
    COUNT(*) as total
FROM alocacoes_fraldas 
WHERE ativo = TRUE;

SELECT 
    'Alocações com validade:' as info,
    COUNT(*) as total
FROM alocacoes_fraldas 
WHERE ativo = TRUE AND validade IS NOT NULL AND validade != '';

COMMIT;