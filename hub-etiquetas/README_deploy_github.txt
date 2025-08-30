PASSO A PASSO — Publicar seu HUB no GitHub Pages

1) Crie sua conta e um repositório
   • Acesse https://github.com e crie/entre na sua conta.
   • Clique em “New repository”.
   • Nome sugerido: hub-etiquetas (pode ser outro).
   • Deixe público e com a branch padrão main.

2) Suba seus arquivos (duas formas)
   A. Pelo navegador (mais fácil)
      • Entre no repositório → “Add file” → “Upload files”.
      • Solte a pasta inteira do seu projeto com esta estrutura:
          / (raiz)
            index.html                ← seu HUB (ex.: TOPBAR v3 renomeado para index.html)
            /placas/index.html
            /caixa/index.html
            /avulso/index.html
            /assets/pm.png
            /assets/logo.png
            (demais .js/.css)
      • Inclua também o arquivo vazio “.nojekyll” (está neste pacote).
      • Clique em “Commit changes”.

   B. Com GitHub Desktop (ou Git)
      • GitHub Desktop → “Clone a repository” (ou “Add” → “Create new repository”).
      • Copie todos os arquivos do projeto para a pasta.
      • Commit → Push to origin.

3) Ativar o GitHub Pages
   • No repositório: Settings → Pages.
   • Em “Source”, escolha: “Deploy from a branch”.
   • Selecione a branch “main” e a pasta “/ (root)”. Salve.
   • Aguarde ~1–2 minutos. A página “Pages” mostra o link do seu site:
       https://SEU-USUARIO.github.io/hub-etiquetas/

   Dica: se o repositório se chamar “SEU-USUARIO.github.io”,
         o site sai direto em https://SEU-USUARIO.github.io (sem /hub-etiquetas/).

4) Testar e ajustar caminhos
   • Use SEMPRE caminhos relativos (como já faz): ./placas/index.html, ./assets/pm.png
   • Evite caminhos iniciados com “/” (absolutos), pois em Pages o site fica em /NOME-DO-REPO/.

5) Atualizações
   • Qualquer alteração que você der commit/push (ou upload) é publicada automaticamente.
   • Se quiser desfazer algo, use “Releases”/tags ou reverta commits.

6) 404 personalizada (opcional)
   • Envie o arquivo 404.html (modelo simples incluso neste pacote).

7) Domínio próprio (opcional)
   • Settings → Pages → “Custom domain”: informe o domínio (ex.: hub.seudominio.com.br).
   • No seu provedor de DNS, crie um CNAME apontando para: SEU-USUARIO.github.io
   • No repositório, será criado um arquivo “CNAME” automático (ou crie você com o domínio).
   • Aguarde a propagação (pode levar minutos ou algumas horas).

Boas práticas e observações
   • Inclua o arquivo “.nojekyll” (já incluso) para evitar que o GitHub Pages processe Jekyll
     e ignore pastas com underscore.
   • GitHub Pages é somente estático (sem salvar em arquivo no servidor). Para integrações
     futuras (salvar dados), use APIs externas ou GitHub Actions/Serverless Functions.
   • Evite arquivos individuais maiores que 100 MB (limite do Git normal).
   • Nomes de arquivos e pastas são sensíveis a maiúsculas/minúsculas ao publicar (Linux).

Checklist rápido
   [ ] index.html na raiz abrindo o HUB
   [ ] Caminhos relativos entre as páginas e assets
   [ ] .nojekyll na raiz
   [ ] (Opcional) 404.html na raiz
   [ ] Pages ativado em Settings → Pages → main → /(root)

Pronto. Qualquer dúvida, me chame que eu reviso o repositório e o link publicado.
