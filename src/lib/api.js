// Configuração da API
// ⚠️ IMPORTANTE: VITE_API_URL é OBRIGATÓRIA em produção
// Se não estiver definida, a aplicação FALHARÁ explicitamente

function getAPIBaseURL() {
  const apiUrl = import.meta.env.VITE_API_URL;
  
  // Validar que a variável está definida
  if (!apiUrl || typeof apiUrl !== 'string' || apiUrl.trim().length === 0) {
    const errorMsg = 
      '❌ ERRO CRÍTICO: Variável de ambiente VITE_API_URL não está definida ou é vazia!\n' +
      'A aplicação não pode funcionar sem esta configuração.\n' +
      'Em produção (Vercel): Adicione VITE_API_URL nas Environment Variables\n' +
      'Exemplo: VITE_API_URL=https://seu-backend.up.railway.app/api\n' +
      'Em desenvolvimento: Crie arquivo .env na raiz com: VITE_API_URL=http://localhost:3001/api';
    
    console.error(errorMsg);
    throw new Error('VITE_API_URL não configurada');
  }
  
  const trimmed = apiUrl.trim().replace(/\/$/, '');
  
  // Validar que é URL absoluta (OBRIGATÓRIO - sem localhost em produção)
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    const errorMsg = 
      `❌ ERRO CRÍTICO: VITE_API_URL deve ser uma URL ABSOLUTA completa.\n` +
      `Recebido: "${apiUrl}"\n` +
      `Exemplo correto: https://seu-backend.up.railway.app/api\n` +
      `NÃO use URLs relativas como "/api" ou sem protocolo como "seu-backend.com/api"`;
    
    console.error(errorMsg);
    throw new Error('VITE_API_URL deve ser uma URL absoluta');
  }
  
  // Validar que não contém localhost em produção (buildtime check)
  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction && trimmed.includes('localhost')) {
    const errorMsg = 
      `❌ ERRO CRÍTICO: Em produção (Vercel), VITE_API_URL não pode apontar para localhost!\n` +
      `Recebido: "${apiUrl}"\n` +
      `Isso causará erros de conexão pois Vercel não consegue alcançar sua máquina local.\n` +
      `Configure VITE_API_URL para apontar para seu backend em produção (ex: Railway)`;
    
    console.error(errorMsg);
    throw new Error('VITE_API_URL apontando para localhost em produção');
  }
  
  // Garantir que termina com /api
  let finalUrl = trimmed;
  if (!finalUrl.endsWith('/api')) {
    // Se termina com apenas o domínio ou está faltando /api
    if (finalUrl.match(/^https?:\/\/[^\/]+$/) || !finalUrl.includes('/api')) {
      finalUrl = `${finalUrl}/api`;
    } else {
      // Se tem caminho mas não termina em /api, avisar
      const warningMsg = 
        `⚠️ AVISO: VITE_API_URL não termina com "/api"\n` +
        `Adicionando "/api" automaticamente.\n` +
        `Recebido: "${apiUrl}"\n` +
        `Usando: "${finalUrl}/api"`;
      console.warn(warningMsg);
      finalUrl = `${finalUrl}/api`;
    }
  }
  
  console.log('✅ API configurada:', finalUrl);
  return finalUrl;
}

const API_BASE_URL = getAPIBaseURL();

// Função helper para obter token
const getAuthToken = () => {
  return localStorage.getItem('curriculoja_token');
};

