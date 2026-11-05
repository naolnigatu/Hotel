import React from 'react';
import { 
  Database, 
  ChefHat, 
  Sparkles, 
  CalendarRange, 
  ShieldCheck, 
  Activity, 
  Zap, 
  Layers, 
  Clock, 
  ArrowUpRight,
  TrendingUp,
  Smartphone
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function BentoFeatures3D() {
  return (
    <section className="py-24 bg-neutral-950 text-white relative overflow-hidden">
      {/* Glow Orbs */}
      <div className="absolute top-1/4 -left-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-40 w-96 h-96 bg-sky-500/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Heading */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-bold uppercase tracking-wider text-sky-400 mb-4">
            <Zap className="w-3.5 h-3.5" />
            <span>Next-Generation PMS Architecture</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white mb-6">
            Built for High-Velocity <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-400">Resort & Hotel Operations</span>
          </h2>
          <p className="text-base sm:text-lg text-neutral-400 leading-relaxed">
            Eliminate fragmented software. Experience a high-speed, synchronized operating system designed for modern hospitality businesses.
          </p>
        </div>

        {/* 3D Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Card 1: 2-column Unified PostgreSQL Engine */}
          <div className="lg:col-span-2 group relative rounded-3xl bg-neutral-900/70 border border-white/10 p-6 sm:p-8 hover:border-sky-500/40 transition-all duration-300 hover:shadow-[0_20px_50px_rgba(56,189,248,0.12)] overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-sky-500/10 via-indigo-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex items-center justify-between mb-6">
              <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                <Database className="w-6 h-6" />
              </div>
              <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono font-bold">
                99.98% Uptime
              </span>
            </div>

            <h3 className="text-xl sm:text-2xl font-bold text-white mb-3 group-hover:text-sky-300 transition-colors">
              Supabase PostgreSQL Multi-Schema Architecture
            </h3>
            <p className="text-sm text-neutral-400 leading-relaxed max-w-xl mb-6">
              Industrial-grade database foundation with strict Row-Level Security (RLS) policies and real-time WebSocket subscriptions. Front desk, POS, and housekeeping data syncs across all devices in under 50 milliseconds.
            </p>

            <div className="grid grid-cols-3 gap-3 pt-4 border-t border-white/10">
              <div className="p-3 rounded-xl bg-white/[0.03]">
                <p className="text-xs text-neutral-500">Query Latency</p>
                <p className="text-lg font-bold font-mono text-white">&lt; 42 ms</p>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.03]">
                <p className="text-xs text-neutral-500">Concurrency</p>
                <p className="text-lg font-bold font-mono text-emerald-400">10,000+ RPS</p>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.03]">
                <p className="text-xs text-neutral-500">Security Layer</p>
                <p className="text-lg font-bold font-mono text-sky-400">RLS + Prisma</p>
              </div>
            </div>
          </div>

          {/* Card 2: Kitchen Display Stations (KDS) */}
          <div className="group relative rounded-3xl bg-neutral-900/70 border border-white/10 p-6 sm:p-8 hover:border-amber-500/40 transition-all duration-300 hover:shadow-[0_20px_50px_rgba(245,158,11,0.12)]">
            <div className="flex items-center justify-between mb-6">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <ChefHat className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-mono text-amber-300 font-bold bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                Zero Paper Tickets
              </span>
            </div>

            <h3 className="text-xl font-bold text-white mb-3 group-hover:text-amber-300 transition-colors">
              Smart Kitchen Station Routing
            </h3>
            <p className="text-sm text-neutral-400 leading-relaxed mb-6">
              Orders automatically bifurcate into specialized stations: Grill, Pastry, and Beverage Bar with live cooking timers and audio alert chimes.
            </p>

            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-neutral-300 font-medium">Order Velocity</span>
                <span className="text-amber-400 font-mono font-bold">-35% Prep Delay</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full bg-amber-400 rounded-full" style={{ width: '85%' }} />
              </div>
            </div>
          </div>

          {/* Card 3: Housekeeping Dispatch */}
          <div className="group relative rounded-3xl bg-neutral-900/70 border border-white/10 p-6 sm:p-8 hover:border-teal-500/40 transition-all duration-300 hover:shadow-[0_20px_50px_rgba(20,184,166,0.12)]">
            <div className="flex items-center justify-between mb-6">
              <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
                <Sparkles className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-mono text-teal-300 font-bold bg-teal-500/10 px-2.5 py-0.5 rounded-full border border-teal-500/20">
                Instant Turnaround
              </span>
            </div>

            <h3 className="text-xl font-bold text-white mb-3 group-hover:text-teal-300 transition-colors">
              Automated Room Status Dispatch
            </h3>
            <p className="text-sm text-neutral-400 leading-relaxed mb-6">
              Checkout triggers automated status change to Dirty. Mobile staff view updates in real-time, completing room turnover 40% faster.
            </p>

            <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5 text-xs">
              <span className="text-neutral-400">Average Room Clean Time</span>
              <span className="font-mono font-bold text-teal-300">18.5 Minutes</span>
            </div>
          </div>

          {/* Card 4: Event & Hall Scheduling */}
          <div className="group relative rounded-3xl bg-neutral-900/70 border border-white/10 p-6 sm:p-8 hover:border-purple-500/40 transition-all duration-300 hover:shadow-[0_20px_50px_rgba(168,85,247,0.12)]">
            <div className="flex items-center justify-between mb-6">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <CalendarRange className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-mono text-purple-300 font-bold bg-purple-500/10 px-2.5 py-0.5 rounded-full border border-purple-500/20">
                Up to 1,500 Guests
              </span>
            </div>

            <h3 className="text-xl font-bold text-white mb-3 group-hover:text-purple-300 transition-colors">
              Conference & Hall Scheduling
            </h3>
            <p className="text-sm text-neutral-400 leading-relaxed mb-6">
              Book corporate summits, weddings, and executive banquets with hourly/daily pricing, equipment add-ons, and integrated F&B catering.
            </p>

            <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5 text-xs">
              <span className="text-neutral-400">Event Utilization Rate</span>
              <span className="font-mono font-bold text-purple-300">88.2% Weekend Avg</span>
            </div>
          </div>

          {/* Card 5: Role-Based Access Control (RBAC) */}
          <div className="group relative rounded-3xl bg-neutral-900/70 border border-white/10 p-6 sm:p-8 hover:border-rose-500/40 transition-all duration-300 hover:shadow-[0_20px_50px_rgba(244,63,94,0.12)]">
            <div className="flex items-center justify-between mb-6">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-mono text-rose-300 font-bold bg-rose-500/10 px-2.5 py-0.5 rounded-full border border-rose-500/20">
                8 Granular Roles
              </span>
            </div>

            <h3 className="text-xl font-bold text-white mb-3 group-hover:text-rose-300 transition-colors">
              Enterprise Role-Based Access
            </h3>
            <p className="text-sm text-neutral-400 leading-relaxed mb-6">
              Segregated views for Admin, General Manager, Front Desk, Housekeeper, Chef, Waiter, Cashier, and Guests. Restrict sensitive financial records.
            </p>

            <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5 text-xs">
              <span className="text-neutral-400">Audit Compliance</span>
              <span className="font-mono font-bold text-rose-300">100% Immutable</span>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
