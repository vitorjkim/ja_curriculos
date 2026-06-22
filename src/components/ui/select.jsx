import React, { useContext, useState } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';
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

const Select = React.forwardRef(({ className, children, color, ...props }, ref) => {
  const contextColor = useContext(CardColorContext);
  const { name: templateName } = useTemplateTheme?.() || { name: 'default' };
  const cardColor = color || contextColor || 'blue';
  const colorClasses = getColorClasses(cardColor);
  const [isOpen, setIsOpen] = useState(false);
  
  // Estilos base por template
  const templateStyles = (() => {
    switch (templateName) {
      case 'professional':
        return 'h-10 rounded-2xl border-slate-200 bg-slate-50/60 text-sm focus:border-blue-400 focus:ring-blue-200';
      case 'minimal':
        return 'h-12 rounded-md border-gray-200 bg-white text-sm';
      case 'classic':
        return 'h-12 rounded-xl border-stone-200 bg-stone-50 text-sm';
      case 'modern':
        return 'h-12 rounded-2xl border-black/10 bg-white/70 backdrop-blur text-sm';
      default:
        return '';
    }
  })();
  
  // No template professional, sobrescrevemos as cores padrão
  const finalColorClasses = templateName === 'professional' ? '' : colorClasses;
  
  return (
    <div className="relative">
      <select
        className={cn(
          `flex h-12 w-full rounded-xl border-2 bg-white px-4 py-3 pr-10 text-sm ring-offset-white appearance-none cursor-pointer hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 ${finalColorClasses} ${cardColor}-context`,
          templateStyles,
          className
        )}
        ref={ref}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setIsOpen(false)}
        onMouseDown={() => setIsOpen(!isOpen)}
        {...props}
      >
        {children}
      </select>
      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-all duration-200 ${isOpen ? 'rotate-180 text-gray-600' : ''}`} />
      </div>
      
      {/* Indicador visual quando aberto */}
      {isOpen && (
        <div className="absolute inset-0 rounded-xl border-2 border-blue-500 pointer-events-none animate-pulse"></div>
      )}
    </div>
  );
});
Select.displayName = 'Select';

export { Select };