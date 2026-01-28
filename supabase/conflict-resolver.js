/**
 * Sistema de Resolução de Conflitos para Supabase Integration
 * Gerencia conflitos de dados entre local e remoto com estratégias automáticas
 */

import { supabaseManager } from './client.js';

class ConflictResolver {
    constructor() {
        this.resolutionLog = [];
        this.conflictStrategies = new Map();
        this.auditLog = [];
        this.maxLogEntries = 1000;
        
        // Configurar estratégias padrão
        this.setupDefaultStrategies();
        
        console.log('⚔️ ConflictResolver inicializado');
    }

    /**
     * Configurar estratégias padrão de resolução
     */
    setupDefaultStrategies() {
        // Estratégia para conflitos de contador global
        this.conflictStrategies.set('global_counter', {
            name: 'Global Counter Resolution',
            strategy: 'last_write_wins_with_merge',
            handler: this.resolveGlobalCounterConflict.bind(this),
            priority: 'high'
        });

        // Estratégia para conflitos de geração de etiquetas
        this.conflictStrategies.set('label_generation', {
            name: 'Label Generation Resolution',
            strategy: 'timestamp_based_merge',
            handler: this.resolveLabelGenerationConflict.bind(this),
            priority: 'medium'
        });

        // Estratégia para conflitos de sessão de usuário
        this.conflictStrategies.set('user_session', {
            name: 'User Session Resolution',
            strategy: 'most_recent_wins',
            handler: this.resolveUserSessionConflict.bind(this),
            priority: 'low'
        });

        // Estratégia para conflitos de estatísticas de aplicação
        this.conflictStrategies.set('application_stats', {
            name: 'Application Stats Resolution',
            strategy: 'additive_merge',
            handler: this.resolveApplicationStatsConflict.bind(this),
            priority: 'medium'
        });

        console.log(`📋 ${this.conflictStrategies.size} estratégias de resolução configuradas`);
    }

    /**
     * Detectar e resolver conflitos automaticamente
     */
    async detectAndResolveConflicts(localData, remoteData, dataType) {
        try {
            console.log(`🔍 Detectando conflitos para tipo: ${dataType}`);
            
            // Verificar se há conflito
            const conflict = this.detectConflict(localData, remoteData, dataType);
            
            if (!conflict.hasConflict) {
                console.log(`✅ Nenhum conflito detectado para ${dataType}`);
                return {
                    hasConflict: false,
                    resolution: null,
                    resolvedData: remoteData || localData
                };
            }

            console.log(`⚠️ Conflito detectado para ${dataType}:`, conflict.details);
            
            // Obter estratégia de resolução
            const strategy = this.conflictStrategies.get(dataType);
            
            if (!strategy) {
                throw new Error(`Estratégia de resolução não encontrada para tipo: ${dataType}`);
            }

            // Executar resolução
            const resolution = await strategy.handler(localData, remoteData, conflict);
            
            // Registrar resolução
            this.logResolution(dataType, conflict, resolution, strategy);
            
            // Auditar resolução
            await this.auditResolution(dataType, conflict, resolution);
            
            console.log(`✅ Conflito resolvido para ${dataType} usando estratégia: ${strategy.strategy}`);
            
            return {
                hasConflict: true,
                conflict: conflict,
                resolution: resolution,
                resolvedData: resolution.resolvedData,
                strategy: strategy.name
            };
            
        } catch (error) {
            console.error(`❌ Erro na resolução de conflito para ${dataType}:`, error);
            
            // Log do erro
            this.logError('CONFLICT_RESOLUTION', error, { dataType, localData, remoteData });
            
            // Fallback: usar dados locais
            return {
                hasConflict: true,
                error: error.message,
                resolution: 'fallback_to_local',
                resolvedData: localData
            };
        }
    }

