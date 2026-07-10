/**
 * JobMatchCard - Exibe o score de compatibilidade entre um currículo e uma vaga
 * Mostra: matchScore (0-100%), dificuldade da vaga, nível do candidato, razões e lacunas
 */
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Zap, AlertTriangle, CheckCircle, RefreshCw, Target } from 'lucide-react';

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

const getCachedMatch = (jobId, resumeId, resumeScore) => {
  try {
    const raw = localStorage.getItem(`jobmatch_${jobId}_${resumeId}`);
    if (!raw) return null;
    const { data, timestamp, scoreUsed } = JSON.parse(raw);
    // Valida TTL
    if (Date.now() - timestamp > CACHE_TTL) { 
      localStorage.removeItem(`jobmatch_${jobId}_${resumeId}`); 
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
      `jobmatch_${jobId}_${resumeId}`, 
      JSON.stringify({ data, timestamp: Date.now(), scoreUsed: resumeScore })
    ); 
  } catch {}
};

export default function JobMatchCard({ jobId, resumeId, resumeScore = 0 }) {
  const [match, setMatch] = useState(() => getCachedMatch(jobId, resumeId, resumeScore));
  const [loading, setLoading] = useState(!match); // Só carrega se não tiver cache
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(false);

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

      const token = localStorage.getItem('curriculoja_token');
      if (!token) {
        setLoading(false);
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

  const colors = getScoreColor(match.matchScore);
  const scoreLabel = getScoreLabel(match.matchScore);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full bg-white rounded-2xl border-2 border-indigo-100 shadow-sm overflow-hidden"
    >
      {/* Header clicável */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-5 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors text-left"
      >
        {/* Score circular compacto */}
        <div className="relative w-14 h-14 flex-shrink-0">
          <svg className="w-14 h-14 transform -rotate-90" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="50" fill="none" stroke="#e5e7eb" strokeWidth="12" />
            <circle
              cx="60" cy="60" r="50"
              fill="none"
              stroke={match.matchScore >= 75 ? '#10b981' : match.matchScore >= 50 ? '#eab308' : '#ef4444'}
              strokeWidth="12"
              strokeDasharray={`${(match.matchScore / 100) * 314} 314`}
              strokeLinecap="round"
              className="transition-all duration-1000"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-sm font-black ${colors.text}`}>{match.matchScore}%</span>
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
                  <span className={`text-sm font-black ${colors.text}`}>{match.matchScore}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${match.matchScore}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    className={`h-3 rounded-full ${colors.bg}`}
                  />
                </div>
              </div>

              {/* Dificuldade vs Nível */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-xl p-3 border border-gray-200 text-center">
                  <p className="text-xs text-gray-500 mb-1">Nível da Vaga</p>
                  <p className="text-xl font-black text-gray-800">{match.jobDifficulty}<span className="text-sm font-normal text-gray-400">/10</span></p>
                  <p className="text-xs text-gray-600 mt-0.5">{getDifficultyLabel(match.jobDifficulty)}</p>
                </div>
                <div className="bg-indigo-50 rounded-xl p-3 border border-indigo-200 text-center">
                  <p className="text-xs text-indigo-600 mb-1">Seu Nível</p>
                  <p className="text-xl font-black text-indigo-700">{match.candidateLevel}<span className="text-sm font-normal text-indigo-400">/10</span></p>
                  <p className="text-xs text-indigo-600 mt-0.5">{getDifficultyLabel(match.candidateLevel)}</p>
                </div>
              </div>

              {/* Razões */}
              {match.reasons && match.reasons.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-600 mb-2">Por que esse score?</p>
                  <ul className="space-y-1.5">
                    {match.reasons.map((reason, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-gray-700">
                        <CheckCircle className="w-3.5 h-3.5 text-indigo-400 mt-0.5 flex-shrink-0" />
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Gap Analysis */}
              {match.gapAnalysis && match.gapAnalysis.length > 0 && (
                <div className="bg-amber-50 rounded-xl p-3 border border-amber-200">
                  <p className="text-xs font-semibold text-amber-700 mb-2">O que falta para 100%?</p>
                  <ul className="space-y-1.5">
                    {match.gapAnalysis.map((gap, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-amber-800">
                        <Zap className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                        <span>{gap}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

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
