import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { MapPin, Camera, AlertTriangle, Send, X, Shield, Info, Heart, Upload, Navigation, User, Phone, HeartHandshake } from 'lucide-react';
import MapPicker from '../components/MapPicker';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { compressImage } from '../utils/imageUtils';
import toast from 'react-hot-toast';

export default function NotifyRescuer() {
  const navigate = useNavigate();
  const { session, role: userRole, loading: authLoading } = useAuth();
  // Allow Admin to access this page too
  const hasAccess = userRole === 'user' || userRole === 'admin'; 
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  
  // Data
  const [rescuers, setRescuers] = useState([]);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  // Form Fields
  const [description, setDescription] = useState('');
  const [locationName, setLocationName] = useState(''); 
  const [coords, setCoords] = useState(null); 
  const [urgency, setUrgency] = useState('medium');
  const [selectedRescuer, setSelectedRescuer] = useState('');
  const [rescuerCoords, setRescuerCoords] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  // View Mode
  const [viewMode, setViewMode] = useState('create'); // 'create', 'list'
  const [myReports, setMyReports] = useState([]);
  
  // Re-assignment State
  const [reassignReport, setReassignReport] = useState(null);
  const [newRescuerId, setNewRescuerId] = useState('');

  const handleHandover = (reportId) => {
      toast((t) => (
          <div className="flex flex-col gap-2">
            <span className="font-bold text-slate-800">Did you hand over the animal?</span>
            <div className="flex gap-2 mt-2">
              <button 
                onClick={() => {
                  toast.dismiss(t.id);
                  confirmHandover(reportId);
                }}
                className="px-3 py-1 bg-emerald-500 text-white rounded-lg text-sm font-bold shadow-sm"
              >
                Yes, Handed Over
              </button>
              <button 
                onClick={() => toast.dismiss(t.id)}
                className="px-3 py-1 bg-slate-200 text-slate-700 rounded-lg text-sm font-bold"
              >
                Cancel
              </button>
            </div>
          </div>
      ), { duration: 5000 });
  };

  const confirmHandover = async (reportId) => {
      const toastId = toast.loading('Updating status...');
      try {
          const { error } = await supabase
              .from('reports')
              .update({ status: 'completed' }) 
              .eq('id', reportId);

          if (error) throw error;
          toast.success('Thank you! Rescue complete.', { id: toastId });
          fetchMyReports();
      } catch (err) {
          console.error("Error updating status:", err);
          toast.error('Failed to update status.', { id: toastId });
      }
  };

  const handleReassignSubmit = async () => {
      if (!newRescuerId) return;
      setLoading(true);
      try {
          const { error } = await supabase
              .from('reports')
              .update({ 
                  assigned_rescuer_id: newRescuerId,
                  status: 'pending'
              })
              .eq('id', reassignReport.id);

          if (error) throw error;

          setMsg({ type: 'success', text: 'Rescuer reassigned successfully!' });
          setReassignReport(null);
          setNewRescuerId('');
          fetchMyReports(); // Refresh list
      } catch (err) {
          console.error("Error reassigning:", err);
          setMsg({ type: 'error', text: 'Failed to reassign rescuer.' });
      } finally {
          setLoading(false);
      }
  };

  useEffect(() => {
    if (session) {
        fetchRescuers();
    }
  }, [session]);

  const fetchRescuers = async () => {
      try {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('role', 'rescuer');
          
          if (error) throw error;
          setRescuers(data || []);
      } catch (err) {
          console.error("Error fetching rescuers:", err);
      }
  };

  const fetchMyReports = async () => {
    if(!session?.user) return;
    setLoading(true);
    const { data, error } = await supabase
        .from('reports')
        .select('*, rescuer:assigned_rescuer_id(full_name)')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
    
    if(error) console.error("Error fetching reports:", error);
    else setMyReports(data || []);
    setLoading(false);
  };

  useEffect(() => {
      if(viewMode === 'list') {
          fetchMyReports();
      }
  }, [viewMode]);

  const geocodeLocation = async (locationStr) => {
    if (!locationStr) return;
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationStr)}&limit=1`);
        const data = await response.json();
        if (data && data.length > 0) {
            setRescuerCoords({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) });
        } else {
            console.warn("Could not geocode rescuer location:", locationStr);
            setRescuerCoords(null);
        }
    } catch (err) {
        console.error("Geocoding error:", err);
        setRescuerCoords(null);
    }
  };

  const handleRescuerChange = (e) => {
      const rescuerId = e.target.value;
      setSelectedRescuer(rescuerId);
      
      const rescuer = rescuers.find(r => r.id === rescuerId);
      if (rescuer && rescuer.location) {
          geocodeLocation(rescuer.location);
      } else {
          setRescuerCoords(null);
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
    let fileToUpload = file;
    try {
        fileToUpload = await compressImage(file);
    } catch (e) {
        console.error("Compression failed:", e);
    }

    const fileExt = fileToUpload.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error } = await supabase.storage
      .from('rescue-images')
      .upload(filePath, fileToUpload);

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
      setRescuerCoords(null);
      removeImage({ stopPropagation: () => {} });
      window.scrollTo(0,0);
    } catch (err) {
      console.error("DEBUG: NotifyRescuer Submission Error:", err);
      // Try to extract a more specific message if available
      const specificMsg = err.message || err.error_description || JSON.stringify(err);
      setMsg({ type: 'error', text: `Failed to submit report. Error: ${specificMsg}` });
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

  if (userRole !== 'user' && userRole !== 'admin') {
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
    <div className="min-h-screen relative overflow-hidden bg-slate-950 pt-12 pb-12 px-4 md:px-8 font-sans">
      
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
                <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl border border-white/20 dark:border-slate-700 p-6 md:p-8 rounded-[2.5rem] shadow-2xl shadow-black/50 transition-colors duration-300 relative z-20">
                    
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            <span className="w-8 h-1 bg-orange-500 rounded-full"></span>
                            {viewMode === 'create' ? 'Submit Report' : 'My Reports'}
                        </h3>
                        <div className="flex bg-slate-100 dark:bg-slate-700 rounded-lg p-1">
                            <button 
                                onClick={() => setViewMode('create')}
                                className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${viewMode === 'create' ? 'bg-white dark:bg-slate-600 shadow-sm text-orange-600' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'}`}
                            >
                                New Report
                            </button>
                            <button 
                                onClick={() => setViewMode('list')}
                                className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${viewMode === 'list' ? 'bg-white dark:bg-slate-600 shadow-sm text-orange-600' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'}`}
                            >
                                My Reports
                            </button>
                        </div>
                    </div>

                    <AnimatePresence>
                        {msg && (
                            <motion.div 
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className={`flex items-center gap-3 p-4 rounded-xl mb-6 ${msg.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30' : 'bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30'}`}
                            >
                                {msg.type === 'success' ? <Shield size={20} /> : <AlertTriangle size={20} />}
                                <span className="font-medium">{msg.text}</span>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {viewMode === 'create' && (
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
                                                : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                                        }`}
                                    >
                                        {level.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Rescuer Select (Moved) */}
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Notify Who?</label>
                            <div className="relative">
                                <select 
                                    value={selectedRescuer}
                                    onChange={handleRescuerChange}
                                    required
                                    className="w-full h-16 px-4 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-2xl font-medium text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-orange-400 transition-all appearance-none focus:bg-white dark:focus:bg-slate-600"
                                >
                                    <option value="" disabled className="text-slate-400">Select a rescuer...</option>
                                    {rescuers.map(r => (
                                        <option key={r.id} value={r.id} className="py-2">
                                            {r.full_name || 'Agencies'} ({r.location || 'All Areas'})
                                        </option>
                                    ))}
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                    <Info size={16} />
                                </div>
                            </div>
                            
                            {/* Selected Rescuer Details */}
                            {selectedRescuer && (() => {
                                const r = rescuers.find(res => res.id === selectedRescuer);
                                if (!r) return null;
                                return (
                                    <motion.div 
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="mt-4 bg-slate-50 dark:bg-slate-700/50 rounded-2xl p-4 border border-slate-200 dark:border-slate-600 shadow-sm"
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className="w-16 h-16 rounded-full bg-white dark:bg-slate-600 shadow-sm overflow-hidden shrink-0 border-2 border-white dark:border-slate-500 flex items-center justify-center">
                                                {r.avatar_url ? (
                                                    <img src={r.avatar_url} alt={r.full_name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <User size={32} className="text-slate-300 dark:text-slate-500" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-bold text-lg text-slate-800 dark:text-white truncate">{r.full_name || 'Rescuer'}</h4>
                                                
                                                <div className="flex flex-wrap gap-3 my-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                                                    {r.location && (
                                                        <span className="flex items-center gap-1 bg-white dark:bg-slate-800 px-2 py-1 rounded-md shadow-sm border border-slate-100 dark:border-slate-600">
                                                            <MapPin size={12} className="text-orange-500" /> {r.location}
                                                        </span>
                                                    )}
                                                    {r.phone && (
                                                        <span className="flex items-center gap-1 bg-white dark:bg-slate-800 px-2 py-1 rounded-md shadow-sm border border-slate-100 dark:border-slate-600">
                                                            <Phone size={12} className="text-emerald-500" /> {r.phone}
                                                        </span>
                                                    )}
                                                </div>

                                                {r.about && (
                                                    <p className="text-sm text-slate-600 dark:text-slate-300 italic bg-amber-50 dark:bg-amber-900/20 p-3 rounded-xl border border-amber-100 dark:border-amber-900/30">
                                                        "{r.about}"
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })()}
                        </div>

                        {/* Location */}
                        <div className="space-y-4">
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">Location</label>
                            
                            <div className="h-64 w-full rounded-2xl overflow-hidden border-2 border-slate-100 shadow-inner relative group">
                                <div className="absolute inset-0 z-0">
                                   <MapPicker onLocationSelect={(loc) => setCoords(loc)} rescuerLocation={rescuerCoords} />
                                </div>
                                {!coords && !rescuerCoords && (
                                    <div className="absolute inset-0 pointer-events-none bg-slate-900/5 dark:bg-slate-900/50 flex items-center justify-center">
                                        <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur px-4 py-2 rounded-full shadow-sm text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-2">
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
                                    className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl font-medium text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-orange-400 transition-all placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-600"
                                />
                            </div>
                        </div>

                        {/* Photo (Full Width) */}
                        <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Photo</label>
                                <div 
                                onClick={() => fileInputRef.current?.click()}
                                className={`relative h-40 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden ${
                                    imagePreview 
                                        ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20' 
                                        : 'border-slate-300 dark:border-slate-600 hover:border-orange-400 hover:bg-orange-50/10 dark:hover:bg-orange-900/10 bg-slate-50 dark:bg-slate-700'
                                }`}
                                >
                                {imagePreview ? (
                                    <>
                                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                        <button 
                                            onClick={removeImage}
                                            className="absolute top-2 right-2 p-1 bg-white dark:bg-slate-800 rounded-full shadow-md text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
                                        >
                                            <X size={16} />
                                        </button>
                                    </>
                                ) : (
                                    <div className="flex flex-row gap-4 w-full h-full p-4">
                                        <div 
                                            onClick={(e) => { 
                                                e.stopPropagation(); 
                                                cameraInputRef.current?.click(); 
                                            }}
                                            className="flex-1 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/10 flex flex-col items-center justify-center transition-all group/cam"
                                        >
                                            <Camera size={24} className="text-slate-400 group-hover/cam:text-orange-500 transition-colors" />
                                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-2 group-hover/cam:text-orange-500">Take Photo</span>
                                        </div>
                                        <div 
                                            onClick={(e) => { 
                                                e.stopPropagation(); 
                                                fileInputRef.current?.click(); 
                                            }}
                                            className="flex-1 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10 flex flex-col items-center justify-center transition-all group/up"
                                        >
                                            <Upload size={24} className="text-slate-400 group-hover/up:text-blue-500 transition-colors" />
                                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-2 group-hover/up:text-blue-500">Upload File</span>
                                        </div>
                                    </div>
                                )}
                                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                                <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleImageChange} className="hidden" />
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
                                className="w-full p-4 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-2xl font-medium text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-orange-400 transition-all placeholder:text-slate-400 resize-none focus:bg-white dark:focus:bg-slate-600"
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
                    )}

                    {viewMode === 'list' && (
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="space-y-4"
                        >
                            {/* Declined Section */}
                            {myReports.filter(r => r.status === 'declined').length > 0 && (
                                <div className="mb-6">
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Declined Reports</h4>
                                    <div className="space-y-4">
                                        {myReports.filter(r => r.status === 'declined').map(report => (
                                            <div key={report.id} className="p-5 rounded-2xl bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/30">
                                                <div className="flex justify-between items-start mb-3">
                                                    <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400">
                                                        Declined
                                                    </span>
                                                    <div className="flex items-center gap-1 text-xs text-rose-400 font-bold">
                                                        {new Date(report.created_at).toLocaleDateString()}
                                                    </div>
                                                </div>
                                                <div className="mb-4">
                                                    <h4 className="font-bold text-slate-800 dark:text-white mb-1 truncate">{report.location || 'Pinned Location'}</h4>
                                                    <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2">{report.description}</p>
                                                    <p className="text-xs text-slate-400 mt-2">Previous Rescuer: <span className="text-slate-600 dark:text-slate-300 font-bold">{report.rescuer?.full_name || 'Unknown'}</span></p>
                                                </div>
                                                <button 
                                                    onClick={() => setReassignReport(report)}
                                                    className="w-full py-3 rounded-xl bg-rose-600 text-white font-bold shadow-lg shadow-rose-200 dark:shadow-rose-900/20 hover:bg-rose-700 transition-all text-sm"
                                                >
                                                    Select Another Rescuer
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="h-px bg-slate-200 dark:bg-slate-700 my-6"></div>
                                </div>
                            )}

                            {myReports.filter(r => r.status !== 'declined').length === 0 && myReports.filter(r => r.status === 'declined').length === 0 ? (
                                <div className="text-center py-12 text-slate-400 flex flex-col items-center">
                                    <div className="bg-slate-100 dark:bg-slate-700/50 p-4 rounded-full mb-3">
                                        <AlertTriangle size={32} className="text-slate-300 dark:text-slate-600" />
                                    </div>
                                    <p>You haven't submitted any reports yet.</p>
                                </div>
                            ) : (
                                myReports.filter(r => r.status !== 'declined').map(report => (
                                    <div key={report.id} className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-700/30 border border-slate-100 dark:border-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors">
                                        <div className="flex justify-between items-start mb-3">
                                             <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                                 report.status === 'pending' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                                                 report.status === 'assigned' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                                 report.status === 'accepted' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                                                 report.status === 'completed' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' :
                                                 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                                             }`}>
                                                 {report.status}
                                             </span>
                                             <div className="flex items-center gap-1 text-xs text-slate-400 font-bold">
                                                 <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                                                 {new Date(report.created_at).toLocaleDateString()}
                                             </div>
                                        </div>
                                        
                                        <div className="flex gap-4">
                                            {report.image_url && (
                                                <div className="w-16 h-16 rounded-xl bg-slate-200 overflow-hidden shrink-0">
                                                    <img src={report.image_url} alt="Report" className="w-full h-full object-cover" />
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-bold text-slate-800 dark:text-white mb-1 truncate flex items-center gap-2">
                                                    <MapPin size={14} className="text-slate-400" />
                                                    {report.location || 'Pinned Location'}
                                                </h4>
                                                <p className="text-sm text-slate-500 dark:text-slate-300 line-clamp-2">{report.description}</p>
                                            </div>
                                        </div>

                                        {report.rescuer && (
                                            <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700/50 flex flex-col gap-3">
                                                <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                                                   <span>Assigned to:</span>
                                                   <span className="text-slate-700 dark:text-slate-300 font-bold">{report.rescuer.full_name}</span>
                                                </div>
                                                
                                                {report.status === 'accepted' && (
                                                    <button 
                                                        onClick={() => handleHandover(report.id)}
                                                        className="w-full py-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-bold text-xs hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors flex items-center justify-center gap-2"
                                                    >
                                                        <HeartHandshake size={16} /> I gave the animal to Rescuer
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </motion.div>
                    )}
                </div>
            </motion.div>

        </div>
      </div>
      
      {/* Reassign Modal */}
      <AnimatePresence>
          {reassignReport && (
              <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[60] flex items-center justify-center p-4"
                  onClick={() => setReassignReport(null)}
              >
                  <motion.div 
                      initial={{ scale: 0.9, y: 20 }}
                      animate={{ scale: 1, y: 0 }}
                      exit={{ scale: 0.9, y: 20 }}
                      onClick={e => e.stopPropagation()}
                      className="bg-white dark:bg-slate-800 rounded-[2rem] p-6 max-w-sm w-full shadow-2xl relative"
                  >
                      <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-4">Select New Rescuer</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                          Previous rescuer declined. Please choose another rescuer or shelter for this report.
                      </p>
                      
                      <div className="mb-6">
                          <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Available Rescuers</label>
                          <select 
                              value={newRescuerId}
                              onChange={(e) => setNewRescuerId(e.target.value)}
                              className="w-full p-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl font-medium text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-orange-400"
                          >
                              <option value="" disabled>Select rescuer...</option>
                              {rescuers.filter(r => r.id !== reassignReport.assigned_rescuer_id).map(r => (
                                  <option key={r.id} value={r.id}>
                                      {r.full_name || 'Agencies'} ({r.location || 'All Areas'})
                                  </option>
                              ))}
                          </select>
                      </div>

                      <div className="flex gap-3">
                          <button 
                              onClick={() => setReassignReport(null)}
                              className="flex-1 py-3 rounded-xl font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                          >
                              Cancel
                          </button>
                          <button 
                              onClick={handleReassignSubmit}
                              disabled={!newRescuerId || loading}
                              className={`flex-1 py-3 rounded-xl font-bold text-white shadow-lg transition-all ${
                                  !newRescuerId || loading 
                                      ? 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed' 
                                      : 'bg-orange-600 hover:bg-orange-700 shadow-orange-500/30'
                              }`}
                          >
                              {loading ? 'Updating...' : 'Reassign'}
                          </button>
                      </div>
                  </motion.div>
              </motion.div>
          )}
      </AnimatePresence>
    </div>
  );
}
