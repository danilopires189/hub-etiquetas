/**
 * Sistema de Restauração de Histórico
 * Implementa funcionalidade completa de restauração do Supabase
 */

class HistoryRestorationSystem {
    constructor() {
        this.supabaseManager = null;
        this.initialized = false;
    }
    
    /**
     * Inicializar sistema de restauração
     */
    async initialize(supabaseManager = null) {
        this.supabaseManager = supabaseManager || window.supabaseManager;
        
        if (!this.supabaseManager) {
            console.warn('⚠️ SupabaseManager não disponível para restauração');
            return false;
        }
        
        this.initialized = true;
        console.log('✅ Sistema de restauração inicializado');
        return true;
    }
    
    /**
     * Restaurar histórico de um módulo específico
     */
    async restoreModuleHistory(moduleName, options = {}) {
        if (!this.initialized) {
            throw new Error('Sistema de restauração não inicializado');
        }
        
        console.log(`🔄 Restaurando histórico do módulo ${moduleName}...`);
        
        const {
            overwrite = false,
            maxEntries = null,
            dateRange = null,
            backup = true
        } = options;
        
        try {
            // 1. Fazer backup do histórico local atual se solicitado
            let localBackup = null;
            if (backup) {
                localBackup = this.backupLocalHistory(moduleName);
                console.log(`💾 Backup local criado: ${localBackup.entries} entradas`);
            }
            
            // 2. Buscar dados do Supabase
            let query = this.supabaseManager.supabase
                .from('application_history')
                .select('*')
                .eq('application_type', moduleName)
                .order('created_at', { ascending: false });
            
            // Aplicar filtros
            if (maxEntries) {
                query = query.limit(maxEntries);
            }
            
            if (dateRange) {
                if (dateRange.from) {
                    query = query.gte('created_at', dateRange.from);
                }
                if (dateRange.to) {
                    query = query.lte('created_at', dateRange.to);
                }
            }
            
            const { data, error } = await query;
            
            if (error) {
                throw new Error(`Erro ao buscar dados do Supabase: ${error.message}`);
            }
            
            if (!data || data.length === 0) {
                console.log(`ℹ️ Nenhum dado encontrado no Supabase para ${moduleName}`);
                return {
                    success: true,
                    restored: 0,
                    message: 'Nenhum dado para restaurar'
                };
            }
            
            // 3. Converter dados do Supabase para formato local
            const restoredEntries = data.map(item => this.convertFromSupabaseFormat(item, moduleName));
            
            // 4. Processar restauração baseado na estratégia
            let finalEntries = [];
            
            if (overwrite) {
                // Substituir completamente
                finalEntries = restoredEntries;
                console.log(`🔄 Substituindo histórico local completamente`);
            } else {
                // Mesclar com dados locais existentes
                const localEntries = this.getLocalHistory(moduleName);
                finalEntries = this.mergeHistories(localEntries, restoredEntries, moduleName);
                console.log(`🔄 Mesclando com histórico local existente`);
            }
            
            // 5. Salvar no localStorage
            this.saveLocalHistory(moduleName, finalEntries);
            
            console.log(`✅ Histórico restaurado para ${moduleName}: ${finalEntries.length} entradas`);
            
            return {
                success: true,
                restored: restoredEntries.length,
                total: finalEntries.length,
                backup: localBackup,
                entries: finalEntries
            };
            
        } catch (error) {
            console.error(`❌ Erro ao restaurar histórico de ${moduleName}:`, error);
            throw error;
        }
    }
    
    /**
     * Restaurar histórico de todos os módulos
     */
    async restoreAllModulesHistory(options = {}) {
        console.log('🔄 Restaurando histórico de todos os módulos...');
        
        const moduleNames = [
            'caixa', 'termo', 'placas', 'avulso', 'enderec',
            'transferencia', 'etiqueta-mercadoria', 'inventario', 'pedido-direto'
        ];
        
        const results = {};
        
        for (const moduleName of moduleNames) {
            try {
                console.log(`🔄 Restaurando ${moduleName}...`);
                results[moduleName] = await this.restoreModuleHistory(moduleName, options);
                console.log(`✅ ${moduleName} restaurado: ${results[moduleName].restored} entradas`);
            } catch (error) {
                console.warn(`⚠️ Erro ao restaurar ${moduleName}:`, error.message);
                results[moduleName] = {
                    success: false,
                    error: error.message
                };
            }
        }
        
        // Resumo
        const successful = Object.values(results).filter(r => r.success).length;
        const totalRestored = Object.values(results)
            .filter(r => r.success)
            .reduce((sum, r) => sum + r.restored, 0);
        
        console.log(`✅ Restauração concluída: ${successful}/${moduleNames.length} módulos, ${totalRestored} entradas`);
        
        return {
            success: successful > 0,
            modules: results,
            summary: {
                successful,
                total: moduleNames.length,
                totalRestored
            }
        };
    }
    
