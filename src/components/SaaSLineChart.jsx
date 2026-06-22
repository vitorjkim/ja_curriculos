import React, { useState, useEffect, useRef } from 'react';
import { schoolApi } from '@/lib/schoolApi';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine
} from 'recharts';

// Gera slots dos últimos 7 dias com valores zerados para evitar flicker de dados falsos.
function generateEmptySlots() {
  const now = new Date();
  const endDate = new Date(now); endDate.setHours(0,0,0,0);
  const startDate = new Date(endDate.getTime() - 6 * 86400000);
  const slots = [];
  for (let d = new Date(startDate); d <= endDate; d = new Date(d.getTime() + 86400000)) {
    const diff = Math.round((endDate.getTime() - d.getTime()) / 86400000);
    const label = diff === 0 ? 'Hoje' : diff === 1 ? 'Ontem' : d.toLocaleDateString('pt-BR', { weekday: 'short' });
    slots.push({ day: label, value: 0, entrevistas: 0, preaprovados: 0, aprovados: 0, reprovados: 0 });
  }
  return slots;
}


// Tooltip customizado melhorado com design moderno
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  
  const ordered = ['value','entrevistas','preaprovados','aprovados','reprovados'];
  const map = {};
  payload.forEach(p => { map[p.dataKey] = p; });
  const items = ordered.filter(k => map[k] && map[k].value > 0); // Mostra apenas valores > 0
  
  const labelsMap = {
    value: 'Candidaturas',
    entrevistas: 'Entrevistas',
    preaprovados: 'Pré-aprovados',
    aprovados: 'Aprovados',
    reprovados: 'Reprovados'
  };
  
  const colorDot = {
    value: 'from-blue-400 to-blue-600',
    entrevistas: 'from-purple-400 to-purple-600',
    preaprovados: 'from-yellow-300 to-yellow-500',
    aprovados: 'from-green-400 to-green-600',
    reprovados: 'from-red-400 to-red-600'
  };
  
  const iconMap = {
    value: '',
    entrevistas: '',
    preaprovados: '',
    aprovados: '',
    reprovados: ''
  };
  
  // Calcula total
  const total = items.reduce((sum, key) => sum + (map[key]?.value || 0), 0);
  
  return (
    <div className="rounded-2xl shadow-2xl bg-white/95 backdrop-blur-lg px-5 py-4 text-xs border border-gray-100 min-w-[200px] transform transition-all duration-200" 
         style={{pointerEvents:'none'}}>
      {/* Header com gradiente */}
      <div className="font-bold text-gray-900 mb-3 text-sm flex items-center justify-between bg-gradient-to-r from-gray-50 to-gray-100 -mx-5 -mt-4 px-5 py-3 rounded-t-2xl border-b border-gray-200">
        <span className="flex items-center gap-2">
          {label}
        </span>
        <span className="text-xs font-normal text-gray-500">Total: {total}</span>
      </div>
      
      {/* Items com layout melhorado */}
      <div className="space-y-2">
        {items.length > 0 ? items.map(key => (
          <div key={key} className="flex items-center justify-between group hover:bg-gray-50 -mx-2 px-2 py-1 rounded-lg transition-colors duration-150">
            <div className="flex items-center gap-3">
              <span className="text-base opacity-80">{iconMap[key]}</span>
              <div className="flex items-center gap-2">
                <span className={`inline-block w-2 h-2 rounded-full bg-gradient-to-br ${colorDot[key]} shadow-sm`} />
                <span className="text-gray-600 font-medium">{labelsMap[key]}</span>
              </div>
            </div>
            <span className="font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded-md">
              {map[key].value.toLocaleString('pt-BR')}
            </span>
          </div>
        )) : (
          <div className="text-center text-gray-400 py-2">Sem dados para este dia</div>
        )}
      </div>
    </div>
  );
};

