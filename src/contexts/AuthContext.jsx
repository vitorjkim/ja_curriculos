import React, { createContext, useContext, useState, useEffect } from 'react';
import ApiService, { authAPI } from '../lib/api';

// ⚠️ IMPORTANTE: Usa a mesma validação rigorosa de getAPIBaseURL() de src/lib/api.js
// Não há fallback para localhost
function getAPIBaseURL() {
  const apiUrl = import.meta.env.VITE_API_URL;
  
  if (!apiUrl || typeof apiUrl !== 'string' || apiUrl.trim().length === 0) {
    const errorMsg = 
      '❌ ERRO CRÍTICO: Variável de ambiente VITE_API_URL não está definida ou é vazia!\n' +
      'A aplicação não pode funcionar sem esta configuração.\n' +
      'Em produção (Vercel): Adicione VITE_API_URL nas Environment Variables\n' +
      'Exemplo: VITE_API_URL=https://seu-backend.up.railway.app/api';
    
    console.error(errorMsg);
    throw new Error('VITE_API_URL não configurada');
  }
  
  const trimmed = apiUrl.trim().replace(/\/$/, '');
  
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    const errorMsg = 
      `❌ ERRO CRÍTICO: VITE_API_URL deve ser uma URL ABSOLUTA.\n` +
      `Recebido: "${apiUrl}"`;
    
    console.error(errorMsg);
    throw new Error('VITE_API_URL deve ser uma URL absoluta');
  }
  
  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction && trimmed.includes('localhost')) {
    const errorMsg = 
      `❌ ERRO CRÍTICO: Em produção, VITE_API_URL não pode apontar para localhost!`;
    
    console.error(errorMsg);
    throw new Error('VITE_API_URL apontando para localhost em produção');
  }
  
  let finalUrl = trimmed;
  if (!finalUrl.endsWith('/api')) {
    finalUrl = `${finalUrl}/api`;
  }
  
  return finalUrl;
}

