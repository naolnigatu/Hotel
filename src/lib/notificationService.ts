import { 
  collection, 
  doc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  onSnapshot, 
  orderBy, 
  limit, 
  getDoc 
} from 'firebase/firestore';
import { db } from '../firebase';
import { AppNotification, NotificationPriority, NotificationType, Role } from '../types';

export interface CreateNotificationParams {
  recipientUid?: string;
  recipientRole?: Role;
  title: string;
  message: string;
  type: NotificationType;
  relatedEntityId?: string;
  relatedEntityType?: 'booking' | 'order' | 'service_request' | 'housekeeping_task' | 'maintenance_report' | 'system';
  targetRoute?: string;
  priority?: NotificationPriority;
  eventId?: string; // Stable key for deduplication
  expiresAt?: number;
}

/**
 * Creates or updates a notification in Firestore.
 * If an eventId is supplied, it guarantees idempotency/deduplication by using eventId as the doc ID.
 */
export async function sendNotification(params: CreateNotificationParams): Promise<string> {
  const {
    recipientUid,
    recipientRole,
    title,
    message,
    type,
    relatedEntityId,
    relatedEntityType,
    targetRoute,
    priority = 'Normal',
    eventId,
    expiresAt
  } = params;

  const now = Date.now();

  const notificationData: Omit<AppNotification, 'id'> = {
    title,
    message,
    type,
    createdAt: now,
    isRead: false,
    priority,
    ...(recipientUid ? { recipientUid } : {}),
    ...(recipientRole ? { recipientRole } : {}),
    ...(relatedEntityId ? { relatedEntityId } : {}),
    ...(relatedEntityType ? { relatedEntityType } : {}),
    ...(targetRoute ? { targetRoute } : {}),
    ...(eventId ? { eventId } : {}),
    ...(expiresAt ? { expiresAt } : {}),
  };

  try {
    if (eventId) {
      const docRef = doc(db, 'notifications', eventId);
      // Check if doc already exists to prevent overwriting read status if re-sent
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return eventId; // Already sent, skip duplication
      }
      await setDoc(docRef, { ...notificationData, id: eventId });
      return eventId;
    } else {
      const colRef = collection(db, 'notifications');
      const newDocRef = doc(colRef);
      await setDoc(newDocRef, { ...notificationData, id: newDocRef.id });
      return newDocRef.id;
    }
  } catch (error) {
    console.error('Failed to send notification:', error);
    return '';
  }
}

/**
 * Subscribes to real-time notifications filtered by recipient role or user ID.
 */
export function subscribeStaffNotifications(
  role: Role,
  userUid: string | undefined,
  onUpdate: (notifications: AppNotification[]) => void
): () => void {
  const colRef = collection(db, 'notifications');
  
  // Real-time query for role notifications or direct user notifications
  // We query the collection ordered by createdAt descending
  const q = query(colRef, orderBy('createdAt', 'desc'), limit(50));

  const unsub = onSnapshot(
    q,
    (snapshot) => {
      const allNotifs = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as AppNotification[];

      // Filter in memory for role match, userUid match, or admin access
      const relevantNotifs = allNotifs.filter((n) => {
        if (role === 'admin') return true; // Admin receives all staff/system notifications
        if (n.recipientUid && userUid && n.recipientUid === userUid) return true;
        if (n.recipientRole && n.recipientRole === role) return true;
        return false;
      });

      onUpdate(relevantNotifs);
    },
    (error) => {
      console.error('Error listening to notifications:', error);
    }
  );

  return unsub;
}

/**
 * Subscribes to real-time notifications for a guest or specific user.
 */
export function subscribeGuestNotifications(
  recipientUid: string,
  onUpdate: (notifications: AppNotification[]) => void
): () => void {
  const colRef = collection(db, 'notifications');
  const q = query(
    colRef,
    where('recipientUid', '==', recipientUid),
    orderBy('createdAt', 'desc'),
    limit(30)
  );

  const unsub = onSnapshot(
    q,
    (snapshot) => {
      const notifs = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as AppNotification[];
      onUpdate(notifs);
    },
    (error) => {
      console.error('Error listening to guest notifications:', error);
    }
  );

  return unsub;
}

/**
 * Marks a notification as read.
 */
export async function markNotificationAsRead(id: string): Promise<void> {
  try {
    const docRef = doc(db, 'notifications', id);
    await updateDoc(docRef, { isRead: true });
  } catch (error) {
    console.error('Error marking notification as read:', error);
  }
}

/**
 * Marks multiple notifications as read.
 */
export async function markAllNotificationsAsRead(ids: string[]): Promise<void> {
  try {
    await Promise.all(
      ids.map((id) => updateDoc(doc(db, 'notifications', id), { isRead: true }))
    );
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
  }
}

/**
 * Deletes a notification.
 */
export async function deleteNotification(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'notifications', id));
  } catch (error) {
    console.error('Error deleting notification:', error);
  }
}
