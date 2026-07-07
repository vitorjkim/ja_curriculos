import XLSX from 'xlsx';

// Dados de exemplo para o template
const templateData = [
  {
    'Email do Aluno': 'aluno1@email.com',
    'Nome': 'Maria Silva',
    'Vaga': 'Desenvolvedor Junior',
    'Empresa': 'Tech Innovations',
    'URL': 'https://www.selecty.com.br/vaga/123456',
    'Status': 'Entrevista',
    'Data': '01/07/2026',
    'Observações': 'Entrevista marcada para 08/07'
  },
  {
    'Email do Aluno': 'aluno2@email.com',
    'Nome': 'João Santos',
    'Vaga': 'Analista de Dados',
    'Empresa': 'Data Solutions',
    'URL': 'https://www.selecty.com.br/vaga/234567',
    'Status': 'Contratado',
    'Data': '15/06/2026',
    'Observações': 'Contratado em regime CLT, início em 01/08'
  },
  {
    'Email do Aluno': 'aluno3@email.com',
    'Nome': 'Ana Costa',
    'Vaga': 'UX Designer',
    'Empresa': 'Design Labs',
    'URL': 'https://www.selecty.com.br/vaga/345678',
    'Status': 'Pendente',
    'Data': '25/06/2026',
    'Observações': 'Aguardando retorno da empresa'
  },
  {
    'Email do Aluno': 'aluno4@email.com',
    'Nome': 'Carlos Eduardo',
    'Vaga': 'Consultor de Negócios',
    'Empresa': 'Business Consulting',
    'URL': 'https://www.selecty.com.br/vaga/456789',
    'Status': 'Aceito',
    'Data': '20/06/2026',
    'Observações': 'Oferta de emprego aceita'
  },
  {
    'Email do Aluno': 'aluno5@email.com',
    'Nome': 'Patricia Oliveira',
    'Vaga': 'Advogada Junior',
    'Empresa': 'Legal Services Pro',
    'URL': 'https://www.selecty.com.br/vaga/567890',
    'Status': 'Rejeitado',
    'Data': '10/06/2026',
    'Observações': 'Candidatura rejeitada no primeiro filtro'
  },
  {
    'Email do Aluno': 'aluno6@email.com',
    'Nome': 'Roberto Ferreira',
    'Vaga': 'Marketing Specialist',
    'Empresa': 'Creative Agency',
    'URL': 'https://www.selecty.com.br/vaga/678901',
    'Status': 'Candidatura',
    'Data': '02/07/2026',
    'Observações': 'Candidatura enviada, aguardando avaliação'
  }
];

// Criar instruções
const instructionsData = [
  ['INSTRUÇÕES DE PREENCHIMENTO'],
  [''],
  ['Coluna obrigatória:'],
  ['  • Email do Aluno: Email do aluno cadastrado no sistema (OBRIGATÓRIO)'],
  [''],
  ['Colunas opcionais:'],
  ['  • Nome: Nome do aluno'],
  ['  • Vaga: Título da vaga'],
  ['  • Empresa: Nome da empresa'],
  ['  • URL: Link da vaga externa'],
  ['  • Status: Situação da candidatura (ver valores aceitos abaixo)'],
  ['  • Data: Data da candidatura (formato: DD/MM/YYYY)'],
  ['  • Observações: Notas adicionais'],
  [''],
  ['Valores aceitos para Status:'],
  ['  • Contratado, Hired'],
  ['  • Aceito, Accepted, Aprovado, Approved'],
  ['  • Rejeitado, Rejected, Reprovado'],
  ['  • Entrevista, Interview'],
  ['  • Pendente, Pending, Em análise'],
  ['  • Candidatou, Applied, Candidatura'],
  [''],
  ['Dicas:'],
  ['  1. Adicione os dados dos alunos a partir da linha 2'],
  ['  2. Os nomes das colunas podem variar (maiúsculas, acentos, espaços)'],
  ['  3. O sistema vincula automaticamente pelo email'],
  ['  4. Remova esta aba antes de importar o arquivo'],
];

// Criar workbook com duas abas
const wb = XLSX.utils.book_new();

// Aba 1: Exemplos (dados de template)
const ws1 = XLSX.utils.json_to_sheet(templateData);
// Ajustar largura das colunas
ws1['!cols'] = [
  { wch: 22 }, // Email
  { wch: 18 }, // Nome
  { wch: 22 }, // Vaga
  { wch: 18 }, // Empresa
  { wch: 35 }, // URL
  { wch: 12 }, // Status
  { wch: 12 }, // Data
  { wch: 30 }  // Observações
];
XLSX.utils.book_append_sheet(wb, ws1, 'Exemplos');

// Aba 2: Instruções
const ws2 = XLSX.utils.aoa_to_sheet(instructionsData);
ws2['!cols'] = [{ wch: 60 }];
XLSX.utils.book_append_sheet(wb, ws2, 'Instruções');

// Salvar arquivo
XLSX.writeFile(wb, 'Modelo-Candidaturas-Externas.xlsx');
console.log('✅ Arquivo criado: Modelo-Candidaturas-Externas.xlsx');
