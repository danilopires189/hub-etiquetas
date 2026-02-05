/* ===== Página de Relatório de Validades ===== */

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

let produtoAtual = null;
let enderecoSelecionado = null;

// Verificar autenticação
document.addEventListener('DOMContentLoaded', () => {
  const session = localStorage.getItem('enderecamento_fraldas_session');
  if (!session) {
    window.location.href = './login.html';
    return;
  }
  
  console.log('🔄 Página carregada, verificando Supabase...');
  
  // Verificar se já está pronto
  if (getSupabase()) {
    console.log('✅ Supabase já está pronto');
    configurarEventos();
    return;
  }
  
  // Aguardar evento de sistema pronto
  window.addEventListener('sistemaEnderecamentoPronto', (e) => {
    console.log('✅ Evento sistemaEnderecamentoPronto recebido:', e.detail);
    if (getSupabase()) {
      configurarEventos();
    }
  });
  
  // Fallback: tentar a cada 500ms por até 5 segundos
  let tentativas = 0;
  const maxTentativas = 10;
  
  const verificarSupabase = setInterval(() => {
    tentativas++;
    
    if (getSupabase()) {
      console.log('✅ Supabase pronto após', tentativas, 'tentativas');
      clearInterval(verificarSupabase);
      configurarEventos();
      return;
    }
    
    if (tentativas >= maxTentativas) {
      clearInterval(verificarSupabase);
      console.warn('⚠️ Supabase não carregou após', maxTentativas, 'tentativas');
      showToast('Aviso: Banco de dados não conectado', 'warning');
      configurarEventos(); // Configurar mesmo assim
    }
  }, 500);
});

function getSupabase() {
  // Tentar várias formas de acessar o Supabase
  if (window.supabaseManager?.client) {
    console.log('✅ Usando supabaseManager.client');
    return window.supabaseManager.client;
  }
  if (window.sistemaEnderecamento?.client) {
    console.log('✅ Usando sistemaEnderecamento.client');
    return window.sistemaEnderecamento.client;
  }
  if (window.sistemaEnderecamentoSupabase?.client) {
    console.log('✅ Usando sistemaEnderecamentoSupabase.client');
    return window.sistemaEnderecamentoSupabase.client;
  }
  console.warn('❌ Supabase não disponível');
  return null;
}

function configurarEventos() {
  $('#btnBuscar').addEventListener('click', buscarProduto);
  $('#btnLimpar').addEventListener('click', limparCampos);
  $('#btnClearInput').addEventListener('click', limparCampos);
  $('#btnImprimir').addEventListener('click', imprimirEtiqueta);
  $('#btnGerarCSV').addEventListener('click', gerarCSV);
  
  $('#codigoProduto').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') buscarProduto();
  });
  
  // Máscara para datas MMAA
  $('#validadeInicio').addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/\D/g, '').substring(0, 4);
  });
  $('#validadeFim').addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/\D/g, '').substring(0, 4);
  });
}

