/**
 * ResumeScoreCard - Componente para exibir análise de currículo com IA
 * Mostra score geral (0-100) + breakdown de 5 métricas + sugestões
 */

import React, { useState } from 'react';
import { AlertCircle, CheckCircle, AlertTriangle, Zap, RefreshCw, ChevronDown, ChevronUp, Lightbulb } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Função para obter a URL da API baseada no ambiente
const getApiUrl = () => {
  console.log('🔍 getApiUrl() chamado');
  console.log('  import.meta.env.VITE_API_URL:', import.meta.env.VITE_API_URL);
  console.log('  hostname:', window.location.hostname);
  
  // 1. Tentar usar variável de ambiente
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) {
    console.log('📡 Usando VITE_API_URL:', envUrl);
    return envUrl;
  }
  
  // 2. Detectar baseado no hostname
  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    console.log('🏠 Ambiente local detectado');
    return 'http://localhost:3001/api';
  }
  
  // 3. Para produção em ja-curriculos.vercel.app, usar Railway backend
  if (hostname.includes('vercel.app') || hostname.includes('ja-curriculos')) {
    console.log('🚀 Ambiente Vercel/produção detectado');
    // Tentar obter URL do localStorage (definida no login)
    const savedApiUrl = localStorage.getItem('api_url');
    if (savedApiUrl) {
      console.log('💾 URL do localStorage:', savedApiUrl);
      return savedApiUrl;
    }
    // Fallback para URL padrão do Railway
    const railwayUrl = 'https://jacurriculos-production.up.railway.app/api';
    console.log('🚂 Usando Railway URL:', railwayUrl);
    return railwayUrl;
  }
  
  // Fallback padrão
  console.log('⚠️ Usando fallback:', '/api');
  return '/api';
};

