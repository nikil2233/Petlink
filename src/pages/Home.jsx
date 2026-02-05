import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Link } from 'react-router-dom';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { PawPrint, Heart, Bell, Shield, MapPin, ArrowRight, Activity, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const CountUp = ({ to }) => {
  const count = useMotionValue(0);
  const rounded = useTransform(count, Math.round);

  useEffect(() => {
    const controls = animate(count, to, { duration: 2, ease: "easeOut" });
    return controls.stop;
  }, [to]);

  return <motion.span>{rounded}</motion.span>;
};

const Home = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    livesSaved: 0,
    rescuers: 0,
    adoptions: 0,
    clinics: 0
  });

  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // 1. Count Rescuers
        const { count: rescuerCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'rescuer');

        // 2. Count Clinics (Vets)
        const { count: vetCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'vet');

        // 3. Count Adoptions
        const { count: adoptionCount } = await supabase
          .from('adoptions')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'adopted');

        // 4. Count Reunited Pets (for Lives Saved)
        const { count: reunitedCount } = await supabase
          .from('lost_pets')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'reunited');

        // Lives Saved = Adoptions + Reunited
        const totalAdoptions = adoptionCount || 0;
        const totalReunited = reunitedCount || 0;
        const totalLivesSaved = totalAdoptions + totalReunited;

        setStats({
          livesSaved: totalLivesSaved,
          rescuers: rescuerCount || 0,
          adoptions: totalAdoptions,
          clinics: vetCount || 0
        });

      } catch (error) {
        console.error('Error fetching home stats:', error);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans">
      
      {/* 1. CLASSIC HERO SECTION */}
      <section className="relative pt-20 pb-32 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          
          {/* Text Content */}
          <motion.div 
            initial="hidden"
            animate="visible"
            transition={{ duration: 0.6 }}
            variants={fadeIn}
            className="relative z-10"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-full text-sm font-bold uppercase tracking-wider mb-6">
              <PawPrint size={16} /> Official Pet Registry
            </div>
            <h1 className="text-5xl md:text-6xl font-extrabold text-slate-900 dark:text-white mb-6 leading-tight">
              Give them a <span className="text-rose-600">Loving Home.</span>
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-400 mb-8 leading-relaxed max-w-lg">
              The centralized platform for pet adoption, rescue coordination, and veterinary services. Join our community to make a difference.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to="/adopt" className="btn btn-primary px-8 py-4 text-lg rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all">
                Adopt a Pet
              </Link>
              <Link to="/notify" className="btn btn-secondary px-8 py-4 text-lg rounded-xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 hover:border-rose-500 transition-all">
                Report Stray
              </Link>
            </div>
          </motion.div>

          {/* Hero Image */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative z-10"
          >
            <div className="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-white dark:border-slate-800">
               <img 
                  src="https://images.unsplash.com/photo-1450778869180-41d0601e046e?auto=format&fit=crop&w=800&q=80" 
                  alt="Happy Pets" 
                  className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-700" 
               />
            </div>
            {/* Decimal Decorative Elements */}
            <div className="absolute -z-10 top-10 -right-10 w-72 h-72 bg-amber-400/20 rounded-full blur-3xl"></div>
            <div className="absolute -z-10 -bottom-10 -left-10 w-72 h-72 bg-rose-400/20 rounded-full blur-3xl"></div>
          </motion.div>
        </div>
      </section>

      {/* 2. STATS BANNER */}
      <section className="relative overflow-hidden bg-white dark:bg-slate-900 py-12 border-y border-slate-100 dark:border-slate-800">
        {/* Floating Icons Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            animate={{ 
              y: [0, -20, 0], 
              rotate: [0, 10, 0],
              opacity: [0.3, 0.6, 0.3]
            }}
            transition={{ 
              duration: 5, 
              repeat: Infinity, 
              ease: "easeInOut" 
            }}
            className="absolute top-10 left-[10%] text-rose-200 dark:text-rose-900/40"
          >
            <PawPrint size={64} />
          </motion.div>
          <motion.div
            animate={{ 
              y: [0, 25, 0], 
              rotate: [0, -15, 0],
              opacity: [0.2, 0.5, 0.2]
            }}
            transition={{ 
              duration: 7, 
              repeat: Infinity, 
              ease: "easeInOut",
              delay: 1
            }}
            className="absolute bottom-5 right-[15%] text-amber-200 dark:text-amber-900/40"
          >
            <PawPrint size={80} />
          </motion.div>
           <motion.div
            animate={{ 
              y: [0, -15, 0], 
              scale: [1, 1.1, 1],
              opacity: [0.2, 0.4, 0.2]
            }}
            transition={{ 
              duration: 6, 
              repeat: Infinity, 
              ease: "easeInOut",
              delay: 2
            }}
            className="absolute top-1/2 left-[45%] text-teal-100 dark:text-teal-900/30"
          >
            <Heart size={100} />
          </motion.div>
           <motion.div
            animate={{ 
              y: [0, 20, 0], 
              rotate: [0, 5, 0],
              opacity: [0.1, 0.3, 0.1]
            }}
            transition={{ 
              duration: 8, 
              repeat: Infinity, 
              ease: "easeInOut",
              delay: 0.5
            }}
            className="absolute top-5 right-[5%] text-indigo-100 dark:text-indigo-900/30"
          >
            <Shield size={50} />
          </motion.div>
        </div>

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div className="space-y-2">
              <h3 className="text-4xl font-black text-rose-500">
                 <CountUp to={stats.livesSaved} />+
              </h3>
              <p className="text-slate-500 font-bold uppercase text-xs tracking-widest">Lives Saved</p>
            </div>
            <div className="space-y-2">
              <h3 className="text-4xl font-black text-amber-500">
                 <CountUp to={stats.rescuers} />+
              </h3>
              <p className="text-slate-500 font-bold uppercase text-xs tracking-widest">Rescuers</p>
            </div>
            <div className="space-y-2">
              <h3 className="text-4xl font-black text-teal-500">
                 <CountUp to={stats.adoptions} />+
              </h3>
              <p className="text-slate-500 font-bold uppercase text-xs tracking-widest">Adoptions</p>
            </div>
            <div className="space-y-2">
              <h3 className="text-4xl font-black text-indigo-500">
                 <CountUp to={stats.clinics} />+
              </h3>
              <p className="text-slate-500 font-bold uppercase text-xs tracking-widest">Clinics</p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. SERVICES GRID */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-800 dark:text-white mb-4">Everything Your Pet Needs</h2>
            <p className="text-slate-500 dark:text-slate-400 max-w-2xl mx-auto text-lg">
              Comprehensive tools for pet owners, finders, and animal lovers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Card 1 */}
            <Link to="/adopt" className="group">
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-xl hover:border-teal-500 transition-all h-full">
                <div className="w-14 h-14 bg-teal-100 dark:bg-teal-900/30 rounded-xl flex items-center justify-center text-teal-600 dark:text-teal-400 mb-6 group-hover:scale-110 transition-transform">
                  <Heart size={28} />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">Adopt a Pet</h3>
                <p className="text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
                  Browse hundreds of lovable pets waiting for a forever home. Filter by breed, age, and location.
                </p>
                <div className="text-teal-600 dark:text-teal-400 font-bold flex items-center gap-2">
                  Browse Now <ArrowRight size={18} />
                </div>
              </div>
            </Link>

            {/* Card 2 */}
            <Link to="/notify" className="group">
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-xl hover:border-rose-500 transition-all h-full">
                <div className="w-14 h-14 bg-rose-100 dark:bg-rose-900/30 rounded-xl flex items-center justify-center text-rose-600 dark:text-rose-400 mb-6 group-hover:scale-110 transition-transform">
                  <Bell size={28} />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">Report Stray</h3>
                <p className="text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
                  Found an injured or lost animal? Notify our network of local rescuers immediately with location data.
                </p>
                <div className="text-rose-600 dark:text-rose-400 font-bold flex items-center gap-2">
                  Notify Rescuer <ArrowRight size={18} />
                </div>
              </div>
            </Link>

            {/* Card 3 */}
            <Link to="/find-vet" className="group">
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-xl hover:border-indigo-500 transition-all h-full">
                <div className="w-14 h-14 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-6 group-hover:scale-110 transition-transform">
                  <Shield size={28} />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">Find a Vet</h3>
                <p className="text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
                  Locate verified veterinary clinics near you. View services, ratings, and book appointments easily.
                </p>
                <div className="text-indigo-600 dark:text-indigo-400 font-bold flex items-center gap-2">
                  Locate Clinic <ArrowRight size={18} />
                </div>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* 4. FEATURE STRIP (Lost & Found) */}
      <section className="py-20 bg-amber-50 dark:bg-amber-950/20">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center gap-12">
          <div className="flex-1">
             <div className="relative rounded-2xl overflow-hidden shadow-lg transform rotate-2 hover:rotate-0 transition-transform duration-500">
                <img src="https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=800&q=80" alt="Lost Dog" className="w-full" />
             </div>
          </div>
          <div className="flex-1 space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white">
              Lost & Found Network
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
              Our community-powered network helps reunite lost pets with their owners. 
              View active alerts in your area or report a missing pet to get help fast.
            </p>
            <div className="flex gap-4 pt-2">
              <Link to="/lost-and-found" className="btn bg-amber-500 hover:bg-amber-600 text-white px-8 py-3 rounded-xl shadow-lg shadow-amber-200 dark:shadow-none">
                View Lost Pets
              </Link>
            </div>
            
            <div className="flex items-center gap-4 pt-4 text-sm text-slate-500 font-medium">
              <div className="flex -space-x-3">
                 <div className="w-10 h-10 rounded-full bg-slate-200 border-2 border-white"></div>
                 <div className="w-10 h-10 rounded-full bg-slate-300 border-2 border-white"></div>
                 <div className="w-10 h-10 rounded-full bg-slate-400 border-2 border-white"></div>
              </div>
              <span>Joined by 500+ locals</span>
            </div>
          </div>
        </div>
      </section>

      {/* 5. CTA SECTION */}
      <section className="py-24">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <div className="bg-slate-900 dark:bg-slate-800 rounded-3xl p-12 md:p-16 relative overflow-hidden shadow-2xl">
            {/* Background Texture */}
            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-rose-500/20 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl"></div>
            
            <div className="relative z-10 space-y-8">
              <h2 className="text-3xl md:text-5xl font-bold text-white">Ready to make a difference?</h2>
              <p className="text-slate-300 max-w-2xl mx-auto text-lg leading-relaxed">
                Whether you're looking to adopt, volunteer, or just stay informed, your involvement changes lives.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                {!user ? (
                   <Link to="/auth" className="btn bg-rose-600 hover:bg-rose-700 text-white px-10 py-4 rounded-xl font-bold shadow-lg">
                      Get Started
                   </Link>
                ) : (
                   <Link to="/profile" className="btn bg-white text-slate-900 hover:bg-slate-100 px-10 py-4 rounded-xl font-bold shadow-lg">
                      My Profile
                   </Link>
                )}
                <Link to="/success-stories" className="btn bg-transparent border-2 border-slate-700 hover:border-slate-500 text-white px-10 py-4 rounded-xl font-bold">
                   Read Stories
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
};

export default Home;
