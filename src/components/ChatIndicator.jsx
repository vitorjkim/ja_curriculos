import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { chat as chatAPI } from '@/lib/api';

// Indicador de mensagens de chat (conversas) para empresa ou candidato
const ChatIndicator = ({ className = '' }) => {
  const { user } = useAuth();
  const location = useLocation();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    const fetch = async () => {
      if (!user) return;
      try {
        const conversations = await chatAPI.getConversations();
        const totalUnread = conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
        setUnread(totalUnread);
      } catch (e) {
        console.error('Erro ao buscar conversas para indicador:', e);
      }
    };
    fetch();
    const interval = setInterval(fetch, 30000);
    return () => clearInterval(interval);
  }, [user]);

  if (!user) return null;

  const active = location.pathname.includes('-messages');

  return (
    <Link
      to={user.type === 'company' ? '/company-messages' : '/candidate-messages'}
      className={`flex items-center space-x-1 px-4 py-2 rounded-full transition-all duration-300 font-medium ${
        active
          ? 'text-blue-600 bg-blue-50 shadow-sm border-2 border-blue-200'
          : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
      } ${className}`}
    >
      <div className="relative">
        <MessageSquare className="w-4 h-4" />
        {unread > 0 && (
          <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center text-xs p-0 min-w-[20px]">
            {unread > 9 ? '9+' : unread}
          </Badge>
        )}
      </div>
      <span>Chat</span>
    </Link>
  );
};

export default ChatIndicator;
