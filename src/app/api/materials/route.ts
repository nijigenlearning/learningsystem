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
  } catch {
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}

// 新しい教材を作成（管理者のみ）
export async function POST(req: NextRequest) {
  try {
    console.log('POST /api/materials - 開始');
    
    const body = await req.json();
    console.log('リクエストボディ:', body);
    
    const { title, video_title, description, youtube_url, thumbnail, software, instruction, note, office } = body;
    
    // descriptionカラムが存在しないため、video_descriptionとして保存
    const video_description = description;

    // 開発段階では認証を一時的に無効化
    // TODO: 本番環境では認証を有効にする
    /*
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
    */

    // YouTube URLからIDを抽出
    let youtube_id = null;
    if (youtube_url) {
      const match = youtube_url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
      youtube_id = match ? match[1] : null;
    }

    console.log('Supabaseに挿入するデータ:', {
      title,
      video_title,
      video_description,
      youtube_url,
      youtube_id,
      thumbnail,
      software,
      instruction,
      note,
      office,
      video_registration: 'completed',
      text_registration: 'pending',
      text_revision: 'pending',
      image_registration: 'pending',
      confirmation: 'pending'
    });

    const { data, error } = await supabase
      .from('materials')
      .insert([
        {
          title,
          video_title,
          video_description,
          youtube_url,
          youtube_id,
          thumbnail,
          software,
          instruction,
          note,
          office,
          video_registration: 'completed', // STEP1完了
          text_registration: 'pending',    // STEP2未着手
          text_revision: 'pending',        // STEP3未着手
          image_registration: 'pending',   // STEP4未着手
          confirmation: 'pending'          // STEP5未着手
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Supabaseエラー:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('教材登録成功:', data);
    return NextResponse.json(data);
  } catch (err) {
    console.error('予期しないエラー:', err);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
} 