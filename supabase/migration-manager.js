/**
 * Sistema de Migração de Dados Históricos
 * Migra dados do localStorage para Supabase
 */

import { supabaseManager } from './client.js';
import { migrationErrorHandler } from './migration-error-handler.js';

class MigrationManager {
    constructor() {
        this.migrationLog = [];
        this.errors = [];
        this.totalOperations = 0;
        this.completedOperations = 0;
        this.isRunning = false;
        
        console.log('🔄 MigrationManager inicializado');
    }

    /**
     * Executar migração completa
     */
    async runMigration() {
        if (this.isRunning) {
            console.warn('⚠️ Migração já está em execução');
            return { success: false, error: 'Migration already running' };
        }

        this.isRunning = true;
        this.migrationLog = [];
        this.errors = [];
        this.totalOperations = 0;
        this.completedOperations = 0;

        console.log('🚀 Iniciando migração de dados históricos...');
        
        try {
            // Verificar se Supabase está conectado
            if (!supabaseManager.isOnline()) {
                throw new Error('Supabase não está conectado');
            }

            // Contar operações totais
            await this.countTotalOperations();

            // Executar migrações em ordem
            await this.migrateGlobalCounter();
            await this.migrateApplicationHistories();
            await this.migrateOfflineQueue();
            
            // Verificar integridade pós-migração
            const integrityCheck = await migrationErrorHandler.verifyPostMigrationIntegrity({
                totalOperations: this.totalOperations,
                completedOperations: this.completedOperations,
                errors: this.errors
            });
            
            const result = {
                success: true,
                totalOperations: this.totalOperations,
                completedOperations: this.completedOperations,
                errors: this.errors,
                migrationLog: this.migrationLog,
                integrityCheck,
                errorReport: migrationErrorHandler.getErrorReport()
            };

            console.log('✅ Migração concluída com sucesso');
            console.log(`📊 Operações: ${this.completedOperations}/${this.totalOperations}`);
            console.log(`❌ Erros: ${this.errors.length}`);
            
            return result;

        } catch (error) {
            console.error('❌ Falha na migração:', error);
            migrationErrorHandler.logError('MIGRATION_FAILED', error, null);
            
            return {
                success: false,
                error: error.message,
                totalOperations: this.totalOperations,
                completedOperations: this.completedOperations,
                errors: this.errors,
                migrationLog: this.migrationLog,
                errorReport: migrationErrorHandler.getErrorReport()
            };
        } finally {
            this.isRunning = false;
        }
    }

    /**
     * Contar operações totais para progresso
     */
    async countTotalOperations() {
        let count = 0;

        // Contador global (1 operação)
        const globalCounterData = this.getLocalStorageData('contador_global_centralizado_v1');
        if (globalCounterData) count += 1;

        // Históricos de aplicações
        const historyKeys = [
            'avulso-etiquetas-history',
            'caixa-etiquetas-history', 
            'enderec-etiquetas-history',
            'placas-etiquetas-history',
            'transfer-etiquetas-history',
            'termo-etiquetas-history',
            'pedido-direto-etiquetas-history',
            'etiqueta-mercadoria-etiquetas-history',
            'inventario-etiquetas-history'
        ];

        for (const key of historyKeys) {
            const data = this.getLocalStorageData(key);
            if (data && Array.isArray(data)) {
                count += data.length;
            }
        }

        // Queue offline
        const offlineQueue = this.getLocalStorageData('hub_etiquetas_offline_queue');
        if (offlineQueue && Array.isArray(offlineQueue)) {
            count += offlineQueue.length;
        }

        this.totalOperations = count;
        console.log(`📊 Total de operações para migração: ${count}`);
    }

