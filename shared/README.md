# Design System - Pague Menos Etiquetas

Sistema de design moderno e profissional para o hub de etiquetas do Pague Menos.

## 📁 Estrutura de Arquivos

```
shared/
├── design-system.css    # Tokens de design e utilitários base
├── components.css       # Componentes padronizados
├── performance.css      # Otimizações e compatibilidade
└── README.md           # Esta documentação
```

## 🎨 Tokens de Design

### Cores

#### Cores Primárias
```css
--brand-primary: #062e6f;    /* Azul Pague Menos */
--brand-secondary: #e0002b;  /* Vermelho Pague Menos */
--brand-accent: #0ea5e9;     /* Azul claro para acentos */
```

#### Paleta Neutra
```css
--neutral-50: #f8fafc;   /* Mais claro */
--neutral-100: #f1f5f9;
--neutral-200: #e2e8f0;
--neutral-300: #cbd5e1;
--neutral-400: #94a3b8;
--neutral-500: #64748b;  /* Meio */
--neutral-600: #475569;
--neutral-700: #334155;
--neutral-800: #1e293b;
--neutral-900: #0f172a;  /* Mais escuro */
```

#### Cores Funcionais
```css
--success: #10b981;      /* Verde para sucesso */
--warning: #f59e0b;      /* Amarelo para avisos */
--error: #ef4444;        /* Vermelho para erros */
--info: #3b82f6;         /* Azul para informações */
```

### Tipografia

#### Família de Fontes
```css
--font-primary: 'Inter', ui-sans-serif, system-ui, sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', monospace;
```

#### Escala Tipográfica
```css
--text-xs: 0.75rem;      /* 12px */
--text-sm: 0.875rem;     /* 14px */
--text-base: 1rem;       /* 16px */
--text-lg: 1.125rem;     /* 18px */
--text-xl: 1.25rem;      /* 20px */
--text-2xl: 1.5rem;      /* 24px */
--text-3xl: 1.875rem;    /* 30px */
--text-4xl: 2.25rem;     /* 36px */
```

#### Pesos da Fonte
```css
--font-light: 300;
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
--font-extrabold: 800;
```

### Espaçamentos

```css
--space-1: 0.25rem;      /* 4px */
--space-2: 0.5rem;       /* 8px */
--space-3: 0.75rem;      /* 12px */
--space-4: 1rem;         /* 16px */
--space-6: 1.5rem;       /* 24px */
--space-8: 2rem;         /* 32px */
--space-12: 3rem;        /* 48px */
--space-16: 4rem;        /* 64px */
```

### Raios de Borda

```css
--radius-sm: 0.25rem;    /* 4px */
--radius-base: 0.5rem;   /* 8px */
--radius-md: 0.75rem;    /* 12px */
--radius-lg: 1rem;       /* 16px */
--radius-xl: 1.5rem;     /* 24px */
--radius-full: 9999px;   /* Circular */
```

### Sombras

```css
--shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
--shadow-base: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
--shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
--shadow-brand: 0 4px 12px rgba(6, 46, 111, 0.25);
```

## 🧩 Componentes

### Botões

#### Variações
```html
<!-- Botão primário -->
<button class="btn btn-primary">Botão Primário</button>

<!-- Botão secundário -->
<button class="btn btn-secondary">Botão Secundário</button>

<!-- Botão ghost -->
<button class="btn btn-ghost">Botão Ghost</button>

<!-- Botão de perigo -->
<button class="btn btn-danger">Botão Perigo</button>
```

#### Tamanhos
```html
<button class="btn btn-primary btn-sm">Pequeno</button>
<button class="btn btn-primary">Normal</button>
<button class="btn btn-primary btn-lg">Grande</button>
<button class="btn btn-primary btn-xl">Extra Grande</button>
```

#### Com Ícones
```html
<button class="btn btn-primary">
  <svg>...</svg>
  Botão com Ícone
</button>
```

### Campos de Entrada

#### Campo Básico
```html
<div class="form-field">
  <label class="form-label">Nome</label>
  <input type="text" class="form-input" placeholder="Digite seu nome">
</div>
```

#### Campo com Validação
```html
<div class="form-field">
  <label class="form-label">Email</label>
  <input type="email" class="form-input error" placeholder="Digite seu email">
  <div class="form-message error">Email é obrigatório</div>
</div>
```

