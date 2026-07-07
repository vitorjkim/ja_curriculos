/**
 * AI Service - Integração com OpenAI
 * 
 * Responsável por:
 * - Chamar OpenAI GPT-4o-mini para análise de currículos
 * - Forçar resposta estruturada em JSON
 * - Fazer parse e validação de respostas
 * - Tratamento de erros e fallbacks
 */

import OpenAI from 'openai';

// Inicializar cliente OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

  // Contato
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

  return sections.join('\n');
}

/**
 * Analisa um currículo usando OpenAI GPT-4o-mini
 * @param {Object} resume - Objeto do currículo
 * @returns {Promise<Object>} - Análise estruturada em JSON
 * @throws {Error} - Se houver erro na API ou validação
 */
export async function analyzeResume(resume) {
  try {
    // Validar que temos API key
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY não configurada');
    }

    // Formatar currículo para análise
    const resumeText = formatResumeForAnalysis(resume);

    if (!resumeText || resumeText.trim().length < 50) {
      throw new Error('Currículo insuficiente para análise (mínimo 50 caracteres)');
    }

    console.log(`🤖 Analisando currículo ID: ${resume.id} com OpenAI GPT-4o-mini...`);

    // Chamar OpenAI com resposta estruturada (JSON mode)
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // ✅ Modelo recomendado: rápido e eficiente
      temperature: 0.7,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `Você é um especialista em recrutamento e currículos. Sua tarefa é analisar currículos em português e fornecer uma análise estruturada em JSON.

IMPORTANTE: Você DEVE responder APENAS com um JSON válido, seguindo exatamente este esquema:

${JSON.stringify(RESUME_ANALYSIS_SCHEMA, null, 2)}

Análise que você deve fazer:
1. Score geral (0-100): Qualidade total do currículo
2. Completeness (0-100): Tem todas as seções? (contato, resumo, experiência, educação, skills)
3. Quality (0-100): Sem erros? Bem estruturado? Claro e objetivo?
4. Relevance (0-100): Tem keywords de mercado? Skills atualizadas? Alinhado com mercado?
5. Impact (0-100): Tem números? Resultados? Ações com impacto mensurável?

Para sugestões:
- CRITICAL: Faltam seções importantes ou há erros graves
- IMPORTANT: Melhorias que aumentam relevância
- RECOMMENDED: Ajustes menores de qualidade

Retorne APENAS o JSON, sem explicações adicionais.`,
        },
        {
          role: 'user',
          content: `Analise este currículo e retorne apenas JSON:\n\n${resumeText}`,
        },
      ],
    });

    // Extrair conteúdo da resposta
    const content = response.choices[0]?.message?.content;

    if (!content) {
      throw new Error('Resposta vazia da OpenAI');
    }

    // Parse do JSON retornado
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

    console.log(`✅ Análise concluída: Score ${analysis.score}/100`);

    return analysis;
  } catch (error) {
    // Tratamento específico de erros
    if (error.message.includes('API key')) {
      console.error('❌ Erro: Chave OpenAI não configurada');
      throw new Error('Serviço de IA não configurado. Aguarde enquanto configuramos.');
    }

    if (error.message.includes('invalid_request_error')) {
      console.error('❌ Erro na solicitação OpenAI:', error.message);
      throw new Error('Erro ao processar currículo. Tente novamente.');
    }

    if (error.code === 'ERR_MODULE_NOT_FOUND') {
      console.error('❌ Módulo OpenAI não instalado');
      throw new Error('Dependência de IA não encontrada.');
    }

    // Timeout ou conexão
    if (error.message.includes('timeout') || error.message.includes('ECONNREFUSED')) {
      console.error('❌ Timeout ou erro de conexão com OpenAI');
      throw new Error('Serviço de IA indisponível. Tente novamente em alguns segundos.');
    }

    console.error('❌ Erro inesperado na análise:', error.message);
    throw new Error(`Erro ao analisar currículo: ${error.message}`);
  }
}

