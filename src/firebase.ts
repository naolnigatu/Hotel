import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, browserLocalPersistence, browserPopupRedirectResolver } from 'firebase/auth';
import { getFirestore, enableMultiTabIndexedDbPersistence, initializeFirestore, CACHE_SIZE_UNLIMITED } from 'firebase/firestore';
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

// Initialize Firestore with memory cache to handle offline/iframe environments better
// We avoid IndexedDB because it crashes the iframe in AI Studio with "Database is closing"
import { memoryLocalCache } from 'firebase/firestore';

export const db = initializeFirestore(app, {
  localCache: memoryLocalCache(),
  experimentalForceLongPolling: true,
}, firebaseConfig.firestoreDatabaseId);

export const storage = getStorage(app);
