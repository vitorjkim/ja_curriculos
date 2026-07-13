import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AuthContext } from '../contexts/AuthContext';
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
  const { user, updateSubscription } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);

  const currentPlan = user?.subscription_plan || 'free';

  const plans = [
    {
      id: 'free',
      name: 'Gratuito',
      price: 'R$ 0',
      period: '/mês',
      description: 'Perfeito para empresas que estão começando',
      icon: Building2,
      features: [
        'Vagas ilimitadas',
        'Visualização de até 10 currículos por mês',
        'Suporte por email',
        'Painel básico de controle'
      ],
      limitations: [
        'Funcionalidades limitadas',
        'Sem acesso a relatórios avançados'
      ]
    },
    {
      id: 'pro',
      name: 'Pro',
      price: 'R$ 29,90',
      period: '/mês',
      description: 'Ideal para empresas em crescimento',
      icon: Star,
      popular: true,
      features: [
        'Vagas ilimitadas',
        'Visualização ilimitada de currículos',
        'Filtros avançados de busca',
        'Relatórios e analytics',
        'Suporte prioritário',
        'Gestão de candidatos',
        'Notificações em tempo real'
      ]
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: 'R$ 99,90',
      period: '/mês',
      description: 'Para grandes empresas com necessidades especiais',
      icon: Crown,
      features: [
        'Todos os recursos do Pro',
        'API dedicada',
        'Integração com sistemas externos',
        'Suporte 24/7',
        'Gerente de conta dedicado',
        'Relatórios personalizados',
        'Treinamento da equipe'
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
        navigate('/payment');
      } else if (planId === 'enterprise') {
        // Implementar lógica para Enterprise
        alert('Entre em contato conosco para o plano Enterprise');
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {plans.map((plan, index) => {
            const IconComponent = plan.icon;
            const isCurrentPlan = currentPlan === plan.id;
            
            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="relative"
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
                    <Badge className="bg-blue-600 text-white px-3 py-1 text-sm rounded-full">
                      Mais Popular
                    </Badge>
                  </div>
                )}
                
                <Card className={`h-full shadow-lg rounded-2xl border-0 bg-white transition-all duration-200 hover:shadow-xl ${
                  plan.popular ? 'ring-2 ring-blue-200' : ''
                }`}>
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                        <IconComponent className="w-6 h-6 text-gray-600" />
                      </div>
                      {isCurrentPlan && (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          Plano Atual
                        </Badge>
                      )}
                    </div>
                    
                    <CardTitle className="text-2xl font-bold text-gray-900">
                      {plan.name}
                    </CardTitle>
                    <CardDescription className="text-gray-600 mb-4">
                      {plan.description}
                    </CardDescription>
                    
                    <div className="flex items-baseline space-x-2">
                      <span className="text-3xl font-bold text-gray-900">{plan.price}</span>
                      <span className="text-gray-600">{plan.period}</span>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    <ul className="space-y-3 mb-6">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start space-x-3">
                          <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                          <span className="text-gray-700 text-sm">{feature}</span>
                        </li>
                      ))}
                      {plan.limitations && plan.limitations.map((limitation, idx) => (
                        <li key={idx} className="flex items-start space-x-3 opacity-60">
                          <span className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0">×</span>
                          <span className="text-gray-500 text-sm">{limitation}</span>
                        </li>
                      ))}
                    </ul>
                    
                    <Button
                      className={`w-full py-2 font-medium rounded-xl transition-all duration-200 ${
                        isCurrentPlan
                          ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                          : plan.popular
                          ? 'bg-blue-600 hover:bg-blue-700 text-white'
                          : 'bg-gray-900 hover:bg-gray-800 text-white'
                      }`}
                      onClick={() => handleUpgrade(plan.id)}
                      disabled={isCurrentPlan || loading}
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
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Benefits Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mb-16"
        >
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-8">
            Por que escolher nossa plataforma?
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((benefit, index) => {
              const IconComponent = benefit.icon;
              
              return (
                <Card key={index} className="p-6 text-center border-0 shadow-lg rounded-2xl bg-white">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <IconComponent className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {benefit.title}
                  </h3>
                  <p className="text-gray-600 text-sm">
                    {benefit.description}
                  </p>
                </Card>
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
          <Card className="shadow-lg rounded-2xl border-0 bg-white">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-gray-900 text-center">
                Comparação de Recursos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Recursos</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-900">Gratuito</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-900">Pro</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-900">Enterprise</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    <tr className="border-b border-gray-100">
                      <td className="py-3 px-4 text-gray-700">Publicação de vagas</td>
                      <td className="text-center py-3 px-4">Até 2</td>
                      <td className="text-center py-3 px-4">Ilimitadas</td>
                      <td className="text-center py-3 px-4">Ilimitadas</td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="py-3 px-4 text-gray-700">Visualização de currículos</td>
                      <td className="text-center py-3 px-4">10/mês</td>
                      <td className="text-center py-3 px-4">Ilimitado</td>
                      <td className="text-center py-3 px-4">Ilimitado</td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="py-3 px-4 text-gray-700">Filtros avançados</td>
                      <td className="text-center py-3 px-4">-</td>
                      <td className="text-center py-3 px-4"><Check className="w-4 h-4 text-green-500 mx-auto" /></td>
                      <td className="text-center py-3 px-4"><Check className="w-4 h-4 text-green-500 mx-auto" /></td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="py-3 px-4 text-gray-700">Relatórios e analytics</td>
                      <td className="text-center py-3 px-4">-</td>
                      <td className="text-center py-3 px-4"><Check className="w-4 h-4 text-green-500 mx-auto" /></td>
                      <td className="text-center py-3 px-4"><Check className="w-4 h-4 text-green-500 mx-auto" /></td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 text-gray-700">Suporte dedicado</td>
                      <td className="text-center py-3 px-4">Email</td>
                      <td className="text-center py-3 px-4">Prioritário</td>
                      <td className="text-center py-3 px-4">24/7</td>
                    </tr>
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
