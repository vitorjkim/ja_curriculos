import * as XLSX from 'xlsx';

// Criar template Excel para importação de usuários
const createTemplate = () => {
  const templateData = [
    {
      email: 'exemplo.candidato@email.com',
      nome: 'João Silva',
      senha: '123456',
      tipo: 'candidate',
      telefone: '(11) 99999-9999',
      cpf: '123.456.789-00',
      empresa: '',
      cnpj: ''
    },
    {
      email: 'exemplo.empresa@email.com',
      nome: 'Empresa XYZ',
      senha: '123456',
      tipo: 'company',
      telefone: '(11) 99999-9999',
      cpf: '',
      empresa: 'Empresa XYZ Ltda',
      cnpj: '12.345.678/0001-90'
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(templateData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');
  
  // Adicionar algumas instruções
  const instructions = [
    { 'INSTRUÇÕES DE USO': 'Preencha os dados conforme o exemplo abaixo:' },
    { 'INSTRUÇÕES DE USO': 'email: Email válido e único no sistema' },
    { 'INSTRUÇÕES DE USO': 'nome: Nome completo do usuário ou empresa' },
    { 'INSTRUÇÕES DE USO': 'senha: Senha (mínimo 6 caracteres)' },
    { 'INSTRUÇÕES DE USO': 'tipo: candidate ou company' },
    { 'INSTRUÇÕES DE USO': 'telefone: Telefone com DDD' },
    { 'INSTRUÇÕES DE USO': 'cpf: CPF apenas para candidatos' },
    { 'INSTRUÇÕES DE USO': 'empresa: Nome da empresa (para companies)' },
    { 'INSTRUÇÕES DE USO': 'cnpj: CNPJ apenas para empresas' },
    { 'INSTRUÇÕES DE USO': '' },
    { 'INSTRUÇÕES DE USO': 'Remova estas linhas antes de importar!' }
  ];
  
  const instructionsSheet = XLSX.utils.json_to_sheet(instructions);
  XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Instruções');
  
  return workbook;
};

export { createTemplate };
