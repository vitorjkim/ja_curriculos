import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Brain, ChevronLeft, ChevronRight, Check, X, Trophy, 
  Sparkles, ArrowRight, Lightbulb, AlertCircle, ThumbsUp, ThumbsDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';

// Conteúdo da Etapa 1
const lessonContent = [
  {
    type: 'info',
    title: 'O que empresas esperam de quem nunca trabalhou?',
    content: [
      '✅ Vontade de aprender e crescer',
      '✅ Pontualidade e compromisso',
      '✅ Boa comunicação e educação',
      '✅ Capacidade de seguir instruções',
      '✅ Trabalho em equipe',
      '',
      '❌ NÃO esperam:',
      '• Experiência prévia (é o primeiro emprego!)',
      '• Conhecimento técnico avançado',
      '• Que você seja perfeito'
    ]
  },
  {
    type: 'info',
    title: 'Erros comuns de iniciantes',
    content: [
      '🚫 Achar que não tem nada a oferecer',
      'Mesmo sem experiência formal, você tem habilidades!',
      '',
      '🚫 Não se preparar para entrevistas',
      'Pesquise sobre a empresa e treine respostas.',
      '',
      '🚫 Currículo muito longo ou vazio',
      'Inclua cursos, projetos escolares, habilidades.',
      '',
      '🚫 Falta de pontualidade',
      'Chegue 10-15 minutos antes da entrevista.'
    ]
  },
  {
    type: 'info',
    title: 'Emprego Formal vs Informal',
    content: [
      '📋 EMPREGO FORMAL (CLT):',
      '• Carteira assinada',
      '• FGTS, INSS, férias, 13º',
      '• Direitos trabalhistas',
      '• Estabilidade e benefícios',
      '',
      '💼 EMPREGO INFORMAL:',
      '• Sem carteira assinada',
      '• Geralmente mais flexível',
      '• Sem garantias trabalhistas',
      '• Pode ser temporário/eventual',
      '',
      '💡 Ambos são válidos para começar!'
    ]
  },
  {
    type: 'quiz',
    question: 'O que é MAIS valorizado no primeiro emprego?',
    options: [
      { text: 'Ter muita experiência anterior comprovada em carteira de trabalho assinada', correct: false },
      { text: 'Vontade de aprender coisas novas, pontualidade e comprometimento com o trabalho', correct: true },
      { text: 'Saber absolutamente tudo sobre a empresa antes mesmo de ser contratado', correct: false },
      { text: 'Ter curso superior completo em uma universidade reconhecida pelo mercado', correct: false }
    ],
    explanation: 'Empresas valorizam principalmente a atitude: vontade de aprender, pontualidade e compromisso são mais importantes que experiência no primeiro emprego.'
  },
  {
    type: 'quiz',
    question: 'Verdadeiro ou Falso: "Quem nunca trabalhou não tem nada a oferecer"',
    options: [
      { text: 'Verdadeiro - sem experiência formal não há como contribuir para a empresa', correct: false },
      { text: 'Falso - habilidades como organização, trabalho em equipe e responsabilidade contam', correct: true }
    ],
    explanation: 'FALSO! Mesmo sem experiência formal, você tem habilidades: organização, trabalho em equipe (escola), cursos, projetos pessoais, responsabilidade em casa, etc.'
  },
  {
    type: 'quiz',
    question: 'O que significa CLT?',
    options: [
      { text: 'Carteira de Livre Trabalho - documento necessário para trabalhar informalmente', correct: false },
      { text: 'Consolidação das Leis do Trabalho - lei que garante direitos trabalhistas', correct: true },
      { text: 'Contrato de Longo Termo - tipo de contrato para empregos que duram anos', correct: false },
      { text: 'Certificado de Licença Trabalhista - autorização do governo para trabalhar', correct: false }
    ],
    explanation: 'CLT significa Consolidação das Leis do Trabalho, a lei que garante direitos como férias, 13º salário, FGTS e carteira assinada.'
  },
  {
    type: 'game',
    title: 'Mini-jogo: Decisão Certa',
    description: 'Escolha o comportamento correto em cada situação.'
  }
];

