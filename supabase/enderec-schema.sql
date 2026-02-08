-- SCHEMA PARA ENDEREC (ENDEREÇAMENTO)
-- Criação da tabela para armazenar histórico de etiquetas de endereçamento

-- Função para gerar ID alfanumérico curto (6 caracteres) - reutilizada dos outros módulos
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

-- Tabela específica para o módulo Enderec
CREATE TABLE IF NOT EXISTS enderec (
    id VARCHAR(6) PRIMARY KEY DEFAULT generate_short_id(),
    tipo VARCHAR(20) NOT NULL, -- 'pulmao', 'estacao', 'outro'
    modelo VARCHAR(20) NOT NULL, -- 'qr' ou 'barras'
    id_etiqueta TEXT NOT NULL, -- descrição exata que aparece nas etiquetas (único)
    num_copia INTEGER NOT NULL DEFAULT 1, -- número de cópias geradas
    data_hora VARCHAR(30) NOT NULL -- DD/MM/AAAA HH:MM:SS da geração
);

-- Habilitar RLS (Row Level Security)
ALTER TABLE enderec ENABLE ROW LEVEL SECURITY;

-- Política de inserção pública (permite inserção anônima)
CREATE POLICY "Permitir inserção pública em enderec" ON enderec
    FOR INSERT WITH CHECK (true);

-- Política de leitura pública (permite leitura anônima)
CREATE POLICY "Permitir leitura pública em enderec" ON enderec
    FOR SELECT USING (true);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_enderec_tipo ON enderec(tipo);
CREATE INDEX IF NOT EXISTS idx_enderec_modelo ON enderec(modelo);
CREATE INDEX IF NOT EXISTS idx_enderec_data_hora ON enderec(data_hora);
CREATE INDEX IF NOT EXISTS idx_enderec_id_etiqueta ON enderec(id_etiqueta);

-- Comentário para documentação
COMMENT ON TABLE enderec IS 'Registro de etiquetas geradas no módulo de Endereçamento';
COMMENT ON COLUMN enderec.id IS 'ID único alfanumérico de 6 caracteres';
COMMENT ON COLUMN enderec.tipo IS 'Tipo de etiqueta: pulmao, estacao ou outro';
COMMENT ON COLUMN enderec.modelo IS 'Tipo de código: qr ou barras';
COMMENT ON COLUMN enderec.id_etiqueta IS 'Código exato que aparece na etiqueta (único por geração)';
COMMENT ON COLUMN enderec.num_copia IS 'Número de cópias geradas para esta etiqueta';
COMMENT ON COLUMN enderec.data_hora IS 'Data e hora da geração no formato DD/MM/AAAA HH:MM:SS';