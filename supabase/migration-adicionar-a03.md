# Migração: Adicionar Nível A03 aos Endereços de Fraldas

## 📋 Resumo
Esta migração adiciona o nível **A03 (3º Andar)** que estava faltando no sistema de endereçamento de fraldas.

## 🎯 Objetivo
- Incluir o nível A03 em todos os endereços de fraldas
- Atualizar constraints do banco de dados
- Manter compatibilidade com o sistema existente

## 📊 Impacto
- **Antes**: 1.710 endereços (15 zonas × 19 colunas × 6 níveis)
- **Depois**: 2.394 endereços (15 zonas × 19 colunas × 7 níveis)
- **Novos endereços**: 684 endereços A03

## 🚀 Como Executar

### 1. Aplicar o Patch no Banco de Dados
Execute o arquivo SQL no Supabase SQL Editor:
```sql
-- Executar: supabase/patch-adicionar-a03-fraldas.sql
```

### 2. Verificar Resultados
Após executar o script, você deve ver:
- ✅ 684 novos endereços A03 inseridos
- ✅ Total de 2.394 endereços no sistema
- ✅ Constraint atualizada para aceitar A03

### 3. Testar no Sistema
- Acesse o sistema de endereçamento
- Tente criar um endereço com nível A03
- Exemplo: `PF01.001.001.A03`

## 🔍 Validações

### Verificar Inserção
```sql
SELECT COUNT(*) FROM enderecos_fraldas WHERE nivel = 'A03' AND cd = 2;
-- Deve retornar: 285 (15 × 19)
```

### Verificar Total
```sql
SELECT COUNT(*) FROM enderecos_fraldas WHERE cd = 2;
-- Deve retornar: 2.394
```

### Verificar Distribuição
```sql
SELECT nivel, COUNT(*) as total 
FROM enderecos_fraldas 
WHERE cd = 2 
GROUP BY nivel 
ORDER BY nivel;
```

## 📝 Arquivos Alterados
- ✅ `supabase/enderecamento-fraldas-schema.sql` - Constraint atualizada
- ✅ `supabase/insert-enderecos-fraldas.sql` - Script completo atualizado
- ✅ `enderecamento-fraldas/enderecamento.js` - Validação JavaScript
- ✅ `enderecamento-fraldas/enderecamento-supabase.js` - Validação Supabase
- ✅ `supabase/patch-adicionar-a03-fraldas.sql` - Script de migração

## ⚠️ Observações
- O script usa `ON CONFLICT DO NOTHING` para evitar duplicatas
- Endereços existentes não são afetados
- A migração é segura e reversível
- Não há impacto em alocações existentes

## 🔄 Rollback (se necessário)
Para reverter a migração:
```sql
-- Remover endereços A03
DELETE FROM enderecos_fraldas WHERE nivel = 'A03' AND cd = 2;

-- Restaurar constraint antiga
ALTER TABLE enderecos_fraldas DROP CONSTRAINT check_nivel;
ALTER TABLE enderecos_fraldas ADD CONSTRAINT check_nivel 
CHECK (nivel IN ('A0T', 'A01', 'A02', 'A04', 'A05', 'A06'));
```