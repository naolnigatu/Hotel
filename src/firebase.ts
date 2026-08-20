import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, browserLocalPersistence, browserPopupRedirectResolver } from 'firebase/auth';
import { initializeFirestore, memoryLocalCache } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../firebase-applet-config.json';

const app = !getApps().length ? initializeApp({
  ...firebaseConfig,
  databaseURL: `https://${firebaseConfig.projectId}.firebaseio.com`,
}) : getApp();

// Use initializeAuth with browserLocalPersistence (localStorage) instead of getAuth()
// which defaults to indexedDBLocalPersistence and can throw "Database is closing/hidden" 
// in sandboxed cross-origin iframes.
export const auth = initializeAuth(app, {
  persistence: browserLocalPersistence,
  popupRedirectResolver: browserPopupRedirectResolver
});

// Initialize Firestore with memory cache to avoid IndexedDB sandbox bugs in iframe
// Auto-detect long polling allows seamless WebSocket fallback without hard-forcing timeouts
export const db = initializeFirestore(app, {
  localCache: memoryLocalCache(),
  experimentalAutoDetectLongPolling: true,
}, firebaseConfig.firestoreDatabaseId);

export const storage = getStorage(app);

