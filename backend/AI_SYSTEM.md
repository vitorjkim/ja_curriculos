# 🤖 SISTEMA DE IA - CURRÍCULOJÁ

## 📋 Visão Geral

Este documento descreve a implementação do sistema modular de Inteligência Artificial para o CurrículoJá, incluindo análise de currículos, reescrita de textos, recomendações de habilidades e algoritmo de matching inteligente.

---

## 🏗️ ARQUITETURA

### Componentes Principais

```
backend/
├── services/
│   ├── aiService.js              # Integração com APIs de IA
│   └── matchingService.js         # Algoritmo de matching e ranking
├── routes/
│   └── ai.js                      # Endpoints de IA
├── migrations/
│   └── 001_add_ai_analysis.js    # Estrutura do banco de dados
└── server.js                      # Registro de rotas
```

### Fluxo de Dados

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT (Frontend)                        │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTP Request
                     ▼
        ┌────────────────────────────┐
        │   API Routes (/api/ai)     │
        │   - POST /analyze-resume   │
        │   - POST /rewrite-text     │
        │   - POST /skill-recomend   │
        │   - POST /calculate-match  │
        │   - GET /job-ranking       │
        └────────┬───────────────────┘
                 │
        ┌────────▼──────────────────┐
        │    Services Layer         │
        │ ┌──────────────────────┐  │
        │ │  aiService.js        │  │ ──► OpenAI/Gemini API
        │ │  - analyzeResume()   │  │
        │ │  - rewriteText()     │  │
        │ │  - getRecommendations│  │
        │ └──────────────────────┘  │
        │                           │
        │ ┌──────────────────────┐  │
        │ │ matchingService.js   │  │
        │ │  - calculateScore()  │  │
        │ │  - calculateBatch()  │  │
        │ └──────────────────────┘  │
        └────────┬──────────────────┘
                 │
        ┌────────▼──────────────────┐
        │   Database (PostgreSQL)   │
        │ ┌──────────────────────┐  │
        │ │ resumes              │  │
        │ │  + quality_score     │  │
        │ │  + ai_suggestions    │  │
        │ │  + analyzed_at       │  │
        │ └──────────────────────┘  │
        │                           │
        │ ┌──────────────────────┐  │
        │ │ applications         │  │
        │ │  + matching_score    │  │
        │ │  + ranking_position  │  │
        │ └──────────────────────┘  │
        │                           │
        │ ┌──────────────────────┐  │
        │ │ resume_analysis_hist │  │
        │ │ matching_history     │  │
        │ │ ai_cache             │  │
        │ └──────────────────────┘  │
        └───────────────────────────┘
