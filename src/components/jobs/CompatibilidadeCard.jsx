import { useState, useMemo } from 'react';
import { PieChart, Pie, Cell } from 'recharts';
import {
  Award,
  ChevronUp,
  CheckCircle2,
  Zap,
  Sparkles,
  ExternalLink,
  Check
} from 'lucide-react';

const BASE_SCORE = 24;

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

const GREEN_BADGES = [
  {
    id: 1,
    keyword: 'Tecnologia Frontend',
    text: 'O candidato possui background em tecnologia e desenvolvimento frontend (React), facilitando comunicação com equipes de engenharia.'
  },
  {
    id: 2,
    keyword: 'Senioridade',
    text: 'A senioridade estimada (júnior nível 3) está próxima do pleno (nível 5).'
  },
  {
    id: 3,
    keyword: 'Capacitação',
    text: 'O candidato demonstra interesse em capacitação através de cursos.'
  }
];

const RED_BADGES = [
  {
    id: 1,
    keyword: 'Design UX/UI',
    text: 'Falta total de experiência em Design UX/UI, foco principal da vaga.'
  },
  {
    id: 2,
    keyword: 'Idioma',
    text: 'Candidato não possui inglês intermediário exigido (possui francês).'
  },
  {
    id: 3,
    keyword: 'Localização',
    text: 'Candidato em SP, vaga presencial/híbrida em BH. Sem menção a Pacote Office.'
  }
];

