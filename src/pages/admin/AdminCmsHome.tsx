import React, { useEffect, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { CmsHome, Testimonial, Statistic } from '../../types';
import MediaManager from '../../components/admin/MediaManager';
import { Save, Loader2, Plus, Trash2 } from 'lucide-react';

export default function AdminCmsHome() {
  const [data, setData] = useState<CmsHome>({
    heroTitle: '',
    heroSubtitle: '',
    heroImageUrl: '',
    heroVideoUrl: '',
    heroPrimaryButtonText: '',
    heroPrimaryButtonLink: '',
    featuredSectionTitle: '',
    featuredSectionSubtitle: '',
    roomsSectionTitle: '',
    roomsSectionSubtitle: '',
    hallsSectionTitle: '',
    hallsSectionSubtitle: '',
    restaurantSectionTitle: '',
    restaurantSectionSubtitle: '',
    testimonialsTitle: '',
    testimonialsSubtitle: '',
    testimonials: [],
    statistics: [],
    mapEmbedUrl: '',
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchCms = async () => {
      try {
        const docRef = doc(db, 'settings', 'cms_home');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const fetchedData = docSnap.data().data as CmsHome;
          setData({
            heroTitle: fetchedData.heroTitle || '',
            heroSubtitle: fetchedData.heroSubtitle || '',
            heroImageUrl: fetchedData.heroImageUrl || '',
            heroVideoUrl: fetchedData.heroVideoUrl || '',
            heroPrimaryButtonText: fetchedData.heroPrimaryButtonText || '',
            heroPrimaryButtonLink: fetchedData.heroPrimaryButtonLink || '',
            featuredSectionTitle: fetchedData.featuredSectionTitle || '',
            featuredSectionSubtitle: fetchedData.featuredSectionSubtitle || '',
            roomsSectionTitle: fetchedData.roomsSectionTitle || '',
            roomsSectionSubtitle: fetchedData.roomsSectionSubtitle || '',
            hallsSectionTitle: fetchedData.hallsSectionTitle || '',
            hallsSectionSubtitle: fetchedData.hallsSectionSubtitle || '',
            restaurantSectionTitle: fetchedData.restaurantSectionTitle || '',
            restaurantSectionSubtitle: fetchedData.restaurantSectionSubtitle || '',
            testimonialsTitle: fetchedData.testimonialsTitle || '',
            testimonialsSubtitle: fetchedData.testimonialsSubtitle || '',
            testimonials: fetchedData.testimonials || [],
            statistics: fetchedData.statistics || [],
            mapEmbedUrl: fetchedData.mapEmbedUrl || '',
          });
        }
      } catch (error: any) {
        if (error.code !== 'unavailable') {
          console.error("Error fetching CMS home data:", error);
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
      await setDoc(doc(db, 'settings', 'cms_home'), { id: 'cms_home', data });
      setMessage('Homepage content saved successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error: any) {
      console.error("Error saving CMS home data:", error);
      setMessage(`Error: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const addTestimonial = () => {
    setData({
      ...data,
      testimonials: [...data.testimonials, { id: `test_${Date.now()}`, name: '', role: '', content: '', rating: 5 }]
    });
  };

  const updateTestimonial = (id: string, field: keyof Testimonial, value: any) => {
    setData({
      ...data,
      testimonials: data.testimonials.map(t => t.id === id ? { ...t, [field]: value } : t)
    });
  };

  const removeTestimonial = (id: string) => {
    setData({
      ...data,
      testimonials: data.testimonials.filter(t => t.id !== id)
    });
  };

  const addStatistic = () => {
    setData({
      ...data,
      statistics: [...data.statistics, { id: `stat_${Date.now()}`, label: '', value: '' }]
    });
  };

  const updateStatistic = (id: string, field: keyof Statistic, value: any) => {
    setData({
      ...data,
      statistics: data.statistics.map(s => s.id === id ? { ...s, [field]: value } : s)
    });
  };

  const removeStatistic = (id: string) => {
    setData({
      ...data,
      statistics: data.statistics.filter(s => s.id !== id)
    });
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-neutral-400" /></div>;
  }

  return (
    <div className="max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-neutral-900">Homepage Content</h1>
      </div>

      {message && (
        <div className={`p-4 rounded-lg mb-6 text-sm font-medium ${message.includes('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          {message}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-8">
        
        {/* Hero Section */}
        <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-sm">
          <h2 className="text-lg font-bold text-neutral-900 mb-4">Hero Section</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Hero Title</label>
              <input 
                type="text" 
                value={data.heroTitle}
                onChange={e => setData({...data, heroTitle: e.target.value})}
                className="w-full border-neutral-300 rounded-md shadow-sm p-2 border focus:ring-neutral-500 focus:border-neutral-500" 
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Hero Subtitle</label>
              <textarea 
                value={data.heroSubtitle}
                onChange={e => setData({...data, heroSubtitle: e.target.value})}
                className="w-full border-neutral-300 rounded-md shadow-sm p-2 border focus:ring-neutral-500 focus:border-neutral-500" 
                rows={2}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Primary Button Text</label>
                <input 
                  type="text" 
                  value={data.heroPrimaryButtonText}
                  onChange={e => setData({...data, heroPrimaryButtonText: e.target.value})}
                  className="w-full border-neutral-300 rounded-md shadow-sm p-2 border focus:ring-neutral-500 focus:border-neutral-500" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Primary Button Link</label>
                <input 
                  type="text" 
                  value={data.heroPrimaryButtonLink}
                  onChange={e => setData({...data, heroPrimaryButtonLink: e.target.value})}
                  className="w-full border-neutral-300 rounded-md shadow-sm p-2 border focus:ring-neutral-500 focus:border-neutral-500" 
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Hero Video URL (Optional)</label>
              <input 
                type="text" 
                value={data.heroVideoUrl}
                onChange={e => setData({...data, heroVideoUrl: e.target.value})}
                placeholder="e.g. https://www.youtube.com/embed/..."
                className="w-full border-neutral-300 rounded-md shadow-sm p-2 border focus:ring-neutral-500 focus:border-neutral-500" 
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">Hero Background Image</label>
              <MediaManager 
                currentImageUrl={data.heroImageUrl} 
                onImageSelected={(url) => setData({...data, heroImageUrl: url})} 
                folder="cms_home" 
              />
            </div>
          </div>
        </div>

        {/* Featured Amenities Section */}
        <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-sm">
          <h2 className="text-lg font-bold text-neutral-900 mb-4">Featured Sections Headings</h2>
          <div className="space-y-6">
            <div className="border border-neutral-100 p-4 rounded-lg bg-neutral-50">
              <h3 className="font-semibold text-neutral-800 mb-3">Amenities Section</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">Title</label>
                  <input 
                    type="text" 
                    value={data.featuredSectionTitle}
                    onChange={e => setData({...data, featuredSectionTitle: e.target.value})}
                    className="w-full border-neutral-300 rounded-md shadow-sm p-2 text-sm border focus:ring-neutral-500 focus:border-neutral-500" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">Subtitle</label>
                  <textarea 
                    value={data.featuredSectionSubtitle}
                    onChange={e => setData({...data, featuredSectionSubtitle: e.target.value})}
                    className="w-full border-neutral-300 rounded-md shadow-sm p-2 text-sm border focus:ring-neutral-500 focus:border-neutral-500" 
                    rows={2}
                  />
                </div>
              </div>
            </div>

            <div className="border border-neutral-100 p-4 rounded-lg bg-neutral-50">
              <h3 className="font-semibold text-neutral-800 mb-3">Rooms Section</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">Title</label>
                  <input 
                    type="text" 
                    value={data.roomsSectionTitle || ''}
                    onChange={e => setData({...data, roomsSectionTitle: e.target.value})}
                    className="w-full border-neutral-300 rounded-md shadow-sm p-2 text-sm border focus:ring-neutral-500 focus:border-neutral-500" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">Subtitle</label>
                  <textarea 
                    value={data.roomsSectionSubtitle || ''}
                    onChange={e => setData({...data, roomsSectionSubtitle: e.target.value})}
                    className="w-full border-neutral-300 rounded-md shadow-sm p-2 text-sm border focus:ring-neutral-500 focus:border-neutral-500" 
                    rows={2}
                  />
                </div>
              </div>
            </div>

            <div className="border border-neutral-100 p-4 rounded-lg bg-neutral-50">
              <h3 className="font-semibold text-neutral-800 mb-3">Halls & Events Section</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">Title</label>
                  <input 
                    type="text" 
                    value={data.hallsSectionTitle || ''}
                    onChange={e => setData({...data, hallsSectionTitle: e.target.value})}
                    className="w-full border-neutral-300 rounded-md shadow-sm p-2 text-sm border focus:ring-neutral-500 focus:border-neutral-500" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">Subtitle</label>
                  <textarea 
                    value={data.hallsSectionSubtitle || ''}
                    onChange={e => setData({...data, hallsSectionSubtitle: e.target.value})}
                    className="w-full border-neutral-300 rounded-md shadow-sm p-2 text-sm border focus:ring-neutral-500 focus:border-neutral-500" 
                    rows={2}
                  />
                </div>
              </div>
            </div>

            <div className="border border-neutral-100 p-4 rounded-lg bg-neutral-50">
              <h3 className="font-semibold text-neutral-800 mb-3">Restaurant Section</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">Title</label>
                  <input 
                    type="text" 
                    value={data.restaurantSectionTitle || ''}
                    onChange={e => setData({...data, restaurantSectionTitle: e.target.value})}
                    className="w-full border-neutral-300 rounded-md shadow-sm p-2 text-sm border focus:ring-neutral-500 focus:border-neutral-500" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">Subtitle</label>
                  <textarea 
                    value={data.restaurantSectionSubtitle || ''}
                    onChange={e => setData({...data, restaurantSectionSubtitle: e.target.value})}
                    className="w-full border-neutral-300 rounded-md shadow-sm p-2 text-sm border focus:ring-neutral-500 focus:border-neutral-500" 
                    rows={2}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics Section */}
        <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-neutral-900">Statistics</h2>
            <button 
              type="button" 
              onClick={addStatistic}
              className="flex items-center gap-1 text-sm bg-neutral-100 px-3 py-1.5 rounded-lg hover:bg-neutral-200 font-medium"
            >
              <Plus className="w-4 h-4" /> Add Statistic
            </button>
          </div>
          
          <div className="space-y-4">
            {data.statistics.map((stat, index) => (
              <div key={stat.id} className="flex gap-4 items-start border border-neutral-100 p-4 rounded-lg bg-neutral-50 relative">
                <div className="flex-1 space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-neutral-500 mb-1">Value (e.g., 500+)</label>
                    <input 
                      type="text" 
                      value={stat.value}
                      onChange={e => updateStatistic(stat.id, 'value', e.target.value)}
                      className="w-full border-neutral-300 rounded-md shadow-sm p-2 text-sm border focus:ring-neutral-500 focus:border-neutral-500" 
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-500 mb-1">Label (e.g., Happy Guests)</label>
                    <input 
                      type="text" 
                      value={stat.label}
                      onChange={e => updateStatistic(stat.id, 'label', e.target.value)}
                      className="w-full border-neutral-300 rounded-md shadow-sm p-2 text-sm border focus:ring-neutral-500 focus:border-neutral-500" 
                      required
                    />
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={() => removeStatistic(stat.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg shrink-0 mt-6"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
            {data.statistics.length === 0 && (
              <p className="text-sm text-neutral-500 italic">No statistics added yet.</p>
            )}
          </div>
        </div>

        {/* Testimonials Section */}
        <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-neutral-900">Testimonials Section</h2>
            <button 
              type="button" 
              onClick={addTestimonial}
              className="flex items-center gap-1 text-sm bg-neutral-100 px-3 py-1.5 rounded-lg hover:bg-neutral-200 font-medium"
            >
              <Plus className="w-4 h-4" /> Add Testimonial
            </button>
          </div>
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Section Title</label>
              <input 
                type="text" 
                value={data.testimonialsTitle}
                onChange={e => setData({...data, testimonialsTitle: e.target.value})}
                className="w-full border-neutral-300 rounded-md shadow-sm p-2 border focus:ring-neutral-500 focus:border-neutral-500" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Section Subtitle</label>
              <input 
                type="text" 
                value={data.testimonialsSubtitle}
                onChange={e => setData({...data, testimonialsSubtitle: e.target.value})}
                className="w-full border-neutral-300 rounded-md shadow-sm p-2 border focus:ring-neutral-500 focus:border-neutral-500" 
              />
            </div>
          </div>

          <div className="space-y-4">
            {data.testimonials.map((test, index) => (
              <div key={test.id} className="flex gap-4 items-start border border-neutral-100 p-4 rounded-lg bg-neutral-50">
                <div className="flex-1 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-neutral-500 mb-1">Name</label>
                      <input 
                        type="text" 
                        value={test.name}
                        onChange={e => updateTestimonial(test.id, 'name', e.target.value)}
                        className="w-full border-neutral-300 rounded-md shadow-sm p-2 text-sm border focus:ring-neutral-500 focus:border-neutral-500" 
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-neutral-500 mb-1">Role/Location</label>
                      <input 
                        type="text" 
                        value={test.role}
                        onChange={e => updateTestimonial(test.id, 'role', e.target.value)}
                        className="w-full border-neutral-300 rounded-md shadow-sm p-2 text-sm border focus:ring-neutral-500 focus:border-neutral-500" 
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-500 mb-1">Review Content</label>
                    <textarea 
                      value={test.content}
                      onChange={e => updateTestimonial(test.id, 'content', e.target.value)}
                      className="w-full border-neutral-300 rounded-md shadow-sm p-2 text-sm border focus:ring-neutral-500 focus:border-neutral-500" 
                      rows={2}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-500 mb-1">Rating (1-5)</label>
                    <input 
                      type="number" min="1" max="5"
                      value={test.rating || ''}
                      onChange={e => updateTestimonial(test.id, 'rating', parseInt(e.target.value) || 5)}
                      className="w-full border-neutral-300 rounded-md shadow-sm p-2 text-sm border focus:ring-neutral-500 focus:border-neutral-500" 
                      required
                    />
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={() => removeTestimonial(test.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg shrink-0 mt-6"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
            {data.testimonials.length === 0 && (
              <p className="text-sm text-neutral-500 italic">No testimonials added yet.</p>
            )}
          </div>
        </div>

        {/* Map Section */}
        <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-sm">
          <h2 className="text-lg font-bold text-neutral-900 mb-4">Location Map</h2>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Google Maps Embed URL</label>
            <input 
              type="text" 
              value={data.mapEmbedUrl}
              onChange={e => setData({...data, mapEmbedUrl: e.target.value})}
              placeholder="https://www.google.com/maps/embed?pb=..."
              className="w-full border-neutral-300 rounded-md shadow-sm p-2 border focus:ring-neutral-500 focus:border-neutral-500" 
            />
            <p className="text-xs text-neutral-500 mt-1">Go to Google Maps &gt; Share &gt; Embed a map &gt; Copy HTML. Extract the src attribute URL.</p>
          </div>
        </div>

        <div className="flex justify-end pb-12">
          <button 
            type="submit" 
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-neutral-900 text-white rounded-lg font-medium hover:bg-neutral-800 transition-colors disabled:opacity-70 shadow-lg"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            {saving ? 'Saving...' : 'Save All Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
