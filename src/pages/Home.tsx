import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { MapPin, Wifi, Coffee, Car, Star, Phone, Mail, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { collection, doc, getDoc, getDocs, query, limit, where } from 'firebase/firestore';
import { db } from '../firebase';
import { CmsHome, RoomCategory, MenuItem, Hall } from '../types';

export default function Home() {
  const { t } = useTranslation();
  const [cmsData, setCmsData] = useState<CmsHome | null>(null);
  const [featuredRooms, setFeaturedRooms] = useState<RoomCategory[]>([]);
  const [featuredDishes, setFeaturedDishes] = useState<MenuItem[]>([]);
  const [featuredHalls, setFeaturedHalls] = useState<Hall[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch CMS data
        const docRef = doc(db, 'settings', 'cms_home');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setCmsData(docSnap.data().data as CmsHome);
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

      } catch (error) {
        console.error("Error fetching homepage data:", error);
      }
    };
    fetchData();
  }, []);

  const heroImage = cmsData?.heroImageUrl || "https://images.unsplash.com/photo-1542314831-c6a4d1409e1f?auto=format&fit=crop&q=80&w=2850";

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

      {/* Featured Amenities Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-4">{cmsData?.featuredSectionTitle || 'Premium Amenities'}</h2>
            <p className="text-lg text-neutral-600 max-w-2xl mx-auto">{cmsData?.featuredSectionSubtitle || 'Everything you need for a comfortable stay in Woliso.'}</p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { icon: Wifi, title: 'High-Speed WiFi', desc: 'Free throughout the property' },
              { icon: Coffee, title: 'Restaurant & Cafe', desc: 'Local and international cuisine' },
              { icon: MapPin, title: 'Central Location', desc: 'Heart of Woliso city' },
              { icon: Car, title: 'Secure Parking', desc: '24/7 guarded parking lot' }
            ].map((amenity, idx) => {
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
                  {React.createElement(amenity.icon, { className: "w-8 h-8 text-neutral-900" })}
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
                <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-4">Our Accommodations</h2>
                <p className="text-lg text-neutral-600 max-w-2xl">Experience comfort and luxury in our thoughtfully designed rooms.</p>
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
                    {room.imageUrls?.[0] && (
                      <img src={room.imageUrls[0]} alt={room.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                    )}
                  </div>
                  <div className="p-8">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-2xl font-bold text-neutral-900">{room.name}</h3>
                      <div className="text-right">
                        <span className="block text-xl font-bold text-neutral-900">${room.basePrice}</span>
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
                <h2 className="text-3xl md:text-4xl font-bold mb-4">Event Spaces</h2>
                <p className="text-lg text-neutral-400">Host your next corporate meeting, wedding, or special event in our premium venues equipped with modern facilities.</p>
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
                <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-6">Culinary Excellence</h2>
                <p className="text-lg text-neutral-600 mb-8 leading-relaxed">
                  Indulge in a rich variety of local and international dishes prepared by our expert chefs. From traditional Ethiopian cuisine to continental favorites.
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
                        <img src={dish.imageUrl} alt={dish.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Coffee className="w-8 h-8 text-neutral-400" />
                        </div>
                      )}
                    </div>
                    <div className="p-4 text-center">
                      <h4 className="font-bold text-neutral-900 truncate">{dish.name}</h4>
                      <p className="text-sm font-semibold text-neutral-600 mt-1">${dish.price}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
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
      {cmsData?.testimonials && cmsData.testimonials.length > 0 && (
        <section className="py-24 bg-neutral-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-4">{cmsData.testimonialsTitle || 'Guest Experiences'}</h2>
              <p className="text-lg text-neutral-600 max-w-2xl mx-auto">{cmsData.testimonialsSubtitle || 'What our guests say about their stay.'}</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              {cmsData.testimonials.map((test, idx) => (
                <motion.div 
                  key={test.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: idx * 0.1 }}
                  className="bg-white p-8 rounded-3xl shadow-sm border border-neutral-100 flex flex-col"
                >
                  <div className="flex gap-1 mb-6 text-yellow-400">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className={`w-5 h-5 ${i < test.rating ? 'fill-current' : 'text-neutral-200'}`} />
                    ))}
                  </div>
                  <p className="text-neutral-700 leading-relaxed italic mb-8 flex-1">"{test.content}"</p>
                  <div>
                    <h4 className="font-bold text-neutral-900">{test.name}</h4>
                    <p className="text-sm text-neutral-500">{test.role}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

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
                    <p className="text-neutral-600">Woliso City Center, Main Road<br/>Woliso, Oromia, Ethiopia</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center shrink-0">
                    <Phone className="w-6 h-6 text-neutral-900" />
                  </div>
                  <div>
                    <h3 className="font-bold text-neutral-900 mb-1">Contact</h3>
                    <p className="text-neutral-600">+251 91 123 4567<br/>info@wolisohotel.com</p>
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

    </div>
  );
}
