/* ===== Helpers & Base ===== */
const $ = (sel) => document.querySelector(sel);
const pad = (n, len) => (Array(len + 1).join('0') + String(n)).slice(-len);
const onlyDigits = (s) => String(s || '').replace(/\D+/g, '');

// Exibição como inteiro (sem zeros à esquerda), com fallback
const toIntStr = (v, fallback = 0) => {
  const d = onlyDigits(v);
  return d ? String(Number(d)) : String(Number(fallback));
};

// Fallback embutido (injetado no index.html)
let BASE = window.BASE_EMBED || { cds: [], lojas: {}, rotas: {} };

async function loadBase() {
  try {
    const resp = await fetch('../data_base/BASE_LOJAS.json', { cache: 'no-store' });
    if (resp.ok) {
      BASE = await resp.json();
    }
  } catch (e) {
    console.warn('Base via fetch indisponível, usando embutida.');
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
  const wmmInput = document.querySelector('#wmm');
  const hmmInput = document.querySelector('#hmm');

  document.documentElement.style.setProperty('--label-w-mm', (wmmInput ? wmmInput.value : null) || 156);
  document.documentElement.style.setProperty('--label-h-mm', (hmmInput ? hmmInput.value : null) || 68);
}

function leap(y) {
  return (y % 4 === 0 && y % 100 !== 0) || (y % 400 === 0);
}

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
function montarEtiqueta({ cd, loja, pedido, seq, rota, matricula, volAtual, volTotal }) {
  const wrap = document.createElement('div');
  wrap.className = 'labelwrap';

  const rotSel = document.querySelector('#rotacao').value;
  wrap.classList.add(rotSel === '90' ? 'rot90' : (rotSel === '180' ? 'rot180' : (rotSel === '270' ? 'rot270' : 'rot0')));

  const el = document.createElement('div');
  el.className = 'label';

  // HEADER
  const header = document.createElement('div');
  header.className = 'header';
  const leftTitle = document.createElement('div');
  leftTitle.className = 'title';
  leftTitle.textContent = `PEDIDO DIRETO CD ${Number(cd || 0)}`;
  const logos = document.createElement('div');
  logos.className = 'logos';
  const img1 = document.createElement('img');
  img1.src = '../assets/pm.png';
  img1.alt = 'Pague Menos';
  img1.className = 'brand-logo pm';
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
  addRow('SEQ:', String(Number(onlyDigits(seq))));
  addRow('DT PEDIDO:', dtPedidoStr);
  addRow('ROTA:', getRotaDesc(cd, rota));

  left.appendChild(info);

  // RIGHT (VOLUME)
  const right = document.createElement('div');
  right.className = 'right';

  const vbox = document.createElement('div');
  vbox.className = 'volume-box';

  const vt = document.createElement('div');
  vt.className = 't';
  vt.textContent = 'VOLUME';

  const vb = document.createElement('div');
  vb.className = 'big';
  vb.textContent = `${volAtual}/${volTotal}`;

  vbox.append(vt, vb);

  // Exibir texto adicional apenas quando houver fracionamento (mais de 1 volume)
  if (Number(volTotal) > 1) {
    const vf = document.createElement('div');
    vf.className = 'mini';
    vf.textContent = 'VOLUME FRACIONADO';
    vbox.appendChild(vf);
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

  wrap.appendChild(el);
  return wrap;
}

function setManualEnabled(enabled) {
  ['loja', 'pedido', 'seq', 'rota'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.disabled = !enabled;
  });
}

function onCdChange() {
  const cdVal = document.querySelector('#cd').value.trim();
  const ok = /^[1-9]$/.test(cdVal);
  setManualEnabled(ok);

  const c = String(Number(cdVal || 0));
  const lojas = (BASE.lojas && BASE.lojas[c]) || {};
  const rotas = (BASE.rotas && BASE.rotas[c]) || {};

  const dlLoja = document.getElementById('listLoja');
  dlLoja.innerHTML = Object.keys(lojas).sort().map(k => `<option value="${parseInt(k, 10)} - ${lojas[k]}">${parseInt(k, 10)} - ${lojas[k]}</option>`).join('');

  const dlRota = document.getElementById('listRota');
  dlRota.innerHTML = Object.keys(rotas).sort().map(k => `<option value="${parseInt(k, 10)} - ${rotas[k]}">${parseInt(k, 10)} - ${rotas[k]}</option>`).join('');
}

function gerar() {
  try {
    setVars();
    const preview = document.querySelector('#preview');
    preview.innerHTML = '';

    const cd = document.querySelector('#cd').value;
    if (!/^[1-9]$/.test(cd)) {
      throw new Error('Informe o CD (1 a 9) para liberar os demais campos.');
    }

    const loja = document.querySelector('#loja').value;
    const pedido = document.querySelector('#pedido').value;
    const seq = document.querySelector('#seq').value;
    const rota = document.querySelector('#rota').value;
    const totalVol = Math.max(1, parseInt(document.querySelector('#qtdVolumes').value || '1', 10));

    if (!loja || !loja.trim()) throw new Error('Informe a filial.');
    if (!pedido || !pedido.trim()) throw new Error('Informe o número do pedido.');
    if (!seq || !seq.trim()) throw new Error('Informe o sequencial.');
    if (!rota || !rota.trim()) throw new Error('Informe a rota.');

    // Validate matricula using shared validation system
    const matriculaInput = document.querySelector('#matricula');
    const validation = window.UserValidation.validateBeforeGeneration(matriculaInput, (msg, type) => {
      throw new Error(msg);
    });

    if (!validation) {
      return false;
    }

    const matricula = validation.cleaned;

    if (!pedidoToDateStr(pedido.trim())) {
      throw new Error('PEDIDO (AAAADDD) inválido. Ex.: 2024269');
    }

    // Extrair apenas o número da loja e rota (remover descrição se presente)
    const lojaNum = loja.includes(' - ') ? loja.split(' - ')[0] : onlyDigits(loja);
    const rotaNum = rota.includes(' - ') ? rota.split(' - ')[0] : onlyDigits(rota);

    const etiquetas = [];

    // Gerar múltiplas etiquetas baseado na quantidade de volumes
    for (let v = 1; v <= totalVol; v++) {
      const etq = montarEtiqueta({
        cd: cd.trim(),
        loja: lojaNum,
        pedido: pedido.trim(),
        seq: onlyDigits(seq),
        rota: rotaNum,
        matricula: matricula,
        volAtual: v,
        volTotal: totalVol
      });
      etiquetas.push(etq);
    }

    etiquetas.forEach(e => preview.appendChild(e));

    // Mostrar painel de configurações após gerar
    const painelConfig = document.querySelector('#painelConfiguracoes');
    if (painelConfig) {
      painelConfig.style.display = 'block';
      console.log('✅ Painel de configurações exibido');
    }
  } catch (e) {
    alert('Erro: ' + e.message);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  console.log('🎯 Pedido Direto - Iniciando carregamento...');

  // Initialize user validation system
  await initializeUserValidation();

  await loadBase();

  document.querySelector('#cd').addEventListener('input', onCdChange);
  setManualEnabled(false);

  document.querySelector('#gerar').addEventListener('click', gerar);
  document.querySelector('#imprimir').addEventListener('click', () => window.print());

  // Add real-time matricula validation
  const matriculaInput = $('#matricula');
  if (matriculaInput) {
    let validationTimeout = null;

    matriculaInput.addEventListener('input', (e) => {
      if (validationTimeout) clearTimeout(validationTimeout);
      window.UserValidation.clearFieldError(matriculaInput);
      const matricula = e.target.value.trim();

      if (!matricula) {
        window.UserValidation.clearCurrentUser();
        return;
      }

      validationTimeout = setTimeout(() => {
        const validation = window.UserValidation.validateMatricula(matricula);
        if (validation.valid && validation.user) {
          window.UserValidation.setCurrentUser(validation.user);
          console.log('✅ Usuário validado em tempo real:', validation.user.Nome);
        } else {
          window.UserValidation.clearCurrentUser();
        }
      }, 500);
    });

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

  // Configurar event listeners para os controles de configuração
  ['wmm', 'hmm', 'rotacao'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', () => {
        console.log(`🔧 Alterando ${id}:`, el.value);
        setVars();
      });
    }
  });

  // Botão "Aplicar Alterações"
  const aplicarBtn = document.querySelector('#aplicarConfig');
  if (aplicarBtn) {
    aplicarBtn.addEventListener('click', () => {
      console.log('🔧 Aplicando configurações...');
      setVars();

      // Mostrar feedback visual
      aplicarBtn.textContent = '✅ Aplicado!';
      aplicarBtn.style.background = 'linear-gradient(135deg, #10b981, #059669)';

      setTimeout(() => {
        aplicarBtn.textContent = 'Aplicar Alterações';
        aplicarBtn.style.background = '';
      }, 1500);
    });
  }

  setVars();
  console.log('✅ Pedido Direto - Carregamento concluído');
});

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
    window.testUserValidationPedidoDireto = () => {
      console.log('🧪 Testando validação de usuário no módulo pedido-direto...');

      const matriculaInput = document.querySelector('#matricula');
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