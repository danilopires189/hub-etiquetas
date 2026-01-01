/**
 * Loading Manager - Sistema de controle de estados de carregamento
 * Adaptado do módulo etiqueta-mercadoria para o módulo inventário
 * 
 * Requirements: 3.1, 3.4
 */

class LoadingManager {
  constructor() {
    this.activeLoadings = new Set();
    this.loadingOverlay = null;
  }

  /**
   * Mostrar spinner em um elemento específico
   * @param {HTMLElement|string} element - Elemento ou seletor
   * @param {string} size - Tamanho do spinner: 'small', 'normal', 'large'
   * @param {string} loadingText - Texto a ser exibido durante loading (para botões)
   */
  showSpinner(element, size = 'normal', loadingText = null) {
    const el = typeof element === 'string' ? document.querySelector(element) : element;
    if (!el) return;

    // Remover spinner existente se houver
    this.hideSpinner(el);

    // Adicionar classe de loading
    el.classList.add('loading-spinner');

    // Para botões, adicionar classe específica e configurar estado
    if (el.tagName === 'BUTTON' || el.classList.contains('btn')) {
      el.classList.add('btn-loading');

      // Adicionar classe de tamanho se especificado
      if (size !== 'normal') {
        el.classList.add(`btn-${size}`);
      }

      // Armazenar estado original do botão ANTES de desabilitar
      el.setAttribute('data-original-disabled', el.disabled);

      // Desabilitar botão
      el.disabled = true;

      // Adicionar texto de loading se especificado
      if (loadingText) {
        const loadingTextEl = document.createElement('span');
        loadingTextEl.className = 'loading-text';
        loadingTextEl.textContent = loadingText;
        loadingTextEl.setAttribute('data-loading-text', 'true');
        el.appendChild(loadingTextEl);
      }
    }

    // Criar spinner inline se necessário
    if (el.classList.contains('loading-inline')) {
      const spinner = document.createElement('div');
      spinner.className = `spinner spinner-${size}`;
      spinner.setAttribute('data-loading-spinner', 'true');
      el.insertBefore(spinner, el.firstChild);
    }

    this.activeLoadings.add(el);
    console.log('🔄 Spinner ativado:', el, { size, loadingText });
  }

  /**
   * Ocultar spinner de um elemento específico
   * @param {HTMLElement|string} element - Elemento ou seletor
   */
  hideSpinner(element) {
    const el = typeof element === 'string' ? document.querySelector(element) : element;
    if (!el) return;

    // Remover classes de loading
    el.classList.remove('loading-spinner', 'btn-loading', 'btn-small', 'btn-large');

    // Reabilitar botão se necessário
    if (el.tagName === 'BUTTON' || el.classList.contains('btn')) {
      // Restaurar estado original ou habilitar se não estava desabilitado
      const originalDisabled = el.getAttribute('data-original-disabled');
      if (originalDisabled !== null) {
        el.disabled = originalDisabled === 'true';
        el.removeAttribute('data-original-disabled');
      } else {
        el.disabled = false;
      }
    }

    // Remover spinner inline se existir
    const inlineSpinner = el.querySelector('[data-loading-spinner="true"]');
    if (inlineSpinner) {
      inlineSpinner.remove();
    }

    // Remover texto de loading se existir
    const loadingText = el.querySelector('[data-loading-text="true"]');
    if (loadingText) {
      loadingText.remove();
    }

    this.activeLoadings.delete(el);
    console.log('✅ Spinner removido:', el);
  }

  /**
   * Mostrar overlay de loading global
   * @param {string} message - Mensagem de loading
   */
  showLoadingOverlay(message = 'Carregando...') {
    // Remover overlay existente se houver
    this.hideLoadingOverlay();

    // Criar overlay
    this.loadingOverlay = document.createElement('div');
    this.loadingOverlay.className = 'loading-overlay';
    this.loadingOverlay.innerHTML = `
      <div class="spinner"></div>
      <div class="loading-text">${message}</div>
    `;

    // Adicionar ao body
    document.body.appendChild(this.loadingOverlay);

    // Animar entrada
    requestAnimationFrame(() => {
      this.loadingOverlay.style.opacity = '0';
      this.loadingOverlay.style.transform = 'scale(0.9)';
      this.loadingOverlay.style.transition = 'all 0.3s ease';

      requestAnimationFrame(() => {
        this.loadingOverlay.style.opacity = '1';
        this.loadingOverlay.style.transform = 'scale(1)';
      });
    });

    console.log('🔄 Loading overlay ativado:', message);
  }

  /**
   * Ocultar overlay de loading global
   */
  hideLoadingOverlay() {
    if (this.loadingOverlay && this.loadingOverlay.parentNode) {
      // Animar saída
      this.loadingOverlay.style.opacity = '0';
      this.loadingOverlay.style.transform = 'scale(0.9)';

      setTimeout(() => {
        if (this.loadingOverlay && this.loadingOverlay.parentNode) {
          this.loadingOverlay.parentNode.removeChild(this.loadingOverlay);
        }
        this.loadingOverlay = null;
      }, 300);

      console.log('✅ Loading overlay removido');
    }
  }