/**
 * Reescreve um trecho de texto usando IA
 * Mantém informação mas melhora qualidade e impacto
 * @param {String} text - Texto original
 * @param {String} context - Contexto (ex: job_title, experience, education)
 * @returns {Promise<String>} - Texto reescrito
 */
export async function rewriteText(text, context = 'general') {
  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY não configurada');
    }

    if (!text || text.trim().length < 10) {
      throw new Error('Texto muito curto para reescrever (mínimo 10 caracteres)');
    }

    console.log(`📝 Reescrevendo texto (contexto: ${context})...`);

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
 * @param {Object} resume - Objeto do currículo
 * @returns {Promise<Array<String>>} - Lista de keywords sugeridas
 */
export async function suggestKeywords(resume) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY não configurada');
    }

    const resumeText = formatResumeForAnalysis(resume);

    console.log('🔑 Gerando keywords sugeridas...');

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
          content: `Currículo:\n\n${resumeText}`,
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

/**
 * OpenAI implementation for resume analysis
 */
async function analyzeResumeOpenAI(resumeData) {
  const prompt = buildResumeAnalysisPrompt(resumeData);

  const response = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model: 'gpt-4-turbo',
      messages: [
        {
          role: 'system',
          content: `You are an expert HR professional and resume analyst. 
          Analyze the resume provided and give a JSON response with the following structure:
          {
            "score": <number between 0-100>,
            "scoreExplanation": "<brief explanation of why this score>",
            "strengths": ["<strength1>", "<strength2>", ...],
            "improvements": ["<improvement1>", "<improvement2>", ...],
            "missingKeywords": ["<keyword1>", "<keyword2>", ...],
            "recommendations": {
              "formatting": "<tip>",
              "content": "<tip>",
              "skills": "<tip>"
            },
            "suggestedCourses": ["<course1>", "<course2>", ...],
            "summary": "<1-2 sentence overall assessment>"
          }
          Return ONLY valid JSON, no markdown formatting.`,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 1500,
    },
    {
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  );

  // Extract JSON from response
  const content = response.data.choices[0].message.content;
  const analysisData = JSON.parse(content);

  return {
    score: analysisData.score,
    scoreExplanation: analysisData.scoreExplanation,
    strengths: analysisData.strengths,
    improvements: analysisData.improvements,
    missingKeywords: analysisData.missingKeywords,
    recommendations: analysisData.recommendations,
    suggestedCourses: analysisData.suggestedCourses,
    summary: analysisData.summary,
  };
}

/**
 * Google Gemini implementation for resume analysis
 */
async function analyzeResumeGemini(resumeData) {
  const prompt = buildResumeAnalysisPrompt(resumeData);

  const response = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
    {
      contents: [
        {
          parts: [
            {
              text: `You are an expert HR professional and resume analyst. 
              Analyze the resume provided and give a JSON response with the following structure:
              {
                "score": <number between 0-100>,
                "scoreExplanation": "<brief explanation of why this score>",
                "strengths": ["<strength1>", "<strength2>", ...],
                "improvements": ["<improvement1>", "<improvement2>", ...],
                "missingKeywords": ["<keyword1>", "<keyword2>", ...],
                "recommendations": {
                  "formatting": "<tip>",
                  "content": "<tip>",
                  "skills": "<tip>"
                },
                "suggestedCourses": ["<course1>", "<course2>", ...],
                "summary": "<1-2 sentence overall assessment>"
              }
              Resume to analyze: ${prompt}
              Return ONLY valid JSON, no markdown formatting.`,
            },
          ],
        },
      ],
    }
  );

  const content = response.data.candidates[0].content.parts[0].text;
  const analysisData = JSON.parse(content);

  return {
    score: analysisData.score,
    scoreExplanation: analysisData.scoreExplanation,
    strengths: analysisData.strengths,
    improvements: analysisData.improvements,
    missingKeywords: analysisData.missingKeywords,
    recommendations: analysisData.recommendations,
    suggestedCourses: analysisData.suggestedCourses,
    summary: analysisData.summary,
  };
}

/**
 * Rewrite a specific section of resume/experience text
 * @param {string} originalText - Original text to rewrite
 * @param {string} context - Context type (experience|education|summary)
 * @returns {Promise<Object>} - { rewrittenText, tips }
 */
