import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  // Safety Valve: If Supabase doesn't respond in 5 seconds, we force the app to load
  useEffect(() => {
     const safetyTimer = setTimeout(() => {
        if (loading) {
            console.warn("AuthContext: Supabase initialization timed out. Forcing app load.");
            setLoading(false);
            // Auto-recovery: Clear bad state
            localStorage.clear(); 
            // Optional: Reload to ensure clean slate if needed, but setState might be enough.
            // Let's try just clearing first to avoid reload loops.
        }
     }, 5000);
     return () => clearTimeout(safetyTimer);
  }, [loading]);

  useEffect(() => {
    // 1. Check active session
    const initAuth = async () => {
        try {
            const { data: { session: currentSession }, error } = await supabase.auth.getSession();
            if (error) throw error;
            
            if (currentSession) {
                setSession(currentSession);
                setUser(currentSession.user);
                await fetchUserRole(currentSession.user.id);
            }
        } catch (error) {
            console.error("AuthContext: Init Error:", error);
            // If error, we just assume logged out
        } finally {
            setLoading(false);
        }
    };

    initAuth();

    // 2. Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
        console.log("AuthContext: Auth State Change:", event);
        
        if (event === 'SIGNED_OUT') {
            setSession(null);
            setUser(null);
            setRole(null);
            setLoading(false);
        } else if (currentSession) {
            setSession(currentSession);
            setUser(currentSession.user);
            await fetchUserRole(currentSession.user.id);
            setLoading(false);
        }
    });

    return () => {
        subscription.unsubscribe();
    };
  }, []);

  const fetchUserRole = async (userId) => {
      try {
          const { data, error } = await supabase
              .from('profiles')
              .select('role')
              .eq('id', userId)
              .maybeSingle(); // Safe fetch
          
          if (data) {
              setRole(data.role);
          } else {
              setRole('user'); // Default
          }
      } catch (err) {
          console.error("Error fetching role:", err);
          setRole('user');
      }
  };

  const signOut = async () => {
      await supabase.auth.signOut();
      // State updates handled by onAuthStateChange
  };

  const value = {
      session,
      user,
      role,
      signOut,
      loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading ? children : (
          <div className="flex flex-col items-center justify-center min-h-screen bg-bg-main">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-muted font-medium animate-pulse">Initializing PetLiink...</p>
          </div>
      )}
    </AuthContext.Provider>
  );
};
