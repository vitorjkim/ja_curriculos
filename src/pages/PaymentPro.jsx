import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Star, Check, Shield, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';

const PaymentPro = () => {
  const navigate = useNavigate();
  const { user, updateSubscription } = useAuth();

  const handleConfirm = async () => {
    try {
      if (updateSubscription) {
        await updateSubscription('pro');
      }
      navigate('/company-dashboard');
    } catch (error) {
      console.error('Erro ao fazer upgrade:', error);
      alert('Erro ao processar upgrade. Tente novamente.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-4xl mx-auto">
        <Button variant="outline" onClick={() => navigate(-1)} className="mb-6 rounded-2xl border-gray-200 hover:bg-blue-50 hover:border-blue-400 hover:text-blue-600 hover:shadow-md transition-all duration-200">
          <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
        </Button>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <Card className="shadow-lg border-2">
            <CardHeader className="flex flex-col items-center text-center">
              <Star className="w-16 h-16 text-blue-500 mb-2" />
              <CardTitle className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-purple-500">Assinar Pro</CardTitle>
              <p className="text-gray-600 mt-2 max-w-xl">Cresça sua empresa com mais vagas, candidatos favoritos e selo de verificado.</p>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="font-semibold mb-3 text-gray-800">Recursos Inclusos</h3>
                  <ul className="space-y-2 text-sm">
                    {[
                      'Até 5 vagas ativas por mês',
                      'Até 200 currículos recebidos/mês',
                      'Candidatos favoritos',
                      'Adicionar foto da empresa',
                      'Selo de verificado',
                      'Suporte prioritário'
                    ].map(f => (
                      <li key={f} className="flex items-start"><Check className="w-4 h-4 mr-2 text-green-600 mt-0.5" /> {f}</li>
                    ))}
                  </ul>
                  <div className="mt-6 p-4 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-800 flex items-start">
                    <Shield className="w-4 h-4 mr-2 mt-0.5" /> Pagamento seguro simulado. Integraremos gateway real futuramente.
                  </div>
                </div>
                <div>
                  <div className="bg-white rounded-xl p-6 border shadow-sm">
                    <h4 className="text-xl font-semibold mb-2">Resumo</h4>
                    <div className="flex justify-between text-sm mb-1"><span>Plano</span><span>Pro</span></div>
                    <div className="flex justify-between text-sm mb-1"><span>Período</span><span>Mensal</span></div>
                    <div className="flex justify-between text-sm mb-4"><span>Total hoje</span><span className="font-semibold">R$ 19</span></div>
                    
                    {/* QR Code PIX */}
                    <div className="mb-4 text-center">
                      <p className="text-sm font-medium mb-2">Pague via PIX</p>
                      <div className="bg-gray-100 p-4 rounded-lg inline-block">
                        <img 
                          src="https://api.qrserver.com/v1/create-qr-code/?size=128x128&data=00020126580014BR.GOV.BCB.PIX013636c4c4e0-7b9f-4c6a-8f9e-1234567890125204000053039865802BR5925CURRICULOJA PLANO PRO6009SAO PAULO62070503***6304E5A2"
                          alt="QR Code PIX - Plano Pro R$ 19"
                          className="w-32 h-32 border border-gray-300 rounded"
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-2">Escaneie com seu banco ou PIX</p>
                      <p className="text-xs text-blue-600 mt-1 font-medium">Chave PIX: curriculoja@pro.com</p>
                    </div>
                    
                    <Button onClick={handleConfirm} className="w-full btn-primary text-white rounded-full py-6 text-lg font-semibold">Confirmar e Ativar</Button>
                    <p className="text-xs text-gray-500 mt-3 text-center">Ao confirmar você concorda com nossos termos de uso.</p>
                  </div>
                  <div className="mt-6 text-center text-sm text-gray-600">
                    Precisa de mais recursos? <button onClick={() => navigate('/payment-premium')} className="text-blue-600 hover:underline">Veja o Premium</button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default PaymentPro;
