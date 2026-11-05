import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { 
  ArrowRight, 
  Megaphone, 
  Star, 
  Sparkles, 
  X, 
  MessageSquareHeart, 
  CheckCircle2, 
  Building2, 
  Compass, 
  BedDouble, 
  ShieldCheck, 
  Zap,
  Play
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, doc, getDoc, getDocs, query, limit, addDoc } from '@/lib/supabaseAdapter';
import { db } from '@/lib/supabaseAdapter';
import { CmsHome, RoomCategory, MenuItem, Hall, CmsContact, CmsAmenity, Announcement, Testimonial } from '../types';
import { useAuth } from '../context/AuthContext';

// 3D Visual & Architectural Components
import ThreeSceneHero from '../components/home/ThreeSceneHero';
import Hero3DPreview from '../components/home/Hero3DPreview';
import ProductShowcase3D from '../components/home/ProductShowcase3D';
import BentoFeatures3D from '../components/home/BentoFeatures3D';
import HowItWorks3D from '../components/home/HowItWorks3D';
import Accommodations3D from '../components/home/Accommodations3D';
import DiningAndEvents3D from '../components/home/DiningAndEvents3D';
import WhyChooseUs3D from '../components/home/WhyChooseUs3D';
import PricingPackages3D from '../components/home/PricingPackages3D';
import InquiryContact3D from '../components/home/InquiryContact3D';

// 3D Virtual Hotel Walkthrough Components
import VirtualHotelCanvas from '../components/virtualHotel/VirtualHotelCanvas';
import VirtualHotelHUD from '../components/virtualHotel/VirtualHotelHUD';
import HotspotModal from '../components/virtualHotel/HotspotModal';
import { HOTEL_AREAS, HotelArea } from '../components/virtualHotel/virtualHotelData';

