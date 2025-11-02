import { SQLiteRunResult } from 'expo-sqlite';
import { db } from '../db';
import { Deck, DeckWithCardCount } from '../types';

export const createDeck= async(
    user_id: number,
    name: string,
    description: string | null,
    goal: number | null
): Promise<Deck | null> =>{
    const now = new Date().toISOString();
    const query= `INSERT INTO decks (user_id, name, description, goal, created_at, last_modified, sync_status)
    VALUES (?,?,?,?,?,?, 'pending_create');`;

    try{
        const result= await db.runAsync(query, [user_id, name, description, goal,now, now]);
            console.log(`Deste oluşturuldu: ID ${result.lastInsertRowId}`);
            return getDeckById(result.lastInsertRowId);
    }catch(error){
        console.error(`Deste ${name} oluşturulurken hata:`,error);
        throw error;
    }
};

export const getDecks = async (): Promise<DeckWithCardCount[]> =>{
    const query= `
    SELECT d.*, (SELECT COUNT(c.id) FROM cards c WHERE c.deck_id = d.id) as cardCount 
    FROM decks d 
    WHERE d.sync_status != 'pending_delete'
    ORDER BY d.name ASC;`;

    try{
        const result = await db.getAllAsync<DeckWithCardCount>(query);
        return result;
    }catch(error){
        console.error(`Desteler alınırken hata oluştu:`,error);
        throw error;
    }
};

export const getDeckById = async (id: number): Promise<Deck | null> => {
    const query= `SELECT * FROM decks WHERE id = ? AND sync_status != 'pending_delete';`;
    try{
        const result= await db.getFirstAsync<Deck>(query, [id]);
        console.log(`Deste ${id} alındı.`);
        return result ?? null;
    }catch(error){
        console.error(`Deste ${id} alınırken hata:`,error);
        throw error;
    }
};

export const updateDeck = async(
    id: number,
    name: string,
    description: string | null,
    goal: number | null
): Promise<SQLiteRunResult> =>{
    const now= new Date().toISOString();
    const query= `
    UPDATE decks SET name= ?, description = ?, 
      goal = ?, 
      last_modified = ?, 
      sync_status = CASE WHEN sync_status = 'pending_create' THEN 'pending_create' 
        ELSE 'pending_update' END WHERE id = ?;`;

        try{
            const result= await db.runAsync(query, [name, description, goal, now, id]);
            console.log(`Deste ${id} güncellendi. Etkilenen satır: ${result.changes}`);
            return result;
        }catch(error){
            console.error(`Deste ${id} güncellenirken hata:`,error);
            throw error;
        }
};

export const deleteDeck= async (id: number): Promise<SQLiteRunResult> =>{
    const now= new Date().toISOString();
    const query= `UPDATE decks 
    SET sync_status = 'pending_delete', last_modified = ? WHERE id = ?;`;

    try{
        const result= await db.runAsync(query, [now,id]);
        console.log(`Deste ${id} silinmek üzere işaretlendi.`);
        return result;

    }catch(error){
        console.error(`Deste ${id} silinirken hata:`, error);
        throw error;
    }
}


