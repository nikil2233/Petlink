import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { MapPin, Camera, AlertTriangle, Send, X, Shield, Info, Heart } from 'lucide-react';
import MapPicker from '../components/MapPicker';
import { useAuth } from '../context/AuthContext';

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
          const { data, error } = await supabase
            .from('profiles')
            .select('id, full_name, role, location, address, latitude, longitude')
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

    const { data, error } = await supabase.storage
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

  if (authLoading) return <div className="page-container flex justify-center items-center"><p className="text-primary font-bold">Loading...</p></div>;

  // --- STYLES FOR GLASS EFFECT UI ---
  const glassCardStyle = {
    background: 'rgba(255, 255, 255, 0.65)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderRadius: '2rem',
    border: '1px solid rgba(255, 255, 255, 0.8)',
    boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
    overflow: 'hidden'
  };

  const glassInputStyle = {
    background: 'rgba(255, 255, 255, 0.8)',
    border: '1px solid rgba(255, 255, 255, 0.6)',
    borderRadius: '1rem',
    padding: '1rem',
    width: '100%',
    backdropFilter: 'blur(5px)',
    fontSize: '1rem',
    color: '#334155',
    outline: 'none',
    transition: 'all 0.3s'
  };

  const getUrgencyButtonStyle = (level) => {
      const isSelected = urgency === level;
      const base = {
          flex: 1,
          padding: '1rem 0.5rem',
          borderRadius: '1rem',
          border: 'none',
          fontWeight: 'bold',
          textTransform: 'uppercase',
          fontSize: '0.85rem',
          cursor: 'pointer',
          transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
          boxShadow: isSelected ? '0 10px 20px rgba(0,0,0,0.15)' : '0 4px 6px rgba(0,0,0,0.05)',
          transform: isSelected ? 'translateY(-3px)' : 'none',
          color: isSelected ? 'white' : '#64748b'
      };

      const colors = {
          low: isSelected ? 'linear-gradient(135deg, #14b8a6, #0d9488)' : 'rgba(255,255,255,0.7)',
          medium: isSelected ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'rgba(255,255,255,0.7)',
          high: isSelected ? 'linear-gradient(135deg, #f97316, #ea580c)' : 'rgba(255,255,255,0.7)',
          critical: isSelected ? 'linear-gradient(135deg, #f43f5e, #be123c)' : 'rgba(255,255,255,0.7)',
      };

      return { ...base, background: colors[level] };
  };

  if (!session) {
    return (
      <div className="page-container flex items-center justify-center" style={{ 
          backgroundImage: 'linear-gradient(120deg, #84fab0 0%, #8fd3f4 100%)',
          minHeight: '100vh',
          paddingBottom: 0
      }}>
          <div style={{ ...glassCardStyle, padding: '3rem', maxWidth: '500px', textAlign: 'center' }}>
              <Shield size={64} className="text-primary mb-4 mx-auto" style={{ filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' }} />
              <h2 className="text-3xl font-bold mb-3" style={{ color: '#0f172a' }}>Welcome to PetLink</h2>
              <p className="text-muted text-lg mb-8">Please log in to report a stray animal.</p>
              <button 
                onClick={() => navigate('/auth')} 
                className="btn" 
                style={{ 
                    background: 'linear-gradient(45deg, #fbbf24, #f59e0b)', 
                    color: 'white', 
                    width: '100%', 
                    padding: '1rem', 
                    fontSize: '1.1rem',
                    boxShadow: '0 10px 20px rgba(245, 158, 11, 0.3)'
                }}
              >
                  Login / Sign Up
              </button>
          </div>
      </div>
    );
  }

  if (userRole !== 'user') {
      return (
        <div className="page-container flex items-center justify-center" style={{ background: '#f8fafc' }}>
            <div style={{ ...glassCardStyle, padding: '3rem', maxWidth: '500px', textAlign: 'center' }}>
                <Shield size={64} className="text-secondary mb-4 mx-auto" />
                <h2 className="mb-2">Restricted Access</h2>
                <p className="text-muted mb-6">Only Citizens can submit rescue reports.</p>
                <button onClick={() => navigate('/rescuer-feed')} className="btn btn-primary w-full shadow-lg">Go to Rescuer Feed</button>
            </div>
        </div>
      );
  }

  return (
    <div style={{ 
        minHeight: '100vh',
        width: '100%',
        marginTop: '0px', 
        paddingTop: '80px', // Header offset
        paddingBottom: '40px',
        paddingLeft: '20px',
        paddingRight: '20px',
        background: 'url("https://images.unsplash.com/photo-1548199973-03cce0bbc87b?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80") no-repeat center center fixed',
        backgroundSize: 'cover',
    }}>
      {/* Dark overlay for readability */}
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.2)', zIndex: 0 }}></div>

      <div className="container" style={{ position: 'relative', zIndex: 1, maxWidth: '1200px' }}>
          
        <div style={{ ...glassCardStyle, display: 'flex', flexDirection: 'column', mdFlexDirection: 'row', minHeight: '80vh' }}>
            
            {/* LEFT SIDE: Visuals & Intro (Desktop only actually visually split, on mobile standard stack) */}
            <div style={{ 
                flex: '1', 
                background: 'rgba(255,255,255,0.4)', 
                padding: '3rem', 
                display: 'flex', 
                flexDirection: 'column', 
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden'
            }}>
                {/* Decorative blobs */}
                <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '200px', height: '200px', background: 'rgba(245, 158, 11, 0.2)', borderRadius: '50%', filter: 'blur(40px)' }}></div>
                <div style={{ position: 'absolute', bottom: '10%', right: '-10%', width: '300px', height: '300px', background: 'rgba(20, 184, 166, 0.2)', borderRadius: '50%', filter: 'blur(50px)' }}></div>

                <div style={{ position: 'relative', zIndex: 10 }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'white', padding: '0.5rem 1rem', borderRadius: '50px', boxShadow: '0 4px 10px rgba(0,0,0,0.05)', marginBottom: '2rem' }}>
                        <Heart size={16} className="text-accent" fill="currentColor" />
                        <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#475569' }}>Save a Life Today</span>
                    </div>

                    <h1 style={{ fontSize: '3.5rem', lineHeight: '1.1', marginBottom: '1.5rem', background: 'linear-gradient(45deg, #1e293b, #475569)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        Notify a <br/><span style={{ color: '#f59e0b', WebkitTextFillColor: '#f59e0b' }}>Rescuer</span>
                    </h1>
                    
                    <p style={{ fontSize: '1.15rem', color: '#475569', marginBottom: '3rem', lineHeight: '1.6' }}>
                        Found a furry friend in trouble? Use this form to alert nearby shelters immediately. Your small action makes a huge difference.
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                        <div style={{ background: 'rgba(255,255,255,0.6)', padding: '1rem', borderRadius: '1rem' }}>
                            <MapPin className="text-primary mb-2" size={24} />
                            <h4 className="mb-1">Pin Location</h4>
                            <p className="text-sm text-muted">Exact coords help us find them.</p>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.6)', padding: '1rem', borderRadius: '1rem' }}>
                            <Camera className="text-secondary mb-2" size={24} />
                            <h4 className="mb-1">Snap Photo</h4>
                            <p className="text-sm text-muted">Visuals help assess urgency.</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* RIGHT SIDE: The Form */}
            <div style={{ flex: '1.2', padding: '3rem', background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(30px)' }}>
                {msg && (
                    <div className={`alert ${msg.type === 'success' ? 'success' : 'error'} mb-6`} style={{ borderRadius: '1rem' }}>
                        {msg.type === 'success' ? <Shield size={18} /> : <AlertTriangle size={18} />}
                        <span>{msg.text}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    
                    {/* Urgency */}
                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '800', letterSpacing: '0.05em', color: '#94a3b8', marginBottom: '0.75rem' }}>URGENCY LEVEL</label>
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            {['low', 'medium', 'high', 'critical'].map((level) => (
                                <button
                                    key={level}
                                    type="button"
                                    onClick={() => setUrgency(level)}
                                    style={getUrgencyButtonStyle(level)}
                                >
                                    {level}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Location */}
                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '800', letterSpacing: '0.05em', color: '#94a3b8', marginBottom: '0.75rem' }}>LOCATION</label>
                        <div style={{ borderRadius: '1.5rem', overflow: 'hidden', border: '2px solid white', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', marginBottom: '1rem' }}>
                           <div style={{ height: '200px', width: '100%' }}>
                                <MapPicker onLocationSelect={(loc) => setCoords(loc)} />
                           </div>
                        </div>
                        <input 
                            type="text" 
                            style={glassInputStyle}
                            placeholder="Add address details (e.g. Opposite the park)..."
                            value={locationName}
                            onChange={(e) => setLocationName(e.target.value)}
                        />
                    </div>

                    {/* Photo + Description Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                        <div>
                             <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '800', letterSpacing: '0.05em', color: '#94a3b8', marginBottom: '0.75rem' }}>PHOTO</label>
                             <div 
                                onClick={() => fileInputRef.current && fileInputRef.current.click()}
                                style={{ 
                                    height: '120px', 
                                    border: '2px dashed #cbd5e1', 
                                    borderRadius: '1.5rem', 
                                    display: 'flex', 
                                    flexDirection: 'column',
                                    alignItems: 'center', 
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    background: imagePreview ? `url(${imagePreview}) center/cover` : '#f8fafc',
                                    position: 'relative',
                                    transition: 'all 0.2s'
                                }}
                                className="hover:border-primary"
                             >
                                {!imagePreview && (
                                    <>
                                        <Camera size={24} className="text-muted mb-2" />
                                        <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#94a3b8' }}>Upload</span>
                                    </>
                                )}
                                {imagePreview && (
                                    <div onClick={removeImage} style={{ position: 'absolute', top: -5, right: -5, background: 'white', borderRadius: '50%', padding: '0.25rem', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }}>
                                        <X size={14} className="text-danger" />
                                    </div>
                                )}
                                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
                             </div>
                        </div>
                        
                        <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '800', letterSpacing: '0.05em', color: '#94a3b8', marginBottom: '0.75rem' }}>RESCUER</label>
                            <div style={{ position: 'relative' }}>
                                <select 
                                    value={selectedRescuer}
                                    onChange={(e) => setSelectedRescuer(e.target.value)}
                                    style={{ ...glassInputStyle, height: '120px', paddingTop: '1rem', appearance: 'none' }}
                                    required
                                >
                                    <option value="">Select...</option>
                                    {rescuers.map(r => (
                                        <option key={r.id} value={r.id}>{r.full_name}</option>
                                    ))}
                                </select>
                                <Info style={{ position: 'absolute', top: '1rem', right: '1rem', pointerEvents: 'none', color: '#94a3b8' }} size={16} />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '800', letterSpacing: '0.05em', color: '#94a3b8', marginBottom: '0.75rem' }}>DETAILS</label>
                        <textarea 
                            style={glassInputStyle}
                            rows="2"
                            placeholder="Describe the animal or situation..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            required
                        />
                    </div>

                    <button 
                        type="submit" 
                        disabled={loading}
                        style={{ 
                            background: 'linear-gradient(135deg, #2563eb, #4f46e5)',
                            color: 'white',
                            border: 'none',
                            padding: '1.25rem',
                            borderRadius: '1.5rem',
                            fontSize: '1.1rem',
                            fontWeight: 'bold',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                            boxShadow: '0 10px 25px -5px rgba(79, 70, 229, 0.4)',
                            marginTop: '1rem',
                            cursor: 'pointer',
                            transition: 'transform 0.2s'
                        }}
                    >
                        {loading ? 'Sending...' : <>Submit Report <Send size={20} /></>}
                    </button>

                </form>
            </div>

        </div>
      </div>
    </div>
  );
}
