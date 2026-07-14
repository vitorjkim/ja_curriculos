import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';

import { 
  ArrowRight, CheckCircle, Star, FileText, Users, Briefcase, 
  TrendingUp, Award, Target, Search, Building2, ExternalLink,
  MapPin, Clock, ChevronRight, Zap, Shield, Rocket, DollarSign, Building, ChevronsRight, Calendar, Layers,
  Home as HomeIcon, GraduationCap, School, MessageSquare, BarChart2, Bell, Eye, UserCheck, PieChart, Download, Handshake
} from 'lucide-react';
import { motion, LayoutGroup, AnimatePresence } from 'framer-motion';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import Logo from '../components/Logo';
import { jobsAPI, externalJobsAPI, usersAPI } from '../lib/api';
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
  const [companyLogos, setCompanyLogos] = useState({});
  // Tab Toggle state: normal, alunos, escola, empresa
  const [homeTab, setHomeTab] = useState('alunos');
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
        const jobs = jobsResponse.jobs.slice(0, 6);
        setFeaturedJobs(jobs);
        // Fetch company logos
        const ids = [...new Set(jobs.map(j => j.company_id).filter(Boolean))];
        const logoCache = JSON.parse(localStorage.getItem('curriculoja_company_logos') || '{}');
        const logos = {};
        const missing = [];
        ids.forEach(id => {
          const key = String(id);
          if (logoCache[key]) logos[key] = logoCache[key];
          else missing.push(id);
        });
        if (missing.length) {
          const results = await Promise.all(missing.map(async id => {
            try {
              const resp = await usersAPI.getCompany(id);
              const img = resp?.company?.profileImage || resp?.company?.profile_image || null;
              return { id, img };
            } catch { return { id, img: null }; }
          }));
          results.forEach(({ id, img }) => { if (img) logos[String(id)] = img; });
        }
        setCompanyLogos(logos);
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
              {/* Tab Toggle - Normal | Alunos | Escola | Empresa */}
              <div className="flex justify-center pb-6 px-4">
                <LayoutGroup id="home-tabs">
                  <div className="relative inline-flex items-center gap-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 shadow-lg p-1" role="tablist" aria-label="Selecionar tipo de usuário">
                    {[
                      { id: 'alunos', label: 'Alunos', icon: GraduationCap, color: 'emerald' },
                      { id: 'escola', label: 'Escola', icon: School, color: 'purple' },
                      { id: 'empresa', label: 'Empresa', icon: Building2, color: 'amber' },
                    ].map((tab) => {
                      const Icon = tab.icon;
                      const isActive = homeTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          role="tab"
                          aria-selected={isActive}
                          onClick={() => setHomeTab(tab.id)}
                          className={`relative inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 ${
                            isActive ? 'text-blue-600' : 'text-white/80 hover:text-white'
                          }`}
                        >
                          {isActive && (
                            <motion.span
                              layoutId="homeTabSlider"
                              className="absolute inset-0 rounded-full bg-white shadow-md"
                              transition={{ type: 'spring', stiffness: 500, damping: 40, mass: 0.3 }}
                            />
                          )}
                          <span className="relative z-10 flex items-center gap-2">
                            <Icon className="w-4 h-4" />
                            <span className="hidden sm:inline">{tab.label}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </LayoutGroup>
              </div>

              {/* Conteúdo dinâmico baseado na tab */}
              {homeTab === 'normal' && (
                <>
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
                    <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} transition={{ duration: 0.1, ease: "easeOut" }} className="w-full sm:w-auto">
                      <Link to="/login" className="block">
                        <Button size="lg" className="relative bg-white text-blue-600 hover:bg-blue-50 hover:text-blue-700 w-full sm:w-auto px-6 md:px-8 py-3 md:py-4 text-base md:text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl border border-blue-100 hover:border-blue-200 group transition-all duration-150">
                          <span className="flex items-center justify-center">
                            Criar Currículo Grátis
                            <ArrowRight className="ml-2 h-4 w-4 md:h-5 md:w-5 group-hover:translate-x-1 transition-transform duration-100" />
                          </span>
                        </Button>
                      </Link>
                    </motion.div>
                    <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} transition={{ duration: 0.1, ease: "easeOut" }} className="w-full sm:w-auto">
                      <Link to="/login" className="block">
                        <Button size="lg" className="relative border-2 border-white/60 bg-transparent text-white hover:border-white hover:bg-white/5 w-full sm:w-auto px-6 md:px-8 py-3 md:py-4 text-base md:text-lg font-semibold rounded-xl backdrop-blur-sm transition-all duration-150 group">
                          <span className="flex items-center justify-center">
                            <Search className="mr-2 h-4 w-4 md:h-5 md:w-5" />
                            Explorar Vagas
                          </span>
                        </Button>
                      </Link>
                    </motion.div>
                    <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} transition={{ duration: 0.1, ease: "easeOut" }} className="w-full sm:w-auto">
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
                </>
              )}

              {homeTab === 'alunos' && (
                <>
                  <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-extrabold leading-tight mb-4 md:mb-6">
                    Seu primeiro emprego
                    <span className="block text-emerald-300">
                      começa aqui
                    </span>
                  </h1>
                  
                  <p className="text-lg md:text-xl lg:text-2xl text-blue-100 max-w-3xl mx-auto leading-relaxed px-4">
                    Crie currículos profissionais, encontre vagas exclusivas da sua escola 
                    e acompanhe todo o processo seletivo em tempo real.
                  </p>
                  
                  <div className="flex flex-col sm:flex-row gap-4 md:gap-6 justify-center items-center pt-6 px-4">
                    <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} transition={{ duration: 0.1, ease: "easeOut" }} className="w-full sm:w-auto">
                      <Link to="/register" className="block">
                        <Button size="lg" className="relative bg-emerald-500 text-white hover:bg-emerald-600 w-full sm:w-auto px-6 md:px-8 py-3 md:py-4 text-base md:text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl group transition-all duration-150">
                          <span className="flex items-center justify-center">
                            <GraduationCap className="mr-2 h-4 w-4 md:h-5 md:w-5" />
                            Cadastrar como Aluno
                            <ArrowRight className="ml-2 h-4 w-4 md:h-5 md:w-5 group-hover:translate-x-1 transition-transform duration-100" />
                          </span>
                        </Button>
                      </Link>
                    </motion.div>
                    <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} transition={{ duration: 0.1, ease: "easeOut" }} className="w-full sm:w-auto">
                      <Link to="/jobs" className="block">
                        <Button size="lg" className="relative border-2 border-white/60 bg-transparent text-white hover:border-white hover:bg-white/5 w-full sm:w-auto px-6 md:px-8 py-3 md:py-4 text-base md:text-lg font-semibold rounded-xl backdrop-blur-sm transition-all duration-150 group">
                          <span className="flex items-center justify-center">
                            <Search className="mr-2 h-4 w-4 md:h-5 md:w-5" />
                            Ver Vagas Disponíveis
                          </span>
                        </Button>
                      </Link>
                    </motion.div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4 md:gap-8 pt-6 md:pt-8 text-blue-100 px-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 md:h-5 md:w-5 text-emerald-400 flex-shrink-0" />
                      <span className="text-sm md:text-base">Currículo Guiado</span>
                    </div>
                    {/* Vagas da Sua Escola removido por solicitação */}
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 md:h-5 md:w-5 text-emerald-400 flex-shrink-0" />
                      <span className="text-sm md:text-base">Chat com Empresas</span>
                    </div>
                  </div>
                </>
              )}

              {homeTab === 'escola' && (
                <>
                  <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-extrabold leading-tight mb-4 md:mb-6">
                    Acompanhe a empregabilidade
                    <span className="block text-purple-300">
                      dos seus alunos
                    </span>
                  </h1>
                  
                  <p className="text-lg md:text-xl lg:text-2xl text-blue-100 max-w-3xl mx-auto leading-relaxed px-4">
                    Relatórios automáticos, indicadores por turma, indique vagas em destaque 
                    e conecte seus alunos às melhores empresas parceiras.
                  </p>
                  
                  <div className="flex flex-col sm:flex-row gap-4 md:gap-6 justify-center items-center pt-6 px-4">
                    <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} transition={{ duration: 0.1, ease: "easeOut" }} className="w-full sm:w-auto">
                      <Link to="/register" className="block">
                        <Button size="lg" className="relative bg-purple-500 text-white hover:bg-purple-600 w-full sm:w-auto px-6 md:px-8 py-3 md:py-4 text-base md:text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl group transition-all duration-150">
                          <span className="flex items-center justify-center">
                            <School className="mr-2 h-4 w-4 md:h-5 md:w-5" />
                            Cadastrar Escola
                            <ArrowRight className="ml-2 h-4 w-4 md:h-5 md:w-5 group-hover:translate-x-1 transition-transform duration-100" />
                          </span>
                        </Button>
                      </Link>
                    </motion.div>
                    <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} transition={{ duration: 0.1, ease: "easeOut" }} className="w-full sm:w-auto">
                      <Link to="/login" className="block">
                        <Button size="lg" className="relative border-2 border-white/60 bg-transparent text-white hover:border-white hover:bg-white/5 w-full sm:w-auto px-6 md:px-8 py-3 md:py-4 text-base md:text-lg font-semibold rounded-xl backdrop-blur-sm transition-all duration-150 group">
                          <span className="flex items-center justify-center">
                            Acessar Painel
                          </span>
                        </Button>
                      </Link>
                    </motion.div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4 md:gap-8 pt-6 md:pt-8 text-blue-100 px-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 md:h-5 md:w-5 text-purple-400 flex-shrink-0" />
                      <span className="text-sm md:text-base">Relatórios por Turma</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 md:h-5 md:w-5 text-purple-400 flex-shrink-0" />
                      <span className="text-sm md:text-base">Indicadores de Empregabilidade</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 md:h-5 md:w-5 text-purple-400 flex-shrink-0" />
                      <span className="text-sm md:text-base">Parcerias com Empresas</span>
                    </div>
                  </div>
                </>
              )}

              {homeTab === 'empresa' && (
                <>
                  <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-extrabold leading-tight mb-4 md:mb-6">
                    Encontre os melhores
                    <span className="block text-amber-300">
                      talentos
                    </span>
                  </h1>
                  
                  <p className="text-lg md:text-xl lg:text-2xl text-blue-100 max-w-3xl mx-auto leading-relaxed px-4">
                    Publique vagas, receba candidatos qualificados das melhores escolas técnicas 
                    e profissionalizantes da sua região.
                  </p>
                  
                  <div className="flex flex-col sm:flex-row gap-4 md:gap-6 justify-center items-center pt-6 px-4">
                    <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} transition={{ duration: 0.1, ease: "easeOut" }} className="w-full sm:w-auto">
                      <Link to="/company-landing" className="block">
                        <Button size="lg" className="relative bg-amber-500 text-white hover:bg-amber-600 w-full sm:w-auto px-6 md:px-8 py-3 md:py-4 text-base md:text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl group transition-all duration-150">
                          <span className="flex items-center justify-center">
                            <Building2 className="mr-2 h-4 w-4 md:h-5 md:w-5" />
                            Cadastrar Empresa
                            <ArrowRight className="ml-2 h-4 w-4 md:h-5 md:w-5 group-hover:translate-x-1 transition-transform duration-100" />
                          </span>
                        </Button>
                      </Link>
                    </motion.div>
                    <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} transition={{ duration: 0.1, ease: "easeOut" }} className="w-full sm:w-auto">
                      <Link to="/login" className="block">
                        <Button size="lg" className="relative border-2 border-white/60 bg-transparent text-white hover:border-white hover:bg-white/5 w-full sm:w-auto px-6 md:px-8 py-3 md:py-4 text-base md:text-lg font-semibold rounded-xl backdrop-blur-sm transition-all duration-150 group">
                          <span className="flex items-center justify-center">
                            Acessar Painel
                          </span>
                        </Button>
                      </Link>
                    </motion.div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4 md:gap-8 pt-6 md:pt-8 text-blue-100 px-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 md:h-5 md:w-5 text-amber-400 flex-shrink-0" />
                      <span className="text-sm md:text-base">Publicação de Vagas</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 md:h-5 md:w-5 text-amber-400 flex-shrink-0" />
                      <span className="text-sm md:text-base">Filtros Inteligentes</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 md:h-5 md:w-5 text-amber-400 flex-shrink-0" />
                      <span className="text-sm md:text-base">Chat com Candidatos</span>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        </section>

        {/* ==================== CONTEÚDO DINÂMICO POR TAB ==================== */}
        <AnimatePresence mode="wait">
          {/* ========== TAB NORMAL ========== */}
          {homeTab === 'normal' && (
            <motion.div
              key="normal-content"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Bloco compacto de busca e vagas recentes */}
              <section className="py-6 md:py-8 bg-white border-b border-gray-100">
                <div className="container mx-auto px-4 md:px-6">
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

                  <div className="max-w-7xl mx-auto">
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
                        const ct = safeLabel(job.contract_type);
                        const wt = safeLabel(job.work_type);
                        const el = safeLabel(job.experience_level);
                        const areaKey = safeLabel(job.area);

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
                              className={'shadow-md hover:shadow-lg transition-all duration-300 border border-gray-200 overflow-hidden rounded-2xl bg-white h-full flex flex-col group cursor-pointer'}
                              onClick={(e)=>handleCardClick(e, job.id)}
                            >
                              <CardContent className="p-2 flex flex-col h-full">
                                <div className="flex justify-between items-start mb-2">
                                  <div className="flex-1 pr-4">
                                    <div className="flex items-start space-x-2 mb-2">
                                      {(() => {
                                        const logo = job.company_id ? companyLogos[String(job.company_id)] : null;
                                        let shape = 'circle';
                                        try { if (job.company_id) shape = localStorage.getItem('company_avatar_shape_'+job.company_id) || 'circle'; } catch {}
                                        const roundedClass = shape === 'circle' ? 'rounded-full' : 'rounded-2xl';
                                        return logo ? (
                                          <div className={`w-9 h-9 ${roundedClass} flex items-center justify-center flex-shrink-0 overflow-hidden bg-white border border-gray-200`}>
                                            <img src={logo} alt="Logo" className="w-full h-full object-contain" />
                                          </div>
                                        ) : (
                                          <div className={`bg-blue-600 w-9 h-9 ${roundedClass} flex items-center justify-center flex-shrink-0`}><Building className="w-4 h-4 text-white" /></div>
                                        );
                                      })()}
                                      <div className="flex-1 min-w-0">
                                        <h4 className="text-[15px] font-semibold text-blue-700 antialiased leading-tight line-clamp-2 group-hover:text-blue-800 group-hover:underline group-hover:decoration-2 underline-offset-2 decoration-blue-700">{job.title}</h4>
                                        <p className="text-gray-800 font-medium text-[12.5px] leading-snug line-clamp-1">{job.company_name}</p>
                                      </div>
                                    </div>
                                  </div>
                                  <Link to={`/job/${job.id}`} className="flex-shrink-0">
                                    <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all duration-300 rounded-full h-8 px-3 text-[11px] flex items-center">
                                      <span className="mr-1">Ver</span>
                                      <ChevronsRight className="h-4 w-4" />
                                    </Button>
                                  </Link>
                                </div>
                                <div className="mb-2">
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 mb-1">
                                    {job.location && (
                                      <div className="flex items-center text-gray-900 bg-blue-50 px-2 py-1.5 rounded-2xl border border-blue-100 text-[12.5px]"><MapPin className="w-4 h-4 mr-1.5 text-blue-600" /><span className="font-medium truncate">{job.location}</span></div>
                                    )}
                                    {salaryText && (
                                      <div className="flex items-center text-gray-900 bg-green-50 px-2 py-1.5 rounded-2xl border border-green-100 text-[12.5px]"><DollarSign className="w-4 h-4 mr-1.5 text-green-600" /><span className="font-medium">{salaryText}</span></div>
                                    )}
                                  </div>
                                  {(ct || wt || el || areaKey) && (
                                    <div className="flex flex-wrap gap-1 text-[10.5px]">
                                      {ct && <div className="inline-flex items-center text-gray-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100"><Briefcase className="w-3 h-3 mr-1 text-purple-700" /><span className="font-medium tracking-tight">{ct.toUpperCase()}</span></div>}
                                      {wt && <div className="inline-flex items-center text-gray-700 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-100"><Calendar className="w-3 h-3 mr-1 text-orange-600" /><span className="font-medium tracking-tight">{wt.charAt(0).toUpperCase()+wt.slice(1)}</span></div>}
                                      {el && <div className="inline-flex items-center text-gray-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100"><Award className="w-3 h-3 mr-1 text-indigo-600" /><span className="font-medium tracking-tight">{el.charAt(0).toUpperCase()+el.slice(1)}</span></div>}
                                      {areaKey && <div className="inline-flex items-center text-gray-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-100"><Layers className="w-3 h-3 mr-1 text-teal-600" /><span className="font-medium tracking-tight">{getAreaLabel(areaKey)}</span></div>}
                                    </div>
                                  )}
                                </div>
                                <div className="mt-auto pt-2 border-t border-gray-200">
                                  {job.description
                                    ? <p className="text-gray-800 text-[13px] leading-snug line-clamp-2">{stripHtml(job.description)}</p>
                                    : null}
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
                  <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="text-center mb-12 md:mb-16 px-4">
                    <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-800 mb-4">
                      Por que escolher o <span className="text-blue-600">CurrículoJá</span>?
                    </h2>
                    <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto">
                      Uma plataforma completa com tecnologia de ponta que revoluciona o processo de recrutamento
                    </p>
                  </motion.div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto px-4">
                    {features.map((feature, index) => {
                      const Icon = feature.icon;
                      const borderColors = {
                        0: "border-blue-200 hover:border-blue-400",
                        1: "border-green-200 hover:border-green-400",
                        2: "border-purple-200 hover:border-purple-400",
                        3: "border-orange-200 hover:border-orange-400",
                        4: "border-red-200 hover:border-red-400",
                        5: "border-yellow-200 hover:border-yellow-400"
                      };
                      return (
                        <motion.div key={index} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} whileHover={{ scale: 1.02, y: -2 }} transition={{ duration: 0.6 }} className={`group bg-white rounded-xl p-6 md:p-7 shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer border-2 ${borderColors[index]}`}>
                          <div className="text-center">
                            <div className={`w-12 h-12 md:w-14 md:h-14 ${feature.bgColor} rounded-xl flex items-center justify-center mx-auto mb-4 md:mb-5 group-hover:scale-110 transition-transform duration-300`}>
                              <Icon className={`w-6 h-6 md:w-7 md:h-7 ${feature.color} transition-colors duration-300`} />
                            </div>
                            <h3 className={`text-lg md:text-xl font-bold mb-3 md:mb-4 transition-colors duration-300 ${feature.color.replace('600', '700')}`}>{feature.title}</h3>
                            <p className="text-sm md:text-base text-gray-600 leading-relaxed group-hover:text-gray-800 transition-colors duration-300">{feature.description}</p>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </section>

              {/* CTA Section */}
              <section className="py-20 bg-gray-900 text-white relative overflow-hidden">
                <div className="container mx-auto px-6 text-center relative">
                  <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="max-w-4xl mx-auto">
                    <h2 className="text-4xl md:text-6xl font-bold mb-6">
                      Pronto para <span className="text-blue-400">transformar</span> sua carreira?
                    </h2>
                    <p className="text-xl text-gray-300 mb-10 max-w-2xl mx-auto">
                      Junte-se a mais de 50.000 profissionais que já encontraram suas oportunidades ideais.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
                      <Link to="/register">
                        <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-4 text-lg font-semibold rounded-full shadow-2xl transform hover:scale-105 transition-all duration-200">
                          Criar Conta Grátis <ArrowRight className="ml-2 h-5 w-5" />
                        </Button>
                      </Link>
                      <Link to="/login">
                        <Button size="lg" variant="outline" className="border-2 border-white text-white hover:bg-white hover:text-gray-900 px-10 py-4 text-lg font-semibold rounded-full backdrop-blur-sm">
                          Já tenho conta
                        </Button>
                      </Link>
                    </div>
                  </motion.div>
                </div>
              </section>
            </motion.div>
          )}

          {/* ========== TAB ALUNOS ========== */}
          {homeTab === 'alunos' && (
            <motion.div
              key="alunos-content"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Features Section - Alunos */}
              <section className="py-12 md:py-20 bg-white">
                <div className="container mx-auto px-4 md:px-6">
                  <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="text-center mb-12 md:mb-16 px-4">
                    <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-800 mb-4">
                      Por que escolher o <span className="text-emerald-600">Já Currículos</span>?
                    </h2>
                    <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto">
                      Ferramentas exclusivas para estudantes que querem conquistar o primeiro emprego
                    </p>
                  </motion.div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto px-4">
                    {[
                      { icon: FileText, title: 'Currículo Guiado', description: 'Crie seu primeiro currículo com orientação passo a passo. Templates otimizados para quem está começando.', color: 'text-emerald-600', bgColor: 'bg-emerald-100', borderColor: 'border-emerald-200 hover:border-emerald-400' },
                      { icon: Search, title: 'Vagas Exclusivas', description: 'Acesse vagas indicadas pela sua escola e empresas parceiras da sua região.', color: 'text-blue-600', bgColor: 'bg-blue-100', borderColor: 'border-blue-200 hover:border-blue-400' },
                      { icon: Bell, title: 'Alertas Inteligentes', description: 'Receba notificações de novas vagas que combinam com seu perfil e área de interesse.', color: 'text-purple-600', bgColor: 'bg-purple-100', borderColor: 'border-purple-200 hover:border-purple-400' },
                      { icon: Eye, title: 'Acompanhamento Total', description: 'Veja em tempo real o status de todas as suas candidaturas e receba feedback das empresas.', color: 'text-orange-600', bgColor: 'bg-orange-100', borderColor: 'border-orange-200 hover:border-orange-400' },
                      { icon: MessageSquare, title: 'Chat Direto', description: 'Converse diretamente com recrutadores sem intermediários. Tire dúvidas e agende entrevistas.', color: 'text-rose-600', bgColor: 'bg-rose-100', borderColor: 'border-rose-200 hover:border-rose-400' },
                      { icon: Shield, title: '100% Gratuito', description: 'Sem taxas escondidas, sem pegadinhas. Todas as funcionalidades liberadas para estudantes.', color: 'text-teal-600', bgColor: 'bg-teal-100', borderColor: 'border-teal-200 hover:border-teal-400' },
                    ].map((feature, index) => {
                      const Icon = feature.icon;
                      return (
                        <motion.div key={index} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} whileHover={{ scale: 1.02, y: -2 }} transition={{ duration: 0.6 }} className={`group bg-white rounded-xl p-6 md:p-7 shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer border-2 ${feature.borderColor}`}>
                          <div className="text-center">
                            <div className={`w-12 h-12 md:w-14 md:h-14 ${feature.bgColor} rounded-xl flex items-center justify-center mx-auto mb-4 md:mb-5 group-hover:scale-110 transition-transform duration-300`}>
                              <Icon className={`w-6 h-6 md:w-7 md:h-7 ${feature.color} transition-colors duration-300`} />
                            </div>
                            <h3 className={`text-lg md:text-xl font-bold mb-3 md:mb-4 transition-colors duration-300 ${feature.color.replace('600', '700')}`}>{feature.title}</h3>
                            <p className="text-sm md:text-base text-gray-600 leading-relaxed group-hover:text-gray-800 transition-colors duration-300">{feature.description}</p>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </section>

              {/* Journey Cards - Alunos */}
              <section className="py-20 bg-gray-50">
                <div className="container mx-auto px-6">
                  <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="text-center mb-16">
                    <h2 className="text-4xl font-bold text-gray-900 mb-4">
                      Sua jornada para o <span className="text-emerald-600">primeiro emprego</span>
                    </h2>
                    <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                      Do currículo à contratação - acompanhamos você em cada passo
                    </p>
                  </motion.div>

                  <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Card 1 */}
                    <div className="group relative bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl"></div>
                      <div className="relative z-10">
                        <div className="w-12 h-12 bg-emerald-100 group-hover:bg-white/20 rounded-full flex items-center justify-center mb-4 transition-all duration-300">
                          <FileText className="h-6 w-6 text-emerald-600 group-hover:text-white transition-colors duration-300" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 group-hover:text-white mb-2 transition-colors duration-300">Crie seu Currículo</h3>
                        <div className="space-y-1 mb-4">
                          <p className="text-gray-600 group-hover:text-emerald-100 text-sm transition-colors duration-300">• Templates para iniciantes</p>
                          <p className="text-gray-600 group-hover:text-emerald-100 text-sm transition-colors duration-300">• Dicas para cada seção</p>
                          <p className="text-gray-600 group-hover:text-emerald-100 text-sm transition-colors duration-300">• Destaque suas habilidades</p>
                          <p className="text-gray-600 group-hover:text-emerald-100 text-sm transition-colors duration-300">• Export PDF profissional</p>
                        </div>
                        <div className="bg-emerald-50 group-hover:bg-white/20 rounded-lg p-3 transition-all duration-300">
                          <div className="text-2xl font-bold text-emerald-600 group-hover:text-white transition-colors duration-300">2 min</div>
                          <div className="text-xs text-emerald-700 group-hover:text-emerald-100 transition-colors duration-300">para criar</div>
                        </div>
                      </div>
                    </div>

                    {/* Card 2 */}
                    <div className="group relative bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl"></div>
                      <div className="relative z-10">
                        <div className="w-12 h-12 bg-blue-100 group-hover:bg-white/20 rounded-full flex items-center justify-center mb-4 transition-all duration-300">
                          <Search className="h-6 w-6 text-blue-600 group-hover:text-white transition-colors duration-300" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 group-hover:text-white mb-2 transition-colors duration-300">Encontre Vagas</h3>
                        <div className="space-y-1 mb-4">
                          {/* Vagas da sua escola (removido) */}
                          <p className="text-gray-600 group-hover:text-blue-100 text-sm transition-colors duration-300">• Empresas parceiras</p>
                          <p className="text-gray-600 group-hover:text-blue-100 text-sm transition-colors duration-300">• Filtros por área</p>
                          <p className="text-gray-600 group-hover:text-blue-100 text-sm transition-colors duration-300">• Match automático</p>
                        </div>
                        <div className="bg-blue-50 group-hover:bg-white/20 rounded-lg p-3 transition-all duration-300">
                          <div className="text-2xl font-bold text-blue-600 group-hover:text-white transition-colors duration-300">500+</div>
                          <div className="text-xs text-blue-700 group-hover:text-blue-100 transition-colors duration-300">vagas ativas</div>
                        </div>
                      </div>
                    </div>

                    {/* Card 3 */}
                    <div className="group relative bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl"></div>
                      <div className="relative z-10">
                        <div className="w-12 h-12 bg-purple-100 group-hover:bg-white/20 rounded-full flex items-center justify-center mb-4 transition-all duration-300">
                          <Eye className="h-6 w-6 text-purple-600 group-hover:text-white transition-colors duration-300" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 group-hover:text-white mb-2 transition-colors duration-300">Acompanhe Tudo</h3>
                        <div className="space-y-1 mb-4">
                          <p className="text-gray-600 group-hover:text-purple-100 text-sm transition-colors duration-300">• Status em tempo real</p>
                          <p className="text-gray-600 group-hover:text-purple-100 text-sm transition-colors duration-300">• Notificações de retorno</p>
                          <p className="text-gray-600 group-hover:text-purple-100 text-sm transition-colors duration-300">• Histórico de candidaturas</p>
                          <p className="text-gray-600 group-hover:text-purple-100 text-sm transition-colors duration-300">• Feedback das empresas</p>
                        </div>
                        <div className="bg-purple-50 group-hover:bg-white/20 rounded-lg p-3 transition-all duration-300">
                          <div className="text-2xl font-bold text-purple-600 group-hover:text-white transition-colors duration-300">100%</div>
                          <div className="text-xs text-purple-700 group-hover:text-purple-100 transition-colors duration-300">visibilidade</div>
                        </div>
                      </div>
                    </div>

                    {/* Card 4 */}
                    <div className="group relative bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-amber-500 to-amber-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl"></div>
                      <div className="relative z-10">
                        <div className="w-12 h-12 bg-amber-100 group-hover:bg-white/20 rounded-full flex items-center justify-center mb-4 transition-all duration-300">
                          <MessageSquare className="h-6 w-6 text-amber-600 group-hover:text-white transition-colors duration-300" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 group-hover:text-white mb-2 transition-colors duration-300">Converse & Conquiste</h3>
                        <div className="space-y-1 mb-4">
                          <p className="text-gray-600 group-hover:text-amber-100 text-sm transition-colors duration-300">• Chat com empresas</p>
                          <p className="text-gray-600 group-hover:text-amber-100 text-sm transition-colors duration-300">• Agende entrevistas</p>
                          <p className="text-gray-600 group-hover:text-amber-100 text-sm transition-colors duration-300">• Tire suas dúvidas</p>
                          <p className="text-gray-600 group-hover:text-amber-100 text-sm transition-colors duration-300">• Receba propostas</p>
                        </div>
                        <div className="bg-amber-50 group-hover:bg-white/20 rounded-lg p-3 transition-all duration-300">
                          <div className="text-2xl font-bold text-amber-600 group-hover:text-white transition-colors duration-300">24h</div>
                          <div className="text-xs text-amber-700 group-hover:text-amber-100 transition-colors duration-300">tempo de resposta</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* CTA Section - Alunos */}
              <section className="py-20 bg-gray-900 text-white relative overflow-hidden">
                <div className="container mx-auto px-6 text-center relative">
                  <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="max-w-4xl mx-auto">
                    <div className="inline-flex items-center px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-sm font-medium text-gray-300 mb-8">
                      <GraduationCap className="h-4 w-4 mr-2" />
                      Seu primeiro emprego está aqui
                    </div>
                    
                    <h2 className="text-4xl md:text-6xl font-bold mb-6">
                      Pronto para <span className="text-emerald-400">começar</span> sua carreira?
                    </h2>
                    <p className="text-xl text-gray-300 mb-10 max-w-2xl mx-auto">
                      Junte-se a milhares de estudantes que já conquistaram seu primeiro emprego através do Já Currículos.
                    </p>
                    
                    <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
                      <Link to="/register">
                        <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white px-10 py-4 text-lg font-semibold rounded-full shadow-2xl transform hover:scale-105 transition-all duration-200">
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
                        <CheckCircle className="h-5 w-5 text-emerald-400" />
                        <span>100% Gratuito</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-emerald-400" />
                        <span>Vagas Exclusivas</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-emerald-400" />
                        <span>Suporte Total</span>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </section>
            </motion.div>
          )}

          {/* ========== TAB ESCOLA ========== */}
          {homeTab === 'escola' && (
            <motion.div
              key="escola-content"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Features Section - Escola */}
              <section className="py-12 md:py-20 bg-white">
                <div className="container mx-auto px-4 md:px-6">
                  <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="text-center mb-12 md:mb-16 px-4">
                    <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-800 mb-4">
                      Por que escolher o <span className="text-purple-600">Já Currículos</span>?
                    </h2>
                    <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto">
                      Ferramentas completas para acompanhar e impulsionar a empregabilidade dos seus alunos
                    </p>
                  </motion.div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto px-4">
                    {[
                      { icon: BarChart2, title: 'Relatórios Detalhados', description: 'Métricas por turma, curso e período. Acompanhe currículos criados, candidaturas e contratações.', color: 'text-purple-600', bgColor: 'bg-purple-100', borderColor: 'border-purple-200 hover:border-purple-400' },
                      { icon: Star, title: 'Sistema de Destaques', description: 'Indique alunos e vagas em destaque para aumentar visibilidade e chances de contratação.', color: 'text-amber-600', bgColor: 'bg-amber-100', borderColor: 'border-amber-200 hover:border-amber-400' },
                      { icon: Handshake, title: 'Parcerias Empresariais', description: 'Conecte-se com empresas da região e receba vagas exclusivas para seus alunos.', color: 'text-blue-600', bgColor: 'bg-blue-100', borderColor: 'border-blue-200 hover:border-blue-400' },
                      { icon: Bell, title: 'Alertas Inteligentes', description: 'Identifique alunos com baixa atividade e envie lembretes automáticos de engajamento.', color: 'text-rose-600', bgColor: 'bg-rose-100', borderColor: 'border-rose-200 hover:border-rose-400' },
                      { icon: Download, title: 'Exportação Completa', description: 'Exporte relatórios em PDF e Excel para apresentações institucionais e prestação de contas.', color: 'text-emerald-600', bgColor: 'bg-emerald-100', borderColor: 'border-emerald-200 hover:border-emerald-400' },
                      { icon: PieChart, title: 'Dashboard em Tempo Real', description: 'Visualize indicadores de empregabilidade atualizados automaticamente em um painel intuitivo.', color: 'text-indigo-600', bgColor: 'bg-indigo-100', borderColor: 'border-indigo-200 hover:border-indigo-400' },
                    ].map((feature, index) => {
                      const Icon = feature.icon;
                      return (
                        <motion.div key={index} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} whileHover={{ scale: 1.02, y: -2 }} transition={{ duration: 0.6 }} className={`group bg-white rounded-xl p-6 md:p-7 shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer border-2 ${feature.borderColor}`}>
                          <div className="text-center">
                            <div className={`w-12 h-12 md:w-14 md:h-14 ${feature.bgColor} rounded-xl flex items-center justify-center mx-auto mb-4 md:mb-5 group-hover:scale-110 transition-transform duration-300`}>
                              <Icon className={`w-6 h-6 md:w-7 md:h-7 ${feature.color} transition-colors duration-300`} />
                            </div>
                            <h3 className={`text-lg md:text-xl font-bold mb-3 md:mb-4 transition-colors duration-300 ${feature.color.replace('600', '700')}`}>{feature.title}</h3>
                            <p className="text-sm md:text-base text-gray-600 leading-relaxed group-hover:text-gray-800 transition-colors duration-300">{feature.description}</p>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </section>

              {/* Journey Cards - Escola */}
              <section className="py-20 bg-gray-50">
                <div className="container mx-auto px-6">
                  <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="text-center mb-16">
                    <h2 className="text-4xl font-bold text-gray-900 mb-4">
                      Gerencie a <span className="text-purple-600">empregabilidade</span> da sua escola
                    </h2>
                    <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                      Do cadastro do aluno até a contratação - visibilidade total do processo
                    </p>
                  </motion.div>

                  <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Card 1 */}
                    <div className="group relative bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl"></div>
                      <div className="relative z-10">
                        <div className="w-12 h-12 bg-purple-100 group-hover:bg-white/20 rounded-full flex items-center justify-center mb-4 transition-all duration-300">
                          <Users className="h-6 w-6 text-purple-600 group-hover:text-white transition-colors duration-300" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 group-hover:text-white mb-2 transition-colors duration-300">Cadastre Alunos</h3>
                        <div className="space-y-1 mb-4">
                          <p className="text-gray-600 group-hover:text-purple-100 text-sm transition-colors duration-300">• Importação em massa</p>
                          <p className="text-gray-600 group-hover:text-purple-100 text-sm transition-colors duration-300">• Organização por turma</p>
                          <p className="text-gray-600 group-hover:text-purple-100 text-sm transition-colors duration-300">• Gestão de cursos</p>
                          <p className="text-gray-600 group-hover:text-purple-100 text-sm transition-colors duration-300">• Convites automáticos</p>
                        </div>
                        <div className="bg-purple-50 group-hover:bg-white/20 rounded-lg p-3 transition-all duration-300">
                          <div className="text-2xl font-bold text-purple-600 group-hover:text-white transition-colors duration-300">1.000+</div>
                          <div className="text-xs text-purple-700 group-hover:text-purple-100 transition-colors duration-300">alunos/escola</div>
                        </div>
                      </div>
                    </div>

                    {/* Card 2 */}
                    <div className="group relative bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl"></div>
                      <div className="relative z-10">
                        <div className="w-12 h-12 bg-blue-100 group-hover:bg-white/20 rounded-full flex items-center justify-center mb-4 transition-all duration-300">
                          <Handshake className="h-6 w-6 text-blue-600 group-hover:text-white transition-colors duration-300" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 group-hover:text-white mb-2 transition-colors duration-300">Conecte Empresas</h3>
                        <div className="space-y-1 mb-4">
                          <p className="text-gray-600 group-hover:text-blue-100 text-sm transition-colors duration-300">• Parcerias regionais</p>
                          <p className="text-gray-600 group-hover:text-blue-100 text-sm transition-colors duration-300">• Vagas exclusivas</p>
                          <p className="text-gray-600 group-hover:text-blue-100 text-sm transition-colors duration-300">• Comunicação direta</p>
                          <p className="text-gray-600 group-hover:text-blue-100 text-sm transition-colors duration-300">• Selo de parceiro</p>
                        </div>
                        <div className="bg-blue-50 group-hover:bg-white/20 rounded-lg p-3 transition-all duration-300">
                          <div className="text-2xl font-bold text-blue-600 group-hover:text-white transition-colors duration-300">200+</div>
                          <div className="text-xs text-blue-700 group-hover:text-blue-100 transition-colors duration-300">empresas parceiras</div>
                        </div>
                      </div>
                    </div>

                    {/* Card 3 */}
                    <div className="group relative bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl"></div>
                      <div className="relative z-10">
                        <div className="w-12 h-12 bg-emerald-100 group-hover:bg-white/20 rounded-full flex items-center justify-center mb-4 transition-all duration-300">
                          <BarChart2 className="h-6 w-6 text-emerald-600 group-hover:text-white transition-colors duration-300" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 group-hover:text-white mb-2 transition-colors duration-300">Monitore Métricas</h3>
                        <div className="space-y-1 mb-4">
                          <p className="text-gray-600 group-hover:text-emerald-100 text-sm transition-colors duration-300">• Taxa de engajamento</p>
                          <p className="text-gray-600 group-hover:text-emerald-100 text-sm transition-colors duration-300">• Currículos criados</p>
                          <p className="text-gray-600 group-hover:text-emerald-100 text-sm transition-colors duration-300">• Candidaturas enviadas</p>
                          <p className="text-gray-600 group-hover:text-emerald-100 text-sm transition-colors duration-300">• Contratações realizadas</p>
                        </div>
                        <div className="bg-emerald-50 group-hover:bg-white/20 rounded-lg p-3 transition-all duration-300">
                          <div className="text-2xl font-bold text-emerald-600 group-hover:text-white transition-colors duration-300">85%</div>
                          <div className="text-xs text-emerald-700 group-hover:text-emerald-100 transition-colors duration-300">taxa de sucesso</div>
                        </div>
                      </div>
                    </div>

                    {/* Card 4 */}
                    <div className="group relative bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-amber-500 to-amber-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl"></div>
                      <div className="relative z-10">
                        <div className="w-12 h-12 bg-amber-100 group-hover:bg-white/20 rounded-full flex items-center justify-center mb-4 transition-all duration-300">
                          <Award className="h-6 w-6 text-amber-600 group-hover:text-white transition-colors duration-300" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 group-hover:text-white mb-2 transition-colors duration-300">Celebre Resultados</h3>
                        <div className="space-y-1 mb-4">
                          <p className="text-gray-600 group-hover:text-amber-100 text-sm transition-colors duration-300">• Alunos contratados</p>
                          <p className="text-gray-600 group-hover:text-amber-100 text-sm transition-colors duration-300">• Relatórios institucionais</p>
                          <p className="text-gray-600 group-hover:text-amber-100 text-sm transition-colors duration-300">• Certificados de parceria</p>
                          <p className="text-gray-600 group-hover:text-amber-100 text-sm transition-colors duration-300">• Ranking de escolas</p>
                        </div>
                        <div className="bg-amber-50 group-hover:bg-white/20 rounded-lg p-3 transition-all duration-300">
                          <div className="text-2xl font-bold text-amber-600 group-hover:text-white transition-colors duration-300">50+</div>
                          <div className="text-xs text-amber-700 group-hover:text-amber-100 transition-colors duration-300">escolas parceiras</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* CTA Section - Escola */}
              <section className="py-20 bg-gray-900 text-white relative overflow-hidden">
                <div className="container mx-auto px-6 text-center relative">
                  <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="max-w-4xl mx-auto">
                    <div className="inline-flex items-center px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-sm font-medium text-gray-300 mb-8">
                      <School className="h-4 w-4 mr-2" />
                      Transforme a empregabilidade da sua escola
                    </div>
                    
                    <h2 className="text-4xl md:text-6xl font-bold mb-6">
                      Pronto para <span className="text-purple-400">impulsionar</span> seus alunos?
                    </h2>
                    <p className="text-xl text-gray-300 mb-10 max-w-2xl mx-auto">
                      Junte-se a mais de 50 escolas que já transformaram seus índices de empregabilidade com o Já Currículos.
                    </p>
                    
                    <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
                      <Link to="/register">
                        <Button size="lg" className="bg-purple-600 hover:bg-purple-700 text-white px-10 py-4 text-lg font-semibold rounded-full shadow-2xl transform hover:scale-105 transition-all duration-200">
                          Cadastrar Minha Escola
                          <ArrowRight className="ml-2 h-5 w-5" />
                        </Button>
                      </Link>
                      <Link to="/login">
                        <Button size="lg" variant="outline" className="border-2 border-white text-white hover:bg-white hover:text-gray-900 px-10 py-4 text-lg font-semibold rounded-full backdrop-blur-sm">
                          Acessar Painel
                        </Button>
                      </Link>
                    </div>
                    
                    <div className="flex items-center justify-center gap-8 pt-12 text-gray-400">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-purple-400" />
                        <span>Dashboard Completo</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-purple-400" />
                        <span>Relatórios Detalhados</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-purple-400" />
                        <span>Suporte Dedicado</span>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </section>
            </motion.div>
          )}

          {/* ========== TAB EMPRESA ========== */}
          {homeTab === 'empresa' && (
            <motion.div
              key="empresa-content"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Features Section - Empresa */}
              <section className="py-12 md:py-20 bg-white">
                <div className="container mx-auto px-4 md:px-6">
                  <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="text-center mb-12 md:mb-16 px-4">
                    <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-800 mb-4">
                      Por que escolher o <span className="text-amber-600">Já Currículos</span>?
                    </h2>
                    <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto">
                      A plataforma completa para recrutar talentos qualificados de escolas técnicas e profissionalizantes
                    </p>
                  </motion.div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto px-4">
                    {[
                      { icon: Briefcase, title: 'Publique Vagas', description: 'Crie vagas em minutos com nosso editor intuitivo. Alcance milhares de candidatos qualificados.', color: 'text-amber-600', bgColor: 'bg-amber-100', borderColor: 'border-amber-200 hover:border-amber-400' },
                      { icon: UserCheck, title: 'Candidatos Filtrados', description: 'Receba apenas candidatos que atendem seus requisitos. Filtros por curso, escola e competências.', color: 'text-blue-600', bgColor: 'bg-blue-100', borderColor: 'border-blue-200 hover:border-blue-400' },
                      { icon: MessageSquare, title: 'Chat Integrado', description: 'Converse diretamente com candidatos. Agende entrevistas e envie propostas sem sair da plataforma.', color: 'text-emerald-600', bgColor: 'bg-emerald-100', borderColor: 'border-emerald-200 hover:border-emerald-400' },
                      { icon: Handshake, title: 'Parcerias com Escolas', description: 'Conecte-se com escolas técnicas da região. Receba indicações e tenha acesso prioritário a talentos.', color: 'text-purple-600', bgColor: 'bg-purple-100', borderColor: 'border-purple-200 hover:border-purple-400' },
                      { icon: Clock, title: 'Contratação Rápida', description: 'Reduza o tempo de contratação em até 60%. Processo simplificado do início ao fim.', color: 'text-rose-600', bgColor: 'bg-rose-100', borderColor: 'border-rose-200 hover:border-rose-400' },
                      { icon: Shield, title: 'Seguro e Compliant', description: 'Plataforma em conformidade com LGPD. Dados protegidos e processos transparentes.', color: 'text-indigo-600', bgColor: 'bg-indigo-100', borderColor: 'border-indigo-200 hover:border-indigo-400' },
                    ].map((feature, index) => {
                      const Icon = feature.icon;
                      return (
                        <motion.div key={index} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} whileHover={{ scale: 1.02, y: -2 }} transition={{ duration: 0.6 }} className={`group bg-white rounded-xl p-6 md:p-7 shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer border-2 ${feature.borderColor}`}>
                          <div className="text-center">
                            <div className={`w-12 h-12 md:w-14 md:h-14 ${feature.bgColor} rounded-xl flex items-center justify-center mx-auto mb-4 md:mb-5 group-hover:scale-110 transition-transform duration-300`}>
                              <Icon className={`w-6 h-6 md:w-7 md:h-7 ${feature.color} transition-colors duration-300`} />
                            </div>
                            <h3 className={`text-lg md:text-xl font-bold mb-3 md:mb-4 transition-colors duration-300 ${feature.color.replace('600', '700')}`}>{feature.title}</h3>
                            <p className="text-sm md:text-base text-gray-600 leading-relaxed group-hover:text-gray-800 transition-colors duration-300">{feature.description}</p>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </section>

              {/* Journey Cards - Empresa */}
              <section className="py-20 bg-gray-50">
                <div className="container mx-auto px-6">
                  <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="text-center mb-16">
                    <h2 className="text-4xl font-bold text-gray-900 mb-4">
                      Recrute os melhores <span className="text-amber-600">talentos</span>
                    </h2>
                    <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                      Da publicação da vaga à contratação - um processo simples e eficiente
                    </p>
                  </motion.div>

                  <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Card 1 */}
                    <div className="group relative bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-amber-500 to-amber-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl"></div>
                      <div className="relative z-10">
                        <div className="w-12 h-12 bg-amber-100 group-hover:bg-white/20 rounded-full flex items-center justify-center mb-4 transition-all duration-300">
                          <Briefcase className="h-6 w-6 text-amber-600 group-hover:text-white transition-colors duration-300" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 group-hover:text-white mb-2 transition-colors duration-300">Publique a Vaga</h3>
                        <div className="space-y-1 mb-4">
                          <p className="text-gray-600 group-hover:text-amber-100 text-sm transition-colors duration-300">• Editor intuitivo</p>
                          <p className="text-gray-600 group-hover:text-amber-100 text-sm transition-colors duration-300">• Requisitos detalhados</p>
                          <p className="text-gray-600 group-hover:text-amber-100 text-sm transition-colors duration-300">• Faixa salarial flexível</p>
                          <p className="text-gray-600 group-hover:text-amber-100 text-sm transition-colors duration-300">• Publicação instantânea</p>
                        </div>
                        <div className="bg-amber-50 group-hover:bg-white/20 rounded-lg p-3 transition-all duration-300">
                          <div className="text-2xl font-bold text-amber-600 group-hover:text-white transition-colors duration-300">5 min</div>
                          <div className="text-xs text-amber-700 group-hover:text-amber-100 transition-colors duration-300">para publicar</div>
                        </div>
                      </div>
                    </div>

                    {/* Card 2 */}
                    <div className="group relative bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl"></div>
                      <div className="relative z-10">
                        <div className="w-12 h-12 bg-blue-100 group-hover:bg-white/20 rounded-full flex items-center justify-center mb-4 transition-all duration-300">
                          <UserCheck className="h-6 w-6 text-blue-600 group-hover:text-white transition-colors duration-300" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 group-hover:text-white mb-2 transition-colors duration-300">Receba Candidatos</h3>
                        <div className="space-y-1 mb-4">
                          <p className="text-gray-600 group-hover:text-blue-100 text-sm transition-colors duration-300">• Currículos completos</p>
                          <p className="text-gray-600 group-hover:text-blue-100 text-sm transition-colors duration-300">• Filtros avançados</p>
                          <p className="text-gray-600 group-hover:text-blue-100 text-sm transition-colors duration-300">• Ranking automático</p>
                          <p className="text-gray-600 group-hover:text-blue-100 text-sm transition-colors duration-300">• Perfis verificados</p>
                        </div>
                        <div className="bg-blue-50 group-hover:bg-white/20 rounded-lg p-3 transition-all duration-300">
                          <div className="text-2xl font-bold text-blue-600 group-hover:text-white transition-colors duration-300">10.000+</div>
                          <div className="text-xs text-blue-700 group-hover:text-blue-100 transition-colors duration-300">currículos ativos</div>
                        </div>
                      </div>
                    </div>

                    {/* Card 3 */}
                    <div className="group relative bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl"></div>
                      <div className="relative z-10">
                        <div className="w-12 h-12 bg-emerald-100 group-hover:bg-white/20 rounded-full flex items-center justify-center mb-4 transition-all duration-300">
                          <MessageSquare className="h-6 w-6 text-emerald-600 group-hover:text-white transition-colors duration-300" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 group-hover:text-white mb-2 transition-colors duration-300">Converse & Avalie</h3>
                        <div className="space-y-1 mb-4">
                          <p className="text-gray-600 group-hover:text-emerald-100 text-sm transition-colors duration-300">• Chat em tempo real</p>
                          <p className="text-gray-600 group-hover:text-emerald-100 text-sm transition-colors duration-300">• Agende entrevistas</p>
                          <p className="text-gray-600 group-hover:text-emerald-100 text-sm transition-colors duration-300">• Notas e avaliações</p>
                          <p className="text-gray-600 group-hover:text-emerald-100 text-sm transition-colors duration-300">• Histórico completo</p>
                        </div>
                        <div className="bg-emerald-50 group-hover:bg-white/20 rounded-lg p-3 transition-all duration-300">
                          <div className="text-2xl font-bold text-emerald-600 group-hover:text-white transition-colors duration-300">24h</div>
                          <div className="text-xs text-emerald-700 group-hover:text-emerald-100 transition-colors duration-300">tempo de resposta</div>
                        </div>
                      </div>
                    </div>

                    {/* Card 4 */}
                    <div className="group relative bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl"></div>
                      <div className="relative z-10">
                        <div className="w-12 h-12 bg-purple-100 group-hover:bg-white/20 rounded-full flex items-center justify-center mb-4 transition-all duration-300">
                          <Award className="h-6 w-6 text-purple-600 group-hover:text-white transition-colors duration-300" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 group-hover:text-white mb-2 transition-colors duration-300">Contrate Talentos</h3>
                        <div className="space-y-1 mb-4">
                          <p className="text-gray-600 group-hover:text-purple-100 text-sm transition-colors duration-300">• Envie propostas</p>
                          <p className="text-gray-600 group-hover:text-purple-100 text-sm transition-colors duration-300">• Documentação simples</p>
                          <p className="text-gray-600 group-hover:text-purple-100 text-sm transition-colors duration-300">• Onboarding integrado</p>
                          <p className="text-gray-600 group-hover:text-purple-100 text-sm transition-colors duration-300">• Feedback à escola</p>
                        </div>
                        <div className="bg-purple-50 group-hover:bg-white/20 rounded-lg p-3 transition-all duration-300">
                          <div className="text-2xl font-bold text-purple-600 group-hover:text-white transition-colors duration-300">60%</div>
                          <div className="text-xs text-purple-700 group-hover:text-purple-100 transition-colors duration-300">mais rápido</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* CTA Section - Empresa */}
              <section className="py-20 bg-gray-900 text-white relative overflow-hidden">
                <div className="container mx-auto px-6 text-center relative">
                  <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="max-w-4xl mx-auto">
                    <div className="inline-flex items-center px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-sm font-medium text-gray-300 mb-8">
                      <Building2 className="h-4 w-4 mr-2" />
                      Encontre os melhores talentos
                    </div>
                    
                    <h2 className="text-4xl md:text-6xl font-bold mb-6">
                      Pronto para <span className="text-amber-400">recrutar</span> talentos?
                    </h2>
                    <p className="text-xl text-gray-300 mb-10 max-w-2xl mx-auto">
                      Junte-se a centenas de empresas que já encontraram os melhores candidatos através do Já Currículos.
                    </p>
                    
                    <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
                      <Link to="/company-landing">
                        <Button size="lg" className="bg-amber-600 hover:bg-amber-700 text-white px-10 py-4 text-lg font-semibold rounded-full shadow-2xl transform hover:scale-105 transition-all duration-200">
                          Cadastrar Empresa
                          <ArrowRight className="ml-2 h-5 w-5" />
                        </Button>
                      </Link>
                      <Link to="/login">
                        <Button size="lg" variant="outline" className="border-2 border-white text-white hover:bg-white hover:text-gray-900 px-10 py-4 text-lg font-semibold rounded-full backdrop-blur-sm">
                          Acessar Painel
                        </Button>
                      </Link>
                    </div>
                    
                    <div className="flex items-center justify-center gap-8 pt-12 text-gray-400">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-amber-400" />
                        <span>Vagas Ilimitadas</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-amber-400" />
                        <span>Chat Integrado</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-amber-400" />
                        <span>Suporte Prioritário</span>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </section>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};

export default Home;
