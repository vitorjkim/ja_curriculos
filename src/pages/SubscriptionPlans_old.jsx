import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet';
import { Check, X, ArrowRight, Star, Zap, Shield, Users, Building2, CheckCircle, Sparkles, Target, TrendingUp, Crown, Rocket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';

const SubscriptionPlans = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const plans = [
    {
      id: 'free',
      name: 'Starter',
      price: 'Grátis',
      description: 'Perfeito para começar',
      subtitle: 'Ideal para pequenas empresas',
      features: [
        '1 vaga ativa',
        '10 visualizações de currículos/mês',
        'Suporte básico por email',
        'Painel de controle simples',
        'Busca básica de candidatos'
      ],
      limitations: [
        'Sem relatórios avançados',
        'Sem mensagens diretas',
        'Sem favoritos ilimitados',
        'Sem filtros avançados'
      ],
      buttonText: 'Começar Grátis',
      buttonStyle: 'secondary',
      icon: Target,
      color: 'blue'
    },
    {
      id: 'pro',
      name: 'Professional',
      price: 'R$ 30',
      period: '/mês',
      yearlyPrice: 'R$ 300',
      yearlyDiscount: 'Economize R$ 60 por ano',
      description: 'Para empresas em crescimento',
      subtitle: 'Recursos completos de recrutamento',
      features: [
        '5 vagas ativas simultâneas',
        '200 visualizações de currículos/mês',
        'Mensagens diretas ilimitadas',
        'Relatórios detalhados e analytics',
        'Filtros avançados de busca',
        'Suporte prioritário',
        'Favoritos ilimitados',
        'Dashboard premium com insights'
      ],
      buttonText: 'Assinar Professional',
      buttonStyle: 'primary',
      popular: true,
      icon: Crown,
      color: 'purple'
    }
  ];

  const benefits = [
    {
      icon: Zap,
      title: "Setup em 2 Minutos",
      description: "Configure sua conta e comece a encontrar talentos imediatamente"
    },
    {
      icon: Shield,
      title: "100% Seguro",
      description: "Dados protegidos com criptografia de nível bancário"
    },
    {
      icon: Users,
      title: "Milhares de Talentos",
      description: "Acesso à maior base de candidatos qualificados do Brasil"
    },
    {
      icon: Sparkles,
      title: "IA Inteligente",
      description: "Matching automático entre suas vagas e os melhores candidatos"
    }
  ];

  const handleSelectPlan = (planId) => {
    if (planId === 'pro') {
      navigate('/payment');
    } else if (planId === 'free') {
      // Redirecionar para registro/login para começar com plano gratuito
      navigate('/company-register');
    }
  };

  return (
    <>
      <Helmet>
        <title>Planos para Empresas - CurrículoJá</title>
        <meta name="description" content="Escolha o plano ideal para sua empresa. Comece grátis ou upgrade para recursos profissionais." />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-indigo-50">
        
        {/* Hero Section */}
        <section className="py-20 bg-blue-600 text-white overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800"></div>
          <div className="container mx-auto px-6 relative">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-center max-w-4xl mx-auto"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm text-white px-6 py-3 rounded-full text-sm font-medium mb-8 border border-white/20"
              >
                <Building2 className="w-5 h-5" />
                Planos para Empresas
              </motion.div>
              
              <h1 className="text-5xl md:text-7xl font-extrabold leading-tight mb-6">
                Conecte-se aos
                <span className="block text-yellow-300">
                  melhores talentos
                </span>
                <span className="block text-4xl md:text-5xl text-blue-100 font-bold mt-2">
                  em tempo recorde
                </span>
              </h1>
              
              <p className="text-xl md:text-2xl text-blue-100 max-w-4xl mx-auto leading-relaxed mb-8">
                Plataforma inteligente de recrutamento que utiliza IA avançada para conectar empresas visionárias aos profissionais mais qualificados do mercado
              </p>
              
              <div className="flex items-center justify-center gap-8 text-blue-100">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                  <span>Grátis para começar</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                  <span>IA de última geração</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                  <span>Resultados em 24h</span>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Plans Section - Layout Único */}
        <section className="py-24 relative">
          <div className="container mx-auto px-6">
            <div className="text-center mb-16">
              <motion.h2 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="text-4xl md:text-5xl font-bold text-gray-900 mb-4"
              >
                Escolha seu plano
              </motion.h2>
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="text-xl text-gray-600 max-w-2xl mx-auto"
              >
                Comece grátis e faça upgrade quando sua empresa crescer
              </motion.p>
            </div>

            <div className="max-w-6xl mx-auto">
              <div className="grid lg:grid-cols-2 gap-8 items-start">
                {plans.map((plan, index) => {
                  const IconComponent = plan.icon;
                  return (
                    <motion.div
                      key={plan.id}
                      initial={{ opacity: 0, y: 30 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: index * 0.1 }}
                      className="relative"
                    >
                      {plan.popular && (
                        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-full text-sm font-medium flex items-center gap-2 shadow-lg">
                            <Star className="w-4 h-4 fill-current" />
                            Mais Popular
                          </div>
                        </div>
                      )}
                      
                      <Card className={`relative overflow-hidden transition-all duration-500 group hover:shadow-2xl ${
                        plan.popular 
                          ? 'border-2 border-blue-200 shadow-xl scale-105 lg:scale-110' 
                          : 'border border-gray-200 hover:border-blue-200 shadow-lg hover:scale-105'
                      }`}>
                        <CardHeader className="pb-4 relative">
                          {/* Background Pattern */}
                          <div className={`absolute top-0 right-0 w-32 h-32 opacity-5 ${
                            plan.color === 'purple' ? 'text-purple-600' : 'text-blue-600'
                          }`}>
                            <IconComponent className="w-full h-full" />
                          </div>
                          
                          <div className="relative">
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex items-center gap-3">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                                  plan.color === 'purple' 
                                    ? 'bg-gradient-to-br from-purple-500 to-indigo-600' 
                                    : 'bg-gradient-to-br from-blue-500 to-indigo-600'
                                } text-white shadow-lg`}>
                                  <IconComponent className="w-6 h-6" />
                                </div>
                                <div>
                                  <CardTitle className="text-2xl font-bold text-gray-900">
                                    {plan.name}
                                  </CardTitle>
                                  <p className="text-gray-600 font-medium">{plan.description}</p>
                                  <p className="text-sm text-gray-500">{plan.subtitle}</p>
                                </div>
                              </div>
                            </div>
                            
                            <div className="mb-6">
                              <div className="flex items-baseline gap-2 mb-2">
                                <span className="text-5xl font-bold text-gray-900">
                                  {plan.price}
                                </span>
                                {plan.period && (
                                  <span className="text-xl text-gray-600">{plan.period}</span>
                                )}
                              </div>
                              {plan.yearlyDiscount && (
                                <div className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl">
                                  <p className="text-sm text-green-700 font-medium flex items-center gap-2">
                                    <span className="text-lg">💰</span>
                                    Anual: {plan.yearlyPrice} • {plan.yearlyDiscount}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardHeader>

                        <CardContent className="pt-0">
                          <div className="space-y-6 mb-8">
                            <div>
                              <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <CheckCircle className="w-5 h-5 text-green-600" />
                                O que está incluído:
                              </h4>
                              <ul className="space-y-3">
                                {plan.features.map((feature, idx) => (
                                  <li key={idx} className="flex items-start gap-3">
                                    <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                      <Check className="w-3 h-3 text-green-600" />
                                    </div>
                                    <span className="text-gray-700 leading-relaxed">{feature}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>

                            {plan.limitations && (
                              <div>
                                <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                                  <X className="w-5 h-5 text-gray-400" />
                                  Limitações:
                                </h4>
                                <ul className="space-y-3">
                                  {plan.limitations.map((limitation, idx) => (
                                    <li key={idx} className="flex items-start gap-3">
                                      <div className="w-5 h-5 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <X className="w-3 h-3 text-gray-400" />
                                      </div>
                                      <span className="text-gray-500 leading-relaxed">{limitation}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>

                          <motion.div
                            whileHover={{ y: -2 }}
                            whileTap={{ scale: 0.98 }}
                            transition={{ duration: 0.1 }}
                          >
                            <Button
                              onClick={() => handleSelectPlan(plan.id)}
                              className={`w-full h-14 font-semibold text-lg transition-all duration-300 group ${
                                plan.buttonStyle === 'primary'
                                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl border-0'
                                  : 'bg-white border-2 border-blue-600 text-blue-600 hover:bg-blue-50 hover:border-blue-700'
                              }`}
                            >
                              {plan.buttonText}
                              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                            </Button>
                          </motion.div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-20 bg-white">
          <div className="container mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-center mb-16"
            >
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                Por que empresas escolhem o 
                <span className="text-blue-600"> CurrículoJá</span>?
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Tecnologia de ponta e experiência superior para encontrar os melhores talentos
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {benefits.map((benefit, index) => {
                const IconComponent = benefit.icon;
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                    whileHover={{ y: -5 }}
                    className="text-center group"
                  >
                    <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-blue-200 transition-colors duration-300">
                      <IconComponent className="w-8 h-8 text-blue-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3">
                      {benefit.title}
                    </h3>
                    <p className="text-gray-600 leading-relaxed">
                      {benefit.description}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-blue-600 text-white overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800"></div>
          <div className="container mx-auto px-6 relative">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-center max-w-4xl mx-auto"
            >
              <h2 className="text-4xl md:text-6xl font-bold mb-6">
                Pronto para 
                <span className="text-yellow-300"> revolucionar</span> 
                <br />seu recrutamento?
              </h2>
              <p className="text-xl text-blue-100 mb-8 max-w-3xl mx-auto">
                Junte-se a milhares de empresas que já encontraram seus talentos ideais
              </p>
              
              <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
                <motion.div
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ duration: 0.1 }}
                >
                  <Button
                    onClick={() => handleSelectPlan('free')}
                    className="bg-white text-blue-600 hover:bg-blue-50 hover:text-blue-700 font-semibold px-10 py-4 text-lg h-auto rounded-xl shadow-lg hover:shadow-xl border border-blue-100 hover:border-blue-200 group transition-all duration-300"
                  >
                    Começar Grátis
                    <Rocket className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </motion.div>

                <motion.div
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ duration: 0.1 }}
                >
                  <Button
                    onClick={() => handleSelectPlan('pro')}
                    className="border-2 border-white/60 bg-transparent text-white hover:border-white hover:bg-white/10 font-semibold px-10 py-4 text-lg h-auto rounded-xl backdrop-blur-sm transition-all duration-300 group"
                  >
                    Ir para Professional
                    <Crown className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </motion.div>
              </div>

              <div className="flex items-center justify-center gap-8 pt-8 text-blue-100">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                  <span>Sem compromisso</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                  <span>Setup em 2 minutos</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                  <span>Suporte especializado</span>
                </div>
              </div>
            </motion.div>
          </div>
        </section>
      </div>
    </>
  );
};

export default SubscriptionPlans;
