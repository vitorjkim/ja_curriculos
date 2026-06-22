// Helper para obter baseURL da API de forma consistente
function getAPIBaseURL() {
  const apiUrl = import.meta.env.VITE_API_URL;
  
  if (!apiUrl) {
    return 'http://localhost:3001/api';
  }
  
  const trimmed = apiUrl.trim().replace(/\/$/, '');
  
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return 'http://localhost:3001/api';
  }
  
  if (!trimmed.endsWith('/api')) {
    return `${trimmed}/api`;
  }
  
  return trimmed;
}

export const schoolPostsApi = {
  base: `${getAPIBaseURL()}/school-posts`,
  authHeaders() {
    const t = localStorage.getItem('curriculoja_token');
    const h = { 'Content-Type': 'application/json' };
    if (t) h['Authorization'] = `Bearer ${t}`;
    return h;
  },
  async listBySchool(schoolId) {
    const url = schoolId ? `${this.base}?school_id=${encodeURIComponent(schoolId)}` : this.base;
    const r = await fetch(url, { headers: this.authHeaders() });
    if (!r.ok) throw new Error('Falha ao carregar publicações');
    const j = await r.json();
    return j.posts || [];
  },
  async createPost(images, caption) {
    // Suporta tanto uma única imagem (string) quanto array de imagens
    const imageArray = Array.isArray(images) ? images : [images];
    const r = await fetch(this.base, { method:'POST', headers: this.authHeaders(), body: JSON.stringify({ images: imageArray, caption }) });
    if (!r.ok) throw new Error((await r.json()).message || 'Falha ao publicar');
    return (await r.json()).post;
  },
  async toggleLike(postId) {
    const r = await fetch(`${this.base}/${postId}/like`, { method:'POST', headers: this.authHeaders() });
    if (!r.ok) throw new Error('Falha ao curtir');
    return (await r.json()).liked;
  },
  async addComment(postId, text) {
    const r = await fetch(`${this.base}/${postId}/comment`, { method:'POST', headers: this.authHeaders(), body: JSON.stringify({ text }) });
    if (!r.ok) throw new Error('Falha ao comentar');
    return (await r.json()).comment;
  },
  async addReply(postId, parentId, text) {
    const r = await fetch(`${this.base}/${postId}/comment`, { method:'POST', headers: this.authHeaders(), body: JSON.stringify({ text, parent_id: parentId }) });
    if (!r.ok) throw new Error('Falha ao responder');
    return (await r.json()).comment;
  },
  async toggleCommentLike(commentId) {
    const r = await fetch(`${this.base}/comments/${commentId}/like`, { method:'POST', headers: this.authHeaders() });
    if (!r.ok) throw new Error('Falha ao curtir comentário');
    return (await r.json()).liked;
  },
  async deletePost(postId) {
    const r = await fetch(`${this.base}/${postId}`, { method:'DELETE', headers: this.authHeaders() });
    if (!r.ok) throw new Error('Falha ao remover');
    return true;
  }
};
