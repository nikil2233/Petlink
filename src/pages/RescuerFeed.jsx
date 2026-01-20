import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, AlertTriangle, CheckCircle2, Clock, XCircle, HeartHandshake, Shield, Activity, Calendar, Siren, PawPrint } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const SkeletonCard = () => (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-col h-full animate-pulse">
        <div className="flex items-start gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-slate-200 flex-shrink-0" />
            <div className="flex-1 space-y-2">
                <div className="h-4 bg-slate-200 rounded w-1/3" />
                <div className="h-3 bg-slate-200 rounded w-3/4" />
            </div>
        </div>
        <div className="h-32 bg-slate-200 rounded-xl mb-4 w-full" />
        <div className="space-y-2 flex-1">
             <div className="h-3 bg-slate-200 rounded w-1/2" />
             <div className="h-3 bg-slate-200 rounded w-2/3" />
        </div>
        <div className="flex gap-2 mt-4">
            <div className="h-8 bg-slate-200 rounded-lg flex-1" />
            <div className="h-8 bg-slate-200 rounded-lg w-12" />
        </div>
    </div>
);

export default function RescuerFeed() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'map'
  const [currentUser, setCurrentUser] = useState(null);
  
  const [accessDenied, setAccessDenied] = useState(false);

  // Scheduling Logic State
  const [schedulingReport, setSchedulingReport] = useState(null);
  const [pickupDate, setPickupDate] = useState('');
  const [pickupTime, setPickupTime] = useState('');

  const [activeTab, setActiveTab] = useState('pending'); // 'pending' or 'accepted'

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
            setCurrentUser(session.user);
            checkUserRole(session.user.id);
        } else {
             // If no session, wait or redirect?
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
              setAccessDenied(true);
          } else {
              fetchReports(userId);
          }
      }
  };

  if (accessDenied) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 to-orange-50 p-6">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white/80 backdrop-blur-xl p-12 rounded-[2.5rem] shadow-2xl border border-white/50 text-center max-w-lg w-full relative overflow-hidden"
              >
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-red-500/10 rounded-full blur-3xl -z-10"></div>
                  
                  <div className="text-8xl mb-6 animate-bounce">🚫</div>
                  
                  <h2 className="text-4xl font-black mb-4 bg-gradient-to-r from-red-600 to-rose-400 bg-clip-text text-transparent">
                      Access Restricted
                  </h2>
                  
                  <p className="text-slate-500 text-lg mb-8 leading-relaxed">
                      This command center is reserved for verified <strong className="text-rose-600">Rescuers & NGOs</strong>. 
                  </p>

                  <button 
                      onClick={() => window.location.href = '/'}
                      className="group relative inline-flex items-center justify-center px-8 py-3 font-bold text-white transition-all duration-200 bg-gradient-to-tr from-rose-600 to-orange-500 rounded-full hover:from-rose-700 hover:to-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500 hover:shadow-lg hover:scale-105"
                  >
                       Return to Home
                  </button>
              </motion.div>
          </div>
      );
  }

  const fetchReports = async (userId) => {
    try {
      setLoading(true);
      
      // Fetch reports assigned to this rescuer
      const { data, error } = await supabase
        .from('reports')
        .select(`
          *,
          profiles:profiles!reports_user_id_fkey (full_name, avatar_url, phone:id)
        `)
        .eq('assigned_rescuer_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReports(data || []);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      // Add artificial delay for smoother skeleton transition
      setTimeout(() => setLoading(false), 800);
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
          case 'critical': return 'items-center px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-600 border border-rose-200 shadow-sm';
          case 'high': return 'items-center px-3 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-600 border border-orange-200 shadow-sm';
          case 'medium': return 'items-center px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-600 border border-amber-200 shadow-sm';
          case 'low': return 'items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-600 border border-emerald-200 shadow-sm';
          default: return 'items-center px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-500 border border-slate-200';
      }
  };

  const handleAcceptClick = (report) => {
      setSchedulingReport(report);
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
          
          const { error: updateError } = await supabase
              .from('reports')
              .update({ 
                  status: 'accepted',
                  expected_pickup_time: timestamp
              })
              .eq('id', schedulingReport.id);

          if (updateError) throw updateError;

          const { error: notifyError } = await supabase
              .from('notifications')
              .insert([{
                  user_id: schedulingReport.user_id,
                  type: 'report_update',
                  message: `Rescue Confirmed! A rescuer is on the way. Estimated pickup: ${pickupDate} at ${pickupTime}.`,
                  metadata: { report_id: schedulingReport.id }
              }]);
          
          if (notifyError) console.error("Notification Error:", notifyError);

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

  const filteredReports = reports.filter(r => {
      if (activeTab === 'pending') return r.status === 'pending';
      if (activeTab === 'accepted') return r.status === 'accepted';
      return true;
  });

  const pendingCount = reports.filter(r => r.status === 'pending').length;
  const acceptedCount = reports.filter(r => r.status === 'accepted').length;

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans">
      
      {/* Top Navigation / Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm/50 backdrop-blur-md bg-white/90">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
                <div className="bg-rose-600 p-1.5 rounded-lg text-white shadow-sm shadow-rose-200">
                    <Shield size={18} />
                </div>
                <h1 className="text-lg font-bold text-slate-800 tracking-tight">Rescuer Portal</h1>
            </div>
            
            {/* View Mode Toggle - Keeping compact but matching radius */}
            <div className="flex bg-slate-100 p-1 rounded-[8px] border border-slate-200">
                <button 
                    onClick={() => setViewMode('list')}
                    className={`px-3 py-1 rounded-[6px] text-xs font-bold transition-all duration-200 ease flex items-center gap-1.5 ${viewMode === 'list' ? 'bg-white text-slate-800 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <Activity size={12} /> List
                </button>
                <button 
                    onClick={() => setViewMode('map')}
                    className={`px-3 py-1 rounded-[6px] text-xs font-bold transition-all duration-200 ease flex items-center gap-1.5 ${viewMode === 'map' ? 'bg-white text-slate-800 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <MapPin size={12} /> Map
                </button>
            </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-8">
          
          {/* Dashboard Header & Filters */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
              <motion.div 
                 initial={{ opacity: 0, x: -20 }}
                 animate={{ opacity: 1, x: 0 }}
                 transition={{ duration: 0.5 }}
              >
                  <h2 className="text-2xl font-black text-slate-800 mb-1">Mission Control</h2>
                  <p className="text-slate-500 text-sm font-medium">Manage your active rescue assignments.</p>
              </motion.div>

              {/* Status Filters - APPLIED BUTTON STANDARD */}
              {/* Size: Compact (px-[16px] py-[8px], text-[14px]) | Radius: 8px (rounded-[8px]) */}
              <motion.div 
                 initial={{ opacity: 0, x: 20 }}
                 animate={{ opacity: 1, x: 0 }}
                 transition={{ duration: 0.5, delay: 0.1 }}
                 className="flex gap-3"
              >
                  {/* New Alerts Button (Primary) */}
                  <button 
                      onClick={() => setActiveTab('pending')}
                      className={`flex items-center gap-2 px-[16px] py-[8px] rounded-[8px] text-[14px] font-medium shadow-sm transition-all duration-200 ease group
                        ${activeTab === 'pending' 
                            ? 'bg-rose-600 text-white shadow-rose-200 ring-2 ring-rose-600 ring-offset-2' 
                            : 'bg-white border border-slate-200 text-slate-600 hover:border-rose-300 hover:text-rose-600'}`}
                  >
                      <div className={`transition-opacity duration-200 ${activeTab === 'pending' ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'}`}>
                          {activeTab === 'pending' ? (
                              <img src="/bell-new.png" alt="Alert" className="w-5 h-5 object-contain invert border-none" style={{ filter: 'brightness(0) invert(1)' }} />
                          ) : (
                              <img src="/bell-new.png" alt="Alert" className="w-5 h-5 object-contain" />
                          )}
                      </div>
                      <span>New Alerts</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${activeTab === 'pending' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                          {pendingCount}
                      </span>
                  </button>

                  {/* Scheduled Button (Secondary) */}
                  <button 
                      onClick={() => setActiveTab('accepted')}
                      className={`flex items-center gap-2 px-[16px] py-[8px] rounded-[8px] text-[14px] font-medium shadow-sm transition-all duration-200 ease group
                        ${activeTab === 'accepted' 
                            ? 'bg-white border-emerald-500 text-emerald-700 ring-2 ring-emerald-500 ring-offset-2' 
                            : 'bg-white border border-slate-200 text-slate-600 hover:border-emerald-400 hover:text-emerald-600'}`}
                  >
                       <div className={`transition-opacity duration-200 ${activeTab === 'accepted' ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'}`}>
                          <img src="/calendar-scheduled.png" alt="Calendar" className="w-5 h-5 object-contain" />
                       </div>
                       <span>Scheduled</span>
                       <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${activeTab === 'accepted' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                          {acceptedCount}
                       </span>
                  </button>
              </motion.div>
          </div>

          {/* Content Area */}
          <AnimatePresence mode="wait">
              {loading ? (
                <motion.div 
                    key="loader"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                >
                    {[1, 2, 3, 4, 5, 6].map(i => <SkeletonCard key={i} />)}
                </motion.div>
              ) : (
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    {viewMode === 'list' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredReports.length === 0 ? (
                                <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
                                    <div className="mx-auto w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-3">
                                        <PawPrint className="text-slate-300" size={32} />
                                    </div>
                                    <h3 className="text-slate-800 font-bold mb-1">No reports found</h3>
                                    <p className="text-slate-400 text-sm">You are all caught up for {activeTab === 'pending' ? 'new alerts' : 'scheduled pickups'}.</p>
                                </div>
                            ) : filteredReports.map((report, index) => (
                                <motion.div 
                                    key={report.id} 
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    whileHover={{ y: -5, boxShadow: "0 10px 30px -10px rgba(0,0,0,0.1)" }}
                                    className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-col h-full group"
                                >
                                    {/* Compact Card Header */}
                                    <div className="flex items-start justify-between gap-3 mb-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden flex-shrink-0 border border-slate-100 relative">
                                                 {report.image_url ? (
                                                    <img src={report.image_url} alt="Pet" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-slate-400"><PawPrint size={18} /></div>
                                                )}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <span className={getUrgencyColor(report.urgency)}>
                                                        {report.urgency}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                                                        <Clock size={10} /> {new Date(report.created_at).toLocaleDateString()}
                                                    </span>
                                                </div>
                                                <h3 className="text-sm font-bold text-slate-800 line-clamp-1">{report.description}</h3>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Details */}
                                    <div className="space-y-2 mb-4 flex-1">
                                        <div className="flex items-start gap-2 bg-slate-50 p-2 rounded-lg border border-slate-100/50">
                                            <MapPin size={14} className="text-slate-400 mt-0.5" />
                                            <div className="flex-1">
                                                <p className="text-xs text-slate-600 font-medium leading-relaxed">{report.location || 'Unknown Location'}</p>
                                                {report.latitude && report.longitude && (
                                                    <a href={`https://www.google.com/maps?q=${report.latitude},${report.longitude}`} target="_blank" rel="noreferrer" className="text-[10px] text-rose-600 font-bold hover:underline block mt-1">
                                                        Open Maps
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                        
                                         {report.expected_pickup_time && (
                                            <div className="flex items-start gap-2 bg-emerald-50/50 p-2 rounded-lg border border-emerald-100">
                                                <Calendar size={14} className="text-emerald-500 mt-0.5" />
                                                <div>
                                                    <p className="text-xs text-emerald-900 font-medium">
                                                        {new Date(report.expected_pickup_time).toLocaleString(undefined, {
                                                            weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                                        })}
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Actions - APPLIED BUTTON STANDARD (EXPLICIT PIXELS) */}
                                    {report.status === 'pending' && (
                                        <div className="grid grid-cols-2 gap-2 mt-auto">
                                            {/* Secondary Button: Transparent, Border, Colored Text */}
                                            <button 
                                                onClick={() => updateReportStatus(report.id, 'declined')}
                                                className="px-[16px] py-[8px] rounded-[8px] border border-slate-200 text-slate-600 text-[14px] font-bold hover:border-rose-300 hover:text-rose-600 transition-all duration-200 ease"
                                            >
                                                Decline
                                            </button>
                                            
                                            {/* Primary Button: Solid Brand Color, White Text */}
                                            <button 
                                                onClick={() => handleAcceptClick(report)}
                                                className="px-[16px] py-[8px] rounded-[8px] bg-rose-600 text-white text-[14px] font-bold hover:bg-rose-700 shadow-sm hover:shadow-md transition-all duration-200 ease flex items-center justify-center gap-1.5 active:scale-95"
                                            >
                                                <HeartHandshake size={16} /> Accept
                                            </button>
                                        </div>
                                    )}
                                </motion.div>
                            ))}
                        </div>
                    ) : (
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="h-[600px] rounded-2xl overflow-hidden shadow-lg border border-slate-200 bg-slate-100 relative"
                        >
                            <MapContainer center={[6.9271, 79.8612]} zoom={11} style={{ height: '100%', width: '100%' }}>
                                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                {filteredReports.filter(r => r.latitude && r.longitude).map(report => (
                                    <Marker key={report.id} position={[report.latitude, report.longitude]}>
                                        <Popup>
                                            <div className="p-2 font-sans max-w-[200px]">
                                                <div className="flex items-center gap-2 mb-2">
                                                     <span className={getUrgencyColor(report.urgency)}>{report.urgency}</span>
                                                </div>
                                                <p className="text-xs font-medium text-slate-800 mb-2">{report.description}</p>
                                                {report.status === 'pending' && (
                                                    <button 
                                                        onClick={() => handleAcceptClick(report)}
                                                        className="w-full bg-rose-600 text-white py-1.5 rounded-[8px] text-[12px] font-bold shadow-sm hover:bg-rose-700 transition-all duration-200 ease"
                                                    >
                                                        Accept Mission
                                                    </button>
                                                )}
                                            </div>
                                        </Popup>
                                    </Marker>
                                ))}
                            </MapContainer>
                        </motion.div>
                    )}
                </motion.div>
              )}
          </AnimatePresence>

          {/* Scheduling Modal */}
          <AnimatePresence>
            {schedulingReport && (
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                >
                    <motion.div 
                        initial={{ scale: 0.9, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.9, y: 20 }}
                        className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl ring-1 ring-black/5"
                    >
                        <h3 className="text-lg font-bold text-slate-800 mb-1 flex items-center gap-2">
                            <Calendar className="text-rose-500" size={20} /> Schedule Pickup
                        </h3>
                        <p className="text-slate-500 text-sm mb-6">
                            Confirm pickup time for <strong>{schedulingReport.location}</strong>
                        </p>
                        
                        <div className="space-y-4 mb-6">
                             <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase">Date</label>
                                <input 
                                    type="date" 
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 text-sm focus:ring-2 focus:ring-rose-500 outline-none"
                                    value={pickupDate}
                                    onChange={e => setPickupDate(e.target.value)}
                                />
                            </div>
                            <div className="space-y-1">
                                 <label className="text-xs font-bold text-slate-500 uppercase">Time</label>
                                <input 
                                    type="time" 
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 text-sm focus:ring-2 focus:ring-rose-500 outline-none"
                                    value={pickupTime}
                                    onChange={e => setPickupTime(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Modal Actions - APPLIED BUTTON STANDARD (EXPLICIT PIXELS) */}
                        <div className="grid grid-cols-2 gap-3">
                            <button 
                                onClick={() => setSchedulingReport(null)}
                                className="px-[16px] py-[8px] rounded-[8px] font-bold text-slate-600 bg-transparent border border-slate-200 hover:bg-slate-50 hover:text-slate-800 transition-all duration-200 ease text-[14px]"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={confirmPickup}
                                className="px-[16px] py-[8px] rounded-[8px] font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-sm hover:shadow-md transition-all duration-200 ease text-[14px] active:scale-95"
                            >
                                Confirm
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
          </AnimatePresence>
      </main>
    </div>
  );
}

