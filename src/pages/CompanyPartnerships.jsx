import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet';
import { partnershipsApi } from '../services/partnershipsApi';
import { Users, GraduationCap, Check, X, Clock, Bell, Building2, ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function CompanyPartnerships() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [partnerships, setPartnerships] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active');

  useEffect(() => {
    loadPartnerships();
  }, []);

  const loadPartnerships = async () => {
    try {
      setLoading(true);
      const [active, pending] = await Promise.all([
        partnershipsApi.company.listPartnerships('accepted'),
        partnershipsApi.company.listPartnerships('pending')
      ]);
      setPartnerships(active);
      setPendingRequests(pending);
    } catch (error) {
      console.error('[CompanyPartnerships] Erro ao carregar parcerias:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (partnershipId) => {
    try {
      await partnershipsApi.company.acceptPartnership(partnershipId);
      await loadPartnerships();
    } catch (error) {
      alert(error.message);
    }
  };

  const handleReject = async (partnershipId) => {
    if (!confirm('Deseja realmente recusar/cancelar esta parceria?')) return;
    
    try {
      await partnershipsApi.company.removePartnership(partnershipId);
      await loadPartnerships();
    } catch (error) {
      alert(error.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50/80 py-10 px-4">
        <div className="mx-auto max-w-6xl">
          <div className="py-16 text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-[#2563eb]"></div>
            <p className="mt-4 text-sm text-slate-500">Carregando parcerias...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Escolas Parceiras - {user?.companyName || 'Empresa'} - CurrículoJá</title>
        <meta name="description" content="Gerencie parcerias com escolas para suas vagas." />
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
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Parcerias</p>
                <h1 className="mb-1 text-2xl sm:text-3xl font-bold tracking-tight text-[#2563eb] md:text-4xl flex items-center gap-3">
                  <span className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 ring-2 ring-emerald-200">
                    <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6" />
                  </span>
                  Escolas Parceiras
                </h1>
                <p className="text-xs sm:text-sm text-slate-500">Suas vagas aparecem destacadas para alunos de escolas parceiras</p>
              </div>
              <div className="flex items-center gap-3">
                {partnerships.length > 0 && (
                  <span className="rounded-full bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-700 ring-2 ring-emerald-200">
                    {partnerships.length} ativa{partnerships.length > 1 ? 's' : ''}
                  </span>
                )}
                {pendingRequests.length > 0 && (
                  <span className="rounded-full bg-amber-50 px-4 py-2 text-xs font-bold text-amber-700 ring-2 ring-amber-200">
                    {pendingRequests.length} pendente{pendingRequests.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>

            {/* Notificação de Pendentes */}
            {pendingRequests.filter(p => p.requested_by === 'school').length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
              >
                <Card className="mb-6 rounded-[20px] border-2 border-amber-200 bg-amber-50/80 shadow-[0_14px_35px_rgba(245,158,11,0.08)]">
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 ring-2 ring-amber-200">
                        <Bell className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-amber-900">
                          {pendingRequests.filter(p => p.requested_by === 'school').length} escola{pendingRequests.filter(p => p.requested_by === 'school').length > 1 ? 's' : ''} solicitou parceria com você
                        </p>
                        <p className="text-xs text-amber-700/80 mt-0.5">Responda às solicitações na aba "Solicitações"</p>
                      </div>
                      <Button
                        onClick={() => setActiveTab('pending')}
                        size="sm"
                        className="rounded-full border-2 border-amber-400 bg-amber-500 px-4 text-xs font-bold text-white shadow-sm hover:bg-amber-600 hover:border-amber-500"
                      >
                        Ver agora
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Tabs - Estilo pílula como na imagem */}
            <div className="mb-6 flex gap-3">
              <button
                onClick={() => setActiveTab('active')}
                className={`px-5 sm:px-6 py-3 rounded-[20px] text-sm sm:text-base font-bold transition-all duration-200 flex items-center gap-2 shadow-sm ${
                  activeTab === 'active'
                    ? 'bg-[#2563eb] text-white shadow-md shadow-sky-200'
                    : 'bg-white text-slate-600 hover:bg-slate-50 border-2 border-slate-200'
                }`}
              >
                <Users className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>Vagas</span>
                {partnerships.length > 0 && (
                  <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${
                    activeTab === 'active' ? 'bg-white/20 text-white' : 'bg-emerald-50 text-emerald-700'
                  }`}>
                    {partnerships.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('pending')}
                className={`px-5 sm:px-6 py-3 rounded-[20px] text-sm sm:text-base font-bold transition-all duration-200 flex items-center gap-2 shadow-sm ${
                  activeTab === 'pending'
                    ? 'bg-[#d97706] text-white shadow-md shadow-amber-200'
                    : 'bg-white text-slate-600 hover:bg-slate-50 border-2 border-slate-200'
                }`}
              >
                <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden xs:inline">Destacadas</span>
                {pendingRequests.length > 0 && (
                  <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${
                    activeTab === 'pending' ? 'bg-white/20 text-white' : 'bg-amber-50 text-amber-700'
                  }`}>
                    {pendingRequests.length}
                  </span>
                )}
              </button>
            </div>

            {/* Parcerias Ativas */}
            {activeTab === 'active' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                {partnerships.length === 0 ? (
                  <Card className="rounded-[22px] border-2 border-slate-200 bg-white/90 shadow-[0_14px_35px_rgba(15,23,42,0.06)]">
                    <CardContent className="py-16 text-center">
                      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 ring-2 ring-slate-200">
                        <GraduationCap className="w-8 h-8" />
                      </div>
                      <h3 className="text-lg font-semibold text-slate-700 mb-2">Nenhuma parceria ativa</h3>
                      <p className="text-sm text-slate-500 max-w-sm mx-auto">
                        Quando você estabelecer parcerias com escolas, elas aparecerão aqui.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                    {partnerships.map((partnership, index) => (
                      <motion.div
                        key={partnership.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.4, delay: index * 0.05 }}
                      >
                        <Card className="h-full rounded-[22px] border-2 border-emerald-100 bg-white/95 shadow-[0_14px_35px_rgba(15,23,42,0.06)] transition-all hover:-translate-y-[2px] hover:border-emerald-300 hover:shadow-[0_20px_45px_rgba(15,23,42,0.12)]">
                          <CardContent className="p-5 sm:p-6">
                            {/* Header com foto */}
                            <div className="flex items-center gap-3 sm:gap-4 mb-4">
                              {partnership.avatar_url ? (
                                <img 
                                  src={partnership.avatar_url} 
                                  alt={partnership.school_name || partnership.name}
                                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover ring-2 ring-emerald-200 shadow-sm"
                                />
                              ) : (
                                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md ring-2 ring-emerald-200">
                                  <GraduationCap className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-sm sm:text-base text-slate-900 truncate">
                                  {partnership.school_name || partnership.name}
                                </h3>
                                <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 truncate">
                                  {partnership.school_city && partnership.school_state 
                                    ? `${partnership.school_city}, ${partnership.school_state}`
                                    : partnership.email || 'Escola parceira'
                                  }
                                </p>
                              </div>
                            </div>

                            {/* Status Badge */}
                            <div className="mb-4">
                              <div className="inline-flex items-center gap-2 text-[11px] sm:text-xs text-emerald-700 bg-emerald-50 px-3 py-2 rounded-xl ring-1 ring-emerald-200 font-medium">
                                <Check className="w-3.5 h-3.5" />
                                <span>Parceria Ativa</span>
                              </div>
                            </div>

                            {/* Data */}
                            <p className="text-[10px] sm:text-[11px] text-slate-400 mb-4 font-medium">
                              Desde {new Date(partnership.created_at).toLocaleDateString('pt-BR')}
                            </p>

                            {/* Botões */}
                            <div className="space-y-2">
                              <Button
                                onClick={() => navigate(`/company/schools/${partnership.school_id}`)}
                                className="w-full rounded-xl border-2 border-[#2563eb] bg-[#2563eb] py-2.5 text-xs sm:text-sm font-semibold text-white shadow-md shadow-sky-200 transition-all hover:-translate-y-[1px] hover:bg-[#1d4ed8] hover:border-[#1d4ed8]"
                              >
                                <Users className="w-4 h-4 mr-2" />
                                Ver Alunos
                              </Button>
                              <button
                                onClick={() => handleReject(partnership.id)}
                                className="w-full px-4 py-2 text-[11px] sm:text-xs text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors font-medium"
                              >
                                Cancelar Parceria
                              </button>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* Solicitações Pendentes */}
            {activeTab === 'pending' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                {pendingRequests.length === 0 ? (
                  <Card className="rounded-[22px] border-2 border-slate-200 bg-white/90 shadow-[0_14px_35px_rgba(15,23,42,0.06)]">
                    <CardContent className="py-16 text-center">
                      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 ring-2 ring-slate-200">
                        <Clock className="w-8 h-8" />
                      </div>
                      <h3 className="text-lg font-semibold text-slate-700 mb-2">Nenhuma solicitação pendente</h3>
                      <p className="text-sm text-slate-500 max-w-sm mx-auto">
                        As solicitações de parceria aparecerão aqui.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                    {pendingRequests.map((partnership, index) => (
                      <motion.div
                        key={partnership.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.4, delay: index * 0.05 }}
                      >
                        <Card className="h-full rounded-[22px] border-2 border-amber-200 bg-white/95 shadow-[0_14px_35px_rgba(15,23,42,0.06)] transition-all hover:-translate-y-[2px] hover:border-amber-300 hover:shadow-[0_20px_45px_rgba(15,23,42,0.12)]">
                          <CardContent className="p-5 sm:p-6">
                            {/* Header com foto */}
                            <div className="flex items-center gap-3 sm:gap-4 mb-4">
                              {partnership.avatar_url ? (
                                <img 
                                  src={partnership.avatar_url} 
                                  alt={partnership.school_name || partnership.name}
                                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl object-cover ring-2 ring-amber-200 shadow-sm"
                                />
                              ) : (
                                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-md ring-2 ring-amber-200">
                                  <GraduationCap className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-sm sm:text-base text-slate-900 truncate">
                                  {partnership.school_name || partnership.name}
                                </h3>
                                <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 truncate">
                                  {partnership.school_city && partnership.school_state 
                                    ? `${partnership.school_city}, ${partnership.school_state}`
                                    : partnership.email || ''
                                  }
                                </p>
                              </div>
                            </div>

                            {/* Status Badge */}
                            <div className="mb-4">
                              <div className="inline-flex items-center gap-2 text-[11px] sm:text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded-xl ring-1 ring-amber-200 font-medium">
                                <Clock className="w-3.5 h-3.5" />
                                <span>
                                  {partnership.requested_by === 'school' 
                                    ? 'Solicitou parceria'
                                    : 'Aguardando resposta'
                                  }
                                </span>
                              </div>
                            </div>

                            {/* Data */}
                            <p className="text-[10px] sm:text-[11px] text-slate-400 mb-4 font-medium">
                              {new Date(partnership.created_at).toLocaleDateString('pt-BR')}
                            </p>

                            {/* Botões */}
                            {partnership.requested_by === 'school' ? (
                              <div className="flex gap-2">
                                <Button
                                  onClick={() => handleAccept(partnership.id)}
                                  className="flex-1 rounded-xl border-2 border-emerald-500 bg-emerald-500 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-md shadow-emerald-200 transition-all hover:-translate-y-[1px] hover:bg-emerald-600 hover:border-emerald-600"
                                >
                                  <Check className="w-4 h-4 mr-1.5" />
                                  Aceitar
                                </Button>
                                <Button
                                  onClick={() => handleReject(partnership.id)}
                                  variant="outline"
                                  className="flex-1 rounded-xl border-2 border-red-200 bg-white py-2.5 text-xs sm:text-sm font-semibold text-red-600 transition-all hover:-translate-y-[1px] hover:bg-red-50 hover:border-red-300"
                                >
                                  <X className="w-4 h-4 mr-1.5" />
                                  Recusar
                                </Button>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleReject(partnership.id)}
                                className="w-full px-4 py-2.5 text-xs sm:text-sm text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors font-medium border-2 border-red-100"
                              >
                                Cancelar Solicitação
                              </button>
                            )}
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>
    </>
  );
}
