/**
 * Cliente Supabase para Hub de Etiquetas
 * Gerencia conexão, autenticação e operações de dados
 */

import { SUPABASE_CONFIG, ADMIN_CONFIG, APP_CONFIG } from './config.js';
import { conflictResolver } from './conflict-resolver.js';

// Usar versão global (via script tag) que já foi carregada
const createClient = window.supabase?.createClient;

if (!createClient) {
    console.error('❌ Supabase não encontrado! Certifique-se de que o script do Supabase foi carregado antes deste módulo.');
}

class SupabaseManager {
    constructor() {
        this.client = null;
        this.isConnected = false;
        this.isAuthenticated = false;
        this.offlineQueue = [];
        this.syncInProgress = false;
        this.retryCount = 0;
        this.statisticsCache = new Map();
        this.statisticsCacheTtlMs = 60000; // 1 minuto
        this.statisticsPageSize = 1000;
        this.statisticsMaxRows = 10000;

        console.log('🔧 SupabaseManager inicializado');
    }

    /**
     * Inicializar conexão com Supabase
     */
    async initialize() {
        try {
            console.log('🔄 Inicializando conexão com Supabase...');

            // Criar cliente Supabase
            this.client = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey, {
                auth: {
                    autoRefreshToken: true,
                    persistSession: true,
                    detectSessionInUrl: true,
                    // Configurar duração da sessão para 24 horas
                    sessionRefreshMargin: 60, // Renovar 1 minuto antes de expirar
                    sessionRefreshRetryInterval: 10 // Tentar novamente a cada 10 segundos
                }
            });

            // Testar conexão
            const { data, error } = await this.client
                .from('global_counter')
                .select('total_count')
                .limit(1);

            if (error) {
                console.error('❌ Erro ao testar conexão:', error);
                throw error;
            }

            this.isConnected = true;
            console.log('✅ Conexão com Supabase estabelecida');

            // Fluxo admin opcional e desativado por padrão
            if (this.hasAdminCredentialsConfigured()) {
                await this.ensureAdminUserExists();
            } else {
                console.log('ℹ️ Credenciais admin não configuradas no frontend. Pulando bootstrap admin.');
            }

            // Carregar queue offline se existir
            this.loadOfflineQueue();

            // Iniciar sincronização automática
            this.startAutoSync();

            return true;
        } catch (error) {
            console.error('❌ Falha na inicialização do Supabase:', error);
            this.isConnected = false;
            return false;
        }
    }

    /**
     * Verificar se está conectado
     */
    isOnline() {
        return this.isConnected && navigator.onLine;
    }

    /**
     * Limpar cache local de estatísticas (invocar após mutações em labels)
     */
    clearStatisticsCache() {
        this.statisticsCache.clear();
    }

    /**
     * Gerar chave estável de cache para filtros de estatísticas
     */
    buildStatisticsCacheKey(filters = {}) {
        const normalized = {
            startDate: filters.startDate || null,
            endDate: filters.endDate || null,
            applicationType: filters.applicationType || null,
            cd: filters.cd || null,
            maxRows: Number.isFinite(filters.maxRows) ? Number(filters.maxRows) : null
        };
        return JSON.stringify(normalized);
    }

    /**
     * Obter item válido do cache de estatísticas
     */
    getCachedStatistics(cacheKey) {
        const cached = this.statisticsCache.get(cacheKey);
        if (!cached) return null;

        const isValid = (Date.now() - cached.timestamp) < this.statisticsCacheTtlMs;
        if (!isValid) {
            this.statisticsCache.delete(cacheKey);
            return null;
        }

        return cached.value;
    }

    /**
     * Armazenar estatísticas no cache local
     */
    setCachedStatistics(cacheKey, value) {
        this.statisticsCache.set(cacheKey, {
            timestamp: Date.now(),
            value
        });
    }

    /**
     * Obter partes de data/hora no fuso de Brasília
     */
    getBrasiliaDateTimeParts(date = new Date()) {
        const formatter = new Intl.DateTimeFormat('pt-BR', {
            timeZone: 'America/Sao_Paulo',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });

        return formatter.formatToParts(date).reduce((acc, part) => {
            if (part.type !== 'literal') {
                acc[part.type] = part.value;
            }
            return acc;
        }, {});
    }

    /**
     * Formatar data/hora no padrão BR (DD/MM/AAAA HH:MM:SS) no fuso de Brasília
     */
    getBrasiliaDateTimeString(date = new Date()) {
        const parts = this.getBrasiliaDateTimeParts(date);
        return `${parts.day}/${parts.month}/${parts.year} ${parts.hour}:${parts.minute}:${parts.second}`;
    }

    /**
     * Formatar data/hora para persistência SQL (YYYY-MM-DD HH:MM:SS) no fuso de Brasília
     */
    getBrasiliaSqlDateTimeString(date = new Date()) {
        const parts = this.getBrasiliaDateTimeParts(date);
        return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
    }

    /**
     * Extrair total de respostas RPC em formatos diferentes (INTEGER, JSON, JSONB)
     */
    getCounterTotalFromRpcResult(counterResult) {
        if (Number.isFinite(counterResult)) {
            return Number(counterResult);
        }

        if (counterResult && typeof counterResult === 'object') {
            if (Number.isFinite(counterResult.new_total)) {
                return Number(counterResult.new_total);
            }
            if (Number.isFinite(counterResult.total_count)) {
                return Number(counterResult.total_count);
            }
            if (Number.isFinite(counterResult.value)) {
                return Number(counterResult.value);
            }
        }

        return null;
    }

    /**
     * Aplicar dados resolvidos do contador
     */
    async applyResolvedCounterData(resolvedData) {
        try {
            const { data, error } = await this.client
                .rpc('apply_resolved_counter', {
                    p_total_count: resolvedData.total_count,
                    p_application_breakdown: resolvedData.application_breakdown,
                    p_last_updated: resolvedData.last_updated,
                    p_version: resolvedData.version
                });

            if (error) {
                throw new Error(`Erro ao aplicar dados resolvidos: ${error.message}`);
            }

            return data;
        } catch (error) {
            console.error('❌ Erro ao aplicar dados resolvidos do contador:', error);
            throw error;
        }
    }

    /**
     * Salvar geração de etiqueta com resolução de conflitos
     */
    async saveLabelGeneration(data) {
        const generationData = {
            application_type: data.applicationType,
            coddv: data.coddv || null,
            quantity: parseInt(data.quantity) || 0,
            copies: parseInt(data.copies) || 1,
            label_type: data.labelType || null,
            orientation: data.orientation || 'h',
            cd: data.cd || null,
            user_session_id: data.userSessionId || null,
            metadata: data.metadata || {}
        };

        if (this.isOnline()) {
            try {
                console.log('💾 Salvando geração no Supabase:', generationData);

                // Verificar se já existe um registro similar (para detectar conflitos)
                // Desativado por padrão para reduzir egress e evitar GET adicional por gravação.
                // Ative explicitamente com `checkConflicts: true` quando necessário.
                const shouldCheckConflicts = data.checkConflicts === true || data.metadata?.checkConflicts === true;
                const existingRecord = shouldCheckConflicts
                    ? await this.findSimilarLabelRecord(generationData)
                    : null;

                // Tentar inserção direta na tabela labels para garantir que os dados sejam salvos
                // (Bypassing RPC 'register_label_generation' which seems to be failing)
                const { data: insertResult, error: insertError } = await this.client
                    .from('labels')
                    .insert([{
                        application_type: generationData.application_type,
                        coddv: generationData.coddv,
                        quantity: generationData.quantity,
                        copies: generationData.copies,
                        label_type: generationData.label_type,
                        orientation: generationData.orientation,
                        cd: generationData.cd,
                        user_session_id: generationData.user_session_id,
                        metadata: generationData.metadata
                    }])
                    .select('id, application_type, quantity, copies, created_at')
                    .single();

                if (insertError) {
                    console.error('❌ Erro ao inserir na tabela labels (direct insert):', insertError);
                    // Tentar fallback para RPC se insert direto falhar (permissões?)
                    throw insertError;
                }

                console.log('✅ Registro inserido na tabela labels:', insertResult);
                this.clearStatisticsCache();

                // Atualizar o contador global separadamente
                const totalIncrement = generationData.quantity * generationData.copies;
                let newTotal = 0;

                try {
                    const counterResult = await this.updateGlobalCounter(totalIncrement, generationData.application_type);
                    const parsedTotal = this.getCounterTotalFromRpcResult(counterResult);
                    if (Number.isFinite(parsedTotal)) {
                        newTotal = parsedTotal;
                    }
                } catch (cntErr) {
                    console.warn('⚠️ Falha ao atualizar contador global após insert (mas label foi salva):', cntErr);
                }

                const result = {
                    id: insertResult.id,
                    new_total: newTotal,
                    data: insertResult
                };

                // O resultado agora é um JSON: { label_id: "...", new_total: 123 }
                const realTotal = result.new_total;

                // Sincronizar contador global local com o valor real do banco
                if (window.contadorGlobal && Number.isFinite(realTotal)) {
                    const prevValue = window.contadorGlobal.valorAtual;
                    window.contadorGlobal.valorAtual = realTotal;
                    window.contadorGlobal.ultimaAtualizacao = new Date().toISOString();
                    await window.contadorGlobal.salvarEstadoLocal();

                    // Disparar evento para atualizar a UI
                    window.dispatchEvent(new CustomEvent('contador-atualizado', {
                        detail: {
                            valor: window.contadorGlobal.valorAtual,
                            incremento: totalIncrement,
                            tipo: generationData.application_type
                        }
                    }));

                    console.log(`📊 Contador local sincronizado (Valor Real): ${prevValue} -> ${realTotal}`);
                }

                // Se havia um registro similar, verificar conflitos
                if (existingRecord) {
                    const conflictResult = await conflictResolver.detectAndResolveConflicts(
                        generationData,
                        result,
                        'label_generation'
                    );

                    if (conflictResult.hasConflict) {
                        console.log('⚔️ Conflito detectado na geração de etiqueta, aplicando resolução...');

                        // Atualizar com dados resolvidos
                        await this.updateLabelRecord(result.id, conflictResult.resolvedData);

                        console.log('✅ Conflito de geração resolvido automaticamente');
                        return conflictResult.resolvedData;
                    }
                }

                console.log('✅ Geração salva com sucesso:', result);
                return result;
            } catch (error) {
                console.warn('⚠️ Falha ao salvar online (direct insert), adicionando à queue:', error);
                this.addToOfflineQueue('saveLabelGeneration', generationData);
                throw error;
            }
        } else {
            console.log('📱 Offline: adicionando geração à queue');
            this.addToOfflineQueue('saveLabelGeneration', generationData);
            return null;
        }
    }

    /**
     * Salvar registro da aplicação Termo
     */
    async saveTermoLabel(data) {
        // A tabela termo usa TIMESTAMP WITH TIME ZONE, então persistimos em formato SQL
        const dataHoraBrasil = this.getBrasiliaSqlDateTimeString();

        const termoData = {
            id_et: data.id_et,
            cd: data.cd,
            pedido: data.pedido,
            filial: parseInt(data.filial, 10),
            seq: parseInt(data.seq, 10),
            num_rota: parseInt(data.num_rota, 10),
            nom_rota: data.nom_rota,
            qtd_vol: data.qtd_vol,
            mat: data.mat,
            nome: data.nome,
            data_hora: dataHoraBrasil // Data Formatada
        };

        if (this.isOnline()) {
            try {
                console.log('💾 Salvando registro Termo no Supabase:', termoData);

                const { data: result, error } = await this.client
                    .from('termo')
                    .insert([termoData])
                    .select();

                if (error) {
                    console.error('❌ Erro ao salvar registro Termo:', error);
                    throw error;
                }

                // Também registrar na tabela genérica labels para o contador global e estatísticas
                try {
                    await this.saveLabelGeneration({
                        applicationType: 'termo',
                        coddv: data.pedido || data.id_et.substring(0, 20), // Usar pedido (curto) ou ID truncado
                        quantity: data.qtd_vol,
                        copies: 1,
                        cd: data.cd,
                        metadata: { source: 'termo_table_sync' }
                    });
                } catch (counterError) {
                    console.warn('⚠️ Falha ao atualizar contador global, mas registro Termo foi salvo:', counterError);
                }

                console.log('✅ Registro Termo salvo com sucesso:', result);
                return result[0];
            } catch (error) {
                console.warn('⚠️ Falha ao salvar Termo online, adicionando à queue:', error);
                this.addToOfflineQueue('saveTermoLabel', termoData);
                throw error;
            }
        } else {
            console.log('📱 Offline: adicionando registro Termo à queue');

            // Incremento local removido daqui pois agora é tratado na camada da aplicação (Optimistic UI)
            // para evitar contagem duplicada e garantir feedback mais rápido

            // if (window.contadorGlobal) {
            //     const totalGeral = termoData.qtd_vol;
            //     window.contadorGlobal.valorAtual += totalGeral;
            //     window.contadorGlobal.salvarEstadoLocal();
            //     window.dispatchEvent(new CustomEvent('contador-atualizado', {
            //         detail: { valor: window.contadorGlobal.valorAtual, incremento: totalGeral, tipo: 'termo' }
            //     }));
            // }

            this.addToOfflineQueue('saveTermoLabel', termoData);
            return null;
        }
    }

    /**
     * Salvar registro da aplicação Etiqueta Entrada (Mercadoria)
     */
    async saveEtiquetaEntrada(data) {
        // Data/hora sempre no fuso de Brasília
        const dataHoraBrasil = this.getBrasiliaDateTimeString();

        const entryData = {
            cd: data.cd,
            codv: data.codv,
            ean: data.ean,
            descricao: data.descricao,
            destino_tipo: data.destino_tipo,
            endereco_tipo: data.endereco_tipo,
            endereco: data.endereco,
            quantidade: parseInt(data.quantidade, 10),
            validade: data.validade,
            zona: !!data.zona,
            matricula: data.matricula,
            nome_usuario: data.nome_usuario,
            maquina: data.maquina,
            data_hora: dataHoraBrasil
        };

        if (this.isOnline()) {
            try {
                console.log('💾 Salvando Etiqueta Entrada no Supabase:', entryData);

                const { data: result, error } = await this.client
                    .from('etiqueta_entrada')
                    .insert([entryData])
                    .select();

                if (error) {
                    console.error('❌ Erro ao salvar Etiqueta Entrada:', error);
                    throw error;
                }

                // Também registrar na tabela genérica labels para o contador global
                try {
                    await this.saveLabelGeneration({
                        applicationType: 'etiqueta-mercadoria',
                        coddv: data.codv,
                        quantity: entryData.quantidade,
                        copies: 1,
                        cd: data.cd,
                        metadata: { source: 'etiqueta_entrada_sync' }
                    });
                } catch (counterError) {
                    console.warn('⚠️ Falha ao atualizar contador global, mas registro de Entrada foi salvo:', counterError);
                }

                console.log('✅ Etiqueta Entrada salva com sucesso:', result);
                return result[0];
            } catch (error) {
                console.warn('⚠️ Falha ao salvar Etiqueta Entrada online, adicionando à queue:', error);
                this.addToOfflineQueue('saveEtiquetaEntrada', entryData);
                throw error;
            }
        } else {
            console.log('📱 Offline: adicionando Etiqueta Entrada à queue');

            // Incrementar localmente mesmo offline
            if (window.contadorGlobal) {
                window.contadorGlobal.valorAtual += entryData.quantidade;
                window.contadorGlobal.salvarEstadoLocal();
                window.dispatchEvent(new CustomEvent('contador-atualizado', {
                    detail: { valor: window.contadorGlobal.valorAtual, incremento: entryData.quantidade, tipo: 'etiqueta-mercadoria' }
                }));
            }

            this.addToOfflineQueue('saveEtiquetaEntrada', entryData);
            return null;
        }
    }

    /**
     * Salvar registro da aplicação Caixa
     */
    async saveCaixaLabel(data) {
        // Data/hora sempre no fuso de Brasília
        const dataHoraBrasil = this.getBrasiliaDateTimeString();

        const caixaData = {
            num_inicial: data.num_inicial,
            num_final: data.num_final,
            qtd: parseInt(data.qtd, 10),
            copia: parseInt(data.copia, 10),
            total_et: parseInt(data.total_et, 10),
            tipo: data.tipo,
            data_hora: dataHoraBrasil
        };

        if (this.isOnline()) {
            try {
                console.log('💾 Salvando registro Caixa no Supabase:', caixaData);

                const { data: result, error } = await this.client
                    .from('caixa')
                    .insert([caixaData])
                    .select();

                if (error) {
                    console.error('❌ Erro ao salvar registro Caixa:', error);
                    throw error;
                }

                // Também registrar na tabela genérica labels para o contador global
                try {
                    await this.saveLabelGeneration({
                        applicationType: 'caixa',
                        coddv: data.num_inicial,
                        quantity: caixaData.total_et,
                        copies: 1,
                        metadata: { source: 'caixa_module_sync' }
                    });
                } catch (counterError) {
                    console.warn('⚠️ Falha ao atualizar contador global, mas registro Caixa foi salvo:', counterError);
                }

                console.log('✅ Registro Caixa salvo com sucesso:', result);
                return result[0];
            } catch (error) {
                console.warn('⚠️ Falha ao salvar Caixa online, adicionando à queue:', error);
                this.addToOfflineQueue('saveCaixaLabel', caixaData);
                throw error;
            }
        } else {
            console.log('📱 Offline: adicionando registro Caixa à queue');

            // Incrementar localmente mesmo offline
            if (window.contadorGlobal) {
                window.contadorGlobal.valorAtual += caixaData.total_et;
                window.contadorGlobal.salvarEstadoLocal();
                window.dispatchEvent(new CustomEvent('contador-atualizado', {
                    detail: { valor: window.contadorGlobal.valorAtual, incremento: caixaData.total_et, tipo: 'caixa' }
                }));
            }

            this.addToOfflineQueue('saveCaixaLabel', caixaData);
            return null;
        }
    }

    /**
     * Salvar registro da aplicação Avulso
     */
    async saveAvulsoLabel(data) {
        // Data/hora sempre no fuso de Brasília
        const dataHoraBrasil = this.getBrasiliaDateTimeString();

        const avulsoData = {
            id_mov: data.id_mov,
            cd: data.cd,
            tipo_mov: data.tipo_mov,
            nun_vol: data.nun_vol,
            qtd_cx: parseInt(data.qtd_cx, 10),
            mat: data.mat,
            nome: data.nome,
            data_hora: dataHoraBrasil
        };

        if (this.isOnline()) {
            try {
                console.log('💾 Salvando registro Avulso no Supabase:', avulsoData);

                const { data: result, error } = await this.client
                    .from('avulso')
                    .insert([avulsoData])
                    .select();

                if (error) {
                    console.error('❌ Erro ao salvar registro Avulso:', error);
                    throw error;
                }

                // Também registrar na tabela genérica labels para o contador global
                try {
                    await this.saveLabelGeneration({
                        applicationType: 'avulso',
                        coddv: data.id_mov,
                        quantity: avulsoData.qtd_cx,
                        copies: 1,
                        cd: data.cd,
                        metadata: { source: 'avulso_module_sync' }
                    });
                } catch (counterError) {
                    console.warn('⚠️ Falha ao atualizar contador global, mas registro Avulso foi salvo:', counterError);
                }

                console.log('✅ Registro Avulso salvo com sucesso:', result);
                return result[0];
            } catch (error) {
                console.warn('⚠️ Falha ao salvar Avulso online, adicionando à queue:', error);
                this.addToOfflineQueue('saveAvulsoLabel', avulsoData);
                throw error;
            }
        } else {
            console.log('📱 Offline: adicionando registro Avulso à queue');

            // Incrementar localmente mesmo offline
            if (window.contadorGlobal) {
                window.contadorGlobal.valorAtual += avulsoData.qtd_cx;
                window.contadorGlobal.salvarEstadoLocal();
                window.dispatchEvent(new CustomEvent('contador-atualizado', {
                    detail: { valor: window.contadorGlobal.valorAtual, incremento: avulsoData.qtd_cx, tipo: 'avulso' }
                }));
            }

            this.addToOfflineQueue('saveAvulsoLabel', avulsoData);
            return null;
        }
    }

    /**
     * Salvar registro da aplicação Enderec
     */
    async saveEnderecLabel(data) {
        if (this.isOnline()) {
            try {
                const dataHora = this.getBrasiliaDateTimeString();

                const enderecData = {
                    tipo: data.tipo,
                    modelo: data.modelo,
                    id_etiqueta: data.id_etiqueta,
                    num_copia: parseInt(data.num_copia, 10),
                    data_hora: data.data_hora || dataHora
                };

                console.log('📝 Salvando registro Enderec:', enderecData);

                const { data: result, error } = await this.client
                    .from('enderec')
                    .insert([enderecData])
                    .select();

                if (error) {
                    console.error('❌ Erro ao salvar registro Enderec:', error);
                    throw error;
                }

                // Também registrar na tabela genérica labels para o contador global
                try {
                    await this.saveLabelGeneration({
                        applicationType: 'enderec',
                        coddv: data.id_etiqueta,
                        quantity: 1,
                        copies: data.num_copia,
                        cd: null,
                        metadata: { source: 'enderec_module_sync' }
                    });
                } catch (counterError) {
                    console.warn('⚠️ Falha ao atualizar contador global, mas registro Enderec foi salvo:', counterError);
                }

                console.log('✅ Registro Enderec salvo com sucesso:', result);
                return result;
            } catch (error) {
                console.warn('⚠️ Falha ao salvar Enderec online, adicionando à queue:', error);
                this.addToOfflineQueue('saveEnderecLabel', enderecData);
                throw error;
            }
        } else {
            console.log('📱 Offline: adicionando registro Enderec à queue');

            // Atualizar contador local se disponível
            if (window.contadorGlobal) {
                window.contadorGlobal.incrementarContador(data.num_copia, 'enderec');
                window.contadorGlobal.salvarEstadoLocal();
                window.dispatchEvent(new CustomEvent('contador-atualizado', {
                    detail: { valor: window.contadorGlobal.valorAtual, incremento: data.num_copia, tipo: 'enderec' }
                }));
            }

            this.addToOfflineQueue('saveEnderecLabel', data);
            return null;
        }
    }

    /**
     * Atualizar contador global com resolução de conflitos
     */
    async updateGlobalCounter(increment, type, options = {}) {
        if (this.isOnline()) {
            try {
                console.log(`📈 Atualizando contador: +${increment} ${type}`);
                const shouldCheckConflicts = options?.checkConflicts === true;
                let currentCounter = null;
                if (shouldCheckConflicts) {
                    currentCounter = await this.getCounterStats();
                }

                const { data, error } = await this.client
                    .rpc('update_global_counter', {
                        increment_amount: increment,
                        app_type: type
                    });

                if (error) {
                    console.error('❌ Erro ao atualizar contador:', error);
                    throw error;
                }

                if (shouldCheckConflicts && currentCounter) {
                    // Verificar se houve conflito durante a atualização
                    const updatedCounter = await this.getCounterStats();

                    // Detectar e resolver conflitos se necessário
                    const conflictResult = await conflictResolver.detectAndResolveConflicts(
                        currentCounter,
                        updatedCounter,
                        'global_counter'
                    );

                    if (conflictResult.hasConflict) {
                        console.log('⚔️ Conflito detectado no contador global, aplicando resolução...');

                        // Aplicar dados resolvidos
                        await this.applyResolvedCounterData(conflictResult.resolvedData);

                        console.log('✅ Conflito de contador resolvido automaticamente');
                    }
                }

                console.log('✅ Contador atualizado:', data);
                return data;
            } catch (error) {
                console.warn('⚠️ Falha ao atualizar contador online, adicionando à queue:', error);
                this.addToOfflineQueue('updateGlobalCounter', { increment, type });
                throw error;
            }
        } else {
            console.log('📱 Offline: adicionando atualização de contador à queue');
            this.addToOfflineQueue('updateGlobalCounter', { increment, type });
            return null;
        }
    }

    /**
     * Obter estatísticas do contador
     */
    async getCounterStats() {
        try {
            const { data, error } = await this.client
                .rpc('get_counter_stats');

            if (error) {
                console.error('❌ Erro ao obter estatísticas:', error);
                throw error;
            }

            const row = Array.isArray(data) ? data[0] : data;
            if (!row) {
                return {
                    total_count: 0,
                    application_breakdown: {},
                    last_updated: new Date(),
                    version: 1,
                    isFallback: false
                };
            }

            return {
                ...row,
                total_count: Number.isFinite(Number(row.total_count)) ? Number(row.total_count) : 0,
                application_breakdown: row.application_breakdown || {},
                version: Number.isFinite(Number(row.version)) ? Number(row.version) : 1,
                isFallback: false
            };
        } catch (error) {
            console.error('❌ Falha ao obter estatísticas:', error);
            return {
                total_count: 0,
                application_breakdown: {},
                last_updated: new Date(),
                version: 1,
                isFallback: true
            };
        }
    }

    /**
     * Estatísticas avançadas desativadas para reduzir egress.
     * Mantém somente retorno leve baseado no contador global.
     */
    async getStatistics(_filters = {}) {
        try {
            console.warn('⚠️ getStatistics avançado está desativado para reduzir egress.');
            const counter = await this.getCounterStats();
            return {
                totalLabels: Number(counter?.total_count || 0),
                applicationBreakdown: counter?.application_breakdown || {},
                timeSeriesData: [],
                disabled: true,
                reason: 'advanced_statistics_disabled_to_reduce_egress'
            };
        } catch (error) {
            console.error('❌ Falha ao obter estatísticas leves:', error);
            return {
                totalLabels: 0,
                applicationBreakdown: {},
                timeSeriesData: [],
                disabled: true,
                reason: 'advanced_statistics_disabled_to_reduce_egress'
            };
        }
    }

    /**
     * Processar dados estatísticos
     */
    processStatistics(data) {
        const stats = {
            totalLabels: 0,
            applicationBreakdown: {},
            timeSeriesData: [],
            peakUsageTimes: [],
            errorRates: [],
            generationTrends: []
        };

        data.forEach(record => {
            const quantity = parseInt(record.quantity) || 0;
            const copies = parseInt(record.copies) || 1;
            const totalLabels = quantity * copies;
            stats.totalLabels += totalLabels;

            // Breakdown por aplicação
            if (!stats.applicationBreakdown[record.application_type]) {
                stats.applicationBreakdown[record.application_type] = 0;
            }
            stats.applicationBreakdown[record.application_type] += totalLabels;

            // Dados de série temporal (agrupados por dia local)
            // Usar 'en-CA' para obter formato YYYY-MM-DD respeitando o fuso local do navegador
            const date = new Date(record.created_at).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
            const existingPoint = stats.timeSeriesData.find(point => point.date === date);

            if (existingPoint) {
                existingPoint.count += totalLabels;
            } else {
                stats.timeSeriesData.push({ date, count: totalLabels });
            }
        });

        return stats;
    }

    hasAdminCredentialsConfigured() {
        const email = String(ADMIN_CONFIG.email || '').trim();
        const password = String(ADMIN_CONFIG.password || '');
        return Boolean(email && password);
    }

    /**
     * Autenticação administrativa
     */
    async authenticateAdmin(email, password) {
        try {
            console.log('🔐 Tentando autenticação admin...');

            if (!this.hasAdminCredentialsConfigured()) {
                throw new Error('Autenticação admin desabilitada nesta instalação');
            }

            // Verificar se as credenciais correspondem ao admin configurado
            if (email !== ADMIN_CONFIG.email || password !== ADMIN_CONFIG.password) {
                throw new Error('Credenciais inválidas');
            }

            const { data, error } = await this.client.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (error) {
                console.error('❌ Erro na autenticação:', error);
                throw error;
            }

            this.isAuthenticated = true;

            // Configurar expiração da sessão para 24 horas
            const sessionExpiry = new Date();
            sessionExpiry.setTime(sessionExpiry.getTime() + ADMIN_CONFIG.sessionDuration);

            // Salvar informações da sessão
            localStorage.setItem('admin_session_expiry', sessionExpiry.toISOString());
            localStorage.setItem('admin_authenticated', 'true');

            console.log('✅ Autenticação admin bem-sucedida');
            console.log(`⏰ Sessão expira em: ${sessionExpiry.toLocaleString()}`);

            return {
                success: true,
                user: data.user,
                session: data.session,
                expiresAt: sessionExpiry
            };
        } catch (error) {
            console.error('❌ Falha na autenticação admin:', error);
            this.isAuthenticated = false;

            // Limpar dados de sessão em caso de erro
            localStorage.removeItem('admin_session_expiry');
            localStorage.removeItem('admin_authenticated');

            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Logout administrativo
     */
    async logout() {
        try {
            const { error } = await this.client.auth.signOut();

            if (error) {
                console.error('❌ Erro no logout:', error);
                throw error;
            }

            this.isAuthenticated = false;

            // Limpar dados de sessão local
            localStorage.removeItem('admin_session_expiry');
            localStorage.removeItem('admin_authenticated');

            console.log('✅ Logout realizado com sucesso');
            return true;
        } catch (error) {
            console.error('❌ Falha no logout:', error);
            return false;
        }
    }

    /**
     * Verificar sessão atual
     */
    async getCurrentSession() {
        try {
            // Primeiro verificar se a sessão local ainda é válida
            const sessionExpiry = localStorage.getItem('admin_session_expiry');
            const isAuthenticated = localStorage.getItem('admin_authenticated');

            // Se não tiver marcadores locais, não estamos autenticados
            if (!sessionExpiry || isAuthenticated !== 'true') {
                // Limpar qualquer resquício
                localStorage.removeItem('admin_session_expiry');
                localStorage.removeItem('admin_authenticated');
                return null;
            }

            // Verificar validade temporal
            const expiryDate = new Date(sessionExpiry);
            const now = new Date();

            if (now > expiryDate) {
                console.log('⏰ Sessão local expirada, fazendo logout...');
                await this.logout();
                return null;
            }

            // Tentar obter sessão real do Supabase
            const { data, error } = await this.client.auth.getSession();
            const session = data?.session;

            if (error) {
                console.warn('⚠️ Erro ao verificar sessão do Supabase:', error);
                // Não retornar null aqui se tivermos credenciais locais válidas!
                // Isso permite modo offline/resiliência
            }

            // Se temos sessão do Supabase, ótimo
            if (session) {
                this.isAuthenticated = true;
                console.log('✅ Sessão Supabase válida encontrada');
                return session;
            }

            // Se não temos sessão Supabase mas temos autenticação local válida,
            // retornamos uma sessão sintética para não bloquear o acesso (dashboard offline)
            console.warn('⚠️ Sessão Supabase ausente, mas autenticação local válida. Usando sessão sintética.');
            this.isAuthenticated = true;

            return {
                user: {
                    email: ADMIN_CONFIG.email || 'admin@local',
                    role: 'admin',
                    aud: 'authenticated'
                },
                expires_at: Math.floor(expiryDate.getTime() / 1000),
                access_token: 'synthetic-access-token-from-local-auth'
            };

        } catch (error) {
            console.error('❌ Falha ao verificar sessão:', error);
            // Em caso de erro catastrófico, se tivermos local storage, tentamos manter logado
            const isAuthenticated = localStorage.getItem('admin_authenticated');
            if (isAuthenticated === 'true') {
                return { user: { role: 'admin' } }; // Fallback extremo
            }
            this.isAuthenticated = false;
            return null;
        }
    }

    /**
     * Criar usuário admin se não existir
     */
    async ensureAdminUserExists() {
        if (!this.hasAdminCredentialsConfigured()) {
            return { exists: false, created: false, skipped: true };
        }

        try {
            console.log('👤 Verificando se usuário admin existe...');

            // Tentar fazer login para verificar se o usuário existe
            const { data, error } = await this.client.auth.signInWithPassword({
                email: ADMIN_CONFIG.email,
                password: ADMIN_CONFIG.password
            });

            if (data.user) {
                console.log('✅ Usuário admin já existe');
                // Fazer logout imediatamente após verificação
                await this.client.auth.signOut();
                return { exists: true, created: false };
            }

            if (error && error.message.includes('Invalid login credentials')) {
                console.log('👤 Usuário admin não existe, tentando criar...');

                // Tentar criar o usuário admin
                const { data: signUpData, error: signUpError } = await this.client.auth.signUp({
                    email: ADMIN_CONFIG.email,
                    password: ADMIN_CONFIG.password,
                    options: {
                        data: {
                            role: 'admin',
                            created_by: 'system'
                        }
                    }
                });

                if (signUpError) {
                    console.error('❌ Erro ao criar usuário admin:', signUpError);
                    return { exists: false, created: false, error: signUpError.message };
                }

                console.log('✅ Usuário admin criado com sucesso');

                // Fazer logout após criação
                await this.client.auth.signOut();

                return { exists: true, created: true, user: signUpData.user };
            }

            throw error;
        } catch (error) {
            console.error('❌ Erro ao verificar/criar usuário admin:', error);
            return { exists: false, created: false, error: error.message };
        }
    }

    /**
     * Validar credenciais admin
     */
    validateAdminCredentials(email, password) {
        if (!this.hasAdminCredentialsConfigured()) {
            return false;
        }
        return email === ADMIN_CONFIG.email && password === ADMIN_CONFIG.password;
    }

    /**
     * Verificar se sessão está expirada
     */
    isSessionExpired() {
        const sessionExpiry = localStorage.getItem('admin_session_expiry');
        if (!sessionExpiry) return true;

        const expiryDate = new Date(sessionExpiry);
        const now = new Date();

        return now > expiryDate;
    }

    /**
     * Adicionar operação à queue offline
     */
    addToOfflineQueue(operation, data) {
        const queueItem = {
            id: Date.now() + Math.random(),
            operation,
            data,
            timestamp: new Date().toISOString(),
            retries: 0
        };

        this.offlineQueue.push(queueItem);
        this.saveOfflineQueue();

        console.log(`📝 Operação adicionada à queue offline: ${operation}`, queueItem);
    }

    /**
     * Salvar queue offline no localStorage
     */
    saveOfflineQueue() {
        try {
            localStorage.setItem(APP_CONFIG.offlineQueueKey, JSON.stringify(this.offlineQueue));
        } catch (error) {
            console.error('❌ Erro ao salvar queue offline:', error);
        }
    }

    /**
     * Carregar queue offline do localStorage
     */
    loadOfflineQueue() {
        try {
            const saved = localStorage.getItem(APP_CONFIG.offlineQueueKey);
            if (saved) {
                this.offlineQueue = JSON.parse(saved);
                console.log(`📂 Queue offline carregada: ${this.offlineQueue.length} operações`);
            }
        } catch (error) {
            console.error('❌ Erro ao carregar queue offline:', error);
            this.offlineQueue = [];
        }
    }

    /**
     * Encontrar registro similar de etiqueta
     */
    async findSimilarLabelRecord(generationData) {
        try {
            let query = this.client
                .from('labels')
                .select('id, application_type, coddv, quantity, copies, created_at')
                .eq('application_type', generationData.application_type)
                .eq('quantity', generationData.quantity)
                .gte('created_at', new Date(Date.now() - 60000).toISOString()) // Últimos 1 minuto
                .order('created_at', { ascending: false })
                .limit(1);

            if (generationData.coddv === null || generationData.coddv === undefined) {
                query = query.is('coddv', null);
            } else {
                query = query.eq('coddv', generationData.coddv);
            }

            const { data, error } = await query;

            if (error) {
                console.warn('⚠️ Erro ao buscar registro similar:', error);
                return null;
            }

            return data && data.length > 0 ? data[0] : null;
        } catch (error) {
            console.warn('⚠️ Erro ao buscar registro similar:', error);
            return null;
        }
    }

    /**
     * Atualizar registro de etiqueta
     */
    async updateLabelRecord(recordId, updatedData) {
        try {
            const { data, error } = await this.client
                .from('labels')
                .update(updatedData)
                .eq('id', recordId)
                .select('id, application_type, quantity, copies, created_at')
                .single();

            if (error) {
                throw new Error(`Erro ao atualizar registro: ${error.message}`);
            }

            this.clearStatisticsCache();
            return data;
        } catch (error) {
            console.error('❌ Erro ao atualizar registro de etiqueta:', error);
            throw error;
        }
    }

    /**
     * Sincronizar operações offline com resolução de conflitos
     */
    async syncOfflineQueue() {
        if (this.syncInProgress || !this.isOnline() || this.offlineQueue.length === 0) {
            return { success: true, processed: 0, errors: [], conflicts: 0 };
        }

        this.syncInProgress = true;
        console.log(`🔄 Iniciando sincronização com resolução de conflitos: ${this.offlineQueue.length} operações`);

        const results = {
            success: true,
            processed: 0,
            errors: [],
            conflicts: 0,
            resolutions: []
        };

        const queueCopy = [...this.offlineQueue];

        for (const item of queueCopy) {
            try {
                let success = false;
                let conflictResolved = false;

                switch (item.operation) {
                    case 'saveLabelGeneration':
                        const saveResult = await this.saveLabelGenerationWithConflictHandling(item.data);
                        success = true;
                        conflictResolved = saveResult.conflictResolved || false;
                        break;

                    case 'updateGlobalCounter':
                        const updateResult = await this.updateGlobalCounterWithConflictHandling(item.data.increment, item.data.type);
                        success = true;
                        conflictResolved = updateResult.conflictResolved || false;
                        break;

                    case 'saveTermoLabel':
                        await this.saveTermoLabel(item.data);
                        success = true;
                        break;

                    case 'saveEnderecLabel':
                        await this.saveEnderecLabel(item.data);
                        success = true;
                        break;

                    default:
                        console.warn('⚠️ Operação desconhecida na queue:', item.operation);
                        success = true; // Remove da queue mesmo assim
                }

                if (success) {
                    // Remover da queue
                    this.offlineQueue = this.offlineQueue.filter(q => q.id !== item.id);
                    results.processed++;

                    if (conflictResolved) {
                        results.conflicts++;
                        results.resolutions.push({
                            operation: item.operation,
                            itemId: item.id,
                            timestamp: new Date().toISOString()
                        });
                    }

                    console.log(`✅ Operação sincronizada: ${item.operation}${conflictResolved ? ' (conflito resolvido)' : ''}`);
                }
            } catch (error) {
                console.error(`❌ Erro ao sincronizar operação ${item.operation}:`, error);

                item.retries = (item.retries || 0) + 1;

                if (item.retries >= APP_CONFIG.maxRetries) {
                    console.error(`❌ Operação ${item.operation} excedeu tentativas máximas, removendo da queue`);
                    this.offlineQueue = this.offlineQueue.filter(q => q.id !== item.id);
                    results.errors.push({
                        operation: item.operation,
                        error: error.message,
                        data: item.data
                    });
                }

                results.success = false;
            }
        }

        this.saveOfflineQueue();
        this.syncInProgress = false;

        console.log(`✅ Sincronização concluída: ${results.processed} processadas, ${results.errors.length} erros, ${results.conflicts} conflitos resolvidos`);
        return results;
    }

    /**
     * Salvar geração com tratamento de conflito
     */
    async saveLabelGenerationWithConflictHandling(data) {
        try {
            const result = await this.saveLabelGeneration(data);
            return { success: true, result, conflictResolved: false };
        } catch (error) {
            // Se for erro de conflito, tentar resolução
            if (error.message.includes('conflict') || error.message.includes('duplicate')) {
                console.log('🔧 Tentando resolver conflito de geração...');

                // Buscar dados existentes
                const normalizedData = data.application_type
                    ? data
                    : {
                        application_type: data.applicationType,
                        coddv: data.coddv || null,
                        quantity: parseInt(data.quantity) || 0,
                        copies: parseInt(data.copies) || 1
                    };

                const existingRecord = await this.findSimilarLabelRecord(normalizedData);

                if (existingRecord) {
                    const conflictResult = await conflictResolver.detectAndResolveConflicts(
                        data,
                        existingRecord,
                        'label_generation'
                    );

                    if (conflictResult.hasConflict) {
                        // Aplicar resolução
                        const updatedRecord = await this.updateLabelRecord(existingRecord.id, conflictResult.resolvedData);
                        return { success: true, result: updatedRecord, conflictResolved: true };
                    }
                }
            }

            throw error;
        }
    }

    /**
     * Atualizar contador com tratamento de conflito
     */
    async updateGlobalCounterWithConflictHandling(increment, type) {
        try {
            const result = await this.updateGlobalCounter(increment, type);
            return { success: true, result, conflictResolved: false };
        } catch (error) {
            // Se for erro de conflito, tentar resolução
            if (error.message.includes('conflict') || error.message.includes('version')) {
                console.log('🔧 Tentando resolver conflito de contador...');

                // Obter estado atual
                const currentCounter = await this.getCounterStats();
                const baseTotal = Number.isFinite(Number(currentCounter.total_count))
                    ? Number(currentCounter.total_count)
                    : 0;
                const baseBreakdown = currentCounter.application_breakdown || {};
                const baseTypeCount = Number.isFinite(Number(baseBreakdown[type]))
                    ? Number(baseBreakdown[type])
                    : 0;
                const baseVersion = Number.isFinite(Number(currentCounter.version))
                    ? Number(currentCounter.version)
                    : 1;

                // Simular dados locais com incremento
                const localCounter = {
                    ...currentCounter,
                    total_count: baseTotal + increment,
                    application_breakdown: {
                        ...baseBreakdown,
                        [type]: baseTypeCount + increment
                    },
                    last_updated: new Date().toISOString(),
                    version: baseVersion + 1
                };

                const conflictResult = await conflictResolver.detectAndResolveConflicts(
                    localCounter,
                    currentCounter,
                    'global_counter'
                );

                if (conflictResult.hasConflict) {
                    // Aplicar resolução
                    await this.applyResolvedCounterData(conflictResult.resolvedData);
                    return { success: true, result: conflictResult.resolvedData, conflictResolved: true };
                }
            }

            throw error;
        }
    }

    /**
     * Iniciar sincronização automática
     */
    startAutoSync() {
        setInterval(async () => {
            if (this.isOnline() && this.offlineQueue.length > 0) {
                await this.syncOfflineQueue();
            }
        }, APP_CONFIG.syncIntervalMs);

        // Sincronizar quando voltar online
        window.addEventListener('online', () => {
            console.log('🌐 Conectividade restaurada, iniciando sincronização...');
            setTimeout(() => this.syncOfflineQueue(), 1000);
        });
    }

    /**
     * Obter status da queue offline
     */
    getQueueStatus() {
        return {
            queueLength: this.offlineQueue.length,
            isOnline: this.isOnline(),
            syncInProgress: this.syncInProgress,
            lastSync: localStorage.getItem('last_sync_timestamp')
        };
    }

    /**
     * Obter estatísticas de resolução de conflitos
     */
    getConflictResolutionStats() {
        return conflictResolver.getResolutionStats();
    }

    /**
     * Exportar logs de resolução de conflitos
     */
    exportConflictLogs() {
        return conflictResolver.exportLogs();
    }

    /**
     * Limpar logs de conflitos (para testes)
     */
    clearConflictLogs() {
        conflictResolver.clearLogs();
    }

    /**
     * Limpar queue offline (apenas para testes/debug)
     */
    clearOfflineQueue() {
        this.offlineQueue = [];
        this.saveOfflineQueue();
        console.log('🗑️ Queue offline limpa');
    }
}

// Exportar instância singleton
export const supabaseManager = new SupabaseManager();
export default supabaseManager;
