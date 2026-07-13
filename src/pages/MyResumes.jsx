import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { useToast } from '../components/ui/use-toast';
import { useAuth } from '../contexts/AuthContext';
import { resumesAPI } from '../lib/api';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { 
  Eye, 
  Edit, 
  Trash2, 
  Plus, 
  Download,
  Globe,
  Lock,
  FileText,
  Calendar,
  Palette
} from 'lucide-react';

const MyResumes = () => {
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedScoreId, setExpandedScoreId] = useState(null);
  const [analyzingResumes, setAnalyzingResumes] = useState(new Set()); // Rastrear quais estão sendo analisados
  const [reloadingScore, setReloadingScore] = useState(null); // Qual está sendo recarregado
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  console.log('🔄 MyResumes - Renderizando componente, resumes.length:', resumes.length);

  // Função para buscar currículos
  const fetchResumes = async () => {
    if (!user?.id) return;
    
    // Se for empresa, não deveria ter currículos próprios
    if (user?.type === 'company') {
      setResumes([]);
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      
      // Buscar currículos da API
      let apiResumes = [];
      try {
        const apiResponse = await resumesAPI.list();
        console.log('📡 API Response:', apiResponse);
        // A API retorna { success: true, resumes: [...] }
        apiResumes = apiResponse.resumes || apiResponse;
        console.log('✅ API currículos:', apiResumes.length);
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

  // Polling para currículos sem score (análise em andamento)
  useEffect(() => {
    if (!user?.id || resumes.length === 0) return;
    
    const pendingResumes = resumes.filter(r => !r.ai_analysis_score && r.ai_analysis_score !== 0);
    if (pendingResumes.length === 0) return;
    
    console.log(`⏳ Polling ${pendingResumes.length} currículos sem score...`);
    setAnalyzingResumes(new Set(pendingResumes.map(r => r.id)));
    
    const pollInterval = setInterval(() => {
      fetchResumes();
    }, 5000); // Verifica a cada 5 segundos
    
    return () => clearInterval(pollInterval);
  }, [user?.id, resumes]);

  // Função para recarregar o score de um currículo
  const reloadResumeScore = async (resumeId) => {
    try {
      setReloadingScore(resumeId);
      
      // Disparar evento de início de requisição de IA
      window.dispatchEvent(new Event('ai-request-start'));
      
      const response = await resumesAPI.analyze(resumeId);
      console.log('✅ Score recarregado:', response);
      
      // Atualizar o currículo na lista
      setResumes(prevResumes => prevResumes.map(r => 
        r.id === resumeId ? { ...r, ...response.analysis, ai_analysis_score: response.score } : r
      ));
      
      toast({
        title: 'Score atualizado!',
        description: `Novo score: ${response.score}/100`
      });
    } catch (error) {
      console.error('Erro ao recarregar score:', error);
      toast({
        title: 'Erro ao recarregar score',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setReloadingScore(null);
      
      // Disparar evento de fim de requisição de IA
      window.dispatchEvent(new Event('ai-request-end'));
    }
  };

  useEffect(() => {
    // Forçar carregamento após 3 segundos se ainda estiver na autenticação
    const forceLoadTimeout = setTimeout(() => {
      if (authLoading || loading) {
        setLoading(false);
      }
    }, 3000);
    
    // Se ainda está carregando a autenticação, aguardar
    if (authLoading) {
      return () => clearTimeout(forceLoadTimeout);
    }
    
    clearTimeout(forceLoadTimeout);
    
    if (user?.id) {
      fetchResumes();
    } else {
      setLoading(false);
    }
    
    return () => clearTimeout(forceLoadTimeout);
  }, [user?.id, authLoading]);

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

  // ...existing code...

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
    if (resume.education) {
      if (yPosition > 250) {
        doc.addPage();
        yPosition = margin;
      }
      
      doc.setFont("helvetica", "bold");
      doc.text("EDUCAÇÃO", margin, yPosition);
      yPosition += lineHeight;
      
      doc.setFont("helvetica", "normal");
      
      // Se education é uma string, tratar como texto simples
      if (typeof resume.education === 'string') {
        doc.text(`• ${resume.education}`, margin + 5, yPosition);
        yPosition += lineHeight + 3;
      } 
      // Se education é um array, iterar pelos itens
      else if (Array.isArray(resume.education) && resume.education.length > 0) {
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

  // Função para baixar currículo na versão bonita (como na página de visualização)
  const downloadBeautifulPDF = async (resume) => {
    try {
      toast({
        title: 'Redirecionando...',
        description: 'Abrindo página de visualização para download.'
      });

      // Redirecionar para a página de visualização onde o usuário pode baixar o PDF bonito
      window.open(`/resume/${resume.id}`, '_blank');
      
    } catch (error) {
      console.error('Erro ao abrir página de visualização:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível abrir a página de visualização.'
      });
    }
  };

  // Função para baixar arquivo original do servidor (requer autenticação)
  const downloadResumeFile = async (resume) => {
    try {
      const token = localStorage.getItem('curriculoja_token');
      if (!token) {
        toast({ title: 'Não autenticado', description: 'Faça login para baixar o arquivo.' });
        return;
      }

      const response = await fetch(`/api/resumes/${resume.id}/download`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorJson = await response.json().catch(() => ({}));
        toast({ title: 'Erro', description: errorJson.error || 'Não foi possível baixar o arquivo.' });
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const personalInfo = typeof resume.personal_info === 'string' ? JSON.parse(resume.personal_info) : resume.personal_info;
      const originalFileName = personalInfo?.originalFileName || `curriculo_${resume.id}.pdf`;
      a.download = originalFileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erro ao baixar arquivo:', error);
      toast({ title: 'Erro', description: 'Não foi possível baixar o arquivo.' });
    }
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
    <div className="min-h-screen bg-slate-50/80 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header Principal */}
        <div className="bg-blue-600 rounded-[20px] p-6 md:p-8 mb-8 shadow-[0_12px_35px_rgba(37,99,235,0.2)]">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">
                  Meus Currículos
                </h1>
                <p className="text-blue-100 text-sm mt-0.5">
                  Gerencie seus currículos e escolha qual usar em suas candidaturas
                </p>
              </div>
            </div>
            
            <Button 
              asChild 
              className="bg-white text-blue-600 hover:bg-blue-50 shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl px-5 py-2.5 font-semibold"
            >
              <Link to="/create-resume" className="flex items-center gap-2">
                <Plus size={18} />
                Criar Novo Currículo
              </Link>
            </Button>
          </div>
        </div>

        {resumes.length === 0 ? (
          <div className="flex justify-center">
            <Card className="max-w-md w-full rounded-[20px] shadow-lg border-0 bg-white">
              <CardContent className="text-center py-16 px-8">
                <div className="mb-6">
                  <div className="w-20 h-20 mx-auto bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center shadow-inner">
                    <FileText size={36} className="text-blue-600" />
                  </div>
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-3">
                  Nenhum currículo encontrado
                </h3>
                <p className="text-slate-500 mb-8">
                  Comece criando seu primeiro currículo profissional
                </p>
                <Button 
                  asChild 
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl px-8 py-3"
                >
                  <Link to="/create-resume" className="flex items-center gap-2">
                    <Plus size={20} />
                    Criar Meu Primeiro Currículo
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {resumes.map((resume) => {
              const isUploaded = resume?.template === 'uploaded' || resume?.original_file_path;
              const templateMap = {
                'default':'Modelo Padrão',
                'padrao':'Modelo Padrão',
                'moderno':'Modelo Moderno',
                'modern':'Modelo Moderno',
                'classico':'Modelo Clássico',
                'classic':'Modelo Clássico',
                'minimalista':'Modelo Minimalista',
                'minimal':'Modelo Minimalista',
                'professional':'Modelo Profissional',
                'profissional':'Modelo Profissional'
              };
              const templateLabel = !isUploaded ? (templateMap[resume.template] || 'Modelo Padrão') : null;
              return (
                <Card key={resume.id} className="hover:shadow-xl hover:-translate-y-1 hover:border-blue-400 transition-all duration-300 rounded-[20px] border-2 border-slate-200 bg-white group overflow-hidden relative">
                  {/* Botões Editar + Excluir no canto superior direito */}
                  <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
                    {!isUploaded && (
                      <Link
                        to={`/edit-resume/${resume.id}`}
                        className="w-8 h-8 rounded-full border-2 border-blue-200 bg-white text-blue-500 hover:border-blue-400 hover:bg-blue-500 hover:text-white shadow-sm hover:shadow-md transition-all duration-300 flex items-center justify-center"
                        title="Editar currículo"
                      >
                        <Edit size={14} />
                      </Link>
                    )}
                    <button
                      onClick={() => handleDelete(resume.id)}
                      className="w-8 h-8 rounded-full border-2 border-red-200 bg-white text-red-500 hover:border-red-400 hover:bg-red-500 hover:text-white shadow-sm hover:shadow-md transition-all duration-300 flex items-center justify-center"
                      title="Excluir"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <CardContent className="p-5">
                    {/* Header do Card */}
                    <div className="flex items-start justify-between gap-3 mb-4 pb-4 border-b border-slate-100">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-blue-50 border border-blue-100">
                          <FileText className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-bold text-base truncate text-slate-800">
                            {resume.title}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            {resume.is_public ? (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
                                <Globe size={12} /> Público
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500">
                                <Lock size={12} /> Privado
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {resume.is_default && (
                        <span className="bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm flex-shrink-0">
                          Padrão
                        </span>
                      )}
                    </div>

                    {/* Informações */}
                    <div className="space-y-2 mb-5">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar size={14} className="text-slate-400" />
                        <span className="text-slate-600">Criado em:</span>
                        <span className="font-semibold text-slate-800">{new Date(resume.created_at).toLocaleDateString('pt-BR')}</span>
                      </div>
                      {isUploaded && resume.original_file_name && (
                        <div className="flex items-center gap-2 text-sm">
                          <Download size={14} className="text-blue-500" />
                          <span className="text-slate-600">Arquivo:</span>
                          <span className="font-semibold text-blue-600 truncate">{resume.original_file_name}</span>
                        </div>
                      )}
                      {!isUploaded && templateLabel && (
                        <div className="flex items-center gap-2 text-sm">
                          <Palette size={14} className="text-indigo-500" />
                          <span className="text-slate-600">Modelo:</span>
                          <span className="font-semibold text-indigo-600">{templateLabel}</span>
                        </div>
                      )}
                      {resume.ai_analysis_score !== null && resume.ai_analysis_score !== undefined ? (
                        // Score já calculado

                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => setExpandedScoreId(expandedScoreId === resume.id ? null : resume.id)}
                            className="flex items-center gap-2 text-sm hover:opacity-80 transition-opacity text-left"
                          >
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                              resume.ai_analysis_score >= 75 ? 'bg-green-500' :
                              resume.ai_analysis_score >= 50 ? 'bg-yellow-500' :
                              'bg-red-500'
                            }`}>
                              🤖
                            </div>
                            <span className="text-slate-600">Score de IA:</span>
                            <span className={`font-bold ${
                              resume.ai_analysis_score >= 75 ? 'text-green-600' :
                              resume.ai_analysis_score >= 50 ? 'text-yellow-600' :
                              'text-red-600'
                            }`}>{resume.ai_analysis_score}/100</span>
                            <span className="text-slate-400 text-xs ml-auto">{expandedScoreId === resume.id ? '▲' : '▼'}</span>
                          </button>
                          {expandedScoreId === resume.id && (() => {
                            const analysis = typeof resume.ai_analysis === 'string' ? JSON.parse(resume.ai_analysis) : resume.ai_analysis;
                            const scores = analysis?.scores || {};
                            const metrics = [
                              { key: 'completude', label: 'Completude', icon: '📝' },
                              { key: 'qualidade', label: 'Qualidade', icon: '✨' },
                              { key: 'relevancia', label: 'Relevância', icon: '🎯' },
                              { key: 'impacto', label: 'Impacto', icon: '⚡' },
                              { key: 'geral', label: 'Geral', icon: '🏆' },
                            ];
                            return (
                              <div className="mt-1 p-3 bg-slate-50 rounded-xl border border-slate-200">
                                <p className="text-xs text-slate-500 mb-2 font-medium">Score de Qualidade</p>
                                <div className="grid grid-cols-5 gap-1 text-center">
                                  {metrics.map(({ key, label, icon }) => (
                                    <div key={key} className="flex flex-col items-center gap-0.5">
                                      <span className="text-base">{icon}</span>
                                      <span className={`text-sm font-bold ${
                                        (scores[key] ?? 0) >= 75 ? 'text-green-600' :
                                        (scores[key] ?? 0) >= 50 ? 'text-yellow-600' :
                                        'text-red-600'
                                      }`}>{scores[key] ?? 0}</span>
                                      <span className="text-[10px] text-slate-500 leading-tight">{label}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })()}
                        </div>                      ) : (
                        // Análise em andamento
                        <div className="flex flex-col gap-1.5 p-3 bg-blue-50 rounded-xl border border-blue-200">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-xs animate-spin">⏳</div>
                            <span className="text-sm font-semibold text-blue-700">Análise em andamento...</span>
                          </div>
                          <p className="text-xs text-blue-600">Estamos analisando seu currículo com IA.</p>
                          <button
                            onClick={() => reloadResumeScore(resume.id)}
                            disabled={reloadingScore === resume.id}
                            className="mt-1 text-xs font-bold text-blue-600 hover:text-blue-700 underline disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                          >
                            {reloadingScore === resume.id ? 'Recarregando...' : 'Recarregar agora'}
                          </button>
                        </div>                      )}
                    </div>

                    {/* Botões de Ação */}
                    <div className="flex gap-2">
                      {isUploaded ? (
                        <>
                          <button 
                            onClick={() => downloadResumeFile(resume)}
                            className="flex-1 flex items-center justify-center gap-1.5 rounded-full border-2 border-blue-200 bg-blue-500/5 text-xs font-bold text-blue-600 shadow-sm shadow-blue-100 hover:border-blue-400 hover:bg-blue-500 hover:text-white hover:shadow-md hover:shadow-blue-200 transition-all duration-300 h-9 px-3"
                          >
                            <Download size={14} />
                            <span>Baixar</span>
                          </button>
                        </>
                      ) : (
                        <>
                          <Link 
                            to={`/resume/${resume.id}`}
                            className="flex-1 flex items-center justify-center gap-1.5 rounded-full border-2 border-blue-200 bg-blue-500/5 text-xs font-bold text-blue-600 shadow-sm shadow-blue-100 hover:border-blue-400 hover:bg-blue-500 hover:text-white hover:shadow-md hover:shadow-blue-200 transition-all duration-300 h-9 px-3"
                          >
                            <Eye size={14} />
                            <span>Visualizar</span>
                          </Link>

                          <button
                            onClick={() => downloadBeautifulPDF(resume)}
                            className="flex-1 flex items-center justify-center gap-1.5 rounded-full border-2 border-green-200 bg-green-500/5 text-xs font-bold text-green-600 shadow-sm shadow-green-100 hover:border-green-400 hover:bg-green-500 hover:text-white hover:shadow-md hover:shadow-green-200 transition-all duration-300 h-9 px-3"
                          >
                            <Download size={14} />
                            <span>PDF</span>
                          </button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyResumes;
