const $ = (sel) => document.querySelector(sel);

let sistema = null;
let produtoSelecionado = null;
let coletasCache = [];
let abaAtual = 'nao';

document.addEventListener('DOMContentLoaded', async () => {
  const session = localStorage.getItem('enderecamento_fraldas_session');
  if (!session) {
    window.location.href = './login.html';
    return;
  }

  if (window.sistemaEnderecamento) {
    sistema = window.sistemaEnderecamento;
    await inicializar();
  } else {
    window.addEventListener('sistemaEnderecamentoPronto', async () => {
      sistema = window.sistemaEnderecamento;
      await inicializar();
    }, { once: true });
  }
});

async function inicializar() {
  setupUI();
  if (isDesktop()) {
    await garantirBaseEndNoDesktop();
    await carregarListaDesktop();
  } else {
    focarInputColeta();
  }
}

function setupUI() {
  const inputCodigo = $('#coletaCodigo');
  const btnBuscar = $('#btnColetaBuscar');
  const btnClear = $('#btnColetaClear');
  const btnSalvar = $('#btnColetaSalvar');
  const loteFlag = $('#coletaLoteFlag');

  if (inputCodigo) {
    inputCodigo.addEventListener('input', () => {
      btnClear.classList.toggle('hide', !inputCodigo.value.trim());
    });
    inputCodigo.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        buscarProdutoColeta();
      }
    });
  }

  if (btnBuscar) btnBuscar.addEventListener('click', buscarProdutoColeta);
  if (btnClear) btnClear.addEventListener('click', limparColeta);
  if (btnSalvar) btnSalvar.addEventListener('click', salvarColeta);

  const inputValidade = $('#coletaValidade');
  if (inputValidade) {
    inputValidade.addEventListener('input', () => {
      inputValidade.value = String(inputValidade.value || '').replace(/\D/g, '').slice(0, 4);
    });
    inputValidade.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        salvarColeta();
      }
    });
  }

  const inputLote = $('#coletaLote');
  if (loteFlag && inputLote) {
    loteFlag.addEventListener('change', () => {
      const ativo = loteFlag.checked;
      inputLote.classList.toggle('hide', !ativo);
      if (!ativo) inputLote.value = '';
      if (ativo) inputLote.focus();
    });
  }

  const btnScan = $('#btnColetaScan');
  if (btnScan) {
    btnScan.addEventListener('click', () => {
      if (window.mobileScanner && typeof window.mobileScanner.openScanner === 'function') {
        window.mobileScanner.openScanner('barcode', (code) => {
          $('#coletaCodigo').value = code;
          buscarProdutoColeta();
        });
      } else {
        showToast('Scanner não disponível. Use leitor físico ou digitação.', 'warning');
      }
    });
  }

  const btnAtualizar = $('#btnColetaAtualizarLista');
  if (btnAtualizar) btnAtualizar.addEventListener('click', carregarListaDesktop);

  const btnTabNao = $('#btnTabNaoImpresso');
  const btnTabSim = $('#btnTabImpressoHoje');
  if (btnTabNao) {
    btnTabNao.addEventListener('click', () => {
      abaAtual = 'nao';
      atualizarAbas();
      renderListaDesktop();
    });
  }
  if (btnTabSim) {
    btnTabSim.addEventListener('click', () => {
      abaAtual = 'sim';
      atualizarAbas();
      renderListaDesktop();
    });
  }
}

function isDesktop() {
  return window.matchMedia('(min-width: 901px)').matches;
}

function obterCdAtual() {
  const sessao = sistema?.obterDadosSessao?.() || {};
  return parseInt(sistema?.cd || sessao?.cd || 2, 10);
}

function obterSessao() {
  return sistema?.obterDadosSessao?.() || { usuario: 'Sistema', matricula: null, cd: 2, nomeCD: 'CD02' };
}

