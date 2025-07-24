import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

// 教材一覧を取得（一般ユーザーもアクセス可能）
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('materials')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}

// 新しい教材を作成（管理者のみ）
export async function POST(req: NextRequest) {
  try {
    const { title, description, youtube_url } = await req.json();

    // 管理者権限チェック
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
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

    // YouTube URLからIDを抽出
    let youtube_id = null;
    if (youtube_url) {
      const match = youtube_url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
      youtube_id = match ? match[1] : null;
    }

    const { data, error } = await supabase
      .from('materials')
      .insert([
        {
          title,
          description,
          youtube_url,
          youtube_id
        }
      ])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
} 