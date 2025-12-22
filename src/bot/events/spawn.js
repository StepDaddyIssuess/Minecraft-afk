const startHeartbeat = require('./heartbeat');

module.exports = (bot, io, ctx) => {
    bot.once('spawn', () => {
        io.emit('log', `[${bot.username}] spawned ✅`);

        try {
            bot.activateItem();
        } catch {}

        startHeartbeat(bot, ctx.username, ctx.host, ctx.port, io);
    });
};
