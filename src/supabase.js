import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://foqjsbtufiwxfaymdrwx.supabase.co'
const SUPABASE_KEY = 'sb_publishable_YOoKOubRazLHcwbTVUHk0Q_AX5O9yjb'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
