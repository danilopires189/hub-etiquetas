#!/usr/bin/env node

/**
 * CSS Validation Script for User Greeting Visual Standardization
 * Checkpoint 5: Validate the created styles file
 */

const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m',
    bold: '\x1b[1m'
};

function log(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    let color = colors.blue;
    let prefix = 'ℹ️';
    
    switch (type) {
        case 'success':
            color = colors.green;
            prefix = '✅';
            break;
        case 'error':
            color = colors.red;
            prefix = '❌';
            break;
        case 'warning':
            color = colors.yellow;
            prefix = '⚠️';
            break;
    }
    
    console.log(`${color}${prefix} [${timestamp}] ${message}${colors.reset}`);
}

function validateCSSFile() {
    log('🎨 Iniciando validação do arquivo de estilos CSS', 'info');
    
    const cssFilePath = path.join(__dirname, 'user-greeting-etiqueta-style.css');
    
    // Check if file exists
    if (!fs.existsSync(cssFilePath)) {
        log('Arquivo user-greeting-etiqueta-style.css não encontrado!', 'error');
        return false;
    }
    
    log('Arquivo CSS encontrado', 'success');
    
    // Read CSS content
    const cssContent = fs.readFileSync(cssFilePath, 'utf8');
    
    // Validation tests
    const tests = [
        {
            name: 'CSS Custom Properties (Variables)',
            test: () => {
                const hasVariables = cssContent.includes('--greeting-gradient-start') &&
                                   cssContent.includes('--greeting-gradient-end') &&
                                   cssContent.includes('--greeting-text-color');
                return hasVariables;
            }
        },
        {
            name: 'Main User Greeting Class',
            test: () => {
                return cssContent.includes('.user-greeting-top') &&
                       cssContent.includes('linear-gradient');
            }
        },
        {
            name: 'Gradient Colors (#667eea and #764ba2)',
            test: () => {
                return cssContent.includes('#667eea') &&
                       cssContent.includes('#764ba2');
            }
        },
        {
            name: 'Interactive States (Hover Effects)',
            test: () => {
                return cssContent.includes('.user-greeting-top:hover') &&
                       cssContent.includes('transform') &&
                       cssContent.includes('scale');
            }
        },
        {
            name: 'Shimmer Effect (::before pseudo-element)',
            test: () => {
                return cssContent.includes('.user-greeting-top::before') &&
                       cssContent.includes('shimmer');
            }
        },
        {
            name: 'Wave Animation',
            test: () => {
                return cssContent.includes('.greeting-wave') &&
                       cssContent.includes('@keyframes') &&
                       cssContent.includes('welcomeWave');
            }
        },
        {
            name: 'Responsive Design (Media Queries)',
            test: () => {
                return cssContent.includes('@media (min-width: 768px)') &&
                       cssContent.includes('@media (min-width: 1024px)') &&
                       cssContent.includes('@media (max-width: 767px)');
            }
        },
        {
            name: 'Accessibility Features',
            test: () => {
                return cssContent.includes('prefers-reduced-motion') &&
                       cssContent.includes('focus-visible') &&
                       cssContent.includes('prefers-contrast');
            }
        },
        {
            name: 'Browser Compatibility Fallbacks',
            test: () => {
                return cssContent.includes('@supports not') &&
                       cssContent.includes('fallback') &&
                       cssContent.includes('-webkit-linear-gradient');
            }
        },
        {
            name: 'Dark Mode Support',
            test: () => {
                return cssContent.includes('prefers-color-scheme: dark') &&
                       cssContent.includes('#4c6ef5') &&
                       cssContent.includes('#7c3aed');
            }
        },
        {
            name: 'High Contrast Mode',
            test: () => {
                return cssContent.includes('prefers-contrast: high') &&
                       cssContent.includes('forced-colors: active');
            }
        },
        {
            name: 'Print Styles',
            test: () => {
                return cssContent.includes('@media print') &&
                       cssContent.includes('page-break-inside: avoid');
            }
        },
        {
            name: 'Tooltip for Truncated Names',
            test: () => {
                return cssContent.includes('.tooltip') &&
                       cssContent.includes('data-truncated');
            }
        },
        {
            name: 'Animation Keyframes',
            test: () => {
                const keyframes = [
                    'greetingFadeIn',
                    'shimmerMove',
                    'welcomeWave',
                    'continuousWaveAndSway',
                    'energeticWaveAndSway'
                ];
                return keyframes.every(kf => cssContent.includes(kf));
            }
        },
        {
            name: 'CSS Structure and Organization',
            test: () => {
                return cssContent.includes('/* ===== CSS CUSTOM PROPERTIES') &&
                       cssContent.includes('/* ===== MAIN USER GREETING COMPONENT') &&
                       cssContent.includes('/* ===== BROWSER COMPATIBILITY FALLBACKS');
            }
        }
    ];
    
    // Run tests
    let passedTests = 0;
    let totalTests = tests.length;
    
    log(`\n${colors.bold}🧪 Executando ${totalTests} testes de validação...${colors.reset}\n`);
    
    tests.forEach((test, index) => {
        try {
            const result = test.test();
            if (result) {
                log(`${index + 1}. ${test.name}`, 'success');
                passedTests++;
            } else {
                log(`${index + 1}. ${test.name}`, 'error');
            }
        } catch (error) {
            log(`${index + 1}. ${test.name} - Erro: ${error.message}`, 'error');
        }
    });
    
    // Summary
    log(`\n${colors.bold}📊 Resumo da Validação:${colors.reset}`);
    log(`✅ Testes aprovados: ${passedTests}/${totalTests}`);
    log(`❌ Testes falharam: ${totalTests - passedTests}/${totalTests}`);
    
    const successRate = (passedTests / totalTests) * 100;
    log(`📈 Taxa de sucesso: ${successRate.toFixed(1)}%`);
    
    if (successRate >= 90) {
        log('\n🎉 VALIDAÇÃO APROVADA - Arquivo de estilos está bem implementado!', 'success');
        return true;
    } else if (successRate >= 70) {
        log('\n⚠️ VALIDAÇÃO PARCIAL - Arquivo precisa de alguns ajustes', 'warning');
        return false;
    } else {
        log('\n❌ VALIDAÇÃO REPROVADA - Arquivo precisa de correções significativas', 'error');
        return false;
    }
}

