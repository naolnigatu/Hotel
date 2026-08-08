import React, { createContext, useContext, useEffect, useState } from 'react';
import { User as FirebaseUser, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { User } from '../types';

const ADMIN_EMAIL = 'naolnigatu2025@gmail.com';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userData: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  userData: null,
  loading: true,
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      if (user) {
        const isAdminEmail = user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
        const userRef = doc(db, 'users', user.uid);
        
        try {
          const userDoc = await getDoc(userRef);
          if (userDoc.exists()) {
            let data = userDoc.data() as User;
            // Enforce admin role in Firestore for configured admin email
            if (isAdminEmail && data.role !== 'admin') {
              await setDoc(userRef, { role: 'admin' }, { merge: true });
              data = { ...data, role: 'admin' };
            }
            setUserData(data);
          } else {
            // Auto-provision user profile document in Firestore
            const newUser: User = {
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
          console.error("Error fetching or initializing user profile in Firestore:", err);
          // Fallback in memory if Firestore fails due to network/rules before record exists
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
