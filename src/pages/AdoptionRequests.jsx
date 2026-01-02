import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { FileText, Check, X, Clock, ChevronDown, ChevronUp, User, MapPin } from 'lucide-react';

export default function AdoptionRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const navigate = useNavigate();

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

      // Fetch requests for pets posted by the current user
      // We need to join with adoptions to filter by posted_by = user.id
      // Supabase join syntax: adoption_requests(..., adoptions!inner(...))
      
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

  const handleApproveClick = (request) => {
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
        // This hides it from the main feed (if filtered correctly)
        const { error: adoptionError } = await supabase
            .from('adoptions')
            .update({ status: 'adopted' })
            .eq('id', processingRequest.adoptions.id);

        if (adoptionError) { 
             console.error("Error updating adoption status", adoptionError);
             // Verify if we want to throw or just log? Let's log but continue notification.
        }

        // 3. Notify User
        const { error: notifyError } = await supabase
            .from('notifications')
            .insert([{
                user_id: processingRequest.requester_id,
                type: 'adoption_update',
                message: `Congratulations! Your adoption application for ${processingRequest.adoptions.name} has been APPROVED! Meeting scheduled for ${meetingDate} at ${meetingTime}.`,
                metadata: { request_id: requestId }
            }]);
        
        if (notifyError) console.error("Notify Error", notifyError);
        
        // Update local state
        setRequests(requests.map(r => 
            r.id === requestId ? { ...r, status: 'approved', meeting_datetime: timestamp, meeting_instructions: instructions } : r
        ));
        
        setProcessingRequest(null);
        alert("Application approved and applicant notified!");

    } catch (error) {
        console.error('Error updating status:', error);
        alert('Failed to update status');
    }
  };

  // Reject logic remains simple
  const handleReject = async (requestId) => {
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

  if (loading) return <div className="page-container text-center py-20">Loading requests...</div>;

  return (
    <div className="page-container relative">
      <h1 className="mb-8">Adoption Applications</h1>

      {/* Scheduling Modal */}
      {processingRequest && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl animate-fade-in">
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                      <Clock className="text-primary" /> Schedule Adoption Meeting
                  </h3>
                  <p className="text-muted mb-6">
                      Great news! You are approving <strong>{processingRequest.profiles?.full_name}</strong> to adopt <strong>{processingRequest.adoptions.name}</strong>.
                      <br/>
                      Please set a meeting time for them to pick up the pet or visit.
                  </p>
                  
                  <div className="space-y-4 mb-8">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold mb-1">Date</label>
                            <input 
                                type="date" 
                                className="form-input w-full"
                                value={meetingDate}
                                onChange={e => setMeetingDate(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold mb-1">Time</label>
                            <input 
                                type="time" 
                                className="form-input w-full"
                                value={meetingTime}
                                onChange={e => setMeetingTime(e.target.value)}
                            />
                        </div>
                      </div>
                      
                      <div>
                          <label className="block text-sm font-semibold mb-1">Instructions / Message</label>
                          <textarea 
                              className="form-textarea w-full"
                              rows="3"
                              value={instructions}
                              onChange={e => setInstructions(e.target.value)}
                              placeholder="e.g. Please bring your ID, a leash, and the adoption fee..."
                          />
                      </div>
                  </div>

                  <div className="flex justify-end gap-3">
                      <button 
                          onClick={() => setProcessingRequest(null)}
                          className="btn bg-slate-100 hover:bg-slate-200 text-slate-700"
                      >
                          Cancel
                      </button>
                      <button 
                          onClick={confirmApproval}
                          className="btn btn-primary"
                      >
                          Confirm Approval & Notify
                      </button>
                  </div>
              </div>
          </div>
      )}

      {requests.length === 0 ? (
        <div className="glass-panel text-center py-16">
            <FileText size={48} className="mx-auto mb-4 text-muted" />
            <h3>No Applications Yet</h3>
            <p className="text-muted">When users apply to adopt your pets, they will appear here.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
            {requests.map(req => (
                <div key={req.id} className="glass-panel p-0 overflow-hidden transition-all">
                    {/* Header Row */}
                    <div 
                        className="p-6 flex items-center justify-between cursor-pointer hover:bg-slate-50"
                        onClick={() => setExpandedId(expandedId === req.id ? null : req.id)}
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-slate-200 rounded-lg overflow-hidden shrink-0">
                                {req.adoptions.image_url ? (
                                    <img src={req.adoptions.image_url} className="w-full h-full object-cover" alt="Pet" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-xs font-bold text-muted">PET</div>
                                )}
                            </div>
                            <div>
                                <h3 className="text-lg font-bold m-0">{req.adoptions.name}</h3>
                                <p className="text-sm text-muted m-0">Applicant: {req.profiles?.full_name || 'Unknown'}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                             <div className={`px-3 py-1 rounded-full text-xs font-bold border ${
                                req.status === 'pending' ? 'bg-orange-100 text-orange-700 border-orange-200' :
                                req.status === 'approved' ? 'bg-green-100 text-green-700 border-green-200' :
                                'bg-red-100 text-red-700 border-red-200'
                            }`}>
                                {req.status === 'approved' ? 'SCHEDULED' : req.status.toUpperCase()}
                            </div>
                            {expandedId === req.id ? <ChevronUp size={20} className="text-muted" /> : <ChevronDown size={20} className="text-muted" />}
                        </div>
                    </div>

                    {/* Expanded Details */}
                    {expandedId === req.id && (
                        <div className="p-6 border-t border-border bg-subtle/30 animate-fade-in">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div>
                                    <h4 className="flex items-center gap-2 mb-4 text-primary"><User size={18} /> Applicant Details</h4>
                                    <div className="space-y-3 text-sm">
                                        <div className="flex justify-between border-b border-border/50 pb-2">
                                            <span className="text-muted">Full Name</span>
                                            <span className="font-semibold">{req.profiles?.full_name}</span>
                                        </div>
                                        <div className="flex justify-between border-b border-border/50 pb-2">
                                            <span className="text-muted">Email</span>
                                            <span className="font-semibold">{req.profiles?.email}</span>
                                        </div>
                                        <div className="flex justify-between border-b border-border/50 pb-2">
                                            <span className="text-muted">Phone</span>
                                            <span className="font-semibold">{req.phone}</span>
                                        </div>
                                        <div className="flex justify-between border-b border-border/50 pb-2">
                                            <span className="text-muted">Location</span>
                                            <span className="font-semibold">{req.address}</span>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <h4 className="flex items-center gap-2 mb-4 text-primary"><FileText size={18} /> Application Answers</h4>
                                    <div className="space-y-4 text-sm">
                                        <div>
                                            <p className="text-muted mb-1 text-xs uppercase tracking-wider font-bold">Living Situation</p>
                                            <p className="font-medium bg-white p-2 rounded border border-border">{req.living_situation}</p>
                                        </div>
                                        <div>
                                            <p className="text-muted mb-1 text-xs uppercase tracking-wider font-bold">Experience / Pets</p>
                                            <p className="font-medium bg-white p-2 rounded border border-border">
                                                {req.has_other_pets ? 'Has other pets. ' : 'No other pets. '} 
                                                {req.experience}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-muted mb-1 text-xs uppercase tracking-wider font-bold">Message</p>
                                            <p className="font-medium bg-white p-2 rounded border border-border italic">"{req.message}"</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Show Scheduled Info if Approved */}
                            {req.status === 'approved' && req.meeting_datetime && (
                                <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                                    <h4 className="text-green-800 flex items-center gap-2 mb-2">
                                        <Check size={18} /> Meeting Scheduled
                                    </h4>
                                    <p className="text-green-700 text-sm">
                                        <strong>When:</strong> {new Date(req.meeting_datetime).toLocaleString()}
                                        <br/>
                                        <strong>Instructions:</strong> {req.meeting_instructions || 'None'}
                                    </p>
                                </div>
                            )}

                            {req.status === 'pending' && (
                                <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-border">
                                    <button 
                                        onClick={() => handleReject(req.id)}
                                        className="btn bg-white border border-danger text-danger hover:bg-red-50"
                                    >
                                        <X size={18} /> Reject
                                    </button>
                                    <button 
                                        onClick={() => handleApproveClick(req)}
                                        className="btn btn-primary"
                                    >
                                        <Check size={18} /> Approve Application
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            ))}
        </div>
      )}
    </div>
  );
}
