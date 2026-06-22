// API para empresas navegarem por escolas e alunos
export const companySchoolApi = {
  base: `${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/users`,
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
