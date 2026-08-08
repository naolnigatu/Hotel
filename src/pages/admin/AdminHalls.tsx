import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Hall } from '../../types';
import MediaManager from '../../components/admin/MediaManager';
import { Loader2, Plus, Pencil, Trash2, X, Save } from 'lucide-react';

export default function AdminHalls() {
  const [halls, setHalls] = useState<Hall[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingHall, setEditingHall] = useState<Hall | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchHalls = async () => {
    try {
      const q = query(collection(db, 'halls'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Hall));
      setHalls(data);
    } catch (error) {
      console.error("Error fetching halls:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHalls();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingHall) return;
    setSaving(true);
    
    try {
      const isNew = !editingHall.id;
      const id = isNew ? `hall_${Date.now()}` : editingHall.id;
      const hallToSave = { ...editingHall, id };
      
      await setDoc(doc(db, 'halls', id), hallToSave);
      await fetchHalls();
      setEditingHall(null);
    } catch (error) {
      console.error("Error saving hall:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this hall?')) return;
    try {
      await deleteDoc(doc(db, 'halls', id));
      setHalls(halls.filter(h => h.id !== id));
    } catch (error) {
      console.error("Error deleting hall:", error);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-neutral-400" /></div>;
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-neutral-900">Halls & Events</h1>
        <button 
          onClick={() => setEditingHall({ id: '', name: '', capacity: 0, description: '', price: 0, equipment: [], imageUrls: [], status: true })}
          className="flex items-center gap-2 px-4 py-2 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Hall
        </button>
      </div>

      {editingHall ? (
        <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-sm mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-neutral-900">{editingHall.id ? 'Edit Hall' : 'New Hall'}</h2>
            <button onClick={() => setEditingHall(null)} className="p-2 text-neutral-500 hover:bg-neutral-100 rounded-full">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Name</label>
                <input 
                  type="text" required
                  value={editingHall.name}
                  onChange={e => setEditingHall({...editingHall, name: e.target.value})}
                  className="w-full border-neutral-300 rounded-md shadow-sm p-2 border focus:ring-neutral-500 focus:border-neutral-500" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Price per day ($)</label>
                <input 
                  type="number" required min="0" step="0.01"
                  value={editingHall.price || ''}
                  onChange={e => setEditingHall({...editingHall, price: parseFloat(e.target.value) || 0})}
                  className="w-full border-neutral-300 rounded-md shadow-sm p-2 border focus:ring-neutral-500 focus:border-neutral-500" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Capacity (persons)</label>
                <input 
                  type="number" required min="1"
                  value={editingHall.capacity || ''}
                  onChange={e => setEditingHall({...editingHall, capacity: parseInt(e.target.value) || 0})}
                  className="w-full border-neutral-300 rounded-md shadow-sm p-2 border focus:ring-neutral-500 focus:border-neutral-500" 
                />
              </div>
              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={editingHall.status}
                    onChange={e => setEditingHall({...editingHall, status: e.target.checked})}
                    className="w-5 h-5 text-neutral-900 border-neutral-300 rounded focus:ring-neutral-900"
                  />
                  <span className="font-medium text-neutral-700">Active</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Description</label>
              <textarea 
                required rows={3}
                value={editingHall.description}
                onChange={e => setEditingHall({...editingHall, description: e.target.value})}
                className="w-full border-neutral-300 rounded-md shadow-sm p-2 border focus:ring-neutral-500 focus:border-neutral-500" 
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Equipment (comma separated)</label>
              <input 
                type="text"
                value={editingHall.equipment.join(', ')}
                onChange={e => setEditingHall({...editingHall, equipment: e.target.value.split(',').map(s => s.trim()).filter(Boolean)})}
                placeholder="Projector, PA System, Whiteboard"
                className="w-full border-neutral-300 rounded-md shadow-sm p-2 border focus:ring-neutral-500 focus:border-neutral-500" 
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">Images</label>
              <div className="flex gap-4 overflow-x-auto pb-4">
                {editingHall.imageUrls.map((url, i) => (
                  <div key={i} className="relative shrink-0 w-48 h-32 rounded-lg overflow-hidden border border-neutral-200">
                    <img src={url} alt="Hall" className="w-full h-full object-cover" />
                    <button 
                      type="button"
                      onClick={() => setEditingHall({...editingHall, imageUrls: editingHall.imageUrls.filter((_, idx) => idx !== i)})}
                      className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <div className="shrink-0 w-48 h-32">
                  <MediaManager 
                    onImageSelected={(url) => setEditingHall({...editingHall, imageUrls: [...editingHall.imageUrls, url]})}
                    folder="halls"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button 
                type="submit" disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 bg-neutral-900 text-white rounded-lg font-medium hover:bg-neutral-800 transition-colors disabled:opacity-70"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                {saving ? 'Saving...' : 'Save Hall'}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {halls.map(hall => (
          <div key={hall.id} className="bg-white border border-neutral-200 rounded-xl overflow-hidden flex flex-col">
            <div className="h-48 bg-neutral-100 relative">
              {hall.imageUrls?.[0] ? (
                <img src={hall.imageUrls[0]} alt={hall.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-neutral-400">No Image</div>
              )}
            </div>
            <div className="p-5 flex-1 flex flex-col">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-lg text-neutral-900">{hall.name}</h3>
                <span className="font-semibold text-neutral-900">${hall.price}/day</span>
              </div>
              <p className="text-sm text-neutral-600 mb-2">Capacity: {hall.capacity} persons</p>
              <p className="text-sm text-neutral-600 mb-4 line-clamp-2 flex-1">{hall.description}</p>
              
              <div className="flex gap-2 justify-end mt-4 pt-4 border-t border-neutral-100">
                <button 
                  onClick={() => setEditingHall(hall)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Pencil className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => handleDelete(hall.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
