// --- VERİ MODELLERİ ---

export type PracticeMode = 
  | 'classic'          
  | 'match'            
  | 'write'          
  | 'truefalse'       
  | 'multiple'; 

export interface Card {
  id: number;
  deck_id: number;
  
  // İçerik
  front_word: string;
  front_image: string | null;
  back_word: string;
  back_image: string | null;
  created_at: string;

  // SRS (Spaced Repetition) Verileri
  box: number;          // Kutusu (1-5 arası)
  interval: number;      
  easeFactor: number;    
  nextReview: string | null; 
}

export interface Deck {
  id: number;
  name: string;
  description: string | null;
  goal: number; // Günlük yeni kart hedefi
  created_at: string;
}

// Deste listesinde kart sayısını göstermek için genişletilmiş tip
export interface DeckWithCardCount extends Deck {
  cardCount: number;
  dueCount: number; // Gözden geçirilmesi gereken kart sayısı
}

export interface Practice {
  id: number;
  deck_id: number;
  date: string;         // ISOString
  duration: number;     // Milisaniye cinsinden
  correct_count: number;
  wrong_count: number;
  mode: PracticeMode;
}

export interface Statistic {
  id: number;
  date: string;         // ISOString (Genelde 'YYYY-MM-DD')
  
  // Sayaçlar
  studied_card_count: number;
  added_card_count: number;
  learned_card_count: number;
  spent_time: number;   // Milisaniye veya Dakika (Repo mantığına göre)
  
  // Oranlar
  practice_success_rate: number | null;
  deck_success_rate: number | null;
}

// --- NAVİGASYON TİPLERİ ---

export type PracticeRoute = 
  | "/pratik/classic"
  | "/pratik/match"
  | "/pratik/truefalse"
  | "/pratik/write"
  | "/pratik/multiple"
  | "/pratik/random";