  /**
   * Atualizar mensagem do loading overlay
   * @param {string} message - Nova mensagem
   */
  updateLoadingMessage(message) {
    if (this.loadingOverlay) {
      const textElement = this.loadingOverlay.querySelector('.loading-text');
      if (textElement) {
        textElement.textContent = message;
      }
    }
  }

  /**
   * Verificar se há loadings ativos
   * @returns {boolean}
   */
  hasActiveLoadings() {
    return this.activeLoadings.size > 0 || this.loadingOverlay !== null;
  }

  /**
   * Limpar todos os loadings ativos
   */
  clearAllLoadings() {
    // Limpar spinners individuais
    this.activeLoadings.forEach(element => {
      this.hideSpinner(element);
    });

    // Limpar overlay
    this.hideLoadingOverlay();

    console.log('🧹 Todos os loadings limpos');
  }

  /**
   * Criar spinner standalone
   * @param {string} size - Tamanho: 'small', 'normal', 'large'
   * @returns {HTMLElement}
   */
  createSpinner(size = 'normal') {
    const spinner = document.createElement('div');
    spinner.className = `spinner spinner-${size}`;
    return spinner;
  }

  /**
   * Mostrar loading em lista de produtos durante renderização
   * @param {HTMLElement} listElement - Elemento da lista
   */
  showListLoading(listElement) {
    if (!listElement) return;

    listElement.innerHTML = `
      <div class="loading-inline" style="justify-content: center; padding: 2rem;">
        <div class="spinner"></div>
        <span>Carregando produtos...</span>
      </div>
    `;
  }

  /**
   * Mostrar loading em campo de busca
   * @param {HTMLElement} searchElement - Elemento de busca
   */
  showSearchLoading(searchElement) {
    if (!searchElement) return;

    searchElement.classList.add('loading-spinner');
    searchElement.disabled = true;
    searchElement.placeholder = 'Buscando...';
  }

  /**
   * Ocultar loading em campo de busca
   * @param {HTMLElement} searchElement - Elemento de busca
   * @param {string} originalPlaceholder - Placeholder original
   */
  hideSearchLoading(searchElement, originalPlaceholder = 'Digite o CODDV...') {
    if (!searchElement) return;

    searchElement.classList.remove('loading-spinner');
    searchElement.disabled = false;
    searchElement.placeholder = originalPlaceholder;
  }

  /**
   * Mostrar loading específico para botões com texto personalizado
   * @param {HTMLElement|string} button - Botão ou seletor
   * @param {string} loadingText - Texto durante loading
   * @param {string} size - Tamanho do spinner
   */
  showButtonLoading(button, loadingText = 'Carregando...', size = 'normal') {
    const btn = typeof button === 'string' ? document.querySelector(button) : button;
    if (!btn) return;

    // Armazenar conteúdo original
    if (!btn.hasAttribute('data-original-content')) {
      btn.setAttribute('data-original-content', btn.innerHTML);
    }

    // Aplicar estado de loading
    this.showSpinner(btn, size, loadingText);

    console.log('🔄 Button loading ativado:', btn, { loadingText, size });
  }

  /**
   * Ocultar loading específico para botões
   * @param {HTMLElement|string} button - Botão ou seletor
   */
  hideButtonLoading(button) {
    const btn = typeof button === 'string' ? document.querySelector(button) : button;
    if (!btn) return;

    // Restaurar conteúdo original se existir
    const originalContent = btn.getAttribute('data-original-content');
    if (originalContent) {
      btn.innerHTML = originalContent;
      btn.removeAttribute('data-original-content');
    }

    // Remover estado de loading
    this.hideSpinner(btn);

    console.log('✅ Button loading removido:', btn);
  }

  /**
   * Atualizar texto de loading em botão
   * @param {HTMLElement|string} button - Botão ou seletor
   * @param {string} newText - Novo texto de loading
   */
  updateButtonLoading(button, newText) {
    const btn = typeof button === 'string' ? document.querySelector(button) : button;
    if (!btn) return;

    // Atualizar texto de loading se existir
    const loadingTextEl = btn.querySelector('[data-loading-text="true"]');
    if (loadingTextEl) {
      loadingTextEl.textContent = newText;
    } else {
      // Se não existir elemento de texto, criar um
      const newLoadingText = document.createElement('span');
      newLoadingText.className = 'loading-text';
      newLoadingText.textContent = newText;
      newLoadingText.setAttribute('data-loading-text', 'true');
      btn.appendChild(newLoadingText);
    }

    console.log('🔄 Button loading atualizado:', newText);
  }
}

// Criar instância global
window.LoadingManager = LoadingManager;

// Exportar para uso em módulos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = LoadingManager;
}