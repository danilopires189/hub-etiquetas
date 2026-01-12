// User Greeting Component - Shared Infrastructure
// Responsive greeting system with dynamic width calculation and name truncation

// Dynamic Width Calculation Utilities
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

// Debounced resize handler for performance
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
        if (window.UserValidation && window.UserValidation.getCurrentUser()) {
            updateGreeting(window.UserValidation.getCurrentUser().Nome);
            console.log(`🔄 Resize handled (${screenWidth}px)`);
        }
    }, debounceTime);
}

// ResizeObserver for dynamic layout updates
let headerResizeObserver = null;

function initResponsiveLayoutSystem() {
    // Add window resize listener with debouncing
    window.addEventListener('resize', handleResize);

    // Add orientation change listener for mobile devices
    window.addEventListener('orientationchange', () => {
        setTimeout(() => {
            clearWidthCache();
            if (window.UserValidation && window.UserValidation.getCurrentUser()) {
                updateGreeting(window.UserValidation.getCurrentUser().Nome);
            }
            console.log('📱 Orientação alterada, layout atualizado');
        }, 300); // Wait for orientation change to complete
    });

    // Add visibility change listener to handle tab switching
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden && window.UserValidation && window.UserValidation.getCurrentUser()) {
            // Recalculate when tab becomes visible again
            setTimeout(() => {
                clearWidthCache();
                updateGreeting(window.UserValidation.getCurrentUser().Nome);
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
                            if (window.UserValidation && window.UserValidation.getCurrentUser()) {
                                updateGreeting(window.UserValidation.getCurrentUser().Nome);
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
                    if (window.UserValidation && window.UserValidation.getCurrentUser()) {
                        updateGreeting(window.UserValidation.getCurrentUser().Nome);
                    }
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
                    if (window.UserValidation && window.UserValidation.getCurrentUser()) {
                        updateGreeting(window.UserValidation.getCurrentUser().Nome);
                    }
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

// Name Formatting Functions
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

// Enhanced Name Formatting - Since greeting is now above header, always show full name
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

// Greeting Component Functions
function createGreetingElement() {
    let greetingElement = window.UserValidation.safeQuerySelector('#user-greeting');
    if (greetingElement) {
        return greetingElement;
    }

    // If element doesn't exist, create it with enhanced error handling
    return window.UserValidation.gracefulDegradation(() => {
        const newGreeting = document.createElement('div');
        newGreeting.id = 'user-greeting';
        newGreeting.className = 'user-greeting-top'; // Use new class for top positioning
        newGreeting.style.display = 'none';
        newGreeting.innerHTML = '<span class="greeting-text"><span class="greeting-wave" aria-hidden="true">👋</span> Olá, Usuário</span>';

        // Insert above the header
        const screenContainer = window.UserValidation.safeQuerySelector('#screen-ui');
        const header = window.UserValidation.safeQuerySelector('.app-header');

        if (window.UserValidation.validateElement(screenContainer, 'screen container') && 
            window.UserValidation.validateElement(header, 'header')) {
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

function updateGreeting(userName) {
    // Enhanced validation and error recovery
    if (!window.UserValidation.validateUserName(userName)) {
        console.warn('⚠️ Nome de usuário inválido, usando fallback');
        userName = 'Usuário';
    }

    const greetingElement = window.UserValidation.gracefulDegradation(
        () => createGreetingElement(),
        null,
        'criação do elemento de saudação'
    );

    if (!greetingElement) {
        console.error('❌ Não foi possível criar elemento de saudação');
        return;
    }

    const greetingText = window.UserValidation.safeQuerySelector('.greeting-text', greetingElement);

    if (!window.UserValidation.validateElement(greetingText, 'texto de saudação')) {
        // Try to recover by creating the text element
        window.UserValidation.recoverFromCriticalError(
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
        const availableWidth = window.UserValidation.gracefulDegradation(
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
            window.UserValidation.gracefulDegradation(() => {
                window.UserValidation.safeSetAttribute(greetingElement, 'data-truncated', 'true');
                window.UserValidation.safeSetAttribute(greetingElement, 'title', `Olá, ${originalName}`);
                window.UserValidation.safeSetAttribute(greetingElement, 'aria-label', `Saudação: Olá, ${originalName}`);
                window.UserValidation.safeSetAttribute(greetingElement, 'tabindex', '0');
                window.UserValidation.safeSetAttribute(greetingElement, 'role', 'button');

                // Add tooltip element if it doesn't exist
                let tooltip = window.UserValidation.safeQuerySelector('.tooltip', greetingElement);
                if (!tooltip) {
                    tooltip = document.createElement('div');
                    tooltip.className = 'tooltip';
                    window.UserValidation.safeSetAttribute(tooltip, 'role', 'tooltip');
                    greetingElement.appendChild(tooltip);
                }
                if (tooltip) {
                    tooltip.textContent = `Olá, ${originalName}`;
                }

                // Add touch event for mobile devices
                greetingElement.addEventListener('touchstart', handleTooltipTouch, { passive: true });
            }, null, 'configuração de tooltip');

        } else {
            window.UserValidation.gracefulDegradation(() => {
                window.UserValidation.safeRemoveAttribute(greetingElement, 'data-truncated');
                window.UserValidation.safeRemoveAttribute(greetingElement, 'title');
                window.UserValidation.safeRemoveAttribute(greetingElement, 'aria-label');
                window.UserValidation.safeRemoveAttribute(greetingElement, 'tabindex');
                window.UserValidation.safeRemoveAttribute(greetingElement, 'role');

                // Remove tooltip if it exists
                const tooltip = window.UserValidation.safeQuerySelector('.tooltip', greetingElement);
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
        window.UserValidation.recoverFromCriticalError(error, 'updateGreeting', () => {
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

// Export functions for global access
window.UserGreeting = {
    // Core greeting functions
    createGreetingElement,
    updateGreeting,
    clearGreeting,
    
    // Layout system
    initResponsiveLayoutSystem,
    cleanupResponsiveLayoutSystem,
    calculateAvailableWidth,
    clearWidthCache,
    
    // Name formatting
    formatNameForDisplayEnhanced,
    safeFormatName,
    formatFirstLastName,
    truncateWithEllipsis,
    getInitials,
    isNameTruncated,
    
    // Utilities
    getElementDimensions,
    safeGetElementWidth,
    handleResize
};

console.log('✅ Sistema de saudação de usuário carregado');