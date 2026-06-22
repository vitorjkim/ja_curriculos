import React from 'react';
import { Rocket, Brain, Target, Gamepad2, Search, Award, Check, FileText, Users, MessageSquare, ClipboardCheck, ListOrdered, ChevronDown } from 'lucide-react';

export default function JornadaTab({ data, journeyStats, selectedJourneyStage, setSelectedJourneyStage, journeyStageDropdownOpen, setJourneyStageDropdownOpen, setJourneyParticipationModal, journeyStageNames }) {

  return (
    <div className="p-5 rounded-2xl bg-white border-2 border-gray-200 shadow-md">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center">
          <Rocket className="w-4 h-4 text-amber-600" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-gray-900 text-sm">Jornada do Candidato</h3>
          <p className="text-[11px] text-gray-400">Autoavaliação e simulação de entrevista dos alunos</p>
        </div>
        
        {/* Seletor de Etapa */}
        {journeyStats && Object.keys(journeyStats.stageCounts || {}).length > 0 && (
          <div className="relative">
            <button
              onClick={() => setJourneyStageDropdownOpen(!journeyStageDropdownOpen)}
              className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium transition-colors"
            >
              {selectedJourneyStage === null ? 'Visão Geral' : journeyStageNames[selectedJourneyStage] || `Etapa ${selectedJourneyStage + 1}`}
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${journeyStageDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {journeyStageDropdownOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
                <button
                  onClick={() => { setSelectedJourneyStage(null); setJourneyStageDropdownOpen(false); }}
                  className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50 flex items-center justify-between ${selectedJourneyStage === null ? 'bg-gray-50 text-gray-900 font-semibold' : 'text-gray-600'}`}
                >
                  <span>Visão Geral (Etapa 1)</span>
                  <span className="text-[10px] text-gray-400">
                    {journeyStats.stageCounts?.[0] || 0} alunos
                  </span>
                </button>
                
                {Object.keys(journeyStats.stageCounts || {}).sort((a, b) => a - b).map(stageId => (
                  <button
                    key={stageId}
                    onClick={() => { setSelectedJourneyStage(parseInt(stageId)); setJourneyStageDropdownOpen(false); }}
                    className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50 flex items-center justify-between ${selectedJourneyStage === parseInt(stageId) ? 'bg-gray-50 text-gray-900 font-semibold' : 'text-gray-600'}`}
                  >
                    <span>{journeyStageNames[stageId] || `Etapa ${parseInt(stageId) + 1}`}</span>
                    <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                      {journeyStats.stageCounts[stageId]} alunos
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      
      {!journeyStats || (journeyStats.total === 0 && Object.keys(journeyStats.stageCounts || {}).length === 0) ? (
        <div className="text-center py-12 text-gray-500">
          <Rocket className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p className="font-medium">Nenhum aluno completou a Etapa 1 ainda</p>
          <p className="text-sm mt-1">Os dados aparecerão aqui quando os alunos completarem a jornada inicial</p>
        </div>
      ) : (
        <>
          {/* Métricas por etapa */}
          {(selectedJourneyStage === null || selectedJourneyStage === 0) ? (
            <Etapa1Metrics data={data} journeyStats={journeyStats} selectedJourneyStage={selectedJourneyStage} setJourneyParticipationModal={setJourneyParticipationModal} journeyStageNames={journeyStageNames} />
          ) : selectedJourneyStage === 1 ? (
            <Etapa2Metrics data={data} journeyStats={journeyStats} setJourneyStageDropdownOpen={setJourneyStageDropdownOpen} />
          ) : selectedJourneyStage === 2 ? (
            <Etapa3Metrics data={data} journeyStats={journeyStats} setJourneyStageDropdownOpen={setJourneyStageDropdownOpen} />
          ) : selectedJourneyStage === 3 ? (
            <Etapa4Metrics data={data} journeyStats={journeyStats} setJourneyStageDropdownOpen={setJourneyStageDropdownOpen} />
          ) : selectedJourneyStage === 4 ? (
            <Etapa5Metrics data={data} journeyStats={journeyStats} setJourneyStageDropdownOpen={setJourneyStageDropdownOpen} />
          ) : selectedJourneyStage === 5 ? (
            <Etapa6Metrics data={data} journeyStats={journeyStats} setJourneyStageDropdownOpen={setJourneyStageDropdownOpen} />
          ) : selectedJourneyStage === 6 ? (
            <Etapa7Metrics data={data} journeyStats={journeyStats} setJourneyStageDropdownOpen={setJourneyStageDropdownOpen} />
          ) : null}

          {/* Response tables */}
          {journeyStats.responses && journeyStats.responses.length > 0 && (
            <div className="mt-6">
              <h4 className="font-semibold text-gray-800 text-sm mb-3">
                {selectedJourneyStage === null 
                  ? 'Últimas respostas' 
                  : `Alunos na ${journeyStageNames[selectedJourneyStage] || `Etapa ${selectedJourneyStage + 1}`}`}
              </h4>
              <div className="overflow-x-auto">
                {selectedJourneyStage === null ? (
                  <OverviewTable responses={journeyStats.responses} journeyStageNames={journeyStageNames} />
                ) : selectedJourneyStage === 0 ? (
                  <Etapa1Table responses={journeyStats.responses} />
                ) : selectedJourneyStage === 1 ? (
                  <Etapa2Table responses={journeyStats.responses} />
                ) : selectedJourneyStage === 2 ? (
                  <Etapa3Table responses={journeyStats.responses} />
                ) : selectedJourneyStage === 3 ? (
                  <Etapa4Table responses={journeyStats.responses} />
                ) : selectedJourneyStage === 4 ? (
                  <Etapa5Table responses={journeyStats.responses} />
                ) : selectedJourneyStage === 5 ? (
                  <Etapa6Table responses={journeyStats.responses} />
                ) : selectedJourneyStage === 6 ? (
                  <Etapa7Table responses={journeyStats.responses} />
                ) : null}
              </div>
              {journeyStats.responses.length > 10 && (
                <p className="text-xs text-gray-500 mt-2 text-center">
                  Mostrando 10 de {journeyStats.responses.length} alunos
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* === Etapa Metric Components === */

function ParticipationCard({ data, journeyStats, gradientFrom, gradientTo, borderColor, textColor, accentColor, onClick }) {
  return (
    <div 
      className={`bg-gradient-to-br ${gradientFrom} ${gradientTo} rounded-xl p-5 border ${borderColor} cursor-pointer hover:shadow-md transition-shadow`}
      onClick={onClick}
    >
      <h4 className={`font-semibold ${textColor} text-sm mb-4 flex items-center gap-2`}>
        <Target className="w-4 h-4" />
        Participação na Etapa
        <span className={`text-xs font-normal ${accentColor} ml-auto`}>Clique para ver</span>
      </h4>
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Alunos nesta etapa</span>
          <span className="font-bold text-gray-900">{journeyStats.stats?.total_students_with_responses || 0}</span>
        </div>
        <div className={`h-2 rounded-full overflow-hidden`} style={{ backgroundColor: 'rgba(0,0,0,0.1)' }}>
          <div 
            className={`h-full rounded-full transition-all duration-500`}
            style={{ 
              width: `${data?.stats?.total_students ? Math.min(100, ((journeyStats.stats?.total_students_with_responses || 0) / data.stats.total_students) * 100) : 0}%`,
              background: 'currentColor'
            }}
          />
        </div>
        <p className="text-[10px] text-gray-500">
          {data?.stats?.total_students ? Math.round(((journeyStats.stats?.total_students_with_responses || 0) / data.stats.total_students) * 100) : 0}% da turma
        </p>
      </div>
    </div>
  );
}

function Etapa1Metrics({ data, journeyStats, selectedJourneyStage, setJourneyParticipationModal, journeyStageNames }) {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div 
        className="bg-gray-50/80 rounded-xl p-4 border border-gray-100 cursor-pointer hover:border-gray-200 transition-colors"
        onClick={() => setJourneyParticipationModal(true)}
      >
        <h4 className="font-semibold text-gray-700 text-xs mb-3 flex items-center gap-2">
          <Target className="w-3.5 h-3.5" />
          Participação na Jornada
          <span className="text-[10px] font-normal text-gray-400 ml-auto">Ver alunos</span>
        </h4>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">
              {selectedJourneyStage === null 
                ? 'Alunos que completaram Etapa 1' 
                : `Alunos na ${journeyStageNames[selectedJourneyStage] || `Etapa ${selectedJourneyStage + 1}`}`}
            </span>
            <span className="font-bold text-gray-900">{journeyStats.stats?.total_students_with_responses || 0}</span>
          </div>
          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gray-600 rounded-full transition-all duration-500"
              style={{ width: `${data?.stats?.total_students ? Math.min(100, ((journeyStats.stats?.total_students_with_responses || 0) / data.stats.total_students) * 100) : 0}%` }}
            />
          </div>
          <p className="text-[10px] text-gray-500">
            {data?.stats?.total_students ? Math.round(((journeyStats.stats?.total_students_with_responses || 0) / data.stats.total_students) * 100) : 0}% da turma
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 border-2 border-gray-200">
        <h4 className="font-semibold text-gray-700 text-xs mb-3 flex items-center gap-2">
          <Brain className="w-3.5 h-3.5 text-purple-500" />
          Nervosismo para Entrevistas
        </h4>
        <div className="text-center mb-2">
          <span className="text-3xl font-bold text-gray-900">
            {journeyStats.stats?.avg_nervoso ? Number(journeyStats.stats.avg_nervoso).toFixed(1) : '—'}
          </span>
          <span className="text-lg text-gray-400">/10</span>
        </div>
        <p className="text-xs text-center text-gray-500">Média de nervosismo da turma</p>
        {journeyStats.nervosismoDistribution && journeyStats.nervosismoDistribution.length > 0 && (
          <div className="mt-4 space-y-2">
            {journeyStats.nervosismoDistribution.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <span className="text-gray-600">{item.level}</span>
                <span className="font-semibold text-gray-900">{item.count} alunos</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl p-4 border-2 border-gray-200">
        <h4 className="font-semibold text-gray-700 text-xs mb-3 flex items-center gap-2">
          <Target className="w-3.5 h-3.5 text-blue-500" />
          Preparação para Entrevistas
        </h4>
        <div className="text-center mb-2">
          <span className="text-3xl font-bold text-gray-900">
            {journeyStats.stats?.avg_preparado_entrevista ? Number(journeyStats.stats.avg_preparado_entrevista).toFixed(1) : '—'}
          </span>
          <span className="text-lg text-gray-400">/10</span>
        </div>
        <p className="text-xs text-center text-gray-500">Média de preparação da turma</p>
        {journeyStats.preparacaoDistribution && journeyStats.preparacaoDistribution.length > 0 && (
          <div className="mt-4 space-y-2">
            {journeyStats.preparacaoDistribution.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <span className="text-gray-600">{item.level}</span>
                <span className="font-semibold text-gray-900">{item.count} alunos</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl p-4 border-2 border-gray-200 md:col-span-2">
        <h4 className="font-semibold text-gray-700 text-xs mb-3">Desempenho na Simulação de Entrevista</h4>
        {(() => {
          const levels = ['Precisa Melhorar', 'Regular', 'Bom', 'Excelente'];
          const colors = {
            'Precisa Melhorar': { bg: 'bg-red-400', light: 'bg-gray-100' },
            'Regular': { bg: 'bg-amber-400', light: 'bg-gray-100' },
            'Bom': { bg: 'bg-blue-400', light: 'bg-gray-100' },
            'Excelente': { bg: 'bg-emerald-400', light: 'bg-gray-100' }
          };
          
          const levelData = levels.map(level => {
            const count = parseInt(journeyStats.stats?.[`level_${level.toLowerCase().replace(' ', '_')}`]) || 0;
            return { level, count };
          });
          
          const total = levelData.reduce((sum, item) => sum + parseInt(item.count), 0);
          
          if (total === 0) {
            return <p className="text-xs text-gray-400 text-center py-3">Nenhum aluno completou a simulação ainda</p>;
          }
          
          return (
            <div className="space-y-2.5">
              {levelData.map((item, idx) => (
                <div key={idx}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-medium text-gray-600">{item.level}</span>
                    <span className="text-xs font-semibold text-gray-700">{item.count} ({total > 0 ? Math.round((item.count / total) * 100) : 0}%)</span>
                  </div>
                  <div className={`h-1.5 ${colors[item.level].light} rounded-full overflow-hidden`}>
                    <div 
                      className={`h-full ${colors[item.level].bg} rounded-full transition-all duration-500`}
                      style={{ width: `${total > 0 ? (item.count / total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          );
        })()}
      </div>

      <div className="bg-white rounded-xl p-4 border-2 border-gray-200">
        <h4 className="font-semibold text-gray-700 text-xs mb-3">Quando querem começar a trabalhar</h4>
        {journeyStats.workPreference && journeyStats.workPreference.length > 0 ? (
          <div className="space-y-2">
            {journeyStats.workPreference.map((item, idx) => {
              const total = journeyStats.workPreference.reduce((sum, i) => sum + parseInt(i.count), 0);
              const percent = total > 0 ? Math.round((parseInt(item.count) / total) * 100) : 0;
              return (
                <div key={idx}>
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-[11px] text-gray-500 leading-tight flex-1 pr-2">{item.quando_trabalhar_text}</span>
                    <span className="text-[11px] font-semibold text-gray-700 flex-shrink-0">{item.count}</span>
                  </div>
                  <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gray-500 rounded-full transition-all duration-500"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-gray-400 text-center py-3">Nenhuma resposta ainda</p>
        )}
      </div>
    </div>
  );
}

function Etapa2Metrics({ data, journeyStats, setJourneyStageDropdownOpen }) {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl p-5 border border-amber-200 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setJourneyStageDropdownOpen(true)}>
        <h4 className="font-semibold text-amber-800 text-sm mb-4 flex items-center gap-2"><Target className="w-4 h-4" />Participação na Etapa<span className="text-xs font-normal text-amber-600 ml-auto">Clique para ver etapas</span></h4>
        <div className="space-y-3">
          <div className="flex justify-between items-center"><span className="text-sm text-gray-600">Alunos nesta etapa</span><span className="font-bold text-gray-900">{journeyStats.stats?.total_students_with_responses || 0}</span></div>
          <div className="h-2 bg-amber-100 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-amber-500 to-yellow-500 rounded-full transition-all duration-500" style={{ width: `${data?.stats?.total_students ? Math.min(100, ((journeyStats.stats?.total_students_with_responses || 0) / data.stats.total_students) * 100) : 0}%` }} /></div>
          <p className="text-[10px] text-gray-500">{data?.stats?.total_students ? Math.round(((journeyStats.stats?.total_students_with_responses || 0) / data.stats.total_students) * 100) : 0}% da turma</p>
        </div>
      </div>
      <div className="bg-white rounded-xl p-5 border border-gray-200">
        <h4 className="font-semibold text-gray-800 text-sm mb-4 flex items-center gap-2"><Brain className="w-4 h-4 text-amber-500" />Quiz de Mentalidade</h4>
        <div className="text-center mb-3"><span className="text-4xl font-bold text-amber-600">{journeyStats.stats?.avg_quiz_correct ? Math.round(journeyStats.stats.avg_quiz_correct * 100) : '—'}</span><span className="text-lg text-gray-400">%</span></div>
        <p className="text-xs text-center text-gray-500">Média de acertos no quiz</p>
      </div>
      <div className="bg-white rounded-xl p-5 border border-gray-200">
        <h4 className="font-semibold text-gray-800 text-sm mb-4 flex items-center gap-2"><Gamepad2 className="w-4 h-4 text-green-500" />Jogo de Decisão</h4>
        <div className="text-center mb-3"><span className="text-4xl font-bold text-green-600">{journeyStats.stats?.avg_game_score ? Number(journeyStats.stats.avg_game_score).toFixed(1) : '—'}</span><span className="text-lg text-gray-400">/8</span></div>
        <p className="text-xs text-center text-gray-500">Pontuação média no jogo</p>
      </div>
    </div>
  );
}

function Etapa3Metrics({ data, journeyStats, setJourneyStageDropdownOpen }) {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-5 border border-orange-200 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setJourneyStageDropdownOpen(true)}>
        <h4 className="font-semibold text-orange-800 text-sm mb-4 flex items-center gap-2"><Target className="w-4 h-4" />Participação na Etapa<span className="text-xs font-normal text-orange-600 ml-auto">Clique para ver etapas</span></h4>
        <div className="space-y-3">
          <div className="flex justify-between items-center"><span className="text-sm text-gray-600">Alunos nesta etapa</span><span className="font-bold text-gray-900">{journeyStats.stats?.total_students_with_responses || 0}</span></div>
          <div className="h-2 bg-orange-100 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full transition-all duration-500" style={{ width: `${data?.stats?.total_students ? Math.min(100, ((journeyStats.stats?.total_students_with_responses || 0) / data.stats.total_students) * 100) : 0}%` }} /></div>
          <p className="text-[10px] text-gray-500">{data?.stats?.total_students ? Math.round(((journeyStats.stats?.total_students_with_responses || 0) / data.stats.total_students) * 100) : 0}% da turma</p>
        </div>
      </div>
      <div className="bg-white rounded-xl p-5 border border-gray-200">
        <h4 className="font-semibold text-gray-800 text-sm mb-4 flex items-center gap-2"><FileText className="w-4 h-4 text-orange-500" />Qualidade do Currículo</h4>
        <div className="text-center mb-3"><span className="text-4xl font-bold text-orange-600">{journeyStats.stats?.avg_resume_quality ? Math.round(journeyStats.stats.avg_resume_quality) : '—'}</span><span className="text-lg text-gray-400">%</span></div>
        <p className="text-xs text-center text-gray-500">Média de qualidade do currículo montado</p>
      </div>
      <div className="bg-white rounded-xl p-5 border border-gray-200">
        <h4 className="font-semibold text-gray-800 text-sm mb-4 flex items-center gap-2"><Check className="w-4 h-4 text-green-500" />Classificação de Itens</h4>
        <div className="text-center mb-3"><span className="text-4xl font-bold text-green-600">{journeyStats.stats?.avg_dragdrop_correct ? Math.round(journeyStats.stats.avg_dragdrop_correct * 100) : '—'}</span><span className="text-lg text-gray-400">%</span></div>
        <p className="text-xs text-center text-gray-500">Acertos no "entra ou não entra"</p>
      </div>
    </div>
  );
}

function Etapa4Metrics({ data, journeyStats, setJourneyStageDropdownOpen }) {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-200 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setJourneyStageDropdownOpen(true)}>
        <h4 className="font-semibold text-blue-800 text-sm mb-4 flex items-center gap-2"><Target className="w-4 h-4" />Participação na Etapa<span className="text-xs font-normal text-blue-600 ml-auto">Clique para ver etapas</span></h4>
        <div className="space-y-3">
          <div className="flex justify-between items-center"><span className="text-sm text-gray-600">Alunos nesta etapa</span><span className="font-bold text-gray-900">{journeyStats.stats?.total_students_with_responses || 0}</span></div>
          <div className="h-2 bg-blue-100 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500" style={{ width: `${data?.stats?.total_students ? Math.min(100, ((journeyStats.stats?.total_students_with_responses || 0) / data.stats.total_students) * 100) : 0}%` }} /></div>
          <p className="text-[10px] text-gray-500">{data?.stats?.total_students ? Math.round(((journeyStats.stats?.total_students_with_responses || 0) / data.stats.total_students) * 100) : 0}% da turma</p>
        </div>
      </div>
      <div className="bg-white rounded-xl p-5 border border-gray-200">
        <h4 className="font-semibold text-gray-800 text-sm mb-4 flex items-center gap-2"><Search className="w-4 h-4 text-blue-500" />Palavras-chave Encontradas</h4>
        <div className="text-center mb-3"><span className="text-4xl font-bold text-blue-600">{journeyStats.stats?.avg_keywords_found ? Number(journeyStats.stats.avg_keywords_found).toFixed(1) : '—'}</span><span className="text-lg text-gray-400">/8</span></div>
        <p className="text-xs text-center text-gray-500">Média de keywords identificadas</p>
      </div>
      <div className="bg-white rounded-xl p-5 border border-gray-200">
        <h4 className="font-semibold text-gray-800 text-sm mb-4 flex items-center gap-2"><Award className="w-4 h-4 text-indigo-500" />Quiz de Estratégia</h4>
        <div className="text-center mb-3"><span className="text-4xl font-bold text-indigo-600">{journeyStats.stats?.avg_quiz_score ? Number(journeyStats.stats.avg_quiz_score).toFixed(1) : '—'}</span><span className="text-lg text-gray-400">/12</span></div>
        <p className="text-xs text-center text-gray-500">Pontuação média no quiz</p>
      </div>
    </div>
  );
}

function Etapa5Metrics({ data, journeyStats, setJourneyStageDropdownOpen }) {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-5 border border-green-200 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setJourneyStageDropdownOpen(true)}>
        <h4 className="font-semibold text-green-800 text-sm mb-4 flex items-center gap-2"><Target className="w-4 h-4" />Participação na Etapa<span className="text-xs font-normal text-green-600 ml-auto">Clique para ver etapas</span></h4>
        <div className="space-y-3">
          <div className="flex justify-between items-center"><span className="text-sm text-gray-600">Alunos nesta etapa</span><span className="font-bold text-gray-900">{journeyStats.stats?.total_students_with_responses || 0}</span></div>
          <div className="h-2 bg-green-100 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full transition-all duration-500" style={{ width: `${data?.stats?.total_students ? Math.min(100, ((journeyStats.stats?.total_students_with_responses || 0) / data.stats.total_students) * 100) : 0}%` }} /></div>
          <p className="text-[10px] text-gray-500">{data?.stats?.total_students ? Math.round(((journeyStats.stats?.total_students_with_responses || 0) / data.stats.total_students) * 100) : 0}% da turma</p>
        </div>
      </div>
      <div className="bg-white rounded-xl p-5 border border-gray-200 md:col-span-2">
        <h4 className="font-semibold text-gray-800 text-sm mb-4 flex items-center gap-2"><Users className="w-4 h-4 text-green-500" />Simulador de Comportamento</h4>
        <div className="text-center mb-3"><span className="text-4xl font-bold text-green-600">{journeyStats.stats?.avg_simulator_score ? Number(journeyStats.stats.avg_simulator_score).toFixed(1) : '—'}</span><span className="text-lg text-gray-400">/15</span></div>
        <p className="text-xs text-center text-gray-500">Pontuação média no simulador de situações profissionais</p>
      </div>
    </div>
  );
}

function Etapa6Metrics({ data, journeyStats, setJourneyStageDropdownOpen }) {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div className="bg-gradient-to-br from-rose-50 to-pink-50 rounded-xl p-5 border border-rose-200 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setJourneyStageDropdownOpen(true)}>
        <h4 className="font-semibold text-rose-800 text-sm mb-4 flex items-center gap-2"><Target className="w-4 h-4" />Participação na Etapa<span className="text-xs font-normal text-rose-600 ml-auto">Clique para ver etapas</span></h4>
        <div className="space-y-3">
          <div className="flex justify-between items-center"><span className="text-sm text-gray-600">Alunos nesta etapa</span><span className="font-bold text-gray-900">{journeyStats.stats?.total_students_with_responses || 0}</span></div>
          <div className="h-2 bg-rose-100 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-rose-500 to-pink-500 rounded-full transition-all duration-500" style={{ width: `${data?.stats?.total_students ? Math.min(100, ((journeyStats.stats?.total_students_with_responses || 0) / data.stats.total_students) * 100) : 0}%` }} /></div>
          <p className="text-[10px] text-gray-500">{data?.stats?.total_students ? Math.round(((journeyStats.stats?.total_students_with_responses || 0) / data.stats.total_students) * 100) : 0}% da turma</p>
        </div>
      </div>
      <div className="bg-white rounded-xl p-5 border border-gray-200 md:col-span-2">
        <h4 className="font-semibold text-gray-800 text-sm mb-4 flex items-center gap-2"><MessageSquare className="w-4 h-4 text-rose-500" />Prática de Entrevista</h4>
        <div className="text-center mb-3"><span className="text-4xl font-bold text-rose-600">{journeyStats.stats?.avg_practice_score ? Number(journeyStats.stats.avg_practice_score).toFixed(1) : '—'}</span><span className="text-lg text-gray-400">/15</span></div>
        <p className="text-xs text-center text-gray-500">Pontuação média na prática de respostas de entrevista</p>
      </div>
    </div>
  );
}

function Etapa7Metrics({ data, journeyStats, setJourneyStageDropdownOpen }) {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl p-5 border border-violet-200 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setJourneyStageDropdownOpen(true)}>
        <h4 className="font-semibold text-violet-800 text-sm mb-4 flex items-center gap-2"><Target className="w-4 h-4" />Participação na Etapa<span className="text-xs font-normal text-violet-600 ml-auto">Clique para ver etapas</span></h4>
        <div className="space-y-3">
          <div className="flex justify-between items-center"><span className="text-sm text-gray-600">Alunos nesta etapa</span><span className="font-bold text-gray-900">{journeyStats.stats?.total_students_with_responses || 0}</span></div>
          <div className="h-2 bg-violet-100 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full transition-all duration-500" style={{ width: `${data?.stats?.total_students ? Math.min(100, ((journeyStats.stats?.total_students_with_responses || 0) / data.stats.total_students) * 100) : 0}%` }} /></div>
          <p className="text-[10px] text-gray-500">{data?.stats?.total_students ? Math.round(((journeyStats.stats?.total_students_with_responses || 0) / data.stats.total_students) * 100) : 0}% da turma</p>
        </div>
      </div>
      <div className="bg-white rounded-xl p-5 border border-gray-200">
        <h4 className="font-semibold text-gray-800 text-sm mb-4 flex items-center gap-2"><ClipboardCheck className="w-4 h-4 text-violet-500" />Quiz Pós-Entrevista</h4>
        <div className="text-center mb-3"><span className="text-4xl font-bold text-violet-600">{journeyStats.stats?.avg_quiz_score ? Number(journeyStats.stats.avg_quiz_score).toFixed(1) : '—'}</span><span className="text-lg text-gray-400">/4</span></div>
        <p className="text-xs text-center text-gray-500">Pontuação média no quiz</p>
      </div>
      <div className="bg-white rounded-xl p-5 border border-gray-200">
        <h4 className="font-semibold text-gray-800 text-sm mb-4 flex items-center gap-2"><ListOrdered className="w-4 h-4 text-purple-500" />Ordenação de Passos</h4>
        <div className="text-center mb-3"><span className="text-4xl font-bold text-purple-600">{journeyStats.stats?.avg_ordering_score ? Number(journeyStats.stats.avg_ordering_score).toFixed(1) : '—'}</span><span className="text-lg text-gray-400">/6</span></div>
        <p className="text-xs text-center text-gray-500">Acertos na ordenação pós-entrevista</p>
      </div>
    </div>
  );
}

/* === Table Components === */

function OverviewTable({ responses, journeyStageNames }) {
  return (
    <table className="w-full text-sm">
      <thead><tr className="bg-gray-50"><th className="px-3 py-2 text-left font-semibold text-gray-600">Aluno</th><th className="px-3 py-2 text-center font-semibold text-gray-600">Etapa</th><th className="px-3 py-2 text-center font-semibold text-gray-600">Data</th></tr></thead>
      <tbody>
        {responses.slice(0, 10).map((response, idx) => (
          <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
            <td className="px-3 py-2 font-medium text-gray-900">{response.student_name}</td>
            <td className="px-3 py-2 text-center"><span className="px-2 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">{journeyStageNames[response.stage_id] || `Etapa ${(response.stage_id || 0) + 1}`}</span></td>
            <td className="px-3 py-2 text-center text-xs text-gray-500">{response.completed_at ? new Date(response.completed_at).toLocaleDateString('pt-BR') : '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Etapa1Table({ responses }) {
  return (
    <table className="w-full text-sm">
      <thead><tr className="bg-gray-50"><th className="px-3 py-2 text-left font-semibold text-gray-600">Aluno</th><th className="px-3 py-2 text-center font-semibold text-gray-600">Nervosismo</th><th className="px-3 py-2 text-center font-semibold text-gray-600">Preparação Entrevista</th><th className="px-3 py-2 text-center font-semibold text-gray-600">Preparação Vaga</th><th className="px-3 py-2 text-center font-semibold text-gray-600">Nível Entrevista</th><th className="px-3 py-2 text-left font-semibold text-gray-600">Quando quer trabalhar</th><th className="px-3 py-2 text-center font-semibold text-gray-600">Data</th></tr></thead>
      <tbody>
        {responses.slice(0, 10).map((response, idx) => (
          <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
            <td className="px-3 py-2 font-medium text-gray-900">{response.student_name}</td>
            <td className="px-3 py-2 text-center"><span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold ${response.nervoso >= 7 ? 'bg-red-100 text-red-700' : response.nervoso >= 4 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>{response.nervoso || '—'}</span></td>
            <td className="px-3 py-2 text-center"><span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold ${response.preparado_entrevista >= 7 ? 'bg-green-100 text-green-700' : response.preparado_entrevista >= 4 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{response.preparado_entrevista || '—'}</span></td>
            <td className="px-3 py-2 text-center"><span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold ${response.preparado_vaga >= 7 ? 'bg-green-100 text-green-700' : response.preparado_vaga >= 4 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{response.preparado_vaga || '—'}</span></td>
            <td className="px-3 py-2 text-center"><span className={`px-2 py-1 rounded-full text-xs font-semibold ${response.interview_level === 'Excelente' ? 'bg-emerald-100 text-emerald-700' : response.interview_level === 'Bom' ? 'bg-blue-100 text-blue-700' : response.interview_level === 'Regular' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{response.interview_level || '—'}</span></td>
            <td className="px-3 py-2 text-xs text-gray-600 max-w-[200px] truncate" title={response.quando_trabalhar_text}>{response.quando_trabalhar_text || '—'}</td>
            <td className="px-3 py-2 text-center text-xs text-gray-500">{response.completed_at ? new Date(response.completed_at).toLocaleDateString('pt-BR') : '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Etapa2Table({ responses }) {
  return (
    <table className="w-full text-sm">
      <thead><tr className="bg-gray-50"><th className="px-3 py-2 text-left font-semibold text-gray-600">Aluno</th><th className="px-3 py-2 text-center font-semibold text-gray-600">Quiz Acertos</th><th className="px-3 py-2 text-center font-semibold text-gray-600">Jogo Pontuação</th><th className="px-3 py-2 text-center font-semibold text-gray-600">Data</th></tr></thead>
      <tbody>
        {responses.slice(0, 10).map((response, idx) => {
          const extraData = response.extra_data ? (typeof response.extra_data === 'string' ? JSON.parse(response.extra_data) : response.extra_data) : {};
          const quizAnswers = extraData.quizAnswers || {};
          const gameResult = extraData.gameResult || {};
          const quizCorrect = Object.values(quizAnswers).filter(a => a === true || a?.correct === true).length;
          const quizTotal = Object.keys(quizAnswers).length;
          return (
            <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="px-3 py-2 font-medium text-gray-900">{response.student_name}</td>
              <td className="px-3 py-2 text-center"><span className={`inline-flex items-center justify-center px-2 py-1 rounded-full text-xs font-bold ${quizTotal > 0 && quizCorrect / quizTotal >= 0.7 ? 'bg-green-100 text-green-700' : quizTotal > 0 && quizCorrect / quizTotal >= 0.5 ? 'bg-amber-100 text-amber-700' : quizTotal > 0 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'}`}>{quizTotal > 0 ? `${quizCorrect}/${quizTotal}` : '—'}</span></td>
              <td className="px-3 py-2 text-center"><span className={`inline-flex items-center justify-center px-2 py-1 rounded-full text-xs font-bold ${gameResult.score >= 6 ? 'bg-green-100 text-green-700' : gameResult.score >= 4 ? 'bg-amber-100 text-amber-700' : gameResult.score > 0 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'}`}>{gameResult.score !== undefined ? `${gameResult.score}/${gameResult.maxScore || 8}` : '—'}</span></td>
              <td className="px-3 py-2 text-center text-xs text-gray-500">{response.completed_at ? new Date(response.completed_at).toLocaleDateString('pt-BR') : '—'}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function Etapa3Table({ responses }) {
  return (
    <table className="w-full text-sm">
      <thead><tr className="bg-gray-50"><th className="px-3 py-2 text-left font-semibold text-gray-600">Aluno</th><th className="px-3 py-2 text-center font-semibold text-gray-600">Qualidade Currículo</th><th className="px-3 py-2 text-center font-semibold text-gray-600">Classificação Itens</th><th className="px-3 py-2 text-center font-semibold text-gray-600">Data</th></tr></thead>
      <tbody>
        {responses.slice(0, 10).map((response, idx) => {
          const extraData = response.extra_data ? (typeof response.extra_data === 'string' ? JSON.parse(response.extra_data) : response.extra_data) : {};
          const resumeQuality = extraData.resumeQuality || {};
          const dragDropResults = extraData.dragDropResults || {};
          return (
            <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="px-3 py-2 font-medium text-gray-900">{response.student_name}</td>
              <td className="px-3 py-2 text-center"><span className={`inline-flex items-center justify-center px-2 py-1 rounded-full text-xs font-bold ${(resumeQuality.score || resumeQuality) >= 80 ? 'bg-green-100 text-green-700' : (resumeQuality.score || resumeQuality) >= 50 ? 'bg-amber-100 text-amber-700' : (resumeQuality.score || resumeQuality) > 0 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'}`}>{(resumeQuality.score || resumeQuality) ? `${resumeQuality.score || resumeQuality}%` : '—'}</span></td>
              <td className="px-3 py-2 text-center"><span className="inline-flex items-center justify-center px-2 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700">{dragDropResults.correct !== undefined ? `${dragDropResults.correct}/${dragDropResults.total || 10}` : '—'}</span></td>
              <td className="px-3 py-2 text-center text-xs text-gray-500">{response.completed_at ? new Date(response.completed_at).toLocaleDateString('pt-BR') : '—'}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function Etapa4Table({ responses }) {
  return (
    <table className="w-full text-sm">
      <thead><tr className="bg-gray-50"><th className="px-3 py-2 text-left font-semibold text-gray-600">Aluno</th><th className="px-3 py-2 text-center font-semibold text-gray-600">Palavras-chave</th><th className="px-3 py-2 text-center font-semibold text-gray-600">Quiz</th><th className="px-3 py-2 text-center font-semibold text-gray-600">Data</th></tr></thead>
      <tbody>
        {responses.slice(0, 10).map((response, idx) => {
          const extraData = response.extra_data ? (typeof response.extra_data === 'string' ? JSON.parse(response.extra_data) : response.extra_data) : {};
          const keywordsResult = extraData.keywordsResult || {};
          const quizResult = extraData.quizResult || {};
          return (
            <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="px-3 py-2 font-medium text-gray-900">{response.student_name}</td>
              <td className="px-3 py-2 text-center"><span className="inline-flex items-center justify-center px-2 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700">{keywordsResult.found !== undefined ? `${keywordsResult.found} encontradas` : (keywordsResult.score !== undefined ? keywordsResult.score : '—')}</span></td>
              <td className="px-3 py-2 text-center"><span className="inline-flex items-center justify-center px-2 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-700">{quizResult.score !== undefined ? `${quizResult.score}/${quizResult.total || 12}` : (quizResult.correct !== undefined ? `${quizResult.correct}` : '—')}</span></td>
              <td className="px-3 py-2 text-center text-xs text-gray-500">{response.completed_at ? new Date(response.completed_at).toLocaleDateString('pt-BR') : '—'}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function Etapa5Table({ responses }) {
  return (
    <table className="w-full text-sm">
      <thead><tr className="bg-gray-50"><th className="px-3 py-2 text-left font-semibold text-gray-600">Aluno</th><th className="px-3 py-2 text-center font-semibold text-gray-600">Simulador</th><th className="px-3 py-2 text-center font-semibold text-gray-600">Data</th></tr></thead>
      <tbody>
        {responses.slice(0, 10).map((response, idx) => {
          const extraData = response.extra_data ? (typeof response.extra_data === 'string' ? JSON.parse(response.extra_data) : response.extra_data) : {};
          const simulatorResult = extraData.simulatorResult || {};
          return (
            <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="px-3 py-2 font-medium text-gray-900">{response.student_name}</td>
              <td className="px-3 py-2 text-center"><span className={`inline-flex items-center justify-center px-2 py-1 rounded-full text-xs font-bold ${simulatorResult.score >= 12 ? 'bg-green-100 text-green-700' : simulatorResult.score >= 8 ? 'bg-amber-100 text-amber-700' : simulatorResult.score > 0 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'}`}>{simulatorResult.score !== undefined ? `${simulatorResult.score}/${simulatorResult.maxScore || 15}` : '—'}</span></td>
              <td className="px-3 py-2 text-center text-xs text-gray-500">{response.completed_at ? new Date(response.completed_at).toLocaleDateString('pt-BR') : '—'}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function Etapa6Table({ responses }) {
  return (
    <table className="w-full text-sm">
      <thead><tr className="bg-gray-50"><th className="px-3 py-2 text-left font-semibold text-gray-600">Aluno</th><th className="px-3 py-2 text-center font-semibold text-gray-600">Prática Entrevista</th><th className="px-3 py-2 text-center font-semibold text-gray-600">Modo</th><th className="px-3 py-2 text-center font-semibold text-gray-600">Data</th></tr></thead>
      <tbody>
        {responses.slice(0, 10).map((response, idx) => {
          const extraData = response.extra_data ? (typeof response.extra_data === 'string' ? JSON.parse(response.extra_data) : response.extra_data) : {};
          const practiceResult = extraData.practiceResult || {};
          const mode = extraData.mode || '';
          return (
            <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="px-3 py-2 font-medium text-gray-900">{response.student_name}</td>
              <td className="px-3 py-2 text-center"><span className={`inline-flex items-center justify-center px-2 py-1 rounded-full text-xs font-bold ${practiceResult.score >= 12 ? 'bg-green-100 text-green-700' : practiceResult.score >= 8 ? 'bg-amber-100 text-amber-700' : practiceResult.score > 0 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'}`}>{practiceResult.score !== undefined ? `${practiceResult.score}/${practiceResult.maxScore || 15}` : '—'}</span></td>
              <td className="px-3 py-2 text-center"><span className="inline-flex items-center justify-center px-2 py-1 rounded-full text-xs font-medium bg-rose-100 text-rose-700">{mode || '—'}</span></td>
              <td className="px-3 py-2 text-center text-xs text-gray-500">{response.completed_at ? new Date(response.completed_at).toLocaleDateString('pt-BR') : '—'}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function Etapa7Table({ responses }) {
  return (
    <table className="w-full text-sm">
      <thead><tr className="bg-gray-50"><th className="px-3 py-2 text-left font-semibold text-gray-600">Aluno</th><th className="px-3 py-2 text-center font-semibold text-gray-600">Quiz</th><th className="px-3 py-2 text-center font-semibold text-gray-600">Ordenação</th><th className="px-3 py-2 text-center font-semibold text-gray-600">Data</th></tr></thead>
      <tbody>
        {responses.slice(0, 10).map((response, idx) => {
          const extraData = response.extra_data ? (typeof response.extra_data === 'string' ? JSON.parse(response.extra_data) : response.extra_data) : {};
          const quizResult = extraData.quizResult || {};
          const orderingResult = extraData.orderingResult || {};
          return (
            <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="px-3 py-2 font-medium text-gray-900">{response.student_name}</td>
              <td className="px-3 py-2 text-center"><span className="inline-flex items-center justify-center px-2 py-1 rounded-full text-xs font-bold bg-violet-100 text-violet-700">{quizResult.score !== undefined ? `${quizResult.score}/${quizResult.total || 4}` : (quizResult.correct !== undefined ? `${quizResult.correct}` : '—')}</span></td>
              <td className="px-3 py-2 text-center"><span className="inline-flex items-center justify-center px-2 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-700">{orderingResult.score !== undefined ? `${orderingResult.score}/${orderingResult.total || 6}` : (orderingResult.correct !== undefined ? `${orderingResult.correct}` : '—')}</span></td>
              <td className="px-3 py-2 text-center text-xs text-gray-500">{response.completed_at ? new Date(response.completed_at).toLocaleDateString('pt-BR') : '—'}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
