"use client";
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { MaterialImage } from '@/types/supabase';

export default function ImagesEditPage() {
  const params = useParams();
  const materialId = params?.id as string;
  const [images, setImages] = useState<MaterialImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [fileName, setFileName] = useState('');
  const [order, setOrder] = useState(1);

  useEffect(() => {
    const fetchImages = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('material_images')
        .select('*')
        .eq('material_id', materialId)
        .order('order', { ascending: true });
      if (error) setError(error.message);
      else setImages(data);
      setLoading(false);
    };
    if (materialId) fetchImages();
  }, [materialId]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const { error } = await supabase.from('material_images').insert({
      material_id: materialId,
      image_url: imageUrl,
      file_name: fileName,
      file_size: 0,
      mime_type: '',
      order,
      step_id: 0,
    });
    if (error) setError(error.message);
    setImageUrl('');
    setFileName('');
    setOrder(order + 1);
    // 再取得
    const { data } = await supabase
      .from('material_images')
      .select('*')
      .eq('material_id', materialId)
      .order('order', { ascending: true });
    setImages(data);
  };

  const handleDelete = async (id: string) => {
    setError('');
    const { error } = await supabase.from('material_images').delete().eq('id', id);
    if (error) setError(error.message);
    // 再取得
    const { data } = await supabase
      .from('material_images')
      .select('*')
      .eq('material_id', materialId)
      .order('order', { ascending: true });
    setImages(data);
  };

  if (loading) return <div className="p-8 text-center">読み込み中...</div>;

  return (
    <main className="max-w-2xl mx-auto p-4">
      <h1 className="text-xl font-bold mb-6">画像登録（STEP4）</h1>
      <form onSubmit={handleAdd} className="mb-6 flex gap-2 items-end">
        <div className="flex-1">
          <label className="block text-sm font-medium">画像URL</label>
          <input type="url" className="w-full border rounded px-2 py-1" value={imageUrl} onChange={e => setImageUrl(e.target.value)} required />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium">ファイル名</label>
          <input type="text" className="w-full border rounded px-2 py-1" value={fileName} onChange={e => setFileName(e.target.value)} required />
        </div>
        <div className="w-24">
          <label className="block text-sm font-medium">順序</label>
          <input type="number" className="w-full border rounded px-2 py-1" value={order} onChange={e => setOrder(Number(e.target.value))} min={1} />
        </div>
        <button type="submit" className="bg-blue-600 text-white px-3 py-2 rounded">追加</button>
      </form>
      {error && <div className="text-red-600 mb-4">{error}</div>}
      <ul className="space-y-4">
        {images.map(img => (
          <li key={img.id} className="border rounded p-3 flex items-center gap-4">
            <img src={img.image_url} alt={img.file_name} className="w-32 h-20 object-cover rounded" />
            <div className="flex-1">
              <div className="font-semibold">{img.file_name}</div>
              <div className="text-gray-500 text-sm">順序: {img.order}</div>
            </div>
            <button className="text-red-600 underline text-sm" onClick={() => handleDelete(img.id)}>削除</button>
          </li>
        ))}
      </ul>
    </main>
  );
} 