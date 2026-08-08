import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../firebase';
import { 
  collection, 
  onSnapshot, 
  doc, 
  updateDoc, 
  addDoc, 
  query, 
  orderBy, 
  limit, 
  where 
} from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { sendNotification } from '../../lib/notificationService';
import { 
  Room, 
  HousekeepingTask, 
  MaintenanceReport, 
  HousekeepingLog, 
  HousekeepingPriority, 
  HousekeepingTaskStatus,
  MaintenanceCategory,
  MaintenancePriority,
  RoomCondition,
  Booking
} from '../../types';
import { 
  Sparkles, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Wrench, 
  XCircle, 
  Search, 
  Plus, 
  Play, 
  Pause, 
  Eye, 
  FileText, 
  Filter, 
  ShieldCheck, 
  RotateCcw, 
  Camera, 
  User, 
  ListFilter, 
  Building,
  Check,
  AlertCircle
} from 'lucide-react';

export default function HousekeepingDashboard() {
  const { userData } = useAuth();
  
  // Data States
  const [rooms, setRooms] = useState<Room[]>([]);
  const [tasks, setTasks] = useState<HousekeepingTask[]>([]);
  const [maintenanceReports, setMaintenanceReports] = useState<MaintenanceReport[]>([]);
  const [logs, setLogs] = useState<HousekeepingLog[]>([]);
  const [activeBookings, setActiveBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  // Active View Tab
  const [activeTab, setActiveTab] = useState<'queue' | 'inspection' | 'maintenance' | 'rooms' | 'logs'>('queue');

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  // Modal States
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showInspectionModal, setShowInspectionModal] = useState<Room | null>(null);
  const [selectedTaskForAction, setSelectedTaskForAction] = useState<HousekeepingTask | null>(null);

  // Maintenance Form State
  const [maintCategory, setMaintCategory] = useState<MaintenanceCategory>('Plumbing');
  const [maintDescription, setMaintDescription] = useState('');
  const [maintPriority, setMaintPriority] = useState<MaintenancePriority>('Medium');
  const [maintPhoto, setMaintPhoto] = useState('');
  const [maintSubmitting, setMaintSubmitting] = useState(false);

  // Inspection Feedback State
  const [inspectionFeedback, setInspectionFeedback] = useState('');
  const [inspectionActionLoading, setInspectionActionLoading] = useState(false);

  // Task Notes / Action State
  const [taskNotesInput, setTaskNotesInput] = useState('');
  const [taskPhotoInput, setTaskPhotoInput] = useState('');
  const [staffAssigneeInput, setStaffAssigneeInput] = useState('');

  // ---------------------------------------------------------------------------
  // Real-time Firestore Listeners
  // ---------------------------------------------------------------------------
  useEffect(() => {
    // 1. Rooms Listener
    const unsubRooms = onSnapshot(collection(db, 'rooms'), (snapshot) => {
      const roomData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Room[];
      setRooms(roomData);
    }, (err) => {
      console.error("Housekeeping rooms listener error:", err);
    });

    // 2. Housekeeping Tasks Listener
    const tasksQuery = query(collection(db, 'housekeeping_tasks'), orderBy('createdAt', 'desc'));
    const unsubTasks = onSnapshot(tasksQuery, (snapshot) => {
      const taskData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as HousekeepingTask[];
      setTasks(taskData);
    }, (err) => {
      console.error("Housekeeping tasks listener error:", err);
    });

    // 3. Maintenance Reports Listener
    const maintQuery = query(collection(db, 'maintenance_reports'), orderBy('createdAt', 'desc'));
    const unsubMaint = onSnapshot(maintQuery, (snapshot) => {
      const maintData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as MaintenanceReport[];
      setMaintenanceReports(maintData);
    }, (err) => {
      console.error("Housekeeping maint listener error:", err);
    });

    // 4. Housekeeping Logs Listener
    const logsQuery = query(collection(db, 'housekeeping_logs'), orderBy('timestamp', 'desc'), limit(100));
    const unsubLogs = onSnapshot(logsQuery, (snapshot) => {
      const logData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as HousekeepingLog[];
      setLogs(logData);
    }, (err) => {
      console.error("Housekeeping logs listener error:", err);
    });

    // 5. Active Bookings Listener
    const unsubBookings = onSnapshot(collection(db, 'bookings'), (snapshot) => {
      const bookingData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Booking[];
      setActiveBookings(bookingData);
      setLoading(false);
    }, (err) => {
      console.error("Housekeeping bookings listener error:", err);
      setLoading(false);
    });

    return () => {
      unsubRooms();
      unsubTasks();
      unsubMaint();
      unsubLogs();
      unsubBookings();
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Audit Logger Helper
  // ---------------------------------------------------------------------------
  const logHousekeepingAction = async (
    roomId: string,
    roomNumber: string,
    action: string,
    previousStatus: string,
    newStatus: string,
    notes?: string
  ) => {
    try {
      await addDoc(collection(db, 'housekeeping_logs'), {
        roomId,
        roomNumber,
        staffUid: userData?.uid || 'system',
        staffName: userData?.displayName || userData?.email || 'Housekeeping Staff',
        action,
        previousStatus,
        newStatus,
        notes: notes || '',
        timestamp: Date.now()
      });
    } catch (err) {
      console.error("Failed to write housekeeping log:", err);
    }
  };

  // ---------------------------------------------------------------------------
  // KPI Metrics Calculation
  // ---------------------------------------------------------------------------
  const metrics = useMemo(() => {
    const totalRooms = rooms.length;
    const dirtyCount = rooms.filter(r => r.condition === 'Dirty' || r.condition === 'Needs Cleaning').length;
    const cleaningCount = rooms.filter(r => r.condition === 'Cleaning In Progress' || r.condition === 'Cleaning').length;
    const inspectionCount = rooms.filter(r => r.condition === 'Awaiting Inspection' || r.condition === 'Inspection Required').length;
    const cleanReadyCount = rooms.filter(r => r.condition === 'Clean' || r.condition === 'Ready').length;
    const maintenanceCount = rooms.filter(r => r.condition === 'Maintenance Required').length;
    const outOfServiceCount = rooms.filter(r => r.status === 'Out of Service' || r.condition === 'Out of Service').length;

    // Calculate completed today
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const completedTodayCount = logs.filter(l => 
      l.timestamp >= startOfToday.getTime() && 
      (l.action.includes('Cleaned') || l.action.includes('Approved'))
    ).length;

    return {
      totalRooms,
      dirtyCount,
      cleaningCount,
      inspectionCount,
      cleanReadyCount,
      maintenanceCount,
      outOfServiceCount,
      completedTodayCount
    };
  }, [rooms, logs]);

  // ---------------------------------------------------------------------------
  // Auto Task Synchronization
  // Ensure every Dirty room has an active task in task queue
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (loading || rooms.length === 0) return;

    const syncTasks = async () => {
      for (const room of rooms) {
        if (room.condition === 'Dirty' || room.condition === 'Needs Cleaning') {
          // Check if task exists
          const existingTask = tasks.find(t => t.roomId === room.id && t.status !== 'Completed' && t.status !== 'Cancelled');
          if (!existingTask) {
            // Check if room was checked out recently
            const activeBooking = activeBookings.find(b => b.assignedRoomId === room.id && b.status === 'Checked Out');
            await addDoc(collection(db, 'housekeeping_tasks'), {
              roomId: room.id,
              roomNumber: room.roomNumber,
              floor: room.floor || 'Floor 1',
              wing: room.wing || 'Main Wing',
              priority: activeBooking ? 'High' : 'Medium',
              status: 'Pending',
              requestedBy: activeBooking ? 'Guest Check-Out' : 'Routine Room Check',
              createdAt: Date.now(),
              updatedAt: Date.now()
            });
          }
        }
      }
    };

    syncTasks();
  }, [rooms, tasks, activeBookings, loading]);

  // ---------------------------------------------------------------------------
  // Task Handlers
  // ---------------------------------------------------------------------------
  const handleStartCleaning = async (task: HousekeepingTask) => {
    try {
      const room = rooms.find(r => r.id === task.roomId);
      const prevCondition = room?.condition || 'Dirty';

      // Update Task
      await updateDoc(doc(db, 'housekeeping_tasks', task.id), {
        status: 'In Progress',
        startedAt: Date.now(),
        assignedToId: userData?.uid || 'staff',
        assignedToName: staffAssigneeInput || userData?.displayName || 'Housekeeping Staff',
        updatedAt: Date.now()
      });

      // Update Room
      if (room) {
        await updateDoc(doc(db, 'rooms', room.id), {
          condition: 'Cleaning In Progress'
        });
      }

      await logHousekeepingAction(
        task.roomId,
        task.roomNumber,
        'Started Cleaning',
        prevCondition,
        'Cleaning In Progress',
        taskNotesInput
      );

      setSelectedTaskForAction(null);
      setTaskNotesInput('');
    } catch (err) {
      console.error("Error starting cleaning:", err);
      alert("Failed to start cleaning task.");
    }
  };

  const handlePauseCleaning = async (task: HousekeepingTask) => {
    try {
      const room = rooms.find(r => r.id === task.roomId);
      
      await updateDoc(doc(db, 'housekeeping_tasks', task.id), {
        status: 'Paused',
        updatedAt: Date.now()
      });

      if (room) {
        await logHousekeepingAction(
          task.roomId,
          task.roomNumber,
          'Paused Cleaning',
          room.condition,
          'Cleaning In Progress (Paused)',
          'Cleaning task paused by staff'
        );
      }
    } catch (err) {
      console.error("Error pausing cleaning:", err);
    }
  };

  const handleMarkCleaned = async (task: HousekeepingTask) => {
    try {
      const room = rooms.find(r => r.id === task.roomId);
      const prevCondition = room?.condition || 'Cleaning In Progress';

      // Update Task
      await updateDoc(doc(db, 'housekeeping_tasks', task.id), {
        status: 'Awaiting Inspection',
        notes: taskNotesInput ? `${task.notes || ''}\n${taskNotesInput}` : task.notes,
        photos: taskPhotoInput ? [...(task.photos || []), taskPhotoInput] : task.photos,
        updatedAt: Date.now()
      });

      // Update Room condition to Awaiting Inspection
      if (room) {
        await updateDoc(doc(db, 'rooms', room.id), {
          condition: 'Awaiting Inspection'
        });
      }

      await logHousekeepingAction(
        task.roomId,
        task.roomNumber,
        'Marked Cleaned & Requested Inspection',
        prevCondition,
        'Awaiting Inspection',
        taskNotesInput
      );

      setSelectedTaskForAction(null);
      setTaskNotesInput('');
      setTaskPhotoInput('');
    } catch (err) {
      console.error("Error marking cleaned:", err);
      alert("Failed to update task.");
    }
  };

  // Quick Direct Clean & Ready (Supervisors/Admins)
  const handleDirectMarkReady = async (room: Room) => {
    try {
      const prevCondition = room.condition;

      await updateDoc(doc(db, 'rooms', room.id), {
        condition: 'Ready',
        status: room.status === 'Out of Service' ? 'Available' : room.status
      });

      // Update related tasks
      const relatedTasks = tasks.filter(t => t.roomId === room.id && t.status !== 'Completed');
      for (const t of relatedTasks) {
        await updateDoc(doc(db, 'housekeeping_tasks', t.id), {
          status: 'Completed',
          completedAt: Date.now(),
          updatedAt: Date.now()
        });
      }

      await logHousekeepingAction(
        room.id,
        room.roomNumber,
        'Direct Mark Ready',
        prevCondition,
        'Ready',
        'Marked Ready directly by supervisor'
      );
    } catch (err) {
      console.error("Error marking room ready:", err);
    }
  };

  // ---------------------------------------------------------------------------
  // Inspection Workflow Handlers
  // ---------------------------------------------------------------------------
  const handleApproveInspection = async (room: Room) => {
    setInspectionActionLoading(true);
    try {
      const prevCondition = room.condition;

      // Update Room
      await updateDoc(doc(db, 'rooms', room.id), {
        condition: 'Ready',
        status: room.status === 'Out of Service' ? 'Available' : room.status
      });

      // Update tasks
      const relatedTasks = tasks.filter(t => t.roomId === room.id && t.status !== 'Completed');
      for (const task of relatedTasks) {
        await updateDoc(doc(db, 'housekeeping_tasks', task.id), {
          status: 'Completed',
          completedAt: Date.now(),
          updatedAt: Date.now()
        });
      }

      await logHousekeepingAction(
        room.id,
        room.roomNumber,
        'Inspection Approved',
        prevCondition,
        'Ready',
        inspectionFeedback || 'Passed inspection cleanly'
      );

      setShowInspectionModal(null);
      setInspectionFeedback('');
    } catch (err) {
      console.error("Error approving inspection:", err);
      alert("Failed to approve inspection.");
    } finally {
      setInspectionActionLoading(false);
    }
  };

  const handleRejectInspection = async (room: Room) => {
    if (!inspectionFeedback.trim()) {
      alert("Please provide feedback notes explaining why the room was rejected.");
      return;
    }
    setInspectionActionLoading(true);
    try {
      const prevCondition = room.condition;

      // Set room back to Needs Cleaning
      await updateDoc(doc(db, 'rooms', room.id), {
        condition: 'Needs Cleaning'
      });

      // Update active tasks back to Pending with feedback
      const relatedTasks = tasks.filter(t => t.roomId === room.id && t.status !== 'Completed');
      for (const task of relatedTasks) {
        await updateDoc(doc(db, 'housekeeping_tasks', task.id), {
          status: 'Pending',
          priority: 'Urgent',
          notes: `${task.notes || ''}\n[REJECTED]: ${inspectionFeedback}`,
          updatedAt: Date.now()
        });
      }

      await logHousekeepingAction(
        room.id,
        room.roomNumber,
        'Inspection Rejected - Reclean Required',
        prevCondition,
        'Needs Cleaning',
        inspectionFeedback
      );

      setShowInspectionModal(null);
      setInspectionFeedback('');
    } catch (err) {
      console.error("Error rejecting inspection:", err);
      alert("Failed to reject inspection.");
    } finally {
      setInspectionActionLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Maintenance Handlers
  // ---------------------------------------------------------------------------
  const handleCreateMaintenanceReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoom || !maintDescription.trim()) return;

    setMaintSubmitting(true);
    try {
      const prevCondition = selectedRoom.condition;

      // 1. Create Report
      const reportRef = await addDoc(collection(db, 'maintenance_reports'), {
        roomId: selectedRoom.id,
        roomNumber: selectedRoom.roomNumber,
        category: maintCategory,
        description: maintDescription,
        priority: maintPriority,
        status: 'Open',
        photos: maintPhoto ? [maintPhoto] : [],
        reportedByUid: userData?.uid || 'staff',
        reportedByName: userData?.displayName || userData?.email || 'Housekeeping Staff',
        createdAt: Date.now(),
        updatedAt: Date.now()
      });

      // Send Maintenance notification to Housekeeping & Admin
      await sendNotification({
        recipientRole: 'housekeeping',
        title: `Maintenance Ticket: Room ${selectedRoom.roomNumber}`,
        message: `${maintPriority} priority ${maintCategory} issue reported: ${maintDescription}`,
        type: 'maintenance',
        relatedEntityId: reportRef.id,
        relatedEntityType: 'maintenance_report',
        targetRoute: '/admin/housekeeping',
        priority: maintPriority === 'Urgent' || maintPriority === 'High' ? 'Urgent' : 'Important',
        eventId: `maint_ticket_${reportRef.id}`
      });

      // 2. Update Room Condition & Status
      await updateDoc(doc(db, 'rooms', selectedRoom.id), {
        condition: 'Maintenance Required',
        status: selectedRoom.status === 'Available' ? 'Out of Service' : selectedRoom.status
      });

      // 3. Log
      await logHousekeepingAction(
        selectedRoom.id,
        selectedRoom.roomNumber,
        'Reported Maintenance Issue',
        prevCondition,
        'Maintenance Required',
        `Category: ${maintCategory} - ${maintDescription}`
      );

      setShowMaintenanceModal(false);
      setSelectedRoom(null);
      setMaintDescription('');
      setMaintPhoto('');
    } catch (err) {
      console.error("Error creating maintenance report:", err);
      alert("Failed to submit maintenance report.");
    } finally {
      setMaintSubmitting(false);
    }
  };

  const handleResolveMaintenance = async (report: MaintenanceReport) => {
    try {
      const room = rooms.find(r => r.id === report.roomId);
      const prevCondition = room?.condition || 'Maintenance Required';

      // Update Report
      await updateDoc(doc(db, 'maintenance_reports', report.id), {
        status: 'Resolved',
        updatedAt: Date.now()
      });

      // Check if other open maintenance reports exist for this room
      const otherOpenReports = maintenanceReports.filter(
        m => m.roomId === report.roomId && m.id !== report.id && m.status !== 'Resolved' && m.status !== 'Cancelled'
      );

      if (otherOpenReports.length === 0 && room) {
        // Return room to Needs Cleaning
        await updateDoc(doc(db, 'rooms', room.id), {
          condition: 'Needs Cleaning',
          status: room.status === 'Out of Service' ? 'Available' : room.status
        });

        await logHousekeepingAction(
          room.id,
          room.roomNumber,
          'Resolved Maintenance - Needs Cleaning',
          prevCondition,
          'Needs Cleaning',
          `Resolved Issue: ${report.description}`
        );
      }
    } catch (err) {
      console.error("Error resolving maintenance report:", err);
    }
  };

  // ---------------------------------------------------------------------------
  // Search & Filtered Task Lists
  // ---------------------------------------------------------------------------
  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      const matchesSearch = t.roomNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (t.assignedToName || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
      const matchesPriority = priorityFilter === 'all' || t.priority === priorityFilter;

      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [tasks, searchQuery, statusFilter, priorityFilter]);

  const awaitingInspectionRooms = useMemo(() => {
    return rooms.filter(r => r.condition === 'Awaiting Inspection' || r.condition === 'Inspection Required');
  }, [rooms]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Title */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 flex items-center gap-2">
            <Sparkles className="w-7 h-7 text-emerald-600" />
            Housekeeping Operations
          </h1>
          <p className="text-sm text-neutral-500">
            Real-time room cleaning queue, quality inspections, and maintenance tracking.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (rooms.length > 0) {
                setSelectedRoom(rooms[0]);
                setShowMaintenanceModal(true);
              }
            }}
            className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium text-sm transition"
          >
            <Wrench className="w-4 h-4" />
            Report Issue
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-neutral-200 shadow-sm flex flex-col justify-between">
          <div className="text-xs font-semibold text-neutral-500 uppercase">To Clean</div>
          <div className="text-2xl font-bold text-amber-600 mt-1">{metrics.dirtyCount}</div>
          <div className="text-[11px] text-neutral-400 mt-1">Dirty / Needs Cleaning</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-neutral-200 shadow-sm flex flex-col justify-between">
          <div className="text-xs font-semibold text-neutral-500 uppercase">Cleaning</div>
          <div className="text-2xl font-bold text-blue-600 mt-1">{metrics.cleaningCount}</div>
          <div className="text-[11px] text-neutral-400 mt-1">In Progress</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-neutral-200 shadow-sm flex flex-col justify-between">
          <div className="text-xs font-semibold text-neutral-500 uppercase">Awaiting Insp.</div>
          <div className="text-2xl font-bold text-purple-600 mt-1">{metrics.inspectionCount}</div>
          <div className="text-[11px] text-neutral-400 mt-1">Needs Approval</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-neutral-200 shadow-sm flex flex-col justify-between">
          <div className="text-xs font-semibold text-neutral-500 uppercase">Clean & Ready</div>
          <div className="text-2xl font-bold text-emerald-600 mt-1">{metrics.cleanReadyCount}</div>
          <div className="text-[11px] text-neutral-400 mt-1">Available for Check-in</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-neutral-200 shadow-sm flex flex-col justify-between">
          <div className="text-xs font-semibold text-neutral-500 uppercase">Maintenance</div>
          <div className="text-2xl font-bold text-rose-600 mt-1">{metrics.maintenanceCount}</div>
          <div className="text-[11px] text-neutral-400 mt-1">Issues Reported</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-neutral-200 shadow-sm flex flex-col justify-between">
          <div className="text-xs font-semibold text-neutral-500 uppercase">Out of Service</div>
          <div className="text-2xl font-bold text-neutral-700 mt-1">{metrics.outOfServiceCount}</div>
          <div className="text-[11px] text-neutral-400 mt-1">Blocked / Repair</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-neutral-200 shadow-sm flex flex-col justify-between col-span-2 bg-emerald-50/50 border-emerald-200">
          <div className="text-xs font-semibold text-emerald-800 uppercase">Completed Today</div>
          <div className="text-2xl font-bold text-emerald-700 mt-1">{metrics.completedTodayCount}</div>
          <div className="text-[11px] text-emerald-600 mt-1">Rooms cleaned & verified</div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-neutral-200 bg-white rounded-xl shadow-sm px-4 pt-2">
        <div className="flex gap-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab('queue')}
            className={`py-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition ${
              activeTab === 'queue'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <ListFilter className="w-4 h-4" />
            Cleaning Queue
            {tasks.filter(t => t.status !== 'Completed').length > 0 && (
              <span className="px-2 py-0.5 text-xs bg-amber-100 text-amber-800 rounded-full font-bold">
                {tasks.filter(t => t.status !== 'Completed').length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('inspection')}
            className={`py-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition ${
              activeTab === 'inspection'
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            Room Inspections
            {awaitingInspectionRooms.length > 0 && (
              <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-800 rounded-full font-bold">
                {awaitingInspectionRooms.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('maintenance')}
            className={`py-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition ${
              activeTab === 'maintenance'
                ? 'border-rose-600 text-rose-600'
                : 'border-transparent text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <Wrench className="w-4 h-4" />
            Maintenance
            {maintenanceReports.filter(m => m.status !== 'Resolved').length > 0 && (
              <span className="px-2 py-0.5 text-xs bg-rose-100 text-rose-800 rounded-full font-bold">
                {maintenanceReports.filter(m => m.status !== 'Resolved').length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('rooms')}
            className={`py-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition ${
              activeTab === 'rooms'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <Building className="w-4 h-4" />
            Room Status Matrix ({rooms.length})
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`py-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition ${
              activeTab === 'logs'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <FileText className="w-4 h-4" />
            Audit History
          </button>
        </div>
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* TAB 1: CLEANING QUEUE */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === 'queue' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm flex flex-wrap gap-4 items-center justify-between">
            <div className="flex items-center gap-3 flex-1 min-w-[280px]">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Search by room number or staff..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-neutral-300 rounded-lg text-sm text-neutral-700 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">All Task Statuses</option>
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Paused">Paused</option>
                <option value="Awaiting Inspection">Awaiting Inspection</option>
                <option value="Completed">Completed</option>
              </select>

              <select
                value={priorityFilter}
                onChange={e => setPriorityFilter(e.target.value)}
                className="px-3 py-2 border border-neutral-300 rounded-lg text-sm text-neutral-700 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">All Priorities</option>
                <option value="Urgent">Urgent</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
          </div>

          {/* Tasks Table */}
          <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
            {filteredTasks.length === 0 ? (
              <div className="p-12 text-center text-neutral-500">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                <p className="font-semibold text-neutral-800">No active cleaning tasks match your search.</p>
                <p className="text-sm text-neutral-500 mt-1">All hotel rooms are clean or up to date!</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-600 font-semibold uppercase text-[11px]">
                    <tr>
                      <th className="py-3 px-4">Room</th>
                      <th className="py-3 px-4">Priority</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Trigger / Source</th>
                      <th className="py-3 px-4">Assigned To</th>
                      <th className="py-3 px-4">Time Created</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {filteredTasks.map(task => {
                      const room = rooms.find(r => r.id === task.roomId);
                      return (
                        <tr key={task.id} className="hover:bg-neutral-50/80 transition">
                          <td className="py-3 px-4 font-bold text-neutral-900">
                            Room {task.roomNumber}
                            {task.floor && <span className="block text-xs font-normal text-neutral-500">{task.floor}</span>}
                          </td>

                          <td className="py-3 px-4">
                            <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                              task.priority === 'Urgent' ? 'bg-red-100 text-red-800' :
                              task.priority === 'High' ? 'bg-amber-100 text-amber-800' :
                              task.priority === 'Medium' ? 'bg-blue-100 text-blue-800' :
                              'bg-neutral-100 text-neutral-700'
                            }`}>
                              {task.priority}
                            </span>
                          </td>

                          <td className="py-3 px-4">
                            <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                              task.status === 'In Progress' ? 'bg-blue-100 text-blue-800 animate-pulse' :
                              task.status === 'Awaiting Inspection' ? 'bg-purple-100 text-purple-800' :
                              task.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' :
                              task.status === 'Paused' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}>
                              {task.status}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-neutral-600">
                            {task.requestedBy || 'Routine Request'}
                          </td>

                          <td className="py-3 px-4 text-neutral-800 font-medium">
                            {task.assignedToName || <span className="text-neutral-400 italic">Unassigned</span>}
                          </td>

                          <td className="py-3 px-4 text-neutral-500 text-xs">
                            {new Date(task.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>

                          <td className="py-3 px-4 text-right space-x-2">
                            {task.status === 'Pending' && (
                              <button
                                onClick={() => {
                                  setSelectedTaskForAction(task);
                                  setStaffAssigneeInput(userData?.displayName || '');
                                }}
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-xs transition inline-flex items-center gap-1"
                              >
                                <Play className="w-3.5 h-3.5" /> Start
                              </button>
                            )}

                            {task.status === 'In Progress' && (
                              <>
                                <button
                                  onClick={() => handlePauseCleaning(task)}
                                  className="px-2.5 py-1.5 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg font-medium text-xs transition inline-flex items-center gap-1"
                                >
                                  <Pause className="w-3.5 h-3.5" /> Pause
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedTaskForAction(task);
                                  }}
                                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium text-xs transition inline-flex items-center gap-1"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Mark Cleaned
                                </button>
                              </>
                            )}

                            {task.status === 'Paused' && (
                              <button
                                onClick={() => handleStartCleaning(task)}
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-xs transition inline-flex items-center gap-1"
                              >
                                <Play className="w-3.5 h-3.5" /> Resume
                              </button>
                            )}

                            {room && (
                              <button
                                onClick={() => {
                                  setSelectedRoom(room);
                                  setShowMaintenanceModal(true);
                                }}
                                title="Report Maintenance Issue"
                                className="px-2.5 py-1.5 border border-rose-300 text-rose-700 hover:bg-rose-50 rounded-lg text-xs font-medium transition"
                              >
                                <Wrench className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* TAB 2: ROOM INSPECTION WORKFLOW */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === 'inspection' && (
        <div className="space-y-4">
          <div className="bg-purple-50 p-4 rounded-xl border border-purple-200 text-purple-900 text-sm flex items-center justify-between">
            <div>
              <span className="font-bold">Quality Control Workspace:</span> Verify cleaned rooms before releasing them to Reception for guest check-in.
            </div>
            <span className="px-3 py-1 bg-purple-200 text-purple-900 rounded-full font-bold text-xs">
              {awaitingInspectionRooms.length} Pending Approval
            </span>
          </div>

          {awaitingInspectionRooms.length === 0 ? (
            <div className="bg-white p-12 rounded-xl border border-neutral-200 text-center text-neutral-500 shadow-sm">
              <ShieldCheck className="w-12 h-12 text-purple-400 mx-auto mb-3" />
              <p className="font-semibold text-neutral-800">No rooms currently awaiting inspection.</p>
              <p className="text-sm mt-1">When staff complete cleaning a room, it will appear here for supervisor verification.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {awaitingInspectionRooms.map(room => {
                const task = tasks.find(t => t.roomId === room.id && t.status === 'Awaiting Inspection');
                return (
                  <div key={room.id} className="bg-white rounded-xl border border-purple-200 shadow-sm p-5 space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-xs font-semibold text-purple-600 uppercase">Awaiting Verification</span>
                        <h3 className="text-xl font-bold text-neutral-900">Room {room.roomNumber}</h3>
                        <p className="text-xs text-neutral-500">{room.floor || 'Floor 1'} • Standard Deluxe</p>
                      </div>
                      <span className="px-3 py-1 bg-purple-100 text-purple-800 font-bold text-xs rounded-full">
                        Cleaned
                      </span>
                    </div>

                    {task && (
                      <div className="bg-neutral-50 p-3 rounded-lg text-xs space-y-1 text-neutral-700 border border-neutral-200">
                        <div><strong className="text-neutral-900">Cleaned By:</strong> {task.assignedToName || 'Housekeeping Staff'}</div>
                        {task.notes && <div><strong className="text-neutral-900">Cleaning Notes:</strong> {task.notes}</div>}
                        {task.photos && task.photos.length > 0 && (
                          <div className="pt-2 flex gap-2 overflow-x-auto">
                            {task.photos.map((p, idx) => (
                              <a key={idx} href={p} target="_blank" rel="noreferrer">
                                <img src={p} alt="proof" className="w-12 h-12 rounded object-cover border border-neutral-300 hover:opacity-80" />
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => handleApproveInspection(room)}
                        disabled={inspectionActionLoading}
                        className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs transition flex items-center justify-center gap-1"
                      >
                        <Check className="w-4 h-4" /> Approve & Make Ready
                      </button>

                      <button
                        onClick={() => setShowInspectionModal(room)}
                        disabled={inspectionActionLoading}
                        className="px-3 py-2 bg-rose-50 border border-rose-300 text-rose-700 hover:bg-rose-100 rounded-lg font-bold text-xs transition flex items-center gap-1"
                      >
                        <RotateCcw className="w-4 h-4" /> Reject
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* TAB 3: MAINTENANCE REPORTS */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === 'maintenance' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm flex justify-between items-center">
            <h3 className="font-bold text-neutral-900 flex items-center gap-2">
              <Wrench className="w-5 h-5 text-rose-600" /> Hotel Maintenance Tickets
            </h3>
            <button
              onClick={() => {
                if (rooms.length > 0) {
                  setSelectedRoom(rooms[0]);
                  setShowMaintenanceModal(true);
                }
              }}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-medium text-xs transition flex items-center gap-1"
            >
              <Plus className="w-4 h-4" /> Report New Issue
            </button>
          </div>

          <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
            {maintenanceReports.length === 0 ? (
              <div className="p-12 text-center text-neutral-500">
                <Wrench className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
                <p className="font-semibold text-neutral-800">No maintenance tickets reported.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-600 font-semibold uppercase text-[11px]">
                    <tr>
                      <th className="py-3 px-4">Room</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Description</th>
                      <th className="py-3 px-4">Priority</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Reported By</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {maintenanceReports.map(maint => (
                      <tr key={maint.id} className="hover:bg-neutral-50">
                        <td className="py-3 px-4 font-bold text-neutral-900">Room {maint.roomNumber}</td>
                        <td className="py-3 px-4 text-neutral-700 font-medium">{maint.category}</td>
                        <td className="py-3 px-4 text-neutral-600 max-w-xs truncate">{maint.description}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 text-xs font-semibold rounded ${
                            maint.priority === 'Urgent' ? 'bg-red-100 text-red-800' :
                            maint.priority === 'High' ? 'bg-amber-100 text-amber-800' : 'bg-neutral-100 text-neutral-700'
                          }`}>
                            {maint.priority}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                            maint.status === 'Open' ? 'bg-rose-100 text-rose-800' :
                            maint.status === 'In Progress' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {maint.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-neutral-500 text-xs">{maint.reportedByName}</td>
                        <td className="py-3 px-4 text-right">
                          {maint.status !== 'Resolved' && (
                            <button
                              onClick={() => handleResolveMaintenance(maint)}
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold transition"
                            >
                              Mark Resolved
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* TAB 4: ROOM STATUS MATRIX */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === 'rooms' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {rooms.map(room => (
              <div
                key={room.id}
                className={`p-4 rounded-xl border shadow-sm space-y-2 relative transition ${
                  room.condition === 'Clean' || room.condition === 'Ready'
                    ? 'bg-emerald-50/60 border-emerald-300'
                    : room.condition === 'Cleaning In Progress' || room.condition === 'Cleaning'
                    ? 'bg-blue-50/60 border-blue-300'
                    : room.condition === 'Awaiting Inspection' || room.condition === 'Inspection Required'
                    ? 'bg-purple-50/60 border-purple-300'
                    : room.condition === 'Maintenance Required'
                    ? 'bg-rose-50/60 border-rose-300'
                    : 'bg-amber-50/60 border-amber-300'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="font-extrabold text-lg text-neutral-900">Room {room.roomNumber}</span>
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                    room.status === 'Available' ? 'bg-emerald-100 text-emerald-800' :
                    room.status === 'Occupied' ? 'bg-blue-100 text-blue-800' : 'bg-neutral-200 text-neutral-800'
                  }`}>
                    {room.status}
                  </span>
                </div>

                <div className="text-xs font-bold text-neutral-700">
                  Condition: <span className="underline">{room.condition}</span>
                </div>

                <div className="pt-2 flex flex-col gap-1.5">
                  {(room.condition === 'Dirty' || room.condition === 'Needs Cleaning') && (
                    <button
                      onClick={() => handleDirectMarkReady(room)}
                      className="w-full py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded transition"
                    >
                      Quick Mark Ready
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setSelectedRoom(room);
                      setShowMaintenanceModal(true);
                    }}
                    className="w-full py-1 bg-white border border-neutral-300 hover:bg-neutral-50 text-neutral-700 text-xs font-medium rounded transition flex items-center justify-center gap-1"
                  >
                    <Wrench className="w-3 h-3 text-rose-500" /> Report Issue
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* TAB 5: AUDIT LOGS */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === 'logs' && (
        <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-4 space-y-4">
          <h3 className="font-bold text-neutral-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-600" /> Housekeeping Audit Trail
          </h3>

          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
            {logs.map(log => (
              <div key={log.id} className="p-3 bg-neutral-50 rounded-lg border border-neutral-200 flex justify-between items-center text-xs">
                <div>
                  <span className="font-bold text-neutral-900 mr-2">Room {log.roomNumber}</span>
                  <span className="px-2 py-0.5 bg-neutral-200 text-neutral-800 font-semibold rounded mr-2">{log.action}</span>
                  <span className="text-neutral-500">by {log.staffName}</span>
                  {log.notes && <p className="text-neutral-600 mt-1 italic">"{log.notes}"</p>}
                </div>
                <div className="text-neutral-400 font-medium whitespace-nowrap ml-4">
                  {new Date(log.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* MODAL 1: START / COMPLETE TASK ACTION */}
      {/* --------------------------------------------------------------------- */}
      {selectedTaskForAction && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-neutral-900">
              Task Action: Room {selectedTaskForAction.roomNumber}
            </h3>

            {selectedTaskForAction.status === 'Pending' && (
              <div className="space-y-3">
                <p className="text-sm text-neutral-600">Assign housekeeper and start cleaning operation.</p>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">Assigned Staff Name</label>
                  <input
                    type="text"
                    value={staffAssigneeInput}
                    onChange={e => setStaffAssigneeInput(e.target.value)}
                    placeholder="e.g. Abebech Tassew"
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setSelectedTaskForAction(null)}
                    className="px-4 py-2 border rounded-lg text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleStartCleaning(selectedTaskForAction)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold"
                  >
                    Start Cleaning Task
                  </button>
                </div>
              </div>
            )}

            {selectedTaskForAction.status === 'In Progress' && (
              <div className="space-y-3">
                <p className="text-sm text-neutral-600">Mark room as cleaned and send for quality inspection.</p>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">Cleaning Notes (Optional)</label>
                  <textarea
                    value={taskNotesInput}
                    onChange={e => setTaskNotesInput(e.target.value)}
                    placeholder="e.g. Linen changed, towels replaced, bathroom sanitized."
                    className="w-full px-3 py-2 border rounded-lg text-sm h-20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">Proof Photo URL (Optional)</label>
                  <input
                    type="url"
                    value={taskPhotoInput}
                    onChange={e => setTaskPhotoInput(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setSelectedTaskForAction(null)}
                    className="px-4 py-2 border rounded-lg text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleMarkCleaned(selectedTaskForAction)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold"
                  >
                    Submit for Inspection
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* MODAL 2: REJECT INSPECTION FEEDBACK */}
      {/* --------------------------------------------------------------------- */}
      {showInspectionModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-neutral-900 flex items-center gap-2 text-rose-600">
              <RotateCcw className="w-5 h-5" /> Reject Room {showInspectionModal.roomNumber}
            </h3>
            <p className="text-xs text-neutral-600">Provide inspection feedback for the housekeeping team explaining why this room requires recleaning.</p>

            <textarea
              value={inspectionFeedback}
              onChange={e => setInspectionFeedback(e.target.value)}
              placeholder="e.g. Dust found on bedside tables, bathroom mirror needs re-wiping."
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm h-24 focus:ring-2 focus:ring-rose-500"
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowInspectionModal(null)}
                className="px-4 py-2 border rounded-lg text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRejectInspection(showInspectionModal)}
                disabled={inspectionActionLoading}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-bold"
              >
                Return for Recleaning
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* MODAL 3: MAINTENANCE REPORT */}
      {/* --------------------------------------------------------------------- */}
      {showMaintenanceModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
              <Wrench className="w-5 h-5 text-amber-600" /> Report Maintenance Issue
            </h3>

            <form onSubmit={handleCreateMaintenanceReport} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">Select Room</label>
                <select
                  value={selectedRoom?.id || ''}
                  onChange={e => {
                    const r = rooms.find(rm => rm.id === e.target.value);
                    if (r) setSelectedRoom(r);
                  }}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                >
                  {rooms.map(rm => (
                    <option key={rm.id} value={rm.id}>
                      Room {rm.roomNumber} ({rm.condition})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">Issue Category</label>
                <select
                  value={maintCategory}
                  onChange={e => setMaintCategory(e.target.value as MaintenanceCategory)}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                >
                  <option value="Plumbing">Plumbing (Faucet/Shower/Toilet)</option>
                  <option value="Electrical">Electrical (Lights/Outlets)</option>
                  <option value="Air Conditioning">Air Conditioning / HVAC</option>
                  <option value="Television">Television / Cable</option>
                  <option value="Furniture">Furniture / Fixtures</option>
                  <option value="Internet">Internet / Wi-Fi</option>
                  <option value="Bathroom">Bathroom Amenities</option>
                  <option value="Other">Other Maintenance</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">Priority</label>
                <select
                  value={maintPriority}
                  onChange={e => setMaintPriority(e.target.value as MaintenancePriority)}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Urgent">Urgent (Immediate Fix Required)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">Description</label>
                <textarea
                  required
                  value={maintDescription}
                  onChange={e => setMaintDescription(e.target.value)}
                  placeholder="Describe the issue in detail..."
                  className="w-full px-3 py-2 border rounded-lg text-sm h-20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">Photo URL (Optional)</label>
                <input
                  type="url"
                  value={maintPhoto}
                  onChange={e => setMaintPhoto(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowMaintenanceModal(false)}
                  className="px-4 py-2 border rounded-lg text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={maintSubmitting}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-bold"
                >
                  Submit Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