    /**
     * Detectar se há conflito entre dados locais e remotos
     */
    detectConflict(localData, remoteData, dataType) {
        if (!localData && !remoteData) {
            return { hasConflict: false };
        }

        if (!localData || !remoteData) {
            return { hasConflict: false }; // Não é conflito, apenas dados ausentes
        }

        const conflict = {
            hasConflict: false,
            type: dataType,
            details: {},
            severity: 'low'
        };

        switch (dataType) {
            case 'global_counter':
                return this.detectGlobalCounterConflict(localData, remoteData);
                
            case 'label_generation':
                return this.detectLabelGenerationConflict(localData, remoteData);
                
            case 'user_session':
                return this.detectUserSessionConflict(localData, remoteData);
                
            case 'application_stats':
                return this.detectApplicationStatsConflict(localData, remoteData);
                
            default:
                // Conflito genérico baseado em timestamp
                return this.detectGenericTimestampConflict(localData, remoteData);
        }
    }

    /**
     * Detectar conflito de contador global
     */
    detectGlobalCounterConflict(localData, remoteData) {
        const conflict = {
            hasConflict: false,
            type: 'global_counter',
            details: {},
            severity: 'high'
        };

        // Verificar diferenças no total
        if (localData.total_count !== remoteData.total_count) {
            conflict.hasConflict = true;
            conflict.details.totalCountDifference = {
                local: localData.total_count,
                remote: remoteData.total_count,
                difference: Math.abs(localData.total_count - remoteData.total_count)
            };
        }

        // Verificar diferenças no breakdown por aplicação
        const localBreakdown = localData.application_breakdown || {};
        const remoteBreakdown = remoteData.application_breakdown || {};
        
        const allApps = new Set([...Object.keys(localBreakdown), ...Object.keys(remoteBreakdown)]);
        const breakdownDifferences = {};
        
        for (const app of allApps) {
            const localCount = localBreakdown[app] || 0;
            const remoteCount = remoteBreakdown[app] || 0;
            
            if (localCount !== remoteCount) {
                breakdownDifferences[app] = {
                    local: localCount,
                    remote: remoteCount,
                    difference: Math.abs(localCount - remoteCount)
                };
            }
        }
        
        if (Object.keys(breakdownDifferences).length > 0) {
            conflict.hasConflict = true;
            conflict.details.breakdownDifferences = breakdownDifferences;
        }

        // Verificar timestamps
        const localTime = new Date(localData.last_updated);
        const remoteTime = new Date(remoteData.last_updated);
        const timeDiff = Math.abs(localTime.getTime() - remoteTime.getTime());
        
        if (timeDiff > 60000) { // Mais de 1 minuto de diferença
            conflict.details.timestampDifference = {
                local: localData.last_updated,
                remote: remoteData.last_updated,
                differenceMs: timeDiff
            };
        }

        return conflict;
    }

    /**
     * Detectar conflito de geração de etiquetas
     */
    detectLabelGenerationConflict(localData, remoteData) {
        const conflict = {
            hasConflict: false,
            type: 'label_generation',
            details: {},
            severity: 'medium'
        };

        // Verificar se são o mesmo registro (mesmo ID ou critérios únicos)
        const sameRecord = this.isSameLabelRecord(localData, remoteData);
        
        if (!sameRecord) {
            return conflict; // Não são o mesmo registro, não há conflito
        }

        // Verificar diferenças nos dados
        const differences = {};
        
        const fieldsToCheck = ['quantity', 'copies', 'coddv', 'application_type', 'metadata'];
        
        for (const field of fieldsToCheck) {
            if (JSON.stringify(localData[field]) !== JSON.stringify(remoteData[field])) {
                differences[field] = {
                    local: localData[field],
                    remote: remoteData[field]
                };
            }
        }
        
        if (Object.keys(differences).length > 0) {
            conflict.hasConflict = true;
            conflict.details.fieldDifferences = differences;
        }

        // Verificar timestamps
        const localTime = new Date(localData.created_at || localData.timestamp);
        const remoteTime = new Date(remoteData.created_at || remoteData.timestamp);
        const timeDiff = Math.abs(localTime.getTime() - remoteTime.getTime());
        
        conflict.details.timestampDifference = {
            local: localData.created_at || localData.timestamp,
            remote: remoteData.created_at || remoteData.timestamp,
            differenceMs: timeDiff
        };

        return conflict;
    }