    /**
     * Migrar contador global
     */
    async migrateGlobalCounter() {
        console.log('🔄 Migrando contador global...');
        
        const result = await migrationErrorHandler.executeWithRetry(async () => {
            const globalCounterData = this.getLocalStorageData('contador_global_centralizado_v1');
            
            if (!globalCounterData) {
                this.logInfo('GLOBAL_COUNTER', 'Nenhum dado de contador global encontrado no localStorage');
                return null;
            }

            // Validar dados antes da migração
            const validation = migrationErrorHandler.validateMigrationData(globalCounterData, 'globalCounter');
            
            if (!validation.valid) {
                throw new Error(`Dados inválidos: ${validation.errors.join('; ')}`);
            }

            // Converter formato localStorage para Supabase
            const supabaseData = {
                total_count: globalCounterData.totalEtiquetas || 0,
                application_breakdown: globalCounterData.operacoesPendentes ? 
                    this.processOperationsPendingToBreakdown(globalCounterData.operacoesPendentes) : {},
                last_updated: globalCounterData.ultimaAtualizacao || new Date().toISOString(),
                version: 1
            };

            // Verificar se já existe contador no Supabase
            const existingCounter = await supabaseManager.getCounterStats();
            
            if (existingCounter.total_count > 0) {
                // Se já existe, usar o maior valor
                if (supabaseData.total_count > existingCounter.total_count) {
                    await this.updateSupabaseCounter(supabaseData);
                    this.logInfo('GLOBAL_COUNTER', `Contador atualizado: ${existingCounter.total_count} → ${supabaseData.total_count}`);
                } else {
                    this.logInfo('GLOBAL_COUNTER', `Contador Supabase já é maior: ${existingCounter.total_count} >= ${supabaseData.total_count}`);
                }
            } else {
                // Primeiro contador, inserir diretamente
                await this.updateSupabaseCounter(supabaseData);
                this.logInfo('GLOBAL_COUNTER', `Contador inicial migrado: ${supabaseData.total_count}`);
            }

            this.completedOperations++;
            return supabaseData;
            
        }, 'GLOBAL_COUNTER');
        
        if (!result.success) {
            migrationErrorHandler.logError('GLOBAL_COUNTER', result.error, { globalCounterData });
            // Continuar com outras migrações mesmo se esta falhar
        }
    }

    /**
     * Migrar históricos de aplicações
     */
    async migrateApplicationHistories() {
        console.log('🔄 Migrando históricos de aplicações...');

        const historyMappings = [
            { key: 'avulso-etiquetas-history', type: 'avulso' },
            { key: 'caixa-etiquetas-history', type: 'caixa' },
            { key: 'enderec-etiquetas-history', type: 'enderec' },
            { key: 'placas-etiquetas-history', type: 'placas' },
            { key: 'transfer-etiquetas-history', type: 'transferencia' },
            { key: 'termo-etiquetas-history', type: 'termo' },
            { key: 'pedido-direto-etiquetas-history', type: 'pedido-direto' },
            { key: 'etiqueta-mercadoria-etiquetas-history', type: 'etiqueta-mercadoria' },
            { key: 'inventario-etiquetas-history', type: 'inventario' }
        ];

        for (const mapping of historyMappings) {
            await this.migrateApplicationHistory(mapping.key, mapping.type);
        }
    }

    /**
     * Migrar histórico de uma aplicação específica
     */
    async migrateApplicationHistory(storageKey, applicationType) {
        const context = `${applicationType.toUpperCase()}_HISTORY`;
        
        const result = await migrationErrorHandler.executeWithRetry(async () => {
            const historyData = this.getLocalStorageData(storageKey);
            
            if (!historyData || !Array.isArray(historyData) || historyData.length === 0) {
                this.logInfo(applicationType.toUpperCase(), 'Nenhum histórico encontrado');
                return { migratedCount: 0, errorCount: 0 };
            }

            console.log(`📋 Migrando ${historyData.length} registros de ${applicationType}...`);

            let migratedCount = 0;
            let errorCount = 0;

            for (const record of historyData) {
                try {
                    // Validar dados antes da migração
                    const validation = migrationErrorHandler.validateMigrationData(record, 'historyRecord');
                    
                    if (!validation.valid) {
                        // Tentar recuperação
                        const recovery = await migrationErrorHandler.recoverFromError(
                            'INVALID_DATA', 
                            record, 
                            'partial_recovery'
                        );
                        
                        if (!recovery.success) {
                            errorCount++;
                            this.completedOperations++;
                            continue;
                        }
                        
                        // Usar dados recuperados
                        record = { ...record, ...recovery.result.validParts };
                    }
                    
                    const labelData = this.convertHistoryRecordToLabelData(record, applicationType);
                    
                    // Verificar se já existe no Supabase (evitar duplicatas)
                    const exists = await this.checkIfRecordExists(labelData);
                    
                    if (!exists) {
                        await supabaseManager.saveLabelGeneration(labelData);
                        migratedCount++;
                        this.logInfo(applicationType.toUpperCase(), `Registro migrado: ${record.etiquetaId || record.id || 'ID desconhecido'}`);
                    } else {
                        this.logInfo(applicationType.toUpperCase(), `Registro já existe: ${record.etiquetaId || record.id || 'ID desconhecido'}`);
                    }

                    this.completedOperations++;
                    
                } catch (recordError) {
                    // Tentar recuperação do erro
                    const recovery = await migrationErrorHandler.recoverFromError(
                        'RECORD_MIGRATION', 
                        { record, error: recordError }, 
                        'skip_and_continue'
                    );
                    
                    errorCount++;
                    migrationErrorHandler.logError(applicationType.toUpperCase(), recordError, record);
                    this.completedOperations++; // Contar mesmo com erro para progresso
                }
            }

            console.log(`✅ ${applicationType}: ${migratedCount} migrados, ${errorCount} erros`);
            return { migratedCount, errorCount };
            
        }, context);
        
        if (!result.success) {
            migrationErrorHandler.logError(context, result.error, { storageKey, applicationType });
        }
    }

