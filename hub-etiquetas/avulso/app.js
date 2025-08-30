/* ===== Util ===== */
const $ = (sel)=>document.querySelector(sel);
const padLeft = (numStr, len) => (Array(len+1).join('0') + numStr).slice(-len);
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

const DEPOSITO_MAP = {
  '1':'0124','2':'0579','3':'0633','4':'0875','5':'1198','6':'0342','7':'0351','8':'0536','9':'0252'
};

function setVars(){
  const logoPct = clamp(parseInt($('#logoop').value||'100',10), 0, 100);
  const transPct = clamp(parseInt($('#transpop').value||'0',10), 0, 100);
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

/* ============ Código de Barras (CODE128 via JsBarcode) ============ */
function renderCode128(svg, text, opts={}){
  if (window.JsBarcode){
    while(svg.firstChild) svg.removeChild(svg.firstChild);
    svg.setAttribute('class','barcode');
    JsBarcode(svg, text, {
      format:'CODE128',
      displayValue:false,
      margin:0,
      width: 2,      // barras um pouco mais largas (melhor leitura)
      height: 80,    // a altura real é controlada pelo CSS do container
      ...opts
    });
  } else {
    // Fallback simples: escreve no SVG um texto
    while(svg.firstChild) svg.removeChild(svg.firstChild);
    const t = document.createElementNS('http://www.w3.org/2000/svg','text');
    t.setAttribute('x','0'); t.setAttribute('y','20');
    t.textContent = text;
    svg.appendChild(t);
  }
}

/* ============ QR Code (qrcode-generator) ============ */
function renderQR(div, text){
  div.innerHTML = '';
  if (window.qrcode){
    const qr = window.qrcode(4, 'M'); // versão maior e correção média
    qr.addData(text);
    qr.make();
    const svgTag = qr.createSvgTag({cellSize:3, margin:0});
    div.innerHTML = svgTag;
  } else {
    const img = document.createElement('img');
    img.alt = 'QR';
    const u = encodeURIComponent(text);
    img.src = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${u}`;
    div.appendChild(img);
  }
}

function buildLabel({codigoDotted, codigoCompact, orient, depNum, partes, idxParte, matricula}){
  const label = document.createElement('div');
  label.className = `label ${orient}`;

  // ===== Header =====
  const header = document.createElement('div');
  header.className = 'label-header';
  const title = document.createElement('div');
  title.className = 'title';
  title.textContent = `VOLUME AVULSO CD ${depNum}`;
  const logos = document.createElement('div');
  logos.className = 'header-logos';
  const imgPM = document.createElement('img');
  imgPM.src = 'pm.png'; imgPM.alt = 'Pague Menos';
  imgPM.onerror = ()=>{ imgPM.style.display='none'; };
  logos.append(imgPM);
  header.append(title, logos);
  label.appendChild(header);

  // ===== Body =====
  const body = document.createElement('div');
  body.className = 'body';

  // Barras
  const bars = document.createElement('div');
  bars.className = 'bars';
  const svgwrap = document.createElement('div');
  svgwrap.className = 'svgwrap';
  const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
  svgwrap.appendChild(svg);
  const hrtext = document.createElement('div');
  hrtext.className = 'hrtext';
  hrtext.textContent = codigoDotted;
  bars.append(svgwrap, hrtext);

  // QR
  const qrwrap = document.createElement('div');
  qrwrap.className = 'qrwrap';
  const qrDiv = document.createElement('div');
  qrDiv.className = 'qr';
  qrwrap.append(qrDiv);

  // Caixa de volume (fracionamento)
  const vbox = document.createElement('div');
  vbox.className = 'volume-box';
  const vt = document.createElement('div'); vt.className = 'vtitle'; vt.textContent = 'VOLUME';
  const vb = document.createElement('div'); vb.className = 'vbig';   vb.textContent = `${idxParte}/${partes}`;
  const vs = document.createElement('div'); vs.className = 'vsmall'; vs.textContent = (partes>1? 'VOLUME FRACIONADO' : '');
  vbox.append(vt, vb, vs);

  body.append(bars, qrwrap, vbox);
  label.appendChild(body);

  // ===== Meta =====
  const meta = document.createElement('div');
  meta.className = 'meta';
  const now = new Date();
  const mm = padLeft(String(now.getMonth()+1),2);
  const dd = padLeft(String(now.getDate()),2);
  const yy = String(now.getFullYear()).slice(-2);
  const hh = padLeft(String(now.getHours()),2);
  const mi = padLeft(String(now.getMinutes()),2);
  meta.innerHTML = `<span>CD: <strong>${depNum}</strong></span><span>MATRÍCULA: <strong>${matricula||'-'}</strong></span><span>DATA DA CRIAÇÃO: <strong>${dd}/${mm}/20${yy} ${hh}:${mi}</strong></span><span></span>`;
  label.appendChild(meta);

  // Renderizadores
  renderCode128(svg, codigoDotted);
  renderQR(qrDiv, codigoDotted);

  return label;
}

function gerar(){
  try{
    setVars();

    const depo = $('#deposito').value;
    if(!/^[1-9]$/.test(depo)){
      alert('Escolha um depósito entre 1 e 9.');
      return;
    }
    const depCode = DEPOSITO_MAP[depo];
    const depNum = parseInt(depo,10);

    const tipo = ($('#tipo').value||'').toUpperCase();
    if(!tipo){ alert('Selecione o Tipo de Movimentação.'); return; }

    const volRaw = $('#volume').value;
    if(volRaw.trim()===''){ alert('Informe o número do volume.'); $('#volume').focus(); return; }
    const volNum = parseInt(volRaw,10);
    if(Number.isNaN(volNum) || volNum<0 || volNum>99999){ alert('Número do volume deve estar entre 0 e 99999.'); $('#volume').focus(); return; }
    const volStr = padLeft(String(volNum), 5);

    const partes = parseInt($('#fracao').value||'1',10);
    if(partes<1 || partes>99){ alert('Fracionamento deve ser entre 1 e 99.'); return; }

    const matricula = $('#matricula').value.trim();
    if(!matricula){ alert('Informe a Matrícula.'); $('#matricula').focus(); return; }

    const now = new Date();
    const mm = padLeft(String(now.getMonth()+1),2);
    const yy = String(now.getFullYear()).slice(-2); // YY
    const calendario = `${mm}${yy}`;

    // Código final (dotted): DEPO4.MMYY.TIPO.VOLUME5
    const codigoDotted = `${depCode}.${calendario}.${tipo}.${volStr}`;
    // Otimização barras: remove os pontos para reduzir caracteres e permitir otimização do CODE128C nos blocos numéricos
    const codigoCompact = `${depCode}${calendario}${tipo}${volStr}`;

    const orient = 'h'; // orientação travada programaticamente

    const out = $('#preview');
    out.innerHTML = '';

    for(let i=1; i<=partes; i++){
      const el = buildLabel({
        codigoDotted, codigoCompact,
        orient, depNum, partes, idxParte:i, matricula
      });
      out.appendChild(el);
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