// Função principal para fazer requisições com timeout e retry exponencial
const apiRequest = async (endpoint, options = {}, useAuth = true) => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (useAuth) {
    const token = getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    } else {
      // Se a autenticação é necessária mas não há token, rejeitar
      return Promise.reject({
        response: { status: 401 },
        message: 'Token de acesso requerido',
      });
    }
  }

  // Fallback: se token é local (modo offline) e rota admin sensível, retornar dummy
  const isLocalToken = token && token.startsWith('local_token_');
  const isProtectedUsersRoute = endpoint.startsWith('/users');
  const isAuthMe = endpoint === '/auth/me';
  if (isLocalToken && (isProtectedUsersRoute)) {
    console.warn('[offline-mode] Bloqueando chamada à API protegida:', endpoint);
    if (endpoint.startsWith('/users')) {
      return {
        users: [],
        pagination: { page: 1, limit: 0, total: 0, pages: 0 },
        stats: { totalUsers: 0, candidates: 0, companies: 0, schools: 0, admins: 0, activeUsers: 0, disabledUsers: 0 }
      };
    }
  }
  if (isLocalToken && isAuthMe) {
    try {
      const localUser = JSON.parse(localStorage.getItem('curriculoja_user') || 'null');
      if (localUser) {
        return {
          user: {
            id: localUser.id,
            email: localUser.email,
            name: localUser.name,
            companyName: localUser.companyName,
            type: localUser.type,
            subscriptionPlan: localUser.subscriptionPlan || 'free',
            subscriptionStatus: localUser.subscriptionStatus || 'active'
          }
        };
      }
    } catch {}
  }

  const config = {
    headers: {
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
    config.body = JSON.stringify(config.body);
    config.headers['Content-Type'] = 'application/json';
  }

  if (config.body instanceof FormData) {
    if (config.headers['Content-Type']) delete config.headers['Content-Type'];
  }

  const maxRetries = typeof options.retries === 'number' ? options.retries : 1; // 1 retry
  const timeoutMs = typeof options.timeout === 'number' ? options.timeout : 30000; // 30s padrão (mais realista)

  let attempt = 0;
  while (attempt <= maxRetries) {
    attempt += 1;

    const controller = new AbortController();
    const signal = controller.signal;
    const fetchConfig = { ...config, signal };

    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const attemptStart = Date.now();
      const response = await fetch(url, fetchConfig);
      const duration = Date.now() - attemptStart;
      clearTimeout(timer);

      // Ler como texto primeiro para evitar throws em JSON inválido
      const text = await response.text().catch(() => '');
      let data = {};
      try { data = text ? JSON.parse(text) : {}; } catch { data = { message: text } }

      // Log de latência por tentativa
      try {
        console.info(`[api] ${fetchConfig.method || 'GET'} ${endpoint} attempt=${attempt} duration=${duration}ms status=${response.status}`);
      } catch {}

      if (response.ok) {
        return data;
      }

      // Se for erro 5xx, tentar novamente apenas se for a primeira tentativa
      if (response.status >= 500 && attempt <= maxRetries) {
        const wait = 200; // espera fixa, não exponencial
        await new Promise((r) => setTimeout(r, wait));
        continue;
      }

      // Erro não recuperável (4xx) - lançar
      throw new Error(data.error || data.message || `HTTP error! status: ${response.status}`);
    } catch (err) {
      clearTimeout(timer);
      const durationErr = (() => { try { return Date.now() - (typeof attemptStart !== 'undefined' ? attemptStart : Date.now()); } catch { return 0; } })();

      // Apenas fazer retry em erros de rede REAIS, não em AbortError de timeout
      const isNetworkError = err instanceof TypeError && /network|failed|fetch/i.test(err.message || '');
      
      try {
        console.warn(`[api] ${fetchConfig.method || 'GET'} ${endpoint} attempt=${attempt} error=${err.name || err.message} duration=${durationErr}ms`);
      } catch {}

      if (isNetworkError && attempt <= maxRetries) {
        const wait = 200; // espera fixa
        await new Promise((r) => setTimeout(r, wait));
        continue;
      }

      console.error('API Request failed:', err);
      throw err;
    }
  }
};

