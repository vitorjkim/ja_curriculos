# ⚡ BLOCO 3: SETUP RÁPIDO - STRIPE INTEGRATION

## ⏱️ Tempo Total: ~15 minutos

---

## 📋 PREREQUISITOS

- Conta Stripe (stripe.com)
- Node.js backend rodando
- Frontend rodando (localhost:5173)
- Acesso a backend/.env

---

## 🚀 PASSO 1: CRIAR CONTA STRIPE (2 min)

1. Acesse **https://dashboard.stripe.com**
2. Clique "Sign up" ou faça login
3. Complete o onboarding (preencha empresa, país, etc)
4. Confirme email

✅ Sua conta Stripe está ativa!

---

## 🔑 PASSO 2: OBTER API KEYS (3 min)

1. No dashboard Stripe, vá para **Developers** > **API keys**
2. Você verá duas chaves (use as de teste primeiro):
   - **Publishable Key** (começa com `pk_test_`)
   - **Secret Key** (começa com `sk_test_`)

3. Copie a **Secret Key** (nunca compartilhe!)
4. Copie também a **Publishable Key**

✅ Você tem as API keys!

---

## 📦 PASSO 3: CRIAR PRODUTOS E PREÇOS (5 min)

No Stripe Dashboard, vá para **Products** > **Add product**

### Produto 1: PRO

1. **Name:** `CurrículoJá Pro`
2. **Description:** `Vagas ilimitadas, visualização de ranking`
3. **Pricing Model:** Standard pricing
4. **Price:** `99.00` (BRL)
5. **Billing period:** Monthly
6. Clique **Save product**

7. Na página do produto, copie:
   - **Product ID** (começa com `prod_`)
   - **Price ID** (começa com `price_`)

### Produto 2: PREMIUM

1. **Name:** `CurrículoJá Premium`
2. **Description:** `Tudo do Pro + IA avançada + Busca no banco de talentos`
3. **Pricing Model:** Standard pricing
4. **Price:** `299.00` (BRL)
5. **Billing period:** Monthly
6. Clique **Save product**

7. Copie:
   - **Product ID**
   - **Price ID**

✅ Você tem os Products e Prices!

---

## 🪝 PASSO 4: CONFIGURAR WEBHOOK (3 min)

1. No Stripe Dashboard, vá para **Developers** > **Webhooks**
2. Clique **Add endpoint**
3. Em **Endpoint URL**, coloque:
   ```
   http://localhost:3001/api/payments/webhook
   ```
   (Para produção, use seu domínio)

4. Em **Events to send**, selecione:
   ```
   ✓ checkout.session.completed
   ✓ invoice.paid
   ✓ invoice.payment_failed
   ✓ customer.subscription.deleted
   ```

5. Clique **Add endpoint**
6. Na página do webhook, copie o **Signing secret** (começa com `whsec_`)

✅ Webhook configurado!

---

## 📝 PASSO 5: ATUALIZAR .env (2 min)

Abra `backend/.env` e preencha:

```env
# PAYMENT GATEWAY
PAYMENT_PROVIDER=stripe

# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_XXXXXXXXXXXX  # Da API keys
STRIPE_PUBLIC_KEY=pk_test_XXXXXXXXXXXX  # Da API keys
STRIPE_WEBHOOK_SECRET=whsec_XXXXXXXXXXXX  # Do webhook

# Stripe Products
STRIPE_PRO_PRODUCT_ID=prod_XXXXXXXXXXXX  # Do produto Pro
STRIPE_PRO_PRICE_ID=price_XXXXXXXXXXXX  # Do preço Pro
STRIPE_PREMIUM_PRODUCT_ID=prod_XXXXXXXXXXXX  # Do produto Premium
STRIPE_PREMIUM_PRICE_ID=price_XXXXXXXXXXXX  # Do preço Premium

# URLs
FRONTEND_URL=http://localhost:5173
PAYMENT_WEBHOOK_URL=http://localhost:3001/api/payments/webhook
PRICING_REDIRECT_URL=http://localhost:5173/pricing
```

✅ .env atualizado!

---

## 🗄️ PASSO 6: EXECUTAR MIGRAÇÃO (2 min)

```bash
cd backend
node migrations/003_add_payments_subscriptions.js
```

Esperado output:
```
✅ Migration PAYMENTS & SUBSCRIPTIONS COMPLETE
```

✅ Banco de dados pronto!

---

## 🔧 PASSO 7: REINICIAR SERVIDOR

```bash
# Pare o servidor atual (Ctrl+C)
# Reinicie:
npm run dev
```

