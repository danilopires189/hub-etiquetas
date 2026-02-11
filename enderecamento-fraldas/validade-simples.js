/* ===== Página de Relatório de Validades - Versão Corrigida ===== */

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

let produtoAtual = null;
let enderecoSelecionado = null;
let supabaseClient = null;

// Configuração do Supabase
const SUPABASE_URL = 'https://esaomlrwutuwqmztxsat.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzYW9tbHJ3dXR1d3FtenR4c2F0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4MDIxNzQsImV4cCI6MjA4NjM3ODE3NH0.oPutmXC7S2kewHZkjPsceo0pUPx4TSgqKnsfoSt2OVA';

// Verificar autenticação e inicializar
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🔄 Página de Validades carregada');

  const session = localStorage.getItem('enderecamento_fraldas_session');
  if (!session) {
    window.location.href = './login.html';
    return;
  }

  // Aguardar um pouco para garantir que a base local carregue
  await aguardarBaseLocal();

  // Inicializar Supabase
  await inicializarSupabase();

  configurarEventos();
});

/**
 * Aguarda a base de dados local carregar
 */
async function aguardarBaseLocal() {
  let tentativas = 0;
  const maxTentativas = 20;

  while (!window.DB_CADASTRO?.BASE_CADASTRO && tentativas < maxTentativas) {
    await new Promise(resolve => setTimeout(resolve, 250));
    tentativas++;
  }

  if (window.DB_CADASTRO?.BASE_CADASTRO) {
    console.log('✅ Base local carregada:', window.DB_CADASTRO.BASE_CADASTRO.length, 'produtos');
  } else {
    console.warn('⚠️ Base local não carregou após', maxTentativas, 'tentativas');
    showToast('Aviso: Base de produtos não carregada', 'warning');
  }
}

/**
 * Inicializa conexão com Supabase
 */
async function inicializarSupabase() {
  try {
    if (window.supabase && window.supabase.createClient) {
      supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      console.log('✅ Supabase inicializado');

      // Testar conexão
      const { data, error } = await supabaseClient.from('alocacoes_fraldas').select('count').limit(1);
      if (error) {
        console.error('❌ Erro na conexão Supabase:', error);
        showToast('Erro ao conectar com banco de dados', 'error');
      } else {
        console.log('✅ Conexão Supabase OK');
      }
    } else {
      console.error('❌ Supabase não disponível');
      showToast('Biblioteca Supabase não carregada', 'error');
    }
  } catch (e) {
    console.error('❌ Erro ao inicializar Supabase:', e);
    showToast('Erro: ' + e.message, 'error');
  }
}

/**
 * Configura eventos dos elementos da página
 */
function configurarEventos() {
  $('#btnBuscar').addEventListener('click', buscarProduto);
  $('#btnLimpar').addEventListener('click', limparCampos);
  $('#btnClearInput').addEventListener('click', limparCampos);
  $('#btnImprimir').addEventListener('click', imprimirEtiqueta);
  $('#btnGerarCSV').addEventListener('click', gerarCSV);

  $('#codigoProduto').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') buscarProduto();
  });

  // Auto-focus no campo de busca
  $('#codigoProduto').focus();

  // Máscara para datas MMAA
  $('#validadeInicio').addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/\D/g, '').substring(0, 4);
    formatarCampoValidade(e.target);
  });
  $('#validadeFim').addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/\D/g, '').substring(0, 4);
    formatarCampoValidade(e.target);
  });
}

/**
 * Formata campo de validade com feedback visual
 */
function formatarCampoValidade(input) {
  const valor = input.value;
  if (valor.length === 4) {
    const mes = parseInt(valor.substring(0, 2));
    if (mes >= 1 && mes <= 12) {
      input.style.borderColor = '#10b981';
    } else {
      input.style.borderColor = '#ef4444';
    }
  } else {
    input.style.borderColor = '';
  }
}

/**
 * Busca produto por CODDV ou código de barras
 */
