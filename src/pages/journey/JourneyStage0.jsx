import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, ChevronRight, Sparkles, ArrowRight, User, Briefcase, CheckCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';

// Perguntas de trabalho/estágio por tipo de instituição
const workQuestionsBySchoolType = {
  // Escola de Ensino Médio (Regular)
  'regular': {
    id: 'quando_trabalhar',
    type: 'quiz',
    question: 'Quando você gostaria de começar a trabalhar ou estagiar?',
    options: [
      { text: 'Ainda durante o ensino médio', correct: true, value: 1 },
      { text: 'Logo após concluir o ensino médio, entrando diretamente no mercado de trabalho', correct: true, value: 2 },
      { text: 'Durante um curso técnico ou faculdade', correct: true, value: 3 },
      { text: 'Após terminar um curso técnico ou faculdade', correct: true, value: 4 },
      { text: 'Ainda não pensei sobre isso', correct: true, value: 5 }
    ],
    isPreference: true // Não tem resposta certa/errada, é preferência
  },
  // Escola Técnica
  'tecnica': {
    id: 'quando_trabalhar',
    type: 'quiz',
    question: 'Quando você gostaria de começar a trabalhar ou estagiar?',
    options: [
      { text: 'Ainda durante o curso técnico', correct: true, value: 1 },
      { text: 'Logo após concluir o curso técnico, entrando somente no mercado de trabalho', correct: true, value: 2 },
      { text: 'Logo após concluir o curso técnico, entrando em uma faculdade e no mercado de trabalho', correct: true, value: 3 },
      { text: 'Somente após concluir a faculdade', correct: true, value: 4 },
      { text: 'Ainda não pensei sobre isso', correct: true, value: 5 }
    ],
    isPreference: true
  },
  // Faculdade / Ensino Superior
  'superior': {
    id: 'quando_trabalhar',
    type: 'quiz',
    question: 'Quando você gostaria de começar a trabalhar ou estagiar na sua área?',
    options: [
      { text: 'Já durante a faculdade, por meio de estágio', correct: true, value: 1 },
      { text: 'Logo após concluir a faculdade', correct: true, value: 2 },
      { text: 'Depois que concluir a faculdade e me especializar mais', correct: true, value: 3 },
      { text: 'Ainda não pensei sobre isso', correct: true, value: 4 }
    ],
    isPreference: true
  }
};

// Função para determinar o tipo de escola baseado no school_type
const getSchoolCategory = (schoolType) => {
  if (!schoolType) return 'regular';
  const type = schoolType.toLowerCase();
  
  if (type.includes('técnic') || type.includes('tecnic') || type.includes('profissional') || type.includes('profissionalizante')) {
    return 'tecnica';
  }
  if (type.includes('superior') || type.includes('faculdade') || type.includes('universidade') || type.includes('graduação') || type.includes('graduacao')) {
    return 'superior';
  }
  // Default: ensino médio regular
  return 'regular';
};

// Perguntas de autoavaliação antes da simulação (base)
const baseSelfAssessmentQuestions = [
  {
    id: 'nervoso',
    type: 'scale',
    question: 'De 1 a 10, o quanto você estaria nervoso se tivesse uma entrevista de emprego agora para uma vaga do seu interesse?',
    labels: { low: 'Nada nervoso', high: 'Muito nervoso' }
  },
  {
    id: 'preparado_entrevista',
    type: 'scale',
    question: 'De 1 a 10, o quanto você acredita que estaria preparado para essa entrevista?',
    labels: { low: 'Nada preparado', high: 'Muito preparado' }
  },
  {
    id: 'preparado_vaga',
    type: 'scale',
    question: 'Atualmente, de 1 a 10, o quanto você se sente preparado para atuar em uma vaga dentro da sua formação acadêmica?',
    labels: { low: 'Nada preparado', high: 'Muito preparado' }
  },
  // Placeholder para a pergunta dinâmica - será substituída
  {
    id: 'quando_trabalhar_placeholder',
    type: 'placeholder'
  },
  {
    id: 'estagiario',
    type: 'quiz',
    question: 'O que uma empresa geralmente espera de um estagiário?',
    options: [
      { text: 'Que já saiba fazer tudo sozinho sem precisar de orientação ou treinamento', correct: false },
      { text: 'Que tenha vontade de aprender, seja pontual e demonstre comprometimento', correct: true },
      { text: 'Que trabalhe mais horas que os funcionários efetivos para compensar a inexperiência', correct: false },
      { text: 'Que traga soluções inovadoras e revolucione os processos da empresa logo no início', correct: false }
    ]
  }
];

