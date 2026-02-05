import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Lock, Check, AlertTriangle, ArrowRight, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [isLinkInvalid, setIsLinkInvalid] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check for errors passed in the URL (e.g., link expired, used, or invalid)
    const hash = window.location.hash;
    const search = window.location.search; // Sometimes errors come in search params too

    const checkParams = (params) => {
        const urlParams = new URLSearchParams(params.replace('#', '?'));
        const errorDesc = urlParams.get('error_description');
        const errorCode = urlParams.get('error_code');
        const errorType = urlParams.get('error');

        if (errorDesc || errorCode || errorType) {
            console.error("Reset Link Error:", errorDesc);
            setError(errorDesc?.replace(/\+/g, ' ') || "This password reset link is invalid or has expired.");
            setIsLinkInvalid(true);
            return true;
        }
        return false;
    };

    if (!checkParams(hash)) {
        checkParams(search);
    }
  }, []);

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (isLinkInvalid) return;

    setLoading(true);
    setError(null);

    try {
      if (password.length < 6) throw new Error("Password must be at least 6 characters");

      const { error } = await supabase.auth.updateUser({ password: password });
      
      if (error) throw error;
      
      setSuccess(true);
      setTimeout(() => {
          navigate('/auth');
      }, 3000); 
      
    } catch (err) {
      console.error(err);
      // Friendly error if session is missing (likely due to link issues)
      if (err.message.includes("Auth session missing")) {
          setError("Session expired. This link may have already been used.");
          setIsLinkInvalid(true);
      } else {
          setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-slate-800 p-8 rounded-[2rem] shadow-xl border border-slate-100 dark:border-slate-700 w-full max-w-md"
      >
        <div className="text-center mb-8">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm ${isLinkInvalid ? 'bg-red-100 dark:bg-red-900/30 text-red-600' : 'bg-rose-100 dark:bg-rose-900/30 text-rose-600'}`}>
                {isLinkInvalid ? <AlertTriangle size={32} /> : <Lock size={32} />}
            </div>
            <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-2">
                {isLinkInvalid ? 'Link Expired' : 'Set New Password'}
            </h2>
            <p className="text-slate-500 dark:text-slate-400">
                {isLinkInvalid ? 'This reset link is no longer valid.' : 'Enter your new secure password below.'}
            </p>
        </div>

        {error && (
            <div className={`px-4 py-3 rounded-xl mb-6 flex items-start gap-2 text-sm font-bold border ${isLinkInvalid ? 'bg-red-50 dark:bg-red-900/20 text-red-600 border-red-100' : 'bg-orange-50 text-orange-600 border-orange-100'}`}>
                <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                <span>{error}</span>
            </div>
        )}

        {isLinkInvalid ? (
            <button 
                onClick={() => navigate('/auth')}
                className="w-full bg-slate-900 dark:bg-white dark:text-slate-900 text-white font-bold py-4 rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2"
            >
                <RefreshCw size={20} /> Request New Link
            </button>
        ) : success ? (
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
