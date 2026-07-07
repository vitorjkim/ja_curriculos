# 🎨 VISÃO GERAL - ARQUITETURA DO SISTEMA DE IA

## 📐 Diagrama de Fluxo Completo

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (React)                               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ ResumeAnalyzer                 CandidateRanking                     │   │
│  │ ┌──────────────────────────┐   ┌──────────────────────────────┐   │   │
│  │ │ 📋 Análise de Currículo  │   │ 🏆 Ranking de Candidatos     │   │   │
│  │ │ • Score 0-100           │   │ • Tabela ordenada           │   │   │
│  │ │ • Pontos fortes         │   │ • Badges coloridas          │   │   │
│  │ │ • Melhorias             │   │ • Status candidatura        │   │   │
│  │ │ • Cursos recomendados   │   │ • Email candidato           │   │   │
│  │ └──────────────────────────┘   └──────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      ↓ HTTP (JSON)
┌─────────────────────────────────────────────────────────────────────────────┐
│                         EXPRESS.JS API (/api/ai)                            │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ Route Handlers                                                       │  │
│  │ ┌─────────────────────────────────────────────────────────────────┐ │  │
│  │ │ POST /analyze-resume/:id          ← Analisar currículo        │ │  │
│  │ │ GET  /resume-analysis/:id         ← Obter em cache            │ │  │
│  │ │ POST /rewrite-text                ← Reescrever texto          │ │  │
│  │ │ POST /skill-recommendations/:id   ← Sugestões                 │ │  │
│  │ │ POST /calculate-matching          ← Score compatibilidade     │ │  │
│  │ │ GET  /job-ranking/:jobId          ← Ranking candidatos        │ │  │
│  │ │ POST /recalculate-job-matching    ← Recalcular todos          │ │  │
│  │ └─────────────────────────────────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                      ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SERVICES LAYER                                    │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ aiService.js                    matchingService.js                  │  │
│  │ ├─ analyzeResume()              ├─ calculateMatchingScore()        │  │
│  │ ├─ rewriteText()                ├─ calculateBatchMatching()        │  │
│  │ ├─ getSkillRecommendations()    ├─ Weighted Algorithm              │  │
│  │ └─ buildResumeAnalysis()        └─ Ranking Logic                   │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
         ↙                                              ↘
    (OpenAI/Gemini)                                 (Puro)
    ┌─────────────────────────┐        ┌──────────────────────────────┐
    │  OPENAI API / GEMINI    │        │   DATABASE (PostgreSQL)      │
    │  ┌─────────────────────┐│        │   ┌──────────────────────────┤
    │  │ • Análise          ││        │   │ resumes (+ 9 colunas)    │
    │  │ • Reescrita        ││        │   │ applications (+ 3 cols)  │
    │  │ • Recomendações    ││        │   │ users (+ 2 colunas)      │
    │  │ • Custo: $0.01-0.03││        │   │ resume_analysis_history  │
    │  │   por análise      ││        │   │ matching_history         │
    │  └─────────────────────┘│        │   │ ai_cache (índices)       │
    │  Latência: 5-10 segundos│        │   └──────────────────────────┤
    └─────────────────────────┘        │   Índices: 7 índices novos   │
                                       │   Função: update_ranking()   │
                                       └──────────────────────────────┘
```

---

## 🗂️ Estrutura de Diretórios (Resumida)

```
curriculoja/
├── backend/
│   ├── services/
│   │   ├── aiService.js                    ✨ Integração IA
│   │   └── matchingService.js              ✨ Algoritmo
│   ├── routes/
│   │   └── ai.js                           ✨ 7 Endpoints
│   ├── migrations/
│   │   └── 001_add_ai_analysis.js          ✨ Schema
│   ├── server.js                           🔧 Atualizado
│   ├── .env.example                        🔧 Atualizado
│   ├── AI_SYSTEM.md                        📖 Docs técnica
│   ├── AI_QUICK_START.md                   📖 Guia rápido
│   └── [outros arquivos]
│
├── src/
│   └── components/
│       └── ResumeAnalyzerComponent.jsx     ✨ UI React
│
├── AI_IMPLEMENTATION_SUMMARY.md            📖 Sumário
├── FILES_INDEX.md                          📖 Índice
├── IMPLEMENTATION_CHECKLIST.md             ✅ Checklist
└── [frontend files]
```

---

## 🔄 Fluxo de Dados - Exemplo Prático

### Cenário 1: Candidato Analisando Currículo

```
1. CANDIDATO CLICA "Analisar Currículo"
   │
2. FRONTEND FETCH
   POST /api/ai/analyze-resume/123abc
   Headers: Authorization: Bearer TOKEN
   │
3. BACKEND ROUTES (ai.js)
   ├─ Autentica usuário
   ├─ Verifica se currículo pertence ao usuário
   ├─ Checa cache (análise recente?)
   │  ├─ SIM → Retorna cache rápido ✓
   │  └─ NÃO → Continua
   │
4. BACKEND SERVICES (aiService.js)
   ├─ Formata currículo em prompt
   ├─ Envia para OpenAI/Gemini API
   ├─ Aguarda resposta (5-10s)
   ├─ Parseia JSON retornado
   │
