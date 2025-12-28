import React, { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, AlertCircle, CheckCircle, XCircle, Syringe, Stethoscope } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';

export default function MyBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return; // Or redirect

      const { data, error } = await supabase
        .from('appointments')
        .select(`
            *,
            vet:vet_id (
                full_name,
                location,
                address
            )
        `)
        .eq('user_id', user.id)
        .order('date', { ascending: true });

      if (error) throw error;
      setBookings(data || []);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (id) => {
    if (window.confirm('Are you sure you want to cancel this appointment?')) {
      try {
        const { error } = await supabase
            .from('appointments')
            .update({ status: 'cancelled' })
            .eq('id', id);

        if (error) throw error;

        // Update local state
        setBookings(bookings.map(booking => 
            booking.id === id ? { ...booking, status: 'cancelled' } : booking
        ));
      } catch (err) {
        console.error("Error cancelling appointment:", err);
        alert("Failed to cancel appointment");
      }
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'upcoming': return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'completed': return 'text-emerald-600 bg-emerald-50 border-emerald-200';
      case 'cancelled': return 'text-rose-600 bg-rose-50 border-rose-200';
      default: return 'text-slate-600 bg-slate-50 border-slate-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'upcoming': return <Clock size={16} />;
      case 'completed': return <CheckCircle size={16} />;
      case 'cancelled': return <XCircle size={16} />;
      default: return <AlertCircle size={16} />;
    }
  };

  // Helper to format date nicely
  const formatDate = (dateString) => {
      return new Date(dateString).toLocaleDateString('en-US', {
          year: 'numeric', month: 'long', day: 'numeric'
      });
  };

  return (
    <div className="page-container flex flex-col gap-8 min-h-[calc(100vh-4rem)]">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">My Bookings</h1>
          <p className="text-muted">Manage your pet's appointments</p>
        </div>
        <Link to="/book-appointment" className="btn btn-primary">
          New Appointment
        </Link>
      </div>

      <div className="grid gap-6">
        {loading ? (
             <div className="text-center py-12 text-muted">Loading appointments...</div>
        ) : bookings.length === 0 ? (
          <div className="glass-panel text-center py-16 flex flex-col items-center">
            <Calendar size={64} className="text-slate-200 mb-4" />
            <h3 className="text-xl font-bold mb-2">No appointments found</h3>
            <p className="text-muted mb-6">Book your first appointment to get started.</p>
            <Link to="/book-appointment" className="btn btn-primary">
              Book Now
            </Link>
          </div>
        ) : (
          bookings.map(booking => (
            <div key={booking.id} className="glass-panel p-6 flex flex-col md:flex-row gap-6 items-start md:items-center transition-all hover:shadow-md">
              
              {/* Icon */}
              <div className={`
                w-16 h-16 rounded-full flex items-center justify-center shrink-0
                ${booking.service_type === 'sterilization' ? 'bg-red-100 text-red-500' : 'bg-blue-100 text-blue-500'}
              `}>
                {booking.service_type === 'sterilization' ? <Stethoscope size={28} /> : <Syringe size={28} />}
              </div>

              {/* Details */}
              <div className="flex-1 w-full">
                <div className="flex flex-wrap gap-3 items-center mb-1">
                  <h3 className="text-xl font-bold capitalize">{booking.service_type}</h3>
                  <span className={`
                    flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border capitalize
                    ${booking.status === 'upcoming' ? 'bg-amber-50 text-amber-600 border-amber-200' : ''}
                    ${booking.status === 'completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : ''}
                    ${booking.status === 'cancelled' ? 'bg-rose-50 text-rose-600 border-rose-200' : ''}
                    ${booking.status === 'pending' ? 'bg-slate-100 text-slate-600 border-slate-200' : ''}
                  `}>
                    {getStatusIcon(booking.status)}
                    {booking.status}
                  </span>
                </div>
                
                <div className="text-base font-semibold text-gray-700 mb-3">
                  {booking.vet?.full_name || 'Unknown Clinic'}
                </div>

                <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-primary" /> 
                    <span className="font-medium text-gray-900">{formatDate(booking.date)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock size={16} className="text-primary" /> 
                    <span className="font-medium text-gray-900">{booking.time_slot}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin size={16} className="text-primary" /> 
                    <span className="line-clamp-1">{booking.vet?.location || booking.vet?.address || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              {booking.status === 'upcoming' || booking.status === 'pending' ? (
                <button 
                  onClick={() => handleCancel(booking.id)}
                  className="btn bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300 w-full md:w-auto justify-center"
                >
                  Cancel
                </button>
              ) : null}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
