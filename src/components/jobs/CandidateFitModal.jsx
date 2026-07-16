import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, AlertCircle, TrendingUp, AlertTriangle, CheckCircle2, Zap, Loader } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import { aiAPI } from '@/lib/api';

const CandidateFitModal = ({ isOpen, onClose, applicationId, candidateName, jobTitle }) => {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && applicationId) {
      loadAnalysis();
    }
  }, [isOpen, applicationId]);

  const loadAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await aiAPI.analyzeCandidateFit(applicationId);
      setAnalysis(response);
    } catch (err) {
      console.error('Erro ao carregar análise:', err);
      setError('Não foi possível carregar a análise de compatibilidade. Tente novamente.');
      toast({
        title: 'Erro',
        description: 'Falha ao carregar análise de compatibilidade.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-emerald-700';
    if (score >= 60) return 'text-blue-700';
    if (score >= 40) return 'text-amber-700';
    return 'text-red-700';
  };

  const getScoreBackground = (score) => {
    if (score >= 80) return 'bg-emerald-50 border-emerald-200';
    if (score >= 60) return 'bg-blue-50 border-blue-200';
    if (score >= 40) return 'bg-amber-50 border-amber-200';
    return 'bg-red-50 border-red-200';
  };

  const getScoreLabel = (score) => {
    if (score >= 80) return 'Excelente';
    if (score >= 60) return 'Boa';
    if (score >= 40) return 'Moderada';
    return 'Baixa';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[86vh] overflow-hidden p-0 bg-slate-50 rounded-2xl">
        <DialogHeader className="sticky top-0 z-50 bg-white border-b border-slate-200 px-4 sm:px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-lg sm:text-xl font-bold text-slate-900 break-words">
                Análise de Compatibilidade
              </DialogTitle>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 break-words">
                {candidateName} para a vaga de {jobTitle}
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </DialogHeader>

        <div className="max-h-[calc(86vh-72px)] overflow-y-auto px-4 sm:px-5 py-4 space-y-3 sm:space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader className="w-8 h-8 text-blue-600 animate-spin" />
              <span className="ml-3 text-slate-600">Carregando análise...</span>
            </div>
          ) : error ? (
            <div className="rounded-2xl bg-red-50 border border-red-200 p-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <p className="text-sm text-red-700 break-words">{error}</p>
              </div>
              <Button
                onClick={loadAnalysis}
                className="mt-3 bg-red-600 hover:bg-red-700 text-white rounded-xl"
              >
                Tentar Novamente
              </Button>
            </div>
          ) : analysis ? (
            <>
              {/* Score Principal */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={`rounded-2xl border-2 p-4 sm:p-5 ${getScoreBackground(analysis.matchingScore)}`}
              >
                <div className="flex items-center justify-between gap-3 mb-3">
                  <h3 className="text-base sm:text-lg font-semibold text-slate-900">Compatibilidade</h3>
                  {analysis.matchingScore >= 60 ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                  ) : analysis.matchingScore >= 40 ? (
                    <AlertTriangle className="w-6 h-6 text-amber-600" />
                  ) : (
                    <AlertCircle className="w-6 h-6 text-red-600" />
                  )}
                </div>
                <div className="flex items-end gap-3 flex-wrap">
                  <span className={`text-4xl sm:text-5xl font-bold leading-none ${getScoreColor(analysis.matchingScore)}`}>
                    {analysis.matchingScore}%
                  </span>
                  <span className={`text-sm sm:text-base font-medium ${getScoreColor(analysis.matchingScore)} break-words max-w-[14rem]`}>
                    {getScoreLabel(analysis.matchingScore)} compatibilidade
                  </span>
                </div>
              </motion.div>

              {/* Resumo Automático */}
              {analysis.summary && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                  className="rounded-2xl bg-white border border-slate-200 p-4"
                >
                  <p className="text-sm leading-6 text-slate-700 break-words">
                    {analysis.summary}
                  </p>
                </motion.div>
              )}

              {/* Motivos do Score - Strengths */}
              {analysis.scoreBreakdown?.strengths && analysis.scoreBreakdown.strengths.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.2 }}
                  className="rounded-2xl bg-white border border-slate-200 overflow-hidden"
                >
                  <div className="bg-emerald-50 border-b border-emerald-100 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <h3 className="font-semibold text-emerald-900 text-sm sm:text-base break-words">
                        Pontos que se aproximam da vaga ({analysis.scoreBreakdown.strengths.length})
                      </h3>
                    </div>
                  </div>
                  <div className="p-4 space-y-3">
                    {analysis.scoreBreakdown.strengths.slice(0, 3).map((strength, idx) => (
                      <div key={idx} className="flex gap-3 pb-3 border-b border-slate-100 last:border-0 last:pb-0 min-w-0">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full flex-shrink-0 mt-1.5" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900 text-sm break-words">{strength.keyword}</p>
                          <p className="text-sm text-slate-600 mt-1 break-words leading-6">{strength.text}</p>
                        </div>
                      </div>
                    ))}
                    {analysis.scoreBreakdown.strengths.length > 3 && (
                      <p className="text-xs text-slate-400">Mostrando apenas os 3 principais pontos fortes.</p>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Motivos do Score - Gaps */}
              {analysis.scoreBreakdown?.gaps && analysis.scoreBreakdown.gaps.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.3 }}
                  className="rounded-2xl bg-white border border-slate-200 overflow-hidden"
                >
                  <div className="bg-amber-50 border-b border-amber-100 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                      <h3 className="font-semibold text-amber-900 text-sm sm:text-base break-words">
                        O que falta para 100% ({analysis.scoreBreakdown.gaps.length})
                      </h3>
                    </div>
                  </div>
                  <div className="p-4 space-y-3">
                    {analysis.scoreBreakdown.gaps.slice(0, 3).map((gap, idx) => (
                      <div key={idx} className="flex gap-3 pb-3 border-b border-slate-100 last:border-0 last:pb-0 min-w-0">
                        <div className="w-2 h-2 bg-amber-500 rounded-full flex-shrink-0 mt-1.5" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900 text-sm break-words">{gap.keyword}</p>
                          <p className="text-sm text-slate-600 mt-1 break-words leading-6">{gap.text}</p>
                        </div>
                      </div>
                    ))}
                    {analysis.scoreBreakdown.gaps.length > 3 && (
                      <p className="text-xs text-slate-400">Mostrando apenas os 3 principais itens pendentes.</p>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Sugestões de Melhoria */}
              {analysis.scoreBreakdown?.improvements && analysis.scoreBreakdown.improvements.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.4 }}
                  className="rounded-2xl bg-white border border-slate-200 overflow-hidden"
                >
                  <div className="bg-blue-50 border-b border-blue-100 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-blue-600 flex-shrink-0" />
                      <h3 className="font-semibold text-blue-900 text-sm sm:text-base break-words">
                        Sugestões para melhorar o match
                      </h3>
                    </div>
                  </div>
                  <div className="p-4 space-y-3">
                    {analysis.scoreBreakdown.improvements.slice(0, 3).map((improvement, idx) => (
                      <div key={idx} className="flex gap-3 pb-3 border-b border-slate-100 last:border-0 last:pb-0 min-w-0">
                        <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1.5" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-medium text-slate-900 text-sm break-words">{improvement.label}</p>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">
                              +{improvement.gain}%
                            </span>
                          </div>
                          {improvement.category && (
                            <p className="text-xs text-slate-500 mt-1 capitalize break-words">
                              Categoria: {improvement.category}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                    {analysis.scoreBreakdown.improvements.length > 3 && (
                      <p className="text-xs text-slate-400">Mostrando apenas as 3 principais sugestões.</p>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Possíveis Riscos */}
              {analysis.risks && analysis.risks.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.5 }}
                  className="rounded-2xl bg-white border border-slate-200 overflow-hidden"
                >
                  <div className="bg-red-50 border-b border-red-100 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                      <h3 className="font-semibold text-red-900 text-sm sm:text-base break-words">
                        Possíveis riscos ({analysis.risks.length})
                      </h3>
                    </div>
                  </div>
                  <div className="p-4 space-y-3">
                    {analysis.risks.slice(0, 3).map((risk, idx) => (
                      <div key={idx} className="flex gap-3 pb-3 border-b border-slate-100 last:border-0 last:pb-0 min-w-0">
                        <span className="text-xl flex-shrink-0">{risk.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900 text-sm break-words">{risk.title}</p>
                          <p className="text-sm text-slate-600 mt-1 break-words leading-6">{risk.description}</p>
                          {risk.severity && (
                            <span className={`inline-flex text-xs font-semibold mt-2 px-2 py-0.5 rounded-full ${
                              risk.severity === 'high' ? 'bg-red-100 text-red-700' :
                              risk.severity === 'medium' ? 'bg-amber-100 text-amber-700' :
                              'bg-blue-100 text-blue-700'
                            }`}>
                              {risk.severity === 'high' ? 'Alto' : risk.severity === 'medium' ? 'Médio' : 'Baixo'}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                    {analysis.risks.length > 3 && (
                      <p className="text-xs text-slate-400">Mostrando apenas os 3 principais riscos.</p>
                    )}
                  </div>
                </motion.div>
              )}
            </>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CandidateFitModal;
