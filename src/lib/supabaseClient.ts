import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase環境変数が設定されていません:');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl);
  console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? '設定済み' : '未設定');
  throw new Error('Supabase環境変数が設定されていません。.env.localファイルを確認してください。');
}

// シングルトンインスタンスを保持する変数
let supabaseInstance: ReturnType<typeof createClient> | null = null;
let supabaseAdminInstance: ReturnType<typeof createClient> | null = null;

// クライアントサイド用（RLSポリシーが適用される）
export const supabase = (() => {
  // クライアントサイドでのみシングルトンを適用
  if (typeof window !== 'undefined') {
    if (!supabaseInstance) {
      supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
    }
    return supabaseInstance;
  }
  // サーバーサイドでは毎回新しいインスタンスを作成
  return createClient(supabaseUrl, supabaseAnonKey);
})();

// サーバーサイド用（RLSポリシーをバイパス）
export const supabaseAdmin = (() => {
  // サーバーサイドでのみシングルトンを適用
  if (typeof window === 'undefined') {
    if (!supabaseAdminInstance) {
      supabaseAdminInstance = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      });
    }
    return supabaseAdminInstance;
  }
  // クライアントサイドでは毎回新しいインスタンスを作成
  return createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
})(); 