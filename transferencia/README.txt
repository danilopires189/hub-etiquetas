# Transferência CD → CD — A4

Projeto pronto para publicar no GitHub Pages.

## Uso
1. Abra `index.html` no navegador.
2. Preencha os campos obrigatórios (origem ≠ destino).
3. Clique **Gerar documento**.
4. Clique **Imprimir** (ou Ctrl/Cmd+P). O layout já está otimizado para A4 paisagem.

> Se **Quantidade de volumes** > 1, o sistema imprime uma página por volume e destaca **VOLUME FRACIONADO**.

## Editar dados dos CDs
Os dados estão em `app.js` no array `DEPOSITOS` (1..9 e 101). Atualize **endereço, CEP e CNPJ** se necessário.

## Publicar no GitHub Pages
- Crie um novo repositório (por ex.: `transfer-cdcd`).
- Faça upload de todos os arquivos desta pasta.
- Em **Settings → Pages**, selecione **Deploy from a branch** e a branch `main` (pasta `/root`).
- Aguarde o link público (`https://<seu-usuario>.github.io/transfer-cdcd`).

Feito com ❤️ por Danilo Pires.