function normalizarTipoEndereco(tipo) {
  return String(tipo || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();
}

function obterBaseCadastro() {
  if (window.BASE_CADASTRO && Array.isArray(window.BASE_CADASTRO)) return window.BASE_CADASTRO;
  if (window.DB_CADASTRO && Array.isArray(window.DB_CADASTRO.BASE_CADASTRO)) return window.DB_CADASTRO.BASE_CADASTRO;
  return [];
}

function buscarProdutoNaBase(termo) {
  const base = obterBaseCadastro();
  const codigo = String(termo || '').trim();
  if (!codigo) return null;

  let found = base.find((p) => String(p.CODDV || '').trim() === codigo);
  if (found) return found;

  found = base.find((p) => {
    if (p.BARRAS == null) return false;
    if (Array.isArray(p.BARRAS)) {
      return p.BARRAS.some((b) => String(b || '').trim() === codigo);
    }
    return String(p.BARRAS || '').trim() === codigo;
  });
  return found || null;
}

function obterBarrasPrincipal(produto) {
  if (!produto) return '--';
  if (Array.isArray(produto.BARRAS)) {
    const primeiro = produto.BARRAS.find((v) => String(v || '').trim());
    return primeiro ? String(primeiro).trim() : '--';
  }
  return String(produto.BARRAS || '').trim() || '--';
}

function parseMmaa(mmaa) {
  const valor = String(mmaa || '').replace(/\D/g, '').slice(0, 4);
  if (!/^\d{4}$/.test(valor)) return null;
  const mes = parseInt(valor.substring(0, 2), 10);
  if (mes < 1 || mes > 12) return null;
  return valor;
}

function formatarMmaa(valor) {
  const v = parseMmaa(valor);
  if (!v) return '--/--';
  return `${v.substring(0, 2)}/${v.substring(2)}`;
}

async function buscarProdutoColeta() {
  const inputCodigo = $('#coletaCodigo');
  if (!inputCodigo) return;

  const termo = String(inputCodigo.value || '').trim();
  if (!termo) {
    showToast('Informe um código para buscar.', 'warning');
    return;
  }

  const produto = buscarProdutoNaBase(termo);
  if (!produto) {
    showToast('Código não encontrado na BASE_BARRAS.', 'warning');
    return;
  }

  produtoSelecionado = {
    CODDV: String(produto.CODDV || '').trim(),
    DESC: String(produto.DESC || '').trim(),
    BARRAS: obterBarrasPrincipal(produto)
  };

  $('#coletaDesc').textContent = produtoSelecionado.DESC || '--';
  $('#coletaCoddv').textContent = produtoSelecionado.CODDV || '--';
  $('#coletaBarras').textContent = produtoSelecionado.BARRAS || '--';
  $('#coletaProdutoInfo').classList.remove('hide');
  $('#coletaValidade').focus();
  $('#coletaValidade').select();
}

async function salvarColeta() {
  if (!produtoSelecionado) {
    showToast('Busque um produto antes de salvar.', 'warning');
    return;
  }

  if (!sistema?.client) {
    showToast('Conexão com Supabase indisponível.', 'error');
    return;
  }

  const validade = parseMmaa($('#coletaValidade')?.value || '');
  if (!validade) {
    showToast('Validade inválida. Use MMAA.', 'warning');
    $('#coletaValidade')?.focus();
    return;
  }

  const loteAtivo = Boolean($('#coletaLoteFlag')?.checked);
  const lote = loteAtivo ? String($('#coletaLote')?.value || '').trim().toUpperCase() : null;
  const tipo = normalizarTipoEndereco($('#coletaTipo')?.value || 'SEPARACAO');
  const sessao = obterSessao();
  const cdAtual = obterCdAtual();

  const payload = {
    cd: cdAtual,
    usuario_nome: String(sessao.usuario || 'Sistema'),
    usuario_matricula: String(sessao.matricula || ''),
    coddv: String(produtoSelecionado.CODDV || ''),
    barras: String(produtoSelecionado.BARRAS || ''),
    validade,
    lote: lote || null,
    tipo,
    descricao: String(produtoSelecionado.DESC || ''),
    data_hora_brasilia: dataHoraBrasiliaSql(),
    print: 'Nao'
  };

  const { error } = await sistema.client
    .from('coletas_fraldas')
    .insert([payload]);

  if (error) {
    console.error(error);
    showToast(`Erro ao salvar coleta: ${error.message}`, 'error');
    return;
  }

  showToast('Coleta salva com sucesso.', 'success');
  limparColeta();
}

function limparColeta() {
  produtoSelecionado = null;
  $('#coletaCodigo').value = '';
  $('#coletaValidade').value = '';
  $('#coletaTipo').value = 'SEPARACAO';
  $('#coletaLoteFlag').checked = false;
  $('#coletaLote').value = '';
  $('#coletaLote').classList.add('hide');
  $('#coletaProdutoInfo').classList.add('hide');
  $('#btnColetaClear').classList.add('hide');
  focarInputColeta();
}

function focarInputColeta() {
  const input = $('#coletaCodigo');
  if (!input) return;
  input.focus();
  input.select();
}

async function garantirBaseEndNoDesktop() {
  if (!isDesktop()) return;
  if (window.DB_END && Array.isArray(window.DB_END.BASE_END)) return;

  await new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = '../data_base/BASE_END.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Falha ao carregar BASE_END.js'));
    document.head.appendChild(script);
  });
}

