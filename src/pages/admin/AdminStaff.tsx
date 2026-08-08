import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, onSnapshot, doc, setDoc, query, orderBy } from 'firebase/firestore';
import { StaffMember, Role } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { handleFirestoreError, OperationType, logAuditAction } from '../../lib/firestoreUtils';
import { 
  Users, 
  Plus, 
  Edit2, 
  CheckCircle, 
  AlertCircle,
  Search,
  UserCheck,
  UserX,
  Mail,
  Phone,
  Shield,
  X
} from 'lucide-react';

export default function AdminStaff() {
  const { userData } = useAuth();
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'waiter' as Role,
    department: 'Restaurant',
    isActive: true
  });

  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'staff'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: StaffMember[] = snapshot.docs.map(d => ({
          id: d.id,
          ...d.data()
        } as StaffMember));
        setStaffList(list);
        setLoading(false);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'staff');
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleOpenAdd = () => {
    setEditingStaff(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      role: 'waiter',
      department: 'Restaurant',
      isActive: true
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (staff: StaffMember) => {
    setEditingStaff(staff);
    setFormData({
      name: staff.name,
      email: staff.email,
      phone: staff.phone || '',
      role: staff.role,
      department: staff.department || 'Hotel',
      isActive: staff.isActive ?? true
    });
    setIsModalOpen(true);
  };

  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) return;

    try {
      const staffId = editingStaff ? editingStaff.id : `staff_${Date.now()}`;
      const staffRef = doc(db, 'staff', staffId);

      const payload: StaffMember = {
        id: staffId,
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        role: formData.role,
        department: formData.department.trim(),
        isActive: formData.isActive,
        createdAt: editingStaff ? editingStaff.createdAt : Date.now(),
        updatedAt: Date.now()
      };

      await setDoc(staffRef, payload, { merge: true });

      setNotice({ type: 'success', text: `Staff profile for ${formData.name} saved.` });
      await logAuditAction(
        userData?.uid || 'admin',
        userData?.name || 'Manager',
        userData?.role || 'admin',
        `${editingStaff ? 'Updated' : 'Created'} Staff Member "${formData.name}"`,
        'Staff',
        `Role: ${formData.role}, Dept: ${formData.department}`
      );

      setIsModalOpen(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'staff');
      setNotice({ type: 'error', text: 'Failed to save staff profile.' });
    }
  };

  const handleToggleActive = async (staff: StaffMember) => {
    try {
      const staffRef = doc(db, 'staff', staff.id);
      const newStatus = !staff.isActive;
      await setDoc(staffRef, { isActive: newStatus, updatedAt: Date.now() }, { merge: true });

      setNotice({ type: 'success', text: `${staff.name} is now ${newStatus ? 'Active' : 'Inactive'}.` });
      await logAuditAction(
        userData?.uid || 'admin',
        userData?.name || 'Manager',
        userData?.role || 'admin',
        `Toggled Staff Active Status for "${staff.name}" to ${newStatus}`,
        'Staff'
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `staff/${staff.id}`);
      setNotice({ type: 'error', text: 'Failed to update staff status.' });
    }
  };

  const rolesList: { role: Role; label: string }[] = [
    { role: 'admin', label: 'Admin & Hotel Manager' },
    { role: 'reception', label: 'Reception & Front Desk' },
    { role: 'kitchen', label: 'Kitchen & Chef' },
    { role: 'waiter', label: 'Waiter & Food Service' },
    { role: 'housekeeping', label: 'Housekeeping & Maintenance' }
  ];

  const filteredStaff = staffList.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          s.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || s.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-neutral-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-neutral-900 text-white rounded-xl">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">Staff Management & Role Delegation</h1>
            <p className="text-sm text-neutral-500">Manage employee accounts, roles & operational access</p>
          </div>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white font-semibold rounded-xl text-sm flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Staff Member
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

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-neutral-200 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input 
            type="text" 
            placeholder="Search staff by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:border-neutral-900"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto">
          <button
            onClick={() => setRoleFilter('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
              roleFilter === 'all' ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }`}
          >
            All Staff ({staffList.length})
          </button>
          {rolesList.map(r => (
            <button
              key={r.role}
              onClick={() => setRoleFilter(r.role)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
                roleFilter === r.role ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              {r.role.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Staff Grid */}
      {loading ? (
        <div className="p-12 text-center text-neutral-500">Loading staff list...</div>
      ) : filteredStaff.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-neutral-200">
          <Users className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
          <p className="text-base font-semibold text-neutral-700">No staff members found</p>
          <p className="text-sm text-neutral-400 mt-1">Add staff profiles to grant system permissions.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStaff.map((staff) => (
            <div 
              key={staff.id}
              className="bg-white rounded-2xl border border-neutral-200 p-5 space-y-4 hover:shadow-md transition-all relative"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-neutral-900 text-white font-bold flex items-center justify-center text-base">
                    {staff.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-neutral-900 text-base">{staff.name}</h3>
                    <span className="text-xs px-2 py-0.5 rounded-md bg-neutral-100 font-semibold text-neutral-700 uppercase tracking-wider">
                      {staff.role}
                    </span>
                  </div>
                </div>

                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                  staff.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                }`}>
                  {staff.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-neutral-600 pt-2 border-t border-neutral-100">
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-neutral-400" />
                  <span>{staff.email}</span>
                </div>
                {staff.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-neutral-400" />
                    <span>{staff.phone}</span>
                  </div>
                )}
                {staff.department && (
                  <div className="flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5 text-neutral-400" />
                    <span>Department: {staff.department}</span>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-neutral-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => handleToggleActive(staff)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors ${
                    staff.isActive 
                      ? 'bg-red-50 text-red-700 hover:bg-red-100' 
                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  }`}
                >
                  {staff.isActive ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                  {staff.isActive ? 'Deactivate' : 'Activate'}
                </button>

                <button
                  onClick={() => handleOpenEdit(staff)}
                  className="p-1.5 text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-neutral-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-neutral-200 max-w-md w-full p-6 space-y-6 shadow-xl">
            <div className="flex justify-between items-center border-b border-neutral-100 pb-3">
              <h2 className="text-lg font-bold text-neutral-900">
                {editingStaff ? 'Edit Staff Profile' : 'Add Staff Member'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-neutral-400 hover:text-neutral-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStaff} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-neutral-700 uppercase mb-1">Full Name</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Abebe Bikila"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl font-medium text-sm text-neutral-900"
                />
              </div>

              <div>
                <label className="block font-bold text-neutral-700 uppercase mb-1">Email Address</label>
                <input 
                  type="email" 
                  required
                  placeholder="e.g. abebe@wolisohotel.com"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl font-medium text-sm text-neutral-900"
                />
              </div>

              <div>
                <label className="block font-bold text-neutral-700 uppercase mb-1">Phone Number</label>
                <input 
                  type="text" 
                  placeholder="e.g. +251 911 234 567"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl font-medium text-sm text-neutral-900"
                />
              </div>

              <div>
                <label className="block font-bold text-neutral-700 uppercase mb-1">System Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value as Role }))}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl font-medium text-sm text-neutral-900"
                >
                  {rolesList.map(r => (
                    <option key={r.role} value={r.role}>{r.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-neutral-700 uppercase mb-1">Department</label>
                <input 
                  type="text" 
                  placeholder="e.g. Food & Beverage, Reception, Maintenance"
                  value={formData.department}
                  onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl font-medium text-sm text-neutral-900"
                />
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
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