// API de Autenticação
export const authAPI = {
  // Registrar usuário
  register: async (userData) => {
    return apiRequest('/auth/register', {
      method: 'POST',
      body: userData
    });
  },

  // Login
  login: async (email, password) => {
    return apiRequest('/auth/login', {
      method: 'POST',
      body: { email, password }
    });
  },

  // Logout
  logout: async () => {
    const refreshToken = localStorage.getItem('curriculoja_refresh_token');
    return apiRequest('/auth/logout', {
      method: 'POST',
      body: { refreshToken }
    });
  },

  // Obter dados do usuário atual
  me: async () => {
    return apiRequest('/auth/me');
  },

  // Renovar token
  refreshToken: async (refreshToken) => {
    return apiRequest('/auth/refresh', {
      method: 'POST',
      body: { refreshToken }
    });
  }
};

// API de Usuários
export const usersAPI = {
  // Listar usuários (admin)
  list: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/users${query ? `?${query}` : ''}`);
  },

  // Obter usuário específico
  get: async (id) => {
    return apiRequest(`/users/${id}`);
  },

  // Obter empresa específica (público)
  getCompany: async (id) => {
    return apiRequest(`/users/company/${id}`);
  },

  // Atualizar usuário
  update: async (id, userData) => {
    return apiRequest(`/users/${id}`, {
      method: 'PUT',
      body: userData
    });
  },

  // Upload de avatar
  uploadAvatar: async (id, avatarBase64) => {
    return apiRequest(`/users/${id}/avatar`, {
      method: 'POST',
      body: { avatar: avatarBase64 }
    });
  },

  // Alterar status do usuário
  toggleStatus: async (id, disabled) => {
    return apiRequest(`/users/${id}/toggle-status`, {
      method: 'PATCH',
      body: { disabled }
    });
  },

  // Deletar usuário
  delete: async (id) => {
    return apiRequest(`/users/${id}`, {
      method: 'DELETE'
    });
  },

  // Deletar próprio perfil (empresa)
  deleteProfile: async () => {
    return apiRequest('/users/profile/delete', {
      method: 'DELETE'
    });
  },

  // Obter filtros iniciais da turma do candidato
  getClassFilters: async () => {
    return apiRequest('/users/me/class-filters');
  },

  // Ações em lote
  bulkAction: async (action, userIds) => {
    return apiRequest('/users/bulk-action', {
      method: 'POST',
      body: { action, userIds }
    });
  },

  // Licenças (admin ↔ escola)
  getLicenses: async (schoolId) => {
    return apiRequest(`/users/${schoolId}/licenses`);
  },
  updateLicenses: async (schoolId, { studentsLimit = null, featuredStudentsLimit = null } = {}) => {
    return apiRequest(`/users/${schoolId}/licenses`, {
      method: 'PATCH',
      body: { studentsLimit, featuredStudentsLimit }
    });
  }
};

// API de Currículos
export const resumesAPI = {
  // Listar currículos do usuário
  list: async () => {
    return apiRequest('/resumes');
  },

  // Obter currículo específico
  get: async (id) => {
    return apiRequest(`/resumes/${id}`);
  },

  // Alias para get (compatibilidade)
  getById: async (id) => {
    return apiRequest(`/resumes/${id}`);
  },

  // Criar novo currículo
  create: async (resumeData) => {
    return apiRequest('/resumes', {
      method: 'POST',
      body: resumeData
    });
  },

  // Atualizar currículo
  update: async (id, resumeData) => {
    return apiRequest(`/resumes/${id}`, {
      method: 'PUT',
      body: resumeData
    });
  },

  // Excluir currículo
  delete: async (id) => {
    return apiRequest(`/resumes/${id}`, {
      method: 'DELETE'
    });
  },

  // Upload de currículo externo
  upload: async (uploadData) => {
    return apiRequest('/resumes/upload', {
      method: 'POST',
      body: uploadData
    });
  },

  // Definir currículo como padrão
  setDefault: async (id) => {
    return apiRequest(`/resumes/${id}/set-default`, {
      method: 'PATCH'
    });
  },

  // Obter currículo padrão
  getDefault: async () => {
    return apiRequest('/resumes/default');
  },

  // Listar currículos de um usuário específico (admin/school viewing student)
  listByUser: async (userId) => {
    return apiRequest(`/resumes/user/${userId}`);
  },

  // Download do arquivo original do currículo
  download: async (id) => {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/resumes/${id}/download`, {
      headers: {
        ...(token && { Authorization: `Bearer ${token}` })
      }
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Erro ao baixar currículo' }));
      throw new Error(error.message || 'Erro ao baixar currículo');
    }

    return response;
  },

  // Enviar currículo por e-mail (anexo via servidor)
  sendEmail: async (id, { to, subject, body }) => {
    return apiRequest(`/resumes/${id}/send-email`, {
      method: 'POST',
      body: { to, subject, body }
    });
  }
};