function buscarRegistroBaseEnd(coddv, cd, tipo = 'SEPARACAO') {
  if (!window.DB_END || !Array.isArray(window.DB_END.BASE_END)) return null;
  const coddvStr = String(coddv || '').trim();
  const cdNum = parseInt(cd, 10);
  const tipoNorm = normalizarTipoEndereco(tipo);
  if (!coddvStr || Number.isNaN(cdNum)) return null;

  return window.DB_END.BASE_END.find((r) => {
    return (
      String(r.CODDV || '').trim() === coddvStr
      && parseInt(r.CD, 10) === cdNum
      && normalizarTipoEndereco(r.TIPO) === tipoNorm
    );
  }) || null;
}

function extrairCodigoSeparacao(endereco) {
  const enderecoOriginal = String(endereco || '').toUpperCase();
  const normalizado = enderecoOriginal.replace(/\s+/g, '');
  const prefixo = enderecoOriginal.slice(0, 4);
  const sufixo = normalizado.slice(-3);
  return {
    prefixo: (prefixo || '----').padEnd(4, ' ').slice(0, 4),
    sufixo: (sufixo || '000').replace(/\D/g, '').slice(-3).padStart(3, '0')
  };
}

function isHojeBrasil(dataIso) {
  if (!dataIso) return false;
  const data = new Date(dataIso);
  if (Number.isNaN(data.getTime())) return false;
  const diaRef = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
  const diaItem = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(data);
  return diaRef === diaItem;
}

async function carregarListaDesktop() {
  if (!sistema?.client) return;
  const cdAtual = obterCdAtual();

  const { data, error } = await sistema.client
    .from('coletas_fraldas')
    .select('id, cd, usuario_nome, usuario_matricula, coddv, barras, validade, lote, tipo, descricao, data_hora_brasilia, print, printed_at')
    .eq('cd', cdAtual)
    .order('data_hora_brasilia', { ascending: false })
    .limit(500);

  if (error) {
    console.error(error);
    showToast(`Erro ao carregar coletas: ${error.message}`, 'error');
    return;
  }

  coletasCache = Array.isArray(data) ? data : [];
  renderListaDesktop();
}

function atualizarAbas() {
  $('#btnTabNaoImpresso')?.classList.toggle('active', abaAtual === 'nao');
  $('#btnTabImpressoHoje')?.classList.toggle('active', abaAtual === 'sim');
}

function filtrarListaAtual() {
  if (abaAtual === 'sim') {
    return coletasCache.filter((item) => String(item.print || 'Nao') === 'Sim' && isHojeBrasil(item.printed_at || item.data_hora_brasilia));
  }
  return coletasCache.filter((item) => String(item.print || 'Nao') !== 'Sim');
}

