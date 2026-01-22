import React, { useState, useEffect, useRef } from 'react';
import { useChat } from '../context/ChatContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';
import { Send, X, MessageCircle, ChevronLeft, User, Search, Camera, Image } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ChatDrawer() {
  const { 
    isOpen, closeChat, activeRecipientId, setActiveRecipientId, 
    conversations, fetchConversations 
  } = useChat();
  const { user } = useAuth();

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);
  const fileInputRef = useRef(null);

  // Fetch messages when active recipient changes
  useEffect(() => {
    if (activeRecipientId && isOpen) {
        fetchMessages(activeRecipientId);
        
        // Subscription for real-time messages in this specific chat
        const channel = supabase
            .channel(`chat:${activeRecipientId}`)
            .on('postgres_changes', { 
                event: 'INSERT', 
                schema: 'public', 
                table: 'messages',
                filter: `sender_id=eq.${activeRecipientId}`, 
            }, payload => {
                if (payload.new.receiver_id === user.id) {
                    setMessages(prev => [...prev, payload.new]);
                    // Mark as read immediately if window is open
                    markAsRead([payload.new.id]);
                }
            })
            .subscribe();

        return () => supabase.removeChannel(channel);
    }
  }, [activeRecipientId, isOpen]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchMessages = async (otherId) => {
    setLoading(true);
    const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true });

    if (!error) {
        setMessages(data || []);
        // Mark unread messages from this user as read
        const unreadIds = data
            .filter(m => m.sender_id === otherId && !m.is_read)
            .map(m => m.id);
        
        if (unreadIds.length > 0) {
            markAsRead(unreadIds);
        }
    }
    setLoading(false);
  };

  const markAsRead = async (ids) => {
      await supabase.from('messages').update({ is_read: true }).in('id', ids);
      fetchConversations(); // Update global badges
  };

  const handleImageSelect = (e) => {
      if (e.target.files && e.target.files[0]) {
          setSelectedImage(e.target.files[0]);
      }
  };

  const sendMessage = async (e) => {
      e.preventDefault();
      if ((!newMessage.trim() && !selectedImage) || !activeRecipientId || isUploading) return;

      setIsUploading(true);
      
      let imageUrl = null;

      // Upload Image if selected
      if (selectedImage) {
          const fileExt = selectedImage.name.split('.').pop();
          const fileName = `chat_${Date.now()}_${Math.random()}.${fileExt}`;
          const { error: uploadError } = await supabase.storage
              .from('lost-pets') // Using existing bucket
              .upload(fileName, selectedImage);

          if (uploadError) {
              console.error("Error uploading image:", uploadError);
              alert("Failed to upload image.");
              setIsUploading(false);
              return;
          }

          const { data: publicUrlData } = supabase.storage
              .from('lost-pets')
              .getPublicUrl(fileName);
          
          imageUrl = publicUrlData.publicUrl;
      }

      const optimisticMsg = {
          id: 'temp-' + Date.now(),
          sender_id: user.id,
          receiver_id: activeRecipientId,
          content: newMessage,
          image_url: imageUrl ? URL.createObjectURL(selectedImage) : null, // Temp preview
          created_at: new Date().toISOString(),
          is_read: false
      };

      setMessages(prev => [...prev, optimisticMsg]);
      setNewMessage('');
      setSelectedImage(null);

      const payload = {
          sender_id: user.id,
          receiver_id: activeRecipientId,
          content: optimisticMsg.content,
          image_url: imageUrl
      };

      const { data, error } = await supabase.from('messages').insert(payload).select().single();

      if (error) {
          console.error("Error sending message:", error);
          // Rollback or show error (simplified here)
      } else {
          // Replace temp ID and real URL
          setMessages(prev => prev.map(m => m.id === optimisticMsg.id ? data : m));
          fetchConversations(); // Update list order
      }
      setIsUploading(false);
  };

  // Get active user profile from conversations list or fetch it if new
  const activeProfile = conversations.find(c => c.userId === activeRecipientId)?.profile || { full_name: 'Chat', role: 'User' };
  
  // If we opened a chat with someone NOT in our list (new chat), we might need to fetch their name. 
  // Ideally passed via openChat, but for now we fallback.
  useEffect(() => {
      if (activeRecipientId && !conversations.find(c => c.userId === activeRecipientId)) {
        // Fetch profile? For MVP, we'll try to rely on what we have or just show generic
      }
  }, [activeRecipientId, conversations]);


  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeChat}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[90]"
          />

          {/* Drawer */}
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-full sm:w-[450px] bg-white dark:bg-slate-900 shadow-2xl z-[100] border-l border-slate-200 dark:border-slate-800 flex flex-col"
          >
            {/* Header */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white/50 dark:bg-slate-900/50 backdrop-blur-md sticky top-0">
                {activeRecipientId ? (
                    <div className="flex items-center gap-3">
                        <button onClick={() => setActiveRecipientId(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
                            <ChevronLeft size={20} className="text-slate-600 dark:text-slate-300" />
                        </button>
                        <div className="relative">
                            <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden">
                                {activeProfile.avatar_url ? (
                                    <img src={activeProfile.avatar_url} className="w-full h-full object-cover" />
                                ) : (
                                    <User className="w-full h-full p-2 text-slate-400" />
                                )}
                            </div>
                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-slate-900"></div>
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800 dark:text-white leading-tight">{activeProfile.full_name || 'User'}</h3>
                            <p className="text-xs text-slate-500 capitalize">{activeProfile.role || 'Member'}</p>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center gap-3">
                         <div className="p-2 bg-rose-100 dark:bg-rose-900/30 rounded-xl text-rose-600 dark:text-rose-400">
                             <MessageCircle size={24} />
                         </div>
                         <h2 className="text-xl font-black text-slate-800 dark:text-white">Messages</h2>
                    </div>
                )}
                
                <button onClick={closeChat} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 hover:text-slate-800 transition-colors">
                    <X size={24} />
                </button>
            </div>

            {/* List View */}
            {!activeRecipientId && (
                <div className="flex-1 overflow-y-auto p-2">
                    {conversations.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center p-8 text-slate-400">
                            <MessageCircle size={48} className="mb-4 opacity-20" />
                            <p>No messages yet.</p>
                            <p className="text-sm mt-2">Start a chat from a lost pet report.</p>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {conversations.map(convo => (
                                <button 
                                    key={convo.userId} 
                                    onClick={() => setActiveRecipientId(convo.userId)}
                                    className="w-full text-left p-4 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex gap-4 group"
                                >
                                    <div className="relative shrink-0">
                                        <div className="w-12 h-12 rounded-full bg-slate-200 overflow-hidden">
                                            {convo.profile?.avatar_url ? (
                                                <img src={convo.profile.avatar_url} className="w-full h-full object-cover" />
                                            ) : (
                                                <User className="w-full h-full p-3 text-slate-400" />
                                            )}
                                        </div>
                                        {convo.unread > 0 && (
                                            <div className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-sm">
                                                {convo.unread}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start mb-1">
                                            <h4 className="font-bold text-slate-800 dark:text-white truncate group-hover:text-rose-600 transition-colors">
                                                {convo.profile?.full_name || 'User'}
                                            </h4>
                                            <span className="text-[10px] text-slate-400 font-medium">
                                                {new Date(convo.lastMessage.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <p className={`text-sm truncate ${convo.unread > 0 ? 'font-bold text-slate-800 dark:text-slate-200' : 'text-slate-500'}`}>
                                            {convo.lastMessage.sender_id === user.id && <span className="text-slate-400 font-normal">You: </span>}
                                            {convo.lastMessage.content}
                                        </p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Chat View */}
            {activeRecipientId && (
                <>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-900/50" ref={scrollRef}>
                        {messages.map((msg, idx) => {
                            const isMe = msg.sender_id === user.id;
                            const isLast = idx === messages.length - 1;
                            
                            return (
                                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[75%] rounded-2xl p-4 shadow-sm ${
                                        isMe 
                                            ? 'bg-rose-500 text-white rounded-br-none' 
                                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-bl-none'
                                    }`}>
                                        {msg.image_url && (
                                            <div className="mb-2 rounded-lg overflow-hidden">
                                                <img src={msg.image_url} alt="Shared" className="w-[200px] h-auto object-cover" />
                                            </div>
                                        )}
                                        {msg.content && <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>}
                                        <div className={`text-[10px] mt-1 flex items-center gap-1 opacity-70 ${isMe ? 'justify-end text-rose-100' : 'text-slate-400'}`}>
                                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        {loading && <div className="text-center text-xs text-slate-400">Loading history...</div>}
                    </div>

                    <form onSubmit={sendMessage} className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
                        {selectedImage && (
                            <div className="flex items-center gap-2 mb-2 p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
                                <div className="w-12 h-12 rounded-lg overflow-hidden relative">
                                    <img src={URL.createObjectURL(selectedImage)} className="w-full h-full object-cover" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{selectedImage.name}</p>
                                    <p className="text-[10px] text-slate-400">Ready to send</p>
                                </div>
                                <button type="button" onClick={() => setSelectedImage(null)} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-400">
                                    <X size={16} />
                                </button>
                            </div>
                        )}
                        <div className="flex gap-2 items-end">
                             <button 
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="p-3 mb-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-xl transition-colors"
                             >
                                <Camera size={20} />
                             </button>
                             <input 
                                type="file" 
                                ref={fileInputRef} 
                                className="hidden" 
                                accept="image/*"
                                onChange={handleImageSelect}
                             />
                             <textarea 
                                value={newMessage}
                                onChange={e => setNewMessage(e.target.value)}
                                onKeyDown={e => {
                                    if(e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        sendMessage(e);
                                    }
                                }}
                                placeholder="Type a message..."
                                className="flex-1 bg-slate-100 dark:bg-slate-800 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-rose-500 outline-none text-slate-700 dark:text-white resize-none min-h-[46px] max-h-32"
                                rows={1}
                             />
                             <button 
                                type="submit" 
                                disabled={(!newMessage.trim() && !selectedImage) || isUploading}
                                className="p-3 mb-1 bg-rose-500 text-white rounded-xl hover:bg-rose-600 disabled:opacity-50 disabled:hover:bg-rose-500 transition-colors"
                             >
                                 {isUploading ? <div className="animate-spin w-5 h-5 border-2 border-white/30 border-t-white rounded-full" /> : <Send size={20} />}
                             </button>
                        </div>
                    </form>
                </>
            )}

          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
