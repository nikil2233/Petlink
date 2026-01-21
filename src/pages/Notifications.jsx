import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { Bell, Check, Clock, Trash2, AlertCircle, Filter, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Notifications() {
  const { user, session } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all' | 'unread'
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      fetchNotifications();
    } else if (!session) {
       setLoading(false);
    }
  }, [user, session]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id) => {
    try {
      // Optimistic update
      setNotifications(prev => prev.map(n => 
        n.id === id ? { ...n, is_read: true } : n
      ));

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error marking as read:', error);
      // Revert if error? For now, we assume success or user refresh fixes it.
    }
  };

  const markAllAsRead = async () => {
      try {
          const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
          if (unreadIds.length === 0) return;

          // Optimistic update
          setNotifications(prev => prev.map(n => ({...n, is_read: true})));

          const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .in('id', unreadIds);
          
          if (error) throw error;
      } catch (error) {
          console.error("Error marking all as read:", error);
      }
  }

  const deleteNotification = async (id, e) => {
      e.stopPropagation();
      // Store previous state for rollback
      const previousNotifications = [...notifications];

      try {
          // Optimistic delete
          setNotifications(prev => prev.filter(n => n.id !== id));

          const { error } = await supabase
            .from('notifications')
            .delete()
            .eq('id', id);
          
          if (error) throw error;
      } catch (error) {
          console.error("Error deleting notification:", error);
          // Revert optimistic update
          setNotifications(previousNotifications);
          alert("Failed to delete notification. Please try again.");
      }
  }

    const handleNotificationClick = async (notification) => {
      if (!notification.is_read) {
        await markAsRead(notification.id);
      }

      // Navigation Logic
      switch (notification.type) {
        case 'status_change':
          navigate('/my-bookings');
          break;
        case 'alert':
        case 'emergency':
          navigate('/lost-feed');
          break;
        case 'success':
          navigate('/success-stories');
          break;
        default:
          // For generic notifications, just stay or maybe go to home
          break;
      }
    };

    const filteredNotifications = notifications.filter(n => {
        if (filter === 'unread') return !n.is_read;
        return true;
    });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (!session) {
      return (
          <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
              <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl text-center max-w-md border border-slate-100 dark:border-slate-700">
                  <Bell size={48} className="text-primary mx-auto mb-4" />
                  <h2 className="text-2xl font-bold mb-2 text-slate-800 dark:text-white">Notifications</h2>
                  <p className="text-slate-500 dark:text-slate-400 mb-6">Please log in to view your notifications.</p>
                  <button onClick={() => navigate('/auth')} className="btn btn-primary w-full py-3">Login to Continue</button>
              </div>
          </div>
      )
  }

  return (
    <div className="min-h-screen pt-20 pb-12 bg-slate-50 dark:bg-slate-900 transition-colors duration-300 font-sans">
      
      {/* Inline Styles for Animation */}
      <style>{`
        @keyframes slideIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-in {
            animation: slideIn 0.3s ease-out forwards;
        }
      `}</style>
      
      <div className="container mx-auto px-4" style={{ maxWidth: '800px' }}>
        
        {/* Header Section */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
                <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-1 flex items-center gap-2">
                    Notifications
                    {unreadCount > 0 && (
                        <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full animate-pulse">
                            {unreadCount} new
                        </span>
                    )}
                </h1>
                <p className="text-slate-500 dark:text-slate-400">Stay updated with your latest activity</p>
            </div>

            <div className="flex bg-white dark:bg-slate-800 rounded-xl p-1 shadow-sm border border-slate-100 dark:border-slate-700 w-fit">
                <button 
                    onClick={() => setFilter('all')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                        filter === 'all' 
                        ? 'bg-primary text-white shadow-md' 
                        : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                    }`}
                >
                    All
                </button>
                <button 
                    onClick={() => setFilter('unread')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-1 ${
                        filter === 'unread' 
                        ? 'bg-primary text-white shadow-md' 
                        : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                    }`}
                >
                    Unread
                </button>
            </div>
        </div>

        {/* Actions Bar */}
        <div className="flex justify-end mb-4">
            {unreadCount > 0 && (
                 <button 
                    onClick={markAllAsRead}
                    className="group flex items-center gap-2 text-sm font-semibold text-primary hover:text-amber-500 dark:text-primary dark:hover:text-amber-400 transition-all px-4 py-2 rounded-lg hover:bg-white dark:hover:bg-slate-800 hover:shadow-sm"
                >
                    <CheckCircle2 size={16} className="group-hover:scale-110 transition-transform" /> 
                    Mark all as read
                </button>
            )}
        </div>

        {/* Content Section */}
        <div className="flex flex-col gap-3">
            {loading ? (
                // Skeleton Loader
                Array(3).fill(0).map((_, i) => (
                    <div key={i} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex gap-4 animate-pulse">
                        <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                        <div className="flex-1 space-y-2">
                            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                            <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                        </div>
                    </div>
                ))
            ) : filteredNotifications.length === 0 ? (
                <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700">
                    <div className="bg-slate-50 dark:bg-slate-700 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300 dark:text-slate-400">
                        <Bell size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">
                        {filter === 'unread' ? "You're all caught up!" : "No notifications yet"}
                    </h3>
                    <p className="text-slate-400 dark:text-slate-500 max-w-xs mx-auto">
                        {filter === 'unread' 
                            ? "Check 'All' to see your past history." 
                            : "When you receive alerts regarding your reports or appointments, they will appear here."}
                    </p>
                    {filter === 'unread' && (
                        <button onClick={() => setFilter('all')} className="mt-4 text-primary font-medium hover:underline">
                            View all history
                        </button>
                    )}
                </div>
            ) : (
                filteredNotifications.map((notification, index) => (
                    <div 
                        key={notification.id}
                        className={`group relative flex items-start gap-4 p-5 rounded-2xl transition-all duration-300 animate-slide-in border cursor-pointer ${
                            notification.is_read 
                            ? 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600' 
                            : 'bg-white dark:bg-slate-800 border-l-4 border-l-primary shadow-md transform hover:-translate-y-0.5 border-slate-100 dark:border-slate-700'
                        }`}
                        style={{ 
                            animationDelay: `${index * 50}ms`,
                            borderLeftColor: !notification.is_read ? 'var(--primary)' : '' 
                        }}
                        onClick={() => handleNotificationClick(notification)}
                    >
                        {/* Icon */}
                        <div className={`mt-1 flex-shrink-0 p-2.5 rounded-full ${
                            notification.type === 'alert' || notification.type === 'emergency'
                            ? 'bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400' // Urgent/Alert
                            : !notification.is_read 
                                ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500 dark:text-indigo-400' // Unread Normal
                                : 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500' // Read
                        }`}>
                            {notification.type === 'alert' ? <AlertCircle size={20} /> : <Bell size={20} />}
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start">
                                <p className={`text-base pr-8 ${notification.is_read ? 'text-slate-600 dark:text-slate-400' : 'text-slate-900 dark:text-white font-semibold'}`}>
                                    {notification.message}
                                </p>
                            </div>
                            
                            <div className="flex items-center gap-4 mt-2 text-xs font-medium text-slate-400 dark:text-slate-500">
                                <span className="flex items-center gap-1 bg-slate-50 dark:bg-slate-700/50 px-2 py-1 rounded-md">
                                    <Clock size={12} />
                                    {new Date(notification.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} at {new Date(notification.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                {notification.is_read ? (
                                    <span className="text-slate-400 dark:text-slate-600">Seen</span>
                                ) : (
                                    <span className="text-primary">New</span>
                                )}
                            </div>
                        </div>

                        {/* Actions */}
                        <button 
                            onClick={(e) => deleteNotification(notification.id, e)}
                            className="absolute top-4 right-4 p-2 text-slate-300 dark:text-slate-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-all opacity-0 group-hover:opacity-100"
                            title="Delete"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                ))
            )}
        </div>
      </div>
    </div>
  );
}