export default function Home() {
  const { t } = useTranslation();
  const { currentUser, userData } = useAuth();
  
  const [cmsData, setCmsData] = useState<CmsHome | null>(null);
  const [contactData, setContactData] = useState<CmsContact | null>(null);
  const [featuredRooms, setFeaturedRooms] = useState<RoomCategory[]>([]);
  const [featuredDishes, setFeaturedDishes] = useState<MenuItem[]>([]);
  const [featuredHalls, setFeaturedHalls] = useState<Hall[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [pinnedAnnouncement, setPinnedAnnouncement] = useState<Announcement | null>(null);

  // Testimonial Modal State
  const [showTestimonialModal, setShowTestimonialModal] = useState(false);
  const [showAuthPromptModal, setShowAuthPromptModal] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestRole, setGuestRole] = useState('Hotel Guest');
  const [testimonialContent, setTestimonialContent] = useState('');
  const [testimonialRating, setTestimonialRating] = useState(5);
  const [submittingTestimonial, setSubmittingTestimonial] = useState(false);
  const [testimonialSuccess, setTestimonialSuccess] = useState(false);
  const [approvedTestimonials, setApprovedTestimonials] = useState<Testimonial[]>([]);

  // 3D Virtual Hotel Tour State
  const [viewMode, setViewMode] = useState<'3d' | 'classic'>('3d');
  const [currentArea, setCurrentArea] = useState<HotelArea>(HOTEL_AREAS[0]);
  const [selectedHotspot, setSelectedHotspot] = useState<HotelArea | null>(null);
  const [proximityHotspot, setProximityHotspot] = useState<HotelArea | null>(null);
  const [cameraPosition, setCameraPosition] = useState<[number, number, number]>(HOTEL_AREAS[0].cameraPos);
  const [isTouring, setIsTouring] = useState<boolean>(false);

  const handleOpenTestimonial = () => {
    if (!currentUser) {
      setShowAuthPromptModal(true);
      return;
    }
    setGuestName(userData?.name || currentUser.displayName || '');
    setGuestRole('Hotel Guest');
    setShowTestimonialModal(true);
    setTestimonialSuccess(false);
    setTestimonialContent('');
    setTestimonialRating(5);
  };

  const submitTestimonial = async () => {
    if (!testimonialContent.trim() || !currentUser) return;
    setSubmittingTestimonial(true);
    try {
      await addDoc(collection(db, 'testimonials'), {
        name: guestName.trim() || userData?.name || currentUser.displayName || 'Verified Guest',
        role: guestRole || 'Hotel Guest',
        content: testimonialContent.trim(),
        rating: testimonialRating,
        userId: currentUser.uid,
        userEmail: currentUser.email || '',
        status: 'pending',
        createdAt: Date.now()
      });
      setTestimonialSuccess(true);
    } catch (e) {
      console.error(e);
      alert('Failed to submit testimonial.');
    } finally {
      setSubmittingTestimonial(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch CMS data
        const docRef = doc(db, 'settings', 'cms_home');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setCmsData(docSnap.data().data as CmsHome);
        }

        const contactRef = doc(db, 'settings', 'cms_contact');
        const contactSnap = await getDoc(contactRef);
        if (contactSnap.exists()) {
          setContactData(contactSnap.data().data);
        }

        // Fetch rooms
        const roomsQ = query(collection(db, 'room_categories'), limit(3));
        const roomsSnap = await getDocs(roomsQ);
        setFeaturedRooms(roomsSnap.docs.map(d => ({ id: d.id, ...d.data() } as RoomCategory)));

        // Fetch dining dishes
        const dishesQ = query(collection(db, 'menu_items'), limit(4));
        const dishesSnap = await getDocs(dishesQ);
        setFeaturedDishes(dishesSnap.docs.map(d => ({ id: d.id, ...d.data() } as MenuItem)));

        // Fetch halls
        const hallsQ = query(collection(db, 'halls'), limit(2));
        const hallsSnap = await getDocs(hallsQ);
        setFeaturedHalls(hallsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Hall)));

        // Fetch announcements
        const annQ = query(collection(db, 'announcements'), limit(4));
        const annSnap = await getDocs(annQ);
        const annList = annSnap.docs.map(d => ({ id: d.id, ...d.data() } as Announcement));
        setAnnouncements(annList);
        const pinned = annList.find(a => a.isPinned && a.isPublished);
        if (pinned) setPinnedAnnouncement(pinned);

        // Fetch approved testimonials
        const testQ = query(collection(db, 'testimonials'), limit(6));
        const testSnap = await getDocs(testQ);
        const tests = testSnap.docs.map(d => ({ id: d.id, ...d.data() } as Testimonial));
        setApprovedTestimonials(tests.filter(t => (t as any).status === 'approved' || !(t as any).status));
      } catch (err) {
        console.error("Error loading home data:", err);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="flex flex-col bg-neutral-950 text-neutral-100 min-h-screen selection:bg-sky-500 selection:text-white">
      
      {/* ---------------- 3D VIRTUAL HOTEL WALKTHROUGH EXPERIENCE ---------------- */}
      {viewMode === '3d' ? (
        <section className="relative w-full h-[88vh] sm:h-[92vh] min-h-[580px] overflow-hidden border-b border-white/10 bg-[#0a0c10]">
          {/* Three.js 3D Virtual Hotel WebGL Canvas */}
          <VirtualHotelCanvas
            onSelectHotspot={(area) => setSelectedHotspot(area)}
            currentAreaId={currentArea.id}
            onAreaChange={(area) => {
              setCurrentArea(area);
              setProximityHotspot(area);
            }}
            isTouring={isTouring}
            onUpdateCameraPos={(pos) => setCameraPosition(pos)}
          />

          {/* Interactive HUD Overlay (Teleporter, Radar Mini-map, Tour Autopilot) */}
          <VirtualHotelHUD
            currentArea={currentArea}
            activeHotspot={proximityHotspot}
            cameraPosition={cameraPosition}
            isTouring={isTouring}
            onToggleTour={() => setIsTouring(prev => !prev)}
            onSelectArea={(areaId) => {
              const area = HOTEL_AREAS.find(a => a.id === areaId);
              if (area) {
                setCurrentArea(area);
                setIsTouring(false);
              }
            }}
            onSelectHotspot={(area) => setSelectedHotspot(area)}
            onToggleViewMode={() => setViewMode('classic')}
            viewMode={viewMode}
          />

          {/* Contextual Hotspot / Room Discovery Modal */}
          <HotspotModal
            area={selectedHotspot}
            onClose={() => setSelectedHotspot(null)}
            onTeleport={(areaId) => {
              const area = HOTEL_AREAS.find(a => a.id === areaId);
              if (area) {
                setCurrentArea(area);
                setIsTouring(false);
              }
            }}
          />
        </section>
      ) : (
        /* Classic SaaS Hero Section (when user toggles to classic overview) */
        <section className="relative min-h-[92vh] flex flex-col justify-center items-center overflow-hidden pt-20 pb-16 px-4 sm:px-6 lg:px-8">
          <ThreeSceneHero />
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[900px] h-[450px] bg-gradient-to-b from-sky-500/15 via-indigo-500/10 to-transparent blur-[140px] pointer-events-none rounded-full" />
          
          <div className="relative z-10 text-center max-w-4xl mx-auto space-y-6 pt-4">
            
            {/* 3D Mode Re-entry Pill */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-sky-500/15 border border-sky-400/30 text-xs font-semibold text-sky-200 backdrop-blur-xl shadow-lg cursor-pointer hover:bg-sky-500/25 transition"
              onClick={() => {
                setViewMode('3d');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              <Compass className="w-3.5 h-3.5 text-sky-400 animate-spin" />
              <span>Immersive 3D Virtual Walkthrough Available</span>
              <span className="text-neutral-500">•</span>
              <span className="underline font-bold text-white">Enter 3D Tour →</span>
            </motion.div>

            {/* Main Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1 }}
              className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.1]"
            >
              The Operating System for{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-indigo-300 to-amber-300">
                Modern Hospitality
              </span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-base sm:text-xl text-neutral-300 max-w-2xl mx-auto leading-relaxed font-normal"
            >
              {cmsData?.heroSubtitle || 
                'Unified Front Desk, Kitchen Display Stations, Direct Guest Booking, and Real-Time Multi-Schema PostgreSQL Analytics. Built for luxury hotels, resorts, and modern chains.'}
            </motion.p>

            {/* Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2"
            >
              <button
                onClick={() => {
                  setViewMode('3d');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-sm transition-all shadow-[0_0_30px_rgba(56,189,248,0.35)] hover:scale-[1.02] cursor-pointer"
              >
                <Compass className="w-4 h-4 text-white" />
                <span>Launch 3D Virtual Hotel Tour</span>
              </button>

              <Link
                to="/rooms"
                className="flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-white text-neutral-950 font-bold text-sm hover:bg-neutral-200 transition-all shadow-lg hover:scale-[1.02] cursor-pointer"
              >
                <BedDouble className="w-4 h-4 text-sky-600" />
                <span>Direct Room Reservation</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>

            {/* Quick Pillar Highlights */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.5 }}
              className="flex flex-wrap items-center justify-center gap-6 pt-4 text-xs text-neutral-400 font-medium"
            >
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                0% OTA Booking Fees
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" />
                Sub-50ms Real-Time Sync
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                Multi-Role Security (RLS)
              </span>
            </motion.div>
          </div>

          <div className="w-full relative z-10 mt-8">
            <Hero3DPreview />
          </div>
        </section>
      )}

      {/* Seamless Transition / Specifications Header Strip */}
      <div id="specifications" className="bg-neutral-900/90 border-y border-white/10 py-3.5 px-4 backdrop-blur-xl relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-lg bg-sky-500/20 text-sky-400 shrink-0">
              <Sparkles className="w-4 h-4" />
            </span>
            <div>
              <p className="text-xs font-bold text-white">
                {viewMode === '3d' 
                  ? '3D Virtual Walkthrough Active: Explore Spaces & Features' 
                  : 'Classic Overview Mode: Comprehensive System Specifications'}
              </p>
              <p className="text-[11px] text-neutral-400">
                {viewMode === '3d'
                  ? 'Walk with WASD/Arrows, click glowing beacons for PMS tools, or view complete system breakdown below.'
                  : 'Browse all hotel amenities, restaurant menus, conference venues, and cloud PMS pricing.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                setViewMode(v => v === '3d' ? 'classic' : '3d');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="text-xs font-bold px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/15 transition cursor-pointer"
            >
              {viewMode === '3d' ? 'Switch to Classic Layout' : 'Switch to 3D Virtual Walkthrough'}
            </button>
          </div>
        </div>
      </div>

      {/* Pinned Announcement Notice Strip (if active in database) */}
      {pinnedAnnouncement && (
        <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 text-white py-3.5 px-4 shadow-sm relative z-20">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
            <div className="flex items-center gap-2.5">
              <span className="p-1.5 bg-white/20 rounded-lg shrink-0">
                <Megaphone className="w-4 h-4 text-white" />
              </span>
              <span className="text-[11px] font-black uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded text-white">
                {pinnedAnnouncement.badge || 'Hotel Notice'}
              </span>
              <p className="text-xs sm:text-sm font-bold truncate max-w-2xl text-white">
                {pinnedAnnouncement.title}
              </p>
            </div>
            <Link 
              to={`/announcements?id=${pinnedAnnouncement.id}`}
              className="shrink-0 text-xs font-bold bg-white text-neutral-900 px-4 py-1.5 rounded-full hover:bg-neutral-100 transition shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <span>Read Announcement</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* 2. Authentic Application Modules Showcase */}
      <ProductShowcase3D />

      {/* 3. 3D Bento Grid Capabilities & Architecture */}
      <BentoFeatures3D />

      {/* 4. Interactive 4-Step Operational Workflow */}
      <HowItWorks3D />

      {/* 5. Authentic Accommodations Showcase (Directly linked to Supabase room data) */}
      <Accommodations3D 
        rooms={featuredRooms} 
        title={cmsData?.roomsSectionTitle} 
        subtitle={cmsData?.roomsSectionSubtitle} 
      />

      {/* 6. Culinary Dining & Convention Venues */}
      <DiningAndEvents3D dishes={featuredDishes} halls={featuredHalls} />

      {/* 7. Why Choose Us (Competitive Advantage & Real Metrics) */}
      <WhyChooseUs3D />

      {/* 8. SaaS Pricing & Subscription Packages */}
      <PricingPackages3D />

      {/* 9. Authentic Guest Reviews & Verified Testimonials */}
      {(() => {
        const displayTestimonials = [
          ...approvedTestimonials,
          ...(cmsData?.testimonials || [])
        ].slice(0, 6);

        return (
          <section className="py-24 bg-neutral-950 text-white relative overflow-hidden" id="testimonials">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
              
              <div className="text-center max-w-3xl mx-auto mb-16">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-bold uppercase tracking-wider text-amber-400 mb-4">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span>Verified Guest & Operator Trust</span>
                </div>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white mb-4">
                  {cmsData?.testimonialsTitle || 'Loved by Guests & Hotel Operators'}
                </h2>
                <p className="text-base sm:text-lg text-neutral-400 leading-relaxed mb-6">
                  {cmsData?.testimonialsSubtitle || 'Read authentic reviews from guests who have stayed, dined, and hosted corporate events at Woliso.'}
                </p>

                <button 
                  onClick={handleOpenTestimonial}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-white text-neutral-950 rounded-full font-bold text-xs hover:bg-neutral-200 transition-all shadow-md hover:shadow-lg cursor-pointer transform hover:-translate-y-0.5"
                >
                  <MessageSquareHeart className="w-4 h-4 text-rose-500" />
                  <span>Share Your Experience / Testimonial</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {displayTestimonials.map((test, idx) => (
                  <div 
                    key={test.id || idx}
                    className="p-6 rounded-3xl bg-neutral-900/80 border border-white/10 flex flex-col justify-between hover:border-amber-500/30 transition-all shadow-xl"
                  >
                    <div>
                      <div className="flex gap-1 mb-4 text-amber-400">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className={`w-4 h-4 ${i < test.rating ? 'fill-current' : 'text-neutral-700'}`} />
                        ))}
                      </div>
                      <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed italic mb-6">
                        "{test.content}"
                      </p>
                    </div>

                    <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-white text-xs sm:text-sm">{test.name}</h4>
                        <p className="text-[11px] text-neutral-400">{test.role}</p>
                      </div>
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        Verified
                      </span>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          </section>
        );
      })()}

      {/* 10. Contact Section & Direct Inquiries */}
      <InquiryContact3D contactData={contactData} mapEmbedUrl={cmsData?.mapEmbedUrl} />

      {/* Testimonial Creation Modal */}
      <AnimatePresence>
        {showTestimonialModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-neutral-900 border border-white/15 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative text-white"
            >
              <button
                onClick={() => setShowTestimonialModal(false)}
                className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              {testimonialSuccess ? (
                <div className="py-8 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-white">Thank You!</h3>
                  <p className="text-xs text-neutral-300">
                    Your testimonial has been submitted and will appear on the website once approved by the administration.
                  </p>
                  <button
                    onClick={() => setShowTestimonialModal(false)}
                    className="px-6 py-2 rounded-xl bg-white text-neutral-950 font-bold text-xs hover:bg-neutral-200 transition"
                  >
                    Close
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <h3 className="text-xl font-bold text-white">Leave a Review / Testimonial</h3>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1">Your Rating</label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setTestimonialRating(star)}
                          className="cursor-pointer"
                        >
                          <Star className={`w-6 h-6 ${star <= testimonialRating ? 'text-amber-400 fill-current' : 'text-neutral-700'}`} />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1">Your Name</label>
                    <input
                      type="text"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      placeholder="e.g. Samuel K."
                      className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1">Your Experience</label>
                    <textarea
                      rows={4}
                      value={testimonialContent}
                      onChange={(e) => setTestimonialContent(e.target.value)}
                      placeholder="Share details of your stay, room comfort, dining, or event experience..."
                      className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:border-sky-500 resize-none"
                    />
                  </div>

                  <button
                    onClick={submitTestimonial}
                    disabled={submittingTestimonial || !testimonialContent.trim()}
                    className="w-full py-3 rounded-xl bg-sky-500 text-white font-bold text-xs hover:bg-sky-400 transition cursor-pointer disabled:opacity-50"
                  >
                    {submittingTestimonial ? 'Submitting...' : 'Submit Testimonial'}
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Auth Prompt Modal (When Unsigned Guest Tries to Leave Testimonial) */}
      <AnimatePresence>
        {showAuthPromptModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-neutral-900 border border-white/15 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative text-center text-white"
            >
              <button
                onClick={() => setShowAuthPromptModal(false)}
                className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="w-12 h-12 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center mx-auto mb-4">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Guest Sign-In Required</h3>
              <p className="text-xs text-neutral-300 mb-6">
                To guarantee 100% authentic verified feedback, please sign in with your account before leaving a testimonial.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowAuthPromptModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-white/15 text-neutral-300 text-xs font-bold hover:bg-white/5 transition"
                >
                  Cancel
                </button>
                <Link
                  to="/login"
                  className="flex-1 py-2.5 rounded-xl bg-white text-neutral-950 text-xs font-bold hover:bg-neutral-200 transition"
                >
                  Sign In
                </Link>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
