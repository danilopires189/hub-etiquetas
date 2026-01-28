/* ===== Aplicação de Gestão de Endereços ===== */

// ===== Funções Utilitárias de Performance =====
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

function throttle(func, limit) {
    let inThrottle;
    return function (...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Detectar se é mobile
function isMobile() {
    return window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Helpers para diálogos customizados
function customConfirm(message, title = 'Confirmação') {
    return new Promise((resolve) => {
        const modal = document.getElementById('modalConfirmacao');
        const titleEl = document.getElementById('modalConfirmTitle');
        const messageEl = document.getElementById('modalConfirmMessage');
        const btnOk = document.getElementById('btnModalConfirmOk');
        const btnCancel = document.getElementById('btnModalConfirmCancel');
        const btnClose = document.getElementById('btnModalConfirmClose');

        if (!modal) {
            // Fallback se o modal não existir no DOM
            resolve(confirm(message));
            return;
        }

        // Configurar textos
        titleEl.textContent = title;
        messageEl.innerHTML = message.replace(/\n/g, '<br>');

        // Mostrar modal
        modal.classList.add('active');

        // Funções de fechamento
        const fechar = (resultado) => {
            modal.classList.remove('active');
            btnOk.onclick = null;
            btnCancel.onclick = null;
            btnClose.onclick = null;
            modal.onclick = null;
            resolve(resultado);
        };

        // Eventos
        btnOk.onclick = () => fechar(true);
        btnCancel.onclick = () => fechar(false);
        btnClose.onclick = () => fechar(false);

        modal.onclick = (e) => {
            if (e.target === modal) fechar(false);
        };
    });
}

function customAlert(message, title = 'Aviso') {
    return new Promise((resolve) => {
        const modal = document.getElementById('modalConfirmacao');
        const titleEl = document.getElementById('modalConfirmTitle');
        const messageEl = document.getElementById('modalConfirmMessage');
        const btnOk = document.getElementById('btnModalConfirmOk');
        const btnCancel = document.getElementById('btnModalConfirmCancel');
        const btnClose = document.getElementById('btnModalConfirmClose');

        if (!modal) {
            alert(message);
            resolve();
            return;
        }

        // Esconder botão cancelar para alerta simples
        btnCancel.style.display = 'none';

        titleEl.textContent = title;
        messageEl.innerHTML = message.replace(/\n/g, '<br>');
        modal.classList.add('active');

        const fechar = () => {
            modal.classList.remove('active');
            btnCancel.style.display = ''; // Restaurar botão cancelar
            btnOk.onclick = null;
            btnClose.onclick = null;
            modal.onclick = null;
            resolve();
        };

        btnOk.onclick = fechar;
        btnClose.onclick = fechar;
        modal.onclick = (e) => {
            if (e.target === modal) fechar();
        };
    });
}

class EnderecoApp {
    constructor() {
        // this.sistema será acessado via getter para garantir referência atualizada
        this.abas = {
            listar: document.getElementById('tab-listar'),
            buscar: document.getElementById('tab-buscar'),
            historico: document.getElementById('tab-historico')
        };
        this.abaAtiva = 'listar';
    }

    // Getter para garantir que pegamos a instância mais recente
    get sistema() {
        return window.sistemaEnderecamento;
    }

    // Inicializar aplicação
    inicializar() {
        console.log('🚀 Iniciando Gestão de Endereços...');

        // Verificar autenticação
        if (!this.verificarAutenticacao()) {
            return;
        }

        // Verificar se veio de um produto (parâmetros na URL)
        this.verificarParametrosURL();

        // Configurar eventos
        this.configurarEventos();

        // Se o sistema já estiver pronto e com cache, carregar dados
        if (this.sistema && this.sistema.cacheCarregado) {
            this.atualizarEstatisticas();
            this.carregarListaEnderecos();
            this.carregarHistorico();
        } else {
            console.log('⏳ Aguardando sistema de endereçamento e cache...');
            // Aguardar evento de prontidão
            window.addEventListener('sistemaEnderecamentoPronto', () => {
                console.log('✅ Sistema de endereçamento notificado como pronto.');
                setTimeout(() => {
                    this.atualizarEstatisticas();
                    this.carregarListaEnderecos();
                    this.carregarHistorico();
                    console.log('✅ Interface atualizada com dados do cache.');
                }, 100);
            });
        }

        console.log('✅ Gestão de Endereços inicializada');
    }

    // Verificar autenticação
    verificarAutenticacao() {
        try {
            const sessionData = localStorage.getItem('enderecamento_fraldas_session');
            if (!sessionData) {
                this.redirecionarParaLogin('Sessão não encontrada');
                return false;
            }

            const session = JSON.parse(sessionData);
            const now = new Date();
            const expiresAt = new Date(session.expiresAt);

            if (now >= expiresAt) {
                localStorage.removeItem('enderecamento_fraldas_session');
                this.redirecionarParaLogin('Sessão expirada');
                return false;
            }

            this.atualizarInfoUsuario(session);
            return true;
        } catch (error) {
            console.error('Erro ao verificar autenticação:', error);
            this.redirecionarParaLogin('Erro na sessão');
            return false;
        }
    }

    async redirecionarParaLogin(motivo) {
        await customAlert(motivo, 'Sessão Encerrada');
        window.location.href = './login.html';
    }

    atualizarInfoUsuario(session) {
        const userInfo = document.createElement('div');
        userInfo.className = 'user-info';
        userInfo.innerHTML = `
            <div class="user-details">
                <span class="user-name">${session.usuario.split(' ')[0]}</span>
                <span class="user-cd">${session.nomeCD}</span>
            </div>
            <button class="btn btn-ghost btn-sm" onclick="enderecoApp.logout()" title="Sair">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                    <polyline points="16,17 21,12 16,7"/>
                    <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
            </button>
        `;

        const actions = document.querySelector('.actions');
        actions.insertBefore(userInfo, actions.firstChild);
    }

    async logout() {
        if (await customConfirm('Deseja realmente sair do sistema?', 'Encerrar Sessão')) {
            localStorage.removeItem('enderecamento_fraldas_session');
            window.location.href = './login.html';
        }
    }

    // Verificar estado do banco de dados
    async verificarEstadoBanco() {
        // Aguardar um pouco para garantir que caches estão carregados
        if (!this.sistema.cacheCarregado) {
            setTimeout(() => this.verificarEstadoBanco(), 500);
            return;
        }

        const stats = this.sistema.gerarRelatorioOcupacao();

        // Se não houver endereços cadastrados, oferecer instalação
        if (stats.totalCadastrados === 0) {
            // Verificar se usuário tem permissão ou se é apenas erro de carregamento
            // Mas assumindo que está conectado (cacheCarregado=true)

            const confirmar = await customConfirm(
                'O banco de dados de endereços parece estar vazio.\nDeseja realizar a instalação inicial dos endereços agora?\n\nIsso criará a estrutura de endereços (Zonas, Colunas, Níveis).',
                'Instalação Inicial'
            );

            if (confirmar) {
                const loadingModal = await customAlert('Iniciando instalação...\nIsso pode levar cerca de 1 minuto.', 'Aguarde');

                try {
                    const btn = document.createElement('button'); // Dummy for compatibility if needed
                    const res = await this.sistema.instalarEnderecosBase();

                    if (res.erros > 0) {
                        alert(`Instalação concluída com ${res.erros} erros.`);
                    } else {
                        alert(`✅ Sucesso! ${res.inseridos} endereços criados.`);
                    }

                    // Recarregar
                    window.location.reload();

                } catch (error) {
                    alert('Erro na instalação: ' + error.message);
                }
            }
        } else {
            // Se tem endereços, mas 0 ocupados, verifique se deve migrar do localStorage
            if (stats.totalOcupados === 0) {
                this.verificarMigracaoLocal();
            }
        }
    }

    // Verificar se há dados locais para migrar
    async verificarMigracaoLocal() {
        const hasLocalData = localStorage.getItem('enderecos_ocupados') &&
            Object.keys(JSON.parse(localStorage.getItem('enderecos_ocupados') || '{}')).length > 0;

        if (hasLocalData) {
            const confirmar = await customConfirm(
                'Detectamos dados de alocação salvos localmente (no navegador).\nO banco de dados está vazio.\n\nDeseja migrar seus dados locais para o servidor agora?',
                'Sincronização'
            );

            if (confirmar) {
                try {
                    await customAlert('Iniciando migração...\nPor favor, não feche a página.', 'Migrando');
                    await this.sistema.migrarDoLocalStorage();
                    alert('✅ Migração concluída com sucesso!');
                    window.location.reload();
                } catch (error) {
                    console.error(error);
                    alert('Erro na migração: ' + (error.message || error));
                }
            }
        }
    }

    // Verificar parâmetros da URL
    verificarParametrosURL() {
        const urlParams = new URLSearchParams(window.location.search);
        const produto = urlParams.get('produto');
        const filtro = urlParams.get('filtro');
        const acao = urlParams.get('acao');

        if (produto && (acao === 'alocar' || acao === 'transferir' || acao === 'adicionar_mais' || acao === 'buscar_enderecos' || acao === 'buscar_alocar')) {
            // Para buscar_enderecos e buscar_alocar, ir para aba buscar
            if (acao === 'buscar_enderecos' || acao === 'buscar_alocar') {
                this.trocarAba('buscar');
            } else {
                // Para outras ações, ir para aba listar com filtro disponível
                this.trocarAba('listar');
            }

            // Para transferência, adicionar mais, buscar endereços e buscar alocar, mostrar todos os endereços disponíveis
            // Para alocação, aplicar filtro se especificado
            if (filtro === 'disponivel' || acao === 'transferir' || acao === 'adicionar_mais' || acao === 'buscar_enderecos' || acao === 'buscar_alocar') {
                if (acao !== 'buscar_enderecos' && acao !== 'buscar_alocar') {
                    // Só aplicar filtro na aba listar
                    document.getElementById('filtroStatus').value = 'disponivel';
                    this.carregarListaEnderecos();
                }
            }

            // Mostrar informações do produto no topo
            this.mostrarInfoProdutoSelecionado(urlParams);
        }
    }

    // Mostrar informações do produto selecionado
    mostrarInfoProdutoSelecionado(urlParams) {
        const produto = urlParams.get('produto');
        const desc = urlParams.get('desc');
        const acao = urlParams.get('acao');
        const enderecoAtual = urlParams.get('enderecoAtual');

        if (!produto) return;

        // Criar banner informativo no topo da página
        const banner = document.createElement('div');
        banner.className = 'produto-selecionado-banner';

        const isTransferencia = acao === 'transferir';
        const isAdicionarMais = acao === 'adicionar_mais';
        const isBuscarEnderecos = acao === 'buscar_enderecos';
        const isBuscarAlocar = acao === 'buscar_alocar';
        const bannerClass = isTransferencia ? 'banner-transferencia' :
            (isAdicionarMais || isBuscarEnderecos) ? 'banner-adicionar-mais' : 'banner-alocacao';
        banner.classList.add(bannerClass);

        const acaoTexto = acao === 'alocar' ? 'Alocação de Produto' :
            acao === 'transferir' ? 'Transferência' :
                acao === 'buscar_enderecos' ? 'Buscar Endereços' :
                    acao === 'buscar_alocar' ? 'Alocação de Produto' :
                        'Adicionar em Mais Endereços';

        const icone = acao === 'alocar' ? '📦' :
            acao === 'transferir' ? '🔄' :
                acao === 'buscar_enderecos' ? '🔍' :
                    acao === 'buscar_alocar' ? '📦' : '➕';

        banner.innerHTML = `
            <div class="banner-content">
                <div class="banner-info">
                    <div class="banner-icon">${icone}</div>
                    <div class="banner-text">
                        <div class="banner-title">Produto Selecionado para ${acaoTexto}</div>
                        <div class="banner-produto">
                            <strong>CODDV:</strong> ${produto} | 
                            <strong>Descrição:</strong> ${desc || 'N/A'}
                        </div>
                        ${(isTransferencia || isAdicionarMais || isBuscarEnderecos) && enderecoAtual ? `
                            <div class="banner-endereco-atual">
                                <strong>${isTransferencia ? 'Endereço atual:' : 'Já alocado em:'}</strong> ${enderecoAtual}
                            </div>
                        ` : ''}
                        ${isAdicionarMais ? `
                            <div class="banner-hint">
                                <em>Selecione endereços adicionais onde alocar este produto</em>
                            </div>
                        ` : ''}
                        ${isBuscarEnderecos ? `
                            <div class="banner-hint">
                                <em>Busque e selecione endereços onde alocar este produto</em>
                            </div>
                        ` : ''}
                        ${isBuscarAlocar ? `
                            <div class="banner-hint">
                                <em>Busque e selecione endereços onde alocar este produto (pode escolher múltiplos)</em>
                            </div>
                        ` : ''}
                        ${(acao === 'alocar') ? `
                            <div class="banner-hint">
                                <em>Selecione endereços onde alocar este produto (pode escolher múltiplos)</em>
                            </div>
                        ` : ''}
                    </div>
                </div>
                <div class="banner-actions">
                    <button class="btn btn-ghost btn-sm" onclick="enderecoApp.voltarParaProduto()">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M19 12H5"/>
                            <path d="M12 19l-7-7 7-7"/>
                        </svg>
                        Voltar
                    </button>
                </div>
            </div>
        `;

        // Inserir banner após o header
        const header = document.querySelector('.app-header');
        header.insertAdjacentElement('afterend', banner);

        // Armazenar dados do produto para uso posterior
        this.produtoSelecionado = {
            coddv: produto,
            desc: desc,
            acao: acao,
            enderecoAtual: enderecoAtual
        };
    }

    // Voltar para a página do produto
    voltarParaProduto() {
        window.location.href = 'index.html';
    }

    // Solicitar validade com modal
    async solicitarValidade() {
        return await this.mostrarModalValidade();
    }

    mostrarModalValidade() {
        return new Promise((resolve) => {
            const modal = document.getElementById('modalValidade');
            const input = document.getElementById('inputValidade');
            const btnOk = document.getElementById('btnModalValidadeOk');
            const btnCancel = document.getElementById('btnModalValidadeCancel');
            const btnClose = document.getElementById('btnModalValidadeClose');
            const feedback = document.getElementById('feedbackValidade');

            if (!modal) {
                console.error('Modal de validade não encontrado!');
                resolve(null);
                return;
            }

            // Limpar estado
            input.value = '';
            feedback.style.display = 'none';
            input.classList.remove('error');

            const fecharModal = (valor) => {
                modal.classList.remove('active');
                // Remover listeners para evitar duplicidade
                btnOk.onclick = null;
                btnCancel.onclick = null;
                btnClose.onclick = null;
                input.onkeypress = null;
                input.oninput = null;
                resolve(valor);
            };

            const validar = () => {
                const valor = input.value.trim();
                // Validar MMAA (Mês 01-12, Ano 24-99)
                // Permitir qualquer ano a partir de 24 (2024)
                const regex = /^(0[1-9]|1[0-2])([2-9][0-9])$/;
                if (regex.test(valor)) {
                    fecharModal(valor);
                } else {
                    feedback.style.display = 'block';
                    input.classList.add('error');
                    input.focus();
                }
            };

            // Mostrar modal
            modal.classList.add('active');
            setTimeout(() => input.focus(), 100);

            // Eventos
            btnOk.onclick = validar;
            btnCancel.onclick = () => fecharModal(null);
            btnClose.onclick = () => fecharModal(null);

            // Máscara e Enter
            input.oninput = (e) => {
                // Remove não-números
                e.target.value = e.target.value.replace(/\D/g, '');
                feedback.style.display = 'none';
                input.classList.remove('error');
            };

            input.onkeypress = (e) => {
                if (e.key === 'Enter') validar();
            };
        });
    }

    // Alocar produto no endereço selecionado
    async alocarProdutoNoEndereco(endereco) {
        if (!this.produtoSelecionado) {
            alert('Nenhum produto selecionado para alocação');
            return;
        }

        // Solicitar validade (regra obrigatória)
        const validade = await this.solicitarValidade();
        if (!validade) return; // Cancelado pelo usuário

        try {
            // Alocar produto no sistema usando a mesma função que adicionar mais endereços
            // Isso permite múltiplas alocações desde o início
            await this.sistema.adicionarProdutoEmMaisEnderecos(endereco, this.produtoSelecionado.coddv, this.produtoSelecionado.desc, validade);

            // Mostrar confirmação igual ao adicionar mais endereços
            const info = this.formatarInfoEndereco(endereco);
            // Formatar visualização da validade
            const validadeFmt = `${validade.substring(0, 2)}/20${validade.substring(2)}`;

            await customAlert(`Produto alocado com sucesso!\n\nProduto: ${this.produtoSelecionado.desc}\nCODDV: ${this.produtoSelecionado.coddv}\nValidade: ${validadeFmt}\n\nEndereço: ${endereco}\n(${info.formatado})`, 'Sucesso');

            // Atualizar estatísticas
            this.atualizarEstatisticas();

            // Recarregar lista
            this.carregarListaEnderecos();

            // Perguntar se quer adicionar em mais endereços (mesmo comportamento)
            setTimeout(async () => {
                const continuar = await customConfirm('Deseja alocar este produto em mais endereços?', 'Adicionar Outro Endereço');
                if (!continuar) {
                    this.voltarParaProduto();
                }
            }, 500);

        } catch (error) {
            customAlert('Erro ao alocar produto: ' + error.message, 'Erro');
        }
    }

    // Transferir produto para endereço selecionado
    async transferirProdutoParaEndereco(endereco) {
        if (!this.produtoSelecionado || this.produtoSelecionado.acao !== 'transferir') {
            alert('Nenhum produto selecionado para transferência');
            return;
        }

        if (endereco === this.produtoSelecionado.enderecoAtual) {
            alert('O produto já está neste endereço');
            return;
        }

        try {
            // Transferir produto no sistema
            await this.sistema.transferirProduto(this.produtoSelecionado.enderecoAtual, endereco);

            // Mostrar confirmação
            const infoOrigem = this.formatarInfoEndereco(this.produtoSelecionado.enderecoAtual);
            const infoDestino = this.formatarInfoEndereco(endereco);

            await customAlert(`Transferência realizada com sucesso!\n\nProduto: ${this.produtoSelecionado.desc}\nCODDV: ${this.produtoSelecionado.coddv}\n\nDe: ${this.produtoSelecionado.enderecoAtual}\n(${infoOrigem.formatado})\n\nPara: ${endereco}\n(${infoDestino.formatado})`, 'Sucesso');

            // Atualizar estatísticas
            this.atualizarEstatisticas();

            // Recarregar lista
            this.carregarListaEnderecos();

            // Voltar para a página principal após 2 segundos
            // setTimeout(() => {
            //     this.voltarParaProduto();
            // }, 2000);

        } catch (error) {
            alert('Erro ao transferir produto: ' + error.message);
        }
    }

    // Adicionar produto em endereço adicional
    async adicionarProdutoNoEndereco(endereco) {
        if (!this.produtoSelecionado || (this.produtoSelecionado.acao !== 'adicionar_mais' && this.produtoSelecionado.acao !== 'buscar_enderecos')) {
            alert('Nenhum produto selecionado para adicionar em mais endereços');
            return;
        }

        if (endereco === this.produtoSelecionado.enderecoAtual) {
            alert('O produto já está neste endereço');
            return;
        }

        // Solicitar validade (regra obrigatória)
        const validade = await this.solicitarValidade();
        if (!validade) return; // Cancelado pelo usuário

        try {
            // Adicionar produto no novo endereço usando a função específica para múltiplos
            await this.sistema.adicionarProdutoEmMaisEnderecos(endereco, this.produtoSelecionado.coddv, this.produtoSelecionado.desc, validade);

            const info = this.formatarInfoEndereco(endereco);
            // Formatar visualização da validade
            const validadeFmt = `${validade.substring(0, 2)}/20${validade.substring(2)}`;

            await customAlert(`Produto adicionado com sucesso!\n\nProduto: ${this.produtoSelecionado.desc}\nCODDV: ${this.produtoSelecionado.coddv}\nValidade: ${validadeFmt}\n\nNovo endereço: ${endereco}\n(${info.formatado})\n\nO produto continua também no endereço original: ${this.produtoSelecionado.enderecoAtual}`, 'Sucesso');

            // Atualizar estatísticas
            this.atualizarEstatisticas();

            // Recarregar listagem
            this.carregarListaEnderecos();

            // Perguntar se quer adicionar em mais endereços
            setTimeout(async () => {
                const continuar = await customConfirm('Deseja adicionar este produto em mais endereços?', 'Adicionar Outro');
                if (!continuar) {
                    this.voltarParaProduto();
                }
            }, 500);

        } catch (error) {
            alert('Erro ao adicionar produto: ' + error.message);
        }
    }

    // Formatar informações do endereço
    formatarInfoEndereco(endereco) {
        const partes = endereco.split('.');
        if (partes.length !== 4) return { formatado: endereco };

        const zona = partes[0];
        const coluna = partes[2];
        const nivel = partes[3].replace('A0', '');

        const descricaoNivel = {
            'T': 'Térreo',
            '1': '1º Andar',
            '2': '2º Andar',
            '4': '4º Andar',
            '5': '5º Andar',
            '6': '6º Andar'
        }[nivel] || `Nível ${nivel}`;

        return {
            endereco: endereco,
            zona: zona,
            coluna: coluna,
            nivel: nivel,
            descricaoNivel: descricaoNivel,
            formatado: `${zona} - Col.${coluna} - ${descricaoNivel}`
        };
    }

    // Formatar data de alocação
    formatarDataAlocacao(dataStr) {
        if (!dataStr) return 'Data não disponível';

        try {
            // Tentar diferentes formatos de data
            let data;

            // Se já é uma string formatada em português (DD/MM/AAAA HH:MM:SS)
            if (typeof dataStr === 'string' && dataStr.includes('/')) {
                const partes = dataStr.split(' ');
                if (partes.length >= 1) {
                    const [dia, mes, ano] = partes[0].split('/');
                    const hora = partes[1] || '00:00:00';
                    // Criar data no formato ISO para parsing correto
                    data = new Date(`${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}T${hora}`);
                }
            } else {
                // Tentar como ISO string ou timestamp
                data = new Date(dataStr);
            }

            if (!isNaN(data.getTime())) {
                return data.toLocaleString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            }
        } catch (e) {
            console.warn('Erro ao converter data:', dataStr, e);
        }

        // Se chegou até aqui, retornar a string original ou uma mensagem padrão
        return typeof dataStr === 'string' ? dataStr : 'Data inválida';
    }

    // Formatar validade para exibição
    formatarValidade(validade) {
        if (!validade || validade === '' || validade === null) {
            return 'Não informada';
        }

        // Se já está no formato MM/AAAA, retornar como está
        if (validade.includes('/')) {
            return validade;
        }

        // Se está no formato MMAA, converter para MM/20AA
        if (validade.length === 4 && /^\d{4}$/.test(validade)) {
            return `${validade.substring(0, 2)}/20${validade.substring(2)}`;
        }

        // Retornar como está se não conseguir formatar
        return validade;
    }

    // Obter status da validade (vencida, próxima do vencimento, etc.)
    obterStatusValidade(validade) {
        if (!validade || validade === '' || validade === null) {
            return 'nao-informada';
        }

        try {
            let mes, ano;

            // Se está no formato MM/AAAA
            if (validade.includes('/')) {
                const partes = validade.split('/');
                mes = parseInt(partes[0]);
                ano = parseInt(partes[1]);
            }
            // Se está no formato MMAA
            else if (validade.length === 4 && /^\d{4}$/.test(validade)) {
                mes = parseInt(validade.substring(0, 2));
                ano = parseInt('20' + validade.substring(2));
            }
            else {
                return 'nao-informada';
            }

            // Data de vencimento (último dia do mês)
            const dataVencimento = new Date(ano, mes, 0); // mes 0-based, dia 0 = último dia do mês anterior
            const hoje = new Date();
            const proximoMes = new Date();
            proximoMes.setMonth(proximoMes.getMonth() + 1);

            if (dataVencimento < hoje) {
                return 'vencida';
            } else if (dataVencimento < proximoMes) {
                return 'proxima-vencimento';
            } else {
                return 'valida';
            }
        } catch (error) {
            console.warn('Erro ao verificar status da validade:', error);
            return 'nao-informada';
        }
    }

    // Configurar eventos (Simplificado Global)
    configurarEventos() {
        console.log('🔧 Configurando eventos via Delegação Global Simplificada...');

        // Listener ÚNICO no body para capturar todos os clicks
        document.body.addEventListener('click', (e) => {
            const target = e.target;

            // 1. Abas
            const tabBtn = target.closest('.tab-btn');
            if (tabBtn) {
                const tab = tabBtn.dataset.tab;
                if (tab) {
                    e.preventDefault();
                    this.trocarAba(tab);
                }
                return;
            }

            // 2. Botão Buscar (ID)
            const btnBuscar = target.closest('#btnBuscar');
            if (btnBuscar) {
                e.preventDefault();
                this.buscarEnderecos();
                return;
            }

            // 3. Botões de navegação (data-href)
            const btnLink = target.closest('[data-href]');
            if (btnLink) {
                e.preventDefault();
                e.stopPropagation();
                window.location.href = btnLink.dataset.href;
                return;
            }

            // 4. Endereços Clicáveis
            const enderecoItem = target.closest('.endereco-clicavel');
            if (enderecoItem) {
                // Ignore se clicou em um botão real dentro do item
                if (target.closest('button, .btn, a') && target.closest('.endereco-clicavel') === enderecoItem) {
                    return;
                }

                const endereco = enderecoItem.dataset.endereco;
                const funcao = enderecoItem.dataset.funcao;

                if (endereco && funcao && typeof this[funcao] === 'function') {
                    // Feedback visual manual
                    enderecoItem.style.backgroundColor = '#dcfce7';
                    setTimeout(() => enderecoItem.style.backgroundColor = '', 200);

                    console.log(`📍 Click endereçado: ${endereco} -> ${funcao}`);
                    this[funcao](endereco);
                    e.preventDefault();
                }
            }
        });

        // Input filters
        const filtro = document.getElementById('filtroStatus');
        if (filtro) filtro.addEventListener('change', () => this.carregarListaEnderecos());

        const busca = document.getElementById('campoBusca');
        if (busca) {
            busca.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.buscarEnderecos();
            });
            busca.addEventListener('input', debounce((e) => {
                if (e.target.value.length >= 3 || e.target.value.length === 0) this.buscarEnderecos();
            }, 300));
        }

        console.log('✅ Delegação de eventos simplificada ativa.');
    }

    // Configurar delegação de eventos para mobile
    configurarDelegacaoEventosMobile() {
        // Delegação de eventos para endereços clicáveis (funciona tanto no desktop quanto mobile)
        const containerLista = document.getElementById('enderecosLista');
        const containerBusca = document.getElementById('resultadosBusca');

        const handleEnderecoClick = (e) => {
            // Verificar se clicou em um botão dentro do endereço (botões têm prioridade)
            const btn = e.target.closest('button, .btn');
            if (btn) {
                // Se é um botão com data-href, navegar
                const href = btn.dataset.href;
                if (href) {
                    e.preventDefault();
                    e.stopPropagation();
                    window.location.href = href;
                }
                return; // Deixar o evento do botão funcionar normalmente
            }

            // Encontrar o elemento .endereco-clicavel mais próximo
            const enderecoClicavel = e.target.closest('.endereco-clicavel');
            if (!enderecoClicavel) return;

            e.preventDefault();
            e.stopPropagation();

            // Usar data-attributes (mais robusto que parsear onclick)
            const endereco = enderecoClicavel.dataset.endereco;
            const funcao = enderecoClicavel.dataset.funcao;

            // Fallback: tentar extrair do onclick se data-attributes não existirem
            let funcaoFinal = funcao;
            let enderecoFinal = endereco;

            if (!funcaoFinal || !enderecoFinal) {
                const onclickAttr = enderecoClicavel.getAttribute('onclick');
                if (onclickAttr) {
                    const match = onclickAttr.match(/enderecoApp\.(\w+)\('([^']+)'\)/);
                    if (match) {
                        funcaoFinal = match[1];
                        enderecoFinal = match[2];
                    }
                }
            }

            if (!funcaoFinal || !enderecoFinal) return;

            // Feedback visual
            enderecoClicavel.style.transform = 'scale(0.98)';
            enderecoClicavel.style.background = '#bbf7d0';

            setTimeout(() => {
                enderecoClicavel.style.transform = '';
                enderecoClicavel.style.background = '';

                // Executar a função correspondente
                if (typeof this[funcaoFinal] === 'function') {
                    this[funcaoFinal](enderecoFinal);
                }
            }, 100);
        };

        // Função para configurar eventos em um container
        const setupContainerEvents = (container) => {
            if (!container) return;

            // Click para desktop
            container.addEventListener('click', handleEnderecoClick);

            // Touch para mobile
            container.addEventListener('touchend', (e) => {
                // Verificar se é um toque simples (não scroll)
                if (e.changedTouches && e.changedTouches.length === 1) {
                    handleEnderecoClick(e);
                }
            }, { passive: false });
        };

        setupContainerEvents(containerLista);
        setupContainerEvents(containerBusca);

        // Configurar eventos para botões dentro de modais
        const modal = document.getElementById('modalConfirmacao');
        if (modal) {
            const modalButtons = modal.querySelectorAll('.btn');
            modalButtons.forEach(btn => {
                btn.addEventListener('touchend', (e) => {
                    e.preventDefault();
                    btn.click();
                });
            });
        }

        // Delegação global para botões com data-href
        document.body.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-href]');
            if (btn) {
                e.preventDefault();
                window.location.href = btn.dataset.href;
            }
        });

        document.body.addEventListener('touchend', (e) => {
            const btn = e.target.closest('[data-href]');
            if (btn) {
                e.preventDefault();
                window.location.href = btn.dataset.href;
            }
        }, { passive: false });

        console.log('📱 Delegação de eventos mobile configurada');
    }

    // Trocar aba
    trocarAba(novaAba) {
        // Remover classe active das abas
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

        // Ativar nova aba
        document.querySelector(`[data-tab="${novaAba}"]`).classList.add('active');
        document.getElementById(`tab-${novaAba}`).classList.add('active');

        this.abaAtiva = novaAba;

        // Atualizar conteúdo da aba
        switch (novaAba) {
            case 'listar':
                this.carregarListaEnderecos();
                break;
            case 'historico':
                this.carregarHistorico();
                break;
        }
    }

    // Atualizar estatísticas
    async atualizarEstatisticas() {
        if (!this.sistema) return;

        // Forçar busca direta no banco de dados para garantir dados atualizados
        const relatorio = await this.sistema.gerarRelatorioOcupacao(false);
        const sessao = this.sistema.obterDadosSessao();

        const totalCadastradosEl = document.getElementById('totalCadastrados');
        const totalOcupadosEl = document.getElementById('totalOcupados');
        const totalDisponiveisEl = document.getElementById('totalDisponiveis');
        const percentualOcupacaoEl = document.getElementById('percentualOcupacao');

        // Atualizar título com o CD atual para conferência
        const statsHeader = document.querySelector('.stats-container')?.previousElementSibling;
        if (statsHeader && statsHeader.tagName.startsWith('H') && sessao.nomeCD) {
            statsHeader.innerHTML = `Estatísticas - <span style="color: #4f46e5; font-size: 0.9em;">${sessao.nomeCD}</span>`;
        }

        if (totalCadastradosEl) totalCadastradosEl.textContent = relatorio.totalCadastrados.toLocaleString('pt-BR');

        // Mostrar dados diretos do banco sem aproximações
        if (totalOcupadosEl) totalOcupadosEl.textContent = relatorio.totalOcupados.toLocaleString('pt-BR');
        if (totalDisponiveisEl) totalDisponiveisEl.textContent = relatorio.totalDisponiveis.toLocaleString('pt-BR');

        if (percentualOcupacaoEl) {
            // Formatar percentual: remover .0 se for redondo
            let perc = relatorio.percentualOcupacao;
            if (perc.endsWith('.0')) perc = perc.replace('.0', '');
            percentualOcupacaoEl.textContent = perc + '%';
        }

        // Log para debug
        console.log(`📊 Estatísticas atualizadas (${relatorio.origem}):`, {
            cadastrados: relatorio.totalCadastrados,
            ocupados: relatorio.totalOcupados,
            disponiveis: relatorio.totalDisponiveis,
            produtos: relatorio.totalProdutos,
            percentual: relatorio.percentualOcupacao + '%'
        });
    }

    // Forçar atualização completa dos dados
    async forcarAtualizacaoCompleta() {
        if (!this.sistema) return;

        const btnRefresh = document.getElementById('btnRefreshStats');

        try {
            // Mostrar estado de carregamento
            if (btnRefresh) {
                btnRefresh.classList.add('loading');
                btnRefresh.innerHTML = `
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="23,4 23,10 17,10"/>
                        <polyline points="1,20 1,14 7,14"/>
                        <path d="M20.49,9A9,9,0,0,0,5.64,5.64L1,10m22,4L18.36,18.36A9,9,0,0,1,3.51,15"/>
                    </svg>
                    Atualizando...
                `;
            }

            // Recarregar cache do banco de dados
            await this.sistema.carregarCache();

            // Atualizar estatísticas
            await this.atualizarEstatisticas();

            // Recarregar lista de endereços
            this.carregarListaEnderecos();

            console.log('✅ Atualização completa realizada');

            // Mostrar feedback visual
            if (window.showToast) {
                window.showToast('Dados atualizados com sucesso!', 'success');
            }

        } catch (error) {
            console.error('❌ Erro na atualização completa:', error);
            if (window.showToast) {
                window.showToast('Erro ao atualizar dados: ' + error.message, 'error');
            }
        } finally {
            // Restaurar estado do botão
            if (btnRefresh) {
                btnRefresh.classList.remove('loading');
                btnRefresh.innerHTML = `
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="23,4 23,10 17,10"/>
                        <polyline points="1,20 1,14 7,14"/>
                        <path d="M20.49,9A9,9,0,0,0,5.64,5.64L1,10m22,4L18.36,18.36A9,9,0,0,1,3.51,15"/>
                    </svg>
                    Atualizar
                `;
            }
        }
    }

    // Carregar lista de endereços
    carregarListaEnderecos() {
        const filtroStatus = document.getElementById('filtroStatus').value;
        const container = document.getElementById('enderecosLista');

        let enderecos = [];

        // Obter endereços baseado no filtro
        if (filtroStatus === 'disponivel') {
            enderecos = this.sistema.listarEnderecosDisponiveis().map(e => ({
                ...e,
                status: 'DISPONÍVEL'
            }));
        } else if (filtroStatus === 'ocupado') {
            enderecos = this.sistema.listarEnderecosOcupados().map(e => ({
                ...e,
                status: 'OCUPADO'
            }));
        } else {
            // Todos os endereços
            const disponiveis = this.sistema.listarEnderecosDisponiveis().map(e => ({
                ...e,
                status: 'DISPONÍVEL'
            }));
            const ocupados = this.sistema.listarEnderecosOcupados().map(e => ({
                ...e,
                status: 'OCUPADO'
            }));
            enderecos = [...disponiveis, ...ocupados].sort((a, b) => a.endereco.localeCompare(b.endereco));
        }

        if (enderecos.length === 0) {
            // Verificar se o sistema ainda está carregando
            if (this.sistema && !this.sistema.cacheCarregado) {
                container.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon spinner">⏳</div>
                        <div class="empty-state-title">Carregando dados...</div>
                        <div class="empty-state-description">
                            Conectando ao banco de dados...
                        </div>
                    </div>
                `;
                // Tentar novamente em breve
                setTimeout(() => this.carregarListaEnderecos(), 1000);
                return;
            }

            const isConnected = this.sistema && this.sistema.isConnected && !this.sistema.modoOffline;

            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📦</div>
                    <div class="empty-state-title">Nenhum endereço encontrado</div>
                    <div class="empty-state-description">
                        ${filtroStatus === 'todos' ? 'O banco de dados parece estar vazio.' :
                    filtroStatus === 'disponivel' ? 'Não há endereços disponíveis' :
                        'Não há endereços ocupados'}
                    </div>
                    ${isConnected && filtroStatus === 'todos' ? `
                        <div class="empty-state-action" style="margin-top: 15px; text-align: center;">
                            <p style="margin-bottom: 15px; font-size: 0.9em; color: #666;">
                                O banco de dados está vazio. É necessário fazer a instalação inicial dos endereços.
                            </p>
                            <button id="btnInstalarBase" class="btn btn-primary btn-sm">
                                🏗️ Instalar Base de Endereços
                            </button>
                        </div>
                        <script>
                            document.getElementById('btnInstalarBase').addEventListener('click', async function() {
                                const btn = this;
                                btn.disabled = true;
                                btn.innerHTML = '⏳ Instalando... (Isso pode demorar)';
                                
                                try {
                                    if(window.customAlert) await window.customAlert('A instalação de 1.710 endereços será iniciada.\nPor favor, aguarde até a conclusão.', 'Instalação');
                                    
                                    const res = await window.sistemaEnderecamento.instalarEnderecosBase();
                                    
                                    if(res.erros > 0) {
                                        alert(\`Instalação concluída com \${res.erros} erros. Alguns endereços podem ter tido conflito.\`);
                                    } else {
                                        alert('✅ Instalação concluída com sucesso!');
                                    }
                                    window.location.reload();
                                } catch (e) {
                                    alert('Erro: ' + e.message);
                                    btn.disabled = false;
                                    btn.innerHTML = '❌ Tentar Novamente';
                                }
                            });
                        </script>
                    ` : ''}
                </div>
            `;
            return;
        }

        // Otimização: Limitar renderização no mobile para não travar
        const mobile = isMobile();
        const LIMIT_MOBILE = 50;
        const LIMIT_DESKTOP = 100;
        const LIMIT_RENDER = mobile ? LIMIT_MOBILE : LIMIT_DESKTOP;
        const totalEnderecos = enderecos.length;
        const enderecosParaRenderizar = enderecos.slice(0, LIMIT_RENDER);

        const htmlItens = enderecosParaRenderizar.map(endereco => {
            const isDisponivel = endereco.status === 'DISPONÍVEL';
            const temProdutoSelecionado = this.produtoSelecionado &&
                (this.produtoSelecionado.acao === 'alocar' ||
                    this.produtoSelecionado.acao === 'transferir' ||
                    this.produtoSelecionado.acao === 'adicionar_mais' ||
                    this.produtoSelecionado.acao === 'buscar_enderecos' ||
                    this.produtoSelecionado.acao === 'buscar_alocar');

            // Lógica para permitir clique apenas se não for o endereço atual
            const isTransferencia = this.produtoSelecionado && this.produtoSelecionado.acao === 'transferir';
            const isAdicionarMais = this.produtoSelecionado && (this.produtoSelecionado.acao === 'adicionar_mais' || this.produtoSelecionado.acao === 'buscar_enderecos');

            const isEnderecoAtual = (isTransferencia || isAdicionarMais) && endereco.endereco === this.produtoSelecionado.enderecoAtual;

            // Só pode alocar se disponível e não for o endereço atual
            const podeAlocar = isDisponivel && temProdutoSelecionado && !isEnderecoAtual;

            // Debug para buscar_alocar
            if (this.produtoSelecionado && this.produtoSelecionado.acao === 'buscar_alocar') {
                console.log(`🔍 Debug buscar_alocar - Endereço: ${endereco.endereco}`);
                console.log(`📊 isDisponivel: ${isDisponivel}`);
                console.log(`👤 temProdutoSelecionado: ${temProdutoSelecionado}`);
                console.log(`✅ podeAlocar: ${podeAlocar}`);
            }

            // Debug para buscar_enderecos
            if (this.produtoSelecionado && this.produtoSelecionado.acao === 'buscar_enderecos') {
                console.log(`🔍 Debug buscar_enderecos - Endereço: ${endereco.endereco}`);
                console.log(`📊 isDisponivel: ${isDisponivel}`);
                console.log(`👤 temProdutoSelecionado: ${temProdutoSelecionado}`);
                console.log(`🏠 isEnderecoAtual: ${isEnderecoAtual}`);
                console.log(`✅ podeAlocar: ${podeAlocar}`);
            }

            const acaoTexto = isTransferencia ? 'transferir' :
                (this.produtoSelecionado && this.produtoSelecionado.acao === 'buscar_enderecos') ? 'adicionar' :
                    (this.produtoSelecionado && this.produtoSelecionado.acao === 'buscar_alocar') ? 'alocar' :
                        isAdicionarMais ? 'adicionar' : 'alocar';

            const funcaoClick = isTransferencia ? 'transferirProdutoParaEndereco' :
                isAdicionarMais ? 'adicionarProdutoNoEndereco' :
                    (this.produtoSelecionado && this.produtoSelecionado.acao === 'buscar_alocar') ? 'alocarProdutoNoEndereco' :
                        'alocarProdutoNoEndereco';

            // Tratamento especial para múltiplos produtos (ocupado mas com espaço)
            // Se o endereço tem produtos, é um array ou objeto
            let produtosHTML = '';
            if (endereco.produtos && Array.isArray(endereco.produtos)) {
                // Ordenar produtos por data de alocação (mais recente primeiro)
                const produtosOrdenados = [...endereco.produtos].sort((a, b) => {
                    const dataA = new Date(a.data_alocacao || a.dataAlocacao || 0);
                    const dataB = new Date(b.data_alocacao || b.dataAlocacao || 0);
                    return dataB - dataA;
                });

                produtosHTML = produtosOrdenados.map(p => {
                    const dataAlocacao = this.formatarDataAlocacao(p.data_alocacao || p.dataAlocacao);
                    const validadeFormatada = this.formatarValidade(p.validade);
                    const statusValidade = this.obterStatusValidade(p.validade);
                    return `
                        <div class="endereco-produto">
                            <div class="produto-coddv">CODDV: ${p.coddv}</div>
                            <div class="produto-desc">${p.descricaoProduto || p.descricao_produto}</div>
                            <div class="produto-data">📅 ${dataAlocacao}</div>
                            <div class="produto-validade ${statusValidade}">📆 Validade: ${validadeFormatada}</div>
                        </div>
                    `;
                }).join('');
            } else if (endereco.coddv) {
                const dataAlocacao = this.formatarDataAlocacao(endereco.dataAlocacao || endereco.data_alocacao);
                const validadeFormatada = this.formatarValidade(endereco.validade);
                const statusValidade = this.obterStatusValidade(endereco.validade);
                produtosHTML = `
                    <div class="endereco-produto">
                        <div class="produto-coddv">CODDV: ${endereco.coddv}</div>
                        <div class="produto-desc">${endereco.descricaoProduto}</div>
                        <div class="produto-data">📅 ${dataAlocacao}</div>
                        <div class="produto-validade ${statusValidade}">📆 Validade: ${validadeFormatada}</div>
                    </div>
                `;
            }

            return `
                <div class="endereco-item ${podeAlocar ? 'endereco-clicavel' : ''} ${isEnderecoAtual ? 'endereco-atual' : ''}" 
                     ${podeAlocar ? `data-endereco="${endereco.endereco}" data-funcao="${funcaoClick}" onclick="enderecoApp.${funcaoClick}('${endereco.endereco}')"` : ''}>
                    <div class="endereco-header">
                        <div class="endereco-codigo">${endereco.endereco}</div>
                        <div class="endereco-status status-${endereco.status.toLowerCase().replace('í', 'i').replace('ú', 'u')}">${endereco.status}</div>
                        ${isEnderecoAtual ? '<div class="endereco-atual-badge">Endereço Atual</div>' : ''}
                        ${podeAlocar ? `<div class="endereco-acao-hint">👆 Toque para ${acaoTexto}</div>` : ''}
                    </div>
                    <div class="endereco-descricao">${endereco.descricao || 'Sem descrição'}</div>
                    ${produtosHTML}
                    ${(endereco.espacoDisponivel !== undefined) ? `
                        <div class="endereco-espacos">
                            <span class="espacos-info">${endereco.espacoDisponivel} vaga${endereco.espacoDisponivel !== 1 ? 's' : ''} disponível${endereco.espacoDisponivel !== 1 ? 'eis' : ''}</span>
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');

        // Se houver mais itens, adicionar aviso
        const mensagemMaisItens = totalEnderecos > LIMIT_RENDER ? `
            <div style="text-align: center; padding: 20px; color: #666; font-style: italic;">
                Exibindo 100 de ${totalEnderecos} endereços. Use a busca ou filtros para encontrar outros.
            </div>
        ` : '';

        container.innerHTML = htmlItens + mensagemMaisItens;
    }

    // Buscar endereços
    async buscarEnderecos() {
        const termo = document.getElementById('campoBusca').value.trim();
        const container = document.getElementById('resultadosBusca');
        const mobile = isMobile();

        console.log('🔍 buscarEnderecos chamada');
        console.log('📝 Termo de busca:', termo);
        console.log('� Mobile:', mobile);
        console.log('�👤 Produto selecionado:', this.produtoSelecionado);

        if (!termo) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🔍</div>
                    <div class="empty-state-title">Digite algo para buscar</div>
                    <div class="empty-state-description">Busque por endereço ou descrição</div>
                </div>
            `;
            return;
        }

        // Mostrar loading state
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">⏳</div>
                <div class="empty-state-title">Buscando...</div>
                <div class="empty-state-description">Aguarde um momento</div>
            </div>
        `;

        try {
            const resultados = await this.sistema.buscarEnderecos(termo);
            console.log('📊 Resultados encontrados:', resultados.length);

            if (resultados.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">❌</div>
                        <div class="empty-state-title">Nenhum resultado encontrado</div>
                        <div class="empty-state-description">Tente buscar com outros termos</div>
                    </div>
                `;
                return;
            }

            // Limitar resultados no mobile para performance
            const LIMITE_MOBILE = 50;
            const LIMITE_DESKTOP = 200;
            const limite = mobile ? LIMITE_MOBILE : LIMITE_DESKTOP;
            const resultadosLimitados = resultados.slice(0, limite);
            const temMais = resultados.length > limite;

            console.log(`📋 Renderizando ${resultadosLimitados.length} de ${resultados.length} resultados`);

            // Renderizar de forma otimizada
            const htmlResultados = resultadosLimitados.map(resultado => {
                const produtosHtml = resultado.produtos.map(p => {
                    const dataAlocacao = this.formatarDataAlocacao(p.data_alocacao || p.dataAlocacao);
                    const validadeFormatada = this.formatarValidade(p.validade);
                    const statusValidade = this.obterStatusValidade(p.validade);
                    return `
                    <div class="endereco-produto">
                        <div class="produto-coddv">CODDV: ${p.coddv}</div>
                        <div class="produto-desc">${p.descricao_produto || p.descricaoProduto}</div>
                        <div class="produto-data">📅 ${dataAlocacao}</div>
                        <div class="produto-validade ${statusValidade}">📆 Validade: ${validadeFormatada}</div>
                    </div>
                `;
                }).join('');

                // Verificar se há produto selecionado para alocação
                const temProdutoSelecionado = this.produtoSelecionado &&
                    (this.produtoSelecionado.acao === 'buscar_alocar' ||
                        this.produtoSelecionado.acao === 'buscar_enderecos');

                const isDisponivel = resultado.status === 'DISPONÍVEL';
                const podeAlocar = isDisponivel && temProdutoSelecionado;

                // Determinar função de clique baseada na ação
                let funcaoClick = '';
                let acaoTexto = '';

                if (this.produtoSelecionado) {
                    if (this.produtoSelecionado.acao === 'buscar_alocar') {
                        funcaoClick = 'alocarProdutoNoEndereco';
                        acaoTexto = 'alocar';
                    } else if (this.produtoSelecionado.acao === 'buscar_enderecos') {
                        funcaoClick = 'adicionarProdutoNoEndereco';
                        acaoTexto = 'adicionar';
                    }
                }

                // Usar o mesmo layout da lista de endereços
                return `
                <div class="endereco-item ${podeAlocar ? 'endereco-clicavel' : ''}" 
                     ${podeAlocar ? `data-endereco="${resultado.endereco}" data-funcao="${funcaoClick}" onclick="enderecoApp.${funcaoClick}('${resultado.endereco}')"` : ''}>
                    <div class="endereco-header">
                        <div class="endereco-codigo">${resultado.endereco}</div>
                        <div class="endereco-status status-${resultado.status.toLowerCase().replace('í', 'i').replace('ú', 'u')}">${resultado.status}</div>
                        ${podeAlocar ? `<div class="endereco-acao-hint">👆 Toque para ${acaoTexto}</div>` : ''}
                    </div>
                    <div class="endereco-descricao">${resultado.descricao || 'Sem descrição'}</div>
                    ${produtosHtml}
                    ${!temProdutoSelecionado && resultado.status === 'DISPONÍVEL' ? `
                        <div class="endereco-acoes">
                            <button class="btn btn-sm btn-ghost" data-href="index.html?endereco=${resultado.endereco}">Alocar Produto</button>
                        </div>
                    ` : ''}
                </div>
            `;
            }).join('');

            container.innerHTML = htmlResultados;

            // Mostrar aviso se houver mais resultados
            if (temMais) {
                container.insertAdjacentHTML('beforeend', `
                    <div class="empty-state" style="margin-top: 1rem; padding: 1rem; background: #fef3c7; border: 1px solid #fbbf24; border-radius: 8px;">
                        <div class="empty-state-icon">ℹ️</div>
                        <div class="empty-state-title">Mostrando ${resultadosLimitados.length} de ${resultados.length} resultados</div>
                        <div class="empty-state-description">Refine sua busca para ver resultados mais específicos</div>
                    </div>
                `);
            }

        } catch (error) {
            console.error('❌ Erro ao buscar endereços:', error);
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">⚠️</div>
                    <div class="empty-state-title">Erro ao buscar endereços</div>
                    <div class="empty-state-description">${error.message || 'Tente novamente em alguns instantes'}</div>
                </div>
            `;
        }
    }

    // Função utilitária para formatar datas do histórico
    formatarDataHistorico(dataHora) {
        if (!dataHora) return 'Data não disponível';

        try {
            let data;

            // Se já é uma string formatada em português (DD/MM/AAAA HH:MM:SS)
            if (typeof dataHora === 'string' && dataHora.includes('/')) {
                const partes = dataHora.split(' ');
                if (partes.length >= 1) {
                    const [dia, mes, ano] = partes[0].split('/');
                    const hora = partes[1] || '00:00:00';
                    // Criar data no formato ISO para parsing correto
                    data = new Date(`${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}T${hora}`);
                }
            } else {
                // Tentar como ISO string ou timestamp
                data = new Date(dataHora);
            }

            if (!isNaN(data.getTime())) {
                return data.toLocaleString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            } else {
                // Se não conseguiu converter, usar a string original se for válida
                return typeof dataHora === 'string' ? dataHora : 'Data inválida';
            }
        } catch (e) {
            console.warn('Erro ao converter data do histórico:', dataHora, e);
            return typeof dataHora === 'string' ? dataHora : 'Data inválida';
        }
    }

    // Carregar histórico
    async carregarHistorico() {
        const container = document.getElementById('historicoEnderecos');
        let historico = [];

        // Tentar buscar do Supabase primeiro
        if (this.sistema && this.sistema.isConnected && !this.sistema.modoOffline) {
            try {
                container.innerHTML = '<div class="historico-loading">Carregando histórico...</div>';

                const historicoSupabase = await this.sistema.obterHistorico(50);

                // Converter formato do Supabase para formato local
                historico = historicoSupabase.map(item => {
                    // Formatar data usando função utilitária
                    const timestampFormatado = this.formatarDataHistorico(item.data_hora);

                    return {
                        id: item.id,
                        timestamp: item.data_hora,
                        timestampFormatado: timestampFormatado,
                        tipo: item.tipo,
                        endereco: item.endereco_destino || item.endereco,
                        coddv: item.coddv,
                        descricaoProduto: item.descricao_produto,
                        observacao: item.observacao || '',
                        usuario: item.usuario,
                        cd: item.cd
                    };
                });

                console.log('✅ Histórico de endereços carregado do Supabase:', historico.length, 'registros');

            } catch (error) {
                console.error('❌ Erro ao carregar histórico do Supabase:', error);
                // Fallback para sistema local
                historico = this.sistema.historicoEnderecos || [];
            }
        } else {
            // Usar sistema local como fallback
            historico = this.sistema.historicoEnderecos || [];
        }

        if (historico.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📋</div>
                    <div class="empty-state-title">Nenhuma operação registrada</div>
                    <div class="empty-state-description">O histórico aparecerá aqui conforme você usar o sistema</div>
                </div>
            `;
            return;
        }

        // Pegar apenas os últimos 10 movimentos
        const ultimosMovimentos = historico.slice(0, 10);
        const totalMovimentos = historico.length;

        // Cabeçalho com informação de quantos movimentos estão sendo exibidos
        const fonteIndicador = this.sistema && this.sistema.isConnected && !this.sistema.modoOffline ?
            '<span class="historico-fonte supabase">Supabase</span>' :
            '<span class="historico-fonte local">Local</span>';

        const cabecalhoInfo = totalMovimentos > 10 ?
            `<div class="historico-info">
                <span class="historico-contador">📊 Exibindo os últimos 10 de ${totalMovimentos} movimentos ${fonteIndicador}</span>
                <button class="btn btn-ghost btn-sm" onclick="enderecoApp.carregarHistoricoCompleto()" title="Ver histórico completo">
                    📋 Ver Todos
                </button>
            </div>` :
            `<div class="historico-info">
                <span class="historico-contador">📊 ${totalMovimentos} movimento${totalMovimentos !== 1 ? 's' : ''} registrado${totalMovimentos !== 1 ? 's' : ''} ${fonteIndicador}</span>
            </div>`;

        const itensHTML = ultimosMovimentos.map((item, index) => `
            <div class="historico-item-endereco ${index === 0 ? 'historico-item-recente' : ''}">
                <div class="historico-header-endereco">
                    <div class="historico-tipo-endereco tipo-${item.tipo.toLowerCase().replace('ã', 'a').replace('ç', 'c')}">${item.tipo}</div>
                    <div class="historico-timestamp-endereco">${item.timestampFormatado}</div>
                </div>
                <div class="historico-endereco-codigo">${item.endereco}</div>
                ${item.coddv ? `
                    <div class="historico-detalhes">
                        <strong>CODDV:</strong> ${item.coddv}<br>
                        <strong>Produto:</strong> ${item.descricaoProduto}
                    </div>
                ` : ''}
                ${item.observacao ? `
                    <div class="historico-detalhes">${item.observacao}</div>
                ` : ''}
                <div class="historico-usuario-endereco">
                    <span class="usuario-info-endereco">👤 ${item.usuario}</span>
                    <span class="cd-info-endereco">📍 ${item.cd}</span>
                </div>
            </div>
        `).join('');

        container.innerHTML = cabecalhoInfo + itensHTML;
    }

    async carregarHistoricoCompleto() {
        const container = document.getElementById('historicoEnderecos');
        let historico = [];

        // Tentar buscar do Supabase primeiro
        if (this.sistema && this.sistema.isConnected && !this.sistema.modoOffline) {
            try {
                container.innerHTML = '<div class="historico-loading">Carregando histórico completo...</div>';

                const historicoSupabase = await this.sistema.obterHistorico(200); // Buscar mais registros

                // Converter formato do Supabase para formato local
                // Converter formato do Supabase para formato local
                historico = historicoSupabase.map(item => {
                    // Formatar data usando função utilitária
                    const timestampFormatado = this.formatarDataHistorico(item.data_hora);

                    return {
                        id: item.id,
                        timestamp: item.data_hora,
                        timestampFormatado: timestampFormatado,
                        tipo: item.tipo,
                        endereco: item.endereco_destino || item.endereco,
                        coddv: item.coddv,
                        descricaoProduto: item.descricao_produto,
                        observacao: item.observacao || '',
                        usuario: item.usuario,
                        cd: item.cd
                    };
                });

                console.log('✅ Histórico completo de endereços carregado do Supabase:', historico.length, 'registros');

            } catch (error) {
                console.error('❌ Erro ao carregar histórico completo do Supabase:', error);
                // Fallback para sistema local
                historico = this.sistema.historicoEnderecos || [];
            }
        } else {
            // Usar sistema local como fallback
            historico = this.sistema.historicoEnderecos || [];
        }

        if (historico.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📋</div>
                    <div class="empty-state-title">Nenhuma operação registrada</div>
                    <div class="empty-state-description">O histórico aparecerá aqui conforme você usar o sistema</div>
                </div>
            `;
            return;
        }

        // Cabeçalho para histórico completo
        const fonteIndicador = this.sistema && this.sistema.isConnected && !this.sistema.modoOffline ?
            '<span class="historico-fonte supabase">Supabase</span>' :
            '<span class="historico-fonte local">Local</span>';

        const cabecalhoInfo = `
            <div class="historico-info historico-completo">
                <span class="historico-contador">📊 Histórico Completo - ${historico.length} movimento${historico.length !== 1 ? 's' : ''} ${fonteIndicador}</span>
                <button class="btn btn-ghost btn-sm" onclick="enderecoApp.carregarHistorico()" title="Voltar aos últimos 10">
                    🔙 Últimos 10
                </button>
            </div>
        `;

        const itensHTML = historico.map((item, index) => `
            <div class="historico-item-endereco ${index === 0 ? 'historico-item-recente' : ''}">
                <div class="historico-header-endereco">
                    <div class="historico-tipo-endereco tipo-${item.tipo.toLowerCase().replace('ã', 'a').replace('ç', 'c')}">${item.tipo}</div>
                    <div class="historico-timestamp-endereco">${item.timestampFormatado}</div>
                </div>
                <div class="historico-endereco-codigo">${item.endereco}</div>
                ${item.coddv ? `
                    <div class="historico-detalhes">
                        <strong>CODDV:</strong> ${item.coddv}<br>
                        <strong>Produto:</strong> ${item.descricaoProduto}
                    </div>
                ` : ''}
                ${item.observacao ? `
                    <div class="historico-detalhes">${item.observacao}</div>
                ` : ''}
                <div class="historico-usuario-endereco">
                    <span class="usuario-info-endereco">👤 ${item.usuario}</span>
                    <span class="cd-info-endereco">📍 ${item.cd}</span>
                </div>
            </div>
        `).join('');

        container.innerHTML = cabecalhoInfo + itensHTML;
    }
}

// Instância global da aplicação
let enderecoApp;

// Inicialização
function inicializar() {
    console.log('🚀 Iniciando aplicação de endereços...');

    enderecoApp = new EnderecoApp();
    enderecoApp.inicializar();

    // Evento agora tratado dentro da classe EnderecoApp.inicializar()
}

// Boot
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializar);
} else {
    inicializar();
}