// Shared UI types for the Event pages

export interface FaceBox {
  id: string;
  x: number; // 0-1 normalized
  y: number;
  w: number;
  h: number;
  personId?: string;
  personName?: string;
  isMe: boolean;
}

export interface PhotoItem {
  id: string;
  url: string;
  thumbUrl: string;
  width: number;
  height: number;
  momentId?: string;
  momentName?: string;
  uploaderId?: string;
  uploaderName?: string;
  faceCount: number;
  isSolo: boolean;
  isFavorited: boolean;
  isHidden: boolean;
  faces: FaceBox[];
  status: 'pending' | 'processing' | 'done' | 'failed';
  takenAt?: string;
}

export interface PersonCard {
  personId: string;
  name: string;
  faceThumbUrl?: string;
  photoCount: number;
  isMe: boolean;
}

export interface MomentTab {
  id: string | 'all';
  name: string;
  count?: number;
}

export interface EventProgress {
  sorted: number;
  total: number;
  percent: number;
}

export interface EventMember {
  userId: string;
  name: string;
  avatarUrl?: string;
  role: 'host' | 'uploader' | 'guest';
  status: 'approved' | 'pending';
}
