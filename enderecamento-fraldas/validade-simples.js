/* ===== Página de Relatório de Validades - Versão Simplificada ===== */

const $ = (sel) => document.querySelector(sel);

let produtoAtual = null;
let enderecoSelecionado = null;
let supabaseClient = null;

// Configuração do Supabase
const SUPABASE_URL = 'https://fqxkcgjnlkrqroazzsld.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZxeGtjZ2pubGtycXJvYXp6c2xkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzgyMTQ3OTUsImV4cCI6MjA1Mzc5MDc5NX0.3dNxv0uT9o3_JQdF4rCq1VBbDyxMmfPk-ZEp4K3q0Zo';

// Verificar autenticação e inicializar
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🔄 Página carregada');
  
  const session = localStorage.getItem('enderecamento_fraldas_session');
  if (!session) {
    window.location.href = './login.html';
    return;
  }
  
  // Inicializar Supabase
  try {
    if (window.supabase && window.supabase.createClient) {
      supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      console.log('✅ Supabase inicializado');
      
      // Testar conexão
      const { data, error } = await supabaseClient.from('alocacoes_fraldas').select('count').limit(1);
      if (error) {
        console.error('❌ Erro na conexão:', error);
        showToast('Erro ao conectar com banco de dados', 'error');
      } else {
        console.log('✅ Conexão OK');
      }
    } else {
      console.error('❌ Supabase não disponível');
      showToast('Biblioteca Supabase não carregada', 'error');
    }
  } catch (e) {
    console.error('❌ Erro ao inicializar:', e);
    showToast('Erro: ' + e.message, 'error');
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
  
  if (!supabaseClient) {
    showToast('Banco de dados não conectado. Recarregue a página.', 'error');
    return;
  }
  
  // Mostrar loading
  $('#btnBuscar').disabled = true;
  $('#btnBuscar').innerHTML = '⏳ Buscando...';
  
  try {
    console.log('🔍 Buscando produto:', codigo);
    
    // Buscar na base de dados local
    const produto = buscarNaBase(codigo);
    console.log('📦 Produto na base:', produto);
    
    if (!produto) {
      showToast('Produto não encontrado na base local', 'warning');
      $('#btnBuscar').disabled = false;
      $('#btnBuscar').innerHTML = '🔍 Buscar';
      return;
    }
    
    produtoAtual = produto;
    
    // Buscar validade no Supabase
    console.log('📡 Buscando validade no Supabase...');
    const { data, error } = await supabaseClient
      .from('alocacoes_fraldas')
      .select('*')
      .eq('coddv', produto.CODDV)
      .eq('ativo', true);
    
    if (error) {
      console.error('❌ Erro na consulta:', error);
      showToast('Erro ao buscar no banco: ' + error.message, 'error');
      $('#btnBuscar').disabled = false;
      $('#btnBuscar').innerHTML = '🔍 Buscar';
      return;
    }
    
    console.log('✅ Dados do banco:', data);
    
    const validadeInfo = data && data.length > 0 ? {
      validade: data[0].validade,
      endereco: data[0].endereco,
      id: data[0].id,
      multiplos: data.length > 1,
      todos: data
    } : null;
    
    exibirProduto(produto, validadeInfo);
    
  } catch (e) {
    console.error('❌ Erro:', e);
    showToast('Erro: ' + e.message, 'error');
  } finally {
    $('#btnBuscar').disabled = false;
    $('#btnBuscar').innerHTML = '🔍 Buscar';
  }
}

