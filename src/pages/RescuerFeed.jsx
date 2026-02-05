import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, AlertTriangle, CheckCircle2, Clock, XCircle, HeartHandshake, Shield, Activity, Calendar, Siren, PawPrint, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

const SkeletonCard = () => (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col h-full animate-pulse transition-colors duration-300">
        <div className="flex items-start gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex-shrink-0" />
            <div className="flex-1 space-y-2">
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3" />
                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
            </div>
        </div>
        <div className="h-32 bg-slate-200 dark:bg-slate-700 rounded-xl mb-4 w-full" />
        <div className="space-y-2 flex-1">
             <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
             <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-2/3" />
        </div>
        <div className="flex gap-2 mt-4">
            <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded-lg flex-1" />
            <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded-lg w-12" />
        </div>
    </div>
);

export default function RescuerFeed() {
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'map'
  const [currentUser, setCurrentUser] = useState(null);
  
  const [accessDenied, setAccessDenied] = useState(false);

  // Scheduling Logic State
  const [schedulingReport, setSchedulingReport] = useState(null);
  const [pickupDate, setPickupDate] = useState('');
  const [pickupTime, setPickupTime] = useState('');
  
  // Detail View State
  const [selectedReport, setSelectedReport] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

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
          .select('role, is_admin')
          .eq('id', userId)
          .single();
      
      if (data) {
          if (data.is_admin) {
              fetchReports(userId, true);
              return;
          }

          if (!['rescuer', 'shelter', 'vet'].includes(data.role)) {
              setAccessDenied(true);
          } else {
              fetchReports(userId, false);
          }
      }
  };

  if (accessDenied) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 to-orange-50 dark:from-rose-950 dark:to-orange-950 p-6 transition-colors duration-300">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-12 rounded-[2.5rem] shadow-2xl border border-white/50 dark:border-slate-700/50 text-center max-w-lg w-full relative overflow-hidden"
              >
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-red-500/10 dark:bg-red-500/5 rounded-full blur-3xl -z-10"></div>
                  
                  <div className="text-8xl mb-6 animate-bounce">🚫</div>
                  
                  <h2 className="text-4xl font-black mb-4 bg-gradient-to-r from-red-600 to-rose-400 dark:from-red-400 dark:to-rose-300 bg-clip-text text-transparent">
                      Access Restricted
                  </h2>
                  
                  <p className="text-slate-500 dark:text-slate-400 text-lg mb-8 leading-relaxed">
                      This command center is reserved for verified <strong className="text-rose-600 dark:text-rose-400">Rescuers & NGOs</strong>. 
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

  const fetchReports = async (userId, isAdmin = false) => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('reports')
        .select(`
          *,
          profiles:profiles!reports_user_id_fkey (full_name, avatar_url, phone:id)
        `)
        .order('created_at', { ascending: false });

      // If NOT admin, only show assigned reports
      if (!isAdmin) {
          query = query.eq('assigned_rescuer_id', userId);
      }

      const { data, error } = await query;

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

          if (selectedReport?.id === reportId) {
              setSelectedReport(null);
          }

      } catch (err) {
          console.error("Error updating status:", err);
          toast.error("Failed to update status. Please try again.");
      }
  };

  const getUrgencyColor = (urgency) => {
      switch(urgency) {
          case 'critical': return 'items-center px-3 py-1 rounded-full text-xs font-bold bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/30 shadow-sm';
          case 'high': return 'items-center px-3 py-1 rounded-full text-xs font-bold bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-900/30 shadow-sm';
          case 'medium': return 'items-center px-3 py-1 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/30 shadow-sm';
          case 'low': return 'items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/30 shadow-sm';
          default: return 'items-center px-3 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700';
      }
  };

  const handleAcceptClick = (report, e) => {
      if(e) e.stopPropagation();
      setSchedulingReport(report);
      const tmr = new Date();
      tmr.setDate(tmr.getDate() + 1);
      setPickupDate(tmr.toISOString().split('T')[0]);
      setPickupTime('09:00');
  };

  const confirmPickup = async () => {
      if (!pickupDate || !pickupTime) {
          toast.error("Please select both date and time.");
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
                  title: 'Rescue Scheduled',
                  message: `We are coming to your place to pick the animal on ${pickupDate} at ${pickupTime}.`
              }]);
          
          if (notifyError) console.error("Notification Error:", notifyError);

          setReports(reports.map(r => 
              r.id === schedulingReport.id ? { ...r, status: 'accepted', expected_pickup_time: timestamp } : r
          ));

          setSchedulingReport(null);
          setSelectedReport(null);
          setSuccessMsg("Pickup scheduled successfully! We've notified the reporter.");
      } catch (err) {
          console.error("Error scheduling pickup:", err);
          toast.error("Failed to confirm pickup. Please try again.");
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-sans transition-colors duration-300">
      
      {/* Top Navigation / Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-30 shadow-sm/50 backdrop-blur-md bg-white/90 dark:bg-slate-800/90 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
                <div className="bg-rose-600 p-1.5 rounded-lg text-white shadow-sm shadow-rose-200 dark:shadow-rose-900/20">
                    <Shield size={18} />
                </div>
                <h1 className="text-lg font-bold text-slate-800 dark:text-white tracking-tight">Rescuer Portal</h1>
            </div>
            
            {/* View Mode Toggle */}
            <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-[8px] border border-slate-200 dark:border-slate-600 transition-colors duration-300">
                <button 
                    onClick={() => setViewMode('list')}
                    className={`px-3 py-1 rounded-[6px] text-xs font-bold transition-all duration-200 ease flex items-center gap-1.5 ${viewMode === 'list' ? 'bg-white dark:bg-slate-600 text-slate-800 dark:text-white shadow-sm ring-1 ring-slate-200 dark:ring-slate-500' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                >
                    <Activity size={12} /> List
                </button>
                <button 
                    onClick={() => setViewMode('map')}
                    className={`px-3 py-1 rounded-[6px] text-xs font-bold transition-all duration-200 ease flex items-center gap-1.5 ${viewMode === 'map' ? 'bg-white dark:bg-slate-600 text-slate-800 dark:text-white shadow-sm ring-1 ring-slate-200 dark:ring-slate-500' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
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
                  <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-1">Mission Control</h2>
                  <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Manage your active rescue assignments.</p>
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
                            ? 'bg-rose-600 text-white shadow-rose-200 dark:shadow-rose-900/20 ring-2 ring-rose-600 ring-offset-2 dark:ring-offset-slate-900' 
                            : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-rose-300 dark:hover:border-rose-700 hover:text-rose-600 dark:hover:text-rose-400'}`}
                  >
                      <div className={`transition-opacity duration-200 ${activeTab === 'pending' ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'}`}>
                          {activeTab === 'pending' ? (
                              <img src="/bell-new.png" alt="Alert" className="w-5 h-5 object-contain invert border-none" style={{ filter: 'brightness(0) invert(1)' }} />
                          ) : (
                              <img src="/bell-new.png" alt="Alert" className="w-5 h-5 object-contain dark:invert" />
                          )}
                      </div>
                      <span>New Alerts</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${activeTab === 'pending' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'}`}>
                          {pendingCount}
                      </span>
                  </button>

                  {/* Scheduled Button (Secondary) */}
                  <button 
                      onClick={() => setActiveTab('accepted')}
                      className={`flex items-center gap-2 px-[16px] py-[8px] rounded-[8px] text-[14px] font-medium shadow-sm transition-all duration-200 ease group
                        ${activeTab === 'accepted' 
                            ? 'bg-white dark:bg-slate-800 border-emerald-500 text-emerald-700 dark:text-emerald-400 ring-2 ring-emerald-500 ring-offset-2 dark:ring-offset-slate-900' 
                            : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-emerald-400 dark:hover:border-emerald-700 hover:text-emerald-600 dark:hover:text-emerald-400'}`}
                  >
                       <div className={`transition-opacity duration-200 ${activeTab === 'accepted' ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'}`}>
                          <img src="/calendar-scheduled.png" alt="Calendar" className="w-5 h-5 object-contain dark:invert" />
                       </div>
                       <span>Scheduled</span>
                       <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${activeTab === 'accepted' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'}`}>
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
                                <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-3xl bg-slate-50/50 dark:bg-slate-800/50">
                                    <div className="mx-auto w-16 h-16 bg-white dark:bg-slate-700 rounded-full flex items-center justify-center shadow-sm mb-3">
                                        <PawPrint className="text-slate-300 dark:text-slate-500" size={32} />
                                    </div>
                                    <h3 className="text-slate-800 dark:text-white font-bold mb-1">No reports found</h3>
                                    <p className="text-slate-400 dark:text-slate-500 text-sm">You are all caught up for {activeTab === 'pending' ? 'new alerts' : 'scheduled pickups'}.</p>
                                </div>
                            ) : filteredReports.map((report, index) => (
                                <motion.div 
                                    key={report.id} 
                                    onClick={() => setSelectedReport(report)}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    whileHover={{ y: -5, boxShadow: "0 10px 30px -10px rgba(0,0,0,0.1)" }}
                                    className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col h-full group cursor-pointer"
                                >
                                    {/* Compact Card Header */}
                                    <div className="flex items-start justify-between gap-3 mb-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden flex-shrink-0 border border-slate-100 dark:border-slate-600 relative">
                                                 {report.image_url ? (
                                                    <img src={report.image_url} alt="Pet" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-slate-400 dark:text-slate-500"><PawPrint size={18} /></div>
                                                )}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <span className={getUrgencyColor(report.urgency)}>
                                                        {report.urgency}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium flex items-center gap-1">
                                                        <Clock size={10} /> {new Date(report.created_at).toLocaleDateString()}
                                                    </span>
                                                </div>
                                                <h3 className="text-sm font-bold text-slate-800 dark:text-white line-clamp-1">{report.description}</h3>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Details */}
                                    <div className="space-y-2 mb-4 flex-1">
                                        <div className="flex items-start gap-2 bg-slate-50 dark:bg-slate-700/50 p-2 rounded-lg border border-slate-100/50 dark:border-slate-600/50">
                                            <MapPin size={14} className="text-slate-400 mt-0.5" />
                                            <div className="flex-1">
                                                <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed">{report.location || 'Unknown Location'}</p>
                                                {report.latitude && report.longitude && (
                                                    <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold mt-1 inline-block">Click to view details</span>
                                                )}
                                            </div>
                                        </div>
                                        
                                         {report.expected_pickup_time && (
                                            <div className="flex items-start gap-2 bg-emerald-50/50 dark:bg-emerald-900/10 p-2 rounded-lg border border-emerald-100 dark:border-emerald-800/30">
                                                <Calendar size={14} className="text-emerald-500 mt-0.5" />
                                                <div>
                                                    <p className="text-xs text-emerald-900 dark:text-emerald-300 font-medium">
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
                                                onClick={(e) => { e.stopPropagation(); updateReportStatus(report.id, 'declined'); }}
                                                className="px-[16px] py-[8px] rounded-[8px] border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 text-[14px] font-bold hover:border-rose-300 dark:hover:border-rose-700 hover:text-rose-600 dark:hover:text-rose-400 transition-all duration-200 ease"
                                            >
                                                Decline
                                            </button>
                                            
                                            {/* Primary Button: Solid Brand Color, White Text */}
                                            <button 
                                                onClick={(e) => handleAcceptClick(report, e)}
                                                className="px-[16px] py-[8px] rounded-[8px] bg-rose-600 dark:bg-rose-700 text-white text-[14px] font-bold hover:bg-rose-700 dark:hover:bg-rose-600 shadow-sm hover:shadow-md transition-all duration-200 ease flex items-center justify-center gap-1.5 active:scale-95"
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
                            className="h-[600px] rounded-2xl overflow-hidden shadow-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 relative"
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
                                                <button 
                                                    onClick={() => setSelectedReport(report)}
                                                    className="w-full mt-2 text-rose-600 text-[10px] font-bold hover:underline"
                                                >
                                                    View Details
                                                </button>
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

          {/* Report Detail Modal */}
          <AnimatePresence>
              {selectedReport && (
                  <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto"
                      onClick={() => setSelectedReport(null)}
                  >
                      <motion.div 
                          initial={{ scale: 0.9, y: 30 }}
                          animate={{ scale: 1, y: 0 }}
                          exit={{ scale: 0.9, y: 30 }}
                          className="bg-white dark:bg-slate-800 rounded-[2rem] max-w-2xl w-full shadow-2xl overflow-hidden relative"
                          onClick={e => e.stopPropagation()}
                      >
                          {/* Close Button */}
                          <button 
                              onClick={() => setSelectedReport(null)}
                              className="absolute top-4 right-4 p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/40 transition-colors z-10"
                          >
                              <XCircle size={24} />
                          </button>

                          {/* Image Header */}
                          <div className="h-64 md:h-80 w-full bg-slate-100 dark:bg-slate-900 relative">
                              {selectedReport.image_url ? (
                                  <img src={selectedReport.image_url} alt="Report" className="w-full h-full object-cover" />
                              ) : (
                                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800">
                                      <PawPrint size={48} className="mb-2 opacity-50" />
                                      <span className="font-bold">No Image Provided</span>
                                  </div>
                              )}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                              <div className="absolute bottom-6 left-6 text-white max-w-lg">
                                    <div className="flex items-center gap-3 mb-2">
                                      <span className={`${getUrgencyColor(selectedReport.urgency)} !bg-white/20 !text-white !border-white/20 backdrop-blur-sm`}>
                                          {selectedReport.urgency}
                                      </span>
                                      <span className="flex items-center gap-1 text-sm font-medium opacity-90 box-border px-2 py-1 rounded bg-black/20 backdrop-blur-sm">
                                          <Clock size={14} /> {new Date(selectedReport.created_at).toLocaleString()}
                                      </span>
                                    </div>
                                    {selectedReport.profiles && (
                                        <div className="flex items-center gap-2 text-sm font-medium opacity-90 transition-opacity hover:opacity-100">
                                            <span className="opacity-70">Reported by:</span>
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigate(`/profile/${selectedReport.user_id}`);
                                                }}
                                                className="font-bold border-b border-transparent hover:border-white transition-all flex items-center gap-1.5 bg-black/20 px-2 py-1 rounded-lg backdrop-blur-sm hover:bg-white/20"
                                            >
                                                {selectedReport.profiles.avatar_url ? (
                                                    <img src={selectedReport.profiles.avatar_url} className="w-5 h-5 rounded-full object-cover border border-white/50" alt="" />
                                                ) : (
                                                    <User size={14} />
                                                )}
                                                {selectedReport.profiles.full_name || 'Anonymous'}
                                            </button>
                                        </div>
                                    )}
                              </div>
                          </div>

                          <div className="p-8">
                              <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-6">{selectedReport.description}</h2>

                              <div className="grid md:grid-cols-2 gap-8 mb-8">
                                  {/* Location Block */}
                                  <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-600">
                                      <div className="flex items-center gap-2 mb-2 font-bold text-slate-700 dark:text-slate-200">
                                          <MapPin size={18} className="text-rose-500" /> Location Details
                                      </div>
                                      <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed mb-4">{selectedReport.location}</p>
                                      
                                      {selectedReport.latitude && selectedReport.longitude ? (
                                          <div className="h-32 rounded-xl overflow-hidden relative border border-slate-200 dark:border-slate-600 shadow-sm group cursor-pointer">
                                              <img 
                                                src={`https://static-maps.yandex.ru/1.x/?lang=en-US&ll=${selectedReport.longitude},${selectedReport.latitude}&z=15&l=map&size=600,300&pt=${selectedReport.longitude},${selectedReport.latitude},pm2rdm`} 
                                                alt="Map"
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                                              />
                                              <a 
                                                  href={`https://www.google.com/maps?q=${selectedReport.latitude},${selectedReport.longitude}`} 
                                                  target="_blank" 
                                                  rel="noreferrer"
                                                  className="absolute inset-0 bg-black/10 hover:bg-black/20 flex items-center justify-center transition-colors"
                                              >
                                                   <span className="bg-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-md text-cyan-900">Open in Google Maps</span>
                                              </a>
                                          </div>
                                      ) : (
                                          <div className="text-xs text-slate-400 italic">No GPS coordinates available.</div>
                                      )}
                                  </div>

                                  {/* Status Block */}
                                  <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-600 flex flex-col justify-center text-center">
                                      <span className="text-slate-400 dark:text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Current Status</span>
                                      <div className="text-xl font-black capitalize text-slate-800 dark:text-white mb-4">{selectedReport.status}</div>
                                      
                                      {selectedReport.status === 'pending' ? (
                                          <div className="p-3 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-bold rounded-xl border border-amber-100 dark:border-amber-900/40">
                                              Awaiting Acceptance
                                          </div>
                                      ) : (
                                          <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold rounded-xl border border-emerald-100 dark:border-emerald-900/40">
                                              Action Taken
                                          </div>
                                      )}
                                  </div>
                              </div>

                              {/* Action Footer */}
                              {selectedReport.status === 'pending' && (
                                  <div className="flex gap-4 pt-6 border-t border-slate-100 dark:border-slate-700">
                                      <button 
                                          onClick={() => { updateReportStatus(selectedReport.id, 'declined'); setSelectedReport(null); }}
                                          className="flex-1 py-4 rounded-xl font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                                      >
                                          Decline Report
                                      </button>
                                      <button 
                                          onClick={() => { setSelectedReport(null); handleAcceptClick(selectedReport); }}
                                          className="flex-1 py-4 rounded-xl font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-lg shadow-rose-200 dark:shadow-rose-900/20 transition-all flex items-center justify-center gap-2"
                                      >
                                          <Siren size={20} /> Accept Mission
                                      </button>
                                  </div>
                              )}
                          </div>
                      </motion.div>
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
                        className="bg-white dark:bg-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl ring-1 ring-black/5 dark:ring-white/5"
                    >
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1 flex items-center gap-2">
                            <Calendar className="text-rose-500" size={20} /> Schedule Pickup
                        </h3>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
                            Confirm pickup time for <strong>{schedulingReport.location}</strong>
                        </p>
                        
                        <div className="space-y-4 mb-6">
                             <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase">Date</label>
                                <input 
                                    type="date" 
                                    className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-slate-700 dark:text-white text-sm focus:ring-2 focus:ring-rose-500 outline-none"
                                    value={pickupDate}
                                    onChange={e => setPickupDate(e.target.value)}
                                />
                            </div>
                            <div className="space-y-1">
                                 <label className="text-xs font-bold text-slate-500 uppercase">Time</label>
                                <input 
                                    type="time" 
                                    className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-slate-700 dark:text-white text-sm focus:ring-2 focus:ring-rose-500 outline-none"
                                    value={pickupTime}
                                    onChange={e => setPickupTime(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Modal Actions - APPLIED BUTTON STANDARD (EXPLICIT PIXELS) */}
                        <div className="grid grid-cols-2 gap-3">
                            <button 
                                onClick={() => setSchedulingReport(null)}
                                className="px-[16px] py-[8px] rounded-[8px] font-bold text-slate-600 dark:text-slate-400 bg-transparent border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-white transition-all duration-200 ease text-[14px]"
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

          {/* Success Modal */}
          <AnimatePresence>
            {successMsg && (
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[60] flex items-center justify-center p-4"
                >
                    <motion.div 
                        initial={{ scale: 0.9, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.9, y: 20 }}
                        className="bg-white dark:bg-slate-800 rounded-[2rem] p-8 max-w-sm w-full shadow-2xl text-center relative overflow-hidden ring-1 ring-white/50 dark:ring-white/10"
                    >
                        {/* Decorative Background */}
                        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-emerald-50 to-transparent dark:from-emerald-900/20 -z-10"></div>
                        <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-6 shadow-none animate-bounce-slow">
                            <CheckCircle2 size={40} className="text-emerald-500 dark:text-emerald-400" />
                        </div>
                        
                        <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-2">Success!</h3>
                        <p className="text-slate-500 dark:text-slate-400 font-medium mb-8 leading-relaxed">
                            {successMsg}
                        </p>

                        <button 
                            onClick={() => setSuccessMsg(null)}
                            className="w-full py-3.5 rounded-xl bg-slate-900 dark:bg-slate-700 text-white font-bold text-lg shadow-lg shadow-slate-200 dark:shadow-none hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                        >
                            Awesome
                        </button>
                    </motion.div>
                </motion.div>
            )}
          </AnimatePresence>
      </main>
    </div>
  );
}

