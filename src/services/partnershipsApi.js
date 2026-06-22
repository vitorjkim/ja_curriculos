const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const getAuthToken = () => {
  return localStorage.getItem('curriculoja_token');
};

const authHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${getAuthToken()}`
});

export const partnershipsApi = {
  // ========== ESCOLA ==========
  school: {
    // Solicitar parceria com empresa
    async requestPartnership(companyId) {
      const response = await fetch(
        `${API_BASE_URL}/schools/partnerships/request/${companyId}`,
        {
          method: 'POST',
          headers: authHeaders()
        }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Erro ao solicitar parceria');
      return data;
    },

    // Listar parcerias
    async listPartnerships(status = null) {
      const url = new URL(`${API_BASE_URL}/schools/partnerships`);
      if (status) url.searchParams.set('status', status);
      
      console.log('[partnershipsApi.school] Fazendo requisição para:', url.toString());
      console.log('[partnershipsApi.school] Headers:', authHeaders());
      
      const response = await fetch(url.toString(), { headers: authHeaders() });
      const data = await response.json();
      
      console.log('[partnershipsApi.school] Response status:', response.status);
      console.log('[partnershipsApi.school] Response data:', data);
      
      if (!response.ok) throw new Error(data.message || 'Erro ao listar parcerias');
      return data.partnerships;
    },

    // Aceitar parceria
    async acceptPartnership(partnershipId) {
      const response = await fetch(
        `${API_BASE_URL}/schools/partnerships/accept/${partnershipId}`,
        {
          method: 'POST',
          headers: authHeaders()
        }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Erro ao aceitar parceria');
      return data;
    },

    // Remover parceria
    async removePartnership(partnershipId) {
      const response = await fetch(
        `${API_BASE_URL}/schools/partnerships/${partnershipId}`,
        {
          method: 'DELETE',
          headers: authHeaders()
        }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Erro ao remover parceria');
      return data;
    },

    // Verificar status de parceria com empresa
    async checkPartnershipStatus(companyId) {
      const response = await fetch(
        `${API_BASE_URL}/schools/partnerships/status/${companyId}`,
        { headers: authHeaders() }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Erro ao verificar parceria');
      return data;
    }
  },

  // ========== EMPRESA ==========
  company: {
    // Solicitar parceria com escola
    async requestPartnership(schoolId) {
      const response = await fetch(
        `${API_BASE_URL}/jobs/partnerships/request/${schoolId}`,
        {
          method: 'POST',
          headers: authHeaders()
        }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Erro ao solicitar parceria');
      return data;
    },

    // Listar parcerias
    async listPartnerships(status = null) {
      try {
        const url = new URL(`${API_BASE_URL}/jobs/partnerships`);
        if (status) url.searchParams.set('status', status);
        
        console.log('[partnershipsApi.company] Fazendo requisição para:', url.toString());
        console.log('[partnershipsApi.company] Headers:', authHeaders());
        
        const response = await fetch(url.toString(), { headers: authHeaders() });
        
        console.log('[partnershipsApi.company] Response status:', response.status);
        console.log('[partnershipsApi.company] Response headers:', response.headers);
        
        const data = await response.json();
        
        console.log('[partnershipsApi.company] Response data:', data);
        
        if (!response.ok) {
          console.error('[partnershipsApi.company] Erro na resposta:', data);
          throw new Error(data.message || data.error || 'Erro ao listar parcerias');
        }
        return data.partnerships;
      } catch (error) {
        console.error('[partnershipsApi.company] Erro na requisição:', error);
        throw error;
      }
    },

    // Aceitar parceria
    async acceptPartnership(partnershipId) {
      const response = await fetch(
        `${API_BASE_URL}/jobs/partnerships/accept/${partnershipId}`,
        {
          method: 'POST',
          headers: authHeaders()
        }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Erro ao aceitar parceria');
      return data;
    },

    // Remover parceria
    async removePartnership(partnershipId) {
      const response = await fetch(
        `${API_BASE_URL}/jobs/partnerships/${partnershipId}`,
        {
          method: 'DELETE',
          headers: authHeaders()
        }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Erro ao remover parceria');
      return data;
    },

    // Verificar status de parceria com escola
    async checkPartnershipStatus(schoolId) {
      const response = await fetch(
        `${API_BASE_URL}/jobs/partnerships/status/${schoolId}`,
        { headers: authHeaders() }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Erro ao verificar parceria');
      return data;
    }
  },

  // ========== CANDIDATO ==========
  candidate: {
    // Buscar empresas parceiras da escola do aluno
    async getMySchoolPartners() {
      const response = await fetch(
        `${API_BASE_URL}/schools/partnerships/my-school`,
        { headers: authHeaders() }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Erro ao buscar parcerias da escola');
      return data;
    }
  }
};
