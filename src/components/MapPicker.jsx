import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Locate } from 'lucide-react';

// Fix for default Leaflet icon not finding images in build
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
});

L.Marker.prototype.options.icon = DefaultIcon;

// New icon for Rescuer (Red hue using CSS filter or just default with popup for now)
// We will simply use the default icon but arguably we could use a different one. 
// For simplicity and robustness, we'll stick to default but add a Popup.

function LocationMarker({ position, setPosition, onLocationSelect }) {
  const map = useMap();
  
  // Handling map clicks
  useEffect(() => {
    map.on('click', (e) => {
        setPosition(e.latlng);
        onLocationSelect(e.latlng);
    });
  }, [map, setPosition, onLocationSelect]);

  return position === null ? null : (
    <Marker position={position}>
        <Popup>Incident Location</Popup>
    </Marker>
  );
}

// Component to handle flying to rescuer location
function MapFlyTo({ location }) {
    const map = useMap();
    useEffect(() => {
        if (location) {
            map.flyTo(location, 14, {
                duration: 2
            });
        }
    }, [location, map]);
    return null;
}

export default function MapPicker({ onLocationSelect, initialLocation, rescuerLocation }) {
  // Default to Colombo, Sri Lanka if no location (approximate center)
  const defaultCenter = [6.9271, 79.8612]; 
  const [position, setPosition] = useState(initialLocation || null);

  const handleLocateMe = () => {
     if (navigator.geolocation) {
         navigator.geolocation.getCurrentPosition((pos) => {
             const { latitude, longitude } = pos.coords;
             const newPos = { lat: latitude, lng: longitude };
             setPosition(newPos);
             onLocationSelect(newPos);
         }, (err) => {
             console.error("Error getting location", err);
             alert("Could not get your location. Please check permissions.");
         });
     }
  };

  return (
    <div className="h-full w-full relative z-0">
      <button 
        type="button"
        onClick={handleLocateMe}
        className="absolute top-4 right-4 z-[400] bg-white p-2 rounded-lg shadow-md text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 transition-all border border-slate-200"
        title="Use My Location"
      >
        <Locate size={20} />
      </button>
      
      <MapContainer 
        center={defaultCenter} 
        zoom={13} 
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LocationMarker position={position} setPosition={setPosition} onLocationSelect={onLocationSelect} />
        
        {/* Rescuer Marker */}
        {rescuerLocation && (
            <>
                <Marker position={rescuerLocation}>
                    <Popup>
                        <strong>Rescuer / Shelter</strong><br/>
                        Approximate Location
                    </Popup>
                </Marker>
                <MapFlyTo location={rescuerLocation} />
            </>
        )}
      </MapContainer>
    </div>
  );
}
