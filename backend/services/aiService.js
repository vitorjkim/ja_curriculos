/**
 * AI Service - Integração com Google Gemini (via REST API direta)
 *
 * Responsável por:
 * - Chamar Google Gemini para análise de currículos
 * - Forçar resposta estruturada em JSON
 * - Fazer parse e validação de respostas
 * - Tratamento de erros e fallbacks
 */
import OpenAI from 'openai';

// O cliente OpenAI será inicializado sob demanda dentro das funções que o utilizam.
// Isso evita que o servidor quebre na inicialização se a chave não estiver definida.
let openai;

/**
 * Catálogo de cursos curados por categoria (evita que a IA "invente" URLs de cursos).
 * A IA apenas escolhe a categoria mais adequada para cada sugestão de melhoria.
 */
const COURSE_CATALOG = {
  language: {
    name: 'Inglês para Negócios — Coursera',
    url: 'https://www.coursera.org/learn/business-english',
    color: '#2563eb',
    colorLight: '#dbeafe'
  },
  design: {
    name: 'UX/UI Design Completo — Udemy',
    url: 'https://www.udemy.com/course/ux-ui-design/',
    color: '#d97706',
    colorLight: '#fed7aa'
  },
  office: {
    name: 'Microsoft Office do Zero — Alura',
    url: 'https://www.alura.com.br/curso-online-office',
    color: '#6b7a90',
    colorLight: '#e2e8f0'
  },
  technical: {
    name: 'Programação e Lógica — Alura',
    url: 'https://www.alura.com.br/cursos-online-programacao',
    color: '#7c3aed',
    colorLight: '#ede9fe'
  },
  certification: {
    name: 'Certificações Profissionais — Coursera',
    url: 'https://www.coursera.org/certificates',
    color: '#059669',
    colorLight: '#d1fae5'
  },
  'soft-skill': {
    name: 'Comunicação e Soft Skills — Alura',
    url: 'https://www.alura.com.br/cursos-online-comportamental',
    color: '#db2777',
    colorLight: '#fce7f3'
  },
  other: {
    name: 'Cursos Recomendados — Alura',
    url: 'https://www.alura.com.br/',
    color: '#4f46e5',
    colorLight: '#e0e7ff'
  }
};

/**
 * Esquema JSON esperado da análise de currículo
 * Define a estrutura que a IA deve retornar
 */
const RESUME_ANALYSIS_SCHEMA = {
  type: "object",
  properties: {
    score: { type: "number", description: "Pontuação geral de 0 a 100" },
    scores: {
      type: "object",
      properties: {
        completude: { type: "number", description: "Pontuação de 0 a 100 para a completude do currículo" },
        qualidade: { type: "number", description: "Pontuação de 0 a 100 para a qualidade da escrita e formatação" },
        relevancia: { type: "number", description: "Pontuação de 0 a 100 para a relevância das informações para o mercado" },
        impacto: { type: "number", description: "Pontuação de 0 a 100 para a demonstração de resultados e impacto" },
        geral: { type: "number", description: "Uma avaliação holística da força do currículo de 0 a 100" }
      },
      required: ["completude", "qualidade", "relevancia", "impacto", "geral"]
    },
    suggestions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["CRITICAL", "IMPORTANT", "RECOMMENDED"] },
          message: { type: "string" }
        },
        required: ["type", "message"]
      }
    }
  },
  required: ["score", "scores", "suggestions"]
};

/**
 * Formata dados do currículo para análise pela IA
 * @param {Object} resume - Objeto do currículo
 * @returns {String} - Texto formatado para análise
 */
