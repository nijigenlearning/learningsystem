"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Youtube } from 'lucide-react';

export default function MaterialNewPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [thumbnail, setThumbnail] = useState('');
  const [software, setSoftware] = useState('');
  const [version, setVersion] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingVideo, setFetchingVideo] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchVideoInfo = async () => {
    if (!youtubeUrl.trim()) {
      setError('YouTube URLを入力してください');
      return;
    }

    setFetchingVideo(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/youtube', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: youtubeUrl }),
      });

      const data = await response.json();

      if (response.ok) {
        setTitle(data.title || '');
        setDescription(data.description || '');
        setThumbnail(data.thumbnail || '');
        setSuccess('動画情報を取得しました');
      } else {
        setError(data.error || '動画情報の取得に失敗しました');
      }
    } catch (error) {
      setError('動画情報の取得中にエラーが発生しました');
    } finally {
      setFetchingVideo(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/materials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title, 
          description, 
          youtube_url: youtubeUrl, 
          thumbnail,
          software,
          version
        }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        setError(data.error || '登録に失敗しました');
        return;
      }
      
      router.push('/admin/materials');
    } catch (error) {
      setError('登録中にエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">新規教材登録</h1>
        <p className="text-gray-600">新しい学習教材を登録します</p>
      </div>

      {error && (
        <Alert className="mb-6">
          <AlertDescription className="text-red-600">{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="mb-6 border-green-200 bg-green-50">
          <AlertDescription className="text-green-600">{success}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* YouTube URL セクション */}
        <div className="bg-white p-6 rounded-lg border">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Youtube className="w-5 h-5 text-red-600" />
            YouTube動画情報
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                YouTube URL
              </label>
              <div className="flex gap-2">
                <Input
                  type="url"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  className="flex-1"
                />
                <Button
                  type="button"
                  onClick={fetchVideoInfo}
                  disabled={fetchingVideo || !youtubeUrl.trim()}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {fetchingVideo ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      取得中...
                    </>
                  ) : (
                    <>
                      <Youtube className="w-4 h-4 mr-2" />
                      情報取得
                    </>
                  )}
                </Button>
              </div>
            </div>

            {thumbnail && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  サムネイル
                </label>
                <img 
                  src={thumbnail} 
                  alt="動画サムネイル" 
                  className="w-48 h-27 object-cover rounded border"
                />
              </div>
            )}
          </div>
        </div>

        {/* 基本情報セクション */}
        <div className="bg-white p-6 rounded-lg border">
          <h2 className="text-lg font-semibold mb-4">基本情報</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                タイトル *
              </label>
              <Input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="教材のタイトルを入力"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                使用ソフト
              </label>
              <select
                value={software}
                onChange={(e) => setSoftware(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="">選択してください</option>
                <option value="photoshop">Photoshop</option>
                <option value="illustrator">Illustrator</option>
                <option value="indesign">InDesign</option>
                <option value="figma">Figma</option>
                <option value="sketch">Sketch</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                バージョン
              </label>
              <Input
                type="text"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="例: 2024, CC 2024"
              />
            </div>
          </div>

          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              説明
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="教材の説明を入力"
              rows={4}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* アクションボタン */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            キャンセル
          </Button>
          <Button
            type="submit"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                登録中...
              </>
            ) : (
              '教材を登録'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
} 