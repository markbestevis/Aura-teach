const express = require('express');
const path = require('path');
const {
    addMessage,
    getAllMessages,
    markRead,
    deleteMessage,
    addWaitlist,
    getAllWaitlist
} = require('./database/messages');

const app = express();

const PORT = process.env.PORT || 3000;
const ADMIN_KEY = process.env.ADMIN_KEY || 'changeme';

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Rate limiter: max 8 submissions per IP per 10 minutes
const submitLog = new Map();
function isRateLimited(ip) {
    const now = Date.now();
    const windowMs = 10 * 60 * 1000;
    const timestamps = (submitLog.get(ip) || []).filter(t => now - t < windowMs);
    timestamps.push(now);
    submitLog.set(ip, timestamps);
    return timestamps.length > 8;
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ── Contact Form API ─────────────────────────────────────────────────────────
app.post('/api/contact', (req, res) => {
    const { name, email, service, budget, message } = req.body || {};

    if (!name || !email || !message) {
        return res.status(400).json({ ok: false, error: 'Name, email, and project details are required.' });
    }
    if (name.length > 100 || email.length > 150 || message.length > 2000) {
        return res.status(400).json({ ok: false, error: 'One of the fields exceeds the maximum length.' });
    }
    if (!emailPattern.test(email)) {
        return res.status(400).json({ ok: false, error: 'Please enter a valid email address.' });
    }

    const ip = req.ip || req.connection.remoteAddress;
    if (isRateLimited(ip)) {
        return res.status(429).json({ ok: false, error: 'Too many requests. Please try again in a few minutes.' });
    }

    const entry = addMessage({
        name: name.trim(),
        email: email.trim(),
        service: (service || 'General Inquiry').trim().slice(0, 60),
        budget: (budget || 'Not specified').trim().slice(0, 60),
        message: message.trim(),
    });

    console.log(`[contact] Inquiry from ${entry.email} (${entry.service})`);
    res.json({ ok: true, message: 'Thank you! Your project inquiry has been received.' });
});

// ── Product Waitlist API ─────────────────────────────────────────────────────
app.post('/api/waitlist', (req, res) => {
    const { email, product } = req.body || {};

    if (!email || !product) {
        return res.status(400).json({ ok: false, error: 'Email and product selection are required.' });
    }
    if (!emailPattern.test(email)) {
        return res.status(400).json({ ok: false, error: 'Please enter a valid email address.' });
    }

    const ip = req.ip || req.connection.remoteAddress;
    if (isRateLimited(ip)) {
        return res.status(429).json({ ok: false, error: 'Too many requests. Please try again later.' });
    }

    const result = addWaitlist({
        email: email.trim(),
        product: product.trim().slice(0, 80),
    });

    if (result.duplicate) {
        return res.json({ ok: true, message: `You are already on the priority list for ${product}!` });
    }

    console.log(`[waitlist] ${email} joined ${product}`);
    res.json({ ok: true, message: `You're in! We will notify you when ${product} launches.` });
});

// ── Admin Command Center ─────────────────────────────────────────────────────
app.get(['/admin', '/admin/messages'], (req, res) => {
    if (req.query.key !== ADMIN_KEY) {
        return res.status(403).send(`
            <html><head><title>AURA TECH — Admin Login</title></head>
            <body style="background:#080808;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">
                <form method="GET" action="/admin" style="background:#111;padding:40px;border-radius:12px;border:1px solid #333;text-align:center;max-width:360px;width:90%">
                    <h2 style="color:#D4AF37;margin-top:0;letter-spacing:2px">AURA ADMIN</h2>
                    <p style="color:#999;font-size:14px">Enter your admin access key to view inquiries.</p>
                    <input type="password" name="key" placeholder="Admin Key" required style="width:100%;padding:12px;margin:15px 0;background:#080808;border:1px solid #444;color:#fff;border-radius:6px">
                    <button type="submit" style="width:100%;padding:12px;background:#D4AF37;color:#080808;font-weight:bold;border:none;border-radius:6px;cursor:pointer">Unlock Dashboard</button>
                </form>
            </body></html>
        `);
    }

    const messages = getAllMessages();
    const waitlist = getAllWaitlist();
    const unreadCount = messages.filter(m => !m.read).length;

    const messageRows = messages.map(m => `
        <tr class="msg-row ${m.read ? 'is-read' : 'is-unread'}" data-search="${escapeHtml((m.name + ' ' + m.email + ' ' + m.service + ' ' + m.message).toLowerCase())}">
            <td>${m.read ? '<span class="badge read">Read</span>' : '<span class="badge unread">New</span>'}</td>
            <td><strong>${escapeHtml(m.name)}</strong><br><a href="mailto:${escapeHtml(m.email)}" style="color:#D4AF37;font-size:12px">${escapeHtml(m.email)}</a></td>
            <td><span class="tag">${escapeHtml(m.service || 'General')}</span><br><small style="color:#888">${escapeHtml(m.budget || '')}</small></td>
            <td style="max-width:380px;line-height:1.5">${escapeHtml(m.message)}</td>
            <td style="color:#888;font-size:12px;white-space:nowrap">${new Date(m.createdAt).toLocaleString()}</td>
            <td style="white-space:nowrap">
                ${!m.read ? `<a class="action-btn" href="/admin/messages/read?id=${m.id}&key=${ADMIN_KEY}">Mark Read</a>` : ''}
                <a class="action-btn danger" href="/admin/messages/delete?id=${m.id}&key=${ADMIN_KEY}" onclick="return confirm('Delete this inquiry?')">Delete</a>
            </td>
        </tr>
    `).join('');

    const waitlistRows = waitlist.map(w => `
        <tr>
            <td><strong>${escapeHtml(w.email)}</strong></td>
            <td><span class="tag">${escapeHtml(w.product)}</span></td>
            <td style="color:#888;font-size:12px">${new Date(w.createdAt).toLocaleString()}</td>
        </tr>
    `).join('');

    res.send(`
        <!DOCTYPE html>
        <html><head><title>AURA TECH — Command Center</title>
        <style>
            body { background:#080808; color:#fff; font-family:system-ui,sans-serif; margin:0; padding:30px; }
            .wrap { max-width:1200px; margin:auto; }
            .topbar { display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:15px; border-bottom:1px solid #222; padding-bottom:20px; margin-bottom:25px; }
            h1 { color:#D4AF37; margin:0; font-size:24px; letter-spacing:1px; }
            .stats { display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:15px; margin-bottom:25px; }
            .stat-card { background:#111; border:1px solid #222; padding:20px; border-radius:10px; }
            .stat-card small { color:#888; text-transform:uppercase; font-size:11px; letter-spacing:1px; }
            .stat-card div { font-size:28px; font-weight:bold; color:#D4AF37; margin-top:5px; }
            .controls { display:flex; gap:10px; margin-bottom:20px; flex-wrap:wrap; }
            input[type="text"] { background:#111; border:1px solid #333; color:#fff; padding:10px 14px; border-radius:6px; min-width:260px; }
            .tab-btn { background:#111; border:1px solid #333; color:#ccc; padding:10px 16px; border-radius:6px; cursor:pointer; }
            .tab-btn.active { background:#D4AF37; color:#080808; border-color:#D4AF37; font-weight:bold; }
            table { width:100%; border-collapse:collapse; background:#111; border-radius:10px; overflow:hidden; }
            th, td { padding:14px; text-align:left; border-bottom:1px solid #1e1e1e; font-size:14px; }
            th { background:#161616; color:#D4AF37; font-size:12px; text-transform:uppercase; letter-spacing:1px; }
            .is-read { opacity:0.65; }
            .badge { padding:3px 8px; border-radius:4px; font-size:11px; font-weight:bold; }
            .badge.unread { background:rgba(212,175,55,0.2); color:#D4AF37; }
            .badge.read { background:#222; color:#888; }
            .tag { background:#1d1d1d; border:1px solid #333; padding:3px 8px; border-radius:4px; font-size:12px; color:#eee; }
            .action-btn { color:#D4AF37; text-decoration:none; font-size:12px; margin-right:10px; }
            .action-btn.danger { color:#ff5f5f; }
        </style>
        </head>
        <body>
            <div class="wrap">
                <div class="topbar">
                    <h1>AURA TECH // COMMAND CENTER</h1>
                    <div>
                        <a href="/admin/export?key=${ADMIN_KEY}" style="background:#111;border:1px solid #D4AF37;color:#D4AF37;padding:8px 14px;border-radius:6px;text-decoration:none;font-size:13px;margin-right:10px">Export CSV</a>
                        <a href="/" style="color:#999;text-decoration:none;font-size:13px">← Back to Site</a>
                    </div>
                </div>

                <div class="stats">
                    <div class="stat-card"><small>Total Inquiries</small><div>${messages.length}</div></div>
                    <div class="stat-card"><small>Unread Messages</small><div>${unreadCount}</div></div>
                    <div class="stat-card"><small>Waitlist Signups</small><div>${waitlist.length}</div></div>
                </div>

                <div class="controls">
                    <button class="tab-btn active" onclick="showTab('inquiries', this)">Project Inquiries (${messages.length})</button>
                    <button class="tab-btn" onclick="showTab('waitlist', this)">Product Waitlist (${waitlist.length})</button>
                    <input type="text" id="searchBox" placeholder="Search name, email, service..." onkeyup="filterRows()">
${messageRows || 'No project inquiries yet.'}

Status	Client	Scope	Message	Date	Actions

${waitlistRows || 'No waitlist signups yet.'}

Email	Product	Joined Date

function showTab(name, btn) {
document.getElementById('tab-inquiries').style.display = name === 'inquiries' ? 'block' : 'none';
document.getElementById('tab-waitlist').style.display = name === 'waitlist' ? 'block' : 'none';
document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
btn.classList.add('active');
}
function filterRows() {
const q = document.getElementById('searchBox').value.toLowerCase();
document.querySelectorAll('.msg-row').forEach(row => {
row.style.display = row.dataset.search.includes(q) ? '' : 'none';
});
}


`);
});
app.get('/admin/messages/read', (req, res) => {
if (req.query.key !== ADMIN_KEY) return res.status(403).send('Forbidden.');
markRead(req.query.id);
res.redirect(/admin?key=${ADMIN_KEY});
});
app.get('/admin/messages/delete', (req, res) => {
if (req.query.key !== ADMIN_KEY) return res.status(403).send('Forbidden.');
deleteMessage(req.query.id);
res.redirect(/admin?key=${ADMIN_KEY});
});
app.get('/admin/export', (req, res) => {
if (req.query.key !== ADMIN_KEY) return res.status(403).send('Forbidden.');
const messages = getAllMessages();
const header = 'ID,Name,Email,Service,Budget,Message,CreatedAt,Read\n';
const csv = messages.map(m =>
[m.id, m.name, m.email, m.service, m.budget, m.message, m.createdAt, m.read]
.map(v => "${String(v || '').replace(/"/g, '""')}").join(',')
).join('\n');
res.setHeader('Content-Type', 'text/csv');
res.setHeader('Content-Disposition', 'attachment; filename="aura-tech-inquiries.csv"');
res.send(header + csv);
});
function escapeHtml(str) {
return String(str)
.replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>')
.replace(/"/g, '"').replace(/'/g, ''');
}
app.listen(PORT, '0.0.0.0', () => {
console.log('================================');
console.log('     AURA TECH v2.0 SERVER');
console.log('================================');
console.log(Server running on port ${PORT});
});