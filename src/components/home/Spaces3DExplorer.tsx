import React, { useState, useEffect, useRef } from 'react';
import { 
  Building2, 
  BedDouble, 
  UtensilsCrossed, 
  Coffee, 
  ChefHat, 
  LineChart, 
  Compass, 
  Play, 
  Pause, 
  Sparkles, 
  CheckCircle2, 
  ArrowRight, 
  ArrowUpRight,
  Maximize2,
  ShieldCheck,
  Zap,
  MapPin,
  Clock,
  QrCode
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';

export interface SpaceFacility {
  id: string;
  name: string;
  subtitle: string;
  badge: string;
  accentColor: string;
  imageUrl: string;
  description: string;
  pmsModule: {
    title: string;
    description: string;
    features: string[];
    actionText: string;
    actionLink: string;
  };
  architecturalSpecs: {
    label: string;
    value: string;
  }[];
  hotspots: {
    id: string;
    x: number; // percentage from left
    y: number; // percentage from top
    title: string;
    subtitle: string;
    pmsFeature: string;
  }[];
}

export const HOTEL_SPACES: SpaceFacility[] = [
  {
    id: 'reception',
    name: 'Grand Entrance & Reception',
    subtitle: 'Front Desk & Guest Welcome Hall',
    badge: 'Cloud PMS Core',
    accentColor: '#38bdf8',
    imageUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=1600',
    description: 'The architectural centerpiece of Woliso Grand Hotel. Featuring soaring ceilings, polished Ethiopian marble, and the DigiMenu Front-Desk Terminal capable of completing walk-in registrations in under 40 seconds.',
    pmsModule: {
      title: 'Front Desk & Cloud PMS Terminal',
      description: 'Unified arrival dashboard with digital room matrix, RFID/QR key generation, and automated guest folio management.',
      features: [
        'Instant 38-second walk-in guest registration',
        'Live Room Status Matrix (Clean, Dirty, Inspected, VIP)',
        'telebirr, CBE Birr & multi-currency payment settlement',
        'Automated guest WhatsApp / SMS welcome dispatch'
      ],
      actionText: 'Launch Front Desk Portal',
      actionLink: '/dashboard'
    },
    architecturalSpecs: [
      { label: 'Ceiling Height', value: '6.5 Meters' },
      { label: 'Check-In Terminals', value: '4 Dual-Screen' },
      { label: 'Lounge Capacity', value: '60 Guests' },
      { label: 'Security Tier', value: '24/7 Monitored' }
    ],
    hotspots: [
      { id: 'desk', x: 48, y: 55, title: 'Front Desk Matrix', subtitle: '38s Check-in Terminal', pmsFeature: 'Walk-in allocation & digital guest folios' },
      { id: 'lounge', x: 22, y: 68, title: 'VIP Waiting Lounge', subtitle: 'Concierge Welcome', pmsFeature: 'Digital guest arrival notification' },
      { id: 'kiosk', x: 78, y: 62, title: 'Self Check-In Kiosk', subtitle: 'Contactless QR Pass', pmsFeature: 'Instant keyless room access' }
    ]
  },
  {
    id: 'suite',
    name: 'Deluxe King Suite 304',
    subtitle: 'Luxury Mountain View Accommodations',
    badge: 'Direct Booking Engine',
    accentColor: '#10b981',
    imageUrl: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&q=80&w=1600',
    description: 'Indulge in authentic Ethiopian luxury. Master bedroom fitted with custom mahogany joinery, orthopedic king-size mattress, deep marble soaking tub, and a private balcony overlooking Mount Wonchi.',
    pmsModule: {
      title: 'Direct Guest Booking Engine',
      description: 'Zero-commission direct booking platform connected in real time to the property room inventory database.',
      features: [
        'Guaranteed Best Rate (3,500 ETB / night) with 0% OTA fee',
        'Instant confirmation with cryptographic QR booking pass',
        'In-Room Digital Dining tablet integration',
        'Housekeeping Departure alert triggers instant turnover'
      ],
      actionText: 'Book Suite 304 (3,500 ETB)',
      actionLink: '/book'
    },
    architecturalSpecs: [
      { label: 'Room Area', value: '64 m²' },
      { label: 'Bed Type', value: 'Plush King-Size' },
      { label: 'Balcony View', value: 'Wonchi Mountains' },
      { label: 'Rate', value: '3,500 ETB / night' }
    ],
    hotspots: [
      { id: 'bed', x: 46, y: 52, title: 'Master King Bed', subtitle: 'Orthopedic Mattress', pmsFeature: 'Automated turn-down service status' },
      { id: 'balcony', x: 82, y: 42, title: 'Mountain Balcony', subtitle: 'Private Terrace', pmsFeature: 'In-room sunrise breakfast routing' },
      { id: 'tablet', x: 25, y: 65, title: 'In-Room Tablet', subtitle: 'Digital Concierge', pmsFeature: 'One-tap room service & housekeeping request' }
    ]
  },
  {
    id: 'restaurant',
    name: 'The Abba Gada Restaurant',
    subtitle: 'Authentic Fine Dining & Banquet Hall',
    badge: 'Dining Table POS',
    accentColor: '#f59e0b',
    imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=1600',
    description: 'An atmospheric dining venue celebrating traditional Ethiopian culinary heritage alongside continental gastronomy. Mobile waiter tablets dispatch guest orders directly to dedicated kitchen stations.',
    pmsModule: {
      title: 'Table Management & Waiter POS',
      description: 'Interactive visual table floor plan with instant order dispatch and seamless "Charge to Room Folio" capabilities.',
      features: [
        'Interactive floor layout (Terrace, Main Hall, VIP Alcove)',
        'Mobile waiter ordering with <30ms station dispatch',
        'One-click room folio billing with PIN verification',
        'Automatic split-billing, receipt printing & daily F&B balancing'
      ],
      actionText: 'Explore Restaurant Menu',
      actionLink: '/restaurant'
    },
    architecturalSpecs: [
      { label: 'Seating Capacity', value: '180 Covers' },
      { label: 'Dining Zones', value: 'Terrace + VIP + Hall' },
      { label: 'Average Prep', value: '16 Minutes' },
      { label: 'Wine Cellar', value: 'Curated 120+ Labels' }
    ],
    hotspots: [
      { id: 'tables', x: 45, y: 65, title: 'Table 14 (VIP)', subtitle: 'Digital Table Beacon', pmsFeature: 'Active table order status & guest folio charge' },
      { id: 'pos', x: 80, y: 55, title: 'Service Waiter Station', subtitle: 'Handheld POS Terminal', pmsFeature: 'Instant order routing to Grill & Salad stations' },
      { id: 'cellar', x: 18, y: 48, title: 'Wine & Beverage Bar', subtitle: 'Sommelier Inventory', pmsFeature: 'Real-time bottle stock tracking' }
    ]
  },
  {
    id: 'cafe',
    name: 'Woliso Coffee Bar & Bakery',
    subtitle: 'Artisan Ethiopian Roast & High-Speed POS',
    badge: 'High-Velocity Counter POS',
    accentColor: '#ec4899',
    imageUrl: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&q=80&w=1600',
    description: 'The morning pulse of the hotel. Highlighting premium single-origin Ethiopian coffee beans roasted on-site, freshly baked pastries, and a high-velocity counter POS optimized for 15-second customer checkouts.',
    pmsModule: {
      title: 'Counter POS & Beverage Inventory',
      description: 'Optimized touch interface designed for high-volume transactions with integrated ingredient deductions.',
      features: [
        '15-second tap-to-pay transaction turnaround',
        'Automated coffee bean & milk inventory tracking',
        'Shift cash drawer balancing & instant cashier handover',
        'telebirr QR contactless mobile payments'
      ],
      actionText: 'View Café & Breakfast Menu',
      actionLink: '/restaurant'
    },
    architecturalSpecs: [
      { label: 'Roast Types', value: 'Yirgacheffe & Sidama' },
      { label: 'Counter Speed', value: '<15s Transaction' },
      { label: 'Seating', value: '35 Seats + Garden' },
      { label: 'Pastry Daily', value: 'Fresh Batch 6:00 AM' }
    ],
    hotspots: [
      { id: 'espresso', x: 42, y: 52, title: 'La Marzocco Espresso Station', subtitle: 'Barista Counter', pmsFeature: 'Bean usage auto-deducted per shot' },
      { id: 'pastry', x: 72, y: 64, title: 'Artisan Pastry Display', subtitle: 'Morning Batch POS', pmsFeature: 'Quick-tap barcode & item lookup' },
      { id: 'patio', x: 18, y: 60, title: 'Garden Coffee Patio', subtitle: 'Outdoor Seating', pmsFeature: 'Digital QR tabletop menu' }
    ]
  },
  {
    id: 'kitchen',
    name: 'Master Kitchen & KDS',
    subtitle: 'Commercial Culinary Operations & Ticket Display',
    badge: 'Real-Time KDS',
    accentColor: '#ef4444',
    imageUrl: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&q=80&w=1600',
    description: 'A stainless-steel commercial culinary engine. Zero paper tickets: every order from the restaurant, café, and room service routes instantly to overhead Kitchen Display System (KDS) stations categorized by prep line.',
    pmsModule: {
      title: 'Multi-Station Kitchen Display System',
      description: 'Paperless kitchen operating system with live timers, bump-bar actions, and automated recipe allergen warnings.',
      features: [
        '100% paperless kitchen dispatch with zero lost tickets',
        'Station-specific order routing (Grill, Saute, Pastry, Cold)',
        'Color-coded preparation timers with delay alerts',
        'Single-touch "Order Ready" alert sent to floor waiters'
      ],
      actionText: 'Launch Staff KDS Terminal',
      actionLink: '/dashboard'
    },
    architecturalSpecs: [
      { label: 'Active Stations', value: '4 Dedicated Lines' },
      { label: 'Prep Lines', value: 'Hot, Cold, Bakery, Bar' },
      { label: 'Average Bump Time', value: '11.8 Minutes' },
      { label: 'Paper Waste', value: '0% (100% Digital)' }
    ],
    hotspots: [
      { id: 'kds_screen', x: 50, y: 35, title: 'Overhead KDS Monitor', subtitle: 'Live Station Tickets', pmsFeature: 'Color-coded prep timer & bump controls' },
      { id: 'grill', x: 28, y: 60, title: 'Hot Grill Station', subtitle: 'Meat & Traditional Wats', pmsFeature: 'Station routing with ingredient specs' },
      { id: 'pass', x: 75, y: 65, title: 'Expediter Pass-Through', subtitle: 'Waiter Pickup Table', pmsFeature: 'Automated runner notification bell' }
    ]
  },
  {
    id: 'lounge',
    name: 'Executive Boardroom & Analytics Hub',
    subtitle: 'High-Level Management & Night Audit Ledger',
    badge: 'Enterprise Intelligence',
    accentColor: '#8b5cf6',
    imageUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=1600',
    description: 'The strategic nerve center of the property. Where executive leadership conducts board meetings and monitors real-time hotel KPIs: RevPAR, ADR, occupancy trends, and automated cryptographic night audits.',
    pmsModule: {
      title: 'Executive Financial Intelligence',
      description: 'Multi-schema PostgreSQL reporting engine providing immutable financial ledgers and departmental profit breakdowns.',
      features: [
        'Real-time RevPAR, Average Daily Rate (ADR) and departmental revenue',
        'Automated 02:00 AM Night Audit closing daily ledger',
        'Cryptographic audit trail with IP, device, and staff user logging',
        'Row-Level Security (RLS) ensuring strict departmental privacy'
      ],
      actionText: 'Access Executive Intelligence',
      actionLink: '/dashboard'
    },
    architecturalSpecs: [
      { label: 'Boardroom Seating', value: '20 Executive Chairs' },
      { label: 'Ledger Frequency', value: 'Real-Time Sync' },
      { label: 'Security Model', value: 'PostgreSQL RLS' },
      { label: 'Staff Roles', value: '8 Strict Permission Tiers' }
    ],
    hotspots: [
      { id: 'kpi_wall', x: 45, y: 40, title: 'Executive KPI Display', subtitle: 'Live Property Dashboard', pmsFeature: 'Real-time RevPAR & occupancy analytics' },
      { id: 'table', x: 52, y: 70, title: 'Conference Boardroom', subtitle: 'A/V Integrated Setup', pmsFeature: 'Bookable venue via HMS events engine' },
      { id: 'terminal', x: 80, y: 58, title: 'General Manager Station', subtitle: 'Night Audit Approvals', pmsFeature: 'Cryptographic ledger seal & cashier release' }
    ]
  }
];

export default function Spaces3DExplorer() {
  const [activeSpaceIndex, setActiveSpaceIndex] = useState(0);
  const [activeHotspot, setActiveHotspot] = useState<typeof HOTEL_SPACES[0]['hotspots'][0] | null>(null);
  const [isTouring, setIsTouring] = useState(false);
  const [cardTilt, setCardTilt] = useState({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);

  const activeSpace = HOTEL_SPACES[activeSpaceIndex];

  // Auto-tour timer
  useEffect(() => {
    if (!isTouring) return;
    const interval = setInterval(() => {
      setActiveSpaceIndex((prev) => (prev + 1) % HOTEL_SPACES.length);
      setActiveHotspot(null);
    }, 8000);
    return () => clearInterval(interval);
  }, [isTouring]);

  // Mouse tilt physics for the 3D space card
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotX = -((y - centerY) / centerY) * 6; // Max 6 deg
    const rotY = ((x - centerX) / centerX) * 8; // Max 8 deg

    setCardTilt({ x: rotX, y: rotY });
  };

  const handleMouseLeave = () => {
    setCardTilt({ x: 0, y: 0 });
  };

  const getSpaceIcon = (id: string) => {
    switch (id) {
      case 'reception': return <Building2 className="w-4 h-4" />;
      case 'suite': return <BedDouble className="w-4 h-4" />;
      case 'restaurant': return <UtensilsCrossed className="w-4 h-4" />;
      case 'cafe': return <Coffee className="w-4 h-4" />;
      case 'kitchen': return <ChefHat className="w-4 h-4" />;
      case 'lounge': return <LineChart className="w-4 h-4" />;
      default: return <MapPin className="w-4 h-4" />;
    }
  };

  return (
    <section className="py-24 bg-[#07090e] text-white relative overflow-hidden" id="virtual-tour">
      
      {/* Background ambient lighting */}
      <div 
        className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] blur-[150px] pointer-events-none rounded-full transition-colors duration-1000 opacity-20"
        style={{
          background: `radial-gradient(circle, ${activeSpace.accentColor} 0%, rgba(99,102,241,0.15) 50%, transparent 80%)`
        }}
        aria-hidden="true"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.06] border border-white/15 text-xs font-bold uppercase tracking-wider text-sky-400 mb-3 backdrop-blur-xl">
              <Compass className="w-3.5 h-3.5 animate-spin text-sky-400" />
              <span>Interactive 3D Virtual Hotel Experience</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Explore Woliso Grand Hotel{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-indigo-300 to-amber-300">
                Space by Space
              </span>
            </h2>
            <p className="text-sm sm:text-base text-neutral-400 max-w-2xl mt-2 leading-relaxed">
              Step inside our interconnected facilities. Select any venue to explore its physical architecture, tap glowing beacons to reveal integrated DigiMenu PMS capabilities, or launch the automated walkthrough.
            </p>
          </div>

          {/* Autopilot Tour Button */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsTouring(!isTouring)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs backdrop-blur-xl border transition-all cursor-pointer shadow-lg ${
                isTouring
                  ? 'bg-amber-500/20 border-amber-400/50 text-amber-300 hover:bg-amber-500/30'
                  : 'bg-white/10 border-white/20 text-white hover:bg-white/15'
              }`}
            >
              {isTouring ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span>{isTouring ? 'Pause Autopilot Tour' : 'Start Cinematic Guided Tour'}</span>
            </button>
          </div>
        </div>

        {/* Space Selection Pills Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-8 scrollbar-none">
          {HOTEL_SPACES.map((space, idx) => {
            const isActive = activeSpaceIndex === idx;
            return (
              <button
                key={space.id}
                onClick={() => {
                  setActiveSpaceIndex(idx);
                  setActiveHotspot(null);
                  setIsTouring(false);
                }}
                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl text-xs font-semibold backdrop-blur-xl border transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-white text-neutral-950 border-white shadow-[0_0_25px_rgba(255,255,255,0.3)] scale-[1.02]'
                    : 'bg-white/[0.04] text-neutral-300 border-white/10 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span style={{ color: isActive ? '#090d16' : space.accentColor }}>
                  {getSpaceIcon(space.id)}
                </span>
                <span>{space.name}</span>
                {isActive && (
                  <span 
                    className="w-1.5 h-1.5 rounded-full" 
                    style={{ backgroundColor: space.accentColor }} 
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Main 3D Perspective Experience Stage */}
        <div 
          className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch"
          style={{ perspective: '1400px' }}
        >
          
          {/* Left: 3D Perspective Visual Card with Hotspots */}
          <div 
            ref={cardRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{
              transform: `rotateX(${cardTilt.x}deg) rotateY(${cardTilt.y}deg)`,
              transition: 'transform 0.15s ease-out'
            }}
            className="lg:col-span-8 relative rounded-3xl overflow-hidden border border-white/15 bg-neutral-950/80 shadow-[0_25px_80px_rgba(0,0,0,0.85)] min-h-[460px] sm:min-h-[540px] flex flex-col justify-between p-6 sm:p-8 select-none group"
          >
            {/* Background Photographic Atmosphere with Pan Transition */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeSpace.id}
                initial={{ opacity: 0, scale: 1.05 }}
                animate={{ opacity: 1, scale: 1.0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.7 }}
                className="absolute inset-0 bg-cover bg-center pointer-events-none"
                style={{ backgroundImage: `url(${activeSpace.imageUrl})` }}
              >
                {/* Cinematic Vignette Gradients */}
                <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/40 to-neutral-950/60" />
                <div className="absolute inset-0 bg-gradient-to-r from-neutral-950/70 via-transparent to-neutral-950/70" />
              </motion.div>
            </AnimatePresence>

            {/* Top Stage Bar */}
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span 
                  className="text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border backdrop-blur-xl"
                  style={{
                    backgroundColor: `${activeSpace.accentColor}20`,
                    borderColor: `${activeSpace.accentColor}50`,
                    color: activeSpace.accentColor
                  }}
                >
                  {activeSpace.badge}
                </span>
                <span className="text-xs text-neutral-300 font-medium hidden sm:inline">
                  {activeSpace.subtitle}
                </span>
              </div>

              {/* GPS Compass Tag */}
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-black/60 border border-white/15 text-[11px] text-neutral-300 font-mono backdrop-blur-xl">
                <span className="w-2 h-2 rounded-full animate-ping" style={{ backgroundColor: activeSpace.accentColor }} />
                <span>Sector {activeSpaceIndex + 1} of {HOTEL_SPACES.length}</span>
              </div>
            </div>

            {/* Interactive Hotspot Beacons placed in 3D Space */}
            <div className="absolute inset-0 z-20 pointer-events-none">
              {activeSpace.hotspots.map((hs) => {
                const isSelected = activeHotspot?.id === hs.id;
                return (
                  <div
                    key={hs.id}
                    className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto"
                    style={{ left: `${hs.x}%`, top: `${hs.y}%` }}
                  >
                    <button
                      onClick={() => setActiveHotspot(isSelected ? null : hs)}
                      aria-label={hs.title}
                      className="group/beacon relative flex items-center justify-center cursor-pointer focus:outline-none"
                    >
                      {/* Pulsating outer beacon ring */}
                      <span 
                        className="absolute w-9 h-9 rounded-full animate-ping opacity-60"
                        style={{ backgroundColor: activeSpace.accentColor }}
                      />
                      <span 
                        className="relative w-7 h-7 rounded-full flex items-center justify-center border-2 border-white shadow-[0_0_20px_rgba(255,255,255,0.6)] transition-transform duration-300 group-hover/beacon:scale-125"
                        style={{ backgroundColor: activeSpace.accentColor }}
                      >
                        <Sparkles className="w-3.5 h-3.5 text-neutral-950 font-bold" />
                      </span>

                      {/* Hotspot Floating Tooltip */}
                      <div 
                        className={`absolute left-1/2 -translate-x-1/2 bottom-full mb-2.5 whitespace-nowrap bg-neutral-900/95 border border-white/20 rounded-xl px-3 py-1.5 shadow-2xl backdrop-blur-xl transition-all duration-200 pointer-events-none ${
                          isSelected ? 'opacity-100 scale-100' : 'opacity-0 scale-95 group-hover/beacon:opacity-100 group-hover/beacon:scale-100'
                        }`}
                      >
                        <p className="text-[11px] font-bold text-white">{hs.title}</p>
                        <p className="text-[9px] text-sky-400 font-medium">{hs.subtitle}</p>
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Bottom Info Bar of the 3D Card */}
            <div className="relative z-10 mt-auto pt-6">
              <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {activeSpace.name}
              </h3>
              <p className="text-xs sm:text-sm text-neutral-300 mt-1.5 max-w-xl leading-relaxed">
                {activeSpace.description}
              </p>

              {/* Architectural Specs Chips */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-5">
                {activeSpace.architecturalSpecs.map((spec, i) => (
                  <div key={i} className="px-3 py-2 rounded-xl bg-black/60 border border-white/10 backdrop-blur-xl">
                    <span className="text-[10px] text-neutral-400 uppercase tracking-wider block">
                      {spec.label}
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-white font-mono">
                      {spec.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Right: Integrated DigiMenu PMS Module Discovery Card */}
          <div className="lg:col-span-4 flex flex-col justify-between rounded-3xl bg-neutral-900/90 border border-white/15 p-6 sm:p-7 shadow-2xl backdrop-blur-2xl relative overflow-hidden">
            
            {/* Top accent glow line */}
            <div 
              className="absolute top-0 left-0 right-0 h-1.5"
              style={{
                background: `linear-gradient(90deg, transparent, ${activeSpace.accentColor}, transparent)`
              }}
            />

            <div>
              {/* Hotspot details if active, else general module specs */}
              {activeHotspot ? (
                <div className="mb-6 p-4 rounded-2xl bg-sky-500/10 border border-sky-400/30">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400">
                      Active Hotspot Selected
                    </span>
                    <button 
                      onClick={() => setActiveHotspot(null)}
                      className="text-xs text-neutral-400 hover:text-white cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                  <h4 className="text-base font-bold text-white">{activeHotspot.title}</h4>
                  <p className="text-xs text-sky-200 mt-0.5">{activeHotspot.subtitle}</p>
                  <p className="text-xs text-neutral-300 mt-2">{activeHotspot.pmsFeature}</p>
                </div>
              ) : (
                <div className="mb-6">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-1">
                    Integrated Software Module
                  </span>
                  <h4 className="text-xl font-bold text-white flex items-center gap-2">
                    <span>{activeSpace.pmsModule.title}</span>
                  </h4>
                  <p className="text-xs text-neutral-300 mt-1.5 leading-relaxed">
                    {activeSpace.pmsModule.description}
                  </p>
                </div>
              )}

              {/* Capabilities Checklist */}
              <div className="space-y-3 mb-6">
                <p className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                  Core PMS Capabilities:
                </p>
                {activeSpace.pmsModule.features.map((feature, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-xs text-neutral-200">
                    <CheckCircle2 
                      className="w-4 h-4 flex-shrink-0 mt-0.5" 
                      style={{ color: activeSpace.accentColor }} 
                    />
                    <span className="leading-snug">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="space-y-3 pt-4 border-t border-white/10">
              <Link
                to={activeSpace.pmsModule.actionLink}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-5 rounded-xl font-bold text-xs sm:text-sm text-neutral-950 transition-all hover:scale-[1.02] shadow-lg cursor-pointer"
                style={{ backgroundColor: activeSpace.accentColor }}
              >
                <span>{activeSpace.pmsModule.actionText}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <div className="flex items-center justify-between text-[11px] text-neutral-400 px-1">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Multi-Schema PostgreSQL
                </span>
                <span className="flex items-center gap-1 font-mono text-sky-400">
                  <Zap className="w-3 h-3" />
                  &lt;30ms Sync
                </span>
              </div>
            </div>

          </div>

        </div>

      </div>

    </section>
  );
}
