import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Role } from '../types';

export interface LogAuditParams {
  userId: string;
  userName: string;
  userRole: Role;
  action: string;
  module: string;
  details?: string;
  previousValue?: any;
  newValue?: any;
}

export async function logAuditAction(
  userIdOrParams: string | LogAuditParams,
  userName?: string,
  userRole?: Role,
  action?: string,
  module?: string,
  details?: string
): Promise<void> {
  try {
    if (typeof userIdOrParams === 'object') {
      await addDoc(collection(db, 'audit_logs'), {
        ...userIdOrParams,
        timestamp: Date.now()
      });
    } else {
      await addDoc(collection(db, 'audit_logs'), {
        userId: userIdOrParams,
        userName: userName || 'System User',
        userRole: userRole || 'admin',
        action: action || 'Action',
        module: module || 'General',
        details: details || '',
        timestamp: Date.now()
      });
    }
  } catch (error) {
    console.error('Failed to log audit action:', error);
  }
}
