import { Card } from '../types';

/**
 * 
 * * @param card - İşlenecek kart objesi
 * @param quality - Kullanıcının verdiği cevap kalitesi (0-5 arası)
 * MindFlip'te: 1: Zor, 3: Normal, 5: Kolay
 * @returns
 */
export const calculateNextReview = (card: Card, quality: number) => {
  // Veritabanından gelen değerler veya varsayılanlar
  const currentEaseFactor = card.easeFactor ?? 2.5;
  const currentInterval = card.interval ?? 1; // Gün cinsinden

  let newInterval: number;
  let newEaseFactor: number = currentEaseFactor;

  if (quality >= 3) {
    // Başarılı Hatırlama
    if (currentInterval < 1) {
      newInterval = 1;
    } else if (currentInterval === 1) {
      newInterval = 6;
    } else {
      newInterval = Math.round(currentInterval * currentEaseFactor);
    }
    
    // Ease Factor Formülü: EF' = EF + (0.1 - (5-q) * (0.08 + (5-q)*0.02))
    newEaseFactor += 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02);
  } else {
    // Yanlış / Unutulmuş -> Başa dön (Reset)
    newInterval = 1; 
    newEaseFactor = Math.max(1.3, currentEaseFactor - 0.2); // En az 1.3 olabilir
  }

  // Ease Factor alt limiti
  if (newEaseFactor < 1.3) newEaseFactor = 1.3;

  // Yeni tarihi hesapla
  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + newInterval);

  return {
    interval: newInterval,
    easeFactor: newEaseFactor,
    nextReview: nextReviewDate.toISOString(),
  };
};