-- Tabela para o módulo Caixa
CREATE TABLE IF NOT EXISTS caixa (
    id VARCHAR(6) PRIMARY KEY DEFAULT generate_short_id(),
    num_inicial VARCHAR(20),
    num_final VARCHAR(20),
    qtd INTEGER,
    copia INTEGER,
    total_et INTEGER,
    tipo VARCHAR(50),
    data_hora VARCHAR(30) -- Formato DD/MM/AAAA HH:MM:SS
);

-- Habilitar RLS
ALTER TABLE caixa ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
CREATE POLICY "Permitir leitura pública na tabela caixa" 
ON caixa FOR SELECT 
USING (true);

CREATE POLICY "Permitir inserção pública na tabela caixa" 
ON caixa FOR INSERT 
WITH CHECK (true);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_caixa_data_hora ON caixa(data_hora);
