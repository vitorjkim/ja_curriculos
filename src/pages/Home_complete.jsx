import React from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle, Star, FileText, Users, Briefcase, TrendingUp, Award, Target, Search, Building2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';

const Home = () => {
  const features = [
    {
      icon: FileText,
      title: "Currículo Inteligente",
      description: "Crie currículos profissionais com IA em minutos. Templates modernos e otimizados para ATS.",
      color: "text-blue-600",
      bgColor: "bg-blue-100"
    },
    {
      icon: Search,
      title: "Busca Inteligente",
      description: "Encontre vagas que combinam perfeitamente com seu perfil usando nossa IA avançada.",
      color: "text-green-600", 
      bgColor: "bg-green-100"
    },
    {
      icon: Users,
      title: "Networking",
      description: "Conecte-se com profissionais da sua área e expanda sua rede de contatos.",
      color: "text-purple-600",
      bgColor: "bg-purple-100"
    },
    {
      icon: Briefcase,
      title: "Gestão de Candidaturas",
      description: "Organize todas suas aplicações em um só lugar e acompanhe o status em tempo real.",
      color: "text-orange-600",
      bgColor: "bg-orange-100"
    },
    {
      icon: TrendingUp,
      title: "Analytics Pessoal",
      description: "Visualizações detalhadas do seu perfil e dicas personalizadas para melhorar.",
      color: "text-red-600",
      bgColor: "bg-red-100"
    },
    {
      icon: Award,
      title: "Certificações",
      description: "Valide suas habilidades com certificações reconhecidas pelo mercado.",
      color: "text-yellow-600",
      bgColor: "bg-yellow-100"
    }
  ];

  const testimonials = [
    {
      name: "Maria Silva",
      role: "Desenvolvedora Frontend",
      company: "Tech Corp",
      content: "Consegui minha vaga dos sonhos em apenas 2 semanas! A plataforma é incrível e muito fácil de usar.",
      rating: 5
    },
    {
      name: "João Santos", 
      role: "Designer UX/UI",
      company: "Creative Agency",
      content: "O currículo gerado pela IA impressionou muito os recrutadores. Recebi várias propostas!",
      rating: 5
    },
    {
      name: "Ana Costa",
      role: "Gerente de Marketing",
      company: "Marketing Pro",
      content: "A funcionalidade de networking me ajudou a conseguir indicações valiosas no mercado.",
      rating: 5
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      <Helmet>
        <title>Horizons - Transforme sua Carreira</title>
        <meta name="description" content="Plataforma inteligente para criação de currículos, busca de vagas e desenvolvimento profissional. Transforme sua carreira com IA." />
      </Helmet>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/30 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/30 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse"></div>

        <div className="relative z-10 container mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
              Transforme sua
              <span className="block bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                Carreira
              </span>
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-blue-100 max-w-3xl mx-auto leading-relaxed">
              Plataforma inteligente para criação de currículos, busca de vagas e desenvolvimento profissional com IA
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
              <Link to="/register">
                <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-4 text-lg font-semibold rounded-xl shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-200">
                  Criar Currículo Grátis
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to="/search-jobs">
                <Button size="lg" variant="outline" className="border-2 border-white text-white hover:bg-white hover:text-blue-600 px-8 py-4 text-lg font-semibold rounded-xl backdrop-blur-sm">
                  Explorar Vagas
                </Button>
              </Link>
              <Link to="/company-landing">
                <Button size="lg" variant="ghost" className="text-white hover:bg-white/20 px-8 py-4 text-lg font-semibold rounded-xl">
                  Sou Empresa
                </Button>
              </Link>
            </div>

            <div className="flex items-center justify-center gap-8 pt-8 text-blue-100">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                <span>100% Gratuito</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                <span>IA Avançada</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                <span>ATS Otimizado</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-gray-800 mb-6">
              Tudo que você precisa
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Uma plataforma completa com tecnologia de ponta que revoluciona o processo de recrutamento
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              const borderColors = {
                0: "border-blue-200 hover:border-blue-400 hover:shadow-blue-200/30",
                1: "border-green-200 hover:border-green-400 hover:shadow-green-200/30", 
                2: "border-purple-200 hover:border-purple-400 hover:shadow-purple-200/30",
                3: "border-orange-200 hover:border-orange-400 hover:shadow-orange-200/30",
                4: "border-red-200 hover:border-red-400 hover:shadow-red-200/30",
                5: "border-yellow-200 hover:border-yellow-400 hover:shadow-yellow-200/30"
              };
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  whileHover={{ 
                    scale: 1.05,
                    y: -4,
                    transition: { duration: 0.2 }
                  }}
                  animate={{ 
                    scale: 1,
                    y: 0,
                    transition: { duration: 0.05 }
                  }}
                  transition={{ 
                    duration: 0.6, 
                    delay: 0,
                    ease: "easeOut"
                  }}
                  className={`group bg-white rounded-xl p-7 shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer border-2 ${borderColors[index]}`}
                >
                  <div className="text-center">
                    <div className={`w-14 h-14 ${feature.bgColor} rounded-xl flex items-center justify-center mx-auto mb-5 group-hover:scale-110 transition-transform duration-300`}>
                      <Icon className={`w-7 h-7 ${feature.color} transition-colors duration-300`} />
                    </div>

                    <h3 className={`text-xl font-bold mb-4 transition-colors duration-300 ${feature.color.replace('600', '700')}`}>
                      {feature.title}
                    </h3>

                    <p className="text-gray-600 leading-relaxed group-hover:text-gray-800 transition-colors duration-300">
                      {feature.description}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Journey Cards Section */}
      <section className="py-20 bg-gradient-to-b from-gray-50 to-white">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-gray-800 mb-6">
              Sua jornada para o sucesso
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Um sistema completo que acompanha você em cada etapa da sua evolução profissional
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
            {/* Card 1 - Criação Inteligente */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0 }}
              className="group relative bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-all duration-300 border-l-4 border-blue-500 overflow-hidden cursor-pointer"
              whileHover={{ y: -3 }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-blue-700 -translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out"></div>
              
              <div className="relative z-10 transition-all duration-300">
                <div className="w-12 h-12 bg-blue-100 group-hover:bg-white/20 rounded-full flex items-center justify-center mb-4 transition-all duration-300">
                  <FileText className="h-6 w-6 text-blue-600 group-hover:text-white transition-colors duration-300" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 group-hover:text-white mb-2 transition-colors duration-300">Criação Inteligente</h3>
                
                <p className="text-gray-600 group-hover:text-blue-100 text-sm mb-2 transition-colors duration-300 font-semibold">
                  • Análise automática de perfil
                </p>
                <p className="text-gray-600 group-hover:text-blue-100 text-sm mb-2 transition-colors duration-300 font-semibold">
                  • Templates otimizados (ATS)
                </p>
                <p className="text-gray-600 group-hover:text-blue-100 text-sm mb-2 transition-colors duration-300 font-semibold">
                  • Sugestões personalizadas
                </p>
                <p className="text-gray-600 group-hover:text-blue-100 text-sm mb-4 transition-colors duration-300 font-semibold">
                  • Export PDF profissional
                </p>
                
                <div className="bg-blue-50 group-hover:bg-white/20 rounded-lg p-3 transition-all duration-300">
                  <div className="text-2xl font-bold text-blue-600 group-hover:text-white transition-colors duration-300">92%</div>
                  <div className="text-xs text-blue-700 group-hover:text-blue-100 transition-colors duration-300">Melhoria de performance</div>
                </div>
              </div>
            </motion.div>

            {/* Card 2 - Trilha Personalizada */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0 }}
              className="group relative bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-all duration-300 border-l-4 border-green-500 overflow-hidden cursor-pointer"
              whileHover={{ y: -3 }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-green-600 to-green-700 -translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out"></div>
              
              <div className="relative z-10 transition-all duration-300">
                <div className="w-12 h-12 bg-green-100 group-hover:bg-white/20 rounded-full flex items-center justify-center mb-4 transition-all duration-300">
                  <Target className="h-6 w-6 text-green-600 group-hover:text-white transition-colors duration-300" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 group-hover:text-white mb-2 transition-colors duration-300">Trilha Personalizada</h3>
                
                <p className="text-gray-600 group-hover:text-green-100 text-sm mb-2 transition-colors duration-300 font-semibold">
                  • Avaliação de competências
                </p>
                <p className="text-gray-600 group-hover:text-green-100 text-sm mb-2 transition-colors duration-300 font-semibold">
                  • Trilha de estudos personalizada
                </p>
                <p className="text-gray-600 group-hover:text-green-100 text-sm mb-2 transition-colors duration-300 font-semibold">
                  • Materiais curados
                </p>
                <p className="text-gray-600 group-hover:text-green-100 text-sm mb-4 transition-colors duration-300 font-semibold">
                  • Certificados de progresso
                </p>
                
                <div className="bg-green-50 group-hover:bg-white/20 rounded-lg p-3 transition-all duration-300">
                  <div className="text-2xl font-bold text-green-600 group-hover:text-white transition-colors duration-300">89%</div>
                  <div className="text-xs text-green-700 group-hover:text-green-100 transition-colors duration-300">Taxa de conclusão</div>
                </div>
              </div>
            </motion.div>

            {/* Card 3 - Preparação para Entrevistas */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0 }}
              className="group relative bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-all duration-300 border-l-4 border-purple-500 overflow-hidden cursor-pointer"
              whileHover={{ y: -3 }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-purple-700 -translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out"></div>
              
              <div className="relative z-10 transition-all duration-300">
                <div className="w-12 h-12 bg-purple-100 group-hover:bg-white/20 rounded-full flex items-center justify-center mb-4 transition-all duration-300">
                  <Users className="h-6 w-6 text-purple-600 group-hover:text-white transition-colors duration-300" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 group-hover:text-white mb-2 transition-colors duration-300">Prep. Entrevistas</h3>
                
                <p className="text-gray-600 group-hover:text-purple-100 text-sm mb-2 transition-colors duration-300 font-semibold">
                  • Simulações com IA
                </p>
                <p className="text-gray-600 group-hover:text-purple-100 text-sm mb-2 transition-colors duration-300 font-semibold">
                  • +500 perguntas por área
                </p>
                <p className="text-gray-600 group-hover:text-purple-100 text-sm mb-2 transition-colors duration-300 font-semibold">
                  • Feedback personalizado
                </p>
                <p className="text-gray-600 group-hover:text-purple-100 text-sm mb-4 transition-colors duration-300 font-semibold">
                  • Mentoria com especialistas
                </p>
                
                <div className="bg-purple-50 group-hover:bg-white/20 rounded-lg p-3 transition-all duration-300">
                  <div className="text-2xl font-bold text-purple-600 group-hover:text-white transition-colors duration-300">87%</div>
                  <div className="text-xs text-purple-700 group-hover:text-purple-100 transition-colors duration-300">Taxa de aprovação</div>
                </div>
              </div>
            </motion.div>

            {/* Card 4 - Acompanhamento */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0 }}
              className="group relative bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-all duration-300 border-l-4 border-amber-500 overflow-hidden cursor-pointer"
              whileHover={{ y: -3 }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-amber-600 to-amber-700 -translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out"></div>
              
              <div className="relative z-10 transition-all duration-300">
                <div className="w-12 h-12 bg-amber-100 group-hover:bg-white/20 rounded-full flex items-center justify-center mb-4 transition-all duration-300">
                  <TrendingUp className="h-6 w-6 text-amber-600 group-hover:text-white transition-colors duration-300" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 group-hover:text-white mb-2 transition-colors duration-300">Acompanhamento</h3>
                
                <p className="text-gray-600 group-hover:text-amber-100 text-sm mb-2 transition-colors duration-300 font-semibold">
                  • Dashboard em tempo real
                </p>
                <p className="text-gray-600 group-hover:text-amber-100 text-sm mb-2 transition-colors duration-300 font-semibold">
                  • Relatórios de visualizações
                </p>
                <p className="text-gray-600 group-hover:text-amber-100 text-sm mb-2 transition-colors duration-300 font-semibold">
                  • Análise de candidaturas
                </p>
                <p className="text-gray-600 group-hover:text-amber-100 text-sm mb-4 transition-colors duration-300 font-semibold">
                  • Suporte 24/7 disponível
                </p>
                
                <div className="bg-amber-50 group-hover:bg-white/20 rounded-lg p-3 transition-all duration-300">
                  <div className="text-2xl font-bold text-amber-600 group-hover:text-white transition-colors duration-300">24/7</div>
                  <div className="text-xs text-amber-700 group-hover:text-amber-100 transition-colors duration-300">Suporte disponível</div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-gradient-to-b from-gray-50 to-white relative overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute top-10 left-10 w-72 h-72 bg-blue-200/30 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse"></div>
        <div className="absolute bottom-10 right-10 w-72 h-72 bg-purple-200/30 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse"></div>
        
        <div className="container mx-auto px-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-full text-sm font-semibold mb-6">
              ⭐ Avaliações verificadas
            </div>
            <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent mb-6">
              O que nossos usuários dizem
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              +12.000 profissionais já transformaram suas carreiras conosco
            </p>
            <div className="flex items-center justify-center mt-4 space-x-2">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                ))}
              </div>
              <span className="text-gray-600 font-medium">4.9/5 baseado em 2.847 avaliações</span>
            </div>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {testimonials.map((testimonial, index) => {
              const gradientColors = [
                "from-blue-500 to-cyan-500",
                "from-purple-500 to-pink-500", 
                "from-green-500 to-emerald-500"
              ];
              const bgColors = [
                "bg-blue-50 border-blue-200",
                "bg-purple-50 border-purple-200",
                "bg-green-50 border-green-200"
              ];
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  whileHover={{ 
                    y: -8,
                    scale: 1.02,
                    transition: { duration: 0.3 }
                  }}
                  animate={{ 
                    y: 0,
                    scale: 1,
                    transition: { duration: 0.1 }
                  }}
                  transition={{ delay: 0, duration: 0.6 }}
                  className="group relative"
                >
                  {/* Card with gradient border */}
                  <div className={`h-full bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border-2 ${bgColors[index]} relative overflow-hidden`}>
                    {/* Gradient accent */}
                    <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${gradientColors[index]}`}></div>
                    
                    {/* Quote icon */}
                    <div className="absolute top-4 right-4 text-4xl text-gray-200 font-serif">"</div>
                    
                    {/* Stars */}
                    <div className="flex items-center mb-6">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                      ))}
                    </div>
                    
                    {/* Testimonial content */}
                    <p className="text-gray-700 mb-8 text-lg leading-relaxed font-medium">
                      "{testimonial.content}"
                    </p>
                    
                    {/* User info */}
                    <div className="flex items-center">
                      <div className={`w-14 h-14 bg-gradient-to-r ${gradientColors[index]} rounded-full flex items-center justify-center mr-4 shadow-lg`}>
                        <span className="text-white font-bold text-lg">
                          {testimonial.name.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-800 text-lg">{testimonial.name}</h4>
                        <p className="text-gray-600 font-medium">{testimonial.role}</p>
                        <p className="text-sm text-gray-500 font-medium">{testimonial.company}</p>
                      </div>
                    </div>
                    
                    {/* Verified badge */}
                    <div className="absolute bottom-4 right-4 flex items-center bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-semibold">
                      ✓ Verificado
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
          
          {/* Bottom CTA */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="text-center mt-16"
          >
            <div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl mx-auto border border-gray-100">
              <h3 className="text-2xl font-bold text-gray-800 mb-4">
                Pronto para ser o próximo caso de sucesso?
              </h3>
              <p className="text-gray-600 mb-6">
                Junte-se a milhares de profissionais que já alcançaram seus objetivos
              </p>
              <button className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-full font-semibold hover:from-blue-700 hover:to-purple-700 transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl">
                Começar Agora - É Grátis
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Company Section */}
      <section className="py-24 bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 text-white overflow-hidden relative">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="container mx-auto px-6 relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div className="inline-flex items-center bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 mb-6">
                <Building2 className="h-5 w-5 mr-2" />
                <span className="text-sm font-semibold">Para Empresas</span>
              </div>
              
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                Encontre os melhores
                <span className="block text-yellow-400">talentos</span>
              </h2>
              
              <p className="text-xl text-blue-100 mb-8 leading-relaxed">
                Revolucione seu processo de recrutamento com nossa plataforma de IA. 
                Conecte-se com candidatos qualificados e acelere suas contratações.
              </p>
              
              <ul className="space-y-4 mb-12">
                {[
                  "Busca inteligente por habilidades e experiência",
                  "Análise automatizada de currículos", 
                  "Dashboard completo de candidaturas",
                  "Integração com sistemas de RH"
                ].map((item, index) => (
                  <motion.li
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1, duration: 0.5 }}
                    className="flex items-center gap-3 text-blue-100"
                  >
                    <CheckCircle className="h-6 w-6 text-yellow-400 flex-shrink-0" />
                    <span className="text-lg">{item}</span>
                  </motion.li>
                ))}
              </ul>
              
              <Link to="/company-landing">
                <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-4 text-lg font-semibold rounded-xl shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-200">
                  Começar Agora - É Grátis
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="relative"
            >
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8">
                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-white/10 rounded-lg p-4 text-center">
                    <div className="text-3xl font-bold text-yellow-400 mb-2">85%</div>
                    <div className="text-sm text-blue-100">Redução no tempo de contratação</div>
                  </div>
                  <div className="bg-white/10 rounded-lg p-4 text-center">
                    <div className="text-3xl font-bold text-yellow-400 mb-2">92%</div>
                    <div className="text-sm text-blue-100">Precisão no matching</div>
                  </div>
                  <div className="bg-white/10 rounded-lg p-4 text-center">
                    <div className="text-3xl font-bold text-yellow-400 mb-2">+500</div>
                    <div className="text-sm text-blue-100">Empresas parceiras</div>
                  </div>
                  <div className="bg-white/10 rounded-lg p-4 text-center">
                    <div className="text-3xl font-bold text-yellow-400 mb-2">15k</div>
                    <div className="text-sm text-blue-100">Vagas preenchidas</div>
                  </div>
                </div>

                <div className="mt-8 p-6 bg-white/10 rounded-lg">
                  <div className="flex items-center mb-4">
                    <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center mr-3">
                      <span className="text-blue-900 font-bold">🏢</span>
                    </div>
                    <div>
                      <div className="font-semibold">Tech Innovations Corp</div>
                      <div className="text-sm text-blue-200">Empresa parceira</div>
                    </div>
                  </div>
                  <p className="text-blue-100 italic">
                    "Com o Horizons, conseguimos preencher 20 vagas de TI em apenas 15 dias. 
                    A qualidade dos candidatos é excepcional!"
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-24 bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-900/20 to-purple-900/20"></div>
        
        <div className="container mx-auto px-6 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-4xl md:text-6xl font-bold mb-6">
              Transforme sua carreira
              <span className="block bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                hoje mesmo
              </span>
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-12">
              Junte-se a milhares de profissionais que já descobriram o poder da nossa plataforma inteligente
            </p>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
              <Link to="/register">
                <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-4 text-lg font-semibold rounded-xl shadow-2xl transform hover:scale-105 transition-all duration-200">
                  Criar Conta Grátis
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to="/login">
                <Button size="lg" variant="outline" className="border-2 border-white text-white hover:bg-white hover:text-gray-900 px-10 py-4 text-lg font-semibold rounded-xl backdrop-blur-sm">
                  Já tenho conta
                </Button>
              </Link>
            </div>
            
            <div className="flex items-center justify-center gap-8 pt-12 text-gray-400">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                <span>Sem cartão de crédito</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                <span>Suporte 24/7</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                <span>Dados seguros</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default Home;
