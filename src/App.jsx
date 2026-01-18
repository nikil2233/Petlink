import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Auth from './pages/Auth';
import NotifyRescuer from './pages/NotifyRescuer';
import RescuerFeed from './pages/RescuerFeed';
import AdoptionCenter from './pages/AdoptionCenter';
import Profile from './pages/Profile';
import BookAppointment from './pages/BookAppointment';
import FindVet from './pages/FindVet';
import MyBookings from './pages/MyBookings';
import AdoptionRequests from './pages/AdoptionRequests';
import VetAppointments from './pages/VetAppointments';
import Notifications from './pages/Notifications';
import LostAndFound from './pages/LostAndFound';
import './index.css';
import './App.css';
import 'leaflet/dist/leaflet.css';

function App() {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/notify" element={<NotifyRescuer />} />
        <Route path="/rescuer-feed" element={<RescuerFeed />} />
        <Route path="/adopt" element={<AdoptionCenter />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/book-appointment" element={<BookAppointment />} />
        <Route path="/find-vet" element={<FindVet />} />
        <Route path="/my-bookings" element={<MyBookings />} />
        <Route path="/adoption-requests" element={<AdoptionRequests />} />
        <Route path="/vet-appointments" element={<VetAppointments />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/lost-and-found" element={<LostAndFound />} />
      </Routes>
    </Router>
  );
}

export default App;
