import React, { useState } from 'react';
import { Booking, Room, RoomCategory } from '../../types';
import { db } from '../../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { X, User, Phone, Mail, Award, History, Building2, Calendar, FileText, Send, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';

interface GuestProfileModalProps {
  guestPhone: string;
  guestEmail: string;
  guestName: string;
  bookings: Booking[];
  rooms: Room[];
  categories: Record<string, RoomCategory>;
  onClose: () => void;
  onRefresh: () => void;
}

export default function GuestProfileModal({
  guestPhone,
  guestEmail,
  guestName,
  bookings,
  rooms,
  categories,
  onClose,
  onRefresh
}: GuestProfileModalProps) {
  useBodyScrollLock(true);
  const { userData } = useAuth();

  // Find all bookings matching phone or email
  const guestBookings = bookings.filter(b => 
    (b.guestDetails.phone && b.guestDetails.phone.trim() === guestPhone.trim()) ||
    (b.guestDetails.email && b.guestDetails.email.toLowerCase().trim() === guestEmail.toLowerCase().trim())
  ).sort((a, b) => b.checkIn - a.checkIn);

  const primaryGuest = guestBookings[0]?.guestDetails || { firstName: guestName, lastName: '', email: guestEmail, phone: guestPhone };
  const isVip = guestBookings.some(b => b.isVip);

  // Total statistics
  const completedStays = guestBookings.filter(b => b.status === 'Checked Out').length;
  const activeStays = guestBookings.filter(b => ['Approved', 'Checked In'].includes(b.status)).length;
  const totalSpent = guestBookings
    .filter(b => !['Cancelled', 'Rejected'].includes(b.status))
    .reduce((acc, b) => acc + (b.totalAmount || 0), 0);

  // Distinct past rooms occupied
  const pastRoomIds = Array.from(new Set(guestBookings.map(b => b.roomId).filter(Boolean)));
  const pastRooms = rooms.filter(r => pastRoomIds.includes(r.id));

  // Staff note adding
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  const handleAddNoteToGuestBookings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() || guestBookings.length === 0) return;

    setAddingNote(true);
    try {
      // Attach staff note to the most recent booking
      const latestBooking = guestBookings[0];
      const noteObj = {
        id: `note_${Date.now()}`,
        userId: userData?.uid || 'staff',
        userName: userData?.name || 'Reception Staff',
        content: newNote.trim(),
        createdAt: Date.now()
      };

      const updatedNotes = [...(latestBooking.notes || []), noteObj];
      const updatedTimeline = [
        ...(latestBooking.timeline || []),
        {
          status: 'Note Added' as const,
          timestamp: Date.now(),
          userId: userData?.uid,
          userName: userData?.name || 'Reception Staff',
          notes: `Staff note added: ${newNote.trim()}`
        }
      ];

      await updateDoc(doc(db, 'bookings', latestBooking.id), {
        notes: updatedNotes,
        timeline: updatedTimeline,
        updatedAt: Date.now()
      });

      setNewNote('');
      onRefresh();
    } catch (err) {
      console.error("Failed to add guest staff note:", err);
    } finally {
      setAddingNote(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto overscroll-contain">
      <div className="bg-white rounded-2xl w-full max-w-3xl my-8 overflow-hidden shadow-2xl overscroll-contain">
        {/* Header */}
        <div className="bg-neutral-900 text-white p-6 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-lg font-bold">
              {primaryGuest.firstName.charAt(0)}{primaryGuest.lastName.charAt(0) || ''}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold">{primaryGuest.firstName} {primaryGuest.lastName}</h2>
                {isVip && (
                  <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                    <Award className="w-3 h-3" /> VIP Guest
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-400">Guest History & Operational Profile</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-neutral-400 hover:text-white rounded-full">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-8">
          {/* Contact Details & KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200">
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">Contact Info</p>
              <div className="space-y-1.5 text-xs text-neutral-800">
                <p className="flex items-center gap-2 font-medium">
                  <Phone className="w-3.5 h-3.5 text-neutral-400" /> {primaryGuest.phone || 'No phone'}
                </p>
                <p className="flex items-center gap-2 truncate font-medium">
                  <Mail className="w-3.5 h-3.5 text-neutral-400" /> {primaryGuest.email || 'No email'}
                </p>
              </div>
            </div>

            <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200">
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">Total Stays</p>
              <p className="text-2xl font-bold text-neutral-900">{completedStays} <span className="text-xs font-normal text-neutral-500">completed</span></p>
              {activeStays > 0 && <p className="text-xs text-blue-600 font-medium mt-1">{activeStays} active / upcoming</p>}
            </div>

            <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200">
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">Total Revenue</p>
              <p className="text-2xl font-bold text-green-700">{totalSpent.toLocaleString()} ETB</p>
            </div>
          </div>

          {/* Past Rooms Occupied */}
          {pastRooms.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-neutral-900 mb-2 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-neutral-500" /> Favorite / Past Rooms Stayed
              </h3>
              <div className="flex flex-wrap gap-2">
                {pastRooms.map(r => (
                  <span key={r.id} className="px-3 py-1.5 bg-neutral-100 text-neutral-800 border border-neutral-200 rounded-lg text-xs font-medium">
                    Room {r.roomNumber} ({categories[r.categoryId]?.name || 'Standard'})
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Visit History / Reservation List */}
          <div>
            <h3 className="text-sm font-bold text-neutral-900 mb-3 flex items-center gap-2">
              <History className="w-4 h-4 text-neutral-500" /> Visit & Reservation History ({guestBookings.length})
            </h3>
            {guestBookings.length === 0 ? (
              <p className="text-xs text-neutral-500 italic">No reservation records found for this guest.</p>
            ) : (
              <div className="border border-neutral-200 rounded-xl overflow-hidden divide-y">
                {guestBookings.map(b => (
                  <div key={b.id} className="p-4 hover:bg-neutral-50 transition-colors flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-neutral-900">{b.reservationCode}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          ['Checked In', 'Approved'].includes(b.status) ? 'bg-green-100 text-green-800' :
                          b.status === 'Checked Out' ? 'bg-neutral-100 text-neutral-800' :
                          ['Cancelled', 'Rejected'].includes(b.status) ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800'
                        }`}>
                          {b.status}
                        </span>
                        {b.bookingSource && (
                          <span className="bg-neutral-200 text-neutral-700 px-2 py-0.5 rounded text-[10px]">
                            {b.bookingSource}
                          </span>
                        )}
                      </div>
                      <p className="text-neutral-600 mt-1 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                        {format(b.checkIn, 'MMM d, yyyy')} - {format(b.checkOut, 'MMM d, yyyy')}
                        <span className="font-medium text-neutral-900 ml-2">• {categories[b.categoryId]?.name || 'Room'}</span>
                        {b.roomId && <span className="font-bold text-blue-600 ml-1">(Room {rooms.find(r => r.id === b.roomId)?.roomNumber})</span>}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-neutral-900 text-sm">{b.totalAmount.toLocaleString()} ETB</p>
                      <p className="text-neutral-500">{b.paymentMethod}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Internal Staff Notes */}
          <div className="bg-amber-50/50 border border-amber-200 p-4 rounded-xl">
            <h3 className="text-sm font-bold text-amber-900 mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-600" /> Internal Staff Notes (Private to Reception)
            </h3>
            
            <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
              {guestBookings.flatMap(b => b.notes || []).length === 0 ? (
                <p className="text-xs text-amber-700 italic">No internal staff notes recorded for this guest.</p>
              ) : (
                guestBookings.flatMap(b => b.notes || []).sort((a,b) => b.createdAt - a.createdAt).map(n => (
                  <div key={n.id} className="bg-white p-3 rounded-lg border border-amber-200 text-xs space-y-1">
                    <div className="flex justify-between text-[11px] font-bold text-amber-900">
                      <span>{n.userName}</span>
                      <span className="text-neutral-400 font-normal">{format(n.createdAt, 'MMM d, yyyy HH:mm')}</span>
                    </div>
                    <p className="text-neutral-800">{n.content}</p>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleAddNoteToGuestBookings} className="flex gap-2">
              <input
                type="text"
                placeholder="Add private staff note about guest preferences, luggage, etc..."
                value={newNote}
                onChange={e => setNewNote(e.target.value)}
                className="flex-1 text-xs p-2.5 border border-amber-300 rounded-lg bg-white focus:ring-amber-500 focus:border-amber-500"
              />
              <button
                type="submit"
                disabled={addingNote || !newNote.trim()}
                className="px-4 py-2.5 bg-amber-800 hover:bg-amber-900 text-white rounded-lg text-xs font-medium disabled:opacity-50 flex items-center gap-1.5 shrink-0"
              >
                {addingNote ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                Add Note
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
