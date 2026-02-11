# 🏷️ Hub de Etiquetas - Pague Menos

Sistema integrado de geração de etiquetas para uso interno da rede Pague Menos.

![Status](https://img.shields.io/badge/status-production-brightgreen)
![Version](https://img.shields.io/badge/version-2.0.0-blue)
![Deploy](https://img.shields.io/badge/deploy-Vercel-black)

---

## 📋 Índice

- [Sobre](#-sobre)
- [Módulos](#-módulos)
- [Tecnologias](#-tecnologias)
- [Instalação](#-instalação)
- [Uso](#-uso)
- [Estrutura do Projeto](#-estrutura-do-projeto)
- [Contribuição](#-contribuição)

---

## 📖 Sobre

O **Hub de Etiquetas** é uma plataforma web completa para geração de diversos tipos de etiquetas utilizadas nas operações logísticas e de estoque das lojas Pague Menos.

### ✨ Funcionalidades Principais

- 🏷️ Geração de múltiplos tipos de etiquetas
- 📊 Contador global sincronizado com Supabase
- 🔄 Sincronização com banco de dados Supabase
- 📱 Interface responsiva (desktop e mobile)
- 🌙 Suporte a Dark Mode
- ⌨️ Atalhos de teclado para produtividade
- 📈 Contador global de etiquetas geradas

---

## 🧩 Módulos

| Módulo | Descrição | Atalho |
|--------|-----------|--------|
| **Etiquetas de Produto** | Placas de preço para gôndolas | `Ctrl+0` |
| **Etiquetas de Caixa** | Identificação de volumes | `Ctrl+1` |
| **Volume Avulso** | Etiquetas para produtos avulsos | `Ctrl+2` |
| **Endereçamento** | Etiquetas de localização no CD | `Ctrl+3` |
| **Transferência** | Etiquetas para transferência CD→CD | `Ctrl+4` |
| **Termolábeis** | Etiquetas para produtos refrigerados | `Ctrl+5` |
| **Pedido Direto** | Etiquetas para pedidos diretos | `Ctrl+6` |
| **Etiqueta de Mercadoria** | Identificação geral de mercadorias | `Ctrl+7` |
| **Inventário** | Suporte para operações de inventário | `Ctrl+8` |
| **Endereçamento Fraldas** | Gestão de endereçamento específico | `Ctrl+9` |

---

## 🛠️ Tecnologias

- **Frontend**: HTML5, CSS3, JavaScript ES6+
- **Design System**: CSS Custom Properties (variáveis)
- **Banco de Dados**: Supabase (PostgreSQL)
- **Geração de Códigos**: JsBarcode, QRCode.js
- **Deploy**: Vercel (Static Site)
- **Fontes**: Google Fonts (Inter)

---

## 🚀 Instalação

### Pré-requisitos

- Node.js 18+ (opcional, apenas para servidor local)
- Navegador moderno (Chrome, Firefox, Edge, Safari)

### Executar Localmente

```bash
# Clonar repositório
git clone https://github.com/danilopires189/hub-etiquetas.git

# Entrar no diretório
cd hub-etiquetas

# Instalar dependências (opcional)
npm install

# Iniciar servidor local
npm run dev
```

O sistema estará disponível em `http://localhost:3000`

### Deploy em Produção

O projeto está configurado para deploy automático no Vercel. Cada push para a branch `main` dispara um novo deploy.

---

## 📁 Estrutura do Projeto

```
hub-etiquetas/
├── index.html              # Página principal (Hub)
├── css/                    # Estilos específicos
│   └── landing.css         # Estilos da landing page
├── js/                     # Scripts principais
│   ├── main.js             # Entry point
│   ├── landing.js          # Lógica da página inicial
│   └── contador-global.js  # Sistema de contagem
├── shared/                 # Recursos compartilhados
│   ├── design-system.css   # Variáveis e tokens
│   ├── components.css      # Componentes reutilizáveis
│   ├── mobile-dark-mode.css# Responsividade e dark mode
│   └── *.js                # Utilitários compartilhados
├── assets/                 # Imagens e ícones
├── supabase/               # Integração com Supabase
├── [módulos]/              # Cada módulo em sua pasta
│   ├── index.html
│   ├── styles.css
│   └── app.js
└── vercel.json             # Configuração de deploy
```

---

## 🔧 Configuração

### Variáveis de Ambiente

Para integração com Supabase, configure em `supabase/config.js`:

```javascript
const SUPABASE_URL = 'sua-url-supabase';
const SUPABASE_KEY = 'sua-chave-anon';
```

---

## 👥 Contribuição

1. Faça um fork do projeto
2. Crie sua branch de feature (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

---

## 📞 Suporte

- **Desenvolvedor**: Danilo Pires
- **WhatsApp**: [+55 62 98102-0272](https://wa.me/5562981020272)

---

## 📄 Licença

Este projeto é de uso interno da rede **Pague Menos**. Todos os direitos reservados.

---

<div align="center">
  <sub>Desenvolvido por ❤️ por Danilo Pires © 2026</sub>
</div>
