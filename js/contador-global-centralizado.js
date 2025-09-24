// Sistema de Contador Global Centralizado para GitHub Pages
// Este arquivo garante que TODAS as aplicações compartilhem o mesmo contador

class ContadorGlobalCentralizado {
  constructor() {
    this.config = this.detectarConfiguracao();
    this.valorInicial = 120430;
    this.chaveStorage = 'contador_global_centralizado_v1';
    this.intervaloSync = 30000; // 30 segundos
    this.isOnline = navigator.onLine;
    this.operacoesPendentes = [];
    
    console.log('🌐 Contador Global Centralizado inicializado');
    console.log(`📊 Configuração: ${this.config.owner}/${this.config.repo}`);
    
    this.inicializar();
  }
  
  // Detectar configuração automaticamente
  detectarConfiguracao() {
    const hostname = window.location.hostname;
    const pathname = window.location.pathname;
    
    if (hostname.endsWith('.github.io')) {
      // GitHub Pages - auto-detectar
      const owner = hostname.split('.')[0];
      const pathParts = pathname.split('/').filter(p => p);
      const repo = pathParts[0] || `${owner}.github.io`;
      
      console.log(`🔍 GitHub Pages detectado: ${owner}/${repo}`);
      
      return {
        owner,
        repo,
        branch: 'main',
        autoDetectado: true,
        isGitHubPages: true
      };
    }
    
    // Desenvolvimento local
    console.log('🏠 Modo desenvolvimento local detectado');
    return {
      owner: 'SEU_USUARIO_GITHUB',
      repo: 'SEU_REPOSITORIO',
      branch: 'main',
      autoDetectado: false,
      isGitHubPages: false
    };
  }
  
  async inicializar() {
    try {
      // Carregar estado local primeiro (sempre funciona)
      await this.carregarEstadoLocal();
      
      // Tentar sincronizar com GitHub se disponível (não crítico)
      if (this.config.isGitHubPages) {
        try {
          await this.sincronizarComGitHub();
        } catch (syncError) {
          console.warn('⚠️ Sincronização falhou, continuando com localStorage:', syncError.message);
        }
      } else {
        console.log('🏠 Modo local: usando apenas armazenamento local');
      }
      
      // Configurar monitoramento de conectividade
      this.configurarMonitoramentoConectividade();
      
      // Iniciar sincronização periódica
      this.iniciarSincronizacaoPeriodica();
      
      console.log('✅ Contador Global Centralizado pronto');
      console.log(`📊 Valor atual: ${this.valorAtual} etiquetas`);
      console.log(`🌐 Modo: ${this.config.isGitHubPages ? 'GitHub Pages' : 'Local'}`);
      
    } catch (error) {
      console.warn('⚠️ Erro na inicialização:', error.message);
      // Continuar com estado local como fallback
      this.valorAtual = this.valorInicial;
      this.ultimaAtualizacao = new Date().toISOString();
      console.log('🔄 Usando valores padrão como fallback');
    }
  }
  
  // Carregar estado local
  async carregarEstadoLocal() {
    try {
      const dados = localStorage.getItem(this.chaveStorage);
      if (dados) {
        const parsed = JSON.parse(dados);
        this.valorAtual = parsed.totalEtiquetas || this.valorInicial;
        this.ultimaAtualizacao = parsed.ultimaAtualizacao;
        this.operacoesPendentes = parsed.operacoesPendentes || [];
        
        console.log(`📱 Estado local carregado: ${this.valorAtual} etiquetas`);
      } else {
        // Se não há dados locais, usar valor inicial e salvar
        this.valorAtual = this.valorInicial;
        this.ultimaAtualizacao = new Date().toISOString();
        this.operacoesPendentes = [];
        
        // Salvar estado inicial no localStorage
        await this.salvarEstadoLocal();
        
        console.log(`🆕 Estado inicial criado e salvo: ${this.valorAtual} etiquetas`);
      }
    } catch (error) {
      console.warn('⚠️ Erro ao carregar estado local:', error);
      this.valorAtual = this.valorInicial;
      this.ultimaAtualizacao = new Date().toISOString();
      this.operacoesPendentes = [];
      
      // Tentar salvar mesmo com erro
      try {
        await this.salvarEstadoLocal();
      } catch (saveError) {
        console.warn('⚠️ Erro ao salvar estado inicial:', saveError);
      }
    }
  }
  
  // Salvar estado local
  async salvarEstadoLocal() {
    try {
      const dados = {
        totalEtiquetas: this.valorAtual,
        ultimaAtualizacao: this.ultimaAtualizacao,
        operacoesPendentes: this.operacoesPendentes,
        timestamp: Date.now()
      };
      
      localStorage.setItem(this.chaveStorage, JSON.stringify(dados));
      console.log(`💾 Estado local salvo: ${this.valorAtual} etiquetas`);
      
    } catch (error) {
      console.warn('⚠️ Erro ao salvar estado local:', error);
    }
  }
  
