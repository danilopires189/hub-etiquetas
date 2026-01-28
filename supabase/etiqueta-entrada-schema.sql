-- SCHEMA PARA ETIQUETA ENTRADA (MERCADORIA)
-- Criação da tabela para armazenar histórico de etiquetas de mercadoria

CREATE TABLE IF NOT EXISTS etiqueta_entrada (
    id VARCHAR(6) PRIMARY KEY DEFAULT generate_short_id(),
    cd VARCHAR(10),
    codv VARCHAR(50),
    ean VARCHAR(50),
    descricao TEXT,
    destino_tipo VARCHAR(20), -- 'automatico', 'pulmao', 'separacao'
    endereco_tipo VARCHAR(20), -- 'PULMÃO', 'SEPARACAO', etc.
    endereco VARCHAR(50),
    quantidade INTEGER,
    validade VARCHAR(10),
    zona BOOLEAN DEFAULT FALSE,
    matricula VARCHAR(20),
    nome_usuario TEXT,
    maquina VARCHAR(50),
    data_hora VARCHAR(30) -- DD/MM/AAAA HH:MM:SS
);

-- RLS
ALTER TABLE etiqueta_entrada ENABLE ROW LEVEL SECURITY;

-- Permitir inserção livre (anon)
CREATE POLICY "Insercao publica etiqueta_entrada" ON etiqueta_entrada FOR INSERT WITH CHECK (true);

-- Permitir leitura livre (anon)
CREATE POLICY "Leitura publica etiqueta_entrada" ON etiqueta_entrada FOR SELECT USING (true);

COMMENT ON TABLE etiqueta_entrada IS 'Histórico de gerações do módulo Etiqueta Mercadoria';
