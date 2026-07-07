/**
 * PricingPlans.jsx
 * Página com planos de preço e checkout
 * Integrado com Stripe para pagamentos
 */

import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Loader } from 'lucide-react';
import axios from 'axios';

const PricingPlans = ({ token }) => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentPlan, setCurrentPlan] = useState('free');
  const [error, setError] = useState(null);

  // ─────────────────────────────────────────────────────────────
  // Buscar planos disponíveis
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchPlans();
    if (token) {
      fetchCurrentPlan();
    }
  }, [token]);

  const fetchPlans = async () => {
    try {
      const response = await axios.get('/api/payments/plans');
      setPlans(response.data.plans || []);
    } catch (err) {
      console.error('Erro ao buscar planos:', err);
      setError('Não foi possível carregar os planos. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentPlan = async () => {
    try {
      const response = await axios.get('/api/payments/subscription', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCurrentPlan(response.data.subscription?.plan || 'free');
    } catch (err) {
      console.warn('Não conseguiu carregar plano atual');
    }
  };

  // ─────────────────────────────────────────────────────────────
  // Iniciar checkout
  // ─────────────────────────────────────────────────────────────
  const handleCheckout = async (planId) => {
    if (!token) {
      // Redirecionar para login
      window.location.href = '/login?redirect=/pricing';
      return;
    }

    if (planId === 'free') {
      alert('Você já está no plano gratuito!');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const response = await axios.post(
        '/api/payments/checkout',
        { plan: planId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success && response.data.checkoutUrl) {
        // Redirecionar para Stripe
        window.location.href = response.data.checkoutUrl;
      } else {
        setError('Erro ao iniciar pagamento. Tente novamente.');
      }
    } catch (err) {
      console.error('Erro ao criar checkout:', err);
      setError(err.response?.data?.error || 'Erro ao processar pagamento');
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="animate-spin text-blue-600" size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Planos para Empresas
          </h1>
          <p className="text-xl text-gray-600">
            Escolha o plano perfeito para sua empresa
          </p>
        </div>

        {/* Mensagem de erro */}
        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Plans Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-lg overflow-hidden transition-all ${
                currentPlan === plan.id
                  ? 'ring-2 ring-blue-600 bg-white shadow-xl'
                  : 'bg-white shadow-lg hover:shadow-xl'
              }`}
            >
              {/* Badge de plano atual */}
              {currentPlan === plan.id && (
                <div className="absolute top-0 right-0 bg-blue-600 text-white px-4 py-1 text-sm font-semibold rounded-bl-lg">
                  Seu Plano
                </div>
              )}

              <div className="p-8">
                {/* Título */}
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {plan.name}
                </h3>
                <p className="text-gray-600 text-sm mb-6">{plan.description}</p>

                {/* Preço */}
                <div className="mb-6">
                  {plan.price === 0 ? (
                    <p className="text-4xl font-bold text-gray-900">Grátis</p>
                  ) : (
                    <>
                      <p className="text-4xl font-bold text-gray-900">
                        R$ {(plan.price / 100).toFixed(2)}
                      </p>
                      <p className="text-gray-600 text-sm">/mês</p>
                    </>
                  )}
                </div>

                {/* Benefícios */}
                <div className="space-y-4 mb-8">
                  {plan.features.map((feature, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <CheckCircle2 className="text-green-600 flex-shrink-0 mt-0.5" size={20} />
                      <span className="text-gray-700">{feature}</span>
                    </div>
                  ))}
                </div>

                {/* Botão */}
                <button
                  onClick={() => handleCheckout(plan.id)}
                  disabled={isProcessing || currentPlan === plan.id}
                  className={`w-full py-3 px-4 rounded-lg font-semibold transition-all ${
                    currentPlan === plan.id
                      ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                      : isProcessing
                      ? 'bg-gray-400 text-white cursor-not-allowed'
                      : plan.id === 'free'
                      ? 'bg-gray-200 text-gray-900 hover:bg-gray-300'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {isProcessing && currentPlan !== plan.id ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader size={16} className="animate-spin" />
                      Processando...
                    </span>
                  ) : currentPlan === plan.id ? (
                    'Plano Atual'
                  ) : plan.id === 'free' ? (
                    'Fazer Downgrade'
                  ) : (
                    'Escolher Plano'
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Comparison Table */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Comparação de Recursos
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left py-4 px-4 font-semibold text-gray-900">
                      Recurso
                    </th>
                    <th className="text-center py-4 px-4 font-semibold text-gray-900">
                      Gratuito
                    </th>
                    <th className="text-center py-4 px-4 font-semibold text-gray-900">
                      Pro
                    </th>
                    <th className="text-center py-4 px-4 font-semibold text-gray-900">
                      Premium
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    {
                      feature: 'Vagas por mês',
                      free: '2',
                      pro: 'Ilimitado',
                      premium: 'Ilimitado',
                    },
                    {
                      feature: 'Visualizar ranking',
                      free: false,
                      pro: true,
                      premium: true,
                    },
                    {
                      feature: 'IA para análise',
                      free: false,
                      pro: false,
                      premium: true,
                    },
                    {
                      feature: 'Busca avançada',
                      free: false,
                      pro: false,
                      premium: true,
                    },
                    {
                      feature: 'Verificação de empresa',
                      free: 'Automática',
                      pro: 'Manual',
                      premium: 'Manual',
                    },
                    {
                      feature: 'Suporte',
                      free: 'Comunidade',
                      pro: 'Prioritário',
                      premium: 'Dedicado',
                    },
                  ].map((row, index) => (
                    <tr
                      key={index}
                      className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}
                    >
                      <td className="py-4 px-4 text-gray-900 font-medium">
                        {row.feature}
                      </td>
                      <td className="py-4 px-4 text-center">
                        {typeof row.free === 'boolean' ? (
                          row.free ? (
                            <CheckCircle2 className="text-green-600 inline" size={20} />
                          ) : (
                            <div className="text-gray-400">—</div>
                          )
                        ) : (
                          <span className="text-gray-900">{row.free}</span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-center">
                        {typeof row.pro === 'boolean' ? (
                          row.pro ? (
                            <CheckCircle2 className="text-green-600 inline" size={20} />
                          ) : (
                            <div className="text-gray-400">—</div>
                          )
                        ) : (
                          <span className="text-gray-900">{row.pro}</span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-center">
                        {typeof row.premium === 'boolean' ? (
                          row.premium ? (
                            <CheckCircle2 className="text-green-600 inline" size={20} />
                          ) : (
                            <div className="text-gray-400">—</div>
                          )
                        ) : (
                          <span className="text-gray-900">{row.premium}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-12 bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Perguntas Frequentes
          </h2>

          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                Posso mudar de plano a qualquer momento?
              </h3>
              <p className="text-gray-600">
                Sim! Você pode fazer upgrade ou downgrade a qualquer momento. As mudanças entram em vigor imediatamente.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                Há contrato de longo prazo?
              </h3>
              <p className="text-gray-600">
                Não. Você pode cancelar sua assinatura a qualquer momento, sem penalidades.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                Como funciona a verificação de empresa?
              </h3>
              <p className="text-gray-600">
                Para planos Pro e Premium, nossas equipes fazem uma análise manual da sua empresa. Isso ajuda a manter a qualidade na plataforma.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                Aceita outros meios de pagamento?
              </h3>
              <p className="text-gray-600">
                Atualmente aceitamos cartão de crédito via Stripe. Em breve, adicionaremos PIX e outros métodos.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingPlans;
