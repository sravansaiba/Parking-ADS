// import { createClient } from '@supabase/supabase-js';


// const SUPABASE_URL = 'https://kzlkdsryjyjmuduwhhtk.supabase.co';
// const SUPABASE_ANON_KEY = 'sb_publishable_XV29xIRYjtSSCkSHAH4Zkg_-FbDPoXw';

// export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wxvdcyejifnrkejeuksx.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_SbrjXXXd2mDHK7Uzak5gFA_eApJRgCh';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage, 
    autoRefreshToken: true,
    persistSession: true,   
    detectSessionInUrl: false,
  },
});