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
import { AppState } from 'react-native';
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
  try {
    const { data, error } = await supabase
      .from('app_users')
      .select('id, tenant_id, name, role')
      .eq('id', authUserId)
      .single();

    if (error || !data) {
      console.warn('AuthStore: Could not fetch app_user record:', error?.message || error);
      return null;
    }

    return {
      id: data.id,
      email: email ?? null,
      tenant_id: data.tenant_id,
      name: data.name ?? 'User',
      role: data.role ?? 'STAFF',
    };
  } catch (err) {
    console.error('AuthStore: Exception in fetchAppUser', err);
    return null;
  }
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: true,
  error: null,

  setUser: (user: AppUser | null) => set({ user, loading: false, error: null }),

  clearError: () => set({ error: null }),

  signOut: async () => {
    try {
      set({ user: null, loading: false, error: null });
      await Promise.race([
        supabase.auth.signOut(),
        new Promise((res) => setTimeout(res, 2000)),
      ]);
    } catch (e) {
      console.warn("SignOut error:", e);
    } finally {
      set({ user: null, loading: false, error: null });
    }
  },

  init: async () => {
    try {
      // 1. Manage Supabase autoRefreshToken on AppState change (foreground/background)
      AppState.addEventListener('change', (state) => {
        if (state === 'active') {
          supabase.auth.startAutoRefresh();
        } else {
          supabase.auth.stopAutoRefresh();
        }
      });

      // 2. Check if there's already a valid persisted session with a strict 2-second timeout
      const sessionPromise = supabase.auth.getSession();
      const sessionTimeoutPromise = new Promise<{ data: { session: any }; error: any }>((resolve) =>
        setTimeout(() => resolve({ data: { session: null }, error: null }), 2000)
      );

      const sessionResult = (await Promise.race([sessionPromise, sessionTimeoutPromise])) as any;
      const session = sessionResult?.data?.session;

      if (session?.user) {
        const appUser = await fetchAppUser(session.user.id, session.user.email);
        if (appUser) {
          set({ user: appUser, loading: false, error: null });
        } else {
          // Fallback to auth session metadata if database network call fails temporarily
          const fallbackUser: AppUser = {
            id: session.user.id,
            email: session.user.email ?? null,
            tenant_id: session.user.user_metadata?.tenant_id ?? null,
            name: session.user.user_metadata?.name ?? session.user.email?.split('@')[0] ?? 'User',
            role: session.user.user_metadata?.role ?? 'STAFF',
          };
          set({ user: fallbackUser, loading: false, error: null });
        }
      } else {
        set({ user: null, loading: false, error: null });
      }

      // 3. Listen for all future auth changes — TOKEN_REFRESHED, SIGNED_IN, SIGNED_OUT, etc.
      supabase.auth.onAuthStateChange(async (event, currentSession) => {
        if (event === 'SIGNED_OUT' || !currentSession?.user) {
          set({ user: null, loading: false });
          return;
        }

        if (
          event === 'SIGNED_IN' ||
          event === 'TOKEN_REFRESHED' ||
          event === 'USER_UPDATED' ||
          event === 'INITIAL_SESSION'
        ) {
          const currentUser = get().user;
          const appUser = await fetchAppUser(currentSession.user.id, currentSession.user.email);
          if (appUser) {
            set({ user: appUser, loading: false });
          } else if (currentUser && currentUser.id === currentSession.user.id) {
            set({ loading: false });
          } else {
            const fallbackUser: AppUser = {
              id: currentSession.user.id,
              email: currentSession.user.email ?? null,
              tenant_id: currentSession.user.user_metadata?.tenant_id ?? null,
              name: currentSession.user.user_metadata?.name ?? currentSession.user.email?.split('@')[0] ?? 'User',
              role: currentSession.user.user_metadata?.role ?? 'STAFF',
            };
            set({ user: fallbackUser, loading: false });
          }
        }
      });
    } catch (err: any) {
      console.error('AuthStore Initialization Error:', err);
      set({
        error: null,
        loading: false,
        user: null,
      });
    } finally {
      // Ensure loading is ALWAYS false so the app is never stuck on a spinner
      set((state) => ({ loading: false }));
    }
  },
}));