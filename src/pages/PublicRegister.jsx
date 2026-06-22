import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet';
import { Eye, EyeOff, UserPlus, Building2, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/use-toast';
import { calculateAge } from '@/lib/utils';
import { formatCPF, formatCNPJ, formatPhone } from '@/lib/formatters';

const PublicRegister = () => {
  const { user, registerWithoutLogin } = useAuth();
  const navigate = useNavigate();
  
  // Redirecionar se já estiver logado
  useEffect(() => {
    if (user) {
      navigate('/');
      return;
    }
  }, [user, navigate]);

  const [userType, setUserType] = useState('candidate');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    companyName: '',
    phone: '',
    cpf: '',
    cnpj: '',
    birthDate: ''
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCPFChange = (e) => {
    const formatted = formatCPF(e.target.value);
    setFormData(prev => ({ ...prev, cpf: formatted }));
  };

  const handleCNPJChange = (e) => {
    const formatted = formatCNPJ(e.target.value);
    setFormData(prev => ({ ...prev, cnpj: formatted }));
  };

  const handlePhoneChange = (e) => {
    const formatted = formatPhone(e.target.value);
    setFormData(prev => ({ ...prev, phone: formatted }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validações
      if (formData.password !== formData.confirmPassword) {
        toast({
          title: 'Erro de validação',
          description: 'As senhas não coincidem.',
          variant: 'destructive'
        });
        return;
      }

      if (formData.password.length < 6) {
        toast({
          title: 'Erro de validação',
          description: 'A senha deve ter pelo menos 6 caracteres.',
          variant: 'destructive'
        });
        return;
      }

      if (userType === 'candidate' && formData.birthDate) {
        const age = calculateAge(formData.birthDate);
        if (age < 14) {
          toast({
            title: 'Erro de validação',
            description: 'É necessário ter pelo menos 14 anos para se cadastrar.',
            variant: 'destructive'
          });
          return;
        }
      }

      // Preparar dados do usuário
      const userData = {
        email: formData.email,
        password: formData.password,
        phone: formData.phone,
        type: userType
      };

      if (userType === 'candidate') {
        userData.name = formData.name;
        userData.cpf = formData.cpf;
        userData.birthDate = formData.birthDate;
      } else if (userType === 'company') {
        userData.companyName = formData.companyName;
        userData.cnpj = formData.cnpj;
      }

      // Fazer requisição à API
      const response = await registerWithoutLogin(userData);

      toast({
        title: 'Cadastro realizado com sucesso!',
        description: `${response.user.name || response.user.companyName}, seja bem-vindo(a)! Agora você pode fazer login.`
      });

      // Limpar formulário após cadastro bem-sucedido
      setFormData({
        email: '',
        password: '',
        confirmPassword: '',
        name: '',
        companyName: '',
        phone: '',
        cpf: '',
        cnpj: '',
        birthDate: ''
      });

      // Redirecionar para login após alguns segundos
      setTimeout(() => {
        navigate('/login');
      }, 2000);

    } catch (error) {
      console.error('Erro no cadastro:', error);
      toast({ 
        title: 'Erro no cadastro', 
        description: error.message || 'Ocorreu um erro inesperado. Tente novamente.', 
        variant: 'destructive' 
      });
    } finally {
      setLoading(false);
    }
  };

  if (user) {
    return null; // Não renderizar se estiver logado
  }

  return (
    <>
      <Helmet>
        <title>Criar Conta - CurrículoJá</title>
        <meta name="description" content="Crie sua conta no CurrículoJá e comece a construir seu futuro profissional." />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-[var(--color1)] via-[var(--color2)] to-[var(--color3)] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <Card className="shadow-2xl border-0">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-3xl font-bold text-[var(--color1)] flex items-center justify-center gap-2">
                <UserPlus className="w-8 h-8" />
                Criar Conta
              </CardTitle>
              <p className="text-gray-600">Junte-se ao CurrículoJá gratuitamente</p>
            </CardHeader>
            
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Seletor de tipo de usuário */}
                <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-lg">
                  <Button
                    type="button"
                    variant={userType === 'candidate' ? 'default' : 'ghost'}
                    className={`${userType === 'candidate' ? 'bg-[var(--color1)] hover:bg-[var(--color1)]/90' : ''}`}
                    onClick={() => setUserType('candidate')}
                  >
                    <User className="w-4 h-4 mr-2" />
                    Candidato
                  </Button>
                  <Button
                    type="button"
                    variant={userType === 'company' ? 'default' : 'ghost'}
                    className={`${userType === 'company' ? 'bg-[var(--color1)] hover:bg-[var(--color1)]/90' : ''}`}
                    onClick={() => setUserType('company')}
                  >
                    <Building2 className="w-4 h-4 mr-2" />
                    Empresa
                  </Button>
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail *</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    placeholder="seu@email.com"
                  />
                </div>

                {/* Nome ou Nome da Empresa */}
                {userType === 'candidate' && (
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome completo *</Label>
                    <Input
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      placeholder="João Silva"
                    />
                  </div>
                )}

                {userType === 'company' && (
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Nome da empresa *</Label>
                    <Input
                      id="companyName"
                      name="companyName"
                      value={formData.companyName}
                      onChange={handleInputChange}
                      required
                      placeholder="Minha Empresa LTDA"
                    />
                  </div>
                )}

                {/* Telefone */}
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handlePhoneChange}
                    placeholder="(11) 99999-9999"
                  />
                </div>

                {/* CPF ou CNPJ */}
                {userType === 'candidate' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="cpf">CPF</Label>
                      <Input
                        id="cpf"
                        name="cpf"
                        value={formData.cpf}
                        onChange={handleCPFChange}
                        maxLength="14"
                        placeholder="000.000.000-00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="birthDate">Data de nascimento</Label>
                      <Input
                        id="birthDate"
                        name="birthDate"
                        type="date"
                        value={formData.birthDate}
                        onChange={handleInputChange}
                      />
                    </div>
                  </>
                )}

                {userType === 'company' && (
                  <div className="space-y-2">
                    <Label htmlFor="cnpj">CNPJ</Label>
                    <Input
                      id="cnpj"
                      name="cnpj"
                      value={formData.cnpj}
                      onChange={handleCNPJChange}
                      maxLength="18"
                      placeholder="00.000.000/0000-00"
                    />
                  </div>
                )}

                {/* Senha */}
                <div className="space-y-2">
                  <Label htmlFor="password">Senha *</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={handleInputChange}
                      required
                      minLength="6"
                      placeholder="Mínimo 6 caracteres"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Confirmar Senha */}
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar senha *</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      required
                      placeholder="Digite a senha novamente"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </Button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-[var(--color1)] hover:bg-[var(--color1)]/90"
                  disabled={loading}
                >
                  {loading ? 'Criando conta...' : 'Criar Conta'}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600">
                  Já tem uma conta?{' '}
                  <Link to="/login" className="font-medium text-[var(--color1)] hover:text-[var(--color1)]/80">
                    Entre aqui
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </>
  );
};

export default PublicRegister;