// API de Vagas
export const jobsAPI = {
  // Taxonomia (áreas e subáreas)
  getTaxonomy: async () => {
    return apiRequest('/jobs/taxonomy');
  },
  // Listar vagas (público)
  list: async (filters = {}) => {
    const query = new URLSearchParams(filters).toString();
    return apiRequest(`/jobs${query ? `?${query}` : ''}`);
  },

  // Buscar vagas com filtros específicos
  search: async (filters = {}) => {
    const query = new URLSearchParams(filters).toString();
    return apiRequest(`/jobs${query ? `?${query}` : ''}`);
  },

  // Obter vaga específica
  get: async (id) => {
    return apiRequest(`/jobs/${id}`);
  },

  // Listar vagas da empresa atual
  getCompanyJobs: async () => {
    return apiRequest('/jobs/company');
  },
  // Listar vagas da comunidade (admin)
  listCommunity: async () => {
    return apiRequest('/jobs/community');
  },

  // Criar nova vaga (empresa)
  create: async (jobData) => {
    return apiRequest('/jobs', {
      method: 'POST',
      body: jobData
    });
  },
  // Criar vaga da comunidade (admin)
  createCommunity: async (data) => {
    return apiRequest('/jobs/community', {
      method: 'POST',
      body: data
    });
  },

  // Atualizar vaga (empresa)
  update: async (id, jobData) => {
    return apiRequest(`/jobs/${id}`, {
      method: 'PUT',
      body: jobData
    });
  },

  // Deletar vaga (empresa)
  delete: async (id) => {
    return apiRequest(`/jobs/${id}`, {
      method: 'DELETE'
    });
  },

  // Ativar/desativar vaga
  toggleStatus: async (id, is_active) => {
    return apiRequest(`/jobs/${id}/toggle-status`, {
      method: 'PATCH',
      body: { is_active }
    });
  },
  // ==== Destaques: solicitações empresa->escola ====
  requestHighlight: async (jobId, schoolId, message) => {
    return apiRequest(`/jobs/${jobId}/request-highlight`, {
      method: 'POST',
      body: { schoolId, message }
    });
  },
  listMyHighlightRequests: async () => {
    return apiRequest('/jobs/highlight-requests');
  },
  listPendingHighlightRequestsForSchool: async () => {
    return apiRequest('/jobs/highlight-requests/pending');
  },
  approveHighlightRequest: async (requestId, classIds = []) => {
    return apiRequest(`/jobs/highlight-requests/${requestId}/approve`, {
      method: 'POST',
      body: { classIds }
    });
  },
  rejectHighlightRequest: async (requestId, reason) => {
    return apiRequest(`/jobs/highlight-requests/${requestId}/reject`, {
      method: 'POST',
      body: { reason }
    });
  },
  // ==== Destaques para candidato (IDs de vagas destacadas pela escola/turma do aluno) ====
  getMySchoolHighlightedJobs: async () => {
    return apiRequest('/jobs/highlights/mine');
  },
  // ==== Destaque direto (empresa premium) ====
  listCompanyHighlightSchools: async () => {
    return apiRequest('/jobs/company-highlight/schools');
  },
  listCompanyHighlightSchoolClasses: async (schoolId) => {
    return apiRequest(`/jobs/company-highlight/schools/${schoolId}/classes`);
  },
  createDirectCompanyHighlight: async (jobId, schoolId, classId) => {
    return apiRequest(`/jobs/${jobId}/company-highlight`, {
      method: 'POST',
      body: { schoolId, classId }
    });
  },
  listCompanyHighlightsForJob: async (jobId) => {
    return apiRequest(`/jobs/${jobId}/company-highlights`);
  },

  // Novos endpoints para sistema de destaques reformulado
  highlightJob: async (jobId, classId = null) => {
    return apiRequest('/jobs/highlights/school', {
      method: 'POST',
      body: JSON.stringify({ job_id: jobId, class_id: classId }),
    });
  },

  unhighlightJob: async (jobId, classId = null) => {
    const params = classId ? `?class_id=${classId}` : '';
    return apiRequest(`/jobs/highlights/school/${jobId}${params}`, {
      method: 'DELETE',
    });
  },

  getSchoolHighlights: async (classId = null) => {
    const params = classId ? `?class_id=${classId}` : '';
    return apiRequest(`/jobs/highlights/school${params}`);
  },

  highlightJobAsCompany: async (jobId, schoolId, classId) => {
    return apiRequest('/jobs/highlights/company', {
      method: 'POST',
      body: JSON.stringify({ job_id: jobId, school_id: schoolId, class_id: classId }),
    });
  },

  getJobsByArea: async (area, location = '', limit = 20) => {
    const params = new URLSearchParams({ location, limit: limit.toString() });
    return apiRequest(`/jobs/by-area/${area}?${params}`);
  },

  getJobStats: async () => {
    return apiRequest('/jobs/stats');
  },
  // ==== Recomendações (escola indica alunos para a vaga) ====
  recommendStudents: async (jobId, { class_id = null, student_ids = [] } = {}) => {
    return apiRequest(`/jobs/${jobId}/recommendations`, {
      method: 'POST',
      body: { class_id, student_ids }
    });
  },
  listRecommendations: async (jobId) => {
    return apiRequest(`/jobs/${jobId}/recommendations`);
  },
  // Verificar se empresa é parceira da escola do candidato logado
  checkCompanyPartnership: async (companyId) => {
    return apiRequest(`/jobs/partnerships/check-company/${companyId}`);
  }
};

