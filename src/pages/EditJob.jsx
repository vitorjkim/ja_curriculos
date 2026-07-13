import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet';
import { Save, Briefcase } from 'lucide-react';
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
import api from '@/lib/api';
import { jobs as jobsAPI } from '@/lib/api';

const jobCategories = [
  "Tecnologia", "Saúde", "Educação", "Engenharia", "Administração", 
  "Vendas", "Marketing", "Recursos Humanos", "Finanças", "Design",
  "Logística", "Produção", "Mecânica", "Automação", "Outros"
];

const EditJob = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(null);
  const descriptionRef = useRef(null);
  const requirementsRef = useRef(null);
  const benefitsRef = useRef(null);
  const [refsReady, setRefsReady] = useState(false);
  const [salaryMode, setSalaryMode] = useState('range'); // 'range' | 'fixed'

  // Forçar re-render quando refs estiverem prontos
  useEffect(() => {
    const timer = setTimeout(() => setRefsReady(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const loadJob = async () => {
      try {
        const response = await jobsAPI.get(id);
        const job = response.job;
        const isFixed = (job.salary_min != null && job.salary_max != null && Number(job.salary_min) === Number(job.salary_max));
        setSalaryMode(isFixed ? 'fixed' : 'range');
        setFormData({
          title: '',
          description: '',
          requirements: '',
          location: '',
          salary_min: '',
          salary_max: '',
          salary_fixed: '',
          contract_type: 'clt',
          benefits: '',
          category: 'Tecnologia',
          is_first_job: false,
          work_type: 'presencial',
          experience_level: 'junior',
          ...job,
          // Mapeamento de campos do backend para frontend
          contract_type: job.contract_type || 'clt',
          salary_min: job.salary_min || '',
          salary_max: job.salary_max || '',
          salary_fixed: isFixed ? (job.salary_min || job.salary_max || '') : '',
        });
      } catch (error) {
        console.error('Erro ao carregar vaga:', error);
        // Fallback para localStorage
        const jobs = JSON.parse(localStorage.getItem('curriculoja_jobs') || '[]');
        const jobToEdit = jobs.find(j => j.id === id);
        if (jobToEdit) {
          setFormData({
            title: '',
            description: '',
            requirements: '',
            location: '',
            salary: '',
            type: 'CLT',
            benefits: '',
            category: 'Tecnologia',
            firstJob: false,
            modality: 'Presencial',
            shift: 'Integral',
            ...jobToEdit
          });
        } else {
          toast({
            title: 'Erro',
            description: 'Vaga não encontrada.',
            variant: 'destructive',
          });
          navigate('/my-jobs');
        }
      }
    };

    loadJob();
  }, [id, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Mapear campos do frontend para backend
      const jobData = {
        title: formData.title,
        description: formData.description,
        requirements: formData.requirements,
        benefits: formData.benefits,
        salary_min: (salaryMode === 'fixed') ? (formData.salary_fixed || null) : (formData.salary_min || null),
        salary_max: (salaryMode === 'fixed') ? (formData.salary_fixed || null) : (formData.salary_max || null),
        location: formData.location,
        work_type: formData.work_type,
        contract_type: formData.contract_type,
        experience_level: formData.experience_level || 'junior',
        is_first_job: formData.is_first_job || false,
        // Garantir que área/subárea sejam preservadas no update (chaves internas)
        ...(formData.area ? { area: formData.area } : {}),
        ...(formData.subarea ? { subarea: formData.subarea } : {})
      };
      
      await jobsAPI.update(id, jobData);

      toast({
        title: 'Vaga atualizada com sucesso!',
        description: 'As alterações na vaga foram salvas.'
      });

      navigate('/my-jobs');
    } catch (error) {
      console.error('Erro ao atualizar vaga:', error);
      
      // Fallback para localStorage se API falhar
      try {
        const updatedJob = {
          ...formData,
          updatedAt: new Date().toISOString()
        };

        const jobs = JSON.parse(localStorage.getItem('curriculoja_jobs') || '[]');
        const updatedJobs = jobs.map(j => j.id === id ? updatedJob : j);
        localStorage.setItem('curriculoja_jobs', JSON.stringify(updatedJobs));

        toast({
          title: 'Vaga atualizada com sucesso!',
          description: 'As alterações na vaga foram salvas.'
        });

        navigate('/my-jobs');
      } catch (fallbackError) {
        toast({
          title: 'Erro ao atualizar vaga',
          description: 'Ocorreu um erro inesperado. Tente novamente.',
          variant: 'destructive'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  if (!formData || !user || user.id !== formData.company_id) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="p-6 text-center">
            <p>Carregando ou acesso negado.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Editar Vaga - CurrículoJá</title>
        <meta name="description" content="Edite sua vaga de emprego." />
      </Helmet>

      <div className="min-h-screen py-8 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold gradient-text mb-2">Editar Vaga</h1>
              <p className="text-gray-600">Atualize as informações da vaga</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              <Card className="card-hover">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Briefcase className="w-5 h-5 mr-2" />
                    Informações da Vaga
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="title">Título da Vaga <span className="required-star">*</span></Label>
                    <Input id="title" name="title" value={formData.title} onChange={handleChange} required />
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="category">Área/Categoria <span className="required-star">*</span></Label>
                      <Select id="category" name="category" value={formData.category} onChange={handleChange} required>
                        {jobCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                      </Select>
                    </div>
                     <div>
                        <Label htmlFor="location">Localização <span className="required-star">*</span></Label>
                        <Input id="location" name="location" value={formData.location} onChange={handleChange} required />
                      </div>
                  </div>

                  <div className="pt-2">
                    <div className="flex items-center justify-between mb-1.5">
                      <Label htmlFor="description">Descrição da Vaga <span className="required-star">*</span></Label>
                      {refsReady && descriptionRef.current?.FormatButton && descriptionRef.current.FormatButton()}
                    </div>
                    <RichTextarea ref={descriptionRef} id="description" name="description" value={formData.description} onChange={handleChange} rows={4} required />
                  </div>

                  <div className="pt-2">
                    <div className="flex items-center justify-between mb-1.5">
                      <Label htmlFor="requirements">Requisitos <span className="required-star">*</span></Label>
                      {refsReady && requirementsRef.current?.FormatButton && requirementsRef.current.FormatButton()}
                    </div>
                    <RichTextarea ref={requirementsRef} id="requirements" name="requirements" value={formData.requirements} onChange={handleChange} rows={4} required />
                     <div className="flex items-center space-x-2 mt-2">
                        <Checkbox id="is_first_job" name="is_first_job" checked={formData.is_first_job} onCheckedChange={(checked) => setFormData({...formData, is_first_job: checked})} />
                        <label htmlFor="is_first_job" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            Aceita primeiro emprego / Não exige experiência
                        </label>
                    </div>
                  </div>

                  {/* Salary mode + fields */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="salary_mode">Tipo de Salário</Label>
                      <Select id="salary_mode" name="salary_mode" value={salaryMode} onChange={(e)=> setSalaryMode(e.target.value)}>
                        <option value="range">Faixa (mínimo e máximo)</option>
                        <option value="fixed">Fixo (um valor)</option>
                      </Select>
                    </div>
                    <div className="hidden md:block" aria-hidden="true" />
                  </div>
                  {salaryMode === 'range' ? (
                    <>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="salary_min">Salário Mínimo</Label>
                          <Input id="salary_min" name="salary_min" type="number" value={formData.salary_min || ''} onChange={handleChange} placeholder="Ex: 3000" />
                        </div>
                        <div>
                          <Label htmlFor="salary_max">Salário Máximo</Label>
                          <Input id="salary_max" name="salary_max" type="number" value={formData.salary_max || ''} onChange={handleChange} placeholder="Ex: 5000" />
                        </div>
                      </div>
                      {(formData.salary_min !== '' && formData.salary_max !== '' && Number(formData.salary_min) === Number(formData.salary_max)) && (
                        <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2">
                          Os valores mínimo e máximo são iguais. Se preferir, selecione "Fixo (um valor)" acima para informar um valor único.
                          <button type="button" className="ml-2 underline text-amber-800" onClick={()=> { setSalaryMode('fixed'); setFormData(prev=>({...prev, salary_fixed: prev.salary_min || prev.salary_max || ''})); }}>Converter para fixo</button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div>
                      <Label htmlFor="salary_fixed">Salário Fixo</Label>
                      <Input id="salary_fixed" name="salary_fixed" type="number" value={formData.salary_fixed || ''} onChange={handleChange} placeholder="Ex: 4000" />
                    </div>
                  )}

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="contract_type">Tipo de Contrato <span className="required-star">*</span></Label>
                      <Select id="contract_type" name="contract_type" value={formData.contract_type || 'clt'} onChange={handleChange} required>
                        <option value="clt">CLT</option>
                        <option value="pj">PJ</option>
                        <option value="estagio">Estágio</option>
                        <option value="temporario">Temporário</option>
                        <option value="freelancer">Freelancer</option>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="category">Categoria</Label>
                      <Select id="category" name="category" value={formData.category || 'Tecnologia'} onChange={handleChange}>
                        {jobCategories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </Select>
                    </div>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="work_type">Modalidade <span className="required-star">*</span></Label>
                        <Select id="work_type" name="work_type" value={formData.work_type || 'presencial'} onChange={handleChange} required>
                            <option value="presencial">Presencial</option>
                            <option value="hibrido">Híbrido</option>
                            <option value="remoto">Remoto</option>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="experience_level">Nível de Experiência <span className="required-star">*</span></Label>
                        <Select id="experience_level" name="experience_level" value={formData.experience_level || 'junior'} onChange={handleChange} required>
                            <option value="estagio">Estágio</option>
                            <option value="junior">Júnior</option>
                            <option value="pleno">Pleno</option>
                            <option value="senior">Sênior</option>
                        </Select>
                      </div>
                  </div>

                  <div className="pt-2">
                    <div className="flex items-center justify-between mb-1.5">
                      <Label htmlFor="benefits">Benefícios (opcional)</Label>
                      {refsReady && benefitsRef.current?.FormatButton && benefitsRef.current.FormatButton()}
                    </div>
                    <RichTextarea ref={benefitsRef} id="benefits" name="benefits" value={formData.benefits} onChange={handleChange} rows={3} className="resize-y" placeholder="Ex: Vale refeição, plano de saúde..." />
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-center">
                <Button type="submit" className="btn-primary text-white px-8 py-3" disabled={loading}>
                  {loading ? 'Salvando...' : <><Save className="w-4 h-4 mr-2" /> Salvar Alterações</>}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      </div>
    </>
  );
};

export default EditJob;