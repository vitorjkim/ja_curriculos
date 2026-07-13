import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet';
import { Save, Briefcase, MapPin, Type as TypeIcon, Tags, FileText, ListChecks, Wallet, ArrowDown01, ArrowUp10, BadgeDollarSign, FileSignature, Sparkles, MonitorSmartphone, Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RichTextarea } from '@/components/ui/rich-textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { Select } from '@/components/ui/select';
import { jobs as jobsAPI } from '@/lib/api';

// Labels amigáveis para áreas conhecidas + helper
const AREA_LABELS = { saude:'Saúde', educacao:'Educação', engenharia:'Engenharia', administracao:'Administração', vendas_marketing:'Vendas / Marketing', recursos_humanos:'Recursos Humanos', financas:'Finanças', design:'Design', logistica:'Logística', producao:'Produção', mecanica:'Mecânica', automacao:'Automação', outros:'Outros', tecnologia:'Tecnologia', administrativo:'Administrativo', financeiro:'Financeiro', marketing:'Marketing', vendas:'Vendas', operacional:'Operacional' };
const humanize = (str='') => str.replace(/_/g,' ').toLowerCase().replace(/\b\w/g,c=>c.toUpperCase()).replace(/\b(De|Da|Do|E)\b/g,m=>m.toLowerCase());

// DEV: listas de teste
const _TITULOS = ['Desenvolvedor Frontend Júnior','Analista de Marketing Digital','Auxiliar Administrativo','Designer UX/UI Pleno','Assistente de RH','Analista de Dados Sênior','Suporte Técnico N1','Desenvolvedor Backend Node.js','Coordenador de Logística','Analista Financeiro'];
const _CIDADES_J = ['São Paulo, SP','Rio de Janeiro, RJ','Curitiba, PR','Belo Horizonte, MG','Recife, PE','Fortaleza, CE','Brasília, DF','Porto Alegre, RS'];
const _BENEFICIOS = ['Vale Refeição','Vale Transporte','Plano de Saúde','Plano Odontológico','Gympass','Home Office parcial','Bonificação semestral','Day Off no aniversário'];
const _REQS = ['Conhecimentos em pacote Office','Experiência de [N] anos na área','Ensino Superior completo ou em andamento','Boa comunicação e trabalho em equipe','Proatividade e organização','Inglês intermediário'];
const _pick = arr => arr[Math.floor(Math.random()*arr.length)];
const _randInt = (min,max) => Math.floor(Math.random()*(max-min+1))+min;

const CreateJob = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [taxonomy, setTaxonomy] = useState({});
  const [areaOptions, setAreaOptions] = useState([]); // [{value:key,label}]
  const [subareaOptions, setSubareaOptions] = useState([]); // [{value:key,label}]
  const [salaryMode, setSalaryMode] = useState('range'); // 'range' | 'fixed'
  const descriptionRef = useRef(null);
  const requirementsRef = useRef(null);
  const benefitsRef = useRef(null);
  const [refsReady, setRefsReady] = useState(false);

  // DEV: preencher com dados aleatórios
  const fillRandom = () => {
    const titulo = _pick(_TITULOS);
    const min = _randInt(1500,3500);
    const max = min + _randInt(500,2000);
    const bens = [..._BENEFICIOS].sort(()=>Math.random()-0.5).slice(0,_randInt(3,5));
    const reqs = [..._REQS].sort(()=>Math.random()-0.5).slice(0,_randInt(3,5));
    setFormData(prev => ({
      ...prev,
      title: titulo,
      description: `Estamos buscando um profissional para atuar como ${titulo}. O candidato irá trabalhar em projetos inovadores, colaborando com equipes multidisciplinares para atingir os objetivos da empresa. Oferecemos um ambiente dinâmico e oportunidades de crescimento.`,
      requirements: reqs.map(r=>r.replace('[N]',String(_randInt(1,4)))).join('\n'),
      location: _pick(_CIDADES_J),
      salary_min: String(min),
      salary_max: String(max),
      salary_fixed: '',
      contract_type: _pick(['clt','pj','estagio','freelancer']),
      benefits: bens.join('\n'),
      area: 'tecnologia',
      subarea: 'frontend',
      is_first_job: Math.random() > 0.7,
      work_type: _pick(['presencial','remoto','hibrido']),
      experience_level: _pick(['junior','pleno','senior','estagio'])
    }));
  };

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    requirements: '',
    location: '',
    salary_min: '',
    salary_max: '',
    salary_fixed: '',
    contract_type: 'clt',
    benefits: '',
    area: '', // chave interna da área (ex: 'saude')
    subarea: '', // chave interna da subárea (ex: 'enfermagem')
    is_first_job: false,
    work_type: 'presencial',
    experience_level: 'junior'
  });

  // Forçar re-render quando refs estiverem prontos
  useEffect(() => {
    const timer = setTimeout(() => setRefsReady(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Verificar restrições de plano (após auth carregar)
  useEffect(() => {
    const checkPlanRestrictions = async () => {
      if (loading) return;

      if (!user || user.type !== 'company') {
        navigate('/company-login');
        return;
      }
    };

    checkPlanRestrictions();
  }, [user, loading, navigate]);

  // Carregar taxonomia do backend e preencher opções de área
  useEffect(() => { (async()=>{
    try {
      const resp = await jobsAPI.getTaxonomy();
      const tax = resp?.taxonomy || {};
      setTaxonomy(tax);
      const areas = Object.keys(tax).map(k => ({ value: k, label: AREA_LABELS[k] || humanize(k) }))
        .sort((a,b)=> a.label.localeCompare(b.label,'pt-BR'));
      setAreaOptions(areas);
    } catch (e) {
      console.error('Falha ao carregar taxonomia de vagas', e);
    }
  })(); }, []);

  // Atualizar opções de subárea quando área mudar
  useEffect(() => {
    if (!formData.area) { setSubareaOptions([]); setFormData(prev=>({...prev, subarea:''})); return; }
    const subs = Array.isArray(taxonomy[formData.area]) ? taxonomy[formData.area] : [];
    const opts = subs.map(s => ({ value: s, label: humanize(s) }))
      .sort((a,b)=> a.label.localeCompare(b.label,'pt-BR'));
    setSubareaOptions(opts);
    // reset se subarea atual não existir mais
    if (formData.subarea && !subs.includes(formData.subarea)) {
      setFormData(prev=>({...prev, subarea:''}));
    }
  }, [formData.area, taxonomy]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Sistema de planos removido - sem limites de vagas
    
    setSubmitting(true);

    try {
      // Enviar chaves internas diretamente (backend valida pela taxonomia)
      const payload = { ...formData };
      if (!payload.area) throw new Error('Área é obrigatória');
      // Mapear salário conforme modo: se fixo, replicar no min/max
      if (salaryMode === 'fixed') {
        if (!payload.salary_fixed) throw new Error('Informe o salário fixo');
        payload.salary_min = payload.salary_fixed;
        payload.salary_max = payload.salary_fixed;
      }
      delete payload.salary_fixed; // não existe no backend
      if (!payload.subarea) delete payload.subarea; // opcional
      const response = await jobsAPI.create(payload);
      
      toast({
        title: 'Vaga criada com sucesso!',
        description: 'Sua vaga foi publicada e está disponível para candidatos.'
      });

      navigate('/my-jobs');
    } catch (error) {
      console.error('Erro ao criar vaga:', error);
      
      // Fallback para localStorage se API falhar
      try {
        const job = {
          id: Date.now().toString(),
          companyId: user.id,
          companyName: user.companyName,
          ...formData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          status: 'active'
        };

        const jobs = JSON.parse(localStorage.getItem('curriculoja_jobs') || '[]');
        jobs.push(job);
        localStorage.setItem('curriculoja_jobs', JSON.stringify(jobs));

        toast({
          title: 'Vaga criada com sucesso!',
          description: 'Sua vaga foi salva localmente e está disponível.'
        });

        navigate('/my-jobs');
      } catch (fallbackError) {
        toast({
          title: 'Erro ao criar vaga',
          description: 'Ocorreu um erro inesperado. Tente novamente.',
          variant: 'destructive'
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  // Mudança de área reseta subárea
  const handleAreaChange = (e) => {
    const areaKey = e.target.value;
    setFormData(prev => ({ ...prev, area: areaKey, subarea: '' }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="p-6 text-center">
            <p>Carregando autenticação...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user || user.type !== 'company') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="p-6 text-center">
            <p>Acesso restrito a empresas.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Criar Vaga - CurrículoJá</title>
        <meta name="description" content="Crie uma nova vaga de emprego e encontre os melhores candidatos." />
      </Helmet>

      <div className="min-h-screen bg-slate-50/80 py-10 px-4">
        <div className="mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="mb-8 flex flex-col items-start justify-between gap-6 rounded-[24px] border-2 border-slate-200 bg-white/90 px-8 py-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)] backdrop-blur-sm md:flex-row md:items-center">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Gestão de Vagas</p>
                <h1 className="mb-1 text-3xl font-bold tracking-tight md:text-4xl">
                  <span className="text-slate-900">Criar Nova </span>
                  <span className="text-[#2563eb]">Vaga</span>
                </h1>
                <p className="text-sm text-slate-500">
                  Publique uma nova oportunidade e encontre candidatos qualificados
                </p>
              </div>
            </div>

            <div className="flex justify-center mb-4">
              <button
                type="button"
                onClick={fillRandom}
                className="px-4 py-2 rounded-xl border-2 border-amber-300 bg-amber-100 text-amber-800 font-semibold text-sm hover:bg-amber-200 transition-colors shadow-sm"
              >
                🎲 Preencher com dados aleatórios
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              <Card className="rounded-[24px] border-2 border-slate-200 bg-white/95 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
                <CardHeader className="pb-4">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-600">
                        <Briefcase className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-lg font-semibold text-slate-900">
                          Informações da Vaga
                        </CardTitle>
                        <p className="text-xs text-slate-500">Campos essenciais para publicar sua oportunidade</p>
                      </div>
                    </div>

                    {/* Removed section chips as requested */}
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <div className="inline-flex items-center gap-2 rounded-full border border-sky-100 bg-sky-50/60 px-4 py-1.5 text-[13px] font-medium text-sky-700">
                        <TypeIcon className="h-4 w-4" />
                        <Label htmlFor="title" className="cursor-pointer">
                          Título da Vaga <span className="required-star">*</span>
                        </Label>
                      </div>
                      <Input
                        id="title"
                        name="title"
                        value={formData.title}
                        onChange={handleChange}
                        placeholder="Ex: Desenvolvedor Frontend"
                        required
                        className="h-10 rounded-2xl border-slate-200 bg-slate-50/60 text-sm placeholder:text-slate-400 focus-visible:border-sky-400 focus-visible:ring-sky-400"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <div className="inline-flex items-center gap-2 rounded-full border border-sky-100 bg-sky-50/60 px-4 py-1.5 text-[13px] font-medium text-sky-700">
                        <MapPin className="h-4 w-4" />
                        <Label htmlFor="location" className="cursor-pointer">
                          Localização <span className="required-star">*</span>
                        </Label>
                      </div>
                      <Input
                        id="location"
                        name="location"
                        value={formData.location}
                        onChange={handleChange}
                        placeholder="Ex: São Paulo, SP"
                        required
                        className="h-10 rounded-2xl border-slate-200 bg-slate-50/60 text-sm placeholder:text-slate-400 focus-visible:border-sky-400 focus-visible:ring-sky-400"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <div className="inline-flex items-center gap-2 rounded-full border border-cyan-100 bg-cyan-50/60 px-4 py-1.5 text-[13px] font-medium text-cyan-700">
                        <Tags className="h-4 w-4" />
                        <Label htmlFor="area" className="cursor-pointer">
                          Área <span className="required-star">*</span>
                        </Label>
                      </div>
                      <Select
                        id="area"
                        name="area"
                        value={formData.area}
                        onChange={handleAreaChange}
                        required
                        className="h-11 rounded-2xl border-slate-200 bg-slate-50/60 text-sm focus-visible:border-cyan-400 focus-visible:ring-cyan-400 leading-normal"
                      >
                        <option value="">-- Selecione --</option>
                        {areaOptions.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <div className="inline-flex items-center gap-2 rounded-full border border-teal-100 bg-teal-50/60 px-4 py-1.5 text-[13px] font-medium text-teal-700">
                        <Sparkles className="h-4 w-4" />
                        <Label htmlFor="subarea" className="cursor-pointer">
                          Sub-área
                        </Label>
                      </div>
                      <Select
                        id="subarea"
                        name="subarea"
                        value={formData.subarea}
                        onChange={handleChange}
                        disabled={subareaOptions.length === 0}
                        className="h-11 rounded-2xl border-slate-200 bg-slate-50/60 text-sm disabled:bg-slate-100 disabled:text-slate-400 focus-visible:border-cyan-400 focus-visible:ring-cyan-400 leading-normal"
                      >
                        <option value="">-- Selecione --</option>
                        {subareaOptions.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </Select>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-sky-50/70 px-4 py-3 text-xs text-sky-800">
                    Selecione a área e a sub-área para classificar sua vaga corretamente.
                  </div>

                    <div className="space-y-1.5 pt-2">
                    <div className="flex items-center justify-between">
                      <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50/60 px-4 py-1.5 text-[13px] font-medium text-indigo-700">
                        <FileText className="h-4 w-4" />
                        <Label htmlFor="description" className="cursor-pointer">
                          Descrição da Vaga <span className="required-star">*</span>
                        </Label>
                      </div>
                      {descriptionRef.current?.FormatButton && descriptionRef.current.FormatButton()}
                    </div>
                    <RichTextarea
                      ref={descriptionRef}
                      id="description"
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      placeholder="Descreva as responsabilidades e atividades da vaga..."
                      rows={4}
                      required
                      className="min-h-[96px] rounded-2xl border-slate-200 bg-slate-50/60 text-sm placeholder:text-slate-400 focus-visible:border-indigo-400 focus-visible:ring-indigo-400"
                    />
                  </div>

                  <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between">
                      <div className="inline-flex items-center gap-2 rounded-full border border-rose-100 bg-rose-50/60 px-4 py-1.5 text-[13px] font-medium text-rose-700">
                        <ListChecks className="h-4 w-4" />
                        <Label htmlFor="requirements" className="cursor-pointer">
                          Requisitos <span className="required-star">*</span>
                        </Label>
                      </div>
                      {requirementsRef.current?.FormatButton && requirementsRef.current.FormatButton()}
                    </div>
                    <RichTextarea
                      ref={requirementsRef}
                      id="requirements"
                      name="requirements"
                      value={formData.requirements}
                      onChange={handleChange}
                      placeholder="Liste os requisitos necessários para a vaga..."
                      rows={4}
                      required
                      className="min-h-[96px] rounded-2xl border-slate-200 bg-slate-50/60 text-sm placeholder:text-slate-400 focus-visible:border-rose-400 focus-visible:ring-rose-400"
                    />
                    <div className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50/60 px-4 py-1.5 text-[13px] font-medium text-emerald-700">
                      <Checkbox
                        id="is_first_job"
                        name="is_first_job"
                        checked={formData.is_first_job}
                        onCheckedChange={checked => setFormData({ ...formData, is_first_job: checked })}
                        className="h-3.5 w-3.5 rounded-[6px] border-emerald-400 data-[state=checked]:bg-emerald-500"
                      />
                      <span>Aceita primeiro emprego</span>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-1.5 md:col-span-1">
                      <div className="inline-flex items-center gap-2 rounded-full border border-amber-100 bg-amber-50/60 px-4 py-1.5 text-[13px] font-medium text-amber-700">
                        <Wallet className="h-4 w-4" />
                        <Label htmlFor="salary_mode" className="cursor-pointer">
                          Tipo de Salário
                        </Label>
                      </div>
                      <Select
                        id="salary_mode"
                        name="salary_mode"
                        value={salaryMode}
                        onChange={e => setSalaryMode(e.target.value)}
                        className="h-11 rounded-2xl border-slate-200 bg-slate-50/60 text-sm focus-visible:border-amber-400 focus-visible:ring-amber-400 leading-normal"
                      >
                        <option value="range">Faixa (mínimo e máximo)</option>
                        <option value="fixed">Fixo (um valor)</option>
                      </Select>
                    </div>

                    {salaryMode === 'range' ? (
                      <>
                        <div className="space-y-1.5">
                          <div className="inline-flex items-center gap-2 rounded-full border border-amber-100 bg-amber-50/60 px-4 py-1.5 text-[13px] font-medium text-amber-700">
                            <ArrowDown01 className="h-4 w-4" />
                            <Label htmlFor="salary_min" className="cursor-pointer">
                              Salário Mínimo
                            </Label>
                          </div>
                          <Input
                            id="salary_min"
                            name="salary_min"
                            type="number"
                            value={formData.salary_min}
                            onChange={handleChange}
                            placeholder="Ex: 3000"
                            className="h-11 rounded-2xl border-slate-200 bg-slate-50/60 text-sm placeholder:text-slate-400 focus-visible:border-amber-400 focus-visible:ring-amber-400"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <div className="inline-flex items-center gap-2 rounded-full border border-amber-100 bg-amber-50/60 px-4 py-1.5 text-[13px] font-medium text-amber-700">
                            <ArrowUp10 className="h-4 w-4" />
                            <Label htmlFor="salary_max" className="cursor-pointer">
                              Salário Máximo
                            </Label>
                          </div>
                          <Input
                            id="salary_max"
                            name="salary_max"
                            type="number"
                            value={formData.salary_max}
                            onChange={handleChange}
                            placeholder="Ex: 5000"
                            className="h-11 rounded-2xl border-slate-200 bg-slate-50/60 text-sm placeholder:text-slate-400 focus-visible:border-amber-400 focus-visible:ring-amber-400"
                          />
                        </div>
                      </>
                    ) : (
                      <div className="space-y-1.5 md:col-span-2">
                        <div className="inline-flex items-center gap-2 rounded-full border border-amber-100 bg-amber-50/60 px-4 py-1.5 text-[13px] font-medium text-amber-700">
                          <BadgeDollarSign className="h-4 w-4" />
                          <Label htmlFor="salary_fixed" className="cursor-pointer">
                            Salário Fixo
                          </Label>
                        </div>
                        <Input
                          id="salary_fixed"
                          name="salary_fixed"
                          type="number"
                          value={formData.salary_fixed}
                          onChange={handleChange}
                          placeholder="Ex: 4000"
                          className="h-11 rounded-2xl border-slate-200 bg-slate-50/60 text-sm placeholder:text-slate-400 focus-visible:border-amber-400 focus-visible:ring-amber-400"
                        />
                      </div>
                    )}
                  </div>

                  {salaryMode === 'range' && formData.salary_min !== '' && formData.salary_max !== '' && Number(formData.salary_min) === Number(formData.salary_max) && (
                    <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-2xl px-3 py-2 inline-flex items-center gap-2">
                      <span>Os valores mínimo e máximo são iguais. Se preferir, selecione "Fixo (um valor)" para informar um valor único.</span>
                      <button
                        type="button"
                        className="rounded-full bg-amber-600 px-3 py-1 text-[11px] font-semibold text-white hover:bg-amber-700"
                        onClick={() => {
                          setSalaryMode('fixed');
                          setFormData(prev => ({ ...prev, salary_fixed: prev.salary_min || prev.salary_max || '' }));
                        }}
                      >
                        Converter para fixo
                      </button>
                    </div>
                  )}

                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-1.5">
                      <div className="inline-flex items-center gap-2 rounded-full border border-violet-100 bg-violet-50/60 px-4 py-1.5 text-[13px] font-medium text-violet-700">
                        <FileSignature className="h-4 w-4" />
                        <Label htmlFor="contract_type" className="cursor-pointer">
                          Tipo de Contrato <span className="required-star">*</span>
                        </Label>
                      </div>
                      <Select
                        id="contract_type"
                        name="contract_type"
                        value={formData.contract_type}
                        onChange={handleChange}
                        required
                        className="h-11 rounded-2xl border-slate-200 bg-slate-50/60 text-sm focus-visible:border-violet-400 focus-visible:ring-violet-400 leading-normal"
                      >
                        <option value="clt">CLT</option>
                        <option value="pj">PJ</option>
                        <option value="estagio">Estágio</option>
                        <option value="temporario">Temporário</option>
                        <option value="freelancer">Freelancer</option>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <div className="inline-flex items-center gap-2 rounded-full border border-violet-100 bg-violet-50/60 px-4 py-1.5 text-[13px] font-medium text-violet-700">
                        <Sparkles className="h-4 w-4" />
                        <Label htmlFor="experience_level" className="cursor-pointer">
                          Nível de Experiência <span className="required-star">*</span>
                        </Label>
                      </div>
                      <Select
                        id="experience_level"
                        name="experience_level"
                        value={formData.experience_level}
                        onChange={handleChange}
                        required
                        className="h-11 rounded-2xl border-slate-200 bg-slate-50/60 text-sm focus-visible:border-violet-400 focus-visible:ring-violet-400 leading-normal"
                      >
                        <option value="estagio">Estágio</option>
                        <option value="junior">Júnior</option>
                        <option value="pleno">Pleno</option>
                        <option value="senior">Sênior</option>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <div className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50/60 px-4 py-1.5 text-[13px] font-medium text-emerald-700">
                        <MonitorSmartphone className="h-4 w-4" />
                        <Label htmlFor="work_type" className="cursor-pointer">
                          Modalidade <span className="required-star">*</span>
                        </Label>
                      </div>
                      <Select
                        id="work_type"
                        name="work_type"
                        value={formData.work_type}
                        onChange={handleChange}
                        required
                        className="h-11 rounded-2xl border-slate-200 bg-slate-50/60 text-sm focus-visible:border-emerald-400 focus-visible:ring-emerald-400 leading-normal"
                      >
                        <option value="presencial">Presencial</option>
                        <option value="hibrido">Híbrido</option>
                        <option value="remoto">Remoto</option>
                      </Select>
                    </div>
                  </div>

                    <div className="space-y-1.5 pt-2">
                    <div className="flex items-center justify-between">
                      <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-1.5 text-[13px] font-medium text-slate-700">
                        <Gift className="h-4 w-4" />
                        <Label htmlFor="benefits" className="cursor-pointer">
                          Benefícios (opcional)
                        </Label>
                      </div>
                      {benefitsRef.current?.FormatButton && benefitsRef.current.FormatButton()}
                    </div>
                    <RichTextarea
                      ref={benefitsRef}
                      id="benefits"
                      name="benefits"
                      value={formData.benefits}
                      onChange={handleChange}
                      placeholder="Ex: Vale refeição, plano de saúde..."
                      rows={3}
                      className="rounded-2xl border-slate-200 bg-slate-50/60 text-sm placeholder:text-slate-400 focus-visible:border-slate-400 focus-visible:ring-slate-400 resize-y"
                    />
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-center">
                <Button
                  type="submit"
                  className="rounded-full border-2 border-[#2563eb] bg-[#2563eb] px-8 py-3 text-sm font-semibold text-white shadow-[0_18px_35px_rgba(37,99,235,0.35)] transition-all hover:-translate-y-[1px] hover:bg-[#1d4ed8] hover:border-[#1d4ed8] hover:shadow-[0_22px_45px_rgba(37,99,235,0.45)]"
                  disabled={submitting}
                >
                  {submitting ? 'Publicando...' : <><Save className="w-4 h-4 mr-2" />Publicar Vaga</>}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      </div>
    </>
  );
};

export default CreateJob;