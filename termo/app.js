/* ===== Helpers & Base ===== */
const $ = (sel) => document.querySelector(sel);
const pad = (n, len) => (Array(len + 1).join('0') + String(n)).slice(-len);
const onlyDigits = (s) => String(s || '').replace(/\D+/g, '');

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
    console.log('✅ supabaseManager detectado e disponível');
    return window.supabaseManager;
  } else {
    console.warn('⚠️ supabaseManager não carregou a tempo');
    return null;
  }
}

/* ===== Validação de Matrícula - Using Shared System ===== */
// The matricula validation is now handled by the shared user validation system
// This function is kept for backward compatibility but delegates to the shared system
function validarMatricula(matricula) {
  if (!window.UserValidation) {
    // Fallback if shared system is not loaded
    const mat = matricula != null ? String(matricula).trim() : '';
    if (!mat || mat.length === 0) {
      return {
        valida: false,
        erro: 'Matrícula é obrigatória. Por favor, informe sua matrícula.'
      };
    }
    return { valida: true };
  }

  // Use shared validation system
  const validation = window.UserValidation.validateMatricula(matricula);
  return {
    valida: validation.valid,
    erro: validation.valid ? null : validation.msg,
    usuario: validation.user,
    matriculaLimpa: validation.cleaned
  };
}

function exibirErroMatricula(mensagem) {
  alert('Erro: ' + mensagem);
  const campoMatricula = $('#matricula');
  if (campoMatricula) {
    window.UserValidation.highlightFieldError(campoMatricula);
  }
}

/* ===== Estado Global do Histórico Termolábeis ===== */
let termoGenerationHistory = JSON.parse(localStorage.getItem('termo-etiquetas-history') || '[]');

// Limpar duplicatas do histórico existente na inicialização
function cleanDuplicateTermoHistory() {
  const uniqueHistory = [];
  const seen = new Set();

  // Ordenar por timestamp (mais recente primeiro)
  const sortedHistory = [...termoGenerationHistory].sort((a, b) =>
    new Date(b.timestamp || 0) - new Date(a.timestamp || 0)
  );

  for (const item of sortedHistory) {
    // Criar chave única mais específica
    const key = `${item.etiquetaId}-${item.pedido}-${item.loja}-${item.rota}`;

    if (!seen.has(key)) {
      seen.add(key);
      // Garantir que o item tem ID único
      if (!item.id) {
        item.id = Date.now() + Math.random();
      }
      uniqueHistory.push(item);
    }
  }

  // SEMPRE limitar a 500 registros, mesmo sem duplicatas
  const needsUpdate = uniqueHistory.length !== termoGenerationHistory.length || uniqueHistory.length > 500;
  
  if (needsUpdate) {
    const duplicatasRemovidas = sortedHistory.length - uniqueHistory.length;
    const totalAntes = termoGenerationHistory.length;
    termoGenerationHistory = uniqueHistory.slice(0, 500); // Manter apenas os 500 mais recentes
    
    try {
      localStorage.setItem('termo-etiquetas-history', JSON.stringify(termoGenerationHistory));
      if (duplicatasRemovidas > 0) {
        console.log(`Histórico termo limpo: ${duplicatasRemovidas} duplicatas removidas, mantidos ${termoGenerationHistory.length} registros`);
      } else {
        console.log(`Histórico termo ajustado: mantidos ${termoGenerationHistory.length} de ${totalAntes} registros (limite: 500)`);
      }
    } catch (e) {
      console.warn('Erro ao salvar histórico termo limpo:', e.message);
    }
  }
}

// Limpeza automática por idade (90 dias)
function cleanOldTermoRecords() {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 90);

  const cleaned = termoGenerationHistory.filter(item => {
    const itemDate = new Date(item.timestamp);
    return itemDate >= cutoffDate;
  });

  if (cleaned.length !== termoGenerationHistory.length) {
    console.log(`Removidos ${termoGenerationHistory.length - cleaned.length} registros antigos do histórico termo`);
    termoGenerationHistory = cleaned;
    try {
      localStorage.setItem('termo-etiquetas-history', JSON.stringify(termoGenerationHistory));
    } catch (e) {
      console.warn('Erro ao salvar histórico termo após limpeza:', e.message);
    }
  }
}

// Exibição como inteiro (sem zeros à esquerda), com fallback
const toIntStr = (v, fallback = 0) => {
  const d = onlyDigits(v);
  return d ? String(Number(d)) : String(Number(fallback));
};

// Fallback embutido (injetado no index.html)
let BASE = window.BASE_EMBED || { cds: [], lojas: {}, rotas: {} };

async function loadBase() {
  try {
    // Tentar usar dados do arquivo .js carregado
    if (window.DB_LOJAS && window.DB_LOJAS.BASE_LOJAS) {
      BASE = window.DB_LOJAS.BASE_LOJAS;
      console.log('✓ Dados carregados de BASE_LOJAS.js');
    } else {
      console.warn('BASE_LOJAS.js não carregado, usando fallback embutido.');
    }
  } catch (e) {
    console.warn('Erro ao carregar base, usando embutida:', e.message);
  }
  fillCDList();
}

function fillCDList() {
  const dc = document.getElementById('listCD');
  if (!dc) return;
  const cds = (BASE.cds || []).slice().sort((a, b) => Number(a) - Number(b));
  dc.innerHTML = cds.map(cd => `<option value="${cd}"></option>`).join('');
}

function setVars() {
  document.documentElement.style.setProperty('--label-w-mm', $('#wmm').value || 92.5);
  document.documentElement.style.setProperty('--label-h-mm', $('#hmm').value || 50);
}

function leap(y) { return (y % 4 === 0 && y % 100 !== 0) || (y % 400 === 0); }

