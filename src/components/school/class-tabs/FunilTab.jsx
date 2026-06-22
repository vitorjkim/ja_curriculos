import React from 'react';
import { FileText, UserX, Send, CheckCircle2, Calendar, UserCheck, XCircle, BarChart3, Building2, ChevronDown } from 'lucide-react';

export default function FunilTab({ data, studentFilter, realData, globalStudentFilter, funnelJobFilter, setFunnelJobFilter, funnelDropdownOpen, setFunnelDropdownOpen, setDrilldown }) {
  // Aplicar filtro global por aluno se ativo
  const students = globalStudentFilter 
    ? (studentFilter.activity || []).filter(s => s.user_id === globalStudentFilter.user_id)
    : (studentFilter.activity || []);
  const allApplications = globalStudentFilter
    ? (realData.applications || []).filter(app => app.user_id === globalStudentFilter.user_id)
    : (realData.applications || []);
  const allInterviews = globalStudentFilter
    ? (realData.interviews || []).filter(i => i.user_id === globalStudentFilter.user_id)
    : (realData.interviews || []);
  const allHired = globalStudentFilter
    ? (realData.hired || []).filter(h => h.user_id === globalStudentFilter.user_id)
    : (realData.hired || []);
  
  const getJobKey = (item) => item.job_id || (item.source === 'external' && item.job_title ? `ext:${item.job_title}` : null);

  const jobsMap = new Map();
  allApplications.forEach(app => {
    const key = getJobKey(app);
    if (key && !jobsMap.has(key)) {
      jobsMap.set(key, {
        job_id: key,
        job_title: app.job_title || 'Vaga sem título',
        company_name: app.company_name || 'Empresa',
        company_avatar: app.company_avatar || null
      });
    }
  });
  allHired.forEach(h => {
    const key = getJobKey(h);
    if (key && !jobsMap.has(key)) {
      jobsMap.set(key, {
        job_id: key,
        job_title: h.job_title || 'Vaga sem título',
        company_name: h.company_name || 'Empresa',
        company_avatar: null
      });
    }
  });
  const availableJobs = Array.from(jobsMap.values());

  const matchesJobFilter = (item) => funnelJobFilter === 'all' || getJobKey(item) === funnelJobFilter;
  const applications = allApplications.filter(matchesJobFilter);
  const interviews = allInterviews.filter(matchesJobFilter);
  const hired = allHired.filter(matchesJobFilter);
  
  const funnelData = {
    semCurriculo: [],
    comCurriculo: [],
    comCandidatura: [],
    preAprovados: [],
    emEntrevista: [],
    contratados: [],
    reprovados: []
  };

  const hiredIds = new Set(hired.map(h => h.user_id));
  const rejectedIds = new Set();
  const interviewIds = new Set(interviews.filter(i => 
    !i.interview_canceled_by_company && !i.interview_rejected_by_candidate
  ).map(i => i.user_id));
  const preApprovedIds = new Set();
  const applicantIds = new Set();

  applications.forEach(app => {
    if (app.user_id) {
      applicantIds.add(app.user_id);
      if (app.rejected_by_company || app.rejected_by_candidate || app.status === 'rejected') {
        rejectedIds.add(app.user_id);
      }
      if (app.pre_approved || app.status === 'approved') {
        preApprovedIds.add(app.user_id);
      }
    }
  });

  const studentsToProcess = funnelJobFilter === 'all' 
    ? students 
    : students.filter(s => applicantIds.has(s.user_id) || hiredIds.has(s.user_id));

  studentsToProcess.forEach(student => {
    const uid = student.user_id;
    const studentInfo = {
      ...student,
      initials: (student.name || '').split(' ').filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase()).join('') || '?'
    };

    if (hiredIds.has(uid)) {
      funnelData.contratados.push(studentInfo);
    } else if (rejectedIds.has(uid) && !interviewIds.has(uid) && !preApprovedIds.has(uid)) {
      funnelData.reprovados.push(studentInfo);
    } else if (interviewIds.has(uid)) {
      funnelData.emEntrevista.push(studentInfo);
    } else if (preApprovedIds.has(uid)) {
      funnelData.preAprovados.push(studentInfo);
    } else if (applicantIds.has(uid)) {
      funnelData.comCandidatura.push(studentInfo);
    } else if (student.has_resume) {
      funnelData.comCurriculo.push(studentInfo);
    } else {
      funnelData.semCurriculo.push(studentInfo);
    }
  });

  const studentsNotInJob = funnelJobFilter !== 'all' 
    ? students.filter(s => !applicantIds.has(s.user_id) && s.has_resume).map(s => ({
        ...s,
        initials: (s.name || '').split(' ').filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase()).join('') || '?'
      }))
    : [];

  if (funnelJobFilter !== 'all') {
    students.filter(s => !s.has_resume && !applicantIds.has(s.user_id)).forEach(s => {
      funnelData.semCurriculo.push({
        ...s,
        initials: (s.name || '').split(' ').filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase()).join('') || '?'
      });
    });
  }

  const getAvatar = (s) => s?.profileImage || s?.profile_image || null;

  const AvatarGroup = ({ students: studs, maxShow = 5, size = 'md', title = 'Alunos', color = 'blue', onClick }) => {
    const sizeClasses = size === 'sm' ? 'w-9 h-9 text-xs' : size === 'lg' ? 'w-14 h-14 text-sm' : 'w-11 h-11 text-sm';
    const shown = studs.slice(0, maxShow);
    const remaining = studs.length - maxShow;
    
    if (studs.length === 0) return null;

    const handleClick = () => {
      if (onClick) {
        onClick();
      } else {
        setDrilldown({
          open: true,
          title: title,
          color: color,
          rows: studs.map(s => ({
            name: s.name,
            email: s.email,
            profileImage: getAvatar(s),
            extra: s.class_name || ''
          })),
          type: 'list'
        });
      }
    };
    
    return (
      <div 
        className="flex items-center -space-x-2 cursor-pointer hover:scale-105 transition-transform" 
        onClick={handleClick}
        title={`Clique para ver todos os ${studs.length} alunos`}
      >
        {shown.map((s, i) => {
          const avatar = getAvatar(s);
          return (
            <div
              key={s.user_id || i}
              className={`${sizeClasses} rounded-full border-2 border-white shadow-sm overflow-hidden bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center`}
              title={s.name}
            >
              {avatar ? (
                <img src={avatar} alt={s.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-white font-bold">{s.initials}</span>
              )}
            </div>
          );
        })}
        {remaining > 0 && (
          <div className={`${sizeClasses} rounded-full border-2 border-white shadow-sm bg-gray-700 flex items-center justify-center text-white font-bold hover:bg-gray-600`}>
            +{remaining}
          </div>
        )}
      </div>
    );
  };

  const totalStudents = students.length;
  const withResume = totalStudents - funnelData.semCurriculo.length;
  const withApp = funnelData.comCandidatura.length + funnelData.preAprovados.length + funnelData.emEntrevista.length + funnelData.contratados.length + funnelData.reprovados.length;
  const preApproved = funnelData.preAprovados.length + funnelData.emEntrevista.length + funnelData.contratados.length;
  const inInterview = funnelData.emEntrevista.length + funnelData.contratados.length;
  const hiredCount = funnelData.contratados.length;

  // Jobs with counts for dropdown
  const jobsWithCounts = availableJobs.map(job => {
    const count = allApplications.filter(app => getJobKey(app) === job.job_id).length + allHired.filter(h => getJobKey(h) === job.job_id && !allApplications.some(a => a.user_id === h.user_id && getJobKey(a) === job.job_id)).length;
    return { ...job, candidateCount: count };
  })
  .filter(job => job.candidateCount > 0)
  .sort((a, b) => b.candidateCount - a.candidateCount);

  const selectedJob = funnelJobFilter === 'all' 
    ? null 
    : jobsWithCounts.find(j => j.job_id == funnelJobFilter);

  return (
    <div className="p-8 rounded-3xl bg-blue-700 shadow-2xl relative overflow-hidden">
      <div className="relative flex items-center justify-between mb-8">
        <div>
          <h3 className="font-bold text-white text-2xl">Funil de Conversão</h3>
          <p className="text-blue-100 text-sm mt-1">Jornada dos alunos desde o currículo até a contratação</p>
        </div>
      </div>

      <div className="mb-8 p-6 rounded-2xl bg-white/95 backdrop-blur-md border border-white/40 shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-bold text-gray-900 text-lg">Funil de Conversão</h3>
            <p className="text-gray-500 text-xs mt-0.5">
              {funnelJobFilter === 'all' 
                ? 'Jornada dos alunos desde o currículo até a contratação'
                : `Filtrado por: ${availableJobs.find(j => j.job_id === funnelJobFilter)?.job_title || 'Vaga'}`
              }
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Seletor de Vaga */}
            <div className="relative">
              <button
                onClick={() => setFunnelDropdownOpen(!funnelDropdownOpen)}
                className={`group flex items-center justify-between gap-4 bg-white/80 backdrop-blur-sm border-2 rounded-2xl px-5 py-3 text-sm cursor-pointer transition-all duration-300 min-w-[360px] ${
                  funnelDropdownOpen 
                    ? 'border-indigo-500 shadow-lg shadow-indigo-500/20 ring-4 ring-indigo-500/10' 
                    : 'border-gray-200 hover:border-indigo-300 hover:shadow-md'
                }`}
              >
                <div className="flex items-center gap-3">
                  {selectedJob?.company_avatar ? (
                    <img 
                      src={selectedJob.company_avatar} 
                      alt={selectedJob.company_name}
                      className="w-9 h-9 rounded-xl object-cover border border-gray-200"
                    />
                  ) : (
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                      funnelDropdownOpen ? 'bg-indigo-500 text-white' : 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100'
                    }`}>
                      <BarChart3 className="w-4 h-4" />
                    </div>
                  )}
                  <div className="text-left">
                    <div className="text-xs text-gray-400 font-medium uppercase tracking-wide">Filtrar por</div>
                    <div className="font-semibold text-gray-800 truncate max-w-[180px]">
                      {selectedJob ? selectedJob.job_title : 'Todas as vagas'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-2xl font-bold text-indigo-600">
                      {selectedJob ? selectedJob.candidateCount : allApplications.length}
                    </div>
                  </div>
                  <div className={`w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center transition-all duration-300 ${funnelDropdownOpen ? 'rotate-180 bg-indigo-100' : ''}`}>
                    <ChevronDown className="w-4 h-4 text-gray-600" />
                  </div>
                </div>
              </button>
              
              {/* Dropdown Menu */}
              {funnelDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setFunnelDropdownOpen(false)} />
                  <div className="absolute top-full left-0 mt-2 w-full bg-white/95 backdrop-blur-xl border border-gray-200/80 rounded-2xl shadow-2xl shadow-gray-900/10 z-20 max-h-[320px] overflow-hidden">
                    <div className="px-4 py-3 bg-gray-50/80 border-b border-gray-100">
                      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Selecione uma vaga</div>
                    </div>
                    
                    <div className="overflow-y-auto max-h-[260px]">
                      <button
                        onClick={() => { setFunnelJobFilter('all'); setFunnelDropdownOpen(false); }}
                        className={`w-full px-4 py-3.5 text-left transition-all duration-200 flex items-center gap-3 border-b border-gray-100/80 ${
                          funnelJobFilter === 'all' ? 'bg-indigo-50/80' : 'hover:bg-gray-50/80'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          funnelJobFilter === 'all' ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-500'
                        }`}>
                          <BarChart3 className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900">Todas as vagas</div>
                          <div className="text-xs text-gray-500">Visão geral do funil</div>
                        </div>
                        <div className={`px-3 py-1.5 rounded-xl text-sm font-bold ${
                          funnelJobFilter === 'all' ? 'bg-indigo-500 text-white' : 'bg-indigo-100 text-indigo-600'
                        }`}>
                          {allApplications.length}
                        </div>
                      </button>
                      
                      {jobsWithCounts.map((job, idx) => (
                        <button
                          key={job.job_id}
                          onClick={() => { setFunnelJobFilter(job.job_id); setFunnelDropdownOpen(false); }}
                          className={`w-full px-4 py-3.5 text-left transition-all duration-200 flex items-center gap-3 ${
                            idx !== jobsWithCounts.length - 1 ? 'border-b border-gray-100/60' : ''
                          } ${funnelJobFilter == job.job_id ? 'bg-indigo-50/80' : 'hover:bg-gray-50/80'}`}
                        >
                          {job.company_avatar ? (
                            <img 
                              src={job.company_avatar} 
                              alt={job.company_name}
                              className={`w-10 h-10 rounded-xl object-cover flex-shrink-0 ${
                                funnelJobFilter == job.job_id ? 'ring-2 ring-indigo-500 ring-offset-2' : 'border border-gray-200'
                              }`}
                            />
                          ) : (
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                              funnelJobFilter == job.job_id ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-500'
                            }`}>
                              <Building2 className="w-5 h-5" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-gray-900 truncate">{job.job_title}</div>
                            <div className="text-xs text-gray-500 truncate">{job.company_name}</div>
                          </div>
                          <div className={`px-3 py-1.5 rounded-xl text-sm font-bold flex-shrink-0 ${
                            funnelJobFilter == job.job_id 
                              ? 'bg-indigo-500 text-white'
                              : job.candidateCount >= 3 
                                ? 'bg-emerald-100 text-emerald-600' 
                                : job.candidateCount >= 2 
                                  ? 'bg-amber-100 text-amber-600' 
                                  : 'bg-gray-100 text-gray-600'
                          }`}>
                            {job.candidateCount}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-6">
          {/* Funil Principal */}
          <div className="flex-1">
            <div className="relative flex flex-col items-center">
              {/* Etapa 1 */}
              <div className="w-full max-w-[100%] mb-2">
                {funnelJobFilter === 'all' ? (
                  <div className="relative bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-4 shadow-lg hover:shadow-xl transition-shadow">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                          <FileText className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <div className="text-white font-bold text-sm">Currículo</div>
                          <div className="text-blue-100 text-xs">Apenas com currículo (sem candidatura)</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <AvatarGroup students={funnelData.comCurriculo} maxShow={4} title="Alunos com currículo" color="blue" />
                        <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                          <span className="text-white font-bold text-xl">{funnelData.comCurriculo.length}</span>
                        </div>
                      </div>
                    </div>
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-blue-600"></div>
                  </div>
                ) : (
                  <div className="relative bg-gradient-to-r from-slate-400 to-slate-500 rounded-xl p-4 shadow-lg hover:shadow-xl transition-shadow">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                          <UserX className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <div className="text-white font-bold text-sm">Não candidataram</div>
                          <div className="text-slate-100 text-xs">Não se candidataram a esta vaga</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <AvatarGroup students={studentsNotInJob} maxShow={4} title="Alunos que não se candidataram" color="slate" />
                        <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                          <span className="text-white font-bold text-xl">{studentsNotInJob.length}</span>
                        </div>
                      </div>
                    </div>
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-slate-500"></div>
                  </div>
                )}
              </div>

              {/* Etapa 2 - Candidatura */}
              <div className="w-[92%] mb-2">
                <div className="relative bg-gradient-to-r from-amber-400 to-yellow-500 rounded-xl p-4 shadow-lg hover:shadow-xl transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                        <Send className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <div className="text-white font-bold text-sm">Candidatura</div>
                        <div className="text-amber-100 text-xs">Em análise (aguardando retorno)</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <AvatarGroup students={funnelData.comCandidatura} maxShow={4} title="Alunos com candidatura" color="amber" />
                      <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                        <span className="text-white font-bold text-xl">{funnelData.comCandidatura.length}</span>
                      </div>
                    </div>
                  </div>
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-yellow-500"></div>
                </div>
              </div>

              {/* Etapa 3 - Pré-aprovados */}
              <div className="w-[84%] mb-2">
                <div className="relative bg-gradient-to-r from-cyan-500 to-teal-500 rounded-xl p-4 shadow-lg hover:shadow-xl transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <div className="text-white font-bold text-sm">Pré-aprovados</div>
                        <div className="text-cyan-100 text-xs">Aguardando entrevista</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <AvatarGroup students={funnelData.preAprovados} maxShow={4} title="Alunos pré-aprovados" color="cyan" />
                      <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                        <span className="text-white font-bold text-xl">{funnelData.preAprovados.length}</span>
                      </div>
                    </div>
                  </div>
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-teal-500"></div>
                </div>
              </div>

              {/* Etapa 4 - Entrevista */}
              <div className="w-[76%] mb-2">
                <div className="relative bg-gradient-to-r from-violet-500 to-purple-500 rounded-xl p-4 shadow-lg hover:shadow-xl transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <div className="text-white font-bold text-sm">Entrevista</div>
                        <div className="text-violet-100 text-xs">Em processo de entrevista</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <AvatarGroup students={funnelData.emEntrevista} maxShow={4} title="Alunos em entrevista" color="violet" />
                      <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                        <span className="text-white font-bold text-xl">{funnelData.emEntrevista.length}</span>
                      </div>
                    </div>
                  </div>
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-purple-500"></div>
                </div>
              </div>

              {/* Etapa 5 - Resultado Final */}
              <div className="w-[68%]">
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-gradient-to-r from-emerald-500 to-green-500 rounded-xl p-3 shadow-lg hover:shadow-xl transition-shadow">
                    <div className="flex flex-col items-center text-center">
                      <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center mb-2">
                        <UserCheck className="w-5 h-5 text-white" />
                      </div>
                      <div className="text-white font-bold text-sm">Contratados</div>
                      <div className="text-emerald-100 text-[10px] mb-2">Aprovação final</div>
                      <AvatarGroup students={funnelData.contratados} maxShow={3} size="sm" title="Alunos contratados" color="emerald" />
                      <div className="mt-2 w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                        <span className="text-white font-bold text-lg">{funnelData.contratados.length}</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-r from-red-400 to-rose-500 rounded-xl p-3 shadow-lg hover:shadow-xl transition-shadow">
                    <div className="flex flex-col items-center text-center">
                      <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center mb-2">
                        <XCircle className="w-5 h-5 text-white" />
                      </div>
                      <div className="text-white font-bold text-sm">Reprovados</div>
                      <div className="text-red-100 text-[10px] mb-2">Não avançaram</div>
                      <AvatarGroup students={funnelData.reprovados} maxShow={3} size="sm" title="Alunos reprovados" color="red" />
                      <div className="mt-2 w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                        <span className="text-white font-bold text-lg">{funnelData.reprovados.length}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Alunos sem currículo */}
          <div className="w-48 flex-shrink-0">
            <div className="h-full bg-transparent rounded-2xl p-4 border-2 border-dashed border-gray-300">
              <div className="flex items-center gap-2 mb-3">
                <UserX className="w-4 h-4 text-gray-500" />
                <span className="font-bold text-gray-700 text-sm">Sem currículo</span>
              </div>
              <div className="text-3xl font-bold text-gray-600 mb-3">{funnelData.semCurriculo.length}</div>
              <p className="text-[10px] text-gray-500 mb-3">Alunos que ainda não criaram currículo</p>
              
              {funnelData.semCurriculo.length > 0 && (
                <div 
                  className="space-y-2 max-h-48 overflow-y-auto cursor-pointer"
                  onClick={() => setDrilldown({
                    open: true,
                    title: 'Alunos sem currículo',
                    rows: funnelData.semCurriculo.map(s => ({
                      name: s.name,
                      email: s.email,
                      profileImage: getAvatar(s),
                      extra: s.class_name || ''
                    })),
                    type: 'list'
                  })}
                >
                  {funnelData.semCurriculo.slice(0, 6).map((s, i) => {
                    const avatar = getAvatar(s);
                    return (
                      <div key={s.user_id || i} className="flex items-center gap-2.5 p-2 bg-white/60 backdrop-blur-sm rounded-xl hover:bg-white/80 transition-colors">
                        <div className="w-9 h-9 rounded-full overflow-hidden bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center flex-shrink-0">
                          {avatar ? (
                            <img src={avatar} alt={s.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-white text-xs font-bold">{s.initials}</span>
                          )}
                        </div>
                        <span className="text-xs text-gray-700 truncate flex-1 font-medium">{s.name?.split(' ')[0]}</span>
                      </div>
                    );
                  })}
                  {funnelData.semCurriculo.length > 6 && (
                    <div className="text-center text-xs text-indigo-600 pt-1 font-medium hover:text-indigo-800">
                      Ver todos +{funnelData.semCurriculo.length - 6} alunos
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Taxas de Conversão */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between text-xs flex-wrap gap-2">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="text-gray-500">Taxa de conversão:</span>
              {funnelJobFilter === 'all' ? (
                <>
                  <span className="font-semibold text-blue-600">
                    Currículo → Candidatura: {withResume > 0 ? Math.round((withApp / withResume) * 100) : 0}%
                  </span>
                  <span className="font-semibold text-emerald-600">
                    Candidatura → Contratado: {withApp > 0 ? Math.round((hiredCount / withApp) * 100) : 0}%
                  </span>
                </>
              ) : (
                <>
                  <span className="font-semibold text-violet-600">
                    Candidatura → Pré-aprovado: {withApp > 0 ? Math.round((preApproved / withApp) * 100) : 0}%
                  </span>
                  <span className="font-semibold text-amber-600">
                    Pré-aprovado → Entrevista: {preApproved > 0 ? Math.round((inInterview / preApproved) * 100) : 0}%
                  </span>
                  <span className="font-semibold text-emerald-600">
                    Entrevista → Contratado: {inInterview > 0 ? Math.round((hiredCount / inInterview) * 100) : 0}%
                  </span>
                </>
              )}
            </div>
            <span className="text-gray-400 text-[10px]">
              {funnelJobFilter === 'all' 
                ? `Total de alunos: ${totalStudents}` 
                : `Candidatos nesta vaga: ${studentsToProcess.length} de ${students.length}`
              }
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
