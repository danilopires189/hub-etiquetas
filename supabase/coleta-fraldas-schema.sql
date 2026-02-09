-- =====================================================
-- Módulo Coleta Fraldas
-- =====================================================

CREATE TABLE IF NOT EXISTS coletas_fraldas (
    id BIGSERIAL PRIMARY KEY,
    cd INTEGER NOT NULL,
    usuario_nome VARCHAR(150) NOT NULL,
    usuario_matricula VARCHAR(50),
    coddv VARCHAR(50) NOT NULL,
    barras VARCHAR(80) NOT NULL,
    validade VARCHAR(4) NOT NULL,
    lote VARCHAR(50),
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('SEPARACAO', 'PULMAO')),
    descricao VARCHAR(255) NOT NULL,
    data_hora_brasilia TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT (timezone('America/Sao_Paulo', now())),
    print VARCHAR(3) NOT NULL DEFAULT 'Nao' CHECK (print IN ('Sim', 'Nao')),
    printed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coletas_fraldas_cd ON coletas_fraldas (cd);
CREATE INDEX IF NOT EXISTS idx_coletas_fraldas_print ON coletas_fraldas (print);
CREATE INDEX IF NOT EXISTS idx_coletas_fraldas_data_brasilia ON coletas_fraldas (data_hora_brasilia DESC);
CREATE INDEX IF NOT EXISTS idx_coletas_fraldas_printed_at ON coletas_fraldas (printed_at DESC);
CREATE INDEX IF NOT EXISTS idx_coletas_fraldas_coddv ON coletas_fraldas (coddv);
CREATE INDEX IF NOT EXISTS idx_coletas_fraldas_barras ON coletas_fraldas (barras);

CREATE OR REPLACE FUNCTION set_updated_at_coletas_fraldas()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_coletas_fraldas_updated_at ON coletas_fraldas;
CREATE TRIGGER trigger_coletas_fraldas_updated_at
BEFORE UPDATE ON coletas_fraldas
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_coletas_fraldas();

ALTER TABLE coletas_fraldas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir leitura pública de coletas fraldas" ON coletas_fraldas;
CREATE POLICY "Permitir leitura pública de coletas fraldas"
ON coletas_fraldas FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Permitir inserção pública de coletas fraldas" ON coletas_fraldas;
CREATE POLICY "Permitir inserção pública de coletas fraldas"
ON coletas_fraldas FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir atualização pública de coletas fraldas" ON coletas_fraldas;
CREATE POLICY "Permitir atualização pública de coletas fraldas"
ON coletas_fraldas FOR UPDATE
USING (true);

COMMENT ON TABLE coletas_fraldas IS 'Registros de coleta mobile para impressão posterior no desktop';
