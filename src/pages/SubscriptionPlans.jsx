import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { 
  Check, 
  Crown, 
  Star, 
  ArrowRight, 
  Building2,
  ArrowLeft,
  FileText,
  BarChart3,
  Users,
  Target,
  TrendingUp,
  Zap,
  Shield,
  Clock,
  HeadphonesIcon
} from 'lucide-react';

const SubscriptionPlans = () => {
  const navigate = useNavigate();
  const { user, updateSubscription } = useAuth();
  const [loading, setLoading] = useState(false);

  const currentPlan = user?.subscription_plan || 'free';

  const plans = [
    {
      id: 'free',
      name: 'Gratuito',
      price: 'R$ 0',
      period: '/mês',
      description: 'Para começar a divulgar suas primeiras vagas',
      icon: Building2,
      features: [
        'Vagas ilimitadas',
        'Até 10 currículos recebidos/mês',
        'Painel básico',
        'Suporte por email'
      ],
      limitations: [
        'Sem favoritos de candidatos',
        'Sem personalização avançada',
        'Sem selo de verificação'
      ]
    },
    {
      id: 'pro',
      name: 'Pro',
      price: 'R$ 19',
      period: '/mês',
      description: 'Cresça com mais vagas e mais candidatos',
      icon: Star,
      popular: true,
      features: [
        'Até 5 vagas ativas por mês',
        'Até 200 currículos recebidos/mês',
        'Candidatos favoritos',
        'Adicionar foto da empresa',
        'Selo de verificação azul',
        'Suporte prioritário'
      ]
    },
    {
      id: 'premium',
      name: 'Premium',
      price: 'R$ 29',
      period: '/mês',
      description: 'Mais alcance e recursos avançados',
      icon: Crown,
      features: [
        'Até 10 vagas ativas por mês',
        'Currículos recebidos ilimitados',
        'Tudo do Pro',
        'Selo de verificação dourado',
        '2 anúncios impulsionados',
        'Maior destaque nas buscas'
      ]
    }
  ];

  const benefits = [
    {
      icon: Target,
      title: 'Alcance Qualificado',
      description: 'Encontre os melhores talentos com nossa base de candidatos pré-qualificados'
    },
    {
      icon: TrendingUp,
      title: 'Processo Otimizado',
      description: 'Reduza o tempo de contratação em até 70% com nossos filtros inteligentes'
    },
    {
      icon: BarChart3,
      title: 'Analytics Avançados',
      description: 'Tome decisões baseadas em dados com relatórios detalhados de desempenho'
    },
    {
      icon: Users,
      title: 'Gestão Completa',
      description: 'Gerencie todo o pipeline de recrutamento em uma única plataforma'
    }
  ];

  const handleUpgrade = async (planId) => {
    if (planId === currentPlan) return;
    
    setLoading(true);
    try {
      if (planId === 'pro') {
        navigate('/payment-pro');
      } else if (planId === 'premium') {
        navigate('/payment-premium');
      }
    } catch (error) {
      console.error('Erro ao processar upgrade:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation */}
        <div className="flex items-center justify-between mb-8">
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            className="rounded-2xl border-gray-200 hover:bg-blue-50 hover:border-blue-300 transition-all duration-200"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Planos de Assinatura
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Escolha o plano ideal para sua empresa e comece a encontrar os melhores talentos
          </p>
        </motion.div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {plans.map((plan, index) => {
            const IconComponent = plan.icon;
            const isCurrentPlan = currentPlan === plan.id;
            
            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ 
                  duration: 0.8, 
                  delay: index * 0.15,
                  type: "spring",
                  stiffness: 100
                }}
                whileHover={{ 
                  y: -10, 
                  scale: 1.02,
                  transition: { duration: 0.3 }
                }}
                className="relative group"
              >
                {plan.popular && (
                  <motion.div 
                    className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10"
                    initial={{ opacity: 0, scale: 0, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ delay: index * 0.15 + 0.5, type: "spring", stiffness: 200 }}
                    whileHover={{ scale: 1.05, y: -2 }}
                  >
                    <Badge className="bg-blue-600 text-white px-5 py-1.5 text-xs font-semibold rounded-full shadow-lg border-0">
                      Mais Popular
                    </Badge>
                  </motion.div>
                )}
                
                <Card className={`h-full shadow-lg rounded-2xl border-0 transition-all duration-300 group-hover:shadow-2xl ${
                  plan.popular 
                    ? 'bg-blue-600 text-white ring-2 ring-blue-300' 
                    : 'bg-white ring-2 ring-gray-900 ring-opacity-20'
                } flex flex-col`}>
                  <CardHeader className="pb-5 px-6 pt-7">
                    <div className="flex items-center justify-between mb-4">
                      <motion.div 
                        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${
                          plan.popular ? 'bg-white/20 group-hover:bg-white/30' : 'bg-gray-100 group-hover:bg-gray-200'
                        }`}
                      >
                        <IconComponent className={`w-5 h-5 transition-colors duration-300 ${
                          plan.popular ? 'text-white' : 'text-gray-600'
                        }`} />
                      </motion.div>
                      {isCurrentPlan && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.3 }}
                        >
                          <Badge variant="outline" className={
                            plan.popular 
                              ? "bg-white/20 text-white border-white/30 text-xs py-0.5" 
                              : "bg-green-50 text-green-700 border-green-200 text-xs py-0.5"
                          }>
                            Plano Atual
                          </Badge>
                        </motion.div>
                      )}
                    </div>
                    
                    <CardTitle className={`text-xl font-bold ${
                      plan.popular ? 'text-white' : 'text-gray-900'
                    }`}>
                      {plan.name}
                    </CardTitle>
                    <CardDescription className={`mb-4 text-sm ${
                      plan.popular ? 'text-blue-100' : 'text-gray-600'
                    }`}>
                      {plan.description}
                    </CardDescription>
                    
                    <motion.div 
                      className="flex items-baseline space-x-2"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.15 + 0.3 }}
                    >
                      <span className={`text-2xl font-bold ${
                        plan.popular ? 'text-white' : 'text-gray-900'
                      }`}>{plan.price}</span>
                      <span className={`text-sm ${
                        plan.popular ? 'text-blue-100' : 'text-gray-600'
                      }`}>{plan.period}</span>
                    </motion.div>
                  </CardHeader>
                  
                  <CardContent className="pt-0 flex-1 flex flex-col px-6 pb-7">
                    <ul className="space-y-3.5 mb-6 flex-1">
                      {plan.features.map((feature, idx) => (
                        <motion.li 
                          key={idx} 
                          className="flex items-start space-x-2.5"
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.15 + 0.4 + idx * 0.1 }}
                        >
                          <Check className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                            plan.popular ? 'text-green-300' : 'text-green-500'
                          }`} />
                          <span className={`text-xs ${
                            plan.popular ? 'text-blue-50' : 'text-gray-700'
                          }`}>{feature}</span>
                        </motion.li>
                      ))}
                      {plan.limitations && plan.limitations.map((limitation, idx) => (
                        <motion.li 
                          key={idx} 
                          className="flex items-start space-x-2.5 opacity-40"
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 0.4, x: 0 }}
                          transition={{ delay: index * 0.15 + 0.4 + plan.features.length * 0.1 + idx * 0.1 }}
                        >
                          <span className={`w-4 h-4 mt-0.5 flex-shrink-0 font-bold text-xs ${
                            plan.popular ? 'text-red-300' : 'text-red-400'
                          }`}>×</span>
                          <span className={`text-xs ${
                            plan.popular ? 'text-blue-200' : 'text-gray-500'
                          }`}>{limitation}</span>
                        </motion.li>
                      ))}
                    </ul>
                    
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.15 + 0.8 }}
                      className="mt-auto"
                    >
                      <Button
                        className={`w-full py-2 font-medium rounded-xl transition-all duration-300 ${
                          isCurrentPlan
                            ? plan.popular
                              ? 'bg-white/20 text-white/70 cursor-not-allowed border border-white/30'
                              : 'bg-gray-100 text-gray-500 cursor-not-allowed'
                            : plan.popular
                            ? 'bg-white text-blue-600 hover:bg-white transform hover:scale-105 shadow-lg hover:shadow-xl font-semibold'
                            : 'bg-gray-900 hover:bg-gray-900 text-white transform hover:scale-105 shadow-lg hover:shadow-xl'
                        }`}
                        onClick={() => handleUpgrade(plan.id)}
                        disabled={isCurrentPlan || loading}
                        whileHover={{ scale: isCurrentPlan ? 1 : 1.05 }}
                        whileTap={{ scale: isCurrentPlan ? 1 : 0.98 }}
                      >
                        {isCurrentPlan ? (
                          'Plano Atual'
                        ) : plan.id === 'free' ? (
                          'Gratuito'
                        ) : (
                          <>
                            Escolher {plan.name}
                            <ArrowRight className="ml-2 w-4 h-4" />
                          </>
                        )}
                      </Button>
                    </motion.div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Botão Começar Agora Gratuito */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="text-center mb-16"
        >
          <Button
            size="lg"
            variant="outline"
            className="bg-white border-2 border-blue-600 text-blue-600 hover:bg-blue-50 px-8 py-3 text-lg rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
            onClick={() => navigate('/company-dashboard')}
          >
            <Building2 className="mr-2 h-5 w-5" />
            Começar Agora com Plano Gratuito
          </Button>
          <p className="text-sm text-gray-600 mt-3">
            Sem compromisso • Sem cartão de crédito
          </p>
        </motion.div>

        {/* Benefits Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mb-16"
        >
          <div className="text-center mb-12">
            <motion.h2 
              className="text-3xl font-bold text-gray-900 mb-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
            >
              Por que escolher nossa plataforma?
            </motion.h2>
            <motion.p 
              className="text-lg text-gray-600 max-w-2xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
            >
              Descubra as vantagens que tornam nossa solução única no mercado
            </motion.p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((benefit, index) => {
              const IconComponent = benefit.icon;
              
              // Cores diferentes para cada card
              const cardColors = [
                {
                  gradient: 'from-blue-500 to-cyan-600',
                  bgHover: 'group-hover:from-blue-50 group-hover:to-cyan-50',
                  iconBg: 'bg-blue-100 group-hover:bg-blue-200',
                  iconColor: 'text-blue-600 group-hover:text-blue-700',
                  border: 'border-blue-200'
                },
                {
                  gradient: 'from-green-500 to-emerald-600', 
                  bgHover: 'group-hover:from-green-50 group-hover:to-emerald-50',
                  iconBg: 'bg-green-100 group-hover:bg-green-200',
                  iconColor: 'text-green-600 group-hover:text-green-700',
                  border: 'border-green-200'
                },
                {
                  gradient: 'from-purple-500 to-indigo-600',
                  bgHover: 'group-hover:from-purple-50 group-hover:to-indigo-50', 
                  iconBg: 'bg-purple-100 group-hover:bg-purple-200',
                  iconColor: 'text-purple-600 group-hover:text-purple-700',
                  border: 'border-purple-200'
                },
                {
                  gradient: 'from-orange-500 to-red-600',
                  bgHover: 'group-hover:from-orange-50 group-hover:to-red-50',
                  iconBg: 'bg-orange-100 group-hover:bg-orange-200', 
                  iconColor: 'text-orange-600 group-hover:text-orange-700',
                  border: 'border-orange-200'
                }
              ];
              
              const colors = cardColors[index % cardColors.length];
              
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ 
                    duration: 0.6, 
                    delay: 0.7 + index * 0.1,
                    type: "spring",
                    stiffness: 100
                  }}
                  whileHover={{ 
                    y: -8, 
                    scale: 1.05,
                    transition: { duration: 0.3 }
                  }}
                  className="group"
                >
                  <Card className={`h-full text-center p-6 border-2 shadow-xl rounded-2xl bg-gradient-to-br from-white to-gray-50 hover:shadow-2xl transition-all duration-300 ${colors.bgHover} ${colors.border} hover:border-opacity-50`}>
                    <motion.div 
                      className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 transition-all duration-300 bg-gradient-to-br ${colors.gradient} shadow-lg group-hover:shadow-xl`}
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      transition={{ duration: 0.3 }}
                    >
                      <IconComponent className="w-10 h-10 text-white drop-shadow-sm" />
                    </motion.div>
                    <h3 className="text-xl font-bold text-gray-900 mb-4 group-hover:text-gray-800 transition-colors duration-300">
                      {benefit.title}
                    </h3>
                    <p className="text-gray-600 text-sm leading-relaxed group-hover:text-gray-700 transition-colors duration-300">
                      {benefit.description}
                    </p>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Features Comparison */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mb-16"
        >
          <Card className="shadow-xl rounded-2xl border-0 bg-gradient-to-br from-white to-blue-50 overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.8 }}
                className="text-center"
              >
                <CardTitle className="text-2xl font-bold mb-2">
                  Comparação Detalhada de Recursos
                </CardTitle>
                <p className="text-blue-100">
                  Veja exatamente o que cada plano oferece para sua empresa
                </p>
              </motion.div>
            </CardHeader>
            <CardContent className="p-8">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-gray-200">
                      <th className="text-left py-4 px-6 font-semibold text-gray-900 text-lg">Recursos</th>
                      <th className="text-center py-4 px-6 font-semibold text-gray-900 text-lg">Gratuito</th>
                      <th className="text-center py-4 px-6 font-semibold text-blue-600 text-lg">Pro</th>
                      <th className="text-center py-4 px-6 font-semibold text-gray-900 text-lg">Enterprise</th>
                    </tr>
                  </thead>
                  <tbody className="text-base">
                    {[
                      {
                        feature: 'Publicação de vagas',
                        free: 'Até 2',
                        pro: 'Ilimitadas',
                        enterprise: 'Ilimitadas'
                      },
                      {
                        feature: 'Visualização de currículos',
                        free: '10/mês',
                        pro: 'Ilimitado',
                        enterprise: 'Ilimitado'
                      },
                      {
                        feature: 'Filtros avançados',
                        free: null,
                        pro: true,
                        enterprise: true
                      },
                      {
                        feature: 'Relatórios e analytics',
                        free: null,
                        pro: true,
                        enterprise: true
                      },
                      {
                        feature: 'Suporte dedicado',
                        free: 'Email',
                        pro: 'Prioritário',
                        enterprise: '24/7'
                      }
                    ].map((row, index) => (
                      <motion.tr
                        key={index}
                        className="border-b border-gray-100 hover:bg-blue-50 transition-colors duration-200"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.4, delay: 1 + index * 0.1 }}
                      >
                        <td className="py-4 px-6 text-gray-700 font-medium">{row.feature}</td>
                        <td className="text-center py-4 px-6 text-gray-600">
                          {row.free === null ? (
                            <span className="text-gray-400 text-xl">-</span>
                          ) : (
                            row.free
                          )}
                        </td>
                        <td className="text-center py-4 px-6">
                          {row.pro === null ? (
                            <span className="text-gray-400 text-xl">-</span>
                          ) : row.pro === true ? (
                            <Check className="w-5 h-5 text-green-500 mx-auto" />
                          ) : (
                            <span className="text-blue-600 font-semibold">{row.pro}</span>
                          )}
                        </td>
                        <td className="text-center py-4 px-6">
                          {row.enterprise === null ? (
                            <span className="text-gray-400 text-xl">-</span>
                          ) : row.enterprise === true ? (
                            <Check className="w-5 h-5 text-green-500 mx-auto" />
                          ) : (
                            <span className="text-gray-700 font-semibold">{row.enterprise}</span>
                          )}
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
        >
          <Card className="shadow-lg rounded-2xl border-0 bg-gradient-to-br from-blue-50 to-indigo-50 text-center p-8">
            <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Zap className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Pronto para começar?
            </h2>
            <p className="text-lg text-gray-600 mb-6 max-w-2xl mx-auto">
              Transforme seu processo de recrutamento e encontre os melhores talentos para sua empresa.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl"
                onClick={() => handleUpgrade('pro')}
              >
                <Crown className="mr-2 h-5 w-5" />
                Começar Agora
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-gray-300 text-gray-700 hover:bg-gray-50 px-8 py-3 rounded-xl"
              >
                Falar com Especialista
              </Button>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default SubscriptionPlans;
