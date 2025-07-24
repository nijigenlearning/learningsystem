# 学習教材管理システム

学習教材の管理と共有を行うWebアプリケーションです。

## 技術スタック

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage
- **UI Components**: Radix UI, Lucide React
- **Deployment**: Vercel

## 機能

- 教材のCRUD操作（作成、読み取り、更新、削除）
- YouTube動画の登録（URLから自動でタイトル、説明、サムネイルを取得）
- テキスト編集機能
- 手順作成機能
- 画像管理機能
- 確認・承認フロー
- 事業所管理
- ユーザーロール分離（管理者/一般ユーザー）

## セットアップ

### 1. リポジトリのクローン

```bash
git clone https://github.com/nijigenlearning/learningsystem.git
cd learningsystem
```

### 2. 依存関係のインストール

```bash
npm install
```

### 3. 環境変数の設定

`.env.local`ファイルを作成し、以下の環境変数を設定してください：

```env
# YouTube API Key
YOUTUBE_API_KEY="your_youtube_api_key"

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Supabase PostgreSQL Database URL
DATABASE_URL="postgresql://postgres:password@db.your-project.supabase.co:5432/postgres"

# JWT Secret
JWT_SECRET=your_jwt_secret
```

### 4. データベースのセットアップ

Supabaseダッシュボードで`supabase/schema.sql`を実行してください。

### 5. 開発サーバーの起動

```bash
npm run dev
```

## デプロイ

このプロジェクトはVercelで自動デプロイされます。mainブランチにプッシュすると自動的にデプロイが実行されます。

## 管理者アカウント

初回アクセス時に管理者アカウントを作成してください。

## ライセンス

MIT License
