// API para empresas navegarem por escolas e alunos
// ⚠️ IMPORTANTE: Validação rigorosa de VITE_API_URL

function getAPIBaseURL() {
  const apiUrl = import.meta.env.VITE_API_URL;
  
  if (!apiUrl || typeof apiUrl !== 'string' || apiUrl.trim().length === 0) {
    const errorMsg = '❌ ERRO CRÍTICO: VITE_API_URL não configurada';
    console.error(errorMsg);
    throw new Error(errorMsg);
  }
  
  const trimmed = apiUrl.trim().replace(/\/$/, '');
  
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    const errorMsg = '❌ ERRO CRÍTICO: VITE_API_URL deve ser URL absoluta';
    console.error(errorMsg);
    throw new Error(errorMsg);
  }
  
  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction && trimmed.includes('localhost')) {
    throw new Error('localhost não permitido em produção');
  }
  
  let finalUrl = trimmed;
  if (!finalUrl.endsWith('/api')) {
    finalUrl = `${finalUrl}/api`;
  }
  
  return finalUrl;
}

export const companySchoolApi = {
  base: `${getAPIBaseURL()}/users`,
  authHeaders(){
    const t = localStorage.getItem('curriculoja_token');
    return { 'Authorization': `Bearer ${t}` };
  },
  async listSchools(){
    const r = await fetch(`${this.base}/schools/public`, { headers:this.authHeaders() });
    if(!r.ok){
      let msg = 'Falha ao carregar escolas';
      try { const j = await r.json(); if(j?.error) msg = j.error; } catch { /* ignore */ }
      throw new Error(msg);
    }
    return r.json();
  },
  async getSchool(id){
    const r = await fetch(`${this.base}/schools/${id}/public`, { headers:this.authHeaders() });
    if(!r.ok){
      let msg = 'Falha ao carregar escola';
      try { const j = await r.json(); if(j?.error) msg = j.error; } catch { /* ignore */ }
      throw new Error(msg);
    }
    return r.json();
  },
  async getClass(id){
    const r = await fetch(`${this.base}/classes/${id}/public`, { headers:this.authHeaders() });
    if(!r.ok){
      let msg = 'Falha ao carregar turma';
      try { const j = await r.json(); if(j?.error) msg = j.error; } catch { /* ignore */ }
      throw new Error(msg);
    }
    return r.json();
  }
};
