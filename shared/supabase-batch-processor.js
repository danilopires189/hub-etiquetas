/**
 * Processador de Lotes para Supabase
 * Agrupa múltiplas operações em uma única consulta
 */

class SupabaseBatchProcessor {
    constructor() {
        this.pendingOperations = [];
        this.batchSize = 10;
        this.flushInterval = 5000; // 5 segundos
        this.isProcessing = false;
        
        this.startBatchProcessor();
        console.log('📦 Supabase Batch Processor inicializado');
    }

    /**
     * Adicionar operação ao lote
     */
    addOperation(type, data, priority = 'normal') {
        const operation = {
            id: Date.now() + Math.random(),
            type,
            data,
            priority,
            timestamp: Date.now(),
            retries: 0
        };

        // Inserir baseado na prioridade
        if (priority === 'high') {
            this.pendingOperations.unshift(operation);
        } else {
            this.pendingOperations.push(operation);
        }

        console.log(`📝 Operação adicionada ao lote: ${type} (${priority})`);

        // Processar imediatamente se for alta prioridade ou lote estiver cheio
        if (priority === 'high' || this.pendingOperations.length >= this.batchSize) {
            this.processBatch();
        }
    }

    /**
     * Iniciar processador automático de lotes
     */
    startBatchProcessor() {
        setInterval(() => {
            if (this.pendingOperations.length > 0 && !this.isProcessing) {
                this.processBatch();
            }
        }, this.flushInterval);
    }

    /**
     * Processar lote de operações
     */
    async processBatch() {
        if (this.isProcessing || this.pendingOperations.length === 0) {
            return;
        }

        this.isProcessing = true;
        const batch = this.pendingOperations.splice(0, this.batchSize);
        
        console.log(`🔄 Processando lote: ${batch.length} operações`);

        try {
            // Agrupar operações por tipo
            const groupedOps = this.groupOperationsByType(batch);
            
            // Processar cada grupo
            for (const [type, operations] of Object.entries(groupedOps)) {
                await this.processOperationGroup(type, operations);
            }

            console.log(`✅ Lote processado com sucesso: ${batch.length} operações`);

        } catch (error) {
            console.error('❌ Erro no processamento do lote:', error);
            
            // Recolocar operações falhadas na queue com retry
            batch.forEach(op => {
                op.retries++;
                if (op.retries < 3) {
                    this.pendingOperations.push(op);
                } else {
                    console.error(`❌ Operação descartada após 3 tentativas: ${op.type}`);
                }
            });
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Agrupar operações por tipo
     */
    groupOperationsByType(operations) {
        const groups = {};
        
        operations.forEach(op => {
            if (!groups[op.type]) {
                groups[op.type] = [];
            }
            groups[op.type].push(op);
        });

        return groups;
    }

    /**
     * Processar grupo de operações do mesmo tipo
     */
    async processOperationGroup(type, operations) {
        if (!window.supabaseManager) {
            throw new Error('SupabaseManager não disponível');
        }

        switch (type) {
            case 'label_generation':
                await this.batchInsertLabels(operations);
                break;
            case 'counter_update':
                await this.batchUpdateCounter(operations);
                break;
            case 'specific_table':
                await this.batchInsertSpecificTables(operations);
                break;
            default:
                console.warn(`⚠️ Tipo de operação desconhecido: ${type}`);
        }
    }

    /**
     * Inserção em lote de etiquetas genéricas
     */
    async batchInsertLabels(operations) {
        const records = operations.map(op => ({
            application_type: op.data.applicationType,
            coddv: op.data.coddv,
            quantity: op.data.quantity,
            copies: op.data.copies,
            label_type: op.data.labelType,
            orientation: op.data.orientation,
            cd: op.data.cd,
            metadata: op.data.metadata
        }));

        const { data, error } = await window.supabaseManager.client
            .from('labels')
            .insert(records)
            .select();

        if (error) {
            throw new Error(`Erro na inserção em lote de labels: ${error.message}`);
        }

        console.log(`✅ ${records.length} labels inseridas em lote`);
        return data;
    }

    /**
     * Atualização em lote do contador
     */
    async batchUpdateCounter(operations) {
        // Somar todos os incrementos
        const totalIncrement = operations.reduce((sum, op) => sum + op.data.increment, 0);
        const appTypes = [...new Set(operations.map(op => op.data.type))];

        // Uma única atualização para todos os incrementos
        const result = await window.supabaseManager.updateGlobalCounter(totalIncrement, appTypes[0]);
        
        console.log(`✅ Contador atualizado em lote: +${totalIncrement}`);
        return result;
    }

    /**
     * Inserção em lote de tabelas específicas
     */
    async batchInsertSpecificTables(operations) {
        // Agrupar por tabela
        const tableGroups = {};
        
        operations.forEach(op => {
            const tableName = op.data.tableName;
            if (!tableGroups[tableName]) {
                tableGroups[tableName] = [];
            }
            tableGroups[tableName].push(op.data.record);
        });

        // Inserir cada grupo de tabela
        for (const [tableName, records] of Object.entries(tableGroups)) {
            const { data, error } = await window.supabaseManager.client
                .from(tableName)
                .insert(records)
                .select();

            if (error) {
                throw new Error(`Erro na inserção em lote de ${tableName}: ${error.message}`);
            }

            console.log(`✅ ${records.length} registros inseridos em ${tableName}`);
        }
    }

    /**
     * Forçar processamento imediato
     */
    async flush() {
        if (this.pendingOperations.length > 0) {
            await this.processBatch();
        }
    }

    /**
     * Obter estatísticas
     */
    getStats() {
        return {
            pendingOperations: this.pendingOperations.length,
            isProcessing: this.isProcessing,
            batchSize: this.batchSize,
            flushInterval: this.flushInterval
        };
    }

    /**
     * Limpar queue (emergência)
     */
    clearQueue() {
        const cleared = this.pendingOperations.length;
        this.pendingOperations = [];
        console.log(`🗑️ Queue de lotes limpa: ${cleared} operações removidas`);
    }
}

// Instância global
window.supabaseBatchProcessor = new SupabaseBatchProcessor();

export default window.supabaseBatchProcessor;
