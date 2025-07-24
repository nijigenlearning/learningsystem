"use client";

import { supabase } from '@/lib/supabaseClient';
import { Material } from '@/types/supabase';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function MaterialListPage() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const fetchMaterials = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('materials')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data) setMaterials(data);
      setLoading(false);
    };
    fetchMaterials();
    // 管理者判定（セッションから）
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single();
        setIsAdmin(profile?.role === 'ADMIN');
      }
    };
    checkAdmin();
  }, []);

  if (loading) return <div className="p-8 text-center">読み込み中...</div>;

  return (
    <main className="max-w-3xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">教材一覧</h1>
      <div className="space-y-4">
        {materials.map((m) => (
          <div key={m.id} className="border rounded p-4 flex gap-4 items-center">
            {m.thumbnail && (
              <Image src={m.thumbnail} alt={m.title} width={120} height={90} className="rounded" />
            )}
            <div className="flex-1">
              <div className="font-semibold text-lg">{m.title}</div>
              <div className="text-gray-600 text-sm mb-2">{m.description}</div>
              {isAdmin && (
                <Link href={`/admin/materials/${m.id}/edit`} className="text-blue-600 underline">編集</Link>
              )}
            </div>
          </div>
        ))}
      </div>
      {isAdmin && (
        <div className="mt-8 text-right">
          <Link href="/admin/materials/new" className="bg-blue-600 text-white px-4 py-2 rounded">新規教材登録</Link>
        </div>
      )}
    </main>
  );
}
