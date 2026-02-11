(function () {
    const TABLE_NAME = 'coletas_etiqueta_mercadoria';
    const MOBILE_BREAKPOINT = 900;
    const SESSION_KEY = 'etiqueta_mercadoria_mobile_session';
    const DESTINO_PREF_KEY = 'etiqueta_mercadoria_mobile_destino_preference';

    const state = {
        mobile: {
            session: null,
            produto: null,
            cadastro: [],
            usuarios: [],
            cds: []
        },
        desktop: {
            tab: 'nao',
            coletas: []
        }
    };

    const $id = (id) => document.getElementById(id);

    function isMobile() {
        return window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`).matches;
    }

    function escapeHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function safeSetLocalStorage(key, value) {
        try {
            localStorage.setItem(key, value);
            return true;
        } catch (error) {
            console.warn(`Falha ao salvar localStorage (${key}):`, error);
            return false;
        }
    }

    function safeGetLocalStorage(key) {
        try {
            return localStorage.getItem(key);
        } catch (error) {
            console.warn(`Falha ao ler localStorage (${key}):`, error);
            return null;
        }
    }

    function safeRemoveLocalStorage(key) {
        try {
            localStorage.removeItem(key);
        } catch (error) {
            console.warn(`Falha ao remover localStorage (${key}):`, error);
        }
    }

    function showToast(message, type = 'info') {
        let container = document.querySelector('.coleta-toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'coleta-toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = `coleta-toast ${type}`;
        toast.textContent = message;
        container.appendChild(toast);

        requestAnimationFrame(() => toast.classList.add('show'));

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 220);
        }, 3200);
    }

    function showDesktopMessage(message, type = 'info') {
        if (typeof window.showStatus === 'function') {
            window.showStatus(message, type);
        }
        showToast(message, type);
    }

    function syncDesktopLabelDimensions() {
        const widthInput = $id('input-width');
        const heightInput = $id('input-height');
        const width = String(widthInput?.value || '90').trim() || '90';
        const height = String(heightInput?.value || '42').trim() || '42';

        document.documentElement.style.setProperty('--label-width', `${width}mm`);
        document.documentElement.style.setProperty('--label-height', `${height}mm`);
    }

    function nowSaoPauloSql() {
        const parts = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'America/Sao_Paulo',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        }).formatToParts(new Date());

        const getPart = (type) => parts.find((p) => p.type === type)?.value || '00';
        return `${getPart('year')}-${getPart('month')}-${getPart('day')} ${getPart('hour')}:${getPart('minute')}:${getPart('second')}`;
    }

    function toDateKeySaoPaulo(value) {
        if (!value) return '';
        const dt = new Date(value);
        if (Number.isNaN(dt.getTime())) return '';
        return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(dt);
    }

    function todayKeySaoPaulo() {
        return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
    }

    function formatDateTimeBR(value) {
        if (!value) return '--';
        const dt = new Date(value);
        if (Number.isNaN(dt.getTime())) return String(value);
        return dt.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    }

    function normalizeText(value) {
        return String(value || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .trim()
            .toUpperCase();
    }

    function normalizeBarcode(value) {
        return String(value || '').replace(/\D/g, '');
    }

    function normalizeCoddv(value) {
        return String(value || '').trim();
    }

    function parseCdListFromText(text) {
        const match = text.match(/module\.exports\s*=\s*(\[[\s\S]*?\]);/);
        if (!match) return [];
        try {
            return Function(`"use strict"; return (${match[1]});`)();
        } catch (error) {
            console.error('Erro ao interpretar BASE_CDS.js:', error);
            return [];
        }
    }

    async function loadCdsData() {
        try {
            const response = await fetch('../data_base/BASE_CDS.js', { cache: 'no-store' });
            const text = await response.text();
            const cds = parseCdListFromText(text);
            if (Array.isArray(cds) && cds.length) {
                return cds;
            }
        } catch (error) {
            console.warn('Falha ao carregar BASE_CDS.js, usando fallback:', error);
        }

        return [
            { id: 1, nome: 'CD01 - Fortaleza/CE' },
            { id: 2, nome: 'CD02 - Hidrolandia/GO' },
            { id: 3, nome: 'CD03 - Jaboatao/PE' },
            { id: 4, nome: 'CD04 - Simoes Filho/BA' },
            { id: 5, nome: 'CD05' },
            { id: 6, nome: 'CD06' },
            { id: 7, nome: 'CD07' },
            { id: 8, nome: 'CD08' },
            { id: 9, nome: 'CD09 - Aquiraz/CE' }
        ];
    }

    async function waitForSupabaseClient(timeoutMs = 10000) {
        const start = Date.now();

        while (Date.now() - start < timeoutMs) {
            if (window.supabaseManager && window.supabaseManager.client) {
                return window.supabaseManager.client;
            }

            if (window.supabaseManager && typeof window.supabaseManager.initialize === 'function' && !window.supabaseManager.client) {
                try {
                    await window.supabaseManager.initialize();
                } catch (error) {
                    console.warn('Erro ao inicializar supabaseManager:', error);
                }
            }

            await new Promise((resolve) => setTimeout(resolve, 120));
        }

        return null;
    }

    function getUserByMatricula(matricula) {
        const mat = normalizeBarcode(matricula);
        if (!mat) return null;
        return state.mobile.usuarios.find((u) => normalizeBarcode(u.Matricula) === mat) || null;
    }

    function findProdutoByCodigo(term) {
        const raw = String(term || '').trim();
        const normalized = normalizeBarcode(raw);
        if (!raw) return null;

        const byCoddv = state.mobile.cadastro.find((p) => normalizeCoddv(p.CODDV) === raw);
        if (byCoddv) {
            return {
                CODDV: normalizeCoddv(byCoddv.CODDV),
                DESC: String(byCoddv.DESC || '').trim(),
                BARRAS: String(byCoddv.BARRAS || '').trim()
            };
        }

        const searchSet = new Set();
        if (normalized) {
            searchSet.add(normalized);
            searchSet.add(normalized.replace(/^0+/, ''));
            if (normalized.length < 13) searchSet.add(normalized.padStart(13, '0'));
            if (normalized.length < 14) searchSet.add(normalized.padStart(14, '0'));
        }

        const byBarras = state.mobile.cadastro.find((p) => {
            const barras = normalizeBarcode(p.BARRAS);
            if (!barras) return false;
            return searchSet.has(barras) || searchSet.has(barras.replace(/^0+/, ''));
        });

        if (!byBarras) return null;

        return {
            CODDV: normalizeCoddv(byBarras.CODDV),
            DESC: String(byBarras.DESC || '').trim(),
            BARRAS: String(byBarras.BARRAS || '').trim()
        };
    }

    function formatValidadeInput(value) {
        const digits = normalizeBarcode(value).slice(0, 4);
        if (digits.length <= 2) return digits;
        return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    }

    function parseValidade(value) {
        const digits = normalizeBarcode(value);
        if (!digits) {
            return { valid: true, value: null };
        }

        if (!/^\d{4}$/.test(digits)) {
            return { valid: false, message: 'Validade deve ter 4 digitos (MM/AA).' };
        }

        const month = parseInt(digits.slice(0, 2), 10);
        if (month < 1 || month > 12) {
            return { valid: false, message: 'Mes da validade invalido.' };
        }

        return { valid: true, value: `${digits.slice(0, 2)}/${digits.slice(2)}` };
    }

    function normalizeDestino(value) {
        const normalized = normalizeText(value);
        if (normalized === 'AUTOMATICO') return 'AUTOMATICO';
        if (normalized === 'SEPARACAO') return 'SEPARACAO';
        if (normalized === 'PULMAO') return 'PULMAO';
        return 'AUTOMATICO';
    }

    function normalizeTipoEndereco(value) {
        const normalized = normalizeText(value);
        if (normalized.includes('PULMAO')) return 'PULMAO';
        if (normalized.includes('SEPARACAO')) return 'SEPARACAO';
        return normalized;
    }

    function getDestinoEfetivo(destino, qtd) {
        const d = normalizeDestino(destino);
        if (d !== 'AUTOMATICO') return d;
        return qtd > 1 ? 'PULMAO' : 'SEPARACAO';
    }

    function loadDestinoPreferencia() {
        return normalizeDestino(safeGetLocalStorage(DESTINO_PREF_KEY) || 'AUTOMATICO');
    }

    function saveDestinoPreferencia(destino) {
        safeSetLocalStorage(DESTINO_PREF_KEY, normalizeDestino(destino));
    }

    function getCdDisplayName(cd) {
        const cdNumber = parseInt(cd, 10);
        const found = state.mobile.cds.find((item) => parseInt(item.id, 10) === cdNumber);
        if (found) return found.nome;
        return `CD${String(cd).padStart(2, '0')}`;
    }

    function setMobileLoginFeedback(message, type) {
        const feedback = $id('mobile-login-feedback');
        if (!feedback) return;
        feedback.className = 'mobile-inline-feedback';
        feedback.textContent = message || '';
        if (!message) return;
        if (type === 'success') feedback.classList.add('success');
    }

    function updateMobileNomePorMatricula() {
        const inputMat = $id('mobile-login-matricula');
        const inputNome = $id('mobile-login-nome');
        if (!inputMat || !inputNome) return;

        const user = getUserByMatricula(inputMat.value);
        inputNome.value = user ? String(user.Nome || '').trim() : '';
    }

    function fillMobileCdSelect() {
        const select = $id('mobile-login-cd');
        if (!select) return;

        select.innerHTML = '<option value="" disabled selected>Selecione o CD</option>';
        state.mobile.cds.forEach((cd) => {
            const option = document.createElement('option');
            option.value = String(cd.id);
            option.textContent = String(cd.nome || `CD ${cd.id}`);
            select.appendChild(option);
        });
    }

    function showMobileLogin() {
        const loginView = $id('mobile-login-view');
        const coletaView = $id('mobile-coleta-view');
        if (loginView) loginView.style.display = 'block';
        if (coletaView) coletaView.style.display = 'none';
    }

    function resetMobileLoginFields(options = {}) {
        const keepCd = options.keepCd === true;
        const inputCd = $id('mobile-login-cd');
        const inputMat = $id('mobile-login-matricula');
        const inputNome = $id('mobile-login-nome');
        const inputSenha = $id('mobile-login-senha');
        const currentCd = String(inputCd?.value || '');

        if (inputMat) inputMat.value = '';
        if (inputNome) inputNome.value = '';
        if (inputSenha) inputSenha.value = '';

        if (!keepCd && inputCd) {
            inputCd.value = '';
        } else if (keepCd && inputCd) {
            inputCd.value = currentCd;
        }
    }

    function showMobileColeta() {
        const loginView = $id('mobile-login-view');
        const coletaView = $id('mobile-coleta-view');
        if (loginView) loginView.style.display = 'none';
        if (coletaView) coletaView.style.display = 'block';

        const userName = $id('mobile-user-name');
        const userCd = $id('mobile-user-cd');
        if (userName) userName.textContent = state.mobile.session?.usuario || '--';
        if (userCd) userCd.textContent = state.mobile.session?.nomeCD || 'CD --';

        const destino = $id('mobile-destino');
        if (destino) destino.value = loadDestinoPreferencia();
    }

    function saveMobileSession(sessionData) {
        const persisted = safeSetLocalStorage(SESSION_KEY, JSON.stringify(sessionData));
        state.mobile.session = sessionData;
        return persisted;
    }

    function clearMobileSession() {
        safeRemoveLocalStorage(SESSION_KEY);
        state.mobile.session = null;
    }

    function restoreMobileSession() {
        try {
            const raw = safeGetLocalStorage(SESSION_KEY);
            if (!raw) return false;

            const parsed = JSON.parse(raw);
            if (!parsed || !parsed.expiresAt) {
                clearMobileSession();
                return false;
            }

            const expiresAt = new Date(parsed.expiresAt);
            if (Number.isNaN(expiresAt.getTime()) || expiresAt <= new Date()) {
                clearMobileSession();
                return false;
            }

            state.mobile.session = parsed;
            return true;
        } catch (error) {
            console.warn('Sessao mobile invalida:', error);
            clearMobileSession();
            return false;
        }
    }

    function resetMobileProduto() {
        state.mobile.produto = null;
        const card = $id('mobile-produto-card');
        const codigo = $id('mobile-codigo');
        const validade = $id('mobile-validade');
        const qtd = $id('mobile-qtd');

        if (card) card.classList.add('hide');
        if (codigo) codigo.value = '';
        if (validade) validade.value = '';
        if (qtd) qtd.value = '';
    }

    function renderProdutoMobile(produto) {
        const card = $id('mobile-produto-card');
        const desc = $id('mobile-produto-desc');
        const coddv = $id('mobile-produto-coddv');
        const barras = $id('mobile-produto-barras');
        const qtd = $id('mobile-qtd');

        if (!card || !desc || !coddv || !barras) return;

        state.mobile.produto = produto;
        desc.textContent = produto.DESC || '--';
        coddv.textContent = produto.CODDV || '--';
        barras.textContent = produto.BARRAS || '--';
        card.classList.remove('hide');

        if (qtd) {
            qtd.value = '1';
            qtd.focus();
            qtd.select();
        }
    }

    async function handleMobileLogin(event) {
        event.preventDefault();

        const inputCd = $id('mobile-login-cd');
        const inputMat = $id('mobile-login-matricula');
        const inputNome = $id('mobile-login-nome');
        const inputSenha = $id('mobile-login-senha');
        const btnLogin = $id('mobile-login-btn');

        try {
            const cd = String(inputCd?.value || '').trim();
            const matricula = normalizeBarcode(inputMat?.value || '');
            const nome = String(inputNome?.value || '').trim();
            const senha = String(inputSenha?.value || '').trim();

            if (!cd) {
                setMobileLoginFeedback('Selecione o deposito.', 'error');
                return;
            }
            if (!matricula) {
                setMobileLoginFeedback('Informe a matricula.', 'error');
                return;
            }

            const user = getUserByMatricula(matricula);
            if (!user || !nome) {
                setMobileLoginFeedback('Matricula nao encontrada na base de usuarios.', 'error');
                return;
            }

            if (!senha) {
                setMobileLoginFeedback('Digite a senha.', 'error');
                return;
            }

            if (btnLogin) btnLogin.disabled = true;

            const sessionData = {
                usuario: String(user.Nome || '').trim(),
                matricula,
                cd,
                nomeCD: getCdDisplayName(cd),
                loginTime: new Date().toISOString(),
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            };

            const persisted = saveMobileSession(sessionData);
            if (!persisted) {
                console.warn('Sessao mobile ativa apenas em memoria (localStorage indisponivel).');
            }

            setMobileLoginFeedback(`Login realizado. Bem-vindo(a) ${sessionData.usuario.split(' ')[0]}.`, 'success');

            setTimeout(() => {
                if (btnLogin) btnLogin.disabled = false;
                showMobileColeta();
                const codigo = $id('mobile-codigo');
                if (codigo) codigo.focus();
            }, 550);
        } catch (error) {
            console.error('Erro no login mobile:', error);
            setMobileLoginFeedback('Erro ao processar login. Tente novamente.', 'error');
            if (btnLogin) btnLogin.disabled = false;
        }
    }

    function bindMobileEvents() {
        const form = $id('mobile-login-form');
        const mat = $id('mobile-login-matricula');
        const logoutBtn = $id('mobile-logout-btn');
        const buscarBtn = $id('mobile-btn-buscar');
        const salvarBtn = $id('mobile-btn-salvar');
        const codigoInput = $id('mobile-codigo');
        const validadeInput = $id('mobile-validade');
        const destinoSelect = $id('mobile-destino');

        if (form) form.addEventListener('submit', handleMobileLogin);

        if (mat) {
            mat.addEventListener('input', updateMobileNomePorMatricula);
            mat.addEventListener('blur', updateMobileNomePorMatricula);
        }

        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                clearMobileSession();
                resetMobileProduto();
                resetMobileLoginFields({ keepCd: true });
                showMobileLogin();
                setMobileLoginFeedback('Sessao encerrada.', 'success');
                $id('mobile-login-matricula')?.focus();
            });
        }

        if (buscarBtn) {
            buscarBtn.addEventListener('click', () => {
                const term = String(codigoInput?.value || '').trim();
                if (!term) {
                    showToast('Informe um codigo para buscar.', 'warning');
                    return;
                }

                const produto = findProdutoByCodigo(term);
                if (!produto) {
                    showToast('Codigo nao encontrado na BASE_BARRAS.', 'warning');
                    return;
                }

                renderProdutoMobile(produto);
            });
        }

        if (codigoInput) {
            codigoInput.addEventListener('input', () => {
                const onlyDigits = normalizeBarcode(codigoInput.value).slice(0, 20);
                if (codigoInput.value !== onlyDigits) {
                    codigoInput.value = onlyDigits;
                }
            });

            codigoInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    buscarBtn?.click();
                }
            });
        }

        if (validadeInput) {
            validadeInput.addEventListener('input', () => {
                validadeInput.value = formatValidadeInput(validadeInput.value);
            });
        }

        if (destinoSelect) {
            destinoSelect.value = loadDestinoPreferencia();
            destinoSelect.addEventListener('change', () => {
                saveDestinoPreferencia(destinoSelect.value);
            });
        }

        if (salvarBtn) {
            salvarBtn.addEventListener('click', async () => {
                if (!state.mobile.produto) {
                    showToast('Busque um produto antes de salvar.', 'warning');
                    return;
                }

                const destino = normalizeDestino($id('mobile-destino')?.value || 'AUTOMATICO');
                const validadeParse = parseValidade($id('mobile-validade')?.value || '');
                const qtd = parseInt(String($id('mobile-qtd')?.value || '').trim(), 10);

                if (!validadeParse.valid) {
                    showToast(validadeParse.message, 'warning');
                    $id('mobile-validade')?.focus();
                    return;
                }

                if (!Number.isInteger(qtd) || qtd <= 0) {
                    showToast('Informe uma quantidade numerica valida.', 'warning');
                    $id('mobile-qtd')?.focus();
                    return;
                }

                const client = await waitForSupabaseClient();
                if (!client) {
                    showToast('Conexao com Supabase indisponivel.', 'error');
                    return;
                }

                const session = state.mobile.session;
                if (!session) {
                    showToast('Sessao mobile invalida. Faca login novamente.', 'warning');
                    showMobileLogin();
                    return;
                }

                const payload = {
                    cd: parseInt(session.cd, 10),
                    mat: String(session.matricula || ''),
                    nome: String(session.usuario || 'Sistema'),
                    coddv: String(state.mobile.produto.CODDV || ''),
                    barras: String(state.mobile.produto.BARRAS || ''),
                    descricao: String(state.mobile.produto.DESC || ''),
                    destino,
                    validade: validadeParse.value,
                    qtd,
                    status_impressao: 'NAO'
                };

                const { error } = await client
                    .from(TABLE_NAME)
                    .insert([payload]);

                if (error) {
                    console.error(error);
                    showToast(`Erro ao salvar coleta: ${error.message}`, 'error');
                    return;
                }

                showToast('Coleta salva com sucesso.', 'success');
                $id('mobile-codigo').value = '';
                $id('mobile-validade').value = '';
                $id('mobile-qtd').value = '';
                $id('mobile-produto-card')?.classList.add('hide');
                state.mobile.produto = null;
                $id('mobile-codigo')?.focus();
            });
        }
    }

    async function initMobileMode() {
        state.mobile.cadastro = Array.isArray(window.DB_CADASTRO?.BASE_CADASTRO) ? window.DB_CADASTRO.BASE_CADASTRO : [];
        state.mobile.usuarios = Array.isArray(window.DB_USUARIO?.BASE_USUARIO) ? window.DB_USUARIO.BASE_USUARIO : [];
        state.mobile.cds = await loadCdsData();

        fillMobileCdSelect();
        bindMobileEvents();

        if (restoreMobileSession()) {
            showMobileColeta();
            $id('mobile-codigo')?.focus();
            return;
        }

        showMobileLogin();
        resetMobileLoginFields({ keepCd: true });
        $id('mobile-login-cd')?.focus();
    }

    function getDesktopCdSelecionado() {
        const depositoInput = $id('input-deposito');
        const value = String(depositoInput?.value || '').trim();
        if (!value) return null;
        const number = parseInt(value, 10);
        return Number.isNaN(number) ? null : number;
    }

    function openDesktopModal() {
        const modal = $id('coleta-modal');
        if (!modal) return;

        const cd = getDesktopCdSelecionado();
        if (!cd) {
            showDesktopMessage('Selecione o deposito para abrir a coleta.', 'warning');
            $id('input-deposito')?.focus();
            return;
        }

        modal.classList.add('show');
        loadDesktopColetas();
    }

    function closeDesktopModal() {
        $id('coleta-modal')?.classList.remove('show');
    }

    function updateDesktopTabs() {
        $id('coleta-tab-nao')?.classList.toggle('active', state.desktop.tab === 'nao');
        $id('coleta-tab-impresso')?.classList.toggle('active', state.desktop.tab === 'impresso');
    }

    function getDesktopListaFiltrada() {
        if (state.desktop.tab === 'impresso') {
            const today = todayKeySaoPaulo();
            return state.desktop.coletas.filter((item) => {
                const impresso = normalizeText(item.status_impressao) === 'SIM';
                const dia = toDateKeySaoPaulo(item.dt_hr_impressao);
                return impresso && dia === today;
            });
        }

        return state.desktop.coletas.filter((item) => normalizeText(item.status_impressao) !== 'SIM');
    }

    function renderDesktopLista() {
        const container = $id('coleta-list');
        if (!container) return;

        const lista = getDesktopListaFiltrada();
        if (!lista.length) {
            container.innerHTML = '<div class="coleta-vazio">Nenhum registro nesta visao.</div>';
            return;
        }

        container.innerHTML = lista.map((item) => {
            const badge = normalizeText(item.status_impressao) === 'SIM' ? 'SIM' : 'NAO';
            const validade = item.validade || '--';
            const coleta = formatDateTimeBR(item.dt_hr_coleta);
            const impressao = item.dt_hr_impressao ? formatDateTimeBR(item.dt_hr_impressao) : '--';

            return `
                <article class="coleta-item" data-id="${item.id}">
                    <div class="coleta-item-head">
                        <h4>${escapeHtml(item.descricao || '--')}</h4>
                        <span class="coleta-badge">${badge}</span>
                    </div>
                    <div class="coleta-item-meta">CODDV: ${escapeHtml(item.coddv)} | Barras: ${escapeHtml(item.barras)}</div>
                    <div class="coleta-item-meta">Destino: ${escapeHtml(item.destino)} | Validade: ${escapeHtml(validade)} | Qtd: ${escapeHtml(item.qtd)}</div>
                    <div class="coleta-item-meta">Coleta: ${escapeHtml(coleta)} | Impressao: ${escapeHtml(impressao)}</div>
                    <div class="coleta-item-meta">Usuario: ${escapeHtml(item.nome)} | Mat: ${escapeHtml(item.mat)} | CD: ${escapeHtml(item.cd)}</div>
                    <div class="coleta-item-actions">
                        <button type="button" class="btn btn-primary btn-sm" data-action="imprimir" data-id="${item.id}">Imprimir</button>
                    </div>
                </article>
            `;
        }).join('');

        container.querySelectorAll('button[data-action="imprimir"]').forEach((button) => {
            button.addEventListener('click', async () => {
                const id = button.getAttribute('data-id');
                const registro = state.desktop.coletas.find((item) => String(item.id) === String(id));
                if (registro) {
                    await imprimirColetaDesktop(registro);
                }
            });
        });
    }

    async function loadDesktopColetas() {
        const cd = getDesktopCdSelecionado();
        if (!cd) {
            showDesktopMessage('Selecione o deposito para carregar a coleta.', 'warning');
            return;
        }

        const client = await waitForSupabaseClient();
        if (!client) {
            showDesktopMessage('Conexao com Supabase indisponivel.', 'error');
            return;
        }

        const { data, error } = await client
            .from(TABLE_NAME)
            .select('id, cd, mat, nome, coddv, barras, descricao, destino, validade, qtd, dt_hr_coleta, dt_hr_impressao, status_impressao')
            .eq('cd', cd)
            .order('dt_hr_coleta', { ascending: false })
            .limit(500);

        if (error) {
            console.error(error);
            showDesktopMessage(`Erro ao carregar coletas: ${error.message}`, 'error');
            return;
        }

        state.desktop.coletas = Array.isArray(data) ? data : [];
        renderDesktopLista();
    }

    function buscarEndereco(coddv, cd, destinoEfetivo) {
        const baseEnd = Array.isArray(window.DB_END?.BASE_END) ? window.DB_END.BASE_END : [];
        if (!baseEnd.length) return null;

        return baseEnd.find((item) => {
            const coddvMatch = String(item.CODDV || '').trim() === String(coddv || '').trim();
            const cdMatch = parseInt(item.CD, 10) === parseInt(cd, 10);
            const tipoMatch = normalizeTipoEndereco(item.TIPO) === normalizeTipoEndereco(destinoEfetivo);
            return coddvMatch && cdMatch && tipoMatch;
        }) || null;
    }

    function montarAddressFormatted(endereco) {
        const parts = String(endereco || '--').split('.');
        const largeNum = parts.length ? parts[parts.length - 1] : '000';
        const shortAddr = parts.length > 1 ? parts.slice(0, -1).join('.') : String(endereco || '--');
        return { largeNum, shortAddr };
    }

    function prepararValidadeParaEtiqueta(validade) {
        const parsed = parseValidade(String(validade || ''));
        if (!parsed.valid || !parsed.value) return null;
        return parsed.value;
    }

    async function marcarImpresso(id) {
        const client = await waitForSupabaseClient();
        if (!client) {
            showDesktopMessage('Conexao com Supabase indisponivel.', 'warning');
            return;
        }

        const updatePayload = {
            status_impressao: 'SIM',
            dt_hr_impressao: nowSaoPauloSql()
        };

        const { error } = await client
            .from(TABLE_NAME)
            .update(updatePayload)
            .eq('id', id);

        if (error) {
            console.error(error);
            showDesktopMessage(`Erro ao atualizar impressao: ${error.message}`, 'warning');
            return;
        }

        const idx = state.desktop.coletas.findIndex((item) => String(item.id) === String(id));
        if (idx >= 0) {
            state.desktop.coletas[idx].status_impressao = 'SIM';
            state.desktop.coletas[idx].dt_hr_impressao = updatePayload.dt_hr_impressao;
        }

        renderDesktopLista();
    }

    async function imprimirColetaDesktop(item) {
        const cd = getDesktopCdSelecionado();
        if (!cd) {
            showDesktopMessage('Selecione o deposito na tela principal.', 'warning');
            return;
        }

        if (typeof window.generateLabel !== 'function') {
            showDesktopMessage('Funcao de impressao indisponivel no desktop.', 'error');
            return;
        }

        const copies = parseInt(item.qtd, 10);
        if (!Number.isInteger(copies) || copies <= 0) {
            showDesktopMessage('Quantidade de etiquetas invalida no registro.', 'warning');
            return;
        }

        const destinoEfetivo = getDestinoEfetivo(item.destino, copies);
        const enderecoBase = buscarEndereco(item.coddv, cd, destinoEfetivo);

        if (!enderecoBase || !enderecoBase.ENDERECO) {
            showDesktopMessage(`Endereco nao encontrado para ${destinoEfetivo}.`, 'warning');
            return;
        }

        const addressItem = {
            ENDERECO: String(enderecoBase.ENDERECO),
            TIPO: String(enderecoBase.TIPO || destinoEfetivo),
            formatted: montarAddressFormatted(enderecoBase.ENDERECO)
        };

        const product = {
            DESC: String(item.descricao || '--'),
            CODDV: String(item.coddv || '--')
        };

        const barcode = String(item.barras || item.coddv || '');
        const validade = prepararValidadeParaEtiqueta(item.validade);
        const printArea = $id('print-area');
        const matInput = $id('input-matricula');

        if (!printArea) {
            showDesktopMessage('Area de impressao nao encontrada.', 'error');
            return;
        }

        const previousMat = matInput ? matInput.value : '';
        if (matInput) matInput.value = String(item.mat || '---');

        syncDesktopLabelDimensions();
        const labelEl = window.generateLabel(product, addressItem, barcode, copies, validade, true, String(cd));

        if (matInput) matInput.value = previousMat;

        printArea.innerHTML = '';
        printArea.appendChild(labelEl);

        try {
            window.print();
            setTimeout(() => {
                printArea.innerHTML = '';
            }, 400);
        } catch (error) {
            console.error('Erro ao acionar impressao:', error);
            showDesktopMessage('Erro ao abrir impressao.', 'error');
            return;
        }

        await marcarImpresso(item.id);
    }

    function bindDesktopEvents() {
        const openBtn = $id('coleta-btn');
        const closeBtn = $id('coleta-close-btn');
        const refreshBtn = $id('coleta-refresh-btn');
        const tabNao = $id('coleta-tab-nao');
        const tabImpresso = $id('coleta-tab-impresso');
        const overlay = $id('coleta-modal');

        if (openBtn) openBtn.addEventListener('click', openDesktopModal);
        if (closeBtn) closeBtn.addEventListener('click', closeDesktopModal);
        if (refreshBtn) refreshBtn.addEventListener('click', loadDesktopColetas);

        if (tabNao) {
            tabNao.addEventListener('click', () => {
                state.desktop.tab = 'nao';
                updateDesktopTabs();
                renderDesktopLista();
            });
        }

        if (tabImpresso) {
            tabImpresso.addEventListener('click', () => {
                state.desktop.tab = 'impresso';
                updateDesktopTabs();
                renderDesktopLista();
            });
        }

        if (overlay) {
            overlay.addEventListener('click', (event) => {
                if (event.target === overlay) {
                    closeDesktopModal();
                }
            });
        }

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && overlay?.classList.contains('show')) {
                closeDesktopModal();
            }
        });
    }

    async function initDesktopMode() {
        bindDesktopEvents();
        updateDesktopTabs();
    }

    async function initialize() {
        if (isMobile()) {
            await initMobileMode();
            return;
        }

        await initDesktopMode();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize, { once: true });
    } else {
        initialize();
    }
})();
