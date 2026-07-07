# ✅ CHECKLIST DE IMPLEMENTAÇÃO - SISTEMA DE IA

## 🎯 OBJETIVO FINAL
Sistema de IA completo pronto para uso em produção com 3 funcionalidades: Análise de Currículos, Reescrita de Textos, Matching Inteligente.

---

## 📋 CHECKLIST PRINCIPAL

### FASE 1: SETUP INICIAL (15 min)

- [ ] **1.1** Obter chave de API
  - [ ] Opção A: OpenAI (https://platform.openai.com/api-keys)
    - Crie account
    - Gere API Key (começa com `sk-`)
    - Copie e guarde com segurança
  - [ ] Opção B: Google Gemini (https://makersuite.google.com/app/apikey)
    - Crie API Key
    - Copie e guarde com segurança

- [ ] **1.2** Configurar variáveis de ambiente
  ```bash
  # Backend/.env (criar se não existir)
  AI_PROVIDER=openai  # ou gemini
  OPENAI_API_KEY=sk-seu-valor-aqui
  # ou
  GEMINI_API_KEY=AIzaSy-seu-valor-aqui
  ```
  - [ ] Confirmar arquivo foi salvo
  - [ ] Não commitar para git (verificar .gitignore)

- [ ] **1.3** Verificar dependências
  ```bash
  cd backend
  npm list axios  # Deve estar instalado
  npm list dotenv  # Deve estar instalado
  ```
  - [ ] Ambos devem estar listados
  - Se não: `npm install axios dotenv`

---

### FASE 2: BANCO DE DADOS (10 min)

- [ ] **2.1** Executar migração
  ```bash
  cd backend
  node migrations/001_add_ai_analysis.js
  ```
  - [ ] Deve retornar `✅ Migration completed successfully!`
  - [ ] Se erro, verificar conexão PostgreSQL

- [ ] **2.2** Verificar schema no banco
  ```sql
  -- Conectar ao banco com psql ou DBeaver
  SELECT column_name FROM information_schema.columns 
  WHERE table_name = 'resumes' AND column_name LIKE 'quality%';
  -- Deve retornar: quality_score, score_explanation, etc
  ```
  - [ ] Todas as colunas devem estar presentes

- [ ] **2.3** Verificar tabelas novas
  ```sql
  SELECT table_name FROM information_schema.tables 
  WHERE table_name IN ('resume_analysis_history', 'matching_history', 'ai_cache');
  -- Deve retornar 3 linhas
  ```
  - [ ] Todas as 3 tabelas devem existir

---

### FASE 3: BACKEND (20 min)

- [ ] **3.1** Verificar que rotas foram registradas
  - [ ] Verificar `backend/server.js` contém:
    ```javascript
    import aiRoutes from './routes/ai.js';
    app.use('/api/ai', aiRoutes);
    ```

- [ ] **3.2** Iniciar servidor backend
  ```bash
  cd backend
  npm run dev
  ```
  - [ ] Deve retornar `Server running on port 3001`
  - [ ] Deve retornar `✅ Database connected`

- [ ] **3.3** Verificar health check
  ```bash
  curl http://localhost:3001/health
  ```
  - [ ] Deve retornar JSON com `"status": "ok"`

- [ ] **3.4** Testando endpoint (sem IA ainda)
  ```bash
  # Obter um token válido primeiro
  curl -X POST http://localhost:3001/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"seu@email.com","password":"senha"}'
  # Copiar o "token" retornado
  
  # Tentar chamar endpoint de IA (vai usar IA real)
  curl -X POST http://localhost:3001/api/ai/analyze-resume/seu-resume-uuid \
    -H "Authorization: Bearer TOKEN_AQUI" \
    -H "Content-Type: application/json"
  ```
  - [ ] Se sucesso: `"success": true, "score": XX`
  - [ ] Se erro de API Key: verificar .env
  - [ ] Se erro 404: verificar UUID do currículo

---

### FASE 4: TESTES (30 min)

- [ ] **4.1** Teste 1: Analisar Currículo
  ```bash
  RESUME_ID="seu-uuid"
  TOKEN="seu-token"
  
  curl -X POST http://localhost:3001/api/ai/analyze-resume/$RESUME_ID \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" | jq .
  ```
  - [ ] Retorna `"score"` entre 0-100
  - [ ] Retorna `"strengths"` array
  - [ ] Retorna `"improvements"` array
  - [ ] Retorna `"suggestedCourses"` array

- [ ] **4.2** Teste 2: Reescrever Texto
  ```bash
  curl -X POST http://localhost:3001/api/ai/rewrite-text \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "text": "Trabalhei com desenvolvimento web",
      "context": "experience"
    }' | jq .
  ```
  - [ ] Retorna `"rewrittenText"` com versão melhorada
  - [ ] Retorna `"tips"` array
  - [ ] Texto está mais profissional

- [ ] **4.3** Teste 3: Recomendação de Habilidades
  ```bash
  curl -X POST http://localhost:3001/api/ai/skill-recommendations/$RESUME_ID \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"jobTitle": "Senior Developer"}' | jq .
  ```
  - [ ] Retorna `"recommendedSkills"` array
  - [ ] Retorna `"courses"` com plataformas
  - [ ] Retorna `"roadmap"` textual

- [ ] **4.4** Teste 4: Calcular Matching
  ```bash
  # Primeiro, criar uma vaga para teste
  # Depois criar uma candidatura
  
  curl -X POST http://localhost:3001/api/ai/calculate-matching \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "applicationId": "seu-application-uuid"
    }' | jq .
  ```
  - [ ] Retorna `"score"` entre 0-100
  - [ ] Retorna `"details"` com breakdown
  - [ ] Retorna `"explanation"` textual

- [ ] **4.5** Teste 5: Ranking de Candidatos
  ```bash
  JOB_ID="seu-job-uuid"
  
  curl -X GET http://localhost:3001/api/ai/job-ranking/$JOB_ID \
    -H "Authorization: Bearer $TOKEN" | jq .
  ```
  - [ ] Retorna `"candidates"` array
  - [ ] Candidatos ordenados por `"ranking_position"`
  - [ ] Cada um tem `"matching_score"`

- [ ] **4.6** Teste 6: Cache
  ```bash
  # Executar análise de currículo novamente
  curl -X POST http://localhost:3001/api/ai/analyze-resume/$RESUME_ID \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" | jq .
  ```
  - [ ] Retorna `"cached": true`
  - [ ] Retorna `"daysSinceAnalysis": 0` (ou poucos)
  - [ ] Resposta vem bem mais rápida (<100ms)

---

### FASE 5: FRONTEND (20 min)

- [ ] **5.1** Copiar componente React
  - [ ] Copiar arquivo `src/components/ResumeAnalyzerComponent.jsx`
  - [ ] Verificar que Recharts está instalado: `npm list recharts`
  - [ ] Verificar que Tailwind CSS está configurado

- [ ] **5.2** Importar em componente existente
  ```jsx
  import { ResumeAnalyzer, CandidateRanking } from '@/components/ResumeAnalyzerComponent';
  
  export function Dashboard() {
    return (
      <div>
        <ResumeAnalyzer resumeId={resumeId} token={token} />
      </div>
    );
  }
  ```
  - [ ] Componente renderiza sem erros
  - [ ] Botão "Analisar Currículo" aparece
  - [ ] CSS está correto (cores, espaçamento)

- [ ] **5.3** Teste clique em "Analisar"
  - [ ] Botão desabilita
  - [ ] Mostra "🔄 Analisando com IA..."
  - [ ] Aguarda 5-10 segundos
  - [ ] Mostra resultado com score grande
  - [ ] Cards com pontos fortes/melhorias aparecem

- [ ] **5.4** Teste componente de ranking
  ```jsx
  <CandidateRanking jobId={jobId} token={companyToken} />
  ```
  - [ ] Tabela aparece após carregar
  - [ ] Candidatos em ordem de ranking
  - [ ] Badges de cores corretas por score
  - [ ] Responsivo em mobile

---

### FASE 6: DOCUMENTAÇÃO (10 min)

- [ ] **6.1** Arquivos de referência criados
  - [ ] `AI_IMPLEMENTATION_SUMMARY.md` - Sumário Executivo
  - [ ] `backend/AI_SYSTEM.md` - Documentação técnica
  - [ ] `backend/AI_QUICK_START.md` - Guia rápido
  - [ ] `FILES_INDEX.md` - Índice de arquivos
  - [ ] Este checklist

- [ ] **6.2** Validar documentação
  - [ ] Abrir cada arquivo
  - [ ] Verificar se está legível
  - [ ] Confirmar que exemplos funcionam

- [ ] **6.3** Preparar para time
  - [ ] Criar documento de onboarding
  - [ ] Preparar demo (screen recording)
  - [ ] Agendar meeting com time

---

### FASE 7: PRODUÇÃO (30 min)

- [ ] **7.1** Segurança
  - [ ] Verificar que API Key NÃO está no GitHub
  - [ ] API Key está apenas em `.env` local
  - [ ] Variável de ambiente configurada no servidor de produção
  - [ ] Usar secrets do Vercel/Railway/Heroku

- [ ] **7.2** Performance
  - [ ] Configurar rate limiting
  - [ ] Monitorar uso de API (custos)
  - [ ] Observar tempo de resposta

- [ ] **7.3** Monitoramento
  - [ ] Configurar alertas de erro
  - [ ] Monitorar quota da API
  - [ ] Logs centralizados

- [ ] **7.4** Deploy
  - [ ] Fazer commit de código (SEM .env)
  - [ ] Push para repositório
  - [ ] Configurar variáveis no servidor de produção
  - [ ] Executar migração em produção
  - [ ] Testar endpoints em produção
  - [ ] Anunciar para usuários

---

## 🔧 TROUBLESHOOTING RÁPIDO

### Erro: "OPENAI_API_KEY is missing"
```bash
# Solução:
echo "OPENAI_API_KEY=sk-seu-valor" >> backend/.env
npm run dev
```

### Erro: "Failed to analyze resume"
```bash
# Verificar 1: Token válido
curl http://localhost:3001/api/auth/me -H "Authorization: Bearer $TOKEN"

# Verificar 2: Resume existe
psql -c "SELECT id FROM resumes WHERE id = 'seu-uuid' LIMIT 1;"

# Verificar 3: Chave API válida
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

### Erro: "Migração falhada"
```bash
# Verificar conexão banco
psql -U postgres -h localhost -d curriculoja -c "SELECT 1;"

# Se falhar, iniciar PostgreSQL
# MacOS: brew services start postgresql
# Linux: sudo systemctl start postgresql
# Windows: Iniciar PostgreSQL via Services
```

### Tabela existe mas análise não salva
```sql
-- Verificar que coluna quality_score existe
\d resumes;  -- em psql
-- Deve listar a coluna quality_score

-- Se não existir, rodar migração novamente
node backend/migrations/001_add_ai_analysis.js
```

---

## 📊 TEMPOS ESTIMADOS

| Fase | Tempo | Crítico |
|------|-------|---------|
| 1. Setup | 15 min | ✅ Sim |
| 2. Banco | 10 min | ✅ Sim |
| 3. Backend | 20 min | ✅ Sim |
| 4. Testes | 30 min | ✅ Sim |
| 5. Frontend | 20 min | 🟡 Parcial |
| 6. Docs | 10 min | 🔵 Opcional |
| 7. Produção | 30 min | ✅ Sim |
| **TOTAL** | **~2h30min** | |

---

## 🎯 PRÓXIMOS PASSOS (APÓS COMPLETO)

- [ ] Treinar time técnico
- [ ] Treinar time de produto
- [ ] Coletar feedback de beta users
- [ ] Otimizar prompts baseado em feedback
- [ ] Considerar fine-tuning de modelo
- [ ] Análise de custos vs revenue
- [ ] Roadmap v1.1 (cache, fila, webhooks)

---

## 📞 QUANDO CHAMAR SUPORTE

Se após seguir este checklist você:
- ❌ Não consegue fazer a migração
- ❌ Endpoints retornam erro 500
- ❌ Componente React não renderiza
- ❌ Score sempre retorna 0

Então verifique:
1. `backend/AI_QUICK_START.md` - Seção "Erros Comuns"
2. `backend/AI_SYSTEM.md` - Seção "Troubleshooting"
3. Logs: `tail -50 backend.log`

---

## ✨ PARABÉNS!

Se você completou até aqui, seu sistema de IA está **100% funcional e pronto para produção**! 🚀

Agora:
1. Integre com segurança em produção
2. Monitore performance
3. Coletar feedback
4. Planejar v1.1

---

**Última Atualização:** Janeiro 2025  
**Versão:** 1.0.0  
**Status:** ✅ Pronto para Começar