function buscarNaBase(codigo) {
  if (!window.DB_CADASTRO?.BASE_CADASTRO) {
    console.warn('⚠️ DB_CADASTRO não disponível');
    return null;
  }
  
  const codigoLimpo = codigo.trim();
  return window.DB_CADASTRO.BASE_CADASTRO.find(item => 
    item.CODDV === codigoLimpo || item.BARRAS === codigoLimpo
  );
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
    
    if (validadeInfo.multiplos) {
      mostrarSelecaoEnderecos(validadeInfo.todos);
    }
  } else {
    statusEl.textContent = '⚠ NÃO ALOCADO';
    statusEl.className = 'produto-status status-disponivel';
    validadeEl.innerHTML = '<strong>Validade:</strong> <span style="color: #94a3b8;">Produto não está alocado</span>';
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
         data-endereco="${item.endereco}" data-validade="${item.validade}">
      <div class="endereco-nome">${item.endereco}</div>
      <div class="endereco-validade">Validade: ${formatarValidade(item.validade)}</div>
    </div>
  `).join('');
  
  lista.querySelectorAll('.endereco-item').forEach(el => {
    el.addEventListener('click', () => {
      lista.querySelectorAll('.endereco-item').forEach(e => e.classList.remove('selecionado'));
      el.classList.add('selecionado');
      enderecoSelecionado = el.dataset.endereco;
      $('.produto-validade').innerHTML = `<strong>Validade:</strong> ${formatarValidade(el.dataset.validade)}`;
      $('.produto-endereco').innerHTML = `<strong>Endereço:</strong> ${el.dataset.endereco}`;
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
  
  $('#printDesc').textContent = produtoAtual.DESC;
  $('#printCoddv').textContent = produtoAtual.CODDV;
  $('#printBarras').textContent = produtoAtual.BARRAS;
  $('#printValidade').textContent = enderecoSelecionado ? $('.produto-validade').textContent.replace('Validade:', '').trim() : '--/--';
  $('#printEndereco').textContent = enderecoSelecionado || 'Não alocado';
  $('#printUsuario').textContent = session.usuario || 'Sistema';
  $('#printMatricula').textContent = session.matricula ? `🆔 ${session.matricula}` : '';
  $('#printData').textContent = new Date().toLocaleString('pt-BR');
  $('#printIdBadge').textContent = 'ID: --';
  
  const template = $('#printTemplate');
  template.classList.remove('hide');
  window.print();
  setTimeout(() => template.classList.add('hide'), 100);
}

async function gerarCSV() {
  const inicio = $('#validadeInicio').value;
  const fim = $('#validadeFim').value;
  
  if (inicio.length !== 4 || fim.length !== 4) {
    showToast('Informe período válido (MMAA)', 'warning');
    return;
  }
  
  if (!supabaseClient) {
    showToast('Banco de dados não conectado', 'error');
    return;
  }
  
  $('#btnGerarCSV').disabled = true;
  $('#btnGerarCSV').textContent = '⏳ Gerando...';
  
  try {
    console.log(`📡 Buscando de ${inicio} até ${fim}...`);
    
    const { data, error } = await supabaseClient
      .from('alocacoes_fraldas')
      .select('*')
      .eq('ativo', true)
      .gte('validade', inicio)
      .lte('validade', fim)
      .order('validade');
    
    if (error) {
      console.error('Erro:', error);
      throw error;
    }
    
    console.log('Registros:', data?.length || 0);
    
    if (!data || data.length === 0) {
      showToast('Nenhum produto no período', 'warning');
      return;
    }
    
    const csv = gerarConteudoCSV(data);
    baixarArquivo(csv, `validades_${inicio}_${fim}.csv`);
    showToast(`${data.length} registros exportados`, 'success');
    
  } catch (e) {
    console.error('Erro CSV:', e);
    showToast('Erro: ' + e.message, 'error');
  } finally {
    $('#btnGerarCSV').disabled = false;
    $('#btnGerarCSV').textContent = '📄 CSV';
  }
}

function gerarConteudoCSV(dados) {
  const headers = ['CODDV', 'Descricao', 'Codigo_Barras', 'Validade', 'Endereco', 'CD', 'Usuario', 'Matricula'];
  
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
      item.matricula || ''
    ].map(c => `"${c}"`).join(',');
  });
  
  return [headers.join(','), ...linhas].join('\n');
}

function baixarArquivo(conteudo, nome) {
  const blob = new Blob([conteudo], { type: 'text/csv' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = nome;
  link.click();
}

function showToast(msg, tipo = 'info') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  
  const toast = document.createElement('div');
  toast.className = `toast toast-${tipo}`;
  toast.textContent = msg;
  container.appendChild(toast);
  
  setTimeout(() => toast.classList.add('show'), 100);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}
