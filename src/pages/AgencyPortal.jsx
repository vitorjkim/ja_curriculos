import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, LayoutGroup } from 'framer-motion';
import { Helmet } from 'react-helmet';
import { 
  Building2, Briefcase, Users, Plus, ExternalLink, Trash2, Edit, 
  BarChart3, Eye, Link2, MapPin, DollarSign, Calendar, X, Check,
  ChevronLeft, ChevronRight, Loader2, Globe, Search, Upload, FileSpreadsheet,
  Download, AlertCircle, CheckCircle2, LinkIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { agencyAPI } from '@/lib/api';

const AgencyPortal = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // State
  const [isAgency, setIsAgency] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ active_jobs: 0, total_jobs: 0, total_applications: 0, unique_candidates: 0 });
  const [jobs, setJobs] = useState([]);
  const [jobsPage, setJobsPage] = useState(1);
  const [jobsTotal, setJobsTotal] = useState(0);
  const [jobsPages, setJobsPages] = useState(1);
  const [candidates, setCandidates] = useState([]);
  const [candidatesPage, setCandidatesPage] = useState(1);
  const [candidatesTotal, setCandidatesTotal] = useState(0);
  const [selectedJobFilter, setSelectedJobFilter] = useState('');

  // External applications state
  const [externalApps, setExternalApps] = useState([]);
  const [externalAppsPage, setExternalAppsPage] = useState(1);
  const [externalAppsTotal, setExternalAppsTotal] = useState(0);
  const [externalAppsPages, setExternalAppsPages] = useState(1);
  const [externalSearch, setExternalSearch] = useState('');

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [saving, setSaving] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [scrapeMessage, setScrapeMessage] = useState('');
  const [scrapeSuccess, setScrapeSuccess] = useState(null);
  const [urlInput, setUrlInput] = useState('');

  // Excel upload state
  const [uploading, setUploading] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const fileInputRef = useRef(null);

  // Active tab
  const [activeTab, setActiveTab] = useState('jobs'); // 'jobs' | 'candidates' | 'external'

  // Form state  
  const [form, setForm] = useState({
    title: '',
    company_name: '',
    external_url: '',
    location: '',
    description: '',
    requirements: '',
    contract_type: '',
    experience_level: '',
    work_type: '',
    salary_min: '',
    salary_max: '',
    area: '',
    subarea: ''
  });

  const resetForm = () => {
    setForm({
      title: '', company_name: '', external_url: '', location: '',
      description: '', requirements: '', contract_type: '', experience_level: '',
      work_type: '', salary_min: '', salary_max: '', area: '', subarea: ''
    });
    setUrlInput('');
    setScrapeMessage('');
    setScrapeSuccess(null);
  };

  // Scrape URL handler
  const handleScrapeUrl = async () => {
    if (!urlInput || !urlInput.startsWith('http')) {
      toast({ title: 'URL inválida', description: 'Cole um link válido começando com http:// ou https://', variant: 'destructive' });
      return;
    }
    setScraping(true);
    setScrapeMessage('');
    setScrapeSuccess(null);
    try {
      const result = await agencyAPI.scrapeUrl(urlInput);
      const data = result.data || {};
      setForm(f => ({
        ...f,
        external_url: urlInput,
        title: data.title || f.title,
        company_name: data.company_name || f.company_name,
        location: data.location || f.location,
        description: data.description || f.description,
        requirements: data.requirements || f.requirements,
        contract_type: data.contract_type || f.contract_type,
        work_type: data.work_type || f.work_type,
        salary_min: data.salary_min || f.salary_min,
        salary_max: data.salary_max || f.salary_max,
      }));
      setScrapeMessage(result.message);
      setScrapeSuccess(result.success);
      if (result.success) {
        toast({ title: 'Dados extraídos!', description: 'Revise as informações antes de salvar.' });
      } else {
        toast({ title: 'Sem dados', description: result.message || 'Preencha os campos manualmente.', variant: 'destructive' });
      }
    } catch (e) {
      setScrapeMessage('Erro ao buscar dados da URL.');
      setScrapeSuccess(false);
      toast({ title: 'Erro', description: 'Não foi possível acessar a URL.', variant: 'destructive' });
    } finally {
      setScraping(false);
    }
  };

  // Excel upload handler
  const handleExcelUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setImportResult(null);
    try {
      const result = await agencyAPI.importCandidates(file);
      setImportResult(result);
      toast({ 
        title: 'Importação concluída!', 
        description: `${result.imported} candidaturas importadas, ${result.linked} vinculadas a alunos.` 
      });
      loadExternalApps();
      loadStats();
    } catch (e) {
      toast({ title: 'Erro na importação', description: e.message || 'Erro ao processar arquivo.', variant: 'destructive' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Load external applications
  const loadExternalApps = useCallback(async (page = 1, search = '') => {
    try {
      const data = await agencyAPI.listExternalApplications(page, search);
      setExternalApps(data.applications || []);
      setExternalAppsTotal(data.total || 0);
      setExternalAppsPages(data.pages || 1);
      setExternalAppsPage(page);
    } catch (e) {
      console.error('Erro carregando candidaturas externas:', e);
    }
  }, []);

  // Check if user is agency
  useEffect(() => {
    // Wait for auth to finish initializing before redirecting
    if (authLoading) return;

    const checkAgency = async () => {
      try {
        const res = await agencyAPI.check();
        setIsAgency(res.isAgency);
        if (!res.isAgency) {
          toast({
            title: 'Acesso negado',
            description: 'Sua conta não possui o plano de agência ativo.',
            variant: 'destructive'
          });
          navigate('/company-dashboard');
        }
      } catch {
        setIsAgency(false);
        navigate('/company-dashboard');
      } finally {
        setLoading(false);
      }
    };
    if (user?.type === 'company') {
      checkAgency();
    } else {
      navigate('/login');
    }
  }, [user, authLoading]);

  // Load data
  const loadStats = useCallback(async () => {
    try {
      const data = await agencyAPI.getStats();
      setStats(data);
    } catch (e) {
      console.error('Erro carregando stats:', e);
    }
  }, []);

  const loadJobs = useCallback(async (page = 1) => {
    try {
      const data = await agencyAPI.listJobs(page);
      setJobs(data.jobs || []);
      setJobsTotal(data.total || 0);
      setJobsPages(data.pages || 1);
      setJobsPage(page);
    } catch (e) {
      console.error('Erro carregando vagas:', e);
    }
  }, []);

  const loadCandidates = useCallback(async (page = 1, jobId = null) => {
    try {
      const data = await agencyAPI.listCandidates(jobId || null, page);
      setCandidates(data.candidates || []);
      setCandidatesTotal(data.total || 0);
      setCandidatesPage(page);
    } catch (e) {
      console.error('Erro carregando candidatos:', e);
    }
  }, []);

  useEffect(() => {
    if (isAgency) {
      loadStats();
      loadJobs();
      loadCandidates();
      loadExternalApps();
    }
  }, [isAgency, loadStats, loadJobs, loadCandidates, loadExternalApps]);

  // Handlers
  const handleCreateJob = async (e) => {
    e.preventDefault();
    const effectiveUrl = form.external_url || urlInput;
    if (!effectiveUrl) {
      toast({ title: 'Campo obrigatório', description: 'Preencha a URL da vaga.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const jobData = { ...form, external_url: effectiveUrl };
      // Fallback title/company
      if (!jobData.title) {
        try { jobData.title = new URL(effectiveUrl).hostname.replace('www.', ''); } catch { jobData.title = 'Vaga Externa'; }
      }
      if (!jobData.company_name) {
        try { jobData.company_name = new URL(effectiveUrl).hostname.replace('www.', ''); } catch { jobData.company_name = 'Empresa'; }
      }
      if (jobData.salary_min) jobData.salary_min = parseFloat(jobData.salary_min);
      if (jobData.salary_max) jobData.salary_max = parseFloat(jobData.salary_max);
      // Remove empty strings
      Object.keys(jobData).forEach(k => { if (jobData[k] === '') delete jobData[k]; });

      await agencyAPI.createJob(jobData);
      toast({ title: 'Vaga criada!', description: 'A vaga de agência foi cadastrada com sucesso.' });
      setShowCreateModal(false);
      resetForm();
      loadJobs();
      loadStats();
    } catch (e) {
      toast({ title: 'Erro', description: e.message || 'Erro ao criar vaga.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleEditJob = (job) => {
    setEditingJob(job);
    setForm({
      title: job.title || '',
      company_name: job.community_company_name || job.original_company_name || '',
      external_url: job.external_url || '',
      location: job.location || '',
      description: job.description || '',
      requirements: job.requirements || '',
      contract_type: job.contract_type || '',
      experience_level: job.experience_level || '',
      work_type: job.work_type || '',
      salary_min: job.salary_min || '',
      salary_max: job.salary_max || '',
      area: job.area || '',
      subarea: job.subarea || ''
    });
    setShowEditModal(true);
  };

  const handleUpdateJob = async (e) => {
    e.preventDefault();
    if (!editingJob) return;
    setSaving(true);
    try {
      const jobData = { ...form };
      if (jobData.salary_min) jobData.salary_min = parseFloat(jobData.salary_min);
      if (jobData.salary_max) jobData.salary_max = parseFloat(jobData.salary_max);
      Object.keys(jobData).forEach(k => { if (jobData[k] === '') delete jobData[k]; });

      await agencyAPI.updateJob(editingJob.id, jobData);
      toast({ title: 'Vaga atualizada!', description: 'As alterações foram salvas.' });
      setShowEditModal(false);
      setEditingJob(null);
      resetForm();
      loadJobs();
    } catch (e) {
      toast({ title: 'Erro', description: e.message || 'Erro ao atualizar.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteJob = async (jobId) => {
    if (!confirm('Tem certeza que deseja excluir esta vaga?')) return;
    try {
      await agencyAPI.deleteJob(jobId);
      toast({ title: 'Vaga excluída', description: 'A vaga foi removida com sucesso.' });
      loadJobs(jobsPage);
      loadStats();
    } catch (e) {
      toast({ title: 'Erro', description: e.message || 'Erro ao excluir.', variant: 'destructive' });
    }
  };

  const handleToggleStatus = async (job) => {
    try {
      await agencyAPI.updateJob(job.id, { is_active: !job.is_active });
      toast({ title: job.is_active ? 'Vaga desativada' : 'Vaga ativada' });
      loadJobs(jobsPage);
      loadStats();
    } catch (e) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    }
  };

  // Job form modal component - URL-first approach
  const JobFormModal = ({ isEdit, onSubmit, onClose }) => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }} 
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-white rounded-t-2xl">
          <h2 className="text-xl font-bold text-gray-900">
            {isEdit ? 'Editar Vaga de Agência' : 'Nova Vaga de Agência'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={onSubmit} className="flex flex-col overflow-hidden" style={{ maxHeight: 'calc(90vh - 88px)' }}>
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* URL Input - Primary field */}
          <div>
            <Label htmlFor="external_url" className="text-base font-semibold">
              {isEdit ? 'URL da Vaga *' : 'Cole o link da vaga *'}
            </Label>
            <p className="text-xs text-gray-500 mb-2">
              {isEdit 
                ? 'Link externo da vaga.' 
                : 'Cole a URL e o sistema tentará extrair automaticamente os dados da vaga.'}
            </p>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Globe className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input 
                  id="external_url" 
                  type="url" 
                  value={isEdit ? form.external_url : urlInput} 
                  onChange={e => {
                    if (isEdit) {
                      setForm(f => ({ ...f, external_url: e.target.value }));
                    } else {
                      setUrlInput(e.target.value);
                    }
                  }} 
                  placeholder="https://site-da-agencia.com/vaga/123" 
                  className="pl-9"
                  required 
                />
              </div>
              {!isEdit && (
                <Button 
                  type="button" 
                  onClick={handleScrapeUrl} 
                  disabled={scraping || !urlInput}
                  className="bg-blue-600 hover:bg-blue-700 text-white flex-shrink-0"
                >
                  {scraping ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Search className="w-4 h-4 mr-2" />
                  )}
                  {scraping ? 'Buscando...' : 'Buscar Dados'}
                </Button>
              )}
            </div>
            {scrapeMessage && (
              <div className={`mt-2 flex items-start gap-2 text-sm p-3 rounded-lg ${
                scrapeSuccess ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}>
                {scrapeSuccess ? <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
                <span>{scrapeMessage}</span>
              </div>
            )}
          </div>

          {/* Extracted/editable fields - always shown in edit mode, or after URL is filled */}
          {(isEdit || urlInput || form.external_url || form.title || form.company_name || scrapeSuccess !== null) && (
            <>
              <div className="border-t pt-4">
                <p className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <Edit className="w-4 h-4" />
                  {scrapeSuccess ? 'Dados extraídos — revise e ajuste se necessário:' : 'Preencha os dados manualmente:'}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title">Título da Vaga</Label>
                  <Input id="title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Ex: Estagiário de TI" />
                </div>
                <div>
                  <Label htmlFor="company_name">Empresa</Label>
                  <Input id="company_name" value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))} placeholder="Nome da empresa contratante" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="location">Localização</Label>
                  <Input id="location" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Ex: São Paulo, SP" />
                </div>
                <div>
                  <Label htmlFor="contract_type">Tipo de Contrato</Label>
                  <select id="contract_type" value={form.contract_type} onChange={e => setForm(f => ({ ...f, contract_type: e.target.value }))} className="w-full h-10 border border-gray-300 rounded-md px-3 text-sm">
                    <option value="">Selecione</option>
                    <option value="estagio">Estágio</option>
                    <option value="clt">CLT</option>
                    <option value="pj">PJ</option>
                    <option value="temporario">Temporário</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="experience_level">Nível de Experiência</Label>
                  <select id="experience_level" value={form.experience_level} onChange={e => setForm(f => ({ ...f, experience_level: e.target.value }))} className="w-full h-10 border border-gray-300 rounded-md px-3 text-sm">
                    <option value="">Selecione</option>
                    <option value="estagio">Estágio</option>
                    <option value="junior">Júnior</option>
                    <option value="pleno">Pleno</option>
                    <option value="senior">Sênior</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="work_type">Modelo de Trabalho</Label>
                  <select id="work_type" value={form.work_type} onChange={e => setForm(f => ({ ...f, work_type: e.target.value }))} className="w-full h-10 border border-gray-300 rounded-md px-3 text-sm">
                    <option value="">Selecione</option>
                    <option value="presencial">Presencial</option>
                    <option value="remoto">Remoto</option>
                    <option value="hibrido">Híbrido</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="salary_min">Salário Mínimo (R$)</Label>
                  <Input id="salary_min" type="number" step="0.01" value={form.salary_min} onChange={e => setForm(f => ({ ...f, salary_min: e.target.value }))} placeholder="0.00" />
                </div>
                <div>
                  <Label htmlFor="salary_max">Salário Máximo (R$)</Label>
                  <Input id="salary_max" type="number" step="0.01" value={form.salary_max} onChange={e => setForm(f => ({ ...f, salary_max: e.target.value }))} placeholder="0.00" />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Descrição</Label>
                <Textarea id="description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Descreva a vaga..." rows={3} />
              </div>

              <div>
                <Label htmlFor="requirements">Requisitos</Label>
                <Textarea id="requirements" value={form.requirements} onChange={e => setForm(f => ({ ...f, requirements: e.target.value }))} placeholder="Requisitos da vaga..." rows={3} />
              </div>
            </>
          )}
          </div>

          <div className="flex justify-end gap-3 p-4 border-t bg-white rounded-b-2xl flex-shrink-0">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button 
              type="submit" 
              disabled={saving || (!isEdit && !urlInput && !form.external_url)} 
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {isEdit ? 'Salvar Alterações' : 'Criar Vaga'}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
      </div>
    );
  }

  if (!isAgency) return null;

  return (
    <>
      <Helmet>
        <title>Portal da Agência - CurrículoJá</title>
      </Helmet>

      <div className="min-h-screen bg-slate-50/80 py-10 px-4">
        <div className="mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Header */}
            <div className="mb-10 flex flex-col items-start justify-between gap-6 rounded-[24px] border-2 border-slate-200 bg-white/90 px-8 py-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)] backdrop-blur-sm md:flex-row md:items-center">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Portal da Agência</p>
                <h1 className="mb-1 text-3xl font-bold tracking-tight text-[#f97316] md:text-4xl">{user?.companyName || user?.name || 'Agência'}</h1>
                <p className="text-sm text-slate-500">Gerencie vagas externas e acompanhe candidatos interessados</p>
              </div>
              <Button
                onClick={() => { resetForm(); setShowCreateModal(true); }}
                className="rounded-2xl border-2 border-[#f97316] bg-[#f97316] px-4 py-2 text-sm font-medium text-white shadow-sm shadow-orange-200 transition-all hover:-translate-y-[1px] hover:border-[#ea580c] hover:bg-[#ea580c]"
              >
                <Plus className="w-4 h-4 mr-2" />
                Nova Vaga
              </Button>
            </div>

            {/* Stats Cards */}
            <div className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {[
                { label: 'Vagas Ativas', value: stats.active_jobs, icon: Briefcase, iconCls: 'bg-green-50 text-green-600', ring: 'ring-green-200', hover: 'hover:border-green-300' },
                { label: 'Total de Vagas', value: stats.total_jobs, icon: Link2, iconCls: 'bg-sky-50 text-sky-600', ring: 'ring-sky-200', hover: 'hover:border-sky-300' },
                { label: 'Candidaturas', value: stats.total_applications, icon: Users, iconCls: 'bg-indigo-50 text-indigo-600', ring: 'ring-indigo-200', hover: 'hover:border-indigo-300' },
                { label: 'Candidatos Únicos', value: stats.unique_candidates, icon: Eye, iconCls: 'bg-amber-50 text-amber-600', ring: 'ring-amber-200', hover: 'hover:border-amber-300' },
              ].map((stat, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                >
                  <Card className={`h-full rounded-[22px] border-2 border-slate-200 bg-white/90 shadow-[0_14px_35px_rgba(15,23,42,0.06)] transition-all hover:-translate-y-[2px] ${stat.hover} hover:shadow-[0_20px_45px_rgba(15,23,42,0.12)]`}>
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{stat.label}</p>
                          <p className="text-3xl font-semibold text-slate-900">{stat.value}</p>
                        </div>
                        <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ring-2 ${stat.iconCls} ${stat.ring}`}>
                          <stat.icon className="h-5 w-5" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* Tabs */}
            <div className="mb-6 flex justify-center">
              <LayoutGroup id="agency-tabs">
                <div className="relative inline-flex items-center gap-1 rounded-full bg-slate-100 border border-slate-200 shadow-sm p-1" role="tablist">
                  {[
                    { id: 'jobs', label: 'Vagas', icon: Briefcase },
                    { id: 'candidates', label: 'Visualizações', icon: Eye },
                    { id: 'external', label: 'Candidaturas Externas', icon: FileSpreadsheet },
                  ].map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        onClick={() => {
                          setActiveTab(tab.id);
                          if (tab.id === 'candidates') loadCandidates(1, selectedJobFilter || null);
                          if (tab.id === 'external') loadExternalApps(1, externalSearch);
                        }}
                        className={`relative inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 ${
                          isActive ? 'text-white' : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        {isActive && (
                          <motion.span
                            layoutId="agencyTabSlider"
                            className="absolute inset-0 rounded-full bg-[#f97316] shadow-md shadow-orange-300"
                            transition={{ type: 'spring', stiffness: 500, damping: 40, mass: 0.3 }}
                          />
                        )}
                        <span className="relative z-10 flex items-center gap-2">
                          <Icon className="w-4 h-4" />
                          {tab.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </LayoutGroup>
            </div>

            {/* Jobs Tab */}
            {activeTab === 'jobs' && (
              <Card className="rounded-[24px] border-2 border-orange-100 bg-white/95 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
                <CardHeader className="border-b border-slate-100 pb-4">
                  <div className="flex justify-between items-center gap-3">
                    <CardTitle className="flex items-center text-base font-semibold text-orange-900">
                      <span className="mr-2 flex h-8 w-8 items-center justify-center rounded-2xl bg-orange-50 text-orange-600 ring-2 ring-orange-200">
                        <Briefcase className="w-4 h-4" />
                      </span>
                      Vagas Cadastradas
                    </CardTitle>
                    <Button
                      onClick={() => { resetForm(); setShowCreateModal(true); }}
                      variant="outline"
                      className="rounded-full border border-orange-200 bg-orange-500/5 px-4 text-[11px] font-bold text-orange-700 shadow-sm shadow-orange-100 hover:border-orange-400 hover:bg-orange-500 hover:text-white hover:shadow-md hover:shadow-orange-200 transition-all duration-300"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" /> Nova Vaga
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-5">
                  {jobs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-orange-200 bg-orange-50/70 py-10">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-orange-500 ring-2 ring-orange-200">
                        <Briefcase className="w-7 h-7" />
                      </div>
                      <p className="text-sm font-medium text-orange-900">Nenhuma vaga cadastrada</p>
                      <p className="text-xs text-slate-500">Comece importando vagas do seu site para aparecerem na plataforma.</p>
                      <Button
                        onClick={() => { resetForm(); setShowCreateModal(true); }}
                        className="mt-1 rounded-2xl border-2 border-[#f97316] bg-[#f97316] px-4 py-2 text-sm font-medium text-white shadow-sm shadow-orange-200 transition-all hover:-translate-y-[1px] hover:border-[#ea580c] hover:bg-[#ea580c]"
                      >
                        <Plus className="w-4 h-4 mr-2" /> Cadastrar Primeira Vaga
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {jobs.map(job => (
                        <div key={job.id} className="rounded-2xl border-2 border-orange-200 bg-white p-4 transition-all duration-300 hover:-translate-y-[1px] hover:border-orange-400 hover:shadow-lg hover:shadow-orange-200/50">
                          <div className="flex items-start gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-orange-50 to-orange-100 border-2 border-orange-200 flex-shrink-0 shadow-sm">
                              <Briefcase className="w-5 h-5 text-orange-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <h3 className="font-bold text-slate-900 text-[14px] truncate">{job.title}</h3>
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0 ${job.is_active ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${job.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                                  {job.is_active ? 'Ativa' : 'Inativa'}
                                </span>
                              </div>
                              <p className="text-[12px] font-medium text-slate-500 mb-2">{job.community_company_name || job.original_company_name}</p>
                              <div className="flex flex-wrap gap-1.5">
                                {job.location && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-medium text-slate-600 border border-slate-200">
                                    <MapPin className="w-3 h-3 text-slate-400" />{job.location}
                                  </span>
                                )}
                                {job.contract_type && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-medium text-slate-600 border border-slate-200">
                                    <Calendar className="w-3 h-3 text-slate-400" />{job.contract_type}
                                  </span>
                                )}
                                {job.external_url && (
                                  <a href={job.external_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-50 text-[10px] font-medium text-orange-600 border border-orange-200 hover:bg-orange-100 transition-colors" onClick={e => e.stopPropagation()}>
                                    <ExternalLink className="w-3 h-3" />Link externo
                                  </a>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
                              <button onClick={() => handleToggleStatus(job)} title={job.is_active ? 'Desativar' : 'Ativar'} className="flex h-8 w-8 items-center justify-center rounded-xl border-2 border-slate-200 bg-white text-slate-400 hover:border-orange-300 hover:bg-orange-50 hover:text-orange-600 transition-all duration-200">
                                {job.is_active ? <X className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5 text-green-500" />}
                              </button>
                              <button onClick={() => handleEditJob(job)} title="Editar" className="flex h-8 w-8 items-center justify-center rounded-xl border-2 border-slate-200 bg-white text-slate-400 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-600 transition-all duration-200">
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => handleDeleteJob(job.id)} title="Excluir" className="flex h-8 w-8 items-center justify-center rounded-xl border-2 border-slate-200 bg-white text-slate-400 hover:border-red-300 hover:bg-red-50 hover:text-red-600 transition-all duration-200">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* Pagination */}
                      {jobsPages > 1 && (
                        <div className="flex justify-center gap-2 mt-4">
                          <Button variant="outline" size="sm" disabled={jobsPage <= 1} onClick={() => loadJobs(jobsPage - 1)} className="rounded-full">
                            <ChevronLeft className="w-4 h-4" />
                          </Button>
                          <span className="flex items-center text-sm text-slate-500">
                            Página {jobsPage} de {jobsPages}
                          </span>
                          <Button variant="outline" size="sm" disabled={jobsPage >= jobsPages} onClick={() => loadJobs(jobsPage + 1)} className="rounded-full">
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Candidates Tab */}
            {activeTab === 'candidates' && (
              <Card className="rounded-[24px] border-2 border-indigo-200 bg-white/95 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
                <CardHeader className="border-b border-slate-100 pb-4">
                  <div className="flex justify-between items-center gap-3 flex-wrap">
                    <CardTitle className="flex items-center text-base font-semibold text-indigo-900">
                      <span className="mr-2 flex h-8 w-8 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 ring-2 ring-indigo-200">
                        <Users className="w-4 h-4" />
                      </span>
                      Candidatos Interessados
                    </CardTitle>
                    <select
                      value={selectedJobFilter}
                      onChange={e => {
                        setSelectedJobFilter(e.target.value);
                        loadCandidates(1, e.target.value || null);
                      }}
                      className="h-8 rounded-full border border-slate-200 bg-slate-50 px-3 text-[11px] text-slate-600"
                    >
                      <option value="">Todas as vagas</option>
                      {jobs.map(j => (
                        <option key={j.id} value={j.id}>{j.title}</option>
                      ))}
                    </select>
                  </div>
                  <p className="mt-2 ml-10 flex items-center gap-1.5 text-[11px] text-slate-500">
                    <Eye className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                    Estes são os alunos que clicaram em <strong className="text-indigo-600">"Ver vaga"</strong> e foram direcionados à página da vaga.
                  </p>
                </CardHeader>
                <CardContent className="pt-5">
                  {candidates.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50/70 py-10">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-indigo-500 ring-2 ring-indigo-200">
                        <Eye className="w-7 h-7" />
                      </div>
                      <p className="text-sm font-medium text-indigo-900">Nenhum aluno visualizou ainda</p>
                      <p className="text-xs text-slate-500 text-center max-w-xs">Quando um aluno clicar em "Ver vaga" e for direcionado à página da vaga, o perfil dele aparecerá aqui.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {candidates.map(c => (
                        <div key={`${c.candidate_id}-${c.job_id}`} className="flex items-center justify-between gap-3 rounded-2xl border-2 border-indigo-200 bg-white p-4 transition-all duration-300 hover:-translate-y-[1px] hover:border-indigo-400 hover:shadow-lg hover:shadow-indigo-200/50">
                          <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-indigo-100 shadow-sm">
                              {c.candidate_image ? (
                                <img src={c.candidate_image} alt="" className="w-full h-full rounded-full object-cover" />
                              ) : (
                                <Users className="w-5 h-5 text-indigo-400" />
                              )}
                            </div>
                            <div>
                              <p className="font-bold text-[14px] text-slate-900 truncate">{c.candidate_name}</p>
                              <p className="text-[11px] text-slate-500 truncate">{c.candidate_email}</p>
                              {c.candidate_phone && <p className="text-[11px] text-slate-400">{c.candidate_phone}</p>}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 text-[10px] font-medium text-indigo-600 border border-indigo-200">
                              <Briefcase className="w-3 h-3" />
                              <span className="truncate max-w-[120px]">{c.job_title}</span>
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-slate-400">{new Date(c.viewed_at).toLocaleDateString('pt-BR')}</span>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 border border-indigo-200">
                                <Eye className="w-3 h-3" /> Visualizou
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* External Applications Tab */}
            {activeTab === 'external' && (
              <Card className="rounded-[24px] border-2 border-amber-100 bg-white/95 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
                <CardHeader className="border-b border-slate-100 pb-4">
                  <CardTitle className="flex items-center text-base font-semibold text-amber-900">
                    <span className="mr-2 flex h-8 w-8 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 ring-2 ring-amber-200">
                      <FileSpreadsheet className="w-4 h-4" />
                    </span>
                    Candidaturas Externas
                  </CardTitle>
                  <p className="text-[11px] text-slate-500 mt-1 pl-10">
                    Importe candidaturas realizadas fora do Já Currículos via planilha Excel. Os dados são vinculados automaticamente ao perfil do aluno cadastrado.
                  </p>
                </CardHeader>
                <CardContent className="pt-5">
                  {/* Upload Area */}
                  <div className="rounded-2xl border-2 border-dashed border-amber-200 bg-amber-50/70 p-6 mb-6">
                    <div className="flex flex-col md:flex-row items-center gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-amber-500 ring-2 ring-amber-200 flex-shrink-0">
                        <Upload className="w-7 h-7" />
                      </div>
                      <div className="flex-1 text-center md:text-left">
                        <h3 className="font-semibold text-amber-900 mb-1">Importar Planilha de Candidaturas</h3>
                        <p className="text-sm text-slate-600 mb-2">
                          Carregue um arquivo Excel (.xlsx, .xls) ou CSV com os dados das candidaturas externas dos alunos.
                        </p>
                        <div className="text-[11px] text-slate-500 space-y-0.5">
                          <p><strong>Colunas aceitas:</strong> Email do Aluno (obrigatório), Nome, Vaga, Empresa, URL, Status, Data, Observações</p>
                          <p>Alunos cadastrados no sistema serão vinculados automaticamente pelo e-mail.</p>
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".xlsx,.xls,.csv"
                          onChange={handleExcelUpload}
                          className="hidden"
                          id="excel-upload"
                        />
                        <Button
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploading}
                          className="rounded-2xl border-2 border-[#f97316] bg-[#f97316] px-4 py-2 text-sm font-medium text-white shadow-sm shadow-orange-200 transition-all hover:-translate-y-[1px] hover:border-[#ea580c] hover:bg-[#ea580c]"
                        >
                          {uploading ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          ) : (
                            <FileSpreadsheet className="w-4 h-4 mr-2" />
                          )}
                          {uploading ? 'Importando...' : 'Selecionar Arquivo'}
                        </Button>
                      </div>
                    </div>

                    {/* Import Result */}
                    {importResult && (
                      <div className="mt-4 p-4 rounded-2xl bg-white border-2 border-emerald-100">
                        <div className="flex items-start gap-3">
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <p className="font-medium text-slate-900">{importResult.message}</p>
                            <div className="flex flex-wrap gap-4 mt-2 text-sm">
                              <span className="text-emerald-700"><strong>{importResult.imported}</strong> importadas</span>
                              <span className="text-sky-700"><strong>{importResult.linked}</strong> vinculadas a alunos</span>
                              {importResult.skipped > 0 && (
                                <span className="text-amber-700"><strong>{importResult.skipped}</strong> ignoradas</span>
                              )}
                            </div>
                            {importResult.errors && importResult.errors.length > 0 && (
                              <div className="mt-2 text-xs text-red-600">
                                {importResult.errors.map((err, i) => (
                                  <p key={i}>{err}</p>
                                ))}
                              </div>
                            )}
                          </div>
                          <button onClick={() => setImportResult(null)} className="text-slate-400 hover:text-slate-600">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Search */}
                  <div className="flex items-center gap-3 mb-5">
                    <div className="relative flex-1 max-w-md">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <Input
                        placeholder="Buscar por nome, email, vaga ou empresa..."
                        value={externalSearch}
                        onChange={e => {
                          setExternalSearch(e.target.value);
                          clearTimeout(window._extSearchTimeout);
                          window._extSearchTimeout = setTimeout(() => {
                            loadExternalApps(1, e.target.value);
                          }, 400);
                        }}
                        className="pl-9 rounded-full border-slate-200"
                      />
                    </div>
                    <span className="text-[11px] font-medium text-slate-400">{externalAppsTotal} registro(s)</span>
                  </div>

                  {/* External Applications List */}
                  {externalApps.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-amber-200 bg-amber-50/70 py-10">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-amber-500 ring-2 ring-amber-200">
                        <FileSpreadsheet className="w-7 h-7" />
                      </div>
                      <p className="text-sm font-medium text-amber-900">Nenhuma candidatura externa</p>
                      <p className="text-xs text-slate-500">Importe uma planilha Excel com as candidaturas dos alunos em vagas externas.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {externalApps.map(app => (
                        <div key={app.id} className="flex items-center justify-between gap-3 rounded-2xl border-2 border-amber-200 bg-white p-4 transition-all duration-300 hover:-translate-y-[1px] hover:border-amber-400 hover:shadow-lg hover:shadow-amber-200/50">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100 shadow-sm flex-shrink-0">
                              {app.linked_student_image ? (
                                <img src={app.linked_student_image} alt="" className="w-full h-full rounded-full object-cover" />
                              ) : (
                                <Users className="w-5 h-5 text-amber-400" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-0.5">
                                <p className="font-bold text-[14px] text-slate-900 truncate">
                                  {app.linked_student_name || app.student_name || app.student_email}
                                </p>
                                {app.student_id && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[9px] font-bold border border-emerald-200 flex-shrink-0">
                                    <CheckCircle2 className="w-2.5 h-2.5" /> Vinculado
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 truncate">{app.student_email}</p>
                              {app.job_title && (
                                <div className="flex items-center flex-wrap gap-1.5 mt-1.5">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-[10px] font-medium text-amber-700 border border-amber-200">
                                    <Briefcase className="w-3 h-3" />
                                    {app.job_title}
                                  </span>
                                  {app.company_name && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-medium text-slate-600 border border-slate-200">
                                      <Building2 className="w-3 h-3" />
                                      {app.company_name}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <div className="flex flex-col items-end gap-1.5">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                app.status === 'hired' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                app.status === 'accepted' ? 'bg-green-50 text-green-700 border-green-200' :
                                app.status === 'rejected' ? 'bg-red-50 text-red-700 border-red-200' :
                                app.status === 'interview' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                app.status === 'pending' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                'bg-slate-50 text-slate-700 border-slate-200'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${
                                  app.status === 'hired' ? 'bg-emerald-500' :
                                  app.status === 'accepted' ? 'bg-green-500' :
                                  app.status === 'rejected' ? 'bg-red-500' :
                                  app.status === 'interview' ? 'bg-blue-500' :
                                  app.status === 'pending' ? 'bg-yellow-500' :
                                  'bg-slate-400'
                                }`} />
                                {app.status === 'hired' ? 'Contratado' :
                                 app.status === 'accepted' ? 'Aceito' :
                                 app.status === 'rejected' ? 'Rejeitado' :
                                 app.status === 'interview' ? 'Entrevista' :
                                 app.status === 'pending' ? 'Pendente' :
                                 app.status === 'applied' ? 'Candidatou' : app.status}
                              </span>
                              <div className="flex items-center gap-2">
                                {app.applied_at && (
                                  <span className="text-[10px] text-slate-400">{new Date(app.applied_at).toLocaleDateString('pt-BR')}</span>
                                )}
                                {app.external_url && (
                                  <a href={app.external_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-[10px] text-orange-600 hover:text-orange-700 font-medium">
                                    <ExternalLink className="w-3 h-3" />Link
                                  </a>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={async () => {
                                if (!confirm('Remover esta candidatura externa?')) return;
                                try {
                                  await agencyAPI.deleteExternalApplication(app.id);
                                  toast({ title: 'Removida' });
                                  loadExternalApps(externalAppsPage, externalSearch);
                                } catch (e) {
                                  toast({ title: 'Erro', description: e.message, variant: 'destructive' });
                                }
                              }}
                              className="flex h-8 w-8 items-center justify-center rounded-xl border-2 border-slate-200 bg-white text-slate-400 hover:border-red-300 hover:bg-red-50 hover:text-red-600 transition-all duration-200"
                              title="Remover"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}

                      {/* Pagination */}
                      {externalAppsPages > 1 && (
                        <div className="flex justify-center gap-2 mt-4">
                          <Button variant="outline" size="sm" disabled={externalAppsPage <= 1} onClick={() => loadExternalApps(externalAppsPage - 1, externalSearch)} className="rounded-full">
                            <ChevronLeft className="w-4 h-4" />
                          </Button>
                          <span className="flex items-center text-sm text-slate-500">
                            Página {externalAppsPage} de {externalAppsPages}
                          </span>
                          <Button variant="outline" size="sm" disabled={externalAppsPage >= externalAppsPages} onClick={() => loadExternalApps(externalAppsPage + 1, externalSearch)} className="rounded-full">
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </motion.div>
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <JobFormModal isEdit={false} onSubmit={handleCreateJob} onClose={() => setShowCreateModal(false)} />
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <JobFormModal isEdit={true} onSubmit={handleUpdateJob} onClose={() => { setShowEditModal(false); setEditingJob(null); resetForm(); }} />
      )}
    </>
  );
};

export default AgencyPortal;
