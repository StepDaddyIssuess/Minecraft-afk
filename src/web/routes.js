const path = require('path');
const express = require('express');
require('dotenv').config();

const USER = process.env.DASHBOARD_USER || 'admin';
const PASS = process.env.DASHBOARD_PASS || 'admin';

const PUBLIC_DIR = path.join(__dirname, '../../public');

function auth(req, res, next) {
    if (req.session.loggedIn) return next();
    return res.redirect('/login.html');
}

module.exports = app => {

    // Redirect root → login
    app.get('/', (_, res) => res.redirect('/login.html'));

    // Login page (no auth required)
    app.get('/login.html', (_, res) => {
        res.sendFile(path.join(PUBLIC_DIR, 'login.html'));
    });

    // Dashboard page (protected)
    app.get('/index.html', auth, (_, res) => {
        res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
    });

    // Serve static assets
    app.use('/public', express.static(PUBLIC_DIR)); // no auth for static
    app.use(express.static(PUBLIC_DIR)); // fallback

    // Login endpoint
    app.post('/login', (req, res) => {
        const { username, password } = req.body;
        const success = username === USER && password === PASS;
        req.session.loggedIn = success;
        res.json({ success });
    });

    // Logout
    app.get('/logout', (req, res) => {
        req.session.destroy(err => {
            if (err) console.error('Session destroy error:', err);
            res.redirect('/login.html');
        });
    });
};