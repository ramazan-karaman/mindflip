import { supabase } from '../supabase';

// Veritabanı Tipleri (Supabase'deki sütunlarla aynı)
export interface RemoteDeck {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  card_count: number;
  cover_image: string | null;
}

export interface RemoteCard {
  front_text: string;
  back_text: string;
  front_image: string | null;
  back_image: string | null;
}

// 1. Tüm desteleri getir (Vitrin)
export const fetchLibraryDecks = async (searchQuery: string = ''): Promise<RemoteDeck[]> => {
  
  // 1. Temel sorguyu oluştur
  let query = supabase
    .from('public_decks')
    .select('*')
    .order('created_at', { ascending: false });

  // 2. Eğer arama metni (searchQuery) doluysa filtre ekle
  if (searchQuery) {
    // 'ilike' => Case Insensitive Like (Büyük/küçük harf duyarsız arama)
    // %işareti% => İçinde bu kelime geçenleri bul demektir.
    query = query.ilike('title', `%${searchQuery}%`);
  }

  // 3. Sorguyu çalıştır
  const { data, error } = await query;

  if (error) {
    console.error('Desteler çekilemedi:', error);
    throw error;
  }
  return data || [];
};

// 2. Seçilen destenin kartlarını getir (İndirme)
export const fetchDeckCards = async (deckId: string): Promise<RemoteCard[]> => {
  const { data, error } = await supabase
    .from('public_cards')
    .select('front_text, back_text, front_image, back_image') // Sadece lazım olanlar
    .eq('deck_id', deckId);

  if (error) {
    console.error('Kartlar çekilemedi:', error);
    throw error;
  }
  return data || [];
};