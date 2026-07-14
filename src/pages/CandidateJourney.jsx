import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowRight, Check, Star, Download, Lock, Trophy, Sparkles,
  Target, Brain, FileText, Search, Users, MessageSquare, Heart,
  Award, Zap, ChevronRight, GraduationCap, Rocket, Crown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import jsPDF from 'jspdf';

// Definição das 7 etapas da jornada
const journeyStages = [
  {
    id: 0,
    title: 'Simulação de Entrevista',
    subtitle: 'Teste suas habilidades',
    description: 'Responda perguntas comuns de entrevistas e descubra seu nível de preparação.',
    icon: Target,
    color: 'indigo',
    gradientFrom: 'from-indigo-500',
    gradientTo: 'to-blue-500',
    bgLight: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
    textColor: 'text-indigo-700',
    xp: 50,
    duration: '5-10 min',
    badge: '🎯 Primeiro Passo',
    path: '/journey/stage/0'
  },
  {
    id: 1,
    title: 'Mentalidade de Primeiro Emprego',
    subtitle: 'Alinhe suas expectativas',
    description: 'O que empresas esperam de quem nunca trabalhou e como se destacar.',
    icon: Brain,
    color: 'amber',
    gradientFrom: 'from-amber-500',
    gradientTo: 'to-yellow-500',
    bgLight: 'bg-amber-50',
    borderColor: 'border-amber-200',
    textColor: 'text-amber-700',
    xp: 100,
    duration: '15-20 min',
    badge: '🧠 Mentalidade Certa',
    path: '/journey/stage/1'
  },
  {
    id: 2,
    title: 'Currículo que Contrata',
    subtitle: 'Mesmo sem experiência',
    description: 'Aprenda a criar um currículo competitivo usando projetos, cursos e soft skills.',
    icon: FileText,
    color: 'orange',
    gradientFrom: 'from-orange-500',
    gradientTo: 'to-red-500',
    bgLight: 'bg-orange-50',
    borderColor: 'border-orange-200',
    textColor: 'text-orange-700',
    xp: 150,
    duration: '20-30 min',
    badge: '📄 Currículo Pronto',
    path: '/journey/stage/2'
  },
  {
    id: 3,
    title: 'Vagas e Palavras-chave',
    subtitle: 'Candidate-se direito',
    description: 'Como ler vagas, identificar palavras-chave e adaptar seu currículo.',
    icon: Search,
    color: 'blue',
    gradientFrom: 'from-blue-500',
    gradientTo: 'to-indigo-500',
    bgLight: 'bg-blue-50',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-700',
    xp: 120,
    duration: '15-20 min',
    badge: '🔍 Candidato Estratégico',
    path: '/journey/stage/3'
  },
  {
    id: 4,
    title: 'Comportamento Profissional',
    subtitle: 'Prepare-se para o mundo real',
    description: 'Pontualidade, comunicação, postura e como falar com o RH.',
    icon: Users,
    color: 'violet',
    gradientFrom: 'from-violet-500',
    gradientTo: 'to-purple-500',
    bgLight: 'bg-violet-50',
    borderColor: 'border-violet-200',
    textColor: 'text-violet-700',
    xp: 130,
    duration: '15-20 min',
    badge: '👔 Profissional em Formação',
    path: '/journey/stage/4'
  },
  {
    id: 5,
    title: 'Entrevista de Emprego',
    subtitle: 'O ponto alto da jornada',
    description: 'Simulação completa de entrevista com feedback automático.',
    icon: MessageSquare,
    color: 'rose',
    gradientFrom: 'from-rose-500',
    gradientTo: 'to-pink-500',
    bgLight: 'bg-rose-50',
    borderColor: 'border-rose-200',
    textColor: 'text-rose-700',
    xp: 200,
    duration: '25-35 min',
    badge: '🎤 Entrevistável',
    path: '/journey/stage/5'
  },
  {
    id: 6,
    title: 'Pós-Entrevista',
    subtitle: 'O que quase ninguém ensina',
    description: 'O que fazer depois da entrevista e como lidar com o "não".',
    icon: Heart,
    color: 'cyan',
    gradientFrom: 'from-cyan-500',
    gradientTo: 'to-sky-500',
    bgLight: 'bg-cyan-50',
    borderColor: 'border-cyan-200',
    textColor: 'text-cyan-700',
    xp: 100,
    duration: '10-15 min',
    badge: '💪 Persistente',
    path: '/journey/stage/6'
  }
];

