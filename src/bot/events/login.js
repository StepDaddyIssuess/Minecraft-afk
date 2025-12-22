module.exports = (bot, io, ctx) => {
    bot.once('login', () => {
        io.emit('log', `Bot "${ctx.username}" logged in as ${bot.username}`);
    });
};