export async function rewriteText(originalText, context = 'experience') {
  try {
    if (AI_PROVIDER === 'openai') {
      return await rewriteTextOpenAI(originalText, context);
    } else if (AI_PROVIDER === 'gemini') {
      return await rewriteTextGemini(originalText, context);
    }
  } catch (error) {
    console.error('Error rewriting text:', error.message);
    throw new Error(`Failed to rewrite text: ${error.message}`);
  }
}

/**
 * OpenAI implementation for text rewriting
 */
async function rewriteTextOpenAI(originalText, context) {
  const contextPrompts = {
    experience:
      'Make this professional experience description more impactful, action-oriented, and ATS-friendly. Include strong action verbs and quantifiable results.',
    education:
      'Improve this education entry to be more compelling and highlight relevant achievements.',
    summary:
      'Rewrite this professional summary to be more compelling, concise, and showcase key strengths.',
  };

  const response = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model: 'gpt-4-turbo',
      messages: [
        {
          role: 'system',
          content: `You are an expert resume writer. ${contextPrompts[context] || contextPrompts.experience}
          Return a JSON response with: { "rewrittenText": "<improved text>", "tips": ["<tip1>", "<tip2>", ...] }
          Return ONLY valid JSON.`,
        },
        {
          role: 'user',
          content: `Please rewrite this text: "${originalText}"`,
        },
      ],
      temperature: 0.7,
      max_tokens: 800,
    },
    {
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  );

  const content = response.data.choices[0].message.content;
  return JSON.parse(content);
}

/**
 * Google Gemini implementation for text rewriting
 */
async function rewriteTextGemini(originalText, context) {
  const contextPrompts = {
    experience:
      'Make this professional experience description more impactful, action-oriented, and ATS-friendly. Include strong action verbs and quantifiable results.',
    education:
      'Improve this education entry to be more compelling and highlight relevant achievements.',
    summary:
      'Rewrite this professional summary to be more compelling, concise, and showcase key strengths.',
  };

  const response = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
    {
      contents: [
        {
          parts: [
            {
              text: `You are an expert resume writer. ${contextPrompts[context] || contextPrompts.experience}
              Please rewrite this text: "${originalText}"
              Return a JSON response with: { "rewrittenText": "<improved text>", "tips": ["<tip1>", "<tip2>", ...] }
              Return ONLY valid JSON.`,
            },
          ],
        },
      ],
    }
  );

  const content = response.data.candidates[0].content.parts[0].text;
  return JSON.parse(content);
}

/**
 * Get skill recommendations based on resume content
 * @param {string} jobTitle - Target job title
 * @param {Array} currentSkills - Current skills from resume
 * @returns {Promise<Object>} - { recommendedSkills, courses, resources }
 */
export async function getSkillRecommendations(jobTitle, currentSkills = []) {
  try {
    if (AI_PROVIDER === 'openai') {
      return await getSkillRecommendationsOpenAI(jobTitle, currentSkills);
    } else if (AI_PROVIDER === 'gemini') {
      return await getSkillRecommendationsGemini(jobTitle, currentSkills);
    }
  } catch (error) {
    console.error('Error getting skill recommendations:', error.message);
    throw new Error(`Failed to get recommendations: ${error.message}`);
  }
}

/**
 * OpenAI implementation for skill recommendations
 */
async function getSkillRecommendationsOpenAI(jobTitle, currentSkills) {
  const skillsList = Array.isArray(currentSkills) ? currentSkills.join(', ') : currentSkills;

  const response = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model: 'gpt-4-turbo',
      messages: [
        {
          role: 'system',
          content: `You are a career development expert. For a given job title and current skills, 
          recommend missing skills, courses, and learning resources.
          Return JSON: {
            "recommendedSkills": ["<skill1>", "<skill2>", ...],
            "courses": [
              { "name": "<course>", "platform": "<platform>", "duration": "<duration>" },
              ...
            ],
            "resources": ["<resource1>", "<resource2>", ...],
            "roadmap": "<brief learning roadmap>"
          }
          Return ONLY valid JSON.`,
        },
        {
          role: 'user',
          content: `Job Title: ${jobTitle}\nCurrent Skills: ${skillsList || 'None specified'}\n\nWhat skills and courses should I develop?`,
        },
      ],
      temperature: 0.7,
      max_tokens: 1200,
    },
    {
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  );

  const content = response.data.choices[0].message.content;
  return JSON.parse(content);
}

