-- Limpar TODAS as alocações (deixa todos os endereços vazios/disponíveis)
TRUNCATE TABLE alocacoes_fraldas;

-- Limpar TODO o histórico de operações
TRUNCATE TABLE historico_enderecamento_fraldas;

-- Se precisar reiniciar os IDs das sequências (opcional, mas bom para limpeza total)
-- ALTER SEQUENCE alocacoes_fraldas_id_seq RESTART WITH 1;
-- ALTER SEQUENCE historico_enderecamento_fraldas_id_seq RESTART WITH 1;
