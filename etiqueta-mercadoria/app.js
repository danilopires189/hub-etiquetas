
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
    preview: $('#screen-preview'),
    // Modal Copies
    copiesModal: $('#copies-modal'),
    modalInputCopies: $('#modal-input-copies'),
    btnConfirmCopies: $('#confirm-copies'),
    btnCancelCopies: $('#cancel-copies'),
    // Validity Modal
    validityModal: $('#validity-modal'),
    modalInputValidity: $('#modal-input-validity'),
    btnConfirmValidity: $('#confirm-validity'),
    btnCancelValidity: $('#cancel-validity'),
    checkValidade: $('#check-validade'),
    checkZona: $('#check-zona')
};

let pendingData = null;
let pendingCopies = 1;

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

// Matricula Validation
function validateMatricula(matricula) {
    // Remove any non-numeric characters
    const cleanMatricula = matricula.replace(/\D/g, '');

    // Check if it's 5 or 6 digits
    if (cleanMatricula.length < 5 || cleanMatricula.length > 6) {
        return { valid: false, msg: 'Matrícula inválida!' };
    }

    return { valid: true, cleaned: cleanMatricula };
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

function generateLabel(product, addressItem, inputBarcode, copies = 1, validityDate = null, includeZona = false) {
    const matricula = ui.matriculaInput.value.trim() || '---';
    const dateStr = curDateTime(); // e.g. 01/12/25 00:00
    const codFormatted = formatCODDV(product.CODDV);

    // Address formatting is now handled outside
    const { largeNum, shortAddr } = addressItem.formatted;

    // Create label HTML
    const labelDiv = document.createElement('div');
    labelDiv.className = 'label-page';

    // Zone Label (Optional, first)
    if (includeZona) {
        // Extract zone from address (characters before the first dot, without spaces)
        const zoneText = addressItem.ENDERECO.split('.')[0].replace(/\s+/g, '');

        const item = document.createElement('div');
        item.className = 'label-badge';
        item.innerHTML = `
            <div class="label-row-top">
                <div class="label-meta-top">
                    <div>${dateStr}</div>
                </div>
                <div class="label-desc">${product.DESC}</div>
            </div>
            
            <div class="label-row-middle" style="display: flex; align-items: center; justify-content: flex-start; overflow: hidden;">
                <!-- Maximized Zone Text, No Barcode -->
                <div class="label-big-num" style="font-size: 90pt; width: 100%; text-align: left; line-height: 0.8; letter-spacing: -3px; font-family: 'Arial Black', sans-serif;">${zoneText}</div>
            </div>
            
            <div class="label-row-bottom">
                <div class="label-addr" style="display: flex; align-items: baseline; white-space: nowrap; overflow: hidden;">
                    ${shortAddr.replace(/\s+/g, '')}
                    <span style="font-size: 8pt; font-weight: 600; font-family: sans-serif; margin-left: 6px; display: inline-block;">
                        ${inputBarcode.slice(0, -4)}<span style="font-size: 11pt; font-weight: 800;">${inputBarcode.slice(-4)}</span>
                    </span>
                </div>
                <div class="label-info-right" style="display: flex; flex-direction: column; align-items: flex-end; gap: 2px;">
                    <div class="label-txt">${codFormatted}</div>
                    <div class="label-txt">MAT: ${matricula}</div>
                </div>
            </div>
        `;
        labelDiv.appendChild(item);
    }

    // Validity Label (Optional, second)
    if (validityDate) {
        const item = document.createElement('div');
        item.className = 'label-badge';
        item.innerHTML = `
            <div class="label-row-top">
                <div class="label-meta-top">
                    <div>${dateStr}</div>
                </div>
                <div class="label-desc">${product.DESC}</div>
            </div>
            
            <div class="label-row-middle" style="display: flex; align-items: center; justify-content: flex-start; overflow: hidden;">
                <!-- Maximized Validity Date, No Barcode -->
                <div class="label-big-num" style="font-size: 87pt; width: 100%; text-align: left; line-height: 0.8; letter-spacing: -3px; font-family: 'Arial Black', sans-serif;">${validityDate}</div>
            </div>
            
            <div class="label-row-bottom">
                <div class="label-addr" style="display: flex; align-items: baseline; white-space: nowrap; overflow: hidden;">
                    ${shortAddr.replace(/\s+/g, '')}
                    <span style="font-size: 8pt; font-weight: 600; font-family: sans-serif; margin-left: 6px; display: inline-block;">
                        ${inputBarcode.slice(0, -4)}<span style="font-size: 11pt; font-weight: 800;">${inputBarcode.slice(-4)}</span>
                    </span>
                </div>
                <div class="label-info-right" style="display: flex; flex-direction: column; align-items: flex-end; gap: 2px;">
                    <div class="label-txt">${codFormatted}</div>
                    <div class="label-txt">MAT: ${matricula}</div>
                </div>
            </div>
        `;
        labelDiv.appendChild(item);
    }

    // QR Code Generation
    function renderQR(div, text) {
        div.innerHTML = '';
        if (window.qrcode) {
            // TypeNumber 0 (Auto), ErrorCorrectionLevel 'L' (Low) - for max size/readability
            // Or use type 4, 'M' like avulso if needed. 
            // 'L' is usually enough for simple codes and scans faster/smaller.
            // Avulso uses: window.qrcode(4, 'M');
            const qr = window.qrcode(0, 'M');
            qr.addData(text);
            qr.make();
            const svgTag = qr.createSvgTag({ cellSize: 2, margin: 0 }); // cellSize 2 allows scaling via CSS
            div.innerHTML = svgTag;

            // Adjust SVG to fit container
            const svg = div.querySelector('svg');
            if (svg) {
                svg.style.width = '100%';
                svg.style.height = '100%';
                svg.setAttribute('preserveAspectRatio', 'none'); // Expand to fill
            }
        } else {
            console.error('QR Code library not loaded');
            div.textContent = 'Err: LibMissing';
        }
    }

    for (let i = 0; i < copies; i++) {
        const item = document.createElement('div');
        item.className = 'label-badge';
        item.innerHTML = `
            <div class="label-row-top">
                <div class="label-meta-top">
                    <div>${dateStr}</div>
                </div>
                <div class="label-desc">${product.DESC}</div>
            </div>
            
            <div class="label-row-middle">
                <div class="label-big-num">${largeNum}</div>
                <div class="label-barcode-section">
                    <div class="label-barcode-container" style="justify-content: center;">
                         <div class="qrcode-div" style="height: 60%; aspect-ratio: 1/1;"></div>
                    </div>
                    <div class="label-barcode-label">COD:</div>
                    <div class="label-barcode-cod">${codFormatted}</div>
                </div>
            </div>
            
            <div class="label-row-bottom">
                <div class="label-addr" style="display: flex; align-items: baseline; white-space: nowrap; overflow: hidden;">
                    ${shortAddr.replace(/\s+/g, '')}
                    <span style="font-size: 8pt; font-weight: 600; font-family: sans-serif; margin-left: 6px; display: inline-block;">
                        ${inputBarcode.slice(0, -4)}<span style="font-size: 11pt; font-weight: 800;">${inputBarcode.slice(-4)}</span>
                    </span>
                </div>
                <div class="label-info-right">
                    <div class="label-txt">MAT: ${matricula}</div>
                </div>
            </div>
        `;

        // Render QR Code (using product.CODDV or inputBarcode? 
        // Original code used product.CODDV for barcode: JsBarcode(svg, product.CODDV, ...)
        // User said: "ao inves de gerar barras gerar qr code do memso tamnho"
        const qrDiv = item.querySelector('.qrcode-div');
        try {
            renderQR(qrDiv, product.CODDV);
        } catch (e) {
            console.warn('Erro ao gerar QRCode', e);
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

    // 1. Validate Matricula
    if (!matricula) {
        showStatus('⚠️ Informe a matrícula antes de continuar!', 'warning');
        ui.matriculaInput.focus();
        ui.matriculaInput.style.borderColor = 'red';
        setTimeout(() => ui.matriculaInput.style.borderColor = '', 2000);
        return;
    }

    const matriculaValidation = validateMatricula(matricula);
    if (!matriculaValidation.valid) {
        showStatus('⚠️ ' + matriculaValidation.msg, 'warning');
        ui.matriculaInput.focus();
        ui.matriculaInput.select();
        ui.matriculaInput.style.borderColor = 'red';
        setTimeout(() => ui.matriculaInput.style.borderColor = '', 2000);
        return;
    }

    if (!barcode) {
        showStatus('Informe o código de barras!', 'warning');
        ui.barcodeInput.focus();
        return;
    }

    // 2. Lookup Product
    const product = Data.products.get(barcode);
    if (!product) {
        showStatus('Produto não encontrado (BARRAS: ' + barcode + ')', 'error');
        ui.barcodeInput.select();
        return;
    }

    // 3. Lookup Address
    const addressList = Data.addresses.get(product.CODDV);
    if (!addressList || addressList.length === 0) {
        showStatus(`Produto encontrado (${product.DESC}), mas SEM endereço de PULMÃO.`, 'warning');
        ui.barcodeInput.select();
        return;
    }

    // 4. Resolve Target Address
    const destinoType = document.querySelector('input[name="destino"]:checked').value;
    let filteredList = [], targetAddress = null;
    let largeNumVal = '', shortAddrVal = '';

    if (destinoType === 'pulmao') {
        filteredList = addressList.filter(a => a.TIPO === 'PULMÃO');
        if (filteredList.length === 0) {
            showStatus(`Produto encontrado, mas SEM endereço de PULMÃO.`, 'warning');
            return;
        }
        targetAddress = filteredList[filteredList.length - 1];
        largeNumVal = getLargeSuffix(targetAddress.ENDERECO);
        const p = targetAddress.ENDERECO.split('.');
        p.pop();
        shortAddrVal = p.join('.');
    } else {
        filteredList = addressList.filter(a => a.TIPO === 'SEPARACAO');
        if (filteredList.length === 0) {
            showStatus(`Produto encontrado, mas SEM endereço de SEPARAÇÃO.`, 'warning');
            return;
        }
        targetAddress = filteredList[0];
        largeNumVal = getPadraoLargeNum(targetAddress.ENDERECO);
        const p = targetAddress.ENDERECO.split('.');
        if (p.length > 1) p.pop();
        shortAddrVal = p.join('.');
    }

    targetAddress.formatted = {
        largeNum: largeNumVal,
        shortAddr: shortAddrVal
    };

    // 5. Store Data & Open Modal
    pendingData = {
        product,
        targetAddress,
        barcode,
        matricula,
        destinoType
    };

    openCopiesModal();
}

function openCopiesModal() {
    ui.copiesModal.style.display = 'flex';
    ui.modalInputCopies.value = '1';
    // Timeout needed to ensure element is visible before selection matches
    setTimeout(() => {
        ui.modalInputCopies.focus();
        ui.modalInputCopies.select();
    }, 100);
}

function closeCopiesModal() {
    ui.copiesModal.style.display = 'none';
}

function openValidityModal() {
    ui.validityModal.style.display = 'flex';
    ui.modalInputValidity.value = '';
    setTimeout(() => {
        ui.modalInputValidity.focus();
    }, 100);
}

function closeValidityModal() {
    ui.validityModal.style.display = 'none';
    ui.barcodeInput.focus();
}

async function executePrint(copies, validityDate = null) {
    if (!pendingData) return;
    const { product, targetAddress, barcode, matricula, destinoType } = pendingData;

    // Clear pending
    pendingData = null;

    showStatus(`Gerando etiquetas para: ${product.DESC} (${destinoType.toUpperCase()})`, 'success');

    // Zona is always included since checkbox is disabled and checked
    const includeZona = true;

    // Generate Label
    const labelEl = generateLabel(product, targetAddress, barcode, copies, validityDate, includeZona);

    // Apply Dimensions (Ensure they are set)
    const w = ui.widthInput.value || '90';
    const h = ui.heightInput.value || '42';
    document.documentElement.style.setProperty('--label-width', w + 'mm');
    document.documentElement.style.setProperty('--label-height', h + 'mm');

    // Render
    ui.print.innerHTML = '';
    ui.print.appendChild(labelEl);

    ui.preview.innerHTML = '';
    ui.preview.appendChild(labelEl.cloneNode(true));

    // History
    saveHistory({
        desc: product.DESC,
        coddv: product.CODDV,
        barcode: barcode,
        matricula: matricula,
        address: targetAddress.ENDERECO,
        type: destinoType,
        validity: validityDate,
        zona: includeZona,
        timestamp: new Date().toISOString()
    });

    // Print then Counter
    // Use setTimeout to ensure rendering before print, and make callback async to handle await
    setTimeout(async () => {
        window.print(); // Blocks execution until dialog closes

        // Counter Logic (Runs after dialog closes)
        try {
            if (window.contadorGlobal) {
                // Calculate total labels: copies + validity (if checked) + zona (always 1)
                const totalLabels = copies + (validityDate ? 1 : 0) + 1; // +1 for zona (always included)
                console.log(`📊 Incrementando contador: +${totalLabels}`);
                const novoValor = await window.contadorGlobal.incrementarContador(totalLabels, 'mercadoria');
                mostrarPopupSucesso('Etiquetas geradas com sucesso!', `+${totalLabels} etiquetas | Total: ${novoValor.toLocaleString('pt-BR')}`);
            }
        } catch (err) {
            console.error('Erro ao incrementar contador:', err);
        }

        ui.barcodeInput.value = ''; // Clear after print
        ui.matriculaInput.value = ''; // Clear matricula after print
        ui.barcodeInput.focus();
    }, 100);
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

// Matricula Input Events - Real-time validation and formatting
ui.matriculaInput.addEventListener('input', (e) => {
    // Only allow numeric characters
    let value = e.target.value.replace(/\D/g, '');

    // Limit to 6 characters
    if (value.length > 6) {
        value = value.slice(0, 6);
    }

    e.target.value = value;

    // Visual feedback
    if (value.length > 0) {
        const validation = validateMatricula(value);
        if (validation.valid) {
            e.target.style.borderColor = '#10b981'; // Green
            e.target.style.backgroundColor = '#f0fdf4'; // Light green
        } else {
            e.target.style.borderColor = '#ef4444'; // Red
            e.target.style.backgroundColor = '#fef2f2'; // Light red
        }
    } else {
        e.target.style.borderColor = '';
        e.target.style.backgroundColor = '';
    }
});

ui.matriculaInput.addEventListener('blur', (e) => {
    const value = e.target.value.trim();
    if (value.length > 0) {
        const validation = validateMatricula(value);
        if (!validation.valid) {
            showStatus('⚠️ ' + validation.msg, 'warning');
        }
    }
    // Reset visual feedback on blur
    setTimeout(() => {
        e.target.style.borderColor = '';
        e.target.style.backgroundColor = '';
    }, 2000);
});

// Prevent non-numeric input on keypress
ui.matriculaInput.addEventListener('keypress', (e) => {
    // Allow backspace, delete, tab, escape, enter
    if ([8, 9, 27, 13, 46].indexOf(e.keyCode) !== -1 ||
        // Allow Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
        (e.keyCode === 65 && e.ctrlKey === true) ||
        (e.keyCode === 67 && e.ctrlKey === true) ||
        (e.keyCode === 86 && e.ctrlKey === true) ||
        (e.keyCode === 88 && e.ctrlKey === true)) {
        return;
    }
    // Ensure that it is a number and stop the keypress
    if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
        e.preventDefault();
    }
});

// Modal Events
ui.btnConfirmCopies.addEventListener('click', () => {
    const copies = parseInt(ui.modalInputCopies.value) || 1;
    pendingCopies = copies;

    if (ui.checkValidade.checked) {
        closeCopiesModal();
        openValidityModal();
    } else {
        executePrint(copies);
        closeCopiesModal();
    }
});

ui.btnCancelCopies.addEventListener('click', () => {
    closeCopiesModal();
    ui.barcodeInput.focus();
});

ui.modalInputCopies.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        const copies = parseInt(ui.modalInputCopies.value) || 1;
        pendingCopies = copies;

        if (ui.checkValidade.checked) {
            closeCopiesModal();
            openValidityModal();
        } else {
            executePrint(copies);
            closeCopiesModal();
        }
    }
    if (e.key === 'Escape') closeCopiesModal();
});

