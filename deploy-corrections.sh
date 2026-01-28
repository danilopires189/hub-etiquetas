#!/bin/bash

echo "🚀 Iniciando deploy das correções para GitHub..."
echo

echo "📋 Verificando status do repositório..."
git status
echo

echo "➕ Adicionando arquivos ao git..."
git add .
echo

echo "📝 Fazendo commit..."
git commit -m "🔧 Correção crítica: Resolver overflow do contador e fluxo de impressão

- Corrigido overflow do contador (2.147.483.717 → 135.000)
- Resolvido conflito de múltiplas instâncias do contador
- Separado fluxo de impressão do Supabase (impressão imediata)
- Adicionado sistema robusto de tratamento de erros
- Implementado limpeza automática do localStorage
- Criado sistema de testes e monitoramento

Fixes: Módulo etiqueta-mercadoria não abria impressão
Closes: Problema de overflow do contador global"
echo

echo "🚀 Enviando para GitHub..."
git push origin main
echo

if [ $? -eq 0 ]; then
    echo "✅ Deploy realizado com sucesso!"
    echo
    echo "🌐 Seu site será atualizado em: https://danilopires189.github.io/hub-etiquetas"
    echo
    echo "⚠️  IMPORTANTE: Não esqueça de executar o SQL no Supabase!"
    echo "📄 Arquivo: supabase/fix-critical-errors.sql"
    echo
else
    echo "❌ Erro no deploy. Verifique as mensagens acima."
    echo
fi

echo "🔍 Para testar as correções:"
echo "1. Acesse o módulo etiqueta-mercadoria"
echo "2. Abra o console (F12)"
echo "3. Execute: testCorrections()"
echo

read -p "Pressione Enter para continuar..."