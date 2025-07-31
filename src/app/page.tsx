"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Material } from '@/types/supabase';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  const router = useRouter();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMaterials();
  }, []);

  const fetchMaterials = async () => {
    try {
      const response = await fetch('/api/materials');
      const data = await response.json();
      setMaterials(data);
    } catch (error) {
      console.error('教材の取得に失敗しました:', error);
    } finally {
      setLoading(false);
    }
  };

  // 工程の判定ロジック
  const getCurrentStep = (material: Material) => {
    if (material.video_registration !== 'completed') return 1;
    if (material.text_registration !== 'completed') return 2;
    if (material.text_revision !== 'completed') return 3;
    if (material.image_registration !== 'completed') return 4;
    if (material.confirmation !== 'completed') return 5;
    return 5; // 全て完了
  };

  // 工程名の取得
  const getStepName = (step: number) => {
    const stepNames = {
      1: '動画登録',
      2: 'テキスト登録',
      3: '手順作成',
      4: '画像登録',
      5: '確認・承認'
    };
    return stepNames[step as keyof typeof stepNames] || '';
  };

  // 工程の状態を取得
  const getStepStatus = (material: Material, step: number) => {
    const stepFields = {
      1: material.video_registration,
      2: material.text_registration,
      3: material.text_revision,
      4: material.image_registration,
      5: material.confirmation
    };
    return stepFields[step as keyof typeof stepFields] || 'pending';
  };

  // 色分岐関数
  const STEP_COLORS = {
    done: 'bg-green-200 text-green-900',
    current: 'bg-blue-200 text-blue-900',
    todo: 'bg-gray-200 text-gray-600 border border-gray-400',
    disabled: 'bg-gray-100 text-gray-400 border border-gray-300',
  };
  
  // 工程にアクセス可能かチェック
  const canAccessStep = (material: Material, targetStep: number) => {
    if (targetStep === 1) return true; // 工程1は常にアクセス可能
    
    // 前の工程が完了しているかチェック
    for (let i = 1; i < targetStep; i++) {
      const prevStepStatus = getStepStatus(material, i);
      if (prevStepStatus !== 'completed') {
        return false;
      }
    }
    return true;
  };
  
  const getStepColor = (material: Material, step: number) => {
    const status = getStepStatus(material, step);
    const currentStep = getCurrentStep(material);
    
    // デバッグ用ログ
    console.log(`Material: ${material.title}, Step: ${step}, Status: ${status}, CurrentStep: ${currentStep}`);
    
    // アクセスできない工程は無効化
    if (!canAccessStep(material, step) && status === 'pending') {
      return STEP_COLORS.disabled;
    }
    
    if (status === 'completed') return STEP_COLORS.done;
    if (status === 'draft') return STEP_COLORS.current; // draftの場合は青色（現在の工程）
    if (step === currentStep && status === 'pending') return STEP_COLORS.current; // 現在の工程でpendingの場合は青色
    return STEP_COLORS.todo; // pendingの場合は未着手
  };

  // 工程クリック時の処理
  const handleStepClick = (material: Material, step: number) => {
    const status = getStepStatus(material, step);
    
    // 一般画面では工程1、2、5の編集は不可
    if (step === 1 || step === 2 || step === 5) {
      alert('この工程は管理者画面でのみ編集可能です。');
      return;
    }
    
    // 完了済みの場合は編集ボタンを表示するため、何もしない
    if (status === 'completed') return;
    
    // 前の工程が完了しているかチェック
    const canAccessStep = (targetStep: number) => {
      if (targetStep === 1) return true; // 工程1は常にアクセス可能
      
      // 前の工程が完了しているかチェック
      for (let i = 1; i < targetStep; i++) {
        const prevStepStatus = getStepStatus(material, i);
        if (prevStepStatus !== 'completed') {
          return false;
        }
      }
      return true;
    };
    
    // アクセス可能かチェック
    if (!canAccessStep(step)) {
      alert('前の工程を完了してから進めてください。');
      return;
    }
    
    // 各工程の編集画面に遷移（工程1、2、5は除外）
    switch (step) {
      case 3:
        router.push(`/materials/${material.id}/steps`);
        break;
      case 4:
        router.push(`/materials/${material.id}/images`);
        break;
      default:
        alert('この工程は管理者画面でのみ編集可能です。');
        break;
    }
  };

  // 編集ボタン用：必ず編集画面に遷移（工程1、2、5は除外）
  const handleEditStepClick = (material: Material, step: number) => {
    // 一般画面では工程1、2、5の編集は不可
    if (step === 1 || step === 2 || step === 5) {
      alert('この工程は管理者画面でのみ編集可能です。');
      return;
    }
    
    switch (step) {
      case 3:
        router.push(`/materials/${material.id}/steps`);
        break;
      case 4:
        router.push(`/materials/${material.id}/images`);
        break;
      default:
        alert('この工程は管理者画面でのみ編集可能です。');
        break;
    }
  };

  // 事業所選択の処理
  const handleOfficeChange = async (materialId: string, office: string) => {
    // 既に加古川か千葉が選択されている場合は編集不可
    const material = materials.find(m => m.id === materialId);
    if (material && (material.office === '加古川' || material.office === '千葉')) {
      alert('事業所は既に選択済みです。変更はできません。');
      return;
    }
    
    try {
      const response = await fetch(`/api/materials/${materialId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ office }),
      });
      
      if (response.ok) {
        // 成功したら材料一覧を再取得
        fetchMaterials();
      } else {
        console.error('事業所の更新に失敗しました');
      }
    } catch (error) {
      console.error('事業所の更新中にエラーが発生しました:', error);
    }
  };

  // 事業所選択ボタンの色分岐
  const getOfficeColor = (office: string, selected: boolean) => {
    if (!selected) return 'bg-white text-gray-700 border border-gray-300';
    if (office === '加古川') return 'bg-pink-200 text-pink-900';
    if (office === '千葉') return 'bg-orange-200 text-orange-900';
    if (office === 'なし') return 'bg-green-100 text-green-900';
    return '';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">読み込み中...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 border-b border-gray-200">
          <div className="flex items-center space-x-8">
            <div className="flex items-center space-x-4">
              <span className="text-lg font-semibold text-gray-700">工程:</span>
              <div className="flex space-x-2">
                <span className="border border-gray-300 text-gray-700 px-2 py-1 rounded">①動画登録</span>
                <span className="border border-gray-300 text-gray-700 px-2 py-1 rounded">②テキスト登録</span>
                <span className="border border-gray-300 text-gray-700 px-2 py-1 rounded">③手順作成</span>
                <span className="border border-gray-300 text-gray-700 px-2 py-1 rounded">④画像登録</span>
                <span className="border border-gray-300 text-gray-700 px-2 py-1 rounded">⑤確認・承認</span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-lg font-semibold text-gray-700">状態:</span>
              <div className="flex space-x-2">
                <span className="bg-green-200 text-green-900 px-2 py-1 rounded">完了</span>
                <span className="bg-blue-200 text-blue-900 px-2 py-1 rounded">現在の工程</span>
                <span className="bg-gray-200 text-gray-600 px-2 py-1 rounded">未着手</span>
                <span className="bg-yellow-200 text-yellow-900 px-2 py-1 rounded">一時保存</span>
              </div>
            </div>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {materials.map((material) => {
            const currentStep = getCurrentStep(material);
            
            return (
              <div
                key={material.id}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300"
              >
                {/* サムネイル */}
                {material.thumbnail && (
                  <div className="aspect-video bg-gray-200">
                    <img
                      src={material.thumbnail}
                      alt={material.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                <div className="p-6">
                  {/* タイトル - 固定高さで統一 */}
                  <div className="h-16 mb-4 flex items-start">
                    <h3 className="text-lg font-semibold text-gray-900 line-clamp-2 leading-tight">
                      {material.title}
                    </h3>
                  </div>

                  {/* 工程の進捗表示 */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      {/* タイトル削除済み */}
                    </div>
                    <div className="flex gap-2 w-full justify-between">
                      {[1, 2, 3, 4, 5].map((step) => {
                        const status = getStepStatus(material, step);
                        const isCompleted = status === 'completed';
                        const canAccess = canAccessStep(material, step);
                        const isDisabled = isCompleted || !canAccess;
                        
                        // 一般画面では工程1、2、5は無効
                        const isGeneralRestricted = step === 1 || step === 2 || step === 5;
                        const finalDisabled = isDisabled || isGeneralRestricted;
                        
                        return (
                          <div key={step} className="flex-1 relative">
                            <button
                              onClick={() => handleStepClick(material, step)}
                              className={`w-full h-10 rounded-full flex items-center justify-center text-base font-bold mx-1 transition-colors ${
                                isGeneralRestricted 
                                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                                  : getStepColor(material, step)
                              } ${!finalDisabled ? 'hover:opacity-80 cursor-pointer' : 'cursor-not-allowed'}`}
                              title={isGeneralRestricted ? '管理者画面でのみ編集可能' : `${step}. ${getStepName(step)}`}
                              style={{ minWidth: 0 }}
                              disabled={finalDisabled}
                            >
                              {step}
                            </button>
                            {isCompleted && !isGeneralRestricted && (
                              <button
                                onClick={() => handleEditStepClick(material, step)}
                                className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center hover:bg-blue-600"
                                title="編集"
                              >
                                ✏️
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* ソフト名と詳細ボタン */}
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-medium text-gray-900">
                      {material.software || '未設定'}
                    </span>
                    <Link href={`/materials/${material.id}/detail`}>
                      <Button size="sm" variant="outline">
                        詳細
                      </Button>
                    </Link>
                  </div>

                  {/* 実施事業所選択 */}
                  <div className="mb-4">
                    <div className="grid grid-cols-3 gap-2">
                      {['加古川', '千葉', 'なし'].map((office) => {
                        const isSelected = (material.office || 'なし') === office;
                        const isDisabled = (material.office === '加古川' || material.office === '千葉') && !isSelected;
                        
                        return (
                          <button
                            key={office}
                            onClick={() => handleOfficeChange(material.id, office)}
                            disabled={isDisabled}
                            className={`px-4 py-2 text-sm rounded-md transition-colors ${
                              isDisabled 
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                                : getOfficeColor(office, isSelected)
                            }`}
                          >
                            {office}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {materials.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">
              まだ教材が登録されていません
            </p>
          </div>
        )}
      </main>
    </div>
  );
} 