export function formatResumeForAnalysis(resume) {
  const sections = [];

  // Informações Pessoais
  if (resume.personal_info && typeof resume.personal_info === 'object') {
    sections.push(`👤 INFORMAÇÕES PESSOAIS`);
    const info = resume.personal_info;
    if (info.full_name) sections.push(`Nome: ${info.full_name}`);
    if (info.email) sections.push(`Email: ${info.email}`);
    if (info.phone) sections.push(`Telefone: ${info.phone}`);
    if (info.birth_date) sections.push(`Data de Nascimento: ${info.birth_date}`);
    if (info.location) sections.push(`Localização: ${info.location}`);
    if (info.city) sections.push(`Cidade: ${info.city}`);
    if (info.bio) sections.push(`Bio: ${info.bio}`);
    sections.push('');
  }

  // Contato (legacy)
  if (resume.contact_email || resume.phone) {
    sections.push(`📧 CONTATO`);
    if (resume.contact_email) sections.push(`Email: ${resume.contact_email}`);
    if (resume.phone) sections.push(`Telefone: ${resume.phone}`);
    sections.push('');
  }

  // Resumo Profissional
  if (resume.professional_summary) {
    sections.push(`📝 RESUMO PROFISSIONAL`);
    sections.push(resume.professional_summary);
    sections.push('');
  }

  // Experiência
  if (resume.experiences && Array.isArray(resume.experiences) && resume.experiences.length > 0) {
    sections.push(`💼 EXPERIÊNCIA`);
    resume.experiences.forEach((exp, idx) => {
      sections.push(`${idx + 1}. ${exp.job_title || 'Sem título'} - ${exp.company_name || 'Sem empresa'}`);
      if (exp.start_date || exp.end_date) {
        sections.push(`   Período: ${exp.start_date || ''} a ${exp.end_date || 'Presente'}`);
      }
      if (exp.description) {
        sections.push(`   ${exp.description}`);
      }
      sections.push('');
    });
  }

  // Educação
  if (resume.education && Array.isArray(resume.education) && resume.education.length > 0) {
    sections.push(`🎓 EDUCAÇÃO`);
    resume.education.forEach((edu, idx) => {
      sections.push(`${idx + 1}. ${edu.degree || 'Sem grau'} - ${edu.school || 'Sem escola'}`);
      if (edu.field_of_study) sections.push(`   Campo: ${edu.field_of_study}`);
      if (edu.graduation_date) sections.push(`   Formado: ${edu.graduation_date}`);
      sections.push('');
    });
  }

  // Skills
  if (resume.skills && Array.isArray(resume.skills) && resume.skills.length > 0) {
    sections.push(`🎯 SKILLS`);
    sections.push(resume.skills.map(s => `• ${s.skill_name || s}`).join('\n'));
    sections.push('');
  }

  // Certificações
  if (resume.certifications && Array.isArray(resume.certifications) && resume.certifications.length > 0) {
    sections.push(`🏆 CERTIFICAÇÕES`);
    resume.certifications.forEach((cert, idx) => {
      sections.push(`${idx + 1}. ${cert.certification_name || 'Sem nome'}`);
      if (cert.issued_date) sections.push(`   Emitida em: ${cert.issued_date}`);
    });
    sections.push('');
  }

  // Cursos (se existirem)
  if (resume.courses && Array.isArray(resume.courses) && resume.courses.length > 0) {
    sections.push(`📚 CURSOS`);
    resume.courses.forEach((course, idx) => {
      sections.push(`${idx + 1}. ${course.course_name || course.name || 'Sem nome'}`);
      if (course.platform) sections.push(`   Plataforma: ${course.platform}`);
      if (course.completion_date) sections.push(`   Concluído em: ${course.completion_date}`);
    });
    sections.push('');
  }

  // Idiomas (se existirem)
  if (resume.languages && Array.isArray(resume.languages) && resume.languages.length > 0) {
    sections.push(`🌍 IDIOMAS`);
    resume.languages.forEach((lang, idx) => {
      sections.push(`${idx + 1}. ${lang.language || lang.name || 'Sem nome'} - ${lang.level || 'Sem nível'}`);
    });
    sections.push('');
  }

  return sections.join('\n');
}

/**
 * Extrai e faz parse de um JSON de uma resposta de IA (remove markdown, etc.)
 */
function parseAIJsonContent(content) {
  let cleanContent = content
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  if (cleanContent.startsWith('"') && cleanContent.endsWith('"')) {
    try {
      const unwrapped = JSON.parse(cleanContent);
      if (typeof unwrapped === 'string') cleanContent = unwrapped.trim();
    } catch (e) {
      // mantém o texto original
    }
  }

  try {
    return JSON.parse(cleanContent);
  } catch (parseError) {
    const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw parseError;
  }
}

/**
 * Tenta analisar o currículo usando OpenAI (GPT-4o-mini)
 */
