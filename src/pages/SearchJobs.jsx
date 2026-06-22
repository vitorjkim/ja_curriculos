// CLEAN REBUILD OF FILE (single canonical implementation)
import React, { useEffect, useState, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { jobsAPI, companiesAPI, usersAPI, externalJobsAPI, chatAPI } from '@/lib/api';
import { stripHtml } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Combobox } from '@/components/ui/combobox';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Search, RefreshCw, ExternalLink, Filter, MapPin, Briefcase, Grid, Calendar, Building, ChevronsRight, MessageSquare, Bookmark, Star, Zap, DollarSign, List, Layers, Tag, Award, Share2, Copy, MessageCircle, Send, Mail, Linkedin, Users, Lock, LogIn } from 'lucide-react';
import { FaRegHandshake } from 'react-icons/fa';
import { partnershipsApi } from '../services/partnershipsApi';

// ---- Constants & Helpers ----
const AREA_LABELS = { saude:'Saúde', educacao:'Educação', engenharia:'Engenharia', administracao:'Administração', vendas_marketing:'Vendas / Marketing', recursos_humanos:'Recursos Humanos', financas:'Finanças', design:'Design', logistica:'Logística', producao:'Produção', mecanica:'Mecânica', automacao:'Automação', outros:'Outros', tecnologia:'Tecnologia', administrativo:'Administrativo', financeiro:'Financeiro', marketing:'Marketing', vendas:'Vendas', operacional:'Operacional', direito:'Direito' };
const LABEL_TO_KEY = Object.entries(AREA_LABELS).reduce((acc,[k,v])=>{ acc[v.toLowerCase()] = k; return acc; }, {});
const humanize = (str='') => str.replace(/_/g,' ').toLowerCase().replace(/\b\w/g,c=>c.toUpperCase()).replace(/\b(De|Da|Do|E)\b/g,m=>m.toLowerCase());
const jobTypes = ['Todos','clt','pj','estagio','temporario'];
const workTypes = ['Todos','presencial','hibrido','remoto'];
const experienceLevels = ['Todos','estagio','junior','pleno','senior'];
const CONTRACT_TYPE_LABELS = { Todos:'Todos os tipos', clt:'CLT', pj:'PJ', estagio:'Estágio', temporario:'Temporário' };
const WORK_TYPE_LABELS = { Todos:'Todas as modalidades', presencial:'Presencial', hibrido:'Híbrido', remoto:'Remoto' };
const EXPERIENCE_LEVEL_LABELS = { Todos:'Todos os níveis', estagio:'Estágio', junior:'Júnior', pleno:'Pleno', senior:'Sênior' };

const formatSalaryRange = (job) => {
  if(!job) return null;
  // Considerar salário fixo quando disponível
  if (job.salary_fixed != null && job.salary_fixed !== undefined && job.salary_fixed !== '') {
    const n = Number(job.salary_fixed);
    if (!Number.isNaN(n)) return `R$ ${n}`;
  }
  let { salary_min, salary_max } = job;
  if(salary_min && salary_max && Number(salary_min) > Number(salary_max)) {
    [salary_min, salary_max] = [salary_max, salary_min];
  }
  if(salary_min && salary_max) {
    if(Number(salary_min) === Number(salary_max)) return `R$ ${salary_min}`; // salário fixo
    return `R$ ${salary_min} - R$ ${salary_max}`;
  }
  if(salary_min) return `A partir de R$ ${salary_min}`;
  if(salary_max) return `Até R$ ${salary_max}`;
  return null;
};

// Garantir números seguros ao renderizar (evita NaN em children)
const safeNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const HighlightBadge = ({ type }) => {
  if (type === 'school') {
    return (
      <div className="mt-1 inline-flex items-center text-[11px] font-semibold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 ring-1 ring-amber-100 shadow-sm">
        <Star className="w-3.5 h-3.5 mr-1 text-amber-700" />
        Indicado pela Escola
      </div>
    );
  }
  if (type === 'company') {
    return (
      <div className="mt-1 inline-flex items-center text-[11px] font-semibold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200 ring-1 ring-blue-100 shadow-sm">
        <Zap className="w-3.5 h-3.5 mr-1 text-blue-600" />
        Destaque da Empresa
      </div>
    );
  }
  // Para aluno: badge genérico "Vaga destacada"
  if (type === 'highlighted') {
    return (
      <div className="mt-1 inline-flex items-center text-[11px] font-semibold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 ring-1 ring-amber-100 shadow-sm">
        <Star className="w-3.5 h-3.5 mr-1 text-amber-600" />
        Vaga destacada
      </div>
    );
  }
  return null;
};

// Helper para exibir rótulo de área interna (converte key em label amigável)
const getAreaLabel = (areaKey='') => AREA_LABELS[areaKey] || humanize(areaKey);
const getSubareaLabel = (sub='') => humanize(sub);
// Evita exibir rótulos inválidos (ex.: NaN)
const safeLabel = (v) => {
  if (v === null || v === undefined) return '';
  const s = String(v).trim();
  if (!s) return '';
  if (s.toLowerCase() === 'nan') return '';
  return s;
};

