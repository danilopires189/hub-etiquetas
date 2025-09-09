# 🚀 Setup GitHub Pages - Sistema de Etiquetas

## Passos para publicar no GitHub:

### 1. Criar repositório
```bash
# No GitHub, criar novo repositório público
# Nome sugerido: sistema-etiquetas-pague-menos
```

### 2. Fazer upload dos arquivos
```bash
git init
git add .
git commit -m "Sistema de etiquetas otimizado para GitHub Pages"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/sistema-etiquetas-pague-menos.git
git push -u origin main
```

### 3. Ativar GitHub Pages
1. Ir em **Settings** do repositório
2. Seção **Pages**
3. Source: **GitHub Actions**
4. Aguardar deploy automático

### 4. Acessar aplicação
- URL: `https://SEU-USUARIO.github.io/sistema-etiquetas-pague-menos`
- Primeira vez: Carregar arquivo `base_barras_index.json`
- Próximas vezes: Dados salvos automaticamente

## ⚡ Otimizações implementadas:

### Performance
- ✅ Cache localStorage prioritário
- ✅ Timeout de 2s para carregamento
- ✅ Interface carrega primeiro, dados depois
- ✅ Compressão automática de assets
- ✅ Headers de cache otimizados

### Compatibilidade
- ✅ Funciona em qualquer navegador moderno
- ✅ Fallback XHR para file://
- ✅ Carregamento manual sempre disponível
- ✅ Offline após primeiro carregamento

### GitHub Actions
- ✅ Deploy automático no push
- ✅ Compressão de arquivos
- ✅ Cache de dependências
- ✅ Otimização de imagens

## 🔧 Estrutura otimizada:

```
sistema-etiquetas/
├── .github/workflows/pages.yml  # Deploy automático
├── _config.yml                  # Configuração Jekyll
├── _headers                     # Headers de performance
├── index.html                   # Página inicial
├── placas/
│   ├── index.html              # Interface principal
│   ├── busca.js                # Lógica otimizada
│   └── base_barras_index.json  # Base de dados
├── shared/                     # CSS otimizado
└── assets/                     # Imagens comprimidas
```

## 📱 Como usar após deploy:

1. **Acesse a URL do GitHub Pages**
2. **Primeira vez:** Clique "Carregar base" → Selecione `base_barras_index.json`
3. **Próximas vezes:** Abre instantaneamente (dados no cache)
4. **Buscar:** Digite código/barras/descrição
5. **Imprimir:** Ajuste tamanho e imprima

## 🚨 Troubleshooting:

### Se não carregar automaticamente:
- ✅ Use botão "Carregar base"
- ✅ Verifique se arquivo JSON está na pasta correta
- ✅ Limpe cache do navegador se necessário

### Se estiver lento:
- ✅ Primeira vez sempre é mais lenta (download da base)
- ✅ Próximas vezes são instantâneas (cache local)
- ✅ Funciona offline após primeiro carregamento

## 💡 Dicas:

- **Bookmark a página** para acesso rápido
- **Dados ficam salvos** no navegador
- **Funciona offline** após primeiro uso
- **Atualiza automaticamente** quando você fizer push