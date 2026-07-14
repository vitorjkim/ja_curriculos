/**
 * JobMatchCard - Exibe o score de compatibilidade entre um currículo e uma vaga
 * Mostra: matchScore (0-100%), dificuldade da vaga, nível do candidato, razões e lacunas
 */
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Zap, AlertTriangle, CheckCircle, RefreshCw, Target, Award, CheckCircle2, Sparkles, ExternalLink, Check } from 'lucide-react';

const getApiUrl = () => {
  const apiUrl = import.meta.env.VITE_API_URL;
  if (apiUrl) {
    const base = apiUrl.replace(/\/$/, '');
    return base.endsWith('/api') ? base : `${base}/api`;
  }
  return window.location.hostname === 'localhost' ? 'http://localhost:3001/api' : 'https://jacurriculos-production.up.railway.app/api';
};

const getScoreColor = (score) => {
  if (score >= 75) return { text: 'text-emerald-600', bg: 'bg-emerald-500', border: 'border-emerald-200', light: 'bg-emerald-50' };
  if (score >= 50) return { text: 'text-yellow-600', bg: 'bg-yellow-500', border: 'border-yellow-200', light: 'bg-yellow-50' };
  return { text: 'text-red-600', bg: 'bg-red-500', border: 'border-red-200', light: 'bg-red-50' };
};

const getScoreLabel = (score) => {
  if (score >= 85) return 'Excelente compatibilidade';
  if (score >= 70) return 'Boa compatibilidade';
  if (score >= 50) return 'Compatibilidade moderada';
  if (score >= 30) return 'Compatibilidade baixa';
  return 'Pouca compatibilidade';
};

const getDifficultyLabel = (level) => {
  if (level <= 2) return 'Estágio / Aprendiz';
  if (level <= 4) return 'Júnior';
  if (level <= 6) return 'Pleno';
  if (level <= 8) return 'Sênior';
  return 'Especialista / Lead';
};

const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 horas em ms

const IMPROVEMENT_ITEMS = [
  {
    id: 1,
    label: 'Inglês intermediário',
    gain: 18,
    color: '#2563eb',
    colorLight: '#dbeafe',
    course: {
      name: 'Inglês para Negócios — Coursera',
      url: 'https://www.coursera.org/learn/business-english'
    }
  },
  {
    id: 2,
    label: 'UX/UI Design',
    gain: 12,
    color: '#d97706',
    colorLight: '#fed7aa',
    course: {
      name: 'UX/UI Design Completo — Udemy',
      url: 'https://www.udemy.com/course/ux-ui-design/'
    }
  },
  {
    id: 3,
    label: 'Pacote Office',
    gain: 3,
    color: '#6b7a90',
    colorLight: '#e2e8f0',
    course: {
      name: 'Microsoft Office do Zero — Alura',
      url: 'https://www.alura.com.br/curso-online-office'
    }
  }
];

const CACHE_VERSION = 'v2'; // bump ao mudar formato do payload de match

const getCachedMatch = (jobId, resumeId, resumeScore) => {
  try {
    const raw = localStorage.getItem(`jobmatch_${CACHE_VERSION}_${jobId}_${resumeId}`);
    if (!raw) return null;
    const { data, timestamp, scoreUsed } = JSON.parse(raw);
    // Valida TTL
    if (Date.now() - timestamp > CACHE_TTL) { 
      localStorage.removeItem(`jobmatch_${CACHE_VERSION}_${jobId}_${resumeId}`); 
      return null; 
    }
    // Só usa cache se o currículo não melhorou
    if (resumeScore > (scoreUsed || 0)) return null;
    return data;
  } catch { return null; }
};

const setCachedMatch = (jobId, resumeId, resumeScore, data) => {
  try { 
    localStorage.setItem(
      `jobmatch_${CACHE_VERSION}_${jobId}_${resumeId}`, 
      JSON.stringify({ data, timestamp: Date.now(), scoreUsed: resumeScore })
    ); 
  } catch {}
};

