import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, ChevronLeft, ChevronRight, Check, X, 
  Sparkles, ArrowRight, Lightbulb, Clock, MessageCircle, Shirt
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import api from '@/lib/api';

// Conteúdo educativo
const lessons = [
  {
    type: 'info',
    title: 'Pontualidade: O básico que faz diferença',
    content: [
      '⏰ POR QUE PONTUALIDADE É TÃO IMPORTANTE?',
      '',
      '• É a primeira impressão que você passa',
      '• Mostra respeito pelo tempo dos outros',
      '• Demonstra organização e compromisso',
      '',
      '📍 REGRAS DE OURO:',
      '',
      '✅ Chegue 10-15 minutos antes',
      '✅ Programe o despertador com folga',
      '✅ Pesquise o trajeto no dia anterior',
      '✅ Tenha um plano B (se o ônibus atrasar)',
      '',
      '❌ NUNCA:',
      '• Chegue mais de 5 min atrasado sem avisar',
      '• Use "trânsito" como desculpa frequente'
    ]
  },
  {
    type: 'info',
    title: 'Comunicação no ambiente de trabalho',
    content: [
      '💬 COMO SE COMUNICAR BEM:',
      '',
      '✅ Use "bom dia", "por favor", "obrigado"',
      '✅ Fale de forma clara e objetiva',
      '✅ Olhe nos olhos de quem fala com você',
      '✅ Escute mais do que fala (no início)',
      '',
      '📱 CUIDADOS COM O CELULAR:',
      '',
      '• Deixe no silencioso',
      '• Não use durante reuniões',
      '• Responda mensagens pessoais só nos intervalos',
      '',
      '❌ EVITE:',
      '• Gírias excessivas',
      '• Falar alto demais',
      '• Interromper os outros',
      '• Fofocas sobre colegas'
    ]
  },
  {
    type: 'info',
    title: 'Postura e Vestimenta',
    content: [
      '👔 VESTIMENTA BÁSICA:',
      '',
      '• Roupas limpas e sem furos',
      '• Evite decotes exagerados',
      '• Prefira cores neutras no início',
      '• Sapatos limpos e adequados',
      '',
      '💡 DICA: Observe o que os outros usam!',
      'Cada empresa tem seu "dress code".',
      '',
      '🧍 POSTURA:',
      '',
      '✅ Sente-se ereto, não "jogado"',
      '✅ Não cruze os braços (parece fechado)',
      '✅ Sorria e seja simpático',
      '✅ Aperto de mão firme (não mole)',
      '',
      '⚠️ Primeiras impressões são difíceis de mudar!'
    ]
  },
  {
    type: 'info',
    title: 'Como falar com o RH',
    content: [
      '👥 O RH É SEU ALIADO, NÃO INIMIGO!',
      '',
      '✅ PODE PERGUNTAR:',
      '• Sobre benefícios (VT, VR, plano de saúde)',
      '• Horário de trabalho',
      '• Próximos passos do processo',
      '',
      '❌ EVITE PERGUNTAR NO INÍCIO:',
      '• "Quantos dias posso faltar?"',
      '• "Tem happy hour toda semana?"',
      '• "Quando posso tirar férias?"',
      '',
      '💡 DEPOIS DE CONTRATADO:',
      '• RH ajuda com dúvidas sobre contrato',
      '• Pode mediar conflitos',
      '• Orienta sobre crescimento na empresa'
    ]
  },
  {
    type: 'quiz',
    question: 'Você chegou atrasado no primeiro dia. O que fazer?',
    options: [
      { text: 'Entrar bem quietinho e discretamente fingindo que ninguém viu você chegando', correct: false },
      { text: 'Avisar o gestor do atraso, pedir desculpas sinceras e explicar brevemente o motivo', correct: true },
      { text: 'Inventar uma desculpa bem elaborada e convincente para justificar o atraso', correct: false },
      { text: 'Voltar para casa e ligar dizendo que ficou doente para não ter que explicar', correct: false }
    ],
    explanation: 'Honestidade é sempre a melhor política. Avise, peça desculpas sinceras e não deixe acontecer de novo.'
  },
  {
    type: 'quiz',
    question: 'Você não entendeu uma tarefa que seu chefe pediu. O que fazer?',
    options: [
      { text: 'Perguntar novamente de forma educada pedindo para ele explicar com mais detalhes', correct: true },
      { text: 'Tentar fazer do seu próprio jeito mesmo sem ter certeza do que foi pedido', correct: false },
      { text: 'Pedir para um colega mais experiente fazer a tarefa no seu lugar enquanto observa', correct: false },
      { text: 'Ignorar a solicitação e esperar que seu chefe esqueça que pediu aquilo para você', correct: false }
    ],
    explanation: 'Sempre pergunte quando não entender! É melhor perguntar do que fazer errado. Use: "Desculpe, posso confirmar se entendi corretamente...?"'
  },
  {
    type: 'simulator',
    title: '🎮 Simulador de Decisões',
    description: 'Faça as escolhas certas em situações do dia a dia profissional.'
  }
];

