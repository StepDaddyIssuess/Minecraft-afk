module.exports = (bot, io) => {
    if (!bot.afk) bot.afk = {};

    // --- Main function to run /collectors ---
    bot.afk.sellCollector = async () => {
        if (!bot.entity) return; // Bot not spawned yet

        if (bot.afk.isSelling) {
            io.emit('log', `[${bot.username}] Sell already running, skipping`);
            return;
        }

        bot.afk.isSelling = true;

        try {
            io.emit('log', `[${bot.username}] Running /collectors...`);
            bot.chat('/collectors');
        } catch (err) {
            io.emit('log', `[${bot.username}] Error opening /collectors: ${err}`);
            bot.afk.isSelling = false;
            return;
        }
    };

    // --- Handle GUI windows ---
    bot.on('windowOpen', async (window) => {
        if (!window) return;

        let titleText = typeof window.title === 'object' ? window.title.text : window.title;
        if (!titleText.toLowerCase().includes("collector")) return;

        io.emit('log', `[${bot.username}] Collector window opened: "${titleText}"`);

        await new Promise(resolve => setTimeout(resolve, 600));

        for (let slot = 0; slot < window.slots.length; slot++) {
            const item = window.slots[slot];
            if (!item || !item.displayName) continue;

            const cleanName = item.displayName.replace(/§./g, '').toLowerCase();

            if (item.name === 'emerald' || cleanName === 'emerald') {
                try {
                    await bot.clickWindow(slot, 0, 0); // left click
                    io.emit('log', `[${bot.username}] Clicked emerald in slot ${slot}`);
                    await new Promise(r => setTimeout(r, 800));
                    break; // Only one click
                } catch (err) {
                    io.emit('log', `[${bot.username}] Failed to click emerald in slot ${slot}: ${err}`);
                }
            }
        }

        try { await bot.closeWindow(window); } catch (err) {}

        // Optional: check balance after selling
        if (bot.afk.checkBalance) bot.afk.checkBalance();

        // Reset selling flag
        bot.afk.isSelling = false;
    });

    // --- Clean up on disconnect ---
    bot.on('end', () => {
        bot.afk.isSelling = false;
    });

    // NO automatic interval, manual button only
};
