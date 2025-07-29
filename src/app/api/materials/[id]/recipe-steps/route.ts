import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';

// 手順を取得
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { data, error } = await supabaseAdmin
      .from('recipe_steps')
      .select('*')
      .eq('material_id', id)
      .order('step_number', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch {
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}

// 手順を保存
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    
    console.log('POST /api/materials/[id]/recipe-steps');
    console.log('material_id:', id);
    console.log('body:', body);

    // バリデーション
    if (!body || !Array.isArray(body)) {
      console.error('Invalid body: body is not an array');
      return NextResponse.json({ error: 'リクエストボディが無効です' }, { status: 400 });
    }

    if (body.length === 0) {
      console.error('Invalid body: body is empty');
      return NextResponse.json({ error: '保存する手順がありません' }, { status: 400 });
    }

    // 各手順のバリデーション
    for (let i = 0; i < body.length; i++) {
      const step = body[i];
      if (!step.material_id || !step.content) {
        console.error(`Invalid step at index ${i}:`, step);
        return NextResponse.json({ error: `手順${i + 1}のデータが無効です` }, { status: 400 });
      }
    }

    const { data, error } = await supabaseAdmin
      .from('recipe_steps')
      .insert(body)
      .select();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('Successfully inserted data:', data);
    return NextResponse.json(data);
  } catch (err) {
    console.error('POST error:', err);
    if (err instanceof Error) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}

// 手順を削除
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const stepId = searchParams.get('stepId');

    console.log('DELETE /api/materials/[id]/recipe-steps');
    console.log('material_id:', id);
    console.log('stepId:', stepId);

    if (stepId) {
      // 特定の手順を削除
      const { error } = await supabaseAdmin
        .from('recipe_steps')
        .delete()
        .eq('id', stepId)
        .eq('material_id', id);

      if (error) {
        console.error('Delete specific step error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      console.log('Successfully deleted specific step');
      return NextResponse.json({ message: '削除されました' });
    } else {
      // その教材のすべての手順を削除
      const { error } = await supabaseAdmin
        .from('recipe_steps')
        .delete()
        .eq('material_id', id);

      if (error) {
        console.error('Delete all steps error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      console.log('Successfully deleted all steps');
      return NextResponse.json({ message: 'すべての手順が削除されました' });
    }
  } catch (err) {
    console.error('DELETE error:', err);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
} 