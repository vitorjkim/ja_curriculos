import React, { useContext } from 'react';
import * as LabelPrimitive from '@radix-ui/react-label';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { useTemplateTheme } from '@/contexts/TemplateThemeContext';
import { CardColorContext } from '@/components/resume/ResumeCard';
import { 
  FileText, Palette, User, Calendar, Phone, Mail, MapPin, Building2, 
  GraduationCap, Briefcase, FolderKanban, Award, Globe, Target, Layers,
  Type, Hash, Clock, Star, Bookmark, Tag, Settings, Pencil
} from 'lucide-react';

const labelVariants = cva(
  'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'
);

// Mapeamento de cores para pills (template professional) - cores mais vibrantes
const pillColorMap = {
  blue: { border: 'border-blue-300', bg: 'bg-blue-100', text: 'text-blue-700', icon: 'text-blue-600' },
  teal: { border: 'border-teal-300', bg: 'bg-teal-100', text: 'text-teal-700', icon: 'text-teal-600' },
  green: { border: 'border-emerald-300', bg: 'bg-emerald-100', text: 'text-emerald-700', icon: 'text-emerald-600' },
  purple: { border: 'border-violet-300', bg: 'bg-violet-100', text: 'text-violet-700', icon: 'text-violet-600' },
  orange: { border: 'border-orange-300', bg: 'bg-orange-100', text: 'text-orange-700', icon: 'text-orange-600' },
  red: { border: 'border-rose-300', bg: 'bg-rose-100', text: 'text-rose-700', icon: 'text-rose-600' },
  yellow: { border: 'border-amber-300', bg: 'bg-amber-100', text: 'text-amber-700', icon: 'text-amber-600' },
  gray: { border: 'border-slate-300', bg: 'bg-slate-100', text: 'text-slate-700', icon: 'text-slate-600' },
};

// Mapeamento de ícones por palavras-chave no label
const getIconForLabel = (children) => {
  if (!children) return null;
  const text = typeof children === 'string' ? children.toLowerCase() : 
    (children?.props?.children ? String(children.props.children).toLowerCase() : '');
  
  // Mapeamento de palavras para ícones
  if (text.includes('título') || text.includes('title')) return FileText;
  if (text.includes('template') || text.includes('modelo')) return Palette;
  if (text.includes('nome') || text.includes('name')) return User;
  if (text.includes('nascimento') || text.includes('data') || text.includes('birth')) return Calendar;
  if (text.includes('whatsapp') || text.includes('telefone') || text.includes('phone')) return Phone;
  if (text.includes('email') || text.includes('e-mail')) return Mail;
  if (text.includes('endereço') || text.includes('address') || text.includes('cidade') || text.includes('city')) return MapPin;
  if (text.includes('empresa') || text.includes('company')) return Building2;
  if (text.includes('cargo') || text.includes('position') || text.includes('função')) return Briefcase;
  if (text.includes('período') || text.includes('period') || text.includes('duração')) return Clock;
  if (text.includes('formação') || text.includes('education') || text.includes('escolaridade')) return GraduationCap;
  if (text.includes('experiência') || text.includes('experience')) return Briefcase;
  if (text.includes('projeto') || text.includes('project')) return FolderKanban;
  if (text.includes('curso') || text.includes('course') || text.includes('certificado')) return Award;
  if (text.includes('idioma') || text.includes('language') || text.includes('língua')) return Globe;
  if (text.includes('nível') || text.includes('level')) return Layers;
  if (text.includes('área') || text.includes('area') || text.includes('setor')) return Target;
  if (text.includes('sub-área') || text.includes('subarea') || text.includes('especialização')) return Tag;
  if (text.includes('descrição') || text.includes('description')) return Pencil;
  if (text.includes('habilidade') || text.includes('skill')) return Star;
  if (text.includes('link') || text.includes('url')) return Bookmark;
  if (text.includes('configuração') || text.includes('setting')) return Settings;
  
  return Type; // Ícone padrão
};

const Label = React.forwardRef(({ className, pill = false, icon: CustomIcon, color: propColor, children, ...props }, ref) => {
  const { name: templateName } = useTemplateTheme?.() || { name: 'default' };
  const contextColor = useContext(CardColorContext);
  
  // Usa a cor passada via prop, ou do contexto, ou fallback para blue
  const effectiveColor = propColor || contextColor || 'blue';
  
  // Aplica estilo pill se estiver no template professional ou se pill=true
  const shouldUsePill = templateName === 'professional' || pill;
  const pillColors = pillColorMap[effectiveColor] || pillColorMap.blue;
  
  // Determina o ícone a usar
  const IconComponent = CustomIcon || (shouldUsePill ? getIconForLabel(children) : null);
  
  if (shouldUsePill) {
    return (
      <LabelPrimitive.Root
        ref={ref}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-semibold mb-2',
          pillColors.border,
          pillColors.bg,
          pillColors.text,
          className
        )}
        {...props}
      >
        {IconComponent && <IconComponent className={cn('w-3.5 h-3.5', pillColors.icon)} />}
        {children}
      </LabelPrimitive.Root>
    );
  }
  
  return (
    <LabelPrimitive.Root
      ref={ref}
      className={cn(labelVariants(), className)}
      {...props}
    >
      {children}
    </LabelPrimitive.Root>
  );
});
Label.displayName = LabelPrimitive.Root.displayName;

export { Label };