// Sistema de Contador Centralizado usando GitHub API Nativo
class ContadorGitHubNativo {
  constructor(config = {}) {
    // Configuração do repositório
    this.owner = config.owner || 'SEU_USUARIO_GITHUB';
    this.repo = config.repo || 'SEU_REPOSITORIO';
    this.branch = config.branch || 'main';
    this.token = config.token || this.getStoredToken();
    this.dataPath = config.dataPath || 'data/contador.json';
    
    // URLs da API GitHub
    this.apiBase = 'https://api.github.com';
    this.contentsUrl = `${this.apiBase}/repos/${this.owner}/${this.repo}/contents/${this.dataPath}`;
    this.commitsUrl = `${this.apiBase}/repos/${this.owner}/${this.repo}/commits`;
    
    // Cache local
    this.cache = {
      contador: null,
      sha: null,
      timestamp: 0,
      ttl: 30000 // 30 segundos
    };
    
    // Queue para operações pendentes
    this.operationQueue = [];
    this.isProcessingQueue = false;
    
    // Rate limiting
    this.rateLimitInfo = {
      remaining: 5000,
      reset: 0,
      limit: 5000
    };
    
    console.log('🚀 ContadorGitHubNativo inicializado');
    this.validateConfig();
  }
  
  // Obter token armazenado
  getStoredToken() {
    return localStorage.getItem('github_token') || 
           sessionStorage.getItem('github_token') ||
           null;
  }
  
  // Validar configuração
  validateConfig() {
    if (!this.owner || this.owner === 'SEU_USUARIO_GITHUB') {
      console.warn('⚠️ Configure o owner do repositório');
      return false;
    }
    
    if (!this.repo || this.repo === 'SEU_REPOSITORIO') {
      console.warn('⚠️ Configure o nome do repositório');
      return false;
    }
    
    if (!this.token) {
      console.warn('⚠️ Token do GitHub não configurado');
      return false;
    }
    
    console.log('✅ Configuração validada');
    return true;
  }
  
  // Headers padrão para requisições GitHub API
  getHeaders() {
    return {
      'Authorization': `token ${this.token}`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'ContadorEtiquetas/2.0',
      'Content-Type': 'application/json'
    };
  }
  
  // Fazer requisição para GitHub API com tratamento de erros e rate limiting
  async makeAPIRequest(url, options = {}) {
    // Verificar rate limit antes da requisição
    await this.checkRateLimit();
    
    try {
      const headers = { ...this.getHeaders(), ...options.headers };
      const response = await fetch(url, { ...options, headers });
      
      // Atualizar informações de rate limiting
      this.updateRateLimitInfo(response);
      
      // Verificar rate limiting
      if (response.status === 403) {
        const rateLimitRemaining = response.headers.get('X-RateLimit-Remaining');
        if (rateLimitRemaining === '0') {
          await this.handleRateLimit();
          // Retry após aguardar
          return this.makeAPIRequest(url, options);
        }
      }
      
      // Verificar outros erros
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`GitHub API Error: ${response.status} - ${errorData.message || response.statusText}`);
      }
      
