# Report Analyzer - Status

## Descontinuado

O fluxo de analise avancada de relatorios foi descontinuado em 2026-02-11 para reduzir custo e risco de egress.

## Impacto

- `supabase/report-analyzer.js` removido
- caminho de estatistica avancada removido/desativado
- `getStatistics` permanece apenas em modo leve (contador global)

## Se precisar reativar no futuro

1. Definir limite de custo mensal e alertas de consumo
2. Reintroduzir consultas agregadas com janela curta e cache forte
3. Evitar leitura massiva da tabela `labels`
4. Validar impacto real de egress antes de publicar em producao
