# Como Configurar GitHub Token

## Passo 1: Criar Personal Access Token

1. **Acesse GitHub.com** e faça login
2. **Vá em Settings** (canto superior direito, clique na sua foto)
3. **Developer settings** (menu lateral esquerdo, no final)
4. **Personal access tokens** → **Tokens (classic)**
5. **Generate new token** → **Generate new token (classic)**

## Passo 2: Configurar o Token

### Nome do Token
- Nome: `Contador Etiquetas`
- Descrição: `Token para sistema de contagem centralizada`

### Permissões Necessárias
Marque apenas estas opções:
- ✅ **repo** (Full control of private repositories)
  - Isso inclui: repo:status, repo_deployment, public_repo, repo:invite

### Expiração
- Recomendado: **90 days** ou **1 year**
- Para uso pessoal: **No expiration** (não recomendado para produção)

## Passo 3: Copiar e Configurar

1. **Clique em "Generate token"**
2. **IMPORTANTE**: Copie o token imediatamente (só aparece uma vez!)
3. **Configure no sistema**:

### Opção A: Arquivo de Configuração
Edite `config/github-config.js`:
```javascript
this.owner = 'seu-usuario-github';  // Seu usuário
this.repo = 'nome-do-repositorio';  // Nome do repo
```

### Opção B: Variável de Ambiente
```bash
# Windows (CMD)
set GITHUB_TOKEN=seu_token_aqui

# Windows (PowerShell)
$env:GITHUB_TOKEN="seu_token_aqui"

# Linux/Mac
export GITHUB_TOKEN="seu_token_aqui"
```

### Opção C: Prompt Automático
- O sistema vai pedir o token na primeira vez que usar
- Será salvo no localStorage do navegador

## Passo 4: Testar Configuração

1. Abra qualquer página do sistema (ex: placas/index.html)
2. Abra o Console do navegador (F12)
3. Digite: `new GitHubConfig().validate()`
4. Se aparecer `true`, está configurado corretamente!

## Troubleshooting

### Erro: "Bad credentials"
- Token inválido ou expirado
- Gere um novo token

### Erro: "Not Found"
- Verifique se o usuário e repositório estão corretos
- Verifique se o repositório existe e é acessível

### Erro: "API rate limit exceeded"
- Aguarde 1 hora ou use token autenticado
- Tokens autenticados têm limite de 5000 req/hora

### Erro: "Validation Failed"
- Verifique se o token tem as permissões corretas
- Regenere o token com permissão "repo"

## Segurança

⚠️ **IMPORTANTE**:
- Nunca compartilhe seu token
- Nunca commite o token no código
- Use variáveis de ambiente em produção
- Revogue tokens não utilizados
- Monitore o uso do token no GitHub

## Renovação

Quando o token expirar:
1. Vá em GitHub → Settings → Developer settings → Personal access tokens
2. Clique no token expirado
3. Clique em "Regenerate token"
4. Atualize a configuração com o novo token