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
 * Analisa um currículo usando Google Gemini
 * @param {Object} resume - Objeto do currículo
 * @returns {Promise<Object>} - Análise estruturada em JSON
 * @throws {Error} - Se houver erro na API ou validação
 */
export async function analyzeResume(resume) {
  try {
    // Validar que temos API key do Gemini
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY não configurada');
    }

    // Formatar currículo para análise
    const resumeText = formatResumeForAnalysis(resume);

    if (!resumeText || resumeText.trim().length < 50) {
      throw new Error('Currículo insuficiente para análise (mínimo 50 caracteres)');
    }

    console.log(`🤖 Analisando currículo ID: ${resume.id} com Google Gemini (REST)...`);

    const prompt = `Você é um especialista em recrutamento e currículos. Sua tarefa é analisar o currículo em português a seguir e fornecer uma análise estruturada em JSON.

IMPORTANTE: Você DEVE responder APENAS com um JSON válido, seguindo exatamente este esquema:

${JSON.stringify(RESUME_ANALYSIS_SCHEMA, null, 2)}

Análise que você deve fazer:
1. Score geral (0-100): Qualidade total do currículo.
2. completude (0-100): O currículo tem todas as seções essenciais (contato, experiência, educação, habilidades)?
3. qualidade (0-100): O texto é claro, conciso e sem erros de português? A formatação é profissional?
4. relevancia (0-100): As informações são relevantes para uma vaga de tecnologia/mercado atual? Contém palavras-chave de mercado?
5. impacto (0-100): O candidato demonstra resultados e conquistas com números ou exemplos concretos?
6. geral (0-100): Uma avaliação holística da força do currículo.

Para sugestões:
- CRITICAL: Erros graves ou seções faltando que prejudicam muito a avaliação.
- IMPORTANT: Melhorias de alto impacto que podem aumentar significativamente a chance do candidato.
- RECOMMENDED: Ajustes finos e dicas de boas práticas.

Analise este currículo e retorne apenas o JSON:\n\n${resumeText}`;

const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=' + process.env.GEMINI_API_KEY;
    const body = {
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 20000,
      },
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

    if (!content) {
      throw new Error('Resposta vazia do Gemini');
    }

    // Log tamanho para debug
    console.log(`📊 Tamanho da resposta Gemini: ${content.length} caracteres`);

    // Limpeza agressiva de markdown e caracteres problemáticos
    let cleanContent = content
      .replace(/^```(?:json)?\s*/i, '')      // Remove bloco de código markdown
      .replace(/\s*```$/i, '')                // Remove fechamento markdown
      .trim();
    
    // Se está envolvido em "json...", extrai o conteúdo
    if (cleanContent.startsWith('"') && cleanContent.endsWith('"')) {
      try {
        cleanContent = JSON.parse(cleanContent);
        if (typeof cleanContent === 'string') {
          cleanContent = cleanContent.trim();
        }
      } catch (e) {
        // Se falhar, continua com o texto original
      }
    }
    
    // Mais um log de debug
    console.log(`📊 Tamanho após limpeza: ${cleanContent.length} caracteres`);
    console.log(`📊 Primeiros 200 chars: ${cleanContent.substring(0, 200)}`);

    let analysis;
    try {
      analysis = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error(`❌ Erro ao parsear JSON na posição: ${parseError.message}`);
      console.error(`❌ Primeiros 300 chars: ${cleanContent.substring(0, 300)}`);
      console.error(`❌ Últimos 300 chars: ${cleanContent.substring(Math.max(0, cleanContent.length - 300))}`);
      
      // Tenta extrair JSON entre chaves se parser falhar
      const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          console.log('🔄 Tentando extrair JSON entre chaves...');
          analysis = JSON.parse(jsonMatch[0]);
          console.log('✅ Extração bem-sucedida!');
        } catch (e2) {
          throw parseError;
        }
      } else {
        throw parseError;
      }
    }

    // Validar scores
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
  } catch (error) {
    console.error('❌ Erro na análise de currículo com Gemini:', error);
    throw new Error(`Erro na API do Gemini: ${error.message}`);
  }
}

/**
 * Calcula o Match Score entre um currículo e uma vaga de emprego
 * @param {String} resumeText - Texto formatado do currículo
 * @param {String} jobDescription - Descrição completa da vaga
 * @returns {Promise<Object>} - { matchScore, jobDifficulty, candidateLevel, reasons, gapAnalysis }
 */
export async function calculateJobMatch(resumeText, jobDescription) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY não configurada');
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
  "jobDifficulty": <número 1-10 representando dificuldade da vaga: 1=estágio básico, 5=pleno, 10=especialista sênior>,
  "candidateLevel": <número 1-10 representando nível do candidato pelo currículo>,
  "reasons": [
    "<ponto positivo ou neutro de compatibilidade>",
    "<outro ponto>",
    "<terceiro ponto>"
  ],
  "gapAnalysis": [
    "<o que falta para atingir 100% de match>",
    "<segunda lacuna se existir>"
  ]
}

Cálculo do matchScore:
- 60% do peso: compatibilidade de skills/habilidades exigidas vs. presentes no currículo
- 40% do peso: compatibilidade de senioridade (jobDifficulty vs candidateLevel)
- Se jobDifficulty <= candidateLevel, sineridade = 100%. Se jobDifficulty = candidateLevel+2, sineridade = 60%. Se jobDifficulty > candidateLevel+3, sineridade = 20%.`;

  const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=' + process.env.GEMINI_API_KEY;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.4, maxOutputTokens: 8192 },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  const candidate = data?.candidates?.[0];
  const finishReason = candidate?.finishReason;
  const content = candidate?.content?.parts?.[0]?.text;

  console.log(`📊 Job Match - finishReason: ${finishReason}, tamanho: ${content?.length || 0} chars`);

  if (!content) throw new Error(`Resposta vazia do Gemini (finishReason: ${finishReason})`);

  console.log(`📊 Job Match - Resposta bruta: ${content.substring(0, 300)}`);

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
    console.error('❌ Job Match JSON parse error:', parseError.message);
    console.error('❌ Conteúdo que falhou:', clean.substring(0, 500));
    throw new Error(`Erro ao parsear resposta do Gemini: ${parseError.message}`);
  }

  // Garante faixas válidas
  result.matchScore = Math.min(100, Math.max(0, Math.round(result.matchScore || 0)));
  result.jobDifficulty = Math.min(10, Math.max(1, Math.round(result.jobDifficulty || 5)));
  result.candidateLevel = Math.min(10, Math.max(1, Math.round(result.candidateLevel || 5)));
  result.reasons = Array.isArray(result.reasons) ? result.reasons.slice(0, 5) : [];
  result.gapAnalysis = Array.isArray(result.gapAnalysis) ? result.gapAnalysis.slice(0, 5) : [];

  console.log(`✅ Job Match Score: ${result.matchScore}% (vaga dif=${result.jobDifficulty} candidato=${result.candidateLevel})`);
  return result;
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

export default {
  analyzeResume,
  rewriteText,
  suggestKeywords,
};
