import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Material } from '@/types/supabase';

export default function MaterialEditPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const [material, setMaterial] = useState<Material | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchMaterial = async () => {
      setLoading(true);
      const { data, error } = await supabase.from('materials').select('*').eq('id', id).single();
      if (error) setError(error.message);
      else setMaterial(data);
      setLoading(false);
    };
    if (id) fetchMaterial();
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (!material) return;
    setMaterial({ ...material, [e.target.name]: e.target.value });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!material) return;
    const { error } = await supabase.from('materials').update({
      title: material.title,
      description: material.description,
      youtube_url: material.youtube_url,
      thumbnail: material.thumbnail,
    }).eq('id', id);
    if (error) setError(error.message);
    else router.push('/');
  };

  const handleDelete = async () => {
    if (!confirm('本当に削除しますか？')) return;
    setError('');
    const { error } = await supabase.from('materials').delete().eq('id', id);
    if (error) setError(error.message);
    else router.push('/');
  };

  if (loading) return <div className="p-8 text-center">読み込み中...</div>;
  if (!material) return <div className="p-8 text-center text-red-600">教材が見つかりません</div>;

  return (
    <main className="max-w-xl mx-auto p-4">
      <h1 className="text-xl font-bold mb-6">教材編集</h1>
      <form onSubmit={handleUpdate} className="space-y-4">
        <div>
          <label className="block font-medium mb-1">タイトル</label>
          <input type="text" name="title" className="w-full border rounded px-3 py-2" value={material.title} onChange={handleChange} required />
        </div>
        <div>
          <label className="block font-medium mb-1">説明</label>
          <textarea name="description" className="w-full border rounded px-3 py-2" value={material.description || ''} onChange={handleChange} />
        </div>
        <div>
          <label className="block font-medium mb-1">YouTube URL</label>
          <input type="url" name="youtube_url" className="w-full border rounded px-3 py-2" value={material.youtube_url || ''} onChange={handleChange} />
        </div>
        <div>
          <label className="block font-medium mb-1">サムネイルURL</label>
          <input type="url" name="thumbnail" className="w-full border rounded px-3 py-2" value={material.thumbnail || ''} onChange={handleChange} />
        </div>
        {error && <div className="text-red-600">{error}</div>}
        <div className="flex gap-4">
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">更新</button>
          <button type="button" className="bg-red-600 text-white px-4 py-2 rounded" onClick={handleDelete}>削除</button>
        </div>
      </form>
    </main>
  );
} 