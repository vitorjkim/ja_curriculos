import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AuthContext } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { 
  ArrowLeft, 
  Check, 
  Copy, 
  Shield, 
  Zap,
  CreditCard,
  QrCode,
  Smartphone,
  Mail,
  Clock,
  Lock,
  CheckCircle,
  Star,
  Crown,
  AlertCircle
} from 'lucide-react';

const PaymentPage = () => {
  const navigate = useNavigate();
  const { updateSubscription } = useContext(AuthContext);
  const [copied, setCopied] = useState('');
  const [processing, setProcessing] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Dados PIX
  const pixData = {
    qrCode: 'https://via.placeholder.com/300x300/1f2937/ffffff?text=QR+PIX',
    email: 'pagamento@jacurriculos.com',
    phone: '(11) 99999-9999',
    amount: 29.90
  };

  const handleCopy = (text, type) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(''), 2000);
  };

  const handleConfirmPayment = () => {
    setProcessing(true);
    
    setTimeout(() => {
      updateSubscription('pro');
      setProcessing(false);
      setShowSuccessModal(true);
      
      setTimeout(() => {
        navigate('/company-dashboard');
      }, 3000);
    }, 2000);
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
            Finalizar Pagamento
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Complete sua assinatura do Plano Pro e comece a aproveitar todos os recursos
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Resumo do Plano */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <Card className="shadow-lg rounded-2xl border-0 bg-white mb-6">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                      <Star className="w-6 h-6 text-blue-600" />
                    </div>
                    <Badge className="bg-blue-600 text-white">
                      Mais Popular
                    </Badge>
                  </div>
                  
                  <CardTitle className="text-2xl font-bold text-gray-900">
                    Plano Pro
                  </CardTitle>
                  <CardDescription className="text-gray-600">
                    Ideal para empresas em crescimento
                  </CardDescription>
                  
                  <div className="flex items-baseline space-x-2 mt-4">
                    <span className="text-3xl font-bold text-gray-900">R$ 29,90</span>
                    <span className="text-gray-600">/mês</span>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <h4 className="font-semibold text-gray-900 mb-3">Recursos inclusos:</h4>
                  <ul className="space-y-2">
                    {[
                      'Vagas ilimitadas',
                      'Visualização ilimitada de currículos',
                      'Filtros avançados de busca',
                      'Relatórios e analytics',
                      'Suporte prioritário',
                      'Gestão de candidatos',
                      'Notificações em tempo real'
                    ].map((feature, idx) => (
                      <li key={idx} className="flex items-center space-x-2">
                        <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                        <span className="text-gray-700 text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Garantia */}
              <Card className="shadow-lg rounded-2xl border-0 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <Shield className="w-6 h-6 text-green-600" />
                  </div>
                  <h3 className="font-semibold text-green-900 mb-2">
                    Garantia de 30 dias
                  </h3>
                  <p className="text-green-700 text-sm">
                    Se não ficar satisfeito, devolvemos seu dinheiro
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Pagamento */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <Card className="shadow-lg rounded-2xl border-0 bg-white">
                <CardHeader className="border-b border-gray-100">
                  <CardTitle className="text-2xl font-bold text-gray-900">
                    Pagamento via PIX
                  </CardTitle>
                  <CardDescription className="text-gray-600">
                    Pague instantaneamente e tenha acesso imediato ao plano Pro
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="p-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* QR Code */}
                    <div className="text-center">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Escaneie o QR Code
                      </h3>
                      <div className="bg-white p-4 rounded-2xl border border-gray-200 inline-block">
                        <img 
                          src={pixData.qrCode} 
                          alt="QR Code PIX" 
                          className="w-48 h-48 mx-auto"
                        />
                      </div>
                      <p className="text-sm text-gray-600 mt-4">
                        Use seu app do banco para escanear o código
                      </p>
                    </div>

                    {/* Dados PIX */}
                    <div className="space-y-6">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Ou copie os dados PIX
                      </h3>
                      
                      <div className="space-y-4">
                        <div className="p-4 bg-gray-50 rounded-xl">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <Mail className="w-5 h-5 text-gray-600" />
                              <div>
                                <p className="text-sm text-gray-600">Email</p>
                                <p className="font-medium text-gray-900">{pixData.email}</p>
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCopy(pixData.email, 'email')}
                              className="ml-2"
                            >
                              {copied === 'email' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            </Button>
                          </div>
                        </div>

                        <div className="p-4 bg-gray-50 rounded-xl">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <Smartphone className="w-5 h-5 text-gray-600" />
                              <div>
                                <p className="text-sm text-gray-600">Telefone</p>
                                <p className="font-medium text-gray-900">{pixData.phone}</p>
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCopy(pixData.phone, 'phone')}
                              className="ml-2"
                            >
                              {copied === 'phone' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            </Button>
                          </div>
                        </div>

                        <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                          <div className="flex items-center space-x-3">
                            <AlertCircle className="w-5 h-5 text-blue-600" />
                            <div>
                              <p className="text-sm text-blue-600 font-medium">Valor do pagamento</p>
                              <p className="text-2xl font-bold text-blue-900">
                                R$ {pixData.amount.toFixed(2).replace('.', ',')}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                        <div className="flex items-start space-x-3">
                          <Clock className="w-5 h-5 text-yellow-600 mt-0.5" />
                          <div>
                            <h4 className="font-medium text-yellow-900">Importante</h4>
                            <p className="text-sm text-yellow-800 mt-1">
                              Após o pagamento, aguarde até 5 minutos para a confirmação. 
                              Você receberá um email de confirmação e seu plano será ativado automaticamente.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Botão de confirmação */}
                  <div className="mt-8 text-center">
                    <Button
                      onClick={handleConfirmPayment}
                      disabled={processing}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg rounded-xl"
                      size="lg"
                    >
                      {processing ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                          Processando...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="mr-2 h-5 w-5" />
                          Confirmar Pagamento
                        </>
                      )}
                    </Button>
                    <p className="text-sm text-gray-600 mt-3">
                      Clique após realizar o pagamento PIX
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>

        {/* Segurança */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-12"
        >
          <Card className="shadow-lg rounded-2xl border-0 bg-white">
            <CardContent className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                <div>
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <Lock className="w-6 h-6 text-green-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Pagamento Seguro</h3>
                  <p className="text-gray-600 text-sm">
                    Seus dados estão protegidos com criptografia SSL
                  </p>
                </div>
                
                <div>
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <Zap className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Ativação Instantânea</h3>
                  <p className="text-gray-600 text-sm">
                    Acesso imediato após confirmação do pagamento
                  </p>
                </div>
                
                <div>
                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <Shield className="w-6 h-6 text-purple-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Garantia Total</h3>
                  <p className="text-gray-600 text-sm">
                    30 dias para cancelar e receber reembolso completo
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Modal de Sucesso */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-8 max-w-md w-full text-center"
          >
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Pagamento Confirmado!
            </h2>
            <p className="text-gray-600 mb-6">
              Parabéns! Seu plano Pro foi ativado com sucesso. Você será redirecionado em alguns segundos.
            </p>
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default PaymentPage;
