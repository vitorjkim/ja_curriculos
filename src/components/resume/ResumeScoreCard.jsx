import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Zap, TrendingUp, AlertCircle, CheckCircle2, AlertTriangle, Sparkles, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';

/**
 * ResumeScoreCard - Exibe análise de qualidade do currículo
 * Mostra: Score geral, 5 sub-scores, sugestões categorizadas por prioridade
 */
export default function ResumeScoreCard({ resumeId, isOwner = false }) {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(false);

  // Função para chamar API de análise
  const analyzeResume = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log(`🤖 Analisando currículo ${resumeId}...`);
      
      const response = await api.post(`/resumes/${resumeId}/analyze`);
      
      if (response?.data?.success || response?.success) {
        setAnalysis(response.data.analysis || response.analysis);
        console.log('✅ Análise recebida:', response.data.analysis || response.analysis);
      } else {
        throw new Error('Resposta inválida da API');
      }
    } catch (err) {
      console.error('❌ Erro na análise:', err);
      setError(err.response?.data?.error || err.message || 'Erro ao analisar currículo');
    } finally {
      setLoading(false);
    }
  };

  // Auto-load na primeira renderização se for dono
  useEffect(() => {
    if (isOwner && resumeId && !analysis && !loading) {
      analyzeResume();
    }
  }, [resumeId, isOwner]);

  if (!isOwner) {
    return null; // Mostrar análise apenas para dono do currículo
  }

  if (error && !analysis) {
    return (
      <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6 mb-6">
        <div className="flex items-center gap-3 mb-3">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          <h3 className="font-semibold text-red-800">Erro na Análise</h3>
        </div>
        <p className="text-sm text-red-700 mb-4">{error}</p>
        {isOwner && (
          <Button
            onClick={analyzeResume}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {loading ? 'Analisando...' : 'Tentar Novamente'}
          </Button>
        )}
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-blue-600 animate-pulse" />
            <div>
              <h3 className="font-semibold text-blue-800">Análise de IA Disponível</h3>
              <p className="text-sm text-blue-700">Receba feedback detalhado sobre seu currículo</p>
            </div>
          </div>
          {isOwner && (
            <Button
              onClick={analyzeResume}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white whitespace-nowrap"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Analisando...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  Analisar Agora
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    );
  }

  const score = analysis.score || 0;
  const subscores = {
    completeness: analysis.completeness_score || 0,
    quality: analysis.quality_score || 0,
    relevance: analysis.relevance_score || 0,
    impact: analysis.impact_score || 0,
  };

  // Cores por score
  const getScoreColor = (s) => {
    if (s >= 80) return 'text-emerald-600';
    if (s >= 60) return 'text-blue-600';
    if (s >= 40) return 'text-amber-600';
    return 'text-red-600';
  };

  const getScoreBg = (s) => {
    if (s >= 80) return 'bg-emerald-50 border-emerald-200';
    if (s >= 60) return 'bg-blue-50 border-blue-200';
    if (s >= 40) return 'bg-amber-50 border-amber-200';
    return 'bg-red-50 border-red-200';
  };

  const getProgressColor = (s) => {
    if (s >= 80) return 'bg-emerald-500';
    if (s >= 60) return 'bg-blue-500';
    if (s >= 40) return 'bg-amber-500';
    return 'bg-red-500';
  };

  // Filtrar sugestões por prioridade
  const criticalSuggestions = (analysis.suggestions || []).filter(s => s.priority === 'critical');
  const importantSuggestions = (analysis.suggestions || []).filter(s => s.priority === 'important');
  const recommendedSuggestions = (analysis.suggestions || []).filter(s => s.priority === 'recommended');

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="mb-6"
    >
      {/* Score Principal */}
      <div className={`border-2 rounded-2xl p-8 mb-6 ${getScoreBg(score)}`}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          {/* Score Circular */}
          <div className="flex justify-center">
            <div className="relative w-40 h-40">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
                {/* Background circle */}
                <circle
                  cx="80"
                  cy="80"
                  r="70"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="12"
                  className="text-gray-200"
                />
                {/* Progress circle */}
                <motion.circle
                  cx="80"
                  cy="80"
                  r="70"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="12"
                  strokeDasharray={`${(score / 100) * 440} 440`}
                  className={getProgressColor(score)}
                  initial={{ strokeDasharray: '0 440' }}
                  animate={{ strokeDasharray: `${(score / 100) * 440} 440` }}
                  transition={{ duration: 1.5, ease: 'easeOut' }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className={`text-5xl font-bold ${getScoreColor(score)}`}>{score}</div>
                  <div className="text-sm text-gray-600">/ 100</div>
                </div>
              </div>
            </div>
          </div>

          {/* Info + Sub-scores */}
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">Qualidade do Seu Currículo</h2>
              <p className="text-gray-600">{analysis.summary}</p>
            </div>

            {/* Sub-scores Grid */}
            <div className="grid grid-cols-2 gap-3">
              {Object.entries({
                'Completude': subscores.completeness,
                'Qualidade': subscores.quality,
                'Relevância': subscores.relevance,
                'Impacto': subscores.impact,
              }).map(([label, value]) => (
                <div key={label} className="bg-white/70 rounded-lg p-3 backdrop-blur-sm border border-white/50">
                  <div className="text-xs text-gray-600 mb-1">{label}</div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                      <motion.div
                        className={getProgressColor(value)}
                        initial={{ width: 0 }}
                        animate={{ width: `${value}%` }}
                        transition={{ duration: 1, delay: 0.2 }}
                      />
                    </div>
                    <div className={`text-sm font-bold ${getScoreColor(value)} w-10 text-right`}>{value}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Strengths */}
      {analysis.key_strengths && analysis.key_strengths.length > 0 && (
        <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <h3 className="font-semibold text-emerald-800">Seus Pontos Fortes</h3>
          </div>
          <ul className="space-y-2">
            {analysis.key_strengths.map((strength, idx) => (
              <li key={idx} className="text-sm text-emerald-700 flex items-start gap-2">
                <span className="text-emerald-500 font-bold mt-0.5">•</span>
                <span>{strength}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Sugestões por Prioridade */}
      <div className="space-y-4">
        {/* CRITICAL */}
        {criticalSuggestions.length > 0 && (
          <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <h3 className="font-semibold text-red-800">
                Crítico ({criticalSuggestions.length})
              </h3>
            </div>
            <div className="space-y-3">
              {criticalSuggestions.map((sug, idx) => (
                <div key={idx} className="bg-white/50 rounded-lg p-4 backdrop-blur-sm border border-red-100">
                  <div className="flex items-start justify-between mb-1">
                    <h4 className="font-semibold text-gray-900 text-sm">{sug.title}</h4>
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-medium">
                      +{sug.impact} pts
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">{sug.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* IMPORTANT */}
        {importantSuggestions.length > 0 && (
          <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="w-5 h-5 text-amber-600" />
              <h3 className="font-semibold text-amber-800">
                Importante ({importantSuggestions.length})
              </h3>
            </div>
            <div className="space-y-3">
              {importantSuggestions.map((sug, idx) => (
                <div key={idx} className="bg-white/50 rounded-lg p-4 backdrop-blur-sm border border-amber-100">
                  <div className="flex items-start justify-between mb-1">
                    <h4 className="font-semibold text-gray-900 text-sm">{sug.title}</h4>
                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-medium">
                      +{sug.impact} pts
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">{sug.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* RECOMMENDED - Colapsável */}
        {recommendedSuggestions.length > 0 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full bg-blue-50 border-2 border-blue-200 rounded-2xl p-6 text-left hover:bg-blue-100 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-blue-800">
                  Recomendado ({recommendedSuggestions.length})
                </h3>
              </div>
              <motion.div
                animate={{ rotate: expanded ? 180 : 0 }}
                transition={{ duration: 0.3 }}
              >
                ▼
              </motion.div>
            </div>

            {expanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 space-y-3 pt-4 border-t border-blue-200"
              >
                {recommendedSuggestions.map((sug, idx) => (
                  <div key={idx} className="bg-white/50 rounded-lg p-4 backdrop-blur-sm border border-blue-100">
                    <div className="flex items-start justify-between mb-1">
                      <h4 className="font-semibold text-gray-900 text-sm">{sug.title}</h4>
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
                        +{sug.impact} pts
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">{sug.description}</p>
                  </div>
                ))}
              </motion.div>
            )}
          </button>
        )}
      </div>

      {/* Keywords */}
      {analysis.keywords_suggested && analysis.keywords_suggested.length > 0 && (
        <div className="bg-purple-50 border-2 border-purple-200 rounded-2xl p-6 mt-6">
          <h3 className="font-semibold text-purple-800 mb-3">Keywords Sugeridas</h3>
          <div className="flex flex-wrap gap-2">
            {analysis.keywords_suggested.map((keyword, idx) => (
              <span
                key={idx}
                className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm font-medium border border-purple-200"
              >
                #{keyword}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Botão para reanalisar */}
      {isOwner && (
        <Button
          onClick={analyzeResume}
          disabled={loading}
          className="w-full mt-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-3"
        >
          {loading ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Reanalisa ndo...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 mr-2" />
              Reanalisar Currículo
            </>
          )}
        </Button>
      )}
    </motion.div>
  );
}
