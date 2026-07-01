import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Helmet } from 'react-helmet';
import { Save, Settings, Layers, FileText, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Combobox } from '@/components/ui/combobox';
import { Label } from '@/components/ui/label';
import ResumeCard from '@/components/resume/ResumeCard';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import PersonalInfoSection from '@/components/resume/PersonalInfoSection';
import EducationSection from '@/components/resume/EducationSection';
import ExperienceSection from '@/components/resume/ExperienceSection';
import ProjectsSection from '@/components/resume/ProjectsSection';
import CoursesSection from '@/components/resume/CoursesSection';
import LanguagesSection from '@/components/resume/LanguagesSection';
import { calculateAge } from '@/lib/utils';
import { TemplateThemeProvider } from '@/contexts/TemplateThemeContext';
import { resumes, jobsAPI } from '@/lib/api';
import ResumeLivePreview from '@/components/resume/ResumeLivePreview';
import { Maximize2, Minimize2 } from 'lucide-react';

// DEV: dados de teste aleatórios
const NOMES = ['Ana Lima','Carlos Souza','Fernanda Rocha','Bruno Alves','Juliana Costa','Rafael Mendes','Patrícia Nunes','Lucas Ferreira','Camila Dias','Thiago Gomes'];
const EMPRESAS = ['TechBR','Inovação SA','Nexus Digital','AlphaCode','DataSoft','Maveris','Solaris Tech','Conecta','Vortex Systems','PulseIT'];
const CARGOS = ['Desenvolvedor Júnior','Analista de Dados','Designer UX','Auxiliar Administrativo','Assistente Financeiro','Analista de RH','Desenvolvedor Mobile','Marketing Digital','Suporte TI','Analista de Qualidade'];
const CIDADES = ['São Paulo / SP','Rio de Janeiro / RJ','Curitiba / PR','Belo Horizonte / MG','Porto Alegre / RS','Fortaleza / CE','Recife / PE','Brasília / DF','Salvador / BA','Manaus / AM'];
const IDIOMAS = ['Inglês','Espanhol','Francês','Alemão','Italiano','Mandarim','Japonês'];
const NIVEIS_IDIOMA = ['Básico','Intermediário','Avançado','Fluente'];
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min,max) => Math.floor(Math.random()*(max-min+1))+min;
const randDate = () => { const y=randInt(1990,2003),m=String(randInt(1,12)).padStart(2,'0'),d=String(randInt(1,28)).padStart(2,'0'); return `${y}-${m}-${d}`; };

