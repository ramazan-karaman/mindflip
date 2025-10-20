import { db } from '../db/index';

export const insertUser = async (name, email, password, profile_photo) => {
  const query = `INSERT INTO users (name, email, password, profile_photo) VALUES (?, ?, ?, ?);`;
  try {
    const result = await db.runAsync(query, [name, email, password, profile_photo]);
    console.log(`Kullanıcı oluşturuldu: ${result.lastInsertRowId}`);
    return result;
  } catch (error) {
    console.error("Kullanıcı eklenirken hata oluştu:", error);
    throw error;
  }
};

export const getUsers = async () => {
  const query = `SELECT * FROM users;`;
  try {
    const allRows = await db.getAllAsync(query);
    return allRows;
  } catch (error) {
    console.error("Kullanıcılar alınırken hata oluştu:", error);
    throw error;
  }
};

export const updateUser = async (id, name, email, password, profile_photo) => {
  const query = `UPDATE users SET name=?, email=?, password=?, profile_photo=? WHERE id=?;`;
  try {
    const result = await db.runAsync(query, [name, email, password, profile_photo, id]);
    console.log(`Kullanıcı ${id} güncellendi. Değişiklikler: ${result.changes}`);
    return result;
  } catch (error) {
    console.error("Kullanıcı güncellenirken hata oluştu:", error);
    throw error;
  }
};

export const deleteUser = async (id) => {
  const query = `DELETE FROM users WHERE id=?;`;
  try {
    const result = await db.runAsync(query, [id]);
    console.log(`Kullanıcı ${id} silindi. Değişiklikler: ${result.changes}`);
    return result;
  } catch (error) {
    console.error("Kullanıcı silinirken hata oluştu:", error);
    throw error;
  }
};