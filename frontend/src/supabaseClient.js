import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase konfiqurasiyası tapılmadı! VITE_SUPABASE_URL və ya VITE_SUPABASE_ANON_KEY mühit dəyişənlərini yoxlayın.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);