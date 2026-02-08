/* ===== Página de Relatório de Validades (Refatorada) ===== */

import { ValidadePrintOptimizer } from './validade-print.js';

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

let produtoAtual = null;
let enderecoSelecionado = null;
let sistema = null; // Instância do SistemaEnderecamentoSupabase
let baseEndIndex = null; // Índice BASE_END filtrado por CD logado (CODDV -> ENDERECO)
let baseEndIndexCd = null; // CD atualmente indexado

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
  if (window.DB_CADASTRO && window.DB_CADASTRO.BASE_CADASTRO) {
    window.BASE_CADASTRO = window.DB_CADASTRO.BASE_CADASTRO;
    console.log(`📦 Base local carregada com ${window.BASE_CADASTRO.length} produtos.`);
  }

  const sessao = sistema?.obterDadosSessao?.() || {};
  const cdAtual = parseInt(sistema?.cd || sessao?.cd || 2, 10);
  prepararIndiceBaseEnd(cdAtual);
}

function prepararIndiceBaseEnd(cd) {
  if (!window.DB_END || !Array.isArray(window.DB_END.BASE_END)) {
    console.warn('Base de endereços não carregada (BASE_END.js)');
    baseEndIndex = null;
    baseEndIndexCd = null;
    return;
  }

  const cdNum = parseInt(cd, 10);
  if (Number.isNaN(cdNum)) {
    baseEndIndex = null;
    baseEndIndexCd = null;
    return;
  }

  // Reaproveita cache se o CD não mudou
  if (baseEndIndex && baseEndIndexCd === cdNum) return;

  const index = new Map();
  const lista = window.DB_END.BASE_END;

  for (const r of lista) {
    if (!r) continue;
    const tipo = String(r.TIPO || '').trim().toUpperCase();
    if (tipo !== 'SEPARACAO') continue;
    if (parseInt(r.CD, 10) !== cdNum) continue;

    const coddv = String(r.CODDV || '').trim();
    const endereco = String(r.ENDERECO || '').toUpperCase().replace(/\s+/g, '');
    if (!coddv || !endereco) continue;

    // Mantém a primeira ocorrência do CODDV para o CD
    if (!index.has(coddv)) {
      index.set(coddv, endereco);
    }
  }

  baseEndIndex = index;
  baseEndIndexCd = cdNum;
  console.log(`📍 Índice BASE_END carregado para CD ${cdNum}: ${index.size} CODDVs`);
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
  $('.produto-barras').textContent = obterBarrasPrincipal(produto);
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
  $('.produto-barras').textContent = obterBarrasPrincipal(produto);

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

    if (!data || data.length === 0) {
      showToast('Nenhum registro encontrado para o período e depósito.', 'warning');
      return;
    }

    baixarCSV(data, `validades_${inicio}_${fim}.xls`);
    showToast('Relatório gerado com sucesso!', 'success');

  } catch (e) {
    console.error(e);
    showToast('Erro ao gerar CSV: ' + e.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
        </svg>
        Baixar Planilha (Excel)
    `;
  }
}

/**
 * Busca o ID da etiqueta na base auxiliar BASE_ID.js
 */
function buscarEtiquetaNaBaseID(coddv, cd) {
  // Verifica se a base está carregada no window.DB_BASE_ID
  if (!window.DB_BASE_ID || !window.DB_BASE_ID.BASE_BASE_ID) {
    console.warn('Base de IDs não carregada (BASE_ID.js)');
    return null;
  }

  const coddvStr = String(coddv).trim();
  const cdNum = parseInt(cd);

  const registro = window.DB_BASE_ID.BASE_BASE_ID.find(r =>
    String(r.CODDV).trim() === coddvStr && parseInt(r.CD) === cdNum
  );

  return registro ? registro.ID : null;
}

/**
 * Busca endereço de separação na BASE_END.js e retorna formato PP.999
 * Exemplo: ENDERECO "D01 .001.011.056" => "D0.056"
 */
function buscarCodigoSeparacao(coddv, cd) {
  const coddvStr = String(coddv || '').trim();
  const cdNum = parseInt(cd, 10);
  if (!coddvStr || Number.isNaN(cdNum)) return null;

  prepararIndiceBaseEnd(cdNum);
  if (!baseEndIndex || baseEndIndexCd !== cdNum) return null;

  const endereco = baseEndIndex.get(coddvStr);
  if (!endereco) return null;
  if (endereco.length < 5) return null;

  const prefixo = endereco.slice(0, 2);
  const sufixo = endereco.slice(-3);
  if (prefixo.length < 2 || sufixo.length < 3) return null;

  return { prefixo, sufixo };
}

function obterBarrasPrincipal(produto) {
  if (!produto || produto.BARRAS == null || produto.BARRAS === '') return '--';
  if (Array.isArray(produto.BARRAS)) {
    const primeiro = produto.BARRAS.find(v => String(v || '').trim());
    return primeiro ? String(primeiro).trim() : '--';
  }
  return String(produto.BARRAS).trim() || '--';
}

function preencherCodigoSeparacaoImpressao(codigoSeparacao) {
  const elCentro = $('#printSeparacaoCode');
  const elPrefixo = $('#printSeparacaoPrefix');
  if (!elCentro || !elPrefixo) return;

  const prefixo = (codigoSeparacao?.prefixo || '00').toString().toUpperCase().slice(0, 2).padEnd(2, '0');
  const sufixo = (codigoSeparacao?.sufixo || '000').toString().replace(/\D/g, '').slice(-3).padStart(3, '0');

  elCentro.textContent = sufixo;
  elPrefixo.textContent = prefixo;
}

/**
 * Exibe modal de confirmação customizado
 */
function mostrarModal(titulo, mensagem) {
  return new Promise(resolve => {
    const modal = document.getElementById('modalConfirmacao');
    const titleEl = document.getElementById('modalConfirmTitle');
    const msgEl = document.getElementById('modalConfirmMessage');
    const btnOk = document.getElementById('btnModalConfirmOk');
    const btnCancel = document.getElementById('btnModalConfirmCancel');
    const btnClose = document.getElementById('btnModalConfirmClose');

    if (!modal) {
      // Fallback se modal não existir no HTML
      resolve(confirm(`${titulo}\n\n${mensagem}`));
      return;
    }

    titleEl.textContent = titulo;
    msgEl.innerText = mensagem; // innerText respeita quebras de linha

    const fechar = (valor) => {
      modal.classList.remove('active');
      btnOk.onclick = null;
      btnCancel.onclick = null;
      btnClose.onclick = null;
      resolve(valor);
    };

    btnOk.onclick = () => fechar(true);
    btnCancel.onclick = () => fechar(false);
    btnClose.onclick = () => fechar(false);

    modal.classList.add('active');
  });
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
      showToast('Nenhum registro encontrado para o período e depósito.', 'warning');
      return; // Finally vai resetar o botão
    }

    const confirmar = await mostrarModal(
      'Gerar Relatório',
      `${data.length} registros encontrados.\nDeseja gerar o relatório PDF?`
    );

    if (!confirmar) {
      // Se cancelar, precisamos restaurar o botão manualmente aqui ou deixar pro finally?
      // O finally executa sempre. Então basta dar return/throw.
      return;
    }

    btn.innerHTML = 'Gerando...';

    // Enriquecer dados com base local
    // Enriquecer dados com base local
    const enrichedData = data.map(row => {
      const dbLocal = buscarNaBaseLocal(String(row.coddv)); // Renomeei para evitar confusão
      // Obter CD atual para buscar etiquetas (garantir que é inteiro)
      const cdAtual = parseInt(sistema.cd || 2);
      const etiquetaID = buscarEtiquetaNaBaseID(row.coddv, cdAtual);

      return {
        ...row,
        // Campo 'barras': Código de barras da BASE_BARRAS
        barras: dbLocal ? dbLocal.BARRAS : (row.barras || '--'),
        // Campo 'etiqueta': ID da BASE_ID específica do CD
        etiqueta: etiquetaID || '--',
        // Atualiza descrição se tiver local
        descricao_produto: dbLocal ? dbLocal.DESC : (row.descricao_produto || 'Produto sem descrição')
      };
    });

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
  const cdAtual = sistema.cd || sessao.cd || 2;

  console.log(`[DEBUG] Buscando dados para CD ${cdAtual}, período ${inicio} a ${fim}`);

  // Busca TUDO do CD ativo para filtrar no JS (correção de filtro MMAA string)
  const { data, error } = await sistema.client
    .from('alocacoes_fraldas')
    .select('*')
    .eq('ativo', true)
    .eq('cd', cdAtual);

  if (error) throw error;

  if (!data || data.length === 0) {
    // Retorna vazio sem toast aqui para deixar o chamador decidir
    return [];
  }

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
  // Gera conteúdo HTML compatível com Excel (Web Archive / MIME Excel)
  // Isso permite ajustar largura de colunas e formatar células
  let html = `
  <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
  <head>
      <meta http-equiv="content-type" content="application/vnd.ms-excel; charset=UTF-8">
      <!--[if gte mso 9]>
      <xml>
      <x:ExcelWorkbook>
      <x:ExcelWorksheets>
          <x:ExcelWorksheet>
              <x:Name>Relatorio</x:Name>
              <x:WorksheetOptions>
                  <x:DisplayGridlines/>
              </x:WorksheetOptions>
          </x:ExcelWorksheet>
      </x:ExcelWorksheets>
      </x:ExcelWorkbook>
      </xml>
      <![endif]-->
      <style>
          br { mso-data-placement: same-cell; }
          body { font-family: Arial, sans-serif; font-size: 10pt; }
          table { border-collapse: collapse; }
          td, th { border: 1px solid #ccc; padding: 4px; vertical-align: middle; }
          th { background-color: #f0f0f0; font-weight: bold; text-align: center; }
          .str { mso-number-format:"\\@"; } /* Texto Puro */
          .num { mso-number-format:"0"; }    /* Número Inteiro */
          .date { mso-number-format:"dd\\/mm\\/yyyy"; }
      </style>
  </head>
  <body>
  <table>
      <!-- Definição de Larguras (aprox pixels) -->
      <col width="80">  <!-- CODDV -->
      <col width="350"> <!-- DESC -->
      <col width="80">  <!-- VAL -->
      <col width="120"> <!-- END -->
      <col width="130"> <!-- BARRAS -->
      <col width="80">  <!-- ETIQUETA -->
      <col width="100"> <!-- USUARIO -->
      <col width="100"> <!-- DATA -->
      
      <tr>
          <th>CODDV</th>
          <th>DESCRIÇÃO</th>
          <th>VALIDADE</th>
          <th>ENDEREÇO</th>
          <th>BARRAS</th>
          <th>ETIQUETA</th>
          <th>USUÁRIO</th>
          <th>DATA ALOCAÇÃO</th>
      </tr>`;

  dados.forEach(row => {
    // 1. Enriquecimento (Igual PDF)
    const dbLocal = buscarNaBaseLocal(String(row.coddv));
    const cdAtual = parseInt(sistema.cd || 2);
    const etiquetaID = buscarEtiquetaNaBaseID(row.coddv, cdAtual);

    let desc = dbLocal ? dbLocal.DESC : (row.descricao_produto || 'Produto sem descrição');
    let barras = dbLocal ? dbLocal.BARRAS : (row.barras || '');
    let etiqueta = etiquetaID || '';

    // Formatar Validade
    let validadeFmt = row.validade;
    if (row.validade && row.validade.length === 4) {
      validadeFmt = `${row.validade.substring(0, 2)}/20${row.validade.substring(2, 4)}`;
    }

    // Swap Barras/Etiqueta
    if (String(etiqueta).length > 6 && (!barras || barras === '--' || barras === '-')) {
      barras = etiqueta;
      etiqueta = '';
    }

    // Formatar Data Alocação DD/MM/AAAA
    let dataAloc = '';
    if (row.data_alocacao) {
      // Tenta parsear e formatar
      try {
        const d = new Date(row.data_alocacao);
        if (!isNaN(d.getTime())) {
          dataAloc = d.toLocaleDateString('pt-BR');
        }
      } catch (e) { }
    }

    // Escapar HTML básico
    const escape = (s) => (s || '').toString().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    html += `
    <tr>
        <td class="num" style="text-align:center">${row.coddv}</td>
        <td class="str">${escape(desc)}</td>
        <td class="str" style="text-align:center">${validadeFmt}</td>
        <td class="str" style="text-align:center">${row.endereco}</td>
        <td class="num" style="text-align:center">${escape(barras)}</td>
        <td class="str" style="text-align:center">${escape(etiqueta)}</td>
        <td class="str">${escape(row.usuario)}</td>
        <td class="str" style="text-align:center">${dataAloc}</td>
    </tr>`;
  });

  html += `</table></body></html>`;

  // Download como arquivo Excel (MIME fake mas funcional)
  const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
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
  const validadeRaw = alocacao?.validade || '';
  let validadeImpressao = sistema.formatarValidade(validadeRaw) || '--/--';
  // Garantir formato MM/AA na etiqueta impressa
  if (/^\d{4}$/.test(validadeRaw)) {
    validadeImpressao = `${validadeRaw.substring(0, 2)}/${validadeRaw.substring(2)}`;
  } else if (!/^\d{2}\/\d{2}$/.test(validadeImpressao)) {
    validadeImpressao = '--/--';
  }

  $('#printDesc').textContent = produtoAtual.DESC;
  $('#printCoddv').textContent = produtoAtual.CODDV;
  $('#printBarras').textContent = obterBarrasPrincipal(produtoAtual);
  $('#printValidade').textContent = validadeImpressao;

  const cdAtual = parseInt(sistema?.cd || sessao?.cd || 2, 10);
  const codigoSeparacao = buscarCodigoSeparacao(produtoAtual.CODDV, cdAtual) || { prefixo: '00', sufixo: '000' };
  preencherCodigoSeparacaoImpressao(codigoSeparacao);

  const usuarioPrint = alocacao?.usuario || sessao.usuario || 'Sistema';
  const matriculaPrint = sessao.matricula || '--';
  const enderecoPrint = enderecoSelecionado || '--';
  const dataPrint = new Date().toLocaleString('pt-BR');
  $('#printFooterLine').textContent = `${usuarioPrint} . ${matriculaPrint} . ${enderecoPrint} . ${dataPrint}`;

  const template = $('#printTemplate');
  template.classList.remove('hide');
  window.print();
  setTimeout(() => template.classList.add('hide'), 500);
}

function showToast(message, type = 'info') {
  // Cria container se não existir
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.style.position = 'fixed';
    container.style.bottom = '20px';
    container.style.right = '20px';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '10px';
    container.style.zIndex = '9999';
    document.body.appendChild(container);
  }

  // Define cores baseadas no tipo
  const colors = {
    error: '#ef4444',
    warning: '#f59e0b',
    success: '#10b981',
    info: '#3b82f6'
  };
  const bg = colors[type] || colors.info;

  // Cria toast
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  // Estilos
  Object.assign(toast.style, {
    background: bg,
    color: 'white',
    padding: '12px 24px',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    minWidth: '300px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: '14px',
    fontFamily: 'var(--font-primary, sans-serif)',
    opacity: '0',
    transform: 'translateY(10px)',
    transition: 'all 0.3s ease'
  });

  toast.innerHTML = `<span style="flex:1">${message}</span>`;

  // Botão fechar
  const closeBtn = document.createElement('button');
  closeBtn.innerHTML = '×'; // times
  Object.assign(closeBtn.style, {
    background: 'transparent',
    border: 'none',
    color: 'white',
    fontSize: '20px',
    cursor: 'pointer',
    marginLeft: '12px',
    lineHeight: '1',
    padding: '0'
  });
  closeBtn.onclick = () => remover();

  toast.appendChild(closeBtn);
  container.appendChild(toast);

  // Animação de entrada
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
  });

  const remover = () => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => {
      if (toast.parentNode) toast.remove();
    }, 300);
  };

  // Auto remove
  setTimeout(remover, 4000);
}
