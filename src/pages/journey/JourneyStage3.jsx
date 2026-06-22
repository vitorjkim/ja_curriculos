import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, ChevronLeft, ChevronRight, Check, X, 
  Sparkles, ArrowRight, Lightbulb, Eye, Target
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';import api from '@/lib/api';
// Conteúdo educativo
const lessons = [
  {
    type: 'info',
    title: 'Como LER uma vaga de emprego',
    content: [
      '🔍 PARTES DE UMA VAGA:',
      '',
      '1️⃣ TÍTULO: Indica a função',
      '• Ex: Auxiliar Administrativo, Vendedor, Atendente',
      '',
      '2️⃣ REQUISITOS: O que você precisa ter',
      '• Idade, escolaridade, conhecimentos',
      '• Alguns são obrigatórios, outros desejáveis',
      '',
      '3️⃣ ATIVIDADES: O que vai fazer no dia a dia',
      '• Atendimento, organização, vendas, etc.',
      '',
      '4️⃣ BENEFÍCIOS: O que a empresa oferece',
      '• Salário, VT, VR, plano de saúde, etc.'
    ]
  },
  {
    type: 'info',
    title: 'O que são PALAVRAS-CHAVE',
    content: [
      '🔑 PALAVRAS-CHAVE são termos que aparecem na vaga',
      'e que você deve usar no seu currículo!',
      '',
      '📋 EXEMPLOS:',
      '',
      'Se a vaga pede: "Conhecimento em Excel"',
      '→ Coloque: "Domínio do Microsoft Excel"',
      '',
      'Se a vaga pede: "Boa comunicação"',
      '→ Coloque: "Habilidade de comunicação verbal e escrita"',
      '',
      'Se a vaga pede: "Proatividade"',
      '→ Demonstre com exemplos concretos',
      '',
      '💡 Isso aumenta suas chances de ser chamado!'
    ]
  },
  {
    type: 'info',
    title: 'Como ADAPTAR seu currículo para cada vaga',
    content: [
      '✅ ESTRATÉGIA INTELIGENTE:',
      '',
      '1️⃣ Leia a vaga com atenção',
      '2️⃣ Destaque palavras importantes',
      '3️⃣ Adapte seu objetivo para a vaga',
      '4️⃣ Reorganize habilidades (mais relevantes primeiro)',
      '',
      '⚠️ NÃO MINTA!',
      'Adaptar não é inventar habilidades.',
      'É destacar o que você já tem que combina com a vaga.',
      '',
      '💡 DICA:',
      'Tenha um currículo base e faça pequenos ajustes',
      'para cada tipo de vaga diferente.'
    ]
  },
  {
    type: 'find-keywords',
    title: 'Exercício: Encontre as palavras-chave',
    description: 'Leia a vaga abaixo e clique nas palavras-chave importantes.'
  },
  {
    type: 'match-game',
    title: 'Jogo: Relacione Vaga ↔ Currículo',
    description: 'Associe o que a vaga pede com o que colocar no currículo.'
  },
  {
    type: 'quiz-final',
    title: '📝 Quiz Final',
    description: 'Teste seu conhecimento sobre vagas e palavras-chave!'
  }
];

// Vaga de exemplo para encontrar palavras-chave
const sampleJob = {
  title: 'Auxiliar Administrativo',
  company: 'Empresa XYZ',
  text: 'Buscamos profissional com Ensino Médio completo, conhecimento em Excel e Word, boa comunicação, organização e proatividade. Será responsável por atendimento ao cliente, controle de documentos e apoio à equipe.',
  keywords: ['Ensino Médio', 'Excel', 'Word', 'comunicação', 'organização', 'proatividade', 'atendimento', 'documentos']
};

// Relacionar vaga com currículo
const matchPairs = [
  { job: 'Conhecimento em informática', resume: 'Domínio do Pacote Office (Word, Excel, PowerPoint)' },
  { job: 'Boa comunicação', resume: 'Habilidade de comunicação verbal e escrita' },
  { job: 'Proatividade', resume: 'Perfil proativo, busco soluções antes de problemas' },
  { job: 'Trabalho em equipe', resume: 'Experiência em projetos colaborativos na escola' },
  { job: 'Organização', resume: 'Capacidade de organizar tarefas e cumprir prazos' }
];

