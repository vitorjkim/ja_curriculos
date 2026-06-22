import React from 'react';
import { TrendingUp, CheckCircle2, Send, Users, CalendarDays, FileText, Briefcase, BarChart3, Activity } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import SaaSLineChart from '@/components/SaaSLineChart';

export default function AtividadeTab({ id, data, realData, globalStudentFilter, pct, setInterviewLogModal }) {
  const filteredApplications = globalStudentFilter
    ? (realData.applications || []).filter(app => app.user_id === globalStudentFilter.user_id)
    : (realData.applications || []);
  const filteredInterviews = globalStudentFilter
    ? (realData.interviews || []).filter(i => i.user_id === globalStudentFilter.user_id)
    : (realData.interviews || []);
  const filteredHired = globalStudentFilter
    ? (realData.hired || []).filter(h => h.user_id === globalStudentFilter.user_id)
    : (realData.hired || []);
  
  const applicationsCount = filteredApplications.length;
  const uniqueApplicants = new Set(filteredApplications.map(a => a.user_id)).size;
  const interviewsCount = filteredInterviews.length;
  const uniqueInterviewees = new Set(filteredInterviews.map(i => i.user_id)).size;
  const hiredCount = filteredHired.length;
  const activeInterviews = filteredInterviews.filter(i => !i.interview_canceled_by_company && !i.interview_rejected_by_candidate && !i.final_approved).length;
  
  const totalStudents = globalStudentFilter ? 1 : (data.stats.total_students || 1);
  const studentHired = hiredCount > 0;
  const studentHasInterview = interviewsCount > 0;
  
  const barData = [
    { name: 'Candidaturas', total: applicationsCount, alunos: uniqueApplicants, base: '#3b82f6' },
    { name: 'Entrevistas', total: interviewsCount, alunos: uniqueInterviewees, base: '#7e22ce' },
    { name: 'Contratações', total: hiredCount, alunos: hiredCount, base: '#16a34a' },
  ];

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const row = payload[0].payload;
      return (
        <div className="bg-white px-3.5 py-2.5 rounded-xl shadow-lg border border-gray-100">
          <p className="text-sm font-semibold text-gray-900 mb-1 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: row.base }} />
            {row.name}
          </p>
          <p className="text-[11px] text-gray-500">Total: <span className="font-semibold text-gray-700">{row.total}</span></p>
          <p className="text-[11px] text-gray-500">Alunos: <span className="font-semibold text-gray-700">{row.alunos}</span></p>
        </div>
      );
    }
    return null;
  };

  // Summary stats strip
  const summaryStats = [
    {
      label: 'Candidaturas', value: applicationsCount,
      sub: `${uniqueApplicants} aluno${uniqueApplicants !== 1 ? 's' : ''}`,
      icon: Send,
      bg: 'bg-gradient-to-br from-blue-500 to-blue-600',
      iconBg: 'bg-white/20',
      subColor: 'text-blue-100',
    },
    {
      label: 'Entrevistas', value: interviewsCount,
      sub: activeInterviews > 0 ? `${activeInterviews} ativa${activeInterviews !== 1 ? 's' : ''}` : 'nenhuma ativa',
      icon: CalendarDays,
      bg: 'bg-gradient-to-br from-purple-500 to-purple-600',
      iconBg: 'bg-white/20',
      subColor: 'text-purple-100',
    },
    {
      label: 'Contratações', value: hiredCount,
      sub: globalStudentFilter ? (studentHired ? 'Contratado' : 'Não contratado') : `de ${totalStudents} alunos`,
      icon: Briefcase,
      bg: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
      iconBg: 'bg-white/20',
      subColor: 'text-emerald-100',
    },
  ];

  const visaoItems = [
    { 
      label: globalStudentFilter ? 'Contratado?' : 'Taxa de Empregabilidade', 
      value: globalStudentFilter 
        ? (studentHired ? 'Sim ✓' : 'Não') 
        : `${pct(data.employability.counts.hired_students, data.stats.total_students)}%`,
      color: 'emerald',
      icon: CheckCircle2,
      cardBg: 'bg-emerald-50', cardBorder: 'border-emerald-200',
      iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600',
      valueColor: 'text-emerald-700',
    },
    { 
      label: globalStudentFilter ? 'Total de Candidaturas' : 'Média de Candidaturas/Aluno', 
      value: globalStudentFilter 
        ? applicationsCount 
        : (totalStudents > 0 ? (data.employability.counts.applications / totalStudents).toFixed(1) : '0'),
      color: 'amber',
      icon: Send,
      cardBg: 'bg-amber-50', cardBorder: 'border-amber-200',
      iconBg: 'bg-amber-100', iconColor: 'text-amber-600',
      valueColor: 'text-amber-700',
    },
    { 
      label: globalStudentFilter ? 'Status' : 'Alunos Ativos', 
      value: globalStudentFilter 
        ? (studentHired ? 'Contratado' : studentHasInterview ? 'Em entrevista' : applicationsCount > 0 ? 'Buscando' : 'Inativo')
        : (data.stats.students_by_status?.find(s=>s.status==='active')?.count || 0),
      color: 'blue',
      icon: Users,
      cardBg: 'bg-blue-50', cardBorder: 'border-blue-200',
      iconBg: 'bg-blue-100', iconColor: 'text-blue-600',
      valueColor: 'text-blue-700',
    },
    { 
      label: globalStudentFilter 
        ? `Entrevistas realizadas` 
        : `Contratados após entrevista (${data.interview_stats?.hired_count || 0} de ${data.interview_stats?.students_with_interviews || 0})`, 
      value: globalStudentFilter 
        ? interviewsCount 
        : ((data.interview_stats?.students_with_interviews || 0) > 0 
            ? `${Math.round(((data.interview_stats?.hired_count || 0) / (data.interview_stats?.students_with_interviews || 1)) * 100)}%`
            : '0%'),
      subtitle: globalStudentFilter 
        ? (activeInterviews > 0 ? `${activeInterviews} entrevista(s) ativa(s)` : 'Nenhuma entrevista ativa')
        : `Entrevistas ativas agora: ${data.interview_stats?.active_interviews || 0}`,
      color: 'purple',
      icon: CalendarDays,
      hasLogButton: !globalStudentFilter,
      cardBg: 'bg-purple-50', cardBorder: 'border-purple-200',
      iconBg: 'bg-purple-100', iconColor: 'text-purple-600',
      valueColor: 'text-purple-700',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Top summary strip — colored gradient cards */}
      <div className="grid grid-cols-3 gap-3">
        {summaryStats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div key={idx} className={`rounded-xl ${stat.bg} shadow-md p-4 flex items-center gap-3 text-white`}>
              <div className={`w-10 h-10 rounded-xl ${stat.iconBg} flex items-center justify-center flex-shrink-0`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <div className="text-2xl font-bold leading-none">{stat.value}</div>
                <div className="text-[11px] font-semibold text-white/90 mt-0.5">{stat.label}</div>
                <div className={`text-[10px] ${stat.subColor}`}>{stat.sub}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Gráfico de Barras */}
        <div className="rounded-2xl bg-white border-2 border-gray-200 shadow-md flex flex-col" style={{ minHeight: 300 }}>
          <div className="flex items-center justify-between px-5 py-3 bg-gradient-to-r from-slate-50 to-gray-50 rounded-t-2xl border-b border-gray-200">
            <div>
              <h3 className="font-bold text-gray-900 text-sm">Atividade da Turma</h3>
              <p className="text-gray-400 text-[11px] mt-0.5">Candidaturas, entrevistas e contratações</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-blue-600" />
            </div>
          </div>
          <div className="flex-1 px-3 py-3" style={{minHeight: 0}}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} animationDuration={900} animationEasing="ease-out">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
                <Bar dataKey="total" radius={[8,8,0,0]} maxBarSize={52}>
                  {barData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.base} opacity={0.9} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Visão Geral */}
        <div className="rounded-2xl bg-white border-2 border-gray-200 shadow-md flex flex-col">
          <div className="flex items-center justify-between px-5 py-3 bg-gradient-to-r from-slate-50 to-gray-50 rounded-t-2xl border-b border-gray-200">
            <div>
              <h3 className="font-bold text-gray-900 text-sm">Visão Geral</h3>
              <p className="text-gray-400 text-[11px] mt-0.5">Indicadores chave</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 p-4 flex-1 content-start">
            {visaoItems.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div key={idx} className={`rounded-xl ${item.cardBg} border ${item.cardBorder} p-3.5`}>
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <div className={`w-7 h-7 rounded-lg ${item.iconBg} flex items-center justify-center`}>
                      <Icon className={`w-3.5 h-3.5 ${item.iconColor}`} />
                    </div>
                    {item.hasLogButton && (
                      <button
                        onClick={() => setInterviewLogModal({ open: true })}
                        className="p-1 rounded-md hover:bg-white/60 transition-colors"
                        title="Ver histórico de entrevistas"
                      >
                        <FileText className="w-3.5 h-3.5 text-gray-500" />
                      </button>
                    )}
                  </div>
                  <div className={`text-xl font-bold ${item.valueColor} mb-0.5`}>{item.value}</div>
                  <div className="text-[11px] text-gray-600 font-medium leading-tight">{item.label}</div>
                  {item.subtitle && (
                    <div className="text-[10px] text-gray-500 mt-1.5 leading-tight flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-400 inline-block flex-shrink-0" />
                      {item.subtitle}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Atividade (Últimos 7 dias) */}
      <div className="bg-white border-2 border-gray-200 rounded-2xl shadow-md">
        <div className="flex items-center justify-between px-5 py-3 bg-gradient-to-r from-slate-50 to-gray-50 rounded-t-2xl border-b border-gray-200">
          <div>
            <h3 className="font-bold text-gray-900 text-sm">Atividade — Últimos 7 dias</h3>
            <p className="text-[11px] text-gray-400 mt-0.5">
              {globalStudentFilter 
                ? `Atividades de ${globalStudentFilter.name}` 
                : 'Candidaturas, entrevistas, aprovados e reprovados desta turma'}
            </p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
            <Activity className="w-4 h-4 text-indigo-600" />
          </div>
        </div>
        <div className="px-4 pb-4 pt-2">
          <SaaSLineChart classId={id} height={220} userId={globalStudentFilter?.user_id} />
        </div>
      </div>
    </div>
  );
}
