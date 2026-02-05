/* ===== Página de Relatório de Validades ===== */

const $ = (sel) => document.querySelector(sel);

let produtoAtual = null;
let enderecoSelecionado = null;

// Verificar autenticação
document.addEventListener('DOMContentLoaded', () => {
  const session = localStorage.getItem('enderecamento_fraldas_session');
  if (!session) {
    window.location.href = './login.html';
    return;
  }
  
  configurarEventos();
});

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
  
  // Buscar na base de dados
  const produto = buscarNaBase(codigo);
  
  if (!produto) {
    // Tentar buscar como endereço
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
}

function buscarNaBase(codigo) {
  if (!window.DB_CADASTRO?.BASE_CADASTRO) return null;
  
  const codigoLimpo = codigo.trim();
  return window.DB_CADASTRO.BASE_CADASTRO.find(item => 
    item.CODDV === codigoLimpo || item.BARRAS === codigoLimpo
  );
}

async function buscarPorEndereco(endereco) {
  if (!window.sistemaEnderecamento) return [];
  
  try {
    const produtos = await window.sistemaEnderecamento.obterProdutosNoEndereco(endereco.toUpperCase());
    return produtos || [];
  } catch (e) {
    return [];
  }
}

async function buscarValidade(coddv) {
  // Buscar no Supabase
  try {
    const { data, error } = await supabase
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
    statusEl.textContent = 'ALOCADO';
    statusEl.className = 'produto-status status-alocado';
    
    const valFormatada = formatarValidade(validadeInfo.validade);
    validadeEl.textContent = `Validade: ${valFormatada}`;
    validadeEl.style.display = 'block';
    
    enderecoEl.textContent = `Endereço: ${validadeInfo.endereco}`;
    enderecoSelecionado = validadeInfo.endereco;
    
    // Se múltiplos endereços, mostrar seleção
    if (validadeInfo.multiplos) {
      mostrarSelecaoEnderecos(validadeInfo.todos, produto);
    }
  } else {
    statusEl.textContent = 'NÃO ALOCADO';
    statusEl.className = 'produto-status status-disponivel';
    validadeEl.style.display = 'none';
    enderecoEl.textContent = 'Sem endereço cadastrado';
    enderecoSelecionado = null;
  }
}

function mostrarSelecaoEnderecos(enderecos, produto) {
  $('#listaEnderecosContainer').classList.remove('hide');
  const lista = $('#listaEnderecos');
  
  lista.innerHTML = enderecos.map((item, idx) => `
    <div class="endereco-item ${idx === 0 ? 'selecionado' : ''}" 
         data-endereco="${item.endereco}" data-validade="${item.validade}" data-id="${item.id}">
      <strong>${item.endereco}</strong>
      <span>Validade: ${formatarValidade(item.validade)}</span>
    </div>
  `).join('');
  
  // Eventos de seleção
  lista.querySelectorAll('.endereco-item').forEach(el => {
    el.addEventListener('click', () => {
      lista.querySelectorAll('.endereco-item').forEach(e => e.classList.remove('selecionado'));
      el.classList.add('selecionado');
      enderecoSelecionado = el.dataset.endereco;
      
      // Atualizar exibição
      $('.produto-validade').textContent = `Validade: ${formatarValidade(el.dataset.validade)}`;
      $('.produto-endereco').textContent = `Endereço: ${el.dataset.endereco}`;
    });
  });
}

async function mostrarListaEnderecos(produtos, endereco) {
  $('#listaEnderecosContainer').classList.remove('hide');
  $('#produtoInfo').classList.add('hide');
  
  const lista = $('#listaEnderecos');
  
  lista.innerHTML = `<h3>Produtos no endereço ${endereco.toUpperCase()}</h3>` + 
    produtos.map(item => {
      const produtoInfo = buscarNaBase(item.coddv);
      return `
        <div class="endereco-item" data-coddv="${item.coddv}">
          <strong>${item.coddv}</strong>
          ${produtoInfo ? `- ${produtoInfo.DESC.substring(0, 30)}...` : ''}
          <span>Validade: ${formatarValidade(item.validade)}</span>
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
  return `${validade.substring(0, 2)}/${validade.substring(2)}`;
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
  
  try {
    // Buscar alocações no período
    const { data, error } = await supabase
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
  }
}

function gerarConteudoCSV(dados) {
  const headers = ['CODDV', 'Descrição', 'Código Barras', 'Validade', 'Endereço', 'CD', 'Usuário', 'Matrícula', 'Data Alocação'];
  
  const linhas = dados.map(item => {
    const produto = buscarNaBase(item.coddv);
    return [
      item.coddv,
      produto ? produto.DESC : 'N/A',
      produto ? produto.BARRAS : 'N/A',
      formatarValidade(item.validade),
      item.endereco,
      item.cd,
      item.usuario,
      item.matricula,
      item.data_alocacao
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
  // Criar container se não existir
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
    toast.remove();
  }, 3000);
}
