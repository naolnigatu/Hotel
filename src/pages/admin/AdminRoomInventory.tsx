import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Room, RoomCategory } from '../../types';
import { Loader2, Plus, Pencil, Trash2, X, Save } from 'lucide-react';

export default function AdminRoomInventory() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [categories, setCategories] = useState<RoomCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    try {
      const [roomsSnap, catsSnap] = await Promise.all([
        getDocs(query(collection(db, 'rooms'))),
        getDocs(query(collection(db, 'room_categories')))
      ]);
      setRooms(roomsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Room)));
      setCategories(catsSnap.docs.map(d => ({ id: d.id, ...d.data() } as RoomCategory)));
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRoom) return;
    setSaving(true);
    try {
      const isNew = !editingRoom.id;
      const id = isNew ? `room_${Date.now()}` : editingRoom.id;
      const roomToSave = { ...editingRoom, id };
      await setDoc(doc(db, 'rooms', id), roomToSave);
      setEditingRoom(null);
      await fetchData();
    } catch (error) {
      console.error("Error saving room:", error);
      alert("Failed to save room.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this room?')) return;
    try {
      await deleteDoc(doc(db, 'rooms', id));
      await fetchData();
    } catch (error) {
      console.error("Error deleting room:", error);
    }
  };

  const startNew = () => {
    setEditingRoom({
      id: '',
      categoryId: categories[0]?.id || '',
      roomNumber: '',
      condition: 'Clean',
      status: 'Available'
    });
  };

  const getCategoryName = (id: string) => categories.find(c => c.id === id)?.name || id;

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-neutral-400" /></div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-neutral-900">Room Inventory</h1>
        <button onClick={startNew} className="flex items-center gap-2 px-4 py-2 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800">
          <Plus className="w-4 h-4" />
          Add Room
        </button>
      </div>

      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-neutral-50 border-b border-neutral-200">
            <tr>
              <th className="px-6 py-4 font-semibold text-neutral-900">Room Number</th>
              <th className="px-6 py-4 font-semibold text-neutral-900">Category</th>
              <th className="px-6 py-4 font-semibold text-neutral-900">Condition</th>
              <th className="px-6 py-4 font-semibold text-neutral-900">Status</th>
              <th className="px-6 py-4 font-semibold text-neutral-900 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {rooms.map((room) => (
              <tr key={room.id} className="hover:bg-neutral-50">
                <td className="px-6 py-4 font-bold text-neutral-900">{room.roomNumber}</td>
                <td className="px-6 py-4 text-neutral-600">{getCategoryName(room.categoryId)}</td>
                <td className="px-6 py-4 text-neutral-600">{room.condition}</td>
                <td className="px-6 py-4 text-neutral-600">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${room.status === 'Available' ? 'bg-green-100 text-green-700' : room.status === 'Occupied' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {room.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button onClick={() => setEditingRoom(room)} className="p-2 text-neutral-400 hover:text-neutral-900"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(room.id)} className="p-2 text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
            {rooms.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-neutral-500">No rooms found. Add some to manage inventory.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editingRoom && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden">
            <div className="p-6 border-b border-neutral-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-neutral-900">{editingRoom.id ? 'Edit Room' : 'Add Room'}</h2>
              <button onClick={() => setEditingRoom(null)} className="p-2 hover:bg-neutral-100 rounded-full"><X className="w-5 h-5" /></button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Room Number</label>
                <input type="text" value={editingRoom.roomNumber} onChange={e => setEditingRoom({...editingRoom, roomNumber: e.target.value})} required className="w-full border-neutral-300 rounded-lg p-2.5 border" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Category</label>
                <select value={editingRoom.categoryId} onChange={e => setEditingRoom({...editingRoom, categoryId: e.target.value})} className="w-full border-neutral-300 rounded-lg p-2.5 border">
                  {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Condition</label>
                <select value={editingRoom.condition} onChange={e => setEditingRoom({...editingRoom, condition: e.target.value as any})} className="w-full border-neutral-300 rounded-lg p-2.5 border">
                  {['Clean', 'Dirty', 'Cleaning', 'Inspection Required', 'Maintenance Required'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Status</label>
                <select value={editingRoom.status} onChange={e => setEditingRoom({...editingRoom, status: e.target.value as any})} className="w-full border-neutral-300 rounded-lg p-2.5 border">
                  {['Available', 'Reserved', 'Occupied', 'Out of Service', 'Blocked'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setEditingRoom(null)} className="px-4 py-2 font-medium text-neutral-600 hover:bg-neutral-100 rounded-lg">Cancel</button>
                <button type="submit" disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 disabled:opacity-70">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Room
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
