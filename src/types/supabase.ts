export interface User {
  id: string;
  email: string;
  password: string;
  name?: string;
  role: string;
  created_at: string;
  updated_at: string;
}

export interface Material {
  id: string;
  title: string;
  description?: string;
  youtube_url?: string;
  youtube_id?: string;
  thumbnail?: string;
  transcript?: string;
  instruction?: string;
  note?: string;
  software?: string;
  version?: string;
  learning_note?: string;
  video_title?: string;
  video_description?: string;
  video_channel?: string;
  video_published_at?: string;
  video_duration?: string;
  sample_image_url?: string;
  video_registration: string;
  text_registration: string;
  text_revision: string;
  image_registration: string;
  confirmation: string;
  office?: string;
  created_at: string;
  updated_at: string;
}

export interface RecipeStep {
  id: string;
  material_id: string;
  step_number: number;
  content: string;
  heading?: string;
  created_at: string;
  updated_at: string;
}

export interface MaterialImage {
  id: string;
  material_id: string;
  step_id: number;
  image_url: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  order: number;
  created_at: string;
  updated_at: string;
}

export interface Office {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
} 