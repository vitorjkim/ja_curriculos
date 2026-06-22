import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet';
import { 
  Building2, 
  Users, 
  Search, 
  FileText, 
  TrendingUp, 
  Award,
  CheckCircle,
  ArrowRight,
  Target,
  Zap,
  Globe,
  Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const CompanyLanding = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: <Search className="h-8 w-8 text-blue-600" />,
      title: "Busca Inteligente",
      description: "Encontre candidatos qualificados usando filtros avançados por habilidades, experiência e localização."
    },
    {
      icon: <FileText className="h-8 w-8 text-green-600" />,
      title: "Currículos Organizados",
      description: "Acesse currículos padronizados e bem estruturados para facilitar sua análise e seleção."
    },
    {
      icon: <Users className="h-8 w-8 text-purple-600" />,
      title: "Gestão de Vagas",
      description: "Publique vagas, gerencie candidaturas e acompanhe todo o processo seletivo em um só lugar."
    },
    {
      icon: <TrendingUp className="h-8 w-8 text-orange-600" />,
      title: "Analytics",
      description: "Relatórios detalhados sobre suas vagas, visualizações e taxas de candidatura."
    }
  ];

  const benefits = [
    "Cadastro gratuito e interface intuitiva",
    "Acesso a um banco de talentos qualificados",
    "Ferramentas de triagem automática",
    "Comunicação direta com candidatos",
    "Relatórios de performance das vagas",
    "Suporte especializado"
  ];

  const stats = [
    { number: "10.000+", label: "Candidatos Ativos" },
    { number: "500+", label: "Empresas Parceiras" },
    { number: "95%", label: "Taxa de Satisfação" },
    { number: "24h", label: "Tempo Médio de Resposta" }
  ];

  return (
    <div className="min-h-screen bg-white">
      <Helmet>
        <title>CurrículoJá para Empresas - Encontre os Melhores Talentos</title>
        <meta name="description" content="Plataforma completa para empresas encontrarem candidatos qualificados. Publique vagas, gerencie candidaturas e conecte-se com os melhores talentos do mercado." />
      </Helmet>

      {/* Hero Section */}
      <section className="relative py-24 bg-gradient-to-b from-slate-900 to-slate-800">
        {/* Background pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 to-transparent"></div>
        
        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-5xl mx-auto text-center">
            {/* Corporate Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 bg-blue-900/20 backdrop-blur-sm border border-blue-400/30 text-blue-200 px-6 py-3 rounded-full text-sm font-semibold mb-8"
            >
              <Building2 className="h-4 w-4" />
              SOLUÇÃO EMPRESARIAL
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 text-white leading-tight"
            >
              RECRUTE COM
              <br />
              <span className="bg-gradient-to-r from-blue-400 to-blue-300 bg-clip-text text-transparent">EXCELÊNCIA</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="text-xl md:text-2xl text-slate-300 mb-12 max-w-4xl mx-auto leading-relaxed font-medium"
            >
              Plataforma corporativa de recrutamento que conecta empresas aos melhores talentos do mercado. 
              Tecnologia avançada, processos otimizados e resultados comprovados.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="flex flex-col sm:flex-row gap-6 justify-center"
            >
              <Button 
                size="lg" 
                onClick={() => navigate('/company-register')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-4 text-lg font-bold shadow-2xl hover:shadow-blue-500/25 border-2 border-blue-500 hover:border-blue-400 transition-all duration-300"
              >
                <div className="flex items-center gap-3">
                  CRIAR CONTA
                  <ArrowRight className="h-5 w-5" />
                </div>
              </Button>
              
              <Button 
                size="lg" 
                variant="outline" 
                onClick={() => navigate('/login')}
                className="border-2 border-slate-400 text-slate-200 hover:border-slate-300 hover:bg-slate-700/50 px-10 py-4 text-lg font-bold backdrop-blur-sm"
              >
                ENTRAR
              </Button>
            </motion.div>

            {/* Trust indicators */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.8 }}
              className="flex flex-wrap justify-center items-center gap-8 mt-16 text-slate-400 text-sm font-medium"
            >
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-green-400" />
                DADOS PROTEGIDOS
              </div>
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-yellow-400" />
                PROCESSO ÁGIL
              </div>
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-blue-400" />
                ALTA PRECISÃO
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Corporate Stats Section */}
      <section className="py-20 bg-slate-50 border-b border-slate-200">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-6xl mx-auto">
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.6 }}
                className="text-center bg-white p-8 rounded-xl shadow-sm border border-slate-200 hover:shadow-lg transition-shadow duration-300"
              >
                <div className="text-4xl md:text-5xl font-bold text-slate-800 mb-3">
                  {stat.number}
                </div>
                <div className="text-slate-600 font-semibold uppercase text-sm tracking-wider">
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              RECURSOS CORPORATIVOS
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Ferramentas profissionais para otimizar seu processo de recrutamento
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="group"
              >
                <Card className="h-full hover:shadow-xl transition-all duration-300 border-0 shadow-lg group-hover:scale-105">
                  <CardHeader className="text-center pb-4">
                    <div className="mb-4 flex justify-center">
                      {feature.icon}
                    </div>
                    <CardTitle className="text-xl font-bold text-gray-900">
                      {feature.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-center">
                    <p className="text-gray-600 leading-relaxed">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
              >
                <h2 className="text-4xl font-bold text-gray-900 mb-6">
                  POR QUE ESCOLHER O <span className="text-blue-600">JÁ CURRÍCULOS</span>?
                </h2>
                <p className="text-xl text-gray-600 mb-8">
                  Plataforma corporativa de recrutamento com tecnologia avançada e resultados comprovados
                </p>
                
                <ul className="space-y-4">
                  {benefits.map((benefit, index) => (
                    <motion.li
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center gap-3"
                    >
                      <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0" />
                      <span className="text-lg text-gray-700">{benefit}</span>
                    </motion.li>
                  ))}
                </ul>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
                className="relative"
              >
                {/* Cards dos benefícios em grid 2x2 */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Precisão */}
                  <motion.div
                    whileHover={{ y: -5, scale: 1.02 }}
                    transition={{ type: "spring", stiffness: 300 }}
                    className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    <div className="bg-blue-600 rounded-full w-12 h-12 flex items-center justify-center mb-4 mx-auto">
                      <Target className="h-6 w-6 text-white" />
                    </div>
                    <div className="text-center">
                      <h3 className="text-xl font-bold text-blue-900 mb-2">Precisão</h3>
                      <p className="text-blue-700 text-sm">Filtros inteligentes</p>
                    </div>
                  </motion.div>

                  {/* Velocidade */}
                  <motion.div
                    whileHover={{ y: -5, scale: 1.02 }}
                    transition={{ type: "spring", stiffness: 300 }}
                    className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    <div className="bg-green-600 rounded-full w-12 h-12 flex items-center justify-center mb-4 mx-auto">
                      <Zap className="h-6 w-6 text-white" />
                    </div>
                    <div className="text-center">
                      <h3 className="text-xl font-bold text-green-900 mb-2">Velocidade</h3>
                      <p className="text-green-700 text-sm">Processo ágil</p>
                    </div>
                  </motion.div>

                  {/* Alcance */}
                  <motion.div
                    whileHover={{ y: -5, scale: 1.02 }}
                    transition={{ type: "spring", stiffness: 300 }}
                    className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    <div className="bg-purple-600 rounded-full w-12 h-12 flex items-center justify-center mb-4 mx-auto">
                      <Globe className="h-6 w-6 text-white" />
                    </div>
                    <div className="text-center">
                      <h3 className="text-xl font-bold text-purple-900 mb-2">Alcance</h3>
                      <p className="text-purple-700 text-sm">Talentos de todo país</p>
                    </div>
                  </motion.div>

                  {/* Qualidade */}
                  <motion.div
                    whileHover={{ y: -5, scale: 1.02 }}
                    transition={{ type: "spring", stiffness: 300 }}
                    className="bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    <div className="bg-amber-600 rounded-full w-12 h-12 flex items-center justify-center mb-4 mx-auto">
                      <Shield className="h-6 w-6 text-white" />
                    </div>
                    <div className="text-center">
                      <h3 className="text-xl font-bold text-amber-900 mb-2">Qualidade</h3>
                      <p className="text-amber-700 text-sm">Candidatos verificados</p>
                    </div>
                  </motion.div>
                </div>

                {/* Elemento decorativo */}
                <div className="absolute -top-4 -right-4 w-20 h-20 bg-blue-600/10 rounded-full blur-xl"></div>
                <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-green-600/10 rounded-full blur-xl"></div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-slate-900 text-white">
        <div className="container mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              PRONTO PARA REVOLUCIONAR SEU RH?
            </h2>
            <p className="text-xl mb-8 text-slate-300 max-w-2xl mx-auto">
              Junte-se às empresas líderes que já transformaram seu processo de recrutamento com nossa plataforma corporativa
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                onClick={() => navigate('/company-register')}
                className="bg-white text-slate-900 hover:bg-slate-100 px-8 py-3 text-lg font-semibold"
              >
                <div className="flex items-center gap-2">
                  COMEÇAR GRATUITAMENTE
                  <ArrowRight className="h-5 w-5" />
                </div>
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                onClick={() => navigate('/login')}
                className="border-slate-600 text-slate-300 hover:bg-slate-800 px-8 py-3 text-lg"
              >
                FAZER LOGIN
              </Button>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default CompanyLanding;
