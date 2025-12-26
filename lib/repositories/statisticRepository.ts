import { SQLiteRunResult } from 'expo-sqlite';
import { db } from '../db';
import { Card, Statistic } from '../types';

// --- CRUD İŞLEMLERİ ---

export const createStatistic = async (
  date: string, 
  studied_card_count: number, 
  added_card_count: number, 
  learned_card_count: number, 
  spent_time: number, 
  practice_success_rate: number | null, 
  deck_success_rate: number | null
): Promise<Statistic | null> => {
  const query = `
    INSERT INTO statistics (
      date, studied_card_count, added_card_count, learned_card_count, 
      spent_time, practice_success_rate, deck_success_rate
    ) VALUES (?, ?, ?, ?, ?, ?, ?);
  `;
  try {
    const result = await db.runAsync(query, [
      date, studied_card_count, added_card_count, learned_card_count, 
      spent_time, practice_success_rate, deck_success_rate
    ]);
    return getStatisticById(result.lastInsertRowId);
  } catch (error) {
    console.error("İstatistik eklenirken hata:", error);
    throw error;
  }
};

export const getStatisticById = async (id: number): Promise<Statistic | null> => {
  const query = `SELECT * FROM statistics WHERE id = ?;`;
  try {
    const statistic = await db.getFirstAsync<Statistic>(query, [id]);
    return statistic ?? null;
  } catch (error) {
    console.error(`İstatistik ${id} alınırken hata:`, error);
    throw error;
  }
};

export const getStatistics = async (): Promise<Statistic[]> => {
  const query = `SELECT * FROM statistics ORDER BY date DESC;`;
  try {
    return await db.getAllAsync<Statistic>(query);
  } catch (error) {
    console.error(`İstatistikler alınırken hata:`, error);
    throw error;
  }
};

export const getStatisticByDate = async (date: string): Promise<Statistic | null> => {
  const query = `SELECT * FROM statistics WHERE date LIKE ?;`;
  try {
    const statistic = await db.getFirstAsync<Statistic>(query, [`${date}%`]); 
    return statistic ?? null;
  } catch (error) {
    console.error(`Tarih bazlı istatistik alınırken hata:`, error);
    throw error;
  }
};

export const updateStatistic = async (
  id: number, 
  studied_card_count: number, 
  added_card_count: number, 
  learned_card_count: number, 
  spent_time: number, 
  practice_success_rate: number | null, 
  deck_success_rate: number | null
): Promise<SQLiteRunResult> => {
  const query = `
    UPDATE statistics SET 
      studied_card_count = ?, 
      added_card_count = ?, 
      learned_card_count = ?, 
      spent_time = ?, 
      practice_success_rate = ?, 
      deck_success_rate = ?
    WHERE id = ?;
  `;
  try {
    const result = await db.runAsync(query, [
      studied_card_count, added_card_count, learned_card_count, 
      spent_time, practice_success_rate, deck_success_rate, 
      id
    ]);
    return result;
  } catch (error) {
    console.error(`İstatistik ${id} güncellenirken hata:`, error);
    throw error;
  }
};

export const deleteStatistic = async (id: number): Promise<SQLiteRunResult> => {
  const query = `DELETE FROM statistics WHERE id = ?;`;
  try {
    return await db.runAsync(query, [id]);
  } catch (error) {
    console.error(`İstatistik ${id} silinirken hata:`, error);
    throw error;
  }
};


export interface DailyProgress {
  totalDecks: number;       // Toplam Deste
  completedDecks: number;   // Hedefi Biten Deste
  totalCardsStudied: number;// Bugün Toplam İncelenen Kart
}

// 1. GÜNLÜK İLERLEME (DESTE BAZLI + GERÇEK VERİ)
export const getDailyProgress = async (): Promise<DailyProgress> => {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  try {
    // Mantık: Her deste için;
    // - Deste hedefini al (yoksa 5 say)
    // - Bugün o destede yapılan 'practices' tablosundaki (correct + wrong) toplamını al.
    const query = `
      SELECT 
        d.id, 
        COALESCE(d.goal, 5) as targetGoal, 
        (
          SELECT COALESCE(SUM(correct_count + wrong_count), 0)
          FROM practices p 
          WHERE p.deck_id = d.id AND p.date LIKE ?
        ) as studiedToday
      FROM decks d
    `;

    const decks = await db.getAllAsync<{id: number, targetGoal: number, studiedToday: number}>(
      query, 
      [`${today}%`]
    );

    let completedCount = 0;
    let totalCards = 0;
    
    decks.forEach(deck => {
      totalCards += deck.studiedToday;
      // Eğer çalışılan kart sayısı >= hedef ise deste bitmiştir.
      if (deck.studiedToday >= deck.targetGoal) {
        completedCount++;
      }
    });

    return {
      totalDecks: decks.length,
      completedDecks: completedCount,
      totalCardsStudied: totalCards
    };

  } catch (error) {
    console.error("Günlük ilerleme hesaplanırken hata:", error);
    return { totalDecks: 0, completedDecks: 0, totalCardsStudied: 0 };
  }
};

