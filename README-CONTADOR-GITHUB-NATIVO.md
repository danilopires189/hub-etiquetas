# 📊 Contador GitHub Nativo

Sistema de contagem centralizado que usa exclusivamente GitHub API para manter o estado global do contador de etiquetas, resolvendo o problema de contagem local por máquina.

## 🎯 Problema Resolvido

**Antes**: Cada máquina mantinha sua própria contagem local, causando inconsistências quando hospedado no GitHub Pages.

**Agora**: Contador centralizado no GitHub que funciona independente do IP/máquina que acessa o sistema.

## ✨ Características

- ✅ **Centralizado**: Todos os usuários veem o mesmo contador
- ✅ **GitHub Nativo**: Usa apenas GitHub API, sem dependências externas
- ✅ **Auditoria Natural**: Histórico via Git commits
- ✅ **Resolução de Conflitos**: Merge automático inteligente
- ✅ **Fallback Offline**: Funciona sem internet e sincroniza depois
- ✅ **Rate Limit Inteligente**: Gerencia limites da API automaticamente
- ✅ **Breakdown por Tipo**: Contagem separada por tipo de etiqueta

## 🚀 Setup Rápido

### 1. Configurar GitHub Token

1. Vá em [GitHub.com → Settings → Developer settings → Personal access tokens](https://github.com/settings/tokens)
2. Clique em **"Generate new token (classic)"**
3. Nome: `Contador Etiquetas`
4. Permissões: Marque apenas **"repo"**
5. Clique em **"Generate token"**
6. **IMPORTANTE**: Copie o token (só aparece uma vez!)

### 2. Configurar no Sistema

Edite o arquivo `js/contador-integration.js` e configure:

```javascript
// Configuração automática (recomendado para GitHub Pages)
await window.contadorGlobal.init({
  // Auto-detecta owner/repo da URL do GitHub Pages
  autoSync: true,
  showUI: true
});

// OU configuração manual
await window.contadorGlobal.init({
  owner: 'seu-usuario-github',
  repo: 'nome-do-repositorio',
  token: 'seu_token_aqui', // Ou será solicitado automaticamente
  autoSync: true,
  showUI: true
});
```

### 3. Testar

1. Abra qualquer aplicação (ex: `placas/index.html`)
2. O sistema vai solicitar o token na primeira vez
3. Gere algumas etiquetas para testar o incremento
4. Verifique se o contador está sendo atualizado

## 📁 Estrutura de Arquivos

```
js/
├── contador-github-nativo.js    # Classe principal
├── contador-ui.js               # Interface visual
└── contador-integration.js      # Integração com aplicações

config/
└── github-config.js            # Configurações (opcional)

data/
└── contador.json               # Arquivo de dados no GitHub

tests/
└── contador-github-nativo.test.html  # Testes unitários
```

## 🔧 Como Funciona

### Fluxo de Operação

1. **Leitura**: Busca `data/contador.json` via GitHub Contents API
2. **Incremento**: Atualiza arquivo via commit automático
3. **Conflitos**: Detecta via SHA comparison + merge automático
4. **Cache**: Mantém cache local para performance
5. **Offline**: Queue de operações + sincronização automática

### Estrutura de Dados

```json
{
  "totalEtiquetas": 19452,
  "ultimaAtualizacao": "2025-01-09T15:30:00Z",
  "versao": "2.0",
  "breakdown": {
    "placas": 5000,
    "caixa": 8000,
    "avulso": 3000,
    "enderec": 2000,
    "transfer": 1000,
    "termo": 452
  },
  "metadata": {
    "sistema": "GitHub API Nativo",
    "sessaoAtual": "uuid-session-id",
    "ultimoCommit": "sha-do-commit"
  }
}
```

## 🎮 API de Uso

### Incrementar Contador

```javascript
// Incrementar por tipo específico
await window.contadorGlobal.incrementarContador(5, 'placas');
await window.contadorGlobal.incrementarContador(10, 'caixa');

// Incrementar geral
await window.contadorGlobal.incrementarContador(1, 'geral');
```

### Obter Dados

```javascript
// Obter contador completo
const contador = await window.contadorGlobal.obterContador();
console.log(contador.totalEtiquetas); // 19452

// Obter apenas o total
const total = await window.contadorGlobal.obterTotal();
console.log(total); // 19452

// Obter estatísticas
const stats = await window.contadorGlobal.obterEstatisticas(30); // últimos 30 dias
```

### Gerar Sequência de Números

```javascript
// Gerar 5 números sequenciais para placas
const numeros = await window.contadorGlobal.gerarSequencia(5, 'placas');
console.log(numeros); // [19453, 19454, 19455, 19456, 19457]
```

## 🔍 Monitoramento

### Status da Conexão

O sistema mostra automaticamente:
- 🟢 **Online**: Conectado ao GitHub
- 🟡 **Rate Limited**: Aguardando reset do limite
- 🔴 **Offline**: Modo local (sincroniza quando voltar)

### Rate Limiting

- **Limite**: 5000 requests/hora (usuário autenticado)
- **Monitoramento**: Automático via headers da API
- **Comportamento**: Queue + retry automático

### Logs e Auditoria

```javascript
// Ver histórico via commits
const historico = await window.contadorGlobal.contador.obterHistorico(50);

// Exportar dados
const csv = window.contadorGlobal.contador.exportarHistoricoCSV(historico);
const json = window.contadorGlobal.contador.exportarHistoricoJSON(historico);
```

## 🛠️ Troubleshooting

### Erro: "Bad credentials"
- Token inválido ou expirado
- **Solução**: Gere um novo token

### Erro: "Not Found"
- Repositório não existe ou não é acessível
- **Solução**: Verifique owner/repo nas configurações

### Erro: "API rate limit exceeded"
- Muitas requisições em pouco tempo
- **Solução**: Aguarde 1 hora ou use token autenticado

### Contador não sincroniza
- Verifique conexão com internet
- Verifique se o token tem permissão "repo"
- Abra o console para ver logs detalhados

### Conflitos frequentes
- Muitos usuários simultâneos
- **Solução**: Sistema resolve automaticamente, mas pode haver delays

## 🔒 Segurança

### Boas Práticas

- ✅ Use tokens com escopo mínimo (apenas "repo")
- ✅ Configure expiração dos tokens (90 dias recomendado)
- ✅ Não commite tokens no código
- ✅ Use variáveis de ambiente em produção
- ✅ Monitore uso do token no GitHub

### Validações Implementadas

- Quantidade máxima: 1000 por operação
- Tipos válidos: placas, caixa, avulso, enderec, transfer, termo
- SHA validation para integridade
- Rate limiting automático

## 📊 Performance

### Otimizações

- **Cache Local**: 30 segundos TTL
- **Batch Operations**: Agrupa operações offline
- **Exponential Backoff**: Retry inteligente
- **Compression**: Dados JSON otimizados

### Métricas Típicas

- **Leitura**: < 2 segundos
- **Incremento**: < 3 segundos
- **Resolução de Conflito**: < 5 segundos
- **Sincronização Offline**: < 10 segundos

## 🧪 Testes

Execute os testes abrindo: `tests/contador-github-nativo.test.html`

Testes incluem:
- ✅ Construtor e configuração
- ✅ Validação de inputs
- ✅ Gerenciamento de cache
- ✅ Rate limiting
- ✅ Operações assíncronas
- ✅ Merge de conflitos

## 🔄 Migração do Sistema Anterior

### Backup do Valor Atual

```javascript
// Salvar valor atual antes da migração
const valorAtual = localStorage.getItem('contador-local') || 19452;
console.log('Valor atual:', valorAtual);
```

### Migração Automática

O sistema detecta automaticamente valores locais e usa o maior valor entre local e GitHub, evitando regressão.

## 📞 Suporte

- **Logs**: Abra o Console do navegador (F12)
- **Testes**: Execute `tests/contador-github-nativo.test.html`
- **Configuração**: Veja `SETUP-GITHUB-TOKEN.md`
- **Contato**: [WhatsApp](https://wa.me/5562981020272)

## 📝 Changelog

### v2.0 - GitHub Nativo
- ✅ Contador centralizado via GitHub API
- ✅ Resolução automática de conflitos
- ✅ Fallback offline com sincronização
- ✅ Breakdown por tipo de etiqueta
- ✅ Interface visual de status
- ✅ Auditoria via Git commits

### v1.0 - Sistema Local
- ❌ Contagem local por máquina
- ❌ Inconsistências entre usuários
- ❌ Sem auditoria centralizada