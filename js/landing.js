// ===== Definição dos apps: caminhos que você JÁ usa =====
const APPS = [
    { id: 'placas', name: 'Etiquetas de Produto', desc: 'Códigos de barras com legenda para produtos', path: './placas/', hotkey: '1', icon: 'barcode' },
    { id: 'caixa', name: 'Etiquetas de Caixa', desc: 'Etiquetas para caixas padrão com rotulagem', path: './caixa/', hotkey: '2', icon: 'box' },
    { id: 'avulso', name: 'Volume Avulso', desc: 'Etiquetas individuais por volume', path: './avulso/', hotkey: '3', icon: 'layers' },
    { id: 'enderec', name: 'Endereçamento', desc: 'Etiquetas de endereço para inventário', path: './enderec/', hotkey: '4', icon: 'map' },
    { id: 'transfer', name: 'Transferência CD → CD', desc: 'Documentos A4 para transferências', path: './transferencia/', hotkey: '5', icon: 'truck' },
    { id: 'termo', name: 'Termolábeis', desc: 'Módulo especializado para produtos termolábeis', path: './termo/', hotkey: '6', icon: 'thermo' },
    { id: 'pedido-direto', name: 'Pedido Direto', desc: 'Etiquetas para pedidos diretos sem código de barras', path: './pedido-direto/', hotkey: '7', icon: 'direct' },
    { id: 'etiqueta-mercadoria', name: 'Etiqueta de Mercadoria', desc: 'Geração de etiqueta de mercadoria rastreável para alocação pulmão', path: './etiqueta-mercadoria/', hotkey: '8', icon: 'tag' },
    { id: 'inventario', name: 'Inventário', desc: 'Gera documento A4 com a lista dos endereços do produto informado', path: './inventario/', hotkey: '9', icon: 'inventory' },
];

// ===== Ícones modernos inline =====
const ICONS = {
    box: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7l9 4 9-4"/><path d="M3 7l9-4 9 4v10l-9 4-9-4z"/></svg>',
    barcode: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6v12"/><path d="M7 6v12"/><path d="M10 6v12"/><path d="M12 6v12"/><path d="M15 6v12"/><path d="M18 6v12"/><path d="M20 6v12"/></svg>',
    layers: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l9 5-9 5-9-5 9-5z"/><path d="M3 12l9 5 9-5"/><path d="M3 17l9 5 9-5"/></svg>',
    map: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 6l7-3 8 3 7-3v15l-7 3-8-3-7 3z"/><path d="M8 3v15"/><path d="M16 6v15"/></svg>',
    truck: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7h12v8H3z"/><path d="M15 10h4l2 3v2h-6z"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>',
    thermo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a2 2 0 0 1 2 2v8a5 5 0 1 1-4 0V4a2 2 0 0 1 2-2z"/><path d="M12 9v8"/></svg>',
    direct: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12h18m-9-9l9 9-9 9"/></svg>',
    tag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>',
    inventory: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>',
};

const $ = (s) => document.querySelector(s);
const grid = $('#apps');
const chooser = $('#chooser');
const hero = $('#hero');

// Sistema de contador será carregado pelo contador-global-centralizado.js

// Função para atualizar o contador no mostrador
function atualizarContadorDisplay(animar = false) {
    if (window.contadorGlobal) {
        const valor = window.contadorGlobal.obterValor();
        const valorFormatado = valor.toLocaleString('pt-BR');
        const elemento = document.getElementById('etiquetas-counter');

        if (elemento) {
            // Verificar se o valor mudou
            const valorAtual = elemento.textContent.replace(/\./g, '');
            const valorNovo = valorFormatado.replace(/\./g, '');

            // Atualizar valor
            elemento.textContent = valorFormatado;

            // Animação apenas se solicitada E se o valor mudou
            if (animar && valorAtual !== valorNovo) {
                // Animação de "piscar" - valor surge com destaque
                elemento.style.opacity = '0.7';
                elemento.style.transform = 'scale(1.05)';
                elemento.style.color = '#10b981';
                elemento.style.transition = 'all 0.4s ease';

                setTimeout(() => {
                    elemento.style.opacity = '1';
                    elemento.style.transform = 'scale(1)';
                    elemento.style.color = 'var(--brand-primary)';
                }, 400);

                console.log(`✨ Animação de incremento: ${valorAtual} → ${valorNovo}`);
            }
        }
    }
}

// Escutar eventos de incremento
window.addEventListener('contador-incremento', (event) => {
    console.log('📈 Contador atualizado via evento:', event.detail);
    atualizarContadorDisplay(true); // Animar quando houver incremento
});

window.addEventListener('contador-atualizado', (event) => {
    console.log('🔄 Contador atualizado:', event.detail);
    atualizarContadorDisplay(true); // Animar quando houver incremento
});

// Monitorar mudanças no localStorage (para sincronização entre abas)
window.addEventListener('storage', (event) => {
    if (event.key === 'contador_global_centralizado_v1' || event.key === 'contador_ultimo_incremento') {
        console.log('🔄 Contador atualizado via localStorage');
        atualizarContadorDisplay();
    }
});

// Monitorar mudanças no localStorage localmente também
let ultimoIncremento = null;
setInterval(() => {
    try {
        const dados = localStorage.getItem('contador_ultimo_incremento');
        if (dados) {
            const parsed = JSON.parse(dados);
            if (!ultimoIncremento || parsed.timestamp > ultimoIncremento.timestamp) {
                ultimoIncremento = parsed;
                console.log('🔄 Novo incremento detectado:', parsed);
                atualizarContadorDisplay();
            }
        }
    } catch (error) {
        // Ignorar erros de parsing
    }
}, 1000);

