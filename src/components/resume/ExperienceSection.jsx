import React, { useState } from 'react';
import ResumeCard from './ResumeCard';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Briefcase, Sparkles, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ai as aiAPI } from '@/lib/api';
import { toast } from '@/components/ui/use-toast';

const ExperienceSection = ({ experiences, onChange, cardColor = 'orange' }) => {
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
  const btnColor = buttonColors[cardColor] || buttonColors.orange;

  const accent = (() => {
    const map = {
      orange: {
        panelBorder: 'border-orange-100',
        inputBorder: 'border-orange-300',
        focusBorder: 'focus:border-orange-500',
        focusRing: 'focus:ring-2 focus:ring-orange-200',
        deleteBtn: 'text-orange-500 hover:text-orange-700 hover:bg-orange-50',
      },
      red: {
        panelBorder: 'border-red-100',
        inputBorder: 'border-red-300',
        focusBorder: 'focus:border-red-500',
        focusRing: 'focus:ring-2 focus:ring-red-200',
        deleteBtn: 'text-red-500 hover:text-red-700 hover:bg-red-50',
      },
      purple: {
        panelBorder: 'border-purple-100',
        inputBorder: 'border-purple-300',
        focusBorder: 'focus:border-purple-500',
        focusRing: 'focus:ring-2 focus:ring-purple-200',
        deleteBtn: 'text-purple-600 hover:text-purple-700 hover:bg-purple-50',
      },
      green: {
        panelBorder: 'border-green-100',
        inputBorder: 'border-green-300',
        focusBorder: 'focus:border-green-500',
        focusRing: 'focus:ring-2 focus:ring-green-200',
        deleteBtn: 'text-green-600 hover:text-green-700 hover:bg-green-50',
      },
      blue: {
        panelBorder: 'border-blue-100',
        inputBorder: 'border-blue-300',
        focusBorder: 'focus:border-blue-500',
        focusRing: 'focus:ring-2 focus:ring-blue-200',
        deleteBtn: 'text-blue-600 hover:text-blue-700 hover:bg-blue-50',
      },
      teal: {
        panelBorder: 'border-teal-100',
        inputBorder: 'border-teal-300',
        focusBorder: 'focus:border-teal-500',
        focusRing: 'focus:ring-2 focus:ring-teal-200',
        deleteBtn: 'text-teal-600 hover:text-teal-700 hover:bg-teal-50',
      },
      yellow: {
        panelBorder: 'border-yellow-100',
        inputBorder: 'border-yellow-300',
        focusBorder: 'focus:border-yellow-500',
        focusRing: 'focus:ring-2 focus:ring-yellow-200',
        deleteBtn: 'text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50',
      },
    };
    return map[cardColor] || map.orange;
  })();
  const handleAdd = () => {
    onChange([...experiences, { id: Date.now(), company: '', position: '', period: '', description: '' }]);
  };

  const handleRemove = (id) => {
    onChange(experiences.filter(exp => exp.id !== id));
  };

  const handleChange = (id, field, value) => {
    onChange(experiences.map(exp => (exp.id === id ? { ...exp, [field]: value } : exp)));
  };

  const [generatingId, setGeneratingId] = useState(null);

  const handleGenerateDescription = async (exp) => {
    if (!exp.company?.trim() || !exp.position?.trim() || !exp.period?.trim()) return;
    try {
      setGeneratingId(exp.id);
      const response = await aiAPI.generateExperienceDescription({ company: exp.company, position: exp.position, period: exp.period });
      if (response?.description) {
        handleChange(exp.id, 'description', response.description);
      }
    } catch (error) {
      console.error('Erro ao gerar descrição com IA:', error);
      toast({
        title: 'Erro ao gerar descrição',
        description: 'Não foi possível gerar a descrição com IA. Tente novamente.',
        variant: 'destructive'
      });
    } finally {
      setGeneratingId(null);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.5, delay: 0.2 }}>
      <ResumeCard
        title={"Experiência Profissional"}
        icon={Briefcase}
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
            {experiences.map((exp, index) => (
              <motion.div
                key={exp.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`bg-white/60 backdrop-blur p-4 border ${accent.panelBorder} rounded-xl space-y-4 classic-outline minimal-quiet`}
              >
                <div className="flex justify-between items-start">
                  <span className="font-bold text-base item-title">Experiência {index + 1}</span>
                    {experiences.length > 1 && (
                    <Button type="button" onClick={() => handleRemove(exp.id)} size="sm" variant="ghost" className={`delete-btn delete-btn-${cardColor} ${accent.deleteBtn}`}><Trash2 className="w-4 h-4" /></Button>
                  )}
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Empresa</Label>
                    <Input
                      value={exp.company}
                      onChange={(e) => handleChange(exp.id, 'company', e.target.value)}
                      placeholder="Ex: Tech Solutions"
                      className={`border-2 ${accent.inputBorder} ${accent.focusBorder} ${accent.focusRing} rounded-xl px-4 py-3 text-gray-700 placeholder-gray-400`}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Cargo</Label>
                    <Input
                      value={exp.position}
                      onChange={(e) => handleChange(exp.id, 'position', e.target.value)}
                      placeholder="Ex: Desenvolvedor Frontend"
                      className={`border-2 ${accent.inputBorder} ${accent.focusBorder} ${accent.focusRing} rounded-xl px-4 py-3 text-gray-700 placeholder-gray-400`}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Período</Label>
                  <Input
                    value={exp.period}
                    onChange={(e) => handleChange(exp.id, 'period', e.target.value)}
                    placeholder="Ex: Jan 2020 - Dez 2022"
                    className={`border-2 ${accent.inputBorder} ${accent.focusBorder} ${accent.focusRing} rounded-xl px-4 py-3 text-gray-700 placeholder-gray-400`}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label>Descrição</Label>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={!exp.company?.trim() || !exp.position?.trim() || !exp.period?.trim() || generatingId === exp.id}
                      onClick={() => handleGenerateDescription(exp)}
                      className="gap-1.5 h-7 px-2.5 text-xs rounded-lg bg-white border border-gray-200 text-gray-600 hover:text-gray-900 hover:border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed"
                      title={(!exp.company?.trim() || !exp.position?.trim() || !exp.period?.trim()) ? 'Preencha empresa, cargo e período para usar a IA' : 'Gerar descrição com IA'}
                    >
                      {generatingId === exp.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5" />
                      )}
                      Gerar com IA
                    </Button>
                  </div>
                  <Textarea
                    value={exp.description}
                    onChange={(e) => handleChange(exp.id, 'description', e.target.value)}
                    placeholder="Principais responsabilidades, tecnologias e resultados..."
                    rows={3}
                    className={`border-2 ${accent.inputBorder} ${accent.focusBorder} ${accent.focusRing} rounded-xl px-4 py-3 text-gray-700 placeholder-gray-400 resize-none`}
                  />
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </ResumeCard>
    </motion.div>
  );
};
export default ExperienceSection;