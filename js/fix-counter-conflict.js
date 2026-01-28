/**
 * Correção do conflito de múltiplas instâncias do contador global
 * PROBLEMA: Há dois arquivos criando window.contadorGlobal
 * - contador-global-centralizado.js
 * - contador-global-otimizado.js
 * 
 * Isso causa incrementos duplicados e overflow
 */

console.log('🔧 Iniciando correção do conflito de contadores...');

// Função para detectar e corrigir múltiplas instâncias
function fixCounterConflict() {
    // 1. Verificar se há múltiplas instâncias sendo carregadas
    const scripts = Array.from(document.querySelectorAll('script[src]'));
    const counterScripts = scripts.filter(script => 
        script.src.includes('contador-global') && 
        !script.src.includes('fix-counter-conflict')
    );
    
    if (counterScripts.length > 1) {
        console.warn('⚠️ Múltiplos scripts de contador detectados:', counterScripts.length);
        counterScripts.forEach(script => {
            console.log('📄 Script encontrado:', script.src);
        });
    }
    
    // 2. Garantir que apenas uma instância seja ativa
    if (window.contadorGlobal) {
        console.log('📊 Contador global existente detectado');
        
        // Verificar se o valor está correto
        const valorAtual = window.contadorGlobal.valorAtual || window.contadorGlobal.obterValor();
        
        if (valorAtual > 200000 || valorAtual === 2147483717) {
            console.warn('🔧 Valor incorreto detectado no contador ativo:', valorAtual);
            
            // Resetar para valor realista
            if (typeof window.contadorGlobal.valorAtual !== 'undefined') {
                window.contadorGlobal.valorAtual = 135000;
            }
            
            // Salvar estado corrigido
            if (typeof window.contadorGlobal.salvarEstadoLocal === 'function') {
                window.contadorGlobal.salvarEstadoLocal();
            }
            
            console.log('✅ Contador ativo corrigido para valor realista: 135000');
        }
    }
    
    // 3. Interceptar criação de novas instâncias
    const originalContadorGlobal = window.contadorGlobal;
    
    Object.defineProperty(window, 'contadorGlobal', {
        get: function() {
            return originalContadorGlobal;
        },
        set: function(newValue) {
            if (originalContadorGlobal && newValue !== originalContadorGlobal) {
                console.warn('⚠️ Tentativa de sobrescrever contador global bloqueada');
                console.log('🛡️ Mantendo instância original para evitar conflitos');
                return; // Bloquear sobrescrita
            }
            
            // Permitir apenas a primeira atribuição
            if (!originalContadorGlobal) {
                console.log('✅ Primeira instância do contador global aceita');
                Object.defineProperty(window, 'contadorGlobal', {
                    value: newValue,
                    writable: false, // Impedir futuras sobrescritas
                    configurable: false
                });
            }
        },
        configurable: true
    });
    
    // 4. Limpar localStorage de versões conflitantes
    const keysToCheck = [
        'contador_global_centralizado_v1',
        'contador_global_centralizado_v2', 
        'contador-global-estado'
    ];
    
    let valorCorreto = 135000; // Valor realista padrão
    
    keysToCheck.forEach(key => {
        try {
            const data = localStorage.getItem(key);
            if (data) {
                const parsed = JSON.parse(data);
                const valor = parsed.totalEtiquetas || parsed.valorAtual;
                
                if (valor && valor > 200000) {
                    console.warn(`🔧 Corrigindo ${key}: ${valor} → ${valorCorreto}`);
                    
                    if (parsed.totalEtiquetas) {
                        parsed.totalEtiquetas = valorCorreto;
                    }
                    if (parsed.valorAtual) {
                        parsed.valorAtual = valorCorreto;
                    }
                    
                    parsed.ultimaAtualizacao = new Date().toISOString();
                    localStorage.setItem(key, JSON.stringify(parsed));
                }
            }
        } catch (error) {
            console.warn(`Erro ao corrigir ${key}:`, error);
        }
    });
    
    console.log('✅ Correção do conflito de contadores concluída');
}

// Função para monitorar incrementos suspeitos
function monitorCounterIncrements() {
    if (!window.contadorGlobal) return;
    
    const originalIncrement = window.contadorGlobal.incrementar || window.contadorGlobal.incrementarContador;
    
    if (originalIncrement) {
        let lastIncrement = Date.now();
        let incrementCount = 0;
        
        const wrappedIncrement = async function(quantidade = 1, tipo = 'geral') {
            const now = Date.now();
            
            // Detectar incrementos muito frequentes (possível loop)
            if (now - lastIncrement < 100) { // Menos de 100ms
                incrementCount++;
                if (incrementCount > 5) {
                    console.warn('⚠️ Incrementos muito frequentes detectados - possível loop');
                    console.warn('🛑 Bloqueando incremento para prevenir overflow');
                    return;
                }
            } else {
                incrementCount = 0;
            }
            
            lastIncrement = now;
            
            // Verificar se a quantidade é suspeita
            if (quantidade > 1000) {
                console.warn('⚠️ Incremento suspeito bloqueado:', quantidade);
                return;
            }
            
            return await originalIncrement.call(this, quantidade, tipo);
        };
        
        // Substituir método original
        if (window.contadorGlobal.incrementar) {
            window.contadorGlobal.incrementar = wrappedIncrement;
        }
        if (window.contadorGlobal.incrementarContador) {
            window.contadorGlobal.incrementarContador = wrappedIncrement;
        }
        
        console.log('🛡️ Monitoramento de incrementos ativado');
    }
}

// Executar correções
fixCounterConflict();

// Aguardar contador estar disponível e aplicar monitoramento
setTimeout(() => {
    monitorCounterIncrements();
}, 1000);

// Exportar para uso global
window.fixCounterConflict = fixCounterConflict;

console.log('🛠️ Sistema de correção de conflitos do contador carregado');