import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { User, MapPin, Mail, Save, Building, Stethoscope, HeartHandshake, Camera, FileText, Target, Lock, Shield } from 'lucide-react';
import MapPicker from '../components/MapPicker';

export default function Profile() {
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  
  // Password Update State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdMsg, setPwdMsg] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchProfile(session.user.id, session);
      } else {
        navigate('/auth');
      }
    });
  }, [navigate]);

  const fetchProfile = async (userId, currentSession) => {
    // Failsafe: Stop loading after 10 seconds if it hangs
    const timeoutId = setTimeout(() => {
        setLoading(false);
        setError("Request timed out. Please check your connection.");
    }, 10000);

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        throw error;
      }
      
      if (data) {
          setProfile(data);
          if (data.avatar_url) {
            setAvatarPreview(data.avatar_url);
          }
      } else {
          // No profile found, initialize default for creation
          console.warn("Profile not found, initializing default.");
          setProfile({
              id: userId,
              role: 'user', // Default, user can probably not change this easily here but let's see
              email: currentSession.user.email,
              full_name: '',
              about: '',
              location: '',
              address: ''
          });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      setError("Failed to load profile. Please try refreshing.");
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const uploadAvatar = async (file) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${session.user.id}-${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;
    
    let bucket = 'avatars';
    
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
       console.warn("Upload to 'avatars' failed, using default bucket?");
       // Fallback or just throw
    }

    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setUpdating(true);
    setMessage(null);
    setError(null);

    try {
      let avatarUrl = profile.avatar_url;

      if (avatarFile) {
        avatarUrl = await uploadAvatar(avatarFile);
      }

      const updates = {
        id: session.user.id,
        email: profile.email, // Required for upsert if row doesn't exist
        full_name: profile.full_name,
        location: profile.location,
        address: profile.address,
        avatar_url: avatarUrl,
        about: profile.about,
        goal: profile.goal,
        latitude: profile.latitude,
        longitude: profile.longitude
      };

      const { error } = await supabase.from('profiles').upsert(updates);

      if (error) {
        throw error;
      }
      setMessage('Profile updated successfully!');
    } catch (error) {
      console.error(error);
      setError('Error updating profile: ' + error.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleChangePassword = async (e) => {
      e.preventDefault();
      if (newPassword !== confirmPassword) {
          setPwdMsg({ type: 'error', text: "Passwords do not match." });
          return;
      }
      if (newPassword.length < 8) {
          setPwdMsg({ type: 'error', text: "Password must be at least 8 characters." });
          return;
      }

      try {
          const { error } = await supabase.auth.updateUser({ password: newPassword });
          if (error) throw error;
          setPwdMsg({ type: 'success', text: "Password updated successfully!" });
          setNewPassword('');
          setConfirmPassword('');
      } catch (err) {
          setPwdMsg({ type: 'error', text: err.message });
      }
  };

  const getRoleIcon = (role) => {
    switch(role) {
      case 'user': return <User size={24} className="text-primary" />;
      case 'rescuer': return <HeartHandshake size={24} className="text-primary" />;
      case 'shelter': return <Building size={24} className="text-primary" />;
      case 'vet': return <Stethoscope size={24} className="text-primary" />;
      default: return <User size={24} className="text-primary" />;
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

  if (loading) {
    return (
      <div className="page-container flex justify-center items-center h-[50vh]">
        <p className="text-muted text-lg">Loading profile...</p>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="page-container flex justify-center">
      <div className="glass-panel w-full max-w-3xl p-8">
        <div className="flex items-center gap-4 mb-8 border-b border-border pb-6">
          <div className="p-4 bg-primary/10 rounded-full">
            {getRoleIcon(profile.role)}
          </div>
          <div>
            <h1 className="text-2xl font-bold m-0">My Profile</h1>
            <p className="text-muted m-0">Manage your account settings as a {getRoleLabel(profile.role)}</p>
          </div>
        </div>

        {message && (
          <div className="alert alert-success mb-6">
            {message}
          </div>
        )}

        {error && (
            <div className="alert alert-error mb-6">
                {error}
            </div>
        )}

        <form onSubmit={handleUpdate} className="flex flex-col gap-6">
          
          {/* Avatar Upload */}
          <div className="flex justify-center mb-4">
             <div className="relative group">
                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-md bg-slate-100 flex items-center justify-center">
                    {avatarPreview ? (
                        <img src={avatarPreview} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                        <User size={64} className="text-slate-400" />
                    )}
                </div>
                <label 
                    htmlFor="avatar-upload"
                    className="absolute bottom-0 right-0 bg-primary text-white p-2 rounded-full cursor-pointer shadow-md hover:bg-primary-dark transition-colors flex items-center justify-center"
                >
                    <Camera size={18} />
                    <input id="avatar-upload" type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                </label>
             </div>
          </div>

          {/* Read Only Fields */}
          <div className="opacity-70">
            <label className="text-sm font-semibold mb-1 block">Email Address</label>
            <div className="relative">
                <Mail size={18} className="absolute top-1/2 left-4 -translate-y-1/2 text-muted" />
                <input type="email" value={profile.email} disabled className="form-input pl-10 bg-slate-50 cursor-not-allowed" />
            </div>
          </div>

          {/* Editable Fields */}
          <div>
            <label className="text-sm font-semibold mb-1 block">{profile.role === 'shelter' ? 'Shelter Name' : profile.role === 'vet' ? 'Clinic / Vet Name' : 'Full Name'}</label>
            <div className="relative">
                <User size={18} className="absolute top-1/2 left-4 -translate-y-1/2 text-muted" />
                <input type="text" name="full_name" value={profile.full_name || ''} onChange={handleChange} className="form-input pl-10" required />
            </div>
          </div>

           <div>
            <label className="text-sm font-semibold mb-1 block">About / Bio</label>
            <div className="relative">
                <FileText size={18} className="absolute top-4 left-4 text-muted" />
                <textarea rows="3" name="about" value={profile.about || ''} onChange={handleChange} className="form-textarea pl-10" placeholder="Tell us about yourself..." />
            </div>
          </div>

          {(profile.role !== 'user') && (
            <>
                <div>
                     <label className="text-sm font-semibold mb-1 block">Mission / Goal</label>
                     <div className="relative">
                         <Target size={18} className="absolute top-4 left-4 text-muted" />
                         <textarea rows="2" name="goal" value={profile.goal || ''} onChange={handleChange} className="form-textarea pl-10" placeholder="Organization goal?" />
                     </div>
                </div>
                <div>
                    <label className="text-sm font-semibold mb-1 block">Location Name (City/Area)</label>
                    <div className="relative">
                        <MapPin size={18} className="absolute top-1/2 left-4 -translate-y-1/2 text-muted" />
                        <input type="text" name="location" value={profile.location || ''} onChange={handleChange} className="form-input pl-10" placeholder="e.g. Colombo" />
                    </div>
                </div>
                <div>
                    <label className="text-sm font-semibold mb-1 block">Address</label>
                    <textarea rows="3" name="address" value={profile.address || ''} onChange={handleChange} className="form-textarea" placeholder="Address..." />
                </div>
                
                {/* Map Picker for Exact Location */}
                <div className="mt-2">
                    <label className="flex items-center gap-2 mb-2 font-semibold text-primary">
                        <MapPin size={18} /> Exact Location on Map
                    </label>
                    <div className="h-[300px] rounded-lg overflow-hidden border border-border shadow-inner">
                        <MapPicker 
                            initialLocation={profile.latitude && profile.longitude ? { lat: profile.latitude, lng: profile.longitude } : null}
                            onLocationSelect={(loc) => {
                                setProfile(prev => ({ ...prev, latitude: loc.lat, longitude: loc.lng }));
                            }}
                        />
                    </div>
                    <p className="text-xs text-muted mt-2">
                        Click on the map to set your exact location so users can find you.
                    </p>
                </div>
            </>
          )}

          <div className="pt-6 border-t border-border mt-2">
            <button type="submit" className="btn btn-primary w-full justify-center text-lg py-3" disabled={updating}>
                {updating ? 'Saving...' : <><Save size={20} /> Save Changes</>}
            </button>
          </div>
        </form>

        {/* Security Section (Change Password) */}
        <div className="mt-12 pt-8 border-t border-border">
            <h3 className="flex items-center gap-2 mb-4 text-lg font-bold text-slate-800">
                <Shield size={20} /> Security
            </h3>
            <div className="bg-subtle p-6 rounded-xl border border-border">
                <h4 className="m-0 mb-4 font-bold">Change Password</h4>
                {pwdMsg && (
                    <div className={`mb-4 p-3 rounded-lg text-sm font-medium ${
                        pwdMsg.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
                    }`}>
                        {pwdMsg.text}
                    </div>
                )}
                <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
                    <div>
                        <label className="text-sm font-semibold mb-1 block">New Password</label>
                        <div className="relative">
                            <Lock size={16} className="absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
                            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="form-input pl-9" placeholder="Min 8 chars" />
                        </div>
                    </div>
                    <div>
                        <label className="text-sm font-semibold mb-1 block">Confirm Password</label>
                        <div className="relative">
                             <Lock size={16} className="absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
                            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="form-input pl-9" placeholder="Repeat password" />
                        </div>
                    </div>
                    <button type="submit" className="btn btn-secondary self-start">Update Password</button>
                </form>
            </div>
        </div>

      </div>
    </div>
  );
}
