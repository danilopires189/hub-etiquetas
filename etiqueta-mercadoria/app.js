
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

function getMeasureElement() {
    if (!measureElement) {
        measureElement = document.createElement('div');
        measureElement.style.cssText = `
            position: absolute;
            visibility: hidden;
            pointer-events: none;
            white-space: normal;
            word-wrap: break-word;
            overflow-wrap: break-word;
            word-break: break-all;
            line-height: 1.2;
            padding: 0;
            margin: 0;
            border: none;
            top: -9999px;
            left: -9999px;
        `;
        document.body.appendChild(measureElement);
    }
    return measureElement;
}

function measureTextDimensions(text, fontSize, fontWeight, fontFamily, maxWidth) {
    try {
        const el = getMeasureElement();
        el.style.fontSize = fontSize + 'pt';
        el.style.fontWeight = fontWeight;
        el.style.fontFamily = fontFamily;
        el.style.width = maxWidth + 'px';
        el.textContent = text;

        const rect = el.getBoundingClientRect();
        const lineHeight = fontSize * 1.2; // Aproximação rápida
        const lines = Math.max(1, Math.ceil(rect.height / (lineHeight * 1.333)));

        return {
            width: rect.width,
            height: rect.height,
            lines: lines
        };
    } catch (error) {
        // Fallback rápido: estimativa baseada em caracteres
        const avgCharWidth = fontSize * 0.6;
        const charsPerLine = Math.floor(maxWidth / avgCharWidth);
        const estimatedLines = Math.ceil(text.length / charsPerLine);

        return {
            width: Math.min(text.length * avgCharWidth, maxWidth),
            height: estimatedLines * fontSize * 1.2,
            lines: estimatedLines
        };
    }
}

function calculateOptimalFontSize(text, maxWidth, maxLines, defaultFontSize, minFontSize) {
    const config = LABEL_CONFIG.description;

    // Verificar se o texto cabe com o tamanho padrão
    const defaultMeasurement = measureTextDimensions(
        text,
        defaultFontSize,
        config.fontWeight,
        config.fontFamily,
        maxWidth
    );

    if (defaultMeasurement.lines <= maxLines) {
        return {
            optimalFontSize: defaultFontSize,
            actualLines: defaultMeasurement.lines,
            truncated: false,
            finalText: text
        };
    }

    // Busca binária para encontrar o tamanho ideal
    let low = minFontSize;
    let high = defaultFontSize;
    let bestSize = minFontSize;
    let bestMeasurement = null;

    while (low <= high) {
        // Usar incrementos de 0.5 para maior precisão se necessário
        const mid = Math.floor((low + high) * 2) / 2; // Arredonda para 0.5 mais próximo se quiséssemos, mas binária simples int é ok, vamos manter simples
        const trialSize = Math.floor((low + high) / 2);

        // Se a diferença for pequena, para evitar loop infinito em float
        if (high - low < 1) break;

        const measurement = measureTextDimensions(
            text,
            trialSize,
            config.fontWeight,
            config.fontFamily,
            maxWidth
        );

        if (measurement.lines <= maxLines) {
            bestSize = trialSize;
            bestMeasurement = measurement;
            low = trialSize + 1;
        } else {
            high = trialSize - 1;
        }
    }

    // Tentar busca linear fina para precisão se a binária falhar ou for grossa
    // Vamos garantir que achamos o maior tamanho que cabe
    // Se bestMeasurement ainda é nulo ou estourou, tenta o minFontSize diretamente
    if (!bestMeasurement) {
        bestMeasurement = measureTextDimensions(
            text,
            minFontSize,
            config.fontWeight,
            config.fontFamily,
            maxWidth
        );
        bestSize = minFontSize;
    }

    // Se ainda assim não couber (bestMeasurement.lines > maxLines no tamanho minFontSize)
    // NÃO TRUNCAR. Retornar minFontSize e texto completo.

    return {
        optimalFontSize: bestSize,
        actualLines: bestMeasurement.lines,
        truncated: false,
        finalText: text
    };
}

function formatDescriptionForLabel(description, containerWidth = null) {
    const config = LABEL_CONFIG.description;
    const width = containerWidth || config.containerWidth;

    // Verificar cache primeiro
    const cacheKey = `${description}_${width}`;
    if (descriptionFormatCache.has(cacheKey)) {
        const cached = descriptionFormatCache.get(cacheKey);
        return cached;
    }

    try {
        // Validar entrada
        if (!description || typeof description !== 'string') {
            const fallback = '<div class="label-desc">Produto</div>';
            descriptionFormatCache.set(cacheKey, fallback);
            return fallback;
        }

        const cleanDescription = description.trim();
        if (!cleanDescription) {
            const fallback = '<div class="label-desc">Produto</div>';
            descriptionFormatCache.set(cacheKey, fallback);
            return fallback;
        }

        // Calcular tamanho ideal da fonte
        const result = calculateOptimalFontSize(
            cleanDescription,
            width,
            config.maxLines,
            config.defaultFontSize,
            config.minFontSize
        );

        // Gerar HTML com estilo inline
        const formattedHtml = `<div class="label-desc" style="font-size: ${result.optimalFontSize}pt; line-height: 1.2; font-weight: ${config.fontWeight}; font-family: ${config.fontFamily};">${result.finalText}</div>`;

        // Armazenar no cache (limitar tamanho do cache)
        if (descriptionFormatCache.size > 100) {
            const firstKey = descriptionFormatCache.keys().next().value;
            descriptionFormatCache.delete(firstKey);
        }
        descriptionFormatCache.set(cacheKey, formattedHtml);

        // Log para debug
        if (result.optimalFontSize !== config.defaultFontSize) {
            console.log(`📏 Descrição ajustada: "${cleanDescription.slice(0, 30)}..." | ${config.defaultFontSize}pt → ${result.optimalFontSize}pt | ${result.actualLines} linhas`);
        }

        return formattedHtml;

    } catch (error) {
        console.warn('Erro na formatação da descrição:', error);
        // Fallback para formatação padrão
        const fallback = `<div class="label-desc">${description}</div>`;
        descriptionFormatCache.set(cacheKey, fallback);
        return fallback;
    }
}

function safeFormatDescription(description, containerWidth = null) {
    try {
        return formatDescriptionForLabel(description, containerWidth);
    } catch (error) {
        console.warn('Fallback para formatação padrão da descrição:', error);
        return `<div class="label-desc">${description || 'Produto'}</div>`;
    }
}

// Função para limpar cache quando necessário
function clearDescriptionFormatCache() {
    descriptionFormatCache.clear();
    console.log('🧹 Cache de formatação de descrições limpo');
}

// Testing Functions for Description Formatting
function testDescriptionFormatting() {
    console.log('🧪 Iniciando testes de formatação de descrição...');

    const testCases = [
        {
            name: 'Descrição curta',
            description: 'PRODUTO TESTE',
            expectedFontSize: 10, // Atualizado de 11 para 10
            expectedLines: 1
        },
        {
            name: 'Descrição média',
            description: 'PRODUTO DE TESTE COM DESCRIÇÃO MÉDIA PARA VERIFICAR FORMATAÇÃO',
            expectedFontSize: 'menor que 10', // Atualizado de 11 para 10
            expectedLines: 2
        },
        {
            name: 'Descrição muito longa',
            description: 'PRODUTO DE TESTE COM DESCRIÇÃO EXTREMAMENTE LONGA QUE DEVERIA SER AJUSTADA AUTOMATICAMENTE PARA CABER EM DUAS LINHAS MESMO SENDO MUITO EXTENSA E DETALHADA',
            expectedFontSize: 'menor que 10', // Atualizado de 11 para 10
            expectedLines: 2
        },
        {
            name: 'Descrição extremamente longa',
            description: 'PRODUTO DE TESTE COM DESCRIÇÃO ABSURDAMENTE LONGA QUE MESMO COM FONTE MÍNIMA PODE PRECISAR SER TRUNCADA PARA GARANTIR QUE NÃO SOBREPONHA OUTROS ELEMENTOS DA ETIQUETA E MANTENHA A LEGIBILIDADE ADEQUADA PARA O USUÁRIO FINAL',
            expectedFontSize: 8,
            expectedLines: 2,
            expectedTruncated: true
        },
        {
            name: 'Descrição vazia',
            description: '',
            expectedFallback: true
        },
        {
            name: 'Descrição null',
            description: null,
            expectedFallback: true
        }
    ];

    let passedTests = 0;
    let totalTests = testCases.length;

    testCases.forEach((testCase, index) => {
        try {
            console.log(`\n📋 Teste ${index + 1}: ${testCase.name}`);
            console.log(`   Entrada: "${testCase.description}"`);

            const result = formatDescriptionForLabel(testCase.description);
            console.log(`   Resultado: ${result}`);

            // Verificar se é fallback
            if (testCase.expectedFallback) {
                if (result.includes('Produto')) {
                    console.log('   ✅ Fallback aplicado corretamente');
                    passedTests++;
                } else {
                    console.log('   ❌ Fallback não aplicado quando esperado');
                }
                return;
            }

            // Extrair font-size do resultado
            const fontSizeMatch = result.match(/font-size:\s*(\d+(?:\.\d+)?)pt/);
            if (fontSizeMatch) {
                const fontSize = parseFloat(fontSizeMatch[1]);
                console.log(`   Font-size aplicado: ${fontSize}pt`);

                if (testCase.expectedFontSize === 10 && fontSize === 10) {
                    console.log('   ✅ Font-size padrão mantido');
                    passedTests++;
                } else if (testCase.expectedFontSize === 8 && fontSize === 8) {
                    console.log('   ✅ Font-size mínimo aplicado');
                    passedTests++;
                } else if (typeof testCase.expectedFontSize === 'string' && fontSize < 10) {
                    console.log('   ✅ Font-size reduzido conforme esperado');
                    passedTests++;
                } else {
                    console.log(`   ❌ Font-size inesperado: esperado ${testCase.expectedFontSize}, obtido ${fontSize}`);
                }
            } else {
                console.log('   ❌ Font-size não encontrado no resultado');
            }

            // Verificar truncamento se esperado
            if (testCase.expectedTruncated && result.includes('...')) {
                console.log('   ✅ Texto truncado conforme esperado');
            } else if (testCase.expectedTruncated && !result.includes('...')) {
                console.log('   ⚠️ Truncamento esperado mas não aplicado');
            }

        } catch (error) {
            console.log(`   ❌ Erro no teste: ${error.message}`);
        }
    });

    console.log(`\n📊 Resultado dos testes: ${passedTests}/${totalTests} passaram`);

    if (passedTests === totalTests) {
        console.log('🎉 Todos os testes passaram!');
    } else {
        console.log('⚠️ Alguns testes falharam. Verifique a implementação.');
    }

    return { passed: passedTests, total: totalTests };
}

function testPerformanceDescriptionFormatting() {
    console.log('⚡ Testando performance da formatação de descrição...');

    const longDescription = 'PRODUTO DE TESTE COM DESCRIÇÃO MUITO LONGA PARA TESTAR PERFORMANCE DO SISTEMA DE FORMATAÇÃO AUTOMÁTICA DE FONTE';
    const iterations = 100;

    const startTime = performance.now();

    for (let i = 0; i < iterations; i++) {
        formatDescriptionForLabel(longDescription);
    }

    const endTime = performance.now();
    const totalTime = endTime - startTime;
    const avgTime = totalTime / iterations;

    console.log(`📈 Performance: ${iterations} formatações em ${totalTime.toFixed(2)}ms`);
    console.log(`📈 Tempo médio por formatação: ${avgTime.toFixed(2)}ms`);

    if (avgTime < 5) {
        console.log('✅ Performance adequada (< 5ms por formatação)');
    } else {
        console.log('⚠️ Performance pode ser melhorada (> 5ms por formatação)');
    }

    return { totalTime, avgTime, iterations };
}

function testCacheEfficiency() {
    console.log('💾 Testando eficiência do cache...');

    const testDescription = 'PRODUTO PARA TESTE DE CACHE';

    // Primeira formatação (sem cache)
    const startTime1 = performance.now();
    formatDescriptionForLabel(testDescription);
    const endTime1 = performance.now();
    const timeWithoutCache = endTime1 - startTime1;

    // Segunda formatação (com cache)
    const startTime2 = performance.now();
    formatDescriptionForLabel(testDescription);
    const endTime2 = performance.now();
    const timeWithCache = endTime2 - startTime2;

    console.log(`⏱️ Primeira formatação (sem cache): ${timeWithoutCache.toFixed(2)}ms`);
    console.log(`⏱️ Segunda formatação (com cache): ${timeWithCache.toFixed(2)}ms`);

    const improvement = ((timeWithoutCache - timeWithCache) / timeWithoutCache * 100);
    console.log(`📈 Melhoria com cache: ${improvement.toFixed(1)}%`);

    if (timeWithCache < timeWithoutCache) {
        console.log('✅ Cache funcionando corretamente');
    } else {
        console.log('⚠️ Cache pode não estar funcionando adequadamente');
    }

    return { timeWithoutCache, timeWithCache, improvement };
}

// Função para executar todos os testes
function runAllDescriptionTests() {
    console.log('🚀 Executando todos os testes de formatação de descrição...\n');

    const functionalTests = testDescriptionFormatting();
    console.log('\n' + '='.repeat(50));

    const performanceTests = testPerformanceDescriptionFormatting();
    console.log('\n' + '='.repeat(50));

    const cacheTests = testCacheEfficiency();
    console.log('\n' + '='.repeat(50));

    console.log('\n📋 Resumo dos testes:');
    console.log(`   Funcionais: ${functionalTests.passed}/${functionalTests.total}`);
    console.log(`   Performance: ${performanceTests.avgTime.toFixed(2)}ms média`);
    console.log(`   Cache: ${cacheTests.improvement.toFixed(1)}% melhoria`);

    return {
        functional: functionalTests,
        performance: performanceTests,
        cache: cacheTests
    };
}