#### Select
```html
<div class="form-field">
  <label class="form-label">Opção</label>
  <select class="form-select">
    <option>Selecione uma opção</option>
    <option>Opção 1</option>
    <option>Opção 2</option>
  </select>
</div>
```

### Checkboxes e Switches

#### Checkbox
```html
<label class="form-checkbox">
  <input type="checkbox">
  <span class="checkmark"></span>
  Aceito os termos
</label>
```

#### Switch
```html
<label class="form-switch">
  <input type="checkbox">
  <span class="switch-track">
    <span class="switch-thumb"></span>
  </span>
  Ativar notificações
</label>
```

### Cards

#### Card Básico
```html
<div class="card">
  <div class="card-header">
    <h3 class="card-title">Título do Card</h3>
    <p class="card-subtitle">Subtítulo</p>
  </div>
  <div class="card-body">
    <p>Conteúdo do card...</p>
  </div>
  <div class="card-footer">
    <button class="btn btn-primary">Ação</button>
  </div>
</div>
```

#### Card Elevado
```html
<div class="card card-elevated">
  <!-- Conteúdo -->
</div>
```

#### Card Glass
```html
<div class="card card-glass">
  <!-- Conteúdo -->
</div>
```

### Modais

```html
<div class="modal-overlay" id="modal">
  <div class="modal">
    <div class="modal-header">
      <h3 class="modal-title">Título do Modal</h3>
      <button class="modal-close">×</button>
    </div>
    <div class="modal-body">
      <p>Conteúdo do modal...</p>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost">Cancelar</button>
      <button class="btn btn-primary">Confirmar</button>
    </div>
  </div>
</div>
```

### Tooltips

```html
<span class="tooltip" data-tooltip="Texto do tooltip">
  Elemento com tooltip
</span>
```

### Badges

```html
<span class="badge badge-primary">Primário</span>
<span class="badge badge-success">Sucesso</span>
<span class="badge badge-warning">Aviso</span>
<span class="badge badge-error">Erro</span>
```

### Progress Bars

```html
<div class="progress">
  <div class="progress-bar" style="width: 75%"></div>
</div>
```

### Loading States

#### Spinner
```html
<div class="loading">
  <div class="spinner"></div>
  Carregando...
</div>
```

#### Dots
```html
<div class="loading-dots">
  <span></span>
  <span></span>
  <span></span>
</div>
```

#### Wave
```html
<div class="loading-wave">
  <span></span>
  <span></span>
  <span></span>
  <span></span>
  <span></span>
</div>
```

## 📐 Sistema de Layout

### Container
```html
<div class="container">
  <!-- Conteúdo centralizado com max-width -->
</div>
```

### Grid System
```html
<div class="grid grid-cols-3 gap-4">
  <div>Item 1</div>
  <div>Item 2</div>
  <div>Item 3</div>
</div>
```

### Flexbox Utilities
```html
<div class="flex items-center justify-between gap-4">
  <div>Item 1</div>
  <div>Item 2</div>
</div>
```

## 🎭 Animações

### Classes de Animação
```html
<!-- Animações de entrada -->
<div class="animate-slide-in-up">Slide Up</div>
<div class="animate-slide-in-down">Slide Down</div>
<div class="animate-scale-in">Scale In</div>
<div class="animate-bounce-in">Bounce In</div>

<!-- Animações contínuas -->
<div class="animate-gentle-float">Float</div>
<div class="animate-gentle-pulse">Pulse</div>

<!-- Delays -->
<div class="animate-slide-in-up animate-delay-200">Com delay</div>
```

### Micro-interações
```html
<!-- Hover effects -->
<div class="hover-lift">Lift on hover</div>
<div class="hover-glow">Glow on hover</div>
<div class="hover-tilt">Tilt on hover</div>

<!-- Botão com ripple -->
<button class="btn btn-primary btn-ripple">Ripple Effect</button>
```

## 📱 Responsividade

### Breakpoints
- **sm**: 640px
- **md**: 768px
- **lg**: 1024px
- **xl**: 1280px
- **2xl**: 1536px

### Classes Responsivas
```html
<!-- Grid responsivo -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
  <!-- Itens -->
</div>

<!-- Visibilidade responsiva -->
<div class="hidden-mobile">Oculto no mobile</div>
<div class="visible-mobile">Visível apenas no mobile</div>
```

## ♿ Acessibilidade

### Foco Visível
Todos os elementos interativos têm estados de foco visíveis para navegação por teclado.

### Contraste
As cores seguem as diretrizes WCAG 2.1 AA para contraste adequado.

