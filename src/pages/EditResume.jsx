import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet';
import { Save, Plus, Trash2, FileText, User, GraduationCap, Briefcase, Award, Globe, Layers, Linkedin, Github } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/use-toast';
import { calculateAge } from '@/lib/utils';
import { resumesAPI, jobsAPI } from '@/lib/api';

const EditResume = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(null);
  // Taxonomy (áreas e sub-áreas)
  const [taxonomy, setTaxonomy] = useState({});
  const [areasList, setAreasList] = useState([]);
  const [subareasList, setSubareasList] = useState([]);

  useEffect(() => {
    const fetchResume = async () => {
      try {
        setLoading(true);
        const response = await resumesAPI.getById(id);
        
        if (response && response.resume) {
          const resume = response.resume;
          
          // Parse personal_info se for string
          let personalInfo = resume.personal_info;
          if (typeof personalInfo === 'string') {
            try {
              personalInfo = JSON.parse(personalInfo);
            } catch (e) {
              console.error('Erro ao parsear personal_info:', e);
              personalInfo = {};
            }
          }

            setFormData({
            id: resume.id,
            title: resume.title || 'Meu Currículo',
            template: resume.template || 'default',
            is_public: resume.is_public || false,
            personal_info: {
              name: personalInfo?.name || user?.name || '',
              birthDate: personalInfo?.birthDate || user?.birthDate || '',
              phone: personalInfo?.phone || user?.phone || '',
              email: personalInfo?.email || user?.email || '',
              photo: personalInfo?.photo || '',
              age: personalInfo?.age || (personalInfo?.birthDate ? calculateAge(personalInfo.birthDate) : ''),
                address: personalInfo?.address || user?.address || '',
                city: personalInfo?.city || user?.city || '',
              area: personalInfo?.area || '',
              subarea: personalInfo?.subarea || ''
            },
            experience: resume.experience || [],
            education: resume.education || '',
            skills: resume.skills || [],
            languages: resume.languages || [{ id: 1, language: 'Português', level: 'Nativo' }],
            projects: resume.projects || [],
            courses: resume.courses || []
          });
        } else {
          throw new Error('Currículo não encontrado');
        }
      } catch (error) {
        console.error('Erro ao carregar currículo:', error);
        toast({
          title: 'Erro',
          description: 'Currículo não encontrado.',
          variant: 'destructive',
        });
        navigate('/my-resumes');
      } finally {
        setLoading(false);
      }
    };

    if (id && user) {
      fetchResume();
    }
  }, [id, navigate, user]);
  
  // Carregar taxonomia e montar listas
  useEffect(() => {
    (async () => {
      try {
        const resp = await jobsAPI.getTaxonomy();
        const taxOriginal = resp?.taxonomy || {};
        const tax = { ...taxOriginal };
        const defaultSubareas = {
          direito: ['tributario','civil','trabalhista','penal','contratual','compliance','empresarial'],
          educacao: ['quimica','matematica','fisica','biologia','historia','geografia','artes','portugues','ingles','espanhol','pedagogia','ead'],
          tecnologia: ['backend','frontend','fullstack','mobile','devops','dados','qa','seguranca','cloud','produto'],
          design: ['ux','ui','produto','grafico','motion','web','branding'],
          marketing: ['seo','conteudo','social_media','performance','growth','branding','copywriting'],
          financas: ['contabilidade','fiscal','controladoria','tesouraria','planejamento','custos'],
          recursos_humanos: ['recrutamento','selecao','treinamento','folha','beneficios','cultura','desenvolvimento_organizacional'],
          logistica: ['estoque','distribuicao','transporte','supply_chain','almoxarifado','planejamento_logistico'],
          engenharia: ['mecanica','civil','eletrica','producao','qualidade','processos','manutencao'],
          vendas_marketing: ['inside_sales','field_sales','pre_vendas','pos_vendas','account_management','customer_success'],
          saude: ['enfermagem','medicina','farmacia','odontologia','psicologia','laboratorio','nutricao']
        };
        for (const [area, subs] of Object.entries(defaultSubareas)) {
          if (!tax[area]) tax[area] = subs;
        }
        setTaxonomy(tax);
        const humanize = (str='') => str.replace(/_/g,' ').toLowerCase().replace(/\b\w/g,c=>c.toUpperCase()).replace(/\b(De|Da|Do|E)\b/g,m=>m.toLowerCase());
        const AREA_LABELS = { saude:'Saúde', educacao:'Educação', engenharia:'Engenharia', administracao:'Administração', vendas_marketing:'Vendas / Marketing', recursos_humanos:'Recursos Humanos', financas:'Finanças', design:'Design', logistica:'Logística', producao:'Produção', mecanica:'Mecânica', automacao:'Automação', outros:'Outros', tecnologia:'Tecnologia', administrativo:'Administrativo', financeiro:'Financeiro', marketing:'Marketing', vendas:'Vendas', operacional:'Operacional', direito:'Direito' };
        const baseAreas = Object.keys(tax)
          .filter(k => k !== 'outros')
          .map(k => ({ value: k, label: AREA_LABELS[k] || humanize(k) }))
          .sort((a,b)=> a.label.localeCompare(b.label,'pt-BR'));
        setAreasList(baseAreas);
      } catch (e) {
        console.warn('Falha ao carregar taxonomia', e);
      }
    })();
  }, []);

  // Atualizar subáreas ao mudar área
  useEffect(() => {
    const humanize = (str='') => str.replace(/_/g,' ').toLowerCase().replace(/\b\w/g,c=>c.toUpperCase()).replace(/\b(De|Da|Do|E)\b/g,m=>m.toLowerCase());
    const currentArea = formData?.personal_info?.area;
    if (!currentArea) { setSubareasList([]); return; }
    const subs = Array.isArray(taxonomy[currentArea]) ? taxonomy[currentArea] : [];
    setSubareasList(subs.map(s => ({ value: s, label: humanize(s) })));
    // se subarea atual não pertence mais, resetar
    if (formData?.personal_info?.subarea && !subs.includes(formData.personal_info.subarea)) {
      setFormData(prev => ({ ...prev, personal_info: { ...prev.personal_info, subarea: '' } }));
    }
  }, [formData?.personal_info?.area, taxonomy]);
  

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const resumeData = {
        title: formData.title,
        template: formData.template,
        is_public: formData.is_public,
        personal_info: formData.personal_info,
        experience: formData.experience,
        education: formData.education,
        skills: formData.skills,
        languages: formData.languages,
        projects: formData.projects,
        courses: formData.courses
      };

      await resumesAPI.update(id, resumeData);

      toast({
        title: 'Currículo atualizado com sucesso!',
        description: 'As alterações no seu currículo foram salvas.'
      });

      navigate('/my-resumes');
    } catch (error) {
      console.error('Erro ao atualizar currículo:', error);
      toast({
        title: 'Erro ao atualizar currículo',
        description: error.message || 'Ocorreu um erro inesperado. Tente novamente.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Se for um campo do personal_info
    if (['name', 'birthDate', 'phone', 'email', 'photo', 'area', 'subarea', 'address', 'city'].includes(name)) {
      const updatedPersonalInfo = { ...formData.personal_info, [name]: value };
      if (name === 'birthDate') {
        updatedPersonalInfo.age = calculateAge(value);
      }
      setFormData({ ...formData, personal_info: updatedPersonalInfo });
    } else {
      // Para outros campos
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleArrayChange = (index, field, value, arrayName) => {
    const currentArray = formData[arrayName] || [];
    const newArray = [...currentArray];
    newArray[index] = { ...newArray[index], [field]: value };
    setFormData({ ...formData, [arrayName]: newArray });
  };

  const addArrayItem = (arrayName, defaultItem) => {
    setFormData({
      ...formData,
      [arrayName]: [...(formData[arrayName] || []), defaultItem]
    });
  };

  const removeArrayItem = (index, arrayName) => {
    const currentArray = formData[arrayName] || [];
    const newArray = currentArray.filter((_, i) => i !== index);
    setFormData({ ...formData, [arrayName]: newArray });
  };

  if (loading || !formData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/40 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-blue-100 border-2 border-blue-200 flex items-center justify-center">
            <FileText className="w-7 h-7 text-blue-500 animate-pulse" />
          </div>
          <p className="text-slate-600 font-medium">Carregando currículo...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Editar Currículo - CurrículoJá</title>
        <meta name="description" content="Edite seu currículo profissional." />
      </Helmet>

      <div className="min-h-screen py-8 px-4 bg-gradient-to-br from-slate-50 via-white to-blue-50/40">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-100 to-blue-200 border-2 border-blue-300 shadow-lg shadow-blue-100 mb-4">
                <FileText className="w-8 h-8 text-blue-600" />
              </div>
              <h1 className="text-3xl font-bold text-slate-900 mb-2">Editar <span className="text-blue-600">Currículo</span></h1>
              <p className="text-slate-500">Atualize as informações do seu currículo</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <Card className="rounded-[24px] border-[3px] border-blue-300 bg-white shadow-[0_18px_45px_rgba(37,99,235,0.1)]">
                <CardHeader className="border-b-[3px] border-blue-300 pb-4 bg-blue-50/70 rounded-t-[22px]">
                  <CardTitle className="flex items-center text-base font-semibold text-blue-900">
                    <div className="mr-3 w-10 h-10 rounded-xl bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center shadow-sm border-2 border-blue-300">
                      <User className="w-5 h-5 text-blue-600 stroke-[2.5]" />
                    </div>
                    Informações Pessoais
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-5 space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="name" className="text-sm font-medium text-slate-700">Nome Completo <span className="text-red-500">*</span></Label>
                      <Input id="name" name="name" value={formData.personal_info?.name || ''} onChange={handleChange} required className="h-11 rounded-xl border-2 border-slate-200 focus:border-blue-300 bg-white" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="birthDate" className="text-sm font-medium text-slate-700">Data de Nascimento <span className="text-red-500">*</span></Label>
                      <div className="flex items-center gap-2">
                        <Input id="birthDate" name="birthDate" type="date" value={formData.personal_info?.birthDate || ''} onChange={handleChange} required className="h-11 rounded-xl border-2 border-slate-200 focus:border-blue-300 bg-white flex-1" />
                        {formData.personal_info?.age && <span className="text-sm text-slate-500 font-medium whitespace-nowrap">({formData.personal_info.age} anos)</span>}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="phone" className="text-sm font-medium text-slate-700">WhatsApp/Telefone <span className="text-red-500">*</span></Label>
                      <Input id="phone" name="phone" value={formData.personal_info?.phone || ''} onChange={handleChange} required className="h-11 rounded-xl border-2 border-slate-200 focus:border-blue-300 bg-white" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="email" className="text-sm font-medium text-slate-700">Email <span className="text-red-500">*</span></Label>
                      <Input id="email" name="email" type="email" value={formData.personal_info?.email || ''} onChange={handleChange} required className="h-11 rounded-xl border-2 border-slate-200 focus:border-blue-300 bg-white" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="photo" className="text-sm font-medium text-slate-700">URL da Foto <span className="text-slate-400 font-normal">(opcional)</span></Label>
                    <Input id="photo" name="photo" value={formData.personal_info?.photo || ''} onChange={handleChange} placeholder="https://exemplo.com/sua-foto.jpg" className="h-11 rounded-xl border-2 border-slate-200 focus:border-blue-300 bg-white" />
                  </div>
                </CardContent>
              </Card>

              {/* Área de Atuação */}
              <Card className="rounded-[24px] border-[3px] border-indigo-300 bg-white shadow-[0_18px_45px_rgba(99,102,241,0.1)]">
                <CardHeader className="border-b-[3px] border-indigo-300 pb-4 bg-indigo-50/70 rounded-t-[22px]">
                  <CardTitle className="flex items-center text-base font-semibold text-indigo-900">
                    <div className="mr-3 w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-100 to-indigo-200 flex items-center justify-center shadow-sm border-2 border-indigo-300">
                      <Layers className="w-5 h-5 text-indigo-600 stroke-[2.5]" />
                    </div>
                    Área de Atuação
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-5">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="area" className="text-sm font-medium text-slate-700">Área</Label>
                      <select
                        id="area"
                        name="area"
                        value={formData.personal_info?.area || ''}
                        onChange={handleChange}
                        className="w-full h-11 px-3 rounded-xl border-2 border-slate-200 bg-white focus:border-indigo-300 focus:outline-none text-sm text-slate-700"
                      >
                        <option value="">Selecione...</option>
                        {areasList.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="subarea" className="text-sm font-medium text-slate-700">Sub-área</Label>
                      <select
                        id="subarea"
                        name="subarea"
                        value={formData.personal_info?.subarea || ''}
                        onChange={handleChange}
                        disabled={!formData.personal_info?.area}
                        className="w-full h-11 px-3 rounded-xl border-2 border-slate-200 bg-white focus:border-indigo-300 focus:outline-none text-sm text-slate-700 disabled:bg-slate-50 disabled:text-slate-400"
                      >
                        <option value="">{formData.personal_info?.area ? 'Selecione...' : 'Escolha uma área primeiro'}</option>
                        {subareasList.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="address" className="text-sm font-medium text-slate-700">Endereço</Label>
                      <Input id="address" name="address" value={formData.personal_info?.address || ''} onChange={handleChange} placeholder="Rua, número, complemento" className="h-11 rounded-xl border-2 border-slate-200 focus:border-indigo-300 bg-white" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="city" className="text-sm font-medium text-slate-700">Cidade</Label>
                      <Input id="city" name="city" value={formData.personal_info?.city || ''} onChange={handleChange} placeholder="Cidade / Estado" className="h-11 rounded-xl border-2 border-slate-200 focus:border-indigo-300 bg-white" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="linkedin_url" className="text-sm font-medium text-slate-700 flex items-center gap-1.5"><Linkedin className="w-3.5 h-3.5 text-blue-600" />LinkedIn</Label>
                      <Input id="linkedin_url" name="linkedin_url" value={formData.personal_info?.linkedin_url || ''} onChange={handleChange} placeholder="linkedin.com/in/seu-perfil" className="h-11 rounded-xl border-2 border-slate-200 focus:border-blue-300 bg-white" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="github_url" className="text-sm font-medium text-slate-700 flex items-center gap-1.5"><Github className="w-3.5 h-3.5 text-slate-700" />GitHub</Label>
                      <Input id="github_url" name="github_url" value={formData.personal_info?.github_url || ''} onChange={handleChange} placeholder="github.com/seu-usuario" className="h-11 rounded-xl border-2 border-slate-200 focus:border-slate-400 bg-white" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="custom_url" className="text-sm font-medium text-slate-700 flex items-center gap-1.5"><Globe className="w-3.5 h-3.5 text-emerald-600" />Portfólio</Label>
                      <Input id="custom_url" name="custom_url" value={formData.personal_info?.custom_url || ''} onChange={handleChange} placeholder="seu-portfolio.com" className="h-11 rounded-xl border-2 border-slate-200 focus:border-emerald-300 bg-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-[24px] border-[3px] border-emerald-300 bg-white shadow-[0_18px_45px_rgba(16,185,129,0.1)]">
                <CardHeader className="border-b-[3px] border-emerald-300 pb-4 bg-emerald-50/70 rounded-t-[22px]">
                  <CardTitle className="flex items-center text-base font-semibold text-emerald-900">
                    <div className="mr-3 w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-100 to-emerald-200 flex items-center justify-center shadow-sm border-2 border-emerald-300">
                      <GraduationCap className="w-5 h-5 text-emerald-600 stroke-[2.5]" />
                    </div>
                    Formação <span className="text-red-500 ml-1">*</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-5">
                  <Textarea name="education" value={formData.education} onChange={handleChange} placeholder="Descreva sua formação acadêmica..." rows={4} required className="rounded-xl border-2 border-slate-200 focus:border-emerald-300 resize-none bg-white" />
                </CardContent>
              </Card>

              <Card className="rounded-[24px] border-[3px] border-violet-300 bg-white shadow-[0_18px_45px_rgba(139,92,246,0.1)]">
                <CardHeader className="border-b-[3px] border-violet-300 pb-4 bg-violet-50/70 rounded-t-[22px]">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center text-base font-semibold text-violet-900">
                      <div className="mr-3 w-10 h-10 rounded-xl bg-gradient-to-br from-violet-100 to-violet-200 flex items-center justify-center shadow-sm border-2 border-violet-300">
                        <Briefcase className="w-5 h-5 text-violet-600 stroke-[2.5]" />
                      </div>
                      Experiência Profissional <span className="text-red-500 ml-1">*</span>
                    </CardTitle>
                    <Button type="button" onClick={() => addArrayItem('experience', { id: Date.now(), company: '', position: '', period: '', description: '' })} size="sm" className="rounded-full border-2 border-violet-200 bg-white text-xs font-bold text-violet-600 hover:border-violet-400 hover:bg-violet-500 hover:text-white transition-all duration-200 h-8 px-3">
                      <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-5 space-y-4">
                  {formData.experience && formData.experience.map((exp, index) => (
                    <div key={exp.id || index} className="rounded-2xl border-2 border-violet-100 bg-violet-50/30 p-4 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-semibold text-violet-800">Experiência {index + 1}</span>
                        {formData.experience && formData.experience.length > 1 && (
                          <button type="button" onClick={() => removeArrayItem(index, 'experience')} className="w-7 h-7 rounded-full border-2 border-red-200 bg-white flex items-center justify-center text-red-400 hover:bg-red-500 hover:border-red-500 hover:text-white transition-all duration-200">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <div className="grid md:grid-cols-2 gap-3">
                        <Input placeholder="Empresa" value={exp.company} onChange={(e) => handleArrayChange(index, 'company', e.target.value, 'experience')} required className="h-10 rounded-xl border-2 border-slate-200 focus:border-violet-300 bg-white" />
                        <Input placeholder="Cargo" value={exp.position} onChange={(e) => handleArrayChange(index, 'position', e.target.value, 'experience')} required className="h-10 rounded-xl border-2 border-slate-200 focus:border-violet-300 bg-white" />
                      </div>
                      <Input placeholder="Período (ex: Jan 2020 - Dez 2022)" value={exp.period} onChange={(e) => handleArrayChange(index, 'period', e.target.value, 'experience')} required className="h-10 rounded-xl border-2 border-slate-200 focus:border-violet-300 bg-white" />
                      <Textarea placeholder="Descrição das atividades..." value={exp.description} onChange={(e) => handleArrayChange(index, 'description', e.target.value, 'experience')} rows={3} required className="rounded-xl border-2 border-slate-200 focus:border-violet-300 bg-white resize-none" />
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="rounded-[24px] border-[3px] border-amber-300 bg-white shadow-[0_18px_45px_rgba(245,158,11,0.1)]">
                <CardHeader className="border-b-[3px] border-amber-300 pb-4 bg-amber-50/70 rounded-t-[22px]">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center text-base font-semibold text-amber-900">
                      <div className="mr-3 w-10 h-10 rounded-xl bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center shadow-sm border-2 border-amber-300">
                        <Award className="w-5 h-5 text-amber-600 stroke-[2.5]" />
                      </div>
                      Cursos <span className="text-slate-400 font-normal text-sm ml-1">(opcional)</span>
                    </CardTitle>
                    <Button type="button" onClick={() => addArrayItem('courses', { id: Date.now(), name: '', institution: '', year: '' })} size="sm" className="rounded-full border-2 border-amber-200 bg-white text-xs font-bold text-amber-600 hover:border-amber-400 hover:bg-amber-500 hover:text-white transition-all duration-200 h-8 px-3">
                      <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-5 space-y-4">
                  {formData.courses && formData.courses.map((course, index) => (
                    <div key={course.id || index} className="rounded-2xl border-2 border-amber-100 bg-amber-50/30 p-4 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-semibold text-amber-800">Curso {index + 1}</span>
                        <button type="button" onClick={() => removeArrayItem(index, 'courses')} className="w-7 h-7 rounded-full border-2 border-red-200 bg-white flex items-center justify-center text-red-400 hover:bg-red-500 hover:border-red-500 hover:text-white transition-all duration-200">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="grid md:grid-cols-2 gap-3">
                        <Input placeholder="Nome do curso" value={course.name} onChange={(e) => handleArrayChange(index, 'name', e.target.value, 'courses')} className="h-10 rounded-xl border-2 border-slate-200 focus:border-amber-300 bg-white" />
                        <Input placeholder="Instituição" value={course.institution} onChange={(e) => handleArrayChange(index, 'institution', e.target.value, 'courses')} className="h-10 rounded-xl border-2 border-slate-200 focus:border-amber-300 bg-white" />
                      </div>
                      <Input placeholder="Ano" value={course.year} onChange={(e) => handleArrayChange(index, 'year', e.target.value, 'courses')} className="h-10 rounded-xl border-2 border-slate-200 focus:border-amber-300 bg-white md:w-36" />
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="rounded-[24px] border-[3px] border-teal-300 bg-white shadow-[0_18px_45px_rgba(20,184,166,0.1)]">
                <CardHeader className="border-b-[3px] border-teal-300 pb-4 bg-teal-50/70 rounded-t-[22px]">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center text-base font-semibold text-teal-900">
                      <div className="mr-3 w-10 h-10 rounded-xl bg-gradient-to-br from-teal-100 to-teal-200 flex items-center justify-center shadow-sm border-2 border-teal-300">
                        <Globe className="w-5 h-5 text-teal-600 stroke-[2.5]" />
                      </div>
                      Idiomas <span className="text-red-500 ml-1">*</span>
                    </CardTitle>
                    <Button type="button" onClick={() => addArrayItem('languages', { id: Date.now(), language: '', level: '' })} size="sm" className="rounded-full border-2 border-teal-200 bg-white text-xs font-bold text-teal-600 hover:border-teal-400 hover:bg-teal-500 hover:text-white transition-all duration-200 h-8 px-3">
                      <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-5 space-y-4">
                  {formData.languages && formData.languages.map((lang, index) => (
                    <div key={lang.id || index} className="rounded-2xl border-2 border-teal-100 bg-teal-50/30 p-4 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-semibold text-teal-800">Idioma {index + 1}</span>
                        {formData.languages.length > 1 && (
                          <button type="button" onClick={() => removeArrayItem(index, 'languages')} className="w-7 h-7 rounded-full border-2 border-red-200 bg-white flex items-center justify-center text-red-400 hover:bg-red-500 hover:border-red-500 hover:text-white transition-all duration-200">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <div className="grid md:grid-cols-2 gap-3">
                        <Input placeholder="Idioma" value={lang.language} onChange={(e) => handleArrayChange(index, 'language', e.target.value, 'languages')} required className="h-10 rounded-xl border-2 border-slate-200 focus:border-teal-300 bg-white" />
                        <Input placeholder="Nível (ex: Básico, Intermediário, Avançado)" value={lang.level} onChange={(e) => handleArrayChange(index, 'level', e.target.value, 'languages')} required className="h-10 rounded-xl border-2 border-slate-200 focus:border-teal-300 bg-white" />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <div className="flex justify-center pb-4">
                <Button type="submit" disabled={loading} className="rounded-full border-2 border-blue-300 bg-blue-600 text-white font-bold text-sm px-10 h-12 shadow-lg shadow-blue-200 hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-200 transition-all duration-300 disabled:opacity-60">
                  {loading ? (
                    <span className="flex items-center gap-2"><Save className="w-4 h-4 animate-spin" /> Salvando...</span>
                  ) : (
                    <span className="flex items-center gap-2"><Save className="w-4 h-4" /> Salvar Alterações</span>
                  )}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      </div>
    </>
  );
};

export default EditResume;