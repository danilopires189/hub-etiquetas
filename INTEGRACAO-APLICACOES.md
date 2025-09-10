# 🔗 Como Integrar o Contador nas Suas Aplicações

## 🧪 Teste Rápido no Hub

1. **Abra o index.html no navegador**
2. **Clique no botão "🧪 Testar +1"** na navegação
3. **Veja o contador incrementar em tempo real**

## 📝 Código para Suas Aplicações

### Método 1: Integração Simples
Adicione este código no botão "Gerar Etiquetas" das suas aplicações:

```javascript
// No evento de click do botão gerar
document.getElementById('btn-gerar').addEventListener('click', function() {
    // Sua lógica de geração existente aqui...
    
    // Depois incrementa o contador
    const quantidade = parseInt(document.getElementById('quantidade').value) || 1;
    
    if (window.HubEtiquetas) {
        window.HubEtiquetas.incrementarContador(quantidade);
        console.log('✅ Contador incrementado:', quantidade);
    }
});
```

### Método 2: Integração Completa
Para uma integração mais robusta:

```javascript
// Função auxiliar para verificar disponibilidade
function obterContadorHub() {
    // Se estiver em iframe dentro do Hub
    if (window.parent && window.parent.HubEtiquetas) {
        return window.parent.HubEtiquetas;
    }
    // Se estiver na mesma página
    if (window.HubEtiquetas) {
        return window.HubEtiquetas;
    }
    // Fallback se não estiver disponível
    return null;
}

// Função para incrementar com feedback
function incrementarContadorSeguro(quantidade, tipo = 'geral') {
    const contador = obterContadorHub();
    
    if (contador) {
        const novoTotal = contador.incrementarContador(quantidade);
        
        // Mostra feedback visual
        mostrarNotificacao(`✅ ${quantidade} etiqueta(s) contabilizada(s)! Total: ${novoTotal.toLocaleString('pt-BR')}`);
        
        return novoTotal;
    } else {
        console.warn('Sistema de contador não disponível');
        return null;
    }
}

// Exemplo de uso no seu código existente
function gerarEtiquetas() {
    const quantidade = parseInt(document.getElementById('quantidade').value);
    
    // Sua lógica de geração aqui...
    console.log(`Gerando ${quantidade} etiquetas...`);
    
    // Incrementa o contador
    incrementarContadorSeguro(quantidade, 'placas');
}
```

## 🎯 Exemplos por Aplicação

### Etiquetas de Produto (placas/)
```javascript
// No final da função de geração
if (window.HubEtiquetas) {
    const qtdGerada = calcularQuantidadeEtiquetas(); // sua função
    window.HubEtiquetas.incrementarContador(qtdGerada);
}
```

### Etiquetas de Caixa (caixa/)
```javascript
// Após gerar PDF das caixas
const numeroCaixas = document.querySelectorAll('.caixa-item').length;
window.HubEtiquetas?.incrementarContador(numeroCaixas);
```

### Volume Avulso (avulso/)
```javascript
// Para cada volume processado
document.querySelectorAll('.volume').forEach(volume => {
    // Processa volume...
    window.HubEtiquetas?.incrementarContador(1);
});
```

## 🔧 Modificações Necessárias

### 1. Identifique o Botão de Geração
Encontre o botão ou função que gera as etiquetas em cada aplicação.

### 2. Adicione o Incremento
Logo após a geração bem-sucedida, adicione:
```javascript
window.HubEtiquetas?.incrementarContador(quantidadeGerada);
```

### 3. Teste Local
- Abra a aplicação
- Gere algumas etiquetas
- Volte ao Hub e veja se o contador aumentou

## 📱 Exemplo Prático

Veja o arquivo `placas/exemplo-integracao.html` para um exemplo completo funcionando.

## 🐛 Troubleshooting

### Contador não incrementa
1. **Verifique o console**: Abra F12 e veja se há erros
2. **Teste a API**: Digite no console: `window.HubEtiquetas.incrementarContador(1)`
3. **Verifique o contexto**: A aplicação está sendo executada dentro do Hub?

### Valores inconsistentes
1. **Limpe o localStorage**: `localStorage.clear()` no console
2. **Recarregue a página**
3. **Verifique se não há múltiplos incrementos**

### API não disponível
```javascript
// Sempre use verificação
if (typeof window.HubEtiquetas !== 'undefined') {
    window.HubEtiquetas.incrementarContador(1);
} else {
    console.log('Sistema de contador não disponível');
}
```

## 🚀 Próximos Passos

1. **Teste o botão no Hub** (🧪 Testar +1)
2. **Integre uma aplicação por vez**
3. **Teste cada integração**
4. **Configure o GitHub para sincronização global**

## 💡 Dicas

- Use `?.` (optional chaining) para evitar erros: `window.HubEtiquetas?.incrementarContador(1)`
- Sempre incremente APÓS a geração bem-sucedida
- Considere o tipo de etiqueta para estatísticas futuras
- Teste em diferentes navegadores

## 📞 Suporte

Se tiver dúvidas:
1. Verifique os logs no console (F12)
2. Teste o exemplo em `placas/exemplo-integracao.html`
3. Consulte o `README-contador.md` para configuração avançada