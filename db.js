const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'board_storage.sqlite');
const db = new Database(dbPath);

// Configurar pragmas para máximo rendimiento y consistencia WAL
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');

// Inicializar esquemas de la base de datos
db.exec(`
  CREATE TABLE IF NOT EXISTS rooms (
    room_id TEXT PRIMARY KEY,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS elements (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL,
    type TEXT NOT NULL,
    data TEXT NOT NULL,
    clock INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (room_id) REFERENCES rooms(room_id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_elements_room ON elements(room_id);
`);

// Prepared Statements para alta velocidad
const insertRoomStmt = db.prepare(`
  INSERT INTO rooms (room_id, created_at, updated_at)
  VALUES (?, ?, ?)
  ON CONFLICT(room_id) DO UPDATE SET updated_at = excluded.updated_at;
`);

const getSceneStmt = db.prepare(`
  SELECT id, type, data, clock FROM elements
  WHERE room_id = ?
  ORDER BY created_at ASC;
`);

const upsertElementStmt = db.prepare(`
  INSERT INTO elements (id, room_id, type, data, clock, created_at)
  VALUES (?, ?, ?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET
    data = excluded.data,
    clock = excluded.clock,
    type = excluded.type;
`);

const deleteElementStmt = db.prepare(`
  DELETE FROM elements WHERE room_id = ? AND id = ?;
`);

const deleteAllElementsStmt = db.prepare(`
  DELETE FROM elements WHERE room_id = ?;
`);

/**
 * dbStorage API Autoritativa
 */
const dbStorage = {
  ensureRoom(roomId) {
    const now = Date.now();
    insertRoomStmt.run(roomId, now, now);
  },

  getScene(roomId) {
    this.ensureRoom(roomId);
    const rows = getSceneStmt.all(roomId);
    return rows.map((row) => {
      try {
        return JSON.parse(row.data);
      } catch (err) {
        return null;
      }
    }).filter(Boolean);
  },

  saveElement(roomId, element, clock = 0) {
    if (!roomId || !element || !element.id) return;
    this.ensureRoom(roomId);
    const now = Date.now();
    const type = element.type || 'stroke';
    const dataStr = JSON.stringify(element);
    upsertElementStmt.run(element.id, roomId, type, dataStr, clock, now);
  },

  saveBatch(roomId, elements, clock = 0) {
    if (!roomId || !Array.isArray(elements)) return;
    this.ensureRoom(roomId);
    const now = Date.now();

    const insertMany = db.transaction((items) => {
      for (const el of items) {
        if (!el || !el.id) continue;
        const type = el.type || 'stroke';
        const dataStr = JSON.stringify(el);
        upsertElementStmt.run(el.id, roomId, type, dataStr, clock, now);
      }
    });

    insertMany(elements);
  },

  replaceScene(roomId, elements, clock = 0) {
    if (!roomId || !Array.isArray(elements)) return;
    this.ensureRoom(roomId);
    const now = Date.now();

    const transaction = db.transaction((items) => {
      deleteAllElementsStmt.run(roomId);
      for (const el of items) {
        if (!el || !el.id) continue;
        const type = el.type || 'stroke';
        const dataStr = JSON.stringify(el);
        upsertElementStmt.run(el.id, roomId, type, dataStr, clock, now);
      }
    });

    transaction(elements);
  },

  deleteElement(roomId, elementId) {
    if (!roomId || !elementId) return;
    deleteElementStmt.run(roomId, elementId);
  },

  clearScene(roomId) {
    if (!roomId) return;
    deleteAllElementsStmt.run(roomId);
  }
};

module.exports = dbStorage;
