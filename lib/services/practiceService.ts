import * as PracticeRepository from '../repositories/practiceRepository';
import * as StatisticRepository from '../repositories/statisticRepository';
import { PracticeMode } from '../types';

interface PracticeResult {
  deckId: number;
  correctCount: number;
  wrongCount: number;
  durationMs: number;
  mode: PracticeMode;
}

export const savePracticeSession = async ({
  deckId,
  correctCount,
  wrongCount,
  durationMs,
  mode
}: PracticeResult) => {
  const now = new Date();
  const dateISO = now.toISOString();
  const dateYMD = dateISO.split('T')[0];

  const totalCards = correctCount + wrongCount;
  
  // Eski başarı oranı (İstatistik tablosu için hala hesaplayabiliriz ama practice tablosuna yazmayacağız)
  const successRate = totalCards > 0 
    ? Math.round((correctCount / totalCards) * 100) 
    : 0;

  try {
    // 1. PRATİK GEÇMİŞİNE KAYDET (YENİ FORMAT)
    // Artık successRate yerine correct/wrong count gönderiyoruz.
    await PracticeRepository.createPractice(
      deckId,
      dateISO,
      durationMs,
      correctCount, // YENİ
      wrongCount,   // YENİ
      mode
    );
    console.log(`✅ ${mode} pratik geçmişi kaydedildi (Doğru: ${correctCount}, Yanlış: ${wrongCount}).`);

    // 2. GÜNLÜK İSTATİSTİKLERİ GÜNCELLE (OPSİYONEL AMA TAVSİYE EDİLİR)
    // Bu tabloyu sadece genel bir özet olarak tutuyoruz.
    // Detaylı analizleri artık doğrudan practices tablosundan yapıyoruz.
    const todayStat = await StatisticRepository.getStatisticByDate(dateYMD);

    // Karar: Hangi modda çalışılırsa çalışılsın, kart sayısı istatistiğe eklensin mi?
    // Evet, kullanıcı bir emek harcadı. Ama "Learned" (Öğrenilen) sadece SRS ile artmalı.
    const cardsToAdd = totalCards; 

    if (todayStat) {
      // Başarı oranı ortalamasını güncelle (Ağırlıklı ortalama daha iyi olurdu ama şimdilik basit ortalama)
      const currentRate = todayStat.practice_success_rate || 0;
      const newAvgSuccess = Math.round((currentRate + successRate) / 2);

      await StatisticRepository.updateStatistic(
        todayStat.id,
        (todayStat.studied_card_count || 0) + cardsToAdd,
        todayStat.added_card_count || 0,
        todayStat.learned_card_count || 0,
        (todayStat.spent_time || 0) + durationMs,
        newAvgSuccess,
        todayStat.deck_success_rate
      );
    } else {
      await StatisticRepository.createStatistic(
        dateYMD,
        cardsToAdd,
        0,
        0,
        durationMs,
        successRate,
        0
      );
    }
    console.log('📈 Günlük istatistik özeti güncellendi.');

  } catch (error) {
    console.error('❌ Pratik servisi hatası:', error);
    // Hata durumunda kullanıcıya UI tarafında bilgi verilebilir veya loglanabilir.
    throw error;
  }
};