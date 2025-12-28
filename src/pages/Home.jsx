import React from 'react';
import { Link } from 'react-router-dom';
import { Bell, Heart, Shield, ArrowRight, Activity, MapPin, Search } from 'lucide-react';

export default function Home() {
  return (
    <div className="page-container" style={{ paddingBottom: 0 }}>
      
      {/* Hero Section */}
      <section className="relative flex flex-col justify-center items-center text-center overflow-hidden" style={{ minHeight: '90vh' }}>
        
        {/* Immersive Background Image */}
        <div style={{ 
            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', 
            zIndex: -1,
            backgroundImage: `url('https://images.unsplash.com/photo-1450778869180-41d0601e046e?q=80&w=2500&auto=format&fit=crop')`, // Beautiful Dog Image
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'brightness(0.85)'
        }}></div>

        {/* Gradient Overlay for Text Readability */}
        <div style={{
            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
            zIndex: -1,
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.6) 100%)'
        }}></div>

        <div className="container animate-fade-in" style={{ position: 'relative', zIndex: 10 }}>
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full mb-8 backdrop-blur-md bg-white/10 border border-white/20 text-white font-semibold shadow-xl">
                 <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                 <span>Transforming Animal Welfare in Sri Lanka</span>
            </div>

            <h1 className="mb-6 font-bold text-white drop-shadow-lg" style={{ fontSize: 'clamp(3.5rem, 8vw, 6rem)', lineHeight: '1.05', letterSpacing: '-0.03em' }}>
              Every <span className="text-primary-light">Tail</span> Wags<br/>
              A Story of <span className="text-secondary-light">Hope.</span>
            </h1>
            
            <p className="mb-10 text-white/90 text-lg md:text-2xl max-w-2xl mx-auto leading-relaxed drop-shadow-md font-medium">
              Join a compassionate community dedicated to rescuing, healing, and loving stray animals. Your action today changes a life forever.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link to="/notify" className="btn btn-primary" style={{ padding: '1rem 2.5rem', fontSize: '1.1rem' }}>
                <Bell size={22} className="animate-bounce" /> Report an Animal
              </Link>
              <Link to="/adopt" className="btn" style={{ background: 'white', color: 'var(--text-main)', padding: '1rem 2.5rem', fontSize: '1.1rem' }}>
                <Heart size={22} className="text-accent" /> Adopt Contentment
              </Link>
            </div>
        </div>
        
        {/* Wave Divider at bottom */}
        <div style={{ position: 'absolute', bottom: -5, left: 0, width: '100%', overflow: 'hidden', lineHeight: 0 }}>
            <svg data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none" style={{ position: 'relative', display: 'block', width: 'calc(100% + 1.3px)', height: '100px' }}>
                <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z" className="fill-bg-main" style={{ fill: 'var(--bg-main)' }}></path>
            </svg>
        </div>
      </section>

      {/* Feature stats */}
      <section className="py-12 -mt-6 relative z-20">
         <div className="container">
             <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                 <StatCard number="200+" label="Rescues Connected" color="var(--primary)" />
                 <StatCard number="50+" label="Happy Adoptions" color="var(--accent)" />
                 <StatCard number="15+" label="Partner Clinics" color="var(--secondary)" />
                 <StatCard number="1k+" label="Community Members" color="var(--info)" />
             </div>
         </div>
      </section>

      {/* Cards Section */}
      <section className="section container">
        <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">How You Can Help</h2>
            <p className="text-xl text-muted max-w-2xl mx-auto">
                Whether you have 5 minutes or a forever home to offer, there are many ways to make a difference.
            </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <FeatureCard 
            icon={<MapPin size={40} className="text-white" />}
            title="Spot & Report"
            desc="See an animal in distress? Snap a photo and drop a pin. Our network of rescuers will be alerted instantly."
            action="Report Now"
            link="/notify"
            color="var(--accent)"
            delay="0s"
          />
          <FeatureCard 
            icon={<Heart size={40} className="text-white" />}
            title="Adopt Love"
            desc="Browse profiles of affectionate pets waiting for a home. Filter by breed, age, and location to find your match."
            action="Find a Friend"
            link="/adopt"
            color="var(--primary)"
            delay="0.1s"
          />
          <FeatureCard 
            icon={<Activity size={40} className="text-white" />}
            title="Vet Care"
            desc="Find trusted veterinary clinics nearby and book appointments for vaccinations or checkups effortlessly."
            action="Book Appointment"
            link="/find-vet"
            color="var(--secondary)"
            delay="0.2s"
          />
        </div>
      </section>
      
      {/* Call to Action */}
      <section className="container mb-24">
          <div className="glass-panel p-12 text-center relative overflow-hidden">
               {/* Decorative Circles */}
               <div className="absolute top-0 left-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
               <div className="absolute bottom-0 right-0 w-64 h-64 bg-secondary/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>
               
               <div className="relative z-10">
                   <h2 className="text-3xl font-bold mb-6">Ready to make a paw-sitive impact?</h2>
                   <p className="text-xl text-muted mb-8 max-w-2xl mx-auto">
                       Create an account today to track your reports, manage adoptions, and join our growing family of animal lovers.
                   </p>
                   <Link to="/auth" className="btn btn-primary px-8 py-4 text-lg shadow-xl hover:scale-105 transition-transform">
                       Join the Community
                   </Link>
               </div>
          </div>
      </section>

    </div>
  );
}

function FeatureCard({ icon, title, desc, action, link, color, delay }) {
  return (
    <div className="glass-panel p-8 flex flex-col items-start hover:scale-105 transition-transform duration-300 relative overflow-hidden group">
      <div 
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-lg rotate-3 group-hover:rotate-6 transition-transform"
        style={{ background: `linear-gradient(135deg, ${color}, ${color}dd)` }}
      >
        {icon}
      </div>
      <h3 className="text-2xl font-bold mb-3">{title}</h3>
      <p className="text-muted mb-8 leading-relaxed flex-1">{desc}</p>
      
      <Link to={link} className="flex items-center gap-2 font-bold group-hover:gap-3 transition-all" style={{ color: color }}>
        {action} <ArrowRight size={18} />
      </Link>
    </div>
  );
}

function StatCard({ number, label, color }) {
    return (
        <div className="glass-panel p-6 text-center hover:-translate-y-1 transition-transform">
            <div className="text-4xl font-bold mb-1" style={{ color }}>{number}</div>
            <div className="text-sm font-semibold text-muted uppercase tracking-wider">{label}</div>
        </div>
    )
}
