/**
 * Matching Service - Algoritmo de compatibilidade entre vagas e candidatos
 * Calcula matching score baseado em skills, experiência e requisitos
 */

/**
 * Calculate matching score between job requirements and resume skills
 * @param {Object} job - Job object with requirements, skills needed, etc
 * @param {Object} resume - Resume object with skills, experience, etc
 * @returns {Object} - { score: 0-100, details: {...}, explanation: "..." }
 */
export function calculateMatchingScore(job, resume) {
  if (!job || !resume) {
    return {
      score: 0,
      details: {},
      explanation: 'Missing job or resume data',
    };
  }

  const scores = {
    skills: calculateSkillsMatch(job, resume),
    experience: calculateExperienceMatch(job, resume),
    education: calculateEducationMatch(job, resume),
    location: calculateLocationMatch(job, resume),
    contractType: calculateContractTypeMatch(job, resume),
    salary: calculateSalaryMatch(job, resume),
  };

  const weights = {
    skills: 0.35,
    experience: 0.25,
    education: 0.15,
    location: 0.1,
    contractType: 0.1,
    salary: 0.05,
  };

  const totalScore = Object.keys(scores).reduce((sum, key) => {
    return sum + scores[key] * weights[key];
  }, 0);

  const finalScore = Math.round(totalScore);

  return {
    score: finalScore,
    details: scores,
    weights,
    explanation: buildMatchingExplanation(finalScore, scores),
    breakdownPercentages: Object.keys(scores).reduce((acc, key) => {
      acc[key] = Math.round(scores[key]);
      return acc;
    }, {}),
  };
}

/**
 * Calculate skills matching (0-100)
 * Looks for common skills between job requirements and resume
 */
function calculateSkillsMatch(job, resume) {
  if (!job.requirements && !job.description) {
    return 50; // Default if no requirements
  }

  const jobSkills = extractSkillsFromJob(job);
  const resumeSkills = extractSkillsFromResume(resume);

  if (jobSkills.length === 0) return 50;
  if (resumeSkills.length === 0) return 0;

  const matchedSkills = jobSkills.filter((skill) =>
    resumeSkills.some((rSkill) =>
      skill.toLowerCase().includes(rSkill.toLowerCase()) ||
      rSkill.toLowerCase().includes(skill.toLowerCase())
    )
  );

  const matchPercentage = (matchedSkills.length / jobSkills.length) * 100;

  return Math.min(100, matchPercentage + 10); // Add 10% for any skills present
}

/**
 * Calculate experience matching (0-100)
 * Compares years of experience and relevance
 */
function calculateExperienceMatch(job, resume) {
  const requiredLevel = (
    job.experience_level || 'junior'
  ).toLowerCase();
  const requiredYears = getYearsForLevel(requiredLevel);

  if (!resume.experience || resume.experience.length === 0) {
    return requiredYears === 0 ? 50 : 20; // Low score if no experience
  }

  const totalExperience = calculateTotalExperience(resume.experience);
  const relevantExperience = calculateRelevantExperience(
    resume.experience,
    job
  );

  const levelMatch = matchExperienceLevel(requiredLevel, resume);
  const yearsMatch = Math.min(
    100,
    (relevantExperience / requiredYears) * 100
  );

  return (levelMatch + yearsMatch) / 2;
}

/**
 * Calculate education matching (0-100)
 */
function calculateEducationMatch(job, resume) {
  if (!resume.education || resume.education.length === 0) {
    return 30; // Some penalty for no education info
  }

  const jobRequirements = extractEducationRequirements(job);

  if (!jobRequirements || jobRequirements.length === 0) {
    return 70; // If job has no specific requirements, give benefit of doubt
  }

  const matchedEducation = resume.education.filter((edu) =>
    jobRequirements.some((req) =>
      edu.fieldOfStudy?.toLowerCase().includes(req.toLowerCase()) ||
      req.toLowerCase().includes(edu.fieldOfStudy?.toLowerCase())
    )
  );

  const educationScore = (matchedEducation.length / resume.education.length) * 100;

  // Bonus if has degree level education
  const hasRelevantDegree =
    resume.education.some((edu) =>
      ['bachelor', 'master', 'phd', 'diploma', 'curso'].some((level) =>
        edu.degree?.toLowerCase().includes(level)
      )
    ) * 20;

  return Math.min(100, educationScore + hasRelevantDegree);
}

