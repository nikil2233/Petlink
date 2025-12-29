import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, AlertTriangle, CheckCircle, Clock, XCircle, Check } from 'lucide-react';

export default function RescuerFeed() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'map'
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
            setCurrentUser(session.user);
            checkUserRole(session.user.id);
        } else {
            // Optional: Redirect to login if no session? 
            // For now, consistent with other pages, we might just show nothing or let them see empty
        }
    });
  }, []);

  const checkUserRole = async (userId) => {
      const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', userId)
          .single();
      
      if (data) {
          if (!['rescuer', 'shelter', 'vet'].includes(data.role)) {
              alert("Access Denied: Only Rescuers can view this feed.");
              window.location.href = '/'; // Simple redirect
          } else {
              fetchReports(userId);
          }
      }
  };

  const fetchReports = async (userId) => {
    console.log("Starting fetchReports for user:", userId);
    try {
      setLoading(true);
      
      // Fetch reports assigned to this rescuer
      const { data, error } = await supabase
        .from('reports')
        .select(`
          *,
          profiles:user_id (full_name, avatar_url, phone:id)
        `)
        .eq('assigned_rescuer_id', userId)
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

  const updateReportStatus = async (reportId, newStatus) => {
      try {
          const { error } = await supabase
              .from('reports')
              .update({ status: newStatus })
              .eq('id', reportId);

          if (error) throw error;

          // Update local state
          setReports(reports.map(r => 
              r.id === reportId ? { ...r, status: newStatus } : r
          ));

      } catch (err) {
          console.error("Error updating status:", err);
          alert("Failed to update status. Please try again.");
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

  const getStatusBadge = (status) => {
      switch(status) {
          case 'accepted':
              return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold"><CheckCircle size={14} /> Accepted</span>;
          case 'declined':
              return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs font-semibold"><XCircle size={14} /> Declined</span>;
          case 'pending':
              return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 text-xs font-semibold"><Clock size={14} /> Pending</span>;
          default:
              return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">{status}</span>;
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
                    {reports.length === 0 ? (
                        <div className="col-span-full text-center py-12 text-muted">
                            <p>No rescue requests assigned to you yet.</p>
                        </div>
                    ) : reports.map(report => (
                        <div key={report.id} className="glass-panel p-6 relative overflow-hidden transition-all hover:shadow-lg flex flex-col h-full">
                            {/* Urgency Badge */}
                            <div 
                                className="absolute top-0 left-0 w-1.5 h-full"
                                style={{ background: getUrgencyColor(report.urgency) }}
                            ></div>

                            <div className="pl-4 flex-1">
                                <div className="flex justify-between items-start mb-3">
                                    <span 
                                        className="font-bold uppercase text-xs tracking-wider"
                                        style={{ color: getUrgencyColor(report.urgency) }}
                                    >
                                        {report.urgency} Priority
                                    </span>
                                    {getStatusBadge(report.status)}
                                </div>
                                
                                <span className="text-xs text-muted block mb-2">
                                    Reported: {new Date(report.created_at).toLocaleDateString()}
                                </span>

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
                                    <div className="mb-4">
                                        <a 
                                            href={`https://www.google.com/maps?q=${report.latitude},${report.longitude}`} 
                                            target="_blank" 
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-1 text-primary text-sm font-semibold hover:underline"
                                        >
                                            Open in Maps &rarr;
                                        </a>
                                    </div>
                                )}
                            </div>

                            {/* Actions Footer */}
                            {report.status === 'pending' && (
                                <div className="pl-4 mt-4 pt-4 border-t border-border grid grid-cols-2 gap-3">
                                    <button 
                                        onClick={() => updateReportStatus(report.id, 'accepted')}
                                        className="btn bg-green-500 hover:bg-green-600 text-white text-sm py-2 flex items-center justify-center gap-1"
                                    >
                                        <Check size={16} /> Accept
                                    </button>
                                    <button 
                                        onClick={() => updateReportStatus(report.id, 'declined')}
                                        className="btn bg-red-500 hover:bg-red-600 text-white text-sm py-2 flex items-center justify-center gap-1"
                                    >
                                        <XCircle size={16} /> Decline
                                    </button>
                                </div>
                            )}
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
                                    <div className="min-w-[200px]">
                                        <div className="flex justify-between items-center mb-2">
                                            <strong className="uppercase text-xs" style={{ color: getUrgencyColor(report.urgency) }}>{report.urgency}</strong>
                                            {getStatusBadge(report.status)}
                                        </div>
                                        <p className="text-sm mb-2">{report.description.substring(0, 50)}...</p>
                                        {report.status === 'pending' && (
                                            <div className="flex gap-2 mt-2">
                                                <button 
                                                    onClick={() => updateReportStatus(report.id, 'accepted')}
                                                    className="px-2 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600"
                                                >
                                                    Accept
                                                </button>
                                                <button 
                                                    onClick={() => updateReportStatus(report.id, 'declined')}
                                                    className="px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
                                                >
                                                    Decline
                                                </button>
                                            </div>
                                        )}
                                    </div>
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

