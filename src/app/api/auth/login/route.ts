import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const { user } = data;
    if (!user) {
      return NextResponse.json({ error: 'ユーザーが見つかりません' }, { status: 401 });
    }

    // 管理者権限をチェック
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'ADMIN') {
      return NextResponse.json({ error: '管理者のみログイン可能です' }, { status: 403 });
    }

    return NextResponse.json({ user });
  } catch (err) {
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
} 