// Machine Name Detection - Respect user choice
function getMachineName() {
    try {
        // Check if user has explicitly set a machine name
        const userConfiguredName = localStorage.getItem('real-machine-name');

        // If user configured something (even empty string), respect that choice
        if (localStorage.getItem('machine-name-configured') === 'true') {
            return userConfiguredName ? userConfiguredName.trim().toUpperCase() : '';
        }

        // If not configured yet, return empty string (blank)
        return '';

    } catch (error) {
        console.warn('Erro ao obter nome da máquina:', error);
        return '';
    }
}

// Function to try WebRTC for more detailed network info (async)
function tryWebRTCMachineName() {
    try {
        const pc = new (window.RTCPeerConnection || window.webkitRTCPeerConnection || window.mozRTCPeerConnection)({
            iceServers: []
        });

        pc.createDataChannel('');
        pc.createOffer().then(offer => pc.setLocalDescription(offer));

        pc.onicecandidate = function (ice) {
            if (ice && ice.candidate && ice.candidate.candidate) {
                const candidate = ice.candidate.candidate;
                // Look for local IP addresses that might contain machine info
                const ipMatch = candidate.match(/(\d+\.\d+\.\d+\.\d+)/);
                if (ipMatch) {
                    const ip = ipMatch[1];
                    if (!ip.startsWith('127.') && !ip.startsWith('0.')) {
                        // Generate machine name from IP
                        const ipParts = ip.split('.');
                        const machineName = `NET${ipParts[2]}${ipParts[3]}`;
                        localStorage.setItem('rtc-machine-name', machineName);
                        console.log(`🌐 Nome da máquina detectado via WebRTC: ${machineName}`);
                    }
                }
                pc.close();
            }
        };
    } catch (e) {
        console.log('WebRTC não disponível para detecção de máquina');
    }
}

// Function to allow user to set real machine name (one-time setup)
// Function to allow user to set machine name
function promptForRealMachineName() {
    const currentName = localStorage.getItem('real-machine-name') || '';
    const newName = prompt(
        `Nome atual: ${currentName || '(em branco)'}\n\n` +
        `Digite o nome REAL da sua máquina (ex: GOD008):\n` +
        `Deixe em branco para manter sem nome.`,
        currentName
    );

    // User clicked OK (even if empty) - save the choice
    if (newName !== null) {
        const formattedName = newName ? newName.trim().toUpperCase() : '';
        localStorage.setItem('real-machine-name', formattedName);
        localStorage.setItem('machine-name-configured', 'true');

        if (formattedName) {
            showStatus(`Nome da máquina configurado: ${formattedName}`, 'success');
        } else {
            showStatus('Nome da máquina removido (em branco)', 'success');
        }

        // Update button text
        updateMachineButton();

        return formattedName;
    }

    return currentName;
}

// Function to update machine button display
function updateMachineButton() {
    const machineBtn = $('#config-machine-btn');
    if (machineBtn) {
        const currentName = getMachineName();
        if (currentName) {
            machineBtn.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                    <line x1="8" y1="21" x2="16" y2="21"/>
                    <line x1="12" y1="17" x2="12" y2="21"/>
                </svg>
                ${currentName.length > 8 ? currentName.slice(0, 8) + '...' : currentName}
            `;
            machineBtn.title = `Máquina atual: ${currentName}. Clique para alterar.`;
        } else {
            machineBtn.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                    <line x1="8" y1="21" x2="16" y2="21"/>
                    <line x1="12" y1="17" x2="12" y2="21"/>
                </svg>
                PC
            `;
            machineBtn.title = 'Nenhuma máquina configurada. Clique para configurar.';
        }
    }
}

// Matricula Validation
function validateMatricula(matricula) {
    // Remove any non-numeric characters
    const cleanMatricula = matricula.replace(/\D/g, '');

    // Check if matricula is empty
    if (!cleanMatricula) {
        return { valid: false, msg: 'Matrícula obrigatória', user: null };
    }

    // Check if matricula exists in user database
    const user = Data.users.get(cleanMatricula);
    if (!user) {
        return { valid: false, msg: 'Matrícula não encontrada na base de usuários', user: null };
    }

    return { valid: true, msg: 'Matrícula válida', user: user, cleaned: cleanMatricula };
}

// User Management Functions
function setCurrentUser(user) {
    currentUser = user;
    updateGreeting(user.Nome);
}

function getCurrentUser() {
    return currentUser;
}

function clearCurrentUser() {
    currentUser = null;
    clearGreeting();
}

// Greeting Component Functions
function createGreetingElement() {
    let greetingElement = safeQuerySelector('#user-greeting');
    if (greetingElement) {
        return greetingElement;
    }

    // If element doesn't exist, create it with enhanced error handling
    return gracefulDegradation(() => {
        const newGreeting = document.createElement('div');
        newGreeting.id = 'user-greeting';
        newGreeting.className = 'user-greeting-top'; // Use new class for top positioning
        newGreeting.style.display = 'none';
        newGreeting.innerHTML = '<span class="greeting-text"><span class="greeting-wave" aria-hidden="true">👋</span> Olá, Usuário</span>';

        // Insert above the header
        const screenContainer = safeQuerySelector('#screen-ui');
        const header = safeQuerySelector('.app-header');

        if (validateElement(screenContainer, 'screen container') && validateElement(header, 'header')) {
            screenContainer.insertBefore(newGreeting, header);
            console.log('✅ Elemento de saudação criado acima do header');
        } else {
            // Fallback: append to body if structure is broken
            document.body.appendChild(newGreeting);
            console.warn('⚠️ Elemento de saudação adicionado ao body como fallback');
        }

        return newGreeting;
    }, () => {
        // Ultimate fallback: create a minimal element
        console.error('❌ Falha ao criar elemento de saudação, usando fallback mínimo');
        const fallbackElement = document.createElement('div');
        fallbackElement.innerHTML = '<span>Usuário</span>';
        return fallbackElement;
    }, 'criação do elemento de saudação acima do header');
}

// Dynamic Width Calculation Utilities - Enhanced
let widthCache = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 1000; // 1 second cache

function calculateAvailableWidth() {
    // Check cache first
    const now = Date.now();
    if (widthCache && (now - cacheTimestamp) < CACHE_DURATION) {
        return widthCache;
    }

    try {
        const header = document.querySelector('.app-header');
        const brand = document.querySelector('.brand');
        const actions = document.querySelector('.actions');

        if (!header || !brand || !actions) {
            console.warn('Header elements not found, using fallback width');
            return 200; // fallback
        }

        const headerWidth = header.offsetWidth;
        const brandWidth = brand.offsetWidth;
        const actionsWidth = actions.offsetWidth;

        // Account for gaps, padding, and margins - more precise calculation
        const headerStyles = window.getComputedStyle(header);
        const headerPadding = parseFloat(headerStyles.paddingLeft) + parseFloat(headerStyles.paddingRight);
        const gap = parseFloat(headerStyles.gap) || 16; // fallback to 1rem

        const availableWidth = headerWidth - brandWidth - actionsWidth - headerPadding - (gap * 2);

        // Cache the result with improved minimum
        widthCache = Math.max(120, availableWidth); // increased minimum for better UX
        cacheTimestamp = now;

        return widthCache;
    } catch (error) {
        console.warn('Error calculating available width:', error);
        return 200; // safe fallback
    }
}

function getElementDimensions(element) {
    if (!element) return { width: 0, height: 0 };

    try {
        const rect = element.getBoundingClientRect();
        return {
            width: rect.width,
            height: rect.height
        };
    } catch (error) {
        console.warn('Error getting element dimensions:', error);
        return { width: 0, height: 0 };
    }
}

function clearWidthCache() {
    widthCache = null;
    cacheTimestamp = 0;
}

// Enhanced helper function for safe element access
function safeGetElementWidth(selector, fallback = 0) {
    try {
        const element = document.querySelector(selector);
        return element ? element.offsetWidth : fallback;
    } catch (error) {
        console.warn(`Error getting width for ${selector}:`, error);
        return fallback;
    }
}

// Debounced resize handler for performance - Enhanced
let resizeTimeout = null;

function handleResize() {
    if (resizeTimeout) {
        clearTimeout(resizeTimeout);
    }

    // Use adaptive debounce timing based on screen size
    const screenWidth = window.innerWidth;
    const debounceTime = screenWidth > 1200 ? 100 : screenWidth > 768 ? 150 : 200;

    resizeTimeout = setTimeout(() => {
        clearWidthCache();
        if (currentUser) {
            updateGreeting(currentUser.Nome);
            console.log(`🔄 Resize handled (${screenWidth}px)`);
        }
    }, debounceTime);
}

// ResizeObserver for dynamic layout updates - Enhanced
let headerResizeObserver = null;

function initResponsiveLayoutSystem() {
    // Add window resize listener with debouncing
    window.addEventListener('resize', handleResize);

    // Add orientation change listener for mobile devices
    window.addEventListener('orientationchange', () => {
        setTimeout(() => {
            clearWidthCache();
            if (currentUser) {
                updateGreeting(currentUser.Nome);
            }
            console.log('📱 Orientação alterada, layout atualizado');
        }, 300); // Wait for orientation change to complete
    });

    // Add visibility change listener to handle tab switching
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden && currentUser) {
            // Recalculate when tab becomes visible again
            setTimeout(() => {
                clearWidthCache();
                updateGreeting(currentUser.Nome);
            }, 100);
        }
    });

    // Initialize ResizeObserver if supported
    if (window.ResizeObserver) {
        try {
            const header = document.querySelector('.app-header');
            if (header) {
                headerResizeObserver = new ResizeObserver(entries => {
                    for (let entry of entries) {
                        // Enhanced debounce with different delays for different resize magnitudes
                        if (resizeTimeout) {
                            clearTimeout(resizeTimeout);
                        }

                        const { width } = entry.contentRect;
                        const delay = width > 1200 ? 50 : width > 768 ? 100 : 150; // Faster response for larger screens

                        resizeTimeout = setTimeout(() => {
                            clearWidthCache();
                            if (currentUser) {
                                updateGreeting(currentUser.Nome);
                                console.log(`🔄 Layout atualizado (largura: ${width}px)`);
                            }
                        }, delay);
                    }
                });

                headerResizeObserver.observe(header);
                console.log('✅ ResizeObserver configurado para o header');

                // Also observe the user greeting element for more precise updates
                const greetingElement = document.getElementById('user-greeting');
                if (greetingElement) {
                    headerResizeObserver.observe(greetingElement);
                    console.log('✅ ResizeObserver configurado para saudação');
                }
            }
        } catch (error) {
            console.warn('Erro ao configurar ResizeObserver:', error);
            // Fallback to more frequent window resize checks
            window.addEventListener('resize', () => {
                if (resizeTimeout) clearTimeout(resizeTimeout);
                resizeTimeout = setTimeout(() => {
                    clearWidthCache();
                    if (currentUser) updateGreeting(currentUser.Nome);
                }, 200);
            });
        }
    } else {
        console.log('ℹ️ ResizeObserver não suportado, usando apenas window resize');
        // Enhanced fallback for older browsers
        let lastWidth = window.innerWidth;
        window.addEventListener('resize', () => {
            const currentWidth = window.innerWidth;
            if (Math.abs(currentWidth - lastWidth) > 50) { // Only update on significant changes
                if (resizeTimeout) clearTimeout(resizeTimeout);
                resizeTimeout = setTimeout(() => {
                    clearWidthCache();
                    if (currentUser) updateGreeting(currentUser.Nome);
                    lastWidth = currentWidth;
                }, 200);
            }
        });
    }
}

function cleanupResponsiveLayoutSystem() {
    // Remove event listeners
    window.removeEventListener('resize', handleResize);
    window.removeEventListener('orientationchange', handleResize);
    document.removeEventListener('visibilitychange', handleResize);

    // Disconnect ResizeObserver
    if (headerResizeObserver) {
        headerResizeObserver.disconnect();
        headerResizeObserver = null;
        console.log('🧹 ResizeObserver desconectado');
    }

    // Clear any pending timeouts
    if (resizeTimeout) {
        clearTimeout(resizeTimeout);
        resizeTimeout = null;
    }
}

// Touch event handler for tooltip
let tooltipTouchTimeout = null;

function handleTooltipTouch(event) {
    const greetingElement = event.currentTarget;
    const tooltip = greetingElement.querySelector('.tooltip');

    if (!tooltip) return;

    // Clear any existing timeout
    if (tooltipTouchTimeout) {
        clearTimeout(tooltipTouchTimeout);
    }

    // Show tooltip immediately
    tooltip.style.opacity = '1';
    tooltip.style.transform = 'translateX(-50%) translateY(-2px)';

    // Hide tooltip after 3 seconds
    tooltipTouchTimeout = setTimeout(() => {
        tooltip.style.opacity = '0';
        tooltip.style.transform = 'translateX(-50%)';
    }, 3000);
}

