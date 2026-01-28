/**
 * Verificador de Plano Supabase
 * Verifica o status real do plano e limites
 */

class SupabasePlanChecker {
    constructor() {
        this.apiUrl = 'https://jomwkkhhhekbyanftpoc.supabase.co';
        this.projectRef = 'jomwkkhhhekbyanftpoc';
        
        console.log('🔍 Verificador de Plano Supabase inicializado');
    }

    /**
     * Verificar status do projeto
     */
    async checkProjectStatus() {
        try {
            console.log('🔄 Verificando status do projeto...');
            
            // Tentar uma consulta simples para verificar se está ativo
            const response = await fetch(`${this.apiUrl}/rest/v1/global_counter?select=total_count&limit=1`, {
                headers: {
                    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpvbXdra2hoaGVrYnlhbmZ0cG9jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5OTMxNjMsImV4cCI6MjA4MzU2OTE2M30.hWo1X0j5XcDPtsG1JdBTMY_kTTFi6ff6Xw3uqZdEPvc',
                    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpvbXdra2hoaGVrYnlhbmZ0cG9jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5OTMxNjMsImV4cCI6MjA4MzU2OTE2M30.hWo1X0j5XcDPtsG1JdBTMY_kTTFi6ff6Xw3uqZdEPvc'
                }
            });

            const status = {
                isActive: response.ok,
                statusCode: response.status,
                statusText: response.statusText,
                timestamp: new Date().toISOString()
            };

            if (response.ok) {
                console.log('✅ Projeto ativo e funcionando');
                status.message = 'Projeto funcionando normalmente';
                status.severity = 'success';
            } else if (response.status === 429) {
                console.log('⚠️ Rate limit atingido (throttling)');
                status.message = 'Projeto com throttling (limite de requisições)';
                status.severity = 'warning';
            } else if (response.status === 402) {
                console.log('🔴 Projeto pausado por excesso de uso');
                status.message = 'Projeto pausado - excesso de cached egress';
                status.severity = 'error';
            } else {
                console.log(`❓ Status desconhecido: ${response.status}`);
                status.message = `Status HTTP: ${response.status}`;
                status.severity = 'unknown';
            }

            return status;

        } catch (error) {
            console.error('❌ Erro ao verificar status:', error);
            return {
                isActive: false,
                error: error.message,
                message: 'Erro na verificação - possível bloqueio',
                severity: 'error',
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Simular verificação de plano (não há API pública para isso)
     */
    async estimatePlanStatus() {
        const status = await this.checkProjectStatus();
        
        const planInfo = {
            estimatedPlan: 'Free Tier',
            cachedEgressLimit: '5 GB',
            currentStatus: status.message,
            severity: status.severity,
            recommendations: []
        };

        // Adicionar recomendações baseadas no status
        if (status.severity === 'error') {
            planInfo.recommendations = [
                '🚨 Implementar TODAS as otimizações imediatamente',
                '⏱️ Aguardar reset mensal do limite',
                '📊 Considerar upgrade para plano pago se necessário',
                '🔧 Revisar arquitetura para reduzir consultas'
            ];
        } else if (status.severity === 'warning') {
            planInfo.recommendations = [
                '⚠️ Implementar otimizações para evitar pausas',
                '📈 Monitorar uso mais de perto',
                '🔄 Ativar modo emergência preventivo'
            ];
        } else {
            planInfo.recommendations = [
                '✅ Continuar implementando otimizações',
                '📊 Monitorar uso regularmente',
                '🚀 Manter boas práticas'
            ];
        }

        return planInfo;
    }

    /**
     * Verificar se há throttling ativo
     */
    async checkThrottling() {
        const startTime = Date.now();
        
        try {
            await this.checkProjectStatus();
            const responseTime = Date.now() - startTime;
            
            const throttlingInfo = {
                responseTime: responseTime + 'ms',
                isThrottled: responseTime > 5000, // Mais de 5s indica throttling
                severity: responseTime > 5000 ? 'warning' : 'normal'
            };

            if (throttlingInfo.isThrottled) {
                console.log('⚠️ Throttling detectado - respostas lentas');
                throttlingInfo.message = 'Throttling ativo - projeto com limitações';
            } else {
                console.log('✅ Sem throttling detectado');
                throttlingInfo.message = 'Velocidade normal';
            }

            return throttlingInfo;

        } catch (error) {
            return {
                responseTime: 'timeout',
                isThrottled: true,
                severity: 'error',
                message: 'Possível bloqueio total',
                error: error.message
            };
        }
    }

    /**
     * Relatório completo do status
     */
    async generateStatusReport() {
        console.log('📋 Gerando relatório completo...');
        
        const [projectStatus, planInfo, throttlingInfo] = await Promise.all([
            this.checkProjectStatus(),
            this.estimatePlanStatus(),
            this.checkThrottling()
        ]);

        const report = {
            timestamp: new Date().toISOString(),
            project: {
                ref: this.projectRef,
                url: this.apiUrl,
                status: projectStatus
            },
            plan: planInfo,
            performance: throttlingInfo,
            summary: this.generateSummary(projectStatus, planInfo, throttlingInfo)
        };

        console.log('📊 Relatório gerado:', report);
        return report;
    }

    /**
     * Gerar resumo da situação
     */
    generateSummary(projectStatus, planInfo, throttlingInfo) {
        let summary = {
            status: 'unknown',
            message: '',
            urgency: 'low',
            actions: []
        };

        if (!projectStatus.isActive) {
            summary = {
                status: 'blocked',
                message: '🔴 Projeto pausado ou bloqueado',
                urgency: 'critical',
                actions: [
                    'Aguardar reset mensal',
                    'Implementar otimizações',
                    'Considerar plano pago'
                ]
            };
        } else if (throttlingInfo.isThrottled) {
            summary = {
                status: 'throttled',
                message: '⚠️ Projeto com throttling (lento)',
                urgency: 'high',
                actions: [
                    'Implementar otimizações imediatamente',
                    'Reduzir uso temporariamente',
                    'Monitorar de perto'
                ]
            };
        } else {
            summary = {
                status: 'active',
                message: '✅ Projeto funcionando normalmente',
                urgency: 'low',
                actions: [
                    'Continuar otimizações preventivas',
                    'Monitorar uso regularmente'
                ]
            };
        }

        return summary;
    }

    /**
     * Monitoramento contínuo
     */
    startMonitoring(intervalMinutes = 15) {
        console.log(`🔄 Iniciando monitoramento a cada ${intervalMinutes} minutos`);
        
        setInterval(async () => {
            const report = await this.generateStatusReport();
            
            if (report.summary.urgency === 'critical') {
                console.error('🚨 CRÍTICO:', report.summary.message);
            } else if (report.summary.urgency === 'high') {
                console.warn('⚠️ ATENÇÃO:', report.summary.message);
            } else {
                console.log('✅ Status:', report.summary.message);
            }
        }, intervalMinutes * 60 * 1000);
    }
}

// Instância global
window.supabasePlanChecker = new SupabasePlanChecker();

// Verificar status imediatamente
window.supabasePlanChecker.generateStatusReport().then(report => {
    console.log('📋 Relatório inicial:', report);
    
    // Mostrar alerta se necessário
    if (report.summary.urgency === 'critical') {
        alert(`🚨 ATENÇÃO: ${report.summary.message}\n\nAções recomendadas:\n${report.summary.actions.join('\n')}`);
    }
});

export default SupabasePlanChecker;