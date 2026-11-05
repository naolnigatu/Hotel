import React, { useState } from 'react';
import { 
  UserCheck, 
  Utensils, 
  Sparkles, 
  Receipt, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  QrCode,
  ShieldCheck
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function HowItWorks3D() {
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    {
      step: '01',
      title: 'Express Guest Check-In & Walk-In',
      shortDesc: 'Rapid 38-second check-in with digital registration and key allocation.',
      icon: UserCheck,
      details: [
        'Instant guest lookup by name, phone, or reservation code',
        'Direct ID and contact capture with zero paper registration forms',
        'Smart room allocation based on guest preferences and clean status',
        'Instant digital folio creation linked to room number'
      ],
      previewHeadline: 'Front Desk Check-In Protocol',
      previewStat: '38s Check-in time',
      previewBadge: 'Step 1 of 4'
    },
    {
      step: '02',
      title: 'Integrated Dining & POS Room Charges',
      shortDesc: 'Orders taken at tables or room service route to kitchen and bill to room.',
      icon: Utensils,
      details: [
        'Digital waiter tablet ordering with instant station routing',
        'Kitchen display system alerts chef with preparation timers',
        'Single-click "Charge to Room #": verifies guest name before posting',
        'No cash handling required by dining or pool staff'
      ],
      previewHeadline: 'Omnichannel F&B Order Flow',
      previewStat: 'Instant folio post',
      previewBadge: 'Step 2 of 4'
    },
    {
      step: '03',
      title: 'Housekeeping & Maintenance Dispatch',
      shortDesc: 'Automated room status transitions keep inventory ready for new guests.',
      icon: Sparkles,
      details: [
        'Departed rooms immediately update to "Dirty - Priority"',
        'Attendant receives task notification on mobile device',
        'Checklist verification for linens, toiletries, and minibar restock',
        'Supervisor digital inspection unlocks room for immediate arrival'
      ],
      previewHeadline: 'Turnaround Operations',
      previewStat: '18 min turnover avg',
      previewBadge: 'Step 3 of 4'
    },
    {
      step: '04',
      title: 'One-Click Check-Out & Night Audit',
      shortDesc: 'Consolidated folio settlement, invoice issuance, and daily audit.',
      icon: Receipt,
      details: [
        'All room nights, restaurant tabs, and hall rentals combined automatically',
        'Multiple tender options: cash, card, telebirr, or corporate direct bill',
        'Instant branded PDF folio receipt with QR verification pass',
        'Automated night audit balances cash drawers and closes ledger'
      ],
      previewHeadline: 'Financial Reconciliation',
      previewStat: 'Zero ledger variance',
      previewBadge: 'Step 4 of 4'
    }
  ];

  const current = steps[activeStep];
  const CurrentIcon = current.icon;

  return (
    <section className="py-24 bg-neutral-900 text-white relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-bold uppercase tracking-wider text-sky-400 mb-4">
            <Clock className="w-3.5 h-3.5" />
            <span>Seamless Workflow</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white mb-6">
            How Woliso HMS <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-emerald-400">Powers Every Shift</span>
          </h2>
          <p className="text-base sm:text-lg text-neutral-300 leading-relaxed">
            From the moment a guest arrives to the final automated night audit, every step is choreographed for maximum speed, accuracy, and guest satisfaction.
          </p>
        </div>

        {/* Step Selector Pills */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-12">
          {steps.map((st, idx) => {
            const Icon = st.icon;
            const isSelected = activeStep === idx;
            return (
              <button
                key={st.step}
                onClick={() => setActiveStep(idx)}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-neutral-800 border-sky-500 shadow-[0_10px_30px_rgba(56,189,248,0.15)] scale-[1.02]'
                    : 'bg-neutral-950/60 border-white/10 hover:border-white/20 text-neutral-400'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-xs font-mono font-bold ${isSelected ? 'text-sky-400' : 'text-neutral-500'}`}>
                    STEP {st.step}
                  </span>
                  <Icon className={`w-4 h-4 ${isSelected ? 'text-sky-400' : 'text-neutral-500'}`} />
                </div>
                <h4 className={`text-sm font-bold truncate ${isSelected ? 'text-white' : 'text-neutral-300'}`}>
                  {st.title.split(' ')[0]} {st.title.split(' ')[1]}
                </h4>
                <p className="text-[11px] text-neutral-400 line-clamp-1 mt-1">
                  {st.shortDesc}
                </p>
              </button>
            );
          })}
        </div>

        {/* 3D Visual Stage of Current Step */}
        <div 
          className="rounded-3xl bg-neutral-950/90 border border-white/15 p-6 sm:p-10 lg:p-12 shadow-2xl relative overflow-hidden"
          style={{ perspective: '1200px' }}
        >
          <div className="grid lg:grid-cols-12 gap-8 items-center">
            
            <div className="lg:col-span-6 space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                  <CurrentIcon className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs font-mono font-bold text-sky-400 uppercase tracking-widest">{current.previewBadge}</span>
                  <h3 className="text-2xl sm:text-3xl font-bold text-white">{current.title}</h3>
                </div>
              </div>

              <p className="text-sm sm:text-base text-neutral-300 leading-relaxed">
                {current.shortDesc}
              </p>

              <div className="space-y-3 pt-2">
                {current.details.map((detail, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm text-neutral-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{detail}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-4 pt-4">
                <button
                  onClick={() => setActiveStep((activeStep + 1) % steps.length)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-neutral-950 font-bold text-xs hover:bg-neutral-200 transition-colors shadow-xs cursor-pointer"
                >
                  <span>Next Step: {steps[(activeStep + 1) % steps.length].title.split(' ')[0]}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <Link
                  to="/book"
                  className="text-xs font-semibold text-neutral-400 hover:text-white transition-colors"
                >
                  Experience as Guest &rarr;
                </Link>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="rounded-2xl bg-neutral-900/90 border border-white/10 p-6 space-y-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <span className="text-xs font-bold text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    {current.previewHeadline}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-sky-500/10 text-sky-300 text-xs font-mono font-bold">
                    {current.previewStat}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5 space-y-3">
                  <div className="flex items-center justify-between text-xs text-neutral-400">
                    <span>Workflow Acceleration</span>
                    <span className="text-emerald-400 font-bold font-mono">100% Digital Trace</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-sky-400 to-emerald-400 rounded-full transition-all duration-500" 
                      style={{ width: `${((activeStep + 1) / steps.length) * 100}%` }} 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                    <p className="text-neutral-500">Security Check</p>
                    <p className="font-bold text-white mt-1">Verified RLS Policy</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                    <p className="text-neutral-500">Sync Status</p>
                    <p className="font-bold text-emerald-400 mt-1">Real-Time WebSockets</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
}
