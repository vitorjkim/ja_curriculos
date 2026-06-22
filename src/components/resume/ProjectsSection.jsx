import React from 'react';
import ResumeCard from './ResumeCard';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Lightbulb } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ProjectsSection = ({ projects, onChange, cardColor = 'red' }) => {
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
  const btnColor = buttonColors[cardColor] || buttonColors.red;

  const accent = (() => {
    const map = {
      red: {
        panelBorder: 'border-red-100', inputBorder: 'border-red-300', focusBorder: 'focus:border-red-500', focusRing: 'focus:ring-2 focus:ring-red-200', deleteBtn: 'text-red-500 hover:text-red-700 hover:bg-red-50'
      },
      orange: {
        panelBorder: 'border-orange-100', inputBorder: 'border-orange-300', focusBorder: 'focus:border-orange-500', focusRing: 'focus:ring-2 focus:ring-orange-200', deleteBtn: 'text-orange-500 hover:text-orange-700 hover:bg-orange-50'
      },
      purple: {
        panelBorder: 'border-purple-100', inputBorder: 'border-purple-300', focusBorder: 'focus:border-purple-500', focusRing: 'focus:ring-2 focus:ring-purple-200', deleteBtn: 'text-purple-600 hover:text-purple-700 hover:bg-purple-50'
      },
      green: {
        panelBorder: 'border-green-100', inputBorder: 'border-green-300', focusBorder: 'focus:border-green-500', focusRing: 'focus:ring-2 focus:ring-green-200', deleteBtn: 'text-green-600 hover:text-green-700 hover:bg-green-50'
      },
      blue: {
        panelBorder: 'border-blue-100', inputBorder: 'border-blue-300', focusBorder: 'focus:border-blue-500', focusRing: 'focus:ring-2 focus:ring-blue-200', deleteBtn: 'text-blue-600 hover:text-blue-700 hover:bg-blue-50'
      },
      teal: {
        panelBorder: 'border-teal-100', inputBorder: 'border-teal-300', focusBorder: 'focus:border-teal-500', focusRing: 'focus:ring-2 focus:ring-teal-200', deleteBtn: 'text-teal-600 hover:text-teal-700 hover:bg-teal-50'
      },
      yellow: {
        panelBorder: 'border-yellow-100', inputBorder: 'border-yellow-300', focusBorder: 'focus:border-yellow-500', focusRing: 'focus:ring-2 focus:ring-yellow-200', deleteBtn: 'text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50'
      },
    };
    return map[cardColor] || map.red;
  })();
  const handleAdd = () => {
    onChange([...projects, { id: Date.now(), title: '', period: '', description: '' }]);
  };

  const handleRemove = (id) => {
    onChange(projects.filter(proj => proj.id !== id));
  };

  const handleChange = (id, field, value) => {
    onChange(projects.map(proj => (proj.id === id ? { ...proj, [field]: value } : proj)));
  };

  return (
    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.3 }}>
      <ResumeCard
        title="Projetos e Atividades Extracurriculares"
        icon={Lightbulb}
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
        <div className="space-y-6">
          <AnimatePresence>
            {projects.map((proj, index) => (
              <motion.div
                key={proj.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className={`bg-white/60 backdrop-blur p-4 border ${accent.panelBorder} rounded-xl space-y-4 classic-outline minimal-quiet`}
              >
                <div className="flex items-start justify-between">
                  <h4 className="font-bold text-base item-title">Projeto {index + 1}</h4>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemove(proj.id)}
                    className={`delete-btn delete-btn-${cardColor} ${accent.deleteBtn}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Título do Projeto</Label>
                    <Input
                      value={proj.title}
                      onChange={(e) => handleChange(proj.id, 'title', e.target.value)}
                      placeholder="Ex: Sistema de Gestão de Estoque"
                      className={`border-2 ${accent.inputBorder} ${accent.focusBorder} ${accent.focusRing} rounded-xl px-4 py-3 text-gray-700 placeholder-gray-400`}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Período</Label>
                    <Input
                      value={proj.period}
                      onChange={(e) => handleChange(proj.id, 'period', e.target.value)}
                      placeholder="Ex: Jan 2023 - Mar 2023"
                      className={`border-2 ${accent.inputBorder} ${accent.focusBorder} ${accent.focusRing} rounded-xl px-4 py-3 text-gray-700 placeholder-gray-400`}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Textarea
                    value={proj.description}
                    onChange={(e) => handleChange(proj.id, 'description', e.target.value)}
                    placeholder="Descreva o projeto, tecnologias utilizadas, resultados alcançados..."
                    rows={3}
                    className={`border-2 ${accent.inputBorder} ${accent.focusBorder} ${accent.focusRing} rounded-xl px-4 py-3 text-gray-700 placeholder-gray-400 resize-none`}
                  />
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {projects.length === 0 && (
            <div className={`text-center py-8 empty-state ${cardColor}`}>
              <Lightbulb className="w-12 h-12 mx-auto mb-3" />
              <p className="text-sm font-medium">Nenhum projeto adicionado ainda</p>
              <p className="text-xs hint mt-1">
                Inclua projetos pessoais, acadêmicos ou atividades extracurriculares
              </p>
            </div>
          )}
        </div>
      </ResumeCard>
    </motion.div>
  );
};

export default ProjectsSection;