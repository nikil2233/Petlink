import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Calendar, Clock, Check, X, User, MessageSquare, Stethoscope, Activity, FileText, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
          setSelectedAppointment(null); 

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

  const stats = {
      pending: appointments.filter(a => a.status === 'pending').length,
      confirmed: appointments.filter(a => a.status === 'confirmed').length,
      total: appointments.length
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pt-24 pb-12 px-4 md:px-8 transition-colors duration-300">
      
       {/* Decorative Background */}
       <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
          <div className="absolute top-0 right-0 w-[50rem] h-[50rem] bg-indigo-200/20 dark:bg-indigo-900/20 rounded-full blur-3xl opacity-50"></div>
          <div className="absolute bottom-0 left-0 w-[50rem] h-[50rem] bg-pink-200/20 dark:bg-pink-900/20 rounded-full blur-3xl opacity-50"></div>
      </div>

      <div className="max-w-7xl mx-auto space-y-10">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-end gap-6">
            <div>
                <h1 className="text-4xl md:text-5xl font-black text-slate-800 dark:text-white mb-2 tracking-tight">
                    Appointment <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-primary dark:from-indigo-400 dark:to-primary">Dashboard</span>
                </h1>
                <p className="text-lg text-slate-500 dark:text-slate-400 font-medium">Manage your clinic's schedule and patient requests.</p>
            </div>

            {/* Stats Cards Row */}
            <div className="flex gap-4">
                <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-4 rounded-2xl border border-white dark:border-slate-700 shadow-sm flex items-center gap-3">
                    <div className="p-3 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-xl">
                        <Clock size={20} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Pending</p>
                        <p className="text-2xl font-black text-slate-800 dark:text-white">{stats.pending}</p>
                    </div>
                </div>
                <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-4 rounded-2xl border border-white dark:border-slate-700 shadow-sm flex items-center gap-3">
                    <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl">
                        <Check size={20} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Confirmed</p>
                        <p className="text-2xl font-black text-slate-800 dark:text-white">{stats.confirmed}</p>
                    </div>
                </div>
            </div>
        </div>

        {/* Filters & Content */}
        <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-[2.5rem] p-6 md:p-8 shadow-xl border border-white/50 dark:border-slate-700/50 min-h-[600px]">
            
            {/* Custom Tabs */}
            <div className="flex gap-2 mb-8 bg-slate-100/50 dark:bg-slate-700/50 p-1.5 rounded-2xl w-fit">
                {[
                    { id: 'pending', label: 'Requests', icon: <Clock size={18} /> }, 
                    { id: 'confirmed', label: 'Upcoming', icon: <Calendar size={18} /> }, 
                    { id: 'history', label: 'History', icon: <FileText size={18} /> }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setFilter(tab.id)}
                        className={`
                            px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all duration-300
                            ${filter === tab.id ? 'bg-white dark:bg-slate-600 text-primary dark:text-white shadow-md scale-100' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-700/50 hover:text-slate-700 dark:hover:text-slate-200'}
                        `}
                    >
                        {tab.icon}
                        {tab.label}
                        {tab.id === 'pending' && stats.pending > 0 && (
                            <span className="bg-rose-500 text-white text-[10px] px-2 py-0.5 rounded-full shadow-sm ml-1 animate-pulse">
                                {stats.pending}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Loading State */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mb-4"></div>
                    <p className="font-medium">Loading Schedule...</p>
                </div>
            ) : filteredAppointments.length === 0 ? (
                <div className="text-center py-20">
                    <div className="w-24 h-24 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300 dark:text-slate-500">
                        <Calendar size={48} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-600 dark:text-slate-400 mb-2">No Appointments Found</h3>
                    <p className="text-slate-400 dark:text-slate-500">There are no {filter} appointments to show right now.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    <AnimatePresence mode='popLayout'>
                        {filteredAppointments.map((app, index) => (
                            <motion.div 
                                key={app.id}
                                layout
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ delay: index * 0.05 }}
                                onClick={() => setSelectedAppointment(app)}
                                className="group bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-lg hover:border-indigo-100 dark:hover:border-indigo-900 transition-all cursor-pointer flex flex-col sm:flex-row items-center gap-6 relative overflow-hidden"
                            >
                                {/* Status Indicator Line */}
                                <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                                    app.status === 'confirmed' ? 'bg-emerald-500' : 
                                    app.status === 'pending' ? 'bg-amber-400' : 'bg-slate-300 dark:bg-slate-600'
                                }`}></div>

                                {/* Date Box */}
                                <div className="flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-700 min-w-[5rem] h-20 rounded-xl border border-slate-200 dark:border-slate-600 group-hover:border-indigo-200 dark:group-hover:border-indigo-700 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/30 transition-colors">
                                    <span className="text-xs font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-0.5">
                                        {new Date(app.appointment_date).toLocaleDateString('en-US', { month: 'short' })}
                                    </span>
                                    <span className="text-2xl font-black text-slate-700 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 leading-none">
                                        {new Date(app.appointment_date).getDate()}
                                    </span>
                                </div>

                                {/* Main Content */}
                                <div className="flex-1 w-full text-center sm:text-left">
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1">
                                        <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center justify-center sm:justify-start gap-2">
                                            {app.service_type}
                                            {app.status === 'confirmed' && <Check size={16} className="text-emerald-500 bg-emerald-100 dark:bg-emerald-900/30 p-0.5 rounded-full" />}
                                        </h3>
                                        <span className="text-xs font-semibold px-2 py-0.5 rounded text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 w-fit mx-auto sm:mx-0">
                                            {app.time_slot}
                                        </span>
                                    </div>
                                    
                                    <div className="flex items-center justify-center sm:justify-start gap-2 text-sm text-slate-500 dark:text-slate-400 font-medium">
                                        <User size={14} className="text-indigo-400" />
                                        <span>{app.profiles?.full_name || 'Guest User'}</span>
                                        <span className="text-slate-300 dark:text-slate-600">•</span>
                                        <span>{app.pet_name} ({app.pet_species})</span>
                                    </div>
                                </div>

                                {/* Actions / Arrow */}
                                <div className="flex items-center gap-3">
                                    {app.status === 'pending' ? (
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); openAcceptanceModal(app); }}
                                                className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-bold rounded-lg shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all flex items-center gap-1.5"
                                            >
                                                <Check size={16} /> Accept
                                            </button>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleAction(app.id, 'rejected'); }}
                                                className="px-4 py-2 bg-white dark:bg-slate-700 text-rose-500 dark:text-rose-400 border border-slate-200 dark:border-slate-600 text-sm font-bold rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/30 hover:border-rose-200 dark:hover:border-rose-700 transition-colors"
                                            >
                                                Decline
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-700 flex items-center justify-center text-slate-400 dark:text-slate-500 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/30 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors">
                                            <ChevronRight size={20} />
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}
        </div>
      </div>

      {/* DETAILED VIEW MODAL */}
      <AnimatePresence>
      {selectedAppointment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-white dark:bg-slate-800 rounded-[2rem] max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col overflow-hidden"
              >
                  {/* Header */}
                  <div className="p-8 border-b border-slate-100 dark:border-slate-700 flex justify-between items-start bg-gradient-to-b from-slate-50 to-white dark:from-slate-700 dark:to-slate-800">
                      <div>
                          <div className="flex items-center gap-2 mb-2">
                              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                                  selectedAppointment.status === 'confirmed' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 
                                  selectedAppointment.status === 'pending' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                              }`}>
                                  {selectedAppointment.status}
                              </span>
                              <span className="text-slate-400 dark:text-slate-500 text-xs font-mono">#{selectedAppointment.id.slice(0, 8)}</span>
                          </div>
                          <h2 className="text-3xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                              {selectedAppointment.service_type}
                          </h2>
                      </div>
                      <button onClick={() => setSelectedAppointment(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                          <X size={24} />
                      </button>
                  </div>

                  {/* Body */}
                  <div className="p-8 space-y-8">
                      <div className="grid md:grid-cols-2 gap-8">
                          {/* Pet Profile */}
                          <div className="space-y-4">
                              <h3 className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                  <Stethoscope size={16} /> Patient
                              </h3>
                              <div className="bg-slate-50 dark:bg-slate-700/50 p-5 rounded-2xl border border-slate-100 dark:border-slate-700">
                                   <div className="flex items-center gap-4 mb-4">
                                       <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-lg">
                                           {selectedAppointment.pet_name[0]}
                                       </div>
                                       <div>
                                           <div className="font-bold text-lg text-slate-800 dark:text-white">{selectedAppointment.pet_name}</div>
                                           <div className="text-sm text-slate-500 dark:text-slate-400">{selectedAppointment.pet_species} • {selectedAppointment.pet_gender}</div>
                                       </div>
                                   </div>
                                   <div className="grid grid-cols-2 gap-2 text-sm">
                                       <div className="bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-600">
                                           <span className="text-xs text-slate-400 dark:text-slate-500 block">Age</span>
                                           <span className="font-bold text-slate-700 dark:text-slate-300">{selectedAppointment.pet_age}</span>
                                       </div>
                                       <div className="bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-600">
                                           <span className="text-xs text-slate-400 dark:text-slate-500 block">Weight</span>
                                           <span className="font-bold text-slate-700 dark:text-slate-300">{selectedAppointment.pet_weight}</span>
                                       </div>
                                   </div>
                              </div>
                          </div>

                          {/* Owner Profile */}
                          <div className="space-y-4">
                              <h3 className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                  <User size={16} /> Owner
                              </h3>
                              <div className="bg-slate-50 dark:bg-slate-700/50 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 h-full">
                                  <div className="flex items-center gap-4">
                                      <div className="w-12 h-12 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 overflow-hidden">
                                          {selectedAppointment.profiles?.avatar_url ? (
                                              <img src={selectedAppointment.profiles.avatar_url} className="w-full h-full object-cover" />
                                          ) : (
                                              <User className="w-full h-full p-2 text-slate-300 dark:text-slate-500" />
                                          )}
                                      </div>
                                      <div>
                                          <div className="font-bold text-lg text-slate-800 dark:text-white">{selectedAppointment.profiles?.full_name || 'Guest'}</div>
                                          <div className="text-sm text-slate-500 dark:text-slate-400">{selectedAppointment.profiles?.email}</div>
                                      </div>
                                  </div>
                              </div>
                          </div>
                      </div>

                      {/* Medical Details */}
                      <div>
                           <h3 className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                               <Activity size={16} /> Medical Context
                           </h3>
                           <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm space-y-4">
                                <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-4">
                                    <span className="font-semibold text-slate-600 dark:text-slate-300">Vaccination Status</span>
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${selectedAppointment.vaccinated === 'Vaccinated' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400'}`}>
                                        {selectedAppointment.vaccinated}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-4">
                                    <span className="font-semibold text-slate-600 dark:text-slate-300">Overall Health</span>
                                    <span className={`font-bold ${selectedAppointment.is_healthy ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>
                                        {selectedAppointment.is_healthy ? 'Healthy' : 'Has Conditions'}
                                    </span>
                                </div>
                                {(!selectedAppointment.is_healthy || selectedAppointment.on_medication) && (
                                    <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl text-amber-900 dark:text-amber-300 text-sm">
                                        <p className="font-bold mb-1">Medical Notes:</p>
                                        <p>{selectedAppointment.medical_conditions || 'None stated'}</p>
                                        {selectedAppointment.on_medication && (
                                             <p className="mt-2 text-amber-800 dark:text-amber-400">Rx: {selectedAppointment.medication_details}</p>
                                        )}
                                    </div>
                                )}
                           </div>
                      </div>

                      {/* Schedule Summary */}
                      <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-2xl p-6 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                              <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl text-indigo-600 dark:text-indigo-400 shadow-sm">
                                  <Calendar size={24} />
                              </div>
                              <div>
                                  <div className="text-xs text-indigo-400 dark:text-indigo-400 font-bold uppercase tracking-wider">Date</div>
                                  <div className="font-black text-xl text-indigo-900 dark:text-indigo-300">{selectedAppointment.appointment_date}</div>
                              </div>
                          </div>
                          <div className="w-px h-10 bg-indigo-200 dark:bg-indigo-700"></div>
                          <div className="text-right">
                              <div className="text-xs text-indigo-400 dark:text-indigo-400 font-bold uppercase tracking-wider">Time</div>
                              <div className="font-black text-xl text-indigo-900 dark:text-indigo-300">{selectedAppointment.time_slot}</div>
                          </div>
                      </div>

                  </div>

                  {/* Footer Actions */}
                  <div className="p-6 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex justify-end gap-3 sticky bottom-0">
                      {selectedAppointment.status === 'pending' ? (
                          <>
                            <button 
                                onClick={() => {
                                    handleAction(selectedAppointment.id, 'rejected');
                                    setSelectedAppointment(null);
                                }}
                                className="px-6 py-3 rounded-xl font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                            >
                                Reject
                            </button>
                            <button 
                                onClick={() => {
                                    openAcceptanceModal(selectedAppointment);
                                }}
                                className="px-6 py-3 rounded-xl bg-slate-900 dark:bg-slate-700 text-white font-bold shadow-lg shadow-slate-300 dark:shadow-none hover:bg-slate-800 dark:hover:bg-slate-600 transition-all flex items-center gap-2"
                            >
                                <Check size={18} /> Confirm & Schedule
                            </button>
                          </>
                      ) : (
                          <button onClick={() => setSelectedAppointment(null)} className="px-6 py-3 rounded-xl text-slate-500 dark:text-slate-400 font-bold hover:bg-slate-200 dark:hover:bg-slate-600">Close Details</button>
                      )}
                  </div>
              </motion.div>
          </div>
      )}
      </AnimatePresence>

      {/* CONFIRMATION / ACCEPTANCE FORM MODAL */}
      <AnimatePresence>
              {acceptanceModal && (
          <div className="fixed inset-0 bg-slate-900/40 dark:bg-slate-900/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-slate-800 rounded-[2rem] max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col"
              >
                  <div className="p-8 border-b border-slate-100 dark:border-slate-700">
                      <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mb-4 text-2xl">
                          <Check size={32} />
                      </div>
                      <h2 className="text-3xl font-black text-slate-800 dark:text-white">Confirm Booking</h2>
                      <p className="text-slate-500 dark:text-slate-400 mt-2">Finalize the schedule and provide care instructions for the owner.</p>
                  </div>
                  
                  <div className="p-8 space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Date</label>
                              <input 
                                type="date"
                                className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl p-3 font-bold text-slate-700 dark:text-white"
                                value={acceptanceForm.confirmed_date}
                                onChange={e => setAcceptanceForm({...acceptanceForm, confirmed_date: e.target.value})}
                              />
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Time</label>
                              <input 
                                type="time"
                                className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl p-3 font-bold text-slate-700 dark:text-white"
                                value={acceptanceForm.confirmed_time}
                                onChange={e => setAcceptanceForm({...acceptanceForm, confirmed_time: e.target.value})}
                              />
                          </div>
                      </div>

                      <div className="space-y-4">
                        <h4 className="font-bold text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-700 pb-2">Medical Instructions</h4>
                        
                        <div>
                            <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Pre-Surgery / Visit Instructions</label>
                            <textarea 
                                className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl p-3 text-sm text-slate-600 dark:text-slate-300 min-h-[80px]"
                                value={acceptanceForm.pre_surgery_instructions}
                                onChange={e => setAcceptanceForm({...acceptanceForm, pre_surgery_instructions: e.target.value})}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Procedure Details</label>
                            <textarea 
                                className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl p-3 text-sm text-slate-600 dark:text-slate-300 min-h-[60px]"
                                value={acceptanceForm.surgery_details}
                                onChange={e => setAcceptanceForm({...acceptanceForm, surgery_details: e.target.value})}
                            />
                        </div>
                      </div>
                  </div>

                  <div className="p-6 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex justify-end gap-3 sticky bottom-0">
                      <button 
                        onClick={() => setAcceptanceModal(null)}
                        className="px-6 py-3 rounded-xl font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                      >
                          Cancel
                      </button>
                      <button 
                        onClick={handleConfirmAcceptance}
                        className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-200 dark:shadow-none hover:-translate-y-1 transition-all"
                      >
                          Send Confirmation
                      </button>
                  </div>
              </motion.div>
          </div>
      )}
      </AnimatePresence>
    </div>
  );
}

