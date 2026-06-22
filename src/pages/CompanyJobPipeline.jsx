import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext';
import { applicationsAPI, chatAPI, interactionsAPI } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Briefcase, ArrowLeft, UserCheck, Mail, Phone, Calendar, MessageCircle, ChevronDown, Users, CalendarCheck, ThumbsUp, ThumbsDown, Info, FileText, Send, Star, MoreVertical, X } from 'lucide-react';

const CompanyJobPipeline = () => {
  const { jobId } = useParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [jobTitle, setJobTitle] = useState('');
  const [preApproved, setPreApproved] = useState([]);
  const [finalApproved, setFinalApproved] = useState([]);
  const [interview, setInterview] = useState([]);
  const [rejected, setRejected] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [targetApp, setTargetApp] = useState(null);
  const [form, setForm] = useState({ date:'', time:'', mode:'online', link:'', location:'', notes:'' });
  const [saving, setSaving] = useState(false);
  const [canceling, setCanceling] = useState({});
  const [showDecisionModal, setShowDecisionModal] = useState(false);
  const [decisionTarget, setDecisionTarget] = useState(null);
  const [decisionStatus, setDecisionStatus] = useState('approved');
  const [decisionFeedback, setDecisionFeedback] = useState('');
  const [submittingDecision, setSubmittingDecision] = useState(false);

  useEffect(() => {
    const load = async (silent = false) => {
      if (!user || user.type !== 'company') return;
      if (!silent) setLoading(true);
      try {
        const resp = await applicationsAPI.getJobPipeline(jobId);
        const apps = resp.applications || [];
        if (apps[0]) setJobTitle(apps[0].job_title || `Vaga #${jobId}`);
  // Entrevista ativa: precisa ter data e não estar cancelada/rejeitada
  const interviewLike = apps.filter(a => a.interview_date && !a.interview_canceled_by_company && !a.interview_rejected_by_candidate && !a.final_approved);
  // Pré-aprovados: status approved ou interested, não final_approved e sem entrevista ativa
  const pre = apps.filter(a => (a.status === 'approved' || a.status === 'interested') && !a.final_approved && (!a.interview_date || a.interview_canceled_by_company || a.interview_rejected_by_candidate));
  const fin = apps.filter(a => a.status === 'approved' && a.final_approved);
  setPreApproved(pre);
  setFinalApproved(fin);
        setInterview(interviewLike);
        setRejected(apps.filter(a => a.status === 'rejected'));
      } catch (e) {
        console.error('Erro carregando pipeline da vaga', e);
      } finally { setLoading(false); }
    };
    load();
    const onConfirmed = (e) => {
      console.log('[CompanyPipeline] Evento interview-confirmed recebido', e.detail);
      const appPayload = e.detail?.application;
      setInterview(prev => prev.map(a => (a.id === (e.detail?.id || e.detail?.applicationId)) ? { ...a, ...(appPayload||{}), interview_confirmed: true, interview_confirmed_at: (appPayload?.interview_confirmed_at || new Date().toISOString()) } : a));
      // Se não estava em entrevista (caso edge), mover
      if (appPayload && appPayload.interview_date) {
        setPreApproved(prev => prev.filter(a => a.id !== appPayload.id));
        setInterview(prev => prev.some(a => a.id === appPayload.id) ? prev : [...prev, appPayload]);
      }
      // Recarregar para garantir consistência
      load();
    };
    const onRejected = (e) => {
      const app = e.detail?.application;
      const id = e.detail?.id || app?.id;
      if (!id) return;
      // remover de entrevistas e levar para aprovados
      setInterview(prev => prev.filter(a => a.id !== id));
      if (app) setPreApproved(prev => [{ ...app }, ...prev]);
      load();
    };
    window.addEventListener('interview-confirmed', onConfirmed);
    window.addEventListener('interview-rejected', onRejected);
    const interval = setInterval(()=>{ load(true); }, 120000); // polling 2min silencioso
    return () => { window.removeEventListener('interview-confirmed', onConfirmed); window.removeEventListener('interview-rejected', onRejected); clearInterval(interval); };
  }, [user, jobId]);

  const openSchedule = (app) => {
    setBulkMode(false);
    setTargetApp(app);
    setForm({ date:'', time:'', mode:'online', link:'', location:'', notes:'' });
    setShowModal(true);
  };

  const openBulkSchedule = () => {
    setBulkMode(true);
    setTargetApp(null);
    setForm({ date:'', time:'', mode:'online', link:'', location:'', notes:'' });
    setShowModal(true);
  };

  const saveSchedule = async () => {
    if (!form.date || !form.time) return;
    setSaving(true);
    try {
  const localPlain = `${form.date}T${form.time}:00`;// horário local escolhido, sem conversão para UTC
  const payload = { interview_date_local: localPlain, interview_mode: form.mode, interview_link: form.link, interview_location: form.location, interview_notes: form.notes };
      if (bulkMode) {
        for (const a of preApproved) {
          const resp = await applicationsAPI.updateStatus(a.id, 'interview', payload);
          const updated = resp.application;
          setPreApproved(prev => prev.filter(p => p.id !== a.id));
          setInterview(prev => {
            const exists = prev.find(p => p.id === a.id);
            if (exists) return prev.map(p => p.id === a.id ? { ...p, ...updated, interview_confirmed:false, interview_rescheduled: true } : p);
            return [...prev, { ...a, ...updated, interview_confirmed:false, interview_rescheduled: true }];
          });
        }
      } else if (targetApp) {
        const resp = await applicationsAPI.updateStatus(targetApp.id, 'interview', payload);
        const updated = resp.application;
        // mover do aprovado para entrevista e atualizar card (otimista)
        setPreApproved(prev => prev.filter(p => p.id !== targetApp.id));
        setInterview(prev => {
          const exists = prev.find(p => p.id === targetApp.id);
          const merged = { ...targetApp, ...updated, interview_confirmed:false, interview_rescheduled: true };
          return exists ? prev.map(p => p.id === targetApp.id ? merged : p) : [merged, ...prev];
        });
      }
      // refresh de consistência com backend
      try {
        const r = await applicationsAPI.getJobPipeline(jobId);
        const apps = r.applications || [];
  setInterview(apps.filter(a => a.interview_date && !a.interview_canceled_by_company && !a.interview_rejected_by_candidate));
  setPreApproved(apps.filter(a => a.status==='approved' && !a.final_approved && (!a.interview_date || a.interview_canceled_by_company || a.interview_rejected_by_candidate)));
  setFinalApproved(apps.filter(a => a.status==='approved' && a.final_approved));
        setRejected(apps.filter(a => a.status === 'rejected'));
      } catch {}
      setShowModal(false);
    } catch (e) {
      console.error('Erro salvando entrevista', e);
      // fallback: recarregar tudo
      try {
        const resp = await applicationsAPI.getJobPipeline(jobId);
        const apps = resp.applications || [];
  setInterview(apps.filter(a => a.interview_date));
  setPreApproved(apps.filter(a => a.status==='approved' && !a.final_approved && !a.interview_date));
  setFinalApproved(apps.filter(a => a.status==='approved' && a.final_approved));
        setRejected(apps.filter(a => a.status === 'rejected'));
      } catch {}
    } finally { setSaving(false); }
  };

  const cancelInterview = async (app) => {
    if (canceling[app.id]) return;
    if (!window.confirm('Confirmar cancelamento da entrevista?')) return;
    const reason = window.prompt('Opcional: informe um motivo para o cancelamento.');
    setCanceling(c => ({ ...c, [app.id]: true }));
    try {
      const resp = await applicationsAPI.cancelInterview(app.id, reason || null);
      if (resp?.success) {
        const updated = resp.application;
        // Remover da lista de entrevistas e mover para aprovados (otimista)
  setInterview(prev => prev.filter(p => p.id !== app.id));
  setPreApproved(prev => [{ ...app, ...updated }, ...prev]);
        // garantir consistência com backend
  try { await (async ()=>{ const r = await applicationsAPI.getJobPipeline(jobId); const apps = r.applications||[]; setInterview(apps.filter(a=>a.interview_date)); setPreApproved(apps.filter(a=>a.status==='approved' && !a.final_approved && !a.interview_date)); setFinalApproved(apps.filter(a=>a.status==='approved' && a.final_approved)); setRejected(apps.filter(a=>a.status==='rejected')); })(); } catch {}
      }
    } catch (e) {
      console.error('Falha ao cancelar entrevista', e);
      alert('Não foi possível cancelar agora.');
    } finally {
      setCanceling(c => ({ ...c, [app.id]: false }));
    }
  };

  const sendInterviewMessage = async (app, iso) => {
    try {
      // garantir conversa
      await chatAPI.saveCandidate(app.candidate_id);
      const convs = await chatAPI.getConversations();
      const conv = convs.find(c => c.candidateId === app.candidate_id);
      const dt = new Date(iso);
      const human = dt.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle:'short' });
      const base = form.mode === 'online'
        ? `Sua entrevista foi agendada para ${human} (online). Link: ${form.link || 'em breve.'}`
        : `Sua entrevista foi agendada para ${human} no local: ${form.location || 'a definir.'}`;
      const notes = form.notes ? ` Observações: ${form.notes}` : '';
      if (conv) {
        await chatAPI.sendMessage(conv.id, `🎤 Entrevista agendada! ${base}${notes}`);
      }
      // Também gerar candidate_message simples via interactions fallback (usa endpoint markAllRead? não - criamos interação artificial?)
      // Em vez de sobrecarregar interactions com tipo inexistente, reutilizamos interested->approved já usada. Poderíamos criar endpoint próprio depois.
    } catch (e) { console.warn('Falha ao enviar mensagem de entrevista', e.message); }
  };

  if (!user || user.type !== 'company') return <div className='min-h-screen flex items-center justify-center text-gray-600'>Acesso restrito.</div>;

  return (
    <div className='min-h-screen bg-slate-50/80 py-10 px-4'>
      <Helmet><title>Pipeline • {jobTitle}</title></Helmet>
      <div className='max-w-6xl mx-auto'>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className='mb-8 flex flex-col items-start justify-between gap-6 rounded-[24px] border-2 border-slate-200 bg-white/90 px-8 py-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)] backdrop-blur-sm md:flex-row md:items-center'
        >
          <div>
            <p className='mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400'>Pipeline de Candidatos</p>
            <h1 className='mb-1 text-3xl font-bold tracking-tight md:text-4xl'>
              <span className='text-slate-900'>Vaga • </span>
              <span className='text-[#2563eb]'>{jobTitle || '—'}</span>
            </h1>
            <p className='text-sm text-slate-500'>Acompanhe o funil de pré-aprovações, entrevistas e aprovações desta vaga.</p>
          </div>
          <div className='flex items-center gap-3'>
            <Link to='/company-interviews'>
              <Button variant='outline' className='rounded-2xl border-gray-200 hover:bg-blue-50 hover:border-blue-400 hover:text-blue-600 hover:shadow-md transition-all duration-200'>
                <ArrowLeft className='w-4 h-4 mr-2'/> Voltar
              </Button>
            </Link>
          </div>
        </motion.div>

        {loading ? (
          <div className='py-28 text-center text-gray-600'>Carregando...</div>
        ) : (
          <div className='space-y-10'>
            <PipelineSection title='Pré-aprovados' color='sky' items={preApproved} empty='Nenhum pré-aprovado.' defaultOpen onSchedule={openSchedule} />
            <PipelineSection
              title='Entrevista'
              color='purple'
              items={interview}
              empty='Nenhuma entrevista.'
              defaultOpen
              showCountdown
              onSchedule={openSchedule}
              onCancel={cancelInterview}
              onApprove={(app)=>{
                setDecisionTarget(app);
                setDecisionStatus('approved');
                setDecisionFeedback('');
                setShowDecisionModal(true);
              }}
              onReject={(app)=>{
                setDecisionTarget(app);
                setDecisionStatus('rejected');
                setDecisionFeedback('');
                setShowDecisionModal(true);
              }}
            />
            <PipelineSection title='Aprovados' color='emerald' items={finalApproved} empty='Nenhum aprovado.' defaultOpen />
            <PipelineSection title='Reprovados' color='red' items={rejected} empty='Nenhum reprovado.' defaultOpen />
          </div>
        )}
      </div>
      {showModal && (
        <div className='fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4'>
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className='bg-white w-full max-w-lg rounded-[22px] shadow-[0_25px_60px_rgba(15,23,42,0.15)] overflow-hidden border border-slate-200'
          >
            {/* Header com gradiente */}
            <div className='bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-5'>
              <div className='flex items-center gap-3'>
                <div className='w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center'>
                  <CalendarCheck className='w-5 h-5 text-white' />
                </div>
                <div>
                  <h2 className='text-lg font-semibold text-white'>Agendar Entrevista</h2>
                  <p className='text-indigo-100 text-sm'>
                    {bulkMode ? 'Todos os pré-aprovados' : targetApp?.candidate_name || 'Candidato'}
                  </p>
                </div>
              </div>
            </div>

            {/* Conteúdo */}
            <div className='p-6 space-y-5'>
              <div className='grid md:grid-cols-2 gap-4'>
                <div>
                  <label className='text-xs font-semibold text-slate-600 uppercase tracking-wide'>Data</label>
                  <input 
                    type='date' 
                    className='mt-2 w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all' 
                    value={form.date} 
                    onChange={e=>setForm(f=>({...f,date:e.target.value}))} 
                  />
                </div>
                <div>
                  <label className='text-xs font-semibold text-slate-600 uppercase tracking-wide'>Hora</label>
                  <input 
                    type='time' 
                    className='mt-2 w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all' 
                    value={form.time} 
                    onChange={e=>setForm(f=>({...f,time:e.target.value}))} 
                  />
                </div>
                <div>
                  <label className='text-xs font-semibold text-slate-600 uppercase tracking-wide'>Modo</label>
                  <select 
                    className='mt-2 w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all bg-white' 
                    value={form.mode} 
                    onChange={e=>setForm(f=>({...f,mode:e.target.value}))}
                  >
                    <option value='online'>🎥 Online</option>
                    <option value='presencial'>🏢 Presencial</option>
                    <option value='hibrido'>🔄 Híbrido</option>
                  </select>
                </div>
                {form.mode === 'online' ? (
                  <div>
                    <label className='text-xs font-semibold text-slate-600 uppercase tracking-wide'>Link da Reunião</label>
                    <input 
                      type='text' 
                      placeholder='https://meet.google.com/...' 
                      className='mt-2 w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all' 
                      value={form.link} 
                      onChange={e=>setForm(f=>({...f,link:e.target.value}))} 
                    />
                  </div>
                ) : (
                  <div>
                    <label className='text-xs font-semibold text-slate-600 uppercase tracking-wide'>Local</label>
                    <input 
                      type='text' 
                      placeholder='Endereço completo ou sala' 
                      className='mt-2 w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all' 
                      value={form.location} 
                      onChange={e=>setForm(f=>({...f,location:e.target.value}))} 
                    />
                  </div>
                )}
                <div className='md:col-span-2'>
                  <label className='text-xs font-semibold text-slate-600 uppercase tracking-wide'>Notas / Observações</label>
                  <textarea 
                    rows={3} 
                    className='mt-2 w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all resize-none' 
                    placeholder='Instruções adicionais, documentos necessários, etc.' 
                    value={form.notes} 
                    onChange={e=>setForm(f=>({...f,notes:e.target.value}))}
                  />
                </div>
              </div>

              {/* Botões */}
              <div className='flex justify-end gap-3 pt-3 border-t border-slate-100'>
                <Button 
                  variant='outline' 
                  onClick={()=>setShowModal(false)}
                  className='rounded-xl border-2 border-slate-200 hover:bg-slate-50 px-5'
                >
                  Cancelar
                </Button>
                <Button 
                  disabled={!form.date || !form.time || saving} 
                  onClick={saveSchedule}
                  className='rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-6 shadow-lg shadow-indigo-200'
                >
                  {saving ? (
                    <span className='flex items-center gap-2'>
                      <svg className='animate-spin h-4 w-4' viewBox='0 0 24 24'>
                        <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4' fill='none'/>
                        <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'/>
                      </svg>
                      Salvando...
                    </span>
                  ) : (
                    <span className='flex items-center gap-2'>
                      <CalendarCheck className='w-4 h-4' />
                      Confirmar
                    </span>
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
      {showDecisionModal && (
        <div className='fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4'>
          <div className='bg-white w-full max-w-lg rounded-2xl shadow-xl p-6 space-y-5'>
            <h2 className='text-xl font-semibold'>
              {decisionStatus === 'approved' ? 'Aprovar candidato' : 'Reprovar candidato'}{decisionTarget?.candidate_name ? ` • ${decisionTarget.candidate_name}` : ''}
            </h2>
            <div className='space-y-2'>
              <label className='text-xs font-medium text-gray-600'>Feedback para o aluno (opcional)</label>
              <textarea
                rows={5}
                className='w-full border rounded-md px-3 py-2 text-sm resize-y'
                placeholder={decisionStatus === 'approved' ? 'Compartilhe um feedback positivo, próximos passos, ou parabéns!' : 'Explique de forma construtiva o motivo da reprovação e dicas de melhoria.'}
                value={decisionFeedback}
                onChange={e=>setDecisionFeedback(e.target.value)}
              />
              <p className='text-[11px] text-gray-500'>Este feedback ficará visível para o candidato na página de candidaturas.</p>
            </div>
            <div className='flex justify-end gap-3 pt-2'>
              <Button variant='outline' size='sm' onClick={()=> setShowDecisionModal(false)}>Cancelar</Button>
              <Button size='sm' disabled={submittingDecision} onClick={async ()=>{
                if (!decisionTarget) return;
                setSubmittingDecision(true);
                try {
                  const resp = await applicationsAPI.submitDecision(decisionTarget.id, { status: decisionStatus, feedback: decisionFeedback });
                  if (resp?.success) {
                    const updated = resp.application;
                    // Remover de entrevistas
                    setInterview(prev => prev.filter(p => p.id !== decisionTarget.id));
                    if (decisionStatus === 'approved') {
                      setFinalApproved(prev => [{ ...decisionTarget, ...updated }, ...prev]);
                    } else {
                      setRejected(prev => [{ ...decisionTarget, ...updated }, ...prev]);
                    }
                  }
                  // Refresh consistente
                  try {
                    const r = await applicationsAPI.getJobPipeline(jobId);
                    const apps = r.applications || [];
                    setInterview(apps.filter(a => a.interview_date && !a.interview_canceled_by_company && !a.interview_rejected_by_candidate && !a.final_approved));
                    setPreApproved(apps.filter(a => a.status === 'approved' && !a.final_approved && (!a.interview_date || a.interview_canceled_by_company || a.interview_rejected_by_candidate)));
                    setFinalApproved(apps.filter(a => a.status === 'approved' && a.final_approved));
                    setRejected(apps.filter(a => a.status === 'rejected'));
                  } catch {}
                  setShowDecisionModal(false);
                } catch (e) {
                  console.error('Erro ao enviar decisão', e);
                  alert('Não foi possível registrar a decisão agora.');
                } finally { setSubmittingDecision(false); }
              }}>
                {submittingDecision ? 'Enviando...' : (decisionStatus === 'approved' ? 'Aprovar' : 'Reprovar')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const PipelineSection = ({ title, items, empty, color='gray', defaultOpen=false, onSchedule, onCancel, showCountdown=false, onApprove, onReject }) => {
  const [open, setOpen] = useState(defaultOpen);
  const [openMenuId, setOpenMenuId] = useState(null);
  const palette = {
    green: { card: 'bg-green-50 border-green-200', text: 'text-green-700', ring: 'ring-green-100' },
    indigo: { card: 'bg-indigo-50 border-indigo-200', text: 'text-indigo-700', ring: 'ring-indigo-100' },
    purple: { card: 'bg-purple-50 border-purple-200', text: 'text-purple-700', ring: 'ring-purple-100' },
    emerald: { card: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', ring: 'ring-emerald-100' },
    red: { card: 'bg-rose-50 border-rose-200', text: 'text-rose-700', ring: 'ring-rose-100' },
    sky: { card: 'bg-sky-50 border-sky-200', text: 'text-sky-700', ring: 'ring-sky-100' },
    gray: { card: 'bg-gray-50 border-gray-200', text: 'text-gray-700', ring: 'ring-gray-100' }
  }[color];
  const sectionMeta = {
    'Pré-aprovados': { icon: Users, badgeBg: 'bg-sky-50', badgeText: 'text-sky-700', badgeRing: 'ring-sky-100' },
    'Entrevista': { icon: CalendarCheck, badgeBg: 'bg-purple-50', badgeText: 'text-purple-700', badgeRing: 'ring-purple-100' },
    'Aprovados': { icon: ThumbsUp, badgeBg: 'bg-emerald-50', badgeText: 'text-emerald-700', badgeRing: 'ring-emerald-100' },
    'Reprovados': { icon: ThumbsDown, badgeBg: 'bg-rose-50', badgeText: 'text-rose-700', badgeRing: 'ring-rose-100' }
  }[title] || { icon: Info, badgeBg: 'bg-slate-50', badgeText: 'text-slate-700', badgeRing: 'ring-slate-100' };
  const [now, setNow] = useState(Date.now());
  useEffect(()=>{ if(showCountdown){ const t = setInterval(()=>setNow(Date.now()), 60000); return ()=>clearInterval(t);} },[showCountdown]);
  const formatCountdown = (dateStr) => {
    if (!dateStr) return '';
    const s = String(dateStr).replace('T',' ').trim();
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/);
    const d = m ? new Date(Number(m[1]), Number(m[2])-1, Number(m[3]), Number(m[4]), Number(m[5]), Number(m[6]||0)) : null;
    if(!d) return '';
    const diff = d.getTime() - now;
    if (diff <= 0) return 'agora';
    const mins = Math.floor(diff/60000);
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins/60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours/24);
    return `${days}d`;
  };
  return (
    <Card className='rounded-[22px] border-2 border-slate-200 bg-white/95 shadow-[0_14px_35px_rgba(15,23,42,0.06)]'>
      <CardHeader className='pb-3'>
         <CardTitle className='flex items-center justify-between text-sm font-semibold text-slate-900'>
          <span className={`inline-flex items-center gap-2`}>
            <span className={`inline-flex items-center gap-1.5 rounded-2xl px-2 py-1 ${sectionMeta.badgeBg} ${sectionMeta.badgeText} ${sectionMeta.badgeRing} ring-2`}>
              {sectionMeta.icon && React.createElement(sectionMeta.icon, { className: 'w-3.5 h-3.5' })}
              {title}
            </span>
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${sectionMeta.badgeBg} ${sectionMeta.badgeText} ${sectionMeta.badgeRing}`}>
              {items.length}
            </span>
          </span>
          <div className='flex items-center gap-2'>
            {onSchedule && title === 'Pré-aprovados' && items.length > 0 && (
              <Button size='xs' variant='outline' className='rounded-full border-2 border-indigo-200 bg-indigo-50/60 px-3 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-100' onClick={()=>onSchedule(null)}>Agendar todos</Button>
            )}
            <button onClick={()=>setOpen(o=>!o)} className={`text-xs hover:underline flex items-center gap-1 ${title==='Entrevista' ? 'text-purple-600 hover:text-purple-700' : 'text-sky-600 hover:text-sky-700'}`}>
              <ChevronDown className={`w-4 h-4 transition-transform ${open? 'rotate-180':''}`}/> {open? 'Esconder' : 'Mostrar'}
            </button>
          </div>
        </CardTitle>
      </CardHeader>
      {open && (
        <CardContent>
          {items.length === 0 ? (
            <div className={`flex items-center gap-2 text-sm ${palette.text}`}>
              <Info className='w-4 h-4' />
              <span>{empty}</span>
            </div>
          ) : (
            <div className='grid md:grid-cols-2 lg:grid-cols-3 gap-4'>
              {items.map(app => {
                const isInterview = title === 'Entrevista' && app.interview_date;
                const confirmed = !!app.interview_confirmed;
                const primary = app.candidate_avatar_url || app.avatar_url || app.photo_url || app.candidate_photo_url || app.resume_avatar_url || '';
                const nameSeed = app.candidate_name || app.candidate_email || 'Aluno';
                const dicebearPng = `https://api.dicebear.com/7.x/initials/png?seed=${encodeURIComponent(nameSeed)}&size=96&backgroundType=gradient&radius=50&fontWeight=700`;
                const schoolAvatar = app.school_avatar_url || '';
                const schoolName = app.school_display_name || app.school_name || '';
                const isFeatured = app.is_featured;
                return (
                <div key={app.id} className={`p-4 rounded-[18px] border-2 ${palette.card} relative`}>
                  {/* Layout principal: foto à esquerda, dados à direita */}
                  <div className='flex gap-4 mb-3'>
                    {/* Foto do aluno com badge da escola */}
                    <div className='relative flex-shrink-0'>
                      <img
                        src={primary || dicebearPng}
                        alt={app.candidate_name || 'Foto do candidato'}
                        className={`w-16 h-16 rounded-full object-cover shadow-md ${isFeatured ? 'border-[3px] border-amber-400 shadow-[0_4px_20px_rgba(251,191,36,0.4)]' : 'border-[3px] border-slate-200'}`}
                        loading='lazy'
                        referrerPolicy='no-referrer'
                        onError={(e)=>{ if (e.currentTarget.src !== dicebearPng) e.currentTarget.src = dicebearPng; }}
                      />
                      {/* Badge de aluno destacado no canto inferior esquerdo */}
                      {isFeatured && (
                        <div className='absolute -bottom-1 -left-1 w-6 h-6 rounded-full bg-white shadow-md flex items-center justify-center border-2 border-amber-400'>
                          <Star className='w-3.5 h-3.5 text-amber-400' />
                        </div>
                      )}
                      {/* Badge da escola no canto inferior direito */}
                      <div className='absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-white shadow-md overflow-hidden flex items-center justify-center border border-slate-200'>
                        {schoolAvatar ? (
                          <img src={schoolAvatar} alt={schoolName} className='w-full h-full object-cover' />
                        ) : (
                          <div className='w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-500 to-slate-600 text-white text-[10px] font-bold'>
                            {(schoolName || 'E').charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Dados do candidato à direita */}
                    <div className='flex-1 min-w-0'>
                      <h4 className='font-semibold text-slate-900 text-sm truncate mb-1'>
                        {app.candidate_name}
                      </h4>
                      <p className='text-xs text-slate-600 flex items-center gap-1.5 mb-0.5 truncate'>
                        <Mail className='w-3 h-3 flex-shrink-0 text-slate-400'/>
                        <span className='truncate'>{app.candidate_email}</span>
                      </p>
                      {app.candidate_phone && (
                        <p className='text-xs text-slate-600 flex items-center gap-1.5'>
                          <Phone className='w-3 h-3 flex-shrink-0 text-slate-400'/>
                          {app.candidate_phone}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Mensagem quando voltou de uma entrevista rejeitada pelo candidato */}
                  {title === 'Pré-aprovados' && app.last_rejected_interview_date && (
                    <div className='mb-3'>
                      <span className='inline-block text-xs font-medium text-amber-700 bg-amber-100 px-3 py-1.5 rounded-full'>
                        Rejeitou a entrevista marcada para {(() => {
                          const s = String(app.last_rejected_interview_date || '').replace('T',' ').trim();
                          const m = s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/);
                          if(!m) return app.last_rejected_interview_date;
                          const [,Y,M,D,H,Min] = m; return `${D}/${M}/${Y.slice(2)} ${H}:${Min}`;
                        })()}
                      </span>
                    </div>
                  )}

                   {isInterview && (
                     <div className='flex flex-col gap-1 mb-3'>
                       <p className='text-[11px] text-gray-700 flex items-center gap-1'><Calendar className='w-3 h-3'/>
                         {(() => {
                           const s = String(app.interview_date || '').replace('T',' ').trim();
                           const m = s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/);
                           if(!m) return app.interview_date ? new Date(app.interview_date).toLocaleString('pt-BR',{ dateStyle:'short', timeStyle:'short' }) : '—';
                           const [,Y,M,D,H,Min] = m; return `${D}/${M}/${Y.slice(2)} ${H}:${Min}`;
                         })()}
                       </p>
                       {showCountdown && !app.interview_canceled_by_company && !app.interview_rejected_by_candidate && (
                         <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full font-medium w-fit ${confirmed ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'}`}>{confirmed ? 'Confirmada • ' : 'Entrevista em '} {formatCountdown(app.interview_date)}</span>
                       )}
                       {!app.interview_canceled_by_company && !app.interview_rejected_by_candidate && (
                         <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full w-fit ${confirmed ? 'bg-green-200 text-green-800' : 'bg-yellow-100 text-yellow-700'}`}>{confirmed ? 'Presença confirmada' : 'Aguardando confirmação'}</span>
                       )}
                       {app.interview_rescheduled && <span className='inline-block text-[10px] px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 w-fit'>Reagendada</span>}
                       {app.interview_canceled_by_company && <span className='inline-block text-[10px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 w-fit'>Cancelada</span>}
                       {app.interview_rejected_by_candidate && <span className='inline-block text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 w-fit'>Rejeitada pelo candidato</span>}
                     </div>
                   )}

                   {/* Botões de ação - Grid compacto */}
                   {title !== 'Reprovados' && title !== 'Entrevista' && title !== 'Aprovados' && (
                   <div className={`grid grid-cols-4 gap-2 pt-3 border-t-2 ${color === 'sky' ? 'border-sky-200' : color === 'purple' ? 'border-purple-200' : 'border-slate-200'}`}>
                     <Link 
                       to={`/resume/${app.resume_id}`} 
                       className='flex flex-col items-center justify-center h-14 rounded-2xl bg-blue-50 hover:bg-blue-100 border-2 border-blue-200 hover:border-blue-300 text-blue-700 transition-all'
                     >
                       <FileText className='w-4 h-4 mb-0.5'/>
                       <span className='text-[10px] font-medium'>Currículo</span>
                     </Link>
                     
                     {app.candidate_phone ? (
                       <a
                         href={`https://wa.me/${String(app.candidate_phone).replace(/\D/g,'')}`}
                         target='_blank'
                         rel='noopener noreferrer'
                         className='flex flex-col items-center justify-center h-14 rounded-2xl bg-green-50 hover:bg-green-100 border-2 border-green-200 hover:border-green-300 text-green-700 transition-all'
                       >
                         <svg className='w-4 h-4 mb-0.5' fill='currentColor' viewBox='0 0 24 24'>
                           <path d='M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z'/>
                         </svg>
                         <span className='text-[10px] font-medium'>WhatsApp</span>
                       </a>
                     ) : (
                       <span className='flex flex-col items-center justify-center h-14 rounded-2xl bg-slate-50 border-2 border-slate-200 text-slate-400 opacity-60'>
                         <svg className='w-4 h-4 mb-0.5' fill='currentColor' viewBox='0 0 24 24'>
                           <path d='M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z'/>
                         </svg>
                         <span className='text-[10px] font-medium'>WhatsApp</span>
                       </span>
                     )}
                     
                     <Link 
                       to={`/company-messages`} 
                       className='flex flex-col items-center justify-center h-14 rounded-2xl bg-purple-50 hover:bg-purple-100 border-2 border-purple-200 hover:border-purple-300 text-purple-700 transition-all'
                     >
                       <MessageCircle className='w-4 h-4 mb-0.5'/>
                       <span className='text-[10px] font-medium'>Msg</span>
                     </Link>

                     {/* Botão Entrevista para Pré-aprovados */}
                     {onSchedule && title === 'Pré-aprovados' ? (
                       <button 
                         className='flex flex-col items-center justify-center h-14 rounded-2xl bg-indigo-50 hover:bg-indigo-100 border-2 border-indigo-200 hover:border-indigo-300 text-indigo-700 transition-all' 
                         onClick={()=>onSchedule(app)}
                       >
                         <CalendarCheck className='w-4 h-4 mb-0.5'/>
                         <span className='text-[10px] font-medium'>Entrevista</span>
                       </button>
                     ) : (
                       <div className='flex flex-col items-center justify-center h-14 rounded-2xl bg-slate-50 border-2 border-slate-200 text-slate-400'>
                         <CalendarCheck className='w-4 h-4 mb-0.5'/>
                         <span className='text-[10px] font-medium'>Entrevista</span>
                       </div>
                     )}
                   </div>
                   )}

                   {/* Ações extras da entrevista */}
                   {title === 'Entrevista' && app.interview_date && (
                     <div className={`flex gap-2 pt-3 border-t-2 ${color === 'purple' ? 'border-purple-200' : 'border-slate-200'}`}>
                       {/* Botão Aprovar */}
                       {onApprove && (
                         <button 
                           className='flex-1 flex items-center justify-center gap-1.5 rounded-full border-2 border-blue-200 bg-white px-4 py-2 text-xs font-medium text-blue-600 shadow-sm transition-all hover:bg-blue-50 hover:border-blue-300'
                           onClick={()=>onApprove(app)}
                         >
                           <ThumbsUp className='w-3.5 h-3.5' />
                           <span>Aprovar</span>
                         </button>
                       )}
                       
                       {/* Botão Rejeitar */}
                       {onReject && (
                         <button 
                           className='flex-1 flex items-center justify-center gap-1.5 rounded-full border-2 border-red-200 bg-white px-4 py-2 text-xs font-medium text-red-600 shadow-sm transition-all hover:bg-red-50 hover:border-red-300'
                           onClick={()=>onReject(app)}
                         >
                           <ThumbsDown className='w-3.5 h-3.5' />
                           <span>Rejeitar</span>
                         </button>
                       )}
                       
                       {/* Menu Dropdown para Cancelar/Reprovar */}
                       <div className='relative'>
                         <button 
                           className='flex items-center justify-center w-10 h-10 rounded-full border-2 border-slate-200 bg-white text-slate-600 shadow-sm transition-all hover:bg-slate-50 hover:border-slate-300'
                           onClick={()=>setOpenMenuId(openMenuId === app.id ? null : app.id)}
                         >
                           {openMenuId === app.id ? <X className='w-4 h-4' /> : <MoreVertical className='w-4 h-4' />}
                         </button>
                         
                         {/* Dropdown Menu */}
                         {openMenuId === app.id && (
                           <div className='absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl border-2 border-slate-200 shadow-lg z-50'>
                             <button 
                               className='w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-blue-600 hover:bg-blue-50 transition-colors rounded-t-2xl border-b border-slate-100'
                               onClick={()=>{ onSchedule && onSchedule(app); setOpenMenuId(null); }}
                             >
                               <Calendar className='w-4 h-4' />
                               <span>Reagendar</span>
                             </button>
                             <button 
                               className='w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors rounded-b-2xl'
                               onClick={()=>{ onCancel && onCancel(app); setOpenMenuId(null); }}
                             >
                               <X className='w-4 h-4' />
                               <span>Cancelar</span>
                             </button>
                           </div>
                         )}
                       </div>
                     </div>
                   )}
                </div>
              )})}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
};

export default CompanyJobPipeline;
