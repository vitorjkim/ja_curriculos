import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet';
import { 
  MessageSquare, 
  Send, 
  Building2,
  ArrowLeft,
  MessageCircle,
  GraduationCap,
  Trash2,
  MoreVertical
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/use-toast';
import { chatAPI, interactionsAPI } from '@/lib/api';
import { GroupBadge } from '@/components/chat/GroupBadge';
import LinkPreview from '@/components/chat/LinkPreview';

// Converte URLs em links clicáveis mantendo quebra de linha básica
function renderMessageWithLinks(text='') {
  const urlRegex = /(https?:\/\/[\w\-._~:/?#%[\]@!$&'()*+,;=]+)|(www\.[\w\-._~:/?#%[\]@!$&'()*+,;=]+)/gi;
  const parts = [];
  let lastIndex = 0;
  let match;
  while((match = urlRegex.exec(text))){
    if(match.index > lastIndex){ parts.push(text.slice(lastIndex, match.index)); }
    let url = match[0];
    if(url.startsWith('www.')) url = 'https://' + url; // garantir protocolo
    parts.push(<a key={url+match.index} href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all">{match[0]}</a>);
    lastIndex = match.index + match[0].length;
  }
  if(lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

const CandidateMessages = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]); // inclui conversas diretas + grupos
  const [rawConversations, setRawConversations] = useState([]); // só diretas
  const [groups, setGroups] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesContainerRef = useRef(null);
  const [linkPreviews, setLinkPreviews] = useState({}); // cache por URL
  const [deletingMessageId, setDeletingMessageId] = useState(null);
  const [deletingConversationId, setDeletingConversationId] = useState(null);
  const [showDeleteMenu, setShowDeleteMenu] = useState(null); // id da mensagem com menu aberto
  const [showConversationMenu, setShowConversationMenu] = useState(null); // id da conversa com menu aberto

  // Excluir mensagem
  const deleteMessage = async (messageId) => {
    if (deletingMessageId) return;
    try {
      setDeletingMessageId(messageId);
      await chatAPI.deleteMessage(messageId);
      setMessages(prev => prev.filter(m => m.id !== messageId));
      setShowDeleteMenu(null);
      toast({ title: 'Mensagem excluída', description: 'A mensagem foi removida com sucesso.' });
    } catch (error) {
      console.error('Erro ao excluir mensagem:', error);
      toast({ title: 'Erro ao excluir', description: 'Não foi possível excluir a mensagem.', variant: 'destructive' });
    } finally {
      setDeletingMessageId(null);
    }
  };

  // Excluir conversa inteira
  const deleteConversation = async (conversationId) => {
    if (deletingConversationId) return;
    try {
      setDeletingConversationId(conversationId);
      await chatAPI.deleteConversation(conversationId);
      setConversations(prev => prev.filter(c => c.id !== conversationId));
      if (selectedConversation?.id === conversationId) {
        setSelectedConversation(null);
        setMessages([]);
      }
      setShowConversationMenu(null);
      toast({ title: 'Conversa excluída', description: 'A conversa foi removida com sucesso.' });
    } catch (error) {
      console.error('Erro ao excluir conversa:', error);
      toast({ title: 'Erro ao excluir', description: 'Não foi possível excluir a conversa.', variant: 'destructive' });
    } finally {
      setDeletingConversationId(null);
    }
  };

  // Carregar conversas + grupos e mesclar
  const loadConversations = async () => {
    try {
      const [convs, grps] = await Promise.all([
        chatAPI.getConversations(),
        chatAPI.getGroups().catch(()=>[])
      ]);
      setRawConversations(convs);
      setGroups(grps);
      // Mapear grupos para estrutura comum
      const mappedGroups = (grps || []).map(g => ({
        id: g.key, // usar key como id
        isGroup: true,
        groupKey: g.key,
        groupType: g.type, // school | class
        contactName: g.name,
        contactProfileImage: g.schoolProfileImage, // foto da escola para grupos
        lastMessage: g.lastMessage,
        lastMessageAt: g.lastMessageAt,
        unreadCount: 0
      }));
      // Ordenar tudo por data da última mensagem (mais recente primeiro)
      const all = [
        ...mappedGroups,
        ...convs
      ].sort((a,b)=>{
        const da = a.lastMessageAt || a.last_message_at || '';
        const db = b.lastMessageAt || b.last_message_at || '';
        if(!da && !db) return 0;
        if(!da) return 1;
        if(!db) return -1;
        return new Date(db) - new Date(da);
      });
      console.log('🧪 Conversas+Grupos mesclados:', { grupos: mappedGroups.length, diretas: convs.length, total: all.length });
      setConversations(all);
      // Se nada selecionado ainda e existe algo, selecionar primeiro
      if(!selectedConversation && all.length>0){ setSelectedConversation(all[0]); await loadMessages(all[0]); }
    } catch (error) {
      console.error('Erro ao carregar conversas/grupos:', error);
      toast({ title: 'Erro ao carregar conversas', description: 'Não foi possível carregar suas conversas.', variant: 'destructive' });
    } finally { setLoading(false); }
  };

  // Carregar mensagens de uma conversa
  const loadMessages = async (conversation) => {
    try {
      let response = [];
      if (conversation.isGroup) {
        response = await chatAPI.getGroupMessages(conversation.groupKey);
      } else {
        response = await chatAPI.getMessages(conversation.id);
        // Marcar mensagens como lidas (apenas conversas diretas)
        const unreadMessages = response.filter(msg => !msg.isFromMe && !msg.readAt);
        for (const msg of unreadMessages) {
          try { await chatAPI.markMessageAsRead(msg.id); } catch (e) {}
        }
        if (unreadMessages.length > 0) window.dispatchEvent(new Event('refreshUnread'));
      }
      setMessages(response);
      // Buscar previews de links novos
      extractAndFetchPreviews(response);
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
      toast({ title:'Erro ao carregar mensagens', description:'Não foi possível carregar as mensagens.', variant:'destructive' });
    }
  };

  // Enviar mensagem
  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || sending) return;
    if (selectedConversation.isGroup) return; // candidato não envia para grupos
    try {
      setSending(true);
      const message = await chatAPI.sendMessage(selectedConversation.id, newMessage.trim());
      setMessages(prev => [...prev, message]);
      setNewMessage('');
      setConversations(prev => prev.map(conv => conv.id === selectedConversation.id ? { ...conv, lastMessage: newMessage.trim(), lastMessageAt: new Date().toISOString() } : conv));
  extractAndFetchPreviews([message]);
      window.dispatchEvent(new Event('refreshUnread'));
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      toast({ title:'Erro ao enviar mensagem', description:'Não foi possível enviar sua mensagem.', variant:'destructive' });
    } finally { setSending(false); }
  };

  // Selecionar conversa
  const selectConversation = async (conversation) => {
    setSelectedConversation(conversation);
    await loadMessages(conversation);
    if (!conversation.isGroup) {
      try { await interactionsAPI.markAllRead(); window.dispatchEvent(new Event('refreshUnread')); } catch (e) {}
    }
  };

  // Extrai URLs e dispara fetch de preview se ainda não em cache
  const extractAndFetchPreviews = (msgs=[]) => {
    const urlRegex = /(https?:\/\/[\w\-._~:/?#%[\]@!$&'()*+,;=]+)|(www\.[\w\-._~:/?#%[\]@!$&'()*+,;=]+)/gi;
    const urls = new Set();
    msgs.forEach(m => {
      const text = m.message || '';
      let match; while((match = urlRegex.exec(text))){ let raw = match[0]; if(raw.startsWith('www.')) raw = 'https://' + raw; urls.add(raw); }
    });
    urls.forEach(u => { if(!linkPreviews[u]) fetchPreview(u); });
  };

  const fetchPreview = async (url) => {
    try {
      const r = await fetch(`/api/chat/link-preview?url=${encodeURIComponent(url)}`);
      if(!r.ok) return;
      const data = await r.json();
      if(data?.preview){ setLinkPreviews(prev => ({ ...prev, [url]: data.preview })); }
    } catch(e){ /* silencioso */ }
  };

  // Scroll para a última mensagem
  const scrollToBottom = () => {
    const el = messagesContainerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  };

  // Função para abrir WhatsApp
  const openWhatsApp = (conversation) => {
    console.log('🔍 WhatsApp - Conversa recebida:', conversation);
    
    // Verificar se a empresa tem telefone cadastrado
    if (!conversation.contactPhone) {
      console.log('❌ WhatsApp - Telefone não encontrado:', conversation.contactPhone);
      toast({
        title: 'Telefone não encontrado',
        description: 'Esta empresa não cadastrou um número de telefone.',
        variant: 'destructive'
      });
      return;
    }

    // Limpar e formatar o número - remover todos os caracteres não numéricos
    const cleanPhone = conversation.contactPhone.replace(/\D/g, '');
    console.log('🔍 WhatsApp - Número limpo:', cleanPhone);
    
    let formattedPhone = cleanPhone;

    // Se não começar com 55 (código do Brasil), adicionar
    if (!formattedPhone.startsWith('55')) {
      formattedPhone = '55' + formattedPhone;
    }

    console.log('🔍 WhatsApp - Número formatado:', formattedPhone);

    const message = `Olá! Gostaria de conversar sobre a vaga de ${conversation.jobTitle || 'emprego'}.`;
    const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
    
    console.log('🔍 WhatsApp - URL:', whatsappUrl);
    window.open(whatsappUrl, '_blank');
  };

  useEffect(() => {
    if (user && user.type === 'candidate') {
      loadConversations();
    }
  }, [user]);
  // Refresh periódico para garantir que grupos entrem se criados depois
  useEffect(()=>{
    if(user?.type==='candidate'){
      const int = setInterval(()=>{ loadConversations(); }, 30000);
      return ()=> clearInterval(int);
    }
  },[user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fechar menus ao clicar fora
  useEffect(() => {
    const handleClickOutside = () => {
      setShowDeleteMenu(null);
      setShowConversationMenu(null);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Formatação de hora
  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Formatação de data
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Hoje';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Ontem';
    } else {
      return date.toLocaleDateString('pt-BR');
    }
  };

  if (!user || user.type !== 'candidate') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="p-6 text-center">
            <p>Acesso restrito a candidatos.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Mensagens - CurrículoJá</title>
        <meta name="description" content="Converse com empresas que você segue" />
      </Helmet>

      <div className="h-[calc(100vh-64px)] bg-white flex flex-col">
        <div className="flex flex-1 min-h-0">
                {/* Sidebar de conversas */}
                <div className={`${selectedConversation ? 'hidden lg:flex' : 'flex'} w-full lg:w-[340px] lg:min-w-[340px] bg-gray-50 border-r border-gray-200 flex-col`}>
                  {/* Header da sidebar */}
                  <div className="h-[72px] px-5 bg-gradient-to-r from-[var(--color1)] to-[var(--color2)] text-white flex items-center rounded-tr-2xl">
                    <div>
                      <h2 className="text-lg font-semibold">Conversas</h2>
                      <p className="text-blue-100 text-xs">
                        {conversations.length} conversa{conversations.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>

                  {/* Lista de conversas */}
                  <div className="flex-1 overflow-y-auto">
                    {loading ? (
                      <div className="p-6 text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color1)] mx-auto"></div>
                        <p className="mt-3 text-gray-600">Carregando conversas...</p>
                      </div>
                    ) : conversations.length === 0 ? (
                      <div className="p-6 text-center">
                        <div className="bg-white rounded-xl p-6 shadow-sm">
                          <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                          <p className="text-gray-600 font-medium">Nenhuma conversa ainda</p>
                          <p className="text-sm text-gray-500 mt-2">
                            Siga uma empresa para começar a conversar
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3">
                        {conversations.map((conversation) => (
                          <motion.div
                            key={conversation.id}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => selectConversation(conversation)}
                            className={`p-4 rounded-xl cursor-pointer transition-all duration-200 mb-2 ${
                              selectedConversation?.id === conversation.id 
                                ? 'bg-white shadow-md border-2 border-[var(--color1)]' 
                                : 'bg-white hover:shadow-md border border-gray-100'
                            }`}
                          >
                            <div className="flex items-center space-x-3">
                              <div className="relative">
                                <div className="w-12 h-12 rounded-full flex items-center justify-center overflow-hidden bg-gradient-to-br from-[var(--color1)] to-[var(--color2)]">
                                  {conversation.contactProfileImage ? (
                                    <img src={conversation.contactProfileImage} alt={conversation.contactName} className="w-full h-full object-cover" />
                                  ) : conversation.isGroup 
                                      ? (conversation.groupType === 'school' 
                                          ? <Building2 className="w-6 h-6 text-white" /> 
                                          : <GraduationCap className="w-6 h-6 text-white" />)
                                      : <Building2 className="w-6 h-6 text-white" />}
                                </div>
                                {conversation.unreadCount > 0 && (
                                  <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                                    {conversation.unreadCount}
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <h3 className="font-semibold text-gray-900 truncate">
                                    {conversation.contactName || 'Empresa'}
                                  </h3>
                                  <div className="flex items-center gap-1">
                                    {conversation.lastMessageAt && (
                                      <span className="text-xs text-gray-500">
                                        {formatTime(conversation.lastMessageAt)}
                                      </span>
                                    )}
                                    {/* Botão excluir conversa */}
                                    {!conversation.isGroup && (
                                      <div className="relative">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setShowConversationMenu(showConversationMenu === conversation.id ? null : conversation.id);
                                          }}
                                          className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                                        >
                                          <MoreVertical className="w-4 h-4 text-gray-400" />
                                        </button>
                                        {showConversationMenu === conversation.id && (
                                          <div 
                                            className="absolute right-0 top-6 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[140px]"
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                deleteConversation(conversation.id);
                                              }}
                                              disabled={deletingConversationId === conversation.id}
                                              className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 rounded-lg"
                                            >
                                              <Trash2 className="w-4 h-4" />
                                              {deletingConversationId === conversation.id ? 'Excluindo...' : 'Excluir conversa'}
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                  {conversation.isGroup && (
                                    <div className="mt-0.5"><GroupBadge type={conversation.groupType} /></div>
                                  )}
                                  <p className="text-sm text-gray-600 truncate mt-1">
                                    {conversation.lastMessage || (conversation.isGroup ? 'Sem mensagens ainda' : 'Comece uma conversa...')}
                                  </p>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Chat área */}
                <div className={`${selectedConversation ? 'flex' : 'hidden lg:flex'} flex-1 flex-col min-h-0`}>
                  {selectedConversation ? (
                    <>
                      {/* Header do chat */}
                      <div className="h-[72px] px-5 bg-white border-b border-gray-200 flex items-center flex-shrink-0">
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center space-x-3">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="lg:hidden"
                              onClick={() => setSelectedConversation(null)}
                            >
                              <ArrowLeft className="w-5 h-5" />
                            </Button>
                            {selectedConversation.contactProfileImage ? (
                              <img 
                                src={selectedConversation.contactProfileImage} 
                                alt={selectedConversation.contactName}
                                className="w-10 h-10 rounded-full object-cover border-2 border-gray-100"
                              />
                            ) : (
                              <div className="w-10 h-10 bg-gradient-to-br from-[var(--color1)] to-[var(--color2)] rounded-full flex items-center justify-center">
                                {selectedConversation.isGroup 
                                  ? (selectedConversation.groupType === 'school' 
                                      ? <Building2 className="w-5 h-5 text-white" /> 
                                      : <GraduationCap className="w-5 h-5 text-white" />)
                                  : <Building2 className="w-5 h-5 text-white" />}
                              </div>
                            )}
                            <div>
                              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                                {selectedConversation.contactName || 'Empresa'}
                                {selectedConversation.isGroup && <GroupBadge type={selectedConversation.groupType} />}
                              </h2>
                              {selectedConversation.jobTitle && (
                                <p className="text-xs text-gray-500">Vaga: {selectedConversation.jobTitle}</p>
                              )}
                            </div>
                          </div>
                          
                          {/* Botão WhatsApp (oculto para grupos) */}
                          {!selectedConversation.isGroup && (
                            <button
                              onClick={() => openWhatsApp(selectedConversation)}
                              className="flex items-center gap-2 px-4 py-2 border-2 border-green-500 text-green-600 rounded-full font-medium hover:bg-green-50 transition-all duration-200"
                            >
                              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                              </svg>
                              <span className="text-sm font-medium">WhatsApp</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Mensagens */}
                      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50 min-h-0">
                        <div className="space-y-4">
                          {messages.map((message, index) => {
                            const showDate = index === 0 || 
                              formatDate(messages[index - 1]?.createdAt) !== formatDate(message.createdAt);
                            
                            return (
                              <div key={message.id}>
                                {showDate && (
                                  <div className="text-center my-6">
                                    <span className="bg-white px-4 py-2 rounded-full text-sm text-gray-600 shadow-sm">
                                      {formatDate(message.createdAt)}
                                    </span>
                                  </div>
                                )}
                                <motion.div 
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  className={`flex ${message.isFromMe ? 'justify-end' : 'justify-start'} group`}
                                >
                                  {/* Botão excluir (aparece no hover para mensagens próprias) */}
                                  {message.isFromMe && (
                                    <div className="relative flex items-center mr-2">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setShowDeleteMenu(showDeleteMenu === message.id ? null : message.id);
                                        }}
                                        className="p-1.5 rounded-full hover:bg-gray-200 opacity-0 group-hover:opacity-100 transition-all"
                                        title="Excluir mensagem"
                                      >
                                        <MoreVertical className="w-4 h-4 text-gray-400" />
                                      </button>
                                      {showDeleteMenu === message.id && (
                                        <div 
                                          className="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[140px]"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              deleteMessage(message.id);
                                            }}
                                            disabled={deletingMessageId === message.id}
                                            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 rounded-lg"
                                          >
                                            <Trash2 className="w-4 h-4" />
                                            {deletingMessageId === message.id ? 'Excluindo...' : 'Excluir'}
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                  {(() => {
                                    const text = message.message || '';
                                    const urlRegex = /(https?:\/\/[\w\-._~:\/?#%[\]@!$&'()*+,;=]+)|(www\.[\w\-._~:\/?#%[\]@!$&'()*+,;=]+)/gi;
                                    const onlyUrl = text.trim().match(/^((https?:\/\/)|(www\.))\S+$/i);
                                    const bubbleBase = 'max-w-xs lg:max-w-md px-4 py-3 rounded-2xl';
                                    const bubbleClass = onlyUrl
                                      ? 'bg-transparent text-gray-900'
                                      : (message.isFromMe
                                          ? 'bg-gradient-to-r from-[var(--color1)] to-[var(--color2)] text-white'
                                          : 'bg-white text-gray-900 shadow-sm border border-gray-100');
                                    const timeClass = onlyUrl
                                      ? 'text-gray-400'
                                      : (message.isFromMe ? 'text-blue-100' : 'text-gray-500');
                                    return (
                                      <div className={`${bubbleBase} ${bubbleClass}`}>
                                        <div className="text-sm leading-relaxed break-words space-y-2">
                                          {(() => {
                                            let content = null;
                                            if (!onlyUrl) {
                                              const cleaned = text.replace(urlRegex, '').replace(/\s{2,}/g,' ').trim();
                                              if (cleaned) content = <p>{cleaned}</p>;
                                            }
                                            const previews = [];
                                            const seen = new Set();
                                            let m; while((m = urlRegex.exec(text))){ let u = m[0]; if(u.startsWith('www.')) u='https://'+u; if(seen.has(u)) continue; seen.add(u); previews.push(
                                              <LinkPreview key={u} url={u} preview={linkPreviews[u]} />
                                            ); }
                                            return <>{content}{previews}</>;
                                          })()}
                                        </div>
                                        <p className={`text-xs mt-2 ${timeClass}`}>{formatTime(message.createdAt)}</p>
                                      </div>
                                    );
                                  })()}
                                </motion.div>
                              </div>
                            );
                          })}
                          {/* bottom spacer removed; we now scroll the container directly */}
                        </div>
                      </div>

                      {/* Input de mensagem */}
                      {selectedConversation.isGroup ? (
                        <div className="bg-white border-t border-gray-200 p-4 text-center text-xs text-gray-500 flex-shrink-0">Grupo de {selectedConversation.groupType === 'school' ? 'comunicados da escola' : 'comunicados da turma'} • Somente leitura</div>
                      ) : (
                        <div className="bg-white border-t border-gray-200 p-3 md:p-4 flex-shrink-0">
                          <div className="flex items-center gap-2 md:gap-3">
                            <Input
                              value={newMessage}
                              onChange={(e) => setNewMessage(e.target.value)}
                              placeholder="Digite uma mensagem..."
                              className="flex-1 rounded-xl border-2 border-gray-200 focus:border-[var(--color1)] px-3 md:px-4 py-2 md:py-3 text-sm md:text-base"
                              onKeyPress={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  sendMessage();
                                }
                              }}
                            />
                            <Button 
                              onClick={sendMessage}
                              disabled={!newMessage.trim() || sending}
                              className="bg-gradient-to-r from-[var(--color1)] to-[var(--color2)] hover:from-[var(--color2)] hover:to-[var(--color3)] text-white px-4 md:px-6 py-2 md:py-3 rounded-xl transition-all duration-200 flex-shrink-0"
                            >
                              {sending ? (
                                <div className="w-5 h-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                              ) : (
                                <Send className="w-5 h-5" />
                              )}
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    /* Tela inicial sem conversa selecionada */
                    <div className="flex-1 flex items-center justify-center bg-gray-50">
                      <div className="text-center">
                        <div className="w-24 h-24 bg-gradient-to-br from-[var(--color1)] to-[var(--color2)] rounded-full flex items-center justify-center mx-auto mb-6">
                          <MessageSquare className="w-12 h-12 text-white" />
                        </div>
                        <h2 className="text-2xl font-semibold text-gray-900 mb-3">
                          Selecione uma conversa
                        </h2>
                        <p className="text-gray-600 max-w-md">
                          Escolha uma empresa na lista à esquerda para começar a conversar ou continuar uma conversa existente
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
    </>
  );
};

export default CandidateMessages;
