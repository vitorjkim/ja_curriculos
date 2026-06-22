import React, { useEffect, useState } from 'react';
import { jobs as jobsAPI } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Trash2, Eye, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';

const AdminJobs = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState([]);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await jobsAPI.listCommunity();
      setJobs(res.jobs || []);
    } catch (e) {
      setError(e.message || 'Erro ao carregar vagas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async (id) => {
    if (!id) return;
    const ok = window.confirm('Tem certeza que deseja remover esta vaga da comunidade? Esta ação não pode ser desfeita.');
    if (!ok) return;
    setDeletingId(id);
    try {
      await jobsAPI.delete(id);
      setJobs(prev => prev.filter(j => j.id !== id));
    } catch (e) {
      alert(e.message || 'Erro ao deletar');
    } finally {
      setDeletingId(null);
    }
  };

  if (!user || user.type !== 'admin') {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-semibold">Acesso restrito</h1>
        <p className="text-gray-600 mt-2">Apenas administradores podem acessar esta página.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Vagas da Comunidade (Admin)</h1>
        <div className="flex items-center gap-2">
          <Link to="/admin/create-community-job">
            <Button variant="outline">Criar nova</Button>
          </Link>
          <Button variant="ghost" onClick={load} disabled={loading} className="flex items-center gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-md bg-red-50 text-red-700 border border-red-200 mb-4">{error}</div>
      )}

      {loading ? (
        <div className="text-gray-600">Carregando…</div>
      ) : jobs.length === 0 ? (
        <div className="text-gray-600">Nenhuma vaga da comunidade encontrada.</div>
      ) : (
        <div className="overflow-x-auto border rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Título</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Empresa</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Local</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Área</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Criada</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {jobs.map(j => (
                <tr key={j.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2">
                    <div className="font-medium text-gray-900">{j.title}</div>
                    <div className="text-xs text-gray-500 line-clamp-1">{j.description}</div>
                  </td>
                  <td className="px-4 py-2">{j.company_name || j.community_company_name || '-'}</td>
                  <td className="px-4 py-2">{j.location || '-'}</td>
                  <td className="px-4 py-2">{j.area}{j.subarea ? ` • ${j.subarea}` : ''}</td>
                  <td className="px-4 py-2 text-sm text-gray-600">{new Date(j.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-2">
                    <div className="flex items-center justify-end gap-2">
                      <Link to={`/job/${j.id}`} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" variant="outline" className="flex items-center gap-1">
                          <Eye className="w-4 h-4" /> Ver
                        </Button>
                      </Link>
                      <Button size="sm" variant="destructive" onClick={() => handleDelete(j.id)} disabled={deletingId === j.id} className="flex items-center gap-1">
                        <Trash2 className="w-4 h-4" /> {deletingId === j.id ? 'Removendo…' : 'Excluir'}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminJobs;