function pedidoToDateStr(pedido7) {
  const s = onlyDigits(pedido7);
  if (s.length !== 7) return null;
  const ano = Number(s.slice(0, 4));
  const ddd = Number(s.slice(4, 7));
  const maxDDD = leap(ano) ? 366 : 365;
  if (ano < 2024 || ano > (new Date()).getFullYear()) return null;
  if (ddd < 1 || ddd > maxDDD) return null;
  const d = new Date(ano, 0, 1);
  d.setDate(ddd);
  const dd = pad(d.getDate(), 2);
  const mm = pad(d.getMonth() + 1, 2);
  return `${dd}/${mm}/${ano}`;
}

function parseId(id) {
  const s = onlyDigits(id);
  if (s.length !== 23) throw new Error('ID deve ter 23 dígitos.');
  const ano = Number(s.slice(1, 5));
  if (ano < 2024 || ano > (new Date()).getFullYear()) throw new Error('Ano do pedido inválido no ID.');
  return {
    cd: s.slice(0, 1),
    pedido: s.slice(1, 8),
    seq: s.slice(8, 11),
    loja: s.slice(11, 15),
    rota: s.slice(15, 18),
    vol: s.slice(18, 23)
  };
}

function buildId({ cd, pedido, seq, loja, rota, vol }) {
  const parts = {
    cd: pad(onlyDigits(cd), 1).slice(-1), // último dígito
    pedido: pad(onlyDigits(pedido), 7),
    seq: pad(onlyDigits(seq), 3),
    loja: pad(onlyDigits(loja), 4),
    rota: pad(onlyDigits(rota), 3),
    vol: pad(onlyDigits(vol), 5),
  };
  const s = parts.cd + parts.pedido + parts.seq + parts.loja + parts.rota + parts.vol;
  if (s.length !== 23) throw new Error('ID gerado não possui 23 dígitos.');
  if (!pedidoToDateStr(parts.pedido)) throw new Error('PEDIDO (AAAADDD) inválido.');
  return s;
}

function getRotaDesc(cd, n) {
  const c = String(Number(cd || 0));
  const k = pad(onlyDigits(n), 3);
  const map = (BASE.rotas && BASE.rotas[c]) || {};
  return map[k] ? `ROTA ${k} - ${map[k]}` : `ROTA ${k}`;
}
function getLojaDesc(cd, n) {
  const c = String(Number(cd || 0));
  const k = pad(onlyDigits(n), 4);
  const map = (BASE.lojas && BASE.lojas[c]) || {};
  return map[k] ? `${Number(n)} - ${map[k]}` : String(Number(n || 0));
}

/* ===== UI ===== */
function montarEtiqueta({ cd, loja, pedido, seq, rota, volAtual, volTotal, matricula, id, numeroVolumeStr }) {
  const wrap = document.createElement('div');
  wrap.className = 'labelwrap';

  const rotSel = $('#rotacao').value;
  wrap.classList.add(rotSel === '90' ? 'rot90' : (rotSel === '180' ? 'rot180' : (rotSel === '270' ? 'rot270' : 'rot0')));

  const el = document.createElement('div');
  el.className = 'label';

  // HEADER
  const header = document.createElement('div');
  header.className = 'header';
  const leftTitle = document.createElement('div');
  leftTitle.className = 'title';
  leftTitle.textContent = `VOLUMES TERMOLÁBEIS CD ${Number(cd || 0)}`;
  const logos = document.createElement('div');
  logos.className = 'logos';
  const img1 = document.createElement('img'); img1.src = '../assets/pm.png'; img1.alt = 'Pague Menos'; img1.className = 'brand-logo pm';
  // Removido o logo .logo (DP) da área de impressão/preview
  logos.append(img1);
  header.append(leftTitle, logos);
  el.appendChild(header);

  // MAIN GRID
  const main = document.createElement('div');
  main.className = 'main';

  // LEFT
  const left = document.createElement('div');
  left.className = 'left';

  // INFO (esquerda)
  const info = document.createElement('div');
  info.className = 'info';

  const dtPedidoStr = pedidoToDateStr(pedido) || '--/--/----';
  function addRow(lbl, val) {
    const l = document.createElement('div'); l.className = 'lbl'; l.textContent = lbl;
    const v = document.createElement('div'); v.className = 'val'; v.textContent = val;
    info.append(l, v);
  }
  addRow('LOJA:', getLojaDesc(cd, loja));
  addRow('N° PEDIDO:', onlyDigits(pedido));
  addRow('DT PEDIDO:', dtPedidoStr);
  addRow('ROTA:', getRotaDesc(cd, rota));

  left.appendChild(info);

  // BARCODE + LEGENDA
  const barArea = document.createElement('div');
  barArea.className = 'bararea';
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.classList.add('barcode');
  barArea.appendChild(svg);
  const barText = document.createElement('div');
  barText.className = 'bartext legend';
  barText.textContent = id;
  barArea.appendChild(barText);

  left.appendChild(barArea);

  // RIGHT (QR + VOLUME)
  const right = document.createElement('div');
  right.className = 'right';

  const qrbox = document.createElement('div');
  qrbox.className = 'qrbox';
  const qsel = window.qrcode ? window.qrcode(0, 'M') : null;
  if (qsel) {
    qsel.addData(String(id));
    qsel.make();
    const img = qsel.createImgTag(3, 8);
    const tmp = document.createElement('div'); tmp.innerHTML = img;
    const qimg = tmp.querySelector('img');
    const c = document.createElement('canvas');
    const size = 260; c.width = size; c.height = size;
    const ctx = c.getContext('2d');
    const timg = new Image();
    timg.onload = () => { ctx.drawImage(timg, 0, 0, size, size); };
    timg.src = qimg.src;
    qrbox.appendChild(c);
  } else {
    const fallback = document.createElement('div'); fallback.textContent = 'QR'; qrbox.appendChild(fallback);
  }
  right.appendChild(qrbox);

  const vbox = document.createElement('div');
  vbox.className = 'volume-box';

  const vt = document.createElement('div');
  vt.className = 't';
  vt.textContent = 'VOLUME';

  const vb = document.createElement('div');
  vb.className = 'big';
  vb.textContent = `${volAtual}/${volTotal}`;

  vbox.append(vt, vb);

  // Exibir "NÚMERO:" apenas quando houver fracionamento (mais de 1 volume)
  if (Number(volTotal) > 1) {
    const vn = document.createElement('div');
    vn.className = 'mini numero-destaque';
    vn.textContent = `NÚMERO: ${toIntStr(numeroVolumeStr, volAtual)}`;
    vbox.appendChild(vn);

    const vf = document.createElement('div');
    vf.className = 'mini';
    vf.textContent = 'VOLUME FRACIONADO';
    vbox.appendChild(vf);
  } else {
    const vs = document.createElement('div');
    vs.className = 'mini';
    // VOL também como inteiro quando não for fracionado
    vs.textContent = `VOL: ${toIntStr(numeroVolumeStr, volAtual)}`;
    vbox.appendChild(vs);
  }
  right.appendChild(vbox);

  main.append(left, right);
  el.appendChild(main);

  // META (rodapé)
  const meta = document.createElement('div');
  meta.className = 'meta';
  const now = new Date();
  const dd = pad(now.getDate(), 2), mm = pad(now.getMonth() + 1, 2), aa = now.getFullYear();
  const hh = pad(now.getHours(), 2), mi = pad(now.getMinutes(), 2);
  meta.innerHTML = `<span>CD: <strong>${Number(cd || 0)}</strong></span>` +
    (matricula ? `<span>MATRÍCULA: <strong>${matricula}</strong></span>` : '') +
    `<span>SEPARADO EM: <strong>${dd}/${mm}/${aa} ${hh}:${mi}</strong></span>`;
  el.appendChild(meta);

  // render barcode
  if (window.JsBarcode) {
    JsBarcode(svg, id, { format: 'CODE128', displayValue: false, margin: 0, width: 1.5, height: 42 });
  } else {
    const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    t.setAttribute('x', '0'); t.setAttribute('y', '20'); t.textContent = id;
    svg.appendChild(t);
  }

  wrap.appendChild(el);
  return wrap;
}

