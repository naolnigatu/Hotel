import React, { createContext, useContext, useEffect, useState } from 'react';
import { User as AuthUser, onAuthStateChanged, doc, getDoc, setDoc, auth, db } from '@/lib/supabaseAdapter';
import { User as UserProfile } from '../types';

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
        const userRef = doc(db, 'users', user.uid);
        const metadata = (user as any).user_metadata || {};
        const verifiedName = user.displayName || metadata.full_name || metadata.name || 'Guest';
        const verifiedAvatar = metadata.avatar_url || metadata.picture || undefined;

        try {
          const userDoc = await getDoc(userRef);
          if (userDoc.exists()) {
            const data = userDoc.data() as UserProfile;
            // Keep verified name and avatar up to date with Google account
            if (verifiedAvatar && !data.avatar) {
              await setDoc(userRef, { avatar: verifiedAvatar }, { merge: true });
              data.avatar = verifiedAvatar;
            }
            setUserData(data);
          } else {
            // New user registration: apply RBAC default role 'guest'
            // Google Sign-In strictly defaults to 'guest' and never automatically grants administrative privileges
            const newUser: UserProfile = {
              uid: user.uid,
              email: user.email || '',
              name: verifiedName,
              role: (metadata.role as any) === 'admin' ? 'admin' : 'guest',
              avatar: verifiedAvatar,
              createdAt: Date.now(),
            };
            await setDoc(userRef, newUser);
            setUserData(newUser);
          }
        } catch (err) {
          console.error("Error fetching or initializing user profile in database:", err);
          setUserData({
            uid: user.uid,
            email: user.email || '',
            name: verifiedName,
            role: 'guest',
            avatar: verifiedAvatar,
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
