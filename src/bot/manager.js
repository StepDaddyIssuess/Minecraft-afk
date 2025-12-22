// src/bot/manager.js
const fs = require('fs-extra');
const path = require('path');
const mineflayer = require('mineflayer');
const balanceEvent = require('./events/balance');
const sellEvent = require('./events/sell');

const ACCOUNTS_FILE = path.join(__dirname, '../../accounts.json');
let accounts = fs.readJSONSync(ACCOUNTS_FILE, { throws: false }) || [];

const bots = {};
const chatHistory = {};
const sellIntervals = {}; // keep ONLY if sell.js still uses intervals

// Save accounts
function saveAccounts() {
    fs.writeJSONSync(ACCOUNTS_FILE, accounts, { spaces: 2 });
}

// Convert Minecraft § colors to HTML
function mcColorToHTML(message) {
    const colors = {
        '0': 'black', '1': 'dark_blue', '2': 'dark_green', '3': 'dark_aqua',
        '4': 'dark_red', '5': 'dark_purple', '6': 'gold', '7': 'gray',
        '8': 'dark_gray', '9': 'blue', 'a': 'green', 'b': 'aqua',
        'c': 'red', 'd': 'light_purple', 'e': 'yellow', 'f': 'white',
        'r': 'white'
    };

    let html = '';
    let currentColor = 'white';

    for (let i = 0; i < message.length; i++) {
        if (message[i] === '§') {
            const code = message[i + 1]?.toLowerCase();
            if (code && colors[code]) {
                currentColor = colors[code];
                i++;
                continue;
            }
        }
        html += `<span style="color:${currentColor}">${message[i]}</span>`;
    }
    return html;
}

// Emit helpers
function emitRunningBots(io) {
    io.emit('runningBots', Object.keys(bots));
}

function emitAccounts(io) {
    io.emit('accountsList', accounts);
}

// Heartbeat
function startBotHeartbeat(bot, username, host, port, io, interval = 30 * 60 * 1000) {
    const check = setInterval(() => {
        if (!bots[username]) return clearInterval(check);

        if (bot.entity) {
            io.emit('heartbeat', {
                bot: username,
                message: 'Online ✅',
                time: new Date().toLocaleTimeString()
            });
        } else {
            io.emit('heartbeat', {
                bot: username,
                message: 'Offline ❌ Relogging...',
                time: new Date().toLocaleTimeString()
            });
            clearInterval(check);
            delete bots[username];
            createBot({ username, host, port, io });
        }
    }, interval);

    bot.once('end', () => {
        clearInterval(check);
        delete bots[username];

        if (sellIntervals[username]) {
            clearInterval(sellIntervals[username]);
            delete sellIntervals[username];
        }

        io.emit('log', `[${username}] disconnected`);
        emitRunningBots(io);
    });
}

// Create bot
async function createBot({ host = 'localhost', port = 25565, username, io }) {
    if (bots[username]) return io.emit('log', `Bot ${username} already running`);

    io.emit('log', `Starting bot for ${username}`);

    const bot = mineflayer.createBot({
        host,
        port: Number(port),
        username,
        auth: 'microsoft',
        version: '1.19'
    });

    bot.once('login', () => {
        io.emit('log', `Bot ${username} logged in successfully`);
        bots[username] = bot;
        emitRunningBots(io);

        if (!accounts.find(a => a.username === username)) {
            accounts.push({ username });
            saveAccounts();
            emitAccounts(io);
        }
    });

    bot.once('spawn', () => {
        io.emit('log', `[${username}] spawned and ready ✅`);
        startBotHeartbeat(bot, username, host, port, io);

        // Register button actions ONLY
        setTimeout(() => {
            balanceEvent(bot, io); // no auto-run
            sellEvent(bot, io);    // depends on your sell.js

            try {
                bot.activateItem();
            } catch {}
        }, 1000);
    });

    // GUI handling (NO balance trigger here)
    bot.on('windowOpen', async window => {
        if (!window) return;

        const title = typeof window.title === 'object'
            ? window.title.text
            : window.title;

        if (title?.toLowerCase().includes('all collectors')) return;

        io.emit('log', `[${username}] Window opened: "${title}"`);

        await new Promise(r => setTimeout(r, 600));

        try {
            if (bot.simpleClick?.leftMouse) {
                await bot.simpleClick.leftMouse(12); // spyglass
            }
        } catch {}

        for (let slot = 0; slot < window.slots.length; slot++) {
            const item = window.slots[slot];
            if (!item?.displayName) continue;

            const clean = item.displayName.replace(/§./g, '').toLowerCase();
            if (item.name === 'emerald' || clean === 'emerald') {
                try {
                    await bot.clickWindow(slot, 0, 0);
                    break;
                } catch {}
            }
        }

        try { await bot.closeWindow(window); } catch {}
    });

    // Resource pack
    bot.on('resourcePack', url => {
        io.emit('log', `[${username}] Resource pack requested: ${url}`);
        bot.acceptResourcePack();
    });

    // Chat
    bot.on('chat', (from, message) => {
        if (!chatHistory[username]) chatHistory[username] = [];
        const msg = {
            from,
            message: mcColorToHTML(message),
            time: new Date().toLocaleTimeString()
        };
        chatHistory[username].push(msg);
        io.emit('chat', { bot: username, ...msg });
    });

    bot.on('message', jsonMsg => {
        const text = jsonMsg.text || '';
        io.emit('chat', {
            bot: username,
            from: 'SERVER',
            message: text,
            time: new Date().toLocaleTimeString()
        });
    });

    return bot;
}

// Stop bot
function stopBot(username, io) {
    const bot = bots[username];
    if (!bot) return;

    bot.quit();
    delete bots[username];

    if (sellIntervals[username]) {
        clearInterval(sellIntervals[username]);
        delete sellIntervals[username];
    }

    emitRunningBots(io);
    io.emit('log', `Bot ${username} stopped`);
}

// Socket.IO
module.exports = io => {
    io.on('connection', socket => {
        socket.emit('runningBots', Object.keys(bots));
        socket.emit('accountsList', accounts);

        socket.on('startBot', data => createBot({ ...data, io }));
        socket.on('stopBot', username => stopBot(username, io));

        socket.on('sendChat', ({ bot: name, message }) => {
            const bot = bots[name];
            if (!bot) return;
            bot.chat(message);
        });

        // 🔘 BUTTON ACTIONS
        socket.on('runBalance', username => {
            const bot = bots[username];
            if (bot?.actions?.checkBalance) {
                bot.actions.checkBalance();
            }
        });

        socket.on('runSell', username => {
            const bot = bots[username];
            if (bot?.afk?.sellCollector) {
                bot.afk.sellCollector();
            }
        });
    });
};
