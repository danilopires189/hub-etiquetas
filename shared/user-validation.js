// User Validation System - Shared Infrastructure
// Extracted from etiqueta-mercadoria module for cross-module consistency

// Data Store for user validation
const UserValidationData = {
    users: new Map(), // MATRICULA -> User Object
    isReady: false
};

// Current User State
let currentValidatedUser = null;

// Shared utility functions
function curDateTime() {
    const now = new Date();
    const d = now.toLocaleDateString('pt-BR');
    const t = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    return `${d} ${t}`;
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

// Core Validation Functions
function validateMatricula(matricula) {
    // Remove any non-numeric characters
    const cleanMatricula = matricula.replace(/\D/g, '');

    // Check if matricula is empty
    if (!cleanMatricula) {
        return { valid: false, msg: 'Matrícula obrigatória', user: null, cleaned: cleanMatricula };
    }

    // Check if matricula exists in user database
    const user = UserValidationData.users.get(cleanMatricula);
    if (!user) {
        return { valid: false, msg: 'Matrícula não encontrada na base de usuários', user: null, cleaned: cleanMatricula };
    }

    return { valid: true, msg: 'Matrícula válida', user: user, cleaned: cleanMatricula };
}

// User Management Functions
function setCurrentUser(user) {
    currentValidatedUser = user;
    if (window.UserGreeting && window.UserGreeting.updateGreeting) {
        window.UserGreeting.updateGreeting(user.Nome);
    } else {
        console.warn('⚠️ UserGreeting não disponível, saudação não será exibida');
    }
}

function getCurrentUser() {
    return currentValidatedUser;
}

function clearCurrentUser() {
    currentValidatedUser = null;
    if (window.UserGreeting && window.UserGreeting.clearGreeting) {
        window.UserGreeting.clearGreeting();
    } else {
        console.warn('⚠️ UserGreeting não disponível, saudação não será limpa');
    }
}

// Enhanced Database Loading and Management System
let loadingState = {
    isLoading: false,
    loadStartTime: null,
    loadEndTime: null,
    lastError: null
};

// Loading state indicators
function showLoadingIndicator(message = 'Carregando base de usuários...') {
    return gracefulDegradation(() => {
        // Create or update loading indicator
        let indicator = document.getElementById('database-loading-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'database-loading-indicator';
            indicator.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: #2196f3;
                color: white;
                padding: 12px 20px;
                border-radius: 4px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                z-index: 10000;
                font-family: Arial, sans-serif;
                font-size: 14px;
                display: flex;
                align-items: center;
                gap: 10px;
            `;
            document.body.appendChild(indicator);
        }
        
        indicator.innerHTML = `
            <div style="
                width: 16px;
                height: 16px;
                border: 2px solid rgba(255,255,255,0.3);
                border-top: 2px solid white;
                border-radius: 50%;
                animation: spin 1s linear infinite;
            "></div>
            ${message}
        `;
        
        // Add CSS animation if not exists
        if (!document.getElementById('loading-animation-styles')) {
            const style = document.createElement('style');
            style.id = 'loading-animation-styles';
            style.textContent = `
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(style);
        }
        
        indicator.style.display = 'flex';
        return true;
    }, false, 'exibir indicador de carregamento');
}

function hideLoadingIndicator() {
    return gracefulDegradation(() => {
        const indicator = document.getElementById('database-loading-indicator');
        if (indicator) {
            indicator.style.display = 'none';
        }
        return true;
    }, false, 'ocultar indicador de carregamento');
}

// Data integrity validation
function validateUserData(userData) {
    if (!userData || typeof userData !== 'object') {
        return { valid: false, error: 'Dados de usuário inválidos: não é um objeto' };
    }
    
    if (!userData.BASE_USUARIO || !Array.isArray(userData.BASE_USUARIO)) {
        return { valid: false, error: 'Estrutura de dados inválida: BASE_USUARIO não é um array' };
    }
    
    const users = userData.BASE_USUARIO;
    const errors = [];
    const validUsers = [];
    
    for (let i = 0; i < users.length; i++) {
        const user = users[i];
        const userErrors = [];
        
        // Check required fields
        if (!user.hasOwnProperty('Matricula')) {
            userErrors.push('Campo Matricula ausente');
        } else if (typeof user.Matricula !== 'number' && typeof user.Matricula !== 'string') {
            userErrors.push('Campo Matricula deve ser número ou string');
        } else if (String(user.Matricula).trim() === '') {
            userErrors.push('Campo Matricula não pode estar vazio');
        }
        
        if (!user.hasOwnProperty('Nome')) {
            userErrors.push('Campo Nome ausente');
        } else if (typeof user.Nome !== 'string') {
            userErrors.push('Campo Nome deve ser string');
        } else if (user.Nome.trim() === '') {
            userErrors.push('Campo Nome não pode estar vazio');
        }
        
        if (userErrors.length > 0) {
            errors.push(`Usuário ${i}: ${userErrors.join(', ')}`);
        } else {
            validUsers.push(user);
        }
    }
    
    return {
        valid: errors.length === 0,
        error: errors.length > 0 ? errors.join('; ') : null,
        validUsers: validUsers,
        totalUsers: users.length,
        validCount: validUsers.length,
        invalidCount: errors.length
    };
}

// Enhanced database loading with comprehensive error handling
async function loadUserDatabase() {
    // Prevent concurrent loading
    if (loadingState.isLoading) {
        console.log('⏳ Carregamento já em andamento...');
        return false;
    }
    
    loadingState.isLoading = true;
    loadingState.loadStartTime = Date.now();
    loadingState.lastError = null;
    
    try {
        // Show loading indicator
        showLoadingIndicator('Carregando base de usuários...');
        
        // Check if BASE_USUARIO is already loaded via script tag
        if (!window.DB_USUARIO) {
            throw new Error('Base de dados USUARIOS não encontrada. Verifique se ../data_base/BASE_USUARIO.js foi carregado');
        }

        // Validate data integrity
        const validation = validateUserData(window.DB_USUARIO);
        if (!validation.valid) {
            throw new Error(`Validação de integridade falhou: ${validation.error}`);
        }
        
        if (validation.invalidCount > 0) {
            console.warn(`⚠️ ${validation.invalidCount} usuários inválidos foram ignorados`);
        }

        // Clear existing data
        UserValidationData.users.clear();
        
        // Index users by matricula for fast O(1) lookup
        let indexedCount = 0;
        const duplicateMatriculas = [];
        
        for (const user of validation.validUsers) {
            const matriculaKey = String(user.Matricula);
            
            // Check for duplicates
            if (UserValidationData.users.has(matriculaKey)) {
                duplicateMatriculas.push(matriculaKey);
                console.warn(`⚠️ Matrícula duplicada encontrada: ${matriculaKey}`);
                continue;
            }
            
            UserValidationData.users.set(matriculaKey, user);
            indexedCount++;
        }
        
        UserValidationData.isReady = true;
        loadingState.loadEndTime = Date.now();
        const loadTime = loadingState.loadEndTime - loadingState.loadStartTime;
        
        // Hide loading indicator
        hideLoadingIndicator();
        
        console.log(`✅ Base de usuários carregada com sucesso:`);
        console.log(`   📊 Total de registros: ${validation.totalUsers}`);
        console.log(`   ✅ Usuários válidos: ${validation.validCount}`);
        console.log(`   ❌ Usuários inválidos: ${validation.invalidCount}`);
        console.log(`   🔍 Usuários indexados: ${indexedCount}`);
        console.log(`   ⚡ Tempo de carregamento: ${loadTime}ms`);
        
        if (duplicateMatriculas.length > 0) {
            console.log(`   ⚠️ Matrículas duplicadas: ${duplicateMatriculas.length}`);
        }
        
        return true;
        
    } catch (error) {
        loadingState.lastError = error;
        UserValidationData.isReady = false;
        loadingState.loadEndTime = Date.now();
        
        // Hide loading indicator and show error
        hideLoadingIndicator();
        
        // Show error indicator
        showErrorIndicator(`Erro ao carregar base de usuários: ${error.message}`);
        
        console.error('❌ Erro ao carregar base de usuários:', error);
        
        // Log error for debugging
        recoverFromCriticalError(error, 'carregamento da base de usuários', () => {
            console.log('🔄 Tentativa de recuperação: limpando dados corrompidos');
            UserValidationData.users.clear();
            UserValidationData.isReady = false;
        });
        
        return false;
    } finally {
        loadingState.isLoading = false;
    }
}

// Error indicator for database loading failures
function showErrorIndicator(message) {
    return gracefulDegradation(() => {
        let indicator = document.getElementById('database-error-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'database-error-indicator';
            indicator.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: #f44336;
                color: white;
                padding: 12px 20px;
                border-radius: 4px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                z-index: 10000;
                font-family: Arial, sans-serif;
                font-size: 14px;
                max-width: 300px;
                cursor: pointer;
            `;
            indicator.onclick = () => indicator.style.display = 'none';
            document.body.appendChild(indicator);
        }
        
        indicator.innerHTML = `❌ ${message}<br><small>Clique para fechar</small>`;
        indicator.style.display = 'block';
        
        // Auto-hide after 10 seconds
        setTimeout(() => {
            if (indicator) indicator.style.display = 'none';
        }, 10000);
        
        return true;
    }, false, 'exibir indicador de erro');
}

// Get loading state information
function getDatabaseLoadingState() {
    return {
        isLoading: loadingState.isLoading,
        isReady: UserValidationData.isReady,
        userCount: UserValidationData.users.size,
        loadStartTime: loadingState.loadStartTime,
        loadEndTime: loadingState.loadEndTime,
        loadDuration: loadingState.loadEndTime && loadingState.loadStartTime ? 
            loadingState.loadEndTime - loadingState.loadStartTime : null,
        lastError: loadingState.lastError
    };
}

// Force reload database (for testing or recovery)
async function reloadUserDatabase() {
    console.log('🔄 Forçando recarregamento da base de usuários...');
    UserValidationData.isReady = false;
    UserValidationData.users.clear();
    loadingState.isLoading = false;
    return await loadUserDatabase();
}

// Enhanced Error Highlighting and Visual Feedback System
function highlightFieldError(fieldElement, message = null, duration = 2000) {
    return gracefulDegradation(() => {
        if (!validateElement(fieldElement, 'campo de entrada')) {
            return false;
        }
        
        // Store original styles for restoration
        const originalBorderColor = fieldElement.style.borderColor;
        const originalBorderWidth = fieldElement.style.borderWidth;
        const originalBorderStyle = fieldElement.style.borderStyle;
        const originalBoxShadow = fieldElement.style.boxShadow;
        
        // Apply error styling with enhanced visual feedback
        fieldElement.style.borderColor = '#f44336';
        fieldElement.style.borderWidth = '2px';
        fieldElement.style.borderStyle = 'solid';
        fieldElement.style.boxShadow = '0 0 5px rgba(244, 67, 54, 0.3)';
        
        // Add error class for CSS animations
        fieldElement.classList.add('validation-error');
        
        // Focus the field with error recovery
        focusFieldSafely(fieldElement);
        
        // Select content if possible
        if (typeof fieldElement.select === 'function') {
            try {
                fieldElement.select();
            } catch (error) {
                console.warn('Não foi possível selecionar conteúdo do campo:', error);
            }
        }
        
        // Create or update error message display
        if (message) {
            displayErrorMessage(fieldElement, message);
        }
        
        // Schedule error styling removal
        const timeoutId = setTimeout(() => {
            try {
                // Restore original styles
                fieldElement.style.borderColor = originalBorderColor;
                fieldElement.style.borderWidth = originalBorderWidth;
                fieldElement.style.borderStyle = originalBorderStyle;
                fieldElement.style.boxShadow = originalBoxShadow;
                
                // Remove error class
                fieldElement.classList.remove('validation-error');
                
                // Remove error message
                removeErrorMessage(fieldElement);
            } catch (error) {
                console.warn('Erro ao remover destaque de erro:', error);
            }
        }, duration);
        
        // Store timeout ID for potential cancellation
        fieldElement.dataset.errorTimeoutId = timeoutId;
        
        return true;
    }, false, 'destacar erro no campo');
}

// Enhanced field focusing with error recovery
function focusFieldSafely(fieldElement, retryCount = 0) {
    return gracefulDegradation(() => {
        if (!validateElement(fieldElement, 'campo para foco')) {
            return false;
        }
        
        try {
            fieldElement.focus();
            
            // Verify focus was successful
            if (document.activeElement !== fieldElement && retryCount < 2) {
                // Retry focus after a short delay
                setTimeout(() => {
                    focusFieldSafely(fieldElement, retryCount + 1);
                }, 100);
            }
            
            return true;
        } catch (error) {
            console.warn(`Erro ao focar campo (tentativa ${retryCount + 1}):`, error);
            
            // Try alternative focus methods
            if (retryCount === 0) {
                try {
                    fieldElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    setTimeout(() => {
                        focusFieldSafely(fieldElement, retryCount + 1);
                    }, 200);
                } catch (scrollError) {
                    console.warn('Erro ao rolar para o campo:', scrollError);
                }
            }
            
            return false;
        }
    }, false, 'focar campo com segurança');
}

// Error message display system
function displayErrorMessage(fieldElement, message) {
    return gracefulDegradation(() => {
        if (!validateElement(fieldElement, 'campo para mensagem de erro')) {
            return false;
        }
        
        // Remove existing error message first
        removeErrorMessage(fieldElement);
        
        // Create error message element
        const errorElement = document.createElement('div');
        errorElement.className = 'validation-error-message';
        errorElement.textContent = message;
        errorElement.style.cssText = `
            color: #f44336;
            font-size: 12px;
            margin-top: 4px;
            padding: 4px 8px;
            background: #ffebee;
            border: 1px solid #ffcdd2;
            border-radius: 4px;
            position: relative;
            z-index: 1000;
        `;
        
        // Find the best place to insert the error message
        const parentElement = fieldElement.parentNode;
        if (parentElement) {
            // Try to insert after the field
            const nextSibling = fieldElement.nextSibling;
            if (nextSibling) {
                parentElement.insertBefore(errorElement, nextSibling);
            } else {
                parentElement.appendChild(errorElement);
            }
            
            // Store reference for later removal
            fieldElement.dataset.errorMessageId = errorElement.id = `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            
            return true;
        }
        
        return false;
    }, false, 'exibir mensagem de erro');
}

// Remove error message
function removeErrorMessage(fieldElement) {
    return gracefulDegradation(() => {
        if (!fieldElement) return false;
        
        const errorMessageId = fieldElement.dataset.errorMessageId;
        if (errorMessageId) {
            const errorElement = document.getElementById(errorMessageId);
            if (errorElement && errorElement.parentNode) {
                errorElement.parentNode.removeChild(errorElement);
            }
            delete fieldElement.dataset.errorMessageId;
        }
        
        // Also remove any error messages that might be siblings
        const parentElement = fieldElement.parentNode;
        if (parentElement) {
            const errorMessages = parentElement.querySelectorAll('.validation-error-message');
            errorMessages.forEach(msg => {
                if (msg.parentNode) {
                    msg.parentNode.removeChild(msg);
                }
            });
        }
        
        return true;
    }, false, 'remover mensagem de erro');
}

// Clear all error states from a field
function clearFieldError(fieldElement) {
    return gracefulDegradation(() => {
        if (!fieldElement) return false;
        
        // Cancel any pending timeout
        const timeoutId = fieldElement.dataset.errorTimeoutId;
        if (timeoutId) {
            clearTimeout(parseInt(timeoutId));
            delete fieldElement.dataset.errorTimeoutId;
        }
        
        // Remove error styling
        fieldElement.style.borderColor = '';
        fieldElement.style.borderWidth = '';
        fieldElement.style.borderStyle = '';
        fieldElement.style.boxShadow = '';
        fieldElement.classList.remove('validation-error');
        
        // Remove error message
        removeErrorMessage(fieldElement);
        
        return true;
    }, false, 'limpar erro do campo');
}

// Enhanced form validation with comprehensive error handling
function validateBeforeGeneration(matriculaInput, showStatusCallback) {
    return gracefulDegradation(() => {
        if (!validateElement(matriculaInput, 'campo matrícula')) {
            if (showStatusCallback) {
                showStatusCallback('⚠️ Campo de matrícula não encontrado!', 'error');
            }
            return false;
        }
        
        const matricula = matriculaInput.value ? matriculaInput.value.trim() : '';
        
        // Clear any existing error states
        clearFieldError(matriculaInput);
        
        // Check if matricula is provided
        if (!matricula) {
            const errorMsg = 'Matrícula obrigatória';
            if (showStatusCallback) {
                showStatusCallback('⚠️ Informe a matrícula antes de continuar!', 'warning');
            }
            highlightFieldError(matriculaInput, errorMsg);
            
            // Log validation attempt
            console.log('🔍 Validação falhou: matrícula vazia');
            return false;
        }
        
        // Validate matricula format and existence
        const matriculaValidation = validateMatricula(matricula);
        if (!matriculaValidation.valid) {
            if (showStatusCallback) {
                showStatusCallback('⚠️ ' + matriculaValidation.msg, 'warning');
            }
            highlightFieldError(matriculaInput, matriculaValidation.msg);
            
            // Log validation details
            console.log('🔍 Validação falhou:', {
                matricula: matricula,
                cleaned: matriculaValidation.cleaned,
                message: matriculaValidation.msg
            });
            return false;
        }
        
        // Set current user when matricula is valid
        if (matriculaValidation.user) {
            setCurrentUser(matriculaValidation.user);
            console.log('✅ Usuário validado:', matriculaValidation.user.Nome);
        }
        
        return matriculaValidation;
    }, false, 'validação antes da geração');
}

// Enhanced validation with automatic error recovery
function validateMatriculaWithRecovery(matricula, options = {}) {
    const {
        maxRetries = 2,
        retryDelay = 100,
        enableLogging = true
    } = options;
    
    return gracefulDegradation(() => {
        let attempt = 0;
        let lastError = null;
        
        while (attempt <= maxRetries) {
            try {
                const result = validateMatricula(matricula);
                
                if (enableLogging && attempt > 0) {
                    console.log(`✅ Validação bem-sucedida na tentativa ${attempt + 1}`);
                }
                
                return result;
            } catch (error) {
                lastError = error;
                attempt++;
                
                if (enableLogging) {
                    console.warn(`⚠️ Erro na validação (tentativa ${attempt}):`, error.message);
                }
                
                if (attempt <= maxRetries) {
                    // Wait before retry
                    if (retryDelay > 0) {
                        // For synchronous operation, we can't actually wait
                        // but we can log the retry attempt
                        console.log(`🔄 Tentando novamente em ${retryDelay}ms...`);
                    }
                }
            }
        }
        
        // All retries failed
        if (enableLogging) {
            console.error(`❌ Validação falhou após ${maxRetries + 1} tentativas:`, lastError);
        }
        
        return {
            valid: false,
            msg: 'Erro interno na validação. Tente novamente.',
            user: null,
            cleaned: matricula ? matricula.replace(/\D/g, '') : ''
        };
    }, {
        valid: false,
        msg: 'Erro crítico na validação',
        user: null,
        cleaned: ''
    }, 'validação com recuperação');
}

// Get clean matricula for labels
function getCleanMatricula(matriculaInput) {
    const matricula = matriculaInput.value.trim();
    if (!matricula) return '---';
    
    const validation = validateMatricula(matricula);
    return validation.cleaned || '---';
}

// Export functions for global access
window.UserValidation = {
    // Core validation
    validateMatricula,
    validateMatriculaWithRecovery,
    validateBeforeGeneration,
    
    // Error handling and visual feedback
    highlightFieldError,
    focusFieldSafely,
    displayErrorMessage,
    removeErrorMessage,
    clearFieldError,
    
    // Utility functions
    getCleanMatricula,
    
    // User management
    setCurrentUser,
    getCurrentUser,
    clearCurrentUser,
    
    // Enhanced database management
    loadUserDatabase,
    reloadUserDatabase,
    getDatabaseLoadingState,
    validateUserData,
    showLoadingIndicator,
    hideLoadingIndicator,
    showErrorIndicator,
    
    // Data access
    get isReady() { return UserValidationData.isReady; },
    get userCount() { return UserValidationData.users.size; },
    get isLoading() { return loadingState.isLoading; },
    get lastError() { return loadingState.lastError; },
    
    // Enhanced utilities
    gracefulDegradation,
    validateUserName,
    validateElement,
    safeQuerySelector,
    safeSetAttribute,
    safeRemoveAttribute,
    recoverFromCriticalError
};

console.log('✅ Sistema de validação de usuário carregado');