import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, 
  CheckCheck, 
  Trash2, 
  X, 
  ExternalLink, 
  AlertTriangle, 
  Info, 
  Calendar, 
  Utensils, 
  Sparkles, 
  Wrench, 
  Volume2, 
  VolumeX 
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { AppNotification, NotificationPriority } from '../../types';
import { 
  subscribeStaffNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead, 
  deleteNotification 
} from '../../lib/notificationService';
import { 
  requestBrowserNotificationPermission, 
  showNativeBrowserNotification 
} from '../../lib/pwaNotification';

export default function NotificationCenter() {
  const { userData, currentUser } = useAuth();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread' | 'urgent'>('all');
  const [soundEnabled, setSoundEnabled] = useState(true);

  const prevUnreadCountRef = useRef<number>(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const role = userData?.role || 'guest';
  const uid = currentUser?.uid;

  // Listen to staff notifications
  useEffect(() => {
    if (!role || role === 'guest') return;

    const unsub = subscribeStaffNotifications(role, uid, (newNotifs) => {
      setNotifications(newNotifs);

      // Play subtle chime on new unread notification if sound is enabled
      const unreadCount = newNotifs.filter((n) => !n.isRead).length;
      if (unreadCount > prevUnreadCountRef.current && prevUnreadCountRef.current !== 0) {
        if (soundEnabled) {
          playNotificationAudio();
        }
        // Emit native browser toast for the newest unread item
        const latestNotif = newNotifs.find((n) => !n.isRead);
        if (latestNotif) {
          showNativeBrowserNotification(latestNotif.title, {
            body: latestNotif.message,
            tag: latestNotif.id,
          });
        }
      }
      prevUnreadCountRef.current = unreadCount;
    });

    return () => unsub();
  }, [role, uid, soundEnabled]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const playNotificationAudio = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.3);
    } catch (e) {
      // Audio context suppressed or not allowed before interaction
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const filteredNotifs = notifications.filter((n) => {
    if (filter === 'unread') return !n.isRead;
    if (filter === 'urgent') return n.priority === 'Urgent' || n.priority === 'Important';
    return true;
  });

  const handleNotificationClick = async (notif: AppNotification) => {
    if (!notif.isRead) {
      await markNotificationAsRead(notif.id);
    }
    setIsOpen(false);
    if (notif.targetRoute) {
      navigate(notif.targetRoute);
    }
  };

  const handleMarkAllRead = async () => {
    const unreadIds = notifications.filter((n) => !n.isRead).map((n) => n.id);
    if (unreadIds.length > 0) {
      await markAllNotificationsAsRead(unreadIds);
    }
  };

  const getTypeIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'reservation':
      case 'payment':
        return <Calendar className="w-4 h-4 text-blue-600" />;
      case 'order':
      case 'service_request':
        return <Utensils className="w-4 h-4 text-amber-600" />;
      case 'housekeeping':
        return <Sparkles className="w-4 h-4 text-emerald-600" />;
      case 'maintenance':
        return <Wrench className="w-4 h-4 text-rose-600" />;
      default:
        return <Info className="w-4 h-4 text-neutral-600" />;
    }
  };

  const getPriorityBadge = (priority: NotificationPriority) => {
    if (priority === 'Urgent') {
      return (
        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 flex items-center gap-0.5">
          <AlertTriangle className="w-2.5 h-2.5" /> Urgent
        </span>
      );
    }
    if (priority === 'Important') {
      return (
        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
          Important
        </span>
      );
    }
    return null;
  };

  const formatTime = (ts: number) => {
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 rounded-xl bg-neutral-100 hover:bg-neutral-200/80 text-neutral-700 transition-all focus:outline-none focus:ring-2 focus:ring-neutral-900/20"
        title="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-rose-600 text-white text-[11px] font-bold h-5 min-w-[20px] px-1.5 rounded-full flex items-center justify-center border-2 border-white animate-pulse shadow-xs">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-neutral-200 z-50 overflow-hidden text-neutral-800 animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Panel Header */}
          <div className="p-3.5 bg-neutral-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-400" />
              <h3 className="font-bold text-sm tracking-wide">Notifications</h3>
              {unreadCount > 0 && (
                <span className="bg-amber-400 text-neutral-950 font-extrabold text-[10px] px-2 py-0.5 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  requestBrowserNotificationPermission().then((granted) => {
                    if (granted) alert('Browser desktop notifications enabled!');
                    else alert('Browser notifications are blocked or unsupported.');
                  });
                }}
                className="p-1 text-neutral-300 hover:text-white transition"
                title="Enable Desktop/PWA Notifications"
              >
                <Bell className="w-3.5 h-3.5 text-amber-300" />
              </button>
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="p-1 text-neutral-300 hover:text-white transition"
                title={soundEnabled ? 'Mute Notification Chime' : 'Unmute Notification Chime'}
              >
                {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-rose-400" />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-neutral-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Filter Bar & Controls */}
          <div className="px-3 py-2 bg-neutral-50 border-b border-neutral-200 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1 bg-neutral-200/60 p-0.5 rounded-lg font-medium">
              <button
                onClick={() => setFilter('all')}
                className={`px-2.5 py-1 rounded-md transition ${
                  filter === 'all' ? 'bg-white font-bold text-neutral-900 shadow-xs' : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('unread')}
                className={`px-2.5 py-1 rounded-md transition ${
                  filter === 'unread' ? 'bg-white font-bold text-neutral-900 shadow-xs' : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                Unread
              </button>
              <button
                onClick={() => setFilter('urgent')}
                className={`px-2.5 py-1 rounded-md transition ${
                  filter === 'urgent' ? 'bg-white font-bold text-neutral-900 shadow-xs' : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                Urgent
              </button>
            </div>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-[11px] font-semibold text-blue-700 hover:text-blue-900 flex items-center gap-1"
              >
                <CheckCheck className="w-3.5 h-3.5" /> Mark all read
              </button>
            )}
          </div>

          {/* Notification List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-neutral-100">
            {filteredNotifs.length === 0 ? (
              <div className="p-8 text-center text-neutral-400 space-y-2">
                <Bell className="w-8 h-8 mx-auto opacity-30" />
                <p className="text-xs font-medium">No notifications in this view.</p>
              </div>
            ) : (
              filteredNotifs.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-3.5 flex items-start gap-3 transition cursor-pointer hover:bg-neutral-50 relative group ${
                    !notif.isRead ? 'bg-blue-50/40 font-medium' : ''
                  }`}
                >
                  {/* Read Dot / Type Icon */}
                  <div className="mt-0.5 shrink-0 flex items-center justify-center w-8 h-8 rounded-xl bg-neutral-100 border border-neutral-200">
                    {getTypeIcon(notif.type)}
                  </div>

                  {/* Body */}
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span className="font-bold text-xs text-neutral-900 truncate flex items-center gap-1.5">
                        {!notif.isRead && (
                          <span className="w-2 h-2 rounded-full bg-blue-600 inline-block shrink-0" />
                        )}
                        {notif.title}
                      </span>
                      <span className="text-[10px] text-neutral-400 shrink-0">
                        {formatTime(notif.createdAt)}
                      </span>
                    </div>

                    <p className="text-xs text-neutral-600 line-clamp-2 leading-relaxed">
                      {notif.message}
                    </p>

                    <div className="mt-1.5 flex items-center justify-between">
                      {getPriorityBadge(notif.priority)}
                      {notif.targetRoute && (
                        <span className="text-[10px] font-bold text-blue-600 flex items-center gap-0.5 hover:underline">
                          View details <ExternalLink className="w-2.5 h-2.5" />
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Delete Button on Hover */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotification(notif.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 text-neutral-400 hover:text-rose-600 transition absolute right-2 top-3"
                    title="Delete Notification"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 bg-neutral-50 border-t border-neutral-200 text-center">
            <span className="text-[10px] text-neutral-400 font-medium">
              Woliso Hotel Notification System • Real-time Active
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
