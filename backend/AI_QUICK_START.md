# 🚀 GUIA RÁPIDO - SISTEMA DE IA CURRÍCULOJÁ

## ✅ O QUE FOI IMPLEMENTADO

### 1. **Serviços de IA** (Backend)
- ✅ `backend/services/aiService.js` - Integração com OpenAI/Gemini
- ✅ `backend/services/matchingService.js` - Algoritmo de matching
- ✅ Suporte a caching automático de análises

### 2. **Rotas de API** (Backend)
- ✅ `POST /api/ai/analyze-resume/:id` - Analisar currículo
- ✅ `GET /api/ai/resume-analysis/:id` - Obter análise em cache
- ✅ `POST /api/ai/rewrite-text` - Reescrever textos
- ✅ `POST /api/ai/skill-recommendations/:id` - Sugestões de habilidades
- ✅ `POST /api/ai/calculate-matching` - Calcular compatibilidade
- ✅ `GET /api/ai/job-ranking/:jobId` - Ranking de candidatos
- ✅ `POST /api/ai/recalculate-job-matching/:jobId` - Recalcular todos

### 3. **Banco de Dados** (PostgreSQL)
- ✅ Colunas em `resumes` para armazenar análises
- ✅ Colunas em `applications` para matching scores
- ✅ Tabela `resume_analysis_history` para auditoria
- ✅ Tabela `matching_history` para tracking
- ✅ Tabela `ai_cache` para evitar requisições duplicadas
- ✅ Índices para performance

### 4. **Documentação**
- ✅ `AI_SYSTEM.md` - Documentação completa
- ✅ `.env.example` - Variáveis de configuração

---

## 🔧 SETUP (5 MINUTOS)

### Passo 1: Configurar Chave de IA

**Opção A: OpenAI (Recomendado)**

```bash
# 1. Acesse https://platform.openai.com/api-keys
# 2. Crie uma nova chave
# 3. Edite .env (backend/.env)

AI_PROVIDER=openai
OPENAI_API_KEY=sk-xxxxxxxxxxxxxx
```

**Opção B: Google Gemini**

```bash
# 1. Acesse https://makersuite.google.com/app/apikey
# 2. Crie uma nova chave
# 3. Edite .env (backend/.env)

AI_PROVIDER=gemini
GEMINI_API_KEY=AIzaSyxxxxxxxxxxxx
```

### Passo 2: Executar Migração

```bash
# Na pasta do projeto
cd backend
node migrations/001_add_ai_analysis.js
```

Você verá:
```
✓ Adding columns to resumes table...
✓ Adding columns to applications table...
✓ Creating resume_analysis_history table...
✓ Creating matching_history table...
✓ Creating ai_cache table...
✓ Creating indexes...
✅ Migration completed successfully!
```

### Passo 3: Reiniciar Backend

```bash
# Terminal 1: Backend
npm run dev
# Output: Server running on port 3001

# Terminal 2: Frontend (se necessário)
npm run dev
# Output: Server running on http://localhost:5173
```

---

## 📱 TESTANDO NO FRONTEND

### Teste 1: Analisar Currículo

Adicione este código em qualquer componente React:

```javascript
import { useState } from 'react';

export function ResumeAnalyzer() {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async (resumeId) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/ai/analyze-resume/${resumeId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      setAnalysis(data);
    } catch (error) {
      console.error('Erro:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Analisando currículo com IA...</div>;

  return (
    <div>
      <button onClick={() => handleAnalyze('seu-resume-id')}>
        Analisar Currículo
      </button>

      {analysis && (
        <div>
          <h2>Score de Qualidade: {analysis.score}/100</h2>
          <p>{analysis.scoreExplanation}</p>
          
          <h3>Pontos Fortes:</h3>
          <ul>
            {analysis.strengths?.map((s, i) => (
              <li key={i}>{s.name}: {s.description}</li>
            ))}
          </ul>

          <h3>Melhorias Sugeridas:</h3>
          <ul>
            {analysis.improvements?.map((imp, i) => (
              <li key={i}>{imp.area}: {imp.suggestion}</li>
            ))}
          </ul>

          <h3>Cursos Recomendados:</h3>
          <ul>
            {analysis.suggestedCourses?.map((course, i) => (
              <li key={i}>{course}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
```

### Teste 2: Reescrever Experiência

```javascript
export function TextRewriter() {
  const [original, setOriginal] = useState('');
  const [rewritten, setRewritten] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRewrite = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/ai/rewrite-text', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: original,
          context: 'experience'
        })
      });

      const data = await response.json();
      setRewritten(data.rewrittenText);
    } catch (error) {
      console.error('Erro:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <textarea 
        value={original}
        onChange={(e) => setOriginal(e.target.value)}
        placeholder="Cole sua experiência profissional aqui"
      />
      
      <button onClick={handleRewrite} disabled={loading}>
        {loading ? 'Reescrevendo...' : 'Reescrever com IA'}
      </button>

      {rewritten && (
        <div>
          <h3>Versão Otimizada:</h3>
          <p>{rewritten}</p>
        </div>
      )}
    </div>
  );
}
```

### Teste 3: Ver Ranking (Para Empresas)

