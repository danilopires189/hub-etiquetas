/* ===== Helpers & Base ===== */
const $ = (sel)=>document.querySelector(sel);
const pad = (n, len)=> (Array(len+1).join('0') + String(n)).slice(-len);
const onlyDigits = (s)=> String(s||'').replace(/\D+/g,'');

// Exibição como inteiro (sem zeros à esquerda), com fallback
const toIntStr = (v, fallback=0) => {
  const d = onlyDigits(v);
  return d ? String(Number(d)) : String(Number(fallback));
};

// Fallback embutido (injetado no index.html)
let BASE = window.BASE_EMBED || { cds:[], lojas:{}, rotas:{} };

async function loadBase(){
  try{
    const resp = await fetch('base.json', {cache:'no-store'});
    if(resp.ok){
      BASE = await resp.json();
    }
  }catch(e){
    console.warn('Base via fetch indisponível, usando embutida.');
  }
  fillCDList();
}

function fillCDList(){
  const dc = document.getElementById('listCD');
  if(!dc) return;
  const cds = (BASE.cds||[]).slice().sort((a,b)=>Number(a)-Number(b));
  dc.innerHTML = cds.map(cd=>`<option value="${cd}"></option>`).join('');
}

function setVars(){
  document.documentElement.style.setProperty('--label-w-mm', $('#wmm').value || 92.5);
  document.documentElement.style.setProperty('--label-h-mm', $('#hmm').value || 50);
}

function leap(y){ return (y%4===0 && y%100!==0) || (y%400===0); }

function pedidoToDateStr(pedido7){
  const s = onlyDigits(pedido7);
  if(s.length !== 7) return null;
  const ano = Number(s.slice(0,4));
  const ddd = Number(s.slice(4,7));
  const maxDDD = leap(ano) ? 366 : 365;
  if(ano < 2024 || ano > (new Date()).getFullYear()) return null;
  if(ddd < 1 || ddd > maxDDD) return null;
  const d = new Date(ano, 0, 1);
  d.setDate(ddd);
  const dd = pad(d.getDate(),2);
  const mm = pad(d.getMonth()+1,2);
  return `${dd}/${mm}/${ano}`;
}

function parseId(id){
  const s = onlyDigits(id);
  if(s.length !== 23) throw new Error('ID deve ter 23 dígitos.');
  const ano = Number(s.slice(1,5));
  if(ano < 2024 || ano > (new Date()).getFullYear()) throw new Error('Ano do pedido inválido no ID.');
  return {
    cd: s.slice(0,1),
    pedido: s.slice(1,8),
    seq: s.slice(8,11),
    loja: s.slice(11,15),
    rota: s.slice(15,18),
    vol: s.slice(18,23)
  };
}

function buildId({cd, pedido, seq, loja, rota, vol}){
  const parts = {
    cd: pad(onlyDigits(cd),1).slice(-1), // último dígito
    pedido: pad(onlyDigits(pedido),7),
    seq: pad(onlyDigits(seq),3),
    loja: pad(onlyDigits(loja),4),
    rota: pad(onlyDigits(rota),3),
    vol: pad(onlyDigits(vol),5),
  };
  const s = parts.cd + parts.pedido + parts.seq + parts.loja + parts.rota + parts.vol;
  if(s.length !== 23) throw new Error('ID gerado não possui 23 dígitos.');
  if(!pedidoToDateStr(parts.pedido)) throw new Error('PEDIDO (AAAADDD) inválido.');
  return s;
}

function getRotaDesc(cd, n){
  const c = String(Number(cd||0));
  const k = pad(onlyDigits(n),3);
  const map = (BASE.rotas && BASE.rotas[c]) || {};
  return map[k] ? `ROTA ${k} - ${map[k]}` : `ROTA ${k}`;
}
function getLojaDesc(cd, n){
  const c = String(Number(cd||0));
  const k = pad(onlyDigits(n),4);
  const map = (BASE.lojas && BASE.lojas[c]) || {};
  return map[k] ? `${Number(n)} - ${map[k]}` : String(Number(n||0));
}

