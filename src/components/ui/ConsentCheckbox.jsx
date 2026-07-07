/**
 * src/components/ui/ConsentCheckbox.jsx
 * Componente reutilizável para checkboxes de consentimento LGPD
 * Exibe checkbox com descrição clara e link para política de privacidade
 */

import { useState } from 'react';
import { CheckCircle2, Circle } from 'lucide-react';

export function ConsentCheckbox({
  id,
  label,
  description,
  checked = false,
  onChange,
  required = false,
  disabled = false,
  className = '',
}) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className={`flex flex-col gap-3 p-4 border border-gray-200 rounded-lg bg-white hover:border-gray-300 transition ${className}`}>
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => !disabled && onChange?.(!checked)}
          disabled={disabled}
          className={`flex-shrink-0 mt-1 transition ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
          aria-label={label}
        >
          {checked ? (
            <CheckCircle2 className="w-6 h-6 text-green-500 fill-current" />
          ) : (
            <Circle className="w-6 h-6 text-gray-300" />
          )}
        </button>

        <div className="flex-1 min-w-0">
          <label className={`flex items-center gap-2 ${disabled ? 'opacity-50' : 'cursor-pointer'}`}>
            <span className="font-medium text-gray-900">{label}</span>
            {required && <span className="text-red-500">*</span>}
          </label>
          <p className="text-sm text-gray-600 mt-1">{description}</p>
        </div>
      </div>

      {/* Link para mais detalhes */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setShowDetails(!showDetails)}
          className="text-xs text-blue-600 hover:text-blue-700 font-medium"
        >
          {showDetails ? 'Ocultar detalhes' : 'Ver mais'}
        </button>
      </div>

      {/* Detalhes expandidos */}
      {showDetails && (
        <div className="mt-2 pt-3 border-t border-gray-200 text-xs text-gray-600 space-y-2">
          {id === 'privacy_policy' && (
            <>
              <p>
                <strong>O que significa:</strong> Você autoriza a CurrículoJá a processar seus dados pessoais
                para:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Oferecer recomendações personalizadas de vagas</li>
                <li>Analisar seu currículo com IA</li>
                <li>Enviar atualizações sobre sua candidatura</li>
                <li>Manter histórico de aplicações</li>
              </ul>
              <p className="mt-2">
                <a href="/privacy-policy" className="text-blue-600 hover:underline">
                  Leia nossa Política de Privacidade completa →
                </a>
              </p>
            </>
          )}

          {id === 'whatsapp' && (
            <>
              <p>
                <strong>O que significa:</strong> Você permite que receba mensagens automáticas via WhatsApp
                sobre:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Novas oportunidades de vagas</li>
                <li>Atualizações de candidaturas</li>
                <li>Alertas importantes da plataforma</li>
              </ul>
              <p className="mt-2">
                <strong>Frequência:</strong> Apenas notificações relevantes, não spam
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default ConsentCheckbox;
