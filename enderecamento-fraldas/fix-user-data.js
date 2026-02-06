// CORREÇÃO PARA PROBLEMA DE NOME E MATRÍCULA DUPLICADOS
// Este arquivo corrige o problema onde o nome do usuário aparece igual à matrícula

// Função para buscar nome do usuário pela matrícula
function buscarNomeUsuario(matricula) {
    if (!matricula) return null;
    
    // Tentar buscar do sistema de validação (cache em memória)
    if (window.UserValidation && window.UserValidation.isReady) {
        const validation = window.UserValidation.validateMatricula(matricula);
        if (validation.valid && validation.user) {
            return validation.user.Nome;
        }
    }
    
    // Tentar buscar da base de dados global
    if (window.DB_USUARIO && window.DB_USUARIO.BASE_USUARIO) {
        const user = window.DB_USUARIO.BASE_USUARIO.find(u => u.Matricula == matricula);
        if (user) {
            return user.Nome;
        }
    }
    
    // Tentar buscar dos usuários disponíveis (se estiver na página de login)
    if (window.USUARIOS_DISPONIVEIS) {
        const user = window.USUARIOS_DISPONIVEIS.find(u => u.Matricula == matricula);
        if (user) {
            return user.Nome;
        }
    }
    
    return null;
}

// Função para corrigir dados da sessão
function corrigirDadosSessao() {
    try {
        const sessionData = JSON.parse(localStorage.getItem('enderecamento_fraldas_session') || '{}');
        
        if (sessionData.matricula && sessionData.usuario === sessionData.matricula) {
            // Nome está igual à matrícula - precisa corrigir
            console.warn('⚠️ Detectado problema: nome igual à matrícula', sessionData.matricula);
            
            const nomeCorreto = buscarNomeUsuario(sessionData.matricula);
            if (nomeCorreto) {
                sessionData.usuario = nomeCorreto;
                localStorage.setItem('enderecamento_fraldas_session', JSON.stringify(sessionData));
                console.log('✅ Nome corrigido na sessão:', nomeCorreto);
                return true;
            } else {
                console.warn('⚠️ Não foi possível encontrar nome para matrícula:', sessionData.matricula);
            }
        }
        
        return false;
    } catch (error) {
        console.error('❌ Erro ao corrigir dados da sessão:', error);
        return false;
    }
}

// Função para obter dados da sessão com correção automática
function obterDadosSessaoCorrigidos() {
    // Primeiro tenta corrigir se necessário
    corrigirDadosSessao();
    
    try {
        const sessionData = JSON.parse(localStorage.getItem('enderecamento_fraldas_session') || '{}');
        
        // Se ainda estiver com problema, tenta buscar o nome novamente
        let usuario = sessionData.usuario || 'Sistema';
        if (sessionData.matricula && usuario === sessionData.matricula) {
            const nomeCorreto = buscarNomeUsuario(sessionData.matricula);
            if (nomeCorreto) {
                usuario = nomeCorreto;
            }
        }
        
        return {
            usuario: usuario,
            matricula: sessionData.matricula || null,
            cd: sessionData.cd || 2,
            nomeCD: sessionData.nomeCD || 'CD02'
        };
    } catch {
        return { usuario: 'Sistema', matricula: null, cd: 2, nomeCD: 'CD02' };
    }
}

// Função para validar e corrigir dados antes de enviar para o banco
function validarDadosUsuario(dadosUsuario) {
    if (!dadosUsuario) return dadosUsuario;
    
    // Se o nome está igual à matrícula, tenta buscar o nome correto
    if (dadosUsuario.usuario && dadosUsuario.matricula && 
        dadosUsuario.usuario === dadosUsuario.matricula) {
        
        const nomeCorreto = buscarNomeUsuario(dadosUsuario.matricula);
        if (nomeCorreto) {
            dadosUsuario.usuario = nomeCorreto;
            console.log('✅ Nome corrigido antes de enviar para banco:', nomeCorreto);
        }
    }
    
    return dadosUsuario;
}

// Interceptar chamadas para o banco e corrigir dados
if (window.EnderecoSupabase) {
    const originalObterDadosSessao = window.EnderecoSupabase.prototype.obterDadosSessao;
    
    window.EnderecoSupabase.prototype.obterDadosSessao = function() {
        const dados = obterDadosSessaoCorrigidos();
        return validarDadosUsuario(dados);
    };
    
    console.log('✅ Interceptação de dados de sessão ativada');
}

// Executar correção automática quando o script for carregado
document.addEventListener('DOMContentLoaded', function() {
    // Aguardar um pouco para garantir que outros scripts foram carregados
    setTimeout(() => {
        if (corrigirDadosSessao()) {
            console.log('✅ Dados da sessão corrigidos automaticamente');
            
            // Atualizar interface se necessário
            if (typeof atualizarInfoUsuario === 'function') {
                const dadosCorrigidos = obterDadosSessaoCorrigidos();
                atualizarInfoUsuario(dadosCorrigidos);
            }
        }
    }, 1000);
});

// Exportar funções para uso global
window.UserDataFix = {
    buscarNomeUsuario,
    corrigirDadosSessao,
    obterDadosSessaoCorrigidos,
    validarDadosUsuario
};

console.log('✅ Sistema de correção de dados de usuário carregado');