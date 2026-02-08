/**
 * Utilitários de Autenticação para Hub de Etiquetas
 * Gerencia sessões administrativas e validação de acesso
 */

import supabaseManager from './client.js';
import { ADMIN_CONFIG } from './config.js';

class AuthManager {
    constructor() {
        this.sessionCheckInterval = null;
        this.sessionWarningShown = false;
        
        console.log('🔐 AuthManager inicializado');
    }

    /**
     * Inicializar gerenciamento de autenticação
     */
    async initialize() {
        try {
            // Verificar sessão existente
            await this.checkCurrentSession();
            
            // Configurar verificação periódica de sessão
            this.startSessionMonitoring();
            
            // Configurar listeners de eventos
            this.setupEventListeners();
            
            console.log('✅ AuthManager inicializado com sucesso');
            return true;
        } catch (error) {
            console.error('❌ Erro na inicialização do AuthManager:', error);
            return false;
        }
    }

    /**
     * Verificar sessão atual
     */
    async checkCurrentSession() {
        try {
            const session = await supabaseManager.getCurrentSession();
            
            if (session) {
                const timeRemaining = this.getSessionTimeRemaining();
                console.log(`⏰ Sessão ativa. Tempo restante: ${this.formatTimeRemaining(timeRemaining)}`);
                
                // Mostrar aviso se restam menos de 30 minutos
                if (timeRemaining < 30 * 60 * 1000 && !this.sessionWarningShown) {
                    this.showSessionWarning(timeRemaining);
                }
                
                return session;
            }
            
            return null;
        } catch (error) {
            console.error('❌ Erro ao verificar sessão:', error);
            return null;
        }
    }

