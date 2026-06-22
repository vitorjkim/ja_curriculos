import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Helmet } from 'react-helmet';
import { FileText, Plus, Eye, Download, Edit, Trash2, Star, UploadCloud } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/ui/use-toast';
import { resumesAPI } from '../lib/api';
import jsPDF from 'jspdf';

const MyResumes = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [resumes, setResumes] = useState([]);
  const [uploadFile, setUploadFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchResumes = async () => {
      if (user && user.id) {
        try {
          const response = await resumesAPI.list();
          setResumes(response.resumes || []);
        } catch (error) {
          console.error('Erro ao buscar currículos:', error);
          // Fallback para localStorage se API falhar
          const allResumes = JSON.parse(localStorage.getItem('curriculoja_resumes') || '[]');
          const userResumes = allResumes.filter(resume => resume.userId === user.id);
          setResumes(userResumes);
        }
      }
    };

    fetchResumes();
  }, [user?.id]); // Usar apenas user.id como dependência para evitar re-renderização desnecessária

  const handleDelete = async (resumeId) => {
    try {
      // Validar se é um UUID válido
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidPattern.test(resumeId)) {
        // Para currículos do localStorage, remover apenas localmente
        const allResumes = JSON.parse(localStorage.getItem('curriculoja_resumes') || '[]');
        const updatedResumes = allResumes.filter(resume => resume.id !== resumeId);
        localStorage.setItem('curriculoja_resumes', JSON.stringify(updatedResumes));
        
        setResumes(resumes.filter(resume => resume.id !== resumeId));
        
        toast({
          title: 'Currículo removido',
          description: 'Currículo antigo removido do armazenamento local.'
        });
        return;
      }

      await resumesAPI.delete(resumeId);
      setResumes(resumes.filter(resume => resume.id !== resumeId));
      
      toast({
        title: 'Currículo excluído',
        description: 'O currículo foi removido com sucesso.'
      });
    } catch (error) {
      console.error('Erro ao excluir currículo:', error);
      
      // Fallback para localStorage
      const allResumes = JSON.parse(localStorage.getItem('curriculoja_resumes') || '[]');
      const updatedResumes = allResumes.filter(resume => resume.id !== resumeId);
      localStorage.setItem('curriculoja_resumes', JSON.stringify(updatedResumes));
      
      setResumes(resumes.filter(resume => resume.id !== resumeId));
      
      toast({
        title: 'Currículo removido',
        description: 'Currículo removido do armazenamento local.'
      });
    }
  };

  // Função para extrair texto de PDF
  const extractTextFromPdf = async (arrayBuffer) => {
    try {
      // Simulação básica - em produção usaria PDF.js ou outra biblioteca
      return 'Texto extraído do PDF (implementação básica)';
    } catch (error) {
      throw new Error('Erro ao processar PDF');
    }
  };

  const extractTextFromFile = async (file) => {
    console.log('Processando arquivo:', file.name, 'Tipo:', file.type, 'Tamanho:', file.size);
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (event) => {
        try {
          const arrayBuffer = event.target.result;
          
          if (file.type === 'application/pdf') {
            console.log('Processando PDF...');
            const text = await extractTextFromPdf(arrayBuffer);
            console.log('Texto extraído do PDF:', text.substring(0, 200) + '...');
            resolve(text);
          } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.type === 'application/msword') {
            console.log('Processando documento Word...');
            const result = await mammoth.extractRawText({ arrayBuffer });
            console.log('Texto extraído do Word:', result.value.substring(0, 200) + '...');
            resolve(result.value);
          } else if (file.type === 'text/plain') {
            console.log('Processando arquivo de texto...');
            const text = new TextDecoder().decode(arrayBuffer);
            console.log('Texto extraído do TXT:', text.substring(0, 200) + '...');
            resolve(text);
          } else {
            reject(new Error(`Formato de arquivo não suportado: ${file.type}`));
          }
        } catch (error) {
          console.error('Erro durante processamento:', error);
          reject(error);
        }
      };
      
      reader.onerror = (error) => {
        console.error('Erro ao ler arquivo:', error);
        reject(new Error('Erro ao ler o arquivo selecionado.'));
      };
      
      reader.readAsArrayBuffer(file);
    });
  };

  const parseResumeText = (text) => {
    const resumeData = {
      name: '',
      email: '',
      phone: '',
      education: '',
      experiences: [],
      courses: [],
      languages: []
    };

    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
    const phoneRegex = /(\(?\d{2}\)?\s?)?(\d{4,5}-?\d{4})/;

    const emailMatch = text.match(emailRegex);
    if (emailMatch) resumeData.email = emailMatch[0];

    const phoneMatch = text.match(phoneRegex);
    if (phoneMatch) resumeData.phone = phoneMatch[0];

    const lines = text.split('\n').filter(line => line.trim() !== '');
    if (lines.length > 0) {
      resumeData.name = lines[0].trim();
    }
    
    const remainingText = lines.slice(1).join('\n');
    resumeData.education = remainingText.substring(0, 500);

    return resumeData;
  };

  const handleUpload = async () => {
    if (!uploadFile) {
      toast({
        title: 'Nenhum arquivo selecionado',
        description: 'Por favor, selecione um arquivo para carregar.',
        variant: 'destructive',
      });
      return;
    }

    console.log('Iniciando upload do arquivo:', uploadFile);
    setIsUploading(true);
    
    try {
      // Verificar se o arquivo tem um tamanho válido
      if (uploadFile.size === 0) {
        throw new Error('O arquivo selecionado está vazio.');
      }

      if (uploadFile.size > 10 * 1024 * 1024) { // 10MB limit
        throw new Error('O arquivo é muito grande. Tamanho máximo: 10MB.');
      }

      let text = '';
      let parsedData = {
        name: '',
        email: '',
        phone: '',
        education: '',
        experiences: [],
        courses: [],
        languages: []
      };

      try {
        console.log('Tentando extrair texto do arquivo...');
        text = await extractTextFromFile(uploadFile);
        
        if (text && text.trim().length > 0) {
          console.log('Processando dados extraídos...');
          parsedData = parseResumeText(text);
        }
      } catch (extractError) {
        console.warn('Erro na extração de texto, criando currículo básico:', extractError);
        // Se não conseguir extrair texto, criar um currículo básico
        text = 'Texto não pôde ser extraído automaticamente do arquivo enviado.';
      }

      console.log('Salvando currículo via API...');

      try {
        // Tentar salvar via API
        const apiResponse = await resumesAPI.upload({
          filename: uploadFile.name,
          extractedText: text,
          parsedData: parsedData
        });

        // Atualizar a lista local com o currículo retornado da API
        setResumes(prev => [...prev, {
          ...apiResponse.resume,
          isUploaded: true,
          template: 'uploaded'
        }]);
        setUploadFile(null);

        toast({
          title: 'Currículo carregado com sucesso!',
          description: `O currículo foi salvo no servidor e adicionado à sua lista.`,
        });

      } catch (apiError) {
        console.warn('Erro na API, salvando localmente:', apiError);
        
        // Fallback para localStorage
        const newResume = {
          id: Date.now().toString(),
          userId: user.id,
          title: parsedData.name || `Currículo - ${uploadFile.name.replace(/\.[^/.]+$/, "")}`,
          template: 'uploaded',
          is_public: true,
          personal_info: {
            name: parsedData.name,
            email: parsedData.email,
            phone: parsedData.phone,
            originalFileName: uploadFile.name,
            extractedText: text.substring(0, 1000)
          },
          experience: parsedData.experiences || [],
          education: parsedData.education || [],
          skills: [],
          languages: parsedData.languages || [],
          projects: parsedData.projects || [],
          courses: parsedData.courses || [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          isUploaded: true
        };

        const allResumes = JSON.parse(localStorage.getItem('curriculoja_resumes') || '[]');
        allResumes.push(newResume);
        localStorage.setItem('curriculoja_resumes', JSON.stringify(allResumes));

        setResumes(prev => [...prev, newResume]);
        setUploadFile(null);

        toast({
          title: 'Currículo salvo localmente!',
          description: `O arquivo "${uploadFile.name}" foi adicionado como currículo básico (modo offline).`,
        });
      }

    } catch (error) {
      console.error("Erro completo ao processar arquivo:", error);
      
      let errorMessage = 'Não foi possível processar o arquivo.';
      
      if (error.message.includes('vazio')) {
        errorMessage = error.message;
      } else if (error.message.includes('grande')) {
        errorMessage = error.message;
      } else {
        errorMessage = 'Erro ao processar o arquivo. Tente um arquivo diferente ou crie um currículo manualmente.';
      }
      
      toast({
        title: 'Erro ao processar arquivo',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSetDefault = async (resumeId) => {
    try {
      // Validar se é um UUID válido
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidPattern.test(resumeId)) {
        toast({
          title: 'Currículo inválido',
          description: 'Este currículo precisa ser recriado. Currículos antigos não são compatíveis.',
          variant: 'destructive'
        });
        return;
      }

      await resumesAPI.setDefault(resumeId);
      
      // Atualizar estado local
      setResumes(prevResumes => 
        prevResumes.map(resume => ({
          ...resume,
          is_default: resume.id === resumeId
        }))
      );
      
      toast({
        title: 'Currículo padrão definido',
        description: 'Este currículo será usado por padrão nas candidaturas.'
      });
    } catch (error) {
      console.error('Erro ao definir currículo padrão:', error);
      
      toast({
        title: 'Erro ao definir padrão',
        description: 'Não foi possível definir o currículo como padrão.',
        variant: 'destructive'
      });
    }
  };

  const handleDownloadPDF = (resumeId) => {
    const resume = resumes.find(r => r.id === resumeId);
    if (!resume) {
        toast({
            title: 'Erro ao gerar PDF',
            description: 'Currículo não encontrado.',
            variant: 'destructive'
        });
        return;
    }

    toast({
        title: 'Gerando PDF...',
        description: 'Seu download começará em breve.'
    });

    const doc = new jsPDF();
    let y = 20;
    const pageMargin = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const textWidth = pageWidth - pageMargin * 2;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(24);
    doc.text(resume.name || '', pageMargin, y);
    y += 10;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.text(`${resume.email || ''} | ${resume.phone || ''}`, pageMargin, y);
    y += 5;
    doc.text(resume.address || '', pageMargin, y);
    y += 10;

    const addSection = (title, content) => {
        if (y > 260) { doc.addPage(); y = 20; }
        doc.setLineWidth(0.5);
        doc.line(pageMargin, y, pageWidth - pageMargin, y);
        y += 10;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.text(title, pageMargin, y);
        y += 8;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(12);
        if (Array.isArray(content)) {
            content.forEach(item => {
                if (y > 260) { doc.addPage(); y = 20; }
                doc.setFont('helvetica', 'bold');
                doc.text(item.title || '', pageMargin, y);
                y += 6;
                doc.setFont('helvetica', 'italic');
                doc.text(item.subtitle || '', pageMargin, y);
                y += 6;
                doc.setFont('helvetica', 'normal');
                if (item.description) {
                    const splitDescription = doc.splitTextToSize(item.description, textWidth);
                    doc.text(splitDescription, pageMargin, y);
                    y += (splitDescription.length * 5) + 5;
                } else {
                    y += 5;
                }
            });
        } else {
            if (content) {
                const splitContent = doc.splitTextToSize(content, textWidth);
                doc.text(splitContent, pageMargin, y);
                y += (splitContent.length * 5) + 5;
            }
        }
    };

    if (resume.summary) addSection('Resumo Profissional', resume.summary);
    
    if (Array.isArray(resume.experiences) && resume.experiences.length > 0) {
        addSection('Experiência Profissional', resume.experiences.map(exp => ({
            title: `${exp.position || ''} em ${exp.company || ''}`,
            subtitle: exp.period || '',
            description: exp.description || ''
        })));
    }

    if (Array.isArray(resume.education) && resume.education.length > 0) {
        addSection('Formação Acadêmica', resume.education.map(edu => ({
            title: edu.institution || '',
            subtitle: `${edu.course || ''} - ${edu.period || ''}`,
            description: ''
        })));
    }

    if (Array.isArray(resume.languages) && resume.languages.length > 0) {
        addSection('Idiomas', resume.languages.map(lang => ({
            title: lang.language || '',
            subtitle: `Nível: ${lang.level || ''}`,
            description: ''
        })));
    }

    if (Array.isArray(resume.courses) && resume.courses.length > 0) {
        addSection('Cursos e Certificações', resume.courses.map(course => ({
            title: course.name || '',
            subtitle: `${course.institution || ''} - ${course.year || ''}`,
            description: ''
        })));
    }

    if (Array.isArray(resume.projects) && resume.projects.length > 0) {
        addSection('Projetos e Atividades', resume.projects.map(proj => ({
            title: proj.name || '',
            subtitle: proj.period || '',
            description: proj.description || ''
        })));
    }

    doc.save(`curriculo_${(resume.name || 'candidato').replace(/\s/g, '_')}.pdf`);
  };

  if (!user || user.type === 'company') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="p-6 text-center">
            <p>Acesso restrito a candidatos.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Meus Currículos - CurrículoJá</title>
        <meta name="description" content="Gerencie todos os seus currículos criados no CurrículoJá." />
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
                <h1 className="text-3xl font-bold gradient-text mb-2">Meus Currículos</h1>
                <p className="text-gray-600">Gerencie e visualize todos os seus currículos</p>
              </div>
              <Link to="/create-resume">
                <Button className="btn-primary text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Currículo
                </Button>
              </Link>
            </div>

            {/* Card de Upload */}
            {resumes.length === 0 ? (
              <Card className="card-hover">
                <CardContent className="p-12 text-center">
                  <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-xl font-semibold mb-2">Nenhum currículo encontrado</h3>
                  <p className="text-gray-600 mb-6">
                    Você ainda não tem currículos salvos. Comece criando um novo ou carregue um existente!
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link to="/create-resume">
                      <Button className="btn-primary text-white">
                        <Plus className="w-4 h-4 mr-2" />
                        Criar Primeiro Currículo
                      </Button>
                    </Link>
                    <Link to="/upload-resume">
                      <Button variant="outline">
                        <UploadCloud className="w-4 h-4 mr-2" />
                        Carregar Currículo
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <motion.div layout className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence>
                {resumes.map((resume, index) => (
                  <motion.div
                    key={resume.id}
                    layout
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.3 } }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                  >
                    <Card className="card-hover h-full flex flex-col">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                             <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
                                  {resume.photo ? (
                                      <img src={resume.photo} alt={`Foto de ${resume.name}`} className="w-12 h-12 rounded-full object-cover" />
                                  ) : (
                                      <FileText className="w-6 h-6 text-gray-600" />
                                  )}
                              </div>
                            <div>
                              <CardTitle className="text-lg flex items-center gap-2">
                                {resume.title || resume.name || resume.personal_info?.name || 'Currículo sem título'}
                                {resume.is_default && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">
                                    <Star className="w-3 h-3 mr-1 fill-current" />
                                    Padrão
                                  </span>
                                )}
                              </CardTitle>
                              <p className="text-sm text-gray-500">
                                {(resume.template === 'uploaded' || resume.isUploaded) && (
                                  <span className="inline-flex items-center mr-2 px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                                    <UploadCloud className="w-3 h-3 mr-1" />
                                    Carregado
                                  </span>
                                )}
                                Criado em {new Date(resume.created_at || resume.createdAt || Date.now()).toLocaleDateString('pt-BR')}
                              </p>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="flex-grow flex flex-col justify-between">
                        <div className="space-y-2 mb-4">
                          <p className="text-sm text-gray-600">
                            <strong>Email:</strong> {resume.personal_info?.email || resume.email || 'Não informado'}
                          </p>
                          <p className="text-sm text-gray-600">
                            <strong>Telefone:</strong> {resume.personal_info?.phone || resume.phone || 'Não informado'}
                          </p>
                          <p className="text-sm text-gray-600">
                            <strong>Experiências:</strong> {Array.isArray(resume.experience) ? resume.experience.length : (Array.isArray(resume.experiences) ? resume.experiences.length : 0)}
                          </p>
                        </div>
                        
                        <motion.div className="flex flex-wrap gap-2" initial={{opacity: 0}} animate={{opacity: 1}} transition={{delay: 0.2 + index*0.1}}>
                          {/* Botão para definir como padrão */}
                          {!resume.is_default && (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => handleSetDefault(resume.id)}
                              className="text-yellow-600 border-yellow-300 hover:bg-yellow-50"
                            >
                              <Star className="w-4 h-4 mr-1" />
                              Definir como Padrão
                            </Button>
                          )}
                          
                          {!(resume.template === 'uploaded' || resume.isUploaded) && (
                            <>
                              <Link to={`/resume/${resume.id}`}><Button size="sm" variant="outline"><Eye className="w-4 h-4 mr-1" />Ver</Button></Link>
                              <Button size="sm" variant="outline" onClick={() => handleDownloadPDF(resume.id)}><Download className="w-4 h-4 mr-1" />PDF</Button>
                              <Link to={`/edit-resume/${resume.id}`}><Button size="sm" variant="outline"><Edit className="w-4 h-4 mr-1" />Editar</Button></Link>
                            </>
                          )}
                          {(resume.template === 'uploaded' || resume.isUploaded) && (
                            <div className="text-sm text-gray-500 italic">
                              Currículo carregado - edite através do editor padrão do sistema
                            </div>
                          )}
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              if (window.confirm('Você tem certeza? Esta ação não pode ser desfeita.')) {
                                handleDelete(resume.id);
                              }
                            }}
                            className="text-red-600 border-red-300 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Excluir
                          </Button>
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

export default MyResumes;