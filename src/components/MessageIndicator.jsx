import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { messages as messagesAPI } from '@/lib/api';

const MessageIndicator = ({ className = '' }) => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchUnreadCount = async () => {
      if (user && user.type === 'candidate') {
        try {
          const response = await messagesAPI.getUnreadCount();
          setUnreadCount(response.count);
        } catch (error) {
          console.error('Erro ao buscar contagem de mensagens:', error);
        }
      }
    };

    fetchUnreadCount();

    // Verificar periodicamente por novas mensagens (a cada 30 segundos)
    const interval = setInterval(fetchUnreadCount, 30000);

    return () => clearInterval(interval);
  }, [user]);

  if (!user || user.type !== 'candidate') {
    return null;
  }

  return (
    <Link 
      to="/my-messages" 
      className={`flex items-center space-x-1 px-4 py-2 rounded-full transition-all duration-300 font-medium ${className}`}
    >
      <div className="relative">
        <MessageSquare className="w-4 h-4" />
        {unreadCount > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center text-xs p-0 min-w-[20px]"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </Badge>
        )}
      </div>
      <span>Mensagens</span>
    </Link>
  );
};

export default MessageIndicator;
