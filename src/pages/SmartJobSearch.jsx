import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Helmet } from 'react-helmet';
import { 
  Search, MapPin, Briefcase, ExternalLink, 
  Star, Zap, TrendingUp, Clock, Building,
  ChevronRight, RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { jobsAPI, externalJobsAPI } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/use-toast';

const SmartJobSearch = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const routerLocation = useLocation();
  const isCandidate = user?.type === 'candidate';
  
  const [searchTerm, setSearchTerm] = useState('');
  // Localização digitada pelo usuário (cidade/estado)
  const [jobLocation, setJobLocation] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Diferentes tipos de vagas
  const [localJobs, setLocalJobs] = useState([]);
  const [externalJobs, setExternalJobs] = useState([]);
  const [suggestedJobs, setSuggestedJobs] = useState([]);
  const [highlightedJobs, setHighlightedJobs] = useState([]);
  
  // Estado do carregamento
  const [loadingSuggested, setLoadingSuggested] = useState(false);
  const [loadingExternal, setLoadingExternal] = useState(false);
  
  // Carregar dados iniciais
  useEffect(() => {
    loadInitialData();
  }, [user]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      
      // Carregar vagas locais
      const localResponse = await jobsAPI.list();
      if (localResponse?.jobs) {
        setLocalJobs(localResponse.jobs.slice(0, 6)); // Mostrar apenas algumas na página inicial
      }

      // Se for candidato, carregar sugestões personalizadas
      if (isCandidate) {
        loadSuggestedJobs();
        loadHighlightedJobs();
      }

    } catch (error) {
      console.error('Erro ao carregar dados iniciais:', error);
      toast({
        title: 'Erro ao carregar vagas',
        description: 'Tente recarregar a página.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadSuggestedJobs = async () => {
    try {
      setLoadingSuggested(true);
      const response = await externalJobsAPI.getSuggested();
      if (response?.jobs) {
        setSuggestedJobs(response.jobs.slice(0, 8));
      }
    } catch (error) {
      console.error('Erro ao carregar sugestões:', error);
    } finally {
      setLoadingSuggested(false);
    }
  };

  const loadHighlightedJobs = async () => {
    try {
      // Buscar vagas destacadas pela escola/empresa
      const base = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      const token = localStorage.getItem('curriculoja_token');
      const response = await fetch(`${base}/jobs/highlights/mine`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        const highlighted = data.jobs || [];
        setHighlightedJobs(highlighted.slice(0, 6));
      }
    } catch (error) {
      console.error('Erro ao carregar destaques:', error);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) {
      toast({
        title: 'Digite um termo de busca',
        description: 'Informe o que você está procurando.',
        variant: 'destructive'
      });
      return;
    }

    // Redirecionar para página de resultados
    const params = new URLSearchParams({
      search: searchTerm,
      ...(jobLocation && { location: jobLocation })
    });
    navigate(`/search-results?${params}`);
  };

  const searchExternalJobs = async (term = searchTerm) => {
    if (!term.trim()) return;
    
    try {
      setLoadingExternal(true);
  const response = await externalJobsAPI.search(term, jobLocation, 'linkedin,indeed', 12);
      if (response?.jobs) {
        setExternalJobs(response.jobs);
      }
    } catch (error) {
      console.error('Erro na busca externa:', error);
      toast({
        title: 'Erro na busca externa',
        description: 'Não foi possível buscar vagas externas.',
        variant: 'destructive'
      });
    } finally {
      setLoadingExternal(false);
    }
  };

  const JobCard = ({ job, isExternal = false, isHighlighted = false }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="group"
    >
      <Card className={`h-full hover:shadow-lg transition-all duration-300 cursor-pointer ${
        isHighlighted ? 'ring-2 ring-blue-500 bg-blue-50/50' : ''
      }`}>
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <h3 className="font-semibold text-lg text-gray-900 group-hover:text-blue-600 transition-colors">
                {job.title}
              </h3>
              <p className="text-gray-600 font-medium">{job.company_name || job.company}</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              {isExternal && (
                <Badge variant="outline" className="text-xs">
                  <ExternalLink className="w-3 h-3 mr-1" />
                  {job.source}
                </Badge>
              )}
              {isHighlighted && (
                <Badge className="bg-blue-600 text-xs">
                  <Star className="w-3 h-3 mr-1" />
                  Destaque
                </Badge>
              )}
            </div>
          </div>
          
          <div className="space-y-2 mb-4">
            <div className="flex items-center text-sm text-gray-600">
              <MapPin className="w-4 h-4 mr-2" />
              {job.location}
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <Briefcase className="w-4 h-4 mr-2" />
              {job.contract_type || job.employment_type} • {job.work_type}
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <Clock className="w-4 h-4 mr-2" />
              {job.experience_level}
            </div>
          </div>

          <p className="text-sm text-gray-600 mb-4 line-clamp-2">
            {job.description}
          </p>

          <div className="flex items-center justify-between">
            <div className="flex flex-wrap gap-1">
              {job.area && (
                <Badge variant="secondary" className="text-xs">
                  {job.area}
                </Badge>
              )}
            </div>
            
            {isExternal ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.open(job.url, '_blank')}
                className="text-xs"
              >
                Ver vaga
                <ExternalLink className="w-3 h-3 ml-1" />
              </Button>
            ) : (
              <Link to={`/jobs/${job.id}`}>
                <Button size="sm" className="text-xs">
                  Ver detalhes
                  <ChevronRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  return (
    <>
      <Helmet>
        <title>Busca Inteligente de Vagas - CurrículoJá</title>
        <meta name="description" content="Encontre vagas personalizadas do seu curso e região, incluindo oportunidades de sites como LinkedIn e Indeed." />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-7xl mx-auto">
            
            {/* Header Hero */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              className="text-center mb-6" /* reduzido para abrir espaço às abas */
            >
              <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-4">
                Sua carreira 
                <span className="text-blue-600 block md:inline md:ml-3">
                  começa aqui
                </span>
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
                Sistema inteligente que encontra vagas perfeitas para seu perfil, 
                incluindo oportunidades dos principais sites de emprego do Brasil.
              </p>
              
              {/* Estatísticas */}
              <div className="flex justify-center gap-8 text-sm text-gray-600 mb-8">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  <span>+1000 vagas disponíveis</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-yellow-600" />
                  <span>Busca em tempo real</span>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-blue-600" />
                  <span>Sugestões personalizadas</span>
                </div>
              </div>
            </motion.div>

            {/* Tabs removidas conforme solicitação */}

            {/* Barra de Busca Principal */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mb-12"
            >
              <Card className="shadow-2xl border-0 bg-white/95 backdrop-blur-sm rounded-3xl overflow-hidden">
                <CardContent className="p-8">
                  <form onSubmit={handleSearch} className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="md:col-span-2 relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-6 h-6" />
                        <Input
                          placeholder="Ex: desenvolvedor, enfermeiro, vendedor..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-12 h-14 text-lg border-2 border-gray-200 focus:border-blue-500 rounded-2xl"
                        />
                      </div>
                      <div className="relative">
                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <Input
                          placeholder="Cidade ou estado"
                          value={jobLocation}
                          onChange={(e) => setJobLocation(e.target.value)}
                          className="pl-12 h-14 text-lg border-2 border-gray-200 focus:border-blue-500 rounded-2xl"
                        />
                      </div>
                    </div>
                    
                    <div className="flex gap-4">
                      <Button 
                        type="submit" 
                        size="lg"
                        className="flex-1 h-14 text-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-2xl shadow-lg"
                        disabled={loading}
                      >
                        <Search className="w-5 h-5 mr-2" />
                        Buscar todas as vagas
                      </Button>
                      
                      <Button 
                        type="button"
                        variant="outline"
                        size="lg"
                        onClick={() => searchExternalJobs()}
                        className="h-14 px-6 rounded-2xl border-2 hover:bg-gray-50"
                        disabled={loadingExternal || !searchTerm.trim()}
                      >
                        {loadingExternal ? (
                          <RefreshCw className="w-5 h-5 animate-spin" />
                        ) : (
                          <ExternalLink className="w-5 h-5" />
                        )}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </motion.div>

            {/* Seções de Vagas */}
            <div className="space-y-12">
              
              {/* Vagas Destacadas (para candidatos) */}
              {isCandidate && highlightedJobs.length > 0 && (
                <motion.section
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-3xl font-bold text-gray-900 mb-2">
                        Vagas Destacadas para Você
                      </h2>
                      <p className="text-gray-600">
                        Selecionadas especialmente pela sua escola e empresas parceiras
                      </p>
                    </div>
                    <Link to="/search-jobs">
                      <Button variant="outline">
                        Ver todas
                        <ChevronRight className="w-4 h-4 ml-2" />
                      </Button>
                    </Link>
                  </div>
                  
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {highlightedJobs.map((job) => (
                      <JobCard key={job.id} job={job} isHighlighted={true} />
                    ))}
                  </div>
                </motion.section>
              )}

              {/* Sugestões Personalizadas (para candidatos) */}
              {isCandidate && (
                <motion.section
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-3xl font-bold text-gray-900 mb-2">
                        Sugestões Inteligentes
                      </h2>
                      <p className="text-gray-600">
                        Vagas que combinam com seu curso e localização
                      </p>
                    </div>
                    <Button 
                      variant="outline"
                      onClick={loadSuggestedJobs}
                      disabled={loadingSuggested}
                    >
                      {loadingSuggested ? (
                        <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <RefreshCw className="w-4 h-4 mr-2" />
                      )}
                      Atualizar
                    </Button>
                  </div>
                  
                  {loadingSuggested ? (
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                      {[...Array(8)].map((_, i) => (
                        <div key={i} className="h-64 bg-gray-200 rounded-lg animate-pulse" />
                      ))}
                    </div>
                  ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                      {suggestedJobs.map((job) => (
                        <JobCard key={job.id} job={job} isExternal={true} />
                      ))}
                    </div>
                  )}
                </motion.section>
              )}

              {/* Vagas Locais Recentes */}
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">
                      Últimas Oportunidades
                    </h2>
                    <p className="text-gray-600">
                      Vagas recentes de empresas parceiras
                    </p>
                  </div>
                  <Link to="/search-jobs">
                    <Button variant="outline">
                      Explorar todas
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </div>
                
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {localJobs.map((job) => (
                    <JobCard key={job.id} job={job} />
                  ))}
                </div>
              </motion.section>

              {/* Resultados da Busca Externa */}
              {externalJobs.length > 0 && (
                <motion.section
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-3xl font-bold text-gray-900 mb-2">
                        Vagas Externas
                      </h2>
                      <p className="text-gray-600">
                        Oportunidades encontradas em LinkedIn, Indeed e outros sites
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {externalJobs.map((job) => (
                      <JobCard key={job.id} job={job} isExternal={true} />
                    ))}
                  </div>
                </motion.section>
              )}

            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SmartJobSearch;