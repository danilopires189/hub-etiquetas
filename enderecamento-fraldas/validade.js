/* ===== Página de Relatório de Validades (Refatorada) ===== */

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

let produtoAtual = null;
let enderecoSelecionado = null;
let sistema = null; // Instância do SistemaEnderecamentoSupabase

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
  // Verificar sessão
  const session = localStorage.getItem('enderecamento_fraldas_session');
  if (!session) {
    window.location.href = './login.html';
    return;
  }

  console.log('🚀 Página de Validades iniciando...');

  // Aguardar sistema de endereçamento
  if (window.sistemaEnderecamento) {
    sistema = window.sistemaEnderecamento;
    inicializarPagina();
  } else {
    window.addEventListener('sistemaEnderecamentoPronto', () => {
      console.log('✅ Sistema de Endereçamento pronto');
      sistema = window.sistemaEnderecamento;
      inicializarPagina();
    });
  }

  // Configuração de UI
  setupUI();
});

function setupUI() {
  // Botões
  $('#btnBuscar').addEventListener('click', buscarProduto);
  $('#btnClearInput').addEventListener('click', limparCampos);

  // Toggle Exportação
  $('#btnExportarToggle').addEventListener('click', () => {
    const panel = $('#painelExportacao');
    panel.classList.toggle('hide');
    if (!panel.classList.contains('hide')) {
      panel.scrollIntoView({ behavior: 'smooth' });
    }
  });

  $('#btnCloseExport').addEventListener('click', () => {
    $('#painelExportacao').classList.add('hide');
  });

  $('#btnGerarCSV').addEventListener('click', gerarCSV);

  // Input Search
  const inputBusca = $('#codigoProduto');
  inputBusca.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') buscarProduto();
  });

  inputBusca.addEventListener('input', (e) => {
    const btnClear = $('#btnClearInput');
    if (e.target.value.trim()) {
      btnClear.classList.remove('hide');
    } else {
      btnClear.classList.add('hide');
    }
  });

  // Scanner Manual (botão)
  const btnScan = $('#btnScan');
  if (btnScan) {
    btnScan.addEventListener('click', () => {
      if (window.mobileScanner && typeof window.mobileScanner.openScanner === 'function') {
        window.mobileScanner.openScanner('barcode', (code) => {
          inputBusca.value = code;
          buscarProduto();
        });
      } else {
        // Fallback se scanner não estiver carregado ou desativado
        showToast('Scanner não disponível. Use a digitação ou leitor físico.', 'info');
      }
    });
  }

  // Focar no inicio
  inputBusca.focus();

  // Impressão
  $('#btnImprimir').addEventListener('click', imprimirEtiqueta);

  // Formatação de datas nos inputs CSV
  ['validadeInicio', 'validadeFim'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/\D/g, '').substring(0, 4);
      });
    }
  });
}

async function inicializarPagina() {
  console.log('🔄 Sincronizando dados...');

  // Garantir que temos dados atualizados
  try {
    if (!sistema.cacheCarregado) {
      await sistema.carregarCache();
    }
    console.log('✅ Dados sincronizados');
  } catch (e) {
    console.warn('⚠️ Usando dados em cache/offline', e);
    showToast('Modo Offline: Usando dados locais', 'warning');
  }
}

function limparCampos() {
  $('#codigoProduto').value = '';
  $('#btnClearInput').classList.add('hide');
  limparResultadosUI();
  $('#codigoProduto').focus();
}

/**
 * Realiza a busca
 */
