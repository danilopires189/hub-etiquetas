// Configuração do Sistema de Contador
window.ContadorConfig = {
  // Configurações do GitHub
  github: {
    usuario: 'SEU_USUARIO_GITHUB',     // Substitua pelo seu usuário
    repositorio: 'SEU_REPOSITORIO',    // Substitua pelo nome do repo
    branch: 'main'                     // ou 'master' se for o caso
  },
  
  // Webhook para sincronização (opcional)
  webhook: {
    url: '', // URL do Zapier, IFTTT ou serviço próprio
    ativo: false
  },
  
  // Configurações gerais
  valorInicial: 19452,
  intervaloSync: 30000, // 30 segundos
  
  // URLs geradas automaticamente
  get githubRawUrl() {
    return `https://raw.githubusercontent.com/${this.github.usuario}/${this.github.repositorio}/${this.github.branch}/data/contador.json`;
  }
};

// Instruções de configuração
console.log(`
🔧 CONFIGURAÇÃO DO CONTADOR GLOBAL

Para ativar a sincronização com GitHub:

1. Edite o arquivo config/contador-config.js
2. Substitua 'SEU_USUARIO_GITHUB' pelo seu usuário
3. Substitua 'SEU_REPOSITORIO' pelo nome do repositório
4. Faça commit do arquivo data/contador.json

Exemplo:
github: {
  usuario: 'joaosilva',
  repositorio: 'hub-etiquetas',
  branch: 'main'
}

O contador funcionará localmente mesmo sem configuração!
`);