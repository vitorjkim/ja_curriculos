import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet';
import { 
  MessageSquare, 
  Send, 
  User,
  ArrowLeft,
  MoreVertical,
  Phone,
  Video
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/use-toast';
import { chatAPI } from '@/lib/api';

const CompanyMessages = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  // Carregar conversas
  const loadConversations = async () => {
    try {
      const response = await chatAPI.getConversations();
      setConversations(response);
    } catch (error) {
      console.error('Erro ao carregar conversas:', error);
      toast({
        title: 'Erro ao carregar conversas',
        description: 'Não foi possível carregar suas conversas.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Carregar mensagens de uma conversa
  const loadMessages = async (conversationId) => {
    try {
      const response = await chatAPI.getMessages(conversationId);
      setMessages(response);
      
      // Marcar mensagens como lidas
      const unreadMessages = response.filter(msg => !msg.isFromMe && !msg.readAt);
      for (const msg of unreadMessages) {
        try {
          await chatAPI.markMessageAsRead(msg.id);
        } catch (error) {
          console.error('Erro ao marcar mensagem como lida:', error);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
      toast({
        title: 'Erro ao carregar mensagens',
        description: 'Não foi possível carregar as mensagens desta conversa.',
        variant: 'destructive'
      });
    }
  };

  // Enviar mensagem
  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || sending) return;

    try {
      setSending(true);
      const message = await chatAPI.sendMessage(selectedConversation.id, newMessage.trim());
      setMessages(prev => [...prev, message]);
      setNewMessage('');
      
      // Atualizar a última mensagem da conversa
      setConversations(prev => prev.map(conv => 
        conv.id === selectedConversation.id 
          ? { ...conv, lastMessage: newMessage.trim(), lastMessageAt: new Date().toISOString() }
          : conv
      ));
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      toast({
        title: 'Erro ao enviar mensagem',
        description: 'Não foi possível enviar sua mensagem.',
        variant: 'destructive'
      });
    } finally {
      setSending(false);
    }
  };

  // Selecionar conversa
  const selectConversation = (conversation) => {
    setSelectedConversation(conversation);
    loadMessages(conversation.id);
  };

  // Scroll para a última mensagem
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (user && user.type === 'company') {
      loadConversations();
    }
  }, [user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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

  if (!user || user.type !== 'company') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="p-6 text-center">
            <p>Acesso restrito a empresas.</p>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <>
      <Helmet>
        <title>Mensagens - CurrículoJá</title>
        <meta name="description" content="Converse com candidatos" />
      </Helmet>

      <div className="h-screen flex bg-gray-100">
        {/* Sidebar de conversas */}
        <div className={`${selectedConversation ? 'hidden md:flex' : 'flex'} w-full md:w-1/3 lg:w-1/4 bg-white border-r border-gray-200 flex-col`}>
          {/* Header da sidebar */}
          <div className="p-4 border-b border-gray-200 bg-[var(--color1)]">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-bold text-white">Mensagens</h1>
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/20">
                <MoreVertical className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Lista de conversas */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color1)] mx-auto"></div>
                <p className="mt-2 text-gray-500">Carregando conversas...</p>
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-4 text-center">
                <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">Nenhuma conversa ainda</p>
                <p className="text-sm text-gray-400 mt-1">
                  Quando candidatos se interessarem por suas vagas, você verá as conversas aqui
                </p>
              </div>
            ) : (
              conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  onClick={() => selectConversation(conversation)}
                  className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                    selectedConversation?.id === conversation.id ? 'bg-blue-50 border-r-4 border-r-[var(--color1)]' : ''
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-gray-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-gray-900 truncate">
                          {conversation.contactName || 'Candidato'}
                        </h3>
                        {conversation.lastMessageAt && (
                          <span className="text-xs text-gray-500">
                            {formatTime(conversation.lastMessageAt)}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 truncate mt-1">
                        {conversation.lastMessage || 'Comece uma conversa...'}
                      </p>
                      {conversation.unreadCount > 0 && (
                        <div className="flex justify-end mt-1">
                          <span className="bg-[var(--color1)] text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                            {conversation.unreadCount}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Chat área */}
        <div className={`${selectedConversation ? 'flex' : 'hidden md:flex'} flex-1 flex-col bg-gray-50`}>
          {selectedConversation ? (
            <>
              {/* Header do chat */}
              <div className="bg-white border-b border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="md:hidden"
                      onClick={() => setSelectedConversation(null)}
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-gray-600" />
                    </div>
                    <div>
                      <h2 className="font-medium text-gray-900">
                        {selectedConversation.contactName || 'Candidato'}
                      </h2>
                      <p className="text-sm text-gray-500">Online</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="ghost" size="sm">
                      <Phone className="w-5 h-5" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Video className="w-5 h-5" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Mensagens */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message, index) => {
                  const showDate = index === 0 || 
                    formatDate(messages[index - 1]?.createdAt) !== formatDate(message.createdAt);
                  
                  return (
                    <div key={message.id}>
                      {showDate && (
                        <div className="text-center my-4">
                          <span className="bg-white px-3 py-1 rounded-full text-sm text-gray-500 shadow">
                            {formatDate(message.createdAt)}
                          </span>
                        </div>
                      )}
                      <div className={`flex ${message.isFromMe ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          message.isFromMe 
                            ? 'bg-[var(--color1)] text-white' 
                            : 'bg-white text-gray-900 shadow'
                        }`}>
                          <p className="text-sm">{message.message}</p>
                          <p className={`text-xs mt-1 ${
                            message.isFromMe ? 'text-blue-100' : 'text-gray-500'
                          }`}>
                            {formatTime(message.createdAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input de mensagem */}
              <div className="bg-white border-t border-gray-200 p-4">
                <div className="flex items-center space-x-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Digite uma mensagem..."
                    className="flex-1"
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
                    className="bg-[var(--color1)] hover:bg-[var(--color1)]/90 text-white"
                  >
                    {sending ? (
                      <div className="w-5 h-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            /* Tela inicial sem conversa selecionada */
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h2 className="text-xl font-medium text-gray-900 mb-2">
                  Selecione uma conversa
                </h2>
                <p className="text-gray-500">
                  Escolha um candidato na lista para começar a conversar
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default CompanyMessages;
