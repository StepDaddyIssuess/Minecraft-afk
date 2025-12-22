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
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on 0.0.0.0:${PORT}`);
});

