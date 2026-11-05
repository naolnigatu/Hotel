import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { doc, getDoc } from '@/lib/supabaseAdapter';
import { db } from '@/lib/supabaseAdapter';
import { CmsContact, CmsFooter } from '../types';
import { Building2, ShieldCheck, Mail, Phone, MapPin, ArrowUpRight } from 'lucide-react';

export default function Footer() {
  const { t } = useTranslation();
  const [contactData, setContactData] = useState<CmsContact | null>(null);
  const [footerData, setFooterData] = useState<CmsFooter | null>(null);
  const [hotelName, setHotelName] = useState('');

  useEffect(() => {
    const fetchFooterData = async () => {
      try {
        const contactRef = doc(db, 'settings', 'cms_contact');
        const contactSnap = await getDoc(contactRef);
        if (contactSnap.exists()) setContactData(contactSnap.data().data as CmsContact);

        const footerRef = doc(db, 'settings', 'cms_footer');
        const footerSnap = await getDoc(footerRef);
        if (footerSnap.exists()) setFooterData(footerSnap.data().data as CmsFooter);

        const hotelRef = doc(db, 'app_settings', 'hotel');
        const hotelSnap = await getDoc(hotelRef);
        if (hotelSnap.exists() && hotelSnap.data().hotelName) {
          setHotelName(hotelSnap.data().hotelName);
        }
      } catch (error) {
        console.error("Error fetching footer data:", error);
      }
    };
    fetchFooterData();
  }, []);

  const displayHotelName = hotelName || t('hotel_name');

  return (
    <footer className="bg-neutral-950 text-neutral-400 py-16 mt-auto border-t border-white/10 relative z-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Top Bar with System Status */}
        <div className="flex flex-col sm:flex-row items-center justify-between pb-12 mb-12 border-b border-white/10 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white">
              <Building2 className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <span className="font-bold text-white text-lg tracking-tight block">{displayHotelName}</span>
              <span className="text-xs text-neutral-400">Cloud Hotel Management & Luxury Resort Platform</span>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/10 text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-emerald-400 font-bold">99.98% Systems Operational</span>
            <span className="text-neutral-500">•</span>
            <span className="text-neutral-400">Supabase RLS Active</span>
          </div>
        </div>

        {/* 4-Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          
          {/* Col 1: Brand & Contact Info */}
          <div>
            <h4 className="text-white font-bold text-sm uppercase tracking-wider mb-4">Property & Headquarters</h4>
            <div className="space-y-3 text-xs text-neutral-400">
              <p className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-neutral-500 shrink-0 mt-0.5" />
                <span className="whitespace-pre-wrap">{contactData?.address || 'Woliso City Center, Main Resort Road\nWoliso, Oromia, Ethiopia'}</span>
              </p>
              {contactData?.emailPrimary && (
                <p className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-neutral-500 shrink-0" />
                  <a href={`mailto:${contactData.emailPrimary}`} className="hover:text-white transition-colors">{contactData.emailPrimary}</a>
                </p>
              )}
              {contactData?.phonePrimary && (
                <p className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-neutral-500 shrink-0" />
                  <a href={`tel:${contactData.phonePrimary}`} className="hover:text-white transition-colors">{contactData.phonePrimary}</a>
                </p>
              )}
            </div>
          </div>
          
          {/* Col 2: Guest Services & Booking */}
          <div>
            <h4 className="text-white font-bold text-sm uppercase tracking-wider mb-4">Guest Experience</h4>
            <ul className="space-y-2.5 text-xs">
              <li><Link to="/rooms" className="hover:text-white transition-colors">Luxury Rooms & Suites</Link></li>
              <li><Link to="/book" className="hover:text-white transition-colors">Direct Room Reservation (0% Fee)</Link></li>
              <li><Link to="/restaurant" className="hover:text-white transition-colors">Restaurant & Dining Menu</Link></li>
              <li><Link to="/halls" className="hover:text-white transition-colors">Conference Halls & Banquets</Link></li>
              <li><Link to="/amenities" className="hover:text-white transition-colors">Wellness, Pool & Amenities</Link></li>
              <li><Link to="/track-reservation" className="hover:text-white transition-colors">Track Reservation Folio</Link></li>
            </ul>
          </div>
          
          {/* Col 3: PMS Platform & Modules */}
          <div>
            <h4 className="text-white font-bold text-sm uppercase tracking-wider mb-4">SaaS Platform Modules</h4>
            <ul className="space-y-2.5 text-xs">
              <li><Link to="/dashboard" className="hover:text-white transition-colors flex items-center gap-1"><span>Staff Portal & Front Desk</span><ArrowUpRight className="w-3 h-3 text-sky-400" /></Link></li>
              <li><Link to="/login" className="hover:text-white transition-colors">Kitchen Display System (KDS)</Link></li>
              <li><Link to="/login" className="hover:text-white transition-colors">Digital Waiter POS App</Link></li>
              <li><Link to="/login" className="hover:text-white transition-colors">Housekeeping Turnover Dispatch</Link></li>
              <li><Link to="/login" className="hover:text-white transition-colors">Night Audit & Financial Reports</Link></li>
              <li><Link to="/#pricing" className="hover:text-white transition-colors">SaaS Pricing & Plans</Link></li>
            </ul>
          </div>
          
          {/* Col 4: Business Hours & Legal */}
          <div>
            <h4 className="text-white font-bold text-sm uppercase tracking-wider mb-4">Operating Hours</h4>
            <p className="text-xs text-neutral-400 whitespace-pre-wrap mb-6">
              {footerData?.businessHours || 'Front Desk: 24/7 Service\nRestaurant: 6:00 AM - 10:30 PM\nRoom Service: 24 Hours'}
            </p>

            <h4 className="text-white font-bold text-sm uppercase tracking-wider mb-2">Legal & Security</h4>
            <ul className="space-y-2 text-xs">
              <li><Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
              <li><Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy & RLS Data Protection</Link></li>
            </ul>
          </div>
          
        </div>
        
        {/* Bottom Copyright */}
        <div className="mt-12 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-500">
          <p>{footerData?.copyrightText || `© ${new Date().getFullYear()} ${displayHotelName}. All rights reserved.`}</p>
          <div className="flex items-center gap-4 text-neutral-400">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>SOC-2 & RLS Compliant Architecture</span>
            </span>
          </div>
        </div>

      </div>
    </footer>
  );
}