function setManualEnabled(enabled) {
  ['loja', 'pedido', 'seq', 'rota', 'numeroVolume'].forEach(id => {
    const el = document.getElementById(id);
    el.disabled = !enabled;
  });
}

function onCdChange() {
  const cdVal = $('#cd').value.trim();
  const ok = /^[1-9]$/.test(cdVal);
  setManualEnabled(ok);

  const c = String(Number(cdVal || 0));
  const lojas = (BASE.lojas && BASE.lojas[c]) || {};
  const rotas = (BASE.rotas && BASE.rotas[c]) || {};

  const dlLoja = document.getElementById('listLoja');
  dlLoja.innerHTML = Object.keys(lojas).sort().map(k => `<option value="${parseInt(k, 10)}">${lojas[k]}</option>`).join('');

  const dlRota = document.getElementById('listRota');
  dlRota.innerHTML = Object.keys(rotas).sort().map(k => `<option value="${parseInt(k, 10)}">${rotas[k]}</option>`).join('');
}

function gerar() {
  try {
    // Reset do controle de feedback para nova geração
    feedbackJaExibido = false;

    // Validate matricula using shared validation system
    const matriculaInput = $('#matricula');
    const validation = window.UserValidation.validateBeforeGeneration(matriculaInput, (msg, type) => {
      alert('Erro: ' + msg);
    });

    if (!validation) {
      return; // Validation failed, stop processing
    }

    // Set current user when matricula is valid
    if (validation.user) {
      window.UserValidation.setCurrentUser(validation.user);
    }

    const mat = validation.cleaned;

    setVars();
    const preview = $('#preview');
    preview.innerHTML = '';

    const usaId = $('#modoId').checked;
    const totalVol = Math.max(1, parseInt($('#qtdVolumes').value || '1', 10));
    const numVolInput = onlyDigits(document.getElementById('numeroVolume') ? document.getElementById('numeroVolume').value : '');
    const etiquetas = [];

    if (usaId) {
      const idRaw = onlyDigits($('#idEtiqueta').value);
      const parsed = parseId(idRaw); // valida e já quebra campos
      const idFixo = idRaw;          // ID permanece fixo em todas as etiquetas

      // Base para mostrar NÚMERO (somente exibição)
      const base4 = numVolInput ? Number(String(numVolInput).slice(-4)) : Number(String(parsed.vol).slice(-4));

      for (let v = 1; v <= totalVol; v++) {
        const num4 = pad(base4, 4);
        const etq = montarEtiqueta({
          cd: parsed.cd,
          loja: parsed.loja,
          pedido: parsed.pedido,
          seq: parsed.seq,
          rota: parsed.rota,
          volAtual: v,
          volTotal: totalVol,
          matricula: mat,
          id: idFixo,                 // código/ID fixo
          numeroVolumeStr: num4       // apenas para exibição
        });
        etiquetas.push(etq);
      }
    } else {
      const cd = $('#cd').value;
      if (!/^[1-9]$/.test(cd)) throw new Error('Informe o CD (1 a 9) para liberar os demais campos.');

      const loja = $('#loja').value;
      const pedido = $('#pedido').value;
      const seq = $('#seq').value;
      const rota = $('#rota').value;

      if (!pedidoToDateStr(pedido)) throw new Error('PEDIDO (AAAADDD) inválido. Ex.: 2024269');

      const baseNum5 = numVolInput ? pad(Number(numVolInput), 5) : '00001';
      const idFixo = buildId({ cd, pedido, seq, loja, rota, vol: baseNum5 }); // ID fixo

      const base4 = Number(baseNum5.slice(-4)); // para exibição
      for (let v = 1; v <= totalVol; v++) {
        const num4 = pad(base4, 4);
        const etq = montarEtiqueta({
          cd, loja, pedido, seq, rota,
          volAtual: v,
          volTotal: totalVol,
          matricula: mat,
          id: idFixo,                 // ID fixo
          numeroVolumeStr: num4       // exibição
        });
        etiquetas.push(etq);
      }
    }

    etiquetas.forEach(e => preview.appendChild(e));

    // Salvar no histórico após geração bem-sucedida
    console.log('🔄 Salvando no histórico termo...');

    const now = new Date();
    const dd = pad(now.getDate(), 2);
    const mm = pad(now.getMonth() + 1, 2);
    const aa = now.getFullYear();
    const hh = pad(now.getHours(), 2);
    const mi = pad(now.getMinutes(), 2);

    let historyData;

    if (usaId) {
      const idRaw = onlyDigits($('#idEtiqueta').value);
      const parsed = parseId(idRaw);
      const dtPedidoStr = pedidoToDateStr(parsed.pedido) || '--/--/----';

      historyData = {
        etiquetaId: idRaw,
        pedido: onlyDigits(parsed.pedido),
        dataPedido: dtPedidoStr,
        loja: getLojaDesc(parsed.cd, parsed.loja),
        rota: getRotaDesc(parsed.cd, parsed.rota),
        qtdVolumes: totalVol,
        matricula: mat,
        dataSeparacao: `${dd}/${mm}/${aa}`,
        horaSeparacao: `${hh}:${mi}`,
        timestamp: now.toISOString()
      };
    } else {
      const cd = $('#cd').value;
      const loja = $('#loja').value;
      const pedido = $('#pedido').value;
      const rota = $('#rota').value;
      const dtPedidoStr = pedidoToDateStr(pedido) || '--/--/----';
      const baseNum5 = numVolInput ? pad(Number(numVolInput), 5) : '00001';
      const idFixo = buildId({ cd, pedido, seq: $('#seq').value, loja, rota, vol: baseNum5 });

      historyData = {
        etiquetaId: idFixo,
        pedido: onlyDigits(pedido),
        dataPedido: dtPedidoStr,
        loja: getLojaDesc(cd, loja),
        rota: getRotaDesc(cd, rota),
        qtdVolumes: totalVol,
        matricula: mat,
        dataSeparacao: `${dd}/${mm}/${aa}`,
        horaSeparacao: `${hh}:${mi}`,
        timestamp: now.toISOString()
      };
    }

    console.log('📋 Dados para histórico termo:', historyData);
    saveToTermoHistory(historyData);

    // Auto-impressão após gerar etiquetas com detecção de retorno
    setTimeout(() => {
      console.log('🔄 Preparando para impressão...');

      let popupExibido = false; // Flag para evitar duplicação

      // Função para exibir popup após impressão
      const exibirPopupAposImpressao = () => {
        if (popupExibido) return; // Evitar duplicação
        popupExibido = true;

        console.log('🎉 Exibindo popup após impressão...');

        // Verificar se a função existe
        if (typeof mostrarPopupSucesso !== 'function') {
          console.error('❌ Função mostrarPopupSucesso não encontrada!');
          // Criar uma versão simples como fallback
          alert('Etiquetas geradas com sucesso!');
          return;
        }

        // Mostrar popup após impressão se houver dados
        if (window.dadosParaPopup) {
          console.log('📊 Dados do popup:', window.dadosParaPopup);
          const total = window.dadosParaPopup.novoValor !== 'N/A'
            ? window.dadosParaPopup.novoValor.toLocaleString('pt-BR')
            : 'N/A';
          mostrarPopupSucesso('Etiquetas geradas com sucesso!', `+${window.dadosParaPopup.totalVol} etiquetas | Total: ${total}`);
          window.dadosParaPopup = null; // Limpar dados após uso
        } else {
          console.warn('⚠️ Dados do popup não encontrados');
          // Mostrar popup genérico
          mostrarPopupSucesso('Etiquetas geradas com sucesso!', 'Etiquetas geradas com sucesso');
        }

        // Preparar para nova geração após impressão
        setTimeout(() => {
          prepararNovaGeracao();
        }, 300);
      };

      // Detectar quando a impressão termina
      const beforePrint = () => {
        console.log('🖨️ Iniciando impressão...');
      };

      const afterPrint = () => {
        console.log('✅ Impressão concluída (evento afterprint)');
        window.removeEventListener('beforeprint', beforePrint);
        window.removeEventListener('afterprint', afterPrint);

        // Pequeno delay para garantir que a impressão terminou
        setTimeout(() => {
          exibirPopupAposImpressao();
        }, 500);
      };

      // Adicionar listeners para eventos de impressão
      window.addEventListener('beforeprint', beforePrint);
      window.addEventListener('afterprint', afterPrint);

      // Iniciar impressão
      console.log('🖨️ Iniciando window.print()...');
      window.print();

      // Fallback mais robusto - sempre executar após um tempo
      setTimeout(() => {
        console.log('⏰ Executando fallback após 3 segundos...');
        exibirPopupAposImpressao();
      }, 3000);

    }, 500);

  } catch (e) {
    alert('Erro: ' + e.message);
  }
}

