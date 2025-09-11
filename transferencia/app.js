/* ====== Dados dos depósitos (1..9 e 101) ======
   Ajuste aqui caso haja alguma alteração futura. */
const DEPOSITOS = [
  { id: 1,  nome: "CD01 - Fortaleza/CE", cid:"FORTALEZA-CE", razao:"Empreendimentos Pague Menos S/A", uf:"CE",
    endereco:"RUA FRANCISCO CORDEIRO, 300, JACARECANGA - FORTALEZA-CE",
    cep:"60310-400", cnpj:"006.626.253/0124-00" },
  { id: 2,  nome: "CD02 - Hidrolândia/GO", cid:"HIDROLANDIA-GO", razao:"Empreendimentos Pague Menos S/A", uf:"GO",
    endereco:"ROD BR-153, SN, ZONA RURAL - HIDROLANDIA-GO",
    cep:"75340-000", cnpj:"006.626.253/0579-35" },
  { id: 3,  nome: "CD03 - Jaboatão/PE", cid:"JABOATAO-PE", razao:"Empreendimentos Pague Menos S/A", uf:"PE",
    endereco:"RUA RIACHÃO, 807, MURIBECA - JABOATAO-PE",
    cep:"54355-057", cnpj:"006.626.253/0633-15" },
  { id: 4,  nome: "CD04 - Simões Filho/BA", cid:"SIMOES FILHO-BA", razao:"Empreendimentos Pague Menos S/A", uf:"BA",
    endereco:"VIA DE ACESSO II BR-324, 178, CIA SUL - SIMÕES FILHO-BA",
    cep:"43700-000", cnpj:"006.626.253/0875-08" },
  { id: 5,  nome: "CD05 - Contagem/MG", cid:"CONTAGEM-MG", razao:"Empreendimentos Pague Menos S/A", uf:"MG",
    endereco:"RUA SIMÃO ANTÔNIO, 149, CINCÃO - CONTAGEM-MG",
    cep:"32371-610", cnpj:"006.626.253/1198-98" },
  { id: 6,  nome: "CD06 - Benevides/PA", cid:"BENEVIDES-PA", razao:"IMIFARMA PROD FARMA E COSMÉTICOS S.A.", uf:"PA",
    endereco:"ROD BR-316, KM 23/24, S/N, ITAPEPUCU - BENEVIDES-PA",
    cep:"68795-000", cnpj:"004.899.316/0342-84" },
  { id: 7,  nome: "CD07 - São Luís/MA", cid:"SAO LUIZ-MA", razao:"IMIFARMA PROD FARMA E COSMÉTICOS S.A.", uf:"MA",
    endereco:"ROD ENG. EMILIANO MACIEIRA, 1, RIBEIRA - SÃO LUÍS-MA",
    cep:"65095-602", cnpj:"004.899.316/0351-75" },
  { id: 8,  nome: "CD08 - Guarulhos/SP", cid:"GUARULHOS-SP", razao:"IMIFARMA PROD FARMA E COSMÉTICOS S.A.", uf:"SP",
    endereco:"AV. JÚLIA GAIOLLI, 740, ÁGUA CHATA - GUARULHOS-SP",
    cep:"07251-500", cnpj:"004.899.316/0536-61" },
  { id: 9,  nome: "CD09 - Aquiraz/CE", cid:"AQUIRAZ-CE", razao:"IMIFARMA PROD FARMA E COSMÉTICOS S.A.", uf:"CE",
    endereco:"BR-116, KM 23, S/N, CÂMARA - AQUIRAZ-CE",
    cep:"61700-000", cnpj:"004.899.316/0252-93" },
  { id: 101, nome: "CD101 - Parnamirim/RN", cid:"PARNAMIRIM-RN", razao:"Empreendimentos Pague Menos S/A", uf:"RN",
    endereco:"AV. BR-304, 304, PARQUE DE EXPOSIÇÕES - PARNAMIRIM-RN",
    cep:"59146-750", cnpj:"006.626.253/1320-66" }
];

