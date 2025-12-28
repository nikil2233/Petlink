import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Menu, X, Heart, LogOut, Stethoscope, MapPin, Calendar, ChevronDown, Bell } from 'lucide-react';

export default function Navbar() {
  const [session, setSession] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        // Fetch Profile & Role
        supabase
          .from('profiles')
          .select('avatar_url, role')
          .eq('id', session.user.id)
          .single()
          .then(({ data }) => {
             if (data) {
                 setUserRole(data.role);
                 if (data.avatar_url) {
                    setSession(prev => ({ ...prev, user: { ...prev.user, avatar_url: data.avatar_url } }));
                 }
             }
          });

        // Fetch Notifications
        fetchNotifications(session.user.id);
        
        // Subscribe to new notifications
        const channel = supabase
          .channel('public:notifications')
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${session.user.id}` }, payload => {
              setNotifications(prev => [payload.new, ...prev]);
          })
          .subscribe();

        return () => supabase.removeChannel(channel);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      
      try {
        if (session) {
            // Fetch Notification & Role on login/change
            fetchNotifications(session.user.id);
            const { data, error } = await supabase
              .from('profiles')
              .select('role, avatar_url')
              .eq('id', session.user.id)
              .maybeSingle(); // Use maybeSingle to avoid errors on no rows
            
            if (error) {
                console.error("Error fetching profile:", error);
            } else if (data) {
                setUserRole(data.role);
                 if (data.avatar_url) {
                      setSession(prev => ({ ...prev, user: { ...prev.user, avatar_url: data.avatar_url } }));
                   }
            }
        } else {
            // Reset on logout (redundant check)
            setUserRole(null);
            setNotifications([]);
        }
      } catch (err) {
          console.error("Navbar auth error:", err);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

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
        setSession(null);
        setUserRole(null);
        setNotifications([]);
        navigate('/');
        await supabase.auth.signOut();
    } catch (error) {
        console.error("Error logging out:", error);
    }
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="glass-panel" style={{ position: 'fixed', top: '0', left: '0', right: '0', zIndex: 50, borderRadius: 0, borderTop: 'none', borderLeft: 'none', borderRight: 'none' }}>
      <div className="container flex justify-between items-center" style={{ height: 'var(--header-height)' }}>
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2" style={{ textDecoration: 'none', color: 'var(--text-main)' }}>
          <div style={{ background: 'var(--primary)', padding: '0.5rem', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Heart size={20} fill="white" color="white" />
          </div>
          <span style={{ fontSize: '1.25rem', fontWeight: '800', letterSpacing: '-0.025em' }}>PetLink</span>
        </Link>

        {/* Desktop Menu */}
        <div className="desktop-menu flex items-center gap-6">
          <NavLink to="/" active={isActive('/')}>Home</NavLink>
          <NavLink to="/notify" active={isActive('/notify')}>Notify Rescuer</NavLink>
          <NavLink to="/rescuer-feed" active={isActive('/rescuer-feed')}>Rescuer Feed</NavLink>
          
          {['rescuer', 'shelter', 'vet'].includes(userRole) ? (
            <div className="nav-dropdown-container">
                <NavLink to="/adopt" active={isActive('/adopt') || isActive('/adoption-requests')}>
                    Adoption Center <ChevronDown size={14} style={{ marginLeft: '0.25rem' }} />
                </NavLink>
                <div className="nav-dropdown-menu">
                    <Link to="/adopt" className="dropdown-item">Browse Pets</Link>
                    <Link to="/adoption-requests" className="dropdown-item">Adoption Requests</Link>
                </div>
            </div>
          ) : (
            <NavLink to="/adopt" active={isActive('/adopt')}>Adoption Center</NavLink>
          )}
          
          
          {/* Appointment Links - Hidden for NGOs */}
          {!['rescuer', 'shelter', 'vet'].includes(userRole) && (
            <div className="nav-dropdown-container">
                <NavLink to="/book-appointment" active={isActive('/book-appointment') || isActive('/find-vet') || isActive('/my-bookings')}>
                    Book Appointment <ChevronDown size={14} style={{ marginLeft: '0.25rem' }} />
                </NavLink>
                <div className="nav-dropdown-menu">
                    <Link to="/book-appointment" className="dropdown-item">New Appointment</Link>
                    <Link to="/find-vet" className="dropdown-item">Find a Vet</Link>
                    <Link to="/my-bookings" className="dropdown-item">My Bookings</Link>
                </div>
            </div>
          )}

          {/* Vet Dashboard Link - Standalone */}
          {userRole === 'vet' && (
             <NavLink to="/vet-appointments" active={isActive('/vet-appointments')}>Vet Dashboard</NavLink>
          )}
          
          {session ? (
            <div className="flex items-center gap-4" style={{ marginLeft: '1rem' }}>
              
              {/* Notification Bell */}
              <div style={{ position: 'relative' }}>
                  <button 
                    onClick={() => setShowNotifications(!showNotifications)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', position: 'relative', color: 'var(--text-muted)' }}
                  >
                      <Bell size={20} />
                      {notifications.length > 0 && (
                          <span style={{ 
                              position: 'absolute', top: '-5px', right: '-5px', 
                              background: 'var(--danger)', color: 'white', 
                              fontSize: '0.7rem', fontWeight: 'bold', 
                              width: '16px', height: '16px', borderRadius: '50%', 
                              display: 'flex', alignItems: 'center', justifyContent: 'center' 
                          }}>
                              {notifications.length}
                          </span>
                      )}
                  </button>

                  {showNotifications && (
                      <div className="glass-panel" style={{ 
                          position: 'absolute', top: '120%', right: '0', width: '300px', 
                          padding: '0', overflow: 'hidden', zIndex: 100
                      }}>
                          <div style={{ padding: '0.75rem', borderBottom: '1px solid var(--border-color)', fontWeight: '600' }}>
                              Notifications
                          </div>
                          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                              {notifications.length === 0 ? (
                                  <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                      No new notifications
                                  </div>
                              ) : (
                                  notifications.map(n => (
                                      <div key={n.id} style={{ padding: '0.75rem', borderBottom: '1px solid var(--border-color)', cursor: 'pointer', fontSize: '0.9rem' }}
                                           onClick={() => {
                                               markAsRead(n.id);
                                               if(n.type === 'appointment_request' && userRole === 'vet') navigate('/vet-appointments');
                                               // Add other navigations here
                                               setShowNotifications(false);
                                           }}
                                      >
                                          <div style={{ marginBottom: '0.25rem' }}>{n.message}</div>
                                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                              {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                          </div>
                                      </div>
                                  ))
                              )}
                          </div>
                      </div>
                  )}
              </div>

              <Link to="/profile" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
                 <div style={{ width: '36px', height: '36px', background: 'var(--primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: '600', overflow: 'hidden' }}>
                    {session.user.avatar_url ? (
                        <img src={session.user.avatar_url} alt="User" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                        session.user.email?.charAt(0).toUpperCase()
                    )}
                 </div>
              </Link>
              <button 
                onClick={handleLogout}
                className="btn btn-secondary"
                style={{ padding: '0.5rem', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                title="Logout"
              >
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <Link to="/auth" className="btn btn-primary" style={{ textDecoration: 'none' }}>
              Get Started
            </Link>
          )}
        </div>

        {/* Mobile Toggle */}
        <button 
          className="mobile-toggle" 
          onClick={() => setIsOpen(!isOpen)}
          style={{ background: 'none', border: 'none', color: 'var(--text-main)', cursor: 'pointer', display: 'none' }}
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div style={{ padding: '1rem', borderTop: '1px solid var(--border-color)', background: 'var(--bg-card)' }}>
           <div className="flex flex-col gap-4">
            <MobileNavLink to="/" onClick={() => setIsOpen(false)}>Home</MobileNavLink>
            <MobileNavLink to="/notify" onClick={() => setIsOpen(false)}>Notify Rescuer</MobileNavLink>
            <MobileNavLink to="/rescuer-feed" onClick={() => setIsOpen(false)}>Rescuer Feed</MobileNavLink>
            <MobileNavLink to="/adopt" onClick={() => setIsOpen(false)}>Adoption Center</MobileNavLink>
            {/* Show Appointment links ONLY if NOT NGO */}
            {!['rescuer', 'shelter', 'vet'].includes(userRole) && (
                <>
                    <MobileNavLink to="/book-appointment" onClick={() => setIsOpen(false)}>Book Appointment</MobileNavLink>
                    <MobileNavLink to="/find-vet" onClick={() => setIsOpen(false)}>Find Vet</MobileNavLink>
                    <MobileNavLink to="/my-bookings" onClick={() => setIsOpen(false)}>My Bookings</MobileNavLink>
                </>
            )}
            
            {/* Vet Dashboard */}
            {userRole === 'vet' && (
                 <MobileNavLink to="/vet-appointments" onClick={() => setIsOpen(false)}>Vet Dashboard</MobileNavLink>
            )}

            {/* NGO Adoption Requests */}
            {['rescuer', 'shelter', 'vet'].includes(userRole) && (
                 <MobileNavLink to="/adoption-requests" onClick={() => setIsOpen(false)}>Adoption Requests</MobileNavLink>
            )}
            {session ? (
              <>
                <MobileNavLink to="/profile" onClick={() => setIsOpen(false)}>My Profile</MobileNavLink>
                <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', textAlign: 'left', cursor: 'pointer', fontWeight: '500', fontSize: '1.1rem', padding: 0 }}>Logout</button>
              </>
            ) : (
              <MobileNavLink to="/auth" onClick={() => setIsOpen(false)}>Login / Join</MobileNavLink>
            )}
           </div>
        </div>
      )}
      <style>{`
        @media (max-width: 768px) {
          .desktop-menu { display: none !important; }
          .mobile-toggle { display: block !important; }
        }

        /* Dropdown Styles */
        .nav-dropdown-container {
            position: relative;
            height: 100%;
            display: flex;
            align-items: center;
        }

        .nav-dropdown-container:hover .nav-dropdown-menu {
            display: flex;
            opacity: 1;
            transform: translateY(0);
            pointer-events: auto;
        }

        .nav-dropdown-menu {
            display: none;
            position: absolute;
            top: 100%;
            left: 50%;
            transform: translateX(-50%) translateY(10px);
            background: white;
            border: 1px solid var(--border-color);
            border-radius: var(--radius-md);
            padding: 0.5rem;
            box-shadow: var(--shadow-lg);
            flex-direction: column;
            min-width: 180px;
            z-index: 100;
        }

        .dropdown-item {
            text-decoration: none;
            color: var(--text-color);
            padding: 0.75rem 1rem;
            border-radius: var(--radius-sm);
            font-size: 0.9rem;
            font-weight: 500;
            transition: all 0.2s;
            white-space: nowrap;
        }

        .dropdown-item:hover {
            background: var(--bg-subtle);
            color: var(--primary);
        }
      `}</style>
    </nav>
  );
}

function NavLink({ to, children, active }) {
  return (
    <Link 
      to={to} 
      style={{ 
        textDecoration: 'none', 
        color: active ? 'var(--primary)' : 'var(--text-muted)', 
        fontWeight: '600',
        transition: 'color 0.2s',
        position: 'relative'
      }}
    >
      {children}
      {active && (
         <span style={{ 
             position: 'absolute', 
             bottom: '-4px', 
             left: '0', 
             width: '100%', 
             height: '2px', 
             background: 'var(--primary)',
             borderRadius: '2px'
         }}></span>
      )}
    </Link>
  );
}

function MobileNavLink({ to, children, onClick }) {
  return (
    <Link 
      to={to} 
      onClick={onClick}
      style={{ textDecoration: 'none', color: 'var(--text-main)', fontSize: '1.1rem', fontWeight: '600' }}
    >
      {children}
    </Link>
  );
}
