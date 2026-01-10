// Configurar contador para tipo 'placas'
window.addEventListener('DOMContentLoaded', async () => {
    console.log('🏷️ Aplicação de Etiquetas de Produto carregada');

    // Aguardar contador estar pronto
    setTimeout(async () => {
        if (window.contadorGlobal) {
            console.log('✅ Contador Global disponível');

            // Interceptar impressões para contar etiquetas
            const btnPrint = document.getElementById('btnPrint');
            if (btnPrint) {
                console.log('🔗 Botão imprimir encontrado, configurando interceptação...');

                const originalClick = btnPrint.onclick;
                btnPrint.onclick = async function (e) {
                    try {
                        console.log('🖱️ Botão imprimir clicado');

                        // Coletar dados da geração de etiquetas
                        const labelData = {
                            applicationType: 'placas',
                            quantity: 1, // Placas geralmente gera 1 etiqueta por vez
                            copies: 1,
                            metadata: {
                                source: 'placas_module',
                                timestamp: new Date().toISOString(),
                                userAgent: navigator.userAgent
                            }
                        };

                        // Registrar geração no Supabase se disponível
                        if (window.supabaseManager && window.contadorGlobal.isSupabaseIntegrated()) {
                            try {
                                await window.supabaseManager.saveLabelGeneration(labelData);
                                console.log('✅ Geração registrada no Supabase');
                            } catch (error) {
                                console.warn('⚠️ Falha ao registrar no Supabase:', error);
                            }
                        }

                        // Incrementar contador global (já integrado com Supabase)
                        let novoValor;
                        if (typeof incrementarContadorGlobal === 'function') {
                            novoValor = await incrementarContadorGlobal('placas', 1);
                        } else {
                            novoValor = await window.contadorGlobal.incrementarContador(1, 'placas');
                        }

                        console.log(`✅ Contador incrementado: +1 placas = ${novoValor}`);

                        // Mostrar popup de sucesso (usando função global do shared/utils.js)
                        if (typeof mostrarPopupSucesso === 'function') {
                            console.log('🎉 Chamando mostrarPopupSucesso...');
                            mostrarPopupSucesso('Etiqueta gerada com sucesso!', `Total: ${novoValor.toLocaleString('pt-BR')} etiquetas`);
                            console.log('✅ Popup chamado com sucesso');
                        } else {
                            console.warn('⚠️ Função mostrarPopupSucesso não encontrada');
                        }

                        // Feedback visual discreto
                        const valorFormatado = novoValor.toLocaleString('pt-BR');
                        console.log(`📊 Total atual: ${valorFormatado} etiquetas`);

                        // Executar função original de impressão
                        if (originalClick) {
                            originalClick.call(this, e);
                        } else {
                            window.print();
                        }
                    } catch (error) {
                        console.error('❌ Erro ao incrementar contador:', error);
                        // Continuar com impressão mesmo se contador falhar
                        if (originalClick) {
                            originalClick.call(this, e);
                        } else {
                            window.print();
                        }
                    }
                };
            } else {
                console.warn('⚠️ Botão imprimir não encontrado');
            }
        } else {
            console.warn('⚠️ Contador Global não disponível');
        }
    }, 2000);
});