/* ===== Preparar Nova Geração ===== */
let feedbackJaExibido = false;

function prepararNovaGeracao() {
  const usaId = $('#modoId').checked;



  if (usaId) {
    // Limpar campo ID da etiqueta
    const idEtiquetaInput = $('#idEtiqueta');
    idEtiquetaInput.value = '';

    // Focar no campo ID para nova entrada
    setTimeout(() => {
      idEtiquetaInput.focus();
    }, 100);

    console.log('✅ Campo ID limpo e focado para nova geração');
  } else {
    // No modo manual, limpar campos principais
    $('#cd').value = '';
    $('#loja').value = '';
    $('#pedido').value = '';
    $('#seq').value = '';
    $('#rota').value = '';
    $('#numeroVolume').value = '';

    // Focar no campo CD
    setTimeout(() => {
      $('#cd').focus();
    }, 100);

    console.log('✅ Campos manuais limpos e CD focado para nova geração');
  }

  // Resetar quantidade de volumes para padrão
  $('#qtdVolumes').value = '2';

  // Limpar preview
  const preview = $('#preview');
  preview.innerHTML = '';

  // Manter matrícula preenchida para agilizar próximas gerações
  // (não limpar a matrícula pois geralmente é o mesmo usuário)
}

/* ===== Feedback Visual ===== */
function mostrarFeedbackNovaGeracao() {
  // Criar elemento de feedback
  const feedback = document.createElement('div');
  feedback.className = 'feedback-nova-geracao';
  feedback.innerHTML = `
    <div class="feedback-content">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m0 0V11a1 1 0 011-1h2a1 1 0 011 1v10m0 0h3a1 1 0 001-1V10M9 21h6"/>
      </svg>
      <span>Pronto para nova etiqueta!</span>
    </div>
  `;

  // Adicionar ao body
  document.body.appendChild(feedback);

  // Animar entrada
  setTimeout(() => {
    feedback.classList.add('show');
  }, 10);

  // Remover após 2 segundos
  setTimeout(() => {
    feedback.classList.remove('show');
    setTimeout(() => {
      if (feedback.parentNode) {
        feedback.parentNode.removeChild(feedback);
      }
    }, 300);
  }, 2000);
}

