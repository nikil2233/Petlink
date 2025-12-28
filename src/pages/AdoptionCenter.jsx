import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Heart, Filter, PawPrint, Plus, MapPin, Search } from 'lucide-react';
import CreateAdoptionModal from '../components/CreateAdoptionModal';
import AdoptionDetailsModal from '../components/AdoptionDetailsModal';

export default function AdoptionCenter() {
  const [session, setSession] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [animals, setAnimals] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedAnimal, setSelectedAnimal] = useState(null); // If set, shows Details Modal

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
        .single();
      
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

  // Filter Logic
  const filteredAnimals = animals.filter(a => {
    if (showWishlistOnly && !wishlist.has(a.id)) return false;
    if (filterType !== 'all' && a.species.toLowerCase() !== filterType) return false;
    if (searchTerm && !a.name.toLowerCase().includes(searchTerm.toLowerCase()) && !a.breed?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="page-container">
      {/* Top Bar */}
      <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
        <div>
          <h1 className="flex items-center gap-3">
             Adoption Center 
             {showWishlistOnly && (
                <span className="text-base bg-pink-100 text-pink-700 px-3 py-1 rounded-full border border-pink-200">
                    Wishlist
                </span>
             )}
          </h1>
          <p className="text-muted mt-2">Find your new best friend or list a pet in need.</p>
        </div>

        <div className="flex gap-4">
           {session && (
               <>
                 <button 
                    onClick={() => setShowWishlistOnly(!showWishlistOnly)}
                    className={`btn ${showWishlistOnly ? 'bg-pink-50 border-pink-200 text-pink-700' : 'bg-white border-border text-muted hover:bg-slate-50'}`}
                 >
                    <Heart size={18} fill={showWishlistOnly ? 'currentColor' : 'none'} /> Wishlist
                 </button>
                 {['rescuer', 'shelter', 'vet'].includes(userRole) && (
                   <button 
                      className="btn btn-primary"
                      onClick={() => setShowCreateModal(true)}
                   >
                      <Plus size={18} /> List a Pet
                   </button>
                 )}
               </>
           )}
        </div>
      </div>

      {/* Filters Bar */}
      <div className="glass-panel p-4 mb-8 flex flex-wrap gap-6 items-center">
          <div className="flex-1 min-w-[200px] flex items-center gap-3 relative">
              <Search size={18} className="text-muted absolute left-3" />
              <input 
                type="text" 
                placeholder="Search by name or breed..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="form-input pl-10 border-none bg-transparent shadow-none focus:ring-0"
              />
          </div>
          <div className="h-6 w-px bg-border hidden md:block"></div>
          <div className="flex gap-2 bg-subtle p-1 rounded-lg">
             {['all', 'dog', 'cat'].map(type => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-4 py-2 rounded-md transition-all text-sm font-semibold capitalize ${
                    filterType === type 
                        ? 'bg-white shadow text-primary' 
                        : 'text-muted hover:text-foreground'
                  }`}
                >
                  {type}
                </button>
             ))}
          </div>
      </div>

      {loading ? (
        <div className="text-center py-16">
            <p className="text-xl text-muted">Loading friends...</p>
        </div>
      ) : filteredAnimals.length === 0 ? (
        <div className="text-center py-16 opacity-70">
          <PawPrint size={64} className="mx-auto mb-4 text-muted" />
          <h3 className="text-xl font-semibold mb-2">No animals found</h3>
          <p className="text-muted">Try adjusting your search or filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {filteredAnimals.map(animal => (
            <div 
                key={animal.id} 
                className="glass-panel overflow-hidden flex flex-col cursor-pointer transition-transform hover:-translate-y-1 group relative"
                onClick={() => setSelectedAnimal(animal)}
            >
              <div className="h-64 relative bg-slate-700 overflow-hidden">
                 <img 
                   src={animal.image_url || `https://source.unsplash.com/400x300/?${animal.species}`} 
                   alt={animal.name}
                   className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                 />
                 <button 
                    onClick={(e) => toggleWishlist(e, animal.id)}
                    className={`absolute top-3 right-3 bg-white/80 hover:bg-white rounded-full w-8 h-8 flex items-center justify-center transition-colors shadow-sm ${wishlist.has(animal.id) ? 'text-red-500' : 'text-slate-500'}`}
                 >
                    <Heart size={18} fill={wishlist.has(animal.id) ? 'currentColor' : 'none'} />
                 </button>
                 <div className="absolute bottom-3 left-3 bg-black/60 text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 backdrop-blur-sm">
                    <MapPin size={12} /> {animal.location || 'Unknown'}
                 </div>
              </div>

              <div className="p-5 flex flex-col flex-1">
                  <div className="flex justify-between items-baseline mb-2">
                     <h3 className="text-xl font-bold m-0 text-foreground">{animal.name}</h3>
                    <span className="text-sm font-bold text-primary">
                      {animal.age_years > 0 ? `${animal.age_years} yrs ` : ''}
                      {animal.age_months > 0 ? `${animal.age_months} mos` : ''}
                      {(!animal.age_years && !animal.age_months) ? 'Age N/A' : ''}
                    </span>
                  </div>
                  <p className="text-muted text-sm mb-4">{animal.breed}</p>
                  
                  <div className="flex flex-wrap gap-2 mt-auto">
                      {animal.vaccinated && <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-semibold">Vaccinated</span>}
                      {animal.neutered && <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-semibold">Neutered</span>}
                      {animal.good_with_kids && <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-semibold">Kid Friendly</span>}
                  </div>
              </div>
            </div>
          ))}
        </div>
      )}

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
    </div>
  );
}