      return response;
    } catch (error) {
      if (error.message === 'RATE_LIMIT_EXCEEDED') {
        await this.handleRateLimit();
        return this.makeAPIRequest(url, options);
      }
      
      console.error('❌ Erro na requisição GitHub API:', error);
      throw error;
    }
  }
  
  // Verificar rate limit antes de fazer requisição
  async checkRateLimit() {
    if (this.rateLimitInfo.remaining <= 10) { // Margem de segurança
      const now = Date.now();
      const resetTime = this.rateLimitInfo.reset;
      
      if (now < resetTime) {
        const waitTime = resetTime - now;
        this.log(`Rate limit baixo (${this.rateLimitInfo.remaining}), aguardando ${Math.ceil(waitTime/1000)}s`, 'warning');
        await this.sleep(waitTime + 1000); // +1s de margem
      }
    }
  }
  
  // Tratar rate limit exceeded
  async handleRateLimit() {
    const now = Date.now();
    const resetTime = this.rateLimitInfo.reset;
    const waitTime = Math.max(resetTime - now, 60000); // Mínimo 1 minuto
    
    this.log(`Rate limit atingido! Aguardando ${Math.ceil(waitTime/1000)}s para reset`, 'warning');
    
    // Adicionar operação à queue se não estiver processando
    if (!this.isProcessingQueue) {
      this.startQueueProcessing();
    }
    
    await this.sleep(waitTime + 1000); // +1s de margem
    
    // Atualizar rate limit info após reset
    this.rateLimitInfo.remaining = this.rateLimitInfo.limit;
    this.log('Rate limit resetado, continuando operações', 'success');
  }
  
  // Iniciar processamento da queue
  startQueueProcessing() {
    this.isProcessingQueue = true;
    this.log('Iniciando processamento da queue de operações', 'info');
    
    // Processar queue após rate limit reset
    setTimeout(async () => {
      await this.processOperationQueue();
      this.isProcessingQueue = false;
    }, this.rateLimitInfo.reset - Date.now() + 2000);
  }
  
  // Processar queue de operações pendentes
  async processOperationQueue() {
    if (this.operationQueue.length === 0) return;
    
    this.log(`Processando ${this.operationQueue.length} operações da queue`, 'info');
    
    const operations = [...this.operationQueue];
    this.operationQueue = [];
    
    for (const operation of operations) {
      try {
        await this.executeQueuedOperation(operation);
        await this.sleep(1000); // Delay entre operações
      } catch (error) {
        this.log(`Erro ao processar operação da queue: ${error.message}`, 'error');
        // Re-adicionar à queue se falhar
        this.operationQueue.push(operation);
      }
    }
  }
  
  // Executar operação da queue
  async executeQueuedOperation(operation) {
    switch (operation.type) {
      case 'increment':
        return await this.incrementarContador(operation.quantidade, operation.tipo);
      default:
        this.log(`Tipo de operação desconhecido: ${operation.type}`, 'warning');
    }
  }
  
  // Adicionar operação à queue
  addToQueue(operation) {
    this.operationQueue.push({
      ...operation,
      timestamp: Date.now(),
      id: this.generateUUID()
    });
    
    this.log(`Operação adicionada à queue: ${operation.type}`, 'info');
  }
  
  // Atualizar informações de rate limiting
  updateRateLimitInfo(response) {
    const remaining = response.headers.get('X-RateLimit-Remaining');
    const reset = response.headers.get('X-RateLimit-Reset');
    const limit = response.headers.get('X-RateLimit-Limit');
    
    if (remaining !== null) {
      this.rateLimitInfo = {
        remaining: parseInt(remaining),
        reset: parseInt(reset) * 1000, // Converter para milliseconds
        limit: parseInt(limit)
      };
      
      console.log(`📊 Rate Limit: ${remaining}/${limit} (reset: ${new Date(this.rateLimitInfo.reset).toLocaleTimeString()})`);
    }
  }
  
  // Verificar se cache é válido
  isCacheValid() {
    return this.cache.contador !== null && 
           this.cache.timestamp > 0 && 
           (Date.now() - this.cache.timestamp) < this.cache.ttl;
  }
  
  // Atualizar cache
  updateCache(data, sha) {
    this.cache = {
      contador: data,
      sha: sha,
      timestamp: Date.now(),
      ttl: 30000
    };
  }
  
  // Limpar cache
  clearCache() {
    this.cache = {
      contador: null,
      sha: null,
      timestamp: 0,
      ttl: 30000
    };
  }
  
  // Gerar UUID simples para sessões
  generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
  
  // Obter ID da sessão
  getSessionId() {
    let sessionId = sessionStorage.getItem('contador_session_id');
    if (!sessionId) {
      sessionId = this.generateUUID();
      sessionStorage.setItem('contador_session_id', sessionId);
    }
    return sessionId;
  }
  
  // Sleep/delay para retry
  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  // Log de operações
  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      'info': 'ℹ️',
      'success': '✅',
      'warning': '⚠️',
      'error': '❌'
    }[type] || 'ℹ️';
    
    console.log(`${prefix} [${timestamp}] ${message}`);
  }
  
  // Obter contador atual do GitHub
  async obterContador() {
    try {
      this.log('Obtendo contador do GitHub...');
      
      // Verificar cache primeiro
      if (this.isCacheValid()) {
        this.log('Usando contador do cache', 'success');
        return this.cache.contador;
      }
      
      // Buscar do GitHub
      const response = await this.makeAPIRequest(this.contentsUrl);
      const data = await response.json();
      
      // Decodificar conteúdo (vem em base64)
      const content = JSON.parse(atob(data.content));
      
      // Atualizar cache
      this.updateCache(content, data.sha);
      
      this.log(`Contador obtido: ${content.totalEtiquetas}`, 'success');
      return content;
      
    } catch (error) {
      this.log(`Erro ao obter contador: ${error.message}`, 'error');
      
      // Se arquivo não existe, criar estrutura inicial
      if (error.message.includes('404')) {
        this.log('Arquivo não encontrado, criando estrutura inicial...', 'warning');
        return this.criarContadorInicial();
      }
      
      // Se há cache, usar como fallback
      if (this.cache.contador) {
        this.log('Usando cache como fallback', 'warning');
        return this.cache.contador;
      }
      
      // Fallback final - estrutura padrão
      this.log('Usando estrutura padrão como fallback', 'warning');
      return this.getContadorPadrao();
    }
  }
  
  // Criar contador inicial no GitHub
  async criarContadorInicial() {
    try {
      const contadorInicial = this.getContadorPadrao();
      
      const commitData = {
        message: 'feat(contador): inicializar contador centralizado\n\n- Valor inicial: 19452\n- Sistema: GitHub API nativo',
        content: btoa(JSON.stringify(contadorInicial, null, 2)),
        branch: this.branch
      };
      
      const response = await this.makeAPIRequest(this.contentsUrl, {
        method: 'PUT',
        body: JSON.stringify(commitData)
      });
      
      const result = await response.json();
      
      // Atualizar cache
      this.updateCache(contadorInicial, result.content.sha);
      
      this.log('Contador inicial criado com sucesso', 'success');
      return contadorInicial;
      
    } catch (error) {
      this.log(`Erro ao criar contador inicial: ${error.message}`, 'error');
      throw error;
    }
  }
  
  // Estrutura padrão do contador
  getContadorPadrao() {
    return {
      totalEtiquetas: 19452,
      ultimaAtualizacao: new Date().toISOString(),
      versao: '2.0',
      breakdown: {
        placas: 0,
        caixa: 0,
        avulso: 0,
        enderec: 0,
        transfer: 0,
        termo: 0
      },
      metadata: {
        sistema: 'GitHub API Nativo',
        sessaoAtual: this.getSessionId(),
        ultimoCommit: null,
        protegido: true, // Proteção contra reset
        valorMinimo: 19452 // Valor mínimo permitido
      }
    };
  }
  
  // Verificar se operação pode diminuir contador
  validarOperacao(novoValor, valorAtual) {
    const valorMinimo = valorAtual.metadata?.valorMinimo || 19452;
    
    if (novoValor < valorMinimo) {
      this.log(`❌ OPERAÇÃO BLOQUEADA: Tentativa de reduzir contador abaixo do mínimo (${valorMinimo})`, 'error');
      return false;
    }
    
    if (novoValor < valorAtual.totalEtiquetas) {
      this.log(`⚠️ ATENÇÃO: Tentativa de diminuir contador de ${valorAtual.totalEtiquetas} para ${novoValor}`, 'warning');
      return false;
    }
    
    return true;
  }
  
  // Incrementar contador no GitHub
  async incrementarContador(quantidade = 1, tipo = 'geral') {
    try {
      // Validar inputs
      if (!this.validarIncremento(quantidade, tipo)) {
        throw new Error('Parâmetros de incremento inválidos');
      }
      
      this.log(`Incrementando contador: +${quantidade} (${tipo})`);
      
      // Verificar se deve usar queue devido a rate limiting
      if (this.rateLimitInfo.remaining <= 5) {
        this.addToQueue({ type: 'increment', quantidade, tipo });
        this.log('Operação adicionada à queue devido a rate limit', 'warning');
        return this.cache.contador?.totalEtiquetas || 19452;
      }
      
      // Obter contador atual
      const contadorAtual = await this.obterContador();
      
      // Calcular novo valor
      const novoContador = this.calcularNovoValor(contadorAtual, quantidade, tipo);
      
      // Tentar commit com retry para conflitos
      const resultado = await this.commitComRetry(novoContador, this.cache.sha);
      
      this.log(`Contador incrementado com sucesso: ${resultado.totalEtiquetas}`, 'success');
      return resultado;
      
    } catch (error) {
      this.log(`Erro ao incrementar contador: ${error.message}`, 'error');
      
      // Fallback: incrementar cache local
      if (this.cache.contador) {
        this.cache.contador.totalEtiquetas += quantidade;
        if (this.cache.contador.breakdown[tipo] !== undefined) {
          this.cache.contador.breakdown[tipo] += quantidade;
        }
        this.log('Incremento aplicado no cache local como fallback', 'warning');
        return this.cache.contador;
      }
      
      throw error;
    }
  }
  
  // Validar parâmetros de incremento
  validarIncremento(quantidade, tipo) {
    // PROTEÇÃO: Validar quantidade (APENAS POSITIVA)
    if (!Number.isInteger(quantidade) || quantidade < 1 || quantidade > 1000) {
      this.log(`❌ Quantidade inválida: ${quantidade} (deve ser 1-1000 e POSITIVA)`, 'error');
      return false;
    }
    
    // PROTEÇÃO: Bloquear tentativas de decremento
    if (quantidade < 0) {
      this.log(`❌ OPERAÇÃO BLOQUEADA: Tentativa de decrementar contador (${quantidade})`, 'error');
      return false;
    }
    
    // Validar tipo
    const tiposValidos = ['geral', 'placas', 'caixa', 'avulso', 'enderec', 'transfer', 'termo'];
    if (!tiposValidos.includes(tipo)) {
      this.log(`Tipo inválido: ${tipo} (válidos: ${tiposValidos.join(', ')})`, 'error');
      return false;
    }
    
    return true;
  }
  
  // Calcular novo valor do contador
  calcularNovoValor(contadorAtual, quantidade, tipo) {
    const novoContador = JSON.parse(JSON.stringify(contadorAtual)); // Deep clone
    
    // PROTEÇÃO: Só permite incremento (quantidade positiva)
    if (quantidade <= 0) {
      this.log(`❌ OPERAÇÃO BLOQUEADA: Quantidade deve ser positiva (recebido: ${quantidade})`, 'error');
      throw new Error('Quantidade deve ser positiva');
    }
    
    // Incrementar total
    const novoTotal = novoContador.totalEtiquetas + quantidade;
    
    // PROTEÇÃO: Verificar se não diminui o contador
    if (!this.validarOperacao(novoTotal, contadorAtual)) {
      throw new Error('Operação não permitida: tentativa de diminuir contador');
    }
    
    novoContador.totalEtiquetas = novoTotal;
    
    // Incrementar breakdown se tipo específico
    if (tipo !== 'geral' && novoContador.breakdown[tipo] !== undefined) {
      novoContador.breakdown[tipo] += quantidade;
    }
    
    // Atualizar metadata
    novoContador.ultimaAtualizacao = new Date().toISOString();
    novoContador.metadata.sessaoAtual = this.getSessionId();
    
    // Manter proteções
    if (!novoContador.metadata.valorMinimo) {
      novoContador.metadata.valorMinimo = contadorAtual.totalEtiquetas;
    }
    novoContador.metadata.protegido = true;
    
    return novoContador;
  }
  
  // Commit com retry para tratar conflitos
  async commitComRetry(novoContador, expectedSHA, maxRetries = 3) {
    let retries = 0;
    
    while (retries < maxRetries) {
      try {
        return await this.commitContador(novoContador, expectedSHA);
      } catch (error) {
        if (error.message.includes('409') || error.message.includes('conflict')) {
          retries++;
          this.log(`Conflito detectado, tentativa ${retries}/${maxRetries}`, 'warning');
          
          if (retries < maxRetries) {
            // Aguardar antes de retry
            await this.sleep(Math.pow(2, retries) * 1000);
            
            // Resolver conflito
            const resultado = await this.resolverConflito(novoContador);
            if (resultado) {
              return resultado;
            }
          }
        } else {
          throw error;
        }
      }
    }
    
    throw new Error(`Falha ao commitar após ${maxRetries} tentativas`);
  }
  
  // Fazer commit do contador no GitHub
  async commitContador(contador, expectedSHA) {
    const commitMessage = this.gerarCommitMessage(contador);
    
    const commitData = {
      message: commitMessage,
      content: btoa(JSON.stringify(contador, null, 2)),
      sha: expectedSHA,
      branch: this.branch
    };
    
    const response = await this.makeAPIRequest(this.contentsUrl, {
      method: 'PUT',
      body: JSON.stringify(commitData)
    });
    
    const result = await response.json();
    
    // Atualizar cache
    this.updateCache(contador, result.content.sha);
    
    return contador;
  }
  
  // Gerar mensagem de commit padronizada
  gerarCommitMessage(contador) {
    const incremento = contador.totalEtiquetas - (this.cache.contador?.totalEtiquetas || 19452);
    const timestamp = new Date().toISOString();
    
    return `feat(contador): +${incremento} etiquetas

- Total: ${contador.totalEtiquetas}
- Incremento: +${incremento}
- Timestamp: ${timestamp}
- Sessão: ${contador.metadata.sessaoAtual}`;
  }
  
  // Detectar conflitos comparando SHA
  async detectarConflito(expectedSHA) {
    try {
      const response = await this.makeAPIRequest(this.contentsUrl);
      const data = await response.json();
      
      const currentSHA = data.sha;
      const hasConflict = currentSHA !== expectedSHA;
      
      if (hasConflict) {
        this.log(`Conflito detectado! Expected: ${expectedSHA.substring(0,8)}, Current: ${currentSHA.substring(0,8)}`, 'warning');
      }
      
      return {
        hasConflict,
        currentSHA,
        expectedSHA,
        currentContent: hasConflict ? JSON.parse(atob(data.content)) : null
      };
    } catch (error) {
      this.log(`Erro ao detectar conflito: ${error.message}`, 'error');
      return { hasConflict: true, error: error.message };
    }
  }
  
  // Verificar integridade dos dados antes do commit
  async verificarIntegridade(novoContador) {
    try {
      // Verificar se o total bate com a soma do breakdown
      const somaBreakdown = Object.values(novoContador.breakdown).reduce((sum, val) => sum + val, 0);
      
      // Permitir diferença (breakdown pode não incluir todos os incrementos históricos)
      if (somaBreakdown > novoContador.totalEtiquetas) {
        this.log(`Inconsistência detectada: breakdown (${somaBreakdown}) > total (${novoContador.totalEtiquetas})`, 'warning');
        return false;
      }
      
      // Verificar se o incremento é razoável (não mais que 1000 de uma vez)
      const incremento = novoContador.totalEtiquetas - (this.cache.contador?.totalEtiquetas || 19452);
      if (incremento > 1000 || incremento < 0) {
        this.log(`Incremento suspeito detectado: ${incremento}`, 'warning');
        return false;
      }
      
      // Verificar timestamp
      const agora = new Date();
      const ultimaAtualizacao = new Date(novoContador.ultimaAtualizacao);
      const diffMinutos = (agora - ultimaAtualizacao) / (1000 * 60);
      
      if (diffMinutos > 5) { // Mais de 5 minutos no futuro/passado
        this.log(`Timestamp suspeito: ${diffMinutos.toFixed(1)} minutos de diferença`, 'warning');
      }
      
      return true;
    } catch (error) {
      this.log(`Erro na verificação de integridade: ${error.message}`, 'error');
      return false;
    }
  }
  
  // Retry com backoff exponencial
  async retryWithBackoff(operation, maxRetries = 3, baseDelay = 1000) {
    let retries = 0;
    
    while (retries < maxRetries) {
      try {
        return await operation();
      } catch (error) {
        retries++;
        
        if (retries >= maxRetries) {
          throw error;
        }
        
        const delay = baseDelay * Math.pow(2, retries - 1);
        this.log(`Retry ${retries}/${maxRetries} em ${delay}ms`, 'warning');
        await this.sleep(delay);
      }
    }
  }
  
  // Obter SHA atual do arquivo
  async obterSHAAtual() {
    try {
      const response = await this.makeAPIRequest(this.contentsUrl);
      const data = await response.json();
      return data.sha;
    } catch (error) {
      this.log(`Erro ao obter SHA atual: ${error.message}`, 'error');
      return null;
    }
  }
  
  // Validar SHA format
  validarSHA(sha) {
    return typeof sha === 'string' && /^[a-f0-9]{40}$/i.test(sha);
  }
  
  // Resolver conflito automaticamente
  async resolverConflito(novoContador) {
    try {
      this.log('Iniciando resolução automática de conflito...', 'warning');
      
      // Obter versão atual do GitHub
      const response = await this.makeAPIRequest(this.contentsUrl);
      const data = await response.json();
      const versaoAtual = JSON.parse(atob(data.content));
      
      // Fazer merge inteligente
      const versaoMerged = await this.mergeContadores(versaoAtual, novoContador);
      
      // Verificar integridade do merge
      if (!await this.verificarIntegridade(versaoMerged)) {
        throw new Error('Merge resultou em dados inconsistentes');
      }
      
      // Tentar commit da versão merged
      const resultado = await this.commitContador(versaoMerged, data.sha);
      
      this.log('Conflito resolvido com sucesso via merge automático', 'success');
      return resultado;
      
    } catch (error) {
      this.log(`Erro na resolução de conflito: ${error.message}`, 'error');
      
      // Fallback: tentar novamente com dados atuais
      try {
        const contadorAtual = await this.obterContador();
        const incremento = novoContador.totalEtiquetas - (this.cache.contador?.totalEtiquetas || 19452);
        const novaVersao = this.calcularNovoValor(contadorAtual, incremento, 'geral');
        
        return await this.commitContador(novaVersao, this.cache.sha);
      } catch (fallbackError) {
        this.log(`Fallback também falhou: ${fallbackError.message}`, 'error');
        throw error;
      }
    }
  }
  
  // Fazer merge inteligente de dois contadores
  async mergeContadores(versaoAtual, novaVersao) {
    this.log('Fazendo merge inteligente dos contadores...', 'info');
    
    // Usar a versão atual como base
    const merged = JSON.parse(JSON.stringify(versaoAtual));
    
    // Calcular incremento da nova versão
    const incrementoTotal = novaVersao.totalEtiquetas - (this.cache.contador?.totalEtiquetas || 19452);
    
    // Aplicar incremento ao total atual
    merged.totalEtiquetas = versaoAtual.totalEtiquetas + incrementoTotal;
    
    // Merge do breakdown
    merged.breakdown = this.mergeBreakdown(versaoAtual.breakdown, novaVersao.breakdown, incrementoTotal);
    
    // Atualizar metadata
    merged.ultimaAtualizacao = new Date().toISOString();
    merged.metadata = {
      ...merged.metadata,
      sessaoAtual: this.getSessionId(),
      mergeInfo: {
        timestamp: new Date().toISOString(),
        versaoAnterior: versaoAtual.totalEtiquetas,
        incrementoAplicado: incrementoTotal,
        tipoMerge: 'automatico'
      }
    };
    
    this.log(`Merge concluído: ${versaoAtual.totalEtiquetas} + ${incrementoTotal} = ${merged.totalEtiquetas}`, 'success');
    return merged;
  }
  
  // Merge inteligente do breakdown
  mergeBreakdown(breakdownAtual, breakdownNovo, incrementoTotal) {
    const merged = { ...breakdownAtual };
    
    // Encontrar qual tipo teve incremento
    let tipoIncrementado = null;
    let incrementoTipo = 0;
    
    for (const [tipo, valor] of Object.entries(breakdownNovo)) {
      const valorAtual = this.cache.contador?.breakdown[tipo] || 0;
      const incremento = valor - valorAtual;
      
      if (incremento > 0) {
        tipoIncrementado = tipo;
        incrementoTipo = incremento;
        break;
      }
    }
    
    // Aplicar incremento ao tipo identificado ou distribuir proporcionalmente
    if (tipoIncrementado && merged[tipoIncrementado] !== undefined) {
      merged[tipoIncrementado] += incrementoTipo;
      this.log(`Incremento aplicado ao tipo '${tipoIncrementado}': +${incrementoTipo}`, 'info');
    } else {
      // Fallback: não atualizar breakdown específico, apenas o total
      this.log('Não foi possível identificar tipo específico, mantendo breakdown atual', 'warning');
    }
    
    return merged;
  }
  
  // Detectar tipo de incremento baseado no breakdown
  detectarTipoIncremento(breakdownAnterior, breakdownNovo) {
    for (const [tipo, valor] of Object.entries(breakdownNovo)) {
      const valorAnterior = breakdownAnterior[tipo] || 0;
      if (valor > valorAnterior) {
        return {
          tipo,
          incremento: valor - valorAnterior
        };
      }
    }
    
    return { tipo: 'geral', incremento: 0 };
  }
  
  // Validar resultado do merge
  validarMerge(merged, versaoAtual, novaVersao) {
    // Verificar se o total não diminuiu
    if (merged.totalEtiquetas < versaoAtual.totalEtiquetas) {
      this.log('Erro: merge resultou em diminuição do contador', 'error');
      return false;
    }
    
    // Verificar se o incremento é razoável
    const incremento = merged.totalEtiquetas - versaoAtual.totalEtiquetas;
    if (incremento > 1000) {
      this.log(`Erro: incremento muito grande no merge: ${incremento}`, 'error');
      return false;
    }
    
    // Verificar breakdown
    const somaBreakdown = Object.values(merged.breakdown).reduce((sum, val) => sum + val, 0);
    if (somaBreakdown > merged.totalEtiquetas) {
      this.log('Erro: breakdown inconsistente após merge', 'error');
      return false;
    }
    
    return true;
  }
  
  // Sistema de cache e fallback offline
  
  // Verificar status de conexão
  isOnline() {
    return navigator.onLine && this.rateLimitInfo.remaining > 0;
  }
  
  // Salvar estado offline
  salvarEstadoOffline() {
    const estado = {
      contador: this.cache.contador,
      sha: this.cache.sha,
      timestamp: this.cache.timestamp,
      operacoesPendentes: this.operationQueue,
      rateLimitInfo: this.rateLimitInfo
    };
    
    localStorage.setItem('contador_offline_state', JSON.stringify(estado));
    this.log('Estado offline salvo', 'info');
  }
  
  // Carregar estado offline
  carregarEstadoOffline() {
    try {
      const estadoSalvo = localStorage.getItem('contador_offline_state');
      if (!estadoSalvo) return false;
      
      const estado = JSON.parse(estadoSalvo);
      
      // Verificar se não está muito antigo (máximo 1 hora)
      const agora = Date.now();
      const idadeEstado = agora - estado.timestamp;
      
      if (idadeEstado > 3600000) { // 1 hora
        this.log('Estado offline muito antigo, ignorando', 'warning');
        localStorage.removeItem('contador_offline_state');
        return false;
      }
      
      // Restaurar estado
      this.cache = {
        contador: estado.contador,
        sha: estado.sha,
        timestamp: estado.timestamp,
        ttl: this.cache.ttl
      };
      
      this.operationQueue = estado.operacoesPendentes || [];
      this.rateLimitInfo = estado.rateLimitInfo || this.rateLimitInfo;
      
      this.log(`Estado offline carregado (${this.operationQueue.length} operações pendentes)`, 'success');
      return true;
      
    } catch (error) {
      this.log(`Erro ao carregar estado offline: ${error.message}`, 'error');
      localStorage.removeItem('contador_offline_state');
      return false;
    }
  }
  
  // Sincronizar operações offline
  async sincronizarOffline() {
    if (!this.isOnline()) {
      this.log('Ainda offline, não é possível sincronizar', 'warning');
      return false;
    }
    
    if (this.operationQueue.length === 0) {
      this.log('Nenhuma operação pendente para sincronizar', 'info');
      return true;
    }
    
    this.log(`Sincronizando ${this.operationQueue.length} operações offline...`, 'info');
    
    try {
      // Processar operações em lote
      const operacoesPendentes = [...this.operationQueue];
      this.operationQueue = [];
      
      // Agrupar incrementos por tipo
      const incrementosPorTipo = {};
      
      for (const op of operacoesPendentes) {
        if (op.type === 'increment') {
          incrementosPorTipo[op.tipo] = (incrementosPorTipo[op.tipo] || 0) + op.quantidade;
        }
      }
      
      // Aplicar incrementos agrupados
      for (const [tipo, quantidade] of Object.entries(incrementosPorTipo)) {
        await this.incrementarContador(quantidade, tipo);
        await this.sleep(500); // Delay entre operações
      }
      
      // Limpar estado offline
      localStorage.removeItem('contador_offline_state');
      
      this.log('Sincronização offline concluída com sucesso', 'success');
      return true;
      
    } catch (error) {
      this.log(`Erro na sincronização offline: ${error.message}`, 'error');
      
      // Restaurar operações na queue
      this.operationQueue = [...operacoesPendentes, ...this.operationQueue];
      this.salvarEstadoOffline();
      
      return false;
    }
  }
  
  // Incrementar contador com suporte offline
  async incrementarContadorOffline(quantidade = 1, tipo = 'geral') {
    // Se online, usar método normal
    if (this.isOnline()) {
      try {
        return await this.incrementarContador(quantidade, tipo);
      } catch (error) {
        this.log('Falha online, mudando para modo offline', 'warning');
        // Continuar para modo offline
      }
    }
    
    // Modo offline
    this.log(`Modo offline: incrementando ${quantidade} (${tipo}) localmente`, 'warning');
    
    // Atualizar cache local
    if (!this.cache.contador) {
      this.cache.contador = this.getContadorPadrao();
    }
    
    this.cache.contador.totalEtiquetas += quantidade;
    if (this.cache.contador.breakdown[tipo] !== undefined) {
      this.cache.contador.breakdown[tipo] += quantidade;
    }
    
    this.cache.contador.ultimaAtualizacao = new Date().toISOString();
    this.cache.timestamp = Date.now();
    
    // Adicionar à queue
    this.addToQueue({ type: 'increment', quantidade, tipo });
    
    // Salvar estado offline
    this.salvarEstadoOffline();
    
    return this.cache.contador;
  }
  
  // Monitorar conexão e sincronizar automaticamente
  iniciarMonitoramentoConexao() {
    // Listener para mudanças de conexão
    window.addEventListener('online', async () => {
      this.log('Conexão restaurada, iniciando sincronização...', 'success');
      await this.sleep(2000); // Aguardar estabilizar
      await this.sincronizarOffline();
    });
    
    window.addEventListener('offline', () => {
      this.log('Conexão perdida, mudando para modo offline', 'warning');
      this.salvarEstadoOffline();
    });
    
    // Verificação periódica
    setInterval(async () => {
      if (this.isOnline() && this.operationQueue.length > 0) {
        await this.sincronizarOffline();
      }
    }, 60000); // A cada minuto
    
    this.log('Monitoramento de conexão iniciado', 'info');
  }
  
  // Obter histórico de operações via commits do GitHub
  async obterHistorico(limite = 50) {
    try {
      this.log(`Obtendo histórico (últimos ${limite} commits)...`);
      
      const url = `${this.commitsUrl}?path=${this.dataPath}&per_page=${limite}`;
      const response = await this.makeAPIRequest(url);
      const commits = await response.json();
      
      const historico = [];
      
      for (const commit of commits) {
        const entrada = this.parseCommitMessage(commit);
        if (entrada) {
          historico.push(entrada);
        }
      }
      
      this.log(`Histórico obtido: ${historico.length} entradas`, 'success');
      return historico;
      
    } catch (error) {
      this.log(`Erro ao obter histórico: ${error.message}`, 'error');
      return [];
    }
  }
  
  // Parse da mensagem de commit para extrair dados
  parseCommitMessage(commit) {
    try {
      const message = commit.commit.message;
      const author = commit.commit.author;
      
      // Verificar se é um commit do contador
      if (!message.includes('feat(contador):')) {
        return null;
      }
      
      // Extrair informações da mensagem
      const incrementoMatch = message.match(/\+(\d+) etiquetas?/);
      const totalMatch = message.match(/Total: (\d+)/);
      const tipoMatch = message.match(/tipo '([^']+)'/);
      const sessaoMatch = message.match(/Sessão: ([a-f0-9-]+)/);
      
      return {
        sha: commit.sha,
        data: new Date(author.date),
        autor: author.name,
        incremento: incrementoMatch ? parseInt(incrementoMatch[1]) : 0,
        total: totalMatch ? parseInt(totalMatch[1]) : null,
        tipo: tipoMatch ? tipoMatch[1] : 'geral',
        sessao: sessaoMatch ? sessaoMatch[1] : null,
        mensagem: message.split('\n')[0], // Primeira linha
        url: commit.html_url
      };
      
    } catch (error) {
      this.log(`Erro ao parsear commit: ${error.message}`, 'error');
      return null;
    }
  }
  
  // Obter estatísticas do histórico
  async obterEstatisticas(dias = 30) {
    try {
      this.log(`Calculando estatísticas dos últimos ${dias} dias...`);
      
      const historico = await this.obterHistorico(200); // Buscar mais commits
      const agora = new Date();
      const dataLimite = new Date(agora.getTime() - (dias * 24 * 60 * 60 * 1000));
      
      // Filtrar por período
      const historicoFiltrado = historico.filter(entrada => 
        entrada.data >= dataLimite
      );
      
      // Calcular estatísticas
      const stats = {
        periodo: `${dias} dias`,
        totalOperacoes: historicoFiltrado.length,
        totalEtiquetas: historicoFiltrado.reduce((sum, e) => sum + e.incremento, 0),
        porTipo: {},
        porDia: {},
        mediadiaria: 0,
        ultimaOperacao: historicoFiltrado[0]?.data || null
      };
      
      // Agrupar por tipo
      for (const entrada of historicoFiltrado) {
        const tipo = entrada.tipo || 'geral';
        stats.porTipo[tipo] = (stats.porTipo[tipo] || 0) + entrada.incremento;
      }
      
      // Agrupar por dia
      for (const entrada of historicoFiltrado) {
        const dia = entrada.data.toISOString().split('T')[0];
        stats.porDia[dia] = (stats.porDia[dia] || 0) + entrada.incremento;
      }
      
      // Calcular média diária
      const diasComOperacoes = Object.keys(stats.porDia).length;
      stats.mediadiaria = diasComOperacoes > 0 ? 
        Math.round(stats.totalEtiquetas / diasComOperacoes) : 0;
      
      this.log(`Estatísticas calculadas: ${stats.totalOperacoes} operações, ${stats.totalEtiquetas} etiquetas`, 'success');
      return stats;
      
    } catch (error) {
      this.log(`Erro ao calcular estatísticas: ${error.message}`, 'error');
      return null;
    }
  }
  
  // Exportar histórico em formato CSV
  exportarHistoricoCSV(historico) {
    const headers = ['Data', 'Incremento', 'Total', 'Tipo', 'Sessão', 'SHA'];
    const rows = historico.map(entrada => [
      entrada.data.toISOString(),
      entrada.incremento,
      entrada.total || '',
      entrada.tipo,
      entrada.sessao || '',
      entrada.sha.substring(0, 8)
    ]);
    
    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
    
    return csv;
  }
  
  // Exportar histórico em formato JSON
  exportarHistoricoJSON(historico) {
    return JSON.stringify(historico, null, 2);
  }
  
  // 🔒 FUNÇÃO ADMINISTRATIVA (use com cuidado!)
  async resetarContador(novoValor, senhaAdmin = null) {
    // PROTEÇÃO: Requer senha administrativa
    const senhaCorreta = 'PAGUE_MENOS_2025'; // Mude esta senha!
    
    if (senhaAdmin !== senhaCorreta) {
      this.log('❌ ACESSO NEGADO: Senha administrativa incorreta', 'error');
      throw new Error('Acesso negado: senha administrativa necessária');
    }
    
    // PROTEÇÃO: Só permite valores maiores que o mínimo
    if (novoValor < 19452) {
      this.log(`❌ RESET BLOQUEADO: Valor ${novoValor} menor que mínimo permitido (19452)`, 'error');
      throw new Error('Valor menor que mínimo permitido');
    }
    
    this.log(`⚠️ RESET ADMINISTRATIVO: Alterando contador para ${novoValor}`, 'warning');
    
    try {
      const contadorAtual = await this.obterContador();
      const novoContador = { ...contadorAtual };
      
      novoContador.totalEtiquetas = novoValor;
      novoContador.ultimaAtualizacao = new Date().toISOString();
      novoContador.metadata.resetAdministrativo = {
        data: new Date().toISOString(),
        valorAnterior: contadorAtual.totalEtiquetas,
        novoValor: novoValor,
        motivo: 'Reset administrativo'
      };
      
      const resultado = await this.commitContador(novoContador, this.cache.sha);
      
      this.log(`✅ RESET CONCLUÍDO: Contador alterado para ${novoValor}`, 'success');
      return resultado;
      
    } catch (error) {
      this.log(`❌ ERRO NO RESET: ${error.message}`, 'error');
      throw error;
    }
  }
}

// Exportar para uso global
window.ContadorGitHubNativo = ContadorGitHubNativo;