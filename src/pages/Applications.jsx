import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet';
import { 
  Briefcase, 
  Calendar,
  MapPin,
  Building,
  Eye,
  Clock,
  CheckCircle,
  AlertCircle,
  FileText,
  Filter,
  Search,
  Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { applicationsAPI } from '@/lib/api';

const Applications = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    if (user && user.type === 'candidate') {
      fetchApplications();
    }
  }, [user]);

  const fetchApplications = async () => {
    if (!user) return;
    try {
      setLoading(true);
      console.log('📋 Applications: Carregando candidaturas...');
      
      const response = await applicationsAPI.list();
      console.log('📋 Applications: Resposta da API:', response);
      
      const applicationsData = response.applications || response.data || response || [];
      setApplications(Array.isArray(applicationsData) ? applicationsData : []);
      
      console.log('📋 Applications: Candidaturas carregadas:', applicationsData.length);
    } catch (error) {
      console.error('❌ Applications: Erro ao carregar candidaturas:', error);
      toast({
        title: 'Erro ao carregar candidaturas',
        description: 'Não foi possível carregar suas candidaturas. Tente novamente.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <Clock size={16} className="text-yellow-600" />;
      case 'interested':
        return <CheckCircle size={16} className="text-blue-600" />;
      case 'interview':
        return <Calendar size={16} className="text-indigo-600" />;
      case 'approved':
        return <CheckCircle size={16} className="text-green-600" />;
      case 'rejected':
        return <AlertCircle size={16} className="text-red-600" />;
      default:
        return <Clock size={16} className="text-gray-600" />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending':
        return 'Em análise';
      case 'interested':
        return 'Pré-aprovado';
      case 'interview':
        return 'Entrevista';
      case 'approved':
        return 'Aprovado';
      case 'rejected':
        return 'Recusado';
      default:
        return 'Pendente';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'interested':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'interview':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'approved':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'rejected':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const filteredApplications = applications.filter(application => {
    const matchesSearch = application.job_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         application.company_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || application.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-green-50/40 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-green-50/40">
      <Helmet>
        <title>Minhas Candidaturas - CurriculoJá</title>
      </Helmet>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div 
          className="mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Minhas <span className="text-green-600">Candidaturas</span>
          </h1>
          <p className="text-gray-600 text-lg">
            Acompanhe o status de todas as suas candidaturas em um só lugar.
          </p>
        </motion.div>

        {/* Filtros */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="rounded-[24px] border-2 border-slate-200 bg-white/95 shadow-[0_18px_45px_rgba(15,23,42,0.06)] mb-6">
            <CardContent className="p-5">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                    <Input
                      placeholder="Buscar por vaga ou empresa..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 h-12 rounded-2xl border-2 border-slate-200 bg-slate-50/50 focus:border-blue-300 focus:ring-blue-200 text-sm"
                    />
                  </div>
                </div>
                <div className="sm:w-52">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full h-12 px-4 py-3 bg-slate-50/50 border-2 border-slate-200 rounded-2xl focus:border-blue-300 focus:ring-blue-200 focus:outline-none text-sm cursor-pointer font-medium text-slate-700"
                  >
                    <option value="all">Todos os status</option>
                    <option value="pending">Em análise</option>
                    <option value="interested">Pré-aprovado</option>
                    <option value="interview">Entrevista</option>
                    <option value="approved">Aprovado</option>
                    <option value="rejected">Recusado</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Lista de Candidaturas */}
        {filteredApplications.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="rounded-[24px] border-2 border-green-200 bg-white/95 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
              <CardContent className="py-14">
                <div className="flex flex-col items-center justify-center gap-4">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center border-2 border-green-200">
                    <Briefcase className="w-10 h-10 text-green-500" />
                  </div>
                  <div className="text-center">
                    <h3 className="text-xl font-bold text-slate-900 mb-2">
                      {applications.length === 0 ? 'Nenhuma candidatura encontrada' : 'Nenhuma candidatura corresponde aos filtros'}
                    </h3>
                    <p className="text-slate-500 max-w-md">
                      {applications.length === 0 
                        ? 'Você ainda não se candidatou a nenhuma vaga. Que tal explorar as oportunidades disponíveis?'
                        : 'Tente ajustar os filtros para encontrar suas candidaturas.'
                      }
                    </p>
                  </div>
                  {applications.length === 0 && (
                    <Button 
                      asChild 
                      className="mt-2 rounded-full border-2 border-green-200 bg-green-500/5 text-sm font-bold text-green-600 shadow-sm shadow-green-100 hover:border-green-400 hover:bg-green-500 hover:text-white hover:shadow-md hover:shadow-green-200 transition-all duration-300 h-11 px-6"
                    >
                      <Link to="/jobs" className="flex items-center gap-2">
                        <Plus size={18} />
                        Explorar Vagas
                      </Link>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="rounded-[24px] border-2 border-green-200 bg-white/95 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
              <CardHeader className="border-b border-slate-100 pb-4">
                <div className="flex justify-between items-center gap-3">
                  <CardTitle className="flex items-center text-base font-semibold text-green-900">
                    <div className="mr-3 w-10 h-10 rounded-xl bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center shadow-sm border-2 border-green-200">
                      <Briefcase className="w-5 h-5 text-green-600 stroke-[2.5]" />
                    </div>
                    Suas Candidaturas
                  </CardTitle>
                  <span className="text-sm font-medium text-slate-500">
                    {filteredApplications.length} candidatura{filteredApplications.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="pt-5">
                <div className="space-y-3">
                  {filteredApplications.map((application, index) => (
                    <motion.div
                      key={application.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      className="rounded-2xl border-2 border-green-100 bg-green-50/50 p-4 transition-all duration-300 hover:-translate-y-1 hover:border-green-300 hover:shadow-lg hover:shadow-green-200/50"
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-start gap-3">
                            <div className="w-12 h-12 rounded-xl bg-white border-2 border-green-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                              {application.company_logo ? (
                                <img
                                  src={application.company_logo}
                                  alt={application.company_name || 'Empresa'}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <Briefcase className="w-5 h-5 text-green-600" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-base font-semibold text-slate-900 mb-1 truncate">
                                {application.job_title}
                              </h3>
                              <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600 mb-2">
                                <div className="flex items-center gap-1.5">
                                  <Building size={14} className="text-slate-400" />
                                  <span className="font-medium">{application.company_name}</span>
                                </div>
                                {application.location && (
                                  <div className="flex items-center gap-1.5">
                                    <MapPin size={14} className="text-slate-400" />
                                    <span>{application.location}</span>
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                <Calendar size={12} className="text-slate-400" />
                                <span>Enviada em {new Date(application.created_at || application.applied_at).toLocaleDateString('pt-BR')}</span>
                              </div>
                              {((application.status === 'approved' && application.final_approved) || application.status === 'rejected') && application.decision_feedback && (
                                <div className={`mt-3 p-3 rounded-xl border-2 ${application.status === 'approved' ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                                  <div className="flex items-start gap-2">
                                    {application.status === 'approved' ? (
                                      <CheckCircle className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                                    ) : (
                                      <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                                    )}
                                    <div>
                                      <p className={`text-sm font-semibold ${application.status === 'approved' ? 'text-emerald-800' : 'text-red-800'}`}>
                                        {application.status === 'approved' ? 'Aprovado!' : 'Não selecionado'}
                                      </p>
                                      <p className="text-sm text-slate-700 whitespace-pre-line mt-1">{application.decision_feedback}</p>
                                      {application.decision_at && (
                                        <p className="text-[11px] text-slate-500 mt-1">Enviado em {(() => {
                                          const s = String(application.decision_at).replace('T',' ').trim();
                                          const m = s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/);
                                          if (!m) return new Date(application.decision_at).toLocaleString('pt-BR');
                                          const [,Y,M,D,H,Min] = m; return `${D}/${M}/${Y.slice(2)} ${H}:${Min}`;
                                        })()}</p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3 flex-shrink-0">
                          {(() => {
                            // approved sem final_approved = pré-aprovado; com final_approved = aprovado final
                            const effStatus = (application.status === 'approved' && !application.final_approved) ? 'interested' : application.status;
                            return (
                              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border-2 font-semibold text-sm ${getStatusColor(effStatus)}`}>
                                {getStatusIcon(effStatus)}
                                <span>{getStatusText(effStatus)}</span>
                              </div>
                            );
                          })()}
                          
                          <Button 
                            variant="outline" 
                            size="sm"
                            asChild
                            className="rounded-full border-2 border-green-200 bg-green-500/5 text-xs font-bold text-green-600 shadow-sm shadow-green-100 hover:border-green-400 hover:bg-green-500 hover:text-white hover:shadow-md hover:shadow-green-200 transition-all duration-300 h-9 px-4"
                          >
                            <Link to={`/job/${application.job_id}`}>
                              <Eye size={14} className="mr-1.5" />
                              Ver Vaga
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Applications;