// Componente principal com filtros melhorados
const SaaSLineChart = ({ classId, height = 260, userId = null }) => {
  const [activeIndex, setActiveIndex] = useState(null);
  const [mouseX, setMouseX] = useState(null);
  const [overlayX, setOverlayX] = useState(null);
  const chartWrapperRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(generateEmptySlots());
  const [error, setError] = useState(null);
  
  // Estado para controlar visibilidade das linhas
  const [visibleLines, setVisibleLines] = useState({
    value: true,
    entrevistas: true,
    preaprovados: true,
    aprovados: true,
    reprovados: true
  });
  
  // Controla animação somente na primeira montagem e permite reativar via evento
  const hasAnimatedRef = useRef(false);
  const [animationNonce, setAnimationNonce] = useState(0);
  const firstRealDataRef = useRef(false);
  const pendingAnimationRef = useRef(true);

  // Definir configurações de métricas aqui para uso nos filtros
  const metricsConfig = [
    { key: 'value', label: 'Candidaturas', color: '#3b82f6', stroke: '#1d4ed8' },
    { key: 'entrevistas', label: 'Entrevistas', color: '#a855f7', stroke: '#7e22ce' },
    { key: 'preaprovados', label: 'Pré-aprovados', color: '#fbbf24', stroke: '#fbbf24' },
    { key: 'aprovados', label: 'Aprovados', color: '#22c55e', stroke: '#16a34a' },
    { key: 'reprovados', label: 'Reprovados', color: '#ef4444', stroke: '#dc2626' }
  ];

  // Fetch dos últimos 7 dias considerando somente alunos da turma.
  // Referência para permitir disparar reload externo (evento)
  const loadRef = useRef(null);

  useEffect(() => {
    if (!classId) return;
    let mounted = true;
    const load = async () => {
      setLoading(true); setError(null);
      try {
        const [students, apps, interviewsRaw, hired] = await Promise.all([
          schoolApi.listClassStudents(classId),
          schoolApi.listApplications({ class_id: classId, limit: 2000 }),
          schoolApi.listActiveInterviews({ class_id: classId, limit: 2000 }),
          schoolApi.listHired({ class_id: classId, limit: 2000 })
        ]);
        const studentIds = new Set((students || []).map(s => String(s.user_id)));
        
        // Função para verificar se deve incluir este registro (turma + filtro de aluno)
        const shouldInclude = (uid) => {
          if (!studentIds.has(String(uid))) return false;
          if (userId && String(uid) !== String(userId)) return false;
          return true;
        };
        
        const now = new Date();
        const endDate = new Date(now); endDate.setHours(0,0,0,0);
        const startDate = new Date(endDate.getTime() - 6 * 86400000);
        const daySlots = [];
        for (let d = new Date(startDate); d <= endDate; d = new Date(d.getTime() + 86400000)) {
          const dateStr = d.toISOString().split('T')[0];
          const diff = Math.round((endDate.getTime() - d.getTime()) / 86400000);
          const label = diff === 0 ? 'Hoje' : diff === 1 ? 'Ontem' : d.toLocaleDateString('pt-BR', { weekday: 'short' });
          daySlots.push({ date: dateStr, label, applications: 0, interviews: 0, preApproved: 0, hired: 0, rejected: 0 });
        }
        const normDate = (val) => {
          if (!val) return null;
          const dt = val instanceof Date ? val : new Date(val);
          if (isNaN(dt)) return null;
          return dt.toISOString().split('T')[0];
        };
        // Candidaturas (eventos do dia em que foram criadas)
        (apps || []).forEach(app => {
          if (!app.applied_at) return;
          if (!shouldInclude(app.user_id)) return; // garante aluno da turma + filtro opcional
          const key = normDate(app.applied_at);
          if (!key) return;
          const slot = daySlots.find(s => s.date === key);
          if (slot) {
            slot.applications++;
            if (app.rejected_by_company || app.rejected_by_candidate || app.status === 'rejected') slot.rejected++;
          }
        });
        
        // Normalizar entrevistas: upcoming (marcadas) e history (realizadas)
        const interviewsUpcoming = Array.isArray(interviewsRaw?.upcoming) ? interviewsRaw.upcoming : (interviewsRaw || []);
        const interviewsHistory = Array.isArray(interviewsRaw?.history) ? interviewsRaw.history : [];
        const interviews = [...interviewsUpcoming, ...interviewsHistory];

        // Pré-aprovados: marca no dia da decisão, SEM filtrar por estado futuro
        // Cada evento é independente e aconteceu naquele dia específico
        (apps || []).forEach(app => {
          if (app.status === 'approved' && shouldInclude(app.user_id)) {
            const decisionKey = normDate(app.decision_at) || normDate(app.applied_at);
            if (!decisionKey) return;
            const slot = daySlots.find(ds => ds.date === decisionKey);
            if (slot) slot.preApproved++;
          }
        });
        
        // Entrevistas: registra quando a entrevista foi MARCADA/CRIADA (created_at), não quando vai acontecer
        // Registra todas as entrevistas (upcoming + history) no dia que foram criadas
        (interviews || []).forEach(interview => {
          if (!shouldInclude(interview.user_id)) return;
          const key = normDate(interview.created_at || interview.interview_date);
          if (!key) return;
          const slot = daySlots.find(s => s.date === key);
          if (slot) slot.interviews++;
        });
        
        // Contratados: quando foram finalmente aprovados
        (hired || []).forEach(h => {
          if (!h.final_approved_at) return;
          if (!shouldInclude(h.user_id)) return;
          const key = normDate(h.final_approved_at);
          if (!key) return;
          const slot = daySlots.find(s => s.date === key);
          if (slot) slot.hired++;
        });
        const chartData = daySlots.map(s => ({
          day: s.label,
          value: s.applications,
          entrevistas: s.interviews,
          preaprovados: s.preApproved,
          aprovados: s.hired,
          reprovados: s.rejected
        }));
        if (mounted) {
          setData(chartData);
          // Dispara animação somente quando dados reais chegam e está pendente.
          if (!firstRealDataRef.current && pendingAnimationRef.current) {
            hasAnimatedRef.current = false;
            // força remount para aplicar animação sobre os dados já reais (sem piscadas prévias)
            setAnimationNonce(n => n + 1);
            firstRealDataRef.current = true;
            pendingAnimationRef.current = false;
            setTimeout(() => { hasAnimatedRef.current = true; }, 1100);
          }
        }
      } catch (e) {
        if (mounted) setError(e.message || 'Falha ao carregar dados');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    loadRef.current = load;
    load();
    // Poll para atualização frequente (8s) garantindo dados reais sem precisar de evento
    const interval = setInterval(load, 8000);
    return () => { mounted = false; clearInterval(interval); };
  }, [classId, userId]);

  // Não anima slots vazios iniciais; anima somente quando dados reais chegam.

  // Escuta evento para reativar animação ao abrir detalhes (aguarda dados antes de animar)
  useEffect(() => {
    const handler = () => {
      // Quando botão abre, marca animação como pendente; execução ocorrerá após carga de dados.
      pendingAnimationRef.current = true;
      firstRealDataRef.current = false; // garante que animação será considerada de "primeira" neste ciclo
    };
    window.addEventListener('showMoreDetails', handler);
    return () => window.removeEventListener('showMoreDetails', handler);
  }, []);

  // Listener para atualização imediata quando uma candidatura for criada em qualquer parte da aplicação.
  useEffect(() => {
    const handler = (e) => {
      // Se houver classId no detail e for diferente, ignora; caso contrário recarrega.
      const targetClass = e?.detail?.classId;
      if (targetClass && String(targetClass) !== String(classId)) return;
      // Debounce simples: aguarda pequenos ms para garantir que backend persistiu.
      setTimeout(() => { loadRef.current && loadRef.current(); }, 400);
    };
    window.addEventListener('applicationCreated', handler);
    return () => window.removeEventListener('applicationCreated', handler);
  }, [classId]);

  // Chaves de métricas suportadas
  const metricKeys = ['value','entrevistas','preaprovados','aprovados','reprovados'];

  // Sanitiza cada chave numérica para número natural
  const sanitizedData = (data||[]).map(d => {
    const out = { ...d };
    metricKeys.forEach(k => {
      if (d[k] !== undefined) {
        const raw = Number(d[k]);
        out[k] = isFinite(raw) && raw >= 0 ? Math.trunc(raw) : 0;
      }
    });
    return out;
  });

  // Maior valor entre todas as séries para escalar eixo Y
  const maxValue = sanitizedData.reduce((m, d) => {
    const localMax = metricKeys.reduce((mm, k) => (d[k] !== undefined && d[k] > mm ? d[k] : mm), 0);
    return localMax > m ? localMax : m;
  }, 0);
  const yTicks = Array.from({ length: maxValue + 1 }, (_, i) => i);

  // Toggle de visibilidade das linhas
  const toggleLine = (key) => {
    setVisibleLines(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Função para criar pontos customizados com múltiplas bordas quando linhas se encontram
  const CustomDot = (props) => {
    const { cx, cy, dataKey, index } = props;
    if (!cx || !cy || index === undefined) return null;
    
    const point = sanitizedData[index];
    if (!point) return null;
    
    const currentValue = point[dataKey];
    if (currentValue === 0) {
      // Valor 0: usar estilo padrão original
      const colors = {
        value: '#1d4ed8',
        entrevistas: '#7e22ce',
        preaprovados: '#fbbf24',
        aprovados: '#16a34a',
        reprovados: '#dc2626'
      };
      return (
        <circle
          cx={cx}
          cy={cy}
          r={dataKey === 'value' ? 4 : 3.5}
          fill={colors[dataKey]}
          stroke="#fff"
          strokeWidth={dataKey === 'value' ? 2 : 1.5}
        />
      );
    }
    
    // Detectar quais linhas visíveis têm o mesmo valor neste ponto
    const linesAtSameValue = [];
    const orderedKeys = ['value', 'entrevistas', 'preaprovados', 'aprovados', 'reprovados'];
    
    orderedKeys.forEach(key => {
      if (visibleLines[key] && point[key] === currentValue && point[key] > 0) {
        linesAtSameValue.push(key);
      }
    });
    
    const colorMap = {
      value: '#3b82f6',
      entrevistas: '#7e22ce',
      preaprovados: '#fbbf24',
      aprovados: '#16a34a',
      reprovados: '#dc2626',
    };
    
    const lineCount = linesAtSameValue.length;
    
    if (lineCount === 1) {
      // Uma única linha: estilo padrão
      return (
        <circle
          cx={cx}
          cy={cy}
          r={dataKey === 'value' ? 4 : 3.5}
          fill={colorMap[dataKey]}
          stroke="#fff"
          strokeWidth={dataKey === 'value' ? 2 : 1.5}
        />
      );
    } else if (lineCount === 2) {
      // Duas linhas: preenchimento de uma cor, borda da outra
      const fillColor = colorMap[linesAtSameValue[0]];
      const strokeColor = colorMap[linesAtSameValue[1]];
      return (
        <circle
          cx={cx}
          cy={cy}
          r={5}
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth={2.5}
        />
      );
    } else {
      // 3+ linhas: múltiplas bordas
      const baseRadius = 4;
      const fillColor = colorMap[linesAtSameValue[0]];
      
      return (
        <g>
          {/* Bordas externas (do exterior para o interior) */}
          {linesAtSameValue.slice(1).reverse().map((key, idx) => {
            const totalBorders = lineCount - 1;
            const borderIndex = totalBorders - idx - 1;
            const radius = baseRadius + (borderIndex + 1) * 2;
            const strokeWidth = 2;
            
            return (
              <circle
                key={`border-${idx}`}
                cx={cx}
                cy={cy}
                r={radius}
                fill="none"
                stroke={colorMap[key]}
                strokeWidth={strokeWidth}
              />
            );
          })}
          {/* Círculo central preenchido */}
          <circle
            cx={cx}
            cy={cy}
            r={baseRadius}
            fill={fillColor}
            stroke="#fff"
            strokeWidth={1}
          />
        </g>
      );
    }
  };

  return (
    <div className="w-full bg-white rounded-2xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Atividade dos Últimos 7 dias</h2>
          <p className="text-sm text-gray-600 mt-0.5">Métricas de desempenho da turma</p>
        </div>
        <div className="flex items-center gap-2">
          {loading && (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping"></div>
              <span className="text-sm text-gray-500">Atualizando...</span>
            </div>
          )}
          <button
            type="button"
            onClick={() => loadRef.current && loadRef.current()}
            className="px-4 py-2 text-sm rounded-full bg-blue-50 text-blue-700 font-medium hover:bg-blue-100 transition-colors shadow-sm"
            title="Atualizar agora"
          >
            Atualizar
          </button>
        </div>
      </div>
      
      {error && (
        <div className="text-sm text-red-600 mb-4 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
          {error}
        </div>
      )}
      
      {/* Filtros interativos */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-gray-700">Filtrar Métricas</span>
          <button
            onClick={() => setVisibleLines({value: true, entrevistas: true, preaprovados: true, aprovados: true, reprovados: true})}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Mostrar todas
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {metricsConfig.map(item => {
            const bgColors = {
              'value': 'bg-blue-50',
              'entrevistas': 'bg-purple-50',
              'preaprovados': 'bg-amber-50',
              'aprovados': 'bg-green-50',
              'reprovados': 'bg-red-50'
            };
            const textColors = {
              'value': 'text-blue-700',
              'entrevistas': 'text-purple-700',
              'preaprovados': 'text-amber-700',
              'aprovados': 'text-green-700',
              'reprovados': 'text-red-700'
            };
            return (
              <button
                key={item.key}
                onClick={() => toggleLine(item.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                  visibleLines[item.key] 
                    ? `${bgColors[item.key]} ${textColors[item.key]} font-medium shadow-sm` 
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: visibleLines[item.key] ? item.color : '#9ca3af' }}
                ></span>
                <span className="text-sm font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
      
      {/* Chart */}
      <div className="w-full bg-gray-50 rounded-lg p-4" style={{height: height + 20}}>
        <div className="relative" ref={chartWrapperRef} style={{height}}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              key={animationNonce}
              data={sanitizedData}
              margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
              onMouseMove={state => {
                if (state && state.activeTooltipIndex !== undefined) {
                  setActiveIndex(state.activeTooltipIndex);
                }
                if (state && typeof state.chartX === 'number') {
                  setMouseX(state.chartX);
                  if (chartWrapperRef.current) {
                    const bounds = chartWrapperRef.current.getBoundingClientRect();
                    // Ajusta para a posição correta considerando margins
                    const x = Math.round(state.chartX);
                    const clamped = Math.max(0, Math.min(x, bounds.width));
                    setOverlayX(clamped);
                  }
                }
              }}
              onMouseLeave={() => { setActiveIndex(null); setMouseX(null); setOverlayX(null); }}
            >
              <defs>
                <linearGradient id="gradientArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.95} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <filter id="dotShadow" x="-50%" y="-50%" width="200%" height="200%">
                  <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="rgba(0,0,0,0.3)" />
                </filter>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              
              <CartesianGrid strokeDasharray="5 5" stroke="rgba(0,0,0,0.1)" vertical={false} />
              
              {/* Linha vertical no início */}
              <ReferenceLine x={sanitizedData[0]?.day} stroke="rgba(0,0,0,0.1)" strokeDasharray="5 5" />
              
              <XAxis
                dataKey="day"
                tick={{ fontSize: 11, fill: '#64748b', fontWeight: 500 }}
                tickMargin={8}
                axisLine={{ stroke: 'rgba(0,0,0,0.1)' }}
                tickLine={false}
              />
              
              <YAxis
                tick={{ fontSize: 10, fill: '#64748b' }}
                tickMargin={6}
                axisLine={false}
                tickLine={false}
                width={40}
                allowDecimals={false}
                domain={[0, maxValue]}
                ticks={yTicks}
              />
              
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ stroke: 'rgba(0,0,0,0.1)', strokeWidth: 1, strokeDasharray: '5 5' }}
                wrapperStyle={{ outline: 'none', zIndex: 1000 }}
                offset={20}
                position={{ y: -20 }}
              />
              
              {/* Renderização condicional baseada em visibleLines */}
              {visibleLines.value && (
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#1d4ed8"
                  strokeWidth={2.5}
                  dot={<CustomDot />}
                  activeDot={<CustomDot />}
                  isAnimationActive={!hasAnimatedRef.current}
                />
              )}
              
              {visibleLines.entrevistas && (
                <Line
                  type="monotone"
                  dataKey="entrevistas"
                  stroke="#7e22ce"
                  strokeWidth={2.5}
                  dot={<CustomDot />}
                  activeDot={<CustomDot />}
                  isAnimationActive={!hasAnimatedRef.current}
                />
              )}
              
              {visibleLines.preaprovados && (
                <Line
                  type="monotone"
                  dataKey="preaprovados"
                  stroke="#fbbf24"
                  strokeWidth={2.5}
                  dot={<CustomDot />}
                  activeDot={<CustomDot />}
                  isAnimationActive={!hasAnimatedRef.current}
                />
              )}
              
              {visibleLines.aprovados && (
                <Line
                  type="monotone"
                  dataKey="aprovados"
                  stroke="#16a34a"
                  strokeWidth={2.5}
                  dot={<CustomDot />}
                  activeDot={<CustomDot />}
                  isAnimationActive={!hasAnimatedRef.current}
                />
              )}
              
              {visibleLines.reprovados && (
                <Line
                  type="monotone"
                  dataKey="reprovados"
                  stroke="#dc2626"
                  strokeWidth={2.5}
                  dot={<CustomDot />}
                  activeDot={<CustomDot />}
                  isAnimationActive={!hasAnimatedRef.current}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
          
          {/* Linha vertical melhorada com gradiente e animação */}
          {overlayX !== null && (
            <>
              <style>{`
                @keyframes pulse {
                  0%, 100% { opacity: 0.8; }
                  50% { opacity: 1; }
                }
                @keyframes glow {
                  0%, 100% { box-shadow: 0 0 8px rgba(99, 102, 241, 0.4), 0 0 16px rgba(139, 92, 246, 0.2); }
                  50% { box-shadow: 0 0 16px rgba(99, 102, 241, 0.6), 0 0 32px rgba(139, 92, 246, 0.4); }
                }
              `}</style>
              <div
                className="absolute pointer-events-none transition-all duration-100"
                style={{
                  left: `${overlayX}px`,
                  top: 0,
                  bottom: 0,
                  width: '2px',
                  background: 'linear-gradient(180deg, transparent 0%, rgba(99, 102, 241, 0.3) 10%, rgba(99, 102, 241, 0.8) 50%, rgba(99, 102, 241, 0.3) 90%, transparent 100%)',
                  borderRadius: '2px',
                  animation: 'pulse 2s infinite, glow 2s infinite',
                  zIndex: 10
                }}
              >
                {/* Efeito de brilho central */}
                <div 
                  className="absolute inset-0"
                  style={{
                    background: 'linear-gradient(180deg, transparent 30%, rgba(255, 255, 255, 0.6) 50%, transparent 70%)',
                    width: '100%',
                    borderRadius: '2px'
                  }}
                />
                {/* Ponto luminoso no topo */}
                <div
                  className="absolute -top-1 left-1/2 transform -translate-x-1/2"
                  style={{
                    width: '6px',
                    height: '6px',
                    background: 'radial-gradient(circle, rgba(99, 102, 241, 1) 0%, rgba(99, 102, 241, 0.4) 100%)',
                    borderRadius: '50%',
                    boxShadow: '0 0 8px rgba(99, 102, 241, 0.8)'
                  }}
                />
                {/* Ponto luminoso na base */}
                <div
                  className="absolute -bottom-1 left-1/2 transform -translate-x-1/2"
                  style={{
                    width: '6px',
                    height: '6px',
                    background: 'radial-gradient(circle, rgba(99, 102, 241, 1) 0%, rgba(99, 102, 241, 0.4) 100%)',
                    borderRadius: '50%',
                    boxShadow: '0 0 8px rgba(99, 102, 241, 0.8)'
                  }}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SaaSLineChart;
