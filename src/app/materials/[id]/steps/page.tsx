"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Material, RecipeStep } from '@/types/supabase';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, Save, Loader2, Check } from 'lucide-react';
import { Collapsible } from '@/components/ui/collapsible';

interface StepInput {
  content: string;
  isHeading: boolean;
}

interface Bookmark {
  id: string;
  start: number;
  end: number;
  text: string;
  color: string;
  note: string;
}

export default function StepsEditPage() {
  const params = useParams();
  const materialId = params?.id as string;
  const router = useRouter();
  
  console.log('🔵 StepsEditPage 開始:', { materialId, params });
  
  const [material, setMaterial] = useState<Material | null>(null);
  const [steps, setSteps] = useState<RecipeStep[]>([]);
  const [newSteps, setNewSteps] = useState<StepInput[]>([{ content: '', isHeading: false }]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingNote, setEditingNote] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [selectedText, setSelectedText] = useState('');
  const [showBookmarkModal, setShowBookmarkModal] = useState(false);
  const [bookmarkColor, setBookmarkColor] = useState('yellow');
  const [bookmarkNote, setBookmarkNote] = useState('');
  const [showBookmarkButton, setShowBookmarkButton] = useState(false);
  const [bookmarkButtonPosition, setBookmarkButtonPosition] = useState({ x: 0, y: 0 });
  const [hoveredBookmark, setHoveredBookmark] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [materialId]);

  // デバッグ用：newStepsの状態変化を監視
  useEffect(() => {
    console.log('newSteps状態変化:', newSteps);
  }, [newSteps]);

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
        setError(materialError.message);
        return;
      }
      setMaterial(materialData);
      setNoteText(materialData.note || '');

      // 既存の手順を取得（recipe_stepsテーブルから）
      const response = await fetch(`/api/materials/${materialId}/recipe-steps`);
      if (response.ok) {
        const stepsData = await response.json();
        console.log('取得した手順データ:', stepsData);
        setSteps(stepsData);
        
        // 既存の手順を入力欄に表示
        if (stepsData.length > 0) {
          console.log('既存の手順を入力欄に設定:', stepsData);
          const existingStepsInput = stepsData.map((step: RecipeStep) => ({
            content: step.content,
            isHeading: !!step.heading
          }));
          console.log('変換後の入力データ:', existingStepsInput);
          setNewSteps(existingStepsInput);
        } else {
          console.log('既存の手順がありません');
        }
      } else {
        console.error('手順取得エラー:', response.statusText);
        setError('手順の取得に失敗しました');
      }
    } catch (err) {
      console.error('データ取得エラー:', err);
      setError('データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const addNewStep = () => {
    setNewSteps([...newSteps, { content: '', isHeading: false }]);
  };

  const removeNewStep = (index: number) => {
    setNewSteps(newSteps.filter((_, i) => i !== index));
  };

  const updateNewStep = (index: number, field: keyof StepInput, value: string | boolean) => {
    const updatedSteps = [...newSteps];
    updatedSteps[index] = { ...updatedSteps[index], [field]: value };
    setNewSteps(updatedSteps);
  };

  const handleTemporarySave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      // 新しい手順を一時保存（draftステータス）
      const stepsToSave = newSteps
        .filter(step => step.content.trim())
        .map((step, index) => ({
          material_id: materialId,
          step_number: index + 1,
          content: step.content.trim(),
          heading: step.isHeading ? step.content.trim() : null
        }));

      console.log('保存する手順:', stepsToSave);
      console.log('materialId:', materialId);
      console.log('newSteps:', newSteps);
      console.log('stepsToSave JSON:', JSON.stringify(stepsToSave, null, 2));

      if (stepsToSave.length > 0) {
        // 既存の手順を削除
        const deleteResponse = await fetch(`/api/materials/${materialId}/recipe-steps`, {
          method: 'DELETE',
        });

        if (!deleteResponse.ok) {
          console.error('既存手順削除エラー:', deleteResponse.statusText);
          const deleteErrorData = await deleteResponse.json();
          console.error('削除エラー詳細:', deleteErrorData);
        }

        // 新しい手順をrecipe_stepsテーブルに保存
        const response = await fetch(`/api/materials/${materialId}/recipe-steps`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(stepsToSave),
        });

        console.log('POST response status:', response.status);
        console.log('POST response ok:', response.ok);
        console.log('POST response headers:', Object.fromEntries(response.headers.entries()));

        if (response.ok) {
          // 教材のtext_revisionステータスを更新
          const materialResponse = await fetch(`/api/materials/${materialId}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              text_revision: 'draft'
            }),
          });

          if (materialResponse.ok) {
            setSuccess('手順を一時保存しました');
            // 保存した手順を入力欄に表示
            const savedStepsInput = stepsToSave.map(step => ({
              content: step.content,
              isHeading: !!step.heading
            }));
            setNewSteps(savedStepsInput);
            
            // 手順一覧を再取得
            await fetchData();
          } else {
            const data = await materialResponse.json();
            console.error('教材更新エラー:', data);
            setError(data.error || '教材の更新に失敗しました');
          }
        } else {
          const responseText = await response.text();
          console.error('POST response text:', responseText);
          
          let data;
          try {
            data = JSON.parse(responseText);
          } catch (parseError) {
            console.error('JSON parse error:', parseError);
            data = { error: 'レスポンスの解析に失敗しました' };
          }
          
          console.error('手順保存エラー詳細:', data);
          setError(data.error || '手順の保存に失敗しました');
        }
      } else {
        setError('保存する手順がありません');
        return;
      }
    } catch (err) {
      console.error('一時保存エラー:', err);
      setError(`一時保存に失敗しました: ${err instanceof Error ? err.message : '不明なエラー'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async () => {
    setCompleting(true);
    setError('');
    setSuccess('');

    try {
      // 新しい手順を完了ステータスで保存
      const stepsToSave = newSteps
        .filter(step => step.content.trim())
        .map((step, index) => ({
          material_id: materialId,
          step_number: index + 1,
          content: step.content.trim(),
          heading: step.isHeading ? step.content.trim() : null
        }));

      console.log('完了保存する手順:', stepsToSave);

      if (stepsToSave.length > 0) {
        // 既存の手順を削除
        const deleteResponse = await fetch(`/api/materials/${materialId}/recipe-steps`, {
          method: 'DELETE',
        });

        if (!deleteResponse.ok) {
          console.error('既存手順削除エラー:', deleteResponse.statusText);
          const deleteErrorData = await deleteResponse.json();
          console.error('削除エラー詳細:', deleteErrorData);
        }

        // 新しい手順をrecipe_stepsテーブルに保存
        const response = await fetch(`/api/materials/${materialId}/recipe-steps`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(stepsToSave),
        });

        console.log('POST response status:', response.status);
        console.log('POST response ok:', response.ok);

        if (response.ok) {
          // 教材のtext_revisionステータスを更新
          const materialResponse = await fetch(`/api/materials/${materialId}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              text_revision: 'completed'
            }),
          });

          if (materialResponse.ok) {
            setSuccess('手順作成が完了しました');
            // 完了時は入力内容をクリア
            setNewSteps([{ content: '', isHeading: false }]);
            
            // 手順一覧を再取得
            await fetchData();
            router.push('/admin/materials'); // 完了後に管理者の材料一覧にリダイレクト
          } else {
            const data = await materialResponse.json();
            console.error('教材更新エラー:', data);
            setError(data.error || '教材の更新に失敗しました');
          }
        } else {
          const responseText = await response.text();
          console.error('POST response text:', responseText);
          
          let data;
          try {
            data = JSON.parse(responseText);
          } catch (parseError) {
            console.error('JSON parse error:', parseError);
            data = { error: 'レスポンスの解析に失敗しました' };
          }
          
          console.error('完了保存エラー詳細:', data);
          setError(data.error || '完了保存に失敗しました');
        }
      } else {
        setError('完了保存する手順がありません');
        return;
      }
    } catch (err) {
      console.error('完了処理エラー:', err);
      setError(`完了処理に失敗しました: ${err instanceof Error ? err.message : '不明なエラー'}`);
    } finally {
      setCompleting(false);
    }
  };

  const handleDelete = async (stepId: string) => {
    if (!confirm('この手順を削除しますか？')) return;

    try {
      const response = await fetch(`/api/materials/${materialId}/recipe-steps?stepId=${stepId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // 手順一覧を再取得
        await fetchData();
      } else {
        const data = await response.json();
        setError(data.error || '削除に失敗しました');
      }
    } catch (err) {
      setError('削除に失敗しました');
    }
  };

  const handleNoteSave = async () => {
    try {
      const { error } = await supabase
        .from('materials')
        .update({ note: noteText })
        .eq('id', materialId);

      if (error) {
        console.error('備考保存エラー:', error);
        alert('備考の保存に失敗しました');
        return;
      }

      setEditingNote(false);
      setSuccess('備考を保存しました');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('備考保存エラー:', error);
      alert('備考の保存に失敗しました');
    }
  };

  // テキスト選択時の処理
  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      // 選択位置にしおりボタンを表示
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const container = document.querySelector('.text-container');
      if (container) {
        const containerRect = container.getBoundingClientRect();
        setBookmarkButtonPosition({
          x: rect.left - containerRect.left + rect.width / 2,
          y: rect.top - containerRect.top - 40
        });
        setSelectedText(selection.toString().trim());
        setShowBookmarkButton(true);
      }
    } else {
      setShowBookmarkButton(false);
    }
  };

  // しおりボタンクリック時の処理
  const handleBookmarkButtonClick = () => {
    setShowBookmarkModal(true);
    setShowBookmarkButton(false);
  };

  // 右クリックメニューの処理
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      setSelectedText(selection.toString().trim());
      setShowBookmarkModal(true);
    }
  };

  // しおりを追加
  const addBookmark = () => {
    if (!selectedText.trim()) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const container = range.startContainer;
    const textNode = container.nodeType === Node.TEXT_NODE ? container : container.firstChild;
    
    if (!textNode || textNode.nodeType !== Node.TEXT_NODE) return;

    const textContent = textNode.textContent || '';
    const start = range.startOffset;
    const end = range.endOffset;

    const newBookmark: Bookmark = {
      id: Date.now().toString(),
      start,
      end,
      text: selectedText,
      color: bookmarkColor,
      note: bookmarkNote
    };

    setBookmarks([...bookmarks, newBookmark]);
    setSelectedText('');
    setShowBookmarkModal(false);
    setBookmarkColor('yellow');
    setBookmarkNote('');
    selection.removeAllRanges();
  };

  // しおりを削除
  const removeBookmark = (bookmarkId: string) => {
    setBookmarks(bookmarks.filter(b => b.id !== bookmarkId));
  };

  // テキストにマーカーを適用
  const applyBookmarks = (text: string) => {
    if (bookmarks.length === 0) return text;

    let result = text;
    const sortedBookmarks = [...bookmarks].sort((a, b) => b.start - a.start);

    sortedBookmarks.forEach(bookmark => {
      const before = result.substring(0, bookmark.start);
      const marked = result.substring(bookmark.start, bookmark.end);
      const after = result.substring(bookmark.end);
      
      const markerClass = {
        yellow: 'bg-yellow-200',
        green: 'bg-green-200',
        blue: 'bg-blue-200',
        pink: 'bg-pink-200',
        orange: 'bg-orange-200'
      }[bookmark.color] || 'bg-yellow-200';

      const hoverClass = hoveredBookmark === bookmark.id ? 'ring-2 ring-blue-400' : '';
      const noteIcon = bookmark.note ? ' 📝' : '';

      result = `${before}<mark class="${markerClass} ${hoverClass} cursor-pointer relative group" title="${bookmark.note || bookmark.text}" data-bookmark-id="${bookmark.id}" onmouseenter="this.setAttribute('data-hover', 'true')" onmouseleave="this.removeAttribute('data-hover')">${marked}${noteIcon}<span class="absolute -top-6 left-0 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">${bookmark.note || 'メモなし'}</span></mark>${after}`;
    });

    return result;
  };

  // キーボードショートカットの処理
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Ctrl+B でしおりを追加
    if (e.ctrlKey && e.key === 'b') {
      e.preventDefault();
      const selection = window.getSelection();
      if (selection && selection.toString().trim()) {
        setSelectedText(selection.toString().trim());
        setShowBookmarkModal(true);
      }
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

  // 手順詳細の通し番号を計算
  // let stepNumber = 1;

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto p-6">
        {/* ヘッダー */}
        <div className="mb-8">
          <p className="text-gray-600">教材「{material.title}」の手順を作成します</p>
        </div>

        {/* エラー・成功メッセージ */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
          </div>
        )}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-800">{success}</p>
          </div>
        )}

        {/* 動画情報（トグル） */}
        <div className="mb-6">
          <Collapsible title="動画情報" defaultOpen={false} className="border-gray-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">動画タイトル</h4>
                <p className="text-gray-600">{material.video_title || '未設定'}</p>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-2">動画URL</h4>
                <p className="text-gray-600">{material.youtube_url || '未設定'}</p>
              </div>
              <div className="md:col-span-2">
                <h4 className="font-medium text-gray-900 mb-2">動画説明</h4>
                <p className="text-gray-600">{material.video_description || '未設定'}</p>
              </div>
            </div>
          </Collapsible>
        </div>

        {/* 作成指示と備考（横並び） */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-md p-6 border-2 border-red-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">作成指示</h3>
            <p className="text-gray-700 whitespace-pre-wrap">
              {material.instruction || '作成指示がありません'}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 border-2 border-blue-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">備考</h3>
              <Button
                onClick={() => setEditingNote(!editingNote)}
                variant="outline"
                size="sm"
                className="text-blue-600 border-blue-300 hover:bg-blue-50"
              >
                {editingNote ? 'キャンセル' : '編集'}
              </Button>
            </div>
            {editingNote ? (
              <div className="space-y-3">
                <Textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="備考を入力してください"
                  rows={4}
                  className="w-full"
                />
                <div className="flex gap-2">
                  <Button
                    onClick={handleNoteSave}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    保存
                  </Button>
                  <Button
                    onClick={() => {
                      setEditingNote(false);
                      setNoteText(material.note || '');
                    }}
                    variant="outline"
                    size="sm"
                  >
                    キャンセル
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-gray-700 whitespace-pre-wrap">
                {material.note || '備考がありません'}
              </p>
            )}
          </div>
        </div>

        {/* 2列レイアウト */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* 左列：工程2で登録したテキスト全文 */}
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-300 sticky top-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">テキスト全文</h3>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setBookmarks([])}
                  variant="outline"
                  size="sm"
                  className="text-red-600 border-red-300 hover:bg-red-50"
                >
                  マーカー全削除
                </Button>
              </div>
            </div>
            
            {/* しおり一覧 */}
            {bookmarks.length > 0 && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-medium text-gray-700 mb-2">しおり一覧</h4>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {bookmarks.map((bookmark) => (
                    <div key={bookmark.id} className="flex items-center gap-2 text-xs">
                      <div 
                        className={`w-3 h-3 rounded-full ${
                          bookmark.color === 'yellow' ? 'bg-yellow-400' :
                          bookmark.color === 'green' ? 'bg-green-400' :
                          bookmark.color === 'blue' ? 'bg-blue-400' :
                          bookmark.color === 'pink' ? 'bg-pink-400' :
                          bookmark.color === 'orange' ? 'bg-orange-400' : 'bg-yellow-400'
                        }`}
                      />
                      <span className="flex-1 truncate" title={bookmark.text}>
                        {bookmark.text.length > 30 ? bookmark.text.substring(0, 30) + '...' : bookmark.text}
                      </span>
                      {bookmark.note && (
                        <span className="text-gray-500" title={bookmark.note}>
                          📝
                        </span>
                      )}
                      <Button
                        onClick={() => removeBookmark(bookmark.id)}
                        variant="outline"
                        size="sm"
                        className="text-red-600 border-red-300 hover:bg-red-50 p-1 h-6"
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ヘルプテキスト */}
            <div className="mb-4 p-2 bg-blue-50 rounded-lg text-xs text-blue-700">
              <p className="mb-1"><strong>しおりの追加方法：</strong></p>
              <ul className="space-y-1 text-xs">
                <li>• テキストを選択 → 「📖 しおり追加」ボタンをクリック</li>
                <li>• 右クリック → しおりを追加</li>
                <li>• Ctrl+B（テキスト選択後）</li>
              </ul>
              <p className="mt-2 text-xs text-blue-600">
                💡 しおり位置インジケーターで各しおりの位置を確認できます
              </p>
            </div>

            <div 
              className="bg-gray-50 rounded-lg p-4 overflow-y-auto cursor-text text-container relative" 
              style={{ maxHeight: 'calc(100vh - 400px)' }}
              onMouseUp={handleTextSelection}
              onContextMenu={handleContextMenu}
              onKeyDown={handleKeyDown}
            >
              {/* しおりボタン */}
              {showBookmarkButton && (
                <div 
                  className="absolute z-20 bg-blue-600 text-white px-3 py-1 rounded-lg shadow-lg cursor-pointer hover:bg-blue-700 transition-colors"
                  style={{
                    left: bookmarkButtonPosition.x,
                    top: bookmarkButtonPosition.y,
                    transform: 'translateX(-50%)'
                  }}
                  onClick={handleBookmarkButtonClick}
                >
                  📖 しおり追加
                </div>
              )}

              {/* しおり位置インジケーター */}
              {bookmarks.length > 0 && (
                <div className="absolute right-2 top-2 bg-white rounded-lg shadow-md p-2 text-xs">
                  <div className="font-medium text-gray-700 mb-1">しおり位置</div>
                  <div className="space-y-1">
                    {bookmarks.map((bookmark, index) => (
                      <div 
                        key={bookmark.id}
                        className="flex items-center gap-1 cursor-pointer hover:bg-gray-100 p-1 rounded"
                        onMouseEnter={() => setHoveredBookmark(bookmark.id)}
                        onMouseLeave={() => setHoveredBookmark(null)}
                      >
                        <div 
                          className={`w-2 h-2 rounded-full ${
                            bookmark.color === 'yellow' ? 'bg-yellow-400' :
                            bookmark.color === 'green' ? 'bg-green-400' :
                            bookmark.color === 'blue' ? 'bg-blue-400' :
                            bookmark.color === 'pink' ? 'bg-pink-400' :
                            bookmark.color === 'orange' ? 'bg-orange-400' : 'bg-yellow-400'
                          }`}
                        />
                        <span className="text-gray-600">#{index + 1}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div 
                className="text-gray-700 whitespace-pre-wrap text-sm"
                dangerouslySetInnerHTML={{ 
                  __html: applyBookmarks(material.transcript || 'テキストが登録されていません') 
                }}
              />
            </div>
          </div>

          {/* 右列：手順作成入力欄 */}
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-900">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">手順作成</h3>
              <Button
                onClick={addNewStep}
                size="sm"
                className="flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                手順追加
              </Button>
            </div>

            <div className="space-y-4">
              {newSteps.map((step, index) => {
                // 通し番号を計算（小見出しを除く）
                const currentStepNumber = newSteps
                  .slice(0, index + 1)
                  .filter((s, i) => !s.isHeading)
                  .length;
                
                return (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-4">
                                                 {!step.isHeading && (
                           <span className="text-sm font-medium text-white bg-gray-900 px-2 py-1 rounded">
                             {currentStepNumber}
                           </span>
                         )}
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={step.isHeading}
                            onChange={(e) => updateNewStep(index, 'isHeading', e.target.checked)}
                            className="rounded"
                          />
                          <span className="text-sm font-medium">
                            小見出しにする
                          </span>
                        </label>
                      </div>
                      {newSteps.length > 1 && (
                        <Button
                          onClick={() => removeNewStep(index)}
                          variant="outline"
                          size="sm"
                          className="text-red-600 border-red-300 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    <Textarea
                      value={step.content}
                      onChange={(e) => updateNewStep(index, 'content', e.target.value)}
                      placeholder={step.isHeading ? "小見出しを入力してください" : "詳細手順を入力してください"}
                      rows={3}
                      className="w-full"
                    />
                  </div>
                );
              })}
            </div>

            <div className="mt-6 space-y-3">
              <Button
                onClick={handleTemporarySave}
                disabled={saving || completing || newSteps.every(step => !step.content.trim())}
                variant="outline"
                className="w-full flex items-center gap-2"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                一時保存
              </Button>
              <Button
                onClick={handleComplete}
                disabled={saving || completing || newSteps.every(step => !step.content.trim())}
                className="w-full flex items-center gap-2"
              >
                {completing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                完了
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* しおり追加モーダル */}
      {showBookmarkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">しおりを追加</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  選択したテキスト
                </label>
                <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded border">
                  {selectedText}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  マーカー色
                </label>
                <div className="flex gap-2">
                  {['yellow', 'green', 'blue', 'pink', 'orange'].map((color) => (
                    <button
                      key={color}
                      onClick={() => setBookmarkColor(color)}
                      className={`w-8 h-8 rounded-full border-2 ${
                        bookmarkColor === color ? 'border-gray-900' : 'border-gray-300'
                      } ${
                        color === 'yellow' ? 'bg-yellow-400' :
                        color === 'green' ? 'bg-green-400' :
                        color === 'blue' ? 'bg-blue-400' :
                        color === 'pink' ? 'bg-pink-400' :
                        color === 'orange' ? 'bg-orange-400' : 'bg-yellow-400'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  メモ（任意）
                </label>
                <Textarea
                  value={bookmarkNote}
                  onChange={(e) => setBookmarkNote(e.target.value)}
                  placeholder="メモを入力してください"
                  rows={3}
                  className="w-full"
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  onClick={() => {
                    setShowBookmarkModal(false);
                    setSelectedText('');
                    setBookmarkColor('yellow');
                    setBookmarkNote('');
                  }}
                  variant="outline"
                >
                  キャンセル
                </Button>
                <Button
                  onClick={addBookmark}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  しおりを追加
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 