// API de Candidaturas
export const applicationsAPI = {
  // Listar candidaturas do usuário (candidato)
  list: async () => {
    return apiRequest('/applications');
  },
  // Novo: entrevistas do candidato
  listInterviews: async () => {
    return apiRequest('/applications/interviews');
  },
  // Verificar se o candidato já se candidatou a uma vaga
  checkApplication: async (jobId) => {
    return apiRequest(`/applications/check/${jobId}`);
  },
  // Listar candidaturas de um usuário específico (admin/school viewing student)
  listByUser: async (userId) => {
    return apiRequest(`/applications/user/${userId}`);
  },
  
  // Listar candidaturas da empresa
  getCompanyApplications: async () => {
    return apiRequest('/applications/company');
  },
  
  // Listar candidaturas de uma vaga específica
  getJobApplications: async (jobId) => {
    return apiRequest(`/applications/job/${jobId}`);
  },
  // Novo: pipeline consolidado da vaga (inclui campos de entrevista)
  getJobPipeline: async (jobId) => {
    return apiRequest(`/applications/job/${jobId}/pipeline`);
  },
  
  // Criar nova candidatura
  create: async (applicationData) => {
    return apiRequest('/applications', {
      method: 'POST',
      body: applicationData
    });
  },
  
  // Atualizar status da candidatura (empresa)
  updateStatus: async (applicationId, status, extra = {}) => {
    return apiRequest(`/applications/${applicationId}/status`, {
      method: 'PUT',
      body: { status, ...extra }
    });
  },
  
  // Cancelar candidatura (candidato)
  cancel: async (applicationId) => {
    return apiRequest(`/applications/${applicationId}`, {
      method: 'DELETE'
    });
  },

  // Confirmar presença na entrevista (candidato)
  confirmInterview: async (applicationId) => {
    return apiRequest(`/applications/${applicationId}/confirm-interview`, {
      method: 'POST'
    });
  },
  // Rejeitar entrevista (candidato)
  rejectInterview: async (applicationId) => {
    return apiRequest(`/applications/${applicationId}/reject-interview`, {
      method: 'POST'
    });
  },
  // Cancelar entrevista (empresa)
  cancelInterview: async (applicationId, reason) => {
    return apiRequest(`/applications/${applicationId}/cancel-interview`, {
      method: 'POST',
      body: { reason }
    });
  },
  // Aprovar candidato (etapa final)
  finalApprove: async (applicationId) => {
    return apiRequest(`/applications/${applicationId}/final-approve`, {
      method: 'POST'
    });
  },
  // Enviar decisão final com feedback (empresa)
  submitDecision: async (applicationId, { status, feedback }) => {
    return apiRequest(`/applications/${applicationId}/decision`, {
      method: 'POST',
      body: { status, feedback }
    });
  }
};

