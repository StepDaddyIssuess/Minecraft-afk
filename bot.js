const express = require('express');
const http = require('http');
const path = require('path');
const mineflayer = require('mineflayer');
const { Server } = require('socket.io');
const fs = require('fs-extra');
const session = require('express-session');
const bodyParser = require('body-parser');
const dotenv = require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// -------------------------
// Basic login credentials
// -------------------------
const DASHBOARD_USER = process.env.DASHBOARD_USER || 'admin';
const DASHBOARD_PASS = process.env.DASHBOARD_PASS || 'grandchampion2139';

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 60*60*1000 }
}));

function authMiddleware(req, res, next) {
    if (req.session.loggedIn) return next();
    return res.redirect('/login.html');
}

app.get('/', (req, res) => res.redirect('/login.html'));
app.get('/login.html', (req, res) => res.sendFile(path.join(__dirname, 'public/login.html')));
app.get('/index.html', authMiddleware, (req, res) => res.sendFile(path.join(__dirname, 'public/index.html')));
app.use(express.static(path.join(__dirname, "public")));
app.use('/public', authMiddleware, express.static(path.join(__dirname, 'public')));

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (username === DASHBOARD_USER && password === DASHBOARD_PASS) {
        req.session.loggedIn = true;
        return res.json({ success: true });
    }
    return res.json({ success: false });
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login.html');
});

// -------------------------
// Accounts file
// -------------------------
const ACCOUNTS_FILE = path.join(__dirname, 'accounts.json');
let accounts = [];
if (fs.existsSync(ACCOUNTS_FILE)) {
    try { accounts = fs.readJSONSync(ACCOUNTS_FILE); if (!Array.isArray(accounts)) accounts = []; } 
    catch { accounts = []; }
}

const bots = {};
const chatHistory = {};

function saveAccounts() { fs.writeJSONSync(ACCOUNTS_FILE, accounts, { spaces: 2 }); }

// -------------------------
// Bot heartbeat (auto-relogin if offline)
// -------------------------
function startBotHeartbeat(bot, username, host, port, interval = 30 * 60 * 1000) {
    const check = setInterval(() => {
        if (!bots[username]) {
            clearInterval(check);
            return;
        }

        // Check if the bot has spawned into the world
        if (bot.entity) {
            io.emit("heartbeat", { bot: username, message: "Online ✅", time: new Date().toLocaleTimeString() });
        } else {
            io.emit("heartbeat", { bot: username, message: "Seems offline ❌ Attempting relog...", time: new Date().toLocaleTimeString() });
            clearInterval(check);
            delete bots[username];
            createBot({ username, host, port }).catch(err => {
                io.emit("log", `Error relogging bot "${username}": ${err}`);
            });
        }
    }, interval);

    bot.on("end", () => {
        clearInterval(check);
        io.emit("log", `[${username}] disconnected`);
    });
}


// Helper to convert Minecraft color codes to HTML
function mcColorToHTML(message) {
    const colors = {
        '0': 'black', '1': 'dark_blue', '2': 'dark_green', '3': 'dark_aqua',
        '4': 'dark_red', '5': 'dark_purple', '6': 'gold', '7': 'gray',
        '8': 'dark_gray', '9': 'blue', 'a': 'green', 'b': 'aqua',
        'c': 'red', 'd': 'light_purple', 'e': 'yellow', 'f': 'white',
        'r': 'reset'
    };
    let html = '';
    let currentColor = 'white';
    let i = 0;

    while (i < message.length) {
        if (message[i] === '§') {
            const code = message[i+1]?.toLowerCase();
            if (code) {
                if (code === 'r') currentColor = 'white';
                else if (colors[code]) currentColor = colors[code];
                i += 2;
                continue;
            }
        }
        html += `<span style="color:${currentColor}">${message[i]}</span>`;
        i++;
    }
    return html;
}




