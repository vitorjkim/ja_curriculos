import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, ChevronLeft, ChevronRight, Check, X, 
  Sparkles, ArrowRight, Lightbulb, Mic, Star, Send
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import api from '@/lib/api';

// Perguntas clássicas de entrevista
const interviewQuestions = [
  {
    id: 1,
    question: 'Fale um pouco sobre você.',
    tips: [
      '• Seja breve (1-2 minutos)',
      '• Foque no profissional, não pessoal',
      '• Mencione sua formação e objetivos',
      '• Termine dizendo por que quer a vaga'
    ],
    goodExample: 'Meu nome é [Nome], estou terminando o Ensino Médio e busco minha primeira oportunidade profissional. Fiz cursos de informática e Excel, gosto de aprender coisas novas e sou muito organizado. Estou empolgado com esta vaga porque combina com meu perfil e me permitiria crescer na área.',
    badSignals: ['Falar da vida pessoal demais', 'Resposta muito curta ou muito longa', 'Parecer desinteressado']
  },
  {
    id: 2,
    question: 'Por que devemos te contratar?',
    tips: [
      '• Destaque suas qualidades',
      '• Conecte com a vaga',
      '• Seja confiante, não arrogante',
      '• Mostre vontade de aprender'
    ],
    goodExample: 'Acredito que vocês deveriam me contratar porque, apesar de ser meu primeiro emprego, tenho muita vontade de aprender e sou comprometido. Sou pontual, organizado e sei trabalhar em equipe. Estou disposto a dar o meu melhor para contribuir com a empresa.',
    badSignals: ['Parecer desesperado', 'Não saber responder', 'Ser arrogante']
  },
  {
    id: 3,
    question: 'Quais são seus pontos fortes?',
    tips: [
      '• Escolha 2-3 qualidades',
      '• Dê exemplos concretos',
      '• Relacione com o trabalho',
      '• Seja honesto'
    ],
    goodExample: 'Meus pontos fortes são organização e responsabilidade. Na escola, sempre fui reconhecido por entregar trabalhos no prazo e manter meus materiais em ordem. Também me considero bom em aprender rapidamente - quando fiz o curso de Excel, aprendi as funções avançadas em poucas semanas.',
    badSignals: ['Não conseguir citar nenhum', 'Citar pontos genéricos sem exemplos', 'Exagerar demais']
  },
  {
    id: 4,
    question: 'Qual é seu maior defeito ou ponto a melhorar?',
    tips: [
      '• Seja honesto mas estratégico',
      '• Mostre que está trabalhando nisso',
      '• Não cite defeitos graves',
      '• Transforme em aprendizado'
    ],
    goodExample: 'Um ponto que estou melhorando é falar em público. Fico um pouco nervoso em apresentações. Para melhorar isso, tenho me voluntariado para apresentar trabalhos na escola e participado mais nas aulas. Já melhorei bastante!',
    badSignals: ['Dizer que não tem defeitos', 'Citar algo muito grave', 'Não mostrar que está melhorando']
  },
  {
    id: 5,
    question: 'Você já teve alguma dificuldade e como superou?',
    tips: [
      '• Escolha uma situação real',
      '• Explique o que aprendeu',
      '• Mostre resiliência',
      '• Foque na solução, não no problema'
    ],
    goodExample: 'Sim, no ano passado tive dificuldade em uma matéria da escola e minhas notas caíram. Percebi que precisava mudar minha forma de estudar, então comecei a fazer resumos e pedi ajuda aos professores. Consegui recuperar as notas e aprendi que pedir ajuda é importante.',
    badSignals: ['Não conseguir pensar em nada', 'Culpar outras pessoas', 'Parecer que desiste fácil']
  }
];