/* ===== Navegação por Teclado ===== */
function setupKeyboardNavigation() {
  const idEtiquetaInput = $('#idEtiqueta');
  const qtdVolumesInput = $('#qtdVolumes');
  const matriculaInput = $('#matricula');
  const gerarBtn = $('#gerar');

  // Navegação no campo ID da etiqueta
  if (idEtiquetaInput) {
    idEtiquetaInput.addEventListener('input', (e) => {
      const value = e.target.value.replace(/\D/g, ''); // Apenas dígitos
      e.target.value = value;

      // Se completou 23 dígitos, pular para quantidade de volumes
      if (value.length === 23) {
        setTimeout(() => {
          qtdVolumesInput.focus();
          qtdVolumesInput.select(); // Selecionar todo o texto para edição rápida
        }, 100);
      }
    });

    idEtiquetaInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const value = e.target.value.replace(/\D/g, '');
        if (value.length === 23) {
          qtdVolumesInput.focus();
          qtdVolumesInput.select();
        } else {
          alert('ID deve ter exatamente 23 dígitos');
        }
      }
    });
  }

  // Navegação no campo quantidade de volumes
  if (qtdVolumesInput) {
    qtdVolumesInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();

        // Verificar se matrícula está vazia
        const matriculaValue = matriculaInput.value.trim();

        if (!matriculaValue) {
          // Matrícula vazia, focar nela
          matriculaInput.focus();
        } else {
          // Matrícula preenchida, gerar etiquetas diretamente
          gerarBtn.click();
        }
      }
    });
  }

  // Navegação no campo matrícula
  if (matriculaInput) {
    matriculaInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();

        // Verificar se a matrícula é válida antes de gerar
        const validation = window.UserValidation.validateMatricula(matriculaInput.value);

        if (validation.valid) {
          gerarBtn.click();
        } else {
          alert('Erro: ' + (validation.msg || 'Matrícula inválida'));
          matriculaInput.focus();
        }
      }
    });
  }

  // Atalhos globais de teclado
  document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + G para gerar etiquetas
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'g') {
      e.preventDefault();
      gerarBtn.click();
    }

    // Ctrl/Cmd + P para imprimir (já existe nativamente, mas garantindo)
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
      // Deixar o comportamento nativo do navegador
    }

    // F2 para focar no primeiro campo relevante
    if (e.key === 'F2') {
      e.preventDefault();
      const usaId = $('#modoId').checked;
      if (usaId) {
        idEtiquetaInput.focus();
      } else {
        $('#cd').focus();
      }
    }

    // Ctrl/Cmd + N para nova geração (limpar campos)
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
      e.preventDefault();
      prepararNovaGeracao();
    }

    // Escape para limpar campos e começar nova geração
    if (e.key === 'Escape') {
      e.preventDefault();
      prepararNovaGeracao();
    }
  });

  console.log('✅ Navegação por teclado configurada');
}


