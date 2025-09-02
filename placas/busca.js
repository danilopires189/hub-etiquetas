
/* ====== Pro refinements ====== */
// Utilidade: escapar HTML seguro
function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, (c)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function words(q){ return q.toLowerCase().trim().split(/\s+/).filter(Boolean); }
function highlight(text, q){
  if(!q) return escapeHtml(text);
  const ds = normalizeDigits(q);
  const tokens = (ds && /\d/.test(q)) ? [ds] : words(q);
  let html = escapeHtml(text);
  for(const t of tokens){
    if(!t) continue;
    const re = new RegExp('(' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig');
    html = html.replace(re, '<mark>$1</mark>');
  }
  return html;
}
function copyToClipboard(txt){
  try{ navigator.clipboard.writeText(txt); toast('Copiado!'); }catch(e){ alert('Copie manualmente:\n'+txt); }
}
function toast(msg){
  let t = document.createElement('div');
  t.className = 'toast'; t.textContent = msg;
  Object.assign(t.style,{position:'fixed',right:'12px',bottom:'12px',background:'#111827',color:'#fff',padding:'8px 10px',borderRadius:'8px',fontSize:'12px',opacity:'0.95',zIndex:9999});
  document.body.appendChild(t); setTimeout(()=> t.remove(), 1500);
}
function tipoBarras(len){ return len===13?'EAN‑13':(len===14?'ITF‑14':(len===8?'EAN‑8':'—')); }
/* ====== Config (ajustável) ====== */
let SPACE_SCALE = 1.35; // aumenta apenas os ESPAÇOS entre barras
const QUIET_ZONE = 14;  // quiet zone (módulos) à esquerda/direita

/* ====== Util ====== */
const $ = (sel)=>document.querySelector(sel);
const $$ = (sel)=>Array.from(document.querySelectorAll(sel));

function nowStr(){
  const d = new Date();
  const pad = (n)=>String(n).padStart(2,'0');
  return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function normalizeDigits(s){ return (s||'').replace(/\D+/g,''); }
function containsAllWords(text, query){
  const q = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const t = (text||'').toLowerCase();
  return q.every(w=>t.includes(w));
}
function debounce(fn, ms){
  let t; return (...args)=>{ clearTimeout(t); t = setTimeout(()=>fn(...args), ms); };
}

/* ====== Data ====== */
let DATA = []; // [{COD, DV, DESC, BARRAS}]
let CURRENT_IDX = null;

async function tryFetchJSON(path){
  try{
    const url = path + (path.includes('?') ? '&' : '?') + 't=' + Date.now();
    const res = await fetch(url, {cache:'no-store'});
    if(!res.ok) throw new Error(res.statusText||'HTTP ' + res.status);
    return await res.json();
  }catch(err){
    console.warn('Fetch falhou (file:// ou offline).', err);
    return null;
  }
}

function applyDataObject(obj, remember=true){
  const arr = Array.isArray(obj) ? obj : Object.values(obj||{});
  DATA = arr.filter(Boolean).map(r=>({
    COD: String(r.COD||'').trim(),
    DV: String(r.DV||'').trim(),
    DESC: String(r.DESC||r.DESCRICAO||'').trim(),
    BARRAS: String(r.BARRAS||'').trim(),
  }));
  if(remember){
    try{ localStorage.setItem('DP_BASE_JSON', JSON.stringify(obj)); }catch(e){}
  }
  $('#status').textContent = `Base: ${DATA.length.toLocaleString('pt-BR')} itens`;
  document.querySelector('.file-btn').style.display = 'none';
  $('#status').style.display = 'none';
}

async function loadData(){
  $('#status').textContent = 'Carregando base…';
  let obj = await tryFetchJSON(window.BARRAS_JSON_PATH);
  if(!obj){
    try{
      const saved = localStorage.getItem('DP_BASE_JSON');
      if(saved){ obj = JSON.parse(saved); $('#status').textContent = 'Base restaurada (salva anteriormente).'; }
    }catch(e){}
  }
  if(!obj){
    $('#status').textContent = 'Auto-carregamento falhou. Use "Carregar base".';
    document.querySelector('.file-btn').style.display = '';
    $('#status').style.display = '';
    return;
  }
  applyDataObject(obj, false);
}

/* ====== Hints ====== */
let activeIndex = -1;
function renderHints(list){
  const box = $('#hints');
  const info = $('#matchInfo');
  box.innerHTML = '';
  if(!list.length){ box.hidden = true; if(info){ info.hidden=true; info.textContent=""; } return; }
  const q = $('#q').value;
  list.forEach((r, i)=>{
    const div = document.createElement('div');
    div.className = 'hint-item' + (i===activeIndex?' active':'');
    div.dataset.idx = r.__idx;
    div.innerHTML = `<span class="hint-cod">${highlight(r.COD||'', q)}</span>
      <span class="hint-barras">${highlight(r.BARRAS||'', q)}</span>
      <span class="hint-desc">${highlight(r.DESC||'', q)}</span>`;
    div.addEventListener('click', ()=> selectByIdx(r.__idx));
    box.appendChild(div);
  });
  box.hidden = false; if(info){ info.hidden=false; info.textContent = `${list.length} resultado${list.length>1?'s':''}…`; }
}
function findMatches(q){
  q = q.trim();
  if(!q) return [];
  const digits = normalizeDigits(q);
  const isDigits = digits.length>=3 && /^\d+$/.test(digits);
  const scored = [];
  for(let i=0;i<DATA.length;i++){
    const r = DATA[i];
    const cod = r.COD||'';
    const barras = r.BARRAS||'';
    const desc = r.DESC||'';
    let score = -1;
    if(isDigits){
      if(cod.startsWith(digits)) score = 100 - Math.min(99, cod.length);
      else if(barras.startsWith(digits)) score = 95 - Math.min(99, barras.length);
      else if(cod.includes(digits) || barras.includes(digits)) score = 70;
    }else{
      if(containsAllWords(desc, q)) score = 60 + Math.min(10, q.length);
    }
    if(score>=0){ scored.push({ ...r, __score: score, __idx: i }); }
  }
  scored.sort((a,b)=> b.__score - a.__score);
  return scored.slice(0, 50);
}
const onType = debounce(()=>{
  const q = $('#q').value;
  const matches = findMatches(q);
  activeIndex = -1;
  renderHints(matches);
  const showNo = (!matches.length && q.trim().length>0);
  const noEl = $('#noResults'); if(noEl) noEl.hidden = !showNo;
}, 80);
function onKey(ev){
  const items = $$('.hint-item');
  if(ev.key === 'ArrowDown'){
    ev.preventDefault(); activeIndex = Math.min(items.length-1, activeIndex+1); highlightActive(items);
  }else if(ev.key === 'ArrowUp'){
    ev.preventDefault(); activeIndex = Math.max(0, activeIndex-1); highlightActive(items);
  }else if(ev.key === 'Enter'){
    ev.preventDefault();
    if(activeIndex>=0 && items[activeIndex]){ selectByIdx(+items[activeIndex].dataset.idx); }
    else{ const list = findMatches($('#q').value); if(list.length){ selectByIdx(list[0].__idx); } else { const noEl = $('#noResults'); if(noEl) noEl.hidden = false; } }
  }else if(ev.key === 'Escape'){ $('#hints').hidden = true; }
}
function highlightActive(items){
  items.forEach((el,i)=> el.classList.toggle('active', i===activeIndex));
  if(items[activeIndex]) items[activeIndex].scrollIntoView({block:'nearest'});
}

/* ====== Selection ====== */
function selectByIdx(i){
  CURRENT_IDX = i;
  const r = DATA[i];
  if(!r) return;
  $('#hints').hidden = true;
  $('#q').value = `${r.COD} / ${r.BARRAS} / ${r.DESC}`;
  renderCard(r);
}
function renderCard(r){
  $('#card').hidden = false;
  $('#desc').textContent = r.DESC || '(sem descrição)';
  $('#meta').textContent = `COD: ${r.COD}   DV: ${r.DV}`;
  const legend = `
    <span><span class="tag">BARRAS:</span> <span class="mono">${r.BARRAS}</span> <small class="muted">(${tipoBarras((r.BARRAS||'').trim().length)})</small></span>
    <span><span class="tag">Criado em:</span> ${nowStr()}</span>`;
  $('#legend').innerHTML = legend;

  const barras = String(r.BARRAS||'').trim();
  const digits = normalizeDigits(barras);
  const svg = $('#barcodeSvg');
  while(svg.firstChild) svg.removeChild(svg.firstChild);
  svg.setAttribute('preserveAspectRatio','xMinYMid meet');

  try{
    if(digits.length === 13){
      renderEAN13(svg, digits);
    }else if(digits.length === 14){
      renderITF(svg, digits);
    }else if(digits.length === 8){
      renderEAN8(svg, digits);
    }else if(digits.length === 12){
      renderEAN13(svg, '0' + digits);
    }else{
      renderITF(svg, digits.padStart(digits.length % 2 ? digits.length+1 : digits.length, '0'));
    }
  }catch(e){
    const t = document.createElementNS('http://www.w3.org/2000/svg','text');
    t.setAttribute('x','10'); t.setAttribute('y','50');
    t.textContent = 'Falha ao renderizar código: ' + e.message;
    svg.appendChild(t);
  }
}

/* ====== Barcode Renders with SPACE_SCALE ====== */
function drawBits(svg, bits, moduleW, quiet){
  let totalUnits = 0;
  for(let i=0;i<bits.length;i++){
    totalUnits += (bits[i]==='1') ? 1 : SPACE_SCALE;
  }
  const vbW = quiet*2 + totalUnits*moduleW;
  const vbH = 100;
  svg.setAttribute('viewBox', `0 0 ${vbW} ${vbH}`);
  svg.setAttribute('xmlns','http://www.w3.org/2000/svg');
  let x = quiet;
  let i = 0;
  while(i<bits.length){
    if(bits[i]==='1'){
      let run = 0; while(i<bits.length && bits[i]==='1'){ run++; i++; }
      const r = document.createElementNS('http://www.w3.org/2000/svg','rect');
      r.setAttribute('x', x); r.setAttribute('y', 0);
      r.setAttribute('width', run*moduleW); r.setAttribute('height', vbH);
      r.setAttribute('fill','#000'); svg.appendChild(r);
      x += run*moduleW;
    }else{
      let run = 0; while(i<bits.length && bits[i]==='0'){ run++; i++; }
      x += run*moduleW*SPACE_SCALE;
    }
  }
}
const ITF_MAP = {'0':'nnwwn','1':'wnnnw','2':'nwnnw','3':'wwnnn','4':'nnwnw','5':'wnwnn','6':'nwwnn','7':'nnnww','8':'wnnwn','9':'nwnwn'};
const NARROW = 1, WIDE = 3;
function renderITF(svg, payload){
  if(!/^\d+$/.test(payload)) throw new Error('ITF requer apenas dígitos.');
  if(payload.length % 2 !== 0) throw new Error('ITF requer quantidade PAR de dígitos.');
  const widths = [];
  widths.push(NARROW, NARROW, NARROW, NARROW);
  for(let i=0;i<payload.length;i+=2){
    const a = ITF_MAP[payload[i]]; const b = ITF_MAP[payload[i+1]];
    for(let j=0;j<5;j++){ widths.push(a[j]==='w'?WIDE:NARROW); widths.push(b[j]==='w'?WIDE:NARROW); }
  }
  widths.push(WIDE, NARROW, NARROW);
  let total = 0;
  for(let i=0;i<widths.length;i++){ total += (i%2===0 ? widths[i] : widths[i]*SPACE_SCALE); }
  const vbW = QUIET_ZONE + total + QUIET_ZONE;
  const vbH = 100;
  svg.setAttribute('viewBox', `0 0 ${vbW} ${vbH}`);
  svg.setAttribute('xmlns','http://www.w3.org/2000/svg');
  let x = QUIET_ZONE;
  for(let i=0;i<widths.length;i++){
    const w = widths[i];
    if(i%2===0){
      const r = document.createElementNS('http://www.w3.org/2000/svg','rect');
      r.setAttribute('x', x); r.setAttribute('y', 0); r.setAttribute('width', w); r.setAttribute('height', vbH);
      r.setAttribute('fill', '#000'); svg.appendChild(r);
      x += w;
    }else{
      x += w*SPACE_SCALE;
    }
  }
}
const EAN_SET = {
  A: {0:'0001101',1:'0011001',2:'0010011',3:'0111101',4:'0100011',5:'0110001',6:'0101111',7:'0111011',8:'0110111',9:'0001011'},
  B: {0:'0100111',1:'0110011',2:'0011011',3:'0100001',4:'0011101',5:'0111001',6:'0000101',7:'0010001',8:'0001001',9:'0010111'},
  C: {0:'1110010',1:'1100110',2:'1101100',3:'1000010',4:'1011100',5:'1001110',6:'1010000',7:'1000100',8:'1001000',9:'1110100'},
  PARITY: {0:'AAAAAA',1:'AABABB',2:'AABBAB',3:'AABBBA',4:'ABAABB',5:'ABBAAB',6:'ABBBAA',7:'ABABAB',8:'ABABBA',9:'ABBABA'}
};
function eanChecksum12(digits12){
  let s = 0; for(let i=0;i<12;i++){ const n = +digits12[i]; s += (i%2===0)? n : n*3; } return (10 - (s%10))%10;
}
function renderEAN13(svg, digits){
  if(!/^\d{13}$/.test(digits)) throw new Error('EAN-13 requer 13 dígitos.');
  const expect = eanChecksum12(digits.slice(0,12));
  if(expect !== +digits[12]) console.warn('DV EAN-13 divergente:', digits, 'esperado', expect);
  const first = +digits[0];
  const left = digits.slice(1,7);
  const right = digits.slice(7,13);
  const pieces = ['101'];
  const parity = EAN_SET.PARITY[first].split('');
  for(let i=0;i<6;i++){ pieces.push(EAN_SET[parity[i]][+left[i]]); }
  pieces.push('01010');
  for(let i=0;i<6;i++){ pieces.push(EAN_SET.C[+right[i]]); }
  pieces.push('101');
  const bits = pieces.join('');
  drawBits(svg, bits, 1, QUIET_ZONE);
}
const EAN8_A = {0:'0001101',1:'0011001',2:'0010011',3:'0111101',4:'0100011',5:'0110001',6:'0101111',7:'0111011',8:'0110111',9:'0001011'};
const EAN8_C = {0:'1110010',1:'1100110',2:'1101100',3:'1000010',4:'1011100',5:'1001110',6:'1010000',7:'1000100',8:'1001000',9:'1110100'};
function renderEAN8(svg, digits){
  if(!/^\d{8}$/.test(digits)) throw new Error('EAN-8 requer 8 dígitos.');
  const left = digits.slice(0,4), right = digits.slice(4,8);
  const pieces = ['101'];
  for(let i=0;i<4;i++) pieces.push(EAN8_A[+left[i]]);
  pieces.push('01010');
  for(let i=0;i<4;i++) pieces.push(EAN8_C[+right[i]]);
  pieces.push('101');
  const bits = pieces.join('');
  drawBits(svg, bits, 1, QUIET_ZONE);
}

/* ====== PNG – toda a área de impressão ====== */
function mmToPx(mm, dpi=300){ return Math.round(mm * dpi / 25.4); }
function cardToPNG(){
  const card = $('#card');
  if(card.hidden) return;
  const cs = getComputedStyle(document.documentElement);
  const wmm = parseFloat(cs.getPropertyValue('--bc-width-mm')) || 86;
  const hmm = parseFloat(cs.getPropertyValue('--bc-height-mm')) || 22;
  const lmm = parseFloat(cs.getPropertyValue('--bc-left-mm')) || 4;
  const Wmm = 92.5, Hmm = 50;
  const w = mmToPx(Wmm), h = mmToPx(Hmm);
  const style = `
    <style>
      *{box-sizing:border-box;font-family:ui-sans-serif,Segoe UI,Arial,sans-serif;color:#0f172a;}
      .card{width:${Wmm}mm;height:${Hmm}mm;border:1px solid #e6ecff;border-radius:12px;padding:0;margin:0;display:block;overflow:hidden;}
      .card-head{display:flex;justify-content:space-between;align-items:center;border-bottom:1px dashed #e6ecff;padding:6px 8px 4px 8px;}
      .title h1{margin:0;font-size:12px;} .title p{margin:2px 0 0 0;font-size:10px;color:#64748b;}
      .barcode-zone{padding:2mm 0 0 ${lmm}mm;}
      .legend{border-top:1px dashed #e6ecff;padding:2mm 4mm;font-size:10px;display:flex;gap:8px;flex-wrap:wrap;}
      .mono{font-family:ui-monospace,Consolas,monospace;}
      svg{width:${wmm}mm;height:${hmm}mm;display:block;}
    </style>`;
  const head = card.querySelector('.card-head').outerHTML.replace(/<img[^>]+>/g,'');
  const barcode = card.querySelector('#barcodeSvg').outerHTML;
  const legend = card.querySelector('#legend').outerHTML;
  const html = `<div class="card" xmlns="http://www.w3.org/1999/xhtml">
      ${head}
      <section class="barcode-zone">${barcode}</section>
      ${legend}
  </div>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <foreignObject x="0" y="0" width="100%" height="100%">
      ${style}${html}
    </foreignObject>
  </svg>`;
  const img = new Image();
  img.onload = function(){
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0,0,w,h);
    ctx.drawImage(img, 0, 0);
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a'); a.href = url; a.download = `etiqueta_COD_${(DATA[CURRENT_IDX]||{}).COD||''}_DV_${(DATA[CURRENT_IDX]||{}).DV||''}.png`;
    document.body.appendChild(a); a.click(); a.remove();
  };
  const blob = new Blob([svg], {type: 'image/svg+xml'});
  const url = URL.createObjectURL(blob);
  img.src = url;
}

/* ====== Persistência de ajustes ====== */
function applyCfg(cfg){
  if(cfg.wmm) document.documentElement.style.setProperty('--bc-width-mm', cfg.wmm+'mm');
  if(cfg.hmm) document.documentElement.style.setProperty('--bc-height-mm', cfg.hmm+'mm');
  if(cfg.lmm!=null) document.documentElement.style.setProperty('--bc-left-mm', cfg.lmm+'mm');
  if(cfg.space) SPACE_SCALE = Number(cfg.space);
  $('#wmm').value = cfg.wmm || parseInt(getComputedStyle(document.documentElement).getPropertyValue('--bc-width-mm'));
  $('#hmm').value = cfg.hmm || parseInt(getComputedStyle(document.documentElement).getPropertyValue('--bc-height-mm'));
  $('#lmm').value = cfg.lmm ?? parseInt(getComputedStyle(document.documentElement).getPropertyValue('--bc-left-mm'));
  $('#space').value = cfg.space || SPACE_SCALE;
}
function saveCfg(){
  const cfg = {
    wmm: Number($('#wmm').value),
    hmm: Number($('#hmm').value),
    lmm: Number($('#lmm').value),
    space: Number($('#space').value)
  };
  try{ localStorage.setItem('DP_PRINT_CFG', JSON.stringify(cfg)); }catch(e){}
  applyCfg(cfg);
  if(CURRENT_IDX!=null){ renderCard(DATA[CURRENT_IDX]); }
}
function loadCfg(){
  let cfg = {};
  try{ cfg = JSON.parse(localStorage.getItem('DP_PRINT_CFG')||'{}'); }catch(e){}
  applyCfg(cfg);
}

/* ====== Boot ====== */
document.addEventListener('DOMContentLoaded', async()=>{
  loadCfg();
  await loadData();
  $('#q').addEventListener('input', onType);
  $('#q').addEventListener('keydown', onKey);
  $('#btnPrint').addEventListener('click', ()=> window.print());
  const btnB = $('#btnCopyBarras'); if(btnB){ btnB.addEventListener('click', ()=>{ const r=DATA[CURRENT_IDX]||{}; if(r.BARRAS) copyToClipboard(String(r.BARRAS)); }); }
  const btnC = $('#btnCopyCod'); if(btnC){ btnC.addEventListener('click', ()=>{ const r=DATA[CURRENT_IDX]||{}; if(r.COD) copyToClipboard(String(r.COD)); }); }
  // atalhos: Ctrl+K/F2 foco busca, Ctrl+L limpar, Ctrl+P já nativo imprimir
  document.addEventListener('keydown', (e)=>{
    if((e.ctrlKey||e.metaKey) && (e.key.toLowerCase()==='k')){ e.preventDefault(); $('#q').focus(); $('#q').select(); }
    else if(e.key==='F2'){ e.preventDefault(); $('#q').focus(); $('#q').select(); }
    else if((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==='l'){ e.preventDefault(); try{ clearAll(); }catch(_){ const q=$('#q'); if(q){ q.value=''; } } }
  });
  if($('#btnPngFull')) $('#btnPngFull').addEventListener('click', cardToPNG);
  ['wmm','hmm','lmm','space'].forEach(id=> $('#'+id).addEventListener('input', (e)=>{ saveCfg(); const cs = document.documentElement.style; if(id==='wmm') cs.setProperty('--bc-width-mm', e.target.value+'mm'); if(id==='hmm') cs.setProperty('--bc-height-mm', e.target.value+'mm'); if(id==='lmm') cs.setProperty('--bc-left-mm', e.target.value+'mm'); if(id==='space') SPACE_SCALE = Number(e.target.value); }));
  
  // Limpar busca e área de impressão
  function clearAll(){
    const q = $('#q'); if(q){ q.value = ''; }
    const hints = $('#hints'); if(hints){ hints.hidden = true; hints.innerHTML=''; }
    const card = $('#card'); if(card){ card.hidden = true; }
    const noEl = $('#noResults'); if(noEl){ noEl.hidden = true; }
    CURRENT_IDX = null;
  }
  const btnClear = $('#btnClear'); if(btnClear){ btnClear.addEventListener('click', clearAll); }

  $('#fileLoad').addEventListener('change', async (ev)=>{
    const f = ev.target.files && ev.target.files[0];
    if(!f) return;
    const text = await f.text();
    let obj = {};
    try{ obj = JSON.parse(text); }catch(e){ obj = {}; }
    applyDataObject(obj, true);
    onType();
  });
});
