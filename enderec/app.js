/* ===== Util ===== */
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));
const padLeft = (numStr, len) => (Array(len + 1).join('0') + numStr).slice(-len);
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const sanitizeUpper = (s) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '');

/**
 * Aguardar supabaseManager estar disponível (carregado como ES module)
 * @param {number} timeoutMs - Tempo máximo de espera (default: 5000ms)
 * @returns {Promise<object|null>}
 */
async function waitForSupabaseManager(timeoutMs = 5000) {
  const startTime = Date.now();

  while (!window.supabaseManager && Date.now() - startTime < timeoutMs) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  if (window.supabaseManager) {
    console.log('✅ supabaseManager detectado e disponível (enderec)');
    return window.supabaseManager;
  } else {
    console.warn('⚠️ supabaseManager não carregou a tempo (enderec)');
    return null;
  }
}

const sanitizeComplement = (input) => {
  // Remove apenas caracteres de controle e normaliza acentos
  // Preserva: letras, números, espaços, pontos, hífens, underscores
  // Converte para caixa alta para manter consistência
  return (input || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .toUpperCase() // Converte para caixa alta
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove caracteres de controle
    .trim(); // Remove espaços extras no início/fim
};

/* ===== Layout vars ===== */
function setVars() {
  const logoPct = clamp(parseInt($('#logoop').value || '60', 10), 0, 100);
  $('#logoop').value = logoPct;

  document.documentElement.style.setProperty('--label-w-mm', $('#wmm').value);
  document.documentElement.style.setProperty('--label-h-mm', $('#hmm').value);
  document.documentElement.style.setProperty('--font-pt', $('#tpt').value);
  document.documentElement.style.setProperty('--logo-mm', $('#logomm').value);
  document.documentElement.style.setProperty('--logo-opacity', (logoPct / 100).toFixed(2));
  document.body.classList.toggle('print-no-logo', $('#logoPrintOff').checked);
}

/* ===== Code128 (via JsBarcode) ===== */
function renderCode128(svg, payload) {
  JsBarcode(svg, payload, { format: "CODE128", displayValue: false, margin: 0, height: 100, width: 1 });
  svg.classList.add('barcode');
}

/* ===== QR Code (via qrcode-generator) ===== */
function renderQR(container, payload) {
  container.innerHTML = '';
  if (window.qrcode) {
    const qr = window.qrcode(0, 'M'); // Auto-versão, correção média
    qr.addData(payload);
    qr.make();
    const svgTag = qr.createSvgTag({ cellSize: 4, margin: 0 });
    container.innerHTML = svgTag;
    // Ajustar o SVG gerado para preencher o container
    const svgElement = container.querySelector('svg');
    if (svgElement) {
      svgElement.style.width = '100%';
      svgElement.style.height = '100%';
      svgElement.classList.add('qrcode');
    }
  } else {
    // Fallback: usar API externa
    const img = document.createElement('img');
    img.alt = 'QR Code';
    const encoded = encodeURIComponent(payload);
    img.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encoded}`;
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'contain';
    container.appendChild(img);
  }
}

/* ===== Prefix range helpers ===== */
function parseAlphaNum(str) {
  const m = sanitizeUpper(str).match(/^([A-Z]*)(\d+)?$/);
  if (!m) return null;
  return { alpha: m[1], num: m[2] ? parseInt(m[2], 10) : null, width: m[2] ? m[2].length : 0 };
}

function makePrefixList(startStr, endStr) {
  const a = parseAlphaNum(startStr);
  if (!a) throw new Error('Prefixo inicial inválido.');

  const list = [];
  if (!endStr || !endStr.trim()) {
    list.push(a.alpha + (a.num !== null ? String(a.num).padStart(a.width, '0') : ''));
    return list;
  }

  const b = parseAlphaNum(endStr);
  if (!b) throw new Error('Prefixo final inválido.');

  if (a.alpha !== b.alpha || a.num === null || b.num === null) {
    // letras diferentes ou sem parte numérica: gera apenas o inicial
    list.push(a.alpha + (a.num !== null ? String(a.num).padStart(a.width, '0') : ''));
    return list;
  }

  const width = Math.max(a.width, b.width);
  if (b.num < a.num) throw new Error('Prefixo final deve ser maior ou igual ao inicial.');
  for (let n = a.num; n <= b.num; n++) {
    list.push(a.alpha + String(n).padStart(width, '0'));
  }
  return list;
}

/* ===== UI Label ===== */
function buildLabel({ codigo, orient, showLogo, tipoCodigo }) {
  const label = document.createElement('div');
  label.className = `label ${orient}`;

  // Adiciona classe específica para QR Code (layout diferente)
  if (tipoCodigo === 'qrcode') {
    label.classList.add('qr-layout');
  }

  const barArea = document.createElement('div');
  barArea.className = 'bar-area';

  if (tipoCodigo === 'qrcode') {
    // Layout para QR Code
    const qrwrap = document.createElement('div');
    qrwrap.className = 'qrwrap';
    barArea.appendChild(qrwrap);

    // Renderiza QR Code
    renderQR(qrwrap, codigo);
  } else {
    // Layout para Código de Barras (padrão)
    const svgwrap = document.createElement('div');
    svgwrap.className = 'svgwrap';
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svgwrap.appendChild(svg);
    barArea.appendChild(svgwrap);

    // Renderiza código de barras
    renderCode128(svg, codigo);
  }

  const under = document.createElement('div');
  under.className = 'under';

  const legend = document.createElement('div');
  legend.className = 'legend';
  legend.textContent = codigo;
  under.appendChild(legend);

  if (showLogo) {
    const imgPM = document.createElement('img');
    imgPM.src = '../assets/pm.png';
    imgPM.alt = 'Pague Menos';
    imgPM.className = 'logo';
    under.appendChild(imgPM);
  }

  label.appendChild(barArea);
  label.appendChild(under);

  return label;
}

/* ===== Lógica PULMÃO =====
   Formato: [PREFIXO].001.COLUNA.NIVEL (com níveis)
   Formato: [PREFIXO].001.COLUNA (sem níveis)
   - NÍVEL: se "T" vira "A0T"; demais "A01..A10".
*/
function montarCodigosPulmao() {
  const prefixIni = $('#prefixIni').value;
  const prefixFim = $('#prefixFim').value;

  const colIni = parseInt($('#colIni').value || '1', 10);
  const colFim = parseInt($('#colFim').value || '1', 10);
  if (!(colIni >= 1 && colIni <= 999 && colFim >= 1 && colFim <= 999 && colFim >= colIni)) {
    throw new Error('Intervalo de colunas inválido (1..999) e colFim ≥ colIni.');
  }

  const allBtn = $('#nivAll');
  const marcados = $$('.nivel').filter(n => n.checked).map(n => n.value);
  let niveis = marcados;
  // Se botão "Todos" estiver marcado, seleciona todos os níveis
  if (allBtn && allBtn.checked) {
    niveis = ['T', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
  }

  const prefixes = makePrefixList(prefixIni, prefixFim);
  const lista = [];

  for (const pfx of prefixes) {
    for (let c = colIni; c <= colFim; c++) {
      const colStr = String(c).padStart(3, '0');

      // Se nenhum nível selecionado, gera código sem nível
      if (niveis.length === 0) {
        const codigo = `${pfx}.001.${colStr}`;
        lista.push(codigo);
      } else {
        // Comportamento atual: gera código com níveis
        for (const nv of niveis) {
          const nivelStr = (nv === 'T') ? 'A0T' : ('A' + String(nv).padStart(2, '0'));
          const codigo = `${pfx}.001.${colStr}.${nivelStr}`;
          lista.push(codigo);
        }
      }
    }
  }
  return lista;
}

/* ===== Lógica ESTAÇÃO =====
   Formato: [PREFIXO][.COMPLEMENTO opcional]
   (Somente prefixos e complemento; sem 001/colunas/níveis)
*/
function montarCodigosEstacao() {
  const prefixIni = $('#prefixIniE').value;
  const prefixFim = $('#prefixFimE').value;
  const livre = sanitizeComplement($('#livreE').value);
  const prefixes = makePrefixList(prefixIni, prefixFim);
  return prefixes.map(pfx => livre ? `${pfx}.${livre}` : pfx);
}

/* ===== Lógica OUTRO =====
   Formato: [ESTACAO][SEP][BLOCO1][SEP][BLOCO2][SEP][BLOCO3]
   - Suporta faixas (Início/Fim) para cada parte.
   - Gera produto cartesiano das faixas não vazias.
*/
function montarCodigosOutro() {
  const getRange = (idIni, idFim) => {
    const ini = $(idIni).value;
    const fim = $(idFim).value;
    if (!ini) return null; // Se não tem início, ignora este bloco
    return makePrefixList(ini, fim);
  };

  // Coletar faixas: Estação, B1, B2, B3
  const ranges = [
    getRange('#prefixIniO', '#prefixFimO'),
    getRange('#b1Ini', '#b1Fim'),
    getRange('#b2Ini', '#b2Fim'),
    getRange('#b3Ini', '#b3Fim')
  ].filter(r => r !== null);

  if (ranges.length === 0) return [];

  // Produto Cartesiano: combina todas as faixas
  // Ex: [['A1','A2'], ['1','2']] -> [['A1','1'], ['A1','2'], ['A2','1'], ['A2','2']]
  const combos = ranges.reduce((a, b) => a.flatMap(d => b.map(e => [d, e].flat())), [[]]);

  // Separador
  let sep = $('#separador').value;
  // Se vazio, usa ponto (conforme solicitado "padrão deve ser .")
  if (sep === '') sep = '.';

  return combos.map(c => c.join(sep));
}

function clearTextFields(container) {
  document.querySelectorAll(container + ' input[type="text"]').forEach(i => i.value = '');
}

function gerar() {
  try {
    setVars();

    const tipo = ($('input[name="tipo"]:checked') || {}).value;
    if (!tipo) { alert('Escolha o tipo de etiqueta (Pulmão ou Estação).'); return false; }

    const copias = parseInt($('#copias').value || '1', 10);
    const orient = $('#orient').value;
    const showLogo = $('#logo').checked;

    // Captura o tipo de código escolhido (barras ou qrcode)
    const tipoCodigo = ($('input[name="tipocodigo"]:checked') || {}).value || 'barras';

    const out = $('#preview');
    out.innerHTML = '';

    const codigos = (tipo === 'pulmao') ? montarCodigosPulmao() :
      (tipo === 'estacao') ? montarCodigosEstacao() :
        montarCodigosOutro();
    codigos.forEach(cod => {
      for (let i = 0; i < copias; i++) {
        const el = buildLabel({ codigo: cod, orient, showLogo, tipoCodigo });
        out.appendChild(el);
      }
    });

    if (codigos.length === 0) {
      alert('Nada para gerar. Confira os campos.');
      return false;
    }

    return true; // Retorna true em caso de sucesso
  } catch (e) {
    alert('Erro: ' + e.message);
    return false; // Retorna false em caso de erro
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // tipo -> mostra campos corretos e limpa a anterior
  $$('.type-card input[type="radio"]').forEach(r => {
    r.addEventListener('change', () => {
      const val = ($('input[name="tipo"]:checked') || {}).value;
      $('#pulmaoFields').classList.toggle('hide', val !== 'pulmao');
      $('#estacaoFields').classList.toggle('hide', val !== 'estacao');
      $('#outroFields').classList.toggle('hide', val !== 'outro');
      $('#gerar').disabled = !val;

      // limpa preview e limpa os campos de texto do modo anterior
      $('#preview').innerHTML = '';
      if (val === 'pulmao') { clearTextFields('#estacaoFields'); clearTextFields('#outroFields'); }
      if (val === 'estacao') { clearTextFields('#pulmaoFields'); clearTextFields('#outroFields'); }
      if (val === 'outro') { clearTextFields('#pulmaoFields'); clearTextFields('#estacaoFields'); }
    });
  });

  // "Todos" marca/desmarca os níveis
  const nivAll = $('#nivAll');
  nivAll && nivAll.addEventListener('change', (ev) => {
    const allOn = ev.target.checked;
    $$('.nivel').forEach(cb => cb.checked = allOn);
  });

  $('#gerar').addEventListener('click', async () => {
    const success = gerar();

    // Registrar geração no Supabase e mostrar popup após gerar etiquetas com sucesso
    if (success) {
      console.log('📡 Aguardando SupabaseManager (enderec)...');
      const manager = await waitForSupabaseManager(3000);

      const tipo = ($('input[name="tipo"]:checked') || {}).value;
      const copias = parseInt($('#copias').value || '1', 10);
      const tipoCodigo = ($('input[name="tipocodigo"]:checked') || {}).value || 'barras';

      // Obter os códigos gerados para calcular total
      const codigos = (tipo === 'pulmao') ? montarCodigosPulmao() :
        (tipo === 'estacao') ? montarCodigosEstacao() :
          montarCodigosOutro();

      const totalEtiquetas = codigos.length * copias;

      // Incrementar contador global e mostrar popup
      if (window.contadorGlobal) {
        try {
          const novoValor = await window.contadorGlobal.incrementarContador(totalEtiquetas, 'enderec');
          console.log(`✅ Contador incrementado: +${totalEtiquetas} enderec = ${novoValor}`);

          // Mostrar popup de sucesso
          if (typeof mostrarPopupSucesso === 'function') {
            mostrarPopupSucesso('Etiquetas geradas com sucesso!', `+${totalEtiquetas} etiquetas | Total: ${novoValor.toLocaleString('pt-BR')}`);
          }
        } catch (error) {
          console.error('❌ Erro ao incrementar contador:', error);
        }
      }

      // Salvar no Supabase
      if (manager) {
        try {
          console.log('🔄 Iniciando salvamento no Supabase...');
          
          // Data e hora atual
          const now = new Date();
          const dd = padLeft(String(now.getDate()), 2);
          const mm = padLeft(String(now.getMonth() + 1), 2);
          const yyyy = now.getFullYear();
          const hh = padLeft(String(now.getHours()), 2);
          const mi = padLeft(String(now.getMinutes()), 2);
          const ss = padLeft(String(now.getSeconds()), 2);
          const dataHora = `${dd}/${mm}/${yyyy} ${hh}:${mi}:${ss}`;

          console.log(`📊 Dados para salvar:`, {
            tipo,
            tipoCodigo,
            totalCodigos: codigos.length,
            copias,
            dataHora
          });

          // Salvar cada código único gerado no banco
          for (let i = 0; i < codigos.length; i++) {
            const codigo = codigos[i];
            const enderecData = {
              tipo: tipo,
              modelo: tipoCodigo,
              id_etiqueta: codigo,
              num_copia: copias,
              data_hora: dataHora
            };

            console.log(`📝 Salvando etiqueta ${i + 1}/${codigos.length}:`, enderecData);

            try {
              const result = await manager.saveEnderecLabel(enderecData);
              console.log(`✅ Etiqueta ${i + 1} salva com sucesso:`, result);
            } catch (saveError) {
              console.error(`❌ Erro ao salvar etiqueta ${i + 1}:`, saveError);
              throw saveError; // Re-throw para parar o loop em caso de erro
            }
          }

          console.log(`🎉 Sucesso! Total de ${codigos.length} etiquetas enderec registradas no Supabase`);
        } catch (error) {
          console.error('⚠️ ERRO CRÍTICO ao registrar geração no Supabase (enderec):', error);
          console.error('Stack trace:', error.stack);
          
          // Mostrar erro para o usuário
          alert(`Erro ao salvar no banco de dados: ${error.message}`);
        }
      } else {
        console.warn('⚠️ supabaseManager não disponível (enderec) - dados NÃO foram salvos');
        alert('Erro: Sistema de banco de dados não disponível. Verifique a conexão.');
      }
    }
  });

  $('#imprimir').addEventListener('click', () => window.print());

  ['wmm', 'hmm', 'tpt', 'logomm', 'logoop', 'logoPrintOff'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', setVars);
    if (el) el.addEventListener('change', setVars);
  });

  setVars();
});

// Função de teste para validar a correção do complemento de estação
function testarComplementoEstacao() {
  console.log('🧪 Testando funcionalidade de complemento de estação...');

  const testes = [
    { input: '.', expected: '.', desc: 'Ponto simples' },
    { input: 'teste estacao', expected: 'TESTE ESTACAO', desc: 'Espaços e conversão para maiúscula' },
    { input: 'est-01_a', expected: 'EST-01_A', desc: 'Caracteres especiais e conversão para maiúscula' },
    { input: '', expected: '', desc: 'Campo vazio' },
    { input: 'estação', expected: 'ESTACAO', desc: 'Acentos removidos e conversão para maiúscula' },
    { input: 'test\nline', expected: 'TESTLINE', desc: 'Caracteres de controle removidos e conversão para maiúscula' }
  ];

  let passou = 0;
  let total = testes.length;

  testes.forEach(teste => {
    const resultado = sanitizeComplement(teste.input);
    const sucesso = resultado === teste.expected;

    console.log(`${sucesso ? '✅' : '❌'} ${teste.desc}: "${teste.input}" → "${resultado}" ${sucesso ? '' : `(esperado: "${teste.expected}")`}`);

    if (sucesso) passou++;
  });

  console.log(`📊 Resultado: ${passou}/${total} testes passaram`);

  if (passou === total) {
    console.log('🎉 Todos os testes passaram! A correção está funcionando corretamente.');
  } else {
    console.log('⚠️ Alguns testes falharam. Verifique a implementação.');
  }
}

// Executar testes automaticamente em desenvolvimento
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  setTimeout(testarComplementoEstacao, 1000);
}