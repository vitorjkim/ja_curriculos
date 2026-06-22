import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Helmet } from 'react-helmet';
import { Briefcase, Plus, Eye, Edit, Trash2, Users, Calendar, MapPin, DollarSign, Star, Zap, LayoutPanelLeft, Clock, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/use-toast';
import api from '@/lib/api';
import { jobs as jobsAPI, applications as applicationsAPI } from '@/lib/api';
import { companySchoolApi } from '@/lib/companySchoolApi';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const MyJobs = () => {
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [schools, setSchools] = useState([]);
  const [schoolsLoading, setSchoolsLoading] = useState(false);
  const [schoolsError, setSchoolsError] = useState('');
  const [premiumLocked, setPremiumLocked] = useState(false);
  const [requestingJob, setRequestingJob] = useState(null);
  const [selectedSchoolId, setSelectedSchoolId] = useState('');
  const [requestMessage, setRequestMessage] = useState('');
  // === Destaque direto (premium) ===
  const [directHighlightJob, setDirectHighlightJob] = useState(null);
  const [directSchools, setDirectSchools] = useState([]);
  const [directClasses, setDirectClasses] = useState([]);
  const [selectedDirectSchoolId, setSelectedDirectSchoolId] = useState('');
  const [selectedDirectClassId, setSelectedDirectClassId] = useState('');
  const [directLoading, setDirectLoading] = useState(false);
  const [directError, setDirectError] = useState('');
  const [jobDirectCounts, setJobDirectCounts] = useState({}); // jobId => {count, highlights: []}
  const [sortMode, setSortMode] = useState('recent_application'); // 'recent_application' | 'created_at'
  const [sortOpen, setSortOpen] = useState(false);

  useEffect(() => {
    if (!user || user.type !== 'company') return;

    const loadSchools = async () => {
      setSchoolsLoading(true);
      setSchoolsError('');
      setPremiumLocked(false);
      try {
        const sch = await companySchoolApi.listSchools();
        setSchools(sch.schools || []);
      } catch (e) {
        const msg = (e?.message || '').toString();
        if (msg.toLowerCase().includes('premium')) {
          setPremiumLocked(true);
        } else {
          setSchoolsError(msg || 'Falha ao carregar escolas');
        }
        setSchools([]);
      } finally {
        setSchoolsLoading(false);
      }
    };

    const loadData = async () => {
      console.log("🔍 MyJobs: Carregando dados para empresa:", user);
      try {
        console.log("📡 MyJobs: Chamando jobsAPI.getCompanyJobs()...");
        const jobsResponse = await jobsAPI.getCompanyJobs();
        setJobs(jobsResponse.jobs || []);
        try {
          const applicationsResponse = await applicationsAPI.getCompanyApplications();
          setApplications(applicationsResponse.applications || []);
        } catch (appError) {
          console.log("⚠️ MyJobs: Erro ao carregar applications (ignorado):", appError.message);
          setApplications([]);
        }
      } catch (error) {
        console.error('❌ MyJobs: Erro ao carregar jobs/aplications (fallback localStorage):', error);
        const allJobs = JSON.parse(localStorage.getItem('curriculoja_jobs') || '[]');
        setJobs(allJobs.filter(job => job.companyId === user.id));
        const allApplications = JSON.parse(localStorage.getItem('curriculoja_applications') || '[]');
        setApplications(allApplications.filter(app => app.companyId === user.id));
      } finally {
        setLoading(false);
      }
      // Buscar escolas sempre (independente de sucesso em jobs)
      loadSchools();
    };

    loadData();
  }, [user]);

  const handleDelete = async (jobId) => {
    try {
      await jobsAPI.delete(jobId);
      setJobs(jobs.filter(job => job.id !== jobId));
      toast({
        title: 'Vaga excluída',
        description: 'A vaga foi removida com sucesso.'
      });
    } catch (error) {
      console.error('Erro ao excluir vaga:', error);
      
      const allJobs = JSON.parse(localStorage.getItem('curriculoja_jobs') || '[]');
      const updatedJobs = allJobs.filter(job => job.id !== jobId);
      localStorage.setItem('curriculoja_jobs', JSON.stringify(updatedJobs));
      
      setJobs(jobs.filter(job => job.id !== jobId));
      
      toast({
        title: 'Vaga excluída',
        description: 'A vaga foi removida com sucesso.'
      });
    }
  };

  const openRequestDialog = (job) => {
    setRequestingJob(job);
    setSelectedSchoolId('');
    setRequestMessage('');
  };

  const openDirectHighlightDialog = async (job) => {
    if (!user || user.subscriptionPlan !== 'premium') {
      toast({ title: 'Recurso Premium', description: 'Faça upgrade para destacar diretamente em turmas.', variant: 'destructive' });
      return;
    }
    setDirectHighlightJob(job);
    setSelectedDirectSchoolId('');
    setSelectedDirectClassId('');
    setDirectClasses([]);
    setDirectError('');
    setDirectLoading(true);
    try {
      const schoolsResp = await jobsAPI.listCompanyHighlightSchools();
      setDirectSchools(schoolsResp.schools || []);
      // carregar counts existentes
      const existing = await jobsAPI.listCompanyHighlightsForJob(job.id);
      setJobDirectCounts(prev => ({
        ...prev,
        [job.id]: { count: existing.highlights?.length || 0, highlights: existing.highlights || [] }
      }));
    } catch (e) {
      setDirectError(e.message || 'Erro ao carregar dados');
    } finally {
      setDirectLoading(false);
    }
  };

  const loadDirectClasses = async (schoolId) => {
    setSelectedDirectClassId('');
    setDirectClasses([]);
    if (!schoolId) return;
    setDirectLoading(true);
    setDirectError('');
    try {
      const cls = await jobsAPI.listCompanyHighlightSchoolClasses(schoolId);
      setDirectClasses(cls.classes || []);
    } catch (e) {
      setDirectError(e.message || 'Erro ao carregar turmas');
    } finally {
      setDirectLoading(false);
    }
  };

  const submitDirectHighlight = async () => {
    if (!selectedDirectSchoolId || !selectedDirectClassId) {
      toast({ title: 'Selecione escola e turma', variant: 'destructive' });
      return;
    }
    setDirectLoading(true);
    try {
      const r = await jobsAPI.createDirectCompanyHighlight(directHighlightJob.id, selectedDirectSchoolId, selectedDirectClassId);
      toast({ title: 'Destaque criado', description: `Restam ${r.remaining} do limite de 3.` });
      // atualizar lista
      const existing = await jobsAPI.listCompanyHighlightsForJob(directHighlightJob.id);
      setJobDirectCounts(prev => ({
        ...prev,
        [directHighlightJob.id]: { count: existing.highlights?.length || 0, highlights: existing.highlights || [] }
      }));
      // reset seleção de turma (permite adicionar outra)
      setSelectedDirectClassId('');
    } catch (e) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setDirectLoading(false);
    }
  };

  const submitHighlightRequest = async () => {
    if (!selectedSchoolId) {
      toast({ title: 'Selecione uma escola', variant: 'destructive' });
      return;
    }
    try {
      await jobsAPI.requestHighlight(requestingJob.id, selectedSchoolId, requestMessage || undefined);
      toast({ title: 'Solicitação enviada', description: 'A escola receberá sua solicitação de destaque.' });
      setRequestingJob(null);
    } catch (e) {
      toast({ title: 'Erro ao enviar solicitação', description: e.message, variant: 'destructive' });
    }
  };

  const getJobApplicationsCount = (jobId) => {
    // Tentar com ambos os campos possíveis (job_id e jobId) para compatibilidade
    const count = applications.filter(app => app.job_id === jobId || app.jobId === jobId).length;
    console.log(`🔍 Contando candidaturas para vaga ${jobId}:`, count, 'de', applications.length, 'total');
    return count;
  };

  // Função para calcular candidaturas não lidas por vaga
  const getUnreadApplicationsCount = (jobId) => {
    const lastSeenKey = `company_job_applications_seen_${user.id}_${jobId}`;
    const lastSeenTimestamp = localStorage.getItem(lastSeenKey);
    const lastSeen = lastSeenTimestamp ? new Date(lastSeenTimestamp) : new Date(0);
    
    const jobApps = applications.filter(app => app.job_id === jobId || app.jobId === jobId);
    const unreadCount = jobApps.filter(app => {
      const appliedAt = new Date(app.applied_at || app.created_at);
      return appliedAt > lastSeen;
    }).length;
    
    return unreadCount;
  };

  // Função para obter a data da última candidatura de uma vaga
  const getLatestApplicationDate = (jobId) => {
    const jobApps = applications.filter(app => app.job_id === jobId || app.jobId === jobId);
    if (jobApps.length === 0) return null;
    
    // Encontrar a candidatura mais recente (applied_at ou created_at)
    let latestDate = null;
    for (const app of jobApps) {
      const dateStr = app.applied_at || app.created_at;
      if (dateStr) {
        const date = new Date(dateStr);
        if (!latestDate || date > latestDate) {
          latestDate = date;
        }
      }
    }
    return latestDate;
  };

  // Ordenar vagas conforme sortMode
  const sortedJobs = useMemo(() => {
    return [...jobs].sort((a, b) => {
      if (sortMode === 'recent_application') {
        const dateA = getLatestApplicationDate(a.id);
        const dateB = getLatestApplicationDate(b.id);
        if (dateA && !dateB) return -1;
        if (!dateA && dateB) return 1;
        if (dateA && dateB) return dateB.getTime() - dateA.getTime();
      }
      // Fallback / 'created_at' mode: ordenar por data de criação
      const createdA = new Date(a.created_at || 0);
      const createdB = new Date(b.created_at || 0);
      return createdB.getTime() - createdA.getTime();
    });
  }, [jobs, applications, sortMode]);

  if (!user || user.type !== 'company') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="p-6 text-center">
            <p>Acesso restrito a empresas.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Minhas Vagas - CurrículoJá</title>
        <meta name="description" content="Gerencie todas as vagas da sua empresa no CurrículoJá." />
      </Helmet>

      <div className="min-h-screen bg-slate-50/80 py-6 sm:py-10 px-3 sm:px-4">
        <div className="mx-auto max-w-6xl">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-6 sm:mb-8 flex flex-col items-start justify-between gap-4 sm:gap-6 rounded-[20px] sm:rounded-[24px] border-2 border-slate-200 bg-white/90 px-4 sm:px-8 py-5 sm:py-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)] backdrop-blur-sm md:flex-row md:items-center"
            >
              <div>
                <p className="mb-1.5 sm:mb-2 text-[10px] sm:text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Gestão de Vagas</p>
                <h1 className="mb-1 text-2xl sm:text-3xl font-bold tracking-tight md:text-4xl">
                  <span className="text-gray-900">Minhas </span>
                  <span className="text-[#2563eb]">Vagas</span>
                </h1>
                <p className="text-xs sm:text-sm text-slate-500">
                  Publique uma nova oportunidade e encontre candidatos qualificados
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                {/* Filtro de ordenação - Dropdown */}
                <div className="relative" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setSortOpen(false); }}>
                  <button
                    onClick={() => setSortOpen(o => !o)}
                    className="flex items-center gap-2 rounded-2xl border-2 border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 shadow-sm transition-all hover:-translate-y-[1px] hover:border-slate-300 hover:text-slate-800"
                  >
                    {sortMode === 'recent_application' ? <Users className="h-3.5 w-3.5 text-[#2563eb]" /> : <Clock className="h-3.5 w-3.5 text-[#2563eb]" />}
                    <span className="text-slate-800">{sortMode === 'recent_application' ? 'Candidatura recente' : 'Mais recente criada'}</span>
                    <motion.span animate={{ rotate: sortOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                      <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                    </motion.span>
                  </button>
                  <AnimatePresence>
                    {sortOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -6, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.97 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 top-[calc(100%+6px)] z-50 w-52 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl"
                      >
                        <button
                          onClick={() => { setSortMode('recent_application'); setSortOpen(false); }}
                          className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
                            sortMode === 'recent_application' ? 'bg-blue-50 text-[#2563eb]' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                          }`}
                        >
                          <Users className="h-3.5 w-3.5" />
                          Candidatura recente
                          {sortMode === 'recent_application' && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#2563eb]" />}
                        </button>
                        <button
                          onClick={() => { setSortMode('created_at'); setSortOpen(false); }}
                          className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
                            sortMode === 'created_at' ? 'bg-blue-50 text-[#2563eb]' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                          }`}
                        >
                          <Clock className="h-3.5 w-3.5" />
                          Mais recente criada
                          {sortMode === 'created_at' && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#2563eb]" />}
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <Button
                  asChild
                  className="w-full sm:w-auto rounded-2xl border-2 border-[#2563eb] bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-sky-200 transition-all hover:-translate-y-[1px] hover:border-[#1d4ed8] hover:bg-[#1d4ed8]"
                >
                  <Link to="/create-job" className="flex items-center justify-center gap-2 text-white">
                    <Plus className="h-4 w-4" />
                    <span>Criar Nova Vaga</span>
                  </Link>
                </Button>
              </div>
            </motion.div>

            {loading ? (
              <div className="py-12 text-center">
                <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-slate-400"></div>
                <p className="mt-4 text-sm text-slate-600">Carregando suas vagas...</p>
              </div>
            ) : jobs.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-12 text-center"
              >
                <Briefcase className="mx-auto mb-6 h-20 w-20 text-slate-300" />
                <h3 className="mb-2 text-xl font-semibold text-slate-900">
                  Nenhuma vaga cadastrada
                </h3>
                <p className="mx-auto mb-6 max-w-md text-sm text-slate-500">
                  Comece criando sua primeira vaga e encontre os melhores talentos para sua empresa.
                </p>
                <Button
                  asChild
                  className="rounded-full border-2 border-[#2563eb] bg-[#2563eb] px-6 py-2.5 text-sm font-semibold text-white shadow-[0_18px_35px_rgba(37,99,235,0.35)] transition-all hover:-translate-y-[1px] hover:bg-[#1d4ed8] hover:border-[#1d4ed8] hover:shadow-[0_22px_45px_rgba(37,99,235,0.45)]"
                >
                  <Link to="/create-job" className="flex items-center text-white">
                    <Plus className="mr-2 h-4 w-4" />
                    Criar Primeira Vaga
                  </Link>
                </Button>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 items-stretch"
              >
                <AnimatePresence>
                  {sortedJobs.map((job) => (
                    <motion.div
                      key={job.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      whileHover={{ y: -4 }}
                      className="group h-full"
                    >
                      <Card className="h-full flex flex-col rounded-[18px] sm:rounded-[22px] border-2 border-slate-200 bg-white/95 shadow-[0_16px_40px_rgba(15,23,42,0.06)] transition-all duration-300 hover:-translate-y-[2px] hover:border-sky-300 hover:shadow-[0_20px_50px_rgba(15,23,42,0.12)]">
                        <CardHeader className="pb-3 sm:pb-4 px-4 sm:px-6 pt-4 sm:pt-6">
                          <div className="mb-2 flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              <div className="rounded-xl sm:rounded-2xl bg-sky-50 p-1.5 sm:p-2 text-sky-600 ring-2 ring-sky-100">
                                <Briefcase className="h-4 w-4 sm:h-5 sm:w-5" />
                              </div>
                              {getUnreadApplicationsCount(job.id) > 0 && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-full">
                                  {getUnreadApplicationsCount(job.id)} {getUnreadApplicationsCount(job.id) === 1 ? 'novo' : 'novos'}
                                </span>
                              )}
                            </div>
                            <div className="flex gap-0.5 sm:gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                asChild
                                title="Visualizar vaga"
                                aria-label="Visualizar vaga"
                                className="rounded-md p-2 opacity-0 transition-opacity group-hover:opacity-100"
                              >
                                <Link to={`/job/${job.id}`} title="Visualizar vaga" aria-label="Visualizar vaga">
                                  <Eye className="w-4 h-4" />
                                </Link>
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                asChild
                                title="Editar vaga"
                                aria-label="Editar vaga"
                                className="rounded-md p-2 opacity-0 transition-opacity group-hover:opacity-100"
                              >
                                <Link to={`/edit-job/${job.id}`} title="Editar vaga" aria-label="Editar vaga">
                                  <Edit className="w-4 h-4" />
                                </Link>
                              </Button>
                  <Button size="sm" variant="ghost" className="rounded-md p-2 opacity-0 transition-opacity group-hover:opacity-100" onClick={()=>openRequestDialog(job)} title="Solicitar destaque para escola" aria-label="Solicitar destaque para escola">
                                    <Star className="w-4 h-4 text-amber-600" />
                                  </Button>
                  <Button size="sm" variant="ghost" className="rounded-md p-2 opacity-0 transition-opacity group-hover:opacity-100" onClick={()=>openDirectHighlightDialog(job)} title={user?.subscriptionPlan==='premium' ? 'Destacar diretamente (Premium)' : 'Recurso Premium: destacar diretamente'} aria-label={user?.subscriptionPlan==='premium' ? 'Destacar diretamente (Premium)' : 'Recurso Premium: destacar diretamente'}>
                                    <Zap className={`w-4 h-4 ${user?.subscriptionPlan==='premium' ? 'text-indigo-600' : 'text-gray-400'}`} />
                                  </Button>
                <Dialog open={!!requestingJob && requestingJob?.id===job.id} onOpenChange={(o)=>{ if(!o) setRequestingJob(null); }}>
                                <DialogContent className="sm:max-w-lg">
                                  <DialogHeader>
                                    <DialogTitle className="text-xl">Solicitar destaque para escola</DialogTitle>
                                    <DialogDescription>Selecione a escola para solicitar que recomende esta vaga aos alunos.</DialogDescription>
                                  </DialogHeader>
                                  <div className="space-y-4">

                                    {schoolsLoading ? (
                                      <div className="text-sm text-gray-600">Carregando escolas…</div>
                                    ) : premiumLocked ? (
                                      <div className="text-sm bg-amber-50 border border-amber-200 text-amber-800 rounded-md p-3">
                                        Este recurso está disponível apenas para empresas com plano <strong>Premium</strong> ativo.
                                        <div className="mt-2">
                                          <Link to="/subscription-plans" className="underline font-medium">Atualize seu plano</Link> para solicitar destaques às escolas.
                                        </div>
                                      </div>
                                    ) : schoolsError ? (
                                      <div className="text-sm bg-red-50 border border-red-200 text-red-700 rounded-md p-3">{schoolsError}</div>
                                    ) : schools.length === 0 ? (
                                      <div className="text-sm bg-gray-50 border border-gray-200 text-gray-700 rounded-md p-3">
                                        Nenhuma escola disponível no momento.
                                        <div className="mt-2">
                                          Explore a lista de <Link to="/company/schools" className="underline font-medium">Escolas</Link>.
                                        </div>
                                      </div>
                                    ) : (
                                      <>
                                        <div>
                                          <label className="text-xs font-medium text-gray-600">Escola</label>
                                          <select value={selectedSchoolId} onChange={(e)=>setSelectedSchoolId(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500">
                                            <option value="">Selecione uma escola…</option>
                                            {schools.map(s => (
                                              <option key={s.id} value={s.id}>{s.school_name || s.schoolName || s.name}</option>
                                            ))}
                                          </select>
                                        </div>
                                        <div>
                                          <label className="text-xs font-medium text-gray-600">Mensagem (opcional)</label>
                                          <textarea value={requestMessage} onChange={(e)=>setRequestMessage(e.target.value)} placeholder="Explique por que esta vaga é interessante para os alunos." className="mt-1 w-full border border-gray-300 rounded-md p-2 text-sm min-h-[90px] focus:outline-none focus:ring-2 focus:ring-amber-500" />
                                        </div>
                                      </>
                                    )}

                                    <div className="flex justify-end gap-2 pt-2">
                                      <Button variant="outline" onClick={()=>setRequestingJob(null)}>Cancelar</Button>
                                      <Button onClick={submitHighlightRequest} disabled={!selectedSchoolId || premiumLocked || schoolsLoading || schools.length===0} className="bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-50 disabled:cursor-not-allowed">Enviar solicitação</Button>
                                    </div>
                                  </div>
                                </DialogContent>
                              </Dialog>
                              {/* Dialog destaque direto (premium) */}
                              <Dialog open={!!directHighlightJob && directHighlightJob?.id===job.id} onOpenChange={(o)=>{ if(!o) setDirectHighlightJob(null); }}>
                                <DialogContent className="sm:max-w-lg">
                                  <DialogHeader>
                                    <DialogTitle className="text-xl flex items-center gap-2"> <Zap className="w-5 h-5 text-indigo-600"/> Destaque direto (Premium)</DialogTitle>
                                    <DialogDescription>Selecione escola e turma (limite 3 turmas por vaga).</DialogDescription>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    {directError && <div className="text-sm bg-red-50 border border-red-200 text-red-700 rounded-md p-2">{directError}</div>}
                                    {directLoading && <div className="text-sm text-gray-600">Carregando...</div>}
                                    {!directLoading && !directError && (
                                      <>
                                        <div className="flex justify-between items-center text-xs text-gray-600">
                                          <span>Usados: {(jobDirectCounts[job.id]?.count)||0}/3</span>
                                          <span>Restantes: {Math.max(0, 3 - ((jobDirectCounts[job.id]?.count)||0))}</span>
                                        </div>
                                        <div>
                                          <label className="text-xs font-medium text-gray-600">Escola</label>
                                          <select value={selectedDirectSchoolId} onChange={(e)=>{ setSelectedDirectSchoolId(e.target.value); loadDirectClasses(e.target.value); }} className="mt-1 w-full border border-gray-300 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                                            <option value="">Selecione…</option>
                                            {directSchools.map(s => <option key={s.id} value={s.id}>{s.school_name || s.schoolName || s.name}</option>)}
                                          </select>
                                        </div>
                                        <div>
                                          <label className="text-xs font-medium text-gray-600">Turma</label>
                                          <select value={selectedDirectClassId} onChange={(e)=>setSelectedDirectClassId(e.target.value)} disabled={!selectedDirectSchoolId || directClasses.length===0} className="mt-1 w-full border border-gray-300 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50">
                                            <option value="">{selectedDirectSchoolId ? (directClasses.length>0 ? 'Selecione a turma…' : 'Nenhuma turma') : 'Escolha uma escola primeiro'}</option>
                                            {directClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                          </select>
                                        </div>
                                        <div className="border-t pt-3">
                                          <p className="text-xs font-semibold text-gray-700 mb-1">Já destacados:</p>
                                          <div className="max-h-32 overflow-y-auto space-y-1 text-xs">
                                            {(jobDirectCounts[job.id]?.highlights || []).length === 0 && <div className="text-gray-400">Nenhum ainda</div>}
                                            {(jobDirectCounts[job.id]?.highlights || []).map(h => (
                                              <div key={h.id} className="px-2 py-1 rounded bg-indigo-50 text-indigo-700 flex items-center gap-2">
                                                <Zap className="w-3 h-3"/> {h.school_name} / {h.class_name}
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      </>
                                    )}
                                    <div className="flex justify-end gap-2 pt-2">
                                      <Button variant="outline" onClick={()=>setDirectHighlightJob(null)}>Fechar</Button>
                                      <Button onClick={submitDirectHighlight} disabled={directLoading || !selectedDirectSchoolId || !selectedDirectClassId || ((jobDirectCounts[job.id]?.count)||0) >=3} className="bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 disabled:cursor-not-allowed">Destacar</Button>
                                    </div>
                                  </div>
                                </DialogContent>
                              </Dialog>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    title="Excluir vaga"
                                    aria-label="Excluir vaga"
                                    className="opacity-0 group-hover:opacity-100 transition-opacity text-red-600 hover:text-red-700 hover:bg-red-50 p-2 rounded-md"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Excluir vaga</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Tem certeza que deseja excluir esta vaga? Esta ação não pode ser desfeita.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDelete(job.id)}
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      Excluir
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                          <CardTitle className="line-clamp-2 text-base sm:text-lg font-semibold text-slate-900">
                            {job.title}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 flex flex-col px-4 sm:px-6 pb-4 sm:pb-6">
                          <div className="space-y-3 sm:space-y-4 flex-1">
                          <div className="flex items-center gap-2 text-slate-600">
                            <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                            <span className="text-xs sm:text-sm truncate">{job.location || 'Não informado'}</span>
                          </div>
                          
                          {(job.salary_min || job.salary_max) && (
                            <div className="flex items-center gap-2 text-slate-600">
                              <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                              <span className="text-xs sm:text-sm font-medium text-emerald-600">
                                {(() => {
                                  const min = job.salary_min != null ? Number(job.salary_min) : null;
                                  const max = job.salary_max != null ? Number(job.salary_max) : null;
                                  if (min && max) {
                                    if (min === max) return `R$ ${min.toLocaleString('pt-BR')}`;
                                    return `R$ ${min.toLocaleString('pt-BR')} - R$ ${max.toLocaleString('pt-BR')}`;
                                  }
                                  if (min) return `A partir de R$ ${min.toLocaleString('pt-BR')}`;
                                  if (max) return `Até R$ ${max.toLocaleString('pt-BR')}`;
                                  return '';
                                })()}
                              </span>
                            </div>
                          )}

                          <div className="flex flex-wrap gap-1.5 sm:gap-2">
                            {user?.subscriptionPlan==='premium' && (jobDirectCounts[job.id]?.count) > 0 && (
                              <span className="flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs font-semibold text-indigo-700 ring-1 ring-indigo-100">
                                <Zap className="h-2.5 w-2.5 sm:h-3 sm:w-3"/> {jobDirectCounts[job.id]?.count}
                              </span>
                            )}
                            {job.contract_type && (
                              <span className="px-2 py-0.5 sm:py-1 bg-blue-100 text-blue-800 text-[10px] sm:text-xs font-medium rounded-full">
                                {job.contract_type.toUpperCase()}
                              </span>
                            )}
                            {job.work_type && (
                              <span className="px-2 py-0.5 sm:py-1 bg-green-100 text-green-800 text-[10px] sm:text-xs font-medium rounded-full">
                                {job.work_type.charAt(0).toUpperCase() + job.work_type.slice(1)}
                              </span>
                            )}
                            {job.experience_level && (
                              <span className="px-2 py-0.5 sm:py-1 bg-purple-100 text-purple-800 text-[10px] sm:text-xs font-medium rounded-full">
                                {job.experience_level.charAt(0).toUpperCase() + job.experience_level.slice(1)}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-slate-600">
                            <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                            <span className="text-xs sm:text-sm">
                              {(() => {
                                const count = getJobApplicationsCount(job.id);
                                const views = job.views_count ?? job.views ?? job.view_count ?? 0;
                                const candidaturasLabel = count === 0
                                  ? 'Nenhuma'
                                  : count === 1
                                  ? '1'
                                  : `${count}`;
                                return `${candidaturasLabel} candidatura${count !== 1 ? 's' : ''} • ${views} view${views === 1 ? '' : 's'}`;
                              })()}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-slate-600">
                            <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                            <span className="text-xs sm:text-sm">
                              {job.created_at ? 
                                new Date(job.created_at).toLocaleDateString('pt-BR') : 
                                job.createdAt ? 
                                  new Date(job.createdAt).toLocaleDateString('pt-BR') :
                                  'Data não disponível'
                              }
                            </span>
                          </div>
                          </div>

                          <div className="border-t pt-3 sm:pt-4 mt-3 sm:mt-4">
                            <div className="grid grid-cols-2 gap-2">
                              <Button
                                asChild
                                className="w-full rounded-xl sm:rounded-2xl border-2 border-[#2563eb] bg-[#2563eb] px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-white shadow-sm shadow-sky-200 transition-all hover:-translate-y-[1px] hover:border-[#1d4ed8] hover:bg-[#1d4ed8]"
                              >
                                <Link to={`/job/${job.id}/candidates`} className="flex items-center justify-center text-white">
                                  <Users className="mr-1 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                  <span className="hidden xs:inline">Candidatos</span>
                                  <span className="xs:hidden">Ver</span>
                                </Link>
                              </Button>
                              <Button
                                asChild
                                variant="outline"
                                className="w-full rounded-xl sm:rounded-2xl border-2 border-dashed border-purple-300 bg-purple-100 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-purple-700 transition-all hover:-translate-y-[1px] hover:border-purple-500 hover:bg-purple-200 hover:text-purple-700 hover:shadow-md"
                              >
                                <Link to={`/company-interviews/${job.id}`} className="flex items-center justify-center">
                                  <LayoutPanelLeft className="mr-1 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                  <span className="hidden xs:inline">Ver Painel</span>
                                  <span className="xs:hidden">Painel</span>
                                </Link>
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
        </div>
      </div>
    </>
  );
};

export default MyJobs;
