
// DOM Elements
const $ = (s) => document.querySelector(s);
const ui = {
    screen: $('#screen-ui'),
    print: $('#print-area'),
    form: $('#form-search'),
    barcodeInput: $('#input-barcode'),
    copiesInput: $('#input-copies'),
    btnGenerate: $('#btn-generate'),
    status: $('#status-msg'),
    loading: $('#loading-overlay'),
    loadingText: $('#loading-text'),
    matriculaInput: $('#input-matricula'),
    widthInput: $('#input-width'),
    heightInput: $('#input-height'),
    preview: $('#screen-preview')
};

// Data Store
const Data = {
    products: new Map(), // BARRAS -> Product Object
    addresses: new Map(), // CODDV -> Array of Address Objects
    isReady: false
};

// History Store
let historyData = JSON.parse(localStorage.getItem('mercadoria-history') || '[]');

// Shared Utils
function curDateTime() {
    const now = new Date();
    const d = now.toLocaleDateString('pt-BR');
    const t = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    return `${d} ${t}`;
}

// Initialization
async function init() {
    try {
        ui.loading.style.display = 'flex';
        ui.loadingText.textContent = 'Carregando banco de produtos...';

        // Load CADASTRO
        // Using explicit relative path to avoid 404s on some hostings
        // Load CADASTRO (Loaded via script tag)
        if (!window.DB_CADASTRO) throw new Error('Base de dados CADASTRO não encontrada. Verifique data_cadastro.js');
        const jsonCad = window.DB_CADASTRO;

        ui.loadingText.textContent = 'Indexando produtos...';
        if (jsonCad.BASE_CADASTRO) {
            for (const item of jsonCad.BASE_CADASTRO) {
                // Ensure we handle leading zeros or strict matching? 
                // Using exact string match for now.
                Data.products.set(item.BARRAS, item);
                // Also map by CODDV just in case? No, flow is scan Barcode.
            }
        }

        ui.loadingText.textContent = 'Carregando banco de endereços...';
        // Load END
        // Load END (Loaded via script tag)
        if (!window.DB_END) throw new Error('Base de dados ENDERECOS não encontrada. Verifique data_end.js');
        const jsonEnd = window.DB_END;

        ui.loadingText.textContent = 'Indexando endereços...';
        if (jsonEnd.BASE_END) {
            for (const item of jsonEnd.BASE_END) {
                // Only care about PULMÃO type as per requirement
                if (item.CODDV) {
                    if (!Data.addresses.has(item.CODDV)) {
                        Data.addresses.set(item.CODDV, []);
                    }
                    Data.addresses.get(item.CODDV).push(item);
                }
            }
        }

        Data.isReady = true;
        ui.loading.style.display = 'none';
        ui.barcodeInput.focus();
        showStatus('Sistema pronto. Bipe o produto.', 'success');

    } catch (err) {
        console.error(err);
        ui.loadingText.textContent = 'Erro ao carregar dados: ' + err.message;
        ui.loadingText.style.color = 'red';
    }
}

// Logic
function formatCODDV(coddv) {
    if (!coddv || coddv.length < 2) return coddv;
    // Format "621412" -> "62141-2"
    return coddv.slice(0, -1) + '-' + coddv.slice(-1);
}

function getLargeSuffix(address) {
    // Address format: PG06.001.019.934
    // We want "934"
    const parts = address.split('.');
    return parts[parts.length - 1];
}

const getPadraoLargeNum = (address) => {
    // Address format: PG06.001.019.934 -> "934"
    const parts = address.split('.');
    return parts[parts.length - 1];
};

const getSeparacaoLargeNum = (address) => {
    // Address format: M205.001... -> "M205" -> "205"
    // m70... -> "m70" -> "070"
    const parts = address.split('.');
    const firstPart = parts[0];
    const match = firstPart.match(/\d+/);
    if (!match) return '000';
    return match[0].padStart(3, '0');
};

