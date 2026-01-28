/* ===== Sistema de Endereçamento Otimizado ===== */

class SistemaEnderecamento {
    constructor() {
        this.enderecosCadastrados = JSON.parse(localStorage.getItem('enderecos_cadastrados') || '{}');
        this.enderecosOcupados = JSON.parse(localStorage.getItem('enderecos_ocupados') || '{}');
        this.historicoEnderecos = JSON.parse(localStorage.getItem('historico_enderecos') || '[]');
    }

    // Validar formato do endereço: PF[01-15].001.[001-019].A0[T,1,2,3,4,5,6]
    validarFormatoEndereco(endereco) {
        const regex = /^PF(0[1-9]|1[0-5])\.001\.(0(0[1-9]|1[0-9])|019)\.A0[T123456]$/;
        return regex.test(endereco.toUpperCase());
    }

    // Gerar endereço formatado
    gerarEndereco(zona, coluna, nivel) {
        // Validar zona (PF01 a PF15)
        const zonaNum = parseInt(zona);
        if (zonaNum < 1 || zonaNum > 15) {
            throw new Error('Zona deve estar entre 01 e 15');
        }
        
        // Validar coluna (001 a 019)
        const colunaNum = parseInt(coluna);
        if (colunaNum < 1 || colunaNum > 19) {
            throw new Error('Coluna deve estar entre 001 e 019');
        }
        
        // Validar nível (T, 1, 2, 3, 4, 5, 6)
        const niveisValidos = ['T', '1', '2', '3', '4', '5', '6'];
        if (!niveisValidos.includes(nivel.toString())) {
            throw new Error('Nível deve ser T, 1, 2, 3, 4, 5 ou 6');
        }
        
        // Formatar endereço
        const zonaFormatada = `PF${zona.toString().padStart(2, '0')}`;
        const blocoFixo = '001';
        const colunaFormatada = coluna.toString().padStart(3, '0');
        const nivelFormatado = `A0${nivel}`;
        
        return `${zonaFormatada}.${blocoFixo}.${colunaFormatada}.${nivelFormatado}`;
    }