// API de Empresas
export const companiesAPI = {
  // Listar empresas com vagas ativas
  list: async () => {
    return apiRequest('/jobs/companies/list');
  }
};

// API de Empresas (resumo para vaga)
export const companiesSummaryAPI = {
  get: async (id) => {
    return apiRequest(`/jobs/companies/${id}/summary`);
  }
};

// API de Favoritos (empresa)
export const favoritesAPI = {
  // Listar favoritos da empresa
  listCompanyFavorites: async () => {
    return apiRequest('/favorites/company');
  },
  // Adicionar favorito (empresa salva candidato)
  add: async (candidateId, jobId) => {
    return apiRequest('/favorites', {
      method: 'POST',
      body: { candidateId, jobId }
    });
  },
  // Remover favorito
  remove: async (favoriteId) => {
    return apiRequest(`/favorites/${favoriteId}`, {
      method: 'DELETE'
    });
  }
};

// API de Interações (empresa)
export const interactionsAPI = {
  // Criar interação (empresa → candidato)
  create: async (candidateId, jobId, interactionType, message) => {
    return apiRequest('/interactions', {
      method: 'POST',
      body: { candidateId, jobId, interactionType, message }
    });
  },
  unreadCount: async () => apiRequest('/interactions/candidate/unread-count'),
  latestMessages: async () => apiRequest('/interactions/candidate/latest'),
  markAllRead: async () => apiRequest('/interactions/candidate/mark-read', { method: 'POST' })
};

// API de Mensagens (candidato)
export const messagesAPI = {
  // Listar mensagens do candidato
  list: async () => {
    return apiRequest('/messages');
  },
  // Marcar mensagem como lida
  markAsRead: async (messageId) => {
    return apiRequest(`/messages/${messageId}/read`, {
      method: 'PUT'
    });
  },
  // Contar mensagens não lidas
  getUnreadCount: async () => {
    return apiRequest('/messages/unread-count');
  }
};

// API de Posts dos Alunos (candidatos)
export const studentPostsAPI = {
  list: async (userId = null) => {
    const params = userId ? `?user_id=${encodeURIComponent(userId)}` : '';
    return apiRequest(`/student-posts${params}`);
  },
  create: async ({ image, caption }) => {
    return apiRequest('/student-posts', { method: 'POST', body: { image, caption } });
  },
  toggleLike: async (postId) => {
    return apiRequest(`/student-posts/${postId}/like`, { method: 'POST' });
  },
  comment: async (postId, { text, parent_id = null }) => {
    return apiRequest(`/student-posts/${postId}/comment`, { method: 'POST', body: { text, parent_id } });
  },
  toggleCommentLike: async (commentId) => {
    return apiRequest(`/student-posts/comments/${commentId}/like`, { method: 'POST' });
  },
  remove: async (postId) => {
    return apiRequest(`/student-posts/${postId}`, { method: 'DELETE' });
  }
};