async function buscarProduto() {
  const termo = $('#codigoProduto').value.trim().toUpperCase();
  if (!termo) {
    showToast('Digite um código, barras ou endereço', 'warning');
    return;
  }

  // Loading estado
  const btn = $('#btnBuscar');
  const originalText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<span class="spin">↻</span> Buscando...`;

  limparResultadosUI();

  try {
    // 1. Tentar achar na base de produtos (BASE_BARRAS.js)
    let produto = buscarNaBaseLocal(termo);

    if (produto) {
      // É um produto
      console.log('📦 Produto encontrado na base:', produto.DESC);
      produtoAtual = produto;
      await processarProduto(produto);
    } else {
      // 2. Não é produto, verificar se é endereço
      if (validarFormatoEndereco(termo) || termo.includes('PF')) {
        console.log('📍 Buscando por endereço:', termo);
        await processarEndereco(termo);
      } else {
        // Tenta buscar no banco pra ver se é um código que não tem na base local mas tem alocado (raro)
        // Ou chamar alocacao direta
        const alocacoes = await buscarAlocacaoDireta(termo);
        if (alocacoes && alocacoes.length > 0) {
          // Criar objeto produto fake baseado no que retornou do banco
          const fakeProd = {
            CODDV: alocacoes[0].coddv,
            DESC: alocacoes[0].descricao_produto || 'Produto não cadastrado',
            BARRAS: ''
          };
          produtoAtual = fakeProd;
          exibirMultiplosLocais(fakeProd, alocacoes); // Reusa logica
        } else {
          showToast('Produto ou endereço não encontrado', 'warning');
        }
      }
    }
  } catch (e) {
    console.error(e);
    showToast('Erro ao buscar: ' + e.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
}

/**
 * Busca direta se não achou na base local (fallback para produtos novos)
 */
async function buscarAlocacaoDireta(coddv) {
  if (!sistema.cacheCarregado) return [];

  // Procura no cache primeiro
  const encontrados = [];
  for (const [endereco, listaProdutos] of Object.entries(sistema.cacheAlocacoes)) {
    const match = listaProdutos.find(p => p.coddv == coddv);
    if (match) {
      encontrados.push({
        ...match,
        endereco: endereco
      });
    }
  }
  return encontrados;
}

/**
 * Processa logicamente um produto encontrado
 */
async function processarProduto(produto) {
  // Buscar onde ele está alocado usando o sistema
  // O sistema já tem cache de alocações: sistema.cacheAlocacoes
  // cacheAlocacoes é { "ENDERECO": [ {coddv, ...}, ... ] }

  const alocacoes = [];

  // Varrer cache (síncrono e rápido)
  for (const [endereco, listaProdutos] of Object.entries(sistema.cacheAlocacoes)) {
    const match = listaProdutos.find(p => p.coddv == produto.CODDV);
    if (match) {
      alocacoes.push({
        ...match,
        endereco: endereco // garantir que endereço está no obj
      });
    }
  }

  if (alocacoes.length === 0) {
    // Não alocado
    exibirProdutoNaoAlocado(produto);
  } else if (alocacoes.length === 1) {
    // Alocado em 1 lugar
    exibirProdutoAlocado(produto, alocacoes[0]);
  } else {
    // Múltiplos locais
    exibirMultiplosLocais(produto, alocacoes);
  }
}

/**
 * Processa busca por endereço
 */
async function processarEndereco(endereco) {
  // Buscar produtos neste endereço
  // sistema.obterProdutosNoEndereco(endereco) retorna array

  // Se cache não tiver carregado (improvavel aqui), carregar
  if (!sistema.cacheCarregado) await sistema.carregarCache();

  const produtos = sistema.obterProdutosNoEndereco(endereco);

  if (produtos && produtos.length > 0) {
    mostrarListaEnderecos(produtos, endereco, true);
  } else {
    showToast(`Nenhum produto alocado no endereço ${endereco}`, 'info');
  }
}

/**
 * Helpers de Busca
 */
function buscarNaBaseLocal(termo) {
  if (!window.DB_CADASTRO?.BASE_CADASTRO) return null;

  // Remove zeros a esquerda para comparar numeros, mas mantem original para string
  const termoNum = termo.replace(/^0+/, '');

  return window.DB_CADASTRO.BASE_CADASTRO.find(item =>
    item.CODDV == termo ||
    item.CODDV == termoNum ||
    item.BARRAS == termo
  );
}

function validarFormatoEndereco(end) {
  // Regex simples ou usar do sistema
  return /PF\d+\./.test(end);
}

// =========================================================
// RENDERING
// =========================================================

function limparResultadosUI() {
  $('#produtoInfo').classList.add('hide');
  $('#listaEnderecosContainer').classList.add('hide');
  produtoAtual = null;
  enderecoSelecionado = null;
}

function exibirProdutoNaoAlocado(produto) {
  $('#produtoInfo').classList.remove('hide');

  $('.produto-coddv').textContent = produto.CODDV;
  $('.produto-status').textContent = 'NÃO ALOCADO';
  $('.produto-status').className = 'produto-status badge badge-neutral'; // Cinza

  $('.produto-desc').textContent = produto.DESC;
  $('.produto-barras').textContent = produto.BARRAS || '-';

  $('.produto-endereco').innerHTML = '<span class="text-muted">Não consta em nenhum endereço</span>';
  $('.produto-validade-conta').textContent = '-';

  // Desabilitar impressão pois não tem validade/endereço
  $('#btnImprimir').disabled = true;
}

function exibirProdutoAlocado(produto, alocacao) {
  $('#produtoInfo').classList.remove('hide');

  $('.produto-coddv').textContent = produto.CODDV;
  $('.produto-status').textContent = 'ALOCADO';
  $('.produto-status').className = 'produto-status badge badge-success'; // Verde

  $('.produto-desc').textContent = produto.DESC;
  $('.produto-barras').textContent = produto.BARRAS || '-';

  const validadeFmt = sistema.formatarValidade(alocacao.validade);
  const statusValidade = sistema.obterStatusValidade(alocacao.validade);

  let corValidade = '';
  if (statusValidade === 'vencida') corValidade = 'text-danger';
  if (statusValidade === 'proxima-vencimento') corValidade = 'text-warning';

  $('.produto-endereco').innerHTML = `<span class="badge badge-outline">${alocacao.endereco}</span>`;
  $('.produto-validade-conta').innerHTML = `<span class="${corValidade}"><strong>${validadeFmt}</strong></span>`;

  $('.produto-validade-conta').className = `value produto-validade-conta ${statusValidade}`; // Helper visual css

  enderecoSelecionado = alocacao.endereco;
  produtoAtual = produto; // Atualiza global

  $('#btnImprimir').disabled = false;
}

function exibirMultiplosLocais(produto, alocacoes) {
  // Mostrar lista de endereços onde esse produto está
  $('#listaEnderecosContainer').classList.remove('hide');
  $('#produtoInfo').classList.add('hide');

  const container = $('#listaEnderecos');
  container.innerHTML = `<div class="alert alert-info">📦 <strong>${produto.DESC}</strong> encontrado em ${alocacoes.length} locais:</div>`;

  alocacoes.forEach(a => {
    const div = document.createElement('div');
    div.className = 'endereco-card-item';
    div.innerHTML = `
            <div class="end-info">
                <span class="end-badge">${a.endereco}</span>
                <span class="end-validade">Val: ${sistema.formatarValidade(a.validade)}</span>
            </div>
            <button class="btn btn-sm btn-ghost">Selecionar</button>
        `;
    div.onclick = () => exibirProdutoAlocado(produto, a);
    container.appendChild(div);
  });
}

function mostrarListaEnderecos(produtos, enderecoNome, buscarDetalhes = false) {
  $('#listaEnderecosContainer').classList.remove('hide');
  const container = $('#listaEnderecos');
  container.innerHTML = `<div class="section-subtitle">📍 Endereço: <strong>${enderecoNome}</strong></div>`;

  produtos.forEach(p => {
    // Enriquecer com descricao da base local se possivel
    let desc = p.descricao_produto || p.descricaoProduto;
    const local = buscarNaBaseLocal(p.coddv);
    if (local) desc = local.DESC;

    const div = document.createElement('div');
    div.className = 'endereco-card-item product-row';
    div.innerHTML = `
            <div class="prod-row-main">
                <span class="prod-cod">${p.coddv}</span>
                <span class="prod-desc">${desc}</span>
            </div>
            <div class="prod-row-meta">
                 <span>Val: <strong>${sistema.formatarValidade(p.validade)}</strong></span>
            </div>
        `;

    // Clicar para focar nesse produto
    div.onclick = () => {
      $('#codigoProduto').value = p.coddv;
      buscarProduto();
    };

    container.appendChild(div);
  });
}

// =========================================================
// CSV / EXPORT
// =========================================================

async function gerarCSV() {
  const inicio = $('#validadeInicio').value;
  const fim = $('#validadeFim').value;

  if (inicio.length !== 4 || fim.length !== 4) {
    showToast('Informe datas no formato MMAA (ex: 0126)', 'warning');
    return;
  }

  const btn = $('#btnGerarCSV');
  btn.disabled = true;
  btn.innerHTML = 'Gerando...';

  try {
    if (!sistema.client) throw new Error('Sem conexão com banco de dados');

    // Consulta direta ao Supabase para pegar range
    const { data, error } = await sistema.client
      .from('alocacoes_fraldas')
      .select('*')
      .eq('ativo', true)
      .gte('validade', inicio)
      .lte('validade', fim)
      .order('validade'); // ordenado por validade

    if (error) throw error;

    if (!data || data.length === 0) {
      showToast('Nenhum registro encontrado neste período.', 'info');
      return;
    }

    baixarCSV(data, `validades_${inicio}_${fim}.csv`);
    showToast('Relatório gerado com sucesso!', 'success');

  } catch (e) {
    console.error(e);
    showToast('Erro ao gerar CSV: ' + e.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = 'Exportar Planilha';
  }
}

function baixarCSV(dados, filename) {
  // Cabeçalho
  let csvContent = "CODDV,DESCRICAO,BARRAS,VALIDADE,ENDERECO,DATA_ALOCACAO,USUARIO\n";

  dados.forEach(row => {
    // Tentar pegar dados completos da base local
    const local = buscarNaBaseLocal(String(row.coddv));
    const desc = local ? local.DESC : (row.descricao_produto || '');
    const barras = local ? local.BARRAS : '';
    const validadeFmt = sistema.formatarValidade(row.validade);
    const dataAloc = row.data_alocacao ? new Date(row.data_alocacao).toLocaleDateString('pt-BR') : '';

    // Escapar aspas
    const descSafe = desc.replace(/"/g, '""');

    csvContent += `"${row.coddv}","${descSafe}","${barras}","${validadeFmt}","${row.endereco}","${dataAloc}","${row.usuario || ''}"\n`;
  });

  // Download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// =========================================================
// IMPRESSÃO / UTILS
// =========================================================

function imprimirEtiqueta() {
  if (!produtoAtual || !enderecoSelecionado) return;

  // Obter dados da alocacao específica
  // Precisamos achar de novo qual alocacao é essa pra pegar o ID se precisar
  // Simplificação: pegar do cache pelo endereço
  const lista = sistema.cacheAlocacoes[enderecoSelecionado] || [];
  const alocacao = lista.find(a => a.coddv == produtoAtual.CODDV);

  const sessao = sistema.obterDadosSessao();

  $('#printDesc').textContent = produtoAtual.DESC;
  $('#printCoddv').textContent = produtoAtual.CODDV;
  $('#printBarras').textContent = produtoAtual.BARRAS;
  $('#printValidade').textContent = alocacao ? sistema.formatarValidade(alocacao.validade) : '--/--';
  $('#printEndereco').textContent = enderecoSelecionado;

  $('#printUsuario').textContent = alocacao?.usuario || sessao.usuario || 'Sistema';
  $('#printMatricula').textContent = sessao.matricula || '';
  $('#printData').textContent = new Date().toLocaleString('pt-BR');
  $('#printIdBadge').textContent = alocacao?.id ? `ID: ${alocacao.id}` : '';

  const template = $('#printTemplate');
  template.classList.remove('hide');
  window.print();
  setTimeout(() => template.classList.add('hide'), 500);
}

function showToast(msg, type = 'info') {
  if (window.showToast) {
    window.showToast(msg, type);
  } else {
    alert(msg);
  }
}