// Quiz final sobre vagas e palavras-chave
const finalQuizQuestions = [
  {
    question: 'Uma vaga pede "experiência em atendimento ao público". Você nunca trabalhou, mas já atendeu no bazar da escola. O que fazer?',
    options: [
      { text: 'Não se candidatar à vaga porque você não possui experiência formal registrada', score: 0 },
      { text: 'Mencionar a experiência do bazar como exemplo de atendimento ao público', score: 3 },
      { text: 'Mentir no currículo dizendo que trabalhou como atendente em uma loja', score: 0 },
      { text: 'Se candidatar normalmente sem mencionar nenhuma experiência de atendimento', score: 1 }
    ],
    feedback: 'Experiências voluntárias e escolares contam! O importante é demonstrar que você tem a habilidade.'
  },
  {
    question: 'Você encontrou uma vaga perfeita, mas pede "conhecimento em Excel avançado" e você só sabe o básico. O que fazer?',
    options: [
      { text: 'Se candidatar afirmando que domina Excel avançado para conseguir a vaga', score: 0 },
      { text: 'Desistir completamente da vaga porque você não atende todos os requisitos', score: 1 },
      { text: 'Se candidatar mencionando conhecimento básico e disposição para aprender mais', score: 3 },
      { text: 'Remover qualquer menção a Excel do currículo para evitar perguntas sobre isso', score: 0 }
    ],
    feedback: 'Seja honesto sobre seu nível, mas mostre disposição para evoluir. Muitas empresas valorizam isso!'
  },
  {
    question: 'Qual é a melhor forma de adaptar seu currículo para uma vaga específica?',
    options: [
      { text: 'Usar exatamente o mesmo currículo para todas as vagas para economizar tempo', score: 0 },
      { text: 'Reescrever completamente o currículo do zero para cada vaga que se candidatar', score: 1 },
      { text: 'Destacar as habilidades e experiências que mais combinam com os requisitos da vaga', score: 3 },
      { text: 'Copiar todas as palavras da descrição da vaga e colar no seu currículo', score: 1 }
    ],
    feedback: 'Adapte destacando o que é relevante, mas sem mentir ou parecer artificial.'
  },
  {
    question: 'O que são "palavras-chave" em uma vaga de emprego?',
    options: [
      { text: 'São palavras secretas que somente o departamento de RH consegue entender', score: 0 },
      { text: 'São os termos técnicos, habilidades e competências que a empresa procura', score: 3 },
      { text: 'São apenas o nome da empresa e o salário oferecido na descrição da vaga', score: 0 },
      { text: 'São as palavras que aparecem em negrito ou destaque no texto da vaga', score: 1 }
    ],
    feedback: 'Palavras-chave são as habilidades, competências e requisitos que a empresa busca nos candidatos.'
  }
];