```

---

## 📊 ESTRUTURA DO BANCO DE DADOS

### Tabelas Existentes Modificadas

#### `resumes` (Novas Colunas)
```sql
quality_score INTEGER                -- Score 0-100
score_explanation TEXT               -- Explicação do score
ai_strengths JSONB                   -- [{"name": "...", "description": "..."}, ...]
ai_improvements JSONB                -- [{"area": "...", "suggestion": "..."}, ...]
missing_keywords JSONB               -- ["skill1", "skill2", ...]
recommendations JSONB                -- {"formatting": "...", "content": "...", ...}
suggested_courses JSONB              -- ["course1", "course2", ...]
analysis_summary TEXT                -- Resumo textual
analyzed_at TIMESTAMP                -- Data da última análise
```

#### `applications` (Novas Colunas)
```sql
matching_score INTEGER               -- Score 0-100
matching_details JSONB               -- {"skills": 85, "experience": 90, ...}
ranking_position INTEGER             -- Posição no ranking por vaga
```

#### `users` (Novas Colunas)
```sql
ai_analysis_enabled BOOLEAN          -- Usuário habilitou análises de IA
preferred_ai_provider VARCHAR(50)    -- openai | gemini
```

### Tabelas Novas

#### `resume_analysis_history`
```sql
id UUID PRIMARY KEY
resume_id UUID REFERENCES resumes(id)
quality_score INTEGER
score_explanation TEXT
strengths JSONB
improvements JSONB
missing_keywords JSONB
recommendations JSONB
suggested_courses JSONB
analysis_summary TEXT
ai_provider VARCHAR(50)              -- openai | gemini
analysis_time_ms INTEGER             -- Tempo de processamento
created_at TIMESTAMP
```

#### `matching_history`
```sql
id UUID PRIMARY KEY
application_id UUID REFERENCES applications(id)
job_id UUID REFERENCES jobs(id)
candidate_id UUID REFERENCES users(id)
matching_score INTEGER
score_details JSONB                  -- Detalhes do cálculo
ranking_at_time INTEGER              -- Posição naquele momento
created_at TIMESTAMP
```

#### `ai_cache`
```sql
id UUID PRIMARY KEY
cache_key VARCHAR(255) UNIQUE        -- Hash da solicitação
ai_provider VARCHAR(50)
prompt_hash VARCHAR(64)
response JSONB
ttl_hours INTEGER DEFAULT 168        -- Tempo de vida (7 dias)
created_at TIMESTAMP
expires_at TIMESTAMP
```

---

## 🔌 INTEGRAÇÃO COM IA

### Configuração

#### 1. OpenAI (Recomendado para análise)

```bash
# .env
AI_PROVIDER=openai
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxx
```

**Obtenha sua chave:**
1. Acesse https://platform.openai.com/api-keys
2. Crie uma nova chave de API
3. Use o modelo `gpt-4-turbo` para melhor análise

**Modelo:**
- `gpt-4-turbo` - Análise completa e precisa de currículos
- `gpt-3.5-turbo` - Alternativa mais barata (menos preciso)

#### 2. Google Gemini (Alternativa)

```bash
# .env
AI_PROVIDER=gemini
GEMINI_API_KEY=AIzaSyxxxxxxxxxxxxxxxx
```

**Obtenha sua chave:**
1. Acesse https://makersuite.google.com/app/apikey
2. Clique em "Create API Key"
3. Use o modelo `gemini-pro`

---

## 🛣️ ENDPOINTS DE IA

### 1. ANÁLISE DE CURRÍCULOS

#### POST `/api/ai/analyze-resume/:id`

Analisa um currículo completo e retorna score, explicação e sugestões.

**Autenticação:** ✅ Requerida (JWT)

**Parâmetros:**
- `id` (path) - UUID do currículo

**Resposta Sucesso (200):**
```json
{
  "success": true,
  "cached": false,
  "score": 78,
  "scoreExplanation": "Bom currículo com experiência relevante...",
  "strengths": [
    {"name": "Experiência profissional", "description": "..."},
    {"name": "Habilidades técnicas", "description": "..."}
  ],
  "improvements": [
    {"area": "Formatação", "suggestion": "..."},
    {"area": "Palavras-chave", "suggestion": "..."}
  ],
  "missingKeywords": ["React", "TypeScript", "AWS"],
  "recommendations": {
    "formatting": "Use seções mais claras",
    "content": "Adicione resultados quantificáveis",
    "skills": "Destaque habilidades técnicas"
  },
  "suggestedCourses": [
    "React Advanced Patterns",
    "AWS Certification Prep"
  ],
  "summary": "Currículo bem estruturado com boa experiência. Recomenda-se..."
}
```

**Resposta em Cache (200):**
```json
{
  "cached": true,
  "daysSinceAnalysis": 5,
  "score": 78,
  "scoreExplanation": "...",
  ...
}
```

**Erros:**
- `400` - Parâmetro inválido
- `404` - Currículo não encontrado
- `500` - Erro na análise (API indisponível, etc)

**Exemplo cURL:**
```bash
curl -X POST http://localhost:3001/api/ai/analyze-resume/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

#### GET `/api/ai/resume-analysis/:id`

Retorna análise em cache sem reprocessar.

**Resposta:**
```json
{
  "score": 78,
  "scoreExplanation": "...",
  "strengths": [...],
  "improvements": [...],
  "missingKeywords": [...],
  "recommendations": {...},
  "suggestedCourses": [...],
  "summary": "...",
  "analyzedAt": "2024-01-15T10:30:00Z"
}
```

---

### 2. REESCRITA DE TEXTOS

#### POST `/api/ai/rewrite-text`

Reescreve uma seção de experiência, educação ou resumo profissional.

**Autenticação:** ✅ Requerida

**Body:**
```json
{
  "text": "Trabalhei com desenvolvimento web usando Java e Spring",
  "context": "experience"
}
```

