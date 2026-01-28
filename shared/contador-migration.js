/**
 * Script de Migração do Contador Global
 * Migra dados do contador antigo para o otimizado
 */

class ContadorMigration {
    constructor() {
        this.oldKey = 'contador_global_centralizado_v1';
        this.newKey = 'contador_global_centralizado_v2';
        
        console.log('🔄 Iniciando migração do contador...');
    }

    /**
     * Executar migração completa
     */
    async migrate() {
        try {
            // Verificar se já foi migrado
            if (localStorage.getItem(this.newKey)) {
                console.log('✅ Contador já migrado');
                return true;
            }

            // Obter dados antigos
            const oldData = this.getOldData();
            if (!oldData) {
                console.log('ℹ️ Nenhum dado antigo encontrado');
                return true;
            }

            // Migrar dados
            const newData = this.transformData(oldData);
            
            // Salvar dados migrados
            localStorage.setItem(this.newKey, JSON.stringify(newData));
            
            // Backup dos dados antigos
            localStorage.setItem(this.oldKey + '_backup', JSON.stringify(oldData));
            
            console.log('✅ Migração concluída com sucesso');
            console.log(`📊 Valor migrado: ${newData.totalEtiquetas}`);
            
            return true;
            
        } catch (error) {
            console.error('❌ Erro na migração:', error);
            return false;
        }
    }

    /**
     * Obter dados do contador antigo
     */
    getOldData() {
        try {
            const data = localStorage.getItem(this.oldKey);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.warn('⚠️ Erro ao ler dados antigos:', error);
            return null;
        }
    }

    /**
     * Transformar dados para novo formato
     */
    transformData(oldData) {
        return {
            totalEtiquetas: oldData.totalEtiquetas || 134456,
            ultimaAtualizacao: oldData.ultimaAtualizacao || new Date().toISOString(),
            batchPendente: [], // Novo campo para batch
            timestamp: Date.now(),
            migrated: true,
            migratedAt: new Date().toISOString()
        };
    }

    /**
     * Verificar integridade após migração
     */
    validateMigration() {
        try {
            const newData = localStorage.getItem(this.newKey);
            if (!newData) {
                console.error('❌ Dados migrados não encontrados');
                return false;
            }

            const parsed = JSON.parse(newData);
            if (!parsed.totalEtiquetas || !parsed.ultimaAtualizacao) {
                console.error('❌ Dados migrados incompletos');
                return false;
            }

            console.log('✅ Migração validada com sucesso');
            return true;
            
        } catch (error) {
            console.error('❌ Erro na validação:', error);
            return false;
        }
    }

    /**
     * Rollback da migração (se necessário)
     */
    rollback() {
        try {
            const backup = localStorage.getItem(this.oldKey + '_backup');
            if (backup) {
                localStorage.setItem(this.oldKey, backup);
                localStorage.removeItem(this.newKey);
                console.log('🔄 Rollback executado');
                return true;
            }
            
            console.warn('⚠️ Backup não encontrado para rollback');
            return false;
            
        } catch (error) {
            console.error('❌ Erro no rollback:', error);
            return false;
        }
    }

    /**
     * Limpar dados antigos após confirmação
     */
    cleanup() {
        try {
            // Manter backup por segurança, remover apenas o original
            localStorage.removeItem(this.oldKey);
            console.log('🧹 Limpeza concluída');
            return true;
        } catch (error) {
            console.warn('⚠️ Erro na limpeza:', error);
            return false;
        }
    }

    /**
     * Obter estatísticas da migração
     */
    getStats() {
        const oldData = this.getOldData();
        const newData = localStorage.getItem(this.newKey);
        
        return {
            hasOldData: !!oldData,
            hasNewData: !!newData,
            oldValue: oldData?.totalEtiquetas || 0,
            newValue: newData ? JSON.parse(newData).totalEtiquetas : 0,
            migrated: !!newData && JSON.parse(newData).migrated
        };
    }
}

// Executar migração automaticamente
const migration = new ContadorMigration();

// Migrar quando DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        migration.migrate().then(success => {
            if (success) {
                migration.validateMigration();
            }
        });
    });
} else {
    migration.migrate().then(success => {
        if (success) {
            migration.validateMigration();
        }
    });
}

// Expor para uso manual
window.contadorMigration = migration;

export default migration;