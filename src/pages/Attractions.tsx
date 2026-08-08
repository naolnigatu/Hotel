import React, { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { CmsAttraction } from '../types';
import { Loader2, MapPin } from 'lucide-react';
import { motion } from 'motion/react';

export default function Attractions() {
  const [attractions, setAttractions] = useState<CmsAttraction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAttractions = async () => {
      try {
        const docRef = doc(db, 'settings', 'cms_attractions');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setAttractions(docSnap.data().data || []);
        }
      } catch (error) {
        console.error("Error fetching attractions:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchAttractions();
  }, []);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-neutral-900" /></div>;
  }

  return (
    <div className="bg-neutral-50 min-h-screen py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-neutral-900 mb-4">Nearby Attractions</h1>
          <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
            Explore the beauty of Woliso. Discover local sights, historical landmarks, and natural wonders just a short distance from the hotel.
          </p>
        </div>

        {attractions.length === 0 ? (
          <div className="text-center py-20 text-neutral-500">
            No attractions listed at the moment.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {attractions.map((attraction, index) => (
              <motion.div
                key={attraction.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-white rounded-2xl overflow-hidden shadow-sm border border-neutral-100 flex flex-col group hover:shadow-md transition-shadow"
              >
                <div className="aspect-[4/3] relative overflow-hidden bg-neutral-100">
                  {attraction.imageUrl ? (
                    <img 
                      src={attraction.imageUrl} 
                      alt={attraction.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-neutral-400">
                      <MapPin className="w-8 h-8" />
                    </div>
                  )}
                  <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-bold text-neutral-900">
                    {attraction.distance}
                  </div>
                </div>
                
                <div className="p-6 flex-1 flex flex-col">
                  <h3 className="text-xl font-bold text-neutral-900 mb-3">{attraction.title}</h3>
                  <p className="text-neutral-600 leading-relaxed flex-1 mb-6">
                    {attraction.description}
                  </p>
                  
                  {attraction.googleMapsUrl && (
                    <a 
                      href={attraction.googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      <MapPin className="w-4 h-4" />
                      View on Google Maps
                    </a>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
