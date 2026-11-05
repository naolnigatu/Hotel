import React, { useState, useRef } from 'react';
import { 
  Building2, 
  Calendar, 
  Users, 
  CheckCircle2, 
  Clock, 
  TrendingUp, 
  UtensilsCrossed, 
  BedDouble, 
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Hero3DPreview() {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotateX, setRotateX] = useState(12);
  const [rotateY, setRotateY] = useState(-10);
  const [glarePosition, setGlarePosition] = useState({ x: 50, y: 50, opacity: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotX = -((y - centerY) / centerY) * 14;
    const rotY = ((x - centerX) / centerX) * 16;

    setRotateX(rotX);
    setRotateY(rotY);
    setGlarePosition({
      x: (x / rect.width) * 100,
      y: (y / rect.height) * 100,
      opacity: 0.25
    });
  };

  const handleMouseLeave = () => {
    // Smooth reset to resting perspective angle
    setRotateX(8);
    setRotateY(-6);
    setGlarePosition(prev => ({ ...prev, opacity: 0 }));
  };

  return (
    <div 
      className="relative w-full max-w-5xl mx-auto py-8 px-2 sm:px-4"
      style={{ perspective: '1400px' }}
    >
      {/* Ambient background glow beneath the 3D card */}
      <div 
        className="absolute inset-0 bg-gradient-to-tr from-sky-500/20 via-indigo-500/20 to-amber-500/15 blur-3xl rounded-full transform -translate-y-4 scale-90 -z-10 pointer-events-none"
        aria-hidden="true"
      />

      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
          transformStyle: 'preserve-3d',
          transition: 'transform 0.15s ease-out'
        }}
        className="relative rounded-3xl bg-neutral-950/85 border border-white/15 p-4 sm:p-6 lg:p-8 shadow-[0_30px_90px_rgba(0,0,0,0.6)] backdrop-blur-2xl text-white cursor-pointer select-none group"
      >
        {/* Dynamic Light Glare */}
        <div 
          className="absolute inset-0 rounded-3xl pointer-events-none transition-opacity duration-300"
          style={{
            background: `radial-gradient(circle at ${glarePosition.x}% ${glarePosition.y}%, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 65%)`,
            opacity: glarePosition.opacity
          }}
        />

        {/* Top Window Bar (Mac/SaaS Style Header) */}
        <div 
          className="flex items-center justify-between pb-4 mb-6 border-b border-white/10"
          style={{ transform: 'translateZ(20px)' }}
        >
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
            </div>
            <div className="hidden sm:flex items-center gap-2 ml-4 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-neutral-300">
              <Building2 className="w-3.5 h-3.5 text-sky-400" />
              <span className="font-semibold">Woliso Grand Hotel & Resort</span>
              <span className="text-neutral-500">•</span>
              <span className="text-emerald-400 font-mono text-[11px] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live PMS v2.4
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden xs:block">
              <p className="text-[11px] text-neutral-400 font-medium">Occupancy Rate</p>
              <p className="text-xs sm:text-sm font-bold text-emerald-400">92.4% Optimal</p>
            </div>
            <Link
              to="/dashboard"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-neutral-950 font-bold text-xs hover:bg-neutral-200 transition-colors shadow-xs"
            >
              <span>Staff Portal</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Floating Layer 1: Key Metrics Bar (Elevated in 3D) */}
        <div 
          className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6"
          style={{ transform: 'translateZ(35px)' }}
        >
          <div className="p-3.5 sm:p-4 rounded-2xl bg-white/[0.04] border border-white/10 hover:border-sky-500/40 transition-colors">
            <div className="flex items-center justify-between text-neutral-400 text-xs mb-1">
              <span>Rooms In-House</span>
              <BedDouble className="w-4 h-4 text-sky-400" />
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-white">48 / 52</div>
            <div className="text-[11px] text-emerald-400 flex items-center gap-1 mt-1">
              <TrendingUp className="w-3 h-3" />
              <span>+14% vs last week</span>
            </div>
          </div>

          <div className="p-3.5 sm:p-4 rounded-2xl bg-white/[0.04] border border-white/10 hover:border-amber-500/40 transition-colors">
            <div className="flex items-center justify-between text-neutral-400 text-xs mb-1">
              <span>Today's Revenue</span>
              <TrendingUp className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-white">186,400 <span className="text-xs font-sans text-neutral-400">ETB</span></div>
            <div className="text-[11px] text-amber-300 flex items-center gap-1 mt-1">
              <span>Room + F&B Dining</span>
            </div>
          </div>

          <div className="p-3.5 sm:p-4 rounded-2xl bg-white/[0.04] border border-white/10 hover:border-emerald-500/40 transition-colors">
            <div className="flex items-center justify-between text-neutral-400 text-xs mb-1">
              <span>Arrivals Today</span>
              <Users className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-white">18 <span className="text-xs font-sans text-neutral-400">Checked In</span></div>
            <div className="text-[11px] text-emerald-400 flex items-center gap-1 mt-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>3 Pending Arrivals</span>
            </div>
          </div>

          <div className="p-3.5 sm:p-4 rounded-2xl bg-white/[0.04] border border-white/10 hover:border-purple-500/40 transition-colors">
            <div className="flex items-center justify-between text-neutral-400 text-xs mb-1">
              <span>Active KDS Tickets</span>
              <UtensilsCrossed className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-white">12 <span className="text-xs font-sans text-neutral-400">Orders</span></div>
            <div className="text-[11px] text-purple-300 flex items-center gap-1 mt-1">
              <Clock className="w-3 h-3" />
              <span>Avg prep 14m</span>
            </div>
          </div>
        </div>

        {/* Floating Layer 2: Real-Time Interactive Room Status Grid */}
        <div 
          className="rounded-2xl bg-white/[0.03] border border-white/10 p-4 sm:p-5"
          style={{ transform: 'translateZ(50px)' }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Front-Desk Live Room Status Matrix</span>
                <span className="px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 text-[10px] font-mono">
                  Real-Time Sync
                </span>
              </h4>
              <p className="text-xs text-neutral-400 mt-0.5">
                Instant walk-in registration, digital key folio, and automated housekeeping dispatch.
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="flex items-center gap-1 text-emerald-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-400" /> Occupied
              </span>
              <span className="flex items-center gap-1 text-sky-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-sky-400" /> Available
              </span>
              <span className="flex items-center gap-1 text-amber-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-amber-400" /> Reserved
              </span>
              <span className="flex items-center gap-1 text-rose-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-rose-400" /> Cleaning
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5">
            {[
              { num: '101', type: 'Deluxe King', status: 'occupied', guest: 'Dr. Michael T.', color: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300' },
              { num: '102', type: 'Deluxe King', status: 'occupied', guest: 'Abebe Bikila', color: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300' },
              { num: '103', type: 'Executive Suite', status: 'available', guest: 'Ready for Check-in', color: 'border-sky-500/50 bg-sky-500/10 text-sky-300' },
              { num: '104', type: 'Executive Suite', status: 'cleaning', guest: 'Housekeeping Assigned', color: 'border-rose-500/50 bg-rose-500/10 text-rose-300' },
              { num: '201', type: 'Presidential Suite', status: 'reserved', guest: 'UN Delegation', color: 'border-amber-500/50 bg-amber-500/10 text-amber-300' },
              { num: '202', type: 'Garden Villa', status: 'available', guest: 'Ready for Check-in', color: 'border-sky-500/50 bg-sky-500/10 text-sky-300' },
            ].map((room) => (
              <div 
                key={room.num}
                className={`p-2.5 rounded-xl border ${room.color} transition-all duration-200 hover:scale-[1.03] hover:shadow-lg`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono font-bold text-sm text-white">#{room.num}</span>
                  <span className="text-[10px] uppercase font-bold tracking-wider opacity-80">{room.status}</span>
                </div>
                <div className="text-xs font-semibold text-white/90 truncate">{room.type}</div>
                <div className="text-[11px] opacity-75 truncate mt-0.5">{room.guest}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Floating Layer 3: Pop-out Notification Badges (High Z-Index 3D) */}
        <div 
          className="hidden md:flex absolute -bottom-6 -left-6 bg-neutral-900/95 border border-white/20 rounded-2xl p-3.5 shadow-2xl backdrop-blur-xl items-center gap-3"
          style={{ transform: 'translateZ(75px)' }}
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-md">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-white">Instant Walk-In Processed</p>
            <p className="text-[11px] text-neutral-400">Folio #WLS-9428 • Guest checked in in 38s</p>
          </div>
        </div>

        <div 
          className="hidden md:flex absolute -top-6 -right-6 bg-neutral-900/95 border border-white/20 rounded-2xl p-3.5 shadow-2xl backdrop-blur-xl items-center gap-3"
          style={{ transform: 'translateZ(70px)' }}
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-500 flex items-center justify-center text-white shadow-md">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-white">Enterprise RLS & Audit Active</p>
            <p className="text-[11px] text-neutral-400">Zero data breach • Immutable staff logs</p>
          </div>
        </div>
      </div>
    </div>
  );
}
