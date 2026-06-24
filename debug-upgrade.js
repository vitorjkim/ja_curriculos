// Script para testar o upgrade de plano

console.log('=== TESTE DE UPGRADE DE PLANO ===');

// Verificar dados atuais do usuário
const currentUser = JSON.parse(localStorage.getItem('curriculoja_user') || '{}');
const allUsers = JSON.parse(localStorage.getItem('curriculoja_users') || '[]');

console.log('Usuário atual:', currentUser);
console.log('Plano atual:', currentUser.subscriptionPlan || 'não definido');

// Encontrar usuário na lista
const userInList = allUsers.find(u => 
  u.id === currentUser.id || 
  u.email === currentUser.email ||
  (currentUser.cnpj && u.cnpj === currentUser.cnpj)
);

console.log('Usuário na lista:', userInList);
console.log('Plano na lista:', userInList?.subscriptionPlan || 'não definido');

// Simular upgrade
const upgradeUser = () => {
  const updatedUser = { 
    ...currentUser, 
    subscriptionPlan: 'pro',
    subscriptionStatus: 'active',
    subscriptionUpdatedAt: new Date().toISOString()
  };
  
  try {
    const safe = { ...updatedUser };
    if (typeof safe.profileImage === 'string' && safe.profileImage.startsWith('data:') && safe.profileImage.length > 200000) delete safe.profileImage;
    if (typeof safe.profile_image === 'string' && safe.profile_image.startsWith('data:') && safe.profile_image.length > 200000) delete safe.profile_image;
    localStorage.setItem('curriculoja_user', JSON.stringify(safe));
  } catch (e) {
    try {
      const safe2 = { ...updatedUser };
      if (typeof safe2.profileImage === 'string' && safe2.profileImage.startsWith('data:') && safe2.profileImage.length > 200000) delete safe2.profileImage;
      if (typeof safe2.profile_image === 'string' && safe2.profile_image.startsWith('data:') && safe2.profile_image.length > 200000) delete safe2.profile_image;
      localStorage.setItem('curriculoja_user', JSON.stringify(safe2));
    } catch (e2) {
      localStorage.setItem('curriculoja_user', JSON.stringify(updatedUser));
    }
  }
  
  const users = JSON.parse(localStorage.getItem('curriculoja_users') || '[]');
  const userIndex = users.findIndex(u => 
    u.id === currentUser.id || 
    u.email === currentUser.email ||
    (currentUser.cnpj && u.cnpj === currentUser.cnpj)
  );
  
  if (userIndex !== -1) {
    users[userIndex] = { 
      ...users[userIndex], 
      subscriptionPlan: 'pro',
      subscriptionStatus: 'active',
      subscriptionUpdatedAt: new Date().toISOString()
    };
    localStorage.setItem('curriculoja_users', JSON.stringify(users));
    console.log('✅ Plano atualizado com sucesso!');
    console.log('Usuário atualizado:', users[userIndex]);
  } else {
    console.log('❌ Usuário não encontrado na lista');
  }
};

// Para executar o upgrade, descomente a linha abaixo:
// upgradeUser();

console.log('=== FIM DO TESTE ===');
