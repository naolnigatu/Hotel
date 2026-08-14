import React, { useState, useEffect } from 'react';
import { collection, query, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { Hall } from '../types';
import { Loader2, Users, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';

export default function Halls() {
  const [halls, setHalls] = useState<Hall[]>([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-neutral-900" /></div>;
  }

  return (
    <div className="bg-neutral-50 min-h-screen py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-neutral-900 mb-4">Halls & Events</h1>
          <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
            Host your next corporate meeting, wedding, or special event in our premium venues.
          </p>
        </div>

        {halls.length === 0 ? (
          <div className="text-center py-20 text-neutral-500">
            No halls are currently available. Check back soon.
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
                className={`flex flex-col ${index % 2 === 1 ? 'lg:flex-row-reverse' : 'lg:flex-row'} gap-8 lg:gap-12 items-center bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-neutral-100`}
              >
                <div className="w-full lg:w-1/2 rounded-2xl overflow-hidden aspect-[4/3] bg-neutral-100 relative">
                  {hall.imageUrls?.[0] ? (
                    <img 
                      src={hall.imageUrls[0]} 
                      alt={hall.name} 
                      className="w-full h-full object-cover" 
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&q=80&w=1000';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-neutral-400">No Image</div>
                  )}
                </div>
                
                <div className="w-full lg:w-1/2 space-y-6">
                  <div>
                    <h2 className="text-3xl font-bold text-neutral-900 mb-2">{hall.name}</h2>
                    <div className="flex items-center gap-4 text-neutral-600">
                      <span className="flex items-center gap-1">
                        <Users className="w-5 h-5" />
                        Up to {hall.capacity} guests
                      </span>
                      <span className="font-semibold text-neutral-900">{hall.price} ETB / day</span>
                    </div>
                  </div>
                  
                  <p className="text-neutral-600 leading-relaxed text-lg">
                    {hall.description}
                  </p>

                  <div>
                    <h3 className="font-bold text-neutral-900 mb-3">Included Equipment:</h3>
                    <ul className="grid grid-cols-2 gap-3">
                      {hall.equipment.map((eq, i) => (
                        <li key={i} className="flex items-center gap-2 text-neutral-600">
                          <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                          <span>{eq}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Link to="/contact" className="inline-flex items-center justify-center px-8 py-4 bg-neutral-900 text-white rounded-xl font-medium hover:bg-neutral-800 transition-colors w-full sm:w-auto mt-4">
                    Request Booking
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
