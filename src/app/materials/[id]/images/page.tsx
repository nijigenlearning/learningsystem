"use client";

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Material, RecipeStep, MaterialImage } from '@/types/supabase';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Loader2, Plus, X, Save, Check } from 'lucide-react';
import { Collapsible } from '@/components/ui/collapsible';

interface StepInput {
  id?: string;
  content: string;
  heading: string | null;
}

interface StepImage {
  stepId: string; // UUID文字列として修正
  images: MaterialImage[];
}

export default function ImagesEditPage() {
  const params = useParams();
  const materialId = params?.id as string;
  const router = useRouter();
  
  console.log('🔵 ImagesEditPage 開始:', { materialId, params });
  
  const [material, setMaterial] = useState<Material | null>(null);
  const [steps, setSteps] = useState<RecipeStep[]>([]);
  const [stepImages, setStepImages] = useState<{[key: string]: MaterialImage[]}>({});
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
  const [sampleImageUrl, setSampleImageUrl] = useState<string | null>(null);
  const [showStepEditing, setShowStepEditing] = useState(false);
  const [stepNumberMapping, setStepNumberMapping] = useState<Map<number, number>>(new Map());

  useEffect(() => {
    if (materialId) {
      setLoading(true);
      fetchData();
    }
  }, [materialId]);

  // デバッグ用：newStepsの状態変化を監視
  useEffect(() => {
    console.log('newSteps状態変化:', newSteps);
  }, [newSteps]);

  const fetchData = useCallback(async () => {
    if (!materialId) return;

    try {
      console.log('🔵 データ取得開始...');
      console.log('🔵 対象の教材ID:', materialId);
      
      // まず教材自体が存在するか確認
      const { data: materialData, error: materialError } = await supabase
        .from('materials')
        .select('*')
        .eq('id', materialId)
        .single();

      if (materialError) {
        console.error('教材データ取得エラー:', materialError);
        return;
      }

      console.log('🔵 教材データ:', materialData);
      
      // 手順データを取得
      console.log('🔵 recipe_stepsテーブルから手順データを取得中...');
      console.log('🔵 クエリ条件:', { material_id: materialId });
      
      // まず、recipe_stepsテーブルにデータが存在するか確認
      const { count: stepsCount, error: countError } = await supabase
        .from('recipe_steps')
        .select('*', { count: 'exact', head: true })
        .eq('material_id', materialId);

      if (countError) {
        console.error('手順データ件数取得エラー:', countError);
      } else {
        console.log('🔵 recipe_stepsテーブルの総件数:', stepsCount);
      }

      // 実際の手順データを取得
      const { data: stepsData, error: stepsError } = await supabase
        .from('recipe_steps')
        .select('*')
        .eq('material_id', materialId)
        .order('step_number', { ascending: true });

      if (stepsError) {
        console.error('手順データ取得エラー:', stepsError);
        console.error('エラーの詳細:', {
          message: stepsError.message,
          details: stepsError.details,
          hint: stepsError.hint,
          code: stepsError.code
        });
        return;
      }

      console.log('🔵 取得された手順データ:', stepsData);
      console.log('🔵 手順データの件数:', stepsData?.length || 0);
      
      // データが空の場合、material_idの形式を確認
      if (!stepsData || stepsData.length === 0) {
        console.log('⚠️ 手順データが空です。以下を確認してください:');
        console.log('🔍 material_idの形式:', materialId);
        console.log('🔍 material_idの型:', typeof materialId);
        console.log('🔍 material_idの長さ:', materialId?.length);
        
        // materialsテーブルで該当するIDが存在するか確認
        const { data: materialCheck, error: materialCheckError } = await supabase
          .from('materials')
          .select('id, title')
          .eq('id', materialId);
        
        if (materialCheckError) {
          console.error('教材存在確認エラー:', materialCheckError);
        } else {
          console.log('🔍 教材存在確認結果:', materialCheck);
        }
        
        // recipe_stepsテーブルの全データを確認（デバッグ用）
        const { data: allSteps, error: allStepsError } = await supabase
          .from('recipe_steps')
          .select('*')
          .limit(10);
        
        if (allStepsError) {
          console.error('全手順データ取得エラー:', allStepsError);
        } else {
          console.log('🔍 recipe_stepsテーブルの全データ（最新10件）:', allSteps);
        }
        
        // 手順データが存在しない場合のエラーメッセージを設定
        setError('手順データが存在しません。工程3（手順作成）で手順を作成してから、このページにアクセスしてください。');
        setNewSteps([]); // 空の配列を設定
        setShowStepEditing(true); // 手順編集セクションを自動的に表示
        setLoading(false);
        return;
      }

      if (stepsData && stepsData.length > 0) {
        // 既存の手順を入力欄に設定
        console.log('既存の手順を入力欄に設定:', stepsData);
        setNewSteps(stepsData);
        
        // 変換後の入力データをログ出力
        const convertedData = stepsData.map(step => ({
          ...step,
          content: step.content || '',
          heading: step.heading || null
        }));
        console.log('変換後の入力データ:', convertedData);

        // 手順番号マッピングを作成（UIの手順番号を1から開始）
        const mapping = new Map<number, number>();
        let uiStepNumber = 1; // UIの手順番号を1から開始
        
        console.log('🔵 手順番号マッピング作成開始:');
        stepsData.forEach((step: RecipeStep, index: number) => {
          console.log(`手順${index}:`, {
            content: step.content,
            heading: step.heading,
            step_number: step.step_number,
            step_number_type: typeof step.step_number,
            isHeading: !!step.heading,
            step_number_lt_9999: step.step_number < 9999
          });
          
          if (!step.heading && step.step_number < 9999) {
            // UIの手順番号（1, 2, 3...）をデータベースのstep_numberにマッピング
            mapping.set(uiStepNumber, step.step_number);
            console.log(`✅ マッピング追加: UI[${uiStepNumber}] -> DB[${step.step_number}]`);
            uiStepNumber++; // 次のUI手順番号
          } else {
            console.log(`❌ マッピング除外: UI[${uiStepNumber}] (小見出しまたは9999以上)`);
          }
        });
        
        setStepNumberMapping(mapping);
        console.log('🔵 最終的な手順番号マッピング:', Object.fromEntries(mapping));
        
        // 各手順の画像を取得
        console.log('🔵 各手順の画像を取得中...');
        const imagePromises = stepsData.map(async (step) => {
          if (!step.id) {
            console.warn('手順にIDがありません:', step);
            return;
          }
          
          console.log(`🔵 手順${step.step_number}の画像を取得中...`, { step_id: step.id });
          
          const { data: images, error: imagesError } = await supabase
            .from('material_images')
            .select('*')
            .eq('step_id', step.id)
            .order('order', { ascending: true });
          
          if (imagesError) {
            console.error(`手順${step.step_number}の画像取得エラー:`, imagesError);
            return;
          }
          
          console.log(`🔵 手順${step.step_number}の画像:`, images);
          
          if (images && images.length > 0) {
            setStepImages(prev => ({
              ...prev,
              [step.id!]: images
            }));
          }
        });
        
        await Promise.all(imagePromises);
        console.log('🔵 全手順の画像取得完了');
      }
    } catch (error) {
      console.error('データ取得エラー:', error);
    } finally {
      setLoading(false);
    }
  }, [materialId, supabase]);

  const updateNewStep = (index: number, field: keyof StepInput, value: string | null) => {
    const updatedSteps = [...newSteps];
    
    // 小見出しの変更を検出
    if (field === 'heading' && updatedSteps[index].heading !== value) {
      const wasHeading = updatedSteps[index].heading;
      const willBeHeading = value;
      
      if (wasHeading && !willBeHeading) {
        // 小見出しから手順に変更
        if (confirm('小見出しから手順に変更すると、既存の画像との紐づけが変更される可能性があります。続行しますか？')) {
          console.log('⚠️ 小見出しから手順に変更:', { index, content: updatedSteps[index].content });
        } else {
          return; // キャンセル
        }
      } else if (!wasHeading && willBeHeading) {
        // 手順から小見出しに変更
        if (confirm('手順から小見出しに変更すると、既存の画像が表示されなくなる可能性があります。続行しますか？')) {
          console.log('⚠️ 手順から小見出しに変更:', { index, content: updatedSteps[index].content });
        } else {
          return; // キャンセル
        }
      }
    }
    
    updatedSteps[index] = { ...updatedSteps[index], [field]: value };
    setNewSteps(updatedSteps);
  };

  const addNewStep = () => {
    setNewSteps([...newSteps, { content: '', heading: null }]);
  };

  const removeNewStep = (index: number) => {
    if (newSteps.length > 1) {
      const updatedSteps = newSteps.filter((_, i) => i !== index);
      setNewSteps(updatedSteps);
    }
  };

  const handleTemporarySave = async () => {
    setSaving(true);
    try {
      // 既存の手順を削除
      const deleteResponse = await fetch(`/api/materials/${materialId}/recipe-steps`, {
        method: 'DELETE',
      });

      if (!deleteResponse.ok) {
        throw new Error('既存の手順の削除に失敗しました');
      }

      // 新しい手順を保存
      const stepsToSave = newSteps.map((step, index) => ({
        material_id: materialId,
        content: step.content,
        step_number: step.heading ? 9999 + index : index + 1,
        heading: step.heading
      }));

      const saveResponse = await fetch(`/api/materials/${materialId}/recipe-steps`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(stepsToSave),
      });

      if (!saveResponse.ok) {
        throw new Error('手順の保存に失敗しました');
      }

      setSuccess('手順を一時保存しました');
      setTimeout(() => setSuccess(''), 3000);
      
      // 保存後にデータを再取得
      await fetchData();
    } catch (error) {
      console.error('一時保存エラー:', error);
      setError(error instanceof Error ? error.message : '一時保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (file: File, stepId: string) => {
    try {
      console.log('🔵 画像アップロード開始:', { 
        file: { name: file.name, size: file.size, type: file.type }, 
        stepId,
        stepIdType: typeof stepId,
        stepNumberMapping: Array.from(stepNumberMapping.entries())
      });

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
      console.log('🔵 既存画像のorder確認:', { materialId, stepId });
      const { data: existingImages, error: fetchError } = await supabase
        .from('material_images')
        .select('order')
        .eq('material_id', materialId)
        .eq('step_id', stepId) // step_idをUUID文字列として検索
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

      console.log('🔵 次のorder値:', { existingImages, nextOrder, stepId });

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
      console.log('🔵 DB挿入前のデータ確認:', {
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
          step_id: stepId, // step_idをUUID文字列として保存
          image_url: urlData.publicUrl,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type,
          order: nextOrder
        })
        .select()
        .single();

      if (dbError) {
        console.error('🔵 DB保存エラー詳細:', {
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

      console.log('🔵 データベース保存成功:', imageData);

      // ステップ画像を更新
      console.log('🔵 ステップ画像更新前:', { stepId, currentStepImages: stepImages });
      setStepImages(prev => {
        const existingStep = prev[stepId];
        console.log('🔵 既存ステップ検索結果:', { existingStep, stepId, prev });
        
        if (existingStep) {
          const updated = { ...prev, [stepId]: [...existingStep, imageData] };
          console.log('🔵 既存ステップ更新後:', updated);
          return updated;
        } else {
          const newStep = { [stepId]: [imageData] };
          const updated = { ...prev, ...newStep };
          console.log('🔵 新規ステップ追加後:', updated);
          return updated;
        }
      });

      setSuccess('画像がアップロードされました');
    } catch (err) {
      console.error('🔵 画像アップロードエラー詳細:', err);
      setError(`画像のアップロードに失敗しました: ${err instanceof Error ? err.message : '不明なエラー'}`);
    }
  };

  const handleImageDelete = async (imageId: string, stepId: string) => {
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
        const updated = { ...prev };
        const stepImages = updated[stepId];
        if (stepImages) {
          updated[stepId] = stepImages.filter(img => img.id !== imageId);
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

      if (error) throw error;
      setSuccess('備考を保存しました');
      setTimeout(() => setSuccess(''), 3000);
      setEditingNote(false);
    } catch (error) {
      console.error('備考保存エラー:', error);
      setError('備考の保存に失敗しました');
    }
  };

  const handleSoftwareSave = async () => {
    try {
      const { error } = await supabase
        .from('materials')
        .update({ 
          software: software,
          version: version,
          learning_note: learningNote
        })
        .eq('id', materialId);

      if (error) throw error;
      setSuccess('ソフトウェア情報を保存しました');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('ソフトウェア情報保存エラー:', error);
      setError('ソフトウェア情報の保存に失敗しました');
    }
  };

  const handleSampleImageUpload = async (file: File) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${materialId}/sample/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('material-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('material-images')
        .getPublicUrl(fileName);

      setSampleImageUrl(publicUrl);
      setSuccess('完成見本画像をアップロードしました');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('完成見本画像アップロードエラー:', error);
      setError('完成見本画像のアップロードに失敗しました');
    }
  };

  const handleComplete = async () => {
    setCompleting(true);
    try {
      // 教材のimage_revisionステータスを更新
      const { error } = await supabase
        .from('materials')
        .update({ image_revision: 'completed' })
        .eq('id', materialId);

      if (error) throw error;
      
      setSuccess('画像登録が完了しました！');
      setTimeout(() => {
        router.push(`/materials/${materialId}/view`);
      }, 2000);
    } catch (error) {
      console.error('完了処理エラー:', error);
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
            {error.includes('手順データが存在しません') && (
              <div className="mt-3">
                <Button
                  onClick={() => router.push(`/materials/${materialId}/steps`)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  工程3（手順作成）に戻る
                </Button>
              </div>
            )}
          </div>
        )}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-800">{success}</p>
          </div>
        )}

        {/* 手順データが空の場合のメッセージ */}
        {!loading && newSteps.length === 0 && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800">
              この教材にはまだ手順が登録されていません。まず手順を登録してから画像をアップロードしてください。
            </p>
            <div className="mt-3 space-x-2">
              <Button
                onClick={() => setShowStepEditing(true)}
                className="bg-yellow-600 hover:bg-yellow-700"
              >
                手順を登録する
              </Button>
              <Button
                onClick={() => {
                  setNewSteps([
                    { content: '手順1の内容を入力してください', heading: null },
                    { content: '手順2の内容を入力してください', heading: null },
                    { content: '手順3の内容を入力してください', heading: null }
                  ]);
                  setShowStepEditing(true);
                  setError(''); // エラーメッセージをクリア
                }}
                variant="outline"
                className="border-yellow-600 text-yellow-600 hover:bg-yellow-50"
              >
                サンプル手順を追加
              </Button>
              <Button
                onClick={() => router.push(`/materials/${materialId}/steps`)}
                variant="outline"
                className="border-blue-600 text-blue-600 hover:bg-blue-50"
              >
                工程3（手順作成）に移動
              </Button>
            </div>
          </div>
        )}

        {/* エラーメッセージの表示 */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
            <div className="mt-3">
              <Button
                onClick={() => router.push(`/materials/${materialId}/steps`)}
                className="bg-red-600 hover:bg-red-700"
              >
                工程3（手順作成）に移動
              </Button>
            </div>
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

                  {/* 手順編集セクション */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {newSteps.length === 0 ? '手順の作成' : '手順の編集'}
            </h3>
            {newSteps.length > 0 && (
              <Button
                onClick={() => setShowStepEditing(!showStepEditing)}
                variant="outline"
                className="text-blue-600 border-blue-300 hover:bg-blue-50"
              >
                {showStepEditing ? '手順編集を閉じる' : '手順編集を開く'}
              </Button>
            )}
          </div>
          
          {/* 手順データが空の場合は強制的に手順編集セクションを表示 */}
          {(showStepEditing || newSteps.length === 0) && (
            <>
              {/* 小見出し変更の影響に関する警告 */}
              <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h4 className="text-sm font-medium text-yellow-800">重要: 小見出しの変更について</h4>
                    <div className="mt-2 text-sm text-yellow-700">
                      <p>小見出しのチェックを付け外しすると、手順番号が変更され、既存の画像との紐づけが影響を受ける可能性があります。</p>
                      <ul className="mt-2 list-disc list-inside space-y-1">
                        <li>手順から小見出しに変更 → 画像が表示されなくなる</li>
                        <li>小見出しから手順に変更 → 画像の手順番号が変わる</li>
                      </ul>
                    </div>
                  </div>
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
                    <div key={step.id || index} className="border rounded-lg p-4">
                      <div className="flex items-center gap-4 mb-2">
                        {!step.heading && (
                          <span className="text-sm font-medium text-white bg-gray-900 px-2 py-1 rounded">
                            {stepNumberMapping.get(index + 1) || (index + 1)}
                          </span>
                        )}
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={!!step.heading}
                            onChange={(e) => updateNewStep(index, 'heading', e.target.checked ? step.content : null)}
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
                        placeholder={step.heading ? "小見出しを入力してください" : "詳細手順を入力してください"}
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
                  // マッピングから正しいstep_numberを取得（UIの手順番号を1から開始）
                  const stepNumber = stepNumberMapping.get(index + 1) || (index + 1);
                  
                  console.log(`🔵 ステップ${index}の詳細:`, {
                    content: step.content,
                    heading: step.heading,
                    mappedStepNumber: stepNumberMapping.get(index),
                    fallbackStepNumber: index + 1,
                    finalStepNumber: stepNumber,
                    stepNumberMapping: Array.from(stepNumberMapping.entries())
                  });
                  
                  const images = step.id ? (stepImages[step.id] || []) : [];
                  
                  console.log(`🔵 ステップ${index}の画像検索結果:`, {
                    stepNumber,
                    images,
                    allStepImages: stepImages
                  });

                  return (
                    <div key={step.id} className={`${step.heading ? '' : 'border rounded-lg'} p-4`}>
                      <div className="flex items-center gap-2 mb-3">
                        {!step.heading && (
                          <span className="text-sm font-medium text-white bg-gray-900 px-2 py-1 rounded">
                            {stepNumber}
                          </span>
                        )}
                        <span className={`text-sm ${step.heading ? 'font-semibold text-lg text-gray-800' : 'text-gray-600'}`}>
                          {step.content.substring(0, 50)}...
                        </span>
                      </div>
                      
                      {/* 小見出しの場合は画像アップロード欄を非表示 */}
                      {!step.heading && (
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
                                  console.log(`🔵 ファイル選択: ステップ${index} (stepNumber: ${stepNumber}, stepId: ${step.id})`, file);
                                  if (step.id) {
                                    handleImageUpload(file, step.id);
                                  } else {
                                    console.error('ステップIDが存在しません:', step);
                                    setError('ステップIDが存在しません。手順を保存してから画像をアップロードしてください。');
                                  }
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
                                      onClick={() => {
                                        if (step.id) {
                                          handleImageDelete(image.id, step.id);
                                        } else {
                                          console.error('ステップIDが存在しません:', step);
                                          setError('ステップIDが存在しません。');
                                        }
                                      }}
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
            </>
          )}
        </div>
      </div>
    </div>
  );
} 