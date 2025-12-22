// src/server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const setupSession = require('./web/session');
const setupRoutes = require('./web/routes');
const setupSocket = require('./bot/manager');

const app = express();
app.use(express.static("public"));

// Use dynamic port (Fly.io provides it)
const PORT = process.env.PORT || 3000;

// Create HTTP server
const server = http.createServer(app);

// Attach Socket.IO
const io = new Server(server, {
    cors: { origin: "*" } // allow connections from anywhere
});

// Attach middleware & routes
setupSession(app);
setupRoutes(app);

// Attach Socket.IO + bot system
setupSocket(io);

// Start server (bind to 0.0.0.0 for Fly)
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on 0.0.0.0:${PORT}`);
});
