/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

// 👇 加上 as string 告訴 TS 這一定是字串
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseKey) {
  console.error("🚨 找不到 Supabase 環境變數，請確認 .env.local 設定是否正確！");
}

export const supabase = createClient(supabaseUrl, supabaseKey);