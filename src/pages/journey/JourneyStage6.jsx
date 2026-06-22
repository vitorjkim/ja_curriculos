import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Heart, ChevronLeft, ChevronRight, Check, 
  Sparkles, ArrowRight, Mail, Clock, RefreshCw, Award, Trophy
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import api from '@/lib/api';

// Conteúdo informativo
const infoCards = [
  {
    id: 'behavior',
    title: 'Comportamento Pós-Entrevista',
    icon: '🤝',
    color: 'from-violet-400 to-purple-400',
    content: [
      {
        title: 'Agradeça pela oportunidade',
        desc: 'Envie uma mensagem de agradecimento em até 24h após a entrevista. Isso mostra profissionalismo e interesse genuíno.'
      },
      {
        title: 'Espere o prazo informado',
        desc: 'Respeite o prazo que o entrevistador deu para retorno. Não fique ligando ou mandando mensagens antes disso.'
      },
      {
        title: 'Mantenha-se disponível',
        desc: 'Fique atento ao telefone e e-mail. Se tiver que se ausentar, avise alguém para anotar recados.'
      },
      {
        title: 'Continue se candidatando',
        desc: 'Nunca dependa de uma única vaga. Continue buscando outras oportunidades enquanto espera.'
      }
    ]
  },
  {
    id: 'message',
    title: 'Mensagem de Agradecimento',
    icon: '💌',
    color: 'from-pink-400 to-rose-400',
    content: [
      {
        title: 'Seja breve e sincero',
        desc: 'A mensagem deve ser curta (3-5 linhas). Agradeça pela conversa e reforce seu interesse.'
      },
      {
        title: 'Personalize a mensagem',
        desc: 'Mencione algo específico que foi discutido na entrevista. Mostra que você estava atento.'
      },
      {
        title: 'Reafirme suas qualidades',
        desc: 'Lembre brevemente por que você é um bom candidato, sem ser repetitivo.'
      },
      {
        title: 'Exemplo de mensagem',
        desc: '"Olá [Nome], obrigado pela entrevista de hoje. Fiquei muito interessado na vaga e acredito que minhas habilidades de organização seriam úteis para a equipe. Agradeço a oportunidade e fico à disposição!"'
      }
    ]
  },
  {
    id: 'rejection',
    title: 'Lidando com Rejeição',
    icon: '💪',
    color: 'from-amber-400 to-orange-400',
    content: [
      {
        title: 'É normal e faz parte',
        desc: 'Ninguém é aprovado em todas as entrevistas. Até profissionais experientes recebem "nãos". Isso não define seu valor!'
      },
      {
        title: 'Peça feedback',
        desc: 'Pergunte educadamente o que poderia melhorar. Algumas empresas dão dicas valiosas.'
      },
      {
        title: 'Não leve para o pessoal',
        desc: 'A rejeição pode ser por vários motivos que não têm nada a ver com você (ex: candidato interno).'
      },
      {
        title: 'Aprenda e siga em frente',
        desc: 'Reflita sobre o que poderia fazer diferente e use isso na próxima entrevista. Persistência vence!'
      }
    ]
  },
  {
    id: 'persistence',
    title: 'O Poder da Persistência',
    icon: '🚀',
    color: 'from-emerald-400 to-teal-400',
    content: [
      {
        title: 'Estatísticas reais',
        desc: 'Em média, candidatos a primeiro emprego fazem 15-30 entrevistas antes de serem contratados. É uma maratona, não corrida de 100m!'
      },
      {
        title: 'Cada "não" é aprendizado',
        desc: 'Quanto mais entrevistas você faz, melhor você fica. O "não" de hoje te prepara para o "sim" de amanhã.'
      },
      {
        title: 'Histórias de sucesso',
        desc: 'Muitas pessoas de sucesso foram rejeitadas inúmeras vezes. Walt Disney foi demitido por "falta de criatividade"!'
      },
      {
        title: 'Mantenha a autoestima',
        desc: 'Celebre cada entrevista que conseguir. Isso já é uma conquista! Você está mais perto do sim.'
      }
    ]
  }
];

