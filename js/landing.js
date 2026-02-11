/**
 * Landing Page Logic for Hub de Etiquetas
 * Handles app cards rendering, navigation, and counter display
 * @version 2.0.0
 */

// App definitions
const APPS = [
    { id: 'placas', name: 'Etiquetas de Produto', desc: 'Códigos de barras com legenda para produtos', path: './placas/', hotkey: '0', icon: 'barcode' },
    { id: 'caixa', name: 'Etiquetas de Caixa', desc: 'Etiquetas para caixas padrão com rotulagem', path: './caixa/', hotkey: '1', icon: 'box' },
    { id: 'avulso', name: 'Volume Avulso', desc: 'Etiquetas individuais por volume', path: './avulso/', hotkey: '2', icon: 'layers' },
    { id: 'enderec', name: 'Endereçamento', desc: 'Etiquetas de endereço para inventário', path: './enderec/', hotkey: '3', icon: 'map' },
    { id: 'transfer', name: 'Transferência CD → CD', desc: 'Documentos A4 para transferências', path: './transferencia/', hotkey: '4', icon: 'truck' },
    { id: 'termo', name: 'Termolábeis', desc: 'Módulo especializado para produtos termolábeis', path: './termo/', hotkey: '5', icon: 'thermo' },
    { id: 'pedido-direto', name: 'Pedido Direto', desc: 'Etiquetas para pedidos diretos sem código de barras', path: './pedido-direto/', hotkey: '6', icon: 'direct' },
    { id: 'etiqueta-mercadoria', name: 'Etiqueta de Mercadoria', desc: 'Geração de etiqueta de mercadoria rastreável para alocação pulmão', path: './etiqueta-mercadoria/', hotkey: '7', icon: 'tag' },
    { id: 'inventario', name: 'Inventário', desc: 'Gera documento A4 com a lista dos endereços do produto informado', path: './inventario/', hotkey: '8', icon: 'inventory' },
    { id: 'enderecamento-fraldas', name: 'Endereçamento de Fraldas', desc: 'Gestão de endereçamento com autenticação', path: './enderecamento-fraldas/', hotkey: '9', icon: 'diaper' },
];

// SVG Icons
const ICONS = {
    box: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7l9 4 9-4"/><path d="M3 7l9-4 9 4v10l-9 4-9-4z"/></svg>',
    barcode: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6v12"/><path d="M7 6v12"/><path d="M10 6v12"/><path d="M12 6v12"/><path d="M15 6v12"/><path d="M18 6v12"/><path d="M20 6v12"/></svg>',
    layers: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l9 5-9 5-9-5 9-5z"/><path d="M3 12l9 5 9-5"/><path d="M3 17l9 5 9-5"/></svg>',
    map: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 6l7-3 8 3 7-3v15l-7 3-8-3-7 3z"/><path d="M8 3v15"/><path d="M16 6v15"/></svg>',
    diaper: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 8c0-2 2-4 6-4s6 2 6 4v2c2 0 3 1 3 3v2c0 2-1 3-3 3H6c-2 0-3-1-3-3v-2c0-2 1-3 3-3V8z"/><path d="M8 10h8"/><path d="M7 13h10"/><circle cx="9" cy="11" r="0.5" fill="currentColor"/><circle cx="15" cy="11" r="0.5" fill="currentColor"/><path d="M18 6l2-2m0 0l2 2m-2-2v4" stroke="#ef4444" stroke-width="1.5"/></svg>',
    truck: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7h12v8H3z"/><path d="M15 10h4l2 3v2h-6z"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>',
    thermo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a2 2 0 0 1 2 2v8a5 5 0 1 1-4 0V4a2 2 0 0 1 2-2z"/><path d="M12 9v8"/></svg>',
    direct: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12h18m-9-9l9 9-9 9"/></svg>',
    tag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>',
    inventory: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>',
};

const $ = (s) => document.querySelector(s);
const grid = $('#apps');

