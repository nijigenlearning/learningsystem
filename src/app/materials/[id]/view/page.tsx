"use client";

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Material, RecipeStep, MaterialImage } from '@/types/supabase';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, X, Maximize2, Check } from 'lucide-react';

interface StepWithImages {
  step: RecipeStep;
  images: MaterialImage[];
}

export default function MaterialViewPage() {
  const params = useParams();
  const router = useRouter();
  const materialId = params?.id as string;
  
  console.log('🔵 MaterialViewPage 開始:', { materialId, params });
  
  const [material, setMaterial] = useState<Material | null>(null);
  const [steps, setSteps] = useState<RecipeStep[]>([]);
  const [stepImages, setStepImages] = useState<MaterialImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedStepIndex, setSelectedStepIndex] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showSampleImageModal, setShowSampleImageModal] = useState(false);

  const fetchData = useCallback(async () => {
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

      console.log('教材データ:', materialData);
      setMaterial(materialData);

      // 手順を取得
      const response = await fetch(`/api/materials/${materialId}/recipe-steps`);
      if (response.ok) {
        const stepsData = await response.json();
        console.log('手順データ:', stepsData);
        console.log('手順データの詳細:', stepsData.map((step: RecipeStep) => ({
          id: step.id,
          step_number: step.step_number,
          step_number_type: typeof step.step_number,
          content: step.content,
          heading: step.heading
        })));
        
        // 小見出しを除外して実際の手順のみを取得
        const actualSteps = stepsData.filter((step: RecipeStep) => !step.heading && step.step_number < 9999);
        console.log('実際の手順（小見出し除外）:', actualSteps);
        setSteps(actualSteps);
      } else {
        console.error('手順取得エラー:', response.statusText);
        setError('手順の取得に失敗しました');
      }

      // 画像を取得（step_idでグループ化してorder順にソート）
      const { data: imagesData, error: imagesError } = await supabase
        .from('material_images')
        .select('*')
        .eq('material_id', materialId)
        .order('step_id', { ascending: true })
        .order('order', { ascending: true });

      console.log('データベースクエリ結果:', {
        materialId,
        imagesCount: imagesData?.length || 0,
        rawImages: imagesData
      });

      if (imagesError) {
        console.error('画像取得エラー:', imagesError);
        setError('画像の取得に失敗しました');
        return;
      }

      console.log('画像データ:', imagesData);
      console.log('画像データの詳細:', imagesData?.map(img => ({
        id: img.id,
        step_id: img.step_id,
        step_id_type: typeof img.step_id,
        order: img.order,
        file_name: img.file_name
      })));
      setStepImages(imagesData || []);
    } catch {
      setError('データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [materialId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 手順と画像を組み合わせる（小見出しを除外）
  const stepsWithImages: StepWithImages[] = steps.map(step => {
    const filteredImages = stepImages.filter(img => {
      // step_idはstep_numberとして保存されている
      // データベースに文字列として保存されている可能性もあるため、両方の型に対応
      const imgStepId = typeof img.step_id === 'string' ? parseInt(img.step_id, 10) : Number(img.step_id);
      const stepNumber = Number(step.step_number);
      
      // NaNチェック
      if (isNaN(imgStepId) || isNaN(stepNumber)) {
        console.warn('無効なstep_idまたはstep_number:', {
          imgStepId: img.step_id,
          imgStepIdParsed: imgStepId,
          stepNumber: step.step_number,
          stepNumberParsed: stepNumber
        });
        return false;
      }
      
      console.log('画像フィルタリング:', {
        imgStepId: img.step_id,
        imgStepIdType: typeof img.step_id,
        imgStepIdNumber: imgStepId,
        stepNumber: step.step_number,
        stepNumberType: typeof step.step_number,
        stepNumberNumber: stepNumber,
        isMatch: imgStepId === stepNumber
      });
      
      return imgStepId === stepNumber;
    });
    
    // 各ステップ内で画像をorder順にソート
    const sortedImages = filteredImages.sort((a, b) => a.order - b.order);
    
    return {
      step,
      images: sortedImages
    };
  });

  console.log('組み合わせ後のデータ:', {
    steps: steps,
    stepImages: stepImages,
    stepsWithImages: stepsWithImages
  });
  
  // 各ステップの画像の詳細をログ出力
  stepsWithImages.forEach((stepWithImages, index) => {
    console.log(`ステップ${index + 1} (step_number: ${stepWithImages.step.step_number}) の画像:`, {
      stepId: stepWithImages.step.step_number,
      imagesCount: stepWithImages.images.length,
      images: stepWithImages.images.map(img => ({
        id: img.id,
        step_id: img.step_id,
        order: img.order,
        file_name: img.file_name
      }))
    });
  });

  // 完成見本画像のデバッグ情報
  if (material?.sample_image_url) {
    console.log('完成見本画像URL詳細:', {
      url: material.sample_image_url,
      materialId,
      urlType: typeof material.sample_image_url,
      urlLength: material.sample_image_url?.length,
      startsWithHttp: material.sample_image_url?.startsWith('http'),
      containsSupabase: material.sample_image_url?.includes('supabase')
    });
    console.log('完成見本画像URL全体:', material.sample_image_url);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">{error}</p>
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

  const closeModal = () => {
    setShowModal(false);
    setSelectedStepIndex(null);
  };

  const handleComplete = async () => {
    console.log('🔵 完了ボタンがクリックされました');
    console.log('🔵 materialId:', materialId);
    try {
      const response = await fetch(`/api/materials/${materialId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          confirmation: 'completed' // statusの代わりにconfirmationを更新
        }),
      });
      console.log('🔵 APIレスポンス:', response.status, response.statusText);
      if (response.ok) {
        console.log('✅ 工程5完了としてマークしました');
        router.push('/admin/materials');
      } else {
        const errorText = await response.text();
        console.error('❌ 工程完了の更新に失敗しました:', errorText);
      }
    } catch (error) {
      console.error('❌ 工程完了処理エラー:', error);
    }
  };

  const nextStep = () => {
    if (selectedStepIndex !== null && selectedStepIndex < stepsWithImages.length - 1) {
      setSelectedStepIndex(selectedStepIndex + 1);
    }
  };

  const prevStep = () => {
    if (selectedStepIndex !== null && selectedStepIndex > 0) {
      setSelectedStepIndex(selectedStepIndex - 1);
    }
  };

  // currentStepの計算をより詳細にログ出力
  const currentStep = selectedStepIndex !== null ? stepsWithImages[selectedStepIndex] : null;

  console.log('🔍 currentStep計算:', {
    selectedStepIndex,
    stepsWithImagesLength: stepsWithImages.length,
    currentStep: currentStep,
    isSelectedStepIndexNull: selectedStepIndex === null
  });

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto p-6">
        {/* タイトル */}
        <h1 className="text-3xl font-bold text-gray-900 mb-6">{material.title}</h1>

        {/* ソフトウェア情報と完成見本画像 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            {(material.software || material.version || material.learning_note) && (
              <div>
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
                      <span className="text-gray-900">{material.learning_note}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          {material.sample_image_url && (
            <div className="lg:col-span-1">
              <div 
                className="cursor-pointer"
                onClick={() => setShowSampleImageModal(true)} // 専用モーダルを開く
                style={{
                  width: '100%',
                  minHeight: '200px',
                  backgroundColor: '#f8f9fa',
                  padding: '16px',
                  borderRadius: '8px',
                  border: '1px solid #e0e0e0',
                  transition: 'box-shadow 0.3s ease',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                }}
              >
                <img 
                  src={material.sample_image_url} 
                  alt="完成見本" 
                  style={{
                    width: '100%',
                    height: 'auto',
                    maxHeight: '300px',
                    objectFit: 'contain',
                    backgroundColor: 'white',
                    borderRadius: '4px'
                  }}
                  onLoad={() => console.log('✅ 完成見本画像表示成功')}
                  onError={(e) => {
                    if (e.currentTarget) {
                      e.currentTarget.style.display = 'none';
                      const parent = e.currentTarget.parentElement;
                      if (parent) {
                        parent.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; color: #6b7280; height: 200px;"><span>画像を読み込めませんでした</span></div>';
                      }
                    }
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* 作成手順 */}
        <div className="mt-8">
          <div className="flex items-center justify-end mb-6">
            <button
              onClick={() => {
                console.log('🔵 拡大表示ボタンがクリックされました');
                console.log('🔵 stepsWithImages.length:', stepsWithImages.length);
                if (stepsWithImages.length > 0) {
                  console.log('🔵 selectedStepIndexを0に設定');
                  setSelectedStepIndex(0);
                  console.log('🔵 showModalをtrueに設定');
                  setShowModal(true);
                } else {
                  console.log('🔴 stepsWithImagesが空です');
                }
              }}
              className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-300 bg-white text-gray-700 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 shadow-sm"
            >
              <Maximize2 className="w-4 h-4" />
              拡大表示
            </button>
          </div>

          <div className="space-y-4">
            {stepsWithImages.map((stepData, index) => {
              const step = stepData.step;
              const stepImages = stepData.images;
              
              // 小見出しの場合は枠なしで表示
              if (step.heading) {
                return (
                  <div key={step.id} className="mb-6">
                    <h3 className="text-xl font-semibold text-gray-700 mb-2">
                      {step.content}
                    </h3>
                  </div>
                );
              }

              // 手順番号を動的に計算（小見出しを除外）
              const stepNumber = stepsWithImages
                .slice(0, index + 1)
                .filter(s => !s.step.heading).length;

              return (
                <div key={step.id} className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
                  <div className="flex">
                    {/* 左側：手順番号と詳細（50%） */}
                    <div className="w-1/2 p-6">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 bg-gray-800 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                            {stepNumber}
                          </div>
                        </div>
                        <div className="flex-1">
                          <p className="text-gray-700 leading-relaxed text-lg">
                            {step.content}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* 右側：画像（50%） */}
                    <div className="w-1/2 p-6">
                      {stepImages.length > 0 ? (
                        <div className="space-y-3">
                          {stepImages.map((img, imgIndex) => (
                            <div key={img.id} className="relative group">
                              <img
                                src={img.image_url}
                                alt={`手順${stepNumber}の画像${imgIndex + 1}`}
                                className="w-full h-64 object-cover rounded-lg shadow-sm hover:shadow-md transition-shadow duration-300 cursor-pointer"
                                style={{ backgroundColor: 'white' }}
                                onClick={() => {
                                  console.log('🔵 手順画像がクリックされました。index:', index);
                                  setSelectedStepIndex(index);
                                  setShowModal(true);
                                }}
                                onError={(e) => {
                                  console.error('手順画像エラー:', {
                                    url: img.image_url,
                                    stepId: step.id,
                                    imgIndex
                                  });
                                  if (e.currentTarget) {
                                    e.currentTarget.style.display = 'none';
                                    const parent = e.currentTarget.parentElement;
                                    if (parent) {
                                      parent.innerHTML = '<div class="flex items-center justify-center text-gray-500 h-64 bg-gray-100 rounded-lg"><span>画像を読み込めませんでした</span></div>';
                                    }
                                  }
                                }}
                                onLoad={(e) => {
                                  console.log('手順画像読み込み成功:', {
                                    url: img.image_url,
                                    stepId: step.id,
                                    imgIndex,
                                    naturalWidth: e.currentTarget?.naturalWidth || 0,
                                    naturalHeight: e.currentTarget?.naturalHeight || 0,
                                    clientWidth: e.currentTarget?.clientWidth || 0,
                                    clientHeight: e.currentTarget?.clientHeight || 0
                                  });
                                }}
                              />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg">
                          <span className="text-gray-500">画像なし</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 工程完了ボタン */}
        <div className="mt-8 flex justify-center">
          <Button
            onClick={handleComplete}
            className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg shadow-lg transition-colors"
            style={{ 
              cursor: 'pointer',
              border: '2px solid red' // デバッグ用の赤い境界線
            }}
          >
            <Check className="w-5 h-5" />
            工程完了 (DEBUG)
          </Button>
        </div>

        {/* 既存のモーダル - テスト表示部分を削除 */}
        {showModal && currentStep && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    {selectedStepIndex !== null && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={prevStep}
                          disabled={selectedStepIndex === 0}
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <span className="text-sm text-gray-600">
                          {selectedStepIndex !== null ? selectedStepIndex + 1 : 0} / {stepsWithImages.length}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={nextStep}
                          disabled={selectedStepIndex === stepsWithImages.length - 1}
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                  <Button variant="outline" size="sm" onClick={closeModal}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    {!currentStep.step.heading && (
                      <div className="flex-shrink-0">
                        <span className="inline-flex items-center justify-center w-12 h-12 bg-blue-600 text-white text-xl font-bold rounded-full">
                          {selectedStepIndex !== null ? 
                            stepsWithImages
                              .slice(0, selectedStepIndex + 1)
                              .filter(s => !s.step.heading)
                              .length
                            : 0
                          }
                        </span>
                      </div>
                    )}
                    <div className="flex-1">
                      <h3 className={`font-bold text-gray-900 ${currentStep.step.heading ? 'text-2xl' : 'text-xl'}`}>
                        {currentStep.step.content}
                      </h3>
                    </div>
                  </div>
                  
                  {currentStep.images.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {currentStep.images.map((image) => (
                        <div key={image.id} style={{ minHeight: '250px', padding: '16px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                          <img
                            src={image.image_url}
                            alt={image.file_name}
                            style={{
                              display: 'block',
                              width: 'auto',
                              height: 'auto',
                              maxWidth: '100%',
                              maxHeight: '400px',
                              margin: '0 auto',
                              objectFit: 'contain',
                              backgroundColor: 'white',
                              borderRadius: '4px'
                            }}
                            onError={() => console.log('❌ モーダル画像エラー:', { url: image.image_url, imageId: image.id })}
                            onLoad={() => console.log('✅ モーダル画像成功:', { url: image.image_url, imageId: image.id })}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* 完成見本画像専用モーダル */}
        {showSampleImageModal && material.sample_image_url && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50"
            onClick={() => setShowSampleImageModal(false)} // 背景クリックで閉じる
          >
            <div className="relative w-full h-full flex items-center justify-center p-4">
              <button
                onClick={() => setShowSampleImageModal(false)}
                className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors z-10 bg-black bg-opacity-50 rounded-full p-2"
                style={{ fontSize: '20px' }}
              >
                ✕
              </button>
              <img
                src={material.sample_image_url}
                alt="完成見本（拡大表示）"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
                }}
                onClick={(e) => e.stopPropagation()} // 画像クリックでモーダルが閉じないようにする
              />
            </div>
          </div>
        )}
        
      </div>
    </div>
  );
}