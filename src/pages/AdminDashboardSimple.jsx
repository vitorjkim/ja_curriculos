import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const AdminDashboardSimple = () => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();

  console.log('AdminDashboardSimple - user:', user);
  console.log('AdminDashboardSimple - isAdmin:', isAdmin);

  useEffect(() => {
    console.log('useEffect - verificação, user:', user, 'isAdmin:', isAdmin);
    
    if (!user) {
      console.log('Usuário não logado, redirecionando para login');
      navigate('/login');
      return;
    }
    if (!isAdmin) {
      console.log('Usuário não é admin, redirecionando');
      navigate('/');
      return;
    }
  }, [user, isAdmin, navigate]);

  if (!user) {
    return <div className="p-8">Carregando usuário...</div>;
  }

  if (!isAdmin) {
    return <div className="p-8">Verificando permissões...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard Administrativo - TESTE</h1>
        <p className="text-gray-600 mt-2">Usuário: {user.name || user.email}</p>
        <p className="text-gray-600">Tipo: {user.type}</p>
        <p className="text-gray-600">É Admin: {isAdmin ? 'Sim' : 'Não'}</p>
        
        <div className="mt-8 bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Teste de Funcionalidade</h2>
          <p>Se você está vendo esta mensagem, o dashboard básico está funcionando.</p>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardSimple;