async function tryOpenAIAnalyze(prompt) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY não configurada');
  }
  if (!openai) {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.1,
    max_tokens: 2048,
    seed: 12345,
    response_format: { type: 'json_object' },
    messages: [{ role: 'user', content: prompt }],
  });

  const content = response.choices?.[0]?.message?.content;
  if (!content) throw new Error('Resposta vazia do OpenAI');

  console.log(`📊 Tamanho da resposta OpenAI: ${content.length} caracteres`);
  const analysis = parseAIJsonContent(content);

  if (
    analysis.score === undefined ||
    typeof analysis.score !== 'number' ||
    analysis.score < 0 ||
    analysis.score > 100
  ) {
    console.warn('⚠️ Score inválido retornado pela IA, ajustando...');
    analysis.score = Math.min(100, Math.max(0, parseInt(analysis.score) || 50));
  }

  console.log(`✅ Análise concluída com OpenAI: Score ${analysis.score}/100`);
  return analysis;
}

/**
 * Tenta analisar o currículo usando Google Gemini (fallback)
 */
async function tryGeminiAnalyze(prompt) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY não configurada');
  }

  const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=' + process.env.GEMINI_API_KEY;
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.1, maxOutputTokens: 20000 },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini REST API error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  const content = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!content) throw new Error('Resposta vazia do Gemini');

  console.log(`📊 Tamanho da resposta Gemini: ${content.length} caracteres`);
  const analysis = parseAIJsonContent(content);

  if (
    analysis.score === undefined ||
    typeof analysis.score !== 'number' ||
    analysis.score < 0 ||
    analysis.score > 100
  ) {
    console.warn('⚠️ Score inválido retornado pela IA, ajustando...');
    analysis.score = Math.min(100, Math.max(0, parseInt(analysis.score) || 50));
  }

  console.log(`✅ Análise concluída com Gemini: Score ${analysis.score}/100`);
  return analysis;
}

/**
 * Analisa um currículo usando IA (OpenAI GPT-4o-mini como principal, Gemini como fallback)
 * @param {Object} resume - Objeto do currículo
 * @returns {Promise<Object>} - Análise estruturada em JSON
 * @throws {Error} - Se houver erro na API ou validação
 */
export async function analyzeResume(resume) {
  // Formatar currículo para análise
  const resumeText = formatResumeForAnalysis(resume);

  if (!resumeText || resumeText.trim().length < 50) {
    throw new Error('Currículo insuficiente para análise (mínimo 50 caracteres)');
  }

  const prompt = `Você é um especialista em recrutamento e currículos. Sua tarefa é analisar o currículo em português a seguir e fornecer uma análise estruturada em JSON.

IMPORTANTE: Você DEVE responder APENAS com um JSON válido, seguindo exatamente este esquema:

${JSON.stringify(RESUME_ANALYSIS_SCHEMA, null, 2)}

CRITÉRIOS OBJETIVOS E CONSISTENTES:

**completude** (0-100): Baseado em seções presentes
- Contato completo (nome, email, telefone) = 20 pontos
- Pelo menos 1 experiência profissional = 25 pontos
- Pelo menos 1 formação/educação = 25 pontos
- Pelo menos 3 habilidades/skills = 15 pontos
- Bio/resumo profissional presente = 15 pontos

**qualidade** (0-100): Clareza da escrita
- Sem erros de português graves = 40 pontos
- Descrições claras e objetivas = 30 pontos
- Formatação consistente = 30 pontos

**relevancia** (0-100): Alinhamento com mercado
- Palavras-chave de mercado presentes = 40 pontos
- Tecnologias/ferramentas atuais = 30 pontos
- Áreas de atuação definidas = 30 pontos

**impacto** (0-100): Demonstração de resultados
- Usa números/métricas em experiências = 40 pontos
- Descreve resultados concretos = 35 pontos
- Mostra evolução/conquistas = 25 pontos

**geral** (0-100): Média ponderada de todos os critérios acima

**score** (0-100): DEVE SER a média aritmética simples de (completude + qualidade + relevancia + impacto + geral) / 5

Para sugestões:
- CRITICAL: Erros graves ou seções faltando (completude < 40)
- IMPORTANT: Melhorias de alto impacto (scores entre 40-70)
- RECOMMENDED: Ajustes finos (scores > 70)

REGRA IMPORTANTE: Seja consistente. Se analisar o mesmo currículo novamente, DEVE retornar exatamente os mesmos scores.

Analise este currículo e retorne apenas o JSON:\n\n${resumeText}`;

  console.log(`🤖 Analisando currículo ID: ${resume.id} com OpenAI (GPT-4o-mini)...`);

  try {
    return await tryOpenAIAnalyze(prompt);
  } catch (openaiError) {
    const isQuotaError = openaiError.message.includes('429') || openaiError.message.includes('quota') || openaiError.message.includes('RESOURCE_EXHAUSTED');
    console.warn(`⚠️ OpenAI falhou${isQuotaError ? ' (quota)' : ''}: ${openaiError.message.substring(0, 150)}`);

    if (process.env.GEMINI_API_KEY) {
      console.log('🔄 Tentando fallback com Gemini...');
      try {
        return await tryGeminiAnalyze(prompt);
      } catch (geminiError) {
        console.error('❌ Gemini também falhou:', geminiError.message.substring(0, 150));
        throw new Error(`Ambas as APIs falharam. OpenAI: ${openaiError.message.substring(0, 80)}. Gemini: ${geminiError.message.substring(0, 80)}`);
      }
    }

    throw new Error(`Erro na API do OpenAI: ${openaiError.message}`);
  }
}

