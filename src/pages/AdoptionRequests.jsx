import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Check, X, Clock, HelpCircle, User, Phone, MapPin, Home, MessageSquare } from 'lucide-react';

export default function AdoptionRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending'); // 'pending', 'approved', 'rejected', 'all'

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Fetch requests for pets posted by THIS user
      // We need to join with adoptions to check posted_by, and profiles to get requester info
      const { data, error } = await supabase
        .from('adoption_requests')
        .select(`
          *,
          adoptions!inner (
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
        .eq('adoptions.posted_by', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (requestId, newStatus) => {
    try {
      const { error } = await supabase
        .from('adoption_requests')
        .update({ status: newStatus })
        .eq('id', requestId);

      if (error) throw error;
      
      // Update local state
      setRequests(requests.map(r => r.id === requestId ? { ...r, status: newStatus } : r));
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status');
    }
  };

  const filteredRequests = requests.filter(r => {
    if (filter === 'all') return true;
    return r.status === filter;
  });

  return (
    <div className="page-container flex flex-col gap-8">
      <div className="mb-2">
        <h1 className="text-3xl font-bold mb-2">Adoption Requests</h1>
        <p className="text-muted">Manage applications for your listed pets.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border pb-1 overflow-x-auto">
        {['pending', 'approved', 'rejected', 'all'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-6 py-2 border-b-2 transition-colors font-medium text-lg capitalize whitespace-nowrap ${
                filter === f 
                    ? 'border-primary text-primary' 
                    : 'border-transparent text-muted hover:text-foreground'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted">Loading requests...</div>
      ) : filteredRequests.length === 0 ? (
        <div className="text-center py-16 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
          <p className="text-muted">No {filter} requests found.</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {filteredRequests.map(request => (
            <div key={request.id} className="glass-panel !p-0 grid grid-cols-1 md:grid-cols-[280px_1fr] overflow-hidden">
              
              {/* Left Column: Pet & Status */}
              <div className="bg-slate-50 p-6 border-b md:border-b-0 md:border-r border-border flex flex-col items-center text-center">
                 <div className="w-24 h-24 rounded-full overflow-hidden mb-4 border-4 border-white shadow-md">
                    <img src={request.adoptions.image_url} alt={request.adoptions.name} className="w-full h-full object-cover" />
                 </div>
                 <h3 className="text-xl font-bold mb-1">{request.adoptions.name}</h3>
                 <span className="text-sm text-muted mb-6 uppercase tracking-wider">{request.adoptions.species}</span>
                 
                 <div className="mt-auto w-full">
                    <div className={`
                        py-3 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2
                        ${request.status === 'pending' ? 'bg-orange-50 text-orange-700' : ''}
                        ${request.status === 'approved' ? 'bg-green-50 text-green-700' : ''}
                        ${request.status === 'rejected' ? 'bg-red-50 text-red-700' : ''}
                    `}>
                        {request.status === 'pending' && <Clock size={18} />}
                        {request.status === 'approved' && <Check size={18} />}
                        {request.status === 'rejected' && <X size={18} />}
                        <span className="capitalize">{request.status}</span>
                    </div>
                 </div>
              </div>

              {/* Right Column: Applicant Details */}
              <div className="p-6 md:p-8">
                 <div className="flex flex-col sm:flex-row justify-between items-start mb-8 gap-4">
                    <div className="flex gap-4 items-center">
                        <div className="w-14 h-14 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                            {request.profiles?.avatar_url ? (
                                <img src={request.profiles.avatar_url} alt={request.profiles.full_name} className="w-full h-full object-cover" />
                            ) : (
                                <User size={28} className="text-slate-400" />
                            )}
                        </div>
                        <div>
                            <h4 className="text-lg font-bold m-0 text-gray-900">{request.profiles?.full_name || 'Anonymous User'}</h4>
                            <p className="text-sm text-muted m-0">{request.profiles?.email}</p>
                        </div>
                    </div>
                    <div className="text-xs font-semibold text-muted bg-slate-100 px-3 py-1 rounded-full whitespace-nowrap">
                        Applied on {new Date(request.created_at).toLocaleDateString()}
                    </div>
                 </div>

                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
                    <div>
                        <p className="text-xs text-muted font-bold uppercase mb-1 flex items-center gap-1"><Phone size={12} /> Phone</p>
                        <p className="font-semibold">{request.phone}</p>
                    </div>
                    <div>
                        <p className="text-xs text-muted font-bold uppercase mb-1 flex items-center gap-1"><MapPin size={12} /> Address</p>
                        <p className="font-semibold">{request.address}</p>
                    </div>
                    <div>
                        <p className="text-xs text-muted font-bold uppercase mb-1 flex items-center gap-1"><Home size={12} /> Living Situation</p>
                        <p className="font-semibold">{request.living_situation} {request.has_other_pets && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded ml-2">Has Pets</span>}</p>
                    </div>
                    <div>
                        <p className="text-xs text-muted font-bold uppercase mb-1 flex items-center gap-1"><HelpCircle size={12} /> Experience</p>
                        <p className="font-semibold">{request.experience}</p>
                    </div>
                 </div>

                 <div className="bg-slate-50 p-6 rounded-xl border border-border">
                    <p className="text-xs text-muted font-bold uppercase mb-2 flex items-center gap-1"><MessageSquare size={12} /> Message from applicant</p>
                    <div className="text-sm leading-relaxed italic text-gray-700">
                        "{request.message}"
                    </div>
                 </div>

                 {/* Actions */}
                 {request.status === 'pending' && (
                     <div className="flex gap-4 mt-8 pt-6 border-t border-border">
                         <button 
                            onClick={() => updateStatus(request.id, 'approved')}
                            className="btn bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-none flex-1 justify-center" 
                         >
                            <Check size={18} /> Approve Adoption
                         </button>
                         <button 
                            onClick={() => updateStatus(request.id, 'rejected')}
                            className="btn bg-rose-100 text-rose-800 hover:bg-rose-200 border-none flex-1 justify-center" 
                         >
                             <X size={18} /> Reject
                         </button>
                     </div>
                 )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
