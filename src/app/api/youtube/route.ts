import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json(
        { error: 'YouTube URLが必要です' },
        { status: 400 }
      );
    }

    // YouTube URLからビデオIDを抽出
    const videoIdMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    
    if (!videoIdMatch) {
      return NextResponse.json(
        { error: '有効なYouTube URLではありません' },
        { status: 400 }
      );
    }

    const videoId = videoIdMatch[1];
    const apiKey = process.env.YOUTUBE_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'YouTube APIキーが設定されていません' },
        { status: 500 }
      );
    }

    // YouTube Data API v3を使用して動画情報を取得
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${apiKey}&part=snippet,contentDetails,statistics`
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: 'YouTube APIからの情報取得に失敗しました' },
        { status: 500 }
      );
    }

    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      return NextResponse.json(
        { error: '動画が見つかりませんでした' },
        { status: 404 }
      );
    }

    const video = data.items[0];
    const snippet = video.snippet;

    // 動画情報を返す
    return NextResponse.json({
      videoId: videoId,
      title: snippet.title,
      description: snippet.description,
      thumbnail: snippet.thumbnails?.maxres?.url || snippet.thumbnails?.high?.url || snippet.thumbnails?.medium?.url,
      channelTitle: snippet.channelTitle,
      publishedAt: snippet.publishedAt,
      duration: video.contentDetails?.duration,
      viewCount: video.statistics?.viewCount,
      likeCount: video.statistics?.likeCount
    });

  } catch (error) {
    console.error('YouTube API エラー:', error);
    return NextResponse.json(
      { error: '動画情報の取得中にエラーが発生しました' },
      { status: 500 }
    );
  }
} 