    /**
     * Migrar queue offline
     */
    async migrateOfflineQueue() {
        console.log('🔄 Migrando queue offline...');
        
        try {
            const offlineQueue = this.getLocalStorageData('hub_etiquetas_offline_queue');
            
            if (!offlineQueue || !Array.isArray(offlineQueue) || offlineQueue.length === 0) {
                this.logInfo('OFFLINE_QUEUE', 'Nenhuma queue offline encontrada');
                return;
            }

            console.log(`📋 Processando ${offlineQueue.length} operações da queue offline...`);

            let processedCount = 0;
            let errorCount = 0;

            for (const operation of offlineQueue) {
                try {
                    await this.processOfflineOperation(operation);
                    processedCount++;
                    this.logInfo('OFFLINE_QUEUE', `Operação processada: ${operation.operation}`);
                    
                } catch (operationError) {
                    errorCount++;
                    this.logError('OFFLINE_QUEUE', operationError.message, operation);
                }

                this.completedOperations++;
            }

            // Limpar queue após migração bem-sucedida
            if (processedCount > 0) {
                localStorage.removeItem('hub_etiquetas_offline_queue');
                this.logInfo('OFFLINE_QUEUE', 'Queue offline limpa após migração');
            }

            console.log(`✅ Queue offline: ${processedCount} processadas, ${errorCount} erros`);
            
        } catch (error) {
            this.logError('OFFLINE_QUEUE', `Falha na migração: ${error.message}`, null);
        }
    }

    /**
     * Converter registro de histórico para formato de label data
     */
    convertHistoryRecordToLabelData(record, applicationType) {
        // Determinar timestamp
        let timestamp = new Date().toISOString();
        
        if (record.timestamp) {
            timestamp = record.timestamp;
        } else if (record.dataCriacao && record.horaCriacao) {
            // Converter formato brasileiro para ISO
            const [day, month, year] = record.dataCriacao.split('/');
            const [hour, minute] = record.horaCriacao.split(':');
            timestamp = new Date(`20${year}-${month}-${day}T${hour}:${minute}:00`).toISOString();
        }

        return {
            applicationType: applicationType,
            coddv: record.etiquetaId || record.coddv || null,
            quantity: record.qtdCaixas || record.quantity || 1,
            copies: record.copies || 1,
            labelType: record.labelType || null,
            orientation: record.orientation || 'h',
            cd: record.deposito || record.cd || null,
            userSessionId: this.generateSessionId(),
            metadata: {
                migratedFrom: 'localStorage',
                originalRecord: record,
                migrationTimestamp: new Date().toISOString(),
                matricula: record.matricula || null,
                tipoMovimentacao: record.tipoMovimentacao || null,
                volume: record.volume || null
            },
            createdAt: timestamp
        };
    }

    /**
     * Verificar se registro já existe no Supabase
     */
    async checkIfRecordExists(labelData) {
        try {
            // Buscar por registros similares baseado em critérios únicos
            const { data, error } = await supabaseManager.client
                .from('labels')
                .select('id')
                .eq('application_type', labelData.applicationType)
                .eq('coddv', labelData.coddv)
                .eq('quantity', labelData.quantity)
                .gte('created_at', new Date(new Date(labelData.createdAt).getTime() - 60000).toISOString()) // ±1 minuto
                .lte('created_at', new Date(new Date(labelData.createdAt).getTime() + 60000).toISOString())
                .limit(1);

            if (error) {
                console.warn('⚠️ Erro ao verificar duplicata:', error);
                return false; // Em caso de erro, assumir que não existe
            }

            return data && data.length > 0;
            
        } catch (error) {
            console.warn('⚠️ Erro ao verificar duplicata:', error);
            return false;
        }
    }