    /**
     * Detectar conflito de sessão de usuário
     */
    detectUserSessionConflict(localData, remoteData) {
        const conflict = {
            hasConflict: false,
            type: 'user_session',
            details: {},
            severity: 'low'
        };

        // Verificar se são a mesma sessão
        if (localData.session_id !== remoteData.session_id) {
            return conflict; // Sessões diferentes, não há conflito
        }

        // Verificar diferenças na atividade
        const localActivity = new Date(localData.last_activity);
        const remoteActivity = new Date(remoteData.last_activity);
        
        if (localActivity.getTime() !== remoteActivity.getTime()) {
            conflict.hasConflict = true;
            conflict.details.activityDifference = {
                local: localData.last_activity,
                remote: remoteData.last_activity,
                differenceMs: Math.abs(localActivity.getTime() - remoteActivity.getTime())
            };
        }

        // Verificar status de atividade
        if (localData.is_active !== remoteData.is_active) {
            conflict.hasConflict = true;
            conflict.details.statusDifference = {
                local: localData.is_active,
                remote: remoteData.is_active
            };
        }

        return conflict;
    }

    /**
     * Detectar conflito de estatísticas de aplicação
     */
    detectApplicationStatsConflict(localData, remoteData) {
        const conflict = {
            hasConflict: false,
            type: 'application_stats',
            details: {},
            severity: 'medium'
        };

        // Verificar se são as mesmas estatísticas (mesmo app e data)
        if (localData.application_type !== remoteData.application_type || 
            localData.date !== remoteData.date) {
            return conflict; // Estatísticas diferentes, não há conflito
        }

        // Verificar diferenças nos valores
        const differences = {};
        const fieldsToCheck = ['total_generations', 'total_labels', 'peak_hour', 'error_count'];
        
        for (const field of fieldsToCheck) {
            if (localData[field] !== remoteData[field]) {
                differences[field] = {
                    local: localData[field],
                    remote: remoteData[field]
                };
            }
        }
        
        if (Object.keys(differences).length > 0) {
            conflict.hasConflict = true;
            conflict.details.statsDifferences = differences;
        }

        return conflict;
    }

    /**
     * Detectar conflito genérico baseado em timestamp
     */
    detectGenericTimestampConflict(localData, remoteData) {
        const conflict = {
            hasConflict: false,
            type: 'generic',
            details: {},
            severity: 'low'
        };

        // Tentar encontrar campos de timestamp
        const timestampFields = ['updated_at', 'last_updated', 'created_at', 'timestamp'];
        
        for (const field of timestampFields) {
            if (localData[field] && remoteData[field]) {
                const localTime = new Date(localData[field]);
                const remoteTime = new Date(remoteData[field]);
                const timeDiff = Math.abs(localTime.getTime() - remoteTime.getTime());
                
                if (timeDiff > 5000) { // Mais de 5 segundos de diferença
                    conflict.hasConflict = true;
                    conflict.details.timestampConflict = {
                        field: field,
                        local: localData[field],
                        remote: remoteData[field],
                        differenceMs: timeDiff
                    };
                    break;
                }
            }
        }

        return conflict;
    }

    /**
     * Resolver conflito de contador global
     */
    async resolveGlobalCounterConflict(localData, remoteData, conflict) {
        console.log('🔧 Resolvendo conflito de contador global...');
        
        const resolution = {
            strategy: 'last_write_wins_with_merge',
            resolvedData: {},
            actions: [],
            reasoning: []
        };

        // Usar o maior valor total (assumindo que incrementos não devem ser perdidos)
        const localTotal = localData.total_count || 0;
        const remoteTotal = remoteData.total_count || 0;
        
        if (localTotal > remoteTotal) {
            resolution.resolvedData.total_count = localTotal;
            resolution.actions.push('used_local_total_count');
            resolution.reasoning.push(`Local total (${localTotal}) > Remote total (${remoteTotal})`);
        } else {
            resolution.resolvedData.total_count = remoteTotal;
            resolution.actions.push('used_remote_total_count');
            resolution.reasoning.push(`Remote total (${remoteTotal}) >= Local total (${localTotal})`);
        }

        // Merge do breakdown por aplicação (somar valores)
        const localBreakdown = localData.application_breakdown || {};
        const remoteBreakdown = remoteData.application_breakdown || {};
        const mergedBreakdown = {};
        
        const allApps = new Set([...Object.keys(localBreakdown), ...Object.keys(remoteBreakdown)]);
        
        for (const app of allApps) {
            const localCount = localBreakdown[app] || 0;
            const remoteCount = remoteBreakdown[app] || 0;
            
            // Usar o maior valor para cada aplicação
            mergedBreakdown[app] = Math.max(localCount, remoteCount);
        }
        
        resolution.resolvedData.application_breakdown = mergedBreakdown;
        resolution.actions.push('merged_application_breakdown');
        resolution.reasoning.push('Used maximum values for each application type');

        // Usar timestamp mais recente
        const localTime = new Date(localData.last_updated);
        const remoteTime = new Date(remoteData.last_updated);
        
        if (localTime > remoteTime) {
            resolution.resolvedData.last_updated = localData.last_updated;
            resolution.actions.push('used_local_timestamp');
        } else {
            resolution.resolvedData.last_updated = remoteData.last_updated;
            resolution.actions.push('used_remote_timestamp');
        }

        // Incrementar versão
        const localVersion = localData.version || 1;
        const remoteVersion = remoteData.version || 1;
        resolution.resolvedData.version = Math.max(localVersion, remoteVersion) + 1;
        resolution.actions.push('incremented_version');

        console.log('✅ Conflito de contador global resolvido:', resolution);
        return resolution;
    }

