"use client";

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

interface PageHeaderProps {
  title: string;
  backUrl?: string;
  onBack?: () => void;
}

export default function PageHeader({ title, backUrl, onBack }: PageHeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (backUrl) {
      router.push(backUrl);
    } else {
      router.back();
    }
  };

  const handleAdminLogin = () => {
    router.push('/admin/login');
  };

  return (
    <div className="bg-gray-900 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <h1 className="text-xl font-semibold">{title}</h1>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleBack}
              className="bg-white text-gray-900 border-white hover:bg-gray-100"
            >
              戻る
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAdminLogin}
              className="bg-blue-600 text-white border-blue-600 hover:bg-blue-700"
            >
              管理者ログイン
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
} 