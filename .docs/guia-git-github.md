# Guia Completo - Git e GitHub no Windows

## Pré-requisitos
- Git instalado no Windows
- Conta no GitHub
- Repositório criado no GitHub

## 1. Instalação do Git (se necessário)

### Opção 1 - Winget (Recomendado)
```cmd
winget install --id Git.Git -e --source winget
```

### Opção 2 - Download Manual
1. Acesse: https://git-scm.com/download/win
2. Baixe e instale o Git for Windows
3. Durante a instalação, marque "Add Git to Windows PATH"

### Verificar se funcionou
```cmd
git --version
```

## 2. Configuração Inicial (Fazer apenas uma vez)

### Configurar usuário e email
```cmd
git config --global user.email "seu-email@exemplo.com"
git config --global user.name "Seu Nome"
```

**Exemplo:**
```cmd
git config --global user.email "danilopires189@gmail.com"
git config --global user.name "Danilo Pires"
```

## 3. Entrando na Pasta do Projeto

### Navegar para a pasta
```cmd
cd C:\PROJETO\hub-etiquetas
```

### Verificar se está na pasta correta
```cmd
dir
```

## 4. Inicializando o Repositório (Primeira vez apenas)

### Inicializar Git na pasta
```cmd
git init
```

### Conectar com repositório do GitHub
```cmd
git remote add origin https://github.com/danilopires189/hub-etiquetas.git
```

## 5. Comandos para Subir Alterações

### Para subir TUDO
```cmd
git add .
git commit -m "Descrição das alterações"
git push -u origin main
```

### Para subir apenas uma pasta específica (ex: data_base)
```cmd
git add data_base/
git commit -m "Ajustes na pasta data_base"
git push -u origin main
```

## 6. Comandos de Verificação

### Ver status dos arquivos
```cmd
git status
```

### Ver histórico de commits
```cmd
git log --oneline -5
```

### Ver repositórios remotos
```cmd
git remote -v
```

## 7. Resolvendo Problemas Comuns

### Erro: "not a git repository"
```cmd
git init
git remote add origin https://github.com/danilopires189/hub-etiquetas.git
```

### Erro: "failed to push" (repositório remoto à frente)
```cmd
git pull origin main --allow-unrelated-histories
git push origin main
```

### Conflitos de merge (manter versão local)
```cmd
git checkout --ours .
git add .
git commit -m "Resolvendo conflitos - mantendo versão local"
git push origin main
```

### Forçar push (usar com cuidado)
```cmd
git push origin main --force
```

## 8. Fluxo Completo - Primeira Vez

```cmd
# 1. Entrar na pasta
cd C:\PROJETO\hub-etiquetas

# 2. Inicializar Git
git init

# 3. Conectar com GitHub
git remote add origin https://github.com/danilopires189/hub-etiquetas.git

# 4. Adicionar arquivos
git add .

# 5. Fazer commit
git commit -m "Primeiro commit - projeto completo"

# 6. Definir branch principal
git branch -M main

# 7. Enviar para GitHub
git push -u origin main
```

## 9. Fluxo para Atualizações Futuras

```cmd
# 1. Entrar na pasta
cd C:\PROJETO\hub-etiquetas

# 2. Verificar status
git status

# 3. Adicionar alterações
git add .

# 4. Fazer commit
git commit -m "Descrição das alterações"

# 5. Enviar para GitHub
git push
```

## 10. Comandos Específicos por Situação

### Subir apenas pasta data_base
```cmd
cd C:\PROJETO\hub-etiquetas
git add data_base/
git commit -m "Atualizações na pasta data_base"
git push
```

### Subir projeto completo
```cmd
cd C:\PROJETO\hub-etiquetas
git add .
git commit -m "Atualização completa do projeto"
git push
```

### Verificar o que será enviado
```cmd
git status
git diff --cached
```

## 11. Dicas Importantes

- **Sempre** entre na pasta do projeto antes de executar comandos Git
- Use mensagens descritivas nos commits
- Verifique o status antes de fazer commit
- Para primeira vez, use `git push -u origin main`
- Para próximas vezes, use apenas `git push`
- Se der erro de autenticação, o Git abrirá o navegador automaticamente

## 12. Comandos de Emergência

### Desfazer último commit (mantendo alterações)
```cmd
git reset --soft HEAD~1
```

### Desfazer alterações não commitadas
```cmd
git checkout .
```

### Limpar cache do Git
```cmd
git rm -r --cached .
git add .
```

---

**Autor:** Kiro AI Assistant  
**Data:** Janeiro 2026  
**Projeto:** hub-etiquetas