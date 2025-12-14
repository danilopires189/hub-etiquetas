# Sistema de Etiquetas Pague Menos

Sistema web integrado para geração, gerenciamento e impressão de etiquetas padronizadas para diversas operações logísticas da Pague Menos.

## 🚀 Módulos Disponíveis

O sistema é composto por módulos especializados para diferentes necessidades:

### � Operação Logística
- **Etiqueta de Mercadoria** (`etiqueta-mercadoria`): Geração de etiquetas de endereçamento (Pulmão/Separação) com busca por código de barras.
- **Volume Avulso** (`avulso`): Etiquetas para volumes avulsos com controle de sequenciamento.
- **Caixa** (`caixa`): Etiquetas para caixas de expedição.
- **Endereçamento** (`enderec`): Geração em massa de etiquetas de localização (Ruas, Estações, Blocos).

### 🚛 Transporte e Transferência
- **Transferência CD → CD** (`transferencia`): Documentos e etiquetas para transferência entre CDs.
- **Pedido Direto** (`pedido-direto`): Gestão de etiquetas para pedidos diretos.

### 🌡️ Controle de Qualidade
- **Termolábeis** (`termo`): Etiquetas especiais para produtos sensíveis à temperatura.

### 🏷️ Loja e Precificação
- **Precificação/Gôndola** (`placas`): Etiquetas de preço e sinalização para lojas.

---

## ⚡ Características Principais

- **Design Premium**: Interface moderna com glassmorphism, animações fluídas e foco na experiência do usuário (UX).
- **Performance**: Carregamento instantâneo, funcionamento offline (PWA) e cache local agressivo.
- **Contador Universal**: Sistema centralizado que contabiliza todas as etiquetas geradas em todos os módulos.
- **Histórico Local**: Armazenamento automático das últimas etiquetas geradas (retenção de 60-90 dias).
- **Validação Inteligente**: Prevenção de erros com feedback visual imediato e validação de formatos.
- **Impressão Otimizada**: Layouts calibrados milimetricamente para impressoras térmicas (Zebra, Argox, etc.).

## 🔧 Estrutura do Projeto

```
/
├── index.html              # Hub Central (Menu Principal)
├── etiqueta-mercadoria/    # [NOVO] Módulo de Mercadoria (Pulmão/Separação)
├── avulso/                 # Módulo Volume Avulso
├── caixa/                  # Módulo de Caixas
├── termo/                  # Módulo de Termolábeis
├── enderec/                # Módulo de Endereçamento
├── transferencia/          # Módulo de Transferência
├── pedido-direto/          # Módulo de Pedido Direto
├── placas/                 # Módulo de Precificação
├── shared/                 # Código Compartilhado (CSS, JS, Utils)
│   ├── design-system.css   # Estilos Globais
│   └── barcode.js          # Geração Centralizada de Barcodes
└── js/                     # Scripts Globais
    └── contador-global-centralizado.js
```

## 🚀 Como Usar

1. **Acesse o Hub**: Abra o ficheiro `index.html` raiz.
2. **Selecione o Módulo**: Escolha a ferramenta desejada no menu principal.
3. **Preencha os Dados**: Utilize os formulários inteligentes (muitos suportam leitura por bipe).
4. **Imprima**: O sistema gera o layout exato para impressão térmica (configuração padrão: 90mm x 42mm ou similar, ajustável).

## � Requisitos Técnicos

- Navegador moderno (Chrome, Edge, Firefox, Safari).
- Não requer servidor (roda localmente ou em hospedagem estática como GitHub Pages).
- Javascript habilitado.

---

**Desenvolvido por Danilo Pires.**
