import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet';
import { Eye, EyeOff, UserPlus, Building2, User, Shield, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/use-toast';
import { calculateAge } from '@/lib/utils';
import { formatCPF, formatCNPJ, formatPhone } from '@/lib/formatters';

const Register = () => {
  const { user, isAdmin, registerWithoutLogin } = useAuth();
  const navigate = useNavigate();
  
  // Verificar se o usuário é admin antes de permitir acesso
  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (!isAdmin) {
      toast({
        title: 'Acesso negado',
        description: 'Apenas administradores podem acessar esta página.',
        variant: 'destructive'
      });
      navigate('/');
      return;
    }
  }, [user, isAdmin, navigate]);

  const [userType, setUserType] = useState('candidate');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    companyName: '',
    phone: '',
    cpf: '',
    cnpj: '',
    birthDate: '',
    schoolName: '',
    schoolType: '',
    schoolDirector: '',
    schoolContactPhone: '',
    schoolCity: '',
    schoolState: '',
    schoolWebsite: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
  if (formData.password !== formData.confirmPassword) {
        toast({ 
          title: 'Erro no cadastro', 
          description: 'As senhas não coincidem.', 
          variant: 'destructive' 
        });
        setLoading(false);
        return;
      }

      // Validações específicas por tipo
  if (userType === 'candidate' && !formData.birthDate) {
        toast({ 
          title: 'Erro no cadastro', 
          description: 'Data de nascimento é obrigatória.', 
          variant: 'destructive' 
        });
        setLoading(false);
        return;
      }

      // Preparar dados do usuário para API
  const userData = {
        email: formData.email,
        password: formData.password,
        type: userType,
        phone: formData.phone
      };
      
      if (userType === 'candidate') {
        userData.name = formData.name;
        userData.cpf = formData.cpf;
        // Calcular idade se necessário
        if (formData.birthDate) {
          userData.birthDate = formData.birthDate;
          userData.age = calculateAge(formData.birthDate);
        }
      } else if (userType === 'company') {
        userData.companyName = formData.companyName;
        userData.cnpj = formData.cnpj;
      } else if (userType === 'admin') {
        userData.name = formData.name;
      } else if (userType === 'school') {
        userData.schoolName = formData.schoolName || formData.name;
        userData.schoolType = formData.schoolType || undefined;
        userData.schoolDirector = formData.schoolDirector || undefined;
        userData.schoolContactPhone = formData.schoolContactPhone || formData.phone || undefined;
        userData.schoolCity = formData.schoolCity || undefined;
        userData.schoolState = formData.schoolState || undefined;
        userData.schoolWebsite = formData.schoolWebsite || undefined;
      }

      // Fazer requisição à API
      const response = await registerWithoutLogin(userData);

      const displayName = (response && response.user)
        ? (response.user.name || response.user.companyName || response.user.school_name || response.user.schoolName || response.user.email)
        : formData.email;
      toast({
        title: 'Usuário cadastrado com sucesso!',
        description: `${displayName} foi cadastrado no sistema.`
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
        birthDate: '',
        schoolName: '',
        schoolType: '',
        schoolDirector: '',
        schoolContactPhone: '',
        schoolCity: '',
        schoolState: '',
        schoolWebsite: ''
      });

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

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCPFChange = (e) => {
    const formatted = formatCPF(e.target.value);
    setFormData({ ...formData, cpf: formatted });
  };

  const handleCNPJChange = (e) => {
    const formatted = formatCNPJ(e.target.value);
    setFormData({ ...formData, cnpj: formatted });
  };

  const handlePhoneChange = (e) => {
    const formatted = formatPhone(e.target.value);
  const fieldName = e.target.name || 'phone';
  setFormData({ ...formData, [fieldName]: formatted });
  };

  return (
    <>
      <Helmet>
        <title>Cadastrar Usuário - Admin CurrículoJá</title>
        <meta name="description" content="Página administrativa para cadastro de novos usuários no sistema." />
      </Helmet>
      <div className="min-h-screen flex items-center justify-center py-12 px-4 bg-gray-50">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-md">
          <Card className="card-hover">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl gradient-text">Cadastrar Novo Usuário</CardTitle>
              <p className="text-gray-600">Área administrativa - Cadastro de usuários</p>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <Label className="text-base font-medium">Tipo de conta</Label>
                <div className="grid grid-cols-4 gap-3 mt-2">
                  <button type="button" onClick={() => setUserType('candidate')} className={`p-3 rounded-lg border-2 transition-all ${userType === 'candidate' ? 'border-[var(--color1)] bg-[var(--color1)]/10' : 'border-gray-200 hover:border-gray-300'}`}>
                    <User className="w-6 h-6 mx-auto mb-1" />
                    <div className="text-sm font-medium">Candidato</div>
                  </button>
                  <button type="button" onClick={() => setUserType('company')} className={`p-3 rounded-lg border-2 transition-all ${userType === 'company' ? 'border-[var(--color1)] bg-[var(--color1)]/10' : 'border-gray-200 hover:border-gray-300'}`}>
                    <Building2 className="w-6 h-6 mx-auto mb-1" />
                    <div className="text-sm font-medium">Empresa</div>
                  </button>
                  <button type="button" onClick={() => setUserType('school')} className={`p-3 rounded-lg border-2 transition-all ${userType === 'school' ? 'border-[var(--color1)] bg-[var(--color1)]/10' : 'border-gray-200 hover:border-gray-300'}`}>
                    <GraduationCap className="w-6 h-6 mx-auto mb-1" />
                    <div className="text-sm font-medium">Escola</div>
                  </button>
                  <button type="button" onClick={() => setUserType('admin')} className={`p-3 rounded-lg border-2 transition-all ${userType === 'admin' ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <Shield className="w-6 h-6 mx-auto mb-1 text-red-600" />
                    <div className="text-sm font-medium">Admin</div>
                  </button>
                </div>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                {userType === 'candidate' ? (
                  <>
                    <div><Label htmlFor="name">Nome Completo <span className="required-star">*</span></Label><Input id="name" name="name" type="text" value={formData.name} onChange={handleChange} placeholder="Seu nome completo" required /></div>
                    <div><Label htmlFor="cpf">CPF <span className="required-star">*</span></Label><Input id="cpf" name="cpf" type="text" value={formData.cpf} onChange={handleCPFChange} placeholder="000.000.000-00" maxLength="14" required /></div>
                    <div><Label htmlFor="birthDate">Data de Nascimento <span className="required-star">*</span></Label><Input id="birthDate" name="birthDate" type="date" value={formData.birthDate} onChange={handleChange} required /></div>
                  </>
                ) : userType === 'company' ? (
                  <>
                    <div><Label htmlFor="companyName">Nome da Empresa <span className="required-star">*</span></Label><Input id="companyName" name="companyName" type="text" value={formData.companyName} onChange={handleChange} placeholder="Nome da sua empresa" required /></div>
                    <div><Label htmlFor="cnpj">CNPJ <span className="required-star">*</span></Label><Input id="cnpj" name="cnpj" type="text" value={formData.cnpj} onChange={handleCNPJChange} placeholder="00.000.000/0000-00" maxLength="18" required /></div>
                  </>
                ) : userType === 'school' ? (
                  <>
                    <div><Label htmlFor="schoolName">Nome da Escola <span className="required-star">*</span></Label><Input id="schoolName" name="schoolName" type="text" value={formData.schoolName} onChange={handleChange} placeholder="Nome da escola" required /></div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div><Label htmlFor="schoolType">Tipo</Label><Input id="schoolType" name="schoolType" type="text" value={formData.schoolType} onChange={handleChange} placeholder="Ex.: Técnica, Pública, Privada" /></div>
                      <div><Label htmlFor="schoolDirector">Diretor</Label><Input id="schoolDirector" name="schoolDirector" type="text" value={formData.schoolDirector} onChange={handleChange} placeholder="Nome do diretor" /></div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div><Label htmlFor="schoolCity">Cidade</Label><Input id="schoolCity" name="schoolCity" type="text" value={formData.schoolCity} onChange={handleChange} placeholder="Cidade" /></div>
                      <div><Label htmlFor="schoolState">Estado</Label><Input id="schoolState" name="schoolState" type="text" value={formData.schoolState} onChange={handleChange} placeholder="Estado" /></div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div><Label htmlFor="schoolContactPhone">Telefone da Escola</Label><Input id="schoolContactPhone" name="schoolContactPhone" type="tel" value={formData.schoolContactPhone} onChange={handlePhoneChange} placeholder="(11) 99999-9999" maxLength="15" /></div>
                      <div><Label htmlFor="schoolWebsite">Website</Label><Input id="schoolWebsite" name="schoolWebsite" type="url" value={formData.schoolWebsite} onChange={handleChange} placeholder="https://" /></div>
                    </div>
                  </>
                ) : (
                  <>
                    <div><Label htmlFor="name">Nome do Administrador <span className="required-star">*</span></Label><Input id="name" name="name" type="text" value={formData.name} onChange={handleChange} placeholder="Nome do administrador" required /></div>
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-600 font-medium">
                        <Shield className="w-4 h-4 inline mr-1" />
                        Atenção: Você está criando uma conta de administrador
                      </p>
                      <p className="text-xs text-red-500 mt-1">
                        Administradores têm acesso total ao sistema
                      </p>
                    </div>
                  </>
                )}
                <div><Label htmlFor="email">Email <span className="required-star">*</span></Label><Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} placeholder="seu@email.com" required /></div>
                <div><Label htmlFor="phone">Telefone <span className="required-star">*</span></Label><Input id="phone" name="phone" type="tel" value={formData.phone} onChange={handlePhoneChange} placeholder="(11) 99999-9999" maxLength="15" required /></div>
                <div>
                  <Label htmlFor="password">Senha <span className="required-star">*</span></Label>
                  <div className="relative"><Input id="password" name="password" type={showPassword ? 'text' : 'password'} value={formData.password} onChange={handleChange} placeholder="Digite uma senha" required /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700">{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button></div>
                </div>
                <div><Label htmlFor="confirmPassword">Confirmar Senha <span className="required-star">*</span></Label><Input id="confirmPassword" name="confirmPassword" type="password" value={formData.confirmPassword} onChange={handleChange} placeholder="Confirme sua senha" required /></div>
                <Button type="submit" className="w-full btn-primary text-white" disabled={loading}>{loading ? 'Cadastrando usuário...' : <><UserPlus className="w-4 h-4 mr-2" /> Cadastrar Usuário</>}</Button>
              </form>
              <div className="mt-6 text-center">
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/admin-dashboard')}
                  className="w-full"
                >
                  Voltar ao Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </>
  );
};
export default Register;