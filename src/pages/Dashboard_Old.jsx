import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet';
import { 
  Home, 
  FileText, 
  Search, 
  MessageSquare, 
  Briefcase, 
  User, 
  TrendingUp, 
  Calendar,
  Target,
  Award,
  Eye,
  Edit,
  Plus,
  Download,
  CheckCircle,
  AlertCircle,
  Clock,
  MapPin,
  Building
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { resumesAPI, applications as applicationsAPI } from '@/lib/api';

const Dashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [stats, setStats] = useState({
    totalResumes: 3,
    totalApplications: 8,
    pendingApplications: 3,
    profileCompleteness: 75
  });
  
  const [recentResumes, setRecentResumes] = useState([
    {
      id: 'sample-1',
      title: 'Desenvolvedor Frontend',
      template: 'modern',
      created_at: '2024-12-15T10:00:00Z',
      is_public: true
    },
    {
      id: 'sample-2', 
      title: 'Desenvolvedor Full Stack',
      template: 'classic',
      created_at: '2024-12-10T14:30:00Z',
      is_public: false
    }
  ]);
  const [recentApplications, setRecentApplications] = useState([
    {
      id: 'app-1',
      status: 'pending',
      created_at: '2024-12-14T09:00:00Z',
      job: {
        title: 'Desenvolvedor React',
        company: {
          company_name: 'Tech Solutions'
        }
      }
    },
    {
      id: 'app-2',
      status: 'reviewed',
      created_at: '2024-12-12T16:20:00Z',
      job: {
        title: 'Frontend Developer',
        company: {
          company_name: 'StartupXYZ'
        }
      }
    }
  ]);
  const [loading, setLoading] = useState(true);

  // Dados de exemplo para demonstração
  const sampleData = {
    stats: {
      totalResumes: 3,
      totalApplications: 8,
      pendingApplications: 3,
      profileCompleteness: 75
    },
    recentResumes: [
      {
        id: 'sample-1',
        title: 'Desenvolvedor Frontend',
        template: 'modern',
        created_at: '2024-12-15T10:00:00Z',
        is_public: true
      },
      {
        id: 'sample-2', 
        title: 'Desenvolvedor Full Stack',
        template: 'classic',
        created_at: '2024-12-10T14:30:00Z',
        is_public: false
      }
    ],
    recentApplications: [
      {
        id: 'app-1',
        status: 'pending',
        created_at: '2024-12-14T09:00:00Z',
        job: {
          title: 'Desenvolvedor React',
          company: {
            company_name: 'Tech Solutions'
          }
        }
      },
      {
        id: 'app-2',
        status: 'reviewed',
        created_at: '2024-12-12T16:20:00Z',
        job: {
          title: 'Frontend Developer',
          company: {
            company_name: 'StartupXYZ'
          }
        }
      }
    ]
  };

  useEffect(() => {
    if (user?.type === 'candidate') {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Verificar se usuário está logado e tem token
      const token = localStorage.getItem('curriculoja_token');
      console.log('🔐 Dashboard: Token encontrado:', !!token);
      console.log('👤 Dashboard: Usuário logado:', user?.id, user?.email);
      
      if (!token || !user?.id) {
        console.log('⚠️ Dashboard: Usuário não autenticado, usando dados de exemplo');
        setStats(sampleData.stats);
        setRecentResumes(sampleData.recentResumes);
        setRecentApplications(sampleData.recentApplications);
        return;
      }
      
      console.log('🔄 Dashboard: Buscando dados do usuário...', user?.id);
      
      // Buscar currículos
      console.log('📄 Dashboard: Chamando resumesAPI.list()...');
      const resumesResponse = await resumesAPI.list();
      console.log('📄 Dashboard: Resposta da API de currículos:', resumesResponse);
      
      const resumes = resumesResponse.resumes || resumesResponse.data || [];
      console.log('📄 Dashboard: Currículos encontrados:', resumes.length, resumes);
      
      // Buscar candidaturas
      console.log('💼 Dashboard: Chamando applicationsAPI.list()...');
      const applicationsResponse = await applicationsAPI.list();
      console.log('💼 Dashboard: Resposta da API de candidaturas:', applicationsResponse);
      
      const applications = applicationsResponse.applications || applicationsResponse.data || [];
      console.log('💼 Dashboard: Candidaturas encontradas:', applications.length, applications);
      
      // Calcular estatísticas
      const newStats = {
        totalResumes: resumes.length,
        totalApplications: applications.length,
        pendingApplications: applications.filter(app => app.status === 'pending').length,
        profileCompleteness: calculateProfileCompleteness()
      };
      
      console.log('📊 Dashboard: Estatísticas calculadas:', newStats);
      setStats(newStats);
      
      // Pegar itens recentes
      setRecentResumes(resumes.slice(0, 3));
      setRecentApplications(applications.slice(0, 5));
      
    } catch (error) {
      console.error('❌ Dashboard: Erro ao carregar dados:', error);
      console.error('❌ Dashboard: Detalhes do erro:', error.message, error.stack);
      
      // Se erro de autenticação, limpar dados
      if (error.message?.includes('inválido') || error.message?.includes('TOKEN_INVALID')) {
        console.log('� Dashboard: Erro de autenticação detectado, limpando dados...');
        setStats({
          totalResumes: 0,
          totalApplications: 0,
          pendingApplications: 0,
          profileCompleteness: 0
        });
        setRecentResumes([]);
        setRecentApplications([]);
        
        toast({
          title: 'Sessão expirada',
          description: 'Faça login novamente para ver seus dados.',
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'Erro',
          description: 'Não foi possível carregar os dados do dashboard.',
          variant: 'destructive'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const calculateProfileCompleteness = () => {
    if (!user) return 0;
    
    let completeness = 0;
    const fields = ['name', 'email', 'phone'];
    
    fields.forEach(field => {
      if (user[field]) completeness += 33.33;
    });
    
    return Math.round(completeness);
  };

  const quickActions = [
    {
      title: 'Buscar Vagas',
      description: 'Encontre novas oportunidades',
      icon: Search,
      path: '/jobs',
      color: 'from-blue-500 to-blue-600',
      bgColor: 'from-blue-50 to-blue-100'
    },
    {
      title: 'Criar Currículo',
      description: 'Monte seu currículo profissional',
      icon: FileText,
      path: '/create-resume',
      color: 'from-green-500 to-green-600',
      bgColor: 'from-green-50 to-green-100'
    },
    {
      title: 'Mensagens',
      description: 'Converse com empresas',
      icon: MessageSquare,
      path: '/my-messages',
      color: 'from-purple-500 to-purple-600',
      bgColor: 'from-purple-50 to-purple-100'
    },
    {
      title: 'Meus Currículos',
      description: 'Gerencie seus currículos',
      icon: FileText,
      path: '/my-resume',
      color: 'from-indigo-500 to-indigo-600',
      bgColor: 'from-indigo-50 to-indigo-100'
    }
  ];

  if (!user || user.type !== 'candidate') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="p-6 text-center">
            <p>Acesso restrito a candidatos.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <Helmet>
        <title>Dashboard - CurriculoJá</title>
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
            Olá, {user?.name || 'Usuário'}! 👋
          </h1>
          <p className="text-gray-600 text-lg">
            Bem-vindo ao seu dashboard. Aqui você pode acompanhar suas atividades e acessar rapidamente suas ferramentas.
          </p>
        </motion.div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Stats Cards */}
            <motion.div 
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              {[
                {
                  title: 'Currículos',
                  value: stats.totalResumes,
                  icon: FileText,
                  color: 'from-blue-500 to-blue-600',
                  bgColor: 'from-blue-50 to-blue-100'
                },
                {
                  title: 'Candidaturas',
                  value: stats.totalApplications,
                  icon: Briefcase,
                  color: 'from-green-500 to-green-600',
                  bgColor: 'from-green-50 to-green-100'
                },
                {
                  title: 'Pendentes',
                  value: stats.pendingApplications,
                  icon: Clock,
                  color: 'from-yellow-500 to-orange-500',
                  bgColor: 'from-yellow-50 to-orange-100'
                },
                {
                  title: 'Perfil Completo',
                  value: `${stats.profileCompleteness}%`,
                  icon: Award,
                  color: 'from-purple-500 to-purple-600',
                  bgColor: 'from-purple-50 to-purple-100'
                }
              ].map((stat, index) => (
                <Card 
                  key={stat.title}
                  className="hover:shadow-xl transition-all duration-300 rounded-2xl border-0 bg-white/80 backdrop-blur-sm group overflow-hidden"
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 mb-1">{stat.title}</p>
                        <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                      </div>
                      <div className={`p-3 rounded-2xl bg-gradient-to-r ${stat.bgColor} group-hover:scale-110 transition-transform duration-300`}>
                        <stat.icon className={`w-6 h-6 text-gradient bg-gradient-to-r ${stat.color} bg-clip-text`} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </motion.div>

            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Ações Rápidas</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {quickActions.map((action, index) => (
                  <Card 
                    key={action.title}
                    className="hover:shadow-xl transition-all duration-300 rounded-2xl border-0 bg-white/80 backdrop-blur-sm group overflow-hidden cursor-pointer"
                  >
                    <CardContent className="p-6">
                      <Link to={action.path} className="block">
                        <div className="text-center">
                          <div className={`inline-flex p-4 rounded-2xl bg-gradient-to-r ${action.bgColor} mb-4 group-hover:scale-110 transition-transform duration-300`}>
                            <action.icon className={`w-8 h-8 bg-gradient-to-r ${action.color} bg-clip-text text-transparent`} />
                          </div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                            {action.title}
                          </h3>
                          <p className="text-sm text-gray-600">{action.description}</p>
                        </div>
                      </Link>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Recent Resumes */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <Card className="hover:shadow-xl transition-all duration-300 rounded-2xl border-0 bg-white/80 backdrop-blur-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-xl text-gray-900 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-blue-600" />
                      Currículos Recentes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {recentResumes.length === 0 ? (
                      <div className="text-center py-8">
                        <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600 mb-4">Nenhum currículo encontrado</p>
                        <Button 
                          asChild 
                          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl"
                        >
                          <Link to="/create-resume">
                            <Plus className="w-4 h-4 mr-2" />
                            Criar Currículo
                          </Link>
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {recentResumes.map((resume) => (
                          <div 
                            key={resume.id}
                            className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100 hover:bg-blue-50 hover:border-blue-200 transition-all duration-300"
                          >
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-white rounded-lg border border-gray-200">
                                <FileText className="w-4 h-4 text-blue-600" />
                              </div>
                              <div>
                                <p className="font-semibold text-gray-900">{resume.title}</p>
                                <p className="text-sm text-gray-600">
                                  {new Date(resume.created_at).toLocaleDateString('pt-BR')}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {resume.is_public ? (
                                <div className="flex items-center gap-1 bg-green-50 px-2 py-1 rounded-full border border-green-200">
                                  <Eye size={12} className="text-green-600" />
                                  <span className="text-xs text-green-700 font-medium">Público</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-full border border-gray-200">
                                  <Edit size={12} className="text-gray-600" />
                                  <span className="text-xs text-gray-700 font-medium">Privado</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                        <div className="pt-4 border-t border-gray-200">
                          <Button 
                            asChild 
                            variant="outline"
                            className="w-full rounded-2xl border-2 border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300 transition-all duration-300"
                          >
                            <Link to="/my-resume">
                              Ver Todos os Currículos
                            </Link>
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* Recent Applications */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                <Card className="hover:shadow-xl transition-all duration-300 rounded-2xl border-0 bg-white/80 backdrop-blur-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-xl text-gray-900 flex items-center gap-2">
                      <Briefcase className="w-5 h-5 text-green-600" />
                      Candidaturas Recentes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {recentApplications.length === 0 ? (
                      <div className="text-center py-8">
                        <Briefcase className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600 mb-4">Nenhuma candidatura encontrada</p>
                        <Button 
                          asChild 
                          className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl"
                        >
                          <Link to="/jobs">
                            <Search className="w-4 h-4 mr-2" />
                            Buscar Vagas
                          </Link>
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {recentApplications.map((application) => (
                          <div 
                            key={application.id}
                            className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100 hover:bg-green-50 hover:border-green-200 transition-all duration-300"
                          >
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-white rounded-lg border border-gray-200">
                                <Building className="w-4 h-4 text-green-600" />
                              </div>
                              <div>
                                <p className="font-semibold text-gray-900">{application.job?.title}</p>
                                <p className="text-sm text-gray-600">{application.job?.company?.company_name}</p>
                                <p className="text-xs text-gray-500">
                                  {new Date(application.created_at).toLocaleDateString('pt-BR')}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {application.status === 'pending' && (
                                <div className="flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded-full border border-yellow-200">
                                  <Clock size={12} className="text-yellow-600" />
                                  <span className="text-xs text-yellow-700 font-medium">Pendente</span>
                                </div>
                              )}
                              {application.status === 'reviewed' && (
                                <div className="flex items-center gap-1 bg-blue-50 px-2 py-1 rounded-full border border-blue-200">
                                  <Eye size={12} className="text-blue-600" />
                                  <span className="text-xs text-blue-700 font-medium">Analisado</span>
                                </div>
                              )}
                              {application.status === 'approved' && (
                                <div className="flex items-center gap-1 bg-green-50 px-2 py-1 rounded-full border border-green-200">
                                  <CheckCircle size={12} className="text-green-600" />
                                  <span className="text-xs text-green-700 font-medium">Aprovado</span>
                                </div>
                              )}
                              {application.status === 'rejected' && (
                                <div className="flex items-center gap-1 bg-red-50 px-2 py-1 rounded-full border border-red-200">
                                  <AlertCircle size={12} className="text-red-600" />
                                  <span className="text-xs text-red-700 font-medium">Recusado</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                        <div className="pt-4 border-t border-gray-200">
                          <Button 
                            asChild 
                            variant="outline"
                            className="w-full rounded-2xl border-2 border-green-200 text-green-600 hover:bg-green-50 hover:border-green-300 transition-all duration-300"
                          >
                            <Link to="/applications">
                              Ver Todas as Candidaturas
                            </Link>
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
            
            {/* Header de boas-vindas */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              className="mb-8"
            >
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                    Olá, {user.name}! 👋
                  </h1>
                  <p className="text-xl text-gray-600">
                    Bem-vindo ao seu painel de controle
                  </p>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Perfil completo</p>
                    <div className="flex items-center space-x-2">
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${stats.profileCompleteness}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-semibold text-green-600">
                        {stats.profileCompleteness}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Cards de estatísticas */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: 0.1 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
            >
              <Card className="border-0 shadow-lg bg-gradient-to-r from-blue-50 to-blue-100">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-600 text-sm font-medium">Currículos</p>
                      <p className="text-3xl font-bold text-blue-900">{stats.totalResumes}</p>
                    </div>
                    <div className="w-12 h-12 bg-blue-500 rounded-2xl flex items-center justify-center">
                      <FileText className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg bg-gradient-to-r from-green-50 to-green-100">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-600 text-sm font-medium">Candidaturas</p>
                      <p className="text-3xl font-bold text-green-900">{stats.totalApplications}</p>
                    </div>
                    <div className="w-12 h-12 bg-green-500 rounded-2xl flex items-center justify-center">
                      <Briefcase className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg bg-gradient-to-r from-yellow-50 to-yellow-100">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-yellow-600 text-sm font-medium">Pendentes</p>
                      <p className="text-3xl font-bold text-yellow-900">{stats.pendingApplications}</p>
                    </div>
                    <div className="w-12 h-12 bg-yellow-500 rounded-2xl flex items-center justify-center">
                      <Clock className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg bg-gradient-to-r from-purple-50 to-purple-100">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-600 text-sm font-medium">Perfil</p>
                      <p className="text-3xl font-bold text-purple-900">{stats.profileCompleteness}%</p>
                    </div>
                    <div className="w-12 h-12 bg-purple-500 rounded-2xl flex items-center justify-center">
                      <User className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Ações rápidas */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: 0.2 }}
              className="mb-8"
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Ações Rápidas</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {quickActions.map((action, index) => {
                  const Icon = action.icon;
                  return (
                    <motion.div
                      key={action.path}
                      whileHover={{ y: -4, scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Link to={action.path}>
                        <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 group overflow-hidden h-full">
                          <CardContent className="p-6">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 bg-gradient-to-r ${action.color} group-hover:scale-110 transition-transform duration-300`}>
                              <Icon className="w-6 h-6 text-white" />
                            </div>
                            <h3 className="font-bold text-lg text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                              {action.title}
                            </h3>
                            <p className="text-gray-600 text-sm">
                              {action.description}
                            </p>
                          </CardContent>
                        </Card>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Currículos recentes */}
              <motion.div 
                initial={{ opacity: 0, x: -20 }} 
                animate={{ opacity: 1, x: 0 }} 
                transition={{ delay: 0.3 }}
              >
                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center">
                        <FileText className="w-5 h-5 mr-2 text-blue-600" />
                        Meus Currículos
                      </span>
                      <Link to="/my-resume">
                        <Button variant="outline" size="sm">
                          Ver todos
                        </Button>
                      </Link>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <div className="space-y-3">
                        {[1, 2, 3].map(i => (
                          <div key={i} className="animate-pulse bg-gray-200 h-16 rounded-lg" />
                        ))}
                      </div>
                    ) : recentResumes.length > 0 ? (
                      <div className="space-y-4">
                        {recentResumes.map((resume) => (
                          <div key={resume.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                <FileText className="w-5 h-5 text-blue-600" />
                              </div>
                              <div>
                                <h4 className="font-semibold text-gray-900">{resume.title}</h4>
                                <p className="text-sm text-gray-500">
                                  Atualizado em {new Date(resume.updated_at).toLocaleDateString('pt-BR')}
                                </p>
                              </div>
                            </div>
                            <div className="flex space-x-2">
                              <Link to={`/resume/${resume.id}`}>
                                <Button variant="outline" size="sm">
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </Link>
                              <Link to={`/edit-resume/${resume.id}`}>
                                <Button variant="outline" size="sm">
                                  <Edit className="w-4 h-4" />
                                </Button>
                              </Link>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500 mb-4">Você ainda não tem currículos</p>
                        <Link to="/create-resume">
                          <Button>
                            <Plus className="w-4 h-4 mr-2" />
                            Criar primeiro currículo
                          </Button>
                        </Link>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* Candidaturas recentes */}
              <motion.div 
                initial={{ opacity: 0, x: 20 }} 
                animate={{ opacity: 1, x: 0 }} 
                transition={{ delay: 0.4 }}
              >
                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center">
                        <Briefcase className="w-5 h-5 mr-2 text-green-600" />
                        Candidaturas Recentes
                      </span>
                      <Link to="/jobs">
                        <Button variant="outline" size="sm">
                          Ver histórico
                        </Button>
                      </Link>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <div className="space-y-3">
                        {[1, 2, 3, 4, 5].map(i => (
                          <div key={i} className="animate-pulse bg-gray-200 h-20 rounded-lg" />
                        ))}
                      </div>
                    ) : recentApplications.length > 0 ? (
                      <div className="space-y-4">
                        {recentApplications.map((application) => (
                          <div key={application.id} className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <h4 className="font-semibold text-gray-900">{application.job_title}</h4>
                                <p className="text-sm text-gray-600 flex items-center">
                                  <Building className="w-4 h-4 mr-1" />
                                  {application.company_name}
                                </p>
                              </div>
                              <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                                application.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                application.status === 'accepted' ? 'bg-green-100 text-green-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {application.status === 'pending' ? 'Pendente' :
                                 application.status === 'accepted' ? 'Aceita' : 'Rejeitada'}
                              </div>
                            </div>
                            <div className="flex items-center justify-between text-sm text-gray-500">
                              <span className="flex items-center">
                                <Calendar className="w-4 h-4 mr-1" />
                                {new Date(application.created_at).toLocaleDateString('pt-BR')}
                              </span>
                              {application.job_location && (
                                <span className="flex items-center">
                                  <MapPin className="w-4 h-4 mr-1" />
                                  {application.job_location}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Briefcase className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500 mb-4">Você ainda não se candidatou a nenhuma vaga</p>
                        <Link to="/jobs">
                          <Button>
                            <Search className="w-4 h-4 mr-2" />
                            Buscar vagas
                          </Button>
                        </Link>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Dashboard;
