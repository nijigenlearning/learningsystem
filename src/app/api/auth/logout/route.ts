import { NextResponse } from 'next/server';

export async function POST() {
  try {
    // セッションクッキーをクリア
    const response = NextResponse.json({ success: true });
    
    // 認証関連のクッキーを削除
    response.cookies.delete('auth-token');
    response.cookies.delete('session');
    
    return response;
  } catch (error) {
    console.error('ログアウトエラー:', error);
    return NextResponse.json(
      { error: 'ログアウト中にエラーが発生しました' },
      { status: 500 }
    );
  }
} 