// Quiz sobre comportamento pós-entrevista
const quizQuestions = [
  {
    question: 'Quanto tempo após a entrevista você deve enviar uma mensagem de agradecimento?',
    options: [
      { text: 'Imediatamente ao sair da empresa, no mesmo minuto em que terminar a entrevista', correct: false },
      { text: 'Em até 24 horas após a entrevista, mostrando profissionalismo e interesse na vaga', correct: true },
      { text: 'Depois de pelo menos uma semana para não parecer ansioso demais com o resultado', correct: false },
      { text: 'Nunca se deve enviar agradecimento, isso parece que você está sendo "puxa-saco"', correct: false }
    ],
    explanation: 'Em até 24h é o ideal. Mostra profissionalismo sem parecer desesperado.'
  },
  {
    question: 'O entrevistador disse que daria retorno em 5 dias úteis. Já faz 3 dias. O que fazer?',
    options: [
      { text: 'Ligar todo dia para a empresa perguntando se já tem uma resposta sobre a vaga', correct: false },
      { text: 'Mandar uma mensagem dizendo que está muito ansioso e precisa muito desse trabalho', correct: false },
      { text: 'Aguardar pacientemente até completar os 5 dias úteis que foram combinados na entrevista', correct: true },
      { text: 'Ir pessoalmente até a empresa para conversar com o entrevistador sobre o resultado', correct: false }
    ],
    explanation: 'Respeite o prazo combinado. Ansiedade demais passa uma imagem negativa.'
  },
  {
    question: 'Você foi rejeitado em uma vaga. Qual a melhor atitude?',
    options: [
      { text: 'Desistir completamente de procurar emprego porque ninguém vai te contratar mesmo', correct: false },
      { text: 'Agradecer pela oportunidade, pedir feedback educadamente e continuar buscando vagas', correct: true },
      { text: 'Reclamar nas redes sociais sobre como a empresa foi injusta na seleção dos candidatos', correct: false },
      { text: 'Ficar ligando repetidamente para a empresa pedindo para reconsiderarem a decisão', correct: false }
    ],
    explanation: 'Agradecer mostra maturidade, e o feedback ajuda a melhorar nas próximas.'
  },
  {
    question: 'Enquanto espera o resultado de uma entrevista, você deve:',
    options: [
      { text: 'Parar completamente de procurar outras vagas e esperar o resultado dessa entrevista', correct: false },
      { text: 'Continuar se candidatando a outras vagas enquanto aguarda o retorno desta empresa', correct: true },
      { text: 'Contar para todo mundo que você já conseguiu o emprego antes de ter a confirmação', correct: false },
      { text: 'Fazer planos detalhados de como você vai gastar o salário quando começar a trabalhar', correct: false }
    ],
    explanation: 'Nunca coloque todos os ovos na mesma cesta! Continue buscando até ter a confirmação.'
  }
];

// Mini-jogo: Ordenar etapas pós-entrevista
const orderingGame = {
  correctOrder: [
    { id: 1, text: 'Agradecer pela entrevista (em 24h)' },
    { id: 2, text: 'Aguardar o prazo combinado' },
    { id: 3, text: 'Se não houver retorno, fazer follow-up educado' },
    { id: 4, text: 'Continuar buscando outras vagas' },
    { id: 5, text: 'Se aprovado, confirmar e esclarecer dúvidas' },
    { id: 6, text: 'Se rejeitado, agradecer e pedir feedback' }
  ]
};

