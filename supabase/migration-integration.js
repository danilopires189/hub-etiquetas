/**
 * Integração do Sistema de Migração
 * Conecta todos os componentes de migração
 */

import { migrationManager } from './migration-manager.js';
import { migrationErrorHandler } from './migration-error-handler.js';
import { migrationUI } from './migration-ui.js';
import { supabaseManager } from './client.js';

class MigrationIntegration {
    constructor() {
        this.isInitialized = false;
        
        console.log('🔗 MigrationIntegration inicializada');
    }

    /**
     * Inicializar sistema de migração
     */
    async initialize() {
        if (this.isInitialized) {
            console.log('⚠️ Sistema de migração já inicializado');
            return true;
        }

        try {
            console.log('🚀 Inicializando sistema de migração...');
            
            // Verificar se Supabase está conectado
            if (!supabaseManager.isOnline()) {
                console.warn('⚠️ Supabase não está conectado, migração não disponível');
                return false;
            }

            // Verificar se há dados para migrar
            const hasDataToMigrate = this.checkForMigrationData();
            
            if (!hasDataToMigrate) {
                console.log('ℹ️ Nenhum dado encontrado para migração');
                return true; // Não é erro, apenas não há dados
            }

            // Adicionar botão de migração ao admin panel se existir
            this.addMigrationButton();
            
            // Adicionar função global para acesso via console
            window.startMigration = () => this.showMigrationUI();
            window.migrationStatus = () => migrationManager.getStatus();
            window.migrationErrors = () => migrationErrorHandler.getErrorReport();
            
            this.isInitialized = true;
            console.log('✅ Sistema de migração inicializado com sucesso');
            
            return true;
            
        } catch (error) {
            console.error('❌ Erro ao inicializar sistema de migração:', error);
            return false;
        }
    }

    /**
     * Verificar se há dados para migrar
     */
    checkForMigrationData() {
        const keysToCheck = [
            'contador_global_centralizado_v1',
            'avulso-etiquetas-history',
            'caixa-etiquetas-history',
            'enderec-etiquetas-history',
            'placas-etiquetas-history',
            'transfer-etiquetas-history',
            'termo-etiquetas-history',
            'pedido-direto-etiquetas-history',
            'etiqueta-mercadoria-etiquetas-history',
            'inventario-etiquetas-history',
            'hub_etiquetas_offline_queue'
        ];

        for (const key of keysToCheck) {
            try {
                const data = localStorage.getItem(key);
                if (data) {
                    const parsed = JSON.parse(data);
                    
                    // Verificar se há dados válidos
                    if (key === 'contador_global_centralizado_v1') {
                        if (parsed.totalEtiquetas && parsed.totalEtiquetas > 0) {
                            return true;
                        }
                    } else if (Array.isArray(parsed) && parsed.length > 0) {
                        return true;
                    }
                }
            } catch (error) {
                console.warn(`⚠️ Erro ao verificar ${key}:`, error);
            }
        }

        return false;
    }

    /**
     * Adicionar botão de migração ao admin panel
     */
    addMigrationButton() {
        // Verificar se estamos no admin panel
        const adminPanel = document.querySelector('.admin-dashboard, #admin-dashboard, .dashboard-container');
        
        if (adminPanel) {
            console.log('📱 Adicionando botão de migração ao admin panel...');
            
            const migrationButton = document.createElement('button');
            migrationButton.id = 'migration-trigger-btn';
            migrationButton.className = 'btn btn-secondary migration-btn';
            migrationButton.innerHTML = '🔄 Migrar Dados Históricos';
            migrationButton.style.cssText = `
                margin: 10px;
                padding: 10px 20px;
                background: #17a2b8;
                color: white;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-weight: 600;
                transition: background 0.2s;
            `;
            
            migrationButton.addEventListener('click', () => {
                this.showMigrationUI();
            });
            
            migrationButton.addEventListener('mouseenter', () => {
                migrationButton.style.background = '#138496';
            });
            
            migrationButton.addEventListener('mouseleave', () => {
                migrationButton.style.background = '#17a2b8';
            });
            
            // Inserir no início do admin panel
            adminPanel.insertBefore(migrationButton, adminPanel.firstChild);
            
            console.log('✅ Botão de migração adicionado ao admin panel');
        } else {
            console.log('ℹ️ Admin panel não encontrado, botão não adicionado');
        }
    }

    /**
     * Mostrar interface de migração
     */
    showMigrationUI() {
        console.log('📱 Exibindo interface de migração...');
        migrationUI.show();
    }

    /**
     * Executar migração programaticamente
     */
    async runMigration() {
        console.log('🚀 Executando migração programaticamente...');
        
        try {
            const result = await migrationManager.runMigration();
            
            console.log('📊 Resultado da migração:', {
                success: result.success,
                totalOperations: result.totalOperations,
                completedOperations: result.completedOperations,
                errors: result.errors?.length || 0
            });
            
            return result;
            
        } catch (error) {
            console.error('❌ Erro na migração programática:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Verificar status da migração
     */
    getStatus() {
        return {
            initialized: this.isInitialized,
            hasDataToMigrate: this.checkForMigrationData(),
            supabaseConnected: supabaseManager.isOnline(),
            migrationStatus: migrationManager.getStatus(),
            errorReport: migrationErrorHandler.getErrorReport()
        };
    }

    /**
     * Limpar dados de migração (para testes)
     */
    clearMigrationData() {
        const keysToRemove = [
            'contador_global_centralizado_v1',
            'avulso-etiquetas-history',
            'caixa-etiquetas-history',
            'enderec-etiquetas-history',
            'placas-etiquetas-history',
            'transfer-etiquetas-history',
            'termo-etiquetas-history',
            'pedido-direto-etiquetas-history',
            'etiqueta-mercadoria-etiquetas-history',
            'inventario-etiquetas-history',
            'hub_etiquetas_offline_queue',
            'migration_critical_errors',
            'migration_problematic_items'
        ];

        keysToRemove.forEach(key => {
            localStorage.removeItem(key);
        });

        // Limpar logs dos componentes
        migrationErrorHandler.clearLogs();
        
        console.log('🗑️ Dados de migração limpos');
    }

    /**
     * Executar verificação de integridade
     */
    async verifyIntegrity() {
        console.log('🔍 Executando verificação de integridade...');
        
        try {
            const integrityReport = await migrationErrorHandler.verifyPostMigrationIntegrity({
                source: 'manual_verification'
            });
            
            console.log('📊 Relatório de integridade:', integrityReport);
            return integrityReport;
            
        } catch (error) {
            console.error('❌ Erro na verificação de integridade:', error);
            return {
                passed: false,
                error: error.message
            };
        }
    }
}

// Exportar instância singleton
export const migrationIntegration = new MigrationIntegration();
export default migrationIntegration;

// Auto-inicializar quando o DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        migrationIntegration.initialize();
    });
} else {
    // DOM já está pronto
    migrationIntegration.initialize();
}