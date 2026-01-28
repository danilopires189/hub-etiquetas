/**
 * Correção de Performance e Fluxo de Impressão - Etiqueta Mercadoria
 * Resolve os problemas de:
 * 1. Impressão não abrindo automaticamente
 * 2. Prévia demorada (7 segundos)
 */

// Cache para otimização de renderização
const renderCache = new Map();
let isProcessing = false;

// Função otimizada para geração instantânea de prévia
function generatePreviewOptimized(product, targetAddress, barcode, copies, validityDate, includeZona, selectedDeposito) {
    console.log('⚡ Gerando prévia otimizada...');
    
    const startTime = performance.now();
    
    try {
        // Usar cache se disponível
        const cacheKey = `${barcode}-${copies}-${validityDate}-${selectedDeposito}`;
        if (renderCache.has(cacheKey)) {
            const cached = renderCache.get(cacheKey);
            ui.preview.innerHTML = '';
            ui.preview.appendChild(cached.cloneNode(true));
            console.log(`⚡ Prévia carregada do cache em ${(performance.now() - startTime).toFixed(1)}ms`);
            return;
        }

        // Gerar etiqueta de forma otimizada
        const labelEl = generateLabelOptimized(product, targetAddress, barcode, copies, validityDate, includeZona, selectedDeposito);
        
        // Renderizar prévia
        ui.preview.innerHTML = '';
        ui.preview.appendChild(labelEl.cloneNode(true));
        
        // Armazenar no cache (limitar tamanho)
        if (renderCache.size > 20) {
            const firstKey = renderCache.keys().next().value;
            renderCache.delete(firstKey);
        }
        renderCache.set(cacheKey, labelEl.cloneNode(true));
        
        const endTime = performance.now();
        console.log(`⚡ Prévia gerada em ${(endTime - startTime).toFixed(1)}ms`);
        
    } catch (error) {
        console.error('❌ Erro na geração otimizada da prévia:', error);
        ui.preview.innerHTML = '<p style="color: #ef4444;">Erro ao gerar prévia</p>';
    }
}

// Função otimizada para geração de etiqueta
function generateLabelOptimized(product, targetAddress, barcode, copies, validityDate, includeZona, selectedDeposito) {
    // Usar a função original mas com otimizações
    const labelEl = generateLabel(product, targetAddress, barcode, copies, validityDate, includeZona, selectedDeposito);
    
    // Otimizações de DOM
    labelEl.style.willChange = 'transform';
    labelEl.style.contain = 'layout style paint';
    
    return labelEl;
}

// Função corrigida para impressão garantida
function guaranteedPrint() {
    console.log('🖨️ Executando impressão garantida...');
    
    return new Promise((resolve) => {
        // Múltiplas tentativas de impressão
        let attempts = 0;
        const maxAttempts = 3;
        
        function tryPrint() {
            attempts++;
            console.log(`🖨️ Tentativa de impressão ${attempts}/${maxAttempts}`);
            
            try {
                // Garantir que o foco está na janela
                window.focus();
                
                // Executar impressão
                window.print();
                
                console.log('✅ Impressão executada com sucesso');
                resolve(true);
                
            } catch (error) {
                console.error(`❌ Erro na tentativa ${attempts}:`, error);
                
                if (attempts < maxAttempts) {
                    // Tentar novamente após delay
                    setTimeout(tryPrint, 200);
                } else {
                    console.error('❌ Todas as tentativas de impressão falharam');
                    showStatus('Erro ao abrir impressão. Clique em "Imprimir" manualmente.', 'error');
                    resolve(false);
                }
            }
        }
        
        // Iniciar primeira tentativa
        tryPrint();
    });
}

