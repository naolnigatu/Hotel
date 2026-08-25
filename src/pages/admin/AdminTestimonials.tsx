import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Star, CheckCircle, XCircle, Trash2 } from 'lucide-react';
import ConfirmModal from '../../components/common/ConfirmModal';

interface Testimonial {
  id: string;
  name: string;
  role: string;
  content: string;
  rating: number;
  userId: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: number;
}

export default function AdminTestimonials() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);

  // Confirm Modal State
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [testimonialToDelete, setTestimonialToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchTestimonials();
  }, []);

  const fetchTestimonials = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'testimonials'));
      const snap = await getDocs(q);
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Testimonial));
      data.sort((a, b) => b.createdAt - a.createdAt);
      setTestimonials(data);
    } catch (e) {
      console.error(e);
      alert('Failed to fetch testimonials');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: 'approved' | 'rejected') => {
    try {
      await updateDoc(doc(db, 'testimonials', id), { status: newStatus });
      setTestimonials(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));
    } catch (e) {
      console.error(e);
      alert('Failed to update status');
    }
  };

  const confirmDelete = (id: string) => {
    setTestimonialToDelete(id);
    setIsConfirmOpen(true);
  };

  const handleDelete = async () => {
    if (!testimonialToDelete) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'testimonials', testimonialToDelete));
      setTestimonials(prev => prev.filter(t => t.id !== testimonialToDelete));
      setIsConfirmOpen(false);
      setTestimonialToDelete(null);
    } catch (e) {
      console.error(e);
      alert('Failed to delete testimonial');
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-neutral-500 font-medium">Loading testimonials...</div>;
  }

  return (
    <div className="p-4 sm:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Manage Testimonials</h1>
          <p className="text-sm text-neutral-500 mt-1">Review, approve, and manage guest testimonials.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-50 border-b border-neutral-200">
              <tr>
                <th className="px-6 py-4 font-bold text-neutral-700">Guest</th>
                <th className="px-6 py-4 font-bold text-neutral-700">Rating</th>
                <th className="px-6 py-4 font-bold text-neutral-700 max-w-xs">Content</th>
                <th className="px-6 py-4 font-bold text-neutral-700">Status</th>
                <th className="px-6 py-4 font-bold text-neutral-700 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {testimonials.map(test => (
                <tr key={test.id} className="hover:bg-neutral-50/50 transition">
                  <td className="px-6 py-4">
                    <p className="font-bold text-neutral-900">{test.name}</p>
                    <p className="text-xs text-neutral-500">{new Date(test.createdAt).toLocaleDateString()}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex text-yellow-400">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={`w-4 h-4 ${i < test.rating ? 'fill-current' : 'text-neutral-200'}`} />
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 max-w-xs">
                    <p className="truncate text-neutral-700">{test.content}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                      test.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                      test.status === 'rejected' ? 'bg-red-100 text-red-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {test.status.charAt(0).toUpperCase() + test.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {test.status !== 'approved' && (
                        <button
                          onClick={() => handleUpdateStatus(test.id, 'approved')}
                          className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition tooltip-trigger relative"
                          title="Approve"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}
                      {test.status !== 'rejected' && (
                        <button
                          onClick={() => handleUpdateStatus(test.id, 'rejected')}
                          className="p-1.5 text-neutral-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                          title="Reject"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => confirmDelete(test.id)}
                        className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {testimonials.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-neutral-500 font-medium bg-neutral-50/50">
                    No testimonials found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmModal
        isOpen={isConfirmOpen}
        title="Delete Testimonial"
        message="Are you sure you want to delete this testimonial? This action cannot be undone."
        confirmText="Delete Testimonial"
        onConfirm={handleDelete}
        onClose={() => {
          setIsConfirmOpen(false);
          setTestimonialToDelete(null);
        }}
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
}
