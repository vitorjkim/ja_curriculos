/**
 * JobMatchCard - Design moderno inspirado em Notion/Linear/Stripe
 * Exibe compatibilidade com badges expansíveis e simulador de evolução
 */
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronDown, 
  ChevronRight,
  Sparkles,
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  TrendingUp,
  Target,
  Lightbulb,
  Check
} from 'lucide-react';

const getApiUrl = () => {
  const apiUrl = import.meta.env.VITE_API_URL;
  if (apiUrl) {
    const base = apiUrl.replace(/\/$/, '');
    return base.endsWith('/api') ? base : `${base}/api`;
  }
  return window.location.hostname === 'localhost' ? 'http://localhost:3001/api' : 'https://jacurriculos-production.up.railway.app/api';
};

const getScoreColor = (score) => {
  if (score >= 75) return { text: 'text-emerald-600', bg: 'bg-emerald-500', ring: 'ring-emerald-500/20', light: 'bg-emerald-50', border: 'border-emerald-200' };
  if (score >= 50) return { text: 'text-amber-600', bg: 'bg-amber-500', ring: 'ring-amber-500/20', light: 'bg-amber-50', border: 'border-amber-200' };
  return { text: 'text-red-600', bg: 'bg-red-500', ring: 'ring-red-500/20', light: 'bg-red-50', border: 'border-red-200' };
};

const getScoreLabel = (score) => {
  if (score >= 85) return 'Excelente compatibilidade';
  if (score >= 70) return 'Boa compatibilidade';
  if (score >= 50) return 'Compatibilidade moderada';
  if (score >= 30) return 'Compatibilidade baixa';
  return 'Pouca compatibilidade';
};

const getDifficultyLabel = (level) => {
  if (level <= 2) return 'Estágio';
  if (level <= 4) return 'Júnior';
  if (level <= 6) return 'Pleno';
  if (level <= 8) return 'Sênior';
  return 'Especialista';
};

const getPriorityBadgeColor = (priority) => {
  if (priority === 'Alta') return 'bg-rose-100 text-rose-700 border-rose-200';
  if (priority === 'Média') return 'bg-amber-100 text-amber-700 border-amber-200';
  return 'bg-slate-100 text-slate-600 border-slate-200';
};

const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 horas

