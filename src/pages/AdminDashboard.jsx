import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { Check, X, Eye, Shield, AlertCircle, FileText, User, MessageCircle, History, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChat } from '../context/ChatContext';
import toast from 'react-hot-toast';

export default function AdminDashboard() {
  const { user } = useAuth();
  const { openChat } = useChat();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [view, setView] = useState('pending'); // 'pending' | 'registrations' | 'history'

  useEffect(() => {
    fetchRequests(view);
  }, [user, view]);

  const fetchRequests = async (currentView = view) => {
    try {
      setLoading(true);
      let query = supabase
        .from('profiles')
        .select('*')
        .order('updated_at', { ascending: false });

      if (currentView === 'pending') {
          query = query.eq('verification_status', 'submitted');
      } else if (currentView === 'registrations') {
          // Show new accounts that haven't submitted docs yet
          query = query
            .in('role', ['vet', 'rescuer', 'shelter'])
            .eq('verification_status', 'pending');
      } else {
          // History: show approved or rejected
          query = query.in('verification_status', ['approved', 'rejected']);
      }
      
      const { data, error } = await query;

      if (error) throw error;
      setRequests(data || []);
      setSelectedRequest(null); // Reset selection on view change
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDecision = async (profileId, status) => {
    try {
      const updateData = {
        verification_status: status,
        is_verified: status === 'approved' // Set is_verified only if approved
      };

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', profileId);

      if (error) throw error;

      // Optimistic Update
      if (view === 'pending') {
          setRequests(current => current.filter(r => r.id !== profileId));
          setSelectedRequest(null);
      } else {
          // Update local state if in history/registrations
          setRequests(current => current.map(r => r.id === profileId ? { ...r, verification_status: status } : r));
          if (selectedRequest?.id === profileId) {
              setSelectedRequest(prev => ({ ...prev, verification_status: status }));
          }
      }

      // Send Notification
      const { error: notifError } = await supabase
        .from('notifications')
        .insert({
            user_id: profileId,
            title: status === 'approved' ? 'Verification Approved! 🎉' : 'Verification Update',
            message: status === 'approved'
                ? 'Your account has been verified. You now have a verified badge and full access.'
                : 'Your verification request was not approved at this time. Please check the details and try again.',
            type: status === 'approved' ? 'success' : 'alert',
            link: '/profile'
        });

      if (notifError) console.error("Error sending notification:", notifError);

      if (status === 'approved') {
          toast.success('Verification request approved!');
      } else {
          toast('Verification request rejected.', { icon: '⚠️' });
      }

    } catch (err) {
      console.error('Error updating status:', err);
      toast.error('Failed to update status.');
    }
  };

  const getDocUrl = (path) => {
    if (!path) return null;
    const { data } = supabase.storage.from('verification-docs').getPublicUrl(path);
    return data.publicUrl;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  // Helper for Registrations View Column
  const RegistrationCard = ({ profile }) => (
    <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-all flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden flex-shrink-0">
            {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold text-xs">
                    {profile.full_name?.[0] || 'U'}
                </div>
            )}
        </div>
        <div className="flex-1 min-w-0">
            <h4 className="font-bold text-slate-800 dark:text-white truncate text-sm">{profile.full_name || 'No Name'}</h4>
            <p className="text-xs text-slate-500 truncate">{profile.email}</p>
            {profile.city && (
                <p className="text-xs text-indigo-500 font-medium truncate mt-0.5 flex items-center gap-1">
                   <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 inline-block"></span> {profile.city}
                </p>
            )}
        </div>
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50 dark:bg-slate-900 px-2 py-1 rounded-md">
            {new Date(profile.updated_at).toLocaleDateString()}
        </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-12 px-4 md:px-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-indigo-500 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
                <Shield className="text-white" size={24} />
            </div>
            <div>
                <h1 className="text-3xl font-black text-slate-800 dark:text-white">Admin Dashboard</h1>
                <p className="text-slate-500 dark:text-slate-400">Manage verification requests and system users</p>
            </div>
        </div>

        {/* View Switcher */}
        <div className="flex gap-4 mb-8 overflow-x-auto pb-2">
            <button 
                onClick={() => setView('pending')} 
                className={`px-6 py-2 rounded-full font-bold text-sm transition-all flex items-center gap-2 whitespace-nowrap ${view === 'pending' ? 'bg-slate-800 text-white' : 'bg-white text-slate-500 hover:bg-slate-100'}`}
            >
                <Shield size={16} /> Pending Requests
            </button>
            <button 
                onClick={() => setView('registrations')} 
                className={`px-6 py-2 rounded-full font-bold text-sm transition-all flex items-center gap-2 whitespace-nowrap ${view === 'registrations' ? 'bg-slate-800 text-white' : 'bg-white text-slate-500 hover:bg-slate-100'}`}
            >
                <Users size={16} /> New Registrations
            </button>
            <button 
                onClick={() => setView('history')} 
                className={`px-6 py-2 rounded-full font-bold text-sm transition-all flex items-center gap-2 whitespace-nowrap ${view === 'history' ? 'bg-slate-800 text-white' : 'bg-white text-slate-500 hover:bg-slate-100'}`}
            >
                <History size={16} /> History
            </button>
        </div>

        {view === 'registrations' ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Vets Column */}
                <div className="space-y-4">
                    <h3 className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 pb-2">
                         <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Veterans ({requests.filter(r => r.role === 'vet').length})
                    </h3>
                    <div className="space-y-3">
                        {requests.filter(r => r.role === 'vet').map(profile => (
                            <RegistrationCard key={profile.id} profile={profile} />
                        ))}
                        {requests.filter(r => r.role === 'vet').length === 0 && (
                            <div className="text-sm text-slate-400 italic">No new veterinarian registrations.</div>
                        )}
                    </div>
                </div>

                {/* Rescuers Column */}
                <div className="space-y-4">
                    <h3 className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 pb-2">
                         <span className="w-2 h-2 rounded-full bg-orange-500"></span> Rescuers ({requests.filter(r => r.role === 'rescuer').length})
                    </h3>
                    <div className="space-y-3">
                        {requests.filter(r => r.role === 'rescuer').map(profile => (
                            <RegistrationCard key={profile.id} profile={profile} />
                        ))}
                        {requests.filter(r => r.role === 'rescuer').length === 0 && (
                            <div className="text-sm text-slate-400 italic">No new rescuer registrations.</div>
                        )}
                    </div>
                </div>

                {/* Shelters Column */}
                <div className="space-y-4">
                    <h3 className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 pb-2">
                         <span className="w-2 h-2 rounded-full bg-blue-500"></span> Shelters ({requests.filter(r => r.role === 'shelter').length})
                    </h3>
                    <div className="space-y-3">
                        {requests.filter(r => r.role === 'shelter').map(profile => (
                            <RegistrationCard key={profile.id} profile={profile} />
                        ))}
                        {requests.filter(r => r.role === 'shelter').length === 0 && (
                            <div className="text-sm text-slate-400 italic">No new shelter registrations.</div>
                        )}
                    </div>
                </div>
            </div>
        ) : (
            <>
                {requests.length === 0 ? (
                    <div className="bg-white dark:bg-slate-800 rounded-3xl p-12 text-center border border-slate-100 dark:border-slate-700 shadow-sm">
                        <div className="w-20 h-20 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Check className="text-slate-400" size={40} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">No Requests Here</h3>
                        <p className="text-slate-500">No records found for this view.</p>
                    </div>
                ) : (
                    <div className="grid lg:grid-cols-3 gap-6">
                        {/* LIST */}
                        <div className="lg:col-span-1 space-y-4">
                            {requests.map((req) => (
                                <div 
                                    key={req.id}
                                    onClick={() => setSelectedRequest(req)}
                                    className={`p-4 rounded-xl cursor-pointer border transition-all ${
                                        selectedRequest?.id === req.id 
                                        ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-500 shadow-md' 
                                        : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:border-indigo-300'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                                            {req.avatar_url ? (
                                                <img src={req.avatar_url} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center"><User size={20} className="text-slate-400" /></div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-slate-800 dark:text-white truncate">{req.full_name || 'Anonymous'}</p>
                                            <div className="flex items-center gap-2 text-xs">
                                                <span className={`px-2 py-0.5 rounded-full uppercase font-bold ${
                                                    req.role === 'vet' ? 'bg-emerald-100 text-emerald-700' :
                                                    req.role === 'rescuer' ? 'bg-orange-100 text-orange-700' :
                                                    req.role === 'shelter' ? 'bg-blue-100 text-blue-700' : 
                                                    'bg-slate-100 text-slate-600'
                                                }`}>
                                                    {req.role}
                                                </span>
                                                {view === 'history' && (
                                                    <span className={`px-2 py-0.5 rounded-full uppercase font-bold ${req.verification_status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                        {req.verification_status}
                                                    </span>
                                                )}
                                                <span className="text-slate-400 truncate ml-auto">{new Date(req.updated_at).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* DETAIL VIEW */}
                        <div className="lg:col-span-2">
                            <AnimatePresence mode="wait">
                                {selectedRequest ? (
                                    <motion.div 
                                        key={selectedRequest.id}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 20 }}
                                        className="bg-white dark:bg-slate-800 rounded-3xl p-6 md:p-8 border border-slate-100 dark:border-slate-700 shadow-xl"
                                    >
                                        <div className="flex justify-between items-start mb-6">
                                            <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                                {view === 'history' ? 'Application History' : 'Reviewing Application'}
                                            </h2>
                                            <button onClick={() => setSelectedRequest(null)} className="lg:hidden p-2 bg-slate-100 rounded-full">
                                                <X size={20} />
                                            </button>
                                        </div>

                                        {/* User Info */}
                                        <div className="flex items-center gap-4 mb-8 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-2xl">
                                            <div className="w-16 h-16 rounded-full bg-slate-200 dark:bg-slate-600 overflow-hidden flex-shrink-0">
                                                {selectedRequest.avatar_url ? (
                                                    <img src={selectedRequest.avatar_url} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center"><User size={32} className="text-slate-400"/></div>
                                                )}
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{selectedRequest.full_name}</h3>
                                                <p className="text-slate-500 dark:text-slate-400">{selectedRequest.email}</p>
                                                <div className="flex gap-2 mt-2">
                                                    <span className="text-xs bg-slate-200 dark:bg-slate-600 px-2 py-1 rounded text-slate-600 dark:text-slate-300 font-mono">{selectedRequest.role}</span>
                                                    <span className="text-xs bg-slate-200 dark:bg-slate-600 px-2 py-1 rounded text-slate-600 dark:text-slate-300 font-mono">{selectedRequest.location || 'No Location'}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Documents Grid */}
                                        <h4 className="font-bold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
                                            <FileText size={18} /> Submitted Documents
                                        </h4>
                                        
                                        <div className="grid md:grid-cols-2 gap-4 mb-8">
                                            {/* NIC Front */}
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold uppercase text-slate-400">NIC Front</label>
                                                <div className="h-48 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 overflow-hidden relative group">
                                                    {selectedRequest.verification_nic_url ? (
                                                        <a href={getDocUrl(selectedRequest.verification_nic_url)} target="_blank" rel="noopener noreferrer" className="block w-full h-full">
                                                            <img src={getDocUrl(selectedRequest.verification_nic_url)} className="w-full h-full object-cover transition-transform group-hover:scale-105" alt="NIC Front" />
                                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                                                <Eye className="text-white opacity-0 group-hover:opacity-100 drop-shadow-md" size={32} />
                                                            </div>
                                                        </a>
                                                    ) : (
                                                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                                                            <AlertCircle size={24} className="mb-2" />
                                                            <span className="text-xs">Not Uploaded</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* NIC Back */}
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold uppercase text-slate-400">NIC Back</label>
                                                <div className="h-48 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 overflow-hidden relative group">
                                                    {selectedRequest.verification_nic_back_url ? (
                                                        <a href={getDocUrl(selectedRequest.verification_nic_back_url)} target="_blank" rel="noopener noreferrer" className="block w-full h-full">
                                                            <img src={getDocUrl(selectedRequest.verification_nic_back_url)} className="w-full h-full object-cover transition-transform group-hover:scale-105" alt="NIC Back" />
                                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                                                <Eye className="text-white opacity-0 group-hover:opacity-100 drop-shadow-md" size={32} />
                                                            </div>
                                                        </a>
                                                    ) : (
                                                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                                                            <AlertCircle size={24} className="mb-2" />
                                                            <span className="text-xs">Not Uploaded</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* License / Extra */}
                                            <div className="space-y-2 md:col-span-2">
                                                <label className="text-xs font-bold uppercase text-slate-400">Supporting Document (License/Reg)</label>
                                                <div className="h-48 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 overflow-hidden relative group">
                                                    {selectedRequest.verification_license_url ? (
                                                        <a href={getDocUrl(selectedRequest.verification_license_url)} target="_blank" rel="noopener noreferrer" className="block w-full h-full">
                                                            <img src={getDocUrl(selectedRequest.verification_license_url)} className="w-full h-full object-cover transition-transform group-hover:scale-105" alt="License" />
                                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                                                <Eye className="text-white opacity-0 group-hover:opacity-100 drop-shadow-md" size={32} />
                                                            </div>
                                                        </a>
                                                    ) : (
                                                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                                                            <span className="text-xs">No extra document provided</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        {selectedRequest.verification_status === 'submitted' ? (
                                            <div className="flex gap-4 pt-6 border-t border-slate-100 dark:border-slate-700">
                                                <button 
                                                    onClick={() => handleDecision(selectedRequest.id, 'rejected')}
                                                    className="flex-1 py-4 rounded-xl font-bold bg-white border-2 border-slate-200 text-slate-600 hover:border-red-200 hover:bg-red-50 hover:text-red-500 transition-colors flex items-center justify-center gap-2"
                                                >
                                                    <X size={20} /> Reject
                                                </button>
                                                <button 
                                                    onClick={() => openChat(selectedRequest.id)}
                                                    className="py-4 px-6 rounded-xl font-bold bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors flex items-center justify-center gap-2"
                                                    title="Message User"
                                                >
                                                    <MessageCircle size={20} />
                                                </button>
                                                <button 
                                                    onClick={() => handleDecision(selectedRequest.id, 'approved')}
                                                    className="flex-1 py-4 rounded-xl font-bold bg-slate-900 text-white hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2 shadow-xl shadow-slate-200"
                                                >
                                                    <Check size={20} /> Approve & Verify
                                                </button>
                                            </div>
                                        ) : (
                                            <div className={`mt-6 p-4 rounded-xl text-center font-bold flex flex-col items-center justify-center gap-2 ${
                                                selectedRequest.verification_status === 'approved' 
                                                ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' 
                                                : 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                                            }`}>
                                                <div className={`p-3 rounded-full ${
                                                    selectedRequest.verification_status === 'approved' ? 'bg-emerald-100 dark:bg-emerald-900/50' : 'bg-red-100 dark:bg-red-900/50'
                                                }`}>
                                                    {selectedRequest.verification_status === 'approved' ? <Check size={24} /> : <X size={24} />}
                                                </div>
                                                <div className="text-lg">
                                                    Request {selectedRequest.verification_status === 'approved' ? 'Approved' : 'Rejected'}
                                                </div>
                                                <p className="text-xs opacity-70 font-normal">
                                                    Decision made on {new Date(selectedRequest.updated_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                        )}

                                    </motion.div>
                                ) : (
                                    <div className="hidden lg:flex flex-col items-center justify-center h-full min-h-[500px] text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-3xl bg-slate-50 dark:bg-slate-900/50">
                                        <Shield size={48} className="mb-4 opacity-20" />
                                        <p>Select a request to view details</p>
                                    </div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                )}
            </>
        )}
      </div>
    </div>
  );
}
