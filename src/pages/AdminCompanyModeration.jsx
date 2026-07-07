/**
 * AdminCompanyModeration.jsx
 * Painel de moderação de empresas para administradores
 * Listar empresas pendentes e aprovar/rejeitar verificações
 */

import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  X,
  AlertCircle,
  Loader,
  Eye,
  FileText,
  TrendingUp,
  Mail,
} from 'lucide-react';
import axios from 'axios';

const AdminCompanyModeration = ({ token }) => {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showReasonInput, setShowReasonInputshowReasonInput] = useState(false);

  // ─────────────────────────────────────────────────────────────
  // Buscar dados na montagem
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [companiesRes, statsRes] = await Promise.all([
        axios.get('/api/admin/companies/pending', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get('/api/admin/stats', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      setCompanies(companiesRes.data.companies || []);
      setStats(statsRes.data.stats);
    } catch (err) {
      console.error('Erro ao buscar dados:', err);
      setError('Não foi possível carregar os dados. Verifique sua permissão de admin.');
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // Buscar detalhes da empresa
  // ─────────────────────────────────────────────────────────────
  const viewCompanyDetails = async (companyId) => {
    try {
      const response = await axios.get(`/api/admin/companies/${companyId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSelectedCompany(response.data.company);
      setShowDetails(true);
    } catch (err) {
      console.error('Erro ao buscar detalhes:', err);
      setError('Não foi possível carregar detalhes da empresa');
    }
  };

  // ─────────────────────────────────────────────────────────────
  // Aprovar empresa
  // ─────────────────────────────────────────────────────────────
  const handleApprove = async (companyId) => {
    if (!window.confirm('Deseja aprovar esta empresa?')) return;

    setProcessing(true);
    try {
      await axios.patch(
        `/api/admin/companies/${companyId}/verify`,
        { verified: true },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Atualizar lista
      setCompanies(companies.filter((c) => c.id !== companyId));
      setShowDetails(false);
      setSelectedCompany(null);

      // Atualizar stats
      if (stats) {
        setStats({
          ...stats,
          companiesPending: stats.companiesPending - 1,
          companiesVerified: stats.companiesVerified + 1,
        });
      }
    } catch (err) {
      console.error('Erro ao aprovar:', err);
      setError(err.response?.data?.error || 'Erro ao aprovar empresa');
    } finally {
      setProcessing(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // Rejeitar empresa
  // ─────────────────────────────────────────────────────────────
  const handleReject = async (companyId) => {
    if (!rejectionReason.trim()) {
      alert('Por favor, preencha o motivo da rejeição');
      return;
    }

    if (!window.confirm('Deseja rejeitar esta empresa? Um email será enviado.')) return;

    setProcessing(true);
    try {
      await axios.patch(
        `/api/admin/companies/${companyId}/verify`,
        { verified: false, reason: rejectionReason },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Atualizar lista
      setCompanies(companies.filter((c) => c.id !== companyId));
      setShowDetails(false);
      setSelectedCompany(null);
      setRejectionReason('');
      setShowReasonInputshowReasonInput(false);
    } catch (err) {
      console.error('Erro ao rejeitar:', err);
      setError(err.response?.data?.error || 'Erro ao rejeitar empresa');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="animate-spin text-blue-600" size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Moderação de Empresas
          </h1>
          <p className="text-gray-600">
            Revise e aprove/rejeite empresas que se registraram na plataforma
          </p>
        </div>

        {/* Erro */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Stats */}
        {stats && (
          <div className="grid md:grid-cols-4 gap-4 mb-8">
            {[
              {
                label: 'Empresas Pendentes',
                value: stats.companiesPending,
                icon: AlertCircle,
                color: 'orange',
              },
              {
                label: 'Empresas Verificadas',
                value: stats.companiesVerified,
                icon: CheckCircle2,
                color: 'green',
              },
              {
                label: 'Total de Empresas',
                value: stats.companiesTotal,
                icon: FileText,
                color: 'blue',
              },
              {
                label: 'Vagas Publicadas',
                value: stats.jobsTotal,
                icon: TrendingUp,
                color: 'purple',
              },
            ].map((stat, idx) => {
              const Icon = stat.icon;
              const colorClasses = {
                orange: 'bg-orange-50 text-orange-600 ring-orange-200',
                green: 'bg-green-50 text-green-600 ring-green-200',
                blue: 'bg-blue-50 text-blue-600 ring-blue-200',
                purple: 'bg-purple-50 text-purple-600 ring-purple-200',
              };

              return (
                <div
                  key={idx}
                  className={`rounded-lg p-6 ring-1 ${colorClasses[stat.color]}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium opacity-70">{stat.label}</p>
                      <p className="text-2xl font-bold mt-1">{stat.value}</p>
                    </div>
                    <Icon size={32} className="opacity-20" />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Conteúdo Principal */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Lista de Empresas */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-lg">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">
                  Empresas Pendentes ({companies.length})
                </h2>
              </div>

              <div className="divide-y divide-gray-200">
                {companies.length === 0 ? (
                  <div className="p-12 text-center">
                    <CheckCircle2 className="mx-auto text-green-600 mb-4" size={48} />
                    <p className="text-gray-600 font-medium">
                      Nenhuma empresa pendente de aprovação
                    </p>
                    <p className="text-gray-500 text-sm mt-1">
                      Todas as empresas foram revisadas ✓
                    </p>
                  </div>
                ) : (
                  companies.map((company) => (
                    <div key={company.id} className="p-6 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">
                            {company.company_name || company.name}
                          </h3>
                          <p className="text-sm text-gray-600 mt-1">
                            <Mail className="inline mr-1" size={14} />
                            {company.email}
                          </p>
                          {company.cnpj && (
                            <p className="text-sm text-gray-600 mt-1">
                              CNPJ: {company.cnpj}
                            </p>
                          )}
                          <p className="text-sm text-gray-500 mt-2">
                            Registrado em:{' '}
                            {new Date(company.created_at).toLocaleDateString('pt-BR')}
                          </p>
                        </div>

                        <button
                          onClick={() => viewCompanyDetails(company.id)}
                          className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                        >
                          <Eye size={16} />
                          Detalhes
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Painel de Detalhes */}
          <div>
            {selectedCompany ? (
              <div className="bg-white rounded-lg shadow-lg sticky top-4">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">Detalhes</h3>
                    <button
                      onClick={() => {
                        setShowDetails(false);
                        setSelectedCompany(null);
                        setShowReasonInputshowReasonInput(false);
                        setRejectionReason('');
                      }}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <X size={20} />
                    </button>
                  </div>
                </div>

                <div className="p-6 space-y-4">
                  {/* Informações */}
                  <div>
                    <p className="text-sm text-gray-600 font-medium mb-1">
                      Empresa
                    </p>
                    <p className="text-gray-900">
                      {selectedCompany.company_name || selectedCompany.name}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600 font-medium mb-1">Email</p>
                    <p className="text-gray-900">{selectedCompany.email}</p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600 font-medium mb-1">
                      Telefone
                    </p>
                    <p className="text-gray-900">
                      {selectedCompany.phone || 'Não informado'}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600 font-medium mb-1">
                      Descrição
                    </p>
                    <p className="text-gray-900 text-sm">
                      {selectedCompany.company_description || 'Não informada'}
                    </p>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm font-medium text-gray-900 mb-2">
                      Estatísticas
                    </p>
                    <ul className="space-y-1 text-sm text-gray-600">
                      <li>• Vagas publicadas: {stats?.jobsTotal || 0}</li>
                      <li>
                        • Aplicações recebidas:{' '}
                        {stats?.companiesTotal || 0}
                      </li>
                    </ul>
                  </div>

                  {/* Ações */}
                  <div className="space-y-3 pt-4 border-t border-gray-200">
                    {!showReasonInput ? (
                      <>
                        <button
                          onClick={() => handleApprove(selectedCompany.id)}
                          disabled={processing}
                          className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 font-medium"
                        >
                          {processing ? (
                            <span className="flex items-center justify-center gap-2">
                              <Loader size={16} className="animate-spin" />
                              Processando...
                            </span>
                          ) : (
                            '✓ Aprovar Empresa'
                          )}
                        </button>

                        <button
                          onClick={() => setShowReasonInputshowReasonInput(true)}
                          disabled={processing}
                          className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:bg-gray-400 font-medium"
                        >
                          ✗ Rejeitar
                        </button>
                      </>
                    ) : (
                      <>
                        <textarea
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          placeholder="Motivo da rejeição (será enviado por email)"
                          className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                          rows="3"
                        />

                        <div className="flex gap-2">
                          <button
                            onClick={() =>
                              handleReject(selectedCompany.id)
                            }
                            disabled={processing || !rejectionReason.trim()}
                            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:bg-gray-400 font-medium text-sm"
                          >
                            Confirmar Rejeição
                          </button>
                          <button
                            onClick={() => {
                              setShowReasonInputshowReasonInput(false);
                              setRejectionReason('');
                            }}
                            className="flex-1 px-4 py-2 bg-gray-300 text-gray-900 rounded-lg hover:bg-gray-400 transition-colors font-medium text-sm"
                          >
                            Cancelar
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-lg p-8 text-center sticky top-4">
                <Eye className="mx-auto text-gray-400 mb-4" size={40} />
                <p className="text-gray-600 font-medium">
                  Selecione uma empresa para ver detalhes
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminCompanyModeration;
