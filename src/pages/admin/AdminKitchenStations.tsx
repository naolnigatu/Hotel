import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { KitchenStation, User } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { handleFirestoreError, OperationType, logAuditAction } from '../../lib/firestoreUtils';
import ConfirmModal from '../../components/common/ConfirmModal';
import { 
  ChefHat, 
  Plus, 
  Trash2, 
  Edit2, 
  CheckCircle, 
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  X,
  Users
} from 'lucide-react';

export default function AdminKitchenStations() {
  const { userData } = useAuth();
  const [stations, setStations] = useState<KitchenStation[]>([]);
  const [staffUsers, setStaffUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStation, setEditingStation] = useState<KitchenStation | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    displayOrder: 1,
    isActive: true,
    assignedStaffIds: [] as string[]
  });

  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [deletingStation, setDeletingStation] = useState<KitchenStation | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'kitchen_stations'), orderBy('displayOrder', 'asc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: KitchenStation[] = snapshot.docs.map(d => ({
          id: d.id,
          ...d.data()
        } as KitchenStation));
        setStations(list);
        setLoading(false);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'kitchen_stations');
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      const list = snapshot.docs.map(d => ({ ...d.data(), uid: d.id } as User));
      setStaffUsers(list.filter(u => u.role !== 'guest'));
    });
    return () => unsubscribe();
  }, []);

  const handleOpenAdd = () => {
    setEditingStation(null);
    setFormData({ name: '', description: '', displayOrder: stations.length + 1, isActive: true, assignedStaffIds: [] });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (station: KitchenStation) => {
    setEditingStation(station);
    setFormData({
      name: station.name,
      description: station.description || '',
      displayOrder: station.displayOrder || 1,
      isActive: station.isActive ?? true,
      assignedStaffIds: station.assignedStaffIds || []
    });
    setIsModalOpen(true);
  };

  const handleSaveStation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      const stationId = editingStation ? editingStation.id : `station_${Date.now()}`;
      const stationRef = doc(db, 'kitchen_stations', stationId);

      const payload: Partial<KitchenStation> = {
        id: stationId,
        name: formData.name.trim(),
        description: formData.description?.trim() || '',
        displayOrder: Number(formData.displayOrder) || 1,
        isActive: formData.isActive ?? true,
        assignedStaffIds: formData.assignedStaffIds.filter(Boolean)
      };

      await setDoc(stationRef, payload, { merge: true });

      setNotice({ type: 'success', text: `Station "${formData.name}" saved.` });
      await logAuditAction(
        userData?.uid || 'admin',
        userData?.name || 'Manager',
        userData?.role || 'admin',
        `${editingStation ? 'Updated' : 'Created'} Station "${formData.name}"`,
        'Stations'
      );
      setIsModalOpen(false);
    } catch (err) {
      handleFirestoreError(err, editingStation ? OperationType.UPDATE : OperationType.CREATE, 'kitchen_stations');
      setNotice({ type: 'error', text: 'Failed to save station.' });
    }
  };

  const handleDeleteStation = (station: KitchenStation) => {
    setDeletingStation(station);
  };

  const handleConfirmDeleteStation = async () => {
    if (!deletingStation) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'kitchen_stations', deletingStation.id));
      setNotice({ type: 'success', text: `Station "${deletingStation.name}" removed.` });
      await logAuditAction(
        userData?.uid || 'admin',
        userData?.name || 'Manager',
        userData?.role || 'admin',
        `Deleted Station "${deletingStation.name}"`,
        'Stations'
      );
      setDeletingStation(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `kitchen_stations/${deletingStation.id}`);
      setNotice({ type: 'error', text: 'Failed to delete station.' });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-neutral-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-neutral-900 text-white rounded-xl">
            <ChefHat className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">Stations Configuration</h1>
            <p className="text-sm text-neutral-500">Manage preparation stations for Orders</p>
          </div>
        </div>
        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white font-semibold rounded-xl text-sm flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Station
        </button>
      </div>

      {notice && (
        <div className={`p-4 rounded-xl text-sm font-medium flex items-center justify-between ${
          notice.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          <span>{notice.text}</span>
          <button onClick={() => setNotice(null)} className="font-bold text-xs">Dismiss</button>
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-neutral-500">Loading stations...</div>
      ) : stations.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-neutral-200">
          <ChefHat className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
          <p className="text-base font-semibold text-neutral-700">No stations defined</p>
          <p className="text-sm text-neutral-400 mt-1">Add stations like "Hot Kitchen", "Beverage Bar", "Grill", "Pastry" to direct order items.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stations.map((station) => (
            <div 
              key={station.id}
              className="bg-white rounded-2xl border border-neutral-200 p-5 space-y-3 relative hover:shadow-md transition-all"
            >
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Order Position #{station.displayOrder}</span>
                  <h3 className="text-lg font-bold text-neutral-900">{station.name}</h3>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                  station.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-neutral-100 text-neutral-600'
                }`}>
                  {station.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              
              {station.description && (
                <p className="text-xs text-neutral-500">{station.description}</p>
              )}

              <div className="flex items-center gap-1.5 text-xs font-medium text-neutral-500 bg-neutral-50 px-2.5 py-1.5 rounded-lg inline-flex w-fit">
                <Users className="w-3.5 h-3.5" />
                {station.assignedStaffIds?.length || 0} Staff Assigned
              </div>

              <div className="pt-3 border-t border-neutral-100 flex items-center justify-end gap-2">
                <button
                  onClick={() => handleOpenEdit(station)}
                  className="p-1.5 text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteStation(station)}
                  className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-neutral-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-neutral-200 max-w-md w-full p-6 space-y-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-neutral-100 pb-3">
              <h2 className="text-lg font-bold text-neutral-900">
                {editingStation ? 'Edit Station' : 'Add Station'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-neutral-400 hover:text-neutral-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveStation} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-neutral-700 uppercase mb-1">Station Name</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Hot Kitchen, Grill Station, Bar & Beverages"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl font-medium text-sm text-neutral-900"
                />
              </div>

              <div>
                <label className="block font-bold text-neutral-700 uppercase mb-1">Description</label>
                <textarea 
                  rows={2}
                  placeholder="e.g. Handles soups, stews, roasted meats and hot dishes"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl font-medium text-xs text-neutral-900"
                />
              </div>

              <div>
                <label className="block font-bold text-neutral-700 uppercase mb-1">Assigned Staff</label>
                <div className="space-y-2 max-h-40 overflow-y-auto p-3 bg-neutral-50 border border-neutral-200 rounded-xl">
                  {staffUsers.length === 0 && <span className="text-neutral-400">No staff found.</span>}
                  {staffUsers.map(user => (
                    <label key={user.uid} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.assignedStaffIds.includes(user.uid)}
                        onChange={(e) => {
                          const isChecked = e.target.checked;
                          setFormData(prev => ({
                            ...prev,
                            assignedStaffIds: isChecked
                              ? [...prev.assignedStaffIds, user.uid]
                              : prev.assignedStaffIds.filter(id => id !== user.uid)
                          }));
                        }}
                        className="rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
                      />
                      <span className="font-medium text-neutral-900">{user.name} <span className="text-[10px] text-neutral-500 uppercase">({user.role})</span></span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-neutral-700 uppercase mb-1">Display Order Priority</label>
                <input 
                  type="number" 
                  min="1"
                  value={formData.displayOrder}
                  onChange={(e) => setFormData(prev => ({ ...prev, displayOrder: parseInt(e.target.value) || 1 }))}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl font-medium text-sm text-neutral-900"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-xl border border-neutral-200">
                <span className="font-bold text-neutral-800">Station Active Status</span>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, isActive: !prev.isActive }))}
                  className={`p-1.5 rounded-lg flex items-center gap-1 text-xs font-bold ${
                    formData.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-neutral-200 text-neutral-600'
                  }`}
                >
                  {formData.isActive ? 'Active' : 'Inactive'}
                </button>
              </div>

              <div className="pt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-semibold rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white font-semibold rounded-xl text-xs"
                >
                  Save Station
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!deletingStation}
        title="Delete Kitchen Station"
        message={`Are you sure you want to delete "${deletingStation?.name}"? Items mapped to this station may need reassignment.`}
        confirmText="Delete Station"
        isLoading={isDeleting}
        onConfirm={handleConfirmDeleteStation}
        onClose={() => setDeletingStation(null)}
      />
    </div>
  );
}