const JobHighlightCard = ({ job, type, full = false, user, isCandidate, followedCompanies, onFollowCompany, companyImage, partnerCompanyIds = new Set() }) => {
  const navigate = useNavigate();
  const isPartnerCompany = partnerCompanyIds.has(String(job.company_id));
  const open = () => navigate(`/job/${job.id}`);
  const handleClick = (e) => {
    const interactive = e.target.closest('a, button, input, textarea, select, [role="button"]');
    if (interactive && interactive !== e.currentTarget) return;
    open();
  };
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
  };
  const salaryText = formatSalaryRange(job);
  const ct = safeLabel(job.contract_type);
  const wt = safeLabel(job.work_type);
  const el = safeLabel(job.experience_level);
  const areaKey = safeLabel(job.area);
  // Design responsivo igual às vagas normais, mas com cores amarelas
  return (
  <Card
    className="shadow-md hover:shadow-lg transition-all duration-300 group overflow-hidden rounded-2xl bg-white border-2 border-gray-200 h-full flex flex-col cursor-pointer focus:outline-none"
    role="button"
    tabIndex={0}
    onClick={handleClick}
    onKeyDown={handleKeyDown}
  >
      <CardContent className="p-2 md:p-3 flex flex-col h-full">
        <div className="flex justify-between items-start mb-2">
          <div className="flex-1 pr-4">
            <div className="flex items-start space-x-2.5 mb-2">
              {/* Logo da empresa */}
              {(() => {
                let shape = 'circle';
                try {
                  if (job?.company_id) {
                    shape = localStorage.getItem('company_avatar_shape_'+job.company_id) || 'circle';
                  }
                } catch {}
                const roundedClass = shape === 'circle' ? 'rounded-full' : 'rounded-xl';
                return (
                  <Link to={job.company_id ? `/company/${job.company_id}` : '#'} onClick={(e) => { e.stopPropagation(); if (!job.company_id) e.preventDefault(); }} className={`w-11 h-11 ${roundedClass} flex items-center justify-center flex-shrink-0 overflow-hidden hover:ring-2 hover:ring-amber-300 transition-all ${companyImage ? '' : 'bg-white border border-gray-200'}`}>
                    {companyImage ? (
                      <img src={companyImage} alt="Logo" className="w-full h-full object-contain" />
                    ) : (
                      <Building className="w-5 h-5 text-amber-700" />
                    )}
                  </Link>
                );
              })()}
              <div className="flex-1 min-w-0">
                <h3 className="text-[15px] md:text-[17px] font-bold transition-colors duration-300 mb-1 leading-tight text-amber-700 group-hover:text-amber-800 group-hover:underline group-hover:decoration-2 underline-offset-2 decoration-amber-700 antialiased line-clamp-2">{job.title}</h3>
                <div className="flex items-center gap-1 md:gap-2 flex-wrap">
                  <Link to={job.company_id ? `/company/${job.company_id}` : '#'} onClick={(e) => { e.stopPropagation(); if (!job.company_id) e.preventDefault(); }} className="text-gray-800 font-semibold text-[12px] md:text-[14px] leading-snug hover:text-amber-600 hover:underline transition-colors truncate max-w-[150px] md:max-w-none">{job.company_name}</Link>
                  {isPartnerCompany && <span className="inline-flex items-center text-[10px] md:text-[11px] font-bold text-emerald-700 bg-emerald-50 px-1.5 md:px-2.5 py-0.5 md:py-1 rounded-full border md:border-2 border-emerald-200"><FaRegHandshake className="w-3 h-3 md:w-3.5 md:h-3.5 mr-0.5 md:mr-1 text-emerald-600" /><span className="hidden sm:inline">Parceira</span></span>}
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-end gap-2 flex-shrink-0">
            <div className="flex flex-col items-end gap-1">
              {job.is_agency_job && job.external_url ? (
                <a href={job.external_url} target="_blank" rel="noopener noreferrer" className="flex-shrink-0" onClick={(e)=> { e.stopPropagation(); trackJobView(job.id); }} data-tour="jobs.viewButton">
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all duration-300 rounded-full h-8 md:h-9 px-3 md:px-4 text-[11px] md:text-[12px] flex items-center">
                    <span className="mr-1 md:mr-1.5">Ver Vaga</span>
                    <ChevronsRight className="h-3.5 w-3.5 md:h-4 md:w-4" />
                  </Button>
                </a>
              ) : (
                <Link to={`/job/${job.id}`} className="flex-shrink-0" onClick={(e)=> e.stopPropagation()} data-tour="jobs.viewButton">
                  <Button className="bg-amber-500 hover:bg-amber-600 text-white shadow-md hover:shadow-lg transition-all duration-300 rounded-full h-8 md:h-9 px-3 md:px-4 text-[11px] md:text-[12px] flex items-center">
                    <span className="mr-1 md:mr-1.5">Ver Vaga</span>
                    <ChevronsRight className="h-3.5 w-3.5 md:h-4 md:w-4" />
                  </Button>
                </Link>
              )}
              {job.is_agency_job && (
                <div
                  className="relative w-full flex items-center justify-center h-[22px] text-[10px] font-semibold uppercase tracking-wide rounded-xl px-2 ring-1 ring-orange-200/70 bg-gradient-to-r from-orange-50 to-amber-50 text-orange-900 shadow-[inset_0_-1px_0_rgba(0,0,0,0.04)]"
                  title="Vaga de agência de estágio"
                >
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-orange-700 to-amber-700">Agência</span>
                </div>
              )}
              {job.is_community && (
                <div
                  className="relative w-full flex items-center justify-center h-[22px] text-[10px] font-semibold uppercase tracking-wide rounded-xl px-2 ring-1 ring-emerald-200/70 bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-900 shadow-[inset_0_-1px_0_rgba(0,0,0,0.04)]"
                  title="Vaga cadastrada pela comunidade (Admin)"
                >
                  <Users className="w-3.5 h-3.5 mr-1.5 text-emerald-700" />
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-700 to-teal-700">Comunidade</span>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="mb-2 md:mb-2.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 md:gap-1.5 mb-1 md:mb-1.5">
            {job.location && (<div className="flex items-center text-gray-900 bg-blue-50 px-1.5 md:px-2 py-1 md:py-1.5 rounded-xl md:rounded-2xl border border-blue-100 text-[11px] md:text-[12.5px]"><MapPin className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1 md:mr-1.5 text-blue-600 flex-shrink-0" /><span className="font-medium truncate">{job.location}</span></div>)}
            {salaryText && (<div className="flex items-center text-gray-900 bg-green-50 px-1.5 md:px-2 py-1 md:py-1.5 rounded-xl md:rounded-2xl border border-green-100 text-[11px] md:text-[12.5px]"><DollarSign className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1 md:mr-1.5 text-green-600 flex-shrink-0" /><span className="font-medium truncate">{salaryText}</span></div>)}
          </div>
          <div className="flex flex-wrap gap-1 md:gap-1.5 text-[10px] md:text-[11.5px]">
            {ct && (<div className="inline-flex items-center text-gray-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100"><Briefcase className="w-3 h-3 mr-1 text-purple-700" /><span className="font-medium tracking-tight">{ct.toUpperCase()}</span></div>)}
            {wt && (<div className="inline-flex items-center text-gray-700 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-100"><Calendar className="w-3 h-3 mr-1 text-orange-600" /><span className="font-medium tracking-tight">{wt.charAt(0).toUpperCase()+wt.slice(1)}</span></div>)}
            {el && (<div className="inline-flex items-center text-gray-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100"><Award className="w-3.5 h-3.5 mr-1 text-indigo-600" /><span className="font-medium tracking-tight">{el.charAt(0).toUpperCase()+el.slice(1)}</span></div>)}
            {areaKey && (<div className="inline-flex items-center text-gray-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-100"><Layers className="w-3 h-3 mr-1 text-teal-600" /><span className="font-medium tracking-tight">{getAreaLabel(areaKey)}</span></div>)}
          </div>
        </div>
        <div className="mt-auto pt-2 border-t border-gray-200">
          {job.description
            ? <p className="text-gray-800 text-[14px] leading-snug line-clamp-2">{stripHtml(job.description)}</p>
            : null}
        </div>
      </CardContent>
    </Card>
  );
};

// ---- Component ----
const SearchJobs = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const isSchool = user?.type === 'school';
  const isCandidate = user?.type === 'candidate';
  // Alguns ambientes usam outros rótulos para alunos (ex.: 'student', 'aluno', 'estudante')
  const isStudent = isCandidate || ['student','aluno','estudante'].includes(String(user?.type||'').toLowerCase());

  const [jobs, setJobs] = useState([]);
  const [companies, setCompanies] = useState([]);
  // Cache de logos carregadas sob demanda (id -> dataURL/URL)
  const [companyLogos, setCompanyLogos] = useState({});
  const [filteredJobs, setFilteredJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [followedCompanies, setFollowedCompanies] = useState(new Set());
  const [savedCandidates, setSavedCandidates] = useState(new Set());
  const [filters, setFilters] = useState({ location:'', contract_type:'Todos', work_type:'Todos', experience_level:'Todos', area:'Todos', subarea:'Todos' });
  const [showFilters, setShowFilters] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [highlightedJobIds, setHighlightedJobIds] = useState([]);
  const [highlightedSchoolJobIds, setHighlightedSchoolJobIds] = useState([]);
  const [companyHighlightedJobIds, setCompanyHighlightedJobIds] = useState([]);
  const [classOptions, setClassOptions] = useState([]);
  const [schoolClassFilter, setSchoolClassFilter] = useState('all'); // filtro de turma para destaques da escola
  const [selectingJob, setSelectingJob] = useState(null);
  const [selectedClasses, setSelectedClasses] = useState([]);
  // Compartilhar vaga (escola)
  const [shareOpen, setShareOpen] = useState(false);
  const [shareJob, setShareJob] = useState(null);
  const [schoolGroups, setSchoolGroups] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [selectedGroupKey, setSelectedGroupKey] = useState('');
  const [sharing, setSharing] = useState(false);
  // Escola: aba de visualização (Vagas / Vagas destacadas)
  const [schoolTab, setSchoolTab] = useState('vagas'); // 'vagas' | 'destaques'
  const [schoolHighlights, setSchoolHighlights] = useState([]);
  const [filteredSchoolHighlights, setFilteredSchoolHighlights] = useState([]);
  const [loadingSchoolHighlights, setLoadingSchoolHighlights] = useState(false);
  // Destaques feitos por empresas direcionados para a escola
  const [schoolCompanyHighlights, setSchoolCompanyHighlights] = useState([]);
  const [filteredSchoolCompanyHighlights, setFilteredSchoolCompanyHighlights] = useState([]);
  const [loadingSchoolCompanyHighlights, setLoadingSchoolCompanyHighlights] = useState(false);
  // IDs das empresas parceiras (para escolas)
  const [partnerCompanyIds, setPartnerCompanyIds] = useState(new Set());
  // Abas internas para destaques: escola x empresas
  const [highlightsInnerTab, setHighlightsInnerTab] = useState('school'); // 'school' | 'company'
  // Refs and state for inner tabs indicator (candidate & school) to avoid shared-layout jitter on scroll
  const candidateTabsRef = useRef(null);
  // Tooltip 'Tipos de vagas' via portal para evitar conflitos de z-index/stacking-context
  const [typesOpen, setTypesOpen] = useState(false);
  const [typesPos, setTypesPos] = useState({ left: 0, top: 0 });
  const typesBtnRef = useRef(null);
  const candidateSchoolBtnRef = useRef(null);
  const candidateCompanyBtnRef = useRef(null);
  const [candidateIndicator, setCandidateIndicator] = useState({ left: 0, width: 0 });

  const schoolTabsRef = useRef(null);
  const schoolSchoolBtnRef = useRef(null);
  const schoolCompanyBtnRef = useRef(null);
  const [schoolIndicator, setSchoolIndicator] = useState({ left: 0, width: 0 });

  // Helper: obter logo da empresa pela lista carregada
  const getCompanyImage = (companyId) => {
    if (!companyId) return null;
    const comp = companies.find(c => String(c.id) === String(companyId));
    // Ordem de busca: cache em memória -> lista de companies -> cache localStorage
    const cached = companyLogos[String(companyId)];
    if (cached) return cached;
    if (comp?.profileImage || comp?.profile_image) return comp.profileImage || comp.profile_image;
    try {
      const logos = JSON.parse(localStorage.getItem('curriculoja_company_logos') || '{}');
      if (logos[String(companyId)]) return logos[String(companyId)];
    } catch {}
    return null;
  };

  // Navigate to job details, used by full-card click
  const openJob = (jobId) => navigate(`/job/${jobId}`);

  // Fire-and-forget view tracking for agency jobs (they skip the /job/:id route)
  const trackJobView = (jobId) => {
    try { jobsAPI.get(jobId).catch(() => {}); } catch (_) {}
  };

  const handleCardClick = (e, jobId, job = null) => {
    // Avoid triggering when clicking on interactive elements inside the card (but allow the card itself)
    const interactive = e.target.closest('a, button, input, textarea, select, [role="button"]');
    if (interactive && interactive !== e.currentTarget) return;
    // Agency jobs: open external URL
    if (job && job.is_agency_job && job.external_url) {
      trackJobView(jobId);
      window.open(job.external_url, '_blank', 'noopener,noreferrer');
      return;
    }
    openJob(jobId);
  };
  const handleCardKeyDown = (e, jobId, job = null) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (job && job.is_agency_job && job.external_url) {
        trackJobView(jobId);
        window.open(job.external_url, '_blank', 'noopener,noreferrer');
        return;
      }
      openJob(jobId);
    }
  };

  const computeIndicator = (container, target) => {
    if (!container || !target) return null;
    const cRect = container.getBoundingClientRect();
    const tRect = target.getBoundingClientRect();
    return { left: Math.max(0, tRect.left - cRect.left), width: tRect.width };
  };

  useLayoutEffect(() => {
    const update = () => {
      // Candidate inner tabs (rendered only for candidates when in 'destaques')
      if (candidateTabsRef.current) {
        const activeBtn = highlightsInnerTab === 'school' ? candidateSchoolBtnRef.current : candidateCompanyBtnRef.current;
        const res = computeIndicator(candidateTabsRef.current, activeBtn);
        if (res) setCandidateIndicator(res);
      }
      // School inner tabs
      if (schoolTabsRef.current) {
        const activeBtn = highlightsInnerTab === 'school' ? schoolSchoolBtnRef.current : schoolCompanyBtnRef.current;
        const res = computeIndicator(schoolTabsRef.current, activeBtn);
        if (res) setSchoolIndicator(res);
      }
    };

    // Run now and on next frame to catch layout after React paints
    update();
    const raf = requestAnimationFrame(update);
    window.addEventListener('resize', update);
    // use capture phase to catch scroll in nested containers
    window.addEventListener('scroll', update, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [highlightsInnerTab, schoolTab]);
  const [taxonomy, setTaxonomy] = useState({});
  const [areasList, setAreasList] = useState([]); // áreas + sub-áreas promovidas de 'outros'
  const [subareasList, setSubareasList] = useState([]);
  const [promotedOutrosSubs, setPromotedOutrosSubs] = useState([]);
  // Removido controle anterior de aplicação única; agora aplicamos sempre que o candidato entra
  const [externalJobs, setExternalJobs] = useState([]);
  const [loadingExternal, setLoadingExternal] = useState(false);
  const [loadingExternalRecommended, setLoadingExternalRecommended] = useState(false);
  const [hideHighlights, setHideHighlights] = useState(false);
  // Removido estado dangerChip após retorno ao comportamento anterior (ícone troca por X só no hover)
  // Paginação vagas externas
  const [externalPage, setExternalPage] = useState(1);
  const EXTERNAL_PER_PAGE = 8;
  // Paginação para vagas internas
  const [internalPage, setInternalPage] = useState(1);
  const INTERNAL_PER_PAGE = 6;

  // Inicializar termo de busca a partir da URL (ex.: /jobs?q=engenheiro)
  useEffect(() => {
    try {
      const params = new URLSearchParams(location.search || '');
      const q = params.get('q') || params.get('search') || params.get('term');
      if (q && q !== searchTerm) {
        setSearchTerm(q);
      }
    } catch (e) {
      // ignora parsing errors
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  const internalJobsHeading = loading
    ? 'Carregando...'
    : `${filteredJobs.length} vaga${filteredJobs.length!==1?'s':''} interna${filteredJobs.length!==1?'s':''}`;
  // Limitar quando não houver nenhum filtro nem termo de busca
  const isUnfiltered = !String(searchTerm||'').trim() &&
    !filters.location &&
    (filters.contract_type === 'Todos') &&
    (filters.work_type === 'Todos') &&
    (filters.experience_level === 'Todos') &&
    (!filters.area || filters.area === 'Todos') &&
    (!filters.subarea || filters.subarea === 'Todos');
  // Recomendações desativadas no layout do aluno (usamos abas de destaques)
  const recommendedJobs = React.useMemo(() => [], []);
  const recommendedIdSet = React.useMemo(() => new Set(), []);
  const visibleInternalJobsForRender = React.useMemo(() => {
    let base = filteredJobs;
    // Para candidatos: esconder apenas destacadas no bloco "Vagas" (recomendadas desativadas)
    if (isCandidate && highlightedJobIds.length) {
      base = base.filter(j => !highlightedJobIds.includes(j.id));
    }
    // Para escola, na aba "Vagas": não repetir vagas que já aparecem em "Vagas destacadas"
    if (isSchool && schoolTab === 'vagas') {
      const schoolSet = new Set((schoolHighlights||[]).map(j => j.id));
      const companySet = new Set((schoolCompanyHighlights||[]).map(j => j.id));
      base = base.filter(j => !(schoolSet.has(j.id) || companySet.has(j.id)));
    }
    return base;
  }, [filteredJobs, isCandidate, highlightedJobIds, recommendedIdSet, isSchool, schoolTab, schoolHighlights, schoolCompanyHighlights]);
  // Paginação de internas
  const totalInternalPages = Math.ceil((visibleInternalJobsForRender?.length || 0) / INTERNAL_PER_PAGE) || 1;
  const paginatedInternalJobs = React.useMemo(() => {
    const list = visibleInternalJobsForRender || [];
    const start = (internalPage - 1) * INTERNAL_PER_PAGE;
    return list.slice(start, start + INTERNAL_PER_PAGE);
  }, [visibleInternalJobsForRender, internalPage]);

  // Destaques filtrados (aplicam mesmos filtros já usados em filteredJobs)
  const schoolHighlightedFiltered = isCandidate && !hideHighlights
    ? filteredJobs.filter(j => highlightedSchoolJobIds.includes(j.id))
    : [];
  const companyHighlightedFiltered = isCandidate && !hideHighlights
    ? filteredJobs.filter(j => companyHighlightedJobIds.includes(j.id))
    : [];
  // Lista combinada de destaques (sem duplicatas) para o aluno
  const allHighlightedFiltered = isCandidate && !hideHighlights
    ? filteredJobs.filter(j => highlightedSchoolJobIds.includes(j.id) || companyHighlightedJobIds.includes(j.id))
    : [];
  // Flags para avisos
  const hasHiddenHighlights = isCandidate && !hideHighlights && (highlightedSchoolJobIds.length>0 || companyHighlightedJobIds.length>0) && allHighlightedFiltered.length===0;
  // Contagens para cabeçalhos/tabs
  const isTabbedUser = isSchool || isCandidate;
  const candidateSchoolCount = schoolHighlightedFiltered.length;
  const candidateCompanyCount = companyHighlightedFiltered.length;
  const totalCandidateHighlights = allHighlightedFiltered.length;

  // Load data
  useEffect(()=>{ (async()=>{ try{ setLoading(true); const [jobsResp, companiesResp] = await Promise.all([ jobsAPI.list(), companiesAPI.list() ]); if(jobsResp?.jobs){ setJobs(jobsResp.jobs); setFilteredJobs(jobsResp.jobs);} 
      if(companiesResp?.companies){
        let baseCompanies = companiesResp.companies || [];
        // Completar com profileImage via API e, se necessário, via localStorage
        try{
          const usersLS = JSON.parse(localStorage.getItem('curriculoja_users') || '[]');
          const logoCache = JSON.parse(localStorage.getItem('curriculoja_company_logos') || '{}');
          const detailed = await Promise.all(
            baseCompanies.map(async (c)=>{
              if (c.profileImage || c.profile_image) return c;
              // tentar API
              try{
                const resp = await usersAPI.getCompany(c.id);
                const img = resp?.company?.profileImage || resp?.company?.profile_image || null;
                if (img) return { ...c, profileImage: img };
              }catch{}
              // fallback localStorage
              try{
                const compLS = usersLS.find(u => String(u.id)===String(c.id) && u.type==='company');
                const imgLS = compLS?.profileImage || compLS?.profile_image || logoCache[String(c.id)] || null;
                if (imgLS) return { ...c, profileImage: imgLS };
              }catch{}
              return c;
            })
          );
          baseCompanies = detailed;
        }catch{}
        setCompanies(baseCompanies);
      }
    } catch(e){ console.error(e); toast({ title:'Erro ao carregar', description:'Falha ao buscar vagas/empresas.', variant:'destructive'});} finally{ setLoading(false);} })(); }, [toast]);

  // Prefetch de logos de empresas faltantes (para candidatos, etc.)
  useEffect(() => {
    const prefetch = async () => {
      try {
        // IDs presentes nas vagas filtradas (internas e externas internas não têm company_id)
        const ids = new Set((jobs || []).map(j => j.company_id).filter(Boolean));
        const have = new Set(Object.keys(companyLogos));
        const missing = [...ids].filter(id => !have.has(String(id)) && !getCompanyImage(id));
        if (!missing.length) return;
        const results = await Promise.all(missing.map(async (id) => {
          try {
            const resp = await usersAPI.getCompany(id);
            const img = resp?.company?.profileImage || resp?.company?.profile_image || null;
            return { id, img };
          } catch { return { id, img: null }; }
        }));
        const next = { ...companyLogos };
        results.forEach(({ id, img }) => { if (img) next[String(id)] = img; });
        if (Object.keys(next).length !== Object.keys(companyLogos).length) setCompanyLogos(next);
      } catch {}
    };
    prefetch();
  }, [jobs, companies]);

  // Atualizar logo das empresas em tempo real quando alterada no perfil
  useEffect(()=>{
    const handler = (e)=>{
      const { companyId, image } = e.detail || {};
      if (!companyId || !image) return;
      setCompanies(prev => prev.map(c => String(c.id)===String(companyId) ? { ...c, profileImage: image, profile_image: image } : c));
    };
    window.addEventListener('company-avatar-updated', handler);
    return () => window.removeEventListener('company-avatar-updated', handler);
  }, []);

  // Removido auto-preenchimento de localização para não limitar resultados externos sem o usuário perceber
  // (antes colocava 'Ribeirão Preto' automaticamente e reduzia vagas externas)
  // Se quiser sugerir algo futuramente, poderemos mostrar um placeholder dinâmico ao invés de setar o filtro.

  // Efeito anterior de seleção automática de subárea removido (flatten aplicado)

  // Highlights & classes
  useEffect(()=>{ (async()=>{ if(!user) return; try{ const base=import.meta.env.VITE_API_URL || 'http://localhost:3001/api'; const token=localStorage.getItem('curriculoja_token'); if(isCandidate){ const r=await fetch(base+'/jobs/highlights/mine',{ headers:{ Authorization:`Bearer ${token}` }}); if(r.ok){ const d=await r.json(); setHighlightedJobIds(d.jobs||[]); setHighlightedSchoolJobIds(d.schoolJobs||[]); setCompanyHighlightedJobIds(d.companyJobs||[]); } } if(isSchool){ const r2=await fetch(base+'/schools/classes',{ headers:{ Authorization:`Bearer ${token}` }}); if(r2.ok){ const d2=await r2.json(); setClassOptions(d2.classes||[]);} } }catch(e){ console.warn('Falha destaques', e);} })(); }, [user,isCandidate,isSchool]);

  // Carregar destaques da escola (para aba "Vagas destacadas")
  const loadSchoolHighlights = async () => {
    if(!user || !isSchool) return;
    try{
      setLoadingSchoolHighlights(true);
      const base=import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      const token=localStorage.getItem('curriculoja_token');
      const r=await fetch(base+'/jobs/highlights/school',{ headers:{ Authorization:`Bearer ${token}` }});
      if(r.ok){ const d=await r.json(); setSchoolHighlights(d.highlights||[]); }
    }catch(e){ console.warn('Falha ao carregar destaques da escola', e);} finally{ setLoadingSchoolHighlights(false); }
  };

  const loadSchoolCompanyHighlights = async () => {
    if(!user || !isSchool) return;
    try{
      setLoadingSchoolCompanyHighlights(true);
      const base=import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      const token=localStorage.getItem('curriculoja_token');
      const r=await fetch(base+'/jobs/highlights/company-for-school',{ headers:{ Authorization:`Bearer ${token}` }});
      if(r.ok){ const d=await r.json(); setSchoolCompanyHighlights(d.highlights||[]); }
    }catch(e){ console.warn('Falha ao carregar destaques de empresas para a escola', e);} finally{ setLoadingSchoolCompanyHighlights(false); }
  };

  const loadCandidateHighlights = async () => {
    if(!user || !isCandidate) return;
    try{
      const base=import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      const token=localStorage.getItem('curriculoja_token');
      const r=await fetch(base+'/jobs/highlights/mine',{ headers:{ Authorization:`Bearer ${token}` }});
      if(r.ok){ const d=await r.json(); setHighlightedJobIds(d.jobs||[]); setHighlightedSchoolJobIds(d.schoolJobs||[]); setCompanyHighlightedJobIds(d.companyJobs||[]); }
    }catch(e){ console.warn('Falha ao carregar destaques do candidato', e);}
  };

  useEffect(()=>{ loadSchoolHighlights(); }, [user, isSchool]);

  // Carregar destaques de empresas direcionados à escola
  useEffect(()=>{ loadSchoolCompanyHighlights(); }, [user, isSchool]);

  // Listener para recarregar destaques quando evento customizado for disparado
  useEffect(() => {
    const handleRefresh = () => {
      if(isSchool) {
        loadSchoolHighlights();
        loadSchoolCompanyHighlights();
      }
      if(isCandidate) {
        loadCandidateHighlights();
      }
    };
    window.addEventListener('refreshHighlights', handleRefresh);
    return () => window.removeEventListener('refreshHighlights', handleRefresh);
  }, [isSchool, isCandidate, user]);

  // Carregar parcerias aceitas (para escolas - identificar empresas parceiras)
  useEffect(()=>{ (async()=>{
    if(!user || !isSchool) return;
    try{
      const partnerships = await partnershipsApi.school.listPartnerships('accepted');
      const ids = new Set((partnerships || []).map(p => String(p.company_id)));
      setPartnerCompanyIds(ids);
    }catch(e){ console.warn('Falha ao carregar parcerias', e);}
  })(); }, [user, isSchool]);

  // Carregar parcerias aceitas da escola do aluno (para candidatos - identificar empresas parceiras)
  useEffect(()=>{ (async()=>{
    if(!user || !isStudent) return;
    try{
      const data = await partnershipsApi.candidate.getMySchoolPartners();
      const ids = new Set((data.partnerCompanyIds || []).map(id => String(id)));
      setPartnerCompanyIds(ids);
      console.log('[SearchJobs] Empresas parceiras da escola do aluno:', ids.size);
    }catch(e){ console.warn('Falha ao carregar parcerias da escola do aluno', e);}
  })(); }, [user, isStudent]);

  // (removido bloco de promoção de sub-áreas de 'outros')
  // Helper para rolar até o topo dos resultados
  const scrollToResultsTop = () => {
    try {
      const el = document.getElementById('job-results-top');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (_) { /* noop */ }
  };
  // Taxonomy: injeta sub-áreas padrão para todas as áreas principais se backend não fornecer
  useEffect(()=>{ (async()=>{ try { const base=import.meta.env.VITE_API_URL || 'http://localhost:3001/api'; const res=await fetch(base+'/jobs/taxonomy'); if(res.ok){ const data=await res.json(); const taxOriginal=data.taxonomy||{}; const tax = { ...taxOriginal };
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
      for(const [area, subs] of Object.entries(defaultSubareas)){
        if(!tax[area]) tax[area]=subs;
      }
      setTaxonomy(tax);
      let baseAreas = Object.keys(tax).filter(k=> k!=='outros').map(k=> ({ value:k, label: AREA_LABELS[k] || humanize(k) }));
      if(!baseAreas.find(a=> a.value==='direito')) baseAreas.push({ value:'direito', label: AREA_LABELS['direito'] });
      baseAreas.sort((a,b)=> a.label.localeCompare(b.label,'pt-BR'));
      setAreasList([{ value:'Todos', label:'Todas as áreas'}, ...baseAreas]); } } catch(_){} })(); }, []);

  // Aplica SEMPRE os filtros da turma do aluno ao entrar na página de vagas
  const taxonomyReady = Object.keys(taxonomy||{}).length > 0;
  useEffect(()=>{
    (async()=>{
      if(!isStudent) return;
      try {
        const cf = await usersAPI.getClassFilters();
        // Mapeia tanto chaves novas quanto antigas e normaliza para chaves internas
        let areaInput = cf?.job_area ?? cf?.area ?? 'Todos';
        let area = 'Todos';
        if (areaInput && areaInput !== 'Todos') {
          const ai = String(areaInput).trim();
          if (taxonomyReady && taxonomy[ai]) {
            area = ai; // já é chave interna
          } else {
            const mapByLabel = LABEL_TO_KEY[ai.toLowerCase()];
            if (mapByLabel && (!taxonomyReady || taxonomy[mapByLabel])) {
              area = mapByLabel;
            } else {
              area = 'Todos';
            }
          }
        }

        // Subárea: tenta casar por chave ou por label humanizada dentro da área
        let subInput = cf?.job_subarea ?? cf?.subarea ?? 'Todos';
        let subarea = 'Todos';
        const normalizeAll = (v) => {
          const s = String(v||'').trim().toLowerCase();
          return !s || s === 'todos' || s === 'todas' || s === '(todos)' || s === '(todas)';
        };
        if (taxonomyReady && subInput && !normalizeAll(subInput) && area !== 'Todos' && Array.isArray(taxonomy[area])) {
          const subs = taxonomy[area];
          const si = String(subInput).trim();
          if (subs.includes(si)) {
            subarea = si; // já é chave interna
          } else {
            const siLower = si.toLowerCase();
            const match = subs.find(k => (k||'').replace(/_/g,' ').toLowerCase() === siLower);
            subarea = match || 'Todos';
          }
        }
        const location = cf?.location || cf?.job_location || '';
        // Normalização de modalidade, contrato e nível com remoção de acento + sinônimos
        const strip = (v) => String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
        const normAll = (v, fallback='Todos') => {
          const s = String(v||'').trim();
          if (!s) return fallback;
          const sLower = strip(s).toLowerCase();
          if (['todos','todas','(todos)','(todas)'].includes(sLower)) return 'Todos';
          return null; // não é "Todos"
        };
        const mapWork = (v) => {
          const sAll = normAll(v); if (sAll) return sAll;
          const s = strip(v).toLowerCase();
          if (['presencial'].includes(s)) return 'presencial';
          if (['hibrido','híbrido'].includes(s)) return 'hibrido';
          if (['remoto'].includes(s)) return 'remoto';
          return 'Todos';
        };
        const mapContract = (v) => {
          const sAll = normAll(v); if (sAll) return sAll;
          const s = strip(v).toLowerCase();
          if (['clt'].includes(s)) return 'clt';
          if (['pj'].includes(s)) return 'pj';
          if (['estagio','estágio','estagiario','estagiário'].includes(s)) return 'estagio';
          if (['temporario','temporário'].includes(s)) return 'temporario';
          return 'Todos';
        };
        const mapExp = (v) => {
          const sAll = normAll(v); if (sAll) return sAll;
          const s = strip(v).toLowerCase();
          if (['estagio','estágio'].includes(s)) return 'estagio';
          if (['junior','júnior','jr'].includes(s)) return 'junior';
          if (['pleno'].includes(s)) return 'pleno';
          if (['senior','sênior','sr'].includes(s)) return 'senior';
          return 'Todos';
        };
        const work_type = mapWork(cf?.work_type ?? cf?.job_work_type ?? 'Todos');
        const contract_type = mapContract(cf?.contract_type ?? cf?.job_contract_type ?? 'Todos');
        const experience_level = mapExp(cf?.experience_level ?? cf?.job_experience_level ?? 'Todos');
        if (import.meta?.env?.DEV) {
          // Debug: ver valores retornados e aplicados
          try {
            console.log('[CJ] classFilters raw:', cf);
            console.log('[CJ] classFilters applied:', { areaInput, area, subInput, subarea, location, work_type, contract_type, experience_level });
          } catch(_) {}
        }
        setFilters({ location, contract_type, work_type, experience_level, area, subarea });
      } catch (e) {
        // silencioso; sem filtros de turma, segue com padrões
      }
    })();
  }, [isStudent, taxonomyReady, location.pathname, user?.id]);

  // Reset se ainda vier área 'outros' de estado antigo
  useEffect(()=> {
    if(filters.area === 'outros') {
      setFilters(p=> ({ ...p, area:'Todos', subarea:'Todos' }));
    }
  }, [filters.area]);

  // Atualiza subareasList para a área selecionada padrão
  useEffect(()=> {
    if(!taxonomy || !filters.area || filters.area==='Todos') { setSubareasList([]); setFilters(p=>({...p, subarea:'Todos'})); return; }
    const subs = Array.isArray(taxonomy[filters.area])? taxonomy[filters.area]:[];
    if(subs.length){ const opts=subs.map(s=>({ value:s, label:humanize(s) })); setSubareasList([{ value:'Todos', label:'Todas as sub-áreas'}, ...opts]); if(!['Todos', ...subs].includes(filters.subarea)) { setFilters(p=>({...p, subarea:'Todos'})); } }
    else { setSubareasList([]); setFilters(p=>({...p, subarea:'Todos'})); }
  }, [taxonomy, filters.area]);

  // Apply internal filters
  useEffect(()=>{ let results=jobs; if(searchTerm){ const q=searchTerm.toLowerCase(); results=results.filter(j=> j.title?.toLowerCase().includes(q)|| j.company_name?.toLowerCase().includes(q)); } if(filters.location) results=results.filter(j=> j.location?.toLowerCase().includes(filters.location.toLowerCase())); if(filters.contract_type!=='Todos') results=results.filter(j=> j.contract_type===filters.contract_type); if(filters.work_type!=='Todos') results=results.filter(j=> j.work_type===filters.work_type); if(filters.experience_level!=='Todos') results=results.filter(j=> j.experience_level===filters.experience_level); if(filters.area!=='Todos') results=results.filter(j=> j.area===filters.area); if(filters.subarea && filters.subarea!=='Todos') results=results.filter(j=> j.subarea===filters.subarea); if(isCandidate && highlightedJobIds.length){ results=[...results].sort((a,b)=>{ const A=highlightedJobIds.includes(a.id); const B=highlightedJobIds.includes(b.id); if(A&&!B) return -1; if(B&&!A) return 1; return 0; }); } setFilteredJobs(results); }, [searchTerm, filters, jobs, highlightedJobIds, isCandidate]);

  // Filtrar destaques da escola conforme filtros atuais
  useEffect(()=>{
    if(!isSchool){ setFilteredSchoolHighlights([]); return; }
    let list = schoolHighlights || [];
    if(searchTerm){ const q=searchTerm.toLowerCase(); list=list.filter(j=> j.title?.toLowerCase().includes(q)|| j.company_name?.toLowerCase().includes(q)); }
    if(filters.location) list=list.filter(j=> j.location?.toLowerCase().includes(filters.location.toLowerCase()));
    if(filters.contract_type!=='Todos') list=list.filter(j=> j.contract_type===filters.contract_type);
    if(filters.work_type!=='Todos') list=list.filter(j=> j.work_type===filters.work_type);
    if(filters.experience_level!=='Todos') list=list.filter(j=> j.experience_level===filters.experience_level);
    if(filters.area!=='Todos') list=list.filter(j=> j.area===filters.area);
    if(filters.subarea && filters.subarea!=='Todos') list=list.filter(j=> j.subarea===filters.subarea);
    if(schoolClassFilter && schoolClassFilter!=='all') list=list.filter(j=> String(j.class_id)===String(schoolClassFilter));
    setFilteredSchoolHighlights(list);
  }, [isSchool, schoolHighlights, searchTerm, filters, schoolClassFilter]);

  // Filtrar destaques da empresa direcionados à escola
  useEffect(()=>{
    if(!isSchool){ setFilteredSchoolCompanyHighlights([]); return; }
    let list = schoolCompanyHighlights || [];
    if(searchTerm){ const q=searchTerm.toLowerCase(); list=list.filter(j=> j.title?.toLowerCase().includes(q)|| j.company_name?.toLowerCase().includes(q)); }
    if(filters.location) list=list.filter(j=> j.location?.toLowerCase().includes(filters.location.toLowerCase()));
    if(filters.contract_type!=='Todos') list=list.filter(j=> j.contract_type===filters.contract_type);
    if(filters.work_type!=='Todos') list=list.filter(j=> j.work_type===filters.work_type);
    if(filters.experience_level!=='Todos') list=list.filter(j=> j.experience_level===filters.experience_level);
    if(filters.area!=='Todos') list=list.filter(j=> j.area===filters.area);
    if(filters.subarea && filters.subarea!=='Todos') list=list.filter(j=> j.subarea===filters.subarea);
    if(schoolClassFilter && schoolClassFilter!=='all') list=list.filter(j=> String(j.class_id)===String(schoolClassFilter));
    setFilteredSchoolCompanyHighlights(list);
  }, [isSchool, schoolCompanyHighlights, searchTerm, filters, schoolClassFilter]);

  // Helpers para exibir turma por class_id
  const classNameById = (cid) => {
    if(!cid) return 'Todas as turmas';
    const c = (classOptions||[]).find(x => String(x.id) === String(cid));
    return c?.class_name || c?.name || cid;
  };

  // Ação: parar de destacar (escola)
  const stopSchoolHighlight = async (jobId, classId) => {
    try{
      const base=import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      const token=localStorage.getItem('curriculoja_token');
      const url = new URL(base+`/jobs/highlights/school/${jobId}`);
      if(classId) url.searchParams.set('class_id', classId);
      const r = await fetch(url.toString(), { method:'DELETE', headers:{ Authorization:`Bearer ${token}` }});
      if(r.ok){
        toast({ title:'Destaque removido', description:'Esta vaga deixou de ser destacada para seus alunos.' });
        // Recarregar listas
        try{
          const r1=await fetch(base+'/jobs/highlights/school',{ headers:{ Authorization:`Bearer ${token}` }});
          if(r1.ok){ const d1=await r1.json(); setSchoolHighlights(d1.highlights||[]); }
          const r2=await fetch(base+'/jobs/highlights/company-for-school',{ headers:{ Authorization:`Bearer ${token}` }});
          if(r2.ok){ const d2=await r2.json(); setSchoolCompanyHighlights(d2.highlights||[]); }
        }catch(_){/* noop */}
      } else {
        toast({ title:'Falha ao remover destaque', description:'Tente novamente.', variant:'destructive' });
      }
    }catch(e){
      toast({ title:'Erro ao remover destaque', description:'Tente novamente.', variant:'destructive' });
    }
  };

  // External jobs
  const detectContract = (txt='') => {
    const t = txt.toLowerCase();
    if(/\bclt\b/.test(t)) return 'CLT';
    if(/\btemporári|temporario/.test(t)) return 'Temporário';
    if(/estagiá|estagio|estágio|estagiario|estagiário/.test(t)) return 'Estágio';
    if(/pj\b|pessoa jurídica|pessoa juridica/.test(t)) return 'PJ';
    if(/freelancer|free-lance|autônom|autonomo/.test(t)) return 'Freelancer';
    if(/aprendiz/.test(t)) return 'Aprendiz';
    return null;
  };
  const detectWorkType = (txt='') => {
    const t = txt.toLowerCase();
    if(/100%\s*remo|remo(to|tamente)|home office|home-office|teletrabalho/.test(t)) return 'Remoto';
    if(/h[ií]brid/.test(t)) return 'Híbrido';
    if(/presencial|no escritório|on-site|onsite/.test(t)) return 'Presencial';
    return null;
  };
  const detectExperience = (txt='') => {
    const t = txt.toLowerCase();
    // Prioridades: Estágio < Aprendiz < Júnior < Pleno < Sênior
    if(/aprendiz/.test(t)) return 'Aprendiz';
    if(/estagi/.test(t)) return 'Estágio';
    if(/junior|júnior|jr\b|jr\//.test(t)) return 'Júnior';
    if(/pleno|mid level|mid-level|pl\b/.test(t)) return 'Pleno';
    if(/s[eê]nior|sr\b|senior/.test(t)) return 'Sênior';
    return null;
  };
  // Classificação de área baseada em pontuação (heurística "quase IA")
  const AREA_KEYWORDS = {
    administracao: [
      /administra[cç][aã]o/, /administrativo/, /assistente administrativo/, /analista administrativo/,
      /gest[aã]o (administrativa|de processos|empresarial)/, /processos administrativos/,
      /secret[aá]ri[ao]/, /back ?office/, /office manager/, /departamento administrativo/
    ],
    recursos_humanos: [
      /talent acquisition/, /recrut/, /seleç/, /selecionador/, /headhunter/, /recursos humanos/, /\brh\b/, /people partner/, /people ops/,
      /remunera[cç][aã]o/, /cargos? e sal[aá]ri?os/, /folha de pagamento/, /benef[ií]c/, /compensation/, /payroll/, /clima organizacional/
    ],
    tecnologia: [
      /desenvolvedor/, /programador/, /react\b/, /node\b/, /software/, /full\s*stack/, /backend/, /front[- ]?end/, /devops/, /\bti\b/, /tecnologia/, /engenheiro de software/,
      /python/, /javascript/, /typescript/, /aws/, /cloud/]
    ,
    design: [/\bux\b/, /\bui\b/, /figma/, /wireframe/, /prototip/, /designer/, /web design/, /design thinking/, /layout/],
    marketing: [/marketing/, /growth/, /seo\b/, /mídias? sociais/, /social media/, /copywriter/, /performance/, /ads?\b/, /campanhas?/, /branding/],
    financas: [/finan[cç]as/, /contabil/, /contabilidade/, /fiscal/, /tribut/, /analista financeiro/, /controlador/, /orcament|orçament/, /cash flow/, /tesouraria/],
    logistica: [/log[ií]stic/, /supply chain/, /estoque/, /almoxarif/, /distribuiç/, /transport/, /roteiriz/, /armaz[eé]m/],
    engenharia: [/engenheir/, /mecânic|mecanico/, /civil/, /el[eé]tric/, /produção|industrial/, /manutenç|processos?/, /qualidade/],
    educacao: [
      /professor/, /professora/, /educa[cç][aã]o/, /docent/, /pedagog/, /instrutor/, /instrutora/, /tutor/, /monitor/, /reforç|reforc/, /cursinh/, /licenciatur/, /coordenador pedag/, /did[aá]tica/,
      /ensino/, /ead/, /aula/, /sala de aula/,
      /qu[ií]mic/, /matem[aá]tic/, /f[ií]sic/, /biolog/, /hist[oó]ri/, /geograf/, /artes?/, /l[ií]ngua portuguesa/, /portugu[eê]s/, /ingl[eê]s/, /espanhol/
    ],
    direito: [/advog/, /direito/, /jur[ií]dic/, /legal/, /compliance/, /tribut[aá]ri/, /civil/, /trabalhista/, /contratual/, /penal/ ],
    vendas_marketing: [/vendas/, /comercial/, /representante/, /account executive/, /sales/, /inside sales/, /closer/, /prospecç/, /negociaç/],
    saude: [/sa[uú]de/, /enfermeir/, /cl[ií]nic/, /hospital/, /medic/, /farmac/, /odontolog/, /psicolog/, /laborat[oó]ri/, /bioqu[ií]m/, /nutricion/],
    outros: [/hotelaria/, /turismo/, /hotel/, /recepcionista de hotel/, /manobrista/, /portaria/]
  };
  // Palavras-chave de sub-áreas (por área) para detecção automática (todas principais)
  const SUBAREA_KEYWORDS = {
    educacao: { quimica: [/qu[ií]mic/], matematica: [/matem[aá]tic/], fisica: [/f[ií]sic/], biologia: [/biolog/], historia: [/hist[oó]ri/], geografia: [/geograf/], artes: [/\barte\b|artes?\b/], portugues: [/portugu[eê]s|l[ií]ngua portuguesa/], ingles: [/ingl[eê]s/], espanhol: [/espanhol/], pedagogia: [/pedagog/], ead: [/\bead\b|educa[cç][aã]o a dist[aá]ncia/] },
    direito: { tributario: [/tribut[aá]ri/], civil: [/\bcivil\b/], trabalhista: [/trabalhist/], penal: [/penal/], contratual: [/contratual|contratos?/], compliance: [/compliance/], empresarial: [/empresarial|societ[aá]ri/] },
    tecnologia: { backend: [/backend|back-end|node\b|java\b|python\b|c#\b|dotnet|go\b/], frontend: [/front[- ]?end|react\b|vue\b|angular\b/], fullstack: [/full\s*stack/], mobile: [/mobile|android|ios/], devops: [/devops|ci\/cd|kubernetes|docker/], dados: [/data\b|dados|sql\b|etl|analytics|big data/], qa: [/qa\b|teste(s)?|quality assurance/], seguranca: [/seguran[çc]a|security|pentest/], cloud: [/cloud|aws|azure|gcp/], produto: [/produto|product manager|product owner/] },
    design: { ux: [/\bux\b|user experience/], ui: [/\bui\b|interface/], produto: [/design de produto|product design/], grafico: [/gr[aá]fic|illustrator|photoshop/], motion: [/motion|after effects/], web: [/web design/], branding: [/branding|identidade visual/] },
    marketing: { seo: [/\bseo\b/], conteudo: [/conte[uú]do|content marketing/], social_media: [/social media|mídias? sociais/], performance: [/performance|paid media|tr[aá]fego pago|ads?\b/], growth: [/growth|experimenta[cç][aã]o/], branding: [/branding/], copywriting: [/copywriting|copywriter/] },
    financas: { contabilidade: [/contabil|contabilidade/], fiscal: [/fiscal/], controladoria: [/controlador/], tesouraria: [/tesouraria|cash flow/], planejamento: [/planejamento|budget|orcament|orçament/], custos: [/custo(s)?/] },
    recursos_humanos: { recrutamento: [/recrut/], selecao: [/seleç|selecionador/], treinamento: [/treinament|learning & development|l&d/], folha: [/folha de pagamento|payroll/], beneficios: [/benef[ií]c/], cultura: [/cultura organizacional|clima organizacional/], desenvolvimento_organizacional: [/desenvolvimento organizacional|organizational development/] },
    logistica: { estoque: [/estoque/], distribuicao: [/distribuiç/], transporte: [/transport/], supply_chain: [/supply chain/], almoxarifado: [/almoxarif/], planejamento_logistico: [/planejamento log[ií]stic/] },
    engenharia: { mecanica: [/mec[aâ]nic/], civil: [/\bcivil\b/], eletrica: [/el[eé]tric/], producao: [/produç|industrial/], qualidade: [/qualidade/], processos: [/processos?/], manutencao: [/manutenç/] },
    vendas_marketing: { inside_sales: [/inside sales/], field_sales: [/field sales|vendas externas/], pre_vendas: [/pré[- ]?vendas|pre[- ]?sales/], pos_vendas: [/p[oó]s[- ]?vendas|customer success/], account_management: [/account (manager|management)/], customer_success: [/customer success|cs\b/] },
    saude: { enfermagem: [/enfermeir/], medicina: [/medic\b|m[eé]dico/], farmacia: [/farmac/], odontologia: [/odontolog/], psicologia: [/psicolog/], laboratorio: [/laborat[oó]ri/], nutricao: [/nutricion/] }
  };
  const detectSubarea = (areaKey, title='', desc='') => {
    if(!SUBAREA_KEYWORDS[areaKey]) return null;
    const titleLower = (title||'').toLowerCase();
    const descLower = (desc||'').toLowerCase();
    let best=null; let bestScore=0;
    for(const [sub, patterns] of Object.entries(SUBAREA_KEYWORDS[areaKey])){
      let st=0, sd=0;
      for(const rgx of patterns){
        if(rgx.test(titleLower)) st++; else if(rgx.test(descLower)) sd++;
      }
      const total = st*2 + sd;
      if(total>bestScore && total>0){ best=sub; bestScore=total; }
    }
    return best; // pode ser null
  };
  const detectArea = (title='', desc='') => {
    const titleLower = (title||'').toLowerCase();
    const descLower = (desc||'').toLowerCase();
    let bestArea = null; let bestScore = 0;
    for(const [areaKey, patterns] of Object.entries(AREA_KEYWORDS)){
      let scoreTitle = 0, scoreDesc = 0;
      for(const rgx of patterns){
        if(rgx.test(titleLower)) scoreTitle += 1;
        else if(rgx.test(descLower)) scoreDesc += 1;
      }
      const total = (scoreTitle*2) + scoreDesc;
      if(total > bestScore && total > 0){ bestScore = total; bestArea = areaKey; }
    }
    return bestArea; // chave interna
  };
  // Sinônimos para enriquecer busca externa por área (todas áreas principais)
  const AREA_QUERY_SYNONYMS = {
    administracao: ['administração','administrativo','gestão','backoffice','back office','processos','secretaria','assistente administrativo'],
    administrativo: ['administração','administrativo','gestão','backoffice','secretaria'],
    educacao: ['professor','docente','ensino','aulas','licenciatura','monitor','tutor','reforço','cursinho','ead','pedagogia'],
    direito: ['advogado','jurídico','juridico','legal','compliance','direito','tributário','civil','trabalhista','penal','contratos'],
    tecnologia: ['desenvolvedor','programador','dev','software','backend','frontend','fullstack','mobile','devops','cloud','dados','qa','segurança'],
    design: ['designer','ux','ui','layout','figma','prototipo','branding','produto'],
    marketing: ['marketing','seo','conteúdo','social media','performance','growth','branding','copywriter','mídias sociais'],
    financas: ['financeiro','contabilidade','fiscal','controladoria','tesouraria','orcamento','custos'],
    financeiro: ['financeiro','finanças','contabilidade','fiscal','controladoria','tesouraria','orcamento','custos'],
    recursos_humanos: ['rh','recrutamento','selecao','talentos','folha','beneficios','people','treinamento'],
    logistica: ['logistica','supply chain','estoque','distribuicao','almoxarifado','transporte','roteirizacao'],
    engenharia: ['engenharia','processos','qualidade','projeto','manutencao','industrial','mecanica','eletrica','civil'],
    vendas: ['vendas','comercial','sales','inside sales','prospecção','negociação','closer','representante','executivo de contas','account executive'],
    vendas_marketing: ['vendas','comercial','sales','inside sales','prospecção','negociação','account'],
    saude: ['enfermagem','clínica','hospitalar','médico','medicina','farmácia','odontologia','psicologia','nutrição']
  };
  // Padrões de matérias para fallback de Educação (quando não detectado diretamente)
  const EDUCATION_SUBJECT_REGEX = /(professor|professora|docente|pedagog|monitor|tutor|reforç|cursinh|licenciatur|qu[ií]mic|matem[aá]tic|f[ií]sic|biolog|hist[oó]ri|geograf|artes?|l[ií]ngua portuguesa|portugu[eê]s|ingl[eê]s|espanhol)/i;
  const LAW_SUBJECT_REGEX = /(advog|jur[ií]dic|legal|compliance|direito|tribut[aá]ri|civil|trabalhist|contratual|penal)/i;
  const normalizeArea = (rawArea, title, desc) => {
    if(!rawArea) return detectArea(title, desc) || 'outros';
    const lowered = rawArea.toLowerCase();
    if(LABEL_TO_KEY[lowered]) return LABEL_TO_KEY[lowered];
    if(AREA_KEYWORDS[lowered]) return lowered;
    return detectArea(title, desc) || 'outros';
  };
  const mapExternal = (j) => {
    const id = j.id||j.job_id||`${j.source||j.external_source}-${j.external_id||j.url}`;
    const source = (j.source||j.external_source||'externa').toLowerCase();
    const desc = j.description || '';
    const title = j.title || '';
    const baseText = title+' '+desc;
    let contract_type = j.contract_type || j.employment_type || detectContract(baseText);
    let experience_level = j.experience_level || detectExperience(baseText);
    // Caso composto "Júnior/Estagiário" prioriza Estágio no contrato e Júnior como experiência
    if(/jún?ior\s*\/?\s*estagi|jr\s*\/?\s*estagi/.test(baseText.toLowerCase())){
      contract_type = contract_type || 'Estágio';
      experience_level = experience_level || 'Júnior';
    }
    const work_type = j.work_type || detectWorkType(baseText);
    const area = normalizeArea(j.area, title, desc);
    const subarea = j.subarea || detectSubarea(area, title, desc);
  return { ...j, id, source, contract_type, work_type, experience_level, area, subarea, is_external: true };
  };
  const loadExternalRecommended = async () => {
    try{
      setLoadingExternalRecommended(true);
      let classFilters={};
      try{ classFilters=await usersAPI.getClassFilters(); }catch(_){ }
      let terms=[];
      if(searchTerm) terms.push(searchTerm);
      if(filters.area && filters.area!=='Todos'){ terms.push(getAreaLabel(filters.area)); const syn=AREA_QUERY_SYNONYMS[filters.area]; if(syn) terms.push(...syn); }
      if(classFilters?.area) terms.push(classFilters.area);
      if(user?.profile?.course) terms.push(user.profile.course);
      if(user?.profile?.skills?.length) terms.push(...user.profile.skills.slice(0,2));
      if(!terms.length) terms = ['emprego'];
      const termString=Array.from(new Set(terms)).join(' ');
      const loc=filters.location || classFilters?.location || user?.profile?.location || '';
      const resp=await externalJobsAPI.search(termString, loc, 'linkedin,indeed', 'all', 5);
      if(resp?.jobs) setExternalJobs(resp.jobs.map(mapExternal)); else setExternalJobs([]);
    } catch(e){ console.error('Erro externas', e);} finally{ setLoadingExternalRecommended(false);} };
  const searchExternalExplicit = async () => { if(!searchTerm.trim()){ toast({ title:'Informe um termo', description:'Digite algo para buscar externamente.', variant:'destructive'}); return; } try{ setLoadingExternal(true); const resp=await externalJobsAPI.search(searchTerm, filters.location, 'linkedin,indeed', 'all', 5); if(resp?.jobs) setExternalJobs(resp.jobs.map(mapExternal)); } catch(e){ toast({ title:'Erro na busca externa', description:'Tente novamente.', variant:'destructive'}); } finally{ setLoadingExternal(false);} };
  // Busca externas guiada por filtros quando usuário não digitou termo (ou deseja forçar filtro)
  const refreshExternalByFilters = async () => {
    try {
      setLoadingExternal(true);
      // Monta termos a partir da área + sinônimos (para ampliar resultados) ou fallback
      const terms=[];
      if(searchTerm.trim()) terms.push(searchTerm.trim());
      if(!searchTerm.trim()) {
        if(filters.area && filters.area!=='Todos') { terms.push(getAreaLabel(filters.area)); const syn=AREA_QUERY_SYNONYMS[filters.area]; if(syn) terms.push(...syn); }
      }
      if(!terms.length) terms.push('emprego');
      const query = Array.from(new Set(terms)).join(' ');
  const resp = await externalJobsAPI.search(query, filters.location || '', 'linkedin,indeed', 'all', 5);
      if(resp?.jobs) setExternalJobs(resp.jobs.map(mapExternal));
    } catch(e){ console.error('Erro externas filtros', e); toast({ title:'Falha busca externa', description:'Não foi possível obter vagas externas.', variant:'destructive'});} finally { setLoadingExternal(false);} }
  useEffect(()=>{ loadExternalRecommended(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Se o usuário limpar o termo de busca, voltamos a mostrar destaques
  useEffect(()=> { if(!searchTerm.trim()) setHideHighlights(false); }, [searchTerm]);

  // Recalcular página quando filtros mudarem (evita ficar em página vazia)
  useEffect(()=> { setExternalPage(1); }, [filters.location, filters.area, searchTerm]);
  // Resetar página interna quando filtros mudarem
  useEffect(()=> { setInternalPage(1); }, [filters.location, filters.area, filters.contract_type, filters.work_type, filters.experience_level, filters.subarea, searchTerm]);

  // Filtragem de vagas externas (aplica mesmos filtros básicos + termo)
  const filteredExternalJobs = React.useMemo(()=> {
    // IMPORTANTE: Para vagas externas só aplicamos filtro de localização e termo.
    // Além disso, ordenamos da mais recente para a mais antiga quando houver campo de data.
    let ext = [...externalJobs];
    if(filters.location) {
      const loc = filters.location.toLowerCase();
      ext = ext.filter(j => j.location?.toLowerCase().includes(loc));
    }
    if(searchTerm) {
      const q = searchTerm.toLowerCase();
      ext = ext.filter(j => (
        j.title?.toLowerCase().includes(q) ||
        j.company_name?.toLowerCase().includes(q) ||
        j.description?.toLowerCase().includes(q)
      ));
    }
    const getJobTime = (j) => {
      const candidates = [j.published_at, j.created, j.created_at, j.posted_at, j.updated_at, j.date, j.publication_date];
      for (const c of candidates) {
        if (!c) continue;
        const d = new Date(c);
        if (!isNaN(d?.getTime?.())) return d.getTime();
      }
      return 0; // sem data definida: vai para o final
    };
    ext.sort((a,b)=> getJobTime(b) - getJobTime(a));
    return ext;
  }, [externalJobs, filters.location, searchTerm]);

  // Atualização automática de vagas externas ao alterar busca/filters (debounce)
  const firstExternalAuto = useRef(true);
  useEffect(()=> {
    if(!(isCandidate || isSchool)) return;
    // Evita disparo imediato após carregamento inicial recomendado
    if(firstExternalAuto.current) { firstExternalAuto.current = false; return; }
    const timeout = setTimeout(()=> {
      if(searchTerm.trim()) {
        if (isCandidate) setHideHighlights(true);
        searchExternalExplicit();
      } else {
        if (isCandidate) setHideHighlights(false);
        refreshExternalByFilters();
      }
    }, 500); // 500ms debounce
    return () => clearTimeout(timeout);
  }, [searchTerm, filters.location, filters.area, isCandidate, isSchool]);

  const totalExternalPages = Math.ceil(filteredExternalJobs.length / EXTERNAL_PER_PAGE) || 1;
  const paginatedExternal = filteredExternalJobs.slice((externalPage-1)*EXTERNAL_PER_PAGE, externalPage*EXTERNAL_PER_PAGE);

  // Helper de paginação com reticências
  const buildPageList = (total, current) => {
    // Se total for muito pequeno, mostra todas
    if(total <= 3) return Array.from({length: total}, (_,i)=> i+1);
    
    const pages = [];
    
    // Sempre adiciona página 1
    pages.push(1);
    
    // Página 1: mostra 1, 2, ..., total
    if(current === 1) {
      pages.push(2);
      pages.push('...');
      pages.push(total);
    }
    // Página 2: mostra 1, 2, 3, ..., total
    else if(current === 2) {
      pages.push(2);
      pages.push(3);
      pages.push('...');
      pages.push(total);
    }
    // Penúltima página: mostra 1, ..., total-2, total-1, total
    else if(current === total - 1) {
      pages.push('...');
      pages.push(total - 2);
      pages.push(total - 1);
      pages.push(total);
    }
    // Última página: mostra 1, ..., total-1, total
    else if(current === total) {
      pages.push('...');
      pages.push(total - 1);
      pages.push(total);
    }
    // Caso contrário (meio): mostra 1, ..., atual-1, atual, atual+1, ..., total
    else {
      pages.push('...');
      pages.push(current - 1);
      pages.push(current);
      pages.push(current + 1);
      pages.push('...');
      pages.push(total);
    }
    
    return pages;
  };

  // Estatísticas de fontes externas (diagnóstico)
  const sourceStats = React.useMemo(()=> {
    return externalJobs.reduce((acc,j)=> { const s = j.source || 'desconhecida'; acc[s] = (acc[s]||0)+1; return acc; }, {});
  }, [externalJobs]);

  // Actions
  const handleFilterChange = (e) => { const { name, value, type, checked } = e.target; setFilters(prev=>({...prev, [name]: type==='checkbox'?checked:value })); };
  const handleFollowCompany = async (companyId) => { if(!user || user.type!=='candidate'){ toast({ title:'Acesso negado', description:'Apenas candidatos podem seguir empresas.', variant:'destructive'}); return; } try{ await chatAPI.followCompany(companyId); setFollowedCompanies(p=> new Set([...p,companyId])); toast({ title:'Empresa seguida!', description:'Agora você pode conversar com ela.'}); } catch(e){ toast({ title:'Erro ao seguir', description:'Tente novamente.', variant:'destructive'}); } };
  const handleSaveCandidate = async (jobId) => { if(!user || user.type!=='company'){ toast({ title:'Acesso negado', description:'Apenas empresas podem salvar candidatos.', variant:'destructive'}); return; } try{ await chatAPI.saveCandidate(user.id, jobId); setSavedCandidates(p=> new Set([...p,jobId])); toast({ title:'Candidato salvo!', description:'Interessados aparecerão em mensagens.'}); } catch(e){ toast({ title:'Erro ao salvar', description:'Tente novamente.', variant:'destructive'}); } };

  // Compartilhar vaga (escola)
  const openShareForJob = async (job) => {
    setShareJob(job);
    setShareOpen(true);
    if (isSchool) {
      try { setLoadingGroups(true); const grps = await chatAPI.getGroups(); setSchoolGroups(Array.isArray(grps)?grps:[]); if(grps?.length) setSelectedGroupKey(grps[0].key); }
      catch(e){ toast({ title:'Erro ao carregar grupos', description:'Tente novamente.', variant:'destructive' }); }
      finally{ setLoadingGroups(false); }
    }
  };
  const copyShareLink = async (job) => {
    try {
      const url = job?.is_external ? (job.url || '') : `${window.location.origin}/job/${job.id}`;
      await navigator.clipboard.writeText(url);
      toast({ title:'Link copiado', description:'O link da vaga foi copiado.' });
    }
    catch(e){ toast({ title:'Falha ao copiar', description:'Copie o link manualmente.', variant:'destructive' }); }
  };
  const shareToGroup = async () => {
    if(!shareJob || !selectedGroupKey) return;
    try { setSharing(true); const url = `${window.location.origin}/job/${shareJob.id}`; const msg = `${shareJob.title} — ${shareJob.company_name}\n${url}`; await chatAPI.sendGroupMessage(selectedGroupKey, msg); toast({ title:'Vaga compartilhada', description:'Enviada para o grupo selecionado.' }); setShareOpen(false); setShareJob(null);} 
    catch(e){ toast({ title:'Erro ao compartilhar', description:'Tente novamente.', variant:'destructive' }); }
    finally{ setSharing(false); }
  };

  // (Nativo removido conforme pedido)

  // Vagas fictícias para usuários não logados
  const fakeJobs = [
    {
      id: 'fake-1',
      title: 'Assistente Administrativo – Área Educacional',
      company_name: 'Empresa Exemplo',
      location: 'Ribeirão Preto, SP',
      salary_fixed: '1800',
      contract_type: 'clt',
      work_type: 'presencial',
      experience_level: 'junior',
      area: 'administracao',
      description: 'Estamos contratando um Assistente Administrativo para atuar no suporte às rotinas administrativas. O profissional será responsável por organização de documentos, atendimento e apoio aos setores internos.',
    },
    {
      id: 'fake-2',
      title: 'Desenvolvedor Frontend Júnior',
      company_name: 'Tech Solutions',
      location: 'São Paulo, SP',
      salary_fixed: '3500',
      contract_type: 'clt',
      work_type: 'hibrido',
      experience_level: 'junior',
      area: 'tecnologia',
      description: 'Buscamos um Desenvolvedor Frontend Júnior para integrar nosso time de tecnologia. Você atuará no desenvolvimento e manutenção de interfaces web utilizando React e TypeScript.',
    },
    {
      id: 'fake-3',
      title: 'Analista Financeiro',
      company_name: 'Consultoria ABC',
      location: 'Campinas, SP',
      salary_fixed: '4200',
      contract_type: 'clt',
      work_type: 'presencial',
      experience_level: 'pleno',
      area: 'financeiro',
      description: 'Vaga para Analista Financeiro com experiência em análise de dados, elaboração de relatórios e controle orçamentário. Conhecimento em Excel avançado é essencial.',
    },
    {
      id: 'fake-4',
      title: 'Auxiliar de Produção',
      company_name: 'Indústria XYZ',
      location: 'Sertãozinho, SP',
      salary_fixed: '1800',
      contract_type: 'clt',
      work_type: 'presencial',
      experience_level: 'junior',
      area: 'producao',
      description: 'Auxiliar nas etapas de produção, montagem e embalagem dos produtos. Abastecer máquinas e linhas de produção com materiais. Manter o local de trabalho limpo e organizado.',
    },
    {
      id: 'fake-5',
      title: 'Designer Gráfico',
      company_name: 'Agência Criativa',
      location: 'São Paulo, SP',
      salary_fixed: '3200',
      contract_type: 'pj',
      work_type: 'remoto',
      experience_level: 'pleno',
      area: 'design',
      description: 'Procuramos Designer Gráfico criativo para desenvolver peças visuais para redes sociais, materiais impressos e identidade visual de marcas.',
    },
    {
      id: 'fake-6',
      title: 'Estágio em Marketing Digital',
      company_name: 'Startup Inovação',
      location: 'Ribeirão Preto, SP',
      salary_fixed: '1200',
      contract_type: 'estagio',
      work_type: 'hibrido',
      experience_level: 'estagio',
      area: 'marketing',
      description: 'Estágio para estudantes de Marketing, Publicidade ou áreas relacionadas. Atuação em campanhas digitais, gestão de redes sociais e análise de métricas.',
    },
  ];

  // Se usuário não está logado, mostrar vagas fictícias com aviso
  if (!user) {
    return (
      <>
        <Helmet>
          <title>Buscar Vagas - CurrículoJá</title>
          <meta name="description" content="Faça login para encontrar vagas que combinam com seu perfil." />
        </Helmet>
        <div className="min-h-screen bg-gray-50">
          <div className="container mx-auto px-4 py-6">
            <div className="max-w-6xl mx-auto">
              {/* Header */}
              <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} className="text-center mb-4 md:mb-6 px-2 md:px-0">
                <h1 className="text-xl md:text-[2.05rem] font-bold text-gray-900 mb-1 tracking-tight leading-tight">
                  Encontre sua <span className="text-blue-600">Vaga Ideal</span>
                </h1>
                <p className="text-sm md:text-[15px] text-gray-600 max-w-2xl mx-auto leading-relaxed">
                  Milhares de oportunidades esperam por você. Conecte-se com seu futuro profissional.
                </p>
              </motion.div>

              {/* Aviso de login + Vagas fictícias */}
              <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} transition={{delay:0.1}}>
                {/* Banner de aviso */}
                <div className="mb-4 md:mb-6 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-2xl p-3 md:p-4 shadow-sm">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-3 md:gap-4">
                    <div className="flex items-center gap-2 md:gap-3">
                      <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                        <Lock className="w-5 h-5 md:w-6 md:h-6 text-amber-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-amber-800 text-xs md:text-base truncate">⚠️ Estas vagas são apenas exemplos ilustrativos</p>
                        <p className="text-amber-700 text-[10px] md:text-sm">Faça login para ver as vagas reais e se candidatar.</p>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0 w-full md:w-auto">
                      <Button 
                        onClick={() => navigate('/login')}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 md:px-6 py-2 rounded-xl shadow-md flex-1 md:flex-none text-sm"
                      >
                        <LogIn className="w-4 h-4 mr-1 md:mr-2" />
                        Entrar
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={() => navigate('/register')}
                        className="border-2 border-blue-200 hover:border-blue-400 hover:bg-blue-50 font-semibold px-4 md:px-6 py-2 rounded-xl flex-1 md:flex-none text-sm"
                      >
                        Criar conta
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Contador de vagas */}
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">{fakeJobs.length} vagas de exemplo</h2>
                    <p className="text-gray-500 text-sm">Mostrando vagas ilustrativas</p>
                  </div>
                </div>

                {/* Grid de vagas fictícias */}
                <div className="grid sm:grid-cols-2 gap-5">
                  {fakeJobs.map((job, index) => (
                    <motion.div
                      key={job.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card className="h-full bg-white/80 backdrop-blur-sm border-2 border-gray-100 hover:border-blue-200 hover:shadow-lg transition-all duration-300 rounded-2xl overflow-hidden relative">
                        {/* Badge de exemplo */}
                        <div className="absolute top-3 right-3 z-10">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide bg-amber-100 text-amber-700 px-2 py-1 rounded-full border border-amber-200">
                            <Lock className="w-3 h-3" />
                            Exemplo
                          </span>
                        </div>
                        <CardContent className="p-5">
                          <div className="flex items-start gap-4 mb-3">
                            {/* Logo fictícia */}
                            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center flex-shrink-0 border border-slate-200">
                              <Building className="w-7 h-7 text-slate-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-gray-900 text-base leading-tight mb-1 line-clamp-2">{job.title}</h3>
                              <p className="text-sm text-gray-500 font-medium">{job.company_name}</p>
                            </div>
                          </div>

                          {/* Tags */}
                          <div className="flex flex-wrap gap-1.5 mb-3">
                            {job.location && (
                              <span className="inline-flex items-center text-[11px] font-medium bg-blue-50 text-blue-700 px-2 py-1 rounded-lg border border-blue-100">
                                <MapPin className="w-3 h-3 mr-1" />
                                {job.location}
                              </span>
                            )}
                            {job.salary_fixed && (
                              <span className="inline-flex items-center text-[11px] font-medium bg-green-50 text-green-700 px-2 py-1 rounded-lg border border-green-100">
                                <DollarSign className="w-3 h-3 mr-1" />
                                R$ {job.salary_fixed}
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap gap-1.5 mb-3">
                            {job.contract_type && (
                              <span className="text-[10px] font-semibold uppercase bg-purple-50 text-purple-700 px-2 py-0.5 rounded-md border border-purple-100">
                                {job.contract_type}
                              </span>
                            )}
                            {job.work_type && (
                              <span className="text-[10px] font-semibold uppercase bg-orange-50 text-orange-700 px-2 py-0.5 rounded-md border border-orange-100">
                                {job.work_type}
                              </span>
                            )}
                            {job.experience_level && (
                              <span className="text-[10px] font-semibold uppercase bg-cyan-50 text-cyan-700 px-2 py-0.5 rounded-md border border-cyan-100">
                                {job.experience_level}
                              </span>
                            )}
                            {job.area && (
                              <span className="text-[10px] font-semibold uppercase bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md border border-slate-200">
                                {getAreaLabel(job.area)}
                              </span>
                            )}
                          </div>

                          {/* Descrição */}
                          <p className="text-gray-600 text-xs leading-relaxed line-clamp-3 mb-4">
                            {job.description}
                          </p>

                          {/* Botão bloqueado */}
                          <Button 
                            onClick={() => navigate('/login')}
                            className="w-full bg-gray-100 hover:bg-blue-600 text-gray-500 hover:text-white font-semibold py-2.5 rounded-xl transition-all duration-300 group"
                          >
                            <Lock className="w-4 h-4 mr-2 group-hover:hidden" />
                            <LogIn className="w-4 h-4 mr-2 hidden group-hover:inline" />
                            <span className="group-hover:hidden">Faça login para ver</span>
                            <span className="hidden group-hover:inline">Entrar agora</span>
                          </Button>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>

                {/* CTA Final */}
                <motion.div 
                  initial={{opacity:0, y:20}} 
                  animate={{opacity:1, y:0}} 
                  transition={{delay:0.4}}
                  className="mt-8"
                >
                  <Card className="bg-gradient-to-r from-blue-600 to-indigo-600 border-2 border-gray-200 rounded-2xl overflow-hidden shadow-xl">
                    <CardContent className="p-8 text-center">
                      <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-4">
                        <Briefcase className="w-8 h-8 text-white" />
                      </div>
                      <h2 className="text-2xl font-bold text-white mb-2">Pronto para encontrar sua vaga?</h2>
                      <p className="text-blue-100 mb-6 max-w-md mx-auto">
                        Crie sua conta gratuita e tenha acesso a todas as vagas reais disponíveis na plataforma.
                      </p>
                      <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Button 
                          onClick={() => navigate('/register')}
                          className="bg-white text-blue-600 hover:bg-blue-50 font-bold px-8 py-3 rounded-xl shadow-lg"
                        >
                          Criar conta gratuita
                        </Button>
                        <Button 
                          variant="outline"
                          onClick={() => navigate('/login')}
                          className="border-2 border-white/30 text-white hover:bg-white/10 font-semibold px-8 py-3 rounded-xl"
                        >
                          Já tenho conta
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>Buscar Vagas - CurrículoJá</title>
        <meta name="description" content="Encontre vagas internas e externas que combinam com seu perfil." />
      </Helmet>
  <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-3 md:px-4 py-4 md:py-6">
          <div className="max-w-6xl mx-auto">
            <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} className="text-center mb-3 md:mb-3.5">
              <h1 className="text-xl md:text-[2.05rem] font-bold text-gray-900 mb-1 tracking-tight leading-tight">Encontre sua<span className="text-blue-600 block sm:inline sm:ml-2">Vaga Ideal</span></h1>
              <p className="text-sm md:text-[15px] text-gray-600 max-w-2xl mx-auto leading-relaxed hidden sm:block">Milhares de oportunidades esperam por você.</p>
            </motion.div>
            <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} transition={{delay:0.1}} className="mb-4 md:mb-5">
              <Card className="shadow-md border-2 border-gray-200 bg-white/80 backdrop-blur-sm rounded-xl md:rounded-2xl">
                <CardContent className="p-3 md:p-3.5">
                  <div className="relative">
                    <Search className="absolute left-3 md:left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 md:w-[18px] h-4 md:h-[18px]" />
                    <Input placeholder="Buscar cargo, empresa..." value={searchTerm} onChange={(e)=> setSearchTerm(e.target.value)} className="pl-8 md:pl-9 h-9 md:h-10 text-[13px] md:text-[14.5px] border-2 border-gray-200 focus:border-blue-500 rounded-xl md:rounded-2xl" />
                  </div>
                  {/* Chips de filtros ativos */}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {filters.location && (
                      <div className="group inline-flex items-center text-[11px] font-medium bg-blue-50 border border-blue-200 text-blue-700 pl-2.5 pr-1 py-1 rounded-full transition hover:bg-blue-100 relative overflow-hidden">
                        <span className="w-4 h-4 mr-1 flex items-center justify-center relative">
                          <MapPin className="w-3.5 h-3.5 text-blue-600 transition-opacity duration-200 group-hover:opacity-0" />
                          <button onClick={()=> setFilters(p=>({...p, location:''}))} className="absolute inset-0 w-4 h-4 flex items-center justify-center rounded-full text-blue-600 bg-blue-100/0 hover:bg-blue-600 hover:text-white opacity-0 group-hover:opacity-100 transition-all duration-200" aria-label="Remover localização">×</button>
                        </span>
                        {filters.location}
                      </div>
                    )}
                    {filters.contract_type !== 'Todos' && (
                      <div className="group inline-flex items-center text-[11px] font-medium bg-purple-50 border border-purple-200 text-purple-700 pl-2.5 pr-1 py-1 rounded-full hover:bg-purple-100 relative overflow-hidden">
                        <span className="w-4 h-4 mr-1 flex items-center justify-center relative">
                          <Briefcase className="w-3.5 h-3.5 text-purple-600 transition-opacity duration-200 group-hover:opacity-0" />
                          <button onClick={()=> setFilters(p=>({...p, contract_type:'Todos'}))} className="absolute inset-0 w-4 h-4 flex items-center justify-center rounded-full text-purple-600 bg-purple-100/0 hover:bg-purple-600 hover:text-white opacity-0 group-hover:opacity-100 transition-all duration-200" aria-label="Remover tipo de contrato">×</button>
                        </span>
                        {filters.contract_type.toUpperCase()}
                      </div>
                    )}
                    {filters.work_type !== 'Todos' && (
                      <div className="group inline-flex items-center text-[11px] font-medium bg-orange-50 border border-orange-200 text-orange-700 pl-2.5 pr-1 py-1 rounded-full hover:bg-orange-100 relative overflow-hidden">
                        <span className="w-4 h-4 mr-1 flex items-center justify-center relative">
                          <Calendar className="w-3.5 h-3.5 text-orange-600 transition-opacity duration-200 group-hover:opacity-0" />
                          <button onClick={()=> setFilters(p=>({...p, work_type:'Todos'}))} className="absolute inset-0 w-4 h-4 flex items-center justify-center rounded-full text-orange-600 bg-orange-100/0 hover:bg-orange-500 hover:text-white opacity-0 group-hover:opacity-100 transition-all duration-200" aria-label="Remover modelo de trabalho">×</button>
                        </span>
                        {filters.work_type.charAt(0).toUpperCase()+filters.work_type.slice(1)}
                      </div>
                    )}
                    {filters.experience_level !== 'Todos' && (
                      <div className="group inline-flex items-center text-[11px] font-medium bg-indigo-50 border border-indigo-200 text-indigo-700 pl-2.5 pr-1 py-1 rounded-full hover:bg-indigo-100 relative overflow-hidden">
                        <span className="w-4 h-4 mr-1 flex items-center justify-center relative">
                          <Award className="w-3.5 h-3.5 text-indigo-600 transition-opacity duration-200 group-hover:opacity-0" />
                          <button onClick={()=> setFilters(p=>({...p, experience_level:'Todos'}))} className="absolute inset-0 w-4 h-4 flex items-center justify-center rounded-full text-indigo-600 bg-indigo-100/0 hover:bg-indigo-600 hover:text-white opacity-0 group-hover:opacity-100 transition-all duration-200" aria-label="Remover experiência">×</button>
                        </span>
                        {filters.experience_level.charAt(0).toUpperCase()+filters.experience_level.slice(1)}
                      </div>
                    )}
                    {filters.area !== 'Todos' && (
                      <div className="group inline-flex items-center text-[11px] font-medium bg-teal-50 border border-teal-200 text-teal-700 pl-2.5 pr-1 py-1 rounded-full hover:bg-teal-100 relative overflow-hidden">
                        <span className="w-4 h-4 mr-1 flex items-center justify-center relative">
                          <Layers className="w-3.5 h-3.5 text-teal-600 transition-opacity duration-200 group-hover:opacity-0" />
                          <button onClick={()=> setFilters(p=>({...p, area:'Todos', subarea:'Todos'}))} className="absolute inset-0 w-4 h-4 flex items-center justify-center rounded-full text-teal-600 bg-teal-100/0 hover:bg-teal-600 hover:text-white opacity-0 group-hover:opacity-100 transition-all duration-200" aria-label="Remover área">×</button>
                        </span>
                        {getAreaLabel(filters.area)}
                      </div>
                    )}
                    {filters.subarea !== 'Todos' && (
                      <div className="group inline-flex items-center text-[11px] font-medium bg-cyan-50 border border-cyan-200 text-cyan-700 pl-2.5 pr-1 py-1 rounded-full hover:bg-cyan-100 relative overflow-hidden">
                        <span className="w-4 h-4 mr-1 flex items-center justify-center relative">
                          <Tag className="w-3.5 h-3.5 text-cyan-600 transition-opacity duration-200 group-hover:opacity-0" />
                          <button onClick={()=> setFilters(p=>({...p, subarea:'Todos'}))} className="absolute inset-0 w-4 h-4 flex items-center justify-center rounded-full text-cyan-600 bg-cyan-100/0 hover:bg-cyan-600 hover:text-white opacity-0 group-hover:opacity-100 transition-all duration-200" aria-label="Remover subárea">×</button>
                        </span>
                        {getSubareaLabel(filters.subarea)}
                      </div>
                    )}
                  </div>
                  <div className="mt-2.5 flex gap-2 flex-wrap text-xs">
                    <Button onClick={()=> { if(searchTerm.trim()){ setHideHighlights(true); searchExternalExplicit(); } else { setHideHighlights(false); refreshExternalByFilters(); } const el=document.getElementById('job-results-top'); if(el) el.scrollIntoView({behavior:'smooth'}); }} className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 h-9 text-xs flex-1 sm:flex-none">
                      <Search className="w-4 h-4" />
                      <span className="ml-1.5">Buscar</span>
                    </Button>
                    <Button onClick={loadExternalRecommended} variant="outline" disabled={loadingExternalRecommended} className="rounded-xl px-3 py-1.5 h-9 text-xs">
                      {loadingExternalRecommended? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                      <span className="ml-1.5 hidden sm:inline">Atualizar</span>
                    </Button>
                    <Button onClick={searchExternalExplicit} variant="outline" disabled={loadingExternal} className="rounded-xl px-3 py-1.5 h-9 text-xs">
                      {loadingExternal? <RefreshCw className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                      <span className="ml-1.5 hidden sm:inline">Externas</span>
                    </Button>
                    <div className="flex items-center">
                      <div>
                        <button
                          ref={typesBtnRef}
                          onMouseEnter={() => {
                            if (typesBtnRef.current) {
                              const r = typesBtnRef.current.getBoundingClientRect();
                              const POPOVER_WIDTH = 544; // ~34rem
                              const viewportWidth = (typeof window!== 'undefined' ? window.innerWidth : POPOVER_WIDTH);
                              const left = Math.min(r.left, viewportWidth - POPOVER_WIDTH);
                              const top = r.bottom + 8;
                              setTypesPos({ left, top });
                            }
                            setTypesOpen(true);
                          }}
                          onMouseLeave={() => setTypesOpen(false)}
                          type="button"
                          aria-label="Informações sobre tipos de vagas"
                          data-tour="jobs.types"
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 bg-white border border-blue-200 hover:border-blue-300 hover:bg-blue-50 rounded-full pl-1.5 pr-3 py-1 shadow-sm transition"
                        >
                          <span className="w-5 h-5 flex items-center justify-center rounded-full bg-blue-600 text-white text-[11px] font-bold leading-none shadow-sm">!</span>
                          <span className="tracking-tight">Tipos de vagas</span>
                        </button>
                        {typesOpen && createPortal(
                          <div
                            className="fixed z-[99999]"
                            style={{ left: typesPos.left, top: typesPos.top }}
                            onMouseEnter={() => setTypesOpen(true)}
                            onMouseLeave={() => setTypesOpen(false)}
                          >
                            <div className="relative p-4 rounded-3xl border border-blue-200 bg-white shadow-[0_8px_28px_-4px_rgba(30,64,175,0.25)] ring-1 ring-blue-50 text-[11px] leading-relaxed antialiased w-[34rem] max-w-[34rem]">
                              <div className="absolute -top-2 left-6 w-3 h-3 rotate-45 bg-white border-l border-t border-blue-200 rounded-sm"></div>
                              <div className="flex items-center gap-2 mb-3">
                                <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-[11px] font-bold shadow">!</div>
                                <p className="font-semibold text-blue-700 text-[12px] tracking-tight">Tipos de vagas no CurrículoJá</p>
                              </div>
                              <div className="grid grid-cols-2 gap-2.5 mb-3">
                                <div className="flex items-start gap-2 rounded-2xl border border-blue-100 bg-blue-50/70 p-3">
                                  <div className="w-8 h-8 rounded-full bg-blue-600/10 text-blue-600 flex items-center justify-center">
                                    <Building className="w-4 h-4" />
                                  </div>
                                  <div className="text-[11px] leading-snug pr-1">
                                    <p className="font-semibold text-blue-700 mb-0.5">Internas</p>
                                    <p className="text-blue-700/80">Criadas por empresas parceiras dentro da plataforma.</p>
                                  </div>
                                </div>
                                <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50/80 p-3">
                                  <div className="w-8 h-8 rounded-full bg-amber-500/15 text-amber-700 flex items-center justify-center">
                                    <Star className="w-4 h-4" />
                                  </div>
                                  <div className="text-[11px] leading-snug pr-1">
                                    <p className="font-semibold text-amber-800 mb-0.5">Destaque da Escola</p>
                                    <p className="text-amber-800/80">Recomendadas pela sua escola e/ou turma.</p>
                                  </div>
                                </div>
                                <div className="flex items-start gap-2 rounded-2xl border border-blue-200 bg-blue-50/80 p-3">
                                  <div className="w-8 h-8 rounded-full bg-blue-500/15 text-blue-700 flex items-center justify-center">
                                    <Zap className="w-4 h-4" />
                                  </div>
                                  <div className="text-[11px] leading-snug pr-1">
                                    <p className="font-semibold text-blue-800 mb-0.5">Destaque da Empresa</p>
                                    <p className="text-blue-800/80">Impulsionadas diretamente por empresas parceiras.</p>
                                  </div>
                                </div>
                                <div className="flex items-start gap-2 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-3">
                                  <div className="w-8 h-8 rounded-full bg-emerald-500/15 text-emerald-700 flex items-center justify-center">
                                    <Users className="w-4 h-4" />
                                  </div>
                                  <div className="text-[11px] leading-snug pr-1">
                                    <p className="font-semibold text-emerald-800 mb-0.5">Comunidade</p>
                                    <p className="text-emerald-800/80">Cadastradas pela equipe (Admin) quando a empresa não possui perfil na plataforma.</p>
                                  </div>
                                </div>
                                <div className="flex items-start gap-2 rounded-2xl border border-orange-200 bg-orange-50/80 p-3">
                                  <div className="w-8 h-8 rounded-full bg-orange-500/15 text-orange-700 flex items-center justify-center">
                                    <Briefcase className="w-4 h-4" />
                                  </div>
                                  <div className="text-[11px] leading-snug pr-1">
                                    <p className="font-semibold text-orange-800 mb-0.5">Agência</p>
                                    <p className="text-orange-800/80">Publicadas por agências de estágio parceiras, com link para candidatura externa.</p>
                                  </div>
                                </div>
                                <div className="flex items-start gap-2 rounded-2xl border border-indigo-200 bg-indigo-50/80 p-3">
                                  <div className="w-8 h-8 rounded-full bg-indigo-500/15 text-indigo-700 flex items-center justify-center flex-shrink-0">
                                    <ExternalLink className="w-4 h-4" />
                                  </div>
                                  <div className="text-[11px] leading-snug pr-1">
                                    <p className="font-semibold text-indigo-700 mb-0.5">Externas</p>
                                    <p className="text-indigo-700/80">Importadas de outros sites parceiros.</p>
                                  </div>
                                </div>
                              </div>
                              <div className="rounded-2xl bg-yellow-50 border border-yellow-200 p-2.5 text-[10.5px] leading-snug text-gray-800">
                                <p className="[&>strong]:font-semibold tracking-tight">
                                  <span className="relative inline-block mr-1 font-semibold text-red-700 align-middle">
                                    <span className="absolute inset-0 bg-red-100 rounded -rotate-1"></span>
                                    <span className="relative px-1">Atenção:</span>
                                  </span>
                                  Vagas externas só consideram <span className="font-semibold text-blue-700 whitespace-nowrap leading-none text-[15px] md:text-[12px]">localização</span> e <strong className="font-semibold">termo digitado</strong>;
                                </p>
                              </div>
                            </div>
                          </div>, document.body)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-6">
              <div className="lg:col-span-1 order-1">
                <div className="lg:sticky lg:top-[72px]">                
                <motion.div initial={{opacity:0, x:-20}} animate={{opacity:1, x:0}} transition={{delay:0.2}}>
                  <Card className="shadow-lg border-0 md:border-2 md:border-blue-100 md:hover:border-blue-300 transition-colors !rounded-2xl overflow-hidden text-[13px] !p-0">
                    <CardHeader className={`bg-blue-600 text-white relative py-3 md:py-4 !m-0 ${showFilters || (typeof window!=='undefined' && window.innerWidth>=1024) ? '!rounded-t-2xl' : '!rounded-2xl'}`}>
                      <div className="relative flex justify-between items-center">
                        <CardTitle className="flex items-center text-white text-base font-bold">
                          <div className="bg-white/20 p-1.5 rounded-xl mr-2.5"><Filter className="h-5 w-5" /></div>
                          <span className="hidden sm:inline">Filtros de Busca</span>
                          <span className="sm:hidden">Filtros</span>
                        </CardTitle>
                        <Button variant="ghost" size="sm" onClick={()=> setShowFilters(!showFilters)} className="lg:hidden text-white hover:bg-white/20 border border-white/30 rounded-full px-3 py-1.5 text-xs font-medium">{showFilters? 'Fechar':'Abrir'}</Button>
                      </div>
                      <p className="relative mt-2 text-[11px] font-medium text-white/90 hidden sm:block">Refine os resultados conforme seu perfil.</p>
                    </CardHeader>
                    {/* Área com rolagem interna para o conteúdo do filtro (limitada para exibir ~4 itens) */}
                    <div className="max-h-[20rem] overflow-y-auto md:max-h-[20rem] rounded-b-2xl">
                      <AnimatePresence>
                        {(showFilters || (typeof window!=='undefined' && window.innerWidth>=1024)) && (
                          <motion.div initial={{height:0, opacity:0}} animate={{height:'auto', opacity:1}} exit={{height:0, opacity:0}} className="overflow-hidden lg:block">
                            <CardContent className={`p-4 bg-gradient-to-b from-gray-50 to-white rounded-b-2xl ${showAdvancedFilters ? 'space-y-2.5' : 'space-y-3.5'}`}>
                            <div className="space-y-3.5">
                              <div className="group">
                                <Label htmlFor="location" className="flex items-center text-[13px] font-bold text-gray-800 mb-1.5"><div className="bg-blue-100 p-1.5 rounded-xl mr-2.5 group-hover:bg-blue-200 transition-colors"><MapPin className="w-4 h-4 text-blue-600" /></div>Localização</Label>
                                <div className="relative">
                                  <Input name="location" id="location" placeholder="Cidade, estado ou região" value={filters.location} onChange={handleFilterChange} className={`pl-3.5 pr-3.5 py-2 ${showAdvancedFilters ? 'h-8' : 'h-9'} border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-xl bg-white shadow-sm transition-all duration-300 text-[13px]`} />
                                  {filters.location && (<button onClick={()=> setFilters(p=>({...p, location:''}))} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">✕</button>)}
                                </div>
                              </div>
                              <div className="group">
                                <Label className="flex items-center text-[13px] font-bold text-gray-800 mb-1.5"><div className="bg-yellow-100 p-1.5 rounded-xl mr-2.5 group-hover:bg-yellow-200 transition-colors"><Briefcase className="w-4 h-4 text-yellow-600" /></div>Área</Label>
                                <Combobox variant="minimal" options={areasList.length? areasList:[{ value:'Todos', label:'Todas as áreas'}]} value={filters.area} onChange={val=> setFilters(p=>({...p, area:val}))} />
                              </div>
                              {subareasList.length > 0 && (
                                <div className="group">
                                  <Label className="flex items-center text-[13px] font-bold text-gray-800 mb-1.5">
                                    <div className="bg-teal-100 p-1.5 rounded-xl mr-2.5 group-hover:bg-teal-200 transition-colors"><Grid className="w-4 h-4 text-teal-600" /></div>
                                    Sub-área
                                  </Label>
                                  <Combobox
                                    variant="minimal"
                                    options={subareasList}
                                    value={filters.subarea}
                                    onChange={val=> setFilters(p=>({...p, subarea:val}))}
                                  />
                                </div>
                              )}
                              <div className="flex flex-col gap-2 pt-1">
                                <Button variant="secondary" onClick={()=> setShowAdvancedFilters(s=>!s)} className="w-full py-2 bg-white border-2 border-blue-200 text-blue-700 hover:bg-blue-50 rounded-xl font-medium text-[13px]">{showAdvancedFilters? 'Ocultar filtros avançados':'Mais filtros'}</Button>
                              </div>
                              <AnimatePresence>
                                {showAdvancedFilters && (
                                  <motion.div initial={{opacity:0, y:-8}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-8}} className="space-y-3.5 pt-2 border-t border-gray-200">
                                    <div className="group"><Label className="flex items-center text-[13px] font-bold text-gray-800 mb-1.5"><div className="bg-purple-100 p-1.5 rounded-xl mr-2.5 group-hover:bg-purple-200 transition-colors"><Briefcase className="w-4 h-4 text-purple-600" /></div>Contrato</Label><Combobox variant="minimal" options={jobTypes.map(t=>({ value:t, label: CONTRACT_TYPE_LABELS[t]||t }))} value={filters.contract_type} onChange={val=> setFilters(p=>({...p, contract_type:val}))} /></div>
                                    <div className="group"><Label className="flex items-center text-[13px] font-bold text-gray-800 mb-1.5"><div className="bg-green-100 p-1.5 rounded-xl mr-2.5 group-hover:bg-green-200 transition-colors"><Calendar className="w-4 h-4 text-green-600" /></div>Modalidade</Label><Combobox variant="minimal" options={workTypes.map(w=>({ value:w, label: WORK_TYPE_LABELS[w]||w }))} value={filters.work_type} onChange={val=> setFilters(p=>({...p, work_type:val}))} /></div>
                                    <div className="group"><Label className="flex items-center text-[13px] font-bold text-gray-800 mb-1.5"><div className="bg-orange-100 p-1.5 rounded-xl mr-2.5 group-hover:bg-orange-200 transition-colors"><Award className="w-4 h-4 text-orange-600" /></div>Experiência</Label><Combobox variant="minimal" options={experienceLevels.map(e=>({ value:e, label: EXPERIENCE_LEVEL_LABELS[e]||e }))} value={filters.experience_level} onChange={val=> setFilters(p=>({...p, experience_level:val}))} /></div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                              <div className="pt-2 border-t border-gray-200 mt-1.5">
                                <Button variant="outline" onClick={()=> setFilters({ location:'', contract_type:'Todos', work_type:'Todos', experience_level:'Todos', area:'Todos', subarea:'Todos' })} className="w-full py-2 border-2 border-gray-300 hover:border-red-400 hover:text-red-600 hover:bg-red-50 transition-all duration-300 rounded-xl font-medium text-[13px]">Limpar filtros</Button>
                              </div>
                            </div>
                            </CardContent>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </Card>
                </motion.div>
                </div>
              </div>
              <div className="lg:col-span-3 order-2">
                <motion.div initial={{opacity:0, x:20}} animate={{opacity:1, x:0}} transition={{delay:0.3}}>
                  {/* Blocos legados de recomendações/destaques para alunos removidos para evitar duplicidade */}
                  {/* Aviso de destaques ocultados (mostrado apenas se não estiver no modo combinado) */}
                  {!isSchool && hasHiddenHighlights && !(filteredExternalJobs.length === 0 && externalJobs.length > 0) && (
                    <div className="mb-8 text-center text-sm text-gray-600">Destaques ocultados pelos filtros atuais. Limpe ou ajuste os filtros para visualizá-los novamente.</div>
                  )}
                  {/* Aviso de externas: filtros não encontraram resultados (mesmo estilo) */}
                  {(!isSchool || schoolTab==='vagas') && !isUnfiltered && filteredExternalJobs.length === 0 && (
                    <div className="mb-8 text-center text-sm text-gray-600">Vagas externas só consideram o filtro de localização e termo digitado.</div>
                  )}
                  {(loading || filteredJobs.length>0 || (isTabbedUser && (loadingSchoolHighlights || loadingSchoolCompanyHighlights || filteredSchoolHighlights.length>0 || filteredSchoolCompanyHighlights.length>0 || totalCandidateHighlights>0))) && (
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4 md:mb-5 scroll-mt-[72px]" id="job-results-top">
                      <div className="min-w-0 flex-1">
                        <h2 className={`text-base md:text-lg font-bold ${(isTabbedUser && schoolTab==='destaques') ? 'text-amber-700' : 'text-gray-900'}`}>
                          {(isTabbedUser && schoolTab==='destaques')
                            ? `Vagas destacadas (${isSchool ? ((filteredSchoolHighlights?.length||0) + (filteredSchoolCompanyHighlights?.length||0)) : totalCandidateHighlights})`
                            : internalJobsHeading}
                        </h2>
                        {!loading && schoolTab==='vagas' && filteredJobs.length>0 && (
                          <p className="text-gray-600 text-xs md:text-sm">Mostrando resultados {searchTerm && <span>para "{searchTerm}"</span>}</p>
                        )}
                        {(isTabbedUser && schoolTab==='destaques') && (
                          <p className="text-gray-600 text-xs md:text-sm">
                            {(() => {
                              const s = isSchool ? (filteredSchoolHighlights?.length||0) : candidateSchoolCount;
                              const c = isSchool ? (filteredSchoolCompanyHighlights?.length||0) : candidateCompanyCount;
                              const base = s && c ? 'Vagas destacadas pela sua escola e por empresas'
                                : s ? 'Vagas destacadas pela sua escola'
                                : c ? (isSchool ? 'Vagas destacadas por empresas para a sua escola' : 'Vagas destacadas por empresas')
                                : null;
                              if (!base) return null;
                              if (isSchool && schoolClassFilter && schoolClassFilter !== 'all') {
                                const cls = (classOptions || []).find(x => String(x.id) === String(schoolClassFilter));
                                const name = cls?.class_name || cls?.name || schoolClassFilter;
                                return `${base} — Turma: ${name}`;
                              }
                              return base;
                            })()}
                          </p>
                        )}
                      </div>
                      {isTabbedUser ? (
                        <LayoutGroup id="tabs-main">
                          <div className="relative inline-flex items-center gap-1 rounded-full bg-gray-100 shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)] p-1.5 flex-shrink-0 mx-auto sm:mx-0" role="tablist" aria-label="Alternar entre vagas e destacadas">
                            <button
                              type="button"
                              role="tab"
                              aria-selected={schoolTab==='vagas'}
                              onClick={()=> setSchoolTab('vagas')}
                              className={`relative inline-flex items-center justify-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${schoolTab==='vagas' ? 'text-white' : 'text-gray-700 hover:text-gray-900'}`}
                            >
                              {schoolTab==='vagas' && (
                                <motion.span
                                  initial={false}
                                  layoutScroll
                                  layoutId="schoolTabSlider"
                                  className="absolute inset-0 rounded-full bg-blue-600 shadow"
                                  transition={{ type:'spring', stiffness:500, damping:40, mass:0.3 }}
                                />
                              )}
                              <span className="relative z-10 inline-flex items-center gap-1.5">
                                <List className={`w-4 h-4 ${schoolTab==='vagas' ? 'opacity-100 text-white' : 'opacity-80 text-gray-700'}`} />
                                <span>Vagas</span>
                                <span className={`inline-flex items-center justify-center min-w-[1.25rem] px-1.5 h-5 text-[11px] rounded-full font-bold ${schoolTab==='vagas' ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'}`}>{filteredJobs?.length ?? 0}</span>
                              </span>
                            </button>
                            <button
                              type="button"
                              role="tab"
                              aria-selected={schoolTab==='destaques'}
                              onClick={()=> setSchoolTab('destaques')}
                              className={`relative inline-flex items-center justify-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${schoolTab==='destaques' ? 'text-white' : 'text-amber-700 hover:text-amber-800'}`}
                            >
                              {schoolTab==='destaques' && (
                                <motion.span
                                  initial={false}
                                  layoutScroll
                                  layoutId="schoolTabSlider"
                                  className="absolute inset-0 rounded-full bg-amber-500 shadow"
                                  transition={{ type:'spring', stiffness:500, damping:40, mass:0.3 }}
                                />
                              )}
                              <span className="relative z-10 inline-flex items-center gap-1.5">
                                <Star className={`w-4 h-4 ${schoolTab==='destaques' ? 'opacity-100 text-white' : 'opacity-80 text-amber-700'}`} />
                                <span>Destacadas</span>
                                <span className={`inline-flex items-center justify-center min-w-[1.25rem] px-1.5 h-5 text-[11px] rounded-full font-bold ${schoolTab==='destaques' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'}`}>
                                  { isSchool
                                    ? ((loadingSchoolHighlights || loadingSchoolCompanyHighlights) ? '…' : ((filteredSchoolHighlights?.length||0) + (filteredSchoolCompanyHighlights?.length||0)))
                                    : totalCandidateHighlights }
                                </span>
                              </span>
                            </button>
                          </div>
                        </LayoutGroup>
                      ) : null}
                    </div>
                  )}
                  {loading && (
                    <Card className="shadow-lg border-2 border-gray-200">
                      <CardContent className="p-12 text-center">
                        <div className="flex justify-center items-center">
                          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600" />
                          <span className="ml-4 text-xl font-medium text-gray-700">Carregando vagas...</span>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  <AnimatePresence mode="wait">
                    {(!loading && ((isTabbedUser ? schoolTab==='vagas' : true))) && (
                      <motion.div key="tab-vagas" initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-10}} transition={{duration:0.18}}>
                        <div className={'grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 items-stretch'}>
                          {paginatedInternalJobs.map((job,index)=> {
                          const isHighlighted = highlightedJobIds.includes(job.id);
                          const cardHighlightClass = isHighlighted ? 'bg-white ring-2 ring-amber-300' : 'bg-white/80';
                          // Title: blue; underline only on hover
                          const titleClass = `text-xl font-bold transition-colors duration-300 mb-1 leading-tight text-blue-700 group-hover:text-blue-800 group-hover:underline group-hover:decoration-2 underline-offset-2 decoration-blue-700`;
                          const ct = safeLabel(job.contract_type);
                          const wt = safeLabel(job.work_type);
                          const el = safeLabel(job.experience_level);
                          const areaKey = safeLabel(job.area);
                            return (
                            <motion.div key={job.id} className="h-full" initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} transition={{duration:0.4, delay:index*0.05}} whileHover={{ y:-5, transition:{ duration:0.2 } }}>
                              <Card
                                className={'shadow-md hover:shadow-lg transition-all duration-300 border-2 border-gray-200 group overflow-hidden rounded-2xl '+cardHighlightClass+' h-full flex flex-col cursor-pointer focus:outline-none'}
                                onClick={(e)=>handleCardClick(e, job.id, job)}
                                onKeyDown={(e)=>handleCardKeyDown(e, job.id, job)}
                                role="button"
                                tabIndex={0}
                                data-tour={index===0 ? 'jobs.firstCard' : undefined}
                              >
                                <CardContent className="p-2 md:p-3 flex flex-col h-full">
                                  <div className="flex justify-between items-start mb-2">
                                    <div className="flex-1 pr-4">
                                      <div className="flex items-start space-x-2.5 mb-2">
                                        {(() => {
                                          let shape = 'circle';
                                          try {
                                            if (job?.company_id) {
                                              shape = localStorage.getItem('company_avatar_shape_'+job.company_id) || 'circle';
                                            }
                                          } catch {}
                                          const roundedClass = shape === 'circle' ? 'rounded-full' : 'rounded-xl';
                                          return (
                                            <Link to={job.company_id ? `/company/${job.company_id}` : '#'} onClick={(e) => { e.stopPropagation(); if (!job.company_id) e.preventDefault(); }} className={`w-11 h-11 ${roundedClass} flex items-center justify-center flex-shrink-0 overflow-hidden hover:ring-2 hover:ring-blue-300 transition-all ${getCompanyImage(job.company_id) ? '' : 'bg-white border border-gray-200'}`}>
                                              {getCompanyImage(job.company_id) ? (
                                                <img src={getCompanyImage(job.company_id)} alt="Logo" className="w-full h-full object-contain" />
                                              ) : (
                                                <Building className="w-5 h-5 text-blue-700" />
                                              )}
                                            </Link>
                                          );
                                        })()}
                                        <div className="flex-1 min-w-0">
                                          <h3 className={(titleClass.replace('text-xl','text-[15px] md:text-[17px]')+ ' antialiased line-clamp-2')}>{job.title}</h3>
                                          <div className="flex items-center gap-1 md:gap-2 flex-wrap">
                                            <Link to={job.company_id ? `/company/${job.company_id}` : '#'} onClick={(e) => { e.stopPropagation(); if (!job.company_id) e.preventDefault(); }} className="text-gray-800 font-semibold text-[12px] md:text-[14px] leading-snug hover:text-blue-600 hover:underline transition-colors truncate max-w-[150px] md:max-w-none">{job.company_name}</Link>
                                            {partnerCompanyIds.has(String(job.company_id)) && <span className="inline-flex items-center text-[10px] md:text-[11px] font-bold text-emerald-700 bg-emerald-50 px-1.5 md:px-2.5 py-0.5 md:py-1 rounded-full border md:border-2 border-emerald-200"><FaRegHandshake className="w-3 h-3 md:w-3.5 md:h-3.5 mr-0.5 md:mr-1 text-emerald-600" /><span className="hidden sm:inline">Parceira</span></span>}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex items-end gap-2 flex-shrink-0">
                                      {user && user.type==='company' && (
                                        <Button variant="outline" size="sm" onClick={()=> handleSaveCandidate(job.id)} disabled={savedCandidates.has(job.id)} className="bg-white border-2 border-purple-500 text-purple-600 hover:bg-purple-50 rounded-2xl px-2 py-1.5 text-[11px]"><Bookmark className="w-3.5 h-3.5 mr-1" /><span className="hidden sm:inline text-[11px]">{savedCandidates.has(job.id)?'Salvo':'Salvar'}</span></Button>
                                      )}
                                      {isSchool && (
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={()=> setSelectingJob(job)}
                                          className="bg-white border-2 border-amber-500 text-amber-600 hover:bg-amber-500 hover:text-white rounded-full h-9 px-3 text-[12px] transition-all duration-200"
                                        >
                                          <Star className="w-3.5 h-3.5 mr-1" />
                                          Destacar
                                        </Button>
                                      )}
                                      <div className="flex flex-col items-end gap-1">
                                        {job.is_agency_job && job.external_url ? (
                                          <a href={job.external_url} target="_blank" rel="noopener noreferrer" className="flex-shrink-0" onClick={(e)=> { e.stopPropagation(); trackJobView(job.id); }}>
                                            <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all duration-300 rounded-full h-8 md:h-9 px-3 md:px-4 text-[11px] md:text-[12px] flex items-center">
                                              <span className="mr-1 md:mr-1.5">Ver</span>
                                              <ChevronsRight className="h-3.5 w-3.5 md:h-4 md:w-4" />
                                            </Button>
                                          </a>
                                        ) : (
                                          <Link to={`/job/${job.id}`} className="flex-shrink-0" onClick={(e)=> e.stopPropagation()}>
                                            <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all duration-300 rounded-full h-8 md:h-9 px-3 md:px-4 text-[11px] md:text-[12px] flex items-center">
                                              <span className="mr-1 md:mr-1.5">Ver</span>
                                              <ChevronsRight className="h-3.5 w-3.5 md:h-4 md:w-4" />
                                            </Button>
                                          </Link>
                                        )}
                                        {job.is_agency_job && (
                                          <div
                                            className="relative w-full flex items-center justify-center h-[22px] text-[10px] font-semibold uppercase tracking-wide rounded-xl px-2 ring-1 ring-orange-200/70 bg-gradient-to-r from-orange-50 to-amber-50 text-orange-900 shadow-[inset_0_-1px_0_rgba(0,0,0,0.04)]"
                                            title="Vaga de agência de estágio"
                                          >
                                            <span className="bg-clip-text text-transparent bg-gradient-to-r from-orange-700 to-amber-700">Agência</span>
                                          </div>
                                        )}
                                        {job.is_community && (
                                          <div
                                            className="relative w-full flex items-center justify-center h-[22px] text-[10px] font-semibold uppercase tracking-wide rounded-xl px-2 ring-1 ring-emerald-200/70 bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-900 shadow-[inset_0_-1px_0_rgba(0,0,0,0.04)]"
                                            title="Vaga cadastrada pela comunidade (Admin)"
                                          >
                                            <Users className="w-3.5 h-3.5 mr-1.5 text-emerald-700" />
                                            <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-700 to-teal-700">Comunidade</span>
                                          </div>
                                        )}
                                      </div>
                                      {/* Share removido na listagem: disponível apenas dentro da página da vaga */}
                                    </div>
                                  </div>
                                  <div className="mb-2 md:mb-2.5">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 md:gap-1.5 mb-1 md:mb-1.5">
                                      {job.location && (<div className="flex items-center text-gray-900 bg-blue-50 px-1.5 md:px-2 py-1 md:py-1.5 rounded-xl md:rounded-2xl border border-blue-100 text-[11px] md:text-[12.5px]"><MapPin className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1 md:mr-1.5 text-blue-600 flex-shrink-0" /><span className="font-medium truncate">{job.location}</span></div>)}
                                      {formatSalaryRange(job) && (<div className="flex items-center text-gray-900 bg-green-50 px-1.5 md:px-2 py-1 md:py-1.5 rounded-xl md:rounded-2xl border border-green-100 text-[11px] md:text-[12.5px]"><DollarSign className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1 md:mr-1.5 text-green-600 flex-shrink-0" /><span className="font-medium truncate">{formatSalaryRange(job)}</span></div>)}
                                    </div>
                                    <div className="flex flex-wrap gap-1 md:gap-1.5 text-[10px] md:text-[11.5px]">
                                      {ct && (
                                        <div className="inline-flex items-center text-gray-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100"><Briefcase className="w-3 h-3 mr-1 text-purple-700" /><span className="font-medium tracking-tight">{ct.toUpperCase()}</span></div>
                                      )}
                                      {wt && (
                                        <div className="inline-flex items-center text-gray-700 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-100"><Calendar className="w-3 h-3 mr-1 text-orange-600" /><span className="font-medium tracking-tight">{wt.charAt(0).toUpperCase()+wt.slice(1)}</span></div>
                                      )}
                                      {el && (
                                        <div className="inline-flex items-center text-gray-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100"><Award className="w-3.5 h-3.5 mr-1 text-indigo-600" /><span className="font-medium tracking-tight">{el.charAt(0).toUpperCase()+el.slice(1)}</span></div>
                                      )}
                                      {areaKey && (
                                        <div className="inline-flex items-center text-gray-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-100"><Layers className="w-3 h-3 mr-1 text-teal-600" /><span className="font-medium tracking-tight">{getAreaLabel(areaKey)}</span></div>
                                      )}
                                      {/* Sub-área removida (flatten) */}
                                    </div>
                                  </div>
                                  <div className="mt-auto pt-2 border-t border-gray-200">
                                    {job.description
                                      ? <p className="text-gray-800 text-[14px] leading-snug line-clamp-2">{stripHtml(job.description)}</p>
                                      : null}
                                  </div>
                                </CardContent>
                              </Card>
                            </motion.div>
                          );
                          })}
                        </div>
                        {/* Paginação e resumo para vagas internas */}
                        {(() => {
                          const internalCount = visibleInternalJobsForRender.length;
                          const externalCount = filteredExternalJobs.length;
                          const total = internalCount + externalCount;
                          if (internalCount === 0) return null;
                          const startAbs = (internalPage - 1) * INTERNAL_PER_PAGE + 1;
                          const endAbs = Math.min(internalPage * INTERNAL_PER_PAGE, internalCount);
                          return (
                            <div className="mt-6 flex flex-col items-center gap-2">
                              <div className="text-[10px] md:text-[11px] text-gray-600 font-medium text-center px-2">
                                Exibindo <span className="text-gray-900">{startAbs}-{endAbs}</span> de <span className="text-gray-900">{total}</span> vagas{isUnfiltered?'':' filtradas'} (<span className="text-green-700">{internalCount} interna{internalCount!==1?'s':''}</span>,{' '}
                                <span className="text-blue-700">{externalCount} externa{externalCount!==1?'s':''}</span>)
                              </div>
                              {totalInternalPages > 1 && (
                                <div className="flex items-center gap-1 md:gap-2 text-xs">
                                  <button
                                    disabled={internalPage===1}
                                    onClick={()=> { setInternalPage(p=> Math.max(1,p-1)); scrollToResultsTop(); }}
                                    className={`px-2 md:px-3 py-1 md:py-1.5 rounded-full border text-[10px] md:text-sm transition-colors ${internalPage===1?'bg-gray-100 text-gray-400 border-gray-200':'bg-white hover:bg-blue-50 text-gray-700 border-gray-300'}`}
                                  >Anterior</button>
                                  <div className="flex gap-0.5 md:gap-1">
                                    {buildPageList(totalInternalPages, internalPage).map((p,i)=> p==='...'
                                      ? <span key={`igap-${i}`} className="w-[18px] h-[18px] md:w-8 md:h-8 flex items-center justify-center text-gray-500 text-[11px] md:text-sm">...</span>
                                      : <button key={`i${p}`} onClick={()=> { setInternalPage(p); scrollToResultsTop(); }} className={`w-[18px] h-[18px] md:w-8 md:h-8 rounded-full border text-[11px] md:text-[12px] font-medium transition-colors ${p===internalPage?'bg-blue-600 text-white border-blue-600 shadow':'bg-white text-gray-700 border-gray-300 hover:bg-blue-50'}`}>{p}</button>
                                    )}
                                  </div>
                                  <button
                                    disabled={internalPage===totalInternalPages}
                                    onClick={()=> { setInternalPage(p=> Math.min(totalInternalPages,p+1)); scrollToResultsTop(); }}
                                    className={`px-2 md:px-3 py-1 md:py-1.5 rounded-full border text-[10px] md:text-sm transition-colors ${internalPage===totalInternalPages?'bg-gray-100 text-gray-400 border-gray-200':'bg-white hover:bg-blue-50 text-gray-700 border-gray-300'}`}
                                  >Próxima</button>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </motion.div>
                    )}
                  </AnimatePresence>
                  {/* Tab: Destaques (aluno) - Lista única de todas as vagas destacadas */}
                  <AnimatePresence mode="wait">
                  {isCandidate && schoolTab==='destaques' && (
                    <motion.div key="tab-destaques-candidate" initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-10}} transition={{duration:0.18}}>
                      {/* Lista única de vagas destacadas */}
                      {totalCandidateHighlights > 0 ? (
                        <div className={viewMode==='grid'? 'grid sm:grid-cols-2 gap-5 items-stretch':'space-y-5'}>
                          {allHighlightedFiltered.map((job,index)=> (
                            <motion.div key={job.id} className="h-full" initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} transition={{duration:0.4, delay:index*0.05}} whileHover={{ y:-5, transition:{ duration:0.2 } }}>
                              <JobHighlightCard
                                job={job}
                                type="highlighted"
                                full
                                user={user}
                                isCandidate={isCandidate}
                                followedCompanies={followedCompanies}
                                onFollowCompany={handleFollowCompany}
                                companyImage={getCompanyImage(job.company_id)}
                                partnerCompanyIds={partnerCompanyIds}
                              />
                            </motion.div>
                          ))}
                        </div>
                      ) : (
                        <Card className="shadow-lg border-2 border-gray-200"><CardContent className="p-10 text-center text-gray-600">Nenhuma vaga destacada para os filtros atuais.</CardContent></Card>
                      )}
                    </motion.div>
                  )}
                  </AnimatePresence>
                  {/* Share Modal */}
                  {shareOpen && shareJob && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center">
                      <div className="absolute inset-0 bg-black/40" onClick={()=> setShareOpen(false)} />
                      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-5">
                        <h3 className="text-lg font-semibold mb-1">Compartilhar vaga</h3>
                        <p className="text-sm text-gray-600 mb-4">{shareJob.title} — {shareJob.company_name || shareJob.company || (shareJob.source ? shareJob.source.toUpperCase() : '')}</p>
                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 flex items-center justify-between mb-3">
                          <div className="text-xs text-gray-700 truncate mr-2">{shareJob?.is_external ? (shareJob.url || '') : `${window.location.origin}/job/${shareJob.id}`}</div>
                          <Button variant="outline" size="sm" onClick={()=> copyShareLink(shareJob)} className="border-2 rounded-xl text-[12px] flex items-center"><Copy className="w-3.5 h-3.5 mr-1" />Copiar</Button>
                        </div>
                        {/* Quick share options */}
                        <div className="mb-4">
                          <div className="text-xs font-semibold text-gray-700 mb-2">Compartilhar via</div>
                          {(() => {
                            const url = shareJob?.is_external ? (shareJob.url || '') : `${window.location.origin}/job/${shareJob.id}`;
                            const text = `${shareJob.title} — ${shareJob.company_name || shareJob.company || ''}`.trim();
                            const encUrl = encodeURIComponent(url);
                            const encText = encodeURIComponent(text);
                            const mailSubject = encodeURIComponent(`Vaga: ${shareJob.title}`);
                            const mailBody = encodeURIComponent(`${text}\n\n${url}`);
                            return (
                              <div className="flex flex-wrap gap-2">
                                <a href={`https://wa.me/?text=${encText}%20${encUrl}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[12px] bg-[#25D366]/10 border-[#25D366]/30 text-[#25D366] hover:bg-[#25D366]/20 transition" title="Compartilhar no WhatsApp">
                                  <MessageCircle className="w-4 h-4" /> WhatsApp
                                </a>
                                <a href={`https://t.me/share/url?url=${encUrl}&text=${encText}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[12px] bg-[#0088cc]/10 border-[#0088cc]/30 text-[#0088cc] hover:bg-[#0088cc]/20 transition" title="Compartilhar no Telegram">
                                  <Send className="w-4 h-4" /> Telegram
                                </a>
                                <a href={`mailto:?subject=${mailSubject}&body=${mailBody}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[12px] bg-gray-100 border-gray-200 text-gray-800 hover:bg-gray-200 transition" title="Enviar por e-mail">
                                  <Mail className="w-4 h-4" /> E-mail
                                </a>
                                <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${encUrl}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[12px] bg-[#0A66C2]/10 border-[#0A66C2]/30 text-[#0A66C2] hover:bg-[#0A66C2]/20 transition" title="Compartilhar no LinkedIn">
                                  <Linkedin className="w-4 h-4" /> LinkedIn
                                </a>
                              </div>
                            );
                          })()}
                        </div>
                        {isSchool && (
                          <div className="space-y-2 mb-4">
                            <Label className="text-sm font-semibold text-gray-800 mb-1.5 block">Enviar para um grupo da escola</Label>
                            <Combobox
                              variant="minimal"
                              options={(schoolGroups || []).map(g => ({
                                value: g.key,
                                label: `${g.name || g.key} ${g.type==='school' ? '(Escola)' : '(Turma)'}`,
                                leading: <MessageSquare className="w-4 h-4 text-blue-600" />
                              }))}
                              value={selectedGroupKey}
                              onChange={(val) => setSelectedGroupKey(val)}
                              placeholder={loadingGroups ? 'Carregando grupos...' : (schoolGroups?.length ? 'Selecione um grupo...' : 'Nenhum grupo encontrado')}
                              disabled={loadingGroups}
                            />
                          </div>
                        )}
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={()=> setShareOpen(false)} className="rounded-xl">Cancelar</Button>
                          {isSchool && <Button onClick={shareToGroup} disabled={!selectedGroupKey || sharing} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl">{sharing ? 'Enviando...' : 'Compartilhar no grupo'}</Button>}
                        </div>
                      </div>
                    </div>
                  )}
                  <AnimatePresence mode="wait">
                  {isSchool && schoolTab==='destaques' && (
                    <motion.div key="tab-destaques" initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-10}} transition={{duration:0.18}}>
                      {/* Abas internas: Escola x Empresas */}
                      <div className="mb-4 flex items-center gap-3 flex-wrap">
                        <div ref={schoolTabsRef} className="relative inline-flex items-center gap-1.5 rounded-full bg-gray-100 border border-gray-200 shadow-inner p-1">
                          {/* Indicator */}
                          <div
                            className="absolute top-1 bottom-1 rounded-full"
                            style={{ left: schoolIndicator.left, width: schoolIndicator.width, backgroundColor: highlightsInnerTab==='school' ? '#f59e0b' : '#2563eb', transition: 'left 200ms cubic-bezier(0.22, 1, 0.36, 1), width 200ms cubic-bezier(0.22, 1, 0.36, 1), background-color 150ms linear' }}
                          />
                          <button
                            ref={schoolSchoolBtnRef}
                            type="button"
                            onClick={()=> setHighlightsInnerTab('school')}
                            className={`relative inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 h-9 text-sm font-semibold transition-colors ${highlightsInnerTab==='school' ? 'text-white' : 'text-amber-700 hover:text-amber-800'}`}
                          >
                            <span className="relative z-10 inline-flex items-center gap-1.5">
                              <Star className={`w-4 h-4 ${highlightsInnerTab==='school' ? 'text-white' : 'text-amber-600'}`} />
                              <span>Pela escola</span>
                            </span>
                            <span className={`relative z-10 ml-2 inline-flex items-center justify-center min-w-[1.25rem] px-1.5 h-5 text-[11px] rounded-full ${highlightsInnerTab==='school' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'}`}>{filteredSchoolHighlights.length}</span>
                          </button>
                          <button
                            ref={schoolCompanyBtnRef}
                            type="button"
                            onClick={()=> setHighlightsInnerTab('company')}
                            className={`relative inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 h-9 text-sm font-semibold transition-colors ${highlightsInnerTab==='company' ? 'text-white' : 'text-blue-700 hover:text-blue-800'}`}
                          >
                            <span className="relative z-10 inline-flex items-center gap-1.5">
                              <Zap className={`w-4 h-4 ${highlightsInnerTab==='company' ? 'text-white' : 'text-blue-600'}`} />
                              <span>Pelas empresas</span>
                            </span>
                            <span className={`relative z-10 ml-2 inline-flex items-center justify-center min-w-[1.25rem] px-1.5 h-5 text-[11px] rounded-full ${highlightsInnerTab==='company' ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-800'}`}>{filteredSchoolCompanyHighlights.length}</span>
                          </button>
                        </div>
                        {/* Filtro de Turmas */}
                        <div className="relative inline-flex items-center gap-1.5 rounded-full bg-gray-100 border border-gray-200 shadow-inner p-1">
                          <div className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 h-9 text-sm font-semibold text-gray-700">
                            <span className="inline-flex items-center gap-1 text-gray-700"><Users className="w-4 h-4 text-gray-600" /> Turma</span>
                          </div>
                          <div className="w-[1px] h-5 bg-gray-200 mx-0.5" />
                          <div className="min-w-[220px]">
                            <Combobox
                              variant="minimal"
                              options={[{ value:'all', label:'Todas as turmas' }, ...(classOptions||[]).map(c=>({ value:String(c.id), label:c.class_name || c.name }))]}
                              value={schoolClassFilter}
                              onChange={val=> setSchoolClassFilter(val)}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Listas */}
                      {(loadingSchoolHighlights || loadingSchoolCompanyHighlights) && (
                        <Card className="shadow-lg border-2 border-gray-200"><CardContent className="p-12 text-center"><div className="flex justify-center items-center"><div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600" /><span className="ml-4 text-xl font-medium text-gray-700">Carregando destaques...</span></div></CardContent></Card>
                      )}

                      {!loadingSchoolHighlights && highlightsInnerTab==='school' && (
                        filteredSchoolHighlights.length>0 ? (
                          <div className={viewMode==='grid'? 'grid sm:grid-cols-2 gap-4 items-stretch':'space-y-4'}>
                            {filteredSchoolHighlights.map((job,index)=> (
                              <motion.div key={job.id + '-' + (job.class_id||'all')} className="h-full" initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} transition={{duration:0.4, delay:index*0.05}} whileHover={{ y:-5, transition:{ duration:0.2 } }}>
                                <Card
                                  className="group cursor-pointer shadow-md hover:shadow-lg transition-all duration-300 border-2 border-gray-200 overflow-hidden rounded-2xl bg-white h-full min-h-[210px] flex flex-col focus:outline-none"
                                  onClick={(e)=>handleCardClick(e, job.id, job)}
                                  onKeyDown={(e)=>handleCardKeyDown(e, job.id, job)}
                                  role="button"
                                  tabIndex={0}
                                >
                                  <CardContent className="p-2 flex flex-col h-full">
                                    <div className="flex items-start justify-between mb-2">
                                      <div className="flex items-start gap-2.5 flex-1 min-w-0">
                                        {/* Logo da empresa */}
                                        {(() => {
                                          let shape = 'circle';
                                          try {
                                            if (job?.company_id) {
                                              shape = localStorage.getItem('company_avatar_shape_'+job.company_id) || 'circle';
                                            }
                                          } catch {}
                                          const roundedClass = shape === 'circle' ? 'rounded-full' : 'rounded-xl';
                                          const companyImage = getCompanyImage(job.company_id);
                                          return (
                                            <Link to={job.company_id ? `/company/${job.company_id}` : '#'} onClick={(e) => { e.stopPropagation(); if (!job.company_id) e.preventDefault(); }} className={`w-10 h-10 ${roundedClass} flex items-center justify-center flex-shrink-0 overflow-hidden hover:ring-2 hover:ring-amber-300 transition-all ${companyImage ? '' : 'bg-white border border-gray-200'}`}>
                                              {companyImage ? (
                                                <img src={companyImage} alt="Logo" className="w-full h-full object-contain" />
                                              ) : (
                                                <Building className="w-5 h-5 text-amber-700" />
                                              )}
                                            </Link>
                                          );
                                        })()}
                                        <div className="flex-1 min-w-0">
                                          <h3 className="text-[16px] font-semibold text-amber-700 group-hover:underline group-hover:decoration-2 underline-offset-2 mb-0.5">{job.title}</h3>
                                          <div className="flex items-center gap-2 flex-wrap mb-1">
                                            <Link to={job.company_id ? `/company/${job.company_id}` : '#'} onClick={(e) => { e.stopPropagation(); if (!job.company_id) e.preventDefault(); }} className="text-gray-800 text-[13px] font-medium hover:text-blue-600 hover:underline transition-colors">{job.company_name}</Link>
                                            {partnerCompanyIds.has(String(job.company_id)) && <span className="inline-flex items-center text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border-2 border-emerald-200"><FaRegHandshake className="w-3 h-3 mr-1 text-emerald-600" />Parceira</span>}
                                          </div>
                                          <div className="text-[11px] inline-flex items-center bg-amber-50 border border-amber-200 text-amber-800 px-2 py-0.5 rounded-full">Turma: {classNameById(job.class_id)}</div>
                                        </div>
                                      </div>
                                      <Link to={`/job/${job.id}`}><Button size="sm" className="rounded-full bg-blue-600 hover:bg-blue-700 text-white h-8 px-3 text-[12px]">Ver <ChevronsRight className="w-4 h-4 ml-1" /></Button></Link>
                                    </div>
                                    {/* Info extra: localização, salário e chips */}
                                    <div className="mb-2.5">
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mb-1.5">
                                        {job.location && (
                                          <div className="flex items-center text-gray-900 bg-blue-50 px-2 py-1.5 rounded-2xl border border-blue-100 text-[12.5px]"><MapPin className="w-4 h-4 mr-1.5 text-blue-600" /><span className="font-medium truncate">{job.location}</span></div>
                                        )}
                                        {formatSalaryRange(job) && (
                                          <div className="flex items-center text-gray-900 bg-green-50 px-2 py-1.5 rounded-2xl border border-green-100 text-[12.5px]"><DollarSign className="w-4 h-4 mr-1.5 text-green-600" /><span className="font-medium">{formatSalaryRange(job)}</span></div>
                                        )}
                                      </div>
                                      <div className="flex flex-wrap gap-1.5 text-[11.5px]">
                                        {job.contract_type && (<div className="inline-flex items-center text-gray-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100"><Briefcase className="w-3 h-3 mr-1 text-purple-700" /><span className="font-medium tracking-tight">{job.contract_type?.toUpperCase()}</span></div>)}
                                        {job.work_type && (<div className="inline-flex items-center text-gray-700 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-100"><Calendar className="w-3 h-3 mr-1 text-orange-600" /><span className="font-medium tracking-tight">{job.work_type?.charAt(0).toUpperCase()+job.work_type?.slice(1)}</span></div>)}
                                        {job.experience_level && (<div className="inline-flex items-center text-gray-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100"><Award className="w-3.5 h-3.5 mr-1 text-indigo-600" /><span className="font-medium tracking-tight">{job.experience_level?.charAt(0).toUpperCase()+job.experience_level?.slice(1)}</span></div>)}
                                        {job.area && (<div className="inline-flex items-center text-gray-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-100"><Layers className="w-3 h-3 mr-1 text-teal-600" /><span className="font-medium tracking-tight">{getAreaLabel(job.area)}</span></div>)}
                                      </div>
                                    </div>
                                    <div className="mt-auto pt-2 border-t border-gray-200 flex items-center gap-2">
                                      <div className="flex-1 min-w-0 text-[12px] text-gray-700 truncate">{job.description ? stripHtml(job.description).substring(0, 80) + (stripHtml(job.description).length>80?'...':'') : ''}</div>
                                      <Button variant="outline" size="sm" onClick={()=> stopSchoolHighlight(job.id, job.class_id)} className="flex-shrink-0 rounded-full border-2 border-red-300 text-red-600 hover:bg-red-50 h-8 px-3 text-[12px]">Parar de destacar</Button>
                                    </div>
                                  </CardContent>
                                </Card>
                              </motion.div>
                            ))}
                          </div>
                        ) : (
                          <Card className="shadow-lg border-2 border-gray-200"><CardContent className="p-10 text-center text-gray-600">Nenhuma vaga destacada pela escola para os filtros atuais.</CardContent></Card>
                        )
                      )}

                      {!loadingSchoolCompanyHighlights && highlightsInnerTab==='company' && (
                        filteredSchoolCompanyHighlights.length>0 ? (
                          <div className={viewMode==='grid'? 'grid sm:grid-cols-2 gap-4 items-stretch':'space-y-4'}>
                            {filteredSchoolCompanyHighlights.map((job,index)=> (
                              <motion.div key={job.id + '-' + (job.class_id||'all')} className="h-full" initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} transition={{duration:0.4, delay:index*0.05}} whileHover={{ y:-5, transition:{ duration:0.2 } }}>
                                <Card
                                  className="group cursor-pointer shadow-md hover:shadow-lg transition-all duration-300 border-2 border-gray-200 overflow-hidden rounded-2xl bg-white h-full min-h-[210px] flex flex-col focus:outline-none"
                                  onClick={(e)=>handleCardClick(e, job.id, job)}
                                  onKeyDown={(e)=>handleCardKeyDown(e, job.id, job)}
                                  role="button"
                                  tabIndex={0}
                                >
                                  <CardContent className="p-2 flex flex-col h-full">
                                    <div className="flex items-start justify-between mb-2">
                                      <div className="flex items-start gap-2.5 flex-1 min-w-0">
                                        {/* Logo da empresa */}
                                        {(() => {
                                          let shape = 'circle';
                                          try {
                                            if (job?.company_id) {
                                              shape = localStorage.getItem('company_avatar_shape_'+job.company_id) || 'circle';
                                            }
                                          } catch {}
                                          const roundedClass = shape === 'circle' ? 'rounded-full' : 'rounded-xl';
                                          const companyImage = getCompanyImage(job.company_id);
                                          return (
                                            <Link to={job.company_id ? `/company/${job.company_id}` : '#'} onClick={(e) => { e.stopPropagation(); if (!job.company_id) e.preventDefault(); }} className={`w-10 h-10 ${roundedClass} flex items-center justify-center flex-shrink-0 overflow-hidden hover:ring-2 hover:ring-blue-300 transition-all ${companyImage ? '' : 'bg-white border border-gray-200'}`}>
                                              {companyImage ? (
                                                <img src={companyImage} alt="Logo" className="w-full h-full object-contain" />
                                              ) : (
                                                <Building className="w-5 h-5 text-blue-700" />
                                              )}
                                            </Link>
                                          );
                                        })()}
                                        <div className="flex-1 min-w-0">
                                          <h3 className="text-[16px] font-semibold text-blue-700 group-hover:underline group-hover:decoration-2 underline-offset-2 mb-0.5">{job.title}</h3>
                                          <div className="flex items-center gap-2 flex-wrap mb-1">
                                            <Link to={job.company_id ? `/company/${job.company_id}` : '#'} onClick={(e) => { e.stopPropagation(); if (!job.company_id) e.preventDefault(); }} className="text-gray-800 text-[13px] font-medium hover:text-blue-600 hover:underline transition-colors">{job.company_name}</Link>
                                            {partnerCompanyIds.has(String(job.company_id)) && <span className="inline-flex items-center text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border-2 border-emerald-200"><FaRegHandshake className="w-3 h-3 mr-1 text-emerald-600" />Parceira</span>}
                                          </div>
                                          <div className="text-[11px] inline-flex items-center bg-blue-50 border border-blue-200 text-blue-800 px-2 py-0.5 rounded-full">Turma: {classNameById(job.class_id)}</div>
                                        </div>
                                      </div>
                                      <Link to={`/job/${job.id}`}><Button size="sm" className="rounded-full bg-blue-600 hover:bg-blue-700 text-white h-8 px-3 text-[12px]">Ver <ChevronsRight className="w-4 h-4 ml-1" /></Button></Link>
                                    </div>
                                    {/* Info extra: localização, salário e chips */}
                                    <div className="mb-2.5">
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mb-1.5">
                                        {job.location && (
                                          <div className="flex items-center text-gray-900 bg-blue-50 px-2 py-1.5 rounded-2xl border border-blue-100 text-[12.5px]"><MapPin className="w-4 h-4 mr-1.5 text-blue-600" /><span className="font-medium truncate">{job.location}</span></div>
                                        )}
                                        {formatSalaryRange(job) && (
                                          <div className="flex items-center text-gray-900 bg-green-50 px-2 py-1.5 rounded-2xl border border-green-100 text-[12.5px]"><DollarSign className="w-4 h-4 mr-1.5 text-green-600" /><span className="font-medium">{formatSalaryRange(job)}</span></div>
                                        )}
                                      </div>
                                      <div className="flex flex-wrap gap-1.5 text-[11.5px]">
                                        {job.contract_type && (<div className="inline-flex items-center text-gray-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100"><Briefcase className="w-3 h-3 mr-1 text-purple-700" /><span className="font-medium tracking-tight">{job.contract_type?.toUpperCase()}</span></div>)}
                                        {job.work_type && (<div className="inline-flex items-center text-gray-700 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-100"><Calendar className="w-3 h-3 mr-1 text-orange-600" /><span className="font-medium tracking-tight">{job.work_type?.charAt(0).toUpperCase()+job.work_type?.slice(1)}</span></div>)}
                                        {job.experience_level && (<div className="inline-flex items-center text-gray-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100"><Award className="w-3.5 h-3.5 mr-1 text-indigo-600" /><span className="font-medium tracking-tight">{job.experience_level?.charAt(0).toUpperCase()+job.experience_level?.slice(1)}</span></div>)}
                                        {job.area && (<div className="inline-flex items-center text-gray-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-100"><Layers className="w-3 h-3 mr-1 text-teal-600" /><span className="font-medium tracking-tight">{getAreaLabel(job.area)}</span></div>)}
                                      </div>
                                    </div>
                                    <div className="mt-auto pt-2 border-t border-gray-200 text-[12px] text-gray-700 truncate">{job.description ? stripHtml(job.description).substring(0, 80) + (stripHtml(job.description).length>80?'...':'') : ''}</div>
                                  </CardContent>
                                </Card>
                              </motion.div>
                            ))}
                          </div>
                        ) : (
                          <Card className="shadow-lg border-2 border-gray-200"><CardContent className="p-10 text-center text-gray-600">Nenhuma vaga destacada por empresas para os filtros atuais.</CardContent></Card>
                        )
                      )}
                    </motion.div>
                  )}
                  </AnimatePresence>
                  {(schoolTab==='vagas') && (loadingExternal || loadingExternalRecommended) && filteredExternalJobs.length===0 && (
                    <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} transition={{delay:0.05}} className="mt-10">
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">Vagas de Outros Sites <RefreshCw className="w-4 h-4 animate-spin text-blue-600" /></h2>
                          <p className="text-gray-600 text-[11px]">Agregadas de sites externos (Adzuna) - carregando...</p>
                        </div>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-5 items-stretch">
                        {Array.from({length:6}).map((_,i)=>(
                          <div key={i} className="h-full animate-pulse">
                            <div className="shadow-md border border-transparent bg-white/70 rounded-xl p-4 h-full flex flex-col gap-3">
                              <div className="flex gap-3 items-start">
                                <div className="w-9 h-9 rounded-2xl bg-gray-200" />
                                <div className="flex-1 space-y-2">
                                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                                </div>
                                <div className="w-16 h-7 bg-gray-200 rounded" />
                              </div>
                              <div className="space-y-2 mt-1">
                                <div className="h-3 bg-gray-200 rounded w-full" />
                                <div className="h-3 bg-gray-200 rounded w-5/6" />
                              </div>
                              <div className="mt-auto pt-2 border-t border-gray-100 space-y-1">
                                <div className="h-3 bg-gray-200 rounded w-full" />
                                <div className="h-3 bg-gray-200 rounded w-2/3" />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                  {(schoolTab==='vagas') && filteredExternalJobs.length>0 && (
                    <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} transition={{delay:0.1}} className="mt-6 md:mt-10">
                      <div className="flex items-center justify-between mb-3 md:mb-6">
                        <div>
                          <h2 className="text-sm md:text-lg font-bold text-gray-900 flex items-center gap-2">Vagas Externas {(loadingExternal || loadingExternalRecommended) && <RefreshCw className="w-3.5 md:w-4 h-3.5 md:h-4 animate-spin text-blue-600" />}</h2>
                          <p className="text-gray-600 text-[10px] md:text-[11px] flex flex-wrap gap-2 items-center">
                            <span>Agregadas de sites externos</span>
                            {/* Contador de fonte removido conforme solicitado */}
                          </p>
                        </div>
                        <Button variant="outline" size="sm" className="rounded-lg md:rounded-xl h-7 md:h-auto px-2 md:px-3 text-[11px] md:text-xs" onClick={loadExternalRecommended} disabled={loadingExternalRecommended}>{loadingExternalRecommended? <RefreshCw className="w-3.5 md:w-4 h-3.5 md:h-4 animate-spin" />:<RefreshCw className="w-3.5 md:w-4 h-3.5 md:h-4" />}<span className="ml-1 md:ml-2 hidden sm:inline">Atualizar</span></Button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-5 items-stretch">
                        {paginatedExternal.map((job,i)=>(
                          <motion.div key={job.id || i} className="h-full" initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} transition={{delay:i*0.04}} whileHover={{y:-5}}>
                            <Card
                              role="link"
                              tabIndex={0}
                              onClick={() => window.open(job.url, '_blank')}
                              onKeyDown={(e)=>{ if(e.key==='Enter' || e.key===' '){ e.preventDefault(); window.open(job.url, '_blank'); } }}
                              className="cursor-pointer shadow-md hover:shadow-lg transition-all duration-300 border border-transparent hover:border-gray-500 bg-white group overflow-hidden h-full flex flex-col rounded-xl"
                            >
                              <CardContent className="p-2.5 md:p-3.5 flex flex-col h-full">
                                <div className="flex items-start mb-1.5 md:mb-2">
                                  <div className="w-9 md:w-11 h-9 md:h-11 rounded-lg md:rounded-xl bg-gray-100 border flex items-center justify-center mr-2 md:mr-3 overflow-hidden shadow-inner flex-shrink-0">
                                    {job.source === 'adzuna' && (<img src="/logos/adzuna.svg" alt="Adzuna" className="w-full h-full object-cover" />)}
                                    {!(job.source === 'adzuna') && (
                                      <div className="text-[10px] font-semibold text-gray-600 px-1 text-center uppercase tracking-wide">{job.source}</div>
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0 pr-1 md:pr-2">
                                    <h3 className="text-[14px] md:text-[16px] font-semibold text-blue-700 group-hover:underline group-hover:decoration-2 underline-offset-2 decoration-blue-700 leading-snug mb-0.5 line-clamp-2 tracking-tight antialiased">{job.title}</h3>
                                    <p className="text-gray-800 font-medium text-[11px] md:text-[12px] leading-snug line-clamp-1">{job.company_name || job.company}</p>
                                  </div>
                                  <div className="flex gap-1 md:gap-2 items-center flex-shrink-0">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={(e)=> { e.stopPropagation(); openShareForJob(job); }}
                                      aria-label="Compartilhar"
                                      className="rounded-full border-gray-200 hover:bg-gray-50 h-7 w-7 md:h-8 md:w-8 p-0 flex items-center justify-center"
                                    >
                                      <Share2 className="w-3.5 md:w-4 h-3.5 md:h-4" />
                                    </Button>
                                  </div>
                                </div>
                                <div className="mb-1.5 md:mb-2.5 w-full">
                                  <div className="flex flex-col gap-1 text-[10px] md:text-[11.5px] text-gray-700">
                                    {job.location && (
                                      <div className="flex items-center"><MapPin className="w-3 h-3 mr-1 text-blue-600" />{job.location}</div>
                                    )}
                                    <div className="flex flex-wrap gap-1 md:gap-1.5 text-[10px] md:text-[11.5px] pt-0.5">
                                      <div className="inline-flex items-center bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full font-medium"><Briefcase className="w-3 h-3 mr-1 text-blue-600" />{job.area || 'Área não especificada'}</div>
                                    </div>
                                  </div>
                                </div>
                                <div className="mt-auto pt-1.5 md:pt-2 border-t border-gray-200">
                                  {job.description && (
                                    <p className="text-gray-700 text-[11px] md:text-[12px] leading-snug line-clamp-2 md:line-clamp-3 antialiased">{stripHtml(job.description)}</p>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          </motion.div>
                        ))}
                      </div>
                      {/* Paginação e resumo combinados com reticências */}
                      {(() => {
                        const internalCount = filteredJobs.length;
                        const externalCount = filteredExternalJobs.length;
                        const total = internalCount + externalCount;
                        if(total === 0) return null;
                        const externalStartAbs = internalCount + (externalPage-1)*EXTERNAL_PER_PAGE + 1;
                        const externalEndAbs = internalCount + Math.min(externalPage*EXTERNAL_PER_PAGE, externalCount);
                        const unfiltered = searchTerm.trim()==='' && (!filters.area || filters.area==='Todos') && !filters.subarea && !filters.location;
                        return (
                          <div className="mt-6 flex flex-col items-center gap-2">
                            <div className="text-[10px] md:text-[11px] text-gray-600 font-medium text-center px-2">
                              Exibindo <span className="text-gray-900">{externalStartAbs}-{externalEndAbs}</span> de <span className="text-gray-900">{total}</span> vagas{unfiltered?'':' filtradas'} (<span className="text-green-700">{internalCount} interna{internalCount!==1?'s':''}</span>, <span className="text-blue-700">{externalCount} externa{externalCount!==1?'s':''}</span>)
                            </div>
                            {totalExternalPages > 1 && (
                              <div className="flex items-center gap-1 md:gap-2 text-xs">
                                <button disabled={externalPage===1} onClick={()=> { setExternalPage(p=> Math.max(1,p-1)); scrollToResultsTop(); }} className={`px-2 md:px-3 py-1 md:py-1.5 rounded-full border text-[10px] md:text-sm transition-colors ${externalPage===1?'bg-gray-100 text-gray-400 border-gray-200':'bg-white hover:bg-blue-50 text-gray-700 border-gray-300'}`}>Anterior</button>
                                <div className="flex gap-0.5 md:gap-1">
                                  {buildPageList(totalExternalPages, externalPage).map((p,i)=> p==='...'
                                    ? <span key={`gap-${i}`} className="w-[18px] h-[18px] md:w-8 md:h-8 flex items-center justify-center text-gray-500 text-[11px] md:text-sm">...</span>
                                    : <button key={p} onClick={()=> { setExternalPage(p); scrollToResultsTop(); }} className={`w-[18px] h-[18px] md:w-8 md:h-8 rounded-full border text-[11px] md:text-[12px] font-medium transition-colors ${p===externalPage?'bg-blue-600 text-white border-blue-600 shadow':'bg-white text-gray-700 border-gray-300 hover:bg-blue-50'}`}>{p}</button>
                                  )}
                                </div>
                                <button disabled={externalPage===totalExternalPages} onClick={()=> { setExternalPage(p=> Math.min(totalExternalPages,p+1)); scrollToResultsTop(); }} className={`px-2 md:px-3 py-1 md:py-1.5 rounded-full border text-[10px] md:text-sm transition-colors ${externalPage===totalExternalPages?'bg-gray-100 text-gray-400 border-gray-200':'bg-white hover:bg-blue-50 text-gray-700 border-gray-300'}`}>Próxima</button>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </motion.div>
                  )}
                  {/* Aviso combinado (sem destaques e externas filtradas) */}
                  {!isSchool && hasHiddenHighlights && filteredExternalJobs.length === 0 && externalJobs.length > 0 && (
                    <div className="mt-10 text-center text-sm text-gray-600">Destaques e vagas externas ocultados pelos filtros atuais. Limpe ou ajuste os filtros para visualizá-los novamente.</div>
                  )}
                  {/* Aviso somente externas sem resultados (quando não há caso combinado) */}
                  {(schoolTab==='vagas') && !hasHiddenHighlights && filteredExternalJobs.length === 0 && externalJobs.length > 0 && (
                    <div className="mt-10 text-center text-sm text-gray-600">Nenhuma vaga externa encontrada para os filtros selecionados.</div>
                  )}
                  {companies.length>0 && (
                    <motion.div className="mt-6 md:mt-10" initial={{opacity:0, y:40}} animate={{opacity:1, y:0}} transition={{delay:0.5}}>
                      <div className="text-center mb-3 md:mb-5">
                        <h2 className="text-base md:text-xl font-bold text-gray-900 mb-1">Empresas <span className="text-blue-600">Contratando</span></h2>
                        <p className="text-gray-600 text-xs md:text-sm">Oportunidades nas melhores empresas</p>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-6">
                        {[...companies].sort((a, b) => {
                          // Para escolas e candidatos: ordenar empresas parceiras primeiro
                          if ((isSchool || isStudent) && partnerCompanyIds.size > 0) {
                            const aIsPartner = partnerCompanyIds.has(String(a.id));
                            const bIsPartner = partnerCompanyIds.has(String(b.id));
                            if (aIsPartner && !bIsPartner) return -1;
                            if (!aIsPartner && bIsPartner) return 1;
                          }
                          return 0;
                        }).map((company,index)=>{
                          const isPartner = (isSchool || isStudent) && partnerCompanyIds.has(String(company.id));
                          // Verificar formato do avatar da empresa
                          let companyAvatarShape = 'circle';
                          try {
                            companyAvatarShape = localStorage.getItem('company_avatar_shape_'+company.id) || 'circle';
                          } catch {}
                          const companyImageRounded = companyAvatarShape === 'circle' ? 'rounded-full' : 'rounded-xl';
                          return (
                          <motion.div key={company.id} initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} transition={{delay:0.6+index*0.1}} whileHover={{ y:-8, transition: { duration: 0.2 } }}>
                            <Link to={`/company/${company.id}`}>
                              <Card className="shadow-md md:shadow-lg hover:shadow-xl md:hover:shadow-2xl transition-all duration-300 border-2 border-gray-200 bg-white group overflow-hidden h-full rounded-xl md:rounded-2xl relative">
                                <CardContent className="p-2.5 md:p-4 text-center flex flex-col h-full">
                                  {isPartner && (
                                    <div className="absolute top-1 right-1 md:top-2 md:right-2 z-10">
                                      <div className="inline-flex items-center text-[9px] md:text-[11px] font-bold text-emerald-700 bg-emerald-50 px-1.5 md:px-3 py-0.5 md:py-1.5 rounded-full border md:border-2 border-emerald-200 shadow-sm">
                                        <FaRegHandshake className="w-3 h-3 md:w-4 md:h-4 mr-0.5 md:mr-1.5 text-emerald-600" />
                                        <span className="hidden sm:inline">Parceira</span>
                                      </div>
                                    </div>
                                  )}
                                  <div className={`bg-blue-50 w-10 h-10 md:w-12 md:h-12 ${companyImageRounded} flex items-center justify-center mx-auto mb-1.5 md:mb-2.5 overflow-hidden border border-blue-100 transition-transform duration-300`}>
                                    { (company.profileImage || company.profile_image) ? (
                                      <img
                                        src={company.profileImage || company.profile_image}
                                        alt={company.company_name || company.companyName || 'Logo'}
                                        className="w-full h-full object-contain"
                                      />
                                    ) : (
                                      <Building className="w-6 h-6 text-blue-600" />
                                    ) }
                                  </div>
                                  <h3 className="font-bold text-[12px] md:text-[15px] text-gray-900 mb-1 md:mb-1.5 group-hover:text-blue-600 transition-colors duration-300 leading-snug line-clamp-2">{company.company_name}</h3>
                                  <div className="space-y-1 md:space-y-2 flex-grow">
                                    <div className="inline-flex items-center text-[9px] md:text-[11px] text-green-700 bg-green-50 rounded-full py-0.5 md:py-1 px-1.5 md:px-2.5 border border-green-200"><Briefcase className="w-3 h-3 md:w-4 md:h-4 mr-0.5 md:mr-1" /><span className="font-semibold">{safeNumber(company.jobs_count)} vaga{safeNumber(company.jobs_count)!==1?'s':''}</span></div>
                                    {company.location && (<div className="flex items-center justify-center text-[9px] md:text-[11px] text-gray-600 mt-0.5"><MapPin className="w-3 h-3 md:w-4 md:h-4 mr-0.5 md:mr-1 text-blue-600" /><span className="font-medium truncate max-w-[100px] md:max-w-none">{company.location}</span></div>)}
                                  </div>
                                  <div className="mt-1.5 md:mt-2.5 pt-1.5 md:pt-2.5 border-t border-gray-200">
                                    <div className="flex items-center justify-center text-blue-600 font-semibold text-[10px] md:text-[11px] group-hover:text-blue-700 group-hover:underline transition-colors duration-300">Ver <ChevronsRight className="ml-0.5 md:ml-1 h-3 w-3 md:h-4 md:w-4 group-hover:translate-x-1 transition-transform duration-300" /></div>
                                  </div>
                                </CardContent>
                              </Card>
                            </Link>
                          </motion.div>
                        );})}
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              </div>
            </div>
          </div>
        </div>
        {isSchool && selectingJob && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={()=> { setSelectingJob(null); setSelectedClasses([]); }}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 space-y-4" onClick={(e)=> e.stopPropagation()}>
              <h3 className="text-xl font-semibold">Destacar vaga: {selectingJob.title}</h3>
              <p className="text-sm text-gray-600">Selecione as turmas que verão esta vaga em destaque.</p>
              <div className="max-h-60 overflow-y-auto space-y-2 border p-2 rounded-lg">
                {classOptions.map(cls => (
                  <label key={cls.id} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" value={cls.id} checked={selectedClasses.includes(String(cls.id))} onChange={(e)=> { const id=String(e.target.value); setSelectedClasses(p=> e.target.checked? [...p,id]: p.filter(x=> x!==id)); }} />
                    <span>{cls.class_name || cls.name}</span>
                  </label>
                ))}
                {classOptions.length===0 && (<div className="text-xs text-gray-500">Nenhuma turma encontrada.</div>)}
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" onClick={()=> { setSelectingJob(null); setSelectedClasses([]); }}>Cancelar</Button>
                <Button disabled={!selectedClasses.length} onClick={async ()=> { try { const base=import.meta.env.VITE_API_URL || 'http://localhost:3001/api'; const token=localStorage.getItem('curriculoja_token'); await fetch(base+`/jobs/${selectingJob.id}/highlight`, { method:'POST', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` }, body: JSON.stringify({ classIds: selectedClasses }) }); toast({ title:'Vaga destacada', description:'Alunos verão em destaque.'}); setSelectingJob(null); setSelectedClasses([]); const r1=await fetch(base+'/jobs/highlights/school',{ headers:{ Authorization:`Bearer ${token}` }}); if(r1.ok){ const d1=await r1.json(); setSchoolHighlights(d1.highlights||[]); } const r2=await fetch(base+'/jobs/highlights/company-for-school',{ headers:{ Authorization:`Bearer ${token}` }}); if(r2.ok){ const d2=await r2.json(); setSchoolCompanyHighlights(d2.highlights||[]); } } catch(e){ toast({ title:'Erro ao destacar', description:'Tente novamente', variant:'destructive'}); } }}>Salvar</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default SearchJobs;