const CandidateJourney = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Estado do progresso - inicializa vazio, será carregado do backend
  const [completedStages, setCompletedStages] = useState([]);
  const [totalXP, setTotalXP] = useState(0);
  const [candidateLevel, setCandidateLevel] = useState(null);
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);

  // Carregar progresso do backend ao montar o componente
  useEffect(() => {
    const loadProgress = async () => {
      try {
        console.log('📥 Carregando progresso da jornada do backend...');
        const data = await api.get('/journey/my-progress');
        
        console.log('📊 Progresso recebido do backend:', data);
        
        // Atualizar estados com dados do backend
        setCompletedStages(data.completedStages || []);
        setTotalXP(data.totalXP || 0);
        setBadges(data.badges || []);
        setCandidateLevel(data.candidateLevel || null);
        
        // Sincronizar localStorage para cache local
        localStorage.setItem('journeyCompletedStages', JSON.stringify(data.completedStages || []));
        localStorage.setItem('journeyTotalXP', (data.totalXP || 0).toString());
        localStorage.setItem('journeyBadges', JSON.stringify(data.badges || []));
        if (data.candidateLevel) {
          localStorage.setItem('journeyCandidateLevel', data.candidateLevel);
        }
        localStorage.setItem('completedJourneySteps', JSON.stringify(data.completedStages || []));
        
      } catch (error) {
        console.log('⚠️ Erro ao carregar do backend, usando localStorage:', error);
        // Fallback para localStorage se backend falhar
        const saved = localStorage.getItem('journeyCompletedStages');
        setCompletedStages(saved ? JSON.parse(saved) : []);
        setTotalXP(parseInt(localStorage.getItem('journeyTotalXP') || '0'));
        setBadges(JSON.parse(localStorage.getItem('journeyBadges') || '[]'));
        setCandidateLevel(localStorage.getItem('journeyCandidateLevel') || null);
      } finally {
        setLoading(false);
      }
    };
    
    if (user) {
      loadProgress();
    } else {
      setLoading(false);
    }
  }, [user]);

  // Calcular progresso
  const progress = (completedStages.length / journeyStages.length) * 100;
  const isJourneyComplete = completedStages.length === journeyStages.length;

  // Verificar se uma etapa está desbloqueada
  const isStageUnlocked = (stageId) => {
    if (stageId === 0) return true;
    return completedStages.includes(stageId - 1);
  };

  // Verificar se uma etapa foi completada
  const isStageCompleted = (stageId) => {
    return completedStages.includes(stageId);
  };

  // Navegar para uma etapa
  const handleStageClick = (stage) => {
    if (!isStageUnlocked(stage.id)) {
      toast({
        title: 'Etapa bloqueada',
        description: 'Complete a etapa anterior para desbloquear esta.',
        variant: 'destructive'
      });
      return;
    }
    navigate(stage.path);
  };

  // Gerar certificado
  const generateCertificate = () => {
    const userName = user?.name || 'Candidato(a)';
    const completionDate = new Date().toLocaleDateString('pt-BR');

    const doc = new jsPDF();

    // Fundo gradiente
    doc.setFillColor(254, 252, 232);
    doc.rect(0, 0, 210, 297, 'F');

    // Bordas decorativas
    doc.setFillColor(245, 158, 11);
    doc.rect(10, 10, 190, 5, 'F');
    doc.rect(10, 282, 190, 5, 'F');
    doc.rect(10, 10, 5, 277, 'F');
    doc.rect(195, 10, 5, 277, 'F');

    // Cantos dourados
    doc.setFillColor(217, 119, 6);
    doc.circle(15, 15, 5, 'F');
    doc.circle(195, 15, 5, 'F');
    doc.circle(15, 282, 5, 'F');
    doc.circle(195, 282, 5, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(217, 119, 6);
    doc.text('JÁ CURRÍCULOS', 105, 40, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(32);
    doc.setTextColor(146, 64, 14);
    doc.text('CERTIFICADO', 105, 65, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(14);
    doc.setTextColor(120, 82, 7);
    doc.text('Certificamos que', 105, 95, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(26);
    doc.setTextColor(146, 64, 14);
    doc.text(userName, 105, 115, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(14);
    doc.setTextColor(120, 82, 7);
    doc.text('concluiu com sucesso o', 105, 140, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(217, 119, 6);
    doc.text('Curso de Preparação para', 105, 160, { align: 'center' });
    doc.text('o Primeiro Emprego', 105, 175, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.setTextColor(120, 82, 7);
    doc.text('Carga horária: 2 horas', 105, 200, { align: 'center' });
    doc.text(`Concluído em: ${completionDate}`, 105, 212, { align: 'center' });
    doc.text(`XP Total: ${totalXP} pontos`, 105, 224, { align: 'center' });

    // Selos conquistados
    doc.setFontSize(11);
    doc.text('Selos conquistados:', 105, 245, { align: 'center' });
    const badgeText = badges.join(' • ') || 'Todos os selos!';
    doc.setFontSize(10);
    doc.text(badgeText, 105, 255, { align: 'center' });

    doc.save('Certificado_Jornada_Candidato_JaCurriculos.pdf');

    toast({
      title: "Certificado Gerado! 🎉",
      description: "Seu certificado foi baixado com sucesso.",
    });
  };

  // Calcular nível baseado no XP
  const getLevel = () => {
    if (totalXP >= 800) return { name: 'Expert', icon: Crown, color: 'text-amber-500' };
    if (totalXP >= 500) return { name: 'Avançado', icon: Star, color: 'text-violet-500' };
    if (totalXP >= 250) return { name: 'Intermediário', icon: Zap, color: 'text-blue-500' };
    return { name: 'Iniciante', icon: Sparkles, color: 'text-emerald-500' };
  };

  const level = getLevel();
  const LevelIcon = level.icon;

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50/20 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Carregando seu progresso...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Jornada do Candidato - Já Currículos</title>
        <meta name="description" content="Do zero ao primeiro emprego formal. Complete as etapas, ganhe XP e selos!" />
      </Helmet>
      
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50/20">
        {/* Header Moderno */}
        <div className="max-w-6xl mx-auto px-4 pt-8 pb-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
          >
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
                Jornada do Candidato <Rocket className="w-7 h-7 text-amber-500" />
              </h1>
              <p className="text-gray-500 mt-1">
                Do zero ao primeiro emprego formal
              </p>
            </div>
            
            {isJourneyComplete && (
              <Button 
                onClick={generateCertificate}
                className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold rounded-xl shadow-lg px-6"
              >
                <Download className="w-4 h-4 mr-2" />
                Baixar Certificado
              </Button>
            )}
          </motion.div>
        </div>

        {/* Cards de Estatísticas */}
        <div className="max-w-6xl mx-auto px-4 mb-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4"
          >
            {/* XP Total */}
            <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">XP TOTAL</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{totalXP}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                  <Zap className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>

            {/* Etapas Concluídas */}
            <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">ETAPAS</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{completedStages.length}<span className="text-lg text-gray-400">/{journeyStages.length}</span></p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center">
                  <Target className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>

            {/* Selos */}
            <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">SELOS</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{badges.length}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center">
                  <Award className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>

            {/* Progresso */}
            <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">PROGRESSO</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{Math.round(progress)}%</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
                  <Trophy className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Barra de Progresso Visual */}
        <div className="max-w-6xl mx-auto px-4 mb-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <LevelIcon className={`w-5 h-5 ${level.color}`} />
                <span className="font-semibold text-gray-900">Nível: {level.name}</span>
              </div>
              <span className="text-sm text-gray-500">{completedStages.length} de {journeyStages.length} etapas concluídas</span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 rounded-full"
                initial={{ width: '0%' }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </div>
          </motion.div>
        </div>

        {/* Banner de Conclusão */}
        <AnimatePresence>
          {isJourneyComplete && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-6xl mx-auto px-4 mb-8"
            >
              <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl p-6 text-white shadow-xl">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center">
                      <Trophy className="w-8 h-8 text-yellow-300" />
                    </div>
                    <div>
                      <h2 className="text-xl md:text-2xl font-bold">🎉 Parabéns! Jornada Completa!</h2>
                      <p className="text-emerald-100">Você está pronto para o mercado de trabalho!</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button 
                      onClick={generateCertificate}
                      className="bg-white text-emerald-600 hover:bg-emerald-50 font-semibold px-5 py-2.5 rounded-xl shadow-lg"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Certificado
                    </Button>
                    <Button 
                      onClick={() => navigate('/jobs')}
                      className="bg-white/20 hover:bg-white/30 text-white font-semibold px-5 py-2.5 rounded-xl"
                    >
                      <Search className="w-4 h-4 mr-2" />
                      Ver Vagas
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Layout Principal em Grid */}
        <div className="max-w-6xl mx-auto px-4 pb-12">
          <div className="grid lg:grid-cols-3 gap-6">
            
            {/* Coluna Principal - Etapas da Jornada */}
            <div className="lg:col-span-2">
              <motion.div 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
              >
                <div className="p-5 border-b border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                      <GraduationCap className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="font-bold text-gray-900">Etapas da Jornada</h2>
                      <p className="text-sm text-gray-500">Complete cada etapa para evoluir</p>
                    </div>
                  </div>
                </div>
                
                <div className="p-5 space-y-3">
                  {journeyStages.map((stage, index) => {
                    const Icon = stage.icon;
                    const isUnlocked = isStageUnlocked(stage.id);
                    const isCompleted = isStageCompleted(stage.id);
                    const isCurrent = isUnlocked && !isCompleted;
                    
                    return (
                      <motion.div
                        key={stage.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 + index * 0.05 }}
                      >
                        <div
                          onClick={() => handleStageClick(stage)}
                          className={`
                            relative p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer
                            ${isCompleted 
                              ? 'bg-emerald-50/50 border-emerald-200 hover:bg-emerald-50' 
                              : isCurrent 
                                ? `bg-gradient-to-r from-${stage.color}-50 to-white border-${stage.color}-300 hover:shadow-md ring-1 ring-${stage.color}-200` 
                                : 'bg-gray-50/50 border-gray-200 opacity-60 hover:opacity-70'
                            }
                          `}
                        >
                          <div className="flex items-center gap-4">
                            {/* Ícone */}
                            <div className={`
                              w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm
                              ${isCompleted 
                                ? 'bg-gradient-to-br from-emerald-500 to-teal-500' 
                                : isUnlocked 
                                  ? `bg-gradient-to-br ${stage.gradientFrom} ${stage.gradientTo}` 
                                  : 'bg-gray-300'
                              }
                            `}>
                              {isCompleted ? (
                                <Check className="w-6 h-6 text-white" />
                              ) : isUnlocked ? (
                                <Icon className="w-6 h-6 text-white" />
                              ) : (
                                <Lock className="w-5 h-5 text-white" />
                              )}
                            </div>
                            
                            {/* Conteúdo */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-xs font-bold text-gray-400">ETAPA {stage.id}</span>
                                {isCurrent && (
                                  <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-500 text-white rounded-full">
                                    ATUAL
                                  </span>
                                )}
                                {isCompleted && (
                                  <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-500 text-white rounded-full">
                                    ✓ CONCLUÍDO
                                  </span>
                                )}
                              </div>
                              <h3 className={`font-semibold truncate ${
                                isCompleted ? 'text-emerald-700' : isUnlocked ? 'text-gray-900' : 'text-gray-400'
                              }`}>
                                {stage.title}
                              </h3>
                              <p className={`text-sm truncate ${
                                isCompleted ? 'text-emerald-600' : isUnlocked ? 'text-gray-500' : 'text-gray-400'
                              }`}>
                                {stage.subtitle}
                              </p>
                            </div>
                            
                            {/* Info e Seta */}
                            <div className="flex items-center gap-3 flex-shrink-0">
                              <div className="hidden sm:flex flex-col items-end gap-1">
                                <span className={`text-xs font-medium ${isUnlocked ? 'text-amber-600' : 'text-gray-400'}`}>
                                  +{stage.xp} XP
                                </span>
                                <span className={`text-xs ${isUnlocked ? 'text-gray-500' : 'text-gray-400'}`}>
                                  {stage.duration}
                                </span>
                              </div>
                              <ChevronRight className={`w-5 h-5 ${
                                isCompleted ? 'text-emerald-500' : isUnlocked ? 'text-gray-400' : 'text-gray-300'
                              }`} />
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            </div>

            {/* Coluna Lateral */}
            <div className="space-y-6">
              
              {/* Card Nível Atual */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center">
                    <Crown className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">Seu Nível</h3>
                    <p className="text-sm text-gray-500">Baseado no seu XP</p>
                  </div>
                </div>
                
                <div className="text-center py-4">
                  <div className={`w-20 h-20 rounded-2xl mx-auto flex items-center justify-center mb-3 ${
                    level.name === 'Expert' ? 'bg-gradient-to-br from-amber-400 to-orange-500' :
                    level.name === 'Avançado' ? 'bg-gradient-to-br from-violet-400 to-purple-500' :
                    level.name === 'Intermediário' ? 'bg-gradient-to-br from-blue-400 to-indigo-500' :
                    'bg-gradient-to-br from-emerald-400 to-teal-500'
                  }`}>
                    <LevelIcon className="w-10 h-10 text-white" />
                  </div>
                  <h4 className="text-xl font-bold text-gray-900">{level.name}</h4>
                  <p className="text-sm text-gray-500 mt-1">{totalXP} XP acumulados</p>
                </div>
                
                <div className="mt-4 p-3 bg-gray-50 rounded-xl">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Progresso para próximo nível</span>
                    <span>{Math.min(totalXP, 800)}/800</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full"
                      style={{ width: `${Math.min((totalXP / 800) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              </motion.div>

              {/* Card Selos Conquistados */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                    <Award className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">Selos Conquistados</h3>
                    <p className="text-sm text-gray-500">{badges.length} de {journeyStages.length} selos</p>
                  </div>
                </div>
                
                {badges.length > 0 ? (
                  <div className="space-y-2">
                    {badges.map((badge, idx) => (
                      <div 
                        key={idx}
                        className="flex items-center gap-3 p-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-100"
                      >
                        <span className="text-xl">{badge.split(' ')[0]}</span>
                        <span className="text-sm font-medium text-amber-800">{badge.split(' ').slice(1).join(' ')}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <div className="w-16 h-16 rounded-2xl bg-gray-100 mx-auto flex items-center justify-center mb-3">
                      <Award className="w-8 h-8 text-gray-300" />
                    </div>
                    <p className="text-sm text-gray-500">Complete etapas para ganhar selos</p>
                  </div>
                )}
              </motion.div>

              {/* Quick Actions removed as requested */}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default CandidateJourney;