// Counter display functions
function atualizarContadorDisplay(animar = false) {
    if (!window.contadorGlobal) return;

    const valor = window.contadorGlobal.obterValor();
    const valorFormatado = valor.toLocaleString('pt-BR');
    const elemento = document.getElementById('etiquetas-counter');

    if (elemento) {
        const valorAtual = elemento.textContent.replace(/\./g, '');
        const valorNovo = valorFormatado.replace(/\./g, '');

        elemento.textContent = valorFormatado;

        if (animar && valorAtual !== valorNovo) {
            elemento.style.opacity = '0.7';
            elemento.style.transform = 'scale(1.05)';
            elemento.style.color = '#10b981';
            elemento.style.transition = 'all 0.4s ease';

            setTimeout(() => {
                elemento.style.opacity = '1';
                elemento.style.transform = 'scale(1)';
                elemento.style.color = 'var(--brand-primary)';
            }, 400);
        }
    }
}

// Event listeners for counter updates
window.addEventListener('contador-incremento', () => atualizarContadorDisplay(true));
window.addEventListener('contador-atualizado', () => atualizarContadorDisplay(true));

// Session verification for Fraldas module
function verificarSessaoFraldas() {
    try {
        const sessionData = localStorage.getItem('enderecamento_fraldas_session');
        if (!sessionData) return false;

        const session = JSON.parse(sessionData);
        const now = new Date();
        const expiresAt = new Date(session.expiresAt);

        if (now >= expiresAt) {
            localStorage.removeItem('enderecamento_fraldas_session');
            return false;
        }
        return true;
    } catch (error) {
        localStorage.removeItem('enderecamento_fraldas_session');
        return false;
    }
}

function atualizarCardFraldas() {
    const card = document.querySelector('[data-id="enderecamento-fraldas"]');
    if (!card) return;

    const isLoggedIn = verificarSessaoFraldas();
    const badge = card.querySelector('.secure-badge');
    const description = card.querySelector('.app-description');

    if (isLoggedIn) {
        card.classList.add('app-card-logged');
        if (badge) {
            badge.textContent = '✅';
            badge.classList.add('logged');
        }
        if (description) {
            description.textContent = 'Gestão de endereçamento - Sessão ativa';
        }
    } else {
        card.classList.remove('app-card-logged');
        if (badge) {
            badge.textContent = '🔐';
            badge.classList.remove('logged');
        }
        if (description) {
            description.textContent = 'Gestão de endereçamento com autenticação';
        }
    }
}

// Monitor session changes
window.addEventListener('storage', (event) => {
    if (event.key === 'enderecamento_fraldas_session') {
        atualizarCardFraldas();
    }
    if (event.key === 'contador_global_v2' || event.key === 'contador_ultimo_incremento') {
        atualizarContadorDisplay();
    }
});

// Periodic session check
setInterval(atualizarCardFraldas, 30000);

// Card HTML generation
function cardHTML(app, index) {
    const icon = ICONS[app.icon] || ICONS.box;
    const isSecure = app.id === 'enderecamento-fraldas';

    if (isSecure) {
        const isLoggedIn = verificarSessaoFraldas();
        const secureClass = isLoggedIn ? ' app-card-secure app-card-logged' : ' app-card-secure';
        const secureBadge = isLoggedIn ? '<span class="secure-badge logged">✅</span>' : '<span class="secure-badge">🔐</span>';
        const description = isLoggedIn ? 'Gestão de endereçamento - Sessão ativa' : 'Gestão de endereçamento com autenticação';

        return `
        <button type="button" class="app-card${secureClass}" data-id="${app.id}" data-path="${app.path}" role="listitem" aria-label="${app.name}" style="animation-delay: ${index * 0.1}s">
          <div class="app-icon">${icon}</div>
          ${secureBadge}
          <h3 class="app-title">${app.name}</h3>
          <p class="app-description">${description}</p>
          <span class="app-badge">Ctrl+${app.hotkey || ''}</span>
        </button>
      `;
    }

    return `
    <button type="button" class="app-card" data-id="${app.id}" data-path="${app.path}" role="listitem" aria-label="${app.name}" style="animation-delay: ${index * 0.1}s">
      <div class="app-icon">${icon}</div>
      <h3 class="app-title">${app.name}</h3>
      <p class="app-description">${app.desc || ''}</p>
      <span class="app-badge">Ctrl+${app.hotkey || ''}</span>
    </button>
  `;
}