// API de Visualizações de Perfil (aluno)
export const profileViewsAPI = {
  // Registrar visualização (empresa)
  addView: async (studentId) => {
    return apiRequest(`/students/${studentId}/profile-view`, { method: 'POST' });
  },
  // Obter stats (aluno próprio ou escola)
  getStats: async (studentId) => {
    return apiRequest(`/students/${studentId}/profile-views`);
  }
};

// API de Sistema
export const systemAPI = {
  // Health check
  health: async () => {
    try {
      const response = await fetch(`${API_BASE_URL.replace('/api', '')}/health`);
      return await response.json();
    } catch (error) {
      throw new Error('Backend indisponível');
    }
  }
};

// Classe ApiService para compatibilidade (mantém interface existente)
class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  async request(endpoint, options = {}) {
    return apiRequest(endpoint, options);
  }

  // Método GET simplificado
  async get(endpoint, options = {}) {
    const params = options.params ? `?${new URLSearchParams(options.params)}` : '';
    return apiRequest(`${endpoint}${params}`, { method: 'GET' });
  }

  // Método POST simplificado
  async post(endpoint, body = {}, options = {}) {
    return apiRequest(endpoint, { method: 'POST', body, ...options });
  }

  // Método PUT simplificado
  async put(endpoint, body = {}, options = {}) {
    return apiRequest(endpoint, { method: 'PUT', body, ...options });
  }

  // Método DELETE simplificado
  async delete(endpoint, options = {}) {
    return apiRequest(endpoint, { method: 'DELETE', ...options });
  }

  // Métodos de autenticação
  async login(email, password) {
    return authAPI.login(email, password);
  }

  async register(userData) {
    return authAPI.register(userData);
  }

  // Métodos de usuários (admin)
  async getUsers() {
    return usersAPI.list();
  }

  // Métodos de currículos
  async getResume(id) {
    return resumesAPI.get(id);
  }

  // Health check
  async healthCheck() {
    return systemAPI.health();
  }
}

// API para sistema de chat
export const chatAPI = {
  // Seguir uma empresa (candidato → empresa)
  followCompany: async (companyId) => {
    return apiRequest('/chat/follow', {
      method: 'POST',
      body: { companyId }
    });
  },

  // Salvar candidato (empresa → candidato)
  saveCandidate: async (candidateId) => {
    return apiRequest('/chat/save-candidate', {
      method: 'POST',
      body: { candidateId }
    });
  },

  // Salvar aluno (escola → candidato)
  saveStudent: async (candidateId) => {
    return apiRequest('/chat/save-student', {
      method: 'POST',
      body: { candidateId }
    });
  },

  // Parar de seguir uma empresa
  unfollowCompany: async (companyId) => {
    return apiRequest('/chat/unfollow', {
      method: 'DELETE',
      body: { companyId }
    });
  },

  // Verificar status de seguimento
  getFollowStatus: async (companyId) => {
    return apiRequest(`/chat/follow-status/${companyId}`);
  },

  // Buscar conversas
  getConversations: async () => {
    return apiRequest('/chat/conversations');
  },

  // Grupos (escola / turma)
  getGroups: async () => {
    return apiRequest('/chat/groups');
  },
  getGroupMessages: async (groupKey) => {
    return apiRequest(`/chat/groups/${groupKey}/messages`);
  },
  sendGroupMessage: async (groupKey, message) => {
    return apiRequest(`/chat/groups/${groupKey}/messages`, {
      method: 'POST',
      body: { message }
    });
  },

  // Buscar mensagens de uma conversa
  getMessages: async (conversationId) => {
    return apiRequest(`/chat/messages/${conversationId}`);
  },

  // Enviar mensagem
  sendMessage: async (conversationId, message) => {
    return apiRequest('/chat/messages', {
      method: 'POST',
      body: { conversationId, message }
    });
  },

  // Marcar mensagem como lida
  markMessageAsRead: async (messageId) => {
    return apiRequest(`/chat/messages/${messageId}/read`, {
      method: 'PUT'
    });
  },

  // Excluir mensagem
  deleteMessage: async (messageId) => {
    return apiRequest(`/chat/messages/${messageId}`, {
      method: 'DELETE'
    });
  },

  // Excluir conversa inteira
  deleteConversation: async (conversationId) => {
    return apiRequest(`/chat/conversations/${conversationId}`, {
      method: 'DELETE'
    });
  }
};

