"use client";
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';

export default function NavBar() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        const { data: profile } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single();
        setIsAdmin(profile?.role === 'ADMIN');
      } else {
        setIsAdmin(false);
      }
    };
    checkAdmin();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  return (
    <nav className="bg-gray-800 text-white px-4 py-3 flex gap-6 items-center">
      <Link href="/" className="font-bold text-lg">教材一覧</Link>
      <Link href="/office" className="hover:underline">事業所選択</Link>
      {isAdmin && (
        <>
          <Link href="/admin/materials/new" className="hover:underline">教材登録</Link>
          <Link href="/admin/offices" className="hover:underline">事業所管理</Link>
          <button onClick={handleLogout} className="ml-4 bg-gray-600 px-3 py-1 rounded">ログアウト</button>
        </>
      )}
      {!user && (
        <Link href="/admin/login" className="ml-auto bg-blue-600 px-3 py-1 rounded">管理者ログイン</Link>
      )}
    </nav>
  );
} 