async function buscarProduto() {
  const codigo = $('#codigoProduto').value.trim();
  if (!codigo) {
    showToast('Informe um código para buscar', 'warning');
    return;
  }

  if (!supabaseClient) {
    showToast('Banco de dados não conectado. Recarregue a página.', 'error');
    return;
  }

  // Mostrar loading
  $('#btnBuscar').disabled = true;
  $('#btnBuscar').innerHTML = `
    <svg class="spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
    </svg>
    Buscando...
  `;

  try {
    console.log('🔍 Buscando produto:', codigo);

    // 1. Primeiro buscar na base local (CODDV ou BARRAS)
    let produto = buscarNaBaseLocal(codigo);

    if (produto) {
      console.log('📦 Produto encontrado na base local:', produto.CODDV, '-', produto.DESC);
      produtoAtual = produto;

      // 2. Buscar validade e endereço no Supabase
      const validadeInfo = await buscarValidadeNoSupabase(produto.CODDV);
      exibirProduto(produto, validadeInfo);

    } else {
      // 3. Tentar buscar como endereço no Supabase
      console.log('📍 Produto não encontrado na base local, tentando como endereço...');
      const produtosNoEndereco = await buscarPorEndereco(codigo);

      if (produtosNoEndereco && produtosNoEndereco.length > 0) {
        mostrarListaProdutosNoEndereco(produtosNoEndereco, codigo);
      } else {
        showToast('Produto ou endereço não encontrado', 'warning');
        limparResultado();
      }
    }

  } catch (e) {
    console.error('❌ Erro na busca:', e);
    showToast('Erro: ' + e.message, 'error');
  } finally {
    $('#btnBuscar').disabled = false;
    $('#btnBuscar').innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="8"/>
        <path d="m21 21-4.35-4.35"/>
      </svg>
      Buscar
    `;
  }
}

/**
 * Busca produto na base de dados local
 */
function buscarNaBaseLocal(codigo) {
  if (!window.DB_CADASTRO?.BASE_CADASTRO) {
    console.warn('⚠️ DB_CADASTRO não disponível');
    return null;
  }

  const codigoLimpo = codigo.trim().toUpperCase();
  const codigoNumerico = codigo.trim();

  // Buscar por CODDV ou BARRAS
  const resultado = window.DB_CADASTRO.BASE_CADASTRO.find(item =>
    item.CODDV === codigoNumerico ||
    item.CODDV === codigoLimpo ||
    item.BARRAS === codigoNumerico ||
    item.BARRAS === codigoLimpo
  );

  return resultado || null;
}

/**
 * Busca validade e endereço no Supabase
 */
async function buscarValidadeNoSupabase(coddv) {
  try {
    console.log('📡 Buscando validade no Supabase para CODDV:', coddv);

    const { data, error } = await supabaseClient
      .from('alocacoes_fraldas')
      .select('id, validade, endereco, usuario, matricula, data_alocacao, cd')
      .eq('coddv', coddv)
      .eq('ativo', true)
      .order('data_alocacao', { ascending: false });

    if (error) {
      console.error('❌ Erro na consulta Supabase:', error);
      throw error;
    }

    console.log('✅ Dados do Supabase:', data);

    if (data && data.length > 0) {
      return {
        validade: data[0].validade,
        endereco: data[0].endereco,
        id: data[0].id,
        usuario: data[0].usuario,
        matricula: data[0].matricula,
        dataAlocacao: data[0].data_alocacao,
        cd: data[0].cd,
        multiplos: data.length > 1,
        todos: data
      };
    }

    return null;
  } catch (e) {
    console.error('❌ Erro ao buscar validade:', e);
    showToast('Erro ao buscar no banco: ' + e.message, 'error');
    return null;
  }
}

/**
 * Busca produtos alocados em um endereço
 */
async function buscarPorEndereco(endereco) {
  try {
    const enderecoFormatado = endereco.toUpperCase().trim();
    console.log('📍 Buscando produtos no endereço:', enderecoFormatado);

    const { data, error } = await supabaseClient
      .from('alocacoes_fraldas')
      .select('*')
      .eq('endereco', enderecoFormatado)
      .eq('ativo', true)
      .order('data_alocacao', { ascending: false });

    if (error) {
      console.error('❌ Erro ao buscar por endereço:', error);
      throw error;
    }

    console.log('✅ Produtos encontrados no endereço:', data?.length || 0);
    return data || [];
  } catch (e) {
    console.error('❌ Erro:', e);
    return [];
  }
}

/**
 * Exibe informações do produto encontrado
 */
function exibirProduto(produto, validadeInfo) {
  $('#produtoInfo').classList.remove('hide');
  $('#listaEnderecosContainer').classList.add('hide');

  $('.produto-coddv').textContent = `CODDV: ${produto.CODDV}`;
  $('.produto-desc').textContent = produto.DESC;
  $('.produto-barras').textContent = `Código de Barras: ${produto.BARRAS}`;

  const statusEl = $('.produto-status');
  const validadeEl = $('.produto-validade');
  const enderecoEl = $('.produto-endereco');

  if (validadeInfo) {
    statusEl.textContent = '✓ ALOCADO';
    statusEl.className = 'produto-status status-alocado';

    const valFormatada = formatarValidade(validadeInfo.validade);
    const statusValidade = obterStatusValidade(validadeInfo.validade);

    validadeEl.innerHTML = `
      <div class="validade-info ${statusValidade}">
        <strong>📅 Validade:</strong>
        <span class="validade-valor">${valFormatada}</span>
        ${getStatusIcon(statusValidade)}
      </div>
    `;
    validadeEl.style.display = 'block';

    enderecoEl.innerHTML = `<strong>📍 Endereço:</strong> ${validadeInfo.endereco}`;
    enderecoSelecionado = validadeInfo.endereco;

    // Mostrar info adicional se disponível
    if (validadeInfo.usuario) {
      enderecoEl.innerHTML += `<br><small>👤 Alocado por: ${validadeInfo.usuario}</small>`;
    }
    if (validadeInfo.dataAlocacao) {
      const dataFormatada = new Date(validadeInfo.dataAlocacao).toLocaleString('pt-BR');
      enderecoEl.innerHTML += `<br><small>📆 Data: ${dataFormatada}</small>`;
    }

    // Se múltiplos endereços, mostrar seleção
    if (validadeInfo.multiplos) {
      mostrarSelecaoEnderecos(validadeInfo.todos);
    }
  } else {
    statusEl.textContent = '⚠ NÃO ALOCADO';
    statusEl.className = 'produto-status status-disponivel';
    validadeEl.innerHTML = `
      <div class="validade-info nao-informada">
        <strong>📅 Validade:</strong>
        <span class="validade-valor">Produto não está alocado</span>
      </div>
    `;
    validadeEl.style.display = 'block';
    enderecoEl.innerHTML = '<strong>📍 Endereço:</strong> <span style="color: #94a3b8;">Não alocado</span>';
    enderecoSelecionado = null;
  }
}

/**
 * Mostra lista de produtos em um endereço
 */
function mostrarListaProdutosNoEndereco(produtos, endereco) {
  $('#listaEnderecosContainer').classList.remove('hide');
  $('#produtoInfo').classList.add('hide');

  const lista = $('#listaEnderecos');

  lista.innerHTML = `
    <div class="endereco-titulo">📍 Produtos em <strong>${endereco.toUpperCase()}</strong></div>
    ${produtos.map(item => {
    const produtoLocal = buscarNaBaseLocal(item.coddv);
    const descricao = produtoLocal ? produtoLocal.DESC : (item.descricao_produto || 'Descrição não disponível');
    const statusValidade = obterStatusValidade(item.validade);

    return `
        <div class="endereco-item" data-coddv="${item.coddv}">
          <div class="endereco-produto">
            <strong>${item.coddv}</strong>
            <span class="produto-descricao-resumida">${descricao.substring(0, 40)}${descricao.length > 40 ? '...' : ''}</span>
          </div>
          <div class="endereco-validade ${statusValidade}">
            📅 Validade: ${formatarValidade(item.validade)} ${getStatusIcon(statusValidade)}
          </div>
        </div>
      `;
  }).join('')}
  `;

  // Adicionar eventos de clique
  lista.querySelectorAll('.endereco-item').forEach(el => {
    el.addEventListener('click', async () => {
      const coddv = el.dataset.coddv;
      $('#codigoProduto').value = coddv;
      await buscarProduto();
    });
  });
}

/**
 * Mostra seleção de endereços quando produto está em múltiplos locais
 */
function mostrarSelecaoEnderecos(enderecos) {
  $('#listaEnderecosContainer').classList.remove('hide');
  const lista = $('#listaEnderecos');

  lista.innerHTML = `
    <div class="endereco-titulo">📦 Produto em múltiplos endereços</div>
    ${enderecos.map((item, idx) => {
    const statusValidade = obterStatusValidade(item.validade);
    return `
        <div class="endereco-item ${idx === 0 ? 'selecionado' : ''}" 
             data-endereco="${item.endereco}" 
             data-validade="${item.validade}"
             data-id="${item.id}">
          <div class="endereco-nome">${item.endereco}</div>
          <div class="endereco-validade ${statusValidade}">
            📅 Validade: ${formatarValidade(item.validade)} ${getStatusIcon(statusValidade)}
          </div>
        </div>
      `;
  }).join('')}
  `;

  // Eventos de seleção
  lista.querySelectorAll('.endereco-item').forEach(el => {
    el.addEventListener('click', () => {
      lista.querySelectorAll('.endereco-item').forEach(e => e.classList.remove('selecionado'));
      el.classList.add('selecionado');
      enderecoSelecionado = el.dataset.endereco;

      const validade = el.dataset.validade;
      const statusValidade = obterStatusValidade(validade);

      $('.produto-validade').innerHTML = `
        <div class="validade-info ${statusValidade}">
          <strong>📅 Validade:</strong>
          <span class="validade-valor">${formatarValidade(validade)}</span>
          ${getStatusIcon(statusValidade)}
        </div>
      `;
      $('.produto-endereco').innerHTML = `<strong>📍 Endereço:</strong> ${el.dataset.endereco}`;
    });
  });
}

/**
 * Formata validade de MMAA para MM/AA
 */
function formatarValidade(validade) {
  if (!validade) return '--/--';
  if (validade.length !== 4) return validade;
  return `${validade.substring(0, 2)}/${validade.substring(2)}`;
}

/**
 * Obtém status visual da validade
 */
function obterStatusValidade(validade) {
  if (!validade || validade.length !== 4) return 'nao-informada';

  const mes = parseInt(validade.substring(0, 2));
  const ano = parseInt('20' + validade.substring(2));

  if (isNaN(mes) || isNaN(ano)) return 'nao-informada';

  const dataValidade = new Date(ano, mes - 1, 28); // Último dia do mês aproximado
  const hoje = new Date();
  const umMesAFrente = new Date();
  umMesAFrente.setMonth(umMesAFrente.getMonth() + 1);

  if (dataValidade < hoje) {
    return 'vencida';
  } else if (dataValidade <= umMesAFrente) {
    return 'proxima-vencimento';
  }
  return 'valida';
}

/**
 * Retorna ícone de status
 */
function getStatusIcon(status) {
  switch (status) {
    case 'valida': return '<span class="status-icon valida">✅</span>';
    case 'proxima-vencimento': return '<span class="status-icon proxima">⚠️</span>';
    case 'vencida': return '<span class="status-icon vencida">❌</span>';
    default: return '<span class="status-icon desconhecida">❓</span>';
  }
}

/**
 * Limpa campos e resultados
 */
function limparCampos() {
  $('#codigoProduto').value = '';
  limparResultado();
  $('#codigoProduto').focus();
}

function limparResultado() {
  $('#produtoInfo').classList.add('hide');
  $('#listaEnderecosContainer').classList.add('hide');
  produtoAtual = null;
  enderecoSelecionado = null;
}

/**
 * Imprime etiqueta A4
 */
async function imprimirEtiqueta() {
  if (!produtoAtual) {
    showToast('Nenhum produto selecionado', 'warning');
    return;
  }

  const session = JSON.parse(localStorage.getItem('enderecamento_fraldas_session') || '{}');
  const validadeInfo = await buscarValidadeNoSupabase(produtoAtual.CODDV);

  $('#printDesc').textContent = produtoAtual.DESC;
  $('#printCoddv').textContent = produtoAtual.CODDV;
  $('#printBarras').textContent = produtoAtual.BARRAS;
  $('#printValidade').textContent = validadeInfo ? formatarValidade(validadeInfo.validade) : '--/--';
  $('#printEndereco').textContent = enderecoSelecionado || 'Não alocado';
  $('#printUsuario').textContent = session.usuario || 'Sistema';
  $('#printMatricula').textContent = session.matricula ? `🆔 ${session.matricula}` : '';
  $('#printData').textContent = new Date().toLocaleString('pt-BR');
  $('#printIdBadge').textContent = validadeInfo?.id ? `ID: ${String(validadeInfo.id).substring(0, 8)}` : 'ID: --';

  const template = $('#printTemplate');
  template.classList.remove('hide');

  // Pequeno delay para renderizar antes de imprimir
  setTimeout(() => {
    window.print();
    setTimeout(() => template.classList.add('hide'), 500);
  }, 100);
}

/**
 * Gera CSV de produtos por período de validade
 */
async function gerarCSV() {
  const inicio = $('#validadeInicio').value;
  const fim = $('#validadeFim').value;

  // Validação
  if (inicio.length !== 4 || fim.length !== 4) {
    showToast('Informe período válido (MMAA)', 'warning');
    return;
  }

  const mesInicio = parseInt(inicio.substring(0, 2));
  const mesFim = parseInt(fim.substring(0, 2));

  if (mesInicio < 1 || mesInicio > 12 || mesFim < 1 || mesFim > 12) {
    showToast('Mês inválido. Use formato MMAA (ex: 0126 para Janeiro/2026)', 'warning');
    return;
  }

  if (!supabaseClient) {
    showToast('Banco de dados não conectado', 'error');
    return;
  }

  $('#btnGerarCSV').disabled = true;
  $('#btnGerarCSV').innerHTML = `
    <svg class="spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
    </svg>
    Gerando...
  `;

  try {
    console.log(`📡 Buscando validades de ${inicio} até ${fim}...`);

    const { data, error } = await supabaseClient
      .from('alocacoes_fraldas')
      .select('*')
      .eq('ativo', true)
      .gte('validade', inicio)
      .lte('validade', fim)
      .order('validade', { ascending: true });

    if (error) {
      console.error('❌ Erro na consulta:', error);
      throw error;
    }

    console.log('✅ Registros encontrados:', data?.length || 0);

    if (!data || data.length === 0) {
      showToast('Nenhum produto encontrado no período informado', 'warning');
      return;
    }

    const csv = gerarConteudoCSV(data);
    baixarArquivo(csv, `validades_${inicio}_ate_${fim}.csv`);
    showToast(`${data.length} registro(s) exportado(s) com sucesso!`, 'success');

  } catch (e) {
    console.error('❌ Erro ao gerar CSV:', e);
    showToast('Erro: ' + e.message, 'error');
  } finally {
    $('#btnGerarCSV').disabled = false;
    $('#btnGerarCSV').innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14,2 14,8 20,8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
        <polyline points="10,9 9,9 8,9"/>
      </svg>
      Exportar CSV
    `;
  }
}

