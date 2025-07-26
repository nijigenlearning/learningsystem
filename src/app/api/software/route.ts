import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

// 既存のソフト名一覧を取得
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('materials')
      .select('software')
      .not('software', 'is', null)
      .not('software', 'eq', '');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 重複を除去してソフト名の配列を作成
    const softwareList = [...new Set(data.map(item => item.software))].sort();
    
    return NextResponse.json(softwareList);
  } catch (err) {
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
} 