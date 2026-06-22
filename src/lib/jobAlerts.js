// Job alerts stored in database via API
// Fallback to localStorage for offline/legacy support

import api from './api';

// Legacy localStorage key prefix
const KEY_PREFIX = 'cj_job_alerts_v1_';

// Load alerts from API
export const loadAlerts = async (userId) => {
  if (!userId) return [];
  try {
    const response = await api.get('/job-alerts');
    return Array.isArray(response) ? response : [];
  } catch (error) {
    console.error('Erro ao carregar alertas da API, usando localStorage:', error);
    // Fallback to localStorage
    return loadAlertsFromStorage(userId);
  }
};

// Load from localStorage (fallback)
const loadAlertsFromStorage = (userId) => {
  try {
    if (!userId) return [];
    const raw = localStorage.getItem(KEY_PREFIX + userId);
    const arr = JSON.parse(raw || '[]');
    return Array.isArray(arr) ? arr : [];
  } catch (_) {
    return [];
  }
};

// Save to localStorage (legacy/backup)
const saveAlertsToStorage = (userId, alerts) => {
  if (!userId) return;
  try {
    localStorage.setItem(KEY_PREFIX + userId, JSON.stringify(alerts || []));
  } catch (_) {}
};

// Add alert via API
export const addAlert = async (userId, alert) => {
  const payload = {
    name: alert.name || 'Minha busca',
    filters: {
      location: alert.filters?.location || '',
      contract_type: alert.filters?.contract_type || 'Todos',
      work_type: alert.filters?.work_type || 'Todos',
      experience_level: alert.filters?.experience_level || 'Todos',
      area: alert.filters?.area || 'Todos',
      subarea: alert.filters?.subarea || 'Todos',
    }
  };
  
  try {
    const created = await api.post('/job-alerts', payload);
    return created;
  } catch (error) {
    console.error('Erro ao criar alerta na API, salvando localmente:', error);
    // Fallback: save locally
    const all = loadAlertsFromStorage(userId);
    const id = `${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
    const localPayload = {
      id,
      ...payload,
      active: true,
      created_at: new Date().toISOString()
    };
    all.unshift(localPayload);
    saveAlertsToStorage(userId, all);
    return localPayload;
  }
};

// Remove alert via API
export const removeAlert = async (userId, alertId) => {
  try {
    await api.delete(`/job-alerts/${alertId}`);
    return await loadAlerts(userId);
  } catch (error) {
    console.error('Erro ao remover alerta da API:', error);
    // Fallback
    const all = loadAlertsFromStorage(userId);
    const next = all.filter(a => a.id !== alertId);
    saveAlertsToStorage(userId, next);
    return next;
  }
};

// Toggle alert active status via API
export const toggleAlert = async (userId, alertId, active) => {
  try {
    const updated = await api.patch(`/job-alerts/${alertId}`, { active });
    return updated;
  } catch (error) {
    console.error('Erro ao atualizar alerta na API:', error);
    // Fallback
    const all = loadAlertsFromStorage(userId).map(a => 
      a.id === alertId ? { ...a, active: typeof active === 'boolean' ? active : !a.active } : a
    );
    saveAlertsToStorage(userId, all);
    return all.find(a => a.id === alertId);
  }
};

// Migrate localStorage alerts to API (call once on login)
export const migrateLocalAlerts = async (userId) => {
  if (!userId) return;
  try {
    const localAlerts = loadAlertsFromStorage(userId);
    if (localAlerts.length === 0) return;
    
    // Check if user already has alerts in API
    const apiAlerts = await api.get('/job-alerts');
    if (apiAlerts.length > 0) {
      // User already has API alerts, clear local
      localStorage.removeItem(KEY_PREFIX + userId);
      return;
    }
    
    // Migrate each local alert to API
    for (const alert of localAlerts) {
      await api.post('/job-alerts', {
        name: alert.name,
        filters: alert.filters
      });
    }
    
    // Clear local storage after successful migration
    localStorage.removeItem(KEY_PREFIX + userId);
    console.log(`✅ Migrados ${localAlerts.length} alertas para o servidor`);
  } catch (error) {
    console.error('Erro ao migrar alertas:', error);
  }
};

// Matching util used in Dashboard (unchanged)
export const isJobMatch = (job, filters = {}) => {
  if (!job) return false;
  const f = filters || {};
  const txt = (v) => String(v||'').toLowerCase();
  if (f.location && !txt(job.location).includes(txt(f.location))) return false;
  if (f.contract_type && f.contract_type !== 'Todos' && job.contract_type !== f.contract_type) return false;
  if (f.work_type && f.work_type !== 'Todos' && job.work_type !== f.work_type) return false;
  if (f.experience_level && f.experience_level !== 'Todos' && job.experience_level !== f.experience_level) return false;
  if (f.area && f.area !== 'Todos' && job.area !== f.area) return false;
  if (f.subarea && f.subarea !== 'Todos' && job.subarea !== f.subarea) return false;
  return true;
};