const API_BASE_URL = getAPIBaseURL();

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastTokenCheck, setLastTokenCheck] = useState(0);

  // Função para renovar token se necessário
  const checkAndRefreshToken = async () => {
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000; // 5 minutos em milissegundos
    
    // Evitar verificações muito frequentes
    if (now - lastTokenCheck < fiveMinutes) {
      return true;
    }
    
    const token = localStorage.getItem('curriculoja_token');
    const refreshToken = localStorage.getItem('curriculoja_refresh_token');
    
    if (!token || !refreshToken) return false;

    setLastTokenCheck(now);

    try {
      // Tentar fazer uma requisição para verificar se o token ainda é válido
      await authAPI.me();
      return true;
    } catch (error) {
      if (error.response?.status === 401) {
        // Token expirado, tentar renovar
        try {
          console.log('Token expirado, renovando automaticamente...');
          const refreshResponse = await authAPI.refreshToken(refreshToken);
          
          localStorage.setItem('curriculoja_token', refreshResponse.token);
          localStorage.setItem('curriculoja_refresh_token', refreshResponse.refreshToken);
          localStorage.setItem('curriculoja_user', JSON.stringify(refreshResponse.user));
          
          setUser(refreshResponse.user);
          console.log('Token renovado automaticamente!');
          return true;
        } catch (refreshError) {
          console.log('Erro ao renovar token automaticamente, fazendo logout');
          localStorage.removeItem('curriculoja_token');
          localStorage.removeItem('curriculoja_refresh_token');
          localStorage.removeItem('curriculoja_user');
          setUser(null);
          return false;
        }
      }
      return false;
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = localStorage.getItem('curriculoja_token');
        const refreshToken = localStorage.getItem('curriculoja_refresh_token');
        const savedUser = localStorage.getItem('curriculoja_user');
        
        if (token && savedUser) {
          // Tentar usar dados salvos primeiro
          let savedUserData = JSON.parse(savedUser);
          
          // Verificar se token ainda é válido
          try {
            const response = await authAPI.me();
            let apiUser = response.user;
            
            // Preservar dados locais importantes como subscriptionPlan se a API não os tem
            if (savedUserData.subscriptionPlan && !apiUser.subscriptionPlan) {
              apiUser = { ...apiUser, subscriptionPlan: savedUserData.subscriptionPlan, subscriptionStatus: savedUserData.subscriptionStatus };
            }
            
            // Garantir que o usuário tenha um plano definido
            if (!apiUser.subscriptionPlan) {
              apiUser = { ...apiUser, subscriptionPlan: 'free', subscriptionStatus: 'active' };
              localStorage.setItem('curriculoja_user', JSON.stringify(apiUser));
            }
            
            // Garantir que o avatar seja incluído
            if (apiUser.profile_image && !apiUser.profileImage) {
              apiUser.profileImage = apiUser.profile_image;
            }
            
            setUser(apiUser);
            
            // Disparar evento de atualização de avatar
            if (apiUser.profileImage || apiUser.profile_image) {
              window.dispatchEvent(new CustomEvent('avatarUpdated', {
                detail: { 
                  userId: apiUser.id, 
                  avatar: apiUser.profileImage || apiUser.profile_image 
                }
              }));
            }
          } catch (error) {
            console.log('Token expirado, tentando renovar...');
            
            // Se token expirou, tentar renovar com refresh token
            if (refreshToken && error.response?.status === 401) {
              try {
                const refreshResponse = await authAPI.refreshToken(refreshToken);
                
                let user = refreshResponse.user;
                
                // Preservar dados locais importantes como subscriptionPlan
                if (savedUserData.subscriptionPlan && !user.subscriptionPlan) {
                  user = { ...user, subscriptionPlan: savedUserData.subscriptionPlan, subscriptionStatus: savedUserData.subscriptionStatus };
                }
                
                // Garantir que o usuário tenha um plano definido
                if (!user.subscriptionPlan) {
                  user = { ...user, subscriptionPlan: 'free', subscriptionStatus: 'active' };
                }
                
                // Garantir que o avatar seja incluído
                if (user.profile_image && !user.profileImage) {
                  user.profileImage = user.profile_image;
                }
                
                // Salvar novos tokens
                localStorage.setItem('curriculoja_token', refreshResponse.token);
                localStorage.setItem('curriculoja_refresh_token', refreshResponse.refreshToken);
                localStorage.setItem('curriculoja_user', JSON.stringify(user));
                
                setUser(user);
                
                // Disparar evento de atualização de avatar
                if (user.profileImage || user.profile_image) {
                  window.dispatchEvent(new CustomEvent('avatarUpdated', {
                    detail: { 
                      userId: user.id, 
                      avatar: user.profileImage || user.profile_image 
                    }
                  }));
                }
                
                console.log('Token renovado com sucesso');
              } catch (refreshError) {
                console.log('Erro ao renovar token, fazendo logout');
                // Refresh também falhou, limpar tudo
                localStorage.removeItem('curriculoja_token');
                localStorage.removeItem('curriculoja_refresh_token');
                localStorage.removeItem('curriculoja_user');
              }
            } else {
              // Token inválido por outros motivos, limpar dados
              console.log('Token inválido, limpando dados de autenticação');
              localStorage.removeItem('curriculoja_token');
              localStorage.removeItem('curriculoja_refresh_token');
              localStorage.removeItem('curriculoja_user');
            }
          }
        }
      } catch (error) {
        console.error('Erro na inicialização da autenticação:', error);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // Verificar token a cada hora (menos frequente)
    const tokenCheckInterval = setInterval(checkAndRefreshToken, 60 * 60 * 1000);
    
    // Verificar token quando a página fica visível novamente (mas com throttling)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkAndRefreshToken();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      clearInterval(tokenCheckInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []); // Remover dependência do user para evitar loop infinito

  const login = async (email, password) => {
    try {
      setLoading(true);
      try {
        const response = await ApiService.login(email, password);
        if (response.user && response.token) {
          let userData = response.user;
          const users = JSON.parse(localStorage.getItem('curriculoja_users') || '[]');
          const localUser = users.find(u => u.email === userData.email || u.id === userData.id);
          if (localUser && localUser.subscriptionPlan) {
            userData = { ...userData, subscriptionPlan: localUser.subscriptionPlan, subscriptionStatus: localUser.subscriptionStatus };
          } else if (!userData.subscriptionPlan) {
            userData = { ...userData, subscriptionPlan: 'free', subscriptionStatus: 'active' };
          }
          
          // Garantir que o avatar seja incluído nos dados do usuário
          if (userData.profile_image && !userData.profileImage) {
            userData.profileImage = userData.profile_image;
          }
          
          setUser(userData);
          localStorage.setItem('curriculoja_token', response.token);
          localStorage.setItem('curriculoja_user', JSON.stringify(userData));
          if (response.refreshToken) localStorage.setItem('curriculoja_refresh_token', response.refreshToken);
          
          // Disparar evento de atualização de avatar para a Navbar (com pequeno delay para garantir que os componentes estejam montados)
          setTimeout(() => {
            if (userData.profileImage || userData.profile_image) {
              window.dispatchEvent(new CustomEvent('avatarUpdated', {
                detail: { 
                  userId: userData.id, 
                  avatar: userData.profileImage || userData.profile_image 
                }
              }));
            }
          }, 100);
          
          return { success: true, user: userData };
        }
        throw new Error('Resposta inválida do servidor');
      } catch (apiError) {
        const msg = apiError?.message || '';
        // Se for erro legítimo de credenciais ou conta, repassar direto
        if (/Email ou senha incorretos|ACCOUNT_DISABLED|INVALID_CREDENTIALS|ACCESS_DENIED/i.test(msg)) {
          return { success: false, error: msg };
        }
        // Apenas fallback se parecer erro de rede (TypeError, Failed to fetch, NetworkError)
        if (!/fetch|network|TypeError/i.test(msg)) {
          return { success: false, error: msg || 'Erro ao conectar' };
        }
        console.warn('⚠️  Backend indisponível, usando fallback local. Mensagem:', msg);
        const users = JSON.parse(localStorage.getItem('curriculoja_users') || '[]');
        const foundUser = users.find(u => u.email === email);
        if (!foundUser) {
          return { success: false, error: 'Servidor indisponível e usuário não existe localmente.' };
        }
        // Bloquear fallback para admin ou school (exige backend)
        if (foundUser.type === 'admin' || foundUser.type === 'school') {
          return { success: false, error: 'Servidor indisponível. Admin/Escola exige conexão.' };
        }
        if (foundUser.password !== password) {
          return { success: false, error: 'Senha incorreta (modo offline).' };
        }
        let userData = foundUser;
        if (!userData.subscriptionPlan) {
          userData = { ...userData, subscriptionPlan: 'free', subscriptionStatus: 'active' };
          const idx = users.findIndex(u => u.id === userData.id);
          if (idx !== -1) { users[idx] = userData; localStorage.setItem('curriculoja_users', JSON.stringify(users)); }
        }
        setUser(userData);
        const token = `local_token_${Date.now()}`;
        localStorage.setItem('curriculoja_token', token);
        localStorage.setItem('curriculoja_user', JSON.stringify(userData));
        return { success: true, user: userData, offline: true };
      }
    } catch (e) {
      console.error('Erro no login:', e);
      return { success: false, error: e.message };
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    try {
      setLoading(true);
      
      const response = await ApiService.register(userData);
      
      if (response.success) {
        return { success: true, message: 'Usuário registrado com sucesso!' };
      } else {
        throw new Error(response.error || 'Erro no registro');
      }
    } catch (error) {
      console.error('Erro no registro:', error);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const registerWithoutLogin = async (userData) => {
    try {
      // Adicionar plano padrão gratuito
      const userDataWithPlan = {
        ...userData,
        subscriptionPlan: 'free',
        subscriptionStatus: 'active'
      };
      
      try {
        const response = await authAPI.register(userDataWithPlan);
        // Não salvar tokens nem fazer login automático
        return response;
      } catch (apiError) {
        console.log('API não disponível, usando localStorage:', apiError);
        
        // Fallback para localStorage
        const existingUsers = JSON.parse(localStorage.getItem('curriculoja_users') || '[]');
        
        // Verificar se email já existe
        if (existingUsers.find(u => u.email === userData.email)) {
          throw new Error('Este email já está cadastrado');
        }
        
        // Verificar se CNPJ já existe (para empresas)
        if (userData.type === 'company' && userData.cnpj) {
          const cnpjExists = existingUsers.find(u => 
            u.type === 'company' && u.cnpj === userData.cnpj
          );
          if (cnpjExists) {
            throw new Error('Este CNPJ já está cadastrado por outra empresa');
          }
        }
        
        // Criar novo usuário
        const newUser = {
          ...userDataWithPlan,
          id: Date.now().toString(),
          created_at: new Date().toISOString()
        };
        
        // Salvar no localStorage
        existingUsers.push(newUser);
        localStorage.setItem('curriculoja_users', JSON.stringify(existingUsers));
        
        return { success: true, user: newUser };
      }
    } catch (error) {
      console.error('Erro no registro:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Erro no logout:', error);
    } finally {
      // Limpar dados locais independente do resultado da API
      setUser(null);
      localStorage.removeItem('curriculoja_token');
      localStorage.removeItem('curriculoja_refresh_token');
      localStorage.removeItem('curriculoja_user');
    }
  };

  const updateUser = async (updatedData) => {
    try {
      const response = await authAPI.me(); // Buscar dados atualizados
      const updatedUser = response.user;
      
      setUser(updatedUser);
      localStorage.setItem('curriculoja_user', JSON.stringify(updatedUser));
      return updatedUser;
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error);
      throw error;
    }
  };

  const updateSubscription = async (planType) => {
    try {
      // Normalizar o planType para minúsculo para consistência
      const normalizedPlan = planType.toLowerCase();
      
      // Chamar backend para persistir
      await fetch(`${API_BASE_URL}/auth/upgrade`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('curriculoja_token')}`
        },
        body: JSON.stringify({ plan: normalizedPlan })
      });

      // Recarregar dados do usuário do backend
      const refreshed = await authAPI.me();
      const updatedUser = {
        ...refreshed.user,
        subscriptionPlan: refreshed.user.subscriptionPlan || normalizedPlan,
        subscriptionStatus: refreshed.user.subscriptionStatus || 'active'
      };

      setUser(updatedUser);
      localStorage.setItem('curriculoja_user', JSON.stringify(updatedUser));
      
      // IMPORTANTE: Também atualizar na lista de usuários para persistir
      const users = JSON.parse(localStorage.getItem('curriculoja_users') || '[]');
      const userIndex = users.findIndex(u => 
        u.id === user.id || 
        u.email === user.email ||
        (user.cnpj && u.cnpj === user.cnpj)
      );
      
      if (userIndex !== -1) {
        // Preservar todos os dados existentes e atualizar apenas o plano
        users[userIndex] = { 
          ...users[userIndex], 
          subscriptionPlan: normalizedPlan,
          subscriptionStatus: 'active',
          subscriptionUpdatedAt: new Date().toISOString()
        };
        localStorage.setItem('curriculoja_users', JSON.stringify(users));
        console.log('Plano atualizado na lista de usuários:', users[userIndex]);
      } else {
        // Se não encontrou, adicionar o usuário com o plano
        const newUserEntry = {
          ...updatedUser,
          id: user.id || Date.now().toString()
        };
        users.push(newUserEntry);
        localStorage.setItem('curriculoja_users', JSON.stringify(users));
        console.log('Usuário adicionado à lista com plano:', newUserEntry);
      }
      
      // Garantir que o token também está salvo
      const token = localStorage.getItem('curriculoja_token');
      if (!token && user?.token) {
        localStorage.setItem('curriculoja_token', user.token);
      }
      
      console.log('Plano de assinatura atualizado para:', normalizedPlan);
      return updatedUser;
    } catch (error) {
      console.error('Erro ao atualizar plano:', error);
      throw error;
    }
  };

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    isAdmin: user?.type === 'admin' || user?.isAdmin,
  isCompany: user?.type === 'company',
  isSchool: user?.type === 'school',
    login,
    logout,
    register,
    registerWithoutLogin,
    updateUser,
    updateSubscription,
    checkAndRefreshToken
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};