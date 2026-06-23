import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, LayoutGroup } from 'framer-motion';
import { Helmet } from 'react-helmet';
import { useDropzone } from 'react-dropzone';
import { 
  ArrowLeft, MapPin, Briefcase, DollarSign, Building, Calendar, 
  Clock, Users, Eye, Heart, Share2, AlertCircle, FileText, Upload, Check,
  Copy, MessageCircle, Send, Mail, Linkedin, MessageSquare, Star, Zap, X
} from 'lucide-react';
import { FaRegHandshake } from 'react-icons/fa';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import { jobs, resumes, applications as applicationsAPI, chatAPI, usersAPI } from '@/lib/api';
import { Combobox } from '@/components/ui/combobox';
import { schoolApi } from '@/lib/schoolApi';
import { getSavedJobIds, saveJob as saveJobLocal, removeJob as removeJobLocal } from '@/lib/savedJobs';
import { useAuth } from '@/contexts/AuthContext';

// Evitar chamadas duplicadas ao carregar a vaga (React StrictMode monta/ desmonta e pode disparar 2x em dev)
// Mantém um cache temporário por ID para reutilizar a mesma promessa
const jobGetCache = new Map();
const getJobWithCache = (id) => {
  if (jobGetCache.has(id)) return jobGetCache.get(id);
  const p = jobs.get(id).finally(() => {
    // expira após alguns segundos para não manter cache por muito tempo
    setTimeout(() => jobGetCache.delete(id), 10000);
  });
  jobGetCache.set(id, p);
  return p;
};

// ---- Helper: Obter URL da API com validação rigorosa ----
function getAPIBaseURL() {
  const apiUrl = import.meta.env.VITE_API_URL;
  
  if (!apiUrl || typeof apiUrl !== 'string' || apiUrl.trim().length === 0) {
    throw new Error('❌ ERRO CRÍTICO: VITE_API_URL não configurada');
  }
  
  const trimmed = apiUrl.trim().replace(/\/$/, '');
  
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    throw new Error('❌ ERRO CRÍTICO: VITE_API_URL deve ser URL absoluta');
  }
  
  let finalUrl = trimmed;
  if (!finalUrl.endsWith('/api')) {
    finalUrl = `${finalUrl}/api`;
  }
  
  return finalUrl;
}

