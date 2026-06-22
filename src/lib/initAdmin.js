// Script para criar usuário administrador padrão
const createDefaultAdmin = () => {
  const users = JSON.parse(localStorage.getItem('curriculoja_users') || '[]');
  
  // Verificar se já existe um admin
  const existingAdmin = users.find(user => user.type === 'admin');
  
  if (!existingAdmin) {
    const defaultAdmin = {
      id: 'admin-default-' + Date.now(),
      email: 'admin@curriculoja.com',
      password: '123456',
      name: 'Administrador Sistema',
      type: 'admin',
      phone: '',
      createdAt: new Date().toISOString()
    };
    
    users.push(defaultAdmin);
    localStorage.setItem('curriculoja_users', JSON.stringify(users));
    
    console.log('✅ Usuário administrador padrão criado:');
    console.log('Email: admin@curriculoja.com');
    console.log('Senha: 123456');
  } else {
    console.log('✅ Usuário administrador já existe no sistema');
  }
};

export { createDefaultAdmin };