// Validity Modal Events
function validateValidityInput(val) {
    if (val.length !== 4) {
        return { valid: false, msg: 'A validade deve ter 4 dígitos (MMAA). Ex: 0126' };
    }
    const month = parseInt(val.slice(0, 2));
    const yearPart = parseInt(val.slice(2));

    if (month < 1 || month > 12) {
        return { valid: false, msg: 'Mês inválido! Digite um mês entre 01 e 12.' };
    }

    const year = 2000 + yearPart;
    const now = new Date();

    // Calculate month difference
    // We compare (Year * 12 + MonthIndex)
    const inputTotalMonths = year * 12 + (month - 1);
    const currentTotalMonths = now.getFullYear() * 12 + now.getMonth();
    const diff = inputTotalMonths - currentTotalMonths;

    if (diff < 5) {
        return { valid: false, msg: 'A validade deve ser de pelo menos 5 meses a partir de hoje.' };
    }
    if (diff > 60) {
        return { valid: false, msg: 'A validade não pode ultrapassar 5 anos.' };
    }

    return { valid: true };
}

ui.btnConfirmValidity.addEventListener('click', () => {
    const val = ui.modalInputValidity.value.replace(/\D/g, '');
    const validation = validateValidityInput(val);

    if (!validation.valid) {
        alert(validation.msg);
        ui.modalInputValidity.select();
        return;
    }

    const formatted = val.slice(0, 2) + '/' + val.slice(2);
    executePrint(pendingCopies, formatted);
    closeValidityModal();
});

