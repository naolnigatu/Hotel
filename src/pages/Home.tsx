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
import Spaces3DExplorer from '../components/home/Spaces3DExplorer';
import ProductShowcase3D from '../components/home/ProductShowcase3D';
import BentoFeatures3D from '../components/home/BentoFeatures3D';
import HowItWorks3D from '../components/home/HowItWorks3D';
import Accommodations3D from '../components/home/Accommodations3D';
import DiningAndEvents3D from '../components/home/DiningAndEvents3D';
import WhyChooseUs3D from '../components/home/WhyChooseUs3D';
import PricingPackages3D from '../components/home/PricingPackages3D';
import InquiryContact3D from '../components/home/InquiryContact3D';

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
          setCmsData(docSnap.data() as CmsHome);
        }

        // Fetch contact data
        const contactRef = doc(db, 'settings', 'cms_contact');
        const contactSnap = await getDoc(contactRef);
        if (contactSnap.exists()) {
          setContactData(contactSnap.data() as CmsContact);
        }

        // Fetch rooms
        const roomsQ = query(collection(db, 'room_categories'), limit(3));
        const roomsSnap = await getDocs(roomsQ);
        setFeaturedRooms(roomsSnap.docs.map(d => ({ id: d.id, ...d.data() } as RoomCategory)));

        // Fetch dishes
        const menuQ = query(collection(db, 'menu_items'), limit(4));
        const menuSnap = await getDocs(menuQ);
        setFeaturedDishes(menuSnap.docs.map(d => ({ id: d.id, ...d.data() } as MenuItem)));

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
      
      {/* ---------------- 1. HERO SECTION WITH 3D WEBGL ATMOSPHERE & COCKPIT ---------------- */}
      <section className="relative min-h-[95vh] flex flex-col justify-center items-center overflow-hidden pt-20 pb-16 px-4 sm:px-6 lg:px-8">
        
        {/* Three.js 3D WebGL Ambient Atmosphere in Background */}
        <ThreeSceneHero />

        {/* Ambient Gradient Glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[900px] h-[450px] bg-gradient-to-b from-sky-500/15 via-indigo-500/10 to-transparent blur-[140px] pointer-events-none rounded-full" />
        
        <div className="relative z-10 text-center max-w-4xl mx-auto space-y-6 pt-4">
          
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.06] border border-white/15 text-xs font-semibold text-neutral-200 backdrop-blur-xl shadow-lg"
          >
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500" />
            </span>
            <span className="text-sky-400 font-bold uppercase tracking-wider text-[11px]">Woliso HMS Platform</span>
            <span className="text-neutral-500">•</span>
            <span>Where 5-Star Luxury Meets Intelligent Cloud PMS</span>
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

          {/* Primary & Secondary Call to Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2"
          >
            <Link
              to="/rooms"
              className="flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-white text-neutral-950 font-bold text-sm hover:bg-neutral-200 transition-all shadow-[0_0_30px_rgba(255,255,255,0.25)] hover:scale-[1.02] cursor-pointer"
            >
              <BedDouble className="w-4 h-4 text-sky-600" />
              <span>Direct Room Reservation</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              to="/dashboard"
              className="flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/15 text-white font-bold text-sm backdrop-blur-xl transition-all hover:scale-[1.02] cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Launch Staff Operations Hub</span>
            </Link>

            <a
              href="#virtual-tour"
              className="flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 border border-sky-400/30 text-sky-300 font-semibold text-sm backdrop-blur-xl transition-all cursor-pointer"
            >
              <Compass className="w-4 h-4 text-sky-400" />
              <span>Explore 3D Hotel Spaces</span>
            </a>
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
              Sub-30ms Real-Time Sync
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
              Multi-Role Security (RLS)
            </span>
          </motion.div>

        </div>

        {/* 3D Perspective Floating Dashboard Preview */}
        <div className="w-full relative z-10 mt-10">
          <Hero3DPreview />
        </div>

      </section>

      {/* ---------------- PINNED ANNOUNCEMENT STRIP (IF ACTIVE) ---------------- */}
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

      {/* ---------------- 2. INTERACTIVE 3D VIRTUAL HOTEL SPACES EXPLORER ---------------- */}
      <Spaces3DExplorer />

      {/* ---------------- 3. AUTHENTIC APPLICATION MODULES SHOWCASE ---------------- */}
      <ProductShowcase3D />

      {/* ---------------- 4. 3D BENTO GRID CAPABILITIES & ARCHITECTURE ---------------- */}
      <BentoFeatures3D />

      {/* ---------------- 5. INTERACTIVE 4-STEP OPERATIONAL WORKFLOW ---------------- */}
      <HowItWorks3D />

      {/* ---------------- 6. AUTHENTIC ACCOMMODATIONS SHOWCASE ---------------- */}
      <Accommodations3D 
        rooms={featuredRooms} 
        title={cmsData?.roomsSectionTitle} 
        subtitle={cmsData?.roomsSectionSubtitle} 
      />

      {/* ---------------- 7. CULINARY DINING & CONVENTION VENUES ---------------- */}
      <DiningAndEvents3D dishes={featuredDishes} halls={featuredHalls} />

      {/* ---------------- 8. WHY CHOOSE DIGIMENU CLOUD HMS ---------------- */}
      <WhyChooseUs3D />

      {/* ---------------- 9. TRANSPARENT ENTERPRISE PRICING & PACKAGES ---------------- */}
      <PricingPackages3D />

      {/* ---------------- 10. VERIFIED GUEST SOCIAL PROOF & TESTIMONIALS ---------------- */}
      <section className="py-24 bg-neutral-900 text-white relative overflow-hidden" id="testimonials">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
            <div>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-bold uppercase tracking-wider text-sky-400 mb-4">
                <Star className="w-3.5 h-3.5 fill-sky-400" />
                <span>Verified Guest Experience</span>
              </div>
              <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
                Loved by Guests & Hoteliers
              </h2>
              <p className="text-neutral-400 text-base max-w-xl mt-3 leading-relaxed">
                Discover authentic feedback from verified guests and hotel staff who experience our property operations daily.
              </p>
            </div>

            <button
              onClick={handleOpenTestimonial}
              className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-semibold text-sm transition-all hover:scale-[1.02] cursor-pointer self-start md:self-auto shadow-md"
            >
              <MessageSquareHeart className="w-4 h-4 text-pink-400" />
              <span>Share Your Review</span>
            </button>
          </div>

          {/* Testimonial Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(approvedTestimonials.length > 0 ? approvedTestimonials : [
              {
                id: '1',
                name: 'Dawit Mengistu',
                role: 'Executive Business Traveler',
                content: 'The direct booking process took under a minute with zero hassle. Checking into the Deluxe Suite with digital keycard was seamless. The best luxury experience in Woliso.',
                rating: 5
              },
              {
                id: '2',
                name: 'Helen Gebre',
                role: 'Family Vacationer',
                content: 'The restaurant food dispatch is incredibly fast. We ordered traditional wat and pasta for the kids, and both arrived piping hot within 15 minutes. Exceptional staff service.',
                rating: 5
              },
              {
                id: '3',
                name: 'Dr. Michael T.',
                role: 'Conference Organizer (UN)',
                content: 'Hosted a 120-attendee workshop in the Grand Banquet Hall. High-speed WiFi, flawless audiovisuals, and the staff coordination was truly five-star standard.',
                rating: 5
              }
            ]).map((item, idx) => (
              <div 
                key={item.id || idx}
                className="rounded-3xl bg-neutral-950/70 border border-white/10 p-6 sm:p-7 flex flex-col justify-between hover:border-white/20 transition-all duration-300 hover:-translate-y-1 shadow-xl"
              >
                <div>
                  <div className="flex items-center gap-1 mb-4">
                    {[...Array(item.rating || 5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-neutral-300 text-sm leading-relaxed mb-6 italic">
                    "{item.content}"
                  </p>
                </div>
                <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-white">{item.name}</h4>
                    <p className="text-xs text-neutral-400">{item.role}</p>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-emerald-400" title="Verified Guest" />
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ---------------- 11. EXECUTIVE CONSULTATION & INQUIRY ---------------- */}
      <InquiryContact3D contactData={contactData} />

      {/* ---------------- TESTIMONIAL SUBMISSION MODAL ---------------- */}
      <AnimatePresence>
        {showTestimonialModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg bg-neutral-900 border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl text-white"
            >
              <button
                onClick={() => setShowTestimonialModal(false)}
                className="absolute top-5 right-5 text-neutral-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              {testimonialSuccess ? (
                <div className="text-center py-8 space-y-4">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-bold">Review Submitted!</h3>
                  <p className="text-sm text-neutral-400">
                    Thank you for sharing your experience. Your review will be published upon moderation.
                  </p>
                  <button
                    onClick={() => setShowTestimonialModal(false)}
                    className="mt-4 px-6 py-2.5 rounded-xl bg-white text-neutral-950 font-bold text-sm cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-pink-400 text-xs font-bold uppercase tracking-wider">
                    <MessageSquareHeart className="w-4 h-4" />
                    <span>Verified Guest Feedback</span>
                  </div>
                  <h3 className="text-xl font-bold">Share Your Experience</h3>
                  <p className="text-xs text-neutral-400">
                    Your feedback helps us continuously elevate our hospitality standards.
                  </p>

                  <div className="space-y-3 pt-2">
                    <div>
                      <label className="text-xs text-neutral-300 font-medium block mb-1">Your Name</label>
                      <input
                        type="text"
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-white/15 text-sm text-white focus:outline-none focus:border-sky-500"
                        placeholder="e.g. Abebe Kebede"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-neutral-300 font-medium block mb-1">Your Role / Trip Purpose</label>
                      <input
                        type="text"
                        value={guestRole}
                        onChange={(e) => setGuestRole(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-white/15 text-sm text-white focus:outline-none focus:border-sky-500"
                        placeholder="e.g. Weekend Leisure / Conference Delegate"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-neutral-300 font-medium block mb-1">Rating</label>
                      <div className="flex items-center gap-2">
                        {[1, 2, 3, 4, 5].map((val) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setTestimonialRating(val)}
                            className="cursor-pointer p-1"
                          >
                            <Star 
                              className={`w-6 h-6 ${
                                val <= testimonialRating ? 'fill-amber-400 text-amber-400' : 'text-neutral-600'
                              }`} 
                            />
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-xs text-neutral-300 font-medium block mb-1">Your Review</label>
                      <textarea
                        rows={4}
                        value={testimonialContent}
                        onChange={(e) => setTestimonialContent(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-white/15 text-sm text-white focus:outline-none focus:border-sky-500 resize-none"
                        placeholder="Tell us about the room, dining, amenities, or staff service..."
                      />
                    </div>

                    <button
                      onClick={submitTestimonial}
                      disabled={submittingTestimonial || !testimonialContent.trim()}
                      className="w-full py-3.5 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-neutral-950 font-bold text-sm transition-all cursor-pointer shadow-lg mt-2"
                    >
                      {submittingTestimonial ? 'Submitting Review...' : 'Publish Guest Review'}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Auth Prompt Modal if guest not signed in */}
      <AnimatePresence>
        {showAuthPromptModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-neutral-900 border border-white/15 rounded-3xl p-6 sm:p-7 shadow-2xl text-white text-center"
            >
              <button
                onClick={() => setShowAuthPromptModal(false)}
                className="absolute top-5 right-5 text-neutral-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="w-14 h-14 rounded-2xl bg-sky-500/20 text-sky-400 mx-auto flex items-center justify-center mb-4">
                <ShieldCheck className="w-7 h-7" />
              </div>

              <h3 className="text-xl font-bold mb-2">Verified Guest Sign-In Required</h3>
              <p className="text-xs text-neutral-400 mb-6 leading-relaxed">
                To guarantee genuine reviews and protect against automated spam, please sign in with your guest account before submitting a testimonial.
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  to="/login"
                  className="flex-1 py-3 rounded-xl bg-white text-neutral-950 font-bold text-xs hover:bg-neutral-200 transition cursor-pointer"
                >
                  Sign In
                </Link>
                <button
                  onClick={() => setShowAuthPromptModal(false)}
                  className="flex-1 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs border border-white/15 transition cursor-pointer"
                >
                  Maybe Later
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
