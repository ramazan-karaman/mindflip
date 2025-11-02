import { db } from '../db';
import * as CardRepo from '../repositories/cardRepository';
import * as DeckRepo from '../repositories/deckRepository';
import * as PracticeRepo from '../repositories/practiceRepository';
import * as StatisticRepo from '../repositories/statisticRepository';
import { useSyncStore } from '../store/syncStore';

import { Card, Deck, Practice, Statistic } from '../types';

//Gerçek apı çağrısı burda yapılacaktır

//Mock API
const apiClient = {

  post: async (endpoint: string, data: any): Promise<{ cloud_id: string, [key: string]: any }> => {
    console.log(`[API POST] ${endpoint}`, data);
    await new Promise(r => setTimeout(r, 150));
    return { ...data, cloud_id: `cloud_${endpoint.slice(1)}_${data.id || Math.random()}` };
  },
  put: async (endpoint: string, data: any): Promise<any> => {
    console.log(`[API PUT] ${endpoint}`, data);
    await new Promise(r => setTimeout(r, 150));
    return data;
  },
  
  delete: async (endpoint: string): Promise<void> => {
    console.log(`[API DELETE] ${endpoint}`);
    await new Promise(r => setTimeout(r, 150));
  },
};

export const checkHasPendingChanges = async (): Promise<boolean> => {
  console.log("Bekleyen değişiklikler kontrol ediliyor...");
  const tables = ['users', 'decks', 'cards', 'statistics', 'practices'];
  let totalPending = 0;

  for (const table of tables) {
    try {
      const result = await db.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) as count FROM ${table} WHERE sync_status != 'synced';`
      );
      if (result && result.count > 0) {
        totalPending += result.count;
      }
    } catch (error) {
      console.error(`${table} kontrol edilirken hata:`, error);
    }
  }

  const hasChanges = totalPending > 0;
  useSyncStore.getState().setHasPendingChanges(hasChanges);
  console.log(`Bekleyen değişiklik durumu: ${hasChanges} (${totalPending} kayıt)`);
  return hasChanges;
};

export const runFullSync = async () => {
  const { isSyncing, setSyncing } = useSyncStore.getState();

  if (isSyncing) {
    console.log("Senkronizasyon zaten çalışıyor, atlanıyor.");
    return;
  }

  const hasChanges = await checkHasPendingChanges();
  if (!hasChanges) {
    console.log("Senkronize edilecek değişiklik yok. Çıkılıyor.");
    return;
  }

  setSyncing(true);
  console.log("--- Tam Senkronizasyon Başlatıldı ---");

  try {
    const pendingDecks = await db.getAllAsync<Deck>(`SELECT * FROM decks WHERE sync_status != 'synced';`);
    for (const deck of pendingDecks) {
      await syncRecord('decks', deck, DeckRepo);
    }

    const pendingCards = await db.getAllAsync<Card>(`SELECT * FROM cards WHERE sync_status != 'synced';`);
    for (const card of pendingCards) {
      const parentDeck = await DeckRepo.getDeckById(card.deck_id);
      
      if (!parentDeck?.cloud_id) {
        console.warn(`Kart ${card.id} atlanıyor: Ebeveyn deste ${card.deck_id} henüz senkronize olmamış.`);
        continue;
      }
      
      const cardPayload = { ...card, deck_cloud_id: parentDeck.cloud_id };
      await syncRecord('cards', cardPayload, CardRepo);
    }

    const pendingStats = await db.getAllAsync<Statistic>(`SELECT * FROM statistics WHERE sync_status != 'synced';`);
    for (const stat of pendingStats) {
      await syncRecord('statistics', stat, StatisticRepo);
    }

    const pendingPractices = await db.getAllAsync<Practice>(`SELECT * FROM practices WHERE sync_status != 'synced';`);
    for (const practice of pendingPractices) {
      await syncRecord('practices', practice, PracticeRepo);
    }

    console.log("Senkronizasyon döngüsü tamamlandı.");

  } catch (error) {
    console.error("Senkronizasyon sırasında ciddi bir hata oluştu:", error);
  } finally {
    setSyncing(false);
    await checkHasPendingChanges(); 
    console.log("--- Tam Senkronizasyon Durduruldu ---");
  }
};

async function syncRecord(
  endpoint: string, 
  record: any & { id: number, cloud_id: string | null, sync_status: string },
  Repo: any 
) {
  
  const now = new Date().toISOString();
  
  try {
    if (record.sync_status === 'pending_create') {
      const { id: localId, cloud_id, sync_status, ...createPayload } = record;
      
      const response = await apiClient.post(`/${endpoint}`, createPayload);
      
      await db.runAsync(
        `UPDATE ${endpoint} SET sync_status = 'synced', cloud_id = ?, last_modified = ? WHERE id = ?`,
        [response.cloud_id, now, localId]
      );
      console.log(`[SYNC-CREATE] ${endpoint} #${localId} -> Bulut ID ${response.cloud_id} ile eşitlendi.`);

    } else if (record.sync_status === 'pending_update') {
      const { id: localId, cloud_id, sync_status, ...updatePayload } = record;
      
      if (!cloud_id) {
        console.error(`[SYNC-HATA] ${endpoint} #${localId}: Güncellenmek istendi ama cloud_id'si yok.`);
        return; 
      }
      
      await apiClient.put(`/${endpoint}/${cloud_id}`, updatePayload);

      await db.runAsync(
        `UPDATE ${endpoint} SET sync_status = 'synced', last_modified = ? WHERE id = ?`,
        [now, localId]
      );
      console.log(`[SYNC-UPDATE] ${endpoint} #${localId} (Bulut ID ${cloud_id}) eşitlendi.`);

    } else if (record.sync_status === 'pending_delete') {
      const { id: localId, cloud_id } = record;
      
      if (!cloud_id) {
      } else {
        await apiClient.delete(`/${endpoint}/${cloud_id}`);
      }
      
      await db.runAsync(`DELETE FROM ${endpoint} WHERE id = ?`, [localId]);
      console.log(`[SYNC-DELETE] ${endpoint} #${localId} (Bulut ID ${cloud_id}) lokalden ve buluttan silindi.`);
    }

  }catch (error) {
    if (error instanceof Error) {
      console.error(`[SYNC-HATA] ${endpoint} #${record.id} işlenirken hata:`, error.message);
    } else {
      console.error(`[SYNC-HATA] ${endpoint} #${record.id} bilinmeyen bir hata fırlattı:`, error);
    }
  }
}