function generateLabel(product, addressItem, inputBarcode) {
    const copies = parseInt(ui.copiesInput.value) || 1;
    const matricula = ui.matriculaInput.value.trim() || '---';
    const dateStr = curDateTime(); // e.g. 01/12/25 00:00
    const codFormatted = formatCODDV(product.CODDV);


    // Address formatting is now handled outside
    const { largeNum, shortAddr } = addressItem.formatted;

    // Create label HTML
    const labelDiv = document.createElement('div');
    labelDiv.className = 'label-page';

    for (let i = 0; i < copies; i++) {
        const item = document.createElement('div');
        item.className = 'label-badge';
        item.innerHTML = `
            <div class="label-row-top">
                <div class="label-desc">${product.DESC}</div>
                <div class="label-meta-top">
                    <div>${dateStr}</div>
                </div>
            </div>
            
            <div class="label-row-middle">
                <div class="label-big-num">${largeNum}</div>
                <div class="label-barcode-section">
                    <div class="label-barcode-container">
                        <svg class="barcode-svg" preserveAspectRatio="none"></svg>
                    </div>
                    <div class="label-barcode-cod">COD: ${codFormatted}</div>
                </div>
            </div>
            
            <div class="label-row-bottom">
                <div class="label-addr">
                    ${shortAddr}
                    <span style="font-size: 8pt; font-weight: 600; font-family: sans-serif; margin-left: 6px;">${inputBarcode}</span>
                </div>
                <div class="label-info-right">
                    <div class="label-txt">MAT: ${matricula}</div>
                </div>
            </div>
        `;

        // Render Barcode
        const svg = item.querySelector('.barcode-svg');
        try {
            // Using JsBarcode with CODE128 to allow odd-length barcodes without padding
            // displayValue: false as requested (no legend in image)
            JsBarcode(svg, product.CODDV, {
                format: "CODE128",
                displayValue: false,
                fontSize: 10,
                margin: 3,
                height: 25,
                width: 1.2
            });
        } catch (e) {
            console.warn('Erro ao gerar barcode', e);
        }

        labelDiv.appendChild(item);
    }

    return labelDiv;
}

// Popup Helper
function mostrarPopupSucesso(titulo, subtitulo) {
    const popup = document.createElement('div');
    popup.id = 'popup-sucesso';
    popup.innerHTML = `
        <div class="popup-content">
            <div class="popup-icon">✅</div>
            <div class="popup-text">
                <div class="popup-titulo">${titulo}</div>
                <div class="popup-subtitulo">${subtitulo}</div>
            </div>
        </div>
    `;
    document.body.appendChild(popup);
    setTimeout(() => popup.classList.add('show'), 100);
    setTimeout(() => {
        popup.classList.remove('show');
        setTimeout(() => popup.remove(), 300);
    }, 2000);
}