// Função principal otimizada para executar impressão
async function executeOptimizedPrint(copies, validityDate = null) {
    if (!pendingData || isProcessing) return;
    
    isProcessing = true;
    console.log('🚀 Iniciando processo otimizado de impressão...');
    
    try {
        let { product, targetAddress, barcode, matricula, destinoType } = pendingData;

        // Aplicar lógica de destino automático (código original)
        if (destinoType === 'automatico') {
            if (copies === 1) {
                if (targetAddress.separacaoList && targetAddress.separacaoList.length > 0) {
                    targetAddress = targetAddress.separacaoList[0];
                    const largeNumVal = getPadraoLargeNum(targetAddress.ENDERECO);
                    const p = targetAddress.ENDERECO.split('.');
                    if (p.length > 1) p.pop();
                    const shortAddrVal = p.join('.');

                    targetAddress.formatted = {
                        largeNum: largeNumVal,
                        shortAddr: shortAddrVal
                    };
                    destinoType = 'separacao';
                }
            } else {
                if (targetAddress.pulmaoList && targetAddress.pulmaoList.length > 0) {
                    targetAddress = targetAddress.pulmaoList[targetAddress.pulmaoList.length - 1];
                    const largeNumVal = getLargeSuffix(targetAddress.ENDERECO);
                    const p = targetAddress.ENDERECO.split('.');
                    p.pop();
                    const shortAddrVal = p.join('.');

                    targetAddress.formatted = {
                        largeNum: largeNumVal,
                        shortAddr: shortAddrVal
                    };
                    destinoType = 'pulmao';
                }
            }
        }

        // Limpar dados pendentes
        pendingData = null;

        // Status otimizado
        let statusMessage = '';
        if (destinoType === 'automatico') {
            const actualType = targetAddress.TIPO || 'DESCONHECIDO';
            statusMessage = `Gerando etiquetas: ${product.DESC} (AUTO → ${actualType})`;
        } else {
            statusMessage = `Gerando etiquetas: ${product.DESC} (${destinoType.toUpperCase()})`;
        }
        showStatus(statusMessage, 'success');

        const includeZona = true;
        const selectedDeposito = ui.depositoSelect.value;

        // 1. GERAR ETIQUETA PARA IMPRESSÃO (prioritário)
        console.log('📄 Gerando etiqueta para impressão...');
        const labelEl = generateLabelOptimized(product, targetAddress, barcode, copies, validityDate, includeZona, selectedDeposito);

        // 2. APLICAR DIMENSÕES
        const w = ui.widthInput.value || '90';
        const h = ui.heightInput.value || '42';
        document.documentElement.style.setProperty('--label-width', w + 'mm');
        document.documentElement.style.setProperty('--label-height', h + 'mm');

        // 3. PREPARAR ÁREA DE IMPRESSÃO
        ui.print.innerHTML = '';
        ui.print.appendChild(labelEl);

        // 4. ATUALIZAR CONTADOR IMEDIATAMENTE
        if (window.contadorGlobal && typeof window.contadorGlobal.incrementarLocalmente === 'function') {
            window.contadorGlobal.incrementarLocalmente(copies);
            console.log(`⚡ Contador atualizado: +${copies}`);
        } else if (window.contadorGlobal) {
            window.contadorGlobal.valorAtual += copies;
            window.contadorGlobal.salvarEstadoLocal();
            window.dispatchEvent(new CustomEvent('contador-atualizado', {
                detail: { valor: window.contadorGlobal.valorAtual, incremento: copies, tipo: 'mercadoria' }
            }));
        }

        // 5. EXECUTAR IMPRESSÃO IMEDIATAMENTE
        console.log('🖨️ Executando impressão...');
        const printSuccess = await guaranteedPrint();

        // 6. FEEDBACK VISUAL
        if (window.contadorGlobal) {
            const totais = window.contadorGlobal.valorAtual;
            mostrarPopupSucesso('Etiquetas geradas!', `+${copies} etiquetas | Total: ${totais.toLocaleString('pt-BR')}`);
        }

        // 7. GERAR PRÉVIA EM BACKGROUND (não bloquear)
        setTimeout(() => {
            generatePreviewOptimized(product, targetAddress, barcode, copies, validityDate, includeZona, selectedDeposito);
        }, 50);

        // 8. SALVAR HISTÓRICO EM BACKGROUND
        setTimeout(() => {
            saveHistory({
                desc: product.DESC,
                coddv: product.CODDV,
                barcode: barcode,
                matricula: matricula,
                userName: currentUser ? currentUser.Nome : null,
                address: targetAddress.ENDERECO,
                type: destinoType,
                deposito: selectedDeposito,
                copies: copies,
                validity: validityDate,
                zona: includeZona,
                machine: getMachineName(),
                timestamp: new Date().toISOString()
            });
        }, 100);

        // 9. SALVAR NO SUPABASE EM BACKGROUND (não bloquear)
        setTimeout(async () => {
            try {
                console.log('📡 Salvando no Supabase...');
                const manager = await waitForSupabaseManager(1500);

                if (manager) {
                    const entryData = {
                        cd: selectedDeposito,
                        codv: product.CODDV,
                        ean: barcode,
                        descricao: product.DESC,
                        destino_tipo: destinoType,
                        endereco_tipo: targetAddress.TIPO || 'N/A',
                        endereco: targetAddress.ENDERECO,
                        quantidade: copies,
                        validade: validityDate,
                        zona: includeZona,
                        matricula: matricula,
                        nome_usuario: currentUser ? currentUser.Nome : 'Desconhecido',
                        maquina: getMachineName()
                    };

                    await manager.saveEtiquetaEntrada(entryData);
                    console.log('✅ Dados salvos no Supabase');
                } else {
                    console.warn('⚠️ Supabase indisponível - dados salvos localmente');
                }
            } catch (error) {
                console.warn('⚠️ Erro no Supabase (não afeta operação):', error);
            }
        }, 200);

        // 10. LIMPEZA PÓS-IMPRESSÃO
        handlePostPrintCleanup();

        console.log('✅ Processo otimizado concluído');

    } catch (error) {
        console.error('❌ Erro no processo otimizado:', error);
        showStatus('Erro ao processar etiqueta: ' + error.message, 'error');
    } finally {
        isProcessing = false;
    }
}

