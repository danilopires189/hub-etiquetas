/**
 * Script de Integração Universal do Contador de Etiquetas
 * Versão: 2.0
 * 
 * Este script deve ser incluído em todas as aplicações para
 * integração automática com o contador global do Hub.
 */

(function() {
  'use strict';
  
  console.log('🔄 Inicializando integração do contador...');
  
  // ===== SISTEMA DE CONTADOR UNIVERSAL =====
  window.ContadorIntegration = {
    
    // Obtém o contador do Hub em diferentes contextos
    obterContadorHub: function() {
      let contador = null;
      
      // 1. Se estiver em iframe (dentro do Hub)
      if (window.parent && window.parent !== window && window.parent.HubEtiquetas) {
        contador = window.parent.HubEtiquetas;
        console.log('📊 Contador encontrado via parent (iframe)');
      }
      // 2. Se foi aberto em nova aba pelo Hub
      else if (window.opener && window.opener.HubEtiquetas) {
        contador = window.opener.HubEtiquetas;
        console.log('📊 Contador encontrado via opener (nova aba)');
      }
      // 3. Se o Hub foi carregado na mesma página
      else if (window.HubEtiquetas) {
        contador = window.HubEtiquetas;
        console.log('📊 Contador encontrado na mesma janela');
      }
      // 4. Fallback: sistema local
      else {
        console.log('ℹ️ Sistema de contador do Hub não encontrado - usando fallback local');
        contador = this.criarContadorLocal();
      }
      
      return contador;
    },
    
    // Cria um sistema de contador local como fallback
    criarContadorLocal: function() {
      return {
        incrementarContador: function(qtd) {
          try {
            const storageKey = 'hub-etiquetas-count';
            const stored = localStorage.getItem(storageKey);
            let currentValue = 19452; // valor padrão
            
            if (stored) {
              const data = JSON.parse(stored);
              currentValue = data.totalCount || 19452;
            }
            
            const newValue = currentValue + qtd;
            const data = {
              totalCount: newValue,
              lastUpdated: Date.now(),
              breakdown: { placas: 0, caixa: 0, avulso: 0, enderec: 0, transfer: 0, termo: 0 }
            };
            
            localStorage.setItem(storageKey, JSON.stringify(data));
            console.log(`📈 Contador local atualizado: +${qtd} (Total: ${newValue})`);
            return newValue;
          } catch (error) {
            console.error('❌ Erro no contador local:', error);
            return null;
          }
        },
        disponivel: () => true,
        obterTotal: function() {
          try {
            const stored = localStorage.getItem('hub-etiquetas-count');
            if (stored) {
              const data = JSON.parse(stored);
              return data.totalCount || 19452;
            }
            return 19452;
          } catch (error) {
            return 19452;
          }
        }
      };
    },
    
    // Cache do contador para evitar múltiplas verificações
    _contadorCache: null,
    _cacheTimestamp: 0,
    
    // Incrementa o contador com tratamento de erros (OTIMIZADO)
    incrementar: function(quantidade = 1, tipoEtiqueta = 'geral') {
      try {
        // Cache do contador por 30 segundos para melhor performance
        const agora = Date.now();
        if (!this._contadorCache || (agora - this._cacheTimestamp) > 30000) {
          this._contadorCache = this.obterContadorHub();
          this._cacheTimestamp = agora;
        }
        
        const contador = this._contadorCache;
        if (!contador) return null;
        
        // Valida quantidade (otimizado)
        const qtd = Math.max(parseInt(quantidade) || 1, 1);
        
        // Verifica disponibilidade (com cache)
        if (contador.disponivel && !contador.disponivel()) return null;
        
        const novoTotal = contador.incrementarContador(qtd);
        
        // Log reduzido para melhor performance
        if (novoTotal) {
          console.log(`📊 +${qtd} ${tipoEtiqueta} (Total: ${novoTotal})`);
        }
        
        return novoTotal;
      } catch (error) {
        console.error('❌ Erro contador:', error);
        return null;
      }
    },
    
    // Mostra feedback visual discreto (apenas no console)
    mostrarFeedback: function(botaoId, novoTotal) {
      if (novoTotal) {
        console.log(`📊 Feedback: Contador atualizado para ${novoTotal.toLocaleString('pt-BR')} etiquetas`);
        
        // Feedback visual muito discreto - apenas uma pequena animação
        const botao = document.getElementById(botaoId);
        if (botao) {
          const originalTransform = botao.style.transform;
          botao.style.transform = 'scale(0.98)';
          setTimeout(() => {
            botao.style.transform = originalTransform;
          }, 100);
        }
      }
    },
    
    // Intercepta botão automaticamente PRESERVANDO a funcionalidade original (OTIMIZADO)
    interceptarBotao: function(botaoId, tipoEtiqueta = 'geral', quantidadeCallback = null) {
      const botao = document.getElementById(botaoId);
      if (!botao) return false;
      
      // Verifica se já foi configurado para evitar duplicação
      if (botao.dataset.contadorConfigurado === 'true') return true;
      
      const self = this;
      
      // PRESERVA a funcionalidade original do botão
      const funcaoOriginal = botao.onclick;
      
      // Cria nova função otimizada que executa AMBAS as funcionalidades
      botao.onclick = function(event) {
        // 1. PRIMEIRO: Executa a função original (gera etiquetas)
        let resultadoOriginal = true;
        if (funcaoOriginal) {
          try {
            resultadoOriginal = funcaoOriginal.call(this, event);
          } catch (error) {
            console.error('❌ Erro na função original:', error);
            resultadoOriginal = false;
          }
        }
        
        // 2. DEPOIS: Contabiliza no contador (apenas se a função original funcionou)
        if (resultadoOriginal !== false) {
          // Usa requestAnimationFrame para melhor performance
          requestAnimationFrame(() => {
            // Calcula quantidade se callback fornecido
            let quantidade = 1;
            if (quantidadeCallback && typeof quantidadeCallback === 'function') {
              try {
                quantidade = quantidadeCallback() || 1;
              } catch (error) {
                quantidade = 1;
              }
            }
            
            // Incrementa contador de forma assíncrona
            self.incrementar(quantidade, tipoEtiqueta);
          });
        }
        
        return resultadoOriginal;
      };
      
      // Marca como configurado
      botao.dataset.contadorConfigurado = 'true';
      return true;
    },
    
    // Intercepta botões por texto (fallback) - OTIMIZADO
    interceptarBotoesPorTexto: function(textos, tipoEtiqueta = 'geral') {
      // Otimização: busca mais específica
      const seletor = 'button, input[type="button"], [onclick]';
      const botoes = document.querySelectorAll(seletor);
      let configurados = 0;
      
      // Converte textos para lowercase uma vez só
      const textosLower = textos.map(t => t.toLowerCase());
      
      for (let i = 0; i < botoes.length; i++) {
        const botao = botoes[i];
        const texto = (botao.textContent || botao.value || '').toLowerCase();
        
        // Otimização: usa for loop em vez de some()
        let temTexto = false;
        for (let j = 0; j < textosLower.length; j++) {
          if (texto.includes(textosLower[j])) {
            temTexto = true;
            break;
          }
        }
        
        if (temTexto) {
          // Cria ID único se não tiver
          if (!botao.id) {
            botao.id = `auto-btn-${i}`;
          }
          
          // Intercepta o botão
          if (this.interceptarBotao(botao.id, tipoEtiqueta)) {
            configurados++;
          }
        }
      }
      
      return configurados > 0;
    },
    
    // Configuração automática baseada na página (OTIMIZADA)
    autoConfigurar: function() {
      // Detecta tipo de aplicação pela URL (otimizado)
      const url = window.location.pathname;
      
      // Mapeamento otimizado
      const tiposApp = {
        'placas': () => this.configurarPlacas(),
        'caixa': () => this.configurarCaixa(),
        'avulso': () => this.configurarAvulso(),
        'enderec': () => this.configurarEndereco(),
        'transfer': () => this.configurarTransferencia(),
        'termo': () => this.configurarTermo()
      };
      
      // Busca o tipo de app de forma otimizada
      let configurado = false;
      for (const [tipo, configurar] of Object.entries(tiposApp)) {
        if (url.includes(tipo)) {
          configurar();
          configurado = true;
          break;
        }
      }
      
      // Fallback para configuração genérica
      if (!configurado) {
        this.configurarGenerico();
      }
    },
    
    // Configuração genérica para páginas não reconhecidas (OTIMIZADA)
    configurarGenerico: function() {
      // Usa requestIdleCallback para não bloquear a UI
      const configurar = () => {
        // Tenta encontrar qualquer botão de impressão/geração
        const botoesPossiveis = ['btnPrint', 'btnImprimir', 'imprimir', 'gerar', 'btnGerar'];
        
        for (const botaoId of botoesPossiveis) {
          if (this.interceptarBotao(botaoId, 'geral')) {
            return; // Sai assim que encontrar um
          }
        }
        
        // Fallback: busca por texto
        this.interceptarBotoesPorTexto(['imprimir', 'gerar', 'print'], 'geral');
      };
      
      // Usa requestIdleCallback se disponível, senão setTimeout
      if (window.requestIdleCallback) {
        requestIdleCallback(configurar, { timeout: 2000 });
      } else {
        setTimeout(configurar, 500);
      }
    },
    
    // Debug: lista todos os botões disponíveis na página (OTIMIZADO)
    listarBotoesDisponiveis: function() {
      // Só executa em modo debug
      if (!window.ContadorDebug || !console.groupCollapsed) return;
      
      const botoes = document.querySelectorAll('button, input[type="button"], input[type="submit"], [onclick]');
      
      if (botoes.length === 0) return;
      
      console.groupCollapsed(`🔍 ${botoes.length} botões encontrados`);
      
      // Otimização: usa for loop simples
      for (let i = 0; i < Math.min(botoes.length, 10); i++) {
        const botao = botoes[i];
        const id = botao.id || `sem-id-${i}`;
        const texto = (botao.textContent || botao.value || '').trim().substring(0, 30);
        console.log(`${i + 1}. "${id}" - "${texto}"`);
      }
      
      if (botoes.length > 10) {
        console.log(`... e mais ${botoes.length - 10} botões`);
      }
      
      console.groupEnd();
    },
    
    // Configurações específicas por aplicação (OTIMIZADAS)
    configurarPlacas: function() {
      const configurar = () => {
        if (this.interceptarBotao('btnPrint', 'produto')) return;
        this.interceptarBotoesPorTexto(['imprimir', 'print'], 'produto');
      };
      
      if (document.readyState === 'complete') {
        configurar();
      } else {
        setTimeout(configurar, 300);
      }
    },
    
    configurarCaixa: function() {
      const configurar = () => {
        const quantidadeCallback = () => {
          // Otimização: busca mais específica
          let quantidade = document.querySelectorAll('.caixa-item, .etiqueta-caixa, [data-caixa]').length;
          if (quantidade === 0) {
            quantidade = document.querySelectorAll('.etiqueta, .label, .box-label').length;
          }
          return quantidade || 1;
        };
        
        if (this.interceptarBotao('gerar', 'caixa', quantidadeCallback)) return;
        this.interceptarBotoesPorTexto(['gerar'], 'caixa');
      };
      
      if (document.readyState === 'complete') {
        configurar();
      } else {
        setTimeout(configurar, 300);
      }
    },
    
    configurarAvulso: function() {
      const configurar = () => {
        const quantidadeCallback = () => {
          let quantidade = document.querySelectorAll('.volume-item, .etiqueta-volume, [data-volume]').length;
          if (quantidade === 0) {
            quantidade = document.querySelectorAll('.etiqueta, .label, .volume-label').length;
          }
          return quantidade || 1;
        };
        
        if (this.interceptarBotao('gerar', 'avulso', quantidadeCallback)) return;
        this.interceptarBotoesPorTexto(['gerar'], 'avulso');
      };
      
      setTimeout(configurar, 300);
    },
    
    configurarEndereco: function() {
      const configurar = () => {
        const quantidadeCallback = () => {
          let quantidade = document.querySelectorAll('.endereco-item, .etiqueta-endereco, [data-endereco]').length;
          if (quantidade === 0) {
            quantidade = document.querySelectorAll('.etiqueta, .label, .endereco-label').length;
          }
          return quantidade || 1;
        };
        
        if (this.interceptarBotao('gerar', 'endereco', quantidadeCallback)) return;
        this.interceptarBotoesPorTexto(['gerar'], 'endereco');
      };
      
      setTimeout(configurar, 300);
    },
    
    configurarTransferencia: function() {
      const configurar = () => {
        const quantidadeCallback = () => {
          let quantidade = document.querySelectorAll('.documento, .transferencia-doc, [data-doc]').length || 1;
          
          // Verifica campos de quantidade (otimizado)
          const inputQtd = document.querySelector('#quantidade, [name="quantidade"], .quantidade');
          if (inputQtd && inputQtd.value) {
            const qtdInput = parseInt(inputQtd.value);
            if (qtdInput > 0) quantidade = qtdInput;
          }
          
          return quantidade;
        };
        
        if (this.interceptarBotao('btnGerar', 'transferencia', quantidadeCallback)) return;
        this.interceptarBotoesPorTexto(['gerar'], 'transferencia');
      };
      
      setTimeout(configurar, 300);
    },
    
    configurarTermo: function() {
      const configurar = () => {
        const quantidadeCallback = () => {
          let quantidade = document.querySelectorAll('.termolabil-item, .etiqueta-termo, [data-termo]').length;
          
          if (quantidade === 0) {
            quantidade = document.querySelectorAll('.etiqueta, .label, .termo-label').length;
          }
          
          // Verifica campos de quantidade (otimizado)
          if (quantidade === 0) {
            const inputQtd = document.querySelector('#quantidade, [name="quantidade"], .quantidade');
            if (inputQtd && inputQtd.value) {
              const qtdInput = parseInt(inputQtd.value);
              if (qtdInput > 0) quantidade = qtdInput;
            }
          }
          
          return quantidade || 1;
        };
        
        if (this.interceptarBotao('gerar', 'termolabeis', quantidadeCallback)) return;
        this.interceptarBotoesPorTexto(['gerar'], 'termolabeis');
      };
      
      setTimeout(configurar, 300);
    }
  };
  
  // ===== INICIALIZAÇÃO AUTOMÁTICA =====
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.ContadorIntegration.autoConfigurar();
    });
  } else {
    window.ContadorIntegration.autoConfigurar();
  }
  
  // Expõe funções globais para compatibilidade
  window.incrementarContadorEtiquetas = function(quantidade = 1, tipo = 'geral') {
    return window.ContadorIntegration.incrementar(quantidade, tipo);
  };
  
  console.log('✅ Sistema de integração do contador carregado');
  
  // Expõe para debug global
  window.ContadorDebug = {
    testarSistema: function() {
      console.log('🧪 === TESTE MANUAL DO SISTEMA ===');
      
      const contador = window.ContadorIntegration.obterContadorHub();
      if (contador) {
        console.log('✅ Contador encontrado');
        const total = contador.incrementarContador(1);
        console.log(`📈 Teste de incremento: ${total}`);
        return total;
      } else {
        console.error('❌ Contador não encontrado');
        return null;
      }
    },
    
    listarBotoes: function() {
      window.ContadorIntegration.listarBotoesDisponiveis();
    },
    
    forcarConfiguracao: function() {
      console.log('🔧 Forçando reconfiguração...');
      window.ContadorIntegration.autoConfigurar();
    }
  };
  
})();