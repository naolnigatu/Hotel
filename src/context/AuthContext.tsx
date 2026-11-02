import React, { createContext, useContext, useEffect, useState } from 'react';
import { User as AuthUser, onAuthStateChanged, doc, getDoc, setDoc, auth, db } from '@/lib/supabaseAdapter';
import { User as UserProfile } from '../types';

const ADMIN_EMAILS = [
  'naolnigatu2025@gmail.com',
  'admin@wolisohotel.com',
];

interface AuthContextType {
  currentUser: AuthUser | null;
  userData: UserProfile | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  userData: null,
  loading: true,
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [userData, setUserData] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      if (user) {
        const userEmail = user.email?.toLowerCase() || '';
        const isAdminEmail = ADMIN_EMAILS.includes(userEmail) && user.emailVerified;
        const isExplicitAdmin = isAdminEmail || (user as any).user_metadata?.role === 'admin' || (user as any).app_metadata?.role === 'admin';
        const userRef = doc(db, 'users', user.uid);
        
        try {
          const userDoc = await getDoc(userRef);
          if (userDoc.exists()) {
            let data = userDoc.data() as UserProfile;
            // Enforce admin role in database for configured admin email / metadata
            if (isExplicitAdmin && data.role !== 'admin') {
              await setDoc(userRef, { role: 'admin' }, { merge: true });
              data = { ...data, role: 'admin' };
            }
            setUserData(data);
          } else {
            // Auto-provision user profile document in database
            const newUser: UserProfile = {
              uid: user.uid,
              email: user.email || '',
              name: user.displayName || (userEmail === 'admin@wolisohotel.com' ? 'System Admin' : userEmail === 'naolnigatu2025@gmail.com' ? 'Naol Nigatu' : 'Guest'),
              role: isExplicitAdmin ? 'admin' : ((user as any).user_metadata?.role || 'guest'),
              createdAt: Date.now(),
            };
            await setDoc(userRef, newUser);
            setUserData(newUser);
          }
        } catch (err) {
          console.error("Error fetching or initializing user profile in database:", err);
          // Fallback in memory if database fails due to network/rules before record exists
          setUserData({
            uid: user.uid,
            email: user.email || '',
            name: user.displayName || (isExplicitAdmin ? (userEmail === 'admin@wolisohotel.com' ? 'System Admin' : 'Naol Nigatu') : 'User'),
            role: isExplicitAdmin ? 'admin' : ((user as any).user_metadata?.role || 'guest'),
            createdAt: Date.now(),
          });
        }
      } else {
        setUserData(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ currentUser, userData, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
