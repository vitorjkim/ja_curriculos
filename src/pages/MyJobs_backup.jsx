import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (user && user.type === 'company') {
        try {
          // Carregar vagas da empresa
          const jobsResponse = await jobsAPI.getCompanyJobs();
          setJobs(jobsResponse.jobs || []);

          // Carregar candidaturas da empresa
                    const applicationsResponse = await applicationsAPI.getCompanyApplications();
          setApplications(applicationsResponse.applications || []);
          
        } catch (error) {
          console.error('Erro ao carregar dados:', error);
          
          // Fallback para localStorage
          const allJobs = JSON.parse(localStorage.getItem('curriculoja_jobs') || '[]');
          const companyJobs = allJobs.filter(job => job.companyId === user.id);
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
      
      // Fallback para localStorage
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

      <div className="min-h-screen py-8 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex justify-between items-center mb-8">
              <div>
                <h1 className="text-3xl font-bold gradient-text mb-2">Minhas Vagas</h1>
                <p className="text-gray-600">Gerencie e visualize todas as suas vagas</p>
              </div>
              <Link to="/create-job">
                <Button className="btn-primary text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Vaga
                </Button>
              </Link>
            </div>

            {jobs.length === 0 ? (
              <Card className="card-hover">
                <CardContent className="p-12 text-center">
                  <Briefcase className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-xl font-semibold mb-2">Nenhuma vaga encontrada</h3>
                  <p className="text-gray-600 mb-6">
                    Você ainda não criou nenhuma vaga. Comece agora e encontre os melhores candidatos!
                  </p>
                  <Link to="/create-job">
                    <Button className="btn-primary text-white">
                      <Plus className="w-4 h-4 mr-2" />
                      Criar Primeira Vaga
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <motion.div layout className="grid gap-6">
                <AnimatePresence>
                {jobs.map((job, index) => (
                  <motion.div
                    key={job.id}
                    layout
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20, transition: { duration: 0.3 } }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                  >
                    <Card className="card-hover">
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-xl">{job.title}</CardTitle>
                            <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-600">
                              <div className="flex items-center"><MapPin className="w-4 h-4 mr-1" />{job.location}</div>
                              <div className="flex items-center"><DollarSign className="w-4 h-4 mr-1" />{job.salary}</div>
                              <div className="flex items-center"><Calendar className="w-4 h-4 mr-1" />{job.type}</div>
                              <div className="flex items-center"><Users className="w-4 h-4 mr-1" />{getJobApplicationsCount(job.id)} candidatos</div>
                            </div>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${ job.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800' }`}>
                              {job.status === 'active' ? 'Ativa' : 'Inativa'}
                          </span>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-gray-700 mb-4 line-clamp-3">{job.description}</p>
                        
                        <motion.div className="flex flex-wrap gap-2" initial={{opacity: 0}} animate={{opacity: 1}} transition={{delay: 0.2 + index*0.1}}>
                           <Link to={`/job/${job.id}/candidates`}>
                                <Button size="sm" variant="outline"><Eye className="w-4 h-4 mr-1" />Ver Candidatos</Button>
                            </Link>
                          <Link to={`/edit-job/${job.id}`}>
                              <Button size="sm" variant="outline"><Edit className="w-4 h-4 mr-1" />Editar</Button>
                          </Link>
                           <AlertDialog>
                              <AlertDialogTrigger asChild>
                                  <Button size="sm" variant="destructive-outline"><Trash2 className="w-4 h-4 mr-1" />Excluir</Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                  <AlertDialogHeader>
                                      <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                          Esta ação não pode ser desfeita. Isso irá excluir permanentemente a vaga e removerá todos os dados de candidaturas associados a ela.
                                      </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleDelete(job.id)} className="bg-red-600 hover:bg-red-700">Sim, excluir vaga</AlertDialogAction>
                                  </AlertDialogFooter>
                              </AlertDialogContent>
                          </AlertDialog>
                        </motion.div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
                </AnimatePresence>
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>
    </>
  );
};

export default MyJobs;