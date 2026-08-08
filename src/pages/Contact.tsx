import React, { useEffect, useState } from 'react';
import { doc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { CmsContact } from '../types';
import { motion } from 'motion/react';
import { Phone, Mail, MapPin, Loader2, Send } from 'lucide-react';

export default function Contact() {
  const [cmsData, setCmsData] = useState<CmsContact | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  
  const [sending, setSending] = useState(false);
  const [messageSent, setMessageSent] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchCms = async () => {
      try {
        const docRef = doc(db, 'settings', 'cms_contact');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setCmsData(docSnap.data().data as CmsContact);
        }
      } catch (error: any) {
        if (error.code !== 'unavailable') {
          console.error("Error fetching CMS contact data:", error);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchCms();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError('');
    
    try {
      await addDoc(collection(db, 'contact_messages'), {
        firstName,
        lastName,
        email,
        message,
        createdAt: serverTimestamp(),
        status: 'unread'
      });
      
      setFirstName('');
      setLastName('');
      setEmail('');
      setMessage('');
      setMessageSent(true);
      setTimeout(() => setMessageSent(false), 5000);
    } catch (err: any) {
      console.error("Error sending message:", err);
      setError('Failed to send message. Please try again later.');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-neutral-900 animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-neutral-50 min-h-screen py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-neutral-900 mb-4">Contact Us</h1>
          <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
            Have questions or need assistance? Reach out to us, and we'll be happy to help.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Contact Info */}
          <div className="space-y-8">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white p-8 rounded-2xl shadow-sm border border-neutral-100"
            >
              <h2 className="text-2xl font-bold text-neutral-900 mb-8">Get in Touch</h2>
              
              <div className="space-y-6">
                <div className="flex items-start">
                  <div className="bg-neutral-100 p-3 rounded-lg mr-4">
                    <MapPin className="w-6 h-6 text-neutral-900" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-neutral-900 mb-1">Address</h3>
                    <p className="text-neutral-600 whitespace-pre-wrap">{cmsData?.address || 'Woliso, Ethiopia'}</p>
                    {cmsData?.googleMapsUrl && (
                      <a href={cmsData.googleMapsUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-medium underline mt-2 inline-block">View on Google Maps</a>
                    )}
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="bg-neutral-100 p-3 rounded-lg mr-4">
                    <Phone className="w-6 h-6 text-neutral-900" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-neutral-900 mb-1">Phone</h3>
                    <p className="text-neutral-600">{cmsData?.phonePrimary || '+251 11 123 4567'}</p>
                    {cmsData?.phoneSecondary && (
                      <p className="text-neutral-600">{cmsData.phoneSecondary}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="bg-neutral-100 p-3 rounded-lg mr-4">
                    <Mail className="w-6 h-6 text-neutral-900" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-neutral-900 mb-1">Email</h3>
                    <p className="text-neutral-600">{cmsData?.emailPrimary || 'info@wolisohotel.com'}</p>
                    {cmsData?.emailSecondary && (
                      <p className="text-neutral-600">{cmsData.emailSecondary}</p>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Contact Form */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white p-8 rounded-2xl shadow-sm border border-neutral-100"
          >
            <h2 className="text-2xl font-bold text-neutral-900 mb-8">Send us a Message</h2>
            
            {messageSent && (
              <div className="bg-green-50 text-green-700 p-4 rounded-lg mb-6 font-medium">
                Thank you! Your message has been sent successfully. We will get back to you shortly.
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-50 text-red-700 p-4 rounded-lg text-sm font-medium">
                  {error}
                </div>
              )}
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">First Name</label>
                  <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} required className="w-full border-neutral-300 rounded-lg p-3 border focus:ring-neutral-900 focus:border-neutral-900" placeholder="John" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">Last Name</label>
                  <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} required className="w-full border-neutral-300 rounded-lg p-3 border focus:ring-neutral-900 focus:border-neutral-900" placeholder="Doe" />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Email Address</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full border-neutral-300 rounded-lg p-3 border focus:ring-neutral-900 focus:border-neutral-900" placeholder="john@example.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Message</label>
                <textarea required value={message} onChange={e => setMessage(e.target.value)} rows={4} className="w-full border-neutral-300 rounded-lg p-3 border focus:ring-neutral-900 focus:border-neutral-900" placeholder="How can we help you?"></textarea>
              </div>

              <button 
                type="submit" 
                disabled={sending}
                className="w-full flex items-center justify-center py-3.5 px-4 bg-neutral-900 text-white rounded-lg font-medium hover:bg-neutral-800 transition-colors disabled:opacity-70"
              >
                {sending ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Send className="w-5 h-5 mr-2" />}
                {sending ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
