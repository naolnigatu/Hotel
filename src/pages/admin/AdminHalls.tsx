import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  onSnapshot, 
  doc, 
  setDoc, 
  deleteDoc, 
  updateDoc, 
  orderBy,
  getDocs
} from 'firebase/firestore';
import { db } from '../../firebase';
import { Hall, HallBookingRequest } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { logAuditAction } from '../../lib/auditLogger';
import { sendNotification } from '../../lib/notificationService';
import CopyButton from '../../components/common/CopyButton';
import MediaManager from '../../components/admin/MediaManager';
import ConfirmModal from '../../components/common/ConfirmModal';
import { 
  Loader2, 
  Plus, 
  Pencil, 
  Trash2, 
  X, 
  Save, 
  Check, 
  Calendar, 
  Users, 
  Mail, 
  Phone, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Building2, 
  AlertCircle, 
  Eye, 
  Filter, 
  MessageSquare,
  Sparkles,
  DollarSign
} from 'lucide-react';
import { format } from 'date-fns';

export default function AdminHalls() {
  const { userData, currentUser } = useAuth();

  const [activeTab, setActiveTab] = useState<'requests' | 'venues'>('requests');
  const [halls, setHalls] = useState<Hall[]>([]);
  const [requests, setRequests] = useState<HallBookingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Venue editing state
  const [editingHall, setEditingHall] = useState<Hall | null>(null);
  const [savingHall, setSavingHall] = useState(false);

  // Requests filtering & search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Pending' | 'Approved' | 'Confirmed' | 'Rejected' | 'Cancelled'>('ALL');
  
  // Request detail & action modals
  const [selectedRequest, setSelectedRequest] = useState<HallBookingRequest | null>(null);
  const [actionModal, setActionModal] = useState<{
    isOpen: boolean;
    type: 'approve' | 'reject' | 'confirm';
    request: HallBookingRequest | null;
    notes: string;
  }>({
    isOpen: false,
    type: 'approve',
    request: null,
    notes: ''
  });
  const [actionLoading, setActionLoading] = useState(false);
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [deletingHall, setDeletingHall] = useState<Hall | null>(null);
  const [deletingRequest, setDeletingRequest] = useState<HallBookingRequest | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Subscribe to Halls & Hall Booking Requests
  useEffect(() => {
    // 1. Fetch Halls
    const unsubHalls = onSnapshot(collection(db, 'halls'), (snapshot) => {
      const list = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Hall));
      setHalls(list);
    });

    // 2. Fetch Hall Requests
    const unsubRequests = onSnapshot(collection(db, 'hall_requests'), (snapshot) => {
      const list = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as HallBookingRequest));
      // Sort newest first
      list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setRequests(list);
      setLoading(false);
    }, (error) => {
      console.error('Error listening to hall requests:', error);
      setLoading(false);
    });

    return () => {
      unsubHalls();
      unsubRequests();
    };
  }, []);

  const pendingRequestsCount = requests.filter(r => r.status === 'Pending').length;

  const handleSaveHall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingHall) return;
    setSavingHall(true);
    
    try {
      const isNew = !editingHall.id;
      const id = isNew ? `hall_${Date.now()}` : editingHall.id;
      const hallToSave = { 
        ...editingHall, 
        id,
        price: Number(editingHall.price) || 0,
        capacity: Number(editingHall.capacity) || 0,
        status: editingHall.status ?? true
      };
      
      await setDoc(doc(db, 'halls', id), hallToSave);
      await logAuditAction(
        currentUser?.uid || 'admin',
        userData?.name || 'Manager',
        userData?.role || 'admin',
        `${isNew ? 'Created' : 'Updated'} Hall Space: ${editingHall.name}`,
        'Halls'
      );
      setEditingHall(null);
      setActionNotice({ type: 'success', text: `Hall "${hallToSave.name}" saved successfully.` });
      setTimeout(() => setActionNotice(null), 4000);
    } catch (error: any) {
      console.error("Error saving hall:", error);
      setActionNotice({ type: 'error', text: `Failed to save hall: ${error.message}` });
    } finally {
      setSavingHall(false);
    }
  };

  const handleDeleteHall = (hall: Hall) => {
    setDeletingHall(hall);
  };

  const handleConfirmDeleteHall = async () => {
    if (!deletingHall) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'halls', deletingHall.id));
      await logAuditAction(
        currentUser?.uid || 'admin',
        userData?.name || 'Manager',
        userData?.role || 'admin',
        `Deleted Hall Space: ${deletingHall.name || deletingHall.id}`,
        'Halls'
      );
      setActionNotice({ type: 'success', text: 'Hall deleted.' });
      setTimeout(() => setActionNotice(null), 3000);
      setDeletingHall(null);
    } catch (error: any) {
      console.error("Error deleting hall:", error);
      setActionNotice({ type: 'error', text: `Failed to delete: ${error.message}` });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUpdateStatus = async (
    request: HallBookingRequest, 
    newStatus: 'Approved' | 'Rejected' | 'Confirmed' | 'Cancelled', 
    adminNote?: string
  ) => {
    setActionLoading(true);
    try {
      const updateData: Partial<HallBookingRequest> = {
        status: newStatus,
        updatedAt: Date.now()
      };
      if (adminNote !== undefined) {
        updateData.adminNotes = adminNote;
      }

      // Update in hall_requests
      await updateDoc(doc(db, 'hall_requests', request.id), updateData);

      // Also sync to bookings collection (if doc exists)
      try {
        const bookingRef = doc(db, 'bookings', request.id);
        await updateDoc(bookingRef, {
          status: newStatus === 'Confirmed' ? 'Approved' : newStatus,
          updatedAt: Date.now()
        });
      } catch (e) {
        // Document might only exist in hall_requests if created manually
      }

      // Send in-app notification to guest if guestId exists
      if (request.guestId) {
        await sendNotification({
          recipientUid: request.guestId,
          title: `Hall Booking ${newStatus}: ${request.hallName}`,
          message: `Your hall booking request ${request.reservationCode} for ${request.hallName} on ${request.startDate} has been ${newStatus.toLowerCase()}.${adminNote ? ` Note: ${adminNote}` : ''}`,
          type: 'booking',
          relatedEntityId: request.id,
          relatedEntityType: 'booking',
          targetRoute: `/track-reservation?code=${request.reservationCode}`,
          priority: 'Important',
          eventId: `hall_status_${request.reservationCode}_${newStatus}`
        });
      }

      await logAuditAction(
        currentUser?.uid || 'admin',
        userData?.name || 'Manager',
        userData?.role || 'admin',
        `Updated Hall Request #${request.reservationCode} status to ${newStatus}`,
        'Halls'
      );

      setActionNotice({ 
        type: 'success', 
        text: `Request #${request.reservationCode} has been marked as ${newStatus}.` 
      });
      setTimeout(() => setActionNotice(null), 4000);

      setActionModal({ isOpen: false, type: 'approve', request: null, notes: '' });
      if (selectedRequest?.id === request.id) {
        setSelectedRequest({ ...request, status: newStatus, adminNotes: adminNote || request.adminNotes });
      }
    } catch (err: any) {
      console.error('Error updating hall request status:', err);
      setActionNotice({ type: 'error', text: `Failed to update status: ${err.message}` });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteRequest = (req: HallBookingRequest) => {
    setDeletingRequest(req);
  };

  const handleConfirmDeleteRequest = async () => {
    if (!deletingRequest) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'hall_requests', deletingRequest.id));
      try {
        await deleteDoc(doc(db, 'bookings', deletingRequest.id));
      } catch (e) {}
      
      setActionNotice({ type: 'success', text: `Request #${deletingRequest.reservationCode} deleted.` });
      setTimeout(() => setActionNotice(null), 3000);
      if (selectedRequest?.id === deletingRequest.id) setSelectedRequest(null);
      setDeletingRequest(null);
    } catch (err: any) {
      console.error('Error deleting hall request:', err);
      setActionNotice({ type: 'error', text: `Failed to delete request: ${err.message}` });
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter requests
  const filteredRequests = requests.filter((req) => {
    if (statusFilter !== 'ALL' && req.status !== statusFilter) return false;

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const codeMatch = req.reservationCode?.toLowerCase().includes(q);
      const nameMatch = req.organizerName?.toLowerCase().includes(q);
      const emailMatch = req.email?.toLowerCase().includes(q);
      const phoneMatch = req.phone?.toLowerCase().includes(q);
      const hallMatch = req.hallName?.toLowerCase().includes(q);
      const eventMatch = req.eventType?.toLowerCase().includes(q);
      return Boolean(codeMatch || nameMatch || emailMatch || phoneMatch || hallMatch || eventMatch);
    }

    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Approved':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'Confirmed':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'Pending':
        return 'bg-amber-100 text-amber-800 border-amber-300 animate-pulse';
      case 'Rejected':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      case 'Cancelled':
        return 'bg-neutral-100 text-neutral-600 border-neutral-300';
      default:
        return 'bg-neutral-100 text-neutral-700 border-neutral-200';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      
      {/* Alert Notice Banner */}
      {actionNotice && (
        <div className={`p-4 rounded-xl text-xs font-semibold flex items-center justify-between shadow-xs ${
          actionNotice.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
        }`}>
          <span>{actionNotice.text}</span>
          <button onClick={() => setActionNotice(null)} className="p-1 hover:opacity-75">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight">Halls & Events Management</h1>
          <p className="text-xs sm:text-sm text-neutral-500 mt-0.5">
            Review guest hall reservation requests, manage event spaces, equipment, and pricing.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Main Tab Switcher */}
          <div className="bg-neutral-100 p-1 rounded-xl flex items-center gap-1 border border-neutral-200">
            <button
              onClick={() => setActiveTab('requests')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition flex items-center gap-2 ${
                activeTab === 'requests'
                  ? 'bg-white text-neutral-900 shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Booking Requests</span>
              {pendingRequestsCount > 0 && (
                <span className="px-1.5 py-0.2 bg-rose-600 text-white rounded-full text-[10px] font-black">
                  {pendingRequestsCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('venues')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition flex items-center gap-2 ${
                activeTab === 'venues'
                  ? 'bg-white text-neutral-900 shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Venues & Spaces ({halls.length})</span>
            </button>
          </div>

          {activeTab === 'venues' && (
            <button 
              onClick={() => setEditingHall({ id: '', name: '', capacity: 50, description: '', price: 5000, equipment: ['Projector', 'PA System'], imageUrls: [], status: true })}
              className="flex items-center gap-1.5 px-4 py-2 bg-neutral-900 text-white text-xs font-bold rounded-xl hover:bg-neutral-800 transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" /> Add Venue
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: BOOKING REQUESTS */}
      {/* ========================================================================= */}
      {activeTab === 'requests' && (
        <div className="space-y-6">
          
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-xs">
              <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block">Pending Approval</span>
              <div className="flex items-center justify-between mt-1">
                <span className="text-2xl font-black text-amber-600">{pendingRequestsCount}</span>
                <Clock className="w-5 h-5 text-amber-400" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-xs">
              <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block">Approved Events</span>
              <div className="flex items-center justify-between mt-1">
                <span className="text-2xl font-black text-emerald-600">
                  {requests.filter(r => r.status === 'Approved' || r.status === 'Confirmed').length}
                </span>
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-xs">
              <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block">Total Inquiries</span>
              <div className="flex items-center justify-between mt-1">
                <span className="text-2xl font-black text-neutral-900">{requests.length}</span>
                <Calendar className="w-5 h-5 text-neutral-400" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-xs">
              <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block">Est. Revenue</span>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xl font-black text-neutral-900">
                  {requests
                    .filter(r => r.status === 'Approved' || r.status === 'Confirmed')
                    .reduce((sum, r) => sum + (r.totalEstimatedPrice || 0), 0)
                    .toLocaleString()} <span className="text-xs text-neutral-500 font-normal">ETB</span>
                </span>
                <DollarSign className="w-5 h-5 text-emerald-600" />
              </div>
            </div>
          </div>

          {/* Search & Status Filter Controls */}
          <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Search by code, organizer name, email, phone, hall..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-xs border border-neutral-300 rounded-xl focus:ring-2 focus:ring-neutral-900 focus:border-neutral-900"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-2.5 text-neutral-400 hover:text-neutral-700"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Status Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
              {(['ALL', 'Pending', 'Approved', 'Confirmed', 'Rejected', 'Cancelled'] as const).map((st) => {
                const isCurrent = statusFilter === st;
                const count = st === 'ALL' ? requests.length : requests.filter(r => r.status === st).length;
                return (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-1.5 ${
                      isCurrent
                        ? 'bg-neutral-900 text-white shadow-xs'
                        : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-600'
                    }`}
                  >
                    <span>{st === 'ALL' ? 'All Requests' : st}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      isCurrent ? 'bg-neutral-700 text-white' : 'bg-neutral-200 text-neutral-700'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Requests List */}
          {filteredRequests.length === 0 ? (
            <div className="bg-white rounded-2xl border border-neutral-200 p-12 text-center text-neutral-500">
              <Calendar className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-neutral-800 mb-1">No Hall Requests Found</h3>
              <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                {searchTerm || statusFilter !== 'ALL'
                  ? 'Try clearing your search query or switching filters.'
                  : 'New booking requests submitted by guests from the public site will appear here.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRequests.map((req) => (
                <div
                  key={req.id}
                  className={`bg-white rounded-2xl border transition-all duration-200 p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-5 ${
                    req.status === 'Pending' 
                      ? 'border-amber-300 bg-amber-50/20' 
                      : 'border-neutral-200 hover:border-neutral-300'
                  }`}
                >
                  {/* Main Info */}
                  <div className="space-y-3 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      {/* Reservation Code with Copy Button */}
                      <div className="inline-flex items-center gap-1.5 bg-neutral-100 px-2.5 py-1 rounded-lg border border-neutral-200">
                        <span className="text-[10px] font-bold text-neutral-500 uppercase">Code:</span>
                        <span className="font-mono font-black text-xs text-neutral-900">{req.reservationCode}</span>
                        <CopyButton
                          text={req.reservationCode}
                          size="xs"
                          variant="ghost"
                          tooltip="Copy Hall Reservation Code"
                        />
                      </div>

                      {/* Status Pill */}
                      <span className={`px-2.5 py-0.5 rounded-full border text-[11px] font-bold ${getStatusBadge(req.status)}`}>
                        {req.status}
                      </span>

                      {/* Date & Time */}
                      <span className="text-xs font-bold text-neutral-800 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-neutral-500" /> {req.startDate}
                        {req.timeSlot && <span className="text-neutral-500 font-normal">({req.timeSlot})</span>}
                      </span>

                      {/* Created relative time */}
                      <span className="text-[11px] text-neutral-400">
                        Received {format(req.createdAt, 'MMM d, yyyy HH:mm')}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                      {/* Venue & Event */}
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">Venue & Event</span>
                        <p className="font-bold text-neutral-900 text-sm">{req.hallName}</p>
                        <p className="text-neutral-600">{req.eventType} • <strong className="text-neutral-800">{req.numberOfGuests} Guests</strong></p>
                      </div>

                      {/* Organizer */}
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">Organizer Details</span>
                        <p className="font-bold text-neutral-900">{req.organizerName}</p>
                        <div className="flex flex-col gap-0.5 mt-0.5 text-neutral-600">
                          <a href={`mailto:${req.email}`} className="text-neutral-700 hover:text-neutral-900 hover:underline flex items-center gap-1">
                            <Mail className="w-3 h-3 text-neutral-400" /> {req.email}
                          </a>
                          <a href={`tel:${req.phone}`} className="text-neutral-700 hover:text-neutral-900 hover:underline flex items-center gap-1">
                            <Phone className="w-3 h-3 text-neutral-400" /> {req.phone}
                          </a>
                        </div>
                      </div>

                      {/* Financials & Message */}
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">Estimated Quote</span>
                        <p className="font-black text-emerald-700 text-sm">
                          {req.totalEstimatedPrice?.toLocaleString()} ETB
                        </p>
                        {req.message && (
                          <p className="text-neutral-600 line-clamp-1 italic mt-0.5" title={req.message}>
                            "{req.message}"
                          </p>
                        )}
                        {req.adminNotes && (
                          <p className="text-amber-700 text-[11px] font-medium mt-0.5">
                            Manager Note: {req.adminNotes}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Equipment Tags */}
                    {req.requestedEquipment && req.requestedEquipment.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-[10px] font-bold text-neutral-400 uppercase mr-1">Equipment:</span>
                        {req.requestedEquipment.map((eq, i) => (
                          <span key={i} className="text-[10px] bg-neutral-100 text-neutral-700 px-2 py-0.5 rounded font-medium border border-neutral-200">
                            {eq}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions Right Section */}
                  <div className="flex flex-wrap lg:flex-col items-center lg:items-end justify-end gap-2 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-neutral-100">
                    {/* Quick Approve / Reject for Pending */}
                    {req.status === 'Pending' && (
                      <div className="flex items-center gap-2 w-full lg:w-auto">
                        <button
                          onClick={() => setActionModal({ isOpen: true, type: 'approve', request: req, notes: '' })}
                          className="flex-1 lg:flex-initial px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" /> Approve Request
                        </button>
                        <button
                          onClick={() => setActionModal({ isOpen: true, type: 'reject', request: req, notes: '' })}
                          className="flex-1 lg:flex-initial px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border border-rose-200 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" /> Reject
                        </button>
                      </div>
                    )}

                    {/* Confirmed / Payment toggle for Approved */}
                    {req.status === 'Approved' && (
                      <button
                        onClick={() => handleUpdateStatus(req, 'Confirmed')}
                        className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Mark Confirmed & Paid
                      </button>
                    )}

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setSelectedRequest(req)}
                        className="p-2 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg text-xs font-medium transition flex items-center gap-1"
                        title="View Full Details"
                      >
                        <Eye className="w-3.5 h-3.5" /> Details
                      </button>

                      <button
                        onClick={() => handleDeleteRequest(req)}
                        className="p-2 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                        title="Delete Request"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: VENUES & HALL SPACES (CRUD) */}
      {/* ========================================================================= */}
      {activeTab === 'venues' && (
        <div className="space-y-6">
          {editingHall ? (
            <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-bold text-neutral-900">
                    {editingHall.id ? `Edit Hall: ${editingHall.name}` : 'New Venue / Event Space'}
                  </h2>
                  <p className="text-xs text-neutral-500">Configure space capacity, equipment, daily pricing, and photos.</p>
                </div>
                <button onClick={() => setEditingHall(null)} className="p-2 text-neutral-500 hover:bg-neutral-100 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveHall} className="space-y-6">
                <div className="grid md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 mb-1.5">Hall Name <span className="text-rose-500">*</span></label>
                    <input 
                      type="text" required
                      value={editingHall.name}
                      onChange={e => setEditingHall({...editingHall, name: e.target.value})}
                      placeholder="e.g. Grand Ballroom, Executive Boardroom"
                      className="w-full border-neutral-300 rounded-xl p-2.5 text-xs border focus:ring-neutral-900 focus:border-neutral-900" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 mb-1.5">Price per day (ETB) <span className="text-rose-500">*</span></label>
                    <input 
                      type="number" required min="0" step="1"
                      value={editingHall.price || ''}
                      onChange={e => setEditingHall({...editingHall, price: parseFloat(e.target.value) || 0})}
                      placeholder="e.g. 15000"
                      className="w-full border-neutral-300 rounded-xl p-2.5 text-xs border focus:ring-neutral-900 focus:border-neutral-900" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 mb-1.5">Capacity (Maximum Guests) <span className="text-rose-500">*</span></label>
                    <input 
                      type="number" required min="1"
                      value={editingHall.capacity || ''}
                      onChange={e => setEditingHall({...editingHall, capacity: parseInt(e.target.value) || 0})}
                      placeholder="e.g. 150"
                      className="w-full border-neutral-300 rounded-xl p-2.5 text-xs border focus:ring-neutral-900 focus:border-neutral-900" 
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-neutral-700">
                    <input 
                      type="checkbox" 
                      checked={editingHall.status}
                      onChange={e => setEditingHall({...editingHall, status: e.target.checked})}
                      className="w-4 h-4 text-neutral-900 border-neutral-300 rounded focus:ring-neutral-900"
                    />
                    <span>Available & Active for Guest Bookings</span>
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1.5">Description <span className="text-rose-500">*</span></label>
                  <textarea 
                    required rows={3}
                    value={editingHall.description}
                    onChange={e => setEditingHall({...editingHall, description: e.target.value})}
                    placeholder="Describe venue features, lighting, seating style, and ideal events..."
                    className="w-full border-neutral-300 rounded-xl p-2.5 text-xs border focus:ring-neutral-900 focus:border-neutral-900" 
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1.5">
                    Available Equipment & Amenities (comma separated)
                  </label>
                  <input 
                    type="text"
                    value={editingHall.equipment.join(', ')}
                    onChange={e => setEditingHall({...editingHall, equipment: e.target.value.split(',').map(s => s.trim()).filter(Boolean)})}
                    placeholder="Projector, PA System, Wireless Microphones, Flipchart, Stage Setup, High-speed Wi-Fi"
                    className="w-full border-neutral-300 rounded-xl p-2.5 text-xs border focus:ring-neutral-900 focus:border-neutral-900" 
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-2">Venue Images</label>
                  <div className="flex gap-4 overflow-x-auto pb-4">
                    {editingHall.imageUrls.map((url, i) => (
                      <div key={i} className="relative shrink-0 w-48 h-32 rounded-xl overflow-hidden border border-neutral-200 shadow-xs">
                        <img src={url} alt="Hall" className="w-full h-full object-cover" />
                        <button 
                          type="button"
                          onClick={() => setEditingHall({...editingHall, imageUrls: editingHall.imageUrls.filter((_, idx) => idx !== i)})}
                          className="absolute top-1.5 right-1.5 p-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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

                <div className="flex justify-end gap-3 pt-4 border-t border-neutral-100">
                  <button
                    type="button"
                    onClick={() => setEditingHall(null)}
                    className="px-5 py-2.5 text-neutral-600 hover:text-neutral-900 font-bold text-xs"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" disabled={savingHall}
                    className="flex items-center gap-2 px-6 py-2.5 bg-neutral-900 text-white rounded-xl text-xs font-bold hover:bg-neutral-800 transition-colors disabled:opacity-70 shadow-sm"
                  >
                    {savingHall ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {savingHall ? 'Saving...' : 'Save Venue'}
                  </button>
                </div>
              </form>
            </div>
          ) : null}

          {/* Venues Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {halls.map(hall => (
              <div key={hall.id} className="bg-white border border-neutral-200 rounded-2xl overflow-hidden flex flex-col shadow-xs hover:border-neutral-300 transition">
                <div className="h-48 bg-neutral-100 relative">
                  {hall.imageUrls?.[0] ? (
                    <img src={hall.imageUrls[0]} alt={hall.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-neutral-400 text-xs font-medium">No Image</div>
                  )}
                  <span className={`absolute top-3 right-3 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    hall.status ? 'bg-emerald-500 text-white' : 'bg-neutral-600 text-white'
                  }`}>
                    {hall.status ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-base text-neutral-900">{hall.name}</h3>
                    <span className="font-extrabold text-neutral-900 text-sm">{hall.price?.toLocaleString()} ETB<span className="text-[10px] text-neutral-500 font-normal">/day</span></span>
                  </div>
                  <p className="text-xs text-neutral-600 mb-2 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-neutral-400" /> Max Capacity: <strong>{hall.capacity} guests</strong>
                  </p>
                  <p className="text-xs text-neutral-600 mb-4 line-clamp-2 flex-1">{hall.description}</p>
                  
                  {hall.equipment && hall.equipment.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-4">
                      {hall.equipment.slice(0, 3).map((eq, idx) => (
                        <span key={idx} className="text-[10px] bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded">
                          {eq}
                        </span>
                      ))}
                      {hall.equipment.length > 3 && (
                        <span className="text-[10px] text-neutral-400 px-1 py-0.5">
                          +{hall.equipment.length - 3} more
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2 justify-end pt-3 border-t border-neutral-100">
                    <button 
                      onClick={() => setEditingHall(hall)}
                      className="p-2 text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold"
                    >
                      <Pencil className="w-4 h-4" /> Edit
                    </button>
                    <button 
                      onClick={() => handleDeleteHall(hall)}
                      className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" /> Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ACTION CONFIRMATION MODAL (Approve / Reject) */}
      {/* ========================================================================= */}
      {actionModal.isOpen && actionModal.request && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-xl ${
                  actionModal.type === 'approve' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                }`}>
                  {actionModal.type === 'approve' ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-neutral-900">
                    {actionModal.type === 'approve' ? 'Approve Hall Reservation' : 'Reject Hall Reservation'}
                  </h3>
                  <p className="text-xs text-neutral-500 font-mono">
                    Code: {actionModal.request.reservationCode}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActionModal({ isOpen: false, type: 'approve', request: null, notes: '' })}
                className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-200 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-neutral-500">Venue:</span>
                <span className="font-bold text-neutral-900">{actionModal.request.hallName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Date & Slot:</span>
                <span className="font-bold text-neutral-900">{actionModal.request.startDate} ({actionModal.request.timeSlot || 'Full Day'})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Organizer:</span>
                <span className="font-semibold text-neutral-900">{actionModal.request.organizerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Est. Total:</span>
                <span className="font-bold text-emerald-700">{actionModal.request.totalEstimatedPrice?.toLocaleString()} ETB</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">
                {actionModal.type === 'approve' ? 'Approval Notes / Instructions (Optional)' : 'Reason for Rejection <span className="text-rose-500">*</span>'}
              </label>
              <textarea
                rows={3}
                placeholder={
                  actionModal.type === 'approve'
                    ? 'e.g. Schedule approved. Please visit reception for advance deposit.'
                    : 'e.g. Hall is already booked for another event on this date.'
                }
                value={actionModal.notes}
                onChange={(e) => setActionModal(prev => ({ ...prev, notes: e.target.value }))}
                className="w-full p-2.5 text-xs border border-neutral-300 rounded-xl focus:ring-2 focus:ring-neutral-900 focus:border-neutral-900"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setActionModal({ isOpen: false, type: 'approve', request: null, notes: '' })}
                className="px-4 py-2 text-xs font-bold text-neutral-600 hover:text-neutral-900"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading || (actionModal.type === 'reject' && !actionModal.notes.trim())}
                onClick={() => handleUpdateStatus(
                  actionModal.request!, 
                  actionModal.type === 'approve' ? 'Approved' : 'Rejected', 
                  actionModal.notes.trim()
                )}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white transition flex items-center gap-2 shadow-xs disabled:opacity-50 cursor-pointer ${
                  actionModal.type === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {actionModal.type === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* REQUEST DETAILS MODAL */}
      {/* ========================================================================= */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full my-8 shadow-2xl border border-neutral-200 overflow-hidden space-y-0 animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="bg-neutral-900 text-white p-6 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2.5 mb-1">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    selectedRequest.status === 'Approved' ? 'bg-emerald-500 text-white' :
                    selectedRequest.status === 'Confirmed' ? 'bg-blue-500 text-white' :
                    selectedRequest.status === 'Pending' ? 'bg-amber-500 text-white' : 'bg-rose-500 text-white'
                  }`}>
                    {selectedRequest.status}
                  </span>
                  <span className="text-xs text-neutral-400">•</span>
                  <span className="text-xs text-neutral-400 font-mono">ID: {selectedRequest.id}</span>
                </div>
                <h3 className="text-xl font-bold font-mono tracking-wide">
                  Reservation {selectedRequest.reservationCode}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <CopyButton
                  text={selectedRequest.reservationCode}
                  label="Copy Code"
                  showText={true}
                  variant="dark"
                  size="sm"
                />
                <button
                  onClick={() => setSelectedRequest(null)}
                  className="p-2 text-neutral-400 hover:text-white rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5 text-xs max-h-[70vh] overflow-y-auto">
              
              {/* Event & Venue Box */}
              <div className="bg-neutral-50 p-4 rounded-2xl border border-neutral-200 space-y-2">
                <h4 className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Event Information</h4>
                <div className="grid grid-cols-2 gap-3 text-neutral-700">
                  <div>
                    <span className="text-neutral-400 block text-[10px]">Venue</span>
                    <strong className="text-neutral-900 text-sm">{selectedRequest.hallName}</strong>
                  </div>
                  <div>
                    <span className="text-neutral-400 block text-[10px]">Event Type</span>
                    <strong className="text-neutral-900">{selectedRequest.eventType}</strong>
                  </div>
                  <div>
                    <span className="text-neutral-400 block text-[10px]">Event Date</span>
                    <strong className="text-neutral-900">{selectedRequest.startDate}</strong>
                  </div>
                  <div>
                    <span className="text-neutral-400 block text-[10px]">Time Slot</span>
                    <strong className="text-neutral-900">{selectedRequest.timeSlot || 'Full Day'}</strong>
                  </div>
                  <div>
                    <span className="text-neutral-400 block text-[10px]">Attendees</span>
                    <strong className="text-neutral-900">{selectedRequest.numberOfGuests} Guests</strong>
                  </div>
                  <div>
                    <span className="text-neutral-400 block text-[10px]">Estimated Total</span>
                    <strong className="text-emerald-700 text-sm font-black">{selectedRequest.totalEstimatedPrice?.toLocaleString()} ETB</strong>
                  </div>
                </div>
              </div>

              {/* Organizer Info Box */}
              <div className="bg-neutral-50 p-4 rounded-2xl border border-neutral-200 space-y-2">
                <h4 className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Organizer Contact</h4>
                <div className="space-y-1.5">
                  <p className="text-sm font-bold text-neutral-900">{selectedRequest.organizerName}</p>
                  <p className="flex items-center gap-2 text-neutral-600">
                    <Mail className="w-3.5 h-3.5 text-neutral-400" />
                    <a href={`mailto:${selectedRequest.email}`} className="hover:underline text-neutral-900">{selectedRequest.email}</a>
                  </p>
                  <p className="flex items-center gap-2 text-neutral-600">
                    <Phone className="w-3.5 h-3.5 text-neutral-400" />
                    <a href={`tel:${selectedRequest.phone}`} className="hover:underline text-neutral-900">{selectedRequest.phone}</a>
                  </p>
                </div>
              </div>

              {/* Equipment Checklist */}
              {selectedRequest.requestedEquipment && selectedRequest.requestedEquipment.length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Requested Equipment</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedRequest.requestedEquipment.map((eq, i) => (
                      <span key={i} className="bg-neutral-100 text-neutral-800 px-2.5 py-1 rounded-lg text-xs font-medium border border-neutral-200">
                        {eq}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Special Message */}
              {selectedRequest.message && (
                <div className="space-y-1">
                  <h4 className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Organizer's Message / Notes</h4>
                  <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 text-neutral-700 whitespace-pre-wrap">
                    {selectedRequest.message}
                  </div>
                </div>
              )}

              {/* Manager Notes */}
              {selectedRequest.adminNotes && (
                <div className="space-y-1">
                  <h4 className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Manager Notes</h4>
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900">
                    {selectedRequest.adminNotes}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="p-5 bg-neutral-50 border-t border-neutral-200 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setSelectedRequest(null)}
                className="px-4 py-2 text-neutral-600 hover:text-neutral-900 font-bold text-xs"
              >
                Close
              </button>

              <div className="flex items-center gap-2">
                {selectedRequest.status === 'Pending' && (
                  <>
                    <button
                      onClick={() => setActionModal({ isOpen: true, type: 'approve', request: selectedRequest, notes: '' })}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" /> Approve
                    </button>
                    <button
                      onClick={() => setActionModal({ isOpen: true, type: 'reject', request: selectedRequest, notes: '' })}
                      className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold transition border border-rose-200"
                    >
                      <X className="w-3.5 h-3.5" /> Reject
                    </button>
                  </>
                )}
                {selectedRequest.status === 'Approved' && (
                  <button
                    onClick={() => handleUpdateStatus(selectedRequest, 'Confirmed')}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition"
                  >
                    Mark as Confirmed & Paid
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Hall Space Modal */}
      <ConfirmModal
        isOpen={!!deletingHall}
        title="Delete Event Hall / Venue"
        message={`Are you sure you want to delete "${deletingHall?.name}"? Any active booking requests for this hall should be reviewed first.`}
        confirmText="Delete Hall"
        isLoading={isDeleting}
        onConfirm={handleConfirmDeleteHall}
        onClose={() => setDeletingHall(null)}
      />

      {/* Delete Hall Request Modal */}
      <ConfirmModal
        isOpen={!!deletingRequest}
        title="Delete Booking Request"
        message={`Are you sure you want to delete Hall Booking Request #${deletingRequest?.reservationCode} for ${deletingRequest?.organizerName}?`}
        confirmText="Delete Request"
        isLoading={isDeleting}
        onConfirm={handleConfirmDeleteRequest}
        onClose={() => setDeletingRequest(null)}
      />
    </div>
  );
}
