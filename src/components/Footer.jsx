import React from 'react';
import { Link } from 'react-router-dom';
import { PawPrint, Heart, Mail, Phone, MapPin, Facebook, Twitter, Instagram, Linkedin, Shield } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-slate-900 border-t border-slate-800 text-slate-300 py-12 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          
          {/* Brand Column */}
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="relative flex items-center justify-center w-8 h-8">
                  <div className="relative z-10 text-white">
                      <Shield size={28} className="text-rose-600 fill-rose-900/30" />
                      <div className="absolute inset-0 flex items-center justify-center pt-1">
                          <PawPrint size={14} className="text-rose-200 fill-current" />
                      </div>
                  </div>
              </div>
              <span className="text-xl font-black text-white tracking-tighter leading-none flex items-center gap-0.5">
                Pet<span className="text-rose-500">Link</span>
              </span>
            </Link>
            <p className="text-slate-500 text-sm leading-relaxed">
              Connecting pets with loving homes and providing rescue support through a community-driven platform.
            </p>
            <div className="flex gap-4 pt-2">
              <SocialIcon icon={Facebook} />
              <SocialIcon icon={Twitter} />
              <SocialIcon icon={Instagram} />
              <SocialIcon icon={Linkedin} />
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-bold mb-6">Quick Links</h4>
            <ul className="space-y-3 text-sm">
              <li><FooterLink to="/">Home</FooterLink></li>
              <li><FooterLink to="/adopt">Adopt a Pet</FooterLink></li>
              <li><FooterLink to="/notify">Report Stray</FooterLink></li>
              <li><FooterLink to="/find-vet">Find a Vet</FooterLink></li>
              <li><FooterLink to="/success-stories">Success Stories</FooterLink></li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-white font-bold mb-6">Resources</h4>
            <ul className="space-y-3 text-sm">
              <li><FooterLink to="/lost-and-found">Lost & Found</FooterLink></li>
              <li><FooterLink to="/rescuer-feed">Rescuer Feed</FooterLink></li>
              <li><FooterLink to="/auth">Login / Register</FooterLink></li>
              <li><span className="text-slate-500 cursor-not-allowed">Privacy Policy</span></li>
              <li><span className="text-slate-500 cursor-not-allowed">Terms of Service</span></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white font-bold mb-6">Contact Us</h4>
            <ul className="space-y-4 text-sm">
              <li className="flex items-start gap-3">
                <MapPin size={18} className="text-rose-500 shrink-0 mt-0.5" />
                <span>123 Rescue Lane, Pet City<br/>CA 90210, USA</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone size={18} className="text-rose-500 shrink-0" />
                <span>+1 (555) 123-4567</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail size={18} className="text-rose-500 shrink-0" />
                <span>support@petlink.com</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-500">
          <p>&copy; {currentYear} PetLink Network. All rights reserved.</p>
          <div className="flex items-center gap-2">
            <span>Made with</span>
            <Heart size={12} className="text-rose-500 fill-rose-500" />
            <span>by Pet Lovers</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

const FooterLink = ({ to, children }) => (
  <Link to={to} className="hover:text-rose-500 transition-colors block w-fit">
    {children}
  </Link>
);

const SocialIcon = ({ icon: Icon }) => (
  <a href="#" className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center hover:bg-rose-600 hover:text-white transition-all text-slate-400">
    <Icon size={16} />
  </a>
);
