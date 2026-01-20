import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { MapPin, Camera, AlertTriangle, Send, X, Shield, Info, Heart, Upload, Navigation } from 'lucide-react';
import MapPicker from '../components/MapPicker';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

export default function NotifyRescuer() {
  const navigate = useNavigate();
  const { session, role: userRole, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  
  // Data
  const [rescuers, setRescuers] = useState([]);
  const fileInputRef = useRef(null);

  // Form Fields
  const [description, setDescription] = useState('');
  const [locationName, setLocationName] = useState(''); 
  const [coords, setCoords] = useState(null); 
  const [urgency, setUrgency] = useState('medium');
  const [selectedRescuer, setSelectedRescuer] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  useEffect(() => {
    if (session) {
        fetchRescuers();
    }
  }, [session]);

  const fetchRescuers = async () => {
      try {
          // Only fetch necessary fields
          const { data, error } = await supabase
            .from('profiles')
            .select('id, full_name, role, location')
            .in('role', ['rescuer', 'shelter']);
          
          if (error) throw error;
          setRescuers(data || []);
      } catch (err) {
          console.error("Error fetching rescuers:", err);
      }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const removeImage = (e) => {
    e.stopPropagation();
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  const uploadImage = async (file) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error } = await supabase.storage
      .from('rescue-images')
      .upload(filePath, file);

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('rescue-images')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!session || !session.user) {
        setMsg({ type: 'error', text: 'You must be logged in.' });
        return;
    }

    if (!coords && !locationName) {
        setMsg({ type: 'error', text: 'Please provide a location on the map or a description.' });
        return;
    }
    
    if (!selectedRescuer) {
        setMsg({ type: 'error', text: 'Please select a rescuer/shelter to notify.' });
        return;
    }

    setLoading(true);
    setMsg(null);

    try {
        // Ensure profile exists (sanity check)
        const { error: profileError } = await supabase
            .from('profiles')
            .upsert(
                { id: session.user.id, email: session.user.email },
                { onConflict: 'id', ignoreDuplicates: true }
            );
        
        if (profileError) console.warn("Could not ensure profile exists:", profileError);

        let finalImageUrl = null;
        if (imageFile) {
            finalImageUrl = await uploadImage(imageFile);
        }

        const { error } = await supabase
        .from('reports')
        .insert([
          {
            user_id: session.user.id,
            description,
            location: locationName, 
            latitude: coords ? coords.lat : null,
            longitude: coords ? coords.lng : null,
            urgency,
            image_url: finalImageUrl,
            assigned_rescuer_id: selectedRescuer,
            status: 'pending'
          }
        ]);

      if (error) throw error;

      setMsg({ type: 'success', text: 'Report submitted successfully!' });
      // Reset form
      setDescription('');
      setLocationName('');
      setCoords(null);
      setUrgency('medium');
      setSelectedRescuer('');
      removeImage({ stopPropagation: () => {} });
      window.scrollTo(0,0);
    } catch (err) {
      console.error(err);
      setMsg({ type: 'error', text: 'Failed to submit report. Please try again.' });
      window.scrollTo(0,0);
    } finally {
      setLoading(false);
    }
  };

  const urgencyLevels = [
    { id: 'low', label: 'Low', color: 'bg-emerald-500', hover: 'hover:bg-emerald-600', ring: 'ring-emerald-200' },
    { id: 'medium', label: 'Medium', color: 'bg-amber-500', hover: 'hover:bg-amber-600', ring: 'ring-amber-200' },
    { id: 'high', label: 'High', color: 'bg-orange-500', hover: 'hover:bg-orange-600', ring: 'ring-orange-200' },
    { id: 'critical', label: 'Critical', color: 'bg-rose-600', hover: 'hover:bg-rose-700', ring: 'ring-rose-200' },
  ];

  if (authLoading) return (
    <div className="min-h-screen flex justify-center items-center bg-slate-950">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
    </div>
  );

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 relative overflow-hidden p-4">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1535930749574-1399327ce78f?q=80&w=2000')] bg-cover bg-center opacity-20 blur-sm"></div>
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-900/80 backdrop-blur-xl p-12 rounded-[2.5rem] max-w-lg w-full text-center shadow-2xl border border-white/10 relative z-10"
          >
              <div className="w-20 h-20 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Shield size={40} className="text-orange-500" />
              </div>
              <h2 className="text-3xl font-black text-white mb-3">Welcome to PetLink</h2>
              <p className="text-slate-400 text-lg mb-8 leading-relaxed">Please log in to report a stray animal and help us save lives.</p>
              <button 
                onClick={() => navigate('/auth')} 
                className="w-full bg-white text-slate-900 font-bold py-4 rounded-xl hover:bg-slate-200 transition-all shadow-lg active:scale-95"
              >
                  Login / Sign Up
              </button>
          </motion.div>
      </div>
    );
  }

  if (userRole !== 'user') {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-slate-900 p-12 rounded-[2rem] max-w-lg w-full text-center shadow-xl border border-slate-800"
            >
                <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Shield size={40} className="text-amber-500" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Restricted Access</h2>
                <p className="text-slate-400 mb-8">Only Citizens can submit rescue reports. Rescuers should check the feed.</p>
                <button 
                    onClick={() => navigate('/rescuer-feed')} 
                    className="w-full bg-emerald-600 text-white font-bold py-3.5 rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-900/20"
                >
                    Go to Rescuer Feed
                </button>
            </motion.div>
        </div>
      );
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 50 } }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-slate-950 pt-24 pb-12 px-4 md:px-8 font-sans">
      
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-[80vh] h-[80vh] bg-orange-500/10 rounded-full blur-[100px] pointer-events-none -translate-y-1/2 translate-x-1/2"></div>
      <div className="absolute bottom-0 left-0 w-[60vh] h-[60vh] bg-blue-500/5 rounded-full blur-[100px] pointer-events-none translate-y-1/2 -translate-x-1/2"></div>

      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-16 items-start">
            
            {/* LEFT SIDE: Visuals & Context */}
            <motion.div 
                initial="hidden"
                animate="visible"
                variants={containerVariants}
                className="flex-1 lg:sticky lg:top-28 pt-4"
            >
                <motion.div variants={itemVariants} className="inline-flex items-center gap-2 bg-slate-900/50 backdrop-blur-md border border-white/5 px-4 py-2 rounded-full shadow-sm mb-8">
                    <AlertTriangle size={16} className="text-orange-500 fill-orange-500/20" />
                    <span className="text-sm font-bold text-slate-300">Urgent Help Needed</span>
                </motion.div>

                <motion.h1 variants={itemVariants} className="text-5xl md:text-7xl font-black text-white mb-6 leading-[1.1] tracking-tight">
                    Every Second <br/>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-200">Counts.</span>
                </motion.h1>
                
                <motion.p variants={itemVariants} className="text-xl text-slate-400 mb-10 leading-relaxed max-w-xl font-medium">
                    Your quick action can save a life. Use this form to alert our network of rescuers immediately.
                </motion.p>

                {/* Hero Image */}
                <motion.div variants={itemVariants} className="relative rounded-3xl overflow-hidden shadow-2xl border border-white/10 mb-8 max-w-lg group">
                    <div className="absolute inset-0 bg-slate-900/20 group-hover:bg-slate-900/0 transition-colors duration-500 z-10"></div>
                    <img 
                        src="https://images.unsplash.com/photo-1535930749574-1399327ce78f?q=80&w=1000" 
                        alt="Injured dog needing help" 
                        className="w-full h-auto object-cover grayscale-[30%] group-hover:grayscale-0 transition-all duration-700 scale-105 group-hover:scale-100"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent z-20"></div>
                    <div className="absolute bottom-6 left-6 text-white z-30">
                        <div className="flex items-center gap-2 font-bold mb-1">
                            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                            <span className="text-red-400 text-sm uppercase tracking-wider">Live & Active</span>
                        </div>
                        <p className="text-lg font-bold text-white/90">Rescuers are standing by</p>
                    </div>
                </motion.div>

                <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-lg">
                    <div className="bg-slate-900/50 p-5 rounded-2xl border border-white/5 flex items-start gap-4">
                        <div className="p-3 bg-slate-800 rounded-xl text-orange-400">
                            <MapPin size={24} />
                        </div>
                        <div>
                            <h4 className="font-bold text-white">Pin Location</h4>
                            <p className="text-sm text-slate-400 mt-1">Precise coordinates are vital.</p>
                        </div>
                    </div>
                    <div className="bg-slate-900/50 p-5 rounded-2xl border border-white/5 flex items-start gap-4">
                        <div className="p-3 bg-slate-800 rounded-xl text-amber-400">
                            <Camera size={24} />
                        </div>
                        <div>
                            <h4 className="font-bold text-white">Snap Photo</h4>
                            <p className="text-sm text-slate-400 mt-1">Help us assess the situation.</p>
                        </div>
                    </div>
                </motion.div>
            </motion.div>

            {/* RIGHT SIDE: The Form */}
            <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="flex-1 w-full max-w-2xl"
            >
                <div className="bg-white/90 backdrop-blur-xl border border-white/20 p-6 md:p-8 rounded-[2.5rem] shadow-2xl shadow-black/50">
                    
                    <h3 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <span className="w-8 h-1 bg-orange-500 rounded-full"></span>
                        Submit Report
                    </h3>

                    <AnimatePresence>
                        {msg && (
                            <motion.div 
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className={`flex items-center gap-3 p-4 rounded-xl mb-6 ${msg.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'}`}
                            >
                                {msg.type === 'success' ? <Shield size={20} /> : <AlertTriangle size={20} />}
                                <span className="font-medium">{msg.text}</span>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <form onSubmit={handleSubmit} className="space-y-8">
                        
                        {/* Urgency */}
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Urgency Level</label>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {urgencyLevels.map((level) => (
                                    <button
                                        key={level.id}
                                        type="button"
                                        onClick={() => setUrgency(level.id)}
                                        className={`py-3 px-2 rounded-xl text-sm font-bold transition-all duration-300 ${
                                            urgency === level.id 
                                                ? `${level.color} text-white shadow-lg scale-105` 
                                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                        }`}
                                    >
                                        {level.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Location */}
                        <div className="space-y-4">
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">Location</label>
                            
                            <div className="h-64 w-full rounded-2xl overflow-hidden border-2 border-slate-100 shadow-inner relative group">
                                <div className="absolute inset-0 z-0">
                                   <MapPicker onLocationSelect={(loc) => setCoords(loc)} />
                                </div>
                                {!coords && (
                                    <div className="absolute inset-0 pointer-events-none bg-slate-900/5 flex items-center justify-center">
                                        <div className="bg-white/90 backdrop-blur px-4 py-2 rounded-full shadow-sm text-xs font-bold text-slate-500 flex items-center gap-2">
                                            <Navigation size={14} /> Tap map to pin
                                        </div>
                                    </div>
                                )}
                            </div>
                            
                            <div className="relative">
                                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                <input 
                                    type="text" 
                                    placeholder="Add address details (e.g. Opposite the park)..."
                                    value={locationName}
                                    onChange={(e) => setLocationName(e.target.value)}
                                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 outline-none focus:ring-2 focus:ring-orange-400 transition-all placeholder:text-slate-400 focus:bg-white"
                                />
                            </div>
                        </div>

                        {/* Photo + Rescuer Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            
                             {/* Photo */}
                            <div>
                                 <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Photo</label>
                                 <div 
                                    onClick={() => fileInputRef.current?.click()}
                                    className={`relative h-28 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden ${
                                        imagePreview 
                                            ? 'border-orange-500 bg-orange-50' 
                                            : 'border-slate-300 hover:border-orange-400 hover:bg-orange-50/10 bg-slate-50'
                                    }`}
                                 >
                                    {imagePreview ? (
                                        <>
                                            <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                            <button 
                                                onClick={removeImage}
                                                className="absolute top-2 right-2 p-1 bg-white rounded-full shadow-md text-rose-500 hover:bg-rose-50 transition-colors"
                                            >
                                                <X size={16} />
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <Upload size={24} className="text-slate-400 mb-2" />
                                            <span className="text-xs font-bold text-slate-500">Tap to Upload</span>
                                        </>
                                    )}
                                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                                 </div>
                            </div>
                            
                             {/* Rescuer Select */}
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Notify Who?</label>
                                <div className="relative">
                                    <select 
                                        value={selectedRescuer}
                                        onChange={(e) => setSelectedRescuer(e.target.value)}
                                        required
                                        className="w-full h-28 p-4 bg-slate-50 border border-slate-200 rounded-2xl font-medium text-slate-700 outline-none focus:ring-2 focus:ring-orange-400 transition-all appearance-none resize-none pt-4 align-top focus:bg-white"
                                        size={4}
                                    >
                                        <option value="" disabled className="text-slate-400 pb-2">Select a rescuer...</option>
                                        {rescuers.map(r => (
                                            <option key={r.id} value={r.id} className="py-2 px-2 rounded-lg hover:bg-orange-50 cursor-pointer">
                                                {r.full_name || 'Agencies'} ({r.location || 'All Areas'})
                                            </option>
                                        ))}
                                    </select>
                                    <div className="absolute right-4 top-4 pointer-events-none text-slate-400">
                                        <Info size={16} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Details */}
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Additional Details</label>
                            <textarea 
                                rows="3"
                                placeholder="Describe the situation, behavior, or visible injuries..."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                required
                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-medium text-slate-700 outline-none focus:ring-2 focus:ring-orange-400 transition-all placeholder:text-slate-400 resize-none focus:bg-white"
                            />
                        </div>

                        {/* Submit */}
                        <motion.button 
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            type="submit" 
                            disabled={loading}
                            className={`w-full py-4 rounded-xl font-bold text-lg text-white shadow-xl shadow-orange-500/30 transition-all flex items-center justify-center gap-2 ${
                                loading ? 'bg-slate-400 cursor-not-allowed' : 'bg-gradient-to-r from-orange-600 to-amber-600 hover:shadow-2xl'
                            }`}
                        >
                            {loading ? (
                                <>Sending Report...</>
                            ) : (
                                <>Submit Report <Send size={20} /></>
                            )}
                        </motion.button>

                    </form>
                </div>
            </motion.div>

        </div>
      </div>
    </div>
  );
}
