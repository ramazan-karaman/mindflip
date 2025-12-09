import { decode } from 'base64-arraybuffer';
import { readAsStringAsync } from 'expo-file-system/legacy';
import { db } from '../db';
import * as DeckRepo from '../repositories/deckRepository';
import { useSyncStore } from '../store/syncStore';
import { supabase } from '../supabase';
import { Card, Deck, Practice, Statistic, User } from '../types';

const TABLES = {
  users: 'users',
  decks: 'decks',
  cards: 'cards',
  statistics: 'statistics',
  practices: 'practices',
};

// 1. YARDIMCI: Resim Yükleme
const uploadImage = async (localUri: string, userId: string): Promise<string | null> => {
  try {
    if (localUri.startsWith('http')) return localUri;

    const fileName = `${userId}/${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
    const base64 = await readAsStringAsync(localUri, { encoding: 'base64' });
    const arrayBuffer = decode(base64);

    const { error } = await supabase.storage
      .from('card-images')
      .upload(fileName, arrayBuffer, { contentType: 'image/jpeg', upsert: true });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage.from('card-images').getPublicUrl(fileName);
    return publicUrl;
  } catch (error) {
    console.error('📸 [Upload] Hata:', error);
    return null; 
  }
};

// 2. YARDIMCI: Resim Silme
const deleteImageFromCloud = async (fullUrl: string | null) => {
  if (!fullUrl || !fullUrl.includes('card-images')) return;

  try {
    const bucketName = 'card-images';
    const path = fullUrl.split(`${bucketName}/`).pop();
    if (!path) return;

    const cleanPath = decodeURIComponent(path);
    await supabase.storage.from(bucketName).remove([cleanPath]);

  } catch (error) {
    console.error("Resim silme hatası:", error);
  }
};

export const checkHasPendingChanges = async (): Promise<boolean> => {
  let totalPending = 0;
  for (const table of Object.keys(TABLES)) {
    try {
      const result = await db.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) as count FROM ${table} WHERE sync_status != 'synced';`
      );
      if (result && result.count > 0) totalPending += result.count;
    } catch (e: any) {
      if (e.message && e.message.includes('no such table')) continue;
      console.error(`${table} kontrol hatası:`, e);
    }
  }
  const hasChanges = totalPending > 0;
  useSyncStore.getState().setHasPendingChanges(hasChanges);
  return hasChanges;
};

// 3. YEREL KULLANICIYI GARANTİLE
export const ensureLocalUserExists = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return null;

    const cloudId = session.user.id;
    const email = session.user.email;
    const name = session.user.user_metadata?.full_name || email?.split('@')[0];

    const existingUser = await db.getFirstAsync<User>(`SELECT * FROM users WHERE cloud_id = ?`, [cloudId]);
    if (existingUser) return existingUser.id;

    const now = new Date().toISOString();
    const result = await db.runAsync(
      `INSERT INTO users (cloud_id, name, email, last_modified, sync_status) VALUES (?, ?, ?, ?, 'synced')`,
      [cloudId, name, email, now]
    );
    return result.lastInsertRowId;
  } catch (error) {
    console.error("Yerel kullanıcı hatası:", error);
    return null;
  }
};

// --- PULL (İNDİRME) ---
const getLatestLocalUpdateTime = async (table: string): Promise<string | null> => {
    try {
        const result = await db.getFirstAsync<{ max_date: string }>(
            `SELECT MAX(last_modified) as max_date FROM ${table} WHERE sync_status = 'synced'`
        );
        return result?.max_date || null;
    } catch (e) { return null; }
};

