export interface UserRow {
  user_id: string;
  username: string;
  email: string;
  password_hash: string;
  nickname: string | null;
  created_at: string;
  updated_at: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  account: string;
  password: string;
}

export interface UpdateProfileRequest {
  email?: string;
  nickname?: string;
  password?: string; // 禁止字段
}

export interface UserProfile {
  userId: string;
  username: string;
  email: string;
  nickname: string | null;
  createdAt: string;
}
