"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Material } from '@/types/supabase';
import { Button } from '@/components/ui/button';

export default function HomePage() {
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
      2: 'テキスト編集',
      3: '手順作成',
      4: '画像登録',
      5: '確認・承認'
    };
    return stepNames[step as keyof typeof stepNames] || '';
  };

  // 色分岐関数
  const STEP_COLORS = {
    done: 'bg-green-200 text-green-900',
    current: 'bg-blue-200 text-blue-900',
    todo: 'bg-gray-200 text-gray-600',
  };
  const getStepStatus = (step: number, currentStep: number) => {
    if (step < currentStep) return 'done';
    if (step === currentStep) return 'current';
    return 'todo';
  };
  const getStepColor = (step: number, currentStep: number) => STEP_COLORS[getStepStatus(step, currentStep)];

  // 事業所選択の処理
  const handleOfficeChange = async (materialId: string, office: string) => {
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
      <div className="min-h-screen bg-gray-50 py-8">
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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 border-b border-gray-200">
          <div className="flex items-center space-x-8">
            <div className="flex items-center space-x-4">
              <span className="text-lg font-semibold text-gray-700">工程:</span>
              <div className="flex space-x-2">
                <span className="border border-gray-300 text-gray-700 px-2 py-1 rounded">①動画登録</span>
                <span className="border border-gray-300 text-gray-700 px-2 py-1 rounded">②テキスト編集</span>
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
        <div className="flex justify-center gap-4">
          <Link
            href="/admin/login"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            管理者ログイン
          </Link>
        </div>

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
                  {/* タイトル */}
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">
                    {material.title}
                  </h3>

                  {/* 工程の進捗表示 */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      {/* タイトル削除済み */}
                    </div>
                    <div className="flex gap-2 w-full justify-between">
                      {[1, 2, 3, 4, 5].map((step) => (
                        <div
                          key={step}
                          className={`flex-1 h-10 rounded-full flex items-center justify-center text-base font-bold mx-1 ${getStepColor(step, currentStep)}`}
                          title={`${step}. ${getStepName(step)}`}
                          style={{ minWidth: 0 }}
                        >
                          {step}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ソフト名と詳細ボタン */}
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-medium text-gray-900">
                      {material.software || '未設定'}
                    </span>
                    <Link href={`/materials/${material.id}/steps`}>
                      <Button size="sm" variant="outline">
                        詳細
                      </Button>
                    </Link>
                  </div>

                  {/* 実施事業所選択 */}
                  <div className="mb-4">
                    <div className="grid grid-cols-3 gap-2">
                      {['加古川', '千葉', 'なし'].map((office) => (
                        <button
                          key={office}
                          onClick={() => handleOfficeChange(material.id, office)}
                          className={`px-4 py-2 text-sm rounded-md transition-colors ${getOfficeColor(office, (material.office || 'なし') === office)}`}
                        >
                          {office}
                        </button>
                      ))}
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