// Simulação de entrevista - perguntas com opções de tamanho similar
const interviewQuestions = [
  {
    id: 1,
    question: 'Fale um pouco sobre você.',
    options: [
      { 
        text: 'Tenho 18 anos, moro com minha família e gosto de sair com amigos nos fins de semana. Estou procurando um emprego para ter meu próprio dinheiro e independência.', 
        score: 1,
        feedback: 'Focou demais no pessoal. O entrevistador quer saber o que você pode oferecer profissionalmente.'
      },
      { 
        text: 'Sou uma pessoa extremamente dedicada e muito esforçada em tudo que faço. Trabalho bem em equipe, tenho facilidade de aprendizado e me considero muito proativo.', 
        score: 2,
        feedback: 'Bom! Mas ficou genérico. Tente dar exemplos concretos das suas qualidades.'
      },
      { 
        text: 'Estou concluindo o Ensino Médio e fiz um curso de Excel na escola. Sou organizado e sempre entrego trabalhos no prazo. Busco uma oportunidade para crescer profissionalmente.', 
        score: 3,
        feedback: 'Excelente! Mencionou formação, deu exemplo concreto e mostrou objetivo.'
      },
      { 
        text: 'Ah, sei lá... sou uma pessoa normal como todo mundo, não tenho muito o que falar. O que exatamente você gostaria de saber sobre mim? Pode perguntar qualquer coisa.', 
        score: 0,
        feedback: 'Demonstra despreparo. Sempre tenha uma apresentação pessoal preparada!'
      }
    ]
  },
  {
    id: 2,
    question: 'Por que você quer trabalhar na nossa empresa?',
    options: [
      { 
        text: 'Para ser bem sincero, preciso de um emprego urgente e vi que vocês estavam contratando. Qualquer vaga que tiver disponível serve para mim no momento.', 
        score: 0,
        feedback: 'Parece desesperado e sem interesse genuíno. Pesquise sobre a empresa antes!'
      },
      { 
        text: 'Principalmente porque fica perto da minha casa e o horário é bom pra mim conciliar com os estudos. Também preciso muito do vale-transporte e dos benefícios.', 
        score: 1,
        feedback: 'Focou apenas nos seus benefícios. Mostre o que você pode oferecer à empresa.'
      },
      { 
        text: 'Pesquisei sobre a empresa e vi que vocês valorizam o desenvolvimento dos funcionários e têm um bom ambiente. Quero começar minha carreira em um lugar assim.', 
        score: 3,
        feedback: 'Perfeito! Mostrou que pesquisou e conectou seus objetivos com a empresa.'
      },
      { 
        text: 'Sempre quis trabalhar nessa área e vocês são uma empresa conhecida e respeitada na cidade. Acho que seria uma experiência muito boa para minha carreira.', 
        score: 2,
        feedback: 'Razoável, mas poderia ser mais específico sobre o que te atrai na empresa.'
      }
    ]
  },
  {
    id: 3,
    question: 'Qual seu maior defeito?',
    options: [
      { 
        text: 'Sinceramente, não tenho defeitos que sejam relevantes para o trabalho. Acredito que sou uma pessoa bem completa e preparada para qualquer situação profissional.', 
        score: 0,
        feedback: 'Falta de autoconhecimento! Todos temos pontos a melhorar.'
      },
      { 
        text: 'Meu maior defeito é ser perfeccionista demais com tudo que faço. Às vezes me cobro muito e quero que tudo saia perfeito, o que pode me deixar estressado.', 
        score: 1,
        feedback: 'Clichê! Essa resposta é tão usada que parece ensaiada. Seja mais autêntico.'
      },
      { 
        text: 'Tenho dificuldade em falar em público e apresentar trabalhos, mas estou praticando bastante. Na escola comecei a apresentar mais trabalhos para melhorar.', 
        score: 3,
        feedback: 'Ótimo! Honesto, relevante e mostra que está trabalhando para melhorar.'
      },
      { 
        text: 'Sou uma pessoa muito ansiosa com prazos e compromissos importantes. Às vezes fico tão nervoso que acabo me atrasando ou esquecendo das coisas.', 
        score: 0,
        feedback: 'Defeito grave para o trabalho! Escolha algo que não comprometa a vaga.'
      }
    ]
  },
  {
    id: 4,
    question: 'Você tem experiência na área?',
    options: [
      { 
        text: 'Não, infelizmente nunca trabalhei em nenhum lugar ainda. Este seria o meu primeiro emprego formal e estou ansioso para começar minha carreira profissional.', 
        score: 1,
        feedback: 'Honesto, mas perdeu a chance de destacar outras experiências relevantes.'
      },
      { 
        text: 'Não tenho experiência formal registrada, mas ajudei a organizar eventos na escola e participei de um projeto voluntário de atendimento na comunidade.', 
        score: 3,
        feedback: 'Excelente! Transformou a falta de experiência em demonstração de habilidades.'
      },
      { 
        text: 'Experiência formal não tenho ainda, mas posso garantir que aprendo muito rápido qualquer coisa. É só me explicar uma vez que eu já consigo fazer.', 
        score: 2,
        feedback: 'Bom mostrar disposição, mas faltaram exemplos concretos.'
      },
      { 
        text: 'Infelizmente não tenho experiência nenhuma porque ninguém dá chance para quem está começando. Todas as vagas pedem experiência e isso dificulta muito.', 
        score: 0,
        feedback: 'Negatividade não ajuda! Foque no que você PODE oferecer.'
      }
    ]
  },
  {
    id: 5,
    question: 'Onde você se vê daqui a 5 anos?',
    options: [
      { 
        text: 'Para ser sincero, não pensei muito nisso ainda porque muita coisa pode mudar. Prefiro ver como as coisas vão acontecendo e me adaptar conforme necessário.', 
        score: 1,
        feedback: 'Demonstra falta de planejamento. Empresas querem pessoas com visão de futuro.'
      },
      { 
        text: 'Provavelmente já vou ter saído para um emprego melhor que pague mais e tenha mais benefícios. Quero sempre buscar oportunidades melhores para crescer.', 
        score: 0,
        feedback: 'Nunca diga isso! Parece que vai sair na primeira oportunidade.'
      },
      { 
        text: 'Quero estar bem mais experiente na área, talvez ocupando uma posição com mais responsabilidades. Também pretendo começar uma faculdade para me especializar.', 
        score: 3,
        feedback: 'Perfeito! Mostra ambição, comprometimento e planos de desenvolvimento.'
      },
      { 
        text: 'Meu objetivo é crescer rapidamente na empresa e chegar a ser gerente ou até mesmo diretor. Tenho muita ambição e vou trabalhar duro para conseguir.', 
        score: 1,
        feedback: 'Ambição é boa, mas para primeiro emprego pode parecer fora da realidade.'
      }
    ]
  }
];

