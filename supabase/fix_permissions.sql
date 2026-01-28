-- POLICY: Permitir inserção pública/anônima na tabela labels
-- Isso é necessário se os usuários da aplicação não fizerem login no Supabase
ALTER TABLE public.labels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir inserção anônima em labels"
ON public.labels
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- POLICY: Permitir leitura pública (para dashboard e stats)
CREATE POLICY "Permitir leitura pública em labels"
ON public.labels
FOR SELECT
TO anon, authenticated
USING (true);

-- Garantir que a tabela tenha os grants corretos
GRANT ALL ON TABLE public.labels TO anon;
GRANT ALL ON TABLE public.labels TO authenticated;
GRANT ALL ON TABLE public.labels TO service_role;
