import React, { useEffect, useState } from 'react';
import { companySchoolApi } from '@/lib/companySchoolApi';
import { useAuth } from '@/contexts/AuthContext';
import { School, Search, Users, ArrowRight, Loader2 } from 'lucide-react';
import AdaptiveSchoolImage from '@/components/AdaptiveSchoolImage';

const CompanySchools = () => {
  const { user } = useAuth();
  const [schools,setSchools]=useState([]);
  const [filtered,setFiltered]=useState([]);
  const [q,setQ]=useState('');
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState(null);

  useEffect(()=>{
    const load=async()=>{
      try{ setLoading(true); const data= await companySchoolApi.listSchools(); setSchools(data.schools||[]); setFiltered(data.schools||[]);}catch(e){ setError(e.message);} finally{ setLoading(false);} };
    if(user?.type==='company') load();
  },[user]);

  useEffect(()=>{
    if(!q) return setFiltered(schools);
    setFiltered(schools.filter(s=> (s.school_name||'').toLowerCase().includes(q.toLowerCase()) || (s.school_city||'').toLowerCase().includes(q.toLowerCase())));
  },[q,schools]);

  if(!user || user.type!=='company') return <div className='max-w-6xl mx-auto p-6'>Acesso restrito às empresas.</div>;

  return (
    <div className='min-h-screen bg-gray-50'>
      <div className='max-w-7xl mx-auto px-4 py-6 space-y-6'>
        <div className='text-center mb-4'>
          <h1 className='text-[1.85rem] md:text-[2.25rem] font-bold text-gray-900 mb-1 tracking-tight leading-tight'>Escolas <span className='text-blue-600'>Parceiras</span></h1>
          <p className='text-[15px] text-gray-600 max-w-2xl mx-auto leading-relaxed'>Explore escolas e visualize seus alunos</p>
        </div>

        <div className='flex justify-center mb-6'>
          <div className='relative w-full max-w-md'>
            <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400'/>
            <input 
              value={q} 
              onChange={e=>setQ(e.target.value)} 
              placeholder='Buscar por nome ou cidade' 
              className='w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-xl outline-none focus:border-blue-500 transition-colors duration-300 text-sm bg-white shadow-sm'
            />
          </div>
        </div>

        {loading && (
          <div className='flex items-center justify-center gap-2 text-gray-500 py-8'>
            <Loader2 className='w-5 h-5 animate-spin'/>
            <span className='text-sm'>Carregando...</span>
          </div>
        )}

        {error && (
          <div className='max-w-2xl mx-auto'>
            <div className={`rounded-2xl border-2 p-6 text-sm shadow-md ${error.toLowerCase().includes('premium') ? 'bg-gradient-to-br from-amber-50 to-orange-50 border-orange-300 text-orange-800' : 'bg-red-50 border-red-300 text-red-700'}`}>
              {error.toLowerCase().includes('premium') ? (
                <div className='space-y-3'>
                  <p className='font-semibold text-base'>Recurso exclusivo do Plano Premium</p>
                  <p className='leading-relaxed'>Para pesquisar escolas e visualizar os alunos ativos você precisa de um plano <strong>Premium</strong> ativo.</p>
                  <div>
                    <a href='/subscription-plans' className='inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold shadow-sm hover:shadow-md transition-all duration-300'>Atualizar meu Plano</a>
                  </div>
                  <p className='text-xs text-orange-700/80'>Após a atualização o acesso é liberado imediatamente.</p>
                </div>
              ) : error}
            </div>
          </div>
        )}

        {!loading && !error && filtered.length===0 && (
          <div className='text-sm text-gray-500 bg-white/80 backdrop-blur-sm border-0 rounded-2xl p-8 text-center shadow-md'>Nenhuma escola encontrada.</div>
        )}

        <div className='grid md:grid-cols-2 lg:grid-cols-3 gap-6'>
          {filtered.map(s => (
            <div key={s.id} className='group relative bg-white/95 backdrop-blur-sm border-2 border-slate-200 rounded-[22px] p-6 shadow-[0_14px_30px_rgba(15,23,42,0.04)] hover:shadow-[0_18px_40px_rgba(15,23,42,0.10)] hover:-translate-y-[2px] transition-all duration-300 flex flex-col'>
              <div className='flex items-start justify-between gap-4 mb-4'>
                <div className='flex-shrink-0'>
                  <AdaptiveSchoolImage 
                    src={s.profile_image} 
                    alt={s.school_name}
                    size='md'
                    fallbackIcon={School}
                  />
                </div>
                <span className='inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold ring-1 bg-emerald-50 text-emerald-700 ring-emerald-100'>
                  <Users className='h-3.5 w-3.5'/>
                  <span>Alunos: {s.active_students}</span>
                </span>
              </div>

              <h2 className='font-semibold text-gray-900 text-base leading-snug line-clamp-2 mb-2'>{s.school_name}</h2>
              
              <div className='text-sm text-gray-600 mb-1'>
                {s.school_city}{s.school_state && <span> - {s.school_state}</span>}
              </div>

              {s.school_type && (
                <div className='text-xs uppercase tracking-wide text-blue-600 font-medium mb-4'>
                  {s.school_type}
                </div>
              )}

              <div className='mt-auto pt-4 border-t border-gray-100'>
                <button 
                  onClick={()=> window.location.href = `/company/schools/${s.id}`} 
                  className='inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-semibold transition-all duration-300 group-hover:gap-3 hover:underline underline-offset-4'
                >
                  Ver Detalhes <ArrowRight className='w-4 h-4 transition-all duration-300'/>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CompanySchools;
