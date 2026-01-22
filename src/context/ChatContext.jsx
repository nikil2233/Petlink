import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from './AuthContext';

const ChatContext = createContext();

export function useChat() {
  return useContext(ChatContext);
}

export function ChatProvider({ children }) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [activeRecipientId, setActiveRecipientId] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Load conversations list
  useEffect(() => {
    if (!user) {
        setConversations([]);
        return;
    }

    fetchConversations();
    
    // Subscribe to new messages
    const channel = supabase
      .channel('public:messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${user.id}` }, payload => {
          // Refresh list or optimistic update
          fetchConversations();
          setUnreadCount(prev => prev + 1);
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [user]);

  const fetchConversations = async () => {
    if (!user) return;
    try {
        // Fetch all messages where user is sender or receiver
        // This is a naive approach; for production, you'd want a separate 'conversations' table or smarter query
        // We'll group by "other user" on client side for now to keep DB simple for MVP
        const { data, error } = await supabase
            .from('messages')
            .select(`
                *,
                sender:sender_id(full_name, avatar_url, role),
                receiver:receiver_id(full_name, avatar_url, role)
            `)
            .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Group by the "other" person
        const grouped = {};
        data.forEach(msg => {
            const otherId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
            const otherProfile = msg.sender_id === user.id ? msg.receiver : msg.sender;
            
            if (!grouped[otherId]) {
                grouped[otherId] = {
                    userId: otherId,
                    profile: otherProfile,
                    lastMessage: msg,
                    unread: 0
                };
            }
            if (msg.receiver_id === user.id && !msg.is_read) {
                grouped[otherId].unread++;
            }
        });

        // Convert to array and sort by last message date
        const convos = Object.values(grouped).sort((a, b) => 
            new Date(b.lastMessage.created_at) - new Date(a.lastMessage.created_at)
        );

        setConversations(convos);
        const totalUnread = convos.reduce((acc, curr) => acc + curr.unread, 0);
        setUnreadCount(totalUnread);

    } catch (err) {
        console.error("Error fetching conversations:", err);
    }
  };

  const openChat = (recipientId) => {
    setActiveRecipientId(recipientId);
    setIsOpen(true);
  };

  const closeChat = () => {
    setIsOpen(false);
    setActiveRecipientId(null);
  };

  const value = {
    isOpen,
    setIsOpen,
    activeRecipientId,
    setActiveRecipientId,
    openChat,
    closeChat,
    conversations,
    unreadCount,
    fetchConversations
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
}
