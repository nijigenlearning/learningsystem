"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabaseClient';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Youtube } from 'lucide-react';

export default function MaterialNewPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [videoTitle, setVideoTitle] = useState(''); // YouTube APIから取得したタイトル
  const [description, setDescription] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [lastFetchedUrl, setLastFetchedUrl] = useState('');
  const [thumbnail, setThumbnail] = useState('');
  const [software, setSoftware] = useState('');
  const [customSoftware, setCustomSoftware] = useState('');
  const [instruction, setInstruction] = useState('');
  const [note, setNote] = useState('');
  const [office, setOffice] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingVideo, setFetchingVideo] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [existingSoftware, setExistingSoftware] = useState<string[]>([]);

  // 既存のソフト名を取得
  useEffect(() => {
    const fetchExistingSoftware = async () => {
      try {
        const response = await fetch('/api/software');
        if (response.ok) {
          const data = await response.json();
          setExistingSoftware(data);
        }
      } catch (error) {
        console.error('ソフト名の取得に失敗しました:', error);
      }
    };
    fetchExistingSoftware();
  }, []);

  // YouTube URLが変更されたら自動的に情報を取得
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (youtubeUrl.trim() && youtubeUrl !== lastFetchedUrl) {
        fetchVideoInfo(youtubeUrl);
      }
    }, 1000); // 1秒のディレイ

    return () => clearTimeout(timeoutId);
  }, [youtubeUrl]);

  const fetchVideoInfo = async (url: string) => {
    if (!url.trim()) {
      return;
    }

    // 同じURLの場合は重複取得を避ける
    if (lastFetchedUrl === url) {
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
        body: JSON.stringify({ url }),
      });

      const data = await response.json();

      if (response.ok) {
        setVideoTitle(data.title || ''); // YouTube APIから取得したタイトルをvideo_titleに保存
        setTitle(data.title || ''); // 初期値としてYouTubeタイトルを設定
        setDescription(data.description || '');
        setThumbnail(data.thumbnail || '');
        setLastFetchedUrl(url);
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
      // 開発段階では認証を一時的に無効化
      // TODO: 本番環境では認証を有効にする
      /*
      // 認証トークンを取得
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('認証が必要です。ログインしてください。');
        setLoading(false);
        return;
      }
      */

      const res = await fetch('/api/materials', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
          // 'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ 
          title, 
          video_title: videoTitle, // YouTube APIから取得したタイトル
          description, 
          youtube_url: youtubeUrl, 
          thumbnail,
          software: software === 'custom' ? customSoftware : software,
          instruction,
          note,
          office
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
               <div className="relative">
                 <Input
                   type="url"
                   placeholder="https://www.youtube.com/watch?v=..."
                   value={youtubeUrl}
                   onChange={(e) => setYoutubeUrl(e.target.value)}
                   className="pr-10"
                 />
                 {fetchingVideo && (
                   <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                     <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                   </div>
                 )}
               </div>
               <p className="text-xs text-gray-500 mt-1">
                 URLを入力すると自動的に動画情報を取得します
               </p>
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
                 教材タイトル *
               </label>
               <Input
                 type="text"
                 value={title}
                 onChange={(e) => setTitle(e.target.value)}
                 required
                 placeholder="教材のタイトルを入力"
               />
               {videoTitle && (
                 <p className="text-xs text-gray-500 mt-1">
                   参考: YouTube動画タイトル「{videoTitle}」
                 </p>
               )}
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
                  <option value="blender">Blender</option>
                  <option value="premierepro">Premiere Pro</option>
                  <option value="aftereffect">After Effects</option>
                  <option value="clipstudio">Clip Studio Paint</option>
                  <option value="live2d">Live2D</option>
                  <option value="excel">Excel</option>
                  <option value="word">Word</option>
                  <option value="powerpoint">PowerPoint</option>
                  {existingSoftware.length > 0 && (
                    <>
                      <optgroup label="過去に使用されたソフト">
                        {existingSoftware.map((soft) => (
                          <option key={soft} value={soft}>
                            {soft}
                          </option>
                        ))}
                      </optgroup>
                    </>
                  )}
                  <option value="custom">その他（カスタム）</option>
                </select>
             </div>
             
             {software === 'custom' && (
               <div>
                 <label className="block text-sm font-medium text-gray-700 mb-2">
                   ソフト名を入力
                 </label>
                 <Input
                   type="text"
                   value={customSoftware}
                   onChange={(e) => setCustomSoftware(e.target.value)}
                   placeholder="使用するソフト名を入力"
                   className="w-full"
                 />
               </div>
             )}
           </div>

           <div className="mt-6">
             <label className="block text-sm font-medium text-gray-700 mb-2">
               作成指示
             </label>
             <textarea
               value={instruction}
               onChange={(e) => setInstruction(e.target.value)}
               placeholder="教材作成の指示を入力"
               rows={3}
               className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
             />
           </div>

                       <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                備考
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="備考を入力"
                rows={3}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
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