### Screen Readers
```html
<span class="sr-only">Texto apenas para leitores de tela</span>
<button class="sr-only-focusable">Visível apenas quando focado</button>
```

### Estados de Loading
```html
<button aria-busy="true" class="loading">
  <div class="spinner"></div>
  Carregando...
</button>
```

## 🚀 Performance

### Otimizações Incluídas
- Aceleração por GPU para animações
- Lazy loading de imagens
- Preconnect para fontes
- Fallbacks para navegadores antigos
- Otimizações de will-change
- Suporte a prefers-reduced-motion

### Como Usar
```html
<!-- Preconnect no head -->
<link rel="preconnect" href="https://fonts.googleapis.com">

<!-- Lazy loading -->
<img src="image.jpg" loading="lazy" alt="Descrição">

<!-- GPU acceleration -->
<div class="gpu-layer animate-slide-in-up">Conteúdo</div>
```

## 🎨 Modo Escuro

O sistema suporta automaticamente modo escuro baseado na preferência do sistema:

```css
@media (prefers-color-scheme: dark) {
  /* Cores adaptadas automaticamente */
}
```

## 📄 Como Usar

### 1. Incluir os Arquivos CSS
```html
<link rel="stylesheet" href="shared/design-system.css">
<link rel="stylesheet" href="shared/components.css">
<link rel="stylesheet" href="shared/performance.css">
```

### 2. Estrutura HTML Básica
```html
<!DOCTYPE html>
<html lang="pt-br">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Aplicação</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="stylesheet" href="../shared/design-system.css">
  <link rel="stylesheet" href="../shared/components.css">
</head>
<body>
  <header class="app-header">
    <!-- Header padronizado -->
  </header>
  
  <main class="container">
    <!-- Conteúdo principal -->
  </main>
  
  <footer class="app-footer">
    <!-- Footer padronizado -->
  </footer>
</body>
</html>
```

### 3. Header Padronizado
```html
<header class="app-header">
  <div class="brand">
    <div class="brand-logos">
      <img src="pm.png" alt="Pague Menos" class="brand-logo primary">
      <img src="logo.png" alt="Danilo" class="brand-logo secondary">
    </div>
    <div class="brand-text">
      <h1>Pague Menos</h1>
      <span class="app-subtitle">Etiquetas • [Nome da Aplicação]</span>
    </div>
  </div>
  <div class="actions">
    <button class="btn btn-ghost">
      <svg>...</svg>
      Imprimir
    </button>
    <a href="#" class="btn btn-ghost">
      <svg>...</svg>
      Ajuda
    </a>
  </div>
</header>
```

### 4. Footer Padronizado
```html
<footer class="app-footer">
  <div class="container">
    <div class="footer-content">
      <div class="footer-info">
        <p class="footer-title">Sistema de Etiquetas Pague Menos</p>
        <p class="footer-subtitle">Desenvolvido por Danilo Pires</p>
      </div>
      <div class="footer-links">
        <a href="#" class="footer-link">
          <svg>...</svg>
          Suporte
        </a>
      </div>
    </div>
  </div>
</footer>
```

## 🔧 Customização

### Sobrescrever Tokens
```css
:root {
  --brand-primary: #sua-cor;
  --font-primary: 'Sua-Fonte', sans-serif;
}
```

### Adicionar Variações de Componentes
```css
.btn-custom {
  background: var(--sua-cor);
  color: white;
}
```

## 📋 Checklist de Implementação

- [ ] Incluir arquivos CSS do design system
- [ ] Implementar header padronizado
- [ ] Implementar footer padronizado
- [ ] Usar tokens de design para cores e espaçamentos
- [ ] Aplicar classes de componentes
- [ ] Testar responsividade
- [ ] Verificar acessibilidade
- [ ] Otimizar performance
- [ ] Testar em diferentes navegadores

## 🐛 Troubleshooting

### Problemas Comuns

1. **Fontes não carregam**: Verificar preconnect no head
2. **Animações não funcionam**: Verificar prefers-reduced-motion
3. **Layout quebrado no IE**: Usar fallbacks incluídos
4. **Performance lenta**: Verificar will-change e GPU acceleration

### Suporte a Navegadores

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+
- IE 11 (com fallbacks)

## 📞 Suporte

Para dúvidas ou problemas com o design system, entre em contato:
- WhatsApp: [+55 62 98102-0272](https://wa.me/5562981020272)
- Desenvolvedor: Danilo Pires