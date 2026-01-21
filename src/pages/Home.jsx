import React from 'react';
import { Link } from 'react-router-dom';
import { Bell, Heart, Shield, ArrowRight, Activity, MapPin, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

export default function Home() {
  const { user } = useAuth();
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 font-sans pb-20 overflow-x-hidden transition-colors duration-300">
      
      {/* HERO SECTION */}
      <section className="relative pt-32 pb-20 px-6">
        <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12 items-center">
                {/* Text Content */}
                <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6 }}
                    className="text-left"
                >
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-full text-xs font-bold uppercase tracking-wider mb-6 border border-rose-100 dark:border-rose-800">
                        <Heart size={12} fill="currentColor" /> Welcome into the family
                    </div>
                    
                    <h1 className="text-5xl md:text-7xl font-black text-slate-800 dark:text-white mb-6 leading-tight tracking-tight">
                        Give Them a <br/>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-amber-500">Home.</span>
                    </h1>
                    
                    <p className="text-lg text-slate-500 dark:text-slate-400 mb-8 leading-relaxed max-w-md font-medium">
                        Connect with rescuers, adopt loving pets, and find vet care in one beautiful place. Join the movement today.
                    </p>

                    <div className="flex flex-wrap items-center gap-4">
                        <Link to="/notify" className="bg-rose-600 text-white px-[24px] py-[12px] rounded-[12px] font-bold text-sm shadow-lg shadow-rose-200 dark:shadow-rose-900/20 hover:bg-rose-700 transition-all flex items-center gap-2">
                            <Bell size={18} /> Notify Rescuer
                        </Link>
                        <Link to="/adopt" className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 px-[24px] py-[12px] rounded-[12px] font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-all flex items-center gap-2">
                            <Heart size={18} /> Adopt a Pet
                        </Link>
                    </div>

                    <div className="mt-12 flex items-center gap-8">
                        <div>
                            <p className="text-3xl font-black text-slate-800 dark:text-white">200+</p>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Rescues</p>
                        </div>
                        <div className="w-px h-10 bg-slate-200 dark:bg-slate-700"></div>
                        <div>
                            <p className="text-3xl font-black text-slate-800 dark:text-white">50+</p>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Adoptions</p>
                        </div>
                        <div className="w-px h-10 bg-slate-200 dark:bg-slate-700"></div>
                        <div>
                            <p className="text-3xl font-black text-slate-800 dark:text-white">1k+</p>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Community</p>
                        </div>
                    </div>
                </motion.div>

                {/* Hero Image / Composition */}
                <motion.div 
                    initial={{ opacity: 0,  scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className="relative hidden md:block"
                >
                    <div className="absolute inset-0 bg-gradient-to-tr from-rose-100 to-amber-100 dark:from-slate-800 dark:to-slate-900 rounded-[32px] transform rotate-3 scale-95 blur-2xl opacity-60"></div>
                    <img 
                        src="https://images.unsplash.com/photo-1548199973-03cce0bbc87b?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80" 
                        alt="Happy Dog" 
                        className="relative z-10 w-full rounded-[32px] shadow-2xl object-cover h-[500px] border-4 border-white dark:border-slate-800"
                    />
                    
                    {/* Floating Badge */}
                    <motion.div 
                        animate={{ y: [0, -10, 0] }}
                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute bottom-10 -left-10 z-20 bg-white dark:bg-slate-800 p-4 rounded-[20px] shadow-xl border border-slate-100 dark:border-slate-700 flex items-center gap-4"
                    >
                        <div className="bg-emerald-100 dark:bg-emerald-900/30 p-3 rounded-full text-emerald-600 dark:text-emerald-400">
                            <Shield size={24} />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-slate-800 dark:text-white">Verified Vets</p>
                            <p className="text-xs text-slate-400 font-medium">Trusted by thousands</p>
                        </div>
                    </motion.div>
                </motion.div>
            </div>
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
                <h2 className="text-3xl font-black text-slate-800 dark:text-white mb-4">How You Can Help</h2>
                <p className="text-slate-500 dark:text-slate-400 max-w-2xl mx-auto font-medium">
                    Small acts of kindness create big waves of change. Choose your path.
                </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
                <FeatureCard 
                    icon={<MapPin className="text-amber-500" size={32} />}
                    title="Spot & Report"
                    description="See a stray in need? Drop a pin and snap a pic. We connect you to nearby rescuers in seconds."
                    link="/notify"
                    action="Report Now"
                    color="bg-amber-50 dark:bg-amber-900/20"
                />
                <FeatureCard 
                    icon={<Heart className="text-rose-500" size={32} />}
                    title="Adopt Love"
                    description="Swipe through profiles of adorable pets waiting for a forever home. Your new best friend is waiting."
                    link="/adopt"
                    action="Find a Friend"
                    color="bg-rose-50 dark:bg-rose-900/20"
                />
                <FeatureCard 
                    icon={<Activity className="text-blue-500" size={32} />}
                    title="Vet Care"
                    description="Find trusted veterinary clinics nearby and book health checkups for your furry friends easily."
                    link="/find-vet"
                    action="Book Vet"
                    color="bg-blue-50 dark:bg-blue-900/20"
                />
            </div>
        </div>
      </section>

      {/* CTA SECTION */}
      {!user && (
      <section className="px-6 pb-20">
          <div className="max-w-6xl mx-auto bg-slate-900 dark:bg-slate-800 rounded-[32px] p-12 md:p-16 text-center relative overflow-hidden border dark:border-slate-700">
                {/* Background Patterns */}
                <div className="absolute top-0 left-0 w-full h-full opacity-10">
                    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                        <pattern id="dotPattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                            <circle cx="2" cy="2" r="1" fill="white" />
                        </pattern>
                        <rect width="100%" height="100%" fill="url(#dotPattern)" />
                    </svg>
                </div>

                <div className="relative z-10">
                    <h2 className="text-3xl md:text-5xl font-black text-white mb-6">Join the PetLink Family</h2>
                    <p className="text-slate-400 mb-10 max-w-2xl mx-auto text-lg">
                        Create a free account to track your rescue reports, save favorite pets, and become a hero for the voiceless.
                    </p>
                    <Link to="/auth" className="inline-flex items-center gap-2 bg-white text-slate-900 px-[32px] py-[16px] rounded-full font-bold text-lg hover:scale-105 transition-transform">
                        Get Started <ArrowRight size={20} />
                    </Link>
                </div>
          </div>
      </section>
      )}

    </div>
  );
}

function FeatureCard({ icon, title, description, link, action, color }) {
    return (
        <Link to={link} className="group bg-white dark:bg-slate-800 p-8 rounded-[24px] border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all">
            <div className={`w-14 h-14 ${color} rounded-[16px] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                {icon}
            </div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-3">{title}</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-6 font-medium">
                {description}
            </p>
            <div className="flex items-center gap-2 text-slate-800 dark:text-emerald-400 font-bold text-sm group-hover:gap-3 transition-all">
                {action} <ArrowRight size={16} />
            </div>
        </Link>
    );
}
