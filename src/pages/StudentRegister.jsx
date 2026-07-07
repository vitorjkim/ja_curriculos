import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet';
import { Eye, EyeOff, User, Mail, Phone, Lock, CheckCircle, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/use-toast';
import { formatPhone } from '@/lib/formatters';

const StudentRegister = () => {
  const { user, registerWithoutLogin, login } = useAuth();
  const navigate = useNavigate();
  
  // Redirecionar se já estiver logado
  useEffect(() => {
    if (user) {
      navigate('/');
      return;
    }
  }, [user, navigate]);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'phone') {
      const formatted = formatPhone(value);
      setFormData(prev => ({
        ...prev,
        [name]: formatted
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      toast({
        title: 'Nome obrigatório',
        description: 'Por favor, insira seu nome completo.',
        variant: 'destructive'
      });
      return false;
    }

    if (!formData.email.includes('@')) {
      toast({
        title: 'Email inválido',
        description: 'Por favor, insira um email válido.',
        variant: 'destructive'
      });
      return false;
    }

    if (formData.password.length < 6) {
      toast({
        title: 'Senha muito fraca',
        description: 'A senha deve ter pelo menos 6 caracteres.',
        variant: 'destructive'
      });
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: 'Senhas não coincidem',
        description: 'A confirmação de senha deve ser igual à senha.',
        variant: 'destructive'
      });
      return false;
    }

    if (!agreeToTerms) {
      toast({
        title: 'Termos obrigatórios',
        description: 'Você deve concordar com os termos de serviço.',
        variant: 'destructive'
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    
    try {
      const userData = {
        email: formData.email,
        password: formData.password,
        type: 'candidate',
        name: formData.name,
        phone: formData.phone || null
      };

      const success = await registerWithoutLogin(userData);
      
      if (success) {
        console.log('Registro realizado com sucesso, fazendo login automático...');
        
        // Fazer login automático após o registro
        try {
          await login(formData.email, formData.password);
          console.log('Login automático realizado com sucesso');
          
          toast({
            title: 'Bem-vindo!',
            description: 'Sua conta foi criada com sucesso. Redirecionando...'
          });
          
          // Redirecionar para dashboard
          navigate('/dashboard');
        } catch (loginError) {
          console.error('Erro no login automático:', loginError);
          toast({
            title: 'Cadastro realizado!',
            description: 'Por favor, faça login para acessar sua conta.',
          });
          navigate('/login');
        }
      } else {
        throw new Error('Erro ao criar conta');
      }
    } catch (error) {
      console.error('Erro no cadastro:', error);
      toast({
        title: 'Erro no cadastro',
        description: error.message || 'Tente novamente ou use outro email.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Cadastro de Candidato - CurrículoJá</title>
        <meta name="description" content="Crie sua conta como candidato no CurrículoJá e acesse vagas de emprego exclusivas." />
      </Helmet>

      <div className="min-h-screen flex items-start justify-center px-4 pt-8 bg-slate-50/80">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <Card className="rounded-[24px] border-2 border-slate-200 bg-white/90 shadow-[0_18px_45px_rgba(15,23,42,0.06)] backdrop-blur-sm">
            <CardHeader className="text-center px-8 pt-8 pb-6">
              <div className="flex justify-center mb-4">
                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-3 rounded-full">
                  <User className="w-6 h-6 text-white" />
                </div>
              </div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Novo por aqui?</p>
              <CardTitle className="text-3xl font-bold tracking-tight text-emerald-600">
                Criar Conta
              </CardTitle>
              <p className="text-sm text-slate-500 mt-2">Junte-se a milhares de candidatos no CurrículoJá</p>
            </CardHeader>

            <CardContent className="px-8 pb-8">
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Nome */}
                <div>
                  <Label htmlFor="name" className="text-sm font-medium text-slate-700">Nome Completo</Label>
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Seu nome completo"
                    required
                    className="mt-1.5 rounded-xl border-2 border-slate-200 bg-slate-50/60 px-4 py-2.5 text-sm focus:border-emerald-500 focus:bg-white transition-all"
                  />
                </div>

                {/* Email */}
                <div>
                  <Label htmlFor="email" className="text-sm font-medium text-slate-700">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="seu@email.com"
                    required
                    className="mt-1.5 rounded-xl border-2 border-slate-200 bg-slate-50/60 px-4 py-2.5 text-sm focus:border-emerald-500 focus:bg-white transition-all"
                  />
                </div>

                {/* Telefone (Opcional) */}
                <div>
                  <Label htmlFor="phone" className="text-sm font-medium text-slate-700">
                    Telefone <span className="text-xs text-slate-400">(opcional)</span>
                  </Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="(11) 99999-9999"
                    className="mt-1.5 rounded-xl border-2 border-slate-200 bg-slate-50/60 px-4 py-2.5 text-sm focus:border-emerald-500 focus:bg-white transition-all"
                  />
                </div>

                {/* Senha */}
                <div>
                  <Label htmlFor="password" className="text-sm font-medium text-slate-700">Senha</Label>
                  <div className="relative mt-1.5">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder="Mínimo 6 caracteres"
                      required
                      className="rounded-xl border-2 border-slate-200 bg-slate-50/60 px-4 py-2.5 pr-11 text-sm focus:border-emerald-500 focus:bg-white transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirmar Senha */}
                <div>
                  <Label htmlFor="confirmPassword" className="text-sm font-medium text-slate-700">Confirmar Senha</Label>
                  <div className="relative mt-1.5">
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      placeholder="Repita sua senha"
                      required
                      className="rounded-xl border-2 border-slate-200 bg-slate-50/60 px-4 py-2.5 pr-11 text-sm focus:border-emerald-500 focus:bg-white transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Termos */}
                <div className="flex items-start gap-3 pt-2">
                  <input
                    type="checkbox"
                    id="agreeToTerms"
                    checked={agreeToTerms}
                    onChange={(e) => setAgreeToTerms(e.target.checked)}
                    className="mt-1 rounded border-2 border-slate-200 text-emerald-600 focus:ring-emerald-500"
                  />
                  <label htmlFor="agreeToTerms" className="text-xs text-slate-600">
                    Concordo com os{' '}
                    <a href="#" className="font-medium text-emerald-600 hover:text-emerald-700 underline">
                      Termos de Serviço
                    </a>
                    {' '}e{' '}
                    <a href="#" className="font-medium text-emerald-600 hover:text-emerald-700 underline">
                      Política de Privacidade
                    </a>
                  </label>
                </div>

                {/* Botão Cadastrar */}
                <Button
                  type="submit"
                  className="w-full rounded-2xl border-2 border-emerald-500 bg-emerald-500 px-4 py-3 text-sm font-semibold text-white shadow-sm shadow-emerald-200 transition-all hover:-translate-y-[1px] hover:border-emerald-600 hover:bg-emerald-600 mt-6"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Criando conta...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center">
                      <UserPlus className="w-4 h-4 mr-2" />
                      Criar Conta
                    </span>
                  )}
                </Button>

                {/* Seção de Login */}
                <div className="pt-6 border-t-2 border-slate-200">
                  <p className="text-center text-sm text-slate-600">
                    Já tem uma conta?{' '}
                    <Link 
                      to="/login" 
                      className="font-medium text-emerald-600 hover:text-emerald-700 underline transition-colors"
                    >
                      Entrar
                    </Link>
                  </p>
                </div>

                {/* Divider com texto */}
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t-2 border-slate-200"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-slate-400">ou</span>
                  </div>
                </div>

                {/* Link para Empresa */}
                <p className="text-center text-sm text-slate-600">
                  É uma empresa?{' '}
                  <Link 
                    to="/company-register" 
                    className="font-medium text-sky-600 hover:text-sky-700 underline transition-colors"
                  >
                    Cadastre-se aqui
                  </Link>
                </p>
              </form>
            </CardContent>
          </Card>

          {/* Footer com features */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-8 grid grid-cols-3 gap-4 text-center text-sm"
          >
            <div className="text-slate-600">
              <CheckCircle className="w-5 h-5 text-emerald-500 mx-auto mb-2" />
              <p className="font-medium">100% Grátis</p>
            </div>
            <div className="text-slate-600">
              <CheckCircle className="w-5 h-5 text-emerald-500 mx-auto mb-2" />
              <p className="font-medium">Rápido & Fácil</p>
            </div>
            <div className="text-slate-600">
              <CheckCircle className="w-5 h-5 text-emerald-500 mx-auto mb-2" />
              <p className="font-medium">Seguro</p>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </>
  );
};

export default StudentRegister;
