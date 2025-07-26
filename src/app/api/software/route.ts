import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

// 既存のソフト名一覧を取得
export async function GET() {
  try {
    console.log('ソフトウェアAPI: データベースからソフトウェア一覧を取得中...');
    
    const { data, error } = await supabase
      .from('materials')
      .select('software')
      .not('software', 'is', null)
      .not('software', 'eq', '');

    if (error) {
      console.error('ソフトウェアAPI: エラーが発生しました:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('ソフトウェアAPI: 取得したデータ:', data);

    // 重複を除去してソフト名の配列を作成
    const softwareList = [...new Set(data.map(item => item.software))].sort();
    
    console.log('ソフトウェアAPI: 最終的なソフトウェア一覧:', softwareList);
    
    return NextResponse.json(softwareList);
  } catch (err) {
    console.error('ソフトウェアAPI: サーバーエラー:', err);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
} 