const JourneyStage6 = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [step, setStep] = useState(0); // 0-3: info cards, 4: quiz, 5: ordering game, 6: complete
  const [expandedCard, setExpandedCard] = useState(null);
  
  // Quiz state
  const [currentQuiz, setCurrentQuiz] = useState(0);
  const [quizAnswered, setQuizAnswered] = useState(false);
  const [quizScore, setQuizScore] = useState(0);
  
  // Ordering game state
  const [shuffledItems, setShuffledItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [orderingComplete, setOrderingComplete] = useState(false);
  const [orderingScore, setOrderingScore] = useState(0);

  const progress = ((step + 1) / 7) * 100;

  const handleQuizAnswer = (option) => {
    setQuizAnswered(true);
    if (option.correct) {
      setQuizScore(prev => prev + 1);
    }
  };

  const handleNextQuiz = () => {
    if (currentQuiz < quizQuestions.length - 1) {
      setCurrentQuiz(prev => prev + 1);
      setQuizAnswered(false);
    } else {
      setStep(5);
      // Inicializar jogo de ordenação
      const shuffled = [...orderingGame.correctOrder].sort(() => Math.random() - 0.5);
      setShuffledItems(shuffled);
    }
  };

  const handleSelectItem = (item) => {
    if (selectedItems.find(i => i.id === item.id)) {
      setSelectedItems(prev => prev.filter(i => i.id !== item.id));
      setShuffledItems(prev => [...prev, item].sort((a, b) => a.id - b.id));
    } else {
      setSelectedItems(prev => [...prev, item]);
      setShuffledItems(prev => prev.filter(i => i.id !== item.id));
    }
  };

  const checkOrder = () => {
    let score = 0;
    selectedItems.forEach((item, idx) => {
      if (item.id === orderingGame.correctOrder[idx].id) {
        score++;
      }
    });
    setOrderingScore(score);
    setOrderingComplete(true);
  };

  const completeStage = async () => {
    try {
      console.log('📤 Salvando Etapa 7 (Pós-Entrevista) no backend...');
      
      await api.post('/journey/stage/6', {
        quizResult: {
          score: quizScore,
          maxScore: 4
        },
        orderingResult: {
          score: orderingScore,
          maxScore: 6,
          completed: orderingComplete
        }
      });
      console.log('✅ Etapa 7 salva no backend com sucesso!');
      
      const completed = JSON.parse(localStorage.getItem('journeyCompletedStages') || '[]');
      if (!completed.includes(6)) {
        completed.push(6);
        localStorage.setItem('journeyCompletedStages', JSON.stringify(completed));
      }
      
      const currentXP = parseInt(localStorage.getItem('journeyTotalXP') || '0');
      localStorage.setItem('journeyTotalXP', (currentXP + 100).toString());
      
      const badges = JSON.parse(localStorage.getItem('journeyBadges') || '[]');
      if (!badges.includes('💪 Persistente')) {
        badges.push('💪 Persistente');
        localStorage.setItem('journeyBadges', JSON.stringify(badges));
      }
      
      toast({
        title: '🎉 Etapa concluída!',
        description: '+100 XP • Selo "Persistente" conquistado!',
      });
      
      navigate('/candidate-journey');
    } catch (err) {
      console.error('❌ Erro ao salvar Etapa 7 no backend:', err);
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
        <title>Pós-Entrevista - Jornada do Candidato</title>
      </Helmet>
      
      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50">
        {/* Header */}
        <div className="bg-gradient-to-r from-violet-500 to-purple-500 text-white">
          <div className="max-w-3xl mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <button 
                onClick={() => step > 0 ? setStep(0) : navigate('/candidate-journey')}
                className="flex items-center gap-2 text-white/80 hover:text-white transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
                <span>Voltar</span>
              </button>
              <div className="flex items-center gap-2">
                <Heart className="w-5 h-5" />
                <span className="font-medium">Etapa 6</span>
              </div>
            </div>
            <div className="text-center mt-4">
              <h1 className="text-2xl font-bold">Pós-Entrevista e Acompanhamento</h1>
              <p className="text-violet-100 mt-1">A etapa final da jornada</p>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="bg-white rounded-full shadow-sm p-1">
            <div className="h-2 bg-violet-100 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full"
                animate={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Conteúdo */}
        <div className="max-w-3xl mx-auto px-4 py-4">
          <AnimatePresence mode="wait">
            {/* Info Cards (steps 0-3) */}
            {step >= 0 && step <= 3 && (
              <motion.div
                key={`info-${step}`}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
              >
                <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                  {/* Card header */}
                  <div className={`bg-gradient-to-r ${infoCards[step].color} p-6 text-white text-center`}>
                    <span className="text-5xl mb-2 block">{infoCards[step].icon}</span>
                    <h2 className="text-xl font-bold">{infoCards[step].title}</h2>
                  </div>
                  
                  {/* Content */}
                  <div className="p-6 space-y-4">
                    {infoCards[step].content.map((item, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="bg-slate-50 rounded-xl p-4 border border-slate-200"
                      >
                        <h3 className="font-bold text-slate-800 mb-1">{item.title}</h3>
                        <p className="text-slate-600 text-sm">{item.desc}</p>
                      </motion.div>
                    ))}
                  </div>
                  
                  {/* Navigation */}
                  <div className="p-6 bg-slate-50 border-t flex justify-between">
                    <Button 
                      onClick={() => setStep(prev => prev - 1)} 
                      disabled={step === 0}
                      variant="outline" 
                      className="border-2"
                    >
                      <ChevronLeft className="w-4 h-4 mr-1" />
                      Anterior
                    </Button>
                    <Button 
                      onClick={() => setStep(prev => prev + 1)}
                      className="bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white"
                    >
                      {step < 3 ? 'Próximo' : 'Quiz Final'}
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Quiz (step 4) */}
            {step === 4 && (
              <motion.div
                key="quiz"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="bg-white rounded-2xl shadow-xl p-6">
                  <div className="text-center mb-6">
                    <span className="text-4xl mb-2 block">📝</span>
                    <h2 className="text-xl font-bold text-slate-800">Quiz de Fixação</h2>
                    <p className="text-slate-600">Pergunta {currentQuiz + 1} de {quizQuestions.length}</p>
                  </div>
                  
                  <div className="bg-violet-50 rounded-xl p-4 mb-6 border-2 border-violet-200">
                    <p className="font-medium text-violet-900">{quizQuestions[currentQuiz].question}</p>
                  </div>
                  
                  <div className="space-y-3">
                    {quizQuestions[currentQuiz].options.map((option, idx) => {
                      const isCorrect = option.correct;
                      const showResult = quizAnswered;
                      
                      return (
                        <button
                          key={idx}
                          onClick={() => !quizAnswered && handleQuizAnswer(option)}
                          disabled={quizAnswered}
                          className={`
                            w-full p-4 rounded-xl border-2 text-left transition-all
                            ${showResult && isCorrect ? 'border-emerald-500 bg-emerald-50' : ''}
                            ${showResult && !isCorrect ? 'border-slate-300 bg-slate-50 opacity-50' : ''}
                            ${!showResult ? 'border-slate-200 hover:border-violet-300 hover:bg-violet-50' : ''}
                          `}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`
                              w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                              ${showResult && isCorrect ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600'}
                            `}>
                              {showResult && isCorrect ? <Check className="w-4 h-4" /> : String.fromCharCode(65 + idx)}
                            </div>
                            <span className="font-medium text-slate-700">{option.text}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  
                  {quizAnswered && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-4 bg-emerald-50 rounded-xl p-4 border border-emerald-200"
                    >
                      <p className="text-emerald-700 text-sm">
                        💡 {quizQuestions[currentQuiz].explanation}
                      </p>
                    </motion.div>
                  )}
                  
                  {quizAnswered && (
                    <div className="mt-6 text-center">
                      <Button 
                        onClick={handleNextQuiz}
                        className="bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white"
                      >
                        {currentQuiz < quizQuestions.length - 1 ? 'Próxima Pergunta' : 'Jogo Final'}
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  )}
                  
                  <div className="mt-6 text-center">
                    <span className="text-violet-600 font-medium">
                      Acertos: {quizScore} / {currentQuiz + (quizAnswered ? 1 : 0)}
                    </span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Ordering Game (step 5) */}
            {step === 5 && (
              <motion.div
                key="ordering"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="bg-white rounded-2xl shadow-xl p-6">
                  <div className="text-center mb-6">
                    <span className="text-4xl mb-2 block">🔢</span>
                    <h2 className="text-xl font-bold text-slate-800">Ordene as Etapas</h2>
                    <p className="text-slate-600">Coloque na ordem correta as ações pós-entrevista</p>
                  </div>
                  
                  {/* Selected items (ordered) */}
                  <div className="mb-6">
                    <p className="text-sm font-medium text-slate-600 mb-2">Sua ordem (clique para selecionar):</p>
                    <div className="min-h-[200px] bg-emerald-50 rounded-xl p-4 border-2 border-dashed border-emerald-300">
                      {selectedItems.length === 0 ? (
                        <p className="text-emerald-600 text-sm text-center py-8">Clique nos itens abaixo para ordená-los aqui</p>
                      ) : (
                        <div className="space-y-2">
                          {selectedItems.map((item, idx) => (
                            <motion.div
                              key={item.id}
                              layout
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              onClick={() => !orderingComplete && handleSelectItem(item)}
                              className={`
                                p-3 rounded-lg border-2 cursor-pointer flex items-center gap-3
                                ${orderingComplete && item.id === orderingGame.correctOrder[idx].id 
                                  ? 'bg-emerald-100 border-emerald-500' 
                                  : orderingComplete 
                                    ? 'bg-red-100 border-red-500' 
                                    : 'bg-white border-emerald-300'}
                              `}
                            >
                              <span className="w-6 h-6 rounded-full bg-emerald-500 text-white text-sm flex items-center justify-center font-bold">
                                {idx + 1}
                              </span>
                              <span className="text-sm font-medium text-slate-700">{item.text}</span>
                              {orderingComplete && (
                                <span className="ml-auto">
                                  {item.id === orderingGame.correctOrder[idx].id 
                                    ? <Check className="w-5 h-5 text-emerald-600" /> 
                                    : <RefreshCw className="w-5 h-5 text-red-600" />}
                                </span>
                              )}
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Available items */}
                  <div>
                    <p className="text-sm font-medium text-slate-600 mb-2">Itens disponíveis:</p>
                    <div className="bg-slate-50 rounded-xl p-4 border-2 border-slate-200 min-h-[100px]">
                      {shuffledItems.length === 0 && !orderingComplete ? (
                        <p className="text-slate-500 text-sm text-center py-4">Todos os itens foram selecionados!</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {shuffledItems.map((item) => (
                            <motion.button
                              key={item.id}
                              layout
                              onClick={() => !orderingComplete && handleSelectItem(item)}
                              className="px-3 py-2 bg-white rounded-lg border-2 border-slate-300 text-sm font-medium text-slate-700 hover:border-violet-400 hover:bg-violet-50 transition-all"
                            >
                              {item.text}
                            </motion.button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {!orderingComplete && selectedItems.length === 6 && (
                    <div className="mt-6 text-center">
                      <Button 
                        onClick={checkOrder}
                        className="bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white"
                      >
                        Verificar Ordem
                        <Check className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  )}
                  
                  {orderingComplete && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-6 text-center"
                    >
                      <div className={`
                        inline-block px-6 py-3 rounded-xl mb-4
                        ${orderingScore >= 5 ? 'bg-emerald-100 text-emerald-700' : 
                          orderingScore >= 3 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}
                      `}>
                        <span className="font-bold">
                          {orderingScore >= 5 ? '⭐ Excelente! ' : orderingScore >= 3 ? '👍 Bom! ' : '💪 Continue praticando! '}
                          Você acertou {orderingScore} de 6!
                        </span>
                      </div>
                      <div className="block">
                        <Button 
                          onClick={() => setStep(6)}
                          className="bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white"
                        >
                          Ver Conclusão
                          <ArrowRight className="w-4 h-4 ml-1" />
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Completion (step 6) */}
            {step === 6 && (
              <motion.div
                key="complete"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
                  <motion.div
                    initial={{ rotate: 0 }}
                    animate={{ rotate: [0, 10, -10, 10, 0] }}
                    transition={{ delay: 0.3 }}
                    className="text-7xl mb-6"
                  >
                    🏆
                  </motion.div>
                  
                  <h2 className="text-3xl font-bold text-slate-800 mb-2">Parabéns!</h2>
                  <p className="text-slate-600 text-lg mb-6">
                    Você completou a última etapa da Jornada do Candidato!
                  </p>
                  
                  <div className="bg-gradient-to-r from-violet-100 to-purple-100 rounded-2xl p-6 mb-6">
                    <h3 className="font-bold text-violet-800 mb-4">O que você aprendeu:</h3>
                    <div className="grid gap-2 text-left">
                      <div className="flex items-center gap-2 text-violet-700">
                        <Check className="w-5 h-5 text-violet-500" />
                        <span>Comportamento correto após a entrevista</span>
                      </div>
                      <div className="flex items-center gap-2 text-violet-700">
                        <Check className="w-5 h-5 text-violet-500" />
                        <span>Como escrever mensagens de agradecimento</span>
                      </div>
                      <div className="flex items-center gap-2 text-violet-700">
                        <Check className="w-5 h-5 text-violet-500" />
                        <span>Como lidar com rejeição de forma madura</span>
                      </div>
                      <div className="flex items-center gap-2 text-violet-700">
                        <Check className="w-5 h-5 text-violet-500" />
                        <span>A importância da persistência</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap justify-center gap-4 mb-8">
                    <div className="bg-amber-50 border-2 border-amber-200 rounded-xl px-4 py-3">
                      <div className="text-2xl font-bold text-amber-600">+100 XP</div>
                      <div className="text-xs text-amber-700">Pontos ganhos</div>
                    </div>
                    <div className="bg-violet-50 border-2 border-violet-200 rounded-xl px-4 py-3">
                      <div className="text-lg font-bold text-violet-600">💪 Persistente</div>
                      <div className="text-xs text-violet-700">Selo conquistado</div>
                    </div>
                  </div>
                  
                  <div className="bg-emerald-50 border-2 border-emerald-200 rounded-xl p-4 mb-6">
                    <div className="flex items-center justify-center gap-2 text-emerald-700 font-bold">
                      <Trophy className="w-6 h-6" />
                      <span>Você completou toda a jornada!</span>
                      <Trophy className="w-6 h-6" />
                    </div>
                    <p className="text-emerald-600 text-sm mt-1">
                      Volte à página principal para gerar seu certificado de conclusão!
                    </p>
                  </div>
                  
                  <Button
                    onClick={completeStage}
                    className="bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white font-bold px-8 py-4 rounded-xl text-lg shadow-lg"
                  >
                    <Award className="w-5 h-5 mr-2" />
                    Finalizar e Ver Certificado
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
};

export default JourneyStage6;
