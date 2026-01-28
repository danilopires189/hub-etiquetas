/**
 * HistoryManager - Gerenciador de Histórico Dual (localStorage + Supabase)
 * 
 * Este sistema mantém o histórico local funcionando exatamente como antes,
 * mas também sincroniza com o Supabase em paralelo.
 */

class HistoryManager {
    constructor(applicationType, supabaseManager = null) {
        this.applicationType = applicationType;
        this.supabaseManager = supabaseManager;
        this.localStorageKey = this.getLocalStorageKey();
        this.isOnline = navigator.onLine;
        this.syncQueue = [];
        
        // Configurar monitoramento de conectividade
        this.setupConnectivityMonitoring();
        
        console.log(`📚 HistoryManager inicializado para ${applicationType}`);
    }
    
    /**
     * Obter chave do localStorage baseada no tipo de aplicação
     */
    getLocalStorageKey() {
        const keys = {
            'caixa': 'etiquetas-history',
            'termo': 'termo-etiquetas-history',
            'placas': 'placas-history',
            'avulso': 'avulso-history',
            'enderec': 'enderec-history',
            'transferencia': 'transferencia-history',
            'etiqueta-mercadoria': 'etiqueta-mercadoria-history',
            'inventario': 'inventario-history',
            'pedido-direto': 'pedido-direto-history'
        };
        
        return keys[this.applicationType] || `${this.applicationType}-history`;
    }
    
    /**
     * FUNCIONALIDADE LOCAL (mantida exatamente como antes)
     */
    
    /**
     * Salvar no histórico local (comportamento inalterado)
     */
    saveToLocalHistory(entry) {
        try {
            const history = this.getLocalHistory();
            
            // Criar chave única para deduplicação
            const uniqueKey = this.generateUniqueKey(entry);
            entry.uniqueKey = uniqueKey;
            entry.id = entry.id || (Date.now() + Math.random());
            
            // Remover duplicatas
            const existingIndex = history.findIndex(item => 
                this.generateUniqueKey(item) === uniqueKey
            );
            
            if (existingIndex !== -1) {
                history.splice(existingIndex, 1);
            }
            
            // Adicionar no início
            history.unshift(entry);
            
            // Limitar quantidade baseada no tipo
            const maxEntries = this.getMaxEntries();
            if (history.length > maxEntries) {
                history.splice(maxEntries);
            }
            
            // Salvar no localStorage
            localStorage.setItem(this.localStorageKey, JSON.stringify(history));
            
            console.log(`💾 Histórico local salvo (${this.applicationType}):`, entry);
            return true;
            
        } catch (error) {
            console.warn(`⚠️ Erro ao salvar histórico local (${this.applicationType}):`, error);
            return false;
        }
    }
    
    /**
     * Obter histórico local (comportamento inalterado)
     */
    getLocalHistory() {
        try {
            const data = localStorage.getItem(this.localStorageKey);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.warn(`⚠️ Erro ao carregar histórico local (${this.applicationType}):`, error);
            return [];
        }
    }
    
    /**
     * Limpar histórico local (comportamento inalterado)
     */
    clearLocalHistory() {
        try {
            localStorage.removeItem(this.localStorageKey);
            console.log(`🗑️ Histórico local limpo (${this.applicationType})`);
            return true;
        } catch (error) {
            console.warn(`⚠️ Erro ao limpar histórico local (${this.applicationType}):`, error);
            return false;
        }
    }
    
    /**
     * NOVA FUNCIONALIDADE - ARMAZENAMENTO DUAL
     */
    
    /**
     * Salvar em ambos os locais (localStorage + Supabase)
     */
    async saveToBothStorages(entry) {
        // 1. Sempre salvar no localStorage primeiro (garantir funcionamento local)
        const localSaved = this.saveToLocalHistory(entry);
        
        if (!localSaved) {
            console.warn(`⚠️ Falha ao salvar localmente (${this.applicationType})`);
        }
        
        // 2. Tentar salvar no Supabase (não crítico)
        try {
            if (this.supabaseManager && this.isOnline) {
                await this.saveToSupabase(entry);
                console.log(`☁️ Histórico sincronizado com Supabase (${this.applicationType})`);
            } else {
                // Adicionar à fila para sincronização posterior
                this.addToSyncQueue(entry);
                console.log(`📤 Adicionado à fila de sincronização (${this.applicationType})`);
            }
        } catch (error) {
            console.warn(`⚠️ Falha na sincronização Supabase (${this.applicationType}):`, error);
            // Adicionar à fila para tentar novamente
            this.addToSyncQueue(entry);
        }
        
        return localSaved;
    }
    
    /**
     * Salvar no Supabase
     */
    async saveToSupabase(entry) {
        if (!this.supabaseManager) {
            throw new Error('SupabaseManager não disponível');
        }
        
        // Converter entrada local para formato Supabase
        const supabaseEntry = this.convertToSupabaseFormat(entry);
        
        // Salvar usando o SupabaseManager
        const { data, error } = await this.supabaseManager.supabase
            .from('application_history')
            .upsert(supabaseEntry, { 
                onConflict: 'application_type,unique_key',
                ignoreDuplicates: false 
            });
        
        if (error) {
            throw new Error(`Erro ao salvar no Supabase: ${error.message}`);
        }
        
        return data;
    }
    