    /**
     * Fazer backup do histórico local
     */
    backupLocalHistory(moduleName) {
        const localEntries = this.getLocalHistory(moduleName);
        const backup = {
            moduleName,
            timestamp: new Date().toISOString(),
            entries: localEntries.length,
            data: localEntries
        };
        
        // Salvar backup no localStorage com chave especial
        const backupKey = `${this.getLocalStorageKey(moduleName)}-backup-${Date.now()}`;
        localStorage.setItem(backupKey, JSON.stringify(backup));
        
        return { ...backup, backupKey };
    }
    
    /**
     * Restaurar de um backup local
     */
    restoreFromLocalBackup(backupKey) {
        try {
            const backupData = localStorage.getItem(backupKey);
            if (!backupData) {
                throw new Error('Backup não encontrado');
            }
            
            const backup = JSON.parse(backupData);
            this.saveLocalHistory(backup.moduleName, backup.data);
            
            console.log(`✅ Histórico restaurado do backup: ${backup.entries} entradas`);
            return backup;
            
        } catch (error) {
            console.error('❌ Erro ao restaurar do backup:', error);
            throw error;
        }
    }
    
    /**
     * Listar backups disponíveis
     */
    listAvailableBackups() {
        const backups = [];
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.includes('-backup-')) {
                try {
                    const data = JSON.parse(localStorage.getItem(key));
                    backups.push({
                        key,
                        moduleName: data.moduleName,
                        timestamp: data.timestamp,
                        entries: data.entries,
                        date: new Date(data.timestamp).toLocaleString('pt-BR')
                    });
                } catch (error) {
                    console.warn(`⚠️ Backup corrompido: ${key}`);
                }
            }
        }
        
        return backups.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }
    
    /**
     * Limpar backups antigos
     */
    cleanOldBackups(daysOld = 7) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysOld);
        
        let cleaned = 0;
        
        for (let i = localStorage.length - 1; i >= 0; i--) {
            const key = localStorage.key(i);
            if (key && key.includes('-backup-')) {
                try {
                    const data = JSON.parse(localStorage.getItem(key));
                    const backupDate = new Date(data.timestamp);
                    
                    if (backupDate < cutoffDate) {
                        localStorage.removeItem(key);
                        cleaned++;
                    }
                } catch (error) {
                    // Remover backup corrompido
                    localStorage.removeItem(key);
                    cleaned++;
                }
            }
        }
        
        console.log(`🧹 Backups antigos removidos: ${cleaned}`);
        return cleaned;
    }
    
    /**
     * Mesclar históricos local e remoto
     */
    mergeHistories(localEntries, remoteEntries, moduleName) {
        const merged = [...localEntries];
        const seenKeys = new Set();
        
        // Criar chaves únicas para entradas locais
        localEntries.forEach(entry => {
            const key = this.generateUniqueKey(entry, moduleName);
            seenKeys.add(key);
        });
        
        // Adicionar entradas remotas que não existem localmente
        remoteEntries.forEach(entry => {
            const key = this.generateUniqueKey(entry, moduleName);
            if (!seenKeys.has(key)) {
                merged.push(entry);
                seenKeys.add(key);
            }
        });
        
        // Ordenar por timestamp (mais recente primeiro)
        merged.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
        
        // Limitar quantidade baseada no módulo
        const maxEntries = this.getMaxEntries(moduleName);
        return merged.slice(0, maxEntries);
    }
    
    /**
     * Converter formato Supabase para local
     */
    convertFromSupabaseFormat(supabaseEntry, moduleName) {
        // Se temos o entry original nos metadados, usar ele
        if (supabaseEntry.metadata?.originalEntry) {
            return supabaseEntry.metadata.originalEntry;
        }
        
        // Caso contrário, reconstruir baseado no tipo
        if (moduleName === 'termo') {
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
        } else if (moduleName === 'caixa') {
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
     * Gerar chave única para deduplicação
     */
    generateUniqueKey(entry, moduleName) {
        if (moduleName === 'termo') {
            return `${entry.etiquetaId}-${entry.pedido}-${entry.loja}-${entry.rota}`;
        } else if (moduleName === 'caixa') {
            return `${entry.base}-${entry.qtd}-${entry.copias}-${entry.labelType}-${entry.orient}`;
        } else {
            // Chave genérica
            const timestamp = entry.timestamp || new Date().toISOString();
            return `${moduleName}-${timestamp}-${Math.random().toString(36).substr(2, 9)}`;
        }
    }
    
    /**
     * Obter chave do localStorage baseada no módulo
     */
    getLocalStorageKey(moduleName) {
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
        
        return keys[moduleName] || `${moduleName}-history`;
    }
    
    /**
     * Obter histórico local
     */
    getLocalHistory(moduleName) {
        try {
            const key = this.getLocalStorageKey(moduleName);
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.warn(`⚠️ Erro ao carregar histórico local de ${moduleName}:`, error);
            return [];
        }
    }
    
    /**
     * Salvar histórico local
     */
    saveLocalHistory(moduleName, entries) {
        try {
            const key = this.getLocalStorageKey(moduleName);
            localStorage.setItem(key, JSON.stringify(entries));
            
            // Atualizar variável global se existir
            if (moduleName === 'caixa' && window.generationHistory) {
                window.generationHistory = entries;
            } else if (moduleName === 'termo' && window.termoGenerationHistory) {
                window.termoGenerationHistory = entries;
            }
            
            return true;
        } catch (error) {
            console.warn(`⚠️ Erro ao salvar histórico local de ${moduleName}:`, error);
            return false;
        }
    }
    
    /**
     * Obter número máximo de entradas por módulo
     */
    getMaxEntries(moduleName) {
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
        
        return limits[moduleName] || 10;
    }
    
    /**
     * Verificar integridade dos dados restaurados
     */
    verifyRestoredData(moduleName, entries) {
        const issues = [];
        
        entries.forEach((entry, index) => {
            // Verificar campos obrigatórios baseado no módulo
            if (moduleName === 'termo') {
                if (!entry.etiquetaId) issues.push(`Entrada ${index}: etiquetaId ausente`);
                if (!entry.pedido) issues.push(`Entrada ${index}: pedido ausente`);
            } else if (moduleName === 'caixa') {
                if (!entry.base) issues.push(`Entrada ${index}: base ausente`);
                if (!entry.qtd) issues.push(`Entrada ${index}: qtd ausente`);
            }
            
            // Verificar timestamp
            if (!entry.timestamp) {
                issues.push(`Entrada ${index}: timestamp ausente`);
            }
        });
        
        return {
            valid: issues.length === 0,
            issues,
            totalEntries: entries.length
        };
    }
    
    /**
     * Obter estatísticas de restauração
     */
    getRestorationStats() {
        const stats = {
            timestamp: new Date().toISOString(),
            initialized: this.initialized,
            supabaseAvailable: !!this.supabaseManager,
            modules: {}
        };
        
        const moduleNames = [
            'caixa', 'termo', 'placas', 'avulso', 'enderec',
            'transferencia', 'etiqueta-mercadoria', 'inventario', 'pedido-direto'
        ];
        
        moduleNames.forEach(moduleName => {
            const localHistory = this.getLocalHistory(moduleName);
            stats.modules[moduleName] = {
                localEntries: localHistory.length,
                storageKey: this.getLocalStorageKey(moduleName),
                maxEntries: this.getMaxEntries(moduleName)
            };
        });
        
        // Contar backups disponíveis
        stats.backups = this.listAvailableBackups().length;
        
        return stats;
    }
}

// Criar instância global
const historyRestorationSystem = new HistoryRestorationSystem();

// Expor globalmente
window.HistoryRestorationSystem = HistoryRestorationSystem;
window.historyRestorationSystem = historyRestorationSystem;

// Funções de conveniência
window.restoreModuleHistory = (moduleName, options) => 
    historyRestorationSystem.restoreModuleHistory(moduleName, options);

window.restoreAllHistory = (options) => 
    historyRestorationSystem.restoreAllModulesHistory(options);

window.listHistoryBackups = () => 
    historyRestorationSystem.listAvailableBackups();

window.restoreFromBackup = (backupKey) => 
    historyRestorationSystem.restoreFromLocalBackup(backupKey);

window.getRestorationStats = () => 
    historyRestorationSystem.getRestorationStats();

// Auto-inicializar quando possível
if (typeof window !== 'undefined') {
    const autoInit = () => {
        setTimeout(() => {
            if (window.supabaseManager && !historyRestorationSystem.initialized) {
                historyRestorationSystem.initialize().then(success => {
                    if (success) {
                        console.log('✅ Sistema de restauração auto-inicializado');
                    }
                });
            }
        }, 3000);
    };
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', autoInit);
    } else {
        autoInit();
    }
}

console.log('🔄 Sistema de Restauração de Histórico carregado');
console.log('📋 Funções disponíveis:');
console.log('  - restoreModuleHistory(moduleName, options)');
console.log('  - restoreAllHistory(options)');
console.log('  - listHistoryBackups()');
console.log('  - restoreFromBackup(backupKey)');
console.log('  - getRestorationStats()');