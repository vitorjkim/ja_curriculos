import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet';
import { Check, X, Briefcase, Users, BarChart3, Star, Heart, Building2, Zap, Globe, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';

const SubscriptionPlans = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState('free'); // Plano free já selecionado

  const plans = [
    {
      id: 'free',
      name: 'Plano Gratuito',
      subtitle: 'Ideal para começar',
      price: 'R$ 0',
      period: '/mês',
      color: 'gray',
      popular: false,
      badge: '🚀 STARTER',
      features: [
        { text: 'Publicar até 1 vaga ativa', included: true, icon: '📝' },
        { text: 'Acesso a até 10 currículos/mês', included: true, icon: '👥' },
        { text: 'Relatórios básicos', included: false, icon: '📊' },
        { text: 'Interações rápidas', included: false, icon: '⚡' },
        { text: 'Salvar/Favoritar candidatos', included: false, icon: '❤️' },
        { text: 'Suporte por email', included: true, icon: '📧' }
      ]
    },
    {
      id: 'pro',
      name: 'Plano Pro',
      subtitle: 'Para empresas que crescem',
      price: 'R$ 30',
      period: '/mês',
      yearlyPrice: 'R$ 300/ano',
      yearlyDiscount: '2 meses grátis',
      color: 'blue',
      popular: true,
      badge: '👑 PREMIUM',
      features: [
        { text: 'Publicar até 5 vagas ativas', included: true, icon: '📝' },
        { text: 'Acesso a até 200 currículos/mês', included: true, icon: '👥' },
        { text: 'Relatórios de visualização', included: true, icon: '📊' },
        { text: 'Interações rápidas', included: true, icon: '⚡' },
        { text: 'Salvar/Favoritar candidatos', included: true, icon: '❤️' },
        { text: 'Suporte prioritário 24/7', included: true, icon: '🎯' }
      ]
    }
  ];

  const handlePlanSelect = (planId) => {
    setSelectedPlan(planId);
  };

  const handleContinue = () => {
    if (selectedPlan === 'free') {
      // Para plano free, apenas redireciona para o dashboard
      navigate('/company-dashboard');
    } else if (selectedPlan === 'pro') {
      // Para plano pro, vai para página de pagamento
      navigate('/payment', { state: { plan: 'pro' } });
    }
  };

  const handleSkip = () => {
    // Sempre vai para o dashboard com plano free
    navigate('/company-dashboard');
  };

  return (
    <>
      <Helmet>
        <title>Escolha seu Plano - CurrículoJá</title>
        <meta name="description" content="Escolha o plano ideal para sua empresa e comece a encontrar os melhores talentos." />
      </Helmet>

      {/* Hero Section */}
      <section className="relative min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
        {/* Background pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 to-transparent"></div>
        
        <div className="container mx-auto px-6 relative z-10 py-16">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center mb-16"
            >
              {/* Corporate Badge */}
              <div className="inline-flex items-center gap-2 bg-blue-900/20 backdrop-blur-sm border border-blue-400/30 text-blue-200 px-6 py-3 rounded-full text-sm font-semibold mb-8">
                <Building2 className="h-4 w-4" />
                ESCOLHA SEU PLANO
              </div>

              <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 text-white leading-tight">
                COMECE A
                <br />
                <span className="bg-gradient-to-r from-blue-400 to-blue-300 bg-clip-text text-transparent">RECRUTAR</span>
              </h1>

              <p className="text-xl md:text-2xl text-gray-300 leading-relaxed max-w-3xl mx-auto mb-8">
                Escolha o plano ideal para sua empresa e conecte-se com os melhores talentos do mercado.
              </p>
            </motion.div>

            {/* Plans Grid */}
            <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
              {plans.map((plan, index) => (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.2 }}
                  whileHover={{ scale: 1.03, y: -10 }}
                  className="relative"
                >
                  <Card 
                    className={`relative cursor-pointer transition-all duration-500 h-full overflow-hidden ${
                      selectedPlan === plan.id 
                        ? 'ring-4 ring-blue-400 shadow-2xl bg-white/98 transform scale-105' 
                        : 'hover:shadow-2xl bg-white/90 backdrop-blur-sm hover:bg-white/95'
                    } ${plan.popular ? 'border-2 border-blue-400 shadow-blue-500/25' : 'border border-gray-200/50'}`}
                    onClick={() => handlePlanSelect(plan.id)}
                  >
                    {/* Gradient Background */}
                    <div className={`absolute inset-0 opacity-5 ${
                      plan.color === 'blue' 
                        ? 'bg-gradient-to-br from-blue-500 to-purple-600' 
                        : 'bg-gradient-to-br from-gray-500 to-gray-700'
                    }`}></div>

                    {plan.popular && (
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-20">
                        <div className="bg-gradient-to-r from-blue-500 via-purple-500 to-blue-600 text-white px-8 py-2 rounded-full text-sm font-bold shadow-lg border-2 border-white">
                          ⭐ MAIS POPULAR ⭐
                        </div>
                      </div>
                    )}

                    <CardHeader className="text-center pb-6 pt-8 relative z-10">
                      {/* Badge */}
                      <div className={`inline-flex items-center justify-center px-4 py-2 rounded-full text-sm font-bold mb-4 ${
                        plan.color === 'blue' 
                          ? 'bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 border border-blue-200'
                          : 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 border border-gray-300'
                      }`}>
                        {plan.badge}
                      </div>

                      {/* Icon */}
                      <div className={`mx-auto w-24 h-24 ${
                        plan.color === 'blue' 
                          ? 'bg-gradient-to-br from-blue-500 via-blue-600 to-purple-600' 
                          : 'bg-gradient-to-br from-gray-500 via-gray-600 to-gray-700'
                      } rounded-3xl flex items-center justify-center mb-6 shadow-xl relative overflow-hidden`}>
                        {/* Shine effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 translate-x-full group-hover:translate-x-[-200%] transition-transform duration-1000"></div>
                        {plan.id === 'free' ? (
                          <Briefcase className="w-12 h-12 text-white relative z-10" />
                        ) : (
                          <Star className="w-12 h-12 text-white relative z-10" />
                        )}
                      </div>
                      
                      <CardTitle className="text-3xl font-bold text-gray-900 mb-2">
                        {plan.name}
                      </CardTitle>
                      
                      <p className={`text-lg font-medium mb-4 ${
                        plan.color === 'blue' ? 'text-blue-600' : 'text-gray-600'
                      }`}>
                        {plan.subtitle}
                      </p>
                      
                      <div className="text-center mb-6">
                        <div className="flex items-baseline justify-center mb-2">
                          <span className={`text-6xl font-bold ${
                            plan.color === 'blue' ? 'text-blue-600' : 'text-gray-600'
                          }`}>
                            {plan.price}
                          </span>
                          <span className="text-gray-500 ml-2 text-xl">{plan.period}</span>
                        </div>
                        {plan.yearlyPrice && (
                          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-3">
                            <p className="text-green-700 font-bold text-lg">
                              💰 {plan.yearlyPrice}
                            </p>
                            <p className="text-green-600 text-sm font-medium">
                              🎉 {plan.yearlyDiscount}!
                            </p>
                          </div>
                        )}
                      </div>
                    </CardHeader>

                    <CardContent className="px-8 pb-8 relative z-10">
                      <div className="space-y-4 mb-8">
                        {plan.features.map((feature, featureIndex) => (
                          <motion.div 
                            key={featureIndex} 
                            className="flex items-center gap-4 p-3 rounded-xl transition-all duration-300 hover:bg-gray-50/50"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3, delay: featureIndex * 0.1 }}
                          >
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                              feature.included 
                                ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-600 border-2 border-green-200' 
                                : 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-400 border-2 border-gray-200'
                            }`}>
                              {feature.included ? (
                                <Check className="w-5 h-5" />
                              ) : (
                                <X className="w-5 h-5" />
                              )}
                            </div>
                            <span className="text-lg">{feature.icon}</span>
                            <span className={`font-medium ${
                              feature.included ? 'text-gray-800' : 'text-gray-400'
                            }`}>
                              {feature.text}
                            </span>
                          </motion.div>
                        ))}
                      </div>

                      <Button 
                        className={`w-full h-14 text-lg font-bold transition-all duration-300 relative overflow-hidden ${
                          selectedPlan === plan.id
                            ? plan.color === 'blue'
                              ? 'bg-gradient-to-r from-blue-600 via-blue-700 to-purple-600 hover:from-blue-700 hover:via-blue-800 hover:to-purple-700 text-white shadow-xl border-0'
                              : 'bg-gradient-to-r from-gray-600 via-gray-700 to-gray-800 hover:from-gray-700 hover:via-gray-800 hover:to-gray-900 text-white shadow-xl border-0'
                            : `border-3 hover:bg-gray-50 text-gray-700 ${
                                plan.color === 'blue' 
                                  ? 'border-blue-300 hover:border-blue-400' 
                                  : 'border-gray-300 hover:border-gray-400'
                              }`
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlanSelect(plan.id);
                        }}
                      >
                        {/* Button shine effect */}
                        {selectedPlan === plan.id && (
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 translate-x-full hover:translate-x-[-200%] transition-transform duration-1000"></div>
                        )}
                        
                        <span className="relative z-10 flex items-center justify-center gap-3">
                          {selectedPlan === plan.id ? (
                            <>
                              <Check className="w-6 h-6" />
                              ✅ Plano Selecionado
                            </>
                          ) : (
                            <>
                              <Zap className="w-6 h-6" />
                              Selecionar {plan.name}
                            </>
                          )}
                        </span>
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* Action Buttons */}
            <motion.div 
              className="flex flex-col sm:flex-row gap-6 justify-center mt-16"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
            >
              <Button 
                onClick={handleContinue}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-12 py-4 text-xl font-semibold shadow-xl hover:shadow-2xl transition-all duration-300"
                size="lg"
              >
                {selectedPlan === 'free' ? (
                  <>
                    <Zap className="w-6 h-6 mr-3" />
                    Começar Gratuitamente
                  </>
                ) : (
                  <>
                    <Globe className="w-6 h-6 mr-3" />
                    Avançar para Pagamento
                  </>
                )}
              </Button>
              
              <Button 
                onClick={handleSkip}
                variant="outline"
                className="px-12 py-4 text-xl font-semibold bg-white/10 backdrop-blur-sm border-2 border-white/30 text-white hover:bg-white/20 hover:border-white/50 transition-all duration-300"
                size="lg"
              >
                <Shield className="w-6 h-6 mr-3" />
                Pular por Agora (Free)
              </Button>
            </motion.div>

            {/* Additional Info */}
            <motion.div 
              className="text-center mt-12"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.8 }}
            >
              <p className="text-gray-300 text-lg">
                🔒 Você pode alterar ou cancelar seu plano a qualquer momento.
              </p>
              <p className="text-blue-300 text-sm mt-2">
                ✨ Garantia de satisfação de 30 dias
              </p>
            </motion.div>
          </div>
        </div>
      </section>
    </>
  );
};

export default SubscriptionPlans;
