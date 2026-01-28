/**
 * Sistema de Debounce para Operações Supabase
 * Evita consultas excessivas agrupando operações similares
 */

class SupabaseDebouncer {
    constructor() {
        this.debouncedOperations = new Map();
        this.defaultDelay = 2000; // 2 segundos
        this.maxDelay = 10000; // 10 segundos máximo
        
        console.log('⏱️ Supabase Debouncer inicializado');
    }

    /**
     * Debounce de operação
     */
    debounce(key, operation, delay = this.defaultDelay) {
        // Cancelar operação anterior se existir
        if (this.debouncedOperations.has(key)) {
            clearTimeout(this.debouncedOperations.get(key).timeoutId);
        }

        // Criar nova operação com debounce
        const timeoutId = setTimeout(async () => {
            try {
                console.log(`⏱️ Executando operação debounced: ${key}`);
                await operation();
                this.debouncedOperations.delete(key);
            } catch (error) {
                console.error(`❌ Erro na operação debounced ${key}:`, error);
                this.debouncedOperations.delete(key);
            }
        }, delay);

        this.debouncedOperations.set(key, {
            timeoutId,
            operation,
            delay,
            createdAt: Date.now()
        });

        console.log(`⏱️ Operação ${key} agendada para ${delay}ms`);
    }

    /**
     * Debounce específico para contador global
     */
    debounceCounterUpdate(increment, type) {
        const key = `counter_${type}`;
        
        // Se já existe uma operação pendente, somar os incrementos
        if (this.debouncedOperations.has(key)) {
            const existing = this.debouncedOperations.get(key);
            existing.totalIncrement = (existing.totalIncrement || 0) + increment;
            
            // Resetar timer
            clearTimeout(existing.timeoutId);
            existing.timeoutId = setTimeout(async () => {
                try {
                    console.log(`📊 Atualizando contador debounced: +${existing.totalIncrement} ${type}`);
                    await window.supabaseManager.updateGlobalCounter(existing.totalIncrement, type);
                    this.debouncedOperations.delete(key);
                } catch (error) {
                    console.error(`❌ Erro na atualização debounced do contador:`, error);
                    this.debouncedOperations.delete(key);
                }
            }, this.defaultDelay);
            
            console.log(`📊 Incremento acumulado para ${type}: ${existing.totalIncrement}`);
        } else {
            // Nova operação
            const timeoutId = setTimeout(async () => {
                try {
                    console.log(`📊 Atualizando contador debounced: +${increment} ${type}`);
                    await window.supabaseManager.updateGlobalCounter(increment, type);
                    this.debouncedOperations.delete(key);
                } catch (error) {
                    console.error(`❌ Erro na atualização debounced do contador:`, error);
                    this.debouncedOperations.delete(key);
                }
            }, this.defaultDelay);

            this.debouncedOperations.set(key, {
                timeoutId,
                totalIncrement: increment,
                type,
                createdAt: Date.now()
            });
        }
    }

    /**
     * Debounce para salvamento de etiquetas
     */
    debounceLabelSave(data, tableName) {
        const key = `label_${tableName}_${data.id || Date.now()}`;
        
        this.debounce(key, async () => {
            switch (tableName) {
                case 'caixa':
                    await window.supabaseManager.saveCaixaLabel(data);
                    break;
                case 'termo':
                    await window.supabaseManager.saveTermoLabel(data);
                    break;
                case 'avulso':
                    await window.supabaseManager.saveAvulsoLabel(data);
                    break;
                case 'etiqueta_entrada':
                    await window.supabaseManager.saveEtiquetaEntrada(data);
                    break;
                default:
                    await window.supabaseManager.saveLabelGeneration(data);
            }
        }, 1000); // Delay menor para etiquetas
    }

    /**
     * Debounce para sincronização de dados
     */
    debounceSync(syncFunction, key = 'general_sync') {
        this.debounce(key, syncFunction, 5000); // 5 segundos para sync
    }