function cardHTML(app, index) {
    const icon = ICONS[app.icon] || ICONS.box;
    return `
    <button type="button" class="app-card" data-id="${app.id}" data-path="${app.path}" role="listitem" aria-label="${app.name}" style="animation-delay: ${index * 0.1}s">
      <div class="app-icon">
        ${icon}
      </div>
      <h3 class="app-title">${app.name}</h3>
      <p class="app-description">${app.desc || ''}</p>
      <span class="app-badge">Ctrl+${app.hotkey || ''}</span>
    </button>
  `;
}

function renderCards() {
    try {
        grid.innerHTML = APPS.map((app, index) => cardHTML(app, index)).join('');
    } catch (e) {
        console.error('Erro ao renderizar cards', e);
    }
}

function openById(id) {
    const app = APPS.find(a => a.id === id);
    if (!app) return;
    const url = app.path.endsWith('/') ? app.path + 'index.html' : app.path;
    window.location.href = url;
}

// Event Listeners
let isClickingCard = false;
let savedScrollPosition = 0;

// Interceptar tentativas de scroll durante clique em cards
window.addEventListener('scroll', (ev) => {
    if (isClickingCard) {
        ev.preventDefault();
        window.scrollTo(0, savedScrollPosition);
    }
});

grid.addEventListener('click', (ev) => {
    ev.preventDefault(); // Prevenir qualquer comportamento padrão do botão
    ev.stopPropagation(); // Evitar propagação do evento
    
    const card = ev.target.closest('.app-card');
    if (!card) return;
    
    // Marcar que estamos clicando em um card e salvar posição
    isClickingCard = true;
    savedScrollPosition = window.scrollY;
    
    // Aplicar feedback visual sem afetar o layout
    card.style.transform = 'scale(0.98)';
    card.style.transition = 'transform 0.1s ease-out';
    
    // Redirecionamento imediato para evitar delays desnecessários
    setTimeout(() => {
        isClickingCard = false; // Liberar o controle de scroll
        openById(card.dataset.id);
    }, 100);
});

// Hotkeys Ctrl+1..9 - Prevenção de scroll incluída
document.addEventListener('keydown', (ev) => {
    const isCtrl = ev.ctrlKey || ev.metaKey;
    if (!isCtrl) return;
    const hit = APPS.find(a => a.hotkey === ev.key);
    if (hit) {
        ev.preventDefault(); // Previne qualquer comportamento padrão que possa causar scroll
        openById(hit.id);
    }
});

function addCardEffects() {
    const cards = document.querySelectorAll('.app-card');
    cards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            // Usar apenas transform para evitar reflow
            card.style.transform = 'translateY(-8px)';
            card.style.transition = 'transform var(--transition-base)';
        });
        card.addEventListener('mouseleave', () => {
            // Resetar transform suavemente
            card.style.transform = '';
        });
    });
}

// Inicialização
function boot() {
    console.log('🚀 Iniciando Hub de Etiquetas...');

    // Aguardar contador estar pronto
    setTimeout(() => {
        if (window.contadorGlobal) {
            console.log('✅ Contador Global carregado');

            // Carregar valor atual SEM animação
            const valorAtual = window.contadorGlobal.obterValor();
            const elemento = document.getElementById('etiquetas-counter');
            if (elemento) {
                // Mostrar valor atual diretamente, sem animação
                elemento.textContent = valorAtual.toLocaleString('pt-BR');
                console.log(`📊 Valor global carregado: ${valorAtual.toLocaleString('pt-BR')}`);
            }

            // Atualizar contador periodicamente
            setInterval(() => atualizarContadorDisplay(false), 5000);
        } else {
            console.warn('⚠️ Contador Global não disponível');
            // Mostrar valor padrão se contador não estiver disponível
            const elemento = document.getElementById('etiquetas-counter');
            if (elemento) {
                elemento.textContent = '20.430';
            }
        }
    }, 1000);

    renderCards();
    addCardEffects();

    // Transição do hero para chooser após 3 segundos
    hero.style.display = 'flex';
    chooser.style.display = 'none';

    setTimeout(() => {
        hero.style.transition = 'all 0.4s ease-out';
        hero.style.opacity = '0';
        hero.style.transform = 'translateY(-20px)';

        setTimeout(() => {
            hero.style.display = 'none';
            chooser.style.display = 'block';
            chooser.style.opacity = '0';
            chooser.style.transform = 'translateY(20px)';

            requestAnimationFrame(() => {
                chooser.style.transition = 'all 0.4s ease-out';
                chooser.style.opacity = '1';
                chooser.style.transform = 'translateY(0)';
            });
        }, 400);
    }, 3000);
}

// Garantir que sempre inicie no topo da página apenas no carregamento inicial
window.addEventListener('beforeunload', () => {
    // Removido: window.scrollTo(0, 0) - não é necessário
});

// Forçar scroll para o topo apenas no carregamento inicial da página
if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
}

// Scroll para o topo apenas uma vez no carregamento inicial
let initialScrollDone = false;
if (!initialScrollDone) {
    window.scrollTo(0, 0);
    initialScrollDone = true;
}

// Inicializar quando DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
} else {
    boot();
}
