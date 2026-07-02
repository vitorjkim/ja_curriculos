import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Star, X, FileText, Send, TrendingUp, CalendarDays, Briefcase, Info, Filter, MapPin, Activity, Compass, Search, ArrowDownAZ, ChevronDown } from 'lucide-react';
import { schoolApi } from '@/lib/schoolApi';

const STEPS = [
  { key: 'resume',       label: 'Currículo',    icon: FileText,     color: 'bg-blue-500',    light: 'bg-blue-100 text-blue-600' },
  { key: 'applications', label: 'Candidaturas', icon: Send,         color: 'bg-amber-500',   light: 'bg-amber-100 text-amber-600' },
  { key: 'pre_approved', label: 'Pré-aprovado', icon: TrendingUp,   color: 'bg-cyan-500',    light: 'bg-cyan-100 text-cyan-600' },
  { key: 'interview',    label: 'Entrevista',   icon: CalendarDays, color: 'bg-purple-500',  light: 'bg-purple-100 text-purple-600' },
  { key: 'hired',        label: 'Contratado',   icon: Briefcase,    color: 'bg-emerald-500', light: 'bg-emerald-100 text-emerald-600' },
];

function getStudentSteps(s, realData = {}) {
  // Calcular pré-aprovado verificando aplicações com status 'approved', 'interested' ou 'interview'
  const preApproved = (realData.applications || []).some(app => 
    app.user_id === s.user_id && (app.status === 'approved' || app.status === 'interested' || app.status === 'interview')
  );
  // Calcular entrevista verificando se há entrevista ativa
  const hasInterview = (realData.interviews || []).some(i => 
    i.user_id === s.user_id && !i.interview_canceled_by_company && !i.interview_rejected_by_candidate
  );
  return [
    !!s.has_resume,
    (s.applications_count || 0) > 0,
    preApproved,
    hasInterview,
    !!s.final_approved,
  ];
}

