import React from 'react';

// --- CSS Animations ---
const petStyles = `
  @keyframes blink {
    0%, 90%, 100% { transform: scaleY(1); }
    95% { transform: scaleY(0.1); }
  }
  @keyframes earWiggleLeft {
    0%, 100% { transform: rotate(-10deg); }
    50% { transform: rotate(-20deg); }
  }
  @keyframes earWiggleRight {
    0%, 100% { transform: rotate(10deg); }
    50% { transform: rotate(20deg); }
  }
  @keyframes whiskerTwitch {
    0%, 100% { transform: rotate(0deg); }
    25% { transform: rotate(-5deg); }
    75% { transform: rotate(5deg); }
  }
  @keyframes birdWingFlap {
    0% { transform: rotate(0deg) scaleY(1); }
    50% { transform: rotate(-30deg) scaleY(0.8); }
    100% { transform: rotate(0deg) scaleY(1); }
  }
  @keyframes tailWag {
    0%, 100% { transform: rotate(0deg); }
    50% { transform: rotate(15deg); }
  }
`;

export const AnimatedDog = ({ className = "" }) => (
  <svg viewBox="0 0 100 100" className={className} style={{ width: '100%', height: '100%', overflow: 'visible' }}>
    <style>{petStyles}</style>
    {/* Head */}
    <path d="M20,40 Q20,10 50,10 Q80,10 80,40 L80,70 Q80,90 50,90 Q20,90 20,70 Z" fill="#E8B87D" stroke="#5D4037" strokeWidth="2" />
    
    {/* Snoot/Mouth */}
    <ellipse cx="50" cy="65" rx="15" ry="12" fill="#FFE0B2" />
    <path d="M50,60 L46,65 L54,65 Z" fill="#3E2723" /> {/* Nose */}
    <path d="M50,65 Q50,72 45,72 M50,65 Q50,72 55,72" stroke="#3E2723" strokeWidth="1.5" fill="none" />
    
    {/* Eyes */}
    <g style={{ animation: 'blink 4s infinite' }}>
      <ellipse cx="38" cy="45" rx="4" ry="5" fill="#3E2723" />
      <ellipse cx="62" cy="45" rx="4" ry="5" fill="#3E2723" />
      <circle cx="39" cy="43" r="1.5" fill="white" />
      <circle cx="63" cy="43" r="1.5" fill="white" />
    </g>

    {/* Ears - Wiggling */}
    <g style={{ transformOrigin: '20px 25px', animation: 'earWiggleLeft 2s ease-in-out infinite' }}>
       <path d="M20,25 Q10,20 5,40 Q10,60 25,50" fill="#cc9b60" stroke="#5D4037" strokeWidth="2" />
    </g>
    <g style={{ transformOrigin: '80px 25px', animation: 'earWiggleRight 2s ease-in-out infinite' }}>
       <path d="M80,25 Q90,20 95,40 Q90,60 75,50" fill="#cc9b60" stroke="#5D4037" strokeWidth="2" />
    </g>
  </svg>
);

export const AnimatedCat = ({ className = "" }) => (
  <svg viewBox="0 0 100 100" className={className} style={{ width: '100%', height: '100%', overflow: 'visible' }}>
    {/* Head */}
    <path d="M25,35 L20,10 L40,25 Q50,22 60,25 L80,10 L75,35 Q90,45 85,75 Q80,90 50,90 Q20,90 15,75 Q10,45 25,35 Z" fill="#9E9E9E" stroke="#424242" strokeWidth="2" />
    
    {/* Inner Ears */}
    <path d="M25,35 L23,18 L38,28 Z" fill="#FFAB91" />
    <path d="M75,35 L77,18 L62,28 Z" fill="#FFAB91" />

    {/* Eyes */}
    <g style={{ animation: 'blink 5s infinite 1s' }}>
      <ellipse cx="38" cy="50" rx="6" ry="8" fill="#FFEB3B" stroke="#F57F17" strokeWidth="1" />
      <ellipse cx="62" cy="50" rx="6" ry="8" fill="#FFEB3B" stroke="#F57F17" strokeWidth="1" />
      <ellipse cx="38" cy="50" rx="2" ry="6" fill="black" />
      <ellipse cx="62" cy="50" rx="2" ry="6" fill="black" />
    </g>

    {/* Nose and Mouth */}
    <polygon points="47,65 53,65 50,70" fill="#F48FB1" />
    <path d="M50,70 Q45,75 40,72 M50,70 Q55,75 60,72" stroke="#424242" strokeWidth="1.5" fill="none" />

    {/* Whiskers - Twitching */}
    <g style={{ transformOrigin: '50% 65%', animation: 'whiskerTwitch 3s infinite' }}>
       <line x1="42" y1="68" x2="20" y2="65" stroke="#FFFFFF" strokeWidth="1"/>
       <line x1="42" y1="70" x2="20" y2="72" stroke="#FFFFFF" strokeWidth="1"/>
       <line x1="58" y1="68" x2="80" y2="65" stroke="#FFFFFF" strokeWidth="1"/>
       <line x1="58" y1="70" x2="80" y2="72" stroke="#FFFFFF" strokeWidth="1"/>
    </g>
  </svg>
);

export const AnimatedParrot = ({ className = "" }) => (
  <svg viewBox="0 0 100 100" className={className} style={{ width: '100%', height: '100%', overflow: 'visible' }}>
    {/* Body */}
    <path d="M70,30 Q90,30 90,50 Q90,80 50,80 L20,50 Q30,30 70,30" fill="#4CAF50" stroke="#1B5E20" strokeWidth="2" />
    
    {/* Beak */}
    <path d="M85,35 Q95,35 95,45 L85,45 Z" fill="#212121" />
    <path d="M85,45 L95,45 Q85,55 80,48 Z" fill="#424242" />

    {/* Eye */}
    <circle cx="80" cy="40" r="4" fill="white" />
    <circle cx="81" cy="40" r="1.5" fill="black" />

    {/* Tail feathers */}
    <path d="M20,50 L5,45 L15,55 L5,65 L25,60" fill="#C62828" stroke="#B71C1C" strokeWidth="1" />

    {/* Wing - Flapping */}
    <g style={{ transformOrigin: '60px 50px', animation: 'birdWingFlap 0.2s linear infinite' }}>
       <path d="M60,50 Q80,40 90,60 Q60,70 50,60 Z" fill="#81C784" stroke="#2E7D32" strokeWidth="2" />
       <path d="M60,50 Q75,45 80,60 Q60,65 55,60 Z" fill="#FFEB3B" opacity="0.6" />
    </g>
  </svg>
);
