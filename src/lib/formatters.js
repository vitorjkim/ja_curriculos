/**
 * Utilitários para formatação de documentos e telefone
 */

/**
 * Formata CPF adicionando pontos e traço automaticamente
 * @param {string} cpf - CPF sem formatação
 * @returns {string} CPF formatado (000.000.000-00)
 */
export const formatCPF = (cpf) => {
  const cleanedCPF = cpf.replace(/\D/g, '');
  return cleanedCPF
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1-$2')
    .slice(0, 14);
};

/**
 * Formata CNPJ adicionando pontos, barra e traço automaticamente
 * @param {string} cnpj - CNPJ sem formatação
 * @returns {string} CNPJ formatado (00.000.000/0000-00)
 */
export const formatCNPJ = (cnpj) => {
  const cleanedCNPJ = cnpj.replace(/\D/g, '');
  return cleanedCNPJ
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})/, '$1-$2')
    .slice(0, 18);
};

/**
 * Formata telefone adicionando parênteses e traço automaticamente
 * @param {string} phone - Telefone sem formatação
 * @returns {string} Telefone formatado ((00) 0000-0000) ou ((00) 00000-0000)
 */
export const formatPhone = (phone) => {
  const cleanedPhone = phone.replace(/\D/g, '');
  
  if (cleanedPhone.length <= 2) {
    return cleanedPhone;
  } else if (cleanedPhone.length <= 6) {
    return cleanedPhone.replace(/(\d{2})(\d)/, '($1) $2');
  } else if (cleanedPhone.length <= 10) {
    return cleanedPhone.replace(/(\d{2})(\d{4})(\d)/, '($1) $2-$3');
  } else {
    return cleanedPhone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3').slice(0, 15);
  }
};

/**
 * Remove toda a formatação de um documento (CPF ou CNPJ)
 * @param {string} document - Documento formatado
 * @returns {string} Apenas números
 */
export const removeDocumentFormatting = (document) => {
  return document.replace(/\D/g, '');
};

/**
 * Remove toda a formatação de um telefone
 * @param {string} phone - Telefone formatado
 * @returns {string} Apenas números
 */
export const removePhoneFormatting = (phone) => {
  return phone.replace(/\D/g, '');
};

/**
 * Valida se um CPF tem formato válido (não valida se o CPF existe)
 * @param {string} cpf - CPF formatado ou não
 * @returns {boolean} true se o formato está correto
 */
export const validateCPFFormat = (cpf) => {
  const cleanedCPF = removeDocumentFormatting(cpf);
  return cleanedCPF.length === 11 && /^\d{11}$/.test(cleanedCPF);
};

/**
 * Valida se um CNPJ tem formato válido (não valida se o CNPJ existe)
 * @param {string} cnpj - CNPJ formatado ou não
 * @returns {boolean} true se o formato está correto
 */
export const validateCNPJFormat = (cnpj) => {
  const cleanedCNPJ = removeDocumentFormatting(cnpj);
  return cleanedCNPJ.length === 14 && /^\d{14}$/.test(cleanedCNPJ);
};

/**
 * Valida se um telefone tem formato válido
 * @param {string} phone - Telefone formatado ou não
 * @returns {boolean} true se o formato está correto (10 ou 11 dígitos)
 */
export const validatePhoneFormat = (phone) => {
  const cleanedPhone = removePhoneFormatting(phone);
  // Telefone fixo: 10 dígitos (XX) XXXX-XXXX
  // Celular: 11 dígitos (XX) 9XXXX-XXXX
  return cleanedPhone.length >= 10 && cleanedPhone.length <= 11 && /^\d+$/.test(cleanedPhone);
};
