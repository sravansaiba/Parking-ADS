// import { create } from 'zustand';
// import { supabase } from '../services/supabase';

// type AppUser = {
//   id: string;
//   email: string | null;
//   tenant_id: string | null;
//   name: string;
//   role: string;
// };

// type AuthState = {
//   user: AppUser | null;
//   loading: boolean;
//   setUser: (user: AppUser | null) => void;
//   signOut: () => Promise<void>;
//   init: () => void;
// };

// export const useAuthStore = create<AuthState>((set) => ({
//   user: null,
//   loading: true,

//   setUser: (user) => set({ user, loading: false }),

//   signOut: async () => {
//     await supabase.auth.signOut();
//     set({ user: null });
//   },

//   init: async () => {
//     const { data } = await supabase.auth.getSession();
//     const authUser = data.session?.user;

//     if (!authUser) {
//       set({ user: null, loading: false });
//       return;
//     }

//     // 1. Fetch User Data from app_users table
//     const { data: appUser, error } = await supabase
//       .from('app_users')
//       .select('id, tenant_id, name, role')
//       .eq('id', authUser.id)
//       .single();

//     if (error || !appUser) {
//       console.error("AuthStore Error: No app_user record found for this ID.");
//       set({ user: null, loading: false });
//       return;
//     }

//     // 2. Log a warning if tenant_id is missing in the database
//     if (!appUser.tenant_id) {
//       console.warn("⚠️ DATABASE WARNING: User exists but has no tenant_id assigned in app_users table.");
//     }

//     // 3. Set the user state
//     set({
//       user: {
//         id: authUser.id,
//         email: authUser.email ?? null,
//         tenant_id: appUser.tenant_id, 
//         name: appUser.name,
//         role: appUser.role,
//       },
//       loading: false,
//     });

//     // 4. Listen for Auth Changes (Login/Logout)
//     supabase.auth.onAuthStateChange(async (_event, session) => {
//       if (!session?.user) {
//         set({ user: null, loading: false });
//         return;
//       }

//       const { data: updatedAppUser } = await supabase
//         .from('app_users')
//         .select('id, tenant_id, name, role')
//         .eq('id', session.user.id)
//         .single();

//       if (updatedAppUser) {
//         set({
//           user: {
//             id: session.user.id,
//             email: session.user.email ?? null,
//             tenant_id: updatedAppUser.tenant_id,
//             name: updatedAppUser.name,
//             role: updatedAppUser.role,
//           },
//           loading: false,
//         });
//       }
//     });
//   },
// }));



import { create } from 'zustand';
import { supabase } from '../services/supabase';

type AppUser = {
  id: string;
  email: string | null;
  tenant_id: string | null;
  name: string;
  role: string;
};

type AuthState = {
  user: AppUser | null;
  loading: boolean;
  error: string | null;
  setUser: (user: AppUser | null) => void;
  signOut: () => Promise<void>;
  init: () => Promise<void>;
  clearError: () => void;
};

const fetchAppUser = async (authUserId: string, email: string | null | undefined): Promise<AppUser | null> => {
  const { data, error } = await supabase
    .from('app_users')
    .select('id, tenant_id, name, role')
    .eq('id', authUserId)
    .single();

  if (error) {
    console.error('AuthStore: Error fetching app_user:', error);
    throw new Error('Could not connect to user database. Please try again.');
  }

  if (!data) {
    console.warn('AuthStore: No app_user record found for', authUserId);
    return null;
  }

  if (!data.tenant_id) {
    console.warn('⚠️ User has no tenant_id in app_users table');
  }

  return {
    id: authUserId,
    email: email ?? null,
    tenant_id: data.tenant_id,
    name: data.name,
    role: data.role,
  };
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: true,
  error: null,

  setUser: (user) => set({ user, loading: false, error: null }),

  signOut: async () => {
    try {
      await supabase.auth.signOut();
      set({ user: null, loading: false, error: null });
    } catch (err) {
      console.error('Sign out error:', err);
      set({ user: null, loading: false });
    }
  },

  clearError: () => set({ error: null }),

  init: async () => {
    // Prevent multiple initializations if already loading
    if (!get().loading && get().user) return;

    set({ loading: true, error: null });

    const timeout = (ms: number) =>
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Connection timed out. Please check your internet.')), ms)
      );

    try {
      // 1. Check for session with a 10s timeout
      const sessionResult = await Promise.race([
        supabase.auth.getSession(),
        timeout(10000)
      ]) as any;

      const session = sessionResult.data?.session;

      if (session?.user) {
        // Fetch user data with another timeout
        const appUser = await Promise.race([
          fetchAppUser(session.user.id, session.user.email),
          timeout(8000)
        ]) as AppUser | null;
        
        set({ user: appUser, loading: false });
      } else {
        set({ user: null, loading: false });
      }

      // 2. Setup Auth Change Listener
      supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_OUT' || !session?.user) {
          set({ user: null, loading: false });
          return;
        }

        if (
          event === 'SIGNED_IN' ||
          event === 'TOKEN_REFRESHED' ||
          event === 'USER_UPDATED'
        ) {
          try {
            const appUser = await fetchAppUser(session.user.id, session.user.email);
            set({ user: appUser, loading: false });
          } catch (err) {
            console.error('Auth change user fetch error:', err);
          }
        }
      });

    } catch (err: any) {
      console.error('AuthStore Initialization Error:', err);
      set({ 
        error: err.message || 'Failed to initialize application', 
        loading: false,
        user: null // Fallback to login screen
      });
    }
  },
}));