    /**
     * Resolver conflito de geração de etiquetas
     */
    async resolveLabelGenerationConflict(localData, remoteData, conflict) {
        console.log('🔧 Resolvendo conflito de geração de etiquetas...');
        
        const resolution = {
            strategy: 'timestamp_based_merge',
            resolvedData: {},
            actions: [],
            reasoning: []
        };

        // Usar dados do registro mais recente baseado no timestamp
        const localTime = new Date(localData.created_at || localData.timestamp);
        const remoteTime = new Date(remoteData.created_at || remoteData.timestamp);
        
        if (localTime > remoteTime) {
            resolution.resolvedData = { ...localData };
            resolution.actions.push('used_local_data');
            resolution.reasoning.push(`Local timestamp (${localTime.toISOString()}) > Remote timestamp (${remoteTime.toISOString()})`);
        } else {
            resolution.resolvedData = { ...remoteData };
            resolution.actions.push('used_remote_data');
            resolution.reasoning.push(`Remote timestamp (${remoteTime.toISOString()}) >= Local timestamp (${localTime.toISOString()})`);
        }

        // Merge de metadata se ambos tiverem
        if (localData.metadata && remoteData.metadata) {
            resolution.resolvedData.metadata = {
                ...remoteData.metadata,
                ...localData.metadata,
                conflict_resolved: true,
                resolution_timestamp: new Date().toISOString()
            };
            resolution.actions.push('merged_metadata');
            resolution.reasoning.push('Merged metadata from both sources');
        }

        // Garantir que synced_at seja atualizado
        resolution.resolvedData.synced_at = new Date().toISOString();
        resolution.actions.push('updated_sync_timestamp');

        console.log('✅ Conflito de geração de etiquetas resolvido:', resolution);
        return resolution;
    }

    /**
     * Resolver conflito de sessão de usuário
     */
    async resolveUserSessionConflict(localData, remoteData, conflict) {
        console.log('🔧 Resolvendo conflito de sessão de usuário...');
        
        const resolution = {
            strategy: 'most_recent_wins',
            resolvedData: {},
            actions: [],
            reasoning: []
        };

        // Usar dados da sessão com atividade mais recente
        const localActivity = new Date(localData.last_activity);
        const remoteActivity = new Date(remoteData.last_activity);
        
        if (localActivity > remoteActivity) {
            resolution.resolvedData = { ...localData };
            resolution.actions.push('used_local_session');
            resolution.reasoning.push(`Local activity (${localActivity.toISOString()}) > Remote activity (${remoteActivity.toISOString()})`);
        } else {
            resolution.resolvedData = { ...remoteData };
            resolution.actions.push('used_remote_session');
            resolution.reasoning.push(`Remote activity (${remoteActivity.toISOString()}) >= Local activity (${localActivity.toISOString()})`);
        }

        console.log('✅ Conflito de sessão de usuário resolvido:', resolution);
        return resolution;
    }