const pullTable = async (table: string, userId: string, localUserId: number) => {
    const lastUpdate = await getLatestLocalUpdateTime(table);
    let query = supabase.from(table).select('*').eq('user_id', userId);
    if (lastUpdate) query = query.gt('last_modified', lastUpdate);

    const { data: cloudData, error } = await query;
    if (error) throw error;
    if (!cloudData || cloudData.length === 0) return;

    console.log(`⬇️ [PULL] ${table}: ${cloudData.length} kayıt`);

    for (const record of cloudData) {
        if (record.is_deleted) {
            await db.runAsync(`DELETE FROM ${table} WHERE cloud_id = ?`, [record.id]);
            continue;
        }

        if (table === 'decks') {
            await db.runAsync(`
                INSERT INTO decks (cloud_id, user_id, name, description, goal, created_at, last_modified, sync_status)
                VALUES (?, ?, ?, ?, ?, ?, ?, 'synced')
                ON CONFLICT(cloud_id) DO UPDATE SET
                name=excluded.name, description=excluded.description, goal=excluded.goal, last_modified=excluded.last_modified, sync_status='synced';
            `, [record.id, localUserId, record.name, record.description, record.goal, record.created_at, record.last_modified]);
        }
        else if (table === 'cards') {
            const localDeck = await db.getFirstAsync<{id: number}>(`SELECT id FROM decks WHERE cloud_id = ?`, [record.deck_id]);
            if (!localDeck) continue;
            await db.runAsync(`
                INSERT INTO cards (cloud_id, deck_id, front_word, front_image, back_word, back_image, rating, interval, ease_factor, next_review, created_at, last_modified, sync_status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced')
                ON CONFLICT(cloud_id) DO UPDATE SET
                front_word=excluded.front_word, front_image=excluded.front_image, back_word=excluded.back_word, back_image=excluded.back_image,
                interval=excluded.interval, ease_factor=excluded.ease_factor, next_review=excluded.next_review, last_modified=excluded.last_modified, sync_status='synced';
            `, [record.id, localDeck.id, record.front_word, record.front_image, record.back_word, record.back_image, record.rating, record.interval, record.ease_factor, record.next_review, record.created_at, record.last_modified]);
        }
        else if (table === 'statistics') {
             await db.runAsync(`
                INSERT INTO statistics (cloud_id, user_id, date, studied_card_count, added_card_count, learned_card_count, spent_time, practice_success_rate, deck_success_rate, last_modified, sync_status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced')
                ON CONFLICT(cloud_id) DO UPDATE SET
                studied_card_count=excluded.studied_card_count, added_card_count=excluded.added_card_count, spent_time=excluded.spent_time, last_modified=excluded.last_modified, sync_status='synced';
            `, [record.id, localUserId, record.date, record.studied_card_count, record.added_card_count, record.learned_card_count, record.spent_time, record.practice_success_rate, record.deck_success_rate, record.last_modified]);
        }
        else if (table === 'practices') {
            const localDeck = await db.getFirstAsync<{id: number}>(`SELECT id FROM decks WHERE cloud_id = ?`, [record.deck_id]);
            const deckIdToUse = localDeck ? localDeck.id : null;
             await db.runAsync(`
                INSERT INTO practices (cloud_id, user_id, deck_id, date, duration, success_rate, last_modified, sync_status)
                VALUES (?, ?, ?, ?, ?, ?, ?, 'synced')
                ON CONFLICT(cloud_id) DO UPDATE SET
                duration=excluded.duration, success_rate=excluded.success_rate, last_modified=excluded.last_modified, sync_status='synced';
            `, [record.id, localUserId, deckIdToUse, record.date, record.duration, record.success_rate, record.last_modified]);
        }
    }
};

// --- ANA SYNC MOTORU ---
export const runFullSync = async () => {
  const { isSyncing, setSyncing } = useSyncStore.getState();
  if (isSyncing) return;

  setSyncing(true);
  console.log("--- 🔄 Tam Senkronizasyon Başladı ---");

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;
    const userId = session.user.id;

    const localUserId = await ensureLocalUserExists();
    if (!localUserId) throw new Error("Yerel kullanıcı hatası");

    await performPushSync(userId);
    await pullFromCloud(userId, localUserId);

  } catch (error) {
    console.error("Sync Critical Error:", error);
  } finally {
    setSyncing(false);
    await checkHasPendingChanges();
    console.log("--- ✅ Senkronizasyon Bitti ---");
  }
};

async function pullFromCloud(userId: string, localUserId: number) {
    await pullTable('decks', userId, localUserId);
    await pullTable('cards', userId, localUserId);
    await pullTable('statistics', userId, localUserId);
    await pullTable('practices', userId, localUserId);
}

