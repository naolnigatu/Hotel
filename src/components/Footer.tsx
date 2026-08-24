import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { CmsContact, CmsFooter } from '../types';

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
    <footer className="bg-neutral-900 text-neutral-400 py-16 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
        
        {/* Brand & Contact Info */}
        <div>
          <h3 className="text-white text-xl font-bold mb-6">{displayHotelName}</h3>
          <div className="space-y-3 text-sm">
            <p className="whitespace-pre-wrap">{contactData?.address || 'Woliso, Ethiopia'}</p>
            {contactData?.emailPrimary && (
              <p><a href={`mailto:${contactData.emailPrimary}`} className="hover:text-white transition-colors">{contactData.emailPrimary}</a></p>
            )}
            {contactData?.phonePrimary && (
              <p><a href={`tel:${contactData.phonePrimary}`} className="hover:text-white transition-colors">{contactData.phonePrimary}</a></p>
            )}
          </div>
        </div>
        
        {/* Quick Links */}
        <div>
          <h4 className="text-white font-bold mb-6">Quick Links</h4>
          <ul className="space-y-3 text-sm">
            <li><Link to="/" className="hover:text-white transition-colors">{t('home')}</Link></li>
            <li><Link to="/rooms" className="hover:text-white transition-colors">{t('rooms')}</Link></li>
            <li><Link to="/halls" className="hover:text-white transition-colors">Halls & Events</Link></li>
            <li><Link to="/restaurant" className="hover:text-white transition-colors">{t('restaurant')}</Link></li>
            <li><Link to="/amenities" className="hover:text-white transition-colors">Amenities</Link></li>
            <li><Link to="/offers" className="hover:text-white transition-colors">Special Offers</Link></li>
            <li><Link to="/announcements" className="hover:text-white transition-colors">Announcements & News</Link></li>
            <li><Link to="/attractions" className="hover:text-white transition-colors">Attractions</Link></li>
            <li><Link to="/gallery" className="hover:text-white transition-colors">Gallery</Link></li>
          </ul>
        </div>
        
        {/* Business Hours & Legal */}
        <div>
          <h4 className="text-white font-bold mb-6">Business Hours</h4>
          <p className="text-sm whitespace-pre-wrap mb-8">
            {footerData?.businessHours || 'Reception: 24/7\nRestaurant: 6:00 AM - 10:00 PM'}
          </p>

          <h4 className="text-white font-bold mb-6">Legal</h4>
          <ul className="space-y-3 text-sm">
            <li><Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
            <li><Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
          </ul>
        </div>
        
        {/* Newsletter & Socials */}
        <div>
          <h4 className="text-white font-bold mb-6">Newsletter</h4>
          <div className="flex gap-2 mb-8">
            <input type="email" placeholder="Email address" className="bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2.5 text-sm text-white w-full focus:ring-1 focus:ring-white outline-none" />
            <button className="bg-white text-neutral-900 px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-neutral-200 transition-colors">Subscribe</button>
          </div>
          
          <h4 className="text-white font-bold mb-6">Connect</h4>
          <div className="flex gap-4">
            {contactData?.facebookUrl && (
              <a href={contactData.facebookUrl} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center hover:bg-neutral-700 hover:text-white transition-colors">FB</a>
            )}
            {contactData?.instagramUrl && (
              <a href={contactData.instagramUrl} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center hover:bg-neutral-700 hover:text-white transition-colors">IG</a>
            )}
            {contactData?.twitterUrl && (
              <a href={contactData.twitterUrl} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center hover:bg-neutral-700 hover:text-white transition-colors">TW</a>
            )}
          </div>
        </div>
        
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-16 pt-8 border-t border-neutral-800 text-sm text-center">
        {footerData?.copyrightText || `© ${new Date().getFullYear()} ${displayHotelName}. All rights reserved.`}
      </div>
    </footer>
  );
}
