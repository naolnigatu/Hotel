import React, { useState } from 'react';
import { 
  CalendarDays, 
  UtensilsCrossed, 
  Sparkles, 
  BarChart3, 
  BedSingle, 
  CheckCircle2, 
  Clock, 
  ArrowRight,
  Shield,
  Layers,
  ChevronRight,
  UserCheck,
  QrCode,
  DollarSign
} from 'lucide-react';
import { Link } from 'react-router-dom';

type TabKey = 'frontdesk' | 'pos_kds' | 'housekeeping' | 'analytics' | 'booking';

export default function ProductShowcase3D() {
  const [activeTab, setActiveTab] = useState<TabKey>('frontdesk');

  const tabs = [
    {
      id: 'frontdesk' as TabKey,
      label: 'Front Desk & Reservations',
      icon: CalendarDays,
      badge: 'Core PMS',
      description: 'Streamline check-ins, walk-in registrations, and room allocation with interactive timeline calendar.'
    },
    {
      id: 'pos_kds' as TabKey,
      label: 'Restaurant POS & Kitchen (KDS)',
      icon: UtensilsCrossed,
      badge: 'Real-Time Routing',
      description: 'Live table mapping, digital waiter ordering, and station-based kitchen display system.'
    },
    {
      id: 'housekeeping' as TabKey,
      label: 'Housekeeping & Inventory',
      icon: Sparkles,
      badge: 'Instant Dispatch',
      description: 'Room turnover management, linen tracking, and real-time maintenance status updates.'
    },
    {
      id: 'analytics' as TabKey,
      label: 'Revenue & Night Audit',
      icon: BarChart3,
      badge: 'Automated Reports',
      description: 'ADR, RevPAR, cashier balancing, and immutable audit logs with multi-schema Postgres security.'
    },
    {
      id: 'booking' as TabKey,
      label: 'Guest Booking Engine',
      icon: BedSingle,
      badge: 'Direct Revenue',
      description: 'Zero-commission direct guest booking, real-time availability, and instant QR reservation pass.'
    }
  ];

  return (
    <section className="py-24 bg-neutral-900 text-white relative overflow-hidden">
      {/* Background 3D grid and light cones */}
      <div 
        className="absolute inset-0 bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_40%,#000_70%,transparent_100%)] opacity-25 pointer-events-none" 
        aria-hidden="true"
      />
      <div 
        className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-sky-500/15 blur-[120px] rounded-full pointer-events-none" 
        aria-hidden="true"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/15 text-xs font-bold uppercase tracking-wider text-sky-400 mb-4 backdrop-blur-md">
            <Layers className="w-3.5 h-3.5" />
            <span>Authentic Application Modules</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white mb-6">
            Engineered for Flawless <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-indigo-300 to-amber-300">Hospitality Operations</span>
          </h2>
          <p className="text-base sm:text-lg text-neutral-300 leading-relaxed">
            Every module in Woliso Hotel Management System is built for real daily operations—connecting front desk, dining, housekeeping, and executive analytics in a single unified system.
          </p>
        </div>

        {/* Tab Selection Row */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mb-12">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2.5 px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer border ${
                  isActive
                    ? 'bg-white text-neutral-950 border-white shadow-[0_0_25px_rgba(255,255,255,0.25)] scale-[1.03]'
                    : 'bg-white/5 text-neutral-300 border-white/10 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-sky-600' : 'text-neutral-400'}`} />
                <span>{tab.label}</span>
                <span className={`hidden md:inline text-[10px] px-2 py-0.5 rounded-full font-mono ${
                  isActive ? 'bg-neutral-900 text-white' : 'bg-white/10 text-neutral-400'
                }`}>
                  {tab.badge}
                </span>
              </button>
            );
          })}
        </div>

        {/* 3D Dimensional Interactive Preview Stage */}
        <div 
          className="relative rounded-3xl bg-neutral-950/90 border border-white/15 p-4 sm:p-8 lg:p-10 shadow-2xl backdrop-blur-xl"
          style={{ perspective: '1200px' }}
        >
          {/* Tab 1: Front Desk & Reservations */}
          {activeTab === 'frontdesk' && (
            <div className="grid lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-4 space-y-6">
                <div>
                  <span className="text-xs font-bold font-mono text-sky-400 uppercase tracking-widest">Module 01</span>
                  <h3 className="text-2xl sm:text-3xl font-bold text-white mt-1 mb-3">Front Desk & Reservation Timeline</h3>
                  <p className="text-sm text-neutral-300 leading-relaxed">
                    Visual reservation calendar with drag-and-drop room allocation, instant guest lookups, walk-in quick check-in modal, and automated folio generation.
                  </p>
                </div>

                <div className="space-y-3">
                  {[
                    'Multi-day occupancy grid with color-coded reservation states',
                    'Fast 38-second walk-in check-in with ID registration',
                    'Guest profile history with stay count and dietary preferences',
                    'Instant room bill consolidation with F&B charges'
                  ].map((feat, i) => (
                    <div key={i} className="flex items-start gap-2.5 text-xs text-neutral-200">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-2">
                  <Link
                    to="/dashboard"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-500 text-white font-bold text-xs hover:bg-sky-400 transition-colors shadow-lg shadow-sky-500/25"
                  >
                    <span>Open Front Desk Staff Portal</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>

              <div className="lg:col-span-8 rounded-2xl bg-neutral-900/90 border border-white/10 p-4 sm:p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs font-bold text-white">Live Front Desk Dispatch</span>
                  </div>
                  <span className="text-xs font-mono text-neutral-400">Date: Today • 52 Keys Managed</span>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                    <p className="text-[11px] text-neutral-400">Total Check-Ins</p>
                    <p className="text-lg font-bold text-emerald-400">18 Guests</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                    <p className="text-[11px] text-neutral-400">Expected Check-Outs</p>
                    <p className="text-lg font-bold text-sky-400">14 Rooms</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                    <p className="text-[11px] text-neutral-400">Stay-Overs</p>
                    <p className="text-lg font-bold text-purple-400">30 Rooms</p>
                  </div>
                </div>

                {/* Timeline Grid Sample */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-neutral-400 px-1">
                    <span>Room</span>
                    <span>Category</span>
                    <span>Guest Name</span>
                    <span>Status</span>
                  </div>
                  {[
                    { room: '101', cat: 'Deluxe King', guest: 'Dr. Michael Tadesse', status: 'Checked In', badge: 'bg-emerald-500/20 text-emerald-300' },
                    { room: '104', cat: 'Executive Suite', guest: 'Sara Jenkins', status: 'Checked In', badge: 'bg-emerald-500/20 text-emerald-300' },
                    { room: '201', cat: 'Presidential Suite', guest: 'AU Delegation (Amb. Worku)', status: 'VIP Reserved', badge: 'bg-amber-500/20 text-amber-300' },
                    { room: '205', cat: 'Standard Twin', guest: 'Dawit Mengistu', status: 'Departed (Audit Done)', badge: 'bg-neutral-700/60 text-neutral-300' }
                  ].map((row, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] border border-white/5 text-xs">
                      <span className="font-mono font-bold text-white">#{row.room}</span>
                      <span className="text-neutral-400 truncate max-w-[120px]">{row.cat}</span>
                      <span className="font-semibold text-white truncate max-w-[140px]">{row.guest}</span>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${row.badge}`}>{row.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Restaurant POS & Kitchen Display (KDS) */}
          {activeTab === 'pos_kds' && (
            <div className="grid lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-4 space-y-6">
                <div>
                  <span className="text-xs font-bold font-mono text-amber-400 uppercase tracking-widest">Module 02</span>
                  <h3 className="text-2xl sm:text-3xl font-bold text-white mt-1 mb-3">Restaurant POS & Kitchen Display</h3>
                  <p className="text-sm text-neutral-300 leading-relaxed">
                    Eliminate paper tickets. Orders entered on mobile waiter devices route instantly to specific kitchen station displays (Grill, Pastry, Beverage Bar) with live timers.
                  </p>
                </div>

                <div className="space-y-3">
                  {[
                    'Live floor plan table mapping (Dine-in, Terrace, Room Service)',
                    'Smart kitchen stations: orders automatically split by category',
                    'Real-time ticket status updates: Pending -> Cooking -> Ready -> Served',
                    'Room folio room charge: post restaurant bill directly to guest room'
                  ].map((feat, i) => (
                    <div key={i} className="flex items-start gap-2.5 text-xs text-neutral-200">
                      <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-2">
                  <Link
                    to="/restaurant"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 text-neutral-950 font-bold text-xs hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/25"
                  >
                    <span>View Dining Menu & Orders</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>

              <div className="lg:col-span-8 rounded-2xl bg-neutral-900/90 border border-white/10 p-4 sm:p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                    <span className="text-xs font-bold text-white">Live Kitchen Display System (KDS)</span>
                  </div>
                  <span className="text-xs font-mono text-neutral-400">Station: Main Hot Kitchen</span>
                </div>

                <div className="grid sm:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-xl bg-white/[0.04] border border-amber-500/30 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-amber-300">Ticket #1042</span>
                      <span className="text-[10px] font-mono text-amber-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> 8 mins
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-white">Table 04 • Terrace</p>
                    <ul className="text-xs text-neutral-300 space-y-1 pt-1 border-t border-white/10">
                      <li>• 2x Grilled Prime Ribeye (Medium)</li>
                      <li>• 1x Special Tibs with Injera</li>
                      <li>• 1x Seasonal Avocado Salad</li>
                    </ul>
                    <span className="block text-center py-1 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                      IN PREPARATION
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white/[0.04] border border-emerald-500/30 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-emerald-300">Ticket #1040</span>
                      <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Ready
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-white">Room 201 • Room Service</p>
                    <ul className="text-xs text-neutral-300 space-y-1 pt-1 border-t border-white/10">
                      <li>• 1x Traditional Doro Wot</li>
                      <li>• 2x Fresh Mango Juice</li>
                      <li>• 1x Espresso Macchiato</li>
                    </ul>
                    <span className="block text-center py-1 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                      READY FOR DELIVERY
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white/[0.04] border border-sky-500/30 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-sky-300">Ticket #1043</span>
                      <span className="text-[10px] font-mono text-sky-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> 2 mins
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-white">Table 08 • VIP Lounge</p>
                    <ul className="text-xs text-neutral-300 space-y-1 pt-1 border-t border-white/10">
                      <li>• 1x Ethiopian Coffee Ceremony Set</li>
                      <li>• 2x Woliso Club Sandwich</li>
                    </ul>
                    <span className="block text-center py-1 rounded bg-sky-500/20 text-sky-300 text-[10px] font-bold">
                      NEW ORDER
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Housekeeping & Room Inventory */}
          {activeTab === 'housekeeping' && (
            <div className="grid lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-4 space-y-6">
                <div>
                  <span className="text-xs font-bold font-mono text-teal-400 uppercase tracking-widest">Module 03</span>
                  <h3 className="text-2xl sm:text-3xl font-bold text-white mt-1 mb-3">Housekeeping & Room Inventory</h3>
                  <p className="text-sm text-neutral-300 leading-relaxed">
                    Automate room turnover with instant staff assignments, maintenance tracking, and mobile inspection checklists.
                  </p>
                </div>

                <div className="space-y-3">
                  {[
                    'Automatic status update when guest checks out (Occupied -> Dirty)',
                    'Housekeeper mobile view: mark room In-Progress and Clean',
                    'Supervisor inspection pass: room unlocked for new check-ins',
                    'Room maintenance reporting: instant ticket to engineering'
                  ].map((feat, i) => (
                    <div key={i} className="flex items-start gap-2.5 text-xs text-neutral-200">
                      <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-2">
                  <Link
                    to="/dashboard"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-500 text-white font-bold text-xs hover:bg-teal-400 transition-colors shadow-lg shadow-teal-500/25"
                  >
                    <span>View Housekeeping Hub</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>

              <div className="lg:col-span-8 rounded-2xl bg-neutral-900/90 border border-white/10 p-4 sm:p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-pulse" />
                    <span className="text-xs font-bold text-white">Live Housekeeping Operations</span>
                  </div>
                  <span className="text-xs font-mono text-teal-300">Turnaround Avg: 22 mins</span>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  {[
                    { room: '105', type: 'Deluxe King', attendant: 'Marta G.', status: 'Clean & Inspected', state: 'Ready for Guest', color: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300' },
                    { room: '108', type: 'Executive Suite', attendant: 'Hiwot A.', status: 'In Cleaning', state: 'Linens Replaced', color: 'border-amber-500/40 bg-amber-500/10 text-amber-300' },
                    { room: '204', type: 'Standard Twin', attendant: 'Unassigned', status: 'Dirty (Checkout 11:00)', state: 'Priority Task', color: 'border-rose-500/40 bg-rose-500/10 text-rose-300' },
                    { room: '210', type: 'Presidential Suite', attendant: 'Eng. Solomon', status: 'Maintenance Hold', state: 'AC Filter Check', color: 'border-sky-500/40 bg-sky-500/10 text-sky-300' }
                  ].map((item, idx) => (
                    <div key={idx} className={`p-4 rounded-xl border ${item.color} space-y-1.5`}>
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-white text-base">Room #{item.room}</span>
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-black/40">{item.status}</span>
                      </div>
                      <p className="text-xs font-semibold text-white/90">{item.type}</p>
                      <div className="flex items-center justify-between text-[11px] opacity-80 pt-1 border-t border-white/10">
                        <span>Attendant: {item.attendant}</span>
                        <span>{item.state}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tab 4: Revenue & Night Audit */}
          {activeTab === 'analytics' && (
            <div className="grid lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-4 space-y-6">
                <div>
                  <span className="text-xs font-bold font-mono text-purple-400 uppercase tracking-widest">Module 04</span>
                  <h3 className="text-2xl sm:text-3xl font-bold text-white mt-1 mb-3">Enterprise Analytics & Night Audit</h3>
                  <p className="text-sm text-neutral-300 leading-relaxed">
                    Automated night audit closes daily cash drawers, reconciles POS folios, calculates ADR and RevPAR, and maintains immutable Supabase audit logs.
                  </p>
                </div>

                <div className="space-y-3">
                  {[
                    'Automated end-of-day trial balance and cashier reconciliation',
                    'Key KPIs: Average Daily Rate (ADR), RevPAR, and Occupancy Rate',
                    'Departmental revenue breakdown: Accommodation, F&B, Halls, Services',
                    'Cryptographically secured immutable audit trails with IP and user tracking'
                  ].map((feat, i) => (
                    <div key={i} className="flex items-start gap-2.5 text-xs text-neutral-200">
                      <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-2">
                  <Link
                    to="/dashboard"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-500 text-white font-bold text-xs hover:bg-purple-400 transition-colors shadow-lg shadow-purple-500/25"
                  >
                    <span>View Financial Reports</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>

              <div className="lg:col-span-8 rounded-2xl bg-neutral-900/90 border border-white/10 p-4 sm:p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-pulse" />
                    <span className="text-xs font-bold text-white">Daily Financial Revenue Ledger</span>
                  </div>
                  <span className="text-xs font-mono text-purple-300">Period: Current Month (YTD)</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                    <p className="text-[11px] text-neutral-400">Total Net Revenue</p>
                    <p className="text-base sm:text-lg font-bold font-mono text-white">1,842,500 <span className="text-[10px]">ETB</span></p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                    <p className="text-[11px] text-neutral-400">ADR (Avg Rate)</p>
                    <p className="text-base sm:text-lg font-bold font-mono text-emerald-400">3,850 <span className="text-[10px]">ETB</span></p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                    <p className="text-[11px] text-neutral-400">RevPAR</p>
                    <p className="text-base sm:text-lg font-bold font-mono text-sky-400">3,557 <span className="text-[10px]">ETB</span></p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                    <p className="text-[11px] text-neutral-400">Audit Discrepancies</p>
                    <p className="text-base sm:text-lg font-bold font-mono text-emerald-400">0.00 ETB</p>
                  </div>
                </div>

                {/* Revenue Breakdown Progress Bars */}
                <div className="space-y-3 pt-2">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-neutral-300">Room Accommodation (62%)</span>
                      <span className="font-mono text-white">1,142,350 ETB</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full bg-sky-500 rounded-full" style={{ width: '62%' }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-neutral-300">Restaurant & Beverage F&B (26%)</span>
                      <span className="font-mono text-white">479,050 ETB</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full" style={{ width: '26%' }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-neutral-300">Conference Halls & Event Packages (12%)</span>
                      <span className="font-mono text-white">221,100 ETB</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full bg-purple-500 rounded-full" style={{ width: '12%' }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 5: Guest Direct Booking Engine */}
          {activeTab === 'booking' && (
            <div className="grid lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-4 space-y-6">
                <div>
                  <span className="text-xs font-bold font-mono text-emerald-400 uppercase tracking-widest">Module 05</span>
                  <h3 className="text-2xl sm:text-3xl font-bold text-white mt-1 mb-3">Direct Guest Booking Engine</h3>
                  <p className="text-sm text-neutral-300 leading-relaxed">
                    Empower guests to check live availability, select luxurious suites, review amenities, and complete direct bookings with zero OTA intermediary commission fees.
                  </p>
                </div>

                <div className="space-y-3">
                  {[
                    'Instant room availability check with live rate calculation',
                    'Digital QR code pass for express self-service check-in',
                    'Direct payment integration and instant email confirmations',
                    'Multi-language website support (Amharic, Afaan Oromo, Tigrinya, Somali, English)'
                  ].map((feat, i) => (
                    <div key={i} className="flex items-start gap-2.5 text-xs text-neutral-200">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-2">
                  <Link
                    to="/rooms"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 text-neutral-950 font-bold text-xs hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/25"
                  >
                    <span>Browse Available Rooms</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>

              <div className="lg:col-span-8 rounded-2xl bg-neutral-900/90 border border-white/10 p-4 sm:p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs font-bold text-white">Direct Guest Booking Portal</span>
                  </div>
                  <span className="text-xs font-mono text-emerald-300">0% Commission to OTAs</span>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-white/[0.04] border border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-white">Deluxe King Room</span>
                      <span className="font-mono text-emerald-400 font-bold text-sm">3,500 ETB<span className="text-xs text-neutral-400 font-normal">/nt</span></span>
                    </div>
                    <p className="text-xs text-neutral-300">Panoramic mountain views, king orthopedic mattress, high-speed WiFi, private balcony, marble ensuite.</p>
                    <div className="flex items-center gap-2 text-[11px] text-neutral-400">
                      <span>• Free Breakfast</span>
                      <span>• Valet Parking</span>
                      <span>• 2 Guests Max</span>
                    </div>
                    <Link
                      to="/book"
                      className="block w-full text-center py-2 rounded-lg bg-white text-neutral-950 font-bold text-xs hover:bg-neutral-200 transition"
                    >
                      Book This Room
                    </Link>
                  </div>

                  <div className="p-4 rounded-xl bg-white/[0.04] border border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-white">Presidential VIP Suite</span>
                      <span className="font-mono text-emerald-400 font-bold text-sm">7,500 ETB<span className="text-xs text-neutral-400 font-normal">/nt</span></span>
                    </div>
                    <p className="text-xs text-neutral-300">Spacious executive living room, private dining area, hot tub jacuzzi, 24/7 dedicated butler service.</p>
                    <div className="flex items-center gap-2 text-[11px] text-neutral-400">
                      <span>• VIP Lounge Access</span>
                      <span>• Airport Transfer</span>
                      <span>• Express Check-in</span>
                    </div>
                    <Link
                      to="/book"
                      className="block w-full text-center py-2 rounded-lg bg-emerald-500 text-neutral-950 font-bold text-xs hover:bg-emerald-400 transition"
                    >
                      Book This Suite
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
