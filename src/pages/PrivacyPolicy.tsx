import React, { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Loader2 } from 'lucide-react';

export default function PrivacyPolicy() {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCms = async () => {
      try {
        const docRef = doc(db, 'settings', 'cms_policies');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setContent(docSnap.data().data?.privacy || '');
        }
      } catch (error) {
        console.error("Error fetching policy:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchCms();
  }, []);

  if (loading) {
    return <div className="flex justify-center py-40"><Loader2 className="w-8 h-8 animate-spin text-neutral-400" /></div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <h1 className="text-4xl font-bold text-neutral-900 mb-8">Privacy Policy</h1>
      <div className="prose prose-neutral max-w-none whitespace-pre-wrap text-neutral-700 leading-relaxed">
        {content || 'Privacy Policy coming soon.'}
      </div>
    </div>
  );
}
