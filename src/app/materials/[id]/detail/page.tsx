"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Material, RecipeStep, MaterialImage } from '@/types/supabase';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Trash2, CheckCircle, Circle } from 'lucide-react';

export default function MaterialDetailPage() {
  const params = useParams();
  const router = useRouter();
  const materialId = params?.id as string;
  const [material, setMaterial] = useState<Material | null>(null);
  const [steps, setSteps] = useState<RecipeStep[]>([]);
  const [stepImages, setStepImages] = useState<MaterialImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchData();
  }, [materialId]);

  const fetchData = async () => {
    try {
      // 教材情報を取得
      const { data: materialData, error: materialError } = await supabase
        .from('materials')
        .select('*')
        .eq('id', materialId)
        .single();

      if (materialError) {
        console.error('教材取得エラー:', materialError);
        setError('教材の取得に失敗しました');
        return;
      }

      setMaterial(materialData);

      // 手順を取得
      const response = await fetch(`/api/materials/${materialId}/recipe-steps`);
      if (response.ok) {
        const stepsData = await response.json();
        setSteps(stepsData);
      } else {
        console.error('手順取得エラー:', response.statusText);
        setError('手順の取得に失敗しました');
      }

      // 画像を取得
      const { data: imagesData, error: imagesError } = await supabase
        .from('material_images')
        .select('*')
        .eq('material_id', materialId)
        .order('order', { ascending: true });

      if (imagesError) {
        console.error('画像取得エラー:', imagesError);
        setError('画像の取得に失敗しました');
        return;
      }

      setStepImages(imagesData || []);
    } catch {
      setError('データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // 工程の登録状況を取得
  const getStepStatus = (stepNumber: number) => {
    if (!material) return 'pending';
    
    switch (stepNumber) {
      case 1:
        return material.video_description ? 'completed' : 'pending';
      case 2:
        return material.text_registration ? 'completed' : 'pending';
      case 3:
        return steps.length > 0 ? 'completed' : 'pending';
      case 4:
        return stepImages.length > 0 ? 'completed' : 'pending';
      default:
        return 'pending';
    }
  };

  // 工程のタイトルを取得
  const getStepTitle = (stepNumber: number) => {
    switch (stepNumber) {
      case 1:
        return '動画登録';
      case 2:
        return 'テキスト登録';
      case 3:
        return '手順作成';
      case 4:
        return '画像登録';
      default:
        return '';
    }
  };

  // 工程の詳細情報を取得
  const getStepDetails = (stepNumber: number) => {
    switch (stepNumber) {
      case 1:
        return material?.video_description ? '登録済み' : '未登録';
      case 2:
        return material?.text_registration ? '登録済み' : '未登録';
      case 3:
        return steps.length > 0 ? '登録済み' : '未登録';
      case 4:
        return stepImages.length > 0 ? '登録済み' : '未登録';
      default:
        return '未登録';
    }
  };

  // 教材削除
  const handleDelete = async () => {
    if (!confirm('この教材を削除しますか？この操作は取り消せません。')) {
      return;
    }

    setDeleting(true);
    try {
      const { error } = await supabase
        .from('materials')
        .delete()
        .eq('id', materialId);

      if (error) {
        console.error('削除エラー:', error);
        alert('教材の削除に失敗しました');
        return;
      }

      alert('教材を削除しました');
      router.push('/admin/materials');
    } catch (error) {
      console.error('削除エラー:', error);
      alert('教材の削除に失敗しました');
    } finally {
      setDeleting(false);
    }
  };



  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error || !material) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">{error || '教材が見つかりません'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto p-6">
        {/* ヘッダー */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-gray-900">{material.title}</h1>
            <Button
              onClick={handleDelete}
              disabled={deleting}
              variant="destructive"
              className="flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              {deleting ? '削除中...' : '教材削除'}
            </Button>
          </div>
          {material.software && (
            <p className="text-lg text-gray-600">使用ソフト: {material.software}</p>
          )}
        </div>

        {/* 工程登録状況 */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">登録状況</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((stepNumber) => {
              const status = getStepStatus(stepNumber);
              const title = getStepTitle(stepNumber);
              const details = getStepDetails(stepNumber);

              return (
                <div key={stepNumber} className={`border rounded-lg p-4 shadow-sm transition-colors ${
                  status === 'completed' 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-gray-50 border-gray-200'
                }`}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex-shrink-0">
                      {status === 'completed' ? (
                        <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                          <CheckCircle className="w-5 h-5 text-white" />
                        </div>
                      ) : (
                        <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                          <Circle className="w-5 h-5 text-gray-600" />
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">工程{stepNumber}</h3>
                      <p className="text-sm text-gray-600">{title}</p>
                    </div>
                  </div>
                  <div className={`text-sm p-2 rounded ${
                    status === 'completed' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {details}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 動画情報 */}
        {material.youtube_url && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">動画</h2>
            <div className="aspect-video bg-gray-200 rounded-lg overflow-hidden">
              <iframe
                src={`https://www.youtube.com/embed/${material.youtube_id}`}
                title={material.title}
                className="w-full h-full"
                allowFullScreen
              />
            </div>
          </div>
        )}

        {/* 完成見本 */}
        {material.sample_image_url && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">完成見本</h2>
            <div className="w-full max-w-md bg-gray-100 rounded-lg shadow-md overflow-hidden">
              <img
                src={material.sample_image_url}
                alt="完成見本"
                className="w-full h-auto object-contain"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 