async function buscarProduto() {
  const codigo = $('#codigoProduto').value.trim();
  console.log('🔍 Iniciando busca por:', codigo);
  
  if (!codigo) {
    showToast('Informe um código para buscar', 'warning');
    return;
  }
  
  // Mostrar loading
  $('#btnBuscar').disabled = true;
  $('#btnBuscar').innerHTML = `<svg class="spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Buscando...`;
  
  try {
    // Buscar na base de dados local
    const produto = buscarNaBase(codigo);
    console.log('📦 Produto na base:', produto);
    
    if (!produto) {
      console.log('🔍 Produto não encontrado na base, tentando como endereço...');
      // Tentar buscar como endereço no banco
      const produtosNoEndereco = await buscarPorEndereco(codigo);
      console.log('📍 Produtos no endereço:', produtosNoEndereco);
      if (produtosNoEndereco.length > 0) {
        mostrarListaEnderecos(produtosNoEndereco, codigo);
        return;
      }
      showToast('Produto ou endereço não encontrado', 'warning');
      return;
    }
    
    produtoAtual = produto;
    
    // Buscar validade no Supabase
    const validadeInfo = await buscarValidade(produto.CODDV);
    
    exibirProduto(produto, validadeInfo);
    
  } catch (error) {
    console.error('Erro na busca:', error);
    showToast('Erro ao buscar produto', 'error');
  } finally {
    $('#btnBuscar').disabled = false;
    $('#btnBuscar').innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg> Buscar`;
  }
}

function buscarNaBase(codigo) {
  if (!window.DB_CADASTRO?.BASE_CADASTRO) {
    console.warn('⚠️ DB_CADASTRO não disponível');
    return null;
  }
  
  const codigoLimpo = codigo.trim();
  console.log('🔍 Buscando na base:', codigoLimpo);
  const resultado = window.DB_CADASTRO.BASE_CADASTRO.find(item => 
    item.CODDV === codigoLimpo || item.BARRAS === codigoLimpo
  );
  console.log('✅ Resultado:', resultado ? 'Encontrado' : 'Não encontrado');
  return resultado;
}

async function buscarPorEndereco(endereco) {
  // Tentar usar sistemaEnderecamento primeiro
  if (window.sistemaEnderecamento?.obterProdutosNoEndereco) {
    try {
      const produtos = await window.sistemaEnderecamento.obterProdutosNoEndereco(endereco.toUpperCase());
      return produtos || [];
    } catch (e) {
      console.warn('Erro no sistemaEnderecamento:', e);
    }
  }
  
  // Fallback: usar Supabase direto
  const client = getSupabase();
  if (!client) {
    console.warn('Supabase não disponível');
    return [];
  }
  
  try {
    console.log('🔍 Buscando endereço:', endereco.toUpperCase());
    const { data, error } = await client
      .from('alocacoes_fraldas')
      .select('*')
      .eq('endereco', endereco.toUpperCase())
      .eq('ativo', true);
    
    if (error) {
      console.error('Erro Supabase:', error);
      throw error;
    }
    console.log('✅ Produtos encontrados:', data?.length || 0);
    return data || [];
  } catch (e) {
    console.error('Erro ao buscar endereço:', e);
    return [];
  }
}

async function buscarValidade(coddv) {
  console.log('🔍 Buscando validade para CODDV:', coddv);
  
  const client = getSupabase();
  if (!client) {
    console.error('❌ Supabase não disponível');
    showToast('Erro: Banco de dados não conectado', 'error');
    return null;
  }
  
  try {
    console.log('📡 Consultando alocacoes_fraldas...');
    const { data, error } = await client
      .from('alocacoes_fraldas')
      .select('validade, endereco, id, coddv, ativo')
      .eq('coddv', coddv)
      .eq('ativo', true);
    
    if (error) {
      console.error('❌ Erro na consulta:', error);
      throw error;
    }
    
    console.log('✅ Dados retornados:', data);
    
    if (data && data.length > 0) {
      console.log(`✅ Produto ${coddv} encontrado em ${data.length} endereço(s)`);
      return {
        validade: data[0].validade,
        endereco: data[0].endereco,
        id: data[0].id,
        multiplos: data.length > 1,
        todos: data
      };
    } else {
      console.log('ℹ️ Produto não encontrado ou não está alocado');
    }
  } catch (e) {
    console.error('❌ Erro ao buscar validade:', e);
    showToast('Erro ao buscar no banco: ' + e.message, 'error');
  }
  
  return null;
}

function exibirProduto(produto, validadeInfo) {
  $('#produtoInfo').classList.remove('hide');
  $('#listaEnderecosContainer').classList.add('hide');
  
  $('.produto-coddv').textContent = `CODDV: ${produto.CODDV}`;
  $('.produto-desc').textContent = produto.DESC;
  $('.produto-barras').textContent = `Barras: ${produto.BARRAS}`;
  
  const statusEl = $('.produto-status');
  const validadeEl = $('.produto-validade');
  const enderecoEl = $('.produto-endereco');
  
  if (validadeInfo) {
    statusEl.textContent = '✓ ALOCADO';
    statusEl.className = 'produto-status status-alocado';
    
    const valFormatada = formatarValidade(validadeInfo.validade);
    validadeEl.innerHTML = `<strong>Validade:</strong> ${valFormatada}`;
    validadeEl.style.display = 'block';
    
    enderecoEl.innerHTML = `<strong>Endereço:</strong> ${validadeInfo.endereco}`;
    enderecoSelecionado = validadeInfo.endereco;
    
    // Se múltiplos endereços, mostrar seleção
    if (validadeInfo.multiplos) {
      mostrarSelecaoEnderecos(validadeInfo.todos);
    }
  } else {
    statusEl.textContent = '⚠ NÃO ALOCADO';
    statusEl.className = 'produto-status status-disponivel';
    validadeEl.innerHTML = '<strong>Validade:</strong> <span style="color: #94a3b8;">Produto não possui validade cadastrada (não está alocado)</span>';
    validadeEl.style.display = 'block';
    enderecoEl.innerHTML = '<strong>Endereço:</strong> <span style="color: #94a3b8;">Não alocado</span>';
    enderecoSelecionado = null;
  }
}

function mostrarSelecaoEnderecos(enderecos) {
  $('#listaEnderecosContainer').classList.remove('hide');
  const lista = $('#listaEnderecos');
  
  lista.innerHTML = enderecos.map((item, idx) => `
    <div class="endereco-item ${idx === 0 ? 'selecionado' : ''}" 
         data-endereco="${item.endereco}" data-validade="${item.validade}" data-id="${item.id}">
      <div class="endereco-nome">${item.endereco}</div>
      <div class="endereco-validade">Validade: ${formatarValidade(item.validade)}</div>
    </div>
  `).join('');
  
  // Eventos de seleção
  lista.querySelectorAll('.endereco-item').forEach(el => {
    el.addEventListener('click', () => {
      lista.querySelectorAll('.endereco-item').forEach(e => e.classList.remove('selecionado'));
      el.classList.add('selecionado');
      enderecoSelecionado = el.dataset.endereco;
      
      // Atualizar exibição
      $('.produto-validade').innerHTML = `<strong>Validade:</strong> ${formatarValidade(el.dataset.validade)}`;
      $('.produto-endereco').innerHTML = `<strong>Endereço:</strong> ${el.dataset.endereco}`;
    });
  });
}

async function mostrarListaEnderecos(produtos, endereco) {
  $('#listaEnderecosContainer').classList.remove('hide');
  $('#produtoInfo').classList.add('hide');
  
  const lista = $('#listaEnderecos');
  
  lista.innerHTML = `<div class="endereco-titulo">📍 Produtos em ${endereco.toUpperCase()}</div>` + 
    produtos.map(item => {
      const produtoInfo = buscarNaBase(item.coddv);
      return `
        <div class="endereco-item" data-coddv="${item.coddv}">
          <div class="endereco-produto">
            <strong>${item.coddv}</strong>
            ${produtoInfo ? `- ${produtoInfo.DESC.substring(0, 35)}...` : ''}
          </div>
          <div class="endereco-validade">Validade: ${formatarValidade(item.validade)}</div>
        </div>
      `;
    }).join('');
  
  lista.querySelectorAll('.endereco-item').forEach(el => {
    el.addEventListener('click', async () => {
      const coddv = el.dataset.coddv;
      const produto = buscarNaBase(coddv);
      if (produto) {
        $('#codigoProduto').value = coddv;
        await buscarProduto();
      }
    });
  });
}

function formatarValidade(validade) {
  if (!validade || validade.length !== 4) return '--/--';
  const mes = validade.substring(0, 2);
  const ano = validade.substring(2);
  return `${mes}/${ano}`;
}

function limparCampos() {
  $('#codigoProduto').value = '';
  $('#produtoInfo').classList.add('hide');
  $('#listaEnderecosContainer').classList.add('hide');
  produtoAtual = null;
  enderecoSelecionado = null;
}

async function imprimirEtiqueta() {
  if (!produtoAtual) {
    showToast('Nenhum produto selecionado', 'warning');
    return;
  }
  
  const session = JSON.parse(localStorage.getItem('enderecamento_fraldas_session') || '{}');
  const validadeInfo = await buscarValidade(produtoAtual.CODDV);
  
  // Preencher template
  $('#printDesc').textContent = produtoAtual.DESC;
  $('#printCoddv').textContent = produtoAtual.CODDV;
  $('#printBarras').textContent = produtoAtual.BARRAS;
  $('#printValidade').textContent = validadeInfo ? formatarValidade(validadeInfo.validade) : '--/--';
  $('#printEndereco').textContent = enderecoSelecionado || 'Não alocado';
  $('#printUsuario').textContent = session.usuario || 'Sistema';
  $('#printMatricula').textContent = session.matricula ? `🆔 ${session.matricula}` : '';
  $('#printData').textContent = new Date().toLocaleString('pt-BR');
  $('#printIdBadge').textContent = validadeInfo?.id ? `ID: ${validadeInfo.id}` : 'ID: --';
  
  // Mostrar template e imprimir
  const template = $('#printTemplate');
  template.classList.remove('hide');
  
  window.print();
  
  setTimeout(() => {
    template.classList.add('hide');
  }, 100);
}

async function gerarCSV() {
  const inicio = $('#validadeInicio').value;
  const fim = $('#validadeFim').value;
  
  if (inicio.length !== 4 || fim.length !== 4) {
    showToast('Informe período válido (MMAA)', 'warning');
    return;
  }
  
  const client = getSupabase();
  if (!client) {
    showToast('Banco de dados não conectado', 'error');
    console.error('Supabase não disponível para gerar CSV');
    return;
  }
  
  $('#btnGerarCSV').disabled = true;
  $('#btnGerarCSV').innerHTML = `<svg class="spin" width="16" height="16" viewBox="0 0 24 24"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Gerando...`;
  
  try {
    console.log(`📡 Buscando validades de ${inicio} até ${fim}...`);
    
    // Buscar alocações no período
    const { data, error } = await client
      .from('alocacoes_fraldas')
      .select('*')
      .eq('ativo', true)
      .gte('validade', inicio)
      .lte('validade', fim)
      .order('validade', { ascending: true });
    
    if (error) {
      console.error('Erro na consulta:', error);
      throw error;
    }
    
    console.log('✅ Dados encontrados:', data?.length || 0);
    
    if (!data || data.length === 0) {
      showToast('Nenhum produto encontrado no período', 'warning');
      return;
    }
    
    // Gerar CSV
    const csv = gerarConteudoCSV(data);
    baixarArquivo(csv, `validades_${inicio}_${fim}.csv`);
    showToast(`${data.length} registros exportados`, 'success');
    
  } catch (e) {
    console.error('❌ Erro ao gerar CSV:', e);
    showToast('Erro ao gerar relatório: ' + e.message, 'error');
  } finally {
    $('#btnGerarCSV').disabled = false;
    $('#btnGerarCSV').innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10,9 9,9 8,9"/></svg> CSV`;
  }
}

