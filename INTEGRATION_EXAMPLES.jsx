/**
 * EXEMPLOS DE INTEGRAÇÃO - Como usar os componentes de consentimento
 * 
 * Copie e cole os trechos abaixo em seus arquivos React
 */

// ═══════════════════════════════════════════════════════════════════════════
// 1. INTEGRAR EM FORMULÁRIO DE CADASTRO/SIGNUP
// ═══════════════════════════════════════════════════════════════════════════

/*
Arquivo: src/pages/SignUp.jsx (ou similar)

PASSO 1: Importar o componente
*/
import SignupConsentForm from '@/components/SignupConsentForm';

/*
PASSO 2: Adicionar estado para consentimentos
*/
const [consents, setConsents] = useState({
  privacyPolicy: false,
  whatsapp: false,
});
const [termsError, setTermsError] = useState(null);

/*
PASSO 3: Validar consentimentos antes de submeter
*/
async function handleSignup(e) {
  e.preventDefault();

  // Validar consentimento obrigatório
  if (!consents.privacyPolicy) {
    setTermsError('Você deve aceitar a Política de Privacidade para continuar.');
    return;
  }

  try {
    // Enviar dados do usuário (email, senha, etc)
    const response = await axios.post('/api/auth/signup', {
      email,
      password,
      name,
      // ✨ Adicionar consentimentos no registro
      consent_privacy_policy: consents.privacyPolicy,
      consent_whatsapp: consents.whatsapp,
    });

    if (response.data.success) {
      // Login bem-sucedido
      localStorage.setItem('token', response.data.token);
      navigate('/dashboard');
    }
  } catch (error) {
    setError(error.response?.data?.message || 'Erro ao criar conta');
  }
}

/*
PASSO 4: Renderizar formulário
*/
return (
  <form onSubmit={handleSignup}>
    {/* Campos normais de formulário */}
    <input type="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} />
    <input
      type="password"
      placeholder="Senha"
      value={password}
      onChange={(e) => setPassword(e.target.value)}
    />

    {/* ✨ Adicionar checkboxes de consentimento */}
    <SignupConsentForm
      consents={consents}
      onChange={setConsents}
      termsError={termsError}
      className="mt-6"
    />

    {/* Botão de submit */}
    <button type="submit" className="mt-6 w-full px-4 py-2 bg-blue-600 text-white rounded-lg">
      Criar Conta
    </button>
  </form>
);

// ═══════════════════════════════════════════════════════════════════════════
// 2. INTEGRAR NO PAINEL DE CONFIGURAÇÕES DO USUÁRIO
// ═══════════════════════════════════════════════════════════════════════════

/*
Arquivo: src/pages/Profile.jsx (ou ProfileSettings.jsx)

PASSO 1: Importar o componente
*/
import ConsentSettings from '@/components/ConsentSettings';

