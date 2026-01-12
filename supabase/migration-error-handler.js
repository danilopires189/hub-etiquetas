/**
 * Sistema de Tratamento de Erros para Migração
 * Gerencia logs detalhados, recuperação de erros e verificação de integridade
 */

class MigrationErrorHandler {
    constructor() {
        this.errorLog = [];
        this.recoveryLog = [];
        this.integrityChecks = [];
        this.maxRetries = 3;
        this.retryDelay = 1000; // 1 segundo
        
        console.log('🛡️ MigrationErrorHandler inicializado');
    }

    /**
     * Executar operação com retry automático
     */
    async executeWithRetry(operation, context, maxRetries = this.maxRetries) {
        let lastError = null;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const result = await operation();
                
                if (attempt > 1) {
                    this.logRecovery(context, `Sucesso na tentativa ${attempt}/${maxRetries}`, {
                        previousErrors: lastError?.message,
                        attempt
                    });
                }
                
                return { success: true, result, attempt };
                
            } catch (error) {
                lastError = error;
                
                this.logError(context, error, {
                    attempt,
                    maxRetries,
                    willRetry: attempt < maxRetries
                });
                
                if (attempt < maxRetries) {
                    console.log(`⏳ Aguardando ${this.retryDelay}ms antes da próxima tentativa...`);
                    await this.delay(this.retryDelay * attempt); // Backoff exponencial
                } else {
                    console.error(`❌ Falha definitiva após ${maxRetries} tentativas`);
                }
            }
        }
        
        return { 
            success: false, 
            error: lastError, 
            attempts: maxRetries,
            context 
        };
    }

    /**
     * Validar dados antes da migração
     */
    validateMigrationData(data, dataType) {
        const validationErrors = [];
        
        try {
            switch (dataType) {
                case 'globalCounter':
                    if (!data || typeof data !== 'object') {
                        validationErrors.push('Dados do contador global inválidos');
                    }
                    if (typeof data.totalEtiquetas !== 'number' || data.totalEtiquetas < 0) {
                        validationErrors.push('Total de etiquetas inválido');
                    }
                    break;
                    
                case 'historyRecord':
                    if (!data || typeof data !== 'object') {
                        validationErrors.push('Registro de histórico inválido');
                    }
                    if (!data.etiquetaId && !data.id) {
                        validationErrors.push('ID da etiqueta ausente');
                    }
                    if (!data.timestamp && !data.dataCriacao) {
                        validationErrors.push('Timestamp ausente');
                    }
                    break;
                    
                case 'offlineOperation':
                    if (!data || typeof data !== 'object') {
                        validationErrors.push('Operação offline inválida');
                    }
                    if (!data.operation) {
                        validationErrors.push('Tipo de operação ausente');
                    }
                    if (!data.data) {
                        validationErrors.push('Dados da operação ausentes');
                    }
                    break;
                    
                default:
                    validationErrors.push(`Tipo de dados desconhecido: ${dataType}`);
            }
            
            if (validationErrors.length > 0) {
                this.logError('VALIDATION', new Error(validationErrors.join('; ')), {
                    dataType,
                    data: this.sanitizeDataForLog(data)
                });
                return { valid: false, errors: validationErrors };
            }
            
            return { valid: true, errors: [] };
            
        } catch (error) {
            this.logError('VALIDATION', error, { dataType });
            return { valid: false, errors: [error.message] };
        }
    }

    /**
     * Verificar integridade pós-migração
     */
    async verifyPostMigrationIntegrity(migrationResults) {
        console.log('🔍 Iniciando verificação de integridade pós-migração...');
        
        const checks = [];
        
        try {
            // Verificar contador global
            const counterCheck = await this.verifyCounterIntegrity(migrationResults);
            checks.push(counterCheck);
            
            // Verificar consistência de dados
            const dataConsistencyCheck = await this.verifyDataConsistency(migrationResults);
            checks.push(dataConsistencyCheck);
            
            // Verificar duplicatas
            const duplicateCheck = await this.verifyNoDuplicates();
            checks.push(duplicateCheck);
            
            // Verificar timestamps
            const timestampCheck = await this.verifyTimestamps();
            checks.push(timestampCheck);
            
            const overallSuccess = checks.every(check => check.passed);
            
            const integrityReport = {
                passed: overallSuccess,
                timestamp: new Date().toISOString(),
                checks,
                summary: {
                    total: checks.length,
                    passed: checks.filter(c => c.passed).length,
                    failed: checks.filter(c => !c.passed).length
                }
            };
            
            this.integrityChecks.push(integrityReport);
            
            if (overallSuccess) {
                console.log('✅ Verificação de integridade passou em todos os testes');
            } else {
                console.warn('⚠️ Alguns testes de integridade falharam');
                this.logError('INTEGRITY', new Error('Falhas na verificação de integridade'), integrityReport);
            }
            
            return integrityReport;
            
        } catch (error) {
            this.logError('INTEGRITY', error, { migrationResults });
            return {
                passed: false,
                timestamp: new Date().toISOString(),
                error: error.message,
                checks: []
            };
        }
    }

    /**
     * Verificar integridade do contador
     */
    async verifyCounterIntegrity(migrationResults) {
        try {
            // Importar supabaseManager dinamicamente para evitar dependência circular
            const { supabaseManager } = await import('./client.js');
            
            const counterStats = await supabaseManager.getCounterStats();
            
            const checks = {
                hasCounter: counterStats.total_count !== undefined,
                positiveCount: counterStats.total_count >= 0,
                hasBreakdown: counterStats.application_breakdown !== null,
                recentUpdate: new Date(counterStats.last_updated) > new Date(Date.now() - 24 * 60 * 60 * 1000)
            };
            
            const passed = Object.values(checks).every(Boolean);
            
            return {
                name: 'Counter Integrity',
                passed,
                details: checks,
                data: counterStats
            };
            
        } catch (error) {
            return {
                name: 'Counter Integrity',
                passed: false,
                error: error.message
            };
        }
    }

    /**
     * Verificar consistência de dados
     */
    async verifyDataConsistency(migrationResults) {
        try {
            const { supabaseManager } = await import('./client.js');
            
            // Contar labels migradas
            const { data: migratedLabels, error } = await supabaseManager.client
                .from('labels')
                .select('id, quantity, copies, application_type')
                .contains('metadata', { migratedFrom: 'localStorage' });
                
            if (error) throw error;
            
            // Calcular total de etiquetas das labels migradas
            const totalFromLabels = migratedLabels.reduce((sum, label) => {
                return sum + (label.quantity * label.copies);
            }, 0);
            
            // Obter contador atual
            const counterStats = await supabaseManager.getCounterStats();
            
            const checks = {
                hasLabels: migratedLabels.length > 0,
                consistentCount: totalFromLabels <= counterStats.total_count,
                validApplicationTypes: migratedLabels.every(label => 
                    ['placas', 'caixa', 'avulso', 'enderec', 'transfer', 'termo', 
                     'pedido-direto', 'etiqueta-mercadoria', 'inventario'].includes(label.application_type)
                )
            };
            
            const passed = Object.values(checks).every(Boolean);
            
            return {
                name: 'Data Consistency',
                passed,
                details: checks,
                data: {
                    migratedLabelsCount: migratedLabels.length,
                    totalFromLabels,
                    counterTotal: counterStats.total_count
                }
            };
            
        } catch (error) {
            return {
                name: 'Data Consistency',
                passed: false,
                error: error.message
            };
        }
    }

    /**
     * Verificar duplicatas
     */
    async verifyNoDuplicates() {
        try {
            const { supabaseManager } = await import('./client.js');
            
            // Buscar possíveis duplicatas baseadas em critérios similares
            const { data: labels, error } = await supabaseManager.client
                .from('labels')
                .select('coddv, application_type, quantity, created_at')
                .contains('metadata', { migratedFrom: 'localStorage' });
                
            if (error) throw error;
            
            // Agrupar por critérios únicos
            const groups = {};
            let duplicateCount = 0;
            
            labels.forEach(label => {
                const key = `${label.application_type}-${label.coddv}-${label.quantity}`;
                if (!groups[key]) {
                    groups[key] = [];
                }
                groups[key].push(label);
            });
            
            // Contar grupos com mais de 1 item
            Object.values(groups).forEach(group => {
                if (group.length > 1) {
                    duplicateCount += group.length - 1; // Contar apenas os extras
                }
            });
            
            const passed = duplicateCount === 0;
            
            return {
                name: 'No Duplicates',
                passed,
                details: {
                    totalLabels: labels.length,
                    uniqueGroups: Object.keys(groups).length,
                    duplicateCount
                }
            };
            
        } catch (error) {
            return {
                name: 'No Duplicates',
                passed: false,
                error: error.message
            };
        }
    }

    /**
     * Verificar timestamps válidos
     */
    async verifyTimestamps() {
        try {
            const { supabaseManager } = await import('./client.js');
            
            const { data: labels, error } = await supabaseManager.client
                .from('labels')
                .select('created_at, synced_at')
                .contains('metadata', { migratedFrom: 'localStorage' })
                .limit(100); // Amostra para performance
                
            if (error) throw error;
            
            const now = new Date();
            const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
            
            let validTimestamps = 0;
            let invalidTimestamps = 0;
            
            labels.forEach(label => {
                const createdAt = new Date(label.created_at);
                const syncedAt = new Date(label.synced_at);
                
                if (createdAt >= oneYearAgo && createdAt <= now && 
                    syncedAt >= oneYearAgo && syncedAt <= now) {
                    validTimestamps++;
                } else {
                    invalidTimestamps++;
                }
            });
            
            const passed = invalidTimestamps === 0;
            
            return {
                name: 'Valid Timestamps',
                passed,
                details: {
                    sampleSize: labels.length,
                    validTimestamps,
                    invalidTimestamps
                }
            };
            
        } catch (error) {
            return {
                name: 'Valid Timestamps',
                passed: false,
                error: error.message
            };
        }
    }

    /**
     * Recuperar de erro específico
     */
    async recoverFromError(errorType, errorData, recoveryStrategy) {
        console.log(`🔧 Tentando recuperação de erro: ${errorType}`);
        
        try {
            let recoveryResult = null;
            
            switch (recoveryStrategy) {
                case 'skip_and_continue':
                    recoveryResult = await this.skipAndContinue(errorData);
                    break;
                    
                case 'retry_with_fallback':
                    recoveryResult = await this.retryWithFallback(errorData);
                    break;
                    
                case 'partial_recovery':
                    recoveryResult = await this.partialRecovery(errorData);
                    break;
                    
                default:
                    throw new Error(`Estratégia de recuperação desconhecida: ${recoveryStrategy}`);
            }
            
            this.logRecovery(errorType, `Recuperação bem-sucedida: ${recoveryStrategy}`, {
                originalError: errorData,
                recoveryResult
            });
            
            return { success: true, result: recoveryResult };
            
        } catch (recoveryError) {
            this.logError('RECOVERY', recoveryError, {
                originalErrorType: errorType,
                originalErrorData: errorData,
                recoveryStrategy
            });
            
            return { success: false, error: recoveryError };
        }
    }

    /**
     * Estratégia: pular e continuar
     */
    async skipAndContinue(errorData) {
        console.log('⏭️ Pulando item com erro e continuando...');
        
        // Salvar item problemático para revisão manual
        const problematicItem = {
            timestamp: new Date().toISOString(),
            data: this.sanitizeDataForLog(errorData),
            reason: 'skipped_due_to_error'
        };
        
        const existingProblematic = JSON.parse(
            localStorage.getItem('migration_problematic_items') || '[]'
        );
        existingProblematic.push(problematicItem);
        
        localStorage.setItem(
            'migration_problematic_items', 
            JSON.stringify(existingProblematic)
        );
        
        return { action: 'skipped', saved: true };
    }

    /**
     * Estratégia: retry com fallback
     */
    async retryWithFallback(errorData) {
        console.log('🔄 Tentando novamente com dados simplificados...');
        
        // Simplificar dados para retry
        const simplifiedData = this.simplifyDataForRetry(errorData);
        
        return { action: 'retry_with_fallback', simplifiedData };
    }

    /**
     * Estratégia: recuperação parcial
     */
    async partialRecovery(errorData) {
        console.log('🔧 Tentando recuperação parcial...');
        
        // Extrair partes válidas dos dados
        const validParts = this.extractValidParts(errorData);
        
        return { action: 'partial_recovery', validParts };
    }

    /**
     * Simplificar dados para retry
     */
    simplifyDataForRetry(data) {
        if (!data || typeof data !== 'object') return {};
        
        // Manter apenas campos essenciais
        const essential = {};
        
        if (data.etiquetaId) essential.etiquetaId = data.etiquetaId;
        if (data.quantity) essential.quantity = data.quantity;
        if (data.applicationType) essential.applicationType = data.applicationType;
        if (data.timestamp) essential.timestamp = data.timestamp;
        
        return essential;
    }

    /**
     * Extrair partes válidas dos dados
     */
    extractValidParts(data) {
        if (!data || typeof data !== 'object') return {};
        
        const valid = {};
        
        // Validar cada campo individualmente
        Object.keys(data).forEach(key => {
            try {
                const value = data[key];
                
                // Validações básicas por tipo
                if (typeof value === 'string' && value.length > 0 && value.length < 1000) {
                    valid[key] = value;
                } else if (typeof value === 'number' && !isNaN(value) && isFinite(value)) {
                    valid[key] = value;
                } else if (typeof value === 'boolean') {
                    valid[key] = value;
                } else if (value instanceof Date || (typeof value === 'string' && !isNaN(Date.parse(value)))) {
                    valid[key] = value;
                }
            } catch (error) {
                // Pular campos problemáticos
            }
        });
        
        return valid;
    }

    /**
     * Log de erro detalhado
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
        
        this.errorLog.push(errorEntry);
        
        // Manter apenas os últimos 1000 erros
        if (this.errorLog.length > 1000) {
            this.errorLog = this.errorLog.slice(-1000);
        }
        
        console.error(`❌ [${category}] ${errorEntry.message}`, {
            id: errorEntry.id,
            context: errorEntry.context
        });
        
        // Salvar erros críticos no localStorage para persistência
        if (this.isCriticalError(error)) {
            this.saveCriticalError(errorEntry);
        }
    }

    /**
     * Log de recuperação
     */
    logRecovery(category, message, context = {}) {
        const recoveryEntry = {
            timestamp: new Date().toISOString(),
            category,
            message,
            context: this.sanitizeDataForLog(context),
            id: this.generateErrorId()
        };
        
        this.recoveryLog.push(recoveryEntry);
        
        console.log(`🔧 [${category}] ${message}`, recoveryEntry.context);
    }

    /**
     * Verificar se é erro crítico
     */
    isCriticalError(error) {
        const criticalPatterns = [
            /connection/i,
            /network/i,
            /timeout/i,
            /quota.*exceeded/i,
            /permission.*denied/i
        ];
        
        return criticalPatterns.some(pattern => 
            pattern.test(error.message || String(error))
        );
    }

    /**
     * Salvar erro crítico
     */
    saveCriticalError(errorEntry) {
        try {
            const criticalErrors = JSON.parse(
                localStorage.getItem('migration_critical_errors') || '[]'
            );
            
            criticalErrors.push(errorEntry);
            
            // Manter apenas os últimos 50 erros críticos
            if (criticalErrors.length > 50) {
                criticalErrors.splice(0, criticalErrors.length - 50);
            }
            
            localStorage.setItem(
                'migration_critical_errors', 
                JSON.stringify(criticalErrors)
            );
        } catch (storageError) {
            console.warn('⚠️ Não foi possível salvar erro crítico:', storageError);
        }
    }

    /**
     * Sanitizar dados para log (remover informações sensíveis)
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
        
        // Truncar strings muito longas
        Object.keys(sanitized).forEach(key => {
            if (typeof sanitized[key] === 'string' && sanitized[key].length > 500) {
                sanitized[key] = sanitized[key].substring(0, 500) + '...[TRUNCATED]';
            }
        });
        
        return sanitized;
    }

    /**
     * Gerar ID único para erro
     */
    generateErrorId() {
        return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Delay para retry
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Obter relatório de erros
     */
    getErrorReport() {
        return {
            totalErrors: this.errorLog.length,
            totalRecoveries: this.recoveryLog.length,
            criticalErrors: this.errorLog.filter(e => this.isCriticalError({ message: e.message })).length,
            recentErrors: this.errorLog.slice(-10),
            recentRecoveries: this.recoveryLog.slice(-10),
            integrityChecks: this.integrityChecks.length
        };
    }

    /**
     * Limpar logs (para testes)
     */
    clearLogs() {
        this.errorLog = [];
        this.recoveryLog = [];
        this.integrityChecks = [];
        
        // Limpar também do localStorage
        localStorage.removeItem('migration_critical_errors');
        localStorage.removeItem('migration_problematic_items');
        
        console.log('🗑️ Logs de erro limpos');
    }

    /**
     * Exportar logs para análise
     */
    exportLogs() {
        const exportData = {
            timestamp: new Date().toISOString(),
            errorLog: this.errorLog,
            recoveryLog: this.recoveryLog,
            integrityChecks: this.integrityChecks,
            summary: this.getErrorReport()
        };
        
        return JSON.stringify(exportData, null, 2);
    }
}

// Exportar instância singleton
export const migrationErrorHandler = new MigrationErrorHandler();
export default migrationErrorHandler;