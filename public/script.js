
const socket = io('https://minecraft-afk.fly.dev/', { transports: ["websocket"] });

// Elements
const startBotBtn = document.getElementById('startBotBtn');
const hostInput = document.getElementById('host');
const portInput = document.getElementById('port');
const usernameInput = document.getElementById('username');
const logOutput = document.getElementById('logOutput');
const chatOutput = document.getElementById('chatOutput');
const chatInput = document.getElementById('chatInput');
const sendChatBtn = document.getElementById('sendChatBtn');
const botSelect = document.getElementById('botSelect');
const accountsListDiv = document.getElementById('accountsList');
const runningBotsDiv = document.getElementById('runningBotsDiv');
const loginModal = document.getElementById('loginModal');
const loginMessage = document.getElementById('loginMessage');
const overlay = document.getElementById('overlay');

// -------------------- START BOT --------------------
startBotBtn.addEventListener('click', () => {
    const host = hostInput.value;
    const port = portInput.value || 25565;
    const username = usernameInput.value || 'microsoft';
    socket.emit('startBot', { host, port, username });
});

// -------------------- LOGS --------------------
socket.on('log', msg => {
    logOutput.textContent += msg + '\n';
    logOutput.scrollTop = logOutput.scrollHeight;
});

// -------------------- CHAT --------------------
socket.on('chat', ({ bot, from, message, time }) => {
    if (!message || !message.trim()) return;
    const msgEl = document.createElement('div');
    const displayTime = time || new Date().toLocaleTimeString();
    msgEl.innerHTML = `<span style="color:gray">[${bot}] [${displayTime}]</span> <b>${from}:</b> ${message}`;
    chatOutput.appendChild(msgEl);
    chatOutput.scrollTop = chatOutput.scrollHeight;
});

// -------------------- HEARTBEAT --------------------
socket.on('heartbeat', ({ bot, message, time }) => {
    const msgEl = document.createElement('div');
    msgEl.textContent = `[${bot}] [${time}] 🔹 ${message}`;
    logOutput.appendChild(msgEl);
    logOutput.scrollTop = logOutput.scrollHeight;
});

// -------------------- MICROSOFT LOGIN --------------------
socket.on('loginPopup', ({ url, code }) => {
    loginMessage.innerHTML = `<a href="${url}" target="_blank">${url}</a><br>Code: ${code}`;
    loginModal.style.display = 'block';
    overlay.style.display = 'block';
});
function copyCode() { navigator.clipboard.writeText(loginMessage.textContent); }
function closeModal() { loginModal.style.display = 'none'; overlay.style.display = 'none'; }

// -------------------- SEND CHAT --------------------
sendChatBtn.addEventListener('click', () => {
    const botName = botSelect.value;
    const msg = chatInput.value.trim();
    if (!msg || !botName) return;
    socket.emit('sendChat', { bot: botName, message: msg });
    chatInput.value = '';
});
chatInput.addEventListener('keypress', e => { if(e.key==='Enter') sendChatBtn.click(); });

// -------------------- ACCOUNTS LIST --------------------
function updateAccountsList(accounts) {
    accountsListDiv.innerHTML = '';
    accounts.forEach(acc => {
        const btn = document.createElement('button');
        btn.textContent = acc.username || acc;
        btn.className = 'account-btn';
        btn.onclick = () => {
            socket.emit('startBot', { username: acc.username || acc, host: 'play.fruitville.org', port: 25565 });
        };
        accountsListDiv.appendChild(btn);
    });
}
socket.on('accountsList', updateAccountsList);

// -------------------- RUNNING BOTS WITH DROPDOWN --------------------
socket.on('runningBots', bots => {
    runningBotsDiv.innerHTML = '';
    botSelect.innerHTML = '';
    chatOutput.innerHTML = '';

    bots.forEach(username => {
        const container = document.createElement('div');
        container.className = 'bot-container';

        const dropdown = document.createElement('div');
        dropdown.className = 'dropdown';

        // Main bot button
        const dropBtn = document.createElement('button');
        dropBtn.className = 'dropbtn';
        dropBtn.textContent = username;

        // Dropdown menu
        const dropdownContent = document.createElement('div');
        dropdownContent.className = 'dropdown-content';

        const stopBtn = document.createElement('button');
        stopBtn.textContent = 'Stop Bot';
        stopBtn.onclick = () => socket.emit('stopBot', username);

        const balanceBtn = document.createElement('button');
        balanceBtn.textContent = 'Check Balance';
        balanceBtn.onclick = () => socket.emit('runBalance', username);

        const sellBtn = document.createElement('button');
        sellBtn.textContent = 'Sell Collectors';
        sellBtn.onclick = () => socket.emit('runSell', username);

        dropdownContent.appendChild(stopBtn);
        dropdownContent.appendChild(balanceBtn);
        dropdownContent.appendChild(sellBtn);

        dropdown.appendChild(dropBtn);
        dropdown.appendChild(dropdownContent);
        container.appendChild(dropdown);
        runningBotsDiv.appendChild(container);

        // Add to chat dropdown
        const option = document.createElement('option');
        option.value = username;
        option.textContent = username;
        botSelect.appendChild(option);
    });
});

// Toggle dropdowns
document.addEventListener('click', e => {
    document.querySelectorAll('.dropdown').forEach(drop => {
        if(drop.contains(e.target)) drop.classList.toggle('show');
        else drop.classList.remove('show');
    });
});
