import React, { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export default function InteractivePets({ isEmailFocused, emailLength, isPasswordFocused }) {
  
  // --- BLINKING ---
  const [blink, setBlink] = useState(false);
  useEffect(() => {
    const loop = setInterval(() => {
        setBlink(true);
        setTimeout(() => setBlink(false), 150);
    }, 4000);
    return () => clearInterval(loop);
  }, []);

  // --- LOGIC ---
  const { lookX, lookY, isIdle } = useMemo(() => {
    let x = 0, y = 0, idle = false;
    if (isPasswordFocused) {
        x = 0; y = 20; // Look Down
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
  
  // Physics parameters
  const springConfig = { type: "spring", stiffness: 120, damping: 14 };

  return (
    <div className="w-full flex justify-center -mb-8 pointer-events-none select-none relative z-10">
      <svg viewBox="0 0 500 250" className="w-[400px] h-[200px] overflow-visible drop-shadow-xl">
        <defs>
             {/* DOG (Golden) */}
            <radialGradient id="dogFaceGrad" cx="50%" cy="40%" r="60%">
                <stop offset="0%" stopColor="#FBBF24" /> {/* Amber-400 */}
                <stop offset="100%" stopColor="#D97706" /> {/* Amber-600 */}
            </radialGradient>
             {/* CAT (Silver/Blue) */}
            <radialGradient id="catFaceGrad" cx="50%" cy="40%" r="60%">
                <stop offset="0%" stopColor="#E2E8F0" /> {/* Slate-200 */}
                <stop offset="100%" stopColor="#94A3B8" /> {/* Slate-400 */}
            </radialGradient>
            <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
        </defs>

        {/* ================================================================= */}
        {/*                       DOG CHARACTER (LEFT)                        */}
        {/*                       Center X = 150                              */}
        {/* ================================================================= */}
        <motion.g 
            initial={{ y: 50 }} 
            animate={{ y: 50 }} // Base position
            transition={springConfig}
        >
             {/* --- DOG EARS (Behind Head) --- */}
             <motion.g 
                transform="translate(150, 100)"
                animate={animState === 'focused' ? { x: lookX * -8, rotate: -lookX * 5 } : { rotate: 0 }}
             >
                <path d="M-60 -40 Q -90 -90 -20 -70" fill="#B45309" stroke="#92400E" strokeWidth="3" />
                <path d="M60 -40 Q 90 -90 20 -70" fill="#B45309" stroke="#92400E" strokeWidth="3" />
             </motion.g>

             {/* --- DOG HEAD --- */}
             <motion.g 
                 transform="translate(150, 100)" // Centered at 150, 100 relative to SVG
                 animate={animState === 'focused' ? { x: lookX * 10, y: lookY, rotate: lookX * 5 } : { x: 0, y: 0, rotate: 0 }}
                 transition={springConfig}
             >
                 {/* Face Shape */}
                 <circle cx="0" cy="0" r="70" fill="url(#dogFaceGrad)" stroke="#B45309" strokeWidth="3" />
                 
                 {/* Snout */}
                 <g transform="translate(0, 20)">
                    <ellipse cx="0" cy="0" rx="30" ry="22" fill="#FFFBEB" />
                    <path d="M-12 -6 Q 0 -10 12 -6 Q 0 10 -12 -6" fill="#451a03" /> {/* Nose */}
                 </g>

                 {/* Eyes Container */}
                 <g transform="translate(0, -20)">
                     {/* Open Eyes */}
                     <motion.g animate={{ opacity: isPasswordFocused || blink ? 0 : 1 }}>
                         <g transform="translate(-25, 0)">
                             <ellipse cx="0" cy="0" rx="16" ry="20" fill="white" stroke="#E5E7EB" strokeWidth="1"/>
                             <motion.g animate={{ x: lookX * 12, y: isEmailFocused ? 6 : 0 }}>
                                 <circle cx="0" cy="2" r="10" fill="#78350F" />
                                 <circle cx="0" cy="3" r="5" fill="#1C1917" />
                                 <circle cx="4" cy="-2" r="4" fill="white" />
                             </motion.g>
                         </g>
                         <g transform="translate(25, 0)">
                             <ellipse cx="0" cy="0" rx="16" ry="20" fill="white" stroke="#E5E7EB" strokeWidth="1"/>
                             <motion.g animate={{ x: lookX * 12, y: isEmailFocused ? 6 : 0 }}>
                                 <circle cx="0" cy="2" r="10" fill="#78350F" />
                                 <circle cx="0" cy="3" r="5" fill="#1C1917" />
                                 <circle cx="4" cy="-2" r="4" fill="white" />
                             </motion.g>
                         </g>
                     </motion.g>
                     
                     {/* Closed Eyes */}
                     <motion.g animate={{ opacity: isPasswordFocused || blink ? 1 : 0 }}>
                         <path d="M-40 0 Q -25 10 -10 0" fill="none" stroke="#78350F" strokeWidth="4" strokeLinecap="round" />
                         <path d="M40 0 Q 25 10 10 0" fill="none" stroke="#78350F" strokeWidth="4" strokeLinecap="round" />
                     </motion.g>
                 </g>

                 {/* Brows */}
                 <motion.g animate={{ y: isEmailFocused ? -5 : 0 }}>
                    <path d="M-45 -55 Q -25 -65 -15 -55" fill="none" stroke="#92400E" strokeWidth="4" strokeLinecap="round" />
                    <path d="M45 -55 Q 25 -65 15 -55" fill="none" stroke="#92400E" strokeWidth="4" strokeLinecap="round" />
                 </motion.g>
             </motion.g>

             {/* --- DOG PAWS --- */}
             <motion.g 
                 transform="translate(150, 200)"
                 animate={isPasswordFocused ? { y: -60, opacity: 1 } : { y: 20, opacity: 0 }}
             >
                 <circle cx="-35" cy="0" r="22" fill="#FBBF24" stroke="#B45309" strokeWidth="3" />
                 <circle cx="35" cy="0" r="22" fill="#FBBF24" stroke="#B45309" strokeWidth="3" />
             </motion.g>
        </motion.g>


        {/* ================================================================= */}
        {/*                       CAT CHARACTER (RIGHT)                       */}
        {/*                       Center X = 350                              */}
        {/* ================================================================= */}
        <motion.g 
            initial={{ y: 60 }} 
            animate={{ y: 60 }} // Base Position
            transition={springConfig}
        >
             {/* --- CAT EARS --- */}
             <motion.g 
                transform="translate(350, 100)"
                animate={animState === 'focused' ? { x: lookX * -6, rotate: -lookX * 3 } : { rotate: 0 }}
             >
                <path d="M-50 -50 L -60 -100 L -10 -70 Z" fill="#94A3B8" stroke="#475569" strokeWidth="3" strokeLinejoin="round" />
                <path d="M-50 -50 L -53 -85 L -20 -70 Z" fill="#FDBA74" />
                
                <path d="M50 -50 L 60 -100 L 10 -70 Z" fill="#94A3B8" stroke="#475569" strokeWidth="3" strokeLinejoin="round" />
                <path d="M50 -50 L 53 -85 L 20 -70 Z" fill="#FDBA74" />
             </motion.g>

             {/* --- CAT HEAD --- */}
             <motion.g 
                 transform="translate(350, 100)"
                 animate={animState === 'focused' ? { x: lookX * 10, y: lookY, rotate: lookX * 5 } : { x: 0, y: 0, rotate: 0 }}
                 transition={springConfig}
             >
                 {/* Face Shape */}
                 <circle cx="0" cy="0" r="65" fill="url(#catFaceGrad)" stroke="#475569" strokeWidth="3" />
                 
                 {/* Snout */}
                 <g transform="translate(0, 15)">
                     <path d="M-8 -4 L 8 -4 L 0 6 Z" fill="#F472B6" />
                     {/* Whiskers */}
                     <g stroke="#64748B" strokeWidth="1.5">
                         <path d="M-20 -5 L -50 -10" /> <path d="M-20 5 L -50 8" />
                         <path d="M20 -5 L 50 -10" /> <path d="M20 5 L 50 8" />
                     </g>
                 </g>

                 {/* Eyes Container */}
                 <g transform="translate(0, -15)">
                     {/* Open Eyes */}
                     <motion.g animate={{ opacity: isPasswordFocused || blink ? 0 : 1 }}>
                         <g transform="translate(-25, 0)">
                             <path d="M-15 0 Q 0 -15 15 0 Q 0 15 -15 0" fill="white" stroke="#CBD5E1" strokeWidth="1" transform="scale(1.4)"/>
                             <motion.g animate={{ x: lookX * 12, y: isEmailFocused ? 6 : 0 }}>
                                 <circle cx="0" cy="0" r="11" fill="#0D9488" />
                                 <ellipse cx="0" cy="0" rx="3" ry="9" fill="#022C22" />
                                 <circle cx="5" cy="-4" r="3" fill="white" />
                             </motion.g>
                             {/* Lashes */}
                             <path d="M-20 -10 L -28 -18" stroke="#0F172A" strokeWidth="2.5" />
                         </g>
                         <g transform="translate(25, 0)">
                             <path d="M-15 0 Q 0 -15 15 0 Q 0 15 -15 0" fill="white" stroke="#CBD5E1" strokeWidth="1" transform="scale(1.4)"/>
                             <motion.g animate={{ x: lookX * 12, y: isEmailFocused ? 6 : 0 }}>
                                 <circle cx="0" cy="0" r="11" fill="#0D9488" />
                                 <ellipse cx="0" cy="0" rx="3" ry="9" fill="#022C22" />
                                 <circle cx="5" cy="-4" r="3" fill="white" />
                             </motion.g>
                             {/* Lashes */}
                             <path d="M20 -10 L 28 -18" stroke="#0F172A" strokeWidth="2.5" />
                         </g>
                     </motion.g>

                     {/* Closed Eyes */}
                     <motion.g animate={{ opacity: isPasswordFocused || blink ? 1 : 0 }}>
                         <path d="M-40 0 Q -25 10 -10 0" fill="none" stroke="#475569" strokeWidth="4" strokeLinecap="round" />
                         <path d="M40 0 Q 25 10 10 0" fill="none" stroke="#475569" strokeWidth="4" strokeLinecap="round" />
                     </motion.g>
                 </g>
             </motion.g>

             {/* --- CAT PAWS --- */}
             <motion.g 
                 transform="translate(350, 200)"
                 animate={isPasswordFocused ? { y: -65, opacity: 1 } : { y: 20, opacity: 0 }}
             >
                 <circle cx="-25" cy="0" r="18" fill="#E2E8F0" stroke="#475569" strokeWidth="3" />
                 <circle cx="25" cy="0" r="18" fill="#E2E8F0" stroke="#475569" strokeWidth="3" />
                 <circle cx="-25" cy="0" r="6" fill="#F472B6" />
                 <circle cx="25" cy="0" r="6" fill="#F472B6" />
             </motion.g>
        </motion.g>

      </svg>
    </div>
  );
}