// Mini-jogo de decisões
const decisionScenarios = [
  {
    situation: 'É seu primeiro dia de trabalho. Você deve chegar:',
    options: [
      { text: 'Exatamente no horário marcado, nem um minuto antes nem depois', consequence: 'ok', feedback: 'Bom, mas poderia ser melhor!' },
      { text: 'Entre 10 a 15 minutos antes para se preparar e causar boa impressão', consequence: 'great', feedback: 'Perfeito! Mostra comprometimento.' },
      { text: 'Alguns minutos atrasado, afinal no primeiro dia todos entendem', consequence: 'bad', feedback: 'Atrasos passam má impressão.' }
    ]
  },
  {
    situation: 'Seu chefe pediu algo que você não entendeu. O que fazer?',
    options: [
      { text: 'Fingir que entendeu e tentar fazer sozinho para não parecer incompetente', consequence: 'bad', feedback: 'Pode dar errado! Sempre pergunte.' },
      { text: 'Pedir educadamente para ele explicar novamente até você entender bem', consequence: 'great', feedback: 'Excelente! Perguntar evita erros.' },
      { text: 'Esperar um colega terminar a tarefa dele e pedir para ele explicar', consequence: 'ok', feedback: 'Funciona, mas melhor perguntar na hora.' }
    ]
  },
  {
    situation: 'Você terminou todas as suas tarefas. O que fazer?',
    options: [
      { text: 'Ficar no celular navegando nas redes sociais esperando mais trabalho', consequence: 'bad', feedback: 'Passa impressão de desinteresse.' },
      { text: 'Perguntar ao seu supervisor se há algo mais em que você possa ajudar', consequence: 'great', feedback: 'Perfeito! Mostra proatividade.' },
      { text: 'Ir embora mais cedo já que terminou tudo o que tinha para fazer', consequence: 'bad', feedback: 'Nunca saia antes do horário sem permissão.' }
    ]
  },
  {
    situation: 'Um cliente foi grosseiro com você. Como reagir?',
    options: [
      { text: 'Responder na mesma moeda para mostrar que você não aceita desaforo', consequence: 'bad', feedback: 'Nunca! Você representa a empresa.' },
      { text: 'Manter a calma, ser educado e tentar resolver o problema do cliente', consequence: 'great', feedback: 'Correto! Profissionalismo acima de tudo.' },
      { text: 'Ignorar completamente o cliente e fingir que não escutou a grosseria', consequence: 'ok', feedback: 'Melhor que brigar, mas tente resolver.' }
    ]
  }
];

