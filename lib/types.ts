
export type SyncStatus = 'pending_create' | 'pending_update' | 'pending_delete' | 'synced';

export interface BaseRecord {
  id: number;          
  cloud_id: string | null; 
  last_modified: string; 
  sync_status: SyncStatus;
}

export interface Card extends BaseRecord {
  deck_id: number;
  front_word: string;
  front_image: string | null;
  back_word: string;
  back_image: string | null;
  rating: string | null;
  created_at: string;
  interval: number;
  easeFactor: number;
  nextReview: string;
}