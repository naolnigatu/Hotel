import React, { createContext, useContext, useEffect, useState } from 'react';
import { User as AuthUser, onAuthStateChanged, doc, getDoc, setDoc, auth, db } from '@/lib/supabaseAdapter';
import { User as UserProfile } from '../types';

const ADMIN_EMAIL = 'naolnigatu2025@gmail.com';

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
        const isAdminEmail = user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase() && user.emailVerified;
        const userRef = doc(db, 'users', user.uid);
        
        try {
          const userDoc = await getDoc(userRef);
          if (userDoc.exists()) {
            let data = userDoc.data() as UserProfile;
            // Enforce admin role in database for configured admin email
            if (isAdminEmail && data.role !== 'admin') {
              await setDoc(userRef, { role: 'admin' }, { merge: true });
              data = { ...data, role: 'admin' };
            }
            setUserData(data);
          } else {
            // Auto-provision user profile document in database
            const newUser: UserProfile = {
              uid: user.uid,
              email: user.email || '',
              name: user.displayName || (isAdminEmail ? 'Naol Nigatu' : 'Guest'),
              role: isAdminEmail ? 'admin' : 'guest',
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
            name: user.displayName || 'User',
            role: isAdminEmail ? 'admin' : 'guest',
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
