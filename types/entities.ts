export type PracticeRoute =
  | "/pratik/classic"
  | "/pratik/match"
  | "/pratik/truefalse"
  | "/pratik/order"
  | "/pratik/multiple"
  | "/pratik/random";

  export interface Deck {
    id: number;
    user_id: number;
    name: string;
    description: string;
    goal: number;
    created_at: string;
}

export interface Card {
    id: number;
    deck_id: number;
    front_word: string;
    front_image: string | null;
    back_word: string;
    back_image: string | null;
    rating: string;
    created_at: string;
    interval: number;
    easeFactor: number;
    nextReview: string;
}