"use client";

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Material, RecipeStep, MaterialImage } from '@/types/supabase';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, X, Maximize2 } from 'lucide-react';

interface StepWithImages {
  step: RecipeStep;
  images: MaterialImage[];
}

export default function MaterialDetailPage() {
  const params = useParams();
  const materialId = params?.id as string;
  const [material, setMaterial] = useState<Material | null>(null);
  const [steps, setSteps] = useState<RecipeStep[]>([]);
  const [stepImages, setStepImages] = useState<MaterialImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedStepIndex, setSelectedStepIndex] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);

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

  // 手順と画像を組み合わせる
  const stepsWithImages: StepWithImages[] = steps.map(step => {
    const filteredImages = stepImages.filter(img => img.step_id === step.step_number);
    return {
      step,
      images: filteredImages
    };
  });

  const closeModal = () => {
    setShowModal(false);
    setSelectedStepIndex(null);
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

  const currentStep = selectedStepIndex !== null ? stepsWithImages[selectedStepIndex] : null;

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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{material.title}</h1>
          {material.software && (
            <p className="text-lg text-gray-600">使用ソフト: {material.software}</p>
          )}
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

        {/* 手順一覧 */}
        {stepsWithImages.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">手順</h2>
              <Button
                onClick={() => {
                  setSelectedStepIndex(0);
                  setShowModal(true);
                }}
                className="flex items-center gap-2"
              >
                <Maximize2 className="w-4 h-4" />
                拡大表示
              </Button>
            </div>
            
            <div className="space-y-6">
              {stepsWithImages.map((stepWithImages, index) => {
                const { step, images } = stepWithImages;
                const stepNumber = stepsWithImages
                  .slice(0, index + 1)
                  .filter(s => !s.step.heading)
                  .length;

                return (
                  <div key={step.id} className="border rounded-lg p-6 bg-gray-50">
                    <div className="flex items-start gap-4">
                      {!step.heading && (
                        <div className="flex-shrink-0">
                          <span className="inline-flex items-center justify-center w-12 h-12 bg-blue-600 text-white text-xl font-bold rounded-full">
                            {stepNumber}
                          </span>
                        </div>
                      )}
                      <div className="flex-1">
                        <h3 className={`font-bold text-gray-900 ${step.heading ? 'text-2xl' : 'text-xl'}`}>
                          {step.content}
                        </h3>
                        
                        {images.length > 0 && (
                          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                            {images.map((image) => (
                              <div key={image.id} className="relative group">
                                <img
                                  src={image.image_url}
                                  alt={image.file_name}
                                  className="w-full h-48 object-cover rounded-lg shadow-sm hover:shadow-md transition-shadow duration-300 cursor-pointer"
                                  onClick={() => {
                                    setSelectedStepIndex(index);
                                    setShowModal(true);
                                  }}
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 完成見本 */}
        {material.sample_image_url && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">完成見本</h2>
            <div className="relative group cursor-pointer" onClick={() => setShowModal(true)}>
              <div className="w-full max-w-md bg-gray-100 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden">
                <img
                  src={material.sample_image_url}
                  alt="完成見本"
                  className="w-full h-auto object-contain"
                />
              </div>
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300 rounded-lg flex items-center justify-center pointer-events-none">
                <div className="bg-white bg-opacity-90 rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <Maximize2 className="w-5 h-5 text-gray-700" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* モーダル */}
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
                          {selectedStepIndex + 1} / {stepsWithImages.length}
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
                        <div key={image.id} className="bg-gray-100 rounded-lg overflow-hidden">
                          <img
                            src={image.image_url}
                            alt={image.file_name}
                            className="w-full h-auto object-contain"
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
      </div>
    </div>
  );
} 