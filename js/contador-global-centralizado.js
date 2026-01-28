// Sistema de Contador Global Centralizado para GitHub Pages
// Este arquivo garante que TODAS as aplicações compartilhem o mesmo contador
// Integrado com Supabase para persistência de dados

class ContadorGlobalCentralizado {
  constructor() {
    this.config = this.detectarConfiguracao();
    this.valorInicial = 134456;
    this.chaveStorage = 'contador_global_centralizado_v1';
    this.intervaloSync = 300000; // 5 minutos (reduzido de 30s)
    this.isOnline = navigator.onLine;
    this.operacoesPendentes = [];
    this.supabaseIntegrated = false;

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

      // Tentar sincronizar com Supabase (prioridade para dados do servidor)
      setTimeout(async () => {
        let tentativas = 0;
        const tentarSincronizar = async () => {
          if (window.supabaseManager) {
            await this.sincronizarComSupabase();
          } else if (tentativas < 10) {
            tentativas++;
            setTimeout(tentarSincronizar, 500); // Tentar novamente em 500ms
          } else {
            console.log('⚠️ SupabaseManager não carregou a tempo para sincronização inicial');
          }
        };
        tentarSincronizar();
      }, 100);

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

  // Sincronizar com Supabase (Prioridade Máxima)
  async sincronizarComSupabase() {
    if (!window.supabaseManager) {
      console.log('⏳ SupabaseManager ainda não disponível...');
      return;
    }

    try {
      console.log('🔄 Buscando contador oficial do Supabase...');
      const stats = await window.supabaseManager.getCounterStats();

      if (stats && typeof stats.total_count === 'number') {
        const valorRemoto = stats.total_count;

        // Lógica de Sincronização:
        // Se o valor remoto for muito diferente (correção de erro) OU apenas maior (fluxo normal), usamos o remoto.
        // Neste caso, como estamos corrigindo um erro de 164M -> 134K, vamos aceitar o valor do servidor se ele for "razoável" ou mais recente.

        console.log(`📡 Valor no Supabase: ${valorRemoto} (Local: ${this.valorAtual})`);

        // Atualizar SEMPRE que buscar do servidor, para garantir integridade entre máquinas
        // Exceto se o servidor estiver zerado (falha?) e o local tiver dados
        if (valorRemoto > 0) {
          this.valorAtual = valorRemoto;
          this.ultimaAtualizacao = stats.last_updated || new Date().toISOString();
          this.supabaseIntegrated = true; // Confirmar que integração funciona

          await this.salvarEstadoLocal();
          console.log('✅ Contador sincronizado com servidor:', this.valorAtual);

          // Disparar evento de atualização visual
          this.dispararEvento('atualizado', {
            valor: this.valorAtual,
            fonte: 'servidor'
          });
        }
      }
    } catch (error) {
      console.warn('⚠️ Erro ao sincronizar com Supabase:', error);
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

      // Incrementar valor local primeiro (sempre funciona)
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

      // Salvar estado local (sempre funciona)
      await this.salvarEstadoLocal();

      // Tentar sincronizar com Supabase se disponível
      if (this.supabaseIntegrated && window.supabaseManager) {
        try {
          await window.supabaseManager.updateGlobalCounter(quantidade, tipo);
          console.log(`✅ Contador sincronizado com Supabase: +${quantidade} ${tipo} = ${this.valorAtual}`);
        } catch (error) {
          console.warn('⚠️ Falha na sincronização Supabase, dados salvos localmente:', error);
          // Não falhar - dados já estão salvos localmente
        }
      }

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

  // Habilitar integração Supabase
  enableSupabaseIntegration() {
    this.supabaseIntegrated = true;
    console.log('✅ Integração Supabase habilitada no contador global');
  }

  // Desabilitar integração Supabase
  disableSupabaseIntegration() {
    this.supabaseIntegrated = false;
    console.log('⚠️ Integração Supabase desabilitada no contador global');
  }

  // Verificar se Supabase está integrado
  isSupabaseIntegrated() {
    return this.supabaseIntegrated;
  }

  // Incrementar apenas localmente (usado quando a sincronização principal já foi feita via RPC)
  incrementarLocalmente(quantidade = 1) {
    if (quantidade <= 0) return;

    const valorAnterior = this.valorAtual;
    this.valorAtual += quantidade;
    this.ultimaAtualizacao = new Date().toISOString();

    // Salvar estado local
    this.salvarEstadoLocal();

    // Disparar evento
    window.dispatchEvent(new CustomEvent('contador-atualizado', {
      detail: {
        valor: this.valorAtual,
        incremento: quantidade,
        tipo: 'local-fallback'
      }
    }));

    console.log(`📈 Contador incrementado localmente: +${quantidade} = ${this.valorAtual}`);
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



