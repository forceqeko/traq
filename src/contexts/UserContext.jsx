import { createContext, useContext, useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getRoleLabel, getRoleBadgeClass } from '@/lib/services/userService';

const UserContext = createContext({
  user: null,
  profile: null,
  username: '',
  role: 'user',
  isSuperAdmin: false,
  isAdmin: false,
  loading: true,
  setUser: () => {},
  setProfile: () => {},
  signOut: () => {},
  getRoleLabel: () => 'User',
  getRoleBadgeClass: () => 'badge-user',
});

export function UserProvider({ children, initialUser = null, initialProfile = null }) {
  const [user, setUser] = useState(initialUser);
  const [profile, setProfile] = useState(initialProfile);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    // Periksa sesi aktif
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        fetchProfile(session.user.id, session.user);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        fetchProfile(session.user.id, session.user);
      } else {
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId, userObj = null) => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      const userMeta = userObj?.user_metadata || user?.user_metadata || {};
      const derivedUsername =
        data?.username ||
        userMeta?.username ||
        (userObj?.email ? userObj.email.split('@')[0] : '') ||
        (data?.email ? data.email.split('@')[0] : '') ||
        'user';

      let userRole = data?.role || userMeta?.role || 'user';
      if (userRole === 'petugas') userRole = 'user';

      if (!error && data) {
        setProfile({
          ...data,
          role: userRole,
          username: derivedUsername,
        });
      } else {
        setProfile({
          id: userId,
          full_name: userMeta?.full_name || 'Petugas Data',
          role: userRole,
          username: derivedUsername,
          email: userObj?.email || `${derivedUsername}@podqes.web.id`,
        });
      }
    } catch {
      const userMeta = userObj?.user_metadata || user?.user_metadata || {};
      const derivedUsername = userMeta?.username || (userObj?.email ? userObj.email.split('@')[0] : 'user');
      let userRole = userMeta?.role || 'user';
      if (userRole === 'petugas') userRole = 'user';

      setProfile({
        id: userId,
        full_name: userMeta?.full_name || 'Petugas Data',
        role: userRole,
        username: derivedUsername,
        email: userObj?.email || `${derivedUsername}@podqes.web.id`,
      });
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  // Penentuan hak akses role baru
  let rawRole = user?.user_metadata?.role || profile?.role || 'user';
  if (rawRole === 'petugas') rawRole = 'user';

  const role = rawRole;
  const isSuperAdmin = role === 'super_admin';
  const isAdmin = role === 'super_admin' || role === 'admin';

  const username =
    profile?.username ||
    user?.user_metadata?.username ||
    (user?.email ? user.email.split('@')[0] : '');

  return (
    <UserContext.Provider
      value={{
        user,
        profile,
        username,
        role,
        isSuperAdmin,
        isAdmin,
        loading,
        setUser,
        setProfile,
        signOut,
        getRoleLabel,
        getRoleBadgeClass,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