/* ====== Util ====== */
const $  = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
const fmt2 = n => String(n).padStart(2,'0');
const nowStr = () => {
  const d = new Date();
  return `${fmt2(d.getDate())}/${fmt2(d.getMonth()+1)}/${String(d.getFullYear()).slice(-2)}  ${fmt2(d.getHours())}:${fmt2(d.getMinutes())}`;
}
const byId = id => DEPOSITOS.find(d => d.id === Number(id));

/* ====== UI ====== */
function mountSelects(){
  // AJUSTE: exibir somente "CDxx - Nome" (sem o ID à esquerda).
  const opts = [`<option value="" disabled selected>Selecione...</option>`]
    .concat(DEPOSITOS.map(d => `<option value="${d.id}">${d.nome}</option>`))
    .join("");
  $("#origem").innerHTML = opts;
  $("#destino").innerHTML = opts;
}

function validateForm(){
  const origem = $("#origem").value;
  const destino = $("#destino").value;
  const nf = $("#nf").value.trim();
  const serie = $("#serie").value.trim();
  const qtd = Number($("#qtd").value);

  let err = [];
  if(!origem) err.push("Selecione o Depósito origem.");
  if(!destino) err.push("Selecione o Depósito destino.");
  if(origem && destino && origem === destino) err.push("Origem e destino devem ser diferentes.");
  if(!nf) err.push("Informe a Nota Fiscal.");
  if(!serie) err.push("Informe a Série.");
  if(!(qtd >= 1)) err.push("Quantidade de volumes deve ser ≥ 1.");

  return { ok: err.length===0, errors: err, origem, destino, nf, serie, qtd };
}

function generate(){
  const v = validateForm();
  if(!v.ok){
    alert("Corrija os pontos antes de gerar:\n\n• " + v.errors.join("\n• "));
    return;
  }

  const o = byId(v.origem), d = byId(v.destino);
  const preview = $("#preview");
  preview.innerHTML = "";

  const tpl = $("#pageTpl");
  const fracionado = v.qtd > 1;
  const fragilPref = $("#fragil").value;

  for(let i=1;i<=v.qtd;i++){
    const page = tpl.content.cloneNode(true);
    const root = page.querySelector(".page");

    // Lado esquerdo (destino e remetente)
    $(".js-dest-nome", root).textContent = `${d.nome}`;
    $(".js-dest-end", root).textContent  = `${d.endereco}`;
    $(".js-dest-cep", root).textContent  = d.cep;
    $(".js-dest-cnpj", root).textContent = d.cnpj;

    $(".js-orig-nome", root).textContent = `${o.nome}`;
    $(".js-orig-end", root).textContent  = `${o.endereco}`;
    $(".js-orig-cep", root).textContent  = o.cep;
    $(".js-orig-cnpj", root).textContent = o.cnpj;

    $(".js-dt-criacao", root).textContent = nowStr();

    // Lado direito
    $(".js-vol", root).textContent   = `${i}/${v.qtd}`;
    $(".js-nf", root).textContent    = v.nf;
    $(".js-serie", root).textContent = v.serie;

    const tag       = $(".js-tag-fracionado", root);
    const fragilBox = $(".fragil", root);
    const showFragil = (fragilPref === 'on');

    tag.hidden = v.qtd <= 1;
    tag.style.display = v.qtd > 1 ? "inline-block" : "none";
    fragilBox.style.display = showFragil ? "flex" : "none";

    preview.appendChild(page);
  }

  // scroll to preview
  window.scrollTo({ top: $("#preview").offsetTop - 10, behavior:'smooth' });
}

function setup(){
  mountSelects();
  $("#btnGerar").addEventListener("click", generate);
  $("#btnImprimir").addEventListener("click", () => window.print());
  document.addEventListener("keydown", (e)=>{
    if(e.key === "Enter" && (e.ctrlKey || e.metaKey)){ generate(); }
    if(e.key === "p" && (e.ctrlKey || e.metaKey)){ e.preventDefault(); window.print(); }
  });
}

document.addEventListener("DOMContentLoaded", setup);
