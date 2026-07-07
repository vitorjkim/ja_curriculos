import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Briefcase,
  FileText,
  TrendingUp,
  Eye,
  Star,
  Award,
  Clock,
  ArrowRight,
  LogOut
} from 'lucide-react';

const StudentDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Redirecionar se não estiver autenticado ou não for candidato
    if (!user || (user.type !== 'candidate' && user.type !== 'school')) {
      navigate('/login');
      return;
    }
  }, [user, navigate]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleCreateResume = () => {
    navigate('/create-resume');
  };

  const handleSearchJobs = () => {
    navigate('/search-jobs');
  };

  const handleViewResumes = () => {
    navigate('/my-resumes');
  };

  return (
    <>
      <Helmet>
        <title>Dashboard do Candidato - CurrículoJá</title>
        <meta name="description" content="Seu painel de controle no CurrículoJá. Gerencie currículos, candidaturas e acompanhe oportunidades." />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-12"
          >
            <div className="flex justify-between items-start mb-8">
              <div>
                <h1 className="text-4xl font-bold text-slate-900 mb-2">
                  Bem-vindo, {user?.name || user?.email}! 👋
                </h1>
                <p className="text-slate-600">
                  Aqui você gerencia sua carreira e encontra as melhores oportunidades
                </p>
              </div>
              <Button
                onClick={handleLogout}
                className="flex items-center gap-2 bg-slate-200 text-slate-700 hover:bg-slate-300"
              >
                <LogOut className="w-4 h-4" />
                Sair
              </Button>
            </div>
          </motion.div>

          {/* Stats Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12"
          >
            <Card className="border-2 border-slate-200 bg-white hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600 mb-1">Currículos</p>
                    <p className="text-3xl font-bold text-slate-900">0</p>
                  </div>
                  <FileText className="w-12 h-12 text-blue-500 opacity-20" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-slate-200 bg-white hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600 mb-1">Candidaturas</p>
                    <p className="text-3xl font-bold text-slate-900">0</p>
                  </div>
                  <Briefcase className="w-12 h-12 text-emerald-500 opacity-20" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-slate-200 bg-white hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600 mb-1">Visualizações</p>
                    <p className="text-3xl font-bold text-slate-900">0</p>
                  </div>
                  <Eye className="w-12 h-12 text-purple-500 opacity-20" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-slate-200 bg-white hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600 mb-1">Score</p>
                    <p className="text-3xl font-bold text-slate-900">--</p>
                  </div>
                  <Star className="w-12 h-12 text-amber-500 opacity-20" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Main Content Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-8"
          >
            {/* Ações Rápidas */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="border-2 border-slate-200 bg-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-emerald-600" />
                    Ações Rápidas
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <motion.button
                    whileHover={{ x: 4 }}
                    onClick={handleCreateResume}
                    className="w-full flex items-center justify-between p-4 rounded-xl border-2 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-emerald-600" />
                      <div className="text-left">
                        <p className="font-medium text-slate-900">Criar novo currículo</p>
                        <p className="text-sm text-slate-600">Comece do zero ou com template</p>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </motion.button>

                  <motion.button
                    whileHover={{ x: 4 }}
                    onClick={handleViewResumes}
                    className="w-full flex items-center justify-between p-4 rounded-xl border-2 border-blue-200 bg-blue-50 hover:bg-blue-100 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-blue-600" />
                      <div className="text-left">
                        <p className="font-medium text-slate-900">Meus currículos</p>
                        <p className="text-sm text-slate-600">Visualizar e editar</p>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </motion.button>

                  <motion.button
                    whileHover={{ x: 4 }}
                    onClick={handleSearchJobs}
                    className="w-full flex items-center justify-between p-4 rounded-xl border-2 border-purple-200 bg-purple-50 hover:bg-purple-100 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <Briefcase className="w-5 h-5 text-purple-600" />
                      <div className="text-left">
                        <p className="font-medium text-slate-900">Buscar vagas</p>
                        <p className="text-sm text-slate-600">Encontre oportunidades perfeitas</p>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-purple-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </motion.button>
                </CardContent>
              </Card>

              {/* Em breve */}
              <Card className="border-2 border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-sky-600" />
                    Em Breve
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                      <Award className="w-4 h-4 text-amber-500" />
                      <span>Análise automática do seu currículo com IA</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Star className="w-4 h-4 text-amber-500" />
                      <span>Score inteligente e sugestões de melhorias</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-emerald-500" />
                      <span>Dashboard com estatísticas detalhadas</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-sky-500" />
                      <span>Notificações de vagas compatíveis em tempo real</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Card de Boas-vindas */}
              <Card className="border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50">
                <CardHeader>
                  <CardTitle className="text-emerald-900">Bem-vindo! 🚀</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-emerald-800 space-y-3">
                  <p>
                    Você está no lugar certo para encontrar a oportunidade de carreira que procura!
                  </p>
                  <p className="text-xs text-emerald-700">
                    Comece criando seu currículo ou navegue pelas vagas disponíveis.
                  </p>
                </CardContent>
              </Card>

              {/* Próximas Etapas */}
              <Card className="border-2 border-slate-200 bg-white">
                <CardHeader>
                  <CardTitle className="text-base">Próximas etapas</CardTitle>
                </CardHeader>
                <CardContent className="text-sm">
                  <ol className="space-y-2 text-slate-600">
                    <li className="flex gap-2">
                      <span className="font-bold text-slate-900">1.</span>
                      <span>Criar seu primeiro currículo</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-bold text-slate-900">2.</span>
                      <span>Completar seu perfil</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-bold text-slate-900">3.</span>
                      <span>Buscar e aplicar a vagas</span>
                    </li>
                  </ol>
                </CardContent>
              </Card>

              {/* Contato Support */}
              <Card className="border-2 border-slate-200 bg-white">
                <CardHeader>
                  <CardTitle className="text-base">Precisa de ajuda?</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-slate-600">
                  <p className="mb-4">
                    Acesse nosso suporte em caso de dúvidas.
                  </p>
                  <Button className="w-full bg-slate-900 text-white hover:bg-slate-800">
                    Contatar Suporte
                  </Button>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
};

export default StudentDashboard;