const CreateResume = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [hasNoExperience, setHasNoExperience] = useState(false);
  const [isPreviewExpanded, setIsPreviewExpanded] = useState(false);
  const [isPreviewPeekVisible, setIsPreviewPeekVisible] = useState(false);

  // DEV: preencher com dados aleatórios
  const fillRandom = () => {
    const nome = pick(NOMES);
    const bd = randDate();
    const suffix = randInt(100,999);
    setFormData(prev => ({
      ...prev,
      title: `Currículo de Teste ${suffix}`,
      name: nome,
      birthDate: bd,
      phone: `(${randInt(11,99)}) 9${randInt(1000,9999)}-${randInt(1000,9999)}`,
      email: `${nome.split(' ')[0].toLowerCase()}${suffix}@teste.com`,
      address: `Rua das Flores, ${randInt(1,999)}`,
      city: pick(CIDADES),
      area: 'tecnologia',
      subarea: 'backend',
      education: [{ id: 1, institution: 'Universidade Federal', degree: 'Bacharelado em Ciência da Computação', period: '2018 - 2022', description: 'Formação completa na área de tecnologia.' }],
      experiences: [
        { id: 1, company: pick(EMPRESAS), position: pick(CARGOS), period: `${randInt(2019,2022)} - ${randInt(2023,2025)}`, description: 'Atuei em desenvolvimento de sistemas, análise de requisitos e manutenção de aplicações web.' },
        { id: 2, company: pick(EMPRESAS), position: pick(CARGOS), period: `${randInt(2016,2018)} - ${randInt(2019,2021)}`, description: 'Responsável pelo suporte técnico, implantação de melhorias e documentação de processos.' }
      ],
      languages: [
        { id: 1, language: 'Português', level: 'Nativo' },
        { id: 2, language: pick(IDIOMAS), level: pick(NIVEIS_IDIOMA) }
      ],
      courses: [{ id: 1, name: 'Curso de React e Node.js', institution: 'Udemy', year: String(randInt(2021,2024)) }],
      skills: ['JavaScript','React','Node.js','Git','SQL'].slice(0, randInt(3,5))
    }));
  };

  // Taxonomy (áreas e sub-áreas)
  const [taxonomy, setTaxonomy] = useState({});
  const [areasList, setAreasList] = useState([]);
  const [subareasList, setSubareasList] = useState([]);
  
  // Opções para o combobox de templates
  const templateOptions = [
    { value: 'default', label: 'Padrão', description: 'Estilo escuro moderno' },
    { value: 'modern', label: 'Moderno', description: 'Claro e contemporâneo' },
    { value: 'classic', label: 'Clássico', description: 'Tradicional e formal' },
    { value: 'minimal', label: 'Minimalista', description: 'Limpo e objetivo' },
    { value: 'professional', label: 'Profissional', description: 'Elegante com cores' },
    { value: 'colorful', label: 'Colorido', description: 'Cards coloridos por seção' }
  ];

  const [formData, setFormData] = useState({
    // Campos obrigatórios para o backend
    title: 'Meu Currículo',
  template: (typeof window !== 'undefined' && localStorage.getItem('curriculoja_template')) || 'default',
    is_public: true,
    
    // Informações pessoais
    name: '',
    birthDate: '',
    age: '',
    phone: '',
    email: '',
  address: '',
  city: '',
    photo: '',
  linkedin_url: '',
  instagram_url: '',
  whatsapp: '',
  github_url: '',
  custom_url: '',
  // Área e Sub-área de atuação
  area: '',
  subarea: '',
    
    // Outras seções
    education: [],
    experiences: [{ id: 1, company: '', position: '', period: '', description: '' }],
    projects: [],
    courses: [],
    languages: [{ id: 1, language: 'Português', level: 'Nativo' }],
    skills: []
  });

  useEffect(() => {
    if (user) {
      let savedEducation = '';
      try {
        const raw = localStorage.getItem(`profile_section_education_${user.id}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (typeof parsed === 'string' && parsed.trim()) savedEducation = parsed.trim();
        }
      } catch {}
      setFormData(prev => ({
        ...prev,
        name: user.name || '',
        birthDate: user.birthDate || '',
        age: user.birthDate ? calculateAge(user.birthDate) : '',
        phone: user.phone || '',
        email: user.email || '',
        photo: user.profileImage || user.profile_image || '',
        linkedin_url: user.linkedin_url || '',
        instagram_url: user.instagram_url || '',
        whatsapp: user.whatsapp || user.phone || '',
        address: user.address || '',
        city: user.city || '',
        ...(savedEducation ? { education: savedEducation } : {}),
      }));
    }
  }, [user]);

  // Persistir template selecionado
  useEffect(() => {
    try {
      if (formData?.template) {
        localStorage.setItem('curriculoja_template', formData.template);
      }
    } catch {}
  }, [formData.template]);

  // Template visual: troca 'default' <-> 'modern' (padrão claro = default, escuro = modern)
  const visualTemplate = useMemo(() => {
    if (formData.template === 'default') return 'modern';
    if (formData.template === 'modern') return 'default';
    return formData.template || 'default';
  }, [formData.template]);

  // Tema por template (usando o template visual): controla cores de cards e do shell da página
  const templateTheme = useMemo(() => {
    // Cada template define: pageBg, headerText, accents por seção
    const base = {
      // Default (visual do 'Moderno' pós-swap): GitHub-like dark
      pageBg: 'bg-[#0d1117]',
      headerText: 'text-white',
      accents: {
        settings: 'blue',
        personal: 'yellow',
        education: 'blue',
        experience: 'orange',
        projects: 'red',
        courses: 'purple',
        languages: 'green',
        area: 'teal',
      }
    };

    const map = {
      // 'default' recebe o visual escuro (antigo moderno) via base
      default: base,
      // 'modern' (após swap) mantém o visual claro do antigo padrão
      modern: {
        pageBg: 'bg-gradient-to-b from-white via-blue-50 to-indigo-50',
        headerText: 'bg-gradient-to-r from-blue-700 to-indigo-700',
        accents: {
          settings: 'blue',
          personal: 'teal',
          education: 'blue',
          experience: 'orange',
          projects: 'red',
          courses: 'purple',
          languages: 'green',
          area: 'teal',
        }
      },
      classic: {
        pageBg: 'bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-stone-50 via-stone-100 to-stone-200',
        headerText: 'bg-gradient-to-r from-stone-700 to-zinc-700',
        accents: {
          settings: 'yellow',
          personal: 'yellow',
          education: 'blue',
          experience: 'orange',
          projects: 'red',
          courses: 'purple',
          languages: 'green',
          area: 'blue',
        }
      },
      minimal: {
        pageBg: 'bg-white',
        headerText: 'text-black',
        accents: {
          settings: 'gray',
          personal: 'gray',
          education: 'gray',
          experience: 'gray',
          projects: 'gray',
          courses: 'gray',
          languages: 'gray',
          area: 'gray',
        }
      },
      professional: {
        pageBg: 'bg-slate-50/80',
        headerText: 'text-slate-900',
        accents: {
          settings: 'blue',
          personal: 'blue',
          education: 'teal',
          experience: 'purple',
          projects: 'red',
          courses: 'green',
          languages: 'yellow',
          area: 'blue',
        }
      },
      colorful: {
        pageBg: 'bg-gradient-to-br from-slate-50 via-white to-blue-50/40',
        headerText: 'text-slate-900',
        accents: {
          settings: 'blue',
          personal: 'indigo',
          education: 'green',
          experience: 'purple',
          projects: 'red',
          courses: 'orange',
          languages: 'teal',
          area: 'blue',
        }
      }
    };
    const theme = map[visualTemplate] || base;
    // Primary button style per template (now solid, no gradients)
    const primaryBtn = {
      default: 'bg-[#1f6feb] hover:bg-[#1158c7]',
      modern: 'bg-indigo-700 hover:bg-indigo-800',
      classic: 'bg-stone-800 hover:bg-stone-900',
      minimal: 'bg-black hover:bg-gray-900',
      professional: 'bg-[#2563eb] hover:bg-[#1d4ed8]',
      colorful: 'bg-blue-600 hover:bg-blue-700',
    };
    return { ...theme, primaryBtn: primaryBtn[visualTemplate] || primaryBtn.default };
  }, [visualTemplate]);

  // Visual especificamente para o preview (sempre respeita exatamente o template escolhido)
  const previewVisual = useMemo(() => visualTemplate, [visualTemplate]);

  // Carregar taxonomia e montar opções (mesma lógica dos Filtros de Busca)
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

  // Atualizar subáreas quando a área muda
  useEffect(() => {
    const humanize = (str='') => str.replace(/_/g,' ').toLowerCase().replace(/\b\w/g,c=>c.toUpperCase()).replace(/\b(De|Da|Do|E)\b/g,m=>m.toLowerCase());
    if (!formData.area) { setSubareasList([]); return; }
    const subs = Array.isArray(taxonomy[formData.area]) ? taxonomy[formData.area] : [];
    setSubareasList(subs.map(s => ({ value: s, label: humanize(s) })));
    // resetar subárea se sair da lista
    if (formData.subarea && !subs.includes(formData.subarea)) {
      setFormData(prev => ({ ...prev, subarea: '' }));
    }
  }, [formData.area, taxonomy]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const finalExperiences = hasNoExperience ? [] : formData.experiences;
      
      // Estrutura correta de dados para o backend
      const resumeData = {
        title: formData.title || 'Meu Currículo',
        template: formData.template || 'default',
        is_public: formData.is_public || true,
        personal_info: {
          name: formData.name,
          birthDate: formData.birthDate,
          age: formData.age,
          phone: formData.phone,
          email: formData.email,
          photo: formData.photo,
          photoShape: formData.photoShape || 'circle',
          // Persistir localização dentro de personal_info
          address: formData.address || null,
          city: formData.city || null,
          area: formData.area || null,
          subarea: formData.subarea || null,
          linkedin_url: formData.linkedin_url || null,
          github_url: formData.github_url || null,
          custom_url: formData.custom_url || null,
        },
        experience: finalExperiences,
        education: formData.education || [],
        skills: formData.skills || [],
        languages: formData.languages || [],
        projects: formData.projects || [],
        courses: formData.courses || [],
      };

      console.log('📋 Dados do currículo a serem enviados:', resumeData);

      // Usar a API ao invés do localStorage
      const response = await resumes.create(resumeData);

      toast({
        title: 'Currículo criado com sucesso!',
        description: 'Seu currículo foi salvo e está pronto para ser enviado.'
      });

      navigate('/my-resumes');
    } catch (error) {
      console.error('❌ Erro ao criar currículo:', error);
      
      // Fallback para localStorage se API falhar
      try {
        const resume = {
          id: Date.now().toString(),
          userId: user.id,
          ...formData,
          experiences: finalExperiences,
          hasNoExperience,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        const resumes = JSON.parse(localStorage.getItem('curriculoja_resumes') || '[]');
        resumes.push(resume);
        localStorage.setItem('curriculoja_resumes', JSON.stringify(resumes));

        toast({
          title: 'Currículo criado com sucesso!',
          description: 'Seu currículo foi salvo localmente.'
        });

        navigate('/my-resumes');
      } catch (fallbackError) {
        toast({
          title: 'Erro ao criar currículo',
          description: 'Ocorreu um erro inesperado. Tente novamente.',
          variant: 'destructive'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNoExperienceChange = (checked) => {
    setHasNoExperience(checked);
    if (checked) {
      setFormData(prev => ({ ...prev, experiences: [] }));
    } else {
      setFormData(prev => ({ ...prev, experiences: [{ id: 1, company: '', position: '', period: '', description: '' }] }));
    }
  };

  // Estilos dos toggles por template (padrão, moderno, clássico, minimal)
  const toggleStyles = React.useMemo(() => {
    const styles = {
      default: {
        public: {
          container: 'flex items-center gap-3 p-3 rounded-xl border border-[#30363d] bg-[#0d1117]/60 hover:bg-[#161b22] hover:border-[#3d444d] transition-colors duration-200 cursor-pointer',
          input: 'w-4 h-4 rounded border-[#30363d] text-blue-600 shadow-sm focus:ring-2 focus:ring-blue-500/40 focus:outline-none',
          label: 'text-sm font-medium text-gray-200'
        },
        noExp: {
          container: 'flex items-center gap-3 my-4 px-3 py-2 rounded-lg border border-[#30363d] bg-[#0d1117]/60 hover:bg-[#161b22] hover:border-[#3d444d] transition-colors duration-200',
          checkbox: 'w-4 h-4',
          label: 'text-sm font-medium leading-none cursor-pointer flex-1 text-gray-200',
          dot: 'bg-blue-500'
        }
      },
      modern: {
        public: {
          container: 'flex items-center gap-3 p-3 rounded-2xl border border-black/5 bg-white/60 backdrop-blur hover:bg-white transition-all cursor-pointer',
          input: 'w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-2 focus:ring-indigo-200 focus:outline-none',
          label: 'text-sm font-medium text-slate-700'
        },
        noExp: {
          container: 'flex items-center gap-3 my-4 px-3 py-2 rounded-xl border border-black/5 bg-white/60 backdrop-blur hover:bg-white transition-all',
          checkbox: 'w-4 h-4',
          label: 'text-sm font-medium leading-none cursor-pointer flex-1 text-slate-700',
          dot: 'bg-indigo-500'
        }
      },
      classic: {
        public: {
          container: 'flex items-center gap-3 p-3 rounded-2xl border border-stone-200 bg-stone-50 hover:bg-stone-100 transition-colors cursor-pointer',
          input: 'w-4 h-4 rounded border-stone-400 text-stone-800 focus:ring-2 focus:ring-stone-300 focus:outline-none',
          label: 'text-sm font-semibold text-stone-800'
        },
        noExp: {
          container: 'flex items-center gap-2 my-2 px-2 py-1.5 rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 transition-colors',
          checkbox: '',
          label: 'text-sm font-semibold leading-none cursor-pointer flex-1 text-stone-800',
          dot: 'bg-stone-600'
        }
      },
      minimal: {
        public: {
          container: 'flex items-center gap-3 p-3 rounded-md border border-gray-200 bg-white hover:bg-gray-100 transition-colors cursor-pointer',
          input: 'w-4 h-4 rounded-none border-black text-black focus:ring-2 focus:ring-black/30 focus:outline-none',
          label: 'text-sm font-medium text-black'
        },
        noExp: {
          container: 'flex items-center gap-2 my-2 px-2 py-1.5 rounded-md border border-gray-200 bg-white hover:bg-gray-100 transition-colors',
          checkbox: '',
          label: 'text-sm font-medium leading-none cursor-pointer flex-1 text-black',
          dot: 'bg-black'
        }
      },
      professional: {
        public: {
          container: 'flex items-center gap-3 p-3 rounded-2xl border border-slate-200 bg-slate-50/60 hover:bg-slate-100 transition-colors cursor-pointer',
          input: 'w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-200 focus:outline-none',
          label: 'text-sm font-medium text-slate-700'
        },
        noExp: {
          container: 'flex items-center gap-3 my-4 px-4 py-2.5 rounded-2xl border border-slate-200 bg-slate-50/60 hover:bg-slate-100 transition-colors',
          checkbox: 'w-4 h-4',
          label: 'text-sm font-medium leading-none cursor-pointer flex-1 text-slate-700',
          dot: 'bg-blue-500'
        }
      },
      colorful: {
        public: {
          container: 'flex items-center gap-3 p-3 rounded-2xl border-2 border-blue-200 bg-blue-50/50 hover:bg-blue-100 transition-all cursor-pointer',
          input: 'w-4 h-4 rounded border-blue-300 text-blue-600 focus:ring-2 focus:ring-blue-200 focus:outline-none',
          label: 'text-sm font-medium text-slate-700'
        },
        noExp: {
          container: 'flex items-center gap-3 my-4 px-4 py-2.5 rounded-2xl border-2 border-slate-200 bg-white hover:bg-slate-50 transition-all',
          checkbox: 'w-4 h-4',
          label: 'text-sm font-medium leading-none cursor-pointer flex-1 text-slate-700',
          dot: 'bg-blue-500'
        }
      }
    };
    return styles[visualTemplate] || styles.default;
  }, [visualTemplate]);

  const previewBubbleStyles = useMemo(() => {
    const base = 'relative flex items-center justify-center w-14 h-14 rounded-full transition-all duration-300 shadow-lg hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 group';
    const map = {
      default: `${base} bg-[#1f6feb] hover:bg-[#1158c7] text-white focus-visible:ring-[#1f6feb]/50 focus-visible:ring-offset-[#0d1117]`,
      modern: `${base} bg-indigo-600 hover:bg-indigo-700 text-white focus-visible:ring-indigo-300 focus-visible:ring-offset-white`,
      classic: `${base} bg-stone-800 hover:bg-stone-900 text-stone-100 focus-visible:ring-stone-400 focus-visible:ring-offset-stone-200`,
      minimal: `${base} bg-black hover:bg-gray-900 text-white focus-visible:ring-gray-400 focus-visible:ring-offset-white`,
      professional: `${base} bg-[#2563eb] hover:bg-[#1d4ed8] text-white focus-visible:ring-blue-300 focus-visible:ring-offset-slate-50`,
      colorful: `${base} bg-blue-600 hover:bg-blue-700 text-white focus-visible:ring-blue-300 focus-visible:ring-offset-white`,
    };
    return map[visualTemplate] || map.default;
  }, [visualTemplate]);

  const previewPeekPalette = useMemo(() => {
    const map = {
      default: {
        card: 'bg-[#0d1117]/95 border-[#30363d] backdrop-blur',
        badge: 'bg-[#21262d] text-gray-300',
        container: 'text-gray-100',
        avatar: 'bg-[#0d1117] border border-[#30363d] text-amber-200',
        chip: 'bg-[#1f6feb]/15 text-[#58a6ff] border border-[#58a6ff]/30',
        muted: 'text-gray-400',
        accent: 'bg-[#1f6feb]',
      },
      modern: {
        card: 'bg-white/95 border-indigo-200/50 backdrop-blur',
        badge: 'bg-indigo-50 text-indigo-600',
        container: 'text-slate-800',
        avatar: 'bg-indigo-100 text-indigo-600',
        chip: 'bg-indigo-100 text-indigo-600 border border-indigo-200',
        muted: 'text-slate-500',
        accent: 'bg-gradient-to-r from-indigo-500 to-purple-500',
      },
      classic: {
        card: 'bg-stone-50/95 border-stone-300 backdrop-blur',
        badge: 'bg-stone-200 text-stone-700',
        container: 'text-stone-900',
        avatar: 'bg-stone-200 text-stone-700',
        chip: 'bg-stone-200 text-stone-800 border border-stone-300',
        muted: 'text-stone-500',
        accent: 'bg-stone-600',
      },
      minimal: {
        card: 'bg-white/95 border-gray-200 backdrop-blur',
        badge: 'bg-gray-100 text-gray-600',
        container: 'text-gray-900',
        avatar: 'bg-gray-900 text-white',
        chip: 'bg-gray-200 text-gray-800 border border-gray-300',
        muted: 'text-gray-500',
        accent: 'bg-gray-900',
      },
      professional: {
        card: 'bg-white/95 border-slate-200 backdrop-blur shadow-[0_16px_40px_rgba(15,23,42,0.06)]',
        badge: 'bg-sky-50/60 text-sky-700 border border-sky-100',
        container: 'text-slate-900',
        avatar: 'bg-slate-100 text-slate-600',
        chip: 'bg-slate-50/60 text-slate-700 border border-slate-200',
        muted: 'text-slate-500',
        accent: 'bg-[#2563eb]',
      },
      colorful: {
        card: 'bg-white/95 border-blue-200/60 backdrop-blur shadow-[0_18px_45px_rgba(37,99,235,0.1)]',
        badge: 'bg-blue-50 text-blue-600',
        container: 'text-slate-900',
        avatar: 'bg-blue-100 text-blue-600',
        chip: 'bg-blue-100 text-blue-600 border border-blue-200',
        muted: 'text-slate-500',
        accent: 'bg-gradient-to-r from-blue-500 via-violet-500 to-teal-500',
      },
    };
    return map[previewVisual] || map.default;
  }, [previewVisual]);

  const formatTaxonomyLabel = (value = '') =>
    value
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (char) => char.toUpperCase());

  const previewName = (formData.name || '').trim() || 'Seu nome aqui';
  const previewAreaLabel = formatTaxonomyLabel(formData.area || '');
  const previewSubareaLabel = formatTaxonomyLabel(formData.subarea || '');
  const previewArea = previewAreaLabel || 'Área do currículo';
  const previewSubarea = previewSubareaLabel;
  const primaryExperience = !hasNoExperience && Array.isArray(formData.experiences) && formData.experiences.length > 0
    ? formData.experiences[0]
    : null;
  

  if (!user || user.type === 'company') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="bg-white p-8 rounded-lg shadow-lg text-center">
            <h2 className="text-xl font-bold mb-4">Acesso Negado</h2>
            <p>Esta página é restrita para candidatos.</p>
            <Link to="/"><Button className="mt-4">Voltar para Home</Button></Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
  <TemplateThemeProvider name={visualTemplate}>
      <Helmet>
        <title>Criar Currículo - CurrículoJá</title>
        <meta name="description" content="Crie seu currículo profissional em poucos minutos com nossa ferramenta intuitiva." />
      </Helmet>

  <div className={`min-h-screen py-8 px-4 ${templateTheme.pageBg} template-${visualTemplate}`}>
        <div className="max-w-6xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            {/* DEV: botão de teste */}
            <div className="flex justify-center mb-4">
              <button
                type="button"
                onClick={fillRandom}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-100 border-2 border-amber-300 text-amber-800 text-sm font-bold hover:bg-amber-200 transition-all duration-200"
              >
                🎲 Preencher com dados aleatórios
              </button>
            </div>

            <div className="text-center mb-8">
              <h1 data-tour="resume.title" className={`text-4xl font-bold ${templateTheme.headerText.includes('text-') ? templateTheme.headerText : templateTheme.headerText + ' bg-clip-text text-transparent'}`}>
                Criar Novo Currículo
              </h1>
            </div>

            <div className="grid grid-cols-1 gap-6 items-start">
              {/* Formulário */}
              <div className="w-full max-w-3xl mx-auto">
              <form onSubmit={handleSubmit} className="space-y-8" data-tour="resume.form">
              {/* Configurações do Currículo */}
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
                <ResumeCard title={<>Configurações do Currículo</>} icon={Settings} color={templateTheme.accents.settings}>
                  <div className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="title" className={visualTemplate === 'colorful' ? 'text-sm font-medium text-slate-700' : undefined}>
                          Título do Currículo <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="title"
                          type="text"
                          value={formData.title}
                          onChange={(e) => handleFieldChange('title', e.target.value)}
                          placeholder="Ex: Meu Currículo Profissional"
                          required
                          className={visualTemplate === 'colorful' ? 'h-11 rounded-xl border-2 border-slate-200 focus:border-blue-300 bg-white text-slate-800' : undefined}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="template" className={visualTemplate === 'colorful' ? 'text-sm font-medium text-slate-700' : undefined}>
                          Template
                        </Label>
                        <Combobox
                          id="template"
                          options={templateOptions}
                          value={formData.template}
                          onChange={(value) => handleFieldChange('template', value)}
                          placeholder="Escolha um template..."
                          searchable={true}
                        />
                      </div>
                    </div>
                    <div className="pt-2">
                      <label className={`${toggleStyles.public.container}`}>
                        <input
                          type="checkbox"
                          role="switch"
                          checked={formData.is_public}
                          onChange={(e) => handleFieldChange('is_public', e.target.checked)}
                          className={`${toggleStyles.public.input}`}
                        />
                        <span className={`${toggleStyles.public.label}`}>Tornar currículo público (visível para empresas)</span>
                      </label>
                    </div>
                  </div>
                </ResumeCard>
              </motion.div>
              
              <PersonalInfoSection formData={formData} setFormData={setFormData} cardColor={templateTheme.accents.personal} />
              <EducationSection value={formData.education} onChange={(value) => handleFieldChange('education', value)} cardColor={templateTheme.accents.education} />
              
              <div className={`${toggleStyles.noExp.container}`} data-tour="resume.noexp">
                <Checkbox 
                  id="noExperience" 
                  checked={hasNoExperience} 
                  onCheckedChange={handleNoExperienceChange}
                  className={`${toggleStyles.noExp.checkbox}`}
                />
                <label htmlFor="noExperience" className={`${toggleStyles.noExp.label}`}>
                  Não tenho experiência profissional
                </label>
                {hasNoExperience && (
                  <div className={`w-2 h-2 ${toggleStyles.noExp.dot} rounded-full animate-pulse`}></div>
                )}
              </div>

              <AnimatePresence>
                {!hasNoExperience && (
                  <ExperienceSection experiences={formData.experiences} onChange={(value) => handleFieldChange('experiences', value)} cardColor={templateTheme.accents.experience} />
                )}
              </AnimatePresence>

              <ProjectsSection projects={formData.projects} onChange={(value) => handleFieldChange('projects', value)} cardColor={templateTheme.accents.projects} />
              <CoursesSection courses={formData.courses} onChange={(value) => handleFieldChange('courses', value)} cardColor={templateTheme.accents.courses} />
              <LanguagesSection languages={formData.languages} onChange={(value) => handleFieldChange('languages', value)} cardColor={templateTheme.accents.languages} />

              {/* Área e Sub-área */}
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
                <ResumeCard title={<>Área de Atuação</>} icon={Layers} color={templateTheme.accents.area}>
                  <div className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="area">Área</Label>
                        <Combobox
                          id="area"
                          options={areasList}
                          value={formData.area}
                          onChange={(value) => handleFieldChange('area', value)}
                          placeholder="Selecione a área..."
                          searchable={true}
                          emptyMessage="Nenhuma área encontrada"
                        />
                      </div>
                      <div>
                        <Label htmlFor="subarea">Sub-área</Label>
                        <Combobox
                          id="subarea"
                          options={subareasList}
                          value={formData.subarea}
                          onChange={(value) => handleFieldChange('subarea', value)}
                          placeholder={formData.area ? 'Selecione a sub-área...' : 'Escolha uma área primeiro'}
                          searchable={true}
                          disabled={!formData.area}
                          emptyMessage={formData.area ? 'Sem sub-áreas para esta área' : 'Escolha uma área'}
                        />
                      </div>
                    </div>
                  </div>
                </ResumeCard>
              </motion.div>
              
              <div className="flex justify-center">
                <Button 
                  type="submit" 
                  className={`${templateTheme.primaryBtn} text-white shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl px-8 py-3`} 
                  disabled={loading}
                  data-tour="resume.save"
                >
                  {loading ? 'Salvando...' : <><Save className="w-4 h-4 mr-2" /> Salvar Currículo</>}
                </Button>
              </div>
            </form>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
      {/* Floating preview orb anchored to the right */}
      <div
        className="fixed right-4 bottom-4 md:right-6 md:bottom-auto md:top-1/2 md:-translate-y-1/2 z-40 flex flex-col items-end gap-3"
        onMouseEnter={() => setIsPreviewPeekVisible(true)}
        onMouseLeave={() => setIsPreviewPeekVisible(false)}
      >
        <AnimatePresence>
          {isPreviewPeekVisible && !isPreviewExpanded && (
            <motion.div
              initial={{ opacity: 0, x: 16, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 16, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="hidden md:block cursor-pointer"
              onClick={() => {
                setIsPreviewExpanded(true);
                setIsPreviewPeekVisible(false);
              }}
            >
              <div className={`relative w-[240px] rounded-3xl shadow-xl border ${previewPeekPalette.card}`}>
                <div className={`absolute left-4 top-4 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.32em] rounded-full shadow-sm ${previewPeekPalette.badge}`}>
                  Prévia
                </div>
                <div className={`${previewPeekPalette.container} p-5 pt-14 pb-6 space-y-4 rounded-3xl`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center overflow-hidden ${previewPeekPalette.avatar}`}>
                      {formData.photo ? (
                        <img src={formData.photo} alt="Foto do candidato" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-5 h-5" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold leading-snug truncate">{previewName}</p>
                      <p className={`text-[11px] ${previewPeekPalette.muted} truncate`}>{previewArea}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`px-3 py-1 rounded-2xl text-[10px] font-semibold uppercase tracking-widest ${previewPeekPalette.chip}`}>
                      {previewArea}
                    </span>
                    {previewSubarea && (
                      <span className={`px-3 py-1 rounded-2xl text-[10px] font-semibold uppercase tracking-widest ${previewPeekPalette.chip}`}>
                        {previewSubarea}
                      </span>
                    )}
                  </div>
                  {primaryExperience ? (
                    <div className="space-y-1.5">
                      <p className={`text-[10px] font-semibold uppercase tracking-[0.4em] ${previewPeekPalette.muted}`}>Última experiência</p>
                      <p className="text-sm font-medium leading-snug line-clamp-2">{primaryExperience.position || 'Cargo informado'}</p>
                      {(primaryExperience.company || primaryExperience.period) && (
                        <p className={`text-[11px] ${previewPeekPalette.muted} leading-tight`}>{[primaryExperience.company, primaryExperience.period].filter(Boolean).join(' • ')}</p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <p className={`text-[10px] font-semibold uppercase tracking-[0.4em] ${previewPeekPalette.muted}`}>Preview em tempo real</p>
                      <p className={`text-[11px] ${previewPeekPalette.muted} leading-relaxed`}>
                        Continue preenchendo o formulário e abra a versão completa clicando no ícone.
                      </p>
                    </div>
                  )}
                  <div className={`h-1 rounded-full ${previewPeekPalette.accent}`} />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <button
          type="button"
          onClick={() => {
            setIsPreviewExpanded(true);
            setIsPreviewPeekVisible(false);
          }}
          onFocus={() => setIsPreviewPeekVisible(true)}
          onBlur={() => setIsPreviewPeekVisible(false)}
          onTouchStart={() => setIsPreviewPeekVisible(true)}
          onTouchEnd={() => setIsPreviewPeekVisible(false)}
          className={previewBubbleStyles}
          aria-label="Abrir preview do currículo"
          data-tour="resume.preview"
        >
          <span className="absolute right-full mr-3 px-3 py-1 rounded-full bg-black/80 text-white text-xs font-medium opacity-0 translate-y-1/2 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity whitespace-nowrap">
            Ver preview
          </span>
          <FileText className="w-6 h-6" />
          <span className="absolute -bottom-1 -right-1 flex items-center justify-center w-5 h-5 rounded-full bg-black/20 text-white backdrop-blur">
            <Maximize2 className="w-3 h-3" />
          </span>
        </button>
      </div>

      {/* Preview expandido em modo overlay */}
      <AnimatePresence>
        {isPreviewExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4 py-6"
            onClick={() => setIsPreviewExpanded(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.25 }}
              className="relative max-w-5xl w-full max-h-[90vh] overflow-hidden rounded-3xl shadow-xl border border-black/10 bg-white"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-black/5 bg-white/80 backdrop-blur-sm">
                <h3 className="text-lg font-semibold text-gray-900">Preview do Currículo</h3>
                <button
                  type="button"
                  onClick={() => setIsPreviewExpanded(false)}
                  className="rounded-full p-2 bg-black/5 hover:bg-black/10 transition-colors"
                  aria-label="Fechar preview"
                >
                  <Minimize2 className="w-5 h-5" />
                </button>
              </div>
              <div className="overflow-y-auto max-h-[calc(90vh-76px)]">
                <ResumeLivePreview
                  data={{
                    name: formData.name,
                    birthDate: formData.birthDate,
                    age: formData.age,
                    phone: formData.phone,
                    email: formData.email,
                        address: formData.address,
                        city: formData.city,
                    photo: formData.photo,
                    photoShape: formData.photoShape || 'circle',
                    education: formData.education,
                    experiences: hasNoExperience ? [] : formData.experiences,
                    courses: formData.courses,
                    languages: formData.languages,
                    area: formData.area,
                    subarea: formData.subarea,
                    projects: formData.projects,
                    linkedin_url: formData.linkedin_url,
                    github_url: formData.github_url,
                    custom_url: formData.custom_url,
                  }}
                  visual={previewVisual}
                  accents={templateTheme.accents}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </TemplateThemeProvider>
  );
};

export default CreateResume;