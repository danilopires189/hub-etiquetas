-- Função para gerar ID alfanumérico curto (6 caracteres)
CREATE OR REPLACE FUNCTION generate_short_id()
RETURNS TEXT AS $$
DECLARE
    chars TEXT := '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    result TEXT := '';
    i INTEGER := 0;
BEGIN
    FOR i IN 1..6 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Tabela específica para o módulo Termo
CREATE TABLE IF NOT EXISTS termo (
    id VARCHAR(6) PRIMARY KEY DEFAULT generate_short_id(),
    id_et VARCHAR(50) NOT NULL,
    cd VARCHAR(10),
    pedido VARCHAR(20),
    filial VARCHAR(10),
    seq VARCHAR(10),
    num_rota VARCHAR(10),
    nom_rota TEXT,
    qtd_vol INTEGER,
    mat VARCHAR(20),
    nome TEXT,
    data_hora TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE termo ENABLE ROW LEVEL SECURITY;

-- Política de inserção pública
CREATE POLICY "Permitir inserção pública em termo" ON termo
    FOR INSERT WITH CHECK (true);

-- Política de leitura pública
CREATE POLICY "Permitir leitura pública em termo" ON termo
    FOR SELECT USING (true);

-- Comentário para documentação
COMMENT ON TABLE termo IS 'Registro de etiquetas geradas no módulo de Termolábeis';