// -------------------------
// Start server
// -------------------------
server.listen(3000, '0.0.0.0', () => console.log("Dashboard running at port 3000"));
setInterval(() => {
    // SELF PING using Fly internal IPv6 DNS (prevents autostop)
    fetch("http://app.internal").catch(() => {});
}, 60 * 1000);
// -------------------------
// Create bot
// -------------------------
async function createBot({ host, port, username }) {
    username = username || 'microsoft';
    if (bots[username]) return io.emit("log", `Bot "${username}" already running.`);

    io.emit("log", `Starting bot for "${username}"`);

    const bot = mineflayer.createBot({
        host: host || 'localhost',
        port: parseInt(port) || 25565,
        username,
        auth: 'microsoft',
        version: '1.19',
        verbose: true,
        onMsaCode: (codeData) => {
            const url = codeData.verification_uri || codeData.verificationUri;
            const code = codeData.user_code || codeData.userCode;
            io.emit("loginPopup", { username, url, code });
        }
    });
    // --- HARD PATCH: Ignore all NBT and broken item slots


    bot.once("login", () => {
        io.emit("log", `Bot "${username}" logged in successfully as ${bot.username}`);
        bots[username] = bot;
        emitRunningBots();

        if (!accounts.find(acc => acc.username === username)) {
            accounts.push({ username });
            saveAccounts();
            io.emit("accountsList", accounts);
        }
    });

    bot.once("spawn", async () => {
        console.log(`[${bot.username}] Joined server, activating compass...`);
        io.emit("log", `[${bot.username}] has spawned and is ready ✅`);

        try {
            // Right-click in hand to open compass menu
            bot.activateItem();
            console.log("Compass activated (right-click in hand).");
        } catch (err) {
            console.log("Failed to activate compass:", err);
        }

        // Start heartbeat AFTER spawn
        startBotHeartbeat(bot, username, host, port);
    });

    bot.on("windowOpen", async (window) => {
        console.log("GUI opened:", window.title);
        const SPYGLASS_SLOT = 12;

        // Always try to click slot 12, ignore NBT errors
        try {
            if (bot.simpleClick && typeof bot.simpleClick.leftMouse === 'function') {
                await bot.simpleClick.leftMouse(SPYGLASS_SLOT);
                console.log("Forced slot 12 click (spyglass)");
            } else {
                console.log("simpleClick not available yet, skipping GUI click");
            }
        } catch (err) {
            console.log("Failed to click slot:", err);
        }
    });

    bot.on('resourcePack', (url, hash) => {
  console.log(`[${bot.username}] Resource pack requested: ${url}`);
  // Accept it automatically
  bot.acceptResourcePack();
});


    bot.on("scoreboardTitle", (title) => console.log("Scoreboard title changed to:", title));

    bot.on("chat", (user, message) => {
        if (!chatHistory[bot.username]) chatHistory[bot.username] = [];
        const time = new Date().toLocaleTimeString();
        const coloredMsg = mcColorToHTML(message);
        const chatMsg = { from: user, message: coloredMsg, time };
        chatHistory[bot.username].push(chatMsg);
        if (chatHistory[bot.username].length > 100) chatHistory[bot.username].shift();
        io.emit("chat", { bot: bot.username, ...chatMsg });
    });

    bot.on('message', (jsonMsg) => {
        const formatted = jsonMsg.extra?.map(c => {
            let text = c.text || '';
            if (c.color) text = `<span style="color:${c.color}">${text}</span>`;
            if (c.bold) text = `<b>${text}</b>`;
            if (c.italic) text = `<i>${text}</i>`;
            return text;
        }).join('') || jsonMsg.text;

        io.emit('chat', { bot: bot.username, from: 'SERVER', message: formatted, time: new Date().toLocaleTimeString() });
    });

    // AFK jump
    setInterval(() => {
        if (bot.entity) {
            bot.setControlState("jump", true);
            setTimeout(() => bot.setControlState("jump", false), 400);
        }
    }, 15000);
}


// -------------------------
// Stop bot
// -------------------------
function stopBot(username) {
    const bot = bots[username];
    if (!bot) return;
    bot.quit();
    delete bots[username];
    emitRunningBots();
    io.emit("log", `Bot "${username}" has been stopped.`);
}

// -------------------------
// Emit running bots
// -------------------------
function emitRunningBots() {
    io.emit("runningBots", Object.keys(bots));
}

// -------------------------
// Socket.IO
// -------------------------
io.on("connection", socket => {
    Object.keys(bots).forEach(botName => {
        socket.emit("botRunning", { username: botName });
        if (chatHistory[botName]) chatHistory[botName].forEach(msg => socket.emit("chat", { bot: botName, ...msg }));
    });
    socket.emit("accountsList", accounts);
    socket.emit("runningBots", Object.keys(bots));

    socket.on("startBot", data => createBot(data).catch(err => io.emit("log", `Error starting bot: ${err}`)));
    socket.on("stopBot", username => stopBot(username));
    socket.on("sendChat", ({ bot: botName, message }) => {
        const bot = bots[botName];
        if (!bot) return io.emit("log", `No such bot: ${botName}`);
        try { if (bot.chat) bot.chat(message); else if (bot.say) bot.say(message); io.emit("chat", { bot: botName, from: bot.username, message }); } 
        catch (e) { io.emit("log", `Chat error for ${botName}: ${e}`); }
    });
    socket.on("getAccounts", () => socket.emit("accountsList", accounts));
});
