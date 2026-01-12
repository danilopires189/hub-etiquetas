/* ===== Shared Barcode Rendering Logic ===== */

// Config
let SPACE_SCALE = 1.35;
const QUIET_ZONE = 14;

// Constants for ITF
const ITF_MAP = { '0': 'nnwwn', '1': 'wnnnw', '2': 'nwnnw', '3': 'wwnnn', '4': 'nnwnw', '5': 'wnwnn', '6': 'nwwnn', '7': 'nnnww', '8': 'wnnwn', '9': 'nwnwn' };
const NARROW = 1, WIDE = 3;

// Constants for EAN
const EAN_SET = {
    A: { 0: '0001101', 1: '0011001', 2: '0010011', 3: '0111101', 4: '0100011', 5: '0110001', 6: '0101111', 7: '0111011', 8: '0110111', 9: '0001011' },
    B: { 0: '0100111', 1: '0110011', 2: '0011011', 3: '0100001', 4: '0011101', 5: '0111001', 6: '0000101', 7: '0010001', 8: '0001001', 9: '0010111' },
    C: { 0: '1110010', 1: '1100110', 2: '1101100', 3: '1000010', 4: '1011100', 5: '1001110', 6: '1010000', 7: '1000100', 8: '1001000', 9: '1110100' },
    PARITY: { 0: 'AAAAAA', 1: 'AABABB', 2: 'AABBAB', 3: 'AABBBA', 4: 'ABAABB', 5: 'ABBAAB', 6: 'ABBBAA', 7: 'ABABAB', 8: 'ABABBA', 9: 'ABBABA' }
};

const EAN8_A = { 0: '0001101', 1: '0011001', 2: '0010011', 3: '0111101', 4: '0100011', 5: '0110001', 6: '0101111', 7: '0111011', 8: '0110111', 9: '0001011' };
const EAN8_C = { 0: '1110010', 1: '1100110', 2: '1101100', 3: '1000010', 4: '1011100', 5: '1001110', 6: '1010000', 7: '1000100', 8: '1001000', 9: '1110100' };

/* ====== Helper Functions ====== */

function drawBits(svg, bits, moduleW, quiet) {
    let totalUnits = 0;
    for (let i = 0; i < bits.length; i++) {
        totalUnits += (bits[i] === '1') ? 1 : SPACE_SCALE;
    }
    const vbW = quiet * 2 + totalUnits * moduleW;
    const vbH = 100;
    svg.setAttribute('viewBox', `0 0 ${vbW} ${vbH}`);
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    let x = quiet;
    let i = 0;
    while (i < bits.length) {
        if (bits[i] === '1') {
            let run = 0;
            while (i < bits.length && bits[i] === '1') { run++; i++; }
            const r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            r.setAttribute('x', x);
            r.setAttribute('y', 0);
            r.setAttribute('width', run * moduleW);
            r.setAttribute('height', vbH);
            r.setAttribute('fill', '#000');
            svg.appendChild(r);
            x += run * moduleW;
        } else {
            let run = 0;
            while (i < bits.length && bits[i] === '0') { run++; i++; }
            x += run * moduleW * SPACE_SCALE;
        }
    }
}

function eanChecksum12(digits12) {
    let s = 0;
    for (let i = 0; i < 12; i++) {
        const n = +digits12[i];
        s += (i % 2 === 0) ? n : n * 3;
    }
    return (10 - (s % 10)) % 10;
}

/* DV Mod10 (1-3) — pesos alternados a partir do dígito menos significativo: 1,3,1,3... */
function dvMod10_31(base) {
    let s = 0, n = base.length;
    for (let i = 0; i < n; i++) {
        const d = base.charCodeAt(i) - 48;
        const w = ((n - 1 - i) % 2 === 0) ? 1 : 3; // 1 no dígito mais à direita
        s += d * w;
    }
    return (10 - (s % 10)) % 10;
}

/* ====== Exported Functions ====== */

function setSpaceScale(scale) {
    SPACE_SCALE = Number(scale);
}

function renderITF(svg, payload) {
    if (!/^\d+$/.test(payload)) throw new Error('ITF requer apenas dígitos.');
    if (payload.length % 2 !== 0) throw new Error('ITF requer quantidade PAR de dígitos.');

    const widths = [];
    widths.push(NARROW, NARROW, NARROW, NARROW);

    for (let i = 0; i < payload.length; i += 2) {
        const a = ITF_MAP[payload[i]];
        const b = ITF_MAP[payload[i + 1]];
        for (let j = 0; j < 5; j++) {
            widths.push(a[j] === 'w' ? WIDE : NARROW);
            widths.push(b[j] === 'w' ? WIDE : NARROW);
        }
    }

    widths.push(WIDE, NARROW, NARROW);

    let total = 0;
    for (let i = 0; i < widths.length; i++) {
        total += (i % 2 === 0 ? widths[i] : widths[i] * SPACE_SCALE);
    }

    const vbW = QUIET_ZONE + total + QUIET_ZONE;
    const vbH = 100;
    svg.setAttribute('viewBox', `0 0 ${vbW} ${vbH}`);
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

    let x = QUIET_ZONE;
    for (let i = 0; i < widths.length; i++) {
        const w = widths[i];
        if (i % 2 === 0) {
            const r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            r.setAttribute('x', x);
            r.setAttribute('y', 0);
            r.setAttribute('width', w);
            r.setAttribute('height', vbH);
            r.setAttribute('fill', '#000');
            svg.appendChild(r);
            x += w;
        } else {
            x += w * SPACE_SCALE;
        }
    }
}

function renderEAN13(svg, digits) {
    if (!/^\d{13}$/.test(digits)) throw new Error('EAN-13 requer 13 dígitos.');

    const expect = eanChecksum12(digits.slice(0, 12));
    if (expect !== +digits[12]) console.warn('DV EAN-13 divergente:', digits, 'esperado', expect);

    const first = +digits[0];
    const left = digits.slice(1, 7);
    const right = digits.slice(7, 13);
    const pieces = ['101'];
    const parity = EAN_SET.PARITY[first].split('');

    for (let i = 0; i < 6; i++) {
        pieces.push(EAN_SET[parity[i]][+left[i]]);
    }
    pieces.push('01010');
    for (let i = 0; i < 6; i++) {
        pieces.push(EAN_SET.C[+right[i]]);
    }
    pieces.push('101');

    const bits = pieces.join('');
    drawBits(svg, bits, 1, QUIET_ZONE);
}

function renderEAN8(svg, digits) {
    if (!/^\d{8}$/.test(digits)) throw new Error('EAN-8 requer 8 dígitos.');

    const left = digits.slice(0, 4);
    const right = digits.slice(4, 8);
    const pieces = ['101'];

    for (let i = 0; i < 4; i++) pieces.push(EAN8_A[+left[i]]);
    pieces.push('01010');
    for (let i = 0; i < 4; i++) pieces.push(EAN8_C[+right[i]]);
    pieces.push('101');

    const bits = pieces.join('');
    drawBits(svg, bits, 1, QUIET_ZONE);
}

// Expose to global scope
window.BarcodeLib = {
    renderITF,
    renderEAN13,
    renderEAN8,
    dvMod10_31,
    setSpaceScale
};
