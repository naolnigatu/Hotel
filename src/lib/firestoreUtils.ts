import { auth, db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';
import { Role } from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function logAuditAction(
  userId: string,
  userName: string,
  userRole: Role,
  action: string,
  module: 'Restaurant' | 'Tables' | 'Menu' | 'Rooms' | 'Reservations' | 'Staff' | 'Hotel Settings' | 'Stations' | 'Housekeeping' | 'CMS',
  details?: string,
  previousValue?: any,
  newValue?: any
) {
  try {
    const auditLogsRef = collection(db, 'audit_logs');
    await addDoc(auditLogsRef, {
      userId,
      userName,
      userRole,
      action,
      module,
      details: details || '',
      previousValue: previousValue ? JSON.stringify(previousValue) : null,
      newValue: newValue ? JSON.stringify(newValue) : null,
      timestamp: Date.now()
    });
  } catch (err) {
    console.warn('Failed to record audit log:', err);
  }
}
