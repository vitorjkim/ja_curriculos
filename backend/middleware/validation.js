import pkg from 'express-validator';
const { body, validationResult } = pkg;

// Middleware para verificar erros de validação
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Dados inválidos',
      code: 'VALIDATION_ERROR',
      details: errors.array()
    });
  }
  
  next();
};

// Validações para usuário
export const validateUserRegistration = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email deve ser válido'),
  
  body('password')
    .isLength({ min: 3 })
    .withMessage('Senha deve ter pelo menos 3 caracteres'),
  
  body('type')
    .isIn(['candidate', 'company', 'admin', 'school'])
    .withMessage('Tipo deve ser candidate, company, admin ou school'),
  
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Nome deve ter entre 2 e 100 caracteres'),
  
  body('companyName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Nome da empresa deve ter entre 2 e 100 caracteres'),

  // Nome da escola (quando type = school)
  body('schoolName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 120 })
    .withMessage('Nome da escola deve ter entre 2 e 120 caracteres'),
  
  body('phone')
    .optional()
    .matches(/^[\(\)\d\s\-\+]{10,20}$/)
    .withMessage('Telefone deve ter formato válido'),
  
  body('cpf')
    .optional()
    .matches(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/)
    .withMessage('CPF deve ter formato 000.000.000-00'),
  
  body('cnpj')
    .optional()
    .matches(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/)
    .withMessage('CNPJ deve ter formato 00.000.000/0000-00'),
  
  handleValidationErrors
];

// Validações para login
export const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email deve ser válido'),
  
  body('password')
    .notEmpty()
    .withMessage('Senha é obrigatória'),
  
  handleValidationErrors
];

// Validações para vaga
export const validateJob = [
  body('title')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Título deve ter entre 5 e 200 caracteres'),
  
  body('description')
    .trim()
    .isLength({ min: 20, max: 5000 })
    .withMessage('Descrição deve ter entre 20 e 5000 caracteres'),
  
  body('location')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Localização deve ter no máximo 100 caracteres'),
  
  body('workType')
    .optional()
    .isIn(['presencial', 'remoto', 'hibrido'])
    .withMessage('Tipo de trabalho deve ser presencial, remoto ou hibrido'),
  
  body('contractType')
    .optional()
    .isIn(['clt', 'pj', 'estagio', 'temporario'])
    .withMessage('Tipo de contrato deve ser clt, pj, estagio ou temporario'),
  
  body('experienceLevel')
    .optional()
    .isIn(['junior', 'pleno', 'senior', 'estagio'])
    .withMessage('Nível de experiência deve ser junior, pleno, senior ou estagio'),
  
  body('salaryMin')
    .optional()
    .isNumeric()
    .withMessage('Salário mínimo deve ser numérico'),
  
  body('salaryMax')
    .optional()
    .isNumeric()
    .withMessage('Salário máximo deve ser numérico'),
  
  handleValidationErrors
];

// Validações para currículo
export const validateResume = [
  body('title')
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Título deve ter entre 3 e 200 caracteres'),
  
  body('template')
    .optional()
    .isIn(['default', 'modern', 'classic', 'minimal', 'professional', 'colorful'])
    .withMessage('Template deve ser default, modern, classic, minimal, professional ou colorful'),
  
  body('personalInfo')
    .optional()
    .isObject()
    .withMessage('Informações pessoais devem ser um objeto válido'),
    
  body('personal_info')
    .optional()
    .isObject()
    .withMessage('Informações pessoais devem ser um objeto válido'),
  
  handleValidationErrors
];

// Validações para atualização de usuário
export const validateUserUpdate = [
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Email deve ser válido'),
  
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Nome deve ter entre 2 e 100 caracteres'),
  
  body('companyName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Nome da empresa deve ter entre 2 e 100 caracteres'),
  
  body('phone')
    .optional()
    .matches(/^[\(\)\d\s\-\+]{10,20}$/)
    .withMessage('Telefone deve ter formato válido'),
  
  body('bio')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Bio deve ter no máximo 1000 caracteres'),
  
  // Setor da empresa
  body('companySector')
    .optional()
    .trim()
    .isLength({ min: 2, max: 120 })
    .withMessage('Setor deve ter entre 2 e 120 caracteres'),

  // Tamanho da empresa (texto livre curto, ex: Pequena, Média, Grande)
  body('companySize')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Tamanho deve ter entre 2 e 50 caracteres'),
  
  handleValidationErrors
];
