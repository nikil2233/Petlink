import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { useChat } from '../context/ChatContext';
import { 
  FileText, Check, X, Clock, ChevronDown, ChevronUp, 
  User, MapPin, Calendar, MessageCircle, Shield, AlertCircle 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AdoptionRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const navigate = useNavigate();
  const { openChat } = useChat();

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/auth');
        return;
      }

      const { data, error } = await supabase
        .from('adoption_requests')
        .select(`
            *,
            adoptions!inner (
                id,
                name,
                image_url,
                species,
                posted_by
            ),
            profiles:requester_id (
                full_name,
                email,
                avatar_url
            )
        `)
        .eq('adoptions.posted_by', session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  // Scheduling Logic
  const [processingRequest, setProcessingRequest] = useState(null); // The request being "approved"
  const [meetingDate, setMeetingDate] = useState('');
  const [meetingTime, setMeetingTime] = useState('');
  const [instructions, setInstructions] = useState('');

  const handleApproveClick = (request, e) => {
      e.stopPropagation();
      setProcessingRequest(request);
      // Default tomorrow 10am
      const tmr = new Date();
      tmr.setDate(tmr.getDate() + 1);
      setMeetingDate(tmr.toISOString().split('T')[0]);
      setMeetingTime('10:00');
      setInstructions('Please bring a valid ID and a pet carrier.');
  };

  const confirmApproval = async () => {
    if (!meetingDate || !meetingTime) {
        alert("Please select a date and time for the adoption meeting.");
        return;
    }

    try {
        const timestamp = new Date(`${meetingDate}T${meetingTime}`).toISOString();
        const requestId = processingRequest.id;

        // 1. Update Request
        const { error: updateError } = await supabase
            .from('adoption_requests')
            .update({ 
                status: 'approved',
                meeting_datetime: timestamp,
                meeting_instructions: instructions
            })
            .eq('id', requestId);

        if (updateError) throw updateError;
        
        // 2. Mark Pet as Adopted
        const { error: adoptionError } = await supabase
            .from('adoptions')
            .update({ status: 'adopted' })
            .eq('id', processingRequest.adoptions.id);

        if (adoptionError) console.error("Error updating adoption status", adoptionError);

        // 3. Notify User
        await supabase
            .from('notifications')
            .insert([{
                user_id: processingRequest.requester_id,
                type: 'adoption_update',
                message: `Congratulations! Your adoption application for ${processingRequest.adoptions.name} has been APPROVED! Meeting scheduled for ${meetingDate} at ${meetingTime}. Details: ${instructions}`,
                metadata: { request_id: requestId }
            }]);
        
        // Update local state
        setRequests(requests.map(r => 
            r.id === requestId ? { ...r, status: 'approved', meeting_datetime: timestamp, meeting_instructions: instructions } : r
        ));
        
        setProcessingRequest(null);
        // Optional: show a toast instead of alert

    } catch (error) {
        console.error('Error updating status:', error);
        alert('Failed to update status');
    }
  };

  const handleReject = async (requestId, e) => {
      e.stopPropagation();
      if(!window.confirm("Are you sure you want to reject this application?")) return;
      try {
          const { error } = await supabase
            .from('adoption_requests')
            .update({ status: 'rejected' })
            .eq('id', requestId);

          if (error) throw error;

          setRequests(requests.map(r => r.id === requestId ? { ...r, status: 'rejected' } : r));
      } catch (e) {
          console.error(e);
          alert("Failed to reject");
      }
  };

  if (loading) return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pt-32 pb-12 flex justify-center transition-colors duration-300">
          <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full"></div>
      </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pt-28 pb-20 px-4 transition-colors duration-300">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="mb-10 text-center md:text-left">
            <h1 className="text-4xl font-black text-slate-800 dark:text-white mb-3 tracking-tight">Adoption Requests</h1>
            <p className="text-lg text-slate-500 dark:text-slate-400 font-medium">Manage and review applications for your foster pets.</p>
        </div>

        {/* Scheduling Modal */}
        <AnimatePresence>
            {processingRequest && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-white dark:bg-slate-800 rounded-[2rem] max-w-lg w-full p-8 shadow-2xl relative overflow-hidden transition-colors duration-300"
                    >
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-400 to-teal-500"></div>
                        
                        <h3 className="text-2xl font-black mb-2 flex items-center gap-3 text-slate-800 dark:text-white">
                            <Clock className="text-emerald-500" /> Schedule Meeting
                        </h3>
                        <p className="text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
                            You are approving <strong>{processingRequest.profiles?.full_name}</strong> to adopt <strong>{processingRequest.adoptions.name}</strong>.
                            Set a time for the final handover or meet-and-greet.
                        </p>
                        
                        <div className="space-y-6 mb-8">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Date</label>
                                    <input 
                                        type="date" 
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                                        value={meetingDate}
                                        onChange={e => setMeetingDate(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Time</label>
                                    <input 
                                        type="time" 
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                                        value={meetingTime}
                                        onChange={e => setMeetingTime(e.target.value)}
                                    />
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Instructions</label>
                                <textarea 
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-600 dark:text-slate-300 font-medium outline-none focus:ring-2 focus:ring-emerald-500 transition-all resize-none"
                                    rows="3"
                                    value={instructions}
                                    onChange={e => setInstructions(e.target.value)}
                                    placeholder="e.g. Please bring a cat carrier and your ID..."
                                />
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <button 
                                onClick={() => setProcessingRequest(null)}
                                className="flex-1 py-4 rounded-xl text-slate-500 dark:text-slate-400 font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={confirmApproval}
                                className="flex-[2] py-4 rounded-xl bg-slate-900 dark:bg-emerald-600 text-white font-bold hover:bg-slate-800 dark:hover:bg-emerald-700 transition-all shadow-lg shadow-slate-200 dark:shadow-none"
                            >
                                Confirm & Notify
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>

        {requests.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-12 text-center shadow-sm border border-slate-100 dark:border-slate-700 transition-colors duration-300">
                <div className="w-20 h-20 bg-slate-50 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300 dark:text-slate-500">
                    <FileText size={32} />
                </div>
                <h3 className="text-xl font-bold text-slate-700 dark:text-white mb-2">No Applications Yet</h3>
                <p className="text-slate-500 dark:text-slate-400">Wait for potential adopters to submit their applications.</p>
            </div>
        ) : (
            <div className="flex flex-col gap-12">
                {/* Active Applications */}
                {requests.filter(r => r.status === 'pending').length > 0 && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="border-l-4 border-amber-500 pl-4 md:pl-6 py-2">
                        <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-3">
                           <div className="bg-amber-500 w-3 h-3 rounded-full shadow-sm ring-4 ring-amber-500/20"></div>
                           Awaiting Review
                        </h2>
                        <div className="flex flex-col gap-6">
                            {requests.filter(r => r.status === 'pending').map((req) => (
                                <RequestCard 
                                    key={req.id} 
                                    req={req} 
                                    expandedId={expandedId} 
                                    setExpandedId={setExpandedId} 
                                    handleReject={handleReject} 
                                    handleApproveClick={handleApproveClick} 
                                    openChat={openChat} 
                                />
                            ))}
                        </div>
                    </motion.div>
                )}

                {/* History */}
                {requests.filter(r => r.status !== 'pending').length > 0 && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
                        <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-3 opacity-90">
                           <div className="bg-slate-300 dark:bg-slate-600 w-3 h-3 rounded-full shadow-sm"></div>
                           History
                        </h2>
                        <div className="flex flex-col gap-6 opacity-85">
                            {requests.filter(r => r.status !== 'pending').map((req) => (
                                <RequestCard 
                                    key={req.id} 
                                    req={req} 
                                    expandedId={expandedId} 
                                    setExpandedId={setExpandedId} 
                                    handleReject={handleReject} 
                                    handleApproveClick={handleApproveClick} 
                                    openChat={openChat} 
                                />
                            ))}
                        </div>
                    </motion.div>
                )}
            </div>
        )}
      </div>
    </div>
  );
}