    /**
     * Fazer login administrativo
     */
    async login(email, password) {
        try {
            // Validar credenciais localmente primeiro
            if (!supabaseManager.validateAdminCredentials(email, password)) {
                return {
                    success: false,
                    error: 'Credenciais inválidas'
                };
            }

            // Tentar autenticação no Supabase
            const result = await supabaseManager.authenticateAdmin(email, password);
            
            if (result.success) {
                // Iniciar monitoramento de sessão
                this.startSessionMonitoring();
                
                console.log('✅ Login administrativo realizado com sucesso');
            }
            
            return result;
        } catch (error) {
            console.error('❌ Erro no login:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Fazer logout
     */
    async logout() {
        try {
            // Parar monitoramento de sessão
            this.stopSessionMonitoring();
            
            // Fazer logout no Supabase
            const success = await supabaseManager.logout();
            
            if (success) {
                console.log('✅ Logout realizado com sucesso');
                
                // Redirecionar para login se estivermos em página admin
                if (window.location.pathname.includes('/admin/')) {
                    window.location.href = './login.html';
                }
            }
            
            return success;
        } catch (error) {
            console.error('❌ Erro no logout:', error);
            return false;
        }
    }

    /**
     * Verificar se usuário está autenticado
     */
    async isAuthenticated() {
        const session = await this.checkCurrentSession();
        return !!session && !supabaseManager.isSessionExpired();
    }

    /**
     * Obter tempo restante da sessão
     */
    getSessionTimeRemaining() {
        const sessionExpiry = localStorage.getItem('admin_session_expiry');
        if (!sessionExpiry) return 0;
        
        const expiryDate = new Date(sessionExpiry);
        const now = new Date();
        
        return Math.max(0, expiryDate.getTime() - now.getTime());
    }

    /**
     * Formatar tempo restante para exibição
     */
    formatTimeRemaining(milliseconds) {
        const hours = Math.floor(milliseconds / (1000 * 60 * 60));
        const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
        
        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else {
            return `${minutes}m`;
        }
    }

    /**
     * Iniciar monitoramento de sessão
     */
    startSessionMonitoring() {
        // Parar monitoramento anterior se existir
        this.stopSessionMonitoring();
        
        // Verificar sessão a cada 5 minutos
        this.sessionCheckInterval = setInterval(async () => {
            const timeRemaining = this.getSessionTimeRemaining();
            
            if (timeRemaining <= 0) {
                console.log('⏰ Sessão expirada, fazendo logout...');
                await this.logout();
                return;
            }
            
            // Mostrar aviso se restam menos de 30 minutos
            if (timeRemaining < 30 * 60 * 1000 && !this.sessionWarningShown) {
                this.showSessionWarning(timeRemaining);
            }
            
            // Auto-logout se restam menos de 5 minutos
            if (timeRemaining < 5 * 60 * 1000) {
                console.log('⏰ Sessão expirando em menos de 5 minutos, fazendo logout...');
                await this.logout();
            }
        }, 5 * 60 * 1000); // 5 minutos
        
        console.log('⏰ Monitoramento de sessão iniciado');
    }

    /**
     * Parar monitoramento de sessão
     */
    stopSessionMonitoring() {
        if (this.sessionCheckInterval) {
            clearInterval(this.sessionCheckInterval);
            this.sessionCheckInterval = null;
            console.log('⏰ Monitoramento de sessão parado');
        }
    }

    /**
     * Mostrar aviso de expiração de sessão
     */
    showSessionWarning(timeRemaining) {
        this.sessionWarningShown = true;
        
        const timeFormatted = this.formatTimeRemaining(timeRemaining);
        
        // Criar notificação visual
        const warning = document.createElement('div');
        warning.id = 'session-warning';
        warning.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #fef3c7;
            border: 1px solid #f59e0b;
            color: #92400e;
            padding: 16px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            z-index: 10000;
            max-width: 300px;
            font-family: system-ui, sans-serif;
            font-size: 14px;
        `;
        
        warning.innerHTML = `
            <div style="font-weight: 600; margin-bottom: 8px;">⚠️ Sessão Expirando</div>
            <div>Sua sessão expira em ${timeFormatted}. Salve seu trabalho.</div>
            <button onclick="this.parentElement.remove()" style="
                background: none;
                border: none;
                color: #92400e;
                cursor: pointer;
                float: right;
                margin-top: 8px;
                text-decoration: underline;
            ">Fechar</button>
        `;
        
        document.body.appendChild(warning);
        
        // Remover aviso após 10 segundos
        setTimeout(() => {
            const warningElement = document.getElementById('session-warning');
            if (warningElement) {
                warningElement.remove();
            }
        }, 10000);
        
        console.log(`⚠️ Aviso de sessão mostrado: ${timeFormatted} restantes`);
    }

    /**
     * Configurar listeners de eventos
     */
    setupEventListeners() {
        // Verificar sessão quando a página ganha foco
        window.addEventListener('focus', async () => {
            await this.checkCurrentSession();
        });
        
        // Verificar sessão quando sai do modo offline
        window.addEventListener('online', async () => {
            await this.checkCurrentSession();
        });
        
        // Limpar recursos quando a página é fechada
        window.addEventListener('beforeunload', () => {
            this.stopSessionMonitoring();
        });
    }

    /**
     * Middleware para proteger páginas admin
     */
    async requireAuth() {
        const isAuth = await this.isAuthenticated();
        
        if (!isAuth) {
            console.log('🔒 Acesso negado, redirecionando para login...');
            window.location.href = './login.html';
            return false;
        }
        
        return true;
    }

    /**
     * Obter informações da sessão atual
     */
    getSessionInfo() {
        const sessionExpiry = localStorage.getItem('admin_session_expiry');
        const isAuthenticated = localStorage.getItem('admin_authenticated');
        
        if (!sessionExpiry || isAuthenticated !== 'true') {
            return null;
        }
        
        const expiryDate = new Date(sessionExpiry);
        const timeRemaining = this.getSessionTimeRemaining();
        
        return {
            expiresAt: expiryDate,
            timeRemaining: timeRemaining,
            timeRemainingFormatted: this.formatTimeRemaining(timeRemaining),
            isExpired: timeRemaining <= 0
        };
    }
}

// Criar instância singleton
const authManager = new AuthManager();

// Exportar para uso global
export default authManager;
export { authManager };

// Disponibilizar globalmente
window.authManager = authManager;

console.log('🔐 Sistema de autenticação carregado');