const JourneyStage1 = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [showExplanation, setShowExplanation] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  
  // Estado do mini-jogo
  const [gameStarted, setGameStarted] = useState(false);
  const [gameScenario, setGameScenario] = useState(0);
  const [gameScore, setGameScore] = useState(0);
  const [gameChoice, setGameChoice] = useState(null);
  const [gameComplete, setGameComplete] = useState(false);

  const currentContent = lessonContent[currentStep];
  const isLastStep = currentStep === lessonContent.length - 1;
  const totalSteps = lessonContent.length;
  const progress = ((currentStep + 1) / totalSteps) * 100;

  const handleQuizAnswer = (optionIndex, isCorrect) => {
    setSelectedAnswer(optionIndex);
    setQuizAnswers(prev => ({ ...prev, [currentStep]: isCorrect }));
    setShowExplanation(true);
  };

  const handleNextStep = () => {
    if (currentContent.type === 'quiz' && !showExplanation) {
      return; // Precisa responder o quiz primeiro
    }
    
    setShowExplanation(false);
    setSelectedAnswer(null);
    
    if (currentStep < totalSteps - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
      setShowExplanation(false);
      setSelectedAnswer(null);
    }
  };

  // Lógica do mini-jogo
  const handleGameChoice = (option) => {
    setGameChoice(option);
    if (option.consequence === 'great') {
      setGameScore(prev => prev + 2);
    } else if (option.consequence === 'ok') {
      setGameScore(prev => prev + 1);
    }
    // Não avança automaticamente - espera o usuário clicar em "Continuar"
  };

  // Função para avançar para a próxima situação do jogo
  const handleGameContinue = () => {
    if (gameScenario < decisionScenarios.length - 1) {
      setGameScenario(prev => prev + 1);
      setGameChoice(null);
    } else {
      setGameComplete(true);
    }
  };

  const completeStage = async () => {
    // IMPORTANTE: Salvar no backend PRIMEIRO (fonte de verdade)
    try {
      console.log('📤 Salvando Etapa 2 no backend...');
      await api.post('/journey/stage/1', {
        quizAnswers: quizAnswers,
        gameResult: {
          score: gameScore,
          maxScore: decisionScenarios.length * 2,
          completed: gameComplete
        }
      });
      console.log('✅ Etapa 2 salva no backend com sucesso!');
      
      // Após salvar no backend com sucesso, atualizar localStorage como cache
      const completed = JSON.parse(localStorage.getItem('journeyCompletedStages') || '[]');
      if (!completed.includes(1)) {
        completed.push(1);
        localStorage.setItem('journeyCompletedStages', JSON.stringify(completed));
      }
      
      // Adicionar XP
      const currentXP = parseInt(localStorage.getItem('journeyTotalXP') || '0');
      localStorage.setItem('journeyTotalXP', (currentXP + 100).toString());
      
      // Adicionar badge
      const badges = JSON.parse(localStorage.getItem('journeyBadges') || '[]');
      if (!badges.includes('🧠 Mentalidade Certa')) {
        badges.push('🧠 Mentalidade Certa');
        localStorage.setItem('journeyBadges', JSON.stringify(badges));
      }
      
      toast({
        title: '🎉 Etapa concluída!',
        description: '+100 XP • Selo "Mentalidade Certa" conquistado!',
      });
      
      navigate('/candidate-journey');
      
    } catch (err) {
      console.error('❌ Erro ao salvar Etapa 2 no backend:', err);
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar seu progresso. Tente novamente.',
        variant: 'destructive'
      });
    }
  };

  return (
    <>
      <Helmet>
        <title>Mentalidade de Primeiro Emprego - Jornada do Candidato</title>
      </Helmet>
      
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white">
          <div className="max-w-3xl mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <button 
                onClick={() => navigate('/candidate-journey')}
                className="flex items-center gap-2 text-white/80 hover:text-white transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
                <span>Voltar</span>
              </button>
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5" />
                <span className="font-medium">Etapa 1</span>
              </div>
            </div>
            <div className="text-center mt-4">
              <h1 className="text-2xl font-bold">Mentalidade de Primeiro Emprego</h1>
              <p className="text-amber-100 mt-1">Alinhe suas expectativas para o sucesso</p>
            </div>
          </div>
        </div>

        {/* Barra de Progresso */}
        <div className="max-w-3xl mx-auto px-4 mt-4">
          <div className="bg-white rounded-full shadow-sm p-1">
            <div className="h-2 bg-amber-100 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-amber-500 to-yellow-500 rounded-full"
                initial={{ width: '0%' }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
          <div className="text-center mt-2 text-sm text-amber-700 font-medium">
            {currentStep + 1} de {totalSteps}
          </div>
        </div>

        {/* Conteúdo */}
        <div className="max-w-3xl mx-auto px-4 py-8">
          <AnimatePresence mode="wait">
            {currentContent.type === 'info' && (
              <motion.div
                key={`info-${currentStep}`}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className="bg-white rounded-2xl shadow-xl p-6 md:p-8"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-500 flex items-center justify-center">
                    <Lightbulb className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-800">{currentContent.title}</h2>
                </div>
                
                <div className="space-y-2 text-slate-700">
                  {currentContent.content.map((line, idx) => (
                    <p key={idx} className={line === '' ? 'h-4' : ''}>{line}</p>
                  ))}
                </div>

                <div className="flex justify-between mt-8">
                  <Button
                    onClick={handlePrevStep}
                    disabled={currentStep === 0}
                    variant="outline"
                    className="border-2"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Anterior
                  </Button>
                  <Button
                    onClick={handleNextStep}
                    className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white"
                  >
                    Próximo
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </motion.div>
            )}

            {currentContent.type === 'quiz' && (
              <motion.div
                key={`quiz-${currentStep}`}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className="bg-white rounded-2xl shadow-xl p-6 md:p-8"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
                    <AlertCircle className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-800">Quiz Rápido</h2>
                </div>
                
                <p className="text-lg font-medium text-slate-700 mb-6">{currentContent.question}</p>
                
                <div className="space-y-3">
                  {currentContent.options.map((option, idx) => {
                    const isSelected = selectedAnswer === idx;
                    const showResult = showExplanation;
                    
                    return (
                      <button
                        key={idx}
                        onClick={() => !showExplanation && handleQuizAnswer(idx, option.correct)}
                        disabled={showExplanation}
                        className={`
                          w-full p-4 rounded-xl border-2 text-left transition-all duration-200
                          ${showResult && option.correct ? 'border-emerald-500 bg-emerald-50' : ''}
                          ${showResult && isSelected && !option.correct ? 'border-red-500 bg-red-50' : ''}
                          ${!showResult ? 'border-slate-200 hover:border-amber-300 hover:bg-amber-50' : ''}
                          ${isSelected && !showResult ? 'border-amber-500 bg-amber-50' : ''}
                        `}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{option.text}</span>
                          {showResult && option.correct && <Check className="w-5 h-5 text-emerald-500" />}
                          {showResult && isSelected && !option.correct && <X className="w-5 h-5 text-red-500" />}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {showExplanation && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`mt-6 p-4 rounded-xl ${quizAnswers[currentStep] ? 'bg-emerald-50 border-2 border-emerald-200' : 'bg-amber-50 border-2 border-amber-200'}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${quizAnswers[currentStep] ? 'bg-emerald-500' : 'bg-amber-500'}`}>
                        {quizAnswers[currentStep] ? <Check className="w-4 h-4 text-white" /> : <Lightbulb className="w-4 h-4 text-white" />}
                      </div>
                      <div>
                        <p className={`font-medium ${quizAnswers[currentStep] ? 'text-emerald-700' : 'text-amber-700'}`}>
                          {quizAnswers[currentStep] ? 'Correto!' : 'Quase!'}
                        </p>
                        <p className="text-slate-600 text-sm mt-1">{currentContent.explanation}</p>
                      </div>
                    </div>
                  </motion.div>
                )}

                <div className="flex justify-between mt-8">
                  <Button
                    onClick={handlePrevStep}
                    variant="outline"
                    className="border-2"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Anterior
                  </Button>
                  <Button
                    onClick={handleNextStep}
                    disabled={!showExplanation}
                    className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white"
                  >
                    Próximo
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </motion.div>
            )}

            {currentContent.type === 'game' && !gameStarted && (
              <motion.div
                key="game-intro"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className="bg-white rounded-2xl shadow-xl p-6 md:p-8 text-center"
              >
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center mx-auto mb-6">
                  <Trophy className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">{currentContent.title}</h2>
                <p className="text-slate-600 mb-8">{currentContent.description}</p>
                
                <Button
                  onClick={() => setGameStarted(true)}
                  className="bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white font-bold px-8 py-4 text-lg rounded-xl"
                >
                  Começar Mini-jogo
                  <Sparkles className="w-5 h-5 ml-2" />
                </Button>
              </motion.div>
            )}

            {currentContent.type === 'game' && gameStarted && !gameComplete && (
              <motion.div
                key={`game-${gameScenario}`}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-2xl shadow-xl p-6 md:p-8"
              >
                <div className="text-center mb-6">
                  <span className="text-sm font-medium text-rose-600 bg-rose-100 px-3 py-1 rounded-full">
                    Situação {gameScenario + 1} de {decisionScenarios.length}
                  </span>
                </div>
                
                <h3 className="text-xl font-bold text-slate-800 text-center mb-8">
                  {decisionScenarios[gameScenario].situation}
                </h3>
                
                <div className="space-y-3">
                  {decisionScenarios[gameScenario].options.map((option, idx) => (
                    <button
                      key={idx}
                      onClick={() => !gameChoice && handleGameChoice(option)}
                      disabled={!!gameChoice}
                      className={`
                        w-full p-4 rounded-xl border-2 text-left transition-all duration-300
                        ${gameChoice === option && option.consequence === 'great' ? 'border-emerald-500 bg-emerald-50' : ''}
                        ${gameChoice === option && option.consequence === 'ok' ? 'border-amber-500 bg-amber-50' : ''}
                        ${gameChoice === option && option.consequence === 'bad' ? 'border-red-500 bg-red-50' : ''}
                        ${!gameChoice ? 'border-slate-200 hover:border-rose-300 hover:bg-rose-50' : ''}
                      `}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{option.text}</span>
                        {gameChoice === option && (
                          <span className={`text-sm font-medium ${
                            option.consequence === 'great' ? 'text-emerald-600' :
                            option.consequence === 'ok' ? 'text-amber-600' : 'text-red-600'
                          }`}>
                            {option.consequence === 'great' ? '+2' : option.consequence === 'ok' ? '+1' : '0'}
                          </span>
                        )}
                      </div>
                      {gameChoice === option && (
                        <p className={`text-sm mt-2 ${
                          option.consequence === 'great' ? 'text-emerald-600' :
                          option.consequence === 'ok' ? 'text-amber-600' : 'text-red-600'
                        }`}>
                          {option.feedback}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
                
                <div className="mt-6 text-center space-y-4">
                  <span className="text-lg font-bold text-rose-600">Pontuação: {gameScore}</span>
                  
                  {/* Botão Continuar - só aparece após responder */}
                  {gameChoice && (
                    <div>
                      <Button
                        onClick={handleGameContinue}
                        className="bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white font-medium px-6 py-3 rounded-xl"
                      >
                        {gameScenario < decisionScenarios.length - 1 ? 'Próxima Situação' : 'Ver Resultado'}
                        <ChevronRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {currentContent.type === 'game' && gameComplete && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-2xl shadow-xl p-6 md:p-8 text-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200 }}
                  className="text-6xl mb-6"
                >
                  🎮
                </motion.div>
                
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Mini-jogo Concluído!</h2>
                <p className="text-slate-600 mb-4">Você fez {gameScore} de {decisionScenarios.length * 2} pontos!</p>
                
                <div className={`inline-block px-6 py-3 rounded-xl mb-8 ${
                  gameScore >= 6 ? 'bg-emerald-100 text-emerald-700' :
                  gameScore >= 4 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
                }`}>
                  <span className="font-bold text-lg">
                    {gameScore >= 6 ? '⭐ Excelente!' : gameScore >= 4 ? '👍 Muito bom!' : '💪 Continue praticando!'}
                  </span>
                </div>
                
                <div className="flex flex-wrap justify-center gap-4 mb-8">
                  <div className="bg-amber-50 border-2 border-amber-200 rounded-xl px-4 py-3">
                    <div className="text-2xl font-bold text-amber-600">+100 XP</div>
                    <div className="text-xs text-amber-700">Pontos ganhos</div>
                  </div>
                  <div className="bg-amber-50 border-2 border-amber-200 rounded-xl px-4 py-3">
                    <div className="text-lg font-bold text-amber-600">🧠 Mentalidade Certa</div>
                    <div className="text-xs text-amber-700">Selo conquistado</div>
                  </div>
                </div>
                
                <Button
                  onClick={completeStage}
                  className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white font-bold px-8 py-4 rounded-xl text-lg shadow-lg"
                >
                  Concluir Etapa
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
};

export default JourneyStage1;
