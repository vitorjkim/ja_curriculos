/**
 * AI Service - Integração com Google Gemini
 *
 * Responsável por:
 * - Chamar Google Gemini para análise de currículos
 * - Forçar resposta estruturada em JSON
 * - Fazer parse e validação de respostas
 * - Tratamento de erros e fallbacks
 */
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import OpenAI from 'openai'; // Mantido para outras funções que podem usar OpenAI

// Inicializa o cliente do Google Generative AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Configurações de segurança para o modelo Gemini
const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

// O cliente OpenAI será inicializado sob demanda dentro das funções que o utilizam.
// Isso evita que o servidor quebre na inicialização se a chave não estiver definida.
let openai;

/**
 * Esquema JSON esperado da análise de currículo
 * Define a estrutura que a IA deve retornar
 */
const RESUME_ANALYSIS_SCHEMA = {
  type: 'object',
  properties: {
    score: {
      type: 'integer',
      description: 'Score geral de 0 a 100',
      minimum: 0,
      maximum: 100,
    },
    completeness_score: {
      type: 'integer',
      description: 'Score de completude (seções preenchidas)',
      minimum: 0,
      maximum: 100,
    },
    quality_score: {
      type: 'integer',
      description: 'Score de qualidade (gramática, estrutura)',
      minimum: 0,
      maximum: 100,
    },
    relevance_score: {
      type: 'integer',
      description: 'Score de relevância (skills, keywords)',
      minimum: 0,
      maximum: 100,
    },
    impact_score: {
      type: 'integer',
      description: 'Score de impacto (números, resultados)',
      minimum: 0,
      maximum: 100,
    },
    suggestions: {
      type: 'array',
      description: 'Lista de sugestões de melhorias',
      items: {
        type: 'object',
        properties: {
          priority: {
            type: 'string',
            enum: ['critical', 'important', 'recommended'],
            description: 'Nível de prioridade',
          },
          category: {
            type: 'string',
            description: 'Categoria (completeness, quality, skills, etc)',
          },
          title: {
            type: 'string',
            description: 'Título curto da sugestão',
          },
          description: {
            type: 'string',
            description: 'Descrição detalhada',
          },
          impact: {
            type: 'integer',
            description: 'Pontos de impacto esperado no score',
          },
        },
        required: ['priority', 'category', 'title', 'description', 'impact'],
      },
    },
    missing_sections: {
      type: 'array',
      description: 'Seções importantes que faltam',
      items: { type: 'string' },
    },
    key_strengths: {
      type: 'array',
      description: 'Pontos fortes identificados',
      items: { type: 'string' },
    },
    keywords_suggested: {
      type: 'array',
      description: 'Keywords recomendadas para o currículo',
      items: { type: 'string' },
    },
    summary: {
      type: 'string',
      description: 'Resumo geral em 2-3 linhas',
    },
  },
  required: [
    'score',
    'completeness_score',
    'quality_score',
    'relevance_score',
    'impact_score',
    'suggestions',
    'summary',
  ],
};

/**
 * Formata dados do currículo para análise pela IA
 * @param {Object} resume - Objeto do currículo
 * @returns {String} - Texto formatado para análise
 */
function formatResumeForAnalysis(resume) {
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

    console.log(`🤖 Analisando currículo ID: ${resume.id} com Google Gemini...`);

    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-pro-latest',
      safetySettings,
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.7,
        maxOutputTokens: 2048,
      },
    });

    const prompt = `Você é um especialista em recrutamento e currículos. Sua tarefa é analisar o currículo em português a seguir e fornecer uma análise estruturada em JSON.

IMPORTANTE: Você DEVE responder APENAS com um JSON válido, seguindo exatamente este esquema:

${JSON.stringify(RESUME_ANALYSIS_SCHEMA, null, 2)}

Análise que você deve fazer:
1. Score geral (0-100): Qualidade total do currículo.
2. Completeness (0-100): Tem todas as seções? (contato, resumo, experiência, educação, skills).
3. Quality (0-100): Sem erros? Bem estruturado? Claro e objetivo?
4. Relevance (0-100): Tem keywords de mercado? Skills atualizadas? Alinhado com mercado?
5. Impact (0-100): Tem números? Resultados? Ações com impacto mensurável?

Para sugestões:
- CRITICAL: Faltam seções importantes ou há erros graves.
- IMPORTANT: Melhorias que aumentam relevância.
- RECOMMENDED: Ajustes menores de qualidade.

Analise este currículo e retorne apenas o JSON:\n\n${resumeText}`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const content = response.text();

    if (!content) {
      throw new Error('Resposta vazia do Gemini');
    }

    let analysis = JSON.parse(content);

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
    if (error.message.includes('GoogleGenerativeAI')) {
       throw new Error(`Erro na API do Gemini: ${error.message}`);
    }
    throw new Error(`Erro ao analisar currículo: ${error.message}`);
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

export default {
  analyzeResume,
  rewriteText,
  suggestKeywords,
};
