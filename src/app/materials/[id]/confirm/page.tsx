"use client";
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Material } from '@/types/supabase';

export default function ConfirmPage() {
  const params = useParams();
  const materialId = params?.id as string;
  const [material, setMaterial] = useState<Material | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const fetchMaterial = async () => {
      setLoading(true);
      const { data, error } = await supabase.from('materials').select('*').eq('id', materialId).single();
      if (error) setError(error.message);
      else setMaterial(data);
      setLoading(false);
    };
    fetchMaterial();
    // 管理者判定
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
  }, [materialId]);

  const handleApprove = async (status: string) => {
    setUpdating(true);
    setError('');
    const { error } = await supabase.from('materials').update({ confirmation: status }).eq('id', materialId);
    if (error) setError(error.message);
    else setMaterial((prev) => prev ? { ...prev, confirmation: status } : prev);
    setUpdating(false);
  };

  if (loading) return <div className="p-8 text-center">読み込み中...</div>;
  if (!material) return <div className="p-8 text-center text-red-600">教材が見つかりません</div>;

  return (
    <main className="max-w-xl mx-auto p-4">
      <h1 className="text-xl font-bold mb-6">確認・承認（STEP5）</h1>
      <div className="mb-4">現在の承認状態：
        <span className="ml-2 font-semibold">
          {material.confirmation === 'approved' ? '承認済み' : material.confirmation === 'rejected' ? '差し戻し' : '未承認'}
        </span>
      </div>
      {isAdmin && (
        <div className="flex gap-4 mb-4">
          <button
            className="bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50"
            disabled={updating}
            onClick={() => handleApprove('approved')}
          >承認</button>
          <button
            className="bg-yellow-600 text-white px-4 py-2 rounded disabled:opacity-50"
            disabled={updating}
            onClick={() => handleApprove('rejected')}
          >差し戻し</button>
          <button
            className="bg-gray-400 text-white px-4 py-2 rounded disabled:opacity-50"
            disabled={updating}
            onClick={() => handleApprove('pending')}
          >未承認に戻す</button>
        </div>
      )}
      {error && <div className="text-red-600 mb-4">{error}</div>}
      <div className="border rounded p-4 bg-gray-50">
        <div className="font-semibold mb-2">教材タイトル</div>
        <div>{material.title}</div>
        <div className="font-semibold mt-4 mb-2">説明</div>
        <div>{material.description}</div>
      </div>
    </main>
  );
} 