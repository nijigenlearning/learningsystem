"use client";

import { ReactNode } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { usePathname } from 'next/navigation';

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/admin/login';

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        window.location.href = '/admin/login';
      }
    } catch (error) {
      console.error('ログアウトエラー:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {!isLoginPage && (
        <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between h-16 items-center">
          <span className="text-xl font-bold text-gray-900">学習教材管理システム</span>
          <div className="flex gap-2">
            <Link href="/admin/materials/new">
              <Button className="bg-blue-200 text-blue-900 hover:bg-blue-300 border border-blue-200" size="sm">
                教材新規登録
              </Button>
            </Link>
            <Link href="/">
              <Button variant="outline" size="sm">
                ホームに戻る
              </Button>
            </Link>
            <Button 
              onClick={handleLogout}
              className="bg-red-200 text-red-800 hover:bg-red-300 border border-red-200" 
              size="sm"
            >
              <LogOut className="w-4 h-4 mr-1" />
              ログアウト
            </Button>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 border-b border-gray-200">
          <div className="flex items-center justify-end space-x-4">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">工程・状態:</label>
                <select className="border border-gray-300 rounded px-2 py-1 text-sm">
                  <option value="">すべて</option>
                  <option value="video_registration">①動画登録</option>
                  <option value="text_registration">②テキスト編集</option>
                  <option value="text_revision">③手順作成</option>
                  <option value="image_registration">④画像登録</option>
                  <option value="confirmation">⑤確認・承認</option>
                </select>
              </div>
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">使用ソフト:</label>
                <select className="border border-gray-300 rounded px-2 py-1 text-sm">
                  <option value="">すべて</option>
                  <option value="photoshop">Photoshop</option>
                  <option value="illustrator">Illustrator</option>
                  <option value="indesign">InDesign</option>
                </select>
              </div>
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">実施事業所:</label>
                <select className="border border-gray-300 rounded px-2 py-1 text-sm">
                  <option value="">すべて</option>
                  <option value="kakogawa">加古川</option>
                  <option value="chiba">千葉</option>
                  <option value="none">なし</option>
                </select>
              </div>
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">検索:</label>
                <input 
                  type="text" 
                  placeholder="タイトルで検索..." 
                  className="border border-gray-300 rounded px-2 py-1 text-sm w-48"
                />
              </div>
            </div>
          </div>
        </div>
        </header>
      )}
      <main className={isLoginPage ? "" : "max-w-7xl mx-auto py-6 sm:px-6 lg:px-8"}>
        {children}
      </main>
    </div>
  );
} 