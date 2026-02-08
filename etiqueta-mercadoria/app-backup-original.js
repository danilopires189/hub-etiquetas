// BACKUP DO APP.JS ORIGINAL - NÃO MODIFICAR
// Este arquivo serve como backup caso precise restaurar

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
    depositoSelect: $('#input-deposito'),
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

// Deposito Protection System
let depositoLocked = false;
let currentDeposito = null;

// Data Store
const Data = {
    products: new Map(), // BARRAS -> Product Object
    addresses: new Map(), // CODDV -> Array of Address Objects
    users: new Map(), // MATRICULA -> User Object
    isReady: false
};

// History Store
let historyData = JSON.parse(localStorage.getItem('mercadoria-history') || '[]');

// Current User State
let currentUser = null;

// Shared Utils
function curDateTime() {
    const now = new Date();
    const d = now.toLocaleDateString('pt-BR');
    const t = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    return `${d} ${t}`;
}

/**
 * Aguardar supabaseManager estar disponível (carregado como ES module)
 * @param {number} timeoutMs - Tempo máximo de espera (default: 5000ms)
 * @returns {Promise<object|null>}
 */
async function waitForSupabaseManager(timeoutMs = 5000) {
    const startTime = Date.now();

    while (!window.supabaseManager && Date.now() - startTime < timeoutMs) {
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    if (window.supabaseManager) {
        console.log('✅ supabaseManager detectado e disponível (etiqueta-mercadoria)');
        return window.supabaseManager;
    } else {
        console.warn('⚠️ supabaseManager não carregou a tempo (etiqueta-mercadoria)');
        return null;
    }
}

// Label Description Formatting Utils
const LABEL_CONFIG = {
    description: {
        defaultFontSize: 11, // pt (10pt para 11pt)
        minFontSize: 4,      // Reduced to allow smaller text
        maxLines: 2,
        fontWeight: 800,
        fontFamily: 'Arial, sans-serif',
        containerWidth: 210  // Reduced to 210px to account for approx 110px metadata float (320px total - 110px)
    }
};

// Cache para resultados de formatação
const descriptionFormatCache = new Map();

// Elemento reutilizável para medição de texto (performance)
let measureElement = null;

// ... resto do arquivo original seria copiado aqui
