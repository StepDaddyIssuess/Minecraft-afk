module.exports = (bot, io) => {
    // Emit a heartbeat every 30 minutes (30 * 60 * 1000 ms)
    setInterval(() => {
        io.emit('heartbeat', {
            bot: bot.username,
            message: 'Still running',
            time: new Date().toLocaleTimeString()
        });
    }, 30 * 60 * 1000);
};
