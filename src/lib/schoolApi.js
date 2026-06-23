// API helpers para funcionalidades de Escola
// ⚠️ IMPORTANTE: Validação rigorosa de VITE_API_URL

function getAPIBaseURL() {
  const apiUrl = import.meta.env.VITE_API_URL;
  
  if (!apiUrl || typeof apiUrl !== 'string' || apiUrl.trim().length === 0) {
    throw new Error('❌ ERRO CRÍTICO: VITE_API_URL não configurada');
  }
  
  const trimmed = apiUrl.trim().replace(/\/$/, '');
  
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    throw new Error('❌ ERRO CRÍTICO: VITE_API_URL deve ser URL absoluta');
  }
  
  let finalUrl = trimmed;
  if (!finalUrl.endsWith('/api')) {
    finalUrl = `${finalUrl}/api`;
  }
  
  return finalUrl;
}

export const schoolApi = {
  base: `${getAPIBaseURL()}/schools`,
  authHeaders() {
    const t = localStorage.getItem('curriculoja_token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${t}`
    };
  },
  async listStudentsSummary(){
    const r = await fetch(`${this.base}/students/summary`, { headers:this.authHeaders() });
    const j = await r.json(); if(!r.ok || !j.success) throw new Error(j.message||'Erro ao listar resumo de alunos'); return j.students;
  },
  async getStats() {
    const r = await fetch(`${this.base}/dashboard/stats`, { headers: this.authHeaders() });
    if (!r.ok) throw new Error('Falha ao carregar estatísticas');
    return r.json();
  },
  async getEmployability(){
    const r = await fetch(`${this.base}/dashboard/employability`, { headers: this.authHeaders() });
    const j = await r.json();
    if(!r.ok || !j.success) throw new Error(j.message||'Falha ao carregar empregabilidade');
    return j.employability;
  },
  async listHired(params={}){
    const qs = new URLSearchParams(params).toString();
    const r = await fetch(`${this.base}/employability/hired${qs?`?${qs}`:''}`, { headers:this.authHeaders() });
    const j = await r.json(); if(!r.ok || !j.success) throw new Error(j.message||'Erro ao listar contratados'); return j.rows;
  },
  // Entrevistas da escola por turma (histórico completo, backend já separa em upcoming/history quando preciso)
  async listActiveInterviews(params={}){
    const qs = new URLSearchParams(params).toString();
    const r = await fetch(`${this.base}/employability/interviews${qs?`?${qs}`:''}`, { headers:this.authHeaders() });
    const j = await r.json();
    if(!r.ok || !j.success) throw new Error(j.message||'Erro ao listar entrevistas');
    // Retorna objeto completo com upcoming e history quando disponível
    // Se backend não retornar estrutura nova, cria compatibilidade
    if (j.upcoming || j.history) {
      return {
        upcoming: j.upcoming || [],
        history: j.history || [],
        rows: j.rows || j.upcoming || []
      };
    }
    // Fallback para backends antigos que só retornam rows
    return { upcoming: j.rows || [], history: [], rows: j.rows || [] };
  },
  async listApplications(params={}){
    const qs = new URLSearchParams(params).toString();
    const r = await fetch(`${this.base}/employability/applications${qs?`?${qs}`:''}`, { headers:this.authHeaders() });
    const j = await r.json(); if(!r.ok || !j.success) throw new Error(j.message||'Erro ao listar candidaturas'); return j.rows;
  },
  async listInterviews(params={}){
    const qs = new URLSearchParams(params).toString();
    const r = await fetch(`${this.base}/employability/interviews${qs?`?${qs}`:''}`, { headers:this.authHeaders() });
    const j = await r.json(); if(!r.ok || !j.success) throw new Error(j.message||'Erro ao listar entrevistas'); 
    // Combina upcoming e history se disponíveis (rows é cópia de upcoming)
    return [...(j.upcoming || []), ...(j.history || [])];
  },
  async listPreApproved(params={}){
    const qs = new URLSearchParams(params).toString();
    const r = await fetch(`${this.base}/employability/pre-approved${qs?`?${qs}`:''}`, { headers:this.authHeaders() });
    const j = await r.json(); if(!r.ok || !j.success) throw new Error(j.message||'Erro ao listar pré-aprovações'); return j.rows;
  },
  async listStudentsWithoutResumes(params={}){
    const qs = new URLSearchParams(params).toString();
    const r = await fetch(`${this.base}/students/without-resumes${qs?`?${qs}`:''}`, { headers:this.authHeaders() });
    const j = await r.json(); if(!r.ok || !j.success) throw new Error(j.message||'Erro ao listar alunos sem currículos'); return j.rows;
  },
  async listStudentsWithoutApplications(params={}){
    const qs = new URLSearchParams(params).toString();
    const r = await fetch(`${this.base}/students/without-applications${qs?`?${qs}`:''}`, { headers:this.authHeaders() });
    const j = await r.json(); if(!r.ok || !j.success) throw new Error(j.message||'Erro ao listar alunos sem candidaturas'); return j.rows;
  },
  async getLicenses(){
    const r = await fetch(`${this.base}/licenses`, { headers: this.authHeaders() });
    const j = await r.json();
    if(!r.ok || !j.success) throw new Error(j.message||'Falha ao carregar licenças');
    return j.licenses;
  },
  async listStudents(params = {}) {
    const qs = new URLSearchParams(params).toString();
    const r = await fetch(`${this.base}/students${qs ? `?${qs}` : ''}`, { headers: this.authHeaders() });
    if (!r.ok) throw new Error('Falha ao listar alunos');
    return r.json();
  },
  async listStudentsWithResumes(params = {}) {
    const qs = new URLSearchParams(params).toString();
    const r = await fetch(`${this.base}/students/with-resumes${qs ? `?${qs}` : ''}`, { headers: this.authHeaders() });
    if (!r.ok) throw new Error('Falha ao listar alunos com currículos');
    return r.json();
  },
  async listStudentsWithApplications(params = {}) {
    const qs = new URLSearchParams(params).toString();
    const r = await fetch(`${this.base}/students/with-applications${qs ? `?${qs}` : ''}`, { headers: this.authHeaders() });
    if (!r.ok) throw new Error('Falha ao listar alunos com candidaturas');
    return r.json();
  },
  async createStudent(data) {
    const r = await fetch(`${this.base}/students`, { method: 'POST', headers: this.authHeaders(), body: JSON.stringify(data) });
    const j = await r.json();
    if (!r.ok || !j.success) throw new Error(j.message || 'Erro ao criar aluno');
    return j;
  },
  async listCourses() {
    const r = await fetch(`${this.base}/courses`, { headers: this.authHeaders() });
    if (!r.ok) throw new Error('Falha ao listar cursos');
    return r.json();
  },
  async exportStudents(params={}) {
    const qs = new URLSearchParams(params).toString();
    const r = await fetch(`${this.base}/export/students${qs?`?${qs}`:''}`, { headers: this.authHeaders() });
    if (!r.ok) throw new Error('Erro ao exportar');
    const blob = await r.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `alunos_${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },
  async updateProfile(data) {
    const r = await fetch(`${this.base}/profile`, { method: 'PUT', headers: this.authHeaders(), body: JSON.stringify(data) });
    const j = await r.json();
    if(!r.ok || !j.success) throw new Error(j.message||'Erro ao atualizar perfil');
    return j.school;
  },
  async getProfile(){
    const r = await fetch(`${this.base}/profile`, { headers: this.authHeaders() });
    const j = await r.json();
    if(!r.ok || !j.success) throw new Error(j.message||'Erro ao carregar perfil');
    return j.school;
  },
  async deleteStudent(id){
    const r = await fetch(`${this.base}/students/${id}`, { method:'DELETE', headers:this.authHeaders() });
    const j = await r.json();
    if(!r.ok || !j.success) throw new Error(j.message||'Erro ao excluir aluno');
    return true;
  },
  async toggleStudentStatus(id){
    const r = await fetch(`${this.base}/students/${id}/toggle-status`, { method:'PATCH', headers:this.authHeaders() });
    const j = await r.json();
    if(!r.ok || !j.success) throw new Error(j.message||'Erro ao alterar status');
    return j.status;
  },
  async getStudent(id){
    const r = await fetch(`${this.base}/students/${id}`, { headers:this.authHeaders() });
    const j = await r.json();
    if(!r.ok || !j.success) throw new Error(j.message||'Erro ao carregar aluno');
    return j.student;
  },
  // Upload de planilha de alunos (CSV/XLSX)
  async importStudents(file){
    const t = localStorage.getItem('curriculoja_token');
    const formData = new FormData();
    formData.append('file', file);
    const r = await fetch(`${this.base}/students/import`, { method:'POST', headers:{ 'Authorization': `Bearer ${t}` }, body: formData });
    const j = await r.json().catch(()=>({ success:false, message:'Resposta inválida'}));
    if(!r.ok || !j.success) throw new Error(j.message || 'Erro ao importar alunos');
    return j;
  },
  // Download template (usa arquivo estático backend ou gera localmente)
  async downloadStudentsTemplate(){
    // Pode ser servido estaticamente; fallback: gerar link para CSV existente
    const baseUrl = import.meta.env.VITE_API_URL;
    if (!baseUrl) throw new Error('VITE_API_URL não configurada');
    const trimmed = baseUrl.trim().replace(/\/$/, '');
    const link = `${trimmed}/templates/students-import-template.csv`;
    const a = document.createElement('a');
    a.href = link;
    a.download = 'template-import-alunos.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
  },
  async getStudentActivity(){
    const r = await fetch(`${this.base}/students/activity`, { headers:this.authHeaders() });
    const j = await r.json();
    if(!r.ok || !j.success) throw new Error(j.message||'Erro ao carregar atividade');
    return j.activity;
  },
  async exportCompanyTemplate(){
    const r = await fetch(`${this.base}/export/company-template`, { headers:this.authHeaders() });
    if(!r.ok) throw new Error('Erro ao gerar modelo empresas');
    const blob = await r.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `modelo_empresas_${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },
  async exportStudentsTemplate(){
    const r = await fetch(`${this.base}/export/students-template`, { headers:this.authHeaders() });
    if(!r.ok) throw new Error('Erro ao gerar modelo alunos');
    const blob = await r.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `modelo_alunos_${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },
  // Turmas (Classes)
  async listClasses(){
    const r = await fetch(`${this.base}/classes`, { headers:this.authHeaders() });
    const j = await r.json(); if(!r.ok || !j.success) throw new Error(j.message||'Erro ao listar turmas'); return j.classes;
  },
  async getClassStats(id){
    const r = await fetch(`${this.base}/classes/${id}/stats`, { headers:this.authHeaders() });
    const j = await r.json(); if(!r.ok || !j.success) throw new Error(j.message||'Erro ao carregar estatísticas da turma'); return j;
  },
  async createClass(data){
    const r = await fetch(`${this.base}/classes`, { method:'POST', headers:{...this.authHeaders(), 'Content-Type':'application/json'}, body: JSON.stringify(data)});
    const j = await r.json(); if(!r.ok || !j.success) throw new Error(j.message||'Erro ao criar turma'); return j.class;
  },
  async updateClass(id,data){
    const r = await fetch(`${this.base}/classes/${id}`, { method:'PUT', headers:{...this.authHeaders(), 'Content-Type':'application/json'}, body: JSON.stringify(data)});
    const j = await r.json(); if(!r.ok || !j.success) throw new Error(j.message||'Erro ao atualizar turma'); return j.class;
  },
  async deleteClass(id){
    const r = await fetch(`${this.base}/classes/${id}`, { method:'DELETE', headers:this.authHeaders() });
    const j = await r.json(); if(!r.ok || !j.success) throw new Error(j.message||'Erro ao remover turma'); return true;
  },
  async listClassStudents(id){
    const r = await fetch(`${this.base}/classes/${id}/students`, { headers:this.authHeaders() });
    const j = await r.json(); if(!r.ok || !j.success) throw new Error(j.message||'Erro ao listar alunos da turma'); return j.students;
  },
  async listFeaturedStudents(){
    const r = await fetch(`${this.base}/students/featured`, { headers:this.authHeaders() });
    const j = await r.json(); if(!r.ok || !j.success) throw new Error(j.message||'Erro ao listar alunos destacados'); return j.students;
  },
  async toggleStudentFeatured(id){
    const r = await fetch(`${this.base}/students/${id}/toggle-feature`, { method:'PATCH', headers:this.authHeaders() });
    const j = await r.json(); if(!r.ok || !j.success) throw new Error(j.message||'Erro ao alterar destaque'); return j.is_featured;
  },
  // Operações em lote
  async bulkStudents(action, ids, extra={}){
    const r = await fetch(`${this.base}/students/bulk`, { method:'POST', headers:this.authHeaders(), body: JSON.stringify({ action, ids, ...extra }) });
    const j = await r.json(); if(!r.ok || !j.success) throw new Error(j.message||'Erro em lote'); return j;
  }
};
