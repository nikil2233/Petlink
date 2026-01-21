import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { 
    User, MapPin, Mail, Building, Stethoscope, 
    HeartHandshake, FileText, Target, Shield, ArrowLeft, Phone
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function UserProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchProfile(id);
    }
  }, [id]);

  const fetchProfile = async (userId) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRoleIcon = (role) => {
    const props = { size: 24, className: "text-white" };
    switch(role) {
      case 'user': return <User {...props} />;
      case 'rescuer': return <HeartHandshake {...props} />;
      case 'shelter': return <Building {...props} />;
      case 'vet': return <Stethoscope {...props} />;
      default: return <User {...props} />;
    }
  };

  const getRoleLabel = (role) => {
      switch(role) {
        case 'user': return 'Citizen';
        case 'rescuer': return 'Rescuer';
        case 'shelter': return 'Shelter';
        case 'vet': return 'Veterinarian';
        default: return role;
      }
  };

  const getRoleGradient = (role) => {
      switch(role) {
          case 'rescuer': return 'from-orange-400 to-pink-500';
          case 'shelter': return 'from-blue-400 to-indigo-500';
          case 'vet': return 'from-emerald-400 to-teal-500';
          default: return 'from-violet-500 to-purple-600';
      }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex justify-center items-center transition-colors duration-300">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 dark:border-indigo-400"></div>
      </div>
    );
  }

  if (!profile) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
            <User size={48} className="mb-4 text-slate-300 dark:text-slate-600" />
            <p>Profile not found or removed.</p>
            <button onClick={() => navigate(-1)} className="mt-4 text-indigo-600 dark:text-indigo-400 font-bold hover:underline">
                Go Back
            </button>
        </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-slate-50 dark:bg-slate-900 pt-24 pb-12 px-4 transition-colors duration-300">
      <div className="container mx-auto max-w-4xl">
        
        <button 
            onClick={() => navigate(-1)} 
            className="mb-8 flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white font-bold transition-colors"
        >
            <ArrowLeft size={20} /> Back
        </button>

        {/* HERO SECTION */}
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative mb-8 group"
        >
            <div className={`absolute inset-0 bg-gradient-to-r ${getRoleGradient(profile.role)} rounded-3xl opacity-10 blur-xl transform group-hover:scale-105 transition-transform duration-500`}></div>
            <div className="relative bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/50 dark:border-slate-700/50 shadow-xl rounded-3xl p-8 md:p-12 overflow-hidden transition-colors duration-300">
                
                {/* Decorative Background Icon */}
                <div className="absolute -top-12 -right-12 opacity-5">
                    {getRoleIcon(profile.role)}
                    <div className="transform scale-[5] text-indigo-900">
                        {getRoleIcon(profile.role)}
                    </div>
                </div>

                <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
                    {/* Avatar */}
                    <div className="relative">
                        <div className="w-32 h-32 md:w-40 md:h-40 rounded-full p-1 bg-gradient-to-tr from-white to-slate-200 dark:from-slate-700 dark:to-slate-800 shadow-xl">
                            <div className="w-full h-full rounded-full overflow-hidden bg-slate-100 dark:bg-slate-700">
                                {profile.avatar_url ? (
                                    <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-slate-100 dark:bg-slate-700 text-slate-300 dark:text-slate-500">
                                        <User size={64} />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Header Text */}
                    <div className="text-center md:text-left flex-1">
                        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold text-white uppercase tracking-wider mb-2 bg-gradient-to-r ${getRoleGradient(profile.role)} shadow-md`}>
                            {getRoleIcon(profile.role)}
                            {getRoleLabel(profile.role)}
                        </div>
                        <h1 className="text-3xl md:text-4xl font-black text-slate-800 dark:text-white mb-2">
                            {profile.full_name || 'Anonymous User'}
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 text-lg max-w-lg">
                            {profile.about || 'No bio available.'}
                        </p>
                    </div>
                </div>
            </div>
        </motion.div>

        {/* DETAILS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Contact & Location */}
            <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 transition-colors duration-300"
            >
                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                    <MapPin className="text-indigo-500" size={20} /> Location & Contact
                </h3>
                
                <div className="space-y-4">
                    <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                        <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 shadow-sm">
                            <Building size={18} />
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase">City</p>
                            <p className="font-semibold text-slate-700 dark:text-slate-200">{profile.city || 'Not specified'}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                        <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 shadow-sm">
                            <Mail size={18} />
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase">Email</p>
                            <p className="font-semibold text-slate-700 dark:text-slate-200">{profile.email}</p>
                        </div>
                    </div>
                    
                    {profile.phone && (
                        <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                            <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 shadow-sm">
                                <Phone size={18} />
                            </div>
                            <div>
                                <p className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase">Phone</p>
                                <p className="font-semibold text-slate-700 dark:text-slate-200">{profile.phone}</p>
                            </div>
                        </div>
                    )}
                </div>
            </motion.div>

            {/* Mission / Goal (For NGOs) */}
            {profile.role !== 'user' && (
                <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 transition-colors duration-300"
                >
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                        <Target className="text-rose-500" size={20} /> Mission & Goal
                    </h3>
                    <div className="p-4 bg-rose-50 dark:bg-rose-900/20 rounded-2xl border border-rose-100 dark:border-rose-900/30 h-full">
                        <p className="text-rose-800 dark:text-rose-300 font-medium leading-relaxed italic">
                            "{profile.goal || 'No mission statement provided.'}"
                        </p>
                    </div>
                </motion.div>
            )}

        </div>
      </div>
    </div>
  );
}
