// Saved Jobs - API-backed with localStorage fallback
// Stored in database via API, with localStorage as backup

import api from './api';

const STORAGE_KEY = 'saved_jobs_v1';

// ---- LocalStorage helpers (fallback) ----
function readStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const obj = JSON.parse(raw);
    if (obj && typeof obj === 'object') return obj;
    return {};
  } catch { return {}; }
}

function writeStore(store) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    try { window.dispatchEvent(new Event('saved-jobs-updated')); } catch { /* ignore */ }
  } catch { /* ignore */ }
}

// ---- API-based functions ----

// List all saved jobs
export async function listSavedJobs() {
  try {
    const jobs = await api.get('/saved-jobs');
    return Array.isArray(jobs) ? jobs : [];
  } catch (error) {
    console.error('Erro ao listar vagas salvas da API, usando localStorage:', error);
    return Object.values(readStore());
  }
}

// Get set of saved job IDs
export async function getSavedJobIds() {
  try {
    const ids = await api.get('/saved-jobs/ids');
    return new Set(Array.isArray(ids) ? ids : []);
  } catch (error) {
    console.error('Erro ao buscar IDs de vagas salvas da API:', error);
    return new Set(Object.keys(readStore()));
  }
}

// Check if a job is saved (sync version for UI - uses cached state)
export function isJobSavedSync(jobId, savedIdsSet) {
  return savedIdsSet.has(String(jobId));
}

// Save a job
export async function saveJob(job) {
  if (!job || !job.id) return;
  
  try {
    await api.post(`/saved-jobs/${job.id}`);
    // Dispatch event for UI update
    try { window.dispatchEvent(new Event('saved-jobs-updated')); } catch { /* ignore */ }
  } catch (error) {
    console.error('Erro ao salvar vaga na API, salvando localmente:', error);
    // Fallback to localStorage
    const store = readStore();
    store[job.id] = {
      id: job.id,
      title: job.title || 'Vaga',
      company_name: job.company_name || '',
      location: job.location || '',
      savedAt: Date.now(),
    };
    writeStore(store);
  }
}

// Remove a saved job
export async function removeJob(jobId) {
  try {
    await api.delete(`/saved-jobs/${jobId}`);
    try { window.dispatchEvent(new Event('saved-jobs-updated')); } catch { /* ignore */ }
  } catch (error) {
    console.error('Erro ao remover vaga da API:', error);
    // Fallback to localStorage
    const store = readStore();
    delete store[jobId];
    writeStore(store);
  }
}

// Migrate local saved jobs to API (call once on login)
export async function migrateLocalSavedJobs() {
  try {
    const localStore = readStore();
    const localJobIds = Object.keys(localStore);
    if (localJobIds.length === 0) return;
    
    // Check if user already has saved jobs in API
    const apiIds = await api.get('/saved-jobs/ids');
    if (apiIds.length > 0) {
      // User already has API saved jobs, clear local
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
    
    // Migrate each local saved job to API
    for (const jobId of localJobIds) {
      try {
        await api.post(`/saved-jobs/${jobId}`);
      } catch (e) {
        // Job may not exist anymore, skip
        console.warn(`Não foi possível migrar vaga ${jobId}:`, e.message);
      }
    }
    
    // Clear local storage after successful migration
    localStorage.removeItem(STORAGE_KEY);
    console.log(`✅ Migradas ${localJobIds.length} vagas salvas para o servidor`);
  } catch (error) {
    console.error('Erro ao migrar vagas salvas:', error);
  }
}

// Legacy sync function for backward compatibility (deprecated - use async version)
export function isJobSaved(jobId) {
  const store = readStore();
  return Boolean(store[jobId]);
}
