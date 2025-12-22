// src/bot/events/chat.js
const mcColorToHTML = require('../../utils/mcColorToHTML'); // fixed typo

module.exports = (bot, io) => {
    // Handle Minecraft chat
    bot.on('chat', (user, message) => {
        const msg = mcColorToHTML(message);

        io.emit('chat', {
            bot: bot.username,
            from: user,
            message: msg,
            time: new Date().toLocaleTimeString()
        });
    });

    // Handle raw server messages
    bot.on('message', jsonMsg => {
        const msg = mcColorToHTML(jsonMsg.toString());

        io.emit('chat', {
            bot: bot.username,
            from: 'SERVER',
            message: msg,
            time: new Date().toLocaleTimeString()
        });
    });
};
