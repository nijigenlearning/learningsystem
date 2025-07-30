"use client";

import { usePathname } from 'next/navigation';
import Footer from './Footer';
import PageHeader from './PageHeader';

interface LayoutWrapperProps {
  children: React.ReactNode;
}

export default function LayoutWrapper({ children }: LayoutWrapperProps) {
  const pathname = usePathname();
  
  // Check if current page is the login page
  const isLoginPage = pathname === '/admin/login';
  
  // Get page title based on pathname
  const getPageTitle = () => {
    if (pathname === '/') return '教材一覧';
    if (pathname === '/admin/materials') return '管理画面';
    if (pathname.includes('/admin/materials/') && pathname.includes('/edit')) return '教材編集';
    if (pathname.includes('/admin/materials/new')) return '新規教材登録';
    if (pathname.includes('/materials/') && pathname.includes('/text')) return 'テキスト登録';
    if (pathname.includes('/materials/') && pathname.includes('/steps')) return '手順作成（工程3）';
    if (pathname.includes('/materials/') && pathname.includes('/images')) return '画像登録（工程4）';
    if (pathname.includes('/materials/') && pathname.includes('/view')) return '確認・承認（工程5）';
    if (pathname.includes('/materials/') && pathname.includes('/confirm')) return '確認・承認（工程5）';
    return '';
  };
  
  const pageTitle = getPageTitle();
  
  return (
    <>
      {!isLoginPage && pageTitle && <PageHeader title={pageTitle} />}
      <main className="flex-1">{children}</main>
      {!isLoginPage && <Footer />}
    </>
  );
} 