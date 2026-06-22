import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet';
import { Building2, Briefcase, Users, User, MessageCircle, Plus, Eye, Star, MessageSquare, ChevronDown, ChevronUp, GraduationCap, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import { jobs as jobsAPI, applications as applicationsAPI, favorites as favoritesAPI, chat as chatAPI } from '@/lib/api';
import { hasFeature, getPlanLimits } from '@/lib/planUtils';
import VerifiedBadge from '@/components/VerifiedBadge';
import PlanButton from '@/components/PlanButton';
import { partnershipsApi } from '../services/partnershipsApi';
import { agencyAPI } from '@/lib/api';

const CompanyDashboard = () => {
  const { user, updateSubscription } = useAuth();
  const [isAgency, setIsAgency] = useState(false);
  const [stats, setStats] = useState({
    totalJobs: 0,
    totalApplications: 0,
    totalViews: 0,
    totalInterviews: 0,
    totalApproved: 0
  });
  const [recentApplications, setRecentApplications] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [respondedConversations, setRespondedConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPlan, setCurrentPlan] = useState(user?.subscriptionPlan || 'free');
  const [showPlanDetails, setShowPlanDetails] = useState(false);
  const [activePartnerships, setActivePartnerships] = useState([]);
  const [pendingPartnerships, setPendingPartnerships] = useState([]);
  const [loadingPartnerships, setLoadingPartnerships] = useState(false);

  // Limites por plano usando utilitário
  const currentLimits = getPlanLimits(currentPlan);

  const hasCurrentFeature = (feature) => hasFeature(currentPlan, feature);

  // Atualizar plano quando o usuário mudar
  useEffect(() => {
    if (user) {
      setCurrentPlan(user.subscriptionPlan || 'free');
    }
  }, [user?.subscriptionPlan]);

  useEffect(() => {
    const loadDashboardData = async () => {
      if (user && user.type === 'company') {
        // Garantir que o usuário tenha um plano definido
        if (!user.subscriptionPlan) {
          // Atualizar usuário com plano gratuito por padrão
          const updatedUser = { ...user, subscriptionPlan: 'free' };
          localStorage.setItem('curriculoja_user', JSON.stringify(updatedUser));
          setCurrentPlan('free');
        } else {
          setCurrentPlan(user.subscriptionPlan);
        }

        try {
          // Carregar jobs da empresa
          const jobsResponse = await jobsAPI.getCompanyJobs();
          const companyJobs = jobsResponse.jobs || [];

          // Somar visualizações de todas as vagas da empresa (campos compatíveis com MyJobs)
          const getJobViews = (job) => {
            const v = job.views_count ?? job.views ?? job.view_count ?? job.total_views ?? job.visualizacoes ?? 0;
            const num = Number(v);
            return Number.isFinite(num) ? num : 0;
          };
          const totalViews = companyJobs.reduce((sum, job) => sum + getJobViews(job), 0);
          
          // Carregar candidaturas da empresa
          const applicationsResponse = await applicationsAPI.getCompanyApplications();
          const companyApplications = applicationsResponse.applications || [];
          
          // Carregar favoritos da empresa
          const favoritesResponse = await favoritesAPI.listCompanyFavorites();
          const companyFavorites = favoritesResponse.favorites || [];
          
          // Remover duplicatas dos favoritos baseado no ID
          const uniqueFavorites = companyFavorites.filter((item, index, self) => 
            index === self.findIndex((t) => t.id === item.id)
          );
          
          const interviews = companyApplications.filter(a => a.status === 'interview' || a.interview_date);
          const approved = companyApplications.filter(a => a.status === 'approved');
          // Pré-aprovados: status approved mas SEM final_approved e SEM entrevista ativa
          const preApproved = companyApplications.filter(a => 
            a.status === 'approved' && 
            !a.final_approved && 
            (!a.interview_date || a.interview_canceled_by_company || a.interview_rejected_by_candidate)
          );
          setStats({
            totalJobs: companyJobs.length,
            totalApplications: companyApplications.length,
            totalViews,
            totalInterviews: interviews.length,
            totalApproved: approved.length,
            totalPreApproved: preApproved.length
          });
          
          // Pegar as últimas 4 candidaturas para exibir
          setRecentApplications(companyApplications.slice(0, 4));
          
          // Pegar os últimos 3 favoritos únicos para exibir
          setFavorites(uniqueFavorites.slice(0, 3));

          // Carregar conversas recentes (candidatos que responderam)
          try {
            const conversations = await chatAPI.getConversations();
            console.log('[Dashboard] Conversas carregadas:', conversations);
            // Filtrar conversas onde a última mensagem foi do candidato (respondeu)
            const candidateResponded = conversations.filter(c => 
              c.lastMessageSenderId && c.lastMessageSenderId === c.candidateId
            );
            console.log('[Dashboard] candidateResponded:', candidateResponded);

            // Ordenar por data da última mensagem (mais recente primeiro) e limitar a 3
            const ordered = candidateResponded
              .sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt))
              .slice(0, 3);

            // Caso não haja mensagens de candidatos ainda, mostrar até 3 conversas recentes gerais
            if (ordered.length === 0) {
              const fallback = conversations
                .map(c => ({ ...c, _orderDate: c.lastMessageAt || c.createdAt || c.created_at }))
                .sort((a, b) => new Date(b._orderDate) - new Date(a._orderDate))
                .slice(0, 3);
              setRespondedConversations(fallback);
            } else {
              setRespondedConversations(ordered);
            }
          } catch (e) {
            console.error('Erro ao carregar conversas para dashboard:', e);
          }
          
        } catch (error) {
          console.error('Erro ao carregar dados do dashboard:', error);
          
          // Fallback para localStorage
          const jobs = JSON.parse(localStorage.getItem('curriculoja_jobs') || '[]');
          const companyJobs = jobs.filter(job => job.companyId === user.id);
          
          const applications = JSON.parse(localStorage.getItem('curriculoja_applications') || '[]');
          const companyApplications = applications.filter(app => app.companyId === user.id);
          
          const resumes = JSON.parse(localStorage.getItem('curriculoja_resumes') || '[]');
          const users = JSON.parse(localStorage.getItem('curriculoja_users') || '[]');
          
          const applicationsWithDetails = companyApplications.map(app => {
            const resume = resumes.find(r => r.id === app.resumeId);
            const candidate = users.find(u => u.id === app.candidateId);
            const job = companyJobs.find(j => j.id === app.jobId);
            return {
              ...app,
              resume,
              candidate,
              job
            };
          }).slice(0, 5);
          
          setStats({
            totalJobs: companyJobs.length,
            totalApplications: companyApplications.length,
            totalViews: 0,
            totalInterviews: 0,
            totalApproved: 0
          });
          
          setRecentApplications(applicationsWithDetails);
        } finally {
          setLoading(false);
        }
        
        // Carregar parcerias pendentes e ativas
        setLoadingPartnerships(true);
        try {
          const [pending, active] = await Promise.all([
            partnershipsApi.company.listPartnerships('pending'),
            partnershipsApi.company.listPartnerships('accepted')
          ]);
          setPendingPartnerships(pending || []);
          setActivePartnerships(active || []);
        } catch (e) {
          setPendingPartnerships([]);
          setActivePartnerships([]);
        } finally {
          setLoadingPartnerships(false);
        }

        // Verificar se é agência
        try {
          const agencyCheck = await agencyAPI.check();
          setIsAgency(agencyCheck.isAgency || false);
        } catch { setIsAgency(false); }
      }
    };

    loadDashboardData();
  }, [user]);

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
        <title>Dashboard - {user?.companyName || user?.company_name || user?.name || 'Empresa'} - CurrículoJá</title>
        <meta name="description" content="Painel de controle da empresa para gerenciar vagas e candidatos." />
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
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Dashboard Corporativo</p>
                <h1 className="mb-1 text-3xl font-bold tracking-tight text-[#2563eb] md:text-4xl">{user.companyName}</h1>
                <p className="text-sm text-slate-500">Gerencie suas vagas e candidatos</p>
              </div>
              <div className="flex items-center gap-3">
                {/* Nova Vaga */}
                <Link to="/create-job">
                  <Button className="rounded-2xl border-2 border-[#2563eb] bg-[#2563eb] px-4 py-2 text-sm font-medium text-white shadow-sm shadow-sky-200 transition-all hover:-translate-y-[1px] hover:border-[#1d4ed8] hover:bg-[#1d4ed8]">
                    <Plus className="w-4 h-4 mr-2" />
                    Nova Vaga
                  </Button>
                </Link>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
              >
                <Card className="h-full rounded-[22px] border-2 border-slate-200 bg-white/90 shadow-[0_14px_35px_rgba(15,23,42,0.06)] transition-all hover:-translate-y-[2px] hover:border-sky-300 hover:shadow-[0_20px_45px_rgba(15,23,42,0.12)]">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Vagas Ativas</p>
                        <p className="mb-1 text-3xl font-semibold text-slate-900">{stats.totalJobs}</p>
                        <p className="text-[11px] text-slate-500">
                          {currentLimits.jobs === Infinity ? 'Ilimitado' : `Limite: ${currentLimits.jobs}/mês`}
                        </p>
                      </div>
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 ring-2 ring-sky-200">
                        <Briefcase className="h-5 w-5" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                <Card className="h-full rounded-[22px] border-2 border-slate-200 bg-white/90 shadow-[0_14px_35px_rgba(15,23,42,0.06)] transition-all hover:-translate-y-[2px] hover:border-indigo-300 hover:shadow-[0_20px_45px_rgba(15,23,42,0.12)]">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Candidaturas</p>
                        <p className="mb-1 text-3xl font-semibold text-slate-900">{stats.totalApplications}</p>
                        <p className="text-[11px] text-slate-500">
                          {currentLimits.applications === Infinity ? 'Ilimitado' : `Limite: ${currentLimits.applications}/mês`}
                        </p>
                      </div>
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 ring-2 ring-indigo-200">
                        <Users className="h-5 w-5" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <Card className="h-full rounded-[22px] border-2 border-slate-200 bg-white/90 shadow-[0_14px_35px_rgba(15,23,42,0.06)] transition-all hover:-translate-y-[2px] hover:border-amber-300 hover:shadow-[0_20px_45px_rgba(15,23,42,0.12)]">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Visualizações</p>
                        <p className="text-3xl font-semibold text-slate-900">{stats.totalViews}</p>
                      </div>
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 ring-2 ring-amber-200">
                        <Eye className="h-5 w-5" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <Card className="h-full rounded-[22px] border-2 border-slate-200 bg-white/90 shadow-[0_14px_35px_rgba(15,23,42,0.06)] transition-all hover:-translate-y-[2px] hover:border-emerald-300 hover:shadow-[0_20px_45px_rgba(15,23,42,0.12)]">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Painel</p>
                        <div className="mb-2">
                          <p className="text-2xl font-semibold text-slate-900">{stats.totalPreApproved || 0}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">Alunos pré-aprovados</p>
                        </div>
                        <Link to="/company-interviews" className="inline-flex items-center gap-0.5 text-[11px] font-medium text-sky-600 transition-all hover:text-sky-700 group">
                          <span className="group-hover:underline">Ver painel</span>
                          <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
                        </Link>
                      </div>
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 ring-2 ring-emerald-200">
                        <User className="h-5 w-5" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Quick Actions */}
              <Card className="h-full rounded-[24px] border-2 border-slate-200 bg-white/95 shadow-[0_18px_45px_rgba(15,23,42,0.08)] md:col-span-full">
              <CardHeader className="border-b border-slate-100 pb-4">
                <CardTitle className="text-base font-semibold text-slate-900">Ações Rápidas</CardTitle>
              </CardHeader>
              <CardContent className="pt-5">
                <div className="grid gap-3 md:grid-cols-2">
                  <Link to="/create-job" className="block">
                    <Button className="w-full rounded-2xl border-2 border-[#2563eb] bg-[#2563eb] py-4 text-sm font-medium text-white shadow-[0_18px_40px_rgba(37,99,235,0.35)] transition-all hover:-translate-y-[1px] hover:bg-[#1d4ed8] hover:border-[#1d4ed8] hover:shadow-[0_22px_55px_rgba(37,99,235,0.45)]">
                      <Plus className="w-4 h-4 mr-2" />
                      Criar Nova Vaga
                    </Button>
                  </Link>
                  
                  <Link to="/my-jobs" className="block">
                    <Button className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50 py-4 text-sm font-medium text-slate-900 shadow-sm transition-all hover:-translate-y-[1px] hover:border-slate-300 hover:bg-white">
                      <Briefcase className="w-4 h-4 mr-2" />
                      Gerenciar Vagas
                    </Button>
                  </Link>

                  {isAgency && (
                    <Link to="/agency-portal" className="block md:col-span-2">
                      <Button className="w-full rounded-2xl border-2 border-orange-400 bg-gradient-to-r from-orange-500 to-amber-500 py-4 text-sm font-medium text-white shadow-[0_18px_40px_rgba(249,115,22,0.3)] transition-all hover:-translate-y-[1px] hover:from-orange-600 hover:to-amber-600 hover:shadow-[0_22px_55px_rgba(249,115,22,0.4)]">
                        <Building2 className="w-4 h-4 mr-2" />
                        Portal da Agência
                      </Button>
                    </Link>
                  )}
                </div>
              </CardContent>
              </Card>

            {/* Parcerias com Escolas */}
            <Card className="mb-8 mt-8 rounded-[24px] border-2 border-emerald-100 bg-white/95 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
              <CardHeader className="border-b border-slate-100 pb-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-3">
                    <CardTitle className="flex items-center text-base font-semibold text-emerald-900">
                      <span className="mr-2 flex h-8 w-8 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 ring-2 ring-emerald-200">
                        <GraduationCap className="w-4 h-4" />
                      </span>
                      Escolas Parceiras
                    </CardTitle>
                    {!loadingPartnerships && activePartnerships.length > 0 && (
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-medium text-emerald-700 ring-1 ring-emerald-100">
                        {activePartnerships.length} ativa{activePartnerships.length > 1 ? 's' : ''}
                      </span>
                    )}
                    {!loadingPartnerships && pendingPartnerships.length > 0 && (
                      <span className="rounded-full bg-amber-50 px-3 py-1 text-[11px] font-medium text-amber-700 ring-1 ring-amber-200">
                        {pendingPartnerships.length} pendente{pendingPartnerships.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <Link to="/company/partnerships">
                    <Button variant="outline" size="sm" className="rounded-full border border-emerald-200 bg-emerald-500/5 px-4 text-[11px] font-bold text-emerald-700 shadow-sm shadow-emerald-100
                                   hover:border-emerald-400 hover:bg-emerald-500 hover:text-white hover:shadow-md hover:shadow-emerald-200 transition-all duration-300">
                      Ver Todas
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="pt-5">
                {loadingPartnerships ? (
                    <div className="py-8 text-center">
                    <div className="mx-auto h-10 w-10 animate-spin rounded-full border-b-2 border-slate-300"></div>
                    <p className="mt-3 text-sm text-slate-500">Carregando...</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Parcerias Ativas */}
                    {activePartnerships.length > 0 && (
                      <div>
                        <h4 className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Parcerias Ativas</h4>
                        <div className="space-y-3">
                          {activePartnerships.slice(0, 3).map((partnership) => {
                            const partnershipAvatar = partnership.avatar_url
                              || partnership.school_profile_image
                              || partnership.schoolProfileImage
                              || partnership.profile_image
                              || partnership.profileImage
                              || partnership.logo_url
                              || partnership.logoUrl
                              || null;

                            return (
                              <div key={`active-partnership-${partnership.id}`} className="rounded-2xl border-2 border-emerald-100 bg-emerald-50/70 p-4 transition-all hover:-translate-y-[1px] hover:border-emerald-300 hover:bg-emerald-50">
                                <div className="flex items-center justify-between">
                                  <Link to={`/company/schools/${partnership.school_id}`} className="flex items-center gap-3 group cursor-pointer">
                                    {partnershipAvatar ? (
                                      <img
                                        src={partnershipAvatar}
                                        alt={partnership.school_name || partnership.name}
                                        className="h-11 w-11 rounded-full object-cover ring-2 ring-emerald-100 group-hover:ring-emerald-300 transition-all"
                                      />
                                    ) : (
                                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-500 ring-2 ring-slate-200 group-hover:ring-emerald-300 transition-all">
                                        <GraduationCap className="w-5 h-5" />
                                      </div>
                                    )}
                                    <div>
                                      <p className="text-sm font-medium text-emerald-900 group-hover:text-emerald-700 transition-colors">{partnership.school_name || partnership.name}</p>
                                      <p className="text-[11px] font-medium text-emerald-700/90">Parceria ativa</p>
                                    </div>
                                  </Link>
                                  <Link to={`/company/schools/${partnership.school_id}`}>
                                    <Button size="sm" variant="outline" className="rounded-full border border-emerald-200 bg-emerald-500/5 px-3.5 text-[11px] font-bold text-emerald-700 shadow-sm shadow-emerald-100
                                                   hover:border-emerald-400 hover:bg-emerald-500 hover:text-white hover:shadow-md hover:shadow-emerald-200 transition-all duration-300">
                                      Ver Alunos
                                    </Button>
                                  </Link>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        {activePartnerships.length > 3 && (
                          <Link
                            to="/company/partnerships"
                            className="mt-2 inline-block text-[11px] font-medium text-sky-600 transition-colors hover:text-sky-700"
                          >
                            Ver todas as {activePartnerships.length} parcerias →
                          </Link>
                        )}
                      </div>
                    )}

                    {/* Solicitações Pendentes */}
                    {pendingPartnerships.length > 0 && (
                      <div>
                        <h4 className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Solicitações Pendentes</h4>
                        <div className="space-y-3">
                          {pendingPartnerships.slice(0, 3).map((partnership) => {
                            const partnershipAvatar = partnership.avatar_url
                              || partnership.school_profile_image
                              || partnership.schoolProfileImage
                              || partnership.profile_image
                              || partnership.profileImage
                              || partnership.logo_url
                              || partnership.logoUrl
                              || null;

                            return (
                              <div key={`pending-partnership-${partnership.id}`} className="rounded-2xl border-2 border-amber-100 bg-amber-50/70 p-4 transition-all hover:-translate-y-[1px] hover:border-amber-300 hover:bg-amber-50">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    {partnershipAvatar ? (
                                      <img
                                        src={partnershipAvatar}
                                        alt={partnership.school_name || partnership.name}
                                        className="h-11 w-11 rounded-full object-cover ring-2 ring-amber-100"
                                      />
                                    ) : (
                                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-500 ring-2 ring-slate-200">
                                        <GraduationCap className="w-5 h-5" />
                                      </div>
                                    )}
                                    <div>
                                      <p className="text-sm font-medium text-amber-900">{partnership.school_name || partnership.name}</p>
                                      <p className="text-[11px] text-amber-700/90">
                                        {partnership.requested_by === 'school' ? 'Solicitou parceria' : 'Aguardando resposta'}
                                      </p>
                                    </div>
                                  </div>
                                  <Link to="/company/partnerships">
                                    <Button size="sm" variant="outline" className="rounded-full border-2 border-amber-400 bg-white px-3 text-[11px] font-bold text-amber-700 hover:bg-amber-100/70">
                                      {partnership.requested_by === 'school' ? 'Responder' : 'Ver'}
                                    </Button>
                                  </Link>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Estado vazio */}
                    {activePartnerships.length === 0 && pendingPartnerships.length === 0 && (
                      <div className="py-10 text-center">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-2 ring-emerald-200">
                          <GraduationCap className="w-8 h-8" />
                        </div>
                        <p className="mb-1 text-sm font-medium text-emerald-900">Nenhuma parceria ainda</p>
                        <p className="text-xs text-slate-500">Solicite parcerias com escolas</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="mb-4 grid gap-6 md:grid-cols-2">
              {/* Recent Applications */}
              <Card className="h-full rounded-[24px] border-2 border-indigo-200 bg-white/95 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
              <CardHeader className="border-b border-slate-100 pb-4">
                <div className="flex justify-between items-center gap-3">
                  <CardTitle className="flex items-center text-base font-semibold text-indigo-900">
                    <span className="mr-2 flex h-8 w-8 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 ring-2 ring-indigo-200">
                      <Users className="w-4 h-4" />
                    </span>
                    Candidaturas Recentes
                  </CardTitle>
                  <Link to="/my-jobs">
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full border border-indigo-200 bg-indigo-500/5 px-4 text-[11px] font-bold text-indigo-700 shadow-sm shadow-indigo-100
                                 hover:border-indigo-400 hover:bg-indigo-500 hover:text-white hover:shadow-md hover:shadow-indigo-200 transition-all duration-300"
                    >
                      Ver Todas
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="pt-5">
                {recentApplications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50/70 py-10">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-indigo-500 ring-2 ring-indigo-200">
                      <Users className="w-7 h-7" />
                    </div>
                    <p className="text-sm font-medium text-indigo-900">Nenhuma candidatura recebida</p>
                    <p className="text-xs text-slate-500">As candidaturas aparecerão aqui</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentApplications.map((application) => {
                      const applicationAvatar = application.candidate_profile_image
                        || application.candidateProfileImage
                        || application.profile_image
                        || application.profileImage
                        || application.candidateAvatar
                        || application.candidate_avatar
                        || application.candidate?.profileImage
                        || application.candidate?.profile_image
                        || null;

                      return (
                        <div key={`application-${application.id}`} className="flex items-center justify-between gap-3 rounded-2xl border-2 border-indigo-100 bg-indigo-50/70 p-3.5 transition-all duration-300 hover:-translate-y-1 hover:border-indigo-400 hover:shadow-lg hover:shadow-indigo-200/50">
                          <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border-2 border-indigo-100 bg-white">
                              {applicationAvatar ? (
                                <img
                                  src={applicationAvatar}
                                  alt={application.candidate_name || 'Candidato'}
                                  className="h-full w-full object-cover"
                                  loading="lazy"
                                />
                              ) : (
                                <User className="w-6 h-6 text-slate-400" />
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-900">{application.candidate_name || 'Candidato'}</p>
                              <p className="text-[11px] text-slate-500">
                                {application.job_title} • {new Date(application.created_at).toLocaleDateString('pt-BR')}
                              </p>
                            </div>
                          </div>
                          <Link to={`/view-candidates/${application.job_id}`}>
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-full border border-indigo-200 bg-indigo-500/5 px-3.5 text-[11px] font-bold text-indigo-700 shadow-sm shadow-indigo-100
                                         hover:border-indigo-400 hover:bg-indigo-500 hover:text-white hover:shadow-md hover:shadow-indigo-200 transition-all duration-300"
                            >
                              <Eye className="w-3.5 h-3.5 mr-1" />
                              Ver
                            </Button>
                          </Link>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

              {/* Candidatos que Responderam (dados reais) */}
              <Card className="h-full rounded-[24px] border-2 border-rose-100 bg-white/95 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
                <CardHeader className="border-b border-slate-100 pb-4">
                  <div className="flex justify-between items-center gap-3">
                    <CardTitle className="flex items-center text-base font-semibold text-rose-900">
                      <span className="mr-2 flex h-8 w-8 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 ring-2 ring-rose-200">
                        <MessageSquare className="w-4 h-4" />
                      </span>
                      Últimas Mensagens
                    </CardTitle>
                    <Link to="/company-messages">
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full border border-rose-200 bg-rose-500/5 px-4 text-[11px] font-bold text-rose-600 shadow-sm shadow-rose-100
                                   hover:border-rose-400 hover:bg-rose-500 hover:text-white hover:shadow-md hover:shadow-rose-200 transition-all duration-300"
                      >
                        Ver Mensagens
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent className="pt-5">
                  {respondedConversations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-rose-200 bg-rose-50/70 py-10">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-rose-500 ring-2 ring-rose-200">
                        <MessageSquare className="w-7 h-7" />
                      </div>
                      <p className="text-sm font-medium text-rose-900">Nenhuma resposta de candidatos ainda</p>
                      <p className="mt-1 text-xs text-slate-500">As conversas com candidatos aparecerão aqui</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {respondedConversations.map(conv => {
                        const lastDate = conv.lastMessageAt ? new Date(conv.lastMessageAt) : null;
                        const agora = new Date();
                        const diffMs = lastDate ? (agora - lastDate) : 0;
                        const diffMin = Math.floor(diffMs / 60000);
                        const diffH = Math.floor(diffMin / 60);
                        const diffD = Math.floor(diffH / 24);
                        let rel;
                        if (!lastDate) rel = '—';
                        else if (diffMin < 1) rel = 'agora';
                        else if (diffMin < 60) rel = `há ${diffMin} min`;
                        else if (diffH < 24) rel = `há ${diffH} hora${diffH>1?'s':''}`;
                        else if (diffD === 1) rel = 'ontem';
                        else rel = `há ${diffD} dias`;
                        const conversationAvatar = conv.contactProfileImage
                          || conv.contact_profile_image
                          || conv.candidateProfileImage
                          || conv.candidate_profile_image
                          || conv.companyProfileImage
                          || conv.company_profile_image
                          || conv.avatar_url
                          || null;
                        return (
                          <div key={`conv-${conv.id}`} className="flex items-center justify-between gap-3 rounded-2xl border-2 border-rose-100 bg-rose-50/70 p-3.5 transition-all duration-300 hover:-translate-y-1 hover:border-rose-400 hover:shadow-lg hover:shadow-rose-200/50">
                            <div className="flex items-center gap-3">
                              <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border-2 border-rose-100 bg-white">
                                {conversationAvatar ? (
                                  <img
                                    src={conversationAvatar}
                                    alt={conv.contactName || 'Candidato'}
                                    className="h-full w-full object-cover"
                                    loading="lazy"
                                  />
                                ) : (
                                  <User className="w-6 h-6 text-slate-400" />
                                )}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-rose-900">{conv.contactName || 'Candidato'}</p>
                                {lastDate && (
                                  <p className="text-[11px] text-slate-500">Respondeu {rel}</p>
                                )}
                                {conv.lastMessage && (
                                  <p className="mt-1 max-w-xs text-[11px] text-slate-500 line-clamp-2">{conv.lastMessage}</p>
                                )}
                              </div>
                            </div>
                            <Link to="/company-messages">
                              <Button
                                size="sm"
                                variant="outline"
                                className="rounded-full border border-rose-200 bg-rose-500/5 px-3.5 text-[11px] font-bold text-rose-600 shadow-sm shadow-rose-100
                                           hover:border-rose-400 hover:bg-rose-500 hover:text-white hover:shadow-md hover:shadow-rose-200 transition-all duration-300"
                              >
                                <Eye className="w-3.5 h-3.5 mr-1" />
                                Ver
                              </Button>
                            </Link>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
};

export default CompanyDashboard;