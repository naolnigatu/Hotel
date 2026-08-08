import React, { useEffect, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { CmsAbout } from '../../types';
import MediaManager from '../../components/admin/MediaManager';
import { Save, Loader2 } from 'lucide-react';

export default function AdminCmsAbout() {
  const [data, setData] = useState<CmsAbout>({
    story: '',
    vision: '',
    mission: '',
    history: '',
    imageUrl: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchCms = async () => {
      try {
        const docRef = doc(db, 'settings', 'cms_about');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setData(docSnap.data().data as CmsAbout);
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    
    try {
      await setDoc(doc(db, 'settings', 'cms_about'), { id: 'cms_about', data });
      setMessage('About content saved successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error: any) {
      console.error("Error saving CMS about data:", error);
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
        <h1 className="text-2xl font-bold text-neutral-900">About Us Content</h1>
      </div>

      {message && (
        <div className={`p-4 rounded-lg mb-6 text-sm font-medium ${message.includes('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          {message}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-8">
        <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-sm">
          <h2 className="text-lg font-bold text-neutral-900 mb-4">Our Story & History</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Our Story</label>
              <textarea 
                value={data.story}
                onChange={e => setData({...data, story: e.target.value})}
                className="w-full border-neutral-300 rounded-md shadow-sm p-2 border focus:ring-neutral-500 focus:border-neutral-500" 
                rows={4}
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">History</label>
              <textarea 
                value={data.history}
                onChange={e => setData({...data, history: e.target.value})}
                className="w-full border-neutral-300 rounded-md shadow-sm p-2 border focus:ring-neutral-500 focus:border-neutral-500" 
                rows={3}
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">About Page Image</label>
              <MediaManager 
                currentImageUrl={data.imageUrl} 
                onImageSelected={(url) => setData({...data, imageUrl: url})} 
                folder="cms_about" 
              />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-sm">
          <h2 className="text-lg font-bold text-neutral-900 mb-4">Vision & Mission</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Vision</label>
              <textarea 
                value={data.vision}
                onChange={e => setData({...data, vision: e.target.value})}
                className="w-full border-neutral-300 rounded-md shadow-sm p-2 border focus:ring-neutral-500 focus:border-neutral-500" 
                rows={3}
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Mission</label>
              <textarea 
                value={data.mission}
                onChange={e => setData({...data, mission: e.target.value})}
                className="w-full border-neutral-300 rounded-md shadow-sm p-2 border focus:ring-neutral-500 focus:border-neutral-500" 
                rows={3}
                required
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