// Respostas para avaliação no modo treino
const responseOptions = {
  1: [ // Fale sobre você
    { 
      text: 'Tenho 18 anos, gosto muito de jogar videogame e sair com meus amigos. Não tenho experiência mas preciso muito de um trabalho pra ter meu dinheiro.',
      score: 1,
      feedback: 'Muito focado no pessoal e mostra que quer a vaga só pelo dinheiro. Foque no profissional!'
    },
    { 
      text: 'Estou concluindo o Ensino Médio, fiz cursos de informática e Excel. Sou organizado, pontual e busco minha primeira oportunidade para desenvolver minha carreira profissional.',
      score: 3,
      feedback: 'Excelente! Breve, profissional e mostra suas qualidades.'
    },
    { 
      text: 'Para ser sincero não sei muito bem o que falar sobre mim... Sou uma pessoa normal como qualquer outra, nada de muito especial para destacar aqui.',
      score: 0,
      feedback: 'Demonstra falta de preparação. Sempre tenha uma resposta preparada!'
    }
  ],
  2: [ // Por que te contratar
    { 
      text: 'Porque eu preciso muito de um emprego urgente e vou fazer absolutamente qualquer coisa que vocês mandarem fazer, podem ter certeza disso.',
      score: 1,
      feedback: 'Parece desesperado. Foque nas suas qualidades, não na sua necessidade.'
    },
    { 
      text: 'Tenho muita vontade de aprender, sou uma pessoa comprometida e sei trabalhar em equipe. Estou disposto a dar o meu melhor para contribuir com a empresa.',
      score: 3,
      feedback: 'Perfeito! Mostra qualidades relevantes e comprometimento.'
    },
    { 
      text: 'Vocês não vão se arrepender de me contratar, podem ter certeza. Sou com certeza o melhor candidato que vocês vão conseguir encontrar por aí.',
      score: 0,
      feedback: 'Muito arrogante! Confiança é bom, arrogância não.'
    }
  ],
  3: [ // Pontos fortes
    { 
      text: 'Sinceramente sou bom em praticamente tudo que eu faço. Aprendo muito rápido qualquer coisa nova que aparecer para eu aprender.',
      score: 1,
      feedback: 'Muito genérico. Cite qualidades específicas com exemplos.'
    },
    { 
      text: 'Meus principais pontos fortes são organização e responsabilidade. Na escola, sempre fui reconhecido por entregar trabalhos no prazo e manter tudo em ordem.',
      score: 3,
      feedback: 'Ótimo! Citou qualidades específicas com exemplo concreto.'
    },
    { 
      text: 'Olha, não sei bem dizer quais são meus pontos fortes... Acho que sou uma pessoa normal como todo mundo, nada especial.',
      score: 0,
      feedback: 'Demonstra insegurança. Todo mundo tem pontos fortes, identifique os seus!'
    }
  ],
  4: [ // Pontos fracos
    { 
      text: 'Para ser bem sincero não tenho defeitos que valha a pena mencionar. Me considero uma pessoa praticamente completa e bem preparada.',
      score: 0,
      feedback: 'Falta de autoconhecimento. Todos temos pontos a melhorar.'
    },
    { 
      text: 'Sou um pouco tímido para falar em público e apresentar trabalhos, mas estou trabalhando nisso. Comecei a participar mais ativamente nas aulas para melhorar.',
      score: 3,
      feedback: 'Excelente! Honesto e mostra que está evoluindo.'
    },
    { 
      text: 'Meu maior defeito é que sou muito preguiçoso às vezes e tenho dificuldade em chegar no horário. Preciso melhorar bastante nesses pontos.',
      score: 0,
      feedback: 'Nunca cite defeitos graves como esse! Seja estratégico.'
    }
  ],
  5: [ // Dificuldade superada
    { 
      text: 'Sinceramente nunca tive dificuldades na minha vida. Sempre foi tudo bem tranquilo e fácil para mim, não tenho nada para contar sobre isso.',
      score: 0,
      feedback: 'Parece falta de experiência ou autoconhecimento. Todos enfrentamos desafios.'
    },
    { 
      text: 'Tive uma nota baixa em matemática no ano passado, mas mudei minha forma de estudar e pedi ajuda aos professores. Consegui recuperar e aprendi muito.',
      score: 3,
      feedback: 'Perfeito! Mostra problema, solução e aprendizado.'
    },
    { 
      text: 'Uma vez reprovei em uma matéria porque o professor claramente me perseguia e não gostava de mim. Foi uma situação muito injusta comigo.',
      score: 0,
      feedback: 'Evite culpar outros. Foque na sua responsabilidade e solução.'
    }
  ]
};