async function handleSearch(e) {
    e.preventDefault();
    const barcode = ui.barcodeInput.value.trim();
    const matricula = ui.matriculaInput.value.trim();

    if (!matricula) {
        showStatus('Informe a matrícula!', 'warning');
        ui.matriculaInput.focus();
        return;
    }

    if (!barcode) {
        showStatus('Informe o código de barras!', 'warning');
        ui.barcodeInput.focus();
        return;
    }

    // Lookup
    const product = Data.products.get(barcode);

    if (!product) {
        showStatus('Produto não encontrado (BARRAS: ' + barcode + ')', 'error');
        ui.barcodeInput.select();
        return;
    }

    // Found Product, Lookup Address
    const addressList = Data.addresses.get(product.CODDV);

    if (!addressList || addressList.length === 0) {
        showStatus(`Produto encontrado (${product.DESC}), mas SEM endereço de PULMÃO.`, 'warning');
        return;
    }

    // We have addresses.
    // Filter based on Destino
    const destinoType = document.querySelector('input[name="destino"]:checked').value; // 'pulmao' or 'separacao'

    let filteredList = [];
    let targetAddress = null;
    let largeNumVal = '';
    let shortAddrVal = '';

    if (destinoType === 'pulmao') {
        // Mode PULMAO: Filter by TIPO='PULMÃO'
        filteredList = addressList.filter(a => a.TIPO === 'PULMÃO');

        if (filteredList.length === 0) {
            showStatus(`Produto encontrado (${product.DESC}), mas SEM endereço de PULMÃO.`, 'warning');
            return;
        }

        // "no caso de pulmao retono sempre o ultimo endereco"
        targetAddress = filteredList[filteredList.length - 1];

        // Large Num: Suffix
        largeNumVal = getLargeSuffix(targetAddress.ENDERECO);
        // Short Addr: Remove suffix
        const p = targetAddress.ENDERECO.split('.');
        p.pop();
        shortAddrVal = p.join('.');

    } else {
        // Mode SEPARACAO: Filter by TIPO='SEPARACAO'
        filteredList = addressList.filter(a => a.TIPO === 'SEPARACAO');

        if (filteredList.length === 0) {
            showStatus(`Produto encontrado (${product.DESC}), mas SEM endereço de SEPARAÇÃO.`, 'warning');
            return;
        }

        // "retorno o endereço correspondente" -> Assumindo o primeiro
        targetAddress = filteredList[0];

        // Large Num: Suffix (Same as Pulmão)
        largeNumVal = getPadraoLargeNum(targetAddress.ENDERECO);
        const p = targetAddress.ENDERECO.split('.');
        if (p.length > 1) p.pop();
        shortAddrVal = p.join('.');
    }

    // Attach formatted data to addressItem for generation
    targetAddress.formatted = {
        largeNum: largeNumVal,
        shortAddr: shortAddrVal
    };

    showStatus(`Gerando etiquetas para: ${product.DESC} (${destinoType.toUpperCase()})`, 'success');

    // Clear print area
    ui.print.innerHTML = '';

    // Apply Print Adjustments & Dimensions
    const w = ui.widthInput.value || '90';
    const h = ui.heightInput.value || '42';

    document.documentElement.style.setProperty('--print-mt', '0mm');
    document.documentElement.style.setProperty('--label-width', w + 'mm');
    document.documentElement.style.setProperty('--label-height', h + 'mm');

    // Generate Label Element
    const labelEl = generateLabel(product, targetAddress, barcode);

    // 1. Render to Print Area
    ui.print.innerHTML = '';
    ui.print.appendChild(labelEl);

    // 2. Render to Preview Area (Clone)
    ui.preview.innerHTML = '';
    const previewEl = labelEl.cloneNode(true);
    // Remove page-break for preview if needed, or keep as is.
    // We need to re-render barcode in the clone because cloning SVG internal state sometimes fails or is tricky?
    // Actually, deep clone copies SVG structure. But JsBarcode/BarcodeLib might need re-running if they modify DOM.
    // In our case, generateLabel returns fully populated HTML.
    // However, SVG barcodes generated by script might not clone perfectly if they depend on internal state? 
    // The previous implementation used `window.BarcodeLib.renderITF(svg, code)`. 
    // It manipulated the SVG. Cloning should preserve attributes/children.
    ui.preview.appendChild(previewEl);

    // Global Counter & Animation
    try {
        if (window.contadorGlobal) {
            const copies = parseInt(ui.copiesInput.value) || 1;
            console.log(`📊 Incrementando contador: +${copies}`);
            const novoValor = await window.contadorGlobal.incrementarContador(copies, 'mercadoria');
            mostrarPopupSucesso('Etiquetas geradas com sucesso!', `+${copies} etiquetas | Total: ${novoValor.toLocaleString('pt-BR')}`);
        }
    } catch (err) {
        console.error('Erro ao incrementar contador:', err);
    }

    // Auto print?
    // "bipa... informar copias... gerara automaticamente"
    // Usually means show it, user confirms via print dialog.
    // Save to History
    saveHistory({
        desc: product.DESC,
        coddv: product.CODDV,
        barcode: barcode,
        matricula: matricula,
        address: targetAddress.ENDERECO,
        type: destinoType,
        timestamp: new Date().toISOString()
    });

    // Delay print to show animation
    setTimeout(() => {
        window.print();

        // Reset focus after print dialog closes
        ui.barcodeInput.value = '';
        ui.barcodeInput.focus();
    }, 3000);
}

function showStatus(msg, type) {
    ui.status.textContent = msg;
    ui.status.className = 'status-msg ' + type;
}

// Live Dimension Updates (Optional UX improvement)
function updateDimensions() {
    const w = ui.widthInput.value || '90';
    const h = ui.heightInput.value || '42';
    document.documentElement.style.setProperty('--label-width', w + 'mm');
    document.documentElement.style.setProperty('--label-height', h + 'mm');
}

