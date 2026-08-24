import React, { useState, useEffect } from 'react';
import { collection, query, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { Hall } from '../types';
import { Loader2, Users, CheckCircle2, Calendar, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import HallBookingModal from '../components/HallBookingModal';

export default function Halls() {
  const [halls, setHalls] = useState<Hall[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [selectedHallForBooking, setSelectedHallForBooking] = useState<Hall | null>(null);

  useEffect(() => {
    const fetchHalls = async () => {
      try {
        const q = query(collection(db, 'halls'));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Hall));
        setHalls(data.filter(h => h.status));
      } catch (error) {
        console.error("Error fetching halls:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchHalls();
  }, []);

  const handleOpenBooking = (hall: Hall) => {
    setSelectedHallForBooking(hall);
    setBookingModalOpen(true);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-neutral-900" /></div>;
  }

  return (
    <div className="bg-neutral-50 min-h-screen py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-neutral-900 text-white text-xs font-bold uppercase tracking-wider mb-4 shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Premium Event Spaces
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-neutral-900 mb-4 tracking-tight">Halls & Events</h1>
          <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
            Host corporate meetings, grand weddings, workshops, and private celebrations in our fully-equipped modern venues.
          </p>
        </div>

        {halls.length === 0 ? (
          <div className="text-center py-20 text-neutral-500 bg-white rounded-3xl border border-neutral-200 p-8 max-w-xl mx-auto">
            <Calendar className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-neutral-800 mb-1">No Venues Currently Listed</h3>
            <p className="text-sm text-neutral-500">Please check back soon or contact hotel reception directly for private event inquiries.</p>
          </div>
        ) : (
          <div className="space-y-16">
            {halls.map((hall, index) => (
              <motion.div 
                key={hall.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className={`flex flex-col ${index % 2 === 1 ? 'lg:flex-row-reverse' : 'lg:flex-row'} gap-8 lg:gap-12 items-center bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-neutral-200`}
              >
                <div className="w-full lg:w-1/2 rounded-2xl overflow-hidden aspect-[4/3] bg-neutral-100 relative shadow-inner">
                  {hall.imageUrls?.[0] ? (
                    <img 
                      src={hall.imageUrls[0]} 
                      alt={hall.name} 
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" 
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&q=80&w=1000';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-neutral-400">No Image Available</div>
                  )}
                  <div className="absolute top-4 left-4 bg-black/70 backdrop-blur-xs text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" /> Max {hall.capacity} Guests
                  </div>
                </div>
                
                <div className="w-full lg:w-1/2 space-y-6">
                  <div>
                    <h2 className="text-3xl font-bold text-neutral-900 mb-2">{hall.name}</h2>
                    <div className="flex items-center gap-4 text-neutral-600">
                      <span className="flex items-center gap-1 font-medium text-sm">
                        <Users className="w-4 h-4 text-neutral-500" />
                        Up to {hall.capacity} guests
                      </span>
                      <span className="text-sm">•</span>
                      <span className="font-extrabold text-neutral-900 text-lg">{hall.price?.toLocaleString()} ETB <span className="text-xs font-normal text-neutral-500">/ day</span></span>
                    </div>
                  </div>
                  
                  <p className="text-neutral-600 leading-relaxed text-base">
                    {hall.description}
                  </p>

                  {hall.equipment && hall.equipment.length > 0 && (
                    <div>
                      <h3 className="font-bold text-neutral-900 text-sm mb-3 uppercase tracking-wider text-xs text-neutral-400">Included Equipment & Amenities:</h3>
                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {hall.equipment.map((eq, i) => (
                          <li key={i} className="flex items-center gap-2 text-xs font-medium text-neutral-700 bg-neutral-50 p-2 rounded-lg border border-neutral-100">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span className="truncate">{eq}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="pt-2">
                    <button 
                      onClick={() => handleOpenBooking(hall)}
                      className="inline-flex items-center justify-center px-8 py-4 bg-neutral-900 text-white rounded-xl font-bold hover:bg-neutral-800 active:scale-98 transition shadow-md w-full sm:w-auto cursor-pointer"
                    >
                      <Calendar className="w-4 h-4 mr-2" /> Request Hall Reservation
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Global Hall Booking Modal */}
        <HallBookingModal
          isOpen={bookingModalOpen}
          onClose={() => setBookingModalOpen(false)}
          selectedHall={selectedHallForBooking}
          allHalls={halls}
        />
      </div>
    </div>
  );
}