/* ===== UI ===== */
function montarEtiqueta({cd, loja, pedido, seq, rota, volAtual, volTotal, matricula, id, numeroVolumeStr}){
  const wrap = document.createElement('div');
  wrap.className = 'labelwrap';

  const rotSel = $('#rotacao').value;
  wrap.classList.add(rotSel === '90' ? 'rot90' : (rotSel==='180' ? 'rot180' : (rotSel==='270' ? 'rot270' : 'rot0')));

  const el = document.createElement('div');
  el.className = 'label';

  // HEADER
  const header = document.createElement('div');
  header.className = 'header';
  const leftTitle = document.createElement('div');
  leftTitle.className = 'title';
  leftTitle.textContent = `VOLUMES TERMOLÁBEIS CD ${Number(cd||0)}`;
  const logos = document.createElement('div');
  logos.className = 'logos';
  const img1 = document.createElement('img'); img1.src = 'pm.png'; img1.alt = 'Pague Menos'; img1.className='brand-logo pm';
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
  function addRow(lbl, val){
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
  const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
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
  if(qsel){
    qsel.addData(String(id));
    qsel.make();
    const img = qsel.createImgTag(3, 8);
    const tmp = document.createElement('div'); tmp.innerHTML = img;
    const qimg = tmp.querySelector('img');
    const c = document.createElement('canvas');
    const size = 260; c.width = size; c.height = size;
    const ctx = c.getContext('2d');
    const timg = new Image();
    timg.onload = ()=>{ ctx.drawImage(timg, 0, 0, size, size); };
    timg.src = qimg.src;
    qrbox.appendChild(c);
  }else{
    const fallback = document.createElement('div'); fallback.textContent = 'QR'; qrbox.appendChild(fallback);
  }
  right.appendChild(qrbox);

  const vbox = document.createElement('div');
  vbox.className = 'volume-box';

  const vt = document.createElement('div');
  vt.className='t';
  vt.textContent='VOLUME';

  const vb = document.createElement('div');
  vb.className='big';
  vb.textContent = `${volAtual}/${volTotal}`;

  vbox.append(vt, vb);

  // Exibir "NÚMERO:" apenas quando houver fracionamento (mais de 1 volume)
  if(Number(volTotal) > 1){
    const vn = document.createElement('div');
    vn.className='mini';
    vn.textContent = `NÚMERO: ${toIntStr(numeroVolumeStr, volAtual)}`;
    vbox.appendChild(vn);

    const vf = document.createElement('div');
    vf.className='mini';
    vf.textContent = 'VOLUME FRACIONADO';
    vbox.appendChild(vf);
  }else{
    const vs = document.createElement('div');
    vs.className='mini';
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
  const dd = pad(now.getDate(),2), mm = pad(now.getMonth()+1,2), aa = now.getFullYear();
  const hh = pad(now.getHours(),2), mi = pad(now.getMinutes(),2);
  meta.innerHTML = `<span>CD: <strong>${Number(cd||0)}</strong></span>` +
                   (matricula ? `<span>MATRÍCULA: <strong>${matricula}</strong></span>` : '') +
                   `<span>SEPARADO EM: <strong>${dd}/${mm}/${aa} ${hh}:${mi}</strong></span>`;
  el.appendChild(meta);

  // render barcode
  if(window.JsBarcode){
    JsBarcode(svg, id, {format:'CODE128', displayValue:false, margin:0, width: 1, height: 42});
  }else{
    const t = document.createElementNS('http://www.w3.org/2000/svg','text');
    t.setAttribute('x','0'); t.setAttribute('y','20'); t.textContent = id;
    svg.appendChild(t);
  }

  wrap.appendChild(el);
  return wrap;
}

function setManualEnabled(enabled){
  ['loja','pedido','seq','rota','numeroVolume'].forEach(id=>{
    const el = document.getElementById(id);
    el.disabled = !enabled;
  });
}

function onCdChange(){
  const cdVal = $('#cd').value.trim();
  const ok = /^[1-9]$/.test(cdVal);
  setManualEnabled(ok);

  const c = String(Number(cdVal||0));
  const lojas = (BASE.lojas && BASE.lojas[c]) || {};
  const rotas = (BASE.rotas && BASE.rotas[c]) || {};

  const dlLoja = document.getElementById('listLoja');
  dlLoja.innerHTML = Object.keys(lojas).sort().map(k=>`<option value="${parseInt(k,10)}">${lojas[k]}</option>`).join('');

  const dlRota = document.getElementById('listRota');
  dlRota.innerHTML = Object.keys(rotas).sort().map(k=>`<option value="${parseInt(k,10)}">${rotas[k]}</option>`).join('');
}

function gerar(){
  try{
    setVars();
    const preview = $('#preview');
    preview.innerHTML = '';

    const usaId = $('#modoId').checked;
    const totalVol = Math.max(1, parseInt($('#qtdVolumes').value||'1',10));
    const mat = $('#matricula').value.trim();
    const numVolInput = onlyDigits(document.getElementById('numeroVolume') ? document.getElementById('numeroVolume').value : '');
    const etiquetas = [];

    if(usaId){
      const idRaw = onlyDigits($('#idEtiqueta').value);
      const parsed = parseId(idRaw); // valida e já quebra campos
      const idFixo = idRaw;          // ID permanece fixo em todas as etiquetas

      // Base para mostrar NÚMERO (somente exibição)
      const base4 = numVolInput ? Number(String(numVolInput).slice(-4)) : Number(String(parsed.vol).slice(-4));

      for(let v=1; v<=totalVol; v++){
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
    }else{
      const cd = $('#cd').value;
      if(!/^[1-9]$/.test(cd)) throw new Error('Informe o CD (1 a 9) para liberar os demais campos.');

      const loja = $('#loja').value;
      const pedido = $('#pedido').value;
      const seq = $('#seq').value;
      const rota = $('#rota').value;

      if(!pedidoToDateStr(pedido)) throw new Error('PEDIDO (AAAADDD) inválido. Ex.: 2024269');

      const baseNum5 = numVolInput ? pad(Number(numVolInput), 5) : '00001';
      const idFixo = buildId({cd, pedido, seq, loja, rota, vol: baseNum5}); // ID fixo

      const base4 = Number(baseNum5.slice(-4)); // para exibição
      for(let v=1; v<=totalVol; v++){
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
  }catch(e){
    alert('Erro: ' + e.message);
  }
}


document.addEventListener('DOMContentLoaded', async ()=>{
  await loadBase();

  const toggle = ()=>{
    const usaId = $('#modoId').checked;
    $('#blocoId').className = usaId ? 'blocovis' : 'blocohide';
    $('#blocoCampos').className = usaId ? 'blocohide' : 'blocovis';
    if(!usaId) onCdChange();
  };
  $('#modoId').addEventListener('change', toggle);
  $('#modoCampos').addEventListener('change', toggle);
  toggle();

  $('#cd').addEventListener('input', onCdChange);
  setManualEnabled(false);

  $('#gerar').addEventListener('click', gerar);
  $('#imprimir').addEventListener('click', ()=> window.print());

  ['wmm','hmm','rotacao'].forEach(id=>{
    const el = document.getElementById(id);
    if(el) el.addEventListener('input', setVars);
  });
  setVars();
});
