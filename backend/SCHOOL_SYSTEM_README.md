# 🏫 Sistema de Escolas - CurriculoJá

## 📋 Visão Geral

O sistema de escolas permite que instituições de ensino gerenciem seus alunos de forma completa, incluindo cadastro, acompanhamento acadêmico e exportação de dados.

## 🗄️ Estrutura do Banco de Dados

### Novas Tabelas Criadas

#### 1. **Cursos (courses)**
```sql
CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  duration_months INTEGER,
  level VARCHAR(50) CHECK (level IN ('tecnico', 'superior', 'pos_graduacao', 'mestrado', 'doutorado')),
  area VARCHAR(100),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 2. **Estudantes (students)**
```sql
CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
  student_registration VARCHAR(50),
  enrollment_date DATE,
  graduation_date DATE,
  current_semester INTEGER,
  total_semesters INTEGER,
  gpa DECIMAL(4,2),
  status VARCHAR(30) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'graduated', 'dropped')),
  notes TEXT,
  emergency_contact_name VARCHAR(255),
  emergency_contact_phone VARCHAR(20),
  birth_date DATE,
  gender VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 3. **Avaliações (student_evaluations)**
```sql
CREATE TABLE student_evaluations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  evaluator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject VARCHAR(255),
  evaluation_type VARCHAR(50) CHECK (evaluation_type IN ('prova', 'trabalho', 'projeto', 'participacao', 'comportamento', 'geral')),
  score DECIMAL(5,2),
  max_score DECIMAL(5,2),
  grade VARCHAR(5),
  comments TEXT,
  evaluation_date DATE DEFAULT CURRENT_DATE,
  semester INTEGER,
  year INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Campos Adicionados na Tabela Users
Para escolas (type = 'school'):
- `school_name` - Nome da escola
- `school_type` - Tipo da escola
- `school_address` - Endereço
- `school_city` - Cidade
- `school_state` - Estado
- `school_cep` - CEP
- `school_director` - Nome do diretor
- `school_contact_phone` - Telefone de contato
- `school_website` - Website
- `mec_code` - Código MEC
- `school_level` - Nível de ensino

## 🌐 API Endpoints

### **Autenticação**
Todas as rotas exigem autenticação JWT e tipo de usuário = 'school'

**Base URL:** `/api/schools`

### **Cursos**

#### Listar Cursos
```http
GET /api/schools/courses
Authorization: Bearer <token>
```

#### Criar Curso
```http
POST /api/schools/courses
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Técnico em Informática",
  "description": "Curso técnico em desenvolvimento de sistemas",
  "duration_months": 18,
  "level": "tecnico",
  "area": "Tecnologia"
}
```

#### Atualizar Curso
```http
PUT /api/schools/courses/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Técnico em Informática",
  "description": "Curso técnico em desenvolvimento de sistemas",
  "duration_months": 18,
  "level": "tecnico",
  "area": "Tecnologia",
  "is_active": true
}
```

### **Estudantes**

#### Listar Estudantes
```http
GET /api/schools/students?course_id=<uuid>&status=active&page=1&limit=50
Authorization: Bearer <token>
```

#### Criar Estudante
```http
POST /api/schools/students
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Maria Silva",
  "email": "maria.silva@escola.com",
  "password": "123456",
  "cpf": "123.456.789-01",
  "phone": "(11) 99999-1234",
  "course_id": "<uuid>",
  "student_registration": "EST2024001",
  "enrollment_date": "2024-02-01",
  "current_semester": 1,
  "total_semesters": 4,
  "emergency_contact_name": "João Silva",
  "emergency_contact_phone": "(11) 88888-5678",
  "birth_date": "2000-05-15",
  "gender": "feminino",
  "notes": "Observações adicionais"
}
```

#### Atualizar Estudante
```http
PUT /api/schools/students/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Maria Silva Santos",
  "email": "maria.santos@escola.com",
  "cpf": "123.456.789-01",
  "phone": "(11) 99999-1234",
  "course_id": "<uuid>",
  "student_registration": "EST2024001",
  "current_semester": 2,
  "total_semesters": 4,
  "gpa": 8.5,
  "status": "active",
  "notes": "Excelente desempenho"
}
```

### **Avaliações**

#### Listar Avaliações de um Estudante
```http
GET /api/schools/students/:student_id/evaluations
Authorization: Bearer <token>
```

#### Criar Avaliação
```http
POST /api/schools/students/:student_id/evaluations
Authorization: Bearer <token>
Content-Type: application/json

