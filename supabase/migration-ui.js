/**
 * Interface de Usuário para Migração de Dados
 * Fornece feedback visual e controle da migração
 */

import { migrationManager } from './migration-manager.js';
import { migrationErrorHandler } from './migration-error-handler.js';

class MigrationUI {
    constructor() {
        this.isVisible = false;
        this.progressInterval = null;
        
        console.log('🎨 MigrationUI inicializada');
    }

    /**
     * Mostrar interface de migração
     */
    show() {
        if (this.isVisible) return;
        
        this.createUI();
        this.isVisible = true;
        
        console.log('📱 Interface de migração exibida');
    }

    /**
     * Ocultar interface de migração
     */
    hide() {
        const modal = document.getElementById('migration-modal');
        if (modal) {
            modal.remove();
        }
        
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
            this.progressInterval = null;
        }
        
        this.isVisible = false;
        console.log('📱 Interface de migração ocultada');
    }

    /**
     * Criar elementos da UI
     */
    createUI() {
        // Remover modal existente se houver
        const existingModal = document.getElementById('migration-modal');
        if (existingModal) {
            existingModal.remove();
        }

        const modal = document.createElement('div');
        modal.id = 'migration-modal';
        modal.innerHTML = this.getModalHTML();
        
        document.body.appendChild(modal);
        
        // Configurar eventos
        this.setupEventListeners();
        
        // Verificar se há dados para migrar
        this.checkMigrationData();
    }

    /**
     * HTML da interface
     */
    getModalHTML() {
        return `
            <div class="migration-overlay">
                <div class="migration-container">
                    <div class="migration-header">
                        <h2>🔄 Migração de Dados Históricos</h2>
                        <button id="migration-close" class="close-btn">&times;</button>
                    </div>
                    
                    <div class="migration-content">
                        <div id="migration-status" class="status-section">
                            <div class="status-item">
                                <span class="status-label">Status:</span>
                                <span id="migration-status-text" class="status-idle">Aguardando</span>
                            </div>
                            <div class="status-item">
                                <span class="status-label">Progresso:</span>
                                <div class="progress-container">
                                    <div id="migration-progress-bar" class="progress-bar">
                                        <div class="progress-fill"></div>
                                    </div>
                                    <span id="migration-progress-text">0%</span>
                                </div>
                            </div>
                        </div>
                        
                        <div id="migration-data-info" class="data-info-section">
                            <h3>📊 Dados Encontrados</h3>
                            <div id="migration-data-list" class="data-list">
                                <div class="loading">Verificando dados...</div>
                            </div>
                        </div>
                        
                        <div id="migration-log" class="log-section">
                            <h3>📝 Log de Migração</h3>
                            <div id="migration-log-content" class="log-content">
                                <div class="log-empty">Nenhum log ainda</div>
                            </div>
                        </div>
                        
                        <div id="migration-errors" class="error-section" style="display: none;">
                            <h3>⚠️ Erros e Avisos</h3>
                            <div id="migration-error-content" class="error-content"></div>
                        </div>
                    </div>
                    
                    <div class="migration-actions">
                        <button id="migration-start" class="btn btn-primary">
                            🚀 Iniciar Migração
                        </button>
                        <button id="migration-cancel" class="btn btn-secondary" style="display: none;">
                            ⏹️ Cancelar
                        </button>
                        <button id="migration-export-logs" class="btn btn-tertiary" style="display: none;">
                            📄 Exportar Logs
                        </button>
                    </div>
                </div>
            </div>
            
            <style>
                .migration-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.7);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 10000;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                }
                
                .migration-container {
                    background: white;
                    border-radius: 12px;
                    width: 90%;
                    max-width: 800px;
                    max-height: 90vh;
                    overflow: hidden;
                    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
                    display: flex;
                    flex-direction: column;
                }
                
                .migration-header {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 20px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                
                .migration-header h2 {
                    margin: 0;
                    font-size: 1.5rem;
                }
                
                .close-btn {
                    background: none;
                    border: none;
                    color: white;
                    font-size: 2rem;
                    cursor: pointer;
                    padding: 0;
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: background 0.2s;
                }
                
                .close-btn:hover {
                    background: rgba(255, 255, 255, 0.2);
                }
                
                .migration-content {
                    padding: 20px;
                    overflow-y: auto;
                    flex: 1;
                }
                
                .status-section {
                    background: #f8f9fa;
                    border-radius: 8px;
                    padding: 16px;
                    margin-bottom: 20px;
                }
                
                .status-item {
                    display: flex;
                    align-items: center;
                    margin-bottom: 12px;
                }
                
                .status-item:last-child {
                    margin-bottom: 0;
                }
                
                .status-label {
                    font-weight: 600;
                    margin-right: 12px;
                    min-width: 80px;
                }
                
                .status-idle { color: #6c757d; }
                .status-running { color: #007bff; }
                .status-success { color: #28a745; }
                .status-error { color: #dc3545; }
                
                .progress-container {
                    display: flex;
                    align-items: center;
                    flex: 1;
                }
                
                .progress-bar {
                    background: #e9ecef;
                    border-radius: 10px;
                    height: 20px;
                    flex: 1;
                    margin-right: 12px;
                    overflow: hidden;
                }
                
                .progress-fill {
                    background: linear-gradient(90deg, #28a745, #20c997);
                    height: 100%;
                    width: 0%;
                    transition: width 0.3s ease;
                }
                
                .data-info-section, .log-section, .error-section {
                    margin-bottom: 20px;
                }
                
                .data-info-section h3, .log-section h3, .error-section h3 {
                    margin: 0 0 12px 0;
                    font-size: 1.1rem;
                    color: #495057;
                }
                
                .data-list {
                    background: #f8f9fa;
                    border-radius: 6px;
                    padding: 12px;
                    font-family: 'Courier New', monospace;
                    font-size: 0.9rem;
                }
                
                .data-item {
                    display: flex;
                    justify-content: space-between;
                    padding: 4px 0;
                    border-bottom: 1px solid #dee2e6;
                }
                
                .data-item:last-child {
                    border-bottom: none;
                }
                
                .log-content, .error-content {
                    background: #f8f9fa;
                    border-radius: 6px;
                    padding: 12px;
                    max-height: 200px;
                    overflow-y: auto;
                    font-family: 'Courier New', monospace;
                    font-size: 0.85rem;
                    line-height: 1.4;
                }
                
                .log-entry {
                    margin-bottom: 8px;
                    padding: 4px 8px;
                    border-radius: 4px;
                }
                
                .log-entry.info {
                    background: #d1ecf1;
                    color: #0c5460;
                }
                
                .log-entry.error {
                    background: #f8d7da;
                    color: #721c24;
                }
                
                .log-entry.success {
                    background: #d4edda;
                    color: #155724;
                }
                
                .log-empty {
                    color: #6c757d;
                    font-style: italic;
                    text-align: center;
                    padding: 20px;
                }
                
                .loading {
                    color: #6c757d;
                    font-style: italic;
                    text-align: center;
                    padding: 20px;
                }
                
                .migration-actions {
                    padding: 20px;
                    border-top: 1px solid #dee2e6;
                    display: flex;
                    gap: 12px;
                    justify-content: flex-end;
                }
                
                .btn {
                    padding: 10px 20px;
                    border: none;
                    border-radius: 6px;
                    font-size: 0.9rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                
                .btn-primary {
                    background: #007bff;
                    color: white;
                }
                
                .btn-primary:hover {
                    background: #0056b3;
                }
                
                .btn-secondary {
                    background: #6c757d;
                    color: white;
                }
                
                .btn-secondary:hover {
                    background: #545b62;
                }
                
                .btn-tertiary {
                    background: #17a2b8;
                    color: white;
                }
                
                .btn-tertiary:hover {
                    background: #138496;
                }
                
                .btn:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }
            </style>
        `;
    }

    /**
     * Configurar event listeners
     */
    setupEventListeners() {
        // Fechar modal
        document.getElementById('migration-close').addEventListener('click', () => {
            this.hide();
        });

        // Iniciar migração
        document.getElementById('migration-start').addEventListener('click', () => {
            this.startMigration();
        });

        // Cancelar migração
        document.getElementById('migration-cancel').addEventListener('click', () => {
            this.cancelMigration();
        });

        // Exportar logs
        document.getElementById('migration-export-logs').addEventListener('click', () => {
            this.exportLogs();
        });

        // Fechar clicando fora
        document.querySelector('.migration-overlay').addEventListener('click', (e) => {
            if (e.target.classList.contains('migration-overlay')) {
                this.hide();
            }
        });
    }

    /**
     * Verificar dados disponíveis para migração
     */
    async checkMigrationData() {
        const dataList = document.getElementById('migration-data-list');
        
        try {
            const dataInfo = [];
            
            // Verificar contador global
            const globalCounter = this.getLocalStorageData('contador_global_centralizado_v1');
            if (globalCounter) {
                dataInfo.push({
                    type: 'Contador Global',
                    count: `${globalCounter.totalEtiquetas || 0} etiquetas`,
                    status: '✅'
                });
            }
            
            // Verificar históricos de aplicações
            const historyKeys = [
                { key: 'avulso-etiquetas-history', name: 'Avulso' },
                { key: 'caixa-etiquetas-history', name: 'Caixa' },
                { key: 'enderec-etiquetas-history', name: 'Endereçamento' },
                { key: 'placas-etiquetas-history', name: 'Placas' },
                { key: 'transfer-etiquetas-history', name: 'Transferência' },
                { key: 'termo-etiquetas-history', name: 'Termo' },
                { key: 'pedido-direto-etiquetas-history', name: 'Pedido Direto' },
                { key: 'etiqueta-mercadoria-etiquetas-history', name: 'Etiqueta Mercadoria' },
                { key: 'inventario-etiquetas-history', name: 'Inventário' }
            ];
            
            historyKeys.forEach(({ key, name }) => {
                const data = this.getLocalStorageData(key);
                if (data && Array.isArray(data) && data.length > 0) {
                    dataInfo.push({
                        type: `Histórico ${name}`,
                        count: `${data.length} registros`,
                        status: '✅'
                    });
                }
            });
            
            // Verificar queue offline
            const offlineQueue = this.getLocalStorageData('hub_etiquetas_offline_queue');
            if (offlineQueue && Array.isArray(offlineQueue) && offlineQueue.length > 0) {
                dataInfo.push({
                    type: 'Queue Offline',
                    count: `${offlineQueue.length} operações`,
                    status: '⏳'
                });
            }
            
            if (dataInfo.length === 0) {
                dataList.innerHTML = '<div class="log-empty">Nenhum dado encontrado para migração</div>';
                document.getElementById('migration-start').disabled = true;
            } else {
                dataList.innerHTML = dataInfo.map(item => `
                    <div class="data-item">
                        <span>${item.status} ${item.type}</span>
                        <span>${item.count}</span>
                    </div>
                `).join('');
            }
            
        } catch (error) {
            dataList.innerHTML = '<div class="log-entry error">Erro ao verificar dados: ' + error.message + '</div>';
        }
    }

    /**
     * Iniciar migração
     */
    async startMigration() {
        const startBtn = document.getElementById('migration-start');
        const cancelBtn = document.getElementById('migration-cancel');
        const exportBtn = document.getElementById('migration-export-logs');
        
        // Atualizar UI
        startBtn.style.display = 'none';
        cancelBtn.style.display = 'inline-flex';
        exportBtn.style.display = 'none';
        
        this.updateStatus('Iniciando migração...', 'running');
        this.startProgressMonitoring();
        
        try {
            const result = await migrationManager.runMigration();
            
            if (result.success) {
                this.updateStatus('Migração concluída com sucesso!', 'success');
                this.addLogEntry('✅ Migração concluída', 'success');
                
                if (result.errorReport.totalErrors > 0) {
                    this.addLogEntry(`⚠️ ${result.errorReport.totalErrors} erros encontrados`, 'error');
                    this.showErrors(result.errorReport);
                }
                
            } else {
                this.updateStatus('Migração falhou', 'error');
                this.addLogEntry(`❌ Erro: ${result.error}`, 'error');
                this.showErrors(result.errorReport);
            }
            
        } catch (error) {
            this.updateStatus('Erro na migração', 'error');
            this.addLogEntry(`❌ Erro inesperado: ${error.message}`, 'error');
        } finally {
            this.stopProgressMonitoring();
            
            // Atualizar UI
            startBtn.style.display = 'inline-flex';
            startBtn.textContent = '🔄 Migrar Novamente';
            cancelBtn.style.display = 'none';
            exportBtn.style.display = 'inline-flex';
        }
    }

    /**
     * Cancelar migração
     */
    cancelMigration() {
        // Por enquanto, apenas ocultar a interface
        // Em uma implementação futura, poderia interromper a migração
        this.hide();
    }

    /**
     * Exportar logs
     */
    exportLogs() {
        try {
            const logs = migrationErrorHandler.exportLogs();
            const blob = new Blob([logs], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `migration-logs-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            URL.revokeObjectURL(url);
            
            this.addLogEntry('📄 Logs exportados com sucesso', 'success');
            
        } catch (error) {
            this.addLogEntry(`❌ Erro ao exportar logs: ${error.message}`, 'error');
        }
    }

    /**
     * Atualizar status
     */
    updateStatus(text, type) {
        const statusText = document.getElementById('migration-status-text');
        statusText.textContent = text;
        statusText.className = `status-${type}`;
    }

    /**
     * Atualizar progresso
     */
    updateProgress(percentage) {
        const progressFill = document.querySelector('.progress-fill');
        const progressText = document.getElementById('migration-progress-text');
        
        progressFill.style.width = `${percentage}%`;
        progressText.textContent = `${Math.round(percentage)}%`;
    }

    /**
     * Adicionar entrada ao log
     */
    addLogEntry(message, type = 'info') {
        const logContent = document.getElementById('migration-log-content');
        
        // Remover mensagem vazia se existir
        const emptyMsg = logContent.querySelector('.log-empty');
        if (emptyMsg) {
            emptyMsg.remove();
        }
        
        const entry = document.createElement('div');
        entry.className = `log-entry ${type}`;
        entry.textContent = `${new Date().toLocaleTimeString()} - ${message}`;
        
        logContent.appendChild(entry);
        logContent.scrollTop = logContent.scrollHeight;
    }

    /**
     * Mostrar erros
     */
    showErrors(errorReport) {
        const errorSection = document.getElementById('migration-errors');
        const errorContent = document.getElementById('migration-error-content');
        
        if (errorReport.totalErrors > 0) {
            errorSection.style.display = 'block';
            
            const errorHTML = errorReport.recentErrors.map(error => `
                <div class="log-entry error">
                    <strong>[${error.category}]</strong> ${error.message}
                    <br><small>${error.timestamp}</small>
                </div>
            `).join('');
            
            errorContent.innerHTML = errorHTML;
        }
    }

    /**
     * Iniciar monitoramento de progresso
     */
    startProgressMonitoring() {
        this.progressInterval = setInterval(() => {
            const status = migrationManager.getStatus();
            
            if (status.totalOperations > 0) {
                const percentage = (status.completedOperations / status.totalOperations) * 100;
                this.updateProgress(percentage);
                
                this.addLogEntry(
                    `Progresso: ${status.completedOperations}/${status.totalOperations} operações`,
                    'info'
                );
            }
        }, 1000);
    }

    /**
     * Parar monitoramento de progresso
     */
    stopProgressMonitoring() {
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
            this.progressInterval = null;
        }
    }

    /**
     * Obter dados do localStorage
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
}

// Exportar instância singleton
export const migrationUI = new MigrationUI();
export default migrationUI;