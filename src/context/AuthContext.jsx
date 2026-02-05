import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [role, setRole] = useState(null);
  const [profile, setProfile] = useState(null); // Full profile data
  const [loading, setLoading] = useState(true);



  useEffect(() => {
    // 1. Check active session
    const initAuth = async () => {
        console.log("AuthContext: initAuth started");
        try {
            console.log("AuthContext: calling getSession");
            const { data: { session: currentSession }, error } = await supabase.auth.getSession();
            console.log("AuthContext: getSession result", { currentSession, error });
            if (error) throw error;
            
            if (currentSession) {
                console.log("AuthContext: Session found, setting user");
                setSession(currentSession);
                setUser(currentSession.user);
                console.log("AuthContext: fetching profile (background)");
                fetchUserProfile(currentSession.user.id);
            } else {
                console.log("AuthContext: No session found");
            }
        } catch (error) {
            console.error("AuthContext: Init Error:", error);
            // If error, we just assume logged out
        } finally {
            console.log("AuthContext: initAuth finally, setting loading false");
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
            setProfile(null);
            setLoading(false);
        } else if (currentSession) {
            setSession(currentSession);
            setUser(currentSession.user);
            fetchUserProfile(currentSession.user.id);
            setLoading(false);
        }
    });

    return () => {
        subscription.unsubscribe();
    };
  }, []);

  const fetchUserProfile = async (userId) => {
      console.log("AuthContext: fetchUserProfile start for", userId);
      try {
          // Timeout promise
          const timeoutPromise = new Promise((_, reject) => 
               setTimeout(() => reject(new Error("Request timed out")), 20000)
          );
          
          const dbPromise = supabase
              .from('profiles')
              .select('*') // Fetch ALL columns (role, is_verified, etc)
              .eq('id', userId)
              .maybeSingle();

          console.log("AuthContext: awaiting db response...");
          const { data, error } = await Promise.race([dbPromise, timeoutPromise]);
          
          if (error) throw error;
          
          console.log("AuthContext: profile data received", data);
          if (data) {
              setRole(data.role);
              setProfile(data);
          } else {
              console.warn("AuthContext: No profile found for user, defaulting to 'user'");
              setRole('user'); // Default
              setProfile({ role: 'user', is_verified: true }); // Mock safe default
          }
      } catch (err) {
          console.error("Error fetching profile:", err);
          setRole('user');
          setProfile(null);
      }
      console.log("AuthContext: fetchUserProfile end");
  };
  
  // Refresh function for components to call after updates (like verification upload)
  const refreshProfile = async () => {
      if (user) await fetchUserProfile(user.id);
  }

  const signOut = async () => {
      // Force cleanup local state immediately
      setSession(null);
      setUser(null);
      setRole(null);
      setProfile(null);
      
      // Clear all Supabase related local storage
      Object.keys(localStorage).forEach(key => {
          if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
              localStorage.removeItem(key);
          }
      });

      try {
          await supabase.auth.signOut();
      } catch (error) {
          console.error("Error signing out from Supabase:", error);
      }
  };

  const value = {
      session,
      user,
      role,
      profile, // Export full profile
      signOut,
      refreshProfile, // Export refresh function
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
