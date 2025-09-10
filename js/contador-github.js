// Sistema de Contador Global usando GitHub API
class ContadorGitHub {
  constructor(config) {
    this.owner = config.owner; // seu usuário do GitHub
    this.repo = config.repo;   // nome do repositório
    this.token = config.token; // token do GitHub (opcional)
    this.filePath = 'data/contador.json';
    this.apiUrl = `https://api.github.com/repos/${this.owner}/${this.repo}/contents/${this.filePath}`;
    this.rawUrl = `https://raw.githubusercontent.com/${this.owner}/${this.repo}/main/${this.filePath}`;
  }

  async obterContador() {
    try {
      const response = await fetch(this.rawUrl + '?t=' + Date.now());
      if (response.ok) {
        const dados = await response.json();
        return dados.totalEtiquetas || 19452;
      }
    } catch (error) {
      console.warn('Erro ao obter contador do GitHub:', error);
    }
    return 19452; // valor padrão
  }

  async incrementarContador(quantidade = 1, tipo = 'geral') {
    // Para GitHub Pages, vamos usar uma abordagem híbrida:
    // 1. Incrementa localmente
    // 2. Envia para um webhook/service externo (opcional)
    
    const atual = await this.obterContador();
    const novo = atual + quantidade;
    
    // Salva localmente
    localStorage.setItem('contador-local', novo.toString());
    
    // Log da ação
    console.log(`📈 Contador incrementado: +${quantidade} (Total: ${novo})`);
    
    return novo;
  }
}