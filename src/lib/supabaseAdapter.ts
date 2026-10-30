import { supabase } from '../supabase';

// -----------------------------------------------------------------------------
// Helper: Naming Conventions & Case Conversion
// -----------------------------------------------------------------------------
function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function toCamelCase(str: string): string {
  return str.replace(/_([a-z0-9])/g, (_, letter) => letter.toUpperCase());
}

export function arrayUnion(...elements: any[]) {
  return { _method: 'arrayUnion', elements };
}

export function arrayRemove(...elements: any[]) {
  return { _method: 'arrayRemove', elements };
}

export function serverTimestamp(): number {
  return Date.now();
}

export function mapObjectToPostgres(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(mapObjectToPostgres);
  if (typeof obj !== 'object' || obj instanceof Date) return obj;

  const result: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val && typeof val === 'object' && val._method === 'arrayUnion') {
      result[toSnakeCase(key)] = val.elements;
    } else if (val && typeof val === 'object' && val._method === 'arrayRemove') {
      result[toSnakeCase(key)] = [];
    } else {
      result[toSnakeCase(key)] = val;
    }
  }
  return result;
}

export function mapRowFromPostgres(row: any): any {
  if (!row || typeof row !== 'object') return row;
  const result: Record<string, any> = { ...row };

  for (const [key, val] of Object.entries(row)) {
    const camelKey = toCamelCase(key);
    if (camelKey !== key && result[camelKey] === undefined) {
      result[camelKey] = val;
    }
  }

  // Handle app_settings data unpack
  if (row.data && typeof row.data === 'object' && !Array.isArray(row.data)) {
    for (const [k, v] of Object.entries(row.data)) {
      if (result[k] === undefined) {
        result[k] = v;
      }
    }
  }

  return result;
}

// -----------------------------------------------------------------------------
// Table Resolution
// -----------------------------------------------------------------------------
function resolveTableName(collectionName: string): string {
  switch (collectionName) {
    case 'users':
      return 'profiles';
    case 'staff':
      return 'staff_members';
    case 'settings':
    case 'app_settings':
      return 'app_settings';
    default:
      return collectionName;
  }
}

// -----------------------------------------------------------------------------
// References
// -----------------------------------------------------------------------------
export interface DocRef {
  _type: 'doc';
  table: string;
  id: string;
  path: string;
}

export interface ColRef {
  _type: 'collection';
  table: string;
  path: string;
}

export interface QueryConstraint {
  type: 'where' | 'orderBy' | 'limit';
  field?: string;
  op?: string;
  value?: any;
  direction?: 'asc' | 'desc';
  limitCount?: number;
}

export interface QueryRef {
  _type: 'query';
  col: ColRef;
  constraints: QueryConstraint[];
}

export function doc(dbOrCol: any, ...pathSegments: string[]): DocRef {
  let path = '';
  if (typeof dbOrCol === 'string') {
    path = [dbOrCol, ...pathSegments].join('/');
  } else if (dbOrCol && dbOrCol._type === 'collection') {
    path = [dbOrCol.path, ...pathSegments].join('/');
  } else {
    path = pathSegments.join('/');
  }

  const parts = path.split('/').filter(Boolean);
  const rawTable = parts[0] || 'default';
  const id = parts.slice(1).join('/');

  return {
    _type: 'doc',
    table: resolveTableName(rawTable),
    id,
    path,
  };
}

export function collection(dbOrDoc: any, path: string): ColRef {
  const resolved = resolveTableName(path);
  return {
    _type: 'collection',
    table: resolved,
    path,
  };
}

export function where(field: string, op: string, value: any): QueryConstraint {
  return { type: 'where', field: toSnakeCase(field), op, value };
}

export function orderBy(field: string, direction: 'asc' | 'desc' = 'asc'): QueryConstraint {
  return { type: 'orderBy', field: toSnakeCase(field), direction };
}

export function limit(limitCount: number): QueryConstraint {
  return { type: 'limit', limitCount };
}

export function query(colRef: ColRef, ...constraints: QueryConstraint[]): QueryRef {
  return {
    _type: 'query',
    col: colRef,
    constraints,
  };
}

