import pool from './config/database.js';
import axios from 'axios';

const BASE_URL = 'http://localhost:3001/api';

async function testSchoolSystem() {
  try {
    console.log('🏫 Testando sistema de escolas...\n');

    // 1. Login como escola
    console.log('1️⃣ Fazendo login como escola...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'escola@exemplo.com',
      password: 'escola123'
    });

    console.log('✅ Login realizado com sucesso');
    console.log('🏫 Escola:', loginResponse.data.user.school_name);

    const token = loginResponse.data.token;
    const authHeaders = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    // 2. Listar cursos
    console.log('\n2️⃣ Listando cursos...');
    const coursesResponse = await axios.get(`${BASE_URL}/schools/courses`, {
      headers: authHeaders
    });

    console.log(`✅ ${coursesResponse.data.courses.length} cursos encontrados:`);
    coursesResponse.data.courses.forEach(course => {
      console.log(`   - ${course.name} (${course.level})`);
    });

    // 3. Criar um novo curso
    console.log('\n3️⃣ Criando novo curso...');
    const newCourseResponse = await axios.post(`${BASE_URL}/schools/courses`, {
      name: 'Técnico em Enfermagem',
      description: 'Curso técnico na área de saúde',
      duration_months: 24,
      level: 'tecnico',
      area: 'Saúde'
    }, { headers: authHeaders });

    console.log('✅ Curso criado:', newCourseResponse.data.course.name);
    const courseId = newCourseResponse.data.course.id;

    // 4. Criar um estudante
    console.log('\n4️⃣ Criando estudante...');
    const newStudentResponse = await axios.post(`${BASE_URL}/schools/students`, {
      name: 'Maria Silva',
      email: 'maria.silva@escola.com',
      password: '123456',
      cpf: '123.456.789-01',
      phone: '(11) 99999-1234',
      course_id: courseId,
      student_registration: 'EST2024001',
      enrollment_date: '2024-02-01',
      current_semester: 1,
      total_semesters: 4,
      emergency_contact_name: 'João Silva',
      emergency_contact_phone: '(11) 88888-5678',
      birth_date: '2000-05-15',
      gender: 'feminino'
    }, { headers: authHeaders });

    console.log('✅ Estudante criado:', newStudentResponse.data.student.name);
    const studentId = newStudentResponse.data.student.id;

    // 5. Criar avaliação para o estudante
    console.log('\n5️⃣ Criando avaliação...');
    const evaluationResponse = await axios.post(`${BASE_URL}/schools/students/${studentId}/evaluations`, {
      subject: 'Anatomia Humana',
      evaluation_type: 'prova',
      score: 8.5,
      max_score: 10.0,
      grade: 'A',
      comments: 'Excelente desempenho na prova teórica',
      evaluation_date: '2024-03-15',
      semester: 1,
      year: 2024
    }, { headers: authHeaders });

    console.log('✅ Avaliação criada:', evaluationResponse.data.evaluation.subject);

    // 6. Listar estudantes
    console.log('\n6️⃣ Listando estudantes...');
    const studentsResponse = await axios.get(`${BASE_URL}/schools/students`, {
      headers: authHeaders
    });

    console.log(`✅ ${studentsResponse.data.students.length} estudantes encontrados:`);
    studentsResponse.data.students.forEach(student => {
      console.log(`   - ${student.name} (${student.student_registration}) - ${student.course_name || 'Sem curso'}`);
    });

    // 7. Obter estatísticas do dashboard
    console.log('\n7️⃣ Obtendo estatísticas...');
    const statsResponse = await axios.get(`${BASE_URL}/schools/dashboard/stats`, {
      headers: authHeaders
    });

    console.log('✅ Estatísticas obtidas:');
    console.log(`   - Total de estudantes: ${statsResponse.data.stats.total_students}`);
    console.log(`   - Média geral: ${statsResponse.data.stats.average_gpa || 'N/A'}`);

    // 8. Testar exportação Excel (apenas simular)
    console.log('\n8️⃣ Testando exportação Excel...');
    try {
      const exportResponse = await axios.get(`${BASE_URL}/schools/export/students`, {
        headers: authHeaders,
        responseType: 'arraybuffer'
      });
      
      console.log('✅ Exportação Excel funcionando (arquivo gerado)');
      console.log(`   - Tamanho: ${exportResponse.data.byteLength} bytes`);
    } catch (exportError) {
      console.log('⚠️ Erro na exportação Excel:', exportError.response?.status || exportError.message);
    }

    console.log('\n🎉 Teste do sistema de escolas concluído com sucesso!');

  } catch (error) {
    console.error('❌ Erro no teste:', error.response?.data || error.message);
  }
}

// Executar teste apenas se o arquivo for executado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  testSchoolSystem();
}

export default testSchoolSystem;
