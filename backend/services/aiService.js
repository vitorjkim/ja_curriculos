/**
 * AI Service - Integração com APIs de IA (OpenAI ou Google Gemini)
 * Módulo centralizado para todas as operações de IA
 */

import axios from 'axios';

const AI_PROVIDER = process.env.AI_PROVIDER || 'openai'; // openai | gemini
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

/**
 * Analyzes resume content and returns quality score with detailed feedback
 * @param {Object} resumeData - Resume object from database
 * @returns {Promise<Object>} - { score, explanation, suggestions }
 */
export async function analyzeResume(resumeData) {
  try {
    if (AI_PROVIDER === 'openai') {
      return await analyzeResumeOpenAI(resumeData);
    } else if (AI_PROVIDER === 'gemini') {
      return await analyzeResumeGemini(resumeData);
    } else {
      throw new Error(`Unsupported AI provider: ${AI_PROVIDER}`);
    }
  } catch (error) {
    console.error('Error analyzing resume:', error.message);
    throw new Error(`Failed to analyze resume: ${error.message}`);
  }
}

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
