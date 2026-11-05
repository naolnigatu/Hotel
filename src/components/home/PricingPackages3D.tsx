import React, { useState } from 'react';
import { Check, Sparkles, Zap, Building, Crown, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PricingPackages3D() {
  const [annualBilling, setAnnualBilling] = useState(true);

  const plans = [
    {
      name: 'Boutique PMS',
      description: 'Ideal for independent hotels, guest houses, and luxury lodges up to 25 rooms.',
      priceMonthly: 120,
      priceAnnual: 95,
      currency: '$',
      etbMonthly: 14500,
      etbAnnual: 11600,
      icon: Building,
      popular: false,
      features: [
        'Up to 25 Rooms & Suites',
        'Front Desk & Reservation Calendar',
        'Digital Walk-In Quick Registration',
        'Guest Booking Engine (Zero Commission)',
        'Basic Housekeeping Status Dispatch',
        'Single Cashier Drawer Balancing',
        'Standard Email & Chat Support'
      ],
      ctaText: 'Start 14-Day Free Trial',
      ctaLink: '/login',
      ctaPrimary: false
    },
    {
      name: 'Resort & Convention',
      description: 'Complete operational power for full-service hotels, resorts, and conference centers.',
      priceMonthly: 280,
      priceAnnual: 220,
      currency: '$',
      etbMonthly: 33600,
      etbAnnual: 26800,
      icon: Sparkles,
      popular: true,
      badge: 'Most Popular',
      features: [
        'Up to 100 Rooms & Multi-Halls',
        'Full Restaurant POS & Table Mapping',
        'Smart Kitchen Display System (KDS)',
        'Conference & Event Hall Booking Engine',
        'Automated Housekeeping Turnover Pipeline',
        'Daily Night Audit & Revenue Ledger (ADR/RevPAR)',
        'Role-Based Access Control (8 Staff Roles)',
        'Priority 24/7 Phone & Ticket Support'
      ],
      ctaText: 'Deploy Resort Plan',
      ctaLink: '/login',
      ctaPrimary: true
    },
    {
      name: 'Enterprise Multi-Property',
      description: 'Custom architecture for hotel chains, luxury resort groups, and hospitality conglomerates.',
      priceMonthly: 590,
      priceAnnual: 470,
      currency: '$',
      etbMonthly: 70800,
      etbAnnual: 56400,
      icon: Crown,
      popular: false,
      features: [
        'Unlimited Rooms, Halls & F&B Outlets',
        'Multi-Property Central Reservation System (CRS)',
        'Consolidated Group Financial Reporting',
        'Dedicated Supabase PostgreSQL Instance',
        'Custom Third-Party Channel Manager Integration',
        'Immutable Cryptographic Audit Trails',
        'Dedicated Technical Account Manager',
        '99.99% Guaranteed SLA Uptime'
      ],
      ctaText: 'Contact Enterprise Sales',
      ctaLink: '/contact',
      ctaPrimary: false
    }
  ];

  return (
    <section className="py-24 bg-neutral-950 text-white relative overflow-hidden" id="pricing">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-indigo-500/10 blur-[150px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Heading */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-bold uppercase tracking-wider text-sky-400 mb-4">
            <Zap className="w-3.5 h-3.5" />
            <span>Transparent SaaS Investment</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white mb-6">
            Predictable Pricing for <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-indigo-300 to-amber-300">Modern Hoteliers</span>
          </h2>
          <p className="text-base sm:text-lg text-neutral-400 leading-relaxed mb-8">
            No hidden booking fees, no commission slices taken from your guests. Choose the plan tailored for your property scale.
          </p>

          {/* Billing Toggle (Monthly / Annual) */}
          <div className="inline-flex items-center gap-3 p-1.5 rounded-full bg-neutral-900 border border-white/10">
            <button
              onClick={() => setAnnualBilling(false)}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                !annualBilling ? 'bg-white text-neutral-950 shadow-xs' : 'text-neutral-400 hover:text-white'
              }`}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => setAnnualBilling(true)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                annualBilling ? 'bg-white text-neutral-950 shadow-xs' : 'text-neutral-400 hover:text-white'
              }`}
            >
              <span>Annual Billing</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-extrabold">
                Save 20%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
          {plans.map((plan, idx) => {
            const Icon = plan.icon;
            const price = annualBilling ? plan.priceAnnual : plan.priceMonthly;
            const etbPrice = annualBilling ? plan.etbAnnual : plan.etbMonthly;

            return (
              <div
                key={idx}
                className={`relative rounded-3xl p-8 flex flex-col justify-between transition-all duration-300 ${
                  plan.popular
                    ? 'bg-neutral-900/95 border-2 border-sky-400/80 shadow-[0_20px_60px_rgba(56,189,248,0.2)] lg:-translate-y-3'
                    : 'bg-neutral-900/60 border border-white/10 hover:border-white/20'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="px-4 py-1 rounded-full bg-gradient-to-r from-sky-400 to-indigo-500 text-neutral-950 text-xs font-black uppercase tracking-wider shadow-md">
                      {plan.badge}
                    </span>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                      plan.popular ? 'bg-sky-500/20 text-sky-400' : 'bg-white/5 text-neutral-300'
                    }`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-mono text-neutral-400">
                      {annualBilling ? 'Billed annually' : 'Billed monthly'}
                    </span>
                  </div>

                  <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                  <p className="text-xs text-neutral-400 leading-relaxed mb-6">{plan.description}</p>

                  <div className="mb-6 pb-6 border-b border-white/10">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl sm:text-5xl font-extrabold font-mono text-white">
                        {plan.currency}{price}
                      </span>
                      <span className="text-xs text-neutral-400">/ month</span>
                    </div>
                    <p className="text-xs text-neutral-400 mt-1 font-mono">
                      ≈ {etbPrice.toLocaleString()} ETB / month
                    </p>
                  </div>

                  {/* Feature Checklist */}
                  <div className="space-y-3 mb-8">
                    <p className="text-xs font-bold text-neutral-300 uppercase tracking-wider">Features Included:</p>
                    {plan.features.map((feat, i) => (
                      <div key={i} className="flex items-start gap-2.5 text-xs text-neutral-300">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Link
                    to={plan.ctaLink}
                    className={`flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-bold text-sm transition-all cursor-pointer ${
                      plan.ctaPrimary
                        ? 'bg-sky-400 text-neutral-950 hover:bg-sky-300 shadow-lg shadow-sky-400/25'
                        : 'bg-white/10 text-white hover:bg-white/20 border border-white/15'
                    }`}
                  >
                    <span>{plan.ctaText}</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