document.addEventListener('DOMContentLoaded', async () => {
  // Initialize user validation system
  await initializeUserValidation();

  await loadBase();

  const toggle = () => {
    const usaId = $('#modoId').checked;
    $('#blocoId').className = usaId ? 'blocovis' : 'blocohide';
    $('#blocoCampos').className = usaId ? 'blocohide' : 'blocovis';
    if (!usaId) onCdChange();

    // Focar no campo apropriado quando mudar de modo
    setTimeout(() => {
      if (usaId) {
        $('#idEtiqueta').focus();
      } else {
        $('#cd').focus();
      }
    }, 100);
  };
  $('#modoId').addEventListener('change', toggle);
  $('#modoCampos').addEventListener('change', toggle);
  toggle();

  $('#cd').addEventListener('input', onCdChange);
  setManualEnabled(false);

  // Navegação por teclado melhorada
  setupKeyboardNavigation();

  $('#gerar').addEventListener('click', async () => {
    gerar();

    // Registrar geração no Supabase após gerar etiquetas
    console.log('📡 Aguardando SupabaseManager...');

    // Aguardar supabaseManager carregar (ES module pode levar um tempo)
    const manager = await waitForSupabaseManager(3000);

    console.log('📡 SupabaseManager disponível:', !!manager);

    if (manager) {
      try {
        const matInput = $('#matricula');
        const mat = matInput ? matInput.value.replace(/\D/g, '') : '';
        const currentUser = window.UserValidation ? window.UserValidation.getCurrentUser() : null;
        const nome = currentUser ? currentUser.Nome : '';

        const usaId = $('#modoId').checked;
        const totalVol = Math.max(1, parseInt($('#qtdVolumes').value || '1', 10));

        // Incrementar contador global e mostrar feedback visual (como no módulo Avulso)
        if (window.contadorGlobal) {
          try {
            // Usa o método padrão que gerencia local + sync
            const novoValor = await window.contadorGlobal.incrementarContador(totalVol, 'termo');

            // Armazenar dados para mostrar popup após impressão
            window.dadosParaPopup = {
              novoValor: novoValor,
              totalVol: totalVol
            };

            console.log(`✅ Contador incrementado: +${totalVol} = ${novoValor}`);
            console.log('💾 Dados armazenados para popup:', window.dadosParaPopup);
          } catch (err) {
            console.warn('⚠️ Erro ao atualizar contador global:', err);
          }
        } else {
          console.warn('⚠️ window.contadorGlobal não disponível');

          // Fallback: mostrar popup imediatamente se contador não estiver disponível
          if (typeof mostrarPopupSucesso === 'function') {
            window.dadosParaPopup = {
              novoValor: 'N/A',
              totalVol: totalVol
            };
          }
        }

        let termoData;

        if (usaId) {
          const idRaw = onlyDigits($('#idEtiqueta').value);
          if (idRaw.length === 23) {
            const parsed = parseId(idRaw);
            termoData = {
              id_et: idRaw,
              cd: String(parsed.cd),
              pedido: String(parsed.pedido),
              filial: String(parsed.loja),
              seq: String(parsed.seq),
              num_rota: String(parsed.rota),
              nom_rota: getRotaDesc(parsed.cd, parsed.rota),
              qtd_vol: totalVol,
              mat: mat,
              nome: nome
            };
          }
        } else {
          const cd = $('#cd').value;
          const loja = $('#loja').value;
          const pedido = $('#pedido').value;
          const seq = $('#seq').value;
          const rota = $('#rota').value;

          if (cd && loja && pedido && seq && rota) {
            const idFixo = buildId({ cd, pedido, seq, loja, rota, vol: '00001' });
            termoData = {
              id_et: idFixo,
              cd: String(cd),
              pedido: String(pedido),
              filial: String(loja),
              seq: String(seq),
              num_rota: String(rota),
              nom_rota: getRotaDesc(cd, rota),
              qtd_vol: totalVol,
              mat: mat,
              nome: nome
            };
          }
        }

        if (termoData) {
          console.log('📝 Salvando termoData no Supabase:', termoData);
          await manager.saveTermoLabel(termoData);
          console.log('✅ Geração de termo registrada na tabela específica e tabela labels');
        } else {
          console.warn('⚠️ termoData está vazio, verifique os campos preenchidos');
        }
      } catch (error) {
        console.error('⚠️ Falha ao registrar geração na tabela termo:', error);
        console.error('Detalhes do erro:', error.message);
      }
    } else {
      console.warn('⚠️ supabaseManager não disponível - dados NÃO foram salvos no banco');
      console.warn('💡 Verifique se o Supabase está configurado corretamente');
    }
  });
  $('#imprimir').addEventListener('click', () => window.print());

  ['wmm', 'hmm', 'rotacao'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', setVars);
  });
  setVars();

  // Add real-time matricula validation
  const matriculaInput = $('#matricula');
  if (matriculaInput) {
    let validationTimeout = null;

    matriculaInput.addEventListener('input', (e) => {
      // Clear previous timeout
      if (validationTimeout) {
        clearTimeout(validationTimeout);
      }

      // Clear any existing error states
      window.UserValidation.clearFieldError(matriculaInput);

      const matricula = e.target.value.trim();

      // If empty, clear current user and greeting
      if (!matricula) {
        window.UserValidation.clearCurrentUser();
        return;
      }

      // Debounce validation to avoid excessive calls
      validationTimeout = setTimeout(() => {
        const validation = window.UserValidation.validateMatricula(matricula);

        if (validation.valid && validation.user) {
          // Set current user and update greeting
          window.UserValidation.setCurrentUser(validation.user);
          console.log('✅ Usuário validado em tempo real:', validation.user.Nome);
        } else {
          // Clear current user if validation fails
          window.UserValidation.clearCurrentUser();
        }
      }, 500); // 500ms debounce
    });

    // Also validate on blur (when user leaves the field)
    matriculaInput.addEventListener('blur', (e) => {
      const matricula = e.target.value.trim();
      if (matricula) {
        const validation = window.UserValidation.validateMatricula(matricula);
        if (!validation.valid) {
          window.UserValidation.highlightFieldError(matriculaInput, validation.msg, 3000);
        }
      }
    });

    console.log('✅ Validação em tempo real configurada para campo matrícula');
  }

  // Controles do histórico
  $('#termo-historico-btn').addEventListener('click', showTermoHistorico);
  $('#termo-historico-close').addEventListener('click', hideTermoHistorico);

  // Fechar modal clicando fora
  $('#termo-historico-modal').addEventListener('click', (e) => {
    if (e.target === $('#termo-historico-modal')) {
      hideTermoHistorico();
    }
  });

  // Toggle da busca
  const toggleSearchBtn = $('#termo-toggle-search');
  if (toggleSearchBtn) {
    toggleSearchBtn.addEventListener('click', () => {
      const searchSection = $('#termo-search-section');
      const isHidden = searchSection.style.display === 'none';

      if (isHidden) {
        searchSection.style.display = 'block';
        toggleSearchBtn.classList.add('active');
        const input = $('#termo-search-input');
        if (input) setTimeout(() => input.focus(), 100);
      } else {
        searchSection.style.display = 'none';
        toggleSearchBtn.classList.remove('active');
      }
    });
  }

  document.addEventListener('keydown', (ev) => {
    if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'h') { ev.preventDefault(); showTermoHistorico(); }
    if (ev.key === 'Escape') { hideTermoHistorico(); }
  });

  // Inicialização do histórico
  try {
    cleanDuplicateTermoHistory();
    cleanOldTermoRecords();
    console.log('📊 Histórico termo inicializado:', termoGenerationHistory.length, 'registros');
  } catch (error) {
    console.warn('⚠️ Erro na inicialização do histórico termo:', error.message);
    termoGenerationHistory = [];
  }
});

