const socket = io();

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

// Start bot
startBotBtn.addEventListener('click', () => {
    const host = hostInput.value;
    const port = portInput.value || 25565;
    const username = usernameInput.value || 'microsoft';
    socket.emit('startBot', { host, port, username });
});

// Display logs
socket.on('log', msg => {
    logOutput.textContent += msg + '\n';
    logOutput.scrollTop = logOutput.scrollHeight;
});

// Display chat with colors
socket.on('chat', ({ bot, from, message, time }) => {
    if (!message || message.trim() === '') return;

    const msgEl = document.createElement('div');
    const displayTime = time || new Date().toLocaleTimeString();

    // Use innerHTML so colored HTML from server renders
    msgEl.innerHTML = `<span style="color:gray">[${bot}] [${displayTime}]</span> <b>${from}:</b> ${message}`;
    chatOutput.appendChild(msgEl);
    chatOutput.scrollTop = chatOutput.scrollHeight;
});

// Display heartbeat (bot still online)
socket.on('heartbeat', ({ bot, message, time }) => {
    const msgEl = document.createElement('div');
    const displayTime = time || new Date().toLocaleTimeString();
    msgEl.textContent = `[${bot}] [${displayTime}] 🔹 ${message}`;
    logOutput.appendChild(msgEl);
    logOutput.scrollTop = logOutput.scrollHeight;
});

// Show Microsoft login popup
socket.on('loginPopup', ({ username, url, code }) => {
    loginMessage.innerHTML = `<a href="${url}" target="_blank">${url}</a><br>Code: ${code}`;
    loginModal.style.display = 'block';
    overlay.style.display = 'block';
});

// Copy code
function copyCode() {
    navigator.clipboard.writeText(loginMessage.textContent).then(() => alert('Copied!'));
}

// Close modal
function closeModal() {
    loginModal.style.display = 'none';
    overlay.style.display = 'none';
}

// Send chat
sendChatBtn.addEventListener('click', () => {
    const botName = botSelect.value;
    const msg = chatInput.value.trim();
    if (!msg || !botName) return;
    socket.emit('sendChat', { bot: botName, message: msg });
    chatInput.value = '';
});

// Enter key for chat
chatInput.addEventListener('keypress', e => {
    if (e.key === 'Enter') sendChatBtn.click();
});

// Update accounts list dynamically
function updateAccountsList(accounts) {
    accountsListDiv.innerHTML = '';
    accounts.forEach(acc => {
        const btn = document.createElement('button');
        btn.textContent = acc.username || acc;
        btn.className = 'account-btn';
        btn.onclick = () => {
            const host = prompt(`Enter server IP for "${acc.username || acc}":`, 'localhost');
            const port = prompt(`Enter server port for "${acc.username || acc}":`, '25565');
            socket.emit('startBot', { username: acc.username || acc, host, port });
        };
        accountsListDiv.appendChild(btn);
    });
}

// Update running bots list
socket.on('runningBots', bots => {
    runningBotsDiv.innerHTML = '';
    botSelect.innerHTML = '';
    chatOutput.innerHTML = '';
    bots.forEach(username => {
        const btn = document.createElement('button');
        btn.textContent = `Stop ${username}`;
        btn.className = 'account-btn';
        btn.onclick = () => {
            socket.emit('stopBot', username);
            chatOutput.innerHTML = '';
        };
        runningBotsDiv.appendChild(btn);

        const option = document.createElement('option');
        option.value = username;
        option.textContent = username;
        botSelect.appendChild(option);
    });
});

// Listen for accounts list
socket.on('accountsList', updateAccountsList);
