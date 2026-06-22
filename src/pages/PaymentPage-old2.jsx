import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  CreditCard, 
  Copy, 
  Check, 
  ArrowLeft, 
  Shield, 
  Mail, 
  Phone, 
  Zap,
  Globe,
  Building2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

const PaymentPage = () => {
  const navigate = useNavigate();
  const { updateSubscription } = useAuth();
  const [copied, setCopied] = useState('');
  const [processing, setProcessing] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Dados PIX simulados
  const pixData = {
    qrCode: 'https://via.placeholder.com/300x300/333/fff?text=QR+CODE+PIX',
    email: 'pagamento@empresa.com.br',
    phone: '(11) 99999-9999',
    amount: 30.00
  };

  const handleCopy = (text, type) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(''), 2000);
  };

  const handleConfirmPayment = () => {
    setProcessing(true);
    
    // Simular processamento do pagamento
    setTimeout(() => {
      updateSubscription('pro');
      setProcessing(false);
      setShowSuccessModal(true);
      
      // Redirecionar após 3 segundos
      setTimeout(() => {
        navigate('/company-dashboard');
      }, 3000);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-900/20 to-slate-900/40"></div>
        <div className="absolute top-20 right-20 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-20 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl"></div>
      </div>

      <section className="relative z-10 min-h-screen">
        <div className="container mx-auto px-6 relative z-10 py-8">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="flex items-center gap-6 mb-8"
            >
              <Button 
                variant="outline" 
                size="lg"
                onClick={() => navigate('/subscription-plans')}
                className="flex items-center gap-2 bg-white/10 backdrop-blur-sm border-2 border-white/30 text-white hover:bg-white/20 hover:border-white/50 transition-all duration-300"
              >
                <ArrowLeft className="w-5 h-5" />
                Voltar
              </Button>
              <div>
                {/* Corporate Badge */}
                <div className="inline-flex items-center gap-2 bg-blue-900/20 backdrop-blur-sm border border-blue-400/30 text-blue-200 px-4 py-2 rounded-full text-sm font-semibold mb-3">
                  <Building2 className="h-4 w-4" />
                  PAGAMENTO SEGURO
                </div>
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-1">
                  Finalize sua
                  <span className="bg-gradient-to-r from-blue-400 to-blue-300 bg-clip-text text-transparent"> Assinatura</span>
                </h1>
                <p className="text-lg text-gray-300">Confirme seu pagamento via PIX e ative o Plano Pro</p>
              </div>
            </motion.div>

            {/* Layout Grid Compacto */}
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Resumo do Pedido - Compacto */}
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="lg:col-span-1"
              >
                <Card className="bg-white/95 backdrop-blur-sm shadow-2xl border-0 h-fit">
                  <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-lg p-6">
                    <CardTitle className="flex items-center gap-3 text-xl">
                      <CreditCard className="w-6 h-6" />
                      Resumo do Pedido
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border-l-4 border-blue-500 mb-6">
                      <h3 className="font-bold text-blue-900 mb-3 text-lg flex items-center gap-2">
                        ⭐ Plano Pro
                        <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">PREMIUM</span>
                      </h3>
                      <div className="space-y-2 text-blue-800 text-sm">
                        <div className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                          <span>Até 5 vagas ativas</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                          <span>200 currículos/mês</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                          <span>Relatórios detalhados</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                          <span>Interações rápidas</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                          <span>Candidatos favoritos</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                          <span>Suporte prioritário</span>
                        </div>
                      </div>
                    </div>

                    <div className="border-t-2 border-gray-200 pt-4">
                      <div className="flex justify-between items-center text-xl font-bold text-blue-600">
                        <span>Total a pagar:</span>
                        <span>R$ 30,00</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Dados do PIX - Compacto */}
              <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="lg:col-span-2"
              >
                <Card className="bg-white/95 backdrop-blur-sm shadow-2xl border-0">
                  <CardHeader className="bg-gradient-to-r from-green-600 to-green-700 text-white rounded-t-lg p-6">
                    <CardTitle className="text-center text-xl flex items-center justify-center gap-3">
                      <Shield className="w-6 h-6" />
                      Pagamento via PIX
                    </CardTitle>
                    <p className="text-center text-green-100">
                      💳 Escaneie o QR Code ou use os dados abaixo
                    </p>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      {/* QR Code */}
                      <div className="text-center">
                        <div className="bg-gradient-to-br from-gray-50 to-white p-4 rounded-2xl border-2 border-dashed border-gray-300 inline-block shadow-inner">
                          <img 
                            src={pixData.qrCode} 
                            alt="QR Code PIX" 
                            className="w-48 h-48 mx-auto rounded-xl"
                          />
                        </div>
                        <p className="text-gray-600 mt-3 font-medium">
                          📱 QR Code PIX
                        </p>
                      </div>

                      {/* Dados do PIX */}
                      <div className="space-y-4">
                        <div>
                          <label className="text-base font-bold text-gray-800 block mb-2">
                            📧 Email PIX:
                          </label>
                          <div className="flex items-center gap-2 p-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border">
                            <Mail className="w-5 h-5 text-blue-500" />
                            <span className="flex-1 font-mono text-sm font-medium">{pixData.email}</span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCopy(pixData.email, 'Email')}
                              className="flex items-center gap-1 border-2 hover:bg-blue-50 hover:border-blue-300"
                            >
                              {copied === 'Email' ? (
                                <>
                                  <Check className="w-4 h-4 text-green-600" />
                                  OK
                                </>
                              ) : (
                                <>
                                  <Copy className="w-4 h-4" />
                                  Copiar
                                </>
                              )}
                            </Button>
                          </div>
                        </div>

                        <div>
                          <label className="text-base font-bold text-gray-800 block mb-2">
                            📱 Telefone:
                          </label>
                          <div className="flex items-center gap-2 p-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border">
                            <Phone className="w-5 h-5 text-green-500" />
                            <span className="flex-1 font-mono text-sm font-medium">{pixData.phone}</span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCopy(pixData.phone, 'Telefone')}
                              className="flex items-center gap-1 border-2 hover:bg-green-50 hover:border-green-300"
                            >
                              {copied === 'Telefone' ? (
                                <>
                                  <Check className="w-4 h-4 text-green-600" />
                                  OK
                                </>
                              ) : (
                                <>
                                  <Copy className="w-4 h-4" />
                                  Copiar
                                </>
                              )}
                            </Button>
                          </div>
                        </div>

                        {/* Informações do PIX */}
                        <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                          <h4 className="font-bold text-blue-900 mb-2 text-sm">🔒 Por que PIX?</h4>
                          <div className="grid grid-cols-3 gap-3 text-xs text-blue-800">
                            <div className="text-center">
                              <Zap className="w-6 h-6 mx-auto mb-1 text-green-600" />
                              <span className="font-medium">Instantâneo</span>
                            </div>
                            <div className="text-center">
                              <Shield className="w-6 h-6 mx-auto mb-1 text-blue-600" />
                              <span className="font-medium">Seguro</span>
                            </div>
                            <div className="text-center">
                              <Globe className="w-6 h-6 mx-auto mb-1 text-purple-600" />
                              <span className="font-medium">Sem Taxa</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Botão de Confirmação */}
                    <div className="mt-6 pt-4 border-t-2 border-gray-200">
                      <Button 
                        onClick={handleConfirmPayment}
                        disabled={processing}
                        className="w-full h-14 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white text-lg font-bold shadow-xl hover:shadow-2xl transition-all duration-300"
                      >
                        {processing ? (
                          <>
                            <div className="animate-spin w-5 h-5 border-3 border-white border-t-transparent rounded-full mr-2"></div>
                            Processando Pagamento...
                          </>
                        ) : (
                          <>
                            <Zap className="w-5 h-5 mr-2" />
                            Confirmar Pagamento PIX
                          </>
                        )}
                      </Button>
                      
                      <p className="text-gray-500 text-center mt-2 text-sm">
                        🔒 Ao confirmar, sua assinatura será ativada instantaneamente
                      </p>
                      <p className="text-blue-500 text-center mt-1 text-xs font-medium">
                        ✨ Ambiente de demonstração - Ativação imediata
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center"
          >
            <div className="mb-6">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-10 h-10 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Pagamento Confirmado!
              </h3>
              <p className="text-gray-600">
                Seu Plano Pro foi ativado com sucesso. Redirecionando para o dashboard...
              </p>
            </div>
            
            <div className="flex items-center justify-center gap-2 text-green-600 font-medium">
              <Zap className="w-5 h-5" />
              <span>Ativação instantânea</span>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default PaymentPage;
