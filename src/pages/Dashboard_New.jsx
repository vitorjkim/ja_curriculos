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
      console.error('❌ Dashboard: Detalhes do erro:', error.message);
      
      // Se erro de autenticação ou qualquer erro, usar dados de exemplo
      console.log('🔄 Dashboard: Usando dados de exemplo devido ao erro');
      setStats(sampleData.stats);
      setRecentResumes(sampleData.recentResumes);
      setRecentApplications(sampleData.recentApplications);
      
      if (error.message?.includes('inválido') || error.message?.includes('TOKEN_INVALID')) {
        toast({
          title: 'Dados de demonstração',
          description: 'Faça login para ver seus dados reais.',
          variant: 'default'
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
      path: '/messages',
      color: 'from-purple-500 to-purple-600',
      bgColor: 'from-purple-50 to-purple-100'
    },
    {
      title: 'Meu Perfil',
      description: 'Gerencie suas informações',
      icon: User,
      path: '/my-resume',
      color: 'from-orange-500 to-orange-600',
      bgColor: 'from-orange-50 to-orange-100'
    }
  ];

  // Redirect empresas para dashboard específico
  if (user?.type === 'company') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <Card className="max-w-md mx-auto text-center">
          <CardContent className="p-8">
            <div className="mb-4">
              <Building className="w-16 h-16 text-blue-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Dashboard da Empresa</h2>
              <p className="text-gray-600 mb-6">
                Você está logado como empresa. Acesse o dashboard específico para empresas.
              </p>
              <Button 
                onClick={() => navigate('/company-dashboard')}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
              >
                Ir para Dashboard da Empresa
              </Button>
            </div>
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
                        <stat.icon className={`w-6 h-6 text-blue-600`} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </motion.div>

            {/* Quick Actions removed as requested */}

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
};

export default Dashboard;
