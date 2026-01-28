-- Tabela para o módulo Avulso
CREATE TABLE IF NOT EXISTS avulso (
    id VARCHAR(6) PRIMARY KEY DEFAULT generate_short_id(),
    id_mov VARCHAR(50),
    cd VARCHAR(10),
    tipo_mov VARCHAR(50),
    nun_vol VARCHAR(20),
    qtd_cx INTEGER,
    mat VARCHAR(20),
    nome VARCHAR(100),
    data_hora VARCHAR(30) -- Formato DD/MM/AAAA HH:MM:SS
);

-- Habilitar RLS
ALTER TABLE avulso ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
CREATE POLICY "Permitir leitura pública na tabela avulso" 
ON avulso FOR SELECT 
USING (true);

CREATE POLICY "Permitir inserção pública na tabela avulso" 
ON avulso FOR INSERT 
WITH CHECK (true);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_avulso_data_hora ON avulso(data_hora);
CREATE INDEX IF NOT EXISTS idx_avulso_mat ON avulso(mat);
