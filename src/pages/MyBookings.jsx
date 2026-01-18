import React, { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, AlertCircle, CheckCircle, XCircle, Syringe, Stethoscope, FileText, X, ChevronRight, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';

export default function MyBookings() {
  const [activeTab, setActiveTab] = useState('upcoming'); // upcoming, pending, history
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [instructionsModal, setInstructionsModal] = useState(null);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return; 

      const { data, error } = await supabase
        .from('appointments')
        .select(`
            *,
            vet:vet_id (
                full_name,
                city,
                address,
                phone
            )
        `)
        .eq('pet_owner_id', user.id)
        .order('appointment_date', { ascending: true });

      if (error) throw error;
      setBookings(data || []);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      // Small artificial delay for smooth transition
      setTimeout(() => setLoading(false), 500);
    }
  };

  const handleCancel = async (id) => {
    if (window.confirm('Are you sure you want to cancel this appointment?')) {
      try {
        const { error } = await supabase
            .from('appointments')
            .update({ status: 'cancelled' })
            .eq('id', id);

        if (error) throw error;

        setBookings(bookings.map(booking => 
            booking.id === id ? { ...booking, status: 'cancelled' } : booking
        ));
      } catch (err) {
        console.error("Error cancelling appointment:", err);
        alert("Failed to cancel appointment");
      }
    }
  };

  // Helper to format date nicely
  const formatDate = (dateString) => {
      return new Date(dateString).toLocaleDateString('en-US', {
          weekday: 'short', year: 'numeric', month: 'long', day: 'numeric'
      });
  };

  const filteredBookings = bookings.filter(booking => {
      if (activeTab === 'upcoming') return booking.status === 'confirmed';
      if (activeTab === 'pending') return booking.status === 'pending';
      if (activeTab === 'history') return ['completed', 'cancelled', 'rejected'].includes(booking.status);
      return true;
  });

  const getTabLabel = (id) => {
      switch(id) {
          case 'upcoming': return 'Upcoming';
          case 'pending': return 'Pending';
          case 'history': return 'History';
          default: return '';
      }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-12">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <motion.div 
               initial={{ opacity: 0, y: -20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ duration: 0.5 }}
            >
                <div className="flex items-center gap-2 mb-2">
                    <div className="bg-amber-100 p-2 rounded-xl">
                        <Activity className="text-amber-600" size={20} />
                    </div>
                    <span className="text-sm font-bold text-amber-600 tracking-wider uppercase">Pet Care Journey</span>
                </div>
                <h1 className="text-4xl font-black text-slate-800 tracking-tight mb-2">My Bookings</h1>
                <p className="text-slate-500 font-medium text-lg">Manage your appointments and medical history.</p>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
            >
                <Link 
                    to="/book-appointment" 
                    className="inline-flex items-center gap-2 bg-slate-900 text-white px-[20px] py-[12px] rounded-[12px] font-bold shadow-lg shadow-slate-200 hover:bg-slate-800 hover:scale-105 active:scale-95 transition-all duration-300"
                >
                    <Calendar size={18} /> New Appointment
                </Link>
            </motion.div>
        </div>

        {/* Animated Tabs */}
        <div className="flex gap-2 mb-8 bg-white p-1.5 rounded-[12px] border border-slate-100 shadow-sm w-fit mx-auto md:mx-0">
            {['upcoming', 'pending', 'history'].map((tab) => {
                const isActive = activeTab === tab;
                const count = tab === 'upcoming' 
                    ? bookings.filter(b => b.status === 'confirmed').length
                    : tab === 'pending'
                        ? bookings.filter(b => b.status === 'pending').length
                        : 0;

                return (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`relative px-[20px] py-[10px] rounded-[8px] text-[14px] font-bold transition-all duration-300 z-10 flex items-center gap-2 ${
                            isActive ? 'text-slate-900' : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        {isActive && (
                            <motion.div
                                layoutId="activeTab"
                                className="absolute inset-0 bg-slate-100 rounded-[8px] -z-10 border border-slate-200"
                                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                            />
                        )}
                        <span>{getTabLabel(tab)}</span>
                        {count > 0 && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isActive ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-600'}`}>
                                {count}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>

        {/* Content Area */}
        <AnimatePresence mode="wait">
            {loading ? (
                <motion.div 
                    key="loader"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center justify-center py-20 gap-4"
                >
                    <div className="w-12 h-12 border-4 border-slate-200 border-t-amber-500 rounded-full animate-spin"></div>
                    <p className="text-slate-400 font-medium animate-pulse">Loading schedule...</p>
                </motion.div>
            ) : filteredBookings.length === 0 ? (
                <motion.div
                    key="empty"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.4 }}
                    className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-12 text-center max-w-lg mx-auto"
                >
                    <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Calendar size={32} className="text-slate-300" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">No {activeTab} appointments</h3>
                    <p className="text-slate-500 mb-8 leading-relaxed">
                        {activeTab === 'upcoming' 
                            ? "Your schedule is clear! Need to book a checkup?" 
                            : activeTab === 'pending'
                                ? "No pending requests at the moment."
                                : "No past appointment history found."}
                    </p>
                    {activeTab !== 'history' && (
                        <Link 
                            to="/book-appointment" 
                            className="bg-amber-500 text-white px-[20px] py-[10px] rounded-[8px] font-bold shadow-amber-200 hover:bg-amber-600 transition-all duration-200 inline-flex items-center gap-2"
                        >
                            Book Now <ChevronRight size={16} />
                        </Link>
                    )}
                </motion.div>
            ) : (
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="grid gap-4"
                >
                    {filteredBookings.map((booking, index) => (
                        <motion.div
                            key={booking.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="group bg-white rounded-[20px] p-6 border border-slate-100 shadow-sm hover:shadow-md hover:border-amber-100 transition-all duration-300 relative overflow-hidden"
                        >
                            {/* Decorative gradient bar on left */}
                            <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                                booking.status === 'confirmed' ? 'bg-emerald-500' :
                                booking.status === 'pending' ? 'bg-amber-500' :
                                booking.status === 'cancelled' ? 'bg-rose-500' : 'bg-slate-300'
                            }`} />

                            <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
                                {/* Service Icon */}
                                <div className={`w-16 h-16 rounded-[16px] flex items-center justify-center shrink-0 shadow-inner ${
                                    booking.service_type === 'sterilization' ? 'bg-rose-50 text-rose-500' : 'bg-blue-50 text-blue-500'
                                }`}>
                                    {booking.service_type === 'sterilization' ? <Syringe size={28} strokeWidth={1.5} /> : <Stethoscope size={28} strokeWidth={1.5} />}
                                </div>

                                {/* Main Info */}
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h3 className="text-xl font-bold text-slate-800 capitalize tracking-tight">
                                            {booking.service_type}
                                        </h3>
                                        <span className={`px-[10px] py-[4px] rounded-full text-[12px] font-bold border capitalize flex items-center gap-1.5 ${
                                            booking.status === 'confirmed' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                            booking.status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                            booking.status === 'cancelled' ? 'bg-rose-50 text-rose-700 border-rose-100' : 
                                            'bg-slate-100 text-slate-600 border-slate-200'
                                        }`}>
                                            {booking.status === 'confirmed' ? <CheckCircle size={12} /> : 
                                             booking.status === 'pending' ? <Clock size={12} /> : <AlertCircle size={12} />}
                                            {booking.status}
                                        </span>
                                    </div>

                                    <div className="flex flex-col md:flex-row md:items-center gap-y-2 gap-x-6 text-sm text-slate-500 font-medium">
                                        <div className="flex items-center gap-2">
                                            <Calendar size={15} className="text-amber-500" />
                                            <span className="text-slate-700">
                                                {formatDate(booking.confirmed_date || booking.appointment_date)}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Clock size={15} className="text-amber-500" />
                                            <span className="text-slate-700">
                                                {booking.confirmed_time || booking.time_slot}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <MapPin size={15} className="text-amber-500" />
                                            <span>{booking.vet?.full_name || 'Unknown Clinic'} ({booking.vet?.city || 'City N/A'})</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Action Buttons - EXPLICIT STANDARD APPLIED */}
                                <div className="flex items-center gap-3 w-full md:w-auto mt-2 md:mt-0">
                                    {(booking.status === 'upcoming' || booking.status === 'pending') && (
                                        <button 
                                            onClick={() => handleCancel(booking.id)}
                                            className="px-[16px] py-[8px] rounded-[8px] border border-slate-200 text-slate-500 text-[14px] font-bold hover:border-rose-200 hover:text-rose-600 hover:bg-rose-50 transition-all duration-200 ease"
                                        >
                                            Cancel
                                        </button>
                                    )}
                                    {booking.status === 'confirmed' && (
                                        <button 
                                            onClick={() => setInstructionsModal(booking)}
                                            className="px-[16px] py-[8px] rounded-[8px] bg-blue-600 text-white text-[14px] font-bold shadow-sm shadow-blue-200 hover:bg-blue-700 hover:shadow-md transition-all duration-200 ease flex items-center gap-2"
                                        >
                                            <FileText size={16} /> Instructions
                                        </button>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </motion.div>
            )}
        </AnimatePresence>

        {/* Modal */}
        <AnimatePresence>
            {instructionsModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="bg-white rounded-[24px] max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col"
                    >
                        {/* Header */}
                        <div className="p-8 border-b border-slate-100 flex justify-between items-start bg-white/80 backdrop-blur-md sticky top-0 z-10">
                            <div>
                                <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                                    <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                                        <FileText size={20} />
                                    </div>
                                    Instructions
                                </h2>
                                <p className="text-slate-500 font-medium ml-12">
                                    Details for {instructionsModal.pet_name || 'your pet'}'s visit
                                </p>
                            </div>
                            <button 
                                onClick={() => setInstructionsModal(null)}
                                className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Body using CSS Grid for better layout */}
                        <div className="p-8 space-y-8">
                             {/* Vet Info Card */}
                             <div className="bg-slate-50 p-6 rounded-[16px] border border-slate-100 flex flex-col md:flex-row gap-6">
                                 <div className="flex-1">
                                     <h3 className="text-lg font-bold text-slate-800 mb-1">{instructionsModal.vet?.full_name}</h3>
                                     <p className="text-slate-500 text-sm">{instructionsModal.vet?.address}, {instructionsModal.vet?.city}</p>
                                 </div>
                                 <div className="md:text-right">
                                     <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Contact</p>
                                     <p className="text-slate-800 font-bold">{instructionsModal.vet?.phone || 'N/A'}</p>
                                 </div>
                             </div>

                             <div className="grid md:grid-cols-2 gap-6">
                                 {/* Pre Surgery */}
                                 <div className="space-y-3">
                                     <h4 className="font-bold text-slate-800 flex items-center gap-2">
                                         <Clock size={16} className="text-amber-500" /> Pre-Visit
                                     </h4>
                                     <div className="p-4 bg-amber-50 border border-amber-100 rounded-[12px] text-amber-900 text-sm leading-relaxed">
                                         {instructionsModal.pre_surgery_instructions || 'No specific instructions provided.'}
                                     </div>
                                 </div>
                                 
                                 {/* Post Surgery */}
                                 <div className="space-y-3">
                                     <h4 className="font-bold text-slate-800 flex items-center gap-2">
                                         <Activity size={16} className="text-emerald-500" /> Post-Care
                                     </h4>
                                     <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-[12px] text-emerald-900 text-sm leading-relaxed">
                                         {instructionsModal.post_surgery_care || 'Standard post-care applies.'}
                                     </div>
                                 </div>
                             </div>

                             {/* Special Notes Alert */}
                             {instructionsModal.vet_notes && (
                                <div className="p-4 bg-rose-50 border border-rose-100 rounded-[12px] flex gap-4">
                                    <AlertCircle className="text-rose-500 flex-shrink-0" size={20} />
                                    <div>
                                        <h4 className="font-bold text-rose-800 mb-1">Vet's Notes</h4>
                                        <p className="text-sm text-rose-700">{instructionsModal.vet_notes}</p>
                                    </div>
                                </div>
                             )}
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end">
                            <button 
                                onClick={() => setInstructionsModal(null)} 
                                className="px-[24px] py-[10px] rounded-[8px] bg-slate-900 text-white font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
                            >
                                Got it
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
      </div>
    </div>
  );
}