// Cenários do simulador
const simulatorScenarios = [
  {
    situation: 'É segunda-feira, 8h50. Você começa às 9h, mas o ônibus atrasou. Você vai chegar às 9h15.',
    options: [
      { 
        text: 'Ligar ou mandar mensagem avisando que vai atrasar alguns minutos por causa do ônibus', 
        result: 'great',
        feedback: 'Perfeito! Avisar mostra responsabilidade, mesmo que o atraso não seja sua culpa.'
      },
      { 
        text: 'Correr e tentar chegar o mais rápido possível sem avisar ninguém sobre o atraso', 
        result: 'bad',
        feedback: 'Sem aviso, parecem achará que você simplesmente não se importa.'
      },
      { 
        text: 'Desistir de ir trabalhar e faltar o dia inteiro já que vai chegar atrasado mesmo', 
        result: 'terrible',
        feedback: 'Nunca! 15 minutos de atraso é muito melhor que faltar.'
      }
    ]
  },
  {
    situation: 'Seu colega mais antigo está fazendo algo errado, mas você é novo. O que fazer?',
    options: [
      { 
        text: 'Ignorar completamente o erro porque não é problema seu e você acabou de chegar', 
        result: 'ok',
        feedback: 'Entendível, mas se afetar seu trabalho, pode ser problemático.'
      },
      { 
        text: 'Perguntar educadamente se ele quer ajuda ou se aceita uma sugestão sobre o assunto', 
        result: 'great',
        feedback: 'Excelente! Oferecer ajuda de forma respeitosa é a melhor abordagem.'
      },
      { 
        text: 'Contar imediatamente para o chefe sobre o erro do colega sem conversar com ele antes', 
        result: 'bad',
        feedback: 'Ir direto ao chefe sem conversar antes pode parecer "dedo-duro".'
      }
    ]
  },
  {
    situation: 'Você terminou todas as suas tarefas antes do horário. O que fazer?',
    options: [
      { 
        text: 'Ficar no celular navegando nas redes sociais até o fim do expediente chegar', 
        result: 'bad',
        feedback: 'Passa impressão de desinteresse. Evite celular no trabalho.'
      },
      { 
        text: 'Perguntar ao seu gestor se há alguma outra tarefa em que você possa ajudar', 
        result: 'great',
        feedback: 'Perfeito! Mostra proatividade e vontade de aprender.'
      },
      { 
        text: 'Ir embora mais cedo sem falar nada já que terminou todas as suas tarefas', 
        result: 'terrible',
        feedback: 'Nunca saia antes do horário sem autorização!'
      }
    ]
  },
  {
    situation: 'Um cliente está reclamando e sendo grosseiro com você. Como reagir?',
    options: [
      { 
        text: 'Manter a calma, ouvir com atenção e tentar resolver o problema do cliente', 
        result: 'great',
        feedback: 'Correto! Profissionalismo acima de tudo. Você representa a empresa.'
      },
      { 
        text: 'Responder na mesma moeda sendo grosseiro também para mostrar que não aceita isso', 
        result: 'terrible',
        feedback: 'Nunca! Você pode ser demitido por isso.'
      },
      { 
        text: 'Chamar imediatamente seu supervisor para ele lidar com a situação no seu lugar', 
        result: 'ok',
        feedback: 'Válido se você realmente não conseguir resolver sozinho.'
      }
    ]
  },
  {
    situation: 'Você está em uma reunião e não entendeu um termo técnico que usaram. O que fazer?',
    options: [
      { 
        text: 'Perguntar educadamente o significado do termo para poder acompanhar a discussão', 
        result: 'great',
        feedback: 'Ótimo! Perguntar mostra interesse em aprender.'
      },
      { 
        text: 'Fingir que entendeu tudo e depois pesquisar sozinho o que significa aquele termo', 
        result: 'ok',
        feedback: 'Pode funcionar, mas se for importante, pergunte na hora.'
      },
      { 
        text: 'Sair discretamente da reunião para ir pesquisar o termo no Google rapidamente', 
        result: 'bad',
        feedback: 'Não saia no meio da reunião! Espere ou pergunte.'
      }
    ]
  }
];

