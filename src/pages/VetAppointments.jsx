import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Calendar, Clock, Check, X, User, MessageSquare } from 'lucide-react';

export default function VetAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending'); // 'pending', 'upcoming', 'history'

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('appointments')
        .select(`
            *,
            profiles:user_id (
                full_name,
                email,
                avatar_url,
                phone: id
            )
        `)
        .eq('vet_id', user.id)
        .order('date', { ascending: true });

      if (error) throw error;
      setAppointments(data || []);
    } catch (error) {
      console.error('Error fetching appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id, status) => {
      try {
          const { error } = await supabase
            .from('appointments')
            .update({ status })
            .eq('id', id);
          
          if (error) throw error;

          // Notify User
          const appointment = appointments.find(a => a.id === id);
          if (appointment) {
              await supabase.from('notifications').insert([{
                  user_id: appointment.user_id,
                  type: 'status_change',
                  message: `Your appointment on ${appointment.date} has been ${status}.`
              }]);
          }

          // Update local state
          setAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a));

      } catch (err) {
          console.error("Error updating appointment:", err);
          alert("Failed to update status");
      }
  };

  const filteredAppointments = appointments.filter(a => {
      if (filter === 'history') return ['completed', 'cancelled', 'rejected'].includes(a.status);
      return a.status === filter;
  });

  return (
    <div className="page-container flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Appointment Dashboard</h1>
        <p className="text-muted">Manage your clinic's schedule.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border pb-1 overflow-x-auto">
        {[
            { id: 'pending', label: 'Pending Requests' }, 
            { id: 'upcoming', label: 'Confirmed Upcoming' }, 
            { id: 'history', label: 'History' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`px-6 py-2 border-b-2 transition-colors font-medium text-lg capitalize whitespace-nowrap flex items-center gap-2 ${
                filter === tab.id
                    ? 'border-primary text-primary' 
                    : 'border-transparent text-muted hover:text-foreground'
            }`}
          >
            {tab.label}
            {tab.id === 'pending' && (() => {
                const count = appointments.filter(a => a.status === 'pending').length;
                return count > 0 ? (
                    <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                        {count}
                    </span>
                ) : null;
            })()}
          </button>
        ))}
      </div>

      <div className="grid gap-4">
          {loading ? (
              <div className="text-center py-12 text-muted">Loading...</div>
          ) : filteredAppointments.length === 0 ? (
              <div className="text-center py-16 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-muted">
                  No {filter} appointments.
              </div>
          ) : (
              filteredAppointments.map(app => (
                <div key={app.id} className="glass-panel p-6 flex flex-col sm:flex-row items-start sm:items-center gap-6">
                    
                    {/* Date/Time Box */}
                    <div className="bg-slate-50 p-4 rounded-xl flex flex-col items-center justify-center min-w-[100px] text-center border border-slate-100 shrink-0">
                        <span className="text-xl font-bold text-primary block leading-none mb-1">
                            {new Date(app.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }).split(' ')[1]}
                        </span>
                        <span className="text-sm font-bold text-gray-500 uppercase">
                            {new Date(app.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }).split(' ')[0]}
                        </span>
                        <div className="w-full h-px bg-slate-200 my-2"></div>
                        <span className="text-sm font-medium text-muted">{app.time_slot}</span>
                    </div>

                    {/* Info */}
                    <div className="flex-1">
                        <h3 className="text-xl font-bold mb-1 capitalize text-gray-900">{app.service_type}</h3>
                        <div className="flex items-center gap-2 text-sm text-muted font-medium mb-4">
                            <User size={16} /> {app.profiles?.full_name || 'Unknown User'}
                        </div>
                        
                        {/* Status Badge for Non-Pending */}
                        {['upcoming', 'completed', 'cancelled', 'rejected'].includes(app.status) && (
                            <span className={`
                                inline-block px-3 py-1 rounded-full text-xs font-bold capitalize
                                ${app.status === 'upcoming' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}
                            `}>
                                {app.status}
                            </span>
                        )}
                    </div>

                    {/* Actions */}
                    {app.status === 'pending' && (
                        <div className="flex sm:flex-col gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                            <button 
                                onClick={() => handleAction(app.id, 'upcoming')}
                                className="btn bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-none flex-1 sm:flex-none justify-center"
                            >
                                <Check size={16} /> Accept
                            </button>
                            <button 
                                onClick={() => handleAction(app.id, 'rejected')}
                                className="btn bg-rose-100 text-rose-700 hover:bg-rose-200 border-none flex-1 sm:flex-none justify-center"
                            >
                                <X size={16} /> Decline
                            </button>
                        </div>
                    )}

                </div>
              ))
          )}
      </div>
    </div>
  );
}