// API para vagas externas
export const externalJobsAPI = {
  // Buscar vagas em sites externos via backend unificado (Adzuna)
  search: async (searchTerm, location = '', sources = 'linkedin,indeed', limit = 10, pages) => {
    const params = new URLSearchParams({
      search: searchTerm,
      location,
      sources,
      limit: limit.toString()
    });
    if (pages) params.append('pages', pages.toString());
    return apiRequest(`/external-jobs/external-search?${params}`);
  },

  // Obter vagas sugeridas baseadas no perfil do usuário
  getSuggested: async () => {
    return apiRequest('/external-jobs/suggested-jobs');
  },

  // Buscar vagas por área específica
  getByArea: async (area, location = '', limit = 15) => {
    const params = new URLSearchParams({
      location,
      limit: limit.toString()
    });
    return apiRequest(`/external-jobs/by-area/${area}?${params}`);
  }
};

// API de Agência de Estágio
export const agencyAPI = {
  // Verificar se o usuário logado é agência
  check: async () => {
    return apiRequest('/agency/check');
  },

  // Estatísticas da agência
  getStats: async () => {
    return apiRequest('/agency/stats');
  },

  // Listar vagas da agência
  listJobs: async (page = 1, limit = 50) => {
    return apiRequest(`/agency/jobs?page=${page}&limit=${limit}`);
  },

  // Criar vaga de agência
  createJob: async (jobData) => {
    return apiRequest('/agency/jobs', {
      method: 'POST',
      body: jobData
    });
  },

  // Atualizar vaga de agência
  updateJob: async (id, jobData) => {
    return apiRequest(`/agency/jobs/${id}`, {
      method: 'PUT',
      body: jobData
    });
  },

  // Deletar vaga de agência
  deleteJob: async (id) => {
    return apiRequest(`/agency/jobs/${id}`, {
      method: 'DELETE'
    });
  },

  // Listar candidatos interessados
  listCandidates: async (jobId = null, page = 1, limit = 50) => {
    const params = new URLSearchParams({ page, limit });
    if (jobId) params.append('job_id', jobId);
    return apiRequest(`/agency/candidates?${params}`);
  },

  // Scrape URL para extrair dados de vaga
  scrapeUrl: async (url) => {
    return apiRequest('/agency/scrape-url', {
      method: 'POST',
      body: { url }
    });
  },

  // Importar candidaturas via Excel
  importCandidates: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiRequest('/agency/import-candidates', {
      method: 'POST',
      body: formData
    });
  },

  // Listar candidaturas externas importadas
  listExternalApplications: async (page = 1, search = '', limit = 50) => {
    const params = new URLSearchParams({ page, limit });
    if (search) params.append('search', search);
    return apiRequest(`/agency/external-applications?${params}`);
  },

  // Deletar candidatura externa
  deleteExternalApplication: async (id) => {
    return apiRequest(`/agency/external-applications/${id}`, {
      method: 'DELETE'
    });
  }
};

// Export principal (compatibilidade)
export default new ApiService();

// Exports individuais
export {
  authAPI as auth,
  usersAPI as users,
  resumesAPI as resumes,
  jobsAPI as jobs,
  applicationsAPI as applications,
  companiesAPI as companies,
  systemAPI as system,
  favoritesAPI as favorites,
  interactionsAPI as interactions,
  messagesAPI as messages,
  chatAPI as chat,
  profileViewsAPI as profileViews,
  externalJobsAPI as externalJobs,
  agencyAPI as agency
};
