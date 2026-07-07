import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/use-toast';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await login(formData.email, formData.password);

      if (response.success) {
        toast({
          title: 'Login realizado com sucesso!',
          description: `Bem-vindo de volta, ${response.user?.name || response.user?.companyName || response.user?.email}!`
        });
        
        // Redirecionamento baseado no tipo de usuário
        if (response.user.type === 'admin' || response.user.isAdmin) {
          navigate('/admin-dashboard');
        } else if (response.user.type === 'company') {
          navigate('/company-dashboard');
        } else if (response.user.type === 'school') {
          navigate('/school-dashboard');
        } else if (response.user.type === 'candidate') {
          navigate('/search-jobs');
        } else {
          navigate('/dashboard');
        }
      } else {
        throw new Error(response.error || 'Erro no login');
      }
    } catch (error) {
      console.error('Erro no login:', error);
      toast({
        title: 'Erro no login',
        description: error.message || 'Erro inesperado. Tente novamente.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <>
      <Helmet>
        <title>Entrar - CurrículoJá</title>
        <meta name="description" content="Faça login na sua conta CurrículoJá e acesse suas funcionalidades exclusivas." />
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
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Bem-vindo de volta</p>
              <CardTitle className="text-3xl font-bold tracking-tight text-[#2563eb]">Entrar na sua conta</CardTitle>
              <p className="text-sm text-slate-500 mt-2">Acesse sua conta CurrículoJá</p>
            </CardHeader>
            <CardContent className="px-8 pb-8">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <Label htmlFor="email" className="text-sm font-medium text-slate-700">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="seu@email.com"
                    required
                    className="mt-1.5 rounded-xl border-2 border-slate-200 bg-slate-50/60 px-4 py-2.5 text-sm focus:border-[#2563eb] focus:bg-white transition-all"
                  />
                </div>

                <div>
                  <Label htmlFor="password" className="text-sm font-medium text-slate-700">Senha</Label>
                  <div className="relative mt-1.5">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Sua senha"
                      required
                      className="rounded-xl border-2 border-slate-200 bg-slate-50/60 px-4 py-2.5 pr-11 text-sm focus:border-[#2563eb] focus:bg-white transition-all"
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

                <Button
                  type="submit"
                  className="w-full rounded-2xl border-2 border-[#2563eb] bg-[#2563eb] px-4 py-3 text-sm font-semibold text-white shadow-sm shadow-sky-200 transition-all hover:-translate-y-[1px] hover:border-[#1d4ed8] hover:bg-[#1d4ed8] mt-6"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Entrando...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center">
                      <LogIn className="w-4 h-4 mr-2" />
                      Entrar
                    </span>
                  )}
                </Button>

                {/* Seção de Cadastro */}
                <div className="pt-6 border-t-2 border-slate-200">
                  <p className="text-center text-sm text-slate-600 mb-4 font-medium">
                    Ainda não tem uma conta?
                  </p>
                  <div className="space-y-2">
                    <Link 
                      to="/student-register" 
                      className="block w-full text-center py-2.5 px-4 rounded-2xl border-2 border-emerald-500 bg-emerald-50 text-emerald-600 font-medium hover:bg-emerald-100 transition-colors text-sm"
                    >
                      Sou Candidato/Aluno
                    </Link>
                    <Link 
                      to="/company-register" 
                      className="block w-full text-center py-2.5 px-4 rounded-2xl border-2 border-[#2563eb] bg-blue-50 text-[#2563eb] font-medium hover:bg-blue-100 transition-colors text-sm"
                    >
                      Sou Empresa
                    </Link>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </>
  );
};

export default Login;