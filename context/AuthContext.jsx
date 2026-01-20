'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({
  user: null,
  userRole: null,
  userData: null,
  loading: true,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        // Fetch user role and details from Supabase
        try {
          const { data, error } = await supabase
            .from('users')
            .select('role, name, avatar_url, total_points')
            .eq('user_id', firebaseUser.uid)
            .single();

          if (data && !error) {
            setUserRole(data.role);
            setUserData(data);
          } else {
            // User exists in Firebase but not in Supabase - sign them out
            console.error('User not found in database, signing out:', error);
            await auth.signOut();
            setUserRole(null);
            setUserData(null);
            setUser(null);
          }
        } catch (err) {
          console.error('Exception fetching user data:', err);
          // Sign out on error to be safe
          await auth.signOut();
          setUserRole(null);
          setUserData(null);
          setUser(null);
        }
      } else {
        setUserRole(null);
        setUserData(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, userRole, userData, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
