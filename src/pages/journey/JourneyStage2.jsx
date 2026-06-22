import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, ChevronLeft, ChevronRight, Check, X, 
  Sparkles, ArrowRight, Lightbulb, GripVertical, Star
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import api from '@/lib/api';

// Conteúdo educativo
const lessons = [
  {
    type: 'info',
    title: 'Como montar currículo SEM experiência',
    content: [
      '📝 ESTRUTURA BÁSICA:',
      '',
      '1️⃣ Dados Pessoais',
      '• Nome completo',
      '• Telefone e email',
      '• Cidade (não precisa endereço completo)',
      '',
      '2️⃣ Objetivo',
      '• Uma frase clara sobre a vaga desejada',
      '• Ex: "Auxiliar Administrativo em busca da primeira oportunidade"',
      '',
      '3️⃣ Formação',
      '• Escola atual ou concluída',
      '• Cursos extras (online, técnicos, etc.)'
    ]
  },
  {
    type: 'info',
    title: 'O que COLOCAR no currículo sem experiência',
    content: [
      '✅ PODE E DEVE COLOCAR:',
      '',
      '• Cursos online (Coursera, YouTube, Sebrae)',
      '• Projetos escolares relevantes',
      '• Trabalhos voluntários',
      '• Habilidades em informática',
      '• Idiomas (mesmo básico)',
      '• Soft skills comprovadas',
      '',
      '💡 DICA DE OURO:',
      'Liste atividades onde demonstrou responsabilidade:',
      '• Organização de eventos na escola',
      '• Cuidar de irmãos mais novos',
      '• Ajudar em negócio da família'
    ]
  },
  {
    type: 'info',
    title: 'O que NÃO colocar no currículo',
    content: [
      '❌ EVITE SEMPRE:',
      '',
      '• Foto (a menos que peçam)',
      '• Documentos (CPF, RG)',
      '• Pretensão salarial (no currículo)',
      '• "Disponibilidade imediata" (óbvio)',
      '• Hobbies irrelevantes',
      '• Mentiras sobre habilidades',
      '• Email não profissional (@gatinha, @ninja)',
      '',
      '⚠️ CUIDADO COM:',
      '• Erros de português',
      '• Mais de 1 página',
      '• Fontes coloridas ou enfeitadas',
      '• Informações desatualizadas'
    ]
  },
  {
    type: 'drag-drop',
    title: 'Atividade: O que entra no currículo?',
    description: 'Classifique cada item como "Entra" ou "Não Entra" no currículo.',
    items: [
      { text: 'Número do CPF', correct: false },
      { text: 'Curso de Excel online', correct: true },
      { text: 'Foto selfie', correct: false },
      { text: 'Projeto escolar de empreendedorismo', correct: true },
      { text: 'Email: gamer2005@...', correct: false },
      { text: 'Inglês básico', correct: true },
      { text: 'Trabalho voluntário na igreja', correct: true },
      { text: 'Signo: Áries', correct: false }
    ]
  },
  {
    type: 'transform',
    title: 'Jogo: Transforme frases ruins em boas',
    description: 'Escolha a melhor versão de cada frase para o currículo.'
  },
  {
    type: 'resume-quality',
    title: 'Monte seu currículo ideal',
    description: 'Selecione os elementos para atingir 100% de qualidade.'
  }
];

// Frases para transformar
const phraseTransforms = [
  {
    bad: 'Eu não tenho experiência nenhuma',
    options: [
      { text: 'Em busca da primeira oportunidade profissional para desenvolver minha carreira', correct: true },
      { text: 'Nunca trabalhei em lugar nenhum mas quero muito aprender e crescer', correct: false },
      { text: 'Não sei fazer nada ainda porque ninguém me deu uma chance de trabalhar', correct: false }
    ]
  },
  {
    bad: 'Sei mexer no computador',
    options: [
      { text: 'Tenho conhecimento básico em informática e sei usar o computador', correct: false },
      { text: 'Domínio do pacote Office incluindo Word, Excel e PowerPoint', correct: true },
      { text: 'Uso computador todo dia em casa para estudar e acessar redes sociais', correct: false }
    ]
  },
  {
    bad: 'Sou muito responsável',
    options: [
      { text: 'Sempre fui uma pessoa responsável desde que eu era bem criança', correct: false },
      { text: 'Demonstrei responsabilidade ao liderar projeto escolar de arrecadação de alimentos', correct: true },
      { text: 'Sou uma pessoa muito responsável e comprometida com tudo que eu faço', correct: false }
    ]
  },
  {
    bad: 'Quero crescer na empresa',
    options: [
      { text: 'Objetivo: Contribuir com a equipe e desenvolver carreira na área administrativa', correct: true },
      { text: 'Quero ser promovido bem rápido e chegar a cargos de chefia na empresa', correct: false },
      { text: 'Busco crescimento profissional e quero evoluir muito na minha carreira', correct: false }
    ]
  }
];