const JourneyStage3 = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [currentStep, setCurrentStep] = useState(0);
  
  // Keywords game state
  const [foundKeywords, setFoundKeywords] = useState([]);
  const [keywordsComplete, setKeywordsComplete] = useState(false);
  
  // Match game state  
  const [matchedPairs, setMatchedPairs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [matchComplete, setMatchComplete] = useState(false);
  
  // Quiz final state
  const [quizQuestion, setQuizQuestion] = useState(0);
  const [quizAnswered, setQuizAnswered] = useState(false);
  const [quizScore, setQuizScore] = useState(0);
  const [quizComplete, setQuizComplete] = useState(false);

  const currentContent = lessons[currentStep];
  const totalSteps = lessons.length;
  const progress = ((currentStep + 1) / totalSteps) * 100;

  // Keyword finding
  const handleWordClick = (word) => {
    const cleanWord = word.replace(/[.,]/g, '');
    const isKeyword = sampleJob.keywords.some(k => 
      cleanWord.toLowerCase().includes(k.toLowerCase()) || 
      k.toLowerCase().includes(cleanWord.toLowerCase())
    );
    
    if (isKeyword && !foundKeywords.includes(cleanWord)) {
      const newFound = [...foundKeywords, cleanWord];
      setFoundKeywords(newFound);
      
      if (newFound.length >= 5) {
        setKeywordsComplete(true);
      }
    }
  };

  // Match game
  const handleJobClick = (idx) => {
    if (matchedPairs.includes(idx)) return;
    setSelectedJob(idx);
  };

  const handleResumeClick = (idx) => {
    if (selectedJob !== null && selectedJob === idx && !matchedPairs.includes(idx)) {
      setMatchedPairs(prev => [...prev, idx]);
      setSelectedJob(null);
      
      if (matchedPairs.length + 1 >= matchPairs.length) {
        setMatchComplete(true);
      }
    } else {
      setSelectedJob(null);
    }
  };

  // Quiz final handler
  const handleQuizAnswer = (option) => {
    setQuizAnswered(true);
    setQuizScore(prev => prev + option.score);
  };

  const handleQuizContinue = () => {
    if (quizQuestion < finalQuizQuestions.length - 1) {
      setQuizQuestion(prev => prev + 1);
      setQuizAnswered(false);
    } else {
      setQuizComplete(true);
    }
  };

  const handleNextStep = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const completeStage = async () => {
    try {
      console.log('📤 Salvando Etapa 4 (Vagas/Keywords) no backend...');
      
      await api.post('/journey/stage/3', {
        keywordsResult: {
          found: foundKeywords.length,
          total: lessons.find(l => l.type === 'keywords')?.keywords?.length || 8,
          keywords: foundKeywords
        },
        matchResult: {
          matchedPairs: matchedPairs.length,
          total: 5
        },
        quizResult: {
          score: quizScore,
          maxScore: 12
        }
      });
      console.log('✅ Etapa 4 salva no backend com sucesso!');
      
      const completed = JSON.parse(localStorage.getItem('journeyCompletedStages') || '[]');
      if (!completed.includes(3)) {
        completed.push(3);
        localStorage.setItem('journeyCompletedStages', JSON.stringify(completed));
      }
      
      const currentXP = parseInt(localStorage.getItem('journeyTotalXP') || '0');
      localStorage.setItem('journeyTotalXP', (currentXP + 120).toString());
      
      const badges = JSON.parse(localStorage.getItem('journeyBadges') || '[]');
      if (!badges.includes('🔍 Candidato Estratégico')) {
        badges.push('🔍 Candidato Estratégico');
        localStorage.setItem('journeyBadges', JSON.stringify(badges));
      }
      
      toast({
        title: '🎉 Etapa concluída!',
        description: '+120 XP • Selo "Candidato Estratégico" conquistado!',
      });
      
      navigate('/candidate-journey');
    } catch (err) {
      console.error('❌ Erro ao salvar Etapa 4 no backend:', err);
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
        <title>Vagas e Palavras-chave - Jornada do Candidato</title>
      </Helmet>
      
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-violet-50">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
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
                <Search className="w-5 h-5" />
                <span className="font-medium">Etapa 3</span>
              </div>
            </div>
            <div className="text-center mt-4">
              <h1 className="text-2xl font-bold">Vagas e Palavras-chave</h1>
              <p className="text-blue-100 mt-1">Aprenda a se candidatar direito</p>
            </div>
          </div>
        </div>

        {/* Barra de Progresso */}
        <div className="max-w-3xl mx-auto px-4 mt-4">
          <div className="bg-white rounded-full shadow-sm p-1">
            <div className="h-2 bg-blue-100 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
                initial={{ width: '0%' }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
          <div className="text-center mt-2 text-sm text-blue-700 font-medium">
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
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
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
                    className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white"
                  >
                    Próximo
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Find keywords game */}
            {currentContent.type === 'find-keywords' && (
              <motion.div
                key="find-keywords"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white rounded-2xl shadow-xl p-6 md:p-8"
              >
                <div className="text-center mb-6">
                  <h2 className="text-xl font-bold text-slate-800">{currentContent.title}</h2>
                  <p className="text-slate-600 mt-1">{currentContent.description}</p>
                </div>
                
                {/* Fake job posting */}
                <div className="bg-slate-50 rounded-xl p-5 mb-6 border-2 border-slate-200">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center">
                      <span className="text-white font-bold">X</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800">{sampleJob.title}</h3>
                      <p className="text-sm text-slate-500">{sampleJob.company}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {sampleJob.text.split(' ').map((word, idx) => {
                      const isFound = foundKeywords.includes(word.replace(/[.,]/g, ''));
                      return (
                        <span
                          key={idx}
                          onClick={() => handleWordClick(word)}
                          className={`
                            px-1 py-0.5 rounded cursor-pointer transition-all
                            ${isFound ? 'bg-emerald-200 text-emerald-800 font-medium' : 'hover:bg-blue-100'}
                          `}
                        >
                          {word}
                        </span>
                      );
                    })}
                  </div>
                </div>
                
                <div className="mb-6">
                  <p className="text-sm font-medium text-slate-600 mb-2">
                    Palavras encontradas: {foundKeywords.length} / 5
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {foundKeywords.map((word, idx) => (
                      <span key={idx} className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium">
                        {word}
                      </span>
                    ))}
                  </div>
                </div>

                {keywordsComplete && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-emerald-50 rounded-xl border-2 border-emerald-200 text-center mb-6"
                  >
                    <p className="text-lg font-bold text-emerald-700">🎉 Ótimo! Você identificou as palavras-chave!</p>
                  </motion.div>
                )}

                <div className="flex justify-between">
                  <Button onClick={handlePrevStep} variant="outline" className="border-2">
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Anterior
                  </Button>
                  <Button
                    onClick={handleNextStep}
                    disabled={!keywordsComplete}
                    className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white"
                  >
                    Próximo
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Match game */}
            {currentContent.type === 'match-game' && !matchComplete && (
              <motion.div
                key="match-game"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white rounded-2xl shadow-xl p-6 md:p-8"
              >
                <div className="text-center mb-6">
                  <h2 className="text-xl font-bold text-slate-800">{currentContent.title}</h2>
                  <p className="text-slate-600 mt-1">{currentContent.description}</p>
                </div>
                
                <div className="grid md:grid-cols-2 gap-4">
                  {/* Job requirements */}
                  <div>
                    <h3 className="text-sm font-bold text-blue-700 mb-3">📋 A VAGA PEDE:</h3>
                    <div className="space-y-2">
                      {matchPairs.map((pair, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleJobClick(idx)}
                          disabled={matchedPairs.includes(idx)}
                          className={`
                            w-full p-3 rounded-xl border-2 text-left text-sm transition-all
                            ${matchedPairs.includes(idx) ? 'border-emerald-500 bg-emerald-50 opacity-50' : ''}
                            ${selectedJob === idx ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-300' : ''}
                            ${!matchedPairs.includes(idx) && selectedJob !== idx ? 'border-slate-200 hover:border-blue-300' : ''}
                          `}
                        >
                          {pair.job}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Resume phrases */}
                  <div>
                    <h3 className="text-sm font-bold text-indigo-700 mb-3">📄 NO CURRÍCULO:</h3>
                    <div className="space-y-2">
                      {matchPairs.map((pair, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleResumeClick(idx)}
                          disabled={matchedPairs.includes(idx)}
                          className={`
                            w-full p-3 rounded-xl border-2 text-left text-sm transition-all
                            ${matchedPairs.includes(idx) ? 'border-emerald-500 bg-emerald-50 opacity-50' : ''}
                            ${selectedJob !== null && !matchedPairs.includes(idx) ? 'border-indigo-300 hover:border-indigo-500 hover:bg-indigo-50' : ''}
                            ${selectedJob === null ? 'border-slate-200' : ''}
                          `}
                        >
                          {pair.resume}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                
                <p className="text-center text-sm text-slate-500 mt-4">
                  Pares encontrados: {matchedPairs.length} / {matchPairs.length}
                </p>
              </motion.div>
            )}

            {currentContent.type === 'match-game' && matchComplete && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-2xl shadow-xl p-6 md:p-8 text-center"
              >
                <div className="text-5xl mb-4">🎯</div>
                <h2 className="text-xl font-bold text-slate-800 mb-2">Relacionamento Completo!</h2>
                <p className="text-slate-600 mb-6">
                  Você entendeu como adaptar seu currículo para cada vaga!
                </p>
                
                <Button
                  onClick={handleNextStep}
                  className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white"
                >
                  Próximo
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </motion.div>
            )}

            {/* Quiz Final */}
            {currentContent.type === 'quiz-final' && !quizComplete && (
              <motion.div
                key={`quiz-${quizQuestion}`}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white rounded-2xl shadow-xl p-6 md:p-8"
              >
                <div className="text-center mb-6">
                  <span className="text-sm font-medium text-blue-600 bg-blue-100 px-3 py-1 rounded-full">
                    Pergunta {quizQuestion + 1} de {finalQuizQuestions.length}
                  </span>
                </div>
                
                <div className="bg-blue-50 rounded-xl p-4 mb-6 border-2 border-blue-200">
                  <p className="font-medium text-blue-900">{finalQuizQuestions[quizQuestion].question}</p>
                </div>
                
                <div className="space-y-3">
                  {finalQuizQuestions[quizQuestion].options.map((option, idx) => {
                    const showResult = quizAnswered;
                    const isCorrect = option.score === 3;
                    
                    return (
                      <button
                        key={idx}
                        onClick={() => !quizAnswered && handleQuizAnswer(option)}
                        disabled={quizAnswered}
                        className={`
                          w-full p-4 rounded-xl border-2 text-left transition-all
                          ${showResult && isCorrect ? 'border-emerald-500 bg-emerald-50' : ''}
                          ${showResult && !isCorrect ? 'border-slate-300 bg-slate-50 opacity-50' : ''}
                          ${!showResult ? 'border-slate-200 hover:border-blue-300 hover:bg-blue-50' : ''}
                        `}
                      >
                        <p className="font-medium text-slate-700 text-sm">{option.text}</p>
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
                      💡 {finalQuizQuestions[quizQuestion].feedback}
                    </p>
                  </motion.div>
                )}
                
                {/* Botão de continuar após responder */}
                {quizAnswered && (
                  <div className="mt-6 flex justify-center">
                    <Button
                      onClick={handleQuizContinue}
                      className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white"
                    >
                      {quizQuestion < finalQuizQuestions.length - 1 ? 'Próxima Pergunta' : 'Ver Resultado'}
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                )}
                
                <div className="mt-6 text-center">
                  <span className="text-blue-600 font-medium">
                    Pontuação: {quizScore} / {(quizQuestion + (quizAnswered ? 1 : 0)) * 3}
                  </span>
                </div>
              </motion.div>
            )}

            {currentContent.type === 'quiz-final' && quizComplete && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-2xl shadow-xl p-6 md:p-8 text-center"
              >
                <div className="text-6xl mb-6">🎯</div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Etapa Concluída!</h2>
                <p className="text-slate-600 mb-2">
                  Agora você sabe identificar palavras-chave e adaptar seu currículo!
                </p>
                <p className="text-lg font-bold text-blue-600 mb-6">
                  Quiz: {quizScore} / {finalQuizQuestions.length * 3} pontos
                </p>
                
                <div className="flex flex-wrap justify-center gap-4 mb-8">
                  <div className="bg-amber-50 border-2 border-amber-200 rounded-xl px-4 py-3">
                    <div className="text-2xl font-bold text-amber-600">+120 XP</div>
                    <div className="text-xs text-amber-700">Pontos ganhos</div>
                  </div>
                  <div className="bg-blue-50 border-2 border-blue-200 rounded-xl px-4 py-3">
                    <div className="text-lg font-bold text-blue-600">🔍 Candidato Estratégico</div>
                    <div className="text-xs text-blue-700">Selo conquistado</div>
                  </div>
                </div>
                
                <Button
                  onClick={completeStage}
                  className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white font-bold px-8 py-4 rounded-xl text-lg shadow-lg"
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

export default JourneyStage3;
