import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { useToast } from '../components/ui/use-toast';
import { useAuth } from '../contexts/AuthContext';
import { resumesAPI } from '../lib/api';
import { 
  Eye, 
  Edit, 
  Trash2, 
  Star, 
  StarIcon, 
  Plus, 
  Download,
  Globe,
  Lock
} from 'lucide-react';
import jsPDF from 'jspdf';

const MyResumes = () => {
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  // Função para buscar currículos
  const fetchResumes = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      
      // Buscar currículos da API
      let apiResumes = [];
      try {
        apiResumes = await resumesAPI.getAll();
      } catch (apiError) {
        console.warn('Erro ao buscar currículos da API:', apiError);
      }

      // Buscar currículos do localStorage
      const localResumes = JSON.parse(localStorage.getItem('curriculoja_resumes') || '[]')
        .filter(resume => resume.userId === user.id);

      // Combinar e remover duplicatas
      const allResumes = [...apiResumes];
      localResumes.forEach(localResume => {
        if (!allResumes.find(apiResume => apiResume.id === localResume.id)) {
          allResumes.push(localResume);
        }
      });

      setResumes(allResumes);
    } catch (error) {
      console.error('Erro ao buscar currículos:', error);
      
      // Fallback para localStorage
      const localResumes = JSON.parse(localStorage.getItem('curriculoja_resumes') || '[]')
        .filter(resume => resume.userId === user.id);
      setResumes(localResumes);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResumes();
  }, [user?.id]);

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
        description: 'Este currículo será usado por padrão nas suas candidaturas.'
      });
    } catch (error) {
      console.error('Erro ao definir currículo padrão:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível definir este currículo como padrão.',
        variant: 'destructive'
      });
    }
  };

  // Função para exportar PDF
  const generatePDF = (resume) => {
    const doc = new jsPDF();
    
    // Configurações
    const margin = 20;
    let yPosition = margin;
    const lineHeight = 10;
    
    // Título
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text(resume.personal_info?.name || 'Currículo', margin, yPosition);
    yPosition += lineHeight * 2;
    
    // Informações pessoais
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    if (resume.personal_info?.email) {
      doc.text(`Email: ${resume.personal_info.email}`, margin, yPosition);
      yPosition += lineHeight;
    }
    if (resume.personal_info?.phone) {
      doc.text(`Telefone: ${resume.personal_info.phone}`, margin, yPosition);
      yPosition += lineHeight;
    }
    if (resume.personal_info?.address) {
      doc.text(`Endereço: ${resume.personal_info.address}`, margin, yPosition);
      yPosition += lineHeight;
    }
    
    yPosition += lineHeight;
    
    // Experiência
    if (resume.experience && resume.experience.length > 0) {
      doc.setFont("helvetica", "bold");
      doc.text("EXPERIÊNCIA PROFISSIONAL", margin, yPosition);
      yPosition += lineHeight;
      
      doc.setFont("helvetica", "normal");
      resume.experience.forEach(exp => {
        if (yPosition > 270) {
          doc.addPage();
          yPosition = margin;
        }
        
        doc.text(`• ${exp.position} - ${exp.company}`, margin + 5, yPosition);
        yPosition += lineHeight;
        if (exp.period) {
          doc.text(`  ${exp.period}`, margin + 5, yPosition);
          yPosition += lineHeight;
        }
        if (exp.description) {
          const words = exp.description.split(' ');
          let line = '';
          words.forEach(word => {
            if ((line + word).length > 60) {
              doc.text(`  ${line}`, margin + 5, yPosition);
              yPosition += lineHeight;
              line = word + ' ';
            } else {
              line += word + ' ';
            }
          });
          if (line.trim()) {
            doc.text(`  ${line}`, margin + 5, yPosition);
            yPosition += lineHeight;
          }
        }
        yPosition += 3;
      });
    }
    
    yPosition += lineHeight;
    
    // Educação
    if (resume.education && resume.education.length > 0) {
      if (yPosition > 250) {
        doc.addPage();
        yPosition = margin;
      }
      
      doc.setFont("helvetica", "bold");
      doc.text("EDUCAÇÃO", margin, yPosition);
      yPosition += lineHeight;
      
      doc.setFont("helvetica", "normal");
      resume.education.forEach(edu => {
        if (yPosition > 270) {
          doc.addPage();
          yPosition = margin;
        }
        
        doc.text(`• ${edu.degree || edu.course} - ${edu.institution}`, margin + 5, yPosition);
        yPosition += lineHeight;
        if (edu.period || edu.year) {
          doc.text(`  ${edu.period || edu.year}`, margin + 5, yPosition);
          yPosition += lineHeight;
        }
        yPosition += 3;
      });
    }
    
    // Habilidades
    if (resume.skills && resume.skills.length > 0) {
      yPosition += lineHeight;
      if (yPosition > 250) {
        doc.addPage();
        yPosition = margin;
      }
      
      doc.setFont("helvetica", "bold");
      doc.text("HABILIDADES", margin, yPosition);
      yPosition += lineHeight;
      
      doc.setFont("helvetica", "normal");
      const skillsText = resume.skills.map(skill => skill.name || skill).join(', ');
      const words = skillsText.split(' ');
      let line = '';
      words.forEach(word => {
        if ((line + word).length > 60) {
          doc.text(line, margin + 5, yPosition);
          yPosition += lineHeight;
          line = word + ' ';
        } else {
          line += word + ' ';
        }
      });
      if (line.trim()) {
        doc.text(line, margin + 5, yPosition);
      }
    }
    
    // Salvar o PDF
    const fileName = `${resume.personal_info?.name || 'curriculo'}_${new Date().getTime()}.pdf`;
    doc.save(fileName);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Carregando currículos...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Meus Currículos</h1>
          <p className="text-gray-600 mb-6">
            Gerencie seus currículos e escolha qual usar em suas candidaturas
          </p>
          
          <div className="flex gap-4">
            <Button asChild>
              <Link to="/create-resume" className="flex items-center gap-2">
                <Plus size={20} />
                Criar Novo Currículo
              </Link>
            </Button>
          </div>
        </div>

        {resumes.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <div className="mb-4">
                <div className="w-24 h-24 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
                  <Eye size={32} className="text-gray-400" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Nenhum currículo encontrado
              </h3>
              <p className="text-gray-600 mb-6">
                Comece criando seu primeiro currículo
              </p>
              <Button asChild>
                <Link to="/create-resume">
                  Criar Meu Primeiro Currículo
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {resumes.map((resume) => (
              <Card key={resume.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-2 flex items-center gap-2">
                        {resume.title}
                        {resume.is_default && (
                          <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">
                            Padrão
                          </span>
                        )}
                      </CardTitle>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        {resume.is_public ? (
                          <><Globe size={16} /> Público</>
                        ) : (
                          <><Lock size={16} /> Privado</>
                        )}
                      </div>
                    </div>
                    {!resume.is_default && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSetDefault(resume.id)}
                        className="text-yellow-600 hover:text-yellow-700"
                      >
                        <Star size={16} />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-sm text-gray-600">
                      <p>Criado em: {new Date(resume.created_at).toLocaleDateString('pt-BR')}</p>
                      {resume.updated_at !== resume.created_at && (
                        <p>Atualizado em: {new Date(resume.updated_at).toLocaleDateString('pt-BR')}</p>
                      )}
                    </div>
                    
                    <div className="flex gap-2 flex-wrap">
                      <Button variant="outline" size="sm" asChild>
                        <Link to={`/view-resume/${resume.id}`}>
                          <Eye size={16} className="mr-1" />
                          Visualizar
                        </Link>
                      </Button>
                      
                      <Button variant="outline" size="sm" asChild>
                        <Link to={`/edit-resume/${resume.id}`}>
                          <Edit size={16} className="mr-1" />
                          Editar
                        </Link>
                      </Button>
                      
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => generatePDF(resume)}
                      >
                        <Download size={16} className="mr-1" />
                        PDF
                      </Button>
                      
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleDelete(resume.id)}
                        className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
                      >
                        <Trash2 size={16} className="mr-1" />
                        Excluir
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyResumes;
