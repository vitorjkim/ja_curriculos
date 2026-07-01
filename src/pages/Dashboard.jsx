import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet';
import { 
  Home, 
  FileText, 
  Search, 
  MessageSquare, 
  Briefcase, 
  User, 
  TrendingUp, 
  Calendar,
  Target,
  Award,
  Eye,
  Edit,
  Plus,
  Download,
  CheckCircle,
  AlertCircle,
  Clock,
  MapPin,
  Building,
  Heart,
  ThumbsUp
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Combobox } from '@/components/ui/combobox';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { resumesAPI, applications as applicationsAPI, jobsAPI } from '@/lib/api';
import { listSavedJobs, removeJob as removeSavedJob } from '@/lib/savedJobs';
import CandidateInterviewsSection from '@/components/candidate/CandidateInterviewsSection';
import { loadAlerts, addAlert, removeAlert, toggleAlert, isJobMatch, migrateLocalAlerts } from '@/lib/jobAlerts';

const Dashboard = () => {
  console.log('🔥 DASHBOARD: Componente iniciando...');
  
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // Helper function para formatação de data
  const formatDate = (dateValue) => {
    if (!dateValue) return 'Data não disponível';
    
    try {
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) return 'Data inválida';
      return date.toLocaleDateString('pt-BR');
    } catch (error) {
      return 'Data inválida';
    }
  };
  
  console.log('🎯 Dashboard: Componente carregado, usuário:', user);
  
  const [stats, setStats] = useState({
    totalResumes: 0,
    totalApplications: 0,
    pendingApplications: 0,
    profileCompleteness: 0
  });
  
  const [recentResumes, setRecentResumes] = useState([]);
  const [recentApplications, setRecentApplications] = useState([]);
  const [scheduledInterviews, setScheduledInterviews] = useState([]);
  const [pendingInterviewConfirm, setPendingInterviewConfirm] = useState(null);
  const [confirmingInterview, setConfirmingInterview] = useState(false);
  const [savedJobs, setSavedJobs] = useState([]);
  // Progress card (perfil/currículo/candidatura/jornada)
  const [journeyProgress, setJourneyProgress] = useState(0);
  const [journeyCompleted, setJourneyCompleted] = useState(false);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  // Modais dos cards clicáveis
  const [activeModal, setActiveModal] = useState(null); // 'resumes' | 'applications' | 'pending' | 'profile'
  // Job Alerts (Aluno)
  const [jobAlerts, setJobAlerts] = useState([]);
  const [alertFormOpen, setAlertFormOpen] = useState(false);
  const [alertForm, setAlertForm] = useState({ location:'', contract_type:'Todos', work_type:'Todos', experience_level:'Todos', area:'Todos', subarea:'Todos' });
  const [taxonomy, setTaxonomy] = useState({});
  const [areasList, setAreasList] = useState([{ value:'Todos', label:'Todas as áreas'}]);
  const [subareasList, setSubareasList] = useState([]);
  const [allJobsForAlerts, setAllJobsForAlerts] = useState([]);
  const [matchesByAlert, setMatchesByAlert] = useState({});

  const [expandedAlerts, setExpandedAlerts] = useState(new Set());

  // Helpers for labels and titles
  const H = (s='') => String(s).replace(/_/g,' ').toLowerCase().replace(/\b\w/g,c=>c.toUpperCase());
  const CT_LABELS = { clt:'CLT', pj:'PJ', estagio:'Estágio', temporario:'Temporário' };
  const WT_LABELS = { presencial:'Presencial', hibrido:'Híbrido', remoto:'Remoto' };
  const EXP_LABELS = { estagio:'Estágio', junior:'Júnior', pleno:'Pleno', senior:'Sênior' };
  const areaLabel = (key) => {
    if (!key || key==='Todos') return null;
    if (taxonomy && taxonomy[key] && typeof taxonomy[key] === 'object' && taxonomy[key]?.label) return taxonomy[key].label;
    return H(key);
  };
  const summarizeAlert = (filters={}) => {
    const parts = [];
    if (filters.contract_type && filters.contract_type !== 'Todos') parts.push(CT_LABELS[filters.contract_type] || filters.contract_type.toUpperCase());
    const aLabel = areaLabel(filters.area);
    if (aLabel) parts.push(aLabel);
    if (filters.location) parts.push(H(filters.location));
    if (filters.work_type && filters.work_type !== 'Todos') parts.push(WT_LABELS[filters.work_type] || H(filters.work_type));
    if (filters.experience_level && filters.experience_level !== 'Todos') parts.push(EXP_LABELS[filters.experience_level] || H(filters.experience_level));
    return parts.join(' • ');
  };
  
  const [loading, setLoading] = useState(true);
  const [usingRealData, setUsingRealData] = useState(true);

  // Dados de exemplo para demonstração
  const sampleData = {
    stats: {
      totalResumes: 3,
      totalApplications: 8,
      pendingApplications: 3,
      profileCompleteness: 75
    },
    recentResumes: [
      {
        id: 'sample-1',
        title: 'Desenvolvedor Frontend',
        template: 'modern',
        created_at: '2024-12-15T10:00:00Z',
        is_public: true
      },
      {
        id: 'sample-2', 
        title: 'Desenvolvedor Full Stack',
        template: 'classic',
        created_at: '2024-12-10T14:30:00Z',
        is_public: false
      }
    ],
    recentApplications: [
      {
        id: 'app-1',
        status: 'pending',
        created_at: '2024-12-14T09:00:00Z',
        job: {
          title: 'Desenvolvedor React',
          company: {
            company_name: 'Tech Solutions'
          }
        }
      },
      {
        id: 'app-2',
        status: 'reviewed',
        created_at: '2024-12-12T16:20:00Z',
        job: {
          title: 'Frontend Developer',
          company: {
            company_name: 'StartupXYZ'
          }
        }
      }
    ]
  };

  useEffect(() => {
    console.log('🎯 Dashboard: useEffect executado, usuário:', user);
    console.log('🎯 Dashboard: Tipo do usuário:', user?.type);
    fetchDashboardData();
    // Refetch periódico para atualizar entrevistas reagendadas
    const interval = setInterval(()=>{
      if (user?.type === 'candidate') fetchDashboardData(true);
    }, 60000); // 1 minuto
    const onFocus = () => { if (user?.type === 'candidate') fetchDashboardData(true); };
    window.addEventListener('focus', onFocus);
    // Load saved jobs initially (async)
    const loadSavedJobs = async () => {
      const jobs = await listSavedJobs();
      setSavedJobs(jobs.sort((a,b) => (b.savedAt||0) - (a.savedAt||0)));
    };
    loadSavedJobs();
    // Listen for updates from other components in same tab
    const onSavedJobsUpdated = async () => {
      const jobs = await listSavedJobs();
      setSavedJobs(jobs.sort((a,b) => (b.savedAt||0) - (a.savedAt||0)));
    };
    window.addEventListener('saved-jobs-updated', onSavedJobsUpdated);
    // Also react to cross-tab changes
    const onStorage = (e) => { if (e.key === 'saved_jobs_v1') onSavedJobsUpdated(); };
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('saved-jobs-updated', onSavedJobsUpdated);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', onFocus);
      clearInterval(interval);
    };
  }, [user?.id]);

  const fetchDashboardData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      
      // Verificar se usuário está logado e tem token
      const token = localStorage.getItem('curriculoja_token');
      console.log('🔐 Dashboard: Token encontrado:', !!token);
      console.log('👤 Dashboard: Usuário logado:', user?.id, user?.email, user?.type);
      
      if (!user?.id) {
        console.log('⚠️ Dashboard: Usuário não encontrado');
        setLoading(false);
        return;
      }

      if (user?.type !== 'candidate') {
        console.log('⚠️ Dashboard: Usuário não é candidato:', user?.type);
        setLoading(false);
        return;
      }
      
      console.log('🔄 Dashboard: Buscando dados do usuário...', user?.id);
      
      // Buscar currículos
      console.log('📄 Dashboard: Chamando resumesAPI.list()...');
      const resumesResponse = await resumesAPI.list();
      console.log('📄 Dashboard: Resposta da API de currículos:', resumesResponse);
      
      const resumes = resumesResponse.resumes || resumesResponse.data || resumesResponse || [];
      console.log('📄 Dashboard: Currículos encontrados:', resumes.length, resumes);
      
      // Buscar candidaturas
      console.log('💼 Dashboard: Chamando applicationsAPI.list()...');
      const applicationsResponse = await applicationsAPI.list();
      console.log('💼 Dashboard: Resposta da API de candidaturas:', applicationsResponse);
      const applications = applicationsResponse.applications || applicationsResponse.data || applicationsResponse || [];
      console.log('💼 Dashboard: Candidaturas encontradas:', applications.length, applications);
      // Buscar entrevistas diretamente (novo endpoint)
      let interviewsResp = { upcoming: [], history: [] };
      try {
        interviewsResp = await applicationsAPI.listInterviews();
        console.log('🎤 Dashboard: Resposta entrevistas:', interviewsResp);
      } catch(e){ console.warn('Falha endpoint /applications/interviews, fallback filtrando candidaturas', e.message); }
      // Calcular estatísticas
      const newStats = {
        totalResumes: Array.isArray(resumes) ? resumes.length : 0,
        totalApplications: Array.isArray(applications) ? applications.length : 0,
        pendingApplications: Array.isArray(applications) ? applications.filter(app => app.status === 'pending').length : 0,
        profileCompleteness: calculateProfileCompleteness()
      };
      
      console.log('📊 Dashboard: Estatísticas calculadas:', newStats);
      setStats(newStats);
      setUsingRealData(true);
      
      // Pegar itens recentes
      const resumesArr = Array.isArray(resumes) ? resumes : [];
      const appsArr = Array.isArray(applications) ? applications : [];
      setRecentResumes(resumesArr.slice(0, 3));
      setRecentApplications(appsArr.slice(0, 5));
      // Debug: verificar se company_logo está vindo
      console.log('🏢 Dashboard: Candidaturas com logos:', appsArr.slice(0, 3).map(a => ({
        id: a.id,
        job_title: a.job_title,
        company_name: a.company_name,
        company_logo: a.company_logo ? 'TEM (' + a.company_logo.length + ' chars)' : 'NULL'
      })));
      // Entrevistas agendadas: usar upcoming de interviewsResp se disponível, senão fallback filtrando candidaturas
      const upcomingInterviews = Array.isArray(interviewsResp.upcoming) ? interviewsResp.upcoming : [];
      const interviewsSource = upcomingInterviews.length > 0 ? upcomingInterviews : applications.filter(a => a.interview_date && new Date(a.interview_date) > new Date());
      const interviews = (interviewsSource || []).filter(a => a.interview_date)
        .sort((a,b)=> new Date(a.interview_date) - new Date(b.interview_date));
      console.log('🎤 Dashboard: Entrevistas filtradas para exibir:', interviews);
      setScheduledInterviews(interviews.slice(0,4));
      const nextPending = interviews.find(a => !a.interview_confirmed && new Date(a.interview_date) > new Date());
      setPendingInterviewConfirm(nextPending || null);
      
    } catch (error) {
      console.error('❌ Dashboard: Erro ao carregar dados:', error);
      console.error('❌ Dashboard: Detalhes do erro:', error.message);
      
      // Se for erro de token inválido, mostrar aviso
      if (error.message?.includes('inválido') || error.message?.includes('TOKEN_INVALID') || error.message?.includes('Token inválido')) {
        console.log('🔐 Dashboard: Token inválido, usuário precisa fazer login');
        toast({
          title: 'Sessão expirada',
          description: 'Faça login novamente para ver seus dados.',
          variant: 'destructive'
        });
        
        // Zerar dados em caso de token inválido
        setStats({
          totalResumes: 0,
          totalApplications: 0,
          pendingApplications: 0,
          profileCompleteness: 0
        });
  setRecentResumes([]);
  setRecentApplications([]);
  setScheduledInterviews([]);
  setPendingInterviewConfirm(null);
        setUsingRealData(false);
      } else {
        // Para outros erros, usar dados de demonstração temporariamente
        console.log('🔄 Dashboard: Usando dados de exemplo devido ao erro');
        setStats(sampleData.stats);
  setRecentResumes(sampleData.recentResumes);
  setRecentApplications(sampleData.recentApplications);
  setScheduledInterviews([]);
  setPendingInterviewConfirm(null);
        setUsingRealData(false);
        
        toast({
          title: 'Erro ao carregar dados',
          description: 'Mostrando dados de demonstração temporariamente.',
          variant: 'default'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Journey progress from localStorage (kept by CandidateJourney)
  useEffect(() => {
    try {
      const raw = localStorage.getItem('completedJourneySteps');
      const steps = Array.isArray(JSON.parse(raw || '[]')) ? JSON.parse(raw || '[]') : [];
      const TOTAL = 10; // steps defined in CandidateJourney.jsx
      const pct = Math.max(0, Math.min(100, Math.round((steps.length / TOTAL) * 100)));
      setJourneyProgress(pct);
      setJourneyCompleted(steps.length >= TOTAL);
    } catch (_) {
      setJourneyProgress(0);
      setJourneyCompleted(false);
    }
  }, [user?.id]);

  // === Job Alerts: taxonomy & jobs loading ===
  useEffect(() => {
    (async () => {
      if (user?.type !== 'candidate') return;
      try {
        const t = await jobsAPI.getTaxonomy();
        const tax = t?.taxonomy || {};
        setTaxonomy(tax);
        const humanize = (s='') => String(s).replace(/_/g,' ').toLowerCase().replace(/\b\w/g,c=>c.toUpperCase());
        const areaKeys = Object.keys(tax || {});
        const areas = areaKeys
          .filter(k=> k !== 'outros')
          .map(k=> ({ value:k, label: tax[k]?.label || humanize(k) }));
        // sort by label
        areas.sort((a,b)=> a.label.localeCompare(b.label,'pt-BR'));
        setAreasList([{ value:'Todos', label:'Todas as áreas'}, ...areas]);
      } catch(_){}
    })();
  }, [user?.type]);

  // Update subareas when area changes (form)
  useEffect(() => {
    if (!alertForm?.area || alertForm.area==='Todos') { setSubareasList([]); if (alertForm.subarea !== 'Todos') setAlertForm(p=>({...p, subarea:'Todos'})); return; }
    const subs = Array.isArray(taxonomy[alertForm.area]) ? taxonomy[alertForm.area] : [];
    if (!subs.length) { setSubareasList([]); if (alertForm.subarea !== 'Todos') setAlertForm(p=>({...p, subarea:'Todos'})); return; }
    const humanize = (s='') => String(s).replace(/_/g,' ').toLowerCase().replace(/\b\w/g,c=>c.toUpperCase());
    const opts = [{ value:'Todos', label:'Todas as sub-áreas' }, ...subs.map(s => ({ value:s, label: humanize(s) }))];
    setSubareasList(opts);
    if (!opts.find(o => o.value === alertForm.subarea)) setAlertForm(p=>({...p, subarea:'Todos'}));
  }, [alertForm.area, taxonomy]);

  // Load alerts and listen to updates
  useEffect(() => {
    if (user?.type !== 'candidate') return;
    const load = async () => {
      // Migrate old localStorage alerts to database on first load
      await migrateLocalAlerts(user?.id);
      const alerts = await loadAlerts(user?.id);
      setJobAlerts(alerts);
    };
    load();
    const onUpdated = (e) => { if (!e?.detail || e.detail.userId === user?.id) load(); };
    window.addEventListener('job-alerts-updated', onUpdated);
    const onStorage = (e) => { if (e.key === `cj_job_alerts_v1_${user?.id}`) load(); };
    window.addEventListener('storage', onStorage);
    return () => { window.removeEventListener('job-alerts-updated', onUpdated); window.removeEventListener('storage', onStorage); };
  }, [user?.id, user?.type]);

  // Fetch all internal jobs periodically to compute matches
  useEffect(() => {
    if (user?.type !== 'candidate') return;
    let mounted = true;
    const fetchJobs = async () => {
      try {
        const resp = await jobsAPI.list();
        const jobs = resp?.jobs || [];
        if (!mounted) return;
        setAllJobsForAlerts(jobs);
      } catch (_) {
        // noop
      }
    };
    fetchJobs();
    const interval = setInterval(fetchJobs, 60_000); // 1 min
    return () => { mounted = false; clearInterval(interval); };
  }, [user?.type]);

  // Recompute matches whenever jobs or alerts change
  useEffect(() => {
    if (!Array.isArray(jobAlerts) || !jobAlerts.length) { setMatchesByAlert({}); return; }
    const next = {};
    for (const a of jobAlerts) {
      if (!a?.active) { next[a.id] = []; continue; }
      const m = (allJobsForAlerts || []).filter(j => isJobMatch(j, a.filters));
      next[a.id] = m;
    }
    setMatchesByAlert(next);
  }, [jobAlerts, allJobsForAlerts]);

  const calculateProfileCompleteness = () => {
    if (!user) return 0;
    
    let completeness = 0;
    const fields = ['name', 'email', 'phone'];
    
    fields.forEach(field => {
      if (user[field]) completeness += 33.33;
    });
    
    return Math.round(completeness);
  };

  const quickActions = [
    {
      title: 'Buscar Vagas',
      description: 'Encontre novas oportunidades',
      icon: Search,
      path: '/jobs',
      color: 'from-blue-500 to-blue-600',
      bgColor: 'from-blue-50 to-blue-100'
    },
    {
      title: 'Criar Currículo',
      description: 'Monte seu currículo profissional',
      icon: FileText,
      path: '/create-resume',
      color: 'from-green-500 to-green-600',
      bgColor: 'from-green-50 to-green-100'
    },
    {
      title: 'Meu Perfil',
      description: 'Gerencie suas informações',
      icon: User,
      path: '/profile',
      color: 'from-yellow-500 to-yellow-600',
      bgColor: 'from-yellow-50 to-yellow-100'
    },
    {
      title: 'Mensagens',
      description: 'Converse com empresas',
      icon: MessageSquare,
      path: '/my-messages',
      color: 'from-purple-500 to-purple-600',
      bgColor: 'from-purple-50 to-purple-100'
    }
  ];

  // Redirect empresas para dashboard específico
  console.log('🎯 Dashboard: Verificando tipo de usuário antes do return');
  console.log('🎯 Dashboard: user?.type =', user?.type);
  
  if (user?.type === 'company') {
    console.log('🎯 Dashboard: Redirecionando empresa para dashboard específico');
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <Card className="max-w-md mx-auto text-center">
          <CardContent className="p-8">
            <div className="mb-4">
              <Building className="w-16 h-16 text-blue-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Dashboard da Empresa</h2>
              <p className="text-gray-600 mb-6">
                Você está logado como empresa. Acesse o dashboard específico para empresas.
              </p>
              <Button 
                onClick={() => navigate('/company-dashboard')}
                className="rounded-full border-2 border-blue-200 bg-blue-500/5 text-sm font-bold text-blue-600 shadow-sm shadow-blue-100 hover:border-blue-400 hover:bg-blue-500 hover:text-white hover:shadow-md hover:shadow-blue-200 transition-all duration-300 h-10 px-5"
              >
                Ir para Dashboard da Empresa
              </Button>
            </div>
                  {/* Toast flutuante para confirmação de entrevista */}
                  {pendingInterviewConfirm && (
                    <div className="fixed bottom-4 right-4 w-80 bg-white shadow-2xl border border-indigo-100 rounded-2xl p-4 z-50 animate-in fade-in slide-in-from-bottom-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-indigo-50">
                          <Calendar className="w-4 h-4 text-indigo-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-gray-900 mb-1">Entrevista Agendada</p>
                          <p className="text-xs text-gray-600 mb-2">{pendingInterviewConfirm.job_title || 'Vaga'} em {new Date(pendingInterviewConfirm.interview_date).toLocaleString('pt-BR',{ dateStyle:'short', timeStyle:'short'})}</p>
                          <div className="flex gap-2">
                            <button disabled={confirmingInterview} onClick={async ()=>{
                              console.log('[InterviewConfirm][Toast] Botão clicado');
                              if (!pendingInterviewConfirm) return;
                              const current = pendingInterviewConfirm;
                              try {
                                setConfirmingInterview(true);
                                console.log('[InterviewConfirm][Toast] Otimista set interview_confirmed true', current.id);
                                // Otimista
                                setScheduledInterviews(prev=> prev.map(i=> i.id===current.id? { ...i, interview_confirmed:true }: i));
                                setPendingInterviewConfirm(null);
                                const resp = await applicationsAPI.confirmInterview(current.id);
                                console.log('[InterviewConfirm][Toast] Resposta API', resp);
                                if (!resp?.success) throw new Error('Falha na confirmação');
                                // Atualização otimista pelo payload
                                if (resp.application) {
                                  try { window.dispatchEvent(new CustomEvent('interview-confirmed', { detail: { id: resp.application.id, application: resp.application } })); console.log('[InterviewConfirm][Toast] Evento interview-confirmed disparado'); } catch(e){ console.warn('Dispatch event falhou', e); }
                                } else {
                                  try { window.dispatchEvent(new CustomEvent('interview-confirmed', { detail: { id: current.id } })); } catch(e){ console.warn('Dispatch event falhou', e); }
                                }
                                toast({ title:'Presença confirmada', description:'Sua confirmação foi registrada.' });
                                try { window.dispatchEvent(new CustomEvent('interview-confirmed', { detail: { id: current.id } })); console.log('[InterviewConfirm][Toast] Evento interview-confirmed disparado'); } catch(e){ console.warn('Dispatch event falhou', e); }
                                fetchDashboardData();
                              } catch(e){
                                console.error('Erro confirmando', e);
                                toast({ title:'Erro', description:'Não foi possível confirmar agora.', variant:'destructive'});
                                // Recarrega para reverter otimista
                                fetchDashboardData();
                              } finally { setConfirmingInterview(false);} }} className="flex-1 rounded-full border-2 border-indigo-200 bg-indigo-500/5 text-xs font-bold text-indigo-600 shadow-sm shadow-indigo-100 hover:border-indigo-400 hover:bg-indigo-500 hover:text-white hover:shadow-md hover:shadow-indigo-200 transition-all duration-300 h-9 px-3 disabled:opacity-50">{confirmingInterview? 'Confirmando...' : 'Confirmar'}</button>
                            <button onClick={()=> setPendingInterviewConfirm(null)} className="flex-1 rounded-full border-2 border-slate-200 bg-slate-500/5 text-xs font-bold text-slate-600 shadow-sm shadow-slate-100 hover:border-slate-400 hover:bg-slate-500 hover:text-white hover:shadow-md hover:shadow-slate-200 transition-all duration-300 h-9 px-3">Depois</button>
                          </div>
                        </div>
                        <button onClick={()=> setPendingInterviewConfirm(null)} className="text-gray-400 hover:text-gray-600">×</button>
                      </div>
                    </div>
                  )}
          </CardContent>
        </Card>
      </div>
    );
  }

  console.log('🎯 Dashboard: Renderizando dashboard principal');
  console.log('🎯 Dashboard: loading =', loading);
  console.log('🎯 Dashboard: stats =', stats);
  // Composite completeness: average of (resume, first application, journey progress)
  const hasResumeOverall = (stats.totalResumes || 0) > 0 || (recentResumes?.length || 0) > 0;
  const hasApplicationOverall = (stats.totalApplications || 0) > 0 || (recentApplications?.length || 0) > 0;
  const resumePct = hasResumeOverall ? 100 : 0;
  const applicationPct = hasApplicationOverall ? 100 : 0;
  const journeyPct = Math.max(0, Math.min(100, journeyProgress || 0));
  const displayedCompleteness = Math.round((resumePct + applicationPct + journeyPct) / 3);

  const handleStatClick = (title) => {
    if (!user || user.type !== 'candidate') return;
    switch (title) {
      case 'Currículos':
        setActiveModal('resumes');
        break;
      case 'Candidaturas':
        setActiveModal('applications');
        break;
      case 'Pendentes':
        setActiveModal('pending');
        break;
      case 'Perfil Completo':
        setActiveModal('profile');
        break;
      default:
        break;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Helmet>
        <title>Dashboard - CurriculoJá</title>
      </Helmet>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-[1.85rem] md:text-[2.25rem] font-bold text-gray-900 mb-1 tracking-tight leading-tight">
                Olá, <span className="text-blue-600">{user?.name || 'Usuário'}</span>!
              </h1>
              <p className="text-[15px] text-gray-600 leading-relaxed">
                Acompanhe suas atividades e acesse suas ferramentas
              </p>
            </div>
            
            {/* Indicador de dados reais vs exemplo */}
            <div className="hidden md:flex items-center gap-3">
              {usingRealData ? (
                <div className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-xl text-sm font-semibold border border-green-200 shadow-sm">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  Dados reais
                </div>
              ) : (
                <div className="flex items-center gap-2 px-4 py-2 bg-orange-50 text-orange-700 rounded-xl text-sm font-semibold border border-orange-200 shadow-sm">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  Dados de exemplo
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Stats Cards - Modern Design */}
            <motion.div 
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              {[
                { label: 'Currículos', value: stats.totalResumes, icon: FileText, color: 'bg-blue-600 text-white' },
                { label: 'Candidaturas', value: stats.totalApplications, icon: Briefcase, color: 'bg-emerald-600 text-white' },
                { label: 'Pendentes', value: stats.pendingApplications, icon: Clock, color: 'bg-amber-500 text-white' },
                { label: 'Perfil', value: `${displayedCompleteness}%`, icon: Award, color: 'bg-violet-600 text-white' }
              ].map((stat) => {
                const Icon = stat.icon;
                return (
                  <button
                    key={stat.label}
                    onClick={() => handleStatClick(stat.label === 'Perfil' ? 'Perfil Completo' : stat.label)}
                    className={`group relative overflow-hidden rounded-2xl p-5 text-left w-full transition-all duration-200 hover:shadow-xl hover:brightness-105 active:scale-[0.98] ${stat.color}`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <p className="text-[10px] font-bold uppercase tracking-widest opacity-70 leading-tight">{stat.label}</p>
                      <div className="w-8 h-8 rounded-xl bg-black/15 flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4" />
                      </div>
                    </div>
                    <p className="text-4xl font-black leading-none tabular-nums">{stat.value}</p>
                    <div className="absolute -bottom-8 -right-8 w-28 h-28 rounded-full bg-white/10 pointer-events-none" />
                    <div className="absolute -bottom-3 -right-3 w-14 h-14 rounded-full bg-white/5 pointer-events-none" />
                  </button>
                );
              })}
            </motion.div>

            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <h2 className="text-xl font-bold text-gray-900 mb-5" data-tour="qa.section">Ações <span className="text-blue-600">Rápidas:</span></h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {quickActions.map((action, index) => (
                  <Card 
                    key={action.title}
                    className={`hover:shadow-lg transition-all duration-300 rounded-2xl border-2 border-gray-200 shadow-md group overflow-hidden cursor-pointer bg-white ${
                      action.title === 'Buscar Vagas' ? 'hover:border-blue-400' :
                      action.title === 'Criar Currículo' ? 'hover:border-green-400' :
                      action.title === 'Meu Perfil' ? 'hover:border-yellow-400' : 'hover:border-purple-400'
                    }`}
                  >
                    <CardContent className="p-6">
                        <Link to={action.path} className="block" data-tour={
                          action.title === 'Criar Currículo' ? 'qa.createResume' :
                          action.title === 'Meu Perfil' ? 'qa.profile' : undefined
                        }>
                        <div className="text-center">
                          <div className={`inline-flex w-14 h-14 rounded-xl items-center justify-center mb-4 shadow-md border-2 border-white group-hover:scale-110 transition-transform duration-300 bg-gradient-to-br ${action.bgColor}`}>
                            <action.icon className={`w-7 h-7 stroke-[2] ${
                              action.title === 'Buscar Vagas' ? 'text-blue-600' :
                              action.title === 'Criar Currículo' ? 'text-green-600' :
                              action.title === 'Meu Perfil' ? 'text-yellow-600' : 'text-purple-600'
                            }`} />
                          </div>
                          <h3 className={`text-base font-bold mb-1 transition-colors text-gray-900 ${
                            action.title === 'Buscar Vagas' ? 'group-hover:text-blue-600' :
                            action.title === 'Criar Currículo' ? 'group-hover:text-green-600' :
                            action.title === 'Meu Perfil' ? 'group-hover:text-yellow-600' : 'group-hover:text-purple-600'
                          }`}>
                            {action.title}
                          </h3>
                          <p className="text-sm text-gray-600">{action.description}</p>
                        </div>
                        </Link>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </motion.div>

            {/* Dialog: Seu Progresso (abre ao clicar em Meu Perfil) */}
            {user?.type === 'candidate' && (
              <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
                <DialogContent className="sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-lg">
                      <TrendingUp className="w-5 h-5 text-emerald-600" />
                      Seu Progresso
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <div className="text-sm font-semibold text-gray-800">Perfil Completo</div>
                        <div className="text-sm font-semibold text-emerald-700">{displayedCompleteness}%</div>
                      </div>
                      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden border border-gray-200">
                        <div className="h-full bg-gradient-to-r from-emerald-500 to-green-600" style={{ width: `${displayedCompleteness}%` }} />
                      </div>
                    </div>
                    {(() => {
                      const Item = ({ done, title, detail, action }) => (
                        <div className={`flex items-center justify-between p-3 rounded-xl border ${done ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-200'}`}>
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${done ? 'bg-emerald-500' : 'bg-gray-300'}`}>
                              {done ? <CheckCircle className="w-4 h-4 text-white" /> : <AlertCircle className="w-4 h-4 text-white" />}
                            </div>
                            <div className="min-w-0">
                              <div className={`text-sm font-semibold ${done ? 'text-emerald-800' : 'text-gray-800'}`}>{title}</div>
                              {detail && <div className="text-xs text-gray-600 truncate">{detail}</div>}
                            </div>
                          </div>
                          {action}
                        </div>
                      );
                      return (
                        <div className="space-y-2">
                          <Item
                            done={hasResumeOverall}
                            title={hasResumeOverall ? 'Currículo adicionado' : 'Adicione seu primeiro currículo'}
                            detail={hasResumeOverall ? 'Ótimo! Você já tem currículo.' : 'Crie no site ou envie um arquivo.'}
                            action={!hasResumeOverall && (
                              <div className="flex gap-2 flex-shrink-0">
                                <Button asChild size="sm" className="rounded-full border-2 border-blue-200 bg-blue-500/5 text-xs font-bold text-blue-600 shadow-sm shadow-blue-100 hover:border-blue-400 hover:bg-blue-500 hover:text-white hover:shadow-md hover:shadow-blue-200 transition-all duration-300 h-9 px-3"><Link to="/create-resume">Criar</Link></Button>
                                <Button asChild size="sm" className="rounded-full border-2 border-slate-200 bg-slate-500/5 text-xs font-bold text-slate-600 shadow-sm shadow-slate-100 hover:border-slate-400 hover:bg-slate-500 hover:text-white hover:shadow-md hover:shadow-slate-200 transition-all duration-300 h-9 px-3"><Link to="/upload-resume">Enviar</Link></Button>
                              </div>
                            )}
                          />
                          <Item
                            done={hasApplicationOverall}
                            title={hasApplicationOverall ? 'Primeira candidatura feita' : 'Candidate-se a uma vaga'}
                            detail={hasApplicationOverall ? 'Excelente! Continue aplicando.' : 'Escolha uma vaga que combine com você.'}
                            action={!hasApplicationOverall && (
                              <Button asChild size="sm" className="rounded-full border-2 border-green-200 bg-green-500/5 text-xs font-bold text-green-600 shadow-sm shadow-green-100 hover:border-green-400 hover:bg-green-500 hover:text-white hover:shadow-md hover:shadow-green-200 transition-all duration-300 h-9 px-3 flex-shrink-0"><Link to="/jobs">Buscar vagas</Link></Button>
                            )}
                          />
                          <div className={`p-3 rounded-xl border ${journeyCompleted ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-200'}`}>
                            <div className="flex items-center gap-3 justify-between">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${journeyCompleted ? 'bg-emerald-500' : 'bg-gray-300'}`}>
                                  {journeyCompleted ? <CheckCircle className="w-4 h-4 text-white" /> : <AlertCircle className="w-4 h-4 text-white" />}
                                </div>
                                <div className="min-w-0">
                                  <div className={`text-sm font-semibold ${journeyCompleted ? 'text-emerald-800' : 'text-gray-800'}`}>{journeyCompleted ? 'Jornada do candidato concluída' : 'Complete a Jornada do candidato'}</div>
                                  <div className="text-xs text-gray-600">Progresso: {journeyProgress}%</div>
                                </div>
                              </div>
                              {!journeyCompleted && (
                                <Button asChild size="sm" className="rounded-full border-2 border-amber-200 bg-amber-500/5 text-xs font-bold text-amber-600 shadow-sm shadow-amber-100 hover:border-amber-400 hover:bg-amber-500 hover:text-white hover:shadow-md hover:shadow-amber-200 transition-all duration-300 h-9 px-3 flex-shrink-0"><Link to="/candidate-journey">Ir para a Jornada</Link></Button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </DialogContent>
              </Dialog>
            )}

            {/* Entrevistas Agendadas seção */}
            <CandidateInterviewsSection />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Recent Resumes */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="h-full"
              >
                <Card className="h-full min-h-[360px] rounded-[24px] bg-white shadow-sm border-2 border-gray-200 flex flex-col overflow-hidden">
                  <CardHeader className="border-b border-gray-100 pb-4 bg-gradient-to-br from-blue-50 to-white rounded-t-[22px]">
                    <div className="flex justify-between items-center gap-3">
                      <CardTitle className="flex items-center text-base font-semibold text-blue-900">
                        <div className="mr-3 w-10 h-10 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center shadow-sm border-2 border-blue-200">
                          <FileText className="w-5 h-5 text-blue-600 stroke-[2.5]" />
                        </div>
                        Currículos Recentes
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-5 flex-1 flex flex-col">
                    <div className="flex-1">
                    {recentResumes.length === 0 ? (
                      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/70 py-10">
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-blue-500 ring-2 ring-blue-200">
                          <FileText className="w-7 h-7" />
                        </div>
                        <p className="text-sm font-medium text-blue-900">Nenhum currículo encontrado</p>
                        <p className="text-xs text-slate-500">Crie seu primeiro currículo</p>
                        <Button 
                          asChild 
                          className="rounded-full border-2 border-blue-200 bg-blue-500/5 text-xs font-bold text-blue-600 shadow-sm shadow-blue-100 hover:border-blue-400 hover:bg-blue-500 hover:text-white hover:shadow-md hover:shadow-blue-200 transition-all duration-300 h-9 px-4 mt-2"
                        >
                          <Link to="/create-resume">
                            <Plus className="w-3.5 h-3.5 mr-1" />
                            Criar Currículo
                          </Link>
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {recentResumes.slice(0,3).map((resume) => (
                          <div 
                            key={resume.id}
                            className="flex items-center justify-between gap-3 rounded-2xl border-2 border-blue-200 bg-white p-3.5 transition-all duration-300 hover:-translate-y-1 hover:border-blue-400 hover:shadow-lg hover:shadow-blue-200/50"
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-blue-200 bg-white">
                                <FileText className="w-5 h-5 text-blue-600" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-slate-900">{resume.title}</p>
                                <p className="text-[11px] text-slate-500">
                                  {formatDate(resume.created_at)}
                                </p>
                              </div>
                            </div>
                            <Button 
                              asChild 
                              size="sm"
                              className="rounded-full border-2 border-blue-200 bg-white text-xs font-semibold text-blue-600 shadow-sm hover:border-blue-400 hover:bg-blue-500 hover:text-white transition-all duration-300 h-8 px-3"
                            >
                              <Link to={`/resume/${resume.id}`}>
                                <Eye size={14} className="mr-1" />
                                Ver
                              </Link>
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                    </div>
                    <div className="pt-3 mt-3 border-t border-blue-100">
                      <Link to="/my-resume" className="block">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full rounded-full border-2 border-blue-200 bg-blue-500/5 px-4 text-[11px] font-bold text-blue-700 shadow-sm shadow-blue-100
                                     hover:border-blue-400 hover:bg-blue-500 hover:text-white hover:shadow-md hover:shadow-blue-200 transition-all duration-300"
                        >
                          Ver todos os currículos
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Recent Applications */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="h-full"
              >
                <Card className="h-full min-h-[360px] rounded-[24px] bg-white shadow-sm border-2 border-gray-200 flex flex-col overflow-hidden">
                  <CardHeader className="border-b border-gray-100 pb-4 bg-gradient-to-br from-green-50 to-white rounded-t-[22px]">
                    <div className="flex justify-between items-center gap-3">
                      <CardTitle className="flex items-center text-base font-semibold text-green-900">
                        <div className="mr-3 w-10 h-10 rounded-xl bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center shadow-sm border-2 border-green-200">
                          <Briefcase className="w-5 h-5 text-green-600 stroke-[2.5]" />
                        </div>
                        Candidaturas Recentes
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-5 flex-1 flex flex-col">
                    <div className="flex-1">
                    {recentApplications.length === 0 ? (
                      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-green-200 bg-green-50/70 py-10">
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-green-500 ring-2 ring-green-200">
                          <Briefcase className="w-7 h-7" />
                        </div>
                        <p className="text-sm font-medium text-green-900">Nenhuma candidatura encontrada</p>
                        <p className="text-xs text-slate-500">Candidate-se a vagas para aparecer aqui</p>
                        <Button 
                          asChild 
                          className="rounded-full border-2 border-green-200 bg-green-500/5 text-xs font-bold text-green-600 shadow-sm shadow-green-100 hover:border-green-400 hover:bg-green-500 hover:text-white hover:shadow-md hover:shadow-green-200 transition-all duration-300 h-9 px-4 mt-2"
                        >
                          <Link to="/jobs">
                            <Search className="w-3.5 h-3.5 mr-1" />
                            Buscar Vagas
                          </Link>
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {recentApplications.slice(0,3).map((application) => (
                          <div 
                            key={application.id}
                            className="flex items-center justify-between gap-3 rounded-2xl border-2 border-green-200 bg-white p-3.5 transition-all duration-300 hover:-translate-y-1 hover:border-green-400 hover:shadow-lg hover:shadow-green-200/50"
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className="flex h-10 w-10 md:h-11 md:w-11 items-center justify-center rounded-full border-2 border-green-200 bg-white overflow-hidden flex-shrink-0">
                                {(application.company_logo || application.job?.company?.logo_url) ? (
                                  <img 
                                    src={application.company_logo || application.job?.company?.logo_url} 
                                    alt={application.company_name || application.job?.company?.company_name || 'Empresa'} 
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <Building className="w-5 h-5 text-green-600" />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs md:text-sm font-medium text-slate-900 truncate">
                                  {application.job_title || application.job?.title || 'Vaga não encontrada'}
                                </p>
                                <p className="text-[10px] md:text-[11px] text-slate-500 truncate">
                                  {(application.company_name || application.job?.company?.company_name) && (
                                    <span>{application.company_name || application.job?.company?.company_name} • </span>
                                  )}
                                  {formatDate(application.created_at || application.applied_at)}
                                </p>
                              </div>
                            </div>
                            {application.status === 'interested' && (
                              <div className="flex items-center gap-1 bg-blue-100 px-2.5 py-1 rounded-full border border-blue-200">
                                <ThumbsUp size={12} className="text-blue-600" />
                                <span className="text-[11px] text-blue-700 font-semibold">Pré-aprovado</span>
                              </div>
                            )}
                            {application.status === 'pending' && (
                              <div className="flex items-center gap-1 bg-amber-100 px-2.5 py-1 rounded-full border border-amber-200">
                                <Clock size={12} className="text-amber-600" />
                                <span className="text-[11px] text-amber-700 font-semibold">Pendente</span>
                              </div>
                            )}
                            {application.status === 'reviewed' && (
                              <div className="flex items-center gap-1 bg-blue-100 px-2.5 py-1 rounded-full border border-blue-200">
                                <Eye size={12} className="text-blue-600" />
                                <span className="text-[11px] text-blue-700 font-semibold">Analisado</span>
                              </div>
                            )}
                            {application.status === 'approved' && (
                              <div className="flex items-center gap-1 bg-green-100 px-2.5 py-1 rounded-full border border-green-200">
                                <CheckCircle size={12} className="text-green-600" />
                                <span className="text-[11px] text-green-700 font-semibold">Aprovado</span>
                              </div>
                            )}
                            {application.status === 'rejected' && (
                              <div className="flex items-center gap-1 bg-red-100 px-2.5 py-1 rounded-full border border-red-200">
                                <AlertCircle size={12} className="text-red-600" />
                                <span className="text-[11px] text-red-700 font-semibold">Recusado</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    </div>
                    <div className="pt-3 mt-3 border-t border-green-100">
                      <Link to="/applications" className="block">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full rounded-full border-2 border-green-200 bg-green-500/5 px-4 text-[11px] font-bold text-green-700 shadow-sm shadow-green-100
                                     hover:border-green-400 hover:bg-green-500 hover:text-white hover:shadow-md hover:shadow-green-200 transition-all duration-300"
                        >
                          Ver todas as candidaturas
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Job Alerts (Aluno) */}
            {user?.type === 'candidate' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.45 }}
              >
                <Card className="h-full rounded-[24px] bg-white shadow-sm border-2 border-gray-200 overflow-hidden">
                  <CardHeader className="border-b border-gray-100 pb-4 bg-gradient-to-br from-indigo-50 to-white rounded-t-[22px]">
                    <div className="flex justify-between items-center gap-3">
                      <CardTitle className="flex items-center text-base font-semibold text-indigo-900">
                        <div className="mr-3 w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-50 to-indigo-100 flex items-center justify-center shadow-sm border-2 border-indigo-200">
                          <Target className="w-5 h-5 text-indigo-600 stroke-[2.5]" />
                        </div>
                        Vagas que eu quero receber
                      </CardTitle>
                      <Button size="sm" onClick={()=> setAlertFormOpen(v=>!v)} className="rounded-full border-2 border-indigo-200 bg-indigo-500/5 px-4 text-[11px] font-bold text-indigo-700 shadow-sm shadow-indigo-100 hover:border-indigo-400 hover:bg-indigo-500 hover:text-white hover:shadow-md hover:shadow-indigo-200 transition-all duration-300">
                        {alertFormOpen ? 'Fechar' : 'Criar alerta'}
                      </Button>
                    </div>
                    <p className="text-xs text-slate-500 mt-2 ml-10">Crie alertas com filtros; quando surgirem vagas que combinam, elas aparecem aqui.</p>
                  </CardHeader>
                  <CardContent className="pt-5">
                    {alertFormOpen && (
                      <div className="mb-4 p-5 rounded-2xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50/50 to-white shadow-sm">
                        <div className="grid md:grid-cols-3 gap-3">
                          <div>
                            <Label className="text-sm font-semibold text-gray-800 mb-1.5 block">Localização</Label>
                            <Input value={alertForm.location} onChange={e=> setAlertForm(p=>({...p, location:e.target.value}))} placeholder="Cidade, estado" className="rounded-xl" />
                          </div>
                          <div>
                            <Label className="text-sm font-semibold text-gray-800 mb-1.5 block">Área</Label>
                            <Combobox variant="minimal" options={areasList} value={alertForm.area} onChange={val=> setAlertForm(p=>({...p, area:val}))} />
                          </div>
                          {subareasList.length>0 && (
                            <div>
                              <Label className="text-sm font-semibold text-gray-800 mb-1.5 block">Sub-área</Label>
                              <Combobox variant="minimal" options={subareasList} value={alertForm.subarea} onChange={val=> setAlertForm(p=>({...p, subarea:val}))} />
                            </div>
                          )}
                          <div>
                            <Label className="text-sm font-semibold text-gray-800 mb-1.5 block">Contrato</Label>
                            <Combobox
                              variant="minimal"
                              options={[{value:'Todos',label:'Todos'}, {value:'clt',label:'CLT'}, {value:'pj',label:'PJ'}, {value:'estagio',label:'Estágio'}, {value:'temporario',label:'Temporário'}]}
                              value={alertForm.contract_type}
                              onChange={val=> setAlertForm(p=>({...p, contract_type:val}))}
                            />
                          </div>
                          <div>
                            <Label className="text-sm font-semibold text-gray-800 mb-1.5 block">Modalidade</Label>
                            <Combobox
                              variant="minimal"
                              options={[{value:'Todos',label:'Todas'}, {value:'presencial',label:'Presencial'}, {value:'hibrido',label:'Híbrido'}, {value:'remoto',label:'Remoto'}]}
                              value={alertForm.work_type}
                              onChange={val=> setAlertForm(p=>({...p, work_type:val}))}
                            />
                          </div>
                          <div>
                            <Label className="text-sm font-semibold text-gray-800 mb-1.5 block">Experiência</Label>
                            <Combobox
                              variant="minimal"
                              options={[{value:'Todos',label:'Todos'}, {value:'estagio',label:'Estágio'}, {value:'junior',label:'Júnior'}, {value:'pleno',label:'Pleno'}, {value:'senior',label:'Sênior'}]}
                              value={alertForm.experience_level}
                              onChange={val=> setAlertForm(p=>({...p, experience_level:val}))}
                            />
                          </div>
                        </div>
                        <div className="mt-4 flex justify-end gap-3">
                          <Button onClick={()=> setAlertForm({ location:'', contract_type:'Todos', work_type:'Todos', experience_level:'Todos', area:'Todos', subarea:'Todos' })} className="rounded-full border-2 border-slate-200 bg-slate-500/5 text-xs font-bold text-slate-600 shadow-sm shadow-slate-100 hover:border-slate-400 hover:bg-slate-500 hover:text-white hover:shadow-md hover:shadow-slate-200 transition-all duration-300 h-9 px-4">Limpar</Button>
                          <Button onClick={async () => {
                            if (!user?.id) return;
                            const created = await addAlert(user.id, { filters: {
                              location: alertForm.location,
                              contract_type: alertForm.contract_type,
                              work_type: alertForm.work_type,
                              experience_level: alertForm.experience_level,
                              area: alertForm.area,
                              subarea: alertForm.subarea,
                            } });
                            setJobAlerts(prev => [created, ...prev]);
                            setAlertFormOpen(false);
                            toast({ title: 'Alerta criado', description: 'Mostraremos aqui as vagas que combinam.' });
                          }} className="rounded-full border-2 border-indigo-200 bg-indigo-500/5 text-xs font-bold text-indigo-600 shadow-sm shadow-indigo-100 hover:border-indigo-400 hover:bg-indigo-500 hover:text-white hover:shadow-md hover:shadow-indigo-200 transition-all duration-300 h-9 px-4">Salvar alerta</Button>
                        </div>
                      </div>
                    )}

                    {/* Alerts list */}
                    {jobAlerts.length === 0 ? (
                      <div className="text-center py-6">
                        <Target className="w-10 h-10 text-indigo-400 mx-auto mb-2" />
                        <p className="text-gray-600">Você ainda não criou alertas de vaga.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {jobAlerts.map((a) => {
                          const matches = matchesByAlert[a.id] || [];
                          const title = summarizeAlert(a.filters) || 'Minha busca';
                          const expanded = expandedAlerts.has(a.id);
                          const INITIAL_ITEMS = 6;
                          const visible = expanded ? matches : matches.slice(0, INITIAL_ITEMS);
                          return (
                            <div key={a.id} className="rounded-2xl border-2 border-slate-200 bg-white transition-all duration-300 hover:border-indigo-400 hover:shadow-lg hover:shadow-indigo-200/50">
                              {/* Header do alerta */}
                              <div className="p-3 md:p-4 border-b border-slate-200">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
                                  <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                                    <div className="min-w-0 flex-1">
                                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${a.active ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                                          {a.active ? 'Ativo' : 'Pausado'}
                                        </span>
                                        <span className="font-semibold text-slate-900 text-sm truncate">{title}</span>
                                      </div>
                                      {a.filters?.location && (
                                        <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1 truncate">
                                          <MapPin className="w-3 h-3 flex-shrink-0" />
                                          <span className="truncate">{a.filters.location}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    <div className="text-[10px] md:text-[11px] px-2 md:px-2.5 py-1 rounded-full border-2 bg-blue-50 border-blue-200 text-blue-700 font-bold whitespace-nowrap">
                                      {matches.length} vaga{matches.length!==1?'s':''}
                                    </div>
                                    <Button size="sm" onClick={async () => { const alerts = await removeAlert(user.id, a.id); setJobAlerts(alerts); toast({ title:'Removido', description:'Alerta excluído.'}); }} className="rounded-full border-2 border-red-200 bg-red-500/5 text-[10px] md:text-xs font-bold text-red-600 shadow-sm shadow-red-100 hover:border-red-400 hover:bg-red-500 hover:text-white hover:shadow-md hover:shadow-red-200 transition-all duration-300 h-7 md:h-8 px-2 md:px-3">
                                      Excluir
                                    </Button>
                                  </div>
                                </div>
                              </div>
                              {/* Lista de vagas */}
                              {matches.length > 0 && (
                                <div className="p-4 bg-slate-50/50">
                                  <div className="grid sm:grid-cols-2 gap-3">
                                    {visible.map(j => {
                                      const companyLogo = j.company_logo || j.companyLogo || j.company?.logo || j.company?.profile_image || null;
                                      return (
                                      <div key={j.id} className="flex items-center justify-between gap-3 rounded-2xl border-2 border-slate-200 bg-white p-3 transition-all duration-300 hover:-translate-y-1 hover:border-indigo-400 hover:shadow-lg hover:shadow-indigo-200/50">
                                        <div className="flex items-center gap-3 min-w-0">
                                          <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-slate-200 bg-slate-50 flex-shrink-0 overflow-hidden">
                                            {companyLogo ? (
                                              <img src={companyLogo} alt={j.company_name || 'Empresa'} className="w-full h-full object-cover" />
                                            ) : (
                                              <Briefcase className="w-4 h-4 text-indigo-600" />
                                            )}
                                          </div>
                                          <div className="min-w-0">
                                            <div className="font-medium text-sm text-slate-900 leading-snug line-clamp-1">{j.title}</div>
                                            <div className="text-[11px] text-slate-500 line-clamp-1">{j.company_name}{j.location?` • ${j.location}`:''}</div>
                                          </div>
                                        </div>
                                        <Link to={`/job/${j.id}`} className="flex-shrink-0">
                                          <Button size="sm" className="rounded-full border-2 border-indigo-200 bg-indigo-500/5 text-xs font-bold text-indigo-600 shadow-sm shadow-indigo-100 hover:border-indigo-400 hover:bg-indigo-500 hover:text-white hover:shadow-md hover:shadow-indigo-200 transition-all duration-300 h-8 px-3">Ver</Button>
                                        </Link>
                                      </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                              {matches.length === 0 && (
                                <div className="p-6 text-center bg-slate-50/50">
                                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-slate-400 mx-auto mb-2">
                                    <Briefcase className="w-5 h-5" />
                                  </div>
                                  <p className="text-sm text-slate-500">Sem vagas correspondentes no momento</p>
                                </div>
                              )}
                              {matches.length > INITIAL_ITEMS && (
                                <div className="px-4 pb-4 flex justify-center bg-slate-50/50">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setExpandedAlerts(prev => {
                                        const next = new Set(prev);
                                        if (expanded) next.delete(a.id); else next.add(a.id);
                                        return next;
                                      });
                                    }}
                                    className="rounded-full border-2 border-indigo-200 bg-indigo-500/5 text-xs font-bold text-indigo-600 shadow-sm shadow-indigo-100 hover:border-indigo-400 hover:bg-indigo-500 hover:text-white hover:shadow-md hover:shadow-indigo-200 transition-all duration-300 h-8 px-4"
                                  >
                                    {expanded ? 'Ver menos' : `Ver mais (${matches.length - INITIAL_ITEMS})`}
                                  </Button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Saved Jobs for candidate */}
            {user?.type === 'candidate' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
              >
                <Card className="rounded-[24px] bg-white shadow-sm border-2 border-gray-200 overflow-hidden">
                  <CardHeader className="border-b border-gray-100 pb-4 bg-gradient-to-br from-pink-50 to-white rounded-t-[22px]">
                    <div className="flex justify-between items-center gap-3">
                      <CardTitle className="flex items-center text-base font-semibold text-pink-900">
                        <div className="mr-3 w-10 h-10 rounded-xl bg-gradient-to-br from-pink-50 to-pink-100 flex items-center justify-center shadow-sm border-2 border-pink-200">
                          <Heart className="w-5 h-5 text-pink-600 stroke-[2.5]" />
                        </div>
                        Minhas Vagas Salvas
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-5">
                    {savedJobs.length === 0 ? (
                      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-pink-200 bg-pink-50/70 py-10">
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-pink-500 ring-2 ring-pink-200">
                          <Briefcase className="w-7 h-7" />
                        </div>
                        <p className="text-sm font-medium text-pink-900">Nenhuma vaga salva</p>
                        <p className="text-xs text-slate-500">Salve vagas para acompanhar</p>
                        <Button 
                          asChild 
                          className="rounded-full border-2 border-pink-200 bg-pink-500/5 text-xs font-bold text-pink-600 shadow-sm shadow-pink-100 hover:border-pink-400 hover:bg-pink-500 hover:text-white hover:shadow-md hover:shadow-pink-200 transition-all duration-300 h-9 px-4 mt-2"
                        >
                          <Link to="/jobs">
                            <Search className="w-3.5 h-3.5 mr-1" />
                            Buscar Vagas
                          </Link>
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {savedJobs.slice(0,6).map((job) => {
                          const companyLogo = job.company_logo || job.companyLogo || job.company?.logo || job.company?.profile_image || null;
                          const companyInitials = (job.company_name || 'E').split(' ').filter(Boolean).slice(0,2).map(w => w[0]?.toUpperCase()).join('') || 'E';
                          return (
                          <div 
                            key={job.id}
                            className="flex items-center justify-between gap-3 rounded-2xl border-2 border-pink-200 bg-white p-3.5 transition-all duration-300 hover:-translate-y-1 hover:border-pink-400 hover:shadow-lg hover:shadow-pink-200/50"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-11 h-11 rounded-xl border-2 border-pink-200 shadow-sm overflow-hidden flex items-center justify-center bg-slate-50 flex-shrink-0">
                                {companyLogo ? (
                                  <img src={companyLogo} alt={job.company_name || 'Empresa'} className="w-full h-full object-cover" />
                                ) : (
                                  <span className="text-sm font-bold text-pink-600">{companyInitials}</span>
                                )}
                              </div>
                              <div>
                                <p className="font-semibold text-gray-900">{job.title}</p>
                                <p className="text-sm text-gray-600">
                                  {job.company_name}
                                  {job.location ? ` • ${job.location}` : ''}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button asChild variant="outline" size="sm" className="rounded-full border-2 border-pink-200 bg-pink-500/5 px-4 text-[11px] font-bold text-pink-700 shadow-sm shadow-pink-100 hover:border-pink-400 hover:bg-pink-500 hover:text-white hover:shadow-md hover:shadow-pink-200 transition-all duration-300">
                                <Link to={`/job/${job.id}`}>Ver</Link>
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="rounded-full border-2 border-red-200 bg-red-500/5 px-4 text-[11px] font-bold text-red-600 shadow-sm shadow-red-100 hover:border-red-400 hover:bg-red-500 hover:text-white hover:shadow-md hover:shadow-red-200 transition-all duration-300"
                                onClick={async () => { await removeSavedJob(job.id); const jobs = await listSavedJobs(); setSavedJobs(jobs.sort((a,b) => (b.savedAt||0) - (a.savedAt||0))); }}
                                title="Remover"
                              >
                                Remover
                              </Button>
                            </div>
                          </div>
                          );
                        })}
                        <div className="pt-4 border-t border-slate-100">
                          <Button 
                            asChild 
                            variant="outline"
                            className="w-full rounded-full border-2 border-pink-200 bg-pink-500/5 text-xs font-bold text-pink-700 shadow-sm shadow-pink-100 hover:border-pink-400 hover:bg-pink-500 hover:text-white hover:shadow-md hover:shadow-pink-200 transition-all duration-300 h-10"
                          >
                            <Link to="/jobs">
                              Ver mais vagas
                            </Link>
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>
        )}

        {/* Modais Detalhados dos Cards */}
        {/* Modal: Currículos */}
        <Dialog open={activeModal === 'resumes'} onOpenChange={(open) => !open && setActiveModal(null)}>
          <DialogContent className="sm:max-w-2xl border-0 rounded-[28px] shadow-[0_32px_80px_rgba(59,130,246,0.2)] p-0 overflow-hidden">
            {/* Header com gradiente */}
            <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 px-7 py-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg border border-white/30">
                  <FileText className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Currículo Inteligente</h2>
                  <p className="text-blue-200 text-sm mt-0.5">Gerencie seus currículos profissionais</p>
                </div>
              </div>
              {/* Status badge inline no header */}
              <div className="mt-5 flex items-center justify-between bg-white/15 backdrop-blur-sm rounded-2xl px-5 py-4 border border-white/20">
                <div>
                  <p className="text-blue-100 text-xs font-semibold uppercase tracking-widest mb-1">Status</p>
                  <p className="text-white text-2xl font-extrabold">{stats.totalResumes} currículo{stats.totalResumes !== 1 ? 's' : ''} criado{stats.totalResumes !== 1 ? 's' : ''}</p>
                </div>
                <span className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold shadow-lg ${
                  stats.totalResumes > 0
                    ? 'bg-emerald-400 text-emerald-900'
                    : 'bg-amber-400 text-amber-900'
                }`}>
                  {stats.totalResumes > 0 ? '✓ Concluído' : '⏳ Pendente'}
                </span>
              </div>
            </div>

            {/* Body */}
            <div className="px-7 py-6 space-y-4 max-h-[50vh] overflow-y-auto bg-gradient-to-b from-slate-50 to-white">
              {recentResumes.length > 0 ? (
                <>
                  <h4 className="font-bold text-gray-700 text-sm flex items-center gap-2">
                    <span className="w-1 h-4 bg-blue-500 rounded-full"></span>
                    Seus currículos
                  </h4>
                  {recentResumes.map((resume) => (
                    <div key={resume.id} className="flex items-center justify-between gap-4 p-4 bg-white border-2 border-blue-100 rounded-2xl hover:border-blue-400 hover:shadow-lg hover:shadow-blue-100 hover:-translate-y-0.5 transition-all duration-300 group">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center flex-shrink-0 border-2 border-blue-200 group-hover:scale-105 transition-transform">
                          <FileText className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-gray-900 truncate">{resume.name || 'Currículo'}</p>
                          <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                            <Calendar className="w-3 h-3" />
                            Criado em {formatDate(resume.created_at)}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <Button asChild variant="outline" size="sm" className="rounded-full border-2 border-blue-200 bg-blue-50 text-blue-700 font-bold text-xs hover:border-blue-400 hover:bg-blue-100 transition-all h-9 px-4">
                          <Link to={`/resume/${resume.id}`}>Ver</Link>
                        </Button>
                        <Button asChild size="sm" className="rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md shadow-blue-200 h-9 px-4">
                          <Link to={`/resume/${resume.id}/edit`}>Editar</Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <div className="text-center py-12 bg-white rounded-2xl border-2 border-dashed border-blue-200">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center mx-auto mb-4 border-2 border-blue-200">
                    <FileText className="w-8 h-8 text-blue-400" />
                  </div>
                  <p className="text-gray-600 font-semibold mb-1">Nenhum currículo ainda</p>
                  <p className="text-gray-400 text-sm mb-5">Crie seu primeiro currículo profissional</p>
                  <Button asChild className="rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-200 font-bold px-7">
                    <Link to="/create-resume">Criar Currículo</Link>
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal: Candidaturas */}
        <Dialog open={activeModal === 'applications'} onOpenChange={(open) => !open && setActiveModal(null)}>
          <DialogContent className="sm:max-w-3xl border-2 border-green-200 rounded-[24px] shadow-[0_20px_60px_rgba(34,197,94,0.15)]">
            <DialogHeader className="pb-2">
              <DialogTitle className="flex items-center gap-3 text-2xl">
                <div className="p-3 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg shadow-green-200">
                  <Briefcase className="w-6 h-6 text-white" />
                </div>
                <span className="bg-gradient-to-r from-green-700 to-emerald-700 bg-clip-text text-transparent font-bold">
                  Gestão de Candidaturas
                </span>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-5 max-h-[60vh] overflow-y-auto pr-2">
              {/* Stats Card */}
              <div className="bg-gradient-to-br from-green-50 via-green-50 to-emerald-100 border-2 border-green-200 rounded-2xl p-5 shadow-sm">
                <p className="text-sm font-bold text-green-800 uppercase tracking-wide mb-2">Total de Candidaturas</p>
                <p className="text-3xl font-extrabold text-green-900">{stats.totalApplications} candidatura(s) enviada(s)</p>
              </div>
              
              {recentApplications.length > 0 ? (
                <div className="space-y-4">
                  <h4 className="font-bold text-gray-800 flex items-center gap-2">
                    <span className="w-1.5 h-5 bg-green-500 rounded-full"></span>
                    Candidaturas recentes:
                  </h4>
                  {recentApplications.map((app) => (
                    <div key={app.id} className="p-4 bg-white border-2 border-gray-100 rounded-2xl hover:border-green-300 hover:shadow-lg transition-all duration-300 group">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-100 to-emerald-200 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Briefcase className="w-6 h-6 text-green-600" />
                          </div>
                          <div>
                            <p className="font-bold text-gray-900">{app.job_title || 'Vaga'}</p>
                            <p className="text-sm text-gray-600">{app.company_name || 'Empresa'}</p>
                          </div>
                        </div>
                        <span className={`px-4 py-1.5 rounded-full text-xs font-bold shadow-sm ${
                          app.status === 'approved' ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white' :
                          app.status === 'rejected' ? 'bg-gradient-to-r from-red-500 to-rose-600 text-white' :
                          app.status === 'interview' ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white' :
                          'bg-gradient-to-r from-amber-400 to-orange-500 text-white'
                        }`}>
                          {app.status === 'approved' ? '✓ Aprovado' : 
                           app.status === 'rejected' ? '✗ Rejeitado' : 
                           app.status === 'interview' ? '📅 Entrevista' : 
                           '⏳ Pendente'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                        <span className="text-sm text-gray-500 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          Enviada em {formatDate(app.created_at)}
                        </span>
                        <Button asChild variant="outline" size="sm" className="rounded-full border-2 border-green-200 hover:border-green-400 hover:bg-green-50 font-semibold text-green-700">
                          <Link to="/applications">Ver Detalhes</Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 bg-gradient-to-br from-gray-50 to-green-50/50 rounded-2xl border-2 border-dashed border-gray-200">
                  <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                    <Briefcase className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-600 font-medium mb-4">Você ainda não enviou candidaturas</p>
                  <Button asChild className="rounded-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg shadow-green-200 font-semibold px-6">
                    <Link to="/jobs">Buscar Vagas</Link>
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal: Pendentes */}
        <Dialog open={activeModal === 'pending'} onOpenChange={(open) => !open && setActiveModal(null)}>
          <DialogContent className="sm:max-w-2xl border-2 border-orange-200 rounded-[24px] shadow-[0_20px_60px_rgba(249,115,22,0.15)]">
            <DialogHeader className="pb-2">
              <DialogTitle className="flex items-center gap-3 text-2xl">
                <div className="p-3 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 shadow-lg shadow-orange-200">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
                <span className="bg-gradient-to-r from-orange-700 to-amber-700 bg-clip-text text-transparent font-bold">
                  Entrevistas & Pendentes
                </span>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-5 max-h-[60vh] overflow-y-auto pr-2">
              {/* Pending Stats */}
              <div className="bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-100 border-2 border-orange-200 rounded-2xl p-5 shadow-sm">
                <p className="text-sm font-bold text-orange-800 uppercase tracking-wide mb-2">Candidaturas Pendentes</p>
                <p className="text-3xl font-extrabold text-orange-900">{stats.pendingApplications} aguardando resposta</p>
              </div>
              
              {scheduledInterviews.length > 0 ? (
                <div className="space-y-4">
                  <h4 className="font-bold text-gray-800 flex items-center gap-2">
                    <span className="w-1.5 h-5 bg-indigo-500 rounded-full"></span>
                    Entrevistas confirmadas:
                  </h4>
                  {scheduledInterviews.map((interview) => (
                    <div key={interview.id} className="p-4 bg-white border-2 border-indigo-100 rounded-2xl hover:border-indigo-300 hover:shadow-lg transition-all duration-300 group">
                      <div className="flex items-center gap-4 mb-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-200 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Calendar className="w-6 h-6 text-indigo-600" />
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-gray-900">{interview.job_title}</p>
                          <p className="text-sm text-gray-600">{interview.company_name}</p>
                        </div>
                        <span className="px-4 py-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-xs font-bold shadow-sm">
                          ✓ Confirmado
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-indigo-700 bg-indigo-50 rounded-xl px-4 py-2">
                        <Clock className="w-4 h-4" />
                        <span className="font-semibold">{formatDate(interview.interview_date)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 bg-gradient-to-br from-gray-50 to-orange-50/50 rounded-2xl border-2 border-dashed border-gray-200">
                  <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                    <Calendar className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-600 font-medium">Nenhuma entrevista agendada no momento</p>
                  <p className="text-sm text-gray-400 mt-1">Continue se candidatando para receber convites</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal: Perfil Completo */}
        <Dialog open={activeModal === 'profile'} onOpenChange={(open) => !open && setActiveModal(null)}>
          <DialogContent className="sm:max-w-2xl border-2 border-purple-200 rounded-[24px] shadow-[0_20px_60px_rgba(147,51,234,0.15)]">
            <DialogHeader className="pb-2">
              <DialogTitle className="flex items-center gap-3 text-2xl">
                <div className="p-3 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg shadow-purple-200">
                  <Award className="w-6 h-6 text-white" />
                </div>
                <span className="bg-gradient-to-r from-purple-700 to-indigo-700 bg-clip-text text-transparent font-bold">
                  Analytics Pessoal
                </span>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-5 max-h-[60vh] overflow-y-auto pr-2">
              {/* Progress Card */}
              <div className="bg-gradient-to-br from-purple-50 via-purple-50 to-indigo-100 border-2 border-purple-200 rounded-2xl p-5 shadow-sm">
                <p className="text-sm font-bold text-purple-800 uppercase tracking-wide mb-3">Seu Progresso</p>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-4xl font-extrabold text-purple-900">{displayedCompleteness}%</p>
                  <span className={`px-4 py-1.5 rounded-full text-xs font-bold shadow-sm ${
                    displayedCompleteness === 100 ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white' :
                    displayedCompleteness >= 50 ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-white' :
                    'bg-gradient-to-r from-red-500 to-rose-600 text-white'
                  }`}>
                    {displayedCompleteness === 100 ? '✓ Completo' : displayedCompleteness >= 50 ? '⏳ Em progresso' : '⚠ Incompleto'}
                  </span>
                </div>
                <div className="h-4 bg-purple-100 rounded-full overflow-hidden shadow-inner">
                  <div 
                    className="h-full bg-gradient-to-r from-purple-500 via-indigo-500 to-purple-600 transition-all duration-700 ease-out rounded-full"
                    style={{ width: `${displayedCompleteness}%` }}
                  />
                </div>
              </div>

              {/* Checklist */}
              <div className="space-y-4">
                <h4 className="font-bold text-gray-800 flex items-center gap-2">
                  <span className="w-1.5 h-5 bg-purple-500 rounded-full"></span>
                  Checklist de perfil:
                </h4>
                {[
                  { done: stats.totalResumes > 0, label: 'Currículo criado', icon: FileText, color: 'blue' },
                  { done: stats.totalApplications > 0, label: 'Primeira candidatura enviada', icon: Briefcase, color: 'green' },
                  { done: displayedCompleteness === 100, label: 'Perfil 100% completo', icon: Award, color: 'purple' }
                ].map((item, idx) => (
                  <div key={idx} className={`flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 ${
                    item.done 
                      ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200' 
                      : 'bg-gray-50 border-2 border-gray-100 hover:border-gray-200'
                  }`}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      item.done 
                        ? 'bg-gradient-to-br from-green-500 to-emerald-600 shadow-md shadow-green-200' 
                        : 'bg-gray-200'
                    }`}>
                      {item.done 
                        ? <CheckCircle className="w-5 h-5 text-white" /> 
                        : <item.icon className="w-5 h-5 text-gray-400" />
                      }
                    </div>
                    <span className={`font-semibold ${item.done ? 'text-green-800' : 'text-gray-500'}`}>
                      {item.label}
                    </span>
                    {item.done && (
                      <span className="ml-auto text-green-600 text-sm font-medium">✓</span>
                    )}
                  </div>
                ))}
              </div>
              
              <div className="pt-4">
                <Button asChild className="w-full rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-lg shadow-purple-200 font-semibold py-6 text-base">
                  <Link to="/profile">Ver Perfil Completo</Link>
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
};

export default Dashboard;