// Helper Component for Card
const RequestCard = ({ req, expandedId, setExpandedId, handleReject, handleApproveClick, openChat }) => {
    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`bg-white dark:bg-slate-800 rounded-[2rem] overflow-hidden transition-all duration-300 border border-slate-100 dark:border-slate-700 ${expandedId === req.id ? 'shadow-2xl ring-1 ring-slate-100 dark:ring-slate-700' : 'shadow-sm hover:shadow-md'}`}
        >
            {/* Summary Header */}
            <div 
                className="p-6 md:p-8 cursor-pointer flex flex-col md:flex-row items-start md:items-center gap-6"
                onClick={() => setExpandedId(expandedId === req.id ? null : req.id)}
            >
                {/* Pet Info */}
                <div className="flex items-center gap-5 flex-1">
                    <div className="w-16 h-16 md:w-20 md:h-20 bg-slate-100 dark:bg-slate-700 rounded-2xl overflow-hidden shadow-inner shrink-0 relative">
                        {req.adoptions.image_url ? (
                            <img src={req.adoptions.image_url} className="w-full h-full object-cover" alt="Pet" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-slate-500"><FileText size={24}/></div>
                        )}
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-slate-800 dark:text-white mb-1">{req.adoptions.name}</h3>
                        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-medium text-sm">
                            <User size={14} /> 
                            <span>Applicant: <span className="text-slate-700 dark:text-slate-300">{req.profiles?.full_name || 'Unknown'}</span></span>
                        </div>
                    </div>
                </div>

                {/* Status & Toggle */}
                <div className="flex items-center justify-between w-full md:w-auto gap-6 mt-4 md:mt-0">
                    <StatusBadge status={req.status} />
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${expandedId === req.id ? 'bg-slate-100 dark:bg-slate-700 rotate-180' : 'bg-slate-50 dark:bg-slate-700/50'}`}>
                        <ChevronDown size={20} className="text-slate-400 dark:text-slate-500" />
                    </div>
                </div>
            </div>

            {/* Expanded Content */}
            <AnimatePresence>
                {expandedId === req.id && (
                    <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                    >
                        <div className="bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-700">
                        <div className="p-6 md:p-8 grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12">
                            
                            {/* Left Col: Applicant Info */}
                            <div className="space-y-6">
                                <h4 className="flex items-center gap-2 text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                                    <User size={16} /> Applicant Profile
                                </h4>
                                
                                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm space-y-4">
                                    <InfoRow label="Full Name" value={req.profiles?.full_name} />
                                    <InfoRow label="Email" value={req.profiles?.email} />
                                    <InfoRow label="Phone" value={req.phone} />
                                    <InfoRow label="Location" value={req.address} icon={<MapPin size={14} className="text-slate-400 dark:text-slate-500" />} />
                                </div>
                            </div>

                            {/* Right Col: Answers */}
                            <div className="space-y-6">
                                <h4 className="flex items-center gap-2 text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                                    <FileText size={16} /> Application Details
                                </h4>
                                
                                <div className="space-y-4">
                                    <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                                        <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Living Situation</p>
                                        <p className="font-semibold text-slate-700 dark:text-slate-200">{req.living_situation}</p>
                                    </div>
                                    
                                    <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                                        <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Experience & Pets</p>
                                        <div className="flex items-start gap-2">
                                            {req.has_other_pets && (
                                                <div className="mt-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 p-1 rounded-md shrink-0" title="Has other pets">
                                                    <AlertCircle size={14} />
                                                </div>
                                            )}
                                            <p className="font-semibold text-slate-700 dark:text-slate-200 leading-relaxed">
                                                {req.experience || "No details provided."}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm relative overflow-hidden">
                                        <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
                                        <p className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                                            <MessageCircle size={12} /> Message
                                        </p>
                                        <p className="font-medium text-slate-600 dark:text-slate-300 italic leading-relaxed">"{req.message}"</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Action Bar */}
                        <div className="p-6 md:p-8 border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white">
                            {req.status === 'pending' ? (
                                <div className="flex flex-col md:flex-row gap-4 justify-end">
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            openChat(req.requester_id);
                                        }}
                                        className="px-6 py-4 rounded-xl border-2 border-slate-100 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-bold hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-100 dark:hover:border-indigo-900/30 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <MessageCircle size={18} /> Message
                                    </button>
                                    <button 
                                        onClick={(e) => handleReject(req.id, e)}
                                        className="px-8 py-4 rounded-xl border-2 border-slate-100 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-bold hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 hover:border-red-100 dark:hover:border-red-900/30 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <X size={18} /> Reject
                                    </button>
                                    <button 
                                        onClick={(e) => handleApproveClick(req, e)}
                                        className="px-8 py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold shadow-lg shadow-emerald-200 dark:shadow-none hover:shadow-xl hover:-translate-y-1 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Check size={18} /> Approve Application
                                    </button>
                                </div>
                            ) : req.status === 'approved' ? (
                                <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/30 rounded-xl p-4 flex items-start gap-3">
                                    <div className="p-2 bg-emerald-100 dark:bg-emerald-900/40 rounded-full text-emerald-600 dark:text-emerald-400 shrink-0">
                                        <Check size={20} />
                                    </div>
                                    <div>
                                        <h5 className="font-bold text-emerald-900 dark:text-emerald-400">Application Approved</h5>
                                        <p className="text-sm text-emerald-700 dark:text-emerald-500 mt-1">
                                            Meeting scheduled for <strong>{new Date(req.meeting_datetime).toLocaleDateString()}</strong> at <strong>{new Date(req.meeting_datetime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</strong>.
                                        </p>
                                        <p className="text-xs text-emerald-600/80 dark:text-emerald-500/80 mt-2 uppercase tracking-wide font-bold">Instructions: {req.meeting_instructions}</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-xl p-4 flex items-center gap-3 text-red-700 dark:text-red-400 font-bold opacity-75">
                                    <X size={20} /> Application Rejected
                                </div>
                            )}
                        </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

// Helpers
const StatusBadge = ({ status }) => {
    const configs = {
        pending: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', label: 'Pending Review', icon: <Clock size={12} /> },
        approved: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400', label: 'Approved', icon: <Check size={12} /> },
        rejected: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', label: 'Rejected', icon: <X size={12} /> },
    };
    const config = configs[status] || configs.pending;

    return (
        <div className={`px-4 py-2 rounded-full font-bold text-xs uppercase tracking-wider flex items-center gap-2 ${config.bg} ${config.text}`}>
            {config.icon} {config.label}
        </div>
    );
};

const InfoRow = ({ label, value, icon }) => (
    <div className="flex justify-between items-center group">
        <span className="text-slate-400 dark:text-slate-500 font-medium text-sm flex items-center gap-2">{icon} {label}</span>
        <span className="font-bold text-slate-700 dark:text-slate-300 text-sm group-hover:text-slate-900 dark:group-hover:text-white transition-colors">{value || 'N/A'}</span>
    </div>
);
