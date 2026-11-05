import React from 'react';
import { 
  ShieldCheck, 
  Zap, 
  TrendingUp, 
  Clock, 
  Check, 
  X, 
  Award,
  Sparkles
} from 'lucide-react';

export default function WhyChooseUs3D() {
  const comparisonItems = [
    {
      feature: 'System Architecture',
      woliso: 'Cloud-native Supabase PostgreSQL with real-time WebSockets',
      legacy: 'Fragile on-premise desktop server vulnerable to hardware failure'
    },
    {
      feature: 'Front Desk & POS Sync',
      woliso: 'Instant sub-50ms sync: F&B bills charge directly to room folio',
      legacy: 'Disconnected cash registers requiring manual paper slips'
    },
    {
      feature: 'Kitchen Station Display (KDS)',
      woliso: 'Digital station routing (Grill, Pastry, Bar) with live timers',
      legacy: 'Noisy thermal paper ticket printers with lost tickets'
    },
    {
      feature: 'Night Audit & Financial Closeout',
      woliso: 'Automated 60-second trial balance with zero manual math errors',
      legacy: '2–3 hours of manual spreadsheet reconciliation every night'
    },
    {
      feature: 'Direct Guest Booking Engine',
      woliso: '0% commission direct online reservation with instant QR pass',
      legacy: '18%–25% heavy commission payouts to third-party OTAs'
    },
    {
      feature: 'Data Security & Audit Trail',
      woliso: 'Immutable audit logs with Row-Level Security (RLS) & IP logging',
      legacy: 'Shared Windows passwords with no user accountability'
    }
  ];

  return (
    <section className="py-24 bg-neutral-900 text-white relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-bold uppercase tracking-wider text-sky-400 mb-4">
            <Award className="w-3.5 h-3.5" />
            <span>Competitive Advantage</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white mb-6">
            Why Leading Properties Choose <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-400">Woliso HMS</span>
          </h2>
          <p className="text-base sm:text-lg text-neutral-300 leading-relaxed">
            Legacy hotel software slows down your staff and drains revenue through errors and OTA commissions. See how modern architecture transforms your operation.
          </p>
        </div>

        {/* 4 Big Impact Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-16">
          <div className="p-6 rounded-3xl bg-neutral-950/80 border border-white/10 text-center hover:border-sky-500/40 transition-colors">
            <div className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-mono text-sky-400 mb-2">&lt; 40s</div>
            <p className="text-xs sm:text-sm font-bold text-white mb-1">Check-In Velocity</p>
            <p className="text-xs text-neutral-400">From guest greeting to room key handed</p>
          </div>

          <div className="p-6 rounded-3xl bg-neutral-950/80 border border-white/10 text-center hover:border-emerald-500/40 transition-colors">
            <div className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-mono text-emerald-400 mb-2">0%</div>
            <p className="text-xs sm:text-sm font-bold text-white mb-1">OTA Commission Fees</p>
            <p className="text-xs text-neutral-400">On all direct website reservations</p>
          </div>

          <div className="p-6 rounded-3xl bg-neutral-950/80 border border-white/10 text-center hover:border-amber-500/40 transition-colors">
            <div className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-mono text-amber-400 mb-2">+34%</div>
            <p className="text-xs sm:text-sm font-bold text-white mb-1">F&B Room Charge Revenue</p>
            <p className="text-xs text-neutral-400">Through frictionless folio room posting</p>
          </div>

          <div className="p-6 rounded-3xl bg-neutral-950/80 border border-white/10 text-center hover:border-purple-500/40 transition-colors">
            <div className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-mono text-purple-400 mb-2">99.98%</div>
            <p className="text-xs sm:text-sm font-bold text-white mb-1">Reliability SLA</p>
            <p className="text-xs text-neutral-400">Guaranteed cloud uptime & replication</p>
          </div>
        </div>

        {/* Side-by-Side Comparison Table */}
        <div className="rounded-3xl bg-neutral-950/90 border border-white/10 p-4 sm:p-8 shadow-2xl overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="border-b border-white/10">
                <th className="py-4 px-4 text-xs font-bold uppercase tracking-wider text-neutral-400 w-1/4">Operational Capability</th>
                <th className="py-4 px-4 text-xs font-bold uppercase tracking-wider text-sky-400 w-3/8 bg-sky-500/5 rounded-t-xl">
                  Woliso Cloud HMS (Modern)
                </th>
                <th className="py-4 px-4 text-xs font-bold uppercase tracking-wider text-neutral-500 w-3/8">
                  Traditional Legacy PMS (Outdated)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs sm:text-sm">
              {comparisonItems.map((item, idx) => (
                <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-4 px-4 font-bold text-white">{item.feature}</td>
                  <td className="py-4 px-4 bg-sky-500/[0.03] text-neutral-200">
                    <div className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{item.woliso}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-neutral-400">
                    <div className="flex items-start gap-2">
                      <X className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                      <span>{item.legacy}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </section>
  );
}