function updateGreeting(userName) {
    // Enhanced validation and error recovery
    if (!validateUserName(userName)) {
        console.warn('⚠️ Nome de usuário inválido, usando fallback');
        userName = 'Usuário';
    }

    const greetingElement = gracefulDegradation(
        () => createGreetingElement(),
        null,
        'criação do elemento de saudação'
    );

    if (!greetingElement) {
        console.error('❌ Não foi possível criar elemento de saudação');
        return;
    }

    const greetingText = safeQuerySelector('.greeting-text', greetingElement);

    if (!validateElement(greetingText, 'texto de saudação')) {
        // Try to recover by creating the text element
        recoverFromCriticalError(
            new Error('Elemento de texto não encontrado'),
            'updateGreeting',
            () => {
                const newTextElement = document.createElement('span');
                newTextElement.className = 'greeting-text';
                greetingElement.innerHTML = '';
                greetingElement.appendChild(newTextElement);
            }
        );
        return;
    }

    try {
        // Clear width cache to ensure fresh calculation
        clearWidthCache();

        // Use enhanced formatting with dynamic width calculation
        const availableWidth = gracefulDegradation(
            () => calculateAvailableWidth(),
            200,
            'cálculo de largura disponível'
        );

        const formattedName = safeFormatName(userName, availableWidth);
        const originalName = userName.trim();

        // Create enhanced greeting with animated emoji
        greetingText.innerHTML = `<span class="greeting-wave" aria-hidden="true">👋</span> Olá, ${formattedName}`;
        greetingElement.style.display = 'flex';

        // Use the new utility function to check if name was truncated
        const wasTruncated = isNameTruncated(originalName, formattedName);

        if (wasTruncated) {
            gracefulDegradation(() => {
                safeSetAttribute(greetingElement, 'data-truncated', 'true');
                safeSetAttribute(greetingElement, 'title', `Olá, ${originalName}`);
                safeSetAttribute(greetingElement, 'aria-label', `Saudação: Olá, ${originalName}`);
                safeSetAttribute(greetingElement, 'tabindex', '0');
                safeSetAttribute(greetingElement, 'role', 'button');

                // Add tooltip element if it doesn't exist
                let tooltip = safeQuerySelector('.tooltip', greetingElement);
                if (!tooltip) {
                    tooltip = document.createElement('div');
                    tooltip.className = 'tooltip';
                    safeSetAttribute(tooltip, 'role', 'tooltip');
                    greetingElement.appendChild(tooltip);
                }
                if (tooltip) {
                    tooltip.textContent = `Olá, ${originalName}`;
                }

                // Add touch event for mobile devices
                greetingElement.addEventListener('touchstart', handleTooltipTouch, { passive: true });
            }, null, 'configuração de tooltip');

        } else {
            gracefulDegradation(() => {
                safeRemoveAttribute(greetingElement, 'data-truncated');
                safeRemoveAttribute(greetingElement, 'title');
                safeRemoveAttribute(greetingElement, 'aria-label');
                safeRemoveAttribute(greetingElement, 'tabindex');
                safeRemoveAttribute(greetingElement, 'role');

                // Remove tooltip if it exists
                const tooltip = safeQuerySelector('.tooltip', greetingElement);
                if (tooltip && tooltip.parentNode) {
                    tooltip.remove();
                }

                // Remove touch event listener
                greetingElement.removeEventListener('touchstart', handleTooltipTouch);
            }, null, 'limpeza de tooltip');
        }

        // Log formatting info for debugging
        console.log(`👋 Nome formatado: "${originalName}" -> "${formattedName}" (largura: ${availableWidth}px, truncado: ${wasTruncated})`);

    } catch (error) {
        recoverFromCriticalError(error, 'updateGreeting', () => {
            // Enhanced fallback with better error handling
            const safeName = safeFormatName(userName, 150); // Use safe fallback width
            greetingText.innerHTML = `<span class="greeting-wave" aria-hidden="true">👋</span> Olá, ${safeName}`;
            greetingElement.style.display = 'flex';
        });
    }
}

function clearGreeting() {
    const greetingElement = document.getElementById('user-greeting');
    if (greetingElement) {
        greetingElement.style.display = 'none';
    }
}

function formatNameForDisplay(fullName) {
    // Use the enhanced version for better formatting
    return safeFormatName(fullName);
}

// Enhanced Name Formatting Functions - Improved
function formatNameForDisplayEnhanced(fullName, maxWidth = null) {
    if (!fullName || typeof fullName !== 'string') {
        return 'Usuário';
    }

    // Clean the name
    const cleanName = fullName.trim();
    if (!cleanName) return 'Usuário';

    // Since the greeting is now above the header with full width available,
    // always return the full name without truncation
    return cleanName;
}

// Performance optimization for greeting animations
function optimizeGreetingPerformance() {
    const greetingElement = document.getElementById('user-greeting');
    if (!greetingElement) return;

    // Remove will-change after animations complete to free up GPU memory
    const removeWillChange = () => {
        greetingElement.style.willChange = 'auto';
        const waveElement = greetingElement.querySelector('.greeting-wave');
        if (waveElement) {
            waveElement.style.willChange = 'auto';
        }
    };

    // Set will-change back when needed
    const setWillChange = () => {
        greetingElement.style.willChange = 'transform, box-shadow';
        const waveElement = greetingElement.querySelector('.greeting-wave');
        if (waveElement) {
            waveElement.style.willChange = 'transform';
        }
    };

    // Optimize on hover
    greetingElement.addEventListener('mouseenter', setWillChange, { passive: true });
    greetingElement.addEventListener('mouseleave', removeWillChange, { passive: true });

    // Clean up after entrance animation
    setTimeout(removeWillChange, 1000);
}

function formatFirstLastName(fullName) {
    const nameParts = fullName.split(' ').filter(part => part.length > 0);

    if (nameParts.length === 1) {
        return nameParts[0];
    } else if (nameParts.length === 2) {
        return `${nameParts[0]} ${nameParts[1]}`;
    } else if (nameParts.length > 2) {
        // Skip common middle words like "de", "da", "do", "dos", "das"
        const skipWords = ['de', 'da', 'do', 'dos', 'das', 'e'];
        const filteredParts = nameParts.filter(part =>
            !skipWords.includes(part.toLowerCase()) ||
            nameParts.indexOf(part) === 0 ||
            nameParts.indexOf(part) === nameParts.length - 1
        );

        if (filteredParts.length >= 2) {
            return `${filteredParts[0]} ${filteredParts[filteredParts.length - 1]}`;
        }

        return `${nameParts[0]} ${nameParts[nameParts.length - 1]}`;
    }

    return fullName;
}

function truncateWithEllipsis(text, maxLength) {
    if (text.length <= maxLength) {
        return text;
    }

    // Try to break at word boundary
    const truncated = text.substring(0, maxLength - 3);
    const lastSpace = truncated.lastIndexOf(' ');

    // Only break at word boundary if it's not too short
    if (lastSpace > maxLength * 0.5) {
        return truncated.substring(0, lastSpace) + '...';
    }

    return truncated + '...';
}

function getInitials(fullName) {
    const nameParts = fullName.split(' ').filter(part => part.length > 0);

    if (nameParts.length === 1) {
        // For single names, use first two characters
        return nameParts[0].substring(0, 2).toUpperCase();
    } else if (nameParts.length >= 2) {
        // Use first letter of first and last name
        return `${nameParts[0].charAt(0)}${nameParts[nameParts.length - 1].charAt(0)}`.toUpperCase();
    }

    return fullName.substring(0, 2).toUpperCase();
}

function safeFormatName(name, maxWidth = null) {
    try {
        return formatNameForDisplayEnhanced(name, maxWidth);
    } catch (error) {
        console.warn('Erro na formatação do nome:', error);
        // Enhanced fallback - return full name even on error
        if (name && typeof name === 'string') {
            const cleanName = name.trim();
            return cleanName || 'Usuário';
        }
        return 'Usuário';
    }
}

// New utility function to determine if name was truncated
function isNameTruncated(originalName, formattedName) {
    // Since we now always show the full name above the header,
    // names are never truncated
    return false;
}

// Enhanced Error Handling and Fallback System
function gracefulDegradation(operation, fallback, context = 'operação desconhecida') {
    try {
        const result = operation();
        return result;
    } catch (error) {
        console.warn(`⚠️ Erro durante ${context}:`, error.message || error);

        // Log additional context for debugging
        if (error.stack) {
            console.debug('Stack trace:', error.stack);
        }

        return typeof fallback === 'function' ? fallback() : fallback;
    }
}

// Enhanced validation functions
function validateUserName(userName) {
    if (!userName) return false;
    if (typeof userName !== 'string') return false;
    if (userName.trim().length === 0) return false;
    if (userName.trim().length > 100) return false; // Reasonable limit
    return true;
}

function validateElement(element, elementName = 'elemento') {
    if (!element) {
        console.warn(`❌ ${elementName} não encontrado`);
        return false;
    }
    if (!element.parentNode) {
        console.warn(`❌ ${elementName} não está no DOM`);
        return false;
    }
    return true;
}

// Safe DOM operations
function safeQuerySelector(selector, context = document) {
    try {
        return context.querySelector(selector);
    } catch (error) {
        console.warn(`Erro ao buscar elemento "${selector}":`, error);
        return null;
    }
}

function safeSetAttribute(element, attribute, value) {
    try {
        if (element && typeof element.setAttribute === 'function') {
            element.setAttribute(attribute, value);
            return true;
        }
    } catch (error) {
        console.warn(`Erro ao definir atributo ${attribute}:`, error);
    }
    return false;
}

function safeRemoveAttribute(element, attribute) {
    try {
        if (element && typeof element.removeAttribute === 'function') {
            element.removeAttribute(attribute);
            return true;
        }
    } catch (error) {
        console.warn(`Erro ao remover atributo ${attribute}:`, error);
    }
    return false;
}

// Enhanced error recovery for critical functions
function recoverFromCriticalError(error, context, recoveryAction) {
    console.error(`🚨 Erro crítico em ${context}:`, error);

    // Attempt recovery
    if (typeof recoveryAction === 'function') {
        try {
            recoveryAction();
            console.log(`✅ Recuperação bem-sucedida para ${context}`);
        } catch (recoveryError) {
            console.error(`❌ Falha na recuperação para ${context}:`, recoveryError);
        }
    }

    // Log error for potential debugging
    if (window.localStorage) {
        try {
            const errorLog = JSON.parse(localStorage.getItem('app-errors') || '[]');
            errorLog.push({
                timestamp: new Date().toISOString(),
                context,
                error: error.message || String(error),
                stack: error.stack
            });

            // Keep only last 10 errors
            if (errorLog.length > 10) {
                errorLog.splice(0, errorLog.length - 10);
            }

            localStorage.setItem('app-errors', JSON.stringify(errorLog));
        } catch (logError) {
            console.warn('Não foi possível salvar log de erro:', logError);
        }
    }
}

// Test and Validation Functions for Responsive Behavior
window.testResponsiveLayout = function () {
    console.log('🧪 Iniciando testes de layout responsivo...');

    // Test 1: Name formatting with different lengths
    const testNames = [
        'João',
        'Maria Silva',
        'José da Silva Santos',
        'Ana Beatriz de Oliveira Ferreira',
        'Francisco de Assis Pereira dos Santos Junior'
    ];

    console.log('📝 Teste 1: Formatação de nomes com diferentes comprimentos');
    testNames.forEach((name, index) => {
        console.log(`  ${index + 1}. "${name}"`);

        // Test with different widths
        [100, 150, 200, 250, 300].forEach(width => {
            const formatted = safeFormatName(name, width);
            const truncated = isNameTruncated(name, formatted);
            console.log(`    ${width}px: "${formatted}" (truncado: ${truncated})`);
        });
    });

    // Test 2: Width calculation
    console.log('📏 Teste 2: Cálculo de largura disponível');
    const calculatedWidth = calculateAvailableWidth();
    console.log(`  Largura calculada: ${calculatedWidth}px`);

    // Test 3: Element validation
    console.log('🔍 Teste 3: Validação de elementos');
    const header = safeQuerySelector('.app-header');
    const greeting = safeQuerySelector('#user-greeting');
    const brand = safeQuerySelector('.brand');
    const actions = safeQuerySelector('.actions');

    console.log(`  Header: ${validateElement(header, 'header') ? '✅' : '❌'}`);
    console.log(`  Greeting: ${validateElement(greeting, 'greeting') ? '✅' : '❌'}`);
    console.log(`  Brand: ${validateElement(brand, 'brand') ? '✅' : '❌'}`);
    console.log(`  Actions: ${validateElement(actions, 'actions') ? '✅' : '❌'}`);

    // Test 4: Responsive breakpoints
    console.log('📱 Teste 4: Breakpoints responsivos');
    const screenWidth = window.innerWidth;
    let breakpoint = 'desktop';
    if (screenWidth <= 480) breakpoint = 'mobile';
    else if (screenWidth <= 768) breakpoint = 'tablet';
    else if (screenWidth <= 1024) breakpoint = 'small-desktop';

    console.log(`  Largura da tela: ${screenWidth}px (${breakpoint})`);

    // Test 5: Error handling
    console.log('⚠️ Teste 5: Tratamento de erros');
    const errorTest = gracefulDegradation(
        () => { throw new Error('Teste de erro'); },
        'fallback funcionou',
        'teste de erro'
    );
    console.log(`  Resultado do teste de erro: ${errorTest}`);

    console.log('✅ Testes de layout responsivo concluídos');
};

window.testNameFormatting = function () {
    console.log('🧪 Teste específico de formatação de nomes...');

    const testCases = [
        { name: 'João Silva', expected: 'João Silva' },
        { name: 'Maria José da Silva Santos', expected: 'Maria Santos' },
        { name: 'Nome Extremamente Longo Que Não Cabe', expected: 'Nome Extremamente...' },
        { name: 'A', expected: 'A' },
        { name: '', expected: 'Usuário' },
        { name: null, expected: 'Usuário' },
        { name: undefined, expected: 'Usuário' }
    ];

    testCases.forEach((testCase, index) => {
        const result = safeFormatName(testCase.name, 200);
        const passed = result.includes(testCase.expected.split(' ')[0]) || result === testCase.expected;
        console.log(`  ${index + 1}. "${testCase.name}" -> "${result}" ${passed ? '✅' : '❌'}`);
    });
};

