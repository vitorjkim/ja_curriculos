import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet';
import { Users, Briefcase, Eye, User, Mail, Phone, Calendar, Trash2, Download, Star, ThumbsUp, ThumbsDown, UserCheck, Award, GraduationCap, ChevronDown, ChevronUp, UserPlus, ArrowLeft, LayoutPanelLeft, Sparkles } from 'lucide-react';
import { FaWhatsapp, FaRegHandshake } from 'react-icons/fa';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/use-toast';
import { resumes, applications as applicationsAPI, jobs as jobsAPI, favorites as favoritesAPI, interactions as interactionsAPI, chatAPI, aiAPI } from '@/lib/api';
import CandidateFitModal from '@/components/jobs/CandidateFitModal';
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

const ViewCandidates = () => {
  const { id: jobId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [recsLoading, setRecsLoading] = useState(false);
  const [recsOpen, setRecsOpen] = useState(true);
  const [addedContacts, setAddedContacts] = useState(new Set());
  const [totalApplications, setTotalApplications] = useState(0);
  const [processedApplications, setProcessedApplications] = useState(0);
  const [fitModalOpen, setFitModalOpen] = useState(false);
  const [fitModalCandidate, setFitModalCandidate] = useState(null);
  const [candidateCompatibilities, setCandidateCompatibilities] = useState({});
  const [loadingCompatibilities, setLoadingCompatibilities] = useState(new Set());

  // Função para navegar para o perfil do candidato
  const goToProfile = (candidateId) => {
    if (candidateId) {
      navigate(`/alunos/${candidateId}`);
    }
  };

  // Função para salvar/remover favorito
  const handleToggleFavorite = async (candidateId) => {
    try {
      const isFavorite = favorites.some(f => f.candidate_id === candidateId);
      
      if (isFavorite) {
        const favoriteToRemove = favorites.find(f => f.candidate_id === candidateId);
        await favoritesAPI.remove(favoriteToRemove.id);
        setFavorites(prev => prev.filter(f => f.candidate_id !== candidateId));
        toast({
          title: "Removido dos favoritos",
          description: "Candidato removido da sua lista de talentos.",
        });
      } else {
        const response = await favoritesAPI.add(candidateId, jobId);
        setFavorites(prev => [...prev, response.favorite]);
        toast({
          title: "Adicionado aos favoritos",
          description: "Candidato salvo na sua lista de talentos.",
        });
      }
    } catch (error) {
      console.error('Erro ao gerenciar favorito:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o favorito. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  // Função para criar interação
  const handleInteraction = async (candidateId, interactionType, customMessage = '') => {
    try {
      let message = customMessage;
      
      // Se não há mensagem customizada, usar padrão
      if (!message) {
        switch (interactionType) {
          case 'interested':
            message = '✨ Demonstramos interesse no seu perfil! Ficamos impressionados com suas qualificações.';
            break;
          case 'not_profile':
            message = '🤝 Agradecemos seu interesse, mas seu perfil não se encaixa na vaga atual. Continue acompanhando nossas oportunidades!';
            break;
          case 'interview':
            message = '🎯 Gostaríamos de te chamar para uma entrevista! Seu perfil chamou nossa atenção. Entraremos em contato em breve.';
            break;
        }
      }

      // 1. Primeiro, salvar o candidato para garantir que a conversa exista
      await chatAPI.saveCandidate(candidateId);
      
      // 2. Buscar as conversas para encontrar a conversa com este candidato
      const conversations = await chatAPI.getConversations();
      const conversation = conversations.find(conv => 
        conv.candidateId === candidateId
      );
      
      // 3. Se encontrou a conversa, enviar a mensagem automática
      if (conversation) {
        await chatAPI.sendMessage(conversation.id, message);
      } else {
        throw new Error('Não foi possível encontrar a conversa com o candidato');
      }
      
      // 4. Criar a interação (para histórico)
      await interactionsAPI.create(candidateId, jobId, interactionType, message);

      // 5. Atualizar status da candidatura (se possível)
      const targetCandidateApp = candidates.find(c => c.candidate_id === candidateId);
      if (targetCandidateApp) {
        let newStatus = null;
        if (interactionType === 'interested') newStatus = 'interested';
        else if (interactionType === 'not_profile') newStatus = 'rejected';
        if (newStatus) {
          try {
            await applicationsAPI.updateStatus(targetCandidateApp.id, newStatus);
            // Atualizar localmente ou remover dependendo da regra
            if (newStatus === 'rejected' || newStatus === 'interested' || newStatus === 'approved') {
              setCandidates(prev => prev.filter(c => c.id !== targetCandidateApp.id));
            } else if (newStatus === 'interview') {
              setCandidates(prev => prev.filter(c => c.id !== targetCandidateApp.id)); // também remover entrevista da lista principal
            }
          } catch (e) {
            console.warn('Falha ao atualizar status após interação', e);
          }
        }
      }
      
      let toastTitle, toastDescription;
      switch (interactionType) {
        case 'interested':
          toastTitle = "✨ Interesse demonstrado";
          toastDescription = "O candidato foi notificado do seu interesse através de uma mensagem!";
          break;
        case 'not_profile':
          toastTitle = "🤝 Feedback enviado";
          toastDescription = "O candidato foi notificado que o perfil não se encaixa através de uma mensagem.";
          break;
        case 'interview':
          toastTitle = "🎯 Chamada para entrevista";
          toastDescription = "O candidato foi convidado para uma entrevista através de uma mensagem!";
          break;
      }

      toast({
        title: toastTitle,
        description: toastDescription,
      });
    } catch (error) {
      console.error('Erro ao criar interação:', error);
      toast({
        title: "❌ Erro",
        description: "Não foi possível enviar a interação. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  // Função para excluir candidato
  const handleDeleteCandidate = async (applicationId) => {
    try {
  await applicationsAPI.cancel(applicationId);
      setCandidates(prev => prev.filter(candidate => candidate.id !== applicationId));
      toast({
        title: "Candidato removido",
        description: "O candidato foi removido da vaga com sucesso.",
      });
    } catch (error) {
      console.error('Erro ao excluir candidato:', error);
      toast({
        title: "Erro",
        description: "Não foi possível remover o candidato. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  // Função para baixar currículo
  const handleDownloadResume = async (resumeId, candidateName) => {
    try {
      const response = await resumes.download(resumeId);

      // Obter o nome do arquivo do header
      const contentDisposition = response.headers.get('content-disposition');
      let filename = 'curriculo.pdf';
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      // Se não conseguir o nome original, usar nome do candidato
      if (filename === 'curriculo.pdf' && candidateName) {
        filename = `curriculo_${candidateName.replace(/\s+/g, '_')}.pdf`;
      }

      // Criar blob e download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Currículo baixado",
        description: "O arquivo do currículo foi baixado com sucesso.",
      });
    } catch (error) {
      console.error('Erro ao baixar currículo:', error);
      toast({
        title: "Erro",
        description: "Não foi possível baixar o currículo. O arquivo pode não estar disponível.",
        variant: "destructive",
      });
    }
  };

  // Função para abrir WhatsApp
  const handleWhatsApp = (phone, candidateName) => {
    console.log('🔍 WhatsApp - Dados recebidos:', { phone, candidateName });
    
    if (!phone) {
      toast({
        title: "Telefone não disponível",
        description: "Este candidato não cadastrou um número de telefone.",
        variant: "destructive",
      });
      return;
    }

    // Limpar e formatar o número - remover todos os caracteres não numéricos
    const cleanPhone = phone.replace(/\D/g, '');
    console.log('🔍 WhatsApp - Número limpo:', cleanPhone);
    
    let formattedPhone = cleanPhone;

    // Se não começar com 55 (código do Brasil), adicionar
    if (!formattedPhone.startsWith('55')) {
      formattedPhone = '55' + formattedPhone;
    }

    console.log('🔍 WhatsApp - Número formatado:', formattedPhone);

    const message = `Olá ${candidateName}! Vi sua candidatura para a vaga "${job?.title || 'nossa vaga'}" e gostaria de conversar com você.`;
    const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
    
    console.log('🔍 WhatsApp - URL gerada:', whatsappUrl);
    window.open(whatsappUrl, '_blank');
  };

  useEffect(() => {
    const loadData = async () => {
      if (user && user.type === 'company') {
        try {
          console.log('🔍 ViewCandidates: Carregando dados para jobId:', jobId);
          
          // Buscar a vaga específica
          const jobResponse = await jobsAPI.get(jobId);
          console.log('✅ ViewCandidates: Vaga carregada:', jobResponse);
          // A API retorna { job: {...} }
          setJob(jobResponse.job || jobResponse);
          
          // Buscar candidaturas para esta vaga
          const applicationsResponse = await applicationsAPI.getJobApplications(jobId);
          console.log('✅ ViewCandidates: Candidaturas carregadas:', applicationsResponse);
          setCandidates(applicationsResponse.applications || []);
          setTotalApplications(applicationsResponse.totalApplications || 0);
          setProcessedApplications(applicationsResponse.processedApplications || 0);

          // Marcar candidaturas desta vaga como visualizadas
          const lastSeenJobKey = `company_job_applications_seen_${user.id}_${jobId}`;
          localStorage.setItem(lastSeenJobKey, new Date().toISOString());
          
          // Também atualizar o lastSeen geral para a navbar
          const lastSeenKey = `company_applications_last_seen_${user.id}`;
          localStorage.setItem(lastSeenKey, new Date().toISOString());
          window.dispatchEvent(new CustomEvent('applicationsViewed'));

          // Buscar favoritos da empresa
          const favoritesResponse = await favoritesAPI.listCompanyFavorites();
          setFavorites(favoritesResponse.favorites || []);

          // Buscar conversas existentes para saber quais candidatos já foram adicionados
          try {
            const conversations = await chatAPI.getConversations();
            const addedIds = new Set(conversations.map(c => c.candidateId));
            setAddedContacts(addedIds);
          } catch (e) {
            console.warn('Falha ao carregar conversas', e);
          }

          // Buscar recomendações de alunos feitas por escolas para esta vaga
          try {
            setRecsLoading(true);
            const recsRes = await jobsAPI.listRecommendations(jobId);
            const recs = recsRes?.recommendations || recsRes?.rows || recsRes || [];
            setRecommendations(Array.isArray(recs) ? recs : []);
          } catch (e) {
            console.warn('Falha ao carregar recomendações', e);
            setRecommendations([]);
          } finally {
            setRecsLoading(false);
          }
          
        } catch (error) {
          console.error('❌ ViewCandidates: Erro ao carregar dados:', error);
          
          // Fallback para localStorage
          const allJobs = JSON.parse(localStorage.getItem('curriculoja_jobs') || '[]');
          const currentJob = allJobs.find(j => j.id === jobId && j.companyId === user.id);
          console.log('🔄 ViewCandidates: Fallback localStorage - vaga:', currentJob);
          setJob(currentJob);

          if (currentJob) {
            const allApplications = JSON.parse(localStorage.getItem('curriculoja_applications') || '[]');
            const jobApplications = allApplications.filter(app => app.jobId === jobId);

            const allUsers = JSON.parse(localStorage.getItem('curriculoja_users') || '[]');
            const allResumes = JSON.parse(localStorage.getItem('curriculoja_resumes') || '[]');

            const candidatesData = jobApplications.map(app => {
              const candidateUser = allUsers.find(u => u.id === app.candidateId);
              const candidateResume = allResumes.find(r => r.id === app.resumeId);
              return {
                ...app,
                user: candidateUser,
                resume: candidateResume,
              };
            });
            setCandidates(candidatesData);
          }
        } finally {
          setLoading(false);
        }
      }
    };

    loadData();
  }, [jobId, user]);

  // Carregar compatibilidades de todos os candidatos
  useEffect(() => {
    if (candidates && candidates.length > 0) {
      const loadCompatibilities = async () => {
        const compatMap = { ...candidateCompatibilities };
        
        // Carregar compatibilidades em paralelo
        const promises = candidates.map(candidate =>
          (async () => {
            if (compatMap[candidate.id]) return; // Já carregado
            
            try {
              setLoadingCompatibilities(prev => new Set([...prev, candidate.id]));
              const response = await aiAPI.analyzeCandidateFit(candidate.id);
              compatMap[candidate.id] = response;
            } catch (err) {
              console.warn(`Erro ao carregar compatibilidade para ${candidate.id}:`, err);
              compatMap[candidate.id] = { matchingScore: null, error: true };
            } finally {
              setLoadingCompatibilities(prev => {
                const newSet = new Set(prev);
                newSet.delete(candidate.id);
                return newSet;
              });
            }
          })()
        );
        
        await Promise.all(promises);
        setCandidateCompatibilities(compatMap);
      };
      
      loadCompatibilities();
    }
  }, [candidates]);

  if (!user || user.type !== 'company') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50/80 px-4">
        <Card className="max-w-md border-2 border-slate-200 bg-white/95 shadow-sm">
          <CardContent className="p-6 text-center text-slate-700">
            Acesso restrito a empresas.
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (!job) {
    console.log('❌ ViewCandidates: Vaga não encontrada - jobId:', jobId, 'user:', user);
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50/80 px-4">
        <Card className="max-w-md border-2 border-slate-200 bg-white/95 shadow-sm">
          <CardContent className="p-6 text-center">
            <p className="text-slate-700">Vaga não encontrada ou acesso negado.</p>
            <p className="text-sm text-slate-500 mt-2">ID da vaga: {jobId}</p>
            <Button asChild className="mt-4">
              <Link to="/my-jobs">Voltar para Minhas Vagas</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Candidatos para {job?.title || 'Vaga'} - CurrículoJá</title>
        <meta name="description" content={`Veja os candidatos que se aplicaram para a vaga de ${job?.title || 'vaga'}.`} />
      </Helmet>

      <div className="min-h-screen bg-slate-50/80 py-10 px-4">
        <div className="mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Header moderno */}
            <div className="mb-6 sm:mb-8 flex flex-col items-start justify-between gap-4 sm:gap-6 rounded-[20px] sm:rounded-[24px] border-2 border-slate-200 bg-white/90 px-4 sm:px-8 py-5 sm:py-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)] backdrop-blur-sm md:flex-row md:items-center">
              <div>
                <p className="mb-1.5 sm:mb-2 text-[10px] sm:text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Candidatos da Vaga
                </p>
                <h1 className="mb-1 text-2xl sm:text-3xl font-bold tracking-tight md:text-4xl">
                  <span className="text-slate-900">Ver </span>
                  <span className="text-[#2563eb]">Candidatos</span>
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 flex items-center mt-1">
                  <Briefcase className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 text-slate-400" />
                  <span className="line-clamp-1">{job.title}</span>
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full md:w-auto">
                <div className="flex items-center gap-1.5 sm:gap-2 rounded-full bg-blue-50 px-3 sm:px-4 py-1.5 sm:py-2">
                  <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600" />
                  <span className="text-xs sm:text-sm font-semibold text-blue-700">{candidates.length}</span>
                </div>
                {candidates.filter(c => c.is_featured).length > 0 && (
                  <div className="flex items-center gap-1.5 sm:gap-2 rounded-full bg-emerald-50 px-3 sm:px-4 py-1.5 sm:py-2">
                    <GraduationCap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600" />
                    <span className="text-xs sm:text-sm font-semibold text-emerald-700">{candidates.filter(c => c.is_featured).length}</span>
                  </div>
                )}
                <Link to={`/company-interviews/${jobId}`} className="hidden sm:block">
                  <Button variant="outline" className="rounded-2xl border-2 border-dashed border-purple-300 bg-purple-100 text-purple-700 hover:bg-purple-200 hover:border-purple-500 hover:text-purple-700 transition-all duration-200 text-xs sm:text-sm">
                    <LayoutPanelLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2"/> Ver Painel
                  </Button>
                </Link>
                <Link to="/my-jobs" className="hidden sm:block">
                  <Button variant="outline" className="rounded-2xl border-gray-200 hover:bg-blue-50 hover:border-blue-400 hover:text-blue-600 transition-all duration-200 text-xs sm:text-sm">
                    <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2"/> Voltar
                  </Button>
                </Link>
              </div>
            </div>

            {/* Recomendações de alunos pelas escolas */}
            {(recsLoading || recommendations.length > 0) && (
            <Card className="mb-5 rounded-2xl border border-emerald-100 bg-white/95 shadow-sm">
              <CardHeader className="border-b border-slate-100 pb-2.5 px-4 sm:px-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <CardTitle className="flex items-center text-sm sm:text-base font-semibold text-emerald-900 min-w-0">
                      <span className="mr-2 flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200 flex-shrink-0">
                        <GraduationCap className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </span>
                      <span className="hidden xs:inline">Alunos indicados por escolas</span>
                      <span className="xs:hidden">Indicações</span>
                    </CardTitle>
                    {recsLoading ? (
                      <span className="text-xs text-slate-500">carregando...</span>
                    ) : (
                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700 ring-1 ring-emerald-100 whitespace-nowrap">
                        {recommendations.length} indicação{recommendations.length === 1 ? '' : 's'}
                      </span>
                    )}
                  </div>
                  {recommendations.length > 0 && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setRecsOpen(v => !v)}
                      className="shrink-0 rounded-full border border-emerald-200 bg-emerald-500/5 px-3.5 text-[11px] font-bold text-emerald-700 shadow-sm shadow-emerald-100 hover:border-emerald-400 hover:bg-emerald-500 hover:text-white hover:shadow-md hover:shadow-emerald-200 transition-all duration-300"
                    >
                      {recsOpen ? 'Ocultar' : 'Ver indicações'}
                    </Button>
                  )}
                </div>
              </CardHeader>
              {recsOpen && !recsLoading && (
                <CardContent className="pt-4 px-4 sm:px-5 pb-4">
                  {recommendations.length === 0 ? (
                    <p className="text-sm text-slate-500">Nenhuma indicação de alunos pelas escolas até o momento.</p>
                  ) : (
                    <div className="space-y-3">
                      {Object.entries(
                        recommendations.reduce((acc, r) => {
                          const key = `${r.school_id}|${r.school_name}`;
                          if (!acc[key]) acc[key] = [];
                          acc[key].push(r);
                          return acc;
                        }, {})
                      ).map(([key, recs]) => {
                        const [schoolId, schoolName] = key.split('|');
                        const firstRec = recs[0];
                        const schoolImage = firstRec?.school_profile_image;
                        const isPartner = firstRec?.is_partner;
                        const sorted = recs.slice().sort((a,b)=>{
                          if (a.is_featured && !b.is_featured) return -1;
                          if (b.is_featured && !a.is_featured) return 1;
                          return (a.student_name || '').localeCompare(b.student_name || '');
                        });
                        return (
                          <div key={key} className="rounded-2xl border border-emerald-100 bg-white p-3 sm:p-4 transition-colors hover:border-emerald-300">
                            {/* Header da escola - mesmo design de Parcerias Ativas */}
                            <div className="flex items-center justify-between gap-3 mb-3">
                              <Link to={`/company/schools/${schoolId}`} className="flex items-center gap-3 group cursor-pointer">
                                {schoolImage ? (
                                  <img 
                                    src={schoolImage} 
                                    alt={schoolName} 
                                    className="h-10 w-10 rounded-full object-cover ring-1 ring-emerald-100 group-hover:ring-emerald-300 transition-all"
                                  />
                                ) : (
                                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500 ring-1 ring-slate-200 group-hover:ring-emerald-300 transition-all">
                                    <GraduationCap className="w-4.5 h-4.5" />
                                  </div>
                                )}
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <p className="text-sm font-medium text-emerald-900 group-hover:text-emerald-700 transition-colors leading-tight">{schoolName}</p>
                                    {isPartner && (
                                      <span className="inline-flex items-center text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                        <FaRegHandshake className="w-3 h-3 mr-1 text-emerald-600" />Parceira
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] font-medium text-emerald-700/90 leading-tight">
                                    {sorted.length} aluno{sorted.length===1?'':'s'} indicado{sorted.length===1?'':'s'}
                                  </p>
                                </div>
                              </Link>
                            </div>
                            {/* Lista de alunos */}
                            <div className="space-y-2">
                              {sorted.map((r) => (
                                <div key={r.id} className="flex items-center justify-between rounded-xl p-2.5 sm:p-3 bg-emerald-50 border border-emerald-100 gap-3">
                                  <div className="min-w-0 flex items-center gap-2.5">
                                    {r.student_profile_image ? (
                                      <img 
                                        src={r.student_profile_image} 
                                        alt={r.student_name}
                                        className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                                      />
                                    ) : (
                                      <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                                        <span className="text-emerald-700 font-semibold text-xs">
                                          {r.student_name?.charAt(0)?.toUpperCase() || '?'}
                                        </span>
                                      </div>
                                    )}
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <p className="font-medium truncate text-slate-800 text-sm">{r.student_name}</p>
                                        {r.is_featured && (
                                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-200/70 px-2 py-0.5 rounded-full">
                                            <Award className="w-3 h-3" /> Destaque
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-[11px] text-slate-500 leading-tight">
                                        {r.class_name ? `Turma: ${r.class_name}` : 'Turma não informada'}
                                        {r.created_at ? ` • ${new Date(r.created_at).toLocaleDateString('pt-BR')}` : ''}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={(e) => { e.preventDefault(); handleWhatsApp(r.student_phone, r.student_name); }}
                                      className="h-8 w-8 rounded-full border border-green-200 bg-green-500/5 p-0 text-green-700 shadow-sm shadow-green-100 hover:border-green-400 hover:bg-green-500 hover:text-white hover:shadow-md hover:shadow-green-200 transition-all duration-300"
                                    >
                                      <FaWhatsapp className="w-4 h-4" />
                                    </Button>
                                    <Link to={`/alunos/${r.user_id}`}>
                                      <Button 
                                        variant="outline" 
                                        size="sm" 
                                        className="rounded-full border border-emerald-200 bg-emerald-500/5 px-3 text-[11px] font-bold text-emerald-700 shadow-sm shadow-emerald-100 hover:border-emerald-400 hover:bg-emerald-500 hover:text-white hover:shadow-md hover:shadow-emerald-200 transition-all duration-300"
                                      >
                                        Ver perfil
                                      </Button>
                                    </Link>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
            )}

            {candidates.length === 0 ? (
              // Verifica se já houve candidatos antes (processados = aprovados/rejeitados)
              processedApplications > 0 ? (
                // Já teve candidatos, mas todos foram processados
                <Card className="rounded-[22px] border-2 border-slate-200 bg-white/95 shadow-sm">
                  <CardContent className="p-12 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
                      <UserCheck className="w-8 h-8 text-slate-400" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2 text-slate-800">Todos os candidatos foram avaliados</h3>
                    <p className="text-slate-500 mb-4">
                      Esta vaga já recebeu {totalApplications} candidatura{totalApplications !== 1 ? 's' : ''} e todas foram processadas.
                    </p>
                    <Link to={`/company-interviews/${jobId}`}>
                      <Button variant="outline" className="rounded-2xl border-2 border-dashed border-purple-300 bg-purple-100 text-purple-700 hover:bg-purple-200 hover:border-purple-500 hover:text-purple-700 transition-all duration-200">
                        <LayoutPanelLeft className="w-4 h-4 mr-2"/> Ver no Painel
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ) : (
                // Nunca teve candidatos
                <Card className="rounded-[22px] border-2 border-slate-200 bg-white/95 shadow-sm">
                  <CardContent className="p-12 text-center">
                    <Users className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                    <h3 className="text-xl font-semibold mb-2 text-slate-800">Nenhum candidato ainda</h3>
                    <p className="text-slate-500">
                      Ainda não há candidatos para esta vaga. Divulgue sua vaga para atrair talentos!
                    </p>
                  </CardContent>
                </Card>
              )
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {candidates
                  .slice()
                  .sort((a,b)=>{ // destacados primeiro
                    const A = !!a.is_featured;
                    const B = !!b.is_featured;
                    if (A && !B) return -1; if (B && !A) return 1; return 0;
                  })
                  .map((candidate, index) => (
                  <motion.div
                    key={candidate.id}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                  >
                    <Card className={`h-full transition-all rounded-[18px] sm:rounded-[22px] overflow-hidden ${candidate.is_featured ? 'bg-white/95 border-2 border-amber-300 shadow-lg' : 'bg-white/95 border-2 border-slate-200 shadow-sm hover:shadow-md'}`}>
                      <CardContent className="p-0 h-full flex flex-col">
                        {/* Header com foto e info principal */}
                        <div className="p-4 sm:p-5 pb-3 sm:pb-4">
                          <div className="flex items-start gap-3 sm:gap-4">
                            {/* Foto maior e mais destacada */}
                            <div 
                              className={`relative flex-shrink-0 cursor-pointer group`}
                              onClick={() => goToProfile(candidate.candidate_id)}
                              title="Ver perfil do candidato"
                            >
                              <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center shadow-sm ring-2 ring-gray-100 transition-all ${candidate.is_featured ? 'group-hover:ring-amber-400' : 'group-hover:ring-blue-400'}`}>
                                {(candidate.candidate_profile_image || candidate.resume?.photo) ? (
                                  <img src={candidate.candidate_profile_image || candidate.resume.photo} alt={`Foto de ${candidate.candidate_name}`} className="w-full h-full object-cover" />
                                ) : (
                                  <User className="w-8 h-8 sm:w-10 sm:h-10 text-blue-400" />
                                )}
                              </div>
                              {candidate.is_featured && (
                                <div className="absolute -bottom-1 -left-1 w-6 h-6 bg-amber-400 rounded-full flex items-center justify-center shadow-sm">
                                  <Star className="w-3.5 h-3.5 text-white" />
                                </div>
                              )}
                              {/* Foto da escola como badge */}
                              {(candidate.school_name || candidate.school_profile_image) && (
                                <div className="absolute -bottom-1 -right-3 w-11 h-11 rounded-full overflow-hidden bg-white flex items-center justify-center shadow-md ring-1 ring-white">
                                  {candidate.school_profile_image ? (
                                    <img src={candidate.school_profile_image} alt={candidate.school_name || 'Escola'} className="w-full h-full object-contain" style={{ imageRendering: '-webkit-optimize-contrast', filter: 'contrast(1.05) saturate(1.1)' }} />
                                  ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-emerald-100 to-emerald-50 flex items-center justify-center">
                                      <GraduationCap className="w-5 h-5 text-emerald-500" />
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                            
                            {/* Info do candidato */}
                            <div className="flex-1 min-w-0">
                              <h3 
                                className={`font-semibold text-base truncate cursor-pointer hover:text-blue-600 transition-colors ${candidate.is_featured ? 'text-amber-800 hover:text-amber-600' : 'text-gray-900'}`}
                                onClick={() => goToProfile(candidate.candidate_id)}
                                title="Ver perfil do candidato"
                              >
                                {candidate.candidate_name || 'Candidato'}
                              </h3>
                              {(candidate.school_name || candidate.class_name) && (
                                <p className="text-xs text-gray-500 mt-0.5 truncate">
                                  {candidate.class_name || ''}
                                  {candidate.school_name && candidate.class_name ? ' • ' : ''}
                                  {candidate.school_name || ''}
                                </p>
                              )}
                              <p className="text-xs text-gray-400 mt-1 flex items-center">
                                <Calendar className="w-3 h-3 mr-1" />
                                {(() => {
                                  const dateStr = candidate.applied_at || candidate.created_at || candidate.createdAt;
                                  const d = dateStr ? new Date(dateStr) : null;
                                  if (!d || Number.isNaN(d.getTime())) return 'Data desconhecida';
                                  return `Aplicou em ${d.toLocaleDateString('pt-BR')}`;
                                })()}
                              </p>
                              <div className="mt-1 flex items-center gap-1 text-[11px] text-emerald-600">
                                <FaWhatsapp className="w-3.5 h-3.5" />
                                <button
                                  type="button"
                                  onClick={() => handleWhatsApp(candidate.candidate_phone || candidate.user?.phone || candidate.phone, candidate.candidate_name)}
                                  className="text-left font-medium hover:text-emerald-700 hover:underline transition-colors"
                                >
                                  WhatsApp: {candidate.candidate_phone || candidate.user?.phone || candidate.phone || 'Não informado'}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Contato */}
                        <div className="px-4 sm:px-5 pb-3 sm:pb-4 space-y-1.5 sm:space-y-2">
                          <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                            <Mail className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" />
                            <span className="truncate">{candidate.candidate_email}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                            <Phone className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" />
                            <span>{candidate.candidate_phone || candidate.user?.phone || candidate.phone || 'Não informado'}</span>
                          </div>
                        </div>

                        {/* Compatibilidade com IA */}
                        <div className="px-4 sm:px-5 pb-3 sm:pb-4">
                          {loadingCompatibilities.has(candidate.id) ? (
                            <div className="space-y-1">
                              <div className="h-3 w-36 rounded-full bg-purple-100 animate-pulse" />
                              <div className="h-3 w-full rounded-full bg-purple-50 animate-pulse" />
                            </div>
                          ) : candidateCompatibilities[candidate.id] && !candidateCompatibilities[candidate.id].error ? (
                            (() => {
                              const compat = candidateCompatibilities[candidate.id];
                              const score = compat.matchingScore;
                              const colorClass = score >= 80
                                ? 'text-emerald-700'
                                : score >= 60
                                ? 'text-blue-700'
                                : score >= 40
                                ? 'text-amber-700'
                                : 'text-red-700';
                              const strength = compat.scoreBreakdown?.strengths?.[0]?.keyword;
                              const gap = compat.scoreBreakdown?.gaps?.[0]?.keyword;
                              let shortText = compat.summary;
                              if (!shortText) {
                                if (strength && gap) {
                                  shortText = `Ponto forte: ${strength}. Área para desenvolvimento: ${gap}.`;
                                } else if (strength) {
                                  shortText = `Ponto forte: ${strength}.`;
                                } else if (gap) {
                                  shortText = `Área para desenvolvimento: ${gap}.`;
                                }
                              }
                              return (
                                <div className="space-y-1.5">
                                  <p className="text-xs sm:text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                                    <Sparkles className={`w-3.5 h-3.5 ${colorClass}`} />
                                    Compatibilidade: <span className={colorClass}>{score}%</span>
                                  </p>
                                  {shortText && (
                                    <p className="text-xs sm:text-sm leading-5 text-gray-600 line-clamp-2">{shortText}</p>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setFitModalCandidate({
                                        id: candidate.id,
                                        name: candidate.candidate_name,
                                      });
                                      setFitModalOpen(true);
                                    }}
                                    className="inline-flex items-center gap-1 rounded-full border border-purple-200 bg-white px-3 py-1 text-[11px] font-medium text-purple-700 shadow-sm transition-all hover:-translate-y-0.5 hover:border-purple-300 hover:bg-purple-50 hover:text-purple-800"
                                  >
                                    Ver mais sobre a compatibilidade desse candidato
                                  </button>
                                </div>
                              );
                            })()
                          ) : (
                            <div className="rounded-xl border border-dashed border-purple-200 bg-purple-50 px-3 py-2 text-xs text-purple-700">
                              Compatibilidade sendo calculada.
                            </div>
                          )}
                        </div>
                        
                        {/* Currículo */}
                        <div className="px-4 sm:px-5 pb-3 sm:pb-4 flex-grow">
                          {candidate.resume_id ? (
                            (candidate.resume_template === 'uploaded' || candidate.resume_file_path) ? (
                              <div className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200">
                                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                                  <Download className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs sm:text-sm font-semibold text-amber-800">Currículo Anexado</p>
                                  <p className="text-[10px] sm:text-xs text-amber-600 truncate">{candidate.resume_title || candidate.candidate_name}</p>
                                </div>
                                <Button
                                  size="sm"
                                  className="bg-amber-500 hover:bg-amber-600 text-white rounded-xl px-3 sm:px-4 shadow-sm text-xs sm:text-sm h-7 sm:h-8"
                                  onClick={() => handleDownloadResume(candidate.resume_id, candidate.candidate_name)}
                                >
                                  Baixar
                                </Button>
                              </div>
                            ) : (
                              <Link to={`/resume/${candidate.resume_id}`} className="w-full">
                                <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm h-8 sm:h-9">
                                  <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                                  Ver Currículo
                                </Button>
                              </Link>
                            )
                          ) : (
                            <div className="p-2.5 sm:p-3 bg-gray-50 rounded-xl text-center">
                              <p className="text-xs sm:text-sm text-gray-400">Currículo não disponível</p>
                            </div>
                          )}
                        </div>

                        {/* Interações */}
                        <div className="px-4 sm:px-5 pb-4 sm:pb-5 pt-2 sm:pt-3 border-t border-gray-100 mt-auto">
                          <p className="text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 sm:mb-3">Interações</p>
                          <div className="flex gap-1.5 sm:gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 rounded-xl border-blue-200 text-blue-600 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all text-[11px] sm:text-sm h-8 sm:h-9 px-2 sm:px-3"
                              onClick={() => handleInteraction(candidate.candidate_id, 'interested')}
                            >
                              <ThumbsUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-1.5" />
                              <span className="hidden xs:inline">Pré-aprovar</span>
                              <span className="xs:hidden">Sim</span>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 rounded-xl border-red-200 text-red-500 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all whitespace-nowrap text-[11px] sm:text-sm h-8 sm:h-9 px-2 sm:px-3"
                              onClick={() => handleInteraction(candidate.candidate_id, 'not_profile')}
                            >
                              <ThumbsDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-1.5 flex-shrink-0" />
                              <span className="hidden xs:inline">Negar</span>
                              <span className="xs:hidden">Não</span>
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="rounded-xl border-gray-200 text-gray-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50 px-2.5"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Remover candidato</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Tem certeza que deseja remover {candidate.candidate_name} desta vaga? Esta ação não pode ser desfeita.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteCandidate(candidate.id)}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    Remover
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Modal de Compatibilidade */}
      <CandidateFitModal
        isOpen={fitModalOpen}
        onClose={() => {
          setFitModalOpen(false);
          setFitModalCandidate(null);
        }}
        applicationId={fitModalCandidate?.id}
        candidateName={fitModalCandidate?.name}
        jobTitle={job?.title}
      />
    </>
  );
};

export default ViewCandidates;