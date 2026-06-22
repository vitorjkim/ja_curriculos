import React from 'react';
import { Users, BookOpen, BarChart3, TrendingUp, Briefcase, CalendarDays, Send, Download } from 'lucide-react';
import { schoolApi } from '@/lib/schoolApi';
import SaaSLineChart from '@/components/SaaSLineChart';

const StatCard = ({ icon: Icon, label, value, color, percent, onClick }) => (
  <button
    onClick={onClick}
    className={`group relative overflow-hidden rounded-2xl p-5 text-left w-full transition-all duration-200 hover:shadow-xl hover:brightness-105 active:scale-[0.98] ${color}`}
  >
    <div className="flex items-start justify-between gap-2 mb-3">
      <p className="text-[10px] font-bold uppercase tracking-widest opacity-70 leading-tight">{label}</p>
      <div className="w-8 h-8 rounded-xl bg-black/15 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4" />
      </div>
    </div>
    <p className="text-4xl font-black leading-none tabular-nums">{value ?? '—'}</p>
    {typeof percent === 'number' && (
      <p className="text-xs font-semibold opacity-60 mt-2">{percent}% da turma</p>
    )}
    <div className="absolute -bottom-8 -right-8 w-28 h-28 rounded-full bg-white/10 pointer-events-none" />
    <div className="absolute -bottom-3 -right-3 w-14 h-14 rounded-full bg-white/5 pointer-events-none" />
  </button>
);

