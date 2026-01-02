import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { MapPin, Camera, AlertCircle, Send, X, Shield } from 'lucide-react';
import MapPicker from '../components/MapPicker';

import { useAuth } from '../context/AuthContext';

export default function NotifyRescuer() {
  const navigate = useNavigate();
  const { session, role: userRole, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  
  // Data
  const [rescuers, setRescuers] = useState([]);

  // Form Fields
  const [description, setDescription] = useState('');
  const [locationName, setLocationName] = useState(''); // Text description
  const [coords, setCoords] = useState(null); // { lat, lng }
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

  const getSelectedRescuerDetails = () => {
      return rescuers.find(r => r.id === selectedRescuer);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const uploadImage = async (file) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { data, error } = await supabase.storage
      .from('rescue-images')
      .upload(filePath, file);

    if (error) throw error;

    // Get Public URL
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
        // 0. ENSURE PROFILE EXISTS
        const { error: profileError } = await supabase
            .from('profiles')
            .upsert(
                { id: session.user.id, email: session.user.email },
                { onConflict: 'id', ignoreDuplicates: true }
            );
        
        if (profileError) {
             console.warn("Could not ensure profile exists:", profileError);
        }

        // 1. Upload Image (if any)
        let finalImageUrl = null;
        if (imageFile) {
            finalImageUrl = await uploadImage(imageFile);
        }

        // 2. Submit Report
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

      setMsg({ type: 'success', text: 'Report submitted successfully! The rescuer has been notified.' });
      setDescription('');
      setLocationName('');
      setCoords(null);
      setUrgency('medium');
      setSelectedRescuer('');
      removeImage();
    } catch (err) {
      console.error(err);
      setMsg({ type: 'error', text: 'Failed to submit report. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="page-container flex items-center justify-center">
        <div className="p-8">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="page-container flex items-center justify-center">
          <div className="glass-panel p-12 max-w-lg text-center mx-auto">
              <Shield size={48} className="mx-auto mb-4 text-primary" />
              <h2 className="mb-2">Please Log In</h2>
              <p className="text-muted mb-8">You need to be logged in to notify a rescuer.</p>
              <button onClick={() => navigate('/auth')} className="btn btn-primary">Login / Sign Up</button>
          </div>
      </div>
    );
  }

  // Access Denied for Non-Citizens (i.e., NGOs)
  // 'user' role corresponds to 'citizen' based on Auth.jsx logic
  if (userRole !== 'user') {
      return (
        <div className="page-container flex items-center justify-center">
            <div className="glass-panel p-12 max-w-lg text-center mx-auto">
                <Shield size={48} className="mx-auto mb-4 text-primary" />
                <h2 className="mb-2">Restricted Access</h2>
                <p className="text-muted mb-8">Only Citizens can submit rescue reports. As a Rescuer/Shelter/Vet, you receive these reports.</p>
                <button onClick={() => navigate('/rescuer-feed')} className="btn btn-primary">Go to Rescuer Feed</button>
            </div>
        </div>
      );
  }

  return (
    <div className="page-container">
      <div className="max-w-4xl mx-auto">
        <h1 className="mb-8">Notify a Rescuer</h1>
        
        {msg && (
           <div className={`alert mb-6 ${msg.type === 'success' ? 'alert-success' : 'alert-error'}`}>
             {msg.text}
           </div>
        )}

        <form onSubmit={handleSubmit} className="glass-panel p-8 flex flex-col gap-8">
          
          {/* Section 1: Urgency & Description */}
          <div className="grid grid-cols-1 md:grid-cols-1 gap-8">
             
             <div>
                <label className="form-label">Urgency Level</label>
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {['low', 'medium', 'high', 'critical'].map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setUrgency(level)}
                      className={`p-3 rounded-lg border font-semibold capitalize transition-all ${
                        urgency === level 
                          ? (level === 'critical' ? 'bg-danger text-white border-danger' : 'bg-primary text-white border-primary')
                          : 'bg-subtle border-border text-muted hover:bg-slate-200'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
             </div>

             <div className="form-group">
                <label className="form-label">Situation Description</label>
                <textarea 
                  className="form-textarea"
                  rows="3"
                  placeholder="Describe the animal's condition, injury, color, breed (if known)..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                />
             </div>
          </div>

          <div className="border-t border-border"></div>

          {/* Section 2: Rescuer Selection */}
          <div>
            <label className="flex items-center gap-2 mb-4 font-semibold">
                <Shield size={18} className="text-primary" /> Select Rescuer Organization
            </label>
            <select
                value={selectedRescuer}
                onChange={(e) => setSelectedRescuer(e.target.value)}
                className="form-select w-full"
                required
            >
                <option value="">-- Choose a Rescuer/Shelter --</option>
                {rescuers.map(r => (
                    <option key={r.id} value={r.id}>
                        {r.full_name || 'Unnamed Organization'} ({r.role}) {r.location ? `- ${r.location}` : ''}
                    </option>
                ))}
            </select>
            
            {selectedRescuer && (
                <div className="mt-4 p-4 bg-subtle rounded-lg border border-border">
                    <h4 className="mt-0 mb-2 text-base">Organization Details</h4>
                    {(() => {
                        const r = getSelectedRescuerDetails();
                        if (!r) return null;
                        return (
                            <div className="text-small text-muted">
                                <div className="mb-1"><strong>Location:</strong> {r.location || 'N/A'}</div>
                                <div className="mb-1"><strong>Address:</strong> {r.address || 'N/A'}</div>
                                {r.latitude && r.longitude && (
                                    <div className="mt-2">
                                        <a 
                                            href={`https://www.google.com/maps/search/?api=1&query=${r.latitude},${r.longitude}`} 
                                            target="_blank" 
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-1 text-primary no-underline font-semibold hover:underline"
                                        >
                                            <MapPin size={14} /> View on Map / Get Directions
                                        </a>
                                    </div>
                                )}
                            </div>
                        );
                    })()}
                </div>
            )}

            <p className="text-small text-muted mt-2">
                Choose the organization closest to the location or one you prefer.
            </p>
          </div>

          <div className="border-t border-border"></div>

          {/* Section 3: Location */}
          <div>
            <label className="flex items-center gap-2 mb-4 font-semibold">
                <MapPin size={18} className="text-primary" /> Location
            </label>
            
            <div className="mb-4">
                <MapPicker 
                    onLocationSelect={(loc) => {
                        setCoords(loc);
                    }} 
                />
                {coords && <p className="text-small text-secondary mt-2">Selected: {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}</p>}
            </div>

            <input 
              type="text" 
              className="form-input w-full"
              placeholder="Additional landmarks (e.g. Near the bus stop, opposite the bakery)..." 
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
            />
          </div>

          <div className="border-t border-border"></div>

          {/* Section 4: Photo */}
          <div>
            <label className="flex items-center gap-2 mb-4 font-semibold">
                <Camera size={18} className="text-primary" /> Photo Evidence
            </label>
            
            {!imagePreview ? (
                <div 
                    onClick={() => document.getElementById('file-upload').click()}
                    className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer bg-subtle transition-colors hover:border-primary"
                >
                    <Camera size={32} className="text-muted mb-2 mx-auto" />
                    <p className="text-muted">Click to take a photo or upload</p>
                    <input 
                        id="file-upload" 
                        type="file" 
                        accept="image/*" 
                        capture="environment" // Opens camera on mobile
                        onChange={handleImageChange}
                        className="hidden"
                    />
                </div>
            ) : (
                <div className="relative w-fit">
                    <img 
                        src={imagePreview} 
                        alt="Preview" 
                        className="max-w-full max-h-[300px] rounded-lg border border-border shadow-sm"
                    />
                    <button 
                        type="button"
                        onClick={removeImage}
                        className="absolute -top-2 -right-2 bg-danger text-white border-none rounded-full w-6 h-6 flex items-center justify-center cursor-pointer shadow-md hover:bg-red-600"
                    >
                        <X size={14} />
                    </button>
                </div>
            )}
          </div>

          <button type="submit" className="btn btn-primary mt-4 p-4" disabled={loading}>
            {loading ? 'Submitting Report...' : (
              <span className="flex items-center justify-center gap-2 text-lg">
                Submit Report <Send size={20} />
              </span>
            )}
          </button>

        </form>
      </div>
    </div>
  );
}