    /**
     * Executar operação imediatamente (bypass debounce)
     */
    executeImmediately(key) {
        if (this.debouncedOperations.has(key)) {
            const operation = this.debouncedOperations.get(key);
            clearTimeout(operation.timeoutId);
            
            // Executar imediatamente
            if (operation.operation) {
                operation.operation();
            } else if (operation.totalIncrement) {
                // Caso especial para contador
                window.supabaseManager.updateGlobalCounter(operation.totalIncrement, operation.type);
            }
            
            this.debouncedOperations.delete(key);
            console.log(`⚡ Operação ${key} executada imediatamente`);
        }
    }

    /**
     * Flush todas as operações pendentes
     */
    async flushAll() {
        console.log(`🚀 Executando ${this.debouncedOperations.size} operações pendentes...`);
        
        const promises = [];
        
        for (const [key, operation] of this.debouncedOperations.entries()) {
            clearTimeout(operation.timeoutId);
            
            if (operation.operation) {
                promises.push(operation.operation().catch(err => 
                    console.error(`❌ Erro ao executar ${key}:`, err)
                ));
            } else if (operation.totalIncrement) {
                promises.push(
                    window.supabaseManager.updateGlobalCounter(operation.totalIncrement, operation.type)
                        .catch(err => console.error(`❌ Erro ao atualizar contador ${key}:`, err))
                );
            }
        }

        this.debouncedOperations.clear();
        
        try {
            await Promise.all(promises);
            console.log('✅ Todas as operações pendentes executadas');
        } catch (error) {
            console.error('❌ Erro ao executar operações pendentes:', error);
        }
    }

    /**
     * Cancelar operação específica
     */
    cancel(key) {
        if (this.debouncedOperations.has(key)) {
            clearTimeout(this.debouncedOperations.get(key).timeoutId);
            this.debouncedOperations.delete(key);
            console.log(`❌ Operação ${key} cancelada`);
        }
    }

    /**
     * Cancelar todas as operações
     */
    cancelAll() {
        for (const [key, operation] of this.debouncedOperations.entries()) {
            clearTimeout(operation.timeoutId);
        }
        
        const cancelled = this.debouncedOperations.size;
        this.debouncedOperations.clear();
        console.log(`❌ ${cancelled} operações canceladas`);
    }

    /**
     * Limpar operações antigas (mais de maxDelay)
     */
    cleanupOldOperations() {
        const now = Date.now();
        const toDelete = [];

        for (const [key, operation] of this.debouncedOperations.entries()) {
            if (now - operation.createdAt > this.maxDelay) {
                clearTimeout(operation.timeoutId);
                toDelete.push(key);
            }
        }

        toDelete.forEach(key => {
            this.debouncedOperations.delete(key);
            console.log(`🧹 Operação antiga removida: ${key}`);
        });

        if (toDelete.length > 0) {
            console.log(`🧹 ${toDelete.length} operações antigas limpas`);
        }
    }

    /**
     * Obter estatísticas
     */
    getStats() {
        const operations = Array.from(this.debouncedOperations.entries()).map(([key, op]) => ({
            key,
            delay: op.delay,
            age: Date.now() - op.createdAt,
            type: op.type || 'unknown'
        }));

        return {
            pendingOperations: this.debouncedOperations.size,
            operations,
            oldestOperation: operations.length > 0 ? Math.max(...operations.map(op => op.age)) : 0
        };
    }
}

// Instância global
window.supabaseDebouncer = new SupabaseDebouncer();

// Limpeza automática a cada 30 segundos
setInterval(() => {
    window.supabaseDebouncer.cleanupOldOperations();
}, 30000);

// Flush automático antes de fechar a página
window.addEventListener('beforeunload', () => {
    window.supabaseDebouncer.flushAll();
});

export default window.supabaseDebouncer;