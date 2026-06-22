import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LayoutGroup, motion } from 'framer-motion';
import { Helmet } from 'react-helmet';
import { partnershipsApi } from '../services/partnershipsApi';
import { Users, Building2, Check, X, Clock, Bell, Briefcase, ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function SchoolPartnerships() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [partnerships, setPartnerships] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active'); // active, pending

  const getCompanyAvatarConfig = (companyId, shapeFromApi) => {
    let shape = shapeFromApi || 'circle';
    try {
      if (!shapeFromApi && typeof window !== 'undefined' && companyId) {
        shape = localStorage.getItem('company_avatar_shape_' + companyId) || 'circle';
      }
    } catch {}
    const isCircle = shape === 'circle';
    return {
      isCircle,
      rounded: isCircle ? 'rounded-full' : 'rounded-2xl',
      objectFit: isCircle ? 'object-cover' : 'object-contain',
      pad: isCircle ? '' : 'p-1.5',
    };
  };

  useEffect(() => {
    console.log('[SchoolPartnerships] Usuário logado:', user);
    console.log('[SchoolPartnerships] ID do usuário:', user?.id);
    console.log('[SchoolPartnerships] Tipo do usuário:', user?.type);
    loadPartnerships();
  }, []);

  const loadPartnerships = async () => {
    try {
      setLoading(true);
      console.log('[SchoolPartnerships] Carregando parcerias...');
      const [active, pending] = await Promise.all([
        partnershipsApi.school.listPartnerships('accepted'),
        partnershipsApi.school.listPartnerships('pending')
      ]);
      console.log('[SchoolPartnerships] Parcerias ativas:', active);
      console.log('[SchoolPartnerships] Parcerias pendentes:', pending);
      setPartnerships(active);
      setPendingRequests(pending);
    } catch (error) {
      console.error('[SchoolPartnerships] Erro ao carregar parcerias:', error);
      alert('Erro ao carregar parcerias: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (partnershipId) => {
    try {
      await partnershipsApi.school.acceptPartnership(partnershipId);
      await loadPartnerships();
    } catch (error) {
      alert(error.message);
    }
  };

  const handleReject = async (partnershipId) => {
    if (!confirm('Deseja realmente recusar/cancelar esta parceria?')) return;
    
    try {
      await partnershipsApi.school.removePartnership(partnershipId);
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
        <title>Empresas Parceiras - {user?.school_name || 'Escola'} - CurrículoJá</title>
        <meta name="description" content="Gerencie parcerias com empresas para suas vagas." />
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
                  <span className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 ring-2 ring-blue-200">
                    <Building2 className="w-5 h-5 sm:w-6 sm:h-6" />
                  </span>
                  Empresas Parceiras
                </h1>
                <p className="text-xs sm:text-sm text-slate-500">Vagas de empresas parceiras aparecem destacadas para seus alunos</p>
              </div>
              <div className="flex items-center gap-3">
                {partnerships.length > 0 && (
                  <span className="rounded-full bg-blue-50 px-4 py-2 text-xs font-bold text-blue-700 ring-2 ring-blue-200">
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
            {pendingRequests.filter(p => p.requested_by === 'company').length > 0 && (
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
                          {pendingRequests.filter(p => p.requested_by === 'company').length} empresa{pendingRequests.filter(p => p.requested_by === 'company').length > 1 ? 's' : ''} solicitou parceria com você
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

            {/* Tabs - mesmo design (Vagas / Destacadas) */}
            <LayoutGroup id="school-partnerships-tabs">
              <div
                className="mb-6"
                role="tablist"
                aria-label="Alternar entre parcerias e solicitações"
              >
                <div className="relative inline-flex items-center gap-1 rounded-full bg-gray-100 shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)] p-1.5">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === 'active'}
                    onClick={() => setActiveTab('active')}
                    className={`relative inline-flex items-center justify-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
                      activeTab === 'active' ? 'text-white' : 'text-gray-700 hover:text-gray-900'
                    }`}
                  >
                    {activeTab === 'active' && (
                      <motion.span
                        initial={false}
                        layoutScroll
                        layoutId="schoolPartnershipTabSlider"
                        className="absolute inset-0 rounded-full bg-blue-600 shadow"
                        transition={{ type: 'spring', stiffness: 500, damping: 40, mass: 0.3 }}
                      />
                    )}
                    <span className="relative z-10 inline-flex items-center gap-1.5">
                      <Users className={`w-4 h-4 ${activeTab === 'active' ? 'opacity-100 text-white' : 'opacity-80 text-gray-700'}`} />
                      <span>Parcerias</span>
                      <span className={`inline-flex items-center justify-center min-w-[1.25rem] px-1.5 h-5 text-[11px] rounded-full font-bold ${
                        activeTab === 'active' ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'
                      }`}>
                        {partnerships?.length ?? 0}
                      </span>
                    </span>
                  </button>

                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === 'pending'}
                    onClick={() => setActiveTab('pending')}
                    className={`relative inline-flex items-center justify-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                      activeTab === 'pending' ? 'text-white' : 'text-amber-700 hover:text-amber-800'
                    }`}
                  >
                    {activeTab === 'pending' && (
                      <motion.span
                        initial={false}
                        layoutScroll
                        layoutId="schoolPartnershipTabSlider"
                        className="absolute inset-0 rounded-full bg-amber-500 shadow"
                        transition={{ type: 'spring', stiffness: 500, damping: 40, mass: 0.3 }}
                      />
                    )}
                    <span className="relative z-10 inline-flex items-center gap-1.5">
                      <Bell className={`w-4 h-4 ${activeTab === 'pending' ? 'opacity-100 text-white' : 'opacity-80 text-amber-700'}`} />
                      <span>Solicitações</span>
                      <span className={`inline-flex items-center justify-center min-w-[1.25rem] px-1.5 h-5 text-[11px] rounded-full font-bold ${
                        activeTab === 'pending' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {pendingRequests?.length ?? 0}
                      </span>
                    </span>
                  </button>
                </div>
              </div>
            </LayoutGroup>

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
                        <Building2 className="w-8 h-8" />
                      </div>
                      <h3 className="text-lg font-semibold text-slate-700 mb-2">Nenhuma parceria ativa</h3>
                      <p className="text-sm text-slate-500 max-w-sm mx-auto">
                        Quando você estabelecer parcerias com empresas, elas aparecerão aqui.
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
                        <Card className="h-full rounded-[22px] border-2 border-blue-100 bg-white/95 shadow-[0_14px_35px_rgba(15,23,42,0.06)] transition-all hover:-translate-y-[2px] hover:border-blue-300 hover:shadow-[0_20px_45px_rgba(15,23,42,0.12)]">
                          <CardContent className="p-5 sm:p-6">
                            {/* Header com foto */}
                            <div className="flex items-center gap-3 sm:gap-4 mb-4">
                              {(() => {
                                const cfg = getCompanyAvatarConfig(partnership.company_id, partnership.company_avatar_shape);
                                const img = partnership.avatar_url;
                                const isCircle = cfg.isCircle;
                                return (
                                  <div className={`w-12 h-12 sm:w-14 sm:h-14 overflow-hidden flex items-center justify-center shrink-0 ${isCircle ? 'rounded-full' : 'rounded-xl'}`}>
                                    {img ? (
                                      <img
                                        src={img}
                                        alt={partnership.company_name || partnership.name}
                                        className={`w-full h-full ${isCircle ? 'object-cover rounded-full' : 'object-contain rounded-xl'}`}
                                      />
                                    ) : (
                                      <div className={`w-full h-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center ${isCircle ? 'rounded-full' : 'rounded-xl'}`}>
                                        <Building2 className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}
                              <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-sm sm:text-base text-slate-900 truncate">
                                  {partnership.company_name || partnership.name}
                                </h3>
                                <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 truncate">
                                  {partnership.email || 'Empresa parceira'}
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
                                onClick={() => navigate(`/company/${partnership.company_id}`)}
                                className="w-full rounded-xl border-2 border-[#2563eb] bg-[#2563eb] py-2.5 text-xs sm:text-sm font-semibold text-white shadow-md shadow-sky-200 transition-all hover:-translate-y-[1px] hover:bg-[#1d4ed8] hover:border-[#1d4ed8]"
                              >
                                <Briefcase className="w-4 h-4 mr-2" />
                                Ver Vagas
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
                              {(() => {
                                const cfg = getCompanyAvatarConfig(partnership.company_id, partnership.company_avatar_shape);
                                const img = partnership.avatar_url;
                                const isCircle = cfg.isCircle;
                                return (
                                  <div className={`w-12 h-12 sm:w-14 sm:h-14 overflow-hidden flex items-center justify-center shrink-0 ${isCircle ? 'rounded-full' : 'rounded-xl'}`}>
                                    {img ? (
                                      <img
                                        src={img}
                                        alt={partnership.company_name || partnership.name}
                                        className={`w-full h-full ${isCircle ? 'object-cover rounded-full' : 'object-contain rounded-xl'}`}
                                      />
                                    ) : (
                                      <div className={`w-full h-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center ${isCircle ? 'rounded-full' : 'rounded-xl'}`}>
                                        <Building2 className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}
                              <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-sm sm:text-base text-slate-900 truncate">
                                  {partnership.company_name || partnership.name}
                                </h3>
                                <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 truncate">
                                  {partnership.email || ''}
                                </p>
                              </div>
                            </div>

                            {/* Status Badge */}
                            <div className="mb-4">
                              <div className="inline-flex items-center gap-2 text-[11px] sm:text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded-xl ring-1 ring-amber-200 font-medium">
                                <Clock className="w-3.5 h-3.5" />
                                <span>
                                  {partnership.requested_by === 'company' 
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
                            {partnership.requested_by === 'company' ? (
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