export default function PainelTab({ data, id, exporting, setExporting, exportSummaryPDF, exportList, openDrilldown, globalStudentFilter, setActiveTab }) {
  return (
    <div className="space-y-5">

      {/* Stats — row 1: 4 cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={Users}
          label="Total Alunos"
          value={data.stats.total_students}
          color="bg-blue-600 text-white"
          onClick={() => openDrilldown('Total de Alunos', () => schoolApi.listClassStudents(id), (s) => {
            const turma = s.class_name || data?.class?.name || '';
            return { name: s.name, email: s.email, extra: turma ? `• ${turma}` : '', user_id: s.user_id || s.id, profile_image: s.profile_image || s.profileImage };
          })}
        />
        <StatCard
          icon={BookOpen}
          label="Sem Currículos"
          value={data.stats.students_without_resumes}
          color="bg-slate-700 text-white"
          percent={data.stats.total_students ? Math.round((data.stats.students_without_resumes / data.stats.total_students) * 1000) / 10 : 0}
          onClick={() => openDrilldown('Alunos sem currículos', () => schoolApi.listStudentsWithoutResumes({ class_id: id, limit: 100 }), (s) => ({ name: s.name, email: s.email, profileImage: s.profile_image || s.profileImage, extra: `${s.course_name || ''}${s.class_name ? ` • ${s.class_name}` : ''}` }))}
        />
        <StatCard
          icon={BarChart3}
          label="Sem Candidaturas"
          value={data.stats.students_without_applications}
          color="bg-amber-500 text-white"
          percent={data.stats.total_students ? Math.round((data.stats.students_without_applications / data.stats.total_students) * 1000) / 10 : 0}
          onClick={() => openDrilldown('Alunos sem candidaturas', () => schoolApi.listStudentsWithoutApplications({ class_id: id, limit: 100 }), (s) => ({ name: s.name, email: s.email, profileImage: s.profile_image || s.profileImage, extra: `${s.course_name || ''}${s.class_name ? ` • ${s.class_name}` : ''}` }))}
        />
        <StatCard
          icon={TrendingUp}
          label="Status Ativos"
          value={data.stats.students_by_status?.find(s => s.status === 'active')?.count || 0}
          color="bg-violet-600 text-white"
          percent={data.stats.total_students ? Math.round(((data.stats.students_by_status?.find(s => s.status === 'active')?.count || 0) / data.stats.total_students) * 1000) / 10 : 0}
          onClick={() => openDrilldown('Alunos Ativos', () => schoolApi.listStudents({ class_id: id, status: 'active', limit: 100 }).then(r => r.students || []), (s) => ({ name: s.name, email: s.email, profileImage: s.profile_image || s.profileImage, extra: `${s.course_name || ''}${s.class_name ? ` • ${s.class_name}` : ''}` }))}
        />
      </div>

      {/* Stats — row 2: 3 cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard
          icon={Briefcase}
          label="Alunos Contratados"
          value={data.employability.counts.hired_students}
          color="bg-emerald-600 text-white"
          percent={data.stats.total_students ? Math.round((data.employability.counts.hired_students / data.stats.total_students) * 1000) / 10 : 0}
          onClick={() => openDrilldown('Alunos Contratados', () => schoolApi.listHired({ class_id: id, limit: 100 }), (r) => ({ name: r.name, email: r.email, profileImage: r.profile_image, user_id: r.user_id, final_approved_at: r.final_approved_at, job_id: r.job_id, job_title: r.job_title, company_id: r.company_id, company_name: r.company_name }))}
        />
        <StatCard
          icon={CalendarDays}
          label="Entrevistas Agendadas"
          value={data.employability.counts.interviews}
          color="bg-indigo-600 text-white"
          percent={data.stats.total_students ? Math.round((data.employability.totals.students_with_interviews / data.stats.total_students) * 1000) / 10 : 0}
          onClick={() => openDrilldown('Entrevistas Agendadas', () => schoolApi.listInterviews({ class_id: id, limit: 100 }), (r) => ({ name: r.name, email: r.email, profileImage: r.profile_image, user_id: r.user_id, has_interview_at: r.interview_date || r.has_interview_at, job_id: r.job_id, job_title: r.job_title, company_id: r.company_id, company_name: r.company_name }))}
        />
        <StatCard
          icon={Send}
          label="Candidaturas Enviadas"
          value={data.employability.counts.applications}
          color="bg-rose-500 text-white"
          percent={data.stats.total_students ? Math.round((data.employability.totals.students_with_applications / data.stats.total_students) * 1000) / 10 : 0}
          onClick={() => openDrilldown('Candidaturas Enviadas', () => schoolApi.listApplications({ class_id: id, limit: 100 }), (r) => ({ name: r.name, email: r.email, profileImage: r.profile_image, user_id: r.user_id, applied_at: r.applied_at, job_id: r.job_id, job_title: r.job_title, company_id: r.company_id, company_name: r.company_name }))}
        />
      </div>

      {/* Atividade recente */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
        <div className="mb-3">
          <h3 className="font-bold text-gray-900 text-sm">Atividade (Últimos 7 dias)</h3>
          <p className="text-[11px] text-gray-500 mt-0.5">
            {globalStudentFilter
              ? `Atividades de ${globalStudentFilter.name}`
              : 'Candidaturas, entrevistas, aprovados e reprovados (somente alunos desta turma)'}
          </p>
        </div>
        <SaaSLineChart classId={id} height={220} userId={globalStudentFilter?.user_id} />
      </div>

      {/* Exportações */}
      <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-md">
        <div className="flex items-center gap-2 px-5 py-2.5 border-b border-gray-200 bg-gray-50 rounded-t-2xl">
          <Download className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Exportar dados</span>
        </div>
        <div className="px-5 py-4 flex flex-wrap items-center gap-2.5">
          <button
            onClick={exportSummaryPDF}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-900 text-white hover:bg-gray-700 font-semibold text-sm transition-colors shrink-0"
          >
            <Download className="w-4 h-4" />
            Relatório PDF
          </button>
          <div className="w-px h-8 bg-gray-200 mx-1 shrink-0" />
          {[
            { key: 'students',              label: 'Alunos',            icon: Users,       color: 'text-blue-500' },
            { key: 'without_resumes',       label: 'Sem currículos',    icon: BookOpen,    color: 'text-slate-500' },
            { key: 'without_applications',  label: 'Sem candidaturas',  icon: BarChart3,   color: 'text-amber-500' },
            { key: 'hired',                 label: 'Contratados',       icon: Briefcase,   color: 'text-emerald-500' },
            { key: 'interviews',            label: 'Entrevistas',       icon: CalendarDays,color: 'text-indigo-500' },
            { key: 'applications',          label: 'Candidaturas',      icon: Send,        color: 'text-rose-500' },
          ].map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                disabled={exporting}
                onClick={() => exportList(item.key)}
                className="inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 font-medium text-gray-700 transition-colors"
              >
                <Icon className={`w-3.5 h-3.5 shrink-0 ${item.color}`} />
                {item.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
