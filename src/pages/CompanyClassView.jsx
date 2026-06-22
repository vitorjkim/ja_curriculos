import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { companySchoolApi } from '@/lib/companySchoolApi';
import { Users, Loader2, ArrowLeft, Building2, Calendar, Star } from 'lucide-react';

const CompanyClassView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data,setData] = useState(null);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState(null);

  useEffect(()=>{
    const load = async () => {
      try{
        setLoading(true);
        const res = await companySchoolApi.getClass(id);
        setData(res);
      } catch(e){
        setError(e.message || 'Falha ao carregar turma');
      } finally{
        setLoading(false);
      }
    };
    if(user?.type==='company') load();
  },[id,user]);

  if(!user || user.type!=='company'){
    return <div className="max-w-5xl mx-auto p-6">Acesso restrito às empresas.</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50/80 py-10 px-4">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header da Turma */}
        <div className="flex flex-col items-start justify-between gap-6 rounded-[24px] border-2 border-slate-200 bg-white/90 px-8 py-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)] backdrop-blur-sm md:flex-row md:items-center">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Turma</p>
            <h1 className="mb-1 text-3xl font-bold tracking-tight text-[#2563eb] md:text-4xl">{data?.class?.name || 'Carregando...'}</h1>
            {data?.class && (
              <p className="text-sm text-slate-500">
                {data.class.school_name} {data.class.year ? `• ${data.class.year}` : ''} {data.class.shift ? `• ${data.class.shift}` : ''}
              </p>
            )}
          </div>
          <button 
            onClick={()=> navigate(-1)} 
            className="rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-blue-50 hover:border-blue-400 hover:text-blue-600 hover:shadow-md transition-all duration-200 inline-flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4"/> Voltar
          </button>
        </div>

        {loading && (
          <div className="text-slate-500 text-sm flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin"/> Carregando...</div>
        )}
        {error && (
          <div className="text-sm text-red-600">
            {error.includes('Premium') ? (
              <div className='rounded-[16px] border-2 border-orange-200 bg-orange-50 text-orange-800 p-4 text-sm'>
                Este recurso está disponível apenas para empresas com plano <strong>Premium</strong> ativo. <a href='/subscription-plans' className='underline text-orange-700 hover:text-orange-800 font-medium'>Atualize seu plano</a> para acessar os alunos desta turma.
              </div>
            ) : error}
          </div>
        )}

        {data && (
          <div className="rounded-[22px] border-2 border-slate-200 bg-white/90 p-6 shadow-[0_14px_35px_rgba(15,23,42,0.06)]">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 ring-2 ring-emerald-200">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Alunos da turma</p>
                  <p className="text-xl font-semibold text-slate-900">{data.stats?.total || data.students?.length || 0}</p>
                </div>
              </div>
            </div>
            {data.students && data.students.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {data.students.map((s) => {
                  const initials = (s.name||'')
                    .split(' ')
                  .filter(Boolean)
                  .slice(0,2)
                  .map(p=>p[0]?.toUpperCase())
                  .join('') || '?';
                
                const avatar = s.profile_image || s.profileImage || null;
                const schoolAvatar = data.class?.school_profile_image || null;
                
                // Status do aluno
                const studentStatus = s.status || 'active';
                const statusConfig = {
                  active: { label: 'Ativo', bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
                  inactive: { label: 'Inativo', bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' },
                  graduated: { label: 'Formado', bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' }
                };
                const currentStatus = statusConfig[studentStatus] || statusConfig.active;
                
                // Dados extras
                const birthDate = s.birth_date ? new Date(s.birth_date).toLocaleDateString('pt-BR') : null;
                const semester = s.semester || null;
                const shift = s.student_shift || s.shift || data.class?.shift || null;
                const shiftLabel = { morning: 'Manhã', afternoon: 'Tarde', night: 'Noite', 'Manhã': 'Manhã', 'Tarde': 'Tarde', 'Noite': 'Noite' };
                
                const isFeatured = s.is_featured;
                
                return (
                  <div
                    key={s.user_id}
                    className={`group rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 ${isFeatured ? 'bg-white border-2 border-amber-400' : 'bg-white border border-gray-200'}`}
                  >
                    {/* Header com foto */}
                    <div className="relative pt-6 pb-2 flex justify-center">
                      {/* Badge de destaque */}
                      {isFeatured && (
                        <div className="absolute top-2 right-2 bg-amber-100 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                          <Star className="w-3 h-3 text-amber-500" />
                          <span className="text-[9px] font-bold text-amber-700">Destaque</span>
                        </div>
                      )}
                      
                      {/* Foto do aluno centralizada */}
                      <div className="relative">
                        <div className={`w-20 h-20 rounded-full overflow-hidden border-4 ${isFeatured ? 'border-amber-300' : 'border-gray-200'} shadow-lg bg-white`}>
                          {avatar ? (
                            <img src={avatar} alt={s.name||'Aluno'} className="w-full h-full object-cover" />
                          ) : (
                            <div className={`w-full h-full flex items-center justify-center text-white text-xl font-bold ${isFeatured ? 'bg-gradient-to-br from-amber-400 to-amber-500' : 'bg-gradient-to-br from-slate-400 to-slate-600'}`}>{initials}</div>
                          )}
                        </div>
                        {/* Mini badge da escola */}
                        <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full border-2 border-white shadow-md bg-white overflow-hidden" title={data.class?.school_name || 'Escola'}>
                          {schoolAvatar ? (
                            <img src={schoolAvatar} alt="Escola" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-blue-600">
                              <Building2 className="w-3 h-3 text-white" />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Conteúdo do card */}
                    <div className="pb-4 px-4">
                      {/* Nome */}
                      <div className="text-center mb-3">
                        <h4 className="font-bold text-gray-900 text-sm truncate">{s.name}</h4>
                        {s.email && <p className="text-[10px] text-gray-400 truncate">{s.email}</p>}
                      </div>
                      
                      {/* Info badges */}
                      <div className="flex flex-wrap items-center justify-center gap-1.5 mb-3">
                        {/* Status */}
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${currentStatus.bg} ${currentStatus.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${currentStatus.dot}`} />
                          {currentStatus.label}
                        </span>
                        {/* Turma */}
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-violet-100 text-violet-700">
                          <Users className="w-3 h-3" />
                          {data.class?.name || 'Turma'}
                        </span>
                      </div>
                      
                      {/* Informações extras */}
                      <div className="flex flex-wrap items-center justify-center gap-1.5 mb-4 min-h-[20px]">
                        {birthDate && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600">
                            <Calendar className="w-3 h-3" />
                            {birthDate}
                          </span>
                        )}
                        {semester && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-cyan-100 text-cyan-700">
                            {semester}º Sem
                          </span>
                        )}
                        {shift && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-orange-100 text-orange-700">
                            {shiftLabel[shift] || shift}
                          </span>
                        )}
                      </div>
                      
                      {/* Botão Ver Perfil */}
                      <button
                        onClick={() => (window.location.href = `/alunos/${s.user_id}`)}
                        className={`w-full text-xs px-4 py-2.5 rounded-xl border-2 font-semibold transition-all duration-300 shadow-sm hover:shadow-lg hover:-translate-y-[2px] active:translate-y-0 active:shadow-sm ${isFeatured ? 'border-amber-500 bg-white hover:bg-amber-500 text-amber-600 hover:text-white' : 'border-blue-500 bg-white hover:bg-blue-500 hover:text-white text-blue-600'}`}
                      >
                        Ver Perfil
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-sm text-slate-500 text-center py-8">Nenhum aluno nesta turma.</div>
          )}
        </div>
      )}
      </div>
    </div>
  );
};

export default CompanyClassView;
