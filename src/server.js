// src/server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const setupSession = require('./web/session');
const setupRoutes = require('./web/routes');
const setupSocket = require('./bot/manager');

const app = express();
app.use(express.static("public"))
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" } // allow local Socket.IO connections
});

// Attach middleware & routes
setupSession(app);
setupRoutes(app);


// Attach Socket.IO + bot system
setupSocket(io);

// Start HTTP server
server.listen(3000, 'localhost', () => {
    console.log('Server running on http://localhost:3000');
});

