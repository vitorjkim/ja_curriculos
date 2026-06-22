import React from 'react';
import Logo, { LogoHorizontal, LogoVertical, LogoIcon } from '../components/Logo';

const LogoShowcase = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Logo "Já Currículos"
          </h1>
          <p className="text-gray-600 text-lg">
            Diferentes variações e tamanhos da logo
          </p>
        </div>

        {/* Logo Horizontal */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-gray-800 mb-8">Logo Horizontal</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-sm border text-center">
              <h3 className="text-sm font-semibold text-gray-600 mb-4">Pequeno</h3>
              <LogoHorizontal size="sm" />
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border text-center">
              <h3 className="text-sm font-semibold text-gray-600 mb-4">Médio</h3>
              <LogoHorizontal size="md" />
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border text-center">
              <h3 className="text-sm font-semibold text-gray-600 mb-4">Grande</h3>
              <LogoHorizontal size="lg" />
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border text-center">
              <h3 className="text-sm font-semibold text-gray-600 mb-4">Extra Grande</h3>
              <LogoHorizontal size="xl" />
            </div>
          </div>
        </section>

        {/* Logo Vertical */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-gray-800 mb-8">Logo Vertical</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-sm border text-center">
              <h3 className="text-sm font-semibold text-gray-600 mb-4">Pequeno</h3>
              <LogoVertical size="sm" />
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border text-center">
              <h3 className="text-sm font-semibold text-gray-600 mb-4">Médio</h3>
              <LogoVertical size="md" />
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border text-center">
              <h3 className="text-sm font-semibold text-gray-600 mb-4">Grande</h3>
              <LogoVertical size="lg" />
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border text-center">
              <h3 className="text-sm font-semibold text-gray-600 mb-4">Extra Grande</h3>
              <LogoVertical size="xl" />
            </div>
          </div>
        </section>

        {/* Apenas o Ícone */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-gray-800 mb-8">Apenas o Ícone</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-sm border text-center">
              <h3 className="text-sm font-semibold text-gray-600 mb-4">Pequeno</h3>
              <div className="flex justify-center">
                <LogoIcon size="sm" />
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border text-center">
              <h3 className="text-sm font-semibold text-gray-600 mb-4">Médio</h3>
              <div className="flex justify-center">
                <LogoIcon size="md" />
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border text-center">
              <h3 className="text-sm font-semibold text-gray-600 mb-4">Grande</h3>
              <div className="flex justify-center">
                <LogoIcon size="lg" />
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border text-center">
              <h3 className="text-sm font-semibold text-gray-600 mb-4">Extra Grande</h3>
              <div className="flex justify-center">
                <LogoIcon size="xl" />
              </div>
            </div>
          </div>
        </section>

        {/* Variações de Cores */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-gray-800 mb-8">Variações de Cores</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-lg shadow-sm border text-center">
              <h3 className="text-sm font-semibold text-gray-600 mb-4">Fundo Claro</h3>
              <LogoHorizontal size="lg" textColor="text-gray-900" />
            </div>
            <div className="bg-gray-900 p-8 rounded-lg shadow-sm text-center">
              <h3 className="text-sm font-semibold text-gray-300 mb-4">Fundo Escuro</h3>
              <LogoHorizontal size="lg" textColor="text-white" />
            </div>
            <div className="bg-blue-600 p-8 rounded-lg shadow-sm text-center">
              <h3 className="text-sm font-semibold text-blue-100 mb-4">Fundo Colorido</h3>
              <LogoHorizontal size="lg" textColor="text-white" />
            </div>
          </div>
        </section>

        {/* Sem Animação */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-gray-800 mb-8">Versões sem Animação</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-lg shadow-sm border text-center">
              <h3 className="text-sm font-semibold text-gray-600 mb-4">Horizontal Estático</h3>
              <LogoHorizontal size="lg" animated={false} />
            </div>
            <div className="bg-white p-8 rounded-lg shadow-sm border text-center">
              <h3 className="text-sm font-semibold text-gray-600 mb-4">Vertical Estático</h3>
              <LogoVertical size="md" animated={false} />
            </div>
          </div>
        </section>

        {/* Guia de Uso */}
        <section className="bg-white rounded-xl p-8 shadow-sm border">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Como Usar</h2>
          <div className="space-y-4 text-gray-600">
            <div>
              <h3 className="font-semibold text-gray-800">Logo Horizontal:</h3>
              <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                {`<Logo size="md" animated={true} textColor="text-gray-900" />`}
              </code>
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">Logo Vertical:</h3>
              <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                {`<LogoVertical size="md" animated={true} />`}
              </code>
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">Apenas Ícone:</h3>
              <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                {`<LogoIcon size="md" animated={true} />`}
              </code>
            </div>
            <div className="pt-4">
              <p><strong>Tamanhos:</strong> 'sm', 'md', 'lg', 'xl'</p>
              <p><strong>Cores de texto:</strong> Use classes Tailwind como 'text-gray-900', 'text-white', etc.</p>
              <p><strong>Animação:</strong> true/false para ativar/desativar as animações</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default LogoShowcase;
