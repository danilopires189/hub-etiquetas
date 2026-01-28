-- PATCH DE CORREÇÃO TIMESTAMPTZ -> VARCHAR PARA DATA FORMATADA BR
-- Execute este script para permitir que o campo data_hora aceite strings formatadas do Brasil.

-- 1. Alterar o tipo da coluna data_hora na tabela termo
ALTER TABLE termo ALTER COLUMN data_hora DROP DEFAULT;
ALTER TABLE termo ALTER COLUMN data_hora TYPE VARCHAR(30) USING to_char(data_hora AT TIME ZONE 'UTC', 'DD/MM/YYYY HH24:MI:SS');
COMMENT ON COLUMN termo.data_hora IS 'Data e hora formatada (DD/MM/YYYY HH:MM:SS) - Horário de Brasília';