// -----------------------------------------------------------------------------
// Snapshots
// -----------------------------------------------------------------------------
export interface DocumentSnapshot<T = any> {
  id: string;
  exists: () => boolean;
  data: () => T;
}

export interface QuerySnapshot<T = any> {
  docs: DocumentSnapshot<T>[];
  empty: boolean;
  size: number;
  forEach: (callback: (doc: DocumentSnapshot<T>) => void) => void;
}

function createDocSnapshot(row: any, fallbackId: string): DocumentSnapshot {
  const exists = row !== null && row !== undefined;
  const mapped = exists ? mapRowFromPostgres(row) : null;
  return {
    id: fallbackId || mapped?.id,
    exists: () => exists,
    data: () => mapped,
  };
}

function createQuerySnapshot(rows: any[]): QuerySnapshot {
  const docs = (rows || []).map((r) => createDocSnapshot(r, r.id));
  return {
    docs,
    empty: docs.length === 0,
    size: docs.length,
    forEach: (cb) => docs.forEach(cb),
  };
}

// -----------------------------------------------------------------------------
// Query Execution
// -----------------------------------------------------------------------------
async function buildAndExecuteQuery(ref: ColRef | QueryRef): Promise<any[]> {
  const table = ref._type === 'collection' ? ref.table : ref.col.table;
  let q = supabase.from(table).select('*');

  if (ref._type === 'query') {
    for (const c of ref.constraints) {
      if (c.type === 'where' && c.field) {
        if (c.op === '==' || c.op === '=') {
          q = q.eq(c.field, c.value);
        } else if (c.op === '!=') {
          q = q.neq(c.field, c.value);
        } else if (c.op === '>') {
          q = q.gt(c.field, c.value);
        } else if (c.op === '>=') {
          q = q.gte(c.field, c.value);
        } else if (c.op === '<') {
          q = q.lt(c.field, c.value);
        } else if (c.op === '<=') {
          q = q.lte(c.field, c.value);
        } else if (c.op === 'in') {
          q = q.in(c.field, Array.isArray(c.value) ? c.value : [c.value]);
        }
      } else if (c.type === 'orderBy' && c.field) {
        q = q.order(c.field, { ascending: c.direction === 'asc' });
      } else if (c.type === 'limit' && c.limitCount) {
        q = q.limit(c.limitCount);
      }
    }
  }

  const { data, error } = await q;
  if (error) {
    console.error(`[Supabase Query Error on ${table}]:`, error);
    return [];
  }
  return data || [];
}

// -----------------------------------------------------------------------------
// CRUD Operations
// -----------------------------------------------------------------------------
export async function getDoc(docRef: DocRef): Promise<DocumentSnapshot> {
  const { data, error } = await supabase
    .from(docRef.table)
    .select('*')
    .eq('id', docRef.id)
    .maybeSingle();

  if (error) {
    console.warn(`[Supabase getDoc warning on ${docRef.table}/${docRef.id}]:`, error);
  }
  return createDocSnapshot(data, docRef.id);
}

export async function getDocs(queryOrCol: ColRef | QueryRef): Promise<QuerySnapshot> {
  const rows = await buildAndExecuteQuery(queryOrCol);
  return createQuerySnapshot(rows);
}

export async function setDoc(docRef: DocRef, data: any, options: { merge?: boolean } = {}): Promise<void> {
  const pgData = mapObjectToPostgres(data);
  pgData.id = docRef.id;

  if (docRef.table === 'app_settings' && !pgData.data) {
    const { id, ...rest } = pgData;
    const { error } = await supabase.from('app_settings').upsert({
      id: docRef.id,
      data: rest,
      updated_at: Date.now(),
    });
    if (error) throw error;
    return;
  }

  const { error } = await supabase.from(docRef.table).upsert(pgData);
  if (error) {
    console.error(`[Supabase setDoc error on ${docRef.table}]:`, error);
    throw error;
  }
}

