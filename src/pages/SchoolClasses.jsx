import React, { useEffect, useState } from 'react';
import { schoolApi } from '@/lib/schoolApi';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Loader2, Users, Edit2, Trash2, RefreshCcw, BarChart3, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const SchoolClasses = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [classes,setClasses]=useState([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState(null);
  const [creating,setCreating]=useState(false);
  const [editing,setEditing]=useState(null);
  const [showCreate,setShowCreate]=useState(false);
  const [form,setForm]=useState({ name:'', description:'', year:'', shift:'', job_area:'', job_subarea:'', job_location:'', job_work_type:'', job_contract_type:'', job_experience_level:'' });
  const [students,setStudents]=useState([]);
  const [loadingStudents,setLoadingStudents]=useState(false);
  const [featuredStudents, setFeaturedStudents] = useState([]);
  const [loadingFeatured, setLoadingFeatured] = useState(false);
  // Taxonomia para selects de área/subárea
  const [taxonomy,setTaxonomy] = useState({});
  const [areaOptions,setAreaOptions] = useState([]);
  const [subareaOptions,setSubareaOptions] = useState([]);

  const AREA_LABELS = {
    saude: 'Saúde', educacao: 'Educação', engenharia: 'Engenharia', administracao: 'Administração',
    vendas_marketing: 'Vendas / Marketing', recursos_humanos: 'Recursos Humanos', financas: 'Finanças',
    design: 'Design', logistica: 'Logística', producao: 'Produção', mecanica: 'Mecânica', automacao: 'Automação',
    outros: 'Outros', tecnologia: 'Tecnologia', administrativo: 'Administrativo', financeiro: 'Financeiro',
    marketing: 'Marketing', vendas: 'Vendas', operacional: 'Operacional'
  };
  const humanize = (str='') => str.replace(/_/g,' ').toLowerCase().replace(/\b\w/g,c=>c.toUpperCase());

  const load = async () => {
    try { 
      setLoading(true); 
      const cls = await schoolApi.listClasses(); 
      setClasses(cls);
    } catch(e){ 
      setError(e.message);
    } finally{ 
      setLoading(false);
    } 
  };

  const loadFeaturedStudents = async () => {
    try {
      setLoadingFeatured(true);
      const allStudents = await schoolApi.listStudents({ limit: 1000 });
      const featured = (allStudents.students || []).filter(s => s.is_featured);
      setFeaturedStudents(featured);
    } catch(e) {
      console.error('Erro ao carregar alunos destacados:', e);
    } finally {
      setLoadingFeatured(false);
    }
  };

  useEffect(()=>{ 
    if(user?.type==='school') {
      load();
      loadFeaturedStudents();
    }
  },[user]);

  // Helper para obter baseURL com validação rigorosa
  const getAPIBaseURL = () => {
    const apiUrl = import.meta.env.VITE_API_URL;
    if (!apiUrl || typeof apiUrl !== 'string' || apiUrl.trim().length === 0) {
      throw new Error('❌ ERRO: VITE_API_URL não configurada');
    }
    const trimmed = apiUrl.trim().replace(/\/$/, '');
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      throw new Error('❌ ERRO: VITE_API_URL deve ser URL absoluta');
    }
    let finalUrl = trimmed;
    if (!finalUrl.endsWith('/api')) finalUrl = `${finalUrl}/api`;
    return finalUrl;
  };

  // Carregar taxonomia de áreas/subáreas
  useEffect(()=>{
    const fetchTaxonomy = async () => {
      try {
        const base = getAPIBaseURL();
        const r = await fetch(base + '/jobs/taxonomy');
        if(r.ok){
          const data = await r.json();
            setTaxonomy(data.taxonomy||{});
            const areas = Object.keys(data.taxonomy||{})
              .map(k=>({ value:k, label: AREA_LABELS[k] || humanize(k) }))
              .sort((a,b)=> a.label.localeCompare(b.label, 'pt-BR', { sensitivity:'base' }));
            setAreaOptions([{ value:'', label:'(sem filtro)' }, ...areas]);
        }
      } catch { /* silencioso */ }
    };
    fetchTaxonomy();
  },[]);

  // Atualizar subáreas quando área mudar
  useEffect(()=>{
    if(form.job_area && taxonomy[form.job_area]){
      let subs = taxonomy[form.job_area].map(s=>({ value:s, label: humanize(s) }));
      // Garantir que subarea existente (mesmo legacy) apareça
      if(form.job_subarea && !subs.find(s=>s.value===form.job_subarea)){
        subs.push({ value: form.job_subarea, label: humanize(form.job_subarea)+' (legacy)' });
      }
      subs = subs.sort((a,b)=> a.label.localeCompare(b.label, 'pt-BR', { sensitivity:'base' }));
      setSubareaOptions([{ value:'', label:'(todas)' }, ...subs]);
    } else {
      setSubareaOptions([{ value:'', label:'(todas)' }]);
    }
  },[form.job_area, form.job_subarea, taxonomy]);

  const submit = async e => { 
    e.preventDefault(); 
    try { 
      setCreating(true); 
      if(editing){ 
        await schoolApi.updateClass(editing.id, form); 
      } else { 
        await schoolApi.createClass(form); 
        setShowCreate(false);
      } 
      setForm({ name:'', description:'', year:'', shift:'', job_area:'', job_subarea:'', job_location:'', job_work_type:'', job_contract_type:'', job_experience_level:'' }); 
      setEditing(null); 
      load(); 
    } catch(e){ 
      setError(e.message);
    } finally{ 
      setCreating(false);
    } 
  };

  const edit = cls => { setEditing(cls); setForm({ name:cls.name, description:cls.description||'', year:cls.year||'', shift:cls.shift||'', job_area:cls.job_area||'', job_subarea:cls.job_subarea||'', job_location:cls.job_location||'', job_work_type:cls.job_work_type||'', job_contract_type:cls.job_contract_type||'', job_experience_level:cls.job_experience_level||'' }); };
  const del = async id => { if(!confirm('Remover esta turma? Alunos ficarão sem turma.')) return; try{ await schoolApi.deleteClass(id); load(); } catch(e){ setError(e.message);} };

  const openStudents = async cls => { try { setLoadingStudents(true); const st = await schoolApi.listClassStudents(cls.id); setStudents(st); setEditing(c=>c?{...c, showStudents:true}: { ...cls, showStudents:true}); } catch(e){ setError(e.message);} finally{ setLoadingStudents(false);} };

  if(!user || user.type!=='school') return <div className='max-w-6xl mx-auto p-6'>Acesso restrito às escolas.</div>;

  return (
    <div className='min-h-screen bg-gray-50'>
      <div className='max-w-7xl mx-auto px-4 py-6 space-y-6'>
      <div className='flex items-center justify-between flex-wrap gap-4'>
        <div>
          <h1 className='text-[1.85rem] md:text-[2.25rem] font-bold text-gray-900 mb-1 tracking-tight leading-tight'>Gestão de <span className="text-blue-600">Turmas</span></h1>
          <p className='text-[15px] text-gray-600 leading-relaxed'>Organize os alunos em turmas</p>
        </div>
        <div className='flex items-center gap-2'>
          <button onClick={()=>{ setForm({ name:'', description:'', year:'', shift:'', job_area:'', job_subarea:'', job_location:'', job_work_type:'', job_contract_type:'', job_experience_level:'' }); setShowCreate(true); }} className='inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-all duration-300 shadow-md hover:shadow-lg'>
            <Plus className='w-4 h-4'/> Criar Turma
          </button>
            <button onClick={()=>{
                // Preencher o formulário com valores aleatórios e abrir modal
                const areas = areaOptions.filter(a=>a.value).map(a=>a.value);
                const randomArea = areas.length ? areas[Math.floor(Math.random()*areas.length)] : '';
                const shifts = ['Manhã','Tarde','Noite'];
                const years = [2023,2024,2025,2026];
                setForm({
                  name: `Turma ${Math.random().toString(36).slice(2,7).toUpperCase()}`,
                  description: `Turma gerada automaticamente em ${(new Date()).toLocaleDateString()}`,
                  year: years[Math.floor(Math.random()*years.length)].toString(),
                  shift: shifts[Math.floor(Math.random()*shifts.length)],
                  job_area: randomArea,
                  job_subarea: '',
                  job_location: 'São Paulo',
                  job_work_type: '',
                  job_contract_type: '',
                  job_experience_level: ''
                });
                setShowCreate(true);
              }} className='inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-gray-300 bg-white text-sm font-semibold hover:bg-gray-50 transition-all duration-300 shadow-sm hover:shadow-md'>
              Preencher aleatório
            </button>
          <button onClick={load} className='inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-gray-300 bg-white hover:bg-gray-50 text-sm font-semibold transition-all duration-300 shadow-sm hover:shadow-md'>
            <RefreshCcw className='w-4 h-4'/> Atualizar
          </button>
        </div>
      </div>
      {error && <div className='text-sm text-red-600'>{error}</div>}
      
      <div className='grid md:grid-cols-3 gap-5'>
        {/* Card Virtual de Alunos Destacados */}
        <div className='bg-white/80 backdrop-blur-sm border-2 border-gray-200 rounded-2xl p-6 shadow-md hover:shadow-lg transition-all duration-300 flex flex-col'>
          <div className='flex items-start justify-between gap-3'>
            <div className='flex items-center gap-3'>
              <div className='w-12 h-12 rounded-xl bg-gradient-to-br from-amber-50 to-amber-100 flex items-center justify-center shadow-md border-2 border-amber-200'>
                <Star className='w-6 h-6 text-amber-500 stroke-[2.5]' fill='none'/>
              </div>
              <h3 className='font-bold text-lg text-gray-900'>Alunos Destacados</h3>
            </div>
          </div>
          <div className='mt-3 text-sm text-gray-600 space-y-1.5 bg-gray-50 rounded-xl p-3 border border-gray-100'>
            <div className='flex items-center gap-2'>
              <span className='font-semibold text-gray-700'>Total:</span> 
              <span className='text-gray-900'>{featuredStudents.length} aluno(s)</span>
            </div>
            <div className='pt-1'>
              <span className='text-gray-700'>Visualização especial dos melhores alunos da escola</span>
            </div>
          </div>
          <p className='mt-3 text-sm text-gray-700 line-clamp-3 bg-amber-50 rounded-xl p-3 border border-amber-100'>
            Agrupa todos os alunos destacados.
          </p>
          <div className='mt-auto pt-5 flex gap-2'>
            <button 
              onClick={() => {
                setEditing({ id: 'featured', name: 'Alunos Destacados', showStudents: true });
                setStudents(featuredStudents);
              }}
              disabled={loadingFeatured || featuredStudents.length === 0}
              className='flex-1 inline-flex items-center justify-center gap-2 text-sm px-4 py-2.5 rounded-xl border-2 border-amber-500 bg-white hover:bg-amber-50 text-amber-700 font-semibold transition-all duration-300 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed'
            >
              <Users className='w-4 h-4'/> Alunos
            </button>
            <button 
              onClick={() => navigate('/school/classes/featured/stats')}
              disabled={loadingFeatured || featuredStudents.length === 0}
              className='flex-1 inline-flex items-center justify-center gap-2 text-sm px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold transition-all duration-300 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed'
            >
              <BarChart3 className='w-4 h-4'/> Estatísticas
            </button>
          </div>
        </div>

        {loading ? <div className='text-gray-500 text-sm'>Carregando turmas...</div> : classes.length===0 ? <div className='text-gray-500 text-sm'>Nenhuma turma criada.</div> : classes.map(cls => (
          <div key={cls.id} className='bg-white/80 backdrop-blur-sm border-2 border-gray-200 rounded-2xl p-6 shadow-md hover:shadow-lg transition-all duration-300 flex flex-col'>
            <div className='flex items-start justify-between gap-3'>
              <h3 className='font-bold text-lg text-gray-900'>{cls.name}</h3>
              <div className='flex items-center gap-2'>
                <button onClick={()=>edit(cls)} title='Editar' className='p-2 rounded-xl border-2 border-blue-200 hover:bg-blue-50 text-blue-600 transition-all duration-300 shadow-sm hover:shadow-md'><Edit2 className='w-4 h-4'/></button>
                <button onClick={()=>del(cls.id)} title='Excluir' className='p-2 rounded-xl border-2 border-red-200 hover:bg-red-50 text-red-600 transition-all duration-300 shadow-sm hover:shadow-md'><Trash2 className='w-4 h-4'/></button>
              </div>
            </div>
            <div className='mt-3 text-sm text-gray-600 space-y-1.5 bg-gray-50 rounded-xl p-3 border border-gray-100'>
              {cls.year && <div className='flex items-center gap-2'><span className='font-semibold text-gray-700'>Ano:</span> <span className='text-gray-900'>{cls.year}</span></div>}
              {cls.shift && <div className='flex items-center gap-2'><span className='font-semibold text-gray-700'>Turno:</span> <span className='text-gray-900'>{cls.shift}</span></div>}
              {(cls.job_area || cls.job_location) && <div className='pt-1'>
                <span className='font-semibold text-gray-700'>Filtro Inicial:</span> <span className='text-gray-900'>{[cls.job_area, cls.job_subarea, cls.job_location].filter(Boolean).join(' • ') || '—'}</span>
              </div>}
            </div>
            {cls.description && <p className='mt-3 text-sm text-gray-700 line-clamp-3 bg-blue-50 rounded-xl p-3 border border-blue-100'>{cls.description}</p>}
            <div className='mt-auto pt-5 flex gap-2'>
              <button onClick={()=>openStudents(cls)} className='flex-1 inline-flex items-center justify-center gap-2 text-sm px-4 py-2.5 rounded-xl border-2 border-blue-500 bg-white hover:bg-blue-50 text-blue-600 font-semibold transition-all duration-300 shadow-sm hover:shadow-md'>
                <Users className='w-4 h-4'/> Alunos
              </button>
              <button onClick={()=> navigate(`/school/classes/${cls.id}/stats`)} className='flex-1 inline-flex items-center justify-center gap-2 text-sm px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-all duration-300 shadow-sm hover:shadow-md'>
                <BarChart3 className='w-4 h-4'/> Estatísticas
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Create Class Modal */}
      {showCreate && (
        <div className='fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4' onClick={()=>setShowCreate(false)}>
          <div className='bg-white w-full max-w-3xl rounded-2xl shadow-2xl p-6 relative border-0' onClick={e=>e.stopPropagation()}>
            <button className='absolute top-4 right-4 text-gray-500 hover:text-gray-700 w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-all duration-300' onClick={()=>setShowCreate(false)}>✕</button>
            <h2 className='font-bold text-xl mb-5 text-gray-900'>Nova Turma</h2>
            <form onSubmit={submit} className='space-y-4'>
              <div className='grid md:grid-cols-4 gap-4'>
                <div className='md:col-span-2'>
                  <label className='text-xs font-medium text-gray-600'>Nome *</label>
                  <input required value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} className='w-full border rounded-md px-3 py-2 text-sm'/>
                </div>
                <div>
                  <label className='text-xs font-medium text-gray-600'>Ano</label>
                  <input value={form.year} onChange={e=>setForm(f=>({...f,year:e.target.value}))} className='w-full border rounded-md px-3 py-2 text-sm'/>
                </div>
                <div>
                  <label className='text-xs font-medium text-gray-600'>Turno</label>
                  <input value={form.shift} onChange={e=>setForm(f=>({...f,shift:e.target.value}))} placeholder='manhã / tarde / noite' className='w-full border rounded-md px-3 py-2 text-sm'/>
                </div>
                <div className='md:col-span-4'>
                  <label className='text-xs font-medium text-gray-600'>Descrição</label>
                  <textarea value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} className='w-full border rounded-md px-3 py-2 text-sm h-20'/>
                </div>
                <div className='md:col-span-4 pt-2 border-t'>
                  <h3 className='text-sm font-semibold text-gray-800 mb-2'>Filtros de Vagas (Sugestão Inicial para os Alunos)</h3>
                  <div className='grid md:grid-cols-3 gap-4'>
                    <div>
                      <label className='text-xs font-medium text-gray-600'>Área</label>
                      <select value={form.job_area} onChange={e=>setForm(f=>({...f,job_area:e.target.value, job_subarea:''}))} className='w-full border rounded-md px-3 py-2 text-sm'>
                        {areaOptions.map(a=> <option key={a.value} value={a.value}>{a.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className='text-xs font-medium text-gray-600'>Subárea (opcional)</label>
                      <select value={form.job_subarea} onChange={e=>setForm(f=>({...f,job_subarea:e.target.value}))} className='w-full border rounded-md px-3 py-2 text-sm' disabled={!form.job_area}>
                        {subareaOptions.map(s=> <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className='text-xs font-medium text-gray-600'>Localização</label>
                      <input value={form.job_location} onChange={e=>setForm(f=>({...f,job_location:e.target.value}))} placeholder='Cidade ou UF' className='w-full border rounded-md px-3 py-2 text-sm'/>
                    </div>
                    <div>
                      <label className='text-xs font-medium text-gray-600'>Modalidade</label>
                      <select value={form.job_work_type} onChange={e=>setForm(f=>({...f,job_work_type:e.target.value}))} className='w-full border rounded-md px-3 py-2 text-sm'>
                        <option value=''>Todas</option>
                        <option value='presencial'>Presencial</option>
                        <option value='hibrido'>Híbrido</option>
                        <option value='remoto'>Remoto</option>
                      </select>
                    </div>
                    
                  </div>
                  <p className='mt-2 text-[11px] text-gray-500'>Esses campos serão usados para pré-filtrar vagas na primeira vez que um aluno desta turma acessar a busca.</p>
                </div>
              </div>
              <div className='flex gap-3 pt-2'>
                <button disabled={creating} className='inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 transition-all duration-300 shadow-md hover:shadow-lg'>
                  {creating && <Loader2 className='w-4 h-4 animate-spin'/>}
                  Criar Turma
                </button>
                <button type='button' onClick={()=>setShowCreate(false)} className='text-sm px-5 py-2.5 rounded-xl border-2 border-gray-300 bg-white hover:bg-gray-50 font-semibold transition-all duration-300 shadow-sm hover:shadow-md'>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Students List Modal */}
      {editing?.showStudents && (
        <div className='fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4' onClick={()=>setEditing(null)}>
          <div className='bg-white w-full max-w-2xl rounded-2xl shadow-2xl p-6 relative border-0' onClick={e=>e.stopPropagation()}>
            <button className='absolute top-4 right-4 text-gray-500 hover:text-gray-700 w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-all duration-300' onClick={()=>setEditing(null)}>✕</button>
            <h3 className='text-xl font-bold mb-5 text-gray-900'>Alunos da Turma: <span className='text-blue-600'>{editing.name}</span></h3>
            {loadingStudents ? <div className='text-gray-500 text-sm'>Carregando...</div> : (
              students.length===0 ? <div className='text-gray-500 text-sm bg-gray-50 rounded-xl p-4 text-center'>Nenhum aluno nesta turma.</div> : (
                <div className='max-h-80 overflow-auto border-0 rounded-2xl shadow-inner bg-gray-50'>
                  <table className='w-full text-sm'>
                    <thead className='bg-gradient-to-r from-blue-500 to-blue-600 text-white sticky top-0'>
                      <tr>
                        <th className='text-left p-3 font-semibold'>Nome</th>
                        <th className='text-left p-3 font-semibold'>Email</th>
                        <th className='text-left p-3 font-semibold'>Status</th>
                      </tr>
                    </thead>
                    <tbody className='bg-white'>
                      {students.map(s => (
                        <tr key={s.user_id} className='border-t'>
                          <td className='p-2 font-medium text-gray-800'>{s.name}</td>
                          <td className='p-2'>{s.email}</td>
                          <td className='p-2 text-xs'>{(s.status||'active')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </div>
        </div>
      )}

      {/* Edit Class Modal */}
      {editing && !editing.showStudents && (
        <div className='fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4' onClick={()=>setEditing(null)}>
          <div className='bg-white w-full max-w-3xl rounded-xl shadow-xl p-6 relative' onClick={e=>e.stopPropagation()}>
            <button className='absolute top-2 right-2 text-gray-500 hover:text-gray-700' onClick={()=>setEditing(null)}>✕</button>
            <h2 className='font-semibold text-lg mb-4'>Editar Turma</h2>
            <form onSubmit={submit} className='space-y-4'>
              <div className='grid md:grid-cols-4 gap-4'>
                <div className='md:col-span-2'>
                  <label className='text-xs font-medium text-gray-600'>Nome *</label>
                  <input required value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} className='w-full border rounded-md px-3 py-2 text-sm'/>
                </div>
                <div>
                  <label className='text-xs font-medium text-gray-600'>Ano</label>
                  <input value={form.year} onChange={e=>setForm(f=>({...f,year:e.target.value}))} className='w-full border rounded-md px-3 py-2 text-sm'/>
                </div>
                <div>
                  <label className='text-xs font-medium text-gray-600'>Turno</label>
                  <input value={form.shift} onChange={e=>setForm(f=>({...f,shift:e.target.value}))} placeholder='manhã / tarde / noite' className='w-full border rounded-md px-3 py-2 text-sm'/>
                </div>
                <div className='md:col-span-4'>
                  <label className='text-xs font-medium text-gray-600'>Descrição</label>
                  <textarea value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} className='w-full border rounded-md px-3 py-2 text-sm h-20'/>
                </div>
                <div className='md:col-span-4 pt-2 border-t'>
                  <h3 className='text-sm font-semibold text-gray-800 mb-2'>Filtros de Vagas (Sugestão Inicial para os Alunos)</h3>
                  <div className='grid md:grid-cols-3 gap-4'>
                    <div>
                      <label className='text-xs font-medium text-gray-600'>Área</label>
                      <select value={form.job_area} onChange={e=>setForm(f=>({...f,job_area:e.target.value, job_subarea:''}))} className='w-full border rounded-md px-3 py-2 text-sm'>
                        {areaOptions.map(a=> <option key={a.value} value={a.value}>{a.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className='text-xs font-medium text-gray-600'>Subárea (opcional)</label>
                      <select value={form.job_subarea} onChange={e=>setForm(f=>({...f,job_subarea:e.target.value}))} className='w-full border rounded-md px-3 py-2 text-sm' disabled={!form.job_area}>
                        {subareaOptions.map(s=> <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className='text-xs font-medium text-gray-600'>Localização</label>
                      <input value={form.job_location} onChange={e=>setForm(f=>({...f,job_location:e.target.value}))} placeholder='Cidade ou UF' className='w-full border rounded-md px-3 py-2 text-sm'/>
                    </div>
                    <div>
                      <label className='text-xs font-medium text-gray-600'>Modalidade</label>
                      <select value={form.job_work_type} onChange={e=>setForm(f=>({...f,job_work_type:e.target.value}))} className='w-full border rounded-md px-3 py-2 text-sm'>
                        <option value=''>Todas</option>
                        <option value='presencial'>Presencial</option>
                        <option value='hibrido'>Híbrido</option>
                        <option value='remoto'>Remoto</option>
                      </select>
                    </div>
                    
                  </div>
                  <p className='mt-2 text-[11px] text-gray-500'>Esses campos serão usados para pré-filtrar vagas na primeira vez que um aluno desta turma acessar a busca.</p>
                </div>
              </div>
              <div className='flex gap-3 pt-2'>
                <button disabled={creating} className='inline-flex items-center gap-2 px-5 py-2 rounded-md bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-60'>
                  {creating && <Loader2 className='w-4 h-4 animate-spin'/>}
                  Salvar Alterações
                </button>
                <button type='button' onClick={()=>{ setEditing(null); setForm({ name:'', description:'', year:'', shift:'', job_area:'', job_subarea:'', job_location:'', job_work_type:'', job_contract_type:'', job_experience_level:'' }); }} className='text-sm px-4 py-2 rounded-md border bg-white hover:bg-gray-50'>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default SchoolClasses;
