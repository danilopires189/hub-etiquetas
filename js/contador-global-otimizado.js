// Sistema de Contador Global OTIMIZADO
// Reduz drasticamente as consultas ao banco de dados

class ContadorGlobalOtimizado {
  constructor() {
    this.config = this.detectarConfiguracao();
    this.valorInicial = 134456;
    this.chaveStorage = 'contador_global_centralizado_v2';
    this.intervaloSync = 600000; // 10 minutos (aumentado de 5min)
    this.isOnline = navigator.onLine;
    this.operacoesPendentes = [];
    this.supabaseIntegrated = false;
    
    // OTIMIZAÇÕES
    this.batchPendente = [];
    this.ultimoFlush = Date.now();
    this.flushInterval = 10000; // 10 segundos para flush
    this.maxBatchSize = 20; // Máximo 20 operações por lote
    this.debounceTimeout = null;
    this.syncInProgress = false;

    console.log('🌐 Contador Global OTIMIZADO inicializado');
    this.inicializar();
  }

  detectarConfiguracao() {
    const hostname = window.location.hostname;
    const pathname = window.location.pathname;

    if (hostname.endsWith('.github.io')) {
      const owner = hostname.split('.')[0];
      const pathParts = pathname.split('/').filter(p => p);
      const repo = pathParts[0] || `${owner}.github.io`;

      return {
        owner, repo, branch: 'main',
        autoDetectado: true, isGitHubPages: true
      };
    }

    return {
      owner: 'SEU_USUARIO_GITHUB', repo: 'SEU_REPOSITORIO',
      branch: 'main', autoDetectado: false, isGitHubPages: false
    };
  }

  async inicializar() {
    try {
      await this.carregarEstadoLocal();

      // OTIMIZAÇÃO: Sincronização inicial apenas uma vez
      setTimeout(async () => {
        if (window.supabaseManager && !this.syncInProgress) {
          await this.sincronizarComSupabaseOtimizado();
        }
      }, 1000); // Delay maior para evitar múltiplas tentativas

      this.configurarMonitoramentoConectividade();
      this.iniciarSincronizacaoOtimizada();
      this.iniciarFlushAutomatico();

      console.log('✅ Contador Global OTIMIZADO pronto');
      console.log(`📊 Valor atual: ${this.valorAtual} etiquetas`);

    } catch (error) {
      console.warn('⚠️ Erro na inicialização:', error.message);
      this.valorAtual = this.valorInicial;
      this.ultimaAtualizacao = new Date().toISOString();
    }
  }

  async carregarEstadoLocal() {
    try {
      const dados = localStorage.getItem(this.chaveStorage);
      if (dados) {
        const parsed = JSON.parse(dados);
        this.valorAtual = parsed.totalEtiquetas || this.valorInicial;
        this.ultimaAtualizacao = parsed.ultimaAtualizacao;
        this.batchPendente = parsed.batchPendente || [];
        console.log(`📱 Estado local carregado: ${this.valorAtual} etiquetas`);
      } else {
        this.valorAtual = this.valorInicial;
        this.ultimaAtualizacao = new Date().toISOString();
        this.batchPendente = [];
        await this.salvarEstadoLocal();
      }
    } catch (error) {
      console.warn('⚠️ Erro ao carregar estado local:', error);
      this.valorAtual = this.valorInicial;
      this.ultimaAtualizacao = new Date().toISOString();
      this.batchPendente = [];
    }
  }

  async salvarEstadoLocal() {
    try {
      const dados = {
        totalEtiquetas: this.valorAtual,
        ultimaAtualizacao: this.ultimaAtualizacao,
        batchPendente: this.batchPendente,
        timestamp: Date.now()
      };

      localStorage.setItem(this.chaveStorage, JSON.stringify(dados));
    } catch (error) {
      console.warn('⚠️ Erro ao salvar estado local:', error);
    }
  }

