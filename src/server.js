const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const setupSession = require('./web/session');
const setupRoutes = require('./web/routes');
const setupSocket = require('./bot/manager');

const app = express();
app.use(express.static("public"));

// Create HTTP server and attach Socket.IO
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" } // allow local Socket.IO connections
});

// Attach middleware & routes
setupSession(app);
setupRoutes(app);

// Attach Socket.IO + bot system
setupSocket(io);

// Start HTTP server (use `server`, not `app`)
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on 0.0.0.0:${PORT}`);
});
