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
    <>
      <Helmet>
        <title>CurriculoJá - Crie seu currículo profissional em minutos</title>
        <meta name="description" content="Plataforma inteligente para criação de currículos profissionais. Conecte-se com as melhores oportunidades do mercado de trabalho." />
        <meta name="keywords" content="currículo, emprego, vagas, carreira, trabalho, cv, resume" />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-indigo-50">
        {/* Hero Section */}
        <section className="py-20 bg-blue-600 text-white overflow-hidden relative">
          <div className="container mx-auto px-6 relative">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-center"
            >
              <div className="inline-flex items-center px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-sm font-medium text-blue-200 mb-8">
                <Star className="h-4 w-4 mr-2 text-yellow-400" />
                Mais de 50.000 currículos criados
              </div>
                
              <h1 className="text-5xl md:text-7xl font-extrabold leading-tight">
                Crie seu currículo em
                <span className="block text-yellow-300">
                  2 minutos
                </span>
              </h1>
              
              <p className="text-xl md:text-2xl text-blue-100 max-w-3xl mx-auto leading-relaxed">
                A plataforma mais moderna e eficiente para conectar talentos e oportunidades. 
                Transforme sua carreira hoje mesmo.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
                <Link to="/register">
                  <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-4 text-lg font-semibold rounded-lg shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-200">
                    Criar Currículo Grátis
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link to="/search-jobs">
                  <Button size="lg" variant="outline" className="border-2 border-white text-white hover:bg-white hover:text-blue-600 px-8 py-4 text-lg font-semibold rounded-lg backdrop-blur-sm">
                    Explorar Vagas
                  </Button>
                </Link>
                <Link to="/company-landing">
                  <Button size="lg" variant="ghost" className="text-white hover:bg-white/20 px-8 py-4 text-lg font-semibold rounded-lg">
                    Sou Empresa
                  </Button>
                </Link>
              </div>
              
              <div className="flex items-center justify-center gap-8 pt-8 text-blue-100">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                  <span>100% Gratuito</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                  <span>Sem Cadastro Inicial</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                  <span>Resultado Instantâneo</span>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 bg-gray-50">
          <div className="container mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-center mb-16"
            >
              <h2 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">
                Por que escolher o 
                <span className="text-blue-600"> CurrículoJá</span>?
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Uma plataforma completa com tecnologia de ponta que revoluciona o processo de recrutamento
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    className="group"
                  >
                    <Card className="h-full hover:shadow-2xl transition-all duration-500 border-0 shadow-lg group-hover:-translate-y-2 bg-white">
                      <CardContent className="p-8 text-center">
                        <motion.div 
                          whileHover={{ scale: 1.1, rotate: 5 }}
                          transition={{ type: "spring", stiffness: 300 }}
                          className={`w-16 h-16 ${feature.bgColor} rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:shadow-xl`}
                        >
                          <Icon className={`w-8 h-8 ${feature.color}`} />
                        </motion.div>
                        <h3 className="text-xl font-bold text-gray-800 mb-4">{feature.title}</h3>
                        <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="py-20 bg-white">
          <div className="container mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-center mb-16"
            >
              <h2 className="text-4xl font-bold text-gray-800 mb-4">
                O que nossos usuários dizem
              </h2>
              <p className="text-xl text-gray-600">
                Milhares de profissionais já transformaram suas carreiras conosco
              </p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {testimonials.map((testimonial, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1, duration: 0.6 }}
                  className="group"
                >
                  <Card className="h-full hover:shadow-xl transition-all duration-300 border-0 shadow-md group-hover:-translate-y-1">
                    <CardContent className="p-6">
                      <div className="flex items-center mb-4">
                        {[...Array(testimonial.rating)].map((_, i) => (
                          <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                        ))}
                      </div>
                      <p className="text-gray-700 mb-6 italic leading-relaxed">"{testimonial.content}"</p>
                      <div className="flex items-center">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                          <span className="text-blue-600 font-bold text-lg">
                            {testimonial.name.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-800">{testimonial.name}</h4>
                          <p className="text-sm text-gray-600">{testimonial.role} • {testimonial.company}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Company Section */}
        <section className="py-20 bg-blue-600 text-white overflow-hidden relative">
          <div className="container mx-auto px-6 relative">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
              >
                <h2 className="text-4xl md:text-5xl font-bold leading-tight mb-6">
                  Para empresas que buscam os 
                  <span className="block text-yellow-300">melhores talentos</span>
                </h2>
                <p className="text-xl text-blue-100 mb-8 leading-relaxed">
                  Revolucione seu processo de recrutamento com nossa plataforma inteligente 
                  e encontre candidatos qualificados em minutos.
                </p>
                <ul className="space-y-4 mb-8">
                  {[
                    'Publique vagas em minutos',
                    'IA para match perfeito candidato-vaga',
                    'Dashboard completo com analytics',
                    'Comunicação direta com candidatos',
                    'Banco de currículos verificados',
                    'Relatórios detalhados de performance'
                  ].map((item, index) => (
                    <motion.li
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1, duration: 0.5 }}
                      className="flex items-center text-blue-100"
                    >
                      <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
                      <span className="ml-3">{item}</span>
                    </motion.li>
                  ))}
                </ul>
                <Link to="/company-landing">
                  <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-4 text-lg font-semibold rounded-lg shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-200">
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
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 space-y-6">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center">
                      <Award className="h-6 w-6 text-yellow-800" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">Plataforma Premiada</h3>
                      <p className="text-blue-200">Melhor solução de RH 2024</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-gray-900 text-white relative overflow-hidden">
          <div className="container mx-auto px-6 text-center relative">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="max-w-4xl mx-auto"
            >
              <div className="inline-flex items-center px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-sm font-medium text-gray-300 mb-8">
                <Target className="h-4 w-4 mr-2" />
                Sua próxima oportunidade está aqui
              </div>
              
              <h2 className="text-4xl md:text-6xl font-bold mb-6">
                Pronto para 
                <span className="text-blue-400"> transformar </span>
                sua carreira?
              </h2>
              <p className="text-xl text-gray-300 mb-10 max-w-2xl mx-auto">
                Junte-se a mais de 50.000 profissionais que já encontraram suas oportunidades ideais. 
                Comece gratuitamente hoje mesmo.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
                <Link to="/register">
                  <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-4 text-lg font-semibold rounded-lg shadow-2xl transform hover:scale-105 transition-all duration-200">
                    Criar Conta Grátis
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link to="/login">
                  <Button size="lg" variant="outline" className="border-2 border-white text-white hover:bg-white hover:text-gray-900 px-10 py-4 text-lg font-semibold rounded-lg backdrop-blur-sm">
                    Já tenho conta
                  </Button>
                </Link>
              </div>
              
              <div className="flex items-center justify-center gap-8 pt-12 text-gray-400">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                  <span>Sem compromisso</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                  <span>Suporte 24/7</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                  <span>Resultados garantidos</span>
                </div>
              </div>
            </motion.div>
          </div>
        </section>
      </div>
    </>
  );
};

export default Home;
