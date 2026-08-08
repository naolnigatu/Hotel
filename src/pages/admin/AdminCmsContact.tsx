import React, { useEffect, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { CmsContact } from '../../types';
import { Save, Loader2 } from 'lucide-react';

export default function AdminCmsContact() {
  const [data, setData] = useState<CmsContact>({
    phonePrimary: '',
    phoneSecondary: '',
    emailPrimary: '',
    emailSecondary: '',
    address: '',
    googleMapsUrl: '',
    facebookUrl: '',
    instagramUrl: '',
    twitterUrl: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchCms = async () => {
      try {
        const docRef = doc(db, 'settings', 'cms_contact');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setData(docSnap.data().data as CmsContact);
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    
    try {
      await setDoc(doc(db, 'settings', 'cms_contact'), { id: 'cms_contact', data });
      setMessage('Contact content saved successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error: any) {
      console.error("Error saving CMS contact data:", error);
      setMessage(`Error: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-neutral-400" /></div>;
  }

  return (
    <div className="max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-neutral-900">Contact & Social Links</h1>
      </div>

      {message && (
        <div className={`p-4 rounded-lg mb-6 text-sm font-medium ${message.includes('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          {message}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-8">
        <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-sm">
          <h2 className="text-lg font-bold text-neutral-900 mb-4">Contact Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Primary Phone</label>
              <input 
                type="text" 
                value={data.phonePrimary}
                onChange={e => setData({...data, phonePrimary: e.target.value})}
                className="w-full border-neutral-300 rounded-md shadow-sm p-2 border focus:ring-neutral-500 focus:border-neutral-500" 
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Secondary Phone (Optional)</label>
              <input 
                type="text" 
                value={data.phoneSecondary}
                onChange={e => setData({...data, phoneSecondary: e.target.value})}
                className="w-full border-neutral-300 rounded-md shadow-sm p-2 border focus:ring-neutral-500 focus:border-neutral-500" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Primary Email</label>
              <input 
                type="email" 
                value={data.emailPrimary}
                onChange={e => setData({...data, emailPrimary: e.target.value})}
                className="w-full border-neutral-300 rounded-md shadow-sm p-2 border focus:ring-neutral-500 focus:border-neutral-500" 
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Secondary Email (Optional)</label>
              <input 
                type="email" 
                value={data.emailSecondary}
                onChange={e => setData({...data, emailSecondary: e.target.value})}
                className="w-full border-neutral-300 rounded-md shadow-sm p-2 border focus:ring-neutral-500 focus:border-neutral-500" 
              />
            </div>
          </div>
          
          <div className="mt-4">
            <label className="block text-sm font-medium text-neutral-700 mb-1">Physical Address</label>
            <textarea 
              value={data.address}
              onChange={e => setData({...data, address: e.target.value})}
              className="w-full border-neutral-300 rounded-md shadow-sm p-2 border focus:ring-neutral-500 focus:border-neutral-500" 
              rows={2}
              required
            />
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-neutral-700 mb-1">Google Maps URL</label>
            <input 
              type="url" 
              value={data.googleMapsUrl}
              onChange={e => setData({...data, googleMapsUrl: e.target.value})}
              className="w-full border-neutral-300 rounded-md shadow-sm p-2 border focus:ring-neutral-500 focus:border-neutral-500" 
              placeholder="https://maps.google.com/..."
            />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-sm">
          <h2 className="text-lg font-bold text-neutral-900 mb-4">Social Media Links</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Facebook URL</label>
              <input 
                type="url" 
                value={data.facebookUrl}
                onChange={e => setData({...data, facebookUrl: e.target.value})}
                className="w-full border-neutral-300 rounded-md shadow-sm p-2 border focus:ring-neutral-500 focus:border-neutral-500" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Instagram URL</label>
              <input 
                type="url" 
                value={data.instagramUrl}
                onChange={e => setData({...data, instagramUrl: e.target.value})}
                className="w-full border-neutral-300 rounded-md shadow-sm p-2 border focus:ring-neutral-500 focus:border-neutral-500" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Twitter URL</label>
              <input 
                type="url" 
                value={data.twitterUrl}
                onChange={e => setData({...data, twitterUrl: e.target.value})}
                className="w-full border-neutral-300 rounded-md shadow-sm p-2 border focus:ring-neutral-500 focus:border-neutral-500" 
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button 
            type="submit" 
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-neutral-900 text-white rounded-lg font-medium hover:bg-neutral-800 transition-colors disabled:opacity-70"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
