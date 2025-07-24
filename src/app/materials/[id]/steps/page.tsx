"use client";
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { RecipeStep } from '@/types/supabase';

export default function StepsEditPage() {
  const params = useParams();
  const router = useRouter();
  const materialId = params?.id as string;
  const [steps, setSteps] = useState<RecipeStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newHeading, setNewHeading] = useState('');

  useEffect(() => {
    const fetchSteps = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('recipe_steps')
        .select('*')
        .eq('material_id', materialId)
        .order('step_number', { ascending: true });
      if (error) setError(error.message);
      else setSteps(data ?? []);
      setLoading(false);
    };
    if (materialId) fetchSteps();
  }, [materialId]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const step_number = steps.length + 1;
    const { error } = await supabase.from('recipe_steps').insert({
      material_id: materialId,
      step_number,
      content: newContent,
      heading: newHeading,
    });
    if (error) setError(error.message);
    setNewContent('');
    setNewHeading('');
    // 再取得
    const { data } = await supabase
      .from('recipe_steps')
      .select('*')
      .eq('material_id', materialId)
      .order('step_number', { ascending: true });
    setSteps(data ?? []);
  };

  const handleUpdate = async (idx: number, field: 'content' | 'heading', value: string) => {
    setError('');
    const step = steps[idx];
    const { error } = await supabase.from('recipe_steps').update({ [field]: value }).eq('id', step.id);
    if (error) setError(error.message);
    // 再取得
    const { data } = await supabase
      .from('recipe_steps')
      .select('*')
      .eq('material_id', materialId)
      .order('step_number', { ascending: true });
    setSteps(data ?? []);
  };

  const handleDelete = async (idx: number) => {
    setError('');
    const step = steps[idx];
    const { error } = await supabase.from('recipe_steps').delete().eq('id', step.id);
    if (error) setError(error.message);
    // 再取得
    const { data } = await supabase
      .from('recipe_steps')
      .select('*')
      .eq('material_id', materialId)
      .order('step_number', { ascending: true });
    setSteps(data ?? []);
  };

  if (loading) return <div className="p-8 text-center">読み込み中...</div>;

  return (
    <main className="max-w-2xl mx-auto p-4">
      <h1 className="text-xl font-bold mb-6">手順編集（STEP3）</h1>
      <form onSubmit={handleAdd} className="mb-6 flex gap-2 items-end">
        <div className="flex-1">
          <label className="block text-sm font-medium">見出し</label>
          <input type="text" className="w-full border rounded px-2 py-1" value={newHeading} onChange={e => setNewHeading(e.target.value)} />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium">内容</label>
          <input type="text" className="w-full border rounded px-2 py-1" value={newContent} onChange={e => setNewContent(e.target.value)} required />
        </div>
        <button type="submit" className="bg-blue-600 text-white px-3 py-2 rounded">追加</button>
      </form>
      {error && <div className="text-red-600 mb-4">{error}</div>}
      <ol className="space-y-4">
        {steps.map((step, idx) => (
          <li key={step.id} className="border rounded p-3 flex flex-col gap-2">
            <input
              type="text"
              className="w-full border-b px-2 py-1 font-semibold"
              value={step.heading || ''}
              onChange={e => handleUpdate(idx, 'heading', e.target.value)}
              placeholder="見出し"
            />
            <textarea
              className="w-full border px-2 py-1"
              value={step.content}
              onChange={e => handleUpdate(idx, 'content', e.target.value)}
              placeholder="内容"
            />
            <button
              className="self-end text-red-600 underline text-sm"
              onClick={() => handleDelete(idx)}
            >削除</button>
          </li>
        ))}
      </ol>
    </main>
  );
} 