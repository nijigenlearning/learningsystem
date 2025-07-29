"use client";

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Material, RecipeStep, MaterialImage } from '@/types/supabase';
import { Loader2 } from 'lucide-react';

interface StepWithImages {
  step: RecipeStep;
  images: MaterialImage[];
}

export default function MaterialViewPage() {
  const params = useParams();
  const materialId = params.id as string;
  
  const [material, setMaterial] = useState<Material | null>(null);
  const [steps, setSteps] = useState<RecipeStep[]>([]);
  const [stepImages, setStepImages] = useState<MaterialImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

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
      const stepsResponse = await fetch(`/api/materials/${materialId}/recipe-steps`);
      if (stepsResponse.ok) {
        const stepsData = await stepsResponse.json();
        setSteps(stepsData);
      }

      // 手順画像を取得
      const { data: imagesData, error: imagesError } = await supabase
        .from('material_images')
        .select('*')
        .eq('material_id', materialId)
        .order('step_id')
        .order('order');

      if (imagesError) {
        console.error('画像取得エラー:', imagesError);
      } else {
        setStepImages(imagesData || []);
      }

    } catch (err) {
      console.error('データ取得エラー:', err);
      setError('データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [materialId]);

  useEffect(() => {
    if (materialId) {
      fetchData();
    }
  }, [materialId, fetchData]);

  // 手順と画像を組み合わせる
  const stepsWithImages: StepWithImages[] = steps.map(step => ({
    step,
    images: stepImages.filter(img => img.step_id === step.id.toString())
  }));

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!material) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">教材が見つかりません</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        {/* ヘッダー */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            {material.title}
          </h1>
          
          {/* 完成見本画像 */}
          {material.sample_image_url && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-3">完成見本</h2>
              <div className="max-w-md">
                <img
                  src={material.sample_image_url}
                  alt="完成見本"
                  className="w-full h-auto rounded-lg shadow-md"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            </div>
          )}

          {/* ソフトウェア情報 */}
          {(material.software || material.version || material.learning_note) && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-3">使用ソフトウェア情報</h2>
              <div className="bg-gray-50 rounded-lg p-4">
                {material.software && (
                  <div className="mb-2">
                    <span className="font-medium text-gray-700">ソフトウェア: </span>
                    <span className="text-gray-900">{material.software}</span>
                  </div>
                )}
                {material.version && (
                  <div className="mb-2">
                    <span className="font-medium text-gray-700">バージョン: </span>
                    <span className="text-gray-900">{material.version}</span>
                  </div>
                )}
                {material.learning_note && (
                  <div>
                    <span className="font-medium text-gray-700">学習時の注意事項: </span>
                    <p className="text-gray-900 mt-1">{material.learning_note}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 手順一覧 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">手順</h2>
          
          {stepsWithImages.length === 0 ? (
            <p className="text-gray-500 text-center py-8">手順が登録されていません</p>
          ) : (
            <div className="space-y-8">
              {stepsWithImages.map((stepWithImages, index) => {
                const { step, images } = stepWithImages;
                
                return (
                  <div key={step.id} className="border-b border-gray-200 pb-6 last:border-b-0">
                    <div className="flex items-start gap-4">
                      {/* 手順番号 */}
                      {!step.is_heading && (
                        <div className="flex-shrink-0">
                          <span className="inline-flex items-center justify-center w-8 h-8 bg-blue-600 text-white text-sm font-bold rounded-full">
                            {index + 1}
                          </span>
                        </div>
                      )}
                      
                      {/* 手順内容 */}
                      <div className="flex-1">
                        <h3 className={`text-lg font-semibold text-gray-900 mb-3 ${
                          step.is_heading ? 'text-xl' : ''
                        }`}>
                          {step.content}
                        </h3>
                        
                        {/* 手順画像 */}
                        {images.length > 0 && (
                          <div className="mt-4">
                            <h4 className="text-sm font-medium text-gray-700 mb-2">参考画像:</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {images.map((image) => (
                                <div key={image.id} className="relative">
                                  <img
                                    src={image.image_url}
                                    alt={image.file_name}
                                    className="w-full h-48 object-cover rounded-lg shadow-sm"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                    }}
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* エラーメッセージ */}
        {error && (
          <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}