-- =====================================================
-- Modulo Coleta Etiqueta Mercadoria
-- =====================================================

CREATE TABLE IF NOT EXISTS coletas_etiqueta_mercadoria (
    id BIGSERIAL PRIMARY KEY,
    cd INTEGER NOT NULL,
    mat VARCHAR(50) NOT NULL,
    nome VARCHAR(150) NOT NULL,
    coddv VARCHAR(50) NOT NULL,
    barras VARCHAR(80) NOT NULL,
    descricao VARCHAR(255) NOT NULL,
    destino VARCHAR(20) NOT NULL CHECK (destino IN ('AUTOMATICO', 'SEPARACAO', 'PULMAO')),
    validade VARCHAR(5),
    qtd INTEGER NOT NULL CHECK (qtd > 0),
    dt_hr_coleta TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT (timezone('America/Sao_Paulo', now())),
    dt_hr_impressao TIMESTAMP WITHOUT TIME ZONE,
    status_impressao VARCHAR(3) NOT NULL DEFAULT 'NAO' CHECK (status_impressao IN ('SIM', 'NAO')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coletas_etiqueta_mercadoria_cd ON coletas_etiqueta_mercadoria (cd);
CREATE INDEX IF NOT EXISTS idx_coletas_etiqueta_mercadoria_status ON coletas_etiqueta_mercadoria (status_impressao);
CREATE INDEX IF NOT EXISTS idx_coletas_etiqueta_mercadoria_dt_coleta ON coletas_etiqueta_mercadoria (dt_hr_coleta DESC);
CREATE INDEX IF NOT EXISTS idx_coletas_etiqueta_mercadoria_dt_impressao ON coletas_etiqueta_mercadoria (dt_hr_impressao DESC);
CREATE INDEX IF NOT EXISTS idx_coletas_etiqueta_mercadoria_coddv ON coletas_etiqueta_mercadoria (coddv);
CREATE INDEX IF NOT EXISTS idx_coletas_etiqueta_mercadoria_barras ON coletas_etiqueta_mercadoria (barras);
CREATE INDEX IF NOT EXISTS idx_coletas_etiqueta_mercadoria_mat ON coletas_etiqueta_mercadoria (mat);

CREATE OR REPLACE FUNCTION set_updated_at_coletas_etiqueta_mercadoria()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_coletas_etiqueta_mercadoria_updated_at ON coletas_etiqueta_mercadoria;
CREATE TRIGGER trigger_coletas_etiqueta_mercadoria_updated_at
BEFORE UPDATE ON coletas_etiqueta_mercadoria
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_coletas_etiqueta_mercadoria();

ALTER TABLE coletas_etiqueta_mercadoria ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir leitura publica coletas etiqueta mercadoria" ON coletas_etiqueta_mercadoria;
CREATE POLICY "Permitir leitura publica coletas etiqueta mercadoria"
ON coletas_etiqueta_mercadoria FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Permitir insercao publica coletas etiqueta mercadoria" ON coletas_etiqueta_mercadoria;
CREATE POLICY "Permitir insercao publica coletas etiqueta mercadoria"
ON coletas_etiqueta_mercadoria FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir atualizacao publica coletas etiqueta mercadoria" ON coletas_etiqueta_mercadoria;
CREATE POLICY "Permitir atualizacao publica coletas etiqueta mercadoria"
ON coletas_etiqueta_mercadoria FOR UPDATE
USING (true);

COMMENT ON TABLE coletas_etiqueta_mercadoria IS 'Registros de coleta mobile do modulo etiqueta mercadoria com impressao no desktop';