window.testTooltipFunctionality = function () {
    console.log('🧪 Teste de funcionalidade de tooltip...');

    if (!currentUser) {
        console.log('⚠️ Nenhum usuário logado, criando usuário de teste...');
        setCurrentUser({ Nome: 'Nome Muito Longo Para Teste de Tooltip' });
    }

    const greetingElement = safeQuerySelector('#user-greeting');
    if (!greetingElement) {
        console.log('❌ Elemento de saudação não encontrado');
        return;
    }

    const isTruncated = greetingElement.getAttribute('data-truncated') === 'true';
    const hasTooltip = !!safeQuerySelector('.tooltip', greetingElement);

    console.log(`  Nome truncado: ${isTruncated ? '✅' : '❌'}`);
    console.log(`  Tooltip presente: ${hasTooltip ? '✅' : '❌'}`);

    if (isTruncated && hasTooltip) {
        console.log('  🎯 Simulando hover para mostrar tooltip...');
        const tooltip = safeQuerySelector('.tooltip', greetingElement);
        if (tooltip) {
            tooltip.style.opacity = '1';
            tooltip.style.transform = 'translateX(-50%) translateY(-2px)';

            setTimeout(() => {
                tooltip.style.opacity = '0';
                tooltip.style.transform = 'translateX(-50%)';
                console.log('  ✅ Tooltip testado com sucesso');
            }, 2000);
        }
    }
};

window.testResizeHandling = function () {
    console.log('🧪 Teste de manipulação de redimensionamento...');

    const originalWidth = window.innerWidth;
    console.log(`  Largura original: ${originalWidth}px`);

    // Simulate resize by clearing cache and recalculating
    clearWidthCache();
    const newWidth = calculateAvailableWidth();
    console.log(`  Nova largura calculada: ${newWidth}px`);

    // Test debounced resize handler
    console.log('  🔄 Testando handler de resize com debounce...');
    handleResize();

    setTimeout(() => {
        console.log('  ✅ Handler de resize executado');
    }, 200);
};

window.validateAccessibility = function () {
    console.log('♿ Validação de acessibilidade...');

    const greetingElement = safeQuerySelector('#user-greeting');
    if (!greetingElement) {
        console.log('❌ Elemento de saudação não encontrado');
        return;
    }

    const checks = {
        'Focusável quando truncado': () => {
            const isTruncated = greetingElement.getAttribute('data-truncated') === 'true';
            const hasFocus = greetingElement.hasAttribute('tabindex');
            return !isTruncated || hasFocus;
        },
        'ARIA label presente': () => {
            const isTruncated = greetingElement.getAttribute('data-truncated') === 'true';
            const hasAriaLabel = greetingElement.hasAttribute('aria-label');
            return !isTruncated || hasAriaLabel;
        },
        'Role definido': () => {
            const isTruncated = greetingElement.getAttribute('data-truncated') === 'true';
            const hasRole = greetingElement.hasAttribute('role');
            return !isTruncated || hasRole;
        },
        'Tooltip tem role': () => {
            const tooltip = safeQuerySelector('.tooltip', greetingElement);
            return !tooltip || tooltip.hasAttribute('role');
        }
    };

    Object.entries(checks).forEach(([name, check]) => {
        const passed = check();
        console.log(`  ${name}: ${passed ? '✅' : '❌'}`);
    });
};

// Run comprehensive validation
window.runAllTests = function () {
    console.log('🚀 Executando todos os testes de layout responsivo...');
    console.log('='.repeat(50));

    testResponsiveLayout();
    console.log('');

    testNameFormatting();
    console.log('');

    testTooltipFunctionality();
    console.log('');

    testResizeHandling();
    console.log('');

    validateAccessibility();
    console.log('');

    console.log('='.repeat(50));
    console.log('✅ Todos os testes concluídos!');
    console.log('💡 Use as funções individuais para testes específicos:');
    console.log('   - testResponsiveLayout()');
    console.log('   - testNameFormatting()');
    console.log('   - testTooltipFunctionality()');
    console.log('   - testResizeHandling()');
    console.log('   - validateAccessibility()');
};

// Initialization
async function init() {
    try {
        ui.loading.style.display = 'flex';
        ui.loadingText.textContent = 'Carregando banco de produtos...';

        // Load CADASTRO
        // Using explicit relative path to avoid 404s on some hostings
        // Load CADASTRO (Loaded via script tag)
        if (!window.DB_CADASTRO) throw new Error('Base de dados CADASTRO não encontrada. Verifique ../data_base/BASE_BARRAS.js');
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
        if (!window.DB_END) throw new Error('Base de dados ENDERECOS não encontrada. Verifique ../data_base/BASE_END.js');
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

        ui.loadingText.textContent = 'Carregando banco de usuários...';
        // Load USUARIOS
        if (!window.DB_USUARIO) throw new Error('Base de dados USUARIOS não encontrada. Verifique ../data_base/BASE_USUARIO.js');
        const jsonUser = window.DB_USUARIO;

        ui.loadingText.textContent = 'Indexando usuários...';
        if (jsonUser.BASE_USUARIO) {
            for (const item of jsonUser.BASE_USUARIO) {
                // Index by matricula for fast lookup
                Data.users.set(String(item.Matricula), item);
            }
        }

        Data.isReady = true;
        ui.loading.style.display = 'none';
        ui.barcodeInput.focus();
        showStatus('Sistema pronto. Bipe o produto.', 'success');

        // Log the detected machine name for verification
        const detectedMachine = getMachineName();
        console.log(`🖥️ Máquina: ${detectedMachine || '(em branco)'}`);

        // Update machine button on page load
        updateMachineButton();

        // Load destino preference
        loadDestinoPreference();

        // Load deposito preference
        loadDepositoPreference();

        // Initialize CountdownUI and RefreshTracker
        window.refreshTracker = new RefreshTracker();
        window.countdownUI = new CountdownUI();

        // Update info tooltip with last refresh data
        const lastRefreshTime = window.refreshTracker.getLastRefreshTime();
        window.countdownUI.updateInfoTooltip(lastRefreshTime);

        console.log('✅ Sistema de contagem regressiva inicializado');
        console.log('🕐 Novo ícone de relógio moderno implementado!');
        console.log('ℹ️ Para testar o contador, use: testCountdown()');
        console.log('ℹ️ Para testar refresh manual, use: testManualRefresh()');
        console.log('ℹ️ Para testar alternância ícone relógio/contador, use: testIconToggle()');
        console.log('ℹ️ Para validar sistema completo, use: validateSystem()');

        // Initialize Deposito Protection System
        initDepositoProtection();
        console.log('🔒 Sistema de proteção de depósito inicializado');

        // Setup autocomplete preventions
        setupAutocompletePreventions();
        console.log('🔒 Prevenção de histórico de digitação configurada');

        // Initialize responsive layout system
        initResponsiveLayoutSystem();
        console.log('📱 Sistema de layout responsivo inicializado');

        // Initialize test functions
        console.log('🧪 Funções de teste disponíveis:');
        console.log('   - runAllTests() - Executa todos os testes');
        console.log('   - testResponsiveLayout() - Testa layout responsivo');
        console.log('   - testNameFormatting() - Testa formatação de nomes');
        console.log('   - testTooltipFunctionality() - Testa tooltips');
        console.log('   - testResizeHandling() - Testa redimensionamento');
        console.log('   - validateAccessibility() - Valida acessibilidade');
        console.log('   - runAllDescriptionTests() - Testa formatação de descrições');

        // Limpar cache de formatação de descrições para aplicar as novas configurações
        clearDescriptionFormatCache();
        console.log('🧹 Cache de formatação de descrições limpo - novas configurações aplicadas');

        // Add integration test function to window for debugging
        window.testUserValidation = () => {
            console.log('🧪 Testando validação de usuário...');
            console.log(`📊 Total de usuários carregados: ${Data.users.size}`);

            // Test with a sample matricula
            const sampleMatricula = Array.from(Data.users.keys())[0];
            if (sampleMatricula) {
                console.log(`🔍 Testando matrícula: ${sampleMatricula}`);
                const validation = validateMatricula(sampleMatricula);
                console.log('✅ Resultado da validação:', validation);

                if (validation.valid) {
                    setCurrentUser(validation.user);
                    console.log('👋 Saudação atualizada para:', validation.user.Nome);
                }
            }
        };
        window.testCountdown = () => {
            console.log('🧪 Iniciando teste do contador (10 segundos)');
            console.log('📝 Verificando: Ícone relógio deve desaparecer e contador deve mostrar "Atualização em andamento"');

            const testTimer = new CountdownTimer(Date.now() + 10000,
                (minutes, seconds, total) => {
                    window.countdownUI.updateCountdown(minutes, seconds);
                    window.countdownUI.setUrgentStyle(total <= 5);
                    console.log(`⏱️ Atualização em andamento: ${minutes}:${seconds.toString().padStart(2, '0')} (${total}s restantes)`);
                },
                () => {
                    console.log('🧪 Teste concluído - ícone relógio deve reaparecer');
                    window.countdownUI.hideCountdown();
                }
            );
            testTimer.start(10);
            window.countdownUI.showCountdown(0, 10);
        };

        // Função para testar detecção de refresh manual
        window.testManualRefresh = () => {
            console.log('🧪 Simulando refresh manual...');
            window.refreshTracker.recordRefresh(true);
            const lastRefresh = window.refreshTracker.getLastRefreshTime();
            window.countdownUI.updateInfoTooltip(lastRefresh);
            console.log('✅ Refresh manual registrado');
        };

        // Função para testar alternância entre ícone relógio e contador
        window.testIconToggle = () => {
            console.log('🧪 Testando alternância entre ícone relógio e contador...');

            // Verificar estado inicial
            const infoBtn = document.querySelector('.info-btn');
            const countdownBtn = document.querySelector('.countdown-btn');

            console.log(`📍 Estado inicial - Ícone relógio: ${infoBtn.style.display !== 'none' ? 'VISÍVEL' : 'OCULTO'}`);
            console.log(`📍 Estado inicial - Contador: ${countdownBtn.style.display === 'flex' ? 'VISÍVEL' : 'OCULTO'}`);

            // Mostrar contador por 3 segundos
            window.countdownUI.showCountdown(0, 3);
            console.log('🔄 Contador ativado - ícone relógio deve estar COMPLETAMENTE OCULTO');

            setTimeout(() => {
                console.log(`📍 Durante contagem - Ícone relógio: ${infoBtn.style.display !== 'none' && infoBtn.style.visibility !== 'hidden' ? 'VISÍVEL' : 'OCULTO'}`);
                console.log(`📍 Durante contagem - Contador: ${countdownBtn.style.display === 'flex' ? 'VISÍVEL' : 'OCULTO'}`);

                // Ocultar contador
                window.countdownUI.hideCountdown();
                console.log('🔄 Contador desativado - ícone relógio deve estar VISÍVEL');

                setTimeout(() => {
                    console.log(`📍 Estado final - Ícone relógio: ${infoBtn.style.display !== 'none' && infoBtn.style.visibility !== 'hidden' ? 'VISÍVEL' : 'OCULTO'}`);
                    console.log(`📍 Estado final - Contador: ${countdownBtn.style.display === 'flex' ? 'VISÍVEL' : 'OCULTO'}`);
                    console.log('✅ Teste de alternância concluído - ícone relógio moderno funcionando!');
                }, 500);
            }, 1500);
        };

        // Função para validar sistema completo
        window.validateSystem = () => {
            console.log('🔍 Validando sistema de contagem regressiva...');

            // Verificar se elementos foram criados
            const infoBtn = document.querySelector('.info-btn');
            const countdownBtn = document.querySelector('.countdown-btn');

            if (!infoBtn) {
                console.error('❌ Ícone de informação não encontrado');
                return false;
            }

            if (!countdownBtn) {
                console.error('❌ Botão contador não encontrado');
                return false;
            }

            // Verificar posicionamento
            const hubBtn = document.querySelector('#btnHub');
            if (hubBtn && infoBtn.nextElementSibling !== countdownBtn) {
                console.warn('⚠️ Posicionamento dos elementos pode estar incorreto');
            }

            // Verificar dados de refresh
            const refreshData = window.refreshTracker.getRefreshData();
            if (!refreshData) {
                console.warn('⚠️ Nenhum dado de refresh encontrado');
            } else {
                console.log('✅ Dados de refresh:', refreshData);
            }

            console.log('✅ Validação do sistema concluída');
            return true;
        };

        // Executar validação inicial
        setTimeout(() => {
            window.validateSystem();
        }, 1000);

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

// Depósito Utility Functions
function getDepositoEmoticon(deposito) {
    // Usar emoticon de prédio para todos os depósitos válidos (1-9)
    if (deposito && deposito.length === 1 && deposito >= '1' && deposito <= '9') {
        return '🏢'; // Emoticon de prédio/depósito
    }
    return '❓'; // Emoticon padrão para valores inválidos
}

function formatDepositoDisplay(deposito) {
    if (!deposito) {
        return '❓ CD: --';
    }
    const emoticon = getDepositoEmoticon(deposito);
    return `${emoticon} CD: ${deposito}`;
}

// Function to format machine info with deposito for labels
function formatMachineInfo(deposito) {
    const machineName = getMachineName();
    const depositoInfo = deposito ? `CD:${deposito}` : 'CD:--';

    if (machineName) {
        return `${depositoInfo} ${machineName}`;
    } else {
        return depositoInfo;
    }
}

// Deposito Protection Functions
function lockDeposito(deposito) {
    if (!deposito) return;

    depositoLocked = true;
    currentDeposito = deposito;

    // Disable the select
    ui.depositoSelect.disabled = true;
    ui.depositoSelect.style.opacity = '0.6';
    ui.depositoSelect.style.cursor = 'not-allowed';

    // Show the config button in header
    const configBtn = $('#config-deposito-btn');
    const depositoDisplay = $('#deposito-display');

    if (configBtn && depositoDisplay) {
        configBtn.style.display = 'flex';
        depositoDisplay.textContent = formatDepositoDisplay(deposito);
        configBtn.title = `Depósito atual: ${deposito}. Clique para alterar.`;
    }

    // Save to localStorage
    localStorage.setItem('locked-deposito', deposito);

    console.log(`🔒 Depósito ${deposito} bloqueado para proteção`);
}

function unlockDeposito() {
    depositoLocked = false;
    currentDeposito = null;

    // Enable the select
    ui.depositoSelect.disabled = false;
    ui.depositoSelect.style.opacity = '1';
    ui.depositoSelect.style.cursor = 'pointer';

    // Hide the config button
    const configBtn = $('#config-deposito-btn');
    if (configBtn) {
        configBtn.style.display = 'none';
    }

    // Clear from localStorage
    localStorage.removeItem('locked-deposito');

    console.log('🔓 Depósito desbloqueado');
}

function openDepositoChangeModal() {
    const modal = $('#deposito-change-modal');
    const currentDisplay = $('#current-deposito-display');
    const modalSelect = $('#modal-deposito-select');

    if (modal && currentDisplay && modalSelect) {
        // Show current deposito
        currentDisplay.textContent = formatDepositoDisplay(currentDeposito);

        // Reset modal select
        modalSelect.value = '';

        // Show modal
        modal.style.display = 'flex';

        // Focus on select after a brief delay
        setTimeout(() => {
            modalSelect.focus();
        }, 100);
    }
}

function closeDepositoChangeModal() {
    const modal = $('#deposito-change-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function confirmDepositoChange() {
    const modalSelect = $('#modal-deposito-select');
    const newDeposito = modalSelect.value;

    if (!newDeposito) {
        showStatus('⚠️ Selecione o novo depósito!', 'warning');
        return;
    }

    if (newDeposito === currentDeposito) {
        showStatus('ℹ️ O depósito selecionado é o mesmo atual.', 'info');
        closeDepositoChangeModal();
        return;
    }

    // Apply the change
    ui.depositoSelect.value = newDeposito;
    lockDeposito(newDeposito);

    // Close modal
    closeDepositoChangeModal();

    // Show success message
    showStatus(`✅ Depósito alterado para ${formatDepositoDisplay(newDeposito)}`, 'success');

    // Focus back to barcode input
    ui.barcodeInput.focus();
}

function initDepositoProtection() {
    // Check if there's a saved locked deposito
    const savedDeposito = localStorage.getItem('locked-deposito');
    if (savedDeposito) {
        ui.depositoSelect.value = savedDeposito;
        lockDeposito(savedDeposito);
    }

    // Add event listener to deposito select
    ui.depositoSelect.addEventListener('change', function (e) {
        const selectedValue = e.target.value;

        if (selectedValue && !depositoLocked) {
            // First time selection - lock it
            lockDeposito(selectedValue);
        } else if (selectedValue && depositoLocked && selectedValue !== currentDeposito) {
            // Trying to change locked deposito - prevent and show modal
            e.target.value = currentDeposito; // Revert to current
            openDepositoChangeModal();
        }
    });

    // Add event listener to config button
    const configBtn = $('#config-deposito-btn');
    if (configBtn) {
        configBtn.addEventListener('click', openDepositoChangeModal);
    }

    // Add event listeners to modal buttons
    const confirmBtn = $('#confirm-deposito-change');
    const cancelBtn = $('#cancel-deposito-change');

    if (confirmBtn) {
        confirmBtn.addEventListener('click', confirmDepositoChange);
    }

    if (cancelBtn) {
        cancelBtn.addEventListener('click', closeDepositoChangeModal);
    }

    // Close modal on ESC key
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            const modal = $('#deposito-change-modal');
            if (modal && modal.style.display === 'flex') {
                closeDepositoChangeModal();
            }
        }
    });
}

