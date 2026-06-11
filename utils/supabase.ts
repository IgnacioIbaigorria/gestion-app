
import 'react-native-url-polyfill/auto'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://mujgjoiqhxgqzeuuoltg.supabase.co';
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im11amdqb2lxaHhncXpldXVvbHRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQyMjk0MDQsImV4cCI6MjA1OTgwNTQwNH0.kjdCl3H1OeCktLhiB07HdBc2J2NhoXOwAvR64cBd_ro';
if (!supabaseUrl || !supabaseKey) {
  throw new Error('Supabase URL and Key are required. Please check your .env file.');
}

export const supabase = createClient(
  supabaseUrl,
  supabaseKey,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  })
        