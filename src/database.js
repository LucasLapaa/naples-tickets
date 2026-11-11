'use strict';

const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');

const defaultPath = path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH || path.join(process.cwd(), 'data'), 'naples.sqlite');
const file = process.env.DATABASE_PATH || defaultPath;
fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
const db = new Database(file);
db.pragma('journal_mode = WAL');
db.pragma('busy_timeout = 5000');
db.exec(`
  CREATE TABLE IF NOT EXISTS guild_settings (
    guild_id TEXT PRIMARY KEY,
    configured INTEGER NOT NULL DEFAULT 0,
    counter INTEGER NOT NULL DEFAULT 0,
    role_suporte TEXT, role_vendas TEXT, role_duvidas TEXT,
    category_suporte TEXT, category_vendas TEXT, category_duvidas TEXT,
    log_channel TEXT
  );
  CREATE TABLE IF NOT EXISTS tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    number INTEGER NOT NULL,
    channel_id TEXT NOT NULL UNIQUE,
    owner_id TEXT NOT NULL,
    type TEXT NOT NULL,
    topic TEXT NOT NULL,
    details TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    claimed_by TEXT,
    controls_message_id TEXT,
    created_at TEXT NOT NULL,
    closed_at TEXT,
    deleted_at TEXT,
    rating INTEGER,
    UNIQUE (guild_id, number)
  );
  CREATE INDEX IF NOT EXISTS idx_tickets_owner ON tickets (guild_id, owner_id, status);
  CREATE INDEX IF NOT EXISTS idx_tickets_channel ON tickets (channel_id);
`);

const selectSetting = db.prepare('SELECT * FROM guild_settings WHERE guild_id = ?');
const insertSetting = db.prepare('INSERT OR IGNORE INTO guild_settings (guild_id) VALUES (?)');
const settingsColumns = new Set([
  'configured', 'role_suporte', 'role_vendas', 'role_duvidas',
  'category_suporte', 'category_vendas', 'category_duvidas', 'log_channel'
]);

function getSettings(guildId) {
  insertSetting.run(guildId);
  return selectSetting.get(guildId);
}
function saveSettings(guildId, updates) {
  getSettings(guildId);
  const keys = Object.keys(updates).filter(k => settingsColumns.has(k));
  if (!keys.length) return getSettings(guildId);
  const q = `UPDATE guild_settings SET ${keys.map(k => `${k} = ?`).join(', ')} WHERE guild_id = ?`;
  db.prepare(q).run(...keys.map(k => updates[k]), guildId);
  return getSettings(guildId);
}
const nextNumber = db.transaction(guildId => {
  getSettings(guildId);
  db.prepare('UPDATE guild_settings SET counter = counter + 1 WHERE guild_id = ?').run(guildId);
  return selectSetting.get(guildId).counter;
});

function addTicket(data) {
  const now = new Date().toISOString();
  const result = db.prepare(`
    INSERT INTO tickets (guild_id, number, channel_id, owner_id, type, topic, details, created_at)
    VALUES (@guild_id, @number, @channel_id, @owner_id, @type, @topic, @details, @created_at)
  `).run({ ...data, created_at: now });
  return getTicketById(result.lastInsertRowid);
}
function getTicketById(id) { return db.prepare('SELECT * FROM tickets WHERE id = ?').get(id); }
function getTicketByChannel(id) { return db.prepare('SELECT * FROM tickets WHERE channel_id = ?').get(id); }
function getOpenTicket(guildId, ownerId) {
  return db.prepare(`SELECT * FROM tickets WHERE guild_id = ? AND owner_id = ? AND status = 'open' ORDER BY id DESC LIMIT 1`).get(guildId, ownerId);
}
function setControls(id, messageId) {
  db.prepare('UPDATE tickets SET controls_message_id = ? WHERE id = ?').run(messageId, id);
}
function claim(id, userId) {
  return db.prepare(`UPDATE tickets SET claimed_by = ? WHERE id = ? AND status = 'open' AND claimed_by IS NULL`).run(userId, id).changes > 0;
}
function release(id, userId, isAdmin) {
  const statement = isAdmin
    ? `UPDATE tickets SET claimed_by = NULL WHERE id = ? AND status = 'open'`
    : `UPDATE tickets SET claimed_by = NULL WHERE id = ? AND status = 'open' AND claimed_by = ?`;
  return db.prepare(statement).run(...(isAdmin ? [id] : [id, userId])).changes > 0;
}
function close(id) {
  return db.prepare(`UPDATE tickets SET status = 'closed', closed_at = ? WHERE id = ? AND status = 'open'`)
    .run(new Date().toISOString(), id).changes > 0;
}
function reopen(id) {
  return db.prepare(`UPDATE tickets SET status = 'open', closed_at = NULL, rating = NULL WHERE id = ? AND status = 'closed'`)
    .run(id).changes > 0;
}
function markDeleted(id) {
  return db.prepare(`UPDATE tickets SET status = 'deleted', deleted_at = ? WHERE id = ? AND status != 'deleted'`)
    .run(new Date().toISOString(), id).changes > 0;
}
function rate(id, userId, stars) {
  return db.prepare(`UPDATE tickets SET rating = ? WHERE id = ? AND owner_id = ? AND status IN ('closed','deleted') AND rating IS NULL`)
    .run(stars, id, userId).changes > 0;
}
module.exports = {
  db, getSettings, saveSettings, nextNumber, addTicket, getTicketById,
  getTicketByChannel, getOpenTicket, setControls, claim, release, close,
  reopen, markDeleted, rate
};