Você deve ver todas as rotas registradas:
```
[OK] GET /api/payments/plans
[OK] POST /api/payments/checkout
[OK] POST /api/payments/webhook
[OK] GET /api/payments/subscription
[OK] POST /api/payments/cancel
[OK] GET /api/admin/companies/pending
[OK] PATCH /api/admin/companies/:id/verify
```

✅ Servidor pronto!

---

## 🧪 PASSO 8: TESTAR ENDPOINTS

### Teste 1: Buscar Planos
```bash
curl http://localhost:3001/api/payments/plans
```

Esperado: Lista com free, pro, premium

### Teste 2: Criar Checkout (com usuário autenticado)

Primeiro, faça login e copie o token do localStorage:

```bash
curl -X POST http://localhost:3001/api/payments/checkout \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -H "Content-Type: application/json" \
  -d '{"plan":"pro"}'
```

Esperado: Retorna `checkoutUrl` com link do Stripe

---

## 🌐 PASSO 9: INTEGRAR NO FRONT-END

### Adicionar Rota de Preços

Em seu router (ex: `src/router.jsx` ou `src/App.jsx`):

```javascript
import PricingPlans from './pages/PricingPlans';

// Adicionar rota:
{
  path: '/pricing',
  element: <PricingPlans token={userToken} />
}
```

### Adicionar Link para Preços

Em algum lugar do seu nav ou header:

```javascript
<Link to="/pricing" className="btn btn-primary">
  Ver Planos
</Link>
```

### Adicionar Admin Moderation

Em seu admin dashboard:

```javascript
import AdminCompanyModeration from './pages/AdminCompanyModeration';

// Adicionar rota (admin only):
{
  path: '/admin/companies',
  element: <AdminCompanyModeration token={userToken} />
}
```

---

## 💳 TESTE DE PAGAMENTO COM CARTÃO TESTE

Stripe fornece cartões de teste. Quando pedir seu cartão:

### Pagamento Bem-Sucedido
```
Cartão: 4242 4242 4242 4242
Expira: Qualquer mês/ano futuro
CVC: Qualquer 3 dígitos
```

### Pagamento com Autenticação
```
Cartão: 4000 0025 0000 3155
(vai pedir 2FA)
```

### Pagamento Declinado
```
Cartão: 4000 0000 0000 0002
(vai falhar propositalmente)
```

---

## ✅ CHECKLIST FINAL

- [ ] Conta Stripe criada
- [ ] API keys copiadas
- [ ] Produtos (Pro, Premium) criados no Stripe
- [ ] Webhook configurado
- [ ] .env atualizado com todas as variáveis
- [ ] Migração executada: `node migrations/003_add_payments_subscriptions.js`
- [ ] Servidor reiniciado
- [ ] Endpoint `/api/payments/plans` retorna lista
- [ ] Endpoint `/api/payments/checkout` funciona (com autenticação)
- [ ] Rota `/pricing` aparece no frontend
- [ ] Rota `/admin/companies` acessível para admins
- [ ] Checkout Stripe abre quando clica em "Escolher Plano"
- [ ] Pagamento de teste (cartão 4242...) é processado

✅ Tudo configurado!

---

## 🐛 TROUBLESHOOTING

### Erro: "Stripe API key not found"
- Verificar se `STRIPE_SECRET_KEY` está em .env
- Reiniciar servidor

### Erro: "Webhook signature verification failed"
- Verificar se `STRIPE_WEBHOOK_SECRET` está correto
- Estar em test mode (sk_test_...)

### Checkout não abre
- Verificar se `STRIPE_PRO_PRICE_ID` é válido
- Verificar console do navegador para erros
- Verificar logs do servidor

### Pagamento processado mas usuário não atualizado
- Verificar se webhook está recebendo eventos (Stripe Dashboard > Events)
- Verificar logs do servidor para erros no webhook
- Tentar reprocessar webhook manualmente no Stripe Dashboard

### is_verified ainda false após aprovação
- Admin needs to explicitly approve company
- User precisa estar autenticado
- Verificar se é realmente admin (role === 'admin')

---

## 📞 SUPORTE STRIPE

- Documentação: https://stripe.com/docs
- Dashboard API logs: https://dashboard.stripe.com/logs
- Webhook tester: https://dashboard.stripe.com/webhooks
- Chat suporte 24/7 no dashboard

---

## 🎉 PRÓXIMAS AÇÕES

1. ✅ Testar pagamentos com cartão de teste
2. ✅ Testar moderação de empresas
3. ✅ Validar que middlewares estão bloqueando rotas corretamente
4. ✅ Testar downgrade para free após cancelamento
5. 📝 Documentar processo para usuários finais
6. 🚀 Deploy para produção (alterar para sk_live_...)

---

**Status:** Pronto para pagamentos! 💰