// 2. SERİ (STREAK) HESAPLAMA
// Zinciri kırmamak için sağlam bir algoritma.
export const getStreak = async (): Promise<number> => {
  try {
    // Sadece pratik yapılan tarihleri benzersiz olarak çek
    const result = await db.getAllAsync<{date: string}>(
      'SELECT DISTINCT substr(date, 1, 10) as date FROM practices ORDER BY date DESC'
    );
    
    if (result.length === 0) return 0;

    const uniqueDates = new Set(result.map(r => r.date));
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    let streak = 0;
    let currentDate = new Date();

    // Kural: Eğer bugün pratik YAPILMADIYSA ve dün de YAPILMADIYSA seri 0'dır.
    if (!uniqueDates.has(today) && !uniqueDates.has(yesterday)) {
        return 0;
    }

    // Saymaya nereden başlayacağız?
    // Bugün yaptıysak bugünden, yapmadıysak dünden (çünkü dünkü seri hala geçerlidir).
    if (!uniqueDates.has(today)) {
        currentDate.setDate(currentDate.getDate() - 1); // Düne git
    }

    // Geriye doğru ardışık günleri say
    while (true) {
        const dateString = currentDate.toISOString().split('T')[0];
        if (uniqueDates.has(dateString)) {
            streak++;
            currentDate.setDate(currentDate.getDate() - 1); // Bir gün daha geri git
        } else {
            break; // Zincir koptu
        }
    }

    return streak;
  } catch (error) {
    console.error("Streak hesaplanırken hata:", error);
    return 0;
  }
};

// 3. GELECEK YÜKÜ (SRS Tahmini)
export const getFutureReviews = async (): Promise<{date: string, count: number}[]> => {
  // Önümüzdeki 5 gün içinde 'nextReview' tarihi gelen kartları grupla
  const query = `
    SELECT strftime('%Y-%m-%d', nextReview) as reviewDate, COUNT(*) as count 
    FROM cards 
    WHERE nextReview IS NOT NULL 
    AND nextReview > datetime('now')
    AND nextReview < datetime('now', '+5 days')
    GROUP BY reviewDate
    ORDER BY reviewDate ASC;
  `;
  try {
    const results = await db.getAllAsync<{reviewDate: string, count: number}>(query);
    return results.map(r => ({ date: r.reviewDate, count: r.count }));
  } catch (error) {
    console.error("Gelecek yükü hesaplanırken hata:", error);
    return [];
  }
};

// 4. GELİŞİM FIRSATLARI (Kırmızı Bölge)
export const getWeakestCards = async (): Promise<Card[]> => {
  // easeFactor < 2.2 olan (zorlanan) kartları getir.
  const query = `
    SELECT * FROM cards 
    WHERE easeFactor < 2.2 
    ORDER BY easeFactor ASC 
    LIMIT 20;
  `;
  try {
    const cards = await db.getAllAsync<Card>(query);
    return cards;
  } catch (error) {
    console.error("Zayıf kartlar alınırken hata:", error);
    return [];
  }
};

export interface MasteryDistribution {
  new: number;       // Box 0
  learning: number;  // Box 1-2
  reviewing: number; // Box 3-4
  mastered: number;  // Box 5+
}

export const getMasteryDistribution = async (): Promise<MasteryDistribution> => {
  try {
    const query = `
      SELECT 
        SUM(CASE WHEN box = 0 THEN 1 ELSE 0 END) as newCount,
        SUM(CASE WHEN box BETWEEN 1 AND 2 THEN 1 ELSE 0 END) as learningCount,
        SUM(CASE WHEN box BETWEEN 3 AND 4 THEN 1 ELSE 0 END) as reviewingCount,
        SUM(CASE WHEN box >= 5 THEN 1 ELSE 0 END) as masteredCount
      FROM cards;
    `;
    
    const result = await db.getFirstAsync<{
      newCount: number, 
      learningCount: number, 
      reviewingCount: number, 
      masteredCount: number
    }>(query);

    return {
      new: result?.newCount || 0,
      learning: result?.learningCount || 0,
      reviewing: result?.reviewingCount || 0,
      mastered: result?.masteredCount || 0
    };
  } catch (error) {
    console.error("Ustalık dağılımı hatası:", error);
    return { new: 0, learning: 0, reviewing: 0, mastered: 0 };
  }
};