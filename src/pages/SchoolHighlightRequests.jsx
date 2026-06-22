import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { jobs as jobsAPI } from '@/lib/api';
import { schoolApi } from '@/lib/schoolApi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { Star, Building2, Briefcase, Check, X, Clock, Users } from 'lucide-react';

const SchoolHighlightRequests = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedClassesByReq, setSelectedClassesByReq] = useState({});

  useEffect(() => {
    const load = async () => {
      if (!user || user.type !== 'school') return;
      try {
        const [reqRes, cls] = await Promise.all([
          jobsAPI.listPendingHighlightRequestsForSchool(),
          schoolApi.listClasses().catch(()=>[])
        ]);
        setRequests(reqRes.requests || []);
        setClasses(cls || []);
      } catch (e) {
        toast({ title: 'Erro ao carregar solicitações', description: e.message, variant: 'destructive' });
      } finally { setLoading(false); }
    };
    load();
  }, [user]);

  const approve = async (reqId) => {
    try {
      const classIds = selectedClassesByReq[reqId] || [];
      await jobsAPI.approveHighlightRequest(reqId, classIds);
      toast({ title: 'Solicitação aprovada' });
      setRequests(prev => prev.filter(r => r.id !== reqId));
    } catch (e) {
      toast({ title: 'Erro ao aprovar', description: e.message, variant: 'destructive' });
    }
  };

  const reject = async (reqId) => {
    try {
      await jobsAPI.rejectHighlightRequest(reqId);
      toast({ title: 'Solicitação rejeitada' });
      setRequests(prev => prev.filter(r => r.id !== reqId));
    } catch (e) {
      toast({ title: 'Erro ao rejeitar', description: e.message, variant: 'destructive' });
    }
  };

  const toggleClass = (reqId, classId) => {
    setSelectedClassesByReq(prev => {
      const current = new Set(prev[reqId] || []);
      if (current.has(classId)) current.delete(classId); else current.add(classId);
      return { ...prev, [reqId]: Array.from(current) };
    });
  };

  if (!user || user.type !== 'school') {
    return (
      <div className="min-h-screen bg-slate-50/80 py-10 px-4">
        <div className="mx-auto max-w-6xl">
          <Card className="rounded-[22px] border-2 border-slate-200 bg-white/90 shadow-[0_14px_35px_rgba(15,23,42,0.06)]">
            <CardContent className="p-6 text-center text-slate-600">
              Acesso restrito às escolas.
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Solicitações de Destaque - {user?.school_name || 'Escola'} - CurrículoJá</title>
        <meta name="description" content="Gerencie solicitações de destaque de vagas para sua escola." />
      </Helmet>

      <div className="min-h-screen bg-slate-50/80 py-10 px-4">
        <div className="mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Header */}
            <div className="mb-8 flex flex-col items-start justify-between gap-6 rounded-[24px] border-2 border-slate-200 bg-white/90 px-6 sm:px-8 py-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)] backdrop-blur-sm md:flex-row md:items-center">
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Gerenciamento</p>
                <h1 className="mb-1 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 md:text-4xl flex items-center gap-3">
                  <span className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 ring-2 ring-amber-200">
                    <Star className="w-5 h-5 sm:w-6 sm:h-6" />
                  </span>
                  Solicitações de <span className="text-[#2563eb]">Destaque</span>
                </h1>
                <p className="text-xs sm:text-sm text-slate-500">Empresas que desejam destacar vagas para seus alunos</p>
              </div>
              {requests.length > 0 && (
                <span className="rounded-full bg-amber-50 px-4 py-2 text-xs font-bold text-amber-700 ring-2 ring-amber-200">
                  {requests.length} pendente{requests.length > 1 ? 's' : ''}
                </span>
              )}
            </div>

            {/* Loading */}
            {loading ? (
              <div className="py-16 text-center">
                <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-[#2563eb]"></div>
                <p className="mt-4 text-sm text-slate-500">Carregando solicitações...</p>
              </div>
            ) : requests.length === 0 ? (
              <Card className="rounded-[22px] border-2 border-slate-200 bg-white/90 shadow-[0_14px_35px_rgba(15,23,42,0.06)]">
                <CardContent className="py-16 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 ring-2 ring-slate-200">
                    <Star className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-700 mb-2">Nenhuma solicitação pendente</h3>
                  <p className="text-sm text-slate-500 max-w-sm mx-auto">
                    Quando empresas solicitarem destaque de vagas para seus alunos, elas aparecerão aqui.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 sm:gap-5 grid-cols-1 lg:grid-cols-2">
                {requests.map((r, index) => {
                  // Verificar formato do avatar da empresa
                  let companyAvatarShape = 'square';
                  try {
                    if (typeof window !== 'undefined') {
                      companyAvatarShape = localStorage.getItem('company_avatar_shape_' + r.company_id) || 'square';
                    }
                  } catch {}
                  const isCircle = companyAvatarShape === 'circle';
                  const avatarRounded = isCircle ? 'rounded-full' : 'rounded-xl';
                  const avatarObjectFit = isCircle ? 'object-cover' : 'object-contain';
                  const avatarPad = isCircle ? '' : 'p-1';
                  
                  return (
                  <motion.div
                    key={r.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4, delay: index * 0.05 }}
                  >
                    <Card className="h-full rounded-[22px] border-2 border-amber-100 bg-white/95 shadow-[0_14px_35px_rgba(15,23,42,0.06)] transition-all hover:-translate-y-[2px] hover:border-amber-300 hover:shadow-[0_20px_45px_rgba(15,23,42,0.12)]">
                      <CardContent className="p-5 sm:p-6">
                        {/* Header da Vaga */}
                        <div className="flex items-start gap-3 sm:gap-4 mb-4">
                          <div className={`w-12 h-12 sm:w-14 sm:h-14 overflow-hidden flex items-center justify-center shrink-0 ${isCircle ? 'rounded-full' : 'rounded-xl'}`}>
                            {r.company_logo || r.company_avatar ? (
                              <img 
                                src={r.company_logo || r.company_avatar} 
                                alt={r.company_name}
                                className={`w-full h-full ${isCircle ? 'object-cover rounded-full' : 'object-contain rounded-xl'}`}
                              />
                            ) : (
                              <div className={`w-full h-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center ${isCircle ? 'rounded-full' : 'rounded-xl'}`}>
                                <Building2 className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-base sm:text-lg text-slate-900 line-clamp-2">
                              {r.job_title}
                            </h3>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs sm:text-sm text-slate-500 font-medium">{r.company_name}</span>
                            </div>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div className="mb-4">
                          <div className="inline-flex items-center gap-2 text-[11px] sm:text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded-xl ring-1 ring-amber-200 font-medium">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Aguardando sua aprovação</span>
                          </div>
                        </div>

                        {/* Mensagem */}
                        {r.message && (
                          <div className="mb-4 p-3 sm:p-4 rounded-xl bg-slate-50 border-2 border-slate-100">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400 mb-1">Mensagem da empresa</p>
                            <p className="text-xs sm:text-sm text-slate-700">{r.message}</p>
                          </div>
                        )}

                        {/* Seleção de Turmas */}
                        {classes.length > 0 && (
                          <div className="mb-5">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400 mb-2 flex items-center gap-1.5">
                              <Users className="w-3.5 h-3.5" />
                              Selecionar turmas (opcional)
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {classes.map(c => (
                                <button
                                  key={c.id}
                                  className={`px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-medium transition-all duration-200 border-2 ${
                                    (selectedClassesByReq[r.id]||[]).includes(c.id) 
                                      ? 'bg-amber-100 border-amber-400 text-amber-800 ring-1 ring-amber-200' 
                                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                                  }`}
                                  onClick={()=>toggleClass(r.id, c.id)}
                                >
                                  {c.name}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Botões */}
                        <div className="flex gap-2 sm:gap-3">
                          <Button
                            onClick={()=>approve(r.id)}
                            className="flex-1 rounded-full border border-emerald-200 bg-emerald-500/5 text-xs sm:text-sm font-bold text-emerald-600 shadow-sm shadow-emerald-100 hover:border-emerald-400 hover:bg-emerald-500 hover:text-white hover:shadow-md hover:shadow-emerald-200 transition-all duration-300 py-2.5"
                          >
                            <Check className="w-4 h-4 mr-1.5" />
                            Aprovar
                          </Button>
                          <Button
                            variant="outline"
                            onClick={()=>reject(r.id)}
                            className="flex-1 rounded-full border border-red-200 bg-red-500/5 text-xs sm:text-sm font-bold text-red-600 shadow-sm shadow-red-100 hover:border-red-400 hover:bg-red-500 hover:text-white hover:shadow-md hover:shadow-red-200 transition-all duration-300 py-2.5"
                          >
                            <X className="w-4 h-4 mr-1.5" />
                            Rejeitar
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </>
  );
};

export default SchoolHighlightRequests;
