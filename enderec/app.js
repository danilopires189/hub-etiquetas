/* ===== Util ===== */
const $ = (sel)=>document.querySelector(sel);
const $$ = (sel)=>Array.from(document.querySelectorAll(sel));
const padLeft = (numStr, len) => (Array(len+1).join('0') + numStr).slice(-len);
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const sanitizeUpper = (s)=> (s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]/g,'');

/* ===== Layout vars ===== */
function setVars(){
  const logoPct = clamp(parseInt($('#logoop').value||'60',10), 0, 100);
  $('#logoop').value = logoPct;

  document.documentElement.style.setProperty('--label-w-mm', $('#wmm').value);
  document.documentElement.style.setProperty('--label-h-mm', $('#hmm').value);
  document.documentElement.style.setProperty('--font-pt', $('#tpt').value);
  document.documentElement.style.setProperty('--logo-mm', $('#logomm').value);
  document.documentElement.style.setProperty('--logo-opacity', (logoPct/100).toFixed(2));
  document.body.classList.toggle('print-no-logo', $('#logoPrintOff').checked);
}

/* ===== Code128 (via JsBarcode) ===== */
function renderCode128(svg, payload){
  JsBarcode(svg, payload, { format: "CODE128", displayValue: false, margin: 0, height: 100, width: 1 });
  svg.classList.add('barcode');
}

/* ===== Prefix range helpers ===== */
function parseAlphaNum(str){
  const m = sanitizeUpper(str).match(/^([A-Z]+)(\d+)?$/);
  if(!m) return null;
  return { alpha: m[1], num: m[2] ? parseInt(m[2],10) : null, width: m[2] ? m[2].length : 0 };
}

function makePrefixList(startStr, endStr){
  const a = parseAlphaNum(startStr);
  if(!a) throw new Error('Prefixo inicial inválido.');

  const list = [];
  if(!endStr || !endStr.trim()){
    list.push(a.alpha + (a.num!==null ? String(a.num).padStart(a.width, '0') : ''));
    return list;
  }

  const b = parseAlphaNum(endStr);
  if(!b) throw new Error('Prefixo final inválido.');

  if(a.alpha !== b.alpha || a.num===null || b.num===null){
    // letras diferentes ou sem parte numérica: gera apenas o inicial
    list.push(a.alpha + (a.num!==null ? String(a.num).padStart(a.width, '0') : ''));
    return list;
  }

  const width = Math.max(a.width, b.width);
  if(b.num < a.num) throw new Error('Prefixo final deve ser maior ou igual ao inicial.');
  for(let n=a.num; n<=b.num; n++){
    list.push(a.alpha + String(n).padStart(width,'0'));
  }
  return list;
}

/* ===== UI Label ===== */
function buildLabel({codigo, orient, showLogo}){
  const label = document.createElement('div');
  label.className = `label ${orient}`;

  const barArea = document.createElement('div');
  barArea.className = 'bar-area';

  const svgwrap = document.createElement('div');
  svgwrap.className = 'svgwrap';
  const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
  svgwrap.appendChild(svg);
  barArea.appendChild(svgwrap);

  const under = document.createElement('div');
  under.className = 'under';

  const legend = document.createElement('div');
  legend.className = 'legend';
  legend.textContent = codigo;
  under.appendChild(legend);

  if(showLogo){
    const imgPM = document.createElement('img');
    imgPM.src = 'pm.png';
    imgPM.alt = 'Pague Menos';
    imgPM.className = 'logo';
    under.appendChild(imgPM);
  }

  label.appendChild(barArea);
  label.appendChild(under);

  renderCode128(svg, codigo);
  return label;
}

