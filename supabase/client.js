/**
 * Cliente Supabase para Hub de Etiquetas
 * Gerencia conexão, autenticação e operações de dados
 */

import { createClient } from 'https://cdn.skypack.dev/@supabase/supabase-js@2';
import { SUPABASE_CONFIG, ADMIN_CONFIG, APP_CONFIG } from './config.js';
import { conflictResolver } from './conflict-resolver.js';

class SupabaseManager {
    constructor() {
        this.client = null;
        this.isConnected = false;
        this.isAuthenticated = false;
        this.offlineQueue = [];
        this.syncInProgress = false;
        this.retryCount = 0;
        
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
            
            // Garantir que o usuário admin existe
            await this.ensureAdminUserExists();
            
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
            quantity: data.quantity,
            copies: data.copies,
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
                const existingRecord = await this.findSimilarLabelRecord(generationData);
                
                const { data: result, error } = await this.client
                    .rpc('register_label_generation', {
                        p_application_type: generationData.application_type,
                        p_coddv: generationData.coddv,
                        p_quantity: generationData.quantity,
                        p_copies: generationData.copies,
                        p_label_type: generationData.label_type,
                        p_orientation: generationData.orientation,
                        p_cd: generationData.cd,
                        p_user_session_id: generationData.user_session_id,
                        p_metadata: generationData.metadata
                    });

                if (error) {
                    console.error('❌ Erro ao salvar geração:', error);
                    throw error;
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
                console.warn('⚠️ Falha ao salvar online, adicionando à queue:', error);
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
     * Atualizar contador global com resolução de conflitos
     */
    async updateGlobalCounter(increment, type) {
        if (this.isOnline()) {
            try {
                console.log(`📈 Atualizando contador: +${increment} ${type}`);
                
                // Obter estado atual do contador antes da atualização
                const currentCounter = await this.getCounterStats();
                
                const { data, error } = await this.client
                    .rpc('update_global_counter', {
                        increment_amount: increment,
                        app_type: type
                    });

                if (error) {
                    console.error('❌ Erro ao atualizar contador:', error);
                    throw error;
                }

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

            return data[0] || { total_count: 0, application_breakdown: {}, last_updated: new Date(), version: 1 };
        } catch (error) {
            console.error('❌ Falha ao obter estatísticas:', error);
            return { total_count: 0, application_breakdown: {}, last_updated: new Date(), version: 1 };
        }
    }

    /**
     * Obter estatísticas com filtros
     */
    async getStatistics(filters = {}) {
        try {
            let query = this.client.from('labels').select('*');
            
            if (filters.startDate) {
                query = query.gte('created_at', filters.startDate);
            }
            
            if (filters.endDate) {
                query = query.lte('created_at', filters.endDate);
            }
            
            if (filters.applicationType) {
                query = query.eq('application_type', filters.applicationType);
            }
            
            if (filters.cd) {
                query = query.eq('cd', filters.cd);
            }

            const { data, error } = await query.order('created_at', { ascending: false });

            if (error) {
                console.error('❌ Erro ao obter estatísticas filtradas:', error);
                throw error;
            }

            return this.processStatistics(data);
        } catch (error) {
            console.error('❌ Falha ao obter estatísticas filtradas:', error);
            return { totalLabels: 0, applicationBreakdown: {}, timeSeriesData: [] };
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
            const totalLabels = record.quantity * record.copies;
            stats.totalLabels += totalLabels;
            
            // Breakdown por aplicação
            if (!stats.applicationBreakdown[record.application_type]) {
                stats.applicationBreakdown[record.application_type] = 0;
            }
            stats.applicationBreakdown[record.application_type] += totalLabels;
            
            // Dados de série temporal (agrupados por dia)
            const date = new Date(record.created_at).toISOString().split('T')[0];
            const existingPoint = stats.timeSeriesData.find(point => point.date === date);
            
            if (existingPoint) {
                existingPoint.count += totalLabels;
            } else {
                stats.timeSeriesData.push({ date, count: totalLabels });
            }
        });

        return stats;
    }

    /**
     * Autenticação administrativa
     */
    async authenticateAdmin(email, password) {
        try {
            console.log('🔐 Tentando autenticação admin...');
            
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
            
            if (sessionExpiry && isAuthenticated === 'true') {
                const expiryDate = new Date(sessionExpiry);
                const now = new Date();
                
                if (now > expiryDate) {
                    console.log('⏰ Sessão local expirada, fazendo logout...');
                    await this.logout();
                    return null;
                }
            }
            
            const { data: { session }, error } = await this.client.auth.getSession();
            
            if (error) {
                console.error('❌ Erro ao verificar sessão:', error);
                return null;
            }

            // Verificar se a sessão do Supabase ainda é válida
            if (session) {
                const sessionExpiry = localStorage.getItem('admin_session_expiry');
                if (sessionExpiry) {
                    const expiryDate = new Date(sessionExpiry);
                    const now = new Date();
                    
                    if (now > expiryDate) {
                        console.log('⏰ Sessão de 24h expirada, fazendo logout...');
                        await this.logout();
                        return null;
                    }
                }
                
                this.isAuthenticated = true;
                console.log('✅ Sessão válida encontrada');
            } else {
                this.isAuthenticated = false;
                // Limpar dados locais se não há sessão no Supabase
                localStorage.removeItem('admin_session_expiry');
                localStorage.removeItem('admin_authenticated');
            }

            return session;
        } catch (error) {
            console.error('❌ Falha ao verificar sessão:', error);
            this.isAuthenticated = false;
            return null;
        }
    }

    /**
     * Criar usuário admin se não existir
     */
    async ensureAdminUserExists() {
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
            const { data, error } = await this.client
                .from('labels')
                .select('*')
                .eq('application_type', generationData.application_type)
                .eq('coddv', generationData.coddv)
                .eq('quantity', generationData.quantity)
                .gte('created_at', new Date(Date.now() - 60000).toISOString()) // Últimos 1 minuto
                .limit(1);

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
                .select();

            if (error) {
                throw new Error(`Erro ao atualizar registro: ${error.message}`);
            }

            return data[0];
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
                const existingRecord = await this.findSimilarLabelRecord(data);
                
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
                
                // Simular dados locais com incremento
                const localCounter = {
                    ...currentCounter,
                    total_count: currentCounter.total_count + increment,
                    application_breakdown: {
                        ...currentCounter.application_breakdown,
                        [type]: (currentCounter.application_breakdown[type] || 0) + increment
                    },
                    last_updated: new Date().toISOString(),
                    version: currentCounter.version + 1
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