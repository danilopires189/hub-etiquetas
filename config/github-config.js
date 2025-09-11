// Configuração do GitHub para Contador Centralizado
class GitHubConfig {
  constructor() {
    // Configurações do repositório - DETECTAR AUTOMATICAMENTE NO GITHUB PAGES
    if (window.location.hostname.endsWith('.github.io')) {
      // Auto-detectar no GitHub Pages
      const hostname = window.location.hostname;
      this.owner = hostname.split('.')[0];
      const pathParts = window.location.pathname.split('/').filter(p => p);
      this.repo = pathParts[0] || `${this.owner}.github.io`;
    } else {
      // Configuração manual para desenvolvimento local
      this.owner = 'SEU_USUARIO_GITHUB'; // Substitua pelo seu usuário
      this.repo = 'SEU_REPOSITORIO';     // Substitua pelo nome do repositório
    }
    
    this.branch = 'main';              // Branch principal
    this.dataPath = 'data/contador.json'; // Caminho do arquivo de dados
    
    // Token de acesso (será configurado via variável de ambiente ou prompt)
    this.token = this.getToken();
    
    // URLs da API
    this.apiBase = 'https://api.github.com';
    this.contentsUrl = `${this.apiBase}/repos/${this.owner}/${this.repo}/contents/${this.dataPath}`;
    this.commitsUrl = `${this.apiBase}/repos/${this.owner}/${this.repo}/commits`;
  }
  
  getToken() {
    // Prioridade: 1. Variável de ambiente, 2. localStorage, 3. Prompt
    return process?.env?.GITHUB_TOKEN || 
           localStorage.getItem('github_token') || 
           this.promptForToken();
  }
  
  promptForToken() {
    const token = prompt(`
Para usar o contador centralizado, você precisa de um GitHub Personal Access Token.

Como criar:
1. Vá em GitHub.com → Settings → Developer settings → Personal access tokens
2. Clique em "Generate new token (classic)"
3. Dê um nome como "Contador Etiquetas"
4. Selecione as permissões: "repo" (Full control of private repositories)
5. Clique em "Generate token"
6. Copie o token gerado

Cole seu token aqui:`);
    
    if (token) {
      localStorage.setItem('github_token', token);
      return token;
    }
    
    throw new Error('Token do GitHub é obrigatório para usar o contador centralizado');
  }
  
  // Validar se a configuração está correta
  validate() {
    if (!this.owner || this.owner === 'SEU_USUARIO_GITHUB') {
      throw new Error('Configure o nome do usuário GitHub em config/github-config.js');
    }
    
    if (!this.repo || this.repo === 'SEU_REPOSITORIO') {
      throw new Error('Configure o nome do repositório em config/github-config.js');
    }
    
    if (!this.token) {
      throw new Error('Token do GitHub não configurado');
    }
    
    return true;
  }
  
  // Headers padrão para requisições
  getHeaders() {
    return {
      'Authorization': `token ${this.token}`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'ContadorEtiquetas/2.0',
      'Content-Type': 'application/json'
    };
  }
}

// Exportar instância global
window.GitHubConfig = GitHubConfig;