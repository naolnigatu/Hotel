import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { MapPin, Wifi, Coffee, Car, Star, Phone, Mail, ArrowRight, Megaphone, Pin, Calendar, Sparkles, X, MessageSquareHeart } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, doc, getDoc, getDocs, query, limit, where, orderBy, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { CmsHome, RoomCategory, MenuItem, Hall, CmsContact, CmsAmenity, Announcement, Testimonial } from '../types';
import * as Icons from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Home() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { currentUser, userData } = useAuth();
  
  const [cmsData, setCmsData] = useState<CmsHome | null>(null);
  const [contactData, setContactData] = useState<CmsContact | null>(null);
  const [featuredRooms, setFeaturedRooms] = useState<RoomCategory[]>([]);
  const [featuredDishes, setFeaturedDishes] = useState<MenuItem[]>([]);
  const [featuredHalls, setFeaturedHalls] = useState<Hall[]>([]);
  const [amenities, setAmenities] = useState<CmsAmenity[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [pinnedAnnouncement, setPinnedAnnouncement] = useState<Announcement | null>(null);

  const [heroImageError, setHeroImageError] = useState(false);
  
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
          setCmsData(docSnap.data().data as CmsHome);
        }

        const contactRef = doc(db, 'settings', 'cms_contact');
        const contactSnap = await getDoc(contactRef);
        if (contactSnap.exists()) {
          setContactData(contactSnap.data().data);
        }

        const amenitiesRef = doc(db, 'settings', 'cms_amenities');
        const amenitiesSnap = await getDoc(amenitiesRef);
        if (amenitiesSnap.exists()) {
          setAmenities((amenitiesSnap.data().data || []).slice(0, 4));
        }

        // Fetch a few rooms
        const roomsQ = query(collection(db, 'room_categories'), limit(3));
        const roomsSnap = await getDocs(roomsQ);
        setFeaturedRooms(roomsSnap.docs.map(d => ({ id: d.id, ...d.data() } as RoomCategory)));

        // Fetch a few dishes
        const dishesQ = query(collection(db, 'menu_items'), where('isAvailable', '==', true), limit(3));
        const dishesSnap = await getDocs(dishesQ);
        setFeaturedDishes(dishesSnap.docs.map(d => ({ id: d.id, ...d.data() } as MenuItem)));

        // Fetch a few halls
        const hallsQ = query(collection(db, 'halls'), where('status', '==', true), limit(2));
        const hallsSnap = await getDocs(hallsQ);
        setFeaturedHalls(hallsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Hall)));

        // Fetch announcements
        try {
          const annQ = query(
            collection(db, 'announcements'), 
            where('isPublished', '==', true),
            limit(6)
          );
          const annSnap = await getDocs(annQ);
          const annList = annSnap.docs
            .map(d => ({ id: d.id, ...d.data() } as Announcement))
            .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
          
          setAnnouncements(annList.slice(0, 3));
          const pinned = annList.find(a => a.isPinned);
          if (pinned) setPinnedAnnouncement(pinned);
        } catch (annErr) {
          console.warn("Announcements fetch fallback:", annErr);
        }

        // Fetch approved user testimonials
        try {
          const testQ = query(
            collection(db, 'testimonials'),
            where('status', '==', 'approved'),
            limit(6)
          );
          const testSnap = await getDocs(testQ);
          const approvedList = testSnap.docs.map(d => ({ id: d.id, ...d.data() } as Testimonial));
          setApprovedTestimonials(approvedList);
        } catch (testErr) {
          console.warn("Approved testimonials fetch:", testErr);
        }

      } catch (error) {
        console.error("Error fetching homepage data:", error);
      }
    };
    fetchData();
  }, []);

  const fallbackHeroImage = "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&q=80&w=2850";
  let initialHeroImage = cmsData?.heroImageUrl || fallbackHeroImage;
  if (initialHeroImage.includes("1542314831-c6a4d1409e1f") || initialHeroImage.includes("1566073771259-6a8506099945")) {
    initialHeroImage = fallbackHeroImage;
  }
  const heroImage = heroImageError ? fallbackHeroImage : initialHeroImage;

  return (
    <div className="flex flex-col bg-neutral-50">
      
      {/* Hero Section */}
      <section className="relative h-[80vh] md:h-[90vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-neutral-900/50 z-10" />
        
        {cmsData?.heroVideoUrl ? (
          <iframe 
            src={`${cmsData.heroVideoUrl}?autoplay=1&mute=1&loop=1&controls=0&showinfo=0`}
            className="absolute inset-0 w-full h-full object-cover scale-[1.2]"
            style={{ pointerEvents: 'none' }}
            allow="autoplay; fullscreen"
          />
        ) : (
          <img 
            src={heroImage} 
            alt="Hotel Exterior" 
            className="absolute inset-0 w-full h-full object-cover"
            onError={() => {
              console.error(`Failed to load hero image: ${heroImage}. Falling back to default.`);
              setHeroImageError(true);
            }}
          />
        )}
        
        <div className="relative z-20 text-center px-4 max-w-4xl mx-auto mt-16">
          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 tracking-tight drop-shadow-lg"
          >
            {cmsData?.heroTitle || t('welcome')}
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-lg md:text-2xl text-neutral-100 mb-10 max-w-2xl mx-auto drop-shadow-md font-medium"
          >
            {cmsData?.heroSubtitle || t('welcome_sub')}
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link 
              to={cmsData?.heroPrimaryButtonLink || "/rooms"} 
              className="inline-flex items-center justify-center px-8 py-4 bg-white text-neutral-900 text-lg font-bold rounded-xl hover:bg-neutral-100 transition-colors shadow-xl"
            >
              {cmsData?.heroPrimaryButtonText || t('book_now')}
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Pinned Announcement Notice Strip (if any active) */}
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

      {/* Featured Amenities Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-4">{cmsData?.featuredSectionTitle || 'Premium Amenities'}</h2>
            <p className="text-lg text-neutral-600 max-w-2xl mx-auto">{cmsData?.featuredSectionSubtitle || 'Everything you need for a comfortable stay in Woliso.'}</p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {(amenities.length > 0 ? amenities.map(a => ({
              icon: (Icons as any)[a.icon] || Icons.HelpCircle,
              title: a.title,
              desc: a.description
            })) : [
              { icon: Icons.Wifi, title: 'High-Speed WiFi', desc: 'Free throughout the property' },
              { icon: Icons.Coffee, title: 'Restaurant & Cafe', desc: 'Local and international cuisine' },
              { icon: Icons.MapPin, title: 'Central Location', desc: 'Heart of Woliso city' },
              { icon: Icons.Car, title: 'Secure Parking', desc: '24/7 guarded parking lot' }
            ]).map((amenity, idx) => {
              return (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                className="flex flex-col items-center p-8 bg-neutral-50 rounded-3xl text-center hover:bg-neutral-100 transition-colors"
              >
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-6">
                  {React.createElement(amenity.icon, { className: "w-8 h-8 text-neutral-900" } as any)}
                </div>
                <h3 className="text-lg font-bold text-neutral-900 mb-2">{amenity.title}</h3>
                <p className="text-sm text-neutral-500">{amenity.desc}</p>
              </motion.div>
            )})}
          </div>
        </div>
      </section>

      {/* Featured Rooms */}
      {featuredRooms.length > 0 && (
        <section className="py-24 bg-neutral-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-end mb-12">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-4">{cmsData?.roomsSectionTitle || 'Our Accommodations'}</h2>
                <p className="text-lg text-neutral-600 max-w-2xl">{cmsData?.roomsSectionSubtitle || 'Experience comfort and luxury in our thoughtfully designed rooms.'}</p>
              </div>
              <Link to="/rooms" className="hidden md:flex items-center gap-2 font-semibold text-neutral-900 hover:text-neutral-600 transition-colors">
                View All Rooms <ArrowRight className="w-5 h-5" />
              </Link>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {featuredRooms.map((room, idx) => (
                <motion.div 
                  key={room.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: idx * 0.1 }}
                  className="bg-white rounded-3xl overflow-hidden shadow-sm group border border-neutral-100"
                >
                  <div className="aspect-[4/3] overflow-hidden bg-neutral-100 relative">
                    {room.imageUrls?.[0] ? (
                      <img 
                        src={room.imageUrls[0]} 
                        alt={room.name} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&q=80&w=1000';
                        }}
                      />
                    ) : (
                      <img 
                        src="https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&q=80&w=1000" 
                        alt={room.name} 
                        className="w-full h-full object-cover" 
                      />
                    )}
                  </div>
                  <div className="p-8">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-2xl font-bold text-neutral-900">{room.name}</h3>
                      <div className="text-right">
                        <span className="block text-xl font-bold text-neutral-900">{room.basePrice} ETB</span>
                        <span className="text-sm text-neutral-500">/ night</span>
                      </div>
                    </div>
                    <p className="text-neutral-600 line-clamp-2 mb-6">{room.description}</p>
                    <Link to="/rooms" className="block w-full py-3 text-center border border-neutral-200 rounded-xl font-medium hover:bg-neutral-50 transition-colors">
                      Discover More
                    </Link>
                  </div>
                </motion.div>
              ))}
            </div>
            <div className="mt-8 text-center md:hidden">
              <Link to="/rooms" className="inline-flex items-center gap-2 font-semibold text-neutral-900 hover:text-neutral-600 transition-colors">
                View All Rooms <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Featured Halls */}
      {featuredHalls.length > 0 && (
        <section className="py-24 bg-neutral-900 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row justify-between items-end mb-12">
              <div className="max-w-2xl">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">{cmsData?.hallsSectionTitle || 'Event Spaces'}</h2>
                <p className="text-lg text-neutral-400">{cmsData?.hallsSectionSubtitle || 'Host your next corporate meeting, wedding, or special event in our premium venues equipped with modern facilities.'}</p>
              </div>
              <Link to="/halls" className="hidden md:flex items-center gap-2 font-semibold text-white hover:text-neutral-300 transition-colors mt-6 md:mt-0">
                View All Spaces <ArrowRight className="w-5 h-5" />
              </Link>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {featuredHalls.map((hall, idx) => (
                <motion.div 
                  key={hall.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: idx * 0.1 }}
                  className="bg-neutral-800 rounded-3xl overflow-hidden group"
                >
                  <div className="aspect-[16/9] overflow-hidden bg-neutral-700 relative">
                    {hall.imageUrls?.[0] && (
                      <img src={hall.imageUrls[0]} alt={hall.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                    )}
                    <div className="absolute top-4 right-4 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full text-sm font-bold border border-white/20">
                      Up to {hall.capacity} Guests
                    </div>
                  </div>
                  <div className="p-8">
                    <h3 className="text-2xl font-bold mb-3">{hall.name}</h3>
                    <p className="text-neutral-400 line-clamp-2 mb-6">{hall.description}</p>
                    <Link to="/halls" className="inline-flex font-semibold text-white hover:text-neutral-300 transition-colors">
                      Discover Details &rarr;
                    </Link>
                  </div>
                </motion.div>
              ))}
            </div>
            <div className="mt-8 text-center md:hidden">
              <Link to="/halls" className="inline-flex items-center gap-2 font-semibold text-white hover:text-neutral-300 transition-colors">
                View All Spaces <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Featured Restaurant */}
      {featuredDishes.length > 0 && (
        <section className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row gap-16 items-center">
              <div className="w-full md:w-1/3">
                <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-6">{cmsData?.restaurantSectionTitle || 'Culinary Excellence'}</h2>
                <p className="text-lg text-neutral-600 mb-8 leading-relaxed">
                  {cmsData?.restaurantSectionSubtitle || 'Indulge in a rich variety of local and international dishes prepared by our expert chefs. From traditional Ethiopian cuisine to continental favorites.'}
                </p>
                <Link to="/restaurant" className="inline-flex items-center gap-2 px-6 py-3 bg-neutral-900 text-white rounded-xl font-medium hover:bg-neutral-800 transition-colors">
                  Explore Menu
                </Link>
              </div>
              <div className="w-full md:w-2/3 grid grid-cols-2 lg:grid-cols-3 gap-6">
                {featuredDishes.map((dish, idx) => (
                  <motion.div 
                    key={dish.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: idx * 0.1 }}
                    className="bg-neutral-50 rounded-2xl overflow-hidden border border-neutral-100 group"
                  >
                    <div className="aspect-square bg-neutral-200 relative overflow-hidden">
                      {dish.imageUrl ? (
                        <img 
                          src={dish.imageUrl} 
                          alt={dish.name} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=800';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Coffee className="w-8 h-8 text-neutral-400" />
                        </div>
                      )}
                    </div>
                    <div className="p-4 text-center">
                      <h4 className="font-bold text-neutral-900 truncate">{dish.name}</h4>
                      <p className="text-sm font-semibold text-neutral-600 mt-1">{dish.price} ETB</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Hotel Announcements & News Section */}
      {announcements.length > 0 && (
        <section className="py-24 bg-neutral-900 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(245,158,11,0.1),transparent_50%)]" />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="flex flex-col md:flex-row justify-between items-end mb-12">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-xs font-bold uppercase tracking-wider text-amber-400 mb-3">
                  <Megaphone className="w-3.5 h-3.5" />
                  <span>Updates & Events</span>
                </div>
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Hotel Announcements & News</h2>
                <p className="text-neutral-400 text-lg mt-2 max-w-2xl">
                  Stay updated on seasonal culinary feasts, weekend cultural music, and spa wellness programs.
                </p>
              </div>
              <Link 
                to="/announcements" 
                className="inline-flex items-center gap-2 font-bold text-amber-400 hover:text-amber-300 transition-colors mt-4 md:mt-0"
              >
                All Announcements <ArrowRight className="w-5 h-5" />
              </Link>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {announcements.slice(0, 3).map((item, idx) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: idx * 0.1 }}
                  className="bg-neutral-800/90 rounded-3xl overflow-hidden border border-neutral-700/60 shadow-lg hover:border-neutral-600 transition-all flex flex-col group"
                >
                  <div className="relative aspect-[16/10] bg-neutral-900 overflow-hidden">
                    <img
                      src={item.imageUrl || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=800'}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=800';
                      }}
                    />
                    <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 items-center">
                      <span className="px-2.5 py-0.5 bg-black/80 backdrop-blur-xs text-white text-[11px] font-bold rounded-md">
                        {item.category}
                      </span>
                      {item.badge && (
                        <span className="px-2.5 py-0.5 bg-amber-400 text-neutral-950 text-[11px] font-black rounded-md">
                          {item.badge}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <div className="text-xs text-neutral-400 font-medium">
                        {new Date(item.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                      <h3 className="text-lg font-bold text-white group-hover:text-amber-400 transition line-clamp-2 leading-snug">
                        {item.title}
                      </h3>
                      <p className="text-neutral-400 text-sm line-clamp-3 leading-relaxed">
                        {item.paragraph}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-neutral-700/60 flex items-center justify-between">
                      <span className="text-xs text-neutral-500 font-medium">By {item.publishedBy}</span>
                      <Link
                        to={`/announcements?id=${item.id}`}
                        className="inline-flex items-center gap-1 text-xs font-bold text-amber-400 hover:text-amber-300 transition cursor-pointer"
                      >
                        Read Details &rarr;
                      </Link>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Statistics Section */}
      {cmsData?.statistics && cmsData.statistics.length > 0 && (
        <section className="py-20 bg-neutral-900 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {cmsData.statistics.map((stat, idx) => (
                <div key={stat.id} className="text-center">
                  <div className="text-4xl md:text-5xl font-bold mb-2">{stat.value}</div>
                  <div className="text-neutral-400 font-medium">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Testimonials */}
      {(() => {
        const displayTestimonials = [
          ...approvedTestimonials,
          ...(cmsData?.testimonials || [])
        ].slice(0, 6);

        return (
          <section className="py-24 bg-neutral-50 relative">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-12">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-bold uppercase tracking-wider mb-3">
                  <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" /> Guest Experiences
                </div>
                <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-4">
                  {cmsData?.testimonialsTitle || 'What Our Guests Say'}
                </h2>
                <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
                  {cmsData?.testimonialsSubtitle || 'Read authentic reviews from guests who have stayed, dined, and hosted events at Woliso Hotel.'}
                </p>
                
                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                  <button 
                    onClick={handleOpenTestimonial}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-neutral-900 text-white rounded-full font-bold text-sm hover:bg-neutral-800 transition-all shadow-md hover:shadow-lg cursor-pointer transform hover:-translate-y-0.5"
                  >
                    <MessageSquareHeart className="w-4 h-4 text-rose-400" />
                    Share Your Experience / Testimonial
                  </button>
                </div>
              </div>
              
              <div className="grid md:grid-cols-3 gap-8">
                {displayTestimonials.map((test, idx) => (
                  <motion.div 
                    key={test.id || idx}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: idx * 0.1 }}
                    className="bg-white p-8 rounded-3xl shadow-sm border border-neutral-100 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex gap-1 mb-6 text-yellow-400">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className={`w-5 h-5 ${i < test.rating ? 'fill-current' : 'text-neutral-200'}`} />
                        ))}
                      </div>
                      <p className="text-neutral-700 leading-relaxed italic mb-8">"{test.content}"</p>
                    </div>
                    <div className="pt-4 border-t border-neutral-100 flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-neutral-900">{test.name}</h4>
                        <p className="text-xs text-neutral-500 font-medium">{test.role}</p>
                      </div>
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-50 text-emerald-700">
                        Verified Guest
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>
        );
      })()}

      {/* Location / Map Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="order-2 lg:order-1 rounded-3xl overflow-hidden shadow-sm border border-neutral-100 h-[400px] md:h-[500px]">
              {cmsData?.mapEmbedUrl ? (
                <iframe 
                  src={cmsData.mapEmbedUrl} 
                  width="100%" 
                  height="100%" 
                  style={{ border: 0 }} 
                  allowFullScreen 
                  loading="lazy" 
                  referrerPolicy="no-referrer-when-downgrade"
                />
              ) : (
                <div className="w-full h-full bg-neutral-100 flex items-center justify-center text-neutral-400">Map location not set</div>
              )}
            </div>
            <div className="order-1 lg:order-2 space-y-8">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-4">Find Us</h2>
                <p className="text-lg text-neutral-600 leading-relaxed">
                  Located in the heart of Woliso, our hotel offers convenient access to local attractions and business centers.
                </p>
              </div>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center shrink-0">
                    <MapPin className="w-6 h-6 text-neutral-900" />
                  </div>
                  <div>
                    <h3 className="font-bold text-neutral-900 mb-1">Address</h3>
                    <p className="text-neutral-600 whitespace-pre-wrap">{contactData?.address || 'Woliso City Center, Main Road\nWoliso, Oromia, Ethiopia'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center shrink-0">
                    <Phone className="w-6 h-6 text-neutral-900" />
                  </div>
                  <div>
                    <h3 className="font-bold text-neutral-900 mb-1">Contact</h3>
                    <p className="text-neutral-600">
                      {contactData?.phonePrimary || '+251 91 123 4567'}
                      <br/>
                      {contactData?.emailPrimary || 'info@wolisohotel.com'}
                    </p>
                  </div>
                </div>
              </div>
              <Link to="/contact" className="inline-block mt-4 text-neutral-900 font-bold hover:text-neutral-600 transition-colors">
                View full contact details &rarr;
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Auth Prompt Modal (When Unsigned Guest Tries to Leave Testimonial) */}
      <AnimatePresence>
        {showAuthPromptModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative text-center"
            >
              <button
                onClick={() => setShowAuthPromptModal(false)}
                className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="w-16 h-16 bg-neutral-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-neutral-900">
                <MessageSquareHeart className="w-8 h-8 text-neutral-900" />
              </div>

              <h3 className="text-2xl font-bold text-neutral-900 mb-2">Sign In to Leave a Testimonial</h3>
              <p className="text-sm text-neutral-600 mb-6">
                To ensure all reviews remain authentic and verified, please sign in or register your account before submitting a testimonial.
              </p>

              <div className="space-y-3">
                <button
                  onClick={() => {
                    setShowAuthPromptModal(false);
                    navigate('/login?redirect=/');
                  }}
                  className="w-full py-3.5 bg-neutral-900 text-white rounded-xl font-bold hover:bg-neutral-800 transition-colors shadow-md cursor-pointer flex items-center justify-center gap-2"
                >
                  Sign In / Create Account
                </button>
                <button
                  onClick={() => setShowAuthPromptModal(false)}
                  className="w-full py-3 bg-neutral-100 text-neutral-700 rounded-xl font-bold hover:bg-neutral-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Testimonial Submission Modal (For Logged In Users) */}
      <AnimatePresence>
        {showTestimonialModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative"
            >
              <button
                onClick={() => setShowTestimonialModal(false)}
                className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              {testimonialSuccess ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-bold text-neutral-900 mb-2">Thank You!</h3>
                  <p className="text-neutral-600">Your testimonial has been submitted successfully and is pending review by hotel management.</p>
                  <button
                    onClick={() => setShowTestimonialModal(false)}
                    className="mt-6 px-6 py-2.5 bg-neutral-900 text-white rounded-full font-bold hover:bg-neutral-800 transition cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <>
                  <h3 className="text-2xl font-bold text-neutral-900 mb-1 text-center">Share Your Experience</h3>
                  <p className="text-xs text-neutral-500 mb-6 text-center">We value your authentic feedback and love hearing about your stay.</p>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-neutral-700 mb-1">Your Name</label>
                      <input
                        type="text"
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        placeholder="e.g. Dawit Tadesse"
                        className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 outline-none text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-neutral-700 mb-1">Visit / Experience Type</label>
                      <select
                        value={guestRole}
                        onChange={(e) => setGuestRole(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 outline-none text-sm"
                      >
                        <option value="Hotel Guest">Hotel Guest (Room Stay)</option>
                        <option value="Restaurant & Bar Diner">Restaurant & Bar Diner</option>
                        <option value="Conference & Meeting Host">Conference & Meeting Host</option>
                        <option value="Wedding / Event Host">Wedding / Event Host</option>
                        <option value="Tourist & Weekend Visitor">Tourist & Weekend Visitor</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-neutral-700 mb-1">Rating</label>
                      <div className="flex gap-2 justify-center py-2 bg-neutral-50 rounded-xl border border-neutral-100">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setTestimonialRating(star)}
                            className="focus:outline-none transition-transform hover:scale-110 cursor-pointer"
                          >
                            <Star className={`w-7 h-7 ${star <= testimonialRating ? 'fill-yellow-400 text-yellow-400' : 'text-neutral-300'}`} />
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-xs font-bold text-neutral-700 mb-1">Your Testimonial / Review</label>
                      <textarea
                        rows={4}
                        placeholder="Tell us what you loved about your experience at Woliso Hotel..."
                        value={testimonialContent}
                        onChange={(e) => setTestimonialContent(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 outline-none resize-none text-sm"
                      />
                    </div>
                    
                    <button
                      type="button"
                      onClick={submitTestimonial}
                      disabled={submittingTestimonial || !testimonialContent.trim()}
                      className="w-full py-3 bg-neutral-900 text-white rounded-xl font-bold hover:bg-neutral-800 transition-colors disabled:opacity-50 mt-2 cursor-pointer"
                    >
                      {submittingTestimonial ? 'Submitting...' : 'Submit Testimonial'}
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
