import * as XLSX from 'xlsx';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Criar arquivo Excel de teste
const createTestExcel = () => {
  const testData = [
    {
      email: 'teste.candidato@email.com',
      nome: 'Maria Santos',
      senha: 'senha123',
      tipo: 'candidate',
      telefone: '(11) 98765-4321',
      cpf: '123.456.789-00',
      empresa: '',
      cnpj: ''
    },
    {
      email: 'teste.empresa@email.com',
      nome: 'Tech Solutions',
      senha: 'senha123',
      tipo: 'company',
      telefone: '(11) 91234-5678',
      cpf: '',
      empresa: 'Tech Solutions Ltda',
      cnpj: '12.345.678/0001-90'
    },
    {
      email: 'outro.candidato@email.com',
      nome: 'Pedro Costa',
      senha: 'senha123',
      tipo: 'candidate',
      telefone: '(21) 99876-5432',
      cpf: '987.654.321-00',
      empresa: '',
      cnpj: ''
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(testData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Usuários');

  // Salvar arquivo
  const filePath = join(__dirname, 'teste-importacao.xlsx');
  XLSX.writeFile(workbook, filePath);
  
  console.log('✅ Arquivo de teste criado:', filePath);
  return filePath;
};

// Testar leitura do arquivo
const testReadExcel = (filePath) => {
  try {
    console.log('\n📖 Testando leitura do arquivo...');
    
    const workbook = XLSX.readFile(filePath);
    console.log('📋 Planilhas encontradas:', workbook.SheetNames);
    
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);
    
    console.log('📊 Dados extraídos:');
    jsonData.forEach((row, index) => {
      console.log(`   Linha ${index + 2}:`, {
        email: row.email,
        nome: row.nome,
        tipo: row.tipo,
        telefone: row.telefone
      });
    });
    
    console.log('\n✅ Teste de leitura concluído com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro no teste de leitura:', error);
  }
};

// Executar testes
console.log('🔧 Iniciando testes de importação Excel...\n');

const filePath = createTestExcel();
testReadExcel(filePath);

console.log('\n📝 Para testar a importação:');
console.log('1. Acesse o painel admin no navegador');
console.log('2. Clique em "Importar Excel"');
console.log(`3. Selecione o arquivo: ${filePath}`);
console.log('4. Verifique se os usuários foram importados\n');
