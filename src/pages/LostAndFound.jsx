import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { 
    MapPin, Camera, AlertTriangle, Send, X, Search, Phone, 
    Calendar, Clock, PawPrint, CheckCircle, FileText, Download, 
    Share2, Eye, Shield, Lock, Unlock 
} from 'lucide-react';
import MapPicker from '../components/MapPicker';
import { useAuth } from '../context/AuthContext';
import jsPDF from 'jspdf';

export default function LostAndFound() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [activeTab, setActiveTab] = useState('alerts'); // 'alerts', 'report'
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  
  // Data for Feed
  const [lostPets, setLostPets] = useState([]);
  const fileInputRef = useRef(null);

  // --- FORM STATE ---
  const [reportType, setReportType] = useState('lost'); // 'lost', 'found'
  
  // A. Core Identity
  const [petName, setPetName] = useState('');
  const [species, setSpecies] = useState('Dog');
  const [breed, setBreed] = useState('');
  const [gender, setGender] = useState('Unknown');
  const [size, setSize] = useState('Medium');

  // B. Visual Details
  const [primaryColor, setPrimaryColor] = useState('');
  const [secondaryColor, setSecondaryColor] = useState('');
  const [coatType, setCoatType] = useState('');
  const [distinctiveFeatures, setDistinctiveFeatures] = useState('');
  const [images, setImages] = useState([]); // Array of {file, preview}
  
  // C. The Incident
  const [lastSeenDate, setLastSeenDate] = useState('');
  const [lastSeenTime, setLastSeenTime] = useState('');
  const [locationName, setLocationName] = useState(''); 
  const [coords, setCoords] = useState(null); 
  const [temperament, setTemperament] = useState('Friendly');

  // D. Security & Contact
  const [microchipStatus, setMicrochipStatus] = useState('Unknown');
  const [contactPhone, setContactPhone] = useState('');
  const [hideContact, setHideContact] = useState(false);

  // --- PET DETAIL MODAL STATE ---
  const [selectedPet, setSelectedPet] = useState(null);


  useEffect(() => {
    fetchLostPets();
  }, []);

  // Set default name for found pets
  useEffect(() => {
      if (reportType === 'found' && petName === '') {
          setPetName('Unknown');
      } else if (reportType === 'lost' && petName === 'Unknown') {
          setPetName('');
      }
  }, [reportType]);

  const fetchLostPets = async () => {
    try {
        const { data, error } = await supabase
            .from('lost_pets')
            .select('*')
            .neq('status', 'reunited') // Hide reunited
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        setLostPets(data || []);
    } catch (err) {
        console.error("Error fetching lost pets:", err);
    }
  };

  const handleImageChange = (e) => {
    if (e.target.files) {
        const newImages = Array.from(e.target.files).map(file => ({
            file,
            preview: URL.createObjectURL(file)
        }));
        setImages(prev => [...prev, ...newImages].slice(0, 3)); // Max 3
    }
  };

  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const uploadImages = async () => {
      const urls = [];
      for (const img of images) {
          const fileExt = img.file.name.split('.').pop();
          const fileName = `${Math.random()}.${fileExt}`;
          const filePath = `${fileName}`;
          
          const { error } = await supabase.storage.from('lost-pets').upload(filePath, img.file);
          if (error) {
              console.error("Upload error", error);
              continue;
          }
          
          const { data: { publicUrl } } = supabase.storage.from('lost-pets').getPublicUrl(filePath);
          urls.push(publicUrl);
      }
      return urls;
  };

  const generateFlyer = (petData, imageUrl) => {
      try {
          const doc = new jsPDF();
          
          // Header
          doc.setFillColor(220, 38, 38); // Red
          doc.rect(0, 0, 210, 40, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(40);
          doc.setFont("helvetica", "bold");
          doc.text("MISSING PET", 105, 25, null, null, "center");

          // Photo
          if (imageUrl) {
               // Note: Adding user images to PDF often requires them to be base64 or CORS enabled
               // For this demo, we'll draw a placeholder rect if image fails or just text
               doc.addImage(imageUrl, 'JPEG', 35, 50, 140, 100); 
          }

          // Details
          doc.setTextColor(0, 0, 0);
          doc.setFontSize(24);
          doc.text(petData.pet_name, 105, 165, null, null, "center");
          
          doc.setFontSize(14);
          doc.setFont("helvetica", "normal");
          doc.text(`Breed: ${petData.breed || 'Unknown'}`, 20, 180);
          doc.text(`Color: ${petData.primary_color}`, 110, 180);
          
          doc.text(`Last Seen: ${petData.last_seen_location}`, 20, 195);
          doc.text(`Date: ${petData.last_seen_date}`, 110, 195);

          // Contact
          doc.setFontSize(20);
          doc.setTextColor(220, 38, 38);
          doc.setFont("helvetica", "bold");
          doc.text(`CALL: ${petData.contact_phone}`, 105, 220, null, null, "center");

          doc.save(`${petData.pet_name}_Flyer.pdf`);
      } catch(e) {
          console.error("Flyer generation failed", e);
          alert("Could not auto-generate flyer. Please check console.");
      }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!session || !session.user) {
        setMsg({ type: 'error', text: 'You must be logged in.' });
        return;
    }

    if (!coords && !locationName) {
        setMsg({ type: 'error', text: 'Please provide a location.' });
        return;
    }

    setLoading(true);
    setMsg(null);

    try {
        const imageUrls = await uploadImages();
        const mainImage = imageUrls[0] || null;

        const payload = {
            owner_id: session.user.id,
            report_type: reportType,
            pet_name: petName,
            species,
            breed,
            gender,
            size,
            primary_color: primaryColor,
            secondary_color: secondaryColor,
            coat_type: coatType,
            distinctive_features: distinctiveFeatures,
            description: distinctiveFeatures || 'No description provided', // Fallback for legacy column
            image_url: mainImage,
            additional_images: imageUrls,
            last_seen_date: lastSeenDate,
            last_seen_time: lastSeenTime,
            last_seen_location: locationName,
            latitude: coords ? coords.lat : null,
            longitude: coords ? coords.lng : null,
            temperament,
            microchip_status: microchipStatus,
            contact_phone: contactPhone,
            hide_contact: hideContact,
            status: reportType // 'lost' or 'found'
        };

        const { data, error } = await supabase.from('lost_pets').insert([payload]).select();

        if (error) throw error;

        // Offer Flyer via Modal instead of native prompt
        setSuccessPayload(payload);
        setSuccessImage(mainImage);
        setShowSuccessModal(true);

        // Form Reset happens when modal closes now

    } catch (err) {
      console.error(err);
      setMsg({ type: 'error', text: 'Structure Update Required: Please run the new SQL migration script.' });
    } finally {
      setLoading(false);
    }
  };

  const markReunited = async (id) => {
      // Direct update, no confirm here because modal confirms intent
      const { error } = await supabase.from('lost_pets').update({ status: 'reunited' }).eq('id', id);
      if (error) console.error(error);
      else fetchLostPets();
  };

  const openPetDetail = (pet) => {
      setSelectedPet(pet);
  };

  const closePetDetail = () => {
      setSelectedPet(null);
  };

  const handleMarkReunitedFromModal = async (e) => {
      e.stopPropagation();
      if (selectedPet) {
          if(window.confirm("Is this pet safely home? This will remove it from the active list.")) {
             await markReunited(selectedPet.id);
             closePetDetail();
          }
      }
  };

  // --- SUCCESS MODAL STATE (Restored) ---
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successPayload, setSuccessPayload] = useState(null);
  const [successImage, setSuccessImage] = useState(null);

  const handleSuccessModalClose = (shouldGenerate) => {
      if (shouldGenerate && successPayload) {
          generateFlyer(successPayload, successImage);
      }
      
      setShowSuccessModal(false);
      setSuccessPayload(null);
      setSuccessImage(null);
      
      // Navigate / Reset
      setActiveTab('alerts');
      fetchLostPets();
      window.scrollTo(0,0);
  };

  // --- STYLES ---
  const glassCardStyle = {
    background: 'rgba(255, 255, 255, 0.85)',
    backdropFilter: 'blur(12px)',
    borderRadius: '1.5rem',
    border: '1px solid rgba(255, 255, 255, 0.6)',
    boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.05)',
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 pt-24 pb-12 px-4 relative">
      
      {/* PET DETAIL MODAL */}
      {selectedPet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300 overflow-y-auto">
            <div className="bg-white rounded-3xl overflow-hidden max-w-4xl w-full shadow-2xl relative my-8" onClick={(e) => e.stopPropagation()}>
                <button onClick={closePetDetail} className="absolute top-4 right-4 z-10 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full backdrop-blur-lg transition-colors">
                    <X size={20} />
                </button>
                
                <div className="flex flex-col md:flex-row h-full">
                    {/* Left: Images */}
                    <div className="md:w-1/2 bg-slate-100 relative min-h-[300px] md:min-h-full">
                        <img 
                            src={selectedPet.image_url} 
                            alt={selectedPet.pet_name} 
                            className="w-full h-full object-cover"
                        />
                         <div className="absolute top-4 left-4 flex gap-2">
                            <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider shadow-lg ${selectedPet.report_type === 'lost' ? 'bg-red-600 text-white' : 'bg-green-500 text-white'}`}>
                                {selectedPet.report_type}
                            </span>
                        </div>
                    </div>

                    {/* Right: Info */}
                    <div className="md:w-1/2 p-8 overflow-y-auto max-h-[80vh]">
                        <div className="mb-6">
                            <h2 className="text-4xl font-black text-slate-800 mb-2">{selectedPet.pet_name}</h2>
                            <p className="text-lg font-bold text-slate-500">{selectedPet.breed} • {selectedPet.gender} • {selectedPet.age || 'Unknown Age'}</p>
                            <div className="flex flex-wrap gap-2 mt-3">
                                <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wide">Color: {selectedPet.primary_color}</span>
                                <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wide">Size: {selectedPet.size}</span>
                                <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wide">{selectedPet.coat_type} Coat</span>
                            </div>
                        </div>

                        <div className="space-y-6">
                            {/* Location */}
                            <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                                <h3 className="text-xs font-black text-red-500 uppercase tracking-widest mb-2 flex items-center gap-1">
                                    <MapPin size={14} /> Last Seen
                                </h3>
                                <p className="font-bold text-slate-800 text-lg mb-1">{selectedPet.last_seen_location}</p>
                                <div className="flex gap-4 text-sm text-slate-500">
                                    <span className="flex items-center gap-1"><Calendar size={14} /> {new Date(selectedPet.last_seen_date).toLocaleDateString()}</span>
                                    <span className="flex items-center gap-1"><Clock size={14} /> {selectedPet.last_seen_time || 'Time Unknown'}</span>
                                </div>
                            </div>

                            {/* Details */}
                            <div>
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Details</h3>
                                <div className="space-y-2">
                                    <p className="text-sm font-bold text-slate-700">Distinctive Features</p>
                                    <p className="text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
                                        {selectedPet.distinctive_features || selectedPet.description || "No specific details provided."}
                                    </p>
                                </div>
                                {selectedPet.temperament && (
                                     <div className="mt-3">
                                        <p className="text-sm font-bold text-slate-700">Temperament</p>
                                        <p className="text-slate-600">{selectedPet.temperament}</p>
                                     </div>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="pt-6 border-t border-slate-100 flex flex-col gap-3">
                                {!selectedPet.hide_contact && (
                                    <a href={`tel:${selectedPet.contact_phone}`} className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors shadow-lg hover:shadow-xl hover:-translate-y-1 transform transition-all">
                                        <Phone size={20} /> Call Owner
                                    </a>
                                )}
                                
                                <div className="flex gap-3">
                                    <button 
                                        onClick={() => generateFlyer(selectedPet, selectedPet.image_url)}
                                        className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Download size={18} /> Download Poster
                                    </button>
                                     <button 
                                        className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Share2 size={18} /> Share
                                    </button>
                                </div>

                                {/* OWNER ACTIONS */}
                                {session?.user?.id === selectedPet.owner_id && (
                                    <div className="mt-4 pt-4 border-t border-dashed border-slate-200">
                                        <p className="text-xs font-bold text-slate-400 uppercase text-center mb-3">Owner Actions</p>
                                        <button 
                                            onClick={handleMarkReunitedFromModal}
                                            className="w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-green-200 transition-all hover:-translate-y-1"
                                        >
                                            <CheckCircle size={20} /> Mark as Reunited
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* SUCCESS MODAL OVERLAY */}
      {showSuccessModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
              <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl transform scale-100 transition-all text-center">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 text-green-600 shadow-sm">
                      <CheckCircle size={40} />
                  </div>
                  <h2 className="text-3xl font-black text-slate-800 mb-2">Report Broadcasted!</h2>
                  <p className="text-slate-500 mb-8 text-lg">
                      Your alert has been sent to all nearby users, rescuers, and vet clinics.
                  </p>
                  
                  <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 mb-8">
                      <h3 className="font-bold text-blue-900 mb-2 flex items-center justify-center gap-2">
                          <FileText size={20} /> Generate Missing Poster?
                      </h3>
                      <p className="text-blue-700/80 text-sm mb-0">
                          We can instantly create a printable PDF flyer for you to share physically.
                      </p>
                  </div>

                  <div className="flex flex-col gap-3">
                      <button 
                          onClick={() => handleSuccessModalClose(true)}
                          className="w-full py-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-lg shadow-xl shadow-blue-200 hover:-translate-y-1 transition-transform flex items-center justify-center gap-2"
                      >
                          <Download size={20} /> Yes, Generate Flyer
                      </button>
                      <button 
                          onClick={() => handleSuccessModalClose(false)}
                          className="w-full py-4 rounded-xl text-slate-500 font-bold hover:bg-slate-50 transition-colors"
                      >
                          No, Skip for Now
                      </button>
                  </div>
              </div>
          </div>
      )}

      <div className="container mx-auto max-w-5xl">
          
        {/* Header */}
        <div className="text-center mb-10">
            <h1 className="text-4xl md:text-5xl font-black mb-4 bg-clip-text text-transparent bg-gradient-to-r from-red-600 to-orange-600">
                Lost & Found Network
            </h1>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                Rapid response network for missing pets. Report immediately to broadcast alerts to neighbors, rescuers, and local shelters.
            </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex justify-center mb-10">
            <div className="bg-white p-1.5 rounded-full shadow-md inline-flex border border-slate-100">
                <button 
                    onClick={() => setActiveTab('alerts')}
                    className={`px-8 py-3 rounded-full font-bold transition-all text-sm flex items-center gap-2 ${activeTab === 'alerts' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}
                >
                    <AlertTriangle size={18} /> Active Feed
                </button>
                <button 
                    onClick={() => setActiveTab('report')}
                    className={`px-8 py-3 rounded-full font-bold transition-all text-sm flex items-center gap-2 ${activeTab === 'report' ? 'bg-red-600 text-white shadow-lg shadow-red-200' : 'text-slate-500 hover:text-red-600 hover:bg-red-50'}`}
                >
                    <FileText size={18} /> File a Report
                </button>
            </div>
        </div>

        {activeTab === 'alerts' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {lostPets.length === 0 && (
                    <div className="col-span-full py-20 text-center text-slate-400">
                        <CheckCircle size={64} className="mx-auto mb-4 text-green-500 opacity-50" />
                        <h3 className="text-2xl font-bold text-slate-600">All Quiet</h3>
                        <p>No active lost pet reports in your area.</p>
                    </div>
                )}
                {lostPets.map(pet => (
                    <div 
                        key={pet.id} 
                        style={glassCardStyle} 
                        className="group overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer"
                        onClick={() => openPetDetail(pet)}
                    >
                        <div className="relative h-64 bg-slate-200">
                            {pet.image_url ? (
                                <img src={pet.image_url} alt={pet.pet_name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-400">
                                    <PawPrint size={48} />
                                </div>
                            )}
                            <div className="absolute top-4 left-4 flex gap-2">
                                <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider shadow-lg ${pet.report_type === 'lost' ? 'bg-red-600 text-white' : 'bg-green-500 text-white'}`}>
                                    {pet.report_type}
                                </span>
                            </div>
                        </div>
                        <div className="p-6">
                            <h3 className="text-2xl font-bold text-slate-800 mb-1">{pet.pet_name}</h3>
                            <p className="text-sm font-medium text-slate-500 mb-4">{pet.breed} • {pet.gender} • {pet.size}</p>
                            
                            <div className="space-y-3 mb-6">
                                <div className="flex items-start gap-3">
                                    <MapPin size={18} className="text-red-500 mt-0.5 shrink-0" />
                                    <div>
                                        <p className="text-sm font-bold text-slate-700">Last Seen</p>
                                        <p className="text-sm text-slate-500 line-clamp-1">{pet.last_seen_location}</p>
                                        <p className="text-xs text-slate-400 mt-0.5">{new Date(pet.last_seen_date).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <Eye size={18} className="text-blue-500 mt-0.5 shrink-0" />
                                    <div>
                                        <p className="text-sm font-bold text-slate-700">Distinguishing Features</p>
                                        <p className="text-sm text-slate-500 line-clamp-2">{pet.distinctive_features || pet.description || "Click for details"}</p>
                                    </div>
                                </div>
                            </div>

                            <button className="w-full py-3 rounded-xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition-colors flex items-center justify-center gap-2 group-hover:bg-slate-900 group-hover:text-white">
                                View Details
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        ) : (
            <div className="max-w-3xl mx-auto">
                <form onSubmit={handleSubmit} className="space-y-8">
                    
                    {/* A. CORE IDENTITY */}
                    <Section title="A. Core Identity">
                        <div className="flex justify-center mb-6">
                            <div className="bg-slate-100 p-1 rounded-lg flex items-center">
                                <button type="button" onClick={() => setReportType('lost')} className={`px-6 py-2 rounded-md font-bold text-sm transition-all ${reportType === 'lost' ? 'bg-red-500 text-white shadow-md' : 'text-slate-500'}`}>I Lost a Pet</button>
                                <button type="button" onClick={() => setReportType('found')} className={`px-6 py-2 rounded-md font-bold text-sm transition-all ${reportType === 'found' ? 'bg-green-500 text-white shadow-md' : 'text-slate-500'}`}>I Found a Pet</button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <InputGroup label="Pet Name" info={reportType === 'found' ? 'Default: Unknown' : ''}>
                                <input className="input-field" value={petName} onChange={e => setPetName(e.target.value)} required placeholder="Pet's Name" />
                            </InputGroup>
                            
                            <InputGroup label="Species">
                                <select className="input-field" value={species} onChange={e => setSpecies(e.target.value)}>
                                    <option>Dog</option>
                                    <option>Cat</option>
                                    <option>Bird</option>
                                    <option>Rabbit</option>
                                    <option>Reptile</option>
                                    <option>Other</option>
                                </select>
                            </InputGroup>

                            <InputGroup label="Primary Breed">
                                <input className="input-field" value={breed} onChange={e => setBreed(e.target.value)} placeholder="e.g. Golden Retriever" list="breeds" />
                                <datalist id="breeds">
                                    <option value="Labrador" />
                                    <option value="German Shepherd" />
                                    <option value="Persian Cat" />
                                    <option value="Siamese" />
                                    {/* Add more common breeds */}
                                </datalist>
                            </InputGroup>

                            <div className="grid grid-cols-2 gap-4">
                                <InputGroup label="Gender">
                                    <select className="input-field" value={gender} onChange={e => setGender(e.target.value)}>
                                        <option>Male</option>
                                        <option>Female</option>
                                        <option>Unknown</option>
                                    </select>
                                </InputGroup>
                                <InputGroup label="Size">
                                    <select className="input-field" value={size} onChange={e => setSize(e.target.value)}>
                                        <option>Small (0-20lbs)</option>
                                        <option>Medium (21-50lbs)</option>
                                        <option>Large (51+lbs)</option>
                                    </select>
                                </InputGroup>
                            </div>
                        </div>
                    </Section>

                    {/* B. VISUAL DETAILS */}
                    <Section title="B. Visual Details">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            <InputGroup label="Colors">
                                <div className="grid grid-cols-2 gap-2">
                                    <input className="input-field" placeholder="Primary (e.g. Black)" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} required />
                                    <input className="input-field" placeholder="Secondary (e.g. White)" value={secondaryColor} onChange={e => setSecondaryColor(e.target.value)} />
                                </div>
                            </InputGroup>
                            <InputGroup label="Coat Type">
                                <select className="input-field" value={coatType} onChange={e => setCoatType(e.target.value)}>
                                    <option value="">Select Coat...</option>
                                    <option>Short / Smooth</option>
                                    <option>Long / Fluffy</option>
                                    <option>Wire-haired</option>
                                    <option>Curly</option>
                                    <option>Hairless</option>
                                </select>
                            </InputGroup>
                            <div className="md:col-span-2">
                                <InputGroup label="Distinctive Features" info="E.g. One white paw, crooked tail, red collar">
                                    <textarea className="input-field h-24 resize-none" value={distinctiveFeatures} onChange={e => setDistinctiveFeatures(e.target.value)} placeholder="Describe any unique markings, collars, or accessories..."></textarea>
                                </InputGroup>
                            </div>
                        </div>
                        
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Photos (Max 3)</label>
                            <div className="grid grid-cols-4 gap-4">
                                {images.map((img, idx) => (
                                    <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200">
                                        <img src={img.preview} className="w-full h-full object-cover" />
                                        <button type="button" onClick={() => removeImage(idx)} className="absolute top-1 right-1 bg-white p-1 rounded-full text-red-500"><X size={12} /></button>
                                    </div>
                                ))}
                                {images.length < 3 && (
                                    <div 
                                        onClick={() => fileInputRef.current.click()}
                                        className="aspect-square rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 hover:border-red-400 transition-colors"
                                    >
                                        <Camera className="text-slate-400 mb-2" />
                                        <span className="text-xs font-bold text-slate-400">Add Photo</span>
                                    </div>
                                )}
                            </div>
                            <input ref={fileInputRef} type="file" multiple accept="image/*" className="hidden" onChange={handleImageChange} />
                        </div>
                    </Section>

                    {/* C. THE INCIDENT */}
                    <Section title="C. The Incident">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            <InputGroup label="Date Lost/Found">
                                <input type="date" className="input-field" value={lastSeenDate} onChange={e => setLastSeenDate(e.target.value)} required />
                            </InputGroup>
                            <InputGroup label="Time">
                                <input type="time" className="input-field" value={lastSeenTime} onChange={e => setLastSeenTime(e.target.value)} />
                            </InputGroup>
                        </div>
                        
                        <div className="mb-6">
                            <InputGroup label="Location" info="Drop a pin on the map where last seen">
                                <div className="h-56 rounded-2xl overflow-hidden border-2 border-white shadow-sm mb-3">
                                    <MapPicker onLocationSelect={(loc) => setCoords(loc)} />
                                </div>
                                <input className="input-field" placeholder="Cross streets, landmark, or address..." value={locationName} onChange={e => setLocationName(e.target.value)} required />
                            </InputGroup>
                        </div>

                        <InputGroup label="Temperament" info="Helps rescuers approach safely">
                            <div className="flex gap-2">
                                {['Friendly', 'Scared/Skittish', 'Aggressive/Do Not Approach'].map(t => (
                                    <button 
                                        key={t} 
                                        type="button" 
                                        onClick={() => setTemperament(t)}
                                        className={`flex-1 py-3 rounded-lg text-xs font-bold border transition-colors ${temperament === t ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200'}`}
                                    >
                                        {t}
                                    </button>
                                ))}
                            </div>
                        </InputGroup>
                    </Section>

                    {/* D. SECURITY & CONTACT */}
                    <Section title="D. Security & Contact">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            <InputGroup label="Microchip Status">
                                <select className="input-field" value={microchipStatus} onChange={e => setMicrochipStatus(e.target.value)}>
                                    <option>Yes</option>
                                    <option>No</option>
                                    <option>Unknown</option>
                                </select>
                            </InputGroup>
                            <InputGroup label="Contact Phone">
                                <input type="tel" className="input-field" value={contactPhone} onChange={e => setContactPhone(e.target.value)} required placeholder="(555) 123-4567" />
                            </InputGroup>
                        </div>
                        
                        <div className="flex items-center gap-3 p-4 bg-yellow-50 rounded-xl border border-yellow-100 text-yellow-800">
                            {hideContact ? <Lock size={20} /> : <Unlock size={20} />}
                            <div className="flex-1">
                                <p className="font-bold text-sm">Privacy Selection</p>
                                <p className="text-xs opacity-80">Hide phone number on public feed?</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" className="sr-only peer" checked={hideContact} onChange={e => setHideContact(e.target.checked)} />
                                <div className="w-11 h-6 bg-yellow-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-600"></div>
                            </label>
                        </div>
                    </Section>

                    {msg && (
                        <div className={`p-4 rounded-xl flex items-center gap-3 font-bold ${msg.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                            {msg.type === 'error' ? <AlertTriangle /> : <CheckCircle />}
                            {msg.text}
                        </div>
                    )}

                    <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full py-5 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 text-white font-black text-xl shadow-xl shadow-red-200 hover:shadow-2xl transform hover:-translate-y-1 transition-all flex items-center justify-center gap-3"
                    >
                        {loading ? 'Processing...' : (
                            <>
                                <Send size={24} />
                                Broadcast {reportType === 'lost' ? 'Lost Pet' : 'Found Pet'} Alert
                            </>
                        )}
                    </button>
                    <p className="text-center text-xs text-slate-400 mt-2">
                        Submitting triggers a notification to all users in the radius.
                    </p>

                </form>
            </div>
        )}
      </div>

      <style>{`
        .input-field {
            width: 100%;
            background: rgba(255, 255, 255, 0.7);
            border: 1px solid #e2e8f0;
            padding: 0.75rem 1rem;
            border-radius: 0.75rem;
            font-size: 0.95rem;
            outline: none;
            transition: all 0.2s;
            color: #1e293b;
        }
        .input-field:focus {
            background: white;
            border-color: #f43f5e;
            box-shadow: 0 0 0 3px rgba(244, 63, 94, 0.1);
        }
      `}</style>
    </div>
  );
}

// Helpers
const Section = ({ title, children }) => (
    <div className="bg-white/60 backdrop-blur-sm p-6 rounded-2xl border border-white/80 shadow-sm">
        <h3 className="text-lg font-black text-slate-800 mb-6 uppercase tracking-wide border-b border-slate-100 pb-2">{title}</h3>
        {children}
    </div>
);

const InputGroup = ({ label, info, children }) => (
    <div>
        <div className="flex justify-between items-end mb-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">{label}</label>
            {info && <span className="text-[10px] text-slate-400 font-medium">{info}</span>}
        </div>
        {children}
    </div>
);
