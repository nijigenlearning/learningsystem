import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  // 管理者のみ許可
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
  // ロール確認
  const { user } = data;
  if (!user) {
    return NextResponse.json({ error: 'ユーザーが見つかりません' }, { status: 401 });
  }
  // 管理者のみ許可
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();
  if (profile?.role !== 'ADMIN') {
    return NextResponse.json({ error: '管理者のみログイン可能です' }, { status: 403 });
  }
  return NextResponse.json({ user });
} 