const JourneyStage0 = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  
  // School info state
  const [schoolType, setSchoolType] = useState('regular');
  const [selfAssessmentQuestions, setSelfAssessmentQuestions] = useState([]);
  const [loadingSchool, setLoadingSchool] = useState(true);
  
  // Phases: 'intro', 'self-assessment', 'interview-intro', 'interview', 'result'
  const [phase, setPhase] = useState('intro');
  
  // Self-assessment state
  const [assessmentIndex, setAssessmentIndex] = useState(0);
  const [assessmentAnswers, setAssessmentAnswers] = useState({});
  const [selectedScale, setSelectedScale] = useState(null);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [showQuizResult, setShowQuizResult] = useState(false);
  
  // Interview state
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [interviewScore, setInterviewScore] = useState(0);
  const [interviewAnswers, setInterviewAnswers] = useState([]);

  // Carrega informações da escola do usuário
  useEffect(() => {
    const loadSchoolInfo = async () => {
      try {
        const res = await api.get('/users/me/school');
        if (res.data?.school?.school_type) {
          const category = getSchoolCategory(res.data.school.school_type);
          setSchoolType(category);
        }
      } catch (err) {
        console.log('Não foi possível carregar escola, usando default');
      } finally {
        setLoadingSchool(false);
      }
    };
    
    if (user) {
      loadSchoolInfo();
    } else {
      setLoadingSchool(false);
    }
  }, [user]);

  // Monta as perguntas quando o tipo de escola é definido
  useEffect(() => {
    const workQuestion = workQuestionsBySchoolType[schoolType] || workQuestionsBySchoolType['regular'];
    
    const questions = baseSelfAssessmentQuestions.map(q => {
      if (q.type === 'placeholder') {
        return workQuestion;
      }
      return q;
    });
    
    setSelfAssessmentQuestions(questions);
  }, [schoolType]);

  const currentAssessment = selfAssessmentQuestions[assessmentIndex];
  const currentQ = interviewQuestions[currentQuestion];
  const assessmentProgress = selfAssessmentQuestions.length > 0 ? ((assessmentIndex + 1) / selfAssessmentQuestions.length) * 100 : 0;
  const interviewProgress = ((currentQuestion + 1) / interviewQuestions.length) * 100;
  const maxInterviewScore = interviewQuestions.length * 3;

  // Self-assessment handlers
  const handleScaleSelect = (value) => {
    setSelectedScale(value);
  };

  const handleQuizSelect = (idx) => {
    if (showQuizResult) return;
    setSelectedQuiz(idx);
    // Para perguntas de preferência, não mostra resultado certo/errado
    if (!currentAssessment?.isPreference) {
      setShowQuizResult(true);
    }
  };

  const handleNextAssessment = () => {
    // Save answer
    if (currentAssessment.type === 'scale') {
      setAssessmentAnswers(prev => ({ ...prev, [currentAssessment.id]: selectedScale }));
    } else if (currentAssessment.isPreference) {
      // Salva a preferência selecionada
      setAssessmentAnswers(prev => ({ 
        ...prev, 
        [currentAssessment.id]: {
          selected: selectedQuiz,
          value: currentAssessment.options[selectedQuiz]?.value,
          text: currentAssessment.options[selectedQuiz]?.text
        }
      }));
    } else {
      setAssessmentAnswers(prev => ({ 
        ...prev, 
        [currentAssessment.id]: {
          selected: selectedQuiz,
          correct: currentAssessment.options[selectedQuiz]?.correct
        }
      }));
    }
    
    // Reset selections
    setSelectedScale(null);
    setSelectedQuiz(null);
    setShowQuizResult(false);
    
    // Next question or move to interview
    if (assessmentIndex < selfAssessmentQuestions.length - 1) {
      setAssessmentIndex(prev => prev + 1);
    } else {
      setPhase('interview-intro');
    }
  };

  // Interview handlers
  const handleSelectAnswer = (option, idx) => {
    if (selectedAnswer !== null) return;
    
    setSelectedAnswer(idx);
    setInterviewScore(prev => prev + option.score);
    setInterviewAnswers(prev => [...prev, { question: currentQ.question, answer: option.text, score: option.score }]);
  };

  const handleNextQuestion = () => {
    if (currentQuestion < interviewQuestions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
      setSelectedAnswer(null);
    } else {
      setPhase('result');
    }
  };

  const getInterviewLevel = () => {
    const percentage = (interviewScore / maxInterviewScore) * 100;
    
    if (percentage <= 33) {
      return {
        level: 'iniciante',
        title: 'Precisa Treinar!',
        description: 'Você tem potencial, mas precisa aprender as técnicas certas para entrevistas.',
        emoji: '🌱',
        color: 'amber'
      };
    } else if (percentage <= 66) {
      return {
        level: 'intermediario',
        title: 'No Caminho Certo!',
        description: 'Você já tem noção do que fazer, mas alguns detalhes podem te custar a vaga.',
        emoji: '📚',
        color: 'blue'
      };
    } else {
      return {
        level: 'avancado',
        title: 'Bem Preparado!',
        description: 'Você já sabe se portar em entrevistas! A jornada vai consolidar seu conhecimento.',
        emoji: '⭐',
        color: 'emerald'
      };
    }
  };

  const completeStage = async () => {
    // IMPORTANTE: Salvar no backend PRIMEIRO (fonte de verdade)
    try {
      const interviewResult = getInterviewLevel();
      
      console.log('📤 Salvando jornada no backend...');
      await api.post('/journey/stage/0', {
        selfAssessment: {
          nervoso: assessmentAnswers.nervoso,
          preparado_entrevista: assessmentAnswers.preparado_entrevista,
          preparado_vaga: assessmentAnswers.preparado_vaga,
          quando_trabalhar: assessmentAnswers.quando_trabalhar,
          estagiario: assessmentAnswers.estagiario
        },
        interviewResult: {
          score: interviewScore,
          maxScore: maxInterviewScore,
          level: interviewResult.level === 'iniciante' ? 'Precisa Melhorar' : 
                 interviewResult.level === 'intermediario' ? 'Regular' :
                 interviewResult.level === 'avancado' ? 'Bom' : 'Excelente',
          answers: interviewAnswers
        },
        schoolTypeCategory: schoolType
      });
      console.log('✅ Jornada salva no backend com sucesso!');
      
      // Após salvar no backend com sucesso, atualizar localStorage como cache
      const completed = JSON.parse(localStorage.getItem('journeyCompletedStages') || '[]');
      if (!completed.includes(0)) {
        completed.push(0);
        localStorage.setItem('journeyCompletedStages', JSON.stringify(completed));
      }
      
      const currentXP = parseInt(localStorage.getItem('journeyTotalXP') || '0');
      localStorage.setItem('journeyTotalXP', (currentXP + 50).toString());
      
      const badges = JSON.parse(localStorage.getItem('journeyBadges') || '[]');
      if (!badges.includes('🎯 Primeiro Passo')) {
        badges.push('🎯 Primeiro Passo');
        localStorage.setItem('journeyBadges', JSON.stringify(badges));
      }
      
      localStorage.setItem('journeyInterviewLevel', interviewResult.level);
      localStorage.setItem('journeyCandidateLevel', interviewResult.level);
      localStorage.setItem('journeySelfAssessment', JSON.stringify(assessmentAnswers));
      
      toast({
        title: '🎉 Etapa concluída!',
        description: '+50 XP • Selo "Primeiro Passo" conquistado!',
      });
      
      navigate('/candidate-journey');
      
    } catch (err) {
      console.error('❌ Erro ao salvar no backend:', err);
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar seu progresso. Tente novamente.',
        variant: 'destructive'
      });
    }
  };

  const colorClasses = {
    amber: 'from-amber-500 to-orange-500',
    blue: 'from-blue-500 to-indigo-500',
    emerald: 'from-emerald-500 to-teal-500'
  };

  return (
    <>
      <Helmet>
        <title>Simulação de Entrevista - Jornada do Candidato</title>
      </Helmet>
      
      {/* Loading state */}
      {(loadingSchool || selfAssessmentQuestions.length === 0) && (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-cyan-50 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-600">Carregando...</p>
          </div>
        </div>
      )}
      
      {!loadingSchool && selfAssessmentQuestions.length > 0 && (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-cyan-50">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white">
          <div className="max-w-3xl mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <button 
                onClick={() => navigate('/candidate-journey')}
                className="flex items-center gap-2 text-white/80 hover:text-white transition-colors"
              >
                <ArrowRight className="w-5 h-5 rotate-180" />
                <span>Voltar</span>
              </button>
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                <span className="font-medium">Etapa 0</span>
              </div>
            </div>
            <div className="text-center mt-4">
              <h1 className="text-2xl font-bold">
                {phase === 'self-assessment' ? 'Autoavaliação' : 'Simulação de Entrevista'}
              </h1>
              <p className="text-indigo-100 mt-1">
                {phase === 'self-assessment' ? 'Como você se sente?' : 'Teste suas habilidades!'}
              </p>
            </div>
          </div>
        </div>

        {/* Conteúdo */}
        <div className="max-w-3xl mx-auto px-4 py-8">
          <AnimatePresence mode="wait">
            {/* Tela inicial */}
            {phase === 'intro' && (
              <motion.div
                key="intro"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-white rounded-2xl shadow-xl p-6 md:p-8 text-center"
              >
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center mx-auto mb-6">
                  <Briefcase className="w-10 h-10 text-white" />
                </div>
                
                <h2 className="text-2xl font-bold text-slate-800 mb-3">
                  Vamos começar sua jornada!
                </h2>
                
                <p className="text-slate-600 mb-6 max-w-md mx-auto">
                  Esta etapa tem duas partes: primeiro algumas <strong>perguntas rápidas sobre você</strong>, 
                  depois uma <strong>simulação de entrevista</strong> de emprego.
                </p>
                
                <div className="bg-indigo-50 rounded-xl p-4 mb-6 border border-indigo-200">
                  <div className="flex items-center justify-center gap-6 text-sm">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-indigo-600">2</div>
                      <div className="text-indigo-700">Partes</div>
                    </div>
                    <div className="w-px h-10 bg-indigo-200"></div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-indigo-600">10</div>
                      <div className="text-indigo-700">Perguntas</div>
                    </div>
                    <div className="w-px h-10 bg-indigo-200"></div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-indigo-600">+50</div>
                      <div className="text-indigo-700">XP</div>
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mb-6 text-left">
                  <div className="bg-violet-50 rounded-xl p-4 border border-violet-200">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="w-5 h-5 text-violet-600" />
                      <span className="font-bold text-violet-800">Parte 1: Autoavaliação</span>
                    </div>
                    <p className="text-sm text-violet-700">5 perguntas rápidas sobre como você se sente em relação ao mercado de trabalho.</p>
                  </div>
                  <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Briefcase className="w-5 h-5 text-emerald-600" />
                      <span className="font-bold text-emerald-800">Parte 2: Entrevista</span>
                    </div>
                    <p className="text-sm text-emerald-700">5 perguntas comuns de entrevistas. Escolha a melhor resposta para cada situação.</p>
                  </div>
                </div>
                
                <Button
                  onClick={() => setPhase('self-assessment')}
                  className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold px-8 py-4 rounded-xl text-lg shadow-lg"
                >
                  Começar
                  <ChevronRight className="w-5 h-5 ml-2" />
                </Button>
              </motion.div>
            )}

            {/* Autoavaliação */}
            {phase === 'self-assessment' && (
              <motion.div
                key={`assessment-${assessmentIndex}`}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
              >
                {/* Progress bar */}
                <div className="bg-white rounded-full shadow-sm p-1 mb-4">
                  <div className="h-2 bg-violet-100 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full"
                      animate={{ width: `${assessmentProgress}%` }}
                    />
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
                  <div className="text-center mb-6">
                    <span className="text-sm font-medium text-violet-600 bg-violet-100 px-3 py-1 rounded-full">
                      📋 Autoavaliação - Pergunta {assessmentIndex + 1} de {selfAssessmentQuestions.length}
                    </span>
                  </div>
                  
                  <div className="bg-violet-50 rounded-xl p-5 mb-6 border-2 border-violet-200">
                    <p className="text-lg font-bold text-slate-800">{currentAssessment.question}</p>
                  </div>
                  
                  {/* Escala de 1-10 */}
                  {currentAssessment.type === 'scale' && (
                    <div className="space-y-4">
                      <div className="flex justify-between text-sm text-slate-500 px-2">
                        <span>{currentAssessment.labels.low}</span>
                        <span>{currentAssessment.labels.high}</span>
                      </div>
                      <div className="flex gap-2 justify-center flex-wrap">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                          <button
                            key={num}
                            onClick={() => handleScaleSelect(num)}
                            className={`
                              w-12 h-12 rounded-xl font-bold text-lg transition-all
                              ${selectedScale === num 
                                ? 'bg-gradient-to-r from-violet-500 to-purple-500 text-white scale-110 shadow-lg' 
                                : 'bg-slate-100 text-slate-700 hover:bg-violet-100 hover:text-violet-700'}
                            `}
                          >
                            {num}
                          </button>
                        ))}
                      </div>
                      {selectedScale && (
                        <div className="text-center mt-4">
                          <span className="text-2xl font-bold text-violet-600">Você escolheu: {selectedScale}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Quiz de múltipla escolha */}
                  {currentAssessment.type === 'quiz' && (
                    <div className="space-y-3">
                      {currentAssessment.options.map((option, idx) => {
                        const isSelected = selectedQuiz === idx;
                        const isCorrect = option.correct;
                        const isPreference = currentAssessment.isPreference;
                        
                        return (
                          <motion.button
                            key={idx}
                            onClick={() => handleQuizSelect(idx)}
                            disabled={showQuizResult}
                            className={`
                              w-full p-4 rounded-xl border-2 text-left transition-all
                              ${isPreference && isSelected ? 'border-violet-500 bg-violet-50' : ''}
                              ${!isPreference && showQuizResult && isSelected && isCorrect ? 'border-emerald-500 bg-emerald-50' : ''}
                              ${!isPreference && showQuizResult && isSelected && !isCorrect ? 'border-red-500 bg-red-50' : ''}
                              ${!isPreference && showQuizResult && !isSelected && isCorrect ? 'border-emerald-500 bg-emerald-50 opacity-70' : ''}
                              ${!isPreference && showQuizResult && !isSelected && !isCorrect ? 'opacity-40' : ''}
                              ${!isPreference && !showQuizResult && !isSelected ? 'border-slate-200 hover:border-violet-300 hover:bg-violet-50 cursor-pointer' : ''}
                              ${isPreference && !isSelected ? 'border-slate-200 hover:border-violet-300 hover:bg-violet-50 cursor-pointer' : ''}
                            `}
                            whileHover={(!showQuizResult || isPreference) && !isSelected ? { scale: 1.01 } : {}}
                            whileTap={(!showQuizResult || isPreference) && !isSelected ? { scale: 0.99 } : {}}
                          >
                            <div className="flex items-center gap-3">
                              {!isPreference && showQuizResult && (
                                <span className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                                  isCorrect ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
                                }`}>
                                  {isCorrect ? '✓' : '✗'}
                                </span>
                              )}
                              {isPreference && isSelected && (
                                <span className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 bg-violet-500 text-white">
                                  ✓
                                </span>
                              )}
                              <p className="font-medium text-slate-700 text-sm flex-1">{option.text}</p>
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>
                  )}
                  
                  {/* Botão Próxima */}
                  <div className="mt-8 flex justify-end">
                    <Button
                      onClick={handleNextAssessment}
                      disabled={currentAssessment.type === 'scale' ? !selectedScale : (currentAssessment.isPreference ? selectedQuiz === null : !showQuizResult)}
                      className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-bold px-6 py-3 rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {assessmentIndex < selfAssessmentQuestions.length - 1 ? 'Próxima' : 'Continuar para Entrevista'}
                      <ChevronRight className="w-5 h-5 ml-2" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Intro da entrevista */}
            {phase === 'interview-intro' && (
              <motion.div
                key="interview-intro"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-white rounded-2xl shadow-xl p-6 md:p-8 text-center"
              >
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-10 h-10 text-white" />
                </div>
                
                <h2 className="text-2xl font-bold text-slate-800 mb-3">
                  Autoavaliação concluída!
                </h2>
                
                <p className="text-slate-600 mb-6 max-w-md mx-auto">
                  Ótimo! Agora vamos para a parte principal: uma <strong>simulação de entrevista de emprego</strong>. 
                  Você vai responder 5 perguntas comuns e receber feedback sobre suas respostas.
                </p>
                
                <div className="bg-amber-50 rounded-xl p-4 mb-6 border border-amber-200 text-left">
                  <p className="text-amber-800 text-sm">
                    <strong>💡 Dica:</strong> Responda como se fosse uma entrevista real. 
                    Leia todas as opções com atenção antes de escolher - algumas parecem boas mas têm problemas sutis.
                  </p>
                </div>
                
                <Button
                  onClick={() => setPhase('interview')}
                  className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold px-8 py-4 rounded-xl text-lg shadow-lg"
                >
                  Começar Entrevista
                  <ChevronRight className="w-5 h-5 ml-2" />
                </Button>
              </motion.div>
            )}

            {/* Perguntas da entrevista */}
            {phase === 'interview' && (
              <motion.div
                key={`interview-${currentQuestion}`}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
              >
                {/* Progress bar */}
                <div className="bg-white rounded-full shadow-sm p-1 mb-4">
                  <div className="h-2 bg-indigo-100 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full"
                      animate={{ width: `${interviewProgress}%` }}
                    />
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
                  <div className="text-center mb-6">
                    <span className="text-sm font-medium text-indigo-600 bg-indigo-100 px-3 py-1 rounded-full">
                      🎤 Entrevista - Pergunta {currentQuestion + 1} de {interviewQuestions.length}
                    </span>
                  </div>
                  
                  {/* Pergunta do entrevistador */}
                  <div className="bg-indigo-50 rounded-xl p-5 mb-6 border-2 border-indigo-200">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-sm text-indigo-600 font-medium mb-1">Entrevistador pergunta:</p>
                        <p className="text-lg font-bold text-slate-800">"{currentQ.question}"</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Opções de resposta */}
                  <div className="space-y-3">
                    {currentQ.options.map((option, idx) => {
                      const isSelected = selectedAnswer === idx;
                      const showFeedback = selectedAnswer !== null;
                      
                      return (
                        <motion.button
                          key={idx}
                          onClick={() => handleSelectAnswer(option, idx)}
                          disabled={selectedAnswer !== null}
                          className={`
                            w-full p-4 rounded-xl border-2 text-left transition-all
                            ${isSelected && option.score === 3 ? 'border-emerald-500 bg-emerald-50' : ''}
                            ${isSelected && option.score === 2 ? 'border-blue-500 bg-blue-50' : ''}
                            ${isSelected && option.score === 1 ? 'border-amber-500 bg-amber-50' : ''}
                            ${isSelected && option.score === 0 ? 'border-red-500 bg-red-50' : ''}
                            ${!showFeedback ? 'border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 cursor-pointer' : ''}
                            ${showFeedback && !isSelected ? 'opacity-50' : ''}
                          `}
                          whileHover={!showFeedback ? { scale: 1.01 } : {}}
                          whileTap={!showFeedback ? { scale: 0.99 } : {}}
                        >
                          <p className="font-medium text-slate-700 text-sm">{option.text}</p>
                          
                          {isSelected && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              className={`mt-3 pt-3 border-t ${
                                option.score === 3 ? 'border-emerald-200' :
                                option.score === 2 ? 'border-blue-200' :
                                option.score === 1 ? 'border-amber-200' : 'border-red-200'
                              }`}
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`font-bold text-sm ${
                                  option.score === 3 ? 'text-emerald-700' :
                                  option.score === 2 ? 'text-blue-700' :
                                  option.score === 1 ? 'text-amber-700' : 'text-red-700'
                                }`}>
                                  {option.score === 3 ? '✅ Excelente!' : 
                                   option.score === 2 ? '👍 Boa resposta!' : 
                                   option.score === 1 ? '😐 Pode melhorar' : '❌ Evite isso'}
                                </span>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${
                                  option.score === 3 ? 'bg-emerald-200 text-emerald-800' :
                                  option.score === 2 ? 'bg-blue-200 text-blue-800' :
                                  option.score === 1 ? 'bg-amber-200 text-amber-800' : 'bg-red-200 text-red-800'
                                }`}>
                                  +{option.score} pts
                                </span>
                              </div>
                              <p className={`text-sm ${
                                option.score === 3 ? 'text-emerald-600' :
                                option.score === 2 ? 'text-blue-600' :
                                option.score === 1 ? 'text-amber-600' : 'text-red-600'
                              }`}>
                                {option.feedback}
                              </p>
                            </motion.div>
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                  
                  {/* Pontuação atual e botão próxima */}
                  <div className="mt-6 flex items-center justify-between">
                    <span className="text-lg font-bold text-indigo-600">
                      Pontuação: {interviewScore} / {(currentQuestion + (selectedAnswer !== null ? 1 : 0)) * 3}
                    </span>
                    
                    {selectedAnswer !== null && (
                      <Button
                        onClick={handleNextQuestion}
                        className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold px-6 py-3 rounded-xl shadow-lg"
                      >
                        {currentQuestion < interviewQuestions.length - 1 ? 'Próxima Pergunta' : 'Ver Resultado'}
                        <ChevronRight className="w-5 h-5 ml-2" />
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Resultado */}
            {phase === 'result' && (
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-2xl shadow-xl p-6 md:p-8 text-center"
              >
                {(() => {
                  const result = getInterviewLevel();
                  return (
                    <>
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', delay: 0.2 }}
                        className="text-7xl mb-4"
                      >
                        {result.emoji}
                      </motion.div>
                      
                      <h2 className="text-2xl font-bold text-slate-800 mb-2">{result.title}</h2>
                      
                      <div className={`inline-block bg-gradient-to-r ${colorClasses[result.color]} text-white px-4 py-2 rounded-full text-lg font-bold mb-4`}>
                        {interviewScore} / {maxInterviewScore} pontos
                      </div>
                      
                      <p className="text-slate-600 mb-6 max-w-md mx-auto">{result.description}</p>
                      
                      {/* Resumo das respostas */}
                      <div className="bg-slate-50 rounded-xl p-4 mb-6 text-left max-w-md mx-auto">
                        <h3 className="font-bold text-slate-800 mb-3 text-sm">Suas respostas na entrevista:</h3>
                        {interviewAnswers.map((a, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-sm mb-2">
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                              a.score === 3 ? 'bg-emerald-100 text-emerald-700' :
                              a.score === 2 ? 'bg-blue-100 text-blue-700' :
                              a.score === 1 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {a.score}
                            </span>
                            <span className="text-slate-600 truncate flex-1">Pergunta {idx + 1}</span>
                          </div>
                        ))}
                      </div>
                      
                      <div className="flex flex-wrap justify-center gap-4 mb-8">
                        <div className="bg-amber-50 border-2 border-amber-200 rounded-xl px-4 py-3">
                          <div className="text-2xl font-bold text-amber-600">+50 XP</div>
                          <div className="text-xs text-amber-700">Pontos ganhos</div>
                        </div>
                        <div className="bg-indigo-50 border-2 border-indigo-200 rounded-xl px-4 py-3">
                          <div className="text-lg font-bold text-indigo-600">🎯 Primeiro Passo</div>
                          <div className="text-xs text-indigo-700">Selo conquistado</div>
                        </div>
                      </div>
                    </>
                  );
                })()}
                
                <Button
                  onClick={completeStage}
                  className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold px-8 py-4 rounded-xl text-lg shadow-lg"
                >
                  <Sparkles className="w-5 h-5 mr-2" />
                  Continuar Jornada
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      )}
    </>
  );
};

export default JourneyStage0;