export default function JobMatchCard({ jobId, resumeId, resumeScore = 0 }) {
  const [match, setMatch] = useState(() => getCachedMatch(jobId, resumeId, resumeScore));
  const [loading, setLoading] = useState(!match); // Só carrega se não tiver cache
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [checkedItems, setCheckedItems] = useState(new Set());
  const [openGreen, setOpenGreen] = useState(new Set());
  const [openRed, setOpenRed] = useState(new Set());

  // Calcula o score atual baseado no match original + itens marcados
  const currentScore = useMemo(() => {
    if (!match) return 0;
    const gainedPoints = Array.from(checkedItems).reduce((sum, itemId) => {
      const item = IMPROVEMENT_ITEMS.find(i => i.id === itemId);
      return sum + (item?.gain || 0);
    }, 0);
    return Math.min(match.matchScore + gainedPoints, 100);
  }, [match, checkedItems]);

  const toggleChecked = (id) => {
    setCheckedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const toggleGreen = (id) => {
    setOpenGreen(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const toggleRed = (id) => {
    setOpenRed(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  useEffect(() => {
    const cached = getCachedMatch(jobId, resumeId, resumeScore);
    if (!cached) {
      setLoading(true);
      fetchMatch();
    } else {
      setMatch(cached);
      setLoading(false);
    }
  }, [jobId, resumeId, resumeScore]);

  const fetchMatch = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Disparar evento de início de requisição de IA
      window.dispatchEvent(new Event('ai-request-start'));

      const token = localStorage.getItem('curriculoja_token');
      if (!token) {
        setLoading(false);
        window.dispatchEvent(new Event('ai-request-end'));
        return;
      }

      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/jobs/match`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ jobId, resumeId }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Erro ao calcular compatibilidade');
      }

      const data = await response.json();
      setCachedMatch(jobId, resumeId, resumeScore, data);
      setMatch(data);
    } catch (err) {
      // Erros transitórios (503/sobrecarga) não devem mostrar mensagem de erro ao usuário
      const isTransient = err.message?.includes('503') || err.message?.includes('sobrecarga') || err.message?.includes('high demand') || err.message?.includes('UNAVAILABLE');
      if (!isTransient) setError(err.message);
      // Para erros transitórios: simplesmente não exibe o card (setMatch permanece null)
    } finally {
      setLoading(false);
      // Disparar evento de fim de requisição de IA
      window.dispatchEvent(new Event('ai-request-end'));
    }
  };

  // Enquanto carrega
  if (loading) {
    return (
      <div className="w-full bg-white rounded-2xl border-2 border-indigo-100 p-4 flex items-center gap-3 shadow-sm">
        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
          <RefreshCw className="w-5 h-5 text-indigo-500 animate-spin" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-700">Calculando compatibilidade com a vaga...</p>
          <p className="text-xs text-gray-400">Análise de IA em andamento</p>
        </div>
      </div>
    );
  }

  // Erro
  if (error) {
    return (
      <div className="w-full bg-red-50 rounded-2xl border border-red-200 p-4 flex items-center gap-3">
        <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm text-red-700">{error}</p>
        </div>
        <button onClick={fetchMatch} className="text-xs text-red-600 underline">Tentar novamente</button>
      </div>
    );
  }

  // Sem dados
  if (!match) return null;

  const colors = getScoreColor(currentScore);
  const scoreLabel = getScoreLabel(currentScore);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full bg-white rounded-2xl border-2 border-indigo-100 shadow-sm overflow-hidden"
    >
      {/* Header clicável */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-5 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors text-left outline-none focus:outline-none rounded-2xl"
      >
        {/* Score circular compacto */}
        <div className="relative w-14 h-14 flex-shrink-0">
          <svg className="w-14 h-14 transform -rotate-90" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="50" fill="none" stroke="#e5e7eb" strokeWidth="12" />
            <circle
              cx="60" cy="60" r="50"
              fill="none"
              stroke={currentScore >= 75 ? '#10b981' : currentScore >= 50 ? '#eab308' : '#ef4444'}
              strokeWidth="12"
              strokeDasharray={`${(currentScore / 100) * 314} 314`}
              strokeLinecap="round"
              className="transition-all duration-1000"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-sm font-black ${colors.text}`}>{currentScore}%</span>
          </div>
        </div>

        {/* Texto */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <Target className="w-4 h-4 text-indigo-500" />
            <span className="text-sm font-bold text-gray-900">Compatibilidade com a Vaga</span>
          </div>
          <p className={`text-xs font-semibold ${colors.text}`}>{scoreLabel}</p>
          <div className="flex items-center gap-3 mt-1.5">
            <span className="text-xs text-gray-500">
              Vaga: <span className="font-semibold text-gray-700">{getDifficultyLabel(match.jobDifficulty)}</span>
            </span>
            <span className="text-gray-300">|</span>
            <span className="text-xs text-gray-500">
              Seu nível: <span className="font-semibold text-gray-700">{getDifficultyLabel(match.candidateLevel)}</span>
            </span>
          </div>
        </div>

        {expanded ? <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" /> : <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />}
      </button>

      {/* Conteúdo expandido */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-gray-100"
          >
            <div className="px-5 py-4 space-y-4">
              {/* Barra de progresso grande */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-xs text-gray-500 font-medium">Match Score</span>
                  <span className={`text-sm font-black ${colors.text}`}>{currentScore}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${currentScore}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    className={`h-3 rounded-full ${colors.bg}`}
                  />
                </div>
              </div>

              {/* Dificuldade vs Nível */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-2xl p-3 border border-gray-200 text-center">
                  <p className="text-xs text-gray-500 mb-1">Nível da Vaga</p>
                  <p className="text-xl font-black text-gray-800">{match.jobDifficulty}<span className="text-sm font-normal text-gray-400">/10</span></p>
                  <p className="text-xs text-gray-600 mt-0.5">{getDifficultyLabel(match.jobDifficulty)}</p>
                </div>
                <div className="bg-indigo-50 rounded-2xl p-3 border border-indigo-200 text-center">
                  <p className="text-xs text-indigo-600 mb-1">Seu Nível</p>
                  <p className="text-xl font-black text-indigo-700">{match.candidateLevel}<span className="text-sm font-normal text-indigo-400">/10</span></p>
                  <p className="text-xs text-indigo-600 mt-0.5">{getDifficultyLabel(match.candidateLevel)}</p>
                </div>
              </div>

              {/* Pontos Fortes - Badges Colapsáveis Verdes */}
              {match.strengths && match.strengths.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-3">
                    <CheckCircle2 className="w-4 h-4 text-[#22c55e]" />
                    <h4 className="font-extrabold text-sm text-[#166534]">
                      Pontos que te aproximam da vaga
                    </h4>
                  </div>

                  <div className="rounded-2xl border border-[#bbf7d0] bg-[#f0fdf4] p-3">
                    <div className="flex flex-wrap gap-2">
                      {match.strengths.map((strength, i) => {
                        const isOpen = openGreen.has(i);
                        return (
                          <button
                            key={i}
                            onClick={() => toggleGreen(i)}
                            className={`transition-all duration-300 ${
                              isOpen ? 'flex-[1_1_100%]' : ''
                            }`}
                          >
                            <div
                              className={`flex items-center justify-between gap-2 px-3 py-2 rounded-2xl border transition-colors ${
                                isOpen
                                  ? 'bg-[#dcfce7] border-[#22c55e]'
                                  : 'bg-[#f0fdf4] border-[#bbf7d0] hover:bg-[#dcfce7]'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-3 h-3 text-[#166534] flex-shrink-0" />
                                <span className="text-xs font-medium text-[#166534]">
                                  {strength.keyword}
                                </span>
                              </div>
                              <ChevronUp
                                className={`w-3.5 h-3.5 text-[#166534] transition-transform flex-shrink-0 ${
                                  isOpen ? '' : 'rotate-180'
                                }`}
                              />
                            </div>
                            {isOpen && (
                              <p className="text-xs text-[#166534] mt-2 px-1 text-left leading-relaxed">
                                {strength.text}
                              </p>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Gap Analysis - Badges Colapsáveis Vermelhos */}
              {match.gaps && match.gaps.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-3">
                    <Zap className="w-4 h-4 text-[#ef4444]" />
                    <h4 className="font-extrabold text-sm text-[#991b1b]">
                      O que falta para 100%?
                    </h4>
                  </div>

                  <div className="rounded-2xl border border-[#fecaca] bg-[#fff5f5] p-3">
                    <div className="flex flex-wrap gap-2">
                      {match.gaps.map((gap, i) => {
                        const isOpen = openRed.has(i);
                        return (
                          <button
                            key={i}
                            onClick={() => toggleRed(i)}
                            className={`transition-all duration-300 ${
                              isOpen ? 'flex-[1_1_100%]' : ''
                            }`}
                          >
                            <div
                              className={`flex items-center justify-between gap-2 px-3 py-2 rounded-2xl border transition-colors ${
                                isOpen
                                  ? 'bg-[#fee2e2] border-[#ef4444]'
                                  : 'bg-[#fff5f5] border-[#fecaca] hover:bg-[#fee2e2]'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <Zap className="w-[11px] h-[11px] text-[#991b1b] flex-shrink-0" />
                                <span className="text-xs font-medium text-[#991b1b]">
                                  {gap.keyword}
                                </span>
                              </div>
                              <ChevronUp
                                className={`w-3.5 h-3.5 text-[#991b1b] transition-transform flex-shrink-0 ${
                                  isOpen ? '' : 'rotate-180'
                                }`}
                              />
                            </div>
                            {isOpen && (
                              <p className="text-xs text-[#991b1b] mt-2 px-1 text-left leading-relaxed">
                                {gap.text}
                              </p>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Sugestão da IA - Plano de Melhoria com Checklist */}
              <div>
                <div className="rounded-2xl border border-[#e0e7ff] bg-[#f5f7ff] overflow-hidden">
                  {/* Cabeçalho */}
                  <div className="bg-white border-b border-[#e0e7ff] px-4 py-3 rounded-t-2xl">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#f5f3ff] border border-[#ddd6fe] flex items-center justify-center flex-shrink-0">
                        <Sparkles className="w-[15px] h-[15px] text-[#7c3aed]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-bold text-sm text-[#1a2332]">
                            Sugestão da IA
                          </h4>
                          <span className="px-2 py-0.5 rounded-full bg-[#f5f3ff] border border-[#ddd6fe] text-[#7c3aed] text-[9px] font-bold uppercase">
                            BETA
                          </span>
                        </div>
                        <p className="text-[11px] text-[#6b7a90] leading-tight">
                          Marque o que conquistar e veja seu score crescer
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Lista de itens */}
                  <div className="divide-y divide-[#e0e7ff]">
                    {IMPROVEMENT_ITEMS.map(item => {
                      const isChecked = checkedItems.has(item.id);
                      return (
                        <div key={item.id}>
                          <button
                            onClick={() => toggleChecked(item.id)}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#eef0ff] transition-colors"
                          >
                            {/* Checkbox custom */}
                            <div
                              className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                                isChecked
                                  ? 'border-transparent'
                                  : 'border-[#c7d2fe]'
                              }`}
                              style={{
                                backgroundColor: isChecked ? item.color : 'transparent',
                                borderColor: isChecked ? item.color : undefined
                              }}
                            >
                              {isChecked && <Check className="w-[11px] h-[11px] text-white" />}
                            </div>

                            {/* Label */}
                            <span
                              className={`flex-1 text-left text-sm font-medium transition-colors ${
                                isChecked ? '' : 'text-gray-700'
                              }`}
                              style={{
                                color: isChecked ? item.color : undefined
                              }}
                            >
                              {item.label}
                            </span>

                            {/* Badge de ganho */}
                            <span
                              className={`px-2 py-1 rounded-2xl text-xs font-bold border transition-all ${
                                isChecked ? 'text-white' : ''
                              }`}
                              style={{
                                backgroundColor: isChecked ? item.color : item.colorLight,
                                borderColor: isChecked ? item.color : item.colorLight,
                                color: isChecked ? 'white' : item.color
                              }}
                            >
                              +{item.gain}%
                            </span>
                          </button>

                          {/* Link para curso (quando marcado) */}
                          {isChecked && (
                            <a
                              href={item.course.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 mx-4 mb-3 px-3 py-2 rounded-2xl border text-xs hover:opacity-80 transition-opacity"
                              style={{
                                backgroundColor: item.colorLight,
                                borderColor: item.colorLight,
                                color: item.color
                              }}
                            >
                              <ExternalLink className="w-[11px] h-[11px] flex-shrink-0" />
                              <span className="font-medium">{item.course.name}</span>
                            </a>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Recalcular */}
              <button
                onClick={fetchMatch}
                className="text-xs text-indigo-500 hover:text-indigo-700 flex items-center gap-1 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Recalcular compatibilidade
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