ui.btnCancelValidity.addEventListener('click', () => {
    closeValidityModal();
    // Do we go back to copies or cancel everything?
    // "Cancelar" usually means cancel everything.
    ui.barcodeInput.focus();
});

ui.modalInputValidity.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        const val = ui.modalInputValidity.value.replace(/\D/g, '');
        const validation = validateValidityInput(val);

        if (!validation.valid) {
            alert(validation.msg);
            ui.modalInputValidity.select();
            return;
        }

        const formatted = val.slice(0, 2) + '/' + val.slice(2);
        executePrint(pendingCopies, formatted);
        closeValidityModal();
    }
    if (e.key === 'Escape') closeValidityModal();
});

// Global Escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (ui.copiesModal.style.display === 'flex') closeCopiesModal();
        if (ui.validityModal.style.display === 'flex') closeValidityModal();
    }
});

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

// Text Normalization Utility
function normalizeSearchTerm(text) {
    return (text || '').toLowerCase().trim();
}

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
                    ${item.validity ? ` • <span>📅 Val: ${item.validity}</span>` : ''}
                    ${item.zona ? ` • <span>🏷️ Zona</span>` : ''}
                </div>
                <div class="historico-meta">${date}</div>
            </div>
        `;
        container.appendChild(div);
    });
}

function filterHistory() {
    try {
        const term = normalizeSearchTerm($('#search-input').value);
        const type = document.querySelector('input[name="searchType"]:checked').value;

        // Early return for empty search - show all results
        if (!term) {
            renderHistory(historyData);
            return;
        }

        const filtered = historyData.filter(item => {
            try {
                // Normalize all searchable fields with error handling
                const normalizedFields = {
                    desc: normalizeSearchTerm(item.desc),
                    coddv: normalizeSearchTerm(item.coddv),
                    matricula: normalizeSearchTerm(item.matricula),
                    barcode: normalizeSearchTerm(item.barcode),
                    date: ''
                };

                // Safe date formatting with error handling
                try {
                    normalizedFields.date = new Date(item.timestamp).toLocaleString('pt-BR').toLowerCase();
                } catch (dateError) {
                    console.warn('Invalid date format for item:', item.id, dateError);
                    normalizedFields.date = '';
                }

                // Apply filter logic with performance optimization
                switch (type) {
                    case 'all':
                        // Use some() for early termination when match is found
                        return Object.values(normalizedFields).some(field => field.includes(term));
                    case 'ean':
                        return normalizedFields.barcode.includes(term);
                    case 'matricula':
                        return normalizedFields.matricula.includes(term);
                    case 'coddv':
                        return normalizedFields.coddv.includes(term);
                    case 'descricao':
                        return normalizedFields.desc.includes(term);
                    case 'data':
                        return normalizedFields.date.includes(term);
                    default:
                        return true;
                }
            } catch (itemError) {
                console.warn('Error processing history item:', item.id, itemError);
                return false; // Exclude problematic items from results
            }
        });

        renderHistory(filtered);

        // Performance monitoring for large datasets
        if (historyData.length > 1000) {
            console.log(`Search performance: Filtered ${historyData.length} items to ${filtered.length} results`);
        }

    } catch (error) {
        console.error('Error in filterHistory:', error);
        // Fallback: show all data if search fails
        renderHistory(historyData);

        // Show user-friendly error message
        const statusMsg = document.querySelector('#status-msg');
        if (statusMsg) {
            statusMsg.textContent = 'Erro na busca. Mostrando todos os registros.';
            statusMsg.className = 'status-msg warning';
            setTimeout(() => {
                statusMsg.textContent = '';
                statusMsg.className = 'status-msg';
            }, 3000);
        }
    }
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
