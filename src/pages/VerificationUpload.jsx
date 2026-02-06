import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { Upload, Check, AlertCircle, Shield, FileText } from 'lucide-react';
import { motion } from 'framer-motion';

export default function VerificationUpload() {
  const { user, role: userRole, profile, refreshProfile } = useAuth(); // role is enough, no need for userRole alias technically but reusing
  
  // State for Files
  const [nicFrontFile, setNicFrontFile] = useState(null);
  const [nicBackFile, setNicBackFile] = useState(null);
  const [licenseFile, setLicenseFile] = useState(null);
  
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (profile?.verification_status === 'submitted') {
        setSuccess(true);
    }
  }, [profile]);

  // Helper to determine second document requirements
  const getLicenseRequirement = () => {
      if (userRole === 'vet') return { title: "SLVC / Veterinary License", required: true };
      if (userRole === 'shelter') return { title: "Business / NGO Registration", required: true };
      if (userRole === 'rescuer') return { title: "Proof of Rescue Work (Optional)", required: false };
      return { title: "Additional Document", required: false };
  };

  const licenseReq = getLicenseRequirement();

  const handleNicFrontChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setNicFrontFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleNicBackChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setNicBackFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleLicenseChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setLicenseFile(e.target.files[0]);
      setError(null);
    }
  };

  const uploadFileToStorage = async (file, prefix) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}_${prefix}_${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('verification-docs')
        .upload(fileName, file);
      
      if (uploadError) throw uploadError;
      return fileName;
  };

  const handleUpload = async () => {
    if (!user) return;
    
    // Validation
    if (!nicFrontFile) {
        setError("Please upload your NIC Front Side.");
        return;
    }
    if (!nicBackFile) {
        setError("Please upload your NIC Back Side.");
        return;
    }
    if (licenseReq.required && !licenseFile) {
        setError(`Please upload your ${licenseReq.title}.`);
        return;
    }

    setUploading(true);
    setError(null);

    try {
      // 1. Upload NIC Front
      const nicFrontUrl = await uploadFileToStorage(nicFrontFile, 'NIC_FRONT');
      
      // 2. Upload NIC Back
      const nicBackUrl = await uploadFileToStorage(nicBackFile, 'NIC_BACK');
      
      // 3. Upload License (if exists)
      let licenseUrl = null;
      if (licenseFile) {
          licenseUrl = await uploadFileToStorage(licenseFile, 'LICENSE');
      }

      // 4. Update Profile with ALL URLs
      const updateData = {
          verification_status: 'submitted',
          verification_nic_url: nicFrontUrl,      // Using existing column for Front
          verification_nic_back_url: nicBackUrl,  // New column for Back
          verification_license_url: licenseUrl
      };

      const { error: updateError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id);

      if (updateError) throw updateError;

      setSuccess(true);
      if (refreshProfile) refreshProfile();

    } catch (err) {
      console.error('Upload failed:', err);
      setError(err.message || "Failed to upload documents.");
    } finally {
      setUploading(false);
    }
  };

  if (success) {
      return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-6">
        <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-slate-800 p-8 rounded-[2rem] shadow-xl max-w-md w-full text-center border border-emerald-100 dark:border-emerald-900/30"
        >
            <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <Check size={40} className="text-emerald-500" />
            </div>
            <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-2">Documents Submitted!</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-8">
                We have received your NIC (Front & Back) and supporting documents. Our team will review them shortly.
            </p>
            <a href="/" className="block w-full bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-slate-800 transition-colors">
                Return to Home
            </a>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-12 px-4 md:px-6 font-sans">
      <div className="max-w-4xl mx-auto">
        <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden"
        >
            {/* Header */}
            <div className="bg-amber-500 p-8 md:p-10 text-center relative overflow-hidden">
                <div className="relative z-10">
                    <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <Shield size={32} className="text-white" />
                    </div>
                    <h1 className="text-3xl font-black text-white mb-2">Verify Your Account</h1>
                    <p className="text-amber-100 font-medium text-lg max-w-lg mx-auto">
                        To maintain safety and trust on PetLink, we require identification proof from all partners.
                    </p>
                </div>
                {/* Decor */}
                <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
            </div>

            {/* Content */}
            <div className="p-8 md:p-10">
                
                {/* Instructions */}
                <div className="bg-slate-50 dark:bg-slate-700/30 rounded-xl p-6 border border-slate-100 dark:border-slate-700 mb-8">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-3 uppercase tracking-wider flex items-center gap-2">
                        <FileText size={16} className="text-slate-400" /> Requirements
                    </h3>
                    <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                        <li className="flex items-start gap-2">
                            <Check size={16} className="text-emerald-500 mt-0.5" /> 
                            <span className="font-bold">National Identity Card (NIC):</span> Both Front and Back images are required.
                        </li>
                        {licenseReq.required && (
                            <li className="flex items-start gap-2">
                                <Check size={16} className="text-emerald-500 mt-0.5" /> 
                                <span className="font-bold">{licenseReq.title}:</span> Required for your role.
                            </li>
                        )}
                    </ul>
                </div>

                <div className="space-y-8">
                    {/* 1. NIC SECTION */}
                    <div className="space-y-4">
                         <div className="flex items-center gap-2 mb-2">
                            <span className="bg-slate-900 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">1</span>
                            <label className="text-lg font-bold text-slate-800 dark:text-white">
                                National Identity Card (NIC) <span className="text-red-500">*</span>
                            </label>
                         </div>
                         
                         <div className="grid md:grid-cols-2 gap-4">
                             {/* Front Side */}
                             <div className="space-y-2">
                                <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 ml-1">Front Side</span>
                                <label className="block w-full cursor-pointer group h-full">
                                    <div className={`h-40 border-3 border-dashed rounded-2xl p-4 flex flex-col items-center justify-center text-center transition-all ${
                                        nicFrontFile 
                                        ? 'border-emerald-400 bg-emerald-50/50 dark:bg-emerald-900/10' 
                                        : 'border-slate-200 dark:border-slate-600 hover:border-amber-400 hover:bg-amber-50 dark:hover:bg-slate-700'
                                    }`}>
                                        <input 
                                            type="file" 
                                            className="hidden" 
                                            accept="image/*,.pdf"
                                            onChange={handleNicFrontChange}
                                        />
                                        {nicFrontFile ? (
                                            <div className="animate-fade-in w-full">
                                                <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/50 rounded-full flex items-center justify-center mx-auto mb-2">
                                                    <FileText size={20} className="text-emerald-600 dark:text-emerald-400" />
                                                </div>
                                                <p className="font-bold text-slate-800 dark:text-white text-xs truncate w-full px-2">{nicFrontFile.name}</p>
                                                <p className="text-[10px] text-emerald-600 font-bold uppercase mt-1">Front Ready</p>
                                            </div>
                                        ) : (
                                            <div>
                                                <div className="bg-slate-100 dark:bg-slate-700 w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2 group-hover:bg-white transition-colors">
                                                    <Upload size={18} className="text-slate-400 group-hover:text-amber-500" />
                                                </div>
                                                <p className="font-bold text-slate-600 dark:text-slate-300 text-xs">Upload Front</p>
                                            </div>
                                        )}
                                    </div>
                                </label>
                             </div>

                             {/* Back Side */}
                             <div className="space-y-2">
                                <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 ml-1">Back Side</span>
                                <label className="block w-full cursor-pointer group h-full">
                                    <div className={`h-40 border-3 border-dashed rounded-2xl p-4 flex flex-col items-center justify-center text-center transition-all ${
                                        nicBackFile 
                                        ? 'border-emerald-400 bg-emerald-50/50 dark:bg-emerald-900/10' 
                                        : 'border-slate-200 dark:border-slate-600 hover:border-amber-400 hover:bg-amber-50 dark:hover:bg-slate-700'
                                    }`}>
                                        <input 
                                            type="file" 
                                            className="hidden" 
                                            accept="image/*,.pdf"
                                            onChange={handleNicBackChange}
                                        />
                                        {nicBackFile ? (
                                            <div className="animate-fade-in w-full">
                                                <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/50 rounded-full flex items-center justify-center mx-auto mb-2">
                                                    <FileText size={20} className="text-emerald-600 dark:text-emerald-400" />
                                                </div>
                                                <p className="font-bold text-slate-800 dark:text-white text-xs truncate w-full px-2">{nicBackFile.name}</p>
                                                <p className="text-[10px] text-emerald-600 font-bold uppercase mt-1">Back Ready</p>
                                            </div>
                                        ) : (
                                            <div>
                                                <div className="bg-slate-100 dark:bg-slate-700 w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2 group-hover:bg-white transition-colors">
                                                    <Upload size={18} className="text-slate-400 group-hover:text-amber-500" />
                                                </div>
                                                <p className="font-bold text-slate-600 dark:text-slate-300 text-xs">Upload Back</p>
                                            </div>
                                        )}
                                    </div>
                                </label>
                             </div>
                         </div>
                    </div>

                    {/* 2. LICENSE UPLOAD */}
                    <div className="space-y-4">
                         <div className="flex items-center gap-2 mb-2">
                            <span className="bg-slate-900 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">2</span>
                             <label className="text-lg font-bold text-slate-800 dark:text-white">
                                {licenseReq.title} {licenseReq.required && <span className="text-red-500">*</span>}
                             </label>
                         </div>
                         <label className="block w-full cursor-pointer group h-full">
                            <div className={`h-32 border-3 border-dashed rounded-2xl p-6 flex flex-row items-center justify-center gap-4 transition-all ${
                                licenseFile 
                                ? 'border-emerald-400 bg-emerald-50/50 dark:bg-emerald-900/10' 
                                : 'border-slate-200 dark:border-slate-600 hover:border-amber-400 hover:bg-amber-50 dark:hover:bg-slate-700'
                            }`}>
                                <input 
                                    type="file" 
                                    className="hidden" 
                                    accept="image/*,.pdf"
                                    onChange={handleLicenseChange}
                                />
                                {licenseFile ? (
                                    <div className="animate-fade-in flex items-center gap-4">
                                        <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/50 rounded-full flex items-center justify-center">
                                            <FileText size={24} className="text-emerald-600 dark:text-emerald-400" />
                                        </div>
                                        <div className="text-left">
                                            <p className="font-bold text-slate-800 dark:text-white text-sm truncate max-w-[200px]">{licenseFile.name}</p>
                                            <p className="text-[10px] text-emerald-600 font-bold uppercase">Ready to upload</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-4">
                                        <div className="bg-slate-100 dark:bg-slate-700 w-12 h-12 rounded-full flex items-center justify-center group-hover:bg-white transition-colors">
                                            <Upload size={20} className="text-slate-400 group-hover:text-amber-500" />
                                        </div>
                                        <div className="text-left">
                                            <p className="font-bold text-slate-600 dark:text-slate-300 text-sm">Upload Proof Document</p>
                                            <p className="text-xs text-slate-400">License, Registration, or Certificate</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </label>
                    </div>
                </div>

                {error && (
                    <div className="mt-8 p-4 bg-red-50 text-red-600 text-sm rounded-xl flex items-center gap-2 mb-6 border border-red-100">
                        <AlertCircle size={16} /> {error}
                    </div>
                )}

                <button 
                    onClick={handleUpload}
                    disabled={uploading || !nicFrontFile || !nicBackFile || (licenseReq.required && !licenseFile)}
                    className="w-full mt-8 bg-slate-900 text-white py-4 rounded-xl font-bold text-lg shadow-xl shadow-slate-200 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                    {uploading ? 'Uploading Documents...' : 'Submit Verification Request'}
                </button>
            </div>
        </motion.div>
      </div>
    </div>
  );
}