  // Sincronizar com GitHub (modo simplificado para GitHub Pages)
  async sincronizarComGitHub() {
    if (!this.config.isGitHubPages) {
      console.log('ℹ️ Não é GitHub Pages, usando apenas localStorage');
      return;
    }
    
    try {
      // Tentar obter dados do GitHub (apenas leitura)
      const url = `https://raw.githubusercontent.com/${this.config.owner}/${this.config.repo}/main/data/contador.json?t=${Date.now()}`;
      const response = await fetch(url);
      
      if (response.ok) {
        const dadosGitHub = await response.json();
        const valorGitHub = dadosGitHub.totalEtiquetas || this.valorInicial;
        
        // Usar o valor do GitHub apenas se for maior que o local
        if (valorGitHub > this.valorAtual) {
          console.log(`🔄 Sincronizando do GitHub: ${this.valorAtual} → ${valorGitHub}`);
          this.valorAtual = valorGitHub;
          this.ultimaAtualizacao = dadosGitHub.ultimaAtualizacao || new Date().toISOString();
          
          // Salvar estado atualizado
          await this.salvarEstadoLocal();
        } else if (this.valorAtual > valorGitHub) {
          console.log(`📊 Valor local (${this.valorAtual}) é maior que GitHub (${valorGitHub}), mantendo local`);
        }
        
        console.log(`✅ Sincronização concluída: ${this.valorAtual} etiquetas`);
        
      } else {
        console.log('ℹ️ Arquivo não encontrado no GitHub, usando estado local');
        // No GitHub Pages, não podemos criar arquivos, então apenas usar localStorage
        console.log('💾 GitHub Pages: usando apenas localStorage para persistência');
      }
      
    } catch (error) {
      console.warn('⚠️ Erro na sincronização com GitHub:', error.message);
      console.log('💾 Continuando com localStorage apenas');
    }
  }
  
  // No GitHub Pages, não podemos criar arquivos no repositório
  // Esta função foi removida pois não é necessária
  
  // Incrementar contador
  async incrementar(quantidade = 1, tipo = 'geral') {
    try {
      // Validar quantidade
      if (quantidade <= 0) {
        throw new Error('Quantidade deve ser positiva');
      }
      
      // Garantir que o valor atual está definido
      if (typeof this.valorAtual !== 'number') {
        this.valorAtual = this.valorInicial;
      }
      
      // Incrementar valor
      const valorAnterior = this.valorAtual;
      this.valorAtual += quantidade;
      this.ultimaAtualizacao = new Date().toISOString();
      
      // Adicionar à lista de operações pendentes
      this.operacoesPendentes.push({
        quantidade,
        tipo,
        valorAnterior,
        valorNovo: this.valorAtual,
        timestamp: this.ultimaAtualizacao
      });
      
      // Salvar estado local
      await this.salvarEstadoLocal();
      
      // Tentar sincronizar com GitHub (em background)
      if (this.config.isGitHubPages) {
        this.sincronizarComGitHub().catch(() => {
          // Falha silenciosa - será tentado novamente na próxima sincronização
        });
      }
      
      console.log(`📈 Contador incrementado: +${quantidade} ${tipo} = ${this.valorAtual}`);
      console.log(`💾 Estado salvo localmente`);
      
      // Disparar evento
      this.dispararEvento('incremento', {
        quantidade,
        tipo,
        valorAnterior,
        valorAtual: this.valorAtual
      });
      
      // Disparar evento customizado para o hub
      window.dispatchEvent(new CustomEvent('contador-atualizado', {
        detail: {
          valor: this.valorAtual,
          incremento: quantidade,
          tipo: tipo
        }
      }));
      
      // Disparar evento para todas as janelas (cross-window communication)
      if (window.localStorage) {
        localStorage.setItem('contador_ultimo_incremento', JSON.stringify({
          valor: this.valorAtual,
          incremento: quantidade,
          tipo: tipo,
          timestamp: Date.now()
        }));
      }
      
      return this.valorAtual;
      
    } catch (error) {
      console.error('❌ Erro ao incrementar contador:', error);
      throw error;
    }
  }
  
  // Obter valor atual
  obterValor() {
    return this.valorAtual;
  }
  
  // Obter estatísticas
  obterEstatisticas() {
    return {
      valorAtual: this.valorAtual,
      ultimaAtualizacao: this.ultimaAtualizacao,
      operacoesPendentes: this.operacoesPendentes.length,
      isOnline: this.isOnline,
      configuracao: this.config
    };
  }
  
  // Configurar monitoramento de conectividade
  configurarMonitoramentoConectividade() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      console.log('🌐 Conectividade restaurada');
      this.sincronizarComGitHub();
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
      console.log('📱 Modo offline ativado');
    });
  }
  
  // Iniciar sincronização periódica
  iniciarSincronizacaoPeriodica() {
    if (!this.config.isGitHubPages) return;
    
    setInterval(() => {
      if (this.isOnline) {
        console.log('🔄 Sincronização periódica...');
        this.sincronizarComGitHub();
      }
    }, this.intervaloSync);
  }
  
  // Sistema de eventos
  dispararEvento(tipo, dados) {
    const evento = new CustomEvent(`contador-${tipo}`, { detail: dados });
    window.dispatchEvent(evento);
  }
  
  // Método de compatibilidade
  async incrementarContador(quantidade = 1, tipo = 'geral') {
    return await this.incrementar(quantidade, tipo);
  }
  
  // Método de compatibilidade
  async obterContador() {
    return { totalEtiquetas: this.valorAtual };
  }
}

// Criar instância global
window.contadorGlobal = new ContadorGlobalCentralizado();

// API global para compatibilidade
window.HubEtiquetas = {
  incrementarContador: (quantidade, tipo) => window.contadorGlobal.incrementarContador(quantidade, tipo),
  obterContador: () => window.contadorGlobal.obterContador(),
  obterValor: () => window.contadorGlobal.obterValor(),
  obterEstatisticas: () => window.contadorGlobal.obterEstatisticas(),
  disponivel: () => true
};

console.log('🚀 Sistema de Contador Global Centralizado carregado');