function generateLabel(product, addressItem, inputBarcode, copies = 1, validityDate = null, includeZona = false, deposito = null) {
    const matricula = ui.matriculaInput.value.trim() || '---';
    const dateStr = curDateTime(); // e.g. 01/12/25 00:00
    const codFormatted = formatCODDV(product.CODDV);
    const machineInfo = formatMachineInfo(deposito); // Get machine + deposito info for label

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
                    <div style="font-size: 7pt; color: #333; margin-top: 1px; font-weight: bold;">${machineInfo}</div>
                </div>
                ${safeFormatDescription(product.DESC)}
            </div>
            
            <div class="label-row-middle" style="display: flex; align-items: center; justify-content: flex-start; overflow: hidden;">
                <!-- Maximized Zone Text, No Barcode -->
                <div class="label-big-num" style="font-size: 90pt; width: 100%; text-align: left; line-height: 0.8; letter-spacing: -3px; font-family: 'Arial Black', sans-serif;">${zoneText}</div>
            </div>
            
            <div class="label-row-bottom">
                <div class="label-addr" style="display: flex; align-items: baseline; white-space: nowrap; overflow: hidden; font-size: 13pt;">
                    ${addressItem.ENDERECO.replace(/\s+/g, '')}
                    <span style="font-size: 8pt; font-weight: 600; font-family: sans-serif; margin-left: 10px; display: inline-block;">
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
                    <div style="font-size: 7pt; color: #333; margin-top: 1px; font-weight: bold;">${machineInfo}</div>
                </div>
                ${safeFormatDescription(product.DESC)}
            </div>
            
            <div class="label-row-middle" style="display: flex; align-items: center; justify-content: flex-start; overflow: hidden;">
                <!-- Maximized Validity Date, No Barcode -->
                <div class="label-big-num" style="font-size: 87pt; width: 100%; text-align: left; line-height: 0.8; letter-spacing: -3px; font-family: 'Arial Black', sans-serif;">${validityDate}</div>
            </div>
            
            <div class="label-row-bottom">
                <div class="label-addr" style="display: flex; align-items: baseline; white-space: nowrap; overflow: hidden; font-size: 13pt;">
                    ${addressItem.ENDERECO.replace(/\s+/g, '')}
                    <span style="font-size: 8pt; font-weight: 600; font-family: sans-serif; margin-left: 10px; display: inline-block;">
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

        // Formatar descrição com ajuste automático de fonte
        const formattedDescription = safeFormatDescription(product.DESC);

        item.innerHTML = `
            <div class="label-row-top">
                <div class="label-meta-top">
                    <div>${dateStr}</div>
                    <div style="font-size: 7pt; color: #333; margin-top: 1px; font-weight: bold;">${machineInfo}</div>
                </div>
                ${formattedDescription}
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

    // Add extra Zone and Validity labels at the end if copies > 1
    if (copies > 1) {
        // Extra Zone Label at the end (if includeZona is true)
        if (includeZona) {
            const zoneText = addressItem.ENDERECO.split('.')[0].replace(/\s+/g, '');

            const item = document.createElement('div');
            item.className = 'label-badge';
            item.innerHTML = `
                <div class="label-row-top">
                    <div class="label-meta-top">
                        <div>${dateStr}</div>
                        <div style="font-size: 7pt; color: #333; margin-top: 1px; font-weight: bold;">${machineInfo}</div>
                    </div>
                    ${safeFormatDescription(product.DESC)}
                </div>
                
                <div class="label-row-middle" style="display: flex; align-items: center; justify-content: flex-start; overflow: hidden;">
                    <!-- Maximized Zone Text, No Barcode -->
                    <div class="label-big-num" style="font-size: 90pt; width: 100%; text-align: left; line-height: 0.8; letter-spacing: -3px; font-family: 'Arial Black', sans-serif;">${zoneText}</div>
                </div>
                
                <div class="label-row-bottom">
                    <div class="label-addr" style="display: flex; align-items: baseline; white-space: nowrap; overflow: hidden; font-size: 13pt;">
                        ${addressItem.ENDERECO.replace(/\s+/g, '')}
                        <span style="font-size: 8pt; font-weight: 600; font-family: sans-serif; margin-left: 10px; display: inline-block;">
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

        // Extra Validity Label at the end (if validityDate is provided)
        if (validityDate) {
            const item = document.createElement('div');
            item.className = 'label-badge';
            item.innerHTML = `
                <div class="label-row-top">
                    <div class="label-meta-top">
                        <div>${dateStr}</div>
                        <div style="font-size: 7pt; color: #333; margin-top: 1px; font-weight: bold;">${machineInfo}</div>
                    </div>
                    ${safeFormatDescription(product.DESC)}
                </div>
                
                <div class="label-row-middle" style="display: flex; align-items: center; justify-content: flex-start; overflow: hidden;">
                    <!-- Maximized Validity Date, No Barcode -->
                    <div class="label-big-num" style="font-size: 87pt; width: 100%; text-align: left; line-height: 0.8; letter-spacing: -3px; font-family: 'Arial Black', sans-serif;">${validityDate}</div>
                </div>
                
                <div class="label-row-bottom">
                    <div class="label-addr" style="display: flex; align-items: baseline; white-space: nowrap; overflow: hidden; font-size: 13pt;">
                        ${addressItem.ENDERECO.replace(/\s+/g, '')}
                        <span style="font-size: 8pt; font-weight: 600; font-family: sans-serif; margin-left: 10px; display: inline-block;">
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

/**
 * Normaliza o código de barras removendo caracteres não numéricos
 */
function normalizeBarcode(barcode) {
    if (!barcode) return '';
    return String(barcode).replace(/\D/g, '');
}

/**
 * Busca produto pelo código de barras com múltiplas estratégias
 */
function findProductByBarcode(barcode) {
    const normalizedBarcode = normalizeBarcode(barcode);
    
    // Tentativa 1: Busca exata
    let product = Data.products.get(barcode);
    if (product) return product;
    
    // Tentativa 2: Busca com código normalizado
    product = Data.products.get(normalizedBarcode);
    if (product) return product;
    
    // Tentativa 3: Busca removendo zeros à esquerda
    const trimmedBarcode = normalizedBarcode.replace(/^0+/, '');
    if (trimmedBarcode && trimmedBarcode !== normalizedBarcode) {
        product = Data.products.get(trimmedBarcode);
        if (product) return product;
    }
    
    // Tentativa 4: Busca com zeros à esquerda (13 dígitos)
    if (normalizedBarcode.length < 13) {
        const paddedBarcode = normalizedBarcode.padStart(13, '0');
        product = Data.products.get(paddedBarcode);
        if (product) return product;
    }
    
    // Tentativa 5: Busca com zeros à esquerda (14 dígitos)
    if (normalizedBarcode.length < 14) {
        const paddedBarcode = normalizedBarcode.padStart(14, '0');
        product = Data.products.get(paddedBarcode);
        if (product) return product;
    }
    
    // Tentativa 6: Busca iterando por todos os produtos
    for (const [key, value] of Data.products) {
        const normalizedKey = normalizeBarcode(key);
        if (normalizedKey === normalizedBarcode) {
            return value;
        }
    }
    
    return null;
}

async function handleSearch(e) {
    e.preventDefault();
    const rawBarcode = ui.barcodeInput.value.trim();
    const barcode = normalizeBarcode(rawBarcode);
    const matricula = ui.matriculaInput.value.trim();

    // 1. Validate Deposito
    const selectedDeposito = ui.depositoSelect.value;
    if (!selectedDeposito) {
        showStatus('⚠️ Selecione o depósito antes de continuar!', 'warning');
        ui.depositoSelect.focus();
        ui.depositoSelect.style.borderColor = 'red';
        setTimeout(() => ui.depositoSelect.style.borderColor = '', 2000);
        return;
    }

    // 2. Validate Matricula
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

    // Set current user when matricula is valid
    if (matriculaValidation.user) {
        setCurrentUser(matriculaValidation.user);
    }

    if (!barcode) {
        showStatus('Informe o código de barras!', 'warning');
        ui.barcodeInput.focus();
        return;
    }

    // 3. Lookup Product
    console.log('🔍 Buscando:', rawBarcode);
    const product = findProductByBarcode(rawBarcode);
    if (!product) {
        console.warn('❌ Produto não encontrado:', rawBarcode);
        showStatus('Produto não encontrado (BARRAS: ' + rawBarcode + ')', 'error');
        ui.barcodeInput.select();
        return;
    }
    console.log('✅ Encontrado:', product.DESC);

    // 4. Lookup Address
    const addressList = Data.addresses.get(product.CODDV);
    if (!addressList || addressList.length === 0) {
        showStatus(`Produto encontrado (${product.DESC}), mas SEM endereço de PULMÃO.`, 'warning');
        ui.barcodeInput.select();
        return;
    }

    // 4.1. Filter by selected deposito
    const depositoFilteredList = addressList.filter(a => a.CD === selectedDeposito);
    if (depositoFilteredList.length === 0) {
        showStatus(`Produto encontrado, mas SEM endereço no DEPÓSITO ${selectedDeposito}.`, 'warning');
        ui.barcodeInput.select();
        return;
    }

    // 5. Resolve Target Address
    const destinoType = document.querySelector('input[name="destino"]:checked').value;
    let filteredList = [], targetAddress = null;
    let largeNumVal = '', shortAddrVal = '';

    if (destinoType === 'automatico') {
        // Modo Automático: Lógica será aplicada na função executePrint baseada na quantidade
        // Por enquanto, vamos preparar ambos os endereços disponíveis
        const separacaoList = depositoFilteredList.filter(a => a.TIPO === 'SEPARACAO');
        const pulmaoList = depositoFilteredList.filter(a => a.TIPO === 'PULMÃO');

        if (separacaoList.length > 0) {
            // Usa SEPARACAO como padrão para preparar os dados
            targetAddress = separacaoList[0];
            largeNumVal = getPadraoLargeNum(targetAddress.ENDERECO);
            const p = targetAddress.ENDERECO.split('.');
            if (p.length > 1) p.pop();
            shortAddrVal = p.join('.');
        } else if (pulmaoList.length > 0) {
            // Usa PULMÃO como fallback
            targetAddress = pulmaoList[pulmaoList.length - 1];
            largeNumVal = getLargeSuffix(targetAddress.ENDERECO);
            const p = targetAddress.ENDERECO.split('.');
            p.pop();
            shortAddrVal = p.join('.');
        } else {
            showStatus(`Produto encontrado, mas SEM endereço de SEPARAÇÃO nem PULMÃO.`, 'warning');
            return;
        }

        // Armazenar ambas as listas para decisão posterior
        targetAddress.separacaoList = separacaoList;
        targetAddress.pulmaoList = pulmaoList;

    } else if (destinoType === 'pulmao') {
        filteredList = depositoFilteredList.filter(a => a.TIPO === 'PULMÃO');
        if (filteredList.length === 0) {
            showStatus(`Produto encontrado, mas SEM endereço de PULMÃO no DEPÓSITO ${selectedDeposito}.`, 'warning');
            return;
        }
        targetAddress = filteredList[filteredList.length - 1];
        largeNumVal = getLargeSuffix(targetAddress.ENDERECO);
        const p = targetAddress.ENDERECO.split('.');
        p.pop();
        shortAddrVal = p.join('.');
    } else {
        filteredList = depositoFilteredList.filter(a => a.TIPO === 'SEPARACAO');
        if (filteredList.length === 0) {
            showStatus(`Produto encontrado, mas SEM endereço de SEPARAÇÃO no DEPÓSITO ${selectedDeposito}.`, 'warning');
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

    // 6. Store Data & Open Modal
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
    let { product, targetAddress, barcode, matricula, destinoType } = pendingData;

    // NOVAS REGRAS PARA MODO AUTOMÁTICO
    if (destinoType === 'automatico') {
        // Regras do modo automático baseadas na quantidade
        if (copies === 1) {
            // 1 etiqueta = sempre SEPARAÇÃO (estação)
            if (targetAddress.separacaoList && targetAddress.separacaoList.length > 0) {
                targetAddress = targetAddress.separacaoList[0];
                const largeNumVal = getPadraoLargeNum(targetAddress.ENDERECO);
                const p = targetAddress.ENDERECO.split('.');
                if (p.length > 1) p.pop();
                const shortAddrVal = p.join('.');

                targetAddress.formatted = {
                    largeNum: largeNumVal,
                    shortAddr: shortAddrVal
                };

                destinoType = 'separacao'; // Para exibição
            }
        } else {
            // Mais de 1 etiqueta = sempre PULMÃO
            if (targetAddress.pulmaoList && targetAddress.pulmaoList.length > 0) {
                targetAddress = targetAddress.pulmaoList[targetAddress.pulmaoList.length - 1];
                const largeNumVal = getLargeSuffix(targetAddress.ENDERECO);
                const p = targetAddress.ENDERECO.split('.');
                p.pop();
                const shortAddrVal = p.join('.');

                targetAddress.formatted = {
                    largeNum: largeNumVal,
                    shortAddr: shortAddrVal
                };

                destinoType = 'pulmao'; // Para exibição
            }
        }
    } else {
        // Para modos manuais (pulmao/separacao), respeitar a escolha do usuário
        // Não fazer nenhuma alteração automática - respeitar a escolha
        console.log(`Modo manual selecionado: ${destinoType.toUpperCase()}`);
    }

    // Clear pending
    pendingData = null;

    // Show appropriate status message
    let statusMessage = '';
    if (destinoType === 'automatico') {
        const actualType = targetAddress.TIPO || 'DESCONHECIDO';
        statusMessage = `Gerando etiquetas para: ${product.DESC} (AUTOMÁTICO → ${actualType})`;
    } else {
        statusMessage = `Gerando etiquetas para: ${product.DESC} (${destinoType.toUpperCase()})`;
    }
    showStatus(statusMessage, 'success');

    // Zona is always included since checkbox is disabled and checked
    const includeZona = true;

    // Generate Label
    const selectedDeposito = ui.depositoSelect.value;
    const labelEl = generateLabel(product, targetAddress, barcode, copies, validityDate, includeZona, selectedDeposito);

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

    // Timer para limpar visualização após 10 segundos
    setTimeout(() => {
        ui.preview.innerHTML = '<p style="color: #6b7280; font-style: italic;">A etiqueta gerada aparecerá aqui...</p>';
    }, 10000); // 10 segundos

    // History
    saveHistory({
        desc: product.DESC,
        coddv: product.CODDV,
        barcode: barcode,
        matricula: matricula,
        userName: currentUser ? currentUser.Nome : null, // Adicionar nome do usuário
        address: targetAddress.ENDERECO,
        type: destinoType,
        deposito: ui.depositoSelect.value, // Capturar depósito selecionado
        copies: copies, // Capturar quantidade de etiquetas
        validity: validityDate,
        zona: includeZona,
        machine: getMachineName(),
        timestamp: new Date().toISOString()
    });

    // Feedback visual imediato no contador global (Atualização Otimista)
    if (window.contadorGlobal && typeof window.contadorGlobal.incrementarLocalmente === 'function') {
        window.contadorGlobal.incrementarLocalmente(copies);
        console.log(`⚡ Contador global incrementado localmente: +${copies}`);
    } else if (window.contadorGlobal) {
        // Fallback manual se a função não existir
        window.contadorGlobal.valorAtual += copies;
        window.contadorGlobal.salvarEstadoLocal();
        window.dispatchEvent(new CustomEvent('contador-atualizado', {
            detail: { valor: window.contadorGlobal.valorAtual, incremento: copies, tipo: 'mercadoria' }
        }));
    }

    // ABRIR IMPRESSÃO IMEDIATAMENTE (não esperar Supabase)
    console.log('🖨️ Abrindo impressão imediatamente...');
    setTimeout(() => {
        try {
            window.print(); // Abre impressão sem demora

            // Mostrar Feedback Visual (O contador já foi atualizado visualmente)
            if (window.contadorGlobal) {
                const totais = window.contadorGlobal.valorAtual;
                mostrarPopupSucesso('Etiquetas geradas!', `+${copies} etiquetas | Total: ${totais.toLocaleString('pt-BR')}`);
            }

            handlePostPrintCleanup();
            console.log('✅ Impressão aberta com sucesso');
        } catch (printError) {
            console.error('❌ Erro ao abrir impressão:', printError);
            showStatus('Erro ao abrir impressão. Tente novamente.', 'error');
        }
    }, 100);

    // Registrar geração no Supabase EM BACKGROUND (não bloquear impressão)
    setTimeout(async () => {
        try {
            console.log('📡 Salvando no Supabase em background...');
            const manager = await waitForSupabaseManager(2000); // Timeout menor

            if (manager) {
                const entryData = {
                    cd: ui.depositoSelect.value,
                    codv: product.CODDV,
                    ean: barcode,
                    descricao: product.DESC,
                    destino_tipo: destinoType,
                    endereco_tipo: targetAddress.TIPO || 'N/A',
                    endereco: targetAddress.ENDERECO,
                    quantidade: copies,
                    validade: validityDate,
                    zona: includeZona,
                    matricula: matricula,
                    nome_usuario: currentUser ? currentUser.Nome : 'Desconhecido',
                    maquina: getMachineName()
                };

                console.log('📝 Salvando entryData (etiqueta-mercadoria):', entryData);
                await manager.saveEtiquetaEntrada(entryData);
                console.log('✅ Dados salvos no Supabase em background');
            } else {
                console.warn('⚠️ Supabase não disponível - dados salvos apenas localmente');
            }
        } catch (supabaseError) {
            console.warn('⚠️ Erro ao salvar no Supabase (não afeta impressão):', supabaseError);
        }
    }, 500); // Executar após a impressão


}

// Post-print cleanup function
function handlePostPrintCleanup() {
    // Clear form fields
    ui.barcodeInput.value = '';
    ui.matriculaInput.value = '';

    // Preserve greeting - it will be maintained until next matricula validation
    // This allows the user to see who was logged in for the last operation

    // Reset visual feedback on matricula field
    ui.matriculaInput.style.borderColor = '';
    ui.matriculaInput.style.backgroundColor = '';

    // Focus back to barcode input for next operation
    ui.barcodeInput.focus();
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

// Enhanced Barcode Input - Support both scanner and manual entry
let barcodeTimer = null;
let lastInputTime = 0;
let isManualEntry = false;
let inputStartTime = 0;

ui.barcodeInput.addEventListener('input', (e) => {
    const value = e.target.value.trim();
    const currentTime = Date.now();
    const timeSinceLastInput = currentTime - lastInputTime;

    // Clear any existing timer
    if (barcodeTimer) {
        clearTimeout(barcodeTimer);
        barcodeTimer = null;
    }

    // Only process if we have some content and it looks like a barcode (numbers/letters)
    if (value.length > 0 && /^[A-Za-z0-9]+$/.test(value)) {

        // If this is the first character, record start time
        if (value.length === 1) {
            inputStartTime = currentTime;
            isManualEntry = false;
            lastInputTime = currentTime;
            ui.barcodeInput.placeholder = "Aguardando leitor...";
            console.log('📱 Iniciando entrada - detectando método...');
            return; // Don't process yet, wait for more characters
        }

        // Detect input method based on timing between characters
        // If time between characters > 50ms, it's likely manual entry
        if (timeSinceLastInput > 50) {
            isManualEntry = true;
            ui.barcodeInput.placeholder = "Digite e pressione Enter";
            console.log('🖊️ Entrada manual detectada - aguardando Enter');
            // NO TIMER for manual entry - user must press Enter
        } else {
            // Fast input - likely scanner
            ui.barcodeInput.placeholder = "Aguardando leitor...";
            console.log('📱 Entrada rápida detectada - timer ativo');

            // Set timer ONLY for fast input (scanner)
            barcodeTimer = setTimeout(() => {
                console.log('⏰ Timer expirado - processando automaticamente');
                processBarcode();
                barcodeTimer = null;
            }, 150);
        }
    } else if (value.length === 0) {
        // Reset state when field is empty
        isManualEntry = false;
        inputStartTime = 0;
        ui.barcodeInput.placeholder = "Código de barras (Bipe ou digite)";
        console.log('🔄 Campo limpo - estado resetado');
    }

    lastInputTime = currentTime;
});

// Add Enter key handler for manual input
ui.barcodeInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        console.log('⏎ Enter pressionado - processando código imediatamente');

        // Clear any pending timer
        if (barcodeTimer) {
            clearTimeout(barcodeTimer);
            barcodeTimer = null;
        }

        processBarcode();
    }
});

// Function to process barcode (extracted for reuse)
function processBarcode() {
    const value = ui.barcodeInput.value.trim();

    if (!value) {
        console.log('⚠️ Campo vazio - nada para processar');
        return;
    }

    console.log(`✅ Processando código: ${value}`);

    // Focus on matricula field if it's empty, otherwise submit the form
    if (!ui.matriculaInput.value.trim()) {
        ui.matriculaInput.focus();
        console.log('👤 Foco movido para matrícula');
    } else {
        // Auto-submit if matricula is already filled
        ui.form.dispatchEvent(new Event('submit'));
        console.log('📋 Formulário submetido automaticamente');
    }

    // Reset state
    isManualEntry = false;
    inputStartTime = 0;
    ui.barcodeInput.placeholder = "Código de barras (Bipe ou digite)";
}

// Debounce function for validation
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Debounced validation function
const debouncedValidateAndUpdateGreeting = debounce((value) => {
    if (value.length > 0) {
        const validation = validateMatricula(value);
        if (validation.valid && validation.user) {
            setCurrentUser(validation.user);
        }
    } else {
        clearGreeting();
    }
}, 300); // 300ms delay

// Matricula Input Events - Real-time validation and formatting
ui.matriculaInput.addEventListener('input', (e) => {
    // Only allow numeric characters
    let value = e.target.value.replace(/\D/g, '');

    // Limit to 8 characters
    if (value.length > 8) {
        value = value.slice(0, 8);
    }

    e.target.value = value;

    // Immediate visual feedback (no debounce for UI responsiveness)
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

    // Debounced greeting update to avoid excessive DOM manipulation
    debouncedValidateAndUpdateGreeting(value);
});

// Additional autocomplete prevention for matricula field
function setupAutocompletePreventions() {
    // Set additional attributes to prevent browser history
    ui.matriculaInput.setAttribute('autocomplete', 'off');
    ui.matriculaInput.setAttribute('autocorrect', 'off');
    ui.matriculaInput.setAttribute('autocapitalize', 'off');
    ui.matriculaInput.setAttribute('spellcheck', 'false');

    // Prevent form data from being saved
    ui.matriculaInput.addEventListener('focus', () => {
        ui.matriculaInput.setAttribute('data-form-type', 'other');
    });
}

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
        showStatus('❌ ' + validation.msg, 'error');
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
            showStatus('❌ ' + validation.msg, 'error');
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
$('#config-machine-btn')?.addEventListener('click', () => {
    promptForRealMachineName();
});
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

// Initialize performance optimizations
document.addEventListener('DOMContentLoaded', () => {
    // Initialize greeting performance optimization
    setTimeout(optimizeGreetingPerformance, 100);

    // Initialize responsive layout system
    initResponsiveLayoutSystem();
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

    // Salvar no localStorage (limitado aos últimos 100 para evitar QuotaExceeded)
    try {
        localStorage.setItem('mercadoria-history', JSON.stringify(historyData.slice(0, 100)));
    } catch (e) {
        console.warn('⚠️ localStorage cheio, mantendo apenas em memória');
    }
    
    // ✅ INDEXEDDB: Salvar assíncronamente (não bloqueia)
    if (window.storageManager?.isReady) {
        window.storageManager.addLabelToHistory({
            productName: item.desc || 'Desconhecido',
            barcode: item.barcode || '',
            coddv: item.coddv || '',
            matricula: item.matricula || '',
            userName: item.userName || '',
            deposito: item.deposito || '',
            copies: item.copies || 1,
            destino: item.type || '',
            address: item.address || '',
            validity: item.validity || null,
            machine: item.machine || '',
            tipoEtiqueta: 'mercadoria',
            timestamp: item.timestamp,
            date: new Date(item.timestamp).toLocaleDateString('pt-BR')
        }).then(() => {
            console.log('💾 Etiqueta salva no IndexedDB');
        }).catch(err => {
            console.error('❌ Erro ao salvar no IndexedDB:', err);
        });
    }
}

async function showHistory() {
    $('#historico-modal').style.display = 'flex';
    $('#search-section').style.display = 'none';
    $('#search-input').value = '';
    
    // ✅ Tentar carregar do IndexedDB primeiro
    if (window.storageManager?.isReady) {
        try {
            const dbHistory = await window.storageManager.getLabelHistory({ limit: 200 });
            if (dbHistory.length > 0) {
                // Converter formato do IndexedDB para formato do app
                const convertedHistory = dbHistory.map(item => ({
                    id: item.id || Date.now(),
                    desc: item.productName,
                    coddv: item.coddv,
                    barcode: item.barcode,
                    matricula: item.matricula,
                    userName: item.userName,
                    deposito: item.deposito,
                    address: item.address,
                    type: item.destino,
                    copies: item.copies,
                    validity: item.validity,
                    machine: item.machine,
                    timestamp: item.timestamp
                }));
                
                // Atualizar historyData global
                historyData = convertedHistory;
                console.log(`📊 ${convertedHistory.length} registros carregados do IndexedDB`);
            }
        } catch (error) {
            console.warn('⚠️ Erro ao carregar do IndexedDB, usando localStorage:', error);
        }
    }
    
    renderHistory(historyData);
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
        const depositoDisplay = formatDepositoDisplay(item.deposito);
        const div = document.createElement('div');
        div.className = 'historico-item';
        div.innerHTML = `
            <div class="historico-info">
                <div class="historico-primary">${item.desc}</div>
                <div class="historico-secondary">
                    <span>CODDV: ${item.coddv}</span> • 
                    <span>EAN: ${item.barcode || '---'}</span> • 
                    <span>Matrícula: ${item.matricula}</span>${item.userName ? ` • <span>👤 ${item.userName}</span>` : ''}
                </div>
                <div class="historico-secondary" style="margin-top: 2px; color: #4b5563;">
                    <span>${depositoDisplay}</span> •
                    <span>📍 ${item.address || '---'}</span> • 
                    <span>${(item.type || '').toUpperCase()}</span>
                    ${item.copies ? ` • <span>🏷️ ${item.copies}x</span>` : ''}
                    ${item.validity ? ` • <span>📆 Val: ${item.validity}</span>` : ''}
                    ${item.machine ? ` • <span>💻 ${item.machine}</span>` : ''}
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
                    userName: normalizeSearchTerm(item.userName), // Adicionar nome do usuário
                    barcode: normalizeSearchTerm(item.barcode),
                    machine: normalizeSearchTerm(item.machine),
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
                    case 'machine':
                        return normalizedFields.machine.includes(term);
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
// Persistência da escolha de destino
function saveDestinoPreference(destino) {
    localStorage.setItem('destino-preference', destino);
}

function loadDestinoPreference() {
    const saved = localStorage.getItem('destino-preference');
    if (saved) {
        const radio = document.querySelector(`input[name="destino"][value="${saved}"]`);
        if (radio) {
            radio.checked = true;
            updateInstructions();
        }
    }
}

function updateInstructions() {
    const type = document.querySelector('input[name="destino"]:checked').value;
    const target = $('#instruction-target');
    if (target) {
        if (type === 'automatico') {
            target.textContent = 'Modo inteligente: 1 etiqueta → SEPARAÇÃO (estação), mais etiquetas → PULMÃO.';
        } else {
            target.textContent = `O sistema buscará automaticamente o endereço de ${type.toUpperCase()}.`;
        }
    }
}
document.querySelectorAll('input[name="destino"]').forEach(r => {
    r.addEventListener('change', (e) => {
        updateInstructions();
        saveDestinoPreference(e.target.value);
    });
});

// Persistência da escolha de depósito
function saveDepositoPreference(deposito) {
    localStorage.setItem('deposito-preference', deposito);
}

function loadDepositoPreference() {
    const saved = localStorage.getItem('deposito-preference');
    if (saved && ui.depositoSelect) {
        // Só define o valor se houver uma preferência salva
        const option = ui.depositoSelect.querySelector(`option[value="${saved}"]`);
        if (option) {
            ui.depositoSelect.value = saved;
            ui.depositoSelect.style.color = '#374151'; // Cor normal quando selecionado
            ui.depositoSelect.style.fontWeight = 'bold';
        }
    }
    // Se não houver preferência salva, mantém vazio (valor padrão do HTML)
    if (!ui.depositoSelect.value) {
        ui.depositoSelect.style.color = '#9ca3af'; // Cor cinza quando vazio
        ui.depositoSelect.style.fontWeight = 'bold';
    }
}

// Event listener para salvar preferência de depósito
if (ui.depositoSelect) {
    ui.depositoSelect.addEventListener('change', (e) => {
        const value = e.target.value;
        saveDepositoPreference(value);

        // Mudar cor do select baseado na seleção, mantendo negrito
        if (value) {
            e.target.style.color = '#374151'; // Cor normal quando selecionado
            e.target.style.fontWeight = 'bold';
        } else {
            e.target.style.color = '#9ca3af'; // Cor cinza quando vazio
            e.target.style.fontWeight = 'bold';
        }
    });

    // Definir cor inicial baseada no valor atual
    const currentValue = ui.depositoSelect.value;
    if (currentValue) {
        ui.depositoSelect.style.color = '#374151';
        ui.depositoSelect.style.fontWeight = 'bold';
    } else {
        ui.depositoSelect.style.color = '#9ca3af';
        ui.depositoSelect.style.fontWeight = 'bold';
    }
}

// ===== COUNTDOWN SYSTEM CLASSES =====

// Classe para gerenciar a lógica de contagem regressiva
class CountdownTimer {
    constructor(refreshTime, onUpdate, onComplete) {
        this.refreshTime = refreshTime;
        this.onUpdate = onUpdate;
        this.onComplete = onComplete;
        this.isActive = false;
        this.remainingTime = 0;
        this.intervalId = null;
        this.startTime = null;
    }

    start(remainingSeconds) {
        try {
            if (this.isActive) {
                this.stop();
            }

            // Validação de entrada
            if (typeof remainingSeconds !== 'number' || remainingSeconds <= 0) {
                console.error('⚠️ Valor inválido para contagem regressiva:', remainingSeconds);
                return;
            }

            this.remainingTime = remainingSeconds;
            this.startTime = Date.now();
            this.isActive = true;

            console.log(`⏱️ Iniciando contagem regressiva: ${remainingSeconds} segundos`);

            // Primeira atualização imediata
            this.updateCountdown();

            // Configurar interval para atualizações
            this.intervalId = setInterval(() => {
                try {
                    this.updateCountdown();
                } catch (error) {
                    console.error('⚠️ Erro durante atualização do contador:', error);
                    this.reset();
                }
            }, 1000);
        } catch (error) {
            console.error('⚠️ Erro ao iniciar contador:', error);
            this.reset();
        }
    }

    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.isActive = false;
        console.log('⏹️ Contagem regressiva parada');
    }

    reset() {
        this.stop();
        this.remainingTime = 0;
        this.startTime = null;
        console.log('🔄 Contagem regressiva resetada');
    }

    updateCountdown() {
        if (!this.isActive) return;

        // Calcular tempo restante baseado no tempo real do sistema
        const now = Date.now();
        const elapsed = Math.floor((now - this.startTime) / 1000);
        const remaining = Math.max(0, this.remainingTime - elapsed);

        // Validação de consistência
        if (elapsed < 0 || remaining < 0) {
            console.warn('⚠️ Inconsistência detectada no timer - resetando');
            this.reset();
            return;
        }

        const minutes = Math.floor(remaining / 60);
        const seconds = remaining % 60;

        // Validação dos valores calculados
        if (minutes < 0 || seconds < 0 || minutes > 60) {
            console.warn('⚠️ Valores inválidos calculados - corrigindo');
            this.reset();
            return;
        }

        // Chamar callback de atualização
        if (this.onUpdate) {
            try {
                this.onUpdate(minutes, seconds, remaining);
            } catch (error) {
                console.error('⚠️ Erro no callback de atualização:', error);
            }
        }

        // Verificar se chegou ao fim
        if (remaining <= 0) {
            this.stop();
            if (this.onComplete) {
                try {
                    this.onComplete();
                } catch (error) {
                    console.error('⚠️ Erro no callback de conclusão:', error);
                }
            }
        }
    }

    getRemainingTime() {
        if (!this.isActive) return { minutes: 0, seconds: 0, total: 0 };

        const now = Date.now();
        const elapsed = Math.floor((now - this.startTime) / 1000);
        const remaining = Math.max(0, this.remainingTime - elapsed);

        return {
            minutes: Math.floor(remaining / 60),
            seconds: remaining % 60,
            total: remaining
        };
    }
}

// Classe para gerenciar interface do contador e ícone de informação
class CountdownUI {
    constructor() {
        this.countdownElement = null;
        this.infoElement = null;
        this.createElements();
        this.insertIntoHeader();
    }

    createElements() {
        this.createInfoIcon();
        this.createCountdownButton();
    }

    createInfoIcon() {
        this.infoElement = document.createElement('button');
        this.infoElement.className = 'info-btn';
        this.infoElement.title = '';
        this.infoElement.innerHTML = `
            <svg class="info-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12,6 12,12 16,14"/>
                <circle cx="12" cy="12" r="1" fill="currentColor"/>
            </svg>
            <div class="tooltip">Carregando...</div>
        `;

        // Estilo inline para garantir funcionamento
        this.infoElement.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: center;
            width: 36px;
            height: 36px;
            background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(147, 197, 253, 0.1));
            color: #3b82f6;
            border: 1px solid rgba(59, 130, 246, 0.2);
            border-radius: 50%;
            cursor: help;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
            margin-right: 8px;
            box-shadow: 0 2px 8px rgba(59, 130, 246, 0.1);
        `;

        // Estilo para hover
        this.infoElement.addEventListener('mouseenter', () => {
            this.infoElement.style.background = 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(147, 197, 253, 0.15))';
            this.infoElement.style.color = '#2563eb';
            this.infoElement.style.borderColor = 'rgba(59, 130, 246, 0.3)';
            this.infoElement.style.transform = 'scale(1.05)';
            this.infoElement.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.2)';
        });

        this.infoElement.addEventListener('mouseleave', () => {
            this.infoElement.style.background = 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(147, 197, 253, 0.1))';
            this.infoElement.style.color = '#3b82f6';
            this.infoElement.style.borderColor = 'rgba(59, 130, 246, 0.2)';
            this.infoElement.style.transform = 'scale(1)';
            this.infoElement.style.boxShadow = '0 2px 8px rgba(59, 130, 246, 0.1)';
        });

        // Estilo para tooltip
        const tooltip = this.infoElement.querySelector('.tooltip');
        tooltip.style.cssText = `
            position: absolute;
            bottom: -45px;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(135deg, #1f2937, #374151);
            color: white;
            padding: 0.6rem 0.9rem;
            border-radius: 0.5rem;
            font-size: 0.75rem;
            font-weight: 500;
            white-space: nowrap;
            opacity: 0;
            pointer-events: none;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            z-index: 1000;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            border: 1px solid rgba(255, 255, 255, 0.1);
        `;

        // Adicionar seta ao tooltip
        const arrow = document.createElement('div');
        arrow.style.cssText = `
            position: absolute;
            top: -6px;
            left: 50%;
            transform: translateX(-50%);
            width: 0;
            height: 0;
            border-left: 6px solid transparent;
            border-right: 6px solid transparent;
            border-bottom: 6px solid #1f2937;
        `;
        tooltip.appendChild(arrow);

        this.infoElement.addEventListener('mouseenter', () => {
            tooltip.style.opacity = '1';
            tooltip.style.transform = 'translateX(-50%) translateY(-2px)';
        });

        this.infoElement.addEventListener('mouseleave', () => {
            tooltip.style.opacity = '0';
            tooltip.style.transform = 'translateX(-50%) translateY(0)';
        });
    }

    createCountdownButton() {
        this.countdownElement = document.createElement('button');
        this.countdownElement.className = 'countdown-btn';
        this.countdownElement.innerHTML = `
            <svg class="countdown-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12,6 12,12 16,14"/>
            </svg>
            <span class="countdown-label">Atualização em andamento:</span>
            <span class="countdown-text">1:00</span>
        `;

        // Estilo inline para garantir funcionamento
        this.countdownElement.style.cssText = `
            display: none;
            align-items: center;
            gap: 0.5rem;
            padding: 0.5rem 1rem;
            background: linear-gradient(135deg, #ef4444, #dc2626);
            color: white;
            border: none;
            border-radius: 0.5rem;
            font-size: 0.875rem;
            font-weight: 600;
            cursor: default;
            transition: all 0.3s ease;
            box-shadow: 0 2px 4px rgba(239, 68, 68, 0.2);
            margin-right: 8px;
        `;
    }

    insertIntoHeader() {
        const hubButton = document.querySelector('#btnHub');
        if (hubButton && hubButton.parentNode) {
            // Inserir ícone de informação antes do botão Hub
            hubButton.parentNode.insertBefore(this.infoElement, hubButton);
            // Inserir botão contador antes do botão Hub (inicialmente oculto)
            hubButton.parentNode.insertBefore(this.countdownElement, hubButton);
        }
    }

    showCountdown(minutes, seconds) {
        // Garantir que o ícone de informação está completamente oculto durante a contagem
        this.infoElement.style.display = 'none !important';
        this.infoElement.style.visibility = 'hidden';
        this.infoElement.style.opacity = '0';

        // Mostrar contador
        this.countdownElement.style.display = 'flex';
        this.countdownElement.style.visibility = 'visible';
        this.countdownElement.style.opacity = '1';

        this.updateCountdown(minutes, seconds);

        console.log('🔄 Contador ativado - ícone relógio OCULTO');
    }

    hideCountdown() {
        // Ocultar contador
        this.countdownElement.style.display = 'none';
        this.countdownElement.style.visibility = 'hidden';
        this.countdownElement.style.opacity = '0';

        // Mostrar ícone de informação novamente
        this.infoElement.style.display = 'flex';
        this.infoElement.style.visibility = 'visible';
        this.infoElement.style.opacity = '1';

        // Remover classe urgent se existir
        this.countdownElement.classList.remove('urgent');

        console.log('🔄 Contador desativado - ícone relógio VISÍVEL');
    }

    updateCountdown(minutes, seconds) {
        try {
            const countdownText = this.countdownElement.querySelector('.countdown-text');
            if (countdownText) {
                countdownText.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            }
        } catch (error) {
            console.error('⚠️ Erro ao atualizar contador na UI:', error);
        }
    }

    updateInfoTooltip(lastRefreshDate) {
        try {
            const tooltip = this.infoElement.querySelector('.tooltip');
            if (tooltip && lastRefreshDate) {
                const formatted = this.formatRefreshTime(lastRefreshDate);
                tooltip.textContent = `Última atualização: ${formatted}`;
            } else if (tooltip) {
                tooltip.textContent = 'Nenhuma atualização registrada';
            }
        } catch (error) {
            console.error('⚠️ Erro ao atualizar tooltip:', error);
        }
    }

    setUrgentStyle(isUrgent) {
        if (isUrgent) {
            this.countdownElement.classList.add('urgent');
            // Adicionar animação de pulse via CSS inline
            this.countdownElement.style.animation = 'pulse 1s infinite';
            this.countdownElement.style.boxShadow = '0 4px 8px rgba(239, 68, 68, 0.4)';
        } else {
            this.countdownElement.classList.remove('urgent');
            this.countdownElement.style.animation = '';
            this.countdownElement.style.boxShadow = '0 2px 4px rgba(239, 68, 68, 0.2)';
        }
    }

    formatRefreshTime(date) {
        if (!date) return 'N/A';

        const d = new Date(date);
        const day = d.getDate().toString().padStart(2, '0');
        const month = (d.getMonth() + 1).toString().padStart(2, '0');
        const year = d.getFullYear();
        const hours = d.getHours().toString().padStart(2, '0');
        const minutes = d.getMinutes().toString().padStart(2, '0');
        const seconds = d.getSeconds().toString().padStart(2, '0');

        return `${day}/${month}/${year} às ${hours}:${minutes}:${seconds}`;
    }
}

// Classe para detectar e registrar atualizações manuais e automáticas
class RefreshTracker {
    constructor() {
        this.storageKey = 'last-refresh-time';
        this.detectManualRefresh();
    }

    detectManualRefresh() {
        // Detecta se a página foi atualizada manualmente
        const pageLoadTime = new Date();
        const lastPageLoad = localStorage.getItem('last-page-load');

        // Se existe um registro anterior de carregamento, significa que houve refresh
        if (lastPageLoad) {
            const lastLoad = new Date(lastPageLoad);
            const timeDiff = pageLoadTime.getTime() - lastLoad.getTime();

            // Se o tempo entre carregamentos for menor que 50 minutos, provavelmente foi manual
            // (considerando que o auto-refresh é de 1 hora)
            if (timeDiff < 50 * 60 * 1000) {
                console.log('🔄 Refresh manual detectado');
                this.recordRefresh(true);
            } else {
                console.log('🔄 Refresh automático detectado');
                this.recordRefresh(false);
            }
        } else {
            // Primeira vez carregando a página
            console.log('🔄 Primeira carga da página');
            this.recordRefresh(false);
        }

        // Atualizar o timestamp de carregamento da página
        localStorage.setItem('last-page-load', pageLoadTime.toISOString());
    }

    recordRefresh(isManual = false) {
        const refreshData = {
            timestamp: new Date().toISOString(),
            isManual: isManual,
            userAgent: navigator.userAgent,
            pageLoadTime: new Date().toISOString()
        };

        localStorage.setItem(this.storageKey, JSON.stringify(refreshData));

        const type = isManual ? 'manual' : 'automática';
        console.log(`📝 Atualização ${type} registrada: ${this.formatRefreshTime(new Date())}`);
    }

    getLastRefreshTime() {
        try {
            const data = localStorage.getItem(this.storageKey);
            if (data) {
                const refreshData = JSON.parse(data);
                return new Date(refreshData.timestamp);
            }
        } catch (error) {
            console.warn('Erro ao recuperar dados de refresh:', error);
        }
        return null;
    }

    formatRefreshTime(date) {
        if (!date) return 'N/A';

        const d = new Date(date);
        const day = d.getDate().toString().padStart(2, '0');
        const month = (d.getMonth() + 1).toString().padStart(2, '0');
        const hours = d.getHours().toString().padStart(2, '0');
        const minutes = d.getMinutes().toString().padStart(2, '0');
        const seconds = d.getSeconds().toString().padStart(2, '0');

        return `${day}/${month} às ${hours}:${minutes}:${seconds}`;
    }

    getRefreshData() {
        try {
            const data = localStorage.getItem(this.storageKey);
            if (data) {
                return JSON.parse(data);
            }
        } catch (error) {
            console.warn('Erro ao recuperar dados completos de refresh:', error);
        }
        return null;
    }
}

// Auto-refresh functionality - Refresh page every 15 minutes
function setupAutoRefresh() {
    // Configuração do sistema
    const CONFIG = {
        REFRESH_INTERVAL: 15 * 60 * 1000, // 15 minutos em produção
        TEST_REFRESH_INTERVAL: 60 * 60 * 1000, // 1 hora em teste (ajustado)
        COUNTDOWN_THRESHOLD: 60 * 1000, // Mostrar contador nos últimos 60s
        INACTIVITY_THRESHOLD: 30 * 1000, // 30s de inatividade
        UPDATE_INTERVAL: 1000, // Atualizar contador a cada 1s
        URGENT_THRESHOLD: 10 * 1000 // Estilo urgente nos últimos 10s
    };

    // Flag de teste - altere para true para testar com 2 minutos
    const IS_TEST_MODE = false; // ALTERAR PARA false EM PRODUÇÃO

    const ONE_HOUR = IS_TEST_MODE ? CONFIG.TEST_REFRESH_INTERVAL : CONFIG.REFRESH_INTERVAL;
    const THIRTY_SECONDS = CONFIG.INACTIVITY_THRESHOLD;

    console.log(`⚙️ Modo: ${IS_TEST_MODE ? 'TESTE (2 minutos)' : 'PRODUÇÃO (15 minutos)'}`);
    console.log(`⏰ Intervalo de atualização: ${ONE_HOUR / 1000 / 60} minutos`);

    let lastActivity = Date.now();
    let countdownTimer = null;
    let refreshTimeoutId = null;

    // Track user activity
    const updateActivity = () => {
        lastActivity = Date.now();

        // Se o contador está ativo, cancelar e resetar
        if (countdownTimer && countdownTimer.isActive) {
            console.log('👤 Atividade detectada durante contagem - cancelando contador');
            countdownTimer.reset();
            if (window.countdownUI) {
                window.countdownUI.hideCountdown();
            }

            // Resetar o timer principal
            if (refreshTimeoutId) {
                clearTimeout(refreshTimeoutId);
            }
            setupRefreshTimer();
        }
    };

    // Listen for user activity events
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click', 'input'];
    activityEvents.forEach(event => {
        document.addEventListener(event, updateActivity, true);
    });

    // Store page load time
    const pageLoadTime = new Date();
    localStorage.setItem('last-page-load', pageLoadTime.toISOString());

    // Calculate next refresh time
    const nextRefreshTime = new Date(pageLoadTime.getTime() + ONE_HOUR);

    console.log(`⏰ Página carregada: ${pageLoadTime.toLocaleString('pt-BR')}`);
    console.log(`🔄 Próxima atualização: ${nextRefreshTime.toLocaleString('pt-BR')}`);

    // Function to check if user is inactive and refresh if needed
    const checkAndRefresh = () => {
        const now = Date.now();
        const timeSinceLastActivity = now - lastActivity;

        if (timeSinceLastActivity >= THIRTY_SECONDS) {
            console.log('🔄 Atualizando página - usuário inativo por mais de 30 segundos');
            // Registrar como atualização automática antes do reload
            if (window.refreshTracker) {
                window.refreshTracker.recordRefresh(false);
            }
            window.location.reload();
        } else {
            const remainingWait = THIRTY_SECONDS - timeSinceLastActivity;
            console.log(`⏳ Aguardando inatividade... ${Math.ceil(remainingWait / 1000)}s restantes`);

            // Check again after the remaining time
            setTimeout(checkAndRefresh, remainingWait + 1000);
        }
    };

    // Function to start countdown when 60 seconds remain
    const startCountdown = () => {
        console.log('⏰ Iniciando contagem regressiva de 60 segundos');

        // Criar callbacks para o contador
        const onUpdate = (minutes, seconds, totalSeconds) => {
            if (window.countdownUI) {
                window.countdownUI.updateCountdown(minutes, seconds);

                // Aplicar estilo urgente nos últimos 10 segundos
                const isUrgent = totalSeconds <= 10;
                window.countdownUI.setUrgentStyle(isUrgent);
            }
        };

        const onComplete = () => {
            console.log('⏰ Contagem regressiva concluída - verificando atividade do usuário');
            checkAndRefresh();
        };

        // Inicializar contador
        countdownTimer = new CountdownTimer(Date.now() + 60000, onUpdate, onComplete);
        countdownTimer.start(60);

        // Mostrar UI do contador
        if (window.countdownUI) {
            window.countdownUI.showCountdown(1, 0);
        }
    };

    // Function to setup the main refresh timer
    const setupRefreshTimer = () => {
        const countdownTime = ONE_HOUR - CONFIG.COUNTDOWN_THRESHOLD; // Tempo até iniciar contagem (59 minutos)

        console.log(`⏰ Timer principal configurado para ${countdownTime / 1000 / 60} minutos`);

        refreshTimeoutId = setTimeout(() => {
            console.log('⏰ Tempo para contagem regressiva atingido');
            startCountdown();
        }, countdownTime);
    };

    // Set up automatic refresh check after 1 hour minus countdown time
    setupRefreshTimer();

    console.log('⏰ Auto-refresh configurado para 15 minutos com detecção de atividade');
}

// Boot
init();
setupAutoRefresh();

// ============================================
// FUNÇÕES DE EXPORTAÇÃO E ESTATÍSTICAS
// ============================================

async function exportHistoryToCSV() {
    if (!window.storageManager?.isReady) {
        showStatus('❌ IndexedDB não disponível', 'error');
        return;
    }

    try {
        const historico = await window.storageManager.getLabelHistory({ limit: 10000 });
        
        if (historico.length === 0) {
            showStatus('ℹ️ Nenhum dado para exportar', 'warning');
            return;
        }

        const headers = ['Data/Hora', 'Produto', 'CODDV', 'EAN', 'Matrícula', 'Operador', 'Depósito', 'Cópias', 'Destino', 'Endereço', 'Máquina'];
        
        const rows = historico.map(item => [
            new Date(item.timestamp).toLocaleString('pt-BR'),
            item.productName || '',
            item.coddv || '',
            item.barcode || '',
            item.matricula || '',
            item.userName || '',
            item.deposito || '',
            item.copies || 1,
            item.destino || '',
            item.address || '',
            item.machine || ''
        ]);

        const csvContent = '\ufeff' + [
            headers.join(';'),
            ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';'))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `historico-etiquetas-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showStatus(`✅ ${historico.length} registros exportados`, 'success');
        console.log(`✅ ${historico.length} registros exportados`);
    } catch (error) {
        console.error('❌ Erro ao exportar:', error);
        showStatus('❌ Erro ao exportar', 'error');
    }
}

async function showStorageStats() {
    if (!window.storageManager?.isReady) {
        showStatus('❌ IndexedDB não disponível', 'error');
        return;
    }

    try {
        const stats = await window.storageManager.getDetailedStats();
        
        // Apenas log no console, sem alertas
        console.log('📊 Estatísticas de Armazenamento:');
        console.log(`  • ${stats.totalRecords.toLocaleString()} etiquetas no IndexedDB`);
        console.log(`  • Espaço usado: ~${stats.estimatedSizeMB} MB de ${stats.limitMB} MB`);
        console.log(`  • Uso: ${stats.usagePercent}%`);
        console.log(`  • ${historyData.length} etiquetas no localStorage (backup)`);
        console.log(`  ⏱️ Retenção: 2 anos (automático)`);
        
        showStatus(`📊 ${stats.totalRecords.toLocaleString()} etiquetas salvas`, 'success');
    } catch (error) {
        console.error('❌ Erro:', error);
        showStatus('❌ Erro ao obter estatísticas', 'error');
    }
}