    /**
     * Resolver conflito de estatísticas de aplicação
     */
    async resolveApplicationStatsConflict(localData, remoteData, conflict) {
        console.log('🔧 Resolvendo conflito de estatísticas de aplicação...');
        
        const resolution = {
            strategy: 'additive_merge',
            resolvedData: {},
            actions: [],
            reasoning: []
        };

        // Começar com dados remotos como base
        resolution.resolvedData = { ...remoteData };

        // Somar valores aditivos (gerações e labels)
        const additiveFields = ['total_generations', 'total_labels', 'error_count'];
        
        for (const field of additiveFields) {
            const localValue = localData[field] || 0;
            const remoteValue = remoteData[field] || 0;
            
            // Usar o maior valor (assumindo que não devemos perder contagens)
            resolution.resolvedData[field] = Math.max(localValue, remoteValue);
            
            if (localValue !== remoteValue) {
                resolution.actions.push(`resolved_${field}`);
                resolution.reasoning.push(`Used max value for ${field}: max(${localValue}, ${remoteValue}) = ${resolution.resolvedData[field]}`);
            }
        }

        // Para peak_hour, usar o valor do dataset com mais gerações
        const localGenerations = localData.total_generations || 0;
        const remoteGenerations = remoteData.total_generations || 0;
        
        if (localGenerations > remoteGenerations) {
            resolution.resolvedData.peak_hour = localData.peak_hour;
            resolution.actions.push('used_local_peak_hour');
            resolution.reasoning.push(`Local has more generations (${localGenerations} > ${remoteGenerations})`);
        } else {
            resolution.resolvedData.peak_hour = remoteData.peak_hour;
            resolution.actions.push('used_remote_peak_hour');
            resolution.reasoning.push(`Remote has more or equal generations (${remoteGenerations} >= ${localGenerations})`);
        }

        console.log('✅ Conflito de estatísticas de aplicação resolvido:', resolution);
        return resolution;
    }

    /**
     * Verificar se dois registros de etiqueta são o mesmo
     */
    isSameLabelRecord(localData, remoteData) {
        // Verificar por ID se disponível
        if (localData.id && remoteData.id) {
            return localData.id === remoteData.id;
        }

        // Verificar por critérios únicos
        const sameApp = localData.application_type === remoteData.application_type;
        const sameCoddv = localData.coddv === remoteData.coddv;
        const sameQuantity = localData.quantity === remoteData.quantity;
        
        // Verificar proximidade de timestamp (dentro de 1 minuto)
        const localTime = new Date(localData.created_at || localData.timestamp);
        const remoteTime = new Date(remoteData.created_at || remoteData.timestamp);
        const timeDiff = Math.abs(localTime.getTime() - remoteTime.getTime());
        const sameTime = timeDiff < 60000; // 1 minuto
        
        return sameApp && sameCoddv && sameQuantity && sameTime;
    }

    /**
     * Registrar resolução de conflito
     */
    logResolution(dataType, conflict, resolution, strategy) {
        const logEntry = {
            id: this.generateResolutionId(),
            timestamp: new Date().toISOString(),
            dataType,
            conflict: {
                type: conflict.type,
                severity: conflict.severity,
                details: conflict.details
            },
            resolution: {
                strategy: resolution.strategy,
                actions: resolution.actions,
                reasoning: resolution.reasoning
            },
            strategyUsed: strategy.name
        };

        this.resolutionLog.push(logEntry);
        
        // Manter apenas as últimas 1000 resoluções
        if (this.resolutionLog.length > this.maxLogEntries) {
            this.resolutionLog = this.resolutionLog.slice(-this.maxLogEntries);
        }

        console.log(`📝 Resolução registrada: ${logEntry.id}`, logEntry);
    }

    /**
     * Auditar resolução de conflito
     */
    async auditResolution(dataType, conflict, resolution) {
        const auditEntry = {
            id: this.generateAuditId(),
            timestamp: new Date().toISOString(),
            dataType,
            conflictSeverity: conflict.severity,
            resolutionStrategy: resolution.strategy,
            actionsCount: resolution.actions.length,
            success: true,
            metadata: {
                hasResolvedData: !!resolution.resolvedData,
                reasoningProvided: resolution.reasoning.length > 0,
                conflictDetails: Object.keys(conflict.details).length
            }
        };

        this.auditLog.push(auditEntry);
        
        // Manter apenas as últimas 1000 auditorias
        if (this.auditLog.length > this.maxLogEntries) {
            this.auditLog = this.auditLog.slice(-this.maxLogEntries);
        }

        // Salvar auditoria crítica no localStorage para persistência
        if (conflict.severity === 'high') {
            this.saveCriticalAudit(auditEntry);
        }

        console.log(`🔍 Auditoria registrada: ${auditEntry.id}`, auditEntry);
    }

