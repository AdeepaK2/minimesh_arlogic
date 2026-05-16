export interface ProjectRow {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectResponse {
  id: string;
  name: string;
  description: string | null;
  sceneCount?: number;
  createdAt: string;
  updatedAt: string;
}