const getCachedMatch = (jobId, resumeId, resumeScore) => {
  try {
    const raw = localStorage.getItem(`jobmatch_${jobId}_${resumeId}`);
    if (!raw) return null;
    const { data, timestamp, scoreUsed } = JSON.parse(raw);
    if (Date.now() - timestamp > CACHE_TTL) { 
      localStorage.removeItem(`jobmatch_${jobId}_${resumeId}`); 
      return null; 
    }
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

// Badge expansível
function ExpandableBadge({ icon: Icon, title, children, variant = 'default' }) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const bgColors = {
    default: 'bg-slate-50 hover:bg-slate-100 border-slate-200',
    success: 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200',
    opportunity: 'bg-indigo-50 hover:bg-indigo-100 border-indigo-200'
  };
  
  return (
    <motion.div
      layout
      className={`border rounded-xl overflow-hidden transition-all ${bgColors[variant]}`}
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:cursor-pointer group"
      >
        <div className="flex items-center gap-2.5">
          {Icon && <Icon className="w-4 h-4 text-slate-600 flex-shrink-0" />}
          <span className="text-sm font-medium text-slate-900">{title}</span>
        </div>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-4 h-4 text-slate-400" />
        </motion.div>
      </button>
      
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1">
              <p className="text-sm text-slate-600 leading-relaxed">{children}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Card de oportunidade com checkbox para simulação
function OpportunityCard({ opportunity, isChecked, onToggle }) {
  const priorityColor = getPriorityBadgeColor(opportunity.priority);
  
  return (
    <motion.div
      layout
      className={`border rounded-xl p-4 transition-all ${
        isChecked 
          ? 'bg-indigo-50 border-indigo-200 shadow-sm' 
          : 'bg-white border-slate-200 hover:border-slate-300'
      }`}
    >
      <div className="flex items-start gap-3">
        <button
          onClick={onToggle}
          className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded border-2 transition-all flex items-center justify-center ${
            isChecked
              ? 'bg-indigo-600 border-indigo-600'
              : 'border-slate-300 hover:border-indigo-400'
          }`}
        >
          {isChecked && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
        </button>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <h4 className="text-sm font-semibold text-slate-900">{opportunity.skill}</h4>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${priorityColor}`}>
              {opportunity.priority}
            </span>
          </div>
          
          <p className="text-xs text-slate-600 mb-2 leading-relaxed">{opportunity.reason}</p>
          
          <div className="flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-xs font-bold text-emerald-600">+{opportunity.impact}%</span>
            <span className="text-xs text-slate-500">de impacto estimado</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function JobMatchCard({ jobId, resumeId, resumeScore = 0 }) {
  const [match, setMatch] = useState(() => getCachedMatch(jobId, resumeId, resumeScore));
  const [loading, setLoading] = useState(!match);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [checkedOpportunities, setCheckedOpportunities] = useState(new Set());

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
      const isTransient = err.message?.includes('503') || err.message?.includes('sobrecarga') || err.message?.includes('high demand') || err.message?.includes('UNAVAILABLE');
      if (!isTransient) setError(err.message);
    } finally {
      setLoading(false);
      window.dispatchEvent(new Event('ai-request-end'));
    }
  };

  // Calcula score simulado baseado nas oportunidades marcadas
  const simulatedScore = useMemo(() => {
    if (!match?.opportunities) return match?.matchScore || 0;
    
    const baseScore = match.matchScore || 0;
    let bonusScore = 0;
    
    checkedOpportunities.forEach(index => {
      const opp = match.opportunities[index];
      if (opp) bonusScore += opp.impact || 0;
    });
    
    return Math.min(100, baseScore + bonusScore);
  }, [match, checkedOpportunities]);

  const toggleOpportunity = (index) => {
    setCheckedOpportunities(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  // Loading state
  if (loading) {
    return (
      <div className="w-full bg-white rounded-2xl border border-slate-200 p-6 flex items-center gap-4 shadow-sm">
        <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
          <RefreshCw className="w-6 h-6 text-indigo-600 animate-spin" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">Analisando compatibilidade...</p>
          <p className="text-xs text-slate-500 mt-0.5">Nossa IA está avaliando seu perfil</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="w-full bg-red-50 rounded-2xl border border-red-200 p-6 flex items-center gap-4">
        <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium text-red-900">{error}</p>
        </div>
        <button 
          onClick={fetchMatch} 
          className="text-sm text-red-700 hover:text-red-900 font-medium underline"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  if (!match) return null;

  const currentScore = checkedOpportunities.size > 0 ? simulatedScore : match.matchScore;
  const colors = getScoreColor(currentScore);
  const scoreLabel = getScoreLabel(currentScore);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
    >
      {/* Header - sempre visível */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-6 py-5 flex items-center gap-5 hover:bg-slate-50/50 transition-colors text-left"
      >
        {/* Donut chart grande e chamativo */}
        <div className="relative w-20 h-20 flex-shrink-0">
          <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 120 120">
            {/* Background circle */}
            <circle 
              cx="60" 
              cy="60" 
              r="52" 
              fill="none" 
              stroke="#f1f5f9" 
              strokeWidth="16" 
            />
            {/* Progress circle */}
            <motion.circle
              cx="60" 
              cy="60" 
              r="52"
              fill="none"
              stroke={currentScore >= 75 ? '#10b981' : currentScore >= 50 ? '#f59e0b' : '#ef4444'}
              strokeWidth="16"
              strokeDasharray={`${(currentScore / 100) * 326.73} 326.73`}
              strokeLinecap="round"
              initial={{ strokeDasharray: `${(match.matchScore / 100) * 326.73} 326.73` }}
              animate={{ strokeDasharray: `${(currentScore / 100) * 326.73} 326.73` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.span 
              className={`text-2xl font-black ${colors.text}`}
              key={currentScore}
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 20 }}
            >
              {currentScore}%
            </motion.span>
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Target className="w-4 h-4 text-indigo-600" />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Compatibilidade com a Vaga
            </span>
          </div>
          <h3 className={`text-lg font-bold ${colors.text} mb-1`}>{scoreLabel}</h3>
          <div className="flex items-center gap-4 text-xs text-slate-600">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">Vaga:</span>
              <span className="font-semibold text-slate-900">{getDifficultyLabel(match.jobDifficulty)}</span>
              <span className="text-slate-400">({match.jobDifficulty}/10)</span>
            </div>
            <span className="text-slate-300">•</span>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">Seu nível:</span>
              <span className="font-semibold text-slate-900">{getDifficultyLabel(match.candidateLevel)}</span>
              <span className="text-slate-400">({match.candidateLevel}/10)</span>
            </div>
          </div>
          
          {checkedOpportunities.size > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-2 flex items-center gap-1.5 text-xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span className="text-indigo-700 font-medium">
                Simulando {checkedOpportunities.size} {checkedOpportunities.size === 1 ? 'melhoria' : 'melhorias'}
              </span>
              <span className="text-slate-500">→</span>
              <span className="text-emerald-700 font-bold">+{simulatedScore - match.matchScore}%</span>
            </motion.div>
          )}
        </div>

        <ChevronDown 
          className={`w-5 h-5 text-slate-400 flex-shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Barra de progresso fina (sempre visível) */}
      <div className="px-6 pb-5">
        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
          <motion.div
            className={`h-2 ${colors.bg} rounded-full`}
            initial={{ width: `${match.matchScore}%` }}
            animate={{ width: `${currentScore}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Conteúdo expandido */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden border-t border-slate-100"
          >
            <div className="px-6 py-8 space-y-8">
              
              {/* Pontos Fortes */}
              {match.strengths && match.strengths.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-4">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                      Por que você recebeu essa nota
                    </h4>
                  </div>
                  <div className="grid gap-2.5">
                    {match.strengths.map((strength, i) => (
                      <ExpandableBadge
                        key={i}
                        icon={CheckCircle2}
                        title={strength.category}
                        variant="success"
                      >
                        {strength.explanation}
                      </ExpandableBadge>
                    ))}
                  </div>
                </div>
              )}

              {/* Oportunidades de melhoria */}
              {match.opportunities && match.opportunities.length > 0 && (
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Lightbulb className="w-5 h-5 text-indigo-600" />
                      <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                        Como aumentar suas chances
                      </h4>
                    </div>
                    <p className="text-xs text-slate-500 mb-4">
                      Marque as melhorias que você conquistar e veja seu score crescer em tempo real
                    </p>
                  </div>
                  
                  <div className="space-y-3">
                    {match.opportunities.map((opportunity, i) => (
                      <OpportunityCard
                        key={i}
                        opportunity={opportunity}
                        isChecked={checkedOpportunities.has(i)}
                        onToggle={() => toggleOpportunity(i)}
                      />
                    ))}
                  </div>

                  {checkedOpportunities.size > 0 && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="mt-6 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-200"
                    >
                      <div className="flex items-start gap-3">
                        <Sparkles className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <h5 className="text-sm font-bold text-indigo-900 mb-1">
                            Simulação de evolução
                          </h5>
                          <p className="text-xs text-indigo-700 leading-relaxed">
                            Se você desenvolver {checkedOpportunities.size === 1 ? 'esta competência' : 'estas competências'}, 
                            sua compatibilidade estimada pode chegar a <span className="font-bold">{simulatedScore}%</span>.
                            Esta é uma simulação para orientar seu desenvolvimento profissional.
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              )}

              {/* Botão recalcular */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  fetchMatch();
                }}
                className="text-xs text-slate-500 hover:text-indigo-600 flex items-center gap-1.5 transition-colors group"
              >
                <RefreshCw className="w-3.5 h-3.5 group-hover:rotate-180 transition-transform duration-500" />
                Recalcular compatibilidade
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
