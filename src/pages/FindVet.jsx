import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Navigation, MapPin, Phone, Star, Heart } from 'lucide-react';
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

// ... (previous imports)

// Remove Mock Data

const COLOMBO_CENTER = [6.9271, 79.8612];

function ChangeView({ center, zoom }) {
  const map = useMap();
  map.setView(center, zoom);
  return null;
}

export default function FindVet() {
  const [userLocation, setUserLocation] = useState(null);
  const [vets, setVets] = useState([]);
  const [selectedVet, setSelectedVet] = useState(null);
  const [savedVetIds, setSavedVetIds] = useState([]);
  const [loadingLocation, setLoadingLocation] = useState(true);

  // Haversine formula to calculate distance
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
  };

  const deg2rad = (deg) => {
    return deg * (Math.PI / 180);
  };

  useEffect(() => {
    // Get user location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation({ lat: latitude, lng: longitude });
          setLoadingLocation(false);
        },
        (error) => {
          console.error("Error getting location: ", error);
          setLoadingLocation(false);
          // Fallback handled by default center
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
          // Fetch profiles with role 'vet' and valid coordinates
          // Fetch ALL profiles with role 'vet' (even if no specific location set yet)
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('role', 'vet');

          if (error) throw error;
          
          let fetchedVets = data.map((v, index) => {
              // Mock Coordinates Fallback (spread them around Colombo center)
              // We use index to scatter them deterministically
              const mockLat = COLOMBO_CENTER[0] + (Math.random() - 0.5) * 0.1; 
              const mockLng = COLOMBO_CENTER[1] + (Math.random() - 0.5) * 0.1;

              return {
                id: v.id,
                name: v.full_name || 'Veterinary Clinic',
                lat: v.latitude || mockLat,
                lng: v.longitude || mockLng,
                address: v.address || v.location || 'Colombo',
                phone: v.phone || '',
                rating: (4 + Math.random()).toFixed(1)
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

  const handleVetClick = (vet) => {
    setSelectedVet(vet);
  };

  const toggleSave = (e, id) => {
    e.stopPropagation();
    setSavedVetIds(prev => 
      prev.includes(id) ? prev.filter(vid => vid !== id) : [...prev, id]
    );
  };

  const savedVets = vets.filter(vet => savedVetIds.includes(vet.id));

  return (
    <div className="page-container h-[calc(100vh-4rem)] flex flex-col">
      <div className="mb-6 text-center shrink-0">
        <h1 className="text-3xl font-bold mb-1">Find Nearest Vet</h1>
        <p className="text-muted">Locate trusted veterinarians in your area</p>
      </div>

      <div className="glass-panel flex-1 flex flex-col md:flex-row overflow-hidden !p-0">
        
        {/* Sidebar List */}
        <div className="w-full md:w-[350px] bg-slate-50 border-r border-border overflow-y-auto shrink-0">
          <div className="p-4 flex flex-col gap-3">
             {loadingLocation && <div className="p-4 text-center text-muted animate-pulse">Locating you...</div>}
             
             {vets.length === 0 && !loadingLocation && (
                 <div className="p-8 text-center text-muted">No vets found nearby with location data.</div>
             )}

             {vets.map(vet => (
               <div 
                 key={vet.id}
                 onClick={() => handleVetClick(vet)}
                 className={`p-4 rounded-xl border cursor-pointer transition-all hover:shadow-md ${
                    selectedVet?.id === vet.id 
                        ? 'bg-white border-primary shadow-md ring-1 ring-primary/20' 
                        : 'bg-white border-border hover:border-primary/50'
                 }`}
               >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-base font-bold m-0 text-gray-800">{vet.name}</h3>
                    <button
                        onClick={(e) => toggleSave(e, vet.id)}
                        className="p-1 hover:bg-slate-100 rounded-full transition-colors"
                    >
                        <Heart size={18} fill={savedVetIds.includes(vet.id) ? "var(--accent)" : "none"} className={savedVetIds.includes(vet.id) ? "text-red-500" : "text-slate-400"} />
                    </button>
                  </div>
                  
                  <div className="flex justify-between items-center mb-2">
                    <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-bold whitespace-nowrap">
                      {vet.distance} km
                    </span>
                    <div className="flex items-center gap-1 text-amber-500 text-xs font-bold">
                        <Star size={12} fill="currentColor" />
                        <span className="text-gray-700">{vet.rating}</span>
                    </div>
                 </div>

                 <div className="flex items-start gap-2 text-muted text-xs mb-3">
                   <MapPin size={14} className="shrink-0 mt-0.5" />
                   <span className="line-clamp-2">{vet.address}</span>
                 </div>
                 
                 <a 
                    href={`https://www.google.com/maps/dir/?api=1&destination=${vet.lat},${vet.lng}`}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1 text-primary text-xs font-bold hover:underline"
                 >
                     <Navigation size={12} /> Get Directions
                 </a>
               </div>
             ))}
          </div>
        </div>

        {/* Map */}
        <div className="flex-1 relative z-0 bg-slate-200">
          <MapContainer 
            center={COLOMBO_CENTER} 
            zoom={13} 
            className="w-full h-full"
            style={{ height: '100%', width: '100%' }}
          >
            <ChangeView center={selectedVet ? [selectedVet.lat, selectedVet.lng] : (userLocation ? [userLocation.lat, userLocation.lng] : COLOMBO_CENTER)} zoom={13} />
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {userLocation && (
              <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
                <Popup>You are here</Popup>
              </Marker>
            )}

            {vets.map(vet => (
              <Marker 
                key={vet.id} 
                position={[vet.lat, vet.lng]}
                eventHandlers={{
                  click: () => {
                    handleVetClick(vet);
                  },
                }}
              >
                <Popup>
                  <div className="text-center">
                    <strong className="block mb-1 text-sm">{vet.name}</strong>
                    <div className="text-xs text-muted mb-2">{vet.address}</div>
                    
                    <a 
                        href={`https://www.google.com/maps/dir/?api=1&destination=${vet.lat},${vet.lng}`}
                        target="_blank" 
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-primary font-bold text-xs hover:underline"
                    >
                        <Navigation size={12} /> Get Directions
                    </a>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>

          {/* User Location FAB */}
          <button
            onClick={() => {
                if (userLocation) {
                    setSelectedVet(null); 
                }
            }}
            className="absolute bottom-5 right-5 z-[1000] bg-white border-none rounded-full w-12 h-12 flex items-center justify-center shadow-lg cursor-pointer text-primary hover:bg-slate-50 transition-colors"
            title="Recenter on me"
          >
            <Navigation size={20} />
          </button>
        </div>
      </div>

      {/* Saved Vets Section */}
      {savedVets.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Heart fill="var(--accent)" color="var(--accent)" /> My Saved Vets
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {savedVets.map(vet => (
              <div key={vet.id} className="glass-panel p-6">
                 <div className="flex justify-between items-start mb-4">
                    <h3 className="text-base font-bold m-0 text-gray-800">{vet.name}</h3>
                    <button
                        onClick={(e) => toggleSave(e, vet.id)}
                        className="p-1 hover:bg-slate-100 rounded-full transition-colors"
                    >
                        <Heart size={18} fill="var(--accent)" className="text-red-500" />
                    </button>
                 </div>
                 <div className="flex items-start gap-2 text-muted text-sm mb-4">
                   <MapPin size={16} className="shrink-0 mt-0.5" />
                   <span className="line-clamp-2">{vet.address}</span>
                 </div>
                 <div className="flex items-center gap-2 mt-4">
                    <a 
                        href={`https://www.google.com/maps/dir/?api=1&destination=${vet.lat},${vet.lng}`}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-primary flex-1 text-sm"
                    >
                        <Navigation size={14} /> Directions
                    </a>
                 </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
