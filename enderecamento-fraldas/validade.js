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
  
  // Aguardar Supabase estar pronto
  if (window.supabaseClient) {
    console.log('✅ Supabase já está pronto');
    configurarEventos();
  } else {
    console.log('⏳ Aguardando Supabase...');
    window.addEventListener('supabasePronto', () => {
      console.log('✅ Supabase pronto via evento');
      configurarEventos();
    });
    
    // Fallback: tentar após 2 segundos
    setTimeout(() => {
      if (!window.supabaseClient) {
        console.warn('⚠️ Supabase não carregou, usando modo offline');
      }
      configurarEventos();
    }, 2000);
  }
});

function getSupabase() {
  return window.supabaseClient || null;
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
    
    if (!produto) {
      // Tentar buscar como endereço no banco
      const produtosNoEndereco = await buscarPorEndereco(codigo);
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
  if (!window.DB_CADASTRO?.BASE_CADASTRO) return null;
  
  const codigoLimpo = codigo.trim();
  return window.DB_CADASTRO.BASE_CADASTRO.find(item => 
    item.CODDV === codigoLimpo || item.BARRAS === codigoLimpo
  );
}

async function buscarPorEndereco(endereco) {
  const client = getSupabase();
  if (!client) {
    console.warn('Supabase não disponível');
    return [];
  }
  
  try {
    const { data, error } = await client
      .from('alocacoes_fraldas')
      .select('*')
      .eq('endereco', endereco.toUpperCase())
      .eq('ativo', true);
    
    if (error) throw error;
    return data || [];
  } catch (e) {
    console.error('Erro ao buscar endereço:', e);
    return [];
  }
}

async function buscarValidade(coddv) {
  const client = getSupabase();
  if (!client) {
    console.warn('Supabase não disponível');
    return null;
  }
  
  try {
    const { data, error } = await client
      .from('alocacoes_fraldas')
      .select('validade, endereco, id')
      .eq('coddv', coddv)
      .eq('ativo', true);
    
    if (error) throw error;
    
    if (data && data.length > 0) {
      return {
        validade: data[0].validade,
        endereco: data[0].endereco,
        id: data[0].id,
        multiplos: data.length > 1,
        todos: data
      };
    }
  } catch (e) {
    console.error('Erro ao buscar validade:', e);
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
    showToast('Banco de dados não disponível', 'error');
    return;
  }
  
  $('#btnGerarCSV').disabled = true;
  $('#btnGerarCSV').innerHTML = `<svg class="spin" width="16" height="16" viewBox="0 0 24 24"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Gerando...`;
  
  try {
    // Buscar alocações no período
    const { data, error } = await client
      .from('alocacoes_fraldas')
      .select('*')
      .eq('ativo', true)
      .gte('validade', inicio)
      .lte('validade', fim)
      .order('validade', { ascending: true });
    
    if (error) throw error;
    
    if (!data || data.length === 0) {
      showToast('Nenhum produto encontrado no período', 'warning');
      return;
    }
    
    // Gerar CSV
    const csv = gerarConteudoCSV(data);
    baixarArquivo(csv, `validades_${inicio}_${fim}.csv`);
    showToast(`${data.length} registros exportados`, 'success');
    
  } catch (e) {
    console.error('Erro ao gerar CSV:', e);
    showToast('Erro ao gerar relatório', 'error');
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
