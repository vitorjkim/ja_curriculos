import React, { useState } from 'react';
import { Combobox } from '@/components/ui/combobox';
import ResumeCard from '@/components/resume/ResumeCard';
import { Settings, User, GraduationCap } from 'lucide-react';

// Exemplo de opções para diferentes contextos
const templateOptions = [
  { value: 'default', label: 'Padrão', description: 'Template clássico e profissional' },
  { value: 'modern', label: 'Moderno', description: 'Design contemporâneo e limpo' },
  { value: 'creative', label: 'Criativo', description: 'Para áreas criativas e inovadoras' },
  { value: 'minimal', label: 'Minimalista', description: 'Foco no conteúdo essencial' },
  { value: 'executive', label: 'Executivo', description: 'Para cargos de liderança' }
];

const skillLevelOptions = [
  { value: 'beginner', label: 'Iniciante', description: 'Conhecimento básico' },
  { value: 'intermediate', label: 'Intermediário', description: 'Conhecimento moderado' },
  { value: 'advanced', label: 'Avançado', description: 'Conhecimento profundo' },
  { value: 'expert', label: 'Especialista', description: 'Conhecimento excepcional' }
];

const languageOptions = [
  { value: 'pt', label: 'Português', description: 'Língua nativa' },
  { value: 'en', label: 'Inglês', description: 'Idioma internacional' },
  { value: 'es', label: 'Espanhol', description: 'Idioma hispânico' },
  { value: 'fr', label: 'Francês', description: 'Idioma francófono' },
  { value: 'de', label: 'Alemão', description: 'Idioma germânico' },
  { value: 'it', label: 'Italiano', description: 'Idioma italiano' }
];

const ComboboxExample = () => {
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [selectedSkill, setSelectedSkill] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('');

  return (
    <div className="min-h-screen py-8 px-4 bg-gradient-to-br from-blue-50 via-indigo-50 to-cyan-50">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 bg-clip-text text-transparent mb-4">
            Combobox Design System
          </h1>
          <p className="text-gray-600 text-lg">Componentes com design consistente e cores dinâmicas</p>
        </div>

        {/* Card Azul - Configurações */}
        <ResumeCard title="Configurações do Template" icon={Settings} color="blue">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-800 text-base mb-2">
                Escolha o Template
              </label>
              <Combobox
                options={templateOptions}
                value={selectedTemplate}
                onChange={setSelectedTemplate}
                placeholder="Selecione um template..."
                searchable={true}
              />
            </div>
          </div>
        </ResumeCard>

        {/* Card Amarelo - Informações Pessoais */}
        <ResumeCard title="Habilidades" icon={User} color="yellow">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-800 text-base mb-2">
                Nível de Habilidade
              </label>
              <Combobox
                options={skillLevelOptions}
                value={selectedSkill}
                onChange={setSelectedSkill}
                placeholder="Selecione o nível..."
                searchable={false}
              />
            </div>
          </div>
        </ResumeCard>

        {/* Card Verde - Idiomas */}
        <ResumeCard title="Idiomas" icon={GraduationCap} color="green">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-800 text-base mb-2">
                Idioma Principal
              </label>
              <Combobox
                options={languageOptions}
                value={selectedLanguage}
                onChange={setSelectedLanguage}
                placeholder="Busque por um idioma..."
                searchable={true}
              />
            </div>
          </div>
        </ResumeCard>

        {/* Resultado */}
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <h3 className="text-lg font-semibold mb-4">Valores Selecionados:</h3>
          <div className="space-y-2 text-sm">
            <p><strong>Template:</strong> {selectedTemplate || 'Nenhum selecionado'}</p>
            <p><strong>Nível:</strong> {selectedSkill || 'Nenhum selecionado'}</p>
            <p><strong>Idioma:</strong> {selectedLanguage || 'Nenhum selecionado'}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComboboxExample;