// Events
ui.form.addEventListener('submit', handleSearch);
ui.widthInput.addEventListener('input', updateDimensions);
ui.heightInput.addEventListener('input', updateDimensions);

// History UI Events
$('#historico-btn')?.addEventListener('click', showHistory);
$('#historico-close')?.addEventListener('click', hideHistory);
$('#historico-modal')?.addEventListener('click', (e) => {
    if (e.target === $('#historico-modal')) hideHistory();
});
$('#toggle-search')?.addEventListener('click', () => {
    const s = $('#search-section');
    s.style.display = s.style.display === 'none' ? 'block' : 'none';
    if (s.style.display === 'block') $('#search-input').focus();
});
$('#search-input')?.addEventListener('input', filterHistory);
$('#clear-search')?.addEventListener('click', () => {
    $('#search-input').value = '';
    filterHistory();
});
document.querySelectorAll('input[name="searchType"]').forEach(r => {
    r.addEventListener('change', filterHistory);
});

// History Logic
function saveHistory(item) {
    // Add ID
    item.id = Date.now();

    // Unshift to beginning
    historyData.unshift(item);

    // Limit to 60 days
    const limitDate = new Date();
    limitDate.setDate(limitDate.getDate() - 60);

    // Filter keep only newer than limitDate
    historyData = historyData.filter(h => new Date(h.timestamp) > limitDate);

    localStorage.setItem('mercadoria-history', JSON.stringify(historyData));
}

function showHistory() {
    $('#historico-modal').style.display = 'flex';
    renderHistory(historyData);
    $('#search-section').style.display = 'none';
    $('#search-input').value = '';
}

function hideHistory() {
    $('#historico-modal').style.display = 'none';
}

function renderHistory(list) {
    const container = $('#historico-list');
    container.innerHTML = '';

    if (list.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding: 2rem; color: #999;">Nenhum registro encontrado.</div>';
        return;
    }

    list.forEach(item => {
        const date = new Date(item.timestamp).toLocaleString('pt-BR');
        const div = document.createElement('div');
        div.className = 'historico-item';
        div.innerHTML = `
            <div class="historico-info">
                <div class="historico-primary">${item.desc}</div>
                <div class="historico-secondary">
                    <span>CODDV: ${item.coddv}</span> • 
                    <span>EAN: ${item.barcode || '---'}</span> • 
                    <span>Matrícula: ${item.matricula}</span>
                </div>
                <div class="historico-secondary" style="margin-top: 2px; color: #4b5563;">
                    <span>📍 ${item.address || '---'}</span> • 
                    <span>${(item.type || '').toUpperCase()}</span>
                </div>
                <div class="historico-meta">${date}</div>
            </div>
        `;
        container.appendChild(div);
    });
}

function filterHistory() {
    const term = $('#search-input').value.toLowerCase();
    const type = document.querySelector('input[name="searchType"]:checked').value;

    const filtered = historyData.filter(item => {
        if (!term) return true;

        const dateStr = new Date(item.timestamp).toLocaleString('pt-BR').toLowerCase();

        if (type === 'all') {
            return (item.desc || '').toLowerCase().includes(term) ||
                (item.coddv || '').toLowerCase().includes(term) ||
                (item.matricula || '').toLowerCase().includes(term) ||
                dateStr.includes(term);
        } else if (type === 'matricula') {
            return (item.matricula || '').toLowerCase().includes(term);
        } else if (type === 'coddv') {
            return (item.coddv || '').toLowerCase().includes(term);
        } else if (type === 'descricao') {
            return (item.desc || '').toLowerCase().includes(term);
        } else if (type === 'data') {
            return dateStr.includes(term);
        }
        return true;
    });

    renderHistory(filtered);
}



// Dynamic Instructions
function updateInstructions() {
    const type = document.querySelector('input[name="destino"]:checked').value;
    const target = $('#instruction-target');
    if (target) {
        target.textContent = `O sistema buscará automaticamente o endereço de ${type.toUpperCase()}.`;
    }
}
document.querySelectorAll('input[name="destino"]').forEach(r => {
    r.addEventListener('change', updateInstructions);
});

// Boot
init();
