import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Lock, Check, AlertTriangle, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if we have a hash (which implies we are handling a password recovery)
    // Supabase puts the access_token in the URL hash for recovery flows
    const hash = window.location.hash;
    if (!hash || !hash.includes('type=recovery')) {
       // Ideally we might want to redirect if random access, but for now just let it be
    }
  }, []);

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (password.length < 6) throw new Error("Password must be at least 6 characters");

      const { error } = await supabase.auth.updateUser({ password: password });
      
      if (error) throw error;
      
      setSuccess(true);
      setTimeout(() => {
          navigate('/auth');
      }, 3000); // Redirect after 3 seconds
      
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (

    <div className="min-h-screen bg-gradient-to-br from-rose-50 to-orange-50 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4 transition-colors duration-300">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl p-8 rounded-[2rem] shadow-2xl border border-white/50 dark:border-slate-700/50 w-full max-w-md transition-colors duration-300"
      >
        <div className="text-center mb-8">
            <div className="w-16 h-16 bg-rose-100 dark:bg-rose-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-rose-600 dark:text-rose-400 shadow-sm">
                <Lock size={32} />
            </div>
            <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-2">Set New Password</h2>
            <p className="text-slate-500 dark:text-slate-400">Enter your new secure password below.</p>
        </div>

        {error && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl mb-6 flex items-center gap-2 text-sm font-bold border border-red-100 dark:border-red-900/30">
                <AlertTriangle size={18} /> {error}
            </div>
        )}

        {success ? (
            <div className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-6 py-8 rounded-xl text-center border border-green-100 dark:border-green-900/30">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center mx-auto mb-3 text-green-600 dark:text-green-400">
                    <Check size={24} />
                </div>
                <h3 className="font-bold text-lg mb-1">Password Updated!</h3>
                <p className="text-sm text-green-600 dark:text-green-500 mb-0">Redirecting you to login...</p>
            </div>
        ) : (
            <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider ml-1">New Password</label>
                    <input 
                        type="password" 
                        required
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-700 dark:text-white focus:ring-2 focus:ring-rose-500 focus:outline-none transition-all font-medium"
                        placeholder="••••••••"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                    />
                </div>

                <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full bg-slate-900 dark:bg-indigo-600 text-white font-bold py-4 rounded-xl hover:bg-slate-800 dark:hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-slate-200 dark:shadow-none hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
                >
                    {loading ? 'Updating...' : <>Update Password <ArrowRight size={20} /></>}
                </button>
            </form>
        )}
      </motion.div>
    </div>
  );
}
