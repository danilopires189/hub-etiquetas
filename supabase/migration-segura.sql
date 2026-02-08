-- Migração Segura para Endereçamento de Fraldas
-- Execute este script no SQL Editor do Supabase

-- 1. Aumentar tamanho das colunas (Migration para tabelas existentes)
DO $$ 
BEGIN
    -- enderecos_fraldas
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'enderecos_fraldas' AND column_name = 'endereco') THEN
        ALTER TABLE enderecos_fraldas ALTER COLUMN endereco TYPE VARCHAR(100);
    END IF;

    -- alocacoes_fraldas
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'alocacoes_fraldas' AND column_name = 'endereco') THEN
        ALTER TABLE alocacoes_fraldas ALTER COLUMN endereco TYPE VARCHAR(100);
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'alocacoes_fraldas' AND column_name = 'coddv') THEN
        ALTER TABLE alocacoes_fraldas ALTER COLUMN coddv TYPE VARCHAR(100);
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'alocacoes_fraldas' AND column_name = 'matricula') THEN
        ALTER TABLE alocacoes_fraldas ALTER COLUMN matricula TYPE VARCHAR(100);
    END IF;

    -- historico_enderecamento_fraldas
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'historico_enderecamento_fraldas' AND column_name = 'endereco') THEN
        ALTER TABLE historico_enderecamento_fraldas ALTER COLUMN endereco TYPE VARCHAR(100);
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'historico_enderecamento_fraldas' AND column_name = 'endereco_destino') THEN
        ALTER TABLE historico_enderecamento_fraldas ALTER COLUMN endereco_destino TYPE VARCHAR(100);
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'historico_enderecamento_fraldas' AND column_name = 'coddv') THEN
        ALTER TABLE historico_enderecamento_fraldas ALTER COLUMN coddv TYPE VARCHAR(100);
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'historico_enderecamento_fraldas' AND column_name = 'matricula') THEN
        ALTER TABLE historico_enderecamento_fraldas ALTER COLUMN matricula TYPE VARCHAR(100);
    END IF;
END $$;

-- 2. Recriar Políticas (Drop If Exists antes de Create)
DO $$ 
BEGIN
    -- enderecos_fraldas
    DROP POLICY IF EXISTS "Permitir leitura pública de endereços" ON enderecos_fraldas;
    DROP POLICY IF EXISTS "Permitir inserção pública de endereços" ON enderecos_fraldas;
    DROP POLICY IF EXISTS "Permitir atualização pública de endereços" ON enderecos_fraldas;
    
    -- alocacoes_fraldas
    DROP POLICY IF EXISTS "Permitir leitura pública de alocações" ON alocacoes_fraldas;
    DROP POLICY IF EXISTS "Permitir inserção pública de alocações" ON alocacoes_fraldas;
    DROP POLICY IF EXISTS "Permitir atualização pública de alocações" ON alocacoes_fraldas;
    DROP POLICY IF EXISTS "Permitir exclusão pública de alocações" ON alocacoes_fraldas;
    
    -- historico_enderecamento_fraldas
    DROP POLICY IF EXISTS "Permitir leitura pública de histórico" ON historico_enderecamento_fraldas;
    DROP POLICY IF EXISTS "Permitir inserção pública de histórico" ON historico_enderecamento_fraldas;
END $$;

-- Agora criar as políticas
CREATE POLICY "Permitir leitura pública de endereços" ON enderecos_fraldas FOR SELECT USING (true);
CREATE POLICY "Permitir inserção pública de endereços" ON enderecos_fraldas FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualização pública de endereços" ON enderecos_fraldas FOR UPDATE USING (true);

CREATE POLICY "Permitir leitura pública de alocações" ON alocacoes_fraldas FOR SELECT USING (true);
CREATE POLICY "Permitir inserção pública de alocações" ON alocacoes_fraldas FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualização pública de alocações" ON alocacoes_fraldas FOR UPDATE USING (true);
CREATE POLICY "Permitir exclusão pública de alocações" ON alocacoes_fraldas FOR DELETE USING (true);

CREATE POLICY "Permitir leitura pública de histórico" ON historico_enderecamento_fraldas FOR SELECT USING (true);
CREATE POLICY "Permitir inserção pública de histórico" ON historico_enderecamento_fraldas FOR INSERT WITH CHECK (true);

-- 3. Recriar funções e triggers (já usam CREATE OR REPLACE)
-- [O restante das funções do arquivo original permaneceria igual pois usam CREATE OR REPLACE]