```javascript
export function CandidateRanking({ jobId }) {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleLoadRanking = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/ai/job-ranking/${jobId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();
      setCandidates(data.candidates);
    } catch (error) {
      console.error('Erro:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={handleLoadRanking} disabled={loading}>
        {loading ? 'Carregando...' : 'Carregar Ranking'}
      </button>

      <table>
        <thead>
          <tr>
            <th>Ranking</th>
            <th>Candidato</th>
            <th>Score de Compatibilidade</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {candidates.map((candidate, idx) => (
            <tr key={idx}>
              <td>#{candidate.ranking}</td>
              <td>{candidate.name} ({candidate.email})</td>
              <td>
                <strong>{candidate.matching_score}%</strong>
                {candidate.matching_score >= 90 && '🟢'}
                {candidate.matching_score >= 75 && candidate.matching_score < 90 && '🟡'}
                {candidate.matching_score < 75 && '🔴'}
              </td>
              <td>{candidate.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

---

## 🧪 TESTAR COM cURL

### 1. Analisar Currículo

```bash
# Obter seu token primeiro (login)
TOKEN=$(curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"seu@email.com","password":"sua-senha"}' \
  | jq -r '.token')

# Analisar currículo
curl -X POST http://localhost:3001/api/ai/analyze-resume/seu-resume-uuid \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | jq .
```

### 2. Reescrever Texto

```bash
curl -X POST http://localhost:3001/api/ai/rewrite-text \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Trabalhei com JavaScript",
    "context": "experience"
  }' | jq .
```

### 3. Obter Ranking

```bash
curl -X GET http://localhost:3001/api/ai/job-ranking/seu-job-uuid \
  -H "Authorization: Bearer $TOKEN" | jq .
```

---

## 📊 ESTRUTURA VISUAL NO BANCO

```sql
-- Ver análises salvas
SELECT 
  r.id,
  r.title,
  r.quality_score,
  r.analyzed_at,
  r.ai_strengths,
  r.suggested_courses
FROM resumes r
WHERE quality_score IS NOT NULL
ORDER BY analyzed_at DESC;

-- Ver matching scores
SELECT 
  a.id,
  a.job_id,
  a.matching_score,
  a.ranking_position,
  u.name
FROM applications a
JOIN users u ON a.candidate_id = u.id
WHERE a.matching_score IS NOT NULL
ORDER BY a.matching_score DESC;

-- Ver histórico de análises
SELECT 
  rah.resume_id,
  rah.quality_score,
  rah.created_at,
  rah.ai_provider
FROM resume_analysis_history rah
ORDER BY created_at DESC
LIMIT 10;
```

---

## ⚠️ ERROS COMUNS

### "OPENAI_API_KEY is missing"
```bash
# Solução: Adicionar ao .env
echo "OPENAI_API_KEY=sk-seu-valor" >> backend/.env
```

### "API key invalid"
```bash
# Solução: Verificar chave no OpenAI
# https://platform.openai.com/api-keys
# Deletar chave antiga e criar nova
```

### "Failed to analyze resume"
```bash
# Solução 1: Verificar resumeId
SELECT id FROM resumes WHERE id = 'seu-id' LIMIT 1;

# Solução 2: Revisar logs
tail -50 backend.log | grep analyze

# Solução 3: Testar manualmente
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

---

## 🎯 PRÓXIMOS PASSOS

### 1. Integrar no UI Candidato
- [ ] Adicionar botão "Analisar Currículo" no Dashboard
- [ ] Exibir Score na seção de resumo
- [ ] Mostrar sugestões em cards
- [ ] Link para cursos recomendados

### 2. Integrar no UI Empresa
- [ ] Mostrar Ranking na página de candidatos
- [ ] Filtrar por score mínimo
- [ ] Histórico de ranking por data
- [ ] Exportar ranking em PDF/CSV

### 3. Melhorias de Performance
- [ ] Implementar fila para análise em batch
- [ ] Cache distribuído (Redis)
- [ ] Webhooks para notificações

### 4. Funcionalidades Avançadas
- [ ] Interview feedback scoring
- [ ] Análise de vídeo
- [ ] LinkedIn profile sync
- [ ] Machine Learning predictions

---

## 📞 SUPORTE

### Arquivos Principais
- `backend/services/aiService.js` - Lógica de IA
- `backend/services/matchingService.js` - Matching
- `backend/routes/ai.js` - Endpoints
- `backend/migrations/001_add_ai_analysis.js` - DB Schema
- `backend/AI_SYSTEM.md` - Documentação Completa

### Comandos Úteis
```bash
# Verificar status
curl http://localhost:3001/health | jq .

# Listar todas as análises
curl http://localhost:3001/api/ai/resume-analysis/seu-id \
  -H "Authorization: Bearer $TOKEN"

# Ver histórico
SELECT * FROM resume_analysis_history 
ORDER BY created_at DESC LIMIT 10;
```

---

## ✨ RESUMO

```
✅ Sistema de IA Completo
   ├── Análise de Currículos (Score 0-100)
   ├── Reescrita de Textos
   ├── Recomendações de Habilidades
   ├── Matching Inteligente (Vaga × Candidato)
   ├── Ranking Automático
   └── Histórico e Cache

🔌 Integrado Com:
   ├── OpenAI GPT-4 (ou Gemini)
   ├── PostgreSQL
   ├── Express.js
   └── JWT Authentication

🚀 Pronto Para:
   ├── Candidatos: Otimizar currículos
   ├── Empresas: Encontrar melhores candidatos
   └── Escolas: Orientar alunos
```

---

**Status:** ✅ Implementação Completa  
**Versão:** 1.0.0  
**Data:** Janeiro 2025  
**Tempo de Setup:** ~5 minutos
