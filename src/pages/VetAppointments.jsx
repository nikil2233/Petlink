import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Calendar, Clock, Check, X, User, MessageSquare, Stethoscope } from 'lucide-react';

export default function VetAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending'); // 'pending', 'confirmed', 'history'

  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [acceptanceModal, setAcceptanceModal] = useState(null);
  const [acceptanceForm, setAcceptanceForm] = useState({
      confirmed_date: '',
      confirmed_time: '',
      pre_surgery_instructions: '',
      surgery_details: '',
      post_surgery_care: '',
      vet_notes: ''
  });

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('appointments')
        .select(`
            *,
            profiles:pet_owner_id (
                full_name,
                email,
                avatar_url,
                phone: id
            )
        `)
        .eq('vet_id', user.id)
        .order('appointment_date', { ascending: true });

      if (error) throw error;
      setAppointments(data || []);
    } catch (error) {
      console.error('Error fetching appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const openAcceptanceModal = (appointment) => {
      setAcceptanceModal(appointment);
      setAcceptanceForm({
          confirmed_date: appointment.appointment_date,
          confirmed_time: appointment.time_slot,
          pre_surgery_instructions: 'Do not feed your pet for 8-12 hours before surgery. Water allowed until 2 hours prior.',
          surgery_details: appointment.service_type === 'sterilization' ? 'Spay/Neuter Procedure' : 'General Checkup',
          post_surgery_care: 'Keep in a quiet place. Monitor for any unusual behavior.',
          vet_notes: ''
      });
  };

  const handleConfirmAcceptance = async () => {
      if (!acceptanceModal) return;

      try {
          const updates = {
              status: 'confirmed',
              confirmed_date: acceptanceForm.confirmed_date,
              confirmed_time: acceptanceForm.confirmed_time,
              pre_surgery_instructions: acceptanceForm.pre_surgery_instructions,
              surgery_details: acceptanceForm.surgery_details,
              post_surgery_care: acceptanceForm.post_surgery_care,
              vet_notes: acceptanceForm.vet_notes
          };

          const { error } = await supabase
            .from('appointments')
            .update(updates)
            .eq('id', acceptanceModal.id);
          
          if (error) throw error;

          // Notify User
          await supabase.from('notifications').insert([{
              user_id: acceptanceModal.pet_owner_id,
              type: 'status_change',
              message: `Your appointment for ${acceptanceModal.pet_name} has been confirmed for ${acceptanceForm.confirmed_date} at ${acceptanceForm.confirmed_time}. Please check details.`
          }]);

          // Update local state
          setAppointments(prev => prev.map(a => a.id === acceptanceModal.id ? { ...a, ...updates } : a));
          setAcceptanceModal(null);
          setSelectedAppointment(null); // Close details modal if open

      } catch (err) {
          console.error("Error confirming appointment:", err);
          alert("Failed to confirm appointment");
      }
  };

  const handleAction = async (id, status) => {
      try {
          const { error } = await supabase
            .from('appointments')
            .update({ status })
            .eq('id', id);
          
          if (error) throw error;

          // Notify User
          const appointment = appointments.find(a => a.id === id);
          if (appointment) {
              await supabase.from('notifications').insert([{
                  user_id: appointment.pet_owner_id,
                  type: 'status_change',
                  message: `Your appointment on ${appointment.appointment_date} has been ${status}.`
              }]);
          }

          // Update local state
          setAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a));
          if (selectedAppointment?.id === id) {
              setSelectedAppointment(prev => ({ ...prev, status }));
          }

      } catch (err) {
          console.error("Error updating appointment:", err);
          alert("Failed to update status");
      }
  };

  const filteredAppointments = appointments.filter(a => {
      if (filter === 'history') return ['completed', 'cancelled', 'rejected'].includes(a.status);
      return a.status === filter;
  });

  return (
    <div className="page-container flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Appointment Dashboard</h1>
        <p className="text-muted">Manage your clinic's schedule.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border pb-1 overflow-x-auto">
        {[
            { id: 'pending', label: 'Pending Requests' }, 
            { id: 'confirmed', label: 'Confirmed Upcoming' }, 
            { id: 'history', label: 'History' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`px-6 py-2 border-b-2 transition-colors font-medium text-lg capitalize whitespace-nowrap flex items-center gap-2 ${
                filter === tab.id
                    ? 'border-primary text-primary' 
                    : 'border-transparent text-muted hover:text-foreground'
            }`}
          >
            {tab.label}
            {tab.id === 'pending' && (() => {
                const count = appointments.filter(a => a.status === 'pending').length;
                return count > 0 ? (
                    <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                        {count}
                    </span>
                ) : null;
            })()}
          </button>
        ))}
      </div>

      <div className="grid gap-4">
          {loading ? (
              <div className="text-center py-12 text-muted">Loading...</div>
          ) : filteredAppointments.length === 0 ? (
              <div className="text-center py-16 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-muted">
                  No {filter} appointments.
              </div>
          ) : (
              filteredAppointments.map(app => (
                <div key={app.id} className="glass-panel p-6 flex flex-col sm:flex-row items-start sm:items-center gap-6">
                    
                    {/* Date/Time Box */}
                    <div className="bg-slate-50 p-4 rounded-xl flex flex-col items-center justify-center min-w-[100px] text-center border border-slate-100 shrink-0">
                        <span className="text-xl font-bold text-primary block leading-none mb-1">
                            {new Date(app.appointment_date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }).split(' ')[1]}
                        </span>
                        <span className="text-sm font-bold text-gray-500 uppercase">
                            {new Date(app.appointment_date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }).split(' ')[0]}
                        </span>
                        <div className="w-full h-px bg-slate-200 my-2"></div>
                        <span className="text-sm font-medium text-muted">{app.time_slot}</span>
                    </div>

                    {/* Info */}
                    <div className="flex-1">
                        <h3 className="text-xl font-bold mb-1 capitalize text-gray-900">{app.service_type}</h3>
                        <div className="flex items-center gap-2 text-sm text-muted font-medium mb-4">
                            <User size={16} /> {app.profiles?.full_name || 'Unknown User'}
                        </div>
                        
                        {/* Status Badge for Non-Pending */}
                        {['confirmed', 'completed', 'cancelled', 'rejected'].includes(app.status) && (
                            <span className={`
                                inline-block px-3 py-1 rounded-full text-xs font-bold capitalize
                                ${app.status === 'confirmed' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}
                            `}>
                                {app.status}
                            </span>
                        )}
                        
                        <button 
                            onClick={() => setSelectedAppointment(app)}
                            className="text-primary text-sm font-semibold hover:underline mt-2 inline-block"
                        >
                            View Full Details
                        </button>
                    </div>

                    {/* Actions */}
                    {app.status === 'pending' && (
                        <div className="flex sm:flex-col gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                            <button 
                                onClick={() => openAcceptanceModal(app)}
                                className="btn bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-none flex-1 sm:flex-none justify-center"
                            >
                                <Check size={16} /> Accept
                            </button>
                            <button 
                                onClick={() => handleAction(app.id, 'rejected')}
                                className="btn bg-rose-100 text-rose-700 hover:bg-rose-200 border-none flex-1 sm:flex-none justify-center"
                            >
                                <X size={16} /> Decline
                            </button>
                        </div>
                    )}

                </div>
              ))
          )}
      </div>

      {/* Details Modal */}
      {selectedAppointment && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
              <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
                  {/* Header */}
                  <div className="p-6 border-b border-border flex justify-between items-start sticky top-0 bg-white z-10">
                      <div>
                          <h2 className="text-2xl font-bold flex items-center gap-2">
                              {selectedAppointment.service_type === 'sterilization' ? <Stethoscope className="text-primary" /> : <Check className="text-primary" />}
                              Appointment Details
                          </h2>
                          <div className="text-muted text-sm mt-1">
                              ID: {selectedAppointment.id.slice(0, 8)}...
                          </div>
                      </div>
                      <button onClick={() => setSelectedAppointment(null)} className="p-2 hover:bg-slate-100 rounded-full">
                          <X size={24} className="text-slate-500" />
                      </button>
                  </div>

                  {/* Body */}
                  <div className="p-6 space-y-6">
                      
                      {/* Status Banner */}
                      <div className={`p-4 rounded-xl flex items-center gap-3 ${
                          selectedAppointment.status === 'confirmed' ? 'bg-emerald-100 text-emerald-800' :
                          selectedAppointment.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                          'bg-slate-100 text-slate-800'
                      }`}>
                          <Clock size={20} />
                          <span className="font-bold capitalize">Status: {selectedAppointment.status}</span>
                      </div>

                      <div className="grid md:grid-cols-2 gap-6">
                          {/* Pet Info */}
                          <div className="space-y-4">
                              <h3 className="text-lg font-bold border-b pb-2">Patient Information</h3>
                              <div className="grid grid-cols-2 gap-y-2 text-sm">
                                  <span className="text-muted">Name:</span>
                                  <span className="font-semibold">{selectedAppointment.pet_name}</span>
                                  
                                  <span className="text-muted">Species:</span>
                                  <span>{selectedAppointment.pet_species}</span>
                                  
                                  <span className="text-muted">Gender:</span>
                                  <span>{selectedAppointment.pet_gender}</span>
                                  
                                  <span className="text-muted">Age:</span>
                                  <span>{selectedAppointment.pet_age}</span>
                                  
                                  <span className="text-muted">Weight:</span>
                                  <span>{selectedAppointment.pet_weight}</span>
                              </div>
                          </div>

                          {/* Owner Info */}
                          <div className="space-y-4">
                              <h3 className="text-lg font-bold border-b pb-2">Owner Information</h3>
                              <div className="flex items-center gap-3 mb-3">
                                  <div className="w-12 h-12 rounded-full bg-slate-200 overflow-hidden">
                                      {selectedAppointment.profiles?.avatar_url ? (
                                          <img src={selectedAppointment.profiles.avatar_url} alt="Owner" className="w-full h-full object-cover" />
                                      ) : (
                                          <User className="w-full h-full p-2 text-slate-400" />
                                      )}
                                  </div>
                                  <div>
                                      <div className="font-bold">{selectedAppointment.profiles?.full_name || 'Unknown'}</div>
                                      <div className="text-sm text-muted">{selectedAppointment.profiles?.email}</div>
                                  </div>
                              </div>
                          </div>
                      </div>

                      {/* Medical History */}
                      <div className="space-y-3">
                           <h3 className="text-lg font-bold border-b pb-2">Medical History & Condition</h3>
                           
                           <div className="bg-slate-50 p-4 rounded-xl space-y-3">
                                <div>
                                    <span className="text-sm font-semibold text-muted block">Procedure</span>
                                    <span className="text-lg">{selectedAppointment.procedure_type || 'General Consultation'}</span>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                     <div>
                                        <span className="text-sm font-semibold text-muted block">Vaccination Status</span>
                                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${selectedAppointment.vaccinated === 'Vaccinated' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {selectedAppointment.vaccinated}
                                        </span>
                                     </div>
                                     <div>
                                        <span className="text-sm font-semibold text-muted block">Overall Health</span>
                                        <span className={selectedAppointment.is_healthy ? 'text-green-600' : 'text-amber-600'}>
                                            {selectedAppointment.is_healthy ? 'Healthy' : 'Has Conditions'}
                                        </span>
                                     </div>
                                </div>

                                {!selectedAppointment.is_healthy && (
                                    <div>
                                        <span className="text-sm font-semibold text-muted block">Medical Conditions</span>
                                        <p className="text-sm bg-white p-2 border rounded">{selectedAppointment.medical_conditions}</p>
                                    </div>
                                )}

                                <div>
                                    <span className="text-sm font-semibold text-muted block">Current Medications</span>
                                    {selectedAppointment.on_medication ? (
                                        <p className="text-sm bg-white p-2 border rounded">{selectedAppointment.medication_details}</p>
                                    ) : (
                                        <span className="text-sm text-slate-500">None reported</span>
                                    )}
                                </div>
                           </div>
                      </div>

                      {/* Schedule Info */}
                      <div className="bg-primary/5 p-4 rounded-xl flex items-center justify-between">
                          <div className="flex items-center gap-3">
                              <div className="bg-white p-2 rounded-lg text-primary shadow-sm">
                                  <Calendar size={20} />
                              </div>
                              <div>
                                  <div className="text-xs text-muted font-bold uppercase tracking-wider">Appointment Date</div>
                                  <div className="font-bold text-lg">{selectedAppointment.appointment_date}</div>
                              </div>
                          </div>
                          <div className="flex items-center gap-3">
                              <div className="bg-white p-2 rounded-lg text-primary shadow-sm">
                                  <Clock size={20} />
                              </div>
                              <div>
                                  <div className="text-xs text-muted font-bold uppercase tracking-wider">Time Slot</div>
                                  <div className="font-bold text-lg">{selectedAppointment.time_slot}</div>
                              </div>
                          </div>
                      </div>

                  </div>

                  {/* Footer Actions */}
                  <div className="p-6 border-t border-border bg-slate-50 flex justify-end gap-3 sticky bottom-0">
                      {selectedAppointment.status === 'pending' ? (
                          <>
                            <button 
                                onClick={() => {
                                    handleAction(selectedAppointment.id, 'rejected');
                                    setSelectedAppointment(null);
                                }}
                                className="btn bg-white border border-slate-300 text-slate-700 hover:bg-slate-50"
                            >
                                Reject Request
                            </button>
                            <button 
                                onClick={() => {
                                    openAcceptanceModal(selectedAppointment);
                                }}
                                className="btn btn-primary shadow-lg shadow-primary/25"
                            >
                                <Check size={18} /> Confirm Appointment
                            </button>
                          </>
                      ) : (
                          <button onClick={() => setSelectedAppointment(null)} className="btn btn-secondary">Close</button>
                      )}
                  </div>
              </div>
          </div>
      )}

      {/* Acceptance Form Modal */}
      {acceptanceModal && (
          <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 animate-fade-in">
              <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
                  <div className="p-6 border-b border-border">
                      <h2 className="text-2xl font-bold">Confirm Appointment</h2>
                      <p className="text-muted text-sm">Please provide details for the pet owner.</p>
                  </div>
                  
                  <div className="p-6 space-y-4">
                      {/* Date & Time */}
                      <div className="grid grid-cols-2 gap-4">
                          <div className="form-group">
                              <label className="form-label">Confirmed Date</label>
                              <input 
                                type="date"
                                className="input-field"
                                value={acceptanceForm.confirmed_date}
                                onChange={e => setAcceptanceForm({...acceptanceForm, confirmed_date: e.target.value})}
                              />
                          </div>
                          <div className="form-group">
                              <label className="form-label">Confirmed Time</label>
                              <input 
                                type="time"
                                className="input-field"
                                value={acceptanceForm.confirmed_time}
                                onChange={e => setAcceptanceForm({...acceptanceForm, confirmed_time: e.target.value})}
                              />
                          </div>
                      </div>

                      {/* Instructions */}
                      <div className="form-group">
                          <label className="form-label">Pre-Surgery Instructions (Fasting, Water, etc.)</label>
                          <textarea 
                            className="input-field min-h-[80px]"
                            value={acceptanceForm.pre_surgery_instructions}
                            onChange={e => setAcceptanceForm({...acceptanceForm, pre_surgery_instructions: e.target.value})}
                          />
                      </div>

                      <div className="form-group">
                          <label className="form-label">Surgery/Procedure Details</label>
                          <textarea 
                            className="input-field min-h-[60px]"
                            value={acceptanceForm.surgery_details}
                            onChange={e => setAcceptanceForm({...acceptanceForm, surgery_details: e.target.value})}
                          />
                      </div>

                      <div className="form-group">
                          <label className="form-label">Post-Surgery Care Overview</label>
                          <textarea 
                            className="input-field min-h-[80px]"
                            value={acceptanceForm.post_surgery_care}
                            onChange={e => setAcceptanceForm({...acceptanceForm, post_surgery_care: e.target.value})}
                          />
                      </div>

                      <div className="form-group">
                          <label className="form-label">Special Notes / Warnings</label>
                          <textarea 
                            className="input-field min-h-[60px]"
                            value={acceptanceForm.vet_notes}
                            onChange={e => setAcceptanceForm({...acceptanceForm, vet_notes: e.target.value})}
                            placeholder="Optional"
                          />
                      </div>
                  </div>

                  <div className="p-6 border-t border-border bg-slate-50 flex justify-end gap-3 sticky bottom-0">
                      <button 
                        onClick={() => setAcceptanceModal(null)}
                        className="btn btn-secondary"
                      >
                          Cancel
                      </button>
                      <button 
                        onClick={handleConfirmAcceptance}
                        className="btn btn-primary"
                      >
                          Sort & Confirm
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}

