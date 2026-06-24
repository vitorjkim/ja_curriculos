/**
 * Utilitário para corrigir dados inconsistentes no localStorage
 */

export const fixUserSubscriptionData = () => {
  try {
    // Pegar usuário logado atual
    const currentUser = JSON.parse(localStorage.getItem('curriculoja_user') || 'null');
    
    if (!currentUser) {
      console.log('Nenhum usuário logado para corrigir');
      return;
    }
    
    // Pegar lista de usuários
    const users = JSON.parse(localStorage.getItem('curriculoja_users') || '[]');
    
    // Encontrar o usuário na lista
    const userIndex = users.findIndex(u => 
      u.id === currentUser.id || u.email === currentUser.email
    );
    
    if (userIndex !== -1) {
      // Sincronizar dados entre o usuário logado e a lista
      const userData = {
        ...users[userIndex],
        ...currentUser, // Priorizar dados do usuário logado
        subscriptionPlan: currentUser.subscriptionPlan || users[userIndex].subscriptionPlan || 'free'
      };
      
      // Atualizar ambos
      users[userIndex] = userData;
      localStorage.setItem('curriculoja_users', JSON.stringify(users));
      // Evitar salvar imagens grandes em base64
      try {
        const safe = { ...userData };
        if (typeof safe.profileImage === 'string' && safe.profileImage.startsWith('data:') && safe.profileImage.length > 200000) delete safe.profileImage;
        if (typeof safe.profile_image === 'string' && safe.profile_image.startsWith('data:') && safe.profile_image.length > 200000) delete safe.profile_image;
        localStorage.setItem('curriculoja_user', JSON.stringify(safe));
      } catch (e) {
        try {
          const safe2 = { ...userData };
          if (typeof safe2.profileImage === 'string' && safe2.profileImage.startsWith('data:') && safe2.profileImage.length > 200000) delete safe2.profileImage;
          if (typeof safe2.profile_image === 'string' && safe2.profile_image.startsWith('data:') && safe2.profile_image.length > 200000) delete safe2.profile_image;
          localStorage.setItem('curriculoja_user', JSON.stringify(safe2));
        } catch (e2) {
          localStorage.setItem('curriculoja_user', JSON.stringify(userData));
        }
      }
      
      console.log('Dados do usuário sincronizados:', userData);
      return userData;
    } else {
      console.log('Usuário não encontrado na lista');
      return currentUser;
    }
  } catch (error) {
    console.error('Erro ao corrigir dados do usuário:', error);
    return null;
  }
};

export const debugUserData = () => {
  console.log('=== DEBUG COMPLETO DOS DADOS ===');
  
  const currentUser = JSON.parse(localStorage.getItem('curriculoja_user') || 'null');
  const users = JSON.parse(localStorage.getItem('curriculoja_users') || '[]');
  const token = localStorage.getItem('curriculoja_token');
  
  console.log('Usuário logado:', currentUser);
  console.log('Lista de usuários:', users);
  console.log('Token:', token);
  
  if (currentUser) {
    const userInList = users.find(u => 
      u.id === currentUser.id || u.email === currentUser.email
    );
    console.log('Usuário encontrado na lista:', userInList);
    
    if (userInList && userInList.subscriptionPlan !== currentUser.subscriptionPlan) {
      console.warn('⚠️ INCONSISTÊNCIA: Planos diferentes!');
      console.warn('Plano do usuário logado:', currentUser.subscriptionPlan);
      console.warn('Plano na lista:', userInList.subscriptionPlan);
    }
  }
  
  console.log('===============================');
  
  return { currentUser, users, token };
};