**Contextos aceitos:**
- `experience` - Experiência profissional
- `education` - Educação/formação
- `summary` - Resumo profissional

**Resposta (200):**
```json
{
  "success": true,
  "original": "Trabalhei com desenvolvimento web usando Java e Spring",
  "rewrittenText": "Desenvolvi aplicações web de alta performance utilizando Java e Spring Framework, implementando padrões de design e otimizações de banco de dados.",
  "tips": [
    "Use verbos de ação mais fortes",
    "Quantifique resultados quando possível",
    "Destaque tecnologias específicas"
  ]
}
```

**Exemplo cURL:**
```bash
curl -X POST http://localhost:3001/api/ai/rewrite-text \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Trabalhei com web development",
    "context": "experience"
  }'
```

---

### 3. RECOMENDAÇÕES DE HABILIDADES

#### POST `/api/ai/skill-recommendations/:id`

Recomenda habilidades e cursos para uma posição específica.

**Autenticação:** ✅ Requerida

**Parâmetros:**
- `id` (path) - UUID do currículo

**Body:**
```json
{
  "jobTitle": "Senior Full Stack Developer",
  "skills": ["JavaScript", "React"]  // Opcional - sobrescreve skills do currículo
}
```

**Resposta (200):**
```json
{
  "success": true,
  "jobTitle": "Senior Full Stack Developer",
  "currentSkills": ["JavaScript", "React"],
  "recommendations": {
    "recommendedSkills": [
      "TypeScript",
      "Node.js",
      "Docker",
      "AWS",
      "PostgreSQL"
    ],
    "courses": [
      {
        "name": "Advanced TypeScript",
        "platform": "Udemy",
        "duration": "8 hours"
      },
      {
        "name": "Docker for Developers",
        "platform": "Frontend Masters",
        "duration": "4 hours"
      }
    ],
    "resources": [
      "https://www.typescriptlang.org/docs/",
      "https://docs.docker.com/"
    ],
    "roadmap": "1. Domine TypeScript (2 semanas)\n2. Aprenda Docker (1 semana)..."
  }
}
```

---

### 4. CÁLCULO DE MATCHING

#### POST `/api/ai/calculate-matching`

Calcula score de compatibilidade entre candidato e vaga.

**Autenticação:** ✅ Requerida