function validateFileSize() {
    const cssFilePath = path.join(__dirname, 'user-greeting-etiqueta-style.css');
    const stats = fs.statSync(cssFilePath);
    const fileSizeKB = (stats.size / 1024).toFixed(2);
    
    log(`📁 Tamanho do arquivo: ${fileSizeKB} KB`);
    
    if (stats.size > 100000) { // 100KB
        log('Arquivo muito grande - considere otimização', 'warning');
    } else {
        log('Tamanho do arquivo adequado', 'success');
    }
}

function validateSyntax() {
    log('\n🔍 Validando sintaxe CSS básica...');
    
    const cssFilePath = path.join(__dirname, 'user-greeting-etiqueta-style.css');
    const cssContent = fs.readFileSync(cssFilePath, 'utf8');
    
    // Basic syntax checks
    const syntaxTests = [
        {
            name: 'Chaves balanceadas',
            test: () => {
                const openBraces = (cssContent.match(/\{/g) || []).length;
                const closeBraces = (cssContent.match(/\}/g) || []).length;
                return openBraces === closeBraces;
            }
        },
        {
            name: 'Parênteses balanceados',
            test: () => {
                const openParens = (cssContent.match(/\(/g) || []).length;
                const closeParens = (cssContent.match(/\)/g) || []).length;
                return openParens === closeParens;
            }
        },
        {
            name: 'Sem caracteres inválidos',
            test: () => {
                // Check for common invalid characters
                return !cssContent.includes('undefined') && 
                       !cssContent.includes('null') &&
                       !cssContent.includes('NaN');
            }
        }
    ];
    
    syntaxTests.forEach(test => {
        if (test.test()) {
            log(test.name, 'success');
        } else {
            log(test.name, 'error');
        }
    });
}

// Main execution
function main() {
    console.log(`${colors.bold}${colors.blue}
╔══════════════════════════════════════════════════════════════╗
║                    CSS VALIDATION CHECKPOINT                 ║
║              User Greeting Visual Standardization           ║
╚══════════════════════════════════════════════════════════════╝
${colors.reset}`);
    
    try {
        validateFileSize();
        validateSyntax();
        const isValid = validateCSSFile();
        
        if (isValid) {
            log('\n🚀 CHECKPOINT 5 APROVADO - Arquivo de estilos validado com sucesso!', 'success');
            process.exit(0);
        } else {
            log('\n🔧 CHECKPOINT 5 REQUER ATENÇÃO - Verifique os itens falharam', 'warning');
            process.exit(1);
        }
        
    } catch (error) {
        log(`Erro durante a validação: ${error.message}`, 'error');
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = { validateCSSFile, validateFileSize, validateSyntax };