// Elementos do currículo para o jogo de qualidade
const resumeElements = [
  { id: 1, text: 'Nome completo', points: 10, required: true },
  { id: 2, text: 'Email profissional', points: 10, required: true },
  { id: 3, text: 'Telefone atualizado', points: 10, required: true },
  { id: 4, text: 'Objetivo claro', points: 15, required: true },
  { id: 5, text: 'Formação escolar', points: 10, required: true },
  { id: 6, text: 'Cursos complementares', points: 15, required: false },
  { id: 7, text: 'Habilidades em informática', points: 10, required: false },
  { id: 8, text: 'Idiomas', points: 10, required: false },
  { id: 9, text: 'Projetos ou atividades extras', points: 10, required: false },
  { id: 10, text: 'Número do CPF', points: -10, required: false, bad: true },
  { id: 11, text: 'Foto informal', points: -5, required: false, bad: true },
  { id: 12, text: 'Pretensão salarial', points: -5, required: false, bad: true }
];

const JourneyStage2 = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [currentStep, setCurrentStep] = useState(0);
  
  // Drag and drop state
  const [dragAnswers, setDragAnswers] = useState({});
  const [dragComplete, setDragComplete] = useState(false);
  
  // Transform game state
  const [transformStep, setTransformStep] = useState(0);
  const [transformAnswers, setTransformAnswers] = useState([]);
  const [transformComplete, setTransformComplete] = useState(false);
  const [selectedTransform, setSelectedTransform] = useState(null);
  
  // Resume quality game state
  const [selectedElements, setSelectedElements] = useState([]);
  const [qualityComplete, setQualityComplete] = useState(false);

  const currentContent = lessons[currentStep];
  const totalSteps = lessons.length;
  const progress = ((currentStep + 1) / totalSteps) * 100;

  // Drag and drop handlers
  const handleDragAnswer = (itemIndex, answer) => {
    const newAnswers = { ...dragAnswers, [itemIndex]: answer };
    setDragAnswers(newAnswers);
    
    // Verificar se todas foram respondidas
    if (Object.keys(newAnswers).length === currentContent.items.length) {
      setDragComplete(true);
    }
  };

  const getDragScore = () => {
    let correct = 0;
    currentContent.items?.forEach((item, idx) => {
      if (dragAnswers[idx] === item.correct) correct++;
    });
    return correct;
  };

  // Transform handlers
  const handleTransformAnswer = (isCorrect) => {
    setTransformAnswers(prev => [...prev, isCorrect]);
  };

  const handleTransformContinue = () => {
    if (transformStep < phraseTransforms.length - 1) {
      setTransformStep(prev => prev + 1);
      setSelectedTransform(null);
    } else {
      setTransformComplete(true);
    }
  };

  // Resume quality handlers
  const toggleElement = (element) => {
    if (selectedElements.find(e => e.id === element.id)) {
      setSelectedElements(prev => prev.filter(e => e.id !== element.id));
    } else {
      setSelectedElements(prev => [...prev, element]);
    }
  };

  const getQualityScore = () => {
    let score = 0;
    selectedElements.forEach(el => {
      score += el.points;
    });
    return Math.min(100, Math.max(0, score));
  };

  const handleNextStep = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(prev => prev + 1);
      setDragAnswers({});
      setDragComplete(false);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const completeStage = async () => {
    try {
      console.log('📤 Salvando Etapa 3 (Currículo) no backend...');
      
      // Calcular qualidade do currículo baseado nos elementos selecionados
      const qualityScore = selectedElements.reduce((total, el) => total + el.value, 0);
      
      await api.post('/journey/stage/2', {
        dragDropResults: dragAnswers,
        transformResults: transformAnswers,
        resumeQuality: {
          selectedElements: selectedElements.map(el => el.text),
          qualityScore: qualityScore,
          completed: qualityComplete
        }
      });
      console.log('✅ Etapa 3 salva no backend com sucesso!');
      
      const completed = JSON.parse(localStorage.getItem('journeyCompletedStages') || '[]');
      if (!completed.includes(2)) {
        completed.push(2);
        localStorage.setItem('journeyCompletedStages', JSON.stringify(completed));
      }
      
      const currentXP = parseInt(localStorage.getItem('journeyTotalXP') || '0');
      localStorage.setItem('journeyTotalXP', (currentXP + 150).toString());
      
      const badges = JSON.parse(localStorage.getItem('journeyBadges') || '[]');
      if (!badges.includes('📄 Currículo Pronto')) {
        badges.push('📄 Currículo Pronto');
        localStorage.setItem('journeyBadges', JSON.stringify(badges));
      }
      
      toast({
        title: '🎉 Etapa concluída!',
        description: '+150 XP • Selo "Currículo Pronto" conquistado!',
      });
      
      navigate('/candidate-journey');
    } catch (err) {
      console.error('❌ Erro ao salvar Etapa 3 no backend:', err);
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
        <title>Currículo que Contrata - Jornada do Candidato</title>
      </Helmet>
      
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-rose-50">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white">
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
                <FileText className="w-5 h-5" />
                <span className="font-medium">Etapa 2</span>
              </div>
            </div>
            <div className="text-center mt-4">
              <h1 className="text-2xl font-bold">Currículo que Contrata</h1>
              <p className="text-orange-100 mt-1">Mesmo sem experiência!</p>
            </div>
          </div>
        </div>

        {/* Barra de Progresso */}
        <div className="max-w-3xl mx-auto px-4 mt-4">
          <div className="bg-white rounded-full shadow-sm p-1">
            <div className="h-2 bg-orange-100 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full"
                initial={{ width: '0%' }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
          <div className="text-center mt-2 text-sm text-orange-700 font-medium">
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
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                    <FileText className="w-6 h-6 text-white" />
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
                    className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white"
                  >
                    Próximo
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Drag and drop game */}
            {currentContent.type === 'drag-drop' && (
              <motion.div
                key="drag-drop"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className="bg-white rounded-2xl shadow-xl p-6 md:p-8"
              >
                <div className="text-center mb-6">
                  <h2 className="text-xl font-bold text-slate-800">{currentContent.title}</h2>
                  <p className="text-slate-600 mt-1">{currentContent.description}</p>
                </div>
                
                <div className="space-y-3">
                  {currentContent.items.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                      <span className="flex-1 font-medium text-slate-700">{item.text}</span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDragAnswer(idx, true)}
                          className={`px-4 py-2 rounded-lg font-medium transition-all ${
                            dragAnswers[idx] === true
                              ? dragComplete && item.correct 
                                ? 'bg-emerald-500 text-white'
                                : dragComplete && !item.correct
                                  ? 'bg-red-500 text-white'
                                  : 'bg-emerald-500 text-white'
                              : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                          }`}
                        >
                          ✓ Entra
                        </button>
                        <button
                          onClick={() => handleDragAnswer(idx, false)}
                          className={`px-4 py-2 rounded-lg font-medium transition-all ${
                            dragAnswers[idx] === false
                              ? dragComplete && !item.correct 
                                ? 'bg-emerald-500 text-white'
                                : dragComplete && item.correct
                                  ? 'bg-red-500 text-white'
                                  : 'bg-rose-500 text-white'
                              : 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                          }`}
                        >
                          ✗ Não Entra
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {dragComplete && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-6 p-4 bg-orange-50 rounded-xl border-2 border-orange-200 text-center"
                  >
                    <p className="text-lg font-bold text-orange-700">
                      Você acertou {getDragScore()} de {currentContent.items.length}!
                    </p>
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
                    disabled={!dragComplete}
                    className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white"
                  >
                    Próximo
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Transform game */}
            {currentContent.type === 'transform' && !transformComplete && (
              <motion.div
                key={`transform-${transformStep}`}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white rounded-2xl shadow-xl p-6 md:p-8"
              >
                <div className="text-center mb-6">
                  <span className="text-sm font-medium text-orange-600 bg-orange-100 px-3 py-1 rounded-full">
                    Frase {transformStep + 1} de {phraseTransforms.length}
                  </span>
                </div>
                
                <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-6">
                  <p className="text-sm text-red-600 font-medium mb-1">❌ Frase ruim:</p>
                  <p className="text-lg text-red-800 font-bold">"{phraseTransforms[transformStep].bad}"</p>
                </div>
                
                <p className="text-slate-700 font-medium mb-4">Escolha a melhor versão:</p>
                
                <div className="space-y-3">
                  {phraseTransforms[transformStep].options.map((option, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setSelectedTransform(idx);
                        handleTransformAnswer(option.correct);
                      }}
                      disabled={selectedTransform !== null}
                      className={`
                        w-full p-4 rounded-xl border-2 text-left transition-all
                        ${selectedTransform === idx && option.correct ? 'border-emerald-500 bg-emerald-50' : ''}
                        ${selectedTransform === idx && !option.correct ? 'border-red-500 bg-red-50' : ''}
                        ${selectedTransform !== idx && selectedTransform !== null && option.correct ? 'border-emerald-500 bg-emerald-50' : ''}
                        ${selectedTransform === null ? 'border-slate-200 hover:border-orange-300 hover:bg-orange-50' : ''}
                      `}
                    >
                      <span className="font-medium">{option.text}</span>
                    </button>
                  ))}
                </div>
                
                {/* Botão de continuar após responder */}
                {selectedTransform !== null && (
                  <div className="mt-6 flex justify-center">
                    <Button
                      onClick={handleTransformContinue}
                      className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white"
                    >
                      {transformStep < phraseTransforms.length - 1 ? 'Próxima Frase' : 'Ver Resultado'}
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                )}
              </motion.div>
            )}

            {currentContent.type === 'transform' && transformComplete && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-2xl shadow-xl p-6 md:p-8 text-center"
              >
                <div className="text-5xl mb-4">✍️</div>
                <h2 className="text-xl font-bold text-slate-800 mb-2">Transformação Completa!</h2>
                <p className="text-slate-600 mb-6">
                  Você acertou {transformAnswers.filter(Boolean).length} de {phraseTransforms.length}!
                </p>
                
                <div className="flex justify-center">
                  <Button
                    onClick={handleNextStep}
                    className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white"
                  >
                    Próximo
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Resume quality game */}
            {currentContent.type === 'resume-quality' && !qualityComplete && (
              <motion.div
                key="quality"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white rounded-2xl shadow-xl p-6 md:p-8"
              >
                <div className="text-center mb-6">
                  <h2 className="text-xl font-bold text-slate-800">{currentContent.title}</h2>
                  <p className="text-slate-600 mt-1">{currentContent.description}</p>
                </div>
                
                {/* Quality bar */}
                <div className="mb-6">
                  <div className="flex justify-between text-sm font-medium mb-2">
                    <span className="text-slate-600">Qualidade do Currículo</span>
                    <span className={`${getQualityScore() >= 70 ? 'text-emerald-600' : 'text-orange-600'}`}>
                      {getQualityScore()}%
                    </span>
                  </div>
                  <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${
                        getQualityScore() >= 70 ? 'bg-emerald-500' : 
                        getQualityScore() >= 40 ? 'bg-amber-500' : 'bg-red-500'
                      }`}
                      animate={{ width: `${getQualityScore()}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {resumeElements.map((element) => {
                    const isSelected = selectedElements.find(e => e.id === element.id);
                    return (
                      <button
                        key={element.id}
                        onClick={() => toggleElement(element)}
                        className={`
                          p-3 rounded-xl border-2 text-left transition-all flex items-center justify-between
                          ${isSelected && !element.bad ? 'border-emerald-500 bg-emerald-50' : ''}
                          ${isSelected && element.bad ? 'border-red-500 bg-red-50' : ''}
                          ${!isSelected ? 'border-slate-200 hover:border-orange-300' : ''}
                        `}
                      >
                        <span className="font-medium text-slate-700">{element.text}</span>
                        <span className={`text-sm font-bold ${
                          element.points > 0 ? 'text-emerald-600' : 'text-red-600'
                        }`}>
                          {element.points > 0 ? '+' : ''}{element.points}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {getQualityScore() >= 70 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-6 p-4 bg-emerald-50 rounded-xl border-2 border-emerald-200 text-center"
                  >
                    <p className="text-lg font-bold text-emerald-700">
                      🎉 Excelente! Seu currículo está competitivo!
                    </p>
                  </motion.div>
                )}

                <div className="flex justify-center mt-8">
                  <Button
                    onClick={() => setQualityComplete(true)}
                    disabled={getQualityScore() < 70}
                    className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white px-8"
                  >
                    {getQualityScore() >= 70 ? 'Concluir Atividade' : 'Atinja 70% para continuar'}
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </motion.div>
            )}

            {currentContent.type === 'resume-quality' && qualityComplete && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-2xl shadow-xl p-6 md:p-8 text-center"
              >
                <div className="text-6xl mb-6">📄</div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Etapa Concluída!</h2>
                <p className="text-slate-600 mb-6">
                  Agora você sabe como criar um currículo competitivo mesmo sem experiência!
                </p>
                
                <div className="flex flex-wrap justify-center gap-4 mb-8">
                  <div className="bg-amber-50 border-2 border-amber-200 rounded-xl px-4 py-3">
                    <div className="text-2xl font-bold text-amber-600">+150 XP</div>
                    <div className="text-xs text-amber-700">Pontos ganhos</div>
                  </div>
                  <div className="bg-orange-50 border-2 border-orange-200 rounded-xl px-4 py-3">
                    <div className="text-lg font-bold text-orange-600">📄 Currículo Pronto</div>
                    <div className="text-xs text-orange-700">Selo conquistado</div>
                  </div>
                </div>
                
                <Button
                  onClick={completeStage}
                  className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold px-8 py-4 rounded-xl text-lg shadow-lg"
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

export default JourneyStage2;
