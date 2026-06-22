import React from 'react';
import ResumeCard from './ResumeCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const LanguagesSection = ({ languages, onChange, cardColor = 'green' }) => {
  // Mapeamento de cores para botões
  const buttonColors = {
    green: 'bg-emerald-600 hover:bg-emerald-700',
    yellow: 'bg-amber-500 hover:bg-amber-600',
    blue: 'bg-blue-600 hover:bg-blue-700',
    purple: 'bg-violet-600 hover:bg-violet-700',
    orange: 'bg-orange-500 hover:bg-orange-600',
    red: 'bg-rose-500 hover:bg-rose-600',
    teal: 'bg-teal-600 hover:bg-teal-700',
    gray: 'bg-slate-600 hover:bg-slate-700',
  };
  const btnColor = buttonColors[cardColor] || buttonColors.green;

  const accent = (() => {
    const map = {
      green: { panelBorder: 'border-green-100', inputBorder: 'border-green-300', focusBorder: 'focus:border-green-500', focusRing: 'focus:ring-2 focus:ring-green-200', deleteBtn: 'text-green-600 hover:text-green-700 hover:bg-green-50' },
      purple: { panelBorder: 'border-purple-100', inputBorder: 'border-purple-300', focusBorder: 'focus:border-purple-500', focusRing: 'focus:ring-2 focus:ring-purple-200', deleteBtn: 'text-purple-600 hover:text-purple-700 hover:bg-purple-50' },
      red: { panelBorder: 'border-red-100', inputBorder: 'border-red-300', focusBorder: 'focus:border-red-500', focusRing: 'focus:ring-2 focus:ring-red-200', deleteBtn: 'text-red-500 hover:text-red-700 hover:bg-red-50' },
      orange: { panelBorder: 'border-orange-100', inputBorder: 'border-orange-300', focusBorder: 'focus:border-orange-500', focusRing: 'focus:ring-2 focus:ring-orange-200', deleteBtn: 'text-orange-500 hover:text-orange-700 hover:bg-orange-50' },
      blue: { panelBorder: 'border-blue-100', inputBorder: 'border-blue-300', focusBorder: 'focus:border-blue-500', focusRing: 'focus:ring-2 focus:ring-blue-200', deleteBtn: 'text-blue-600 hover:text-blue-700 hover:bg-blue-50' },
      teal: { panelBorder: 'border-teal-100', inputBorder: 'border-teal-300', focusBorder: 'focus:border-teal-500', focusRing: 'focus:ring-2 focus:ring-teal-200', deleteBtn: 'text-teal-600 hover:text-teal-700 hover:bg-teal-50' },
      yellow: { panelBorder: 'border-yellow-100', inputBorder: 'border-yellow-300', focusBorder: 'focus:border-yellow-500', focusRing: 'focus:ring-2 focus:ring-yellow-200', deleteBtn: 'text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50' },
    };
    return map[cardColor] || map.green;
  })();
  const handleAdd = () => {
    onChange([...languages, { id: Date.now(), language: '', level: '' }]);
  };

  const handleRemove = (id) => {
    onChange(languages.filter(lang => lang.id !== id));
  };

  const handleChange = (id, field, value) => {
    onChange(languages.map(lang => (lang.id === id ? { ...lang, [field]: value } : lang)));
  };

  return (
    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.4 }}>
      <ResumeCard
        title="Idiomas"
        icon={Globe}
        color={cardColor}
        actions={
          <Button 
            type="button" 
            onClick={handleAdd} 
            size="sm" 
            className={`gap-1.5 px-4 py-2 rounded-xl ${btnColor} text-white font-medium shadow-sm`}
          >
            <Plus className="w-4 h-4" />Adicionar
          </Button>
        }
      >
        <div className="space-y-4">
          <AnimatePresence>
            {languages.map((lang, index) => (
              <motion.div
                key={lang.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`bg-white/60 backdrop-blur p-4 border ${accent.panelBorder} rounded-xl space-y-4 classic-outline minimal-quiet`}
              >
                <div className="flex justify-between items-start">
                  <span className="font-bold text-base item-title">Idioma {index + 1}</span>
                  {languages.length > 1 && (
                    <Button type="button" onClick={() => handleRemove(lang.id)} size="sm" variant="ghost" className={`delete-btn delete-btn-${cardColor} ${accent.deleteBtn}`}><Trash2 className="w-4 h-4" /></Button>
                  )}
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Idioma</Label>
                    <Input
                      value={lang.language}
                      onChange={(e) => handleChange(lang.id, 'language', e.target.value)}
                      placeholder="Ex: Inglês"
                      className={`border-2 ${accent.inputBorder} ${accent.focusBorder} ${accent.focusRing} rounded-xl px-4 py-3 text-gray-700 placeholder-gray-400`}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Nível</Label>
                    <Input
                      value={lang.level}
                      onChange={(e) => handleChange(lang.id, 'level', e.target.value)}
                      placeholder="Ex: Intermediário"
                      className={`border-2 ${accent.inputBorder} ${accent.focusBorder} ${accent.focusRing} rounded-xl px-4 py-3 text-gray-700 placeholder-gray-400`}
                      required
                    />
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </ResumeCard>
    </motion.div>
  );
};
export default LanguagesSection;