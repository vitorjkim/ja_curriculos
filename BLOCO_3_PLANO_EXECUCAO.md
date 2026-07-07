# 🎯 BLOCO 3: PLANO DE EXECUÇÃO
## Gateway de Pagamentos + Validação de Empresas

---

## 📋 ESCOPO CONFIRMADO

### 1. INTEGRAÇÃO DE PAGAMENTO ✅
- [x] Identificar estrutura (subscription_plan, subscription_status já existem)
- [x] Planejar Stripe/Asaas integration
- [ ] Criar `backend/services/paymentService.js` (200-300 linhas)
- [ ] Criar `backend/routes/payments.js` com webhook (250-350 linhas)
- [ ] Criar migration se necessário

### 2. TRAVA DE SEGURANÇA POR PLANO ✅
- [x] Entender padrão de middlewares
- [ ] Criar `backend/middleware/checkSubscriptionPlan.js` (150-200 linhas)
- [ ] Integrar em `backend/routes/jobs.js` (modificação)
- [ ] Integrar em `backend/routes/applications.js` (modificação)
- [ ] Integrar em `backend/routes/ai.js` para IA (modificação)

### 3. MODERAÇÃO DE EMPRESAS ✅
- [x] Confirmar que is_verified existe
- [ ] Criar `backend/routes/admin.js` com moderação (150-200 linhas)
- [ ] Modificar `backend/routes/jobs.js` para validar is_verified
- [ ] Criação de vagas em modo draft se não verificado

### 4. FRONT-END PAGAMENTO E MODERAÇÃO ✅
- [ ] Criar `src/pages/PricingPlans.jsx` (300-400 linhas)
- [ ] Criar `src/components/PaymentCheckout.jsx` (200-250 linhas)
- [ ] Criar `src/pages/AdminCompanyModeration.jsx` (350-400 linhas)

### 5. DOCUMENTAÇÃO E TESTES ✅
- [ ] Guia de setup (config Stripe/Asaas)
- [ ] Exemplos de uso
- [ ] Resumo final de entrega

---

## 🏗️ ESTRUTURA TÉCNICA

### BANCO DE DADOS
Colunas já existentes em `users`:
```sql
subscription_plan    VARCHAR(20) DEFAULT 'free'    -- 'free', 'pro', 'premium'
subscription_status  VARCHAR(20) DEFAULT 'active'  -- 'active', 'past_due', 'canceled'
is_verified          BOOLEAN DEFAULT FALSE         -- Para empresas
```

Novas tabelas necessárias:
```
payments (
  id, user_id, stripe_session_id, plan, amount, 
  status, created_at, metadata
)

subscriptions (
  id, user_id, stripe_subscription_id, plan, 
  status, current_period_start, current_period_end
)
```

### PLANOS E REGRAS

#### 🟢 PLANO GRATUITO (Free)
- Candidatos: Podem se candidatar, criar perfil
- Empresas: Criar 2 vagas gratuitas por mês
- IA: ❌ Sem acesso (precisa upgrade)
- Ranking: ❌ Não vê ranking de candidatos
- Busca Avançada: ❌ Não
- Verificação: ⚠️ Automática (nenhuma)

#### 🔵 PLANO PRO
- Candidatos: Tudo do Free
- Empresas: Vagas ilimitadas
- IA: ❌ Sem acesso (Premium only)
- Ranking: ✅ Vê ranking de candidatos por vaga
- Busca Avançada: ❌ Não (Premium only)
- Verificação: ✅ Requer verificação manual
- Preço: ~R$ 99-149/mês

#### 🟣 PLANO PREMIUM
- Candidatos: Tudo do Free
- Empresas: Vagas ilimitadas
- IA: ✅ Resumir currículos com IA
- Ranking: ✅ Ranking completo
- Busca Avançada: ✅ Buscar no banco de talentos geral
- Verificação: ✅ Requer verificação manual
- Preço: ~R$ 249-299/mês

### MIDDLEWARES

```javascript
// checkSubscriptionPlan.js
checkSubscriptionPlan(requiredPlan)
  ↓ Valida subscription_status === 'active'
  ↓ Valida subscription_plan >= requiredPlan
  ↓ Se empresa, valida is_verified
  ↓ Próximo middleware ou erro 403

// Uso:
router.post('/jobs', 
  authenticateToken, 
  requireCompany, 
  checkSubscriptionPlan('free'),  // Mínimo free
  jobValidation,
  (req, res) => {...}
)
```

### ROTAS DE PAGAMENTO

```
POST /api/payments/checkout
  └─ Cria sessão de checkout Stripe
  └─ Retorna URL e session_id
  └─ Query: plan='pro'|'premium'

POST /api/payments/webhook
  └─ Recebe eventos do Stripe
  └─ Atualiza subscription_plan e subscription_status
  └─ Envia email de confirmação

GET /api/payments/subscription
  └─ Retorna plano atual e data de renovação

GET /api/subscriptions/billing
  └─ Histórico de pagamentos (faturas)
```

### ROTAS ADMIN

```
GET /api/admin/companies/pending
  └─ Lista empresas com is_verified=false

PATCH /api/admin/companies/:id/verify
  └─ Altera is_verified para true/false
  └─ Envia email para empresa

GET /api/admin/companies/:id
  └─ Detalhes da empresa para moderação
```

### FLUXO DE CRIAÇÃO DE VAGA

```
POST /api/jobs
├─ validar subscription_plan
├─ validar subscription_status === 'active'
├─ validar is_verified (se empresa)
│  ├─ true  → publica vaga normalmente
│  └─ false → salva como draft com mensagem
└─ salvar vaga
```

---

## 📂 ARQUIVOS A CRIAR

### Backend (6 arquivos)
```
backend/
├─ services/
│  └─ paymentService.js                      (NEW - 250 linhas)
├─ routes/
│  ├─ payments.js                            (NEW - 300 linhas)
│  └─ admin.js                               (NEW - 200 linhas)
├─ middleware/
│  └─ checkSubscriptionPlan.js               (NEW - 150 linhas)
├─ migrations/
│  └─ 003_add_payments_subscriptions.js      (NEW - 200 linhas)
└─ .env.example                              (MODIFY +20 linhas)
```

### Frontend (2 arquivos)
```
src/
├─ pages/
│  ├─ PricingPlans.jsx                       (NEW - 350 linhas)
│  └─ AdminCompanyModeration.jsx             (NEW - 350 linhas)
└─ components/
   └─ PaymentCheckout.jsx                    (NEW - 200 linhas)
```

### Modificações (4 arquivos)
```
backend/
├─ routes/jobs.js                            (MODIFY +30 linhas)
├─ routes/applications.js                    (MODIFY +20 linhas)
├─ routes/ai.js                              (MODIFY +20 linhas)
├─ server.js                                 (MODIFY +3 linhas)
└─ .env.example                              (MODIFY +20 linhas)
```

### Documentação (5 arquivos)
```
BLOCO_3_PLANO_EXECUCAO.md                    (THIS FILE)
BLOCO_3_SETUP_GUIDE.md                       (Setup e config)
BLOCO_3_REGRAS_PLANOS.md                     (Detalhe regras)
BLOCO_3_RESUMO_FINAL.md                      (Sumário entrega)
BLOCO_3_INTEGRACOES.md                       (Exemplos uso)
```

---

## 🔄 SEQUÊNCIA DE IMPLEMENTAÇÃO

### FASE 1: Backend Infrastructure (4 horas)
1. Criar migration PAYMENTS_SUBSCRIPTIONS
2. Criar paymentService.js
3. Criar payments.js routes
4. Criar admin.js routes
5. Testar com Postman

### FASE 2: Security Layer (1.5 horas)
1. Criar checkSubscriptionPlan middleware
2. Integrar em jobs.js
3. Integrar em applications.js
4. Integrar em ai.js
5. Testar acesso por plano

