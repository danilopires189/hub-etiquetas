# Configuracao Final - Supabase Integration (Atualizado)

## Status Atual

Data de atualizacao: 2026-02-11  
Status geral: funcional e simplificado para reduzir custo de armazenamento e egress.

## Projeto Supabase em uso

- Nome: `hub-pmenos`
- Project ID: `esaomlrwutuwqmztxsat`
- URL: `https://esaomlrwutuwqmztxsat.supabase.co`
- Regiao: Sao Paulo

## O que foi mantido

- Persistencia das geracoes de etiquetas no Supabase
- Contador global via `get_counter_stats`
- Fluxo offline com fila e sincronizacao
- Historico dual (localStorage + Supabase) nos modulos integrados

## O que foi simplificado

- `getStatistics` avancado foi desativado em `supabase/client.js`
- O retorno de `getStatistics` agora e leve e baseado somente no contador global
- Caminho de estatistica avancada no sincronizador foi removido
- `supabase/report-analyzer.js` foi removido do projeto

## SQL a executar no banco novo

1. `supabase/setup-hub-pmenos.sql`
2. `supabase/reduce-labels-storage.sql` (quando aplicavel no ambiente)

Observacao: a migracao de dados antigos sera manual, conforme definido.

## Arquivos principais

- `supabase/config.js`
- `supabase/client.js`
- `shared/sync-optimizer.js`
- `supabase/setup-hub-pmenos.sql`
- `supabase/reduce-labels-storage.sql`

## Validacao recomendada

- Validar leitura/escrita de etiquetas em 1 modulo real
- Validar incremento do contador global
- Validar timestamps em horario de Brasilia nos novos registros
- Validar que nao existem chamadas para `report-analyzer`, `syncStats` ou `get_stats`

## Notas operacionais

- Nao salvar dados duplicados na tabela `labels` quando a informacao ja existir em outra tabela.
- Priorizar dados operacionais minimos para reduzir crescimento do banco.
- Se analytics avancado voltar no futuro, implementar somente com metrica de custo monitorada.
