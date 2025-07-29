"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Material } from '@/types/supabase';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Save } from 'lucide-react';

export default function MaterialTextPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [material, setMaterial] = useState<Material | null>(null);
  const [text, setText] = useState('');
  const [instruction, setInstruction] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fetchMaterial = async () => {
      try {
        const { id } = await params;
        const response = await fetch(`/api/materials/${id}`);
        if (response.ok) {
          const data = await response.json();
          setMaterial(data);
          // 初期値は空欄にする（既存データがある場合は読み込む）
          setText(data.transcript || '');
          setInstruction(data.instruction || '');
          setNote(data.note || '');
        } else {
          setError('教材の取得に失敗しました');
        }
      } catch (error) {
        setError('教材の取得中にエラーが発生しました');
      } finally {
        setLoading(false);
      }
    };

    fetchMaterial();
  }, [params]);

  const handleSave = async (status: 'draft' | 'completed') => {
    if (!material) return;

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/materials/${material.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text_registration: status, // text_registrationフィールドに状態を保存
          transcript: text, // transcriptフィールドにテキスト内容を保存
          instruction: instruction,
          note: note
        }),
      });

      if (response.ok) {
        setSuccess(status === 'completed' ? 'テキスト登録が完了しました' : '一時保存しました');
        setTimeout(() => {
          router.push('/admin/materials');
        }, 1500);
      } else {
        const data = await response.json();
        setError(data.error || '保存に失敗しました');
      }
    } catch (error) {
      setError('保存中にエラーが発生しました');
    } finally {
      setSaving(false);
    }
  };

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
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto p-6">
        {/* ヘッダー */}
        <div className="mb-8">
          <p className="text-gray-600">教材「{material.title}」のテキスト内容を編集します</p>
        </div>

        {/* エラー・成功メッセージ */}
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

        {/* テキスト編集フォーム */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              テキスト内容 *
            </label>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="教材のテキスト内容を入力してください"
              rows={15}
              className="w-full"
            />
            <p className="text-xs text-gray-500 mt-1">
              教材の詳細な説明や手順を記入してください
            </p>
          </div>

          {/* 作成指示 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              作成指示
            </label>
            <Textarea
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder="教材作成の指示を入力"
              rows={3}
              className="w-full"
            />
          </div>

          {/* 備考 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              備考
            </label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="備考を入力"
              rows={3}
              className="w-full"
            />
          </div>

          {/* アクションボタン */}
          <div className="flex justify-end gap-4">
            <Button
              variant="outline"
              onClick={() => handleSave('draft')}
              disabled={saving || !text.trim()}
              className="flex items-center gap-2"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              一時保存
            </Button>
            <Button
              onClick={() => handleSave('completed')}
              disabled={saving || !text.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              完了
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
} 