import { useState, useEffect } from 'react';
import { partnershipsApi } from '../services/partnershipsApi';
import { Users, Clock, Check, Loader2, X, UserCheck, Heart } from 'lucide-react';

export default function PartnershipButton({ 
  userType, // 'school' ou 'company'
  targetId, // ID da escola ou empresa alvo
  targetName, // Nome para exibir
  onStatusChange = () => {} // Callback quando status muda
}) {
  const [status, setStatus] = useState('none'); // none, pending, accepted
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [partnership, setPartnership] = useState(null);

  useEffect(() => {
    checkStatus();
  }, [targetId]);

  const checkStatus = async () => {
    try {
      setLoading(true);
      const api = userType === 'school' 
        ? partnershipsApi.school 
        : partnershipsApi.company;
      
      const result = await api.checkPartnershipStatus(targetId);
      setStatus(result.status);
      setPartnership(result.partnership);
    } catch (error) {
      console.error('Erro ao verificar parceria:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRequest = async () => {
    try {
      setRequesting(true);
      const api = userType === 'school' 
        ? partnershipsApi.school 
        : partnershipsApi.company;
      
      const result = await api.requestPartnership(targetId);
      
      if (result.status === 'accepted') {
        setStatus('accepted');
      } else {
        setStatus('pending');
      }
      
      await checkStatus();
      onStatusChange(result.status);
    } catch (error) {
      alert(error.message);
    } finally {
      setRequesting(false);
    }
  };

  const handleAccept = async () => {
    if (!partnership) return;
    
    try {
      setRequesting(true);
      const api = userType === 'school' 
        ? partnershipsApi.school 
        : partnershipsApi.company;
      
      await api.acceptPartnership(partnership.id);
      setStatus('accepted');
      onStatusChange('accepted');
    } catch (error) {
      alert(error.message);
    } finally {
      setRequesting(false);
    }
  };

  const handleCancel = async () => {
    if (!partnership) return;
    if (!confirm('Deseja realmente cancelar esta parceria?')) return;
    
    try {
      setRequesting(true);
      const api = userType === 'school' 
        ? partnershipsApi.school 
        : partnershipsApi.company;
      
      await api.removePartnership(partnership.id);
      setStatus('none');
      setPartnership(null);
      onStatusChange('none');
    } catch (error) {
      alert(error.message);
    } finally {
      setRequesting(false);
    }
  };

  if (loading) {
    return (
      <button 
        disabled
        className="px-5 py-2.5 bg-slate-100 text-slate-400 rounded-[12px] cursor-not-allowed flex items-center gap-2 border-2 border-slate-200"
      >
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm font-medium">Carregando...</span>
      </button>
    );
  }

  // Parceria aceita
  if (status === 'accepted') {
    return (
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="px-5 py-2.5 bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-700 rounded-[12px] flex items-center gap-2.5 border-2 border-emerald-200 shadow-sm">
          <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center">
            <Heart className="w-4 h-4 text-emerald-600" />
          </div>
          <span className="font-bold text-sm">Parceiro</span>
        </div>
        <button
          onClick={handleCancel}
          disabled={requesting}
          className="px-4 py-2.5 text-sm text-rose-600 hover:text-rose-700 bg-white hover:bg-rose-50 rounded-[12px] border-2 border-rose-200 hover:border-rose-300 transition-all duration-200 disabled:opacity-50 font-semibold flex items-center gap-2 justify-center shadow-sm hover:shadow-md"
        >
          <X className="w-4 h-4" />
          {requesting ? 'Cancelando...' : 'Cancelar Parceria'}
        </button>
      </div>
    );
  }

  // Solicitação pendente
  if (status === 'pending' && partnership) {
    const iWasRequested = (
      (userType === 'school' && partnership.requested_by === 'company') ||
      (userType === 'company' && partnership.requested_by === 'school')
    );

    if (iWasRequested) {
      // Eu recebi a solicitação
      return (
        <div className="flex flex-col gap-3">
          <div className="px-5 py-2.5 bg-gradient-to-r from-amber-50 to-yellow-50 text-amber-700 rounded-[12px] flex items-center gap-2.5 border-2 border-amber-200 shadow-sm">
            <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center">
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <span className="font-bold text-sm">Solicitou parceria</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAccept}
              disabled={requesting}
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-[12px] hover:from-emerald-600 hover:to-green-600 transition-all duration-200 disabled:opacity-50 font-semibold text-sm shadow-md hover:shadow-lg flex items-center gap-2 justify-center"
            >
              <Check className="w-4 h-4" />
              {requesting ? 'Aceitando...' : 'Aceitar'}
            </button>
            <button
              onClick={handleCancel}
              disabled={requesting}
              className="flex-1 px-4 py-2.5 bg-white text-rose-600 border-2 border-rose-200 rounded-[12px] hover:bg-rose-50 hover:border-rose-300 transition-all duration-200 disabled:opacity-50 font-semibold text-sm shadow-sm hover:shadow-md flex items-center gap-2 justify-center"
            >
              <X className="w-4 h-4" />
              {requesting ? 'Recusando...' : 'Recusar'}
            </button>
          </div>
        </div>
      );
    } else {
      // Eu solicitei
      return (
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="px-5 py-2.5 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 rounded-[12px] flex items-center gap-2.5 border-2 border-blue-200 shadow-sm">
            <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center">
              <Clock className="w-4 h-4 text-blue-600 animate-pulse" />
            </div>
            <span className="font-bold text-sm">Aguardando resposta</span>
          </div>
          <button
            onClick={handleCancel}
            disabled={requesting}
            className="px-4 py-2.5 text-sm text-slate-600 hover:text-rose-600 bg-white hover:bg-rose-50 rounded-[12px] border-2 border-slate-200 hover:border-rose-300 transition-all duration-200 disabled:opacity-50 font-semibold flex items-center gap-2 justify-center shadow-sm"
          >
            <X className="w-4 h-4" />
            {requesting ? 'Cancelando...' : 'Cancelar'}
          </button>
        </div>
      );
    }
  }

  // Sem parceria
  return (
    <button
      onClick={handleRequest}
      disabled={requesting}
      className="px-6 py-3 bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 transition-colors duration-200 disabled:opacity-50 flex items-center gap-2.5 justify-center font-semibold text-sm border-2 border-blue-200 hover:border-blue-300"
    >
      {requesting ? (
        <>
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Solicitando...</span>
        </>
      ) : (
        <>
          <UserCheck className="w-5 h-5" />
          <span>Tornar Parceiro</span>
        </>
      )}
    </button>
  );
}