// Função para limpar cache quando necessário
function clearRenderCache() {
    renderCache.clear();
    console.log('🧹 Cache de renderização limpo');
}

// Função para interceptar e otimizar o fluxo original
function applyPerformanceOptimizations() {
    console.log('⚡ Aplicando otimizações de performance...');

    // Interceptar a função executePrint original
    if (typeof window.executePrint !== 'undefined') {
        const originalExecutePrint = window.executePrint;
        
        window.executePrint = async function(copies, validityDate = null) {
            console.log('🔧 Usando fluxo otimizado de impressão');
            return await executeOptimizedPrint(copies, validityDate);
        };
        
        console.log('✅ Função executePrint otimizada');
    }

    // Otimizar eventos de redimensionamento
    let resizeTimeout;
    const originalUpdateDimensions = window.updateDimensions;
    if (originalUpdateDimensions) {
        window.updateDimensions = function() {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                originalUpdateDimensions();
                clearRenderCache(); // Limpar cache quando dimensões mudam
            }, 150);
        };
    }

    // Adicionar limpeza de cache periódica
    setInterval(() => {
        if (renderCache.size > 10) {
            console.log('🧹 Limpeza automática de cache');
            clearRenderCache();
        }
    }, 300000); // 5 minutos

    console.log('✅ Otimizações aplicadas com sucesso');
}

// Aplicar otimizações quando o DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(applyPerformanceOptimizations, 500);
    });
} else {
    setTimeout(applyPerformanceOptimizations, 500);
}

// Exportar funções para uso global
window.performanceOptimizations = {
    executeOptimizedPrint,
    generatePreviewOptimized,
    guaranteedPrint,
    clearRenderCache,
    applyPerformanceOptimizations
};

console.log('⚡ Otimizações de performance carregadas');