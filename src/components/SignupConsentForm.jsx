/**
 * src/components/SignupConsentForm.jsx
 * Checkboxes de consentimento para incluir no formulário de cadastro
 * Exigido para LGPD - não permite cadastro sem aceitar política de privacidade
 */

import { AlertCircle } from 'lucide-react';
import ConsentCheckbox from './ui/ConsentCheckbox.jsx';

export function SignupConsentForm({
  consents = { privacyPolicy: false, whatsapp: false },
  onChange,
  termsError = null,
  className = '',
}) {
  const handleChange = (field, value) => {
    onChange?.({
      ...consents,
      [field]: value,
    });
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="border-t border-gray-200 pt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          🔒 Preferências de Comunicação
        </h3>

        <div className="space-y-3">
          {/* Consentimento Obrigatório: Política de Privacidade */}
          <ConsentCheckbox
            id="privacy_policy"
            label="Aceitar Política de Privacidade *"
            description="Confirmo que li e aceito a Política de Privacidade e autorizo a CurrículoJá a processar meus dados para recomendações personalizadas, análise de currículo com IA e notificações sobre candidaturas."
            checked={consents.privacyPolicy}
            onChange={(value) => handleChange('privacyPolicy', value)}
            required={true}
          />

          {/* Erro de Validação */}
          {termsError && (
            <div className="flex gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{termsError}</p>
            </div>
          )}

          {/* Consentimento Opcional: WhatsApp */}
          <ConsentCheckbox
            id="whatsapp"
            label="Receber notificações via WhatsApp (opcional)"
            description="Autorizo a receber notificações via WhatsApp sobre novas oportunidades e atualizações de candidaturas. Você pode desativar isto a qualquer momento."
            checked={consents.whatsapp}
            onChange={(value) => handleChange('whatsapp', value)}
            required={false}
          />
        </div>

        {/* Aviso LGPD */}
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-900">
            <strong>📋 LGPD:</strong> A aceitação da Política de Privacidade é obrigatória para usar a
            plataforma. Você pode gerenciar suas preferências a qualquer momento em suas configurações de
            perfil.
          </p>
        </div>
      </div>
    </div>
  );
}

export default SignupConsentForm;