const JourneyStage4 = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [currentStep, setCurrentStep] = useState(0);
  
  // Quiz state
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showExplanation, setShowExplanation] = useState(false);
  
  // Simulator state
  const [simStarted, setSimStarted] = useState(false);
  const [simScenario, setSimScenario] = useState(0);
  const [simChoice, setSimChoice] = useState(null);
  const [simScore, setSimScore] = useState(0);
  const [simComplete, setSimComplete] = useState(false);

  const currentContent = lessons[currentStep];
  const totalSteps = lessons.length;
  const progress = ((currentStep + 1) / totalSteps) * 100;

  const handleQuizAnswer = (idx, isCorrect) => {
    setSelectedAnswer(idx);
    setShowExplanation(true);
  };

  const handleSimChoice = (option) => {
    setSimChoice(option);
    
    let points = 0;
    if (option.result === 'great') points = 3;
    else if (option.result === 'ok') points = 1;
    else if (option.result === 'bad') points = 0;
    else points = -1;
    
    setSimScore(prev => prev + points);
  };

  const handleSimContinue = () => {
    if (simScenario < simulatorScenarios.length - 1) {
      setSimScenario(prev => prev + 1);
      setSimChoice(null);
    } else {
      setSimComplete(true);
    }
  };

  const handleNextStep = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(prev => prev + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
    }
  };

  const completeStage = async () => {
    try {
      console.log('📤 Salvando Etapa 5 (Comportamento) no backend...');
      
      await api.post('/journey/stage/4', {
        simulatorResult: {
          score: simScore,
          maxScore: 15,
          completed: simComplete
        }
      });
      console.log('✅ Etapa 5 salva no backend com sucesso!');
      
      const completed = JSON.parse(localStorage.getItem('journeyCompletedStages') || '[]');
      if (!completed.includes(4)) {
        completed.push(4);
        localStorage.setItem('journeyCompletedStages', JSON.stringify(completed));
      }
      
      const currentXP = parseInt(localStorage.getItem('journeyTotalXP') || '0');
      localStorage.setItem('journeyTotalXP', (currentXP + 130).toString());
      
      const badges = JSON.parse(localStorage.getItem('journeyBadges') || '[]');
      if (!badges.includes('👔 Profissional em Formação')) {
        badges.push('👔 Profissional em Formação');
        localStorage.setItem('journeyBadges', JSON.stringify(badges));
      }
      
      toast({
        title: '🎉 Etapa concluída!',
        description: '+130 XP • Selo "Profissional em Formação" conquistado!',
      });
      
      navigate('/candidate-journey');
    } catch (err) {
      console.error('❌ Erro ao salvar Etapa 5 no backend:', err);
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar seu progresso. Tente novamente.',
        variant: 'destructive'
      });
    }
  };

  const getResultColor = (result) => {
    switch (result) {
      case 'great': return 'emerald';
      case 'ok': return 'amber';
      case 'bad': return 'orange';
      case 'terrible': return 'red';
      default: return 'slate';
    }
  };

  const getResultEmoji = (result) => {
    switch (result) {
      case 'great': return '✅';
      case 'ok': return '😐';
      case 'bad': return '⚠️';
      case 'terrible': return '❌';
      default: return '';
    }
  };

  return (
    <>
      <Helmet>
        <title>Comportamento Profissional - Jornada do Candidato</title>
      </Helmet>
      
      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50">
        {/* Header */}
        <div className="bg-gradient-to-r from-violet-500 to-purple-500 text-white">
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
                <Users className="w-5 h-5" />
                <span className="font-medium">Etapa 4</span>
              </div>
            </div>
            <div className="text-center mt-4">
              <h1 className="text-2xl font-bold">Comportamento Profissional</h1>
              <p className="text-violet-100 mt-1">Prepare-se para o mundo real</p>
            </div>
          </div>
        </div>

        {/* Barra de Progresso */}
        <div className="max-w-3xl mx-auto px-4 mt-4">
          <div className="bg-white rounded-full shadow-sm p-1">
            <div className="h-2 bg-violet-100 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full"
                initial={{ width: '0%' }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
          <div className="text-center mt-2 text-sm text-violet-700 font-medium">
            {currentStep + 1} de {totalSteps}
          </div>
        </div>

        {/* Conteúdo */}
        <div className="max-w-3xl mx-auto px-4 py-8">
          <AnimatePresence mode="wait">
            {/* Info cards */}
            {currentContent.type === 'info' && (
              <motion.div
                key={`info-${currentStep}`}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className="bg-white rounded-2xl shadow-xl p-6 md:p-8"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
                    {currentStep === 0 && <Clock className="w-6 h-6 text-white" />}
                    {currentStep === 1 && <MessageCircle className="w-6 h-6 text-white" />}
                    {currentStep === 2 && <Shirt className="w-6 h-6 text-white" />}
                    {currentStep === 3 && <Users className="w-6 h-6 text-white" />}
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
                    className="bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white"
                  >
                    Próximo
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Quiz */}
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
                    <Lightbulb className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-800">Situação</h2>
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
                          ${!showResult ? 'border-slate-200 hover:border-violet-300 hover:bg-violet-50' : ''}
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
                    className="mt-6 p-4 bg-violet-50 rounded-xl border-2 border-violet-200"
                  >
                    <p className="text-violet-700">{currentContent.explanation}</p>
                  </motion.div>
                )}

                <div className="flex justify-between mt-8">
                  <Button onClick={handlePrevStep} variant="outline" className="border-2">
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Anterior
                  </Button>
                  <Button
                    onClick={handleNextStep}
                    disabled={!showExplanation}
                    className="bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white"
                  >
                    Próximo
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Simulator intro */}
            {currentContent.type === 'simulator' && !simStarted && (
              <motion.div
                key="sim-intro"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white rounded-2xl shadow-xl p-6 md:p-8 text-center"
              >
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center mx-auto mb-6">
                  <Sparkles className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">{currentContent.title}</h2>
                <p className="text-slate-600 mb-8">{currentContent.description}</p>
                
                <Button
                  onClick={() => setSimStarted(true)}
                  className="bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white font-bold px-8 py-4 text-lg rounded-xl"
                >
                  Começar Simulação
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </motion.div>
            )}

            {/* Simulator in progress */}
            {currentContent.type === 'simulator' && simStarted && !simComplete && (
              <motion.div
                key={`sim-${simScenario}`}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-2xl shadow-xl p-6 md:p-8"
              >
                <div className="text-center mb-6">
                  <span className="text-sm font-medium text-violet-600 bg-violet-100 px-3 py-1 rounded-full">
                    Situação {simScenario + 1} de {simulatorScenarios.length}
                  </span>
                </div>
                
                <div className="bg-slate-50 rounded-xl p-5 mb-6 border-2 border-slate-200">
                  <p className="text-lg text-slate-800 font-medium">
                    {simulatorScenarios[simScenario].situation}
                  </p>
                </div>
                
                <div className="space-y-3">
                  {simulatorScenarios[simScenario].options.map((option, idx) => {
                    const isSelected = simChoice === option;
                    const color = getResultColor(option.result);
                    
                    return (
                      <button
                        key={idx}
                        onClick={() => !simChoice && handleSimChoice(option)}
                        disabled={!!simChoice}
                        className={`
                          w-full p-4 rounded-xl border-2 text-left transition-all duration-300
                          ${isSelected ? `border-${color}-500 bg-${color}-50` : ''}
                          ${!simChoice ? 'border-slate-200 hover:border-violet-300 hover:bg-violet-50' : ''}
                          ${simChoice && !isSelected ? 'opacity-50' : ''}
                        `}
                      >
                        <div className="flex items-start gap-3">
                          <span className="font-medium flex-1">{option.text}</span>
                          {isSelected && (
                            <span className="text-xl">{getResultEmoji(option.result)}</span>
                          )}
                        </div>
                        {isSelected && (
                          <motion.p
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className={`text-sm mt-2 text-${color}-700`}
                          >
                            {option.feedback}
                          </motion.p>
                        )}
                      </button>
                    );
                  })}
                </div>
                
                <div className="mt-6 text-center">
                  <span className="text-lg font-bold text-violet-600">
                    Pontuação: {simScore}
                  </span>
                </div>
                
                {/* Botão de continuar após responder */}
                {simChoice && (
                  <div className="mt-6 flex justify-center">
                    <Button
                      onClick={handleSimContinue}
                      className="bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white"
                    >
                      {simScenario < simulatorScenarios.length - 1 ? 'Próxima Situação' : 'Ver Resultado'}
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                )}
              </motion.div>
            )}

            {/* Simulator complete */}
            {currentContent.type === 'simulator' && simComplete && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-2xl shadow-xl p-6 md:p-8 text-center"
              >
                <div className="text-6xl mb-6">👔</div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Simulação Completa!</h2>
                <p className="text-slate-600 mb-4">
                  Você fez {simScore} pontos de {simulatorScenarios.length * 3} possíveis!
                </p>
                
                <div className={`inline-block px-6 py-3 rounded-xl mb-8 ${
                  simScore >= 12 ? 'bg-emerald-100 text-emerald-700' :
                  simScore >= 8 ? 'bg-amber-100 text-amber-700' : 'bg-violet-100 text-violet-700'
                }`}>
                  <span className="font-bold text-lg">
                    {simScore >= 12 ? '⭐ Excelente! Você está preparado!' : 
                     simScore >= 8 ? '👍 Muito bom! Continue praticando!' : 
                     '💪 Bom começo! Revise o conteúdo!'}
                  </span>
                </div>
                
                <div className="flex flex-wrap justify-center gap-4 mb-8">
                  <div className="bg-amber-50 border-2 border-amber-200 rounded-xl px-4 py-3">
                    <div className="text-2xl font-bold text-amber-600">+130 XP</div>
                    <div className="text-xs text-amber-700">Pontos ganhos</div>
                  </div>
                  <div className="bg-violet-50 border-2 border-violet-200 rounded-xl px-4 py-3">
                    <div className="text-lg font-bold text-violet-600">👔 Profissional em Formação</div>
                    <div className="text-xs text-violet-700">Selo conquistado</div>
                  </div>
                </div>
                
                <Button
                  onClick={completeStage}
                  className="bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white font-bold px-8 py-4 rounded-xl text-lg shadow-lg"
                >
                  Continuar Jornada
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

export default JourneyStage4;
