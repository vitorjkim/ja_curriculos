import React from 'react';
import { useTemplateTheme } from '@/contexts/TemplateThemeContext';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const Checkbox = React.forwardRef(({ className, size = 'md', ...props }, ref) => {
  const { name: templateName } = useTemplateTheme?.() || { name: 'default' };
  const base = 'peer shrink-0 !rounded-md ring-offset-white focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50';
  const dims = size === 'xs' ? 'h-3 w-3' : size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';
  const iconClass = size === 'xs' ? 'h-[11px] w-[11px]' : size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';
  const iconStroke = size === 'xs' ? 2.5 : 2;
  const byTemplate = templateName === 'modern'
    ? 'border border-black/30 bg-white/80 backdrop-blur focus-visible:ring-2 focus-visible:ring-blue-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 text-white'
    : templateName === 'classic'
      ? 'border border-stone-400 bg-stone-50 focus-visible:ring-2 focus-visible:ring-stone-300 data-[state=checked]:bg-stone-700 data-[state=checked]:border-stone-700 text-white'
      : templateName === 'minimal'
        ? 'border border-gray-300 bg-white focus-visible:ring-2 focus-visible:ring-gray-300 data-[state=checked]:bg-gray-800 data-[state=checked]:border-gray-800 text-white'
        : 'border border-gray-400 focus-visible:ring-2 focus-visible:ring-[var(--color1)] focus-visible:ring-offset-2 data-[state=checked]:bg-[var(--color1)] data-[state=checked]:text-white';
  return (
    <CheckboxPrimitive.Root
      ref={ref}
      className={cn(base, dims, byTemplate, className)}
      {...props}
    >
      <CheckboxPrimitive.Indicator className={cn('flex items-center justify-center text-current')}>
        <Check strokeWidth={iconStroke} className={iconClass} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
});
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox };