/**
 * System Startup Animation - Animação inicial do sistema (Versão Minimalista)
 * Animação "Iniciando sistema..." simples e clean como no módulo etiqueta-mercadoria
 */

class SystemStartupAnimation {
  constructor() {
    this.isActive = false;
    this.startupOverlay = null;
    this.animationSteps = [
      { message: 'Iniciando sistema...', duration: 1000 },
      { message: 'Carregando componentes...', duration: 800 },
      { message: 'Preparando interface...', duration: 600 },
      { message: 'Finalizando...', duration: 400 }
    ];
    this.currentStep = 0;

    console.log('🚀 SystemStartupAnimation inicializado (minimalista)');
  }

  /**
   * Mostrar animação de startup
   */
  show() {
    if (this.isActive) return;

    console.log('🎬 Iniciando animação de startup do sistema');
    this.isActive = true;
    this.currentStep = 0;

    // 🆕 VERIFICAR se overlay inline já existe (do HTML)
    const inlineOverlay = document.getElementById('instant-loading-overlay');
    if (inlineOverlay) {
      console.log('✅ Overlay inline HTML detectado, assumindo controle');
      // Manter overlay inline visível, mas marcar para remoção posterior
      this.inlineOverlayDetected = true;
    }

    this.createStartupOverlay();
    this.startAnimationSequence();
  }

  /**
   * Criar overlay de startup minimalista
   */
  createStartupOverlay() {
    // 🆕 VERIFICAR se overlay inline HTML existe e reutilizar
    const inlineOverlay = document.getElementById('instant-loading-overlay');

    if (inlineOverlay) {
      console.log('♻️ Reutilizando overlay inline HTML existente');
      // Usar o overlay inline como nosso overlay de controle
      this.startupOverlay = inlineOverlay;
      // Mudar ID para nosso controle
      this.startupOverlay.id = 'system-startup-overlay';

      // Atualizar mensagem se necessário
      const messageElement = this.startupOverlay.querySelector('p');
      if (messageElement) {
        messageElement.id = 'startup-loading-text';
      }

      // Aplicar estilos adicionais se necessário
      this.applyMinimalStyles();
      return;
    }

    // Se não existir overlay inline, criar normalmente
    this.hide();

    // Criar overlay principal (igual ao etiqueta-mercadoria)
    this.startupOverlay = document.createElement('div');
    this.startupOverlay.id = 'system-startup-overlay';
    this.startupOverlay.className = 'loading-overlay';
    this.startupOverlay.innerHTML = `
      <div class="spinner"></div>
      <p id="startup-loading-text">Iniciando sistema...</p>
    `;

    // Aplicar estilos minimalistas
    this.applyMinimalStyles();

    // Adicionar ao body
    document.body.appendChild(this.startupOverlay);

    // Animar entrada suave
    requestAnimationFrame(() => {
      this.startupOverlay.style.opacity = '1';
    });
  }

  /**
   * Aplicar estilos minimalistas (baseado no etiqueta-mercadoria)
   */
  applyMinimalStyles() {
    const styles = document.createElement('style');
    styles.id = 'system-startup-minimal-styles';
    styles.textContent = `
      #system-startup-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(255, 255, 255, 0.95);
        z-index: 99999;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: opacity 0.3s ease;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }

      #system-startup-overlay .spinner {
        width: 40px;
        height: 40px;
        border: 4px solid #e5e7eb;
        border-top-color: #2563eb;
        border-radius: 50%;
        animation: startupSpin 1s linear infinite;
        margin-bottom: 1rem;
      }

      #startup-loading-text {
        color: #6b7280;
        font-size: 0.95rem;
        font-weight: 500;
        margin: 0;
        text-align: center;
        opacity: 0.8;
      }

      @keyframes startupSpin {
        to {
          transform: rotate(360deg);
        }
      }

      /* Fade out animation */
      #system-startup-overlay.hiding {
        opacity: 0;
        transition: opacity 0.5s ease;
      }

      /* Modo de movimento reduzido */
      @media (prefers-reduced-motion: reduce) {
        #system-startup-overlay .spinner {
          animation: none;
          border-top-color: #2563eb;
          border-right-color: rgba(37, 99, 235, 0.6);
        }
        
        #system-startup-overlay {
          transition: none;
        }
      }

      /* Responsivo */
      @media (max-width: 480px) {
        #system-startup-overlay .spinner {
          width: 32px;
          height: 32px;
          border-width: 3px;
        }
        
        #startup-loading-text {
          font-size: 0.9rem;
        }
      }
    `;

    document.head.appendChild(styles);
  }

  /**
   * Iniciar sequência de animação simples (sem auto-hide)
   */
  async startAnimationSequence() {
    const messageElement = this.startupOverlay.querySelector('#startup-loading-text');

    // Não executar sequência automática - será controlada externamente
    // Apenas manter a primeira mensagem
    if (messageElement) {
      messageElement.textContent = this.animationSteps[0].message;
      messageElement.style.opacity = '0.8';
    }

    this.currentStep = 0;

    // Não ocultar automaticamente - será controlado pelo sistema principal
    console.log('🎬 Animação de startup iniciada - aguardando controle externo');
  }

  /**
   * Ocultar animação de startup
   */
  hide() {
    if (!this.startupOverlay) return;

    console.log('✅ Finalizando animação de startup do sistema');

    // Animar saída
    this.startupOverlay.classList.add('hiding');

    // Remover após animação
    setTimeout(() => {
      if (this.startupOverlay && this.startupOverlay.parentNode) {
        this.startupOverlay.parentNode.removeChild(this.startupOverlay);
      }

      // Remover estilos
      const styles = document.getElementById('system-startup-minimal-styles');
      if (styles) {
        styles.remove();
      }

      this.startupOverlay = null;
      this.isActive = false;

      // Disparar evento de conclusão
      document.dispatchEvent(new CustomEvent('systemStartupComplete'));

    }, 500);
  }

  /**
   * Atualizar mensagem (versão simplificada)
   */
  updateMessage(message) {
    if (!this.startupOverlay) return;

    const messageElement = this.startupOverlay.querySelector('#startup-loading-text');
    if (messageElement) {
      messageElement.style.opacity = '0.4';

      setTimeout(() => {
        messageElement.textContent = message;
        messageElement.style.opacity = '0.8';
      }, 150);
    }

    console.log(`📝 Mensagem de startup atualizada: ${message}`);
  }

  /**
   * Finalizar animação quando bases estiverem carregadas
   */
  finishWhenReady() {
    if (!this.isActive) return;

    console.log('✅ Finalizando animação de startup - bases carregadas');

    // Mostrar mensagem final
    this.updateMessage('Sistema pronto!');

    // Aguardar um pouco e ocultar
    setTimeout(() => {
      this.hide();
    }, 800);
  }

  /**
   * Verificar se está ativo
   */
  isRunning() {
    return this.isActive;
  }

  /**
   * Método de compatibilidade (não usado na versão minimalista)
   */
  updateProgress(progress, message = null) {
    if (message) {
      this.updateMessage(message);
    }
  }
}

// Criar instância global
window.SystemStartupAnimation = SystemStartupAnimation;

// Exportar para uso em módulos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SystemStartupAnimation;
}