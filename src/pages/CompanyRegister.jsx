import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet';
import { Eye, EyeOff, Building2, Mail, Phone, Lock, FileText, CheckCircle, Camera, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/use-toast';
import { formatCNPJ, formatPhone, validateCNPJFormat } from '@/lib/formatters';
import ImageCropper from '@/components/ImageCropper';

const CompanyRegister = () => {
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
  const [cnpjError, setCnpjError] = useState('');

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    companyName: '',
    phone: '',
    cnpj: ''
  });

  const [profileImagePreview, setProfileImagePreview] = useState(null);
  const [imageShape, setImageShape] = useState('square');
  const [tempImageForCropper, setTempImageForCropper] = useState(null);
  const [showCropper, setShowCropper] = useState(false);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'Arquivo muito grande',
          description: 'A imagem deve ter no máximo 5MB.',
          variant: 'destructive'
        });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setTempImageForCropper(reader.result);
        setShowCropper(true);
      };
      reader.readAsDataURL(file);
    }
    // Reset input value to allow re-selecting same file
    e.target.value = '';
  };

  const handleCropperConfirm = (croppedDataUrl, shape) => {
    setProfileImagePreview(croppedDataUrl);
    setImageShape(shape);
    setShowCropper(false);
    setTempImageForCropper(null);
  };

  const handleCropperCancel = () => {
    setShowCropper(false);
    setTempImageForCropper(null);
  };

  const removeImage = () => {
    setProfileImagePreview(null);
    setImageShape('square');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateForm = () => {
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

    if (!formData.companyName.trim()) {
      toast({
        title: 'Nome da empresa obrigatório',
        description: 'Por favor, insira o nome da empresa.',
        variant: 'destructive'
      });
      return false;
    }

    if (!formData.phone.trim()) {
      toast({
        title: 'Telefone obrigatório',
        description: 'Por favor, insira um telefone para contato.',
        variant: 'destructive'
      });
      return false;
    }

    if (!formData.cnpj.trim()) {
      toast({
        title: 'CNPJ obrigatório',
        description: 'Por favor, insira o CNPJ da empresa.',
        variant: 'destructive'
      });
      return false;
    }

    // Validação simples de CNPJ usando a função utilitária
    if (!validateCNPJFormat(formData.cnpj)) {
      toast({
        title: 'CNPJ inválido',
        description: 'Por favor, insira um CNPJ válido no formato 00.000.000/0000-00.',
        variant: 'destructive'
      });
      return false;
    }

    // Verificar se há erro de CNPJ duplicado
    if (cnpjError) {
      toast({
        title: 'CNPJ já cadastrado',
        description: cnpjError,
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
        type: 'company',
        companyName: formData.companyName,
        phone: formData.phone,
        cnpj: formData.cnpj,
        // Salvar a foto de perfil/logo da empresa
        profileImage: profileImagePreview || null,
        logo: profileImagePreview || null
      };

      const success = await registerWithoutLogin(userData);
      
      if (success) {
        console.log('Registro realizado com sucesso, fazendo login automático...');
        
        // Fazer login automático após o registro
        try {
          await login(formData.email, formData.password);
          console.log('Login automático realizado com sucesso');
          
          toast({
            title: 'Empresa cadastrada com sucesso!',
            description: 'Bem-vindo ao CurrículoJá!'
          });
          
          // Redirecionar diretamente para o dashboard
          setTimeout(() => {
            navigate('/company-dashboard', { 
              replace: true
            });
          }, 1000);
        } catch (loginError) {
          console.error('Erro no login automático:', loginError);
          
          toast({
            title: 'Empresa cadastrada!',
            description: 'Faça login para acessar sua conta.',
          });
          
          // Se falhar o login automático, redireciona para login
          setTimeout(() => {
            navigate('/company-login', {
              state: { email: formData.email }
            });
          }, 1500);
        }
      }
    } catch (error) {
      console.error('Erro no cadastro:', error);
      
      // Verificar se é erro de email/CNPJ duplicado
      if (error.message.includes('email já está cadastrado')) {
        toast({
          title: 'Email já cadastrado',
          description: 'Este email já está sendo usado por outra empresa. Tente fazer login.',
          variant: 'destructive'
        });
      } else if (error.message.includes('CNPJ já está cadastrado')) {
        toast({
          title: 'CNPJ já cadastrado',
          description: 'Este CNPJ já está sendo usado por outra empresa.',
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'Erro no cadastro',
          description: error.message || 'Ocorreu um erro ao cadastrar a empresa.',
          variant: 'destructive'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCNPJChange = (e) => {
    const formatted = formatCNPJ(e.target.value);
    setFormData(prev => ({ ...prev, cnpj: formatted }));
    
    // Verificar se CNPJ já existe
    if (formatted.length === 18) { // CNPJ completo formatado
      checkCNPJExists(formatted);
    } else {
      setCnpjError('');
    }
  };

  const checkCNPJExists = async (cnpj) => {
    try {
      const users = JSON.parse(localStorage.getItem('curriculoja_users') || '[]');
      const cnpjExists = users.find(u => 
        u.type === 'company' && u.cnpj === cnpj
      );
      
      if (cnpjExists) {
        setCnpjError('Este CNPJ já está cadastrado por outra empresa');
      } else {
        setCnpjError('');
      }
    } catch (error) {
      console.error('Erro ao verificar CNPJ:', error);
    }
  };

  const handlePhoneChange = (e) => {
    const formatted = formatPhone(e.target.value);
    setFormData(prev => ({ ...prev, phone: formatted }));
  };

  return (
    <>
      <Helmet>
        <title>Cadastro de Empresa - CurrículoJá</title>
        <meta name="description" content="Cadastre sua empresa no CurrículoJá e tenha acesso aos melhores talentos do mercado." />
      </Helmet>

      <div className="min-h-screen bg-slate-50/80 py-10 px-4">
        <div className="mx-auto max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Header */}
            <div className="mb-6 flex flex-col items-center text-center rounded-[24px] border-2 border-slate-200 bg-white/90 px-6 sm:px-8 py-8 shadow-[0_18px_45px_rgba(15,23,42,0.06)] backdrop-blur-sm">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#2563eb]/10 text-[#2563eb] mb-4">
                <Building2 className="h-7 w-7" />
              </div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Cadastro Empresarial</p>
              <h1 className="mb-1 text-2xl sm:text-3xl font-bold tracking-tight md:text-4xl">
                <span className="text-slate-900">Criar Conta </span>
                <span className="text-[#2563eb]">Empresarial</span>
              </h1>
              <p className="text-sm text-slate-500">
                Registre sua empresa e encontre os melhores talentos do mercado
              </p>
            </div>

            {/* Image Cropper Modal */}
            {showCropper && tempImageForCropper && (
              <ImageCropper
                imageSrc={tempImageForCropper}
                initialShape="square"
                onCancel={handleCropperCancel}
                onConfirm={handleCropperConfirm}
                previewSize={280}
                exportSize={512}
              />
            )}

            {/* Profile Photo Upload Card */}
            <div className="mb-6 rounded-[24px] border-2 border-slate-200 bg-white/95 p-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
                  <Camera className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Logo da Empresa</h2>
                  <p className="text-xs text-slate-500">Adicione a logo que aparecerá no seu perfil</p>
                </div>
              </div>
              
              <div className="flex flex-col items-center justify-center">
                {profileImagePreview ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="relative">
                      <div
                        className={`h-32 w-32 overflow-hidden border-2 border-slate-200 bg-white shadow-lg ${imageShape === 'circle' ? 'rounded-full' : 'rounded-[24px]'}`}
                        style={{
                          WebkitClipPath: imageShape === 'circle' ? 'circle(50% at 50% 50%)' : 'inset(0 round 24px)',
                          clipPath: imageShape === 'circle' ? 'circle(50% at 50% 50%)' : 'inset(0 round 24px)',
                        }}
                      >
                        <img 
                          src={profileImagePreview} 
                          alt="Preview" 
                          className="block h-full w-full object-cover"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={removeImage}
                        className="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-red-500 text-white shadow-lg hover:bg-red-600 transition-colors z-10"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <label className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#2563eb] bg-[#2563eb]/10 rounded-xl cursor-pointer hover:bg-[#2563eb]/20 transition-colors">
                      <Camera className="h-4 w-4" />
                      Alterar foto
                      <input 
                        type="file" 
                        className="hidden" 
                        accept="image/*"
                        onChange={handleImageChange}
                      />
                    </label>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-slate-300 rounded-2xl cursor-pointer hover:border-[#2563eb] hover:bg-slate-50/50 transition-all group">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 group-hover:bg-[#2563eb]/10 group-hover:text-[#2563eb] transition-colors mb-3">
                        <Upload className="h-6 w-6" />
                      </div>
                      <p className="text-sm font-medium text-slate-600 group-hover:text-[#2563eb] transition-colors">
                        Clique para enviar
                      </p>
                      <p className="text-xs text-slate-400 mt-1">PNG, JPG até 5MB</p>
                    </div>
                    <input 
                      type="file" 
                      className="hidden" 
                      accept="image/*"
                      onChange={handleImageChange}
                    />
                  </label>
                )}
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <Card className="rounded-[24px] border-2 border-slate-200 bg-white/95 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-600">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-semibold text-slate-900">
                        Dados da Empresa
                      </CardTitle>
                      <p className="text-xs text-slate-500">Preencha os campos para criar sua conta</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  {/* Nome da Empresa */}
                  <div className="space-y-1.5">
                    <div className="inline-flex items-center gap-2 rounded-full border border-sky-100 bg-sky-50/60 px-4 py-1.5 text-[13px] font-medium text-sky-700">
                      <Building2 className="h-4 w-4" />
                      <Label htmlFor="companyName" className="cursor-pointer">
                        Nome da Empresa <span className="text-red-500">*</span>
                      </Label>
                    </div>
                    <Input
                      id="companyName"
                      name="companyName"
                      type="text"
                      value={formData.companyName}
                      onChange={handleInputChange}
                      placeholder="Digite o nome da empresa"
                      required
                      className="h-11 rounded-2xl border-slate-200 bg-slate-50/60 text-sm placeholder:text-slate-400 focus-visible:border-sky-400 focus-visible:ring-sky-400"
                    />
                  </div>

                  {/* CNPJ */}
                  <div className="space-y-1.5">
                    <div className="inline-flex items-center gap-2 rounded-full border border-cyan-100 bg-cyan-50/60 px-4 py-1.5 text-[13px] font-medium text-cyan-700">
                      <FileText className="h-4 w-4" />
                      <Label htmlFor="cnpj" className="cursor-pointer">
                        CNPJ <span className="text-red-500">*</span>
                      </Label>
                    </div>
                    <Input
                      id="cnpj"
                      name="cnpj"
                      type="text"
                      value={formData.cnpj}
                      onChange={handleCNPJChange}
                      placeholder="00.000.000/0000-00"
                      required
                      className={`h-11 rounded-2xl text-sm placeholder:text-slate-400 ${
                        cnpjError 
                          ? 'border-red-400 bg-red-50/60 focus-visible:border-red-400 focus-visible:ring-red-400' 
                          : 'border-slate-200 bg-slate-50/60 focus-visible:border-cyan-400 focus-visible:ring-cyan-400'
                      }`}
                    />
                    {cnpjError && (
                      <p className="text-red-500 text-xs mt-1 pl-1">{cnpjError}</p>
                    )}
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    {/* Email */}
                    <div className="space-y-1.5">
                      <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50/60 px-4 py-1.5 text-[13px] font-medium text-indigo-700">
                        <Mail className="h-4 w-4" />
                        <Label htmlFor="email" className="cursor-pointer">
                          Email <span className="text-red-500">*</span>
                        </Label>
                      </div>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        placeholder="empresa@exemplo.com"
                        required
                        className="h-11 rounded-2xl border-slate-200 bg-slate-50/60 text-sm placeholder:text-slate-400 focus-visible:border-indigo-400 focus-visible:ring-indigo-400"
                      />
                    </div>

                    {/* Telefone */}
                    <div className="space-y-1.5">
                      <div className="inline-flex items-center gap-2 rounded-full border border-teal-100 bg-teal-50/60 px-4 py-1.5 text-[13px] font-medium text-teal-700">
                        <Phone className="h-4 w-4" />
                        <Label htmlFor="phone" className="cursor-pointer">
                          Telefone <span className="text-red-500">*</span>
                        </Label>
                      </div>
                      <Input
                        id="phone"
                        name="phone"
                        type="text"
                        value={formData.phone}
                        onChange={handlePhoneChange}
                        placeholder="(11) 99999-9999"
                        required
                        className="h-11 rounded-2xl border-slate-200 bg-slate-50/60 text-sm placeholder:text-slate-400 focus-visible:border-teal-400 focus-visible:ring-teal-400"
                      />
                    </div>
                  </div>

                  {/* Senha */}
                  <div className="space-y-1.5">
                    <div className="inline-flex items-center gap-2 rounded-full border border-violet-100 bg-violet-50/60 px-4 py-1.5 text-[13px] font-medium text-violet-700">
                      <Lock className="h-4 w-4" />
                      <Label htmlFor="password" className="cursor-pointer">
                        Senha <span className="text-red-500">*</span>
                      </Label>
                    </div>
                    <div className="relative">
                      <Input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={handleInputChange}
                        placeholder="Digite sua senha"
                        required
                        className="h-11 pr-11 rounded-2xl border-slate-200 bg-slate-50/60 text-sm placeholder:text-slate-400 focus-visible:border-violet-400 focus-visible:ring-violet-400"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-500 pl-1">Mínimo 6 caracteres</p>
                  </div>

                  {/* Confirmar Senha */}
                  <div className="space-y-1.5">
                    <div className="inline-flex items-center gap-2 rounded-full border border-violet-100 bg-violet-50/60 px-4 py-1.5 text-[13px] font-medium text-violet-700">
                      <CheckCircle className="h-4 w-4" />
                      <Label htmlFor="confirmPassword" className="cursor-pointer">
                        Confirmar Senha <span className="text-red-500">*</span>
                      </Label>
                    </div>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        placeholder="Confirme sua senha"
                        required
                        className="h-11 pr-11 rounded-2xl border-slate-200 bg-slate-50/60 text-sm placeholder:text-slate-400 focus-visible:border-violet-400 focus-visible:ring-violet-400"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  {/* Botão de Submit */}
                  <div className="pt-4">
                    <Button 
                      type="submit" 
                      className="w-full rounded-2xl border-2 border-[#2563eb] bg-[#2563eb] py-3 text-sm font-semibold text-white shadow-[0_18px_35px_rgba(37,99,235,0.35)] transition-all hover:-translate-y-[1px] hover:bg-[#1d4ed8] hover:border-[#1d4ed8] hover:shadow-[0_22px_45px_rgba(37,99,235,0.45)]"
                      disabled={loading}
                    >
                      {loading ? 'Cadastrando...' : (
                        <>
                          <Building2 className="w-4 h-4 mr-2" />
                          Cadastrar Empresa
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Links e termos */}
                  <div className="text-center space-y-4 pt-2">
                    <p className="text-sm text-slate-600">
                      Já tem uma conta?{' '}
                      <Link to="/login" className="text-[#2563eb] hover:text-[#1d4ed8] font-semibold transition-colors">
                        Fazer login
                      </Link>
                    </p>
                    
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Ao se cadastrar, você concorda com nossos{' '}
                      <a href="#" className="text-[#2563eb] hover:underline font-medium">
                        Termos de Uso
                      </a>{' '}
                      e{' '}
                      <a href="#" className="text-[#2563eb] hover:underline font-medium">
                        Política de Privacidade
                      </a>
                    </p>
                  </div>
                </CardContent>
              </Card>
            </form>
          </motion.div>
        </div>
      </div>
    </>
  );
};

export default CompanyRegister;