function StudentSummary({ student, data, realData = {} }) {
  const stats = data?.stats || {};
  const emp = data?.employability || {};
  const hier = data?.hierarchical_status || {};
  const intStats = data?.interview_stats || {};

  // Calcular se tem pré-aprovado verificando aplicações (inclui interview)
  const preApprovedValue = (realData.applications || []).some(app => 
    app.user_id === student.user_id && (app.status === 'approved' || app.status === 'interested' || app.status === 'interview')
  );

  // Calcular se tem entrevista verificando entrevistas ativas
  const hasInterviewValue = (realData.interviews || []).some(i => 
    i.user_id === student.user_id && !i.interview_canceled_by_company && !i.interview_rejected_by_candidate
  );

  const sections = [
    { label: 'Funil', icon: Filter, items: [
      { k: 'Sem currículo', v: hier.sem_curriculo ?? '-' },
      { k: 'Sem candidatura', v: hier.sem_candidatura ?? '-' },
      { k: 'Em análise', v: hier.em_analise ?? '-' },
      { k: 'Pré-aprovado', v: hier.pre_aprovado ?? '-' },
      { k: 'Entrevista', v: hier.entrevista ?? '-' },
      { k: 'Contratado', v: hier.contratado ?? '-' },
    ]},
    { label: 'Vagas', icon: Briefcase, items: [
      { k: 'Candidaturas', v: student.applications_count || 0 },
      { k: 'Currículos', v: student.resumes_count || 0 },
    ]},
    { label: 'Atividade', icon: Activity, items: [
      { k: 'Status', v: student.status || 'Ativo' },
      { k: 'Rejeitado', v: student.rejected ? 'Sim' : 'Não' },
    ]},
    { label: 'Geografia', icon: MapPin, items: [
      { k: 'Curso', v: student.course_name || '-' },
      { k: 'Turma', v: student.class_name || '-' },
    ]},
    { label: 'Jornada', icon: Compass, items: [
      { k: 'Currículo', v: student.has_resume ? '✓' : '✗' },
      { k: 'Candidaturas', v: (student.applications_count||0) > 0 ? '✓' : '✗' },
      { k: 'Pré-aprovado', v: preApprovedValue ? '✓' : '✗' },
      { k: 'Entrevista', v: hasInterviewValue ? '✓' : '✗' },
      { k: 'Contratado', v: student.final_approved ? '✓' : '✗' },
    ]},
  ];

  return (
    <div className="absolute right-0 top-full mt-1 z-50 w-72 bg-white rounded-xl border border-gray-200 shadow-xl p-3 space-y-2.5" onClick={e => e.stopPropagation()}>
      {sections.map(sec => {
        const Icon = sec.icon;
        return (
          <div key={sec.label}>
            <div className="flex items-center gap-1.5 mb-1">
              <Icon className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">{sec.label}</span>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 pl-5">
              {sec.items.map(item => (
                <div key={item.k} className="flex items-center justify-between text-[11px]">
                  <span className="text-gray-400">{item.k}</span>
                  <span className={`font-semibold ${item.v === '✓' ? 'text-emerald-600' : item.v === '✗' ? 'text-red-400' : 'text-gray-700'}`}>{item.v}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function InfoButton({ student, data, realData = {} }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative shrink-0">
      <button
        onClick={e => { e.stopPropagation(); setOpen(v => !v); }}
        className="w-5 h-5 rounded-full flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
      >
        <Info className="w-3.5 h-3.5" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={e => { e.stopPropagation(); setOpen(false); }} />
          <StudentSummary student={student} data={data} realData={realData} />
        </>
      )}
    </div>
  );
}

const SORT_OPTIONS = [
  { key: 'alpha', label: 'Ordem alfabética', icon: ArrowDownAZ },
  { key: 'featured', label: 'Destaque (estrela)', icon: Star },
];

function SortDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const current = SORT_OPTIONS.find(o => o.key === value) || SORT_OPTIONS[0];
  const Icon = current.icon;
  return (
    <div className="relative shrink-0">
      <button
        onClick={() => setOpen(v => !v)}
        className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-full border border-gray-200 bg-white hover:bg-gray-50 text-xs font-medium text-gray-700 transition-colors"
      >
        <Icon className="w-3.5 h-3.5 text-gray-500" />
        <span className="hidden sm:inline">{current.label}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1 z-50 w-52 bg-white rounded-xl border border-gray-200 shadow-xl py-1 overflow-hidden">
            {SORT_OPTIONS.map(opt => {
              const OptIcon = opt.icon;
              const isSelected = value === opt.key;
              return (
                <button
                  key={opt.key}
                  onClick={() => { onChange(opt.key); setOpen(false); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                >
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${isSelected ? 'border-blue-500' : 'border-gray-300'}`}>
                    {isSelected && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                  </div>
                  <OptIcon className={`w-3.5 h-3.5 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`} />
                  <span className={`text-xs font-medium ${isSelected ? 'text-blue-700' : 'text-gray-600'}`}>{opt.label}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export default function AlunosTab({ id, data, studentFilter, setStudentFilter, globalStudentFilter, setGlobalStudentFilter, avatarTick, stepsFirstRender, setStepsFirstRender, setDrilldown, setCompanyModal, realData = {} }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortMode, setSortMode] = useState('alpha');

  // Debounce para o campo de busca (reduz re-renders/filtragens rápidas)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Memoizar o handler para evitar re-renders desnecessários
  const handleNameLinkClick = useCallback((e) => {
    e.stopPropagation();
  }, []);

  return (
    <div className="rounded-2xl bg-white border-2 border-gray-200 shadow-md">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-200">
        <h3 className="font-bold text-gray-900">Análise por aluno</h3>
        <p className="text-xs text-gray-400 mt-0.5">Selecione um aluno para filtrar os gráficos</p>
      </div>

      {/* Search + Sort + Legend */}
      <div className="px-5 py-2.5 border-b border-gray-100 bg-gray-50/70 flex items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar aluno..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-gray-200 rounded-full placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors"
          />
        </div>

        {/* Sort dropdown */}
        <SortDropdown value={sortMode} onChange={setSortMode} />

        {/* Spacer */}
        <div className="flex-1" />

        {/* Legend (right) */}
        <div className="flex items-center gap-3 shrink-0 overflow-x-auto">
          {STEPS.map(st => {
            const Icon = st.icon;
            return (
              <div key={st.key} className="flex items-center gap-1 shrink-0" title={st.label}>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center ${st.light}`}>
                  <Icon className="w-3 h-3" />
                </div>
                <span className="text-[10px] font-medium text-gray-500 hidden lg:inline">{st.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Student rows */}
      <div className="divide-y divide-gray-100 max-h-[420px] overflow-y-auto">
        {[...studentFilter.activity]
          .filter(s => !debouncedSearch || (s.name||'').toLowerCase().includes(debouncedSearch.toLowerCase()))
          .sort((a, b) => {
            if (sortMode === 'featured') {
              if (a.is_featured && !b.is_featured) return -1;
              if (!a.is_featured && b.is_featured) return 1;
            }
            return (a.name||'').localeCompare(b.name||'', 'pt-BR');
          })
          .map(s => {
          const initials = (s.name||'').split(' ').filter(Boolean).slice(0,2).map(p=>p[0]?.toUpperCase()).join('') || '?';
          const getAvatar = (stu) => stu?.profileImage || stu?.profile_image || null;
          let avatar = getAvatar(s);
          if (avatar && typeof avatar === 'string' && /^https?:\/\//i.test(avatar) && avatarTick>0) {
            avatar = `${avatar}${avatar.includes('?') ? '&' : '?'}v=${avatarTick}`;
          }
          const steps = getStudentSteps(s, realData);
          const stepsDone = steps.filter(Boolean).length;
          const pct = Math.round((stepsDone / 5) * 100);
          const isActive = globalStudentFilter?.user_id === s.user_id;

          return (
            <div
              key={s.user_id}
              onClick={() => {
                setStudentFilter(p => ({ ...p, selected: s }));
                if (isActive) setGlobalStudentFilter(null);
                else setGlobalStudentFilter(s);
              }}
              className={`flex items-center gap-3 pl-5 pr-5 py-3 cursor-pointer transition-colors
                ${isActive ? 'bg-blue-50 shadow-[inset_3px_0_0_0_#3b82f6]' : 'hover:bg-gray-50'}`}
            >
              {/* Avatar */}
              <div className="w-9 h-9 rounded-full shrink-0 overflow-hidden">
                {avatar
                  ? <img src={avatar} alt="" className="w-full h-full object-cover" />
                  : <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white ${isActive ? 'bg-blue-500' : 'bg-gray-400'}`}>{initials}</div>
                }
              </div>

              {/* Name + email + info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <Link
                    to={`/school/student/${s.user_id}`}
                    className={`text-sm font-semibold truncate hover:underline ${isActive ? 'text-blue-700' : 'text-blue-600 hover:text-blue-800'}`}
                    onClick={handleNameLinkClick}
                  >
                    {s.name}
                  </Link>
                  {s.is_featured && <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400 shrink-0" />}
                  <InfoButton student={s} data={data} realData={realData} />
                </div>
                <span className="text-[11px] text-gray-400 truncate block">{s.email}</span>
              </div>

              {/* Step markers */}
              <div className="flex items-center gap-1.5 shrink-0">
                {steps.map((done, i) => {
                  const st = STEPS[i];
                  const Icon = st.icon;
                  return done ? (
                    <div key={i} title={st.label} className={`w-7 h-7 rounded-full flex items-center justify-center ${st.light}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                  ) : (
                    <div key={i} title={st.label} className="w-7 h-7 rounded-full bg-gray-100 border border-dashed border-gray-300" />
                  );
                })}
              </div>

              {/* Percentage */}
              <span className={`text-xs font-bold w-9 text-right shrink-0 ${pct === 100 ? 'text-emerald-600' : pct > 0 ? 'text-gray-600' : 'text-gray-300'}`}>{pct}%</span>
            </div>
          );
        })}
      </div>


    </div>
  );
}
