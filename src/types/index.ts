// API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// User Types
export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
  hasFaceData?: boolean;
}

export interface CreateUserRequest {
  name: string;
  email: string;
}

// Face Recognition Types
export interface FaceEmbedding {
  embedding: number[];
  quality: number;
}

export interface FaceRegistrationRequest {
  userId: string;
  faceEmbedding: number[];
  quality: number;
}

export interface FaceAuthenticationRequest {
  faceEmbedding: number[];
}

export interface FaceAuthenticationResponse {
  success: boolean;
  user?: {
    id: string;
    name: string;
    email: string;
  };
  similarity: number;
  threshold: number;
}

// MediaPipe Types
export interface FaceLandmarks {
  x: number;
  y: number;
  z?: number;
}

// Component Props Types
export interface FaceDetectorProps {
  onFaceDetected?: (landmarks: FaceLandmarks[]) => void;
  onFaceRegistered?: (result: ApiResponse) => void;
  mode?: 'register' | 'authenticate';
}