// --- PUSH (PARALEL / HIZLI) ---
async function performPushSync(userId: string) {
    const hasChanges = await checkHasPendingChanges();
    if (hasChanges) console.log("   > ⬆️ Veriler Buluta Gönderiliyor (PUSH)...");

    // A. Users
    const pendingUsers = await db.getAllAsync<User>(`SELECT * FROM users WHERE sync_status != 'synced' LIMIT 1;`);
    for (const user of pendingUsers) await syncRecord('users', user, userId, null); 

    // B. Decks
    const pendingDecks = await db.getAllAsync<Deck>(`SELECT * FROM decks WHERE sync_status != 'synced';`);
    for (const deck of pendingDecks) await syncRecord('decks', deck, userId, null);

    // C. Cards (Paralel İşleme)
    const pendingCards = await db.getAllAsync<Card>(`SELECT * FROM cards WHERE sync_status != 'synced';`);
    const CHUNK_SIZE = 5; 
    for (let i = 0; i < pendingCards.length; i += CHUNK_SIZE) {
        const chunk = pendingCards.slice(i, i + CHUNK_SIZE);
        await Promise.all(chunk.map(async (card) => {
            const parentDeck = await DeckRepo.getDeckById(card.deck_id);
            if (!parentDeck?.cloud_id) return;

            let frontUrl = card.front_image;
            let backUrl = card.back_image;

            if (frontUrl && frontUrl.startsWith('file://')) {
                const uploaded = await uploadImage(frontUrl, userId);
                if (uploaded) frontUrl = uploaded;
            }
            if (backUrl && backUrl.startsWith('file://')) {
                const uploaded = await uploadImage(backUrl, userId);
                if (uploaded) backUrl = uploaded;
            }

            const payload = { 
                ...card, 
                front_image: frontUrl, 
                back_image: backUrl,
                deck_cloud_id: parentDeck.cloud_id 
            };
            
            await syncRecord('cards', payload, userId, parentDeck.cloud_id);
        }));
    }

    // D. Statistics & Practices
    const pendingStats = await db.getAllAsync<Statistic>(`SELECT * FROM statistics WHERE sync_status != 'synced';`);
    await Promise.all(pendingStats.map(stat => syncRecord('statistics', stat, userId, null)));

    const pendingPractices = await db.getAllAsync<Practice>(`SELECT * FROM practices WHERE sync_status != 'synced';`);
    for (let i = 0; i < pendingPractices.length; i += 10) {
        const chunk = pendingPractices.slice(i, i + 10);
        await Promise.all(chunk.map(async (practice) => {
            const parentDeck = await DeckRepo.getDeckById(practice.deck_id);
            if(!parentDeck?.cloud_id) return;
            await syncRecord('practices', practice, userId, parentDeck.cloud_id);
        }));
    }
}

// TEKİL KAYIT İŞLEYİCİ
async function syncRecord(table: string, record: any, userId: string, parentCloudId: string | null) {
  const now = new Date().toISOString();
  try {
    const { id: localId, cloud_id, sync_status, deck_id, user_id, deck_cloud_id, ...payload } = record;
    const finalPayload: any = { ...payload, user_id: userId };

    if (table === 'cards') {
        if (finalPayload.easeFactor !== undefined) {
            finalPayload.ease_factor = finalPayload.easeFactor; delete finalPayload.easeFactor;
        }
        if (finalPayload.nextReview !== undefined) {
            finalPayload.next_review = finalPayload.nextReview; delete finalPayload.nextReview;
        }
        if (parentCloudId) finalPayload.deck_id = parentCloudId;
    }
    if (table === 'practices' && parentCloudId) finalPayload.deck_id = parentCloudId;
    if (table === 'users') finalPayload.id = userId;

    if (record.sync_status === 'pending_create') {
        const { data, error } = await supabase.from(table).insert(finalPayload).select('id').single();
        if (error) throw error;
        // Tip hatasını çözmek için data.id'yi string olarak algılaması için string template kullanabiliriz
        // veya updateLocalStatus fonksiyonunun imzasını kontrol edebiliriz.
        await updateLocalStatus(table, localId, data.id as string, now, finalPayload);
    }
    else if (record.sync_status === 'pending_update') {
        if (!cloud_id) return;
        const upsertData = { ...finalPayload, id: cloud_id, last_modified: now };
        const { error } = await supabase.from(table).upsert(upsertData);
        if (error) throw error;
        await updateLocalStatus(table, localId, null, now, null);
    }
    else if (record.sync_status === 'pending_delete') {
        if (cloud_id) {
            if (table === 'cards') {
                if (record.front_image) await deleteImageFromCloud(record.front_image);
                if (record.back_image) await deleteImageFromCloud(record.back_image);
            }
            else if (table === 'decks') {
                const cardsInDeck = await db.getAllAsync<Card>(`SELECT front_image, back_image FROM cards WHERE deck_id = ?`, [localId]);
                for (const card of cardsInDeck) {
                    if (card.front_image) await deleteImageFromCloud(card.front_image);
                    if (card.back_image) await deleteImageFromCloud(card.back_image);
                }
            }
            const { error } = await supabase.from(table).delete().eq('id', cloud_id);
            if (error) throw error;
        }
        await db.runAsync(`DELETE FROM ${table} WHERE id = ?`, [localId]);
    }
  } catch (error) {
    console.error(`Sync Error on ${table} #${record.id}:`, error);
  }
}

// 6. GÜNCELLEME YARDIMCISI
async function updateLocalStatus(table: string, localId: number, cloudId: string | null, now: string, payload: any) {
    let query = `UPDATE ${table} SET sync_status = 'synced', last_modified = ?`;
    const params: any[] = [now];
    
    if (cloudId) {
        query += `, cloud_id = ?`;
        params.push(cloudId);
    }
    
    if (table === 'cards' && payload) {
        query += `, front_image = ?, back_image = ?`;
        params.push(payload.front_image, payload.back_image);
    }

    query += ` WHERE id = ?`;
    params.push(localId);

    await db.runAsync(query, params);
}