    /**
     * Converter formato local para Supabase
     */
    convertToSupabaseFormat(entry) {
        const base = {
            application_type: this.applicationType,
            unique_key: entry.uniqueKey || this.generateUniqueKey(entry),
            local_id: entry.id?.toString(),
            metadata: {
                originalEntry: entry,
                source: 'history_manager',
                timestamp: new Date().toISOString()
            }
        };
        
        // Mapear campos específicos baseado no tipo de aplicação
        if (this.applicationType === 'termo') {
            return {
                ...base,
                etiqueta_id: entry.etiquetaId,
                pedido: entry.pedido,
                data_pedido: entry.dataPedido,
                loja: entry.loja,
                rota: entry.rota,
                qtd_volumes: entry.qtdVolumes,
                matricula: entry.matricula,
                data_separacao: entry.dataSeparacao,
                hora_separacao: entry.horaSeparacao,
                quantity: entry.qtdVolumes || 1,
                copies: 1
            };
        } else if (this.applicationType === 'caixa') {
            return {
                ...base,
                base_number: entry.base,
                quantity: entry.qtd,
                copies: entry.copias,
                label_type: entry.labelType,
                orientation: entry.orient,
                ultimo_numero: entry.ultimoNumero,
                proximo_numero: entry.proximoNumero,
                total_labels: entry.totalLabels
            };
        } else {
            // Formato genérico para outros módulos
            return {
                ...base,
                quantity: entry.quantity || entry.qtd || 1,
                copies: entry.copies || entry.copias || 1,
                total_labels: entry.totalLabels || entry.quantity || 1
            };
        }
    }
    
    /**
     * Gerar chave única para deduplicação
     */
    generateUniqueKey(entry) {
        if (this.applicationType === 'termo') {
            return `${entry.etiquetaId}-${entry.pedido}-${entry.loja}-${entry.rota}`;
        } else if (this.applicationType === 'caixa') {
            return `${entry.base}-${entry.qtd}-${entry.copias}-${entry.labelType}-${entry.orient}`;
        } else {
            // Chave genérica
            const timestamp = entry.timestamp || new Date().toISOString();
            return `${this.applicationType}-${timestamp}-${Math.random().toString(36).substr(2, 9)}`;
        }
    }
    
    /**
     * Obter número máximo de entradas por tipo
     */
    getMaxEntries() {
        const limits = {
            'termo': 500,
            'caixa': 5,
            'placas': 10,
            'avulso': 10,
            'enderec': 10,
            'transferencia': 10,
            'etiqueta-mercadoria': 10,
            'inventario': 10,
            'pedido-direto': 10
        };
        
        return limits[this.applicationType] || 10;
    }
    
    /**
     * SINCRONIZAÇÃO OFFLINE
     */
    
    /**
     * Adicionar à fila de sincronização
     */
    addToSyncQueue(entry) {
        this.syncQueue.push({
            entry,
            timestamp: Date.now(),
            attempts: 0
        });
        
        // Limitar tamanho da fila
        if (this.syncQueue.length > 100) {
            this.syncQueue = this.syncQueue.slice(-50); // Manter apenas os 50 mais recentes
        }
    }
    
    /**
     * Processar fila de sincronização
     */
    async processSyncQueue() {
        if (!this.isOnline || !this.supabaseManager || this.syncQueue.length === 0) {
            return;
        }
        
        console.log(`🔄 Processando fila de sincronização (${this.applicationType}): ${this.syncQueue.length} itens`);
        
        const itemsToProcess = [...this.syncQueue];
        this.syncQueue = [];
        
        for (const item of itemsToProcess) {
            try {
                await this.saveToSupabase(item.entry);
                console.log(`✅ Item sincronizado (${this.applicationType})`);
            } catch (error) {
                console.warn(`⚠️ Falha na sincronização de item (${this.applicationType}):`, error);
                
                // Tentar novamente se não excedeu o limite
                item.attempts++;
                if (item.attempts < 3) {
                    this.syncQueue.push(item);
                }
            }
        }
    }
    
    /**
     * RESTAURAÇÃO DO SUPABASE
     */
    
    /**
     * Restaurar histórico do Supabase
     */
    async restoreHistoryFromSupabase() {
        if (!this.supabaseManager) {
            throw new Error('SupabaseManager não disponível');
        }
        
        try {
            const { data, error } = await this.supabaseManager.supabase
                .from('application_history')
                .select('*')
                .eq('application_type', this.applicationType)
                .order('created_at', { ascending: false })
                .limit(this.getMaxEntries());
            
            if (error) {
                throw new Error(`Erro ao restaurar do Supabase: ${error.message}`);
            }
            
            // Converter de volta para formato local
            const localEntries = data.map(item => this.convertFromSupabaseFormat(item));
            
            // Salvar no localStorage
            localStorage.setItem(this.localStorageKey, JSON.stringify(localEntries));
            
            console.log(`🔄 Histórico restaurado do Supabase (${this.applicationType}): ${localEntries.length} itens`);
            return localEntries;
            
        } catch (error) {
            console.error(`❌ Erro ao restaurar histórico (${this.applicationType}):`, error);
            throw error;
        }
    }
    
