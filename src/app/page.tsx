"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Material } from '@/types/supabase';

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
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            学習教材管理システム
          </h1>
          <p className="text-lg text-gray-600 mb-6">
            教材の管理と共有を行うWebアプリケーション
          </p>
          <div className="flex justify-center gap-4">
            <Link
              href="/admin/login"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              管理者ログイン
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {materials.map((material) => (
            <div
              key={material.id}
              className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300"
            >
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
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {material.title}
                </h3>
                {material.description && (
                  <p className="text-gray-600 mb-4 line-clamp-3">
                    {material.description}
                  </p>
                )}
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    material.video_registration === 'completed' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    動画登録: {material.video_registration}
                  </span>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    material.text_registration === 'completed' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    テキスト: {material.text_registration}
                  </span>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    material.confirmation === 'completed' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    確認: {material.confirmation}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <Link
                    href={`/materials/${material.id}/steps`}
                    className="text-blue-600 hover:text-blue-800 font-medium"
                  >
                    詳細を見る →
                  </Link>
                  <span className="text-sm text-gray-500">
                    {new Date(material.created_at).toLocaleDateString('ja-JP')}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {materials.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">
              まだ教材が登録されていません
            </p>
          </div>
        )}
      </div>
    </div>
  );
} 