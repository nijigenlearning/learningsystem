"use client";
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

// officesテーブルが必要です（id, name）
export default function AdminOfficesPage() {
  const [offices, setOffices] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newOffice, setNewOffice] = useState('');

  useEffect(() => {
    const fetchOffices = async () => {
      setLoading(true);
      const { data, error } = await supabase.from('offices').select('*').order('name');
      if (error) setError(error.message);
      else setOffices(data ?? []);
      setLoading(false);
    };
    fetchOffices();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!newOffice.trim()) return;
    const { error } = await supabase.from('offices').insert({ name: newOffice });
    if (error) setError(error.message);
    setNewOffice('');
    // 再取得
    const { data } = await supabase.from('offices').select('*').order('name');
    setOffices(data);
  };

  const handleDelete = async (id: string) => {
    setError('');
    const { error } = await supabase.from('offices').delete().eq('id', id);
    if (error) setError(error.message);
    // 再取得
    const { data } = await supabase.from('offices').select('*').order('name');
    setOffices(data);
  };

  if (loading) return <div className="p-8 text-center">読み込み中...</div>;

  return (
    <main className="max-w-md mx-auto p-4">
      <h1 className="text-xl font-bold mb-6">事業所管理</h1>
      <form onSubmit={handleAdd} className="mb-6 flex gap-2 items-end">
        <input type="text" className="flex-1 border rounded px-2 py-1" value={newOffice} onChange={e => setNewOffice(e.target.value)} placeholder="新規事業所名" required />
        <button type="submit" className="bg-blue-600 text-white px-3 py-2 rounded">追加</button>
      </form>
      {error && <div className="text-red-600 mb-4">{error}</div>}
      <ul className="space-y-4">
        {offices.map(office => (
          <li key={office.id} className="border rounded p-3 flex items-center gap-4">
            <div className="flex-1">{office.name}</div>
            <button className="text-red-600 underline text-sm" onClick={() => handleDelete(office.id)}>削除</button>
          </li>
        ))}
      </ul>
    </main>
  );
} 