/* ===== Funções do Histórico Termolábeis ===== */
function showTermoHistorico() {
  const modal = $('#termo-historico-modal');

  // Limpar registros antigos antes de exibir
  cleanOldTermoRecords();

  // Resetar estado da busca (fechado por padrão)
  const searchSection = $('#termo-search-section');
  const toggleBtn = $('#termo-toggle-search');
  if (searchSection) searchSection.style.display = 'none';
  if (toggleBtn) toggleBtn.classList.remove('active');

  // Limpar busca anterior
  const searchInput = $('#termo-search-input');
  if (searchInput) {
    searchInput.value = '';
  }
  clearTermoSearch(); // Garante que filtros também resetem

  // Renderizar lista completa
  renderTermoHistoryList(termoGenerationHistory);

  modal.style.display = 'flex';

  // Configurar eventos de busca
  setupTermoSearchEvents();

  // Foco para acessibilidade
  const closeBtn = $('#termo-historico-close');
  if (closeBtn) closeBtn.focus();
}

function hideTermoHistorico() {
  const modal = $('#termo-historico-modal');
  modal.style.display = 'none';
}

function renderTermoHistoryList(historyData) {
  const list = $('#termo-historico-list');

  if (historyData.length === 0) {
    const searchInput = $('#termo-search-input');
    const isSearching = searchInput && searchInput.value.trim() !== '';

    if (isSearching) {
      list.innerHTML = `
        <div style="text-align: center; padding: 3rem;">
          <div style="font-size: 3rem; margin-bottom: 1rem;">🔍</div>
          <p style="color: var(--neutral-500); font-size: var(--text-base); margin-bottom: 0.5rem;">Nenhum resultado encontrado</p>
          <p style="color: var(--neutral-400); font-size: var(--text-sm);">Tente ajustar os termos de busca</p>
        </div>
      `;
    } else {
      list.innerHTML = `
        <div style="text-align: center; padding: 3rem;">
          <div style="font-size: 3rem; margin-bottom: 1rem;">🧊</div>
          <p style="color: var(--neutral-500); font-size: var(--text-base); margin-bottom: 0.5rem;">Nenhum histórico encontrado</p>
          <p style="color: var(--neutral-400); font-size: var(--text-sm);">Gere algumas etiquetas termolábeis para ver o histórico aqui</p>
        </div>
      `;
    }
  } else {
    list.innerHTML = historyData.map((item, index) => {
      const html = createTermoHistoryItemHTML(item);
      return html.replace('class="historico-item"', `class="historico-item" style="animation-delay: ${index * 0.05}s"`);
    }).join('');

    // Adicionar informações de estatísticas
    const totalRecords = termoGenerationHistory.length;
    const showingRecords = historyData.length;
    const isFiltered = totalRecords !== showingRecords;

    const statsHtml = `
      <div style="text-align: center; padding: 1rem; margin-top: 1rem; border-top: 1px solid var(--neutral-200);">
        <small style="color: var(--neutral-500);">
          ${isFiltered ? `Mostrando ${showingRecords} de ${totalRecords}` : `${totalRecords}`} 
          ${totalRecords === 1 ? 'registro' : 'registros'} no histórico
          ${totalRecords > 0 ? ` • Mais antigo: ${new Date(termoGenerationHistory[termoGenerationHistory.length - 1].timestamp).toLocaleDateString('pt-BR')}` : ''}
        </small>
      </div>
    `;
    list.innerHTML += statsHtml;
  }
}

function createTermoHistoryItemHTML(item) {
  return `
    <div class="historico-item">
      <div class="historico-info">
        <div class="historico-primary">
          <strong>ID: ${item.etiquetaId}</strong>
          <span class="historico-badge">${item.qtdVolumes} ${item.qtdVolumes === 1 ? 'volume' : 'volumes'}</span>
        </div>
        <div class="historico-secondary">
          <span>Pedido: ${item.pedido}</span>
          <span>Data Pedido: ${item.dataPedido}</span>
          <span>Loja: ${item.loja}</span>
          <span>Rota: ${item.rota}</span>
        </div>
        <div class="historico-meta">
          ${item.matricula ? `<span>Matrícula: ${item.matricula}${item.nome ? ' - ' + item.nome : ''}</span>` : ''}
          <span>Separado em: ${item.dataSeparacao} às ${item.horaSeparacao}</span>
        </div>
      </div>
    </div>
  `;
}

function setupTermoSearchEvents() {
  const searchInput = $('#termo-search-input');
  const clearButton = $('#termo-clear-search');
  const filterRadios = document.querySelectorAll('input[name="termoSearchType"]');

  // Evento de busca em tempo real
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      performTermoSearch();
      // Mostrar/ocultar botão de limpar
      const clearBtn = $('#termo-clear-search');
      if (clearBtn) {
        if (e.target.value.trim()) {
          clearBtn.style.opacity = '1';
          clearBtn.style.visibility = 'visible';
        } else {
          clearBtn.style.opacity = '0';
          clearBtn.style.visibility = 'hidden';
        }
      }
    });

    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        clearTermoSearch();
      }
    });
  }

  // Botão limpar busca
  if (clearButton) {
    clearButton.addEventListener('click', clearTermoSearch);
  }

  // Filtros de tipo
  filterRadios.forEach(radio => {
    radio.addEventListener('change', performTermoSearch);
  });
}

