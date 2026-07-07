/**
 * src/components/ConsentSettings.jsx
 * Painel de gerenciamento de consentimentos LGPD no perfil do usuário
 * Permite candidatos atualizar e gerenciar seus consentimentos
 */

import { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle2, Download, Loader } from 'lucide-react';
import ConsentCheckbox from './ui/ConsentCheckbox.jsx';
import axios from 'axios';

export function ConsentSettings({ token, userId }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [consents, setConsents] = useState({
    privacyPolicy: false,
    whatsapp: false,
  });

  const [lastUpdate, setLastUpdate] = useState(null);

  // ═══════════════════════════════════════════════════════════════════════
  // 1. CARREGAR CONSENTIMENTOS ATUAIS
  // ═══════════════════════════════════════════════════════════════════════

  useEffect(() => {
    fetchConsents();
  }, [token]);

  async function fetchConsents() {
    try {
      setLoading(true);
      const response = await axios.get('/api/notifications/consent', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        setConsents({
          privacyPolicy: response.data.consents.privacyPolicy || false,
          whatsapp: response.data.consents.whatsapp || false,
        });
        setLastUpdate(response.data.consents.lastUpdate);
      }
    } catch (err) {
      console.error('Erro ao carregar consentimentos:', err);
      setError('Não foi possível carregar suas preferências de comunicação.');
    } finally {
      setLoading(false);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 2. SALVAR CONSENTIMENTOS
  // ═══════════════════════════════════════════════════════════════════════

  async function handleSaveConsents() {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const response = await axios.patch(
        '/api/notifications/consent',
        {
          consent_privacy_policy: consents.privacyPolicy,
          consent_whatsapp: consents.whatsapp,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        setSuccess('✅ Suas preferências foram salvas com sucesso!');
        setLastUpdate(response.data.consents.lastUpdate);

        // Limpar mensagem após 5 segundos
        setTimeout(() => setSuccess(null), 5000);
      }
    } catch (err) {
      console.error('Erro ao salvar consentimentos:', err);
      setError(
        err.response?.data?.error ||
          'Erro ao salvar preferências. Tente novamente.'
      );
    } finally {
      setSaving(false);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 3. EXPORTAR DADOS (LGPD - Direito de Portabilidade)
  // ═══════════════════════════════════════════════════════════════════════

  async function handleExportData() {
    try {
      setExporting(true);
      setError(null);

      const response = await axios.get('/api/notifications/profile/export', {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob',
      });

      // Criar download automático
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `curriculoja_dados_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);

      setSuccess('📥 Seus dados foram exportados com sucesso!');
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      console.error('Erro ao exportar dados:', err);
      setError(
        err.response?.data?.error ||
          'Erro ao exportar dados. Tente novamente.'
      );
    } finally {
      setExporting(false);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 4. RENDERIZAR
  // ═══════════════════════════════════════════════════════════════════════

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Preferências de Comunicação</h2>
        <p className="text-gray-600 mt-2">
          Gerencie como você deseja receber notificações sobre suas candidaturas e oportunidades.
        </p>
      </div>

      {/* Mensagens de Status */}
      {error && (
        <div className="flex gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-900">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="flex gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-green-900">{success}</p>
          </div>
        </div>
      )}

      {/* Seção de Consentimentos */}
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-900">Suas Preferências</h3>

        {/* Consentimento de Política de Privacidade */}
        <ConsentCheckbox
          id="privacy_policy"
          label="Política de Privacidade e Processamento de Dados"
          description="Autorizo a CurrículoJá a processar meus dados pessoais para oferecer recomendações personalizadas, análise com IA e notificações sobre minhas candidaturas."
          checked={consents.privacyPolicy}
          onChange={(value) =>
            setConsents((prev) => ({ ...prev, privacyPolicy: value }))
          }
        />

        {/* Consentimento de WhatsApp */}
        <ConsentCheckbox
          id="whatsapp"
          label="Notificações via WhatsApp"
          description="Autorizo a receber notificações automáticas via WhatsApp sobre novas oportunidades, atualizações de candidaturas e alertas importantes."
          checked={consents.whatsapp}
          onChange={(value) => setConsents((prev) => ({ ...prev, whatsapp: value }))}
        />

        {/* Nota sobre LGPD */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-900">
            <strong>🔒 LGPD:</strong> Você pode alterar suas preferências a qualquer momento. Para exercer
            seus direitos de acesso, correção ou exclusão de dados, use o botão de exportação abaixo ou
            entre em contato conosco.
          </p>
        </div>
      </div>

      {/* Data da Última Atualização */}
      {lastUpdate && (
        <div className="text-xs text-gray-500">
          Última atualização: {new Date(lastUpdate).toLocaleDateString('pt-BR')} às{' '}
          {new Date(lastUpdate).toLocaleTimeString('pt-BR')}
        </div>
      )}

      {/* Botões de Ação */}
      <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-gray-200">
        <button
          onClick={handleSaveConsents}
          disabled={saving || loading}
          className={`flex-1 px-6 py-2 rounded-lg font-medium transition ${
            saving
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {saving ? (
            <>
              <Loader className="w-4 h-4 inline mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            'Salvar Preferências'
          )}
        </button>

        <button
          onClick={handleExportData}
          disabled={exporting || loading}
          className={`flex-1 px-6 py-2 rounded-lg font-medium transition flex items-center justify-center gap-2 ${
            exporting
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-green-600 text-white hover:bg-green-700'
          }`}
        >
          {exporting ? (
            <>
              <Loader className="w-4 h-4 animate-spin" />
              Exportando...
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              Exportar Dados
            </>
          )}
        </button>
      </div>

      {/* Informações sobre Exportação */}
      <div className="p-4 bg-gray-50 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-2">📥 Exportar Seus Dados</h4>
        <p className="text-sm text-gray-600 mb-3">
          Baixe todos os seus dados pessoais em formato JSON, incluindo:
        </p>
        <ul className="text-sm text-gray-600 space-y-1 ml-4">
          <li>✓ Informações do seu perfil</li>
          <li>✓ Currículos cadastrados</li>
          <li>✓ Histórico de candidaturas</li>
          <li>✓ Análises de IA</li>
          <li>✓ Alertas de vagas</li>
          <li>✓ Histórico de consentimentos</li>
        </ul>
        <p className="text-xs text-gray-500 mt-3">
          Essa funcionalidade atende ao direito de portabilidade da LGPD (Lei Geral de Proteção de
          Dados).
        </p>
      </div>
    </div>
  );
}

export default ConsentSettings;
