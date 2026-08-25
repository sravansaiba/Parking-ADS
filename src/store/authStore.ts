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
      console.error('AuthStore: No app_user found for', authUserId, error);
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
    await supabase.auth.signOut();
    set({ user: null, loading: false, error: null });
  },

  // ✅ init() — call ONCE on app start in root component
  init: async () => {
    set({ loading: true });

    try {
      // 1. Manage Supabase autoRefreshToken on AppState change (foreground/background)
      AppState.addEventListener('change', (state) => {
        if (state === 'active') {
          supabase.auth.startAutoRefresh();
        } else {
          supabase.auth.stopAutoRefresh();
        }
      });

      // 2. Check if there's already a valid persisted session (from AsyncStorage)
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        const appUser = await fetchAppUser(session.user.id, session.user.email);
        if (appUser) {
          set({ user: appUser, loading: false });
        } else {
          // Fallback to auth session metadata if database network call fails temporarily
          const fallbackUser: AppUser = {
            id: session.user.id,
            email: session.user.email ?? null,
            tenant_id: session.user.user_metadata?.tenant_id ?? null,
            name: session.user.user_metadata?.name ?? session.user.email?.split('@')[0] ?? 'User',
            role: session.user.user_metadata?.role ?? 'STAFF',
          };
          set({ user: fallbackUser, loading: false });
        }
      } else {
        set({ user: null, loading: false });
      }

      // 3. Listen for all future auth changes — TOKEN_REFRESHED, SIGNED_IN, SIGNED_OUT, etc.
      supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_OUT' || !session?.user) {
          set({ user: null, loading: false });
          return;
        }

        if (session?.user) {
          const appUser = await fetchAppUser(session.user.id, session.user.email);
          if (appUser) {
            set({ user: appUser, loading: false });
          } else {
            const currentUser = get().user;
            if (!currentUser) {
              const fallbackUser: AppUser = {
                id: session.user.id,
                email: session.user.email ?? null,
                tenant_id: session.user.user_metadata?.tenant_id ?? null,
                name: session.user.user_metadata?.name ?? session.user.email?.split('@')[0] ?? 'User',
                role: session.user.user_metadata?.role ?? 'STAFF',
              };
              set({ user: fallbackUser, loading: false });
            } else {
              set({ loading: false });
            }
          }
        }
      });
    } catch (err: any) {
      console.error('AuthStore Initialization Error:', err);
      set({
        error: err?.message || 'Failed to initialize application',
        loading: false,
        user: null,
      });
    }
  },
}));