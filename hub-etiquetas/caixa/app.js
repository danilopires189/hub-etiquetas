/* ===== Util ===== */
const $ = (sel)=>document.querySelector(sel);
const padLeft = (numStr, len) => (Array(len+1).join('0') + numStr).slice(-len);
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

function setVars(){
  const logoPct = clamp(parseInt($('#logoop').value||'60',10), 0, 100);
  const transPct = clamp(parseInt($('#transpop').value||'30',10), 0, 100);
  $('#logoop').value = logoPct;
  $('#transpop').value = transPct;

  document.documentElement.style.setProperty('--label-w-mm', $('#wmm').value);
  document.documentElement.style.setProperty('--label-h-mm', $('#hmm').value);
  document.documentElement.style.setProperty('--textcol-mm', $('#colmm').value);
  document.documentElement.style.setProperty('--font-pt', $('#tpt').value);
  document.documentElement.style.setProperty('--logo-mm', $('#logomm').value);
  document.documentElement.style.setProperty('--logo-opacity', (logoPct/100).toFixed(2));
  document.documentElement.style.setProperty('--transp-opacity', (transPct/100).toFixed(2));
  document.body.classList.toggle('print-no-logo', $('#logoPrintOff').checked);
}

/* DV Mod10 (1-3) — pesos alternados a partir do dígito menos significativo: 1,3,1,3... */
function dvMod10_31(base){
  let s = 0, n = base.length;
  for(let i=0;i<n;i++){
    const d = base.charCodeAt(i)-48;
    const w = ((n-1-i)%2===0)?1:3; // 1 no dígito mais à direita
    s += d*w;
  }
  return (10 - (s%10))%10;
}

const sumDigits = s => s.split("").reduce((a,b)=>a + (+b), 0);

/* ===== ITF (Interleaved 2 of 5) ===== */
/* padrões por dígito: n = estreito(1), w = largo(3) */
const ITF_MAP = {
  '0':'nnwwn','1':'wnnnw','2':'nwnnw','3':'wwnnn','4':'nnwnw',
  '5':'wnwnn','6':'nwwnn','7':'nnnww','8':'wnnwn','9':'nwnwn'
};
const NARROW = 1, WIDE = 3;

/* Renderiza ITF em um <svg>. Requer quantidade PAR de dígitos. */
function renderITF(svg, payload){
  if(!/^\d+$/.test(payload)) throw new Error('ITF requer apenas dígitos.');
  if((payload.length % 2)!==0) throw new Error('ITF requer quantidade PAR de dígitos (pares intercalados).');

  const widths = [];
  let quiet = 10;

  // START: barra/espaço/barra/espaço (estreitos)
  widths.push(NARROW, NARROW, NARROW, NARROW);

  // dígitos em pares
  for(let i=0; i<payload.length; i+=2){
    const a = ITF_MAP[payload[i]];
    const b = ITF_MAP[payload[i+1]];
    for(let j=0;j<5;j++){
      widths.push(a[j]==='w'?WIDE:NARROW); // barra
      widths.push(b[j]==='w'?WIDE:NARROW); // espaço
    }
  }

  // STOP: barra larga, espaço estreito, barra estreita
  widths.push(WIDE, NARROW, NARROW);

  const vbW = quiet + widths.reduce((acc,w)=>acc+w,0) + 10;
  const vbH = 100;

  while(svg.firstChild) svg.removeChild(svg.firstChild);
  svg.setAttribute('viewBox', `0 0 ${vbW} ${vbH}`);
  svg.setAttribute('class','barcode');
  svg.setAttribute('xmlns','http://www.w3.org/2000/svg');

  let x = quiet;
  for(let i=0;i<widths.length;i++){
    const w = widths[i];
    if(i % 2 === 0){
      const r = document.createElementNS('http://www.w3.org/2000/svg','rect');
      r.setAttribute('x', x); r.setAttribute('y', 0);
      r.setAttribute('width', w); r.setAttribute('height', vbH);
      r.setAttribute('fill', '#000');
      svg.appendChild(r);
    }
    x += w;
  }
}

/* ===== UI ===== */
function buildLabel({numeroBase, dv, orient, showLogo, showSafeIcon}){
  const label = document.createElement('div');
  label.className = `label ${orient}`;

  const left = document.createElement('div');
  left.className = 'bar-left';
  const svgwrap = document.createElement('div');
  svgwrap.className = 'svgwrap';
  const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
  svgwrap.appendChild(svg);
  left.appendChild(svgwrap);

  const right = document.createElement('div');
  right.className = 'text-right';

  if(showLogo){
    const imgPM = document.createElement('img');
    imgPM.src = 'pm.png';
    imgPM.alt = 'Pague Menos';
    imgPM.className = 'logo';
    right.appendChild(imgPM);
  }

  const legend = document.createElement('div');
  legend.className = 'legend';
  legend.textContent = `${numeroBase}-${dv}`;
  right.appendChild(legend);

  if(showSafeIcon){
    const mark = document.createElement('div');
    mark.className = 'transp-icon';
    right.appendChild(mark);
  }

  label.appendChild(left);
  label.appendChild(right);

  const payload = `${numeroBase}`; // DV somente na legenda
  renderITF(svg, payload);
  return label;
}

function gerar(){
  try{
    setVars();

    const base = $('#base').value.trim();
    if(!/^\d+$/.test(base)){
      alert('Informe apenas dígitos no primeiro número (SEM DV).');
      return;
    }
    const qtd = parseInt($('#qtd').value,10);
    const copias = parseInt($('#copias').value,10);
    const orient = $('#orient').value;
    const showLogo = $('#logo').checked;
    const showSafeIcon = $('#safeicon').checked;

    const out = $('#preview');
    out.innerHTML = '';
    const len = base.length;

    for(let i=0;i<qtd;i++){
      const atual = padLeft(String(parseInt(base,10)+i), len);
      const dv = dvMod10_31(atual);
      const payloadBase = (atual.length % 2 === 0) ? atual : ('0' + atual);
      for(let c=0;c<copias;c++){
        const el = buildLabel({numeroBase: payloadBase, dv, orient, showLogo, showSafeIcon});
        out.appendChild(el);
      }
    }
  }catch(e){
    alert('Erro: ' + e.message);
  }
}

document.addEventListener('DOMContentLoaded', ()=>{
  $('#gerar').addEventListener('click', gerar);
  $('#imprimir').addEventListener('click', ()=> window.print());

  ['wmm','hmm','colmm','tpt','logomm','logoop','transpop','logoPrintOff'].forEach(id=>{
    const el = document.getElementById(id);
    if(el) el.addEventListener('input', setVars);
    if(el) el.addEventListener('change', setVars);
  });

  document.addEventListener('keydown', (ev)=>{
    if((ev.ctrlKey||ev.metaKey) && ev.key.toLowerCase()==='g'){ ev.preventDefault(); gerar(); }
  });

  setVars();
});
