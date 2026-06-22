import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Helmet } from 'react-helmet';
import { Briefcase, Plus, Eye, Edit, Trash2, Users, Calendar, MapPin, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/use-toast';
import api from '@/lib/api';
import { jobs as jobsAPI, applications as applicationsAPI } from '@/lib/api';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const MyJobs = () => {
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (user && user.type === 'company') {
        console.log("🔍 MyJobs: Carregando dados para empresa:", user);
        try {
          console.log("📡 MyJobs: Chamando jobsAPI.getCompanyJobs()...");
          const jobsResponse = await jobsAPI.getCompanyJobs();
          console.log("✅ MyJobs: Response jobs:", jobsResponse);
          
          setJobs(jobsResponse.jobs || []);
          console.log("📋 MyJobs: Jobs definidos:", jobsResponse.jobs?.length || 0);

          // Tentar carregar applications, mas não falhar se der erro
          try {
            const applicationsResponse = await applicationsAPI.getCompanyApplications();
            setApplications(applicationsResponse.applications || []);
          } catch (appError) {
            console.log("⚠️ MyJobs: Erro ao carregar applications (ignorado):", appError.message);
            setApplications([]); // Define array vazio
          }
        } catch (error) {
          console.error('❌ MyJobs: Erro ao carregar dados:', error);
          
          const allJobs = JSON.parse(localStorage.getItem('curriculoja_jobs') || '[]');
          console.log("💾 MyJobs: Jobs no localStorage:", allJobs.length);
          
          const companyJobs = allJobs.filter(job => job.companyId === user.id);
          console.log("👤 MyJobs: Jobs filtrados por company ID:", companyJobs.length);
          setJobs(companyJobs);

          const allApplications = JSON.parse(localStorage.getItem('curriculoja_applications') || '[]');
          const companyApplications = allApplications.filter(app => app.companyId === user.id);
          setApplications(companyApplications);
        } finally {
          setLoading(false);
        }
      }
    };

    loadData();
  }, [user]);

  const handleDelete = async (jobId) => {
    try {
      await jobsAPI.delete(jobId);
      setJobs(jobs.filter(job => job.id !== jobId));
      toast({
        title: 'Vaga excluída',
        description: 'A vaga foi removida com sucesso.'
      });
    } catch (error) {
      console.error('Erro ao excluir vaga:', error);
      
      const allJobs = JSON.parse(localStorage.getItem('curriculoja_jobs') || '[]');
      const updatedJobs = allJobs.filter(job => job.id !== jobId);
      localStorage.setItem('curriculoja_jobs', JSON.stringify(updatedJobs));
      
      setJobs(jobs.filter(job => job.id !== jobId));
      
      toast({
        title: 'Vaga excluída',
        description: 'A vaga foi removida com sucesso.'
      });
    }
  };

  const getJobApplicationsCount = (jobId) => {
    return applications.filter(app => app.jobId === jobId).length;
  };

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
        <title>Minhas Vagas - CurrículoJá</title>
        <meta name="description" content="Gerencie todas as vagas da sua empresa no CurrículoJá." />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-between items-start mb-8"
            >
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Minhas Vagas</h1>
                <p className="text-lg text-gray-600">
                  Gerencie suas oportunidades de trabalho
                </p>
              </div>
              <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white">
                <Link to="/create-job" className="text-white">
                  <Plus className="w-4 h-4 mr-2 text-white" />
                  Nova Vaga
                </Link>
              </Button>
            </motion.div>

            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Carregando suas vagas...</p>
              </div>
            ) : jobs.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-12"
              >
                <Briefcase className="w-24 h-24 text-gray-300 mx-auto mb-6" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Nenhuma vaga cadastrada
                </h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  Comece criando sua primeira vaga e encontre os melhores talentos para sua empresa.
                </p>
                <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Link to="/create-job" className="text-white">
                    <Plus className="w-4 h-4 mr-2 text-white" />
                    Criar Primeira Vaga
                  </Link>
                </Button>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
              >
                <AnimatePresence>
                  {jobs.map((job) => (
                    <motion.div
                      key={job.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      whileHover={{ y: -4 }}
                      className="group"
                    >
                      <Card className="h-full hover:shadow-xl transition-all duration-300 border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                        <CardHeader className="pb-4">
                          <div className="flex justify-between items-start mb-2">
                            <div className="bg-blue-100 p-2 rounded-lg">
                              <Briefcase className="w-6 h-6 text-blue-600" />
                            </div>
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                asChild
                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Link to={`/job/${job.id}/candidates`}>
                                  <Eye className="w-4 h-4" />
                                </Link>
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                asChild
                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Link to={`/edit-job/${job.id}`}>
                                  <Edit className="w-4 h-4" />
                                </Link>
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="opacity-0 group-hover:opacity-100 transition-opacity text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Excluir vaga</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Tem certeza que deseja excluir esta vaga? Esta ação não pode ser desfeita.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDelete(job.id)}
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      Excluir
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                          <CardTitle className="text-xl font-bold text-gray-900 line-clamp-2">
                            {job.title}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="flex items-center gap-2 text-gray-600">
                            <MapPin className="w-4 h-4" />
                            <span className="text-sm">{job.location || 'Não informado'}</span>
                          </div>
                          
                          {(job.salary_min || job.salary_max) && (
                            <div className="flex items-center gap-2 text-gray-600">
                              <DollarSign className="w-4 h-4" />
                              <span className="text-sm font-medium text-green-600">
                                {job.salary_min && job.salary_max ? 
                                  `R$ ${job.salary_min} - R$ ${job.salary_max}` :
                                  job.salary_min ? 
                                    `A partir de R$ ${job.salary_min}` :
                                    `Até R$ ${job.salary_max}`
                                }
                              </span>
                            </div>
                          )}

                          <div className="flex flex-wrap gap-2">
                            {job.contract_type && (
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                                {job.contract_type.toUpperCase()}
                              </span>
                            )}
                            {job.work_type && (
                              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                                {job.work_type.charAt(0).toUpperCase() + job.work_type.slice(1)}
                              </span>
                            )}
                            {job.experience_level && (
                              <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded-full">
                                {job.experience_level.charAt(0).toUpperCase() + job.experience_level.slice(1)}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-gray-600">
                            <Users className="w-4 h-4" />
                            <span className="text-sm">
                              {getJobApplicationsCount(job.id)} candidaturas
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-gray-600">
                            <Calendar className="w-4 h-4" />
                            <span className="text-sm">
                              {job.created_at ? 
                                new Date(job.created_at).toLocaleDateString('pt-BR') : 
                                job.createdAt ? 
                                  new Date(job.createdAt).toLocaleDateString('pt-BR') :
                                  'Data não disponível'
                              }
                            </span>
                          </div>

                          <div className="pt-4 border-t flex gap-2">
                            <Button
                              asChild
                              className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                            >
                              <Link to={`/job/${job.id}/candidates`} className="text-white">
                                <Users className="w-4 h-4 mr-1 text-white" />
                                Candidatos
                              </Link>
                            </Button>
                            <Button
                              asChild
                              variant="outline"
                              className="flex-1 border-gray-300 hover:bg-gray-50"
                            >
                              <Link to={`/job/${job.id}`}>
                                <Eye className="w-4 h-4 mr-1" />
                                Visualizar
                              </Link>
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default MyJobs;
