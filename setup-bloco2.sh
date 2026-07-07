#!/bin/bash
# 
# 🚀 BLOCO 2: SETUP RÁPIDO EM 3 PASSOS
#
# Execute este script (ou siga manualmente) para ativar notificações + LGPD
#

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║      🚀 BLOCO 2: NOTIFICAÇÕES + LGPD - SETUP RÁPIDO           ║"
echo "║                    ~10 minutos de setup                        ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# ─────────────────────────────────────────────────────────────────────
# PASSO 1: Configurar E-mail
# ─────────────────────────────────────────────────────────────────────

echo "📧 PASSO 1: Configurar E-mail"
echo "─────────────────────────────────────────────────────────────────"
echo ""
echo "1. Abra: backend/.env"
echo ""
echo "2. Adicione (ou atualize):"
echo "   EMAIL_SERVICE=gmail"
echo "   EMAIL_USER=seu-email@gmail.com"
echo "   EMAIL_PASSWORD=sua-senha-app-google"
echo "   FRONTEND_URL=http://localhost:5173"
echo ""
echo "3. Para gerar App Password do Google:"
echo "   a) Acesse: https://myaccount.google.com/apppasswords"
echo "   b) Selecione: Mail e Windows Computer"
echo "   c) Copie a senha de 16 caracteres"
echo "   d) Cole em EMAIL_PASSWORD"
echo ""
echo "✅ Pronto? Pressione Enter para continuar..."
read

# ─────────────────────────────────────────────────────────────────────
# PASSO 2: Executar Migração
# ─────────────────────────────────────────────────────────────────────

echo ""
echo "🗄️  PASSO 2: Executar Migração LGPD"
echo "─────────────────────────────────────────────────────────────────"
echo ""
echo "Executando: node backend/migrations/002_add_lgpd_compliance_columns.js"
echo ""

cd backend
node migrations/002_add_lgpd_compliance_columns.js

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migração executada com sucesso!"
else
    echo ""
    echo "❌ Erro ao executar migração"
    exit 1
fi

echo ""
echo "✅ Pronto? Pressione Enter para continuar..."
read

# ─────────────────────────────────────────────────────────────────────
# PASSO 3: Testar
# ─────────────────────────────────────────────────────────────────────

echo ""
echo "🧪 PASSO 3: Testar Sistema"
echo "─────────────────────────────────────────────────────────────────"
echo ""
echo "Reinicie seu servidor backend:"
echo "  npm run dev"
echo ""
echo "Depois, em outro terminal, execute:"
echo "  curl -X POST http://localhost:3001/api/notifications/test \\"
echo "    -H \"Authorization: Bearer SEU_TOKEN\""
echo ""
echo "Se receber um e-mail de teste, tudo funcionando! 🎉"
echo ""

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                    ✅ SETUP COMPLETO!                         ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "📚 Próximos passos:"
echo "   1. Integrar componentes React:"
echo "      - SignupConsentForm em página de cadastro"
echo "      - ConsentSettings em painel de perfil"
echo ""
echo "   2. Ver documentação:"
echo "      - BLOCO_2_RESUME.md"
echo "      - INTEGRATION_EXAMPLES.jsx"
echo ""
echo "   3. Testar com cURL (ver BLOCO_2_NOTIFICACOES_LGPD_README.md)"
echo ""
