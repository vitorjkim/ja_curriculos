/**
 * ResumeAnalyzerComponent.jsx
 * Componente React para análise de currículos com IA
 * 
 * Uso:
 * <ResumeAnalyzer resumeId={resumeId} token={token} />
 */

import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export function ResumeAnalyzer({ resumeId, token }) {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [cached, setCached] = useState(false);

  const handleAnalyzeResume = async () => {
    setLoading(true);
    setError(null);
    setCached(false);

    try {
      const response = await fetch(`/api/ai/analyze-resume/${resumeId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Erro: ${response.statusText}`);
      }

      const data = await response.json();
      setAnalysis(data);
      setCached(data.cached || false);
    } catch (err) {
      setError(err.message);
      console.error('Erro ao analisar currículo:', err);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 75) return 'text-blue-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 45) return 'text-orange-600';
    return 'text-red-600';
  };

  const getScoreEmoji = (score) => {
    if (score >= 90) return '🟢';
    if (score >= 75) return '🔵';
    if (score >= 60) return '🟡';
    if (score >= 45) return '🟠';
    return '🔴';
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          Análise de Qualidade do Currículo
        </h2>
        <p className="text-gray-600">
          Utilize nossa IA para receber sugestões de melhoria e um score de qualidade
        </p>
      </div>

      {/* Botão de Análise */}
      <div className="mb-6">
        <button
          onClick={handleAnalyzeResume}
          disabled={loading}
          className={`px-6 py-3 rounded-lg font-semibold text-white transition-colors ${
            loading
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
          }`}
        >
          {loading ? '🔄 Analisando com IA...' : '🚀 Analisar Currículo'}
        </button>
        {cached && (
          <span className="ml-3 text-sm text-green-600">
            ✓ Resultado em cache (análise recente)
          </span>
        )}
      </div>

      {/* Erro */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
          <p className="text-red-800 font-semibold">Erro na análise</p>
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Resultado */}
      {analysis && (
        <div className="space-y-6">
          {/* Score Principal */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border-2 border-blue-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-800">Score de Qualidade</h3>
              <span className={`text-5xl font-bold ${getScoreColor(analysis.score)}`}>
                {getScoreEmoji(analysis.score)}
              </span>
            </div>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-full bg-gray-300 rounded-full h-8 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    analysis.score >= 90 ? 'bg-green-500' :
                    analysis.score >= 75 ? 'bg-blue-500' :
                    analysis.score >= 60 ? 'bg-yellow-500' :
                    analysis.score >= 45 ? 'bg-orange-500' :
                    'bg-red-500'
                  }`}
                  style={{ width: `${analysis.score}%` }}
                />
              </div>
              <span className={`text-3xl font-bold ${getScoreColor(analysis.score)}`}>
                {analysis.score}/100
              </span>
            </div>
            <p className="text-gray-700 italic">
              {analysis.scoreExplanation}
            </p>
          </div>

          {/* Resumo */}
          <div className="bg-blue-50 rounded-lg p-4 border-l-4 border-blue-500">
            <p className="text-gray-800">
              <strong>Resumo:</strong> {analysis.summary}
            </p>
          </div>

          {/* Pontos Fortes */}
          {analysis.strengths && analysis.strengths.length > 0 && (
            <div>
              <h4 className="text-lg font-bold text-green-700 mb-3">
                ✓ Pontos Fortes ({analysis.strengths.length})
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {analysis.strengths.map((strength, idx) => (
                  <div
                    key={idx}
                    className="bg-green-50 border-l-4 border-green-500 p-3 rounded"
                  >
                    <p className="font-semibold text-green-900">{strength.name}</p>
                    <p className="text-sm text-green-800">{strength.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Áreas para Melhorar */}
          {analysis.improvements && analysis.improvements.length > 0 && (
            <div>
              <h4 className="text-lg font-bold text-orange-700 mb-3">
                ⚠️ Áreas para Melhorar ({analysis.improvements.length})
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {analysis.improvements.map((improvement, idx) => (
                  <div
                    key={idx}
                    className="bg-orange-50 border-l-4 border-orange-500 p-3 rounded"
                  >
                    <p className="font-semibold text-orange-900">{improvement.area}</p>
                    <p className="text-sm text-orange-800">{improvement.suggestion}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Palavras-chave Faltando */}
          {analysis.missingKeywords && analysis.missingKeywords.length > 0 && (
            <div>
              <h4 className="text-lg font-bold text-red-700 mb-3">
                🔍 Habilidades/Palavras-chave Faltando
              </h4>
              <div className="flex flex-wrap gap-2">
                {analysis.missingKeywords.map((keyword, idx) => (
                  <span
                    key={idx}
                    className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Recomendações */}
          {analysis.recommendations && (
            <div>
              <h4 className="text-lg font-bold text-blue-700 mb-3">
                💡 Recomendações Detalhadas
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {Object.entries(analysis.recommendations).map(([category, tip], idx) => (
                  <div
                    key={idx}
                    className="bg-blue-50 border border-blue-200 rounded-lg p-4"
                  >
                    <p className="font-semibold text-blue-900 capitalize mb-2">
                      {category}
                    </p>
                    <p className="text-sm text-blue-800">{tip}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cursos Sugeridos */}
          {analysis.suggestedCourses && analysis.suggestedCourses.length > 0 && (
            <div>
              <h4 className="text-lg font-bold text-purple-700 mb-3">
                📚 Cursos Recomendados
              </h4>
              <div className="space-y-2">
                {analysis.suggestedCourses.map((course, idx) => (
                  <div
                    key={idx}
                    className="bg-purple-50 border-l-4 border-purple-500 p-3 rounded flex items-center"
                  >
                    <span className="text-purple-700 mr-3">📖</span>
                    <span className="text-purple-900 font-medium">{course}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * CandidateRankingComponent.jsx
 * Componente para visualizar ranking de candidatos (para empresas)
 */

export function CandidateRanking({ jobId, token }) {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLoadRanking = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/ai/job-ranking/${jobId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`Erro: ${response.statusText}`);
      }

      const data = await response.json();
      setCandidates(data.candidates || []);
    } catch (err) {
      setError(err.message);
      console.error('Erro ao carregar ranking:', err);
    } finally {
      setLoading(false);
    }
  };

  const getScoreBadge = (score) => {
    if (score >= 90) return { color: 'bg-green-100 text-green-800', emoji: '🟢' };
    if (score >= 75) return { color: 'bg-blue-100 text-blue-800', emoji: '🔵' };
    if (score >= 60) return { color: 'bg-yellow-100 text-yellow-800', emoji: '🟡' };
    if (score >= 45) return { color: 'bg-orange-100 text-orange-800', emoji: '🟠' };
    return { color: 'bg-red-100 text-red-800', emoji: '🔴' };
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          Ranking de Candidatos
        </h2>
        <p className="text-gray-600">
          Candidatos classificados por compatibilidade com a vaga
        </p>
      </div>

      <button
        onClick={handleLoadRanking}
        disabled={loading}
        className={`px-6 py-2 rounded-lg font-semibold text-white transition-colors mb-6 ${
          loading
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700'
        }`}
      >
        {loading ? '🔄 Carregando...' : '📊 Carregar Ranking'}
      </button>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {candidates.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-100 border-b-2 border-gray-300">
                <th className="px-4 py-3 text-left font-bold text-gray-700">Ranking</th>
                <th className="px-4 py-3 text-left font-bold text-gray-700">Candidato</th>
                <th className="px-4 py-3 text-left font-bold text-gray-700">Email</th>
                <th className="px-4 py-3 text-center font-bold text-gray-700">Compatibilidade</th>
                <th className="px-4 py-3 text-left font-bold text-gray-700">Status</th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((candidate, idx) => {
                const badge = getScoreBadge(candidate.matching_score);
                return (
                  <tr
                    key={idx}
                    className={`border-b hover:bg-gray-50 transition ${
                      idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    }`}
                  >
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white font-bold">
                        {candidate.ranking}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-800">
                      {candidate.name}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {candidate.email}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <span className={`px-3 py-1 rounded-full font-bold ${badge.color}`}>
                          {badge.emoji} {candidate.matching_score}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-gray-200 text-gray-800">
                        {candidate.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {candidates.length === 0 && !loading && (
        <div className="text-center py-12 text-gray-500">
          <p>Nenhum candidato encontrado. Clique em "Carregar Ranking" para começar.</p>
        </div>
      )}
    </div>
  );
}

export default ResumeAnalyzer;