export default function CompatibilidadeCard() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [checkedItems, setCheckedItems] = useState(new Set());
  const [openGreen, setOpenGreen] = useState(new Set());
  const [openRed, setOpenRed] = useState(new Set());

  const currentScore = useMemo(() => {
    const gainedPoints = Array.from(checkedItems).reduce((sum, itemId) => {
      const item = IMPROVEMENT_ITEMS.find(i => i.id === itemId);
      return sum + (item?.gain || 0);
    }, 0);
    return Math.min(BASE_SCORE + gainedPoints, 100);
  }, [checkedItems]);

  const scoreColor = (score) => {
    if (score < 45) return '#ef4444';
    if (score < 70) return '#f59e0b';
    return '#22c55e';
  };

  const scoreLabel = (score) => {
    if (score < 45) return 'Pouca compatibilidade';
    if (score < 70) return 'Compatibilidade razoável';
    return 'Boa compatibilidade';
  };

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

  const donutData = [
    { value: currentScore },
    { value: 100 - currentScore }
  ];

  const color = scoreColor(currentScore);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 1. CABEÇALHO - Donut + Título + Status */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="p-6">
        <div className="flex items-center gap-4">
          {/* Donut Chart */}
          <div className="relative w-16 h-16 flex-shrink-0">
            <PieChart width={64} height={64}>
              <Pie
                data={donutData}
                cx={32}
                cy={32}
                innerRadius={22}
                outerRadius={28}
                startAngle={90}
                endAngle={-270}
                dataKey="value"
                strokeWidth={0}
              >
                <Cell fill={color} />
                <Cell fill="#f3f4f6" />
              </Pie>
            </PieChart>
            <div
              className="absolute inset-0 flex items-center justify-center text-xs font-bold"
              style={{ color }}
            >
              {currentScore}%
            </div>
          </div>

          {/* Texto */}
          <div className="flex-1">
            <div className="flex items-center gap-1.5 mb-1">
              <Award className="w-4 h-4 text-gray-700" />
              <h3 className="font-bold text-sm text-gray-900">
                Compatibilidade com a Vaga
              </h3>
            </div>
            <p
              className="text-xs font-semibold mb-0.5"
              style={{ color }}
            >
              {scoreLabel(currentScore)}
            </p>
            <p className="text-xs text-gray-500">
              Vaga: <span className="font-medium">Pleno</span> | Seu nível: <span className="font-medium">Júnior</span>
            </p>
          </div>

          {/* Chevron */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="flex-shrink-0 p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronUp
              className={`w-5 h-5 text-gray-600 transition-transform duration-300 ${
                isCollapsed ? 'rotate-180' : ''
              }`}
            />
          </button>
        </div>

        {/* Conteúdo colapsável */}
        <div
          className={`transition-all duration-300 overflow-hidden ${
            isCollapsed ? 'max-h-0 opacity-0' : 'max-h-[2000px] opacity-100'
          }`}
        >
          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* 2. BARRA DE PROGRESSO - Match Score */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-700">Match Score</span>
              <span className="text-xs font-bold" style={{ color }}>
                {currentScore}%
              </span>
            </div>
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${currentScore}%`,
                  backgroundColor: color
                }}
              />
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* 3. CARDS DE NÍVEL - Grid 2 colunas */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          <div className="grid grid-cols-2 gap-3 mt-6">
            {/* Card esquerdo - Nível da Vaga */}
            <div className="bg-[#fafafa] border border-[#e5e7eb] rounded-xl p-4 text-center">
              <p className="text-xs text-gray-600 mb-2 font-medium">NÍVEL DA VAGA</p>
              <div className="flex items-baseline justify-center">
                <span className="text-3xl font-bold text-gray-900">5</span>
                <span className="text-lg text-gray-500">/10</span>
              </div>
              <p className="text-sm text-gray-700 mt-1 font-medium">Pleno</p>
            </div>

            {/* Card direito - Seu Nível */}
            <div className="bg-[#eff6ff] border border-[#bfdbfe] rounded-xl p-4 text-center">
              <p className="text-xs text-[#2563eb] mb-2 font-medium">SEU NÍVEL</p>
              <div className="flex items-baseline justify-center">
                <span className="text-3xl font-bold text-[#2563eb]">3</span>
                <span className="text-lg text-[#60a5fa]">/10</span>
              </div>
              <p className="text-sm text-[#2563eb] mt-1 font-medium">Júnior</p>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* 4. "Por que esse score?" - BADGES COLAPSÁVEIS VERDES */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          <div className="mt-6">
            <div className="flex items-center gap-1.5 mb-3">
              <CheckCircle2 className="w-4 h-4 text-[#22c55e]" />
              <h4 className="font-extrabold text-sm text-[#166534]">
                Por que esse score?
              </h4>
            </div>

            <div className="rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] p-3">
              <div className="flex flex-wrap gap-2">
                {GREEN_BADGES.map(badge => {
                  const isOpen = openGreen.has(badge.id);
                  return (
                    <button
                      key={badge.id}
                      onClick={() => toggleGreen(badge.id)}
                      className={`transition-all duration-300 ${
                        isOpen ? 'flex-[1_1_100%]' : ''
                      }`}
                    >
                      <div
                        className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg border transition-colors ${
                          isOpen
                            ? 'bg-[#dcfce7] border-[#22c55e]'
                            : 'bg-[#f0fdf4] border-[#bbf7d0] hover:bg-[#dcfce7]'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-3 h-3 text-[#166534] flex-shrink-0" />
                          <span className="text-xs font-medium text-[#166534]">
                            {badge.keyword}
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
                          {badge.text}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* 5. "O que falta para 100%?" - BADGES COLAPSÁVEIS VERMELHOS */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          <div className="mt-6">
            <div className="flex items-center gap-1.5 mb-3">
              <Zap className="w-4 h-4 text-[#ef4444]" />
              <h4 className="font-extrabold text-sm text-[#991b1b]">
                O que falta para 100%?
              </h4>
            </div>

            <div className="rounded-xl border border-[#fecaca] bg-[#fff5f5] p-3">
              <div className="flex flex-wrap gap-2">
                {RED_BADGES.map(badge => {
                  const isOpen = openRed.has(badge.id);
                  return (
                    <button
                      key={badge.id}
                      onClick={() => toggleRed(badge.id)}
                      className={`transition-all duration-300 ${
                        isOpen ? 'flex-[1_1_100%]' : ''
                      }`}
                    >
                      <div
                        className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg border transition-colors ${
                          isOpen
                            ? 'bg-[#fee2e2] border-[#ef4444]'
                            : 'bg-[#fff5f5] border-[#fecaca] hover:bg-[#fee2e2]'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Zap className="w-[11px] h-[11px] text-[#991b1b] flex-shrink-0" />
                          <span className="text-xs font-medium text-[#991b1b]">
                            {badge.keyword}
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
                          {badge.text}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* 6. PLANO DE MELHORIA - Card da IA com checklist interativo */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          <div className="mt-6">
            <div className="rounded-xl border border-[#e0e7ff] bg-[#f5f7ff] overflow-hidden">
              {/* Cabeçalho */}
              <div className="bg-white border-b border-[#e0e7ff] px-4 py-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#f5f3ff] border border-[#ddd6fe] flex items-center justify-center flex-shrink-0">
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
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
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
                          className={`px-2 py-1 rounded-lg text-xs font-bold border transition-all ${
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
                          className="flex items-center gap-2 mx-4 mb-3 px-3 py-2 rounded-lg border text-xs hover:opacity-80 transition-opacity"
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
        </div>
      </div>
    </div>
  );
}
