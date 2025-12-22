module.exports = (bot, io) => {
    if (!bot.actions) bot.actions = {};

    // Manual /balance trigger (button only)
    bot.actions.checkBalance = () => {
        if (!bot.entity) {
            io.emit('log', `[${bot.username}] Cannot run /balance (bot not spawned)`);
            return;
        }

        try {
            io.emit('log', `[${bot.username}] Sending /balance`);
            bot.chat('/balance');
        } catch (err) {
            io.emit('log', `[${bot.username}] Error sending /balance: ${err}`);
        }
    };

    // Optional: log balance responses only (no auto parsing)
    bot.on('message', (msg) => {
        const text = msg.toString();
        if (/balance/i.test(text)) {
            io.emit('log', `[${bot.username}] ${text}`);
        }
    });

    // Nothing to clean up anymore (no intervals)
    return bot.actions.checkBalance;
};
