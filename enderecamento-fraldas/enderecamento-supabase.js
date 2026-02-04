/* ===== Sistema de Endereçamento com Supabase ===== */
/* Este módulo substitui o enderecamento.js para usar banco de dados */

import { SUPABASE_CONFIG } from '../supabase/config.js';

class SistemaEnderecamentoSupabase {
    constructor() {
        this.client = null;
        this.isConnected = false;

        // Obter CD da sessão ou usar default 2
        const sessao = this.obterDadosSessao();
        this.cd = parseInt(sessao.cd) || 2;

        // Cache local para performance
        this.cacheEnderecos = {};
        this.cacheAlocacoes = {};
        this.cacheCarregado = false;

        // Fallback para localStorage (modo offline)
        this.modoOffline = false;
        this.filaOffline = [];

        console.log('🚀 SistemaEnderecamentoSupabase inicializado');
    }

    /**
     * Formatar data no padrão brasileiro: dd/mm/aaaa hh:mm:ss
     */
    formatarDataBR(date = new Date()) {
        const d = date instanceof Date ? date : new Date(date);
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();
        const hh = String(d.getHours()).padStart(2, '0');
        const mi = String(d.getMinutes()).padStart(2, '0');
        const ss = String(d.getSeconds()).padStart(2, '0');
        return `${dd}/${mm}/${yyyy} ${hh}:${mi}:${ss}`;
    }

    /**
     * Salvar no localStorage com tratamento de erro de quota
     * Retorna true se salvou com sucesso, false caso contrário
     */
    salvarLocalStorageSeguro(chave, valor) {
        try {
            localStorage.setItem(chave, valor);
            return true;
        } catch (e) {
            if (e.name === 'QuotaExceededError' || 
                e.message.includes('exceeded the quota') ||
                e.message.includes('exceeded the storage')) {
                console.warn(`⚠️ Quota do localStorage excedida ao salvar '${chave}'. Tentando limpar cache antigo...`);
                
                // Tentar limpar dados antigos do histórico para liberar espaço
                this.limparCacheAntigo();
                
                // Tentar salvar novamente
                try {
                    localStorage.setItem(chave, valor);
                    console.log(`✅ '${chave}' salvo com sucesso após limpar cache.`);
                    return true;
                } catch (e2) {
                    console.error(`❌ Falha ao salvar '${chave}' mesmo após limpar cache:`, e2);
                    
                    // Se for dados de endereços cadastrados, não bloquear a operação
                    // pois esses dados podem ser recarregados do servidor
                    if (chave === 'enderecos_cadastrados') {
                        console.warn('⚠️ Dados de endereços cadastrados não foram salvos localmente, mas a operação continua.');
                        return false; // Retorna false mas não lança erro
                    }
                    
                    throw e2;
                }
            }
            throw e;
        }
    }

    /**
     * Limpar cache antigo para liberar espaço no localStorage
     */
    limparCacheAntigo() {
        try {
            console.log('🧹 Limpando cache antigo para liberar espaço...');
            
            // Remover itens de histórico mais antigos (manter apenas os 10 mais recentes)
            const historico = JSON.parse(localStorage.getItem('historico_enderecos') || '[]');
            if (historico.length > 10) {
                const historicoRecente = historico.slice(-10);
                localStorage.setItem('historico_enderecos', JSON.stringify(historicoRecente));
                console.log(`🧹 Histórico reduzido de ${historico.length} para ${historicoRecente.length} itens.`);
            }

            // Limpar dados de endereços cadastrados se forem muito grandes
            // (esses podem ser recarregados do servidor)
            const chavesParaRemover = [
                'enderecos_cadastrados_backup',
                'cache_enderecos_antigo',
                'dados_enderecamento_old',
                'historico_operacoes'
            ];
            
            chavesParaRemover.forEach(chave => {
                if (localStorage.getItem(chave)) {
                    localStorage.removeItem(chave);
                    console.log(`🧹 Removida chave antiga: ${chave}`);
                }
            });

            // Se ainda não liberou espaço suficiente, remover endereços cadastrados
            // (eles serão recarregados do Supabase)
            const enderecosCadastrados = localStorage.getItem('enderecos_cadastrados');
            if (enderecosCadastrados && enderecosCadastrados.length > 50000) {
                console.log('🧹 Dados de endereços cadastrados muito grandes, removendo cache local.');
                localStorage.removeItem('enderecos_cadastrados');
            }

        } catch (error) {
            console.error('Erro ao limpar cache antigo:', error);
        }
    }

    /**
     * Formatar validade para exibição
     */
    formatarValidade(validade) {
        if (!validade || validade === '' || validade === null) {
            return 'Não informada';
        }
        
        // Se já está no formato MM/AAAA, converter para MM/AA
        if (validade.includes('/')) {
            const partes = validade.split('/');
            if (partes.length === 2) {
                const mes = partes[0];
                const ano = partes[1];
                // Pegar apenas os 2 últimos dígitos do ano
                const anoCurto = ano.length === 4 ? ano.substring(2) : ano;
                return `${mes}/${anoCurto}`;
            }
            return validade;
        }
        
        // Se está no formato MMAA, converter para MM/AA
        if (validade.length === 4 && /^\d{4}$/.test(validade)) {
            return `${validade.substring(0, 2)}/${validade.substring(2)}`;
        }
        
        // Retornar como está se não conseguir formatar
        return validade;
    }

    /**
     * Obter status da validade (vencida, próxima do vencimento, etc.)
     */
    obterStatusValidade(validade) {
        if (!validade || validade === '' || validade === null) {
            return 'nao-informada';
        }

        try {
            let mes, ano;
            
            // Se está no formato MM/AAAA
            if (validade.includes('/')) {
                const partes = validade.split('/');
                mes = parseInt(partes[0]);
                ano = parseInt(partes[1]);
            }
            // Se está no formato MMAA
            else if (validade.length === 4 && /^\d{4}$/.test(validade)) {
                mes = parseInt(validade.substring(0, 2));
                ano = parseInt('20' + validade.substring(2));
            }
            else {
                return 'nao-informada';
            }

            // Data de vencimento (último dia do mês)
            const dataVencimento = new Date(ano, mes, 0); // mes 0-based, dia 0 = último dia do mês anterior
            const hoje = new Date();
            const proximoMes = new Date();
            proximoMes.setMonth(proximoMes.getMonth() + 1);

            if (dataVencimento < hoje) {
                return 'vencida';
            } else if (dataVencimento < proximoMes) {
                return 'proxima-vencimento';
            } else {
                return 'valida';
            }
        } catch (error) {
            console.warn('Erro ao verificar status da validade:', error);
            return 'nao-informada';
        }
    }

