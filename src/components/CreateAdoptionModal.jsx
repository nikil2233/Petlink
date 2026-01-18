import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { 
    X, Upload, Camera, Save, Dog, Cat, Info, Check, 
    MapPin, Calendar, Heart, Share2, Activity, ArrowRight,
    AlignLeft
} from 'lucide-react';

export default function CreateAdoptionModal({ isOpen, onClose, onCreated, session }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    species: 'dog',
    breed: '',
    age_years: '',
    age_months: '',
    gender: 'Unknown',
    location: '',
    description: '',
    medical_history: '',
    behavior_notes: '',
    vaccinated: false,
    neutered: false,
    good_with_kids: false,
    good_with_pets: false,
    contact_info: session?.user?.email || ''
  });

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const uploadImage = async (file) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;
    
    // Attempt upload
    const { error: uploadError } = await supabase.storage
      .from('adoption-images')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('adoption-images')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let imageUrl = null;
      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
      }

      const { error } = await supabase
        .from('adoptions')
        .insert([{
          ...formData,
          image_url: imageUrl,
          posted_by: session.user.id,
          status: 'available'
        }]);

      if (error) throw error;

      onCreated();
      // Optional: Show success toast/confetti here before closing?
      onClose();
    } catch (err) {
      console.error(err);
      setError('Failed to create listing: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity" 
        onClick={onClose}
      ></div>

      {/* Modal Content */}
      <div className="relative w-full max-w-5xl bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header - Fixed */}
        <div className="bg-white px-8 py-5 border-b border-slate-100 flex justify-between items-center sticky top-0 z-10">
            <div>
                <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                    <span className="bg-indigo-100 text-indigo-600 p-2 rounded-xl">
                        <Dog size={24} />
                    </span>
                    List a Pet for Adoption
                </h2>
                <p className="text-slate-500 text-sm mt-1 ml-12">Help them find their forever home</p>
            </div>
            <button 
                onClick={onClose} 
                className="p-2 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition-colors"
            >
                <X size={24} />
            </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="overflow-y-auto p-8 bg-slate-50/50">
            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl flex items-center gap-3 font-semibold shadow-sm">
                    <Info size={20} /> {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* LEFT COLUMN - VISUALS (5 Cols) */}
                <div className="lg:col-span-5 space-y-6">
                    
                    {/* Image Upload Area */}
                    <div className="space-y-3">
                        <label className="text-sm font-bold text-slate-700 uppercase tracking-wider ml-1">Pet Photo</label>
                        <div 
                            className="group relative h-[400px] w-full bg-white border-2 border-dashed border-slate-300 hover:border-indigo-400 rounded-3xl overflow-hidden transition-all cursor-pointer shadow-sm hover:shadow-md flex flex-col items-center justify-center"
                            onClick={() => document.getElementById('adopt-img-upload').click()}
                        >
                            {imagePreview ? (
                                <>
                                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <span className="text-white font-bold flex items-center gap-2 bg-white/20 backdrop-blur-md px-4 py-2 rounded-full">
                                            <Camera size={20} /> Change Photo
                                        </span>
                                    </div>
                                </>
                            ) : (
                                <div className="text-center p-8 space-y-4">
                                    <div className="w-20 h-20 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                                        <Camera size={40} />
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-700">Upload a Photo</h3>
                                    <p className="text-slate-400 text-sm max-w-[200px] mx-auto">
                                        Drag and drop or click to browse. A good photo increases adoption chances!
                                    </p>
                                </div>
                            )}
                            <input id="adopt-img-upload" type="file" hidden accept="image/*" onChange={handleImageChange} />
                        </div>
                    </div>

                    {/* Quick Stats / Toggles */}
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <Activity size={18} className="text-emerald-500" /> Key Attributes
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                            <CheckboxCard 
                                label="Vaccinated" 
                                name="vaccinated" 
                                checked={formData.vaccinated} 
                                onChange={handleChange} 
                            />
                            <CheckboxCard 
                                label="Neutered" 
                                name="neutered" 
                                checked={formData.neutered} 
                                onChange={handleChange} 
                            />
                            <CheckboxCard 
                                label="Good w/ Kids" 
                                name="good_with_kids" 
                                checked={formData.good_with_kids} 
                                onChange={handleChange} 
                            />
                            <CheckboxCard 
                                label="Good w/ Pets" 
                                name="good_with_pets" 
                                checked={formData.good_with_pets} 
                                onChange={handleChange} 
                            />
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN - DETAILS (7 Cols) */}
                <div className="lg:col-span-7 space-y-8">
                    
                    {/* Section 1: Identity */}
                    <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <InputGroup label="Pet Name" icon={<Heart size={18} />}>
                                <input name="name" value={formData.name} onChange={handleChange} className="input-field-modern" placeholder="e.g. Buddy" required />
                            </InputGroup>
                            
                            <div className="relative group">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Species</label>
                                <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
                                    <button 
                                        type="button"
                                        onClick={() => setFormData(p => ({...p, species: 'dog'}))}
                                        className={`flex items-center justify-center gap-2 py-2.5 rounded-lg font-bold text-sm transition-all ${formData.species === 'dog' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        <Dog size={16} /> Dog
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => setFormData(p => ({...p, species: 'cat'}))}
                                        className={`flex items-center justify-center gap-2 py-2.5 rounded-lg font-bold text-sm transition-all ${formData.species === 'cat' ? 'bg-white text-pink-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        <Cat size={16} /> Cat
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <InputGroup label="Breed" icon={<Info size={18} />}>
                                <input name="breed" value={formData.breed} onChange={handleChange} className="input-field-modern" placeholder="e.g. Golden Retriever" />
                            </InputGroup>
                            
                            <InputGroup label="Gender" icon={<Info size={18} />}>
                                <select name="gender" value={formData.gender} onChange={handleChange} className="input-field-modern appearance-none bg-white">
                                    <option value="Unknown">Unknown</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                </select>
                            </InputGroup>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <InputGroup label="Age (Years)" icon={<Calendar size={18} />}>
                                <input type="number" name="age_years" value={formData.age_years} onChange={handleChange} className="input-field-modern" placeholder="0" min="0" />
                            </InputGroup>
                            <InputGroup label="(Months)" icon={<Calendar size={18} />}>
                                <input type="number" name="age_months" value={formData.age_months} onChange={handleChange} className="input-field-modern" placeholder="0" min="0" max="11" />
                            </InputGroup>
                            <InputGroup label="Location" icon={<MapPin size={18} />}>
                                <input name="location" value={formData.location} onChange={handleChange} className="input-field-modern" placeholder="Area" required />
                            </InputGroup>
                        </div>
                    </div>

                    {/* Section 2: Story & Details */}
                    <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100 space-y-6">
                        <InputGroup label="The Story" icon={<AlignLeft size={18} />}>
                            <textarea 
                                name="description" 
                                value={formData.description} 
                                onChange={handleChange} 
                                className="input-field-modern min-h-[100px] py-3 resize-none" 
                                placeholder="Tell adopters about their personality, history, and why they need a home..."
                            />
                        </InputGroup>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <InputGroup label="Medical History" icon={<Activity size={18} />}>
                                <textarea name="medical_history" value={formData.medical_history} onChange={handleChange} className="input-field-modern min-h-[80px]" placeholder="Vaccinations, conditions..." />
                            </InputGroup>
                            <InputGroup label="Behavior Notes" icon={<Info size={18} />}>
                                <textarea name="behavior_notes" value={formData.behavior_notes} onChange={handleChange} className="input-field-modern min-h-[80px]" placeholder="Personality traits..." />
                            </InputGroup>
                        </div>

                        <InputGroup label="Contact Info (Public)" icon={<Share2 size={18} />}>
                            <input name="contact_info" value={formData.contact_info} onChange={handleChange} className="input-field-modern" placeholder="Phone or Email for inquiries" />
                        </InputGroup>
                    </div>

                </div>
            </form>
        </div>

        {/* Footer - Fixed */}
        <div className="bg-white px-8 py-5 border-t border-slate-100 flex justify-between items-center sticky bottom-0 z-10">
            <button 
                type="button" 
                onClick={onClose}
                className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors"
            >
                Cancel
            </button>
            <button 
                onClick={handleSubmit}
                disabled={loading}
                className={`
                    px-8 py-3 rounded-full font-bold text-lg text-white shadow-xl flex items-center gap-2
                    transition-all active:scale-95
                    ${loading ? 'bg-slate-400 cursor-not-allowed' : 'bg-slate-900 hover:bg-black hover:shadow-2xl hover:-translate-y-1'}
                `}
            >
                {loading ? 'Publishing...' : <><Save size={20} /> Publish Listing</>}
            </button>
        </div>

      </div>

      <style>{`
        .input-field-modern {
            width: 100%;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            padding: 0.85rem 1rem 0.85rem 2.75rem;
            border-radius: 1rem;
            font-size: 0.95rem;
            font-weight: 500;
            color: #1e293b;
            outline: none;
            transition: all 0.2s ease;
        }
        .input-field-modern:focus {
            background: #ffffff;
            border-color: #6366f1;
            box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
        }
        .input-field-modern::placeholder {
            color: #94a3b8;
        }
      `}</style>
    </div>
  );
}

// Reusable UI Components
const InputGroup = ({ label, icon, children }) => (
    <div className="relative group">
        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">{label}</label>
        <div className="relative">
            <div className="absolute top-4 left-3.5 text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                {icon}
            </div>
            {children}
        </div>
    </div>
);

const CheckboxCard = ({ label, name, checked, onChange }) => (
    <label className={`
        flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all duration-200
        ${checked ? 'border-indigo-500 bg-indigo-50/50' : 'border-slate-100 bg-slate-50 hover:border-indigo-200'}
    `}>
        <div className={`
            w-5 h-5 rounded-md flex items-center justify-center transition-colors
            ${checked ? 'bg-indigo-500 text-white' : 'bg-white border border-slate-300'}
        `}>
            {checked && <Check size={14} strokeWidth={3} />}
        </div>
        <input type="checkbox" name={name} checked={checked} onChange={onChange} className="hidden" />
        <span className={`text-sm font-bold ${checked ? 'text-indigo-900' : 'text-slate-600'}`}>{label}</span>
    </label>
);
