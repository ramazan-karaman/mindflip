import { SQLiteRunResult } from 'expo-sqlite';
import { db } from '../db';
import { User } from '../types';

export const createUser = async (
  name: string | null, 
  email: string | null, 
  password: string | null,
  profile_photo: string | null
): Promise<User | null> => {

  const now = new Date().toISOString();
  const query = `
    INSERT INTO users (
      name, email, password, profile_photo, 
      last_modified, sync_status
    ) VALUES (?, ?, ?, ?, ?, 'pending_create');
  `;
  
  try {
    const result = await db.runAsync(query, [name, email, password, profile_photo, now]);
    
    console.log(`Kullanıcı oluşturuldu: ID ${result.lastInsertRowId}`);
    return getUserById(result.lastInsertRowId);

  } catch (error) {
    console.error("Kullanıcı eklenirken hata oluştu:", error);
    throw error;
  }
};

export const getUserById = async (id: number): Promise<User | null> => {
  const query = `SELECT * FROM users WHERE id = ? AND sync_status != 'pending_delete';`;
  try {
    const user = await db.getFirstAsync<User>(query, [id]);
    return user ?? null;
  } catch (error) {
    console.error(`Kullanıcı ${id} alınırken hata:`, error);
    throw error;
  }
};

export const getUsers = async (): Promise<User[]> => {
  const query = `
    SELECT * FROM users 
    WHERE sync_status != 'pending_delete';
  `;
  try {
    const allRows = await db.getAllAsync<User>(query);
    return allRows;
  } catch (error) {
    console.error("Kullanıcılar alınırken hata oluştu:", error);
    throw error;
  }
};

export const updateUser = async (
  id: number, 
  name: string | null, 
  email: string | null, 
  password: string | null,
  profile_photo: string | null
): Promise<SQLiteRunResult> => {
  
  const now = new Date().toISOString();
  const query = `
    UPDATE users SET 
      name = ?, 
      email = ?, 
      password = ?, 
      profile_photo = ?,
      last_modified = ?,
      sync_status = CASE 
                      WHEN sync_status = 'pending_create' THEN 'pending_create' 
                      ELSE 'pending_update' 
                    END
    WHERE id = ?;
  `;
  
  try {
    const result = await db.runAsync(query, [name, email, password, profile_photo, now, id]);
    console.log(`Kullanıcı ${id} güncellendi.`);
    return result;
  } catch (error) {
    console.error(`Kullanıcı ${id} güncellenirken hata:`, error);
    throw error;
  }
};

export const deleteUser = async (id: number): Promise<SQLiteRunResult> => {
  const now = new Date().toISOString();
  const query = `
    UPDATE users 
    SET 
      sync_status = 'pending_delete',
      last_modified = ?
    WHERE id = ?;
  `;
  try {
    const result = await db.runAsync(query, [now, id]);
    console.log(`Kullanıcı ${id} silinmek üzere işaretlendi (soft delete).`);
    return result;
  } catch (error) {
    console.error(`Kullanıcı ${id} silinirken hata:`, error);
    throw error;
  }
};