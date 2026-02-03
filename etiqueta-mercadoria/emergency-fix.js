/**
 * Emergency Fix - Correções robustas para problemas de impressão
 * Resolve: estado corrompido, pendingData travado, cache inconsistente
 */

(function() {
    'use strict';

    console.log('🚨 Sistema de correção de emergência carregado');

    // ===== ESTADO GLOBAL DE EMERGÊNCIA =====
    const EmergencyState = {
        lastPrintAttempt: null,
        printErrors: [],
        recoveryAttempts: 0,
        maxRecoveryAttempts: 3
    };

    // ===== FUNÇÕES DE LIMPEZA DE EMERGÊNCIA =====
    
    /**
     * Limpa todo o estado da aplicação sem afetar configurações importantes
     */
    function emergencyClearState() {
        console.log('🧹 Limpando estado de emergência...');
        
        try {
            // Limpar pendingData global
            if (typeof window.pendingData !== 'undefined') {
                window.pendingData = null;
            }
            
            // Limpar qualquer timeout pendente relacionado à impressão
            if (window._printTimeout) {
                clearTimeout(window._printTimeout);
                window._printTimeout = null;
            }
            
            // Resetar flags de processamento
            window._isProcessing = false;
            window._printInProgress = false;
            
            console.log('✅ Estado limpo com sucesso');
            return true;
        } catch (error) {
            console.error('❌ Erro ao limpar estado:', error);
            return false;
        }
    }

    /**
     * Verifica se há estado corrompido
     */
    function checkCorruptedState() {
        const issues = [];
        
        // Verificar pendingData inconsistente
        if (window.pendingData) {
            const required = ['product', 'targetAddress', 'barcode', 'matricula', 'destinoType'];
            const missing = required.filter(field => !window.pendingData[field]);
            if (missing.length > 0) {
                issues.push(`pendingData incompleto: faltando ${missing.join(', ')}`);
            }
        }
        
        // Verificar se há processamento travado
        if (window._isProcessing && window._lastProcessStart) {
            const stuckTime = Date.now() - window._lastProcessStart;
            if (stuckTime > 30000) { // 30 segundos
                issues.push(`Processamento travado há ${Math.round(stuckTime/1000)}s`);
            }
        }
        
        return issues;
    }

    /**
     * Repara estado automaticamente
     */
    function autoRepair() {
        console.log('🔧 Tentando reparo automático...');
        
        const issues = checkCorruptedState();
        if (issues.length === 0) {
            console.log('✅ Nenhum problema detectado');
            return true;
        }
        
        console.log('⚠️ Problemas detectados:', issues);
        
        if (EmergencyState.recoveryAttempts >= EmergencyState.maxRecoveryAttempts) {
            console.error('❌ Máximo de tentativas de recuperação atingido');
            showEmergencyNotification('Não foi possível recuperar automaticamente. Use o botão de emergência.', 'error');
            return false;
        }
        
        EmergencyState.recoveryAttempts++;
        
        // Tentar limpar estado
        emergencyClearState();
        
        // Recarregar preferências
        if (typeof loadDestinoPreference === 'function') {
            loadDestinoPreference();
        }
        if (typeof loadDepositoPreference === 'function') {
            loadDepositoPreference();
        }
        
        console.log('✅ Reparo automático concluído');
        showEmergencyNotification('Sistema recuperado automaticamente', 'success');
        return true;
    }

    // ===== INTERCEPTAÇÃO DE FUNÇÕES CRÍTICAS =====

    /**
     * Intercepta window.print para adicionar proteções
     */
    function interceptPrint() {
        const originalPrint = window.print;
        
        window.print = function() {
            console.log('🖨️ Interceptando chamada de impressão...');
            
            // Verificar estado antes de imprimir
            const issues = checkCorruptedState();
            if (issues.length > 0) {
                console.warn('⚠️ Estado corrompido detectado antes da impressão:', issues);
                if (!autoRepair()) {
                    showEmergencyNotification('Erro no sistema de impressão. Limpe o estado e tente novamente.', 'error');
                    return false;
                }
            }
            
            EmergencyState.lastPrintAttempt = Date.now();
            
            try {
                // Tentar impressão
                const result = originalPrint.apply(this, arguments);
                console.log('✅ Impressão iniciada com sucesso');
                EmergencyState.recoveryAttempts = 0; // Resetar contador em sucesso
                return result;
            } catch (error) {
                console.error('❌ Erro na impressão:', error);
                EmergencyState.printErrors.push({
                    time: new Date().toISOString(),
                    error: error.message
                });
                
                // Tentar reparo
                autoRepair();
                throw error;
            }
        };
        
        console.log('✅ Interceptação de print configurada');
    }

    /**
     * Intercepta executePrint para proteção adicional
     */
    function interceptExecutePrint() {
        // Aguardar app.js carregar
        const checkInterval = setInterval(() => {
            if (typeof window.executePrint === 'function') {
                clearInterval(checkInterval);
                
                const originalExecutePrint = window.executePrint;
                
                window.executePrint = async function(copies, validityDate = null) {
                    console.log('🔧 Interceptando executePrint com proteções...');
                    
                    // Verificar pendingData
                    if (!window.pendingData) {
                        console.error('❌ pendingData está nulo!');
                        showEmergencyNotification('Dados da etiqueta não encontrados. Escaneie o produto novamente.', 'error');
                        return false;
                    }
                    
                    // Marcar início do processamento
                    window._isProcessing = true;
                    window._lastProcessStart = Date.now();
                    
                    try {
                        const result = await originalExecutePrint.apply(this, arguments);
                        window._isProcessing = false;
                        return result;
                    } catch (error) {
                        window._isProcessing = false;
                        console.error('❌ Erro em executePrint:', error);
                        
                        // Tentar reparo
                        autoRepair();
                        throw error;
                    }
                };
                
                console.log('✅ Interceptação de executePrint configurada');
            }
        }, 500);
    }

    // ===== BOTÃO DE EMERGÊNCIA =====

    function createEmergencyButton() {
        // Verificar se já existe
        if (document.getElementById('emergency-btn')) return;
        
        const btn = document.createElement('button');
        btn.id = 'emergency-btn';
        btn.innerHTML = '🆘';
        btn.title = 'Emergência: Limpar estado e cache';
        btn.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 50px;
            height: 50px;
            border-radius: 50%;
            background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
            color: white;
            border: none;
            font-size: 24px;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
            z-index: 9999;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        
        btn.addEventListener('mouseenter', () => {
            btn.style.transform = 'scale(1.1)';
            btn.style.boxShadow = '0 6px 20px rgba(239, 68, 68, 0.6)';
        });
        
        btn.addEventListener('mouseleave', () => {
            btn.style.transform = 'scale(1)';
            btn.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.4)';
        });
        
        btn.addEventListener('click', showEmergencyModal);
        
        document.body.appendChild(btn);
        console.log('✅ Botão de emergência criado');
    }

    function showEmergencyModal() {
        // Remover modal existente
        const existing = document.getElementById('emergency-modal');
        if (existing) existing.remove();
        
        const modal = document.createElement('div');
        modal.id = 'emergency-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.6);
            backdrop-filter: blur(4px);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;
        
        const content = document.createElement('div');
        content.style.cssText = `
            background: white;
            border-radius: 16px;
            padding: 28px;
            max-width: 420px;
            width: 90%;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            animation: slideIn 0.3s ease;
        `;
        
        // Verificar problemas atuais
        const issues = checkCorruptedState();
        const hasIssues = issues.length > 0;
        
        content.innerHTML = `
            <div style="text-align: center; margin-bottom: 20px;">
                <div style="font-size: 48px; margin-bottom: 12px;">🛠️</div>
                <h2 style="margin: 0 0 8px 0; color: #1f2937; font-size: 22px;">Ferramentas de Emergência</h2>
                <p style="margin: 0; color: #6b7280; font-size: 14px;">Use estas opções se a impressão não estiver funcionando</p>
            </div>
            
            ${hasIssues ? `
            <div style="background: #fef3c7; border: 1px solid #fbbf24; border-radius: 8px; padding: 12px; margin-bottom: 16px;">
                <div style="font-weight: 600; color: #92400e; margin-bottom: 4px;">⚠️ Problemas detectados:</div>
                <ul style="margin: 0; padding-left: 18px; color: #92400e; font-size: 13px;">
                    ${issues.map(i => `<li>${i}</li>`).join('')}
                </ul>
            </div>
            ` : ''}
            
            <div style="display: flex; flex-direction: column; gap: 10px;">
                <button id="emergency-clear-state" style="
                    padding: 14px;
                    border-radius: 10px;
                    border: 2px solid #3b82f6;
                    background: #eff6ff;
                    color: #1d4ed8;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                ">
                    🧹 Limpar Estado da Impressão
                </button>
                
                <button id="emergency-clear-cache" style="
                    padding: 14px;
                    border-radius: 10px;
                    border: 2px solid #f59e0b;
                    background: #fffbeb;
                    color: #b45309;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                ">
                    🗑️ Limpar Cache e Recarregar
                </button>
                
                <button id="emergency-reset-all" style="
                    padding: 14px;
                    border-radius: 10px;
                    border: 2px solid #ef4444;
                    background: #fef2f2;
                    color: #b91c1c;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                ">
                    ⚠️ Reset Total (Apaga Tudo)
                </button>
                
                <button id="emergency-close" style="
                    padding: 12px;
                    border-radius: 10px;
                    border: none;
                    background: #f3f4f6;
                    color: #4b5563;
                    font-weight: 500;
                    cursor: pointer;
                    margin-top: 8px;
                ">
                    Fechar
                </button>
            </div>
            
            <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
                <div style="font-size: 12px; color: #9ca3af; text-align: center;">
                    Última tentativa: ${EmergencyState.lastPrintAttempt ? new Date(EmermalState.lastPrintAttempt).toLocaleTimeString() : 'Nunca'}<br>
                    Tentativas de recuperação: ${EmergencyState.recoveryAttempts}/${EmergencyState.maxRecoveryAttempts}
                </div>
            </div>
        `;
        
        modal.appendChild(content);
        document.body.appendChild(modal);
        
        // Eventos
        document.getElementById('emergency-close').addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
        
        document.getElementById('emergency-clear-state').addEventListener('click', () => {
            emergencyClearState();
            showEmergencyNotification('✅ Estado limpo! Você pode tentar imprimir novamente.', 'success');
            modal.remove();
        });
        
        document.getElementById('emergency-clear-cache').addEventListener('click', () => {
            // Limpar apenas caches, não localStorage de configurações
            if ('caches' in window) {
                caches.keys().then(names => {
                    names.forEach(name => caches.delete(name));
                });
            }
            emergencyClearState();
            showEmergencyNotification('🔄 Recarregando página...', 'info');
            setTimeout(() => location.reload(), 1000);
        });
        
        document.getElementById('emergency-reset-all').addEventListener('click', () => {
            if (confirm('⚠️ ATENÇÃO: Isso apagará TODAS as configurações salvas (depósito, modo, etc).\n\nTem certeza?')) {
                localStorage.clear();
                showEmergencyNotification('🗑️ Tudo apagado! Recarregando...', 'info');
                setTimeout(() => location.reload(), 1000);
            }
        });
    }

    function showEmergencyNotification(message, type = 'info') {
        // Remover notificação existente
        const existing = document.getElementById('emergency-notification');
        if (existing) existing.remove();
        
        const colors = {
            success: { bg: '#10b981', light: '#d1fae5' },
            error: { bg: '#ef4444', light: '#fee2e2' },
            warning: { bg: '#f59e0b', light: '#fef3c7' },
            info: { bg: '#3b82f6', light: '#dbeafe' }
        };
        
        const color = colors[type] || colors.info;
        
        const notif = document.createElement('div');
        notif.id = 'emergency-notification';
        notif.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: white;
            border-left: 4px solid ${color.bg};
            padding: 16px 20px;
            border-radius: 8px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            z-index: 10001;
            max-width: 350px;
            animation: slideInRight 0.3s ease;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;
        notif.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px;">
                <div style="
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    background: ${color.light};
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 16px;
                ">${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}</div>
                <div style="flex: 1; color: #1f2937; font-size: 14px; line-height: 1.4;">${message}</div>
            </div>
        `;
        
        document.body.appendChild(notif);
        
        setTimeout(() => {
            notif.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => notif.remove(), 300);
        }, 5000);
    }

    // ===== CSS PARA ANIMAÇÕES =====
    function injectStyles() {
        if (document.getElementById('emergency-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'emergency-styles';
        style.textContent = `
            @keyframes slideIn {
                from { opacity: 0; transform: translateY(-20px) scale(0.95); }
                to { opacity: 1; transform: translateY(0) scale(1); }
            }
            @keyframes slideInRight {
                from { opacity: 0; transform: translateX(100px); }
                to { opacity: 1; transform: translateX(0); }
            }
            @keyframes slideOutRight {
                from { opacity: 1; transform: translateX(0); }
                to { opacity: 0; transform: translateX(100px); }
            }
            #emergency-btn:hover {
                transform: scale(1.1) !important;
            }
        `;
        document.head.appendChild(style);
    }

    // ===== MONITORAMENTO CONTÍNUO =====
    function startMonitoring() {
        // Verificar estado a cada 30 segundos
        setInterval(() => {
            const issues = checkCorruptedState();
            if (issues.length > 0) {
                console.warn('⚠️ Problemas detectados pelo monitor:', issues);
                // Tentar reparo silencioso
                if (EmergencyState.recoveryAttempts < EmergencyState.maxRecoveryAttempts) {
                    autoRepair();
                }
            }
        }, 30000);
        
        console.log('✅ Monitoramento contínuo iniciado (a cada 30s)');
    }

    // ===== INICIALIZAÇÃO =====
    function init() {
        console.log('🚀 Inicializando sistema de emergência...');
        
        injectStyles();
        interceptPrint();
        interceptExecutePrint();
        
        // Criar botão quando DOM estiver pronto
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                createEmergencyButton();
                startMonitoring();
            });
        } else {
            createEmergencyButton();
            startMonitoring();
        }
        
        // Exportar funções globais
        window.emergencyFix = {
            clearState: emergencyClearState,
            checkState: checkCorruptedState,
            repair: autoRepair,
            showModal: showEmergencyModal,
            showNotification: showEmergencyNotification
        };
        
        console.log('✅ Sistema de emergência pronto!');
        console.log('💡 Use emergencyFix.showModal() para abrir as ferramentas');
    }

    // Iniciar
    init();

})();