function performTermoSearch() {
  const searchInput = $('#termo-search-input');
  const searchTerm = searchInput ? searchInput.value.trim().toLowerCase() : '';
  const selectedFilter = document.querySelector('input[name="termoSearchType"]:checked')?.value || 'all';

  let filteredHistory = [...termoGenerationHistory];

  if (searchTerm) {
    filteredHistory = termoGenerationHistory.filter(item => {
      switch (selectedFilter) {
        case 'pedido':
          return item.pedido && item.pedido.toLowerCase().includes(searchTerm);

        case 'loja':
          return item.loja && item.loja.toLowerCase().includes(searchTerm);

        case 'rota':
          return item.rota && item.rota.toLowerCase().includes(searchTerm);

        case 'data':
          return (item.dataPedido && item.dataPedido.includes(searchTerm)) ||
            (item.dataSeparacao && item.dataSeparacao.includes(searchTerm));

        case 'all':
        default:
          return (
            (item.pedido && item.pedido.toLowerCase().includes(searchTerm)) ||
            (item.loja && item.loja.toLowerCase().includes(searchTerm)) ||
            (item.rota && item.rota.toLowerCase().includes(searchTerm)) ||
            (item.dataPedido && item.dataPedido.includes(searchTerm)) ||
            (item.dataSeparacao && item.dataSeparacao.includes(searchTerm)) ||
            (item.etiquetaId && item.etiquetaId.toLowerCase().includes(searchTerm))
          );
      }
    });
  }

  renderTermoHistoryList(filteredHistory);
}

function clearTermoSearch() {
  const searchInput = $('#termo-search-input');
  const clearBtn = $('#termo-clear-search');

  if (searchInput) {
    searchInput.value = '';
  }

  // Ocultar botão de limpar
  if (clearBtn) {
    clearBtn.style.opacity = '0';
    clearBtn.style.visibility = 'hidden';
  }

  // Resetar para "Todos"
  const allFilter = document.querySelector('input[name="termoSearchType"][value="all"]');
  if (allFilter) {
    allFilter.checked = true;
  }

  renderTermoHistoryList(termoGenerationHistory);

  // Foco de volta no input
  if (searchInput) {
    searchInput.focus();
  }
}

function saveToTermoHistory(config) {
  // Criar chave única para identificar duplicatas
  const uniqueKey = `${config.etiquetaId}-${config.pedido}-${config.loja}-${config.rota}`;

  // Verificar se já existe uma entrada com a mesma configuração
  const existingIndex = termoGenerationHistory.findIndex(item => {
    const itemKey = `${item.etiquetaId}-${item.pedido}-${item.loja}-${item.rota}`;
    return itemKey === uniqueKey;
  });

  // Se encontrou uma entrada similar, remover a antiga
  if (existingIndex !== -1) {
    termoGenerationHistory.splice(existingIndex, 1);
    console.log('Removida entrada duplicada do histórico termo');
  }

  // Adicionar a nova entrada no início
  // Tentar encontrar o nome do usuário
  let nomeUsuario = '';
  if (window.DB_USUARIO && window.DB_USUARIO.BASE_USUARIO) {
    const usuario = window.DB_USUARIO.BASE_USUARIO.find(u => u.Matricula == config.matricula);
    if (usuario) {
      nomeUsuario = usuario.Nome;
    }
  }

  termoGenerationHistory.unshift({
    ...config,
    nome: nomeUsuario,
    id: Date.now() + Math.random(), // ID único para evitar conflitos
    uniqueKey
  });

  // Manter apenas os últimos 500 registros únicos
  if (termoGenerationHistory.length > 500) {
    termoGenerationHistory = termoGenerationHistory.slice(0, 500);
  }

  // Limpar registros antigos (90 dias)
  cleanOldTermoRecords();

  // Salvar no localStorage
  try {
    localStorage.setItem('termo-etiquetas-history', JSON.stringify(termoGenerationHistory));
    console.log('✅ Histórico termo salvo:', config.etiquetaId, '- Total:', termoGenerationHistory.length, 'entradas');
  } catch (e) {
    console.warn('⚠️ Erro ao salvar histórico termo:', e.message);

    // Tratamento simples para erro de espaço
    if (e.name === 'QuotaExceededError') {
      console.warn('⚠️ Espaço insuficiente no navegador');
      alert('Espaço de armazenamento cheio. O histórico será limpo.');
      localStorage.removeItem('termo-etiquetas-history');
      termoGenerationHistory = [];
    }
  }
}

// Expor funções globalmente para debugging e testes
window.termoGenerationHistory = () => termoGenerationHistory;
window.showTermoHistorico = showTermoHistorico;
window.hideTermoHistorico = hideTermoHistorico;
window.saveToTermoHistory = saveToTermoHistory;
window.performTermoSearch = performTermoSearch;
window.clearTermoSearch = clearTermoSearch;
// User Validation System Initialization
async function initializeUserValidation() {
  try {
    console.log('🔄 Inicializando sistema de validação de usuário...');

    // Load user database
    const loaded = await window.UserValidation.loadUserDatabase();
    if (!loaded) {
      console.error('❌ Falha ao carregar base de usuários');
      return;
    }

    // Initialize responsive layout system
    window.UserGreeting.initResponsiveLayoutSystem();

    console.log('✅ Sistema de validação de usuário inicializado');
    console.log(`📊 Total de usuários carregados: ${window.UserValidation.userCount}`);

    // Add test function for debugging
    window.testUserValidationTermo = () => {
      console.log('🧪 Testando validação de usuário no módulo termo...');

      const matriculaInput = $('#matricula');
      if (!matriculaInput) {
        console.error('❌ Campo matrícula não encontrado');
        return;
      }

      // Test with sample matricula
      matriculaInput.value = '81883'; // Sample from BASE_USUARIO.js
      const validation = window.UserValidation.validateMatricula(matriculaInput.value);
      console.log('✅ Resultado da validação:', validation);

      if (validation.valid) {
        window.UserValidation.setCurrentUser(validation.user);
        console.log('👋 Saudação atualizada para:', validation.user.Nome);
      }
    };

  } catch (error) {
    console.error('❌ Erro na inicialização do sistema de validação:', error);
  }
}