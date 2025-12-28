import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

export default function RescuerFeed() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'map'

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) fetchReports(); // Call fetchReports without userId
    });
  }, []);

  const fetchReports = async () => {
    console.log("Starting fetchReports...");
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      console.log("Current user:", user);
      
      const { data, error } = await supabase
        .from('reports')
        .select(`
          *,
          profiles:user_id (full_name, avatar_url, phone:id)
        `)
        .order('created_at', { ascending: false });

      if (error) {
          console.error("Supabase Error fetchReports:", error);
          throw error;
      }
      
      console.log("Fetched reports data:", data);
      setReports(data || []);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const getUrgencyColor = (urgency) => {
      switch(urgency) {
          case 'critical': return '#ef4444';
          case 'high': return '#f97316';
          case 'medium': return '#eab308';
          case 'low': return '#22c55e';
          default: return '#94a3b8';
      }
  };

  return (
    <div className="page-container">
      <div className="flex justify-between items-center mb-8">
        <h1>Rescuer Feed</h1>
        <div className="flex gap-2">
            <button 
                className={`btn ${viewMode === 'list' ? 'btn-primary' : 'bg-subtle text-muted hover:bg-slate-200'}`}
                onClick={() => setViewMode('list')}
            >
                List View
            </button>
            <button 
                className={`btn ${viewMode === 'map' ? 'btn-primary' : 'bg-subtle text-muted hover:bg-slate-200'}`}
                onClick={() => setViewMode('map')}
            >
                Map View
            </button>
        </div>
      </div>

      {loading ? (
          <div className="text-center py-12">
            <p className="text-muted text-lg">Loading reports...</p>
          </div>
      ) : (
          <>
            {viewMode === 'list' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {reports.map(report => (
                        <div key={report.id} className="glass-panel p-6 relative overflow-hidden transition-all hover:shadow-lg">
                            {/* Urgency Badge */}
                            <div 
                                className="absolute top-0 left-0 w-1.5 h-full"
                                style={{ background: getUrgencyColor(report.urgency) }}
                            ></div>

                            <div className="pl-4">
                                <div className="flex justify-between items-center mb-3">
                                    <span 
                                        className="font-bold uppercase text-xs tracking-wider"
                                        style={{ color: getUrgencyColor(report.urgency) }}
                                    >
                                        {report.urgency} Priority
                                    </span>
                                    <span className="text-xs text-muted">
                                        {new Date(report.created_at).toLocaleDateString()}
                                    </span>
                                </div>
                                
                                {report.image_url && (
                                    <div className="w-full h-48 mb-4 rounded-lg overflow-hidden bg-slate-100">
                                        <img 
                                            src={report.image_url} 
                                            alt="Report" 
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                )}

                                <p className="mb-4 text-sm leading-relaxed line-clamp-3">{report.description}</p>
                                
                                <div className="flex items-start gap-2 text-muted text-xs mb-4">
                                    <MapPin size={14} className="mt-0.5 shrink-0" />
                                    <span>{report.location || 'Unknown Location'}</span>
                                </div>

                                {report.latitude && report.longitude && (
                                    <a 
                                        href={`https://www.google.com/maps?q=${report.latitude},${report.longitude}`} 
                                        target="_blank" 
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-1 text-primary text-sm font-semibold hover:underline"
                                    >
                                        Open in Maps &rarr;
                                    </a>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="h-[600px] rounded-2xl overflow-hidden shadow-lg border border-border">
                    <MapContainer center={[6.9271, 79.8612]} zoom={11} style={{ height: '100%', width: '100%' }}>
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                        {reports.filter(r => r.latitude && r.longitude).map(report => (
                            <Marker key={report.id} position={[report.latitude, report.longitude]}>
                                <Popup>
                                    <strong>{report.urgency.toUpperCase()} Urgency</strong><br/>
                                    {report.description.substring(0, 50)}...
                                </Popup>
                            </Marker>
                        ))}
                    </MapContainer>
                </div>
            )}
          </>
      )}
    </div>
  );
}
