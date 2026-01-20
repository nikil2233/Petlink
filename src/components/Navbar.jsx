import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { 
  Menu, X, Heart, LogOut, Stethoscope, 
  MapPin, Calendar, ChevronDown, Bell, 
  PawPrint, Home, Megaphone, Activity, 
  User, Dog, AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Navbar() {
  const { session, user, role: userRole, signOut } = useAuth();
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
      await supabase.from('notifications').update({ is_read: true }).eq('id', id);
      setNotifications(prev => prev.filter(n => n.id !== id));
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
    <nav className="fixed top-4 left-0 right-0 z-50 px-4">
      <div className="max-w-7xl mx-auto bg-white/90 backdrop-blur-md rounded-full shadow-lg border border-white/50 px-6 py-3 flex justify-between items-center transition-all duration-300">
        
        {/* LOGO */}
        <Link to="/" className="flex items-center gap-2 group">
          <div className="bg-gradient-to-br from-rose-500 to-orange-500 p-2 rounded-full shadow-md transform group-hover:rotate-12 transition-transform">
            <PawPrint size={20} fill="white" className="text-white" />
          </div>
          <span className="text-xl font-black bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent tracking-tight hidden sm:block">
            PetLink
          </span>
        </Link>

        {/* DESKTOP MENU */}
        <div className="hidden md:flex items-center gap-1">
          <NavPill to="/" active={isActive('/')} icon={Home}>Home</NavPill>
          <NavPill to="/notify" active={isActive('/notify')} icon={Megaphone}>Notify</NavPill>
          <NavPill to="/lost-and-found" active={isActive('/lost-and-found')} icon={AlertTriangle}>Lost & Found</NavPill>
          <NavPill to="/rescuer-feed" active={isActive('/rescuer-feed')} icon={Activity}>Rescuer Feed</NavPill>
          <NavPill to="/success-stories" active={isActive('/success-stories')} icon={Heart}>Success Stories</NavPill>
          
          {['rescuer', 'shelter', 'vet'].includes(userRole) ? (
            <DropdownPill 
                active={isActive('/adopt') || isActive('/adoption-requests')} 
                label="Adoption" 
                icon={Dog}
            >
                <Link to="/adopt" className="block px-4 py-2 text-slate-700 hover:bg-rose-50 hover:text-rose-600 rounded-lg text-sm font-medium transition-colors">Browse Pets</Link>
                <Link to="/adoption-requests" className="block px-4 py-2 text-slate-700 hover:bg-rose-50 hover:text-rose-600 rounded-lg text-sm font-medium transition-colors">Requests</Link>
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
                <Link to="/book-appointment" className="block px-4 py-2 text-slate-700 hover:bg-rose-50 hover:text-rose-600 rounded-lg text-sm font-medium transition-colors">Book Appt.</Link>
                <Link to="/find-vet" className="block px-4 py-2 text-slate-700 hover:bg-rose-50 hover:text-rose-600 rounded-lg text-sm font-medium transition-colors">Find Vet</Link>
                <Link to="/my-bookings" className="block px-4 py-2 text-slate-700 hover:bg-rose-50 hover:text-rose-600 rounded-lg text-sm font-medium transition-colors">My Bookings</Link>
            </DropdownPill>
          )}

          {userRole === 'vet' && (
             <NavPill to="/vet-appointments" active={isActive('/vet-appointments')} icon={Stethoscope}>Dashboard</NavPill>
          )}
        </div>

        {/* RIGHT SIDE ACTIONS */}
        <div className="flex items-center gap-3">
            {session ? (
                <>
                   {/* NOTIFICATIONS */}
                   <div className="relative">
                       <button 
                         onClick={() => setShowNotifications(!showNotifications)}
                         className="p-2 rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-all relative"
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
                                   className="absolute right-0 top-full mt-4 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50 origin-top-right"
                               >
                                   <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 font-bold text-slate-700 text-sm">
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
                                                    className="p-4 border-b border-slate-50 hover:bg-rose-50 cursor-pointer transition-colors"
                                               >
                                                   <p className="text-sm text-slate-600 mb-1">{n.message}</p>
                                                   <span className="text-xs text-slate-400">{new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                               </div>
                                           ))
                                       )}
                                   </div>
                                   <Link to="/notifications" onClick={() => setShowNotifications(false)} className="block p-3 text-center text-rose-500 hover:bg-slate-50 font-bold text-sm bg-slate-50/50">
                                       View All
                                   </Link>
                               </motion.div>
                           )}
                       </AnimatePresence>
                   </div>

                   {/* PROFILE */}
                   <Link to="/profile" className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-rose-100 hover:text-rose-600 transition-colors overflow-hidden border border-slate-200">
                        {user?.avatar_url ? (
                            <img src={user.avatar_url} alt="User" className="w-full h-full object-cover" />
                        ) : (
                            <User size={18} />
                        )}
                   </Link>

                   <button onClick={handleLogout} className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-rose-500 transition-colors" title="Logout">
                       <LogOut size={18} />
                   </button>
                </>
            ) : (
                <Link to="/auth" className="bg-slate-900 text-white px-5 py-2 rounded-full font-bold text-sm hover:bg-slate-800 hover:shadow-lg hover:shadow-slate-200 transition-all">
                    Login
                </Link>
            )}

            {/* MOBILE TOGGLE */}
            <button className="md:hidden p-2 text-slate-600" onClick={() => setIsOpen(!isOpen)}>
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
                className="md:hidden absolute top-20 left-4 right-4 bg-white/95 backdrop-blur-xl rounded-[2rem] shadow-2xl border border-white/50 p-4 z-40 overflow-hidden"
            >
                <div className="flex flex-col gap-2">
                    <MobileLink to="/" onClick={() => setIsOpen(false)} icon={Home}>Home</MobileLink>
                    <MobileLink to="/notify" onClick={() => setIsOpen(false)} icon={Megaphone}>Notify Rescuer</MobileLink>
                    <MobileLink to="/lost-and-found" onClick={() => setIsOpen(false)} icon={AlertTriangle}>Lost & Found</MobileLink>
                    <MobileLink to="/rescuer-feed" onClick={() => setIsOpen(false)} icon={Activity}>Rescuer Feed</MobileLink>
                    <MobileLink to="/adopt" onClick={() => setIsOpen(false)} icon={Dog}>Adoption Center</MobileLink>
                    
                    {!['rescuer', 'shelter', 'vet'].includes(userRole) && (
                        <>
                            <div className="h-px bg-slate-100 my-2" />
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

                    {session ? (
                         <>
                            <div className="h-px bg-slate-100 my-2" />
                            <MobileLink to="/profile" onClick={() => setIsOpen(false)} icon={User}>My Profile</MobileLink>
                            <button onClick={handleLogout} className="w-full text-left p-4 rounded-xl text-slate-500 font-bold hover:bg-slate-50 flex items-center gap-3">
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
    <Link to={to} className={`relative px-4 py-2 rounded-full flex items-center gap-2 text-sm font-bold transition-all ${active ? 'text-rose-600 bg-rose-50' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}>
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
            <button className={`relative px-4 py-2 rounded-full flex items-center gap-2 text-sm font-bold transition-all ${active ? 'text-rose-600 bg-rose-50' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}>
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
                        className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 z-50"
                    >
                        {children}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

const MobileLink = ({ to, onClick, icon: Icon, children }) => (
    <Link to={to} onClick={onClick} className="p-4 rounded-xl text-slate-600 font-bold hover:bg-slate-50 transition-colors flex items-center gap-3">
        <Icon size={20} className="text-slate-400" />
        {children}
    </Link>
);