    /**
     * Processar operação da queue offline
     */
    async processOfflineOperation(operation) {
        switch (operation.operation) {
            case 'saveLabelGeneration':
                await supabaseManager.saveLabelGeneration(operation.data);
                break;
                
            case 'updateGlobalCounter':
                await supabaseManager.updateGlobalCounter(
                    operation.data.increment, 
                    operation.data.type
                );
                break;
                
            default:
                throw new Error(`Operação desconhecida: ${operation.operation}`);
        }
    }

    /**
     * Atualizar contador no Supabase
     */
    async updateSupabaseCounter(counterData) {
        const { data, error } = await supabaseManager.client
            .rpc('migrate_global_counter', {
                p_total_count: counterData.total_count,
                p_application_breakdown: counterData.application_breakdown,
                p_last_updated: counterData.last_updated,
                p_version: counterData.version
            });

        if (error) {
            throw new Error(`Erro ao atualizar contador: ${error.message}`);
        }

        return data;
    }

    /**
     * Processar operações pendentes para breakdown
     */
    processOperationsPendingToBreakdown(operacoesPendentes) {
        const breakdown = {};
        
        if (Array.isArray(operacoesPendentes)) {
            operacoesPendentes.forEach(op => {
                const tipo = op.tipo || 'geral';
                breakdown[tipo] = (breakdown[tipo] || 0) + (op.quantidade || 0);
            });
        }
        
        return breakdown;
    }

    /**
     * Verificar integridade dos dados migrados
     */
    async verifyDataIntegrity() {
        console.log('🔍 Verificando integridade dos dados migrados...');
        
        try {
            const results = {
                globalCounter: false,
                labelsCount: 0,
                errors: []
            };

            // Verificar contador global
            const counterStats = await supabaseManager.getCounterStats();
            results.globalCounter = counterStats.total_count > 0;

            // Contar labels migradas
            const { data: labels, error: labelsError } = await supabaseManager.client
                .from('labels')
                .select('id', { count: 'exact' })
                .contains('metadata', { migratedFrom: 'localStorage' });

            if (labelsError) {
                results.errors.push(`Erro ao contar labels: ${labelsError.message}`);
            } else {
                results.labelsCount = labels?.length || 0;
            }

            console.log('✅ Verificação de integridade concluída');
            console.log(`📊 Contador global: ${results.globalCounter ? 'OK' : 'FALHA'}`);
            console.log(`📋 Labels migradas: ${results.labelsCount}`);
            
            return results;
            
        } catch (error) {
            console.error('❌ Erro na verificação de integridade:', error);
            return {
                globalCounter: false,
                labelsCount: 0,
                errors: [error.message]
            };
        }
    }

    /**
     * Obter dados do localStorage com tratamento de erro
     */
    getLocalStorageData(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.warn(`⚠️ Erro ao ler localStorage[${key}]:`, error);
            return null;
        }
    }

    /**
     * Gerar ID de sessão único
     */
    generateSessionId() {
        return `migration_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Log de informação
     */
    logInfo(category, message) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            level: 'INFO',
            category,
            message
        };
        
        this.migrationLog.push(logEntry);
        console.log(`ℹ️ [${category}] ${message}`);
    }

    /**
     * Log de erro
     */
    logError(category, message, data) {
        const errorEntry = {
            timestamp: new Date().toISOString(),
            level: 'ERROR',
            category,
            message,
            data: data ? JSON.stringify(data) : null
        };
        
        this.errors.push(errorEntry);
        this.migrationLog.push(errorEntry);
        console.error(`❌ [${category}] ${message}`, data);
    }

    /**
     * Obter status da migração
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            totalOperations: this.totalOperations,
            completedOperations: this.completedOperations,
            progress: this.totalOperations > 0 ? 
                Math.round((this.completedOperations / this.totalOperations) * 100) : 0,
            errors: this.errors.length,
            logs: this.migrationLog.length
        };
    }

    /**
     * Limpar logs (para testes)
     */
    clearLogs() {
        this.migrationLog = [];
        this.errors = [];
        console.log('🗑️ Logs de migração limpos');
    }
}

// Exportar instância singleton
export const migrationManager = new MigrationManager();
export default migrationManager;