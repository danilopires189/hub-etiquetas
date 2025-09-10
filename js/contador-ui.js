// Interface visual para o Contador GitHub Nativo
class ContadorUI {
  constructor(contador) {
    this.contador = contador;
    this.statusElement = null;
    this.loadingElement = null;
    this.notificationContainer = null;
    
    this.init();
  }
  
  // Inicializar interface
  init() {
    this.criarElementosUI();
    this.configurarEventListeners();
    this.atualizarStatus();
  }
  
  // Criar elementos da interface
  criarElementosUI() {
    // Container de notificações - OCULTO
    this.notificationContainer = document.createElement('div');
    this.notificationContainer.id = 'contador-notifications';
    this.notificationContainer.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      max-width: 300px;
      display: none !important;
      visibility: hidden !important;
    `;
    document.body.appendChild(this.notificationContainer);
    
    // Indicador de status - OCULTO
    this.statusElement = document.createElement('div');
    this.statusElement.id = 'contador-status';
    this.statusElement.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #fff;
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 10px 15px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      font-family: Arial, sans-serif;
      font-size: 12px;
      z-index: 9999;
      min-width: 200px;
      display: none !important;
      visibility: hidden !important;
    `;
    document.body.appendChild(this.statusElement);
    
    // Loading overlay - OCULTO
    this.loadingElement = document.createElement('div');
    this.loadingElement.id = 'contador-loading';
    this.loadingElement.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.5);
      display: none !important;
      justify-content: center;
      align-items: center;
      z-index: 10001;
      visibility: hidden !important;
    `;
    
    this.loadingElement.innerHTML = `
      <div style="
        background: white;
        padding: 30px;
        border-radius: 10px;
        text-align: center;
        font-family: Arial, sans-serif;
      ">
        <div style="
          width: 40px;
          height: 40px;
          border: 4px solid #f3f3f3;
          border-top: 4px solid #3498db;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 15px;
        "></div>
        <div id="loading-message">Processando...</div>
      </div>
      <style>
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
    `;
    
    document.body.appendChild(this.loadingElement);
  }
  
  // Configurar event listeners
  configurarEventListeners() {
    // Atualizar status periodicamente
    setInterval(() => {
      this.atualizarStatus();
    }, 5000);
    
    // Listener para mudanças de conexão - SEM NOTIFICAÇÕES VISUAIS
    window.addEventListener('online', () => {
      console.log('[Contador] Conexão restaurada');
      this.atualizarStatus();
    });
    
    window.addEventListener('offline', () => {
      console.log('[Contador] Modo offline ativado');
      this.atualizarStatus();
    });
  }
  
  // Atualizar indicador de status - DESABILITADO (oculto ao usuário)
  atualizarStatus() {
    // Função desabilitada - status oculto ao usuário
    // Apenas log no console para debug (invisível ao usuário)
    const isOnline = this.contador.isOnline();
    const rateLimitInfo = this.contador.rateLimitInfo;
    const operacoesPendentes = this.contador.operationQueue.length;
    
    console.log(`[Contador Status] Online: ${isOnline}, Rate Limit: ${rateLimitInfo.remaining}/${rateLimitInfo.limit}, Pendentes: ${operacoesPendentes}`);
    return;
  }
  
  // Mostrar loading - DESABILITADO (oculto ao usuário)
  mostrarLoading(mensagem = 'Processando...') {
    // Função desabilitada - loading oculto ao usuário
    return;
  }
  
  // Esconder loading - DESABILITADO (oculto ao usuário)
  esconderLoading() {
    // Função desabilitada - loading oculto ao usuário
    return;
  }
  
  // Mostrar notificação - DESABILITADO (oculto ao usuário)
  mostrarNotificacao(mensagem, tipo = 'info', duracao = 5000) {
    // Função desabilitada - notificações ocultas ao usuário
    // Apenas log no console para debug (invisível ao usuário)
    console.log(`[Contador] ${tipo.toUpperCase()}: ${mensagem}`);
    return;
  }
  
  // Mostrar progresso de operação - SEM INTERFACE VISUAL (oculto ao usuário)
  async executarComProgresso(operacao, mensagemLoading = 'Processando...') {
    try {
      // Executa operação sem mostrar loading visual
      console.log(`[Contador] ${mensagemLoading}`);
      const resultado = await operacao();
      console.log(`[Contador] Operação concluída com sucesso`);
      return resultado;
    } catch (error) {
      // Log do erro sem mostrar notificação visual
      console.error(`[Contador] Erro: ${error.message}`);
      throw error;
    }
  }
  
  // Confirmar operação crítica - SEM CONFIRMAÇÃO VISUAL (executa automaticamente)
  async confirmarOperacao(mensagem, callback) {
    // Executa automaticamente sem confirmação visual do usuário
    console.log(`[Contador] Executando operação: ${mensagem}`);
    return await this.executarComProgresso(callback);
  }
  
  // Mostrar estatísticas em modal - DESABILITADO (oculto ao usuário)
  mostrarEstatisticas(stats) {
    // Função desabilitada - estatísticas ocultas ao usuário
    // Apenas log no console para debug (invisível ao usuário)
    console.log('[Contador Estatísticas]', stats);
    return;
  }
}

// Exportar para uso global
window.ContadorUI = ContadorUI;