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

  // Scheduling Logic
  const [schedulingReport, setSchedulingReport] = useState(null);
  const [pickupDate, setPickupDate] = useState('');
  const [pickupTime, setPickupTime] = useState('');

  const handleAcceptClick = (report) => {
      setSchedulingReport(report);
      // Default to tomorrow 9am?
      const tmr = new Date();
      tmr.setDate(tmr.getDate() + 1);
      setPickupDate(tmr.toISOString().split('T')[0]);
      setPickupTime('09:00');
  };

  const confirmPickup = async () => {
      if (!pickupDate || !pickupTime) {
          alert("Please select both date and time.");
          return;
      }

      setLoading(true);
      try {
          const timestamp = new Date(`${pickupDate}T${pickupTime}`).toISOString();
          
          // 1. Update Report
          const { error: updateError } = await supabase
              .from('reports')
              .update({ 
                  status: 'accepted',
                  expected_pickup_time: timestamp
              })
              .eq('id', schedulingReport.id);

          if (updateError) throw updateError;

          // 2. Notify Citizen
          const { error: notifyError } = await supabase
              .from('notifications')
              .insert([{
                  user_id: schedulingReport.user_id,
                  type: 'report_update',
                  message: `Good News! A rescuer has accepted your request. Estimated pickup: ${pickupDate} at ${pickupTime}.`,
                  metadata: { report_id: schedulingReport.id }
              }]);
          
          if (notifyError) console.error("Notification Error:", notifyError);

          // Update local state
          setReports(reports.map(r => 
              r.id === schedulingReport.id ? { ...r, status: 'accepted', expected_pickup_time: timestamp } : r
          ));

          setSchedulingReport(null);
      } catch (err) {
          console.error("Error scheduling pickup:", err);
          alert("Failed to confirm pickup. Please try again.");
      } finally {
          setLoading(false);
      }
  };

  const [activeTab, setActiveTab] = useState('pending'); // 'pending' or 'accepted'

  const filteredReports = reports.filter(r => {
      if (activeTab === 'pending') return r.status === 'pending';
      if (activeTab === 'accepted') return r.status === 'accepted';
      return true;
  });

  return (
    <div className="page-container relative">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <div>
            <h1>Rescuer Dashboard</h1>
            <p className="text-muted">Manage your rescue missions</p>
        </div>
        
        <div className="flex bg-slate-100 p-1 rounded-lg">
            <button 
                className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-primary' : 'text-muted hover:text-slate-700'}`}
                onClick={() => setViewMode('list')}
            >
                List View
            </button>
            <button 
                className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${viewMode === 'map' ? 'bg-white shadow-sm text-primary' : 'text-muted hover:text-slate-700'}`}
                onClick={() => setViewMode('map')}
            >
                Map View
            </button>
        </div>
      </div>

      {/* Status Tabs */}
      <div className="flex border-b border-border mb-8">
          <button 
              onClick={() => setActiveTab('pending')}
              className={`px-6 py-3 font-semibold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'pending' ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-slate-700'}`}
          >
              <AlertTriangle size={18} />
              New Requests
              <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs">
                  {reports.filter(r => r.status === 'pending').length}
              </span>
          </button>
          <button 
              onClick={() => setActiveTab('accepted')}
              className={`px-6 py-3 font-semibold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'accepted' ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-slate-700'}`}
          >
              <CheckCircle size={18} />
              Scheduled Pickups
              <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs">
                  {reports.filter(r => r.status === 'accepted').length}
              </span>
          </button>
      </div>

      {/* Scheduling Modal */}
      {schedulingReport && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl animate-fade-in">
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                      <Clock className="text-primary" /> Schedule Pickup
                  </h3>
                  <p className="text-muted mb-6">
                      When will you be able to pick up the animal from <strong>{schedulingReport.location}</strong>?
                  </p>
                  
                  <div className="space-y-4 mb-8">
                      <div>
                          <label className="block text-sm font-semibold mb-1">Pickup Date</label>
                          <input 
                              type="date" 
                              className="form-input w-full"
                              value={pickupDate}
                              onChange={e => setPickupDate(e.target.value)}
                          />
                      </div>
                      <div>
                          <label className="block text-sm font-semibold mb-1">Estimated Time</label>
                          <input 
                              type="time" 
                              className="form-input w-full"
                              value={pickupTime}
                              onChange={e => setPickupTime(e.target.value)}
                          />
                      </div>
                  </div>

                  <div className="flex justify-end gap-3">
                      <button 
                          onClick={() => setSchedulingReport(null)}
                          className="btn bg-slate-100 hover:bg-slate-200 text-slate-700"
                      >
                          Cancel
                      </button>
                      <button 
                          onClick={confirmPickup}
                          className="btn btn-primary"
                      >
                          Confirm & Notify Citizen
                      </button>
                  </div>
              </div>
          </div>
      )}

      {loading ? (
          <div className="text-center py-12">
            <p className="text-muted text-lg">Loading reports...</p>
          </div>
      ) : (
          <>
            {viewMode === 'list' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredReports.length === 0 ? (
                        <div className="col-span-full py-16 text-center text-muted bg-slate-50 rounded-xl border border-dashed border-slate-200">
                            {activeTab === 'pending' ? (
                                <>
                                    <CheckCircle size={48} className="mx-auto mb-4 text-green-200" />
                                    <h3>All caught up!</h3>
                                    <p>No new rescue requests at the moment.</p>
                                </>
                            ) : (
                                <>
                                    <Clock size={48} className="mx-auto mb-4 text-slate-200" />
                                    <h3>No scheduled pickups</h3>
                                    <p>Accept a request to see it here.</p>
                                </>
                            )}
                        </div>
                    ) : filteredReports.map(report => (
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
                                    {report.expected_pickup_time && (
                                        <div className="mt-1 text-primary font-semibold">
                                            Pickup: {new Date(report.expected_pickup_time).toLocaleString()}
                                        </div>
                                    )}
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
                                        onClick={() => handleAcceptClick(report)}
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
                        {filteredReports.filter(r => r.latitude && r.longitude).map(report => (
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
                                                    onClick={() => handleAcceptClick(report)}
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