/**
 * Google Gemini implementation for skill recommendations
 */
async function getSkillRecommendationsGemini(jobTitle, currentSkills) {
  const skillsList = Array.isArray(currentSkills) ? currentSkills.join(', ') : currentSkills;

  const response = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
    {
      contents: [
        {
          parts: [
            {
              text: `You are a career development expert. For a given job title and current skills, 
              recommend missing skills, courses, and learning resources.
              
              Job Title: ${jobTitle}
              Current Skills: ${skillsList || 'None specified'}
              
              Provide recommendations in JSON format:
              {
                "recommendedSkills": ["<skill1>", "<skill2>", ...],
                "courses": [
                  { "name": "<course>", "platform": "<platform>", "duration": "<duration>" },
                  ...
                ],
                "resources": ["<resource1>", "<resource2>", ...],
                "roadmap": "<brief learning roadmap>"
              }
              Return ONLY valid JSON.`,
            },
          ],
        },
      ],
    }
  );

  const content = response.data.candidates[0].content.parts[0].text;
  return JSON.parse(content);
}

/**
 * Build resume analysis prompt from resume data
 */
function buildResumeAnalysisPrompt(resumeData) {
  let prompt = '';

  // Personal Info
  if (resumeData.personal_info) {
    const info = resumeData.personal_info;
    prompt += `PERSONAL INFO:\nName: ${info.fullName || ''}\nEmail: ${info.email || ''}\nPhone: ${info.phone || ''}\nLocation: ${info.location || ''}\n\n`;
  }

  // Professional Summary
  if (resumeData.personal_info?.summary) {
    prompt += `PROFESSIONAL SUMMARY:\n${resumeData.personal_info.summary}\n\n`;
  }

  // Experience
  if (resumeData.experience && Array.isArray(resumeData.experience)) {
    prompt += 'EXPERIENCE:\n';
    resumeData.experience.forEach((exp, idx) => {
      prompt += `${idx + 1}. ${exp.jobTitle || ''} at ${exp.company || ''}\n`;
      prompt += `   Duration: ${exp.startDate || ''} - ${exp.endDate || ''}\n`;
      prompt += `   Description: ${exp.description || ''}\n\n`;
    });
  }

  // Education
  if (resumeData.education && Array.isArray(resumeData.education)) {
    prompt += 'EDUCATION:\n';
    resumeData.education.forEach((edu, idx) => {
      prompt += `${idx + 1}. ${edu.degree || ''} in ${edu.fieldOfStudy || ''}\n`;
      prompt += `   School: ${edu.schoolName || ''} (${edu.graduationDate || ''})\n`;
      prompt += `   Details: ${edu.description || ''}\n\n`;
    });
  }

  // Skills
  if (resumeData.skills && Array.isArray(resumeData.skills)) {
    prompt += `SKILLS:\n${resumeData.skills.map((s) => s.name || s).join(', ')}\n\n`;
  }

  // Languages
  if (resumeData.languages && Array.isArray(resumeData.languages)) {
    prompt += 'LANGUAGES:\n';
    resumeData.languages.forEach((lang) => {
      prompt += `${lang.name || ''} - ${lang.proficiency || 'Not specified'}\n`;
    });
    prompt += '\n';
  }

  // Courses
  if (resumeData.courses && Array.isArray(resumeData.courses)) {
    prompt += 'COURSES & CERTIFICATIONS:\n';
    resumeData.courses.forEach((course) => {
      prompt += `${course.name || ''} - ${course.issuer || ''} (${course.completionDate || ''})\n`;
    });
  }

  return prompt;
}

export default {
  analyzeResume,
  rewriteText,
  getSkillRecommendations,
};