    /**
     * Converter formato Supabase para local
     */
    convertFromSupabaseFormat(supabaseEntry) {
        // Se temos o entry original nos metadados, usar ele
        if (supabaseEntry.metadata?.originalEntry) {
            return supabaseEntry.metadata.originalEntry;
        }
        
        // Caso contrário, reconstruir baseado no tipo
        if (this.applicationType === 'termo') {
            return {
                etiquetaId: supabaseEntry.etiqueta_id,
                pedido: supabaseEntry.pedido,
                dataPedido: supabaseEntry.data_pedido,
                loja: supabaseEntry.loja,
                rota: supabaseEntry.rota,
                qtdVolumes: supabaseEntry.qtd_volumes,
                matricula: supabaseEntry.matricula,
                dataSeparacao: supabaseEntry.data_separacao,
                horaSeparacao: supabaseEntry.hora_separacao,
                timestamp: supabaseEntry.created_at,
                id: supabaseEntry.local_id,
                uniqueKey: supabaseEntry.unique_key
            };
        } else if (this.applicationType === 'caixa') {
            return {
                base: supabaseEntry.base_number,
                qtd: supabaseEntry.quantity,
                copias: supabaseEntry.copies,
                labelType: supabaseEntry.label_type,
                orient: supabaseEntry.orientation,
                ultimoNumero: supabaseEntry.ultimo_numero,
                proximoNumero: supabaseEntry.proximo_numero,
                totalLabels: supabaseEntry.total_labels,
                timestamp: supabaseEntry.created_at,
                id: supabaseEntry.local_id,
                uniqueKey: supabaseEntry.unique_key
            };
        } else {
            // Formato genérico
            return {
                quantity: supabaseEntry.quantity,
                copies: supabaseEntry.copies,
                totalLabels: supabaseEntry.total_labels,
                timestamp: supabaseEntry.created_at,
                id: supabaseEntry.local_id,
                uniqueKey: supabaseEntry.unique_key
            };
        }
    }
    
    /**
     * MONITORAMENTO DE CONECTIVIDADE
     */
    
    setupConnectivityMonitoring() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            console.log(`🌐 Conectividade restaurada (${this.applicationType})`);
            // Processar fila quando voltar online
            setTimeout(() => this.processSyncQueue(), 1000);
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
            console.log(`📱 Modo offline ativado (${this.applicationType})`);
        });
    }
    
    /**
     * MÉTODOS DE COMPATIBILIDADE (para manter APIs existentes)
     */
    
    /**
     * Método de compatibilidade para módulos existentes
     */
    async saveToHistory(entry) {
        return await this.saveToBothStorages(entry);
    }
    
    /**
     * Método de compatibilidade para obter histórico
     */
    getHistory() {
        return this.getLocalHistory();
    }
    
    /**
     * Método de compatibilidade para limpar histórico
     */
    clearHistory() {
        return this.clearLocalHistory();
    }
    
    /**
     * UTILITÁRIOS
     */
    
    /**
     * Obter estatísticas do histórico
     */
    getStats() {
        const localHistory = this.getLocalHistory();
        return {
            applicationType: this.applicationType,
            localEntries: localHistory.length,
            queuedEntries: this.syncQueue.length,
            isOnline: this.isOnline,
            hasSupabase: !!this.supabaseManager,
            lastEntry: localHistory[0]?.timestamp || null
        };
    }
    
    /**
     * Sincronizar histórico local existente com Supabase
     */
    async syncExistingHistory() {
        const localHistory = this.getLocalHistory();
        
        if (localHistory.length === 0) {
            console.log(`ℹ️ Nenhum histórico local para sincronizar (${this.applicationType})`);
            return;
        }
        
        console.log(`🔄 Sincronizando histórico existente (${this.applicationType}): ${localHistory.length} itens`);
        
        for (const entry of localHistory) {
            try {
                await this.saveToSupabase(entry);
            } catch (error) {
                console.warn(`⚠️ Falha ao sincronizar entrada (${this.applicationType}):`, error);
                // Continuar com as outras entradas
            }
        }
        
        console.log(`✅ Sincronização do histórico existente concluída (${this.applicationType})`);
    }
}

// Exportar para uso global
window.HistoryManager = HistoryManager;

// Função utilitária para criar instâncias
window.createHistoryManager = function(applicationType, supabaseManager = null) {
    return new HistoryManager(applicationType, supabaseManager || window.supabaseManager);
};

console.log('📚 HistoryManager carregado e disponível globalmente');