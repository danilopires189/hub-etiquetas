/* ===== Página de Relatório de Validades (Refatorada) ===== */

import { ValidadePrintOptimizer } from './validade-print.js';

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
  $('#btnGerarPDF').addEventListener('click', gerarRelatorioPDF);

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

  // Impressão Etiqueta Individual
  $('#btnImprimir').addEventListener('click', imprimirEtiqueta);

  // Formatação de datas nos inputs
  ['validadeInicio', 'validadeFim'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/\D/g, '').substring(0, 4);
      });
    }
  });
}

function inicializarPagina() {
  // Configs iniciais se necessario
}

function limparCampos() {
  $('#codigoProduto').value = '';
  $('#btnClearInput').classList.add('hide');
  $('#produtoInfo').classList.add('hide');
  $('#listaEnderecosContainer').classList.add('hide');
  $('#listaEnderecos').innerHTML = '';
  produtoAtual = null;
  enderecoSelecionado = null;
  $('#codigoProduto').focus();
}

async function buscarProduto() {
  const termo = $('#codigoProduto').value.trim().toUpperCase();
  if (!termo) {
    showToast('Digite um código ou endereço', 'warning');
    return;
  }

  const btn = $('#btnBuscar');
  const originalText = btn.innerHTML;
  btn.innerHTML = '...';
  btn.disabled = true;

  try {
    // 1. Verificar se é Produto (CODDV ou BARRAS)
    let produto = buscarNaBaseLocal(termo);

    // 2. Se não achou na base local, buscar produto direto no Supabase (pode ser novo)
    if (!produto) {
      // Tentar buscar nas alocações se existe esse CODDV
      // ou se o termo é um BARRAS válido
    }

    if (produto) {
      produtoAtual = produto;
      await processarProduto(produto);
    } else if (validarFormatoEndereco(termo)) {
      // 3. Verificar se é Endereço
      await processarEndereco(termo);
    } else {
      // Busca direta no banco de alocacoes
      const alocacoes = await buscarAlocaDireta(termo);
      if (alocacoes && alocacoes.length > 0) {
        // Encontrou CODDV que nao tava na base local mas tá no banco
        // Criar objeto produto fake baseado no banco
        const first = alocacoes[0];
        produtoAtual = {
          CODDV: first.coddv,
          DESC: first.descricao_produto,
          BARRAS: '' // desconhecido
        };
        exibirMultiplosLocais(produtoAtual, alocacoes);
      } else {
        showToast('Produto ou endereço não encontrado', 'error');
      }
    }

  } catch (error) {
    console.error(error);
    showToast('Erro ao buscar: ' + error.message, 'error');
  } finally {
    btn.innerHTML = originalText;
    btn.disabled = false;
  }
}

function buscarNaBaseLocal(termo) {
  if (!window.BASE_CADASTRO) return null;
  // Busca exata CODDV
  let found = window.BASE_CADASTRO.find(p => p.CODDV == termo);
  if (found) return found;

  // Busca por BARRAS (pode ser lista ou string)
  found = window.BASE_CADASTRO.find(p => {
    if (!p.BARRAS) return false;
    if (Array.isArray(p.BARRAS)) return p.BARRAS.includes(termo);
    return p.BARRAS == termo;
  });

  return found;
}

function validarFormatoEndereco(termo) {
  // Simplificado: PF + numeros
  return /^PF\d{2}/.test(termo) || /^\d{2}-\d{3}/.test(termo); // Aceitar formatos diversos
}

async function buscarAlocaDireta(termo) {
  if (!sistema.client) return [];
  // Tenta buscar por CODDV
  const { data } = await sistema.client.from('alocacoes_fraldas')
    .select('*')
    .eq('coddv', termo)
    .eq('ativo', true);
  return data || [];
}

