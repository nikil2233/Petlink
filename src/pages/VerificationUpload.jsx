import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { Upload, Check, AlertCircle, Shield, FileText } from 'lucide-react';
import { motion } from 'framer-motion';

export default function VerificationUpload() {
  const { user, role: userRole, refreshProfile } = useAuth(); // role is enough, no need for userRole alias technically but reusing
  
  // State for Two Files
  const [nicFile, setNicFile] = useState(null);
  const [licenseFile, setLicenseFile] = useState(null);
  
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  // Helper to determine second document requirements
  const getLicenseRequirement = () => {
      if (userRole === 'vet') return { title: "SLVC / Veterinary License", required: true };
      if (userRole === 'shelter') return { title: "Business / NGO Registration", required: true };
      if (userRole === 'rescuer') return { title: "Proof of Rescue Work (Optional)", required: false }; // Rescuers might optional? No user said ALL.
      return { title: "Additional Document", required: false };
  };

  const licenseReq = getLicenseRequirement();

  const handleNicChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setNicFile(e.target.files[0]);
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
    if (!nicFile) {
        setError("Please upload your National ID (NIC).");
        return;
    }
    if (licenseReq.required && !licenseFile) {
        setError(`Please upload your ${licenseReq.title}.`);
        return;
    }

    setUploading(true);
    setError(null);

    try {
      // 1. Upload NIC
      const nicUrl = await uploadFileToStorage(nicFile, 'NIC');
      
      // 2. Upload License (if exists)
      let licenseUrl = null;
      if (licenseFile) {
          licenseUrl = await uploadFileToStorage(licenseFile, 'LICENSE');
      }

      // 3. Update Profile with BOTH URLs
      const updateData = {
          verification_status: 'submitted',
          verification_nic_url: nicUrl,
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
      // ... (Keep existing Success UI)
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
                We have received your NIC and License proofs. Our team will review them shortly.
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
      <div className="max-w-3xl mx-auto">
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
                            <span className="font-bold">National Identity Card (NIC):</span> Required for everyone.
                        </li>
                        {licenseReq.required && (
                            <li className="flex items-start gap-2">
                                <Check size={16} className="text-emerald-500 mt-0.5" /> 
                                <span className="font-bold">{licenseReq.title}:</span> Required for your role.
                            </li>
                        )}
                    </ul>
                </div>

                <div className="grid md:grid-cols-2 gap-6 mb-8">
                    {/* 1. NIC UPLOAD */}
                    <div className="space-y-3">
                         <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 ml-1">
                            1. National Identity Card (NIC) <span className="text-red-500">*</span>
                         </label>
                         <label className="block w-full cursor-pointer group h-full">
                            <div className={`h-48 border-3 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center transition-all ${
                                nicFile 
                                ? 'border-emerald-400 bg-emerald-50/50 dark:bg-emerald-900/10' 
                                : 'border-slate-200 dark:border-slate-600 hover:border-amber-400 hover:bg-amber-50 dark:hover:bg-slate-700'
                            }`}>
                                <input 
                                    type="file" 
                                    className="hidden" 
                                    accept="image/*,.pdf"
                                    onChange={handleNicChange}
                                />
                                {nicFile ? (
                                    <div className="animate-fade-in">
                                        <FileText size={32} className="text-emerald-500 mx-auto mb-2" />
                                        <p className="font-bold text-slate-800 dark:text-white text-sm truncate max-w-[150px]">{nicFile.name}</p>
                                        <p className="text-[10px] text-emerald-600 font-bold uppercase mt-1">Ready</p>
                                    </div>
                                ) : (
                                    <div>
                                        <div className="bg-slate-100 dark:bg-slate-700 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:bg-white transition-colors">
                                            <Upload size={20} className="text-slate-400 group-hover:text-amber-500" />
                                        </div>
                                        <p className="font-bold text-slate-600 dark:text-slate-300 text-sm">Upload NIC</p>
                                        <p className="text-xs text-slate-400 mt-1">Front/Back Image</p>
                                    </div>
                                )}
                            </div>
                        </label>
                    </div>

                    {/* 2. LICENSE UPLOAD */}
                    <div className="space-y-3">
                         <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 ml-1">
                            2. {licenseReq.title} {licenseReq.required && <span className="text-red-500">*</span>}
                         </label>
                         <label className="block w-full cursor-pointer group h-full">
                            <div className={`h-48 border-3 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center transition-all ${
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
                                    <div className="animate-fade-in">
                                        <FileText size={32} className="text-emerald-500 mx-auto mb-2" />
                                        <p className="font-bold text-slate-800 dark:text-white text-sm truncate max-w-[150px]">{licenseFile.name}</p>
                                        <p className="text-[10px] text-emerald-600 font-bold uppercase mt-1">Ready</p>
                                    </div>
                                ) : (
                                    <div>
                                        <div className="bg-slate-100 dark:bg-slate-700 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:bg-white transition-colors">
                                            <Upload size={20} className="text-slate-400 group-hover:text-amber-500" />
                                        </div>
                                        <p className="font-bold text-slate-600 dark:text-slate-300 text-sm">Upload Proof</p>
                                        <p className="text-xs text-slate-400 mt-1">License/Reg Certificate</p>
                                    </div>
                                )}
                            </div>
                        </label>
                    </div>
                </div>

                {error && (
                    <div className="p-4 bg-red-50 text-red-600 text-sm rounded-xl flex items-center gap-2 mb-6 border border-red-100">
                        <AlertCircle size={16} /> {error}
                    </div>
                )}

                <button 
                    onClick={handleUpload}
                    disabled={uploading || !nicFile || (licenseReq.required && !licenseFile)}
                    className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold text-lg shadow-xl shadow-slate-200 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                    {uploading ? 'Uploading Documents...' : 'Submit Verification Request'}
                </button>
            </div>
        </motion.div>
      </div>
    </div>
  );
}