  // OTIMIZAÇÃO: Sincronização com debounce e cache
  async sincronizarComSupabaseOtimizado() {
    if (!window.supabaseManager || this.syncInProgress) {
      return;
    }

    this.syncInProgress = true;

    try {
      // Verificar cache primeiro
      const cacheKey = 'contador_stats_cache';
      const cached = window.cacheManager?.get(cacheKey);
      
      if (cached && (Date.now() - cached.timestamp) < 30000) { // Cache de 30s
        console.log('📦 Usando stats do cache');
        this.syncInProgress = false;
        return;
      }

      console.log('🔄 Sincronizando com Supabase (otimizado)...');
      const stats = await window.supabaseManager.getCounterStats();

      if (stats && typeof stats.total_count === 'number') {
        const valorRemoto = stats.total_count;

        if (valorRemoto > 0 && valorRemoto !== this.valorAtual) {
          this.valorAtual = valorRemoto;
          this.ultimaAtualizacao = stats.last_updated || new Date().toISOString();
          await this.salvarEstadoLocal();
          
          this.dispararEvento('atualizado', {
            valor: this.valorAtual,
            fonte: 'servidor'
          });
        }

        // Salvar no cache
        if (window.cacheManager) {
          window.cacheManager.set(cacheKey, {
            stats,
            timestamp: Date.now()
          });
        }
      }
    } catch (error) {
      console.warn('⚠️ Erro na sincronização otimizada:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  // OTIMIZAÇÃO PRINCIPAL: Incremento com batch e debounce
  async incrementar(quantidade = 1, tipo = 'geral') {
    try {
      if (quantidade <= 0) {
        throw new Error('Quantidade deve ser positiva');
      }

      // Incrementar localmente IMEDIATAMENTE (UX responsiva)
      const valorAnterior = this.valorAtual;
      this.valorAtual += quantidade;
      this.ultimaAtualizacao = new Date().toISOString();

      // Adicionar ao batch pendente
      this.batchPendente.push({
        quantidade,
        tipo,
        valorAnterior,
        valorNovo: this.valorAtual,
        timestamp: this.ultimaAtualizacao
      });

      // Salvar estado local
      await this.salvarEstadoLocal();

      // Disparar eventos imediatamente para UX
      this.dispararEventos(quantidade, tipo, valorAnterior);

      // OTIMIZAÇÃO: Usar debouncer se disponível
      if (window.supabaseDebouncer) {
        window.supabaseDebouncer.debounceCounterUpdate(quantidade, tipo);
        console.log(`📊 Contador adicionado ao debouncer: +${quantidade} ${tipo}`);
      } else {
        // Fallback: processar batch com debounce manual
        this.processarBatchComDebounce();
      }

      console.log(`📈 Contador incrementado localmente: +${quantidade} ${tipo} = ${this.valorAtual}`);
      return this.valorAtual;

    } catch (error) {
      console.error('❌ Erro ao incrementar contador:', error);
      throw error;
    }
  }

  // Processar batch com debounce manual
  processarBatchComDebounce() {
    // Cancelar timeout anterior
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
    }

    // Agendar processamento
    this.debounceTimeout = setTimeout(async () => {
      await this.processarBatch();
    }, 3000); // 3 segundos de debounce
  }

  // Processar batch de operações
  async processarBatch() {
    if (this.batchPendente.length === 0 || !this.supabaseIntegrated || !window.supabaseManager) {
      return;
    }

    try {
      // Calcular total do batch
      const totalIncremento = this.batchPendente.reduce((sum, op) => sum + op.quantidade, 0);
      const tipos = [...new Set(this.batchPendente.map(op => op.tipo))];
      const tipoMaisComum = tipos[0]; // Usar o primeiro tipo

      console.log(`📦 Processando batch: ${this.batchPendente.length} operações, +${totalIncremento} total`);

      // UMA ÚNICA consulta para todo o batch
      await window.supabaseManager.updateGlobalCounter(totalIncremento, tipoMaisComum);

      // Limpar batch processado
      this.batchPendente = [];
      await this.salvarEstadoLocal();

      console.log(`✅ Batch processado: +${totalIncremento} enviado ao Supabase`);

    } catch (error) {
      console.warn('⚠️ Erro ao processar batch:', error);
      // Manter operações no batch para tentar novamente
    }
  }

  // Disparar eventos para UX
  dispararEventos(quantidade, tipo, valorAnterior) {
    this.dispararEvento('incremento', {
      quantidade, tipo, valorAnterior,
      valorAtual: this.valorAtual
    });

    window.dispatchEvent(new CustomEvent('contador-atualizado', {
      detail: {
        valor: this.valorAtual,
        incremento: quantidade,
        tipo: tipo
      }
    }));

    // Cross-window communication
    if (window.localStorage) {
      localStorage.setItem('contador_ultimo_incremento', JSON.stringify({
        valor: this.valorAtual,
        incremento: quantidade,
        tipo: tipo,
        timestamp: Date.now()
      }));
    }
  }

  // Flush automático do batch
  iniciarFlushAutomatico() {
    setInterval(async () => {
      if (this.batchPendente.length > 0) {
        console.log('⏰ Flush automático do batch');
        await this.processarBatch();
      }
    }, this.flushInterval);
  }

  // Sincronização periódica otimizada
  iniciarSincronizacaoOtimizada() {
    // OTIMIZAÇÃO: Intervalo muito maior e apenas se necessário
    setInterval(async () => {
      if (this.isOnline && !this.syncInProgress) {
        // Só sincronizar se houver atividade recente
        const tempoSemAtividade = Date.now() - this.ultimaAtualizacao;
        if (tempoSemAtividade < this.intervaloSync) {
          console.log('🔄 Sincronização periódica otimizada...');
          await this.sincronizarComSupabaseOtimizado();
        }
      }
    }, this.intervaloSync);
  }

  configurarMonitoramentoConectividade() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      console.log('🌐 Conectividade restaurada - processando batch pendente');
      setTimeout(() => this.processarBatch(), 1000);
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      console.log('📱 Modo offline - operações serão acumuladas');
    });
  }

  // Forçar flush imediato (para uso manual)
  async forcarFlush() {
    console.log('🚀 Flush forçado do contador');
    await this.processarBatch();
    if (window.supabaseDebouncer) {
      await window.supabaseDebouncer.flushAll();
    }
  }

  // Métodos de compatibilidade
  dispararEvento(tipo, dados) {
    const evento = new CustomEvent(`contador-${tipo}`, { detail: dados });
    window.dispatchEvent(evento);
  }

  obterValor() {
    return this.valorAtual;
  }

  async incrementarContador(quantidade = 1, tipo = 'geral') {
    return await this.incrementar(quantidade, tipo);
  }

  async obterContador() {
    return { totalEtiquetas: this.valorAtual };
  }

  enableSupabaseIntegration() {
    this.supabaseIntegrated = true;
    console.log('✅ Integração Supabase habilitada no contador otimizado');
  }

  disableSupabaseIntegration() {
    this.supabaseIntegrated = false;
    console.log('⚠️ Integração Supabase desabilitada no contador otimizado');
  }

  isSupabaseIntegrated() {
    return this.supabaseIntegrated;
  }

  obterEstatisticas() {
    return {
      valorAtual: this.valorAtual,
      ultimaAtualizacao: this.ultimaAtualizacao,
      batchPendente: this.batchPendente.length,
      isOnline: this.isOnline,
      configuracao: this.config,
      otimizacoes: {
        flushInterval: this.flushInterval,
        maxBatchSize: this.maxBatchSize,
        intervaloSync: this.intervaloSync
      }
    };
  }
}

// Substituir contador global pela versão otimizada
window.contadorGlobal = new ContadorGlobalOtimizado();

// API global mantida para compatibilidade
window.HubEtiquetas = {
  incrementarContador: (quantidade, tipo) => window.contadorGlobal.incrementarContador(quantidade, tipo),
  obterContador: () => window.contadorGlobal.obterContador(),
  obterValor: () => window.contadorGlobal.obterValor(),
  obterEstatisticas: () => window.contadorGlobal.obterEstatisticas(),
  disponivel: () => true,
  forcarFlush: () => window.contadorGlobal.forcarFlush()
};

console.log('🚀 Sistema de Contador Global OTIMIZADO carregado');