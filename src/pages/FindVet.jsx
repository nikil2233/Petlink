import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useTheme } from '../context/ThemeContext';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Navigation, MapPin, Phone, Star, Heart, Clock, Stethoscope, Mail, X, Search, Filter, List } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default Leaflet icon
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Custom User Icon
const userIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const COLOMBO_CENTER = [6.9271, 79.8612];

// Component to handle auto-fitting map bounds
function MapBoundsHandler({ userLocation, vets }) {
  const map = useMap();

  useEffect(() => {
    if (vets.length > 0) {
      const bounds = L.latLngBounds();
      
      // Add user location to bounds if available
      if (userLocation) {
        bounds.extend([userLocation.lat, userLocation.lng]);
      }

      // Add all vet locations to bounds
      vets.forEach(vet => {
        if (vet.lat && vet.lng) {
          bounds.extend([vet.lat, vet.lng]);
        }
      });

      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    } else if (userLocation) {
        map.setView([userLocation.lat, userLocation.lng], 13);
    }
  }, [userLocation, vets, map]);

  return null;
}

export default function FindVet() {
  const { theme } = useTheme();
  const [userLocation, setUserLocation] = useState(null);
  const [vets, setVets] = useState([]);
  const [filteredVets, setFilteredVets] = useState([]);
  const [selectedVet, setSelectedVet] = useState(null);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [activeTab, setActiveTab] = useState('nearest'); // 'nearest' or 'all'
  const [mobileView, setMobileView] = useState('list'); // 'list' | 'map'

  // Haversine formula to calculate distance
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; 
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const deg2rad = (deg) => deg * (Math.PI / 180);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
          setLoadingLocation(false);
        },
        (error) => {
          console.error("Error getting location: ", error);
          setLoadingLocation(false);
        }
      );
    } else {
      setLoadingLocation(false);
    }
  }, []);

  useEffect(() => {
    fetchVets();
  }, [userLocation]);

  useEffect(() => {
      // Filter logic
      let result = vets;

      // 1. Filter by Tab
      if (activeTab === 'nearest') {
          result = result.filter(v => parseFloat(v.distance) <= 5.0);
      }

      // 2. Filter by Search Query
      if (searchQuery) {
          const lowerQ = searchQuery.toLowerCase();
          result = result.filter(v => 
              v.name.toLowerCase().includes(lowerQ) || 
              v.address.toLowerCase().includes(lowerQ)
          );
      }

      setFilteredVets(result);
  }, [searchQuery, vets, activeTab]);

  // Fix for Leaflet map not rendering correctly when toggled from hidden state
  useEffect(() => {
    if (mobileView === 'map') {
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 200);
    }
  }, [mobileView]);

  const fetchVets = async () => {
      try {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('role', 'vet');

          if (error) throw error;
          
          let fetchedVets = data.map((v, index) => {
              // Deterministic Mock Coordinates
              const mockLat = COLOMBO_CENTER[0] + (Math.sin(index) * 0.05); 
              const mockLng = COLOMBO_CENTER[1] + (Math.cos(index) * 0.05);

              return {
                id: v.id,
                name: v.full_name || 'Veterinary Clinic',
                avatar_url: v.avatar_url,
                lat: v.latitude || mockLat,
                lng: v.longitude || mockLng,
                address: v.address || v.location || 'Colombo, Sri Lanka',
                phone: v.phone || '+94 11 234 5678',
                email: v.email || 'clinic@example.com',
                rating: (4 + (index % 10) * 0.1).toFixed(1),
                services: ['Vaccination', 'Sterilization', 'General Checkup', 'Emergency Care'],
                hours: 'Mon-Sat: 9:00 AM - 8:00 PM',
                description: (v.about || v.goal) ? `${v.about || ''} ${v.goal ? '\n\nGoal: ' + v.goal : ''}` : 'Providing compassionate care for your furry family members with multiple specialties and 24/7 support.'
              };
          });

          const baseLocation = userLocation || { lat: COLOMBO_CENTER[0], lng: COLOMBO_CENTER[1] };
    
          const sortedVets = fetchedVets.map(vet => ({
            ...vet,
            distance: calculateDistance(baseLocation.lat, baseLocation.lng, vet.lat, vet.lng).toFixed(1)
          }))
          .sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));

          setVets(sortedVets);
          // Initial filter happens in useEffect depending on default tab
      } catch (err) {
          console.error("Error fetching vets:", err);
      }
  };

  return (
    <div className="h-screen pt-20 flex flex-col bg-slate-50 dark:bg-slate-900 overflow-hidden transition-colors duration-300">
      
      {/* HEADER WITH SEARCH */}
      <div className="px-4 md:px-8 py-6 flex-shrink-0 bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 shadow-sm z-20">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                  <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">Find a <span className="text-emerald-500">Vet</span></h1>
                  <p className="text-slate-500 dark:text-slate-400 font-medium">Locate trusted professionals near you.</p>
              </div>
              
              <div className="relative w-full md:w-96">
                  <input 
                    type="text" 
                    placeholder="Search clinics or locations..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-slate-100 dark:bg-slate-700 border-none rounded-2xl font-medium text-slate-700 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  />
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              </div>
          </div>
      </div>

      <div className="flex-1 flex overflow-hidden relative">
          
          {/* SIDEBAR LIST */}
          <div className={`${mobileView === 'list' ? 'block' : 'hidden'} md:block w-full md:w-[450px] h-full flex flex-col bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-10 relative`}>
              
              {/* List Content */}
              <div className="flex-1 flex flex-col overflow-hidden min-h-0">
                  
                  {/* TABS */}
                  <div className="px-4 pt-4 pb-2 flex gap-2">
                    <button 
                        onClick={() => setActiveTab('nearest')}
                        className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'nearest' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200 dark:shadow-emerald-900/20' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'}`}
                    >
                        Nearest (5km)
                    </button>
                    <button 
                        onClick={() => setActiveTab('all')}
                        className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'all' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200 dark:shadow-emerald-900/20' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'}`}
                    >
                        All Clinics
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 pb-24 md:pb-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-200 min-h-0">
                  {loadingLocation && (
                      <div className="p-4 bg-emerald-50 text-emerald-700 rounded-xl text-center text-sm font-bold animate-pulse flex items-center justify-center gap-2">
                          <MapPin size={16} className="animate-bounce" /> Triangulating your location...
                      </div>
                  )}

                  {filteredVets.length === 0 && !loadingLocation ? (
                      <div className="text-center py-12 text-slate-400 font-medium">
                          <p>No vets found {activeTab === 'nearest' ? 'within 5km' : 'matching your search'}.</p>
                      </div>
                  ) : (
                      filteredVets.map((vet, index) => (
                          <motion.div 
                              key={vet.id}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.05 }}
                              className={`p-5 rounded-[1.5rem] border transition-all cursor-pointer group relative overflow-hidden ${selectedVet?.id === vet.id ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-500 shadow-md ring-1 ring-emerald-500' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:shadow-lg'}`}
                              onClick={() => setSelectedVet(vet)}
                          >
                              {selectedVet?.id === vet.id && (
                                  <div className="absolute top-0 right-0 p-2 bg-emerald-500 rounded-bl-xl text-white">
                                      <Star size={12} fill="currentColor" />
                                  </div>
                              )}

                              <div className="flex justify-between items-start mb-3">
                                  <div className="flex items-center gap-3">
                                      {/* Small Avatar in List Item */}
                                      <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 shrink-0">
                                        {vet.avatar_url ? (
                                            <img src={vet.avatar_url} alt={vet.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <Stethoscope className="w-full h-full p-2.5 text-slate-400" />
                                        )}
                                      </div>
                                      <div>
                                        <h3 className="text-lg font-black text-slate-800 dark:text-white leading-tight group-hover:text-emerald-600 transition-colors">{vet.name}</h3>
                                        <div className="flex items-center gap-1 text-xs font-bold text-amber-500 mt-1">
                                            <Star size={12} fill="currentColor" /> {vet.rating}
                                            <span className="text-slate-300 mx-1">•</span>
                                            <span className="text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">{vet.distance} km</span>
                                        </div>
                                      </div>
                                  </div>
                              </div>
                              
                              <div className="flex items-start gap-2 text-slate-500 dark:text-slate-400 text-sm mb-4 pl-[3.75rem]">
                                  <MapPin size={16} className="shrink-0 mt-0.5 text-slate-400 group-hover:text-emerald-500 transition-colors" />
                                  <span className="line-clamp-2 leading-relaxed">{vet.address}</span>
                              </div>

                              <div className="flex items-center gap-2 mt-auto pl-[3.75rem]">
                                  <button 
                                      onClick={(e) => { e.stopPropagation(); setSelectedVet(vet); }}
                                      className={`flex-1 px-4 py-2.5 rounded-xl font-bold text-sm transition-colors ${selectedVet?.id === vet.id ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200 dark:shadow-emerald-900/20' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'}`}
                                  >
                                      View Profile
                                  </button>
                                  <a 
                                      href={`https://www.google.com/maps/dir/?api=1&destination=${vet.lat},${vet.lng}`}
                                      onClick={(e) => e.stopPropagation()}
                                      target="_blank" rel="noreferrer"
                                      className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-700 text-slate-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors border border-slate-100 dark:border-slate-700"
                                      title="Get Directions"
                                  >
                                      <Navigation size={18} />
                                  </a>
                              </div>
                          </motion.div>
                      ))
                  )}
              </div>
          </div>
          </div>

          {/* MAP CONTAINER */}
          <div className={`${mobileView === 'map' ? 'block' : 'hidden'} md:block flex-1 relative bg-slate-100 dark:bg-slate-900 z-0`}>
              <MapContainer center={COLOMBO_CENTER} zoom={13} className="w-full h-full outline-none">
                  <TileLayer
                    attribution='&copy; OpenStreetMap contributors &copy; CARTO'
                    url={theme === 'dark' 
                        ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" 
                        : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                    }
                  />
                  
                  {/* Auto-fit Bounds Logic */}
                  <MapBoundsHandler userLocation={userLocation} vets={filteredVets} />

                  {userLocation && (
                    <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
                      <Popup className="font-heading font-bold">You are here</Popup>
                    </Marker>
                  )}

                  {filteredVets.map(vet => (
                      <Marker 
                        key={vet.id} 
                        position={[vet.lat, vet.lng]}
                        eventHandlers={{ click: () => setSelectedVet(vet) }}
                      > 
                        <Popup className="custom-popup">
                             <div className="text-center p-2 min-w-[150px]">
                                <div className="w-10 h-10 rounded-full bg-slate-100 mx-auto mb-2 overflow-hidden">
                                     {vet.avatar_url ? (
                                        <img src={vet.avatar_url} className="w-full h-full object-cover" />
                                     ) : (
                                        <Stethoscope className="w-full h-full p-2 text-slate-400" />
                                     )}
                                </div>
                                <h3 className="font-bold text-slate-900 mb-1">{vet.name}</h3>
                                <div className="text-xs font-bold text-emerald-600 bg-emerald-50 inline-block px-2 py-1 rounded-full">{vet.distance} km away</div>
                             </div>
                        </Popup>
                      </Marker>
                  ))}
              </MapContainer>
          </div>
      </div>
      
      {/* MOBILE VIEW TOGGLE FAB */}
      <div className="md:hidden absolute bottom-6 left-1/2 -translate-x-1/2 z-30">
        <button 
            onClick={() => setMobileView(prev => prev === 'list' ? 'map' : 'list')}
            className="bg-slate-900 dark:bg-slate-700 text-white px-6 py-3 rounded-full font-bold shadow-xl flex items-center gap-2 hover:scale-105 active:scale-95 transition-all border border-slate-700 dark:border-slate-500"
        >
            {mobileView === 'list' ? (
                <><MapPin size={18} /> Show Map</>
            ) : (
                <><List size={18} /> Show List</>
            )}
        </button>
      </div>

      {/* VET DETAILS MODAL */}
      <AnimatePresence>
          {selectedVet && (
              <>
                  {/* Backdrop */}
                  <motion.div 
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[2000]"
                      onClick={() => setSelectedVet(null)}
                  />
                  
                  {/* Side Panel / Modal */}
                  <motion.div 
                      initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      className="fixed top-0 right-0 h-full w-full md:w-[550px] bg-white dark:bg-slate-800 shadow-2xl z-[2001] overflow-y-auto border-l border-white/20 dark:border-slate-700"
                  >
                      {/* Close Button */}
                      <button 
                          onClick={() => setSelectedVet(null)}
                          className="fixed top-6 right-6 z-50 w-10 h-10 bg-white/80 dark:bg-slate-800/80 backdrop-blur rounded-full flex items-center justify-center text-slate-800 dark:text-white shadow-lg hover:scale-110 transition-transform cursor-pointer"
                      >
                          <X size={20} />
                      </button>

                      {/* Hero Image */}
                      <div className="relative h-64 bg-slate-200">
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10"></div>
                            <img 
                                src={selectedVet.avatar_url || "https://images.unsplash.com/photo-1629909613654-28e377c37b09?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80"} 
                                alt="Clinic" 
                                className="w-full h-full object-cover"
                            />
                            <div className="absolute bottom-6 left-8 z-20 text-white">
                                <h2 className="text-4xl font-black mb-2 shadow-sm leading-tight">{selectedVet.name}</h2>
                                <div className="flex items-center gap-3 text-sm font-bold text-white/90">
                                    <span className="bg-amber-500/20 backdrop-blur px-2 py-1 rounded-lg border border-amber-500/30 text-amber-300 flex items-center gap-1">
                                        <Star size={14} fill="currentColor" /> {selectedVet.rating}
                                    </span>
                                    <span className="flex items-center gap-1"><MapPin size={14} /> {selectedVet.distance} km away</span>
                                </div>
                            </div>
                      </div>

                      <div className="p-8 space-y-8">
                          
                          {/* Main Actions */}
                          <div className="flex gap-3">
                               <a 
                                  href={`tel:${selectedVet.phone}`}
                                  className="flex-1 bg-slate-900 dark:bg-slate-700 text-white py-4 rounded-xl font-bold text-center hover:bg-slate-800 dark:hover:bg-slate-600 transition-all shadow-lg shadow-slate-200 dark:shadow-none flex items-center justify-center gap-2 group"
                              >
                                  <Phone size={18} className="group-hover:animate-pulse" /> Call Clinic
                              </a>
                              <a 
                                  href={`https://www.google.com/maps/dir/?api=1&destination=${selectedVet.lat},${selectedVet.lng}`}
                                  target="_blank" rel="noreferrer"
                                  className="flex-1 bg-emerald-600 text-white py-4 rounded-xl font-bold text-center hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 dark:shadow-emerald-900/20 flex items-center justify-center gap-2 group"
                              >
                                  <Navigation size={18} className="group-hover:-translate-y-1 transition-transform" /> Directions
                              </a>
                          </div>

                          {/* About */}
                          <div className="bg-slate-50 dark:bg-slate-700/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-700">
                              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">About Clinic</h3>
                              <p className="text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                                  {selectedVet.description}
                              </p>
                          </div>

                          {/* Services */}
                          <div>
                              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                  <Stethoscope size={16} /> Available Services
                              </h3>
                              <div className="flex flex-wrap gap-2">
                                  {(selectedVet.services || []).map(service => (
                                      <span key={service} className="px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded-xl text-xs font-bold border border-emerald-100 dark:border-emerald-900/30 shadow-sm">
                                          {service}
                                      </span>
                                  ))}
                              </div>
                          </div>

                          {/* Info Grid */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="p-5 bg-white dark:bg-slate-700 rounded-2xl border border-slate-100 dark:border-slate-600 shadow-sm flex items-start gap-4">
                                  <div className="p-3 bg-amber-50 dark:bg-amber-900/30 rounded-xl text-amber-500">
                                      <Clock size={20} />
                                  </div>
                                  <div>
                                      <p className="font-bold text-slate-800 dark:text-white text-sm">Opening Hours</p>
                                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">{selectedVet.hours}</p>
                                  </div>
                              </div>
                              <div className="p-5 bg-white dark:bg-slate-700 rounded-2xl border border-slate-100 dark:border-slate-600 shadow-sm flex items-start gap-4">
                                  <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl text-indigo-500 dark:text-indigo-400">
                                      <Mail size={20} />
                                  </div>
                                  <div>
                                      <p className="font-bold text-slate-800 dark:text-white text-sm">Contact Email</p>
                                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">{selectedVet.email}</p>
                                  </div>
                              </div>
                          </div>
                      </div>
                  </motion.div>
              </>
          )}
      </AnimatePresence>
    </div>
  );
}
