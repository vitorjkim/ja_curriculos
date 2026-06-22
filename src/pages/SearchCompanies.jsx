import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet';
import { Search, Building2, MapPin, Users, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Helper para obter baseURL da API de forma consistente
function getAPIBaseURL() {
  const apiUrl = import.meta.env.VITE_API_URL;
  
  if (!apiUrl) {
    return 'http://localhost:3001/api';
  }
  
  const trimmed = apiUrl.trim().replace(/\/$/, '');
  
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return 'http://localhost:3001/api';
  }
  
  if (!trimmed.endsWith('/api')) {
    return `${trimmed}/api`;
  }
  
  return trimmed;
}

const SearchCompanies = () => {
  const [companies, setCompanies] = useState([]);
  const [filteredCompanies, setFilteredCompanies] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    // Carregar empresas a partir de localStorage e depois tentar enriquecer com imagens via API pública
    const loadCompanies = async () => {
      const users = JSON.parse(localStorage.getItem('curriculoja_users') || '[]');
      const companyUsers = users.filter(user => user.type === 'company');
      const jobsLS = JSON.parse(localStorage.getItem('curriculoja_jobs') || '[]');
      const companyMap = companyUsers.map(company => {
        const companyJobs = jobsLS.filter(job => (job.companyId === company.id) || (job.company_id === company.id));
        return {
          ...company,
          jobsCount: companyJobs.length,
          jobs: companyJobs,
          profileImage: company.profileImage || company.profile_image || null
        };
      });
      setCompanies(companyMap);
      setFilteredCompanies(companyMap);

      // Tentar enriquecer cada empresa sem profileImage buscando na API pública (agora expõe profile_image)
      const enrichMissing = async () => {
        for (const comp of companyMap) {
          if (!comp.profileImage) {
            try {
              const resp = await fetch(`${getAPIBaseURL()}/users/company/${comp.id}`);
              if (resp.ok) {
                const data = await resp.json();
                const img = data?.company?.profile_image || null;
                if (img) {
                  setCompanies(prev => prev.map(c => c.id === comp.id ? { ...c, profileImage: img } : c));
                  setFilteredCompanies(prev => prev.map(c => c.id === comp.id ? { ...c, profileImage: img } : c));
                  // Cache simples para outras telas offline
                  try {
                    const logos = JSON.parse(localStorage.getItem('curriculoja_company_logos') || '{}');
                    logos[String(comp.id)] = img;
                    localStorage.setItem('curriculoja_company_logos', JSON.stringify(logos));
                  } catch {}
                }
              }
            } catch (e) {
              // Silencioso: falha de rede
            }
          }
        }
      };
      enrichMissing();
    };
    loadCompanies();
  }, []);

  useEffect(() => {
    const filtered = companies.filter(company =>
      company.companyName.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredCompanies(filtered);
  }, [searchTerm, companies]);

  return (
    <>
      <Helmet>
        <title>Buscar Empresas - CurrículoJá</title>
        <meta name="description" content="Encontre empresas e vagas de emprego disponíveis na plataforma CurrículoJá." />
      </Helmet>

      <div className="min-h-screen py-8 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold gradient-text mb-2">Buscar Empresas</h1>
              <p className="text-gray-600">Encontre empresas e vagas que combinam com seu perfil</p>
            </div>

            {/* Search Bar */}
            <Card className="mb-8">
              <CardContent className="p-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    placeholder="Buscar empresas..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Companies Grid */}
            {filteredCompanies.length === 0 ? (
              <Card className="card-hover">
                <CardContent className="p-12 text-center">
                  <Building2 className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-xl font-semibold mb-2">
                    {searchTerm ? 'Nenhuma empresa encontrada' : 'Nenhuma empresa cadastrada'}
                  </h3>
                  <p className="text-gray-600">
                    {searchTerm 
                      ? 'Tente buscar com outros termos.' 
                      : 'Ainda não há empresas cadastradas na plataforma.'
                    }
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCompanies.map((company, index) => (
                  <motion.div
                    key={company.id}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                  >
                    <Card className="card-hover h-full">
                      <CardHeader>
                        <div className="flex items-center space-x-3">
                          {(() => {
                            const img = company.profileImage || company.profile_image;
                            const shape = (typeof window !== 'undefined' && localStorage.getItem('company_avatar_shape_'+company.id)) || 'square';
                            return (
                              <div className={`w-12 h-12 bg-white ${shape==='circle' ? 'rounded-full' : 'rounded-xl'} flex items-center justify-center overflow-hidden border border-gray-200`}>
                                {img ? (
                                  <img src={img} alt={company.companyName} className="w-full h-full object-contain" />
                                ) : (
                                  <Building2 className="w-6 h-6 text-blue-600" />
                                )}
                              </div>
                            );
                          })()}
                          <div>
                            <CardTitle className="text-lg">{company.companyName}</CardTitle>
                            <p className="text-sm text-gray-500 flex items-center">
                              <MapPin className="w-4 h-4 mr-1" />
                              Brasil
                            </p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3 mb-4">
                          <div className="flex items-center text-sm text-gray-600">
                            <Briefcase className="w-4 h-4 mr-2" />
                            <span>{company.jobsCount} vagas disponíveis</span>
                          </div>
                          <div className="flex items-center text-sm text-gray-600">
                            <Users className="w-4 h-4 mr-2" />
                            <span>Empresa verificada</span>
                          </div>
                        </div>
                        
                        <Link to={`/company/${company.id}`}>
                          <Button className="w-full btn-primary text-white">
                            Ver Empresa
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Stats Section */}
            <div className="mt-16 grid md:grid-cols-3 gap-8 text-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
              >
                <div className="text-3xl font-bold gradient-text mb-2">{filteredCompanies.length}</div>
                <p className="text-gray-600">Empresas Cadastradas</p>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                <div className="text-3xl font-bold gradient-text mb-2">
                  {filteredCompanies.reduce((total, company) => total + company.jobsCount, 0)}
                </div>
                <p className="text-gray-600">Vagas Disponíveis</p>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <div className="text-3xl font-bold gradient-text mb-2">100%</div>
                <p className="text-gray-600">Empresas Verificadas</p>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
};

export default SearchCompanies;