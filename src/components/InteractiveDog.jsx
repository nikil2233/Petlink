import React, { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export default function InteractiveDog({ isEmailFocused, emailLength, isPasswordFocused }) {
  
  // --- BLINKING ---
  const [blink, setBlink] = useState(false);
  useEffect(() => {
    const loop = setInterval(() => {
        setBlink(true);
        setTimeout(() => setBlink(false), 200);
    }, 3500); 
    return () => clearInterval(loop);
  }, []);

  // --- LOGIC ---
  const { lookX, lookY, isIdle } = useMemo(() => {
    let x = 0, y = 0, idle = false;
    if (isPasswordFocused) {
        x = 0; y = 15;
    } else if (isEmailFocused && emailLength > 0) {
        const maxChars = 30;
        const current = Math.min(emailLength, maxChars);
        x = (current / maxChars) * 2 - 1;
        y = 5;
    } else {
        idle = true; 
    }
    return { lookX: x, lookY: y, isIdle: idle };
  }, [emailLength, isEmailFocused, isPasswordFocused]);

  const animState = isPasswordFocused ? "hide" : (isIdle ? "idle" : "focused");
  const springConfig = { type: "spring", stiffness: 120, damping: 14 };

  return (
    <div className="w-full flex justify-center -mb-8 pointer-events-none select-none relative z-10 w-full mb-8">
      <svg viewBox="0 0 300 220" className="w-[300px] h-[220px] overflow-visible drop-shadow-2xl">
        <defs>
             {/* --- 3D GRADIENTS --- */}
             <radialGradient id="dogFur" cx="50%" cy="30%" r="70%">
                <stop offset="0%" stopColor="#FBBF24" /> {/* Amber-400 */}
                <stop offset="100%" stopColor="#D97706" /> {/* Amber-600 */}
            </radialGradient>
            
            <radialGradient id="snoutGrad" cx="50%" cy="40%" r="50%">
                <stop offset="0%" stopColor="#FFFBEB" />
                <stop offset="100%" stopColor="#FEF3C7" />
            </radialGradient>
            
            <radialGradient id="eyeIris" cx="50%" cy="50%" r="50%">
                <stop offset="60%" stopColor="#854D0E" /> {/* Brown */}
                <stop offset="100%" stopColor="#451a03" /> {/* Dark Brown */}
            </radialGradient>

            <filter id="softShadow" x="-50%" y="-50%" width="200%" height="200%">
                 <feDropShadow dx="0" dy="5" stdDeviation="4" floodColor="#000" floodOpacity="0.2"/>
            </filter>
        </defs>

        {/* ================================================================= */}
        {/*                       THE DOG HEAD                                */}
        {/* ================================================================= */}
        <g transform="translate(150, 110)">
             {/* EARS (Floppy & Textured) */}
             <motion.g 
                animate={animState === 'focused' ? { x: lookX * -8, rotate: -lookX * 8 } : {}}
                transition={springConfig}
             >
                <path d="M-60 -50 Q -95 -100 -25 -60 Q -30 -30 -40 -10" fill="#B45309" stroke="#92400E" strokeWidth="2" filter="url(#softShadow)" />
                <path d="M60 -50 Q 95 -100 25 -60 Q 30 -30 40 -10" fill="#B45309" stroke="#92400E" strokeWidth="2" filter="url(#softShadow)" />
             </motion.g>

             {/* HEAD SHAPE (More defined cheeks) */}
             <motion.g 
                 animate={animState === 'focused' ? { x: lookX * 12, y: lookY, rotate: lookX * 6 } : { x: 0, y: 0, rotate: 0 }}
                 transition={springConfig}
             >
                 {/* Main Skull */}
                 <path d="M-60 -30 Q -70 -80 0 -85 Q 70 -80 60 -30 Q 75 10 50 45 Q 0 65 -50 45 Q -75 10 -60 -30" 
                       fill="url(#dogFur)" stroke="#D97706" strokeWidth="1" />
                 
                 {/* SNOUT AREA */}
                 <g transform="translate(0, 15)">
                     <ellipse cx="0" cy="0" rx="35" ry="26" fill="url(#snoutGrad)" />
                     
                     {/* Nose (Shiny) */}
                     <g transform="translate(0, -8)">
                        <path d="M-14 -4 Q 0 -8 14 -4 Q 0 12 -14 -4" fill="#451a03" />
                        <ellipse cx="-5" cy="-5" rx="4" ry="2" fill="white" opacity="0.3" transform="rotate(-20)" />
                     </g>
                     
                     {/* MOUTH & TONGUE */}
                     <g transform="translate(0, 8)">
                        {/* Tongue (Visible when Happy) */}
                        <motion.path 
                             d="M-10 6 Q 0 18 10 6" 
                             fill="#F43F5E" stroke="#BE123C" strokeWidth="1"
                             animate={isPasswordFocused ? { scale: 0, opacity: 0 } : { scale: 1, opacity: 1 }}
                        />
                        {/* Mouth Line */}
                        <motion.path 
                            d="M-15 -4 Q 0 10 15 -4" 
                            stroke="#451a03" strokeWidth="3" strokeLinecap="round" fill="none"
                            animate={isPasswordFocused ? { d: "M-10 0 Q 0 -5 10 0", strokeWidth: 2 } : { d: "M-15 -4 Q 0 10 15 -4" }}
                        />
                     </g>
                 </g>

                 {/* BLUSH (Embarrassed) */}
                 <motion.g animate={isPasswordFocused ? { opacity: 0.6, scale: 1 } : { opacity: 0, scale: 0 }}>
                     <circle cx="-45" cy="10" r="12" fill="#EF4444" filter="url(#softShadow)" />
                     <circle cx="45" cy="10" r="12" fill="#EF4444" filter="url(#softShadow)" />
                 </motion.g>

                 {/* EYES (Larger & Cuter) */}
                 <g transform="translate(0, -25)">
                     <motion.g animate={{ opacity: isPasswordFocused || blink ? 0 : 1 }}>
                         {/* Left Eye */}
                         <g transform="translate(-28, 0)">
                             <ellipse cx="0" cy="0" rx="18" ry="22" fill="white" stroke="#E5E7EB" strokeWidth="1"/>
                             <motion.g animate={{ x: lookX * 14, y: isEmailFocused ? 6 : 0 }}>
                                 <circle cx="2" cy="2" r="12" fill="url(#eyeIris)" />
                                 <circle cx="2" cy="2" r="6" fill="#1C1917" />
                                 <circle cx="6" cy="-4" r="4" fill="white" /> {/* Big Shine */}
                                 <circle cx="-2" cy="6" r="2" fill="white" opacity="0.5" />
                             </motion.g>
                         </g>
                         {/* Right Eye */}
                         <g transform="translate(28, 0)">
                             <ellipse cx="0" cy="0" rx="18" ry="22" fill="white" stroke="#E5E7EB" strokeWidth="1"/>
                             <motion.g animate={{ x: lookX * 14, y: isEmailFocused ? 6 : 0 }}>
                                 <circle cx="-2" cy="2" r="12" fill="url(#eyeIris)" />
                                 <circle cx="-2" cy="2" r="6" fill="#1C1917" />
                                 <circle cx="2" cy="-4" r="4" fill="white" /> {/* Big Shine */}
                                  <circle cx="-6" cy="6" r="2" fill="white" opacity="0.5" />
                             </motion.g>
                         </g>
                         
                         {/* Brows (Expressive) */}
                         <motion.path 
                             d="M-40 -28 Q -28 -38 -16 -28" 
                             stroke="#92400E" strokeWidth="4" strokeLinecap="round" fill="none" 
                             animate={{ y: isEmailFocused ? -6 : 0 }}
                         />
                         <motion.path 
                             d="M40 -28 Q 28 -38 16 -28" 
                             stroke="#92400E" strokeWidth="4" strokeLinecap="round" fill="none" 
                             animate={{ y: isEmailFocused ? -6 : 0 }}
                         />
                     </motion.g>

                     {/* Closed Eyes (Hiding/Blink) */}
                     <motion.g animate={{ opacity: isPasswordFocused || blink ? 1 : 0 }}>
                          <path d="M-38 -5 Q -28 5 -18 -5" stroke="#78350F" strokeWidth="4" strokeLinecap="round" fill="none" />
                          <path d="M38 -5 Q 28 5 18 -5" stroke="#78350F" strokeWidth="4" strokeLinecap="round" fill="none" />
                     </motion.g>
                 </g>
             </motion.g>

             {/* PAWS (Hands) */}
             <motion.g 
                animate={isPasswordFocused ? { y: -70, opacity: 1 } : { y: 60, opacity: 0 }}
                transition={{ type: "spring", stiffness: 100, damping: 15 }}
             >
                 {/* Left Paw */}
                 <circle cx="-40" cy="0" r="24" fill="#FBBF24" stroke="#B45309" strokeWidth="2" filter="url(#softShadow)" />
                 <circle cx="-40" cy="-5" r="8" fill="#FDE68A" opacity="0.6" /> {/* Pad */}
                 <path d="M-40 -24 L -40 -15 M -48 -20 L -45 -12 M -32 -20 L -35 -12" stroke="#B45309" strokeWidth="2" /> {/* Toes */}

                 {/* Right Paw */}
                 <circle cx="40" cy="0" r="24" fill="#FBBF24" stroke="#B45309" strokeWidth="2" filter="url(#softShadow)" />
                 <circle cx="40" cy="-5" r="8" fill="#FDE68A" opacity="0.6" /> {/* Pad */}
                 <path d="M40 -24 L 40 -15 M 32 -20 L 35 -12 M 48 -20 L 45 -12" stroke="#B45309" strokeWidth="2" /> {/* Toes */}
             </motion.g>
        </g>

      </svg>
    </div>
  );
}
