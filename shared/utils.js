/**
 * Shared Utilities for Hub de Etiquetas
 */

/**
 * Exibe um popup de sucesso no canto superior direito
 * @param {string} titulo - Título da mensagem
 * @param {string} subtitulo - Subtítulo ou detalhes
 */
function mostrarPopupSucesso(titulo, subtitulo) {
    console.log('🎯 mostrarPopupSucesso chamada com:', titulo, subtitulo);

    // Remover popup existente se houver
    const existingPopup = document.getElementById('popup-sucesso');
    if (existingPopup) {
        existingPopup.remove();
    }

    // Criar popup
    const popup = document.createElement('div');
    popup.id = 'popup-sucesso';
    popup.innerHTML = `
    <div class="popup-content">
      <div class="popup-icon">✅</div>
      <div class="popup-text">
        <div class="popup-titulo">${titulo}</div>
        <div class="popup-subtitulo">${subtitulo}</div>
      </div>
    </div>
  `;

    // Adicionar ao body
    document.body.appendChild(popup);

    // Mostrar com animação
    setTimeout(() => {
        popup.classList.add('show');
    }, 100);

    // Remover após 2 segundos
    setTimeout(() => {
        popup.classList.remove('show');
        setTimeout(() => {
            if (popup.parentNode) {
                popup.parentNode.removeChild(popup);
            }
        }, 300);
    }, 2000);
}

/**
 * Helper para incrementar o contador global
 * @param {string} tipo - Tipo de etiqueta (ex: 'placas', 'caixa')
 * @param {number} quantidade - Quantidade a incrementar (default: 1)
 * @returns {Promise<number>} - Novo valor do contador
 */
async function incrementarContadorGlobal(tipo, quantidade = 1) {
    if (window.contadorGlobal) {
        try {
            const novoValor = await window.contadorGlobal.incrementarContador(quantidade, tipo);
            return novoValor;
        } catch (error) {
            console.error('Erro ao incrementar contador:', error);
            throw error;
        }
    } else {
        console.warn('Contador Global não disponível');
        return 0;
    }
}
