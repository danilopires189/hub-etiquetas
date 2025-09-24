# Sistema de Etiquetas Pague Menos

Sistema web para geração de etiquetas com códigos de barras para farmácia.

## 🚀 Acesso Rápido

**GitHub Pages:** [https://danilopires189.github.io/sistema-etiquetas](https://danilopires189.github.io/sistema-etiquetas)

## ⚡ Características

- **Carregamento ultra-rápido** com cache local
- **Busca inteligente** por código, barras ou descrição
- **Códigos de barras** EAN-13, EAN-8, ITF-14
- **Impressão otimizada** com controles de tamanho
- **Funciona offline** após primeiro carregamento

## 📱 Como usar

1. **Primeira vez:** Clique em "Carregar base" e selecione o arquivo `base_barras_index.json`
2. **Próximas vezes:** Os dados ficam salvos no navegador
3. **Buscar:** Digite código, barras ou nome do produto
4. **Imprimir:** Ajuste tamanho e clique em "Imprimir"

## 🔧 Estrutura

```
├── index.html          # Página principal
├── placas/             # Módulo de etiquetas
│   ├── index.html      # Interface de busca
│   ├── busca.js        # Lógica principal
│   └── base_barras_index.json  # Base de dados
├── shared/             # Recursos compartilhados
│   ├── design-system.css
│   ├── components.css
│   └── performance.css
└── assets/             # Imagens e logos
```

## 🚀 Deploy

### GitHub Pages (Automático)
1. Faça push para branch `main`
2. GitHub Actions faz deploy automaticamente
3. Acesse via `https://seu-usuario.github.io/repo-name`

### Local
1. Clone o repositório
2. Abra `index.html` no navegador
3. Ou use servidor local: `python -m http.server 8000`

## 💾 Cache e Performance

- **Cache local:** Dados salvos no localStorage
- **Carregamento lazy:** Interface carrega primeiro, dados depois
- **Timeout agressivo:** 2 segundos para carregamento automático
- **Fallback manual:** Sempre permite carregar arquivo manualmente

## 🛠️ Desenvolvimento

### Estrutura do código
- `busca.js` - Lógica principal otimizada
- Cache-first strategy para performance
- Timeout de 2s para GitHub Pages
- Fallback XHR para compatibilidade

### Otimizações implementadas
- ✅ Carregamento assíncrono
- ✅ Cache localStorage
- ✅ Timeout agressivo
- ✅ Interface responsiva
- ✅ Busca em tempo real
- ✅ Geração SVG de códigos de barras

## 📄 Licença

Desenvolvido por Danilo Pires para Pague Menos.
