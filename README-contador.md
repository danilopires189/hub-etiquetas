# 📊 Sistema de Contador Global de Etiquetas

Este sistema permite contabilizar etiquetas geradas globalmente, mesmo quando hospedado no GitHub Pages.

## 🚀 Como Funciona

### Modo Local (Padrão)
- Funciona imediatamente sem configuração
- Salva no localStorage do navegador
- Cada usuário tem seu próprio contador

### Modo Global (GitHub)
- Sincroniza entre todos os usuários
- Usa arquivo JSON no repositório
- Requer configuração inicial

## ⚙️ Configuração para Modo Global

### 1. Editar Configuração
Abra `config/contador-config.js` e configure:

```javascript
github: {
  usuario: 'seu-usuario-github',
  repositorio: 'nome-do-repositorio',
  branch: 'main'
}
```

### 2. Atualizar index.html
No arquivo `index.html`, linha ~XXX, substitua:
```javascript
githubUrl: 'https://raw.githubusercontent.com/SEU_USUARIO/SEU_REPO/main/data/contador.json'
```

Por:
```javascript
githubUrl: 'https://raw.githubusercontent.com/seu-usuario/seu-repo/main/data/contador.json'
```

### 3. Fazer Deploy
1. Commit dos arquivos
2. Push para GitHub
3. Ativar GitHub Pages nas configurações do repo

## 📈 Como Usar nas Aplicações

### Incrementar Contador
```javascript
// Incrementar 1 etiqueta
window.HubEtiquetas.incrementarContador(1);

// Incrementar múltiplas etiquetas
window.HubEtiquetas.incrementarContador(5);

// Com tipo específico
window.HubEtiquetas.incrementarContador(3, 'placas');
```

### Obter Total Atual
```javascript
const total = window.HubEtiquetas.obterTotal();
console.log('Total de etiquetas:', total);
```

### Exemplo Completo
```javascript
// No botão "Gerar Etiquetas"
document.getElementById('btn-gerar').addEventListener('click', function() {
    // Sua lógica de geração aqui
    const quantidade = document.getElementById('quantidade').value || 1;
    
    // Gerar as etiquetas...
    gerarEtiquetas(quantidade);
    
    // Incrementar contador
    window.HubEtiquetas.incrementarContador(parseInt(quantidade));
});
```

## 🔄 Sincronização Avançada (Opcional)

### Webhook para Tempo Real
Configure um webhook no `contador-config.js`:

```javascript
webhook: {
  url: 'https://hooks.zapier.com/hooks/catch/SEU_ID/',
  ativo: true
}
```

### Serviços Sugeridos
- **Zapier**: Automação simples
- **IFTTT**: Integração com outros serviços  
- **Firebase**: Banco de dados em tempo real
- **Supabase**: Alternativa open-source

## 📁 Estrutura de Arquivos

```
├── data/
│   └── contador.json          # Dados do contador
├── config/
│   └── contador-config.js     # Configurações
├── js/
│   └── contador-github.js     # Lógica GitHub (opcional)
├── api/
│   └── incrementar.php        # API PHP (se disponível)
└── index.html                 # Página principal
```

## 🛠️ Troubleshooting

### Contador não aparece
- Verifique se o JavaScript está carregando
- Abra o console do navegador para ver erros

### Sincronização não funciona
- Verifique se as URLs do GitHub estão corretas
- Confirme que o arquivo `data/contador.json` existe
- Teste a URL diretamente no navegador

### Valores inconsistentes
- O sistema sempre usa o maior valor encontrado
- Limpe o localStorage se necessário: `localStorage.clear()`

## 📊 Monitoramento

O sistema registra logs no console:
- `📊 Contador de etiquetas inicializado`
- `🔄 Sincronizado com GitHub: XXXX`
- `📈 Contador atualizado: +X (Total: XXXX)`

## 🔒 Segurança

- Não expõe tokens ou credenciais
- Funciona apenas com repositórios públicos
- Dados são apenas incrementais (não permite decrementos)

## 🚀 Deploy no GitHub Pages

1. Faça fork/clone do repositório
2. Configure os arquivos conforme instruções
3. Vá em Settings > Pages
4. Selecione source: Deploy from branch
5. Escolha branch: main
6. Salve e aguarde deploy

Sua aplicação estará disponível em:
`https://seu-usuario.github.io/seu-repositorio/`