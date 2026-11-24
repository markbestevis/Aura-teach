// database/messages.js
// Lightweight file-based storage for contact form submissions.
// No native dependencies (keeps deployment simple on any host).

const fs   = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'messages.json');

function readAll() {
  if (!fs.existsSync(DB_FILE)) return [];
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    return raw.trim() ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeAll(messages) {
  fs.writeFileSync(DB_FILE, JSON.stringify(messages, null, 2));
}

function addMessage({ name, email, message }) {
  const messages = readAll();
  const entry = {
    id:        Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    name,
    email,
    message,
    createdAt: new Date().toISOString(),
    read:      false,
  };
  messages.push(entry);
  writeAll(messages);
  return entry;
}

function getAllMessages() {
  return readAll().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function markRead(id) {
  const messages = readAll();
  const msg = messages.find(m => m.id === id);
  if (msg) { msg.read = true; writeAll(messages); }
  return msg || null;
}

module.exports = { addMessage, getAllMessages, markRead };