function renderListaDesktop() {
  const container = $('#coletaListaDesktop');
  if (!container) return;
  const lista = filtrarListaAtual();

  if (!lista.length) {
    container.innerHTML = '<div class="coleta-vazio">Nenhum registro nesta visão.</div>';
    return;
  }

  container.innerHTML = lista.map((item) => {
    const validade = formatarMmaa(item.validade);
    const tipo = String(item.tipo || 'SEPARACAO');
    const lote = item.lote ? ` . Lote: ${item.lote}` : '';
    const horario = formatarDataHoraBR(item.data_hora_brasilia);
    return `
      <article class="coleta-item" data-id="${item.id}">
        <div class="coleta-item-header">
          <h3 class="coleta-item-title">${escapeHtml(item.descricao || '--')}</h3>
          <span class="badge badge-neutral">${String(item.print || 'Nao')}</span>
        </div>
        <div class="coleta-item-meta">
          CODDV: ${escapeHtml(item.coddv || '--')} . Barras: ${escapeHtml(item.barras || '--')}
        </div>
        <div class="coleta-item-meta">
          Destino: ${escapeHtml(tipo)} . Validade: ${escapeHtml(validade)}${escapeHtml(lote)}
        </div>
        <div class="coleta-item-meta">
          ${escapeHtml(horario)} . ${escapeHtml(item.usuario_nome || 'Sistema')}
        </div>
        <div class="coleta-item-actions">
          <button type="button" class="btn btn-primary btn-sm" data-action="print" data-id="${item.id}">Imprimir</button>
        </div>
      </article>
    `;
  }).join('');

  container.querySelectorAll('button[data-action="print"]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      const item = coletasCache.find((r) => String(r.id) === String(id));
      if (item) await imprimirColeta(item);
    });
  });
}

async function imprimirColeta(item) {
  const cdAtual = obterCdAtual();
  const tipo = normalizarTipoEndereco(item.tipo || 'SEPARACAO');
  const coddv = String(item.coddv || '').trim();
  const registroEnd = buscarRegistroBaseEnd(coddv, cdAtual, tipo);
  const endereco = registroEnd?.ENDERECO ? String(registroEnd.ENDERECO).toUpperCase() : '--';
  const codSep = extrairCodigoSeparacao(endereco);

  $('#printDesc').textContent = item.descricao || '--';
  $('#printCoddv').textContent = item.coddv || '--';
  $('#printBarras').textContent = item.barras || '--';
  $('#printSeparacaoCode').textContent = codSep.sufixo;
  $('#printSeparacaoPrefix').textContent = codSep.prefixo;
  $('#printValidade').textContent = formatarMmaa(item.validade);

  const loteEl = $('#printLoteValor');
  if (item.lote) {
    loteEl.textContent = `Lote: ${String(item.lote).toUpperCase()}`;
    loteEl.classList.remove('hide');
  } else {
    loteEl.textContent = '';
    loteEl.classList.add('hide');
  }

  const dataAgora = new Date().toLocaleString('pt-BR');
  $('#printFooterLine').textContent = `${item.usuario_nome || 'Sistema'} . ${item.usuario_matricula || '--'} . ${endereco} . ${dataAgora}`;

  if (String(item.print || 'Nao') !== 'Sim') {
    await marcarComoImpresso(item.id);
  }

  const template = $('#printTemplate');
  template.classList.remove('hide');
  window.print();
  setTimeout(() => template.classList.add('hide'), 500);
}

async function marcarComoImpresso(id) {
  if (!sistema?.client) return;
  const agoraIso = new Date().toISOString();
  const { error } = await sistema.client
    .from('coletas_fraldas')
    .update({ print: 'Sim', printed_at: agoraIso })
    .eq('id', id);

  if (error) {
    console.error(error);
    showToast(`Erro ao marcar impressão: ${error.message}`, 'warning');
    return;
  }

  const idx = coletasCache.findIndex((x) => String(x.id) === String(id));
  if (idx >= 0) {
    coletasCache[idx].print = 'Sim';
    coletasCache[idx].printed_at = agoraIso;
  }
  renderListaDesktop();
}

function dataHoraBrasiliaSql() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).formatToParts(now);

  const get = (type) => parts.find((p) => p.type === type)?.value || '00';
  return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}:${get('second')}`;
}

function formatarDataHoraBR(valor) {
  if (!valor) return '--';
  const dt = new Date(valor);
  if (!Number.isNaN(dt.getTime())) return dt.toLocaleString('pt-BR');
  return String(valor);
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function showToast(message, type = 'info') {
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

  const colors = {
    error: '#ef4444',
    warning: '#f59e0b',
    success: '#10b981',
    info: '#3b82f6'
  };

  const toast = document.createElement('div');
  Object.assign(toast.style, {
    background: colors[type] || colors.info,
    color: '#fff',
    padding: '12px 18px',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    minWidth: '260px',
    fontSize: '14px',
    opacity: '0',
    transform: 'translateY(10px)',
    transition: 'all 0.3s ease'
  });
  toast.textContent = message;
  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
  });

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}
