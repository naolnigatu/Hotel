import React, { useState } from 'react';
import { 
  Mail, 
  Phone, 
  MapPin, 
  Send, 
  CheckCircle2, 
  Clock, 
  Building2, 
  Sparkles 
} from 'lucide-react';
import { CmsContact } from '../../types';

interface InquiryContact3DProps {
  contactData?: CmsContact | null;
  mapEmbedUrl?: string;
}

export default function InquiryContact3D({ contactData, mapEmbedUrl }: InquiryContact3DProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [property, setProperty] = useState('');
  const [roomCount, setRoomCount] = useState('20-50');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) return;
    setSubmitting(true);
    // Simulate instantaneous dispatch
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
      setName('');
      setEmail('');
      setProperty('');
      setMessage('');
    }, 600);
  };

  return (
    <section className="py-24 bg-neutral-900 text-white relative overflow-hidden" id="contact">
      {/* Background Lighting */}
      <div className="absolute -bottom-40 left-1/3 w-[600px] h-[300px] bg-sky-500/10 blur-[130px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Heading */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-bold uppercase tracking-wider text-sky-400 mb-4">
            <Mail className="w-3.5 h-3.5" />
            <span>Connect & Inquire</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white mb-6">
            Get in Touch with Our <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-400">Hospitality Team</span>
          </h2>
          <p className="text-base sm:text-lg text-neutral-300 leading-relaxed">
            Whether booking an exclusive corporate event or inquiring about our Hotel Management System, our team is ready 24/7.
          </p>
        </div>

        {/* 2-Column Contact Stage */}
        <div className="grid lg:grid-cols-12 gap-8 items-stretch">
          
          {/* Left Column: Direct Inquiries & Contact Cards */}
          <div className="lg:col-span-5 rounded-3xl bg-neutral-950/80 border border-white/10 p-6 sm:p-8 flex flex-col justify-between space-y-6">
            <div className="space-y-6">
              <div>
                <h3 className="text-2xl font-bold text-white mb-2">Woliso Grand Hotel & Resort</h3>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Located in the scenic landscape of Woliso, Oromia, Ethiopia. Premier accommodation, hot-spring wellness, and cutting-edge conference facilities.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/5">
                  <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-1">Physical Location</h4>
                    <p className="text-xs text-neutral-300 whitespace-pre-wrap leading-relaxed">
                      {contactData?.address || 'Woliso City Center, Main Resort Road\nWoliso, Oromia, Ethiopia'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-1">Direct Telephony</h4>
                    <p className="text-xs text-neutral-300 leading-relaxed">
                      <a href={`tel:${contactData?.phonePrimary || '+251 91 123 4567'}`} className="hover:text-white transition">
                        {contactData?.phonePrimary || '+251 91 123 4567'}
                      </a>
                      <br />
                      <span className="text-neutral-500 text-[11px]">Reception & Concierge: 24/7 Available</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/5">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-1">Inquiry Mail</h4>
                    <p className="text-xs text-neutral-300 leading-relaxed">
                      <a href={`mailto:${contactData?.emailPrimary || 'info@wolisohotel.com'}`} className="hover:text-white transition">
                        {contactData?.emailPrimary || 'info@wolisohotel.com'}
                      </a>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Map Frame or Quick Response Badge */}
            <div className="p-4 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center gap-3">
              <Clock className="w-5 h-5 text-sky-400 shrink-0" />
              <div className="text-xs">
                <span className="font-bold text-white block">Rapid Response SLA</span>
                <span className="text-neutral-400">All guest and enterprise inquiries answered within 15 minutes.</span>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Inquiry & Demo Form */}
          <div className="lg:col-span-7 rounded-3xl bg-neutral-950/90 border border-white/10 p-6 sm:p-10 shadow-2xl flex flex-col justify-between">
            {submitted ? (
              <div className="py-16 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold text-white">Inquiry Received</h3>
                <p className="text-sm text-neutral-300 max-w-md mx-auto">
                  Thank you! Our operations director will review your inquiry and reach out via email shortly.
                </p>
                <button
                  type="button"
                  onClick={() => setSubmitted(false)}
                  className="px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition cursor-pointer"
                >
                  Send Another Inquiry
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <h3 className="text-xl sm:text-2xl font-bold text-white mb-1">Send a Message or Request a Live Demo</h3>
                  <p className="text-xs text-neutral-400">
                    Fill out the form below for event reservations, room block bookings, or a live PMS walkthrough.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1.5">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Abebech Bekele"
                      className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white text-xs placeholder:text-neutral-500 focus:outline-none focus:border-sky-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1.5">Email Address *</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. abebech@example.com"
                      className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white text-xs placeholder:text-neutral-500 focus:outline-none focus:border-sky-500 transition"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1.5">Company / Property Name</label>
                    <input
                      type="text"
                      value={property}
                      onChange={(e) => setProperty(e.target.value)}
                      placeholder="e.g. Rift Valley Lodges Ltd."
                      className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white text-xs placeholder:text-neutral-500 focus:outline-none focus:border-sky-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1.5">Property Size / Interest</label>
                    <select
                      value={roomCount}
                      onChange={(e) => setRoomCount(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-neutral-900 border border-white/10 text-white text-xs focus:outline-none focus:border-sky-500 transition"
                    >
                      <option value="guest-booking">Guest Room Booking / Stay</option>
                      <option value="event-hall">Conference / Wedding Hall Rental</option>
                      <option value="pms-1-25">Hotel PMS: 1 - 25 Rooms</option>
                      <option value="pms-26-100">Hotel PMS: 26 - 100 Rooms</option>
                      <option value="pms-100+">Hotel PMS: 100+ Rooms / Multi-Branch</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5">Message / Requirements</label>
                  <textarea
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Tell us about your dates, guest count, or property management needs..."
                    className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white text-xs placeholder:text-neutral-500 focus:outline-none focus:border-sky-500 transition resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs transition-colors shadow-lg shadow-sky-500/25 cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>{submitting ? 'Transmitting...' : 'Send Inquiry / Request Demo'}</span>
                </button>
              </form>
            )}

            {/* Embedded Location Map Preview */}
            <div className="mt-6 pt-6 border-t border-white/10 rounded-2xl overflow-hidden h-44 bg-neutral-900">
              {mapEmbedUrl ? (
                <iframe 
                  src={mapEmbedUrl} 
                  width="100%" 
                  height="100%" 
                  style={{ border: 0 }} 
                  allowFullScreen 
                  loading="lazy" 
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Hotel Location Map"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-neutral-500 gap-2">
                  <MapPin className="w-4 h-4 text-sky-400" />
                  <span>Woliso Grand Hotel, Woliso, Oromia, Ethiopia</span>
                </div>
              )}
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}
