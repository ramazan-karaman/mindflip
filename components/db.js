import SQLite from 'react-native-sqlite-storage';

SQLite.enablePromise(true);

const database_name = 'mindflip.db';
const database_version = '1.0';
const database_displayname = 'Mindflip Database';
const database_size = 200000;

export const getDBConnection = async () => {
  return SQLite.openDatabase(
    database_name,
    database_version,
    database_displayname,
    database_size
  );
};


export const createTables = async (db) => {
  // Kullanıcılar tablosu
  await db.executeSql(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    email TEXT,
    password TEXT,
    profile_photo TEXT
  );`);

  // Desteler tablosu
  await db.executeSql(`CREATE TABLE IF NOT EXISTS decks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    name TEXT,
    description TEXT,
    goal INTEGER,
    created_at TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );`);

  // Kartlar tablosu
  await db.executeSql(`CREATE TABLE IF NOT EXISTS cards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    deck_id INTEGER,
    front_word TEXT,
    front_image TEXT,
    back_word TEXT,
    back_image TEXT,
    rating TEXT,
    created_at TEXT,
    FOREIGN KEY(deck_id) REFERENCES decks(id)
  );`);

  // İstatistikler tablosu
  await db.executeSql(`CREATE TABLE IF NOT EXISTS statistics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    date TEXT,
    studied_card_count INTEGER,
    added_card_count INTEGER,
    learned_card_count INTEGER,
    spent_time INTEGER,
    practice_success_rate REAL,
    deck_success_rate REAL,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );`);

  // Pratikler tablosu
  await db.executeSql(`CREATE TABLE IF NOT EXISTS practices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    deck_id INTEGER,
    date TEXT,
    duration INTEGER,
    success_rate REAL,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(deck_id) REFERENCES decks(id)
  );`);
};


// USERS CRUD
export const insertUser = async (db, name, email, password, profile_photo) => {
  const query = `INSERT INTO users (name, email, password, profile_photo) VALUES (?, ?, ?, ?);`;
  await db.executeSql(query, [name, email, password, profile_photo]);
};

export const getUsers = async (db) => {
  const results = await db.executeSql('SELECT * FROM users;');
  const users = [];
  results.forEach(result => {
    for (let i = 0; i < result.rows.length; i++) {
      users.push(result.rows.item(i));
    }
  });
  return users;
};

export const updateUser = async (db, id, name, email, password, profile_photo) => {
  const query = `UPDATE users SET name=?, email=?, password=?, profile_photo=? WHERE id=?;`;
  await db.executeSql(query, [name, email, password, profile_photo, id]);
};

export const deleteUser = async (db, id) => {
  const query = `DELETE FROM users WHERE id=?;`;
  await db.executeSql(query, [id]);
};

// DECKS CRUD
export const insertDeck = async (db, user_id, name, description, goal, created_at) => {
  const query = `INSERT INTO decks (user_id, name, description, goal, created_at) VALUES (?, ?, ?, ?, ?);`;
  await db.executeSql(query, [user_id, name, description, goal, created_at]);
};

export const getDecks = async (db) => {
  const results = await db.executeSql('SELECT * FROM decks;');
  const decks = [];
  results.forEach(result => {
    for (let i = 0; i < result.rows.length; i++) {
      decks.push(result.rows.item(i));
    }
  });
  return decks;
};

export const updateDeck = async (db, id, name, description, goal) => {
  const query = `UPDATE decks SET name=?, description=?, goal=? WHERE id=?;`;
  await db.executeSql(query, [name, description, goal, id]);
};

export const deleteDeck = async (db, id) => {
  const query = `DELETE FROM decks WHERE id=?;`;
  await db.executeSql(query, [id]);
};

// CARDS CRUD
export const insertCard = async (db, deck_id, front_word, front_image, back_word, back_image, rating, created_at) => {
  const query = `INSERT INTO cards (deck_id, front_word, front_image, back_word, back_image, rating, created_at) VALUES (?, ?, ?, ?, ?, ?, ?);`;
  await db.executeSql(query, [deck_id, front_word, front_image, back_word, back_image, rating, created_at]);
};

export const getCards = async (db, deck_id) => {
  const results = await db.executeSql('SELECT * FROM cards WHERE deck_id=?;', [deck_id]);
  const cards = [];
  results.forEach(result => {
    for (let i = 0; i < result.rows.length; i++) {
      cards.push(result.rows.item(i));
    }
  });
  return cards;
};

export const updateCard = async (db, id, front_word, front_image, back_word, back_image, rating) => {
  const query = `UPDATE cards SET front_word=?, front_image=?, back_word=?, back_image=?, rating=? WHERE id=?;`;
  await db.executeSql(query, [front_word, front_image, back_word, back_image, rating, id]);
};

export const deleteCard = async (db, id) => {
  const query = `DELETE FROM cards WHERE id=?;`;
  await db.executeSql(query, [id]);
};

// STATISTICS CRUD
export const insertStatistic = async (db, user_id, date, studied_card_count, added_card_count, learned_card_count, spent_time, practice_success_rate, deck_success_rate) => {
  const query = `INSERT INTO statistics (user_id, date, studied_card_count, added_card_count, learned_card_count, spent_time, practice_success_rate, deck_success_rate) VALUES (?, ?, ?, ?, ?, ?, ?, ?);`;
  await db.executeSql(query, [user_id, date, studied_card_count, added_card_count, learned_card_count, spent_time, practice_success_rate, deck_success_rate]);
};

export const getStatistics = async (db, user_id) => {
  const results = await db.executeSql('SELECT * FROM statistics WHERE user_id=?;', [user_id]);
  const stats = [];
  results.forEach(result => {
    for (let i = 0; i < result.rows.length; i++) {
      stats.push(result.rows.item(i));
    }
  });
  return stats;
};

export const updateStatistic = async (db, id, studied_card_count, added_card_count, learned_card_count, spent_time, practice_success_rate, deck_success_rate) => {
  const query = `UPDATE statistics SET studied_card_count=?, added_card_count=?, learned_card_count=?, spent_time=?, practice_success_rate=?, deck_success_rate=? WHERE id=?;`;
  await db.executeSql(query, [studied_card_count, added_card_count, learned_card_count, spent_time, practice_success_rate, deck_success_rate, id]);
};

export const deleteStatistic = async (db, id) => {
  const query = `DELETE FROM statistics WHERE id=?;`;
  await db.executeSql(query, [id]);
};

// PRACTICES CRUD
export const insertPractice = async (db, user_id, deck_id, date, duration, success_rate) => {
  const query = `INSERT INTO practices (user_id, deck_id, date, duration, success_rate) VALUES (?, ?, ?, ?, ?);`;
  await db.executeSql(query, [user_id, deck_id, date, duration, success_rate]);
};

export const getPractices = async (db, user_id) => {
  const results = await db.executeSql('SELECT * FROM practices WHERE user_id=?;', [user_id]);
  const practices = [];
  results.forEach(result => {
    for (let i = 0; i < result.rows.length; i++) {
      practices.push(result.rows.item(i));
    }
  });
  return practices;
};

export const updatePractice = async (db, id, duration, success_rate) => {
  const query = `UPDATE practices SET duration=?, success_rate=? WHERE id=?;`;
  await db.executeSql(query, [duration, success_rate, id]);
};

export const deletePractice = async (db, id) => {
  const query = `DELETE FROM practices WHERE id=?;`;
  await db.executeSql(query, [id]);
};