/**
 * Gera conteúdo do CSV
 */
function gerarConteudoCSV(dados) {
  const headers = ['CODDV', 'Descricao', 'Codigo_Barras', 'Validade_MMAA', 'Validade_Formatada', 'Endereco', 'CD', 'Usuario', 'Matricula', 'Data_Alocacao', 'Status_Validade'];

  const linhas = dados.map(item => {
    const produto = buscarNaBaseLocal(item.coddv);
    const statusValidade = obterStatusValidade(item.validade);
    const statusTexto = statusValidade === 'valida' ? 'OK' :
      statusValidade === 'proxima-vencimento' ? 'PROXIMO VENCIMENTO' :
        statusValidade === 'vencida' ? 'VENCIDO' : 'NAO INFORMADO';

    return [
      item.coddv,
      produto ? produto.DESC.replace(/"/g, '""') : 'N/A',
      produto ? produto.BARRAS : 'N/A',
      item.validade || '',
      formatarValidade(item.validade),
      item.endereco,
      item.cd || 'N/A',
      item.usuario || 'Sistema',
      item.matricula || '',
      item.data_alocacao ? new Date(item.data_alocacao).toLocaleDateString('pt-BR') : '',
      statusTexto
    ].map(c => `"${c}"`).join(',');
  });

  return [headers.join(','), ...linhas].join('\n');
}

/**
 * Baixa arquivo
 */
function baixarArquivo(conteudo, nome) {
  const BOM = '\uFEFF'; // UTF-8 BOM para Excel
  const blob = new Blob([BOM + conteudo], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = nome;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Exibe toast de notificação
 */
function showToast(msg, tipo = 'info') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${tipo}`;

  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  };

  toast.innerHTML = `
    <span class="toast-icon">${icons[tipo] || icons.info}</span>
    <span class="toast-message">${msg}</span>
  `;

  container.appendChild(toast);

  // Animação de entrada
  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  // Remover após 3s
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Adicionar estilos de animação
const style = document.createElement('style');
style.textContent = `
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  .spin {
    animation: spin 1s linear infinite;
  }
  
  .validade-info {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 15px;
    border-radius: 10px;
    font-weight: 500;
  }
  
  .validade-info.valida {
    background: linear-gradient(135deg, #f0fdf4, #dcfce7);
    border: 2px solid #86efac;
    color: #166534;
  }
  
  .validade-info.proxima-vencimento {
    background: linear-gradient(135deg, #fefce8, #fef9c3);
    border: 2px solid #fde047;
    color: #854d0e;
  }
  
  .validade-info.vencida {
    background: linear-gradient(135deg, #fef2f2, #fee2e2);
    border: 2px solid #fca5a5;
    color: #991b1b;
  }
  
  .validade-info.nao-informada {
    background: linear-gradient(135deg, #f8fafc, #f1f5f9);
    border: 2px solid #e2e8f0;
    color: #64748b;
  }
  
  .validade-valor {
    font-size: 1.2rem;
    font-weight: 700;
    font-family: 'Courier New', monospace;
    letter-spacing: 1px;
  }
  
  .status-icon {
    font-size: 1.1rem;
  }
  
  .endereco-validade.valida { color: #166534; }
  .endereco-validade.proxima-vencimento { color: #854d0e; }
  .endereco-validade.vencida { color: #991b1b; }
  .endereco-validade.nao-informada { color: #64748b; }
  
  .produto-descricao-resumida {
    display: block;
    font-size: 0.85rem;
    color: #64748b;
    margin-top: 2px;
  }
  
  .toast-icon {
    font-size: 1.2rem;
    flex-shrink: 0;
  }
  
  .toast-message {
    flex: 1;
  }
`;
document.head.appendChild(style);

// Função de diagnóstico (pode ser chamada no console)
window.diagnosticarConexao = function () {
  console.log('=== DIAGNÓSTICO DE CONEXÃO ===');
  console.log('BASE_CADASTRO:', window.DB_CADASTRO?.BASE_CADASTRO ? `✅ ${window.DB_CADASTRO.BASE_CADASTRO.length} produtos` : '❌ Não carregada');
  console.log('supabaseClient:', supabaseClient ? '✅ Conectado' : '❌ Não conectado');
  console.log('==============================');

  return {
    baseProdutos: !!window.DB_CADASTRO?.BASE_CADASTRO,
    quantidadeProdutos: window.DB_CADASTRO?.BASE_CADASTRO?.length || 0,
    supabase: !!supabaseClient
  };
};
