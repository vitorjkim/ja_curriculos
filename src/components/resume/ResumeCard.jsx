import React, { createContext, useContext } from 'react';
import { useTemplateTheme } from '@/contexts/TemplateThemeContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

// Context para cores do card
const CardColorContext = createContext('blue');

// Paleta centralizada para reutilização
const COLOR_MAP = {
  blue: {
    bg: 'from-blue-50/50 to-indigo-50/50',
    border: 'border-blue-100',
    text: 'from-blue-600 to-indigo-600',
    icon: 'text-blue-600',
    focus: 'blue-500'
  },
  teal: {
    bg: 'from-teal-50/50 to-cyan-50/50',
    border: 'border-teal-100',
    text: 'from-teal-600 to-cyan-600',
    icon: 'text-teal-600',
    focus: 'teal-500'
  },
  gray: {
    bg: 'from-gray-50/50 to-gray-50/50',
    border: 'border-gray-200',
    text: 'from-gray-700 to-gray-700',
    icon: 'text-gray-700',
    focus: 'gray-500'
  },
  green: {
    bg: 'from-green-50/50 to-emerald-50/50',
    border: 'border-green-100',
    text: 'from-green-600 to-emerald-600',
    icon: 'text-green-600',
    focus: 'green-500'
  },
  purple: {
    bg: 'from-purple-50/50 to-fuchsia-50/50',
    border: 'border-purple-100',
    text: 'from-purple-600 to-fuchsia-600',
    icon: 'text-purple-600',
    focus: 'purple-500'
  },
  orange: {
    bg: 'from-orange-50/50 to-amber-50/50',
    border: 'border-orange-100',
    text: 'from-orange-600 to-amber-600',
    icon: 'text-orange-600',
    focus: 'orange-500'
  },
  red: {
    bg: 'from-red-50/40 to-pink-50/40',
    border: 'border-red-100',
    text: 'from-red-600 to-pink-600',
    icon: 'text-red-600',
    focus: 'red-500'
  },
  yellow: {
    bg: 'from-yellow-50/60 to-amber-50/50',
    border: 'border-yellow-100',
    text: 'from-yellow-600 to-amber-600',
    icon: 'text-yellow-600',
    focus: 'yellow-500'
  },
  cyan: {
    bg: 'from-cyan-50/50 to-sky-50/50',
    border: 'border-cyan-100',
    text: 'from-cyan-600 to-sky-600',
    icon: 'text-cyan-600',
    focus: 'cyan-500'
  },
  indigo: {
    bg: 'from-indigo-50/50 to-violet-50/50',
    border: 'border-indigo-100',
    text: 'from-indigo-600 to-violet-600',
    icon: 'text-indigo-600',
    focus: 'indigo-500'
  }
};

