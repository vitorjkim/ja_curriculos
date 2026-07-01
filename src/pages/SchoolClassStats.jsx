import React, { useEffect, useState, Suspense, lazy } from 'react';
import { createPortal } from 'react-dom';
import { motion, LayoutGroup } from 'framer-motion';
import { useParams, Link } from 'react-router-dom';
import { schoolApi } from '@/lib/schoolApi';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { partnershipsApi } from '@/services/partnershipsApi';
import { ArrowLeft, Users, Briefcase, CalendarDays, Send, BookOpen, BarChart3, TrendingUp, Download, Filter, Star, X, AlertCircle, UserX, Calendar, MessageCircle, CheckCircle2, CheckCircle, MapPin, Building2, FileText, Clock, XCircle, UserCheck, ChevronDown, Rocket, Brain, Target, Gamepad2, Search, Award, Check, MessageSquare, ClipboardCheck, ListOrdered } from 'lucide-react';
import jsPDF from 'jspdf';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, AreaChart, Area, RadialBarChart, RadialBar, Line, Customized } from 'recharts';
import SaaSLineChart from '@/components/SaaSLineChart';
const PainelTab = lazy(() => import('@/components/school/class-tabs/PainelTab'));
const AlunosTab = lazy(() => import('@/components/school/class-tabs/AlunosTab'));
const FunilTab = lazy(() => import('@/components/school/class-tabs/FunilTab'));
const VagasTab = lazy(() => import('@/components/school/class-tabs/VagasTab'));
const AtividadeTab = lazy(() => import('@/components/school/class-tabs/AtividadeTab'));
const GeografiaTab = lazy(() => import('@/components/school/class-tabs/GeografiaTab'));
const JornadaTab = lazy(() => import('@/components/school/class-tabs/JornadaTab'));
const DestaquesTab = lazy(() => import('@/components/school/class-tabs/DestaquesTab'));