/* ===== Lógica PULMÃO =====
   Formato: [PREFIXO].001.COLUNA.NIVEL (com níveis)
   Formato: [PREFIXO].001.COLUNA (sem níveis)
   - NÍVEL: se "T" vira "A0T"; demais "A01..A10".
*/
function montarCodigosPulmao(){
  const prefixIni = $('#prefixIni').value;
  const prefixFim = $('#prefixFim').value;

  const colIni = parseInt($('#colIni').value||'1',10);
  const colFim = parseInt($('#colFim').value||'1',10);
  if(!(colIni>=1 && colIni<=999 && colFim>=1 && colFim<=999 && colFim>=colIni)){
    throw new Error('Intervalo de colunas inválido (1..999) e colFim ≥ colIni.');
  }

  const allBtn = $('#nivAll');
  const marcados = $$('.nivel').filter(n=>n.checked).map(n=>n.value);
  let niveis = marcados;
  // Se botão "Todos" estiver marcado, seleciona todos os níveis
  if(allBtn && allBtn.checked){
    niveis = ['T','1','2','3','4','5','6','7','8','9','10'];
  }

  const prefixes = makePrefixList(prefixIni, prefixFim);
  const lista = [];

  for(const pfx of prefixes){
    for(let c=colIni; c<=colFim; c++){
      const colStr = String(c).padStart(3,'0');
      
      // Se nenhum nível selecionado, gera código sem nível
      if(niveis.length === 0){
        const codigo = `${pfx}.001.${colStr}`;
        lista.push(codigo);
      } else {
        // Comportamento atual: gera código com níveis
        for(const nv of niveis){
          const nivelStr = (nv==='T') ? 'A0T' : ('A' + String(nv).padStart(2,'0'));
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
function montarCodigosEstacao(){
  const prefixIni = $('#prefixIniE').value;
  const prefixFim = $('#prefixFimE').value;
  const livre = sanitizeUpper($('#livreE').value);
  const prefixes = makePrefixList(prefixIni, prefixFim);
  return prefixes.map(pfx => livre ? `${pfx}.${livre}` : pfx);
}

function clearTextFields(container){
  document.querySelectorAll(container + ' input[type="text"]').forEach(i => i.value = '');
}

function gerar(){
  try{
    setVars();

    const tipo = ($('input[name="tipo"]:checked')||{}).value;
    if(!tipo){ alert('Escolha o tipo de etiqueta (Pulmão ou Estação).'); return; }

    const copias = parseInt($('#copias').value||'1',10);
    const orient = $('#orient').value;
    const showLogo = $('#logo').checked;

    const out = $('#preview');
    out.innerHTML = '';

    const codigos = (tipo==='pulmao') ? montarCodigosPulmao() : montarCodigosEstacao();
    codigos.forEach(cod=>{
      for(let i=0;i<copias;i++){
        const el = buildLabel({codigo: cod, orient, showLogo});
        out.appendChild(el);
      }
    });

    if(codigos.length===0){
      alert('Nada para gerar. Confira os campos.');
    }
  }catch(e){
    alert('Erro: ' + e.message);
  }
}

document.addEventListener('DOMContentLoaded', ()=>{
  // tipo -> mostra campos corretos e limpa a anterior
  $$('.type-card input[type="radio"]').forEach(r=>{
    r.addEventListener('change', ()=>{
      const val = ($('input[name="tipo"]:checked')||{}).value;
      $('#pulmaoFields').classList.toggle('hide', val!=='pulmao');
      $('#estacaoFields').classList.toggle('hide', val!=='estacao');
      $('#gerar').disabled = !val;

      // limpa preview e limpa os campos de texto do modo anterior
      $('#preview').innerHTML = '';
      if(val==='pulmao'){ clearTextFields('#estacaoFields'); }
      if(val==='estacao'){ clearTextFields('#pulmaoFields'); }
    });
  });

  // “Todos” marca/desmarca os níveis
  const nivAll = $('#nivAll');
  nivAll && nivAll.addEventListener('change', (ev)=>{
    const allOn = ev.target.checked;
    $$('.nivel').forEach(cb=> cb.checked = allOn);
  });

  $('#gerar').addEventListener('click', gerar);
  $('#imprimir').addEventListener('click', ()=> window.print());

  ['wmm','hmm','tpt','logomm','logoop','logoPrintOff'].forEach(id=>{
    const el = document.getElementById(id);
    if(el) el.addEventListener('input', setVars);
    if(el) el.addEventListener('change', setVars);
  });

  setVars();
});
