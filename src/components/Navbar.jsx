import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { 
  Menu, X, Heart, LogOut, Stethoscope, 
  MapPin, Calendar, ChevronDown, Bell, 
  PawPrint, Home, Megaphone, Activity, 
  User, Dog, AlertTriangle, Clipboard, MessageCircle, Shield, BadgeCheck, Sun, Moon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChat } from '../context/ChatContext';

export default function Navbar() {
  const { session, user, role: userRole, signOut, profile } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { setIsOpen: setIsOpenChat, unreadCount } = useChat();
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Notification Logic
  useEffect(() => {
    if (user) {
        fetchNotifications(user.id);
        const channel = supabase
          .channel('public:notifications')
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, payload => {
              setNotifications(prev => [payload.new, ...prev]);
          })
          .subscribe();
        return () => supabase.removeChannel(channel);
    } else {
        setNotifications([]);
    }
  }, [user]);

  const fetchNotifications = async (userId) => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .eq('is_read', false)
        .order('created_at', { ascending: false });
      setNotifications(data || []);
  };

  const markAsRead = async (id) => {
      const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id);
      if (error) {
          console.error("Error marking notification as read:", error);
      } else {
          setNotifications(prev => prev.filter(n => n.id !== id));
      }
  };

  const handleLogout = async () => {
    try {
        await signOut();
        setNotifications([]);
        navigate('/');
    } catch (error) {
        console.error("Error logging out:", error);
    }
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-50 w-full">
      <div className="w-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md shadow-lg border-b border-slate-200 dark:border-slate-800 px-6 py-3 flex justify-between items-center transition-all duration-300">
        
        {/* LOGO */}
        <Link to="/" className="flex items-center gap-2 group">
           <div className="relative flex items-center justify-center w-10 h-10">
              <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className="relative z-10"
              >
                  <Shield size={36} className="text-rose-600 dark:text-rose-500 fill-rose-100 dark:fill-rose-900/30 drop-shadow-sm" />
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring" }}
                    className="absolute inset-0 flex items-center justify-center pt-1"
                  >
                      <PawPrint size={18} className="text-rose-600 dark:text-rose-400 fill-current" />
                  </motion.div>
                  
                  {/* Pulse Effect */}
                  <div className="absolute inset-0 bg-rose-500/20 rounded-full blur-xl -z-10 animate-pulse"></div>
              </motion.div>
           </div>
          
          <div className="hidden sm:flex flex-col">
            <span className="text-2xl font-black text-slate-800 dark:text-white tracking-tighter leading-none flex items-center gap-0.5">
              Pet<span className="text-rose-600 dark:text-rose-500">Link</span>
            </span>
          </div>
        </Link>

        {/* DESKTOP MENU */}
        <div className="hidden md:flex items-center gap-1">
          <NavPill to="/" active={isActive('/')} icon={Home}>Home</NavPill>
          <NavPill to="/notify" active={isActive('/notify')} icon={Megaphone}>Notify</NavPill>
          <NavPill to="/lost-and-found" active={isActive('/lost-and-found')} icon={AlertTriangle}>Lost & Found</NavPill>
          {userRole === 'shelter' ? (
              <NavPill to="/shelter-dashboard" active={isActive('/shelter-dashboard')} icon={Home}>Dashboard</NavPill>
          ) : (
              <NavPill to="/rescuer-feed" active={isActive('/rescuer-feed')} icon={Activity}>Rescuer Feed</NavPill>
          )}
          <NavPill to="/success-stories" active={isActive('/success-stories')} icon={Heart}>Success Stories</NavPill>
          
          {['rescuer', 'shelter', 'vet'].includes(userRole) ? (
            <DropdownPill 
                active={isActive('/adopt') || isActive('/adoption-requests')} 
                label="Adoption" 
                icon={Dog}
            >
                <Link to="/adopt" className="block px-4 py-2 text-slate-700 dark:text-slate-200 hover:bg-rose-50 dark:hover:bg-slate-700 hover:text-rose-600 rounded-lg text-sm font-medium transition-colors">Browse Pets</Link>
                <Link to="/adoption-requests" className="block px-4 py-2 text-slate-700 dark:text-slate-200 hover:bg-rose-50 dark:hover:bg-slate-700 hover:text-rose-600 rounded-lg text-sm font-medium transition-colors">Requests</Link>
            </DropdownPill>
          ) : (
            <NavPill to="/adopt" active={isActive('/adopt')} icon={Dog}>Adopt</NavPill>
          )}
          
          {!['rescuer', 'shelter', 'vet'].includes(userRole) && (
            <DropdownPill 
                active={isActive('/book-appointment') || isActive('/find-vet') || isActive('/my-bookings')} 
                label="Care" 
                icon={Heart}
            >
                <Link to="/book-appointment" className="block px-4 py-2 text-slate-700 dark:text-slate-200 hover:bg-rose-50 dark:hover:bg-slate-700 hover:text-rose-600 rounded-lg text-sm font-medium transition-colors">Book Appt.</Link>
                <Link to="/find-vet" className="block px-4 py-2 text-slate-700 dark:text-slate-200 hover:bg-rose-50 dark:hover:bg-slate-700 hover:text-rose-600 rounded-lg text-sm font-medium transition-colors">Find Vet</Link>
                <Link to="/my-bookings" className="block px-4 py-2 text-slate-700 dark:text-slate-200 hover:bg-rose-50 dark:hover:bg-slate-700 hover:text-rose-600 rounded-lg text-sm font-medium transition-colors">My Bookings</Link>
            </DropdownPill>
          )}

          {userRole === 'vet' && (
             <NavPill to="/vet-appointments" active={isActive('/vet-appointments')} icon={Stethoscope}>Dashboard</NavPill>
          )}

          {userRole === 'admin' && (
             <NavPill to="/admin" active={isActive('/admin')} icon={Shield}>Admin</NavPill>
          )}
        </div>

        {/* RIGHT SIDE ACTIONS */}
        <div className="flex items-center gap-3">
            {/* Verification Warning (For Pro Roles) */}
            {/* Verification Warning (For Pro Roles) */}
            {['vet', 'rescuer', 'shelter'].includes(userRole) && profile && !profile.is_verified && (
                profile.verification_status === 'submitted' ? (
                    <Link 
                        to="/verify-account"
                        className="hidden md:flex items-center gap-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 px-3 py-1.5 rounded-full text-xs font-bold ring-1 ring-blue-500/20 hover:bg-blue-500 hover:text-white transition-all"
                    >
                        <Activity size={14} className="animate-pulse" /> Verification Pending
                    </Link>
                ) : (
                    <Link 
                        to="/verify-account"
                        className="hidden md:flex items-center gap-2 bg-amber-500/10 text-amber-600 dark:text-amber-500 px-3 py-1.5 rounded-full text-xs font-bold ring-1 ring-amber-500/20 hover:bg-amber-500 hover:text-white transition-all"
                    >
                        <AlertTriangle size={14} /> Verify Account
                    </Link>
                )
            )}
            {/* Theme Toggle */}
            <button 
                onClick={toggleTheme}
                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-amber-500 dark:hover:text-amber-400 transition-colors"
                title="Toggle Theme"
            >
                {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            {session ? (
                <>
                   {/* CHAT */}
                   <button 
                     onClick={() => setIsOpenChat(true)}
                     className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-all relative"
                   >
                       <MessageCircle size={20} />
                       {unreadCount > 0 && (
                           <span className="absolute top-1 right-1 bg-rose-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-sm">
                               {unreadCount}
                           </span>
                       )}
                   </button>

                   {/* NOTIFICATIONS */}
                   <div className="relative">
                       <button 
                         onClick={() => setShowNotifications(!showNotifications)}
                         className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-all relative"
                       >
                           <Bell size={20} />
                           {notifications.length > 0 && (
                               <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-sm">
                                   {notifications.length}
                               </span>
                           )}
                       </button>

                       <AnimatePresence>
                           {showNotifications && (
                               <motion.div 
                                   initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                   animate={{ opacity: 1, y: 0, scale: 1 }}
                                   exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                   className="fixed top-20 left-4 right-4 md:absolute md:top-full md:left-auto md:right-0 md:w-80 md:mt-4 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden z-50 origin-top-right"
                               >
                                   <div className="bg-slate-50 dark:bg-slate-900 px-4 py-3 border-b border-slate-100 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-300 text-sm">
                                       Notifications
                                   </div>
                                   <div className="max-h-64 overflow-y-auto">
                                       {notifications.length === 0 ? (
                                           <div className="p-4 text-center text-slate-400 text-sm">No new notifications</div>
                                       ) : (
                                           notifications.map(n => (
                                               <div key={n.id} 
                                                    onClick={() => {
                                                        markAsRead(n.id);
                                                        if (n.link) {
                                                            navigate(n.link);
                                                        } else if(n.type === 'appointment_request' && userRole === 'vet') {
                                                            navigate('/vet-appointments');
                                                        }
                                                        setShowNotifications(false);
                                                    }}
                                                    className="p-4 border-b border-slate-50 dark:border-slate-700 hover:bg-rose-50 dark:hover:bg-slate-700 cursor-pointer transition-colors"
                                               >
                                                   <p className="text-sm text-slate-600 dark:text-slate-100 mb-1 font-medium">{n.message}</p>
                                                   <span className="text-xs text-slate-400 dark:text-slate-500">{new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                               </div>
                                           ))
                                       )}
                                   </div>
                                   <Link to="/notifications" onClick={() => setShowNotifications(false)} className="block p-3 text-center text-rose-500 hover:bg-slate-50 dark:hover:bg-slate-700 font-bold text-sm bg-slate-50/50 dark:bg-slate-900/50 dark:border-t dark:border-slate-700">
                                       View All
                                   </Link>
                               </motion.div>
                           )}
                       </AnimatePresence>
                   </div>

                   {/* PROFILE */}
                   <Link to="/profile" className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-rose-100 dark:hover:bg-rose-900/30 hover:text-rose-600 dark:hover:text-rose-400 transition-colors overflow-hidden border border-slate-200 dark:border-slate-700">
                        {user?.avatar_url ? (
                            <img src={user.avatar_url} alt="User" className="w-full h-full object-cover" />
                        ) : (
                            <User size={18} />
                        )}
                        {profile?.is_verified && (
                            <div className="absolute -bottom-1 -right-1 bg-white dark:bg-slate-900 rounded-full p-0.5">
                                <BadgeCheck size={14} className="text-blue-500 fill-blue-50" />
                            </div>
                        )}
                   </Link>

                   <button onClick={handleLogout} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-rose-500 transition-colors" title="Logout">
                       <LogOut size={18} />
                   </button>
                </>
            ) : (
                <Link to="/auth" className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-5 py-2 rounded-full font-bold text-sm hover:bg-slate-800 dark:hover:bg-slate-200 hover:shadow-lg hover:shadow-slate-200 dark:hover:shadow-slate-900/20 transition-all">
                    Login
                </Link>
            )}

            {/* MOBILE TOGGLE */}
            <button className="md:hidden p-2 text-slate-600 dark:text-slate-300" onClick={() => setIsOpen(!isOpen)}>
                {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
        </div>
      </div>

      {/* MOBILE MENU */}
      <AnimatePresence>
          {isOpen && (
            <motion.div 
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                className="md:hidden absolute top-20 left-4 right-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-[2rem] shadow-2xl border border-white/50 dark:border-slate-700 p-4 z-40 overflow-hidden"
            >
                <div className="flex flex-col gap-2">
                    <MobileLink to="/" onClick={() => setIsOpen(false)} icon={Home}>Home</MobileLink>
                    <MobileLink to="/notify" onClick={() => setIsOpen(false)} icon={Megaphone}>Notify Rescuer</MobileLink>
                    <MobileLink to="/lost-and-found" onClick={() => setIsOpen(false)} icon={AlertTriangle}>Lost & Found</MobileLink>
                    <MobileLink to="/rescuer-feed" onClick={() => setIsOpen(false)} icon={Activity}>Rescuer Feed</MobileLink>
                    <MobileLink to="/adopt" onClick={() => setIsOpen(false)} icon={Dog}>Adoption Center</MobileLink>
                    
                    {!['rescuer', 'shelter', 'vet'].includes(userRole) && (
                        <>
                            <div className="h-px bg-slate-100 dark:bg-slate-800 my-2" />
                            <MobileLink to="/book-appointment" onClick={() => setIsOpen(false)} icon={Calendar}>Book Appointment</MobileLink>
                            <MobileLink to="/find-vet" onClick={() => setIsOpen(false)} icon={MapPin}>Find Vet</MobileLink>
                            <MobileLink to="/my-bookings" onClick={() => setIsOpen(false)} icon={Heart}>My Bookings</MobileLink>
                        </>
                    )}

                    {userRole === 'vet' && (
                         <MobileLink to="/vet-appointments" onClick={() => setIsOpen(false)} icon={Stethoscope}>Vet Dashboard</MobileLink>
                    )}

                    {['rescuer', 'shelter', 'vet'].includes(userRole) && (
                         <MobileLink to="/adoption-requests" onClick={() => setIsOpen(false)} icon={Clipboard}>Adoption Requests</MobileLink>
                    )}

                    {userRole === 'admin' && (
                         <MobileLink to="/admin" onClick={() => setIsOpen(false)} icon={Shield}>Admin Dashboard</MobileLink>
                    )}

                    {session ? (
                         <>
                            <div className="h-px bg-slate-100 dark:bg-slate-800 my-2" />
                            <MobileLink to="/profile" onClick={() => setIsOpen(false)} icon={User}>My Profile</MobileLink>
                            <button onClick={handleLogout} className="w-full text-left p-4 rounded-xl text-slate-500 dark:text-slate-400 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-3">
                                <LogOut size={20} /> Logout
                            </button>
                         </>
                    ) : (
                         <MobileLink to="/auth" onClick={() => setIsOpen(false)} icon={User}>Login / Join</MobileLink>
                    )}
                </div>
            </motion.div>
          )}
      </AnimatePresence>
    </nav>
  );
}

// Sub-components for cleaner code
const NavPill = ({ to, children, active, icon: Icon }) => (
    <Link to={to} className={`relative px-4 py-2 rounded-full flex items-center gap-2 text-sm font-bold transition-all ${active ? 'text-rose-600 bg-rose-50 dark:bg-rose-900/30' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
        <Icon size={16} className={active ? "text-rose-500" : "text-slate-400"} />
        {children}
        {active && (
            <motion.div layoutId="navbar-paw" className="absolute -bottom-1 left-0 right-0 flex justify-center">
                <PawPrint size={10} className="text-rose-500 fill-rose-500" />
            </motion.div>
        )}
    </Link>
);

const DropdownPill = ({ active, label, icon: Icon, children }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div 
            className="relative" 
            onMouseEnter={() => setIsOpen(true)}
            onMouseLeave={() => setIsOpen(false)}
        >
            <button className={`relative px-4 py-2 rounded-full flex items-center gap-2 text-sm font-bold transition-all ${active ? 'text-rose-600 bg-rose-50 dark:bg-rose-900/30' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                <Icon size={16} className={active ? "text-rose-500" : "text-slate-400"} />
                {label} <ChevronDown size={14} />
                {active && (
                    <motion.div layoutId="navbar-paw" className="absolute -bottom-1 left-0 right-0 flex justify-center">
                        <PawPrint size={10} className="text-rose-500 fill-rose-500" />
                    </motion.div>
                )}
            </button>
            
            <AnimatePresence>
                {isOpen && (
                    <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-48 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 p-2 z-50"
                    >
                        {children}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

const MobileLink = ({ to, onClick, icon: Icon, children }) => (
    <Link to={to} onClick={onClick} className="p-4 rounded-xl text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-3">
        <Icon size={20} className="text-slate-400" />
        {children}
    </Link>
);
