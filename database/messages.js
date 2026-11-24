// database/messages.js
const fs   = require('fs');
const path = require('path');

const DB_FILE       = path.join(__dirname, 'messages.json');
const WAITLIST_FILE = path.join(__dirname, 'waitlist.json');

function readJson(file) {
  if (!fs.existsSync(file)) return [];
  try {
    const raw = fs.readFileSync(file, 'utf8');
    return raw.trim() ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ── Contact Messages ──────────────────────────────────────────────────────────
function addMessage({ name, email, service = 'General', budget = 'Not specified', message }) {
  const messages = readJson(DB_FILE);
  const entry = {
    id: generateId(),
    name,
    email,
    service,
    budget,
    message,
    createdAt: new Date().toISOString(),
    read: false,
  };
  messages.push(entry);
  writeJson(DB_FILE, messages);
  return entry;
}

function getAllMessages() {
  return readJson(DB_FILE).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function markRead(id) {
  const messages = readJson(DB_FILE);
  const msg = messages.find(m => m.id === id);
  if (msg) {
    msg.read = true;
    writeJson(DB_FILE, messages);
  }
  return msg || null;
}

function deleteMessage(id) {
  const messages = readJson(DB_FILE);
  const filtered = messages.filter(m => m.id !== id);
  if (filtered.length !== messages.length) {
    writeJson(DB_FILE, filtered);
    return true;
  }
  return false;
}

// ── Product Waitlist ──────────────────────────────────────────────────────────
function addWaitlist({ email, product }) {
  const list = readJson(WAITLIST_FILE);
  const exists = list.find(item => item.email.toLowerCase() === email.toLowerCase() && item.product === product);
  if (exists) return { entry: exists, duplicate: true };

  const entry = {
    id: generateId(),
    email,
    product,
    createdAt: new Date().toISOString(),
  };
  list.push(entry);
  writeJson(WAITLIST_FILE, list);
  return { entry, duplicate: false };
}

function getAllWaitlist() {
  return readJson(WAITLIST_FILE).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

module.exports = {
  addMessage,
  getAllMessages,
  markRead,
  deleteMessage,
  addWaitlist,
  getAllWaitlist,
};