export default function ResumeScoreCard({ resumeId, onAnalyzeStart, onAnalyzeComplete }) {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedSuggestions, setExpandedSuggestions] = useState(false);

  // Log do ambiente
  console.log('🔧 ResumeScoreCard loaded');
  console.log('  VITE_API_URL:', import.meta.env.VITE_API_URL);
  console.log('  hostname:', window.location.hostname);
  console.log('  env.MODE:', import.meta.env.MODE);

  // Função para analisar currículo
  const handleAnalyze = async () => {
    try {
      setLoading(true);
      setError(null);
      onAnalyzeStart?.();

      // Obter token do localStorage
      const token = localStorage.getItem('curriculoja_token');
      if (!token) {
        throw new Error('Não autenticado. Faça login novamente.');
      }

      // Obter URL da API baseada no ambiente
      const apiUrl = getApiUrl();
      const url = `${apiUrl}/resumes/${resumeId}/analyze`;
      console.log('🔗 Fazendo requisição para:', url);

      const response = await fetch(url, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        let errorMessage = 'Erro ao analisar currículo';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          // Se não conseguir fazer parse do JSON, usar mensagem padrão
          errorMessage = `Erro ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      setAnalysis(data);
      onAnalyzeComplete?.(data);
    } catch (err) {
      console.error('Erro na análise:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Cor do score baseado na nota
  const getScoreColor = (score) => {
    if (score >= 80) return 'from-emerald-500 to-teal-500';
    if (score >= 60) return 'from-yellow-500 to-amber-500';
    return 'from-red-500 to-orange-500';
  };

  // Classe de barra de progresso
  const getProgressColor = (score) => {
    if (score >= 80) return 'bg-emerald-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // Ícone de sugestão por prioridade
  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'critical':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      case 'important':
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      case 'recommended':
        return <Lightbulb className="w-4 h-4 text-blue-600" />;
      default:
        return null;
    }
  };

  // Se não tem análise e não está carregando
  if (!analysis && !loading && !error) {
    return (
      <div className="w-full bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Zap className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Análise de Qualidade</h3>
              <p className="text-xs text-gray-600">Descubra como melhorar seu currículo</p>
            </div>
          </div>
        </div>

        <button
          onClick={handleAnalyze}
          disabled={loading}
          className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-400 text-white font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Analisando currículo...
            </>
          ) : (
            <>
              <Zap className="w-4 h-4" />
              Analisar agora
            </>
          )}
        </button>
      </div>
    );
  }

  // Se houver erro
  if (error) {
    return (
      <div className="w-full bg-red-50 rounded-2xl p-6 border border-red-200">
        <div className="flex items-start gap-3 mb-4">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="font-semibold text-red-900">Erro na análise</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
        <button
          onClick={handleAnalyze}
          disabled={loading}
          className="w-full py-2 px-4 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  // Análise completa
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full space-y-6"
    >
      {/* Card Principal - Score Geral */}
      <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Score de Qualidade</h3>
            <p className="text-sm text-gray-600">{analysis?.summary || 'Análise concluída'}</p>
          </div>
          <button
            onClick={handleAnalyze}
            disabled={loading}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Reanalizar"
          >
            <RefreshCw className={`w-5 h-5 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Score Visual Circular */}
        <div className="flex items-center justify-center mb-8">
          <div className="relative w-32 h-32">
            {/* Background círculo */}
            <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
              <circle
                cx="60"
                cy="60"
                r="54"
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="8"
              />
              {/* Progresso */}
              <circle
                cx="60"
                cy="60"
                r="54"
                fill="none"
                stroke="url(#scoreGradient)"
                strokeWidth="8"
                strokeDasharray={`${(analysis?.score / 100) * 339.29} 339.29`}
                strokeLinecap="round"
                className="transition-all duration-1000"
              />
              <defs>
                <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={analysis?.score >= 80 ? '#10b981' : analysis?.score >= 60 ? '#eab308' : '#ef4444'} />
                  <stop offset="100%" stopColor={analysis?.score >= 80 ? '#14b8a6' : analysis?.score >= 60 ? '#f59e0b' : '#f97316'} />
                </linearGradient>
              </defs>
            </svg>

            {/* Texto no centro */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-black text-gray-900">{Math.round(analysis?.score || 0)}</span>
              <span className="text-xs text-gray-600">/100</span>
            </div>
          </div>
        </div>

        {/* Grid de 5 Scores */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: 'Completude', key: 'completeness_score', icon: '📝' },
            { label: 'Qualidade', key: 'quality_score', icon: '✨' },
            { label: 'Relevância', key: 'relevance_score', icon: '🎯' },
            { label: 'Impacto', key: 'impact_score', icon: '⚡' },
            { label: 'Geral', key: 'score', icon: '🏆' }
          ].map((metric) => (
            <div key={metric.key} className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-3 text-center border border-gray-200">
              <div className="text-xl mb-1">{metric.icon}</div>
              <div className="text-2xl font-bold text-gray-900">{analysis?.[metric.key] || 0}</div>
              <div className="text-xs text-gray-600 mt-1">{metric.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Sugestões */}
      {analysis?.suggestions && analysis.suggestions.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <button
            onClick={() => setExpandedSuggestions(!expandedSuggestions)}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Lightbulb className="w-5 h-5 text-amber-600" />
              </div>
              <div className="text-left">
                <h4 className="font-semibold text-gray-900">Sugestões de Melhoria</h4>
                <p className="text-xs text-gray-600">{analysis.suggestions.length} recomendações</p>
              </div>
            </div>
            {expandedSuggestions ? (
              <ChevronUp className="w-5 h-5 text-gray-600" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-600" />
            )}
          </button>

          <AnimatePresence>
            {expandedSuggestions && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="border-t border-gray-200 overflow-hidden"
              >
                <div className="px-6 py-4 space-y-3 max-h-96 overflow-y-auto">
                  {analysis.suggestions.map((suggestion, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-lg border ${
                        suggestion.priority === 'critical'
                          ? 'bg-red-50 border-red-200'
                          : suggestion.priority === 'important'
                          ? 'bg-yellow-50 border-yellow-200'
                          : 'bg-blue-50 border-blue-200'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex-shrink-0">
                          {getPriorityIcon(suggestion.priority)}
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-sm text-gray-900">
                            {suggestion.title}
                          </div>
                          <p className="text-xs text-gray-700 mt-1">
                            {suggestion.description}
                          </p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-gray-600">
                              Categoria: <span className="font-medium">{suggestion.category}</span>
                            </span>
                            <span className="text-xs font-semibold text-gray-700 bg-white/50 px-2 py-1 rounded">
                              +{suggestion.impact} pts
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Pontos Fortes e Seções Faltando */}
      <div className="grid md:grid-cols-2 gap-4">
        {analysis?.key_strengths && analysis.key_strengths.length > 0 && (
          <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-200">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
              <h5 className="font-semibold text-emerald-900">Pontos Fortes</h5>
            </div>
            <ul className="space-y-2">
              {analysis.key_strengths.map((strength, idx) => (
                <li key={idx} className="text-sm text-emerald-800 flex items-start gap-2">
                  <span className="text-emerald-600 mt-0.5">•</span>
                  <span>{strength}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {analysis?.missing_sections && analysis.missing_sections.length > 0 && (
          <div className="bg-orange-50 rounded-2xl p-4 border border-orange-200">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              <h5 className="font-semibold text-orange-900">Seções Faltando</h5>
            </div>
            <ul className="space-y-2">
              {analysis.missing_sections.map((section, idx) => (
                <li key={idx} className="text-sm text-orange-800 flex items-start gap-2">
                  <span className="text-orange-600 mt-0.5">•</span>
                  <span>{section}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Keywords Sugeridas */}
      {analysis?.keywords_suggested && analysis.keywords_suggested.length > 0 && (
        <div className="bg-white rounded-2xl p-4 border border-gray-200">
          <h5 className="font-semibold text-gray-900 mb-3">Keywords Sugeridas</h5>
          <div className="flex flex-wrap gap-2">
            {analysis.keywords_suggested.slice(0, 10).map((keyword, idx) => (
              <span
                key={idx}
                className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-full"
              >
                {keyword}
              </span>
            ))}
            {analysis.keywords_suggested.length > 10 && (
              <span className="px-3 py-1 bg-gray-100 text-gray-600 text-sm font-medium rounded-full">
                +{analysis.keywords_suggested.length - 10} mais
              </span>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}
