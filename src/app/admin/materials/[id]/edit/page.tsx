"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Material } from '@/types/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Save, Trash2 } from 'lucide-react';

export default function MaterialEditPage() {
  const router = useRouter();
  
  console.log('🔵 MaterialEditPage 開始');
  
  const [material, setMaterial] = useState<Material | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [softwareList, setSoftwareList] = useState<string[]>([]);
  const [customSoftware, setCustomSoftware] = useState('');
  const [showCustomSoftware, setShowCustomSoftware] = useState(false);
  const [materialId, setMaterialId] = useState<string>('');
  const [softwareLoaded, setSoftwareLoaded] = useState(false);

  // フォーム状態
  const [formData, setFormData] = useState({
    title: '',
    youtubeUrl: '',
    software: '',
    instruction: '',
    note: ''
  });

  // useParamsをuseEffectの外で呼び出し
  const params = useParams();

  useEffect(() => {
    const getParams = async () => {
      try {
        const resolvedParams = await params;
        const id = resolvedParams.id as string;
        setMaterialId(id);
        
        // ソフトウェア一覧を先に取得
        await fetchSoftwareList();
        // その後で教材情報を取得
        await fetchMaterial(id);
      } catch (error) {
        setError('パラメータの取得に失敗しました');
        setLoading(false);
      }
    };
    
    getParams();
  }, [params]);

  const fetchMaterial = async (id: string) => {
    try {
      const response = await fetch(`/api/materials/${id}`);
      if (response.ok) {
        const data = await response.json();
        setMaterial(data);
        setFormData({
          title: data.title || '',
          youtubeUrl: data.youtube_url || '',
          software: data.software || '',
          instruction: data.instruction || '',
          note: data.note || ''
        });
        
        // 固定の選択肢リスト
        const fixedSoftwareList = [
          'Photoshop', 'Illustrator', 'Blender', 'Premiere Pro', 
          'After Effects', 'Clip Studio Paint', 'Live2D', 'Excel', 'Word', 'PowerPoint'
        ];
        
        // 現在のソフトウェアが固定リストにない場合はカスタム入力として設定
        if (data.software && !fixedSoftwareList.includes(data.software)) {
          setShowCustomSoftware(true);
          setCustomSoftware(data.software);
        }
      } else {
        setError('教材の取得に失敗しました');
      }
    } catch (error) {
      setError('教材の取得中にエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const fetchSoftwareList = async () => {
    try {
      const response = await fetch('/api/software');
      if (response.ok) {
        const data = await response.json();
        setSoftwareList(data);
        setSoftwareLoaded(true);
        console.log('ソフトウェア一覧取得完了:', data); // デバッグ用
      }
    } catch (error) {
      console.error('ソフトウェア一覧の取得に失敗しました:', error);
    }
  };

  // YouTube URL入力時の自動情報取得
  const handleYouTubeUrlChange = async (url: string) => {
    setFormData(prev => ({ ...prev, youtubeUrl: url }));
    
    if (!url || !url.includes('youtube.com') && !url.includes('youtu.be')) {
      return;
    }

    try {
      const response = await fetch('/api/youtube', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      if (response.ok) {
        const data = await response.json();
        setFormData(prev => ({
          ...prev,
          title: data.title || prev.title,
          youtubeUrl: url
        }));
        if (material) {
          setMaterial(prev => prev ? {
            ...prev,
            video_title: data.title,
            video_description: data.description,
            thumbnail: data.thumbnail,
            youtube_id: data.videoId
          } : null);
        }
      }
    } catch (error) {
      console.error('YouTube情報の取得に失敗しました:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/materials/${materialId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          youtube_url: formData.youtubeUrl,
          software: showCustomSoftware ? customSoftware : formData.software,
          instruction: formData.instruction,
          note: formData.note,
          video_title: material?.video_title,
          video_description: material?.video_description,
          thumbnail: material?.thumbnail,
          youtube_id: material?.youtube_id
        }),
      });

      if (response.ok) {
        setSuccess('教材を更新しました');
        setTimeout(() => {
          router.push('/admin/materials');
        }, 1500);
      } else {
        const data = await response.json();
        setError(data.error || '更新に失敗しました');
      }
    } catch (error) {
      setError('更新中にエラーが発生しました');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('本当にこの教材を削除しますか？')) return;

    try {
      const response = await fetch(`/api/materials/${materialId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        router.push('/admin/materials');
      } else {
        setError('削除に失敗しました');
      }
    } catch (error) {
      setError('削除中にエラーが発生しました');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white py-8">
        <div className="max-w-4xl mx-auto p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">読み込み中...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!material) {
    return (
      <div className="min-h-screen bg-white py-8">
        <div className="max-w-4xl mx-auto p-6">
          <div className="text-center text-red-600">
            <p>教材が見つかりません</p>
            <p className="text-sm mt-2">ID: {materialId}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto p-6">
        {/* ヘッダー */}
        <div className="mb-8">
          <p className="text-gray-600">教材「{material.title}」の情報を編集します</p>
        </div>

        {/* エラー・成功メッセージ */}
        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}
        {success && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        {/* 編集フォーム */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* YouTube URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">YouTube URL *</label>
              <Input
                type="url"
                value={formData.youtubeUrl}
                onChange={(e) => handleYouTubeUrlChange(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                required
              />
              <p className="text-xs text-gray-500 mt-1">URLを入力すると動画情報が自動取得されます</p>
            </div>

            {/* タイトル */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">教材タイトル *</label>
              <Input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="教材のタイトルを入力してください"
                required
              />
            </div>

            {/* ソフトウェア */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">使用ソフトウェア</label>
              <div className="space-y-2">
                <select
                  value={showCustomSoftware ? '' : formData.software}
                  onChange={(e) => {
                    if (e.target.value === 'custom') {
                      setShowCustomSoftware(true);
                      setFormData(prev => ({ ...prev, software: '' }));
                    } else {
                      setShowCustomSoftware(false);
                      setFormData(prev => ({ ...prev, software: e.target.value }));
                    }
                  }}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">選択してください</option>
                  <option value="Photoshop">Photoshop</option>
                  <option value="Illustrator">Illustrator</option>
                  <option value="Blender">Blender</option>
                  <option value="Premiere Pro">Premiere Pro</option>
                  <option value="After Effects">After Effects</option>
                  <option value="Clip Studio Paint">Clip Studio Paint</option>
                  <option value="Live2D">Live2D</option>
                  <option value="Excel">Excel</option>
                  <option value="Word">Word</option>
                  <option value="PowerPoint">PowerPoint</option>
                  {softwareList.length > 0 && (
                    <>
                      <optgroup label="過去に使用されたソフト">
                        {softwareList.map((software) => (
                          <option key={software} value={software}>
                            {software}
                          </option>
                        ))}
                      </optgroup>
                    </>
                  )}
                  <option value="custom">その他（カスタム入力）</option>
                </select>
                
                {showCustomSoftware && (
                  <Input
                    type="text"
                    value={customSoftware}
                    onChange={(e) => setCustomSoftware(e.target.value)}
                    placeholder="ソフトウェア名を入力してください"
                  />
                )}
                
                {/* デバッグ情報 */}
                {process.env.NODE_ENV === 'development' && (
                  <div className="text-xs text-gray-500 mt-1">
                    現在のソフトウェア: {formData.software || 'なし'} | 
                    カスタム入力: {showCustomSoftware ? 'はい' : 'いいえ'} | 
                    選択肢数: {softwareList.length} | 
                    読み込み完了: {softwareLoaded ? 'はい' : 'いいえ'} |
                    選択肢: {softwareList.join(', ')}
                  </div>
                )}
              </div>
            </div>

            {/* 作成指示 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">作成指示</label>
              <Textarea
                value={formData.instruction}
                onChange={(e) => setFormData(prev => ({ ...prev, instruction: e.target.value }))}
                placeholder="教材作成の指示を入力"
                rows={3}
              />
            </div>

            {/* 備考 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">備考</label>
              <Textarea
                value={formData.note}
                onChange={(e) => setFormData(prev => ({ ...prev, note: e.target.value }))}
                placeholder="備考を入力"
                rows={3}
              />
            </div>

            {/* アクションボタン */}
            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleDelete}
                className="flex items-center gap-2 text-red-600 border-red-300 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />削除
              </Button>
              <Button
                type="submit"
                disabled={saving || !formData.title.trim() || !formData.youtubeUrl.trim()}
                className="flex items-center gap-2"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                更新
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 