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

  // Configuração de UI - chama independente do estado do sistema
  setupUI();
  console.log('✅ setupUI chamado com sucesso.');
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

  $('#btnGerarCSV').addEventListener('click', () => {
    console.log('[DEBUG] Clique em btnGerarCSV');
    gerarCSV().catch(e => {
      console.error('Erro em gerarCSV:', e);
      alert('Erro ao gerar CSV: ' + e.message);
    });
  });
  $('#btnGerarPDF').addEventListener('click', () => {
    console.log('[DEBUG] Clique em btnGerarPDF');
    gerarRelatorioPDF().catch(e => {
      console.error('Erro em gerarRelatorioPDF:', e);
      alert('Erro ao gerar PDF: ' + e.message);
    });
  });

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
  // Inicializar Base Cadastro Local (BARRAS)
  if (window.DB_CADASTRO && window.DB_CADASTRO.BASE_CADASTRO) {
    window.BASE_CADASTRO = window.DB_CADASTRO.BASE_CADASTRO;
    console.log(`📦 Base BARRAS carregada com ${window.BASE_CADASTRO.length} produtos.`);
  }
  // Inicializar Base de IDs (Etiquetas por CD)
  if (window.DB_BASE_ID && window.DB_BASE_ID.BASE_BASE_ID) {
    window.BASE_ID = window.DB_BASE_ID.BASE_BASE_ID;
    console.log(`🏷️ Base ID carregada com ${window.BASE_ID.length} etiquetas.`);
  }
}

/**
 * Busca a etiqueta (ID) correspondente ao CODDV para o CD atual
 */
