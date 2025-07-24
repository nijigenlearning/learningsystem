import { ReactNode } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { 
  BookOpen, 
  Building2, 
  LogOut, 
  Plus,
  Settings,
  Users
} from 'lucide-react';

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/admin/materials" className="flex items-center">
                <BookOpen className="h-8 w-8 text-blue-600 mr-2" />
                <span className="text-xl font-bold text-gray-900">
                  学習教材管理システム
                </span>
              </Link>
            </div>
            
            <div className="flex items-center space-x-4">
              <Link href="/">
                <Button variant="outline" size="sm">
                  ホームに戻る
                </Button>
              </Link>
              <Button variant="outline" size="sm">
                <LogOut className="h-4 w-4 mr-2" />
                ログアウト
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <Link
              href="/admin/materials"
              className="flex items-center px-3 py-4 text-sm font-medium text-gray-900 border-b-2 border-transparent hover:border-gray-300"
            >
              <BookOpen className="h-4 w-4 mr-2" />
              教材管理
            </Link>
            <Link
              href="/admin/offices"
              className="flex items-center px-3 py-4 text-sm font-medium text-gray-500 border-b-2 border-transparent hover:text-gray-700 hover:border-gray-300"
            >
              <Building2 className="h-4 w-4 mr-2" />
              事業所管理
            </Link>
            <Link
              href="/admin/users"
              className="flex items-center px-3 py-4 text-sm font-medium text-gray-500 border-b-2 border-transparent hover:text-gray-700 hover:border-gray-300"
            >
              <Users className="h-4 w-4 mr-2" />
              ユーザー管理
            </Link>
            <Link
              href="/admin/settings"
              className="flex items-center px-3 py-4 text-sm font-medium text-gray-500 border-b-2 border-transparent hover:text-gray-700 hover:border-gray-300"
            >
              <Settings className="h-4 w-4 mr-2" />
              設定
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
} 