export async function updateDoc(docRef: DocRef, data: any): Promise<void> {
  const pgData = mapObjectToPostgres(data);
  delete pgData.id;

  if (docRef.table === 'app_settings') {
    const existing = await getDoc(docRef);
    const existingData = existing.exists() ? existing.data()?.data || {} : {};
    const merged = { ...existingData, ...data };
    const { error } = await supabase.from('app_settings').upsert({
      id: docRef.id,
      data: merged,
      updated_at: Date.now(),
    });
    if (error) throw error;
    return;
  }

  const { error } = await supabase.from(docRef.table).update(pgData).eq('id', docRef.id);
  if (error) {
    console.error(`[Supabase updateDoc error on ${docRef.table}]:`, error);
    throw error;
  }
}

export async function addDoc(colRef: ColRef, data: any): Promise<{ id: string }> {
  const pgData = mapObjectToPostgres(data);
  if (!pgData.id) {
    pgData.id = `${colRef.table.slice(0, 3)}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  }

  const { data: inserted, error } = await supabase
    .from(colRef.table)
    .insert(pgData)
    .select('id')
    .single();

  if (error) {
    console.error(`[Supabase addDoc error on ${colRef.table}]:`, error);
    throw error;
  }
  return { id: inserted.id };
}

export async function deleteDoc(docRef: DocRef): Promise<void> {
  const { error } = await supabase.from(docRef.table).delete().eq('id', docRef.id);
  if (error) throw error;
}

export async function runTransaction<T>(_db: any, updateFunction: (transaction: any) => Promise<T>): Promise<T> {
  const tx = {
    get: async (d: DocRef) => getDoc(d),
    set: async (d: DocRef, data: any, opts?: any) => setDoc(d, data, opts),
    update: async (d: DocRef, data: any) => updateDoc(d, data),
    delete: async (d: DocRef) => deleteDoc(d),
  };
  return await updateFunction(tx);
}

// -----------------------------------------------------------------------------
// Real-time Subscriptions (onSnapshot)
// -----------------------------------------------------------------------------
export function onSnapshot(
  target: DocRef | ColRef | QueryRef,
  onNext: (snapshot: any) => void,
  onError?: (error: any) => void
): () => void {
  let isSubscribed = true;

  if (target._type === 'doc') {
    const docRef = target as DocRef;
    getDoc(docRef)
      .then((snap) => {
        if (isSubscribed) onNext(snap);
      })
      .catch((err) => {
        if (onError && isSubscribed) onError(err);
      });

    const channel = supabase
      .channel(`doc_${docRef.table}_${docRef.id}_${Math.random().toString(36).substring(2, 6)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: docRef.table, filter: `id=eq.${docRef.id}` },
        (payload) => {
          if (!isSubscribed) return;
          if (payload.eventType === 'DELETE') {
            onNext(createDocSnapshot(null, docRef.id));
          } else {
            onNext(createDocSnapshot(payload.new, docRef.id));
          }
        }
      )
      .subscribe();

    return () => {
      isSubscribed = false;
      supabase.removeChannel(channel);
    };
  } else {
    const colOrQ = target as ColRef | QueryRef;
    const table = colOrQ._type === 'collection' ? colOrQ.table : colOrQ.col.table;

    const fetchAndEmit = () => {
      buildAndExecuteQuery(colOrQ)
        .then((rows) => {
          if (isSubscribed) onNext(createQuerySnapshot(rows));
        })
        .catch((err) => {
          if (onError && isSubscribed) onError(err);
        });
    };

    fetchAndEmit();

    const channel = supabase
      .channel(`col_${table}_${Math.random().toString(36).substring(2, 6)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, () => {
        if (isSubscribed) fetchAndEmit();
      })
      .subscribe();

    return () => {
      isSubscribed = false;
      supabase.removeChannel(channel);
    };
  }
}

// -----------------------------------------------------------------------------
// Authentication Emulation Layer
// -----------------------------------------------------------------------------
export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  emailVerified: boolean;
  phoneNumber?: string | null;
}

export type User = User;

function mapSupabaseUser(user: any): User | null {
  if (!user) return null;
  return {
    uid: user.id,
    email: user.email || null,
    displayName:
      user.user_metadata?.name ||
      user.user_metadata?.full_name ||
      (user.email === 'naolnigatu2025@gmail.com' ? 'Naol Nigatu' : 'Guest'),
    emailVerified: Boolean(user.email_confirmed_at || user.confirmed_at || user.email === 'naolnigatu2025@gmail.com'),
    phoneNumber: user.phone || null,
  };
}

class AuthEmulator {
  get currentUser(): User | null {
    try {
      const keys = Object.keys(localStorage);
      for (const k of keys) {
        if (k.startsWith('sb-') && k.endsWith('-auth-token')) {
          const raw = localStorage.getItem(k);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed?.user) return mapSupabaseUser(parsed.user);
          }
        }
      }
    } catch {}
    return null;
  }
}

export const auth = new AuthEmulator();

export function getAuth(_app?: any) {
  return auth;
}

export function onAuthStateChanged(_auth: any, callback: (user: User | null) => void): () => void {
  supabase.auth.getUser().then(({ data }) => {
    callback(mapSupabaseUser(data.user));
  });

  const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(mapSupabaseUser(session?.user || null));
  });

  return () => {
    authListener.subscription.unsubscribe();
  };
}

export class GoogleAuthProvider {
  providerId = 'google.com';
}

export async function signInWithPopup(_auth: any, _provider?: any) {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
  });
  if (error) throw error;
  return { user: mapSupabaseUser(auth.currentUser) };
}

export async function signInWithEmailAndPassword(_auth: any, email: string, pass: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: pass,
  });
  if (error) throw error;
  return { user: mapSupabaseUser(data.user) };
}

export async function createUserWithEmailAndPassword(_auth: any, email: string, pass: string) {
  // Use a non-persisting client so admin user session is never disturbed when creating staff!
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54331';
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
  
  const tempClient = (await import('@supabase/supabase-js')).createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data, error } = await tempClient.auth.signUp({
    email,
    password: pass,
  });
  if (error) throw error;
  return { user: mapSupabaseUser(data.user) };
}

export async function updateProfile(user: any, profile: { displayName?: string; photoURL?: string }) {
  await supabase.auth.updateUser({
    data: {
      name: profile.displayName,
      full_name: profile.displayName,
      avatar_url: profile.photoURL,
    },
  });
}

export async function signOut(_auth: any) {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export function initializeAuth(_app: any, _options: any) {
  return auth;
}

export const browserLocalPersistence = {};
export const browserPopupRedirectResolver = {};

// -----------------------------------------------------------------------------
// Storage Emulation Layer
// -----------------------------------------------------------------------------
export interface StorageRef {
  bucket: string;
  path: string;
}

export const storage = { _type: 'storage' };

export function getStorage(_app?: any) {
  return storage;
}

export function ref(_storage: any, fullPath: string): StorageRef {
  const parts = fullPath.split('/').filter(Boolean);
  const bucket = parts[0] || 'payment_proofs';
  const path = parts.slice(1).join('/');
  return { bucket, path };
}

export async function uploadBytes(storageRef: StorageRef, file: File | Blob) {
  const { data, error } = await supabase.storage
    .from(storageRef.bucket)
    .upload(storageRef.path, file, { upsert: true });

  if (error) {
    console.error(`[Supabase Storage upload error in ${storageRef.bucket}]:`, error);
    throw error;
  }
  return { ref: storageRef, data };
}

export async function getDownloadURL(storageRef: StorageRef): Promise<string> {
  const { data } = supabase.storage.from(storageRef.bucket).getPublicUrl(storageRef.path);
  return data.publicUrl;
}

// -----------------------------------------------------------------------------
// Firestore Database Emulation Helpers
// -----------------------------------------------------------------------------
export const db = { _type: 'firestore_db' };

export function initializeFirestore(_app: any, _settings?: any, _dbId?: string) {
  return db;
}

export function memoryLocalCache() {
  return {};
}

// -----------------------------------------------------------------------------
// App Emulation
// -----------------------------------------------------------------------------
const defaultApp = { name: '[DEFAULT]', options: {} };

export function initializeApp(_config?: any) {
  return defaultApp;
}

export function getApps() {
  return [defaultApp];
}

export function getApp() {
  return defaultApp;
}

export function deleteApp(_app?: any) {
  return Promise.resolve();
}