function buscarEtiquetaNaBaseID(coddv, cd) {
  if (!window.BASE_ID) {
    console.warn('[BASE_ID] Base de IDs não carregada!');
    return null;
  }

  // Normalizar para comparação
  const coddvStr = String(coddv).trim();
  const cdNum = parseInt(cd);

  const registro = window.BASE_ID.find(r =>
    String(r.CODDV).trim() === coddvStr && parseInt(r.CD) === cdNum
  );

  return registro ? registro.ID : null;
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
  const originalText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = 'Buscando...';

  try {
    const data = await fetchReportData(inicio, fim);

    // Feedback e Confirmação
    if (!data || data.length === 0) {
      showToast('Nenhum registro encontrado para o período.', 'warning');
      return;
    }

    // Modal profissional de confirmação
    const confirmar = await mostrarModalConfirmacao(
      'Gerar Relatório PDF',
      `Foram encontrados <strong>${data.length}</strong> registros no período de <strong>${inicio}</strong> a <strong>${fim}</strong>.<br><br>Deseja gerar o relatório PDF?`,
      'Gerar PDF',
      'Cancelar'
    );
    if (!confirmar) return;

    btn.innerHTML = 'Gerando...';

    // Obter CD atual para buscar etiquetas (garantir que é inteiro)
    const cdAtual = parseInt(sistema.cd || 2);
    console.log(`[DEBUG] Enriquecendo ${data.length} registros para CD ${cdAtual}`);

    // Enriquecer dados com base local
    const enrichedData = data.map(row => {
      const local = buscarNaBaseLocal(String(row.coddv));
      const etiquetaID = buscarEtiquetaNaBaseID(row.coddv, cdAtual);
      return {
        ...row,
        // Código de barras da BASE_BARRAS
        barras: local ? local.BARRAS : (row.barras || '--'),
        // Etiqueta (ID) da BASE_ID específica do CD
        etiqueta: etiquetaID || '--',
        // Atualiza descrição se tiver local
        descricao_produto: local ? local.DESC : (row.descricao_produto || 'Produto sem descrição')
      };
    });

    // Debug: mostrar primeiros registros enriquecidos
    console.log('[DEBUG] Primeiros 3 registros enriquecidos:', enrichedData.slice(0, 3).map(r => ({
      coddv: r.coddv,
      barras: r.barras,
      etiqueta: r.etiqueta,
      validade: r.validade
    })));

    const sessao = sistema.obterDadosSessao();
    const filtrosInfo = {
      inicio,
      fim,
      deposito: sessao.nomeCD || `CD ${sessao.cd || 2}`
    };

    const optimizer = new ValidadePrintOptimizer();
    const html = optimizer.generatePrintDocument(enrichedData, filtrosInfo);

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
      }, 500);
      showToast('Impressão iniciada!', 'success');
    } else {
      showToast('Pop-up bloqueado. Permita pop-ups.', 'error');
    }

  } catch (e) {
    console.error(e);
    showToast('Erro: ' + e.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
}


async function fetchReportData(inicio, fim) {
  if (!sistema || !sistema.client) {
    showToast('Erro critico: Sistema não inicializado. Recarregue a página.', 'error');
    throw new Error('Sem conexão com sistema');
  }

  const sessao = sistema.obterDadosSessao();
  console.log('[DEBUG] Dados da sessão:', JSON.stringify(sessao));

  // Usar sistema.cd diretamente (já calculado na inicialização do sistema)
  // Garantir que seja número inteiro para a query
  const cdAtual = parseInt(sistema.cd || sessao.cd || 2);

  console.log(`[DEBUG] Buscando dados para CD ${cdAtual}, período ${inicio} a ${fim}`);

  let data = null;
  let error = null;

  // TENTATIVA 1: Usar cache local se disponível (muito mais rápido e não trava)
  if (sistema.cache && sistema.cache.alocacoes && sistema.cache.alocacoes.length > 0) {
    console.log(`[DEBUG] Usando cache local: ${sistema.cache.alocacoes.length} registros`);
    const cachedData = sistema.cache.alocacoes.filter(item => item.cd === cdAtual && item.ativo);

    if (cachedData.length > 0) {
      console.log(`[DEBUG] Encontrados ${cachedData.length} registros no cache para o CD ${cdAtual}`);
      data = cachedData;
    } else {
      console.log('[DEBUG] Cache vazio para este CD, tentando buscar no banco...');
      // data remains null, so it will proceed to database query
    }
  }

  // TENTATIVA 2: Busca no banco se cache falhar
  if (!data) {
    console.log('[DEBUG] Executando query no Supabase...');

    try {
      // Adicionar timeout de 10 segundos
      const queryPromise = sistema.client
        .from('alocacoes_fraldas')
        .select('*')
        .eq('ativo', true)
        .eq('cd', cdAtual);

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout: A query demorou muito para responder')), 10000)
      );

      const result = await Promise.race([queryPromise, timeoutPromise]);

      data = result.data;
      error = result.error;
      console.log(`[DEBUG] Query retornou: ${data ? data.length : 0} registros, erro: ${error ? error.message : 'nenhum'}`);
    } catch (e) {
      console.error('[DEBUG] Erro na query:', e);
      // Verificar se é timeout
      if (e.message.includes('Timeout')) {
        showToast('O servidor demorou para responder. Tente novamente mais tarde.', 'error');
      }
      throw e;
    }
  }

  if (error) {
    console.error('[DEBUG] Erro do Supabase:', error);
    throw error;
  }

  if (!data || data.length === 0) {
    console.log('[DEBUG] Nenhum dado encontrado no banco');
    // Retorna vazio sem toast aqui para deixar o chamador decidir
    return [];
  }

  console.log(`[DEBUG] ${data.length} registros encontrados, aplicando filtro de data...`);

  // Converter filtros para inteiros YYYYMM
  const parseDate = (mmaa) => {
    if (!mmaa || mmaa.length !== 4) return 0;
    const m = mmaa.substring(0, 2);
    const a = mmaa.substring(2, 4);
    return parseInt(`20${a}${m}`);
  };

  const dtInicio = parseDate(inicio);
  const dtFim = parseDate(fim);

  // Filtrar e Ordenar
  return data.filter(item => {
    const dtItem = parseDate(item.validade);
    return dtItem >= dtInicio && dtItem <= dtFim;
  }).sort((a, b) => {
    return parseDate(a.validade) - parseDate(b.validade);
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
    // Fallback para alert se não houver toast sistema
    console.log(`[TOAST ${type}] ${msg}`);
    if (type === 'error' || type === 'warning') {
      alert(msg);
    }
  }
}

/**
 * Modal de confirmação profissional
 * @returns {Promise<boolean>}
 */
function mostrarModalConfirmacao(titulo, mensagem, btnConfirmar = 'Confirmar', btnCancelar = 'Cancelar') {
  return new Promise((resolve) => {
    // Criar overlay
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.style.cssText = `
      position: fixed; inset: 0; background: rgba(0,0,0,0.5);
      display: flex; align-items: center; justify-content: center;
      z-index: 10000; animation: fadeIn 0.2s ease;
    `;

    // Criar modal
    const modal = document.createElement('div');
    modal.className = 'modal-confirmacao';
    modal.style.cssText = `
      background: white; border-radius: 16px; padding: 24px 28px;
      max-width: 420px; width: 90%; box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      animation: slideUp 0.3s ease;
    `;

    modal.innerHTML = `
      <style>
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .modal-title { font-size: 1.25rem; font-weight: 700; color: #1e3a5f; margin-bottom: 12px; display: flex; align-items: center; gap: 10px; }
        .modal-title svg { color: #0ea5e9; }
        .modal-body { color: #475569; line-height: 1.6; margin-bottom: 24px; }
        .modal-actions { display: flex; gap: 12px; justify-content: flex-end; }
        .modal-btn { padding: 12px 24px; border-radius: 10px; font-weight: 600; cursor: pointer; transition: all 0.2s; border: none; font-size: 0.95rem; }
        .modal-btn-cancel { background: #f1f5f9; color: #64748b; }
        .modal-btn-cancel:hover { background: #e2e8f0; }
        .modal-btn-confirm { background: linear-gradient(135deg, #0ea5e9, #0284c7); color: white; }
        .modal-btn-confirm:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(14,165,233,0.4); }
      </style>
      <div class="modal-title">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
        </svg>
        ${titulo}
      </div>
      <div class="modal-body">${mensagem}</div>
      <div class="modal-actions">
        <button class="modal-btn modal-btn-cancel" id="modalCancelar">${btnCancelar}</button>
        <button class="modal-btn modal-btn-confirm" id="modalConfirmar">${btnConfirmar}</button>
      </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Event listeners
    const fecharModal = (resultado) => {
      overlay.style.animation = 'fadeIn 0.2s ease reverse';
      setTimeout(() => {
        overlay.remove();
        resolve(resultado);
      }, 150);
    };

    modal.querySelector('#modalConfirmar').addEventListener('click', () => fecharModal(true));
    modal.querySelector('#modalCancelar').addEventListener('click', () => fecharModal(false));
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) fecharModal(false);
    });
  });
}