    /**
     * Gerar ID alfanumérico de 6 caracteres (números e letras)
     */
    generateShortId() {
        const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        let result = '';
        for (let i = 0; i < 6; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    /**
     * Inicializar conexão com Supabase
     */
    async inicializar() {
        try {
            console.log('🔄 Conectando ao Supabase...');

            // Usar cliente global se disponível
            if (window.supabaseManager && window.supabaseManager.client) {
                this.client = window.supabaseManager.client;
                this.isConnected = true;
                console.log('✅ Usando cliente Supabase existente');
            } else {
                // Criar novo cliente
                const createClient = window.supabase?.createClient;
                if (!createClient) {
                    throw new Error('Biblioteca Supabase não carregada');
                }

                this.client = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey, {
                    auth: {
                        autoRefreshToken: true,
                        persistSession: true
                    }
                });
                this.isConnected = true;
                console.log('✅ Cliente Supabase criado');
            }

            // Carregar cache inicial
            await this.carregarCache();

            return true;
        } catch (error) {
            console.error('❌ Erro ao conectar:', error);
            this.modoOffline = true;
            this.carregarDadosLocais();
            return false;
        }
    }

    /**
     * Carregar cache de endereços e alocações
     */
    async carregarCache() {
        try {
            console.log('📦 [carregarCache] Iniciando carregamento do cache...');

            // Carregar endereços com paginação para garantir que todos sejam carregados
            let todosEnderecos = [];
            let pagina = 0;
            const tamanhoPagina = 1000; // Carregar 1000 por vez
            let temMaisRegistros = true;

            while (temMaisRegistros) {
                console.log(`📄 [carregarCache] Carregando página ${pagina + 1} (${pagina * tamanhoPagina} - ${(pagina + 1) * tamanhoPagina})...`);

                const { data: enderecosPagina, error: errEnd } = await this.client
                    .from('enderecos_fraldas')
                    .select('*')
                    .eq('cd', this.cd)
                    .eq('ativo', true)
                    .order('endereco')
                    .range(pagina * tamanhoPagina, (pagina + 1) * tamanhoPagina - 1);

                if (errEnd) {
                    // Verificar se é erro de tabela inexistente
                    if (errEnd.code === '42P01') {
                        console.error('❌ Tabela enderecos_fraldas não existe!');
                        if (window.showToast) {
                            window.showToast('Erro Crítico: Tabelas do banco de dados não encontradas.\nPor favor, execute o script SQL de migração.', 'error');
                        }
                    }
                    throw errEnd;
                }

                if (enderecosPagina && enderecosPagina.length > 0) {
                    todosEnderecos = todosEnderecos.concat(enderecosPagina);
                    console.log(`✅ [carregarCache] Página ${pagina + 1}: ${enderecosPagina.length} endereços carregados`);

                    // Se retornou menos que o tamanho da página, não há mais registros
                    if (enderecosPagina.length < tamanhoPagina) {
                        temMaisRegistros = false;
                    } else {
                        pagina++;
                    }
                } else {
                    temMaisRegistros = false;
                }
            }

            console.log(`📊 [carregarCache] Total de endereços carregados: ${todosEnderecos.length}`);

            this.cacheEnderecos = {};
            todosEnderecos.forEach(e => {
                this.cacheEnderecos[e.endereco] = e;
            });

            // Carregar alocações ativas com paginação
            let todasAlocacoes = [];
            pagina = 0;
            temMaisRegistros = true;

            while (temMaisRegistros) {
                console.log(`📄 [carregarCache] Carregando alocações página ${pagina + 1}...`);

                const { data: alocacoesPagina, error: errAloc } = await this.client
                    .from('alocacoes_fraldas')
                    .select('*')
                    .eq('cd', this.cd)
                    .eq('ativo', true)
                    .range(pagina * tamanhoPagina, (pagina + 1) * tamanhoPagina - 1);

                if (errAloc) throw errAloc;

                if (alocacoesPagina && alocacoesPagina.length > 0) {
                    todasAlocacoes = todasAlocacoes.concat(alocacoesPagina);
                    console.log(`✅ [carregarCache] Alocações página ${pagina + 1}: ${alocacoesPagina.length} registros carregados`);

                    if (alocacoesPagina.length < tamanhoPagina) {
                        temMaisRegistros = false;
                    } else {
                        pagina++;
                    }
                } else {
                    temMaisRegistros = false;
                }
            }

            console.log(`📊 [carregarCache] Total de alocações carregadas: ${todasAlocacoes.length}`);

            this.cacheAlocacoes = {};
            todasAlocacoes.forEach(a => {
                if (!this.cacheAlocacoes[a.endereco]) {
                    this.cacheAlocacoes[a.endereco] = [];
                }
                this.cacheAlocacoes[a.endereco].push(a);
            });

            this.cacheCarregado = true;
            console.log(`📦 [Supabase] Cache carregado para CD ${this.cd}: ${Object.keys(this.cacheEnderecos).length} endereços, ${todasAlocacoes.length} alocações`);

            if (Object.keys(this.cacheEnderecos).length === 0) {
                console.warn(`⚠️ [Supabase] Nenhum endereço encontrado para o CD ${this.cd} no banco de dados.`);
            }

        } catch (error) {
            console.error('❌ Erro ao carregar cache:', error);
            if (window.showToast) {
                window.showToast('Erro ao carregar dados do servidor.\nO sistema funcionará em modo OFFLINE.', 'warning');
            }
            throw error;
        }
    }

    /**
     * Carregar dados do localStorage (fallback offline)
     */
    carregarDadosLocais() {
        console.log('📱 Carregando dados locais (modo offline)...');
        this.cacheEnderecos = JSON.parse(localStorage.getItem('enderecos_cadastrados') || '{}');

        // Converter formato legado
        const ocupados = JSON.parse(localStorage.getItem('enderecos_ocupados') || '{}');
        this.cacheAlocacoes = {};
        for (const [endereco, dados] of Object.entries(ocupados)) {
            if (Array.isArray(dados)) {
                this.cacheAlocacoes[endereco] = dados;
            } else {
                this.cacheAlocacoes[endereco] = [dados];
            }
        }

        this.cacheCarregado = true;
    }

    /**
     * Salvar dados no localStorage (backup/offline)
     */
    salvarDadosLocais() {
        // Converter para formato do sistema legado
        const enderecosCadastrados = {};
        for (const [endereco, dados] of Object.entries(this.cacheEnderecos)) {
            enderecosCadastrados[endereco] = {
                endereco: endereco,
                descricao: dados.descricao || 'Endereço de fralda',
                dataCadastro: dados.created_at,
                ativo: dados.ativo
            };
        }
        
        // Salvar com tratamento de erro de quota
        const enderecosJson = JSON.stringify(enderecosCadastrados);
        const alocacoesJson = JSON.stringify(this.cacheAlocacoes);
        
        // Verificar tamanho antes de salvar
        const tamanhoEnderecos = enderecosJson.length * 2; // UTF-16 = 2 bytes por char
        const tamanhoAlocacoes = alocacoesJson.length * 2;
        
        if (tamanhoEnderecos > 2000000) { // > 2MB
            console.warn(`⚠️ Dados de endereços muito grandes (${(tamanhoEnderecos/1024/1024).toFixed(2)}MB). Pulando cache local.`);
        } else {
            this.salvarLocalStorageSeguro('enderecos_cadastrados', enderecosJson);
        }
        
        if (tamanhoAlocacoes > 1000000) { // > 1MB
            console.warn(`⚠️ Dados de alocações muito grandes (${(tamanhoAlocacoes/1024/1024).toFixed(2)}MB). Pulando cache local.`);
        } else {
            this.salvarLocalStorageSeguro('enderecos_ocupados', alocacoesJson);
        }
    }

    /**
     * Obter dados da sessão atual
     */
    obterDadosSessao() {
        try {
            const sessionData = JSON.parse(localStorage.getItem('enderecamento_fraldas_session') || '{}');
            return {
                usuario: sessionData.usuario || 'Sistema',
                matricula: sessionData.matricula || null,
                cd: sessionData.cd || 2,
                nomeCD: sessionData.nomeCD || 'CD02'
            };
        } catch {
            return { usuario: 'Sistema', matricula: null, cd: 2, nomeCD: 'CD02' };
        }
    }

    // =========================================================
    // VALIDAÇÃO
    // =========================================================

    /**
     * Validar formato do endereço
     */
    validarFormatoEndereco(endereco) {
        const regex = /^PF(0[1-9]|1[0-5])\.001\.(0(0[1-9]|1[0-9])|019)\.A0[T123456]$/;
        return regex.test(endereco.toUpperCase());
    }

    /**
     * Gerar endereço formatado
     */
    gerarEndereco(zona, coluna, nivel) {
        const zonaNum = parseInt(zona);
        if (zonaNum < 1 || zonaNum > 15) {
            throw new Error('Zona deve estar entre 01 e 15');
        }

        const colunaNum = parseInt(coluna);
        if (colunaNum < 1 || colunaNum > 19) {
            throw new Error('Coluna deve estar entre 001 e 019');
        }

        const niveisValidos = ['T', '1', '2', '3', '4', '5', '6'];
        if (!niveisValidos.includes(nivel.toString())) {
            throw new Error('Nível deve ser T, 1, 2, 3, 4, 5 ou 6');
        }

        const zonaFormatada = `PF${zona.toString().padStart(2, '0')}`;
        const blocoFixo = '001';
        const colunaFormatada = coluna.toString().padStart(3, '0');
        const nivelFormatado = `A0${nivel}`;

        return `${zonaFormatada}.${blocoFixo}.${colunaFormatada}.${nivelFormatado}`;
    }

    // =========================================================
    // OPERAÇÕES DE ENDEREÇO
    // =========================================================

    /**
     * Alocar produto em endereço
     */
    async alocarProduto(endereco, coddv, descricaoProduto, permitirMultiplos = false, validade = null) {
        const enderecoUpper = endereco.toUpperCase();
        const sessao = this.obterDadosSessao();

        // Garantir cache carregado
        if (!this.cacheCarregado) await this.carregarCache();

        // Validar endereço no cache (ou tentar buscar no banco se não tiver)
        if (!this.cacheEnderecos[enderecoUpper]) {
            // Tentar recarregar uma última vez
            await this.carregarCache();
            if (!this.cacheEnderecos[enderecoUpper]) {
                throw new Error('Endereço não cadastrado no sistema');
            }
        }

        // Recuperar alocações atuais
        const produtosNoEndereco = this.obterProdutosNoEndereco(enderecoUpper);

        // Verificar limite de 2 produtos
        if (produtosNoEndereco.length >= 2) {
            throw new Error(`Endereço ${enderecoUpper} cheio! Capacidade máxima de 2 produtos já atingida.`);
        }

        // Verificar se já existe exatamente este produto no endereço
        if (produtosNoEndereco.some(p => p.coddv === coddv)) {
            throw new Error(`O produto ${coddv} já está alocado neste endereço.`);
        }

        // Verificar se produto já está em algum endereço (se não permitir múltiplos)
        if (!permitirMultiplos) {
            const enderecoAtual = this.obterEnderecoAtualProduto(coddv);
            if (enderecoAtual) {
                // Verificação extra para consistência
                throw new Error(`Produto já alocado no endereço: ${enderecoAtual}`);
            }
        }

        // Preparar parâmetros para RPC
        const params = {
            p_endereco: enderecoUpper,
            p_coddv: coddv,
            p_descricao_produto: descricaoProduto,
            p_usuario: sessao.usuario,
            p_matricula: sessao.matricula,
            p_cd: this.cd
        };

        // Adicionar validade ao objeto de parâmetros
        params.p_validade = validade;

        if (this.isConnected && !this.modoOffline) {
            try {
                // Usar RPC do Supabase
                const { data, error } = await this.client
                    .rpc('alocar_produto_fralda', params);

                if (error) throw error;

                console.log('✅ Produto alocado no banco:', data);

                // Recarregar cache do banco para garantir consistência
                await this.carregarCache();

                // Backup local
                this.salvarDadosLocais();

                return enderecoUpper;

            } catch (error) {
                console.error('❌ Erro ao alocar no banco:', error);
                throw error;
            }
        } else {
            // Modo offline
            console.log('📱 Modo offline: salvando localmente');

            if (!this.cacheAlocacoes[enderecoUpper]) {
                this.cacheAlocacoes[enderecoUpper] = [];
            }

            const dataHoraBR = this.formatarDataBR();
            const alocacao = {
                id: this.generateShortId(), // ID alfanumérico de 6 caracteres
                endereco: enderecoUpper,
                coddv: coddv,
                descricao_produto: descricaoProduto,
                descricaoProduto: descricaoProduto, // compatibilidade
                data_alocacao: dataHoraBR,
                dataAlocacao: dataHoraBR, // compatibilidade
                usuario: sessao.usuario
            };

            if (validade) {
                alocacao.validade = validade;
            }

            this.cacheAlocacoes[enderecoUpper].push(alocacao);

            // Adicionar à fila offline
            this.filaOffline.push({
                acao: 'alocar',
                endereco: enderecoUpper,
                coddv,
                descricaoProduto,
                validade,
                timestamp: new Date().toISOString()
            });

            this.salvarDadosLocais();
            return enderecoUpper;
        }
    }

    /**
     * Adicionar produto em mais um endereço (mesmo que já alocado)
     */
    async adicionarProdutoEmMaisEnderecos(endereco, coddv, descricaoProduto, validade = null) {
        return this.alocarProduto(endereco, coddv, descricaoProduto, true, validade);
    }

    /**
     * Desalocar produto de endereço
     */
    async desalocarProduto(endereco, coddv) {
        const enderecoUpper = endereco.toUpperCase();
        const sessao = this.obterDadosSessao();

        // Garantir cache carregado
        if (!this.cacheCarregado) await this.carregarCache();

        const produtos = this.obterProdutosNoEndereco(enderecoUpper);
        const produto = produtos.find(p => p.coddv === coddv);

        if (!produto) {
            throw new Error('Produto não encontrado neste endereço');
        }

        if (this.isConnected && !this.modoOffline) {
            try {
                const { data, error } = await this.client
                    .rpc('desalocar_produto_fralda', {
                        p_endereco: enderecoUpper,
                        p_coddv: coddv,
                        p_usuario: sessao.usuario,
                        p_matricula: sessao.matricula
                    });

                if (error) throw error;

                console.log('✅ Produto desalocado:', coddv);

                // Recarregar cache do banco para garantir consistência
                await this.carregarCache();

                // Salvar localmente (com tratamento de erro de quota)
                try {
                    this.salvarDadosLocais();
                } catch (saveError) {
                    console.warn('⚠️ Dados não salvos localmente (quota excedida), mas desalocação foi realizada:', saveError.message);
                }
                return produto;

            } catch (error) {
                console.error('❌ Erro ao desalocar:', error);
                throw error;
            }
        } else {
            // Modo offline
            this.cacheAlocacoes[enderecoUpper] = produtos.filter(p => p.coddv !== coddv);
            if (this.cacheAlocacoes[enderecoUpper].length === 0) {
                delete this.cacheAlocacoes[enderecoUpper];
            }

            this.filaOffline.push({
                acao: 'desalocar',
                endereco: enderecoUpper,
                coddv,
                timestamp: new Date().toISOString()
            });

            // Salvar localmente (com tratamento de erro de quota)
            try {
                this.salvarDadosLocais();
            } catch (saveError) {
                console.warn('⚠️ Dados não salvos localmente (quota excedida), mas desalocação foi realizada:', saveError.message);
            }
            return produto;
        }
    }

    /**
     * Transferir produto entre endereços
     */
    async transferirProduto(enderecoOrigem, enderecoDestino, coddv = null) {
        const enderecoOrigemUpper = enderecoOrigem.toUpperCase();
        const enderecoDestinoUpper = enderecoDestino.toUpperCase();
        const sessao = this.obterDadosSessao();

        // Garantir cache carregado
        if (!this.cacheCarregado) await this.carregarCache();

        // Verificar origem
        const produtosOrigem = this.obterProdutosNoEndereco(enderecoOrigemUpper);
        if (produtosOrigem.length === 0) {
            throw new Error('Endereço de origem não possui produtos');
        }

        // Se não especificou coddv, pegar o primeiro
        const produtoCoddv = coddv || produtosOrigem[0].coddv;
        const produto = produtosOrigem.find(p => p.coddv === produtoCoddv);

        if (!produto) {
            throw new Error('Produto não encontrado no endereço de origem');
        }

        // Verificar destino
        if (!this.cacheEnderecos[enderecoDestinoUpper]) {
            throw new Error('Endereço de destino não cadastrado');
        }

        const produtosDestino = this.obterProdutosNoEndereco(enderecoDestinoUpper);
        if (produtosDestino.length >= 2) {
            throw new Error('Endereço de destino já possui 2 produtos');
        }

        if (this.isConnected && !this.modoOffline) {
            try {
                const { data, error } = await this.client
                    .rpc('transferir_produto_fralda', {
                        p_endereco_origem: enderecoOrigemUpper,
                        p_endereco_destino: enderecoDestinoUpper,
                        p_coddv: produtoCoddv,
                        p_usuario: sessao.usuario,
                        p_matricula: sessao.matricula,
                        p_cd: this.cd
                    });

                if (error) throw error;

                console.log('✅ Produto transferido:', data);

                // Atualizar cache
                await this.carregarCache();

                return { origem: enderecoOrigemUpper, destino: enderecoDestinoUpper, produto };

            } catch (error) {
                console.error('❌ Erro na transferência:', error);
                throw error;
            }
        } else {
            // Modo offline - atualizar cache local
            // Remover da origem
            this.cacheAlocacoes[enderecoOrigemUpper] = produtosOrigem.filter(p => p.coddv !== produtoCoddv);
            if (this.cacheAlocacoes[enderecoOrigemUpper].length === 0) {
                delete this.cacheAlocacoes[enderecoOrigemUpper];
            }

            // Adicionar ao destino
            if (!this.cacheAlocacoes[enderecoDestinoUpper]) {
                this.cacheAlocacoes[enderecoDestinoUpper] = [];
            }
            this.cacheAlocacoes[enderecoDestinoUpper].push({
                ...produto,
                endereco: enderecoDestinoUpper,
                data_alocacao: this.formatarDataBR()
            });

            this.filaOffline.push({
                acao: 'transferir',
                enderecoOrigem: enderecoOrigemUpper,
                enderecoDestino: enderecoDestinoUpper,
                coddv: produtoCoddv,
                timestamp: new Date().toISOString()
            });

            this.salvarDadosLocais();
            return { origem: enderecoOrigemUpper, destino: enderecoDestinoUpper, produto };
        }
    }

    // =========================================================
    // CONSULTAS
    // =========================================================

    /**
     * Obter endereço atual de um produto
     */
    obterEnderecoAtualProduto(coddv) {
        if (!this.cacheCarregado) {
            console.warn('⚠️ Tentando consultar sem cache carregado');
        }
        for (const [endereco, produtos] of Object.entries(this.cacheAlocacoes)) {
            const produto = produtos.find(p => p.coddv === coddv);
            if (produto) return endereco;
        }
        return null;
    }

    /**
     * Obter todos os endereços onde um produto está alocado
     */
    obterTodosEnderecosProduto(coddv) {
        const enderecos = [];
        for (const [endereco, produtos] of Object.entries(this.cacheAlocacoes)) {
            if (produtos.some(p => p.coddv === coddv)) {
                enderecos.push(endereco);
            }
        }
        return enderecos;
    }

    /**
     * Obter produtos em um endereço específico
     */
    obterProdutosNoEndereco(endereco) {
        const enderecoUpper = endereco.toUpperCase();
        const produtos = this.cacheAlocacoes[enderecoUpper];

        if (!produtos) return [];
        if (Array.isArray(produtos)) return produtos;
        return [produtos];
    }

    /**
     * Verificar se endereço tem espaço
     */
    enderecoTemEspaco(endereco) {
        const produtos = this.obterProdutosNoEndereco(endereco);
        return produtos.length < 2;
    }

    /**
     * Listar endereços disponíveis (com espaço)
     */
    listarEnderecosDisponiveis() {
        if (!this.cacheCarregado) return [];
        const disponiveis = [];

        for (const [endereco, info] of Object.entries(this.cacheEnderecos)) {
            if (info.ativo !== false) {
                const produtos = this.obterProdutosNoEndereco(endereco);
                if (produtos.length < 2) {
                    disponiveis.push({
                        endereco,
                        descricao: info.descricao || 'Endereço de fralda',
                        dataCadastro: info.created_at,
                        produtosAlocados: produtos.length,
                        espacoDisponivel: 2 - produtos.length,
                        produtos: produtos
                    });
                }
            }
        }

        return disponiveis.sort((a, b) => a.endereco.localeCompare(b.endereco));
    }

    /**
     * Listar endereços ocupados
     */
    listarEnderecosOcupados() {
        if (!this.cacheCarregado) return [];
        const ocupados = [];

        for (const [endereco, produtos] of Object.entries(this.cacheAlocacoes)) {
            produtos.forEach(info => {
                ocupados.push({
                    endereco,
                    coddv: info.coddv,
                    descricaoProduto: info.descricao_produto || info.descricaoProduto,
                    dataAlocacao: info.data_alocacao || info.dataAlocacao,
                    validade: info.validade,
                    usuario: info.usuario
                });
            });
        }

        return ocupados.sort((a, b) => a.endereco.localeCompare(b.endereco));
    }

    /**
     * Buscar endereços ou produtos por filtro
     */
    async buscarEnderecos(filtro) {
        console.log(`🔍 [buscarEnderecos] Iniciando busca com filtro: "${filtro}"`);
        console.log(`📦 [buscarEnderecos] Cache carregado: ${this.cacheCarregado}`);
        console.log(`📊 [buscarEnderecos] Total endereços no cache: ${Object.keys(this.cacheEnderecos).length}`);

        // Se cache não carregado, tentar carregar
        if (!this.cacheCarregado || Object.keys(this.cacheEnderecos).length === 0) {
            console.log(`⚠️ [buscarEnderecos] Cache vazio ou não carregado, tentando carregar...`);
            await this.carregarCache();

            // Se ainda estiver vazio após tentar carregar
            if (Object.keys(this.cacheEnderecos).length === 0) {
                console.log(`❌ [buscarEnderecos] Cache ainda vazio após tentativa de carregamento`);
                return [];
            }
        }

        const filtroOriginal = filtro.trim();
        const filtroUpper = filtroOriginal.toUpperCase();
        const filtroLower = filtroOriginal.toLowerCase();
        const filtroSemPontos = filtroUpper.replace(/\./g, '');
        const resultados = [];

        // Log dos primeiros endereços do cache para debug
        const enderecosCache = Object.keys(this.cacheEnderecos);
        console.log(`🏠 [buscarEnderecos] Primeiros 10 endereços no cache:`, enderecosCache.slice(0, 10));

        // Verificar se há endereços que começam com o filtro
        const enderecosComecamCom = enderecosCache.filter(e => e.startsWith(filtroUpper));
        console.log(`🎯 [buscarEnderecos] Endereços que começam com "${filtroUpper}":`, enderecosComecamCom.length);

        // Log específico para PF11 se for o caso
        if (filtroUpper.includes('PF11') || filtroUpper.includes('11')) {
            const enderecosComPF11 = enderecosCache.filter(e => e.includes('PF11'));
            console.log(`🔍 [buscarEnderecos] Endereços com PF11 no cache:`, enderecosComPF11.slice(0, 10));
        }

        // Buscar em todos os endereços do cache
        for (const [endereco, info] of Object.entries(this.cacheEnderecos)) {
            const produtos = this.obterProdutosNoEndereco(endereco);
            const enderecoUpper = endereco.toUpperCase();
            const enderecoSemPontos = endereco.replace(/\./g, '').toUpperCase();

            // Busca no código do endereço (múltiplas formas) - MELHORADA
            const matchEndereco =
                // Busca exata
                enderecoUpper.includes(filtroUpper) ||
                // Busca começando com
                enderecoUpper.startsWith(filtroUpper) ||
                // Busca case insensitive
                endereco.toLowerCase().includes(filtroLower) ||
                // Busca sem pontos (ex: PF11001001A0T)
                enderecoSemPontos.includes(filtroSemPontos) ||
                // Busca por partes específicas
                enderecoUpper.indexOf(filtroUpper) !== -1 ||
                // Busca flexível (remove espaços e pontos)
                enderecoSemPontos.indexOf(filtroSemPontos) !== -1;

            // Busca na descrição do endereço
            const matchDescricaoEnd = (info.descricao || '').toUpperCase().includes(filtroUpper);

            // Busca nos produtos alocados (CODDV ou Descrição)
            const matchProduto = produtos.some(p =>
                (p.coddv || '').toUpperCase().includes(filtroUpper) ||
                (p.descricao_produto || p.descricaoProduto || '').toUpperCase().includes(filtroUpper)
            );

            // Debug para casos específicos
            if (filtroUpper.includes('PF11') && enderecoUpper.includes('PF11')) {
                console.log(`🔍 [DEBUG] Endereço PF11 encontrado: ${endereco}`);
                console.log(`🔍 [DEBUG] matchEndereco: ${matchEndereco}`);
                console.log(`🔍 [DEBUG] matchDescricaoEnd: ${matchDescricaoEnd}`);
                console.log(`🔍 [DEBUG] matchProduto: ${matchProduto}`);
            }

            if (matchEndereco || matchDescricaoEnd || matchProduto) {
                resultados.push({
                    endereco,
                    descricao: info.descricao,
                    status: produtos.length > 0 ? 'OCUPADO' : 'DISPONÍVEL',
                    produtos: produtos,
                    produtosAlocados: produtos.length
                });
            }
        }

        console.log(`✅ [buscarEnderecos] Encontrados ${resultados.length} resultados para "${filtro}"`);
        console.log(`📋 [buscarEnderecos] Primeiros resultados:`, resultados.slice(0, 5).map(r => r.endereco));

        return resultados.sort((a, b) => a.endereco.localeCompare(b.endereco));
    }

    /**
     * Gerar relatório de ocupação (Híbrido: tenta DB direto, fallback para cache)
     */
    async gerarRelatorioOcupacao(usarCache = true) {
        // Se solicitado ou se cache vazio, tentar buscar direto do banco
        if (!usarCache || !this.cacheCarregado) {
            if (this.isConnected && !this.modoOffline) {
                try {
                    // Contar endereços cadastrados
                    const { count: totalCadastrados, error: errEnd } = await this.client
                        .from('enderecos_fraldas')
                        .select('*', { count: 'exact', head: true })
                        .eq('cd', this.cd)
                        .eq('ativo', true);

                    if (errEnd) throw errEnd;

                    // Contar total de produtos alocados
                    const { count: totalProdutos, error: errAloc } = await this.client
                        .from('alocacoes_fraldas')
                        .select('*', { count: 'exact', head: true })
                        .eq('cd', this.cd)
                        .eq('ativo', true);

                    if (errAloc) throw errAloc;

                    // Contar endereços distintos ocupados (buscar endereços únicos que têm alocações)
                    const { data: enderecosOcupados, error: errOcup } = await this.client
                        .from('alocacoes_fraldas')
                        .select('endereco')
                        .eq('cd', this.cd)
                        .eq('ativo', true);

                    if (errOcup) throw errOcup;

                    // Contar endereços únicos ocupados
                    const enderecosUnicos = new Set(enderecosOcupados.map(a => a.endereco));
                    const totalOcupados = enderecosUnicos.size;

                    // Calcular disponíveis corretamente
                    const totalDisponiveis = Math.max(0, (totalCadastrados || 0) - totalOcupados);

                    // Taxa de ocupação baseada em slots (cada endereço tem 2 slots)
                    const totalSlots = (totalCadastrados || 0) * 2;
                    let pOcupacao = totalSlots > 0 ? ((totalProdutos || 0) / totalSlots * 100) : 0;

                    console.log(`📊 [Banco] Estatísticas CD ${this.cd}: ${totalCadastrados} cadastrados, ${totalOcupados} ocupados, ${totalProdutos} produtos`);

                    return {
                        totalCadastrados: totalCadastrados || 0,
                        totalOcupados: totalOcupados,
                        totalDisponiveis: totalDisponiveis,
                        totalProdutos: totalProdutos || 0,
                        totalSlots,
                        percentualOcupacao: pOcupacao.toFixed(1),
                        origem: 'banco'
                    };

                } catch (e) {
                    console.error('❌ Erro ao buscar stats do banco, usando cache:', e);
                }
            }
        }

        // Lógica original via Cache
        const totalCadastrados = Object.keys(this.cacheEnderecos).length;
        let totalOcupados = 0;
        let totalProdutos = 0;

        for (const produtos of Object.values(this.cacheAlocacoes)) {
            if (produtos.length > 0) {
                totalOcupados++;
                totalProdutos += produtos.length;
            }
        }

        const totalDisponiveis = totalCadastrados - totalOcupados;

        // Taxa de ocupação baseada em slots (cada endereço tem 2 slots)
        const totalSlots = totalCadastrados * 2;
        let pOcupacao = totalSlots > 0 ? (totalProdutos / totalSlots * 100) : 0;

        // Se for muito baixo mas maior que zero, usar 2 casas decimais
        const precisao = (pOcupacao > 0 && pOcupacao < 0.1) ? 2 : 1;

        return {
            totalCadastrados,
            totalOcupados,
            totalDisponiveis,
            totalProdutos,
            totalSlots,
            percentualOcupacao: pOcupacao.toFixed(precisao),
            origem: 'cache'
        };
    }

    /**
     * Obter histórico de operações
     */
    async obterHistorico(limite = 50) {
        if (this.isConnected && !this.modoOffline) {
            try {
                const { data, error } = await this.client
                    .from('historico_enderecamento_fraldas')
                    .select('*')
                    .eq('cd', this.cd)
                    .order('data_hora', { ascending: false })
                    .limit(limite);

                if (error) throw error;
                return data;

            } catch (error) {
                console.error('❌ Erro ao carregar histórico:', error);
                return [];
            }
        } else {
            return JSON.parse(localStorage.getItem('historico_enderecos') || '[]');
        }
    }

    /**
     * Sincronizar fila offline
     */
    async sincronizarFilaOffline() {
        if (!this.isConnected || this.filaOffline.length === 0) return;

        console.log(`🔄 Sincronizando ${this.filaOffline.length} operações offline...`);

        const sessao = this.obterDadosSessao();
        let sucesso = 0;
        let erros = 0;

        for (const operacao of this.filaOffline) {
            try {
                if (operacao.acao === 'alocar') {
                    await this.client.rpc('alocar_produto_fralda', {
                        p_endereco: operacao.endereco,
                        p_coddv: operacao.coddv,
                        p_descricao_produto: operacao.descricaoProduto,
                        p_usuario: sessao.usuario,
                        p_matricula: sessao.matricula,
                        p_cd: this.cd
                    });
                } else if (operacao.acao === 'desalocar') {
                    await this.client.rpc('desalocar_produto_fralda', {
                        p_endereco: operacao.endereco,
                        p_coddv: operacao.coddv,
                        p_usuario: sessao.usuario,
                        p_matricula: sessao.matricula
                    });
                } else if (operacao.acao === 'transferir') {
                    await this.client.rpc('transferir_produto_fralda', {
                        p_endereco_origem: operacao.enderecoOrigem,
                        p_endereco_destino: operacao.enderecoDestino,
                        p_coddv: operacao.coddv,
                        p_usuario: sessao.usuario,
                        p_matricula: sessao.matricula,
                        p_cd: this.cd
                    });
                } else if (operacao.acao === 'cadastrar') {
                    await this.client
                        .from('enderecos_fraldas')
                        .insert([{
                            endereco: operacao.endereco,
                            zona: operacao.zona,
                            bloco: operacao.bloco,
                            coluna: operacao.coluna,
                            nivel: operacao.nivel,
                            descricao: operacao.descricao,
                            cd: this.cd,
                            ativo: true
                        }]);
                }
                sucesso++;
            } catch (error) {
                console.error('❌ Erro ao sincronizar operação:', error);
                erros++;
            }
        }

        this.filaOffline = [];
        localStorage.removeItem('fila_offline_enderecamento');

        // Recarregar cache do servidor
        await this.carregarCache();

        console.log(`✅ Sincronização concluída: ${sucesso} sucesso, ${erros} erros`);

        // Notificar interface que os dados mudaram
        window.dispatchEvent(new CustomEvent('sistemaEnderecamentoPronto', { detail: { conectado: true } }));

        return { sucesso, erros };
    }

    /**
     * Migrar dados do LocalStorage para Supabase
     */
    async migrarDoLocalStorage() {
        console.log('🚀 Iniciando migração de dados locais...');

        // 1. Carregar alocações locais (key antiga: enderecos_ocupados)
        const ocupadosRaw = localStorage.getItem('enderecos_ocupados');
        if (!ocupadosRaw) {
            throw new Error('Não há dados locais para migrar.');
        }

        const ocupados = JSON.parse(ocupadosRaw);
        const totalEnderecosComAlocacao = Object.keys(ocupados).length;
        console.log(`Encontrados ${totalEnderecosComAlocacao} endereços com produtos locais.`);

        // 2. Iterar e inserir
        const sessao = this.obterDadosSessao();
        let sucesso = 0;
        let erros = 0;
        let totalProdutos = 0;

        for (const [endereco, dados] of Object.entries(ocupados)) {
            // Normalizar para array
            const produtos = Array.isArray(dados) ? dados : [dados];

            for (const p of produtos) {
                totalProdutos++;
                try {
                    // Validar se produto tem CODDV
                    if (!p.coddv) continue;

                    // Desalocar primeiro? Não, assumir que banco está vazio neste ponto
                    // Mas usar RPC é mais seguro
                    const { error } = await this.client.rpc('alocar_produto_fralda', {
                        p_endereco: endereco,
                        p_coddv: p.coddv,
                        p_descricao_produto: p.descricaoProduto || p.descricao_produto || 'Produto Migrado',
                        p_usuario: p.usuario || sessao.usuario || 'Migração',
                        p_matricula: sessao.matricula,
                        p_cd: this.cd
                    });

                    if (error) {
                        // Se der erro que já existe (ex: P0001), ignorar ou logar
                        if (error.code !== 'P0001') {
                            console.error(`Erro ao migrar ${p.coddv} em ${endereco}:`, error);
                            erros++;
                        } else {
                            // Já existe, contar como sucesso
                            sucesso++;
                        }
                    } else {
                        sucesso++;
                    }
                } catch (e) {
                    console.error(`Exceção ao migrar ${endereco}:`, e);
                    erros++;
                }
            }
        }

        console.log(`Migração concluída: ${sucesso} alocados, ${erros} erros.`);

        // Recarregar cache
        await this.carregarCache();

        return { sucesso, erros };
    }

    // =========================================================
    // COMPATIBILIDADE COM SISTEMA ANTIGO
    // =========================================================

    // Propriedade para compatibilidade
    get enderecosCadastrados() {
        return this.cacheEnderecos;
    }

    get enderecosOcupados() {
        return this.cacheAlocacoes;
    }

    /**
     * Cadastrar novo endereço no banco de dados
     */
    async cadastrarEndereco(endereco, descricao = '') {
        const enderecoUpper = endereco.toUpperCase();
        const sessao = this.obterDadosSessao();

        if (!this.validarFormatoEndereco(enderecoUpper)) {
            throw new Error('Formato de endereço inválido');
        }

        if (this.cacheEnderecos[enderecoUpper]) {
            throw new Error('Endereço já cadastrado');
        }

        // Extrair partes do endereço para o banco
        const partes = enderecoUpper.split('.');
        const zona = partes[0];
        const bloco = partes[1];
        const coluna = partes[2];
        const nivel = partes[3];

        if (this.isConnected && !this.modoOffline) {
            try {
                const { data, error } = await this.client
                    .from('enderecos_fraldas')
                    .insert([{
                        endereco: enderecoUpper,
                        zona: zona,
                        bloco: bloco,
                        coluna: coluna,
                        nivel: nivel,
                        descricao: descricao || 'Endereço de fralda',
                        cd: this.cd,
                        ativo: true
                    }])
                    .select();

                if (error) throw error;

                console.log('✅ Endereço cadastrado no banco:', data[0]);

                // Registrar no histórico
                await this.client
                    .from('historico_enderecamento_fraldas')
                    .insert([{
                        tipo: 'CADASTRO',
                        endereco: enderecoUpper,
                        descricao_produto: null,
                        observacao: descricao,
                        usuario: sessao.usuario,
                        matricula: sessao.matricula,
                        cd: this.cd,
                        data_hora: new Date().toISOString()
                    }]);

                // Atualizar cache
                this.cacheEnderecos[enderecoUpper] = data[0];
                this.salvarDadosLocais();

                return enderecoUpper;

            } catch (error) {
                console.error('❌ Erro ao cadastrar endereço:', error);
                throw error;
            }
        } else {
            // Modo offline
            const novoEndereco = {
                id: this.generateShortId(),
                endereco: enderecoUpper,
                zona,
                bloco,
                coluna,
                nivel,
                descricao: descricao || 'Endereço de fralda',
                cd: this.cd,
                ativo: true,
                created_at: new Date().toISOString()
            };

            this.cacheEnderecos[enderecoUpper] = novoEndereco;

            this.filaOffline.push({
                acao: 'cadastrar',
                ...novoEndereco,
                timestamp: new Date().toISOString()
            });

            this.salvarDadosLocais();
            return enderecoUpper;
        }
    }

    async instalarEnderecosBase() {
        if (!this.isConnected || this.modoOffline) {
            throw new Error('É necessária uma conexão ativa para a instalação inicial.');
        }

        console.log('🏗️ Iniciando instalação da base de endereços...');
        const batchSize = 100; // Inserir em lotes para não sobrecarregar
        const enderecosParaInserir = [];

        // Gerar todos os 1.710 endereços
        // Zonas: 1 a 15
        for (let z = 1; z <= 15; z++) {
            const zona = 'PF' + z.toString().padStart(2, '0');

            // Colunas: 1 a 19
            for (let c = 1; c <= 19; c++) {
                const coluna = c.toString().padStart(3, '0');

                // Níveis: T, 1, 2, 4, 5, 6
                const niveis = ['A0T', 'A01', 'A02', 'A04', 'A05', 'A06'];

                for (const nivel of niveis) {
                    const endereco = `${zona}.001.${coluna}.${nivel}`;

                    let descNivel;
                    switch (nivel) {
                        case 'A0T': descNivel = 'Térreo'; break;
                        case 'A01': descNivel = '1º Andar'; break;
                        case 'A02': descNivel = '2º Andar'; break;
                        case 'A04': descNivel = '4º Andar'; break;
                        case 'A05': descNivel = '5º Andar'; break;
                        case 'A06': descNivel = '6º Andar'; break;
                    }

                    const descricao = `Endereço Fralda - Zona ${zona} - Coluna ${coluna} - ${descNivel}`;

                    enderecosParaInserir.push({
                        cd: this.cd,
                        endereco: endereco,
                        zona: zona,
                        bloco: '001',
                        coluna: coluna,
                        nivel: nivel,
                        descricao: descricao,
                        ativo: true
                    });
                }
            }
        }

        console.log(`📦 [Supabase] Gerados ${enderecosParaInserir.length} endereços para o CD ${this.cd}`);

        // Inserir em lotes
        let inseridos = 0;
        let erros = 0;

        for (let i = 0; i < enderecosParaInserir.length; i += batchSize) {
            const lote = enderecosParaInserir.slice(i, i + batchSize);

            const { error } = await this.client
                .from('enderecos_fraldas')
                .insert(lote);

            if (error) {
                console.error(`❌ Erro no lote ${i}:`, error);
                erros++;
            } else {
                inseridos += lote.length;
                // Notificar progresso (opcional, via evento customizado se necessário)
                console.log(`✅ Progresso: ${inseridos}/${enderecosParaInserir.length}`);
            }
        }

        // Recarregar cache após inserção
        await this.carregarCache();

        return { total: enderecosParaInserir.length, inseridos, erros };
    }

    /**
     * Forçar recarregamento completo do cache
     */
    async forcarRecarregamentoCompleto() {
        console.log('🔄 [forcarRecarregamentoCompleto] Iniciando recarregamento forçado...');
        this.cacheCarregado = false;
        this.cacheEnderecos = {};
        this.cacheAlocacoes = {};

        await this.carregarCache();

        console.log(`✅ [forcarRecarregamentoCompleto] Recarregamento concluído: ${Object.keys(this.cacheEnderecos).length} endereços`);
        return Object.keys(this.cacheEnderecos).length;
    }

    /**
     * Diagnóstico do cache - verifica se todos os endereços estão carregados
     */
    async diagnosticarCache() {
        console.log('🔍 [diagnosticarCache] Iniciando diagnóstico...');

        // Verificar quantos endereços existem no banco
        const { data: contagem, error } = await this.client
            .from('enderecos_fraldas')
            .select('endereco', { count: 'exact' })
            .eq('cd', this.cd)
            .eq('ativo', true);

        if (error) {
            console.error('❌ Erro ao contar endereços no banco:', error);
            return null;
        }

        const totalNoBanco = contagem.length;
        const totalNoCache = Object.keys(this.cacheEnderecos).length;

        console.log(`📊 [diagnosticarCache] Endereços no banco: ${totalNoBanco}`);
        console.log(`📊 [diagnosticarCache] Endereços no cache: ${totalNoCache}`);

        if (totalNoBanco !== totalNoCache) {
            console.warn(`⚠️ [diagnosticarCache] INCONSISTÊNCIA: Faltam ${totalNoBanco - totalNoCache} endereços no cache!`);

            // Tentar recarregar
            console.log('🔄 [diagnosticarCache] Tentando recarregamento automático...');
            await this.forcarRecarregamentoCompleto();

            const novoTotalNoCache = Object.keys(this.cacheEnderecos).length;
            console.log(`📊 [diagnosticarCache] Após recarregamento: ${novoTotalNoCache} endereços no cache`);
        } else {
            console.log('✅ [diagnosticarCache] Cache está consistente com o banco de dados');
        }

        return {
            totalNoBanco,
            totalNoCache: Object.keys(this.cacheEnderecos).length,
            consistente: totalNoBanco === Object.keys(this.cacheEnderecos).length
        };
    }
    async testarBusca(filtro) {
        console.log(`🧪 [TESTE] Iniciando teste de busca para: "${filtro}"`);

        // Verificar estado do cache
        console.log(`📦 [TESTE] Cache carregado: ${this.cacheCarregado}`);
        console.log(`📊 [TESTE] Total endereços no cache: ${Object.keys(this.cacheEnderecos).length}`);

        // Mostrar alguns endereços do cache
        const enderecosCache = Object.keys(this.cacheEnderecos);
        console.log(`🏠 [TESTE] Primeiros 20 endereços no cache:`, enderecosCache.slice(0, 20));

        // Buscar endereços específicos relacionados ao filtro
        const filtroUpper = filtro.toUpperCase();
        const enderecosRelacionados = enderecosCache.filter(e =>
            e.includes(filtroUpper) ||
            e.startsWith(filtroUpper) ||
            e.replace(/\./g, '').includes(filtroUpper.replace(/\./g, ''))
        );
        console.log(`🎯 [TESTE] Endereços relacionados a "${filtro}" no cache:`, enderecosRelacionados.slice(0, 10));

        // Executar busca
        const resultados = await this.buscarEnderecos(filtro);

        // Mostrar resultados
        console.log(`✅ [TESTE] Resultados da busca:`, resultados.length);
        console.log(`📋 [TESTE] Endereços encontrados:`, resultados.map(r => r.endereco));

        // Verificar se endereços esperados foram encontrados
        const enderecosEncontrados = resultados.map(r => r.endereco);
        const enderecosEsperados = enderecosRelacionados;
        const enderecosNaoEncontrados = enderecosEsperados.filter(e => !enderecosEncontrados.includes(e));

        if (enderecosNaoEncontrados.length > 0) {
            console.warn(`⚠️ [TESTE] Endereços esperados mas não encontrados:`, enderecosNaoEncontrados);
        } else {
            console.log(`✅ [TESTE] Todos os endereços esperados foram encontrados!`);
        }

        return {
            filtro,
            cacheCarregado: this.cacheCarregado,
            totalCache: Object.keys(this.cacheEnderecos).length,
            enderecosRelacionados: enderecosRelacionados.length,
            resultadosEncontrados: resultados.length,
            enderecosNaoEncontrados: enderecosNaoEncontrados.length,
            sucesso: enderecosNaoEncontrados.length === 0
        };
    }

    /**
     * Função para listar todos os endereços que começam com um prefixo
     * Útil para debug: window.sistemaEnderecamento.listarEnderecosPorPrefixo('PF11')
     */
    listarEnderecosPorPrefixo(prefixo) {
        const prefixoUpper = prefixo.toUpperCase();
        const enderecosCache = Object.keys(this.cacheEnderecos);
        const enderecosComPrefixo = enderecosCache.filter(e => e.startsWith(prefixoUpper));

        console.log(`📋 [DEBUG] Endereços que começam com "${prefixo}":`, enderecosComPrefixo.length);
        console.log(`🏠 [DEBUG] Lista:`, enderecosComPrefixo.slice(0, 20));

        return enderecosComPrefixo;
    }
}

// Criar instância global
const sistemaEnderecamentoSupabase = new SistemaEnderecamentoSupabase();

// Manter compatibilidade com código existente
window.sistemaEnderecamento = sistemaEnderecamentoSupabase;
window.sistemaEnderecamentoSupabase = sistemaEnderecamentoSupabase;

// Inicializar automaticamente
sistemaEnderecamentoSupabase.inicializar().then(conectado => {
    if (conectado) {
        console.log('✅ Sistema de Endereçamento Supabase pronto');
    } else {
        console.warn('⚠️ Sistema em modo offline');
    }
    // Notificar que o sistema está pronto (seja online ou offline com cache local)
    window.dispatchEvent(new CustomEvent('sistemaEnderecamentoPronto', { detail: { conectado } }));
});

export default sistemaEnderecamentoSupabase;
export { SistemaEnderecamentoSupabase };