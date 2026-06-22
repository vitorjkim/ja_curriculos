import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet';
import { Check, X, ArrowRight, Star, Zap, Shield, Users, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';

const SubscriptionPlans = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState('free');

  // Design minimalista e moderno
  const plans = [
    {
      id: 'free',
      name: 'Starter',
      price: 'Grátis',
      description: 'Para começar',
      features: [
        '1 vaga ativa',
        '10 currículos/mês',
        'Suporte básico'
      ],
      limitations: [
        'Sem relatórios avançados',
        'Sem interações rápidas',
        'Sem candidatos favoritos'
      ],
      buttonText: 'Plano Atual',
      buttonStyle: 'secondary',
      current: true
    },
    {
      id: 'pro',
      name: 'Professional',
      price: 'R$ 30',
      period: '/mês',
      yearlyPrice: 'R$ 300/ano',
      yearlyDiscount: 'Economize R$ 60',
      description: 'Para empresas profissionais',
      features: [
        '5 vagas ativas',
        '200 currículos/mês',
        'Relatórios detalhados',
        'Interações rápidas',
        'Candidatos favoritos',
        'Suporte prioritário'
      ],
      buttonText: 'Escolher Pro',
      buttonStyle: 'primary',
      popular: true,
      current: false
    }
  ];

  const handleSelectPlan = (planId) => {
    if (planId === 'pro') {
      navigate('/payment');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Helmet>
        <title>Planos de Assinatura - JáCurrículos</title>
      </Helmet>

      {/* Header Section */}
      <div className="relative overflow-hidden bg-white">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-purple-600/5"></div>
        <div className="relative max-w-7xl mx-auto px-6 py-16">
          <div className="text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-medium mb-6"
            >
              <Building2 className="w-4 h-4" />
              Planos para Empresas
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-4xl md:text-5xl font-bold text-gray-900 mb-4"
            >
              Escolha o plano ideal para 
              <span className="text-blue-600"> sua empresa</span>
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-xl text-gray-600 max-w-2xl mx-auto"
            >
              Encontre os melhores talentos com nossas ferramentas profissionais de recrutamento
            </motion.p>
          </div>
        </div>
      </div>

      {/* Plans Section */}
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="relative"
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                  <div className="bg-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2">
                    <Star className="w-4 h-4" />
                    Mais Popular
                  </div>
                </div>
              )}
              
              <Card className={`relative h-full transition-all duration-300 hover:shadow-2xl ${
                plan.popular 
                  ? 'border-2 border-blue-200 shadow-xl bg-white' 
                  : 'border border-gray-200 hover:border-gray-300 bg-white'
              }`}>
                <CardHeader className="pb-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <CardTitle className="text-2xl font-bold text-gray-900 mb-1">
                        {plan.name}
                      </CardTitle>
                      <p className="text-gray-600">{plan.description}</p>
                    </div>
                    {plan.current && (
                      <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
                        Atual
                      </div>
                    )}
                  </div>
                  
                  <div className="mb-6">
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-bold text-gray-900">
                        {plan.price}
                      </span>
                      {plan.period && (
                        <span className="text-gray-600">{plan.period}</span>
                      )}
                    </div>
                    {plan.yearlyDiscount && (
                      <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-sm text-green-700 font-medium">
                          💰 Anual: {plan.yearlyPrice} • {plan.yearlyDiscount}
                        </p>
                      </div>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  <div className="space-y-4 mb-8">
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">Incluído:</h4>
                      <ul className="space-y-3">
                        {plan.features.map((feature, idx) => (
                          <li key={idx} className="flex items-center gap-3">
                            <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                              <Check className="w-3 h-3 text-green-600" />
                            </div>
                            <span className="text-gray-700">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {plan.limitations && (
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-3">Limitações:</h4>
                        <ul className="space-y-3">
                          {plan.limitations.map((limitation, idx) => (
                            <li key={idx} className="flex items-center gap-3">
                              <div className="w-5 h-5 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <X className="w-3 h-3 text-gray-400" />
                              </div>
                              <span className="text-gray-500">{limitation}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  <Button
                    onClick={() => handleSelectPlan(plan.id)}
                    disabled={plan.current}
                    className={`w-full h-12 font-semibold transition-all duration-200 ${
                      plan.buttonStyle === 'primary'
                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl'
                        : 'bg-gray-100 text-gray-600 cursor-not-allowed hover:bg-gray-100'
                    }`}
                  >
                    {plan.buttonText}
                    {!plan.current && (
                      <ArrowRight className="w-4 h-4 ml-2" />
                    )}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Features Comparison */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-16"
        >
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Por que escolher o JáCurrículos?
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Ferramentas profissionais para encontrar os melhores candidatos
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <Zap className="w-8 h-8 text-blue-600" />,
                title: "Rápido e Eficiente",
                description: "Encontre candidatos qualificados em minutos, não em dias"
              },
              {
                icon: <Shield className="w-8 h-8 text-green-600" />,
                title: "Seguro e Confiável",
                description: "Seus dados e dos candidatos estão sempre protegidos"
              },
              {
                icon: <Users className="w-8 h-8 text-purple-600" />,
                title: "Milhares de Candidatos",
                description: "Acesso a uma base crescente de profissionais qualificados"
              }
            ].map((benefit, index) => (
              <div key={index} className="text-center p-6 bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="flex justify-center mb-4">
                  {benefit.icon}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {benefit.title}
                </h3>
                <p className="text-gray-600">
                  {benefit.description}
                </p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-16 text-center bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white"
        >
          <h2 className="text-3xl font-bold mb-4">
            Pronto para encontrar os melhores talentos?
          </h2>
          <p className="text-blue-100 mb-6 max-w-2xl mx-auto">
            Junte-se a centenas de empresas que já encontraram seus colaboradores ideais
          </p>
          <Button
            onClick={() => navigate('/payment')}
            className="bg-white text-blue-600 hover:bg-gray-50 font-semibold px-8 py-3 h-auto"
          >
            Começar Agora
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </motion.div>
      </div>
    </div>
  );
};

export default SubscriptionPlans;