function gerarConteudoCSV(dados) {
  const headers = ['CODDV', 'Descricao', 'Codigo_Barras', 'Validade', 'Endereco', 'CD', 'Usuario', 'Matricula', 'Data_Alocacao'];
  
  const linhas = dados.map(item => {
    const produto = buscarNaBase(item.coddv);
    return [
      item.coddv,
      produto ? produto.DESC : 'N/A',
      produto ? produto.BARRAS : 'N/A',
      formatarValidade(item.validade),
      item.endereco,
      item.cd || 'N/A',
      item.usuario || 'Sistema',
      item.matricula || '',
      item.data_alocacao || ''
    ].map(campo => `"${campo}"`).join(',');
  });
  
  return [headers.join(','), ...linhas].join('\n');
}

function baixarArquivo(conteudo, nomeArquivo) {
  const blob = new Blob([conteudo], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = nomeArquivo;
  link.click();
}

function showToast(mensagem, tipo = 'info') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  
  const toast = document.createElement('div');
  toast.className = `toast toast-${tipo}`;
  toast.textContent = mensagem;
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add('show');
  }, 100);
  
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Animação de loading
const style = document.createElement('style');
style.textContent = `
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  .spin {
    animation: spin 1s linear infinite;
  }
`;
document.head.appendChild(style);

