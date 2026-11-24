const express = require('express');
const path = require('path');
const { addMessage, getAllMessages, markRead } = require('./database/messages');

const app = express();

const PORT = process.env.PORT || 3000;
const ADMIN_KEY = process.env.ADMIN_KEY || 'changeme';

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Simple in-memory rate limit: max 5 submissions per IP per 10 minutes
const submitLog = new Map();
function isRateLimited(ip) {
    const now = Date.now();
    const windowMs = 10 * 60 * 1000;
    const timestamps = (submitLog.get(ip) || []).filter(t => now - t < windowMs);
    timestamps.push(now);
    submitLog.set(ip, timestamps);
    return timestamps.length > 5;
}

// ── Contact form submission ──────────────────────────────────────────────────
app.post('/api/contact', (req, res) => {
    const { name, email, message } = req.body || {};

    if (!name || !email || !message) {
        return res.status(400).json({ ok: false, error: 'Name, email and message are all required.' });
    }
    if (name.length > 100 || email.length > 150 || message.length > 2000) {
        return res.status(400).json({ ok: false, error: 'One of the fields is too long.' });
    }
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
        return res.status(400).json({ ok: false, error: 'Please enter a valid email address.' });
    }

    const ip = req.ip || req.connection.remoteAddress;
    if (isRateLimited(ip)) {
        return res.status(429).json({ ok: false, error: 'Too many messages sent. Please try again later.' });
    }

    const entry = addMessage({
        name:    name.trim(),
        email:   email.trim(),
        message: message.trim(),
    });

    console.log(`[contact] New message from ${entry.email} (${entry.id})`);
    res.json({ ok: true, message: 'Message received. We will get back to you soon.' });
});

// ── Simple admin view to read messages (protected by a key) ─────────────────
app.get('/admin/messages', (req, res) => {
    if (req.query.key !== ADMIN_KEY) {
        return res.status(403).send('Forbidden. Add ?key=YOUR_ADMIN_KEY to the URL.');
    }
    const messages = getAllMessages();
    const rows = messages.map(m => `
        <tr style="border-bottom:1px solid #222;${m.read ? 'opacity:.5' : ''}">
            <td style="padding:10px">${m.read ? '' : '●'}</td>
            <td style="padding:10px">${escapeHtml(m.name)}</td>
            <td style="padding:10px">${escapeHtml(m.email)}</td>
            <td style="padding:10px;max-width:400px">${escapeHtml(m.message)}</td>
            <td style="padding:10px;color:#999;font-size:12px">${new Date(m.createdAt).toLocaleString()}</td>
            <td style="padding:10px"><a href="/admin/messages/read?id=${m.id}&key=${ADMIN_KEY}" style="color:#D4AF37">mark read</a></td>
        </tr>`).join('');

    res.send(`
        <html><head><title>AURA TECH — Messages</title></head>
        <body style="background:#080808;color:#fff;font-family:sans-serif;padding:30px">
            <h1 style="color:#D4AF37">Contact Messages (${messages.length})</h1>
            <table style="width:100%;border-collapse:collapse">
                <tr style="text-align:left;color:#D4AF37"><th></th><th>Name</th><th>Email</th><th>Message</th><th>Date</th><th></th></tr>
                ${rows || '<tr><td style="padding:20px;color:#999">No messages yet.</td></tr>'}
            </table>
        </body></html>
    `);
});

app.get('/admin/messages/read', (req, res) => {
    if (req.query.key !== ADMIN_KEY) return res.status(403).send('Forbidden.');
    markRead(req.query.id);
    res.redirect(`/admin/messages?key=${ADMIN_KEY}`);
});

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log('================================');
    console.log('       AURA TECH SERVER');
    console.log('================================');
    console.log(`Server running on port ${PORT}`);
});