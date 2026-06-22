import React, { useEffect, useState } from 'react';
import { schoolApi } from '@/lib/schoolApi';
import { Users, BarChart3, BookOpen, TrendingUp, BadgeCheck, Star, MailPlus, Briefcase, CalendarDays, Send, Building2, Check, X, Eye, GraduationCap, UserPlus, Settings, MessageSquare } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { jobs as jobsAPI } from '@/lib/api';
import { Link } from 'react-router-dom';
import { partnershipsApi } from '../services/partnershipsApi';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet';
import { Card, CardContent } from '@/components/ui/card';

const StatCard = ({ icon:Icon, label, value, color, onClick, percent }) => (
  <button onClick={onClick} className={`p-5 rounded-[24px] border-2 border-blue-200 bg-white/95 shadow-[0_8px_30px_rgba(59,130,246,0.08)] hover:shadow-[0_12px_40px_rgba(59,130,246,0.12)] transition-all duration-300 flex items-center gap-4 w-full text-left ${onClick ? 'cursor-pointer' : ''}`}>
    <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${color} text-white shadow-lg`}> <Icon className="w-7 h-7"/> </div>
    <div className="flex-1">
      <div className="text-[11px] uppercase tracking-wider text-gray-500 font-medium flex items-center justify-between mb-1">
        <span>{label}</span>
        {typeof percent === 'number' && !isNaN(percent) && <span className="text-[11px] font-semibold text-blue-600">{percent}%</span>}
      </div>
      <div className="text-2xl font-bold text-gray-900">{value ?? 0}</div>
    </div>
  </button>
);

const SchoolDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [studentsWithResumes, setStudentsWithResumes] = useState([]);
  const [studentsWithApplications, setStudentsWithApplications] = useState([]);
  const [licenses, setLicenses] = useState(null);
  const [highlightRequests, setHighlightRequests] = useState([]);
  const [loadingHighlights, setLoadingHighlights] = useState(false);
  const [employability, setEmployability] = useState(null);
  const [activePartnerships, setActivePartnerships] = useState([]);
  const [pendingPartnerships, setPendingPartnerships] = useState([]);
  const [loadingPartnerships, setLoadingPartnerships] = useState(false);
  const [drilldown, setDrilldown] = useState({ open:false, title:'', rows:[], type:null });
  const [classesSummary, setClassesSummary] = useState({ loading: false, error: null, rows: [] });
  const [studentsSummary, setStudentsSummary] = useState([]);

  const openDrilldown = async (title, fetcher, mapRow) => {
    setDrilldown({ open:true, title, rows:[], type:'loading' });
    try {
      const rows = await fetcher();
      setDrilldown({ open:true, title, rows: rows||[], type:'list', mapRow });
    } catch (e) {
      console.error(`[drilldown] ${title}:`, e);
      setDrilldown({ open:true, title, rows:[], type:'error', error: e.message || 'Falha ao carregar' });
    }
  };

  useEffect(() => {
    if (user?.type === 'school') {
      Promise.all([
        schoolApi.getStats(),
        schoolApi.getEmployability().catch(()=>null),
        schoolApi.getLicenses().catch(()=>null),
        schoolApi.listStudentsWithResumes({ limit: 5 }),
        schoolApi.listStudentsWithApplications({ limit: 5 })
      ]).then(async ([statsRes, employRes, licensesRes, resumesRes, appsRes]) => {
        setStats(statsRes.stats);
        if (employRes) setEmployability(employRes);
        if (licensesRes) setLicenses(licensesRes);
        setStudentsWithResumes(resumesRes.students || []);
        setStudentsWithApplications(appsRes.students || []);
        // Carregar resumo por aluno (escola toda)
        try {
          const summary = await schoolApi.listStudentsSummary();
          setStudentsSummary(summary || []);
        } catch (_) { setStudentsSummary([]); }
        // Carregar solicitações de destaque pendentes
        setLoadingHighlights(true);
        try {
          const hr = await jobsAPI.listPendingHighlightRequestsForSchool();
          setHighlightRequests(hr.requests || []);
        } catch (e) {
          // silencioso
          setHighlightRequests([]);
        } finally { setLoadingHighlights(false); }
        // Carregar parcerias pendentes e ativas
        setLoadingPartnerships(true);
        try {
          const [pending, active] = await Promise.all([
            partnershipsApi.school.listPartnerships('pending'),
            partnershipsApi.school.listPartnerships('accepted')
          ]);
          setPendingPartnerships(pending || []);
          setActivePartnerships(active || []);
        } catch (e) {
          setPendingPartnerships([]);
          setActivePartnerships([]);
        } finally { setLoadingPartnerships(false); }
        // Carregar resumo por turma
        try {
          setClassesSummary({ loading: true, error: null, rows: [] });
          const classes = await schoolApi.listClasses();
          const statsList = await Promise.all(
            (classes || []).map(async (c) => {
              try {
                const data = await schoolApi.getClassStats(c.id);
                return { id: c.id, name: c.name, data };
              } catch (e) {
                return { id: c.id, name: c.name, error: e.message };
              }
            })
          );
          setClassesSummary({ loading: false, error: null, rows: statsList });
        } catch (e) {
          setClassesSummary({ loading: false, error: e.message || 'Falha ao carregar turmas', rows: [] });
        }
      }).catch(e => setError(e.message)).finally(()=> setLoading(false));
    } else {
      setLoading(false);
    }
  }, [user]);

  if (!user || user.type !== 'school') return <div className="max-w-6xl mx-auto p-6">Acesso restrito às escolas.</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <Helmet>
        <title>Dashboard da Escola - CurriculoJá</title>
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
                Olá, <span className="text-blue-600">{user?.school_name || user?.name || 'Escola'}</span>! 🎓
              </h1>
              <p className="text-[15px] text-gray-600 leading-relaxed">
                Acompanhe o desempenho dos seus alunos e gerencie sua escola
              </p>
            </div>
            
            {/* Indicador de status */}
            <div className="hidden md:flex items-center gap-3">
              {!loading && stats ? (
                <div className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-xl text-sm font-semibold border border-green-200 shadow-sm">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  Dados atualizados
                </div>
              ) : loading ? (
                <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-xl text-sm font-semibold border border-blue-200 shadow-sm">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  Carregando...
                </div>
              ) : null}
            </div>
          </div>
        </motion.div>
      {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        )}
      {error && <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl p-4">{error}</div>}
      {!loading && stats && (
        <>
          {/* Stats Cards */}
          <motion.div 
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Card 
              onClick={()=> openDrilldown('Total de Alunos', ()=> schoolApi.listStudents({ limit: 100 }).then(r=> r.students||[]), null)}
              className="hover:shadow-lg transition-all duration-300 rounded-2xl border-2 shadow-md group overflow-hidden cursor-pointer bg-gradient-to-br from-blue-50 to-blue-100 border-blue-300 hover:border-blue-400"
            >
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider mb-1 text-blue-700">Total Alunos</p>
                    <p className="text-3xl font-bold text-blue-800">{stats.total_students ?? 0}</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center shadow-md border-2 border-blue-200 group-hover:scale-110 transition-transform duration-300">
                    <Users className="w-6 h-6 text-blue-600 stroke-[2.5]" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card 
              onClick={()=> openDrilldown('Alunos sem currículos', ()=> schoolApi.listStudentsWithoutResumes({ limit: 100 }), null)}
              className="hover:shadow-lg transition-all duration-300 rounded-2xl border-2 shadow-md group overflow-hidden cursor-pointer bg-gradient-to-br from-sky-50 to-sky-100 border-sky-300 hover:border-sky-400"
            >
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider mb-1 text-sky-700">Sem<br />Currículos</p>
                    <p className="text-3xl font-bold text-sky-800">{stats.students_without_resumes ?? 0}</p>
                    <p className="text-xs text-sky-600 font-medium mt-1">
                      {stats.total_students ? Math.round((stats.students_without_resumes/stats.total_students)*100) : 0}% do total
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-100 to-sky-200 flex items-center justify-center shadow-md border-2 border-sky-200 group-hover:scale-110 transition-transform duration-300">
                    <BookOpen className="w-6 h-6 text-sky-600 stroke-[2.5]" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card 
              onClick={()=> openDrilldown('Alunos sem candidaturas', ()=> schoolApi.listStudentsWithoutApplications({ limit: 100 }), null)}
              className="hover:shadow-lg transition-all duration-300 rounded-2xl border-2 shadow-md group overflow-hidden cursor-pointer bg-gradient-to-br from-amber-50 to-yellow-100 border-yellow-300 hover:border-yellow-400"
            >
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider mb-1 text-yellow-700">Sem Candidaturas</p>
                    <p className="text-3xl font-bold text-yellow-800">{stats.students_without_applications ?? 0}</p>
                    <p className="text-xs text-yellow-600 font-medium mt-1">
                      {stats.total_students ? Math.round((stats.students_without_applications/stats.total_students)*100) : 0}% do total
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-100 to-yellow-200 flex items-center justify-center shadow-md border-2 border-yellow-200 group-hover:scale-110 transition-transform duration-300">
                    <BarChart3 className="w-6 h-6 text-yellow-600 stroke-[2.5]" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card 
              onClick={()=> openDrilldown('Alunos Ativos', ()=> schoolApi.listStudents({ status:'active', limit: 100 }).then(r=> r.students||[]), null)}
              className="hover:shadow-lg transition-all duration-300 rounded-2xl border-2 shadow-md group overflow-hidden cursor-pointer bg-gradient-to-br from-purple-50 to-purple-100 border-purple-300 hover:border-purple-400"
            >
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider mb-1 text-purple-700">Status Ativos</p>
                    <p className="text-3xl font-bold text-purple-800">{stats.students_by_status?.find(s=>s.status==='active')?.count || 0}</p>
                    <p className="text-xs text-purple-600 font-medium mt-1">
                      {stats.total_students ? Math.round(((stats.students_by_status?.find(s=>s.status==='active')?.count||0)/stats.total_students)*100) : 0}% do total
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center shadow-md border-2 border-purple-200 group-hover:scale-110 transition-transform duration-300">
                    <TrendingUp className="w-6 h-6 text-purple-600 stroke-[2.5]" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Employability Stats */}
          {employability && (
            <motion.div 
              className="grid grid-cols-1 sm:grid-cols-3 gap-5"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <Card 
                onClick={()=> openDrilldown('Alunos Contratados (final)', ()=> schoolApi.listHired({ limit: 100 }), (r)=> ({ name:r.name, email:r.email, profileImage:r.profile_image, extra:`${r.job_title||'Vaga'} • ${r.company_name||'Empresa'}` }))}
                className="hover:shadow-lg transition-all duration-300 rounded-2xl border-2 shadow-md group overflow-hidden cursor-pointer bg-gradient-to-br from-emerald-50 to-green-100 border-emerald-300 hover:border-emerald-400"
              >
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider mb-1 text-emerald-700">Contratados</p>
                      <p className="text-3xl font-bold text-emerald-800">{employability.counts.hired_students ?? 0}</p>
                      <p className="text-xs text-emerald-600 font-medium mt-1">
                        {employability.totals.total_students ? Math.round((employability.counts.hired_students/employability.totals.total_students)*100) : 0}% do total
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-100 to-emerald-200 flex items-center justify-center shadow-md border-2 border-emerald-200 group-hover:scale-110 transition-transform duration-300">
                      <Briefcase className="w-6 h-6 text-emerald-600 stroke-[2.5]" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card 
                onClick={()=> openDrilldown('Entrevistas Ativas', async ()=> {
                  const res = await schoolApi.listActiveInterviews({ limit: 100 });
                  return res?.upcoming || [];
                }, (r)=> ({ name:r.name, email:r.email, profileImage:r.profile_image, extra:`${r.interview_date ? new Date(r.interview_date).toLocaleString() : ''} • ${r.job_title||''} • ${r.company_name||''}` }))}
                className="hover:shadow-lg transition-all duration-300 rounded-2xl border-2 shadow-md group overflow-hidden cursor-pointer bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-300 hover:border-indigo-400"
              >
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider mb-1 text-indigo-700">Entrevistas</p>
                      <p className="text-3xl font-bold text-indigo-800">{employability.counts.interviews ?? 0}</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-100 to-indigo-200 flex items-center justify-center shadow-md border-2 border-indigo-200 group-hover:scale-110 transition-transform duration-300">
                      <CalendarDays className="w-6 h-6 text-indigo-600 stroke-[2.5]" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card 
                onClick={()=> openDrilldown('Candidaturas Enviadas', ()=> schoolApi.listApplications({ limit: 100 }), (r)=> ({ name:r.name, email:r.email, profileImage:r.profile_image, extra:`${new Date(r.applied_at).toLocaleString()} • ${r.job_title||''} • ${r.company_name||''}` }))}
                className="hover:shadow-lg transition-all duration-300 rounded-2xl border-2 shadow-md group overflow-hidden cursor-pointer bg-gradient-to-br from-amber-50 to-orange-100 border-amber-300 hover:border-amber-400"
              >
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider mb-1 text-amber-700">Candidaturas</p>
                      <p className="text-3xl font-bold text-amber-800">{employability.counts.applications ?? 0}</p>
                      <p className="text-xs text-amber-600 font-medium mt-1">
                        {employability.totals.total_students ? Math.round((employability.totals.students_with_applications/employability.totals.total_students)*100) : 0}% aplicaram
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center shadow-md border-2 border-amber-200 group-hover:scale-110 transition-transform duration-300">
                      <Send className="w-6 h-6 text-amber-600 stroke-[2.5]" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
          {/* Resumo por Turmas */}
          <motion.div 
            className="bg-white/95 border-2 border-blue-200 rounded-[24px] p-8 shadow-[0_8px_30px_rgba(59,130,246,0.08)]"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-1">Resumo por Turmas</h2>
                <p className="text-sm text-gray-600">Visualize o desempenho de cada turma</p>
              </div>
              <Link to="/school/classes" className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transition-all duration-300 hover:scale-105">
                <BookOpen className="w-4 h-4"/>
                Ver detalhes das turmas
              </Link>
            </div>
            {classesSummary.loading && (
              <div className="text-center py-8">
                <div className="inline-block w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                <p className="text-sm text-gray-600 mt-3">Carregando turmas…</p>
              </div>
            )}
            {classesSummary.error && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-center">
                <p className="text-sm text-red-600 font-medium">{classesSummary.error}</p>
              </div>
            )}
            {!classesSummary.loading && !classesSummary.error && classesSummary.rows.length === 0 && (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <BookOpen className="w-8 h-8 text-gray-400"/>
                </div>
                <p className="text-sm text-gray-500">Nenhuma turma cadastrada.</p>
              </div>
            )}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {classesSummary.rows.map(row => {
                const d = row.data;
                if (!d) return (
                  <div key={row.id} className="bg-white/95 border-2 border-red-200 rounded-[24px] p-5 shadow-[0_8px_30px_rgba(239,68,68,0.08)]">
                    <div className="font-semibold text-gray-900 mb-2">{row.name}</div>
                    <div className="text-xs text-red-600 bg-red-50 rounded-lg p-2">Erro: {row.error || 'Falha ao carregar'}</div>
                  </div>
                );
                const total = d.stats.total_students || 0;
                const activeCount = d.stats.students_by_status?.find(s=>s.status==='active')?.count || 0;
                const pct = (count, denom=total)=> denom>0 ? Math.round((count/denom)*1000)/10 : 0;
                return (
                  <div key={row.id} className="bg-white/95 border-2 border-blue-200 rounded-[24px] p-4 shadow-[0_8px_30px_rgba(59,130,246,0.08)] hover:shadow-[0_12px_40px_rgba(59,130,246,0.12)] hover:-translate-y-1 transition-all duration-300 group">
                    <div className="flex items-center justify-between mb-3">
                      <div className="font-bold text-gray-900 text-base truncate flex-1" title={row.name}>{row.name}</div>
                      <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shrink-0">
                        <BookOpen className="w-4 h-4 text-white"/>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                      <div className="col-span-2 p-2.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg">
                        <div className="text-blue-100 text-[10px] font-medium mb-0.5">Total Alunos</div>
                        <div className="text-2xl font-bold text-white">{total}</div>
                      </div>
                      <div className="p-2 bg-blue-50 rounded-xl border-2 border-blue-200 transition-colors">
                        <div className="text-blue-700 text-[9px] font-semibold mb-1 uppercase tracking-wide">Sem currículos</div>
                        <div className="font-extrabold text-blue-900 text-sm">{pct(d.stats.students_without_resumes)}%</div>
                        <div className="text-blue-600 text-[10px] font-medium">{d.stats.students_without_resumes} alunos</div>
                      </div>
                      <div className="p-2 bg-purple-50 rounded-xl border-2 border-purple-200 transition-colors">
                        <div className="text-purple-700 text-[9px] font-semibold mb-1 uppercase tracking-wide">Sem candidaturas</div>
                        <div className="font-extrabold text-purple-900 text-sm">{pct(d.stats.students_without_applications)}%</div>
                        <div className="text-purple-600 text-[10px] font-medium">{d.stats.students_without_applications} alunos</div>
                      </div>
                      <div className="p-2 bg-teal-50 rounded-xl border-2 border-teal-200 transition-colors">
                        <div className="text-teal-700 text-[9px] font-semibold mb-1 uppercase tracking-wide">Ativos</div>
                        <div className="font-extrabold text-teal-900 text-sm">{pct(activeCount)}%</div>
                        <div className="text-teal-600 text-[10px] font-medium">{activeCount} alunos</div>
                      </div>
                      <div className="p-2 bg-emerald-50 rounded-xl border-2 border-emerald-200 transition-colors">
                        <div className="text-emerald-700 text-[9px] font-semibold mb-1 uppercase tracking-wide">Contratados</div>
                        <div className="font-extrabold text-emerald-900 text-sm">{pct(d.employability.counts.hired_students)}%</div>
                        <div className="text-emerald-600 text-[10px] font-medium">{d.employability.counts.hired_students} alunos</div>
                      </div>
                      <div className="p-2 bg-pink-50 rounded-xl border-2 border-pink-200 transition-colors">
                        <div className="text-pink-700 text-[9px] font-semibold mb-1 uppercase tracking-wide">Entrevistas</div>
                        {(() => {
                          // Entrevistas ativas (alunos distintos com entrevista ativa agora)
                          const activeDistinctStudents = d.employability.counts.interviews_active_distinct_students || 0;
                          // Contratados que passaram por entrevista
                          const hiredFromInterviews = d.employability.counts.hired_from_interviews || d.employability.counts.hired_students || 0;
                          // Total de alunos que passaram por entrevista (histórico completo)
                          const totalInterviewedStudents = d.employability.counts.interviews_total_distinct_students || 0;
                          // Taxa de contratação após entrevista
                          const hireRateAfterInterview = totalInterviewedStudents > 0 
                            ? Math.round((hiredFromInterviews / totalInterviewedStudents) * 100) 
                            : 0;
                          return (
                            <>
                              <div className="font-extrabold text-pink-900 text-sm">{hireRateAfterInterview}%</div>
                              <div className="text-pink-600 text-[10px] font-medium leading-tight">
                                Taxa de contratados após entrevista ({hiredFromInterviews} de {totalInterviewedStudents})
                              </div>
                              <div className="text-pink-500 text-[9px] font-medium mt-0.5">
                                Entrevistas ativas agora: {activeDistinctStudents}
                              </div>
                            </>
                          );
                        })()}
                      </div>
                      <div className="p-2 bg-orange-50 rounded-xl border-2 border-orange-200 transition-colors">
                        <div className="text-orange-700 text-[9px] font-semibold mb-1 uppercase tracking-wide">Candidaturas</div>
                        <div className="font-extrabold text-orange-900 text-sm">{pct(d.employability.totals.students_with_applications)}%</div>
                        <div className="text-orange-600 text-[10px] font-medium">{d.employability.counts.applications} total</div>
                      </div>
                    </div>
                    <Link to={`/school/classes/${row.id}/stats`} className="w-full inline-flex items-center justify-center gap-2 text-xs px-3 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-md hover:shadow-lg active:scale-95 transition-all duration-300">
                      <BarChart3 className="w-4 h-4"/> Ver estatísticas completas
                    </Link>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Destaques para empresas - escola toda */}
          <motion.div 
            className="bg-white/95 border-2 border-amber-200 rounded-[24px] p-6 shadow-[0_8px_30px_rgba(245,158,11,0.08)] hover:shadow-[0_12px_40px_rgba(245,158,11,0.12)] transition-all duration-300"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <div className="flex items-start justify-between gap-3 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-50 to-amber-100 flex items-center justify-center shadow-sm border-2 border-amber-200">
                  <Star className="w-5 h-5 text-amber-500 stroke-[2.5]" />
                </div>
                <div>
                  <h2 className="font-semibold text-base text-amber-900">Destaques para empresas</h2>
                  <p className="text-xs text-slate-500">Com base em aprovações, entrevistas e candidaturas</p>
                </div>
              </div>
            </div>
            {(() => {
              const items = studentsSummary || [];
              if (items.length === 0) return (
                <div className="text-sm text-gray-600 bg-gray-50 rounded-xl p-3 border border-gray-100">
                  Carregando alunos…
                </div>
              );
              // Mostrar todos os alunos, com um rótulo de status com prioridade: Aprov. final > Pré-aprov. > Entrevista > Candidaturas > Destacado
              const labelFor = (s) => {
                if (s.final_approved) return { text: 'Aprov. final', cls: 'bg-emerald-100 text-emerald-700 border border-emerald-200' };
                if (s.pre_approved) return { text: 'Pré-aprov.', cls: 'bg-purple-100 text-purple-700 border border-purple-200' };
                if (s.has_active_interview || s.has_interview) return { text: 'Entrevista', cls: 'bg-blue-100 text-blue-700 border border-blue-200' };
                if ((s.applications_count||0) > 0) return { text: `${s.applications_count} cand.`, cls: 'bg-amber-100 text-amber-700 border border-amber-200' };
                if (s.is_featured) return { text: 'Destacado', cls: 'bg-yellow-100 text-yellow-700 border border-yellow-200' };
                return null;
              };
              // Filtrar: somente quem tem pré-aprovação, entrevista ativa, bastante candidaturas, ou aprovado final
              const THRESHOLD_APPS = 10; // "bastante candidaturas" (ajustável)
              const filtered = items.filter(s => s.final_approved || s.pre_approved || s.has_active_interview || (s.applications_count||0) >= THRESHOLD_APPS);
              if (filtered.length === 0) return (
                <div className="text-sm text-gray-600 bg-gray-50 rounded-xl p-3 border border-gray-100">
                  Nenhum aluno com destaque no momento.
                </div>
              );
              return (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[400px] overflow-y-auto pb-2">
                  {filtered.map(s => {
                    const label = labelFor(s);
                    const getAvatar = (stu) => stu?.profileImage || stu?.profile_image || stu?.avatar || null;
                    const avatar = getAvatar(s);
                    const initials = (s.name||'').split(' ').filter(Boolean).slice(0,2).map(p=>p[0]?.toUpperCase()).join('') || '?';
                    return (
                      <div key={s.user_id} className="flex items-center justify-between gap-3 rounded-2xl border-2 border-amber-100 bg-amber-50/70 p-3.5 transition-all duration-300 hover:border-amber-400 hover:shadow-lg hover:shadow-amber-200/50">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-amber-100 bg-white shrink-0">
                            {avatar ? (
                              <img src={avatar} alt={s.name||'Aluno'} className="w-full h-full object-cover rounded-full" />
                            ) : (
                              <span className="text-sm font-bold text-amber-600">{initials}</span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-sm text-slate-900 truncate">{s.name}</div>
                            <div className="text-[11px] text-slate-500 truncate">{s.email}</div>
                          </div>
                        </div>
                        {label && (
                          <span className={`inline-flex items-center text-xs font-semibold px-3 py-1 rounded-full shrink-0 ${label.cls}`}>
                            {label.text}
                          </span>
                        )}
                        {s.is_featured && !label && <Star className="w-4 h-4 shrink-0 text-amber-500 fill-amber-500" />}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </motion.div>
          {employability && (
            <motion.div 
              className="bg-gradient-to-r from-emerald-50 to-indigo-50 border border-emerald-100 rounded-xl p-4 -mt-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
            >
              <div className="text-sm text-gray-700">
                <span className="font-medium text-emerald-700">{employability.rates.overall_employed_pct_all_students}%</span> dos alunos da escola já foram contratados.
                {typeof employability.rates.overall_employed_pct_applicants === 'number' && (
                  <>
                    {' '}Entre os que se candidataram, a taxa de contratação é de
                    {' '}<span className="font-medium text-indigo-700">{employability.rates.overall_employed_pct_applicants}%</span>.
                  </>
                )}
              </div>
            </motion.div>
          )}

          {licenses && (
            <motion.div 
              className="grid md:grid-cols-2 gap-6 mt-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.7 }}
            >
              <div className="bg-white/95 border-2 border-emerald-200 rounded-[24px] p-6 shadow-[0_8px_30px_rgba(16,185,129,0.08)] hover:shadow-[0_12px_40px_rgba(16,185,129,0.12)] transition-all duration-300">
                <div className="flex items-start gap-3 mb-5">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center shadow-md border-2 border-emerald-200">
                    <BadgeCheck className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-gray-900">Licenças de Alunos</h3>
                    <p className="text-sm text-gray-500">Controle de vagas disponíveis</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-3 rounded-xl bg-blue-50 border border-blue-100">
                    <div className="text-2xl font-bold text-blue-700">{licenses.students.limit ?? '—'}</div>
                    <div className="text-xs text-blue-600 font-medium">Total</div>
                  </div>
                  <div className="text-center p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                    <div className="text-2xl font-bold text-emerald-700">{licenses.students.used}</div>
                    <div className="text-xs text-emerald-600 font-medium">Utilizadas</div>
                  </div>
                  <div className="text-center p-3 rounded-xl bg-gray-50 border border-gray-200">
                    <div className="text-2xl font-bold text-gray-700">{licenses.students.available ?? '—'}</div>
                    <div className="text-xs text-gray-600 font-medium">Disponíveis</div>
                  </div>
                </div>
              </div>
              <div className="bg-white/95 border-2 border-amber-200 rounded-[24px] p-6 shadow-[0_8px_30px_rgba(245,158,11,0.08)] hover:shadow-[0_12px_40px_rgba(245,158,11,0.12)] transition-all duration-300">
                <div className="flex items-start gap-3 mb-5">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-50 to-amber-100 flex items-center justify-center shadow-md border-2 border-amber-200">
                    <Star className="w-6 h-6 text-amber-500" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-gray-900">Alunos Destacados</h3>
                    <p className="text-sm text-gray-500">Limite de destaques para empresas</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-3 rounded-xl bg-amber-50 border border-amber-100">
                    <div className="text-2xl font-bold text-amber-700">{licenses.featured.limit ?? '—'}</div>
                    <div className="text-xs text-amber-600 font-medium">Limite</div>
                  </div>
                  <div className="text-center p-3 rounded-xl bg-purple-50 border border-purple-100">
                    <div className="text-2xl font-bold text-purple-700">{licenses.featured.used}</div>
                    <div className="text-xs text-purple-600 font-medium">Usados</div>
                  </div>
                  <div className="text-center p-3 rounded-xl bg-gray-50 border border-gray-200">
                    <div className="text-2xl font-bold text-gray-700">{licenses.featured.available ?? '—'}</div>
                    <div className="text-xs text-gray-600 font-medium">Disponíveis</div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Solicitações de destaque pendentes */}
          <motion.div 
            className="mt-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.8 }}
          >
            <div className="bg-white/95 border-2 border-amber-200 rounded-[24px] p-6 shadow-[0_8px_30px_rgba(245,158,11,0.08)] hover:shadow-[0_12px_40px_rgba(245,158,11,0.12)] transition-all duration-300">
              <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-50 to-amber-100 flex items-center justify-center shadow-sm border-2 border-amber-200">
                    <MailPlus className="w-5 h-5 text-amber-600 stroke-[2.5]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-base text-amber-900">Solicitações de Destaque</h3>
                    <div className="flex items-center gap-2 mt-1">
                      {loadingHighlights && <span className="text-[11px] text-slate-500">Carregando…</span>}
                      {!loadingHighlights && highlightRequests.length > 0 && (
                        <span className="px-2 py-0.5 text-[11px] bg-amber-100 text-amber-700 rounded-full font-semibold">
                          {highlightRequests.length} pendente{highlightRequests.length > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <Link to="/school/highlight-requests" className="rounded-full border-2 border-amber-200 bg-amber-500/5 px-4 text-[11px] font-bold text-amber-700 shadow-sm shadow-amber-100 hover:border-amber-400 hover:bg-amber-500 hover:text-white hover:shadow-md hover:shadow-amber-200 transition-all duration-300 h-8 flex items-center">Ver todas</Link>
              </div>
              <div className="pt-5">
              {(!loadingHighlights && highlightRequests.length === 0) && (
                <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-amber-200 bg-amber-50/70 py-10">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-amber-500 ring-2 ring-amber-200">
                    <MailPlus className="w-7 h-7" />
                  </div>
                  <p className="text-sm font-medium text-amber-900">Nenhuma solicitação pendente</p>
                  <p className="text-xs text-slate-500">Quando empresas solicitarem, aparecerá aqui</p>
                </div>
              )}
              {highlightRequests.length > 0 && (
                <div className="space-y-3">
                  {highlightRequests.slice(0,3).map(r => {
                    const companyAvatar = r.company_avatar || r.avatar_url || r.logo || null;
                    const initials = (r.company_name || '').split(' ').filter(Boolean).slice(0,2).map(p=>p[0]?.toUpperCase()).join('') || '?';
                    
                    const handleApprove = async () => {
                      try {
                        await jobsAPI.approveHighlightRequest(r.id, []);
                        setHighlightRequests(prev => prev.filter(x => x.id !== r.id));
                      } catch (e) {
                        console.error('Erro ao aprovar:', e);
                      }
                    };
                    
                    const handleReject = async () => {
                      try {
                        await jobsAPI.rejectHighlightRequest(r.id);
                        setHighlightRequests(prev => prev.filter(x => x.id !== r.id));
                      } catch (e) {
                        console.error('Erro ao rejeitar:', e);
                      }
                    };
                    
                    return (
                      <div key={r.id} className="flex items-center justify-between gap-3 rounded-2xl border-2 border-amber-100 bg-amber-50/70 p-3.5 transition-all duration-300 hover:-translate-y-1 hover:border-amber-400 hover:shadow-lg hover:shadow-amber-200/50">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {/* Avatar da empresa */}
                          <div className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-amber-100 bg-white shrink-0">
                            {companyAvatar ? (
                              <img src={companyAvatar} alt={r.company_name} className="w-full h-full object-cover rounded-full" />
                            ) : (
                              <span className="text-sm font-bold text-amber-600">{initials}</span>
                            )}
                          </div>
                          
                          {/* Conteúdo */}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm text-slate-900 truncate">{r.job_title}</div>
                            <div className="text-[11px] text-slate-500 truncate">Empresa: {r.company_name}</div>
                            {r.message && <div className="text-[11px] mt-1 text-slate-600 line-clamp-1 italic">"{r.message}"</div>}
                          </div>
                        </div>
                        
                        {/* Botões de ação */}
                        <div className="flex items-center gap-2 shrink-0">
                          <Link
                            to={`/jobs/${r.job_id}`}
                            className="rounded-full border-2 border-blue-200 bg-white text-xs font-semibold text-blue-600 shadow-sm hover:border-blue-400 hover:bg-blue-500 hover:text-white transition-all duration-300 h-8 w-8 flex items-center justify-center"
                            title="Ver vaga"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={handleApprove}
                            className="rounded-full border-2 border-emerald-200 bg-white text-xs font-semibold text-emerald-600 shadow-sm hover:border-emerald-400 hover:bg-emerald-500 hover:text-white transition-all duration-300 h-8 w-8 flex items-center justify-center"
                            title="Aprovar"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={handleReject}
                            className="rounded-full border-2 border-red-200 bg-white text-xs font-semibold text-red-600 shadow-sm hover:border-red-400 hover:bg-red-500 hover:text-white transition-all duration-300 h-8 w-8 flex items-center justify-center"
                            title="Rejeitar"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              </div>
            </div>
          </motion.div>

          {/* Parcerias com Empresas */}
          <motion.div 
            className="mt-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.9 }}
          >
            <div className="bg-white/95 border-2 border-purple-200 rounded-[24px] p-6 shadow-[0_8px_30px_rgba(147,51,234,0.08)] hover:shadow-[0_12px_40px_rgba(147,51,234,0.12)] transition-all duration-300">
              <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-50 to-purple-100 flex items-center justify-center shadow-sm border-2 border-purple-200">
                    <Building2 className="w-5 h-5 text-purple-600 stroke-[2.5]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-base text-purple-900">Empresas Parceiras</h3>
                    <div className="flex items-center gap-2 mt-1">
                      {loadingPartnerships && <span className="text-[11px] text-slate-500">Carregando…</span>}
                      {!loadingPartnerships && activePartnerships.length > 0 && (
                        <span className="px-2 py-0.5 text-[11px] bg-green-100 text-green-700 rounded-full font-semibold">
                          {activePartnerships.length} ativa{activePartnerships.length > 1 ? 's' : ''}
                        </span>
                      )}
                      {!loadingPartnerships && pendingPartnerships.length > 0 && (
                        <span className="px-2 py-0.5 text-[11px] bg-yellow-100 text-yellow-700 rounded-full font-semibold">
                          {pendingPartnerships.length} pendente{pendingPartnerships.length > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <Link to="/school/partnerships" className="rounded-full border-2 border-purple-200 bg-purple-500/5 px-4 text-[11px] font-bold text-purple-700 shadow-sm shadow-purple-100 hover:border-purple-400 hover:bg-purple-500 hover:text-white hover:shadow-md hover:shadow-purple-200 transition-all duration-300 h-8 flex items-center">Ver todas</Link>
              </div>
              <div className="pt-5">
              
              {/* Parcerias Ativas */}
              {!loadingPartnerships && activePartnerships.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Parcerias Ativas</h4>
                  <div className="space-y-2">
                    {activePartnerships.slice(0, 3).map(p => {
                      const companyAvatar = p.avatar_url || p.company_avatar || p.logo_url || p.logo || null;
                      return (
                      <div key={`active-${p.id}`} className="flex items-center justify-between gap-3 rounded-2xl border-2 border-purple-100 bg-purple-50/70 p-3 transition-all duration-300 hover:border-purple-400 hover:shadow-lg hover:shadow-purple-200/50">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-purple-100 bg-white shrink-0">
                            {companyAvatar ? (
                              <img 
                                src={companyAvatar} 
                                alt={p.company_name || p.name}
                                className="w-full h-full rounded-full object-cover"
                              />
                            ) : (
                              <Building2 className="w-5 h-5 text-purple-600" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm text-slate-900 truncate">{p.company_name || p.name}</div>
                            <div className="text-[11px] text-purple-600 font-medium flex items-center gap-1">
                              <Check className="w-3 h-3" /> Parceria ativa
                            </div>
                          </div>
                        </div>
                        <Link 
                          to={`/company/${p.company_id}`}
                          className="rounded-full border-2 border-purple-200 bg-white text-xs font-semibold text-purple-600 shadow-sm hover:border-purple-400 hover:bg-purple-500 hover:text-white transition-all duration-300 h-8 px-3 flex items-center shrink-0"
                        >
                          Ver Vagas
                        </Link>
                      </div>
                      );
                    })}
                  </div>
                  {activePartnerships.length > 3 && (
                    <Link 
                      to="/school/partnerships" 
                      className="text-[11px] text-purple-600 hover:underline mt-3 inline-block font-semibold"
                    >
                      Ver todas as {activePartnerships.length} parcerias →
                    </Link>
                  )}
                </div>
              )}

              {/* Solicitações Pendentes */}
              {!loadingPartnerships && pendingPartnerships.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Novas Solicitações</h4>
                  <div className="space-y-2">
                    {pendingPartnerships.slice(0, 3).map(p => {
                      const companyAvatar = p.avatar_url || p.company_avatar || p.logo_url || p.logo || null;
                      return (
                      <div key={`pending-${p.id}`} className="flex items-center justify-between gap-3 rounded-2xl border-2 border-yellow-100 bg-yellow-50/70 p-3 transition-all duration-300 hover:-translate-y-1 hover:border-yellow-400 hover:shadow-lg hover:shadow-yellow-200/50">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-yellow-100 bg-white shrink-0">
                            {companyAvatar ? (
                              <img 
                                src={companyAvatar} 
                                alt={p.company_name || p.name}
                                className="w-full h-full rounded-full object-cover"
                              />
                            ) : (
                              <Building2 className="w-5 h-5 text-yellow-600" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm text-slate-900 truncate">{p.company_name || p.name}</div>
                            <div className="text-[11px] text-slate-500 font-medium">
                              {p.requested_by === 'company' 
                                ? '🔔 Solicitou parceria com você'
                                : '⏳ Você solicitou parceria'
                              }
                            </div>
                          </div>
                        </div>
                        <Link 
                          to="/school/partnerships" 
                          className="rounded-full border-2 border-yellow-200 bg-white text-xs font-semibold text-yellow-700 shadow-sm hover:border-yellow-400 hover:bg-yellow-500 hover:text-white transition-all duration-300 h-8 px-3 flex items-center shrink-0"
                        >
                          {p.requested_by === 'company' ? 'Responder' : 'Ver'}
                        </Link>
                      </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Estado vazio */}
              {!loadingPartnerships && activePartnerships.length === 0 && pendingPartnerships.length === 0 && (
                <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-purple-200 bg-purple-50/70 py-10">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-purple-500 ring-2 ring-purple-200">
                    <Building2 className="w-7 h-7" />
                  </div>
                  <p className="text-sm font-medium text-purple-900">Nenhuma parceria ainda</p>
                  <p className="text-xs text-slate-500">Solicite parcerias com empresas!</p>
                </div>
              )}
              </div>
            </div>
          </motion.div>

          <motion.div 
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mt-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 1.0 }}
          >
            <div className="bg-white/95 border-2 border-teal-200 rounded-[24px] p-6 shadow-[0_8px_30px_rgba(20,184,166,0.08)] hover:shadow-[0_12px_40px_rgba(20,184,166,0.12)] transition-all duration-300">
              <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-50 to-teal-100 flex items-center justify-center border-2 border-teal-200">
                  <Briefcase className="w-5 h-5 text-teal-600" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">Alunos com Currículos</h2>
              </div>
              <div className="space-y-2 pt-4">
                {studentsWithResumes.length === 0 && <div className="text-sm text-gray-500">Nenhum</div>}
                {studentsWithResumes.map(s => (
                  <div key={s.user_id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-sm text-gray-900 truncate">{s.name}</div>
                      <div className="text-xs text-gray-500 truncate">{s.email}</div>
                    </div>
                    <div className="px-3 py-1.5 rounded-full bg-teal-100 text-teal-700 text-sm font-bold">{s.resumes_count}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white/95 border-2 border-orange-200 rounded-[24px] p-6 shadow-[0_8px_30px_rgba(249,115,22,0.08)] hover:shadow-[0_12px_40px_rgba(249,115,22,0.12)] transition-all duration-300">
              <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center border-2 border-orange-200">
                  <Send className="w-5 h-5 text-orange-600" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">Alunos com Candidaturas</h2>
              </div>
              <div className="space-y-2 pt-4">
                {studentsWithApplications.length === 0 && <div className="text-sm text-gray-500">Nenhum</div>}
                {studentsWithApplications.map(s => (
                  <div key={s.user_id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-sm text-gray-900 truncate">{s.name}</div>
                      <div className="text-xs text-gray-500 truncate">{s.email}</div>
                    </div>
                    <div className="px-3 py-1.5 rounded-full bg-orange-100 text-orange-700 text-sm font-bold">{s.applications_count}</div>
                  </div>
                ))}
              </div>
            </div>
            {employability && (
              <div className="bg-white/95 border-2 border-indigo-200 rounded-[24px] p-6 shadow-[0_8px_30px_rgba(99,102,241,0.08)] hover:shadow-[0_12px_40px_rgba(99,102,241,0.12)] transition-all duration-300">
                <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-50 to-indigo-100 flex items-center justify-center border-2 border-indigo-200">
                    <TrendingUp className="w-5 h-5 text-indigo-600" />
                  </div>
                  <h2 className="text-lg font-bold text-gray-900">Empregabilidade</h2>
                </div>
                <div className="space-y-2 pt-4">
                  {employability.by_class.length === 0 && <div className="text-sm text-gray-500">Nenhuma turma</div>}
                  {employability.by_class.map(c => (
                    <div key={c.class_id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-sm text-gray-900 truncate">{c.class_name || 'Sem turma'}</div>
                        <div className="text-xs text-gray-500 truncate">{c.hired_students}/{c.total_students} contratados</div>
                      </div>
                      <div className="px-3 py-1.5 rounded-full bg-indigo-100 text-indigo-700 text-sm font-bold">{c.hire_rate_pct}%</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="bg-white/95 border-2 border-blue-200 rounded-[24px] p-6 shadow-[0_8px_30px_rgba(59,130,246,0.08)] hover:shadow-[0_12px_40px_rgba(59,130,246,0.12)] transition-all duration-300">
              <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center border-2 border-blue-200">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">Alunos por Status</h2>
              </div>
              <div className="space-y-2 pt-4">
                {stats.students_by_status?.map(s => {
                  const statusColors = {
                    active: 'bg-emerald-100 text-emerald-700 border-emerald-200',
                    inactive: 'bg-gray-100 text-gray-600 border-gray-200',
                    hired: 'bg-blue-100 text-blue-700 border-blue-200',
                    pending: 'bg-amber-100 text-amber-700 border-amber-200'
                  };
                  const colorClass = statusColors[s.status] || 'bg-gray-100 text-gray-600 border-gray-200';
                  return (
                    <div key={s.status} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                      <span className={`px-3 py-1.5 rounded-full text-xs font-medium border ${colorClass}`}>
                        {s.status || 'sem status'}
                      </span>
                      <span className="px-3 py-1.5 rounded-full bg-blue-100 text-blue-700 text-sm font-bold">{s.count}</span>
                    </div>
                  );
                }) || <div className="text-sm text-gray-500">Nenhum</div>}
              </div>
            </div>
          </motion.div>
        </>
      )}

      {/* Drilldown Modal */}
      {drilldown.open && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={()=> setDrilldown(p=>({...p, open:false}))}>
          <div className="bg-white/95 rounded-[24px] shadow-2xl w-full max-w-2xl border-2 border-blue-200" onClick={e=>e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">{drilldown.title}</h3>
              <button onClick={()=> setDrilldown(p=>({...p, open:false}))} className="text-gray-500 hover:text-gray-700">Fechar</button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto p-5">
              {drilldown.type==='loading' && <div className="text-sm text-gray-500">Carregando…</div>}
              {drilldown.type==='error' && <div className="text-sm text-red-600">{drilldown.error || 'Erro ao carregar dados.'}</div>}
              {drilldown.type!=='loading' && drilldown.type!=='error' && drilldown.rows.length === 0 && <div className="text-sm text-gray-500">Nenhum registro encontrado.</div>}
              <ul className="divide-y divide-gray-100">
                {drilldown.rows.map((student,idx)=> {
                  // Aplicar mapeamento se fornecido, senão usar dados padrão de aluno
                  const mapped = drilldown.mapRow 
                    ? drilldown.mapRow(student) 
                    : { 
                        name: student.name, 
                        email: student.email,
                        profileImage: student.profileImage || student.profile_image,
                        extra: `${student.course_name||''}${student.class_name ? ` • ${student.class_name}` : ''}`
                      };
                  
                  // Helper para pegar avatar do objeto mapeado
                  const avatar = mapped.profileImage || null;
                  const initials = (mapped.name||'')
                    .split(' ')
                    .filter(Boolean)
                    .slice(0,2)
                    .map(p=>p[0]?.toUpperCase())
                    .join('') || '?';
                  
                  return (
                    <li key={idx} className="py-3 flex items-center gap-3">
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0">
                        {avatar ? (
                          <img src={avatar} alt={mapped.name||'Aluno'} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs font-semibold text-white bg-gradient-to-br from-slate-500 to-slate-700">{initials}</div>
                        )}
                      </div>
                      
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-800 truncate">{mapped.name}</div>
                        <div className="text-xs text-gray-500 truncate">{mapped.email}</div>
                      </div>
                      
                      {/* Extra info */}
                      {mapped.extra && (
                        <div className="text-xs text-gray-600 truncate">{mapped.extra}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default SchoolDashboard;
