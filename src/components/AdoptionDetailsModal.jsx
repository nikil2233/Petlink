import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useChat } from '../context/ChatContext';
import { X, Heart, MapPin, Shield, Info, CheckCircle, AlertCircle, ChevronLeft, MessageCircle } from 'lucide-react';

export default function AdoptionDetailsModal({ animal, isOpen, onClose, session }) {
  const { openChat } = useChat();
  const [view, setView] = useState('details'); // 'details' or 'apply'
  const [appLoading, setAppLoading] = useState(false);
  const [appSuccess, setAppSuccess] = useState(false);
  
  // Application Form State
  const [appData, setAppData] = useState({
    phone: '',
    address: '',
    living_situation: 'House',
    experience: '',
    has_other_pets: false,
    message: ''
  });

  // Check status function defined early to be used in effect
  const checkApplicationStatus = async () => {
    if (!animal || !session) return;
    console.log("Checking status for:", { animalId: animal.id, userId: session.user.id });
    try {
        const { data, error } = await supabase
            .from('adoption_requests')
            .select('id, status')
            .eq('adoption_id', animal.id)
            .eq('requester_id', session.user.id)
            .maybeSingle(); // Returns null if not found, instead of error
        
        console.log("Status Check Result:", { data, error });

        if (error) {
            console.error("Error checking status:", error);
            return;
        }

        if (data) {
            console.log("Found existing application!", data);
            setAppSuccess(true);
        }
    } catch (e) {
        console.error("Exception checking status:", e);
    }
  };

  // Check if already applied - Hook must be top level
  useEffect(() => {
    if (session && animal && isOpen) {
        // Reset state on open/change
        setAppSuccess(false);
        setAppLoading(false);
        setView('details'); // Always start on details view
        
        checkApplicationStatus();
    }
  }, [session, animal, isOpen]);

  const handleAppChange = (e) => {
    const { name, value, type, checked } = e.target;
    setAppData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const submitApplication = async (e) => {
    e.preventDefault();
    if (!session) {
        alert("Please login to apply");
        return;
    }
    setAppLoading(true);

    try {
        const { error } = await supabase
            .from('adoption_requests')
            .insert([{
                adoption_id: animal.id,
                requester_id: session.user.id,
                status: 'pending',
                ...appData
            }]);
            
        if (error) throw error;
        
        // Notification is now handled by the Database Trigger (more reliable)
        console.log("Application submitted successfully");
        setAppSuccess(true);
    } catch (err) {
        console.error("Submission Error:", err);
        alert("Failed to submit application: " + err.message);
    } finally {
        setAppLoading(false);
    }
  };

  if (!isOpen || !animal) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content !p-0 !max-w-4xl flex flex-col overflow-hidden">
        
        {/* Header Image Area */}
        <div className="h-72 relative bg-slate-700 shrink-0">
            <img 
                src={animal.image_url || `https://source.unsplash.com/800x600/?${animal.species}`} 
                alt={animal.name} 
                className="w-full h-full object-cover"
            />
            <button 
                onClick={onClose}
                className="absolute top-4 right-4 bg-black/50 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-black/70 transition-colors border-none cursor-pointer z-10"
            >
                <X size={18} />
            </button>
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-8 pt-16 text-white">
                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="m-0 text-4xl mb-1">{animal.name}</h1>
                        <p className="m-0 opacity-90 text-lg">
                            {animal.breed} • {animal.age_years > 0 ? `${animal.age_years} yrs ` : ''}{animal.age_months > 0 ? `${animal.age_months} mos` : ''}
                        </p>
                    </div>
                    {animal.status === 'available' && (
                         <div className="bg-green-500 px-3 py-1 rounded-full font-bold text-xs tracking-wider">
                            AVAILABLE
                         </div>
                    )}
                </div>
            </div>
        </div>

        {/* Content Area */}
        <div className="p-8 overflow-y-auto">
            {view === 'details' ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    
                    {/* Left: Info */}
                    <div className="md:col-span-2">
                        <div className="flex flex-wrap gap-3 mb-6">
                             <div className="bg-slate-100 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2"><MapPin size={14} /> {animal.location || 'Unknown Location'}</div>
                             <div className="bg-slate-100 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2 capitalize">{animal.gender}</div>
                             {animal.vaccinated && <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2"><Shield size={14} /> Vaccinated</div>}
                        </div>

                        <div className="mb-8 pb-4 border-b border-border">
                            <h3 className="mb-2 text-xl font-semibold">About {animal.name}</h3>
                            <p className="leading-relaxed text-muted whitespace-pre-line">
                                {animal.description}
                            </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                            <div>
                                <h4 className="font-semibold mb-2">Behavior & Personality</h4>
                                <p className="text-sm text-muted mb-2">{animal.behavior_notes || 'No specific notes listed.'}</p>
                                <ul className="space-y-2 text-sm">
                                    <li className="flex items-center gap-2">
                                        {animal.good_with_kids ? <CheckCircle size={16} className="text-success" /> : <AlertCircle size={16} className="text-muted" />} Good with Kids
                                    </li>
                                    <li className="flex items-center gap-2">
                                        {animal.good_with_pets ? <CheckCircle size={16} className="text-success" /> : <AlertCircle size={16} className="text-muted" />} Good with Pets
                                    </li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-semibold mb-2">Medical History</h4>
                                <p className="text-sm text-muted mb-2">{animal.medical_history || 'No medical history listed.'}</p>
                                <ul className="space-y-2 text-sm">
                                    <li className="flex items-center gap-2">
                                        {animal.vaccinated ? <CheckCircle size={16} className="text-success" /> : <AlertCircle size={16} className="text-muted" />} Vaccinated
                                    </li>
                                    <li className="flex items-center gap-2">
                                        {animal.neutered ? <CheckCircle size={16} className="text-success" /> : <AlertCircle size={16} className="text-muted" />} Neutered / Spayed
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex flex-col gap-4">
                        <div className="bg-subtle p-6 rounded-2xl border border-border">
                            <h4 className="m-0 mb-2 text-lg">Interested in {animal.name}?</h4>
                            <p className="text-sm text-muted mb-4">Submit an application to start the adoption process.</p>
                            
                                <button 
                                    onClick={() => setView('apply')}
                                    className={`btn btn-primary w-full justify-center ${appSuccess ? 'opacity-50 cursor-not-allowed bg-green-600 border-green-600' : ''}`}
                                    disabled={appSuccess}
                                >
                                    {appSuccess ? 'Application Submitted' : 'Apply to Adopt'}
                                </button>
                            
                            <div className="text-center mt-4 text-xs text-muted">
                                Posted by: {animal.posted_by === session?.user?.id ? 'You' : 'Owner/Shelter'}
                            </div>

                            {session && animal.posted_by !== session.user.id && (
                                <button 
                                    onClick={() => {
                                        onClose();
                                        openChat(animal.posted_by);
                                    }}
                                    className="btn btn-secondary w-full justify-center mt-3 flex items-center gap-2 border border-slate-200 hover:bg-slate-50 text-slate-700"
                                >
                                    <MessageCircle size={18} /> Message Owner
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                /* Application View */
                <div className="max-w-xl mx-auto py-4">
                   <button onClick={() => setView('details')} className="flex items-center gap-2 text-muted hover:text-primary mb-6 transition-colors bg-transparent border-none cursor-pointer">
                       <ChevronLeft size={16} /> Back to Details
                   </button>

                   {appSuccess ? (
                       <div className="text-center py-12">
                           <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                               <CheckCircle size={32} className="text-success" />
                           </div>
                           <h3 className="mb-2">Application Submitted!</h3>
                           <p className="text-muted mb-6">The owner will review your details and contact you soon.</p>
                           <button onClick={onClose} className="btn btn-primary">Close</button>
                       </div>
                   ) : (
                       <div>
                           <h3 className="mb-2">Adoption Application for {animal.name}</h3>
                           <p className="text-muted mb-6">Please answer a few questions to help us ensure a good match.</p>
                           
                           <form onSubmit={submitApplication} className="flex flex-col gap-4">
                               <div className="form-group">
                                   <label className="form-label">Phone Number</label>
                                   <input name="phone" value={appData.phone} onChange={handleAppChange} type="text" required className="form-input" />
                               </div>
                               <div className="form-group">
                                   <label className="form-label">Current Address</label>
                                   <input name="address" value={appData.address} onChange={handleAppChange} type="text" required className="form-input" />
                               </div>
                               <div className="form-group">
                                   <label className="form-label">Living Situation</label>
                                   <select name="living_situation" value={appData.living_situation} onChange={handleAppChange} className="form-select">
                                       <option>House (Own)</option>
                                       <option>House (Rent)</option>
                                       <option>Apartment (Own)</option>
                                       <option>Apartment (Rent)</option>
                                   </select>
                               </div>
                               <div className="form-group">
                                   <label className="form-label">Pet Experience</label>
                                   <textarea name="experience" value={appData.experience} onChange={handleAppChange} rows="2" placeholder="Have you owned pets before?" className="form-textarea" required />
                               </div>
                               <div className="form-group">
                                   <label className="form-label">Message to Owner</label>
                                   <textarea name="message" value={appData.message} onChange={handleAppChange} rows="3" placeholder="Why do you want to adopt?" className="form-textarea" required />
                               </div>
                               <label className="flex items-center gap-2 cursor-pointer mt-2">
                                   <input type="checkbox" name="has_other_pets" checked={appData.has_other_pets} onChange={handleAppChange} className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary" />
                                   <span className="text-sm font-medium">I currently have other pets</span>
                               </label>
                               
                               <button type="submit" className="btn btn-primary mt-4" disabled={appLoading}>
                                   {appLoading ? 'Submitting...' : 'Submit Application'}
                               </button>
                           </form>
                       </div>
                   )}
                </div>
            )}
        </div>
      </div>
    </div>
  );
}
