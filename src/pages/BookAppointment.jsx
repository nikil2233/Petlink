import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Stethoscope, Syringe, MapPin, ChevronLeft, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const TIME_SLOTS = [
  '09:00 AM', '10:00 AM', '11:00 AM', '02:00 PM', '03:00 PM', '04:00 PM'
];

export default function BookAppointment() {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [vets, setVets] = useState([]);
  const [loadingVets, setLoadingVets] = useState(false);
  
  const [formData, setFormData] = useState({
    serviceType: '', // 'sterilization' or 'vaccination'
    vetId: '',
    date: '',
    timeSlot: ''
  });
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
    fetchVets();
  }, []);

  const fetchVets = async () => {
    try {
      setLoadingVets(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'vet');
      
      if (error) throw error;
      setVets(data || []);
    } catch (err) {
      console.error('Error fetching vets:', err);
    } finally {
      setLoadingVets(false);
    }
  };

  const handleSelectService = (type) => {
    setFormData(prev => ({ ...prev, serviceType: type }));
    setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!session) {
        alert("Please login to book an appointment");
        navigate('/auth');
        return;
    }

    setIsSubmitting(true);
    setError(null);
    
    try {
        // 1. Healing: Ensure Profile Exists first (to avoid FK error)
        const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', session.user.id)
            .maybeSingle();
        
        if (!profile) {
            console.log("Profile missing, creating default...");
            const { error: createError } = await supabase.from('profiles').insert([{ 
                id: session.user.id,
                email: session.user.email,
                role: 'user' // Default role
            }]);
            
            if (createError) {
                 console.error("Failed to create default profile:", createError);
                 throw new Error("Could not create user profile. Please update your profile manually.");
            }
        }

        const { data: appointmentData, error: appointmentError } = await supabase
            .from('appointments')
            .insert([{
                user_id: session.user.id,
                vet_id: formData.vetId,
                service_type: formData.serviceType,
                date: formData.date,
                time_slot: formData.timeSlot,
                status: 'pending' // Explictly pending
            }])
            .select()
            .single();

        if (appointmentError) throw appointmentError;

        // Create Notification for the Vet
        const { error: notificationError } = await supabase
            .from('notifications')
            .insert([{
                user_id: formData.vetId, // Send to Vet
                type: 'appointment_request',
                message: `New ${formData.serviceType} appointment request`,
                metadata: { appointment_id: appointmentData.id }
            }]);

        if (notificationError) console.error("Error sending notification:", notificationError);
        
        // Success
        alert('Appointment Request Sent! Waiting for Vet approval.');
        navigate('/my-bookings');
    } catch (err) {
        console.error("Booking error:", err);
        setError("Failed to book appointment. Please try again.");
    } finally {
        setIsSubmitting(false);
    }
  };

  const selectedVet = vets.find(v => v.id === formData.vetId);

  return (
    <div className="page-container flex flex-col items-center">
      <div className="w-full max-w-4xl">
        <button 
            onClick={() => step > 1 ? setStep(step - 1) : navigate(-1)}
            className="btn btn-secondary mb-8"
        >
            <ChevronLeft size={16} /> {step > 1 ? 'Back' : 'Go Back'}
        </button>

        <div className="glass-panel !p-0 overflow-hidden">
            <div className="bg-primary p-8 text-white text-center">
                <h1 className="text-3xl font-bold mb-2">Book an Appointment</h1>
                <p className="opacity-90">Schedule care for your furry friend</p>
            </div>

            <div className="p-8">
                {/* Progress Indicator */}
                <div className="flex justify-center mb-10 gap-6">
                    {[1, 2, 3].map(num => (
                        <div key={num} className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg transition-all border-2 ${
                            step >= num 
                                ? 'bg-primary border-primary text-white' 
                                : 'bg-slate-100 border-slate-200 text-muted'
                        }`}>
                            {num}
                        </div>
                    ))}
                </div>

                {error && (
                    <div className="alert alert-error mb-8 flex items-center gap-2">
                        <AlertCircle size={18} /> {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    {step === 1 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <button
                                type="button"
                                onClick={() => handleSelectService('sterilization')}
                                className={`p-8 rounded-xl border-2 transition-all text-center flex flex-col items-center gap-4 ${
                                    formData.serviceType === 'sterilization' 
                                        ? 'border-primary bg-orange-50' 
                                        : 'border-border bg-white hover:border-primary/50'
                                }`}
                            >
                                <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-2">
                                    <Stethoscope size={32} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold mb-1">Sterilization</h3>
                                    <p className="text-muted text-sm">Spay/Neuter surgery appointment</p>
                                </div>
                            </button>

                            <button
                                type="button"
                                onClick={() => handleSelectService('vaccination')}
                                className={`p-8 rounded-xl border-2 transition-all text-center flex flex-col items-center gap-4 ${
                                    formData.serviceType === 'vaccination' 
                                        ? 'border-primary bg-blue-50' 
                                        : 'border-border bg-white hover:border-primary/50'
                                }`}
                            >
                                <div className="w-16 h-16 bg-blue-100 text-blue-500 rounded-full flex items-center justify-center mb-2">
                                    <Syringe size={32} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold mb-1">Vaccination</h3>
                                    <p className="text-muted text-sm">Routine shots and boosters</p>
                                </div>
                            </button>
                        </div>
                    )}

                    {step === 2 && (
                        <div>
                            <h2 className="text-2xl font-bold mb-6 text-center">Choose a Clinic</h2>
                            {loadingVets ? (
                                <div className="text-center py-8 text-muted">Loading Vets...</div>
                            ) : vets.length === 0 ? (
                                <div className="text-center py-8 text-muted">No vets available at the moment.</div>
                            ) : (
                                <div className="flex flex-col gap-4">
                                    {vets.map(vet => (
                                        <div 
                                            key={vet.id}
                                            onClick={() => {
                                                setFormData(prev => ({ ...prev, vetId: vet.id }));
                                                setStep(3);
                                            }}
                                            className={`p-6 rounded-xl border cursor-pointer flex justify-between items-center transition-all hover:shadow-md ${
                                                formData.vetId === vet.id ? 'border-primary bg-primary-soft' : 'border-border bg-white hover:border-primary'
                                            }`}
                                        >
                                            <div>
                                                <h4 className="text-lg font-bold mb-1">{vet.full_name || 'Veterinary Clinic'}</h4>
                                                <div className="flex items-center gap-2 text-muted text-sm">
                                                    <MapPin size={14} />
                                                    {vet.location || vet.address || 'Location not listed'}
                                                </div>
                                            </div>
                                            <div>
                                                <span className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-xs font-bold">
                                                    Available
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {step === 3 && (
                        <div>
                            <h2 className="text-2xl font-bold mb-6 text-center">Select Date & Time</h2>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Date Selection */}
                                <div>
                                    <label className="flex items-center gap-2 mb-3 font-semibold text-gray-700">
                                        <Calendar size={18} className="text-primary" />
                                        Preferred Date
                                    </label>
                                    <input 
                                        type="date" 
                                        required
                                        min={new Date().toISOString().split('T')[0]}
                                        value={formData.date}
                                        onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                                        className="form-input text-lg p-3"
                                    />
                                </div>

                                {/* Time Selection */}
                                <div>
                                    <label className="flex items-center gap-2 mb-3 font-semibold text-gray-700">
                                        <Clock size={18} className="text-primary" />
                                        Preferred Time
                                    </label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {TIME_SLOTS.map(slot => (
                                            <button
                                                key={slot}
                                                type="button"
                                                onClick={() => setFormData(prev => ({ ...prev, timeSlot: slot }))}
                                                className={`p-3 rounded-lg border font-semibold transition-all ${
                                                    formData.timeSlot === slot 
                                                        ? 'bg-primary text-white border-primary shadow-md' 
                                                        : 'bg-white text-muted border-border hover:border-primary hover:text-primary'
                                                }`}
                                            >
                                                {slot}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            
                            {/* Summary */}
                            {formData.date && formData.timeSlot && (
                                <div className="mt-8 p-6 bg-subtle rounded-xl border border-border">
                                    <h4 className="font-bold mb-4 border-b border-border pb-2">Booking Summary</h4>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-muted">Service:</span>
                                            <span className="font-semibold capitalize text-primary">{formData.serviceType}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted">Clinic:</span>
                                            <span className="font-semibold">{selectedVet?.full_name}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted">Date & Time:</span>
                                            <span className="font-semibold">{formData.date} at {formData.timeSlot}</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="mt-8 pt-6 border-t border-border">
                                <button 
                                    type="submit" 
                                    className="btn btn-primary w-full py-4 text-lg justify-center shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
                                    disabled={!formData.date || !formData.timeSlot || isSubmitting}
                                >
                                    {isSubmitting ? 'Booking...' : 'Confirm Appointment'}
                                </button>
                            </div>
                        </div>
                    )}
                </form>
            </div>
        </div>
      </div>
    </div>
  );
}
