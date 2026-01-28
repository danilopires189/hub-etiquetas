/**
 * Correção do fluxo de impressão para etiqueta-mercadoria
 * Este arquivo corrige os problemas que impedem a abertura da impressão
 */

// Função corrigida para processar etiquetas com tratamento robusto de erros
async function processLabelGenerationFixed(product, targetAddress, barcode, copies, validityDate, includeZona, destinoType) {
    console.log('🔧 Processando geração de etiqueta com correções...');
    
    try {
        // 1. Gerar etiqueta (esta parte funciona)
        const selectedDeposito = ui.depositoSelect.value;
        const labelEl = generateLabel(product, targetAddress, barcode, copies, validityDate, includeZona, selectedDeposito);

        // 2. Aplicar dimensões
        const w = ui.widthInput.value || '90';
        const h = ui.heightInput.value || '42';
        document.documentElement.style.setProperty('--label-width', w + 'mm');
        document.documentElement.style.setProperty('--label-height', h + 'mm');

        // 3. Renderizar (esta parte funciona)
        ui.print.innerHTML = '';
        ui.print.appendChild(labelEl);
        ui.preview.innerHTML = '';
        ui.preview.appendChild(labelEl.cloneNode(true));

        // 4. Salvar histórico (sem dependência do Supabase)
        const matricula = ui.matriculaInput.value.trim() || '---';
        saveHistory({
            desc: product.DESC,
            coddv: product.CODDV,
            barcode: barcode,
            matricula: matricula,
            userName: currentUser ? currentUser.Nome : null,
            address: targetAddress.ENDERECO,
            type: destinoType,
            deposito: ui.depositoSelect.value,
            copies: copies,
            validity: validityDate,
            zona: includeZona,
            machine: getMachineName(),
            timestamp: new Date().toISOString()
        });

        // 5. Atualizar contador local IMEDIATAMENTE (sem esperar Supabase)
        if (window.contadorGlobal) {
            try {
                if (typeof window.contadorGlobal.incrementarLocalmente === 'function') {
                    window.contadorGlobal.incrementarLocalmente(copies);
                } else {
                    window.contadorGlobal.valorAtual += copies;
                    window.contadorGlobal.salvarEstadoLocal();
                    window.dispatchEvent(new CustomEvent('contador-atualizado', {
                        detail: { valor: window.contadorGlobal.valorAtual, incremento: copies, tipo: 'mercadoria' }
                    }));
                }
                console.log(`⚡ Contador local atualizado: +${copies}`);
            } catch (counterError) {
                console.warn('⚠️ Erro ao atualizar contador local:', counterError);
            }
        }

        // 6. ABRIR IMPRESSÃO IMEDIATAMENTE (não esperar Supabase)
        console.log('🖨️ Abrindo impressão...');
        setTimeout(() => {
            try {
                window.print();
                console.log('✅ Impressão aberta com sucesso');
                
                // Mostrar feedback após impressão
                if (window.contadorGlobal) {
                    const totais = window.contadorGlobal.valorAtual;
                    mostrarPopupSucesso('Etiquetas geradas!', `+${copies} etiquetas | Total: ${totais.toLocaleString('pt-BR')}`);
                }
                
                handlePostPrintCleanup();
            } catch (printError) {
                console.error('❌ Erro ao abrir impressão:', printError);
                showStatus('Erro ao abrir impressão. Tente novamente.', 'error');
            }
        }, 100);

        // 7. Tentar salvar no Supabase EM BACKGROUND (não bloquear impressão)
        setTimeout(async () => {
            try {
                console.log('📡 Tentando salvar no Supabase em background...');
                const manager = await waitForSupabaseManager(2000); // Timeout menor
                
                if (manager) {
                    const entryData = window.clientFixes.validateSupabaseData({
                        cd: ui.depositoSelect.value,
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
                    });

                    await manager.saveEtiquetaEntrada(entryData);
                    console.log('✅ Dados salvos no Supabase em background');
                } else {
                    console.warn('⚠️ Supabase não disponível - dados salvos apenas localmente');
                }
            } catch (supabaseError) {
                console.warn('⚠️ Erro ao salvar no Supabase (não afeta impressão):', supabaseError);
            }
        }, 500); // Executar após a impressão

        return true;
    } catch (error) {
        console.error('❌ Erro no processamento da etiqueta:', error);
        showStatus('Erro ao processar etiqueta: ' + error.message, 'error');
        return false;
    }
}

// Função para interceptar e corrigir o fluxo original
function fixEtiquetaMercadoriaFlow() {
    // Aguardar o app.js carregar
    if (typeof processLabelGeneration === 'undefined') {
        setTimeout(fixEtiquetaMercadoriaFlow, 100);
        return;
    }

    // Substituir a função original por uma versão corrigida
    const originalProcessLabelGeneration = window.processLabelGeneration;
    
    window.processLabelGeneration = async function(product, targetAddress, barcode, copies, validityDate, includeZona, destinoType) {
        console.log('🔧 Usando fluxo corrigido de geração de etiquetas');
        return await processLabelGenerationFixed(product, targetAddress, barcode, copies, validityDate, includeZona, destinoType);
    };
    
    console.log('✅ Fluxo de etiqueta-mercadoria corrigido');
}

// Executar correção quando o DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fixEtiquetaMercadoriaFlow);
} else {
    fixEtiquetaMercadoriaFlow();
}

console.log('🛠️ Correções do fluxo de impressão carregadas');