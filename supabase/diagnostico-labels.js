/**
 * Script de diagnóstico para testar inserção direta na tabela labels
 * Execute no console do navegador após carregar a aplicação
 */

async function testarInsercaoLabels() {
    console.log('🧪 Iniciando teste de inserção na tabela labels...');

    // Verificar se supabaseManager está disponível
    if (!window.supabaseManager) {
        console.error('❌ supabaseManager não está disponível!');
        console.log('💡 Verifique se o Supabase foi inicializado corretamente.');
        return { success: false, error: 'supabaseManager não disponível' };
    }

    if (!window.supabaseManager.client) {
        console.error('❌ Cliente Supabase não está inicializado!');
        return { success: false, error: 'Cliente Supabase não inicializado' };
    }

    console.log('✅ supabaseManager disponível');
    console.log('📊 Online:', window.supabaseManager.isOnline());

    // Dados de teste
    const testData = {
        application_type: 'termo',
        coddv: 'TESTE_' + Date.now(),
        quantity: 1,
        copies: 1,
        label_type: null,
        orientation: 'h',
        cd: '1',
        user_session_id: null,
        metadata: { test: true, timestamp: new Date().toISOString() }
    };

    console.log('📝 Dados de teste:', testData);

    try {
        // Teste 1: Verificar conexão com uma query simples
        console.log('🔍 Teste 1: Verificando conexão com SELECT...');
        const { data: selectData, error: selectError } = await window.supabaseManager.client
            .from('labels')
            .select('id')
            .limit(1);

        if (selectError) {
            console.error('❌ Erro no SELECT:', selectError);
            console.log('💡 Isso indica problema de conexão ou permissão de leitura.');
            return { success: false, error: selectError, step: 'SELECT' };
        }
        console.log('✅ SELECT funcionou! Registros existentes:', selectData?.length || 0);

        // Teste 2: Tentar INSERT direto
        console.log('🔍 Teste 2: Tentando INSERT direto...');
        const { data: insertData, error: insertError } = await window.supabaseManager.client
            .from('labels')
            .insert([testData])
            .select();

        if (insertError) {
            console.error('❌ Erro no INSERT:', insertError);
            console.log('💡 Detalhes do erro:', JSON.stringify(insertError, null, 2));

            // Analisar tipo de erro
            if (insertError.message?.includes('permission') || insertError.code === '42501') {
                console.log('🔐 SOLUÇÃO: Execute o SQL de permissões no Supabase Dashboard.');
            } else if (insertError.message?.includes('check constraint')) {
                console.log('⚠️ SOLUÇÃO: Um dos valores viola uma constraint. Verifique os valores.');
            } else if (insertError.message?.includes('not null')) {
                console.log('⚠️ SOLUÇÃO: Um campo obrigatório está nulo.');
            }

            return { success: false, error: insertError, step: 'INSERT' };
        }

        console.log('✅ INSERT bem-sucedido!');
        console.log('📊 Registro inserido:', insertData);

        // Limpar registro de teste
        if (insertData && insertData[0]?.id) {
            console.log('🧹 Limpando registro de teste...');
            await window.supabaseManager.client
                .from('labels')
                .delete()
                .eq('id', insertData[0].id);
            console.log('✅ Registro de teste removido.');
        }

        return { success: true, data: insertData };

    } catch (error) {
        console.error('❌ Erro inesperado:', error);
        return { success: false, error: error.message };
    }
}

// Função para verificar configuração do Supabase
function verificarConfigSupabase() {
    console.log('🔧 Verificando configuração do Supabase...');

    if (!window.supabaseManager) {
        console.error('❌ supabaseManager não encontrado');
        return;
    }

    console.log('📊 Estado do SupabaseManager:');
    console.log('  - Inicializado:', !!window.supabaseManager.client);
    console.log('  - Online:', window.supabaseManager.isOnline());
    console.log('  - Queue offline:', window.supabaseManager.getQueueStatus());

    if (window.supabaseManager.client) {
        console.log('  - URL do Supabase:', window.supabaseManager.client.supabaseUrl);
    }
}

// Exportar funções para uso no console
window.testarInsercaoLabels = testarInsercaoLabels;
window.verificarConfigSupabase = verificarConfigSupabase;

console.log('');
console.log('═══════════════════════════════════════════════════════════════');
console.log('🧪 SCRIPT DE DIAGNÓSTICO CARREGADO');
console.log('═══════════════════════════════════════════════════════════════');
console.log('');
console.log('Execute no console:');
console.log('  verificarConfigSupabase()  - Ver estado da conexão');
console.log('  testarInsercaoLabels()     - Testar INSERT na tabela labels');
console.log('');
