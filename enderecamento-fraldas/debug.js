/* ===== DEBUG - Verificar se as funções estão carregadas ===== */

// Verificar se as funções de scanner estão configuradas
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔍 === DEBUG INICIADO ===');
    
    // Verificar se é mobile
    const isMobile = window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    console.log('📱 É mobile?', isMobile);
    console.log('📱 User Agent:', navigator.userAgent);
    console.log('📱 Largura da tela:', window.innerWidth);
    
    // Verificar input de código do produto
    const codigoInput = document.getElementById('codigoProduto');
    if (codigoInput) {
        console.log('✅ Input codigoProduto encontrado');
        console.log('📋 Event listeners no input:', getEventListeners(codigoInput));
    } else {
        console.log('❌ Input codigoProduto NÃO encontrado');
    }
    
    // Verificar input de busca de endereços
    const campoBusca = document.getElementById('campoBusca');
    if (campoBusca) {
        console.log('✅ Input campoBusca encontrado');
    } else {
        console.log('❌ Input campoBusca NÃO encontrado');
    }
    
    // Verificar se enhanceMobileProductSearch foi chamada
    console.log('🔍 Função enhanceMobileProductSearch existe?', typeof enhanceMobileProductSearch === 'function');
    console.log('🔍 Função configurarDeteccaoScannerBusca existe?', typeof configurarDeteccaoScannerBusca === 'function');
    
    // Verificar se as funções de histórico têm ordenação
    console.log('🔍 Função exibirHistorico existe?', typeof exibirHistorico === 'function');
    console.log('🔍 Função exibirHistoricoCorrigido existe?', typeof exibirHistoricoCorrigido === 'function');
    
    console.log('🔍 === DEBUG CONCLUÍDO ===');
});

// Testar detecção de scanner manualmente
window.testarScannerDetection = function() {
    const input = document.getElementById('codigoProduto');
    if (!input) {
        console.log('❌ Input não encontrado');
        return;
    }
    
    console.log('🧪 Testando detecção de scanner...');
    
    // Simular entrada rápida (scanner)
    console.log('⏱️ Simulando entrada RÁPIDA (scanner)...');
    input.value = '';
    input.focus();
    
    const codigo = '123456';
    let i = 0;
    const intervalo = 30; // 30ms entre caracteres (menos que 50ms)
    
    const digitar = setInterval(() => {
        if (i < codigo.length) {
            input.value += codigo[i];
            input.dispatchEvent(new Event('input', { bubbles: true }));
            i++;
        } else {
            clearInterval(digitar);
            console.log('✅ Simulação de scanner concluída');
            console.log('⏳ Aguardando 200ms para ver se a busca automática foi acionada...');
            setTimeout(() => {
                console.log('📝 Valor atual do input:', input.value);
            }, 200);
        }
    }, intervalo);
};

// Testar entrada manual
window.testarEntradaManual = function() {
    const input = document.getElementById('codigoProduto');
    if (!input) {
        console.log('❌ Input não encontrado');
        return;
    }
    
    console.log('🧪 Testando entrada MANUAL...');
    
    input.value = '';
    input.focus();
    
    const codigo = '654321';
    let i = 0;
    const intervalo = 200; // 200ms entre caracteres (mais que 50ms)
    
    const digitar = setInterval(() => {
        if (i < codigo.length) {
            input.value += codigo[i];
            input.dispatchEvent(new Event('input', { bubbles: true }));
            i++;
        } else {
            clearInterval(digitar);
            console.log('✅ Simulação de digitação manual concluída');
            console.log('📝 O sistema NÃO deve ter acionado a busca automática');
            console.log('📝 Pressione Enter para buscar manualmente');
        }
    }, intervalo);
};

console.log('✅ Arquivo de debug carregado. Use:');
console.log('   testarScannerDetection() - para simular scanner');
console.log('   testarEntradaManual() - para simular digitação manual');
