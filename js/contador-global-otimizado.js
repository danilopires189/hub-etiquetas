/**
 * Sistema de Contador Global Otimizado
 * Gerencia a contagem de etiquetas com sincronização em batch
 * @version 2.0.0
 */

class ContadorGlobalOtimizado {
  constructor() {
    this.config = this.detectarConfiguracao();
    this.valorInicial = 0;
    this.chaveStorage = 'contador_global_v2';
    this.intervaloSync = 600000; // 10 minutos
    this.isOnline = navigator.onLine;
    this.supabaseIntegrated = false;

    // Otimizações de batch
    this.batchPendente = [];
    this.ultimoFlush = Date.now();
    this.flushInterval = 10000; // 10 segundos
    this.maxBatchSize = 20;
    this.debounceTimeout = null;
    this.syncInProgress = false;

    this.inicializar();
  }

  normalizarNumero(valor, fallback = 0) {
    const numero = Number(valor);
    if (!Number.isFinite(numero) || numero < 0) {
      return fallback;
    }
    return Math.floor(numero);
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
      owner: 'danilopires189', repo: 'hub-etiquetas',
      branch: 'main', autoDetectado: false, isGitHubPages: false
    };
  }

  async inicializar() {
    try {
      await this.carregarEstadoLocal();

      // Sincronização inicial com delay
      setTimeout(async () => {
        if (window.supabaseManager && !this.syncInProgress) {
          await this.sincronizarComSupabase();
        }
      }, 1000);

      this.configurarMonitoramentoConectividade();
      this.iniciarSincronizacaoPeriodica();
      this.iniciarFlushAutomatico();

    } catch (error) {
      this.valorAtual = this.valorInicial;
      this.ultimaAtualizacao = new Date().toISOString();
    }
  }

  async carregarEstadoLocal() {
    try {
      const dados = localStorage.getItem(this.chaveStorage);
      if (dados) {
        const parsed = JSON.parse(dados);
        this.valorAtual = this.normalizarNumero(parsed?.totalEtiquetas, this.valorInicial);
        this.ultimaAtualizacao = parsed?.ultimaAtualizacao || new Date().toISOString();
        this.batchPendente = Array.isArray(parsed?.batchPendente) ? parsed.batchPendente : [];
      } else {
        this.valorAtual = this.valorInicial;
        this.ultimaAtualizacao = new Date().toISOString();
        this.batchPendente = [];
        await this.salvarEstadoLocal();
      }
    } catch (error) {
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
      // Silent fail - localStorage may be full
    }
  }

  async sincronizarComSupabase() {
    if (!window.supabaseManager || this.syncInProgress) {
      return;
    }

    this.syncInProgress = true;

    try {
      // Verificar cache primeiro
      const cacheKey = 'contador_stats_cache';
      const cached = window.cacheManager?.get(cacheKey);

      if (cached && (Date.now() - cached.timestamp) < 30000) {
        this.syncInProgress = false;
        return;
      }

      const stats = await window.supabaseManager.getCounterStats();
      if (stats?.isFallback) {
        return;
      }

      const valorRemoto = this.normalizarNumero(stats?.total_count, null);
      if (valorRemoto !== null && valorRemoto !== this.valorAtual) {
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
        window.cacheManager.set(cacheKey, { stats, timestamp: Date.now() });
      }
    } catch (error) {
      // Silent fail - will retry on next sync
    } finally {
      this.syncInProgress = false;
    }
  }

  async incrementar(quantidade = 1, tipo = 'geral') {
    try {
      if (quantidade <= 0) {
        throw new Error('Quantidade deve ser positiva');
      }

      // Incrementar localmente primeiro (UX responsiva)
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

      // Disparar eventos para UX
      this.dispararEventos(quantidade, tipo, valorAnterior);

      // Usar debouncer se disponível
      if (window.supabaseDebouncer) {
        window.supabaseDebouncer.debounceCounterUpdate(quantidade, tipo);
      } else {
        this.processarBatchComDebounce();
      }

      return this.valorAtual;

    } catch (error) {
      throw error;
    }
  }

  processarBatchComDebounce() {
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
    }

    this.debounceTimeout = setTimeout(async () => {
      await this.processarBatch();
    }, 3000);
  }

  async processarBatch() {
    if (this.batchPendente.length === 0 || !this.supabaseIntegrated || !window.supabaseManager) {
      return;
    }

    try {
      const totalIncremento = this.batchPendente.reduce((sum, op) => sum + op.quantidade, 0);
      const tipos = [...new Set(this.batchPendente.map(op => op.tipo))];
      const tipoMaisComum = tipos[0];

      await window.supabaseManager.updateGlobalCounter(totalIncremento, tipoMaisComum);

      this.batchPendente = [];
      await this.salvarEstadoLocal();

    } catch (error) {
      // Manter operações no batch para retry
    }
  }

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

  iniciarFlushAutomatico() {
    setInterval(async () => {
      if (this.batchPendente.length > 0) {
        await this.processarBatch();
      }
    }, this.flushInterval);
  }

  iniciarSincronizacaoPeriodica() {
    setInterval(async () => {
      if (this.isOnline && !this.syncInProgress) {
        await this.sincronizarComSupabase();
      }
    }, this.intervaloSync);
  }

  configurarMonitoramentoConectividade() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      setTimeout(() => this.processarBatch(), 1000);
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  async forcarFlush() {
    await this.processarBatch();
    if (window.supabaseDebouncer) {
      await window.supabaseDebouncer.flushAll();
    }
  }

  // API Pública
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
  }

  disableSupabaseIntegration() {
    this.supabaseIntegrated = false;
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
      configuracao: this.config
    };
  }
}

// Instância global
window.contadorGlobal = new ContadorGlobalOtimizado();

// API global para compatibilidade
window.HubEtiquetas = {
  incrementarContador: (quantidade, tipo) => window.contadorGlobal.incrementarContador(quantidade, tipo),
  obterContador: () => window.contadorGlobal.obterContador(),
  obterValor: () => window.contadorGlobal.obterValor(),
  obterEstatisticas: () => window.contadorGlobal.obterEstatisticas(),
  disponivel: () => true,
  forcarFlush: () => window.contadorGlobal.forcarFlush()
};
