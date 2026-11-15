export type EventType =
  | "wedding"
  | "trip"
  | "party"
  | "birthday"
  | "family"
  | "college"
  | "corporate";

export type UploadMode = "everyone" | "photographer_only";

export interface Event {
  id: string;
  title: string;
  description?: string;
  type: EventType;
  slug: string;
  host_id?: string;
  upload_mode: UploadMode;
  require_host_approval: boolean;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface Moment {
  id: string;
  event_id: string;
  name: string; // e.g. "Haldi", "Reception", "Day 1"
  order_index: number;
  created_at: string;
}

export interface Guest {
  id: string;
  event_id: string;
  name: string;
  avatar_url?: string;
  face_embedding?: number[]; // Vector embedding for facial matching
  status: "active" | "pending_approval" | "opted_out";
  created_at: string;
}

export interface Photo {
  id: string;
  event_id: string;
  moment_id?: string;
  uploader_id?: string;
  storage_path: string;
  thumbnail_path?: string;
  width: number;
  height: number;
  processing_status: "pending" | "processing" | "completed" | "failed";
  created_at: string;
}

export interface PhotoFace {
  id: string;
  photo_id: string;
  guest_id?: string; // Assigned guest match
  bounding_box: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  embedding: number[];
  confidence: number;
  created_at: string;
}

export interface PersonalAlbumSummary {
  guest_id: string;
  event_id: string;
  total_photos: number;
  solo_count: number;
  group_count: number;
}
