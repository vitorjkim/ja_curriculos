import React, { useContext } from 'react';
import { cn } from '@/lib/utils';
import { CardColorContext } from '@/components/resume/ResumeCard';
import { useTemplateTheme } from '@/contexts/TemplateThemeContext';

const getColorClasses = (color) => {
  const colorMap = {
    blue: 'border-blue-500 focus:border-blue-600 focus:ring-blue-500/20',
    green: 'border-green-500 focus:border-green-600 focus:ring-green-500/20',
    purple: 'border-purple-500 focus:border-purple-600 focus:ring-purple-500/20',
    orange: 'border-orange-500 focus:border-orange-600 focus:ring-orange-500/20',
    red: 'border-red-500 focus:border-red-600 focus:ring-red-500/20',
    yellow: 'border-yellow-500 focus:border-yellow-600 focus:ring-yellow-500/20',
    teal: 'border-teal-500 focus:border-teal-600 focus:ring-teal-500/20',
    gray: 'border-gray-400 focus:border-gray-600 focus:ring-gray-500/20',
  };
  return colorMap[color] || colorMap.blue;
};

const Textarea = React.forwardRef(({ className, color, ...props }, ref) => {
  const contextColor = useContext(CardColorContext);
  const { name: templateName } = useTemplateTheme?.() || { name: 'default' };
  const cardColor = color || contextColor || 'blue';
  const colorClasses = getColorClasses(cardColor);
  
  // Estilos base por template
  const templateStyles = (() => {
    switch (templateName) {
      case 'professional':
        return 'rounded-2xl border-slate-200 bg-slate-50/60 text-sm placeholder:text-slate-400 focus:border-blue-400 focus:ring-blue-200';
      case 'minimal':
        return 'rounded-md border-gray-200 bg-white text-sm placeholder:text-gray-500';
      case 'classic':
        return 'rounded-xl border-stone-200 bg-stone-50 text-sm placeholder:text-stone-500';
      case 'modern':
        return 'rounded-2xl border-black/10 bg-white/70 backdrop-blur text-sm placeholder:text-slate-400';
      default:
        return '';
    }
  })();
  
  // No template professional, sobrescrevemos as cores padrão
  const finalColorClasses = templateName === 'professional' ? '' : colorClasses;
  
  return (
    <textarea
      className={cn(
        `flex min-h-[80px] w-full rounded-xl border-2 bg-white px-4 py-3 text-sm ring-offset-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 ${finalColorClasses}`,
        templateStyles,
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = 'Textarea';

export { Textarea };