export default function SchoolClassStats(){
  const { id } = useParams();
  const { user } = useAuth();
  const storageKey = `schoolClassStats:${id}`;
  const [data,setData] = useState(null);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState(null);
  const [drilldown, setDrilldown] = useState({ open:false, title:'', rows:[], type:null, color: 'blue' });
  const [exporting, setExporting] = useState(false);
  const [studentFilter, setStudentFilter] = useState({ open:false, selected:null, activity:[] });
  const [companyModal, setCompanyModal] = useState({ open:false, title:'', companies:[] });
  // Modal de histórico de entrevistas
  const [interviewLogModal, setInterviewLogModal] = useState({ open: false });
  // tick para forçar re-render quando algum avatar for atualizado em outra tela
  const [avatarTick, setAvatarTick] = useState(0);
  // Track se é a primeira vez que os steps são exibidos
  const [stepsFirstRender, setStepsFirstRender] = useState(true);
  // Dados reais para gráficos
  const [realData, setRealData] = useState({
    applications: [],
    interviews: [],
    hired: [],
    last7Days: null,
    topCompanies: []
  });
  const [partnerships, setPartnerships] = useState([]);
  // Filtro de vaga para o funil
  const [funnelJobFilter, setFunnelJobFilter] = useState('all');
  const [funnelDropdownOpen, setFunnelDropdownOpen] = useState(false);
  // Filtro global por aluno - quando ativo, todos os gráficos mostram apenas dados deste aluno
  const [globalStudentFilter, setGlobalStudentFilter] = useState(null);
  // Dados da Jornada do Candidato
  const [journeyStats, setJourneyStats] = useState(null);
  // Etapa selecionada na jornada (null = visão geral, 0 = Etapa 1, 1 = Etapa 2, etc.)
  const [selectedJourneyStage, setSelectedJourneyStage] = useState(null);
  // Dropdown de seleção de etapa aberto
  const [journeyStageDropdownOpen, setJourneyStageDropdownOpen] = useState(false);
  // Modal de participação dos alunos na jornada
  const [journeyParticipationModal, setJourneyParticipationModal] = useState(false);
  // Tab ativa
  const [activeTab, setActiveTab] = useState('painel');

  // Nomes das etapas (índice = stage_id no banco, valor = nome exibido)
  const journeyStageNames = {
    0: 'Etapa 1 - Autoconhecimento',
    1: 'Etapa 2 - Mentalidade',
    2: 'Etapa 3 - Currículo',
    3: 'Etapa 4 - Candidatura',
    4: 'Etapa 5 - Apresentação',
    5: 'Etapa 6 - Entrevista',
    6: 'Etapa 7 - Persistência'
  };

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

  const pct = (num, denom) => denom > 0 ? Math.round((num/denom)*1000)/10 : 0;

  const downloadCSV = (filename, rows) => {
    if (!rows || rows.length === 0) {
      // gerar CSV vazio com cabeçalho padrão
      const blob = new Blob(["dados\n"], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url); return;
    }
    const headers = Object.keys(rows[0]);
    const csv = [headers.join(',')]
      .concat(rows.map(r => headers.map(h => {
        const v = r[h] ?? '';
        const s = typeof v === 'string' ? v : (v instanceof Date ? v.toISOString() : String(v));
        // escapa aspas e vírgula
        const esc = s.replace(/"/g,'""');
        return `"${esc}"`;
      }).join(',')))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
  };

  const exportSummaryPDF = async () => {
    try {
      setExporting(true);
      // Carregar listas necessárias
      const [students, apps, hired] = await Promise.all([
        schoolApi.listClassStudents(id),
        schoolApi.listApplications({ class_id:id, limit:1000 }),
        schoolApi.listHired({ class_id:id, limit:1000 }),
      ]);

  const pdf = new jsPDF('p', 'mm', 'a4');
  // Fonte padrão: Helvetica para evitar espaçamento estranho nos acentos
  pdf.setFont('helvetica','normal');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 12;
      const contentWidth = pageWidth - margin*2;
      let y = margin;

      const addLine = (text, opts={}) => {
        const fontSize = opts.fontSize || 10;
        pdf.setFontSize(fontSize);
        const lines = pdf.splitTextToSize(text, contentWidth);
        lines.forEach((ln) => {
          if (y > pageHeight - margin) { pdf.addPage(); y = margin; }
          pdf.text(ln, margin, y);
          y += 6;
        });
      };
  const addTitle = (text) => { pdf.setFont('helvetica','bold'); pdf.setFontSize(14); if (y > pageHeight - margin) { pdf.addPage(); y = margin; } pdf.text(text, margin, y); y += 8; pdf.setFont('helvetica','normal'); };
  const addSubTitle = (text) => { pdf.setFont('helvetica','bold'); pdf.setFontSize(12); if (y > pageHeight - margin) { pdf.addPage(); y = margin; } pdf.text(text, margin, y); y += 7; pdf.setFont('helvetica','normal'); };
      const addSeparator = () => { if (y > pageHeight - margin) { pdf.addPage(); y = margin; } pdf.setDrawColor(230); pdf.line(margin, y, pageWidth-margin, y); y += 4; };

      // Cabeçalho
      addTitle(`Relatório da Turma: ${data?.class?.name||''}`);
      pdf.setFontSize(10); pdf.text(`Gerado em: ${new Date().toLocaleString()}`, margin, y); y += 8;

      // Seção: Resumo da Turma
      addSubTitle('Resumo da Turma');
      const s = data?.stats || {};
      const e = data?.employability || {};
      const r = [
        `Total de alunos: ${s.total_students ?? '—'}`,
        `Sem currículos: ${s.students_without_resumes ?? 0}`,
        `Sem candidaturas: ${s.students_without_applications ?? 0}`,
        `Ativos: ${(s.students_by_status?.find(x=>x.status==='active')?.count) || 0}`,
        `Alunos contratados (final): ${e.counts?.hired_students || 0}`,
        `Entrevistas (alunos): ${e.counts?.interviews_distinct_students || 0}`,
        `Alunos que se candidataram: ${e.totals?.students_with_applications || 0}`,
        `Alunos com currículo: ${(s.total_students||0) - (s.students_without_resumes||0)}`,
        `Pré-aprovados: ${e.counts?.pre_approved_students || 0}`,
        `Reprovados: ${e.counts?.rejected_students || 0}`,
      ];
      r.forEach((t)=> addLine(`• ${t}`));
      addSeparator();

      // Seção: Alunos da turma (cada campo em uma linha)
      addSubTitle('Alunos da turma');
      students.forEach((st)=>{
        const yn = (v)=> v ? 'Sim' : 'Não';
        // Nome com prefixo 'aluno ' apenas se ainda não tiver
        const nm = (st.name||'').trim();
        const hasPrefix = nm.toLowerCase().startsWith('aluno ');
        pdf.setFont('helvetica','bold'); addLine(`${hasPrefix? nm : `aluno ${nm}`} (${st.email||''})`);
        pdf.setFont('helvetica','normal');
        // Campos um por linha (sem ícones para evitar problemas de fonte)
        addLine(`Currículo: ${yn(!!st.has_resume)}${st.has_resume? ` (${st.resumes_count||0})` : ''}`);
        addLine(`Candidaturas: ${st.applications_count||0}`);
        addLine(`Entrevista (inferida): ${yn(!!st.has_interview)}`);
        addLine(`Pré-aprovado: ${yn(!!st.pre_approved)}`);
        addLine(`Aprovado final: ${yn(!!st.final_approved)}`);
        addLine(`Reprovado: ${yn(!!st.rejected)}`);
        // Espaçamento e separador suave
        y += 2; addSeparator();
  // manter helvetica para as próximas seções
      });

      // Seção: Relatório por aluno
      addSubTitle('Relatório por aluno');
      students.forEach((st, idx)=>{
        addLine(`${idx+1}. ${st.name} (${st.email||''})`, { fontSize: 11 });
        addLine(`Turma: ${st.class_name || data?.class?.name || ''}`);
        addLine(`Currículos: ${st.resumes_count||0} • Candidaturas: ${st.applications_count||0}`);

        // Candidaturas
        const myApps = apps.filter(a=> a.user_id===st.user_id);
        if (myApps.length){ addLine('Candidaturas:', { fontSize: 10 }); }
        myApps.forEach(a=>{
          const date = a.applied_at ? new Date(a.applied_at).toLocaleString() : '';
          addLine(`  - ${date} • ${a.company_name||'Empresa'} • ${a.job_title||'Vaga'} • ${a.status||''}`);
        });

        // Aprovações finais
        const myHired = hired.filter(h=> h.user_id===st.user_id);
        if (myHired.length){ addLine('Aprovações finais:', { fontSize: 10 }); }
        myHired.forEach(h=>{
          const date = h.final_approved_at ? new Date(h.final_approved_at).toLocaleString() : '';
          addLine(`  - ${date} • ${h.company_name||'Empresa'} • ${h.job_title||'Vaga'}`);
        });

        // Decisões (pré-aprovado / reprovado)
        const decisions = myApps.filter(a=> a.status==='approved' || a.status==='rejected');
        if (decisions.length){ addLine('Decisões (entrevistas inferidas):', { fontSize: 10 }); }
        decisions.forEach(d=>{
          addLine(`  - ${d.status==='approved'?'Pré-aprovado':'Reprovado'} • ${d.company_name||'Empresa'} • ${d.job_title||'Vaga'}`);
        });

        addSeparator();
      });

      pdf.save(`relatorio_${(data?.class?.name||'turma').replace(/[^\w\-(). ]+/g,'_')}.pdf`);
    } catch(e){ console.error('Erro ao gerar PDF', e); alert('Erro ao gerar PDF'); }
    finally { setExporting(false); }
  };

  const exportList = async (kind) => {
    try {
      setExporting(true);
      const turma = data?.class?.name || '';
      if (kind==='students') {
        const rows = await schoolApi.listClassStudents(id);
        downloadCSV(`alunos_${turma || 'turma'}.csv`, rows.map(s=>({ nome:s.name, email:s.email, turma: s.class_name || turma })));
      } else if (kind==='without_resumes') {
        const rows = await schoolApi.listStudentsWithoutResumes({ class_id:id, limit:1000 });
        downloadCSV(`alunos_sem_curriculo_${turma || 'turma'}.csv`, rows.map(s=>({ nome:s.name, email:s.email, turma: s.class_name || turma })));
      } else if (kind==='without_applications') {
        const rows = await schoolApi.listStudentsWithoutApplications({ class_id:id, limit:1000 });
        downloadCSV(`alunos_sem_candidaturas_${turma || 'turma'}.csv`, rows.map(s=>({ nome:s.name, email:s.email, turma: s.class_name || turma })));
      } else if (kind==='hired') {
        const rows = await schoolApi.listHired({ class_id:id, limit:1000 });
        downloadCSV(`alunos_contratados_${turma || 'turma'}.csv`, rows.map(r=>({ nome:r.name, email:r.email, vaga:r.job_title||'', empresa:r.company_name||'', aprovado_em:r.final_approved_at||'' })));
      } else if (kind==='interviews') {
        const rows = await schoolApi.listActiveInterviews({ class_id:id, limit:1000 });
        downloadCSV(`entrevistas_${turma || 'turma'}.csv`, rows.map(r=>({ nome:r.name, email:r.email, data:r.interview_date||'', modo:r.interview_mode||'', local:r.interview_location||'', link:r.interview_link||'', vaga:r.job_title||'', empresa:r.company_name||'' })));
      } else if (kind==='applications') {
        const rows = await schoolApi.listApplications({ class_id:id, limit:1000 });
        downloadCSV(`candidaturas_${turma || 'turma'}.csv`, rows.map(r=>({ nome:r.name, email:r.email, enviado_em:r.applied_at||'', vaga:r.job_title||'', empresa:r.company_name||'' })));
      }
    } catch(e){
      console.error('Erro exportando lista', e);
      alert(e.message || 'Erro ao exportar');
    } finally { setExporting(false); }
  };

  useEffect(()=>{
    let mounted = true;
    // Fetch partnerships once
    partnershipsApi.school.listPartnerships('accepted')
      .then(p => { if (mounted) setPartnerships(p || []); })
      .catch(() => {});
    (async()=>{
      try{
        const res = await schoolApi.getClassStats(id);
        if(mounted) setData(res);
        
        // Buscar dados reais para gráficos — buscar `students` primeiro para renderizar rápido,
        // e então carregar os demais dados sequencialmente para evitar muitas requisições paralelas.
        const students = await schoolApi.listClassStudents(id).catch(() => []);
        const applications = await schoolApi.listApplications({ class_id: id, limit: 1000 }).catch(() => []);
        const interviewsRaw = await schoolApi.listActiveInterviews({ class_id: id, limit: 1000 }).catch(() => ({ upcoming: [], history: [] }));
        const hired = await schoolApi.listHired({ class_id: id, limit: 1000 }).catch(() => []);

        // Garantir que temos tanto entrevistas futuras quanto histórico quando o backend já separar
        const interviewsUpcoming = Array.isArray(interviewsRaw?.upcoming) ? interviewsRaw.upcoming : (interviewsRaw || []);
        const interviewsHistory = Array.isArray(interviewsRaw?.history) ? interviewsRaw.history : [];
        // Para estatísticas gerais, consideramos qualquer entrevista já marcada em algum momento
        const interviewsAll = [...interviewsUpcoming, ...interviewsHistory];

        // Calcular hierarquia exclusiva de status dos alunos
        // Hierarquia (do mais avançado ao menos): Contratados > Entrevistas > Pré-aprovados > Em Análise > Sem Candidatura > Sem Currículo
        const studentStatusMap = new Map();
        const allStudents = students || [];
        
        // Inicializar todos os alunos como "sem currículo" (assumindo que se não tem candidatura, não tem currículo)
        allStudents.forEach(student => {
          studentStatusMap.set(student.user_id, { status: 'sem_curriculo', priority: 0 });
        });

        // Identificar alunos com candidaturas (atualiza para "sem candidatura" se tiver currículo mas não candidatou)
        const studentsWithApps = new Set();
        applications.forEach(app => {
          if (app.user_id) studentsWithApps.add(app.user_id);
        });
        
        // Alunos que têm currículo mas não se candidataram
        allStudents.forEach(student => {
          if (!studentsWithApps.has(student.user_id) && student.has_resume) {
            studentStatusMap.set(student.user_id, { status: 'sem_candidatura', priority: 1 });
          }
        });

        // Processar aplicações: Em Análise (status pending/applied)
        applications.forEach(app => {
          if (!app.user_id) return;
          const current = studentStatusMap.get(app.user_id) || { status: 'sem_candidatura', priority: 1 };
          if (['pending', 'applied'].includes(app.status) && current.priority < 2) {
            studentStatusMap.set(app.user_id, { status: 'em_analise', priority: 2 });
          }
          // Pré-aprovados (status approved mas não contratado ainda)
          if (app.status === 'approved' && !app.final_approved && current.priority < 3) {
            studentStatusMap.set(app.user_id, { status: 'pre_aprovado', priority: 3 });
          }
        });

        // Entrevistas ATIVAS marcadas (sobrescreve estados anteriores)
        // Apenas alunos com entrevistas agendadas e não finalizadas aparecem nesta categoria
        interviewsUpcoming.forEach(interview => {
          if (!interview.user_id) return;
          const current = studentStatusMap.get(interview.user_id) || { status: 'sem_candidatura', priority: 1 };
          if (current.priority < 4) {
            studentStatusMap.set(interview.user_id, { status: 'entrevista', priority: 4 });
          }
        });

        // Contratados (máxima prioridade)
        hired.forEach(h => {
          if (!h.user_id) return;
          studentStatusMap.set(h.user_id, { status: 'contratado', priority: 5 });
        });

        // Contar alunos por categoria exclusiva
        const statusCounts = {
          sem_curriculo: 0,
          sem_candidatura: 0,
          em_analise: 0,
          pre_aprovado: 0,
          entrevista: 0,
          contratado: 0
        };

        studentStatusMap.forEach(({ status }) => {
          statusCounts[status]++;
        });

        // Contar total de reprovações (candidaturas rejeitadas)
        const totalRejections = applications.filter(app => 
          app.rejected_by_company || app.rejected_by_candidate || app.status === 'rejected'
        ).length;

        // Calcular métricas de entrevistas (considerando apenas entrevistas que ACONTECERAM)
        // Excluir:
        // - interview_rejected_by_candidate: candidato rejeitou ANTES da entrevista
        // - interview_canceled_by_company: empresa cancelou ANTES da entrevista
        const interviewsCompleted = interviewsAll.filter(i => 
          !i.interview_rejected_by_candidate && !i.interview_canceled_by_company
        );
        const studentsWithInterviews = new Set(interviewsCompleted.map(i => i.user_id).filter(Boolean));
        const studentsHiredFromInterviews = hired.filter(h => studentsWithInterviews.has(h.user_id)).length;
        const interviewStats = {
          students_with_interviews: studentsWithInterviews.size,
          active_interviews: interviewsUpcoming.length,
          hired_count: studentsHiredFromInterviews,
          conversion_rate: studentsWithInterviews.size > 0 
            ? Math.round((studentsHiredFromInterviews / studentsWithInterviews.size) * 100) 
            : 0
        };

        // Armazenar no state para uso no gráfico
        if (mounted) {
          setData(prev => ({
            ...prev,
            hierarchical_status: statusCounts,
            total_rejections: totalRejections,
            interview_stats: interviewStats
          }));
        }

        // Processar dados dos últimos 7 dias
        const now = new Date();
        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
          const date = new Date(now);
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split('T')[0];
          last7Days.push({
            date: dateStr,
            label: i === 0 ? 'Hoje' : i === 1 ? 'Ontem' : date.toLocaleDateString('pt-BR', { weekday: 'short' }),
            applications: 0,
            interviews: 0,
            hired: 0,
            rejected: 0
          });
        }

        // Contar atividades por dia
        applications.forEach(app => {
          if (app.applied_at) {
            const appDate = new Date(app.applied_at).toISOString().split('T')[0];
            const dayData = last7Days.find(d => d.date === appDate);
            if (dayData) {
              dayData.applications++;
              if (app.rejected_by_company || app.rejected_by_candidate || app.status === 'rejected') {
                dayData.rejected++;
              }
            }
          }
        });

        interviewsAll.forEach(interview => {
          if (interview.interview_date) {
            const intDate = new Date(interview.interview_date).toISOString().split('T')[0];
            const dayData = last7Days.find(d => d.date === intDate);
            if (dayData) dayData.interviews++;
          }
        });

        hired.forEach(h => {
          if (h.final_approved_at) {
            const hiredDate = new Date(h.final_approved_at).toISOString().split('T')[0];
            const dayData = last7Days.find(d => d.date === hiredDate);
            if (dayData) dayData.hired++;
          }
        });

        // Processar top empresas
        const companyStats = {};
        applications.forEach(app => {
          if (app.company_name) {
            if (!companyStats[app.company_name]) {
              companyStats[app.company_name] = {
                name: app.company_name,
                applications: 0,
                interviews: 0,
                hired: 0
              };
            }
            companyStats[app.company_name].applications++;
          }
        });

        interviewsAll.forEach(interview => {
          if (interview.company_name && companyStats[interview.company_name]) {
            companyStats[interview.company_name].interviews++;
          }
        });

        hired.forEach(h => {
          if (h.company_name && companyStats[h.company_name]) {
            companyStats[h.company_name].hired++;
          }
        });

        const topCompanies = Object.values(companyStats)
          .sort((a, b) => (b.applications + b.interviews + b.hired) - (a.applications + a.interviews + a.hired))
          .slice(0, 5);

        if (mounted) {
          setRealData({
            applications,
            interviews: interviewsAll,
            hired,
            last7Days,
            topCompanies,
            students
          });
        }

        // Carregar estatísticas da Jornada do Candidato (inicial - sem filtro de etapa)
        console.log('🚀 [V3] Carregando estatísticas da jornada para turma:', id);
        try {
          console.log('🚀 [V3] Fazendo chamada API para: /journey/class/' + id + '/stats');
          const journeyData = await api.get(`/journey/class/${id}/stats`);
          console.log('🚀 [V3] Resposta da jornada:', journeyData);
          console.log('🚀 [V3] StageCounts:', journeyData?.stageCounts);
          if (mounted && journeyData) {
            setJourneyStats(journeyData);
          }
        } catch (journeyErr) {
          console.error('❌ [V3] Erro ao carregar estatísticas da jornada:', journeyErr);
        }

        // Carregar alunos sempre e manter a grade visível
        try {
          const saved = JSON.parse(sessionStorage.getItem(storageKey) || 'null');
          let students = await schoolApi.listClassStudents(id);
          // aplicar cache-busting em avatares http(s) na carga inicial para evitar stale cache
          const ts = Date.now();
          students = (students||[]).map(s => {
            const raw = s.profileImage || s.profile_image;
            if (raw && /^https?:\/\//i.test(raw)) {
              const sep = raw.includes('?') ? '&' : '?';
              const bust = `${raw}${sep}v=${ts}`;
              return { ...s, profileImage: bust, profile_image: bust };
            }
            return s;
          });
          const selected = saved && saved.selectedUserId ? students.find(x=> x.user_id===saved.selectedUserId) : null;
          if(mounted) setStudentFilter({ open:true, selected, activity: students });
        } catch(_){ /* ignore */ }
      }catch(e){
        if(mounted) setError(e.message || 'Falha ao carregar');
      }finally{ if(mounted) setLoading(false); }
    })();
    return ()=>{ mounted=false };
  },[id]);

  // Recarregar dados da jornada quando a etapa selecionada mudar
  useEffect(() => {
    if (!id) return;
    
    const loadJourneyData = async () => {
      try {
        const stageParam = selectedJourneyStage !== null ? `?stage=${selectedJourneyStage}` : '';
        console.log('🚀 [V3] Recarregando jornada com etapa:', selectedJourneyStage);
        const journeyData = await api.get(`/journey/class/${id}/stats${stageParam}`);
        if (journeyData) {
          setJourneyStats(journeyData);
        }
      } catch (err) {
        console.error('❌ Erro ao recarregar jornada:', err);
      }
    };
    
    loadJourneyData();
  }, [id, selectedJourneyStage]);

  // Atualizar avatares quando algum usuário alterar a própria foto (evento global)
  useEffect(()=>{
    const onAvatarUpdated = (e) => {
      // se soubermos o ID, podemos refletir imediatamente no array
      const uid = e?.detail?.userId;
      const url = e?.detail?.avatar;
      if (uid) {
        // Recarregar do backend para ter URL definitiva (evita manter base64 antiga)
        schoolApi.listClassStudents(id).then(students => {
          setStudentFilter(prev => ({
            ...prev,
            activity: (students || []).map(s => {
              if (String(s.user_id) === String(uid)) {
                const finalUrl = url || s.profileImage || s.profile_image || null;
                return { ...s, profileImage: finalUrl, profile_image: finalUrl };
              }
              return s;
            })
          }));
          setAvatarTick(t => t + 1);
        }).catch(()=>{
          // fallback: atualizar só local
          if (url) {
            setStudentFilter(prev => ({
              ...prev,
              activity: (prev.activity || []).map(s => String(s.user_id) === String(uid) ? ({ ...s, profileImage: url, profile_image: url }) : s)
            }));
            setAvatarTick(t => t + 1);
          }
        });
      }
    };
    window.addEventListener('avatarUpdated', onAvatarUpdated);
    return () => window.removeEventListener('avatarUpdated', onAvatarUpdated);
  }, []);

  // Poll leve para capturar atualizações feitas pelo próprio aluno em outra sessão (sem evento)
  useEffect(()=>{
    const interval = setInterval(async ()=>{
      try {
        const students = await schoolApi.listClassStudents(id);
        setStudentFilter(prev => ({
          ...prev,
          activity: (students || []).map(s => {
            const raw = s.profileImage || s.profile_image;
            if (raw && /^https?:\/\//i.test(raw)) {
              // cache-busting suave a cada ciclo
              const sep = raw.includes('?') ? '&' : '?';
              const bust = `${raw}${sep}tick=${Date.now()}`;
              return { ...s, profileImage: bust, profile_image: bust };
            }
            return s;
          })
        }));
      } catch { /* silencioso */ }
    }, 45000); // 45s para evitar carga excessiva
    return ()=> clearInterval(interval);
  }, [id]);

  // Persistir estado de filtros (aluno selecionado)
  useEffect(()=>{
    try{
      const payload = { selectedUserId: studentFilter.selected?.user_id || null };
      sessionStorage.setItem(storageKey, JSON.stringify(payload));
    }catch(_){ }
  }, [studentFilter.selected?.user_id, id]);

  if(!user || user.type!=='school') return <div className='max-w-6xl mx-auto p-6'>Acesso restrito às escolas.</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full px-6 pt-6 pb-0 space-y-4">
        <div>
          <p className="text-[11px] font-bold text-blue-500 uppercase tracking-widest mb-1">Painel de Turma</p>
          <h1 className="text-2xl md:text-[1.85rem] font-black text-gray-900 leading-tight">
            {data?.class?.name || 'Painel da Turma'}
          </h1>
        </div>
        <LayoutGroup id="class-stats-tabs">
          <div
            className="flex gap-0 border-b border-gray-200 overflow-x-auto"
            style={{ scrollbarWidth: 'none' }}
            role="tablist"
            aria-label="Navegação do painel"
          >
            {[
              { key: 'painel', label: 'Painel', icon: BarChart3 },
              { key: 'alunos', label: 'Alunos', icon: Users },
              { key: 'funil', label: 'Funil', icon: Filter },
              { key: 'vagas', label: 'Vagas', icon: Briefcase },
              { key: 'atividade', label: 'Atividade', icon: TrendingUp },
              { key: 'geografia', label: 'Geografia', icon: MapPin },
              { key: 'jornada', label: 'Jornada', icon: Rocket },
              { key: 'destaques', label: 'Destaques', icon: Star },
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveTab(tab.key)}
                  className={`relative flex items-center gap-2 px-4 py-3 text-sm font-semibold transition-colors whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-400 ${
                    isActive ? 'text-blue-600' : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  {isActive && (
                    <motion.span
                      initial={false}
                      layoutId="classStatsTabSlider"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full"
                      transition={{ type: 'spring', stiffness: 500, damping: 40, mass: 0.3 }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </LayoutGroup>
      </div>
      <div className="w-full px-6 py-6 space-y-6">
        {loading && <div className="text-gray-500">Carregando…</div>}
        {error && <div className="text-red-600 text-sm">{error}</div>}
        {!loading && !error && data && (
          <>

            {/* Banner de filtro por aluno ativo */}
            {globalStudentFilter && (
              <div className="flex items-center justify-between gap-4 px-4 py-3 rounded-2xl bg-white border-2 border-blue-200 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full overflow-hidden bg-blue-100 border-2 border-blue-200 flex items-center justify-center shrink-0">
                    {(globalStudentFilter.profileImage || globalStudentFilter.profile_image) ? (
                      <img src={globalStudentFilter.profileImage || globalStudentFilter.profile_image} alt={globalStudentFilter.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-blue-600 font-bold text-sm">
                        {(globalStudentFilter.name || '').split(' ').filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase()).join('')}
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-gray-900">Filtrado por: {globalStudentFilter.name}</div>
                    <div className="text-xs text-gray-500">Todos os gráficos filtrados por este aluno</div>
                  </div>
                </div>
                <button
                  onClick={() => setGlobalStudentFilter(null)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-red-600 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                  Remover filtro
                </button>
              </div>
            )}

            {/* Tab Content */}
            <Suspense fallback={<div className="p-6">Carregando conteúdo...</div>}>
            {activeTab === 'painel' && (
              <PainelTab
                data={data}
                id={id}
                exporting={exporting}
                setExporting={setExporting}
                exportSummaryPDF={exportSummaryPDF}
                exportList={exportList}
                openDrilldown={openDrilldown}
                globalStudentFilter={globalStudentFilter}
                setActiveTab={setActiveTab}
              />
            )}
            {activeTab === 'alunos' && (
              <AlunosTab
                id={id}
                data={data}
                studentFilter={studentFilter}
                setStudentFilter={setStudentFilter}
                globalStudentFilter={globalStudentFilter}
                setGlobalStudentFilter={setGlobalStudentFilter}
                avatarTick={avatarTick}
                stepsFirstRender={stepsFirstRender}
                setStepsFirstRender={setStepsFirstRender}
                setDrilldown={setDrilldown}
                setCompanyModal={setCompanyModal}
              />
            )}
            {activeTab === 'funil' && (
              <FunilTab
                data={data}
                studentFilter={studentFilter}
                realData={realData}
                globalStudentFilter={globalStudentFilter}
                funnelJobFilter={funnelJobFilter}
                setFunnelJobFilter={setFunnelJobFilter}
                funnelDropdownOpen={funnelDropdownOpen}
                setFunnelDropdownOpen={setFunnelDropdownOpen}
                setDrilldown={setDrilldown}
              />
            )}
            {activeTab === 'vagas' && (
              <VagasTab
                data={data}
                realData={realData}
                globalStudentFilter={globalStudentFilter}
                partnerships={partnerships}
              />
            )}
            {activeTab === 'atividade' && (
              <AtividadeTab
                id={id}
                data={data}
                realData={realData}
                globalStudentFilter={globalStudentFilter}
                pct={pct}
                setInterviewLogModal={setInterviewLogModal}
              />
            )}
            {activeTab === 'geografia' && (
              <GeografiaTab
                data={data}
                realData={realData}
                globalStudentFilter={globalStudentFilter}
                studentFilter={studentFilter}
                pct={pct}
              />
            )}
            {activeTab === 'jornada' && (
              <JornadaTab
                data={data}
                journeyStats={journeyStats}
                selectedJourneyStage={selectedJourneyStage}
                setSelectedJourneyStage={setSelectedJourneyStage}
                journeyStageDropdownOpen={journeyStageDropdownOpen}
                setJourneyStageDropdownOpen={setJourneyStageDropdownOpen}
                setJourneyParticipationModal={setJourneyParticipationModal}
                journeyStageNames={journeyStageNames}
              />
            )}
            {activeTab === 'destaques' && (
              <DestaquesTab
                data={data}
                studentFilter={studentFilter}
                setStudentFilter={setStudentFilter}
                realData={realData}
                avatarTick={avatarTick}
              />
            )}
            </Suspense>
          </>
        )}
      </div>

      {/* Drilldown Modal - Usando Portal para renderizar no body */}
      {drilldown.open && createPortal(
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-[99999]" style={{ margin: 0, top: 0, left: 0, right: 0, bottom: 0 }} onClick={()=> setDrilldown(p=>({...p, open:false}))}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl transform transition-all" onClick={e=>e.stopPropagation()}>
            {/* Header - cor sólida */}
            <div className={`relative px-6 py-5 rounded-t-2xl ${
              drilldown.color === 'amber' ? 'bg-amber-500' :
              drilldown.color === 'cyan' ? 'bg-cyan-500' :
              drilldown.color === 'violet' ? 'bg-violet-500' :
              drilldown.color === 'emerald' ? 'bg-emerald-500' :
              drilldown.color === 'red' ? 'bg-red-500' :
              drilldown.color === 'slate' ? 'bg-slate-500' :
              drilldown.color === 'gray' ? 'bg-gray-500' :
              'bg-blue-500'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="font-bold text-xl text-white">{drilldown.title}</h3>
                </div>
                <button 
                  onClick={()=> setDrilldown(p=>({...p, open:false}))} 
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white transition-all duration-200 flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              {/* Contador de resultados */}
              <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm">
                <span className="text-xs font-semibold text-white/90">{drilldown.rows.length} {drilldown.rows.length === 1 ? 'aluno' : 'alunos'}</span>
              </div>
            </div>
            
            {/* Conteúdo */}
            <div className="max-h-[65vh] overflow-y-auto">
              {drilldown.type==='loading' && (
                <div className="p-12 flex flex-col items-center justify-center gap-3">
                  <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                  <p className="text-sm text-gray-500">Carregando dados...</p>
                </div>
              )}
              
              {drilldown.type==='error' && (
                <div className="p-12 flex flex-col items-center justify-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
                    <AlertCircle className="w-6 h-6 text-red-600" />
                  </div>
                  <p className="text-sm text-red-600 font-medium">{drilldown.error || 'Erro ao carregar dados.'}</p>
                </div>
              )}
              
              {drilldown.type!=='loading' && drilldown.type!=='error' && drilldown.rows.length === 0 && (
                <div className="p-12 flex flex-col items-center justify-center gap-3">
                  <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center">
                    <UserX className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-500 font-medium">Nenhum aluno encontrado</p>
                </div>
              )}
              
              {drilldown.type!=='loading' && drilldown.type!=='error' && drilldown.rows.length > 0 && (
                <div className="p-5 space-y-2">
                  {drilldown.rows.map((student,idx)=> {
                    // Aplicar mapeamento se fornecido, senão usar dados brutos
                    const r = drilldown.mapRow ? drilldown.mapRow(student) : student;
                    
                    const initials = (r.name||'')
                      .split(' ')
                      .filter(Boolean)
                      .slice(0,2)
                      .map(p=>p[0]?.toUpperCase())
                      .join('') || '?';
                    
                    // Extrair avatar do objeto mapeado
                    const avatar = r.profileImage || r.profile_image || null;
                    
                    return (
                      <div key={idx} className="group p-4 rounded-xl bg-gradient-to-b from-gray-50 to-white border border-gray-100 hover:border-blue-200 hover:shadow-md transition-all duration-200">
                        <div className="flex items-center gap-4">
                          {/* Avatar */}
                          <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-lg shrink-0">
                            {avatar ? (
                              <img src={avatar} alt={r.name} className="w-full h-full object-cover" />
                            ) : (
                              initials
                            )}
                          </div>
                          
                          {/* Info do aluno */}
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                              <Link
                                to={`/school/student/${r.user_id || r.id}`}
                                className="block truncate text-gray-900 hover:text-blue-700 hover:underline"
                                onClick={() => setDrilldown(p => ({ ...p, open: false }))}
                              >
                                {r.name}
                              </Link>
                            </div>
                            <div className="text-xs text-gray-500 truncate mt-0.5">
                              {r.email}
                            </div>
                            
                            {/* Detalhes adicionais */}
                            {(r.applied_at || r.interview_date || r.final_approved_at || r.job_title) && (
                              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                                {r.applied_at && (
                                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-100">
                                    <Calendar className="w-3 h-3" />
                                    {new Date(r.applied_at).toLocaleDateString('pt-BR')}
                                  </span>
                                )}
                                {r.interview_date && (
                                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100">
                                    <MessageCircle className="w-3 h-3" />
                                    {new Date(r.interview_date).toLocaleDateString('pt-BR')}
                                  </span>
                                )}
                                {r.final_approved_at && (
                                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-100">
                                    <CheckCircle2 className="w-3 h-3" />
                                    {new Date(r.final_approved_at).toLocaleDateString('pt-BR')}
                                  </span>
                                )}
                              </div>
                            )}
                            
                            {/* Links de vaga e empresa */}
                            {(r.job_title || r.company_name) && (
                              <div className="mt-2 text-xs text-gray-600">
                                {r.job_id && r.job_title && (
                                  <Link className="text-blue-600 hover:text-blue-700 font-medium hover:underline" to={`/job/${r.job_id}`}>
                                    {r.job_title}
                                  </Link>
                                )}
                                {r.company_id && r.company_name && (
                                  <span>
                                    {r.job_title && ' • '}
                                    <Link className="text-blue-600 hover:text-blue-700 font-medium hover:underline" to={`/company/${r.company_id}`}>
                                      {r.company_name}
                                    </Link>
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal de empresas */}
      {companyModal.open && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={()=> setCompanyModal({ open:false, title:'', companies:[] })}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md" onClick={e=>e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">{companyModal.title}</h3>
              <button onClick={()=> setCompanyModal({ open:false, title:'', companies:[] })} className="text-gray-500 hover:text-gray-700">Fechar</button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-5">
              {(companyModal.companies||[]).length===0 && <div className="text-sm text-gray-500">Nenhuma empresa encontrada.</div>}
              <ul className="text-sm space-y-2">
                {companyModal.companies.map((c,idx)=> (
                  <li key={idx} className="px-3 py-2 rounded bg-gray-50 border border-gray-200">{c}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Histórico de Entrevistas */}
      {interviewLogModal.open && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setInterviewLogModal({ open: false })}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-purple-600 to-indigo-600 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg">Histórico de Entrevistas</h3>
                  <p className="text-purple-100 text-xs">Log completo de todas as entrevistas</p>
                </div>
              </div>
              <button onClick={() => setInterviewLogModal({ open: false })} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
            
            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {(() => {
                const interviews = realData.interviews || [];
                
                if (interviews.length === 0) {
                  return (
                    <div className="text-center py-12">
                      <CalendarDays className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">Nenhuma entrevista registrada</p>
                    </div>
                  );
                }

                // Função para determinar o status da entrevista
                const getInterviewStatus = (interview) => {
                  if (interview.interview_canceled_by_company) {
                    return { status: 'canceled', label: 'Cancelada pela empresa', color: 'red', icon: XCircle };
                  }
                  if (interview.interview_rejected_by_candidate) {
                    return { status: 'rejected_by_candidate', label: 'Recusada pelo candidato', color: 'orange', icon: UserX };
                  }
                  if (interview.final_approved) {
                    return { status: 'hired', label: 'Contratado', color: 'emerald', icon: UserCheck };
                  }
                  if (interview.status === 'rejected') {
                    return { status: 'rejected', label: 'Reprovado após entrevista', color: 'red', icon: XCircle };
                  }
                  // Verificar se a data já passou
                  const interviewDate = interview.interview_date ? new Date(interview.interview_date) : null;
                  const now = new Date();
                  if (interviewDate && interviewDate < now) {
                    return { status: 'completed', label: 'Aguardando decisão', color: 'amber', icon: Clock };
                  }
                  return { status: 'scheduled', label: 'Agendada', color: 'blue', icon: Calendar };
                };

                // Ordenar por data mais recente
                const sortedInterviews = [...interviews].sort((a, b) => {
                  const dateA = new Date(a.interview_date || a.created_at);
                  const dateB = new Date(b.interview_date || b.created_at);
                  return dateB - dateA;
                });

                return (
                  <div className="space-y-4">
                    {sortedInterviews.map((interview, idx) => {
                      const statusInfo = getInterviewStatus(interview);
                      const StatusIcon = statusInfo.icon;
                      const interviewDate = interview.interview_date ? new Date(interview.interview_date) : null;
                      
                      const colorMap = {
                        emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', icon: 'text-emerald-600', badge: 'bg-emerald-100 text-emerald-700' },
                        red: { bg: 'bg-red-50', border: 'border-red-200', icon: 'text-red-600', badge: 'bg-red-100 text-red-700' },
                        orange: { bg: 'bg-orange-50', border: 'border-orange-200', icon: 'text-orange-600', badge: 'bg-orange-100 text-orange-700' },
                        amber: { bg: 'bg-amber-50', border: 'border-amber-200', icon: 'text-amber-600', badge: 'bg-amber-100 text-amber-700' },
                        blue: { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'text-blue-600', badge: 'bg-blue-100 text-blue-700' }
                      };
                      const colors = colorMap[statusInfo.color];

                      return (
                        <div key={idx} className={`p-4 rounded-xl ${colors.bg} border ${colors.border}`}>
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3 flex-1">
                              {/* Avatar */}
                              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                                {interview.profile_image ? (
                                  <img src={interview.profile_image} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <Users className="w-5 h-5 text-gray-400" />
                                )}
                              </div>
                              
                              {/* Info */}
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-gray-900 truncate">{interview.name || 'Candidato'}</div>
                                <div className="text-sm text-gray-600 truncate">{interview.email}</div>
                                
                                {/* Vaga e Empresa */}
                                <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                                  <Building2 className="w-3.5 h-3.5" />
                                  <span className="truncate">
                                    {interview.job_title || 'Vaga'} • {interview.company_name || 'Empresa'}
                                  </span>
                                </div>
                                
                                {/* Data da entrevista */}
                                {interviewDate && (
                                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                                    <CalendarDays className="w-3.5 h-3.5" />
                                    <span>
                                      {interviewDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                                      {' às '}
                                      {interviewDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    {interview.interview_mode && (
                                      <span className="text-gray-400">• {interview.interview_mode === 'online' ? 'Online' : 'Presencial'}</span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Status Badge */}
                            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${colors.badge}`}>
                              <StatusIcon className="w-3.5 h-3.5" />
                              <span>{statusInfo.label}</span>
                            </div>
                          </div>
                          
                          {/* Detalhes adicionais */}
                          {(interview.interview_cancel_reason || interview.interview_notes) && (
                            <div className="mt-3 pt-3 border-t border-gray-200/50">
                              {interview.interview_cancel_reason && (
                                <div className="text-xs text-gray-600">
                                  <span className="font-medium">Motivo do cancelamento:</span> {interview.interview_cancel_reason}
                                </div>
                              )}
                              {interview.interview_notes && (
                                <div className="text-xs text-gray-600 mt-1">
                                  <span className="font-medium">Observações:</span> {interview.interview_notes}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
            
            {/* Footer com legenda */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
              <div className="flex flex-wrap gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                  <span className="text-gray-600">Contratado</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                  <span className="text-gray-600">Reprovado/Cancelado</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-orange-500"></div>
                  <span className="text-gray-600">Recusado pelo candidato</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
                  <span className="text-gray-600">Aguardando decisão</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
                  <span className="text-gray-600">Agendada</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Participação na Jornada */}
      {journeyParticipationModal && createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setJourneyParticipationModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-amber-500 to-orange-500 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Rocket className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg">Participação na Jornada</h3>
                  <p className="text-amber-100 text-xs">
                    {selectedJourneyStage === null 
                      ? 'Status da Etapa 1 - Autoconhecimento' 
                      : `Status: ${journeyStageNames[selectedJourneyStage] || `Etapa ${selectedJourneyStage + 1}`}`}
                  </p>
                </div>
              </div>
              <button onClick={() => setJourneyParticipationModal(false)} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
            
            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {(() => {
                // Obter lista de todos os alunos da turma
                const allStudents = realData?.students || [];
                const currentStage = selectedJourneyStage === null ? 0 : selectedJourneyStage;
                
                // Mapear respostas da jornada por user_id para a etapa atual
                const responsesMap = {};
                (journeyStats?.responses || []).forEach(r => {
                  // Na visão geral, mostrar apenas etapa 0
                  if (selectedJourneyStage === null) {
                    if (r.stage_id === 0) {
                      responsesMap[r.user_id] = r;
                    }
                  } else {
                    if (r.stage_id === currentStage) {
                      responsesMap[r.user_id] = r;
                    }
                  }
                });
                
                if (allStudents.length === 0) {
                  return (
                    <div className="text-center py-12">
                      <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">Nenhum aluno na turma</p>
                    </div>
                  );
                }

                // Separar alunos que responderam e não responderam
                const completedStudents = allStudents.filter(s => responsesMap[s.user_id]);
                const pendingStudents = allStudents.filter(s => !responsesMap[s.user_id]);

                return (
                  <div className="space-y-6">
                    {/* Resumo */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
                        <div className="flex items-center gap-2 mb-1">
                          <CheckCircle className="w-5 h-5 text-emerald-600" />
                          <span className="font-semibold text-emerald-800">Completaram</span>
                        </div>
                        <p className="text-3xl font-bold text-emerald-600">{completedStudents.length}</p>
                        <p className="text-xs text-emerald-600">{allStudents.length > 0 ? Math.round((completedStudents.length / allStudents.length) * 100) : 0}% da turma</p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                        <div className="flex items-center gap-2 mb-1">
                          <Clock className="w-5 h-5 text-gray-500" />
                          <span className="font-semibold text-gray-700">Pendentes</span>
                        </div>
                        <p className="text-3xl font-bold text-gray-600">{pendingStudents.length}</p>
                        <p className="text-xs text-gray-500">{allStudents.length > 0 ? Math.round((pendingStudents.length / allStudents.length) * 100) : 0}% da turma</p>
                      </div>
                    </div>

                    {/* Lista de alunos que completaram */}
                    {completedStudents.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-gray-800 text-sm mb-3 flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-emerald-500" />
                          Alunos que completaram ({completedStudents.length})
                        </h4>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {completedStudents.map((student, idx) => {
                            const response = responsesMap[student.user_id];
                            return (
                              <div key={idx} className="flex items-center justify-between px-3 py-2 bg-emerald-50 rounded-lg border border-emerald-100">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-full bg-emerald-200 flex items-center justify-center text-emerald-700 font-semibold text-sm">
                                    {student.name?.charAt(0)?.toUpperCase() || '?'}
                                  </div>
                                  <span className="font-medium text-gray-800 text-sm">{student.name}</span>
                                </div>
                                <span className="text-xs text-emerald-600 bg-emerald-100 px-2 py-1 rounded-full">
                                  {response?.completed_at ? new Date(response.completed_at).toLocaleDateString('pt-BR') : 'Concluído'}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Lista de alunos pendentes */}
                    {pendingStudents.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-gray-800 text-sm mb-3 flex items-center gap-2">
                          <Clock className="w-4 h-4 text-gray-400" />
                          Alunos pendentes ({pendingStudents.length})
                        </h4>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {pendingStudents.map((student, idx) => (
                            <div key={idx} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-semibold text-sm">
                                  {student.name?.charAt(0)?.toUpperCase() || '?'}
                                </div>
                                <span className="font-medium text-gray-600 text-sm">{student.name}</span>
                              </div>
                              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                                Não respondeu
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
            
            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                    <span className="text-gray-600">Completou</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-gray-400"></div>
                    <span className="text-gray-600">Pendente</span>
                  </div>
                </div>
                <button 
                  onClick={() => setJourneyParticipationModal(false)}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
