import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

// 教材一覧取得（誰でも可）
export async function GET() {
  const { data, error } = await supabase
    .from('materials')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

// 教材新規作成（管理者のみ）
export async function POST(req: NextRequest) {
  // 認証チェック（管理者のみ）
  const { user } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();
  if (profile?.role !== 'ADMIN') {
    return NextResponse.json({ error: '管理者のみ作成可能です' }, { status: 403 });
  }
  const body = await req.json();
  const { data, error } = await supabase.from('materials').insert([body]).select().single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json(data);
} 