
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
    marginTopInput: $('#input-margin-top'),
    marginLeftInput: $('#input-margin-left')
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
    const matricula = ui.matriculaInput.value.trim() || '---';
    const dateStr = curDateTime(); // e.g. 01/12/25 00:00
    const codFormatted = formatCODDV(product.CODDV);
    const largeNum = getLargeSuffix(addressItem.ENDERECO);
    const shortAddr = getShortAddress(addressItem.ENDERECO);

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
                <div class="label-barcode-container">
                    <svg class="barcode-svg" preserveAspectRatio="none"></svg>
                </div>
            </div>
            
            <div class="label-row-bottom">
                <div class="label-addr">${shortAddr}</div>
                <div class="label-info-right">
                    <div class="label-txt">MAT: ${matricula}</div>
                    <div class="label-txt">COD: ${codFormatted}</div>
                </div>
            </div>
        `;

        // Render Barcode
        const svg = item.querySelector('.barcode-svg');
        try {
            // Using ITF for CODDV (digits only)
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
    const matricula = ui.matriculaInput.value.trim();

    if (!matricula) {
        showStatus('Informe a matrícula!', 'warning');
        ui.matriculaInput.focus();
        return;
    }

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

    // Apply Print Adjustments
    const mt = ui.marginTopInput.value.replace(',', '.') || '0';
    const ml = ui.marginLeftInput.value.replace(',', '.') || '0';
    document.documentElement.style.setProperty('--print-mt', mt + 'mm');
    document.documentElement.style.setProperty('--print-ml', ml + 'mm');

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