// Função de diagnóstico (pode ser chamada no console)
window.diagnosticarConexao = function() {
  console.log('=== DIAGNÓSTICO DE CONEXÃO ===');
  console.log('supabaseManager:', window.supabaseManager ? '✅ Presente' : '❌ Ausente');
  console.log('supabaseManager.client:', window.supabaseManager?.client ? '✅ Presente' : '❌ Ausente');
  console.log('sistemaEnderecamento:', window.sistemaEnderecamento ? '✅ Presente' : '❌ Ausente');
  console.log('sistemaEnderecamento.client:', window.sistemaEnderecamento?.client ? '✅ Presente' : '❌ Ausente');
  console.log('getSupabase():', getSupabase() ? '✅ Funcionando' : '❌ Retornando null');
  console.log('==============================');
  
  const status = {
    supabaseManager: !!window.supabaseManager,
    supabaseManagerClient: !!window.supabaseManager?.client,
    sistemaEnderecamento: !!window.sistemaEnderecamento,
    sistemaEnderecamentoClient: !!window.sistemaEnderecamento?.client,
    getSupabase: !!getSupabase()
  };
  
  alert(`Status da Conexão:
- supabaseManager: ${status.supabaseManager ? '✅' : '❌'}
- supabaseManager.client: ${status.supabaseManagerClient ? '✅' : '❌'}
- sistemaEnderecamento: ${status.sistemaEnderecamento ? '✅' : '❌'}
- sistemaEnderecamento.client: ${status.sistemaEnderecamentoClient ? '✅' : '❌'}
- getSupabase(): ${status.getSupabase ? '✅' : '❌'}

Verifique o console (F12) para mais detalhes.`);
  
  return status;
};
