// Debug console script
console.log('🔍 Iniciando debug da página de mensagens...');

// Função para logar dados das conversas
window.debugConversations = function() {
  console.log('📋 Estado atual das conversas:', window.conversations);
  console.log('💬 Conversa selecionada:', window.selectedConversation);
};

// Função para simular clique no WhatsApp
window.testWhatsApp = function(conversation) {
  console.log('📱 Testando WhatsApp com conversa:', conversation);
  
  if (!conversation.contactPhone) {
    console.log('❌ Telefone não encontrado:', conversation.contactPhone);
    return;
  }

  const cleanPhone = conversation.contactPhone.replace(/\D/g, '');
  console.log('🔍 WhatsApp - Número limpo:', cleanPhone);
  
  let formattedPhone = cleanPhone;
  if (!formattedPhone.startsWith('55')) {
    formattedPhone = '55' + formattedPhone;
  }

  console.log('🔍 WhatsApp - Número formatado:', formattedPhone);
  const message = `Olá! Gostaria de conversar sobre a vaga de ${conversation.jobTitle || 'emprego'}.`;
  const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
  
  console.log('🔍 WhatsApp - URL:', whatsappUrl);
  return whatsappUrl;
};

console.log('✅ Debug script carregado! Use debugConversations() e testWhatsApp() no console.');
