"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Material, RecipeStep, MaterialImage } from '@/types/supabase';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Loader2, Plus, X, Edit, Save, Check } from 'lucide-react';
import { Collapsible } from '@/components/ui/collapsible';

interface StepInput {
  content: string;
  isHeading: boolean;
}

interface StepImage {
  stepId: number;
  images: MaterialImage[];
}

export default function ImagesEditPage() {
  const params = useParams();
  const materialId = params?.id as string;
  const router = useRouter();
  const [material, setMaterial] = useState<Material | null>(null);
  const [stepImages, setStepImages] = useState<StepImage[]>([]);
  const [newSteps, setNewSteps] = useState<StepInput[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingNote, setEditingNote] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [software, setSoftware] = useState('');
  const [version, setVersion] = useState('');
  const [learningNote, setLearningNote] = useState('');
  const [sampleImageUrl, setSampleImageUrl] = useState('');
  const [showStepEditing, setShowStepEditing] = useState(false);

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
      setSoftware(materialData.software || '');
      setVersion(materialData.version || '');
      setLearningNote(materialData.learning_note || '');
      setSampleImageUrl(materialData.sample_image_url || '');

      // 既存の手順を取得
      const response = await fetch(`/api/materials/${materialId}/recipe-steps`);
      if (response.ok) {
        const stepsData = await response.json();
        
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
        
        // 各手順の画像を取得
        const stepImagesData: StepImage[] = [];
        for (const step of stepsData) {
          const { data: images } = await supabase
            .from('material_images')
            .select('*')
            .eq('material_id', materialId)
            .eq('step_id', step.step_number)
            .order('order', { ascending: true });
          
          stepImagesData.push({
            stepId: step.step_number,
            images: images || []
          });
        }
        setStepImages(stepImagesData);
      } else {
        console.error('手順取得エラー:', response.statusText);
        setError('手順の取得に失敗しました');
      }
    } catch {
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
      // 新しい手順を一時保存ステータスで保存
      const stepsToSave = newSteps
        .filter(step => step.content.trim())
        .map((step, index) => ({
          material_id: materialId,
          step_number: index + 1,
          content: step.content.trim(),
          heading: step.isHeading ? step.content.trim() : null
        }));

      console.log('一時保存する手順:', stepsToSave);

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
              text_revision: 'in_progress'
            }),
          });

          if (materialResponse.ok) {
            setSuccess('手順が一時保存されました');
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
          
          console.error('一時保存エラー詳細:', data);
          setError(data.error || '一時保存に失敗しました');
        }
      } else {
        setError('一時保存する手順がありません');
        return;
      }
    } catch (err) {
      console.error('一時保存処理エラー:', err);
      setError(`一時保存処理に失敗しました: ${err instanceof Error ? err.message : '不明なエラー'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (stepId: number, file: File) => {
    try {
      // ファイルサイズチェック（5MB制限）
      if (file.size > 5 * 1024 * 1024) {
        setError('ファイルサイズは5MB以下にしてください');
        return;
      }

      // ファイルタイプチェック
      if (!file.type.startsWith('image/')) {
        setError('画像ファイルのみアップロード可能です');
        return;
      }

      console.log('画像アップロード開始:', {
        materialId,
        stepId,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type
      });

      // 環境変数の確認
      console.log('環境変数確認:', {
        hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasSupabaseAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL
      });

      // Supabase Storageバケットの存在確認
      try {
        console.log('Supabaseクライアント設定確認:', {
          url: process.env.NEXT_PUBLIC_SUPABASE_URL,
          hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        });
        
        const { data: bucketList, error: bucketError } = await supabase.storage.listBuckets();
        console.log('バケット一覧取得結果:', { bucketList, bucketError });
        
        if (bucketError) {
          console.error('バケット一覧取得エラー:', bucketError);
          setError(`バケット一覧の取得に失敗しました: ${bucketError.message}`);
          return;
        }
        
        if (!bucketList || bucketList.length === 0) {
          console.warn('バケットが存在しません');
          setError('ストレージバケットが設定されていません。管理者に連絡してください。');
          return;
        }
        
        console.log('利用可能なバケット名:', bucketList.map(b => b.name));
        
        // material-imagesまたはmaterial_imagesバケットを探す
        const materialImagesBucket = bucketList.find(bucket => 
          bucket.name === 'material-images' || 
          bucket.name === 'material_images' ||
          bucket.name.includes('material')
        );
        console.log('material-imagesバケットの検索結果:', materialImagesBucket);
        
        if (!materialImagesBucket) {
          console.warn('material-imagesバケットが見つかりません');
          console.log('利用可能なバケット名:', bucketList.map(b => b.name));
          setError(`ストレージバケット「material-images」が設定されていません。利用可能なバケット: ${bucketList.map(b => b.name).join(', ')}。管理者に連絡してください。`);
          return;
        }
        
        console.log('material-imagesバケット確認完了:', materialImagesBucket);
        
        // 実際のバケット名を使用
        const actualBucketName = materialImagesBucket.name;
        console.log('使用するバケット名:', actualBucketName);
      } catch (bucketCheckError) {
        console.error('バケット確認エラー:', bucketCheckError);
        setError(`バケット確認中にエラーが発生しました: ${bucketCheckError instanceof Error ? bucketCheckError.message : '不明なエラー'}`);
        return;
      }

      // Supabase Storageにアップロード
      const fileExt = file.name.split('.').pop();
      const fileName = `${materialId}/${stepId}/${Date.now()}.${fileExt}`;
      
      console.log('アップロード先ファイル名:', fileName);

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(actualBucketName) // 実際のバケット名を使用
        .upload(fileName, file);

      if (uploadError) {
        console.error('Supabase Storage アップロードエラー詳細:', {
          error: uploadError,
          message: uploadError.message,
          details: uploadError.details,
          hint: uploadError.hint,
          code: uploadError.code
        });
        
        // エラーの種類に応じてメッセージを変更
        if (uploadError.message?.includes('bucket') || uploadError.message?.includes('not found')) {
          setError('ストレージバケット「material-images」が設定されていません。管理者に連絡してください。');
        } else if (uploadError.message?.includes('policy') || uploadError.message?.includes('permission')) {
          setError('ストレージの権限設定に問題があります。管理者に連絡してください。');
        } else if (uploadError.message?.includes('file size')) {
          setError('ファイルサイズが大きすぎます。5MB以下のファイルを選択してください。');
        } else {
          setError(`画像のアップロードに失敗しました: ${uploadError.message || '不明なエラー'}`);
        }
        return;
      }

      console.log('アップロード成功:', uploadData);

      // 公開URLを取得
      const { data: urlData } = supabase.storage
        .from(actualBucketName) // 実際のバケット名を使用
        .getPublicUrl(fileName);

      console.log('公開URL:', urlData.publicUrl);

      // material_imagesテーブルに保存
      const { data: imageData, error: dbError } = await supabase
        .from('material_images')
        .insert({
          material_id: materialId,
          step_id: stepId,
          image_url: urlData.publicUrl,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type,
          order: 1
        })
        .select()
        .single();

      if (dbError) {
        console.error('DB保存エラー:', dbError);
        setError(`画像情報の保存に失敗しました: ${dbError.message}`);
        return;
      }

      console.log('DB保存成功:', imageData);

      // 状態を更新
      setStepImages(prev => {
        const updated = [...prev];
        const stepIndex = updated.findIndex(s => s.stepId === stepId);
        if (stepIndex >= 0) {
          updated[stepIndex].images.push(imageData);
        } else {
          updated.push({ stepId, images: [imageData] });
        }
        return updated;
      });

      setSuccess('画像がアップロードされました');
    } catch (err) {
      console.error('画像アップロードエラー詳細:', err);
      setError(`画像のアップロードに失敗しました: ${err instanceof Error ? err.message : '不明なエラー'}`);
    }
  };

  const handleImageDelete = async (imageId: string, stepId: number) => {
    try {
      const { error } = await supabase
        .from('material_images')
        .delete()
        .eq('id', imageId);

      if (error) {
        console.error('画像削除エラー:', error);
        setError('画像の削除に失敗しました');
        return;
      }

      // 状態を更新
      setStepImages(prev => {
        const updated = [...prev];
        const stepIndex = updated.findIndex(s => s.stepId === stepId);
        if (stepIndex >= 0) {
          updated[stepIndex].images = updated[stepIndex].images.filter(img => img.id !== imageId);
        }
        return updated;
      });

      setSuccess('画像が削除されました');
    } catch (err) {
      console.error('画像削除エラー:', err);
      setError('画像の削除に失敗しました');
    }
  };

  const handleNoteSave = async () => {
    try {
      const { error } = await supabase
        .from('materials')
        .update({ note: noteText })
        .eq('id', materialId);

      if (error) {
        setError('備考の保存に失敗しました');
        return;
      }

      setSuccess('備考が保存されました');
      setEditingNote(false);
    } catch {
      setError('備考の保存に失敗しました');
    }
  };

  const handleSoftwareSave = async () => {
    try {
      const { error } = await supabase
        .from('materials')
        .update({ 
          software, 
          version, 
          learning_note: learningNote 
        })
        .eq('id', materialId);

      if (error) {
        setError('ソフトウェア情報の保存に失敗しました');
        return;
      }

      setSuccess('ソフトウェア情報が保存されました');
    } catch {
      setError('ソフトウェア情報の保存に失敗しました');
    }
  };

  const handleSampleImageSave = async () => {
    try {
      const { error } = await supabase
        .from('materials')
        .update({ sample_image_url: sampleImageUrl })
        .eq('id', materialId);

      if (error) {
        setError('完成見本画像の保存に失敗しました');
        return;
      }

      setSuccess('完成見本画像が保存されました');
    } catch {
      setError('完成見本画像の保存に失敗しました');
    }
  };

  const handleComplete = async () => {
    setCompleting(true);
    setError('');
    setSuccess('');

    try {
      // 教材のimage_registrationステータスを更新
      const response = await fetch(`/api/materials/${materialId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image_registration: 'completed'
        }),
      });

      if (response.ok) {
        setSuccess('画像登録が完了しました');
        router.push('/admin/materials');
      } else {
        const data = await response.json();
        setError(data.error || '画像登録の完了に失敗しました');
      }
    } catch {
      console.error('完了処理エラー');
      setError('完了処理に失敗しました');
    } finally {
      setCompleting(false);
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
      <div className="max-w-7xl mx-auto p-6">
        {/* ヘッダー */}
        <div className="mb-8">
          <p className="text-gray-600">教材「{material.title}」の画像を登録します</p>
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

        {/* 手順と画像の2列レイアウト */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start mb-8">
          {/* 左列：手順編集 */}
          {showStepEditing && (
            <div className="bg-white rounded-lg shadow-md p-6 border border-gray-300">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">手順作成</h3>
                <Button
                  onClick={addNewStep}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  手順追加
                </Button>
              </div>

              <div className="space-y-4">
                {newSteps.map((step, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center gap-4 mb-2">
                      {!step.isHeading && (
                        <span className="text-sm font-medium text-white bg-gray-900 px-2 py-1 rounded">
                          {index + 1}
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
                      {newSteps.length > 1 && (
                        <Button
                          onClick={() => removeNewStep(index)}
                          variant="outline"
                          size="sm"
                          className="text-red-600 border-red-300 hover:bg-red-50"
                        >
                          <X className="w-4 h-4" />
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
                ))}
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
              </div>
            </div>
          )}

          {/* 右列：画像アップロード */}
          <div className={`bg-white rounded-lg shadow-md p-6 border border-gray-300 ${!showStepEditing ? 'lg:col-span-2' : ''}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">手順別画像登録</h3>
              <Button
                onClick={() => setShowStepEditing(!showStepEditing)}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                {showStepEditing ? '手順編集を閉じる' : '手順編集'}
              </Button>
            </div>
            <div className="space-y-6 max-h-96 overflow-y-auto">
              {newSteps.map((step, index) => {
                // 通し番号を計算（小見出しを除く）
                const currentStepNumber = newSteps
                  .slice(0, index + 1)
                  .filter((s) => !s.isHeading)
                  .length;
                
                const stepImageData = stepImages.find(s => s.stepId === currentStepNumber);
                const images = stepImageData?.images || [];

                return (
                  <div key={index} className={`${step.isHeading ? '' : 'border rounded-lg'} p-4`}>
                    <div className="flex items-center gap-2 mb-3">
                      {!step.isHeading && (
                        <span className="text-sm font-medium text-white bg-gray-900 px-2 py-1 rounded">
                          {currentStepNumber}
                        </span>
                      )}
                      <span className={`text-sm ${step.isHeading ? 'font-semibold text-lg text-gray-800' : 'text-gray-600'}`}>
                        {step.content.substring(0, 50)}...
                      </span>
                    </div>
                    
                    {/* 小見出しの場合は画像アップロード欄を非表示 */}
                    {!step.isHeading && (
                      <>
                        {/* 画像アップロード */}
                        <div className="mb-3">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            画像をアップロード
                          </label>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                handleImageUpload(currentStepNumber, file);
                              }
                            }}
                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                          />
                        </div>

                        {/* アップロード済み画像 */}
                        {images.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-sm font-medium text-gray-700">アップロード済み画像:</p>
                            <div className="grid grid-cols-2 gap-2">
                              {images.map((image) => (
                                <div key={image.id} className="relative">
                                  <img
                                    src={image.image_url}
                                    alt={image.file_name}
                                    className="w-full h-24 object-cover rounded border"
                                  />
                                  <button
                                    onClick={() => handleImageDelete(image.id, currentStepNumber)}
                                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 下部の2列レイアウト */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 左列：ソフトウェア情報 */}
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-300">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">使用ソフトウェア情報</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  使用ソフトウェア
                </label>
                <Input
                  value={software}
                  onChange={(e) => setSoftware(e.target.value)}
                  placeholder="例: Photoshop, Illustrator"
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  バージョン
                </label>
                <Input
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  placeholder="例: 2024, CC 2024"
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  学習時の注意事項
                </label>
                <Textarea
                  value={learningNote}
                  onChange={(e) => setLearningNote(e.target.value)}
                  placeholder="学習時の注意事項を入力してください"
                  rows={4}
                  className="w-full"
                />
              </div>
              <Button
                onClick={handleSoftwareSave}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                ソフトウェア情報を保存
              </Button>
            </div>
          </div>

          {/* 右列：完成見本画像 */}
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-300">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">完成見本画像</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  完成見本画像URL
                </label>
                <Input
                  value={sampleImageUrl}
                  onChange={(e) => setSampleImageUrl(e.target.value)}
                  placeholder="完成見本画像のURLを入力してください"
                  className="w-full"
                />
              </div>
              {sampleImageUrl && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">プレビュー:</p>
                  <img
                    src={sampleImageUrl}
                    alt="完成見本"
                    className="w-full max-h-48 object-contain border rounded"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              )}
              <Button
                onClick={handleSampleImageSave}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                完成見本画像を保存
              </Button>
            </div>
          </div>
        </div>

        {/* 完了ボタン */}
        <div className="mt-8 flex justify-center">
          <Button
            onClick={handleComplete}
            disabled={completing}
            className="bg-green-600 hover:bg-green-700 px-8 py-3 text-lg"
          >
            {completing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                完了中...
              </>
            ) : (
              <>
                <Check className="w-5 h-5 mr-2" />
                画像登録完了
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
} 