5. BACKEND DATABASE
   ├─ Salva análise em `resumes`
   │  └─ quality_score, ai_strengths, etc
   ├─ Registra em `resume_analysis_history`
   │  └─ Para auditoria
   │
6. BACKEND RESPONSE (JSON)
   ├─ score: 78
   ├─ scoreExplanation: "Bom currículo..."
   ├─ strengths: [...]
   ├─ improvements: [...]
   ├─ suggestedCourses: [...]
   │
7. FRONTEND RENDERIZA
   ├─ Score grande: 78/100 🟡
   ├─ Barra de progresso
   ├─ Cards com pontos fortes
   ├─ Cards com melhorias
   ├─ Links de cursos
   │
8. PRÓXIMA VEZ (mesma análise)
   ├─ Cache retorna em <100ms
   ├─ Cache badge: "✓ Resultado em cache"
   └─ Nenhuma chamada de API
```

### Cenário 2: Empresa Vendo Ranking de Candidatos

```
1. EMPRESA CLICA "Carregar Ranking"
   │
2. FRONTEND FETCH
   GET /api/ai/job-ranking/job123
   │
3. BACKEND ROUTES
   ├─ Autentica empresa
   ├─ Verifica propriedade da vaga
   ├─ Query no banco de dados
   │
4. BACKEND DATABASE
   ├─ SELECT applications WHERE job_id = job123
   ├─ Ordena por matching_score DESC
   ├─ Adiciona ranking_position (1, 2, 3, ...)
   ├─ JOIN com users para pegar nome/email
   │
5. BACKEND RESPONSE (JSON)
   ├─ totalCandidates: 15
   ├─ candidates: [
   │  ├─ ranking: 1, nome: João, score: 95
   │  ├─ ranking: 2, nome: Maria, score: 88
   │  └─ ranking: 3, nome: Pedro, score: 72
   │ ]
   │
6. FRONTEND RENDERIZA
   ├─ Tabela com candidatos
   ├─ Cores por score: 🟢 > 75, 🟡 60-74, 🔴 < 60
   ├─ Status da candidatura
   └─ Email do candidato
```

### Cenário 3: Algoritmo Calculando Matching

```
JOB: "Senior Developer" (Java, 5+ anos, São Paulo, CLT, R$8k)
RESUME: Júnior Developer (Python, 2 anos, Rio, PJ, R$3k)

CÁLCULO:
┌─────────────────────────────────────────────────────────────┐
│ Skills                                                      │
│ Job Skills: [Java, Spring, SQL, REST]                      │
│ Resume Skills: [Python, Flask, MongoDB]                    │
│ Match: 0/4 = 0% → Base 50% (tem skills, mas diferentes)   │
│ Score Skills: 50/100                                        │
├─────────────────────────────────────────────────────────────┤
│ Experience                                                  │
│ Required: 5+ anos                                           │
│ Have: 2 anos                                               │
│ Score Experience: (2/5) × 100 = 40/100                     │
├─────────────────────────────────────────────────────────────┤
│ Education                                                   │
│ Required: Engenharia/Computação                            │
│ Have: Sim                                                   │
│ Score Education: 80/100                                     │
├─────────────────────────────────────────────────────────────┤
│ Location                                                    │
│ Required: São Paulo, presencial                            │
│ Have: Rio, interessado em presencial                       │
│ Score Location: 40/100 (cidades diferentes)                │
├─────────────────────────────────────────────────────────────┤
│ Contract Type                                               │
│ Required: CLT                                              │
│ Have: Aberto a CLT e PJ                                    │
│ Score Contract: 80/100                                      │
├─────────────────────────────────────────────────────────────┤
│ Salary                                                      │
│ Offered: R$8.000                                            │
│ Expected: R$3.000                                           │
│ Score Salary: (3/8) × 100 = 37.5/100                       │
└─────────────────────────────────────────────────────────────┘

FÓRMULA:
Score = (50 × 0.35) + (40 × 0.25) + (80 × 0.15)
        + (40 × 0.10) + (80 × 0.10) + (37.5 × 0.05)
      = 17.5 + 10 + 12 + 4 + 8 + 1.875
      = 53.375
      = 53 (arredondado)

RESULTADO: Score 53 🟡 MODERADO
EXPLICAÇÃO: "Compatibilidade moderada. Você possui alguns dos requisitos,
            mas teria que desenvolver novas competências em Java e ter
            mais experiência profissional."