/**
 * Calculate location matching (0-100)
 * 100 if same location, 80 if remote option, 50 if nearby
 */
function calculateLocationMatch(job, resume) {
  if (job.work_type === 'remoto') {
    return 100; // Remote work matches everyone
  }

  const jobLocation = (job.location || '').toLowerCase();
  const resumeLocation =
    resume.personal_info?.location?.toLowerCase() || '';

  if (!jobLocation || !resumeLocation) {
    return 50; // Neutral if missing location info
  }

  if (jobLocation === resumeLocation) {
    return 100;
  }

  if (jobLocation.includes(resumeLocation) || resumeLocation.includes(jobLocation)) {
    return 80; // Same region
  }

  if (job.work_type === 'hibrido') {
    return 70; // Hybrid work is flexible
  }

  return 40; // Different locations, presencial
}

/**
 * Calculate contract type matching
 */
function calculateContractTypeMatch(job, resume) {
  const preferredTypes = resume.personal_info?.preferredContractTypes || [];

  if (!preferredTypes || preferredTypes.length === 0) {
    return 75; // Neutral if no preference specified
  }

  if (preferredTypes.includes(job.contract_type)) {
    return 100;
  }

  // Similar contract types get partial credit
  const similarTypes = {
    clt: ['pj', 'temporario'],
    pj: ['clt', 'temporario'],
    estagio: ['temporario'],
  };

  if (similarTypes[job.contract_type]?.includes(
    preferredTypes[0]
  )) {
    return 60;
  }

  return 30; // Incompatible contract type
}

/**
 * Calculate salary compatibility (0-100)
 */
function calculateSalaryMatch(job, resume) {
  const expectedSalary = resume.personal_info?.expectedSalary;

  if (!expectedSalary) {
    return 75; // Neutral if not specified
  }

  const jobSalary =
    job.salary_fixed || job.salary_min || 0;

  if (jobSalary === 0) {
    return 50; // Can't determine
  }

  if (jobSalary >= expectedSalary) {
    return 100; // Job meets or exceeds expectations
  }

  const ratio = jobSalary / expectedSalary;
  return Math.max(0, Math.round(ratio * 100)); // Proportional score
}

/**
 * Extract skills from job description and requirements
 */
function extractSkillsFromJob(job) {
  const text = (job.requirements || '') + ' ' + (job.description || '');
  
  // List of common technical and soft skills
  const commonSkills = [
    'javascript', 'python', 'java', 'c#', 'php', 'ruby', 'golang', 'rust',
    'react', 'vue', 'angular', 'typescript', 'nodejs', 'express',
    'sql', 'postgresql', 'mongodb', 'mysql', 'firebase',
    'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'linux',
    'git', 'agile', 'scrum', 'kanban',
    'leadership', 'communication', 'problem-solving', 'team',
    'html', 'css', 'api', 'rest', 'graphql',
    'testing', 'jest', 'mocha', 'selenium',
    'figma', 'ui', 'ux', 'design',
  ];

  const foundSkills = commonSkills.filter((skill) =>
    text.toLowerCase().includes(skill)
  );

  return foundSkills.length > 0 ? foundSkills : ['general'];
}

/**
 * Extract skills from resume
 */
function extractSkillsFromResume(resume) {
  if (resume.skills && Array.isArray(resume.skills)) {
    return resume.skills.map((s) =>
      typeof s === 'string' ? s : s.name || ''
    );
  }
  return [];
}

/**
 * Extract education requirements from job
 */
function extractEducationRequirements(job) {
  const text = (job.requirements || '') + ' ' + (job.description || '');
  
  const educationKeywords = [
    'computer science', 'informatica', 'engineering', 'engenharia',
    'business', 'administração', 'marketing', 'design', 'designo',
    'healthcare', 'saúde', 'medicine', 'medicina', 'psychology', 'psicologia',
    'law', 'direito', 'education', 'educação',
  ];

  return educationKeywords.filter((keyword) =>
    text.toLowerCase().includes(keyword)
  );
}

/**
 * Calculate total years of experience
 */
