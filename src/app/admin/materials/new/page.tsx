import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function MaterialNewPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [thumbnail, setThumbnail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const res = await fetch('/api/materials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description, youtube_url: youtubeUrl, thumbnail }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || '登録に失敗しました');
      return;
    }
    router.push('/');
  };

  return (
    <main className="max-w-xl mx-auto p-4">
      <h1 className="text-xl font-bold mb-6">新規教材登録</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block font-medium mb-1">タイトル</label>
          <input type="text" className="w-full border rounded px-3 py-2" value={title} onChange={e => setTitle(e.target.value)} required />
        </div>
        <div>
          <label className="block font-medium mb-1">説明</label>
          <textarea className="w-full border rounded px-3 py-2" value={description} onChange={e => setDescription(e.target.value)} />
        </div>
        <div>
          <label className="block font-medium mb-1">YouTube URL</label>
          <input type="url" className="w-full border rounded px-3 py-2" value={youtubeUrl} onChange={e => setYoutubeUrl(e.target.value)} />
        </div>
        <div>
          <label className="block font-medium mb-1">サムネイルURL</label>
          <input type="url" className="w-full border rounded px-3 py-2" value={thumbnail} onChange={e => setThumbnail(e.target.value)} />
        </div>
        {error && <div className="text-red-600">{error}</div>}
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded" disabled={loading}>
          {loading ? '登録中...' : '登録'}
        </button>
      </form>
    </main>
  );
} 