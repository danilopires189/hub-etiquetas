
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
    loadingText: $('#loading-text')
};

// Data Store
const Data = {
    products: new Map(), // BARRAS -> Product Object
    addresses: new Map(), // CODDV -> Array of Address Objects
    isReady: false
};

// Shared Utils
function curDateTime() {
    const now = new Date();
    const d = now.toLocaleDateString('pt-BR');
    const t = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    return `${d}`; // Image only shows date
}

// Initialization
async function init() {
    try {
        ui.loading.style.display = 'flex';
        ui.loadingText.textContent = 'Carregando banco de produtos...';

        // Load CADASTRO
        // Using explicit relative path to avoid 404s on some hostings
        const resCad = await fetch('./BASE_CADASTRO.json');
        if (!resCad.ok) throw new Error(`Falha ao carregar BASE_CADASTRO.json (${resCad.status})`);
        const jsonCad = await resCad.json();

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
        const resEnd = await fetch('./BASE_END.json');
        if (!resEnd.ok) throw new Error(`Falha ao carregar BASE_END.json (${resEnd.status})`);
        const jsonEnd = await resEnd.json();

        ui.loadingText.textContent = 'Indexando endereços...';
        if (jsonEnd.BASE_END) {
            for (const item of jsonEnd.BASE_END) {
                // Only care about PULMÃO type as per requirement
                if (item.TIPO === 'PULMÃO') {
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

function getShortAddress(address) {
    // Address format: PG06.001.019.934
    // We want "PG06.001.019"
    // Remove the last part
    const parts = address.split('.');
    if (parts.length > 1) {
        parts.pop();
        return parts.join('.');
    }
    return address;
}

function generateLabel(product, addressItem) {
    const copies = parseInt(ui.copiesInput.value) || 1;
    const dateStr = curDateTime(); // e.g. 01/12/25
    const codFormatted = formatCODDV(product.CODDV);
    const largeNum = getLargeSuffix(addressItem.ENDERECO);
    const shortAddr = getShortAddress(addressItem.ENDERECO);

    // Create label HTML
    // We render SVG separately
    const labelDiv = document.createElement('div');
    labelDiv.className = 'label-page';

    // We loop for copies
    // Usually each copy is a page or a sticker.
    // Assuming standard thermal printer roll.
    // We will generate ONE label div per copy

    for (let i = 0; i < copies; i++) {
        const item = document.createElement('div');
        item.className = 'label-badge';
        item.innerHTML = `
            <div class="label-header">
                <span class="label-desc">${product.DESC}</span>
                <span class="label-mat">MAT: ???</span>
            </div>
            
            <div class="label-main">
                <div class="label-big-num">${largeNum}</div>
            </div>
            
            <div class="label-footer">
                <div class="label-addr">${shortAddr}</div>
                <div class="label-meta">
                    <div class="label-date">${dateStr}</div>
                    <div class="label-cod">COD: ${codFormatted}</div>
                </div>
            </div>
            <div class="label-barcode-container">
                <svg class="barcode-svg"></svg>
            </div>
        `;

        // Render Barcode
        const svg = item.querySelector('.barcode-svg');
        try {
            // Using ITF for CODDV (digits only)
            // Ensure even length by padding if needed?
            // CODDV "621412" is 6 digits.
            // If odd, pad leading zero? Standard is usually to pad.
            let code = product.CODDV;
            if (code.length % 2 !== 0) code = '0' + code;

            window.BarcodeLib.renderITF(svg, code);
        } catch (e) {
            console.warn('Erro ao gerar barcode', e);
        }

        labelDiv.appendChild(item);
    }

    return labelDiv;
}

function handleSearch(e) {
    e.preventDefault();
    const barcode = ui.barcodeInput.value.trim();
    if (!barcode) return;

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
    // If multiple, picking the FIRST one for now as per "Scan -> Print" flow.
    // Or we could list them in the UI. 
    // Given the automation request, we pick the first valid one.
    // Ideally we'd sort?
    const targetAddress = addressList[0];

    showStatus(`Gerando etiquetas para: ${product.DESC}`, 'success');

    // Clear print area
    ui.print.innerHTML = '';

    // Generate
    const labelEl = generateLabel(product, targetAddress);
    ui.print.appendChild(labelEl);

    // Auto print?
    // "bipa... informar copias... gerara automaticamente"
    // Usually means show it, user confirms via print dialog.
    window.print();

    // Reset focus
    ui.barcodeInput.value = '';
    ui.barcodeInput.focus();
}

function showStatus(msg, type) {
    ui.status.textContent = msg;
    ui.status.className = 'status-msg ' + type;
}

// Events
ui.form.addEventListener('submit', handleSearch);

// Boot
init();
