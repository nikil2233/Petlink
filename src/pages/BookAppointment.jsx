import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Clipboard, 
  Syringe, 
  Heart, 
  Shield, 
  ChevronLeft, 
  AlertCircle, 
  Check, 
  MapPin, 
  Calendar, 
  Clock, 
  Scissors,
  Info,
  ChevronDown,
  ChevronUp,
  Stethoscope,
  Activity,
  PawPrint
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';

const TIME_SLOTS = [
  '09:00 AM', '10:00 AM', '11:00 AM', '02:00 PM', '03:00 PM', '04:00 PM'
];

/**
 * Custom Animated Dropdown Component
 */
const CustomSelect = ({ label, value, onChange, options, placeholder, icon: Icon, required = false }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (optionValue) => {
        onChange({ target: { value: optionValue } }); // Mock event for compatibility
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={containerRef}>
            {label && <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{label} {required && '*'}</label>}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full bg-slate-50 border-2 rounded-[12px] px-4 py-3 text-sm font-medium flex items-center justify-between transition-all outline-none ${
                    isOpen ? 'border-amber-400 ring-2 ring-amber-100 bg-white' : 'border-slate-100 hover:border-amber-200'
                }`}
            >
                <div className="flex items-center gap-2 text-slate-700">
                    {Icon && <Icon size={16} className="text-slate-400" />}
                    {value ? (
                        <span className="text-slate-900">{value}</span>
                    ) : (
                        <span className="text-slate-400">{placeholder}</span>
                    )}
                </div>
                <ChevronDown 
                    size={18} 
                    className={`text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} 
                />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="absolute z-50 w-full mt-2 bg-white rounded-[16px] shadow-xl border border-slate-100 overflow-hidden max-h-60 overflow-y-auto custom-scrollbar"
                    >
                        {options.map((option) => (
                            <button
                                key={option}
                                type="button"
                                onClick={() => handleSelect(option)}
                                className={`w-full text-left px-4 py-3 text-sm font-medium transition-colors flex items-center justify-between ${
                                    value === option 
                                        ? 'bg-amber-50 text-amber-900' 
                                        : 'text-slate-600 hover:bg-slate-50'
                                }`}
                            >
                                {option}
                                {value === option && <Check size={14} className="text-amber-500" />}
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default function BookAppointment() {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [vets, setVets] = useState([]);
  const [loadingVets, setLoadingVets] = useState(false);
  const [showSterilizationInfo, setShowSterilizationInfo] = useState(false);
  
  const [formData, setFormData] = useState({
    serviceType: '', 
    petName: '',
    petSpecies: '',
    petGender: '',
    petAge: '',
    petWeight: '',
    procedureType: '', 
    isHealthy: true,
    medicalConditions: '',
    onMedication: false,
    medicationDetails: '',
    vaccinationStatus: '',
    vetId: '',
    date: '',
    timeSlot: '',
    ownerConsent: false
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
    }
    finally {
      setLoadingVets(false);
    }
  };

  const handleSelectService = (type) => {
    setFormData(prev => ({ ...prev, serviceType: type }));
    setStep(2);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Special handler for gender to auto-set procedure
  const handleGenderChange = (value) => {
      const gender = value;
      const procedure = gender === 'Female' ? 'Spay' : (gender === 'Male' ? 'Neuter' : '');
      setFormData(prev => ({ ...prev, petGender: gender, procedureType: procedure }));
  }

  const validateStep = () => {
    setError(null);
    if (step === 2) { 
        if (!formData.petName || !formData.petSpecies || !formData.petGender || !formData.petAge || !formData.petWeight) {
            setError("Please fill in all pet details.");
            return false;
        }
    }
    if (step === 3) { 
        if (formData.serviceType === 'sterilization') {
           if (!formData.procedureType) {
               setError("Please select a procedure type (Spay/Neuter).");
               return false;
           }
        }
        if (!formData.vaccinationStatus) {
            setError("Please indicate vaccination status.");
            return false;
        }
        if (!formData.isHealthy && !formData.medicalConditions) {
             setError("Please describe the known medical conditions.");
             return false;
        }
        if (formData.onMedication && !formData.medicationDetails) {
             setError("Please provide medication details.");
             return false;
        }
    }
    if (step === 4) { 
        if (!formData.vetId) {
            setError("Please select a clinic.");
            return false;
        }
    }
    return true;
  };

  const nextStep = () => {
      if (validateStep()) {
          setStep(step + 1);
          window.scrollTo({ top: 0, behavior: 'smooth' });
      }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!session) {
        alert("Please login to book an appointment");
        navigate('/auth');
        return;
    }
    if (!formData.ownerConsent) {
        setError("You must provide consent to proceed.");
        return;
    }

    setIsSubmitting(true);
    setError(null);
    
    try {
        const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', session.user.id)
            .maybeSingle();
        
        if (!profile) {
            const { error: createError } = await supabase.from('profiles').insert([{ 
                id: session.user.id,
                email: session.user.email,
                role: 'user'
            }]);
            if (createError) throw new Error("Could not create user profile.");
        }

        const { data: appointmentData, error: appointmentError } = await supabase
            .from('appointments')
            .insert([{
                pet_owner_id: session.user.id,
                vet_id: formData.vetId,
                service_type: formData.serviceType,
                pet_name: formData.petName,
                pet_species: formData.petSpecies,
                pet_gender: formData.petGender,
                pet_age: formData.petAge,
                pet_weight: formData.petWeight,
                procedure_type: formData.procedureType,
                is_healthy: formData.isHealthy,
                medical_conditions: formData.medicalConditions,
                on_medication: formData.onMedication,
                medication_details: formData.medicationDetails,
                vaccinated: formData.vaccinationStatus,
                owner_consent: formData.ownerConsent,
                appointment_date: formData.date,
                time_slot: formData.timeSlot,
                status: 'pending'
            }])
            .select()
            .single();

        if (appointmentError) throw appointmentError;

        await supabase
            .from('notifications')
            .insert([{
                user_id: formData.vetId,
                title: "New Appointment Request",
                message: `New ${formData.serviceType} request for ${formData.petName}`,
                type: 'info',
                metadata: { appointment_id: appointmentData.id }
            }]);
        
        alert('Appointment Request Sent!');
        navigate('/my-bookings');
    } catch (err) {
        console.error("Booking error:", err);
        setError("Failed to book appointment: " + err.message);
    } finally {
        setIsSubmitting(false);
    }
  };

  const selectedVet = vets.find(v => v.id === formData.vetId);

  return (
    <div className="min-h-screen bg-slate-50 font-sans p-6 pb-20">
      <div className="max-w-4xl mx-auto">
        
        {/* Navigation Back */}
        <button 
            onClick={() => step > 1 ? setStep(step - 1) : navigate(-1)}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors font-bold text-[14px] mb-8 px-[16px] py-[8px] hover:bg-white hover:shadow-sm rounded-[8px] w-fit"
        >
            <ChevronLeft size={16} /> {step > 1 ? 'Back to previous step' : 'Back to Home'}
        </button>

        {/* HERO SECTION */}
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-[24px] p-8 md:p-12 shadow-sm border border-slate-100 relative overflow-hidden mb-8"
        >
            <div className="relative z-10 max-w-2xl">
                <div className="flex items-center gap-2 mb-4">
                    <div className="bg-amber-100 p-2 rounded-lg text-amber-600">
                        <Clipboard size={20} />
                    </div>
                    <span className="text-xs font-bold text-amber-600 tracking-wider uppercase">Online Booking</span>
                </div>
                <h1 className="text-4xl font-black text-slate-800 mb-4 tracking-tight">
                    Your Pet’s Wellness <br/> <span className="text-amber-500">Starts Here.</span>
                </h1>
                <p className="text-slate-500 text-lg font-medium mb-6 leading-relaxed">
                    Book an appointment in 5 easy steps. We'll connect you with the best vets in town.
                </p>
                <div className="flex items-center gap-2">
                    <span className="bg-slate-100 text-slate-600 px-[12px] py-[6px] rounded-[8px] text-[12px] font-bold">
                        Step {step} of 5
                    </span>
                    <div className="flex-1 h-2 bg-slate-100 rounded-full max-w-[200px] overflow-hidden">
                        <motion.div 
                            className="h-full bg-amber-500 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${(step / 5) * 100}%` }}
                            transition={{ duration: 0.5 }}
                        />
                    </div>
                </div>
            </div>
            
            {/* Background Decor */}
            <div className="absolute right-0 top-0 h-full w-1/3 opacity-5 md:opacity-100 pointer-events-none">
                 <img src="/puppy_kitten_hero.png" className="h-full object-contain object-right-bottom" alt="Decor" />
            </div>
        </motion.div>

        {/* MAIN CONTENT AREA */}
        <AnimatePresence mode="wait">
            <motion.div
                key={step}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.3 }}
            >
                {/* STEP 1: SERVICE SELECTION */}
                {step === 1 && (
                    <div className="space-y-6">
                        <div className="grid md:grid-cols-2 gap-6">
                            {/* Sterilization Card */}
                            <div className="bg-white rounded-[20px] p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <Scissors size={80} className="text-rose-500" />
                                </div>
                                
                                <div className="relative z-10">
                                    <div className="w-12 h-12 bg-rose-50 rounded-[12px] flex items-center justify-center text-rose-500 mb-4">
                                        <Scissors size={24} />
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-800 mb-2">Sterilization</h3>
                                    <p className="text-slate-500 text-sm mb-6 leading-relaxed">
                                        Spay/Neuter procedure. Promotes long-term health and prevents reproduction.
                                    </p>
                                    
                                    <button 
                                        onClick={() => handleSelectService('sterilization')}
                                        className="w-full bg-rose-500 hover:bg-rose-600 text-white px-[16px] py-[8px] rounded-[8px] font-bold text-[14px] transition-colors shadow-sm shadow-rose-200"
                                    >
                                        Select Service
                                    </button>
                                </div>
                            </div>

                            {/* Vaccination Card */}
                            <div className="bg-white rounded-[20px] p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <Shield size={80} className="text-emerald-500" />
                                </div>
                                
                                <div className="relative z-10">
                                    <div className="w-12 h-12 bg-emerald-50 rounded-[12px] flex items-center justify-center text-emerald-500 mb-4">
                                        <Syringe size={24} />
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-800 mb-2">Vaccination</h3>
                                    <p className="text-slate-500 text-sm mb-6 leading-relaxed">
                                        Routine immunization. Protects your beloved pet from common diseases.
                                    </p>
                                    
                                    <button 
                                        onClick={() => handleSelectService('vaccination')}
                                        className="w-full bg-emerald-500 hover:bg-emerald-600 text-white px-[16px] py-[8px] rounded-[8px] font-bold text-[14px] transition-colors shadow-sm shadow-emerald-200"
                                    >
                                        Select Service
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* EDUCATIONAL SECTION (Sterilization) */}
                        <div className="bg-white rounded-[20px] border border-slate-100 overflow-hidden">
                            <button 
                                onClick={() => setShowSterilizationInfo(!showSterilizationInfo)}
                                className="w-full flex items-center justify-between p-6 hover:bg-slate-50 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="bg-blue-50 p-2 rounded-full text-blue-600">
                                        <Info size={20} />
                                    </div>
                                    <div className="text-left">
                                        <h4 className="font-bold text-slate-800">About Sterilization</h4>
                                        <p className="text-xs text-slate-500 font-medium">Why is it important?</p>
                                    </div>
                                </div>
                                {showSterilizationInfo ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
                            </button>
                            
                            <AnimatePresence>
                                {showSterilizationInfo && (
                                    <motion.div 
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="border-t border-slate-100"
                                    >
                                        <div className="p-6 md:p-8 grid md:grid-cols-2 gap-8 text-sm leading-relaxed text-slate-600">
                                            <div className="col-span-full">
                                                <p className="mb-4 font-medium text-slate-700">
                                                    Sterilization is a routine medical procedure performed by veterinarians to permanently prevent a pet from reproducing. It is a safe, common surgery that offers both health and behavioral benefits.
                                                </p>
                                            </div>

                                            {/* Spaying */}
                                            <div className="bg-rose-50/50 p-6 rounded-[16px] border border-rose-100">
                                                <h5 className="text-lg font-bold text-rose-700 mb-3 flex items-center gap-2">
                                                    <Heart size={16} className="fill-rose-500 text-rose-500" /> 1. Spaying (Females)
                                                </h5>
                                                <ul className="space-y-3">
                                                    <li><strong className="text-rose-900 block mb-1">What it is:</strong> Surgical removal of the ovaries and usually the uterus.</li>
                                                    <li><strong className="text-rose-900 block mb-1">Benefits:</strong> Eliminates risk of uterine infections (pyometra) and uterine/ovarian cancers.</li>
                                                    <li><strong className="text-rose-900 block mb-1">Behavior:</strong> Stops the "heat" cycle, preventing roaming and attracting males.</li>
                                                </ul>
                                            </div>

                                            {/* Neutering */}
                                            <div className="bg-blue-50/50 p-6 rounded-[16px] border border-blue-100">
                                                <h5 className="text-lg font-bold text-blue-700 mb-3 flex items-center gap-2">
                                                    <Shield size={16} className="fill-blue-500 text-blue-500" /> 2. Neutering (Males)
                                                </h5>
                                                <ul className="space-y-3">
                                                    <li><strong className="text-blue-900 block mb-1">What it is:</strong> Surgical removal of the testes.</li>
                                                    <li><strong className="text-blue-900 block mb-1">Benefits:</strong> Significantly reduces risk of testicular cancer and prostate problems.</li>
                                                    <li><strong className="text-blue-900 block mb-1">Behavior:</strong> Reduces aggressive tendencies and urine marking inside the house.</li>
                                                </ul>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                )}

                {/* STEP 2: PET DETAILS */}
                {step === 2 && (
                    <div className="bg-white rounded-[24px] shadow-sm border border-slate-100 p-8 animate-fade-in">
                        <h2 className="text-xl font-bold text-slate-800 mb-6">Pet Information</h2>
                        
                        <div className="grid md:grid-cols-2 gap-6 mb-6">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Pet Name</label>
                                <input name="petName" value={formData.petName} onChange={handleChange} className="w-full bg-slate-50 border-2 border-slate-100 rounded-[12px] px-4 py-3 text-sm font-medium focus:border-amber-400 outline-none transition-colors" placeholder="e.g. Buster" />
                            </div>
                            
                            {/* CUSTOM DROPDOWN: SPECIES */}
                            <div>
                                <CustomSelect 
                                    label="Species"
                                    value={formData.petSpecies}
                                    options={['Dog', 'Cat']}
                                    onChange={(e) => setFormData(prev => ({ ...prev, petSpecies: e.target.value }))}
                                    placeholder="Select Species"
                                    icon={PawPrint}
                                />
                            </div>

                            {/* CUSTOM DROPDOWN: GENDER */}
                            <div>
                                <CustomSelect 
                                    label="Gender"
                                    value={formData.petGender}
                                    options={['Male', 'Female']}
                                    onChange={(e) => handleGenderChange(e.target.value)}
                                    placeholder="Select Gender"
                                    icon={Activity}
                                />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Age</label>
                                    <input name="petAge" value={formData.petAge} onChange={handleChange} className="w-full bg-slate-50 border-2 border-slate-100 rounded-[12px] px-3 py-3 text-sm font-medium focus:border-amber-400 outline-none transition-colors" placeholder="e.g. 2 yrs" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Weight</label>
                                    <input name="petWeight" value={formData.petWeight} onChange={handleChange} className="w-full bg-slate-50 border-2 border-slate-100 rounded-[12px] px-3 py-3 text-sm font-medium focus:border-amber-400 outline-none transition-colors" placeholder="e.g. 5 kg" />
                                </div>
                            </div>
                        </div>

                        <button onClick={nextStep} className="w-full bg-slate-900 text-white py-3 rounded-[12px] font-bold shadow-lg shadow-slate-200 hover:bg-slate-800 transition-all">
                            Next Step
                        </button>
                    </div>
                )}

                {/* STEP 3: MEDICAL INFO - Unchanged logic, consistent CSS */}
                {step === 3 && (
                    <div className="bg-white rounded-[24px] shadow-sm border border-slate-100 p-8 animate-fade-in">
                        <h2 className="text-xl font-bold text-slate-800 mb-6">Medical History</h2>
                        
                        {formData.serviceType === 'sterilization' && (
                            <div className="mb-6 p-4 bg-purple-50 rounded-[16px] border border-purple-100">
                                <label className="block text-xs font-bold text-purple-700 uppercase mb-3">Procedure Type</label>
                                <div className="flex gap-4">
                                    <label className={`flex-1 flex items-center gap-2 p-3 rounded-[12px] border cursor-pointer transition-all ${formData.procedureType === 'Spay' ? 'bg-white border-purple-500 text-purple-700 shadow-sm' : 'border-purple-200 text-slate-500'}`}>
                                        <input type="radio" name="procedureType" value="Spay" checked={formData.procedureType === 'Spay'} onChange={handleChange} className="accent-purple-600" />
                                        <span className="text-sm font-bold">Spay (Female)</span>
                                    </label>
                                    <label className={`flex-1 flex items-center gap-2 p-3 rounded-[12px] border cursor-pointer transition-all ${formData.procedureType === 'Neuter' ? 'bg-white border-purple-500 text-purple-700 shadow-sm' : 'border-purple-200 text-slate-500'}`}>
                                        <input type="radio" name="procedureType" value="Neuter" checked={formData.procedureType === 'Neuter'} onChange={handleChange} className="accent-purple-600" />
                                        <span className="text-sm font-bold">Neuter (Male)</span>
                                    </label>
                                </div>
                            </div>
                        )}

                        <div className="space-y-4 mb-8">
                            <label className="flex items-center justify-between p-4 bg-slate-50 rounded-[12px] cursor-pointer hover:bg-slate-100 transition-colors">
                                <span className="text-sm font-bold text-slate-700">Is your pet currently healthy?</span>
                                <input type="checkbox" name="isHealthy" checked={formData.isHealthy} onChange={handleChange} className="w-5 h-5 accent-emerald-500 rounded" />
                            </label>

                            {!formData.isHealthy && (
                                <textarea name="medicalConditions" value={formData.medicalConditions} onChange={handleChange} className="w-full p-4 bg-red-50 border border-red-100 rounded-[12px] text-sm focus:border-red-300 outline-none" placeholder="Please describe any conditions..." />
                            )}

                            <label className="flex items-center justify-between p-4 bg-slate-50 rounded-[12px] cursor-pointer hover:bg-slate-100 transition-colors">
                                <span className="text-sm font-bold text-slate-700">Currently on medication?</span>
                                <input type="checkbox" name="onMedication" checked={formData.onMedication} onChange={handleChange} className="w-5 h-5 accent-amber-500 rounded" />
                            </label>

                            {formData.onMedication && (
                                <input name="medicationDetails" value={formData.medicationDetails} onChange={handleChange} className="w-full p-4 bg-amber-50 border border-amber-100 rounded-[12px] text-sm focus:border-amber-300 outline-none" placeholder="Medication details..." />
                            )}

                            <div className="pt-4">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Vaccination Status</label>
                                <div className="grid grid-cols-2 gap-4">
                                    {['Vaccinated', 'Not Vaccinated'].map(status => (
                                        <label key={status} className={`border-2 rounded-[12px] p-3 text-center cursor-pointer transition-all text-sm font-bold ${formData.vaccinationStatus === status ? 'bg-teal-50 border-teal-500 text-teal-700' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-300'}`}>
                                            <input type="radio" name="vaccinationStatus" value={status} checked={formData.vaccinationStatus === status} onChange={handleChange} className="hidden" />
                                            {status}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <button onClick={nextStep} className="w-full bg-slate-900 text-white py-3 rounded-[12px] font-bold shadow-lg shadow-slate-200 hover:bg-slate-800 transition-all">
                            Next Step
                        </button>
                    </div>
                )}

                {/* STEP 4: CHOOSE CLINIC */}
                {step === 4 && (
                    <div className="bg-white rounded-[24px] shadow-sm border border-slate-100 p-8 animate-fade-in">
                        <h2 className="text-xl font-bold text-slate-800 mb-6">Select a Clinic</h2>
                        
                        {loadingVets ? (
                            <div className="text-center py-12 text-slate-400 font-medium">Loading clinics...</div>
                        ) : vets.length === 0 ? (
                            <div className="text-center py-12 text-slate-400 font-medium">No clinics found nearby.</div>
                        ) : (
                            <div className="grid gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                {vets.map(vet => (
                                    <div 
                                        key={vet.id}
                                        onClick={() => {
                                            setFormData(prev => ({ ...prev, vetId: vet.id }));
                                            nextStep();
                                        }}
                                        className={`p-4 rounded-[16px] border cursor-pointer flex justify-between items-center transition-all ${
                                            formData.vetId === vet.id 
                                                ? 'border-emerald-500 bg-emerald-50 shadow-sm' 
                                                : 'border-slate-100 hover:border-emerald-200 hover:bg-slate-50'
                                        }`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                                                <MapPin size={20} />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-800 text-sm">{vet.full_name || 'Veterinary Clinic'}</h4>
                                                <p className="text-xs text-slate-500 font-medium">{vet.location || vet.address || 'Address not listed'}</p>
                                            </div>
                                        </div>
                                        {formData.vetId === vet.id && <div className="text-emerald-600"><Check size={20} /></div>}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* STEP 5: CONFIRM */}
                {step === 5 && (
                    <div className="bg-white rounded-[24px] shadow-sm border border-slate-100 p-8 animate-fade-in">
                        <h2 className="text-xl font-bold text-slate-800 mb-6">Finalize Booking</h2>
                        
                        <div className="grid md:grid-cols-2 gap-6 mb-8">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Date</label>
                                <input 
                                    type="date" 
                                    required
                                    min={new Date().toISOString().split('T')[0]}
                                    value={formData.date}
                                    onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-[12px] px-4 py-3 text-sm font-medium focus:border-amber-400 outline-none"
                                />
                            </div>
                            
                            {/* CUSTOM DROPDOWN: TIME SLOT */}
                            <div>
                                <CustomSelect 
                                    label="Time"
                                    value={formData.timeSlot}
                                    options={TIME_SLOTS}
                                    onChange={(e) => setFormData(prev => ({ ...prev, timeSlot: e.target.value }))}
                                    placeholder="Select Time..."
                                    icon={Clock}
                                />
                            </div>
                        </div>

                        <div className="bg-slate-50 p-6 rounded-[16px] mb-8 border border-slate-100">
                            <h4 className="font-bold text-slate-800 mb-4 text-sm uppercase tracking-wider">Summary</h4>
                            <div className="space-y-3 text-sm text-slate-600">
                                <div className="flex justify-between border-b border-slate-200 pb-2">
                                    <span>Service</span>
                                    <span className="font-bold text-slate-900 capitalize">{formData.serviceType}</span>
                                </div>
                                <div className="flex justify-between border-b border-slate-200 pb-2">
                                    <span>Pet</span>
                                    <span className="font-bold text-slate-900">{formData.petName} <span className="font-normal text-slate-400">({formData.petSpecies})</span></span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Clinic</span>
                                    <span className="font-bold text-slate-900">{selectedVet?.full_name}</span>
                                </div>
                            </div>
                        </div>

                        <label className="flex items-start gap-3 p-4 border border-slate-200 rounded-[12px] cursor-pointer hover:bg-slate-50 transition-colors mb-6">
                            <input 
                                type="checkbox" 
                                name="ownerConsent"
                                checked={formData.ownerConsent} 
                                onChange={handleChange}
                                className="w-5 h-5 accent-emerald-600 mt-0.5" 
                            />
                            <span className="text-xs text-slate-500 leading-relaxed font-medium">
                                I consent to the {formData.serviceType} procedure for my pet. I confirm the details above are accurate.
                            </span>
                        </label>

                        <button 
                            onClick={handleSubmit}
                            disabled={!formData.date || !formData.timeSlot || !formData.ownerConsent || isSubmitting}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white py-4 rounded-[12px] font-bold text-lg shadow-lg shadow-emerald-200 transition-all"
                        >
                            {isSubmitting ? 'Confirming...' : 'Confirm Appointment'}
                        </button>
                    </div>
                )}
            </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
