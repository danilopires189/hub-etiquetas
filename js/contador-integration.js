// Integração do Contador GitHub Nativo com aplicações existentes
class ContadorIntegration {
  constructor() {
    this.contador = null;
    this.ui = null;
    this.config = null;
    this.isInitialized = false;
  }
  
  // Inicializar sistema
  async init(config = {}) {
    try {
      console.log('🚀 Inicializando Contador GitHub Nativo...');
      
      // Configuração padrão
      this.config = {
        owner: config.owner || this.detectOwnerFromURL(),
        repo: config.repo || this.detectRepoFromURL(),
        token: config.token || null,
        autoSync: config.autoSync !== false,
        showUI: config.showUI !== false,
        ...config
      };
      
      // Criar instância do contador
      this.contador = new ContadorGitHubNativo(this.config);
      
      // Criar interface se habilitada
      if (this.config.showUI) {
        this.ui = new ContadorUI(this.contador);
      }
      
      // Carregar estado offline se existir
      this.contador.carregarEstadoOffline();
      
      // Iniciar monitoramento de conexão
      if (this.config.autoSync) {
        this.contador.iniciarMonitoramentoConexao();
      }
      
      // Tentar sincronizar operações pendentes
      if (this.contador.isOnline() && this.contador.operationQueue.length > 0) {
        await this.contador.sincronizarOffline();
      }
      
      this.isInitialized = true;
      console.log('✅ Contador GitHub Nativo inicializado com sucesso');
      
      return true;
    } catch (error) {
      console.error('❌ Erro ao inicializar contador:', error);
      return false;
    }
  }
  
  // Detectar owner da URL atual
  detectOwnerFromURL() {
    // Se estiver no GitHub Pages, extrair do hostname
    const hostname = window.location.hostname;
    if (hostname.endsWith('.github.io')) {
      return hostname.split('.')[0];
    }
    
    // Fallback para configuração manual
    return 'SEU_USUARIO_GITHUB';
  }
  
  // Detectar repo da URL atual
  detectRepoFromURL() {
    const hostname = window.location.hostname;
    const pathname = window.location.pathname;
    
    if (hostname.endsWith('.github.io')) {
      // GitHub Pages: usuario.github.io/repo-name
      const pathParts = pathname.split('/').filter(p => p);
      return pathParts[0] || hostname.split('.')[0];
    }
    
    return 'SEU_REPOSITORIO';
  }
  
  // Obter contador atual
  async obterContador() {
    if (!this.isInitialized) {
      await this.init();
    }
    
    try {
      return await this.contador.obterContador();
    } catch (error) {
      console.error('Erro ao obter contador:', error);
      return { totalEtiquetas: 19452 }; // Fallback
    }
  }
  
  // Incrementar contador
  async incrementarContador(quantidade = 1, tipo = 'geral') {
    if (!this.isInitialized) {
      await this.init();
    }
    
    try {
      if (this.ui) {
        return await this.ui.executarComProgresso(
          () => this.contador.incrementarContadorOffline(quantidade, tipo),
          `Incrementando contador (+${quantidade})...`
        );
      } else {
        return await this.contador.incrementarContadorOffline(quantidade, tipo);
      }
    } catch (error) {
      console.error('Erro ao incrementar contador:', error);
      if (this.ui) {
        this.ui.mostrarNotificacao(`Erro ao incrementar: ${error.message}`, 'error');
      }
      throw error;
    }
  }
  
  // Obter próximo número de etiqueta
  async obterProximoNumero(quantidade = 1, tipo = 'geral') {
    const contadorAtual = await this.obterContador();
    const proximoNumero = contadorAtual.totalEtiquetas + 1;
    
    // Incrementar contador
    await this.incrementarContador(quantidade, tipo);
    
    return proximoNumero;
  }
  
  // Gerar sequência de números
  async gerarSequencia(quantidade, tipo = 'geral') {
    const contadorAtual = await this.obterContador();
    const inicio = contadorAtual.totalEtiquetas + 1;
    
    // Incrementar contador
    await this.incrementarContador(quantidade, tipo);
    
    // Gerar array de números
    const sequencia = [];
    for (let i = 0; i < quantidade; i++) {
      sequencia.push(inicio + i);
    }
    
    return sequencia;
  }
  
  // Obter estatísticas
  async obterEstatisticas(dias = 30) {
    if (!this.isInitialized) {
      await this.init();
    }
    
    try {
      return await this.contador.obterEstatisticas(dias);
    } catch (error) {
      console.error('Erro ao obter estatísticas:', error);
      return null;
    }
  }
  
  // Mostrar estatísticas (se UI habilitada)
  async mostrarEstatisticas(dias = 30) {
    if (!this.ui) {
      console.warn('UI não habilitada');
      return;
    }
    
    try {
      const stats = await this.ui.executarComProgresso(
        () => this.obterEstatisticas(dias),
        'Carregando estatísticas...'
      );
      
      if (stats) {
        this.ui.mostrarEstatisticas(stats);
      }
    } catch (error) {
      this.ui.mostrarNotificacao(`Erro ao carregar estatísticas: ${error.message}`, 'error');
    }
  }
  
  // Configurar token (com prompt se necessário)
  async configurarToken(token = null) {
    if (!token) {
      token = prompt(`
Para usar o contador centralizado, você precisa configurar um GitHub Personal Access Token.

Como obter:
1. Vá em GitHub.com → Settings → Developer settings → Personal access tokens
2. Generate new token (classic)
3. Selecione permissão "repo"
4. Copie o token

Cole seu token aqui:`);
    }
    
    if (token) {
      localStorage.setItem('github_token', token);
      
      if (this.contador) {
        this.contador.token = token;
      }
      
      if (this.ui) {
        this.ui.mostrarNotificacao('Token configurado com sucesso!', 'success');
      }
      
      return true;
    }
    
    return false;
  }
  
  // Verificar configuração
  verificarConfiguracao() {
    const problemas = [];
    
    if (!this.config.owner || this.config.owner === 'SEU_USUARIO_GITHUB') {
      problemas.push('Owner do repositório não configurado');
    }
    
    if (!this.config.repo || this.config.repo === 'SEU_REPOSITORIO') {
      problemas.push('Nome do repositório não configurado');
    }
    
    if (!this.contador?.token) {
      problemas.push('Token do GitHub não configurado');
    }
    
    if (problemas.length > 0) {
      console.warn('⚠️ Problemas de configuração:', problemas);
      if (this.ui) {
        this.ui.mostrarNotificacao(
          `Configuração incompleta: ${problemas.join(', ')}`, 
          'warning'
        );
      }
      return false;
    }
    
    return true;
  }
  
  // Método de compatibilidade com sistema antigo
  async incrementar(quantidade = 1) {
    return await this.incrementarContador(quantidade, 'geral');
  }
  
  // Método de compatibilidade para obter total
  async obterTotal() {
    const contador = await this.obterContador();
    return contador.totalEtiquetas;
  }
}

// Instância global para compatibilidade
window.contadorGlobal = new ContadorIntegration();

// Auto-inicializar quando DOM estiver pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.contadorGlobal.init();
  });
} else {
  // DOM já carregado
  setTimeout(() => {
    window.contadorGlobal.init();
  }, 100);
}

// Exportar para uso
window.ContadorIntegration = ContadorIntegration;