/**
 * Calcula o Match Score entre um currículo e uma vaga de emprego
 * @param {String} resumeText - Texto formatado do currículo
 * @param {String} jobDescription - Descrição completa da vaga
 * @returns {Promise<Object>} - { matchScore, jobDifficulty, candidateLevel, reasons, gapAnalysis }
 */
export async function calculateJobMatch(resumeText, jobDescription) {
  if (!process.env.OPENAI_API_KEY && !process.env.GEMINI_API_KEY) {
    throw new Error('Nenhuma API de IA configurada (OPENAI_API_KEY ou GEMINI_API_KEY)');
  }

  if (!resumeText || resumeText.trim().length < 20) {
    throw new Error('Currículo insuficiente para análise');
  }

  if (!jobDescription || jobDescription.trim().length < 20) {
    throw new Error('Descrição da vaga insuficiente para análise');
  }

  const prompt = `Você é um especialista em recrutamento. Analise a compatibilidade entre o CURRÍCULO e a VAGA abaixo e responda APENAS com JSON válido, sem markdown.

=== CURRÍCULO ===
${resumeText}

=== VAGA ===
${jobDescription}

Retorne SOMENTE este JSON (sem texto antes ou depois):
{
  "matchScore": <número 0-100 representando % de compatibilidade>,
  "jobDifficulty": <número 1-10 representando dificuldade da vaga>,
  "candidateLevel": <número 1-10 representando nível do candidato>,
  "strengths": [
    { "keyword": "<palavra-chave curta, 1-3 palavras, ex: 'Tecnologia Frontend'>", "text": "<explicação completa e específica do porquê esse ponto aproxima o candidato da vaga>" }
  ],
  "gaps": [
    { "keyword": "<palavra-chave curta, 1-3 palavras, ex: 'Idioma'>", "text": "<explicação completa e específica do que falta e por quê é um gap real>" }
  ],
  "improvementSuggestions": [
    { "label": "<nome curto e específico da habilidade/curso que o candidato deveria desenvolver, ex: 'Inglês intermediário', ex: 'Figma e prototipação'>", "gain": <número 1-25 estimando quanto pontos percentuais o score subiria se o candidato adquirisse essa habilidade>, "category": "<uma destas categorias exatas: language, design, office, technical, certification, soft-skill, other>" }
  ]
}

REGRAS PARA "improvementSuggestions" (plano de ação para o candidato melhorar seu match com ESSA vaga específica):
- Baseie-se DIRETAMENTE nos "gaps" reais identificados. Cada sugestão deve resolver um gap concreto encontrado na análise.
- NÃO retorne uma quantidade fixa. Se houver apenas 1 gap relevante, retorne 1 sugestão. Se houver 5, pode retornar até 5. Se o candidato já é compatível (matchScore alto, sem gaps relevantes), retorne array VAZIO.
- Cada "label" deve ser específico e acionável (ex: "Inglês intermediário", "Excel avançado", "Liderança de equipe"), nunca genérico como "Melhorar currículo".
- O "gain" deve ser proporcional à importância do gap: gaps críticos (impedem a vaga) ganham mais pontos (15-25), gaps menores (nice-to-have) ganham menos (1-10). A soma de todos os gains não deve ultrapassar (100 - matchScore).
- Escolha a "category" mais adequada dentre as opções fixas listadas. Use "other" apenas se nenhuma categoria específica se aplicar.

REGRAS PARA "strengths" (pontos que aproximam o candidato da vaga):
- A "keyword" é APENAS um rótulo curto (ex: "Senioridade", "Tecnologia Frontend"). NUNCA repita a keyword dentro do "text".
- O "text" deve ser uma frase completa, específica e informativa, nunca uma repetição da keyword. Ex: keyword "Senioridade" + text "É júnior (nível 3) enquanto a vaga pede pleno (nível 5) — 2 degraus de diferença, distância moderada."
- A quantidade de itens deve refletir a realidade: se o candidato tem poucos ou nenhum ponto de aproximação real com a vaga (ex: matchScore muito baixo, próximo de 0), retorne um array VAZIO ou com só 1 item. NÃO force 3 itens quando não existem pontos positivos genuínos.
- Se o matchScore for alto (acima de 70), pode haver 3 a 5 pontos fortes.
- NUNCA invente pontos positivos genéricos ou vagos só para preencher a lista.

REGRAS PARA "gaps" (incompatibilidades reais, não "coisas que podem melhorar"):
- A "keyword" é um rótulo curto do gap (ex: "Idioma", "Localização", "Design UX/UI"). NUNCA repita a keyword dentro do "text".
- O "text" deve explicar concretamente a incompatibilidade, com contexto da vaga e do candidato. Ex: keyword "Idioma" + text "A vaga exige inglês intermediário, mas o currículo indica apenas francês — idioma incompatível com o requisito."
- Liste TODOS os gaps reais e relevantes encontrados — não se limite a um número fixo. Pode ser 1, pode ser 5, depende da vaga e do currículo.
- Se não houver gaps reais (candidato perfeitamente compatível), retorne array vazio.

CRITÉRIOS RIGOROSOS E OBJETIVOS:

**jobDifficulty** (nível da vaga - baseado apenas nos requisitos da vaga):
- 1-2: Estágio/Trainee - sem experiência exigida, apenas formação básica
- 3-4: Júnior - 0-2 anos de experiência
- 5-6: Pleno - 2-5 anos de experiência + responsabilidades médias
- 7-8: Sênior - 5+ anos + liderança técnica
- 9-10: Especialista/Lead - 8+ anos + decisões estratégicas

**candidateLevel** (nível do candidato - baseado apenas no currículo):
REGRA: Conte ANOS TOTAIS de experiência profissional documentada no currículo.
- 0 anos = nível 1
- 0-1 ano = nível 2
- 1-2 anos = nível 3
- 2-3 anos = nível 4
- 3-5 anos = nível 5
- 5-7 anos = nível 6
- 7-10 anos = nível 7
- 10-15 anos = nível 8
- 15+ anos = nível 9-10

IMPORTANTE: Seja consistente. Se o currículo não mudou, o candidateLevel deve ser EXATAMENTE o mesmo sempre.

**matchScore** (compatibilidade 0-100):
- 60% peso: skills mencionadas na vaga que aparecem no currículo
- 40% peso: compatibilidade de senioridade (jobDifficulty vs candidateLevel)
  * Se candidateLevel >= jobDifficulty: senioridade 100%
  * Se candidateLevel = jobDifficulty - 1: senioridade 80%
  * Se candidateLevel = jobDifficulty - 2: senioridade 60%
  * Se candidateLevel < jobDifficulty - 2: senioridade 30%`;


  // Tenta OpenAI primeiro
  let openaiError = null;
  try {
    const result = await tryOpenAIMatch(prompt);
    return result;
  } catch (error) {
    const isQuotaError = error.message.includes('429') || error.message.includes('quota') || error.message.includes('RESOURCE_EXHAUSTED');
    openaiError = error;
    console.warn(`⚠️ OpenAI falhou${isQuotaError ? ' (quota)' : ''}: ${error.message.substring(0, 100)}`);

    // Se falhar, tenta Gemini como fallback (se configurado)
    if (process.env.GEMINI_API_KEY) {
      console.log('🔄 Tentando fallback com Gemini...');
      try {
        const result = await tryGeminiMatch(prompt);
        console.log('✅ Gemini funcionou como fallback');
        return result;
      } catch (geminiError) {
        console.error('❌ Gemini também falhou:', geminiError.message.substring(0, 100));
        throw new Error(`Ambas as APIs falharam. OpenAI: ${openaiError.message.substring(0, 50)}. Gemini: ${geminiError.message.substring(0, 50)}`);
      }
    }
    throw openaiError;
  }
}