### FASE 3: Front-end (3 horas)
1. Criar PricingPlans.jsx
2. Criar PaymentCheckout.jsx
3. Criar AdminCompanyModeration.jsx
4. Integrar em rotas
5. Testar fluxo completo

### FASE 4: Documentation (1 hora)
1. Guias de setup
2. Exemplos de uso
3. Resumo final

---

## 🎯 ENTREGÁVEIS FINAIS

✅ Sistema de pagamento 100% integrado
✅ Validação de planos em todas as rotas
✅ Moderação de empresas
✅ Interface de planos
✅ Painel admin de moderação
✅ Documentação completa
✅ Pronto para produção

---

## ⚙️ VARIÁVEIS DE AMBIENTE

```env
# PAYMENT GATEWAY (Stripe OU Asaas)
PAYMENT_PROVIDER=stripe              # 'stripe' ou 'asaas'
STRIPE_SECRET_KEY=sk_test_...        # Stripe secret key
STRIPE_PUBLIC_KEY=pk_test_...        # Stripe public key
STRIPE_WEBHOOK_SECRET=whsec_...      # Webhook secret

# OU Asaas
ASAAS_API_KEY=...                    # Asaas API key
ASAAS_WEBHOOK_SECRET=...             # Asaas webhook secret

# General
PAYMENT_WEBHOOK_URL=https://seu-site.com/api/payments/webhook
PRICING_REDIRECT_URL=https://seu-site.com/pricing
```

---

## 📊 MAPEAMENTO DE REQUISITOS

| Requisito | Arquivo | Status |
|-----------|---------|--------|
| Serviço de pagamento | paymentService.js | ⏳ |
| Webhook Stripe/Asaas | payments.js | ⏳ |
| Atualizar subscription automática | paymentService.js | ⏳ |
| Middleware plano | checkSubscriptionPlan.js | ⏳ |
| Proteger POST /jobs | jobs.js (modify) | ⏳ |
| Proteger GET ranking | jobs.js (modify) | ⏳ |
| Proteger IA | ai.js (modify) | ⏳ |
| Admin verify empresa | admin.js | ⏳ |
| Draft para não verificado | jobs.js (modify) | ⏳ |
| Página planos | PricingPlans.jsx | ⏳ |
| Botão checkout | PaymentCheckout.jsx | ⏳ |
| Painel moderação | AdminCompanyModeration.jsx | ⏳ |

---

## 🎉 RESULTADO ESPERADO

Após implementação completa, o CurrículoJá terá:

✅ **Modelo de negócio implementado** - 3 planos com funcionalidades diferenciadas
✅ **Gateway de pagamento** - Stripe/Asaas integrado
✅ **Validação automática** - Webhooks atualizando status em tempo real
✅ **Segurança por plano** - Middlewares protegendo recursos
✅ **Moderação humana** - Admin verifica empresas antes de publicar
✅ **Interface completa** - Usuários escolhem e pagam planos
✅ **Pronto para monetizar** - Sistema pronto para ir ao ar

---

## ⏱️ CRONOGRAMA ESTIMADO

- **Fase 1 (Backend):** 4-5 horas
- **Fase 2 (Security):** 1.5-2 horas
- **Fase 3 (Frontend):** 2.5-3 horas
- **Fase 4 (Docs):** 1-1.5 horas

**TOTAL:** 9-11.5 horas (pode ser feito em 1-2 dias)

---

## 🚀 COMEÇAR!

Agora que o plano está claro, vou começar a implementação.
Ordem de execução:

1. ✅ Criar migration (PAYMENTS_SUBSCRIPTIONS)
2. ✅ Criar paymentService.js
3. ✅ Criar payments.js routes
4. ✅ Criar admin.js routes
5. ✅ Criar checkSubscriptionPlan middleware
6. ✅ Integrar middleware em rotas
7. ✅ Criar componentes React
8. ✅ Documentação final

**Vamos nessa! 🚀**