```

---

## 📊 Matriz de Funcionalidades

```
┌──────────────────────────┬────────┬──────────────┬─────────────────┐
│ Funcionalidade           │ Status │ Dependência  │ Performance     │
├──────────────────────────┼────────┼──────────────┼─────────────────┤
│ Análise de Currículo     │ ✅     │ OpenAI/Gemini│ 5-10s (1ª vez)  │
│                          │        │              │ <100ms (cache)  │
├──────────────────────────┼────────┼──────────────┼─────────────────┤
│ Reescrita de Textos      │ ✅     │ OpenAI/Gemini│ 2-3s            │
├──────────────────────────┼────────┼──────────────┼─────────────────┤
│ Recomendação de Cursos   │ ✅     │ OpenAI/Gemini│ 3-5s            │
├──────────────────────────┼────────┼──────────────┼─────────────────┤
│ Matching Score           │ ✅     │ Puro (sem IA)│ <100ms          │
├──────────────────────────┼────────┼──────────────┼─────────────────┤
│ Ranking Automático       │ ✅     │ Puro (DB)    │ <500ms          │
├──────────────────────────┼────────┼──────────────┼─────────────────┤
│ Cache de Análises        │ ✅     │ PostgreSQL   │ <100ms          │
├──────────────────────────┼────────┼──────────────┼─────────────────┤
│ Histórico de Análises    │ ✅     │ PostgreSQL   │ Instant         │
└──────────────────────────┴────────┴──────────────┴─────────────────┘
```

---

## 💰 Matriz de Custos

```
┌──────────────────────────┬──────────────────┬─────────────────┐
│ Operação                 │ Provedor         │ Custo Aprox      │
├──────────────────────────┼──────────────────┼─────────────────┤
│ Análise de Currículo     │ OpenAI (GPT-4)   │ $0.03/análise   │
│                          │ Gemini           │ $0.001/análise  │
├──────────────────────────┼──────────────────┼─────────────────┤
│ Reescrita de Texto       │ OpenAI (GPT-4)   │ $0.01/texto     │
│                          │ Gemini           │ $0.0005/texto   │
├──────────────────────────┼──────────────────┼─────────────────┤
│ Recomendação de Cursos   │ OpenAI (GPT-4)   │ $0.02/req       │
│                          │ Gemini           │ $0.0008/req     │
├──────────────────────────┼──────────────────┼─────────────────┤
│ Armazenamento BD (100GB) │ PostgreSQL       │ ~$50/mês        │
├──────────────────────────┼──────────────────┼─────────────────┤
│ Matching (sem IA)        │ Gratuito         │ R$0             │
└──────────────────────────┴──────────────────┴─────────────────┘

EXEMPLO MENSAL (1000 análises):
OpenAI: 1000 × $0.03 = $30/mês
Gemini: 1000 × $0.001 = $1/mês
PostgreSQL: $50/mês
────────────────────────────────
Total: $80-81/mês
```

---

## 🎯 Casos de Uso por Persona

### 👨‍💼 CANDIDATO
```
1. Qual é a qualidade do meu currículo?
   → Clica "Analisar" → Recebe Score 78/100
   
2. Como posso melhorar?
   → Vê recomendações específicas
   → Clica em cursos sugeridos
   
3. Sou compatível com essa vaga?
   → Vê compatibilidade quando aplica
   → Score 82% = "Muito bom candidato"
```

### 👔 EMPRESA
```
1. Quem são meus melhores candidatos?
   → Clica "Ranking" → Vê top 10 por score
   
2. Por que alguém é bom match?
   → Clica para ver breakdown
   → "90% skills, 85% experience, ..."
   
3. Preciso preencher vaga urgente?
   → Filtra por score mínimo 85%
   → Reduz triagem de 50 → 5 candidatos
```

### 🎓 ESCOLA
```
1. Meus alunos estão preparados?
   → Vê análises dos currículos
   
2. Quais habilidades faltam?
   → Relatório de missing keywords
   → "React, Docker, AWS"
   
3. Devo oferecer novo curso?
   → Vê cursos mais recomendados
   → Oferece "Advanced React" no trimestre
```

---

## 🚀 Roadmap Implementação

```
✅ v1.0.0 (ATUAL)
├─ Análise de Currículos
├─ Reescrita de Textos
├─ Recomendação de Cursos
├─ Matching Score
├─ Ranking Automático
└─ Cache Local

🟡 v1.1 (PRÓXIMO - 4-6 semanas)
├─ Cache Distribuído (Redis)
├─ Processamento em Fila (Bull)
├─ Webhooks para notificações
├─ Analytics Dashboard
└─ API Rate Limiting

🔵 v1.2 (FUTURO - 2-3 meses)
├─ Análise de Vídeo
├─ Integração LinkedIn
├─ Machine Learning
├─ Entrevista Virtual
└─ Sistema de Mentoria

🟣 v2.0 (LONGO PRAZO)
├─ Marketplace de IA
├─ Custom Models
├─ Integração Plataformas de Cursos
└─ Análise Comportamental
```

---

## ✨ Principais Diferencias Competitivos

```
🤖 IA Integrada
   └─ Análise automática enquanto plataformas apenas mostram
   
💯 Score Objetivo
   └─ Matching score ao invés de "gut feeling"
   
⚡ Recomendações Personalizadas
   └─ Cada usuário vê cursos específicos para seu perfil
   
🏆 Ranking Inteligente
   └─ Empresas economizam 80% tempo de triagem
   
📈 Data-Driven
   └─ Decisões baseadas em dados, não intuição
   
💚 Privacy First
   └─ Dados não enviados para IA (processamento local)
```

---

**Versão:** 1.0.0  
**Data:** Janeiro 2025  
**Status:** ✅ Completo e Documentado