    // Cadastrar novo endereço
    cadastrarEndereco(endereco, descricao = '') {
        const enderecoUpper = endereco.toUpperCase();
        
        if (!this.validarFormatoEndereco(enderecoUpper)) {
            throw new Error('Formato de endereço inválido. Use: PF[01-15].001.[001-019].A0[T,1,2,3,4,5,6]');
        }
        
        if (this.enderecosCadastrados[enderecoUpper]) {
            throw new Error('Endereço já cadastrado no sistema');
        }
        
        const agora = new Date();
        const sessionData = JSON.parse(localStorage.getItem('enderecamento_fraldas_session') || '{}');
        
        this.enderecosCadastrados[enderecoUpper] = {
            endereco: enderecoUpper,
            descricao: descricao || 'Endereço padrão',
            dataCadastro: agora.toISOString(),
            usuario: sessionData.usuario || 'Sistema',
            cd: sessionData.nomeCD || 'N/A',
            ativo: true
        };
        
        this.adicionarHistorico('CADASTRO', enderecoUpper, null, null, descricao);
        this.salvarDados();
        
        return enderecoUpper;
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
    },

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
    },

    // Alocar produto em endereço (suporte a até 2 produtos por endereço)
    alocarProduto(endereco, coddv, descricaoProduto, permitirMultiplos = false) {
        const enderecoUpper = endereco.toUpperCase();
        
        // Verificar se endereço existe
        if (!this.enderecosCadastrados[enderecoUpper]) {
            throw new Error('Endereço não cadastrado. Cadastre o endereço primeiro.');
        }
        
        // Verificar se endereço está ativo
        if (!this.enderecosCadastrados[enderecoUpper].ativo) {
            throw new Error('Endereço está inativo');
        }
        
        // Verificar se produto já está alocado em outro endereço (apenas se não permitir múltiplos)
        if (!permitirMultiplos) {
            const enderecoAtual = this.obterEnderecoAtualProduto(coddv);
            if (enderecoAtual) {
                throw new Error(`Produto já alocado no endereço: ${enderecoAtual}`);
            }
        } else {
            // Para múltiplos, verificar se já está neste endereço específico
            const produtosNoEndereco = this.obterProdutosNoEndereco(enderecoUpper);
            const jaExisteNeste = produtosNoEndereco.some(p => p.coddv === coddv);
            if (jaExisteNeste) {
                throw new Error(`Produto já está alocado neste endereço: ${enderecoUpper}`);
            }
        }
        
        // Verificar quantos produtos já estão no endereço
        const produtosNoEndereco = this.obterProdutosNoEndereco(enderecoUpper);
        if (produtosNoEndereco.length >= 2) {
            throw new Error(`Endereço já possui o máximo de 2 produtos: ${produtosNoEndereco.map(p => p.coddv).join(', ')}`);
        }
        
        const agora = new Date();
        const sessionData = JSON.parse(localStorage.getItem('enderecamento_fraldas_session') || '{}');
        
        // Inicializar array se não existir
        if (!this.enderecosOcupados[enderecoUpper]) {
            this.enderecosOcupados[enderecoUpper] = [];
        }
        
        this.enderecosOcupados[enderecoUpper].push({
            coddv: coddv,
            descricaoProduto: descricaoProduto,
            dataAlocacao: agora.toISOString(),
            usuario: sessionData.usuario || 'Sistema',
            cd: sessionData.nomeCD || 'N/A'
        });
        
        this.adicionarHistorico('ALOCAÇÃO', enderecoUpper, coddv, descricaoProduto);
        this.salvarDados();
        
        return enderecoUpper;
    }

    // Desalocar produto
    desalocarProduto(endereco, coddv = null) {
        const enderecoUpper = endereco.toUpperCase();
        
        if (!this.enderecosOcupados[enderecoUpper]) {
            throw new Error('Endereço não está ocupado');
        }
        
        const produtos = this.obterProdutosNoEndereco(enderecoUpper);
        
        if (coddv) {
            // Desalocar produto específico
            const produtoIndex = produtos.findIndex(p => p.coddv === coddv);
            if (produtoIndex === -1) {
                throw new Error('Produto não encontrado neste endereço');
            }
            
            const produtoInfo = produtos[produtoIndex];
            produtos.splice(produtoIndex, 1);
            
            // Se não há mais produtos, remover o endereço da lista de ocupados
            if (produtos.length === 0) {
                delete this.enderecosOcupados[enderecoUpper];
            } else {
                this.enderecosOcupados[enderecoUpper] = produtos;
            }
            
            this.adicionarHistorico('DESALOCAÇÃO', enderecoUpper, coddv, produtoInfo.descricaoProduto);
            this.salvarDados();
            
            return produtoInfo;
        } else {
            // Desalocar todos os produtos (compatibilidade com sistema legado)
            const produtoInfo = produtos[0];
            delete this.enderecosOcupados[enderecoUpper];
            
            this.adicionarHistorico('DESALOCAÇÃO', enderecoUpper, produtoInfo.coddv, produtoInfo.descricaoProduto);
            this.salvarDados();
            
            return produtoInfo;
        }
    }

    // Transferir produto entre endereços
    transferirProduto(enderecoOrigem, enderecoDestino) {
        const enderecoOrigemUpper = enderecoOrigem.toUpperCase();
        const enderecoDestinoUpper = enderecoDestino.toUpperCase();
        
        // Verificar endereço origem
        if (!this.enderecosOcupados[enderecoOrigemUpper]) {
            throw new Error('Endereço de origem não está ocupado');
        }
        
        // Verificar endereço destino
        if (!this.enderecosCadastrados[enderecoDestinoUpper]) {
            throw new Error('Endereço de destino não cadastrado');
        }
        
        if (this.enderecosOcupados[enderecoDestinoUpper]) {
            throw new Error('Endereço de destino já está ocupado');
        }
        
        const produtoInfo = this.enderecosOcupados[enderecoOrigemUpper];
        
        // Remover do endereço origem
        delete this.enderecosOcupados[enderecoOrigemUpper];
        
        // Adicionar ao endereço destino
        const agora = new Date();
        const sessionData = JSON.parse(localStorage.getItem('enderecamento_fraldas_session') || '{}');
        
        this.enderecosOcupados[enderecoDestinoUpper] = {
            ...produtoInfo,
            dataAlocacao: agora.toISOString(),
            usuario: sessionData.usuario || 'Sistema',
            cd: sessionData.nomeCD || 'N/A'
        };
        
        this.adicionarHistorico('TRANSFERÊNCIA', enderecoDestinoUpper, produtoInfo.coddv, produtoInfo.descricaoProduto, 
                              `De: ${enderecoOrigemUpper} Para: ${enderecoDestinoUpper}`);
        this.salvarDados();
        
        return { origem: enderecoOrigemUpper, destino: enderecoDestinoUpper, produto: produtoInfo };
    }

    // Adicionar produto em endereço adicional (permite múltiplas alocações)
    adicionarProdutoEmMaisEnderecos(endereco, coddv, descricaoProduto) {
        return this.alocarProduto(endereco, coddv, descricaoProduto, true);
    }

    // Obter endereço atual de um produto
    obterEnderecoAtualProduto(coddv) {
        for (const [endereco, produtos] of Object.entries(this.enderecosOcupados)) {
            if (Array.isArray(produtos)) {
                // Novo formato (array de produtos)
                const produto = produtos.find(p => p.coddv === coddv);
                if (produto) return endereco;
            } else {
                // Formato legado (objeto único)
                if (produtos.coddv === coddv) return endereco;
            }
        }
        return null;
    }

    // Obter produtos em um endereço específico
    obterProdutosNoEndereco(endereco) {
        const enderecoUpper = endereco.toUpperCase();
        const produtos = this.enderecosOcupados[enderecoUpper];
        
        if (!produtos) return [];
        
        if (Array.isArray(produtos)) {
            return produtos;
        } else {
            // Formato legado - converter para array
            return [produtos];
        }
    }

    // Verificar se endereço tem espaço disponível
    enderecoTemEspaco(endereco) {
        const produtos = this.obterProdutosNoEndereco(endereco);
        return produtos.length < 2;
    }

    // Listar endereços disponíveis (com espaço para mais produtos)
    listarEnderecosComEspaco() {
        const disponiveis = [];
        for (const [endereco, info] of Object.entries(this.enderecosCadastrados)) {
            if (info.ativo) {
                const produtos = this.obterProdutosNoEndereco(endereco);
                if (produtos.length < 2) {
                    disponiveis.push({
                        endereco,
                        descricao: info.descricao,
                        dataCadastro: info.dataCadastro,
                        produtosAlocados: produtos.length,
                        espacoDisponivel: 2 - produtos.length,
                        produtos: produtos
                    });
                }
            }
        }
        return disponiveis.sort((a, b) => a.endereco.localeCompare(b.endereco));
    }

    // Listar endereços disponíveis
    listarEnderecosDisponiveis() {
        const disponiveis = [];
        for (const [endereco, info] of Object.entries(this.enderecosCadastrados)) {
            if (info.ativo && !this.enderecosOcupados[endereco]) {
                disponiveis.push({
                    endereco,
                    descricao: info.descricao,
                    dataCadastro: info.dataCadastro
                });
            }
        }
        return disponiveis.sort((a, b) => a.endereco.localeCompare(b.endereco));
    }

    // Listar endereços ocupados
    listarEnderecosOcupados() {
        const ocupados = [];
        for (const [endereco, info] of Object.entries(this.enderecosOcupados)) {
            ocupados.push({
                endereco,
                coddv: info.coddv,
                descricaoProduto: info.descricaoProduto,
                dataAlocacao: info.dataAlocacao,
                validade: info.validade,
                usuario: info.usuario
            });
        }
        return ocupados.sort((a, b) => a.endereco.localeCompare(b.endereco));
    }

    // Buscar endereços por filtro
    buscarEnderecos(filtro) {
        const filtroUpper = filtro.toUpperCase();
        const resultados = [];
        
        // Buscar em endereços cadastrados
        for (const [endereco, info] of Object.entries(this.enderecosCadastrados)) {
            if (endereco.includes(filtroUpper) || info.descricao.toUpperCase().includes(filtroUpper)) {
                const ocupado = this.enderecosOcupados[endereco];
                resultados.push({
                    endereco,
                    descricao: info.descricao,
                    status: ocupado ? 'OCUPADO' : 'DISPONÍVEL',
                    produto: ocupado ? ocupado.coddv : null,
                    descricaoProduto: ocupado ? ocupado.descricaoProduto : null
                });
            }
        }
        
        return resultados.sort((a, b) => a.endereco.localeCompare(b.endereco));
    }

    // Gerar relatório de ocupação
    gerarRelatorioOcupacao() {
        const totalCadastrados = Object.keys(this.enderecosCadastrados).length;
        const totalOcupados = Object.keys(this.enderecosOcupados).length;
        const totalDisponiveis = totalCadastrados - totalOcupados;
        const percentualOcupacao = totalCadastrados > 0 ? (totalOcupados / totalCadastrados * 100).toFixed(1) : 0;
        
        return {
            totalCadastrados,
            totalOcupados,
            totalDisponiveis,
            percentualOcupacao
        };
    }

    // Adicionar ao histórico
    adicionarHistorico(tipo, endereco, coddv = null, descricaoProduto = null, observacao = '') {
        const agora = new Date();
        const sessionData = JSON.parse(localStorage.getItem('enderecamento_fraldas_session') || '{}');
        
        const registro = {
            id: Date.now() + Math.random(),
            timestamp: agora.toISOString(),
            timestampFormatado: agora.toLocaleString('pt-BR'),
            tipo,
            endereco,
            coddv,
            descricaoProduto,
            observacao,
            usuario: sessionData.usuario || 'Sistema',
            cd: sessionData.nomeCD || 'N/A'
        };
        
        this.historicoEnderecos.unshift(registro);
        
        // Manter apenas os últimos 100 registros
        if (this.historicoEnderecos.length > 100) {
            this.historicoEnderecos = this.historicoEnderecos.slice(0, 100);
        }
        
        this.salvarDados();
    }

    // Salvar dados no localStorage
    salvarDados() {
        localStorage.setItem('enderecos_cadastrados', JSON.stringify(this.enderecosCadastrados));
        localStorage.setItem('enderecos_ocupados', JSON.stringify(this.enderecosOcupados));
        localStorage.setItem('historico_enderecos', JSON.stringify(this.historicoEnderecos));
    }

    // Exportar dados para backup
    exportarDados() {
        return {
            enderecosCadastrados: this.enderecosCadastrados,
            enderecosOcupados: this.enderecosOcupados,
            historicoEnderecos: this.historicoEnderecos,
            dataExportacao: new Date().toISOString()
        };
    }

    // Importar dados de backup
    importarDados(dados) {
        if (dados.enderecosCadastrados) {
            this.enderecosCadastrados = dados.enderecosCadastrados;
        }
        if (dados.enderecosOcupados) {
            this.enderecosOcupados = dados.enderecosOcupados;
        }
        if (dados.historicoEnderecos) {
            this.historicoEnderecos = dados.historicoEnderecos;
        }
        this.salvarDados();
    }
}

// Instância global do sistema
window.sistemaEnderecamento = new SistemaEnderecamento();