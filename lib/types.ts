
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

export interface Deck extends BaseRecord {
  user_id: number;
  name: string;
  description: string | null;
  goal: number | null;
  created_at: string;
}

export interface DeckWithCardCount extends Deck {
  cardCount: number;
}

export interface Practice extends BaseRecord {
  user_id: number;
  deck_id: number;
  date: string; 
  duration: number; 
  success_rate: number | null;
}

export interface Statistic extends BaseRecord {
  user_id: number;
  date: string; 
  studied_card_count: number;
  added_card_count: number;
  learned_card_count: number;
  spent_time: number;
  practice_success_rate: number | null;
  deck_success_rate: number | null;
}

export interface User extends BaseRecord {
  name: string | null;
  email: string | null;
  password: string | null; // authentication yapılırken token yapılacak
  profile_photo: string | null;
}

export type PracticeRoute = 
  | "/pratik/classic"
  | "/pratik/match"
  | "/pratik/truefalse"
  | "/pratik/order"
  | "/pratik/multiple"
  | "/pratik/random";