import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Navigation, MapPin, Phone, Star, Heart, Clock, Stethoscope, Mail, X } from 'lucide-react';
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
  const [userLocation, setUserLocation] = useState(null);
  const [vets, setVets] = useState([]);
  const [selectedVet, setSelectedVet] = useState(null); // For Modal
  const [savedVetIds, setSavedVetIds] = useState([]);
  const [loadingLocation, setLoadingLocation] = useState(true);

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
                lat: v.latitude || mockLat,
                lng: v.longitude || mockLng,
                address: v.address || v.location || 'Colombo, Sri Lanka',
                phone: v.phone || '+94 11 234 5678',
                email: v.email || 'clinic@example.com',
                rating: (4 + (index % 10) * 0.1).toFixed(1),
                services: ['Vaccination', 'Sterilization', 'General Checkup', 'Emergency Care', 'Dental Cleanings'], // Mock Services
                hours: 'Mon-Sat: 9:00 AM - 8:00 PM', // Mock Hours
                description: 'Providing compassionate care for your furry family members with state-of-the-art facilities and experienced staff.' // Mock Desc
              };
          });

          const baseLocation = userLocation || { lat: COLOMBO_CENTER[0], lng: COLOMBO_CENTER[1] };
    
          const sortedVets = fetchedVets.map(vet => ({
            ...vet,
            distance: calculateDistance(baseLocation.lat, baseLocation.lng, vet.lat, vet.lng).toFixed(1)
          })).sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));

          setVets(sortedVets);
      } catch (err) {
          console.error("Error fetching vets:", err);
      }
  };

  const toggleSave = (e, id) => {
    e.stopPropagation();
    setSavedVetIds(prev => 
      prev.includes(id) ? prev.filter(vid => vid !== id) : [...prev, id]
    );
  };

  return (
    <div className="h-screen pt-20 flex flex-col bg-slate-50 overflow-hidden">
      
      {/* HEADER */}
      <div className="px-6 py-4 flex-shrink-0">
          <h1 className="text-3xl font-black text-slate-800">Find a Vet</h1>
          <p className="text-slate-500 font-medium">Locate trusted professionals near you.</p>
      </div>

      <div className="flex-1 flex overflow-hidden border-t border-slate-200">
          
          {/* SIDEBAR LIST */}
          <div className="w-full md:w-[400px] h-full overflow-y-auto bg-white border-r border-slate-200 shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-10 flex-shrink-0">
              <div className="p-4 space-y-4">
                  {loadingLocation && <div className="p-4 text-center text-slate-400 font-medium animate-pulse">Triangulating location...</div>}
                  
                  {vets.map(vet => (
                      <motion.div 
                          key={vet.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-white p-5 rounded-[20px] border border-slate-100 shadow-sm hover:shadow-lg hover:border-slate-300 transition-all cursor-pointer group"
                          onClick={() => setSelectedVet(vet)}
                      >
                          <div className="flex justify-between items-start mb-2">
                              <h3 className="text-lg font-extrabold text-slate-800 leading-tight group-hover:text-primary transition-colors">{vet.name}</h3>
                              <div className="flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-lg">
                                  <Star size={14} className="text-amber-500 fill-amber-500" />
                                  <span className="text-xs font-bold text-amber-700">{vet.rating}</span>
                              </div>
                          </div>
                          
                          <div className="flex items-start gap-2 text-slate-500 text-sm mb-4">
                              <MapPin size={16} className="shrink-0 mt-0.5 text-slate-400" />
                              <span className="line-clamp-2">{vet.address}</span>
                          </div>

                          <div className="flex items-center gap-2">
                              <button 
                                  onClick={(e) => { e.stopPropagation(); setSelectedVet(vet); }}
                                  className="flex-1 bg-slate-900 text-white px-[16px] py-[8px] rounded-[12px] font-bold text-sm hover:bg-slate-800 transition-colors"
                              >
                                  View Profile
                              </button>
                              <a 
                                  href={`https://www.google.com/maps/dir/?api=1&destination=${vet.lat},${vet.lng}`}
                                  onClick={(e) => e.stopPropagation()}
                                  target="_blank" rel="noreferrer"
                                  className="w-10 h-10 flex items-center justify-center rounded-[12px] bg-rose-50 text-rose-500 hover:bg-rose-100 transition-colors"
                              >
                                  <Navigation size={18} />
                              </a>
                          </div>
                      </motion.div>
                  ))}
              </div>
          </div>

          {/* MAP CONTAINER */}
          <div className="hidden md:block flex-1 relative bg-slate-100">
              <MapContainer center={COLOMBO_CENTER} zoom={13} className="w-full h-full outline-none">
                  <TileLayer
                    attribution='&copy; OpenStreetMap contributors'
                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                  />
                  
                  {/* Auto-fit Bounds Logic */}
                  <MapBoundsHandler userLocation={userLocation} vets={vets} />

                  {userLocation && (
                    <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
                      <Popup className="font-sans font-bold">You are here</Popup>
                    </Marker>
                  )}

                  {vets.map(vet => (
                      <Marker 
                        key={vet.id} 
                        position={[vet.lat, vet.lng]}
                        eventHandlers={{ click: () => setSelectedVet(vet) }}
                      > 
                        <Popup className="custom-popup">
                             <div className="text-center p-2">
                                <h3 className="font-bold text-slate-900">{vet.name}</h3>
                                <p className="text-xs text-slate-500">{vet.distance} km away</p>
                             </div>
                        </Popup>
                      </Marker>
                  ))}
              </MapContainer>
          </div>
      </div>

      {/* VET DETAILS MODAL */}
      <AnimatePresence>
          {selectedVet && (
              <>
                  {/* Backdrop */}
                  <motion.div 
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[2000]"
                      onClick={() => setSelectedVet(null)}
                  />
                  
                  {/* Side Panel / Modal */}
                  <motion.div 
                      initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      className="fixed top-0 right-0 h-full w-full md:w-[500px] bg-white shadow-2xl z-[2001] overflow-y-auto"
                  >
                      {/* Hero Image */}
                      <div className="relative h-48 bg-slate-100">
                            <img 
                                src="https://images.unsplash.com/photo-1629909613654-28e377c37b09?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80" 
                                alt="Clinic" 
                                className="w-full h-full object-cover"
                            />
                            <button 
                                onClick={() => setSelectedVet(null)}
                                className="absolute top-4 right-4 w-10 h-10 bg-white/90 backdrop-blur rounded-full flex items-center justify-center text-slate-800 shadow-lg hover:scale-105 transition-transform"
                            >
                                <X size={20} />
                            </button>
                      </div>

                      <div className="p-8">
                          <h2 className="text-3xl font-black text-slate-800 mb-2 leading-tight">{selectedVet.name}</h2>
                          
                          <div className="flex items-center gap-4 text-sm font-bold text-slate-500 mb-6">
                              <span className="flex items-center gap-1"><Star size={14} className="text-amber-500 fill-amber-500" /> {selectedVet.rating} (120 reviews)</span>
                              <span className="flex items-center gap-1"><MapPin size={14} /> {selectedVet.distance} km away</span>
                          </div>

                          <div className="space-y-8">
                              {/* About */}
                              <section>
                                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">About Clinic</h3>
                                  <p className="text-slate-600 leading-relaxed">
                                      {selectedVet.description}
                                  </p>
                              </section>

                              {/* Services */}
                              <section>
                                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                      <Stethoscope size={14} /> Services
                                  </h3>
                                  <div className="flex flex-wrap gap-2">
                                      {(selectedVet.services || []).map(service => (
                                          <span key={service} className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-bold border border-slate-200">
                                              {service}
                                          </span>
                                      ))}
                                  </div>
                              </section>

                              {/* Info Grid */}
                              <section className="grid grid-cols-2 gap-4">
                                  <div className="p-4 bg-slate-50 rounded-[16px] border border-slate-100">
                                      <Clock size={20} className="text-rose-500 mb-2" />
                                      <p className="font-bold text-slate-800 text-sm">Opening Hours</p>
                                      <p className="text-xs text-slate-500 mt-1">{selectedVet.hours}</p>
                                  </div>
                                  <div className="p-4 bg-slate-50 rounded-[16px] border border-slate-100">
                                      <Phone size={20} className="text-emerald-500 mb-2" />
                                      <p className="font-bold text-slate-800 text-sm">Contact</p>
                                      <p className="text-xs text-slate-500 mt-1">{selectedVet.phone}</p>
                                  </div>
                              </section>

                              {/* Action Buttons */}
                              <div className="flex flex-col gap-3 pt-4">
                                  <a 
                                      href={`tel:${selectedVet.phone}`}
                                      className="w-full bg-slate-900 text-white px-[16px] py-[12px] rounded-[12px] font-bold text-center hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
                                  >
                                      <Phone size={18} /> Call Now
                                  </a>
                                  <a 
                                      href={`https://www.google.com/maps/dir/?api=1&destination=${selectedVet.lat},${selectedVet.lng}`}
                                      target="_blank" rel="noreferrer"
                                      className="w-full bg-white text-slate-700 border border-slate-200 px-[16px] py-[12px] rounded-[12px] font-bold text-center hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
                                  >
                                      <Navigation size={18} /> Get Directions
                                  </a>
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