async function processarProduto(produto) {
  // Buscar onde está alocado
  // Usar sistema.cacheAlocacoes se disponivel, ou buscar direto

  const alocacoes = [];

  // Varre cache
  for (const [end, lista] of Object.entries(sistema.cacheAlocacoes)) {
    const match = lista.find(p => p.coddv == produto.CODDV);
    if (match) {
      alocacoes.push({ ...match, endereco: end });
    }
  }

  if (alocacoes.length === 0) {
    exibirProdutoNaoAlocado(produto);
  } else if (alocacoes.length === 1) {
    exibirProdutoAlocado(produto, alocacoes[0]);
  } else {
    exibirMultiplosLocais(produto, alocacoes);
  }
}

async function processarEndereco(endereco) {
  // Normalizar endereço?
  // Buscar no cache
  const produtosNoEndereco = sistema.cacheAlocacoes[endereco.toUpperCase()] || [];

  if (produtosNoEndereco.length === 0) {
    // Tentar buscar direto no banco pra garantir
    const { data } = await sistema.client.from('alocacoes_fraldas')
      .select('*')
      .eq('endereco', endereco.toUpperCase())
      .eq('ativo', true);

    if (data && data.length > 0) {
      mostrarListaEnderecos(data.map(p => ({ ...p, endereco: endereco.toUpperCase() })));
      return;
    }
    showToast(`Endereço ${endereco} vazio ou inválido`, 'info');
  } else {
    mostrarListaEnderecos(produtosNoEndereco.map(p => ({ ...p, endereco: endereco.toUpperCase() })));
  }
}

// ================= UI RENDERING =================

function exibirProdutoNaoAlocado(produto) {
  $('#produtoInfo').classList.remove('hide');
  $('#listaEnderecosContainer').classList.add('hide');

  $('.produto-coddv').textContent = produto.CODDV;
  $('.produto-status').textContent = 'Não Alocado';
  $('.produto-status').className = 'produto-status badge badge-neutral';
  $('.produto-desc').textContent = produto.DESC;
  $('.produto-barras').textContent = Array.isArray(produto.BARRAS) ? produto.BARRAS.join(', ') : produto.BARRAS;
  $('.produto-endereco').textContent = '-';
  $('.produto-validade-conta').textContent = 'Produto sem alocação ativa';

  $('#btnImprimir').disabled = true;
  produtoAtual = produto;
  enderecoSelecionado = null;
}

function exibirProdutoAlocado(produto, alocacao) {
  $('#produtoInfo').classList.remove('hide');
  $('#listaEnderecosContainer').classList.add('hide');

  const statusVal = sistema.obterStatusValidade(alocacao.validade);
  const validadeFmt = sistema.formatarValidade(alocacao.validade);

  $('.produto-coddv').textContent = produto.CODDV;
  $('.produto-status').textContent = 'Alocado';
  $('.produto-status').className = 'produto-status badge badge-success';
  $('.produto-desc').textContent = alocacao.descricao_produto || produto.DESC;
  $('.produto-barras').textContent = Array.isArray(produto.BARRAS) ? produto.BARRAS.join(', ') : produto.BARRAS;

  $('.produto-endereco').textContent = alocacao.endereco;
  $('.produto-validade-conta').textContent = validadeFmt;
  $('.produto-validade-conta').className = `value produto-validade-conta status-${statusVal}`; // Adicionar cor

  $('#btnImprimir').disabled = false;
  produtoAtual = produto;
  enderecoSelecionado = alocacao.endereco;
}

function exibirMultiplosLocais(produto, alocacoes) {
  $('#produtoInfo').classList.add('hide');
  $('#listaEnderecosContainer').classList.remove('hide');

  mostrarListaEnderecos(alocacoes);
}

