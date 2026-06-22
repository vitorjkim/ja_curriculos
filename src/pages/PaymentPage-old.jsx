import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet';
import { ArrowLeft, Copy, Check, Mail, Phone, CreditCard, Building2, Shield, Zap, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/use-toast';

const PaymentPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, updateSubscription } = useAuth();
  const [processing, setProcessing] = useState(false);
  const [copied, setCopied] = useState('');

  const plan = location.state?.plan || 'pro';
  
  // Dados do PIX
  const pixData = {
    email: 'vitoreojoaquim@gmail.com',
    phone: '16 99608-7070',
    // QR Code simulado (você pode gerar um real depois)
    qrCode: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2Y5ZmFmYiIvPgogIDx0ZXh0IHg9IjEwMCIgeT0iMTAwIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTJweCIgZmlsbD0iIzM3NDE1MSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkNPRElHTyBQSVg8L3RleHQ+Cjwvc3ZnPgo='
  };

  const handleCopy = (text, type) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    toast({
      title: "Copiado!",
      description: `${type} copiado para área de transferência.`,
    });
    setTimeout(() => setCopied(''), 2000);
  };

  const handleConfirmPayment = async () => {
    setProcessing(true);
    
    try {
      // Simular processamento do pagamento
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Atualizar plano do usuário
      const updatedUser = await updateSubscription('pro');
      
      toast({
        title: "Pagamento Confirmado!",
        description: "Sua assinatura Pro foi ativada com sucesso!",
      });
      
      // Aguardar um pouco para garantir que o contexto foi atualizado
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Usar navigate em vez de window.location para manter o estado
      navigate('/company-dashboard', { replace: true });
      
    } catch (error) {
      console.error('Erro no pagamento:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao processar o pagamento. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Pagamento PIX - Plano Pro - CurrículoJá</title>
        <meta name="description" content="Finalize sua assinatura do Plano Pro via PIX." />
      </Helmet>

      {/* Hero Section */}
      <section className="relative min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
        {/* Background pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 to-transparent"></div>
        
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
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Dados do PIX */}
              <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                <Card className="shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-center">Pagamento via PIX</CardTitle>
                    <p className="text-center text-gray-600">
                      Escaneie o QR Code ou use os dados abaixo
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* QR Code */}
                    <div className="text-center">
                      <div className="bg-white p-4 rounded-lg border-2 border-dashed border-gray-300 inline-block">
                        <img 
                          src={pixData.qrCode} 
                          alt="QR Code PIX" 
                          className="w-48 h-48 mx-auto"
                        />
                      </div>
                      <p className="text-sm text-gray-500 mt-2">
                        QR Code para pagamento PIX
                      </p>
                    </div>

                    {/* Dados do PIX */}
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-semibold text-gray-700 block mb-2">
                          Email PIX:
                        </label>
                        <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                          <Mail className="w-4 h-4 text-gray-500" />
                          <span className="flex-1 font-mono text-sm">{pixData.email}</span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCopy(pixData.email, 'Email')}
                            className="flex items-center gap-1"
                          >
                            {copied === 'Email' ? (
                              <Check className="w-4 h-4 text-green-600" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </div>

                      <div>
                        <label className="text-sm font-semibold text-gray-700 block mb-2">
                          Telefone:
                        </label>
                        <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                          <Phone className="w-4 h-4 text-gray-500" />
                          <span className="flex-1 font-mono text-sm">{pixData.phone}</span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCopy(pixData.phone, 'Telefone')}
                            className="flex items-center gap-1"
                          >
                            {copied === 'Telefone' ? (
                              <Check className="w-4 h-4 text-green-600" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Botão de Confirmação */}
                    <div className="pt-4 border-t">
                      <Button 
                        onClick={handleConfirmPayment}
                        disabled={processing}
                        className="w-full btn-primary text-white py-3 text-lg"
                      >
                        {processing ? (
                          <>
                            <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                            Processando...
                          </>
                        ) : (
                          'Confirmar Pagamento'
                        )}
                      </Button>
                      
                      <p className="text-xs text-gray-500 text-center mt-3">
                        Ao clicar em "Confirmar Pagamento", sua assinatura será ativada imediatamente.
                        Este é um ambiente de demonstração.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Dados do PIX */}
              <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                <Card className="bg-white/95 backdrop-blur-sm shadow-2xl border-0">
                  <CardHeader className="bg-gradient-to-r from-green-600 to-green-700 text-white rounded-t-lg">
                    <CardTitle className="text-center text-2xl flex items-center justify-center gap-3">
                      <Shield className="w-7 h-7" />
                      Pagamento via PIX
                    </CardTitle>
                    <p className="text-center text-green-100 text-lg">
                      💳 Escaneie o QR Code ou use os dados abaixo
                    </p>
                  </CardHeader>
                  <CardContent className="p-8 space-y-8">
                    {/* QR Code */}
                    <div className="text-center">
                      <div className="bg-gradient-to-br from-gray-50 to-white p-6 rounded-2xl border-2 border-dashed border-gray-300 inline-block shadow-inner">
                        <img 
                          src={pixData.qrCode} 
                          alt="QR Code PIX" 
                          className="w-56 h-56 mx-auto rounded-xl"
                        />
                      </div>
                      <p className="text-gray-600 mt-4 font-medium">
                        � QR Code para pagamento instantâneo
                      </p>
                    </div>

                    {/* Dados do PIX */}
                    <div className="space-y-6">
                      <div>
                        <label className="text-lg font-bold text-gray-800 block mb-3">
                          📧 Email PIX:
                        </label>
                        <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border">
                          <Mail className="w-6 h-6 text-blue-500" />
                          <span className="flex-1 font-mono text-lg font-medium">{pixData.email}</span>
                          <Button
                            size="lg"
                            variant="outline"
                            onClick={() => handleCopy(pixData.email, 'Email')}
                            className="flex items-center gap-2 border-2 hover:bg-blue-50 hover:border-blue-300"
                          >
                            {copied === 'Email' ? (
                              <>
                                <Check className="w-5 h-5 text-green-600" />
                                Copiado!
                              </>
                            ) : (
                              <>
                                <Copy className="w-5 h-5" />
                                Copiar
                              </>
                            )}
                          </Button>
                        </div>
                      </div>

                      <div>
                        <label className="text-lg font-bold text-gray-800 block mb-3">
                          📱 Telefone:
                        </label>
                        <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border">
                          <Phone className="w-6 h-6 text-green-500" />
                          <span className="flex-1 font-mono text-lg font-medium">{pixData.phone}</span>
                          <Button
                            size="lg"
                            variant="outline"
                            onClick={() => handleCopy(pixData.phone, 'Telefone')}
                            className="flex items-center gap-2 border-2 hover:bg-green-50 hover:border-green-300"
                          >
                            {copied === 'Telefone' ? (
                              <>
                                <Check className="w-5 h-5 text-green-600" />
                                Copiado!
                              </>
                            ) : (
                              <>
                                <Copy className="w-5 h-5" />
                                Copiar
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Botão de Confirmação */}
                    <div className="pt-6 border-t-2 border-gray-200">
                      <Button 
                        onClick={handleConfirmPayment}
                        disabled={processing}
                        className="w-full h-16 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white text-xl font-bold shadow-xl hover:shadow-2xl transition-all duration-300"
                      >
                        {processing ? (
                          <>
                            <div className="animate-spin w-6 h-6 border-3 border-white border-t-transparent rounded-full mr-3"></div>
                            Processando Pagamento...
                          </>
                        ) : (
                          <>
                            <Zap className="w-6 h-6 mr-3" />
                            Confirmar Pagamento PIX
                          </>
                        )}
                      </Button>
                      
                      <p className="text-gray-500 text-center mt-4 text-lg">
                        🔒 Ao confirmar, sua assinatura será ativada instantaneamente
                      </p>
                      <p className="text-blue-500 text-center mt-2 font-medium">
                        ✨ Ambiente de demonstração - Ativação imediata
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Informações Adicionais */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="mt-16"
            >
              <Card className="bg-white/10 backdrop-blur-sm border-2 border-white/30">
                <CardContent className="p-8">
                  <h3 className="font-bold text-white mb-6 text-2xl text-center flex items-center justify-center gap-3">
                    <Globe className="w-7 h-7 text-blue-400" />
                    Por que escolher o PIX?
                  </h3>
                  <div className="grid md:grid-cols-3 gap-8 text-center">
                    <div className="space-y-3">
                      <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto">
                        <Zap className="w-8 h-8 text-white" />
                      </div>
                      <h4 className="font-semibold text-white text-xl">Instantâneo</h4>
                      <p className="text-gray-300">Pagamento processado em segundos, 24h por dia</p>
                    </div>
                    <div className="space-y-3">
                      <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto">
                        <Shield className="w-8 h-8 text-white" />
                      </div>
                      <h4 className="font-semibold text-white text-xl">Seguro</h4>
                      <p className="text-gray-300">Tecnologia do Banco Central, máxima segurança</p>
                    </div>
                    <div className="space-y-3">
                      <div className="w-16 h-16 bg-purple-500 rounded-full flex items-center justify-center mx-auto">
                        <Globe className="w-8 h-8 text-white" />
                      </div>
                      <h4 className="font-semibold text-white text-xl">Prático</h4>
                      <p className="text-gray-300">Use qualquer banco ou fintech, sem taxas extras</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>
    </>
  );
};

export default PaymentPage;