function calculateTotalExperience(experience) {
  let totalMonths = 0;

  experience.forEach((exp) => {
    const startDate = new Date(exp.startDate || Date.now());
    const endDate = new Date(exp.endDate || Date.now());

    const months =
      (endDate.getFullYear() - startDate.getFullYear()) * 12 +
      (endDate.getMonth() - startDate.getMonth());

    totalMonths += months;
  });

  return totalMonths / 12; // Convert to years
}

/**
 * Calculate relevant experience (years in similar roles)
 */
function calculateRelevantExperience(experience, job) {
  const jobTitle = (job.title || '').toLowerCase();
  let relevantMonths = 0;

  experience.forEach((exp) => {
    const expTitle = (exp.jobTitle || '').toLowerCase();

    // Check if job title is similar
    if (
      jobTitle.includes(expTitle.split(' ')[0]) ||
      expTitle.includes(jobTitle.split(' ')[0])
    ) {
      const startDate = new Date(exp.startDate || Date.now());
      const endDate = new Date(exp.endDate || Date.now());

      const months =
        (endDate.getFullYear() - startDate.getFullYear()) * 12 +
        (endDate.getMonth() - startDate.getMonth());

      relevantMonths += months;
    }
  });

  return relevantMonths / 12; // Convert to years
}

/**
 * Match experience level (junior, pleno, senior)
 */
function matchExperienceLevel(requiredLevel, resume) {
  const userLevel = detectExperienceLevel(resume);

  const levelRanks = {
    estagio: 0,
    junior: 1,
    pleno: 2,
    senior: 3,
  };

  const requiredRank = levelRanks[requiredLevel] || 1;
  const userRank = levelRanks[userLevel] || 0;

  if (userRank === requiredRank) return 100;
  if (userRank > requiredRank) return 90; // Overqualified
  if (userRank === requiredRank - 1) return 70; // One level below
  return 40; // Much below requirement
}

/**
 * Detect experience level from resume
 */
function detectExperienceLevel(resume) {
  const totalExp = calculateTotalExperience(resume.experience || []);

  if (totalExp < 1) return 'estagio';
  if (totalExp < 3) return 'junior';
  if (totalExp < 8) return 'pleno';
  return 'senior';
}

/**
 * Get expected years of experience for a level
 */
function getYearsForLevel(level) {
  const levels = {
    estagio: 0.5,
    junior: 2,
    pleno: 5,
    senior: 8,
  };
  return levels[level] || 2;
}

/**
 * Build human-readable matching explanation
 */
function buildMatchingExplanation(score, scores) {
  if (score >= 90) {
    return `Excelente compatibilidade (${score}%)! Você tem praticamente todas as habilidades e experiências necessárias para esta vaga.`;
  }
  if (score >= 75) {
    return `Muito boa compatibilidade (${score}%)! Você atende aos requisitos principais e seria um candidato forte.`;
  }
  if (score >= 60) {
    return `Boa compatibilidade (${score}%). Você tem várias habilidades relevantes, mas poderia fortalecer algumas áreas.`;
  }
  if (score >= 45) {
    return `Compatibilidade moderada (${score}%). Você possui alguns dos requisitos, mas teria que desenvolver novas competências.`;
  }
  if (score >= 30) {
    return `Compatibilidade baixa (${score}%). Esta vaga requer habilidades que você ainda não possui. Considere fazer cursos.`;
  }
  return `Compatibilidade muito baixa (${score}%). Esta vaga requer um perfil muito diferente do seu.`;
}

/**
 * Batch calculate matching scores for multiple candidates
 * @param {Object} job - Job to match
 * @param {Array} resumes - Array of resume objects
 * @returns {Array} - Array of { resumeId, candidateId, score, ranking }
 */
export function calculateBatchMatching(job, resumes) {
  const results = resumes.map((resume) => {
    const matching = calculateMatchingScore(job, resume);
    return {
      resumeId: resume.id,
      candidateId: resume.user_id,
      score: matching.score,
      details: matching.details,
      explanation: matching.explanation,
    };
  });

  // Sort by score descending
  results.sort((a, b) => b.score - a.score);

  // Add ranking
  return results.map((result, index) => ({
    ...result,
    ranking: index + 1,
  }));
}

export default {
  calculateMatchingScore,
  calculateBatchMatching,
};
