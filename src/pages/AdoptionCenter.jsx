import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Heart, Filter, PawPrint, Plus, MapPin, Search, Shield, X, Lock, AlertCircle } from 'lucide-react';
import CreateAdoptionModal from '../components/CreateAdoptionModal';
import AdoptionDetailsModal from '../components/AdoptionDetailsModal';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

export default function AdoptionCenter() {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [animals, setAnimals] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedAnimal, setSelectedAnimal] = useState(null); // If set, shows Details Modal
  const [accessDeniedType, setAccessDeniedType] = useState(null); // 'login' or 'role'

  // Filters
  const [filterType, setFilterType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [wishlist, setWishlist] = useState(new Set());
  const [showWishlistOnly, setShowWishlistOnly] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchWishlist(session.user.id);
        fetchUserRole(session.user.id);
      }
    });
    fetchAnimals();
  }, []);

  const fetchUserRole = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .maybeSingle();
      
      if (error) throw error;
      if (data) setUserRole(data.role);
    } catch (error) {
      console.error('Error fetching user role:', error);
    }
  };

  const fetchWishlist = async (userId) => {
    const { data } = await supabase.from('wishlist').select('adoption_id').eq('user_id', userId);
    if (data) {
        setWishlist(new Set(data.map(w => w.adoption_id)));
    }
  };

  const fetchAnimals = async () => {
    // Failsafe
    const timeout = setTimeout(() => {
        console.warn("Fetch animals timed out");
        setLoading(false);
    }, 8000);

    try {
      console.log("Starting fetchAnimals...");
      setLoading(true);
      const { data, error } = await supabase
        .from('adoptions')
        .select('*')
        .eq('status', 'available') // Only show available pets
        .order('created_at', { ascending: false });
        
      if (error) {
          console.error("Supabase Error fetchAnimals:", error);
          throw error;
      }
      console.log("Fetched animals data:", data);
      setAnimals(data || []);
    } catch (error) {
      console.error('Error fetching animals:', error);
    } finally {
      clearTimeout(timeout);
      setLoading(false);
    }
  };

  const toggleWishlist = async (e, animalId) => {
    e.stopPropagation();
    if (!session) return alert("Login to save to wishlist");

    const newWishlist = new Set(wishlist);
    if (wishlist.has(animalId)) {
        // Remove
        newWishlist.delete(animalId);
        await supabase.from('wishlist').delete().match({ user_id: session.user.id, adoption_id: animalId });
    } else {
        // Add
        newWishlist.add(animalId);
        await supabase.from('wishlist').insert([{ user_id: session.user.id, adoption_id: animalId }]);
    }
    setWishlist(newWishlist);
  };

  const handleListPet = () => {
      if (!session) {
          setAccessDeniedType('login');
          return;
      }
      
      const allowedRoles = ['rescuer', 'shelter', 'vet', 'admin'];
      if (!allowedRoles.includes(userRole)) {
          setAccessDeniedType('role');
          return;
      }

      setShowCreateModal(true);
  };

  // Filter Logic
  const filteredAnimals = animals.filter(a => {
    if (showWishlistOnly && !wishlist.has(a.id)) return false;
    if (filterType !== 'all' && a.species.toLowerCase() !== filterType) return false;
    if (searchTerm && !a.name.toLowerCase().includes(searchTerm.toLowerCase()) && !a.breed?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="page-container" style={{ background: '#f8fafc', minHeight: '100vh', paddingTop: '7rem' }}>
      <div className="container mx-auto px-4">
        
        {/* Top Header - Hero Card */}
        <div className="relative w-full rounded-[40px] overflow-hidden shadow-sm border border-slate-100 bg-gradient-to-r from-gray-50 to-white flex items-center" style={{ minHeight: '450px' }}>
            
            {/* Background Image - Absolute Right */}
            <div className="absolute right-0 top-0 h-full w-[60%] pointer-events-none">
                <img 
                    src="https://images.unsplash.com/photo-1623387641168-d9803ddd3f35?ixlib=rb-1.2.1&auto=format&fit=crop&w=2000&q=80" 
                    alt="Golden Retriever Puppy and Ginger Kitten" 
                    className="w-full h-full object-cover object-center mix-blend-multiply opacity-90" 
                />
                <div className="absolute inset-0 bg-gradient-to-r from-gray-50 via-white/20 to-transparent"></div>
            </div>

            {/* Content Container - Grid System to prevent overlap */}
            <div className="container mx-auto px-6 lg:px-12 relative z-10 w-full h-full flex flex-col md:flex-row items-center">
                
                {/* Left Text Column */}
                <div className="w-full md:w-1/2 pt-10 md:pt-0">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-100/80 text-orange-700 text-xs font-bold mb-6 border border-orange-200">
                        <PawPrint size={12} /> #1 Pet Adoption Platform
                    </div>
                    <h1 className="text-5xl md:text-7xl font-[900] text-[#1a202c] leading-[1.1] tracking-tight mb-6">
                        Find Your New <br/>
                        Best Friend
                    </h1>
                    <p className="text-lg md:text-xl text-slate-500 font-medium max-w-md leading-relaxed mb-8">
                        Every pet deserves a second chance. <br/> Open your heart and home today.
                    </p>
                    <button 
                        onClick={handleListPet}
                        className="bg-slate-900 text-white px-8 py-4 rounded-full font-bold text-lg shadow-xl hover:shadow-2xl hover:scale-105 transition-all flex items-center gap-3 group">
                        Get Started 
                        <div className="bg-white/20 rounded-full p-1 group-hover:bg-white/30 transition-colors">
                            <Plus size={18}/>
                        </div>
                    </button>
                </div>


            </div>
        </div>

        {/* Search Bar - Stable Flex Layout with Explicit Styles */}
        <div className="max-w-3xl mx-auto mb-20 relative z-30 -mt-12">
            <div className="bg-white rounded-full shadow-2xl p-3 flex items-center border border-slate-100" style={{ boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)' }}>
                <div className="pl-6 md:pl-8 text-slate-400">
                    <Search size={28} strokeWidth={2.5} />
                </div>
                <input 
                    type="text"
                    placeholder="Search by name, breed, or location..."
                    className="flex-1 bg-transparent border-none outline-none text-xl text-slate-700 placeholder:text-slate-400 font-semibold px-6 py-4"
                    style={{ background: 'transparent', border: 'none', outline: 'none' }}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <button 
                    className="bg-[#FF9F1C] hover:bg-[#F9A826] text-white px-8 md:px-10 py-4 rounded-full font-bold text-lg shadow-lg transition-transform active:scale-95 flex items-center justify-center"
                >
                    Filter
                </button>
            </div>
        </div>

        {/* Category Circles - Fixed Layout */}
        <div className="flex flex-wrap justify-center gap-6 md:gap-14 mb-20 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <CategoryCircle 
                icon={<PawPrint size={24} />} // Slightly smaller icon inside big circle
                label="All" 
                active={filterType === 'all'} 
                onClick={() => setFilterType('all')} 
            />
            <CategoryCircle 
                icon={<span className="text-3xl">🐶</span>} 
                label="Dogs" 
                active={filterType === 'dog'} 
                onClick={() => setFilterType('dog')} 
            />
            <CategoryCircle 
                icon={<span className="text-3xl">🐱</span>} 
                label="Cats" 
                active={filterType === 'cat'} 
                onClick={() => setFilterType('cat')} 
            />
             {/* Wishlist */}
             <CategoryCircle 
                icon={<Heart size={24} className={showWishlistOnly ? "fill-current" : ""} />} 
                label="Wishlist" 
                active={showWishlistOnly} 
                onClick={() => setShowWishlistOnly(!showWishlistOnly)} 
                colorClass="text-pink-500"
            />
        </div>

        {/* List a Pet Button - Fixed Position */}
        <div className="flex justify-end mb-8 px-4">
                <button 
                className="btn btn-primary shadow-xl hover:scale-105"
                onClick={handleListPet}
            >
                <Plus size={20} /> List a Pet
            </button>
        </div>

        {/* Pet Cards Grid */}
        {loading ? (
             <div className="text-center py-20">
                <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-slate-500 font-medium">Loading tails...</p>
             </div>
        ) : filteredAnimals.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl shadow-sm border border-slate-100">
                <PawPrint size={64} className="mx-auto mb-4 text-slate-200" />
                <h3 className="text-2xl font-bold text-slate-800 mb-2">No pets found</h3>
                <p className="text-slate-500">Try adjusting your filters to find a furry friend.</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {filteredAnimals.map(animal => (
                    <PetCard 
                        key={animal.id} 
                        animal={animal} 
                        isWishlisted={wishlist.has(animal.id)}
                        onToggleWishlist={(e) => toggleWishlist(e, animal.id)}
                        onClick={() => setSelectedAnimal(animal)}
                    />
                ))}
            </div>
        )}
      </div>

      {/* Modals */}
      <CreateAdoptionModal 
        isOpen={showCreateModal} 
        onClose={() => setShowCreateModal(false)} 
        onCreated={() => { fetchAnimals(); setShowCreateModal(false); }}
        session={session}
      />

      <AdoptionDetailsModal 
        animal={selectedAnimal} 
        isOpen={!!selectedAnimal} 
        onClose={() => setSelectedAnimal(null)}
        session={session}
      />

      {/* Access Denied Modal */}
      <AnimatePresence>
        {accessDeniedType && (
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
                onClick={() => setAccessDeniedType(null)}
            >
                <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="bg-white rounded-[2rem] p-8 max-w-md w-full text-center shadow-2xl relative overflow-hidden"
                    onClick={e => e.stopPropagation()}
                >
                    <button 
                        onClick={() => setAccessDeniedType(null)}
                        className="absolute top-4 right-4 p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors"
                    >
                        <X size={20} className="text-slate-500" />
                    </button>

                    <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Lock size={36} className="text-orange-500" />
                    </div>

                    {accessDeniedType === 'login' ? (
                        <>
                            <h3 className="text-2xl font-black text-slate-800 mb-2">Partner Access Only</h3>
                            <p className="text-slate-500 mb-8 leading-relaxed">
                                Please log in as an authorized <strong>NGO, Shelter, or Rescuer</strong> to list a pet for adoption.
                            </p>
                            <button 
                                onClick={() => navigate('/auth')}
                                className="w-full bg-slate-900 text-white font-bold py-3.5 rounded-xl hover:bg-slate-800 transition-all shadow-lg"
                            >
                                Login Now
                            </button>
                        </>
                    ) : ( 
                        <>
                            <h3 className="text-2xl font-black text-slate-800 mb-2">Restricted Feature</h3>
                            <p className="text-slate-500 mb-8 leading-relaxed">
                                Listing pets is restricted to verified <strong>NGOs and Shelters</strong>. Citizens can browse and adopt, but cannot upload listings.
                            </p>
                            <button 
                                onClick={() => setAccessDeniedType(null)}
                                className="w-full bg-orange-500 text-white font-bold py-3.5 rounded-xl hover:bg-orange-600 transition-all shadow-lg shadow-orange-200"
                            >
                                Understood
                            </button>
                        </>
                    )}
                </motion.div>
            </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

// Subcomponents for cleaner code
function CategoryCircle({ icon, label, active, onClick, colorClass = "text-slate-700" }) {
    return (
        <button 
            onClick={onClick}
            className={`flex flex-col items-center gap-2 group transition-all duration-300 ${active ? '-translate-y-1' : 'hover:-translate-y-1'}`}
        >
            <div className={`w-16 h-16 rounded-full flex items-center justify-center shadow-md transition-all duration-300 border-2 ${active ? 'bg-orange-50 border-orange-500 text-orange-600' : 'bg-white border-slate-100 group-hover:border-orange-200 text-slate-400'}`}>
                <div className={active ? 'text-orange-600' : ''}>
                    {icon}
                </div>
            </div>
            {/* Label excluded in new design or kept small? Image had it. Keeping it small/bold. */}
        </button>
    )
}

function PetCard({ animal, isWishlisted, onToggleWishlist, onClick }) {
    return (
        <div 
            onClick={onClick}
            className="bg-white rounded-[2rem] p-3 shadow-sm hover:shadow-2xl transition-all duration-300 cursor-pointer group hover:-translate-y-2 border border-slate-100"
        >
            {/* Image Container */}
            <div className="relative h-64 rounded-[1.5rem] overflow-hidden mb-4 bg-slate-100">
                <img 
                    src={animal.image_url || `https://source.unsplash.com/400x300/?${animal.species}`} 
                    alt={animal.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                
                {/* Wishlist Heart */}
                <button 
                    onClick={onToggleWishlist}
                    className="absolute top-4 right-4 bg-white/30 backdrop-blur-md p-2.5 rounded-full hover:bg-white transition-all shadow-sm"
                >
                    <Heart 
                        size={20} 
                        className={`transition-colors ${isWishlisted ? 'fill-rose-500 text-rose-500' : 'text-white hover:text-rose-500'}`} 
                    />
                </button>

                {/* New Badge (Logic: Created in last 7 days) */}
                <div className="absolute top-4 left-4 bg-green-500 text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider shadow-sm">
                    New
                </div>
            </div>

            {/* Content */}
            <div className="px-2 pb-2">
                <div className="flex justify-between items-start mb-1">
                    <h3 className="text-2xl font-bold text-slate-800">{animal.name}</h3>
                    <div className="flex gap-2">
                        {/* Gender Pill */}
                        <span className={`w-6 h-6 flex items-center justify-center rounded-full text-[10px] font-bold text-white ${animal.gender === 'Male' ? 'bg-blue-400' : 'bg-pink-400'}`}>
                            {animal.gender === 'Male' ? 'M' : 'F'}
                        </span>
                    </div>
                </div>
                
                <p className="text-slate-500 font-medium mb-4">{animal.breed}</p>

                <div className="flex items-center justify-between mt-auto">
                    <div className="text-slate-400 text-sm font-semibold flex items-center gap-1">
                        <MapPin size={14} /> {animal.location || 'Colombo'}
                    </div>

                    <span className="bg-orange-100 text-orange-600 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
                        {animal.species}
                    </span>
                </div>
            </div>
        </div>
    )
}