// Paleta para o template 'colorful' (dashboard-style: header colorido + corpo branco)
const COLORFUL_PALETTE = {
  blue:   { cardBorder: 'border-blue-300',   cardShadow: 'shadow-[0_18px_45px_rgba(37,99,235,0.12)]',    headerBorder: 'border-b-[3px] border-blue-300',   headerBg: 'bg-blue-50/70',    titleText: 'text-blue-900',    iconBg: 'from-blue-100 to-blue-200 border-blue-300',    iconText: 'text-blue-600' },
  teal:   { cardBorder: 'border-teal-300',   cardShadow: 'shadow-[0_18px_45px_rgba(20,184,166,0.12)]',   headerBorder: 'border-b-[3px] border-teal-300',   headerBg: 'bg-teal-50/70',    titleText: 'text-teal-900',    iconBg: 'from-teal-100 to-teal-200 border-teal-300',    iconText: 'text-teal-600' },
  green:  { cardBorder: 'border-emerald-300', cardShadow: 'shadow-[0_18px_45px_rgba(16,185,129,0.12)]',  headerBorder: 'border-b-[3px] border-emerald-300', headerBg: 'bg-emerald-50/70', titleText: 'text-emerald-900', iconBg: 'from-emerald-100 to-emerald-200 border-emerald-300', iconText: 'text-emerald-600' },
  purple: { cardBorder: 'border-violet-300', cardShadow: 'shadow-[0_18px_45px_rgba(139,92,246,0.12)]',   headerBorder: 'border-b-[3px] border-violet-300', headerBg: 'bg-violet-50/70',  titleText: 'text-violet-900',  iconBg: 'from-violet-100 to-violet-200 border-violet-300',  iconText: 'text-violet-600' },
  orange: { cardBorder: 'border-amber-300',  cardShadow: 'shadow-[0_18px_45px_rgba(245,158,11,0.12)]',   headerBorder: 'border-b-[3px] border-amber-300',  headerBg: 'bg-amber-50/70',   titleText: 'text-amber-900',   iconBg: 'from-amber-100 to-amber-200 border-amber-300',   iconText: 'text-amber-600' },
  red:    { cardBorder: 'border-rose-300',   cardShadow: 'shadow-[0_18px_45px_rgba(244,63,94,0.12)]',    headerBorder: 'border-b-[3px] border-rose-300',   headerBg: 'bg-rose-50/70',    titleText: 'text-rose-900',    iconBg: 'from-rose-100 to-rose-200 border-rose-300',    iconText: 'text-rose-600' },
  yellow: { cardBorder: 'border-yellow-300', cardShadow: 'shadow-[0_18px_45px_rgba(234,179,8,0.12)]',    headerBorder: 'border-b-[3px] border-yellow-300', headerBg: 'bg-yellow-50/70',  titleText: 'text-yellow-900',  iconBg: 'from-yellow-100 to-yellow-200 border-yellow-300',  iconText: 'text-yellow-600' },
  gray:   { cardBorder: 'border-slate-300',  cardShadow: 'shadow-[0_18px_45px_rgba(100,116,139,0.12)]',  headerBorder: 'border-b-[3px] border-slate-300',  headerBg: 'bg-slate-50/70',   titleText: 'text-slate-900',   iconBg: 'from-slate-100 to-slate-200 border-slate-300',   iconText: 'text-slate-600' },
  cyan:   { cardBorder: 'border-cyan-300',   cardShadow: 'shadow-[0_18px_45px_rgba(6,182,212,0.12)]',    headerBorder: 'border-b-[3px] border-cyan-300',   headerBg: 'bg-cyan-50/70',    titleText: 'text-cyan-900',    iconBg: 'from-cyan-100 to-cyan-200 border-cyan-300',    iconText: 'text-cyan-600' },
  indigo: { cardBorder: 'border-indigo-300', cardShadow: 'shadow-[0_18px_45px_rgba(99,102,241,0.12)]',   headerBorder: 'border-b-[3px] border-indigo-300', headerBg: 'bg-indigo-50/70',  titleText: 'text-indigo-900',  iconBg: 'from-indigo-100 to-indigo-200 border-indigo-300',  iconText: 'text-indigo-600' },
};