function mostrarListaEnderecos(lista) {
  const container = $('#listaEnderecos');
  container.innerHTML = '';

  lista.forEach(aloc => {
    const item = document.createElement('div');
    item.className = 'endereco-card animate-slide-in-up';

    const statusVal = sistema.obterStatusValidade(aloc.validade);
    const validadeFmt = sistema.formatarValidade(aloc.validade);

    item.innerHTML = `
            <div class="card-left">
                <div class="end-code">${aloc.endereco}</div>
                <div class="prod-name">${aloc.descricao_produto} <small>(#${aloc.coddv})</small></div>
            </div>
            <div class="card-right">
                <div class="validade-chip ${statusVal}">
                   <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                   ${validadeFmt}
                </div>
                <button class="btn-icon-sm" title="Selecionar">
                   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
                </button>
            </div>
        `;

    item.addEventListener('click', () => {
      // Selecionar este
      const prodFake = {
        CODDV: aloc.coddv,
        DESC: aloc.descricao_produto,
        BARRAS: ''
      };
      exibirProdutoAlocado(prodFake, aloc);
    });

    container.appendChild(item);
  });

  $('#listaEnderecosContainer').classList.remove('hide');
}


// ================= EXPORTAÇÃO =================

async function gerarCSV() {
  const inicio = $('#validadeInicio').value;
  const fim = $('#validadeFim').value;

  if (!inicio || !fim || inicio.length !== 4 || fim.length !== 4) {
    showToast('Informe datas no formato MMAA (ex: 0126)', 'warning');
    return;
  }

  const btn = $('#btnGerarCSV');
  btn.disabled = true;
  btn.innerHTML = 'Gerando...';

  try {
    const data = await fetchReportData(inicio, fim);
    if (!data.length) return;

    baixarCSV(data, `validades_${inicio}_${fim}.csv`);
    showToast('Relatório gerado com sucesso!', 'success');

  } catch (e) {
    console.error(e);
    showToast('Erro ao gerar CSV: ' + e.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 8px;">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
        </svg>
        Baixar Planilha (CSV)
    `;
  }
}

async function gerarRelatorioPDF() {
  const inicio = $('#validadeInicio').value;
  const fim = $('#validadeFim').value;

  if (!inicio || !fim || inicio.length !== 4 || fim.length !== 4) {
    showToast('Informe datas no formato MMAA (ex: 0126)', 'warning');
    return;
  }

  const btn = $('#btnGerarPDF');
  btn.disabled = true;
  btn.innerHTML = 'Gerando PDF...';

  try {
    const data = await fetchReportData(inicio, fim);
    if (!data.length) return;

    // Enriquecer dados com base local (DESCRIÇÃO principalmente)
    const enrichedData = data.map(row => {
      const local = buscarNaBaseLocal(String(row.coddv));
      return {
        ...row,
        DESC: local ? local.DESC : (row.descricao_produto || 'Produto sem descrição'),
        BARRAS: local ? local.BARRAS : ''
      };
    });

    const optimizer = new ValidadePrintOptimizer();
    const html = optimizer.generatePrintDocument(enrichedData, { inicio, fim });

    // Abrir janela de impressão
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      // Aguardar carregamento (imagens, styles)
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
      }, 500);
      showToast('Impressão iniciada!', 'success');
    } else {
      showToast('Pop-up bloqueado. Permita pop-ups para imprimir.', 'error');
    }

  } catch (e) {
    console.error(e);
    showToast('Erro ao gerar PDF: ' + e.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 8px;">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
        </svg>
        Imprimir Relatório (PDF)
    `;
  }
}


async function fetchReportData(inicio, fim) {
  if (!sistema.client) throw new Error('Sem conexão com banco de dados');

  const { data, error } = await sistema.client
    .from('alocacoes_fraldas')
    .select('*')
    .eq('ativo', true)
    .gte('validade', inicio)
    .lte('validade', fim);

  if (error) throw error;

  if (!data || data.length === 0) {
    showToast('Nenhum registro encontrado neste período.', 'info');
    return [];
  }

  // Ordenar logicamente (YYYYMM)
  return data.sort((a, b) => {
    const valA = a.validade || '0000';
    const valB = b.validade || '0000';
    // MMAA -> YYYYMM
    const dateA = parseInt('20' + valA.substring(2, 4) + valA.substring(0, 2));
    const dateB = parseInt('20' + valB.substring(2, 4) + valB.substring(0, 2));
    return dateA - dateB;
  });
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
    // Fallback simples
    console.log(`[TOAST ${type}] ${msg}`);
  }
}
