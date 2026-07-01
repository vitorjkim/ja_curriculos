import React, { useEffect, useRef, useState } from 'react';
import { schoolApi } from '@/lib/schoolApi';
import { useAuth } from '@/contexts/AuthContext';
import { Download, Plus, Loader2, Eye, EyeOff, UserX, UserCheck, Trash2, FileText, Upload, Star } from 'lucide-react';
import { formatCPF, formatPhone } from '@/lib/formatters';

const SchoolStudents = () => {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [classFilter, setClassFilter] = useState('');
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({
    name:'', cpf:'', birth_date:'', email:'', phone:'', password:'123456', confirmPassword:'123456', class_id:''
  });
  const [showPass,setShowPass]=useState(false);
  const [detail,setDetail]=useState(null);
  const [loadingDetail,setLoadingDetail]=useState(false);
  const [importing,setImporting]=useState(false);
  const [importResult,setImportResult]=useState(null);
  const [results,setResults]=useState([]);
  const resultsRef = useRef(null);
  const [selected,setSelected]=useState([]);
  const allSelected = selected.length>0 && selected.length===students.length;


  const toggleSelectAll = () => {
    if(allSelected) setSelected([]); else setSelected(students.map(s=>s.id));
  };
  const toggleSelect = (id) => {
    setSelected(sel=> sel.includes(id) ? sel.filter(x=>x!==id) : [...sel,id]);
  };

  const runBulk = async (action, extra={}) => {
    if(selected.length===0) return;
    if(['delete'].includes(action)) {
      if(!confirm(`Confirmar ${action==='delete'?'exclusão':'ação'} de ${selected.length} alunos?`)) return;
    }
    try {
      setError(null);
      const res = await schoolApi.bulkStudents(action, selected, extra);
      // Atualizar estado local conforme ação
      if(action==='delete') {
        setStudents(students.filter(s=> !selected.includes(s.id)));
      } else if(action==='activate' || action==='deactivate') {
        const mapStatus = action==='activate' ? 'active':'inactive';
        setStudents(students.map(s=> selected.includes(s.id)? { ...s, status: mapStatus }: s));
      } else if(action==='feature' || action==='unfeature') {
        const val = action==='feature';
        setStudents(students.map(s=> selected.includes(s.id)? { ...s, is_featured: val }: s));
      } else if(action==='assign_class') {
        const clsId = extra.class_id || null;
        const cls = classes.find(c=>c.id===clsId);
        setStudents(students.map(s=> selected.includes(s.id)? { ...s, class_id: clsId, class_name: cls?.name }: s));
      } else if(action==='remove_class') {
        setStudents(students.map(s=> selected.includes(s.id)? { ...s, class_id: null, class_name: null }: s));
      }
      setSelected([]);
    } catch(e){ setError(e.message); }
  };

  const load = async () => {
    try {
      setLoading(true);
      const query = { limit:100 };
      if(classFilter) query.class_id = classFilter;
      const [st, co, cl] = await Promise.all([
        schoolApi.listStudents(query),
        schoolApi.listCourses(),
        schoolApi.listClasses().catch(()=>[])
      ]);
  setStudents(st.students || []);
  // Debug: log first student structure
  if((st.students||[])[0]) console.debug('Student sample:', (st.students||[])[0]);
      setCourses(co.courses || []);
      setClasses(cl || []);
    } catch(e) { setError(e.message);} finally { setLoading(false);} }

  useEffect(()=>{ if(user?.type==='school') load(); },[user, classFilter]);

  const onChange = e => setForm(f=>({...f,[e.target.name]: e.target.value}));
  const onCpfChange = e => setForm(f=>({...f, cpf: formatCPF(e.target.value)}));
  const onPhoneChange = e => setForm(f=>({...f, phone: formatPhone(e.target.value)}));

  const createStudent = async (e) => {
    e.preventDefault();
    try {
      setCreating(true);
      // Enforce default password as requested
      const enforcedForm = { ...form, password: '123456', confirmPassword: '123456' };
      if (!enforcedForm.name || !enforcedForm.email || !enforcedForm.password || !enforcedForm.confirmPassword) {
        setError('Preencha os campos obrigatórios');
        return;
      }
      if (enforcedForm.password !== enforcedForm.confirmPassword) {
        setError('As senhas não conferem');
        return;
      }
      const payload = { ...enforcedForm };
      // Force password to 123456 as requested
      payload.password = '123456';
      if (payload.current_semester) payload.current_semester = parseInt(payload.current_semester);
      if (payload.total_semesters) payload.total_semesters = parseInt(payload.total_semesters);
      if(!payload.class_id) delete payload.class_id; // avoid empty string
      await schoolApi.createStudent(payload);
  setForm({ name:'', cpf:'', birth_date:'', email:'', phone:'', password:'', confirmPassword:'', class_id:'' });
      load();
    } catch(e){ setError(e.message);} finally { setCreating(false);} }

  if (!user || user.type !== 'school') return <div className="max-w-6xl mx-auto p-6">Acesso restrito às escolas.</div>;

  const viewStudent = async (id) => {
    try {
      setLoadingDetail(true); setError(null);
      const st = await schoolApi.getStudent(id);
      setDetail(st);
    } catch(e){ setError(e.message); } finally { setLoadingDetail(false); }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if(!file) return;
    setError(null); setImportResult(null); setImporting(true); setResults([]);
    try {
      const res = await schoolApi.importStudents(file);
      setImportResult(res.summary || { total:0, created:0, errors:0 });
      setResults(res.results||[]);
      setTimeout(()=>{ try{ resultsRef.current?.scrollIntoView({ behavior:'smooth', block:'start' }); }catch{} }, 50);
      await load();
    } catch(err){ setError(err.message); } finally { setImporting(false); e.target.value=''; }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="text-center flex-1">
          <h1 className="text-[1.85rem] md:text-[2.25rem] font-bold text-gray-900 mb-1 tracking-tight leading-tight">Gestão de <span className="text-blue-600">Alunos</span></h1>
          <p className="text-[15px] text-gray-600 max-w-2xl mx-auto leading-relaxed">Gerencie e cadastre novos alunos</p>
        </div>
        <div className="flex gap-3 flex-wrap items-center">
          <button disabled={importing} onClick={()=>schoolApi.exportStudents()} className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-emerald-600 text-white text-sm hover:bg-emerald-700 transition disabled:opacity-60">
            <Download className="w-4 h-4"/> Exportar Excel
          </button>
          <button onClick={()=>schoolApi.exportStudentsTemplate()} className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-slate-600 text-white text-sm hover:bg-slate-700 transition">
            <Download className="w-4 h-4"/> Modelo Alunos
          </button>
          <div>
            <button disabled={importing} onClick={()=>document.getElementById('students-import-input').click()} className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-indigo-600 text-white text-sm hover:bg-indigo-700 transition disabled:opacity-60">
              {importing ? <Loader2 className="w-4 h-4 animate-spin"/> : <Upload className="w-4 h-4"/>}
              {importing ? 'Importando...' : 'Importar Excel'}
            </button>
            <input id="students-import-input" type="file" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} style={{ display:'none' }} />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-600">Turma:</label>
            <select value={classFilter} onChange={e=>setClassFilter(e.target.value)} className="border rounded-md px-2 py-1 text-xs">
              <option value="">Todas</option>
              {classes.map(c=> <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
      </div>
      {importResult && (
        <div className="text-xs bg-indigo-50 border border-indigo-200 rounded-md px-3 py-2 flex items-center gap-4">
          <span className="font-medium text-indigo-800">Importação:</span>
          <span>Total: {importResult.total}</span>
          <span>Criados: <strong className="text-green-600">{importResult.created}</strong></span>
          <span>Erros: <strong className={importResult.errors>0? 'text-red-600':'text-gray-600'}>{importResult.errors}</strong></span>
        </div>
      )}
      {error && <div className="text-sm text-red-600">{error}</div>}
      <div className="grid md:grid-cols-3 gap-8 items-start">
        <form onSubmit={createStudent} className="md:col-span-1 space-y-4 bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h2 className="font-semibold text-lg flex items-center gap-2"><Plus className="w-4 h-4"/> Novo Aluno</h2>
            <div className="flex gap-2">
              <button type="button" onClick={()=>{
                // preencher aleatório
                const rndName = ['Ana','Bruno','Carla','Diego','Eduardo','Fernanda','Gustavo','Helena'][Math.floor(Math.random()*8)];
                const rndLast = Math.random().toString(36).slice(2,7).toUpperCase();
                const rndCpf = '000.000.000-00'.replace(/0/g, ()=>Math.floor(Math.random()*9));
                const rndEmail = `${rndName.toLowerCase()}.${rndLast.toLowerCase()}@exemplo.com`;
                const today = new Date();
                const year = 2003 + Math.floor(Math.random()*6);
                const month = String(1 + Math.floor(Math.random()*12)).padStart(2,'0');
                const day = String(1 + Math.floor(Math.random()*28)).padStart(2,'0');
                const rndPhone = `(11) 9${Math.floor(10000000 + Math.random()*89999999)}`;
                setForm({
                  name: `${rndName} ${rndLast}`,
                  cpf: rndCpf,
                  birth_date: `${year}-${month}-${day}`,
                  email: rndEmail,
                  phone: rndPhone,
                  password: '123456',
                  confirmPassword: '123456',
                  class_id: classes.length? classes[Math.floor(Math.random()*classes.length)].id : ''
                });
              }} className="text-xs px-2 py-1 rounded-md border">Preencher aleatório</button>
              <div className="text-xs text-gray-500 self-center">Senha padrão: <strong>123456</strong></div>
            </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Nome Completo *</label>
            <input name="name" value={form.name} onChange={onChange} placeholder="Seu nome completo" className="w-full border rounded-md px-3 py-2 text-sm" required />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Turma</label>
            <select name="class_id" value={form.class_id} onChange={onChange} className="w-full border rounded-md px-3 py-2 text-sm">
              <option value="">(sem turma)</option>
              {classes.map(c=> <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">CPF *</label>
            <input name="cpf" value={form.cpf} onChange={onCpfChange} placeholder="000.000.000-00" className="w-full border rounded-md px-3 py-2 text-sm" required />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Data de Nascimento *</label>
            <input name="birth_date" value={form.birth_date} onChange={onChange} type="date" className="w-full border rounded-md px-3 py-2 text-sm" required />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Email *</label>
            <input name="email" value={form.email} onChange={onChange} placeholder="seu@email.com" type="email" className="w-full border rounded-md px-3 py-2 text-sm" required />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Telefone *</label>
            <input name="phone" value={form.phone} onChange={onPhoneChange} placeholder="(11) 99999-9999" className="w-full border rounded-md px-3 py-2 text-sm" required />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Senha *</label>
            <div className="relative">
              <input name="password" type={showPass?'text':'password'} value={form.password} onChange={onChange} placeholder="Digite uma senha" className="w-full border rounded-md px-3 py-2 text-sm pr-9" required />
              <button type="button" onClick={()=>setShowPass(s=>!s)} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700">{showPass? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}</button>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Confirmar Senha *</label>
            <input name="confirmPassword" type="password" value={form.confirmPassword} onChange={onChange} placeholder="Confirme sua senha" className="w-full border rounded-md px-3 py-2 text-sm" required />
          </div>
          <hr className="my-2"/>
          <button disabled={creating} className="w-full inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-md transition">
            {creating && <Loader2 className="w-4 h-4 animate-spin"/>} Salvar Aluno
          </button>
        </form>
        <div className="md:col-span-2 space-y-4">
          {loading ? <div className="text-gray-500">Carregando...</div> : (
            <div className="overflow-hidden border border-gray-200 rounded-xl bg-white">
              {selected.length>0 && (
                <div className="p-3 bg-indigo-50 border-b border-indigo-200 flex flex-wrap gap-3 items-center text-xs">
                  <span className="font-medium text-indigo-800">{selected.length} selecionado(s)</span>
                  <button onClick={()=>runBulk('activate')} className="px-2 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-700">Ativar</button>
                  <button onClick={()=>runBulk('deactivate')} className="px-2 py-1 rounded bg-amber-600 text-white hover:bg-amber-700">Desativar</button>
                  <button onClick={()=>runBulk('feature')} className="px-2 py-1 rounded bg-yellow-600 text-white hover:bg-yellow-700">Destacar</button>
                  <button onClick={()=>runBulk('unfeature')} className="px-2 py-1 rounded bg-yellow-700 text-white hover:bg-yellow-800">Remover Destaque</button>
                  <div className="flex items-center gap-1">
                    <select onChange={(e)=>{ if(e.target.value){ runBulk('assign_class',{ class_id:e.target.value }); e.target.value=''; } }} className="border rounded px-2 py-1 bg-white">
                      <option value="">Atribuir Turma...</option>
                      {classes.map(c=> <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <button onClick={()=>runBulk('remove_class')} className="px-2 py-1 rounded border border-gray-400 text-gray-700 hover:bg-gray-100">Remover Turma</button>
                  </div>
                  <button onClick={()=>runBulk('delete')} className="px-2 py-1 rounded bg-red-600 text-white hover:bg-red-700">Excluir</button>
                  <button onClick={()=>setSelected([])} className="px-2 py-1 rounded border text-gray-700 hover:bg-gray-100">Cancelar</button>
                </div>
              )}
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="p-3"><input type="checkbox" checked={allSelected} onChange={toggleSelectAll} className="w-5 h-5 cursor-pointer" /></th>
                    <th className="text-left p-3 font-medium">Nome</th>
                    <th className="text-left p-3 font-medium">Email</th>
                    <th className="text-left p-3 font-medium">Turma</th>
                    <th className="text-left p-3 font-medium">Status</th>
                    <th className="text-left p-3 font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {students.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-gray-500">Nenhum aluno cadastrado</td></tr>}
                  {students.map(s => (
                    <tr key={s.id} className="border-t hover:bg-gray-50">
                      <td className="p-3"><input type="checkbox" checked={selected.includes(s.id)} onChange={()=>toggleSelect(s.id)} className="w-5 h-5 cursor-pointer" /></td>
                      <td className="p-3 font-medium text-gray-800">{s.name}</td>
                      <td className="p-3">{s.email}</td>
                      <td className="p-3 text-xs text-gray-600">{s.class_name || s.class || '—'}</td>
                      <td className="p-3">
                        {(() => { const st=(s.status||'active').toLowerCase(); const active= st==='active'; return (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${ active ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-red-50 text-red-700 border-red-200'}`}>{active?'Ativo':'Inativo'}</span>
                        ); })()}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button onClick={async()=>{ try { const newVal = await schoolApi.toggleStudentFeatured(s.id); setStudents(students.map(st=>st.id===s.id?{...st,is_featured:newVal}:st)); } catch(e){ setError(e.message);} }} title={s.is_featured? 'Remover destaque':'Destacar'} className={`p-1.5 rounded-md border hover:bg-yellow-50 ${s.is_featured? 'text-yellow-600 bg-yellow-50':'text-gray-500'}`}>
                            <Star className="w-4 h-4" fill={s.is_featured? '#ca8a04':'none'} />
                          </button>
                          <button onClick={()=>{
                            // Prefer abrir pelo user_id (leva ao perfil reutilizado) quando disponível
                            if(s.user_id){
                              window.location.href = `/alunos/${s.user_id}`;
                            } else {
                              viewStudent(s.id);
                            }
                          }} title="Ver" className="p-1.5 rounded-md border text-blue-600 hover:bg-blue-50"><FileText className="w-4 h-4"/></button>
                          <button onClick={async()=>{ try { const newStatus= await schoolApi.toggleStudentStatus(s.id); setStudents(students.map(st=>st.id===s.id?{...st,status:newStatus}:st)); } catch(e){ setError(e.message);} }} title={(s.status||'active').toLowerCase()==='active'?'Desabilitar':'Habilitar'} className={`p-1.5 rounded-md border hover:bg-gray-50 ${ (s.status||'active').toLowerCase()==='active' ? 'text-amber-600' : 'text-emerald-600' }`}>{(s.status||'active').toLowerCase()==='active'? <UserX className="w-4 h-4"/> : <UserCheck className="w-4 h-4"/>}</button>
                          <button onClick={async()=>{ if(!confirm('Excluir este aluno?')) return; try { await schoolApi.deleteStudent(s.id); setStudents(students.filter(st=>st.id!==s.id)); } catch(e){ setError(e.message);} }} title="Excluir" className="p-1.5 rounded-md border text-red-600 hover:bg-red-50"><Trash2 className="w-4 h-4"/></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      {detail && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={()=>setDetail(null)}>
          <div className="bg-white w-full max-w-lg rounded-xl shadow-xl p-6 relative" onClick={e=>e.stopPropagation()}>
            <button className="absolute top-2 right-2 text-gray-500 hover:text-gray-700" onClick={()=>setDetail(null)}>✕</button>
            <h3 className="text-lg font-semibold mb-4">Perfil do Aluno</h3>
            {loadingDetail ? <div className="text-gray-500">Carregando...</div> : (
              <div className="space-y-3 text-sm">
                <div><span className="font-medium text-gray-600">Nome:</span> {detail.name}</div>
                <div><span className="font-medium text-gray-600">Email:</span> {detail.email}</div>
                <div><span className="font-medium text-gray-600">Telefone:</span> {detail.phone || '—'}</div>
                <div><span className="font-medium text-gray-600">CPF:</span> {detail.cpf || '—'}</div>
                <div className="grid grid-cols-2 gap-2">
                  <div><span className="font-medium text-gray-600">Status:</span> {detail.status}</div>
                  <div><span className="font-medium text-gray-600">GPA:</span> {detail.gpa || '—'}</div>
                  <div><span className="font-medium text-gray-600">Semestres:</span> {detail.current_semester || '—'} / {detail.total_semesters || '—'}</div>
                  <div><span className="font-medium text-gray-600">Matrícula:</span> {detail.student_registration || '—'}</div>
                </div>
                <div><span className="font-medium text-gray-600">Curso:</span> {detail.course_name || '—'} {detail.course_level && <span className="text-xs text-gray-500">({detail.course_level})</span>}</div>
                <div className="pt-2 flex gap-2">
                  <button onClick={()=>{ setDetail(null); viewStudent(detail.id); }} className="px-3 py-1.5 text-xs rounded-md bg-blue-600 text-white">Atualizar</button>
                  <button onClick={()=>{ setDetail(null); }} className="px-3 py-1.5 text-xs rounded-md border">Fechar</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {importResult && results?.length>0 && (
        <div ref={resultsRef} className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
          <h3 className="font-semibold text-sm">Resultado da Importação</h3>
          <div className="max-h-56 overflow-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-2 font-medium">Linha</th>
                  <th className="text-left p-2 font-medium">Email</th>
                  <th className="text-left p-2 font-medium">Status</th>
                  <th className="text-left p-2 font-medium">Mensagem</th>
                </tr>
              </thead>
              <tbody>
                {results.map(r => (
                  <tr key={r.row} className="border-t">
                    <td className="p-2">{r.row}</td>
                    <td className="p-2">{r.email||'—'}</td>
                    <td className="p-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${r.status==='created'?'bg-green-100 text-green-700':'bg-red-100 text-red-700'}`}>{r.status}</span>
                    </td>
                    <td className="p-2 text-[11px] text-gray-600">{r.message|| (r.status==='created' && r.initial_password ? `Senha inicial: ${r.initial_password}` :'—')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default SchoolStudents;
