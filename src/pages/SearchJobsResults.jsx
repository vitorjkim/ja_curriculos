import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Helmet } from 'react-helmet';
import { 
  Search, MapPin, Briefcase, ExternalLink, Filter, 
  Grid, List, RefreshCw, ArrowLeft, Star, Clock,
  Building, TrendingUp, ChevronDown, X, SlidersHorizontal
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { jobsAPI, externalJobsAPI } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/use-toast';

const SearchJobsResults = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Parâmetros da URL
  const initialSearch = searchParams.get('search') || '';
  const initialLocation = searchParams.get('location') || '';
  
  // Estados do formulário
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [location, setLocation] = useState(initialLocation);
  
  // Estados dos resultados
  const [localJobs, setLocalJobs] = useState([]);
  const [externalJobs, setExternalJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingExternal, setLoadingExternal] = useState(false);
  
  // Filtros
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState('list');
  const [sortBy, setSortBy] = useState('recent');
  const [filters, setFilters] = useState({
    contract_type: [],
    work_type: [],
    experience_level: [],
    source: []
  });
  
  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  
  // Estatísticas
  const [stats, setStats] = useState({
    totalLocal: 0,
    totalExternal: 0,
    searchTime: 0
  });

  // Carregar resultados quando parâmetros mudarem
  useEffect(() => {
    if (initialSearch) {
      performSearch();
    }
  }, [initialSearch, initialLocation]);

  const performSearch = async () => {
    const startTime = Date.now();
    setLoading(true);
    setLoadingExternal(true);
    
    try {
      // Buscar vagas locais e externas em paralelo
      const [localResponse, externalResponse] = await Promise.all([
        searchLocalJobs(),
        searchExternalJobs()
      ]);
      
      const searchTime = Date.now() - startTime;
      setStats({
        totalLocal: localResponse?.length || 0,
        totalExternal: externalResponse?.length || 0,
        searchTime: searchTime / 1000
      });
      
    } catch (error) {
      console.error('Erro na busca:', error);
      toast({
        title: 'Erro na busca',
        description: 'Não foi possível realizar a busca. Tente novamente.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
      setLoadingExternal(false);
    }
  };

  const searchLocalJobs = async () => {
    try {
      const response = await jobsAPI.list();
      let jobs = response?.jobs || [];
      
      // Filtrar por termo de busca
      if (searchTerm) {
        jobs = jobs.filter(job => 
          job.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          job.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          job.description?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      
      // Filtrar por localização
      if (location) {
        jobs = jobs.filter(job => 
          job.location?.toLowerCase().includes(location.toLowerCase())
        );
      }
      
      setLocalJobs(jobs);
      return jobs;
    } catch (error) {
      console.error('Erro na busca local:', error);
      return [];
    }
  };

  const searchExternalJobs = async () => {
    if (!searchTerm) return [];
    
    try {
      const response = await externalJobsAPI.search(searchTerm, location, 'linkedin,indeed,catho', 50);
      const jobs = response?.jobs || [];
      setExternalJobs(jobs);
      return jobs;
    } catch (error) {
      console.error('Erro na busca externa:', error);
      return [];
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    
    // Atualizar URL
    const params = new URLSearchParams();
    if (searchTerm) params.set('search', searchTerm);
    if (location) params.set('location', location);
    setSearchParams(params);
    
    // Realizar busca
    performSearch();
  };

  const applyFilters = (jobs) => {
    return jobs.filter(job => {
      // Filtro de tipo de contrato
      if (filters.contract_type.length > 0) {
        const jobContract = job.contract_type || job.employment_type;
        if (!filters.contract_type.includes(jobContract)) return false;
      }
      
      // Filtro de modalidade de trabalho
      if (filters.work_type.length > 0) {
        if (!filters.work_type.includes(job.work_type)) return false;
      }
      
      // Filtro de nível de experiência
      if (filters.experience_level.length > 0) {
        if (!filters.experience_level.includes(job.experience_level)) return false;
      }
      
      // Filtro de fonte (apenas para vagas externas)
      if (filters.source.length > 0 && job.source) {
        if (!filters.source.includes(job.source)) return false;
      }
      
      return true;
    });
  };

  const sortJobs = (jobs) => {
    return [...jobs].sort((a, b) => {
      switch (sortBy) {
        case 'recent':
          return new Date(b.created_at || b.posted_date) - new Date(a.created_at || a.posted_date);
        case 'alphabetical':
          return a.title.localeCompare(b.title);
        case 'company':
          return (a.company_name || a.company).localeCompare(b.company_name || b.company);
        default:
          return 0;
      }
    });
  };

  // Combinar e processar todos os resultados
  const allJobs = [...localJobs, ...externalJobs];
  const filteredJobs = applyFilters(allJobs);
  const sortedJobs = sortJobs(filteredJobs);
  
  // Paginação
  const totalPages = Math.ceil(sortedJobs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedJobs = sortedJobs.slice(startIndex, startIndex + itemsPerPage);

  const FilterCheckbox = ({ label, value, checked, onChange }) => (
    <div className="flex items-center space-x-2">
      <Checkbox
        id={value}
        checked={checked}
        onCheckedChange={onChange}
      />
      <label htmlFor={value} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
        {label}
      </label>
    </div>
  );

  const JobCard = ({ job, isExternal = false }) => (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="group"
    >
      <Card className={`hover:shadow-lg transition-all duration-300 cursor-pointer ${
        viewMode === 'grid' ? 'h-full' : ''
      }`}>
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <h3 className="font-semibold text-lg text-gray-900 group-hover:text-blue-600 transition-colors mb-1">
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
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-2 mb-4 text-sm text-gray-600">
            <div className="flex items-center">
              <MapPin className="w-4 h-4 mr-2" />
              {job.location}
            </div>
            <div className="flex items-center">
              <Briefcase className="w-4 h-4 mr-2" />
              {job.contract_type || job.employment_type}
            </div>
            <div className="flex items-center">
              <Building className="w-4 h-4 mr-2" />
              {job.work_type}
            </div>
            <div className="flex items-center">
              <Clock className="w-4 h-4 mr-2" />
              {job.experience_level}
            </div>
          </div>

          {viewMode === 'list' && (
            <p className="text-sm text-gray-600 mb-4 line-clamp-2">
              {job.description}
            </p>
          )}

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
        <title>Resultados da Busca - CurrículoJá</title>
        <meta name="description" content={`Resultados para "${searchTerm}" - Encontre as melhores oportunidades`} />
      </Helmet>

      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-7xl mx-auto">
            
            {/* Header com busca */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              className="mb-8"
            >
              <div className="flex items-center gap-4 mb-6">
                <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar
                </Button>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Resultados da Busca
                  </h1>
                  <p className="text-gray-600">
                    {sortedJobs.length} vagas encontradas em {stats.searchTime.toFixed(1)}s
                  </p>
                </div>
              </div>

              {/* Formulário de busca */}
              <Card className="shadow-lg">
                <CardContent className="p-6">
                  <form onSubmit={handleSearch} className="space-y-4">
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="md:col-span-2 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <Input
                          placeholder="Buscar vagas..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10 h-12"
                        />
                      </div>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <Input
                          placeholder="Localização"
                          value={location}
                          onChange={(e) => setLocation(e.target.value)}
                          className="pl-10 h-12"
                        />
                      </div>
                    </div>
                    
                    <div className="flex gap-4">
                      <Button type="submit" className="h-12 px-8" disabled={loading}>
                        {loading ? (
                          <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <Search className="w-4 h-4 mr-2" />
                        )}
                        Buscar
                      </Button>
                      
                      <Button 
                        type="button"
                        variant="outline"
                        onClick={() => setShowFilters(!showFilters)}
                        className="h-12 px-6"
                      >
                        <SlidersHorizontal className="w-4 h-4 mr-2" />
                        Filtros
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </motion.div>

            <div className="grid lg:grid-cols-4 gap-8">
              
              {/* Sidebar de Filtros */}
              <AnimatePresence>
                {showFilters && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="lg:col-span-1"
                  >
                    <Card className="sticky top-6">
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          Filtros
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setFilters({
                              contract_type: [],
                              work_type: [],
                              experience_level: [],
                              source: []
                            })}
                          >
                            Limpar
                          </Button>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        
                        {/* Tipo de Contrato */}
                        <div>
                          <h4 className="font-medium mb-3">Tipo de Contrato</h4>
                          <div className="space-y-2">
                            {['CLT', 'PJ', 'Estágio', 'Temporário'].map(type => (
                              <FilterCheckbox
                                key={type}
                                label={type}
                                value={type}
                                checked={filters.contract_type.includes(type)}
                                onChange={(checked) => {
                                  setFilters(prev => ({
                                    ...prev,
                                    contract_type: checked 
                                      ? [...prev.contract_type, type]
                                      : prev.contract_type.filter(t => t !== type)
                                  }));
                                }}
                              />
                            ))}
                          </div>
                        </div>

                        {/* Modalidade de Trabalho */}
                        <div>
                          <h4 className="font-medium mb-3">Modalidade</h4>
                          <div className="space-y-2">
                            {['Presencial', 'Remoto', 'Híbrido'].map(type => (
                              <FilterCheckbox
                                key={type}
                                label={type}
                                value={type}
                                checked={filters.work_type.includes(type)}
                                onChange={(checked) => {
                                  setFilters(prev => ({
                                    ...prev,
                                    work_type: checked 
                                      ? [...prev.work_type, type]
                                      : prev.work_type.filter(t => t !== type)
                                  }));
                                }}
                              />
                            ))}
                          </div>
                        </div>

                        {/* Nível de Experiência */}
                        <div>
                          <h4 className="font-medium mb-3">Experiência</h4>
                          <div className="space-y-2">
                            {['Estágio', 'Júnior', 'Pleno', 'Sênior'].map(level => (
                              <FilterCheckbox
                                key={level}
                                label={level}
                                value={level}
                                checked={filters.experience_level.includes(level)}
                                onChange={(checked) => {
                                  setFilters(prev => ({
                                    ...prev,
                                    experience_level: checked 
                                      ? [...prev.experience_level, level]
                                      : prev.experience_level.filter(l => l !== level)
                                  }));
                                }}
                              />
                            ))}
                          </div>
                        </div>

                        {/* Fonte das Vagas */}
                        {stats.totalExternal > 0 && (
                          <div>
                            <h4 className="font-medium mb-3">Fonte</h4>
                            <div className="space-y-2">
                              <FilterCheckbox
                                label="Vagas Locais"
                                value="local"
                                checked={filters.source.includes('local')}
                                onChange={(checked) => {
                                  setFilters(prev => ({
                                    ...prev,
                                    source: checked 
                                      ? [...prev.source, 'local']
                                      : prev.source.filter(s => s !== 'local')
                                  }));
                                }}
                              />
                              {['LinkedIn', 'Indeed', 'Catho'].map(source => (
                                <FilterCheckbox
                                  key={source}
                                  label={source}
                                  value={source}
                                  checked={filters.source.includes(source)}
                                  onChange={(checked) => {
                                    setFilters(prev => ({
                                      ...prev,
                                      source: checked 
                                        ? [...prev.source, source]
                                        : prev.source.filter(s => s !== source)
                                    }));
                                  }}
                                />
                              ))}
                            </div>
                          </div>
                        )}

                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Área de Resultados */}
              <div className={showFilters ? 'lg:col-span-3' : 'lg:col-span-4'}>
                
                {/* Toolbar */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <select 
                      value={sortBy} 
                      onChange={(e) => setSortBy(e.target.value)}
                      className="w-48 px-3 py-2 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="recent">Mais Recentes</option>
                      <option value="alphabetical">A-Z</option>
                      <option value="company">Por Empresa</option>
                    </select>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant={viewMode === 'list' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setViewMode('list')}
                    >
                      <List className="w-4 h-4" />
                    </Button>
                    <Button
                      variant={viewMode === 'grid' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setViewMode('grid')}
                    >
                      <Grid className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Resultados */}
                {loading ? (
                  <div className="grid gap-6">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="h-48 bg-gray-200 rounded-lg animate-pulse" />
                    ))}
                  </div>
                ) : (
                  <>
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={`${viewMode}-${currentPage}`}
                        className={viewMode === 'grid' 
                          ? 'grid md:grid-cols-2 xl:grid-cols-3 gap-6' 
                          : 'space-y-6'
                        }
                      >
                        {paginatedJobs.map((job) => (
                          <JobCard 
                            key={`${job.id}-${job.source || 'local'}`}
                            job={job} 
                            isExternal={!!job.source}
                          />
                        ))}
                      </motion.div>
                    </AnimatePresence>

                    {/* Paginação */}
                    {totalPages > 1 && (
                      <div className="flex justify-center mt-8">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(currentPage - 1)}
                          >
                            Anterior
                          </Button>
                          
                          <div className="flex items-center gap-1">
                            {[...Array(Math.min(5, totalPages))].map((_, i) => {
                              const page = i + 1;
                              return (
                                <Button
                                  key={page}
                                  variant={currentPage === page ? 'default' : 'outline'}
                                  size="sm"
                                  onClick={() => setCurrentPage(page)}
                                >
                                  {page}
                                </Button>
                              );
                            })}
                            {totalPages > 5 && (
                              <>
                                <span className="mx-2">...</span>
                                <Button
                                  variant={currentPage === totalPages ? 'default' : 'outline'}
                                  size="sm"
                                  onClick={() => setCurrentPage(totalPages)}
                                >
                                  {totalPages}
                                </Button>
                              </>
                            )}
                          </div>
                          
                          <Button
                            variant="outline"
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(currentPage + 1)}
                          >
                            Próxima
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Estatísticas */}
                    <div className="mt-8 text-center text-sm text-gray-600">
                      <p>
                        Exibindo {startIndex + 1}-{Math.min(startIndex + itemsPerPage, sortedJobs.length)} de {sortedJobs.length} vagas
                        {stats.totalLocal > 0 && ` (${stats.totalLocal} locais`}
                        {stats.totalExternal > 0 && `, ${stats.totalExternal} externas)`}
                      </p>
                    </div>
                  </>
                )}

              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SearchJobsResults;