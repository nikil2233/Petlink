import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, User, MapPin, ArrowRight, Building, Stethoscope, HeartHandshake, Image as ImageIcon, Check, AlertTriangle, ArrowLeft, Target, PawPrint } from 'lucide-react';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [isReset, setIsReset] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showReset, setShowReset] = useState(false); 
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const navigate = useNavigate();

  // Role Selection
  const [role, setRole] = useState('user'); 

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Profile Fields
  const [fullName, setFullName] = useState('');
  const [location, setLocation] = useState('');
  const [address, setAddress] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const uploadAvatar = async (userId, file) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}-${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;
    
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file);

    if (uploadError) return null;

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleResetPassword = async (e) => {
      e.preventDefault();
      setLoading(true);
      setError(null);
      setSuccessMsg(null);
      
      try {
          const { error } = await supabase.auth.resetPasswordForEmail(email, {
              redirectTo: window.location.origin + '/reset-password',
          });
          if (error) throw error;
          setSuccessMsg("Password reset link sent! Check your email.");
      } catch (err) {
          setError(err.message);
      } finally {
          setLoading(false);
      }
  };

  useEffect(() => {
      supabase.auth.getSession().then(({ data: { session } }) => {
          if (session) navigate('/');
      });
  }, []);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
          if (isLogin) {
            const { error } = await supabase.auth.signInWithPassword({
              email,
              password,
            });
            if (error) throw error;
            navigate('/');
          } else {
            if (password.length < 6) throw new Error("Password must be at least 6 characters");
    
            const { data, error: signUpError } = await supabase.auth.signUp({
              email,
              password,
              options: {
                data: { role, full_name: fullName, location }
              }
            });
    
            if (signUpError) throw signUpError;
    
            if (data.user) {
              let avatarUrl = null;
              if (imageFile) {
                avatarUrl = await uploadAvatar(data.user.id, imageFile);
              }
    
              const profileData = {
                id: data.user.id,
                email: email,
                role: role,
                full_name: fullName,
                created_at: new Date().toISOString(),
                avatar_url: avatarUrl
              };
    
              if (role !== 'user') {
                 profileData.location = location;
                 profileData.address = address;
              }
              
              const { error: profileError } = await supabase.from('profiles').upsert([profileData]);
              if (profileError) console.error("Auth: Profile error:", profileError);
              
              setSuccessMsg("Registration successful! Welcome.");
              setTimeout(() => navigate('/'), 1500);
            }
          }
    } catch (err) {
      console.error(err);
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (isReset) {
      return (
          <div className="auth-page centered">
               <div className="auth-card reset-card animate-fade-in-up">
                   <button onClick={() => setIsReset(false)} className="back-btn">
                       <ArrowLeft size={18} /> Back to Login
                   </button>
                   <h2>Reset Password</h2>
                   <p className="subtitle">Enter your email for a reset link.</p>
                   
                   {successMsg && <div className="alert success"><Check size={16}/> {successMsg}</div>}
                   {error && <div className="alert error"><AlertTriangle size={16}/> {error}</div>}

                   <form onSubmit={handleResetPassword}>
                       <div className="input-group">
                           <label>Email Address</label>
                           <input 
                             type="email" 
                             className="modern-input"
                             value={email}
                             onChange={e => setEmail(e.target.value)}
                             required
                           />
                       </div>
                       <button type="submit" className="modern-btn primary full-width" disabled={loading}>
                           {loading ? 'Sending...' : 'Send Reset Link'}
                       </button>
                   </form>
               </div>
          </div>
      )
  }

  return (
    <div className="auth-page">
      <div className="auth-container animate-fade-in-up">
        
        {/* Left Side: Brand */}
        <div className="auth-brand">
           <div className="brand-overlay"></div>
           <div className="brand-content">
               <div className="brand-logo">
                   <PawPrint size={28} /> <span>PetLink</span>
               </div>
               <h1>Uniting Paws,<br/><span className="highlight">Heal Hearts.</span></h1>
               <p>Join Sri Lanka's fastest-growing animal welfare community.</p>
           </div>
        </div>

        {/* Right Side: Form */}
        <div className="auth-form-wrapper">
          <div className="auth-header">
             <h2>{isLogin ? 'Welcome Back' : 'Get Started'}</h2>
             <p>{isLogin ? 'Enter your details to access your account.' : 'Create your free account in seconds.'}</p>
          </div>

          {error && <div className="alert error animate-shake"><AlertTriangle size={18} /> {error}</div>}
          {successMsg && <div className="alert success"><Check size={18} /> {successMsg}</div>}

          <form onSubmit={handleAuth} className="main-form">
            
            {!isLogin && (
                <div className="role-selector animate-slide-up">
                    <label>I want to join as a...</label>
                    <div className="role-grid">
                        {[
                            { id: 'user', label: 'Adopter', icon: User },
                            { id: 'rescuer', label: 'Rescuer', icon: HeartHandshake },
                            { id: 'vet', label: 'Vet', icon: Stethoscope },
                            { id: 'shelter', label: 'Shelter', icon: Building }
                        ].map((item) => (
                            <button 
                                key={item.id}
                                type="button" 
                                onClick={() => setRole(item.id)} 
                                className={`role-card ${role === item.id ? 'active' : ''}`}
                            >
                                <item.icon size={20} />
                                <span>{item.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <div className="form-fields">
                <div className="input-with-icon">
                  <Mail className="icon" size={20} />
                  <input 
                    type="email" 
                    required
                    className="modern-input" 
                    placeholder="Email Address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div className="input-with-icon">
                   <Lock className="icon" size={20} />
                   <input 
                     type="password" 
                     required
                     className="modern-input" 
                     placeholder="Password"
                     value={password}
                     onChange={(e) => setPassword(e.target.value)}
                   />
                </div>
                {isLogin && (
                    <div className="forgot-password">
                        <button type="button" onClick={() => setIsReset(true)}>Forgot Password?</button>
                    </div>
                )}

                {!isLogin && (
                    <div className="extra-fields animate-slide-up">
                         <input 
                              type="text" 
                              required
                              className="modern-input" 
                              placeholder="Full Name"
                              value={fullName}
                              onChange={(e) => setFullName(e.target.value)}
                         />

                         {(role !== 'user') && (
                             <div className="input-with-icon">
                                <MapPin className="icon" size={18} />
                                <input 
                                    type="text" 
                                    required
                                    className="modern-input" 
                                    placeholder="City or District"
                                    value={location}
                                    onChange={(e) => setLocation(e.target.value)}
                                />
                             </div>
                         )}
                         
                         <label className="file-upload-label">
                             Profile Photo (Optional)
                             <input type="file" onChange={handleImageChange} accept="image/*" />
                         </label>
                    </div>
                )}
            </div>

            <button type="submit" className="modern-btn primary full-width big-btn" disabled={loading}>
                {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')} <ArrowRight size={20} />
            </button>
            
          </form>

          <div className="auth-footer">
              <p>
                  {isLogin ? "New to PetLink?" : "Already have an account?"}
                  <button onClick={() => { setIsLogin(!isLogin); setError(null); }}>
                      {isLogin ? "Create Account" : "Sign In"}
                  </button>
              </p>
          </div>
        </div>

      </div>
    </div>
  );
}