    /**
     * Salvar auditoria crítica
     */
    saveCriticalAudit(auditEntry) {
        try {
            const criticalAudits = JSON.parse(
                localStorage.getItem('conflict_resolution_critical_audits') || '[]'
            );
            
            criticalAudits.push(auditEntry);
            
            // Manter apenas as últimas 50 auditorias críticas
            if (criticalAudits.length > 50) {
                criticalAudits.splice(0, criticalAudits.length - 50);
            }
            
            localStorage.setItem(
                'conflict_resolution_critical_audits', 
                JSON.stringify(criticalAudits)
            );
        } catch (error) {
            console.warn('⚠️ Não foi possível salvar auditoria crítica:', error);
        }
    }

    /**
     * Log de erro
     */
    logError(category, error, context = {}) {
        const errorEntry = {
            timestamp: new Date().toISOString(),
            category,
            message: error.message || String(error),
            stack: error.stack,
            context: this.sanitizeDataForLog(context),
            id: this.generateErrorId()
        };
        
        console.error(`❌ [${category}] ${errorEntry.message}`, errorEntry);
    }

    /**
     * Sanitizar dados para log
     */
    sanitizeDataForLog(data) {
        if (!data || typeof data !== 'object') return data;
        
        const sanitized = { ...data };
        
        // Remover campos sensíveis
        const sensitiveFields = ['password', 'token', 'key', 'secret'];
        sensitiveFields.forEach(field => {
            if (sanitized[field]) {
                sanitized[field] = '[REDACTED]';
            }
        });
        
        return sanitized;
    }

    /**
     * Gerar ID único para resolução
     */
    generateResolutionId() {
        return `res_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Gerar ID único para auditoria
     */
    generateAuditId() {
        return `aud_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Gerar ID único para erro
     */
    generateErrorId() {
        return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Obter estatísticas de resolução
     */
    getResolutionStats() {
        const stats = {
            totalResolutions: this.resolutionLog.length,
            totalAudits: this.auditLog.length,
            resolutionsByType: {},
            resolutionsByStrategy: {},
            severityDistribution: {},
            recentResolutions: this.resolutionLog.slice(-10)
        };

        // Agrupar por tipo
        this.resolutionLog.forEach(entry => {
            const type = entry.dataType;
            stats.resolutionsByType[type] = (stats.resolutionsByType[type] || 0) + 1;
        });

        // Agrupar por estratégia
        this.resolutionLog.forEach(entry => {
            const strategy = entry.resolution.strategy;
            stats.resolutionsByStrategy[strategy] = (stats.resolutionsByStrategy[strategy] || 0) + 1;
        });

        // Distribuição de severidade
        this.resolutionLog.forEach(entry => {
            const severity = entry.conflict.severity;
            stats.severityDistribution[severity] = (stats.severityDistribution[severity] || 0) + 1;
        });

        return stats;
    }

    /**
     * Exportar logs para análise
     */
    exportLogs() {
        const exportData = {
            timestamp: new Date().toISOString(),
            resolutionLog: this.resolutionLog,
            auditLog: this.auditLog,
            stats: this.getResolutionStats(),
            strategies: Array.from(this.conflictStrategies.entries()).map(([key, value]) => ({
                type: key,
                ...value
            }))
        };
        
        return JSON.stringify(exportData, null, 2);
    }

    /**
     * Limpar logs (para testes)
     */
    clearLogs() {
        this.resolutionLog = [];
        this.auditLog = [];
        
        // Limpar também do localStorage
        localStorage.removeItem('conflict_resolution_critical_audits');
        
        console.log('🗑️ Logs de resolução de conflitos limpos');
    }
}

// Exportar instância singleton
export const conflictResolver = new ConflictResolver();
export default conflictResolver;