/**
 * Tenta calcular match com Gemini
 */
async function tryGeminiMatch(prompt) {
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=' + process.env.GEMINI_API_KEY;

  // Retry com backoff exponencial para erros transitórios (503/429)
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt++) {
    if (attempt > 1) {
      const delay = attempt === 2 ? 3000 : 7000;
      console.log(`🔄 Gemini retry ${attempt}/3 após ${delay}ms...`);
      await new Promise(r => setTimeout(r, delay));
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.0, maxOutputTokens: 8192 },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      const status = response.status;
      if ((status === 503 || status === 429) && attempt < 3) {
        lastError = new Error(`Gemini API error ${status}: ${errText}`);
        continue; // retry
      }
      throw new Error(`Gemini API error ${status}: ${errText}`);
    }

    const data = await response.json();
    const candidate = data?.candidates?.[0];
    const finishReason = candidate?.finishReason;
    const content = candidate?.content?.parts?.[0]?.text;

    console.log(`📊 Gemini - finishReason: ${finishReason}, tamanho: ${content?.length || 0} chars`);

    if (!content) throw new Error(`Resposta vazia do Gemini (finishReason: ${finishReason})`);

    // Limpa markdown se houver
    let clean = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

    // Extrai apenas o primeiro objeto JSON completo e válido (não greedy no final)
    const jsonStart = clean.indexOf('{');
    let jsonEnd = -1;
    if (jsonStart !== -1) {
      let depth = 0;
      for (let i = jsonStart; i < clean.length; i++) {
        if (clean[i] === '{') depth++;
        else if (clean[i] === '}') {
          depth--;
          if (depth === 0) { jsonEnd = i; break; }
        }
      }
    }

    if (jsonStart !== -1 && jsonEnd !== -1) {
      clean = clean.substring(jsonStart, jsonEnd + 1);
    }

    let result;
    try {
      result = JSON.parse(clean);
    } catch (parseError) {
      console.error('❌ Gemini JSON parse error:', parseError.message);
      throw new Error(`Erro ao parsear resposta do Gemini: ${parseError.message}`);
    }

    // Garante faixas válidas
    result.matchScore = Math.min(100, Math.max(0, Math.round(result.matchScore || 0)));
    result.jobDifficulty = Math.min(10, Math.max(1, Math.round(result.jobDifficulty || 5)));
    result.candidateLevel = Math.min(10, Math.max(1, Math.round(result.candidateLevel || 5)));
    result.strengths = normalizeKeywordList(result.strengths);
    result.gaps = normalizeKeywordList(result.gaps);
    result.improvementSuggestions = normalizeImprovementSuggestions(result.improvementSuggestions);
    // Compatibilidade retroativa com formato antigo (reasons/gapAnalysis como strings)
    result.reasons = result.strengths.map(s => s.text);
    result.gapAnalysis = result.gaps.map(g => g.text);

    console.log(`✅ Job Match Score (Gemini): ${result.matchScore}% (vaga dif=${result.jobDifficulty} candidato=${result.candidateLevel})`);
    return result;
  }
  throw lastError || new Error('Gemini: Falha após 3 tentativas');
}

