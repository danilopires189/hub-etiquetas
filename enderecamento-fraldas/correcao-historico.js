/* ===== Correção para problema de Invalid Date no histórico ===== */

// Função para formatar data de forma segura
function formatarDataSegura(dataStr) {
  if (!dataStr) return 'Data não disponível';
  
  try {
    // Se a data já está no formato brasileiro (dd/mm/aaaa hh:mm:ss), usar diretamente
    if (typeof dataStr === 'string' && dataStr.includes('/')) {
      // Verificar se é um formato válido brasileiro
      const regexBR = /^\d{2}\/\d{2}\/\d{4}\s\d{2}:\d{2}(:\d{2})?$/;
      if (regexBR.test(dataStr)) {
        return dataStr.replace(/:\d{2}$/, ''); // Remover segundos se existir
      }
    }
    
    // Tentar converter de ISO string ou outros formatos
    const data = new Date(dataStr);
    if (!isNaN(data.getTime())) {
      return data.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  } catch (e) {
    console.warn('Erro ao converter data:', dataStr, e);
  }
  
  return 'Data inválida';
}

// Sobrescrever as funções de histórico com correção de data
async function exibirHistoricoCorrigido() {
  const lista = document.querySelector('#historicoLista');
  if (!lista) {
    console.error('❌ Elemento #historicoLista não encontrado');
    return;
  }
  
  let historicoOperacoes = [];

  // Tentar buscar do Supabase primeiro
  if (window.sistemaEnderecamento && window.sistemaEnderecamento.isConnected && !window.sistemaEnderecamento.modoOffline) {
    try {
      lista.innerHTML = '<div class="historico-loading">Carregando histórico...</div>';
      
      const historicoSupabase = await window.sistemaEnderecamento.obterHistorico(50);
      
      // Converter formato do Supabase para formato local com correção de data
      historicoOperacoes = historicoSupabase.map(item => {
        console.log('🔍 Debug item do Supabase:', item); // Debug para ver formato dos dados
        
        return {
          timestamp: formatarDataSegura(item.data_hora),
          dataHoraRaw: item.data_hora, // Guardar data original para ordenação
          tipo: item.tipo,
          coddv: item.coddv,
          desc: item.descricao_produto || 'Produto não identificado',
          enderecoAnterior: item.endereco_origem,
          enderecoNovo: item.endereco_destino || item.endereco,
          usuario: item.usuario,
          matricula: item.matricula,
          cd: item.cd
        };
      });

      // O Supabase já retorna ordenado por data_hora DESC
      console.log('✅ Histórico carregado do Supabase:', historicoOperacoes.length, 'registros');
      
    } catch (error) {
      console.error('❌ Erro ao carregar histórico do Supabase:', error);
      // Fallback para localStorage
      historicoOperacoes = JSON.parse(localStorage.getItem('historico_operacoes') || '[]');
    }
  } else {
    // Usar localStorage como fallback
    historicoOperacoes = JSON.parse(localStorage.getItem('historico_operacoes') || '[]');
  }

  if (historicoOperacoes.length === 0) {
    lista.innerHTML = '<p class="historico-vazio">Nenhuma operação realizada ainda</p>';
    return;
  }

  // Pegar apenas os últimos 10 movimentos
  const ultimosMovimentos = historicoOperacoes.slice(0, 10);
  const totalMovimentos = historicoOperacoes.length;

  // Cabeçalho com informação de quantos movimentos estão sendo exibidos
  const fonteIndicador = window.sistemaEnderecamento && window.sistemaEnderecamento.isConnected && !window.sistemaEnderecamento.modoOffline ? 
    '<span class="historico-fonte supabase">☁️ Supabase</span>' : 
    '<span class="historico-fonte local">💾 Local</span>';

  const cabecalhoInfo = totalMovimentos > 10 ? 
    `<div class="historico-info">
      <span class="historico-contador">📊 Exibindo os últimos 10 de ${totalMovimentos} movimentos ${fonteIndicador}</span>
      <button class="btn btn-ghost btn-sm" onclick="exibirHistoricoCompletoCorrigido()" title="Ver histórico completo">
        📋 Ver Todos
      </button>
    </div>` : 
    `<div class="historico-info">
      <span class="historico-contador">📊 ${totalMovimentos} movimento${totalMovimentos !== 1 ? 's' : ''} registrado${totalMovimentos !== 1 ? 's' : ''} ${fonteIndicador}</span>
    </div>`;

  const itensHTML = ultimosMovimentos.map((op, index) => {
    // Formatar informações dos endereços (com verificação de segurança)
    let enderecoAnteriorInfo = null;
    let enderecoNovoInfo = null;
    
    if (typeof formatarInfoEndereco === 'function') {
      enderecoAnteriorInfo = op.enderecoAnterior ? formatarInfoEndereco(op.enderecoAnterior) : null;
      enderecoNovoInfo = op.enderecoNovo ? formatarInfoEndereco(op.enderecoNovo) : null;
    }

    return `
    <div class="historico-item ${index === 0 ? 'historico-item-recente' : ''}">
      <div class="historico-header">
        <span class="historico-tipo tipo-${op.tipo.toLowerCase().replace(/\s+/g, '-').replace('ç', 'c').replace('ã', 'a')}">${op.tipo}</span>
        <span class="historico-timestamp">${op.timestamp}</span>
      </div>
      <div class="historico-produto">
        <strong>${op.coddv}</strong> - ${op.desc}
      </div>
      <div class="historico-endereco">
        ${op.enderecoAnterior ? `De: ${op.enderecoAnterior}${enderecoAnteriorInfo ? ` (${enderecoAnteriorInfo.formatado})` : ''}` : ''}
        ${op.enderecoNovo ? `Para: ${op.enderecoNovo}${enderecoNovoInfo ? ` (${enderecoNovoInfo.formatado})` : ''}` : ''}
        ${!op.enderecoNovo && op.enderecoAnterior ? `Removido${enderecoAnteriorInfo ? ` (${enderecoAnteriorInfo.formatado})` : ''}` : ''}
      </div>
      <div class="historico-usuario">
        <span class="usuario-info">👤 ${op.usuario ? op.usuario : 'Sistema'}</span>
        ${op.matricula ? `<span class="matricula-info">🆔 ${op.matricula}</span>` : ''}
        ${op.cd ? `<span class="cd-info">📍 ${op.cd}</span>` : ''}
      </div>
    </div>
  `;
  }).join('');

  lista.innerHTML = cabecalhoInfo + itensHTML;
}

async function exibirHistoricoCompletoCorrigido() {
  const lista = document.querySelector('#historicoLista');
  if (!lista) return;
  
  let historicoOperacoes = [];

  // Tentar buscar do Supabase primeiro
  if (window.sistemaEnderecamento && window.sistemaEnderecamento.isConnected && !window.sistemaEnderecamento.modoOffline) {
    try {
      lista.innerHTML = '<div class="historico-loading">Carregando histórico completo...</div>';
      
      const historicoSupabase = await window.sistemaEnderecamento.obterHistorico(200); // Buscar mais registros
      
      // Converter formato do Supabase para formato local com correção de data
      historicoOperacoes = historicoSupabase.map(item => {
        console.log('🔍 Debug item completo do Supabase:', item); // Debug para ver formato dos dados
        
        return {
          timestamp: formatarDataSegura(item.data_hora),
          dataHoraRaw: item.data_hora, // Guardar data original para ordenação
          tipo: item.tipo,
          coddv: item.coddv,
          desc: item.descricao_produto || 'Produto não identificado',
          enderecoAnterior: item.endereco_origem,
          enderecoNovo: item.endereco_destino || item.endereco,
          usuario: item.usuario,
          matricula: item.matricula,
          cd: item.cd
        };
      });

      // O Supabase já retorna ordenado por data_hora DESC
      console.log('✅ Histórico completo carregado do Supabase:', historicoOperacoes.length, 'registros');
      
    } catch (error) {
      console.error('❌ Erro ao carregar histórico completo do Supabase:', error);
      // Fallback para localStorage
      historicoOperacoes = JSON.parse(localStorage.getItem('historico_operacoes') || '[]');
    }
  } else {
    // Usar localStorage como fallback
    historicoOperacoes = JSON.parse(localStorage.getItem('historico_operacoes') || '[]');
  }

  if (historicoOperacoes.length === 0) {
    lista.innerHTML = '<p class="historico-vazio">Nenhuma operação realizada ainda</p>';
    return;
  }

  // Cabeçalho para histórico completo
  const fonteIndicador = window.sistemaEnderecamento && window.sistemaEnderecamento.isConnected && !window.sistemaEnderecamento.modoOffline ? 
    '<span class="historico-fonte supabase">☁️ Supabase</span>' : 
    '<span class="historico-fonte local">💾 Local</span>';

  const cabecalhoInfo = `
    <div class="historico-info historico-completo">
      <span class="historico-contador">📊 Histórico Completo - ${historicoOperacoes.length} movimento${historicoOperacoes.length !== 1 ? 's' : ''} ${fonteIndicador}</span>
      <button class="btn btn-ghost btn-sm" onclick="exibirHistoricoCorrigido()" title="Voltar aos últimos 10">
        🔙 Últimos 10
      </button>
    </div>
  `;

  const itensHTML = historicoOperacoes.map((op, index) => {
    // Formatar informações dos endereços (com verificação de segurança)
    let enderecoAnteriorInfo = null;
    let enderecoNovoInfo = null;
    
    if (typeof formatarInfoEndereco === 'function') {
      enderecoAnteriorInfo = op.enderecoAnterior ? formatarInfoEndereco(op.enderecoAnterior) : null;
      enderecoNovoInfo = op.enderecoNovo ? formatarInfoEndereco(op.enderecoNovo) : null;
    }

    return `
    <div class="historico-item ${index === 0 ? 'historico-item-recente' : ''}">
      <div class="historico-header">
        <span class="historico-tipo tipo-${op.tipo.toLowerCase().replace(/\s+/g, '-').replace('ç', 'c').replace('ã', 'a')}">${op.tipo}</span>
        <span class="historico-timestamp">${op.timestamp}</span>
      </div>
      <div class="historico-produto">
        <strong>${op.coddv}</strong> - ${op.desc}
      </div>
      <div class="historico-endereco">
        ${op.enderecoAnterior ? `De: ${op.enderecoAnterior}${enderecoAnteriorInfo ? ` (${enderecoAnteriorInfo.formatado})` : ''}` : ''}
        ${op.enderecoNovo ? `Para: ${op.enderecoNovo}${enderecoNovoInfo ? ` (${enderecoNovoInfo.formatado})` : ''}` : ''}
        ${!op.enderecoNovo && op.enderecoAnterior ? `Removido${enderecoAnteriorInfo ? ` (${enderecoAnteriorInfo.formatado})` : ''}` : ''}
      </div>
      <div class="historico-usuario">
        <span class="usuario-info">👤 ${op.usuario ? op.usuario : 'Sistema'}</span>
        ${op.matricula ? `<span class="matricula-info">🆔 ${op.matricula}</span>` : ''}
        ${op.cd ? `<span class="cd-info">📍 ${op.cd}</span>` : ''}
      </div>
    </div>
  `;
  }).join('');

  lista.innerHTML = cabecalhoInfo + itensHTML;
}

// Aplicar correções imediatamente
function aplicarCorrecoes() {
  console.log('🔄 Aplicando correções de histórico...');
  
  // Sobrescrever as funções originais
  window.exibirHistorico = exibirHistoricoCorrigido;
  window.exibirHistoricoCompleto = exibirHistoricoCompletoCorrigido;
  
  console.log('✅ Funções de histórico sobrescritas');
  
  // Tentar exibir o histórico imediatamente se o elemento existir
  const historicoElement = document.querySelector('#historicoLista');
  if (historicoElement) {
    console.log('📋 Elemento histórico encontrado, carregando...');
    setTimeout(() => {
      exibirHistoricoCorrigido();
    }, 200);
  } else {
    console.warn('⚠️ Elemento #historicoLista não encontrado');
  }
  
  // Forçar limpeza de qualquer duplicação
  setTimeout(() => {
    const items = document.querySelectorAll('.historico-item');
    items.forEach(item => {
      const usuarios = item.querySelectorAll('.historico-usuario');
      if (usuarios.length > 1) {
        // Remover duplicatas, manter apenas a primeira
        for (let i = 1; i < usuarios.length; i++) {
          usuarios[i].remove();
        }
      }
    });
  }, 500);
}

// Exportar funções para uso global
window.exibirHistoricoCorrigido = exibirHistoricoCorrigido;
window.exibirHistoricoCompletoCorrigido = exibirHistoricoCompletoCorrigido;
window.formatarDataSegura = formatarDataSegura;

// Aplicar correções imediatamente (antes do DOMContentLoaded)
aplicarCorrecoes();

document.addEventListener('DOMContentLoaded', function() {
  console.log('🔄 DOM carregado, reaplicando correções...');
  aplicarCorrecoes();
});

// Também tentar aplicar quando a janela carregar completamente
window.addEventListener('load', function() {
  console.log('🔄 Janela carregada, reaplicando correções...');
  setTimeout(aplicarCorrecoes, 100);
});

// Interceptar chamadas para exibirHistorico antes da sobrescrita
if (!window.exibirHistorico) {
  window.exibirHistorico = exibirHistoricoCorrigido;
  console.log('✅ Função exibirHistorico definida preventivamente');
}

console.log('✅ Correções de histórico carregadas e exportadas');