const JourneyStage5 = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [mode, setMode] = useState(null); // 'learn' or 'practice'
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [showTips, setShowTips] = useState(true);
  
  // Practice mode state
  const [practiceStarted, setPracticeStarted] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [practiceScore, setPracticeScore] = useState(0);
  const [practiceComplete, setPracticeComplete] = useState(false);
  
  // Write mode state
  const [writeMode, setWriteMode] = useState(false);
  const [userAnswer, setUserAnswer] = useState('');
  const [answerSubmitted, setAnswerSubmitted] = useState(false);

  const currentQ = interviewQuestions[currentQuestion];
  const progress = ((currentQuestion + 1) / interviewQuestions.length) * 100;

  const handlePracticeAnswer = (option) => {
    setSelectedAnswer(option);
    setPracticeScore(prev => prev + option.score);
  };

  const handlePracticeContinue = () => {
    if (currentQuestion < interviewQuestions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
      setSelectedAnswer(null);
    } else {
      setPracticeComplete(true);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestion < interviewQuestions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
      setShowTips(true);
      setUserAnswer('');
      setAnswerSubmitted(false);
    }
  };

  const handlePrevQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
      setShowTips(true);
      setUserAnswer('');
      setAnswerSubmitted(false);
    }
  };

  const analyzeWrittenAnswer = () => {
    // Análise simples baseada em palavras-chave e tamanho
    const answer = userAnswer.toLowerCase();
    let feedback = [];
    let score = 0;
    
    // Verificar tamanho
    if (answer.length < 50) {
      feedback.push('⚠️ Resposta muito curta. Desenvolva mais!');
    } else if (answer.length > 500) {
      feedback.push('⚠️ Resposta muito longa. Seja mais objetivo.');
    } else {
      feedback.push('✅ Tamanho adequado');
      score++;
    }
    
    // Verificar linguagem informal
    const informalWords = ['tipo', 'mano', 'véi', 'tá ligado', 'daora', 'pow', 'né'];
    if (informalWords.some(word => answer.includes(word))) {
      feedback.push('⚠️ Linguagem muito informal. Use tom profissional.');
    } else {
      feedback.push('✅ Tom adequado');
      score++;
    }
    
    // Verificar palavras positivas
    const positiveWords = ['aprender', 'desenvolver', 'contribuir', 'comprometido', 'organizado', 'responsável', 'pontual'];
    const hasPositive = positiveWords.some(word => answer.includes(word));
    if (hasPositive) {
      feedback.push('✅ Boas palavras-chave!');
      score++;
    } else {
      feedback.push('💡 Tente usar palavras como: comprometido, organizado, aprender');
    }
    
    return { feedback, score, maxScore: 3 };
  };

  const completeStage = async () => {
    try {
      console.log('📤 Salvando Etapa 6 (Entrevista) no backend...');
      
      await api.post('/journey/stage/5', {
        practiceResult: {
          score: practiceScore,
          maxScore: 15,
          completed: practiceComplete
        },
        mode: mode
      });
      console.log('✅ Etapa 6 salva no backend com sucesso!');
      
      const completed = JSON.parse(localStorage.getItem('journeyCompletedStages') || '[]');
      if (!completed.includes(5)) {
        completed.push(5);
        localStorage.setItem('journeyCompletedStages', JSON.stringify(completed));
      }
      
      const currentXP = parseInt(localStorage.getItem('journeyTotalXP') || '0');
      localStorage.setItem('journeyTotalXP', (currentXP + 200).toString());
      
      const badges = JSON.parse(localStorage.getItem('journeyBadges') || '[]');
      if (!badges.includes('🎤 Entrevistável')) {
        badges.push('🎤 Entrevistável');
        localStorage.setItem('journeyBadges', JSON.stringify(badges));
      }
      
      toast({
        title: '🎉 Etapa concluída!',
        description: '+200 XP • Selo "Entrevistável" conquistado!',
      });
      
      navigate('/candidate-journey');
    } catch (err) {
      console.error('❌ Erro ao salvar Etapa 6 no backend:', err);
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
        <title>Entrevista de Emprego - Jornada do Candidato</title>
      </Helmet>
      
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-fuchsia-50">
        {/* Header */}
        <div className="bg-gradient-to-r from-rose-500 to-pink-500 text-white">
          <div className="max-w-3xl mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <button 
                onClick={() => mode ? setMode(null) : navigate('/candidate-journey')}
                className="flex items-center gap-2 text-white/80 hover:text-white transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
                <span>Voltar</span>
              </button>
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                <span className="font-medium">Etapa 5</span>
              </div>
            </div>
            <div className="text-center mt-4">
              <h1 className="text-2xl font-bold">Entrevista de Emprego</h1>
              <p className="text-rose-100 mt-1">O ponto alto da jornada</p>
            </div>
          </div>
        </div>

        {/* Conteúdo */}
        <div className="max-w-3xl mx-auto px-4 py-8">
          <AnimatePresence mode="wait">
            {/* Mode selection */}
            {!mode && (
              <motion.div
                key="mode-select"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-4"
              >
                <div className="bg-white rounded-2xl shadow-xl p-6 text-center mb-6">
                  <Mic className="w-16 h-16 text-rose-500 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-slate-800 mb-2">Simulação de Entrevista</h2>
                  <p className="text-slate-600">Pratique as perguntas mais comuns de entrevistas de emprego</p>
                </div>
                
                <div 
                  onClick={() => setMode('learn')}
                  className="bg-white rounded-2xl shadow-lg p-6 cursor-pointer hover:shadow-xl transition-all border-2 border-transparent hover:border-rose-300"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-rose-400 to-pink-400 flex items-center justify-center">
                      <Lightbulb className="w-7 h-7 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-slate-800">📚 Modo Aprender</h3>
                      <p className="text-slate-600 text-sm">Veja dicas e exemplos de boas respostas para cada pergunta</p>
                    </div>
                    <ChevronRight className="w-6 h-6 text-slate-400" />
                  </div>
                </div>
                
                <div 
                  onClick={() => { setMode('practice'); setPracticeStarted(true); }}
                  className="bg-white rounded-2xl shadow-lg p-6 cursor-pointer hover:shadow-xl transition-all border-2 border-transparent hover:border-rose-300"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center">
                      <Sparkles className="w-7 h-7 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-slate-800">🎮 Modo Treino</h3>
                      <p className="text-slate-600 text-sm">Teste seus conhecimentos escolhendo as melhores respostas</p>
                    </div>
                    <ChevronRight className="w-6 h-6 text-slate-400" />
                  </div>
                </div>
              </motion.div>
            )}

            {/* Learn mode */}
            {mode === 'learn' && (
              <motion.div
                key={`learn-${currentQuestion}`}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
              >
                {/* Progress */}
                <div className="bg-white rounded-full shadow-sm p-1 mb-4">
                  <div className="h-2 bg-rose-100 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-rose-500 to-pink-500 rounded-full"
                      animate={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
                
                <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
                  <div className="text-center mb-6">
                    <span className="text-sm font-medium text-rose-600 bg-rose-100 px-3 py-1 rounded-full">
                      Pergunta {currentQuestion + 1} de {interviewQuestions.length}
                    </span>
                  </div>
                  
                  {/* Question */}
                  <div className="bg-rose-50 rounded-xl p-5 mb-6 border-2 border-rose-200">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-rose-500 flex items-center justify-center flex-shrink-0">
                        <MessageSquare className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-sm text-rose-600 font-medium mb-1">Entrevistador pergunta:</p>
                        <p className="text-lg font-bold text-slate-800">"{currentQ.question}"</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Tips */}
                  {showTips && (
                    <div className="mb-6">
                      <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                        <Lightbulb className="w-5 h-5 text-amber-500" />
                        Dicas para responder:
                      </h3>
                      <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                        {currentQ.tips.map((tip, idx) => (
                          <p key={idx} className="text-amber-800 text-sm">{tip}</p>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Good example */}
                  <div className="mb-6">
                    <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                      <Check className="w-5 h-5 text-emerald-500" />
                      Exemplo de boa resposta:
                    </h3>
                    <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
                      <p className="text-emerald-800 text-sm italic">"{currentQ.goodExample}"</p>
                    </div>
                  </div>
                  
                  {/* Bad signals */}
                  <div className="mb-6">
                    <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                      <X className="w-5 h-5 text-red-500" />
                      O que evitar:
                    </h3>
                    <div className="bg-red-50 rounded-xl p-4 border border-red-200">
                      {currentQ.badSignals.map((signal, idx) => (
                        <p key={idx} className="text-red-700 text-sm">❌ {signal}</p>
                      ))}
                    </div>
                  </div>
                  
                  {/* Write your answer */}
                  <div className="mb-6">
                    <button
                      onClick={() => setWriteMode(!writeMode)}
                      className="text-rose-600 font-medium text-sm hover:underline"
                    >
                      ✍️ {writeMode ? 'Esconder' : 'Escrever minha resposta e receber feedback'}
                    </button>
                    
                    {writeMode && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mt-4"
                      >
                        <Textarea
                          value={userAnswer}
                          onChange={(e) => setUserAnswer(e.target.value)}
                          placeholder="Escreva aqui como você responderia..."
                          className="min-h-[120px] border-2 border-rose-200 focus:border-rose-400"
                        />
                        {!answerSubmitted ? (
                          <Button
                            onClick={() => setAnswerSubmitted(true)}
                            disabled={userAnswer.length < 20}
                            className="mt-3 bg-rose-500 hover:bg-rose-600 text-white"
                          >
                            <Send className="w-4 h-4 mr-2" />
                            Analisar Resposta
                          </Button>
                        ) : (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="mt-3 bg-slate-50 rounded-xl p-4 border-2 border-slate-200"
                          >
                            <h4 className="font-bold text-slate-800 mb-2">Análise da sua resposta:</h4>
                            {analyzeWrittenAnswer().feedback.map((fb, idx) => (
                              <p key={idx} className="text-sm text-slate-700">{fb}</p>
                            ))}
                            <p className="text-sm font-bold mt-2 text-rose-600">
                              Pontuação: {analyzeWrittenAnswer().score}/{analyzeWrittenAnswer().maxScore}
                            </p>
                          </motion.div>
                        )}
                      </motion.div>
                    )}
                  </div>
                  
                  {/* Navigation */}
                  <div className="flex justify-between">
                    <Button onClick={handlePrevQuestion} disabled={currentQuestion === 0} variant="outline" className="border-2">
                      <ChevronLeft className="w-4 h-4 mr-1" />
                      Anterior
                    </Button>
                    {currentQuestion < interviewQuestions.length - 1 ? (
                      <Button onClick={handleNextQuestion} className="bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white">
                        Próxima
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    ) : (
                      <Button onClick={completeStage} className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white">
                        Concluir Etapa
                        <Check className="w-4 h-4 ml-1" />
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Practice mode */}
            {mode === 'practice' && !practiceComplete && (
              <motion.div
                key={`practice-${currentQuestion}`}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <div className="bg-white rounded-full shadow-sm p-1 mb-4">
                  <div className="h-2 bg-rose-100 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-rose-500 to-pink-500 rounded-full"
                      animate={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
                
                <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
                  <div className="text-center mb-6">
                    <span className="text-sm font-medium text-rose-600 bg-rose-100 px-3 py-1 rounded-full">
                      Pergunta {currentQuestion + 1} de {interviewQuestions.length}
                    </span>
                  </div>
                  
                  <div className="bg-rose-50 rounded-xl p-5 mb-6 border-2 border-rose-200">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-rose-500 flex items-center justify-center flex-shrink-0">
                        <MessageSquare className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-sm text-rose-600 font-medium mb-1">Entrevistador pergunta:</p>
                        <p className="text-lg font-bold text-slate-800">"{currentQ.question}"</p>
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-slate-700 font-medium mb-4">Escolha a melhor resposta:</p>
                  
                  <div className="space-y-3">
                    {responseOptions[currentQ.id]?.map((option, idx) => {
                      const isSelected = selectedAnswer === option;
                      
                      return (
                        <button
                          key={idx}
                          onClick={() => !selectedAnswer && handlePracticeAnswer(option)}
                          disabled={!!selectedAnswer}
                          className={`
                            w-full p-4 rounded-xl border-2 text-left transition-all
                            ${isSelected && option.score === 3 ? 'border-emerald-500 bg-emerald-50' : ''}
                            ${isSelected && option.score === 1 ? 'border-amber-500 bg-amber-50' : ''}
                            ${isSelected && option.score === 0 ? 'border-red-500 bg-red-50' : ''}
                            ${!selectedAnswer ? 'border-slate-200 hover:border-rose-300 hover:bg-rose-50' : ''}
                            ${selectedAnswer && !isSelected ? 'opacity-50' : ''}
                          `}
                        >
                          <p className="font-medium text-slate-700">{option.text}</p>
                          {isSelected && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              className={`mt-2 text-sm ${
                                option.score === 3 ? 'text-emerald-700' :
                                option.score === 1 ? 'text-amber-700' : 'text-red-700'
                              }`}
                            >
                              <p className="font-medium">
                                {option.score === 3 ? '✅ Excelente!' : option.score === 1 ? '😐 Pode melhorar' : '❌ Evite isso'}
                              </p>
                              <p>{option.feedback}</p>
                            </motion.div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  
                  <div className="mt-6 text-center">
                    <span className="text-lg font-bold text-rose-600">
                      Pontuação: {practiceScore} / {(currentQuestion + (selectedAnswer ? 1 : 0)) * 3}
                    </span>
                  </div>
                  
                  {/* Botão de continuar após responder */}
                  {selectedAnswer && (
                    <div className="mt-6 flex justify-center">
                      <Button
                        onClick={handlePracticeContinue}
                        className="bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white"
                      >
                        {currentQuestion < interviewQuestions.length - 1 ? 'Próxima Pergunta' : 'Ver Resultado'}
                        <ChevronRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Practice complete */}
            {mode === 'practice' && practiceComplete && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-2xl shadow-xl p-6 md:p-8 text-center"
              >
                <div className="text-6xl mb-6">🎤</div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Simulação Completa!</h2>
                <p className="text-slate-600 mb-4">
                  Você fez {practiceScore} de {interviewQuestions.length * 3} pontos!
                </p>
                
                <div className={`inline-block px-6 py-3 rounded-xl mb-8 ${
                  practiceScore >= 12 ? 'bg-emerald-100 text-emerald-700' :
                  practiceScore >= 8 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
                }`}>
                  <span className="font-bold text-lg">
                    {practiceScore >= 12 ? '⭐ Excelente! Você está pronto para entrevistas!' : 
                     practiceScore >= 8 ? '👍 Bom trabalho! Revise as dicas!' : 
                     '💪 Continue praticando! Volte ao Modo Aprender.'}
                  </span>
                </div>
                
                <div className="flex flex-wrap justify-center gap-4 mb-8">
                  <div className="bg-amber-50 border-2 border-amber-200 rounded-xl px-4 py-3">
                    <div className="text-2xl font-bold text-amber-600">+200 XP</div>
                    <div className="text-xs text-amber-700">Pontos ganhos</div>
                  </div>
                  <div className="bg-rose-50 border-2 border-rose-200 rounded-xl px-4 py-3">
                    <div className="text-lg font-bold text-rose-600">🎤 Entrevistável</div>
                    <div className="text-xs text-rose-700">Selo conquistado</div>
                  </div>
                </div>
                
                <Button
                  onClick={completeStage}
                  className="bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white font-bold px-8 py-4 rounded-xl text-lg shadow-lg"
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

export default JourneyStage5;