/**
 * Normaliza lista de pontos (strengths/gaps) garantindo formato { keyword, text }
 */
function normalizeKeywordList(list) {
  if (!Array.isArray(list)) return [];
  return list
    .filter(item => item && (typeof item === 'object' ? item.text : typeof item === 'string'))
    .map(item => {
      if (typeof item === 'string') {
        // Formato antigo (string simples) - usa como texto e keyword genérica
        return { keyword: item.split(' ').slice(0, 3).join(' '), text: item };
      }
      return { keyword: String(item.keyword || '').trim(), text: String(item.text || '').trim() };
    })
    .filter(item => item.text.length > 0)
    .slice(0, 8);
}

/**
 * Normaliza a lista de sugestões de melhoria, mapeando a categoria escolhida pela IA
 * para um curso curado (evita URLs inventadas pela IA)
 */
function normalizeImprovementSuggestions(list) {
  if (!Array.isArray(list)) return [];
  return list
    .filter(item => item && typeof item === 'object' && item.label)
    .map((item, idx) => {
      const category = COURSE_CATALOG[item.category] ? item.category : 'other';
      const course = COURSE_CATALOG[category];
      const gain = Math.min(30, Math.max(1, Math.round(Number(item.gain) || 5)));
      return {
        id: idx + 1,
        label: String(item.label).trim(),
        gain,
        category,
        color: course.color,
        colorLight: course.colorLight,
        course: { name: course.name, url: course.url }
      };
    })
    .filter(item => item.label.length > 0)
    .slice(0, 8);
}

