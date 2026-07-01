import React, { useEffect, useState, useCallback } from 'react';
import { applicationsAPI } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, CheckCircle2, AlertCircle, RefreshCcw, Clock, Building, XCircle, Trash2, MessageCircle, Video, MapPin, FileText, Link as LinkIcon, ExternalLink, X } from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * Componente isolado para entrevistas agendadas do candidato.
 * Regras:
 * - Sempre busca /applications/interviews (fallback tratado no backend).
 * - Qualquer item com interview_date aparece.
 * - Estado da confirmação: aguardando -> confirmada -> expirada (se passou a data sem confirmar) -> concluída (se passou confirmada).
 * - Confirmação é idempotente; atualiza local imediatamente e dispara evento global.
 */
export default function CandidateInterviewsSection() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [interviews, setInterviews] = useState([]);
  const [error, setError] = useState(null);
  const [confirming, setConfirming] = useState({});
  const [rejecting, setRejecting] = useState({});
  const [removing, setRemoving] = useState({});

  const parseLocal = (s) => {
    if(!s) return null;
    const cleaned = String(s).replace('T',' ').trim();
    const m = cleaned.match(/^(\d{4})-(\d{2})-(\d{2})[ ](\d{2}):(\d{2})(?::(\d{2}))?/);
    if(!m) return null;
    const [,Y,M,D,H,Min,Sec] = m;
    return new Date(Number(Y), Number(M)-1, Number(D), Number(H), Number(Min), Number(Sec||0));
  };

  const load = useCallback(async (silent = false) => {
    if (!user || user.type !== 'candidate') {
      if (!silent) setLoading(false);
      return;
    }
    if (!silent) setLoading(true); setError(null);
    try {
      const resp = await applicationsAPI.listInterviews();
      console.log('🎤 CandidateInterviewsSection: Resposta API:', resp);
      // Backend retorna { upcoming: [...], history: [...] } - combinar os dois
      const upcoming = Array.isArray(resp.upcoming) ? resp.upcoming : [];
      const history = Array.isArray(resp.history) ? resp.history : [];
      const raw = [...upcoming, ...history];
      console.log('🎤 CandidateInterviewsSection: Total entrevistas:', raw.length);
      const normalized = raw.map(i => {
        const dt = i.interview_date ? parseLocal(i.interview_date) : null;
        const now = new Date();
        let confirmation_status = i.confirmation_status;
        if (!confirmation_status) {
          if (i.interview_canceled_by_company) {
            confirmation_status = 'canceled';
          } else if (i.interview_rejected_by_candidate) {
            confirmation_status = 'rejected';
          } else if (dt) {
            if (dt.getTime() < now.getTime()) {
              confirmation_status = i.interview_confirmed ? 'completed' : 'expired';
            } else {
              confirmation_status = i.interview_confirmed ? 'confirmed' : 'pending';
            }
          } else confirmation_status = 'pending';
        }
        return { ...i, confirmation_status };
      }).sort((a,b)=> {
        const ad = a.interview_date ? parseLocal(a.interview_date) : (a.updated_at ? new Date(a.updated_at) : null);
        const bd = b.interview_date ? parseLocal(b.interview_date) : (b.updated_at ? new Date(b.updated_at) : null);
        return (ad?.getTime()||0) - (bd?.getTime()||0);
      });
      // Filtrar entrevistas removidas localmente
      const removedKey = `removed_interviews_${user?.id}`;
      const removedIds = JSON.parse(localStorage.getItem(removedKey) || '[]');
      const filtered = normalized.filter(i => !removedIds.includes(i.id));
      setInterviews(filtered);
    } catch (e) {
      setError(e.message || 'Erro ao carregar');
    } finally { setLoading(false); }
  }, [user]);

  useEffect(()=>{ if (user && user.type === 'candidate') load(); }, [load, user]);
  // Refresh silencioso a cada 2min para captar reagendamentos
  useEffect(()=>{
    const t = setInterval(()=> load(true), 120000);
    return ()=> clearInterval(t);
  },[load]);

  // Recarrega ao voltar o foco na aba (captura reagendamento feito enquanto estava fora)
  useEffect(()=>{
    const onFocus = () => { console.log('[Entrevistas] Foco retomado, recarregando...'); load(); };
    window.addEventListener('focus', onFocus);
    return ()=> window.removeEventListener('focus', onFocus);
  }, [load]);

  const confirm = async (id) => {
    if (confirming[id]) return;
    setConfirming(c => ({ ...c, [id]: true }));
    try {
      // otimista
      setInterviews(prev => prev.map(i => i.id === id ? { ...i, interview_confirmed: true, confirmation_status: 'confirmed' } : i));
      const resp = await applicationsAPI.confirmInterview(id);
      if (!resp?.success) throw new Error('Falha na confirmação');
      if (resp.application) {
        setInterviews(prev => prev.map(i => i.id === id ? { ...i, ...resp.application } : i));
      }
      try { window.dispatchEvent(new CustomEvent('interview-confirmed', { detail: { id, application: resp.application || null } })); } catch {}
    } catch (e) {
      // revert se falha
      setInterviews(prev => prev.map(i => i.id === id ? { ...i, interview_confirmed: false, confirmation_status: 'pending' } : i));
      console.error('Erro confirmando entrevista', e);
      alert('Não foi possível confirmar agora.');
    } finally { setConfirming(c => ({ ...c, [id]: false })); }
  };

  const reject = async (id) => {
    if (rejecting[id]) return;
    if (!window.confirm('Tem certeza que deseja rejeitar esta entrevista?')) return;
    setRejecting(r => ({ ...r, [id]: true }));
    try {
      // otimista: marcar como rejeitada
      setInterviews(prev => prev.map(i => i.id === id ? { ...i, interview_rejected_by_candidate: true } : i));
      const resp = await applicationsAPI.rejectInterview(id);
      if (!resp?.success) throw new Error('Falha ao rejeitar');
      if (resp.application) {
        setInterviews(prev => prev.map(i => i.id === id ? { ...i, ...resp.application } : i));
        try { window.dispatchEvent(new CustomEvent('interview-rejected', { detail: { id, application: resp.application } })); } catch {}
      }
    } catch (e) {
      console.error('Erro rejeitando entrevista', e);
      alert('Não foi possível rejeitar agora.');
    } finally {
      setRejecting(r => ({ ...r, [id]: false }));
    }
  };

  // Função para remover entrevista expirada da lista (apenas localmente)
  const removeExpired = async (id) => {
    if (removing[id]) return;
    if (!window.confirm('Remover esta entrevista expirada da lista?')) return;
    setRemoving(r => ({ ...r, [id]: true }));
    try {
      // Remove apenas localmente - a entrevista permanece no histórico do backend
      setInterviews(prev => prev.filter(i => i.id !== id));
      // Salvar IDs removidos no localStorage para persistir entre sessões
      const removedKey = `removed_interviews_${user?.id}`;
      const removed = JSON.parse(localStorage.getItem(removedKey) || '[]');
      if (!removed.includes(id)) {
        removed.push(id);
        localStorage.setItem(removedKey, JSON.stringify(removed));
      }
    } catch (e) {
      console.error('Erro removendo entrevista', e);
    } finally {
      setRemoving(r => ({ ...r, [id]: false }));
    }
  };

  const badge = (i) => {
    const base = 'text-[10px] px-2 py-0.5 rounded-full font-medium';
    switch(i.confirmation_status){
      case 'confirmed': return <span className={base+ ' bg-green-100 text-green-700'}>Confirmada</span>;
      case 'pending': return <span className={base+ ' bg-yellow-100 text-yellow-700'}>Aguardando confirmação</span>;
      case 'expired': return <span className={base+ ' bg-red-100 text-red-700'}>Expirada</span>;
      case 'completed': return <span className={base+ ' bg-slate-200 text-slate-700'}>Concluída</span>;
      default: return <span className={base+ ' bg-gray-100 text-gray-600'}>{i.confirmation_status}</span>;
    }
  };

  const countdown = (dateStr) => {
    if (!dateStr) return '';
    const d = parseLocal(dateStr);
    if(!d) return '';
    const diff = d.getTime() - Date.now();
    if (diff <= 0) return 'agora';
    const mins = Math.floor(diff/60000);
    if (mins < 60) return mins + 'm';
    const h = Math.floor(mins/60);
    if (h < 24) return h + 'h';
    return Math.floor(h/24)+'d';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.25 }}
      className="mb-5"
    >
      <Card className="rounded-2xl hover:shadow-lg transition-shadow bg-white">
        <CardHeader className="pb-4 bg-violet-50 rounded-t-2xl">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="flex items-center text-base font-semibold text-violet-900">
              <div className="mr-3 w-10 h-10 rounded-xl bg-gradient-to-br from-violet-100 to-violet-200 flex items-center justify-center shadow-sm border-2 border-violet-300">
                <Calendar className="w-5 h-5 text-violet-600 stroke-[2.5]" />
              </div>
              Entrevistas Agendadas
            </CardTitle>
            <Button 
              onClick={load} 
              variant="outline"
              size="sm"
              className="rounded-full border-2 border-violet-200 bg-violet-500/5 px-4 text-[11px] font-bold text-violet-700 shadow-sm shadow-violet-100 hover:border-violet-400 hover:bg-violet-500 hover:text-white hover:shadow-md hover:shadow-violet-200 transition-all duration-300"
            >
              <RefreshCcw className="w-3 h-3 mr-1.5" /> Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-5">
          {loading && (
            <div className="text-center py-10 flex flex-col items-center justify-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-violet-100 flex items-center justify-center border-2 border-violet-200">
                <RefreshCcw className="w-5 h-5 text-violet-500 animate-spin" />
              </div>
              <p className="text-sm text-gray-600 font-medium">Carregando entrevistas...</p>
            </div>
          )}
          {error && !loading && (
            <div className="p-4 bg-red-50 border-2 border-red-200 rounded-2xl text-sm text-red-700 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="font-semibold">Erro ao carregar</p>
                <p className="text-xs text-red-600">{error}</p>
              </div>
            </div>
          )}
          {!loading && !error && interviews.length === 0 && (
            <div className="text-center py-12 flex flex-col items-center justify-center gap-3">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gray-50 to-slate-100 flex items-center justify-center border-2 border-gray-200">
                <Calendar className="w-8 h-8 text-gray-400" />
              </div>
              <div>
                <p className="text-gray-800 font-semibold">Nenhuma entrevista agendada</p>
                <p className="text-sm text-gray-500 mt-1">Quando você tiver entrevistas, elas aparecerão aqui</p>
              </div>
            </div>
          )}
          {!loading && !error && interviews.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
              {interviews.map((i, index) => {
                // Use unique key combining id and index to avoid duplicates
                const uniqueKey = `${i.id}-${index}`;
                const dt = i.interview_date ? parseLocal(i.interview_date) : null;
                const rawDateStr = i.interview_date ? String(i.interview_date) : '';
                const formatLiteral = (s) => {
                  if(!s) return '—';
                  const cleaned = s.replace('T',' ').trim();
                  const m = cleaned.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})(?::(\d{2}))?/);
                  if(!m) return s;
                  const [,Y,M,D,H,Min] = m;
                  return `${D}/${M}/${Y.slice(2)} ${H}:${Min}`;
                };
                const isPending = i.confirmation_status === 'pending' && !i.interview_confirmed;
                const isConfirmed = i.interview_confirmed || i.confirmation_status === 'confirmed';
                const isExpired = i.confirmation_status === 'expired';
                const isCompleted = i.confirmation_status === 'completed';
                const isCanceledByCompany = i.interview_canceled_by_company;
                const isRejectedByCandidate = i.interview_rejected_by_candidate;
                const recentlyRescheduled = i.interview_rescheduled && dt && (Date.now() - (new Date(i.updated_at || Date.now())).getTime()) < 1000*60*60*24;
                
                // Determinar cor do card baseado no status
                const cardBorderColor = 'border-violet-200';
                const cardBgColor = 'bg-white';
                let statusIcon = null;
                let statusLabel = '';
                let statusColors = '';
                
                if (isExpired) {
                  statusIcon = <XCircle size={14} className="text-red-500" />;
                  statusLabel = 'Expirada';
                  statusColors = 'bg-red-100 text-red-700 border-red-200';
                } else if (isCanceledByCompany) {
                  statusIcon = <XCircle size={14} className="text-rose-500" />;
                  statusLabel = 'Cancelada';
                  statusColors = 'bg-rose-100 text-rose-700 border-rose-200';
                } else if (isRejectedByCandidate) {
                  statusIcon = <XCircle size={14} className="text-gray-500" />;
                  statusLabel = 'Rejeitada';
                  statusColors = 'bg-gray-100 text-gray-700 border-gray-200';
                } else if (isConfirmed) {
                  statusIcon = <CheckCircle2 size={14} className="text-green-500" />;
                  statusLabel = 'Confirmada';
                  statusColors = 'bg-green-100 text-green-700 border-green-200';
                } else if (isCompleted) {
                  statusIcon = <CheckCircle2 size={14} className="text-slate-500" />;
                  statusLabel = 'Concluída';
                  statusColors = 'bg-slate-100 text-slate-700 border-slate-200';
                } else if (isPending) {
                  statusIcon = <Clock size={14} className="text-amber-500" />;
                  statusLabel = 'Aguardando';
                  statusColors = 'bg-amber-100 text-amber-700 border-amber-200';
                }
                
                return (
                  <motion.div
                    key={uniqueKey}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ y: -4 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className={`relative p-4 rounded-2xl border-2 ${cardBorderColor} ${cardBgColor} transition-colors duration-300 hover:border-violet-400 hover:shadow-lg hover:shadow-violet-200/50`}
                  >
                    {/* Botão Fechar - canto superior direito, apenas quando dispensável */}
                    {(isConfirmed || isExpired || isCanceledByCompany || isRejectedByCandidate || isCompleted) && (
                      <button
                        disabled={removing[i.id]}
                        onClick={() => removeExpired(i.id)}
                        title="Fechar"
                        className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-red-100 hover:border-red-300 hover:text-red-500 transition-all duration-200 z-10"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Header com título, empresa e badge de status */}
                    <div className="flex items-start gap-3 mb-3 pr-10">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center flex-shrink-0 border-2 border-indigo-200">
                        <Building className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-gray-900 text-sm leading-tight line-clamp-2">
                          {i.job_title || 'Vaga de entrevista'}
                        </h3>
                        {i.company_name && (
                          <p className="text-xs text-gray-600 mt-0.5 truncate">{i.company_name}</p>
                        )}
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border mt-1.5 ${statusColors}`}>
                          {statusIcon}
                          {statusLabel}
                        </div>
                      </div>
                    </div>
                    
                    {/* Info Grid */}
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      {/* Data/Hora */}
                      <div className="flex items-center gap-2 p-2.5 rounded-2xl bg-white border-2 border-violet-200">
                        <div className="w-8 h-8 rounded-xl bg-violet-50 flex items-center justify-center">
                          <Calendar className="w-4 h-4 text-violet-500" />
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-500 font-medium uppercase">Data/Hora</p>
                          <p className="text-xs font-semibold text-gray-800">{formatLiteral(rawDateStr)}</p>
                        </div>
                      </div>
                      
                      {/* Modalidade */}
                      <div className="flex items-center gap-2 p-2.5 rounded-2xl bg-white border-2 border-violet-200">
                        <div className="w-8 h-8 rounded-xl bg-violet-50 flex items-center justify-center">
                          {i.interview_mode === 'online' && <Video className="w-4 h-4 text-violet-500" />}
                          {i.interview_mode === 'presencial' && <MapPin className="w-4 h-4 text-violet-500" />}
                          {(!i.interview_mode || i.interview_mode === 'hibrido') && <Video className="w-4 h-4 text-violet-500" />}
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-500 font-medium uppercase">Modalidade</p>
                          <p className="text-xs font-semibold text-gray-800 capitalize">{i.interview_mode || 'Online'}</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Countdown */}
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-[11px] px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-700 font-semibold border border-indigo-200">
                        <Clock className="w-3 h-3 inline mr-1" />
                        em {countdown(i.interview_date)}
                      </span>
                      {recentlyRescheduled && (
                        <span className="text-[11px] px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 font-semibold border border-orange-200">
                          Nova data
                        </span>
                      )}
                      {i.interview_rescheduled && !recentlyRescheduled && (
                        <span className="text-[11px] px-2.5 py-1 rounded-full bg-orange-50 text-orange-600 font-medium border border-orange-100">
                          Reagendada
                        </span>
                      )}
                    </div>
                    
                    {/* Link para entrevista online */}
                    {i.interview_mode === 'online' && i.interview_link && (
                      <div className="mb-3 p-2.5 rounded-xl bg-blue-50/70 border border-blue-100">
                        <div className="flex items-center gap-2">
                          <LinkIcon className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                          <a 
                            href={i.interview_link} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-xs text-blue-600 hover:text-blue-800 hover:underline truncate flex items-center gap-1 font-medium"
                          >
                            <span className="truncate">{i.interview_link.replace(/^https?:\/\//,'').substring(0, 40)}...</span>
                            <ExternalLink className="w-3 h-3 flex-shrink-0" />
                          </a>
                        </div>
                      </div>
                    )}
                    
                    {/* Endereço presencial */}
                    {(i.interview_mode === 'presencial' || i.interview_mode === 'hibrido') && i.interview_location && (
                      <div className="mb-3 p-2.5 rounded-xl bg-rose-50/70 border border-rose-100">
                        <div className="flex items-start gap-2">
                          <MapPin className="w-3.5 h-3.5 text-rose-600 mt-0.5 flex-shrink-0" />
                          <p className="text-xs text-rose-700 font-medium line-clamp-2">{i.interview_location}</p>
                        </div>
                      </div>
                    )}
                    
                    {/* Notas */}
                    {i.interview_notes && (
                      <div className="mb-3 p-2.5 rounded-xl bg-violet-50/70 border border-violet-100">
                        <div className="flex items-start gap-2">
                          <FileText className="w-3.5 h-3.5 text-violet-600 mt-0.5 flex-shrink-0" />
                          <p className="text-xs text-violet-700 line-clamp-2">{i.interview_notes}</p>
                        </div>
                      </div>
                    )}
                    
                    {/* Motivo do cancelamento */}
                    {isCanceledByCompany && (
                      <div className="mb-3 p-3 rounded-xl bg-rose-100/70 border border-rose-200">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-xs font-semibold text-rose-800">Cancelada pela empresa</p>
                            <p className="text-xs text-rose-700 mt-0.5">
                              {i.interview_cancel_reason?.trim() || 'Motivo não informado'}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Botões de ação */}
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200">
                      {/* Confirmar - apenas se pendente */}
                      {isPending && !isCanceledByCompany && !isRejectedByCandidate && (
                        <Button 
                          size="sm" 
                          disabled={confirming[i.id]} 
                          onClick={()=>confirm(i.id)}
                          className="rounded-full border-2 border-green-200 bg-green-500/10 text-xs font-bold text-green-600 shadow-sm shadow-green-100 hover:border-green-400 hover:bg-green-500 hover:text-white hover:shadow-md hover:shadow-green-200 transition-all duration-300 h-8 px-3"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                          {confirming[i.id] ? 'Confirmando...' : 'Confirmar'}
                        </Button>
                      )}
                      
                      {/* Rejeitar - apenas se pendente */}
                      {isPending && !isCanceledByCompany && !isRejectedByCandidate && (
                        <Button 
                          size="sm" 
                          disabled={rejecting[i.id]} 
                          onClick={()=>reject(i.id)}
                          className="rounded-full border-2 border-red-200 bg-red-500/10 text-xs font-bold text-red-600 shadow-sm shadow-red-100 hover:border-red-400 hover:bg-red-500 hover:text-white hover:shadow-md hover:shadow-red-200 transition-all duration-300 h-8 px-3"
                        >
                          <XCircle className="w-3.5 h-3.5 mr-1" />
                          {rejecting[i.id] ? 'Rejeitando...' : 'Rejeitar'}
                        </Button>
                      )}
                      
                      {/* Chat - sempre disponível */}
                      <Button 
                        size="sm" 
                        onClick={()=> window.location.href='/my-messages'}
                        className="rounded-full border-2 border-indigo-200 bg-indigo-500/10 text-xs font-bold text-indigo-600 shadow-sm shadow-indigo-100 hover:border-indigo-400 hover:bg-indigo-500 hover:text-white hover:shadow-md hover:shadow-indigo-200 transition-all duration-300 h-8 px-3"
                      >
                        <MessageCircle className="w-3.5 h-3.5 mr-1" />
                        Chat
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
