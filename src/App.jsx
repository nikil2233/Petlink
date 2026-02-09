import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
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

import ResetPassword from './pages/ResetPassword';

import SuccessStories from './pages/SuccessStories';

import UserProfile from './pages/UserProfile';
import VerificationUpload from './pages/VerificationUpload';
import AdminDashboard from './pages/AdminDashboard';
import ShelterDashboard from './pages/ShelterDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import ChatDrawer from './components/ChatDrawer';

import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <Router>
      <Toaster 
        position="top-center" 
        toastOptions={{ 
          duration: 3000,
          style: {
            background: '#333',
            color: '#fff',
          },
          className: 'dark:bg-slate-800 dark:text-white',
        }} 
      />
      <Navbar />
      <ChatDrawer />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/success-stories" element={<SuccessStories />} />
        <Route path="/notify" element={<NotifyRescuer />} />
        <Route path="/rescuer-feed" element={<RescuerFeed />} />
        <Route path="/adopt" element={<AdoptionCenter />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/profile/:id" element={<UserProfile />} />
        <Route path="/book-appointment" element={<BookAppointment />} />
        <Route path="/find-vet" element={<FindVet />} />
        <Route path="/my-bookings" element={<MyBookings />} />
        <Route path="/adoption-requests" element={<AdoptionRequests />} />
        <Route path="/vet-appointments" element={<VetAppointments />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/lost-and-found" element={<LostAndFound />} />
        <Route path="/verify-account" element={<VerificationUpload />} />
        <Route 
          path="/admin" 
          element={
            <ProtectedRoute requireAdmin={true}>
              <AdminDashboard />
            </ProtectedRoute>
          } 
        />
        <Route path="/shelter-dashboard" element={<ShelterDashboard />} />
      </Routes>
      <Footer />
    </Router>
  );
}

export default App;