**Body (Opção 1 - Por Application):**
```json
{
  "applicationId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Body (Opção 2 - Direto):**
```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440001",
  "resumeId": "550e8400-e29b-41d4-a716-446655440002"
}
```

**Resposta (200):**
```json
{
  "success": true,
  "score": 82,
  "details": {
    "skills": 90,
    "experience": 85,
    "education": 75,
    "location": 100,
    "contractType": 80,
    "salary": 70
  },
  "explanation": "Muito boa compatibilidade (82%)! Você atende aos requisitos principais...",
  "breakdownPercentages": {
    "skills": 90,
    "experience": 85,
    "education": 75,
    "location": 100,
    "contractType": 80,
    "salary": 70
  }
}
```

**Escores Parciais:**

| Categoria | Descrição | Peso |
|-----------|-----------|------|
| skills | Alinhamento de habilidades técnicas | 35% |
| experience | Anos de experiência relevante | 25% |
| education | Formação acadêmica | 15% |
| location | Localização/tipo de trabalho | 10% |
| contractType | Tipo de contrato (CLT, PJ, etc) | 10% |
| salary | Expectativa salarial vs oferta | 5% |

**Classificação de Score:**

| Score | Classificação | Significado |
|-------|----------------|------------|
| 90-100 | 🟢 Excelente | Praticamente todas as habilidades e experiência |
| 75-89 | 🟢 Muito Bom | Atende aos requisitos principais |
| 60-74 | 🟡 Bom | Tem várias habilidades relevantes |
| 45-59 | 🟡 Moderado | Possui alguns requisitos, precisa desenvolver |
| 30-44 | 🔴 Baixo | Requer novas competências |
| 0-29 | 🔴 Muito Baixo | Perfil muito diferente |

---

#### GET `/api/ai/job-ranking/:jobId`

Retorna ranking de candidatos para uma vaga.

**Autenticação:** ✅ Requerida (Company or Admin)

**Parâmetros:**
- `jobId` (path) - UUID da vaga

**Resposta (200):**
```json
{
  "success": true,
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "totalCandidates": 15,
  "candidates": [
    {
      "ranking": 1,
      "id": "app-1",
      "candidate_id": "user-1",
      "resume_id": "resume-1",
      "status": "interview",
      "matching_score": 95,
      "matching_details": {...},
      "ranking_position": 1,
      "name": "João Silva",
      "email": "joao@example.com",
      "resume_title": "Desenvolvedor Full Stack"
    },
    {
      "ranking": 2,
      "id": "app-2",
      "candidate_id": "user-2",
      "resume_id": "resume-2",
      "status": "pending",
      "matching_score": 88,
      "matching_details": {...},
      "ranking_position": 2,
      "name": "Maria Santos",
      "email": "maria@example.com",
      "resume_title": "Senior Backend Developer"
    }
  ]
}
```

---

#### POST `/api/ai/recalculate-job-matching/:jobId`

Recalcula matching para TODAS as candidaturas de uma vaga.

**Autenticação:** ✅ Requerida (Company or Admin only)

**Parâmetros:**
- `jobId` (path) - UUID da vaga

**Caso de Uso:**
- Você editou a descrição/requisitos da vaga
- Quer atualizar o ranking de candidatos

**Resposta (200):**
```json
{
  "success": true,
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "updatedCount": 15,
  "message": "Recalculated matching scores for 15 applications"
}
```

---

## 💻 IMPLEMENTAÇÃO NO FRONTEND

### Exemplo 1: Analisar Currículo

```javascript
// Chamar análise de IA
const handleAnalyzeResume = async (resumeId) => {
  try {
    const response = await fetch(`/api/ai/analyze-resume/${resumeId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    
    setAnalysis({
      score: data.score,
      scoreExplanation: data.scoreExplanation,
      strengths: data.strengths,
      improvements: data.improvements,
      missingKeywords: data.missingKeywords,
      recommendations: data.recommendations,
      suggestedCourses: data.suggestedCourses
    });
  } catch (error) {
    console.error('Erro ao analisar currículo:', error);
  }
};
```

### Exemplo 2: Reescrever Experiência

```javascript
const handleRewriteExperience = async (text) => {
  try {
    const response = await fetch('/api/ai/rewrite-text', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: text,
        context: 'experience'
      })
    });

    const data = await response.json();
    setRewrittenText(data.rewrittenText);
    setTips(data.tips);
  } catch (error) {
    console.error('Erro ao reescrever:', error);
  }
};
```

### Exemplo 3: Ver Ranking de Candidatos

```javascript
const handleViewRanking = async (jobId) => {
  try {
    const response = await fetch(`/api/ai/job-ranking/${jobId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();
    
    // Exibir candidatos ordenados por score
    setCandidates(data.candidates);
  } catch (error) {
    console.error('Erro ao carregar ranking:', error);
  }
};
```

---

## 🚀 INSTALAÇÃO E SETUP

### 1. Instalar Dependências

```bash
cd backend
npm install
```

(Axios já está no package.json)

### 2. Configurar Variáveis de Ambiente

```bash
cp .env.example .env
```

Edite `.env`:
```env
AI_PROVIDER=openai
OPENAI_API_KEY=sk-your-key-here
```

### 3. Executar Migração

```bash
# Opção 1: Automática (na startup do servidor)
npm run dev

# Opção 2: Manual
node backend/migrations/001_add_ai_analysis.js
```

### 4. Verificar no Banco

```sql
-- Verificar novas colunas
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'resumes' AND column_name LIKE 'quality%';

-- Verificar novas tabelas
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name IN 
('resume_analysis_history', 'matching_history', 'ai_cache');
```

---

## 🧪 TESTES

### Teste 1: Analisar Currículo

```bash
# 1. Obter um resumeId (do seu banco de dados)
RESUME_ID="550e8400-e29b-41d4-a716-446655440000"

# 2. Fazer requisição
curl -X POST http://localhost:3001/api/ai/analyze-resume/$RESUME_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### Teste 2: Reescrever Texto

```bash
curl -X POST http://localhost:3001/api/ai/rewrite-text \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Trabalhei com desenvolvimento",
    "context": "experience"
  }'
```

### Teste 3: Ver Ranking (Company)

```bash
JOB_ID="550e8400-e29b-41d4-a716-446655440001"

curl -X GET http://localhost:3001/api/ai/job-ranking/$JOB_ID \
  -H "Authorization: Bearer COMPANY_JWT_TOKEN"
```

---

## ⚙️ ALGORITMO DE MATCHING

### Fórmula

```
Score Final = (Skills × 0.35) + (Experience × 0.25) + (Education × 0.15) 
              + (Location × 0.10) + (Contract × 0.10) + (Salary × 0.05)
```

### Exemplos de Cálculo

**Exemplo 1: Candidato Perfeito**
- Skills: 95 × 0.35 = 33.25
- Experience: 90 × 0.25 = 22.5
- Education: 85 × 0.15 = 12.75
- Location: 100 × 0.10 = 10
- Contract: 80 × 0.10 = 8
- Salary: 75 × 0.05 = 3.75
- **Total: 90.25 → Score: 90 🟢**

**Exemplo 2: Candidato Parcial**
- Skills: 70 × 0.35 = 24.5
- Experience: 60 × 0.25 = 15
- Education: 65 × 0.15 = 9.75
- Location: 50 × 0.10 = 5
- Contract: 60 × 0.10 = 6
- Salary: 80 × 0.05 = 4
- **Total: 64.25 → Score: 64 🟡**

---

## 🔒 SEGURANÇA

### Validações

- ✅ Autenticação JWT requerida em todos endpoints
- ✅ Validação de propriedade (usuário só acessa seus dados)
- ✅ Rate limiting recomendado (evitar abuso de API)
- ✅ Sanitização de prompts antes de enviar para IA

### Privacidade

- ✅ Dados do currículo nunca são salvos nas APIs OpenAI/Gemini
- ✅ Análises são cacheadas localmente no PostgreSQL
- ✅ Histórico é mantido para auditoria

---

## 📈 PERFORMANCE

### Caching

Análises recentes (menos de 30 dias) são retornadas do cache automaticamente:

```javascript
// Primeira chamada: processa com IA (5-10s)
POST /api/ai/analyze-resume/123
→ { "cached": false, "score": 78, ... }

// Segunda chamada (hoje): retorna cache (< 100ms)
POST /api/ai/analyze-resume/123
→ { "cached": true, "daysSinceAnalysis": 0, "score": 78, ... }
```

### Otimizações

- ✅ Tabela `ai_cache` com índices para lookup rápido
- ✅ Batch processing para análise em massa
- ✅ Índices em `quality_score` e `matching_score` para ordenação
- ✅ Função PostgreSQL para atualizar ranking (evita múltiplas queries)

---

## 🐛 TROUBLESHOOTING

### Erro: "API key inválida"

```bash
# Verificar variáveis de ambiente
echo $OPENAI_API_KEY
# Deve retornar sua chave (sk-...)

# Se vazio, adicionar ao .env
OPENAI_API_KEY=sk-sua-chave-aqui
```

### Erro: "Failed to analyze resume"

```bash
# 1. Verificar se resumeId é válido
SELECT id FROM resumes WHERE id = 'seu-id' LIMIT 1;

# 2. Verificar conexão com OpenAI/Gemini
# Testar manualmente a chamada à API

# 3. Verificar logs do backend
tail -f backend.log | grep "analyze"
```

### Score sempre 50%

Geralmente significa:
- Dados incompletos no currículo
- Habilidades não estruturadas
- Ou falha silenciosa na IA

Solução: Enviar dados mais estruturados

---

## 📚 REFERÊNCIAS

- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Google Gemini API](https://ai.google.dev/)
- [PostgreSQL JSON](https://www.postgresql.org/docs/current/datatype-json.html)
- [Express Validator](https://express-validator.github.io/docs/)

---

## 🗺️ ROADMAP FUTURO

- [ ] Integração com LinkedIn para verificação de habilidades
- [ ] Análise de vídeo de entrevista
- [ ] Recomendação de mentor baseada em matching
- [ ] Integração com plataformas de cursos (Coursera, Udemy)
- [ ] Machine Learning para melhorar algoritmo de matching
- [ ] Dashboard analytics para empresas

---

**Versão:** 1.0.0  
**Data:** Janeiro 2025  
**Status:** ✅ Pronto para Produção
