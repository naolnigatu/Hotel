import React, { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { CmsAbout } from '../types';
import { motion } from 'motion/react';
import { Loader2 } from 'lucide-react';

export default function About() {
  const [cmsData, setCmsData] = useState<CmsAbout | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    const fetchCms = async () => {
      try {
        const docRef = doc(db, 'settings', 'cms_about');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setCmsData(docSnap.data().data as CmsAbout);
        }
      } catch (error: any) {
        if (error.code !== 'unavailable') {
          console.error("Error fetching CMS about data:", error);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchCms();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-neutral-900 animate-spin" />
      </div>
    );
  }

  const fallbackAboutImage = "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=1000";
  let initialAboutImage = cmsData?.imageUrl || fallbackAboutImage;
  if (initialAboutImage.includes("1551882547-ff40c0d5b5df")) {
    initialAboutImage = fallbackAboutImage;
  }
  const aboutImage = imageError ? fallbackAboutImage : initialAboutImage;

  return (
    <div className="bg-neutral-50 min-h-screen pb-20">
      <div className="w-full h-80 relative overflow-hidden">
        <img 
          src={aboutImage} 
          alt="About Us"
          className="w-full h-full object-cover"
          onError={() => setImageError(true)}
        />
        <div className="absolute inset-0 bg-neutral-900/40" />
        <div className="absolute inset-0 flex items-center justify-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white text-center">About Woliso Hotel</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-16 space-y-16">
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-white p-8 md:p-12 rounded-2xl shadow-sm border border-neutral-100"
        >
          <h2 className="text-3xl font-bold text-neutral-900 mb-6">Our Story</h2>
          <p className="text-lg text-neutral-600 leading-relaxed whitespace-pre-wrap">
            {cmsData?.story || 'Our story goes here...'}
          </p>
        </motion.section>

        <div className="grid md:grid-cols-2 gap-8">
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-white p-8 md:p-10 rounded-2xl shadow-sm border border-neutral-100"
          >
            <h2 className="text-2xl font-bold text-neutral-900 mb-4">Our Vision</h2>
            <p className="text-neutral-600 leading-relaxed whitespace-pre-wrap">
              {cmsData?.vision || 'Our vision goes here...'}
            </p>
          </motion.section>

          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-white p-8 md:p-10 rounded-2xl shadow-sm border border-neutral-100"
          >
            <h2 className="text-2xl font-bold text-neutral-900 mb-4">Our Mission</h2>
            <p className="text-neutral-600 leading-relaxed whitespace-pre-wrap">
              {cmsData?.mission || 'Our mission goes here...'}
            </p>
          </motion.section>
        </div>

        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-white p-8 md:p-12 rounded-2xl shadow-sm border border-neutral-100"
        >
          <h2 className="text-3xl font-bold text-neutral-900 mb-6">Our History</h2>
          <p className="text-lg text-neutral-600 leading-relaxed whitespace-pre-wrap">
            {cmsData?.history || 'Our history goes here...'}
          </p>
        </motion.section>
      </div>
    </div>
  );
}