/*
PASSO 2: Renderizar na aba/seção de privacidade
*/
export function ProfileSettings() {
  const { token, userId } = useAuth();

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Abas de configurações */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-4">
          <button className="px-4 py-2 border-b-2 border-blue-600 font-medium">
            Geral
          </button>
          <button className="px-4 py-2 text-gray-600">Segurança</button>
          <button className="px-4 py-2 text-gray-600">🔒 Privacidade</button>
        </nav>
      </div>

      {/* Painel de privacidade/consentimentos */}
      <ConsentSettings token={token} userId={userId} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. SALVAR CONSENTIMENTOS COM FETCH MANUAL
// ═══════════════════════════════════════════════════════════════════════════

/*
Se preferir implementação manual ao invés de usar ConsentSettings.jsx
*/
async function updateConsentManually() {
  try {
    const response = await fetch('/api/notifications/consent', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        consent_privacy_policy: true,
        consent_whatsapp: true,
      }),
    });

    const data = await response.json();
    if (data.success) {
      console.log('✅ Consentimentos atualizados', data.consents);
    }
  } catch (error) {
    console.error('❌ Erro ao atualizar consentimentos:', error);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. OBTER CONSENTIMENTOS ATUAIS
// ═══════════════════════════════════════════════════════════════════════════

/*
Buscar consentimentos do usuário
*/
async function fetchCurrentConsents() {
  try {
    const response = await fetch('/api/notifications/consent', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();
    if (data.success) {
      console.log('Consentimentos atuais:', {
        privacyPolicy: data.consents.privacyPolicy,
        whatsapp: data.consents.whatsapp,
        lastUpdate: data.consents.lastUpdate,
      });
    }
  } catch (error) {
    console.error('❌ Erro ao buscar consentimentos:', error);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. EXPORTAR DADOS DO USUÁRIO (LGPD)
// ═══════════════════════════════════════════════════════════════════════════

/*
Baixar dados completos do usuário em JSON
*/
async function downloadUserData() {
  try {
    const response = await fetch('/api/notifications/profile/export', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `curriculoja_dados_${new Date().toISOString().split('T')[0]}.json`
    );
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);

    console.log('✅ Dados exportados com sucesso');
  } catch (error) {
    console.error('❌ Erro ao exportar dados:', error);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 6. ENVIAR E-MAIL DE TESTE
// ═══════════════════════════════════════════════════════════════════════════

/*
Testar se o serviço de e-mail está funcionando
*/
async function sendTestEmail() {
  try {
    const response = await fetch('/api/notifications/test', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();
    if (data.success) {
      alert('✅ E-mail de teste enviado! Verifique sua caixa de entrada.');
    } else {
      alert('❌ Erro ao enviar e-mail de teste');
    }
  } catch (error) {
    console.error('Erro:', error);
    alert('Erro ao enviar e-mail');
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 7. CRIAR MODAL/DIALOG DE CONSENTIMENTO
// ═══════════════════════════════════════════════════════════════════════════

/*
Arquivo: src/components/ConsentModal.jsx
Mostrar consentimento em modal quando usuário faz primeira ação sensível
*/
import ConsentCheckbox from '@/components/ui/ConsentCheckbox';
import { useState } from 'react';

export function ConsentModal({ isOpen, onClose, onAccept }) {
  const [consents, setConsents] = useState({
    privacyPolicy: false,
    whatsapp: false,
  });

  async function handleAccept() {
    if (!consents.privacyPolicy) {
      alert('Você deve aceitar a Política de Privacidade');
      return;
    }

    // Salvar consentimentos
    await fetch('/api/notifications/consent', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        consent_privacy_policy: consents.privacyPolicy,
        consent_whatsapp: consents.whatsapp,
      }),
    });

    onAccept?.(consents);
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg max-w-md">
        <h2 className="text-xl font-bold mb-4">Preferências de Comunicação</h2>

        <ConsentCheckbox
          id="privacy_policy"
          label="Aceitar Política de Privacidade"
          checked={consents.privacyPolicy}
          onChange={(value) => setConsents((prev) => ({ ...prev, privacyPolicy: value }))}
          required={true}
        />

        <ConsentCheckbox
          id="whatsapp"
          label="Receber notificações via WhatsApp"
          checked={consents.whatsapp}
          onChange={(value) => setConsents((prev) => ({ ...prev, whatsapp: value }))}
        />

        <div className="flex gap-2 mt-6">
          <button onClick={onClose} className="flex-1 px-4 py-2 border rounded-lg">
            Depois
          </button>
          <button onClick={handleAccept} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg">
            Aceitar
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 8. CONTEXT API PARA GERENCIAR CONSENTIMENTOS
// ═══════════════════════════════════════════════════════════════════════════

/*
Arquivo: src/contexts/ConsentContext.jsx
Compartilhar estado de consentimentos em toda a app
*/
import { createContext, useState, useContext, useEffect } from 'react';

const ConsentContext = createContext();

export function ConsentProvider({ children, token }) {
  const [consents, setConsents] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      fetchConsents();
    }
  }, [token]);

  async function fetchConsents() {
    try {
      const response = await fetch('/api/notifications/consent', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setConsents(data.consents);
    } catch (error) {
      console.error('Erro ao carregar consentimentos:', error);
    } finally {
      setLoading(false);
    }
  }

  async function updateConsents(newConsents) {
    try {
      const response = await fetch('/api/notifications/consent', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          consent_privacy_policy: newConsents.privacyPolicy,
          consent_whatsapp: newConsents.whatsapp,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setConsents(data.consents);
        return true;
      }
    } catch (error) {
      console.error('Erro ao atualizar consentimentos:', error);
      return false;
    }
  }

  return (
    <ConsentContext.Provider
      value={{
        consents,
        loading,
        updateConsents,
      }}
    >
      {children}
    </ConsentContext.Provider>
  );
}

export function useConsent() {
  return useContext(ConsentContext);
}

/*
USO:
const { consents, updateConsents } = useConsent();
if (consents?.privacyPolicy) {
  // Enviar notificações
}
*/

// ═══════════════════════════════════════════════════════════════════════════
// 9. GUARDA DE ROTA - EXIGIR CONSENTIMENTO ANTES DE ACESSAR
// ═══════════════════════════════════════════════════════════════════════════

/*
Arquivo: src/components/ProtectedRoute.jsx
Redirecionar para ConsentSettings se não consentiu
*/
import { useConsent } from '@/contexts/ConsentContext';
import { Navigate } from 'react-router-dom';

export function ProtectedRoute({ children, requireConsent = false }) {
  const { consents, loading } = useConsent();

  if (loading) {
    return <div>Carregando...</div>;
  }

  if (requireConsent && !consents?.privacyPolicy) {
    return <Navigate to="/settings/privacy" replace />;
  }

  return children;
}

/*
USO:
<ProtectedRoute requireConsent={true}>
  <Applications />
</ProtectedRoute>
*/

// ═══════════════════════════════════════════════════════════════════════════
// 10. HOOK CUSTOMIZADO PARA CONSENTIMENTOS
// ═══════════════════════════════════════════════════════════════════════════

/*
Arquivo: src/hooks/useConsentManagement.js
Hook reutilizável para gerenciar consentimentos
*/
import { useState, useCallback } from 'react';

export function useConsentManagement(token) {
  const [consents, setConsents] = useState({
    privacyPolicy: false,
    whatsapp: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchConsents = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/notifications/consent', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setConsents({
          privacyPolicy: data.consents.privacyPolicy,
          whatsapp: data.consents.whatsapp,
        });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const updateConsents = useCallback(
    async (updates) => {
      try {
        setLoading(true);
        const response = await fetch('/api/notifications/consent', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            consent_privacy_policy: updates.privacyPolicy,
            consent_whatsapp: updates.whatsapp,
          }),
        });
        const data = await response.json();
        if (data.success) {
          setConsents({
            privacyPolicy: data.consents.privacyPolicy,
            whatsapp: data.consents.whatsapp,
          });
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [token]
  );

  return {
    consents,
    loading,
    error,
    fetchConsents,
    updateConsents,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// RESUMO DE INTEGRAÇÃO
// ═══════════════════════════════════════════════════════════════════════════

/*
OPÇÕES DE INTEGRAÇÃO:

1. SIMPLES: Use os componentes prontos
   ✓ SignupConsentForm em página de signup
   ✓ ConsentSettings em painel de perfil
   ✓ Copie e cole, customize o styling

2. INTERMEDIÁRIA: Use hooks customizados
   ✓ useConsentManagement() para lógica
   ✓ Implemente UI customizada
   ✓ Mais controle sobre comportamento

3. AVANÇADA: Use Context + Router Guards
   ✓ ConsentProvider + useConsent()
   ✓ ProtectedRoute para rotas sensíveis
   ✓ Arquitetura escalável

RECOMENDAÇÃO: Comece com Opção 1 (componentes prontos)
              e evoluir conforme necessário.
*/
