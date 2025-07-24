"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Material } from '@/types/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Eye } from 'lucide-react';

export default function AdminMaterialsPage() {
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

  const handleDelete = async (id: string) => {
    if (!confirm('この教材を削除しますか？')) return;

    try {
      const response = await fetch(`/api/materials/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchMaterials(); // 一覧を再取得
      } else {
        alert('削除に失敗しました');
      }
    } catch (error) {
      console.error('削除エラー:', error);
      alert('削除中にエラーが発生しました');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">教材管理</h1>
          <p className="text-gray-600 mt-2">
            学習教材の作成、編集、削除を行います
          </p>
        </div>
        <Link href="/admin/materials/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            新規作成
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {materials.map((material) => (
          <Card key={material.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <CardTitle className="text-lg line-clamp-2">
                    {material.title}
                  </CardTitle>
                  <CardDescription className="mt-2">
                    {material.description && (
                      <span className="line-clamp-2">{material.description}</span>
                    )}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="space-y-4">
                {/* Status Badges */}
                <div className="flex flex-wrap gap-2">
                  <Badge variant={material.video_registration === 'completed' ? 'default' : 'secondary'}>
                    動画: {material.video_registration}
                  </Badge>
                  <Badge variant={material.text_registration === 'completed' ? 'default' : 'secondary'}>
                    テキスト: {material.text_registration}
                  </Badge>
                  <Badge variant={material.confirmation === 'completed' ? 'default' : 'secondary'}>
                    確認: {material.confirmation}
                  </Badge>
                </div>

                {/* Software Info */}
                {material.software && (
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">ソフトウェア:</span> {material.software}
                    {material.version && ` (${material.version})`}
                  </div>
                )}

                {/* Created Date */}
                <div className="text-sm text-gray-500">
                  作成日: {new Date(material.created_at).toLocaleDateString('ja-JP')}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  <Link href={`/materials/${material.id}/steps`}>
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-1" />
                      表示
                    </Button>
                  </Link>
                  <Link href={`/admin/materials/${material.id}/edit`}>
                    <Button variant="outline" size="sm">
                      <Edit className="h-4 w-4 mr-1" />
                      編集
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(material.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    削除
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {materials.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-gray-500 text-lg mb-4">
              まだ教材が登録されていません
            </p>
            <Link href="/admin/materials/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                最初の教材を作成
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 