const ViewJob = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [applyLoading, setApplyLoading] = useState(false);
  const [isApplied, setIsApplied] = useState(false);
  const [savedJobIds, setSavedJobIds] = useState(new Set());
  
  // Load saved job IDs on mount
  useEffect(() => {
    const loadSavedIds = async () => {
      const ids = await getSavedJobIds();
      setSavedJobIds(ids);
    };
    loadSavedIds();
  }, []);
  
  // Tipo de vaga (ícone no título)
  const [isSchoolHighlighted, setIsSchoolHighlighted] = useState(false);
  const [isCompanyHighlighted, setIsCompanyHighlighted] = useState(false);
  // Parceria: empresa é parceira da escola do candidato?
  const [isPartnerCompany, setIsPartnerCompany] = useState(false);
  
  // Estados para seleção de currículo
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [userResumes, setUserResumes] = useState([]);
  const [selectedResumeId, setSelectedResumeId] = useState(null);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadMode, setUploadMode] = useState('existing'); // 'existing' ou 'upload'
  // Modal mode: apply (candidatar) | send (enviar para canal externo) | download (baixar PDF)
  const [resumeModalMode, setResumeModalMode] = useState('apply'); // 'apply' | 'send' | 'download'
  // Alvo para envio externo (ex.: WhatsApp)
  const [pendingChannel, setPendingChannel] = useState(null); // { type: 'whatsapp'|'email', value: string }
  // Escola: indicar alunos
  const isSchool = user?.type === 'school';
  const [showRecommendModal, setShowRecommendModal] = useState(false);
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [classStudents, setClassStudents] = useState([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState(new Set());
  const [loadingClass, setLoadingClass] = useState(false);
  const [sendingRecommendations, setSendingRecommendations] = useState(false);
  // Compartilhar vaga
  const [shareOpen, setShareOpen] = useState(false);
  const [schoolGroups, setSchoolGroups] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [selectedGroupKey, setSelectedGroupKey] = useState('');
  const [sharing, setSharing] = useState(false);
  // Seguir empresa
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  // Logo da empresa (quando disponível)
  const [companyImage, setCompanyImage] = useState(null);
  // Candidaturas da vaga (para empresa/escola)
  const [jobApplications, setJobApplications] = useState([]);
  const [loadingApplications, setLoadingApplications] = useState(false);
  const [showApplicationsPopover, setShowApplicationsPopover] = useState(false);

  // Ao mudar a vaga, obter a imagem da empresa exclusivamente do backend (sem depender de localStorage)
  useEffect(() => {
    const loadCompanyImage = async () => {
      if (!job || job.is_community) { setCompanyImage(null); return; }
      const companyId = job.company_id || job.companyId || job.company?.id || null;
      if (!companyId) { setCompanyImage(null); return; }
      // Se a vaga já trouxe algum campo direto (caso futuro), usar imediatamente
      const direct = job.companyImage || job.company_image || job.company_logo || null;
      if (direct) { setCompanyImage(direct); return; }
      // Buscar pela API pública (garante profile_image) – não requer token
      try {
        const base = getAPIBaseURL();
        const resp = await fetch(`${base}/users/company/${companyId}`);
        if (resp.ok) {
          const data = await resp.json();
          const img = data?.company?.profile_image || data?.company?.profileImage || null;
          if (img) { setCompanyImage(img); return; }
        }
      } catch (e) {
        console.warn('Falha ao obter imagem da empresa pela API pública:', e);
      }
      // Se chegar aqui, não conseguimos imagem – permanece ícone de fallback.
    };
    loadCompanyImage();
  }, [job]);

  // Reagir a atualização de avatar vinda do perfil da empresa
  useEffect(()=>{
    const handler = (e)=>{
      const { companyId, image } = e.detail || {};
      if (!job || !companyId) return;
      const currentId = job.company_id || job.companyId || job.company?.id;
      if (!currentId || String(companyId)!==String(currentId)) return;
      setCompanyImage(image);
    };
    window.addEventListener('company-avatar-updated', handler);
    return () => window.removeEventListener('company-avatar-updated', handler);
  }, [job]);

  useEffect(() => {
    const loadJob = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log('🔍 Carregando vaga ID:', id);

        const response = await getJobWithCache(id);
        console.log('✅ Resposta da vaga:', response);
        
        if (response && response.job) {
          setJob(response.job);
          // Buscar imagem/logo da empresa quando a vaga é da plataforma
          try {
            const j = response.job;
            if (!j.is_community && j.company_id) {
              const comp = await usersAPI.getCompany(j.company_id);
              const img = comp?.company?.profileImage || comp?.company?.profile_image || null;
              setCompanyImage(img);
            } else {
              setCompanyImage(null);
            }
          } catch (e) {
            console.warn('Falha ao buscar imagem da empresa:', e);
            setCompanyImage(null);
          }
        } else {
          throw new Error('Vaga não encontrada na resposta da API');
        }
      } catch (error) {
        console.error('❌ Erro ao carregar vaga:', error);
        
        // Fallback para localStorage
        console.log('📦 Tentando localStorage como fallback...');
        const allJobs = JSON.parse(localStorage.getItem('curriculoja_jobs') || '[]');
        const foundJob = allJobs.find(job => job.id === id || job.id === parseInt(id));
        
        if (foundJob) {
          setJob(foundJob);
          console.log('✅ Vaga encontrada no localStorage');
        } else {
          setError('Vaga não encontrada');
          toast({
            title: 'Erro ao carregar vaga',
            description: 'A vaga não foi encontrada ou não está mais disponível.',
            variant: 'destructive',
          });
        }
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadJob();
    }
  }, [id]);

  // Descobrir se a vaga é destacada para o aluno atual (escola/empresa)
  useEffect(() => {
    const loadHighlightsForCandidate = async () => {
      try {
        // Resetar estados antes de carregar
        setIsSchoolHighlighted(false);
        setIsCompanyHighlighted(false);
        
        if (!job?.id) return;
        if (user?.type !== 'candidate') return; // relevantes apenas para alunos
        
        const data = await jobs.getMySchoolHighlightedJobs();
        const currentJobId = String(job.id);
        const schoolJobs = (data?.schoolJobs || []).map(String);
        const companyJobs = (data?.companyJobs || []).map(String);
        
        const inSchool = schoolJobs.includes(currentJobId);
        const inCompany = companyJobs.includes(currentJobId);
        
        // Só mostra destaque se realmente estiver nas listas
        setIsSchoolHighlighted(inSchool);
        setIsCompanyHighlighted(inCompany);
      } catch (e) {
        // Em caso de erro, garantir que os estados estejam falsos
        setIsSchoolHighlighted(false);
        setIsCompanyHighlighted(false);
      }
    };
    loadHighlightsForCandidate();
  }, [job?.id, user?.type]);

  // Verificar se a empresa é parceira da escola do candidato
  useEffect(() => {
    const checkPartnership = async () => {
      setIsPartnerCompany(false);
      if (!job?.company_id || job.is_community) return;
      if (user?.type !== 'candidate') return;
      try {
        const res = await jobs.checkCompanyPartnership(job.company_id);
        setIsPartnerCompany(res?.isPartner || false);
      } catch (e) {
        setIsPartnerCompany(false);
      }
    };
    checkPartnership();
  }, [job?.company_id, job?.is_community, user?.type, user?.id]);

  // Verificar se o candidato já se candidatou a esta vaga
  useEffect(() => {
    const checkIfApplied = async () => {
      if (!job?.id) return;
      if (user?.type !== 'candidate') return;
      try {
        const res = await applicationsAPI.checkApplication(job.id);
        if (res?.hasApplied) {
          setIsApplied(true);
        }
      } catch (e) {
        console.warn('Erro ao verificar candidatura:', e);
      }
    };
    checkIfApplied();
  }, [job?.id, user?.type, user?.id]);

  // Carregar status de seguimento da empresa
  useEffect(() => {
    const loadFollowStatus = async () => {
      if (!job?.company_id || job.is_community) { setIsFollowing(false); return; }
      if (user?.type !== 'candidate') { setIsFollowing(false); return; }
      try {
        const res = await chatAPI.getFollowStatus(job.company_id);
        setIsFollowing(res?.following || false);
      } catch (e) {
        setIsFollowing(false);
      }
    };
    loadFollowStatus();
  }, [job?.company_id, job?.is_community, user?.type, user?.id]);

  // Carregar candidaturas da vaga (empresa dona ou escola)
  useEffect(() => {
    const loadJobApplications = async () => {
      if (!job?.id) return;
      
      const isCompanyOwner = user?.type === 'company' && String(user?.id) === String(job?.company_id);
      
      // Empresa dona da vaga - usa endpoint de empresa
      if (isCompanyOwner) {
        setLoadingApplications(true);
        try {
          const res = await applicationsAPI.getJobApplications(job.id);
          setJobApplications(res?.applications || []);
        } catch (e) {
          console.warn('Erro ao carregar candidaturas:', e);
          setJobApplications([]);
        } finally {
          setLoadingApplications(false);
        }
        return;
      }
      
      // Escola - usa endpoint de escola filtrado por job_id
      if (isSchool) {
        setLoadingApplications(true);
        try {
          const rows = await schoolApi.listApplications({ job_id: job.id });
          // Mapear para formato similar ao da empresa
          const mapped = (rows || []).map(r => ({
            id: r.user_id + '-' + r.job_id,
            candidate_id: r.user_id,
            candidate_name: r.name,
            candidate_email: r.email,
            candidate_profile_image: r.profile_image,
            status: r.status,
            applied_at: r.applied_at,
            class_name: r.class_name,
            is_featured: r.is_featured
          }));
          setJobApplications(mapped);
        } catch (e) {
          console.warn('Erro ao carregar candidaturas (escola):', e);
          setJobApplications([]);
        } finally {
          setLoadingApplications(false);
        }
        return;
      }
      
      // Outros tipos de usuário não veem
      setJobApplications([]);
    };
    loadJobApplications();
  }, [job?.id, job?.company_id, user?.type, user?.id, isSchool]);

  // Load school classes on demand
  const openRecommend = async () => {
    if (!isSchool) return;
    try {
      const r = await schoolApi.listClasses();
      setClasses(r || []);
      setShowRecommendModal(true);
    } catch (e) {
      toast({ title: 'Erro', description: 'Não foi possível carregar turmas.', variant: 'destructive' });
    }
  };

  const loadClassStudents = async (cid) => {
    if (!cid) { setClassStudents([]); return; }
    try {
      setLoadingClass(true);
      const students = await schoolApi.listClassStudents(cid);
      // ordenar: destacados primeiro, depois alfabético
      const sorted = [...students].sort((a,b)=>{
        if ((a.is_featured?1:0) !== (b.is_featured?1:0)) return (b.is_featured?1:0) - (a.is_featured?1:0);
        return (a.name||'').localeCompare(b.name||'', 'pt-BR');
      });
      setClassStudents(sorted);
      setSelectedStudentIds(new Set());
    } catch (e) {
      toast({ title: 'Erro', description: 'Não foi possível carregar alunos da turma.', variant: 'destructive' });
    } finally {
      setLoadingClass(false);
    }
  };

  const toggleStudent = (userId) => {
    setSelectedStudentIds(prev => {
      const n = new Set(prev);
      if (n.has(userId)) n.delete(userId); else n.add(userId);
      return n;
    });
  };

  const submitRecommendations = async () => {
    if (!selectedClassId || selectedStudentIds.size === 0) {
      toast({ title: 'Seleção necessária', description: 'Escolha uma turma e pelo menos um aluno.', variant: 'destructive' });
      return;
    }
    try {
      setSendingRecommendations(true);
      const payload = { class_id: selectedClassId, student_ids: Array.from(selectedStudentIds) };
      await jobs.recommendStudents(id, payload);
      setShowRecommendModal(false);
      toast({ title: 'Alunos indicados!', description: 'A empresa poderá ver as indicações na página de candidatos.' });
    } catch (e) {
      toast({ title: 'Erro ao indicar', description: e.message || 'Tente novamente.', variant: 'destructive' });
    } finally {
      setSendingRecommendations(false);
    }
  };

  // (Versão anterior) Sem edição direta de informações da empresa

  const formatSalary = (min, max, fixed) => {
    if (fixed) {
      const f = Number(fixed);
      if (!Number.isNaN(f)) return `R$ ${f.toLocaleString('pt-BR')}`;
    }
    if (min && max) {
      const nmin = Number(min);
      const nmax = Number(max);
      if (!Number.isNaN(nmin) && !Number.isNaN(nmax) && nmin === nmax) {
        return `R$ ${nmin.toLocaleString('pt-BR')}`; // salário fixo
      }
      return `R$ ${nmin.toLocaleString('pt-BR')} - R$ ${nmax.toLocaleString('pt-BR')}`;
    } else if (min) {
      const nmin = Number(min);
      return `A partir de R$ ${nmin.toLocaleString('pt-BR')}`;
    } else if (max) {
      const nmax = Number(max);
      return `Até R$ ${nmax.toLocaleString('pt-BR')}`;
    }
    return 'Salário a combinar';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const handleApply = async () => {
    if (!user) {
      toast({
        title: 'Login necessário',
        description: 'Você precisa estar logado para se candidatar a uma vaga.',
        variant: 'destructive',
      });
      navigate('/login');
      return;
    }

    if (user.type !== 'candidate') {
      toast({
        title: 'Acesso negado',
        description: 'Apenas candidatos podem se candidatar a vagas.',
        variant: 'destructive',
      });
      return;
    }

    try {
  // Carregar currículos do usuário
      const resumesResponse = await resumes.list();
      setUserResumes(resumesResponse.resumes || []);
      
      // Se tem currículos, mostrar modal de seleção
      if (resumesResponse.resumes && resumesResponse.resumes.length > 0) {
        // Selecionar o padrão automaticamente
        const defaultResume = resumesResponse.resumes.find(r => r.is_default);
        if (defaultResume) {
          setSelectedResumeId(defaultResume.id);
        }
        setResumeModalMode('apply');
        setShowResumeModal(true);
      } else {
        // Se não tem currículos, abrir modal apenas para upload
        setUploadMode('upload');
        setResumeModalMode('apply');
        setShowResumeModal(true);
      }
    } catch (error) {
      console.error('Erro ao carregar currículos:', error);
      // Se falhar, mostrar modal para upload
      setUploadMode('upload');
      setResumeModalMode('apply');
      setShowResumeModal(true);
    }
  };

  // Abrir seleção de currículo para envio via canal externo (ex.: WhatsApp)
  const handleOpenExternalSend = async (channelText) => {
    if (!user) {
      toast({ title: 'Login necessário', description: 'Entre para enviar seu currículo.', variant: 'destructive' });
      navigate('/login');
      return;
    }
    if (user.type !== 'candidate') {
      toast({ title: 'Apenas candidatos', description: 'Essa ação é exclusiva para alunos/candidatos.', variant: 'destructive' });
      return;
    }

    const isEmail = /@/.test(channelText);
    const digits = (channelText || '').replace(/\D/g, '');
    const isWhats = /^\d{10,}$/.test(digits);
    const type = isWhats ? 'whatsapp' : (isEmail ? 'email' : 'other');
    setPendingChannel({ type, value: isWhats ? digits : channelText });

    try {
      const r = await resumes.list();
      setUserResumes(r.resumes || []);
      const def = (r.resumes || []).find(rr => rr.is_default);
      if (def) setSelectedResumeId(def.id);
    } catch (e) {
      // ignore, modal permitirá upload
    }
    setUploadMode((userResumes && userResumes.length > 0) ? 'existing' : 'upload');
    setResumeModalMode('send');
    setShowResumeModal(true);
  };

  // Abrir seleção de currículo para apenas baixar (PDF)
  const handleOpenDownloadResume = async () => {
    if (!user) {
      toast({ title: 'Login necessário', description: 'Entre para acessar seus currículos.', variant: 'destructive' });
      navigate('/login');
      return;
    }
    try {
      const r = await resumes.list();
      setUserResumes(r.resumes || []);
      const def = (r.resumes || []).find(rr => rr.is_default);
      if (def) setSelectedResumeId(def.id);
      setUploadMode((r.resumes && r.resumes.length > 0) ? 'existing' : 'upload');
    } catch (e) {
      setUploadMode('upload');
    }
    setResumeModalMode('download');
    setShowResumeModal(true);
  };

  // Utilitário: baixa um blob com filename
  const triggerDownload = (blob, filename) => {
    try {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || 'curriculo.pdf';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 0);
    } catch {}
  };

  // Confirmar envio para canal externo (WhatsApp/E-mail)
  const handleConfirmExternalSend = async () => {
    if (!selectedResumeId && !uploadFile) {
      toast({ title: 'Selecione um currículo', description: 'Escolha um currículo ou envie um arquivo.', variant: 'destructive' });
      return;
    }
    try {
      setApplyLoading(true);
      let resumeId = selectedResumeId;
      // Upload se necessário
      if (uploadMode === 'upload' && uploadFile) {
        const formData = new FormData();
        formData.append('resumeFile', uploadFile);
        formData.append('extractedText', 'Texto extraído do arquivo');
        formData.append('parsedData', JSON.stringify({ name: user.name || '', email: user.email || '', phone: user.phone || '' }));
        const up = await resumes.upload(formData);
        if (!up?.resume?.id) throw new Error('Falha no upload');
        resumeId = up.resume.id;
      }

      // Registrar candidatura no banco (para contar como candidatura enviada)
      if (job?.id) {
        try {
          await applicationsAPI.create({
            job_id: job.id,
            resume_id: resumeId,
            cover_letter: `Candidatura via ${pendingChannel?.type === 'whatsapp' ? 'WhatsApp' : 'E-mail'} externo`
          });
          console.log('✅ Candidatura registrada no banco para vaga da comunidade');
        } catch (err) {
          console.error('❌ Erro ao registrar candidatura:', err);
          // Continua mesmo se falhar - não bloqueia o envio
        }
      }

      // Se for e-mail: enviar via servidor (anexo)
      if (pendingChannel?.type === 'email') {
        try {
          await resumes.sendEmail(resumeId, {
            to: pendingChannel.value,
            subject: 'Candidatura',
            body: 'Olá, estou me candidatando à vaga auxiliar de produção. Segue meu currículo.'
          });
          toast({ title: 'E-mail enviado', description: 'Enviamos seu currículo por e-mail com anexo.' });
          setShowResumeModal(false);
          return;
        } catch (err) {
          console.error('Falha ao enviar e-mail via servidor:', err);
          // Fallback: baixar o PDF e abrir Gmail com mensagem pronta
          try {
            const resp = await resumes.download(resumeId);
            const blob = await resp.blob();
            const disposition = resp.headers.get('Content-Disposition') || '';
            const match = disposition.match(/filename="?([^";]+)"?/i);
            const filename = match ? match[1] : 'curriculo.pdf';
            triggerDownload(blob, filename);
          } catch {}
          const subject = encodeURIComponent('Candidatura');
          const body = encodeURIComponent('Olá, estou me candidatando à vaga auxiliar de produção. Segue meu currículo.\n\n(Anexe o arquivo baixado)');
          const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(pendingChannel.value)}&su=${subject}&body=${body}`;
          window.open(gmailUrl, '_blank');
          toast({ title: 'Abrindo Gmail', description: 'Anexe o PDF baixado ao e-mail.' });
          setShowResumeModal(false);
          return;
        }
      }

      // WhatsApp: baixar o arquivo e depois abrir a conversa com a mensagem (não anexar automaticamente)
      const resp = await resumes.download(resumeId);
      const blob = await resp.blob();
      const disposition = resp.headers.get('Content-Disposition') || '';
      const match = disposition.match(/filename="?([^";]+)"?/i);
      const filename = match ? match[1] : 'curriculo.pdf';
      const message = `Olá, estou me candidatando à vaga ${job.title}. Segue meu currículo.`;

      // Baixa o arquivo primeiro
      triggerDownload(blob, filename);

      // Abre WhatsApp com a mensagem pronta (sem anexo automático)
      if (pendingChannel?.type === 'whatsapp' && pendingChannel?.value) {
        const enc = encodeURIComponent(message + '\n\n(Anexe o arquivo baixado na conversa)');
        const url = `https://wa.me/${pendingChannel.value}?text=${enc}`;
        window.open(url, '_blank');
        toast({ title: 'Arquivo baixado', description: 'Abrimos o WhatsApp com a mensagem; anexe o PDF baixado na conversa.' });
        setShowResumeModal(false);
        return;
      }
      // E-mail (fallback) — mantido caso algo chegue aqui como e-mail
      if (pendingChannel?.type === 'email') {
        const subj = encodeURIComponent(`Candidatura: ${job.title}`);
        const body = encodeURIComponent(message + '\n\n(Anexe o arquivo baixado a este e-mail)');
        window.location.href = `mailto:${pendingChannel.value}?subject=${subj}&body=${body}`;
        toast({ title: 'Arquivo baixado', description: 'Abrimos seu e-mail; anexe o PDF baixado.' });
        setShowResumeModal(false);
        return;
      }
      setShowResumeModal(false);
    } catch (e) {
      console.error('Erro no envio externo:', e);
      toast({ title: 'Erro ao preparar envio', description: e.message || 'Tente novamente.', variant: 'destructive' });
    } finally {
      setApplyLoading(false);
      setPendingChannel(null);
    }
  };

  // Confirmar apenas download do currículo selecionado
  const handleConfirmDownload = async () => {
    if (!selectedResumeId && !(uploadMode === 'upload' && uploadFile)) {
      toast({ title: 'Selecione um currículo', description: 'Escolha um currículo ou envie um arquivo.', variant: 'destructive' });
      return;
    }
    try {
      setApplyLoading(true);
      let resumeId = selectedResumeId;
      if (uploadMode === 'upload' && uploadFile) {
        const formData = new FormData();
        formData.append('resumeFile', uploadFile);
        formData.append('extractedText', 'Texto extraído do arquivo');
        formData.append('parsedData', JSON.stringify({ name: user.name || '', email: user.email || '', phone: user.phone || '' }));
        const up = await resumes.upload(formData);
        if (!up?.resume?.id) throw new Error('Falha no upload');
        resumeId = up.resume.id;
      }
      const resp = await resumes.download(resumeId);
      const blob = await resp.blob();
      const disp = resp.headers.get('Content-Disposition') || '';
      const match = disp.match(/filename="?([^";]+)"?/i);
      const filename = match ? match[1] : 'curriculo.pdf';
      triggerDownload(blob, filename);
      toast({ title: 'Download iniciado', description: 'Seu currículo foi baixado em PDF.' });
      setShowResumeModal(false);
    } catch (e) {
      console.error('Erro ao baixar currículo:', e);
      toast({ title: 'Erro ao baixar', description: e.message || 'Tente novamente.', variant: 'destructive' });
    } finally {
      setApplyLoading(false);
    }
  };

  // Função para configurar o dropzone
  const onDrop = useCallback(acceptedFiles => {
    if (acceptedFiles.length > 0) {
      setUploadFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    maxFiles: 1
  });

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: 'Copiado!', description: 'Contato copiado para a área de transferência.' });
    } catch (e) {
      toast({ title: 'Não foi possível copiar', description: 'Copie manualmente.', variant: 'destructive' });
    }
  };

  // Função para confirmar candidatura com currículo selecionado
  const handleConfirmApplication = async () => {
    if (!selectedResumeId && !uploadFile) {
      toast({
        title: 'Seleção necessária',
        description: 'Escolha um currículo ou faça upload de um arquivo.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setApplyLoading(true);
      let resumeId = selectedResumeId;

      // Se escolheu upload, fazer upload primeiro
      if (uploadMode === 'upload' && uploadFile) {
        const formData = new FormData();
        formData.append('resumeFile', uploadFile);
        formData.append('extractedText', 'Texto extraído do arquivo');
        formData.append('parsedData', JSON.stringify({
          name: user.name || '',
          email: user.email || '',
          phone: user.phone || ''
        }));

        // Use the resumes.upload helper which wraps the API base URL and token
        const uploadResult = await resumes.upload(formData);

        // Guard: ensure resume object exists
        if (!uploadResult || !uploadResult.resume || !uploadResult.resume.id) {
          throw new Error('Resposta de upload inválida');
        }

        resumeId = uploadResult.resume.id;

        toast({
          title: 'Arquivo carregado',
          description: 'Seu currículo foi carregado com sucesso.',
        });
      }
      
      // Fazer candidatura
      const applicationData = {
        job_id: id,
        resume_id: resumeId,
        cover_letter: 'Candidatura via plataforma'
      };
      
      console.log('📋 Enviando candidatura com dados:', applicationData);
      
  await applicationsAPI.create(applicationData);

      toast({
        title: 'Candidatura enviada!',
        description: 'Sua candidatura foi enviada com sucesso.',
      });
      
      setIsApplied(true);
      setShowResumeModal(false);
    } catch (error) {
      console.error('❌ Erro ao se candidatar:', error);
      
      if (error.response?.status === 409 || error.response?.data?.code === 'ALREADY_APPLIED') {
        toast({
          title: 'Candidatura já enviada',
          description: 'Você já se candidatou a esta vaga anteriormente.',
          variant: 'destructive',
        });
        setIsApplied(true);
        setShowResumeModal(false);
      } else {
        toast({
          title: 'Erro na candidatura',
          description: error.response?.data?.error || error.message || 'Ocorreu um erro. Tente novamente.',
          variant: 'destructive',
        });
      }
    } finally {
      setApplyLoading(false);
    }
  };

  const toggleSave = async () => {
    if (!user || user.type !== 'candidate') {
      toast({ title: 'Apenas candidatos', description: 'Entre como aluno para salvar vagas.', variant: 'destructive' });
      return;
    }
    if (!job) return;
    const idStr = String(job.id);
    if (savedJobIds.has(idStr)) {
      await removeJobLocal(idStr);
      const next = new Set([...savedJobIds]);
      next.delete(idStr);
      setSavedJobIds(next);
      toast({ title: 'Vaga removida', description: 'Removida das suas vagas salvas.' });
    } else {
      await saveJobLocal({ id: job.id, title: job.title, company_name: job.company_name, location: job.location });
      const next = new Set([...savedJobIds, idStr]);
      setSavedJobIds(next);
      toast({ title: 'Vaga salva', description: 'Você pode ver em "Minhas vagas salvas" no dashboard.' });
    }
  };

  // Compartilhar vaga (usa mesmo padrão da busca)
  const openShareForJob = async () => {
    if (!job) return;
    setShareOpen(true);
    if (isSchool) {
      try {
        setLoadingGroups(true);
        const grps = await chatAPI.getGroups();
        setSchoolGroups(Array.isArray(grps) ? grps : []);
        if (grps?.length) setSelectedGroupKey(grps[0].key);
      } catch (e) {
        toast({ title: 'Erro ao carregar grupos', description: 'Tente novamente.', variant: 'destructive' });
      } finally {
        setLoadingGroups(false);
      }
    }
  };
  const copyShareLink = async () => {
    if (!job) return;
    try {
      const url = `${window.location.origin}/job/${job.id}`;
      await navigator.clipboard.writeText(url);
      toast({ title: 'Link copiado', description: 'O link da vaga foi copiado.' });
    } catch (e) {
      toast({ title: 'Falha ao copiar', description: 'Copie o link manualmente.', variant: 'destructive' });
    }
  };
  const shareToGroup = async () => {
    if (!job || !selectedGroupKey) return;
    try {
      setSharing(true);
      const url = `${window.location.origin}/job/${job.id}`;
      const msg = `${job.title} — ${job.company_name}\n${url}`;
      await chatAPI.sendGroupMessage(selectedGroupKey, msg);
      toast({ title: 'Vaga compartilhada', description: 'Enviada para o grupo selecionado.' });
      setShareOpen(false);
    } catch (e) {
      toast({ title: 'Erro ao compartilhar', description: 'Tente novamente.', variant: 'destructive' });
    } finally {
      setSharing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
        <div className="container mx-auto px-4">
          <Card>
            <CardContent className="p-12 text-center">
              <div className="flex justify-center items-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color1)]"></div>
                <span className="ml-2">Carregando vaga...</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
        <div className="container mx-auto px-4">
          <Card>
            <CardContent className="p-12 text-center">
              <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-400" />
              <h3 className="text-xl font-semibold mb-2">Vaga não encontrada</h3>
              <p className="text-gray-600 mb-4">
                A vaga que você está procurando não existe ou não está mais disponível.
              </p>
              <Link to="/search-jobs">
                <Button className="bg-[var(--color1)] text-white hover:bg-[var(--color2)]">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Voltar às vagas
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
  <title>{job?.title || 'Vaga'} - {job?.company_name || 'Empresa'} | CurrículoJá</title>
        <meta name="description" content={job?.description?.substring(0, 160) || 'Detalhes da vaga de emprego'} />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-4 sm:py-8">
        <div className="container mx-auto px-3 sm:px-4 max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-4 sm:space-y-6"
          >
            {/* Header com botão voltar - escondido no mobile */}
            <div className="hidden sm:flex items-center justify-between">
              <Button
                variant="outline"
                onClick={() => navigate(-1)}
                className="rounded-2xl border-gray-200 hover:bg-blue-50 hover:border-blue-400 hover:text-blue-600 hover:shadow-md transition-all duration-200 text-sm px-3 py-2"
                size="sm"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Button>
              
              <div className="flex items-center space-x-3">
                {/* Indicador de candidaturas (empresa dona da vaga ou escola) */}
                {((user?.type === 'company' && String(user?.id) === String(job?.company_id)) || isSchool) && (
                  <div className="relative">
                    <button
                      onClick={() => setShowApplicationsPopover(!showApplicationsPopover)}
                      className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-2xl border border-gray-200 bg-white hover:bg-blue-50 hover:border-blue-300 transition-all duration-200 group"
                    >
                      {/* Fotos empilhadas ou ícone vazio */}
                      {jobApplications.length > 0 ? (
                        <div className="flex -space-x-2">
                          {jobApplications.slice(0, 4).map((app, idx) => (
                            <div
                              key={app.id}
                              className="w-7 h-7 rounded-full border-2 border-white overflow-hidden bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center shadow-sm"
                              style={{ zIndex: 4 - idx }}
                            >
                              {app.candidate_profile_image ? (
                                <img src={app.candidate_profile_image} alt={app.candidate_name} className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-white text-[10px] font-bold">{app.candidate_name?.charAt(0)?.toUpperCase()}</span>
                              )}
                            </div>
                          ))}
                          {jobApplications.length > 4 && (
                            <div className="w-7 h-7 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-600 shadow-sm" style={{ zIndex: 0 }}>
                              +{jobApplications.length - 4}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="w-7 h-7 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center">
                          <Users className="w-3.5 h-3.5 text-gray-400" />
                        </div>
                      )}
                      <span className="text-[12px] font-semibold text-gray-700 group-hover:text-blue-600">
                        {jobApplications.length > 0 ? `${jobApplications.length} candidatura${jobApplications.length !== 1 ? 's' : ''}` : '0 candidaturas'}
                      </span>
                    </button>
                    
                    {/* Popover com lista de candidaturas */}
                    {showApplicationsPopover && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowApplicationsPopover(false)} />
                        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden">
                          <div className="px-4 py-3 border-b border-gray-100">
                            <h4 className="font-semibold text-gray-900 text-sm">{jobApplications.length} Candidatura{jobApplications.length !== 1 ? 's' : ''}</h4>
                          </div>
                          {jobApplications.length > 0 ? (
                            <>
                              <div className="max-h-[280px] overflow-y-auto">
                                {jobApplications.slice(0, 8).map((app) => (
                                  <Link
                                    key={app.id}
                                    to={isSchool ? `/school/student/${app.candidate_id}` : `/applications?highlight=${app.id}`}
                                    className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                                    onClick={() => setShowApplicationsPopover(false)}
                                  >
                                    <div className="w-9 h-9 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center flex-shrink-0">
                                      {app.candidate_profile_image ? (
                                        <img src={app.candidate_profile_image} alt={app.candidate_name} className="w-full h-full object-cover" />
                                      ) : (
                                        <span className="text-gray-600 text-xs font-medium">{app.candidate_name?.charAt(0)?.toUpperCase()}</span>
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium text-gray-900 text-[13px] truncate">{app.candidate_name}</p>
                                      <div className="flex items-center gap-2 text-[11px] text-gray-500">
                                        {app.class_name && <span>{app.class_name}</span>}
                                        {app.class_name && app.applied_at && <span>•</span>}
                                        {app.applied_at && <span>{new Date(app.applied_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</span>}
                                      </div>
                                    </div>
                                    <span className={`text-[10px] px-2 py-1 rounded-md font-medium ${
                                      app.status === 'pending' ? 'bg-amber-50 text-amber-600' :
                                      app.status === 'reviewing' ? 'bg-blue-50 text-blue-600' :
                                      app.status === 'interview' ? 'bg-purple-50 text-purple-600' :
                                      app.status === 'rejected' ? 'bg-red-50 text-red-600' :
                                      app.status === 'approved' ? 'bg-green-50 text-green-600' :
                                      app.status === 'hired' ? 'bg-emerald-50 text-emerald-700' :
                                      'bg-gray-50 text-gray-500'
                                    }`}>
                                      {app.status === 'pending' ? 'Pendente' :
                                       app.status === 'reviewing' ? 'Análise' :
                                       app.status === 'interview' ? 'Entrevista' :
                                       app.status === 'rejected' ? 'Rejeitado' :
                                       app.status === 'approved' ? 'Aprovado' :
                                       app.status === 'hired' ? 'Contratado' :
                                       app.status}
                                    </span>
                                  </Link>
                                ))}
                              </div>
                              {jobApplications.length > 8 && (
                                <Link
                                  to={isSchool ? "/school/employability" : "/applications"}
                                  className="block px-4 py-2.5 text-center text-[12px] font-medium text-blue-600 hover:bg-gray-50 border-t border-gray-100"
                                  onClick={() => setShowApplicationsPopover(false)}
                                >
                                  Ver todas →
                                </Link>
                              )}
                            </>
                          ) : (
                            <div className="px-4 py-8 text-center">
                              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                                <Users className="w-6 h-6 text-gray-400" />
                              </div>
                              <p className="text-gray-500 text-sm">Nenhum aluno se candidatou ainda</p>
                              <p className="text-gray-400 text-xs mt-1">As candidaturas aparecerão aqui</p>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openShareForJob}
                  className="rounded-2xl border-gray-200 hover:bg-gray-50 px-3"
                >
                  <Share2 className="w-4 h-4 mr-1" />
                  Compartilhar
                </Button>
                {user?.type === 'candidate' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleSave}
                    className={`rounded-2xl border-gray-200 px-3 ${savedJobIds.has(String(job?.id)) ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'hover:bg-gray-50'}`}
                  >
                    <Heart className={`w-4 h-4 ${savedJobIds.has(String(job?.id)) ? 'fill-red-500 text-red-500' : ''}`} />
                  </Button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              {/* Card de candidatura para mobile - aparece primeiro */}
              <div className="lg:hidden order-1">
                {!(isSchool && job.is_community) && (
                <Card className={`shadow-lg rounded-2xl border-0 ${isApplied ? 'bg-gradient-to-br from-green-600 to-green-700' : 'bg-gradient-to-br from-blue-600 to-indigo-600'} text-white overflow-hidden`}>
                  <CardContent className="p-4">
                    {isApplied ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                              <Check className="w-5 h-5 text-white" strokeWidth={2.5} />
                            </div>
                            <div>
                              <h3 className="text-sm font-bold">Candidatura Enviada</h3>
                              <p className="text-green-100 text-[11px]">Acompanhe o status</p>
                            </div>
                          </div>
                          <Link to="/applications">
                            <Button 
                              variant="secondary"
                              size="sm"
                              className="bg-white hover:bg-green-50 text-green-700 font-semibold rounded-xl px-3 h-8"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </Link>
                        </div>
                        {/* Botões compartilhar/salvar mobile */}
                        <div className="flex items-center gap-2.5 pt-2 mt-1 border-t border-white/15">
                          <button
                            onClick={openShareForJob}
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 active:scale-[0.98] text-white text-sm font-medium transition-all duration-200 backdrop-blur-sm"
                          >
                            <Share2 className="w-4 h-4" />
                            Compartilhar
                          </button>
                          <button
                            onClick={toggleSave}
                            className={`flex items-center justify-center gap-2 py-2.5 px-5 rounded-xl text-sm font-medium transition-all duration-200 active:scale-[0.98] backdrop-blur-sm ${savedJobIds.has(String(job?.id)) ? 'bg-white text-red-500 shadow-sm' : 'bg-white/15 hover:bg-white/25 text-white'}`}
                          >
                            <Heart className={`w-4 h-4 ${savedJobIds.has(String(job?.id)) ? 'fill-red-500' : ''}`} />
                            {savedJobIds.has(String(job?.id)) ? 'Salva' : 'Salvar'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                              <Briefcase className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <h3 className="text-sm font-bold">Interessou-se?</h3>
                              <p className="text-blue-100 text-[11px]">Candidate-se agora!</p>
                            </div>
                          </div>
                          {!isSchool && !job.is_community && (
                            <Button 
                              onClick={handleApply}
                              disabled={applyLoading}
                              className="bg-white text-blue-600 hover:bg-gray-100 font-semibold rounded-xl px-3 h-8 text-sm"
                              size="sm"
                            >
                              {applyLoading ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                              ) : (
                                <>
                                  <Upload className="w-4 h-4 mr-1" />
                                  Candidatar
                                </>
                              )}
                            </Button>
                          )}
                          {!isSchool && job.is_community && Array.isArray(job.community_submission_methods) && job.community_submission_methods.length > 0 && (
                            <button
                              type="button"
                              onClick={() => handleOpenExternalSend(job.community_submission_methods[0])}
                              className="inline-flex items-center gap-1.5 bg-white text-blue-700 hover:bg-gray-100 font-semibold py-1.5 px-3 rounded-xl text-sm"
                            >
                              <Send className="w-4 h-4"/>
                              Candidatar
                            </button>
                          )}
                          {isSchool && !job.is_community && (
                            <Button
                              onClick={openRecommend}
                              className="bg-white text-blue-700 hover:bg-gray-100 font-semibold rounded-xl px-3 h-8 text-sm"
                              size="sm"
                            >
                              Indicar aluno
                            </Button>
                          )}
                        </div>
                        {/* Botões compartilhar/salvar mobile */}
                        {user?.type === 'candidate' && (
                          <div className="flex items-center gap-2.5 pt-2 mt-1 border-t border-white/15">
                            <button
                              onClick={openShareForJob}
                              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 active:scale-[0.98] text-white text-sm font-medium transition-all duration-200 backdrop-blur-sm"
                            >
                              <Share2 className="w-4 h-4" />
                              Compartilhar
                            </button>
                            <button
                              onClick={toggleSave}
                              className={`flex items-center justify-center gap-2 py-2.5 px-5 rounded-xl text-sm font-medium transition-all duration-200 active:scale-[0.98] backdrop-blur-sm ${savedJobIds.has(String(job?.id)) ? 'bg-white text-red-500 shadow-sm' : 'bg-white/15 hover:bg-white/25 text-white'}`}
                            >
                              <Heart className={`w-4 h-4 ${savedJobIds.has(String(job?.id)) ? 'fill-red-500' : ''}`} />
                              {savedJobIds.has(String(job?.id)) ? 'Salva' : 'Salvar'}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
                )}
              </div>

              {/* Coluna principal - Informações da vaga */}
              <div className="lg:col-span-2 space-y-4 sm:space-y-6 order-2">
                {/* Card principal da vaga */}
                <Card className="shadow-lg rounded-2xl border-2 border-gray-200 bg-white">
                  <CardHeader className="pb-4 sm:pb-6 px-4 sm:px-6">
                    <div className="space-y-3 sm:space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2 sm:space-y-3 flex-1">
                          <CardTitle className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 leading-tight flex items-center gap-2 flex-wrap">
                            {job.title}
                            {job.is_community && (
                              <span
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-teal-800 bg-emerald-50 border border-emerald-200 text-xs font-semibold"
                                title="Vaga da Comunidade"
                                aria-label="Vaga da Comunidade"
                              >
                                <Users className="w-4 h-4 text-teal-700" />
                                <span className="hidden sm:inline">Comunidade</span>
                              </span>
                            )}
                            {!job.is_community && (() => {
                              // Para aluno: mostrar "Vaga destacada" se estiver em qualquer lista (escola ou empresa)
                              if (isSchoolHighlighted || isCompanyHighlighted) {
                                return (
                                  <span
                                    className="inline-flex items-center gap-1.5 pl-1.5 pr-2.5 py-1 rounded-full text-amber-800 bg-amber-50 border border-amber-400 text-xs font-semibold"
                                    title="Vaga destacada para você"
                                    aria-label="Vaga destacada para você"
                                  >
                                    <Star className="w-4 h-4 text-amber-600" />
                                    <span className="leading-none">Vaga destacada</span>
                                  </span>
                                );
                              }
                              return null;
                            })()}
                          </CardTitle>
                          
                          <div className="flex items-center space-x-2 sm:space-x-3">
                            {(() => { 
                              let shape = 'circle';
                              try {
                                if (job?.company_id) {
                                  shape = localStorage.getItem('company_avatar_shape_'+job.company_id) || 'circle';
                                }
                              } catch {}
                              return (
                            <Link to={job.company_id && !job.is_community ? `/company/${job.company_id}` : '#'} onClick={(e) => { if (!job.company_id || job.is_community) e.preventDefault(); }} className={`w-11 h-11 sm:w-14 sm:h-14 ${shape==='circle'?'rounded-full':'rounded-xl'} flex items-center justify-center overflow-hidden hover:ring-2 hover:ring-blue-300 transition-all cursor-pointer flex-shrink-0`}>
                              {companyImage ? (
                                <img src={companyImage} alt="Logo" className="w-full h-full object-contain" />
                              ) : (
                                <Building className="w-5 h-5 sm:w-7 sm:h-7 text-blue-600" />
                              )}
                            </Link>
                            ); })()}
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Link to={job.company_id && !job.is_community ? `/company/${job.company_id}` : '#'} onClick={(e) => { if (!job.company_id || job.is_community) e.preventDefault(); }} className="text-base sm:text-xl font-bold text-gray-900 hover:text-blue-600 hover:underline transition-colors cursor-pointer truncate">{job.company_name}</Link>
                                {isPartnerCompany && (
                                  <span 
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-700 border border-emerald-300 shadow-sm"
                                    title="Empresa parceira da sua escola"
                                  >
                                    <FaRegHandshake className="w-3.5 h-3.5 text-emerald-600" />
                                    Parceira
                                  </span>
                                )}
                              </div>
                              <p className="text-gray-500 text-sm mt-0.5">Empresa contratante</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {job.is_community && (
                        <div className="mt-3 mb-2 p-4 rounded-2xl border border-emerald-300 bg-gradient-to-r from-emerald-50 to-teal-50 text-teal-900 text-sm shadow-sm">
                          <div className="flex items-start gap-3">
                            <div className="w-9 h-9 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center shrink-0">
                              <AlertCircle className="w-5 h-5 text-teal-700" />
                            </div>
                            <div className="flex-1">
                              <p className="font-medium">Aviso sobre esta empresa</p>
                              <p className="mt-0.5 text-teal-800">
                                Esta empresa não possui perfil na plataforma. Esta é uma vaga cadastrada pelo Admin do sistema (vaga da comunidade).
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Informações rápidas (removida linha separadora solicitada) */}
                      <div className={`grid grid-cols-2 sm:flex sm:flex-wrap sm:justify-start gap-3 sm:gap-x-6 sm:gap-y-2 ${job.is_community ? 'pt-1' : 'pt-2'}`}>
                        {job.location && (
                          <div className="flex items-center space-x-2">
                            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                              <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[10px] sm:text-xs text-gray-500">Localização</p>
                              <p className="font-semibold text-gray-800 text-xs sm:text-sm truncate">{job.location}</p>
                            </div>
                          </div>
                        )}
                        
                        <div className="flex items-center space-x-2">
                          <div className="w-7 h-7 sm:w-8 sm:h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-600" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] sm:text-xs text-gray-500">Salário</p>
                            <p className="font-semibold text-gray-800 text-xs sm:text-sm truncate">{formatSalary(job.salary_min, job.salary_max, job.salary_fixed)}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <div className="w-7 h-7 sm:w-8 sm:h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <Briefcase className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-600" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] sm:text-xs text-gray-500">Contrato</p>
                            <p className="font-semibold text-gray-800 text-xs sm:text-sm">{job.contract_type?.toUpperCase()}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <div className="w-7 h-7 sm:w-8 sm:h-8 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-600" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] sm:text-xs text-gray-500">Experiência</p>
                            <p className="font-semibold text-gray-800 text-xs sm:text-sm">{job.experience_level?.charAt(0).toUpperCase() + job.experience_level?.slice(1)}</p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Estatísticas */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 pt-4 border-t-2 border-gray-250">
                        <div className="flex items-center space-x-4 sm:space-x-6 text-xs sm:text-sm">
                          <div className="flex items-center space-x-1 text-gray-600">
                            <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            <span>{job.views_count || 0} visualizações</span>
                          </div>
                          <div className="flex items-center space-x-1 text-gray-600">
                            <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            <span>{job.applications_count || 0} candidaturas</span>
                          </div>
                        </div>
                        <div className="text-xs sm:text-sm text-gray-500">
                          Publicada em {formatDate(job.created_at)}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                </Card>

                {/* Descrição da vaga */}
                <Card className="shadow-lg rounded-2xl border-2 border-gray-200 bg-white">
                  <CardHeader>
                    <CardTitle className="flex items-center text-gray-900 text-base sm:text-lg">
                      <FileText className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-blue-600" />
                      Descrição da Vaga
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 sm:px-6">
                    <div className="bg-gray-50 rounded-xl p-4 sm:p-6 border border-gray-100">
                      <div 
                        className="rich-content prose prose-gray prose-sm sm:prose max-w-none text-gray-700 leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: job.description }}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Requisitos */}
                {job.requirements && (
                  <Card className="shadow-lg rounded-2xl border-2 border-gray-200 bg-white">
                    <CardHeader>
                      <CardTitle className="flex items-center text-gray-900 text-base sm:text-lg">
                        <Check className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-green-600" />
                        Requisitos
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 sm:px-6">
                      <div className="bg-green-50 rounded-xl p-4 sm:p-6 border border-green-100">
                        <div 
                          className="rich-content prose prose-gray prose-sm sm:prose max-w-none text-gray-700 leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: job.requirements }}
                        />
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Benefícios */}
                {job.benefits && (
                  <Card className="shadow-lg rounded-2xl border-2 border-gray-200 bg-white">
                    <CardHeader>
                      <CardTitle className="flex items-center text-gray-900 text-base sm:text-lg">
                        <Heart className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-red-500" />
                        Benefícios
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 sm:px-6">
                      <div className="bg-red-50 rounded-xl p-4 sm:p-6 border border-red-100">
                        <div 
                          className="rich-content prose prose-gray prose-sm sm:prose max-w-none text-gray-700 leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: job.benefits }}
                        />
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Sidebar - Ações e informações */}
              <div className="lg:col-span-1 space-y-4 sm:space-y-6 order-3">
                {/* Card de candidatura - esconder em mobile (já mostramos em cima) e esconder para escola em vaga de comunidade */}
                {!(isSchool && job.is_community) && (
                <Card className={`hidden lg:block shadow-lg rounded-2xl border-0 ${isApplied ? 'bg-gradient-to-br from-green-600 to-green-700' : 'bg-gradient-to-br from-blue-600 to-indigo-600'} text-white overflow-hidden`}>
                  <CardContent className="p-6">
                    {isApplied ? (
                      /* Estado: Já se candidatou */
                      <div className="text-center space-y-4">
                        <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto">
                          <Check className="w-8 h-8 text-white" strokeWidth={2.5} />
                        </div>
                        
                        <div>
                          <h3 className="text-lg font-bold mb-1">Candidatura Enviada</h3>
                          <p className="text-green-100 text-sm leading-relaxed">
                            Boa sorte! Acompanhe o status da sua candidatura na página de candidaturas.
                          </p>
                        </div>
                        
                        <Link to="/applications" className="block">
                          <Button 
                            variant="secondary"
                            className="w-full bg-white hover:bg-green-50 text-green-700 font-semibold py-2.5 rounded-xl transition-all duration-200 shadow-md"
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            Acompanhar candidatura
                          </Button>
                        </Link>
                      </div>
                    ) : (
                      /* Estado: Ainda não se candidatou */
                      <div className="text-center space-y-3">
                        <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto">
                          <Briefcase className="w-8 h-8 text-white" />
                        </div>
                        
                        <div>
                          <h3 className="text-xl font-bold mb-1">Interessou-se?</h3>
                          <p className="text-blue-100 text-sm">
                            Candidate-se agora e seja um dos primeiros a aplicar para esta vaga!
                          </p>
                        </div>
                      
                        {!isSchool && !job.is_community && (
                          <Button 
                            onClick={handleApply}
                            disabled={applyLoading}
                            className="w-full bg-white text-blue-600 hover:bg-gray-100 font-semibold py-3 rounded-xl transition-all duration-200"
                            data-tour="job.apply"
                            size="lg"
                          >
                            {applyLoading ? (
                              <div className="flex items-center">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                                Enviando...
                              </div>
                            ) : (
                              <>
                                <Upload className="w-5 h-5 mr-2" />
                                Candidatar-se
                              </>
                            )}
                          </Button>
                        )}
                        {!isSchool && job.is_community && (
                          <div className="text-left space-y-3">
                            <div className="text-sm text-blue-100">Envie seu currículo para a empresa por um dos canais abaixo:</div>
                            <div className="grid gap-2">
                              {Array.isArray(job.community_submission_methods) && job.community_submission_methods.length>0 ? (
                                job.community_submission_methods.map((ch, idx) => {
                                  const text = ch || '';
                                  const isEmail = /@/.test(text);
                                  const isWhats = /^\+?\d{10,}$/.test(text.replace(/\D/g,''));
                                  if (isEmail) {
                                    return (
                                      <button
                                        key={idx}
                                        type="button"
                                        onClick={() => handleOpenExternalSend(text)}
                                        title="Selecionar um currículo e enviar por e-mail"
                                        className="inline-flex items-center justify-center gap-2 bg-white text-blue-700 hover:bg-gray-100 font-semibold py-2 px-3 rounded-xl"
                                        data-tour={idx===0? 'job.applyExternal' : undefined}
                                      >
                                        <Mail className="w-4 h-4"/>
                                        <span>Candidatar-se</span>
                                      </button>
                                    );
                                  }
                                  if (isWhats) {
                                    return (
                                      <button
                                        key={idx}
                                        type="button"
                                        onClick={() => handleOpenExternalSend(text)}
                                        title="Baixar seu currículo e abrir o WhatsApp com a mensagem"
                                        className="inline-flex items-center justify-center gap-2 bg-white text-blue-700 hover:bg-gray-100 font-semibold py-2 px-3 rounded-xl"
                                      >
                                        <MessageCircle className="w-4 h-4"/>
                                        <span>Candidatar-se</span>
                                      </button>
                                    );
                                  }
                                  return (
                                    <span key={idx} className="inline-flex items-center justify-center gap-2 bg-white text-blue-700 font-semibold py-2 px-3 rounded-xl opacity-70 cursor-not-allowed" title="Canal não suportado">
                                      <Send className="w-4 h-4"/>
                                      <span>{text}</span>
                                    </span>
                                  );
                                })
                              ) : (
                                <div className="text-sm">Nenhum canal de envio informado.</div>
                              )}
                            </div>
                            <div className="pt-1">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={openShareForJob}
                                className="w-full border-white/30 text-white hover:bg-white/10 rounded-xl"
                              >
                                <Share2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        )}
                        {isSchool && !job.is_community && (
                          <div className="grid grid-cols-1 gap-3">
                            <Button
                              onClick={openRecommend}
                              className="w-full bg-white text-blue-700 hover:bg-gray-100 font-semibold py-3 rounded-xl transition-all duration-200"
                              size="lg"
                            >
                              Indicar aluno
                            </Button>
                            <Button
                              onClick={async ()=> {
                                try {
                                  await jobs.highlightJob(job.id);
                                  toast({ title:'Vaga destacada', description:'Adicionada aos destaques da escola.'});
                                  // Opcional: recarregar dados se necessário
                                  window.dispatchEvent(new CustomEvent('refreshHighlights'));
                                } catch(e) {
                                  toast({ title:'Erro ao destacar', description:e.message||'Tente novamente', variant:'destructive'});
                                }
                              }}
                              className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3 rounded-xl transition-all duration-200"
                              size="lg"
                            >
                              Destacar vaga
                            </Button>
                          </div>
                        )}
                        
                        {!job.is_community && (
                          <div className="flex gap-2 pt-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={openShareForJob}
                              className="flex-1 border-white/30 text-white hover:bg-white/10 rounded-xl"
                            >
                              <Share2 className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
                )}

                {/* Informações da empresa */}
                <Card className="shadow-lg rounded-2xl border-2 border-gray-200 bg-white">
                  <CardHeader className="pb-3 sm:pb-6">
                    <CardTitle className="flex items-center text-gray-900 text-base sm:text-lg">
                      {(() => { const shape = (typeof window !== 'undefined' && job?.company_id) ? (localStorage.getItem('company_avatar_shape_'+job.company_id) || 'square') : 'square'; return (
                        <span className={`w-4 h-4 sm:w-5 sm:h-5 mr-2 ${shape==='circle'?'rounded-full':'rounded-md'} overflow-hidden flex items-center justify-center bg-blue-50`}>
                          {companyImage ? (
                            <img src={companyImage} alt="Logo" className="w-full h-full object-contain" />
                          ) : (
                            <Building className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" />
                          )}
                        </span>
                      ); })()}
                      Sobre a Empresa
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 sm:space-y-4">
                    {job.is_community ? (
                      <>
                        {/* Comunidade: mostrar apenas nome e formas de contato */}
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-3 sm:p-4 border border-blue-100">
                          <h4 className="font-semibold text-gray-900 mb-1 text-sm sm:text-base">{job.company_name}</h4>
                        </div>
                        {Array.isArray(job.community_contact_methods) && job.community_contact_methods.length>0 && (
                          <div>
                            <div className="text-xs sm:text-sm font-semibold text-gray-800 mb-2">Formas de contato</div>
                            <ul className="space-y-2 text-xs sm:text-sm">
                              {job.community_contact_methods.map((c, idx)=>{
                                const text = c || '';
                                const isEmail = /@/.test(text);
                                const isWhats = /^\+?\d{10,}$/.test(text.replace(/\D/g,''));
                                let href = '#';
                                if (isEmail) {
                                  const subject = encodeURIComponent('Contato');
                                  const body = encodeURIComponent('Olá, gostaria de falar com a empresa.');
                                  href = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(text)}&su=${subject}&body=${body}`;
                                }
                                else if (isWhats) {
                                  const phone = text.replace(/\D/g,'');
                                  href = `https://wa.me/${phone}`;
                                }
                                return (
                                  <li key={idx}>
                                    <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-blue-700 hover:underline">
                                      {isWhats ? <MessageCircle className="w-4 h-4"/> : <Mail className="w-4 h-4"/>}
                                      <span>{text}</span>
                                    </a>
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        {/* Empresa da plataforma: nome + descrição + detalhes */}
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-3 sm:p-4 border border-blue-100">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <Link to={job.company_id ? `/company/${job.company_id}` : '#'} onClick={(e) => { if (!job.company_id) e.preventDefault(); }} className="font-semibold text-gray-900 hover:text-blue-600 hover:underline transition-colors text-sm sm:text-base">{job.company_name}</Link>
                            {isPartnerCompany && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] sm:text-xs font-semibold border border-emerald-200">
                                <FaRegHandshake className="w-3 h-3" />
                                <span className="hidden sm:inline">Parceira da sua escola</span>
                                <span className="sm:hidden">Parceira</span>
                              </span>
                            )}
                          </div>
                          <p className="text-gray-600 text-xs sm:text-sm">
                            {job.company_description || 'Empresa comprometida com a excelência e inovação em seu segmento de atuação.'}
                          </p>
                        </div>
                        <div className="space-y-2 sm:space-y-3">
                          <div className="flex items-center justify-between text-xs sm:text-sm">
                            <span className="text-gray-500">Setor:</span>
                            <span className="font-medium text-gray-800">{job.company_sector || 'Não informado'}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs sm:text-sm">
                            <span className="text-gray-500">Tamanho:</span>
                            <span className="font-medium text-gray-800">{job.company_size || 'Não informado'}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs sm:text-sm">
                            <span className="text-gray-500">Localização:</span>
                            <span className="font-medium text-gray-800">{job.location || 'Não informado'}</span>
                          </div>
                        </div>
                        
                        {/* Botão Seguir */}
                        {job.is_active && user?.type === 'candidate' && job.company_id && !job.is_community && (
                          <Button
                            onClick={async () => {
                              if (!user) {
                                toast({ title: 'Faça login', description: 'Você precisa estar logado como candidato para seguir empresas.', variant: 'destructive' });
                                navigate('/login');
                                return;
                              }
                              try {
                                setFollowLoading(true);
                                if (isFollowing) {
                                  await chatAPI.unfollowCompany(job.company_id);
                                  setIsFollowing(false);
                                  toast({ title: 'Parou de seguir', description: 'Você parou de seguir esta empresa.' });
                                } else {
                                  await chatAPI.followCompany(job.company_id);
                                  setIsFollowing(true);
                                  toast({ title: 'Seguindo empresa!', description: 'Agora você pode trocar mensagens com esta empresa.' });
                                }
                              } catch (e) {
                                toast({ title: 'Erro', description: 'Não foi possível alterar o status.', variant: 'destructive' });
                              } finally {
                                setFollowLoading(false);
                              }
                            }}
                            disabled={followLoading}
                            className={`w-full mt-4 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${isFollowing ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' : 'bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600'}`}
                          >
                            <MessageSquare className="w-4 h-4 mr-1.5 inline" />
                            {followLoading ? 'Aguarde...' : isFollowing ? 'Seguindo' : 'Seguir'}
                          </Button>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Detalhes da vaga */}
                <Card className="shadow-lg rounded-2xl border-2 border-gray-200 bg-white">
                  <CardHeader className="pb-3 sm:pb-6">
                    <CardTitle className="flex items-center text-gray-900 text-base sm:text-lg">
                      <FileText className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-purple-600" />
                      Detalhes da Vaga
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 sm:space-y-3">
                    <div className="flex items-center justify-between text-xs sm:text-sm">
                      <span className="text-gray-500">Modalidade:</span>
                      <span className="font-medium text-gray-800 capitalize">
                        {job.work_type || 'Não informado'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs sm:text-sm">
                      <span className="text-gray-500">Nível:</span>
                      <span className="font-medium text-gray-800 capitalize">
                        {job.experience_level || 'Não informado'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs sm:text-sm">
                      <span className="text-gray-500">Contrato:</span>
                      <span className="font-medium text-gray-800 uppercase">
                        {job.contract_type || 'Não informado'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs sm:text-sm">
                      <span className="text-gray-500">Área:</span>
                      <span className="font-medium text-gray-800 capitalize">
                        {job.area || 'Não informado'}
                      </span>
                    </div>
                    {job.subarea && (
                      <div className="flex items-center justify-between text-xs sm:text-sm">
                        <span className="text-gray-500">Sub-área:</span>
                        <span className="font-medium text-gray-800 capitalize">
                          {job.subarea}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Status:</span>
                      <div className="flex items-center">
                        <div className={`w-2 h-2 rounded-full mr-2 ${job.is_active ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <span className="font-medium text-gray-800">
                          {job.is_active ? 'Ativa' : 'Inativa'}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
      
      {/* Modal de seleção de currículo */}
      {showResumeModal && (
        <div 
          className="fixed inset-0 bg-gradient-to-br from-black/60 via-black/50 to-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={() => setShowResumeModal(false)}
        >
          <div 
            className="max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col bg-white rounded-3xl shadow-2xl border-2 border-gray-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col h-full max-h-[90vh] overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-sm">
                    <FileText className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-gray-900 leading-tight">Escolha seu currículo</h2>
                    <p className="text-[11px] text-gray-500">Selecione ou faça upload de um arquivo</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowResumeModal(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Conteúdo com scroll */}
              <div className="flex-1 overflow-y-auto px-5 py-4">
                {/* Abas de seleção */}
                <div className="flex justify-center mb-4">
                  <LayoutGroup id="resume-tabs">
                    <div className="relative inline-flex items-center gap-1.5 rounded-full bg-gray-100 border border-gray-200 shadow-inner p-1" role="tablist" aria-label="Alternar entre currículos e upload">
                      <button
                        type="button"
                        role="tab"
                        aria-selected={uploadMode==='existing'}
                        onClick={() => userResumes.length>0 && setUploadMode('existing')}
                        disabled={userResumes.length === 0}
                        className={`relative inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 h-9 text-sm font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${uploadMode==='existing' ? 'text-white' : 'text-gray-700 hover:text-gray-900'} ${userResumes.length===0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                        data-tour="apply.existingResume"
                      >
                        {uploadMode==='existing' && (
                          <motion.span initial={false} layoutScroll layoutId="resumeTabSlider" className="absolute inset-0 rounded-full bg-blue-600 shadow" transition={{ type:'spring', stiffness:500, damping:40, mass:0.3 }} />
                        )}
                        <span className="relative z-10 inline-flex items-center gap-1.5">
                          <FileText className={`w-4 h-4 ${uploadMode==='existing' ? 'text-white' : 'text-gray-700'}`} />
                          <span>Meus Currículos ({userResumes.length})</span>
                        </span>
                      </button>
                      <button
                        type="button"
                        role="tab"
                        aria-selected={uploadMode==='upload'}
                        onClick={() => setUploadMode('upload')}
                        className={`relative inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 h-9 text-sm font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${uploadMode==='upload' ? 'text-white' : 'text-gray-700 hover:text-gray-900'}`}
                        data-tour="apply.uploadResume"
                      >
                        {uploadMode==='upload' && (
                          <motion.span initial={false} layoutScroll layoutId="resumeTabSlider" className="absolute inset-0 rounded-full bg-blue-600 shadow" transition={{ type:'spring', stiffness:500, damping:40, mass:0.3 }} />
                        )}
                        <span className="relative z-10 inline-flex items-center gap-1.5">
                          <Upload className={`w-4 h-4 ${uploadMode==='upload' ? 'text-white' : 'text-gray-700'}`} />
                          <span>Upload de Arquivo</span>
                        </span>
                      </button>
                    </div>
                  </LayoutGroup>
                </div>

                {/* Atalho criar currículo */}
                <div className="flex justify-center mb-4">
                  <button
                    type="button"
                    onClick={() => { setShowResumeModal(false); navigate('/create-resume'); }}
                    className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium hover:underline"
                    data-tour="apply.createResume"
                  >
                    Prefere criar um currículo agora?
                    <span className="px-2 py-0.5 rounded-full border border-blue-200 bg-blue-50 text-blue-700 font-semibold">Criar currículo</span>
                  </button>
                </div>

                {resumeModalMode === 'send' && pendingChannel && (
                  <div className="mb-4 flex items-center justify-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-2xl border border-blue-200 bg-blue-50 text-blue-800">
                      {pendingChannel.type === 'whatsapp' ? <MessageCircle className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
                      <span className="text-xs font-semibold">Destino:</span>
                      <span className="text-xs font-medium">{pendingChannel.type === 'whatsapp' ? `WhatsApp ${pendingChannel.value}` : `E-mail ${pendingChannel.value}`}</span>
                      <button type="button" onClick={() => copyToClipboard(pendingChannel.value)} className="ml-1 inline-flex items-center gap-1 text-xs text-blue-700 hover:text-blue-900" title="Copiar contato">
                        <Copy className="w-3.5 h-3.5" />Copiar
                      </button>
                    </div>
                  </div>
                )}

                {/* Conteúdo das abas */}
                <div className="h-[320px]">
                  {uploadMode === 'existing' && userResumes.length > 0 && (
                    <div className="space-y-2 h-full overflow-y-auto pr-1">
                      {userResumes.map((resume) => (
                        <div
                          key={resume.id}
                          className={`group flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all duration-150 ${
                            selectedResumeId === resume.id
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-gray-50'
                          }`}
                          onClick={() => setSelectedResumeId(selectedResumeId === resume.id ? null : resume.id)}
                        >
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                            selectedResumeId === resume.id ? 'bg-blue-600' : 'bg-gray-100 group-hover:bg-blue-100'
                          }`}>
                            <FileText className={`w-5 h-5 ${selectedResumeId === resume.id ? 'text-white' : 'text-gray-500 group-hover:text-blue-600'}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <p className={`font-semibold text-sm truncate ${selectedResumeId === resume.id ? 'text-blue-700' : 'text-gray-800'}`}>{resume.title}</p>
                              {resume.is_default && (
                                <span className="inline-flex items-center flex-shrink-0 px-1.5 py-0.5 rounded-full text-[10px] bg-yellow-100 text-yellow-800 font-semibold border border-yellow-200">
                                  <Check className="w-2.5 h-2.5 mr-0.5" />Padrão
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[11px] text-gray-500">Criado {new Date(resume.created_at).toLocaleDateString('pt-BR')}</span>
                              <span className="text-[11px] text-gray-400">· Atualizado {new Date(resume.updated_at).toLocaleDateString('pt-BR')}</span>
                            </div>
                          </div>
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                            selectedResumeId === resume.id ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                          }`}>
                            {selectedResumeId === resume.id && <Check className="w-3 h-3 text-white" />}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {uploadMode === 'upload' && (
                    <div className="flex flex-col h-full gap-3">
                      <div
                        {...getRootProps()}
                        className={`relative h-44 border-2 border-dashed rounded-2xl text-center transition-all duration-200 cursor-pointer flex flex-col items-center justify-center ${
                          isDragActive
                            ? 'border-blue-500 bg-blue-50 shadow-md'
                            : 'border-gray-300 bg-white hover:border-blue-400 hover:bg-gray-50 hover:shadow-sm'
                        }`}
                      >
                        <input {...getInputProps()} />
                        {uploadFile ? (
                          <div className="space-y-2">
                            <div className="w-10 h-10 mx-auto bg-green-500 rounded-xl flex items-center justify-center shadow-sm">
                              <Check className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <p className="text-green-700 font-bold text-xs flex items-center justify-center gap-1.5">
                                <FileText className="w-3.5 h-3.5" />{uploadFile.name}
                              </p>
                              <span className="mt-1 inline-block text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full border border-green-200">
                                {(uploadFile.size / 1024 / 1024).toFixed(2)} MB
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className={`w-10 h-10 mx-auto rounded-xl flex items-center justify-center transition-all duration-200 ${
                              isDragActive ? 'bg-blue-600 scale-110' : 'bg-gray-100'
                            }`}>
                              <Upload className={`w-5 h-5 transition-colors duration-200 ${isDragActive ? 'text-white' : 'text-gray-500'}`} />
                            </div>
                            <div>
                              <p className={`font-semibold text-sm transition-colors duration-200 ${isDragActive ? 'text-blue-700' : 'text-gray-700'}`}>
                                {isDragActive ? 'Solte o arquivo aqui...' : 'Arraste um arquivo ou clique para selecionar'}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">PDF, DOC ou DOCX · máximo 5MB</p>
                            </div>
                          </div>
                        )}
                      </div>
                      {uploadFile && (
                        <div className="text-center">
                          <Button
                            variant="outline"
                            onClick={() => setUploadFile(null)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 hover:border-red-300 text-sm font-semibold px-4 py-2 rounded-xl"
                          >
                            <FileText className="w-4 h-4 mr-1.5" />
                            Remover arquivo
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

          {/* Botões de ação */}
          <div className="flex-shrink-0 border-t border-gray-200 bg-gray-50 px-5 py-3">
            <div className="flex items-center justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setShowResumeModal(false)}
                disabled={applyLoading}
                className="px-5 py-2 text-sm font-semibold rounded-xl border-2 border-gray-300 hover:border-gray-400 hover:bg-white transition-all"
              >
                Cancelar
              </Button>
              <Button
                onClick={resumeModalMode === 'send' ? handleConfirmExternalSend : (resumeModalMode === 'download' ? handleConfirmDownload : handleConfirmApplication)}
                disabled={applyLoading || (!selectedResumeId && !uploadFile)}
                className="px-5 py-2 text-sm font-semibold rounded-xl shadow-sm transition-all bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
              >
                {applyLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {resumeModalMode === 'send' ? 'Preparando arquivo...' : (resumeModalMode === 'download' ? 'Preparando download...' : 'Enviando candidatura...')}
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-1.5" />
                    {resumeModalMode === 'send' ? (pendingChannel?.type === 'whatsapp' ? 'Enviar pelo WhatsApp' : 'Enviar') : (resumeModalMode === 'download' ? 'Baixar PDF' : 'Confirmar Candidatura')}
                  </>
                )}
              </Button>
            </div>
          </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de indicação de alunos (Escola) */}
      {isSchool && showRecommendModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={()=> setShowRecommendModal(false)}>
          <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden" onClick={(e)=> e.stopPropagation()}>
            <div className="p-5 border-b">
              <h3 className="text-xl font-bold">Indicar alunos para a vaga</h3>
              <p className="text-sm text-gray-600">Selecione a turma e os alunos. Alunos destacados aparecem primeiro.</p>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Turma</label>
                <select className="w-full border rounded-lg p-2" value={selectedClassId||''} onChange={(e)=> { setSelectedClassId(e.target.value); loadClassStudents(e.target.value); }}>
                  <option value="">Selecione uma turma</option>
                  {classes.map(c=> (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="max-h-80 overflow-y-auto border rounded-lg">
                {loadingClass ? (
                  <div className="p-4 text-center text-gray-500">Carregando alunos...</div>
                ) : (
                  <ul className="divide-y">
                    {classStudents.map(s=> (
                      <li key={s.user_id} className="flex items-center justify-between p-3">
                        <div>
                          <div className="font-medium">{s.name}</div>
                          <div className="text-xs text-gray-500">{s.class_name || ''} {s.is_featured && <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-yellow-200 text-yellow-900 border border-yellow-300">Destacado</span>}</div>
                        </div>
                        <label className="inline-flex items-center gap-2 text-sm">
                          <input type="checkbox" checked={selectedStudentIds.has(s.user_id)} onChange={()=> toggleStudent(s.user_id)} />
                          Selecionar
                        </label>
                      </li>
                    ))}
                    {selectedClassId && classStudents.length===0 && (
                      <li className="p-3 text-center text-gray-500">Nenhum aluno nesta turma.</li>
                    )}
                  </ul>
                )}
              </div>
            </div>
            <div className="p-5 border-t flex justify-end gap-2">
              <Button variant="outline" onClick={()=> setShowRecommendModal(false)}>Cancelar</Button>
              <Button onClick={submitRecommendations} disabled={sendingRecommendations || !selectedClassId || selectedStudentIds.size===0}>{sendingRecommendations? 'Enviando...' : 'Enviar indicações'}</Button>
            </div>
          </div>
        </div>
      )}
      {/* Versão anterior não tinha modal de edição da empresa */}
      {shareOpen && job && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={()=> setShareOpen(false)} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-br from-blue-600 to-blue-700 px-6 pt-6 pb-8">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
                    <Share2 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Compartilhar vaga</h3>
                    <p className="text-xs text-blue-100 mt-0.5 max-w-[220px] truncate">{job.title} — {job.company_name}</p>
                  </div>
                </div>
                <button onClick={()=> setShareOpen(false)} className="text-white/60 hover:text-white transition-colors mt-0.5">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="px-6 -mt-4 pb-6">
              {/* URL box */}
              <div className="bg-white border-2 border-slate-200 rounded-2xl p-3 flex items-center gap-2 shadow-sm mb-5">
                <div className="flex-1 text-xs text-slate-500 truncate font-mono">{`${window.location.origin}/job/${job.id}`}</div>
                <button
                  onClick={copyShareLink}
                  className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-700 text-white text-xs font-semibold px-3 py-1.5 rounded-xl transition-all hover:-translate-y-[1px] flex-shrink-0"
                >
                  <Copy className="w-3.5 h-3.5" /> Copiar
                </button>
              </div>

              {/* Social buttons */}
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Compartilhar via</p>
              {(() => {
                const url = `${window.location.origin}/job/${job.id}`;
                const text = `${job.title} — ${job.company_name}`;
                const encUrl = encodeURIComponent(url);
                const encText = encodeURIComponent(text);
                const mailSubject = encodeURIComponent(`Vaga: ${job.title}`);
                const mailBody = encodeURIComponent(`${text}\n\n${url}`);
                return (
                  <div className="grid grid-cols-2 gap-2.5">
                    <a href={`https://wa.me/?text=${encText}%20${encUrl}`} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-[#25D366]/10 border border-[#25D366]/20 text-[#128C4A] font-semibold text-sm hover:bg-[#25D366]/20 transition-all hover:-translate-y-[1px]">
                      <div className="w-8 h-8 rounded-xl bg-[#25D366] flex items-center justify-center flex-shrink-0">
                        <MessageCircle className="w-4 h-4 text-white" />
                      </div>
                      WhatsApp
                    </a>
                    <a href={`https://t.me/share/url?url=${encUrl}&text=${encText}`} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-[#0088cc]/10 border border-[#0088cc]/20 text-[#0066a0] font-semibold text-sm hover:bg-[#0088cc]/20 transition-all hover:-translate-y-[1px]">
                      <div className="w-8 h-8 rounded-xl bg-[#0088cc] flex items-center justify-center flex-shrink-0">
                        <Send className="w-4 h-4 text-white" />
                      </div>
                      Telegram
                    </a>
                    <a href={`mailto:?subject=${mailSubject}&body=${mailBody}`}
                      className="flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-200 transition-all hover:-translate-y-[1px]">
                      <div className="w-8 h-8 rounded-xl bg-slate-600 flex items-center justify-center flex-shrink-0">
                        <Mail className="w-4 h-4 text-white" />
                      </div>
                      E-mail
                    </a>
                    <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${encUrl}`} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-[#0A66C2]/10 border border-[#0A66C2]/20 text-[#0A66C2] font-semibold text-sm hover:bg-[#0A66C2]/20 transition-all hover:-translate-y-[1px]">
                      <div className="w-8 h-8 rounded-xl bg-[#0A66C2] flex items-center justify-center flex-shrink-0">
                        <Linkedin className="w-4 h-4 text-white" />
                      </div>
                      LinkedIn
                    </a>
                  </div>
                );
              })()}
            </div>
            {isSchool && (
              <div className="px-6 pb-4 space-y-2">
                <label className="text-sm font-semibold text-gray-800 mb-1.5 block">Enviar para um grupo da escola</label>
                <Combobox
                  variant="minimal"
                  options={(schoolGroups || []).map(g => ({
                    value: g.key,
                    label: `${g.name || g.key} ${g.type==='school' ? '(Escola)' : '(Turma)'}`,
                    leading: <MessageSquare className="w-4 h-4 text-blue-600" />
                  }))}
                  value={selectedGroupKey}
                  onChange={(val) => setSelectedGroupKey(val)}
                  placeholder={loadingGroups ? 'Carregando grupos...' : (schoolGroups?.length ? 'Selecione um grupo...' : 'Nenhum grupo encontrado')}
                  disabled={loadingGroups}
                />
              </div>
            )}
            {isSchool && (
              <div className="px-6 pb-6 flex justify-end">
                <Button onClick={shareToGroup} disabled={!selectedGroupKey || sharing} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl">{sharing ? 'Enviando...' : 'Compartilhar no grupo'}</Button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default ViewJob;