/**
 * Fallback: Calcula match com OpenAI
 */
async function tryOpenAIMatch(prompt) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY não configurada');
  }

  let openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  for (let attempt = 1; attempt <= 2; attempt++) {
    if (attempt > 1) {
      console.log(`🔄 OpenAI retry ${attempt}/2 após 2000ms...`);
      await new Promise(r => setTimeout(r, 2000));
    }

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4.1-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.0,
        seed: 67890,
        max_tokens: 2048,
      });

      const content = response.choices?.[0]?.message?.content;
      if (!content) throw new Error('Resposta vazia do OpenAI');

      // Extrai JSON
      let clean = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      const jsonStart = clean.indexOf('{');
      let jsonEnd = -1;
      if (jsonStart !== -1) {
        let depth = 0;
        for (let i = jsonStart; i < clean.length; i++) {
          if (clean[i] === '{') depth++;
          else if (clean[i] === '}') {
            depth--;
            if (depth === 0) { jsonEnd = i; break; }
          }
        }
      }
      if (jsonStart !== -1 && jsonEnd !== -1) {
        clean = clean.substring(jsonStart, jsonEnd + 1);
      }

      let result = JSON.parse(clean);

      // Garante faixas válidas
      result.matchScore = Math.min(100, Math.max(0, Math.round(result.matchScore || 0)));
      result.jobDifficulty = Math.min(10, Math.max(1, Math.round(result.jobDifficulty || 5)));
      result.candidateLevel = Math.min(10, Math.max(1, Math.round(result.candidateLevel || 5)));
      result.strengths = normalizeKeywordList(result.strengths);
      result.gaps = normalizeKeywordList(result.gaps);
      result.improvementSuggestions = normalizeImprovementSuggestions(result.improvementSuggestions);
      // Compatibilidade retroativa com formato antigo (reasons/gapAnalysis como strings)
      result.reasons = result.strengths.map(s => s.text);
      result.gapAnalysis = result.gaps.map(g => g.text);

      console.log(`✅ Job Match Score (OpenAI): ${result.matchScore}% (vaga dif=${result.jobDifficulty} candidato=${result.candidateLevel})`);
      return result;
    } catch (error) {
      if (attempt === 1) continue;
      throw error;
    }
  }
}


/**
 * Reescreve um trecho de texto usando IA
 * Mantém informação mas melhora qualidade e impacto
 * @param {String} text - Texto original
 * @returns {String} - Texto reescrito
 */
export async function rewriteText(text) {
  if (!process.env.OPENAI_API_KEY) {
    console.warn('OPENAI_API_KEY não definida. Usando texto original.');
    return text;
  }
  if (!openai) {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.8,
      max_tokens: 500,
      messages: [
        {
          role: 'system',
          content: `Você é um especialista em redação de currículos. Sua tarefa é reescrever textos de forma profissional e impactante, mantendo a informação original mas melhorando qualidade, clareza e poder de impacto.

Contexto: ${context}

Regras:
1. Mantenha a informação original
2. Adicione números/métricas quando possível
3. Use ação verbal (implementei, desenvolvi, etc)
4. Seja conciso mas impactante
5. Use termos de mercado relevantes

Retorne APENAS o texto reescrito, sem explicações.`,
        },
        {
          role: 'user',
          content: `Reescreva este texto:\n\n"${text}"`,
        },
      ],
    });

    const rewritten = response.choices[0]?.message?.content?.trim();

    if (!rewritten) {
      throw new Error('Resposta vazia da OpenAI');
    }

    console.log('✅ Texto reescrito com sucesso');
    return rewritten;
  } catch (error) {
    console.error('❌ Erro ao reescrever texto:', error.message);
    throw new Error(`Erro ao reescrever: ${error.message}`);
  }
}

