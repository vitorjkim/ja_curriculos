import React from 'react';
import ResumeCard from './ResumeCard';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { GraduationCap } from 'lucide-react';
import { motion } from 'framer-motion';

const EducationSection = ({ value, onChange, cardColor = 'blue' }) => {
  const accent = (() => {
    const map = {
      blue: { inputBorder: 'border-blue-300', focusBorder: 'focus:border-blue-500', focusRing: 'focus:ring-2 focus:ring-blue-200' },
      purple: { inputBorder: 'border-purple-300', focusBorder: 'focus:border-purple-500', focusRing: 'focus:ring-2 focus:ring-purple-200' },
      red: { inputBorder: 'border-red-300', focusBorder: 'focus:border-red-500', focusRing: 'focus:ring-2 focus:ring-red-200' },
      orange: { inputBorder: 'border-orange-300', focusBorder: 'focus:border-orange-500', focusRing: 'focus:ring-2 focus:ring-orange-200' },
      green: { inputBorder: 'border-green-300', focusBorder: 'focus:border-green-500', focusRing: 'focus:ring-2 focus:ring-green-200' },
      teal: { inputBorder: 'border-teal-300', focusBorder: 'focus:border-teal-500', focusRing: 'focus:ring-2 focus:ring-teal-200' },
      yellow: { inputBorder: 'border-yellow-300', focusBorder: 'focus:border-yellow-500', focusRing: 'focus:ring-2 focus:ring-yellow-200' },
    };
    return map[cardColor] || map.blue;
  })();
  return (
    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
      <ResumeCard title="Formação" icon={GraduationCap} color={cardColor}>
        <div className="space-y-2">
          <Label htmlFor="education">Descrição da Formação</Label>
          <Textarea id="education" value={value} onChange={(e) => onChange(e.target.value)} placeholder="Descreva sua formação acadêmica... Exemplo: ensino médio incompleto" rows={4} required className={`border-2 ${accent.inputBorder} ${accent.focusBorder} ${accent.focusRing} rounded-xl px-4 py-3 text-gray-700 placeholder-gray-400 resize-none`} />
        </div>
      </ResumeCard>
    </motion.div>
  );
};
export default EducationSection;