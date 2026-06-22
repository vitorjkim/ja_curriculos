import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { 
  ArrowRight, CheckCircle, Star, FileText, Users, Briefcase, 
  TrendingUp, Award, Target, Search, Building2, ExternalLink,
  MapPin, Clock, ChevronRight, Zap, Shield, Rocket, DollarSign, Building, ChevronsRight, Calendar, Layers
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import Logo from '../components/Logo';
import { jobsAPI, externalJobsAPI } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { stripHtml } from '../lib/utils';

// Área -> rótulo amigável (mesmo mapa da página /jobs)
const AREA_LABELS = {
  saude:'Saúde', educacao:'Educação', engenharia:'Engenharia', administracao:'Administração', vendas_marketing:'Vendas / Marketing',
  recursos_humanos:'Recursos Humanos', financas:'Finanças', design:'Design', logistica:'Logística', producao:'Produção', mecanica:'Mecânica',
  automacao:'Automação', outros:'Outros', tecnologia:'Tecnologia', administrativo:'Administrativo', financeiro:'Financeiro', marketing:'Marketing',
  vendas:'Vendas', operacional:'Operacional', direito:'Direito'
};
const humanize = (str='') => str.replace(/_/g,' ').toLowerCase().replace(/\b\w/g,c=>c.toUpperCase()).replace(/\b(De|Da|Do|E)\b/g,m=>m.toLowerCase());
const getAreaLabel = (areaKey='') => AREA_LABELS[areaKey] || humanize(areaKey);
const safeLabel = (v) => {
  if (v === null || v === undefined) return '';
  const s = String(v).trim();
  if (!s) return '';
  if (s.toLowerCase() === 'nan') return '';
  return s;
};

const Home = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [featuredJobs, setFeaturedJobs] = useState([]);
  const [jobStats, setJobStats] = useState(null);
  const [loading, setLoading] = useState(false);
  // Placeholder com animação de digitação
  const placeholderExamples = [
    'Engenheiro Civil',
    'Construtora JL',
    'Designer',
    'Desenvolvedor Frontend',
    'Operador de Máquinas',
  ];
  const [typedPH, setTypedPH] = useState('');
  const [phIdx, setPhIdx] = useState(0);
  const [deletingPH, setDeletingPH] = useState(false);
  useEffect(() => {
    const current = placeholderExamples[phIdx] || '';
    const isAtEnd = typedPH === current;
    const isAtStart = typedPH.length === 0;

  let delay = 90; // velocidade padrão de digitação
  if (deletingPH) delay = 50; // apagar mais rápido
  if (isAtEnd && !deletingPH) delay = 4000; // pausa de 4s ao terminar de digitar
    if (isAtStart && deletingPH) delay = 400; // pausa antes da próxima palavra

    const t = setTimeout(() => {
      if (!deletingPH) {
        // Digitando
        const next = current.slice(0, typedPH.length + 1);
        setTypedPH(next);
        if (next === current) setDeletingPH(true);
      } else {
        // Apagando
        const next = current.slice(0, Math.max(0, typedPH.length - 1));
        setTypedPH(next);
        if (next.length === 0) {
          setDeletingPH(false);
          setPhIdx((i) => (i + 1) % placeholderExamples.length);
        }
      }
    }, delay);

    return () => clearTimeout(t);
  }, [typedPH, deletingPH, phIdx]);

  useEffect(() => {
    loadHomeData();
  }, []);

  const loadHomeData = async () => {
    try {
      setLoading(true);
      
      // Carregar vagas em destaque e estatísticas
      const [jobsResponse, statsResponse] = await Promise.all([
        jobsAPI.list({ limit: 6 }),
        jobsAPI.getJobStats().catch(() => null)
      ]);

      if (jobsResponse?.jobs) {
        setFeaturedJobs(jobsResponse.jobs.slice(0, 6));
      }

      if (statsResponse?.stats) {
        setJobStats(statsResponse.stats);
      }

    } catch (error) {
      console.error('Erro ao carregar dados da home:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/jobs?q=${encodeURIComponent(searchTerm.trim())}`);
    }
  };

  // Navegar para a página da vaga ao clicar no card (evita conflitos com botões/links internos)
  const openJob = (jobId) => navigate(`/job/${jobId}`);
  const handleCardClick = (e, jobId) => {
    const interactive = e.target.closest('a, button, input, textarea, select, [role="button"]');
    if (interactive) return;
    openJob(jobId);
  };
  const features = [
    {
      icon: FileText,
      title: "Currículo Inteligente",
      description: "Crie currículos profissionais com IA em minutos. Templates modernos e otimizados para ATS.",
      color: "text-blue-600",
      bgColor: "bg-blue-100"
    },
    {
      icon: Search,
      title: "Busca Inteligente",
      description: "Encontre vagas que combinam perfeitamente com seu perfil usando nossa IA avançada.",
      color: "text-green-600", 
      bgColor: "bg-green-100"
    },
    {
      icon: Users,
      title: "Networking",
      description: "Conecte-se com profissionais da sua área e expanda sua rede de contatos.",
      color: "text-purple-600",
      bgColor: "bg-purple-100"
    },
    {
      icon: Briefcase,
      title: "Gestão de Candidaturas",
      description: "Organize todas suas aplicações em um só lugar e acompanhe o status em tempo real.",
      color: "text-orange-600",
      bgColor: "bg-orange-100"
    },
    {
      icon: TrendingUp,
      title: "Analytics Pessoal",
      description: "Visualizações detalhadas do seu perfil e dicas personalizadas para melhorar.",
      color: "text-red-600",
      bgColor: "bg-red-100"
    },
    {
      icon: Award,
      title: "Certificações",
      description: "Valide suas habilidades com certificações reconhecidas pelo mercado.",
      color: "text-yellow-600",
      bgColor: "bg-yellow-100"
    }
  ];

  const testimonials = [
    {
      name: "Maria Silva",
      role: "Desenvolvedora Frontend",
      company: "Tech Corp",
      content: "Consegui minha vaga dos sonhos em apenas 2 semanas! A plataforma é incrível e muito fácil de usar.",
      rating: 5
    },
    {
      name: "João Santos", 
      role: "Designer UX/UI",
      company: "Creative Agency",
      content: "O currículo gerado pela IA impressionou muito os recrutadores. Recebi várias propostas!",
      rating: 5
    },
    {
      name: "Ana Costa",
      role: "Gerente de Marketing",
      company: "Marketing Pro",
      content: "A funcionalidade de networking me ajudou a conseguir indicações valiosas no mercado.",
      rating: 5
    }
  ];

  return (
    <>
      <Helmet>
        <title>CurriculoJá - Crie seu currículo profissional em minutos</title>
        <meta name="description" content="Plataforma inteligente para criação de currículos profissionais. Conecte-se com as melhores oportunidades do mercado de trabalho." />
        <meta name="keywords" content="currículo, emprego, vagas, carreira, trabalho, cv, resume" />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-indigo-50">
        {/* Hero Section */}
        <section className="py-12 md:py-20 bg-blue-600 text-white overflow-hidden relative">
          <div className="container mx-auto px-4 md:px-6 relative">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-center"
            >
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-extrabold leading-tight mb-4 md:mb-6">
                Crie seu currículo em
                <span className="block text-yellow-300">
                  2 minutos
                </span>
              </h1>
              
              <p className="text-lg md:text-xl lg:text-2xl text-blue-100 max-w-3xl mx-auto leading-relaxed px-4">
                A plataforma mais moderna e eficiente para conectar talentos e oportunidades. 
                Transforme sua carreira hoje mesmo.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 md:gap-6 justify-center items-center pt-6 px-4">
                {/* Botão Principal - "Criar Currículo" - Hover Sutil */}
                <motion.div
                  whileHover={{ 
                    y: -2,
                  }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ 
                    duration: 0.1,
                    ease: "easeOut"
                  }}
                  className="w-full sm:w-auto"
                >
                  <Link to="/login" className="block">
                    <Button size="lg" className="relative bg-white text-blue-600 hover:bg-blue-50 hover:text-blue-700 w-full sm:w-auto px-6 md:px-8 py-3 md:py-4 text-base md:text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl border border-blue-100 hover:border-blue-200 group transition-all duration-150">
                      <span className="flex items-center justify-center">
                        Criar Currículo Grátis
                        <ArrowRight className="ml-2 h-4 w-4 md:h-5 md:w-5 group-hover:translate-x-1 transition-transform duration-100" />
                      </span>
                    </Button>
                  </Link>
                </motion.div>

                {/* Botão Secundário - "Explorar Vagas" - Hover com Borda */}
                <motion.div
                  whileHover={{ 
                    y: -2,
                  }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ 
                    duration: 0.1,
                    ease: "easeOut"
                  }}
                  className="w-full sm:w-auto"
                >
                  <Link to="/login" className="block">
                    <Button size="lg" className="relative border-2 border-white/60 bg-transparent text-white hover:border-white hover:bg-white/5 w-full sm:w-auto px-6 md:px-8 py-3 md:py-4 text-base md:text-lg font-semibold rounded-xl backdrop-blur-sm transition-all duration-150 group">
                      <span className="flex items-center justify-center">
                        <Search className="mr-2 h-4 w-4 md:h-5 md:w-5" />
                        Explorar Vagas
                      </span>
                    </Button>
                  </Link>
                </motion.div>

                {/* Botão Terciário - "Sou Empresa" - Hover Discreto */}
                <motion.div
                  whileHover={{ 
                    y: -2,
                  }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ 
                    duration: 0.1,
                    ease: "easeOut"
                  }}
                  className="w-full sm:w-auto"
                >
                  <Link to="/company-landing" className="block">
                    <Button size="lg" className="relative text-white hover:text-gray-100 w-full sm:w-auto px-6 md:px-8 py-3 md:py-4 text-base md:text-lg font-semibold rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 hover:border-white/40 transition-all duration-150 group">
                      <span className="flex items-center justify-center">
                        <Building2 className="mr-2 h-4 w-4 md:h-5 md:w-5" />
                        Sou Empresa
                      </span>
                    </Button>
                  </Link>
                </motion.div>
              </div>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 md:gap-8 pt-6 md:pt-8 text-blue-100 px-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 md:h-5 md:w-5 text-green-400 flex-shrink-0" />
                  <span className="text-sm md:text-base">100% Gratuito</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 md:h-5 md:w-5 text-green-400 flex-shrink-0" />
                  <span className="text-sm md:text-base">Sem Cadastro Inicial</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 md:h-5 md:w-5 text-green-400 flex-shrink-0" />
                  <span className="text-sm md:text-base">Resultado Instantâneo</span>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Bloco compacto de busca e vagas recentes (alinhado ao /jobs) */}
        <section className="py-6 md:py-8 bg-white border-b border-gray-100">
          <div className="container mx-auto px-4 md:px-6">
            {/* Barra de busca aprimorada */}
            <form onSubmit={handleSearch} className="max-w-3xl mx-auto mb-5">
              <div className="group flex items-center bg-white/95 backdrop-blur-sm border border-gray-200 hover:border-gray-300 focus-within:ring-2 focus-within:ring-blue-200 rounded-full shadow-sm transition-all p-1.5 pl-3 pr-1.5">
                <Search className="w-5 h-5 text-blue-600/90 mr-2" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={typedPH ? `Ex.: ${typedPH}` : 'Busque por cargo ou empresa'}
                  className="flex-1 bg-transparent border-0 h-11 text-[15px] placeholder:text-gray-400 focus-visible:ring-0 focus:outline-none"
                />
                <Button type="submit" className="h-11 rounded-full bg-blue-600 hover:bg-blue-700 text-white px-5 text-[14px] inline-flex items-center gap-1.5">
                  Buscar
                  <ChevronsRight className="w-4 h-4" />
                </Button>
              </div>
            </form>

            {/* Vagas recentes internas */}
            <div className="max-w-5xl mx-auto">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xl md:text-2xl font-bold text-gray-900">Vagas recentes</h3>
                <Link to="/jobs" className="text-blue-700 font-semibold inline-flex items-center hover:underline">
                  Ver todas
                  <ChevronRight className="w-5 h-5 ml-1" />
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
              {featuredJobs?.length === 0 && (
                <div className="col-span-full text-gray-500">{loading ? 'Carregando...' : 'Nenhuma vaga disponível no momento.'}</div>
              )}
              {featuredJobs?.slice(0, 6).map((job, index) => {
                const salaryText = (() => {
                  if (job?.salary_fixed != null && job?.salary_fixed !== '') {
                    const n = Number(job.salary_fixed);
                    if (!Number.isNaN(n)) return `R$ ${n}`;
                  }
                  let { salary_min, salary_max } = job || {};
                  if (salary_min && salary_max && Number(salary_min) > Number(salary_max)) {
                    [salary_min, salary_max] = [salary_max, salary_min];
                  }
                  if (salary_min && salary_max) {
                    if (Number(salary_min) === Number(salary_max)) return `R$ ${salary_min}`;
                    return `R$ ${salary_min} - R$ ${salary_max}`;
                  }
                  if (salary_min) return `A partir de R$ ${salary_min}`;
                  if (salary_max) return `Até R$ ${salary_max}`;
                  return null;
                })();

                return (
                  <motion.div
                    key={job.id || index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.05 }}
                    whileHover={{ y: -5, transition: { duration: 0.2 } }}
                    className="h-full"
                  >
                    <Card
                      className={'shadow-md hover:shadow-lg transition-all duration-300 border border-gray-200 overflow-hidden rounded-2xl bg-white h-full min-h-[160px] flex flex-col group cursor-pointer'}
                      onClick={(e)=>handleCardClick(e, job.id)}
                    >
                      <CardContent className="p-2 flex flex-col h-full">
                        <div className="flex justify-between items-start mb-2">
                        <div className="flex-1 pr-4">
                          <div className="flex items-start space-x-2 mb-2">
                            <div className="bg-blue-600 w-8 h-8 rounded-2xl flex items-center justify-center flex-shrink-0"><Building className="w-4 h-4 text-white" /></div>
                            <div className="flex-1 min-w-0">
                                <h4 className="text-[15px] font-semibold text-blue-700 antialiased leading-tight line-clamp-2 group-hover:text-blue-800 group-hover:underline group-hover:decoration-2 underline-offset-2 decoration-blue-700">{job.title}</h4>
                                <p className="text-gray-800 font-medium text-[12.5px] leading-snug line-clamp-1">{job.company_name}</p>
                                {job.is_community && (
                                  <div className="mt-1 inline-flex items-center text-[11px] font-semibold text-amber-800 bg-amber-200/70 px-2 py-0.5 rounded-full">Vaga da Comunidade</div>
                                )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 flex-shrink-0">
                          <Link to={`/job/${job.id}`} className="flex-shrink-0">
                            <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all duration-300 rounded-full h-8 px-3 text-[11px] flex items-center">
                              <span className="mr-1">Ver</span>
                              <ChevronsRight className="h-4 w-4" />
                            </Button>
                          </Link>
                        </div>
                        </div>
                        <div className="mb-2 min-h-[52px]">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 mb-1">
                            {job.location && (
                              <div className="flex items-center text-gray-900 bg-blue-50 px-2 py-1.5 rounded-2xl border border-blue-100 text-[12.5px]"><MapPin className="w-4 h-4 mr-1.5 text-blue-600" /><span className="font-medium truncate">{job.location}</span></div>
                            )}
                            {salaryText && (
                              <div className="flex items-center text-gray-900 bg-green-50 px-2 py-1.5 rounded-2xl border border-green-100 text-[12.5px]"><DollarSign className="w-4 h-4 mr-1.5 text-green-600" /><span className="font-medium">{salaryText}</span></div>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-1.5 text-[11.5px]">
                            {safeLabel(job.contract_type) && (
                              <div className="inline-flex items-center text-gray-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100">
                                <Briefcase className="w-3 h-3 mr-1 text-purple-700" />
                                <span className="font-medium tracking-tight">{safeLabel(job.contract_type).toUpperCase()}</span>
                              </div>
                            )}
                            {safeLabel(job.work_type) && (
                              <div className="inline-flex items-center text-gray-700 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-100">
                                <Calendar className="w-3 h-3 mr-1 text-orange-600" />
                                <span className="font-medium tracking-tight">{safeLabel(job.work_type).charAt(0).toUpperCase()+safeLabel(job.work_type).slice(1)}</span>
                              </div>
                            )}
                            {safeLabel(job.experience_level) && (
                              <div className="inline-flex items-center text-gray-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                                <Award className="w-3.5 h-3.5 mr-1 text-indigo-600" />
                                <span className="font-medium tracking-tight">{safeLabel(job.experience_level).charAt(0).toUpperCase()+safeLabel(job.experience_level).slice(1)}</span>
                              </div>
                            )}
                            {safeLabel(job.area) && (
                              <div className="inline-flex items-center text-gray-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-100">
                                <Layers className="w-3 h-3 mr-1 text-teal-600" />
                                <span className="font-medium tracking-tight">{getAreaLabel(safeLabel(job.area))}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="mt-auto pt-2 border-t border-gray-200 min-h-[36px]">
                          {job.description
                            ? <p className="text-gray-800 text-[13px] leading-snug line-clamp-2">{stripHtml(job.description)}</p>
                            : <div className="h-[24px]" aria-hidden="true"></div>}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-12 md:py-20 bg-white">
          <div className="container mx-auto px-4 md:px-6">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-center mb-12 md:mb-16 px-4"
            >
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-800 mb-4">
                Por que escolher o 
                <span className="text-blue-600"> CurrículoJá</span>?
              </h2>
              <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto">
                Uma plataforma completa com tecnologia de ponta que revoluciona o processo de recrutamento
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto px-4">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                const borderColors = {
                  0: "border-blue-200 hover:border-blue-400 hover:shadow-blue-200/30",
                  1: "border-green-200 hover:border-green-400 hover:shadow-green-200/30", 
                  2: "border-purple-200 hover:border-purple-400 hover:shadow-purple-200/30",
                  3: "border-orange-200 hover:border-orange-400 hover:shadow-orange-200/30",
                  4: "border-red-200 hover:border-red-400 hover:shadow-red-200/30",
                  5: "border-yellow-200 hover:border-yellow-400 hover:shadow-yellow-200/30"
                };
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    whileHover={{ 
                      scale: 1.02,
                      y: -2,
                      transition: { duration: 0.2 }
                    }}
                    animate={{ 
                      scale: 1,
                      y: 0,
                      transition: { duration: 0.05 }
                    }}
                    transition={{ 
                      duration: 0.6, 
                      delay: 0,
                      ease: "easeOut"
                    }}
                    className={`group bg-white rounded-xl p-6 md:p-7 shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer border-2 ${borderColors[index]}`}
                  >
                    <div className="text-center">
                      <div className={`w-12 h-12 md:w-14 md:h-14 ${feature.bgColor} rounded-xl flex items-center justify-center mx-auto mb-4 md:mb-5 group-hover:scale-110 transition-transform duration-300`}>
                        <Icon className={`w-6 h-6 md:w-7 md:h-7 ${feature.color} transition-colors duration-300`} />
                      </div>

                      <h3 className={`text-lg md:text-xl font-bold mb-3 md:mb-4 transition-colors duration-300 ${feature.color.replace('600', '700')}`}>
                        {feature.title}
                      </h3>

                      <p className="text-sm md:text-base text-gray-600 leading-relaxed group-hover:text-gray-800 transition-colors duration-300">
                        {feature.description}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Company Section */}
        <section className="py-24 bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 text-white overflow-hidden relative">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="container mx-auto px-6 relative z-10">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
              >
                <div className="inline-flex items-center px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-sm font-medium text-blue-200 mb-6">
                  <Building2 className="h-4 w-4 mr-2" />
                  Solução Empresarial
                </div>
                
                <h2 className="text-5xl md:text-6xl font-bold leading-tight mb-6">
                  Encontre os 
                  <span className="block text-yellow-300 bg-gradient-to-r from-yellow-300 to-yellow-400 bg-clip-text text-transparent font-black">
                    melhores talentos
                  </span>
                  <span className="text-3xl md:text-4xl block mt-2 text-blue-200">em tempo recorde</span>
                </h2>
                
                <p className="text-xl text-blue-100 mb-10 leading-relaxed max-w-xl">
                  Plataforma de recrutamento com IA que conecta empresas aos candidatos ideais. 
                  <strong className="text-white">Reduza 80% do tempo</strong> no seu processo seletivo.
                </p>

                {/* Features Grid */}
                <div className="grid md:grid-cols-2 gap-4 mb-10">
                  {[
                    { icon: '🚀', text: 'Publique vagas em 2 minutos' },
                    { icon: '🎯', text: 'IA para match perfeito' },
                    { icon: '📊', text: 'Analytics em tempo real' },
                    { icon: '💬', text: 'Chat integrado com candidatos' },
                    { icon: '✅', text: 'Currículos pré-verificados' },
                    { icon: '📈', text: 'Relatórios de performance' }
                  ].map((item, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1, duration: 0.5 }}
                      className="flex items-center bg-white/10 backdrop-blur-sm rounded-lg p-3 hover:bg-white/20 transition-all duration-300"
                    >
                      <span className="text-2xl mr-3">{item.icon}</span>
                      <span className="text-blue-100 font-medium">{item.text}</span>
                    </motion.div>
                  ))}
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <Link to="/company-landing">
                    <Button size="lg" className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-white hover:from-yellow-500 hover:to-yellow-600 px-8 py-4 text-lg font-bold rounded-full shadow-2xl hover:shadow-yellow-500/25 transform hover:scale-105 transition-all duration-300">
                      Começar Gratuitamente
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                  <a href="https://www.youtube.com" target="_blank" rel="noopener noreferrer">
                    <Button size="lg" variant="outline" className="border-2 border-white/30 text-white hover:bg-white/10 px-8 py-4 text-lg font-semibold rounded-full backdrop-blur-sm transition-all duration-300">
                      Ver Demonstração
                    </Button>
                  </a>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
                className="relative"
              >
                <div className="bg-white/15 backdrop-blur-md rounded-3xl p-8 border border-white/20">
                  {/* Stats Cards */}
                  <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="bg-white/10 rounded-2xl p-6 text-center">
                      <div className="text-3xl font-bold text-yellow-300 mb-1">98%</div>
                      <div className="text-blue-200 text-sm">Taxa de Sucesso</div>
                    </div>
                    <div className="bg-white/10 rounded-2xl p-6 text-center">
                      <div className="text-3xl font-bold text-yellow-300 mb-1">15min</div>
                      <div className="text-blue-200 text-sm">Tempo Médio</div>
                    </div>
                  </div>

                  {/* Award Section */}
                  <div className="flex items-center gap-4 bg-gradient-to-r from-yellow-400/20 to-yellow-300/20 rounded-2xl p-6 border border-yellow-300/30">
                    <div className="w-16 h-16 bg-yellow-400 rounded-2xl flex items-center justify-center shadow-lg">
                      <Award className="h-8 w-8 text-yellow-800" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-white mb-1">Plataforma #1</h3>
                      <p className="text-yellow-100">Melhor Solução de RH 2024</p>
                      <div className="flex items-center mt-2">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className="w-4 h-4 text-yellow-400 fill-current" />
                        ))}
                        <span className="ml-2 text-yellow-200 text-sm">+10mil empresas</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Journey Cards Section */}
        <section className="py-20 bg-gray-50">
          <div className="container mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-center mb-16"
            >
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                Sua jornada para o <span className="text-blue-600">sucesso profissional</span>
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Do primeiro currículo à contratação dos seus sonhos - acompanhamos você em cada passo
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Card 1 - Criação do Currículo */}
              <div className="group relative bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden">
                {/* Overlay com animação */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl"></div>
                
                {/* Conteúdo do card */}
                <div className="relative z-10">
                  <div className="w-12 h-12 bg-blue-100 group-hover:bg-white/20 rounded-full flex items-center justify-center mb-4 transition-all duration-300">
                    <FileText className="h-6 w-6 text-blue-600 group-hover:text-white transition-colors duration-300" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 group-hover:text-white mb-2 transition-colors duration-300">Criação Inteligente</h3>
                  
                  <div className="space-y-1 mb-4">
                    <p className="text-gray-600 group-hover:text-blue-100 text-sm transition-colors duration-300">• Análise automática de perfil</p>
                    <p className="text-gray-600 group-hover:text-blue-100 text-sm transition-colors duration-300">• Templates otimizados (ATS)</p>
                    <p className="text-gray-600 group-hover:text-blue-100 text-sm transition-colors duration-300">• Sugestões personalizadas</p>
                    <p className="text-gray-600 group-hover:text-blue-100 text-sm transition-colors duration-300">• Export PDF profissional</p>
                  </div>
                  
                  <div className="bg-blue-50 group-hover:bg-white/20 rounded-lg p-3 transition-all duration-300">
                    <div className="text-2xl font-bold text-blue-600 group-hover:text-white transition-colors duration-300">92%</div>
                    <div className="text-xs text-blue-700 group-hover:text-blue-100 transition-colors duration-300">Melhoria de performance</div>
                  </div>
                </div>
              </div>

              {/* Card 2 - Trilha Personalizada */}
              <div className="group relative bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden">
                {/* Overlay com animação */}
                <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-green-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl"></div>
                
                {/* Conteúdo do card */}
                <div className="relative z-10">
                  <div className="w-12 h-12 bg-green-100 group-hover:bg-white/20 rounded-full flex items-center justify-center mb-4 transition-all duration-300">
                    <TrendingUp className="h-6 w-6 text-green-600 group-hover:text-white transition-colors duration-300" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 group-hover:text-white mb-2 transition-colors duration-300">Trilha Personalizada</h3>
                  
                  <div className="space-y-1 mb-4">
                    <p className="text-gray-600 group-hover:text-green-100 text-sm transition-colors duration-300">• Avaliação de competências</p>
                    <p className="text-gray-600 group-hover:text-green-100 text-sm transition-colors duration-300">• Trilha de estudos personalizada</p>
                    <p className="text-gray-600 group-hover:text-green-100 text-sm transition-colors duration-300">• Materiais curados</p>
                    <p className="text-gray-600 group-hover:text-green-100 text-sm transition-colors duration-300">• Certificados de progresso</p>
                  </div>
                  
                  <div className="bg-green-50 group-hover:bg-white/20 rounded-lg p-3 transition-all duration-300">
                    <div className="text-2xl font-bold text-green-600 group-hover:text-white transition-colors duration-300">92%</div>
                    <div className="text-xs text-green-700 group-hover:text-green-100 transition-colors duration-300">Melhoria de performance</div>
                  </div>
                </div>
              </div>

              {/* Card 3 - Prep. Entrevistas */}
              <div className="group relative bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden">
                {/* Overlay com animação */}
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl"></div>
                
                {/* Conteúdo do card */}
                <div className="relative z-10">
                  <div className="w-12 h-12 bg-purple-100 group-hover:bg-white/20 rounded-full flex items-center justify-center mb-4 transition-all duration-300">
                    <Users className="h-6 w-6 text-purple-600 group-hover:text-white transition-colors duration-300" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 group-hover:text-white mb-2 transition-colors duration-300">Prep. Entrevistas</h3>
                  
                  <div className="space-y-1 mb-4">
                    <p className="text-gray-600 group-hover:text-purple-100 text-sm transition-colors duration-300">• Simulações com IA</p>
                    <p className="text-gray-600 group-hover:text-purple-100 text-sm transition-colors duration-300">• +500 perguntas por área</p>
                    <p className="text-gray-600 group-hover:text-purple-100 text-sm transition-colors duration-300">• Feedback personalizado</p>
                    <p className="text-gray-600 group-hover:text-purple-100 text-sm transition-colors duration-300">• Mentoria com especialistas</p>
                  </div>
                  
                  <div className="bg-purple-50 group-hover:bg-white/20 rounded-lg p-3 transition-all duration-300">
                    <div className="text-2xl font-bold text-purple-600 group-hover:text-white transition-colors duration-300">87%</div>
                    <div className="text-xs text-purple-700 group-hover:text-purple-100 transition-colors duration-300">Taxa de aprovação</div>
                  </div>
                </div>
              </div>

              {/* Card 4 - Acompanhamento */}
              <div className="group relative bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden">
                {/* Overlay com animação */}
                <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-orange-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl"></div>
                
                {/* Conteúdo do card */}
                <div className="relative z-10">
                  <div className="w-12 h-12 bg-orange-100 group-hover:bg-white/20 rounded-full flex items-center justify-center mb-4 transition-all duration-300">
                    <Target className="h-6 w-6 text-orange-600 group-hover:text-white transition-colors duration-300" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 group-hover:text-white mb-2 transition-colors duration-300">Acompanhamento</h3>
                  
                  <div className="space-y-1 mb-4">
                    <p className="text-gray-600 group-hover:text-orange-100 text-sm transition-colors duration-300">• Dashboard em tempo real</p>
                    <p className="text-gray-600 group-hover:text-orange-100 text-sm transition-colors duration-300">• Relatórios de visualizações</p>
                    <p className="text-gray-600 group-hover:text-orange-100 text-sm transition-colors duration-300">• Análise de candidaturas</p>
                    <p className="text-gray-600 group-hover:text-orange-100 text-sm transition-colors duration-300">• Suporte 24/7 disponível</p>
                  </div>
                  
                  <div className="bg-orange-50 group-hover:bg-white/20 rounded-lg p-3 transition-all duration-300">
                    <div className="text-2xl font-bold text-orange-600 group-hover:text-white transition-colors duration-300">24/7</div>
                    <div className="text-xs text-orange-700 group-hover:text-orange-100 transition-colors duration-300">Suporte disponível</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-gray-900 text-white relative overflow-hidden">
          <div className="container mx-auto px-6 text-center relative">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="max-w-4xl mx-auto"
            >
              <div className="inline-flex items-center px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-sm font-medium text-gray-300 mb-8">
                <Target className="h-4 w-4 mr-2" />
                Sua próxima oportunidade está aqui
              </div>
              
              <h2 className="text-4xl md:text-6xl font-bold mb-6">
                Pronto para 
                <span className="text-blue-400"> transformar </span>
                sua carreira?
              </h2>
              <p className="text-xl text-gray-300 mb-10 max-w-2xl mx-auto">
                Junte-se a mais de 50.000 profissionais que já encontraram suas oportunidades ideais. 
                Comece gratuitamente hoje mesmo.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
                <Link to="/register">
                  <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-4 text-lg font-semibold rounded-full shadow-2xl transform hover:scale-105 transition-all duration-200">
                    Criar Conta Grátis
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link to="/login">
                  <Button size="lg" variant="outline" className="border-2 border-white text-white hover:bg-white hover:text-gray-900 px-10 py-4 text-lg font-semibold rounded-full backdrop-blur-sm">
                    Já tenho conta
                  </Button>
                </Link>
              </div>
              
              <div className="flex items-center justify-center gap-8 pt-12 text-gray-400">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                  <span>Sem compromisso</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                  <span>Suporte 24/7</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                  <span>Resultados garantidos</span>
                </div>
              </div>
            </motion.div>
          </div>
        </section>
      </div>
    </>
  );
};

export default Home;