{
  "subject": "Matemática",
  "evaluation_type": "prova",
  "score": 8.5,
  "max_score": 10.0,
  "grade": "A",
  "comments": "Excelente desempenho",
  "evaluation_date": "2024-03-15",
  "semester": 1,
  "year": 2024
}
```

### **Exportação Excel**

#### Exportar Estudantes
```http
GET /api/schools/export/students?course_id=<uuid>&status=active
Authorization: Bearer <token>
```

**Resposta:** Arquivo Excel (.xlsx) com duas abas:
1. **Estudantes** - Dados completos dos estudantes
2. **Análise de Desempenho** - Médias e estatísticas

### **Dashboard**

#### Obter Estatísticas
```http
GET /api/schools/dashboard/stats
Authorization: Bearer <token>
```

**Resposta:**
```json
{
  "success": true,
  "stats": {
    "total_students": 25,
    "students_by_status": [
      { "status": "active", "count": "20" },
      { "status": "graduated", "count": "5" }
    ],
    "students_by_course": [
      { "name": "Técnico em Informática", "count": "15" },
      { "name": "Técnico em Administração", "count": "10" }
    ],
    "average_gpa": "8.2"
  }
}
```

## 📊 Campos do Excel Exportado

### Aba "Estudantes"
- Nome
- Email
- CPF
- Telefone
- Curso
- Nível
- Matrícula
- Data Matrícula
- Semestre Atual
- Total Semestres
- Média Geral
- Status
- Data Nascimento
- Gênero
- Contato Emergência
- Telefone Emergência
- Observações

### Aba "Análise de Desempenho"
- Nome
- Média das Notas
- Total de Avaliações
- Matérias

## 🔑 Credenciais de Teste

### Escola de Exemplo
- **Email:** escola@exemplo.com
- **Senha:** escola123
- **Nome:** Instituto de Tecnologia Exemplo

### Estudantes de Exemplo
Todos com senha: **123456**

1. **Ana Costa** - ana.costa@escola.com
2. **Carlos Santos** - carlos.santos@escola.com
3. **Beatriz Oliveira** - beatriz.oliveira@escola.com
4. **Diego Silva** - diego.silva@escola.com
5. **Fernanda Lima** - fernanda.lima@escola.com

## 🚀 Como Usar

### 1. **Configurar o Sistema**
```bash
# No diretório backend
node scripts/create-school-system.js
```

### 2. **Criar Dados de Exemplo**
```bash
node create-sample-students.js
```

### 3. **Testar o Sistema**
```bash
node test-school-system.js
```

### 4. **Iniciar o Servidor**
```bash
node server.js
```

## 🎯 Funcionalidades Principais

### Para Escolas
1. **Gerenciamento de Cursos**
   - Criar, editar e desativar cursos
   - Definir duração, nível e área de conhecimento

2. **Gestão de Estudantes**
   - Cadastro completo com dados pessoais e acadêmicos
   - Controle de matrícula, semestre e status
   - Dados de contato de emergência

3. **Sistema de Avaliações**
   - Registro de notas por matéria
   - Diferentes tipos de avaliação (prova, trabalho, projeto)
   - Histórico completo de desempenho

4. **Relatórios e Exportação**
   - Exportação para Excel com dados completos
   - Análise de desempenho por estudante
   - Dashboard com estatísticas gerais

5. **Dashboard Administrativo**
   - Visão geral de estudantes por status
   - Distribuição por curso
   - Média geral da escola

## 🔒 Segurança

- Autenticação JWT obrigatória
- Verificação de tipo de usuário (escola)
- Isolamento de dados por escola
- Validação de entrada em todas as rotas
- Transações de banco para operações críticas

## 📱 Próximos Passos

1. **Interface Web**
   - Dashboard React para escolas
   - Formulários de cadastro
   - Visualização de relatórios

2. **Funcionalidades Adicionais**
   - Sistema de frequência
   - Calendário acadêmico
   - Comunicação com pais/responsáveis
   - Certificados digitais

3. **Integrações**
   - Sistema acadêmico existente
   - Plataformas de ensino online
   - APIs governamentais (MEC)
