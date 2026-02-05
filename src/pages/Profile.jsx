import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { 
    User, MapPin, Mail, Save, Building, Stethoscope, 
    HeartHandshake, Camera, FileText, Target, Lock, Shield, 
    CheckCircle, AlertCircle, Edit2, BadgeCheck
} from 'lucide-react';
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
  const [oldPassword, setOldPassword] = useState('');
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
    // Failsafe: Stop loading after 20 seconds if it hangs
    const timeoutId = setTimeout(() => {
        setLoading(false);
        setError("Request timed out. Please check your connection.");
    }, 20000);

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
          // No profile found, initialize default
          console.warn("Profile not found, initializing default.");
          setProfile({
              id: userId,
              role: 'user', 
              email: currentSession.user.email,
              full_name: '',
              about: '',
              city: '',
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
    
    // Attempt upload
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
       console.warn("Upload to 'avatars' failed", uploadError);
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
        email: profile.email,
        full_name: profile.full_name,
        city: profile.city,
        address: profile.address,
        avatar_url: avatarUrl,
        about: profile.about,
        goal: profile.goal,
        latitude: profile.latitude,
        longitude: profile.longitude
      };

      const { error } = await supabase.from('profiles').upsert(updates);

      if (error) throw error;

      setMessage('Profile updated successfully!');
      
      // Update local state to reflect new avatar if changed
      setProfile(prev => ({ ...prev, avatar_url: avatarUrl }));

    } catch (error) {
      console.error(error);
      setError('Error updating profile: ' + error.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleChangePassword = async (e) => {
      e.preventDefault();
      setPwdMsg(null);

      if (!oldPassword) {
          setPwdMsg({ type: 'error', text: "Please enter your current password." });
          return;
      }
      if (newPassword !== confirmPassword) {
          setPwdMsg({ type: 'error', text: "New passwords do not match." });
          return;
      }
      if (newPassword.length < 8) {
          setPwdMsg({ type: 'error', text: "Password must be at least 8 characters." });
          return;
      }

      try {
          // 1. Verify Old Password by re-authenticating
          const { error: signInError } = await supabase.auth.signInWithPassword({
              email: session.user.email,
              password: oldPassword
          });

          if (signInError) {
              setPwdMsg({ type: 'error', text: "Incorrect current password." });
              return;
          }

          // 2. Update to New Password
          const { error } = await supabase.auth.updateUser({ password: newPassword });
          if (error) throw error;

          setPwdMsg({ type: 'success', text: "Password updated successfully!" });
          setOldPassword('');
          setNewPassword('');
          setConfirmPassword('');
      } catch (err) {
          setPwdMsg({ type: 'error', text: err.message });
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

  // If failed to load completely
  if (!profile && !error) return null;

  return (
    <div className="min-h-screen w-full bg-slate-50 dark:bg-slate-900 pt-24 pb-12 px-4 transition-colors duration-300">
      <div className="container mx-auto max-w-4xl">
        
        {/* HERO SECTION - Only show if profile exists, otherwise just show error below */}
        {profile && (
        <div className="relative mb-8 group">
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
                    {/* Avatar with Edit Overlay */}
                    <div className="relative">
                        <div className="w-32 h-32 md:w-40 md:h-40 rounded-full p-1 bg-gradient-to-tr from-white to-slate-200 dark:from-slate-700 dark:to-slate-800 shadow-xl">
                            <div className="w-full h-full rounded-full overflow-hidden bg-slate-100 dark:bg-slate-700">
                                {avatarPreview ? (
                                    <img src={avatarPreview} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-slate-100 dark:bg-slate-700 text-slate-300 dark:text-slate-500">
                                        <User size={64} />
                                    </div>
                                )}
                            </div>
                        </div>
                        <label className="absolute bottom-2 right-2 bg-indigo-600 text-white p-2.5 rounded-full cursor-pointer shadow-lg hover:bg-indigo-700 hover:scale-110 transition-all">
                            <Camera size={18} />
                            <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                        </label>
                    </div>

                    {/* Header Text */}
                    <div className="text-center md:text-left flex-1">
                        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold text-white uppercase tracking-wider mb-2 bg-gradient-to-r ${getRoleGradient(profile.role)} shadow-md`}>
                            {getRoleIcon(profile.role)}
                            {getRoleLabel(profile.role)}
                        </div>
                        <h1 className="text-3xl md:text-4xl font-black text-slate-800 dark:text-white mb-2 flex items-center gap-2 justify-center md:justify-start">
                            {profile.full_name || 'Your Name'}
                            {profile.is_verified && (
                                <BadgeCheck size={32} className="text-blue-500 fill-blue-50 dark:fill-blue-900/30" />
                            )}
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 text-lg max-w-lg">
                            {profile.about || 'Tell the community about yourself...'}
                        </p>
                    </div>
                </div>
            </div>
        </div>
        )}

        {/* FEEDBACK MESSAGES */}
        {message && (
            <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-900/50 text-green-700 dark:text-green-400 rounded-xl flex items-center gap-2 font-bold animate-in fade-in slide-in-from-top-2">
                <CheckCircle size={20} /> {message}
            </div>
        )}
        {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 rounded-xl flex items-center gap-2 font-bold animate-in fade-in slide-in-from-top-2">
                <AlertCircle size={20} /> {error}
                <button onClick={() => window.location.reload()} className="ml-auto text-sm underline hover:no-underline">Reload Page</button>
            </div>
        )}

        {profile && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* LEFT COLUMN - MAIN FORM */}
            <div className="lg:col-span-2 space-y-8">
                <form onSubmit={handleUpdate} className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg border border-white/50 dark:border-slate-700/50 shadow-lg rounded-3xl p-6 md:p-8 transition-colors duration-300">
                    
                    <div className="flex items-center gap-2 mb-6 text-slate-800 dark:text-white">
                        <Edit2 size={24} className="text-indigo-500" />
                        <h2 className="text-xl font-bold">Account Details</h2>
                    </div>

                    <div className="space-y-6">
                        {/* Identify */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <InputGroup label={profile.role === 'shelter' ? 'Shelter Name' : profile.role === 'vet' ? 'Clinic Name' : 'Full Name'} icon={<User size={18} />}>
                                <input name="full_name" value={profile.full_name || ''} onChange={handleChange} className="input-field" placeholder="Jane Doe" required />
                            </InputGroup>
                            
                            <InputGroup label="Email Address" icon={<Mail size={18} />}>
                                <input value={profile.email || ''} disabled className="input-field opacity-60 cursor-not-allowed bg-slate-50" />
                            </InputGroup>
                        </div>

                        {/* Location */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <InputGroup label="City / District" icon={<MapPin size={18} />}>
                                <input name="city" value={profile.city || ''} onChange={handleChange} className="input-field" placeholder="e.g. Colombo" />
                            </InputGroup>
                            <InputGroup label="Detailed Address" icon={<Building size={18} />}>
                                <input name="address" value={profile.address || ''} onChange={handleChange} className="input-field" placeholder="Street address..." />
                            </InputGroup>
                        </div>

                        {/* Bio */}
                        <InputGroup label="About / Bio" icon={<FileText size={18} />}>
                            <textarea name="about" value={profile.about || ''} onChange={handleChange} className="input-field min-h-[100px] resize-none" placeholder="Share a brief bio..." />
                        </InputGroup>

                        {/* Special Role Fields */}
                        {profile.role !== 'user' && (
                            <>
                                <div className="border-t border-slate-100 dark:border-slate-700 my-4 pt-4"></div>
                                <InputGroup label="Mission / Goal" icon={<Target size={18} />}>
                                    <textarea name="goal" value={profile.goal || ''} onChange={handleChange} className="input-field min-h-[80px] resize-none" placeholder="What is your organization's mission?" />
                                </InputGroup>
                                
                                <div className="bg-indigo-50/50 dark:bg-indigo-900/20 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-900/30">
                                    <label className="flex items-center gap-2 text-indigo-900 dark:text-indigo-300 font-bold mb-3 text-sm">
                                        <MapPin size={16} /> Pin Exact Location
                                    </label>
                                    <div className="h-64 rounded-xl overflow-hidden shadow-sm border border-indigo-200 dark:border-indigo-800">
                                        <MapPicker 
                                            initialLocation={profile.latitude && profile.longitude ? { lat: profile.latitude, lng: profile.longitude } : null}
                                            onLocationSelect={(loc) => {
                                                setProfile(prev => ({ ...prev, latitude: loc.lat, longitude: loc.lng }));
                                            }}
                                        />
                                    </div>
                                    <p className="text-xs text-indigo-400 dark:text-indigo-400 mt-2 text-center">Help users find you easily on the map.</p>
                                </div>
                            </>
                        )}
                    </div>

                    <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-700">
                        <button 
                            type="submit" 
                            disabled={updating}
                            className="w-full py-4 rounded-xl bg-slate-900 dark:bg-indigo-600 text-white font-bold text-lg shadow-xl shadow-slate-200 dark:shadow-none hover:-translate-y-1 hover:shadow-2xl transition-all flex items-center justify-center gap-2"
                        >
                            {updating ? 'Saving...' : <><Save size={20} /> Save Changes</>}
                        </button>
                    </div>
                </form>
            </div>

            {/* RIGHT COLUMN - SECURITY & EXTRAS */}
            <div className="lg:col-span-1 space-y-8">
                {/* Security Card */}
                <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg border border-white/50 dark:border-slate-700/50 shadow-lg rounded-3xl p-6 md:p-8 transition-colors duration-300">
                    <div className="flex items-center gap-2 mb-6 text-slate-800 dark:text-white">
                        <Shield size={24} className="text-emerald-500" />
                        <h2 className="text-xl font-bold">Security</h2>
                    </div>

                    {pwdMsg && (
                        <div className={`mb-4 p-3 rounded-xl text-sm font-bold flex items-center gap-2 ${
                            pwdMsg.type === 'error' ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                        }`}>
                            {pwdMsg.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
                            {pwdMsg.text}
                        </div>
                    )}

                    <form onSubmit={handleChangePassword} className="space-y-4">
                        <InputGroup label="Current Password" icon={<Lock size={16} />}>
                            <input type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} className="input-field" placeholder="Enter current password" />
                        </InputGroup>
                        <div className="border-t border-slate-100 dark:border-slate-700 my-2"></div>
                        <InputGroup label="New Password" icon={<Lock size={16} />}>
                            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="input-field" placeholder="Min 8 chars" />
                        </InputGroup>
                        <InputGroup label="Confirm Password" icon={<Lock size={16} />}>
                            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="input-field" placeholder="Repeat password" />
                        </InputGroup>
                        <button type="submit" className="w-full py-3 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                            Update Password
                        </button>
                    </form>
                </div>
            </div>

        </div>
        )}
      </div>

      <style>{`
        .input-field {
            width: 100%;
            background: #ffffff;
            border: 1px solid #e2e8f0;
            padding: 0.75rem 1rem 0.75rem 2.5rem; /* Left padding for icon */
            border-radius: 0.75rem;
            font-size: 0.95rem;
            outline: none;
            transition: all 0.2s;
            color: #1e293b;
        }
        .input-field:focus {
            border-color: #6366f1;
            box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
        }
        .input-field:disabled {
            background-color: #f8fafc;
            color: #94a3b8;
        }
        
        /* Dark Mode Overrides */
        [data-theme="dark"] .input-field {
            background-color: #0f172a; /* slate-900 */
            border-color: #334155; /* slate-700 */
            color: #f8fafc; /* slate-50 */
        }
        [data-theme="dark"] .input-field:focus {
            border-color: #818cf8; /* indigo-400 */
            box-shadow: 0 0 0 4px rgba(129, 140, 248, 0.1);
        }
        [data-theme="dark"] .input-field:disabled {
            background-color: #1e293b; /* slate-800 */
            color: #64748b; /* slate-500 */
        }
      `}</style>
    </div>
  );
}

// Helper Components
const InputGroup = ({ label, icon, children }) => (
    <div className="relative group">
        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 ml-1">{label}</label>
        <div className="relative">
            <div className="absolute top-3.5 left-3.5 text-slate-400 dark:text-slate-500 group-focus-within:text-indigo-500 dark:group-focus-within:text-indigo-400 transition-colors">
                {icon}
            </div>
            {children}
        </div>
    </div>
);