function renderCards() {
    if (!grid) return;
    grid.innerHTML = APPS.map((app, index) => cardHTML(app, index)).join('');
}

// Navigation
function openById(id) {
    const app = APPS.find(a => a.id === id);
    if (!app) return;

    if (id === 'enderecamento-fraldas') {
        const dest = verificarSessaoFraldas() ? './enderecamento-fraldas/index.html' : './enderecamento-fraldas/login.html';
        window.location.href = dest;
        return;
    }

    const url = app.path.endsWith('/') ? app.path + 'index.html' : app.path;
    window.location.href = url;
}

// Event Listeners
let isClickingCard = false;
let savedScrollPosition = 0;

window.addEventListener('scroll', (ev) => {
    if (isClickingCard) {
        ev.preventDefault();
        window.scrollTo(0, savedScrollPosition);
    }
});

if (grid) {
    grid.addEventListener('click', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();

        const card = ev.target.closest('.app-card');
        if (!card) return;

        isClickingCard = true;
        savedScrollPosition = window.scrollY;

        card.style.transform = 'scale(0.98)';
        card.style.transition = 'transform 0.1s ease-out';

        setTimeout(() => {
            isClickingCard = false;
            openById(card.dataset.id);
        }, 100);
    });
}

// Keyboard shortcuts (Ctrl+0..9)
document.addEventListener('keydown', (ev) => {
    const isCtrl = ev.ctrlKey || ev.metaKey;
    if (!isCtrl) return;

    const hit = APPS.find(a => a.hotkey === ev.key);
    if (hit) {
        ev.preventDefault();
        openById(hit.id);
    }
});

function addCardEffects() {
    const cards = document.querySelectorAll('.app-card');
    cards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-8px)';
            card.style.transition = 'transform var(--transition-base)';
        });
        card.addEventListener('mouseleave', () => {
            card.style.transform = '';
        });
    });
}

// Main initialization
function boot() {
    const hero = document.getElementById('hero');
    const chooser = document.getElementById('chooser');

    // Render cards
    renderCards();
    addCardEffects();

    // Admin button
    const adminBtn = document.getElementById('admin-btn');
    if (adminBtn) {
        adminBtn.setAttribute('aria-disabled', 'true');
        adminBtn.title = 'Modulo administrativo desabilitado';
        adminBtn.style.opacity = '0.55';
        adminBtn.style.cursor = 'not-allowed';
        adminBtn.addEventListener('click', (event) => {
            event.preventDefault();
        });
    }

    // Hero to Apps transition
    setTimeout(() => {
        if (hero) {
            hero.style.transition = 'opacity 0.8s ease-in-out, transform 0.8s ease-in-out';
            hero.style.opacity = '0';
            hero.style.transform = 'scale(0.98) translateY(-10px)';

            setTimeout(() => {
                hero.style.display = 'none';

                if (chooser) {
                    chooser.style.display = 'block';
                    chooser.style.opacity = '0';
                    chooser.style.transform = 'translateY(40px) scale(0.98)';
                    chooser.offsetHeight; // Trigger reflow

                    chooser.style.transition = 'opacity 1s cubic-bezier(0.22, 1, 0.36, 1), transform 1s cubic-bezier(0.22, 1, 0.36, 1)';
                    chooser.style.opacity = '1';
                    chooser.style.transform = 'translateY(0) scale(1)';
                }
            }, 600);
        }

        atualizarCardFraldas();
    }, 2000);

    // Initialize counter display
    const iniciarContador = () => {
        if (window.contadorGlobal) {
            atualizarContadorDisplay();
            setInterval(() => atualizarContadorDisplay(false), 5000);
        } else {
            setTimeout(() => {
                if (window.contadorGlobal) {
                    atualizarContadorDisplay();
                } else {
                    const el = document.getElementById('etiquetas-counter');
                    if (el && el.textContent.includes('Carregando')) {
                        el.textContent = '---';
                    }
                }
            }, 2000);
        }
    };

    iniciarContador();
}

// Scroll management
if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
}
window.scrollTo(0, 0);

// Initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
} else {
    boot();
}
