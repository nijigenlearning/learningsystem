"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Material, RecipeStep, MaterialImage } from '@/types/supabase';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Loader2, Plus, X, Save, Check } from 'lucide-react';
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
  
  console.log('🔵 ImagesEditPage 開始:', { materialId, params });
  
  const [material, setMaterial] = useState<Material | null>(null);
  const [steps, setSteps] = useState<RecipeStep[]>([]);
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
  const [stepNumberMapping, setStepNumberMapping] = useState<Map<number, number>>(new Map());

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
        
        // 既存の手順データを保存
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
          
          // UI step index と database step_number のマッピングを作成
          const mapping = new Map<number, number>();
          let uiIndex = 0;
          let actualStepNumber = 1; // 実際の手順番号（小見出しを除く）
          stepsData.forEach((step: RecipeStep) => {
            if (!step.heading && step.step_number < 9999) { // 小見出しでない場合のみマッピングに追加
              mapping.set(uiIndex, actualStepNumber);
              actualStepNumber++;
            }
            uiIndex++;
          });
          setStepNumberMapping(mapping);
          console.log('ステップ番号マッピング:', mapping);
        } else {
          console.log('既存の手順がありません');
        }
        
        // 各手順の画像を取得
        const stepImagesData: StepImage[] = [];
        for (const step of stepsData) {
          if (!step.heading && step.step_number < 9999) { // 小見出しでない場合のみ画像を取得
            const { data: images } = await supabase
              .from('material_images')
              .select('*')
              .eq('material_id', materialId)
              .eq('step_id', step.step_number)
              .order('order', { ascending: true });
            
            stepImagesData.push({
              stepId: step.step_number, // データベースのstep_numberを使用
              images: images || []
            });
          }
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
      // 小見出しを除いて正しいstep_numberを計算
      let actualStepNumber = 1;
      const stepsToSave = newSteps
        .filter(step => step.content.trim())
        .map((step, index) => {
          // 小見出しの場合は大きな番号（9999など）を割り当てて、実際の手順と区別
          const stepNumber = step.isHeading ? 9999 + index : actualStepNumber++;
          return {
            material_id: materialId,
            step_number: stepNumber,
            content: step.content.trim(),
            heading: step.isHeading ? step.content.trim() : null
          };
        });

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
            
            // 新しいマッピングを作成
            const newMapping = new Map<number, number>();
            let uiIndex = 0;
            stepsToSave.forEach((step) => {
              if (!step.heading && step.step_number < 9999) { // 小見出しでない場合のみマッピングに追加
                newMapping.set(uiIndex, step.step_number);
              }
              uiIndex++;
            });
            setStepNumberMapping(newMapping);
            console.log('新しいステップ番号マッピング:', newMapping);
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

  const handleImageUpload = async (file: File, stepId: number) => {
    try {
      console.log('画像アップロード開始:', { file, stepId });

      // ファイルサイズチェック
      if (file.size > 5 * 1024 * 1024) {
        setError('ファイルサイズが大きすぎます。5MB以下のファイルを選択してください。');
        return;
      }

      // ファイルタイプチェック
      if (!file.type.startsWith('image/')) {
        setError('画像ファイルのみアップロード可能です');
        return;
      }

      // 既存の画像のorder値を確認して次の順序番号を取得
      const { data: existingImages, error: fetchError } = await supabase
        .from('material_images')
        .select('order')
        .eq('material_id', materialId)
        .eq('step_id', stepId) // step_idを数値として検索
        .order('order', { ascending: false })
        .limit(1);

      if (fetchError) {
        console.error('既存画像のorder取得エラー:', fetchError);
        setError('既存画像の確認に失敗しました');
        return;
      }

      // 次のorder値を計算（既存画像がない場合は1、ある場合は最大値+1）
      const nextOrder = existingImages && existingImages.length > 0 
        ? Math.max(...existingImages.map(img => img.order)) + 1 
        : 1;

      console.log('次のorder値:', { existingImages, nextOrder });

      // 環境変数確認
      console.log('環境変数確認:', {
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '設定済み' : '未設定'
      });

      // Supabaseクライアント設定確認
      console.log('Supabaseクライアント設定確認:', {
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
        supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '設定済み' : '未設定'
      });

      // バケット一覧を取得
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
      console.log('バケット一覧取得結果:', { buckets, error: bucketsError });

      if (bucketsError) {
        console.error('バケット一覧取得エラー:', bucketsError);
        // バケット一覧取得に失敗しても、デフォルトバケット名で試行
        console.log('バケット一覧取得に失敗しましたが、デフォルトバケット名で試行します');
      }

      // 利用可能なバケット名を取得
      const availableBucketNames = buckets?.map(bucket => bucket.name) || [];
      console.log('利用可能なバケット名:', availableBucketNames);

      // デフォルトバケット名を設定
      let defaultBucketName = 'material-images';
      
      if (availableBucketNames.length === 0) {
        console.log('バケットが存在しませんが、デフォルトバケット名で試行します');
        // バケットが存在しない場合でも、デフォルトバケット名で試行
        // 実際のアップロード時にエラーが発生した場合は、その時点でエラーハンドリング
      } else if (!availableBucketNames.includes(defaultBucketName)) {
        console.log('デフォルトバケット名が存在しないため、最初の利用可能なバケットを使用:', availableBucketNames[0]);
        // デフォルトバケットが存在しない場合は、最初の利用可能なバケットを使用
        defaultBucketName = availableBucketNames[0];
      } else {
        console.log('デフォルトバケット名を使用:', defaultBucketName);
      }

      // ファイル名を生成
      const fileExt = file.name.split('.').pop();
      const fileName = `${materialId}/${stepId}/${Date.now()}.${fileExt}`;
      
      console.log('アップロード先ファイル名:', fileName);

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(defaultBucketName)
        .upload(fileName, file);

      if (uploadError) {
        console.error('Supabase Storage アップロードエラー詳細:', {
          error: uploadError,
          message: uploadError.message
        });
        
        setError(`画像のアップロードに失敗しました: ${uploadError.message || '不明なエラー'}`);
        return;
      }

      console.log('アップロード成功:', uploadData);

      // 公開URLを取得
      const { data: urlData } = supabase.storage
        .from(defaultBucketName)
        .getPublicUrl(fileName);

      console.log('公開URL:', urlData.publicUrl);

      // material_imagesテーブルに保存
      console.log('DB挿入前のデータ確認:', {
        material_id: materialId,
        step_id: stepId,
        step_id_type: typeof stepId,
        image_url: urlData.publicUrl,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        order: nextOrder
      });

      const { data: imageData, error: dbError } = await supabase
        .from('material_images')
        .insert({
          material_id: materialId,
          step_id: stepId, // step_idを数値として保存
          image_url: urlData.publicUrl,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type,
          order: nextOrder
        })
        .select()
        .single();

      if (dbError) {
        console.error('DB保存エラー詳細:', {
          error: dbError,
          message: dbError.message,
          details: dbError.details,
          hint: dbError.hint,
          code: dbError.code
        });

        // 409エラーの場合は詳細な情報を表示
        if (dbError.code === '409') {
          setError(`画像情報の保存に失敗しました（409エラー）: ${dbError.message || '重複または制約違反'}`);
        } else {
          setError(`画像情報の保存に失敗しました: ${dbError.message || '不明なエラー'}`);
        }
        return;
      }

      console.log('データベース保存成功:', imageData);

      // ステップ画像を更新
      setStepImages(prev => {
        const existingStep = prev.find(s => s.stepId === stepId);
        if (existingStep) {
          return prev.map(s => 
            s.stepId === stepId 
              ? { ...s, images: [...s.images, imageData] }
              : s
          );
        } else {
          return [...prev, { stepId, images: [imageData] }];
        }
      });

      setSuccess('画像がアップロードされました');
    } catch (err) {
      console.error('画像アップロードエラー詳細:', err);
      setError(`画像のアップロードに失敗しました: ${err instanceof Error ? err.message : '不明なエラー'}`);
    }
  };

  const handleImageDelete = async (imageId: string, stepId: number) => {
    try {
      // まず画像情報を取得
      const { data: imageData, error: fetchError } = await supabase
        .from('material_images')
        .select('*')
        .eq('id', imageId)
        .single();

      if (fetchError) {
        console.error('画像情報取得エラー:', fetchError);
        setError('画像情報の取得に失敗しました');
        return;
      }

      // ストレージからファイルを削除
      if (imageData.image_url) {
        // URLからファイルパスを抽出
        const urlParts = imageData.image_url.split('/');
        const fileName = urlParts[urlParts.length - 1];
        const filePath = `${materialId}/${stepId}/${fileName}`;

        console.log('ストレージから削除するファイルパス:', filePath);

        const { error: storageError } = await supabase.storage
          .from('material-images')
          .remove([filePath]);

        if (storageError) {
          console.error('ストレージ削除エラー:', storageError);
          // ストレージ削除に失敗しても、DBからは削除を続行
        } else {
          console.log('ストレージから削除成功');
        }
      }

      // データベースから削除
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
      console.error('画像削除エラー詳細:', err);
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

  const handleSampleImageUpload = async (file: File) => {
    try {
      console.log('完成見本画像アップロード開始:', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type
      });

      // ファイルサイズチェック
      if (file.size > 5 * 1024 * 1024) {
        setError('ファイルサイズが大きすぎます。5MB以下のファイルを選択してください。');
        return;
      }

      // ファイル名を生成
      const fileExt = file.name.split('.').pop();
      const fileName = `sample-images/${materialId}/${Date.now()}.${fileExt}`;

      console.log('完成見本画像アップロード先ファイル名:', fileName);

      // Supabase Storageにアップロード
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('material-images')
        .upload(fileName, file);

      if (uploadError) {
        console.error('完成見本画像アップロードエラー:', uploadError);
        setError(`完成見本画像のアップロードに失敗しました: ${uploadError.message || '不明なエラー'}`);
        return;
      }

      console.log('完成見本画像アップロード成功:', uploadData);

      // 公開URLを取得
      const { data: urlData } = supabase.storage
        .from('material-images')
        .getPublicUrl(fileName);

      console.log('完成見本画像公開URL:', urlData.publicUrl);

      // materialsテーブルに保存
      const { error: dbError } = await supabase
        .from('materials')
        .update({ sample_image_url: urlData.publicUrl })
        .eq('id', materialId);

      if (dbError) {
        console.error('完成見本画像DB保存エラー:', dbError);
        setError('完成見本画像の保存に失敗しました');
        return;
      }

      // 状態を更新
      setSampleImageUrl(urlData.publicUrl);
      setSuccess('完成見本画像がアップロードされました');
    } catch (err) {
      console.error('完成見本画像アップロードエラー詳細:', err);
      setError('完成見本画像のアップロードに失敗しました');
    }
  };

  const handleComplete = async () => {
    setCompleting(true);
    setError('');
    setSuccess('');

    try {
      console.log('完了処理開始:', { materialId });
      
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

      console.log('APIレスポンス:', { 
        status: response.status, 
        statusText: response.statusText,
        ok: response.ok 
      });

      if (response.ok) {
        const responseData = await response.json();
        console.log('完了処理成功:', responseData);
        setSuccess('画像登録が完了しました');
        router.push('/admin/materials');
      } else {
        const errorData = await response.json();
        console.error('完了処理エラー詳細:', errorData);
        setError(errorData.error || '画像登録の完了に失敗しました');
      }
    } catch (err) {
      console.error('完了処理エラー詳細:', err);
      setError(`完了処理に失敗しました: ${err instanceof Error ? err.message : '不明なエラー'}`);
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
                // マッピングから正しいstep_numberを取得
                const stepNumber = stepNumberMapping.get(index) || (index + 1);
                
                console.log(`ステップ${index}の詳細:`, {
                  content: step.content,
                  isHeading: step.isHeading,
                  mappedStepNumber: stepNumberMapping.get(index),
                  fallbackStepNumber: index + 1,
                  finalStepNumber: stepNumber
                });
                
                const stepImageData = stepImages.find(s => s.stepId === stepNumber);
                const images = stepImageData?.images || [];

                return (
                  <div key={index} className={`${step.isHeading ? '' : 'border rounded-lg'} p-4`}>
                    <div className="flex items-center gap-2 mb-3">
                      {!step.isHeading && (
                        <span className="text-sm font-medium text-white bg-gray-900 px-2 py-1 rounded">
                          {stepNumber}
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
                                handleImageUpload(file, stepNumber);
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
                                    onClick={() => handleImageDelete(image.id, stepNumber)}
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
                  完成見本画像をアップロード
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleSampleImageUpload(file);
                    }
                  }}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
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