/**
 * Gera sugestões de keywords para um currículo
 * @param {String} text - Texto para extrair keywords
 * @returns {Array<String>} - Lista de keywords
 */
export async function suggestKeywords(text) {
  if (!process.env.OPENAI_API_KEY) {
    console.warn('OPENAI_API_KEY não definida. Retornando array vazio.');
    return [];
  }
  if (!openai) {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.5,
      max_tokens: 300,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `Você é um especialista em recrutamento. Analise o currículo e retorne sugestões de keywords relevantes para melhorar visibilidade e compatibilidade com sistemas de IA.

Retorne em JSON com estrutura: { "keywords": ["keyword1", "keyword2", ...] }

Retorne APENAS JSON válido.`,
        },
        {
          role: 'user',
          content: `Currículo:\n\n${text}`,
        },
      ],
    });

    const content = response.choices[0]?.message?.content;
    const parsed = JSON.parse(content);

    return Array.isArray(parsed.keywords) ? parsed.keywords : [];
  } catch (error) {
    console.error('❌ Erro ao gerar keywords:', error.message);
    return []; // Retornar array vazio em caso de erro
  }
}

/**
 * Gera sugestões de palavras-chave para uma VAGA, com base no que a empresa já preencheu
 * (título, descrição, requisitos, área/subárea, nível, contrato, modalidade).
 * Essas palavras-chave são usadas depois para dar peso extra na análise de compatibilidade
 * entre a vaga e os currículos dos candidatos.
 * @param {Object} jobData - Dados parciais da vaga preenchidos até agora
 * @returns {Promise<Array<String>>} - Lista de palavras-chave sugeridas
 */
export async function suggestJobKeywords(jobData = {}) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY não configurada');
  }
  if (!openai) {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  const {
    title = '',
    description = '',
    requirements = '',
    benefits = '',
    area = '',
    subarea = '',
    contract_type = '',
    experience_level = '',
    work_type = '',
  } = jobData;

  const stripHtml = (v) => String(v || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

  const jobText = [
    title && `Título: ${title}`,
    (area || subarea) && `Área: ${area}${subarea ? ' / ' + subarea : ''}`,
    contract_type && `Tipo de contrato: ${contract_type}`,
    experience_level && `Nível de experiência: ${experience_level}`,
    work_type && `Modalidade: ${work_type}`,
    description && `Descrição: ${stripHtml(description)}`,
    requirements && `Requisitos: ${stripHtml(requirements)}`,
    benefits && `Benefícios: ${stripHtml(benefits)}`,
  ].filter(Boolean).join('\n');

  if (jobText.trim().length < 15) {
    throw new Error('Preencha ao menos o título e a descrição da vaga antes de gerar palavras-chave');
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.3,
      max_tokens: 300,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `Você é um especialista em recrutamento e sistemas de compatibilidade (matching) entre vagas e currículos.
Com base nas informações da vaga fornecidas, gere de 5 a 12 palavras-chave curtas (1 a 3 palavras cada) que representam os requisitos e competências MAIS IMPORTANTES para essa vaga.
Essas palavras-chave serão usadas para dar peso extra na análise de compatibilidade com currículos de candidatos.
Priorize: habilidades técnicas específicas, ferramentas/tecnologias, competências comportamentais essenciais, idiomas exigidos e certificações relevantes.
Evite termos genéricos demais (ex: "trabalho em equipe" só se for realmente essencial e explícito).
Retorne APENAS JSON válido no formato: { "keywords": ["palavra1", "palavra2", ...] }`,
        },
        {
          role: 'user',
          content: `Dados da vaga preenchidos até agora:\n\n${jobText}`,
        },
      ],
    });

    const content = response.choices[0]?.message?.content;
    const parsed = JSON.parse(content);
    const keywords = Array.isArray(parsed.keywords) ? parsed.keywords : [];
    return keywords.filter(k => typeof k === 'string' && k.trim().length > 0).map(k => k.trim());
  } catch (error) {
    console.error('❌ Erro ao gerar keywords da vaga:', error.message);
    throw new Error(`Erro ao gerar palavras-chave: ${error.message}`);
  }
}

export default {
  analyzeResume,
  rewriteText,
  suggestKeywords,
  suggestJobKeywords,
};
