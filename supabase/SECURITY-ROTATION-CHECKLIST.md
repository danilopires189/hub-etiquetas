# Rotação de Chaves (Supabase)

Este projeto removeu segredos fixos do frontend. Para concluir a proteção, execute a rotação no painel do Supabase.

## 1) Service Role Key
1. Acesse `Project Settings > API`.
2. Rotacione a `service_role` key.
3. Não coloque essa chave no frontend.
4. Use apenas em backend seguro (ou variável temporária para scripts de setup).

## 2) Anon Key
1. Ainda em `Project Settings > API`, rotacione a `anon` key.
2. Atualize `supabase/config.js` com a nova `anonKey`.
3. Publique/redeploy da aplicação.

## 3) Usuário admin antigo
1. Acesse `Authentication > Users`.
2. Troque senha do usuário admin antigo ou remova-o.
3. Se necessário, configure novas credenciais via runtime:
   - `window.__HUB_ADMIN_EMAIL`
   - `window.__HUB_ADMIN_PASSWORD`

## 4) Validação rápida
1. Abra módulos principais (fraldas / etiqueta mercadoria).
2. Faça uma coleta e confirme gravação no Supabase.
3. Gere impressão e confirme atualização de status.
4. Confirme que `/admin/login.html` e `/admin/dashboard.html` estão desabilitados.
