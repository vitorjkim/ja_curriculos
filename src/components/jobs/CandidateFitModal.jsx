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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 bg-slate-50">
        <DialogHeader className="sticky top-0 z-50 bg-white border-b border-slate-200 px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className="text-xl font-bold text-slate-900">
                Análise de Compatibilidade
              </DialogTitle>
              <p className="text-sm text-slate-500 mt-1">
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

        <div className="px-6 py-6 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader className="w-8 h-8 text-blue-600 animate-spin" />
              <span className="ml-3 text-slate-600">Carregando análise...</span>
            </div>
          ) : error ? (
            <div className="rounded-lg bg-red-50 border border-red-200 p-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
              <Button
                onClick={loadAnalysis}
                className="mt-3 bg-red-600 hover:bg-red-700 text-white"
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
                className={`rounded-2xl border-2 p-6 ${getScoreBackground(analysis.matchingScore)}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-slate-900">Compatibilidade</h3>
                  {analysis.matchingScore >= 60 ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                  ) : analysis.matchingScore >= 40 ? (
                    <AlertTriangle className="w-6 h-6 text-amber-600" />
                  ) : (
                    <AlertCircle className="w-6 h-6 text-red-600" />
                  )}
                </div>
                <div className="flex items-baseline gap-2">
                  <span className={`text-5xl font-bold ${getScoreColor(analysis.matchingScore)}`}>
                    {analysis.matchingScore}%
                  </span>
                  <span className={`text-lg font-medium ${getScoreColor(analysis.matchingScore)}`}>
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
                  className="rounded-xl bg-white border border-slate-200 p-4"
                >
                  <p className="text-sm leading-relaxed text-slate-700">
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
                  className="rounded-xl bg-white border border-slate-200 overflow-hidden"
                >
                  <div className="bg-emerald-50 border-b border-emerald-100 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      <h3 className="font-semibold text-emerald-900">
                        Pontos que se aproximam da vaga ({analysis.scoreBreakdown.strengths.length})
                      </h3>
                    </div>
                  </div>
                  <div className="p-4 space-y-3">
                    {analysis.scoreBreakdown.strengths.map((strength, idx) => (
                      <div key={idx} className="flex gap-3 pb-3 border-b border-slate-100 last:border-0 last:pb-0">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full flex-shrink-0 mt-1.5" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900 text-sm">{strength.keyword}</p>
                          <p className="text-sm text-slate-600 mt-1">{strength.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Motivos do Score - Gaps */}
              {analysis.scoreBreakdown?.gaps && analysis.scoreBreakdown.gaps.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.3 }}
                  className="rounded-xl bg-white border border-slate-200 overflow-hidden"
                >
                  <div className="bg-amber-50 border-b border-amber-100 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-amber-600" />
                      <h3 className="font-semibold text-amber-900">
                        O que falta para 100% ({analysis.scoreBreakdown.gaps.length})
                      </h3>
                    </div>
                  </div>
                  <div className="p-4 space-y-3">
                    {analysis.scoreBreakdown.gaps.map((gap, idx) => (
                      <div key={idx} className="flex gap-3 pb-3 border-b border-slate-100 last:border-0 last:pb-0">
                        <div className="w-2 h-2 bg-amber-500 rounded-full flex-shrink-0 mt-1.5" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900 text-sm">{gap.keyword}</p>
                          <p className="text-sm text-slate-600 mt-1">{gap.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Sugestões de Melhoria */}
              {analysis.scoreBreakdown?.improvements && analysis.scoreBreakdown.improvements.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.4 }}
                  className="rounded-xl bg-white border border-slate-200 overflow-hidden"
                >
                  <div className="bg-blue-50 border-b border-blue-100 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Zap className="w-5 h-5 text-blue-600" />
                      <h3 className="font-semibold text-blue-900">
                        Sugestões para melhorar o match
                      </h3>
                    </div>
                  </div>
                  <div className="p-4 space-y-3">
                    {analysis.scoreBreakdown.improvements.map((improvement, idx) => (
                      <div key={idx} className="flex gap-3 pb-3 border-b border-slate-100 last:border-0 last:pb-0">
                        <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1.5" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-medium text-slate-900 text-sm">{improvement.label}</p>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">
                              +{improvement.gain}%
                            </span>
                          </div>
                          {improvement.category && (
                            <p className="text-xs text-slate-500 mt-1 capitalize">
                              Categoria: {improvement.category}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Possíveis Riscos */}
              {analysis.risks && analysis.risks.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.5 }}
                  className="rounded-xl bg-white border border-slate-200 overflow-hidden"
                >
                  <div className="bg-red-50 border-b border-red-100 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-red-600" />
                      <h3 className="font-semibold text-red-900">
                        Possíveis riscos ({analysis.risks.length})
                      </h3>
                    </div>
                  </div>
                  <div className="p-4 space-y-3">
                    {analysis.risks.map((risk, idx) => (
                      <div key={idx} className="flex gap-3 pb-3 border-b border-slate-100 last:border-0 last:pb-0">
                        <span className="text-xl flex-shrink-0">{risk.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900 text-sm">{risk.title}</p>
                          <p className="text-sm text-slate-600 mt-1">{risk.description}</p>
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