const ResumeCard = ({ title, icon: Icon, color = 'red', children, actions }) => {
  const palette = COLOR_MAP[color] || COLOR_MAP.red;
  const { name: templateName } = useTemplateTheme?.() || { name: 'default' };

  // Variações de estética por template (casca do card)
  const shell = (() => {
    // base: arredondado, leve blur e gradiente suave
    const base = `shadow-lg rounded-2xl border-0 bg-gradient-to-br ${palette.bg} backdrop-blur-sm overflow-visible`;
    const map = {
  // Pós-swap: 'default' (moderno escuro)
  default: `rounded-2xl border-2 border-[#30363d] bg-[#161b22] overflow-hidden`,
      modern: `shadow-xl rounded-3xl border-2 border-black/5 bg-white/70 backdrop-blur ${''}`,
      classic: `shadow-md rounded-xl border-2 border-stone-200 bg-stone-50`,
      minimal: `shadow-sm rounded-lg border-2 border-gray-200 bg-white`,
      professional: `rounded-[24px] border-2 border-slate-200 bg-white/95 shadow-[0_16px_40px_rgba(15,23,42,0.06)]`,
    };
    return map[templateName] || base;
  })();

  const headerClass = (() => {
    if (templateName === 'classic') return 'pb-4 border-b border-stone-200 bg-stone-50/40 rounded-t-xl';
    if (templateName === 'minimal') return 'pb-4 border-b border-gray-200/60 bg-white rounded-t-lg';
    if (templateName === 'modern') return `pb-4 border-b ${palette.border} bg-white/30 backdrop-blur-sm rounded-t-3xl`;
    if (templateName === 'default') return `pb-4 border-b border-[#30363d] rounded-t-2xl`;
    if (templateName === 'professional') return `pb-4`;
    return `pb-4 border-b ${palette.border} rounded-t-2xl`;
  })();

  const titleClass = (() => {
    if (templateName === 'classic') return 'text-stone-800 resume-card-title';
    if (templateName === 'minimal') return 'text-black resume-card-title';
    if (templateName === 'professional') return 'text-slate-900 resume-card-title';
    // default/modern: vivid gradient titles
    return `bg-gradient-to-r ${palette.text} bg-clip-text text-transparent resume-card-title`;
  })();

  // Mapeamento de cores para o estilo "professional" (pills)
  const professionalPillColors = {
    blue: { border: 'border-sky-100', bg: 'bg-sky-50/60', text: 'text-sky-700', icon: 'text-sky-600' },
    teal: { border: 'border-teal-100', bg: 'bg-teal-50/60', text: 'text-teal-700', icon: 'text-teal-600' },
    green: { border: 'border-emerald-100', bg: 'bg-emerald-50/60', text: 'text-emerald-700', icon: 'text-emerald-600' },
    purple: { border: 'border-violet-100', bg: 'bg-violet-50/60', text: 'text-violet-700', icon: 'text-violet-600' },
    orange: { border: 'border-amber-100', bg: 'bg-amber-50/60', text: 'text-amber-700', icon: 'text-amber-600' },
    red: { border: 'border-rose-100', bg: 'bg-rose-50/60', text: 'text-rose-700', icon: 'text-rose-600' },
    yellow: { border: 'border-yellow-100', bg: 'bg-yellow-50/60', text: 'text-yellow-700', icon: 'text-yellow-600' },
    gray: { border: 'border-slate-100', bg: 'bg-slate-50/60', text: 'text-slate-700', icon: 'text-slate-600' },
    cyan: { border: 'border-cyan-100', bg: 'bg-cyan-50/60', text: 'text-cyan-700', icon: 'text-cyan-600' },
    indigo: { border: 'border-indigo-100', bg: 'bg-indigo-50/60', text: 'text-indigo-700', icon: 'text-indigo-600' },
  };

  // Renderização especial para template colorful (dashboard-style)
  if (templateName === 'colorful') {
    const cp = COLORFUL_PALETTE[color] || COLORFUL_PALETTE.blue;
    return (
      <CardColorContext.Provider value={color}>
        <Card className={`rounded-[24px] border-[3px] bg-white ${cp.cardBorder} ${cp.cardShadow}`}>
          <CardHeader className={`${cp.headerBorder} pb-4 ${cp.headerBg} rounded-t-[22px]`}>
            <div className="flex items-center justify-between">
              <CardTitle className={`flex items-center text-base font-semibold ${cp.titleText} resume-card-title`}>
                {Icon && (
                  <div className={`mr-3 w-10 h-10 rounded-xl bg-gradient-to-br ${cp.iconBg} flex items-center justify-center shadow-sm border-2 ${cp.iconText} flex-shrink-0`}>
                    <Icon className="w-5 h-5 stroke-[2.5]" />
                  </div>
                )}
                {title}
              </CardTitle>
              {actions && <div>{actions}</div>}
            </div>
          </CardHeader>
          <CardContent className="pt-5 overflow-visible">
            {children}
          </CardContent>
        </Card>
      </CardColorContext.Provider>
    );
  }

  // Renderização especial para template professional
  if (templateName === 'professional') {
    const pillColors = professionalPillColors[color] || professionalPillColors.blue;
    return (
      <CardColorContext.Provider value={color}>
        <Card className={shell}>
          <CardHeader className={headerClass}>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                {Icon && (
                  <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${pillColors.bg} ${pillColors.icon}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                )}
                <div>
                  <CardTitle className="text-lg font-semibold text-slate-900">
                    {title}
                  </CardTitle>
                </div>
              </div>
              {actions && <div>{actions}</div>}
            </div>
          </CardHeader>
          <CardContent className="pt-0 overflow-visible space-y-5">
            {children}
          </CardContent>
        </Card>
      </CardColorContext.Provider>
    );
  }

  return (
    <CardColorContext.Provider value={color}>
      <Card className={shell}>
        <CardHeader className={headerClass}>
          <div className="flex items-center justify-between">
            <CardTitle className={`flex items-center text-xl font-bold card-title ${titleClass}`}>
              {Icon && (
                <Icon
                  className={
                    `w-6 h-6 mr-3 ` +
                    (templateName === 'classic'
                      ? 'text-stone-700'
                      : templateName === 'minimal'
                        ? 'text-gray-700'
                        : palette.icon)
                  }
                />
              )}
              {title}
            </CardTitle>
            {actions && <div>{actions}</div>}
          </div>
        </CardHeader>
        <CardContent className="pt-4 overflow-visible">
          {children}
        </CardContent>
      </Card>
    </CardColorContext.Provider>
  );
};

// Hook para usar a cor do card
export const useCardColor = () => {
  return useContext(CardColorContext);
};

export { COLOR_MAP, CardColorContext };
export default ResumeCard;
