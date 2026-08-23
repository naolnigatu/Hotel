import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, onSnapshot, doc, updateDoc, setDoc } from 'firebase/firestore';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, updateProfile, signOut } from 'firebase/auth';
import firebaseConfig from '../../../firebase-applet-config.json';
import { User, Role } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { logAuditAction } from '../../lib/firestoreUtils';
import { Users, Shield, Plus, X, Search, CheckCircle, Mail, Key } from 'lucide-react';

const ROLES: { value: Role; label: string }[] = [
  { value: 'admin', label: 'Admin (Full Access)' },
  { value: 'reception', label: 'Reception (Front Desk)' },
  { value: 'waiter', label: 'Waiter (Restaurant)' },
  { value: 'kitchen', label: 'Kitchen Staff' },
  { value: 'housekeeping', label: 'Housekeeping' },
  { value: 'guest', label: 'Guest (Customer)' },
];

export default function AdminUsers() {
  const { userData } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'waiter' as Role
  });

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), (snapshot) => {
      const list: User[] = snapshot.docs.map(d => ({ ...d.data(), uid: d.id } as User));
      setUsers(list.sort((a, b) => b.createdAt - a.createdAt));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleUpdateRole = async (userId: string, newRole: Role) => {
    try {
      await updateDoc(doc(db, 'users', userId), { role: newRole });
      logAuditAction(
        userData?.uid || 'system',
        userData?.name || 'System',
        userData?.role || 'admin',
        'Update Role',
        'Staff',
        `Changed role of user ${userId} to ${newRole}`
      );
      setNotice({ type: 'success', text: 'Role updated successfully.' });
      setTimeout(() => setNotice(null), 3000);
    } catch (err) {
      console.error(err);
      setNotice({ type: 'error', text: 'Failed to update user role.' });
    }
  };

  const handleRegisterStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegistering(true);
    setNotice(null);

    // Create a secondary app to register the user without signing out the current admin
    const secondaryApp = initializeApp(firebaseConfig, 'SecondaryAuthApp_' + Date.now());
    const secondaryAuth = getAuth(secondaryApp);

    try {
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, formData.email, formData.password);
      
      await updateProfile(userCredential.user, {
        displayName: formData.name
      });

      // Add to users collection via the main app's Firestore (we are logged in as admin in the primary app)
      const newUserDoc: User = {
        uid: userCredential.user.uid,
        email: formData.email,
        name: formData.name,
        role: formData.role,
        createdAt: Date.now()
      };
      
      await setDoc(doc(db, 'users', userCredential.user.uid), newUserDoc);
      
      logAuditAction(
        userData?.uid || 'system',
        userData?.name || 'System',
        userData?.role || 'admin',
        'Register Staff',
        'Staff',
        `Created staff account for ${formData.email} as ${formData.role}`
      );

      setNotice({ type: 'success', text: `Successfully registered staff account for ${formData.name}.` });
      setIsRegisterOpen(false);
      setFormData({ name: '', email: '', password: '', role: 'waiter' });
      
    } catch (err: any) {
      console.error("Registration failed:", err);
      setNotice({ type: 'error', text: err.message || 'Failed to register account.' });
    } finally {
      // Clean up the secondary auth app
      await signOut(secondaryAuth).catch(() => {});
      await deleteApp(secondaryApp).catch(() => {});
      setRegistering(false);
    }
  };

  const filteredUsers = users.filter(u => 
    u.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-neutral-700" /> User Management
          </h1>
          <p className="text-sm text-neutral-500">Manage accounts, assign roles, and register new staff members.</p>
        </div>
        <button
          onClick={() => setIsRegisterOpen(true)}
          className="px-4 py-2 bg-neutral-900 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-neutral-800 transition"
        >
          <Plus className="w-4 h-4" /> Register Staff Account
        </button>
      </div>

      {notice && (
        <div className={`p-4 rounded-xl flex items-center gap-3 text-sm font-bold ${
          notice.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {notice.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <X className="w-5 h-5" />}
          {notice.text}
        </div>
      )}

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-sm flex items-center gap-3">
        <Search className="w-5 h-5 text-neutral-400 shrink-0" />
        <input
          type="text"
          placeholder="Search users by name or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-transparent border-none focus:ring-0 text-sm p-0"
        />
      </div>

      {/* Users List */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-50 text-neutral-500 font-medium border-b border-neutral-200">
              <tr>
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Current Role</th>
                <th className="px-6 py-4">Promote / Change Role</th>
                <th className="px-6 py-4">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {loading ? (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-neutral-400">Loading users...</td></tr>
              ) : filteredUsers.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-neutral-400">No users found.</td></tr>
              ) : (
                filteredUsers.map(user => (
                  <tr key={user.uid} className="hover:bg-neutral-50/50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-neutral-200 text-neutral-700 flex items-center justify-center font-bold">
                          {user.name?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <div>
                          <p className="font-bold text-neutral-900">{user.name}</p>
                          <p className="text-[11px] text-neutral-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                        user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                        user.role === 'guest' ? 'bg-neutral-100 text-neutral-600' :
                        'bg-emerald-100 text-emerald-800'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={user.role}
                        onChange={(e) => handleUpdateRole(user.uid, e.target.value as Role)}
                        disabled={user.uid === userData?.uid}
                        className="bg-neutral-50 border border-neutral-200 text-neutral-800 text-xs rounded-lg focus:ring-neutral-900 focus:border-neutral-900 block w-full p-2 disabled:opacity-50"
                      >
                        {ROLES.map(r => (
                          <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4 text-xs text-neutral-500 whitespace-nowrap">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Register Staff Modal */}
      {isRegisterOpen && (
        <div className="fixed inset-0 bg-neutral-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-neutral-200 max-w-md w-full p-6 space-y-6 shadow-xl">
            <div className="flex justify-between items-center border-b border-neutral-100 pb-3">
              <h2 className="text-lg font-bold text-neutral-900">Register Staff Account</h2>
              <button onClick={() => setIsRegisterOpen(false)} className="text-neutral-400 hover:text-neutral-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleRegisterStaff} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">Full Name</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Jane Doe"
                  value={formData.name}
                  onChange={(e) => setFormData(p => ({...p, name: e.target.value}))}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                  <input 
                    type="email" 
                    required
                    placeholder="e.g. jane@hotel.com"
                    value={formData.email}
                    onChange={(e) => setFormData(p => ({...p, email: e.target.value}))}
                    className="w-full pl-9 pr-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">Temporary Password</label>
                <div className="relative">
                  <Key className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                  <input 
                    type="text" 
                    required
                    minLength={6}
                    placeholder="Must be at least 6 characters"
                    value={formData.password}
                    onChange={(e) => setFormData(p => ({...p, password: e.target.value}))}
                    className="w-full pl-9 pr-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm"
                  />
                </div>
                <p className="text-[10px] text-neutral-500 mt-1">Staff can change this after signing in.</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">Assign Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData(p => ({...p, role: e.target.value as Role}))}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-semibold"
                >
                  {ROLES.filter(r => r.value !== 'guest').map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>

              <div className="pt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsRegisterOpen(false)}
                  className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-bold rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={registering}
                  className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white font-bold rounded-xl text-xs disabled:opacity-50"
                >
                  {registering ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
