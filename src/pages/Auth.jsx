import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, User, MapPin, ArrowRight, Building, Stethoscope, HeartHandshake, Image as ImageIcon, Check, AlertTriangle, ArrowLeft, Target } from 'lucide-react';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [isReset, setIsReset] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showReset, setShowReset] = useState(false); // Failsafe state
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const navigate = useNavigate();

  // Role Selection State
  const [role, setRole] = useState('user'); // 'user', 'rescuer', 'shelter', 'vet'

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
    
    // Try 'avatars' bucket
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
      // Redirect if already logged in
      supabase.auth.getSession().then(({ data: { session } }) => {
          if (session) {
              console.log("Auth: Already logged in, redirecting...", session);
              navigate('/');
          }
      });
  }, []);

  // Failsafe Timer
  useEffect(() => {
    let timer;
    if (loading) {
        timer = setTimeout(() => {
            setShowReset(true);
        }, 15000); // 15 seconds
    } else {
        setShowReset(false);
    }
    return () => clearTimeout(timer);
  }, [loading]);

  const handleReset = () => {
      if (window.confirm("This will clear your local session data and refresh the page. Continue?")) {
          localStorage.clear();
          window.location.reload();
      }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    console.log("Auth: HandleAuth started. Login Mode:", isLogin);
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    // Timeout removed to see real behavior
    try {
          if (isLogin) {
            console.log("Auth: Attempting Login with", email);
            const { data, error } = await supabase.auth.signInWithPassword({
              email,
              password,
            });
            console.log("Auth: signInWithPassword result:", { data, error });
            
            if (error) throw error;
            console.log("Auth: Login Success, navigating...");
            navigate('/');
          } else {
            console.log("Auth: Attempting Registration with", email, role);
            if (password.length < 6) throw new Error("Password must be at least 6 characters");
    
            const { data, error: signUpError } = await supabase.auth.signUp({
              email,
              password,
            });
    
            if (signUpError) throw signUpError;
            console.log("Auth: SignUp Auth Success", data);
    
            if (data.user) {
              let avatarUrl = null;
              if (imageFile) {
                console.log("Auth: Uploading Avatar...");
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
              
              console.log("Auth: Creating Profile...", profileData);
              const { error: profileError } = await supabase
                .from('profiles')
                .insert([profileData]);
                
              if (profileError) {
                 console.error("Auth: Profile creation failed:", profileError);
              } else {
                 console.log("Auth: Profile Created");
              }
              
              setSuccessMsg("Registration successful! Welcome to the family.");
              setTimeout(() => navigate('/'), 1500);
            }
          }

    } catch (err) {
      console.error("Auth Error:", err);
      if (err.message && (err.message.includes("Email not confirmed") || err.message.includes("Invalid login credentials"))) {
           if (err.message.includes("Email not confirmed")) {
               setError("Please confirm your email address before logging in. Check your inbox (and spam folder).");
           } else {
               setError("Invalid email or password.");
           }
      } else {
           setError(err.message || "An unknown error occurred");
      }
    } finally {
      setLoading(false);
      console.log("Auth: Finished");
    }
  };



  if (isReset) {
      return (
          <div className="flex flex-col items-center justify-center min-h-screen bg-bg-main p-4">
               <div className="card w-full max-w-md">
                   <button onClick={() => setIsReset(false)} className="text-sm text-muted mb-4 flex items-center gap-1 hover:text-primary">
                       <ArrowLeft size={16} /> Back to Login
                   </button>
                   <h2 className="text-2xl font-bold mb-2">Reset Password</h2>
                   <p className="text-muted mb-6">Enter your email to receive a reset link.</p>
                   
                   {successMsg && <div className="alert alert-success">{successMsg}</div>}
                   {error && <div className="alert alert-error">{error}</div>}

                   <form onSubmit={handleResetPassword} className="flex flex-col gap-4">
                       <div>
                           <label className="form-label">Email Address</label>
                           <input 
                             type="email" 
                             className="form-input" 
                             value={email}
                             onChange={e => setEmail(e.target.value)}
                             required
                           />
                       </div>
                       <button type="submit" className="btn btn-primary" disabled={loading}>
                           {loading ? 'Sending...' : 'Send Reset Link'}
                       </button>
                   </form>
               </div>
          </div>
      )
  }

  return (
    <div className="page-container flex justify-center items-center min-h-screen bg-bg-main">
      <div className="card w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 p-0 overflow-hidden shadow-2xl my-8">
        
        {/* Left Side: Brand & Visuals */}
        <div className="bg-primary p-8 md:p-12 text-white flex flex-col justify-between relative overflow-hidden">
           <div className="absolute top-0 left-0 w-full h-full bg-[url('https://images.unsplash.com/photo-1548199973-03cce0bbc87b?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80')] bg-cover bg-center opacity-20"></div>
           <div className="relative z-10">
               <h1 className="text-4xl font-bold mb-4">PetLink</h1>
               <p className="text-xl opacity-90">Connecting hearts, saving lives. Join Sri Lanka's largest animal welfare community.</p>
           </div>
           
           <div className="relative z-10 mt-12 space-y-6">
               <div className="flex items-center gap-4">
                   <div className="bg-white/20 p-3 rounded-full"><Target className="text-white" /></div>
                   <div>
                       <h3 className="font-bold text-lg">Mission-Driven</h3>
                       <p className="text-sm opacity-80">Every registration brings us closer to a stray-free island.</p>
                   </div>
               </div>
               <div className="flex items-center gap-4">
                   <div className="bg-white/20 p-3 rounded-full"><HeartHandshake className="text-white" /></div>
                   <div>
                       <h3 className="font-bold text-lg">Community First</h3>
                       <p className="text-sm opacity-80">Connect with vets, rescuers, and animal lovers near you.</p>
                   </div>
               </div>
           </div>
           
           <div className="relative z-10 text-xs mt-12 opacity-60">
               © 2024 PetLink Sri Lanka. All rights reserved.
           </div>
        </div>

        {/* Right Side: Form */}
        <div className="p-8 md:p-12 bg-white flex flex-col justify-center">
          <div className="mb-8">
             <h2 className="text-3xl font-bold mb-2">{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
             <p className="text-muted">
                 {isLogin ? 'Please enter your details to sign in.' : 'Join the community and start making a difference.'}
             </p>
          </div>

          {error && (
            <div className="alert alert-error flex items-center gap-2 text-sm mb-6">
               <AlertTriangle size={18} /> {error}
            </div>
          )}
          
          {successMsg && (
            <div className="alert alert-success flex items-center gap-2 text-sm mb-6">
               <Check size={18} /> {successMsg}
            </div>
          )}

          <form onSubmit={handleAuth} className="flex flex-col gap-5">
            
            {/* Role Selection (Register Only) */}
            {!isLogin && (
                <div className="mb-2">
                    <label className="form-label mb-3 block">I am a...</label>
                    <div className="grid grid-cols-2 gap-3">
                        <button type="button" onClick={() => setRole('user')} className={`p-3 rounded-lg border text-sm font-semibold flex flex-col items-center gap-2 transition-all ${role === 'user' ? 'border-primary bg-orange-50 text-primary' : 'border-border text-muted hover:border-primary'}`}>
                            <User size={20} /> Adopter/Citizen
                        </button>
                        <button type="button" onClick={() => setRole('rescuer')} className={`p-3 rounded-lg border text-sm font-semibold flex flex-col items-center gap-2 transition-all ${role === 'rescuer' ? 'border-primary bg-orange-50 text-primary' : 'border-border text-muted hover:border-primary'}`}>
                            <HeartHandshake size={20} /> Rescuer
                        </button>
                        <button type="button" onClick={() => setRole('vet')} className={`p-3 rounded-lg border text-sm font-semibold flex flex-col items-center gap-2 transition-all ${role === 'vet' ? 'border-primary bg-orange-50 text-primary' : 'border-border text-muted hover:border-primary'}`}>
                            <Stethoscope size={20} /> Vet/Clinic
                        </button>
                        <button type="button" onClick={() => setRole('shelter')} className={`p-3 rounded-lg border text-sm font-semibold flex flex-col items-center gap-2 transition-all ${role === 'shelter' ? 'border-primary bg-orange-50 text-primary' : 'border-border text-muted hover:border-primary'}`}>
                            <Building size={20} /> Shelter
                        </button>
                    </div>
                </div>
            )}

            <div className="space-y-4">
                <div>
                  <label className="form-label">Email Address</label>
                  <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
                      <input 
                        type="email" 
                        required
                        className="form-input pl-10" 
                        placeholder="hello@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                  </div>
                </div>

                <div>
                   <div className="flex justify-between items-center mb-1">
                       <label className="form-label m-0">Password</label>
                       {isLogin && (
                           <button type="button" onClick={() => setIsReset(true)} className="text-xs text-primary font-semibold hover:underline">
                               Forgot Password?
                           </button>
                       )}
                   </div>
                   <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
                      <input 
                        type="password" 
                        required
                        className="form-input pl-10" 
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                   </div>
                   {!isLogin && password && (
                       <div className="mt-2 text-xs flex items-center gap-2">
                           <span className={`h-1 flex-1 rounded-full ${password.length >= 8 ? 'bg-green-500' : 'bg-gray-200'}`}></span>
                           <span className={`h-1 flex-1 rounded-full ${/[0-9]/.test(password) ? 'bg-green-500' : 'bg-gray-200'}`}></span>
                           <span className={`h-1 flex-1 rounded-full ${/[!@#$%^&*]/.test(password) ? 'bg-green-500' : 'bg-gray-200'}`}></span>
                       </div>
                   )}
                </div>

                {!isLogin && (
                    <div className="animate-fade-in space-y-4 pt-2 border-t border-border mt-2">
                         <div>
                            <label className="form-label">Full Name</label>
                            <input 
                              type="text" 
                              required
                              className="form-input" 
                              placeholder="John Doe"
                              value={fullName}
                              onChange={(e) => setFullName(e.target.value)}
                            />
                         </div>

                         {(role !== 'user') && (
                             <>
                                <div>
                                    <label className="form-label">Location (City/District)</label>
                                    <input 
                                        type="text" 
                                        required
                                        className="form-input" 
                                        placeholder="e.g. Colombo 07"
                                        value={location}
                                        onChange={(e) => setLocation(e.target.value)}
                                    />
                                </div>
                             </>
                         )}
                         
                         <div>
                             <label className="form-label">Profile Picture (Optional)</label>
                             <div className="flex items-center gap-4">
                                 <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border">
                                     {imagePreview ? <img src={imagePreview} className="w-full h-full object-cover" /> : <ImageIcon size={20} className="text-muted" />}
                                 </div>
                                 <label className="cursor-pointer text-sm text-primary font-bold hover:underline">
                                     Upload Image
                                     <input type="file" className="hidden" onChange={handleImageChange} accept="image/*" />
                                 </label>
                             </div>
                         </div>
                    </div>
                )}
            </div>

            <button type="submit" className="btn btn-primary w-full py-3 mt-2 shadow-lg hover:shadow-xl transition-all" disabled={loading}>
                {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
            </button>
            
            {/* Failsafe Reset Button */}
            {showReset && (
                <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg text-center animate-pulse">
                    <p className="text-xs text-orange-800 mb-2">Taking too long?</p>
                    <button 
                        type="button"
                        onClick={handleReset}
                        className="text-xs font-bold text-orange-700 underline hover:text-orange-900"
                    >
                        Reset Application Data
                    </button>
                </div>
            )}
          </form>

          <div className="mt-8 text-center">
              <p className="text-muted text-sm">
                  {isLogin ? "Don't have an account?" : "Already have an account?"}
                  <button 
                    onClick={() => { setIsLogin(!isLogin); setError(null); }} 
                    className="ml-2 font-bold text-primary hover:underline"
                  >
                      {isLogin ? "Register Now" : "Log In"}
                  </button>
              </p>
          </div>
        </div>

      </div>
    </div>
  );
}
